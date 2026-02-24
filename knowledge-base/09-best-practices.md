# 09 — Best Practices & Workflows

> Proven tips, tricks, workflows, and patterns for getting the most out of Claude Code.

## Golden Rules

1. **Give Claude a way to verify its work** — tests, type checks, linters, screenshots
2. **Explore first, then plan, then code** — use Plan Mode before implementing
3. **Be specific upfront** — detailed prompts save time and tokens
4. **Manage context aggressively** — `/clear` between tasks, `/compact` within tasks
5. **Move specialized instructions to skills** — CLAUDE.md is for essentials only

---

## Writing an Effective CLAUDE.md

### What to Include

```markdown
# Build Commands
- `pnpm install` - Install dependencies
- `pnpm run test -- specific.test.ts` - Run single test
- `pnpm run build` - Build project
- `tsc --noEmit` - Type check

# Code Style
- Use ES modules (import/export), not CommonJS
- Destructure imports: import { foo } from 'bar'
- 2-space indentation, no semicolons

# Git Conventions
- Branch naming: feature/name or fix/name
- Descriptive commit messages

# Architecture
- API routes: src/api/
- Business logic: src/services/
- Database models: src/models/

# Project Quirks
- Uses pnpm, not npm
- Requires NODE_ENV=development for local work
- Redis must be running for integration tests
```

### What to Exclude

- Anything Claude can figure out by reading code
- Standard language conventions Claude already knows
- Detailed API documentation (link instead)
- File-by-file descriptions
- Information that changes frequently

### Rules of Thumb

- **Under 500 lines** — bloated files cause Claude to ignore instructions
- **Emphasis works** — "IMPORTANT", "YOU MUST", "NEVER" improve adherence
- **Use `@imports`** — `@path/to/file` to keep CLAUDE.md concise
- **Version control it** — commit to git for team sharing
- **Run `/init`** — generates a starter based on your project

---

## Workflow Patterns

### Explore → Plan → Implement → Verify

```
1. Shift+Tab → Plan Mode (read-only)
   "Read the auth module and explain the session management"

2. Still in Plan Mode:
   "I want to add Google OAuth. What files need to change?
    Create a detailed implementation plan."

3. Ctrl+G → Review plan in editor → approve

4. Switch to Normal Mode → implement the plan

5. "Run the test suite and fix any failures"

6. "Create a commit with descriptive message"
```

### Writer/Reviewer Pattern

| Session A (Writer) | Session B (Reviewer) |
|---------------------|---------------------|
| Implement feature | — |
| — | Review for bugs, security, edge cases |
| Address feedback | — |
| — | Final review |

Fresh context = no bias = better reviews.

### Test-Driven Development

```
# Bad
"implement email validation"

# Good
"write validateEmail(). Requirements:
- user@example.com → true
- user@.com → false
- '' → false
Write tests first, then implement, then verify all pass."
```

### Multi-Repo Work

```bash
claude --add-dir ../shared-config --add-dir ../documentation
```

### Parallel Sessions with Worktrees

```bash
# Terminal 1: Feature work
git worktree add ../feature feature/my-feature
cd ../feature && claude

# Terminal 2: Bug fix (independent)
git worktree add ../bugfix fix/critical-issue
cd ../bugfix && claude

# Each session has separate context and auto memory
```

---

## Context Management

### Check Context Usage

```
/context        # Visual grid of context usage
/cost           # Token statistics
```

### Free Up Context

```
/compact Focus on code changes and test results    # Compress with focus
/clear                                               # Reset entirely
/rename "auth-refactor"                             # Name before clearing
```

### Prevent Context Bloat

1. **Use subagents** for verbose operations (tests, logs, docs)
2. **Disable unused MCP servers** — each adds tool definitions
3. **Move specialized instructions to skills** — load on-demand
4. **Use hooks** to filter output (only show failures, not full logs)
5. **Be specific** — "fix the bug in auth.ts line 42" not "improve the codebase"

### Auto-Compaction

Triggers at ~95% context capacity. Override:
```bash
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50 claude  # Earlier compaction
```

