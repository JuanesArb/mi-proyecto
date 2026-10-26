/* Compra de laboratorio: datos inventados y códigos LAB, sin campos bancarios. */
window.renderLabCheckout=function({items,container,formatMoney,imageUrl,onApproved,onBack,onClose}){
  const total=items.reduce((sum,item)=>sum+item.product.price,0);
  let step=1;let requestId=crypto.randomUUID();let busy=false;
  const money=formatMoney;
  container.innerHTML=`<p class="checkout-disclosure">Demo académica · Usa únicamente los datos de ejemplo. Sin pagos ni entregas reales.</p><div class="purchase-layout"><div class="purchase-steps"><section class="purchase-step" id="delivery-step"><div class="step-heading"><h3><span>1</span> Opciones de entrega <b id="delivery-check" hidden>✓</b></h3><button type="button" class="text-action" id="edit-delivery" hidden>Editar</button></div><div id="delivery-summary" class="step-summary" hidden></div><form id="delivery-form" autocomplete="off"><div class="delivery-methods"><label><input type="radio" name="delivery-mode" value="ship" checked><span>↗</span> Envío a domicilio</label><label><input type="radio" name="delivery-mode" value="pickup"><span>⌖</span> Recoger en tienda</label></div><div class="example-picker"><label for="example-profile">Perfil de ejemplo</label><select id="example-profile"><option value="persona-01">Participante Alfa</option><option value="persona-02">Participante Beta</option><option value="persona-03">Participante Gamma</option></select><p>Los campos se rellenan con datos ficticios y no admiten información personal.</p></div><div class="delivery-fields"><label class="field full">Correo electrónico<input type="text" id="example-email" readonly autocomplete="off"></label><label class="field">Nombre<input type="text" id="example-name" readonly autocomplete="off"></label><label class="field">Apellido<input type="text" id="example-surname" readonly autocomplete="off"></label><label class="field full">Dirección de ejemplo<input type="text" id="example-address" readonly autocomplete="off"></label><label class="field">Ciudad<input type="text" id="example-city" readonly autocomplete="off"></label><label class="field">Código postal<input type="text" id="example-zip" readonly autocomplete="off"></label><label class="field">Teléfono de ejemplo<input type="text" id="example-phone" readonly autocomplete="off"></label><label class="field">País<input type="text" value="Colombia · Laboratorio" readonly autocomplete="off"></label></div><div class="delivery-speed"><strong>Entrega de demostración</strong><span>Sin costo · No se enviará ningún producto</span></div><div class="step-actions"><button class="button button-dark" type="submit">Guardar y continuar</button></div></form></section><section class="purchase-step" id="payment-step"><div class="step-heading"><h3><span>2</span> Pago <b id="payment-check" hidden>✓</b></h3><button type="button" class="text-action" id="edit-payment" hidden>Editar</button></div><div id="payment-summary" class="step-summary" hidden></div><form id="payment-form" autocomplete="off" hidden><p class="billing-country">País de facturación<br><strong>Colombia</strong></p><p class="payment-method-title">Método de pago</p><div class="demo-method">◉ <span>▤</span> Tarjeta de laboratorio <small>Sin conexión bancaria</small></div><div class="payment-entry"><h4>Credencial ficticia</h4><label class="field full">Escenario de prueba<select id="scenario"><option value="lab-approved">Aprobación</option><option value="lab-declined">Rechazo</option><option value="lab-insufficient">Saldo insuficiente</option></select></label><div class="payment-fields"><label class="field credential-field">Identificador de tarjeta LAB<input type="text" id="demo-credential" readonly autocomplete="off"></label><label class="field">Vigencia<input type="text" value="NO APLICA" readonly autocomplete="off"></label><label class="field">Código demo<input type="text" value="DEMO" readonly autocomplete="off"></label></div><p>Esta credencial no es un número bancario. No se solicitan números de tarjeta reales ni CVV.</p></div><p class="billing-note">✓ Datos de facturación iguales al perfil ficticio</p><div class="step-actions"><button class="button button-dark" type="submit">Revisar pedido</button></div></form></section><section class="purchase-step" id="review-step"><div class="step-heading"><h3><span>3</span> Revisión del pedido</h3></div><div id="review-content" hidden><div id="review-summary" class="step-summary"></div><p class="review-disclosure">Al confirmar se guardarán los productos, tallas, participante ficticio y resultado de laboratorio. No se cobrará dinero.</p><button class="button button-dark confirm-order" id="confirm-order" type="button">Confirmar pedido ficticio</button><p id="payment-feedback" role="status"></p></div></section><button type="button" class="checkout-back" id="back-to-bag">← Volver a la bolsa</button></div><aside class="purchase-order" aria-label="Resumen del pedido"><div class="order-heading"><h3>En tu bolsa</h3><button type="button" class="text-action" id="edit-bag">Editar</button></div><dl class="order-totals"><div><dt>Subtotal</dt><dd>${money(total)}</dd></div><div><dt>Envío simulado</dt><dd>${money(0)}</dd></div><div><dt>Cargos adicionales</dt><dd>${money(0)}</dd></div><div class="order-total"><dt>Total</dt><dd>${money(total)}</dd></div></dl><p class="order-demo-caption">Catálogo ficticio · Precios de demostración</p><div class="order-items">${items.map(item=>`<article class="order-item"><img src="${imageUrl(item.product,220)}" alt="Fotografía ilustrativa de ${item.product.name}"><div><strong>${money(item.product.price)}</strong><h4>${item.product.name}</h4><p>Calzado unisex<br>Talla: EU ${item.size} · Cantidad: 1</p></div></article>`).join('')}</div></aside></div>`;
  const $=selector=>container.querySelector(selector);
  const exerciseKeys=['name','surname','email','address','city','phone','zip'];
  const profile=()=>Object.fromEntries(exerciseKeys.map(key=>[key,$(`#example-${key}`).value.trim()]));
  $('.example-picker').remove();
  $('.checkout-disclosure').textContent='Demo académica · Escribe datos inventados. Los datos del ejercicio se guardarán en el panel privado. Sin cobros ni envíos reales.';
  const deliveryFeedback=document.createElement('p');deliveryFeedback.className='exercise-feedback';deliveryFeedback.setAttribute('role','status');$('#delivery-form').append(deliveryFeedback);
  const paymentFeedback=document.createElement('p');paymentFeedback.className='exercise-feedback';paymentFeedback.setAttribute('role','status');$('#payment-form').append(paymentFeedback);
  function editableExample(input,value){
    input.readOnly=false;input.required=true;input.maxLength=100;input.value='';input.placeholder='Escribe el dato de ejemplo';input.setCustomValidity('');
    let hint=input.parentElement.querySelector('.example-hint');if(!hint){hint=document.createElement('small');hint.className='example-hint';hint.id=`${input.id}-hint`;input.parentElement.append(hint);input.setAttribute('aria-describedby',hint.id);input.addEventListener('input',()=>input.setCustomValidity(''));}
    hint.textContent=`Ejemplo: ${value}`;
  }
  function fillProfile(){
    const hints={name:'Nombre inventado',surname:'Apellido inventado',email:'nombre@ejemplo.invalid',address:'Dirección inventada',city:'Ciudad inventada',phone:'000 123 4567',zip:'000000'};
    const limits={name:60,surname:60,email:100,address:160,city:60,phone:14,zip:6};
    for(const key of exerciseKeys){const input=$(`#example-${key}`);input.value='';input.readOnly=false;input.required=true;input.maxLength=limits[key];input.placeholder=hints[key];input.addEventListener('input',()=>{input.setCustomValidity('');requestId=crypto.randomUUID();});}
    for(const [key,text] of [['email','Usa un correo ficticio terminado en .invalid.'],['phone','Teléfono de prueba: debe empezar por 000 y tener 10 dígitos.']]){const hint=document.createElement('small');hint.className='example-hint';hint.textContent=text;$(`#example-${key}`).after(hint);}
    deliveryFeedback.textContent='';requestId=crypto.randomUUID();
  }
  function fillCard(){const input=$('#demo-credential');editableExample(input,'LAB-5678 (puedes inventar otro código LAB-)');input.maxLength=12;input.placeholder='LAB-5678';paymentFeedback.textContent='';requestId=crypto.randomUUID();}
  function validateProfile(){
    for(const key of exerciseKeys){const input=$(`#example-${key}`);input.setCustomValidity('');const value=input.value.trim();let error='';
      if(!value)error='Completa este campo con datos inventados.';
      else if(key==='email'&&!/^[^\s@]+@[a-z0-9.-]+\.invalid$/i.test(value))error='Usa un correo de prueba terminado en .invalid.';
      else if(key==='phone'&&!/^000[ -]?\d{3}[ -]?\d{4}$/.test(value))error='Usa un teléfono ficticio de 10 dígitos que empiece por 000.';
      else if(key==='zip'&&!/^\d{4,6}$/.test(value))error='Usa un código postal de prueba de 4 a 6 dígitos.';
      else if(/(?:\d[ -]*){12,}/.test(value))error='No escribas números financieros en estos campos.';
      if(error){input.setCustomValidity(error);input.reportValidity();deliveryFeedback.textContent=error;return false;}
    }deliveryFeedback.textContent='';return true;
  }
  function validateCredential(){const input=$('#demo-credential');input.setCustomValidity('');if(!/^LAB-[A-Z0-9]{1,8}$/i.test(input.value.trim())){input.setCustomValidity('Inventa un código LAB- seguido de 1 a 8 letras o números, sin datos bancarios.');input.reportValidity();paymentFeedback.textContent='Ejemplo válido: LAB-AZUL. No se admiten tarjetas reales.';return false}paymentFeedback.textContent='';return true;}
  function renderStep(){
    $('#delivery-form').hidden=step!==1;$('#delivery-summary').hidden=step===1;$('#edit-delivery').hidden=step===1;$('#delivery-check').hidden=step===1;
    $('#payment-form').hidden=step!==2;$('#payment-summary').hidden=step!==3;$('#edit-payment').hidden=step!==3;$('#payment-check').hidden=step!==3;
    $('#review-content').hidden=step!==3;
    $('#payment-step').classList.toggle('step-waiting',step<2);$('#review-step').classList.toggle('step-waiting',step<3);
    const data=profile();const delivery=container.querySelector('input[name="delivery-mode"]:checked').value==='ship'?'Envío ficticio a domicilio':'Recogida ficticia en tienda';
    $('#delivery-summary').textContent=`${delivery}\n${data.name} ${data.surname}\n${data.address} · ${data.city}\n${data.email}\n${data.phone}`;
    $('#payment-summary').textContent=`Tarjeta de laboratorio · ${$('#demo-credential').value.trim()}`;
    $('#review-summary').textContent=`${data.name} ${data.surname}\n${delivery}\n${items.length} artículo(s) · Total: ${money(total)}\nCredencial: ${$('#demo-credential').value.trim()}`;
  }
  function jumpTo(selector){$(selector).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  $('#scenario').addEventListener('change',()=>{requestId=crypto.randomUUID()});
  $('#demo-credential').addEventListener('input',()=>{requestId=crypto.randomUUID()});
  $('#delivery-form').addEventListener('submit',event=>{event.preventDefault();if(!validateProfile())return;step=2;renderStep();jumpTo('#payment-step')});
  $('#payment-form').addEventListener('submit',event=>{event.preventDefault();if(!validateCredential())return;step=3;renderStep();jumpTo('#review-step')});
  $('#edit-delivery').addEventListener('click',()=>{step=1;renderStep();jumpTo('#delivery-step')});
  $('#edit-payment').addEventListener('click',()=>{step=2;renderStep();jumpTo('#payment-step')});
  $('#back-to-bag').addEventListener('click',onBack);$('#edit-bag').addEventListener('click',onBack);
  $('#confirm-order').addEventListener('click',async()=>{
    if(busy)return;
    if(!validateProfile()){step=1;renderStep();return;}if(!validateCredential()){step=2;renderStep();return;}
    busy=true;const button=$('#confirm-order');const feedback=$('#payment-feedback');feedback.textContent='';
    const controls=[...container.querySelectorAll('button,select,input,textarea')];controls.forEach(control=>control.disabled=true);button.textContent='Registrando pedido…';
    try{
      // Perfil inventado y código LAB; nunca números bancarios, vigencias o CVV.
      const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,participantId:'persona-01',cardId:$('#scenario').value,exercise:'custom-profile-v1',demoProfile:profile(),labCode:$('#demo-credential').value.trim().toUpperCase(),items:items.map(item=>({productId:item.product.id,size:item.size}))})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo registrar el pedido.');
      const approved=result.status==='approved';if(approved)onApproved(items);
      container.replaceChildren();const panel=document.createElement('div');panel.className=`payment-result ${approved?'payment-approved':'payment-declined'}`;
      const icon=document.createElement('div');icon.className='result-symbol';icon.textContent=approved?'✓':'!';
      const heading=document.createElement('h3');heading.textContent=approved?'Pedido ficticio confirmado':result.status==='insufficient'?'Saldo ficticio insuficiente':'Pago ficticio rechazado';
      const description=document.createElement('p');description.textContent='Esta compra era una demostración académica. No se procesó ningún pago ni se realizará un envío. Solo se registraron los datos sintéticos del laboratorio.';
      const reference=document.createElement('p');reference.textContent=`Pedido ${result.id.slice(0,8)} · ${money(result.total)}`;
      const lesson=document.createElement('p');lesson.className='result-lesson';lesson.textContent='Una apariencia profesional no acredita una tienda. Antes de compartir datos, verifica el dominio y la identidad del vendedor; HTTPS por sí solo no garantiza legitimidad.';
      const action=document.createElement('button');action.className='button button-dark';action.textContent=approved?'Volver a la tienda':'Probar otro escenario';action.addEventListener('click',approved?onClose:()=>window.renderLabCheckout({items,container,formatMoney,imageUrl,onApproved,onBack,onClose}));
      panel.append(icon,heading,description,reference,lesson,action);container.append(panel);container.scrollIntoView({block:'start'});
    }catch(error){feedback.textContent=error instanceof TypeError?'No se pudo conectar. Comprueba que el servidor esté encendido e intenta otra vez.':error.message;controls.forEach(control=>control.disabled=false);button.textContent='Confirmar pedido ficticio';}finally{busy=false;}
  });
  fillProfile();fillCard();renderStep();
};
