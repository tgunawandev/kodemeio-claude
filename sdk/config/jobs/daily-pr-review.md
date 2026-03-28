---
name: daily-pr-review
schedule: "0 9 * * 1-5"
workspace: kodemeio
enabled: false
priority: medium
timeout_minutes: 10
forward_to_telegram: true
---

Review all open pull requests in this workspace:

1. List all open PRs with `gh pr list`
2. For each PR, check CI status
3. Look for PRs older than 3 days that need attention
4. Summarize findings concisely
