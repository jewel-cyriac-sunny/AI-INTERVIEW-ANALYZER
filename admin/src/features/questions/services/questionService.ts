/* Question Service */

import apiClient from '@/services/apiClient';

export interface Question {
  question_id: string;
  text: string;
  keywords: string[];
  time_limit: number;
  admin_id: string;
}

export const questionService = {
  getAll(): Promise<Question[]> {
    return apiClient.get('/admin/questions');
  },

  getById(id: string): Promise<Question> {
    return apiClient.get(`/admin/questions/${id}`);
  },

  create(data: Omit<Question, 'question_id' | 'admin_id'>): Promise<Question> {
    return apiClient.post('/admin/questions', data);
  },

  update(id: string, data: Partial<Question>): Promise<Question> {
    return apiClient.put(`/admin/questions/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/admin/questions/${id}`);
  }
};

export default questionService;
