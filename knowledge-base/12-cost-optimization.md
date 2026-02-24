# 12 — Cost Optimization

> Token management, model selection strategies, context efficiency, and budget controls.

## Understanding Costs

### Token Types

| Type | Description | Relative Cost |
|------|-------------|---------------|
| Input tokens | Your prompts, file contents, system context | Lower |
| Output tokens | Claude's responses, tool calls | Higher |
| Thinking tokens | Extended thinking (internal reasoning) | Higher |
| Cache read | Previously cached input tokens | Much lower |
| Cache write | Writing to prompt cache | Slightly higher |

### Cost Monitoring

```
/cost              # Show current session costs
/context           # Visual grid of context usage
```

---

## Model Selection Strategy

| Task Type | Recommended | Why |
|-----------|-------------|-----|
| Complex architecture design | Opus | Best reasoning, worth the cost |
| Daily coding tasks | Sonnet | Best balance of speed/quality/cost |
| Simple edits, formatting | Haiku | Fast and cheap |
| Subagent research | Haiku | Cost-effective for read-only |
| Code review | Sonnet | Good reasoning at lower cost |
| Debugging complex issues | Opus | Deep analysis needed |
| Documentation | Sonnet or Haiku | Straightforward generation |

### Switch Models

```bash
# Interactive
/model                    # Model picker
Option+P                  # Quick switch

# CLI
claude --model sonnet
claude --model haiku
claude --model opus

# Environment
ANTHROPIC_MODEL=claude-haiku-4-5-20251001 claude
```

### Subagent Model Selection

```yaml
# .claude/agents/researcher.md
---
name: researcher
model: haiku          # Cheap model for read-only research
tools: Read, Grep, Glob
---
```

---

## Context Window Management

### Why It Matters

Larger context = more input tokens per request = higher cost. Managing context is the #1 cost lever.

### Strategies

#### 1. Clear Between Tasks

```
/clear                    # Full reset between unrelated tasks
/rename "feature-x"       # Save session name first
```

#### 2. Compact Aggressively

```
/compact Focus on auth changes    # Compress with focus hint
```

#### 3. Auto-Compaction Tuning

```bash
# Trigger compaction earlier (default: ~95%)
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50 claude

# Much earlier for cost-sensitive work
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=30 claude
```

#### 4. Use Subagents for Verbose Operations

```
# Bad: Run tests in main context (logs fill context)
"Run the full test suite"

# Good: Delegate to subagent (logs stay in subagent context)
Task(prompt: "Run test suite, report only failures", subagent_type: "Bash")
```

#### 5. Disable Unused MCP Servers

Each MCP server adds tool definitions to context. Remove unused ones:

```bash
claude mcp list              # See what's active
claude mcp remove unused-server
```

#### 6. Move Instructions to Skills

```
# Bad: Long CLAUDE.md with everything
(500+ lines of instructions loaded every message)

# Good: Essential instructions in CLAUDE.md, details in skills
(50 lines in CLAUDE.md, skills loaded on demand)
```

---

## Extended Thinking Optimization

### Budget Control

```bash
# Disable thinking entirely (fast, cheap)
MAX_THINKING_TOKENS=0 claude

# Moderate thinking
MAX_THINKING_TOKENS=8000 claude

# Default (31,999 tokens)
claude
```

### When to Reduce Thinking

- Simple file edits
- Formatting tasks
- Direct questions with known answers
- Repetitive operations

### When to Keep/Increase Thinking

- Architecture decisions
- Complex bug debugging
- Security analysis
- Algorithm design

### Logarithmic Returns

Doubling the thinking budget does NOT double accuracy. The relationship is logarithmic — most benefit comes from the first few thousand tokens.

---

## Budget Limits

### Per-Session Limits

```bash
claude -p "Implement feature" \
  --max-budget-usd 2.00      # Hard spending cap
```

### Turn Limits

```bash
claude -p "Fix tests" \
  --max-turns 5               # Limit API round-trips
```

### Combined

```bash
claude -p "Refactor components" \
  --max-turns 20 \
  --max-budget-usd 5.00
```

---

## Prompt Efficiency

### Be Specific

```
# Expensive (vague, Claude explores too much)
"improve the codebase"

# Cheap (specific, Claude goes directly)
"add input validation to the login endpoint in src/api/auth.ts"
```

### Provide File References

```
# Expensive (Claude searches for files)
"fix the authentication bug"

# Cheap (direct file reference)
"fix the email parsing bug in src/services/auth.ts:42"
```

### Batch Related Changes

```
# Expensive (3 separate sessions)
"add email validation"
"add password validation"
"add phone validation"

# Cheap (1 session)
"add input validation for email, password, and phone in the signup form"
```

---

## CI/CD Cost Control

```yaml
# GitHub Actions with cost controls
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-sonnet-4-6          # Not opus for CI
    max_turns: 10                      # Limit turns
    # Use --max-budget-usd in claude_args if needed
```

---

## Cost Tracking

### OpenTelemetry

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1 claude
```

Track:
- Token usage per session
- Cost per operation
- Model usage distribution
- Active time

### Audit Hooks

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "echo '{\"session\": \"'$SESSION_ID'\", \"timestamp\": \"'$(date -Is)'\"}' >> ~/claude-cost-log.jsonl"
      }]
    }]
  }
}
```

---

## Cost Reduction Checklist

- [ ] Use Haiku for subagents (research, exploration)
- [ ] Use Sonnet for daily coding (not Opus)
- [ ] Reserve Opus for complex reasoning tasks
- [ ] `/clear` between unrelated tasks
- [ ] `/compact` regularly during long sessions
- [ ] Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` to 50 or lower
- [ ] Delegate verbose operations to subagents
- [ ] Disable unused MCP servers
- [ ] Move detailed instructions to skills (out of CLAUDE.md)
- [ ] Use `--max-budget-usd` for autonomous runs
- [ ] Use `--max-turns` to prevent runaway sessions
- [ ] Be specific in prompts with file paths
- [ ] Reduce `MAX_THINKING_TOKENS` for simple tasks
- [ ] Enable telemetry for cost monitoring
