---
name: cli-restructure
description: >
  Comprehensive CLI restructuring skill for Typer-based kctl-* tools.
  Use when the user wants to audit, rename, reorganize, or fix naming conventions
  in any kctl-* CLI (kctl-odoo, kctl-pg, kctl-rmm, etc.). Triggers on phrases like
  "restructure CLI", "fix CLI naming", "audit CLI commands", "refactor CLI",
  "CLI naming convention", "reorganize commands", or complaints about CLI structure
  like "wrong group", "bad naming", "confusing commands". Also use when the user
  mentions "kctl" and "naming" or "structure" in the same message.
---

# CLI Restructuring Skill

Systematic methodology for auditing and restructuring Typer-based `kctl-*` CLI tools.
Battle-tested on kctl-odoo (58 groups, ~280 commands restructured to 53 groups, ~270 commands).

## When to Use

- User says the CLI naming is bad, confusing, or inconsistent
- User wants to reorganize command groups
- User asks to audit CLI structure
- User wants to apply naming conventions to a CLI
- Any `kctl-*` CLI that has grown organically and needs cleanup

## The Process

```
1. AUDIT    → Complete inventory of every group and command
2. DIAGNOSE → Identify all naming/placement issues
3. DESIGN   → Propose complete new structure (every command)
4. PLAN     → Write implementation plan with exact file changes
5. EXECUTE  → Dispatch subagents per task, review between tasks
6. VERIFY   → Full smoke test, push, update docs
```

---

## Phase 1: AUDIT — Complete Command Inventory

Extract EVERY command from the CLI. No sampling, no summaries.

### Step 1: Find the CLI source

```bash
# Find the entry point and command directory
find <project-root>/cli -name "cli.py" -path "*/src/*"
ls <project-root>/cli/src/kctl_*/commands/
```

### Step 2: Extract all commands

```bash
# Get every @app.command() with its name and file
grep -n '@app.command' cli/src/kctl_*/commands/*.py
```

### Step 3: Build the full inventory

For each file, extract:
- Group name (from `cli.py` registration: `app.add_typer(..., name="<group>")`)
- Command name (from `@app.command("<name>")` or function name if bare `@app.command()`)
- One-line docstring (what it actually does)
- Whether it's `hidden=True`

**Output format:**
```
GROUP: <group-name> (file: <filename>)
  - <command-name> — <what it does> [HIDDEN if applicable]
```

List EVERY command. The user needs the complete picture.

---

## Phase 2: DIAGNOSE — Identify All Issues

Score the current structure 1-10 on these criteria:

### Naming Convention Checklist

| Issue Type | How to Detect | Example |
|-----------|--------------|---------|
| **Wrong group placement** | Command's function doesn't match group's domain | `maintenance update-list` should be `modules scan` |
| **Inconsistent verb placement** | Mix of `noun-verb` and `verb-noun` in same CLI | `invoice-get` vs `transfer-create` |
| **Stuttering** | Group name repeated in command name | `tax tax-report`, `security security-audit` |
| **Duplicate commands** | Same operation available in 2+ groups | `modules upgrade` AND `maintenance update-modules` |
| **Hidden commands without reason** | `hidden=True` with no documented rationale | 13 hidden commands nobody knows about |
| **Over-nesting** | 3+ levels of command hierarchy | `kctl-odoo biz sales sales-summary` |
| **Misleading group names** | Group name suggests different content | `maintenance` containing accounting period close |

### Rating Scale

| Score | Meaning |
|-------|---------|
| 1-3 | Actively misleading — users guess wrong regularly |
| 4-5 | Inconsistent — no clear pattern, some things in wrong place |
| 6-7 | Mostly OK — a few misplacements, inconsistent verbs |
| 8-9 | Well structured — consistent patterns, logical groups |
| 10 | Perfect — every command intuitive, zero surprises |

Present the rating with specific examples for each criterion.

---

## Phase 3: DESIGN — Propose Complete New Structure

### Design Rules (9+/10 standard)

Apply these rules consistently to ALL commands:

