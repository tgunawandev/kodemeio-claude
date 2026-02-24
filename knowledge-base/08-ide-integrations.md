# 08 — IDE Integrations

> Complete reference for VS Code, JetBrains, Desktop app, Chrome, and web integrations.

## VS Code Extension

### Installation

1. Open VS Code
2. Extensions panel → Search "Claude Code"
3. Install the official Anthropic extension
4. Authenticate via `/login` or API key

### Features

- **Prompt box** with file/folder references (`@` mentions)
- **Diff view** for reviewing proposed changes
- **Resume past conversations** from picker
- **Resume remote sessions** from Claude.ai
- **Multiple conversations** running in parallel
- **Plugin marketplace** integration
- **Chrome automation** support
- **Git operations** (commit, PR)
- **Terminal mode** option

### Usage

| Action | How |
|--------|-----|
| Open Claude | Click spark icon in sidebar |
| Reference files | `@filename` in prompt box |
| Reference folders | `@foldername/` in prompt box |
| Resume session | Use session picker |
| Switch to terminal | Settings → Terminal mode |
| Run multiple chats | Open additional panels |

### VS Code Commands

| Command | Shortcut |
|---------|----------|
| Open Claude Code | (configurable) |
| Submit prompt | Enter |
| New line | Shift+Enter |
| Include terminal output | Select text → send to Claude |

### Settings

Configure via VS Code Settings → Extensions → Claude Code:
- Panel location (sidebar, bottom, secondary)
- Default model
- Permission mode
- Theme

### VS Code vs CLI

| Feature | VS Code | CLI |
|---------|---------|-----|
| Diff view | Visual | Text-based |
| Checkpoints | IDE-integrated | Git-based |
| File references | `@` autocomplete | `@` autocomplete |
| Terminal output | Select and send | `!` bash mode |
| Multiple sessions | Multiple panels | Multiple terminals |
| Remote sessions | Supported | Supported |
| MCP | Supported | Supported |
| Plugins | Marketplace | Marketplace |

---

## JetBrains Plugin

### Supported IDEs

IntelliJ IDEA, PyCharm, WebStorm, GoLand, PhpStorm, RubyMine, CLion, Rider, DataGrip, and others.

### Installation

1. File → Settings → Plugins → Marketplace
2. Search "Claude Code"
3. Install and restart IDE

### Features

- Launch Claude from IDE
- External terminal support
- IDE detection (Claude knows your IDE)
- ESC key configuration
- Remote development support
- WSL integration

### Configuration

**General Settings:**
- Terminal emulator path
- Default working directory
- Environment variables

**ESC Key Configuration:**
- Choose whether ESC exits Claude or stays in IDE
- Configurable per terminal/editor context

### Special Configurations

**Remote Development:**
```
File → Settings → Claude Code → Remote Mode → Enable
```

**WSL Configuration:**
- Ensure Claude Code installed in WSL environment
- Configure WSL networking mode in plugin settings

---

## Desktop App

### Overview

Standalone Claude Code application with visual session management, remote execution, and multi-session support.

### Features

- **Multiple parallel sessions** with visual management
- **Remote sessions** on Anthropic cloud VMs
- **SSH session** support
- **Diff view** for code changes
- **Permission mode** selection
- **Plugin** marketplace

### Starting Sessions

| Type | Description |
|------|-------------|
| Local | Runs on your machine |
| Remote | Runs on Anthropic cloud VM |
| SSH | Connects to remote server |

### Desktop vs CLI

| Feature | Desktop | CLI |
|---------|---------|-----|
| Visual diff | Rich UI | Text-based |
| Session management | Visual tabs | `--resume` |
| Remote sessions | Built-in | `--remote` |
| Parallel sessions | Tab-based | Multiple terminals |
| File browser | Integrated | Not available |
| Prompt suggestions | Visual | Text-based |

---

## Chrome Integration

### Overview

Claude Code can control Chrome for web testing, form filling, content drafting, and data extraction.

### Prerequisites

- Chrome browser installed
- Claude Code Chrome extension (for some features)

### Enable

```bash
claude --chrome              # Enable for session
```

Or in settings:
```json
{
  "chrome": true
}
```

### Capabilities

- Navigate web pages
- Take screenshots
- Fill forms
- Click elements
- Read page content
- Monitor network requests
- Access console logs
- Execute JavaScript

### Example Workflows

**Test local web app:**
```
Navigate to http://localhost:3000 and test the login flow.
Take a screenshot of each step.
```

**Debug with console logs:**
```
Open http://localhost:3000/dashboard, check for JavaScript errors
in the console, and fix them.
```

**Extract data from web pages:**
```
Open https://example.com/pricing and extract all plan details
into a structured table.
```

**Automate form filling:**
```
Navigate to the signup page and fill in the test user form.
```

---

## Claude Code on the Web

### Overview

Run Claude Code sessions on Claude.ai with cloud-hosted execution environment.

### Features

- Full Claude Code capabilities in browser
- Cloud VM execution (isolated)
- Diff view for changes
- Session sharing
- Background tasks

### Moving Between Surfaces

**Terminal to Web:**
```bash
claude --remote "task description"
# Creates cloud session, returns URL
```

**Web to Terminal:**
```bash
claude --teleport
# Resume web session locally
```

**Sharing Sessions:**
- Teams/Enterprise: Share within organization
- Max/Pro: Share with link

### Cloud Environment

- **Default image**: Ubuntu-based with common tools
- **Languages**: Python, Node.js, Go, Rust, Java, Ruby pre-installed
- **Databases**: SQLite available, others installable
- **Network**: Restricted to allowed domains
- **Security**: Full isolation, sandboxed

---

## GitHub Actions

### Overview

Use Claude Code in CI/CD for automated code review, issue handling, and PR management.

### Setup

```yaml
# .github/workflows/claude.yml
name: Claude Code
on:
  pull_request:
  issue_comment:
    types: [created]

jobs:
  claude:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@latest
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Capabilities

- Review PRs automatically
- Respond to `@claude` mentions in issues/PRs
- Create commits and PRs
- Run tests and fix failures
- Custom automation via prompts

### Configuration

```yaml
- uses: anthropics/claude-code-action@latest
  with:
    prompt: "Review this PR for bugs and suggest improvements"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    # Optional:
    model: claude-sonnet-4-6
    max_turns: 10
    allowed_tools: "Read,Grep,Bash(npm test)"
```

---

## GitLab CI/CD

### Overview

Similar to GitHub Actions but for GitLab pipelines.

### Setup

```yaml
# .gitlab-ci.yml
claude-review:
  image: node:20
  script:
    - npm install -g @anthropic-ai/claude-code
    - claude -p "Review this MR" --output-format json
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

### Features

- Review MRs
- Respond to `@claude` mentions
- Create commits
- Custom automation

---

## Slack Integration

### Overview

Use Claude Code directly from Slack for quick code questions, PR reviews, and issue resolution.

### Features

- Automatic repository detection
- Context gathering from channels
- App Home for session management
- Message actions for quick access

### How It Works

1. Mention `@Claude Code` in a channel
2. Claude detects relevant repository
3. Creates a session and responds
4. Results posted back to thread

---

## Best Practices

1. **Start with CLI** — most flexible and powerful
2. **Use VS Code extension** for visual diff and file management
3. **Use Desktop app** for parallel session management
4. **Use Chrome** for web testing and debugging
5. **Use GitHub Actions** for automated CI/CD reviews
6. **Share CLAUDE.md** across all surfaces — configuration is shared
