// =============================================================================
// telegram/bot.ts — Single Telegram bot with reactions, TTS, rich commands
// =============================================================================

import { Bot, Context, InputFile } from "grammy";
import { createLogger } from "../logger.js";
import {
  routeMessage,
  setWorkspaceOverride,
  getAvailableWorkspaces,
} from "./router.js";
import {
  transcribeVoice,
  isVoiceSupported,
  synthesizeSpeech,
  shouldVoiceBack,
} from "./voice.js";
import { getPersonaInfo } from "../persona.js";
import type { TaskQueue } from "../session/queue.js";
import type { SessionManager } from "../session/manager.js";
import type { DaemonConfig, QueuedTask, ExecutionResult } from "../types.js";

const log = createLogger("telegram");

const MAX_MSG_LENGTH = 4096;

export class TelegramBotService {
  private bot: Bot;
  private getConfig: () => DaemonConfig;
  private queue: TaskQueue;
  private sessions: SessionManager;
  private getJobs: () => any[];

  constructor(
    token: string,
    getConfig: () => DaemonConfig,
    queue: TaskQueue,
    sessions: SessionManager,
    getJobs?: () => any[],
  ) {
    this.bot = new Bot(token);
    this.getConfig = getConfig;
    this.queue = queue;
    this.sessions = sessions;
    this.getJobs = getJobs || (() => []);
    this.setupHandlers();
  }

  start(): void {
    this.queue.setOnComplete((task, result) => {
      this.handleTaskComplete(task, result);
      const config = this.getConfig();
      if (task.source === "heartbeat" && config.telegram.forward_heartbeat) {
        this.broadcastResult(task, result);
      }
      if (task.source === "cron" && config.telegram.forward_cron) {
        this.broadcastResult(task, result);
      }
    });

    this.bot.start({ onStart: () => log.info("Telegram bot started") });
  }

  stop(): void {
    this.bot.stop();
    log.info("Telegram bot stopped");
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    const chunks = splitMessage(text);
    for (const chunk of chunks) {
      try {
        await this.bot.api.sendMessage(chatId, chunk, { parse_mode: "HTML" });
      } catch {
        await this.bot.api.sendMessage(chatId, chunk);
      }
    }
  }

