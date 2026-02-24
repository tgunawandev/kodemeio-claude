# 02 — CLI Reference

> Complete reference for all CLI commands, flags, and interactive slash commands.

## Installation

```bash
# Native installation (recommended)
curl -fsSL https://claude.ai/install.sh | sh

# Homebrew (macOS)
brew install anthropic/tap/claude-code

# WinGet (Windows)
winget install Anthropic.ClaudeCode

# NPM (deprecated)
npm install -g @anthropic-ai/claude-code

# Update
claude update

# Specific version
claude update --version 2.1.52

# Configure release channel
claude config set releaseChannel stable  # or beta
```

## CLI Commands

### Basic Usage

```bash
claude                              # Start interactive REPL
claude "query"                      # Start with initial prompt
claude -p "query"                   # Print mode: query then exit (headless)
claude -c                           # Continue most recent conversation
claude -c "follow-up"              # Continue with new prompt
claude -r "session-id" "query"     # Resume specific session
claude --resume                     # Interactive session picker
```

### Session Management

```bash
claude --session-id UUID            # Use specific session ID
claude --fork-session               # Create new session instead of reusing
claude --from-pr <number|url>       # Resume sessions linked to GitHub PR
claude --teleport                   # Resume web session locally
claude --remote "description"       # Create new web session
claude --continue                   # Resume most recent session
claude --resume session-name        # Resume by name
```

### Model Selection

```bash
claude --model claude-sonnet-4-6    # Use specific model ID
claude --model sonnet               # Use alias
claude --model opus                 # Use Opus
claude --model haiku                # Use Haiku
```

**Model Aliases:**
| Alias | Model ID |
|-------|----------|
| `sonnet` | `claude-sonnet-4-6` |
| `opus` | `claude-opus-4-6` |
| `haiku` | `claude-haiku-4-5-20251001` |

### Permission & Security

```bash
claude --permission-mode default          # Standard prompts
claude --permission-mode plan             # Read-only analysis
claude --permission-mode acceptEdits      # Auto-accept file edits
claude --permission-mode dontAsk          # Auto-deny unless pre-approved
claude --dangerously-skip-permissions     # Skip ALL permission checks
claude --allow-dangerously-skip-permissions  # Enable skip option
```

### System Prompt

```bash
claude --system-prompt "text"              # Replace system prompt entirely
claude --system-prompt-file path           # Load from file
claude --append-system-prompt "text"       # Append to default prompt
claude --append-system-prompt-file path    # Append from file
```

### Tool Control

```bash
claude --tools "Bash,Edit,Read"                    # Restrict available tools
claude --allowedTools "Bash(npm run *)"            # Allow specific commands
claude --disallowedTools "Bash(rm *)"              # Deny specific commands
claude --allowedTools "Bash(git diff *),Bash(git log *)"  # Multiple rules
```

### MCP Configuration

```bash
claude mcp add <name> -- <command>                  # Add stdio MCP server
claude mcp add --transport http <name> <url>        # Add HTTP MCP server
claude mcp add --transport sse <name> <url>         # Add SSE MCP server
claude mcp add --scope project <name> -- <cmd>      # Add to project scope
claude mcp add --scope user <name> -- <cmd>         # Add to user scope
claude mcp add --env KEY=VALUE <name> -- <cmd>      # With env vars
claude mcp list                                      # List all servers
claude mcp get <name>                                # Get server details
claude mcp remove <name>                             # Remove server
claude mcp reset-project-choices                     # Reset approval choices
claude --mcp-config ./mcp.json                       # Load MCP from JSON
claude --strict-mcp-config --mcp-config ./mcp.json  # Only specified MCPs
```

### Working Directories

```bash
claude --add-dir ../apps ../lib              # Add extra directories
claude --worktree name                       # Create isolated git worktree
claude -w feature-branch                     # Shorthand for worktree
```

### Output & Format (Headless Mode)

```bash
claude -p "query" --output-format text         # Plain text (default)
claude -p "query" --output-format json         # Structured JSON
claude -p "query" --output-format stream-json  # Streaming JSON
claude -p "query" --json-schema '{...}'        # Structured output with schema
claude -p "query" --include-partial-messages   # Include partial events
claude -p "query" --verbose                    # Full turn-by-turn output
claude -p "query" --max-turns 3               # Limit agentic turns
claude -p "query" --max-budget-usd 5.00       # Set spend limit
```

### Agent Configuration

```bash
claude --agent my-custom-agent                    # Use specific agent
claude --agents '{...}'                           # Define agents as JSON
claude agents                                      # List all configured agents
```

### Debugging

```bash
claude --verbose                    # Show turn-by-turn output
claude --debug "api,hooks,mcp"     # Enable debug logging by category
claude --init                       # Run initialization hooks
claude --init-only                  # Run hooks and exit
claude --maintenance                # Run maintenance hooks and exit
```

