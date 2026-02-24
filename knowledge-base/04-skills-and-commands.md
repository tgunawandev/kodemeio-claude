# 04 — Skills & Custom Commands

> Complete reference for the Skills system, custom slash commands, and reusable workflows.

## Overview

Skills extend Claude's capabilities with reusable, shareable task templates stored as Markdown files. They replace the older "custom commands" system (`.claude/commands/`) which still works but skills are preferred.

## File Structure

### Skill Directory

```
.claude/skills/skill-name/
├── SKILL.md           # Required: main instructions + YAML frontmatter
├── reference.md       # Optional: detailed API docs
├── examples.md        # Optional: usage examples
└── scripts/
    └── helper.sh      # Optional: executable scripts
```

### Skill Locations (by Priority)

| Priority | Location | Scope |
|----------|----------|-------|
| Highest | `--agents` CLI flag | Session-specific |
| High | `.claude/skills/` | Project (team) |
| Medium | `~/.claude/skills/` | User (all projects) |
| Low | Plugin skills | Where plugin is enabled |

### Automatic Discovery

- Skills in `.claude/skills/` are auto-discovered
- Nested directories within `--add-dir` directories also scan
- Skills re-detect during sessions without restart
- Plugin skills use namespace: `plugin-name:skill-name`

---

## SKILL.md Format

### Basic Skill (No Frontmatter)

```markdown
# Review Code

When reviewing code, always check:
1. Error handling
2. Edge cases
3. Performance implications
4. Security vulnerabilities
5. Test coverage
```

Save as `.claude/skills/review/SKILL.md`, invoke with `/review`.

### Skill with Frontmatter

```yaml
---
name: fix-issue
description: Fix a GitHub issue by number
argument-hint: [issue-number]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
---

Fix GitHub issue #$ARGUMENTS following our coding standards.

Steps:
1. Read the issue with `gh issue view $0`
2. Search codebase for relevant code
3. Implement the fix
4. Write tests
5. Create a descriptive commit
6. Push and create a PR
```

Invoke: `/fix-issue 1234`

---

## Frontmatter Reference

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | No | Directory name | Display name (lowercase, hyphens, max 64 chars) |
| `description` | Recommended | — | When Claude should use this skill |
| `argument-hint` | No | — | Autocomplete hint, e.g., `[issue-number]` |
| `disable-model-invocation` | No | `false` | `true` = manual only via `/name` |
| `user-invocable` | No | `true` | `false` = hidden from `/` menu |
| `allowed-tools` | No | All | Tools available without permission |
| `model` | No | Inherit | `sonnet`, `opus`, `haiku`, or `inherit` |
| `context` | No | — | `fork` to run in isolated subagent |
| `agent` | No | — | Subagent type: `Explore`, `Plan`, `general-purpose`, or custom |
| `hooks` | No | — | Lifecycle hooks scoped to this skill |

---

## String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed to skill |
| `$ARGUMENTS[0]` or `$0` | First argument |
| `$ARGUMENTS[1]` or `$1` | Second argument |
| `${CLAUDE_SESSION_ID}` | Unique session ID |

**Example:**
```yaml
---
name: migrate-component
description: Migrate a component between frameworks
argument-hint: [component] [from-framework] [to-framework]
---

Migrate the $0 component from $1 to $2.
Preserve all existing behavior and tests.
```

Invoke: `/migrate-component SearchBar React Vue`

---

## Invocation Control

| Frontmatter | You invoke | Claude invokes | Context loading |
|-------------|-----------|----------------|-----------------|
| Default | Yes (`/name`) | Yes (auto) | Description always; full on invoke |
| `disable-model-invocation: true` | Yes | No | Not in context until invoked |
| `user-invocable: false` | No | Yes | Description always; full on invoke |

### When to Use Each

- **Default**: General-purpose skills (code review, explanation)
- **`disable-model-invocation: true`**: Side-effect actions (deploy, commit, publish)
- **`user-invocable: false`**: Background conventions (coding standards, architecture)

---

## Dynamic Context Injection

Execute shell commands before sending to Claude using `!` backtick syntax:

