// =============================================================================
// logger.test.ts — Tests for createLogger function
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to control env vars before the module loads its constants.
// We mock fs so we can verify file writes without touching the disk.
vi.mock("node:fs", () => ({
  appendFileSync: vi.fn(),
}));

describe("createLogger", () => {
  let appendFileSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const fs = await import("node:fs");
    appendFileSync = fs.appendFileSync as ReturnType<typeof vi.fn>;
    appendFileSync.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with debug/info/warn/error methods", async () => {
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("test");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("info level writes JSON line to log file", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    process.env.DAEMON_LOG_FILE = "/tmp/test-daemon.log";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("mySubsystem");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello world");

    expect(appendFileSync).toHaveBeenCalledOnce();
    const [filePath, line] = appendFileSync.mock.calls[0];
    expect(filePath).toBe("/tmp/test-daemon.log");
    const parsed = JSON.parse(line.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.sub).toBe("mySubsystem");
    expect(parsed.msg).toBe("hello world");
    expect(typeof parsed.ts).toBe("string");

    consoleSpy.mockRestore();
  });

  it("includes extra data fields in JSON output", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("with data", { key: "value", count: 42 });

    const [, line] = appendFileSync.mock.calls[0];
    const parsed = JSON.parse(line.trim());
    expect(parsed.key).toBe("value");
    expect(parsed.count).toBe(42);

    consoleSpy.mockRestore();
  });

  it("debug messages are suppressed when level is info", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.debug("this should not appear");

    expect(appendFileSync).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("debug messages appear when DAEMON_LOG_LEVEL is debug", async () => {
    process.env.DAEMON_LOG_LEVEL = "debug";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.debug("debug msg");

    expect(appendFileSync).toHaveBeenCalledOnce();
    const [, line] = appendFileSync.mock.calls[0];
    const parsed = JSON.parse(line.trim());
    expect(parsed.level).toBe("debug");

    consoleSpy.mockRestore();
  });

  it("warn uses console.warn", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("warning message");

    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("error uses console.error", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("error message");

    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("silently ignores file write errors", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    appendFileSync.mockImplementationOnce(() => {
      throw new Error("disk full");
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Should not throw
    expect(() => logger.info("msg")).not.toThrow();

    consoleSpy.mockRestore();
  });

  it("info console call includes subsystem and message", async () => {
    process.env.DAEMON_LOG_LEVEL = "info";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("mySub");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[mySub] test message",
      expect.any(String),
    );

    consoleSpy.mockRestore();
  });

  it("does not write debug to file when level is warn", async () => {
    process.env.DAEMON_LOG_LEVEL = "warn";
    const { createLogger } = await import("../daemon/logger.js");
    const logger = createLogger("sub");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.debug("no");
    logger.info("no");
    logger.warn("yes");

    expect(appendFileSync).toHaveBeenCalledOnce();
    const [, line] = appendFileSync.mock.calls[0];
    expect(JSON.parse(line.trim()).level).toBe("warn");

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
