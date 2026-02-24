# 06 — Hooks System

> Complete reference for lifecycle hooks, event types, automation, and configuration.

## Overview

Hooks are commands or prompts that execute at specific lifecycle points in Claude Code. They enable deterministic automation: formatting code, validating commands, blocking dangerous operations, sending notifications, and more.

## Hook Types

| Type | Description | Use Case |
|------|-------------|----------|
| `command` | Execute shell command | Format code, validate, notify |
| `prompt` | Single LLM call for decision | Check completeness, approve/deny |
| `agent` | Multi-turn subagent with tools | Verify tests pass, complex checks |

---

## Hook Events (Complete List)

| Event | Fires When | Matcher Filters |
|-------|-----------|-----------------|
| `SessionStart` | Session begins/resumes | `startup`, `resume`, `clear`, `compact` |
| `UserPromptSubmit` | Before Claude processes prompt | (no matcher) |
| `PreToolUse` | Before tool executes (can block) | Tool name |
| `PermissionRequest` | Permission dialog appears | Tool name |
| `PostToolUse` | After tool succeeds | Tool name |
| `PostToolUseFailure` | After tool fails | Tool name |
| `Notification` | Claude needs attention | `permission_prompt`, `idle_prompt`, `auth_success` |
| `SubagentStart` | Subagent spawned | Agent type name |
| `SubagentStop` | Subagent finishes | Agent type name |
| `Stop` | Claude finishes responding | (no matcher) |
| `TeammateIdle` | Agent team teammate idle | (no matcher) |
| `TaskCompleted` | Task marked complete | (no matcher) |
| `ConfigChange` | Config file changes | `user_settings`, `project_settings`, `skills` |
| `WorktreeCreate` | Creating worktree | (no matcher) |
| `WorktreeRemove` | Removing worktree | (no matcher) |
| `PreCompact` | Before context compression | `manual`, `auto` |
| `SessionEnd` | Session terminates | `clear`, `logout`, `other` |

---

## Configuration

### Hook Locations

| Location | Scope | Priority |
|----------|-------|----------|
| Managed policy settings | Organization-wide | Highest |
| `~/.claude/settings.json` | User (all projects) | High |
| `.claude/settings.json` | Project (team) | Medium |
| `.claude/settings.local.json` | Project (personal) | Medium |
| Plugin hooks | Where plugin enabled | Low |
| Skill/agent frontmatter | While component active | Lowest |

### Settings Format

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "pattern",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

---

## Hook Input/Output

### Input (JSON via stdin)

Every hook receives JSON on stdin with context about the event:

```json
{
  "session_id": "abc123",
  "cwd": "/project/path",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

### Tool-Specific Input Fields

**Bash:**
```json
{ "tool_input": { "command": "npm test", "timeout": 120000 } }
```

**Write:**
```json
{ "tool_input": { "file_path": "/src/app.ts", "content": "..." } }
```

**Edit:**
```json
{ "tool_input": { "file_path": "/src/app.ts", "old_string": "...", "new_string": "..." } }
```

**Read:**
```json
{ "tool_input": { "file_path": "/src/app.ts" } }
```

**Glob:**
```json
{ "tool_input": { "pattern": "**/*.ts" } }
```

**Grep:**
```json
{ "tool_input": { "pattern": "TODO", "path": "/src" } }
```

**WebFetch:**
```json
{ "tool_input": { "url": "https://example.com" } }
```

**Task:**
```json
{ "tool_input": { "prompt": "...", "subagent_type": "Explore" } }
```

### Exit Codes

| Code | Behavior |
|------|----------|
| `0` | Success — action proceeds. Stdout may add context to Claude |
| `2` | Block — action denied. Stderr sent as feedback to Claude |
| Other | Proceed — stderr logged (visible in verbose mode) |

### Exit Code 2 Behavior by Event

| Event | Exit 2 Effect |
|-------|---------------|
| `PreToolUse` | Tool call blocked, stderr sent to Claude |
| `UserPromptSubmit` | Prompt blocked, stderr shown to user |
| `Stop` | Claude continues (doesn't stop yet) |
| `PermissionRequest` | Permission auto-denied |
| `SessionStart` | Session proceeds with warning |

### Structured JSON Output

For more control, output JSON to stdout with exit code 0:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use ripgrep instead of grep for performance"
  }
}
```

