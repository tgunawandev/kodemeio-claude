# 05 — MCP Servers (Model Context Protocol)

> Complete reference for MCP server integration, configuration, and management.

## Overview

MCP (Model Context Protocol) allows Claude Code to connect to external tools and services — databases, APIs, browsers, monitoring systems, and more. MCP servers expose tools, resources, and prompts that Claude can use during sessions.

## Transport Types

| Type | Protocol | Use Case |
|------|----------|----------|
| `http` | HTTP + Streamable HTTP | **Preferred** — Modern remote servers |
| `sse` | Server-Sent Events | Legacy remote servers (deprecated) |
| `stdio` | Standard I/O | Local processes |

---

## Adding MCP Servers

### HTTP Server (Recommended)

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport http github https://api.github.com/mcp
```

### HTTP with Authentication

```bash
# With headers
claude mcp add --transport http github \
  --header "Authorization: Bearer ghp_xxxxx" \
  https://api.github.com/mcp

# With OAuth (interactive)
claude mcp add --transport http notion https://mcp.notion.com/mcp
# Then: /mcp → Select server → Authenticate
```

### SSE Server (Legacy)

```bash
claude mcp add --transport sse asana https://mcp.asana.com/sse
```

### Stdio Server (Local)

```bash
# Basic
claude mcp add --transport stdio postgres -- npx -y @modelcontextprotocol/server-postgres

# With environment variables
claude mcp add --transport stdio airtable \
  --env AIRTABLE_API_KEY=YOUR_KEY \
  -- npx -y airtable-mcp-server

# With arguments
claude mcp add --transport stdio filesystem \
  -- npx -y @modelcontextprotocol/server-filesystem /path/to/dir
```

---

## MCP Scopes

| Scope | Flag | Location | Shared |
|-------|------|----------|--------|
| Local | `--scope local` (default) | `~/.claude.json` | No (personal, this project) |
| Project | `--scope project` | `.mcp.json` | Yes (team, via git) |
| User | `--scope user` | `~/.claude.json` | No (personal, all projects) |

### Choosing the Right Scope

- **Local**: Personal tools for current project (API keys, dev databases)
- **Project**: Team-shared tools (GitHub, Sentry, shared DBs) — commit `.mcp.json`
- **User**: Tools you use across all projects (personal utilities)

### Scope Precedence

Local > Project > User. If same-named server exists in multiple scopes, local wins.

---

## Managing MCP Servers

```bash
claude mcp list                          # List all servers
claude mcp get <name>                    # Get server details
claude mcp remove <name>                 # Remove server
claude mcp reset-project-choices         # Reset approval choices
/mcp                                     # In-session management + OAuth
```

### Dynamic Tool Updates

MCP tools refresh automatically when servers change. No restart needed.

---

## Configuration Files

### `.mcp.json` (Project Scope)

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.github.com/mcp",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL:-postgres://localhost:5432/mydb}"
      }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

### Environment Variable Expansion

Supports `${VAR}` and `${VAR:-default}` syntax:

```json
{
  "url": "${API_URL:-https://default.example.com}/mcp",
  "env": {
    "API_KEY": "${API_KEY}",
    "DB_URL": "${DATABASE_URL:-postgres://localhost:5432/dev}"
  }
}
```

---

## Popular MCP Servers

### Official / Well-Known

| Server | Purpose | Transport |
|--------|---------|-----------|
| GitHub | Code reviews, PRs, issues | HTTP |
| Sentry | Error monitoring, debugging | HTTP |
| Notion | Documentation, knowledge bases | HTTP |
| PostgreSQL | Database queries, schema | stdio |
| Stripe | Payment integration | HTTP |
| Figma | Design integration | HTTP |
| Jira | Issue tracking | HTTP |
| Slack | Messaging integration | HTTP |
| Linear | Issue tracking | HTTP |
| Airtable | Data management | stdio |
| Filesystem | File system access | stdio |
| Chrome DevTools | Browser automation | Built-in |

### Database Servers

```bash
# PostgreSQL
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres

# SQLite
claude mcp add sqlite -- npx -y @modelcontextprotocol/server-sqlite /path/to/db.sqlite

