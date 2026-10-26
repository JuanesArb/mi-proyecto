const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const http=require('node:http');
const {once}=require('node:events');
const {createApp}=require('./backend.cjs');
test('Pago de laboratorio, privacidad, autenticación y persistencia',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sneakerlab-test-'));
  const databasePath=path.join(directory,'test.sqlite');let app;let base;let cookie='';
  async function start(){app=createApp({databasePath});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');base=`http://127.0.0.1:${app.server.address().port}`;}
  async function stop(){await new Promise(resolve=>app.server.close(resolve));app.db.close();}
  async function call(route,{body,auth=false,origin=base,headers={}}={}){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(auth?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});const data=await response.json();return {response,data};}
  const payload=(cardId='lab-approved')=>({requestId:crypto.randomUUID(),participantId:'persona-01',cardId,items:[{productId:1,size:40}]});
  await start();
  try{
    await t.test('Los datos y archivos privados no se exponen',async()=>{
      assert.equal((await call('/api/admin/data')).response.status,401);
      assert.equal((await call('/api/admin/data',{headers:{Cookie:'sl_session=forged'}})).response.status,401);
      for(const route of ['/private/lab.sqlite','/backend.cjs','/.gitignore'])assert.equal((await call(route)).response.status,404);
      const hostStatus=await new Promise((resolve,reject)=>{http.get(base+'/api/admin/session',{headers:{Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode)}).on('error',reject)});assert.equal(hostStatus,403);
      assert.equal((await call('/api/admin/session')).data.setupRequired,true);
    });
    await t.test('Solo acepta datos sintéticos válidos y solicitudes del mismo origen',async()=>{
      assert.equal((await call('/api/orders',{body:payload(),origin:'https://attacker.example'})).response.status,403);
      assert.equal((await call('/api/orders',{body:{...payload(),cardNumber:'not-accepted'}})).response.status,400);
      assert.equal((await call('/api/orders',{body:{...payload(),cvv:'not-accepted'}})).response.status,400);
      assert.equal((await call('/api/orders',{body:{...payload(),exercise:'typed-profile-v1',email:'unapproved@example.invalid'}})).response.status,400);
      assert.equal((await call('/api/orders',{body:{...payload(),exercise:{name:'free input'}}})).response.status,400);
      assert.equal((await call('/api/orders',{body:{...payload(),participantId:'Persona real'}})).response.status,400);
      assert.equal((await call('/api/orders',{body:{...payload(),items:[{productId:1,size:40,price:1}]}})).response.status,400);
      assert.equal((await call('/api/orders',{body:{...payload(),items:[{productId:1,size:99}]}})).response.status,400);
    });
    await t.test('Contraseña personal, cookie protegida y configuración única',async()=>{
      assert.equal((await call('/api/admin/setup',{body:{password:'short'}})).response.status,400);
      const setup=await call('/api/admin/setup',{body:{password:'test-only-strong-password-2026'}});
      assert.equal(setup.response.status,200);const header=setup.response.headers.get('set-cookie');assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Strict/);cookie=header.split(';')[0];
      assert.equal((await call('/api/admin/setup',{body:{password:'another-strong-test-password'}})).response.status,409);
      for(let i=0;i<8;i++)assert.equal((await call('/api/admin/setup',{body:{password:'stale-tab-test-password'}})).response.status,409);
      assert.equal((await call('/api/admin/login',{body:{password:'test-only-strong-password-2026'}})).response.status,200);
      const admin=app.db.prepare('SELECT * FROM admin').get();assert.notEqual(admin.password_hash,'test-only-strong-password-2026');assert.equal(admin.password_hash.length,128);
    });
    await t.test('Registra tres resultados, calcula precios y evita duplicados',async()=>{
      const firstPayload=payload();const first=await call('/api/orders',{body:firstPayload});assert.equal(first.response.status,201);assert.equal(first.data.status,'approved');assert.equal(first.data.total,289900);
      const retry=await call('/api/orders',{body:firstPayload});assert.equal(retry.data.id,first.data.id);
      assert.equal((await call('/api/orders',{body:payload('lab-declined')})).data.status,'declined');
      assert.equal((await call('/api/orders',{body:payload('lab-insufficient')})).data.status,'insufficient');
      const data=(await call('/api/admin/data',{auth:true})).data;assert.equal(data.orders.length,3);assert.equal(data.events.length,6);assert.equal(data.summary.approved,1);assert.equal(data.summary.total,869700);assert.equal(data.orders[0].items[0].size,40);
    });
    await t.test('Conserva registros al reiniciar y bloquea sesiones cerradas',async()=>{
      await stop();await start();assert.equal((await call('/api/admin/session')).data.setupRequired,false);
      assert.equal((await call('/api/admin/data',{auth:true})).data.orders.length,3);
      await call('/api/admin/logout',{body:{},auth:true});assert.equal((await call('/api/admin/data',{auth:true})).response.status,401);
      assert.equal((await call('/api/admin/login',{body:{password:'wrong-password'}})).response.status,401);
      const login=await call('/api/admin/login',{body:{password:'test-only-strong-password-2026'}});assert.equal(login.response.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];
      app.db.prepare('UPDATE sessions SET expires=0').run();assert.equal((await call('/api/admin/data',{auth:true})).response.status,401);
    });
    await t.test('Guarda solo el perfil sintético canónico del ejercicio',async()=>{
      const result=await call('/api/orders',{body:{...payload(),participantId:'persona-02',exercise:'typed-profile-v1'}});assert.equal(result.response.status,201);
      const exercise=app.db.prepare('SELECT kind,profile_json FROM order_exercises WHERE order_id=?').get(result.data.id);assert.equal(exercise.kind,'typed-profile-v1');assert.equal(JSON.parse(exercise.profile_json).email,'beta@example.invalid');
      const login=await call('/api/admin/login',{body:{password:'test-only-strong-password-2026'}});assert.equal(login.response.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];
      const order=(await call('/api/admin/data',{auth:true})).data.orders.find(order=>order.id===result.data.id);assert.equal(order.exercise.profile.name,'Beta Ejemplo');assert.equal(order.exercise.profile.phone,'000 000 0001');
      assert.equal(app.db.prepare("SELECT count(*) n FROM events WHERE order_id=? AND event='Perfil ficticio validado en ejercicio con teclado'").get(result.data.id).n,1);
      await call('/api/orders',{body:{...payload(),requestId:app.db.prepare('SELECT request_id FROM orders WHERE id=?').get(result.data.id).request_id,participantId:'persona-02',exercise:'typed-profile-v1'}});
      assert.equal(app.db.prepare('SELECT count(*) n FROM order_exercises WHERE order_id=?').get(result.data.id).n,1);
    });
    await t.test('Limita los intentos de contraseña',async()=>{
      let last;for(let i=0;i<6;i++)last=await call('/api/admin/login',{body:{password:'wrong-password'}});assert.equal(last.response.status,429);
    });
    await t.test('Texto libre limitado, persistencia y lectura privada de observaciones',async()=>{
      const annotation={fictionalName:'Corredor Azul',notes:'Probé un pedido de ejemplo. <b>Esto es texto, no HTML.</b>'};
      const body={...payload(),annotation};
      const saved=await call('/api/orders',{body});assert.equal(saved.response.status,201);
      assert.deepEqual({...app.db.prepare('SELECT fictional_name AS fictionalName,notes FROM order_annotations WHERE order_id=?').get(saved.data.id)},annotation);
      const retry=await call('/api/orders',{body});assert.equal(retry.data.id,saved.data.id);
      assert.equal((await call('/api/admin/data')).response.status,401);
      await stop();await start();
      const login=await call('/api/admin/login',{body:{password:'test-only-strong-password-2026'}});cookie=login.response.headers.get('set-cookie').split(';')[0];
      const order=(await call('/api/admin/data',{auth:true})).data.orders.find(order=>order.id===saved.data.id);assert.deepEqual(order.annotation,annotation);
      for(const bad of [{fictionalName:'',notes:''},{fictionalName:'x'.repeat(81),notes:''},{fictionalName:'Ejemplo',notes:'x'.repeat(501)},{fictionalName:'Ejemplo',notes:'1234 5678 9012 3456'},{fictionalName:'Ejemplo',notes:'nota',cvv:'not-accepted'}])assert.equal((await call('/api/orders',{body:{...payload(),annotation:bad}})).response.status,400);
    });
    await t.test('Perfil inventado editable y código LAB personalizado',async()=>{
      const demoProfile={name:'Luna',surname:'Azul',email:'luna@prueba.invalid',address:'Avenida Nube 42',city:'Villa Imaginaria',phone:'000 123 4567',zip:'000042'};
      const custom={...payload(),exercise:'custom-profile-v1',demoProfile,labCode:'LAB-LUNA'};
      const saved=await call('/api/orders',{body:custom});assert.equal(saved.response.status,201);
      const record=JSON.parse(app.db.prepare('SELECT profile_json FROM order_exercises WHERE order_id=?').get(saved.data.id).profile_json);assert.equal(record.name,'Luna Azul');assert.equal(record.address,demoProfile.address);assert.equal(record.paymentCode,'LAB-LUNA');
      assert.equal((await call('/api/admin/data')).response.status,401);
      for(const change of [{demoProfile:{...demoProfile,email:'no@correo.com'}},{demoProfile:{...demoProfile,phone:'300 123 4567'}},{labCode:'1234567890123456'},{labCode:'LAB-1234567890123456'},{demoProfile:{...demoProfile,cvv:'not-accepted'}},{demoProfile:{...demoProfile,address:'1234 5678 9012 3456'}},{exercise:'typed-profile-v1'}])assert.equal((await call('/api/orders',{body:{...custom,requestId:crypto.randomUUID(),...change}})).response.status,400);
      await stop();await start();const login=await call('/api/admin/login',{body:{password:'test-only-strong-password-2026'}});cookie=login.response.headers.get('set-cookie').split(';')[0];
      const order=(await call('/api/admin/data',{auth:true})).data.orders.find(order=>order.id===saved.data.id);assert.equal(order.exercise.profile.email,demoProfile.email);assert.equal(order.exercise.profile.paymentCode,'LAB-LUNA');
    });
  }finally{await stop();for(const file of ['test.sqlite','test.sqlite-wal','test.sqlite-shm']){const target=path.join(directory,file);if(fs.existsSync(target))fs.unlinkSync(target)}fs.rmdirSync(directory);}
});