  private setupHandlers(): void {
    // Auth middleware — reject unauthorized users for ALL commands and messages
    this.bot.use(async (ctx, next) => {
      if (!this.isAllowed(ctx)) return;
      await next();
    });

    // /start
    this.bot.command("start", async (ctx) => {
      const persona = getPersonaInfo();
      const name = persona?.name || "KodeClaw";
      const emoji = persona?.emoji || "🐾";
      await ctx.reply(
        `${emoji} <b>${name}</b> ready.\n\n` +
          "<b>Commands:</b>\n" +
          "/status — Daemon + queue status\n" +
          "/workspace &lt;name&gt; — Switch workspace\n" +
          "/workspaces — List workspaces\n" +
          "/sessions — Active sessions\n" +
          "/jobs — Scheduled cron jobs\n" +
          "/history — Recent run history\n" +
          "/reset &lt;workspace&gt; — Reset session\n\n" +
          "Send text to run as task. Prefix <code>@workspace</code> to route.\n" +
          "Send voice for transcription + task.",
        { parse_mode: "HTML" },
      );
    });

    // /status
    this.bot.command("status", async (ctx) => {
      const sessions = this.sessions.getAllSessions();
      const queueDepth = this.queue.depth;
      const inFlight = this.queue.inFlight;
      const persona = getPersonaInfo();

      const lines = [
        `<b>${persona?.emoji || "🐾"} ${persona?.name || "KodeClaw"} Status</b>`,
        "",
        `📊 Queue: ${queueDepth} pending, ${inFlight} running`,
        "",
        "<b>Sessions:</b>",
      ];

      for (const [ws, sid] of Object.entries(sessions)) {
        const icon = sid ? "🟢" : "⚫";
        lines.push(
          `  ${icon} ${ws}: ${sid ? sid.slice(0, 8) + "..." : "none"}`,
        );
      }

      await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
    });

    // /workspace <name>
    this.bot.command("workspace", async (ctx) => {
      const ws = ctx.match?.trim();
      if (!ws) {
        await ctx.reply(
          "Usage: /workspace &lt;name&gt;\nExample: /workspace kontenos",
          { parse_mode: "HTML" },
        );
        return;
      }
      if (!ctx.from) return;

      if (setWorkspaceOverride(ctx.from.id, ws)) {
        await ctx.reply(`✅ Next message routes to <b>${ws}</b>`, {
          parse_mode: "HTML",
        });
      } else {
        const available = getAvailableWorkspaces().join(", ");
        await ctx.reply(`❌ Unknown workspace. Available: ${available}`);
      }
    });

    // /workspaces
    this.bot.command("workspaces", async (ctx) => {
      const available = getAvailableWorkspaces();
      const config = this.getConfig();
      const lines = available.map((w) => {
        const isDefault =
          w === config.telegram.default_workspace ? " (default)" : "";
        return `  • <code>${w}</code>${isDefault}`;
      });
      await ctx.reply(`<b>Workspaces:</b>\n${lines.join("\n")}`, {
        parse_mode: "HTML",
      });
    });

    // /sessions
    this.bot.command("sessions", async (ctx) => {
      const sessions = this.sessions.getAllSessions();
      const lines = Object.entries(sessions)
        .map(([ws, sid]) => {
          const info = this.sessions.getSessionInfo(ws);
          const turns = info ? ` (${info.turn_count} turns)` : "";
          return `<code>${ws}</code>: ${sid ? sid.slice(0, 12) + "..." : "none"}${turns}`;
        })
        .join("\n");
      await ctx.reply(`<b>Active Sessions</b>\n${lines}`, {
        parse_mode: "HTML",
      });
    });

    // /jobs — list cron jobs
    this.bot.command("jobs", async (ctx) => {
      const jobs = this.getJobs();
      if (jobs.length === 0) {
        await ctx.reply("No cron jobs configured.");
        return;
      }
      const lines = jobs.map((j: any) => {
        const status = j.enabled ? "🟢" : "⚫";
        return `${status} <b>${j.name}</b>\n    <code>${j.schedule}</code> → ${j.workspace}`;
      });
      await ctx.reply(`<b>Cron Jobs</b>\n\n${lines.join("\n\n")}`, {
        parse_mode: "HTML",
      });
    });

    // /history — recent runs
    this.bot.command("history", async (ctx) => {
      const history = this.queue.getHistory().slice(0, 10);
      if (history.length === 0) {
        await ctx.reply("No run history yet.");
        return;
      }
      const lines = history.map((r) => {
        const icon =
          r.status === "success" ? "✅" : r.status === "timeout" ? "⏰" : "❌";
        const time = new Date(r.started_at).toLocaleTimeString("en-US", {
          timeZone: this.getConfig().timezone,
          hour12: false,
        });
        return `${icon} ${time} [${r.source}/${r.workspace}] ${(r.duration_ms / 1000).toFixed(1)}s`;
      });
      await ctx.reply(`<b>Recent Runs</b>\n<pre>${lines.join("\n")}</pre>`, {
        parse_mode: "HTML",
      });
    });

    // /reset <workspace> — reset session
    this.bot.command("reset", async (ctx) => {
      const ws = ctx.match?.trim();
      if (!ws) {
        await ctx.reply("Usage: /reset &lt;workspace&gt;", {
          parse_mode: "HTML",
        });
        return;
      }
      this.sessions.reset(ws);
      await ctx.reply(`🔄 Session reset for <b>${ws}</b>`, {
        parse_mode: "HTML",
      });
    });

    // Text messages
    this.bot.on("message:text", async (ctx) => {
      if (!ctx.from || !ctx.message.text) return;

      const config = this.getConfig();
      const { workspace, prompt } = routeMessage(
        ctx.from.id,
        ctx.message.text,
        config.telegram.default_workspace,
      );

      // React on receive
      await this.react(ctx, config.telegram.react_on_receive);
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      const task = this.queue.enqueue({
        workspace,
        prompt,
        priority: "high",
        source: "telegram",
      });

      (task as any)._chatId = ctx.chat.id;
      (task as any)._messageId = ctx.message.message_id;
      (task as any)._isVoice = false;

      log.info("Telegram message queued", {
        user: ctx.from.id,
        workspace,
        task_id: task.id,
      });
    });

    // Voice messages
    this.bot.on("message:voice", async (ctx) => {
      if (!ctx.from) return;

      const config = this.getConfig();

      if (!isVoiceSupported(config.voice)) {
        await ctx.reply(
          "Voice not configured. Set GROQ_API_KEY or OPENAI_API_KEY.",
        );
        return;
      }

      await this.react(ctx, config.telegram.react_on_receive);
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      try {
        const file = await ctx.getFile();
        const url = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Failed to download voice file: ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const text = await transcribeVoice(buffer, config.voice);

        if (!text.trim()) {
          await ctx.reply("Could not transcribe voice message.");
          return;
        }

        const { workspace, prompt } = routeMessage(
          ctx.from.id,
          text,
          config.telegram.default_workspace,
        );

        await ctx.reply(
          `🎤 <i>"${text.slice(0, 200)}${text.length > 200 ? "..." : ""}"</i>\n→ ${workspace}`,
          { parse_mode: "HTML" },
        );

        const task = this.queue.enqueue({
          workspace,
          prompt,
          priority: "high",
          source: "telegram",
        });

        (task as any)._chatId = ctx.chat.id;
        (task as any)._isVoice = true;
      } catch (err) {
        log.error("Voice processing failed", { error: String(err) });
        await ctx.reply(`Voice error: ${String(err)}`);
      }
    });

    // Photo messages
    this.bot.on("message:photo", async (ctx) => {
      await ctx.reply(
        "Image analysis not yet supported. Please describe as text.",
      );
    });
  }

