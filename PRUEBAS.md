# Evidencias del laboratorio de pagos

## Comprobación automatizada

Comando: `node --test backend.test.cjs`.

Resultado de esta entrega: 7 pruebas aprobadas, 0 fallidas (prueba principal y 6 subpruebas).

| Área | Resultado comprobado |
| --- | --- |
| Privacidad | La API devuelve 401 sin sesión; la base y el código del servidor no se sirven por HTTP. |
| Validación | Rechaza campos adicionales como cardNumber y cvv, participantes no predefinidos, tallas inválidas y precios enviados por el cliente. |
| Origen | Bloquea solicitudes de escritura de otro origen y nombres de host externos. |
| Acceso | Configuración única, contraseña con scrypt y sal, cookie HttpOnly y SameSite=Strict. |
| Simulación | Registra aprobación, rechazo y saldo insuficiente; el precio lo calcula el servidor. |
| Duplicados | Repetir el mismo identificador de solicitud no crea otro pedido. |
| Persistencia | Pedidos y eventos permanecen después de cerrar y volver a abrir el servidor. |
| Sesiones | Cerrar sesión o vencer su plazo bloquea de nuevo el acceso. |
| Intentos | Se limita la frecuencia de intentos de autenticación. |

Las pruebas usan una base temporal independiente y no configuran el administrador de uso normal.

## Recorrido en navegador

Se verificó: seleccionar Velocity Red, talla 40, añadir a la bolsa, abrir el pago ficticio, seleccionar los datos sintéticos predefinidos y registrar una aprobación. La pantalla mostró la referencia del pedido y confirmó que no hubo cobro. Evidencia visual: `pago-verificado.png`.

También se abrió `/admin` y se confirmó que muestra la creación de contraseña en la primera apertura, sin mostrar registros antes del inicio de sesión. El propietario debe completar personalmente esa configuración.

## Actualización del proceso de compra

Se recorrieron en navegador los nuevos pasos Entrega → Pago → Revisión → Confirmación. Se comprobó la carga del perfil sintético Alfa, la credencial `SL-DEMO-APROBADA`, el resumen de productos y la explicación educativa final. Se creó el pedido ficticio `b65d8a7c` como evidencia de integración. Captura: `checkout-verificado.png`.

Se repitió la suite del servidor después de integrar los nuevos archivos: 7 pruebas aprobadas y 0 fallidas. Los datos de contacto visuales siguen siendo de solo lectura y no forman parte de la solicitud de creación del pedido.

## Ejercicio con teclado

Resultado actualizado: 8 pruebas automatizadas aprobadas, 0 fallidas. Se verificó que el servidor conserva únicamente el perfil sintético canónico y rechaza campos adicionales o un indicador de ejercicio no permitido.

En el navegador se escribieron los siete campos de contacto de ejemplo del perfil Alfa y la credencial LAB. Una credencial diferente (`LAB-INCORRECTA`) fue rechazada antes del envío; el identificador correcto permitió completar el pedido `769b0964`. Se comprobó en SQLite que el pedido conserva el perfil ficticio del ejercicio. El panel permite desplegar esos datos sin cambiar los pedidos anteriores.

El indicador de ejercicio describe la validación declarada por la interfaz; no acredita que se usó físicamente un teclado ni registra teclas o valores libres. Los textos introducidos no se envían y la base guarda únicamente el perfil predefinido seleccionado.

## Nombre ficticio y observaciones libres

La versión actual añade dos campos editables que se guardan tras confirmar el pedido. El perfil de contacto vuelve a ser de solo lectura. El panel muestra el alias y la observación con `textContent`, sin ejecutar contenido HTML.

Resultado actualizado: 9 pruebas aprobadas, 0 fallidas. La prueba adicional cubre estructura, límites, rechazo de campos adicionales y secuencias financieras, almacenamiento, duplicados, persistencia al reiniciar y consulta protegida de las observaciones.

Recorrido en navegador: se escribió «Corredor Azul» y una observación de ejemplo, se revisaron ambos antes de confirmar y se guardaron en el pedido `4c71284f`. Se verificaron los valores en SQLite. Captura de los campos: `campos-libres.png`.

## Formulario simplificado actual

Se eliminaron de la interfaz el selector de participantes y los campos adicionales duplicados. Nombre, apellido, correo de prueba `.invalid`, dirección, ciudad, teléfono `000` y código postal se escriben directamente. Los códigos de pago aceptan el formato personalizado `LAB-` seguido de 1 a 8 letras o números.

Resultado actualizado: 10 pruebas aprobadas, 0 fallidas. La nueva prueba cubre almacenamiento y recuperación autenticada del perfil personalizado, persistencia después de reiniciar y rechazo de correos reales, teléfonos fuera del formato de prueba, números bancarios, CVV y atributos adicionales.

En navegador se completó un pedido con «Luna Azul», dirección y ciudad inventadas y código `LAB-LUNA`. Se verificó en SQLite el pedido `22863eec`. Captura del formulario editable: `formulario-personalizado.png`.

## Límites de publicación

Versión local, accesible únicamente en el computador donde se ejecuta. No es una auditoría completa ni una configuración lista para internet. La privacidad del panel se aplica al acceso HTTP; los archivos locales deben protegerse mediante la cuenta y permisos del sistema operativo. No se evaluaron pasarelas bancarias porque no existen conexiones financieras.
