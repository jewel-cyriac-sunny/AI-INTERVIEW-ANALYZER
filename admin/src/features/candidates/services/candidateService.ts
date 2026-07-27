/* Candidate Service — CRUD + CSV upload */

import apiClient from '@/services/apiClient';

export interface Candidate {
  candidate_id: string;
  name: string;
  email: string;
  phone: string | null;
  admin_id: string;
}

export const candidateService = {
  getAll(): Promise<Candidate[]> {
    return apiClient.get('/candidates');
  },

  getById(id: string): Promise<Candidate> {
    return apiClient.get(`/candidates/${id}`);
  },

  create(data: { name: string; email: string; phone?: string; password: string }): Promise<Candidate> {
    return apiClient.post('/candidates', data);
  },

  update(id: string, data: { name?: string; email?: string; phone?: string }): Promise<Candidate> {
    return apiClient.put(`/candidates/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/candidates/${id}`);
  },

  uploadCSV(file: File): Promise<{ message: string; count: number; candidates: Candidate[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload('/candidates/upload-csv', formData);
  },
};

export default candidateService;
