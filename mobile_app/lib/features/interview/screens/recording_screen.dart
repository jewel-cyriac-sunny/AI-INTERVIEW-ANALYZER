import 'dart:async';
import 'package:camera/camera.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../services/interview_service.dart';
import 'home_screen.dart';

class RecordingScreen extends ConsumerStatefulWidget {
  const RecordingScreen({super.key});

  @override
  ConsumerState<RecordingScreen> createState() => _RecordingScreenState();
}

class _RecordingScreenState extends ConsumerState<RecordingScreen> {
  CameraController? _controller;
  bool _isInitializing = true;
  bool _isLoadingQuestions = true;
  bool _isUploading = false;
  
  List<Map<String, dynamic>> _questions = [];
  List<String> _expectedKeywords = [];
  
  int _currentQuestionIndex = 0;
  int _timeLeft = 0;
  Timer? _timer;
  bool _interviewStarted = false;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    await Future.wait([
      _initializeCamera(),
      _loadQuestions(),
    ]);
    if (mounted) setState(() => _isInitializing = false);
  }

  Future<void> _loadQuestions() async {
    try {
      final questions = await InterviewService().generateSession();
      final keywords = <String>[];
      for (var q in questions) {
        if (q['keywords'] != null) {
          final List<dynamic> kwList = q['keywords'];
          for (var kw in kwList) {
             keywords.add(kw.toString());
          }
        }
      }
      if (mounted) {
        setState(() {
          _questions = questions;
          _expectedKeywords = keywords;
          _isLoadingQuestions = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load questions: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    final firstCamera = cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );

    _controller = CameraController(
      firstCamera,
      ResolutionPreset.high,
      enableAudio: true,
    );

    try {
      await _controller!.initialize();
    } catch (e) {
      // Handle camera error
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _startInterview() async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (_questions.isEmpty) return;

    await _controller!.startVideoRecording();
    
    setState(() {
      _interviewStarted = true;
      _currentQuestionIndex = 0;
      _timeLeft = _questions[0]['time_limit'] ?? 120;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      
      if (_timeLeft > 0) {
        setState(() => _timeLeft--);
      } else {
        _advanceQuestion();
      }
    });
  }

  void _advanceQuestion() {
    if (_currentQuestionIndex < _questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _timeLeft = _questions[_currentQuestionIndex]['time_limit'] ?? 120;
      });
    } else {
      _timer?.cancel();
      _finishInterview();
    }
  }

  Future<void> _finishInterview() async {
    if (_controller == null) return;
    
    setState(() {
      _isUploading = true;
    });

    try {
      final file = await _controller!.stopVideoRecording();
      await _uploadVideo(file.path);
    } catch (e) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving video: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _uploadVideo(String videoPath) async {
    try {
      final result = await InterviewService().analyzeInterview(videoPath, _expectedKeywords);

      if (mounted) {
        ref.invalidate(recentInterviewsProvider); // Refresh the home screen
        
        final id = result['interview_id'];
        if (id != null) {
          context.replace('/results/$id', extra: result);
        } else {
          context.replace('/home');
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Analysis complete! Check your new report.'),
            duration: Duration(seconds: 4),
          ),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() => _isUploading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: ${e.message ?? 'Unknown error'}'),
            backgroundColor: Colors.red,
          ),
        );
        // Fallback: offer to go back to home on error instead of locking
        Future.delayed(const Duration(seconds: 3), () {
           if (mounted) context.pop();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing || _controller == null) {
      return const Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_isUploading) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              const Text(
                'Processing results using AI...',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 12),
              Text(
                'This may take a few moments depending on video length.',
                style: TextStyle(color: Colors.white70),
              ),
            ],
          ),
        ),
      );
    }

    final String questionText = _interviewStarted && _currentQuestionIndex < _questions.length
        ? _questions[_currentQuestionIndex]['text'] ?? 'Loading question...'
        : 'Get ready for your interview.\n\nYou will be asked ${_questions.length} questions.';

    return Scaffold(
      body: Stack(
        children: [
          // Camera Preview
          SizedBox.expand(
            child: CameraPreview(_controller!),
          ),

          // Gradient overlay for readability
          Positioned.fill(
             child: Container(
               decoration: BoxDecoration(
                 gradient: LinearGradient(
                   begin: Alignment.topCenter,
                   end: Alignment.bottomCenter,
                   colors: [
                     Colors.black.withOpacity(0.7),
                     Colors.transparent,
                     Colors.black.withOpacity(0.7),
                   ],
                   stops: const [0.0, 0.3, 0.7],
                 ),
               ),
             ),
          ),

          // Overlay Content
          SafeArea(
            child: Column(
              children: [
                // Top Bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => context.pop(),
                      ),
                      if (_interviewStarted)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.9),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.timer, color: Colors.white, size: 16),
                              const SizedBox(width: 8),
                              Text(
                                '$_timeLeft s', // Timer
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                
                // Question text display
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 500),
                    child: Container(
                      key: ValueKey<int>(_currentQuestionIndex),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.primary.withOpacity(0.5)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_interviewStarted)
                             Text(
                               'Question ${_currentQuestionIndex + 1} of ${_questions.length}',
                               style: TextStyle(
                                 color: AppTheme.primary,
                                 fontWeight: FontWeight.w600,
                                 fontSize: 14,
                               ),
                             ),
                          const SizedBox(height: 8),
                          Text(
                            questionText,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w500,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                
                const Spacer(),
                
                // Bottom Controls
                Padding(
                  padding: const EdgeInsets.only(bottom: 40),
                  child: _interviewStarted
                      ? const SizedBox() // Emptiness when recording
                      : _isLoadingQuestions
                          ? const CircularProgressIndicator()
                          : ElevatedButton(
                              onPressed: _questions.isEmpty ? null : _startInterview,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
                                backgroundColor: AppTheme.primary,
                                foregroundColor: Colors.white,
                                textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                              ),
                              child: const Text('Start Interview'),
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
