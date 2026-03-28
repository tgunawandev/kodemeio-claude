import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { resolve } from "node:path";

const execAsync = promisify(execFile);
const PORT = parseInt(process.env.SDK_PORT || "3100", 10);
const API_KEY = process.env.SDK_API_KEY || "";
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || "3", 10);
const VALID_TOOLS = new Set([
  "Bash",
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
]);

let inFlight = 0;

if (!API_KEY) {
  console.warn(
    "WARNING: SDK_API_KEY is empty — API is unauthenticated. Set SDK_API_KEY in .env for production.",
  );
}

interface TaskRequest {
  prompt: string;
  workspace?: string; // "kodemeio-app", "kontenos-app", etc.
  tools?: string[]; // ["Bash", "Read", "Edit"]
  bare?: boolean; // Skip auto-discovery for faster execution
}

const server = createServer(async (req, res) => {
  // CORS headers for internal use
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/task") {
    // Auth check
    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (API_KEY && auth !== API_KEY) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Concurrency limit
    if (inFlight >= MAX_CONCURRENT) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `Too many concurrent tasks (max ${MAX_CONCURRENT})`,
        }),
      );
      return;
    }

    const MAX_BODY = 1024 * 1024; // 1 MB
    let body = "";
    let aborted = false;
    req.on("data", (chunk: Buffer) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        aborted = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request body too large" }));
        req.destroy();
      }
    });
    req.on("end", async () => {
      if (aborted) return;

      inFlight++;
      try {
        const task: TaskRequest = JSON.parse(body);

        if (!task.prompt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "prompt is required" }));
          return;
        }

        // Validate workspace — block path traversal
        if (task.workspace) {
          if (task.workspace.includes("..") || task.workspace.startsWith("/")) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid workspace path" }));
            return;
          }
        }

        const args = [
          "-p",
          task.prompt,
          "--output-format",
          "json",
          "--dangerously-skip-permissions",
        ];
        if (task.bare) args.push("--bare");
        if (task.tools?.length) {
          const validTools = task.tools.filter((t) => VALID_TOOLS.has(t));
          if (validTools.length)
            args.push("--allowedTools", validTools.join(","));
        }

        const cwd = task.workspace
          ? resolve("/opt/dev", task.workspace)
          : "/opt/dev";
        const { stdout } = await execAsync("claude", args, {
          cwd,
          timeout: 300000, // 5 minutes
          maxBuffer: 10 * 1024 * 1024, // 10 MB
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(stdout);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      } finally {
        inFlight--;
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        inFlight,
        maxConcurrent: MAX_CONCURRENT,
      }),
    );
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Claude SDK API listening on :${PORT}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
