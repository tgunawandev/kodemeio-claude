// =============================================================================
// telegram.voice.test.ts — Tests for transcribeVoice, synthesizeSpeech, shouldVoiceBack
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    appendFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
  };
});

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

describe("telegram/voice", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clean env
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.WHISPER_BINARY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  function makeVoiceConfig(overrides: Record<string, any> = {}) {
    return {
      stt_providers: [] as any[],
      tts_enabled: false,
      tts_provider: "openai" as const,
      tts_model: "tts-1",
      tts_voice: "onyx",
      voice_back_triggers: [] as string[],
      ...overrides,
    };
  }

  // ─── shouldVoiceBack ────────────────────────────────────────────────

  describe("shouldVoiceBack", () => {
    it("returns false when triggers array is empty", async () => {
      const { shouldVoiceBack } = await import("../daemon/telegram/voice.js");
      expect(shouldVoiceBack("read this out", [])).toBe(false);
    });

    it("returns true when text contains a trigger phrase (case-insensitive)", async () => {
      const { shouldVoiceBack } = await import("../daemon/telegram/voice.js");
      expect(shouldVoiceBack("Please READ THIS", ["read this"])).toBe(true);
    });

    it("returns false when no trigger matches", async () => {
      const { shouldVoiceBack } = await import("../daemon/telegram/voice.js");
      expect(shouldVoiceBack("do something", ["tell me", "say it"])).toBe(
        false,
      );
    });

    it("returns true on partial match within text", async () => {
      const { shouldVoiceBack } = await import("../daemon/telegram/voice.js");
      expect(shouldVoiceBack("can you tell me the status?", ["tell me"])).toBe(
        true,
      );
    });
  });

  // ─── transcribeVoice ────────────────────────────────────────────────

  describe("transcribeVoice", () => {
    it("throws when no providers are available", async () => {
      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: [] });
      const buf = Buffer.from("fake ogg");

      await expect(transcribeVoice(buf, config)).rejects.toThrow(
        "All STT providers failed",
      );
    });

    it("uses explicitly set stt_providers order", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "hello from openai" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: ["openai"] });
      const result = await transcribeVoice(Buffer.from("audio"), config);

      expect(result).toBe("hello from openai");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("openai"),
        expect.any(Object),
      );

      vi.unstubAllGlobals();
    });

    it("falls through to next provider when groq fails", async () => {
      process.env.GROQ_API_KEY = "groq-key";
      process.env.OPENAI_API_KEY = "openai-key";

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "groq error",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "from openai fallback" }),
        });

      vi.stubGlobal("fetch", mockFetch);

      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: ["groq", "openai"] });
      const result = await transcribeVoice(Buffer.from("audio"), config);

      expect(result).toBe("from openai fallback");
      vi.unstubAllGlobals();
    });

    it("skips groq provider when GROQ_API_KEY is not set", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      // GROQ not set

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "openai result" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: ["groq", "openai"] });
      const result = await transcribeVoice(Buffer.from("audio"), config);

      // Should only call openai, not groq
      expect(result).toBe("openai result");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it("skips openai provider when OPENAI_API_KEY is not set", async () => {
      // Neither groq nor openai keys set, no whisper binary
      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: ["groq", "openai"] });

      await expect(
        transcribeVoice(Buffer.from("audio"), config),
      ).rejects.toThrow("All STT providers failed");
    });

    it("skips local provider when whisper binary does not exist", async () => {
      // existsSync already mocked to return false
      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: ["local"] });

      await expect(
        transcribeVoice(Buffer.from("audio"), config),
      ).rejects.toThrow("All STT providers failed");
    });

    it("throws when API returns non-ok status", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });
      vi.stubGlobal("fetch", mockFetch);

      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: ["openai"] });

      await expect(
        transcribeVoice(Buffer.from("audio"), config),
      ).rejects.toThrow("All STT providers failed");

      vi.unstubAllGlobals();
    });

    it("auto-detects openai when OPENAI_API_KEY is set and no providers configured", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "auto-detected" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { transcribeVoice } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: [] });
      const result = await transcribeVoice(Buffer.from("audio"), config);

      expect(result).toBe("auto-detected");
      vi.unstubAllGlobals();
    });
  });

  // ─── synthesizeSpeech ───────────────────────────────────────────────

  describe("synthesizeSpeech", () => {
    it("returns null when tts_enabled is false", async () => {
      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ tts_enabled: false });
      const result = await synthesizeSpeech("hello", config);
      expect(result).toBeNull();
    });

    it("returns null when tts_provider is none", async () => {
      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        tts_enabled: true,
        tts_provider: "none",
      });
      const result = await synthesizeSpeech("hello", config);
      expect(result).toBeNull();
    });

    it("returns null when OPENAI_API_KEY is not set", async () => {
      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        tts_enabled: true,
        tts_provider: "openai",
      });
      const result = await synthesizeSpeech("hello", config);
      expect(result).toBeNull();
    });

    it("returns audio buffer on successful TTS API call", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const fakeAudioData = new Uint8Array([1, 2, 3, 4]).buffer;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => fakeAudioData,
      });
      vi.stubGlobal("fetch", mockFetch);

      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        tts_enabled: true,
        tts_provider: "openai",
        tts_model: "tts-1",
        tts_voice: "onyx",
      });
      const result = await synthesizeSpeech("Say something", config);

      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.isBuffer(result)).toBe(true);

      // Verify request payload
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe("tts-1");
      expect(body.voice).toBe("onyx");
      expect(body.input).toBe("Say something");
      expect(body.response_format).toBe("opus");

      vi.unstubAllGlobals();
    });

    it("truncates text to 4096 chars", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        tts_enabled: true,
        tts_provider: "openai",
      });
      const longText = "x".repeat(5000);
      await synthesizeSpeech(longText, config);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.input.length).toBe(4096);

      vi.unstubAllGlobals();
    });

    it("returns null and logs error when TTS API returns error", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limited",
      });
      vi.stubGlobal("fetch", mockFetch);

      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        tts_enabled: true,
        tts_provider: "openai",
      });
      const result = await synthesizeSpeech("text", config);

      expect(result).toBeNull(); // Error handled, returns null

      vi.unstubAllGlobals();
    });

    it("returns null when fetch throws", async () => {
      process.env.OPENAI_API_KEY = "openai-key";
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      const { synthesizeSpeech } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        tts_enabled: true,
        tts_provider: "openai",
      });
      const result = await synthesizeSpeech("text", config);

      expect(result).toBeNull();
      vi.unstubAllGlobals();
    });
  });

  // ─── isVoiceSupported ───────────────────────────────────────────────

  describe("isVoiceSupported", () => {
    it("returns false when no providers available and none configured", async () => {
      const { isVoiceSupported } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: [] });
      expect(isVoiceSupported(config)).toBe(false);
    });

    it("returns true when OPENAI_API_KEY is set and stt_providers is empty", async () => {
      process.env.OPENAI_API_KEY = "key";
      const { isVoiceSupported } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({ stt_providers: [] });
      expect(isVoiceSupported(config)).toBe(true);
    });

    it("returns true when stt_providers are explicitly configured", async () => {
      const { isVoiceSupported } = await import("../daemon/telegram/voice.js");
      const config = makeVoiceConfig({
        stt_providers: ["openai"],
      });
      // Even if key is not set, we trust the explicit config
      expect(isVoiceSupported(config)).toBe(true);
    });
  });
});
