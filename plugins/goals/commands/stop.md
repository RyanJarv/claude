---
description: "Stop the active goal verification loop"
allowed-tools: Bash
---

# Stop Goal

Manually deactivate the current goal loop.

Run this command:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/goal-stop.mjs
```

The goal loop has been stopped. The Stop hook will no longer prevent Claude from finishing responses.
