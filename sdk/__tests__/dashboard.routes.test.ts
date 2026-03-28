// =============================================================================
// dashboard.routes.test.ts — Tests for mountDashboard
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    appendFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue("<html>dashboard</html>"),
  };
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
  sessions: {},
  queue_depth: 0,
  in_flight: 0,
  recent_runs: [],
  jobs: [],
  persona: null,
};

function makeServer() {
  const server = new EventEmitter() as any;
  server.removeAllListeners = vi.fn().mockImplementation((event?: string) => {
    if (event) {
      EventEmitter.prototype.removeAllListeners.call(server, event);
    } else {
      EventEmitter.prototype.removeAllListeners.call(server);
    }
    return server;
  });
  server.on = vi.fn().mockImplementation((event: string, handler: Function) => {
    EventEmitter.prototype.on.call(server, event, handler);
    return server;
  });
  server.listeners = vi.fn().mockReturnValue([]);
  return server;
}

function makeReq(url: string, method = "GET") {
  return { url, method };
}

function makeRes() {
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(),
  };
  return res;
}

describe("mountDashboard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function mount(server: any) {
    const { mountDashboard } = await import("../daemon/dashboard/routes.js");
    mountDashboard(server, () => MOCK_STATE);
  }

  it("removes existing request listeners and adds new combined listener", async () => {
    const server = makeServer();
    await mount(server);
    expect(server.removeAllListeners).toHaveBeenCalledWith("request");
    expect(server.on).toHaveBeenCalledWith("request", expect.any(Function));
  });

  it("serves HTML for /dashboard", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("/dashboard");
    const res = makeRes();
    server.emit("request", req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining("html"));
  });

  it("serves HTML for /dashboard/ (trailing slash)", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("/dashboard/");
    const res = makeRes();
    server.emit("request", req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
  });

  it("handles /dashboard/api/status route", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("/dashboard/api/status");
    const res = makeRes();
    server.emit("request", req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    expect(res.end).toHaveBeenCalledWith(expect.any(String));
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.queue_depth).toBe(0);
  });

  it("handles /dashboard/api/queue route", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("/dashboard/api/queue");
    const res = makeRes();
    server.emit("request", req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(typeof body.depth).toBe("number");
  });

  it("handles 404 for unknown api routes", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("/dashboard/api/doesnotexist");
    const res = makeRes();
    server.emit("request", req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
  });

  it("passes non-dashboard requests to original listeners", async () => {
    const originalHandler = vi.fn();
    const server = makeServer();
    // Pre-register a handler before mounting
    server.listeners.mockReturnValue([originalHandler]);
    await mount(server);

    const req = makeReq("/other/path");
    const res = makeRes();
    server.emit("request", req, res);

    expect(originalHandler).toHaveBeenCalledWith(req, res);
  });

  it("handles request with empty url gracefully", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("");
    const res = makeRes();

    // Should not throw
    expect(() => server.emit("request", req, res)).not.toThrow();
  });

  it("handles POST to API route with 405", async () => {
    const server = makeServer();
    await mount(server);

    const req = makeReq("/dashboard/api/status", "POST");
    const res = makeRes();
    server.emit("request", req, res);

    expect(res.writeHead).toHaveBeenCalledWith(405, expect.any(Object));
  });

  it("HTML is cached after first load", async () => {
    const server1 = makeServer();
    const server2 = makeServer();

    const { mountDashboard } = await import("../daemon/dashboard/routes.js");
    mountDashboard(server1, () => MOCK_STATE);
    mountDashboard(server2, () => MOCK_STATE);

    const req1 = makeReq("/dashboard");
    const res1 = makeRes();
    server1.emit("request", req1, res1);

    const req2 = makeReq("/dashboard");
    const res2 = makeRes();
    server2.emit("request", req2, res2);

    // Both should serve the same cached HTML
    expect(res1.end.mock.calls[0][0]).toBe(res2.end.mock.calls[0][0]);
  });
});
