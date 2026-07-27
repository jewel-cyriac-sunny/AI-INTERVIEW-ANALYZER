/* Results Service — fetches feedback, scores, and analysis for candidates */

import apiClient from '@/services/apiClient';

export const resultsService = {
  /* Consolidated Results */
  getResults() {
    return apiClient.get('/interviews/results');
  },

  /* Feedback Reports */
  getAllFeedback(candidateId?: string) {
    const query = candidateId ? `?candidate_id=${candidateId}` : '';
    return apiClient.get(`/feedback${query}`);
  },

  getFeedbackById(reportId: string) {
    return apiClient.get(`/feedback/${reportId}`);
  },

  /* Evaluation Scores */
  getAllScores(candidateId?: string) {
    const query = candidateId ? `?candidate_id=${candidateId}` : '';
    return apiClient.get(`/scores${query}`);
  },

  getScoreById(scoreId: string) {
    return apiClient.get(`/scores/${scoreId}`);
  },

  /* Analysis (facial, voice, behaviour) */
  getAllAnalysis(candidateId?: string) {
    const query = candidateId ? `?candidate_id=${candidateId}` : '';
    return apiClient.get(`/analysis${query}`);
  },

  getAnalysisById(analysisId: string) {
    return apiClient.get(`/analysis/${analysisId}`);
  },

  /* Dashboard stats */
  getDashboardStats() {
    return apiClient.get('/dashboard/stats');
  },
};

export default resultsService;
