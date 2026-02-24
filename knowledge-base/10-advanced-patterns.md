# 10 — Advanced Patterns

> Headless mode, CI/CD integration, piping, programmatic usage, and automation patterns.

## Headless Mode (Non-Interactive)

### Basic Usage

```bash
claude -p "Explain what this project does"
```

The `-p` flag runs Claude in print mode: processes the prompt and exits.

### Output Formats

**Plain text (default):**
```bash
claude -p "Summarize this project"
```

**Structured JSON:**
```bash
claude -p "List API endpoints" --output-format json
# Returns: {"result": "...", "session_id": "...", "usage": {...}}
```

**JSON with schema:**
```bash
claude -p "Extract function names" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}}}'
# Returns: {"structured_output": {...}, ...}
```

**Streaming JSON:**
```bash
claude -p "Explain recursion" \
  --output-format stream-json \
  --include-partial-messages \
  --verbose
# Returns: newline-delimited JSON events
```

### Tool Auto-Approval

```bash
# Allow specific tools
claude -p "Run tests and fix failures" \
  --allowedTools "Bash(npm test),Read,Edit"

# Allow all bash
claude -p "Fix lint errors" \
  --allowedTools "Bash,Read,Edit"

# Specific command patterns
claude -p "Check git status" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status)"

# DANGEROUS: Skip all permissions
claude -p "Fix all issues" \
  --dangerously-skip-permissions
```

### Continue Conversations

```bash
# First request
session_id=$(claude -p "Review codebase" --output-format json | jq -r '.session_id')

# Continue with context
claude -p "Now focus on database layer" --resume "$session_id"

# Or resume most recent
claude -p "Next step" --continue
```

### System Prompt Customization

```bash
# Append to default system prompt
claude -p "Review this code" \
  --append-system-prompt "Focus on security vulnerabilities. Output in JSON format."

# Replace system prompt entirely
claude -p "Analyze" --system-prompt "You are a security auditor."

# From file
claude -p "Review" --append-system-prompt-file ./review-instructions.txt
```

### Budget and Turn Limits

```bash
claude -p "Implement feature" \
  --max-turns 5 \
  --max-budget-usd 2.00
```

---

## Piping and Unix Integration

### Pipe In

```bash
# Pipe file contents
cat error.log | claude -p "What caused this error?"

# Pipe command output
git diff main | claude -p "Review these changes"

# Pipe build errors
npm run build 2>&1 | claude -p "Fix these build errors"
```

### Pipe Out

```bash
# Save analysis to file
claude -p "Document all API endpoints" > api-docs.md

# Process with jq
claude -p "List functions" --output-format json | jq '.result'
```

### In Build Scripts

```json
{
  "scripts": {
    "lint:ai": "claude -p 'Lint changes vs main, report issues'",
    "review": "gh pr diff | claude -p 'Review for bugs'",
    "test:fix": "npm test 2>&1 | claude -p 'Fix failing tests' --allowedTools 'Edit,Read'"
  }
}
```

### Verification Pipeline

```bash
# Add Claude to CI verification
claude -p "Check for security issues" --output-format json | \
  jq -e '.result | test("no issues found")' || exit 1
```

---

## GitHub Actions

### Basic PR Review

```yaml
name: Claude Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Respond to @claude Mentions

```yaml
name: Claude Code
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
jobs:
  claude:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Custom Prompt with Skills

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    prompt: "/review"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    claude_args: "--max-turns 5 --model claude-sonnet-4-6"
```

### With AWS Bedrock

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

### With Google Vertex AI

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

## GitLab CI/CD

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

---

## Worktree Isolation

Run subagents or parallel sessions in isolated git worktrees:

### CLI Worktree

```bash
claude --worktree feature-name
# Creates isolated copy, separate branch
```

### Subagent Worktree

```yaml
---
name: isolated-worker
isolation: worktree
---
```

### Custom Worktree Hooks

```json
{
  "hooks": {
    "WorktreeCreate": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/setup-worktree.sh"
      }]
    }],
    "WorktreeRemove": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/cleanup-worktree.sh"
      }]
    }]
  }
}
```

---

## Devcontainer Integration

### Basic Setup

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

- **Secure client work**: Isolated environments per project
- **Team onboarding**: Consistent setup for new developers
- **CI/CD environments**: Reproducible build environments

---

## Background Agents

### Launch Background Agent

```bash
# Via Task tool
Task(run_in_background: true, prompt: "Research auth patterns")

# Or background a running task
Ctrl+B
```

### Monitor Background Agents

```bash
/tasks              # List all background tasks
Ctrl+T              # Toggle task list
```

### Kill Background Agents

```bash
Ctrl+F              # Kill all background agents (confirm with second press)
```

---

## Session Management Patterns

### Named Sessions

```bash
claude                          # Start session
/rename "auth-refactor"        # Name it
/clear                          # Clear for new work
claude --resume "auth-refactor" # Resume later
```

### Session Picker

```bash
claude --resume                 # Interactive picker
# ↑↓ navigate, Enter select, P preview, R rename, / search
```

### PR-Linked Sessions

```bash
claude --from-pr 123            # Resume session linked to PR
```

### Teleport (Web ↔ Terminal)

```bash
claude --remote "implement feature"  # Start on web
claude --teleport                     # Resume locally
```

---

## Monitoring and Observability

### OpenTelemetry Integration

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1 claude
```

### Available Metrics

- Session count
- Lines of code changed
- PR and commit counts
- Cost and token usage
- Active time
- Tool decision counts

### Available Events

- User prompt events
- Tool result events
- API request/error events
- Tool decision events

---

## Safe Autonomous Mode

For long-running autonomous tasks with safety:

```bash
claude -p "Refactor all components to use TypeScript" \
  --allowedTools "Read,Edit,Write,Bash(npm test),Bash(tsc --noEmit)" \
  --max-turns 50 \
  --max-budget-usd 10.00
```

Key principles:
1. **Restrict tools** to only what's needed
2. **Set turn limits** to prevent runaway
3. **Set budget limits** to cap spending
4. **Give verification commands** (tests, type checks)
5. **Monitor** with `/cost` and `/tasks`
