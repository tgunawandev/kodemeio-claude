# 17 — Troubleshooting

> Common issues, /doctor diagnostics, debugging, error fixes, and recovery patterns.

## Quick Diagnostics

```
/doctor                    # Run built-in diagnostics
/status                    # Session status info
/cost                      # Token/cost check
/context                   # Context usage grid
```

---

## Common Issues

### Authentication

| Problem | Solution |
|---------|----------|
| "Invalid API key" | Run `/login` or check `ANTHROPIC_API_KEY` |
| "Authentication failed" | Clear credentials: `rm ~/.claude/credentials.json`, re-login |
| Bedrock auth fails | Verify `AWS_REGION`, `AWS_PROFILE`, or access keys |
| Vertex auth fails | Run `gcloud auth application-default login` |
| Token expired | Re-authenticate: `/login` or refresh AWS/GCP tokens |

### Installation

| Problem | Solution |
|---------|----------|
| npm install fails | Ensure Node.js 18+: `node --version` |
| Permission denied | Use `sudo npm install -g` or fix npm prefix |
| Command not found | Check `PATH` includes npm global bin |
| Version mismatch | `npm install -g @anthropic-ai/claude-code@latest` |
| Auto-update blocked | `DISABLE_CLAUDE_AUTOUPDATER=1` and manual update |

### Connection

| Problem | Solution |
|---------|----------|
| Timeout errors | Check internet, proxy settings (`HTTP_PROXY`) |
| Rate limited | Wait, reduce request frequency, check plan limits |
| 529 "Overloaded" | Retry after delay, API is temporarily busy |
| Proxy issues | Set `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` |
| SSL errors | Check proxy certificates, `NODE_TLS_REJECT_UNAUTHORIZED` |

### Context & Performance

| Problem | Solution |
|---------|----------|
| "Context window full" | `/compact` or `/clear` |
| Slow responses | Switch to faster model (`/model`), reduce context |
| Lost context | Auto-compaction occurred — re-state key info |
| High costs | See [12-cost-optimization.md](12-cost-optimization.md) |
| Infinite loops | Use `--max-turns` to cap, `Ctrl+C` to interrupt |
| Memory leak | Restart session, report with `/bug` |

### Tools & Permissions

| Problem | Solution |
|---------|----------|
| "Permission denied" for tool | Check `/permissions`, add to allow rules |
| Tool blocked by hook | Check hooks config, review PreToolUse hooks |
| Bash command blocked | Check permission rules, sandbox config |
| Can't read file | Check file exists, check deny rules for `Read(pattern)` |
| Edit fails "not unique" | Provide more context in `old_string` or use `replace_all` |
| Write fails "read first" | Must `Read` the file before `Write`/`Edit` |

### MCP Servers

| Problem | Solution |
|---------|----------|
| Server not connecting | `claude mcp list`, verify command path |
| Tools not appearing | Use `ToolSearch` to load deferred tools |
| "Server timed out" | Check server process, increase timeout |
| Auth failures | Verify env vars in `.mcp.json` |
| Too many tools | Disable unused servers |
| "Server crashed" | Check server logs, restart: `claude mcp remove` + re-add |

### Git Operations

| Problem | Solution |
|---------|----------|
| Can't commit | Check git config, staging area |
| Push fails | Check remote, auth, branch tracking |
| Merge conflicts | Let Claude resolve or handle manually |
| Worktree issues | Check for orphaned worktrees: `git worktree list` |
| Checkpoint restore fails | Check git reflog: `git reflog` |

---

## Debugging Techniques

### Verbose Mode

```bash
claude --verbose              # Show detailed logs
```

### Check Configuration

```bash
claude config list            # All active settings
claude config get permissions # Permission rules
claude mcp list               # MCP servers
```

### Check Environment

```bash
# Verify environment
env | grep -i claude
env | grep -i anthropic
env | grep -i aws
env | grep -i proxy
```

### Test Connectivity

```bash
# Test API connection
claude -p "Hello" --max-turns 1
```

### Inspect Session

```
/status                    # Current session info
/cost                      # Token usage
/context                   # Context breakdown
```

---

## Recovery Patterns

### Context Exhaustion

```
1. /rename "my-work"         # Save session name
2. /clear                     # Full reset
3. "Continue the auth refactor from where we left off.
    Key files: src/auth.ts, src/middleware.ts
    Last change: added JWT validation"
```

### Stuck in Loop

```
1. Ctrl+C                    # Interrupt
2. /clear                     # Reset context
3. Restate task more specifically
```

### Wrong Direction

```
1. /undo                      # Revert to last checkpoint
2. /clear                     # Or reset entirely
3. Start with plan mode: Shift+Tab
4. "Let's take a different approach..."
```

### Lost Work

```bash
# Check git checkpoints
git reflog

# Restore checkpoint
git checkout <commit-hash> -- path/to/file

# Or undo last Claude change
/undo
```

### Corrupt State

```bash
# Reset Claude config
rm -rf ~/.claude/statsig/     # Clear cache
# Don't delete credentials.json or settings.json

# Full reset (last resort)
rm -rf ~/.claude/
claude /login
```

---

## Error Messages Reference

| Error | Meaning | Fix |
|-------|---------|-----|
| `context_length_exceeded` | Input too large | `/compact` or `/clear` |
| `rate_limit_error` | Too many requests | Wait, reduce frequency |
| `overloaded_error` (529) | API busy | Retry after delay |
| `authentication_error` | Bad/expired key | `/login` or check env vars |
| `permission_denied` | Tool blocked | Check `/permissions` |
| `invalid_request_error` | Malformed request | Update Claude Code version |
| `server_error` (500) | API error | Retry, report if persistent |
| `ENOENT` | File not found | Check path exists |
| `EACCES` | OS permission denied | Check file permissions |

---

## Reporting Issues

```
/bug                         # Report bug with session context
```

Or file at: https://github.com/anthropics/claude-code/issues

Include:
- Claude Code version (`claude --version`)
- OS and terminal info
- Steps to reproduce
- Error messages
- Relevant configuration
