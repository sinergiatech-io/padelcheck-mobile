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

## Android: casos pendientes de corrida en dispositivo

Se necesita un dispositivo físico o un emulador con aceleración, con el APK de desarrollo y la API local de service#34:

1. Alta completa 1 → 6 → éxito → hub con varias categorías. Revisar el teclado en los campos de cupo y Suma, el área segura y el pie de pantalla (MN1).
2. Error en la confirmación y reintento sin duplicados (A7 visto desde la app).
3. FREE: la tercera categoría queda bloqueada y un lote Simple que excede el cupo muestra el motivo con las categorías restantes, como admin y como staff.
4. Edición y cancelación de una categoría en DRAFT, con el Loading de Guardar y Cancelar (MN2).
5. Pull-to-refresh del hub (MN3):
   - con datos reales;
   - con contenido corto o en el estado vacío;
   - con gestos repetidos, confirmando que no se duplican solicitudes;
   - después de un error: conserva los datos y ofrece reintento, y un gesto posterior recupera los datos.
6. Botón atrás de Android durante el guardado y en el diálogo de cancelar.
