const {createApp}=require('./backend.cjs');
const {server}=createApp();
server.listen(4173,'127.0.0.1',()=>{
  console.log('Tienda: http://127.0.0.1:4173/');
  console.log('Panel privado: http://127.0.0.1:4173/admin');
});
