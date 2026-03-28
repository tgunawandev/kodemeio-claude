// =============================================================================
// types.test.ts — Tests for WORKSPACES constant and type exports
// =============================================================================

import { describe, it, expect } from "vitest";
import { WORKSPACES } from "../daemon/types.js";

describe("WORKSPACES constant", () => {
  it("contains 6 workspaces", () => {
    expect(WORKSPACES).toHaveLength(6);
  });

  it("each workspace has required fields", () => {
    for (const ws of WORKSPACES) {
      expect(ws).toHaveProperty("name");
      expect(ws).toHaveProperty("path");
      expect(ws).toHaveProperty("company");
      expect(typeof ws.name).toBe("string");
      expect(typeof ws.path).toBe("string");
      expect(typeof ws.company).toBe("string");
    }
  });

  it("includes kodemeio workspace", () => {
    const ws = WORKSPACES.find((w) => w.name === "kodemeio");
    expect(ws).toBeDefined();
    expect(ws!.path).toBe("/opt/dev/kodemeio-app");
    expect(ws!.company).toBe("Kodemeio");
  });

  it("includes kontenos workspace", () => {
    const ws = WORKSPACES.find((w) => w.name === "kontenos");
    expect(ws).toBeDefined();
  });

  it("includes journaltx workspace", () => {
    const ws = WORKSPACES.find((w) => w.name === "journaltx");
    expect(ws).toBeDefined();
  });

  it("includes kidneuro workspace", () => {
    const ws = WORKSPACES.find((w) => w.name === "kidneuro");
    expect(ws).toBeDefined();
  });

  it("includes infra workspace", () => {
    const ws = WORKSPACES.find((w) => w.name === "infra");
    expect(ws).toBeDefined();
    expect(ws!.path).toBe("/opt/dev/kodemeio-infra");
  });

  it("includes core workspace", () => {
    const ws = WORKSPACES.find((w) => w.name === "core");
    expect(ws).toBeDefined();
    expect(ws!.path).toBe("/opt/dev/kodemeio-core");
  });

  it("all workspace names are unique", () => {
    const names = WORKSPACES.map((w) => w.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
