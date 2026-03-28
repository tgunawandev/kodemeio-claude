// =============================================================================
// security.test.ts — Tests for getAllowedTools and isToolAllowed
// =============================================================================

import { describe, it, expect } from "vitest";
import { getAllowedTools, isToolAllowed } from "../daemon/security.js";

describe("getAllowedTools", () => {
  describe("locked tier", () => {
    it("returns read-only tools for locked level", () => {
      const tools = getAllowedTools("locked");
      expect(tools).toEqual(["Read", "Glob", "Grep"]);
    });

    it("returns overrides when overrides are provided for locked", () => {
      const tools = getAllowedTools("locked", ["Read"]);
      expect(tools).toEqual(["Read"]);
    });
  });

  describe("strict tier", () => {
    it("returns read + execution tools for strict level", () => {
      const tools = getAllowedTools("strict");
      expect(tools).toContain("Read");
      expect(tools).toContain("Bash");
      expect(tools).toContain("WebFetch");
      expect(tools).toContain("WebSearch");
      expect(tools).not.toContain("Write");
      expect(tools).not.toContain("Edit");
    });
  });

  describe("moderate tier", () => {
    it("returns full set including Write and Edit for moderate level", () => {
      const tools = getAllowedTools("moderate");
      expect(tools).toContain("Read");
      expect(tools).toContain("Write");
      expect(tools).toContain("Edit");
      expect(tools).toContain("Bash");
    });
  });

  describe("unrestricted tier", () => {
    it("returns undefined for unrestricted level (no restriction)", () => {
      const tools = getAllowedTools("unrestricted");
      expect(tools).toBeUndefined();
    });

    it("returns overrides even for unrestricted when provided", () => {
      const tools = getAllowedTools("unrestricted", ["Read", "Bash"]);
      expect(tools).toEqual(["Read", "Bash"]);
    });
  });

  describe("overrides", () => {
    it("returns overrides instead of tier defaults when non-empty", () => {
      const overrides = ["CustomTool", "AnotherTool"];
      expect(getAllowedTools("strict", overrides)).toEqual(overrides);
      expect(getAllowedTools("locked", overrides)).toEqual(overrides);
      expect(getAllowedTools("moderate", overrides)).toEqual(overrides);
    });

    it("ignores empty overrides array and falls back to tier", () => {
      const tools = getAllowedTools("locked", []);
      expect(tools).toEqual(["Read", "Glob", "Grep"]);
    });

    it("ignores undefined overrides and falls back to tier", () => {
      const tools = getAllowedTools("locked", undefined);
      expect(tools).toEqual(["Read", "Glob", "Grep"]);
    });
  });
});

describe("isToolAllowed", () => {
  describe("locked tier", () => {
    it("allows Read in locked tier", () => {
      expect(isToolAllowed("Read", "locked")).toBe(true);
    });

    it("allows Glob in locked tier", () => {
      expect(isToolAllowed("Glob", "locked")).toBe(true);
    });

    it("allows Grep in locked tier", () => {
      expect(isToolAllowed("Grep", "locked")).toBe(true);
    });

    it("disallows Bash in locked tier", () => {
      expect(isToolAllowed("Bash", "locked")).toBe(false);
    });

    it("disallows Write in locked tier", () => {
      expect(isToolAllowed("Write", "locked")).toBe(false);
    });

    it("disallows Edit in locked tier", () => {
      expect(isToolAllowed("Edit", "locked")).toBe(false);
    });
  });

  describe("strict tier", () => {
    it("allows Bash in strict tier", () => {
      expect(isToolAllowed("Bash", "strict")).toBe(true);
    });

    it("disallows Write in strict tier", () => {
      expect(isToolAllowed("Write", "strict")).toBe(false);
    });

    it("disallows Edit in strict tier", () => {
      expect(isToolAllowed("Edit", "strict")).toBe(false);
    });
  });

  describe("moderate tier", () => {
    it("allows Write in moderate tier", () => {
      expect(isToolAllowed("Write", "moderate")).toBe(true);
    });

    it("allows Edit in moderate tier", () => {
      expect(isToolAllowed("Edit", "moderate")).toBe(true);
    });
  });

  describe("unrestricted tier", () => {
    it("allows any tool in unrestricted tier", () => {
      expect(isToolAllowed("Write", "unrestricted")).toBe(true);
      expect(isToolAllowed("AnyRandomTool", "unrestricted")).toBe(true);
      expect(isToolAllowed("Bash", "unrestricted")).toBe(true);
    });
  });
});