### Re-inject Context After Compaction

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [{
          "type": "command",
          "command": "echo 'REMINDER: Use pnpm. Run tests before commits. TypeScript strict mode.'"
        }]
      }
    ]
  }
}
```

---

## Effective Prompting

### Be Specific

```
# Vague (expensive, unpredictable)
"make the code better"

# Specific (cheap, predictable)
"add input validation to the login endpoint in src/api/auth.ts.
Validate email format and password length (8-128 chars).
Return 400 with descriptive error messages."
```

### Provide Rich Context

```
"The user reported: 'login fails with 500 error when email has + character'
Relevant files: src/api/auth.ts, src/services/user.ts
The bug is likely in email parsing. Fix it and add a test case."
```

### Give Verification Criteria

```
"After implementing, verify by:
1. Running npm test -- auth.test.ts
2. Checking tsc --noEmit passes
3. Testing edge cases: empty input, special chars, unicode"
```

### Let Claude Interview You

```
"I want to add a caching layer. Ask me questions about our requirements
before proposing an implementation."
```

---

## Git Workflow Automation

### Commits

```
"Create a commit for these changes with a descriptive message"
```

Claude will:
1. `git status` and `git diff`
2. Analyze changes
3. Draft commit message
4. Stage relevant files
5. Commit with Co-Authored-By tag

### Pull Requests

```
"Create a PR for this branch"
```

Claude will:
1. Check branch status
2. Review all commits since divergence
3. Draft title and description
4. Push and create PR via `gh`

### Code Review

```
"Review the changes in this PR for bugs, security issues, and code quality"
```

Or use `/review` slash command.

---

## Performance Tips

### Model Selection

| Task | Best Model | Why |
|------|-----------|-----|
| Complex architecture | Opus | Best reasoning |
| Daily coding | Sonnet | Good balance |
| Simple tasks | Haiku | Fast, cheap |
| Subagent research | Haiku | Cost-effective |

Switch with: `/model`, `Option+P`, or `--model` flag.

### Extended Thinking

- Enabled by default with 31,999 token budget
- Adjust with `/model` → effort level slider
- Disable for simple tasks: `MAX_THINKING_TOKENS=0`
- Logarithmic relationship: doubling budget doesn't double accuracy

### Fast Mode

- Same Opus 4.6 model, faster output
- Toggle: `/fast`
- Good for low-latency workflows
- Not a different/cheaper model

---

## Common Failure Patterns to Avoid

| Pattern | Problem | Solution |
|---------|---------|----------|
| "Improve the codebase" | Too vague, expensive | Be specific about what to improve |
| Giant CLAUDE.md | Instructions ignored | Keep under 500 lines, use skills |
| Never using /clear | Context degrades | Clear between unrelated tasks |
| Manual file search | Slow, incomplete | Let Claude use Glob/Grep |
| Not using Plan Mode | Wrong implementation | Plan first, implement second |
| Ignoring /cost | Surprise bills | Monitor regularly |
| All instructions in prompts | Repeated every session | Put stable instructions in CLAUDE.md |
| Single monolithic session | Context exhaustion | Break into focused sessions |

---

## Team Best Practices

### Share Configuration

```
.claude/
├── CLAUDE.md               # Team conventions (git tracked)
├── settings.json            # Team permissions (git tracked)
├── skills/                  # Team skills (git tracked)
├── agents/                  # Team subagents (git tracked)
├── rules/                   # Modular rules (git tracked)
├── settings.local.json      # Personal overrides (gitignored)
└── hooks/                   # Team hooks (git tracked)
.mcp.json                    # Team MCP servers (git tracked)
CLAUDE.local.md              # Personal project notes (gitignored)
```

### Modular Rules

```
.claude/rules/
├── code-style.md           # Applies to all files
├── testing.md              # Applies to all files
├── api-design.md           # Path-specific rules
├── frontend/
│   ├── react.md
│   └── styles.md
└── backend/
    ├── database.md
    └── security.md
```

Path-specific rules:
```yaml
---
paths:
  - "src/api/**/*.ts"
---
# API rules that only apply to API files
```

### Organization-Level Settings

Deploy managed settings via MDM/Group Policy:
- macOS: `/Library/Application Support/ClaudeCode/`
- Linux: `/etc/claude-code/`
- Windows: `C:\Program Files\ClaudeCode\`
