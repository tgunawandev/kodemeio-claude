// =============================================================================
// dashboard/routes.ts — Mount dashboard on existing HTTP server
// =============================================================================

import type { Server, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handleApiRequest, type StateGetter } from "./api.js";
import { createLogger } from "../logger.js";

const log = createLogger("dashboard");

let dashboardHtml: string | null = null;

function getHtml(): string {
  if (!dashboardHtml) {
    try {
      dashboardHtml = readFileSync(
        resolve(__dirname, "../dashboard/static/index.html"),
        "utf-8",
      );
    } catch {
      // Fallback: try relative to compiled location
      try {
        dashboardHtml = readFileSync(
          resolve(__dirname, "static/index.html"),
          "utf-8",
        );
      } catch {
        dashboardHtml =
          "<html><body><h1>KodeClaw Dashboard</h1><p>Static files not found.</p></body></html>";
      }
    }
  }
  return dashboardHtml;
}

const API_KEY = process.env.SDK_API_KEY || "";

export function mountDashboard(server: Server, getState: StateGetter): void {
  const originalListeners = server.listeners("request") as ((
    req: IncomingMessage,
    res: ServerResponse,
  ) => void)[];

  // Remove existing listeners
  server.removeAllListeners("request");

  // Add new combined listener
  server.on("request", (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || "";

    if (url === "/dashboard" || url === "/dashboard/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getHtml());
      return;
    }

    if (url.startsWith("/dashboard/api/")) {
      // Auth check for API endpoints
      if (API_KEY) {
        const auth = req.headers.authorization?.replace("Bearer ", "");
        if (auth !== API_KEY) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }
      const result = handleApiRequest(url, req.method || "GET", getState);
      res.writeHead(result.status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(result.body);
      return;
    }

    // Pass through to original handlers
    for (const listener of originalListeners) {
      listener(req, res);
    }
  });

  log.info("Dashboard mounted at /dashboard");
}
