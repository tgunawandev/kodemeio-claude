// =============================================================================
// security.ts — Security tier enforcement for tool allowlists
// =============================================================================

import type { SecurityLevel } from "./types.js";

const TOOL_TIERS: Record<SecurityLevel, string[]> = {
  locked: ["Read", "Glob", "Grep"],
  strict: ["Read", "Glob", "Grep", "Bash", "WebFetch", "WebSearch"],
  moderate: [
    "Read",
    "Glob",
    "Grep",
    "Bash",
    "Edit",
    "Write",
    "WebFetch",
    "WebSearch",
  ],
  unrestricted: [], // empty = all tools allowed
};

export function getAllowedTools(
  level: SecurityLevel,
  overrides?: string[],
): string[] | undefined {
  if (overrides?.length) return overrides;
  const tools = TOOL_TIERS[level];
  return tools.length > 0 ? tools : undefined; // undefined = no restriction
}

export function isToolAllowed(tool: string, level: SecurityLevel): boolean {
  const allowed = TOOL_TIERS[level];
  if (allowed.length === 0) return true; // unrestricted
  return allowed.includes(tool);
}
