/* Analysis Service — CRUD for AI behavioural analysis */

import apiClient from '@/services/apiClient';

export const analysisService = {
    getAll(candidateId?: string) {
        const query = candidateId ? `?candidate_id=${candidateId}` : '';
        return apiClient.get(`/analysis${query}`);
    },

    getById(id: string) {
        return apiClient.get(`/analysis/${id}`);
    },

    create(data: { facial_score: number; voice_score: number; behaviour_score: number; candidate_id: string }) {
        return apiClient.post('/analysis', data);
    },

    update(id: string, data: Partial<{ facial_score: number; voice_score: number; behaviour_score: number }>) {
        return apiClient.put(`/analysis/${id}`, data);
    },

    delete(id: string) {
        return apiClient.delete(`/analysis/${id}`);
    },
};

export default analysisService;
