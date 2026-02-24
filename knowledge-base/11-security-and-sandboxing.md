# 11 — Security & Sandboxing

> Permission architecture, sandboxing, prompt injection protection, and security best practices.

## Security Model

Claude Code follows a **permission-based architecture**:
- Read-only by default
- Every write/execute action requires explicit approval
- Approvals can be allowlisted for efficiency
- OS-level sandboxing available for defense-in-depth

## Permission System

### Permission Modes

| Mode | File Edits | Commands | Reads | Use Case |
|------|-----------|----------|-------|----------|
| `default` | Ask | Ask | Free | Normal work |
| `acceptEdits` | Auto | Ask | Free | Trusted edits |
| `plan` | Deny | Deny | Free | Analysis only |
| `dontAsk` | Auto-Deny | Auto-Deny | Free | Restrictive |
| `bypassPermissions` | Auto | Auto | Free | Isolated envs |

### Permission Rules

Rules use three tiers: `deny` > `ask` > `allow`. First match wins.

```json
{
  "permissions": {
    "allow": ["Bash(npm run *)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Bash(rm -rf *)", "Read(.env*)"]
  }
}
```

See [03-configuration.md](03-configuration.md) for complete rule syntax.

---

## Sandboxing

### What It Does

OS-level enforcement of filesystem and network isolation for bash commands.

### Why Both Are Needed

- **Without network isolation**: SSH keys could be exfiltrated
- **Without filesystem isolation**: system resources could be backdoored
- **With both**: even if Claude is tricked, damage is contained

### How It Works

| Platform | Technology |
|----------|-----------|
| macOS | Seatbelt (built-in) |
| Linux | bubblewrap + socat |
| WSL2 | bubblewrap + socat |
| WSL1 | Not supported |

### Enable

```bash
/sandbox   # Interactive setup
```

### Modes

**Auto-allow mode**: Sandboxed commands run automatically without permission prompts. Non-sandboxable commands fall back to normal permissions.

**Regular permissions mode**: All commands go through permission flow, even when sandboxed. More control, more prompts.

### Configuration

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

### Limitations

- **Network filtering**: Domain-based, doesn't inspect traffic
- **Broad domains**: `github.com` may allow data exfiltration via repos
- **Unix sockets**: `allowUnixSockets` grants access to powerful services
- **Filesystem escalation**: Broad write permissions can enable privilege escalation
- **Linux Docker**: `enableWeakerNestedSandbox` mode weakens security

---

## Prompt Injection Protection

### Core Protections

- **Permission system**: All sensitive operations require approval
- **Context-aware analysis**: Detects harmful instructions in full context
- **Input sanitization**: Prevents command injection
- **Command blocklist**: `curl`, `wget` blocked by default
- **Isolated context windows**: Web fetch uses separate context
- **Trust verification**: New codebases/MCPs require verification
- **Command injection detection**: Suspicious commands flagged even if allowlisted
- **Fail-closed matching**: Unmatched commands default to requiring approval

### Best Practices

1. **Review suggested commands** before approving
2. **Don't pipe untrusted content** to Claude
3. **Verify changes** to critical files
4. **Use VMs** for untrusted code
5. **Report suspicious behavior** with `/bug`

---

## Secrets Management

### Never Commit Secrets

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

### Secure Credential Storage

- API keys encrypted in system keychain
- OAuth tokens stored securely
- Never paste secrets in prompts
- Use environment variables via hooks

### SessionStart Hook for Env Vars

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export API_KEY=...' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

---

## MCP Security

- Write your own servers or use trusted providers
- Anthropic does not audit third-party MCP servers
- Configure permissions for MCP tools like other tools
- Be cautious with servers that fetch untrusted content
- Use managed MCP restrictions for teams

---

## Team Security

### Managed Settings

Deploy organization-wide policies:

```json
// /etc/claude-code/managed-settings.json (Linux)
{
  "permissions": {
    "deny": ["Bash(curl *)", "Bash(wget *)"],
    "defaultMode": "default"
  }
}
```

### Managed MCP

Control which MCP servers are allowed:

```json
// /etc/claude-code/managed-mcp.json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```

### Audit Hooks

```json
{
  "hooks": {
    "ConfigChange": [{
      "hooks": [{
        "type": "command",
        "command": "jq -c '{timestamp: now, source: .source}' >> ~/claude-audit.log"
      }]
    }]
  }
}
```

### Monitoring

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1 claude
```

OpenTelemetry metrics for usage monitoring, cost tracking, and alerting.

---

## Security Checklist

- [ ] Permission rules configured for project
- [ ] Sandboxing enabled for untrusted environments
- [ ] Sensitive files excluded from reading
- [ ] MCP servers from trusted sources only
- [ ] Team using managed settings
- [ ] Audit logging enabled
- [ ] Regular permission review (`/permissions`)
- [ ] No secrets in CLAUDE.md or prompts
