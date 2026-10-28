# KAN-229 — baseline nativo SDK 58

Migración técnica autorizada desde el commit de preservación SDK 54. No incorpora funcionalidades, cambios de diseño ni trabajo de KAN-230.

## Entorno comprobado

- Windows; Node 24.22.1 y npm 10.1.0.
- Expo 58.0.21, React 19.3.0, React Native 0.88.0 y Router 58.0.28.
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

expo-doctor online: **20/20**. Se sigue el catálogo remoto oficial, que la propia CLI prioriza sobre bundledNativeModules para distribuir correcciones: React Native 0.88.0. No hay exclusiones de dependencias ni controles suprimidos. El checkpoint previo con RN 0.88.1 se conserva en su bundle separado.


## Smoke y base Git verificados

El usuario aprobó el smoke final en iPhone 13 Pro Max, iOS 27.2, Expo Go 58.05 informado por usuario, proyecto SDK 58. Se comprobaron apertura, teclado, validación vacía, Design system/Registro con retorno y, después, login existente contra la API demo y navegación autenticada con logout. El footer del login se corrigió mínimamente para mantener Registrarse dentro del viewport.

API demo usada: https://padelcheck-api.onrender.com/api, mediante EXPO_PUBLIC_API_BASE_URL solo en el proceso de Metro, sin .env versionado ni cambios del cliente. Health/login/me dieron 200 desde PC; el usuario confirmó formulario y navegación en dispositivo. No se guardaron tokens o credenciales en evidencia.

Login usa API real y SecureStore. Dashboard y Jugadores son placeholders. Eventos, ubicación, categorías, inscriptos, clasificatorio, cuadro y Mis Torneos usan mocks locales. Perfil es un shell con logout local; no se afirma revocación remota. Registro no tiene submit API. No se confirmaron inscripciones. Reapertura conserva la restauración local existente; no se implementó validación remota de sesión, KAN-126 ni KAN-230.

Base elegida: main. Esta rama importa el snapshot preservado como commit con padre main y luego aplica los commits técnicos. origin/main es ancestro; código final coincide con la migración independiente revisada. No se fusionaron historias independientes, no se modificó el original ni los respaldos SDK 54, y no se hizo push/PR/deploy.

Avisos no bloqueantes observados: ImageBackground deprecado y una declaración de Screen de categoría en el layout padre que apunta a un descendiente anidado; la navegación manual fue aprobada. No se silencian ni se presentan como errores de ejecución.

El usuario pidió conservar la excepción de firewall privada para Node/TCP8099/subred local. La limpieza de la sesión anterior se verificó; en la sesión actual la excepción queda activa y los bloqueos explícitos deshabilitados por esa instrucción. No se afirma limpieza final. Registro completo: docs/refinements/KAN-229-baseline-preservation.md del workspace.

Fuentes oficiales: guía incremental y changelogs Expo 55–58, migraciones Router, NativeWind v4 y compatibilidad Reanimated.

## Evidencia Android posterior a la integración

Ver [smoke Android con development build propia](KAN-229-android-smoke.md), ejecutado sobre origin/main integrado el 28/10/2026. La evidencia de exportación Android anterior queda diferenciada de esta ejecución en emulador.
