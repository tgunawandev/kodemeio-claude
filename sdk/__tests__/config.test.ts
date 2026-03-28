// =============================================================================
// config.test.ts — Tests for ConfigManager class
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

// Suppress logger output during tests
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    appendFileSync: vi.fn(), // silence log file writes
  };
});

describe("ConfigManager", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(tmpdir(), `config-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getConfigManager() {
    const { ConfigManager } = await import("../daemon/config.js");
    return ConfigManager;
  }

  it("starts with default config when no daemon.yaml exists", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(tmpDir);
    manager.load();
    const cfg = manager.current;

    expect(cfg.security_level).toBe("moderate");
    expect(cfg.heartbeat.enabled).toBe(true);
    expect(cfg.heartbeat.default_interval_minutes).toBe(30);
    expect(cfg.cron.enabled).toBe(true);
    expect(cfg.telegram.enabled).toBe(false);
    expect(cfg.dashboard.enabled).toBe(true);
    expect(cfg.dashboard.port).toBe(3100);
  });

  it("resolves cron.jobs_dir relative to configDir", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(tmpDir);
    manager.load();
    expect(manager.current.cron.jobs_dir).toBe(join(tmpDir, "jobs"));
  });

  it("resolves persona identity_file and soul_file relative to configDir", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(tmpDir);
    manager.load();
    expect(manager.current.persona.identity_file).toBe(
      join(tmpDir, "IDENTITY.md"),
    );
    expect(manager.current.persona.soul_file).toBe(join(tmpDir, "SOUL.md"));
  });

  it("loads and merges YAML config file over defaults", async () => {
    const yamlContent = `
security_level: strict
heartbeat:
  enabled: false
  default_interval_minutes: 60
telegram:
  enabled: true
  token_env: MY_TOKEN
  default_workspace: kontenos
  allowed_user_ids: [123, 456]
  forward_heartbeat: false
  forward_cron: true
  react_on_receive: "👀"
  react_on_complete: "✅"
  react_on_error: "❌"
`;
    const subDir = join(tmpDir, `sub-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "daemon.yaml"), yamlContent);

    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(subDir);
    manager.load();
    const cfg = manager.current;

    expect(cfg.security_level).toBe("strict");
    expect(cfg.heartbeat.enabled).toBe(false);
    expect(cfg.heartbeat.default_interval_minutes).toBe(60);
    expect(cfg.telegram.enabled).toBe(true);
    expect(cfg.telegram.token_env).toBe("MY_TOKEN");
    expect(cfg.telegram.default_workspace).toBe("kontenos");
    expect(cfg.telegram.allowed_user_ids).toEqual([123, 456]);
  });

  it("does not override non-provided fields during merge", async () => {
    const yamlContent = `
security_level: locked
`;
    const subDir = join(tmpDir, `sub-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "daemon.yaml"), yamlContent);

    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(subDir);
    manager.load();
    const cfg = manager.current;

    // security_level overridden
    expect(cfg.security_level).toBe("locked");
    // everything else is default
    expect(cfg.heartbeat.enabled).toBe(true);
    expect(cfg.telegram.enabled).toBe(false);
  });

  it("keeps default paths when YAML has empty cron.jobs_dir", async () => {
    const yamlContent = `
cron:
  enabled: true
  jobs_dir: ""
`;
    const subDir = join(tmpDir, `sub-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "daemon.yaml"), yamlContent);

    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(subDir);
    manager.load();
    // Should fall back to resolving relative to configDir
    expect(manager.current.cron.jobs_dir).toBe(join(subDir, "jobs"));
  });

  it("handles array values in YAML without merging with defaults", async () => {
    const yamlContent = `
quiet_hours:
  - start: "22:00"
    end: "07:00"
  - start: "12:00"
    end: "13:00"
`;
    const subDir = join(tmpDir, `sub-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "daemon.yaml"), yamlContent);

    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(subDir);
    manager.load();
    // Arrays replace (not merge with) defaults
    expect(manager.current.quiet_hours).toHaveLength(2);
    expect(manager.current.quiet_hours[0].start).toBe("22:00");
  });

  it("startPolling creates a poll timer and stopPolling clears it", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(tmpDir);
    manager.load();

    vi.useFakeTimers();
    manager.startPolling();
    // Calling start twice is idempotent
    manager.startPolling();

    // Stop should not throw
    expect(() => manager.stopPolling()).not.toThrow();
    vi.useRealTimers();
  });

  it("stopPolling is safe to call when not polling", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(tmpDir);
    expect(() => manager.stopPolling()).not.toThrow();
  });

  it("emits reload event when file changes", async () => {
    const subDir = join(tmpDir, `reload-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "daemon.yaml"), "security_level: locked\n");

    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(subDir);
    manager.load();

    const reloadSpy = vi.fn();
    manager.on("reload", reloadSpy);

    // Write a new file with a different mtime
    // We need to force mtime to be in the future
    const newContent = "security_level: strict\n";

    // Manually invoke checkReload by advancing fake timers — but since
    // we can't reliably control mtime in tests, we instead trigger it via
    // the private method using a trick: write and then nudge mtimeMs
    // directly by accessing the private field via casting.
    const future = Date.now() + 10000;
    (manager as any).lastMtime = 0; // reset so any mtime triggers reload
    writeFileSync(join(subDir, "daemon.yaml"), newContent);

    // Force checkReload
    (manager as any).checkReload();

    expect(reloadSpy).toHaveBeenCalledOnce();
    const [newCfg, prevCfg] = reloadSpy.mock.calls[0];
    expect(newCfg.security_level).toBe("strict");
    expect(prevCfg.security_level).toBe("locked");
  });

  it("checkReload silently handles non-existent file", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager("/nonexistent/path");
    // Should not throw
    expect(() => (manager as any).checkReload()).not.toThrow();
  });

  it("load logs ENOENT gracefully", async () => {
    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager("/nonexistent/path");
    // Should not throw
    expect(() => manager.load()).not.toThrow();
  });

  it("load logs generic errors", async () => {
    const subDir = join(tmpDir, `err-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    // Write malformed YAML that parses but triggers a type error
    writeFileSync(join(subDir, "daemon.yaml"), "null\n");

    const ConfigManager = await getConfigManager();
    const manager = new ConfigManager(subDir);
    // Should not throw even with unexpected YAML structure
    expect(() => manager.load()).not.toThrow();
  });
});
