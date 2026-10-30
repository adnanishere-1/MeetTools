
import http from "k6/http";
import { check, sleep } from "k6";

const API_URL =
  __ENV.API_URL || "http://localhost:5000";

export const options = {
  vus: 1,
  iterations: 5,

  thresholds: {
    checks: ["rate==1"],
  },
};

export default function () {
  const response = http.get(
    `${API_URL}/api/v1/admin/dashboard`,
    {
      redirects: 0,
      responseCallback:
        http.expectedStatuses(401, 403),
    }
  );

  check(response, {
    "Unauthenticated admin access blocked": (r) =>
      r.status === 401 ||
      r.status === 403,
  });

  sleep(1);
}
