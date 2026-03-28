// =============================================================================
// dashboard/api.ts — JSON API for dashboard data
// =============================================================================

import type { DaemonState } from "../types.js";

export type StateGetter = () => DaemonState;

export function handleApiRequest(
  url: string,
  method: string,
  getState: StateGetter,
): { status: number; body: string } {
  if (method !== "GET") {
    return {
      status: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const state = getState();

  switch (url) {
    case "/dashboard/api/status":
      return { status: 200, body: JSON.stringify(state) };

    case "/dashboard/api/sessions":
      return { status: 200, body: JSON.stringify(state.sessions) };

    case "/dashboard/api/queue":
      return {
        status: 200,
        body: JSON.stringify({
          depth: state.queue_depth,
          in_flight: state.in_flight,
        }),
      };

    case "/dashboard/api/history":
      return { status: 200, body: JSON.stringify(state.recent_runs) };

    case "/dashboard/api/jobs":
      return { status: 200, body: JSON.stringify(state.jobs) };

    default:
      return { status: 404, body: JSON.stringify({ error: "Not found" }) };
  }
}
