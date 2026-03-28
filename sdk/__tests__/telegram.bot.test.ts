// =============================================================================
// telegram.bot.test.ts — Tests for TelegramBotService
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

// ─── Mock grammy Bot — must use constructor function syntax ────────────────

const handlers: Record<string, Function[]> = {};

const mockBotApi = {
  sendMessage: vi.fn().mockResolvedValue({}),
  setMessageReaction: vi.fn().mockResolvedValue({}),
  sendChatAction: vi.fn().mockResolvedValue({}),
  sendVoice: vi.fn().mockResolvedValue({}),
};

vi.mock("grammy", () => {
  const Bot = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    token: string,
  ) {
    this.token = token;
    this.api = mockBotApi;
    this.start = vi.fn().mockResolvedValue(undefined);
    this.stop = vi.fn();
    this.use = vi.fn().mockImplementation((middleware: Function) => {
      handlers["__middleware__"] = handlers["__middleware__"] || [];
      handlers["__middleware__"].push(middleware);
    });
    this.command = vi
      .fn()
      .mockImplementation((cmd: string, handler: Function) => {
        handlers[`command:${cmd}`] = handlers[`command:${cmd}`] || [];
        handlers[`command:${cmd}`].push(handler);
      });
    this.on = vi.fn().mockImplementation((event: string, handler: Function) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });
  });

  return {
    Bot,
    Context: class {},
    InputFile: vi.fn().mockImplementation(function (
      this: Record<string, unknown>,
      buf: Buffer,
      name: string,
    ) {
      this.buf = buf;
      this.name = name;
    }),
  };
});

import type { DaemonConfig } from "../daemon/types.js";

const DEFAULT_CONFIG: DaemonConfig = {
  timezone: "UTC",
  security_level: "moderate",
  quiet_hours: [],
  heartbeat: { enabled: false, default_interval_minutes: 30, workspaces: {} },
  cron: { enabled: false, jobs_dir: "/tmp" },
  telegram: {
    enabled: true,
    token_env: "T",
    default_workspace: "kodemeio",
    allowed_user_ids: [],
    forward_heartbeat: true,
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
    voice_back_triggers: ["read this"],
  },
};

function makeCtx(overrides: Record<string, any> = {}): any {
  return {
    from: { id: 1234 },
    chat: { id: 5678 },
    message: {
      message_id: 100,
      text: "hello",
    },
    reply: vi.fn().mockResolvedValue({}),
    api: mockBotApi,
    match: "",
    getFile: vi.fn(),
    ...overrides,
  };
}

