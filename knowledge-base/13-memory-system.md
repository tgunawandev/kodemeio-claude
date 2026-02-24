# 13 — Memory System

> Auto memory, CLAUDE.md hierarchy, modular rules, imports, and persistent context.

## Memory Architecture

Claude Code has multiple layers of persistent context:

```
┌──────────────────────────────────────────┐
│            Always Loaded                  │
│  ┌──────────────────────────────────┐    │
│  │  CLAUDE.md hierarchy             │    │
│  │  (user → project → local)       │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  Auto Memory (MEMORY.md)         │    │
│  │  (first 200 lines)              │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  Modular Rules (.claude/rules/)  │    │
│  │  (path-matched rules)           │    │
│  └──────────────────────────────────┘    │
├──────────────────────────────────────────┤
│            On Demand                      │
│  ┌──────────────────────────────────┐    │
│  │  Skills (SKILL.md)              │    │
│  │  (loaded when invoked)          │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  @Imports                        │    │
│  │  (inlined from referenced files)│    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## Auto Memory

### What It Is

Persistent notes Claude writes across sessions. Stored per-project, auto-loaded on session start.

### Location

```
~/.claude/projects/<project-hash>/memory/MEMORY.md
```

### How It Works

1. Claude observes patterns during work
2. Writes/updates `MEMORY.md` using Write/Edit tools
3. First 200 lines loaded automatically next session
4. Additional topic files can be created and linked

### What Gets Saved

- Stable patterns confirmed across multiple interactions
- Key architectural decisions
- Important file paths and project structure
- User workflow preferences
- Solutions to recurring problems

### What NOT to Save

- Session-specific context (current task, temporary state)
- Incomplete/unverified information
- Duplicates of CLAUDE.md content
- Speculative conclusions from single files

### Organizing Memory

```markdown
# MEMORY.md (keep under 200 lines)

## Project Stack
- Framework: Next.js 14 with App Router
- Database: PostgreSQL with Prisma
- Package manager: pnpm (not npm!)

## Conventions
- Tests: Vitest, files in __tests__/
- Commits: conventional commits (feat:, fix:, etc.)

## Key Decisions
- See [architecture.md](architecture.md) for detailed decisions
- See [debugging.md](debugging.md) for common issues

## User Preferences
- Prefers concise responses
- Wants tests written alongside features
```

### Separate Topic Files

```
~/.claude/projects/<hash>/memory/
├── MEMORY.md           # Main file (auto-loaded, ≤200 lines)
├── architecture.md     # Detailed architecture notes
├── debugging.md        # Common debugging patterns
└── patterns.md         # Code patterns used in project
```

### Explicit User Requests

When a user says "remember this" or "always do X", save immediately — don't wait for multiple confirmations.

When a user says "forget X" or "stop doing X", find and remove the relevant entries.

---

## CLAUDE.md System

### Hierarchy (All Merged)

| Priority | File | Scope |
|----------|------|-------|
| 1 | `~/.claude/CLAUDE.md` | User-global (all projects) |
| 2 | `CLAUDE.md` | Project root (git tracked) |
| 3 | `CLAUDE.local.md` | Project root (local only, gitignored) |
| 4 | `.claude/CLAUDE.md` | Project .claude dir |
| 5 | Added dirs' CLAUDE.md | Via `--add-dir` |

All files are loaded and merged. Higher-priority files take precedence for conflicting instructions.

### Writing Effective CLAUDE.md

**Include:**
```markdown
# Build Commands
- `pnpm install` — Install deps
- `pnpm test -- file.test.ts` — Single test
- `pnpm build` — Build
- `tsc --noEmit` — Type check

# Code Style
- ES modules (import/export)
- 2-space indent, no semicolons
- Destructured imports

# Architecture
- API: src/api/
- Business logic: src/services/
- Models: src/models/

# Quirks
- Uses pnpm, not npm
- Redis required for integration tests
```

**Exclude:**
- What Claude can figure out by reading code
- Standard language conventions
- Detailed API docs (link instead)
- Frequently changing information

**Rules of Thumb:**
- Keep under 500 lines (bloated files get ignored)
- Use emphasis: "IMPORTANT", "YOU MUST", "NEVER"
- Use `@imports` for detailed content
- Version control for team sharing
- Run `/init` for a starter

---

## Modular Rules

### Location

```
.claude/rules/
├── code-style.md           # Global rules
├── testing.md              # Global rules
├── api-design.md           # Can be path-specific
├── frontend/
│   ├── react.md
│   └── styles.md
└── backend/
    ├── database.md
    └── security.md
```

### Global Rules

Files without `paths` frontmatter apply to all contexts:

```markdown
# Testing Standards

- Every feature must have tests
- Minimum 80% coverage
- Use describe/it pattern
- Mock external services
```

### Path-Specific Rules

```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/routes/**/*.ts"
---

# API Rules
- Validate input with Zod schemas
- Return consistent error format: { error: string, code: number }
- Include OpenAPI annotations
- Rate limiting on all public endpoints
```

Only loaded when Claude works with files matching the path patterns.

---

## @Imports

Reference external files from CLAUDE.md:

```markdown
# Project Instructions

@docs/api-conventions.md
@.claude/rules/security-checklist.md
@shared/coding-standards.md
```

- Content inlined at load time
- Keeps CLAUDE.md concise
- Referenced files can be any text format
- Paths relative to CLAUDE.md location

---

## Subagent Memory

Subagents can have their own persistent memory:

```yaml
# .claude/agents/code-reviewer.md
---
name: code-reviewer
memory: user      # or: project, local
---
```

| Scope | Location | Shared |
|-------|----------|--------|
| `user` | `~/.claude/agent-memory/<name>/` | Across projects |
| `project` | `.claude/agent-memory/<name>/` | Git tracked |
| `local` | `.claude/agent-memory-local/<name>/` | Local only |

When enabled:
- System prompt includes memory read/write instructions
- First 200 lines of `MEMORY.md` auto-loaded
- Read, Write, Edit tools automatically enabled for agent

---

## Context Re-injection

After compaction, important context may be lost. Re-inject via hooks:

```json
{
  "hooks": {
    "PostCompact": [{
      "hooks": [{
        "type": "prompt",
        "prompt": "REMINDER: Use pnpm. TypeScript strict mode. Run tests before commits."
      }]
    }]
  }
}
```

Or use SessionStart hook:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "cat .claude/context-reminder.txt"
      }]
    }]
  }
}
```

---

## Memory Best Practices

1. **Keep MEMORY.md under 200 lines** — anything beyond is truncated
2. **Use topic files** for detailed notes, link from MEMORY.md
3. **Update, don't duplicate** — check existing memory before writing
4. **Remove outdated entries** — stale memory causes wrong behavior
5. **CLAUDE.md for team conventions** — MEMORY.md for personal patterns
6. **Path-specific rules** — avoid loading irrelevant rules
7. **@Imports for details** — keep CLAUDE.md as a concise index
