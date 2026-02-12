---
description: "Activate when the user discusses goals, verification loops, deployment verification, iterative testing, or when creating/editing .goals/*.yaml files"
---

# Goal System

This project can use **goal-based verification loops** via the goals plugin. Goals prevent Claude from stopping until preconditions are met.

## Available Commands

| Command | Purpose |
|---------|---------|
| `/goals:new <name> [description]` | Create a new goal definition |
| `/goals:activate <name>` | Activate a goal's verification loop |
| `/goals:stop` | Deactivate the current goal |
| `/goals:list` | List all available goals |
| `/goals:status` | Show active goal status and precheck results |

## Goal YAML Schema

Goals are defined in `.goals/*.yaml` at the project root:

```yaml
name: string                       # Required, kebab-case identifier
description: string                # What this goal verifies
vars: { key: value }               # Variables for ${var} expansion in commands/messages
max_iterations: 10                 # Max verification attempts (default 10)
stuck_phrases: [string]            # Override default stuck detection phrases

# Named lists for expect_all_active references
my_list:
  - item-a
  - item-b

prechecks:                         # Run in order; first failure blocks
  - name: string                   # Required, human-readable name
    type: match|expect_all_active|reject_pattern  # Default: match
    command: string                # Required, shell command (stdout captured)
    timeout: 30                    # Per-check timeout in seconds
    success: string                # Exact match value (match type)
    fail_on: [string]              # Values that mean failure
    wait_on: [string]              # Values that mean "try again"
    reject_pattern: string         # Regex to match against
    expected_list: string          # List name (expect_all_active type)
    fail_message: string           # Supports ${RESULT}, ${MISSING}, etc.
    wait_message: string
    inactive_message: string
    extra_message: string

success_phrases: [string]          # Case-insensitive transcript match
instructions: string               # Shown first pass after prechecks pass

command:                           # Display metadata (optional)
  title: string
  summary: string
  workflow: string                 # Shown when goal is activated
```

## Precheck Types

### `match` (default)
Runs a command, compares output to `success`/`fail_on`/`wait_on` values:
- Output matches `success` → check passes (also checks `reject_pattern`)
- Output matches a `wait_on` value → blocks with wait message
- Output matches a `fail_on` value → blocks with fail message
- Output is empty → blocks with fail message
- `success` specified but no match → blocks with fail message
- No `success` specified → checks `reject_pattern` only

### `expect_all_active`
Runs a command that outputs `name state` lines, checks each item in `expected_list`:
- Missing items → blocks with fail message
- Items with state != ACTIVE → blocks with inactive message
- More items than expected → blocks with extra message (if `extra_message` defined)

### `reject_pattern`
Runs a command, blocks if output matches the regex in `reject_pattern`.

## Message Variables

Use these in `fail_message`, `wait_message`, `inactive_message`, `extra_message`, and `instructions`:

| Variable | Description |
|----------|-------------|
| `${RESULT}` | Command output |
| `${MISSING}` | Comma-separated missing items |
| `${INACTIVE}` | Comma-separated inactive items with state |
| `${EXTRA}` | Comma-separated unexpected items |
| `${EXPECTED_COUNT}` | Number of expected items |
| `${DEPLOYED_COUNT}` | Number of found items |
| `${ITERATIONS}` | Current iteration number |
| `${MAX_ITERATIONS}` | Maximum iterations allowed |

Plus any variables defined in the goal's `vars:` section.

## When to Suggest Creating a Goal

- User is deploying and wants verification before finishing
- User wants iterative test-fix loops
- User needs to monitor services and verify health
- User wants a structured workflow that prevents early stopping
- Any task where "don't stop until X is confirmed" is needed

## Common Patterns

### Deploy Verification
```yaml
prechecks:
  - name: Build status
    command: 'check-build-status'
    success: SUCCESS
    wait_on: [WORKING, PENDING]
```

### Test Fix Loop
```yaml
prechecks:
  - name: Tests pass
    type: reject_pattern
    command: 'npm test 2>&1 || true'
    reject_pattern: 'FAIL|ERROR'
```

### Service Monitoring
```yaml
expected_services:
  - api
  - worker
prechecks:
  - name: Services active
    type: expect_all_active
    command: 'service-status-command'
    expected_list: expected_services
```
