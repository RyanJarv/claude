# detect-non-ascii — Unicode Character Guard

The **detect-non-ascii** plugin flags non-ASCII characters in Bash tool calls before they execute. It catches curly quotes, em dashes, and other Unicode characters that cause subtle bugs in shell commands.

## Overview

When Claude uses the Bash tool:

1. **PreToolUse** — scans the command for non-ASCII characters not in the allowlist
2. If found — prompts the user to approve or deny the tool call
3. **PostToolUse** — if approved, auto-adds the characters to a per-project allowlist so they are not flagged again

This prevents a common class of bugs where Unicode look-alikes (curly quotes `''` instead of straight quotes `'`, em dashes `—` instead of hyphens `-`) silently break shell commands.

## Installation

```bash
claude plugin install detect-non-ascii@claude-plugins
```

## How It Works

### PreToolUse Detection

The hook intercepts Bash tool calls. For each call it:

1. Extracts the command string
2. Scans for characters with codepoints > 127
3. Filters out characters already in the project's allowlist
4. If any remain — returns a `permissionDecision: "ask"` response listing the flagged characters

The user sees a prompt like:

```
Non-ASCII in Bash: '—' (U+2014) ''' (U+2019)
Yes = always allow, No = deny
```

### PostToolUse Allowlisting

After an approved Bash call completes, the PostToolUse hook scans the command output for non-ASCII characters and appends any new ones to the allowlist. This means approving a character once permanently allows it for that project.

## Per-Project Allowlist

Each project maintains its own allowlist at `.claude/ascii-allowlist.txt`. The file uses `U+XXXX` format, one codepoint per line:

```
# Allowlisted Unicode characters
U+2014  # —
U+2192  # →
U+2019  # '
```

- Created automatically when the first character is approved
- Comments (`#`) and blank lines are ignored
- Inline comments are supported: `U+2014  # em dash`
- Characters in this file are never flagged again

## Hooks Configuration

The plugin registers hooks for the Bash tool across two events:

| Event | Tool | Behavior |
|-------|------|----------|
| PreToolUse | Bash | Scan command, prompt if non-ASCII found |
| PostToolUse | Bash | Auto-add approved characters to allowlist |

Both hook entries invoke the same script: `check-ascii.py`.

## Hook Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No non-ASCII found, or PostToolUse (silent add) |
| 0 + JSON stdout | Non-ASCII found — returns `permissionDecision: "ask"` |

The hook never blocks (exit code 2). It always defers to the user via the `ask` permission decision.

## Common Characters Caught

| Character | Codepoint | Often Confused With |
|-----------|-----------|-------------------|
| `'` `'` | U+2018, U+2019 | `'` straight quote |
| `"` `"` | U+201C, U+201D | `"` straight quote |
| `—` | U+2014 | `-` hyphen |
| `–` | U+2013 | `-` hyphen |
| `…` | U+2026 | `...` three dots |
| `→` | U+2192 | `->` arrow |

## Testing

```bash
# Test locally
claude --plugin-dir ./plugins/detect-non-ascii

# Run the test suite
python3 plugins/detect-non-ascii/scripts/test-check-ascii.py
```

The test suite covers: ASCII-only passthrough, non-ASCII detection, multiple character listing, allowlist filtering, PostToolUse auto-add, allowlist creation, and duplicate prevention.

## Requirements

- Python 3 (uses only the standard library: `json`, `os`, `sys`)
