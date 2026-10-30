
import http from "k6/http";
import { check, sleep } from "k6";

const API_URL = __ENV.API_URL || "http://localhost:5000";

export const options = {
  vus: 1,
  iterations: 5,

  thresholds: {
    checks: ["rate==1"],
  },
};

export default function () {
  // TEST 1: Guest cannot access admin dashboard
  const guest = http.get(
    `${API_URL}/api/v1/admin/dashboard`,
    { redirects: 0 }
  );

  check(guest, {
    "Guest blocked from admin": (r) =>
      r.status === 401 || r.status === 403,
  });

  // TEST 2: Invalid token cannot access admin
  const invalidToken = http.get(
    `${API_URL}/api/v1/admin/dashboard`,
    {
      headers: {
        Cookie: "accessToken=invalid.jwt.token",
      },
      redirects: 0,
    }
  );

  check(invalidToken, {
    "Invalid token blocked": (r) =>
      r.status === 401 || r.status === 403,
  });

  // TEST 3: Invalid image job ID handled safely
  const invalidJob = http.get(
    `${API_URL}/api/v1/images/status/not-a-valid-job-id`,
    { redirects: 0 }
  );

  check(invalidJob, {
    "Invalid job ID rejected safely": (r) =>
      r.status >= 400 && r.status < 500,
  });

  // TEST 4: Admin route does not expose data
  check(guest, {
    "No admin data leaked": (r) =>
      !r.body ||
      (
        !r.body.includes('"totalUsers"') &&
        !r.body.includes('"totalRevenue"')
      ),
  });

  sleep(1);
}
