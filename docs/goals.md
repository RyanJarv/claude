# Goals — Declarative Verification Loops

The **goals** plugin creates iterative verification loops that prevent Claude from stopping until preconditions are met. Goals are defined as YAML files and enforced via a Stop hook.

## Overview

When a goal is active, each time Claude tries to stop, the goal engine:

1. Runs each precheck command in order
2. If any precheck fails — blocks stopping and tells Claude what to fix
3. If all prechecks pass (first time) — shows the goal's `instructions`
4. On subsequent passes — checks the transcript for `success_phrases`
5. Safety limits (`max_iterations`, stuck detection) prevent infinite loops

## Installation

```bash
claude plugin install goals
```

## Commands

| Command | Purpose |
|---------|---------|
| `/goals:new <name> [description]` | Create a new goal from a template |
| `/goals:activate <name>` | Start the verification loop |
| `/goals:stop` | Deactivate the current goal |
| `/goals:list` | List all available goals |
| `/goals:status` | Show active goal status and precheck results |

## Goal File Location

Goals live in `.goals/` at your project root:

```
my-project/
  .goals/
    deploy-verify.yaml
    test-suite.yaml
```

## YAML Schema

```yaml
name: deploy-verify                # Required, kebab-case
description: Verify deployment     # What this goal checks

vars:                              # Variables for ${var} expansion
  project: my-app
  endpoint: http://localhost:3000

max_iterations: 10                 # Max attempts before forced stop (default 10)
stuck_phrases: [...]               # Override default stuck detection
timeout: 30                        # Per-precheck command timeout in seconds

prechecks:                         # Run in order; first failure blocks
  - name: Health check             # Required, human-readable
    type: match                    # match | expect_all_active | reject_pattern
    command: 'curl -s ${endpoint}/health'
    success: "ok"                  # Expected output (match type)
    fail_on: [ERROR, DOWN]         # Values that mean failure
    wait_on: [STARTING, PENDING]   # Values that mean "try again later"
    reject_pattern: 'FAIL|ERROR'   # Regex — blocks if matched
    expected_list: my_services     # List name (expect_all_active type)
    timeout: 30                    # Per-check override
    fail_message: "Health check failed: ${RESULT}"
    wait_message: "Still starting up..."
    inactive_message: "Service not active: ${INACTIVE}"
    extra_message: "Unexpected services: ${EXTRA}"

# Named lists for expect_all_active references
my_services:
  - api-server
  - worker

success_phrases:                   # Case-insensitive transcript match
  - verification complete

instructions: |                    # Shown after all prechecks pass (first time)
  All checks passed. Now verify:
  1. Test user flows manually
  2. Check error logs

command:                           # Display metadata (optional)
  title: Deploy Verification
  summary: Checks health, build, and services
  workflow: "Build → Health → Services → Manual"
```

## Precheck Types

### `match` (default)

Runs a command and compares stdout to expected values.

| Condition | Result |
|-----------|--------|
| Output matches `success` | Pass (also checks `reject_pattern`) |
| Output matches a `wait_on` value | Block with wait message |
| Output matches a `fail_on` value | Block with fail message |
| Output is empty | Block with fail message |
| `success` set but no match | Block with fail message |
| No `success` set | Check `reject_pattern` only |

```yaml
- name: Build status
  command: 'get-build-status'
  success: SUCCESS
  fail_on: [FAILURE, TIMEOUT]
  wait_on: [WORKING, PENDING]
  fail_message: "Build failed with status: ${RESULT}"
```

### `expect_all_active`

Runs a command that outputs `name state` lines, then checks each item in a named list.

| Condition | Result |
|-----------|--------|
| Item missing from output | Block with fail message |
| Item present but state != ACTIVE | Block with inactive message |
| Unexpected items in output | Block with extra message (if defined) |
| All items present and ACTIVE | Pass |

```yaml
expected_services:
  - api-server
  - worker
  - scheduler

prechecks:
  - name: All services running
    type: expect_all_active
    command: 'service-status --format "name state"'
    expected_list: expected_services
    fail_message: "Missing services: ${MISSING}"
    inactive_message: "Inactive: ${INACTIVE}"
```

### `reject_pattern`

Runs a command and blocks if stdout matches the regex.

```yaml
- name: No test failures
  type: reject_pattern
  command: 'npm test 2>&1 || true'
  reject_pattern: 'FAIL|ERROR'
  fail_message: "Tests failed — fix and retry"
```

## Message Variables

Use these in `fail_message`, `wait_message`, `inactive_message`, `extra_message`, and `instructions`:

| Variable | Available In | Description |
|----------|-------------|-------------|
| `${RESULT}` | All types | Command stdout |
| `${MISSING}` | expect_all_active | Comma-separated missing items |
| `${INACTIVE}` | expect_all_active | Comma-separated inactive items with state |
| `${EXTRA}` | expect_all_active | Comma-separated unexpected items |
| `${EXPECTED_COUNT}` | expect_all_active | Number of expected items |
| `${DEPLOYED_COUNT}` | expect_all_active | Number of found items |
| `${ITERATIONS}` | All types | Current iteration number |
| `${MAX_ITERATIONS}` | All types | Maximum iterations allowed |
| `${varname}` | All types | Any key from `vars:` |

## Templates

`/goals:new` offers three starter templates:

| Template | Use Case | Precheck Types Used |
|----------|----------|-------------------|
| `deploy-verify` | HTTP health checks, build status, browser testing | match |
| `test-suite` | Run tests, fail on errors, fix-and-rerun | reject_pattern |
| `monitoring-check` | Verify services are active and healthy | expect_all_active |

## How the Stop Hook Works

The goals plugin registers a `Stop` hook that runs `goal-engine.mjs`:

1. Checks for an active goal flag file
2. If no active goal — allows stop
3. Reads the active goal's YAML definition
4. Runs each precheck command sequentially
5. If any precheck fails — outputs a blocking message (exit code 2) telling Claude what failed and what to do
6. If all prechecks pass for the first time — outputs the goal's `instructions` and blocks
7. On subsequent passes — scans the transcript for `success_phrases`; if found, allows stop
8. If `max_iterations` is exceeded or stuck phrases are detected — allows stop as a safety valve

## Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `max_iterations` | 10 | Maximum verification loop iterations |
| `stuck_phrases` | Built-in list | Phrases in transcript that allow early stop |
| `timeout` | 30s | Per-precheck command timeout |

## Migration from Manual Setup

If you previously configured goal loops directly in `.claude/hooks/`:

1. Move YAML files from `.claude/hooks/goals/` to `.goals/`
2. Install the plugin: `claude plugin install goals`
3. Remove the manual Stop hook from `.claude/settings.local.json`
4. Delete `.claude/hooks/goal-loop.sh`, `goal-start.sh`, and `generate-goal-commands.sh`
5. Delete generated command files (e.g., `.claude/commands/*-goal.md`)

The YAML schema is compatible — existing goal definitions work without changes.
