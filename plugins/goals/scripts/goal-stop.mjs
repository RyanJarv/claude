#!/usr/bin/env node

/**
 * Deactivate the current goal.
 * Since commands don't receive session IDs, this cleans up ALL goal state
 * (pending + all session-scoped files). This is appropriate because it's
 * an explicit user action.
 */

import { getAllActiveGoals, cleanupAll } from './lib/state-manager.mjs';

function main() {
  const activeGoals = getAllActiveGoals();

  if (activeGoals.length === 0) {
    console.log('No goal is currently active.');
    return;
  }

  const names = [...new Set(activeGoals.map(g => g.name))];
  cleanupAll();
  console.log(`Goal '${names.join(', ')}' deactivated. Stop hook will no longer block.`);
}

main();
