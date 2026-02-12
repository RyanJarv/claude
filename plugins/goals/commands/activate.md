---
description: "Activate a goal verification loop"
allowed-tools: Bash
---

# Activate Goal

Activate a goal so the Stop hook enforces its verification prechecks.

## Arguments

Parse `$ARGUMENTS` as the goal name (kebab-case).

If `$ARGUMENTS` is empty, ask the user which goal to activate.

## Steps

1. Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/goal-start.mjs $ARGUMENTS`

2. If activation succeeds, read the goal file at `.goals/$ARGUMENTS.yaml`

3. If the goal has a `command.workflow` section, display it to the user so they know what to do.

4. Tell the user:
   - The goal is now active
   - The Stop hook will block stopping until prechecks pass
   - They can run `/goals:stop` to manually deactivate
   - They can run `/goals:status` to check precheck results
