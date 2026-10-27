import axios from 'axios';

const API_URL = '/api/v1/jobs';

// 1️⃣ Get User Jobs History via Real API
export const fetchUserJobs = async (token?: string, page = 1, status?: string) => {
  const response = await axios.get(API_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params: { page, status },
  });
  return response.data;
};

// 2️⃣ Get Single Job Details by ID via Real API
export const fetchJobById = async (token?: string, jobId?: string) => {
  const response = await axios.get(`${API_URL}/${jobId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

// 3️⃣ Delete Job by ID via Real API
export const deleteJob = async (token?: string, jobId?: string) => {
  const response = await axios.delete(`${API_URL}/${jobId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};