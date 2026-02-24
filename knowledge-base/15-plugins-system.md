# 15 — Plugins System

> Plugin creation, installation, marketplace, and management.

## Overview

Plugins extend Claude Code with additional skills, agents, MCP servers, and slash commands. They're distributed via a marketplace and can be scoped to specific projects or user-wide.

---

## Installing Plugins

### From Marketplace

```
/plugins                    # Open plugin manager
# Browse → Select → Install
```

### Plugin Scopes

| Scope | Who Uses It |
|-------|-------------|
| Project | This project only |
| User | All your projects |

---

## Plugin Structure

A plugin is a directory with a manifest:

```
my-plugin/
├── manifest.json          # Plugin metadata
├── skills/                # Skills provided
│   └── my-skill/
│       └── SKILL.md
├── agents/                # Agents provided
│   └── my-agent.md
├── mcp/                   # MCP servers
│   └── config.json
└── README.md              # Documentation
```

### manifest.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": "Your Name",
  "homepage": "https://github.com/you/my-plugin",
  "skills": ["skills/my-skill"],
  "agents": ["agents/my-agent.md"],
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@company/mcp-server"]
    }
  },
  "permissions": {
    "tools": ["Read", "Grep", "Glob"],
    "network": ["api.example.com"]
  }
}
```

---

## Creating Plugins

### 1. Create Structure

```bash
mkdir -p my-plugin/{skills/my-skill,agents}
```

### 2. Add Skills

```yaml
# my-plugin/skills/my-skill/SKILL.md
---
name: my-skill
description: Specialized code analysis
invocation:
  user: slash
  agent: auto
---

Detailed skill instructions...
```

### 3. Add Agents

```yaml
# my-plugin/agents/my-agent.md
---
name: my-agent
description: Specialized worker for X
tools: Read, Grep, Glob
model: haiku
---

Agent instructions...
```

### 4. Create Manifest

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Code analysis toolkit",
  "skills": ["skills/my-skill"],
  "agents": ["agents/my-agent.md"]
}
```

### 5. Test Locally

Install from local path during development before publishing.

---

## Plugin Capabilities

### What Plugins Can Provide

| Capability | Description |
|-----------|-------------|
| Skills | Custom slash commands and auto-invoked skills |
| Agents | Specialized subagents |
| MCP Servers | External tool integrations |
| Rules | Additional project rules |

### What Plugins Cannot Do

- Modify core Claude Code behavior
- Access outside declared permissions
- Override user/project settings
- Run code without permission approval

---

## Managing Plugins

```
/plugins                    # List installed plugins
/plugins install <name>     # Install from marketplace
/plugins remove <name>      # Uninstall plugin
/plugins update             # Update all plugins
/plugins info <name>        # Show plugin details
```

---

## Plugin Priority

When multiple plugins provide agents or skills with the same name:

| Priority | Source |
|----------|--------|
| 1 (highest) | Project `.claude/` |
| 2 | User `~/.claude/` |
| 3 (lowest) | Plugins |

Project and user definitions always override plugin definitions.

---

## Plugin Permissions

Plugins declare required permissions in their manifest. Users must approve:

```json
{
  "permissions": {
    "tools": ["Read", "Grep", "Glob", "Bash(npm test *)"],
    "network": ["api.example.com"],
    "fileAccess": ["src/**/*.ts"]
  }
}
```

Plugin tools follow the same permission system as regular tools — they can be further restricted by user settings.

---

## Popular Plugin Categories

| Category | Examples |
|----------|---------|
| **Code Quality** | Linters, formatters, code review |
| **Testing** | Test generators, coverage analysis |
| **Documentation** | Doc generators, API spec tools |
| **DevOps** | Deployment helpers, infrastructure tools |
| **Integrations** | Jira, Linear, Slack, GitHub |
| **Languages** | Language-specific tools and conventions |
| **Security** | Vulnerability scanners, audit tools |
| **Data** | Database tools, data analysis |

---

## Best Practices

1. **Review plugin permissions** before installing
2. **Prefer official/verified plugins** from trusted authors
3. **Keep plugins updated** for security fixes
4. **Disable unused plugins** to reduce context overhead
5. **Project-scope plugins** when only needed for specific work
6. **Create team plugins** for shared conventions and workflows
