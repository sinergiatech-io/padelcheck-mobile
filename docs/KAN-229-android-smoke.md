# KAN-229 — smoke Android del resultado integrado

Ejecutado el 28/10/2026, 14:30–14:44 ART. Resultado: development build propia compilada e instalada; smoke público, login real, navegación autenticada y logout aprobados en el AVD indicado. Esta evidencia Android es independiente del smoke anterior en iPhone 13 Pro Max.

## Referencia y aislamiento

Clon nuevo de origin/main actualizado mediante fetch, con el merge de la PR #1. Rama de revisión: KAN-229-android-development-smoke. El commit probado se registra al final; los commits documentales posteriores no cambian el runtime probado.

Directorio final: D:/Code/PadelCheck/a229. Inicialmente estaba en .worktrees/KAN-229-android-smoke; se trasladó exclusivamente este clon para reducir rutas C++ en Windows. No se usaron ni modificaron el checkout original, respaldos protegidos, checkouts/ramas/procesos de KAN-230. No hubo merge, deploy, publicación en tiendas ni transición Jira.

## Dispositivo y runtime comprobados

- Host: Windows 10 build 19045, PowerShell. Node portable 22.21.0, npm 10.1.0; JDK Microsoft 21.0.7 seleccionado para esta build.
- Android Studio: D:/Android/Android Studio, build AI-262.9437.185.2621.16467767. Se abrió únicamente el proyecto android de este clon; build mediante su wrapper Gradle.
- SDK: D:/Android/Sdk. adb 1.0.41 / platform-tools 37.0.1; Emulator 37.2.12.0 instalado.
- AVD: PadelCheck_API_36; serial emulator-5554; perfil Pixel 5, x86_64, 1080x2340, densidad 440, Android 16/API 36, imagen Google APIs.
- Build: Gradle 9.4.1, AGP 9.2.1, compileSdk 37, targetSdk 36, minSdk 24; Build Tools 37.0.0; NDK 27.1.12297006; CMake 3.31.6/Ninja 1.12.1. Herramientas faltantes instaladas en paralelo en el SDK existente. No se actualizó Expo SDK.
- App: Expo 58.0.21, React 19.3.0, RN 0.88.0, expo-dev-client 58.0.17, Hermes/nueva arquitectura.
- Paquete instalado: io.sinergiatech.padelcheck.mobile, 1.0.0, versionCode 1, DEBUGGABLE, ABI x86_64. Expo Go no interviene.
- APK: android/app/build/outputs/apk/debug/app-debug.apk, 92.498.325 bytes. Artefacto local, sin versionar ni distribuir.

## Cambios mínimos revisables

Se agrega expo-dev-client compatible con SDK 58 y lockfile, android.package y el script android con expo run:android. No cambia código funcional ni el SDK. android/ se genera y permanece ignorado. La API demo usa la variable existente EXPO_PUBLIC_API_BASE_URL solo en el proceso Metro; no hay .env versionado ni trabajo de KAN-230.

## Resultados observados