```yaml
---
name: pr-summary
description: Summarize pull request changes
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull Request Context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

Summarize these changes into a clear, structured summary.
```

---

## Forked Context (Subagent Skills)

Run skills in isolated subagent context to avoid polluting main conversation:

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research "$ARGUMENTS" thoroughly:
1. Find all relevant files in the codebase
2. Read and analyze key sections
3. Provide structured summary with file references
```

---

## Tool Restrictions

Limit what tools a skill can access:

```yaml
---
name: safe-analyzer
description: Analyze code without modifications
allowed-tools: Read, Grep, Glob
---

Analyze the codebase for patterns, never modify files.
```

---

## Skills with Hooks

Add lifecycle hooks scoped to the skill:

```yaml
---
name: api-builder
description: Build API endpoints
hooks:
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "npx prettier --write"
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-api.sh"
---

Build REST API endpoints following our conventions.
```

---

## Restrict Claude's Skill Access

Via permissions in `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Skill(deploy *)",
      "Skill(dangerous-task)"
    ]
  }
}
```

Syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match.

---

## Example Skills

### 1. Code Review

```yaml
---
name: review
description: Review code for quality and security
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash
---

Review the code changes for:
1. **Correctness**: Logic errors, edge cases, race conditions
2. **Security**: Injection, auth flaws, secrets exposure
3. **Performance**: N+1 queries, memory leaks, inefficient algorithms
4. **Readability**: Naming, structure, documentation
5. **Testing**: Coverage, edge cases, test quality

Provide actionable feedback with file:line references.
```

### 2. Deploy

```yaml
---
name: deploy
description: Deploy to staging or production
argument-hint: [staging|production]
disable-model-invocation: true
allowed-tools: Bash
---

Deploy to $0 environment:

1. Run tests: `npm run test`
2. Build: `npm run build`
3. If staging: `npm run deploy:staging`
4. If production: Confirm with user first, then `npm run deploy:production`
5. Verify deployment health
```

### 3. Database Migration

```yaml
---
name: migrate-db
description: Create and run database migration
argument-hint: [migration-name]
disable-model-invocation: true
---

Create database migration "$0":

1. Generate migration file: `npm run migration:generate -- $0`
2. Review the generated SQL
3. Run migration on development: `npm run migration:run`
4. Verify schema changes
5. Create commit with migration
```

### 4. API Convention Checker

```yaml
---
name: api-check
description: Verify API endpoints follow conventions
user-invocable: false
---

# API Conventions
- Use kebab-case for URL paths
- Use camelCase for JSON properties
- Always paginate list endpoints (page, limit params)
- Version APIs in path (/v1/, /v2/)
- Standard error format: { error: { code, message, details } }
- Authentication via Bearer token in Authorization header
```

### 5. Test Writer

```yaml
---
name: write-tests
description: Write comprehensive tests for a file
argument-hint: [file-path]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Write comprehensive tests for $0:

1. Read the source file
2. Identify all functions/methods to test
3. Create test file following project conventions
4. Include: happy path, edge cases, error cases, boundary values
5. Run tests and fix any failures
6. Ensure coverage > 90%
```

---

## Legacy Custom Commands

The older `.claude/commands/` format still works:

```
~/.claude/commands/my-command.md    # User scope
.claude/commands/my-command.md      # Project scope
```

These files create `/my-command` slash commands. They support `$ARGUMENTS` but not frontmatter fields like `allowed-tools`, `model`, or `hooks`. **Migrate to skills** for full functionality.

---

## Best Practices

1. **Keep SKILL.md concise** — under 500 lines; use supporting files for details
2. **Write clear descriptions** — Claude uses these for auto-invocation decisions
3. **Use `disable-model-invocation: true`** for actions with side effects
4. **Use `context: fork`** for research-heavy skills to protect main context
5. **Restrict tools** — only grant what the skill needs
6. **Move specialized instructions from CLAUDE.md to skills** — they load on-demand, saving context
7. **Version control skills** — commit `.claude/skills/` to git for team sharing
8. **Test skills** — invoke them manually and verify behavior before relying on auto-invocation
