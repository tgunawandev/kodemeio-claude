// =============================================================================
// cron/scheduler.ts — Cron job scheduler with hot-reload
// =============================================================================

import { CronJob } from "cron";
import { createLogger } from "../logger.js";
import { JobLoader } from "./loader.js";
import type { TaskQueue } from "../session/queue.js";
import type { DaemonConfig, JobDefinition } from "../types.js";

const log = createLogger("cron");

const SCAN_INTERVAL_MS = 30_000;

interface ActiveJob {
  definition: JobDefinition;
  cronJob: CronJob;
}

export class CronScheduler {
  private getConfig: () => DaemonConfig;
  private queue: TaskQueue;
  private loader: JobLoader;
  private activeJobs: Map<string, ActiveJob> = new Map();
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(getConfig: () => DaemonConfig, queue: TaskQueue) {
    this.getConfig = getConfig;
    const config = getConfig();
    this.loader = new JobLoader(config.cron.jobs_dir);
    this.queue = queue;
  }

  start(): void {
    this.syncJobs();
    this.scanTimer = setInterval(() => this.syncJobs(), SCAN_INTERVAL_MS);
    log.info("Cron scheduler started", { scan_interval_ms: SCAN_INTERVAL_MS });
  }

  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    for (const [name, active] of this.activeJobs) {
      active.cronJob.stop();
      log.debug("Cron job stopped", { name });
    }
    this.activeJobs.clear();
    log.info("Cron scheduler stopped");
  }

  getJobs(): JobDefinition[] {
    return [...this.activeJobs.values()].map((a) => a.definition);
  }

  triggerJob(name: string): boolean {
    const active = this.activeJobs.get(name);
    if (!active) return false;
    this.executeJob(active.definition);
    return true;
  }

  private syncJobs(): void {
    const config = this.getConfig();
    // Only recreate loader if jobs directory changed
    if (config.cron.jobs_dir !== this.loader.getJobsDir()) {
      this.loader = new JobLoader(config.cron.jobs_dir);
    }
    const jobs = this.loader.scanJobs();
    const currentNames = new Set(
      jobs.filter((j) => j.enabled).map((j) => j.name),
    );

    // Remove jobs that no longer exist or are disabled
    for (const [name, active] of this.activeJobs) {
      if (!currentNames.has(name)) {
        active.cronJob.stop();
        this.activeJobs.delete(name);
        log.info("Cron job removed", { name });
      }
    }

    // Add or update jobs
    for (const job of jobs) {
      if (!job.enabled) continue;

      const existing = this.activeJobs.get(job.name);
      if (existing && existing.definition.schedule === job.schedule) {
        // Schedule unchanged, update definition only
        existing.definition = job;
        continue;
      }

      // New or changed schedule — recreate
      if (existing) {
        existing.cronJob.stop();
      }

      try {
        const tz = job.timezone || config.timezone;
        const cronJob = new CronJob(
          job.schedule,
          () => this.executeJob(job),
          null,
          true,
          tz,
        );

        this.activeJobs.set(job.name, { definition: job, cronJob });
        log.info("Cron job scheduled", {
          name: job.name,
          schedule: job.schedule,
          workspace: job.workspace,
          timezone: tz,
        });
      } catch (err) {
        log.error("Invalid cron expression", {
          name: job.name,
          schedule: job.schedule,
          error: String(err),
        });
      }
    }
  }

  private executeJob(job: JobDefinition): void {
    log.info("Cron job firing", { name: job.name, workspace: job.workspace });

    this.queue.enqueue({
      workspace: job.workspace,
      prompt: job.prompt,
      priority: job.priority,
      source: "cron",
      tools: job.tools,
    });

    // Disable one-shot jobs after execution
    if (job.one_shot) {
      this.loader.disableJob(job.file_path);
      const active = this.activeJobs.get(job.name);
      if (active) {
        active.cronJob.stop();
        this.activeJobs.delete(job.name);
      }
    }
  }
}
