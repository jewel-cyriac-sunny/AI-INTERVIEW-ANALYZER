/* Interview Service — CRUD for interviews */

import apiClient from '@/services/apiClient';

export const interviewService = {
    getAll(candidateId?: string) {
        const query = candidateId ? `?candidate_id=${candidateId}` : '';
        return apiClient.get(`/interviews${query}`);
    },

    getById(id: string) {
        return apiClient.get(`/interviews/${id}`);
    },

    create(data: { interview_date: string; interview_type: string; candidate_id: string }) {
        return apiClient.post('/interviews', data);
    },

    update(id: string, data: Partial<{ interview_date: string; interview_type: string }>) {
        return apiClient.put(`/interviews/${id}`, data);
    },

    delete(id: string) {
        return apiClient.delete(`/interviews/${id}`);
    },
};

export default interviewService;
