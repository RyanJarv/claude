---
description: "Create a new goal definition"
allowed-tools: Bash, Read, Write, Glob
---

# New Goal

Create a new goal definition in `.goals/`.

## Arguments

Parse `$ARGUMENTS` as: `<goal-name> [description]`

If `$ARGUMENTS` is empty, ask the user for:
1. A short goal name (lowercase, hyphenated, e.g. `deploy-prod`, `run-tests`)
2. A description of what the goal should verify before allowing Claude to stop

## Steps

1. Create the `.goals/` directory at the project root if it doesn't exist:
   ```bash
   mkdir -p .goals
   ```

2. Check if `.goals/<goal-name>.yaml` already exists. If so, ask before overwriting.

3. Offer the user a starting template. Available templates are in `${CLAUDE_PLUGIN_ROOT}/scripts/templates/`:
   - **deploy-verify** — HTTP health checks, build status, browser testing flow
   - **test-suite** — Test command with reject_pattern, fix-and-rerun flow
   - **monitoring-check** — expect_all_active for services, log verification flow
   - **blank** — Start from scratch with minimal scaffolding

4. If the user chooses a template, read it from `${CLAUDE_PLUGIN_ROOT}/scripts/templates/<template>.yaml` and use it as a starting point, customizing the `name` and `description` fields.

5. If the user chooses blank (or doesn't choose), generate a minimal goal file:

```yaml
name: <goal-name>
description: <description>

vars: {}

prechecks:
  - name: Example check
    command: 'echo "ok"'
    success: "ok"
    fail_message: "Check failed: ${RESULT}"

success_phrases:
  - verification complete

instructions: |
  All prechecks passed. Now:
  1. ...
  2. ...

command:
  title: <Goal Title>
  summary: <description>
  workflow: |
    ### Step 1
    ...
```

6. Write the goal file to `.goals/<goal-name>.yaml`

7. Report what was created and suggest next steps:
   - Edit `.goals/<goal-name>.yaml` to customize prechecks and instructions
   - Run `/goals:activate <goal-name>` to start the verification loop
   - Run `/goals:list` to see all available goals

## Goal YAML Reference

For reference when helping the user customize their goal:

**Precheck types:**
- `match` (default) — compare command output to `success`/`fail_on`/`wait_on` values
- `expect_all_active` — verify items from a named list exist and are ACTIVE
- `reject_pattern` — block if command output matches a regex

**Available message variables:** `${RESULT}`, `${MISSING}`, `${INACTIVE}`, `${EXTRA}`, `${EXPECTED_COUNT}`, `${DEPLOYED_COUNT}`, `${ITERATIONS}`, `${MAX_ITERATIONS}`

**Top-level fields:** `name`, `description`, `vars`, `max_iterations` (default 10), `stuck_phrases`, `prechecks`, `success_phrases`, `instructions`, `command`
