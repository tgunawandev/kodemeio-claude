// =============================================================================
// heartbeat.runner.test.ts — Tests for HeartbeatRunner
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

import type { DaemonConfig, QuietWindow } from "../daemon/types.js";

function makeConfig(
  overrides: Partial<DaemonConfig["heartbeat"]> = {},
  quietHours: QuietWindow[] = [],
): DaemonConfig {
  return {
    timezone: "UTC",
    security_level: "moderate",
    quiet_hours: quietHours,
    heartbeat: {
      enabled: true,
      default_interval_minutes: 30,
      workspaces: {},
      ...overrides,
    },
    cron: { enabled: false, jobs_dir: "/tmp" },
    telegram: {
      enabled: false,
      token_env: "T",
      default_workspace: "kodemeio",
      allowed_user_ids: [],
      forward_heartbeat: false,
      forward_cron: false,
      react_on_receive: "👀",
      react_on_complete: "✅",
      react_on_error: "❌",
    },
    dashboard: { enabled: false, port: 3100 },
    session: {
      max_turns_before_compact: 25,
      compaction_prompt: "summarize",
      timeout_minutes: 5,
    },
    persona: { enabled: false, identity_file: "", soul_file: "" },
    voice: {
      stt_providers: [],
      tts_enabled: false,
      tts_provider: "none",
      tts_model: "tts-1",
      tts_voice: "onyx",
      voice_back_triggers: [],
    },
  };
}

describe("HeartbeatRunner", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function makeRunner(config: DaemonConfig) {
    // Mock the queue
    const enqueueMock = vi.fn().mockReturnValue({ id: "task-1" });
    const mockQueue = { enqueue: enqueueMock };

    const { HeartbeatRunner } = await import("../daemon/heartbeat/runner.js");
    const runner = new HeartbeatRunner(() => config, mockQueue as any, "/tmp");
    return { runner, enqueueMock };
  }

  it("start schedules timers for all enabled workspaces", async () => {
    const config = makeConfig();
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();

    // Advance time by default interval (30 min)
    vi.advanceTimersByTime(30 * 60 * 1000);

    // Should have fired heartbeats for all 6 WORKSPACES
    expect(enqueueMock).toHaveBeenCalled();
    const calls = enqueueMock.mock.calls;
    expect(calls[0][0].source).toBe("heartbeat");
    expect(calls[0][0].priority).toBe("low");

    runner.stop();
  });

  it("stop clears all timers so no more firings", async () => {
    const config = makeConfig();
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();
    runner.stop();

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("restart stops and reschedules", async () => {
    const config = makeConfig();
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();
    runner.restart();

    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(enqueueMock).toHaveBeenCalled();

    runner.stop();
  });

  it("skips disabled workspaces", async () => {
    const config = makeConfig({
      workspaces: {
        kodemeio: { enabled: false },
      },
    });
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    // kodemeio should NOT be in any calls
    const workspaces = enqueueMock.mock.calls.map((c) => c[0].workspace);
    expect(workspaces).not.toContain("kodemeio");

    runner.stop();
  });

  it("uses workspace-specific interval when set", async () => {
    const config = makeConfig({
      default_interval_minutes: 60,
      workspaces: {
        kodemeio: { interval_minutes: 5 },
      },
    });
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();
    // Advance only 5 min — kodemeio should fire but not others (60 min interval)
    vi.advanceTimersByTime(5 * 60 * 1000);

    const workspaces = enqueueMock.mock.calls.map((c) => c[0].workspace);
    expect(workspaces).toContain("kodemeio");

    runner.stop();
  });

  it("skips firing during quiet hours (overnight window)", async () => {
    // Set quiet hours covering all day: 00:00 - 23:59
    const alwaysQuiet: QuietWindow[] = [{ start: "00:00", end: "23:59" }];
    const config = makeConfig({}, alwaysQuiet);
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(enqueueMock).not.toHaveBeenCalled();

    runner.stop();
  });

  it("fires during non-quiet hours (daytime window)", async () => {
    // Set quiet hours that cover overnight only (23:00 - 06:00)
    // Tests run in UTC so we control what "now" looks like by
    // checking that at 12:00 UTC the heartbeat fires
    const quietHours: QuietWindow[] = [{ start: "23:00", end: "06:00" }];
    const config = makeConfig({}, quietHours);

    // Set fake time to noon UTC (outside quiet hours)
    const noon = new Date("2025-01-15T12:00:00.000Z");
    vi.setSystemTime(noon);

    const { runner, enqueueMock } = await makeRunner(config);
    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(enqueueMock).toHaveBeenCalled();

    runner.stop();
  });

  it("isQuietHour returns true for overnight window at night", async () => {
    // Set fake time to 01:00 UTC — inside 23:00-06:00 window
    const night = new Date("2025-01-15T01:00:00.000Z");
    vi.setSystemTime(night);

    const quietHours: QuietWindow[] = [{ start: "23:00", end: "06:00" }];
    const config = makeConfig({}, quietHours);
    const { runner, enqueueMock } = await makeRunner(config);

    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(enqueueMock).not.toHaveBeenCalled();

    runner.stop();
  });

  it("respects day filter in quiet hours", async () => {
    // Quiet only on Sunday (day 0) all day
    const quietHours: QuietWindow[] = [
      { days: [0], start: "00:00", end: "23:59" },
    ];
    const config = makeConfig({}, quietHours);

    // Set time to a Monday noon
    const monday = new Date("2025-01-13T12:00:00.000Z"); // Monday
    vi.setSystemTime(monday);

    const { runner, enqueueMock } = await makeRunner(config);
    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    // Monday is not in the quiet hours day filter, so it should fire
    expect(enqueueMock).toHaveBeenCalled();

    runner.stop();
  });

  it("quiet hours with day filter suppresses on matching day", async () => {
    // Quiet on Monday (day 1) all day
    const quietHours: QuietWindow[] = [
      { days: [1], start: "00:00", end: "23:59" },
    ];
    const config = makeConfig({}, quietHours);

    // Set time to a Monday noon UTC
    const monday = new Date("2025-01-13T12:00:00.000Z"); // Monday
    vi.setSystemTime(monday);

    const { runner, enqueueMock } = await makeRunner(config);
    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(enqueueMock).not.toHaveBeenCalled();

    runner.stop();
  });
});
