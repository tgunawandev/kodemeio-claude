// =============================================================================
// cron.loader.test.ts — Tests for JobLoader
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
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

describe("JobLoader", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(tmpdir(), `jobs-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.resetModules();
  });

  async function getLoader(dir?: string) {
    const { JobLoader } = await import("../daemon/cron/loader.js");
    return new JobLoader(dir ?? tmpDir);
  }

  function makeJobFile(
    dir: string,
    filename: string,
    frontmatter: Record<string, any>,
    body: string = "Do the job.",
  ) {
    const lines = ["---"];
    for (const [key, val] of Object.entries(frontmatter)) {
      if (Array.isArray(val)) {
        lines.push(`${key}:`);
        for (const item of val) {
          lines.push(`  - ${item}`);
        }
      } else {
        lines.push(`${key}: ${val}`);
      }
    }
    lines.push("---");
    lines.push("");
    lines.push(body);
    writeFileSync(join(dir, filename), lines.join("\n"));
  }

  it("returns empty array when jobs directory does not exist", async () => {
    const loader = await getLoader("/nonexistent/jobs");
    const jobs = loader.scanJobs();
    expect(jobs).toEqual([]);
  });

  it("scans and parses a valid job file", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(
      subDir,
      "daily-check.md",
      {
        schedule: "0 9 * * *",
        workspace: "kodemeio",
        name: "Daily Check",
        priority: "medium",
        timeout_minutes: 15,
        forward_to_telegram: false,
      },
      "Run the daily health check.",
    );

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();

    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.name).toBe("Daily Check");
    expect(job.schedule).toBe("0 9 * * *");
    expect(job.workspace).toBe("kodemeio");
    expect(job.priority).toBe("medium");
    expect(job.timeout_minutes).toBe(15);
    expect(job.prompt).toBe("Run the daily health check.");
    expect(job.enabled).toBe(true);
    expect(job.one_shot).toBe(false);
    expect(job.forward_to_telegram).toBe(false);
  });

  it("uses filename (without .md) as job name when name not in frontmatter", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "my-job.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
    });

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs[0].name).toBe("my-job");
  });

  it("skips files missing required fields schedule or workspace", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    // Missing schedule
    makeJobFile(subDir, "bad1.md", { workspace: "kodemeio" });
    // Missing workspace
    makeJobFile(subDir, "bad2.md", { schedule: "0 * * * *" });

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs).toHaveLength(0);
  });

  it("skips non-.md files in directory", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "README.txt"), "not a job");
    writeFileSync(join(subDir, "config.json"), "{}");
    makeJobFile(subDir, "valid.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
    });

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs).toHaveLength(1);
  });

  it("defaults enabled=true when not specified in frontmatter", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "job.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
    });

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs[0].enabled).toBe(true);
  });

  it("respects enabled=false from frontmatter", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "disabled.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
      enabled: false,
    });

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs[0].enabled).toBe(false);
  });

  it("defaults priority to medium and timeout to 10 when not set", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "job.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
    });

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs[0].priority).toBe("medium");
    expect(jobs[0].timeout_minutes).toBe(10);
  });

  it("uses cache on repeated scan when file unchanged", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "cached.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
    });

    const loader = await getLoader(subDir);
    const first = loader.scanJobs();
    const second = loader.scanJobs();
    expect(first[0].name).toBe(second[0].name);
  });

  it("disableJob sets enabled=false in the file", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "oneshot.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
      enabled: true,
      one_shot: true,
    });

    const loader = await getLoader(subDir);
    const filePath = join(subDir, "oneshot.md");
    loader.disableJob(filePath);

    // Re-scan should now show enabled=false
    const jobs = loader.scanJobs();
    expect(jobs[0].enabled).toBe(false);
  });

  it("disableJob invalidates cache", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    makeJobFile(subDir, "job.md", {
      schedule: "0 * * * *",
      workspace: "kodemeio",
      one_shot: true,
    });

    const loader = await getLoader(subDir);
    loader.scanJobs(); // prime cache
    const filePath = join(subDir, "job.md");
    loader.disableJob(filePath);

    // Cache should be cleared
    expect((loader as any).cache.has(filePath)).toBe(false);
  });

  it("disableJob logs error for nonexistent file without throwing", async () => {
    const loader = await getLoader();
    expect(() => loader.disableJob("/nonexistent/file.md")).not.toThrow();
  });

  it("handles parse errors for malformed job files without crashing", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    // Write a file that gray-matter can parse but triggers issues
    writeFileSync(join(subDir, "broken.md"), "---\n!!invalid yaml: [\n---\n");

    const loader = await getLoader(subDir);
    // Should not throw, just skip
    const jobs = loader.scanJobs();
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("includes tools from frontmatter", async () => {
    const subDir = join(tmpDir, `j-${randomUUID()}`);
    mkdirSync(subDir, { recursive: true });
    writeFileSync(
      join(subDir, "tools-job.md"),
      "---\nschedule: '0 * * * *'\nworkspace: kodemeio\ntools:\n  - Read\n  - Bash\n---\n\nRun me.",
    );

    const loader = await getLoader(subDir);
    const jobs = loader.scanJobs();
    expect(jobs[0].tools).toEqual(["Read", "Bash"]);
  });
});
