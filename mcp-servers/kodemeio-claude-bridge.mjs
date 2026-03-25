#!/usr/bin/env node
// =============================================================================
// kodemeio-claude-bridge.mjs — MCP server wrapping Claude Code SDK REST API
// =============================================================================
// Exposes Claude Code as MCP tools for OpenClaw or any MCP-compatible client.
//
// Tools:
//   claude_code_task(prompt, workspace?, tools?, bare?)  — Run a coding task
//   claude_code_status()                                 — Check container health
//
// Environment:
//   SDK_BASE_URL   — REST API endpoint (default: http://kodemeio-claude:3100)
//   SDK_API_KEY    — Bearer token for authentication
//   SDK_TIMEOUT_MS — Request timeout in ms (default: 310000)
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SDK_BASE_URL = process.env.SDK_BASE_URL || "http://kodemeio-claude:3100";
const SDK_API_KEY = process.env.SDK_API_KEY || "";
const SDK_TIMEOUT_MS = parseInt(process.env.SDK_TIMEOUT_MS || "310000", 10);

// ─── Helper: call SDK REST API ──────────────────────────────────────

async function sdkFetch(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (SDK_API_KEY) {
    headers["Authorization"] = `Bearer ${SDK_API_KEY}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SDK_TIMEOUT_MS);

  try {
    const res = await fetch(`${SDK_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${text}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── MCP Server ─────────────────────────────────────────────────────

const server = new McpServer({
  name: "kodemeio-claude",
  version: "1.0.0",
});

// Tool: claude_code_task
server.tool(
  "claude_code_task",
  "Run a Claude Code coding task in a specific workspace. Returns the JSON result from Claude Code.",
  {
    prompt: z.string().describe("The task prompt for Claude Code"),
    workspace: z
      .string()
      .optional()
      .describe(
        'Workspace directory name, e.g. "kodemeio-app", "kontenos-app", "kodemeio-core/kodemeio-react"'
      ),
    tools: z
      .array(z.string())
      .optional()
      .describe(
        'Allowed tools, e.g. ["Bash", "Read", "Edit", "Write"]. Defaults to all.'
      ),
    bare: z
      .boolean()
      .optional()
      .describe("Skip auto-discovery for faster execution"),
  },
  async ({ prompt, workspace, tools, bare }) => {
    try {
      const result = await sdkFetch("POST", "/task", {
        prompt,
        workspace,
        tools,
        bare,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: claude_code_status
server.tool(
  "claude_code_status",
  "Check if the Claude Code container is healthy and responding.",
  {},
  async () => {
    try {
      const result = await sdkFetch("GET", "/health");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Claude Code container unreachable: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start ──────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("kodemeio-claude MCP bridge started");
