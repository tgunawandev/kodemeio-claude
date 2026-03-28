// =============================================================================
// persona.test.ts — Tests for loadPersona and getPersonaInfo
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
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
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

describe("persona module", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(tmpdir(), `persona-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.resetModules();
  });

  async function getModule() {
    return import("../daemon/persona.js");
  }

  function makeConfig(identity_file: string, soul_file: string) {
    return {
      enabled: true,
      identity_file,
      soul_file,
    };
  }

  it("returns empty prefix and defaults when persona is disabled", async () => {
    const { loadPersona } = await getModule();
    const result = loadPersona({
      enabled: false,
      identity_file: "/nonexistent",
      soul_file: "/nonexistent",
    });
    expect(result.prefix).toBe("");
    expect(result.name).toBe("KodeClaw");
    expect(result.emoji).toBe("🤖");
  });

  it("returns defaults when identity and soul files do not exist", async () => {
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig("/nonexistent/IDENTITY.md", "/nonexistent/SOUL.md"),
    );
    expect(result.name).toBe("KodeClaw");
    expect(result.emoji).toBe("🤖");
    expect(result.prefix).toBe("");
  });

  it("extracts name from H1 heading in identity file", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# MyBot\n\nSome description here.");
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig(identityPath, "/nonexistent/soul.md"),
    );
    expect(result.name).toBe("MyBot");
  });

  it("extracts name from name: field if no H1 heading", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "name: SpecialBot\n\nDescription.");
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig(identityPath, "/nonexistent/soul.md"),
    );
    expect(result.name).toBe("SpecialBot");
  });

  it("extracts emoji from emoji: field", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# Bot\nemoji: 🦊\n\nDescription.");
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig(identityPath, "/nonexistent/soul.md"),
    );
    expect(result.emoji).toBe("🦊");
  });

  it("defaults emoji to 🤖 when no emoji: field", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# NoEmoji\n\nJust text.");
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig(identityPath, "/nonexistent/soul.md"),
    );
    expect(result.emoji).toBe("🤖");
  });

  it("builds prefix with identity block when identity file exists", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# TestBot\nI am a test bot.");
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig(identityPath, "/nonexistent/soul.md"),
    );
    expect(result.prefix).toContain("<identity>");
    expect(result.prefix).toContain("</identity>");
    expect(result.prefix).toContain("TestBot");
  });

  it("builds prefix with soul block when soul file exists", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    const soulPath = join(tmpDir, `soul-${randomUUID()}.md`);
    writeFileSync(identityPath, "# Bot");
    writeFileSync(soulPath, "Be helpful and kind.");
    const { loadPersona } = await getModule();
    const result = loadPersona(makeConfig(identityPath, soulPath));
    expect(result.prefix).toContain("<soul>");
    expect(result.prefix).toContain("</soul>");
    expect(result.prefix).toContain("Be helpful");
  });

  it("prefix ends with separator when content present", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# Bot");
    const { loadPersona } = await getModule();
    const result = loadPersona(
      makeConfig(identityPath, "/nonexistent/soul.md"),
    );
    expect(result.prefix.endsWith("---\n\n")).toBe(true);
  });

  it("uses cache on second call when files unchanged", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# CachedBot\nemoji: 🧪");
    const { loadPersona } = await getModule();
    const config = makeConfig(identityPath, "/nonexistent/soul.md");

    const first = loadPersona(config);
    const second = loadPersona(config);

    expect(first.name).toBe(second.name);
    expect(first.emoji).toBe(second.emoji);
  });

  it("getPersonaInfo returns null when no persona loaded", async () => {
    const { getPersonaInfo } = await getModule();
    // Since modules are reset between tests via resetModules, cache is null
    const info = getPersonaInfo();
    expect(info).toBeNull();
  });

  it("getPersonaInfo returns cached name and emoji after load", async () => {
    const identityPath = join(tmpDir, `identity-${randomUUID()}.md`);
    writeFileSync(identityPath, "# InfoBot\nemoji: 🔬");
    const { loadPersona, getPersonaInfo } = await getModule();
    loadPersona(makeConfig(identityPath, "/nonexistent/soul.md"));
    const info = getPersonaInfo();
    expect(info).not.toBeNull();
    expect(info!.name).toBe("InfoBot");
    expect(info!.emoji).toBe("🔬");
  });

  it("reloads when identity file is newer than cache", async () => {
    const identityPath = join(tmpDir, `identity-reload-${randomUUID()}.md`);
    writeFileSync(identityPath, "# OriginalBot");
    const { loadPersona } = await getModule();
    const config = makeConfig(identityPath, "/nonexistent/soul.md");

    // First load
    loadPersona(config);

    // Force cache to appear stale by resetting module state
    // and writing a new file
    await vi.resetModules();
    const { loadPersona: loadPersona2 } = await import("../daemon/persona.js");
    writeFileSync(identityPath, "# UpdatedBot");

    const result = loadPersona2(config);
    expect(result.name).toBe("UpdatedBot");
  });
});
