
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// MeetTools master security + performance test.
// Local-only by default. No OTP, uploads or writes.

const FRONTEND = (
  __ENV.FRONTEND_URL || "http://localhost:3000"
).replace(/\/$/, "");

const API = (
  __ENV.API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const ADMIN_PATH =
  __ENV.ADMIN_PATH || "/api/v1/admin/dashboard";

const STATUS_PATH =
  __ENV.STATUS_PATH || "/api/v1/images/status";

const JOB_ID =
  __ENV.JOB_ID || "6ae35d12ff6b3e5126f776db";

const USER_COOKIE = __ENV.USER_COOKIE || "";
const ADMIN_COOKIE = __ENV.ADMIN_COOKIE || "";
const OTHER_USER_JOB_ID = __ENV.OTHER_USER_JOB_ID || "";

const EXPECT_PRIVATE_JOBS =
  __ENV.EXPECT_PRIVATE_JOBS === "1";

const MODE = __ENV.MODE || "security";

const MAX_VUS = Math.min(
  Math.max(Number(__ENV.MAX_VUS || 20), 1),
  100
);

const ALLOW_REMOTE = __ENV.ALLOW_REMOTE === "1";

function localOnly(url) {
  const match = /^https?:\/\/([^/:]+)/i.exec(url);

  return !!match &&
    ["localhost", "127.0.0.1", "[::1]"]
      .includes(match[1].toLowerCase());
}

if (
  !ALLOW_REMOTE &&
  (!localOnly(FRONTEND) || !localOnly(API))
) {
  throw new Error(
    "Only localhost allowed by default."
  );
}

if (!["security", "load"].includes(MODE)) {
  throw new Error("MODE must be security or load");
}

const failures = new Counter(
  "security_check_failures"
);

const frontendLatency = new Trend(
  "frontend_latency_ms",
  true
);

const backendLatency = new Trend(
  "backend_latency_ms",
  true
);

export const options = MODE === "load"
  ? {
      scenarios: {
        frontend: {
          executor: "ramping-vus",
          exec: "frontendLoad",
          startVUs: 0,
          stages: [
            {
              duration: "20s",
              target: Math.max(
                1,
                Math.floor(MAX_VUS / 4)
              ),
            },
            {
              duration: "20s",
              target: Math.max(
                1,
                Math.floor(MAX_VUS / 2)
              ),
            },
            {
              duration: "30s",
              target: MAX_VUS,
            },
            {
              duration: "30s",
              target: MAX_VUS,
            },
            {
              duration: "20s",
              target: 0,
            },
          ],
          gracefulRampDown: "10s",
        },
      },

      thresholds: {
        "http_req_failed{scenario:frontend}": [
          {
            threshold: "rate<0.05",
            abortOnFail: true,
            delayAbortEval: "30s",
          },
        ],
        "http_req_duration{scenario:frontend}": [
          "p(95)<3000",
        ],
        "checks{scenario:frontend}": [
          "rate>0.95",
        ],
      },
    }
  : {
      scenarios: {
        security: {
          executor: "shared-iterations",
          exec: "securityAudit",
          vus: 1,
          iterations: 1,
          maxDuration: "2m",
        },
      },
      thresholds: {
        security_check_failures: ["count==0"],
      },
    };

const requestOptions = {
  redirects: 0,
  timeout: "7s",
  responseType: "text",
};

function get(url, headers = {}) {
  return http.get(url, {
    ...requestOptions,
    headers,
  });
}

function record(label, passed, details) {
  check(
    { passed },
    {
      [label]: (r) => r.passed,
    }
  );

  if (!passed) {
    failures.add(1);
  }

  console.log(
    `${passed ? "PASS" : "FAIL"} | ${label} | ${details}`
  );
}

function skipped(label, reason) {
  console.log(`SKIPPED | ${label} | ${reason}`);
}

function blocked(r) {
  return r.status === 401 || r.status === 403;
}

function no5xx(r) {
  return r.status > 0 && r.status < 500;
}

function cookieHeaders(cookie) {
  return cookie ? { Cookie: cookie } : {};
}

function adminUrl() {
  return `${API}${ADMIN_PATH}`;
}

function statusUrl(id) {
  return (
    `${API}${STATUS_PATH}/` +
    encodeURIComponent(id)
  );
}

// ======================================
// SECURITY AUDIT
// ======================================

export function securityAudit() {
  console.log(
    `Security audit: ${API} / ${FRONTEND}`
  );

  // 1. Frontend availability
  const homepage = get(FRONTEND);

  frontendLatency.add(
    homepage.timings.duration
  );

  record(
    "Frontend available (200)",
    homepage.status === 200,
    `status=${homepage.status}`
  );

  // 2. Frontend speed
  record(
    "Frontend responds under 3000ms",
    homepage.status === 200 &&
      homepage.timings.duration < 3000,
    `duration=${homepage.timings.duration.toFixed(1)}ms`
  );

  // 3. Guest admin access
  const guest = get(adminUrl());

  backendLatency.add(
    guest.timings.duration
  );

  record(
    "Guest admin access denied",
    blocked(guest),
    `status=${guest.status}`
  );

  // 4. Admin data leakage
  record(
    "Admin response has no obvious data leak",
    !/"(?:totalUsers|totalRevenue|users|accessToken)"\s*:/i
      .test(String(guest.body || "")),
    `status=${guest.status}`
  );

  // 5. Invalid JWT
  const invalidCookie = get(
    adminUrl(),
    {
      Cookie:
        "accessToken=invalid.jwt.signature; " +
        "token=invalid.jwt.signature",
    }
  );

  record(
    "Invalid JWT cookie denied",
    blocked(invalidCookie),
    `status=${invalidCookie.status}`
  );

  // 6. Unsigned JWT
  const noneJWT =
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." +
    "eyJyb2xlIjoiYWRtaW4ifQ.";

  const unsigned = get(
    adminUrl(),
    {
      Cookie:
        `accessToken=${noneJWT}; token=${noneJWT}`,
    }
  );

  record(
    "Unsigned admin JWT denied",
    blocked(unsigned),
    `status=${unsigned.status}`
  );

  // 7. Forged admin headers
  const forged = get(
    adminUrl(),
    {
      "X-User-Role": "admin",
      "X-Admin": "true",
      "X-Forwarded-User": "admin",
    }
  );

  record(
    "Forged admin headers denied",
    blocked(forged),
    `status=${forged.status}`
  );

  // 8. Invalid bearer token
  const bearer = get(
    adminUrl(),
    {
      Authorization:
        "Bearer invalid-token",
    }
  );

  record(
    "Invalid bearer denied",
    blocked(bearer),
    `status=${bearer.status}`
  );

  // 9. Invalid job ID
  const invalidId = get(
    statusUrl("not-a-valid-job-id")
  );

  record(
    "Invalid job ID rejected (4xx)",
    invalidId.status >= 400 &&
      invalidId.status < 500,
    `status=${invalidId.status}`
  );

  // 10. NoSQL-shaped input
  const injection = get(
    statusUrl('{"$ne":null}')
  );

  record(
    "NoSQL-shaped input causes no server error",
    no5xx(injection),
    `status=${injection.status}`
  );

  // 11. XSS reflection probe
  const xss = "<script>alert(1)</script>";

  const xssResponse = get(
    statusUrl(xss)
  );

  record(
    "Raw script not reflected",
    no5xx(xssResponse) &&
      !String(xssResponse.body || "")
        .includes(xss),
    `status=${xssResponse.status}`
  );

  // 12. Oversized input
  const huge = get(
    statusUrl("a".repeat(1000))
  );

  record(
    "Long job ID causes no server error",
    no5xx(huge),
    `status=${huge.status}`
  );

  // 13. Stack trace exposure
  const combinedBody = [
    invalidId,
    injection,
    xssResponse,
    huge,
    guest,
  ]
    .map((r) => String(r.body || ""))
    .join("\n");

  record(
    "No obvious stack traces leaked",
    !/node_modules[\\/]|at processTicksAndRejections|Error:.*\n\s+at\s/i
      .test(combinedBody),
    "Checked 5 response bodies"
  );

  // 14. Valid job status
  const valid = get(
    statusUrl(JOB_ID)
  );

  backendLatency.add(
    valid.timings.duration
  );

  record(
    "Known job status available as JSON",
    valid.status === 200 &&
      /application\/json/i.test(
        String(
          valid.headers["Content-Type"] || ""
        )
      ),
    `status=${valid.status}`
  );

  // 15. Backend response speed
  record(
    "Known job status under 1500ms",
    valid.status === 200 &&
      valid.timings.duration < 1500,
    `duration=${valid.timings.duration.toFixed(1)}ms`
  );

  // 16. CORS security
  const origin = "https://attacker.invalid";

  const cors = get(
    statusUrl(JOB_ID),
    { Origin: origin }
  );

  const allowOrigin = String(
    cors.headers[
      "Access-Control-Allow-Origin"
    ] || ""
  );

  const allowCred = String(
    cors.headers[
      "Access-Control-Allow-Credentials"
    ] || ""
  ).toLowerCase();

  record(
    "No reflected hostile CORS origin with credentials",
    !(
      allowOrigin === origin &&
      allowCred === "true"
    ),
    `ACAO=${allowOrigin || "(none)"}, ACAC=${allowCred || "(none)"}`
  );

  // 17. Server technology disclosure
  const xPowered =
    homepage.headers["X-Powered-By"] ||
    valid.headers["X-Powered-By"];

  record(
    "No X-Powered-By disclosure",
    !xPowered,
    `header=${xPowered || "(none)"}`
  );

  // Optional authenticated checks
  if (USER_COOKIE) {
    const normalUser = get(
      adminUrl(),
      cookieHeaders(USER_COOKIE)
    );

    record(
      "Authenticated normal user denied admin",
      normalUser.status === 403,
      `status=${normalUser.status}`
    );
  } else {
    skipped(
      "Normal user -> admin escalation",
      "USER_COOKIE not configured"
    );
  }

  if (ADMIN_COOKIE) {
    const realAdmin = get(
      adminUrl(),
      cookieHeaders(ADMIN_COOKIE)
    );

    record(
      "Real admin can access dashboard",
      realAdmin.status === 200,
      `status=${realAdmin.status}`
    );
  } else {
    skipped(
      "Real admin access",
      "ADMIN_COOKIE not configured"
    );
  }

  if (
    USER_COOKIE &&
    OTHER_USER_JOB_ID &&
    EXPECT_PRIVATE_JOBS
  ) {
    const otherJob = get(
      statusUrl(OTHER_USER_JOB_ID),
      cookieHeaders(USER_COOKIE)
    );

    record(
      "User cannot read another private job",
      blocked(otherJob) ||
        otherJob.status === 404,
      `status=${otherJob.status}`
    );
  } else {
    skipped(
      "IDOR: other user private job",
      "Needs test user, other private job and policy"
    );
  }

  skipped(
    "CSRF, OTP, logout and upload validation",
    "Require actual routes and disposable test accounts"
  );

  skipped(
    "Dependency and secret scanning",
    "Run dedicated tools separately"
  );

  skipped(
    "Redis, worker and database recovery",
    "Require controlled staging environment"
  );

  console.log(
    "DONE: Review PASS / FAIL / SKIPPED"
  );
}

// ======================================
// FRONTEND BOTTLENECK / LOAD TEST
// ======================================

export function frontendLoad() {
  const r = get(FRONTEND);

  frontendLatency.add(
    r.timings.duration
  );

  check(r, {
    "Homepage 200": (res) =>
      res.status === 200,

    "Homepage under 3 seconds": (res) =>
      res.status === 200 &&
      res.timings.duration < 3000,
  });

  sleep(2);
}
