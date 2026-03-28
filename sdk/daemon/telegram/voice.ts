// =============================================================================
// telegram/voice.ts — Multi-provider STT + TTS for Telegram
// =============================================================================
// STT cascade: Groq Whisper → OpenAI Whisper → local whisper.cpp
// TTS: OpenAI TTS API → send as voice note

import { execFile } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createLogger } from "../logger.js";
import type { VoiceConfig, SttProvider } from "../types.js";

const log = createLogger("voice");

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const OPENAI_STT_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const WHISPER_BINARY =
  process.env.WHISPER_BINARY || "/usr/local/bin/whisper-cpp";
const WHISPER_MODEL =
  process.env.WHISPER_MODEL || "/usr/local/share/whisper/ggml-base.en.bin";

// ─── STT: Speech-to-Text ────────────────────────────────────────────

export async function transcribeVoice(
  oggBuffer: Buffer,
  config: VoiceConfig,
): Promise<string> {
  const providers =
    config.stt_providers.length > 0
      ? config.stt_providers
      : detectAvailableProviders();

  for (const provider of providers) {
    try {
      switch (provider) {
        case "groq":
          if (!GROQ_API_KEY) continue;
          return await transcribeRemote(
            oggBuffer,
            GROQ_STT_URL,
            GROQ_API_KEY,
            "whisper-large-v3-turbo",
          );
        case "openai":
          if (!OPENAI_API_KEY) continue;
          return await transcribeRemote(
            oggBuffer,
            OPENAI_STT_URL,
            OPENAI_API_KEY,
            "whisper-1",
          );
        case "local":
          if (!existsSync(WHISPER_BINARY)) continue;
          return await transcribeLocal(oggBuffer);
      }
    } catch (err) {
      log.warn(`STT provider ${provider} failed, trying next`, {
        error: String(err),
      });
    }
  }

  throw new Error(
    "All STT providers failed. Set GROQ_API_KEY or OPENAI_API_KEY.",
  );
}

export function isVoiceSupported(config: VoiceConfig): boolean {
  const providers =
    config.stt_providers.length > 0
      ? config.stt_providers
      : detectAvailableProviders();
  return providers.length > 0;
}

function detectAvailableProviders(): SttProvider[] {
  const providers: SttProvider[] = [];
  if (GROQ_API_KEY) providers.push("groq");
  if (OPENAI_API_KEY) providers.push("openai");
  if (existsSync(WHISPER_BINARY)) providers.push("local");
  return providers;
}

async function transcribeRemote(
  oggBuffer: Buffer,
  url: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([oggBuffer], { type: "audio/ogg" });
  formData.append("file", blob, "voice.ogg");
  formData.append("model", model);
  formData.append("language", "en");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`STT API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { text: string };
  log.info("Voice transcribed", { model, length: data.text.length });
  return data.text;
}

async function transcribeLocal(oggBuffer: Buffer): Promise<string> {
  const id = randomUUID();
  const oggPath = join(tmpdir(), `voice-${id}.ogg`);
  const wavPath = join(tmpdir(), `voice-${id}.wav`);

  try {
    writeFileSync(oggPath, oggBuffer);

    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        ["-i", oggPath, "-ar", "16000", "-ac", "1", "-f", "wav", wavPath],
        { timeout: 30000 },
        (err) => (err ? reject(err) : resolve()),
      );
    });

    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        WHISPER_BINARY,
        ["-m", WHISPER_MODEL, "-f", wavPath, "--no-timestamps", "-np"],
        { timeout: 60000, maxBuffer: 1024 * 1024 },
        (err, stdout) => (err ? reject(err) : resolve(stdout.trim())),
      );
    });

    log.info("Voice transcribed (local)", { length: result.length });
    return result;
  } finally {
    try {
      unlinkSync(oggPath);
    } catch {}
    try {
      unlinkSync(wavPath);
    } catch {}
  }
}

// ─── TTS: Text-to-Speech ────────────────────────────────────────────

export async function synthesizeSpeech(
  text: string,
  config: VoiceConfig,
): Promise<Buffer | null> {
  if (!config.tts_enabled || config.tts_provider === "none") return null;
  if (!OPENAI_API_KEY) {
    log.warn("TTS requested but OPENAI_API_KEY not set");
    return null;
  }

  // Truncate to TTS limit (4096 chars)
  const truncated = text.slice(0, 4096);

  try {
    const res = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.tts_model || "tts-1",
        input: truncated,
        voice: config.tts_voice || "onyx",
        response_format: "opus", // Telegram-native format
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TTS API error ${res.status}: ${errText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    log.info("Speech synthesized", {
      length: buffer.length,
      voice: config.tts_voice,
    });
    return buffer;
  } catch (err) {
    log.error("TTS failed", { error: String(err) });
    return null;
  }
}

export function shouldVoiceBack(text: string, triggers: string[]): boolean {
  if (triggers.length === 0) return false;
  const lower = text.toLowerCase();
  return triggers.some((t) => lower.includes(t.toLowerCase()));
}
