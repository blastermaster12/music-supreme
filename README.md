# MUSIC SUPREME

A Resso-inspired mobile-first music player starter project.

## Current working features
- Import audio files selected by the user from their device.
- Play/pause, previous/next, seek, shuffle and repeat.
- Search imported tracks.
- Like/favourite tracks.
- Home, Discover, Search, Library and Guest Profile screens.
- Responsive dark purple/blue interface.
- GitHub Actions workflow to build a debug Android APK.

## Build locally
Requires Node.js 20 and Java 17.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
```

Open the generated `android` folder in Android Studio and build a debug APK, or use the GitHub Actions workflow.

## Build APK with GitHub Actions
Push the project to the `main` branch. Open the repository's **Actions** tab, select **Build MUSIC SUPREME APK**, run the workflow (or wait for the push workflow), then download the `music-supreme-debug-apk` artifact from the completed run.

## Important limitations
This starter currently plays audio files that the user imports. It does not include a licensed online music catalogue, cloud streaming, synchronized lyrics provider, account backend, or reliable Android background/lock-screen media controls. Those require additional authorized services and native Android integration. No copyrighted streaming catalogue is bundled.
