import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../services/interview_service.dart';

final recentInterviewsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final service = InterviewService();
  return service.getInterviews();
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final interviewsAsync = ref.watch(recentInterviewsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Interviews'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildActionCard(
            context,
            title: 'Start New Interview',
            subtitle: 'Record a new practice session',
            icon: Icons.videocam_outlined,
            onTap: () => context.push('/record'),
            isPrimary: true,
          ),
          const SizedBox(height: 24),
          const Text(
            'Recent Sessions',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          ...interviewsAsync.when(
            data: (interviews) {
              if (interviews.isEmpty) {
                return [const Center(child: Text("No recent sessions yet. Start a new interview!"))];
              }
              return interviews.map((interview) {
                final title = interview['interview_type'] ?? 'Interview';
                final dateRaw = interview['interview_date'];
                String dateStr = 'Unknown';
                if (dateRaw != null) {
                  try {
                    final dt = DateTime.parse(dateRaw);
                    dateStr = DateFormat('MMM d, yyyy - h:mm a').format(dt);
                  } catch (_) {}
                }
                
                final scoreVal = interview['score'];
                final score = scoreVal != null ? '${scoreVal.toStringAsFixed(0)} / 100' : 'Pending';
                final id = interview['interview_id'];
                
                return _buildSessionItem(context, title, dateStr, score, id, interview);
              }).toList();
            },
            loading: () => [const Center(child: CircularProgressIndicator())],
            error: (err, stack) => [Center(child: Text('Error: $err'))],
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
    bool isPrimary = false,
  }) {
    return Card(
      color: isPrimary ? AppTheme.primary : AppTheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSessionItem(BuildContext context, String title, String date, String score, String id, Map<String, dynamic> rawData) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        subtitle: Text(
          date,
          style: const TextStyle(color: AppTheme.textSecondary),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: score == 'Pending' ? Colors.orange.withOpacity(0.2) : Colors.green.withOpacity(0.2),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            score,
            style: TextStyle(
              color: score == 'Pending' ? Colors.orange : Colors.green,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        onTap: () => context.push('/results/$id', extra: rawData),
      ),
    );
  }
}