| Rule | Pattern | Example |
|------|---------|---------|
| Group name | Noun (resource or domain) | `modules`, `accounting`, `mail` |
| Query subcommand | Bare noun (what you're listing) | `modules list`, `cron history` |
| Single-resource action | Bare verb | `modules install`, `cron enable` |
| Sub-resource action | **Verb-first** compound | `accounting create-invoice`, `hr approve-leave` |
| No stuttering | Never repeat group name in subcommand | `tax report` NOT `tax tax-report` |
| No duplicates | One command, one home | Remove all duplicate commands |
| No hidden commands | Visible or deleted | Except intentional aliases |
| `-list` suffix | Drop it — bare noun instead | `server params` NOT `server params-list` |

### Present the COMPLETE mapping

Show EVERY command — old name vs new name, with change type:

```markdown
### Group: <group-name>

| # | Current | Proposed | Change |
|---|---------|----------|--------|
| 1 | `group old-name` | `group new-name` | renamed (verb-first) |
| 2 | `wrong-group command` | `right-group command` | MOVED |
| 3 | `group duplicate` | REMOVED | duplicate of X |
```

**Do not skip any command.** The user approved "do it all" — they want to see every single command.

### Summary stats

After the full listing, provide:
- Groups before → after
- Commands renamed: N
- Commands moved: N
- Commands removed (duplicates): N
- Hidden → visible: N

---

## Phase 4: PLAN — Implementation Plan

Write a plan to `docs/superpowers/plans/YYYY-MM-DD-<cli-name>-restructure.md`.

### Task categories (in order)

1. **Prep tasks** — Move shared helpers if commands will be redistributed across files
2. **Rename tasks** — Pure decorator string changes (`@app.command("old")` → `@app.command("new")`)
3. **Move tasks** — Copy function body to target file, add imports, remove from source
4. **Delete tasks** — Remove eliminated groups/files, update main cli.py
5. **Alias tasks** — Update/add command aliases
6. **Verify tasks** — Syntax check, CLI load test, grep for old names
7. **Doc tasks** — Update CLAUDE.md, README, skill files

### Key implementation notes

**Rename = just change the decorator string.** The function name does NOT need to change:
```python
# Change this:
@app.command("invoice-get")
def invoice_get(...):  # Function name stays the same

# To this:
@app.command("get-invoice")
def invoice_get(...):  # Function name stays the same
```

**Move = copy function + fix imports.** When moving a function between files:
1. Copy the ENTIRE function (decorator + body) to the target file
2. Add any missing imports to the target file
3. Remove the function from the source file
4. Check that shared helpers are importable from the new location

**Don't forget docstring examples!** After renaming commands, the docstring `Examples:` sections still show old names. Fix these too:
```python
"""Create an invoice.

Examples:
    kctl-odoo accounting create-invoice ...  # NOT invoice-create
"""
```

### Parallelization strategy

Group tasks that modify DIFFERENT files and dispatch in parallel:
- All renames can run in parallel (each modifies a different file)
- Moves that target different files can run in parallel
- Delete + verify must run AFTER all moves complete

---

## Phase 5: EXECUTE

Use `superpowers:subagent-driven-development` or dispatch subagents manually.

### Subagent prompt template for RENAME tasks

```
You are renaming command decorators in <file>.

Work from: <project-root>

This is a PURE RENAME task. Only change the string inside @app.command("...") decorators.
Do NOT change function names, logic, or anything else.

### File: <path>
Make these exact replacements:
- "<old-name>" -> "<new-name>"
- ...

### Commit:
git add <file>
git commit -m "refactor(cli): rename <group> commands to verb-first

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Subagent prompt template for MOVE tasks

```
You are moving commands from <source-file> to <target-file>.

Work from: <project-root>

### Commands to MOVE:
1. <function_name> -> register as @app.command("<new-name>") (remove hidden=True if present)

### Commands to SKIP (duplicates):
- <function_name> — duplicate of <existing-command>

### Steps:
1. Read <source-file> to get function bodies
2. Read <target-file> to see current imports
3. Copy functions to END of <target-file>, changing decorators
4. Add missing imports (check what the moved functions use)
5. Do NOT modify <source-file> (deleted in a later task)

### Commit:
git add <target-file>
git commit -m "refactor(cli): move <description>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: VERIFY

### Verification checklist

```bash
# 1. Syntax check ALL files
for f in cli/src/kctl_*/commands/*.py cli/src/kctl_*/core/*.py cli/src/kctl_*/cli.py; do
  python -c "import py_compile; py_compile.compile('$f', doraise=True)" || echo "FAIL: $f"
done

# 2. CLI loads without errors
kctl-<name> --help

# 3. Key groups show correct commands
kctl-<name> <group> --help

# 4. No old names remain
grep -rn '"old-command-name"' cli/src/kctl_*/commands/ || echo "GOOD"

# 5. No old names in docstring examples
grep -rn 'kctl-<name> <group> old-name' cli/src/kctl_*/commands/ || echo "GOOD"

# 6. Reinstall CLI
pip install -e cli/ --break-system-packages

# 7. Final smoke test
kctl-<name> --version
kctl-<name> --help
```

### Post-verification

- Update CLAUDE.md with new group count and any changed command references
- Update the corresponding `*-admin` skill if it references command names
- Update MEMORY.md if it references old command names
- Commit, push to remote
- Clean `__pycache__` directories

---

## Common Pitfalls (learned from experience)

1. **Stray paste artifacts** — When moving large functions between files, watch for incomplete pastes or extra lines that end up at wrong indentation. Always syntax-check after moves.

2. **Missing imports on moved functions** — The moved function may use imports that exist in the source file but not the target. Check every `from X import Y` the function uses.

3. **Docstring examples not updated** — Renaming the decorator is only half the job. The docstring `Examples:` section still shows old names. Fix these in a separate pass.

4. **Shared helpers** — If multiple biz/utility files share helper functions, move the helpers to `core/` FIRST before moving the commands that use them.

5. **Hidden commands with no reason** — Don't just make them visible. Check if they're duplicates first. If duplicate, remove. If unique, make visible.

6. **Inline imports inside functions** — Some moved functions have `from datetime import date` inside the function body (lazy imports). These work but are inconsistent. Note them but don't block on them.

---

## Template: Quick Audit Prompt

For a fast audit without the full skill, use this prompt:

```
Audit the kctl-<name> CLI structure:

1. List EVERY command group and EVERY subcommand with what it does
2. Rate the naming structure 1-10
3. Identify: wrong placements, inconsistent verbs, stuttering names,
   duplicates, hidden commands, over-nesting
4. Propose the complete 9+/10 structure — EVERY command, old vs new
5. Show change stats (renamed, moved, removed, groups eliminated)
```
