# SneakerLab · Piloto 01

Abre `index.html` con tu navegador, o ejecuta desde esta carpeta:

```
node server.cjs
```

Visita http://127.0.0.1:4173. Para detener el servidor, pulsa Ctrl+C.

Incluye portada adaptable a móvil, filtros, buscador, detalle de producto, tallas, bolsa temporal y pago ficticio. La bolsa se vacía al recargar; los pedidos guardados permanecen en SQLite al reiniciar.

## Pago y panel privado

- Tienda: http://127.0.0.1:4173/
- Panel: http://127.0.0.1:4173/admin
- En la primera apertura del panel, crea una contraseña personal de al menos 12 caracteres. No la compartas ni uses la de otro servicio.
- El proceso de compra tiene tres pasos: entrega, pago y revisión, con resumen lateral en escritorio. En móvil el resumen aparece antes del formulario.
- La versión actual elimina el selector de participantes y los apartados duplicados. El participante escribe directamente nombre, apellido, dirección y ciudad inventados. El correo debe terminar en `.invalid`, el teléfono debe tener 10 dígitos y empezar por `000`, y el código postal debe tener de 4 a 6 dígitos. Un aviso previo explica que esos datos se guardan con el pedido y aparecerán en el panel privado. No se registran pulsaciones.
- El servidor valida estructura y longitud, bloquea secuencias largas con aspecto de número financiero y guarda el perfil personalizado en `order_exercises` con el modo `custom-profile-v1`. Los nombres y direcciones no pueden verificarse automáticamente como ficticios: el participante debe seguir el aviso y usar datos inventados. El panel muestra los campos como texto mediante `textContent`, sin interpretar HTML.
- El pago utiliza un código personalizable `LAB-` seguido de 1 a 8 letras o números, por ejemplo `LAB-LUNA`. La vigencia es no aplicable y el código demo es de solo lectura. No existen campos para procesar tarjetas reales ni CVV. El código LAB se muestra junto al perfil en el panel.
- Los pedidos de versiones anteriores siguen disponibles: perfiles predefinidos y las anotaciones libres ya guardadas se conservan. El nuevo formulario no muestra los apartados de nombre ficticio y observaciones duplicados.
- El aviso académico aparece antes del formulario y la explicación educativa vuelve a mostrarse tras confirmar.
- El panel presenta pedidos, resultados, artículos, tallas y eventos con hora de Colombia. La contraseña se guarda como derivación scrypt con sal; la sesión dura 30 minutos y usa una cookie HttpOnly y SameSite=Strict.
- La base está en `private/lab.sqlite`. El servidor no publica esa carpeta. La carpeta está excluida de Git; no la incluyas en archivos ZIP que compartas. Para una copia consistente, detén el servidor y copia la carpeta `private` completa a una ubicación de respaldo privada.
- Esta versión solo escucha en 127.0.0.1 y es para uso local. Cualquier persona con acceso a tu sesión de Windows o a los archivos del disco podría acceder a ellos. Antes de publicar, debe configurarse HTTPS, cookies Secure, acceso remoto y almacenamiento persistente, y completar el alta inicial del administrador. No expongas este servidor mediante un túnel.

## Pruebas

Ejecuta `node --test backend.test.cjs` desde esta carpeta. Utiliza una base temporal independiente: prueba el bloqueo sin sesión, datos sintéticos, validación de precios, origen de solicitudes, tres resultados, duplicados, persistencia, cierre y vencimiento de sesión y límite de intentos. No crea una contraseña en la base de uso normal.

Las fuentes de Google y las fotografías ilustrativas de Unsplash requieren internet. Los modelos y precios son ficticios. Las fotos son referencias visuales y pueden mostrar marcas de sus respectivos propietarios; no representan productos propios ni afiliación. Sustituirlas por imágenes originales antes de una publicación definitiva.

La identidad SneakerLab es provisional; verificar disponibilidad antes de publicar.
