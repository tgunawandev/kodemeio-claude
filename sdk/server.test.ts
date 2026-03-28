// server.test.ts — Smoke tests for the SDK REST API
// Spawns the server on a random port and validates core endpoints.

import { execFile, fork } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const TEST_PORT = 39100 + Math.floor(Math.random() * 1000);
const TEST_KEY = "test-api-key-123";
const BASE = `http://127.0.0.1:${TEST_PORT}`;

let server: ReturnType<typeof fork> | null = null;

// ─── Helpers ────────────────────────────────────────────────────────

async function req(
  method: string,
  path: string,
  body?: object,
  headers?: Record<string, string>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

// ─── Start server ───────────────────────────────────────────────────

async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server = fork("./server.ts", [], {
      execArgv: ["--import", "tsx"],
      env: {
        ...process.env,
        SDK_PORT: String(TEST_PORT),
        SDK_API_KEY: TEST_KEY,
        MAX_CONCURRENT: "2",
      },
      stdio: "pipe",
    });

    const timeout = setTimeout(
      () => reject(new Error("Server start timeout")),
      5000,
    );

    server!.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("listening")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    server!.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${name}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\nSDK Server Tests (port ${TEST_PORT})\n`);

  await test("GET /health returns 200 with status ok", async () => {
    const { status, data } = await req("GET", "/health");
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.status === "ok", `expected status ok, got ${data.status}`);
    assert(typeof data.timestamp === "string", "missing timestamp");
    assert(data.inFlight === 0, `expected inFlight 0, got ${data.inFlight}`);
    assert(
      data.maxConcurrent === 2,
      `expected maxConcurrent 2, got ${data.maxConcurrent}`,
    );
  });

  await test("GET /health has no daemon field", async () => {
    const { data } = await req("GET", "/health");
    assert(
      !("daemon" in data),
      "health response should not contain daemon field",
    );
  });

  await test("POST /task without auth returns 401", async () => {
    const { status } = await req("POST", "/task", { prompt: "test" });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test("POST /task with wrong auth returns 401", async () => {
    const { status } = await req(
      "POST",
      "/task",
      { prompt: "test" },
      {
        Authorization: "Bearer wrong-key",
      },
    );
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test("POST /task without prompt returns 400", async () => {
    const { status, data } = await req(
      "POST",
      "/task",
      {},
      {
        Authorization: `Bearer ${TEST_KEY}`,
      },
    );
    assert(status === 400, `expected 400, got ${status}`);
    assert(
      data.error === "prompt is required",
      `unexpected error: ${data.error}`,
    );
  });

  await test("POST /task with path traversal returns 400", async () => {
    const { status, data } = await req(
      "POST",
      "/task",
      {
        prompt: "test",
        workspace: "../etc/passwd",
      },
      {
        Authorization: `Bearer ${TEST_KEY}`,
      },
    );
    assert(status === 400, `expected 400, got ${status}`);
    assert(
      data.error === "Invalid workspace path",
      `unexpected error: ${data.error}`,
    );
  });

  await test("POST /task with absolute path returns 400", async () => {
    const { status, data } = await req(
      "POST",
      "/task",
      {
        prompt: "test",
        workspace: "/etc/passwd",
      },
      {
        Authorization: `Bearer ${TEST_KEY}`,
      },
    );
    assert(status === 400, `expected 400, got ${status}`);
    assert(
      data.error === "Invalid workspace path",
      `unexpected error: ${data.error}`,
    );
  });

  await test("GET /nonexistent returns 404", async () => {
    const { status } = await req("GET", "/nonexistent");
    assert(status === 404, `expected 404, got ${status}`);
  });

  await test("OPTIONS returns 204 (CORS preflight)", async () => {
    const res = await fetch(`${BASE}/task`, { method: "OPTIONS" });
    assert(res.status === 204, `expected 204, got ${res.status}`);
    assert(
      res.headers.get("access-control-allow-origin") === "*",
      "missing CORS header",
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await startServer();
    await runTests();
  } finally {
    server?.kill("SIGTERM");
    // Give it a moment to clean up
    await new Promise((r) => setTimeout(r, 200));
  }
}

main().catch((e) => {
  console.error(e);
  server?.kill("SIGKILL");
  process.exit(1);
});
