// =============================================================================
// telegram.router.test.ts — Tests for routeMessage and setWorkspaceOverride
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

describe("telegram/router", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function getRouter() {
    return import("../daemon/telegram/router.js");
  }

  it("routes to defaultWorkspace when no prefix or override", async () => {
    const { routeMessage } = await getRouter();
    const result = routeMessage(1, "fix the bug", "kodemeio");
    expect(result.workspace).toBe("kodemeio");
    expect(result.prompt).toBe("fix the bug");
  });

  it("routes to @workspace from prefix", async () => {
    const { routeMessage } = await getRouter();
    const result = routeMessage(1, "@kontenos fix the login", "kodemeio");
    expect(result.workspace).toBe("kontenos");
    expect(result.prompt).toBe("fix the login");
  });

  it("trims whitespace from prompt after @workspace prefix", async () => {
    const { routeMessage } = await getRouter();
    const result = routeMessage(1, "@kontenos   run tests", "kodemeio");
    expect(result.prompt).toBe("run tests");
  });

  it("falls through to default when @prefix is unknown workspace", async () => {
    const { routeMessage } = await getRouter();
    const result = routeMessage(1, "@unknownws do something", "kodemeio");
    expect(result.workspace).toBe("kodemeio");
    expect(result.prompt).toBe("@unknownws do something");
  });

  it("setWorkspaceOverride returns true for valid workspace", async () => {
    const { setWorkspaceOverride } = await getRouter();
    const ok = setWorkspaceOverride(42, "kontenos");
    expect(ok).toBe(true);
  });

  it("setWorkspaceOverride returns false for invalid workspace", async () => {
    const { setWorkspaceOverride } = await getRouter();
    const ok = setWorkspaceOverride(42, "nonexistent");
    expect(ok).toBe(false);
  });

  it("override routes message to set workspace and is consumed on use", async () => {
    const { routeMessage, setWorkspaceOverride } = await getRouter();
    setWorkspaceOverride(99, "journaltx");

    const first = routeMessage(99, "some task", "kodemeio");
    expect(first.workspace).toBe("journaltx");
    expect(first.prompt).toBe("some task");

    // Override should be consumed — second call uses default
    const second = routeMessage(99, "another task", "kodemeio");
    expect(second.workspace).toBe("kodemeio");
  });

  it("expired override is cleaned up and falls through to default", async () => {
    vi.useFakeTimers();
    const { routeMessage, setWorkspaceOverride } = await getRouter();
    setWorkspaceOverride(77, "infra");

    // Advance time past 5 minute expiry
    vi.advanceTimersByTime(6 * 60 * 1000);

    const result = routeMessage(77, "my task", "kodemeio");
    expect(result.workspace).toBe("kodemeio");

    vi.useRealTimers();
  });

  it("@workspace prefix takes priority over override", async () => {
    const { routeMessage, setWorkspaceOverride } = await getRouter();
    setWorkspaceOverride(55, "infra");

    // @prefix overrides the per-user override
    const result = routeMessage(55, "@kontenos task", "kodemeio");
    expect(result.workspace).toBe("kontenos");
  });

  it("multiline prompt is preserved after @workspace prefix", async () => {
    const { routeMessage } = await getRouter();
    const multiline = "@kodemeio fix the\nbug on line 42";
    const result = routeMessage(1, multiline, "infra");
    expect(result.workspace).toBe("kodemeio");
    expect(result.prompt).toContain("fix the\nbug on line 42");
  });

  it("getAvailableWorkspaces returns all workspace names", async () => {
    const { getAvailableWorkspaces } = await getRouter();
    const workspaces = getAvailableWorkspaces();
    expect(workspaces).toContain("kodemeio");
    expect(workspaces).toContain("kontenos");
    expect(workspaces).toContain("journaltx");
    expect(workspaces).toContain("kidneuro");
    expect(workspaces).toContain("infra");
    expect(workspaces).toContain("core");
    expect(workspaces).toHaveLength(6);
  });
});
