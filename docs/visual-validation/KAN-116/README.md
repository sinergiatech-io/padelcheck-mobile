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
That run does not certify standalone scheme handling. Opening a replacement
email while verification is mounted recreates its proof state; no stale prior
link is reused.

## Standalone Android release — 02/11/2026

A current-source release APK was built and installed on `emulator-5556`
(`PadelCheck_API_36`). It does not use Expo Go or Metro. Package
`io.sinergiatech.padelcheck.mobile`, scheme `padelcheck`. `cmd package
resolve-activity` selects `io.sinergiatech.padelcheck.mobile/.MainActivity` for
`padelcheck://register/player/verify`. The JS bundle calls the local API at
`http://10.0.2.2:8080/api`. The generated release manifest allows cleartext for
that local API; `android/` stays gitignored and this APK is not a store build.
Launch the installed app with:

```
adb -s emulator-5556 shell am start -n io.sinergiatech.padelcheck.mobile/.MainActivity
```

The synthetic registration used a reserved `example.invalid` address. The
delivered Gmail message for that Android registration contained
`padelcheck://register/player/verify` with the original account email. With the
app in the foreground, the replaced link opened **Enlace no válido** and the
current link opened **Email verificado**. After force-stop, the same current
link cold-started the installed app on **Email verificado**. Activation created
one active player (Damas / 6ta) and login reached **Eventos**. These opens were
Android `VIEW` intents of the URL read from the delivered message. They are not
a tap inside Gmail: the emulator has no Google account, and the agent browser
was signed out. iOS is not verified by this Android evidence.

Status bar inset is 136 px and the navigation bar is 66 px at density 440.
Each is applied once. With the keyboard open, the focused Contraseña field stays
fully above it; the earlier release kept that field covered because the focus
scroll ran before the keyboard inset existed. Scroll still reaches **Crear cuenta**
when the keyboard is closed.

Checks: native typecheck passes. iOS source is included with safe-area and
KeyboardAvoidingView behavior, but iOS device/simulator runtime, keyboard,
visuals and standalone link opening remain unverified on Windows. Do not accept
those AC from Android, web or a bundle export.
