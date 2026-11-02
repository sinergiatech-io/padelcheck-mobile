# KAN-116 — native verification

02/11/2026. Android API 36 emulator, Expo Go SDK 58, 1080×2340 physical pixels,
density 440 (~393×851 logical units). Reference is KAN-115, including mandatory
Sexo: Figma `2114:9463`, `2125:8665`, `2125:9752`, `2125:10459`, `2125:10759`.
System top/bottom insets differ from the illustrative 51/34 px of the 402×874
reference. Real insets are consumed once; brand uses 124 logical units above the
surface, 72 with keyboard. The native system draws its own bars.

Reviewed comparable form, pending, invalid link, verified and activated states:
Inter, original logo/court, exact exported icons, 56 px fields, 8 px radii,
12/16 px gaps, hierarchy/colors, scrolling and bottom actions. Keyboard capture
and scroll check confirm focus/CTA visibility. Selectors dismiss the keyboard
before opening. Validation errors update as fields are corrected. Busy buttons
have explicit accessible names and no visible text during loading.

`android-results.json` and captures record the actual Android flow with the real
local API, PostgreSQL and local SMTP receiver: login → Jugador → form, mandatory
Sexo, Damas/6ta selection, start, resend, rejection of replaced link, valid email
proof, atomic activation, return to login and successful player login.

Expo Go transports verification links through `exp://host/--/register/player/verify`.
The app's standalone `padelcheck://register/player/verify` configuration is in
`app.json`, but this run does not certify standalone Android/iOS link opening.
Opening a replacement email while verification is mounted recreates its proof
state; no stale prior link is reused.

Checks: native typecheck, HTTP/session tests and the iOS bundle export pass. iOS source is included with
safe-area and KeyboardAvoidingView behavior, but iOS device/simulator runtime,
keyboard, visuals and standalone link opening remain unverified on Windows.
These AC must remain open until actual platform verification; do not accept them
based on Android, web or a bundle export.
