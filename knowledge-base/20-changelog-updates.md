# 20 — Changelog & Updates

> Recent features, version history, and what's new in Claude Code.

## Current State (as of February 2026)

### Models Available

| Model | Version | Release |
|-------|---------|---------|
| **Claude Opus 4.6** | `claude-opus-4-6` | Latest |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | Latest |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | October 2025 |

### Supported Platforms

| Platform | Status |
|----------|--------|
| macOS | Full support |
| Linux | Full support |
| Windows (WSL2) | Full support |
| Windows (WSL1) | Partial (no sandbox) |

---

## Major Features Timeline

### Agent Teams (Experimental)

Multi-agent coordination using tmux for parallel workstreams.

```bash
claude config set agentTeams true
CLAUDE_CODE_ENABLE_AGENT_TEAMS=1 claude
```

- Lead agent coordinates teammates
- Teammates work independently in tmux panes
- ~7x token usage vs standard sessions
- Requires tmux installed

### Plugins & Marketplace

Extensible plugin system for skills, agents, and MCP servers.

```
/plugins                    # Manage plugins
```

- Plugin marketplace for discovery
- Skills, agents, MCP servers per plugin
- Project and user scopes
- Permission-controlled

### Skills System

Reusable prompt templates replacing legacy custom commands.

```yaml
# .claude/skills/my-skill/SKILL.md
---
name: my-skill
description: What it does
---
Instructions...
```

- YAML frontmatter for configuration
- Dynamic context injection (`!command`)
- String substitutions ($ARGUMENTS)
- Invocation control (user/agent)

### Custom Subagents

User-defined specialized agents via `.claude/agents/`.

```yaml
---
name: code-reviewer
tools: Read, Grep, Glob
model: sonnet
---
Agent instructions...
```

- Frontmatter configuration
- Tool access control
- Persistent memory
- Worktree isolation
- Custom hooks per agent

### Hooks System

18 lifecycle events for automation and guardrails.

- PreToolUse / PostToolUse
- SessionStart / SessionStop
- Stop / SubagentStop
- Notification, ConfigChange
- WorktreeCreate / WorktreeRemove
- UserPromptSubmit, ModelResponse
- ToolError, ToolRetry
- BackgroundTaskStart / BackgroundTaskEnd
- PreCompact / PostCompact

### Chrome Integration

Browser control for web testing and automation.

```bash
claude --chrome
```

- Navigate, screenshot, fill forms
- Click elements, execute JavaScript
- Monitor network, console logs

### Remote Sessions & Teleport

Work across web and terminal seamlessly.

```bash
claude --remote "task"       # Start on cloud
claude --teleport            # Resume locally
```

### Desktop App

Standalone application with visual session management.

- Multiple parallel sessions
- Remote and SSH sessions
- Visual diff and permissions
- Plugin marketplace

### VS Code Extension

Full IDE integration with visual features.

- Prompt box with `@` file references
- Diff view for changes
- Multiple parallel conversations
- Resume remote sessions

### Sandboxing

OS-level filesystem and network isolation.

- macOS: Seatbelt
- Linux: bubblewrap + socat
- Domain-based network filtering
- Auto-allow mode for sandboxed commands

### Extended Thinking

Configurable reasoning budget.

- Default: 31,999 token budget
- Adjustable via `/model` or `MAX_THINKING_TOKENS`
- Logarithmic accuracy relationship

### Fast Mode

Same Opus 4.6 model with faster output.

```
/fast                       # Toggle fast mode
```

### Background Tasks

Run subagents concurrently.

- `Ctrl+B` to background current task
- `Ctrl+T` to toggle task list
- `Ctrl+F` to kill all agents
- Automatic permission handling

### Worktree Isolation

Git worktree support for parallel work.

```bash
claude --worktree feature-name
```

### Modular Rules

Path-specific rules in `.claude/rules/`.

```yaml
---
paths:
  - "src/api/**/*.ts"
---
Rules for API files...
```

### Devcontainer Support

Docker-based development environments.

```json
{
  "features": {
    "ghcr.io/anthropics/claude-code-devcontainer-feature:latest": {}
  }
}
```

### GitHub Actions Integration

Official `anthropics/claude-code-action` for CI/CD.

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Slack Integration

Direct Claude Code access from Slack channels.

### OpenTelemetry Monitoring

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1 claude
```

Session metrics, cost tracking, usage monitoring.

---

## Provider Support

| Provider | Feature |
|----------|---------|
| Anthropic | Direct API access |
| AWS Bedrock | IAM authentication, cross-region inference |
| Google Vertex AI | GCP IAM, regional deployment |
| Microsoft Azure Foundry | Azure AD authentication |

---

## Breaking Changes to Watch

| Change | Impact |
|--------|--------|
| Custom commands → Skills | `.claude/commands/` deprecated, migrate to `.claude/skills/` |
| Permission rule syntax updates | Check rule patterns after updates |
| MCP server protocol changes | Verify MCP servers after updates |

---

## Staying Updated

```bash
# Check current version
claude --version

# Update to latest
npm install -g @anthropic-ai/claude-code@latest

# Disable auto-updates
export DISABLE_CLAUDE_AUTOUPDATER=1
```

### Release Channels

- **Stable**: Default npm release
- **Latest**: `@latest` tag
- **Specific version**: `@x.y.z`

### Release Notes

Check the [GitHub repository](https://github.com/anthropics/claude-code) for detailed release notes and changelog.
