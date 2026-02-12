#!/usr/bin/env node

/**
 * Activate a goal by name.
 * Usage: node goal-start.mjs <goal-name>
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { readdirSync } from 'fs';
import { setActiveGoal, getGoalsDir } from './lib/state-manager.mjs';
import { loadGoal } from './lib/yaml-parser.mjs';
import { validateGoal } from './lib/schema.mjs';

async function main() {
  const goalName = process.argv[2];

  if (!goalName) {
    console.error('Error: goal name is required.');
    console.error('Usage: node goal-start.mjs <goal-name>');
    process.exit(1);
  }

  const goalsDir = getGoalsDir();
  const goalPath = join(goalsDir, `${goalName}.yaml`);

  if (!existsSync(goalPath)) {
    console.error(`Error: goal definition not found: .goals/${goalName}.yaml`);

    // List available goals
    if (existsSync(goalsDir)) {
      try {
        const files = readdirSync(goalsDir).filter(f => f.endsWith('.yaml'));
        if (files.length > 0) {
          console.error('\nAvailable goals:');
          for (const f of files) {
            console.error(`  ${f.replace('.yaml', '')}`);
          }
        } else {
          console.error('\nNo goals found in .goals/ directory.');
        }
      } catch {}
    } else {
      console.error('\nNo .goals/ directory found. Create goals with /goals:new');
    }
    process.exit(1);
  }

  // Validate the goal
  const goalDef = await loadGoal(goalPath);
  const errors = validateGoal(goalDef);
  if (errors.length > 0) {
    console.error(`Goal '${goalName}' has validation errors:`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  // Activate
  setActiveGoal(goalName);

  const precheckCount = (goalDef.prechecks || []).length;
  console.log(`Goal '${goalName}' activated.`);
  console.log(`  Prechecks: ${precheckCount}`);
  console.log(`  Max iterations: ${goalDef.max_iterations || 10}`);
  console.log(`Stop hook will now run verification before allowing stop.`);
}

main().catch((err) => {
  console.error(`Error activating goal: ${err.message}`);
  process.exit(1);
});
