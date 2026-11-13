# KAN-111 — native verification

Implementation and Android evidence captured on 12 November 2026; publication
review completed on 13 November. The two groups delegated that day, **last usable
venue** and **empty club / first venue**, were executed on the release APK and
passed. The 12 November screenshots and the unit tests do not by themselves
prove those groups; the 13 November section below is the native evidence. iOS
runtime remains expressly excluded; code compatibility remains.

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

## Delegated Android groups — 13 November 2026

Both groups **pass** on device. No product defect was found, so this follow-up
does not change application code. iOS runtime stays **not accredited**. Jira,
merge and deploy stay with the orchestrator.

Runtime APK rebuilt from commit `3af5eb4` at 11:35 ART
(SHA-256 prefix `44D171A64241B810`) because the committed
venue bundles were newer than the 12 November APK. Installed package
`io.sinergiatech.padelcheck.mobile` matches that rebuilt APK. Bundle contains
`http://127.0.0.1:18086/api`. Generated cleartext remains local QA only.
Device: `emulator-5554`, AVD `PadelCheck_API_36`, 1206×2622 px, density 480
(402×874 logical). API from the KAN-111 service checkout on loopback 18086,
schema `kan111_qa` in the isolated `kan111_test` database. Two synthetic club
admins, each with one `CLUB` context, `UNKNOWN` setup and
`MANAGE_CLUB_SETTINGS`. No club selector and no onboarding wizard. ADB reverse
used the forwarding proxy on 18087 for delayed real reads and for the induced
cut; successful responses were not mocked. Reverse was removed afterwards.

### Group A — last usable venue — pass

Fixture: active `Sede Central` with one active court and one individually
inactive court, plus active `Sede Anexo` with no courts.

- Deactivating Anexo shows only the ordinary confirmation. It does not say that
  the last usable infrastructure would be lost. Cancel leaves Anexo `ACTIVE`.
  `android-empty-active-venue-ordinary-confirm.png`.
- Deactivating Central, while Anexo stays active and empty, warns **Es la última
  sede activa con canchas disponibles** and asks for confirmation.
  `android-last-usable-venue-confirm.png`.
- Cancel leaves Central `ACTIVE` and both court rows unchanged in PostgreSQL.
  The venue switch stays on.
- Confirm sets Central `INACTIVE`, records deactivation, keeps `Cancha 1`
  `ACTIVE` and `Cancha Reserva` `INACTIVE`, disables both court switches, and
  hides Agregar cancha. Tapping the disabled active-court switch does not change
  it. `android-last-venue-inactive-detail.png`.
- Reactivating Central clears deactivation, enables both court switches, leaves
  Reserva inactive, and shows Agregar cancha again.
- Pull-to-refresh on the short detail and the short list uses a real venue read.
  The native indicator appears and ends; a second gesture does not duplicate
  rows or keep spinning. Venue and court `updated_at` values do not change.
  `android-last-venue-refresh-indicator.png`,
  `android-last-venue-refresh-settled.png`,
  `android-short-list-refresh-indicator.png`.

`android-deactivate-confirm.png`, the PostgreSQL tests and the web last-venue
capture remain separate and do not replace this group.

### Group B — empty club and first venue — pass

The second account logged in through the real logout/login flow. Its club has
legacy display text and no canonical locality. It has no venues.

- The list is explicitly empty, offers Nueva sede, and shows none of the
  previous club's cards. `android-empty-club-list.png`.
- Repeated pull-to-refresh keeps that empty result, shows a finite indicator
  and does not reset the session. `android-empty-list-refresh-indicator.png`.
- Stopping the forwarding proxy makes the next refresh fail. The screen shows
  **No pudimos cargar las sedes** and Reintentar, keeps the empty copy, and
  does not invent venues. Nueva sede stays disabled while the error is visible.
  `android-empty-list-refresh-error.png`. Restarting the proxy and tapping
  Reintentar returns the valid empty list.
- Nueva sede shows fixed Argentina. Province and locality start empty; the
  legacy city is not substituted. País and locality stay disabled until a
  province is chosen, and Guardar sede stays disabled without a catalog
  locality. `android-empty-club-new-venue.png`.
- Searching `cordoba` finds Córdoba and searching `capi` lists localities, but
  closing either search selects nothing. `android-empty-club-province-search.png`.
- Choosing Córdoba and then Buenos Aires clears the locality and disables save.
  Tandil is then selected from the catalog. The optional point is not confirmed.
  `android-new-venue-ready-without-point.png`. With the keyboard open, the
  focused address and both actions remain visible.
  `android-new-venue-keyboard.png`.
- Save from the APK creates exactly one venue, `LOCALITY_ONLY`, locality
  `06791050`, null latitude and longitude, and no courts. The detail shows the
  success notice, the empty-court message and Agregar cancha.
  `android-first-venue-saved.png`. Back on the list, refresh shows **1 sedes ·
  1 activas** and **0 canchas**. `android-first-venue-list-refresh.png`.

No in-scope correction was required. Orchestrator acceptance, Jira and merge
authorization remain outside this evidence update.
