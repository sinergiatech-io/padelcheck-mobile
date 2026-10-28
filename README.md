# Padel Check — Mobile

App Expo (SDK 54) con **NativeWind v4** (mismos tokens que `padelcheck-fe`), **Expo Router**, **Auth** (`SecureStore` + mismo contrato de login que el backend) y pantalla **Design system**.

## Requisitos

- Node.js 20+
- Cuenta Expo / Expo Go o emulador Android / simulador iOS

## Scripts

```bash
npm install
npm run start        # Expo dev server
npm run android
npm run ios
npm run typecheck    # tsc --noEmit
```

## API (backend)

### Comportamiento por defecto (desarrollo)

En `__DEV__`, si **no** definís `EXPO_PUBLIC_API_BASE_URL`, la base se resuelve así:

1. **Expo Go en LAN:** se usa la IP/host del bundler (la de tu PC) vía `expo-constants` (`hostUri` / `debuggerHost`), p. ej. `http://192.168.1.10:8080/api`. Así el iPhone físico no usa `localhost` (que apunta al propio teléfono).
2. **Android emulador:** si no hay host de Expo, fallback `http://10.0.2.2:8080/api`.
3. **iOS simulador:** si no hay host de Expo, fallback `http://localhost:8080/api`.

Al arrancar la app en desarrollo verás en la consola de Metro: `[padelcheck] API_BASE: ...`.

**Importante:** usá conexión **LAN** al iniciar Expo (`npx expo start`), no solo `--tunnel` para el bundler, si querés que la IP del PC sea detectable para el API (o fijá la URL con la variable de entorno abajo).

### Override manual

Creá `.env` en la raíz del proyecto mobile o exportá antes de `expo start`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080/api
```

Útil para túneles (ngrok/cloudflared), otro puerto, o staging.

### Checklist si el login queda “pending”

1. **Misma WiFi** que la PC donde corre Spring Boot.
2. **Expo en LAN** (recomendado para auto-detección) o `EXPO_PUBLIC_API_BASE_URL` con la IP correcta.
3. **Firewall (Windows):** permitir entrada TCP **8080** en red Privada. Verificación en PowerShell (desde otra máquina o sustituyendo por tu IP):

   ```powershell
   Test-NetConnection -ComputerName <IP_PC> -Port 8080
   ```

   Si falla, ejemplo de regla (PowerShell como administrador):

   ```powershell
   New-NetFirewallRule -DisplayName "Spring Boot 8080 LAN" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -Profile Private
   ```

4. **Probar conectividad** desde el iPhone en Safari: `http://<IP_PC>:8080/api/...` (un endpoint que exista en tu API). Si no carga, es red/firewall antes que el código del cliente.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Redirige a `/login` o `/dashboard` según sesión |
| `/login` | Login (Zod + React Query + mismo endpoint `/auth/login` que la web) |
| `/register` | Registro (UI espejo; submit aún sin API) |
| `/dashboard` | Área autenticada (placeholder) |
| `/design-system` | Showcase del UI Kit |

## UI Kit

Componentes en `src/components/ui/` (Button, Input, Card, Form, etc.) con **className** Tailwind alineado al design system del frontend web.