- **Arranque/Login — PASS:** APK instalada con adb install (Success), bundle Android de 3807 módulos, formulario y enlaces visibles. Captura [Login](evidence/KAN-229-android/login-stable.png).
- **Teclado — PASS:** foco y escritura en Email, teclado en pantalla, pulsación real de tecla y Done para ocultarlo. Texto sintético smoke → smokee; sin credenciales. El AVD usa Gboard flotante y barra de escritura. Captura [teclado](evidence/KAN-229-android/keyboard-typed.png). Se observó también teclado completo en el primer arranque; no se certifican todas las configuraciones posibles de IME.
- **Validación vacía — PASS:** Entrar sin datos muestra «Email inválido» y «La contraseña es obligatoria». [Captura](evidence/KAN-229-android/empty-validation.png).
- **Design system y retorno — PASS:** apertura desde Login, colores, scroll a tipografía/botones, Back Android a Login. [Captura](evidence/KAN-229-android/design-system-scroll.png).
- **Registro y retorno — PASS:** enlace Registrarse dentro del viewport, formulario completo visible, retorno mediante Iniciar sesión. No se pulsó Crear cuenta. [Registro](evidence/KAN-229-android/register.png), [retorno](evidence/KAN-229-android/register-return.png).
- **Login real — PASS tras cold start:** envío de credenciales demo desde el formulario existente contra https://padelcheck-api.onrender.com/api y entrada a Eventos autenticados. No se inyectó sesión ni se sustituyó el endpoint por un mock. Health, login y auth/me habían dado 200 desde PC; después del cold start, health volvió a 200 y Android mostró status UP. [Health Android](evidence/KAN-229-android/health-wakeup.png), [entrada autenticada](evidence/KAN-229-android/events-clean.png). No se capturaron campos con credenciales ni tokens.
- **Eventos — PASS de navegación con datos MOCK:** listado → Open de Otono → categoría Caballeros 1 → Inscripciones, Clasificatoria, Cuadro y Partidos. Solo lectura; no se pulsó Inscribirse, Editar o Eliminar. [Categoría](evidence/KAN-229-android/category.png), [clasificatoria](evidence/KAN-229-android/qualifier.png), [cuadro](evidence/KAN-229-android/brackets.png), [partidos](evidence/KAN-229-android/matches.png).
- **Mis Torneos — PASS de navegación con datos MOCK:** pestañas Activos e Historial. [Activos](evidence/KAN-229-android/my-tournaments.png), [historial](evidence/KAN-229-android/my-history.png).
- **Jugadores/Perfil — PASS de navegación a placeholders existentes:** Jugadores «En construcción»; Perfil con acción local de cierre de sesión. [Jugadores](evidence/KAN-229-android/players.png), [Perfil](evidence/KAN-229-android/profile.png).
- **Logout — PASS:** Cerrar sesión desde Perfil vuelve a Login con campos vacíos; force-stop/reapertura sigue en Login, sin Eventos autenticados. No acredita revocación remota. [Captura](evidence/KAN-229-android/logout.png).

## API real, mocks y pendientes preservados

Login hace POST /auth/login real y almacena la sesión con SecureStore. La restauración lee almacenamiento local y no valida auth/me en la app. Logout limpia la sesión local. El GET auth/me citado arriba corresponde al probe desde PC, no a una nueva integración móvil.

Eventos, ubicación, detalle/categorías, inscriptos, clasificatorio, cuadro y Mis Torneos usan servicios/mock-data locales. Registro no tiene submit API; Design system es showcase; Jugadores y Dashboard son placeholders; Perfil es shell con logout. No se crearon cuentas ni confirmaron inscripciones.

Dashboard se clasificó por inspección de fuente; no se acredita su ejecución Android: no tiene tab visible y los intentos URI padelcheck://dashboard / padelcheck:///dashboard retornaron a Eventos. La navegación autenticada observada se detalla arriba. Tampoco se declara probado el selector de ubicación o el formulario de inscripción. No se amplió implementación para cubrirlos.

## Incidencias y clasificación

