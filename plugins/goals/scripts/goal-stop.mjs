#!/usr/bin/env node

/**
 * Deactivate the current goal.
 */

import { getActiveGoal, cleanup } from './lib/state-manager.mjs';

function main() {
  const activeGoal = getActiveGoal();

  if (!activeGoal) {
    console.log('No goal is currently active.');
    return;
  }

  const name = activeGoal.name;
  cleanup(activeGoal.ownerSession);
  console.log(`Goal '${name}' deactivated. Stop hook will no longer block.`);
}

main();
