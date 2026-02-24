# 01 — Tools Reference

> Complete reference for all built-in tools available in Claude Code.

## Overview

Claude Code operates through an **agentic loop**: it receives a prompt, thinks about the approach, calls one or more tools, observes results, and repeats until the task is complete. Tools are the primary mechanism for Claude to interact with your system.

## Core Tools

### Read

**Purpose**: Read files from the local filesystem.

```
Parameters:
  file_path   (required) — Absolute path to the file
  offset      (optional) — Line number to start reading from
  limit       (optional) — Number of lines to read
  pages       (optional) — Page range for PDFs (e.g., "1-5")
```

**Capabilities**:
- Reads up to 2000 lines by default
- Truncates lines longer than 2000 characters
- Returns content with `cat -n` format (line numbers starting at 1)
- Reads images (PNG, JPG, etc.) — Claude is multimodal
- Reads PDF files (max 20 pages per request; use `pages` param for large PDFs)
- Reads Jupyter notebooks (.ipynb) with all cells and outputs
- Cannot read directories (use `ls` via Bash for that)

**Best Practices**:
- Always read a file before editing it
- Read multiple files in parallel when possible
- Use `offset` and `limit` for very large files
- For PDFs > 10 pages, always specify `pages` parameter

---

### Write

**Purpose**: Create new files or overwrite existing files.

```
Parameters:
  file_path   (required) — Absolute path to the file
  content     (required) — The content to write
```

**Rules**:
- Overwrites existing files completely
- Must Read an existing file first before overwriting it
- Prefer Edit over Write for existing files
- Never proactively create documentation files unless requested
- Only use emojis if user explicitly requests them

---

### Edit

**Purpose**: Perform exact string replacements in files.

```
Parameters:
  file_path    (required) — Absolute path to the file
  old_string   (required) — Text to replace (must be unique in file)
  new_string   (required) — Replacement text (must differ from old_string)
  replace_all  (optional) — Replace all occurrences (default: false)
```

**Rules**:
- Must Read the file first before editing
- `old_string` must be unique in the file, or the edit fails
- If not unique, provide more surrounding context or use `replace_all`
- Preserve exact indentation from the file (tabs/spaces)
- Never include line number prefixes in old_string/new_string
- Use `replace_all: true` for renaming variables across a file

**Tips**:
- For multi-line edits, include enough context to make `old_string` unique
- When editing code from Read output, the line number prefix format is: `spaces + line number + tab` — everything after the tab is the actual content

---

### Bash

**Purpose**: Execute shell commands with optional timeout.

```
Parameters:
  command      (required) — The command to execute
  description  (optional) — Clear description of what the command does
  timeout      (optional) — Timeout in ms (max 600000, default 120000)
  run_in_background (optional) — Run command in background
  dangerouslyDisableSandbox (optional) — Override sandbox mode
```

**Rules**:
- Working directory persists between commands; shell state does not
- Always quote file paths with spaces using double quotes
- Do NOT use Bash for operations that have dedicated tools:
  - File search → use Glob (not `find` or `ls`)
  - Content search → use Grep (not `grep` or `rg`)
  - Read files → use Read (not `cat`/`head`/`tail`)
  - Edit files → use Edit (not `sed`/`awk`)
  - Write files → use Write (not `echo >`)
- Use `&&` to chain dependent commands
- Use `;` for sequential commands where failure doesn't matter
- Use parallel Bash calls for independent commands
- Prefer absolute paths over `cd`
- Output truncated at 30000 characters

**Background Commands**:
- Set `run_in_background: true` for long-running processes
- You'll be notified when it completes
- No need to add `&` at the end

---

### Glob

**Purpose**: Fast file pattern matching using glob patterns.

```
Parameters:
  pattern   (required) — Glob pattern (e.g., "**/*.js", "src/**/*.ts")
  path      (optional) — Directory to search in (defaults to cwd)
```

**Examples**:
```
"**/*.py"           — All Python files recursively
"src/**/*.tsx"      — All TSX files under src/
"*.md"              — Markdown files in current directory
"**/test_*.py"      — All Python test files
"**/*.{ts,tsx}"     — All TypeScript files
```

**Results**: Returns matching file paths sorted by modification time.

---

### Grep

**Purpose**: Search file contents using ripgrep-powered regex.

```
Parameters:
  pattern      (required) — Regex pattern to search for
  path         (optional) — File or directory to search in
  glob         (optional) — Filter files by glob pattern (e.g., "*.js")
  type         (optional) — File type filter (e.g., "js", "py", "rust")
  output_mode  (optional) — "files_with_matches" (default), "content", "count"
  -i           (optional) — Case insensitive search
  -n           (optional) — Show line numbers (default: true, requires content mode)
  -A           (optional) — Lines after match (requires content mode)
  -B           (optional) — Lines before match (requires content mode)
  -C/context   (optional) — Lines before and after match
  multiline    (optional) — Enable multiline matching (default: false)
  head_limit   (optional) — Limit output to first N entries
  offset       (optional) — Skip first N entries
```

