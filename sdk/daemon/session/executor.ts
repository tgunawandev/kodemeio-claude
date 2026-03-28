// =============================================================================
// session/executor.ts — Claude CLI wrapper (Claude Code as default model)
// =============================================================================
// Model routing simplified: Claude Code picks the model by default.
// Only override when explicitly set in config or per-task.

import { execFile } from "node:child_process";
import { createLogger } from "../logger.js";
import { getAllowedTools } from "../security.js";
import { loadPersona } from "../persona.js";
import type { ExecutionResult, SecurityLevel, DaemonConfig } from "../types.js";

const log = createLogger("executor");

const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "rate_limit",
  "too many requests",
  "429",
  "overloaded",
];

export interface ExecOptions {
  workspace: string;
  prompt: string;
  cwd: string;
  sessionId?: string;
  model?: string; // only set if explicitly overridden
  tools?: string[];
  securityLevel: SecurityLevel;
  timeoutMs: number;
  config: DaemonConfig;
}

export function executeTask(opts: ExecOptions): Promise<ExecutionResult> {
  return new Promise((resolvePromise) => {
    const start = Date.now();
    const args: string[] = [];

    // Prepend persona to prompt
    const persona = loadPersona(opts.config.persona);
    const fullPrompt = persona.prefix + opts.prompt;

    // Resume session or start new
    if (opts.sessionId) {
      args.push("--resume", opts.sessionId);
      args.push("-p", fullPrompt);
    } else {
      args.push("-p", fullPrompt);
    }

    args.push("--output-format", "json");
    args.push("--dangerously-skip-permissions");

    // Model override — only if explicitly set (Claude Code picks by default)
    if (opts.model) {
      args.push("--model", opts.model);
    }

    // Tool restrictions
    const allowed = getAllowedTools(opts.securityLevel, opts.tools);
    if (allowed) {
      args.push("--allowedTools", allowed.join(","));
    }

    log.debug("Executing claude", {
      workspace: opts.workspace,
      session: opts.sessionId || "new",
      model: opts.model || "auto",
      cwd: opts.cwd,
    });

    execFile(
      "claude",
      args,
      {
        cwd: opts.cwd,
        timeout: opts.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        const duration = Date.now() - start;
        const output = stdout || "";
        const errOutput = stderr || "";

        // Check for rate limiting
        const combined = (output + errOutput).toLowerCase();
        const rateLimited = RATE_LIMIT_PATTERNS.some((p) =>
          combined.includes(p),
        );

        if (rateLimited) {
          log.warn("Rate limit detected", {
            workspace: opts.workspace,
            duration_ms: duration,
          });
          resolvePromise({
            success: false,
            output,
            duration_ms: duration,
            rate_limited: true,
            model_used: opts.model,
          });
          return;
        }

        if (error) {
          log.error("Execution failed", {
            workspace: opts.workspace,
            error: error.message,
            duration_ms: duration,
          });
          resolvePromise({
            success: false,
            output: errOutput || error.message,
            duration_ms: duration,
            model_used: opts.model,
          });
          return;
        }

        // Extract session_id from JSON output
        let sessionId: string | undefined;
        try {
          const parsed = JSON.parse(output);
          sessionId = parsed.session_id;
        } catch {
          // Output may not be valid JSON
        }

        log.info("Execution completed", {
          workspace: opts.workspace,
          duration_ms: duration,
          session_id: sessionId,
        });

        resolvePromise({
          success: true,
          output,
          session_id: sessionId,
          duration_ms: duration,
          model_used: opts.model,
        });
      },
    );
  });
}