describe("TelegramBotService", () => {
  let mockQueue: any;
  let mockSessions: any;
  let enqueueMock: ReturnType<typeof vi.fn>;
  let BotMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    // Clear handler registry
    for (const key of Object.keys(handlers)) {
      delete handlers[key];
    }
    mockBotApi.sendMessage.mockClear();
    mockBotApi.setMessageReaction.mockClear();
    mockBotApi.sendChatAction.mockClear();
    mockBotApi.sendVoice.mockClear();

    const grammyMod = await import("grammy");
    BotMock = grammyMod.Bot as ReturnType<typeof vi.fn>;
    BotMock.mockClear();

    enqueueMock = vi
      .fn()
      .mockReturnValue({ id: "t1", status: "queued", source: "telegram" });
    mockQueue = {
      enqueue: enqueueMock,
      depth: 2,
      inFlight: 1,
      getHistory: vi.fn().mockReturnValue([]),
      setOnComplete: vi.fn(),
    };
    mockSessions = {
      getAllSessions: vi
        .fn()
        .mockReturnValue({ kodemeio: "sess-abc", kontenos: null }),
      getSessionInfo: vi.fn().mockReturnValue({ turn_count: 5 }),
      reset: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeBot(config = DEFAULT_CONFIG, jobs?: () => any[]) {
    const { TelegramBotService } = await import("../daemon/telegram/bot.js");
    return new TelegramBotService(
      "fake-token",
      () => config,
      mockQueue,
      mockSessions,
      jobs,
    );
  }

  function getBotInstance() {
    return BotMock.mock.instances[BotMock.mock.instances.length - 1];
  }

  it("creates bot with provided token", async () => {
    await makeBot();
    expect(BotMock).toHaveBeenCalledWith("fake-token");
  });

  it("start calls bot.start and sets onComplete callback", async () => {
    const bot = await makeBot();
    bot.start();
    expect(mockQueue.setOnComplete).toHaveBeenCalledOnce();
  });

  it("stop calls bot.stop", async () => {
    const bot = await makeBot();
    const instance = getBotInstance();
    bot.stop();
    expect(instance.stop).toHaveBeenCalled();
  });

  it("/start command replies with persona info", async () => {
    await makeBot();
    const ctx = makeCtx({ match: "" });
    const handler = handlers["command:start"]?.[0];
    expect(handler).toBeDefined();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("KodeClaw"),
      expect.any(Object),
    );
  });

  it("/status command shows queue depth and sessions", async () => {
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["command:status"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Queue"),
      expect.any(Object),
    );
  });

  it("/workspace command without arg replies with usage", async () => {
    await makeBot();
    const ctx = makeCtx({ match: "" });
    const handler = handlers["command:workspace"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Usage"),
      expect.any(Object),
    );
  });

  it("/workspace command with valid workspace replies success", async () => {
    await makeBot();
    const ctx = makeCtx({ match: "kontenos" });
    const handler = handlers["command:workspace"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("kontenos"),
      expect.any(Object),
    );
  });

  it("/workspace command with invalid workspace replies error", async () => {
    await makeBot();
    const ctx = makeCtx({ match: "badworkspace" });
    const handler = handlers["command:workspace"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Unknown workspace"),
    );
  });

  it("/workspace command with no from user is skipped", async () => {
    await makeBot();
    const ctx = makeCtx({ from: undefined, match: "kontenos" });
    const handler = handlers["command:workspace"]?.[0];
    // Should not throw
    await handler(ctx);
  });

  it("/workspaces command lists all workspaces", async () => {
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["command:workspaces"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("kodemeio"),
      expect.any(Object),
    );
  });

  it("/workspaces marks default workspace", async () => {
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["command:workspaces"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("default"),
      expect.any(Object),
    );
  });

  it("/sessions command shows session info with turn counts", async () => {
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["command:sessions"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Sessions"),
      expect.any(Object),
    );
  });

  it("/jobs replies no jobs when list is empty", async () => {
    await makeBot(DEFAULT_CONFIG, () => []);
    const ctx = makeCtx();
    const handler = handlers["command:jobs"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("No cron jobs configured.");
  });

  it("/jobs shows job list when jobs exist", async () => {
    await makeBot(DEFAULT_CONFIG, () => [
      {
        name: "daily",
        schedule: "0 9 * * *",
        workspace: "kodemeio",
        enabled: true,
      },
    ]);
    const ctx = makeCtx();
    const handler = handlers["command:jobs"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("daily"),
      expect.any(Object),
    );
  });

  it("/history shows no history when empty", async () => {
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["command:history"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("No run history yet.");
  });

  it("/history shows recent runs when available", async () => {
    mockQueue.getHistory = vi.fn().mockReturnValue([
      {
        id: "r1",
        source: "cron",
        workspace: "kodemeio",
        status: "success",
        started_at: new Date().toISOString(),
        duration_ms: 1500,
      },
    ]);
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["command:history"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Recent Runs"),
      expect.any(Object),
    );
  });

  it("/reset command without arg replies with usage", async () => {
    await makeBot();
    const ctx = makeCtx({ match: "" });
    const handler = handlers["command:reset"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Usage"),
      expect.any(Object),
    );
  });

  it("/reset command resets session and replies", async () => {
    await makeBot();
    const ctx = makeCtx({ match: "kodemeio" });
    const handler = handlers["command:reset"]?.[0];
    await handler(ctx);
    expect(mockSessions.reset).toHaveBeenCalledWith("kodemeio");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("reset"),
      expect.any(Object),
    );
  });

  it("text message enqueues task with high priority", async () => {
    await makeBot();
    const ctx = makeCtx({ message: { message_id: 1, text: "do something" } });
    const handler = handlers["message:text"]?.[0];
    await handler(ctx);
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: "high",
        source: "telegram",
      }),
    );
  });

  it("text message with no from is skipped", async () => {
    await makeBot();
    const ctx = makeCtx({
      from: undefined,
      message: { message_id: 1, text: "hello" },
    });
    const handler = handlers["message:text"]?.[0];
    await handler(ctx);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("middleware blocks unauthorized user via .use()", async () => {
    const restrictedConfig = {
      ...DEFAULT_CONFIG,
      telegram: {
        ...DEFAULT_CONFIG.telegram,
        allowed_user_ids: [9999], // only user 9999 allowed
      },
    };
    await makeBot(restrictedConfig);
    // Verify .use() was called to register middleware
    const botInstance = (await import("grammy")).Bot;
    expect(handlers["__middleware__"]).toBeDefined();
    expect(handlers["__middleware__"].length).toBeGreaterThan(0);

    // Test middleware rejects unauthorized user
    const ctx = makeCtx({ from: { id: 1234 } });
    const next = vi.fn();
    await handlers["__middleware__"][0](ctx, next);
    expect(next).not.toHaveBeenCalled();

    // Test middleware allows authorized user
    const ctx2 = makeCtx({ from: { id: 9999 } });
    const next2 = vi.fn();
    await handlers["__middleware__"][0](ctx2, next2);
    expect(next2).toHaveBeenCalled();
  });

  it("text message from authorized user is processed", async () => {
    const restrictedConfig = {
      ...DEFAULT_CONFIG,
      telegram: {
        ...DEFAULT_CONFIG.telegram,
        allowed_user_ids: [1234],
      },
    };
    await makeBot(restrictedConfig);
    const ctx = makeCtx({ message: { message_id: 1, text: "hello" } });
    const handler = handlers["message:text"]?.[0];
    await handler(ctx);
    expect(enqueueMock).toHaveBeenCalled();
  });

  it("photo message replies unsupported message", async () => {
    await makeBot();
    const ctx = makeCtx();
    const handler = handlers["message:photo"]?.[0];
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("not yet supported"),
    );
  });

  it("sendMessage splits long text into chunks", async () => {
    const bot = await makeBot();
    const instance = getBotInstance();
    const longText = "x".repeat(5000);

    await bot.sendMessage(123, longText);

    // Should call sendMessage twice (4096 + 904)
    expect(instance.api.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("sendMessage sends single chunk for short text", async () => {
    const bot = await makeBot();
    const instance = getBotInstance();
    await bot.sendMessage(123, "short text");
    expect(instance.api.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("sendMessage falls back to plain text when HTML parse fails", async () => {
    const bot = await makeBot();
    const instance = getBotInstance();
    instance.api.sendMessage
      .mockRejectedValueOnce(new Error("HTML parse error"))
      .mockResolvedValueOnce({});

    await bot.sendMessage(123, "some <b>text</b>");
    expect(instance.api.sendMessage).toHaveBeenCalledTimes(2);
  });
});
