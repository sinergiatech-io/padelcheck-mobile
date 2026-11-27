# KAN-78 — Categorías del evento en la app nativa (MN1–MN3)

Rama `KAN-78-divisiones`, contrato de [padelcheck-service#34](https://github.com/sinergiatech-io/padelcheck-service/pull/34), referencia web [padelcheck-fe#23](https://github.com/sinergiatech-io/padelcheck-fe/pull/23). Fecha: 26/11/2026 (America/Buenos_Aires).

## Verificaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `npm run test:divisions` | 11/11 pass (criterios, cupo, suplentes, límite de plan y lote, Idempotency-Key por intención, volver desde la revisión sin duplicar, pull-to-refresh sin solicitudes duplicadas y con fin del indicador en éxito y error) |
| Todos los `npm run test:*` (10 scripts) | 139 pass, 0 fail |
| `npx tsc --noEmit` | sin errores |
| Lint | el repo no tiene script de lint |
| `npx expo export --platform ios` | OK: bundle Hermes exportado (ver abajo) |
| `cd android && ./gradlew assembleDebug` | BUILD SUCCESSFUL (`app-debug.apk`, build de desarrollo) |

## Evidencia visual

No hay capturas nativas de esta entrega:

- **Android:** la caja de verificación no tiene aceleración por hardware (KVM no disponible). El emulador por software (TCG) tardó entre 8 y 13 minutos en arrancar y la interfaz del sistema dejó de responder («System UI isn't responding») antes de mostrar la app. Por eso no se tomaron capturas válidas.
- **Web (react-native-web):** el proyecto no la soporta. No tiene `react-native-web` y `expo-secure-store` no tiene implementación web. No se agregó soporte solo para tomar capturas.

El mismo flujo y el mismo contrato se validaron visualmente en web mobile a 402 px contra la API real. Esa evidencia está en `docs/visual-validation/KAN-78/` de padelcheck-fe#23.

## Comparación con Figma (archivo 6ChpVD5gKDoC3kRXoGdVdK)

| Frame | Implementación | Estado |
| --- | --- | --- |
| [Selección 3097:34413](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3097-34413) | `DivisionWizard.tsx` paso 4, `division-ui.tsx`. Grilla 8va→1ra, Simple múltiple, Suma 2–16, Combinado, OPEN | Copy y reglas cubiertos por tests. Comparación de píxeles pendiente en dispositivo |
| [Cupo y suplentes 3097:34415](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3097-34415) | Paso 5, `QuotaFields`. Cupo entero mayor que 0; suplentes sin valor por defecto | Ídem |
| [Revisión y creación 3097:34417](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3097-34417) · [Creando evento 3088:33952](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3088-33952) | Paso 6. Confirmación idempotente (`POST /clubs/{id}/events/drafts` + `Idempotency-Key`), banner «Creando evento», botón Loading | Ídem |
| [Éxito en borrador 3090:33794](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3090-33794) | Pantalla de éxito después de confirmar | Ídem |
| [Divisiones del hub 3097:34421](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3097-34421) · [Contexto 721:12392](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=721-12392) | `DivisionsSection.tsx`, sección «Categorías» (vocabulario KAN-254). Estados de carga, error + reintento, vacío, una o varias categorías, canceladas y límite del plan | Ídem |
| [Edición 3097:34419](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3097-34419) | `DivisionScreen` (alta y edición en DRAFT) | Ídem |
| [Cancelar división 3097:34423](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3097-34423) | Diálogo «Cancelar categoría» con Loading | Ídem |
| [Button State=Loading 3140:51741](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-51741) | `Button loading` con `ActivityIndicator`, `accessibilityState` busy/disabled y bloqueo de doble envío (MN2) | Ídem |

## iOS (excepción acordada)

Se exportó el bundle con `npx expo export --platform ios` sobre `7475831`, sin errores (EXIT 0). La verificación en dispositivo queda excluida por el acuerdo del 12/11/2026 (`docs/implementation-roadmap-mobile-proposal.md`). No es un AC pendiente.

## Ronda 2 (27/11/2026, correcciones de revisión)

- El hub muestra el nombre personalizado de una categoría cuando el organizador lo cambió; si no, el título de la tarjeta («Mixto · 6ta + 6ta»), que coincide con el nombre que genera el service.
- Suma: misma tabla de niveles que service y web (`1RA`→1 … `8VA`→8); un objetivo en rango que dos categorías no pueden formar muestra «Esta suma no se puede formar con dos categorías del catálogo.».
- Combinado con la misma categoría dos veces (6ta + 6ta) se guarda, se muestra y se edita (tests del modelo).
- La app no lee la ventana de inscripción, así que un borrador sin fechas no cambia ninguna pantalla.
- Verificaciones: todos los `npm run test:*` 141/141, `npx tsc --noEmit` sin errores, `npx expo export --platform ios` EXIT 0.
- Android sigue sin correr en la caja (sin KVM). Herramientas para correrlo en una PC: `tools/seed.sql` y `tools/fault-proxy.mjs`.

## Android: plan de corrida en un emulador con aceleración (PC local)

Revisiones: service `KAN-78-divisiones` (PR #34), mobile `KAN-78-divisiones` (PR #28). Usar los SHA finales de las PRs.

**1. Base de datos y service** (Java 21, PostgreSQL local descartable; nunca la DB demo):

```powershell
createdb -h 127.0.0.1 -U postgres kan78_e2e
cd padelcheck-service; git checkout KAN-78-divisiones; git pull
mvn -DskipTests package
java -jar target/padelcheck-service-0.1.0-SNAPSHOT.jar --spring.profiles.active=local --server.port=8178 `
  --spring.datasource.url=jdbc:postgresql://127.0.0.1:5432/kan78_e2e --spring.datasource.username=postgres --spring.datasource.password=<local> `
  --app.google.enabled=false
# Flyway aplica hasta V36. Después, una sola vez:
psql -h 127.0.0.1 -U postgres -d kan78_e2e -f padelcheck-mobile/docs/visual-validation/KAN-78/tools/seed.sql
```

Seed (`tools/seed.sql`, igual al de padelcheck-fe#23): club FREE «Club Tandil Pádel» (`MAX_DIVISIONS_PER_EVENT = 2`, catálogo
1ra–8va de V13), `admin@kan78.test` (CLUB_ADMIN) y `staff@kan78.test` (CLUB_STAFF), contraseña local `Kan78-local-only`,
sede «Legon» con «Cancha 1» y «Cancha 2». Para el estado vacío del hub: crear un evento por la app y cancelar sus categorías.

**2. Proxy de fallas** (para reintento y recuperación tras error; reenvía al service):

```powershell
$env:SERVICE_PORT=8178; $env:PROXY_PORT=8179; node padelcheck-mobile/docs/visual-validation/KAN-78/tools/fault-proxy.mjs
# modos: curl "http://127.0.0.1:8179/__mode?set=lose-draft"  (también slow, fail-hub, slow-write; "set=" apaga)
```

**3. App** (emulador con aceleración, API 30+):

```powershell
cd padelcheck-mobile; git checkout KAN-78-divisiones; git pull; npm ci
adb reverse tcp:8081 tcp:8081; adb reverse tcp:8179 tcp:8179
$env:EXPO_PUBLIC_APP_ENV="local"; $env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8179/api"
npx expo run:android      # o: cd android; ./gradlew assembleDebug; adb install -r app/build/outputs/apk/debug/app-debug.apk; npx expo start
```

Sin `adb reverse` también sirve `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8179/api`. Capturas: `adb exec-out screencap -p > NN-nombre.png`
en `docs/visual-validation/KAN-78/android/`, comparadas con los frames de la tabla de Figma.

**4. Casos** (evidencia pendiente por caso):

| # | Caso | Pasos y resultado esperado | Figma |
|---|---|---|---|
| A1 | 1→6→éxito→hub | admin: pasos 1–3; paso 4 Combinado Mixto 6ta + 6ta; paso 5 cupo 8, suplentes Sí; agregar Suma 13 Caballeros; «Crear evento» → éxito «Tu evento quedó en borrador» → «Ver evento» → hub con «Mixto · 6ta + 6ta» y «Caballeros · Suma 13». Teclado numérico en cupo y Suma, área segura, pie visible. `GET /clubs/{id}/events/{eid}` → `registrationOpenAt: null` | 3097:34413, 3097:34415, 3097:34417, 3090:33794, 3097:34421 |
| A2 | Reintento sin duplicados | `set=lose-draft`, «Crear evento» → error con datos intactos → «Crear evento» otra vez → éxito. En la DB: `select count(*) from events where name='<nombre>'` = 1; el log del proxy muestra la misma `key=` en ambos POST | 3088:33952, 3088:34054 |
| A3 | Límites admin/staff | FREE: tercera categoría bloqueada en el paso 4 y en el hub; admin ve «Ver plan», staff ve «El administrador del club gestiona el cambio de plan.» sin compra | 2309:9274, 2309:9285 |
| A4 | Editar y cancelar en DRAFT | Editar Combinado B → 7ma: título «Mixto · 6ta + 7ma»; volver a 6ta + 6ta. «Guardar» con Loading (`set=slow-write`). Cancelar una categoría: diálogo, Loading, pasa a «Canceladas», las demás no cambian | 3097:34419, 3097:34423, 3140:51741 |
| A5 | Pull-to-refresh | Hub con datos; hub con contenido corto y hub vacío (indicador visible y termina); gestos repetidos → una sola solicitud por gesto en el log del proxy; `set=fail-hub` → conserva datos y ofrece reintento; `set=` y nuevo gesto → recupera | 3097:34421, 3089:33229, 3089:33580 |
| A6 | Botón Atrás | Atrás de Android en los pasos 2–6 vuelve un paso sin perder datos; durante «Creando evento» (`set=slow-write`) no sale del wizard; en el diálogo de cancelar lo cierra | — |
| A7 | Suma inválida | Suma 17 → «Ingresá un entero entre 2 y 16.» y «Continuar» deshabilitado | 3088:32497 |

