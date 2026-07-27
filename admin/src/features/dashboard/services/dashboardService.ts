/* Dashboard Service */

import apiClient from '@/services/apiClient';

export interface DashboardStats {
    total_candidates: number;
    total_interviews: number;
    total_questions: number;
    total_sessions: number;
}

export const dashboardService = {
    getStats(): Promise<DashboardStats> {
        return apiClient.get('/dashboard/stats');
    }
};

export default dashboardService;
