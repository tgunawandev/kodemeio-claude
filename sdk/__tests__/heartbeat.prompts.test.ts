// =============================================================================
// heartbeat.prompts.test.ts — Tests for PromptLoader
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

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

describe("PromptLoader", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(tmpdir(), `prompts-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.resetModules();
  });

  async function getLoader(dir?: string) {
    const { PromptLoader } = await import("../daemon/heartbeat/prompts.js");
    return new PromptLoader(dir ?? tmpDir);
  }

  it("returns default prompt when workspace file does not exist", async () => {
    const loader = await getLoader();
    const prompt = loader.getPrompt("nonexistent");
    expect(prompt).toContain("git status");
    expect(prompt).toContain("automated heartbeat");
  });

  it("loads prompt from workspace.md file", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "kodemeio.md"), "Check the deploy pipeline.");

    const loader = await getLoader(subDir);
    const prompt = loader.getPrompt("kodemeio");
    expect(prompt).toBe("Check the deploy pipeline.");
  });

  it("loads prompt from overrideFile when provided", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "custom.md"), "Custom prompt content.");

    const loader = await getLoader(subDir);
    const prompt = loader.getPrompt("kodemeio", "custom.md");
    expect(prompt).toBe("Custom prompt content.");
  });

  it("uses cache on repeated call with unchanged file", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "ws.md"), "Cached content.");

    const loader = await getLoader(subDir);
    const first = loader.getPrompt("ws");
    const second = loader.getPrompt("ws");
    expect(first).toBe(second);
    expect(first).toBe("Cached content.");
  });

  it("reloads when file is newer than cache", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    const filePath = join(subDir, "ws.md");
    writeFileSync(filePath, "Original content.");

    const loader = await getLoader(subDir);
    loader.getPrompt("ws"); // prime cache

    // Force cache to be stale by resetting its mtime entry
    (loader as any).cache.clear();
    writeFileSync(filePath, "Updated content.");

    const result = loader.getPrompt("ws");
    expect(result).toBe("Updated content.");
  });

  it("interpolates {{workspace}} placeholder", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "myws.md"), "Check {{workspace}} status.");

    const loader = await getLoader(subDir);
    const prompt = loader.getPrompt("myws");
    expect(prompt).toContain("Check myws status.");
    expect(prompt).not.toContain("{{workspace}}");
  });

  it("interpolates {{datetime}} placeholder with a non-empty string", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "ws.md"), "Now: {{datetime}}");

    const loader = await getLoader(subDir);
    const prompt = loader.getPrompt("ws");
    expect(prompt).not.toContain("{{datetime}}");
    expect(prompt.startsWith("Now: ")).toBe(true);
    expect(prompt.length).toBeGreaterThan("Now: ".length);
  });

  it("interpolates {{date}} placeholder", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "ws.md"), "Date: {{date}}");

    const loader = await getLoader(subDir);
    const prompt = loader.getPrompt("ws");
    expect(prompt).not.toContain("{{date}}");
  });

  it("interpolates {{time}} placeholder", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "ws.md"), "Time: {{time}}");

    const loader = await getLoader(subDir);
    const prompt = loader.getPrompt("ws");
    expect(prompt).not.toContain("{{time}}");
  });

  it("listAvailable returns .md filenames without extension", async () => {
    const subDir = join(tmpDir, `p-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "ws1.md"), "");
    writeFileSync(join(subDir, "ws2.md"), "");
    writeFileSync(join(subDir, "notmd.txt"), "");

    const loader = await getLoader(subDir);
    const available = loader.listAvailable();
    expect(available).toContain("ws1");
    expect(available).toContain("ws2");
    expect(available).not.toContain("notmd");
    expect(available).not.toContain("notmd.txt");
  });

  it("listAvailable returns empty array when dir does not exist", async () => {
    const loader = await getLoader("/nonexistent/prompts");
    const available = loader.listAvailable();
    expect(available).toEqual([]);
  });

  it("default prompt also has workspace interpolated", async () => {
    const loader = await getLoader("/nonexistent");
    const prompt = loader.getPrompt("myws");
    // Default prompt doesn't have {{workspace}} but should not crash
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });
});
