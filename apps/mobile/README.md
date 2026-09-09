# Mkulima Link Mobile

Role-aware Flutter app for Android and iOS. The UI is Swahili-first and supports buyer and seller registration, market prices, demands, orders, wallets, profiles, and notifications.

## Requirements

- Flutter matching `pubspec.yaml` (Dart 3.12 or newer)
- Android Studio/Android SDK for Android builds
- Xcode, CocoaPods, an Apple developer team, and a physical device for iOS push testing
- A running Mkulima Link API

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3111
```

`API_BASE_URL` defaults to `http://10.0.2.2:3111`, suitable for an Android emulator. Use `http://127.0.0.1:3111` for an iOS simulator or an HTTPS/LAN endpoint for a physical device. Production builds must point to HTTPS:

```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.example.tz
flutter build ipa --release --dart-define=API_BASE_URL=https://api.example.tz
```

## Firebase

Android package: `tz.mkulima.mkulima_app`. `android/app/google-services.json` contains the supplied Firebase Android client configuration. Restrict its API key to the Android package and release signing certificate in Google Cloud. Do not add a Firebase Admin service account to the mobile application.

For iOS, register the final bundle ID in the same Firebase project, download `GoogleService-Info.plist`, add it at `ios/Runner/GoogleService-Info.plist`, and add that file to the Runner target in Xcode. Enable Push Notifications and Background Modes > Remote notifications, then upload an APNs key/certificate in Firebase. The plist is intentionally gitignored.

Firebase initialization is best-effort. If either client configuration is missing or invalid, authentication and marketplace features continue to work; push registration is skipped. When available, the app requests notification permission, registers the FCM token with the API, registers refreshed tokens, unregisters the current token on logout, and displays foreground messages through a high-priority local notification channel. Background messages use the Firebase system notification behavior.

## Authentication

Phone input is normalized to Tanzanian E.164 (`+255XXXXXXXXX`). A new account verifies OTP, consumes its registration access token during role-specific onboarding, clears registration credentials, and asks the user to log in again. Normal access and rotating refresh tokens are held in platform secure storage. Dio retries one time after a serialized 401 refresh. Buyers awaiting approval can browse their account but cannot create demands.

## Release Signing

Android debug builds use the debug key. For release, create a private upload keystore outside source control, create `android/key.properties`, and replace the temporary debug `signingConfig` in `android/app/build.gradle.kts` with a release signing config before Play submission. Keystores and `key.properties` are ignored.

For iOS, select the production team, bundle ID, signing certificate, and provisioning profile in Xcode. Never commit `.p12`, provisioning profiles, APNs private keys, Firebase Admin credentials, or service-account JSON.

## Quality Checks

```bash
dart format lib test
flutter analyze
flutter test
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3111
```