**Output Modes**:
- `files_with_matches` — File paths only (default, fastest)
- `content` — Matching lines with context
- `count` — Match counts per file

**Pattern Syntax** (ripgrep, not grep):
- Literal braces need escaping: `interface\{\}` to find `interface{}`
- Full regex: `log.*Error`, `function\s+\w+`
- Multiline: use `multiline: true` for cross-line patterns

---

### Task

**Purpose**: Launch specialized subagents for complex, multi-step tasks.

```
Parameters:
  prompt          (required) — Task description for the agent
  subagent_type   (required) — Agent type to launch
  description     (required) — Short 3-5 word description
  model           (optional) — "sonnet", "opus", or "haiku"
  max_turns       (optional) — Maximum API round-trips
  run_in_background (optional) — Run agent in background
  isolation       (optional) — "worktree" for git worktree isolation
  resume          (optional) — Agent ID to resume from
```

**Built-in Subagent Types**:
| Type | Tools | Best For |
|------|-------|----------|
| `Bash` | Bash only | Git ops, command execution |
| `general-purpose` | All tools | Research, multi-step tasks |
| `Explore` | All except edit/write | Codebase exploration, search |
| `Plan` | All except edit/write | Architecture, implementation planning |
| `code-reviewer` | All tools | Code quality review |
| `test-agent` | All tools | Writing and running tests |
| `docs-agent` | All tools | Documentation creation |
| `system-architect` | All tools | System design decisions |

**Custom Subagents**: Defined in `.claude/agents/` directory (see [07-subagents-and-teams.md](07-subagents-and-teams.md))

**Key Patterns**:
- Launch multiple agents in parallel with multiple Task calls in one message
- Use `run_in_background: true` for independent research
- Use `isolation: "worktree"` for file-changing agents that might conflict
- Use `resume` with agent ID to continue a previous agent's work
- Use `model: "haiku"` for quick, simple tasks to minimize cost

---

### ToolSearch

**Purpose**: Discover and load deferred tools (MCP tools, special tools).

```
Parameters:
  query        (required) — Keyword search or "select:<tool_name>"
  max_results  (optional) — Max results to return (default: 5)
```

**Query Modes**:
- **Keyword**: `"slack message"` — finds matching tools
- **Direct**: `"select:NotebookEdit"` — loads specific tool
- **Required keyword**: `"+linear create issue"` — requires match on first term

**Important**: Deferred tools are NOT available until loaded via ToolSearch. Both keyword and direct selection modes load the returned tools immediately.

---

### WebFetch

**Purpose**: Fetch content from URLs.

```
Parameters:
  url     (required) — URL to fetch
  prompt  (optional) — Instructions for content extraction
```

**Note**: This is a deferred tool — load it via ToolSearch first.

---

### WebSearch

**Purpose**: Search the web for information.

```
Parameters:
  query   (required) — Search query
  prompt  (optional) — Instructions for result processing
```

**Note**: This is a deferred tool — load it via ToolSearch first.

---

## Deferred Tools (Load via ToolSearch)

These tools must be loaded before use:

| Tool | Purpose |
|------|---------|
| `AskUserQuestion` | Ask user a clarifying question |
| `EnterPlanMode` | Switch to plan mode (read-only) |
| `ExitPlanMode` | Exit plan mode |
| `EnterWorktree` | Enter a git worktree |
| `NotebookEdit` | Edit Jupyter notebook cells |
| `WebFetch` | Fetch URL content |
| `WebSearch` | Search the web |
| `Skill` | Execute a user-invocable skill |
| `TaskCreate` | Create a task in the task list |
| `TaskGet` | Get task details |
| `TaskList` | List all tasks |
| `TaskUpdate` | Update task status |
| `TaskStop` | Stop a running task |
| `TaskOutput` | Read task output |
| `ReadMcpResourceTool` | Read an MCP resource |
| `ListMcpResourcesTool` | List MCP resources |

## Tool Selection Guide

| Task | Tool to Use | NOT This |
|------|------------|----------|
| Find files by name/pattern | Glob | `find`, `ls` |
| Search file contents | Grep | `grep`, `rg` |
| Read a file | Read | `cat`, `head`, `tail` |
| Edit a file | Edit | `sed`, `awk` |
| Create/overwrite a file | Write | `echo >`, `cat <<EOF` |
| Run shell commands | Bash | — |
| Complex multi-step research | Task (Explore) | Multiple manual searches |
| Find MCP/deferred tools | ToolSearch | — |

## Parallel Tool Calls

Always call independent tools in parallel within a single message:

**Good** — Two independent searches in parallel:
```
[Glob: pattern="**/*.ts"] + [Grep: pattern="TODO", type="ts"]
```

**Bad** — Sequential when parallel is possible:
```
[Glob: pattern="**/*.ts"]
... wait ...
[Grep: pattern="TODO", type="ts"]
```

**Sequential required** — When one depends on another:
```
[Read: file_path="/src/app.ts"]
... then based on content ...
[Edit: file_path="/src/app.ts", old_string="...", new_string="..."]
```
