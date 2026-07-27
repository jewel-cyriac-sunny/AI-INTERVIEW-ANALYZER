import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/api_client.dart';

final authProvider = ChangeNotifierProvider((ref) => AuthNotifier());

class AuthNotifier extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _apiClient = ApiClient();
  bool _isAuthenticated = false;
  String? _errorMessage;
  String? _userName;
  String? _userEmail;

  bool get isAuthenticated => _isAuthenticated;
  String? get errorMessage => _errorMessage;
  String? get userName => _userName;
  String? get userEmail => _userEmail;

  AuthNotifier() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    if (token != null) {
      _userName = await _storage.read(key: 'user_name');
      _userEmail = await _storage.read(key: 'user_email');
      _isAuthenticated = true;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    _errorMessage = null;
    try {
      final response = await _apiClient.client.post(
        '/auth/candidate/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      final token = response.data['token'] as String;
      final user = response.data['user'] as Map<String, dynamic>;
      _userName = user['name'] as String?;
      _userEmail = user['email'] as String?;
      await _storage.write(key: AppConstants.tokenKey, value: token);
      await _storage.write(key: 'user_name', value: _userName ?? '');
      await _storage.write(key: 'user_email', value: _userEmail ?? '');
      _isAuthenticated = true;
      notifyListeners();
    } on DioException catch (e) {
      if (e.response != null && e.response!.statusCode == 401) {
        _errorMessage = e.response!.data['detail'] ?? 'Invalid credentials';
      } else {
        _errorMessage = 'Network error. Please try again.';
      }
      throw Exception(_errorMessage);
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
    _isAuthenticated = false;
    _errorMessage = null;
    notifyListeners();
  }
}