### Chrome Integration

```bash
claude --chrome                     # Enable browser integration
claude --no-chrome                  # Disable browser integration
```

### Utility Commands

```bash
claude --version                    # Show version
claude -v                           # Show version (short)
claude --help                       # Show help
claude update                       # Update to latest
```

---

## Interactive Slash Commands

### Session & Context

| Command | Purpose |
|---------|---------|
| `/clear` | Clear conversation history |
| `/compact [focus]` | Compress conversation with optional focus |
| `/context` | Visualize context usage as colored grid |
| `/resume [session]` | Resume conversation by ID/name or picker |
| `/rewind` | Rewind conversation or summarize from message |
| `/rename <name>` | Rename current session |
| `/teleport` | Resume remote session from claude.ai |
| `/desktop` | Hand off CLI session to Desktop app |
| `/export [filename]` | Export conversation to file or clipboard |

### Configuration & Settings

| Command | Purpose |
|---------|---------|
| `/config` | Open Settings interface |
| `/status` | Show version, model, account, connectivity |
| `/permissions` | View or update permission rules |
| `/model` | Select or change AI model |
| `/theme` | Change color theme |
| `/vim` | Enable vim-style editing |
| `/statusline` | Configure status line UI |
| `/fast` | Toggle fast mode (same model, faster output) |

### Information & Monitoring

| Command | Purpose |
|---------|---------|
| `/cost` | Show token usage statistics |
| `/stats` | Visualize daily usage, streaks, preferences |
| `/usage` | Show plan usage limits (subscription only) |
| `/debug [desc]` | Troubleshoot session with debug log |
| `/doctor` | Check installation health |
| `/help` | Get usage help |

### Project & Integration

| Command | Purpose |
|---------|---------|
| `/init` | Initialize project with CLAUDE.md |
| `/memory` | Edit CLAUDE.md memory files |
| `/mcp` | Manage MCP server connections & OAuth |
| `/hooks` | Manage hooks configuration |
| `/agents` | Manage subagent configurations |

### Task Management

| Command | Purpose |
|---------|---------|
| `/tasks` | List and manage background tasks |
| `/todos` | List current TODO items |
| `/plan` | Enter plan mode directly |

### Other

| Command | Purpose |
|---------|---------|
| `/copy` | Copy last response to clipboard |
| `/exit` | Exit Claude Code |
| `/bug` | Report a bug |
| `/review` | Review recent changes |
| `/pr-comments` | Address PR review comments |

### Dynamic MCP Prompts

MCP servers can register prompts that appear as slash commands:
```
/mcp__<server>__<prompt>
```

---

## Quick Entry Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `/` | Slash command / skill lookup | `/compact`, `/deploy` |
| `!` | Direct bash execution | `! npm test`, `! git status` |
| `@` | File path mention with autocomplete | `@src/app.ts` |

---

## Environment Variables

### Core

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key for Claude |
| `ANTHROPIC_MODEL` | Default model selection |
| `CLAUDE_CODE_SHELL` | Override shell detection |
| `CLAUDE_CONFIG_DIR` | Custom config directory |

### Context & Performance

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Output token limit (default: 32,000) |
| `MAX_THINKING_TOKENS` | Extended thinking budget |
| `MAX_MCP_OUTPUT_TOKENS` | MCP output limit (default: 25,000) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Auto-compaction threshold (default: 95) |
| `ENABLE_TOOL_SEARCH` | Tool search: `auto`/`auto:N`/`true`/`false` |

### Features

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `0` force on, `1` force off |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | `1` to disable background tasks |
| `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` | `1` to enable, `false` to disable |
| `CLAUDE_CODE_TASK_LIST_ID` | Named directory for task list |
| `CLAUDE_CODE_EFFORT_LEVEL` | Thinking depth: `low`/`medium`/`high` |

### Telemetry & Debugging

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1` to enable OpenTelemetry |
| `DISABLE_TELEMETRY` | Opt out of telemetry |
| `MCP_TIMEOUT` | MCP server startup timeout (ms) |

### Provider Configuration

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_BASE_URL` | Custom API endpoint |
| `CLAUDE_CODE_USE_BEDROCK` | `1` for AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | `1` for Google Vertex AI |
| `AWS_REGION` | AWS region for Bedrock |
| `CLOUD_ML_REGION` | GCP region for Vertex AI |
| `ANTHROPIC_VERTEX_PROJECT_ID` | Vertex AI project ID |

### Prompt Caching

| Variable | Purpose |
|----------|---------|
| `DISABLE_PROMPT_CACHING` | `1` to disable prompt caching |
| `DISABLE_CONVERSATION_CACHE` | `1` to disable conversation cache |
