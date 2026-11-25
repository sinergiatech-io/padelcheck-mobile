# KAN-141 — Pantalla nativa de planes (`/pricing`)

**Estas capturas no son evidencia nativa.** Son una vista previa del mismo componente renderizado con
react-native-web (Expo web, Chrome headless, 402 y 360 px) contra un mock local de `GET /plans`, para comparar
layout, tipografía y contenido con los frames aprobados de KAN-140 (`rnweb-preview-cmp-402`: frame a la izquierda).

Pendiente de verificación en dispositivo/emulador:

- Android: verificado en emulador el 22/11 (ver sección Android abajo).
- iOS: no verificado; lo verifica Nicolas.
- Pull-to-refresh (RefreshControl no opera en web), swipe/snap horizontal, TalkBack/VoiceOver, safe areas y menú
  con botón atrás de Android requieren prueba en cada plataforma.

Verificado en esta entrega: `tsc --noEmit`, `npm run test:*` (incluye `test:pricing`), y `expo export` de los bundles
Hermes de Android e iOS sin errores.

## Android (emulador), 22/11/2026

Ejecutado en el AVD `PadelCheck_API_36` (Pixel 5, Android 16/API 36, x86_64, 1080x2349 a 430 dpi), con una development build
debug compilada desde `8bdf963`. Se abrió con el deep link `padelcheck://pricing`, porque no hay entrada desde el login.
La API es la demo real (`https://padelcheck-api.onrender.com/api`, `EXPO_PUBLIC_API_BASE_URL` en Metro). Para los fallos se
cortaron el wifi y los datos del emulador (`adb shell svc wifi/data disable`); no se usó ningún mock. Capturas en [`android/`](android/).
El botón flotante «Tools» que se ve arriba a la derecha es del dev client de Expo, no de la app.

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| Carga de datos reales (FREE 1/24/2/1, PRO 4/120/5/5, ELITE ilimitados; precios Gratis / Precio por confirmar) | PASS | `01`, `02`, `03` |
| Segmentos FREE/PRO/ELITE mueven la tira y quedan `selected` | PASS (el primer toque tras abrir el deep link no tuvo efecto; no se reprodujo en 7 toques siguientes) | `02`, `03` |
| Swipe + snap; el segmento sigue al swipe, sin pasar de ELITE, arrastre corto o lento vuelve a un snap | PASS | `04`, `05`, `06` |
| Pull-to-refresh con datos: indicador, termina, mantiene la oferta en foco (ELITE) | PASS | `07` |
| Pulls repetidos seguidos | PASS (sin errores; mantiene datos y foco) | — |
| Refresh fallido sin red: banner «No pudimos actualizar los planes», datos visibles, Reintentar | PASS | `08`, `08b` |
| Reintentar sin red sigue en error; con red vuelve a datos y quita el banner | PASS | `09` |
| Error inicial sin red: «No pudimos cargar los planes» + Reintentar, sin CTA | PASS | `11` |
| Contenido corto (estado de error): pull sin red sigue en error, con red carga | PASS | `12`, `13` |
| Reintentar → «Cargando planes», esqueletos y segmentos deshabilitados → datos | PASS | `14`, `15` |
| Menú pantalla completa (Inicio / Planes seleccionado / Iniciar sesión) y botón Atrás de Android lo cierra y queda en /pricing | PASS | `16`, `17-menu-closed-by-back` |
| Safe areas: encabezado bajo la barra de estado, pie y barra de gestos sin superposición | PASS con observación: con edge-to-edge el contenido desplazado pasa bajo la barra de estado transparente (`18`), igual que en otras pantallas (KAN-229) | `18` |
| Etiquetas accesibles (árbol `uiautomator --compressed`): segmentos «Ver oferta X» con `selected`, «Precio: …», «Torneos activos: 1», menú «Abrir/Cerrar menú» | PASS | — |
| Tarjetas fuera de foco ocultas al lector (`no-hide-descendants`): en el árbol comprimido solo aparece la oferta en foco | PASS | — |
| TalkBack activo: el foco recorre la app empezando por «Padel Check, inicio» | PASS básico; **sin escucha real** ni verificación del orden completo ni de los anuncios | `19`, `20`, `21` |

Sin pendientes de Android para este ticket, salvo la escucha real con TalkBack. iOS sigue sin verificar (lo verifica Nicolas).
