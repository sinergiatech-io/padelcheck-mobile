# KAN-76 · Validación Android

Se usó el cliente de desarrollo del AVD `PadelCheck_API_36` con el bundle de esta rama y PostgreSQL local a través de la API. El visor es de aproximadamente 402 × 874 dp. La barra del sistema y el control flotante de Expo pertenecen al emulador y al cliente de desarrollo.

- [Listado](android/01-listado.png) y [hub borrador](android/02-hub-borrador.png). Se comprobó la navegación por Eventos y el detalle con datos reales. El hub se comparó con [3439:41828](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/?node-id=3439-41828).
- [Hoja de acciones](android/03-hub-acciones.png) y [confirmación de cancelación](android/04-hub-confirmacion.png). Se compararon con [3441:43134](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/?node-id=3441-43134) y [3441:44142](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/?node-id=3441-44142).

- [Aviso después de actualizar](android/05-horarios-a-confirmar.png) y [evento cancelado](android/06-hub-cancelado.png). El gesto consultó el calendario actualizado desde la API. La cancelación cambió el estado a Cancelado, retiró el menú y conservó las sedes en la consulta histórica.

Pasaron typecheck, las pruebas de sesión y la exportación del bundle iOS. La verificación en dispositivo iOS sigue la excepción acordada. Las categorías y la confirmación del alta se conectan en [KAN-78](https://sinergiatech.atlassian.net/browse/KAN-78).
