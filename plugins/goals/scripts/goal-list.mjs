#!/usr/bin/env node

/**
 * List all available goals and show currently active ones.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getAllActiveGoals, getGoalsDir } from './lib/state-manager.mjs';
import { loadGoal } from './lib/yaml-parser.mjs';

async function main() {
  const goalsDir = getGoalsDir();
  const activeGoals = getAllActiveGoals();
  const activeNames = new Set(activeGoals.map(g => g.name));

  if (!existsSync(goalsDir)) {
    console.log('No .goals/ directory found. Create goals with /goals:new');
    return;
  }

  const files = readdirSync(goalsDir).filter(f => f.endsWith('.yaml')).sort();

  if (files.length === 0) {
    console.log('No goals found in .goals/ directory. Create one with /goals:new');
    return;
  }

  console.log('Available goals:\n');

  for (const file of files) {
    const name = file.replace('.yaml', '');
    const isActive = activeNames.has(name);
    const marker = isActive ? ' [ACTIVE]' : '';

    try {
      const goalDef = await loadGoal(join(goalsDir, file));
      const description = goalDef.description || '(no description)';
      const precheckCount = (goalDef.prechecks || []).length;
      console.log(`  ${name}${marker}`);
      console.log(`    ${description}`);
      console.log(`    Prechecks: ${precheckCount} | Max iterations: ${goalDef.max_iterations || 10}`);
      console.log('');
    } catch (err) {
      console.log(`  ${name}${marker}`);
      console.log(`    (error loading: ${err.message})`);
      console.log('');
    }
  }

  if (activeGoals.length > 0) {
    console.log('Currently active:');
    for (const goal of activeGoals) {
      if (goal.pending) {
        console.log(`  ${goal.name} (pending — not yet claimed by a session)`);
      } else {
        console.log(`  ${goal.name} (session: ${goal.sessionId})`);
      }
    }
  }
}

main().catch((err) => {
  console.error(`Error listing goals: ${err.message}`);
  process.exit(1);
});
