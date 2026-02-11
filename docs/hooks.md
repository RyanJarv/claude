# Creating Hooks

Hooks are defined in `hooks/hooks.json`. They execute shell commands in response to Claude Code lifecycle events — use them for validation, logging, automation, and guardrails.

## File Location

```
plugins/my-plugin/
  hooks/
    hooks.json
  scripts/
    validate-write.sh
    log-usage.sh
```

## JSON Schema

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "optional pattern",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/my-script.sh"
          }
        ]
      }
    ]
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hooks` | object | Yes | Top-level container keyed by event name |
| `matcher` | string | No | Pattern to filter when the hook fires (e.g., tool name) |
| `hooks[].type` | string | Yes | Hook type — currently `"command"` |
| `hooks[].command` | string | Yes | Shell command to execute |

## Event Types

| Event | When It Fires | Matcher Matches Against |
|-------|---------------|------------------------|
| `PreToolUse` | Before a tool is executed | Tool name (e.g., `Write`, `Bash`, `Edit`) |
| `PostToolUse` | After a tool finishes | Tool name |
| `Notification` | When a notification is sent | Notification type |
| `Stop` | When the agent stops | — |
| `SubagentStop` | When a subagent stops | — |
| `PreCompact` | Before context compaction | — |
| `PostCompact` | After context compaction | — |

## The `matcher` Field

For `PreToolUse` and `PostToolUse`, the `matcher` pattern filters which tool invocations trigger the hook. Without a matcher, the hook fires for every tool use of that event type.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
          }
        ]
      }
    ]
  }
}
```

This hook only fires before `Write` tool calls, not before `Edit`, `Bash`, or other tools.

## Path Handling

**Always use `${CLAUDE_PLUGIN_ROOT}`** for paths to scripts and files within your plugin. Plugins are cached/copied to a different location on install, so absolute or relative paths will break.

```json
"command": "${CLAUDE_PLUGIN_ROOT}/scripts/my-script.sh"
```

```json
"command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js"
```

## Environment Variables

Hooks receive context through environment variables. The available variables depend on the event type:

- `CLAUDE_PLUGIN_ROOT` — Path to the plugin's installed directory
- Tool-specific variables for PreToolUse/PostToolUse events (tool name, parameters, output)

Hook commands receive event data via stdin as JSON.

## Examples

### Validate Write Operations

Prevent writes to protected files:

**`hooks/hooks.json`**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
          }
        ]
      }
    ]
  }
}
```

**`scripts/validate-write.sh`**
```bash
#!/usr/bin/env bash
# Read the tool input from stdin
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Block writes to protected paths
protected_patterns=(".env" "credentials" "secrets" ".claude/settings")
for pattern in "${protected_patterns[@]}"; do
  if [[ "$file_path" == *"$pattern"* ]]; then
    echo "BLOCKED: Cannot write to protected file: $file_path" >&2
    exit 2
  fi
done
```

### Log Tool Usage

Log every tool invocation for audit purposes:

**`hooks/hooks.json`**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/log-usage.sh"
          }
        ]
      }
    ]
  }
}
```

**`scripts/log-usage.sh`**
```bash
#!/usr/bin/env bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // "unknown"')
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "$timestamp tool=$tool_name" >> "$HOME/.claude/tool-usage.log"
```

### Run Linter After Edits

Automatically lint files after they're edited:

**`hooks/hooks.json`**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/lint-after-edit.sh"
          }
        ]
      }
    ]
  }
}
```

## Hook Exit Codes

| Exit Code | Behavior |
|-----------|----------|
| `0` | Success — proceed normally |
| `2` | Block the operation (for PreToolUse hooks) — the tool call is prevented |
| Other non-zero | Error — reported but does not block |

## Best Practices

- **Use `${CLAUDE_PLUGIN_ROOT}` for all paths.** Never use absolute paths or paths relative to the working directory.
- **Make scripts executable.** Run `chmod +x scripts/*.sh` before publishing your plugin.
- **Keep hooks fast.** Hooks run synchronously — slow hooks degrade the user experience.
- **Use exit code 2 to block.** For PreToolUse validation hooks, exit with code 2 to prevent the tool call.
- **Handle missing dependencies gracefully.** Check that `jq` or other tools exist before using them.
- **Use matchers to scope hooks.** Don't fire on every tool use if you only care about `Write` or `Bash`.
