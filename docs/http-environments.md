# HTTP y ambientes — KAN-230

## Configuración pública

`EXPO_PUBLIC_API_BASE_URL` acepta el origen HTTP(S), con `/api` opcional; se normaliza a un único `/api`. Los métodos reciben rutas como `/auth/me`, sin repetir ese prefijo. Se rechazan credenciales en URL, query, fragmentos y rutas base diferentes. `EXPO_PUBLIC_APP_ENV` admite `local`, `validation` y `production`. Sin marcador, solo un runtime de desarrollo permite fallback local. `validation` exige URL incluso con un servidor de desarrollo. Fuera de desarrollo, `local` tampoco habilita fallback. Errores de configuración detienen la inicialización en vez de consumir localhost silenciosamente.

Copiar `.env.example` a `.env.local` para desarrollo. Variables públicas se incorporan al bundle: **nunca incluir credenciales**. El ejemplo de validación usa `https://padelcheck-api.onrender.com/api`, la API demo compartida. No se desplegó ni se modificó infraestructura. Cambiar las variables requiere reiniciar/reconstruir la app.

```powershell
npm ci
npm run typecheck
npm run test:http
npm run smoke:http
# Antes de construir/exportar para validación:
Copy-Item .env.validation.example .env.local
# Reiniciar Expo si estaba abierto.
# npx expo export --platform android
```

Expo carga `.env.local`; `.env.validation.example` es una plantilla, no un modo cargado automáticamente. También se pueden suministrar EXPO_PUBLIC_APP_ENV=validation y EXPO_PUBLIC_API_BASE_URL en el entorno del proceso de build. Las referencias en constants.ts son estáticas para permitir su inclusión en el bundle.

En modo local se conserva la detección del host LAN de Expo, después Android emulador `10.0.2.2`, y localhost para navegador/iOS simulator. Un dispositivo físico necesita IP LAN de la PC y backend accesible, o la URL HTTPS demo; localhost del dispositivo no es la PC. iOS simulator requiere macOS. No se modifican firewall, adb, Metro ni dispositivos para este ticket.

## Contrato y uso

`apiClient` conserva GET/POST y exporta PUT/PATCH/DELETE. `post/put/patch<T>(path, body?, options?)` serializan JSON; `get<T>(path, options?)` y `delete<T = void>(path, options?)` reciben opciones Fetch. Respuestas vacías/204 resuelven `undefined`: usar `void` cuando corresponda. JSON válido se devuelve sin transformar; texto se conserva; JSON declarado pero inválido en un éxito produce `kind: invalid-response`, con status y cuerpo, sin simular éxito.

`src/lib/api-client.ts` conecta el transporte con el almacenamiento existente: SecureStore asíncrono. Se conserva bearer; se aceptan Headers, tuplas y objetos. Solo se admiten rutas relativas a la API para no enviar el bearer a un host arbitrario. No cambia almacenamiento, login, navegación ni limpieza de sesión.

El tipo `ErrorResponse` refleja el DTO servidor: `timestamp`, `status`, `error`, `message`, `code` opcional y `path`; campos nullable se pueden omitir por Jackson. **No tiene un campo details**. `ApiError.status` es el status HTTP real, `code` conserva el código estable opcional y `details` contiene todo el payload recibido (incluidas propiedades futuras), texto de gateway/JSON inválido o undefined si está vacío. `message` usa el mensaje servidor si es string, con fallback por status. Filtros de seguridad pueden devolver un cuerpo diferente: no asumir que todo error satisface ErrorResponse. No interpretar textos traducibles para decidir lógica de negocio.

`ApiError.kind`: `http`, `network`, `cancelled`, `timeout` o `invalid-response`. Sin respuesta HTTP, `status` vale 0; si falla lectura del cuerpo después de recibir headers se conserva el status recibido. Fallos locales del almacenamiento conservan su error original y no se presentan como error de red.

```ts
const controller = new AbortController()
await apiClient.patch<void>('/resource', { value: 1 }, { signal: controller.signal, timeoutMs: 15000 })
// El tiempo es solo un ejemplo por llamada, no una duración de producto.
controller.abort()
```

## Cancelación y reintentos

`signal` permite cancelar antes o durante fetch/lectura. `timeoutMs` es opcional, positivo y finito (máximo 2147483647); cubre fetch y lectura de cuerpo después de recuperar el token local. No hay timeout global. Temporizador y listener se limpian al finalizar; el timeout no aborta el signal externo. Una cancelación/timeout **no garantiza que el servidor no haya aplicado una escritura**.

El transporte no reintenta ningún método. TanStack Query conserva su reintento existente de consultas (`retry: 1`); mutaciones quedan explícitamente en `retry: false`. No implementar escrituras mediante consultas ni habilitar reintentos de mutación sin una política de idempotencia. 401/403 se entregan al consumidor; invalidación de sesión/routing pertenecen a KAN-126.

## Verificación del 28/10/2026

- Node 24.22.1 para checks, pruebas y smoke. Instalación independiente y reproducible mediante npm ci (npm 10.1.0), repetida con Node 24.22.1 tras detectar que el npm del sistema invocaba inicialmente Node 20.9.0 y emitía avisos de engine. Instalación final compatible, sin cambios de lockfile; ejecutar npm con el mismo runtime compatible en futuras instalaciones.
- 23 pruebas automatizadas contra el transporte/configuración reales compilados por TypeScript, sin cargar almacenamiento navegador/nativo. Casos: métodos, headers/bearer síncrono/asíncrono, 200/204/vacías, 400/401/403/409/422/500 con/sin code, payload íntegro, errores de texto/JSON, red, cancelación, timeout, reintentos y configuración.
- TypeScript mobile aprobado. No hay script lint en el baseline mobile.
- `npm run smoke:http`: transporte real desde Node contra demo, GET `/actuator/health` → UP y GET `/auth/me` sin token → 401 preservado. El timeout de 240 s para health es exclusivo del smoke por cold start; no establece política de producto. No usa cuentas ni credenciales, ni modifica datos.
- Este smoke acredita conectividad/contrato desde Node; no acredita CORS de navegador ni ejecución en dispositivo Android/iOS. El smoke Android concurrente usa otro checkout y no fue intervenido. No se ejecutó nueva validación visual ni de pantallas.

Guard ligero: revisión del diff en ambos repos, sin Critical. Sin cambios de endpoints, roles, tenant, base de datos o secretos. Sin SCA. PR independiente por repositorio; no se cierra Jira ni se hace deploy.
