#!/usr/bin/env node

/**
 * List all available goals and show the currently active one.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getActiveGoal, getGoalsDir } from './lib/state-manager.mjs';
import { loadGoal } from './lib/yaml-parser.mjs';

async function main() {
  const goalsDir = getGoalsDir();
  const activeGoal = getActiveGoal();

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
    const isActive = activeGoal && activeGoal.name === name;
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

  if (activeGoal) {
    console.log(`Currently active: ${activeGoal.name}`);
    if (activeGoal.ownerSession) {
      console.log(`  Session: ${activeGoal.ownerSession}`);
    }
  }
}

main().catch((err) => {
  console.error(`Error listing goals: ${err.message}`);
  process.exit(1);
});
