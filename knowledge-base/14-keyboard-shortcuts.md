# 14 — Keyboard Shortcuts

> All keybindings, customization, vim mode, and navigation.

## Core Keybindings

### Input & Submission

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit prompt |
| `Shift+Enter` | New line in prompt |
| `Escape` | Cancel current operation / clear input |
| `Ctrl+C` | Interrupt Claude / exit |
| `Ctrl+D` | Exit Claude Code |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Up/Down` | Scroll through message history |
| `Ctrl+Up` | Previous prompt in history |
| `Ctrl+Down` | Next prompt in history |
| `Tab` | Autocomplete file/command |
| `Shift+Tab` | Toggle Plan Mode |

### Model & Mode

| Shortcut | Action |
|----------|--------|
| `Option+P` (macOS) / `Alt+P` | Quick model switch |
| `Shift+Tab` | Toggle Plan Mode (read-only) |
| `Ctrl+G` | Review plan in editor |

### Context Management

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear screen (keep context) |
| `Ctrl+K` | Clear input line |

### Task Management

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Background current task |
| `Ctrl+T` | Toggle background task list |
| `Ctrl+F` | Kill all background agents (press twice) |

### File References

| Shortcut | Action |
|----------|--------|
| `@` | Start file/folder reference |
| `Tab` | Complete file reference |

---

## Vim Mode

### Enable

```
/vim                   # Toggle vim keybindings
```

### Vim Keybindings

When enabled, the input area supports vim-style editing:

| Mode | Key | Action |
|------|-----|--------|
| Normal | `i` | Enter insert mode |
| Normal | `a` | Append after cursor |
| Normal | `A` | Append end of line |
| Normal | `o` | New line below |
| Normal | `O` | New line above |
| Normal | `dd` | Delete line |
| Normal | `yy` | Yank line |
| Normal | `p` | Paste |
| Normal | `u` | Undo |
| Normal | `Ctrl+R` | Redo |
| Normal | `w/b/e` | Word navigation |
| Normal | `0/$` | Line start/end |
| Normal | `/` | Search |
| Insert | `Escape` | Exit to normal mode |

---

## Custom Keybindings

### Configuration File

`~/.claude/keybindings.json`

### Format

```json
[
  {
    "key": "ctrl+s",
    "command": "submit",
    "description": "Submit prompt"
  },
  {
    "key": "ctrl+shift+r",
    "command": "review",
    "description": "Run code review"
  },
  {
    "key": "ctrl+shift+c",
    "command": "compact",
    "description": "Compact context"
  }
]
```

### Available Commands

| Command | Default Key | Description |
|---------|-------------|-------------|
| `submit` | `Enter` | Submit current prompt |
| `newline` | `Shift+Enter` | Insert newline |
| `cancel` | `Escape` | Cancel operation |
| `exit` | `Ctrl+D` | Exit Claude Code |
| `clear` | `Ctrl+L` | Clear screen |
| `compact` | — | Compact context |
| `background` | `Ctrl+B` | Background task |
| `tasks` | `Ctrl+T` | Toggle task list |
| `plan` | `Shift+Tab` | Toggle plan mode |
| `model` | `Option+P` | Switch model |
| `review` | — | Code review |
| `history-prev` | `Ctrl+Up` | Previous prompt |
| `history-next` | `Ctrl+Down` | Next prompt |

### Chord Bindings

Two-key sequences:

```json
[
  {
    "key": "ctrl+k ctrl+r",
    "command": "review",
    "description": "Code review with chord"
  },
  {
    "key": "ctrl+k ctrl+t",
    "command": "tasks",
    "description": "Show tasks with chord"
  }
]
```

### Key Notation

| Notation | Key |
|----------|-----|
| `ctrl` | Control |
| `shift` | Shift |
| `alt` | Alt / Option |
| `meta` | Command (macOS) / Windows key |
| `enter` | Enter/Return |
| `escape` | Escape |
| `tab` | Tab |
| `space` | Space |
| `up/down/left/right` | Arrow keys |
| `backspace` | Backspace |
| `delete` | Delete |

---

## VS Code Keybindings

When using the VS Code extension:

| Shortcut | Action |
|----------|--------|
| Click spark icon | Open Claude Code panel |
| `Enter` | Submit prompt |
| `Shift+Enter` | New line |
| Select text + send | Include terminal output |

Configure via: VS Code Settings → Extensions → Claude Code

---

## JetBrains Keybindings

| Shortcut | Action |
|----------|--------|
| Configure in plugin settings | Open Claude Code |
| `ESC` | Configurable (exit Claude or stay in IDE) |

Configure via: File → Settings → Claude Code

---

## Terminal-Specific Notes

### macOS Terminal

- `Option` key may need Terminal → Preferences → Use Option as Meta Key
- Some shortcuts may conflict with macOS system shortcuts

### Linux Terminal

- `Alt` key should work directly
- Some terminal emulators may intercept certain key combinations

### WSL

- Windows key combinations may be intercepted by Windows
- Configure terminal emulator to pass through shortcuts

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│           Claude Code Shortcuts          │
├─────────────────────────────────────────┤
│ Enter          → Submit prompt           │
│ Shift+Enter    → New line               │
│ Escape         → Cancel / Clear         │
│ Ctrl+C         → Interrupt              │
│ Ctrl+D         → Exit                   │
│ Shift+Tab      → Plan Mode             │
│ Option+P       → Switch model           │
│ Ctrl+B         → Background task        │
│ Ctrl+T         → Toggle task list       │
│ Ctrl+F×2       → Kill all agents        │
│ @filename      → Reference file         │
│ !command       → Run bash               │
│ /command       → Slash command           │
│ /vim           → Toggle vim mode        │
└─────────────────────────────────────────┘
```
