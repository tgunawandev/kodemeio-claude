// =============================================================================
// dashboard.api.test.ts — Tests for handleApiRequest
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

import type { DaemonState } from "../daemon/types.js";

const MOCK_STATE: DaemonState = {
  started_at: "2025-01-01T00:00:00.000Z",
  subsystems: {
    heartbeat: true,
    cron: true,
    telegram: false,
    dashboard: true,
  },
  sessions: { kodemeio: "sess-abc", kontenos: null },
  queue_depth: 3,
  in_flight: 1,
  recent_runs: [
    {
      id: "run-1",
      source: "api",
      workspace: "kodemeio",
      prompt_preview: "test prompt",
      status: "success",
      started_at: "2025-01-01T01:00:00.000Z",
      duration_ms: 500,
    },
  ],
  jobs: [],
  persona: null,
};

describe("handleApiRequest", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function getHandler() {
    const { handleApiRequest } = await import("../daemon/dashboard/api.js");
    return handleApiRequest;
  }

  it("returns 405 for non-GET requests", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/status", "POST", () => MOCK_STATE);
    expect(result.status).toBe(405);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Method not allowed");
  });

  it("returns 405 for PUT requests", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/status", "PUT", () => MOCK_STATE);
    expect(result.status).toBe(405);
  });

  it("/dashboard/api/status returns full daemon state", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/status", "GET", () => MOCK_STATE);

    expect(result.status).toBe(200);
    const body = JSON.parse(result.body) as DaemonState;
    expect(body.started_at).toBe(MOCK_STATE.started_at);
    expect(body.queue_depth).toBe(3);
    expect(body.in_flight).toBe(1);
    expect(body.subsystems.heartbeat).toBe(true);
  });

  it("/dashboard/api/sessions returns sessions map", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/sessions", "GET", () => MOCK_STATE);

    expect(result.status).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.kodemeio).toBe("sess-abc");
    expect(body.kontenos).toBeNull();
  });

  it("/dashboard/api/queue returns depth and in_flight", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/queue", "GET", () => MOCK_STATE);

    expect(result.status).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.depth).toBe(3);
    expect(body.in_flight).toBe(1);
  });

  it("/dashboard/api/history returns recent runs array", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/history", "GET", () => MOCK_STATE);

    expect(result.status).toBe(200);
    const body = JSON.parse(result.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("run-1");
    expect(body[0].status).toBe("success");
  });

  it("/dashboard/api/jobs returns jobs array", async () => {
    const handler = await getHandler();
    const result = handler("/dashboard/api/jobs", "GET", () => MOCK_STATE);

    expect(result.status).toBe(200);
    const body = JSON.parse(result.body);
    expect(Array.isArray(body)).toBe(true);
  });

  it("unknown route returns 404", async () => {
    const handler = await getHandler();
    const result = handler(
      "/dashboard/api/nonexistent",
      "GET",
      () => MOCK_STATE,
    );

    expect(result.status).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Not found");
  });

  it("getState is called to retrieve fresh state", async () => {
    const handler = await getHandler();
    const getState = vi.fn().mockReturnValue(MOCK_STATE);

    handler("/dashboard/api/status", "GET", getState);
    expect(getState).toHaveBeenCalledOnce();
  });

  it("response bodies are valid JSON strings", async () => {
    const handler = await getHandler();
    const routes = [
      "/dashboard/api/status",
      "/dashboard/api/sessions",
      "/dashboard/api/queue",
      "/dashboard/api/history",
      "/dashboard/api/jobs",
    ];
    for (const route of routes) {
      const result = handler(route, "GET", () => MOCK_STATE);
      expect(() => JSON.parse(result.body)).not.toThrow();
    }
  });
});
