# Native button loading

Approved scope: Android/iOS. Web mobile is delivered separately in padelcheck-fe; desktop is excluded.

Pending actions show only ActivityIndicator, with the existing button dimensions/background/radius preserved. The hidden content reserves space and is excluded from accessibility during loading. The button exposes a localized busy label and disabled state, and loading blocks activation even when disabled=false. Reduced motion replaces the indicator with a static arc. Disabled validation/permission states do not show a spinner.

The current login screen and new/edit enrollment reuse Button. Login retains its existing form, account-block restrictions and immediate request lock. Enrollment keeps equal-width actions via px-0 and adds a synchronous ref guard against duplicate requests. The public Design System includes a controlled loading example.

## References

- Jira [KAN-126](https://sinergiatech.atlassian.net/browse/KAN-126), [KAN-53](https://sinergiatech.atlassian.net/browse/KAN-53). This PR does not close the entire scope of either ticket.
- Figma [Button Loading](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-51741), [login](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=1815-6549), [new enrollment](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-51975), [edit enrollment](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-52030).

## Verification — 2026-10-30

On this PR's updated main base: npm run typecheck and npm run test:session pass (10 session tests). Guard lite passes: no dependencies, auth rules, API contracts, credentials or storage changes.

Earlier runtime checks of the same shared Button/enrollment changes used an Expo Go SDK54 checkout on Android16/API36 (1080x2340, density440): stable geometry, spinner-only display, accessible busy/disabled, disabled=false protection, restoration and reduced motion. Edit enrollment with a controlled mock delay accepted two taps as one request and closed successfully. Those checks informed the px-0 correction. This is preliminary evidence and does not certify this PR's SDK58 login adaptation.

The PR adapts the spinner to the current SDK58 login, rather than replacing that screen with the older SDK54 form. Current-runtime verification and iOS limitations are recorded below; no build/typecheck substitutes for visual acceptance. No production API integration was tested for enrollment.

Current SDK58 Android recapture is pending: Expo started with the supported bundled Node runtime, but opening the installed development client failed because the ADB server at 127.0.0.1:5037 did not respond. The SDK54 screenshots above cannot certify this updated login. iOS visual/VoiceOver verification is pending because no iOS simulator/device is available in this Windows environment. New-enrollment pending-request capture on Android also remains open. Review/merge must not be recorded as acceptance of these unverified visual criteria.
