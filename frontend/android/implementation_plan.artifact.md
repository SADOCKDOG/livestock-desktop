# Implementation Plan: Fix Android 16 KB Page Size Alignment

The app is reporting a compatibility issue with 16 KB page size devices due to `libimage_processing_util_jni.so` (part of ML Kit) not being 16 KB aligned. This is a requirement for apps targeting Android 15 (API 35) or higher.

## User Review Required

> [!IMPORTANT]
> This fix uses the `useLegacyPackaging = true` workaround. This means native libraries will be compressed in the APK and extracted at installation time. While this resolves the 16 KB compatibility issue for Play Store, it slightly increases the disk space used by the app on the device.

## Proposed Changes

### Build Configuration

#### [MODIFY] [build.gradle](file:///C:/Users/yo/repo/LIVESTOCK-MANAGER/android/app/build.gradle)

Add the `packaging` block to ensure native libraries are compressed and extracted, avoiding the 16 KB alignment requirement for uncompressed libraries in the APK.

## Verification Plan

### Automated Tests
- Build the APK and verify the alignment using `zipalign`:
  ```bash
  ./gradlew :app:assembleDebug
  # Run from Android SDK build-tools 35.0.0+
  zipalign -c -P 16 -v 4 app-debug.apk
  ```

### Manual Verification
- Deploy the app to an Android 15 emulator with 16 KB page size support.
- Verify the app launches and the barcode scanner works correctly.