# MySQL (community)
claude mcp add mysql -- npx -y mysql-mcp-server
```

### Monitoring & Error Tracking

```bash
# Sentry
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Datadog (community)
claude mcp add --transport http datadog https://mcp.datadoghq.com/mcp
```

---

## Authentication

### OAuth 2.0 (Interactive)

```bash
# Add server
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Authenticate in session
/mcp → Select server → Authenticate
```

### Pre-configured OAuth

```bash
claude mcp add --transport http my-server \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  https://mcp.example.com/mcp
```

### API Keys via Environment

```bash
claude mcp add --transport stdio server \
  --env API_KEY=sk-xxxxx \
  -- command
```

### Token Storage

OAuth tokens stored securely in system keychain (macOS Keychain, Linux Secret Service, Windows Credential Store).

---

## MCP Tool Search

When many MCP servers are connected, Claude uses Tool Search to defer loading all tools:

### How It Works

1. Tools exceeding threshold are deferred (not loaded into context)
2. Claude searches for relevant tools using `ToolSearch`
3. Only needed tools are loaded on-demand
4. Saves significant context window space

### Configuration

```bash
# Auto-activate at 5% of context (default: 10%)
ENABLE_TOOL_SEARCH=auto:5 claude

# Always enable
ENABLE_TOOL_SEARCH=true claude

# Disable entirely
ENABLE_TOOL_SEARCH=false claude

# Auto with default threshold
ENABLE_TOOL_SEARCH=auto claude
```

### For MCP Server Authors

To support tool search effectively:
- Write clear, descriptive tool names
- Include detailed descriptions
- Use consistent naming conventions

---

## MCP Resources

MCP servers can expose resources (data sources) in addition to tools:

```bash
# List available resources
/mcp → Resources

# Reference in prompts
@mcp://server-name/resource-path
```

---

## MCP Prompts as Commands

MCP servers can register prompts that appear as slash commands:

```bash
/mcp__github__create_pr
/mcp__sentry__search_errors
```

These are dynamic — they appear when the server is connected and exposes prompts.

---

## Output Limits

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| MCP output limit | 25,000 tokens | `MAX_MCP_OUTPUT_TOKENS` |
| MCP startup timeout | 10,000 ms | `MCP_TIMEOUT` |

### Handling Large Outputs

```bash
# Increase MCP output limit
MAX_MCP_OUTPUT_TOKENS=50000 claude

# Increase startup timeout
MCP_TIMEOUT=30000 claude
```

---

## Using Claude Code AS an MCP Server

Claude Code can itself be used as an MCP server for other applications:

```bash
claude mcp serve
```

This exposes Claude Code's tools as MCP tools to other MCP clients.

---

## Managed MCP Configuration

### Option 1: Exclusive Control

Deploy `managed-mcp.json` to system directory. Users cannot modify or extend.

### Option 2: Policy-Based Control

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": ["npx", "-y", "approved-package"] },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "untrusted-server" },
    { "serverUrl": "https://*.external.com/*" }
  ]
}
```

### Restriction Types

| Type | Matches On |
|------|-----------|
| `serverName` | Server name in configuration |
| `serverCommand` | Array of command + args for stdio servers |
| `serverUrl` | URL pattern for HTTP/SSE servers (supports `*` wildcard) |

---

## Import from Claude Desktop

```bash
claude mcp add-from-claude-desktop
```

Imports all MCP server configurations from Claude Desktop app.

---

## Import from JSON Configuration

```bash
claude --mcp-config /path/to/mcp-servers.json
```

Only use specified MCPs (ignore others):
```bash
claude --strict-mcp-config --mcp-config /path/to/mcp-servers.json
```

---

## Best Practices

1. **Prefer HTTP transport** over SSE — more reliable, modern standard
2. **Use project scope** for team-shared servers — commit `.mcp.json` to git
3. **Store secrets in env vars** — never hardcode API keys
4. **Disable unused servers** — each adds tool definitions to context
5. **Prefer CLI tools** over MCP for simple operations (e.g., `gh` instead of GitHub MCP)
6. **Enable tool search** when using many servers
7. **Set appropriate timeouts** — increase `MCP_TIMEOUT` for slow servers
8. **Audit server security** — be cautious with servers that fetch untrusted content
9. **Use `--scope project`** for `.mcp.json` to share configuration with team
