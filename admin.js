const loginCard=document.querySelector('#login-card');const dashboard=document.querySelector('#dashboard');const message=document.querySelector('#message');let setupRequired=false;
const money=value=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value);
const date=value=>new Intl.DateTimeFormat('es-CO',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(value));
const labels={approved:'Aprobado',declined:'Rechazado',insufficient:'Saldo insuficiente'};
async function api(url,body){const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok){const error=new Error(data.error||'No se pudo completar la solicitud.');error.status=response.status;throw error}return data}
function cell(row,text){const td=document.createElement('td');td.textContent=text;row.append(td);return td}
function participantCell(row,order){
  const td=cell(row,order.participant);
  if(order.annotation){const box=document.createElement('div');box.className='order-annotation';const name=document.createElement('strong');name.textContent=order.annotation.fictionalName;const notes=document.createElement('p');notes.textContent=order.annotation.notes||'Sin observaciones.';box.append(name,notes);td.append(box);}
  if(!order.exercise)return;
  const details=document.createElement('details');details.className='exercise-details';
  const summary=document.createElement('summary');summary.textContent='Ver datos ficticios del ejercicio';
  const content=document.createElement('div');content.className='exercise-profile';
  const labels={name:'Nombre',email:'Correo',address:'Dirección',city:'Ciudad',phone:'Teléfono',zip:'Código postal',paymentCode:'Código de pago LAB'};
  for(const [key,label] of Object.entries(labels)){if(order.exercise.profile[key]===undefined)continue;const line=document.createElement('p');line.textContent=`${label}: ${order.exercise.profile[key]}`;content.append(line);}
  const note=document.createElement('p');note.textContent=order.exercise.kind==='custom-profile-v1'?'Datos inventados escritos en el formulario. No se guardan pulsaciones ni datos bancarios.':'Perfil de ejemplo validado. No se guardan pulsaciones.';content.append(note);details.append(summary,content);td.append(details);
}
async function loadData(){
  const data=await api('/api/admin/data');message.textContent='';
  document.querySelector('#orders-count').textContent=data.summary.orders;document.querySelector('#approved-count').textContent=data.summary.approved;document.querySelector('#total-count').textContent=money(data.summary.total);
  const ordersBody=document.querySelector('#orders-body');ordersBody.replaceChildren();
  for(const order of data.orders){const row=document.createElement('tr');const first=cell(row,order.id.slice(0,8));const small=document.createElement('small');small.textContent=date(order.created_at);first.append(small);participantCell(row,order);cell(row,order.items.map(item=>`${item.name} · EU ${item.size}`).join(' / '));cell(row,order.card);const result=cell(row,'');const badge=document.createElement('span');badge.className=`badge ${order.status}`;badge.textContent=labels[order.status];result.append(badge);cell(row,money(order.total));ordersBody.append(row)}
  if(!data.orders.length){const row=document.createElement('tr');cell(row,'Todavía no hay pedidos. Completa un pago ficticio en la tienda.').colSpan=6;ordersBody.append(row)}
  const eventsBody=document.querySelector('#events-body');eventsBody.replaceChildren();for(const event of data.events){const row=document.createElement('tr');cell(row,date(event.created_at));cell(row,event.event);cell(row,event.order_id.slice(0,8));eventsBody.append(row)}
  if(!data.events.length){const row=document.createElement('tr');cell(row,'Los eventos aparecerán al simular un pedido.').colSpan=3;eventsBody.append(row)}
}
async function boot(){try{const state=await api('/api/admin/session');setupRequired=state.setupRequired;loginCard.hidden=state.authenticated;dashboard.hidden=!state.authenticated;document.querySelector('#logout').hidden=!state.authenticated;message.textContent='';if(state.authenticated){await loadData();return}document.querySelector('#login-title').textContent=setupRequired?'Crea tu acceso privado.':'Tu laboratorio.';document.querySelector('#login-description').textContent=setupRequired?'Primera apertura: define una contraseña de al menos 12 caracteres. No uses una contraseña de otro servicio.':'Introduce tu contraseña para consultar los registros de la demostración.';document.querySelector('#login-submit').textContent=setupRequired?'Crear acceso privado':'Entrar al panel';const input=document.querySelector('#password');input.autocomplete=setupRequired?'new-password':'current-password';input.minLength=setupRequired?12:1;}catch(error){message.textContent=error.message}}
document.querySelector('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=document.querySelector('#login-submit');button.disabled=true;
  try{
    // Otra pestaña puede haber creado la cuenta después de cargar esta pantalla.
    const state=await api('/api/admin/session');
    if(state.authenticated){document.querySelector('#password').value='';await boot();return;}
    if(setupRequired&&!state.setupRequired){await boot();message.textContent='Tu cuenta ya está creada. Pulsa Entrar al panel con la contraseña que elegiste.';return;}
    setupRequired=state.setupRequired;
    await api(setupRequired?'/api/admin/setup':'/api/admin/login',{password:document.querySelector('#password').value});
    const verification=await api('/api/admin/session');
    if(!verification.authenticated)throw new Error('El navegador no conservó la sesión. Permite las cookies de este sitio y vuelve a intentarlo.');
    document.querySelector('#password').value='';await boot();
  }catch(error){if(error.status===409)await boot();message.textContent=error.message;}finally{button.disabled=false;}
});
document.querySelector('#logout').addEventListener('click',async()=>{try{await api('/api/admin/logout',{});dashboard.hidden=true;document.querySelector('#orders-body').replaceChildren();document.querySelector('#events-body').replaceChildren();await boot()}catch(error){message.textContent=error.message}});
document.querySelector('#refresh').addEventListener('click',async()=>{try{await loadData()}catch(error){if(error.status===401){dashboard.hidden=true;await boot()}message.textContent=error.message}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!loginCard.hidden)boot();});
boot();
