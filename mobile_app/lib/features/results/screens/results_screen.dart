import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';

class ResultsScreen extends ConsumerWidget {
  final String interviewId;
  final Map<String, dynamic>? interviewData;

  const ResultsScreen({super.key, required this.interviewId, this.interviewData});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = interviewData ?? {};
    final rawScore = data['score'];
    final overallScore = rawScore != null ? (rawScore as num).toInt() : 0;
    
    final fillerWords = data['filler_words'] as int? ?? 0;
    final blinks = data['blinks'] as int? ?? 0;
    final poorPosture = data['poor_posture'] as bool? ?? false;
    final keywordScore = data['keyword_score'] != null ? (data['keyword_score'] as num).toInt() : 100;
    final reportUrl = data['report_url'] as String?;

    // Internal UI calculations mappings from raw metrics
    int keywordAccuracy = keywordScore;
    int speechClarity = (100 - (fillerWords * 5)).clamp(0, 100);
    int eyeContact = (blinks >= 5 && blinks <= 25) ? 100 : (blinks > 25 ? (100 - (blinks - 25) * 4) : 70).clamp(0, 100);
    int bodyLanguage = poorPosture ? 40 : 100;
    int confidence = ((speechClarity + bodyLanguage + eyeContact) ~/ 3);

    final feedback = "Based on your latest session: you used $fillerWords filler words, blinked $blinks times, and had ${poorPosture ? 'suboptimal' : 'great'} posture. You hit $keywordAccuracy% of expected keywords. See your personalized tips in the full PDF report!";

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analysis Results'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildCircularScoreCard(overallScore),
            const SizedBox(height: 32),
            const Text(
              'Detailed Breakdown',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            _buildCategoryScore('Keyword Accuracy', keywordAccuracy, Colors.purple),
            _buildCategoryScore('Speech Clarity', speechClarity, Colors.green),
            _buildCategoryScore('Eye Contact', eyeContact, Colors.orange),
            _buildCategoryScore('Body Language', bodyLanguage, Colors.teal),
            _buildCategoryScore('Confidence', confidence, Colors.blue),
            const SizedBox(height: 32),
            const Text(
              'AI Feedback',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Text(
                feedback,
                style: const TextStyle(
                  fontSize: 16,
                  height: 1.5,
                  color: AppTheme.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () async {
                if (reportUrl != null && reportUrl.isNotEmpty) {
                  // Replace localhost with 127.0.0.1 as Chrome sometimes prefers it
                  String safeUrl = reportUrl.replaceAll('localhost', '127.0.0.1');
                  final uri = Uri.parse(safeUrl);
                  try {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } catch (e) {
                     if (context.mounted) {
                        Clipboard.setData(ClipboardData(text: safeUrl));
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text('Could not launch browser. Link copied to clipboard!\n$safeUrl'),
                          duration: const Duration(seconds: 4),
                        ));
                     }
                  }
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Report not available yet.')),
                  );
                }
              },
              icon: const Icon(Icons.picture_as_pdf),
              label: const Text('Download Full PDF Report', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCircularScoreCard(int score) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text(
            'Overall Score',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 160,
            width: 160,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CircularProgressIndicator(
                  value: score / 100,
                  strokeWidth: 16,
                  backgroundColor: AppTheme.surfaceHighlight,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    score >= 80 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red),
                  ),
                  strokeCap: StrokeCap.round,
                ),
                Center(
                  child: Text(
                    '$score',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: (score >= 80 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red)).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              score >= 80 ? 'Excellent' : (score >= 50 ? 'Good' : 'Needs Improvement'),
              style: TextStyle(
                color: score >= 80 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryScore(String label, int score, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                '$score%',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          LinearProgressIndicator(
            value: score / 100,
            backgroundColor: AppTheme.surfaceHighlight,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            borderRadius: BorderRadius.circular(8),
            minHeight: 12,
          ),
        ],
      ),
    );
  }
}
