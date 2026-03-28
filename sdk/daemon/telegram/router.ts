// =============================================================================
// telegram/router.ts — Message → workspace routing
// =============================================================================

import { WORKSPACES } from "../types.js";

const WORKSPACE_NAMES = new Set(WORKSPACES.map((w) => w.name));

interface RouteResult {
  workspace: string;
  prompt: string;
}

// Per-user workspace override (expires after use or 5 min)
const overrides: Map<number, { workspace: string; expires: number }> =
  new Map();

export function setWorkspaceOverride(
  userId: number,
  workspace: string,
): boolean {
  if (!WORKSPACE_NAMES.has(workspace)) return false;
  overrides.set(userId, {
    workspace,
    expires: Date.now() + 5 * 60 * 1000, // 5 min
  });
  return true;
}

export function routeMessage(
  userId: number,
  text: string,
  defaultWorkspace: string,
): RouteResult {
  // Check for @workspace prefix: "@kontenos fix the bug"
  const prefixMatch = text.match(/^@(\w+)\s+(.+)$/s);
  if (prefixMatch) {
    const [, wsName, rest] = prefixMatch;
    if (WORKSPACE_NAMES.has(wsName)) {
      return { workspace: wsName, prompt: rest.trim() };
    }
  }

  // Check for per-user override
  const override = overrides.get(userId);
  if (override && Date.now() < override.expires) {
    overrides.delete(userId); // consume on use
    return { workspace: override.workspace, prompt: text };
  }

  // Clean up expired overrides
  if (override) overrides.delete(userId);

  return { workspace: defaultWorkspace, prompt: text };
}

export function getAvailableWorkspaces(): string[] {
  return WORKSPACES.map((w) => w.name);
}
