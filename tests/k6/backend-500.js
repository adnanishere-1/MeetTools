
import http from "k6/http";
import { check, sleep } from "k6";

const API_URL = __ENV.API_URL || "http://localhost:5000";
const JOB_ID = __ENV.JOB_ID;

if (!JOB_ID) {
  throw new Error("JOB_ID missing. Use -e JOB_ID=your_job_id");
}

export const options = {
  stages: [
    { duration: "20s", target: 25 },
    { duration: "20s", target: 50 },
    { duration: "20s", target: 100 },
    { duration: "20s", target: 200 },
    { duration: "20s", target: 300 },
    { duration: "20s", target: 400 },
    { duration: "20s", target: 500 },
    { duration: "30s", target: 500 },
    { duration: "40s", target: 0 },
  ],

  thresholds: {
    http_req_failed: [
      {
        threshold: "rate<0.05",
        abortOnFail: true,
        delayAbortEval: "30s",
      },
    ],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.95"],
  },
};

export default function () {
  const response = http.get(
    `${API_URL}/api/v1/images/status/${encodeURIComponent(JOB_ID)}`,
    {
      timeout: "10s",
      tags: { endpoint: "image-status" },
    }
  );

  check(response, {
    "Backend returns 200": (r) => r.status === 200,
    "JSON response": (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),
    "Response under 1.5 seconds": (r) =>
      r.timings.duration < 1500,
  });

  sleep(2);
}
