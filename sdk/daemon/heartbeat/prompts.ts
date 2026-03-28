// =============================================================================
// heartbeat/prompts.ts — Markdown prompt loader with hot-reload
// =============================================================================

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import { createLogger } from "../logger.js";

const log = createLogger("heartbeat-prompts");

const DEFAULT_PROMPT = `Check this workspace status:
1. Run git status to see uncommitted changes
2. Check for any failing tests or lint errors
3. List open PRs that need attention
4. Report any issues found

Be concise — this is an automated heartbeat check.`;

interface PromptCache {
  content: string;
  mtime: number;
}

export class PromptLoader {
  private promptDir: string;
  private cache: Map<string, PromptCache> = new Map();

  constructor(promptDir: string) {
    this.promptDir = promptDir;
  }

  getPrompt(workspace: string, overrideFile?: string): string {
    const filePath = overrideFile
      ? resolve(this.promptDir, overrideFile)
      : resolve(this.promptDir, `${workspace}.md`);

    try {
      const stat = statSync(filePath);
      const cached = this.cache.get(filePath);

      if (cached && cached.mtime >= stat.mtimeMs) {
        return this.interpolate(cached.content, workspace);
      }

      const content = readFileSync(filePath, "utf-8");
      this.cache.set(filePath, { content, mtime: stat.mtimeMs });
      log.debug("Prompt loaded", { workspace, file: filePath });
      return this.interpolate(content, workspace);
    } catch {
      return this.interpolate(DEFAULT_PROMPT, workspace);
    }
  }

  listAvailable(): string[] {
    try {
      return readdirSync(this.promptDir)
        .filter((f) => extname(f) === ".md")
        .map((f) => basename(f, ".md"));
    } catch {
      return [];
    }
  }

  private interpolate(template: string, workspace: string): string {
    const now = new Date();
    const tz = process.env.TZ || "Asia/Jakarta";

    return template
      .replace(/\{\{workspace\}\}/g, workspace)
      .replace(
        /\{\{datetime\}\}/g,
        now.toLocaleString("en-US", { timeZone: tz }),
      )
      .replace(
        /\{\{date\}\}/g,
        now.toLocaleDateString("en-US", { timeZone: tz }),
      )
      .replace(
        /\{\{time\}\}/g,
        now.toLocaleTimeString("en-US", { timeZone: tz }),
      );
  }
}
