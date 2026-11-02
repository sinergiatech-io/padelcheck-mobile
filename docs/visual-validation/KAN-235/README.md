# KAN-235 — native startup verification

Verified 1–2 November 2026 on Android 16/API 36, x86_64 emulator. Branch is based on integrated SDK 58/KAN-126. iOS release verification remains open: the available computer is Windows and the owner has only Expo Go on iPhone, with no Mac/Xcode or EAS project.

## Android release

`assembleRelease` passed. The final APK has an embedded Hermes bundle, uses the demo API, and contains none of the temporary QA aliases, synthetic session fixture or QA API URL. It runs without Metro. This is a local release-mode build using the project's local signing configuration, not a store distribution.

- Clean install/cold start → login; direct public `/design-system` link → UI Kit; background/foreground retains the destination without repeating startup. See [native splash](android/final-cold-1.png), [login](android/final-login.png), [public link](android/final-public-deep-link.png), [warm foreground](android/final-warm.png).
- Native splash compared with [Android 360×800 reference](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3158-18696) at 360×800 logical dp (1080×2400, density 480). Local 432px padded image displayed at 216dp yields the approved 141×139dp mark; dark background, static identity, light system bars. No artificial delay or second animation screen.
- Recovery compared at 402×874 logical dp with [technical recovery](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3158-18441), [repeated failure](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3158-18490), [retry](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3158-18541) and [session unverified](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3158-18591). Logo, court, typography, banner, radii and fixed footer inspected. Runtime bottom inset is 24dp, so the footer uses 48dp total rather than copying the illustrative 58px Figma margin. Loading opacity corrected and recaptured on the final QA revision.

## Directed fault verification

Ten release-mode suites passed with temporary Metro resolver substitutions for SecureStore/fonts/readiness and a local synthetic API. Normal storage still used real native SecureStore. These substitutions and cleartext-network permission were removed before building the final APK. These checks exercise native runtime integration with controlled responses, not a real-backend end-to-end claim.

- Login, persisted session, cold restoration without login flash; slow validation keeps brand until the destination is ready.
- Foreground 503, network interruption and the existing 10-second `/auth/me` deadline retain credentials and block protected content; successful retry restores access.
- Storage rejection/hang, corrupt expiry and failed cache write recover; missing/corrupt cached principal still validates with `/me`.
- Busy retry, repeated error, explicit exit and failed deletion; a failed local cleanup never reports successful logout.
- Font rejection and 5-second font deadline continue with system typography.
- Protected `/my-tournaments` and public `/design-system` deep links; 401 retires access.
- Blocked first layout reaches recovery at the 30-second preparation bound; retry preserves the destination.

Additional checks passed for known expiry/401 and recovery at 360×720dp with font scale 200%: both actions remain reachable, content can scroll. The compact geometry check used the earlier QA APK; its layout is unchanged by the final loading-opacity/logout-transition corrections. See [compact recovery](android/qa-text-200-compact.png).

Representative fault captures: [storage error](android/qa-storage-error.png), [retry](android/qa-retrying.png), [repeated failure](android/qa-repeated.png), [failed exit](android/qa-exit-failed.png), [session unverified](android/qa-session-unverified.png), [font fallback](android/qa-font-fallback.png), [watchdog](android/qa-watchdog.png). These show synthetic QA data only.

## Automated checks and review

`npm run typecheck`, `npm run test:startup` (7), `npm run test:session` (11) and `npm run test:http` (23) passed. Final iOS production Hermes export passed; Expo introspection resolves the splash launch storyboard/plugin. Neither proves an iOS native build or runtime.

Review/Guard: pass, no Critical findings in the diff. Token persistence remains SecureStore; no credentials in evidence/logging, no new endpoints or tenant/permission changes. Restoration remains server-validated, generation-guarded and bounded. Storage failure does not grant access or trigger automatic credential deletion.

Native adaptations were also added to the canonical workspace spec `docs/functional-spec/02-funcionalidades/acceso-a-plataforma.md` (outside this mobile Git repository).

## Open acceptance

- Build and run iOS release; compare 390×844 identity, transition, safe areas, cold/warm session and recovery on iPhone. Expo Go can supplement UI/flow review but cannot validate the system splash.
- Manual TalkBack/VoiceOver listening and announcement/focus order have not been verified. Accessible names, busy/disabled controls, heading focus, live message and scalable layout are implemented; screenshots do not establish screen-reader acceptance.
- No merge/deploy performed. KAN-235 and parent KAN-232 must not be closed as fully accepted while platform verification remains outstanding.
