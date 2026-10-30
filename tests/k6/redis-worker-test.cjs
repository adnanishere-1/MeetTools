
const Redis = require("ioredis");
const { Queue } = require("bullmq");

const REDIS_URL =
  process.env.REDIS_URL || "redis://127.0.0.1:6379";

const QUEUE_NAME =
  process.env.QUEUE_NAME || "image-processing";

const WORKER_CONCURRENCY = Number(
  process.env.WORKER_CONCURRENCY || 5
);

const DURATION_SECONDS = Number(
  process.env.DURATION_SECONDS || 60
);

const INTERVAL_MS = 2000;

const MAX_REDIS_LATENCY_MS = 100;
const MAX_WAITING_JOBS = 100;
const MAX_MEMORY_MB = 512;

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});

let queue;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\nMEETTOOLS REDIS + WORKER TEST\n");

  console.log("Queue:", QUEUE_NAME);
  console.log(
    "Worker concurrency:",
    WORKER_CONCURRENCY
  );

  await redis.connect();

  const pong = await redis.ping();

  if (pong !== "PONG") {
    throw new Error("Redis PING failed");
  }

  console.log("PASS | Redis connected");

  queue = new Queue(QUEUE_NAME, {
    connection: {
      url: REDIS_URL,
      maxRetriesPerRequest: null,
    },
  });

  const results = [];

  const rounds = Math.ceil(
    (DURATION_SECONDS * 1000) / INTERVAL_MS
  );

  for (let i = 0; i < rounds; i++) {
    const started = Date.now();

    const pongResult = await redis.ping();

    const latency = Date.now() - started;

    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    );

    const memoryInfo = await redis.info("memory");

    const memoryMatch = memoryInfo.match(
      /used_memory:(\d+)/
    );

    const memoryMB = memoryMatch
      ? Number(memoryMatch[1]) / 1024 / 1024
      : 0;

    const waiting = counts.waiting || 0;
    const active = counts.active || 0;
    const failed = counts.failed || 0;

    const redisOK =
      pongResult === "PONG" &&
      latency < MAX_REDIS_LATENCY_MS;

    const queueOK =
      waiting < MAX_WAITING_JOBS;

    const memoryOK =
      memoryMB < MAX_MEMORY_MB;

    const saturated =
      active >= WORKER_CONCURRENCY;

    const result = {
      latency,
      waiting,
      active,
      failed,
      memoryMB,
      redisOK,
      queueOK,
      memoryOK,
      saturated,
    };

    results.push(result);

    console.log(
      `[${i + 1}/${rounds}] ` +
      `Redis=${latency}ms | ` +
      `Waiting=${waiting} | ` +
      `Active=${active} | ` +
      `Failed=${failed} | ` +
      `Memory=${memoryMB.toFixed(1)}MB | ` +
      `Saturated=${saturated ? "YES" : "NO"}`
    );

    await sleep(INTERVAL_MS);
  }

  const avgLatency =
    results.reduce(
      (sum, r) => sum + r.latency,
      0
    ) / results.length;

  const maxWaiting = Math.max(
    ...results.map((r) => r.waiting)
  );

  const maxMemory = Math.max(
    ...results.map((r) => r.memoryMB)
  );

  const redisPass =
    results.every((r) => r.redisOK);

  const queuePass =
    results.every((r) => r.queueOK);

  const memoryPass =
    results.every((r) => r.memoryOK);

  const saturationCount =
    results.filter((r) => r.saturated).length;

  console.log("\n========== FINAL REPORT ==========");

  console.log(
    "Redis:",
    redisPass ? "PASS" : "WARNING"
  );

  console.log(
    "Queue backlog:",
    queuePass ? "PASS" : "WARNING"
  );

  console.log(
    "Redis memory:",
    memoryPass ? "PASS" : "WARNING"
  );

  console.log(
    "Average Redis latency:",
    avgLatency.toFixed(2),
    "ms"
  );

  console.log(
    "Maximum waiting jobs:",
    maxWaiting
  );

  console.log(
    "Maximum Redis memory:",
    maxMemory.toFixed(2),
    "MB"
  );

  console.log(
    "Worker saturation samples:",
    saturationCount,
    "/",
    results.length
  );

  if (saturationCount > results.length * 0.5) {
    console.log(
      "WARNING | Worker frequently at concurrency limit"
    );
  }

  console.log(
    "\nNOTE: Worker execution speed is not " +
    "measured without real test jobs."
  );
}

main()
  .catch((error) => {
    console.error(
      "TEST FAILED:",
      error.message
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (queue) {
      await queue.close();
    }

    redis.disconnect();
  });
