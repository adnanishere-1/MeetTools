
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.FRONTEND_URL || "http://localhost:3000";

export const options = {
  stages: [
    { duration: "20s", target: 25 },
    { duration: "20s", target: 50 },
    { duration: "20s", target: 100 },
    { duration: "20s", target: 150 },
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
    http_req_duration: ["p(95)<3000"],
    checks: ["rate>0.95"],
  },
};

export default function () {
  const response = http.get(BASE_URL, {
    timeout: "10s",
    tags: { page: "homepage" },
  });

  check(response, {
    "Homepage returns 200": (r) => r.status === 200,
    "Response under 3 seconds": (r) =>
      r.timings.duration < 3000,
  });

  sleep(2);
}
