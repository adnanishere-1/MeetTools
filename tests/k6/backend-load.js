
import http from "k6/http";
import { check, sleep } from "k6";

const API_URL =
  __ENV.API_URL || "http://localhost:5000";

const JOB_ID = __ENV.JOB_ID;

if (!JOB_ID) {
  throw new Error(
    "JOB_ID missing. Use -e JOB_ID=your_job_id"
  );
}

export const options = {
  stages: [
    { duration: "15s", target: 5 },
    { duration: "30s", target: 10 },
    { duration: "15s", target: 0 },
  ],

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.95"],
  },
};

export default function () {
  const response = http.get(
    `${API_URL}/api/v1/images/status/${encodeURIComponent(JOB_ID)}`
  );

  check(response, {
    "API returns 200": (r) =>
      r.status === 200,

    "JSON response": (r) =>
      r.headers["Content-Type"]?.includes(
        "application/json"
      ),
  });

  sleep(2);
}
