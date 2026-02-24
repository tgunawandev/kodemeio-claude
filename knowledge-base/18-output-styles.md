# 18 — Output Styles

> Built-in output formats, custom styling, themes, and response formatting.

## Output Formats (Headless Mode)

### Plain Text (default)

```bash
claude -p "Summarize this project"
# Returns: plain text response
```

### JSON

```bash
claude -p "List API endpoints" --output-format json
```

Response structure:
```json
{
  "result": "The response text...",
  "session_id": "abc123-def456",
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 300,
    "cache_read_input_tokens": 500,
    "cache_creation_input_tokens": 200
  },
  "model": "claude-sonnet-4-6",
  "cost_usd": 0.0045
}
```

### JSON with Schema Enforcement

```bash
claude -p "Extract function names" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "functions": {
        "type": "array",
        "items": { "type": "string" }
      },
      "count": { "type": "integer" }
    },
    "required": ["functions", "count"]
  }'
```

Response:
```json
{
  "structured_output": {
    "functions": ["login", "signup", "resetPassword"],
    "count": 3
  },
  "session_id": "...",
  "usage": {...}
}
```

### Streaming JSON

```bash
claude -p "Explain recursion" \
  --output-format stream-json \
  --include-partial-messages \
  --verbose
```

Returns newline-delimited JSON events:
```json
{"type": "start", "session_id": "..."}
{"type": "text", "content": "Recursion is"}
{"type": "text", "content": " a programming concept"}
{"type": "tool_use", "tool": "Read", "input": {...}}
{"type": "tool_result", "output": "..."}
{"type": "end", "usage": {...}}
```

---

## Interactive Output

### Markdown Rendering

Claude Code renders GitHub-flavored Markdown in the terminal:
- **Bold**, *italic*, `code`
- Code blocks with syntax highlighting
- Tables
- Lists (ordered and unordered)
- Headers
- Links

### Diff View

When Claude edits files, changes are shown as diffs:
```diff
- const user = getUser(id);
+ const user = await getUser(id);
```

### Tool Call Display

Tool calls are shown with:
- Tool name and parameters
- Execution status (running/complete/error)
- Output summary (truncated for large outputs)

---

## Themes

### Change Theme

```
/theme                     # Interactive theme picker
```

### Available Themes

Claude Code includes built-in themes that adjust:
- Color scheme (dark/light variants)
- Syntax highlighting colors
- Status bar appearance
- Diff highlighting

---

## Custom System Prompts

### Append to Default

```bash
claude -p "Review code" \
  --append-system-prompt "Focus only on security issues. Format findings as a numbered list with severity ratings."
```

### Replace Entirely

```bash
claude -p "Analyze" \
  --system-prompt "You are a security auditor. Only report vulnerabilities. Use CVSS scoring."
```

### From File

```bash
claude -p "Review" \
  --append-system-prompt-file ./prompts/security-review.txt
```

---

## Structured Output Patterns

### For CI/CD Integration

```bash
# Get structured review results
claude -p "Review for bugs" --output-format json | jq '.result'

# Pass/fail gate
claude -p "Check for security issues" --output-format json | \
  jq -e '.result | test("no issues found")' || exit 1
```

### For Data Extraction

```bash
# Extract structured data
claude -p "Extract all API endpoints from this project" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "endpoints": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "method": { "type": "string" },
            "path": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      }
    }
  }'
```

### For Pipelines

```bash
# Chain Claude outputs
claude -p "List files needing tests" --output-format json | \
  jq -r '.result' | \
  while read file; do
    claude -p "Write tests for $file" --allowedTools "Read,Write,Bash(npm test)"
  done
```

---

## Verbose Output

```bash
claude -p "Task" --verbose
```

Shows additional detail:
- API request/response metadata
- Token usage per turn
- Tool call timing
- Model used
- Thinking token count

---

## Terminal Compatibility

### Color Support

Claude Code auto-detects terminal color support:
- 256 colors
- True color (24-bit)
- Basic 16 colors
- No color (piped output)

### Width Handling

- Output wraps to terminal width
- Tables auto-size to fit
- Code blocks maintain formatting
- Narrow terminals get simplified output

### Non-TTY Output

When piped (non-interactive), Claude Code:
- Strips ANSI color codes
- Outputs plain text
- Removes progress indicators
- Simplifies formatting
