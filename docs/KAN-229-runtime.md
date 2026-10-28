# KAN-229 — baseline nativo SDK 58

Migración técnica autorizada desde el commit de preservación SDK 54. No incorpora funcionalidades, cambios de diseño ni trabajo de KAN-230.

## Entorno comprobado

- Windows; Node 24.22.1 y npm 10.1.0.
- Expo 58.0.21, React 19.3.0, React Native 0.88.1 y Router 58.0.28.
- NativeWind 4.2.7 / css-interop 0.2.7, Tailwind 3; Reanimated 4.7.1 / Worklets 0.13.0.
- TypeScript 6.0.3 y babel-preset-expo 58.0.22.

Con Node compatible seleccionado, ejecutar desde una copia nueva:

```powershell
npm ci --no-audit --no-fund
npm run typecheck -- --incremental false
npx expo install --check --offline
npx expo start --go --lan --clear
```

No requiere legacy-peer-deps. No ejecutar npm audit fix, expo install --fix ni actualizar dependencias al restaurar: el lockfile es la referencia reproducible. No se requiere una API para mostrar rutas públicas; sí para login real.

## Compatibilidad y validaciones

Se pasó incrementalmente por SDK 55, 56 y 57, con checkpoints de Git y validación TypeScript/Expo antes de SDK 58. En SDK 56 se validó también exportación iOS. SDK 58 pasó instalación limpia estándar, TypeScript, chequeo de versiones offline y exportaciones iOS/Android. Bundling no acredita ejecución en dispositivo.

Cambios mínimos: aliases TypeScript sin baseUrl deprecado, referencias de componentes usando ComponentRef, ColorValue en iconos, hook de foco importado de Router, absoluteFill en lugar de API retirada y adaptación del callback de formulario al tipo de evento nativo. La configuración legacy splash pasa al plugin oficial conservando asset, fondo y resizeMode. Expo Go no reproduce exactamente la splash de una app distribuida.

expo-doctor online: **19/20**, no todo pasa. El catálogo remoto recomienda React Native 0.88.0; bundledNativeModules.json de expo 58.0.21 exige 0.88.1 y el chequeo offline pasa con 0.88.1. Se conserva la versión indicada por el paquete instalado; no se añadieron exclusiones para ocultar el desacuerdo. Debe reevaluarse este punto antes de declarar el ticket completo.

## Smoke y Git pendientes

Dispositivo acordado: iPhone 15 Pro Max, iOS 27.2, Expo Go 58.05 informado por el usuario (cliente SDK 58). Pendiente observación manual de apertura, login/registro/Design system, teclado, safe area, retorno y rutas existentes. Login usa API real; registro aún no tiene submit API; listados/torneos incluyen mocks y hay placeholders. No atribuir integración funcional a una pantalla que solo abre.

main publicada y baseline no comparten ancestro común. No se integraron historias ni se publicó rama/PR. La base compartida y su estrategia de traslado siguen pendientes. El snapshot SDK 54, su commit y bundle se conservan fuera de este repo; ver registro de recuperación del workspace en docs/refinements/KAN-229-baseline-preservation.md.

Fuentes oficiales: guía incremental y changelogs de Expo 55–58, migraciones Router 55→56/57→58, documentación NativeWind v4 y tabla Reanimated. Las dependencias nativas se alinearon con el conjunto de versiones de cada SDK, sin migrar a NativeWind 5.
