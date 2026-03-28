// =============================================================================
// cron.scheduler.test.ts — Tests for CronScheduler (mocks cron library)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

// ─── cron mock — must use constructor function syntax ──────────────────────
const mockCronJobStop = vi.fn();

vi.mock("cron", () => {
  const CronJob = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    schedule: string,
    callback: () => void,
  ) {
    this.stop = mockCronJobStop;
    this.schedule = schedule;
    this.callback = callback;
  });
  return { CronJob };
});

// ─── JobLoader mock — must use constructor function syntax ─────────────────
const mockScanJobs = vi.fn();
const mockDisableJob = vi.fn();

vi.mock("../daemon/cron/loader.js", () => {
  const JobLoader = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    jobsDir: string,
  ) {
    this.scanJobs = mockScanJobs;
    this.disableJob = mockDisableJob;
    this.getJobsDir = vi.fn().mockReturnValue(jobsDir || "/tmp/jobs");
  });
  return { JobLoader };
});

import type { DaemonConfig, JobDefinition } from "../daemon/types.js";

const DEFAULT_CONFIG: DaemonConfig = {
  timezone: "UTC",
  security_level: "moderate",
  quiet_hours: [],
  heartbeat: { enabled: false, default_interval_minutes: 30, workspaces: {} },
  cron: { enabled: true, jobs_dir: "/tmp/jobs" },
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

function makeJob(overrides: Partial<JobDefinition> = {}): JobDefinition {
  return {
    name: "test-job",
    schedule: "0 * * * *",
    workspace: "kodemeio",
    enabled: true,
    one_shot: false,
    priority: "medium",
    timeout_minutes: 10,
    forward_to_telegram: false,
    prompt: "Run the job.",
    file_path: "/tmp/jobs/test-job.md",
    ...overrides,
  };
}

describe("CronScheduler", () => {
  let enqueueMock: ReturnType<typeof vi.fn>;
  let mockQueue: any;
  let CronJobMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    mockCronJobStop.mockClear();
    mockScanJobs.mockClear();
    mockDisableJob.mockClear();

    // Re-import mock to get reference after resetModules
    const cronMod = await import("cron");
    CronJobMock = cronMod.CronJob as ReturnType<typeof vi.fn>;
    CronJobMock.mockClear();

    enqueueMock = vi.fn().mockReturnValue({ id: "task-1" });
    mockQueue = { enqueue: enqueueMock };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function makeScheduler(config = DEFAULT_CONFIG) {
    mockScanJobs.mockReturnValue([]);
    const { CronScheduler } = await import("../daemon/cron/scheduler.js");
    return new CronScheduler(() => config, mockQueue);
  }

  it("start calls syncJobs and sets up scan timer", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob();
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();

    // CronJob should have been constructed for the job
    expect(CronJobMock).toHaveBeenCalledWith(
      job.schedule,
      expect.any(Function),
      null,
      true,
      DEFAULT_CONFIG.timezone,
    );
  });

  it("stop clears scan timer and stops all active cron jobs", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob();
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();
    scheduler.stop();

    expect(mockCronJobStop).toHaveBeenCalled();
  });

  it("stop is safe to call when not started", async () => {
    const scheduler = await makeScheduler();
    expect(() => scheduler.stop()).not.toThrow();
  });

  it("getJobs returns active jobs from cache after start", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob();
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();
    const jobs = scheduler.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].name).toBe("test-job");
    scheduler.stop();
  });

  it("triggerJob enqueues the job immediately and returns true", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob({ name: "my-job" });
    mockScanJobs.mockReturnValue([job]);

    scheduler.start(); // populate activeJobs
    const triggered = scheduler.triggerJob("my-job");

    expect(triggered).toBe(true);
    expect(enqueueMock).toHaveBeenCalledWith({
      workspace: job.workspace,
      prompt: job.prompt,
      priority: job.priority,
      source: "cron",
      tools: job.tools,
    });
    scheduler.stop();
  });

  it("triggerJob returns false for unknown job name", async () => {
    const scheduler = await makeScheduler();
    mockScanJobs.mockReturnValue([]);

    expect(scheduler.triggerJob("no-such-job")).toBe(false);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("syncJobs removes jobs that are no longer enabled", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob();
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();

    // Now disable the job
    const disabledJob = makeJob({ enabled: false });
    mockScanJobs.mockReturnValue([disabledJob]);

    vi.advanceTimersByTime(30_000); // trigger scan timer

    // Should have stopped the active job
    expect(mockCronJobStop).toHaveBeenCalled();
  });

  it("syncJobs skips schedule recreation when schedule is unchanged", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob();
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();
    const callsAfterStart = CronJobMock.mock.calls.length;

    // Same job — schedule unchanged
    mockScanJobs.mockReturnValue([{ ...job, prompt: "Updated prompt" }]);
    vi.advanceTimersByTime(30_000);

    // No new CronJob created
    expect(CronJobMock.mock.calls.length).toBe(callsAfterStart);
  });

  it("syncJobs recreates cron job when schedule changes", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob({ schedule: "0 * * * *" });
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();
    const callsAfterStart = CronJobMock.mock.calls.length;

    // Changed schedule
    mockScanJobs.mockReturnValue([{ ...job, schedule: "0 0 * * *" }]);
    vi.advanceTimersByTime(30_000);

    // New CronJob should have been created
    expect(CronJobMock.mock.calls.length).toBeGreaterThan(callsAfterStart);
  });

  it("cron job callback enqueues task with correct source", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob();
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();

    // Find and fire the registered callback
    const lastCall = CronJobMock.mock.calls[CronJobMock.mock.calls.length - 1];
    const callback = lastCall[1] as () => void;
    callback();

    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: "kodemeio",
        source: "cron",
      }),
    );
  });

  it("one-shot job is disabled after execution", async () => {
    const scheduler = await makeScheduler();
    const job = makeJob({ one_shot: true });
    mockScanJobs.mockReturnValue([job]);

    scheduler.start();

    // Fire the callback manually
    const lastCall = CronJobMock.mock.calls[CronJobMock.mock.calls.length - 1];
    const callback = lastCall[1] as () => void;
    callback();

    expect(mockDisableJob).toHaveBeenCalledWith(job.file_path);
    expect(mockCronJobStop).toHaveBeenCalled();
  });

  it("logs error for invalid cron expression without crashing", async () => {
    // CronJob throws for invalid expression
    CronJobMock.mockImplementationOnce(() => {
      throw new Error("Invalid cron expression");
    });

    const scheduler = await makeScheduler();
    const job = makeJob({ schedule: "invalid" });
    mockScanJobs.mockReturnValue([job]);

    expect(() => scheduler.start()).not.toThrow();
  });

  it("uses job timezone when set, falls back to config timezone", async () => {
    const scheduler = await makeScheduler();
    const jobWithTz = makeJob({ timezone: "America/New_York" });
    const jobWithoutTz = makeJob({
      name: "no-tz",
      file_path: "/tmp/jobs/no-tz.md",
    });
    mockScanJobs.mockReturnValue([jobWithTz, jobWithoutTz]);

    scheduler.start();

    const tzArgs = CronJobMock.mock.calls.map((c) => c[4]);
    expect(tzArgs).toContain("America/New_York");
    expect(tzArgs).toContain(DEFAULT_CONFIG.timezone);
  });
});