**Decision options:**
- `"allow"` — Auto-approve (skip permission prompt)
- `"deny"` — Block the action
- Omit — Use default behavior

---

## Matcher Patterns

Matchers use regex patterns (case-sensitive) to filter when hooks fire:

### Tool Name Matchers

```
"Bash"                    # Exact match
"Edit|Write"              # Multiple tools (OR)
"mcp__github__.*"         # Regex: all GitHub MCP tools
"mcp__.*__search.*"       # Regex: search tools across MCPs
```

### Session Matchers

```
"startup"                 # New session
"resume"                  # Resumed session
"clear"                   # After /clear
"compact"                 # After /compact
```

### Notification Matchers

```
"permission_prompt"       # Permission needed
"idle_prompt"             # Waiting for input
"auth_success"            # Authentication completed
```

---

## Command Hooks (Examples)

### Auto-Format After Edits

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### Block Protected Files

```bash
#!/bin/bash
# .claude/hooks/protect-files.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

PROTECTED=(".env" "package-lock.json" ".git/" "dist/" "build/")

for pattern in "${PROTECTED[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: Cannot modify protected file: $FILE_PATH" >&2
    exit 2
  fi
done
exit 0
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/protect-files.sh"
          }
        ]
      }
    ]
  }
}
```

### Desktop Notification

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Needs your attention'"
          }
        ]
      }
    ]
  }
}
```

### macOS Notification

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

### Re-inject Context After Compaction

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Use pnpm not npm. Run tests before committing. Follow TypeScript strict mode.'"
          }
        ]
      }
    ]
  }
}
```

### Validate Database Queries (Read-Only)

```bash
#!/bin/bash
# .claude/hooks/readonly-db.sh
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -iqE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b'; then
  echo "Blocked: Write operations not allowed on database" >&2
  exit 2
fi
exit 0
```

### Run Linter After Edits

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs eslint --fix 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### Persist Environment Variables

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "cat .claude/env.json"
          }
        ]
      }
    ]
  }
}
```

---

## Prompt-Based Hooks

Single LLM call for yes/no decisions:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all requested tasks are complete and tests pass. Respond with {\"ok\": true} or {\"ok\": false, \"reason\": \"explanation\"}"
          }
        ]
      }
    ]
  }
}
```

### Response Schema

Prompt hooks must return JSON:
```json
{"ok": true}
```
or
```json
{"ok": false, "reason": "Tests are not passing. 3 failures detected."}
```

---

## Agent-Based Hooks

Multi-turn subagent with tool access for complex verification:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Run the test suite with `npm test` and verify all tests pass. If any fail, report the failures.",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

---

## Async (Background) Hooks

Run hooks without blocking the main flow:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "./run-background-linter.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## Hooks in Skills & Subagents

### Skill Hooks

```yaml
---
name: api-builder
hooks:
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "npx prettier --write"
---
```

### Subagent Hooks

```yaml
---
name: db-reader
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./validate-readonly-query.sh"
---
```

---

## Interactive Management

```bash
/hooks           # Open hooks management interface
```

Features:
- View all configured hooks by event
- Add/edit/delete hooks
- Test hooks manually
- See hook execution logs

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hook not firing | Check `/hooks`, verify matcher (case-sensitive), restart session |
| Hook errors | Test manually: `echo '{"tool_name":"Bash"}' \| ./hook.sh` |
| Executable issues | Run `chmod +x ./hook.sh`, verify shebang line |
| JSON validation failed | Check for unconditional `echo` in shell profile |
| Timeout issues | Increase `"timeout"` field (default: 10 seconds) |
| Can't find script | Use absolute path or `$CLAUDE_PROJECT_DIR` prefix |
| Hook blocks too much | Refine matcher regex to be more specific |

### Debug Techniques

```bash
# Enable verbose mode to see hook execution
Ctrl+O

# Or start with debug logging
claude --debug "hooks"
```
