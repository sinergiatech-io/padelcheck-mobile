# KAN-111 — native verification

Implementation and Android evidence captured on 12 November 2026; publication
review completed on 13 November. This delivery remains pending the two Android
groups delegated by the user: **last usable venue** and **empty club / first venue**.
Neither is accepted by the screenshots or unit tests below. iOS runtime is
expressly excluded by the user's resource decision; code compatibility remains.

## Build and environment

Short checkout: `D:/Code/PadelCheck/n111`, branch `KAN-111-venues-courts`, base
`main`. APK: `android/app/build/outputs/apk/release/app-release.apk` (local QA,
x86_64 only). Emulator: `emulator-5554`, AVD `PadelCheck_API_36`, 1206×2622 px,
density 480 (402×874 logical pixels). No store publication or deployment.

Node 24.22.1; Android SDK `D:/Android/Sdk`; Gradle wrapper from the generated
project. Build from `android/` in PowerShell, quoting dotted Gradle properties:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:18086/api'
$env:EXPO_PUBLIC_APP_ENV='local'
$env:NODE_ENV='production'
./gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=x86_64' '-Pandroid.cmakeVersion=3.31.6' --console=plain
```

The generated, untracked Android manifest enabled cleartext **only for local QA**.
That override and the generated Android project are not committed. A clean
prebuild must recreate this local-only override to use loopback HTTP, or use a
proper HTTPS QA API. No production network policy changed.

The actual API ran from the KAN-111 service checkout on loopback 18086, backed by
the isolated `kan111_qa` PostgreSQL schema. Synthetic accounts/club data only.
ADB reverse linked the device's 18086 port to the local API. For transport
failure/loading cases, a loopback 18087 proxy forwarded real API responses with
Connection: close and an optional one-shot delay; successful responses were not
mocked. This avoids an existing keep-alive connection hiding an induced outage.
Ports, processes, emulator state and fixtures must be rediscovered before reuse.

## Runtime evidence

- `android-mi-club.png`, `android-list.png`, `android-detail.png`: authenticated
  club entry, real venue list/detail and exact exported SVG assets. Mi Club exposes
  Sedes y canchas and Reglas de categorías; other entries keep their owners.
- `android-new-court.png`, `android-saving-court.png`, `android-court-saved.png`:
  actual court creation, loading with invisible text and stable button appearance,
  and success after returning. A controlled transport delay allowed a double tap;
  PostgreSQL confirmed exactly one new court.
- `android-court-keyboard.png`: final safe-area adjustment leaves the focused
  name and both form controls visible above the keyboard.
- `android-discard-confirm.png`: system Back opens discard confirmation. Cancel
  preserves the edited draft; discard returns without changing the saved name.
- `android-deactivate-confirm.png`: ordinary venue deactivation; individual court
  switches stayed active but disabled/unusable while the venue was inactive.
  Reactivation and server persistence were also exercised. This screenshot does
  **not** prove the last-venue warning.
- `android-province-search.png`: searching `cordoba` finds Córdoba without an
  accent. Choosing another province clears locality and disables invalid save.
  Real dependent locality search/selection and manual saving without a point
  were exercised (`android-manual-location-saved.png`).
- `android-map-selected-point.png`: real OSM map, explicit point selection and
  enabled confirmation. Earlier confirmation/save was checked in PostgreSQL as
  `ADMIN_CONFIRMED`; manual province/locality replacement cleared that old point.
  Merely marking and cancelling the map leaves the editor unchanged (save disabled).
- `android-map-provider-error.png`: WiFi/data were temporarily disabled before
  opening an uncached locality. The finite timeout showed retry/cancel and kept
  point confirmation disabled. Connectivity was restored; real retry loaded tiles
  and point selection worked. No administrator GPS permission is requested.
- `android-refresh-real-data.png`: pull-to-refresh applied a change saved through
  web without leaving the detail. `android-refresh-error-preserves-data.png`:
  induced API transport failure retained the persisted venue/court, showed retry
  and ended the native indicator; real retry recovered. The detail is short
  content. The empty-list refresh case remains delegated.

Figma file `6ChpVD5gKDoC3kRXoGdVdK`: list `659:3817`, detail `2381:23759`, court
`2382:23085`, venue location `3260:36516`; scoped Mi Club `3306:38161`; map states
`3309:38234`, `3309:38260`, `3309:38287`, `3309:38311`. Compared at equivalent
logical size. System bars use actual insets, not the illustrative Figma bar.
Native selectors use searchable modals; the map uses a full modal with variable
provider content. Web has independent browser evidence in its PR.

## Review and Guard

Checks: 11 venue-model tests, 11 session/access tests and TypeScript pass.
The final release APK built successfully; no iOS runtime claim is made.

Guard lite: **pass, no Critical findings** in the native diff. Club identity and
permission come from the existing authenticated context; requests and parsed
responses validate their parent club/venue. State cancels stale tenant/catalogue
reads and refreshes predating a write. Server checks remain authoritative.
No JWT storage/logging pattern was changed. Map HTML embeds only validated numeric
coordinates and locally bundled Leaflet 1.9.4; no user text, auth headers or tokens
enter that HTML. CSP and navigation allowlisting restrict the WebView. Only OSM
copyright navigation opens externally; messages must contain finite valid points.
No remote JavaScript, upload, database migration or production HTTP exception.
Leaflet's BSD license is included. OSM attribution and normal caching remain;
there is no offline/bulk tile download or guaranteed provider availability.

Release SVG URI loading failed in initial QA and was corrected by bundling the
unchanged exported SVG XML (`build:venue-icons`). `build:venue-map` regenerates
the pinned SDK bundle. Generated assets were checked against their generators.

Remaining acceptance: the two delegated Android groups, their evidence and any
in-scope corrections. Then the orchestrator consolidates Jira and requests merge
authorization for backend, web and mobile. Creating the PR is not ticket closure.
