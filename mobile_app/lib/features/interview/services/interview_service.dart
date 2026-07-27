import 'dart:convert';
import 'package:dio/dio.dart';
import '../../../core/services/api_client.dart';

class InterviewService {
  final Dio _dio = ApiClient().client;

  /// Fetches a randomized session of 5 questions for the candidate
  Future<List<Map<String, dynamic>>> generateSession() async {
    final response = await _dio.get('/candidate/questions/generate-session');
    return (response.data as List).map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// Uploads a video file to the /analyze-interview endpoint and returns
  /// the analysis result map. Now includes expectedKeywords for ML pipeline.
  Future<Map<String, dynamic>> analyzeInterview(String videoPath, List<String> expectedKeywords) async {
    final formData = FormData.fromMap({
      'video': await MultipartFile.fromFile(
        videoPath,
        filename: videoPath.split('/').last.split('\\').last,
      ),
      'expected_keywords': jsonEncode(expectedKeywords),
    });

    final response = await _dio.post(
      '/analyze-interview',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        // The backend ML models may take significant time to transcribe audio 
        // and evaluate landmarks. We provide a long receiveTimeout.
        receiveTimeout: const Duration(seconds: 300),
        sendTimeout: const Duration(seconds: 60),
      ),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }

  /// Fetches all interviews logic for the candidate
  Future<List<Map<String, dynamic>>> getInterviews() async {
    final response = await _dio.get('/auth/candidate/interviews');
    return (response.data as List).map((e) => Map<String, dynamic>.from(e)).toList();
  }
}
