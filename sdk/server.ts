import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";

const execAsync = promisify(execFile);
const PORT = parseInt(process.env.SDK_PORT || "3100", 10);
const API_KEY = process.env.SDK_API_KEY || "";

interface TaskRequest {
  prompt: string;
  workspace?: string; // "kodemeio-app", "kontenos-app", etc.
  tools?: string[];   // ["Bash", "Read", "Edit"]
  bare?: boolean;     // Skip auto-discovery for faster execution
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
      try {
        const task: TaskRequest = JSON.parse(body);

        if (!task.prompt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "prompt is required" }));
          return;
        }

        const args = [
          "-p", task.prompt,
          "--output-format", "json",
          "--dangerously-skip-permissions",
        ];
        if (task.bare) args.push("--bare");
        if (task.tools?.length) args.push("--allowedTools", task.tools.join(","));

        const cwd = task.workspace ? `/opt/dev/${task.workspace}` : "/opt/dev";
        const { stdout } = await execAsync("claude", args, {
          cwd,
          timeout: 300000,       // 5 minutes
          maxBuffer: 10 * 1024 * 1024, // 10 MB
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(stdout);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Claude SDK API listening on :${PORT}`);
});
