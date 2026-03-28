// =============================================================================
// persona.ts — Identity and personality system (IDENTITY.md + SOUL.md)
// =============================================================================

import { readFileSync, statSync } from "node:fs";
import { createLogger } from "./logger.js";
import type { PersonaConfig } from "./types.js";

const log = createLogger("persona");

interface PersonaCache {
  identity: string;
  soul: string;
  identityMtime: number;
  soulMtime: number;
  name: string;
  emoji: string;
}

let cache: PersonaCache | null = null;

function loadFile(path: string): { content: string; mtime: number } | null {
  try {
    const stat = statSync(path);
    return { content: readFileSync(path, "utf-8"), mtime: stat.mtimeMs };
  } catch {
    return null;
  }
}

function extractName(identity: string): string {
  const match =
    identity.match(/^#\s*(.+)/m) || identity.match(/name:\s*(.+)/im);
  return match ? match[1].trim() : "KodeClaw";
}

function extractEmoji(identity: string): string {
  const match = identity.match(/emoji:\s*(.+)/im);
  return match ? match[1].trim() : "🤖";
}

export function loadPersona(config: PersonaConfig): {
  prefix: string;
  name: string;
  emoji: string;
} {
  if (!config.enabled) {
    return { prefix: "", name: "KodeClaw", emoji: "🤖" };
  }

  const idFile = loadFile(config.identity_file);
  const soulFile = loadFile(config.soul_file);

  // Check cache freshness
  if (
    cache &&
    (!idFile || idFile.mtime <= cache.identityMtime) &&
    (!soulFile || soulFile.mtime <= cache.soulMtime)
  ) {
    return {
      prefix: buildPrefix(cache.identity, cache.soul),
      name: cache.name,
      emoji: cache.emoji,
    };
  }

  const identity = idFile?.content || "";
  const soul = soulFile?.content || "";

  cache = {
    identity,
    soul,
    identityMtime: idFile?.mtime || 0,
    soulMtime: soulFile?.mtime || 0,
    name: extractName(identity),
    emoji: extractEmoji(identity),
  };

  if (identity || soul) {
    log.info("Persona loaded", { name: cache.name, emoji: cache.emoji });
  }

  return {
    prefix: buildPrefix(identity, soul),
    name: cache.name,
    emoji: cache.emoji,
  };
}

function buildPrefix(identity: string, soul: string): string {
  const parts: string[] = [];
  if (identity) {
    parts.push(`<identity>\n${identity}\n</identity>`);
  }
  if (soul) {
    parts.push(`<soul>\n${soul}\n</soul>`);
  }
  return parts.length > 0 ? parts.join("\n\n") + "\n\n---\n\n" : "";
}

export function getPersonaInfo(): { name: string; emoji: string } | null {
  if (!cache) return null;
  return { name: cache.name, emoji: cache.emoji };
}