  private isAllowed(ctx: Context): boolean {
    const config = this.getConfig();
    if (config.telegram.allowed_user_ids.length === 0) return true;
    return config.telegram.allowed_user_ids.includes(ctx.from?.id ?? 0);
  }

  private async react(ctx: Context, emoji: string): Promise<void> {
    if (!emoji) return;
    try {
      await ctx.api.setMessageReaction(ctx.chat!.id, ctx.message!.message_id, [
        { type: "emoji", emoji: emoji as any },
      ]);
    } catch {
      // Reactions may not be supported in all chats
    }
  }

  private async handleTaskComplete(
    task: QueuedTask,
    result: ExecutionResult,
  ): Promise<void> {
    const chatId = (task as any)._chatId as number | undefined;
    if (!chatId) return;
    if (task.source !== "telegram") return;

    const config = this.getConfig();
    const messageId = (task as any)._messageId as number | undefined;
    const isVoice = (task as any)._isVoice as boolean;

    // React on completion
    if (messageId) {
      const emoji = result.success
        ? config.telegram.react_on_complete
        : config.telegram.react_on_error;
      if (emoji) {
        try {
          await this.bot.api.setMessageReaction(chatId, messageId, [
            { type: "emoji", emoji: emoji as any },
          ]);
        } catch {}
      }
    }

    // Extract text result
    let text: string;
    if (result.success) {
      try {
        const parsed = JSON.parse(result.output);
        text = parsed.result || parsed.output || result.output;
      } catch {
        text = result.output;
      }
    } else {
      text = `❌ Task failed: ${result.output.slice(0, 500)}`;
    }

    // Metadata footer
    const footer = `\n\n<i>[${task.workspace} | ${(result.duration_ms / 1000).toFixed(1)}s${result.model_used ? ` | ${result.model_used}` : ""}]</i>`;

    // TTS voice response: send voice note back if input was voice or text has trigger words
    const shouldUseTts =
      config.voice.tts_enabled &&
      result.success &&
      (isVoice ||
        shouldVoiceBack(task.prompt, config.voice.voice_back_triggers));
    if (shouldUseTts) {
      const plainText = text.replace(/<[^>]*>/g, "").slice(0, 4000);
      {
        const audio = await synthesizeSpeech(plainText, config.voice);
        if (audio) {
          try {
            await this.bot.api.sendVoice(
              chatId,
              new InputFile(audio, "response.ogg"),
            );
            return; // Voice sent, skip text
          } catch (err) {
            log.warn("Failed to send voice response, falling back to text", {
              error: String(err),
            });
          }
        }
      }
    }

    // Text response
    const truncated = text.slice(0, MAX_MSG_LENGTH - footer.length - 10);
    try {
      await this.sendMessage(chatId, truncated + footer);
    } catch (err) {
      log.error("Failed to send Telegram reply", { error: String(err) });
    }
  }

  private async broadcastResult(
    task: QueuedTask,
    result: ExecutionResult,
  ): Promise<void> {
    const config = this.getConfig();
    if (config.telegram.allowed_user_ids.length === 0) return;

    const persona = getPersonaInfo();
    const icon = task.source === "heartbeat" ? "💓" : "⏰";
    const label =
      task.source === "heartbeat" ? "Heartbeat" : task.prompt.slice(0, 30);
    let text = `${icon} <b>${label}</b> [${task.workspace}]\n\n`;

    if (result.success) {
      try {
        const parsed = JSON.parse(result.output);
        text += parsed.result || parsed.output || result.output.slice(0, 3000);
      } catch {
        text += result.output.slice(0, 3000);
      }
    } else {
      text += `❌ Failed: ${result.output.slice(0, 500)}`;
    }

    for (const userId of config.telegram.allowed_user_ids) {
      try {
        await this.sendMessage(userId, text);
      } catch (err) {
        log.error("Failed to broadcast", {
          user_id: userId,
          error: String(err),
        });
      }
    }
  }
}

function splitMessage(text: string): string[] {
  if (text.length <= MAX_MSG_LENGTH) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, MAX_MSG_LENGTH));
    remaining = remaining.slice(MAX_MSG_LENGTH);
  }
  return chunks;
}
