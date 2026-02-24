# Claude Code Complete Knowledge Base

> The most comprehensive reference for Claude Code — Anthropic's official AI-powered CLI for software engineering.
> Last updated: 2026-02-24

## Quick Navigation

| # | Document | Description |
|---|----------|-------------|
| 01 | [Tools Reference](01-tools-reference.md) | All built-in tools (Read, Write, Edit, Bash, Glob, Grep, Task, ToolSearch, WebFetch, WebSearch) |
| 02 | [CLI Reference](02-cli-reference.md) | All CLI flags, options, and slash commands |
| 03 | [Configuration](03-configuration.md) | Settings files, CLAUDE.md, permissions, sandboxing |
| 04 | [Skills & Custom Commands](04-skills-and-commands.md) | Skills system, custom slash commands, skill creation |
| 05 | [MCP Servers](05-mcp-servers.md) | Model Context Protocol integration, popular servers, configuration |
| 06 | [Hooks System](06-hooks-system.md) | Pre/post tool hooks, event types, automation |
| 07 | [Subagents & Agent Teams](07-subagents-and-teams.md) | Task delegation, agent types, parallel agents, agent teams |
| 08 | [IDE Integrations](08-ide-integrations.md) | VS Code extension, JetBrains plugin, Desktop app, Chrome |
| 09 | [Best Practices & Workflows](09-best-practices.md) | Tips, tricks, proven workflows, effective prompting |
| 10 | [Advanced Patterns](10-advanced-patterns.md) | Headless mode, CI/CD, GitHub Actions, GitLab CI, piping |
| 11 | [Security & Sandboxing](11-security-and-sandboxing.md) | Permission architecture, sandboxing, prompt injection protection |
| 12 | [Cost Optimization](12-cost-optimization.md) | Token management, model selection, context strategies |
| 13 | [Memory System](13-memory-system.md) | Auto memory, CLAUDE.md, rules, project memory |
| 14 | [Keyboard Shortcuts](14-keyboard-shortcuts.md) | All keybindings, customization, vim mode |
| 15 | [Plugins & Marketplaces](15-plugins-system.md) | Plugin creation, installation, marketplaces |
| 16 | [Deployment & Providers](16-deployment.md) | Bedrock, Vertex AI, Azure Foundry, LLM gateways, proxies |
| 17 | [Troubleshooting](17-troubleshooting.md) | Common issues, /doctor, debugging, fixes |
| 18 | [Output Styles](18-output-styles.md) | Built-in and custom output styles |
| 19 | [Checkpointing](19-checkpointing.md) | Git checkpoint system, undo/rewind |
| 20 | [Changelog & Updates](20-changelog-updates.md) | Recent features and version history |

## What is Claude Code?

Claude Code is Anthropic's official agentic coding tool that operates directly in your terminal. It understands your codebase, makes edits across files, runs commands, and helps with complex software engineering tasks — from debugging to architecture to deployment.

### Key Capabilities

- **Codebase Understanding**: Ask questions about code architecture, find bugs, understand complex logic
- **Multi-file Editing**: Make coordinated changes across multiple files with automatic checkpointing
- **Command Execution**: Run tests, builds, deployments, git operations in sandboxed environments
- **Git Integration**: Create commits, PRs, handle rebasing, resolve conflicts
- **Subagent Delegation**: Spawn specialized agents for parallel research, testing, code review
- **MCP Integration**: Connect to external tools (databases, APIs, browsers, Slack, etc.)
- **CI/CD Integration**: GitHub Actions, GitLab CI/CD for automated code review and PR handling
- **IDE Integration**: VS Code extension, JetBrains plugin, standalone Desktop app
- **Hooks & Automation**: Custom pre/post-tool hooks for formatting, validation, notifications
- **Skills System**: Reusable, shareable task templates with full tool access
- **Plugin Ecosystem**: Installable plugins with skills, agents, hooks, MCP servers, and LSP servers
- **Agent Teams**: Multi-agent collaboration using tmux for parallel workstreams

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Claude Code                    │
├─────────────────────────────────────────────────┤
│  Agentic Loop: Prompt → Think → Tool → Repeat   │
├──────────┬──────────┬──────────┬────────────────┤
│  Tools   │  Skills  │  Hooks   │  MCP Servers   │
│ Read     │ Custom   │ Pre/Post │ stdio/SSE/HTTP │
│ Write    │ Built-in │ Events   │ Remote/Local   │
│ Edit     │ Plugin   │ Matchers │ Tool Search    │
│ Bash     │          │ Prompt   │                │
│ Glob     │ Agents   │ Agent    │  Plugins       │
│ Grep     │ Built-in │          │ Marketplace    │
│ Task     │ Custom   │          │ LSP Servers    │
│ WebFetch │ Teams    │          │                │
│ ...      │          │          │                │
├──────────┴──────────┴──────────┴────────────────┤
│  Context: CLAUDE.md + Memory + Rules + Settings  │
├─────────────────────────────────────────────────┤
│  Models: Opus 4.6 │ Sonnet 4.6 │ Haiku 4.5     │
├─────────────────────────────────────────────────┤
│  Providers: Anthropic │ Bedrock │ Vertex │ Azure │
└─────────────────────────────────────────────────┘
```

### Available Models (2026)

| Model | ID | Best For |
|-------|------|----------|
| Claude Opus 4.6 | `claude-opus-4-6` | Most capable, complex reasoning, architecture |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Balanced speed/quality, daily coding |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast, lightweight tasks, subagent work |

## Official Documentation

- **Main Docs**: https://code.claude.com/docs/en/overview.md
- **Docs Map**: https://code.claude.com/docs/en/claude_code_docs_map.md
- **GitHub**: https://github.com/anthropics/claude-code
- **Issues**: https://github.com/anthropics/claude-code/issues
