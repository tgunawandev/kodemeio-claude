// =============================================================================
// session.manager.test.ts — Tests for SessionManager
// =============================================================================

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// Silence logger
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    appendFileSync: vi.fn(),
  };
});

describe("SessionManager", () => {
  let tmpDir: string;
  let sessionsFile: string;

  beforeAll(() => {
    tmpDir = join(tmpdir(), `session-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.resetModules();
    sessionsFile = join(tmpDir, `sessions-${randomUUID()}.json`);
    process.env.DAEMON_SESSIONS_FILE = sessionsFile;
  });

  afterEach(() => {
    delete process.env.DAEMON_SESSIONS_FILE;
    vi.restoreAllMocks();
  });

  async function getSessionManager(maxTurns?: number) {
    const { SessionManager } = await import("../daemon/session/manager.js");
    return new SessionManager(maxTurns);
  }

  it("starts empty when sessions file does not exist", async () => {
    const manager = await getSessionManager();
    expect(manager.get("kodemeio")).toBeNull();
    expect(manager.getAllSessions()).toEqual({});
  });

  it("set creates a session and get retrieves it", async () => {
    const manager = await getSessionManager();
    manager.set("kodemeio", "sess-123");
    expect(manager.get("kodemeio")).toBe("sess-123");
  });

  it("set persists session to disk", async () => {
    const manager = await getSessionManager();
    manager.set("kontenos", "sess-456");

    // Load new instance from same file
    vi.resetModules();
    const { SessionManager } = await import("../daemon/session/manager.js");
    const manager2 = new SessionManager();
    expect(manager2.get("kontenos")).toBe("sess-456");
  });

  it("reset removes a session", async () => {
    const manager = await getSessionManager();
    manager.set("kodemeio", "sess-abc");
    manager.reset("kodemeio");
    expect(manager.get("kodemeio")).toBeNull();
  });

  it("reset is safe when workspace has no session", async () => {
    const manager = await getSessionManager();
    expect(() => manager.reset("nonexistent")).not.toThrow();
  });

  it("resetAll clears all sessions", async () => {
    const manager = await getSessionManager();
    manager.set("kodemeio", "s1");
    manager.set("kontenos", "s2");
    manager.resetAll();
    expect(manager.getAllSessions()).toEqual({});
  });

  it("getAllSessions returns all workspace→session_id mappings", async () => {
    const manager = await getSessionManager();
    manager.set("kodemeio", "s1");
    manager.set("kontenos", "s2");
    const all = manager.getAllSessions();
    expect(all["kodemeio"]).toBe("s1");
    expect(all["kontenos"]).toBe("s2");
  });

  it("incrementTurns returns updated turn count", async () => {
    const manager = await getSessionManager();
    manager.set("kodemeio", "sess-xyz");
    const count = manager.incrementTurns("kodemeio");
    expect(count).toBe(1);
    manager.incrementTurns("kodemeio");
    expect(manager.incrementTurns("kodemeio")).toBe(3);
  });

  it("incrementTurns returns 0 for unknown workspace", async () => {
    const manager = await getSessionManager();
    expect(manager.incrementTurns("nosuchws")).toBe(0);
  });

  it("needsCompaction returns false below maxTurns", async () => {
    const manager = await getSessionManager(5);
    manager.set("kodemeio", "s1");
    manager.incrementTurns("kodemeio"); // 1 turn
    expect(manager.needsCompaction("kodemeio")).toBe(false);
  });

  it("needsCompaction returns true at or above maxTurns", async () => {
    const manager = await getSessionManager(2);
    manager.set("kodemeio", "s1");
    manager.incrementTurns("kodemeio"); // 1
    manager.incrementTurns("kodemeio"); // 2 — at limit
    expect(manager.needsCompaction("kodemeio")).toBe(true);
  });

  it("needsCompaction returns false for nonexistent workspace", async () => {
    const manager = await getSessionManager(5);
    expect(manager.needsCompaction("unknown")).toBe(false);
  });

  it("get warns when session is at turn limit", async () => {
    const manager = await getSessionManager(2);
    manager.set("kodemeio", "s1");
    manager.incrementTurns("kodemeio"); // 1
    manager.incrementTurns("kodemeio"); // 2 — at limit
    // Should still return session_id (doesn't block, just warns)
    expect(manager.get("kodemeio")).toBe("s1");
  });

  it("getSessionInfo returns null for unknown workspace", async () => {
    const manager = await getSessionManager();
    expect(manager.getSessionInfo("unknown")).toBeNull();
  });

  it("getSessionInfo returns entry with turn_count for known workspace", async () => {
    const manager = await getSessionManager();
    manager.set("kodemeio", "sess-info");
    manager.incrementTurns("kodemeio");
    const info = manager.getSessionInfo("kodemeio");
    expect(info).not.toBeNull();
    expect(info!.session_id).toBe("sess-info");
    expect(info!.turn_count).toBe(1);
    expect(typeof info!.created_at).toBe("string");
  });

  it("handles corrupted sessions file gracefully", async () => {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(sessionsFile, "not valid json!!!");
    const { SessionManager } = await import("../daemon/session/manager.js");
    const manager = new SessionManager();
    expect(manager.getAllSessions()).toEqual({});
  });

  it("saveToDisk logs error when write fails", async () => {
    const { writeFileSync } = await import("node:fs");
    const origWrite = writeFileSync;

    // Override writeFileSync to fail on our specific path
    const mockWrite = vi
      .spyOn(
        (await import("node:fs")) as typeof import("node:fs"),
        "writeFileSync",
      )
      .mockImplementation((path, data, ...rest) => {
        if (typeof path === "string" && path === sessionsFile) {
          throw new Error("Permission denied");
        }
        return origWrite(path, data as any, ...(rest as any));
      });

    const { SessionManager } = await import("../daemon/session/manager.js");
    const manager = new SessionManager();
    // Should not throw even if disk write fails
    expect(() => manager.set("kodemeio", "sess-fail")).not.toThrow();

    mockWrite.mockRestore();
  });
});
