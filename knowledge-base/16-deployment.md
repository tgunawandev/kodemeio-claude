# 16 — Deployment & Providers

> AWS Bedrock, Google Vertex AI, Azure Foundry, LLM gateways, proxies, and enterprise deployment.

## Provider Overview

| Provider | Auth | Models | Region Support |
|----------|------|--------|----------------|
| **Anthropic** (default) | API key | All Claude models | Global |
| **AWS Bedrock** | AWS IAM | Claude on Bedrock | AWS regions |
| **Google Vertex AI** | GCP IAM | Claude on Vertex | GCP regions |
| **Azure Foundry** | Azure AD | Claude on Azure | Azure regions |

---

## Anthropic (Direct)

### Setup

```bash
# Via login
claude /login

# Via API key
export ANTHROPIC_API_KEY=sk-ant-...
```

### Custom Endpoint

```bash
export ANTHROPIC_BASE_URL=https://api.custom-proxy.com/v1
export ANTHROPIC_AUTH_TOKEN=custom-token
```

---

## AWS Bedrock

### Setup

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-west-2

# Option 1: Profile
export AWS_PROFILE=my-profile

# Option 2: Keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# Option 3: SSO
aws sso login --profile my-profile
```

### Model IDs (Bedrock)

| Model | Bedrock ID |
|-------|------------|
| Opus 4.6 | `us.anthropic.claude-opus-4-6` |
| Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` |
| Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001` |

### Custom Endpoint

```bash
export ANTHROPIC_BEDROCK_BASE_URL=https://bedrock-runtime.us-west-2.amazonaws.com
```

### Cross-Region Inference

Use the `us.` prefix for cross-region model IDs:

```bash
claude --model us.anthropic.claude-sonnet-4-6
```

### GitHub Actions with Bedrock

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE }}
    aws-region: us-west-2
- uses: anthropics/claude-code-action@v1
  with:
    use_bedrock: "true"
    claude_args: "--model us.anthropic.claude-sonnet-4-6"
```

---

## Google Vertex AI

### Setup

```bash
export CLAUDE_CODE_USE_VERTEX=1
export ANTHROPIC_VERTEX_PROJECT_ID=my-gcp-project
export CLOUD_ML_REGION=us-east5

# Authenticate
gcloud auth application-default login
```

### Model IDs (Vertex)

| Model | Vertex ID |
|-------|-----------|
| Opus 4.6 | `claude-opus-4-6@20250514` |
| Sonnet 4.6 | `claude-sonnet-4-6@20250514` |
| Haiku 4.5 | `claude-haiku-4-5-20251001` |

### GitHub Actions with Vertex

```yaml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_PROVIDER }}
    service_account: ${{ secrets.GCP_SA }}
- uses: anthropics/claude-code-action@v1
  with:
    use_vertex: "true"
  env:
    ANTHROPIC_VERTEX_PROJECT_ID: ${{ steps.auth.outputs.project_id }}
    CLOUD_ML_REGION: us-east5
```

---

## Microsoft Azure Foundry

### Setup

```bash
export CLAUDE_CODE_USE_AZURE=1
export ANTHROPIC_AZURE_RESOURCE_ID=my-resource-id

# Authenticate
az login
```

---

## LLM Gateways & Proxies

### Custom API Proxy

```bash
export ANTHROPIC_BASE_URL=https://proxy.company.com/v1
export ANTHROPIC_AUTH_TOKEN=proxy-token
```

### Common Proxy Use Cases

| Use Case | Configuration |
|----------|---------------|
| Corporate proxy | `HTTP_PROXY`, `HTTPS_PROXY` env vars |
| API gateway | `ANTHROPIC_BASE_URL` override |
| Custom auth | `ANTHROPIC_AUTH_TOKEN` |
| Rate limiting | Gateway-side configuration |
| Audit logging | Proxy-side logging |
| Cost allocation | Tag via proxy headers |

### Network Proxy

```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com
```

---

## Enterprise Deployment

### Managed Settings

Deploy organization-wide policies via system paths:

```json
// /etc/claude-code/managed-settings.json (Linux)
// /Library/Application Support/ClaudeCode/managed-settings.json (macOS)
{
  "permissions": {
    "deny": ["Bash(curl *)", "Bash(wget *)"],
    "defaultMode": "default"
  },
  "model": "claude-sonnet-4-6"
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

### Distribution Methods

| Platform | Method |
|----------|--------|
| macOS | MDM profile, pkg installer |
| Linux | System packages, /etc/ config |
| Windows | Group Policy, MSI |

---

## Devcontainer Deployment

### Docker-based Development

```json
// .devcontainer/devcontainer.json
{
  "name": "Claude Code Dev",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/anthropics/claude-code-devcontainer-feature:latest": {}
  },
  "postCreateCommand": "claude --version"
}
```

### Use Cases

- Isolated environments per project
- Consistent team setup
- CI/CD environments
- Secure client work

---

## CI/CD Deployment

### GitHub Actions

```yaml
name: Claude Code
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          max_turns: 10
```

### GitLab CI/CD

```yaml
claude-review:
  image: node:20
  script:
    - npm install -g @anthropic-ai/claude-code
    - claude -p "Review this MR" --output-format json
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### Jenkins

```groovy
pipeline {
  agent any
  environment {
    ANTHROPIC_API_KEY = credentials('anthropic-api-key')
  }
  stages {
    stage('Review') {
      steps {
        sh 'npx @anthropic-ai/claude-code -p "Review changes" --output-format json'
      }
    }
  }
}
```

---

## Auto-Updates

### Disable

```bash
export DISABLE_CLAUDE_AUTOUPDATER=1
```

### Pin Version

```bash
npm install -g @anthropic-ai/claude-code@1.x.x
```

---

## Monitoring

### OpenTelemetry

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1 claude
```

Exports:
- Session metrics
- Token usage
- Cost tracking
- Tool decision counts
- Error rates

### Audit Logging

```json
{
  "hooks": {
    "PostToolUse": [{
      "hooks": [{
        "type": "command",
        "command": "jq -c '{ts: now, tool: .tool_name, session: .session_id}' >> /var/log/claude-audit.jsonl"
      }]
    }]
  }
}
```
