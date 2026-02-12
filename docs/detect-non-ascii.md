# detect-non-ascii — Unicode Character Guard

The **detect-non-ascii** plugin flags non-ASCII characters in tool calls before they execute. It catches curly quotes, em dashes, and other Unicode characters that cause subtle bugs in code and shell commands.

## Overview

When Claude uses the Bash, Write, or Edit tools:

1. **PreToolUse** — scans the tool input for non-ASCII characters not in the allowlist
2. If found — prompts the user to approve or deny the tool call
3. **PostToolUse** — if approved, auto-adds the characters to a per-project allowlist so they are not flagged again

This prevents a common class of bugs where Unicode look-alikes (curly quotes `''` instead of straight quotes `'`, em dashes `—` instead of hyphens `-`) silently break shell commands, config files, or source code.

## Installation

```bash
claude plugin install detect-non-ascii@claude-plugins
```

## How It Works

### PreToolUse Detection

The hook intercepts Bash, Write, and Edit tool calls. For each call it:

1. Extracts the relevant text content (command string, file content, or new edit text)
2. Scans for characters with codepoints > 127
3. Filters out characters already in the project's allowlist
4. If any remain — returns a `permissionDecision: "ask"` response listing the flagged characters

The user sees a prompt like:

```
Non-ASCII in Bash: '—' (U+2014) ''' (U+2019)
Yes = always allow, No = deny
```

### Edit-Aware Diffing

For Edit tool calls, the hook only flags characters that are **newly introduced**. Characters already present in `old_string` are ignored, preventing false positives when editing files that already contain Unicode.

```
old_string: "hello — world"
new_string: "hello — world'"
              ↑ ignored        ↑ flagged (new)
```

### PostToolUse Allowlisting

After an approved tool call completes, the PostToolUse hook scans the output/content for non-ASCII characters and appends any new ones to the allowlist. This means approving a character once permanently allows it for that project.

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

The plugin registers hooks for three tools across two events:

| Event | Tools | Behavior |
|-------|-------|----------|
| PreToolUse | Bash, Write, Edit | Scan input, prompt if non-ASCII found |
| PostToolUse | Bash, Write, Edit | Auto-add approved characters to allowlist |

All six hook entries invoke the same script: `check-ascii.py`.

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

The test suite covers: ASCII-only passthrough, non-ASCII detection, multiple character listing, Edit diffing, allowlist filtering, PostToolUse auto-add, allowlist creation, and duplicate prevention.

## Requirements

- Python 3 (uses only the standard library: `json`, `os`, `sys`)
