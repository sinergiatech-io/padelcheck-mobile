# KAN-250 — Aviso de factura pendiente en el plan del club (Android)

Verificado en el emulador el 24/11/2026 (America/Buenos_Aires), AVD `PadelCheck_API_36` (Android 16/API 36, x86_64, 1080x2349 a 430 dpi), development build debug compilada desde `c0d46d6` (`KAN-250-invoice-status`). Entrada: login de administrador del club y deep link `padelcheck://club/plan`. Capturas en [`android/`](android/). El botón flotante «Tools» es del dev client de Expo, no de la app.

## Backend de la corrida

No se usó la API demo de Render ni se desplegó la rama. El servicio KAN-250 no está en ese ambiente, y levantar Java + Postgres en la PC del usuario habría sido más pesado (C: con poco espacio libre). Se usó un stub HTTP local en `127.0.0.1:8080`, alcanzado por el emulador como `http://10.0.2.2:8080/api` (`EXPO_PUBLIC_API_BASE_URL`). El stub reproduce los contratos de login, `/auth/me`, suscripción (con `invoiceStatus`), uso y eventos, y permite cambiar el escenario (`pending` / `issued` / `absent` / `courtesy`) entre casos. El paso a ISSUED se hizo cambiando el estado del stub, no desde `/owner` (esa pantalla es web). El log [`android/stub.log`](android/stub.log) muestra las lecturas de cada refresh.

## Resultados

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| 1. Banner «Factura pendiente» con el texto acordado; el plan PRO sigue usable (suscripción activa, meters, CTA Mejorar plan) | PASS | `01-pending-banner.png` |
| 2. Tras marcar ISSUED, pull-to-refresh oculta el banner; el plan sigue activo | PASS | `02-issued-after-refresh.png` |
| 3. Período pagado con `invoiceStatus` ausente (histórico): sin banner | PASS | `03-absent-no-banner.png` |
| 4. Período de cortesía: sin banner; el plan sigue activo | PASS | `04-courtesy-no-banner.png` |
| 5. El refresh recarga suscripción/uso/eventos y no dispara cobro ni checkout | PASS (solo GET de `subscription`, `usage` y `events` en cada pull; sin `/billing/charges` ni `/checkout`) | `05-refresh-no-charge.png`, `stub.log` |
| 6. Chequeo básico: la pantalla carga, identidad PRO, meters, navegación inferior y el aviso no tapa el uso del plan; cabecera bajo la barra de estado | PASS | `01-pending-banner.png` |

iOS sigue sin verificación runtime/visual (acuerdo 12/11/2026). No se mergeó ni se desplegó.
