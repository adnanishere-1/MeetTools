import axios from 'axios';

const API_URL = '/api/v1/jobs';

export const fetchUserJobs = async (token: string, page = 1, status?: string) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
    params: { page, status },
  });
  return response.data; // Yeh { success, jobs, total, ... } return karega
};