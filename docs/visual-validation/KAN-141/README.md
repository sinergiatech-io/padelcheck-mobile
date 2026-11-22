# KAN-141 — Pantalla nativa de planes (`/pricing`)

**Estas capturas no son evidencia nativa.** Son una vista previa del mismo componente renderizado con
react-native-web (Expo web, Chrome headless, 402 y 360 px) contra un mock local de `GET /plans`, para comparar
layout, tipografía y contenido con los frames aprobados de KAN-140 (`rnweb-preview-cmp-402`: frame a la izquierda).

Pendiente de verificación en dispositivo/emulador:

- Android: no se pudo ejecutar en esta entrega (el entorno no tenía acceso a KVM ni SDK de Android).
- iOS: no verificado; lo verifica Nicolas.
- Pull-to-refresh (RefreshControl no opera en web), swipe/snap horizontal, TalkBack/VoiceOver, safe areas y menú
  con botón atrás de Android requieren prueba en cada plataforma.

Verificado en esta entrega: `tsc --noEmit`, `npm run test:*` (incluye `test:pricing`), y `expo export` de los bundles
Hermes de Android e iOS sin errores.
