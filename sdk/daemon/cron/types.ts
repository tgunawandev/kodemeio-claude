// =============================================================================
// cron/types.ts — Cron job definition interfaces
// =============================================================================

import type { TaskPriority } from "../types.js";

export interface JobFrontmatter {
  name?: string;
  schedule: string;
  workspace: string;
  timezone?: string;
  enabled?: boolean;
  one_shot?: boolean;
  tools?: string[];
  priority?: TaskPriority;
  timeout_minutes?: number;
  forward_to_telegram?: boolean;
}
