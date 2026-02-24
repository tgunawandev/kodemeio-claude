# 07 — Subagents & Agent Teams

> Complete reference for task delegation, specialized agents, parallel execution, and multi-agent teams.

## Overview

Subagents are specialized AI assistants that handle specific tasks in isolated context windows. Each has its own system prompt, tool access, permissions, and optional persistent memory.

## Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `Explore` | Haiku | Read, Grep, Glob | Fast codebase exploration, search |
| `Plan` | Inherit | Read-only | Planning and analysis |
| `general-purpose` | Inherit | All | Complex multi-step tasks |
| `Bash` | Inherit | Bash only | Terminal commands |
| `statusline-setup` | Sonnet | Read, Edit | Configure status line |
| `claude-code-guide` | Haiku | Read, WebFetch, WebSearch | Claude Code help |

## Creating Custom Subagents

### Via Interactive Interface

```bash
/agents → Create new agent → Choose scope → Generate with Claude → Configure
```

### Via CLI

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer",
    "prompt": "Review code for quality and security",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### Via File

Create `.claude/agents/agent-name.md`:

```yaml
---
name: code-reviewer
description: Expert code review. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
model: sonnet
permissionMode: default
maxTurns: 20
skills:
  - api-conventions
memory: user
background: false
isolation: worktree
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---

You are a senior code reviewer ensuring high standards.

When reviewing:
1. Check for logic errors and edge cases
2. Verify error handling
3. Look for security vulnerabilities
4. Assess test coverage
5. Review code style and readability
```

### Scope & Priority

| Priority | Location | Scope |
|----------|----------|-------|
| 1 (highest) | `--agents` CLI flag | Session only |
| 2 | `.claude/agents/` | Project (team) |
| 3 | `~/.claude/agents/` | User (all projects) |
| 4 (lowest) | Plugin `agents/` | Where plugin enabled |

---

## Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique ID (lowercase, hyphens) |
| `description` | Yes | When to delegate (include "proactively" for auto-use) |
| `tools` | No | Allowed tools (inherits all if omitted) |
| `disallowedTools` | No | Tools to deny |
| `model` | No | `sonnet`, `opus`, `haiku`, `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before stopping |
| `skills` | No | Skills to preload into startup context |
| `mcpServers` | No | MCP servers available to agent |
| `memory` | No | Persistence: `user`, `project`, `local` |
| `background` | No | Always run in background (default: false) |
| `isolation` | No | `worktree` for git worktree isolation |
| `hooks` | No | Lifecycle hooks scoped to this agent |

---

## Tool Access Control

### Allow specific tools

```yaml
tools: Read, Grep, Glob, Bash
```

### Deny specific tools

```yaml
disallowedTools: Write, Edit, Bash(rm *)
```

### Restrict spawnable subagents

```yaml
tools: Task(worker, researcher), Read, Bash
```

Only `worker` and `researcher` can be spawned.

---

## Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny unless pre-approved |
| `bypassPermissions` | Skip all checks (use carefully) |
| `plan` | Read-only exploration |

---

## Preloading Skills

Inject full skill content at startup:

```yaml
---
name: api-developer
skills:
  - api-conventions
  - error-handling-patterns
---

Implement endpoints using the preloaded conventions.
```

Skills are loaded once. Subagents don't inherit parent's skills.

---

## Persistent Memory

Enable cross-session learning:

```yaml
---
name: code-reviewer
memory: user
---
```

| Scope | Location | Use Case |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Cross-project patterns |
| `project` | `.claude/agent-memory/<name>/` | Project-specific (VCS) |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific (local) |

When enabled:
- System prompt includes memory read/write instructions
- First 200 lines of `MEMORY.md` auto-loaded
- Read, Write, Edit tools automatically enabled

---

## Running Subagents

### Foreground (Default)

- Blocks main conversation
- Permission prompts pass through
- Interactive

### Background

- Runs concurrently with main conversation
- Permissions must be pre-approved
- Auto-denies unapproved tools
- MCP tools not available
- Press `Ctrl+B` to background a running task
- Disable: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`

### Worktree Isolation

```yaml
isolation: worktree
```

Agent gets isolated git worktree copy. Changes stay in separate branch. Cleaned up if no changes made.

---

## Automatic Delegation

Claude decides to use subagents based on:
- Your task description
- Agent's `description` field
- Current context and conversation state

**Tip**: Include "use proactively" in descriptions for automatic delegation.

---

## Common Patterns

### Parallel Research

```
Research authentication, database schema, and API patterns in parallel using subagents
```

### Chain Subagents

```
Use code-reviewer to find issues, then debugger to fix them
```

### Isolate Verbose Operations

Delegate test runs, log analysis, and documentation generation to subagents to keep main context clean.

---

## Example Subagents

### Security Reviewer

```yaml
---
name: security-reviewer
description: Reviews code for security vulnerabilities. Use proactively on auth, input handling, and API code.
tools: Read, Grep, Glob, Bash
model: opus
---

You are a security engineer. Review for:
- Injection vulnerabilities (SQL, XSS, command)
- Authentication/authorization flaws
- Secrets in code
- Insecure data handling
- OWASP Top 10 issues

Provide severity ratings and remediation steps.
```

### Test Writer

```yaml
---
name: test-writer
description: Writes comprehensive tests for modified code. Use proactively after code changes.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

Write tests following project conventions:
1. Read source file to understand behavior
2. Create test file with same naming pattern
3. Include: happy path, edge cases, error cases, boundary values
4. Run tests and fix failures
5. Target > 90% coverage
```

### Database Query Validator

```yaml
---
name: db-reader
description: Execute read-only database queries. Use for data analysis and reports.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You can only execute READ operations (SELECT, SHOW, DESCRIBE, EXPLAIN).
Never run INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, or TRUNCATE.
```

---

## Agent Teams (Multi-Agent)

### Overview

Agent teams coordinate multiple Claude instances using tmux for parallel workstreams. A "lead" agent manages "teammates" working on different aspects of a task.

### Enable Agent Teams

```bash
# Enable in settings
claude config set agentTeams true

# Or via environment
CLAUDE_CODE_ENABLE_AGENT_TEAMS=1 claude
```

### Start a Team

```
Work on this with a team: implement auth, add tests, update docs
```

Or:
```
Start an agent team to parallelize this refactoring
```

### Architecture

- **Lead**: Coordinates work, delegates tasks, reviews results
- **Teammates**: Work independently in tmux panes with their own context
- **Communication**: Via shared task management and messaging system

### Control Your Team

| Action | How |
|--------|-----|
| Choose display mode | `full` (see all panes) or `minimal` (lead only) |
| Specify teammates | Name agents and their models |
| Require plan approval | Lead proposes plan, you approve before teammates start |
| Talk to specific teammate | `@teammate-name: your message` |
| Assign tasks | Describe task for specific teammate |
| Shut down teammate | Ask lead to stop a specific teammate |
| Clean up | `Ctrl+C` or ask lead to wrap up |

### Cost

Agent teams use ~7x more tokens than standard sessions. Each teammate has its own context window.

### Best Practices

1. Give teammates enough context upfront
2. Size tasks appropriately (not too small, not too large)
3. Wait for teammates to finish before combining
4. Start with research/review tasks (lower risk)
5. Avoid file conflicts between teammates
6. Monitor and steer as needed

### Limitations

- Experimental feature
- Requires tmux
- Higher token costs
- Teammates can't share context directly
- Intel Macs may have limitations
