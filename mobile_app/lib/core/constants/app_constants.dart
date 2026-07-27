
class AppConstants {
  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    
    // Since you are using `adb reverse tcp:8000 tcp:8000` on a physical device,
    // localhost works perfectly on Android.
    return 'http://localhost:8000/api/v1';
  }

  static const String tokenKey = 'auth_token';
}
