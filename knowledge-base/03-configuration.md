# 03 — Configuration

> Complete reference for all configuration files, settings, permissions, and sandboxing.

## Configuration Scopes

Settings are organized into scopes with clear precedence:

| Priority | Scope | Location | Shared |
|----------|-------|----------|--------|
| 1 (highest) | Managed (IT) | System-level paths | Organization-wide |
| 2 | CLI arguments | Command line | Per session |
| 3 | Local project | `.claude/settings.local.json` | No (gitignored) |
| 4 | Project | `.claude/settings.json` | Yes (team) |
| 5 (lowest) | User | `~/.claude/settings.json` | No (personal) |

### Managed Settings Paths

| OS | Path |
|----|------|
| macOS | `/Library/Application Support/ClaudeCode/` |
| Linux/WSL | `/etc/claude-code/` |
| Windows | `C:\Program Files\ClaudeCode\` |

Files: `managed-settings.json`, `managed-mcp.json`, `CLAUDE.md`

---

## File Locations Reference

```
User Scope:
  ~/.claude/settings.json                    # User settings
  ~/.claude/settings.local.json              # User local overrides
  ~/.claude/CLAUDE.md                        # User memory (all projects)
  ~/.claude/agents/                          # User subagents
  ~/.claude/skills/                          # User skills
  ~/.claude/rules/*.md                       # User-level rules
  ~/.claude/keybindings.json                 # Keyboard shortcuts
  ~/.claude/hooks/                           # Hook scripts
  ~/.claude/commands/                        # Legacy custom commands
  ~/.claude/projects/<project>/memory/       # Auto memory per project
  ~/.claude/agent-memory/<agent>/            # Agent persistent memory
  ~/.claude.json                             # Credentials, OAuth, MCP cache

Project Scope:
  .claude/settings.json                      # Project settings (team)
  .claude/settings.local.json                # Personal project overrides
  .claude/CLAUDE.md                          # Project memory
  CLAUDE.md                                  # Project memory (root, legacy)
  CLAUDE.local.md                            # Personal project memory (gitignored)
  .claude/agents/                            # Project subagents
  .claude/skills/                            # Project skills
  .claude/rules/                             # Path-specific rules
  .claude/hooks/                             # Hook scripts
  .claude/agent-memory/<agent>/              # Project agent memory
  .claude/agent-memory-local/<agent>/        # Local project agent memory
  .mcp.json                                  # Project MCP servers
```

---

## Settings File Format

### Complete `settings.json` Schema

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",

  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Read(~/.zshrc)",
      "Edit(/docs/**)"
    ],
    "ask": [
      "Bash(git push *)"
    ],
    "deny": [
      "Bash(curl *)",
      "Bash(rm -rf *)",
      "Read(.env)",
      "Read(.env.*)"
    ],
    "additionalDirectories": ["../docs/", "../shared-config/"],
    "defaultMode": "default"
  },

  "model": "claude-sonnet-4-6",
  "availableModels": ["sonnet", "haiku"],
  "outputStyle": "Explanatory",
  "language": "english",

  "env": {
    "NODE_ENV": "development",
    "CUSTOM_VAR": "value"
  },

  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx prettier --write"
      }]
    }]
  },

  "sandbox": {
    "enabled": true,
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"]
    }
  },

  "enabledPlugins": {
    "formatter@acme-tools": true,
    "linter@company-internal": true
  },

  "attribution": {
    "commit": "Generated with AI",
    "pr": ""
  },

  "cleanupPeriodDays": 30
}
```

---

## Permission System

### Permission Modes

| Mode | File Edits | Bash Commands | File Reads | Use Case |
|------|-----------|---------------|-----------|----------|
| `default` | Ask | Ask | Free | Normal development |
| `acceptEdits` | Auto | Ask | Free | Trusted edit sessions |
| `plan` | Deny | Deny | Free | Analysis/review only |
| `dontAsk` | Auto-Deny | Auto-Deny | Free | Restrictive, explicit only |
| `bypassPermissions` | Auto | Auto | Free | Isolated/safe environments |

### Permission Rule Syntax

**Tool-level matching:**
```
Bash                             # Match all Bash commands
Edit                             # Match all edits
Write                            # Match all writes
Read                             # Match all reads
WebFetch                         # Match all web fetches
mcp__github__*                   # All tools from github MCP
Task(Explore)                    # Specific subagent type
Skill(deploy)                    # Specific skill
```

**Bash command matching:**
```
Bash(npm run build)              # Exact command
Bash(npm run *)                  # Prefix wildcard
Bash(npm *)                      # Any npm command
Bash(* --version)                # Commands ending with --version
Bash(git * main)                 # Commands containing variables
```

**File path matching (gitignore syntax):**
```
Read(*.env)                      # Files in current directory
Read(/src/**/*)                  # Relative to settings file
Read(~/Documents/*.pdf)          # Home directory
Read(//absolute/path/*)          # Absolute filesystem path
Edit(/docs/**)                   # Recursive patterns
Write(temp/)                     # Directory matching
```

**Web domain matching:**
```
WebFetch(domain:example.com)     # Specific domain
WebFetch(domain:*.example.com)   # Subdomain wildcard
```

**MCP tool matching:**
```
mcp__github__*                   # All github tools
mcp__github__search_repos        # Specific tool
mcp__.*__write.*                 # Regex pattern
```

### Permission Precedence

1. **deny** rules — always block
2. **ask** rules — prompt user
3. **allow** rules — auto-approve
4. First matching rule wins

### Example Configurations

**Permissive development:**
```json
{
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(pnpm *)",
      "Bash(git *)",
      "Bash(make *)",
      "Edit",
      "Write"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl * | bash)",
      "Read(.env*)"
    ]
  }
}
```

**Restrictive CI/CD:**
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test)",
      "Bash(npm run lint)",
      "Read"
    ],
    "deny": [
      "Bash",
      "Edit",
      "Write"
    ]
  }
}
```

---

## Sandboxing

### Overview

Sandboxing provides OS-level enforcement of filesystem and network isolation beyond permissions.

### Enable Sandboxing

```bash
# Via settings
{
  "sandbox": {
    "enabled": true
  }
}

# Or per-session
claude --sandbox
```

### Sandbox Modes

| Mode | Filesystem | Network |
|------|-----------|---------|
| Enabled | Restricted to project + allowed dirs | Restricted to allowed domains |
| Disabled | Full access (permission-based) | Full access |

### Network Configuration

```json
{
  "sandbox": {
    "enabled": true,
    "network": {
      "allowedDomains": [
        "github.com",
        "*.npmjs.org",
        "registry.yarnpkg.com",
        "api.anthropic.com"
      ]
    }
  }
}
```

### Security Benefits

- **Prompt injection protection**: Even if Claude is tricked, sandbox limits damage
- **Reduced attack surface**: No access to files outside project
- **Transparent operation**: All restrictions visible via `/permissions`

---

## Excluding Sensitive Files

### Via `.gitignore`

Files in `.gitignore` are respected by Claude Code's file operations.

### Via Settings

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(credentials.*)",
      "Read(**/*.pem)",
      "Read(**/*.key)"
    ]
  }
}
```

### Via CLAUDE.md

```markdown
# Sensitive Files
NEVER read or modify these files:
- .env, .env.local, .env.production
- credentials.json
- Any file containing API keys
```
