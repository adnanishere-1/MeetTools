
import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_URL || "http://localhost:5000";

const ADMIN = `${API}/api/v1/admin/dashboard`;
const STATUS = `${API}/api/v1/images/status`;

const JOB_ID =
  __ENV.JOB_ID || "6ae35d12ff6b3e5126f776db";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ["rate==1"],
  },
};

const noRedirect = {
  redirects: 0,
  timeout: "5s",
};

function test(name, response, expected) {
  check(response, {
    [name]: (r) => expected(r),
  });
}

function blocked(r) {
  return r.status === 401 || r.status === 403;
}

function noServerError(r) {
  return r.status < 500;
}

export default function () {

  // 1. Guest accessing admin
  const guest = http.get(ADMIN, noRedirect);

  test(
    "Guest cannot access admin",
    guest,
    blocked
  );

  // 2. Fake JWT
  const fakeJWT = http.get(ADMIN, {
    ...noRedirect,
    headers: {
      Cookie: "accessToken=fake.jwt.signature",
    },
  });

  test(
    "Fake JWT rejected",
    fakeJWT,
    blocked
  );

  // 3. JWT with algorithm none
  const noneToken =
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." +
    "eyJyb2xlIjoiYWRtaW4ifQ.";

  const noneAttack = http.get(ADMIN, {
    ...noRedirect,
    headers: {
      Cookie: `accessToken=${noneToken}`,
    },
  });

  test(
    "Unsigned admin JWT rejected",
    noneAttack,
    blocked
  );

  // 4. Forged admin role header
  const roleAttack = http.get(ADMIN, {
    ...noRedirect,
    headers: {
      "X-User-Role": "admin",
      "X-Admin": "true",
      "X-Forwarded-User": "admin",
    },
  });

  test(
    "Forged role headers rejected",
    roleAttack,
    blocked
  );

  // 5. Fake bearer token
  const bearerAttack = http.get(ADMIN, {
    ...noRedirect,
    headers: {
      Authorization: "Bearer invalid-token",
    },
  });

  test(
    "Fake bearer token rejected",
    bearerAttack,
    blocked
  );

  // 6. Invalid job ID
  const invalidJob = http.get(
    `${STATUS}/invalid-job-id`,
    noRedirect
  );

  test(
    "Invalid job ID handled safely",
    invalidJob,
    (r) => r.status >= 400 && r.status < 500
  );

  // 7. Malformed job ID
  const malformedJob = http.get(
    `${STATUS}/%27%20OR%201%3D1`,
    noRedirect
  );

  test(
    "Malformed input does not crash backend",
    malformedJob,
    noServerError
  );

  // 8. Oversized job ID
  const longID = "a".repeat(1000);

  const oversized = http.get(
    `${STATUS}/${longID}`,
    noRedirect
  );

  test(
    "Oversized input handled safely",
    oversized,
    noServerError
  );

  // 9. Script injection as input
  const xssPayload = "<script>alert(1)</script>";

  const xss = http.get(
    `${STATUS}/${encodeURIComponent(xssPayload)}`,
    noRedirect
  );

  test(
    "Script payload not reflected raw",
    xss,
    (r) =>
      noServerError(r) &&
      !String(r.body).includes(xssPayload)
  );

  // 10. MongoDB operator-style input
  const mongoInput = http.get(
    `${STATUS}/${encodeURIComponent('{"$ne":null}')}`,
    noRedirect
  );

  test(
    "MongoDB operator input handled safely",
    mongoInput,
    noServerError
  );

  // 11. Stack trace exposure
  const errorResponse = http.get(
    `${STATUS}/not-valid`,
    noRedirect
  );

  test(
    "No stack trace exposed",
    errorResponse,
    (r) => {
      const body = String(r.body || "");

      return (
        !body.includes("node_modules/") &&
        !body.includes("node_modules\\\\") &&
        !body.includes("at processTicksAndRejections")
      );
    }
  );

  // 12. Protected admin endpoint does not
  // reveal dashboard fields
  test(
    "No admin dashboard data leaked",
    guest,
    (r) => {
      const body = String(r.body || "");

      return (
        !body.includes('"totalUsers"') &&
        !body.includes('"totalRevenue"')
      );
    }
  );

  // 13. Valid job status endpoint available
  const validJob = http.get(
    `${STATUS}/${encodeURIComponent(JOB_ID)}`,
    noRedirect
  );

  test(
    "Valid job status returns JSON",
    validJob,
    (r) =>
      r.status === 200 &&
      String(r.headers["Content-Type"] || "")
        .includes("application/json")
  );

  // 14. No internal server error
  test(
    "Backend stays responsive",
    validJob,
    noServerError
  );

  sleep(1);
}
