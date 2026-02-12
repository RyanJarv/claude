# detect-non-ascii

A Claude Code plugin that flags non-ASCII characters in tool calls before they execute. Catches curly quotes, em dashes, and other Unicode characters that can cause subtle bugs in code and shell commands.

## How It Works

- **PreToolUse** (Bash, Write, Edit): When a tool call contains non-ASCII characters, the hook prompts you to approve or deny. Approving adds the characters to the allowlist so they won't be flagged again.
- **PostToolUse** (Bash, Write, Edit): After an approved tool call, any new non-ASCII characters are auto-added to the per-project allowlist.
- **Edit-aware**: For Edit tool calls, only flags characters that are *newly introduced* — characters already in `old_string` are ignored to avoid false positives.

## Per-Project Allowlist

Each project maintains its own allowlist at `.claude/ascii-allowlist.txt`. The file uses `U+XXXX` format, one codepoint per line:

```
# Allowlisted Unicode characters
U+2014  # em dash
U+2192  # right arrow
```

The file is created automatically when you approve your first non-ASCII character.

## Installation

```
/plugin install detect-non-ascii@claude-plugins
```

## Development

Test locally:
```bash
claude --plugin-dir ./plugins/detect-non-ascii
```

Run tests:
```bash
python3 plugins/detect-non-ascii/scripts/test-check-ascii.py
```
