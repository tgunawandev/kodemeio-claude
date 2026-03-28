// =============================================================================
// cron/loader.ts — Markdown + YAML frontmatter job file scanner
// =============================================================================

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import matter from "gray-matter";
import { createLogger } from "../logger.js";
import type { JobDefinition } from "../types.js";
import type { JobFrontmatter } from "./types.js";

const log = createLogger("cron-loader");

interface FileCache {
  mtime: number;
  job: JobDefinition;
}

export class JobLoader {
  private jobsDir: string;
  private cache: Map<string, FileCache> = new Map();

  getJobsDir(): string {
    return this.jobsDir;
  }

  constructor(jobsDir: string) {
    this.jobsDir = jobsDir;
  }

  scanJobs(): JobDefinition[] {
    const jobs: JobDefinition[] = [];

    let files: string[];
    try {
      files = readdirSync(this.jobsDir).filter((f) => extname(f) === ".md");
    } catch {
      log.debug("Jobs directory not found or empty", { dir: this.jobsDir });
      return [];
    }

    for (const file of files) {
      const filePath = resolve(this.jobsDir, file);
      const jobName = basename(file, ".md");

      try {
        const stat = statSync(filePath);
        const cached = this.cache.get(filePath);

        if (cached && cached.mtime >= stat.mtimeMs) {
          jobs.push(cached.job);
          continue;
        }

        const raw = readFileSync(filePath, "utf-8");
        const { data, content } = matter(raw);
        const fm = data as JobFrontmatter;

        if (!fm.schedule || !fm.workspace) {
          log.warn("Job missing required fields (schedule, workspace)", {
            file,
          });
          continue;
        }

        const job: JobDefinition = {
          name: fm.name || jobName,
          schedule: fm.schedule,
          workspace: fm.workspace,
          timezone: fm.timezone,
          enabled: fm.enabled !== false, // default true
          one_shot: fm.one_shot || false,
          tools: fm.tools,
          priority: fm.priority || "medium",
          timeout_minutes: fm.timeout_minutes || 10,
          forward_to_telegram: fm.forward_to_telegram || false,
          prompt: content.trim(),
          file_path: filePath,
        };

        this.cache.set(filePath, { mtime: stat.mtimeMs, job });
        jobs.push(job);
      } catch (err) {
        log.error("Failed to parse job file", {
          file,
          error: String(err),
        });
      }
    }

    return jobs;
  }

  disableJob(filePath: string): void {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      data.enabled = false;
      const updated = matter.stringify(content, data);
      writeFileSync(filePath, updated);
      this.cache.delete(filePath);
      log.info("Job disabled (one-shot completed)", { file: filePath });
    } catch (err) {
      log.error("Failed to disable job", {
        file: filePath,
        error: String(err),
      });
    }
  }
}
