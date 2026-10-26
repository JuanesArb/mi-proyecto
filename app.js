const products = [
  {id:1,name:'Velocity Red',category:'Running',price:289900,badge:'NUEVA TEMPORADA',color:'#e43b30',image:'photo-1542291026-7eec264c27ff',description:'Una silueta enérgica para acompañar tu ritmo. Modelo ficticio de la colección Movement.'},
  {id:2,name:'Court Essential',category:'Lifestyle',price:249900,badge:'EL PAR DE CADA DÍA',color:'#eae9e4',image:'photo-1549298916-b41d501d3772',description:'Líneas sencillas y una actitud versátil para recorrer la ciudad. Producto de demostración.'},
  {id:3,name:'Airline Classic',category:'Lifestyle',price:319900,badge:'SELECCIÓN SL',color:'#dddcd7',image:'photo-1600269452121-4f2416e55c28',description:'Un clásico urbano reinterpretado para SneakerLab. Nombre, precio y características ficticios.'},
  {id:4,name:'Form Runner',category:'Training',price:279900,badge:'EN MOVIMIENTO',color:'#383838',image:'photo-1543508282-6319a3e2621f',description:'Diseño deportivo para tu siguiente sesión. Este modelo forma parte del catálogo educativo.'}
];
const money = value => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value);
const imageUrl = (product,width=700) => `https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=${width}&q=85`;
let category='Todos'; let cart=[]; let toastTimer;
const productDialog=document.querySelector('#product-dialog');
const cartDialog=document.querySelector('#cart-dialog');
function renderProducts(){
  const term=document.querySelector('#search').value.trim().toLocaleLowerCase('es');
  const visible=products.filter(p=>(category==='Todos'||p.category===category)&&`${p.name} ${p.category}`.toLocaleLowerCase('es').includes(term));
  document.querySelector('#products').innerHTML=visible.map(p=>`<article class="product-card"><button class="product-image" data-product="${p.id}" aria-label="Ver ${p.name}"><img src="${imageUrl(p)}" alt="Fotografía ilustrativa de zapatillas para ${p.category.toLowerCase()}" loading="lazy"><span class="product-badge">${p.badge}</span><span class="product-open" aria-hidden="true">↗</span></button><div class="product-meta"><div><h3>${p.name}</h3><p>${p.category} · Unisex</p></div><span class="product-price">${money(p.price)}</span></div><span class="color-dot" style="background:${p.color}"></span><span class="color-dot" style="background:#f4f4f0"></span></article>`).join('');
  document.querySelector('#empty').hidden=visible.length>0;
}
function setCategory(value){category=value;document.querySelectorAll('[data-filter]').forEach(b=>{const selected=b.dataset.filter===value;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});renderProducts()}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setCategory(b.dataset.filter)));
document.querySelectorAll('[data-category]').forEach(a=>a.addEventListener('click',()=>setCategory(a.dataset.category)));
document.querySelector('#search').addEventListener('input',renderProducts);
document.querySelector('.search-toggle').addEventListener('click',()=>{document.querySelector('#coleccion').scrollIntoView();document.querySelector('#search').focus({preventScroll:true})});
document.querySelector('#products').addEventListener('click',event=>{
  const button=event.target.closest('[data-product]'); if(!button)return;
  const product=products.find(p=>p.id===Number(button.dataset.product));
  document.querySelector('#product-detail').innerHTML=`<img class="detail-photo" src="${imageUrl(product)}" alt="Fotografía ilustrativa de ${product.name}"><p class="eyebrow">${product.category} / MODELO FICTICIO</p><h2 id="detail-title">${product.name}</h2><p>${product.description}</p><strong>${money(product.price)}</strong><p style="margin-top:20px;margin-bottom:8px">Selecciona tu talla (EU)</p><div class="sizes">${[36,37,38,39,40,41,42,43,44].map(size=>`<button data-size="${size}" aria-pressed="false">${size}</button>`).join('')}</div><button class="button button-dark" id="add-to-cart">Añadir a mi bolsa <span>＋</span></button><p>Simulación educativa. Fotografías ilustrativas; no hay productos a la venta.</p>`;
  productDialog.setAttribute('aria-labelledby','detail-title');let selectedSize=null;
  productDialog.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{selectedSize=Number(b.dataset.size);productDialog.querySelectorAll('[data-size]').forEach(other=>{const active=other===b;other.classList.toggle('selected',active);other.setAttribute('aria-pressed',String(active))})}));
  document.querySelector('#add-to-cart').addEventListener('click',()=>{if(!selectedSize){notify('Elige una talla para continuar.');return}cart.push({product,size:selectedSize});document.querySelector('#bag-count').textContent=cart.length;productDialog.close();notify(`${product.name} añadido a tu bolsa de demostración.`)});
  productDialog.showModal();
});
function renderCart(){document.querySelector('#cart-content').innerHTML=cart.length?`${cart.map((item,index)=>`<div class="cart-row"><div><strong>${item.product.name}</strong><p>Talla ${item.size} · ${money(item.product.price)}</p></div><button data-remove="${index}" aria-label="Quitar ${item.product.name}">Quitar</button></div>`).join('')}<p class="cart-total">Total simulado: ${money(cart.reduce((sum,item)=>sum+item.product.price,0))}</p><button class="button button-dark checkout-start" data-checkout>Continuar al pago ficticio <span>↗</span></button><p class="cart-message">Demo académica · Sin cobros. Utiliza solo las tarjetas de laboratorio y los participantes ficticios disponibles.</p>`:'<p>Tu bolsa está vacía. Explora la colección y elige tu primer par.</p>'}
function showBag(){cartDialog.classList.remove('checkout-mode');document.querySelector('#cart-title').textContent='Mi bolsa';renderCart();}
document.querySelector('.bag-button').addEventListener('click',()=>{showBag();cartDialog.showModal()});
document.querySelector('#cart-content').addEventListener('click',event=>{if(event.target.closest('[data-checkout]')){showCheckout();return}const button=event.target.closest('[data-remove]');if(!button)return;cart.splice(Number(button.dataset.remove),1);document.querySelector('#bag-count').textContent=cart.length;renderCart()});
function showCheckout(){
  if(!cart.length)return;
  cartDialog.classList.add('checkout-mode');document.querySelector('#cart-title').textContent='Finalizar pedido';
  window.renderLabCheckout({items:[...cart],container:document.querySelector('#cart-content'),formatMoney:money,imageUrl,onBack:showBag,onClose:()=>cartDialog.close(),onApproved:submittedItems=>{cart=cart.filter(item=>!submittedItems.includes(item));document.querySelector('#bag-count').textContent=cart.length;}});
}
document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}})});
function notify(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000)}
renderProducts();
