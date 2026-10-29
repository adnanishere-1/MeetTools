
import axios from "axios";

// Next.js API rewrite forwards requests
// to the Express backend.
const API_URL = "/api/v1/jobs";

// Axios instance with HttpOnly cookie support
const jobsAPI = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Optional job status filter
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | string;

// 1. Get user jobs history from real backend
export const fetchUserJobs = async (
  page: number = 1,
  status?: JobStatus
) => {
  const response = await jobsAPI.get("", {
    params: {
      page,
      ...(status ? { status } : {}),
    },
  });

  return response.data;
};

// 2. Get a single job by ID
export const fetchJobById = async (
  jobId: string
) => {
  if (!jobId || !jobId.trim()) {
    throw new Error("Job ID is required.");
  }

  const response = await jobsAPI.get(
    `/${encodeURIComponent(jobId)}`
  );

  return response.data;
};

// 3. Delete a job by ID
export const deleteJob = async (
  jobId: string
) => {
  if (!jobId || !jobId.trim()) {
    throw new Error("Job ID is required.");
  }

  const response = await jobsAPI.delete(
    `/${encodeURIComponent(jobId)}`
  );

  return response.data;
};
