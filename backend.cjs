const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {DatabaseSync}=require('node:sqlite');
const deriveKey=promisify(crypto.scrypt);
const catalog=[[1,'Velocity Red','Running',289900],[2,'Court Essential','Lifestyle',249900],[3,'Airline Classic','Lifestyle',319900],[4,'Form Runner','Training',279900]];
const participants={'persona-01':'Participante Alfa','persona-02':'Participante Beta','persona-03':'Participante Gamma'};
const exerciseProfiles={
  'persona-01':{name:'Alfa Ejemplo',email:'alfa@example.invalid',address:'Calle de Prueba 123',city:'Ciudad de Ejemplo',phone:'000 000 0000',zip:'000000'},
  'persona-02':{name:'Beta Ejemplo',email:'beta@example.invalid',address:'Avenida del Laboratorio 45',city:'Ciudad de Ejemplo',phone:'000 000 0001',zip:'000001'},
  'persona-03':{name:'Gamma Ejemplo',email:'gamma@example.invalid',address:'Carrera de Demostración 67',city:'Ciudad de Ejemplo',phone:'000 000 0002',zip:'000002'}
};
const cards={'lab-approved':{label:'LAB · Aprobación',status:'approved'},'lab-declined':{label:'LAB · Rechazo',status:'declined'},'lab-insufficient':{label:'LAB · Saldo insuficiente',status:'insufficient'}};
const publicFiles={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/checkout.js':'checkout.js','/checkout.css':'checkout.css','/admin':'admin.html','/admin/':'admin.html','/admin.js':'admin.js','/admin.css':'admin.css'};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const hashToken=value=>crypto.createHash('sha256').update(value).digest('hex');
function fail(status,message){const error=new Error(message);error.status=status;throw error;}
function exactKeys(object,keys){return object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).length===keys.length&&keys.every(key=>Object.hasOwn(object,key));}
async function readBody(req){
  if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Usa el formato JSON.');
  let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>12000)fail(413,'Solicitud demasiado grande.');}
  try{return JSON.parse(text);}catch{fail(400,'Solicitud no válida.');}
}
function createApp({databasePath=path.join(__dirname,'private','lab.sqlite')}={}){
  fs.mkdirSync(path.dirname(databasePath),{recursive:true});
  const db=new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY CHECK(id=1),salt TEXT NOT NULL,password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,participant TEXT NOT NULL,card TEXT NOT NULL,status TEXT NOT NULL,total INTEGER NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS order_items(order_id TEXT NOT NULL REFERENCES orders(id),product_id INTEGER NOT NULL REFERENCES products(id),name TEXT NOT NULL,size INTEGER NOT NULL,price INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,event TEXT NOT NULL,order_id TEXT REFERENCES orders(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS order_exercises(order_id TEXT PRIMARY KEY REFERENCES orders(id),kind TEXT NOT NULL,profile_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS order_annotations(order_id TEXT PRIMARY KEY REFERENCES orders(id),fictional_name TEXT NOT NULL,notes TEXT NOT NULL);`);
  for(const product of catalog)db.prepare('INSERT OR IGNORE INTO products VALUES(?,?,?,?)').run(...product);
  const attempts=new Map();let setupBusy=false;
  const hasAdmin=()=>Boolean(db.prepare('SELECT id FROM admin WHERE id=1').get());
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  function session(req){
    const raw=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('sl_session='))?.slice(11);
    if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
    const tokenHash=hashToken(raw);const row=db.prepare('SELECT expires FROM sessions WHERE token_hash=?').get(tokenHash);
    return row&&row.expires>Date.now()?tokenHash:null;
  }
  function newSession(res){const token=crypto.randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?)').run(hashToken(token),Date.now()+1800000);res.setHeader('Set-Cookie',`sl_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);}
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      const host=req.headers.host||'';
      if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))fail(403,'Esta versión solo permite acceso local.');
      const pathname=new URL(req.url,`http://${host}`).pathname;
      if(req.method==='POST'&&req.headers.origin!==`http://${host}`)fail(403,'Origen de solicitud no permitido.');
      if(req.method==='GET'&&pathname==='/api/admin/session'){send(res,200,{authenticated:Boolean(session(req)),setupRequired:!hasAdmin()});return;}
      if(req.method==='POST'&&(pathname==='/api/admin/setup'||pathname==='/api/admin/login')){
        const body=await readBody(req);
        if(!exactKeys(body,['password'])||typeof body.password!=='string'||body.password.length>128)fail(400,'Contraseña no válida.');
        // Una pestaña antigua de configuración no debe consumir intentos de inicio de sesión.
        if(pathname.endsWith('/setup')&&hasAdmin())fail(409,'El administrador ya está configurado. Inicia sesión con tu contraseña.');
        const key=req.socket.remoteAddress;const now=Date.now();let limit=attempts.get(key);
        if(!limit||now-limit.start>60000){limit={start:now,count:0};attempts.set(key,limit);}
        if(++limit.count>5){res.setHeader('Retry-After','60');fail(429,'Demasiados intentos. Espera un minuto.');}
        if(pathname.endsWith('/setup')){
          if(hasAdmin()||setupBusy)fail(409,'El administrador ya está configurado.');
          if(body.password.length<12)fail(400,'Usa una contraseña de al menos 12 caracteres.');
          setupBusy=true;
          try{const salt=crypto.randomBytes(16).toString('hex');const hash=await deriveKey(body.password,salt,64);db.prepare('INSERT INTO admin VALUES(1,?,?)').run(salt,hash.toString('hex'));}finally{setupBusy=false;}
        }else{
          const admin=db.prepare('SELECT salt,password_hash FROM admin WHERE id=1').get();
          const hash=await deriveKey(body.password,admin?.salt||'unconfigured-laboratory',64);
          if(!admin||!crypto.timingSafeEqual(hash,Buffer.from(admin.password_hash,'hex')))fail(401,'Contraseña incorrecta.');
        }
        newSession(res);send(res,200,{ok:true});return;
      }
      if(req.method==='POST'&&pathname==='/api/admin/logout'){
        const token=session(req);if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(token);
        res.setHeader('Set-Cookie','sl_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(res,200,{ok:true});return;
      }
      if(req.method==='GET'&&pathname==='/api/admin/data'){
        if(!session(req))fail(401,'Inicia sesión para consultar los datos.');
        const orders=db.prepare('SELECT id,participant,card,status,total,created_at FROM orders ORDER BY rowid DESC LIMIT 100').all().map(order=>{const exercise=db.prepare('SELECT kind,profile_json FROM order_exercises WHERE order_id=?').get(order.id);const annotation=db.prepare('SELECT fictional_name AS fictionalName,notes FROM order_annotations WHERE order_id=?').get(order.id);return {...order,annotation:annotation||null,items:db.prepare('SELECT name,size,price FROM order_items WHERE order_id=?').all(order.id),exercise:exercise?{kind:exercise.kind,profile:JSON.parse(exercise.profile_json)}:null};});
        const events=db.prepare('SELECT event,order_id,created_at FROM events ORDER BY id DESC LIMIT 100').all();
        send(res,200,{orders,events,products:db.prepare('SELECT * FROM products').all(),summary:db.prepare("SELECT COUNT(*) orders,COALESCE(SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END),0) approved,COALESCE(SUM(total),0) total FROM orders").get()});return;
      }
      if(req.method==='POST'&&pathname==='/api/orders'){
        const body=await readBody(req);
        const allowedKeys=body&&Object.hasOwn(body,'exercise')?['requestId','participantId','cardId','items','exercise']:['requestId','participantId','cardId','items'];
        if(body&&Object.hasOwn(body,'annotation'))allowedKeys.push('annotation');
        if(body&&Object.hasOwn(body,'demoProfile'))allowedKeys.push('demoProfile');
        if(body&&Object.hasOwn(body,'labCode'))allowedKeys.push('labCode');
        if(!exactKeys(body,allowedKeys)||(Object.hasOwn(body,'exercise')&&!['typed-profile-v1','custom-profile-v1'].includes(body.exercise))||typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId)||!Object.hasOwn(participants,body.participantId)||!Object.hasOwn(cards,body.cardId)||!Array.isArray(body.items)||body.items.length<1||body.items.length>20)fail(400,'Utiliza únicamente los datos de laboratorio de la demo.');
        let customProfile=null;
        if(body.exercise==='custom-profile-v1'){
          const p=body.demoProfile;const limits={name:60,surname:60,email:100,address:160,city:60,phone:14,zip:6};
          if(!exactKeys(p,Object.keys(limits))||!Object.entries(limits).every(([key,max])=>typeof p[key]==='string'&&p[key].trim().length>0&&p[key].length<=max&&!/(?:\d[ -]*){12,}/.test(p[key])&&!/[\u0000-\u001f]/.test(p[key]))||!/^[^\s@]+@[a-z0-9.-]+\.invalid$/i.test(p.email.trim())||!/^000[ -]?\d{3}[ -]?\d{4}$/.test(p.phone.trim())||!/^\d{4,6}$/.test(p.zip.trim())||typeof body.labCode!=='string'||!/^LAB-[A-Z0-9]{1,8}$/i.test(body.labCode.trim()))fail(400,'Usa datos inventados: correo .invalid, teléfono 000 de 10 dígitos y código LAB- de hasta 8 letras o números.');
          customProfile={name:`${p.name.trim()} ${p.surname.trim()}`,email:p.email.trim(),address:p.address.trim(),city:p.city.trim(),phone:p.phone.trim(),zip:p.zip.trim(),paymentCode:body.labCode.trim().toUpperCase()};
        }else if(Object.hasOwn(body,'demoProfile')||Object.hasOwn(body,'labCode'))fail(400,'El perfil personalizado requiere el modo de ejercicio correspondiente.');
        if(Object.hasOwn(body,'annotation')){
          const note=body.annotation;
          if(!exactKeys(note,['fictionalName','notes'])||typeof note.fictionalName!=='string'||typeof note.notes!=='string'||!note.fictionalName.trim()||note.fictionalName.length>80||note.notes.length>500||/(?:\d[ -]*){12,}/.test(note.fictionalName+' '+note.notes)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note.fictionalName+note.notes))fail(400,'Usa solo un nombre ficticio (hasta 80 caracteres) y observaciones (hasta 500), sin números financieros.');
        }
        const items=body.items.map(item=>{
          if(!exactKeys(item,['productId','size'])||!Number.isInteger(item.productId)||!Number.isInteger(item.size)||item.size<36||item.size>44)fail(400,'Producto o talla no válidos.');
          const product=db.prepare('SELECT * FROM products WHERE id=?').get(item.productId);if(!product)fail(400,'Producto no válido.');return {...product,size:item.size};
        });
        const duplicate=db.prepare('SELECT id,status,total FROM orders WHERE request_id=?').get(body.requestId);if(duplicate){send(res,200,duplicate);return;}
        const id=crypto.randomUUID();const createdAt=new Date().toISOString();const total=items.reduce((sum,item)=>sum+item.price,0);const card=cards[body.cardId];
        db.exec('BEGIN');
        try{
          db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?)').run(id,body.requestId,customProfile?'Participante de demostración':participants[body.participantId],card.label,card.status,total,createdAt);
          for(const item of items)db.prepare('INSERT INTO order_items VALUES(?,?,?,?,?)').run(id,item.id,item.name,item.size,item.price);
          const event=db.prepare('INSERT INTO events(event,order_id,created_at) VALUES(?,?,?)');event.run('Pedido ficticio creado',id,createdAt);event.run(`Pago simulado: ${card.status}`,id,createdAt);
          if(body.exercise){db.prepare('INSERT INTO order_exercises VALUES(?,?,?)').run(id,body.exercise,JSON.stringify(customProfile||exerciseProfiles[body.participantId]));event.run(customProfile?'Datos inventados registrados por el participante':'Perfil ficticio validado en ejercicio con teclado',id,createdAt);}
          if(body.annotation){db.prepare('INSERT INTO order_annotations VALUES(?,?,?)').run(id,body.annotation.fictionalName.trim(),body.annotation.notes.trim());event.run('Nombre ficticio y observaciones registrados',id,createdAt);}
          db.exec('COMMIT');
        }catch(error){db.exec('ROLLBACK');throw error;}
        send(res,201,{id,status:card.status,total});return;
      }
      if(pathname.startsWith('/api/'))fail(404,'Ruta no encontrada.');
      if(req.method!=='GET')fail(405,'Método no permitido.');
      const file=publicFiles[pathname];if(!file)fail(404,'Página no encontrada.');
      const content=await fs.promises.readFile(path.join(__dirname,file));res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(content);
    }catch(error){if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud.'});else res.end();}
  });
  return {server,db};
}
module.exports={createApp};