1. **Entorno de build Windows, resuelto:** Ninja 1.10.2 de CMake 3.22.1 falló primero en Worklets (mkdir) y luego en codegen de Gesture Handler («Filename longer than 260 characters»). P: mediante subst e init script CMAKE_OBJECT_PATH_MAX=128 no resolvieron. Ruta física corta permitió avanzar, pero la solución efectiva fue CMake 3.31.6/Ninja 1.12.1. LongPathsEnabled ya era 1; solo se leyó el registro. No se reemplazó Ninja anterior ni se cambió Gradle global. Se limpiaron únicamente salidas android/app y .cxx generadas del clon propio. [Guía oficial Expo](https://docs.expo.dev/troubleshooting/windows-long-paths/).
2. **Entorno/API demo, resuelto para el smoke:** después de más de 15 minutos de compilación, la demo volvió a dormir. El primer login quedó esperando; Chrome Android mostró Render Service waking up. Se esperó health UP y se repitió el formulario. Sin deploy/reinicio ni cambios del servicio. El cliente existente no tiene timeout explícito: la espera prolongada es una limitación preservada, no se atribuye una regresión sin comparación Android anterior.
3. **Conexión Metro, resuelta:** desapareció el reverse 8109 durante la sesión (causa no comprobada). Metro seguía respondiendo HTTP 200 en PC; el cliente mostró ConnectException al reabrir. Se repuso únicamente adb reverse tcp:8109 tcp:8109 y se reinició solo esta app. No se tocó firewall.
4. **Avisos existentes, no bloqueantes en recorridos probados:** ImageBackground deprecado y declaración de Screen de categoría anidada. LogBox mostró una franja de aviso sin texto legible; se cerró visualmente, sin suprimir logs. Los avisos de Gradle/AGP/Kotlin y expo-system-ui ausente no bloquearon la build final. Se mantuvo RN 0.88.0 aunque el prebuild sugiere 0.88.1; Expo Modules compiló desde fuentes por incompatibilidad del prebuilt con ese parche.
5. **Límites visuales observados:** barra de estado clara sobre pantallas públicas claras y contenido de Design system que pasa bajo la barra al hacer scroll. No se hace una aprobación global de safe area/fidelidad visual ni se atribuye una regresión a SDK 58 sin baseline Android. El formulario Login/Registro y sus acciones probadas sí fueron accesibles.
6. **Herramienta de captura Windows:** computer-use agotó tiempo al capturar emulador/Studio. Se continuó con adb, capturas nativas Android y uiautomator por PTY /dev/tty en memoria. Se filtraron etiquetas y se vaciaron campos antes de capturar el primer login pendiente; no se guardaron dumps de formularios autenticados con secretos.

No se identificó una regresión funcional bloqueante en los recorridos solicitados. Los pendientes de producto anteriores continúan pendientes.

## Reproducción y comandos efectivos

Usar una copia nueva y ruta corta. Elegir Node/JDK en el proceso; no modificar los checkouts existentes.

```powershell
git clone --single-branch --branch KAN-229-android-development-smoke https://github.com/sinergiatech-io/padelcheck-mobile.git <copia-nueva>
git switch -c <rama-propia>
git fetch origin main
npm ci --no-audit --no-fund
# En esta rama ya está instalado/configurado expo-dev-client:
npx expo prebuild --platform android --no-install
npm run typecheck -- --incremental false
npx expo install --check
npx expo-doctor
$env:ANDROID_HOME='D:/Android/Sdk'
$env:JAVA_HOME='C:/Users/Nicky/.jdks/ms-21.0.7'
$env:GRADLE_USER_HOME='D:/Code/PadelCheck/.tmp/KAN-229-gradle'
# PATH del proceso debe incluir Node compatible y JAVA_HOME/bin.
cd android
./gradlew.bat :app:assembleDebug '-PreactNativeArchitectures=x86_64' '-Pandroid.cmakeVersion=3.31.6' --console=plain --no-daemon
cd ..
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
$env:EXPO_PUBLIC_API_BASE_URL='https://padelcheck-api.onrender.com/api'
npx expo start --dev-client --localhost --port 8109
# Otra terminal:
adb -s emulator-5554 reverse tcp:8109 tcp:8109
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'exp+padelcheck-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8109' io.sinergiatech.padelcheck.mobile
```

Instalación CMake efectiva en PowerShell (el delimitado importa):

```powershell
cmd /d /s /c '"D:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root=D:\Android\Sdk "cmake;3.31.6"'
```

La primera instalación de dev-client se hizo con npx expo install expo-dev-client. Prebuild cambió automáticamente el script iOS: se restituyó a expo start --ios antes de compilar/commitear. Los primeros argumentos de sdkmanager/Gradle no llegaron correctamente desde PowerShell; se verificaron binarios y se usaron los comandos delimitados anteriores. No se consideran aprobados esos intentos.

Caché exclusiva .tmp/KAN-229-gradle, con gradle.properties local (CMake 3.31.6, x86_64 y JDK21) para abrir este proyecto en Studio; no se modificó ~/.gradle ni variables de usuario. La unidad P: temporal se retiró.

## Validaciones y evidencia local

- npm ci estándar: 644 paquetes, exit 0; instalación dev-client: exit 0.
- TypeScript: exit 0; Expo install --check: alineado; expo-doctor: 20/20.
- Gradle final: exit 0, BUILD SUCCESSFUL, 3m1s, 482 tareas.
- git diff --check satisfactorio. Guard lite sobre el diff: pass, sin Critical; sin cambios de endpoints, tenant/authz, validación o almacenamiento de tokens. Sin SCA ni audit fix.
- Logs locales: D:/Code/PadelCheck/.tmp/KAN-229-android-evidence. build-ninja112.log es la build aprobada; build.log, build-short-path.log, build-cmake-path.log, build-physical-short.log y build-final.log documentan intentos fallidos. metro-final.log corresponde al smoke final. Solo las capturas seleccionadas se versionan; APK/cachés/logs completos quedan locales.
- Fuente de flujo local: [Expo development builds](https://docs.expo.dev/guides/local-app-development/). Compatibilidad: [SDK 58](https://docs.expo.dev/versions/v58.0.0/).
Base integrada origin/main: da804f1fc2953d939fdd4070adc43150d3501c3f
Commit exacto de código/configuración probado: 63e5e3a27935e6622a5035c66f13a7295c4a8592
