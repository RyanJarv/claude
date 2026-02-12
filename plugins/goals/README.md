# Goals Plugin

Declarative goal loops for Claude Code — prevents Claude from stopping until preconditions are verified.

## What Are Goals?

Goals create **iterative verification loops**. When a goal is active, the Stop hook runs prechecks before allowing Claude to stop. If prechecks fail, Claude is told what to fix and continues working.

This is useful for:
- **Deployment verification**: Don't stop until the build succeeds, health checks pass, and user flows work
- **Test-fix loops**: Don't stop until all tests pass
- **Service monitoring**: Don't stop until all expected services are active and healthy

## Quick Start

```bash
# Install the plugin
claude plugin install goals

# Create a new goal
# (in your project)
/goals:new deploy-verify "Verify deployment is working"

# Edit .goals/deploy-verify.yaml to customize prechecks

# Activate the goal
/goals:activate deploy-verify

# Claude will now run prechecks before stopping
# To manually stop:
/goals:stop
```

## Commands

| Command | Purpose |
|---------|---------|
| `/goals:new <name> [description]` | Create a new goal definition |
| `/goals:activate <name>` | Activate a goal's verification loop |
| `/goals:stop` | Deactivate the current goal |
| `/goals:list` | List all available goals |
| `/goals:status` | Show active goal status and precheck results |

## Goal Definitions

Goals are YAML files in `.goals/` at your project root:

```yaml
name: my-goal
description: What this goal verifies

vars:
  project: my-project

prechecks:
  - name: Health check
    command: 'curl -s http://localhost:3000/health'
    success: "ok"
    fail_message: "Health check failed: ${RESULT}"

success_phrases:
  - verification complete

instructions: |
  All prechecks passed. Now verify manually:
  1. Test user flows
  2. Check error logs
```

## Precheck Types

### `match` (default)
Compare command output to expected values:
```yaml
- name: Build status
  command: 'get-build-status'
  success: SUCCESS
  fail_on: [FAILURE, TIMEOUT]
  wait_on: [WORKING, PENDING]
```

### `expect_all_active`
Verify items from a list are present and ACTIVE:
```yaml
expected_services:
  - api-server
  - worker

prechecks:
  - name: All services running
    type: expect_all_active
    command: 'service-status --format "name state"'
    expected_list: expected_services
```

### `reject_pattern`
Block if output matches a regex:
```yaml
- name: No test failures
  type: reject_pattern
  command: 'npm test 2>&1 || true'
  reject_pattern: 'FAIL|ERROR'
```

## How It Works

1. **Activation**: `/goals:activate <name>` writes a flag file
2. **Stop Hook**: When Claude tries to stop, the hook reads the active goal's YAML
3. **Prechecks**: Each precheck command runs; first failure blocks stopping
4. **Instructions**: On first pass (all prechecks pass), shows the goal's instructions
5. **Success**: On subsequent passes, checks transcript for success phrases
6. **Safety**: Max iterations (default 10) prevents infinite loops; stuck detection allows escape

## Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `max_iterations` | 10 | Maximum verification attempts |
| `stuck_phrases` | Built-in list | Phrases that allow Claude to stop |
| `timeout` (per precheck) | 30s | Command timeout |

## Templates

The plugin includes starter templates:
- **deploy-verify** — HTTP health checks, build status, browser testing
- **test-suite** — Test command with reject_pattern, fix-and-rerun
- **monitoring-check** — expect_all_active for services, log verification

Use `/goals:new` and choose a template to get started quickly.

## Migration from Manual Setup

If you're using goals defined directly in `.claude/hooks/`:

1. Move YAML files from `.claude/hooks/goals/` to `.goals/`
2. Install this plugin: `claude plugin install goals`
3. Remove the manual Stop hook from `.claude/settings.local.json`
4. Delete `.claude/hooks/goal-loop.sh`, `goal-start.sh`, and `generate-goal-commands.sh`
5. Delete generated command files (e.g., `.claude/commands/*-goal.md`)

The YAML schema is compatible — your existing goal definitions should work without changes. The only difference is the file location (`.goals/` instead of `.claude/hooks/goals/`).
