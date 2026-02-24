# 19 — Checkpointing

> Git checkpoint system, undo/rewind, safety nets, and recovery.

## Overview

Claude Code automatically creates git checkpoints before making changes, allowing you to safely revert any modifications. This provides a safety net for all file operations.

---

## How Checkpoints Work

1. Before Claude modifies files, a git checkpoint is created
2. The checkpoint captures the exact state of all tracked files
3. If something goes wrong, you can revert to any checkpoint
4. Checkpoints are stored in git reflog (local only, not pushed)

### Automatic Checkpoints

Claude creates checkpoints:
- Before any `Edit` operation
- Before any `Write` operation
- Before batch operations (multiple file changes)
- Before running potentially destructive commands

---

## Undo Changes

### Quick Undo

```
/undo                      # Revert to last checkpoint
```

This reverts all changes since the last checkpoint.

### Selective Undo

```
/undo path/to/file.ts      # Revert specific file
```

### Using Git Directly

```bash
# See all checkpoints
git reflog

# Restore specific checkpoint
git checkout <commit-hash> -- path/to/file.ts

# Restore all files from checkpoint
git checkout <commit-hash> -- .
```

---

## VS Code / Desktop Checkpoints

In VS Code and Desktop app:
- Checkpoints are integrated with IDE undo
- Visual diff shows exactly what changed
- One-click revert per file or per change
- Timeline view of all checkpoints

---

## Checkpoint Management

### View Recent Checkpoints

```bash
git reflog --all | head -20
```

### Compare With Checkpoint

```bash
git diff <checkpoint-hash>
```

### Checkpoint Retention

- Checkpoints live in git reflog
- Default git reflog expiry: 90 days
- Not affected by `/clear` or session end
- Not pushed to remote (local safety only)

---

## Recovery Scenarios

### Bad Edit

```
Claude made a wrong change to auth.ts

1. /undo                    # Revert all recent changes
   — or —
   /undo src/auth.ts        # Revert just that file
2. Explain what went wrong
3. Claude tries again with corrected approach
```

### Multiple Bad Changes

```
Claude changed several files incorrectly

1. git reflog               # Find the right checkpoint
2. git checkout <hash> -- . # Restore all files
3. /clear                   # Reset context
4. Start fresh with clearer instructions
```

### Partial Recovery

```
Some changes are good, some are bad

1. git diff                 # Review all changes
2. git checkout HEAD -- path/to/bad-file.ts    # Revert bad ones
3. Keep good changes staged
```

### Lost Uncommitted Work

```
Accidentally overwrote uncommitted changes

1. git reflog               # Find state before overwrite
2. git checkout <hash> -- path/to/file
3. — or —
   git stash list           # Check if stashed
   git stash pop
```

---

## Safety Practices

### Before Large Changes

```
"Before making changes, create a git commit with current state"
```

This creates an explicit save point beyond automatic checkpoints.

### For Risky Operations

```
"I'm going to ask you to refactor the auth module.
First, commit the current state as a checkpoint."
```

### Using Worktrees

```bash
claude --worktree refactor    # Isolated copy
# If changes are bad, just delete the worktree
git worktree remove ../refactor
```

---

## Checkpoint + Subagent Isolation

When subagents use worktree isolation:

```yaml
# .claude/agents/risky-refactor.md
---
name: risky-refactor
isolation: worktree
---
```

- Agent works in isolated git worktree
- Changes stay in separate branch
- Main branch untouched until you merge
- Worktree auto-cleaned if no changes made

---

## Best Practices

1. **Trust the safety net** — checkpoints are automatic, use `/undo` freely
2. **Commit before big changes** — explicit commits are cleaner restore points
3. **Use worktrees for experiments** — complete isolation for risky work
4. **Check `git reflog`** — your ultimate recovery tool
5. **Don't `git clean -f`** — can destroy untracked checkpoint data
6. **Review diffs** — `/diff` shows pending changes before committing
