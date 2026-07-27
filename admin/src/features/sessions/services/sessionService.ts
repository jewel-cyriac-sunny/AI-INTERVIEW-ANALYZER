/* Session Service — CRUD for interview sessions */

import apiClient from '@/services/apiClient';

export const sessionService = {
    getAll(candidateId?: string) {
        const query = candidateId ? `?candidate_id=${candidateId}` : '';
        return apiClient.get(`/sessions${query}`);
    },

    getById(id: string) {
        return apiClient.get(`/sessions/${id}`);
    },

    create(data: { start_time: string; end_time: string; status: string; candidate_id: string }) {
        return apiClient.post('/sessions', data);
    },

    update(id: string, data: Partial<{ start_time: string; end_time: string; status: string }>) {
        return apiClient.put(`/sessions/${id}`, data);
    },

    delete(id: string) {
        return apiClient.delete(`/sessions/${id}`);
    },
};

export default sessionService;
