# KAN-109 — Android runtime evidence

Debug APK built and installed on PadelCheck_API_36, Expo SDK 58 with expo-image-picker 58.0.10. Local API/PostgreSQL and a synthetic QA club; 402×874 logical viewport, screenshots at device density 3. The gear overlay belongs to the Expo development client.

Representative captures: information (`android-15-info.png`), geographic search/selection (`android-17-geo-search.png`, `android-18-geo-selected.png`), weekly settings (`android-22-sport.png`), day editor (`android-23-day.png`), saved public preview (`android-24-preview.png`), refresh failure retaining existing data (`android-26-refresh-error.png`).

Runtime checks include real login, geographic selection, framing cancellation and applying/saving an offset of 50%, preview round-trip retaining the institutional draft, day discard, and public refresh with Wi-Fi/data disabled followed by successful retry. The 50% framing uses a synthetic solid image so the crop is easy to inspect; it is not a product asset.

Information, settings, day editor and preview were recaptured after restarting Metro from the physical worktree path with NativeWind active. Earlier auxiliary captures are retained for their unchanged functional states.

iOS runtime and visual acceptance remain pending: no macOS/iOS simulator or connected iOS device is available on this Windows host. Android evidence and typecheck do not accept the iOS AC.
