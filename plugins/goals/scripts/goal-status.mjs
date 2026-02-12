#!/usr/bin/env node

/**
 * Show status of the active goal, including precheck results.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getActiveGoal, getIterations, getGoalsDir } from './lib/state-manager.mjs';
import { loadGoal } from './lib/yaml-parser.mjs';
import { runPrecheck } from './lib/precheck-runner.mjs';

async function main() {
  const activeGoal = getActiveGoal();

  if (!activeGoal) {
    console.log('No goal is currently active.');
    return;
  }

  console.log(`Active goal: ${activeGoal.name}`);
  if (activeGoal.ownerSession) {
    console.log(`Session: ${activeGoal.ownerSession}`);
    const iterations = getIterations(activeGoal.ownerSession);
    console.log(`Iterations: ${iterations}`);
  }

  const goalsDir = getGoalsDir();
  const goalPath = join(goalsDir, `${activeGoal.name}.yaml`);

  if (!existsSync(goalPath)) {
    console.log(`\nWarning: Goal definition not found at .goals/${activeGoal.name}.yaml`);
    return;
  }

  const goalDef = await loadGoal(goalPath);
  const maxIterations = goalDef.max_iterations || 10;
  console.log(`Max iterations: ${maxIterations}`);

  if (goalDef.description) {
    console.log(`Description: ${goalDef.description}`);
  }

  const prechecks = goalDef.prechecks || [];
  if (prechecks.length === 0) {
    console.log('\nNo prechecks defined.');
    return;
  }

  console.log(`\nPrecheck status (${prechecks.length} checks):\n`);

  const goalVars = goalDef.vars || {};
  let runtimeVars = {
    RESULT: '',
    MISSING: '',
    INACTIVE: '',
    EXTRA: '',
    EXPECTED_COUNT: '',
    DEPLOYED_COUNT: '',
    ITERATIONS: activeGoal.ownerSession ? getIterations(activeGoal.ownerSession) : 0,
    MAX_ITERATIONS: maxIterations,
  };

  let allPassed = true;

  for (let i = 0; i < prechecks.length; i++) {
    const check = prechecks[i];
    const type = check.type || 'match';

    try {
      const result = runPrecheck(check, goalDef, goalVars, runtimeVars);
      runtimeVars = result.runtimeVars;

      if (result.blocked) {
        console.log(`  [FAIL] ${check.name} (${type})`);
        console.log(`         ${result.message}`);
        allPassed = false;
      } else {
        console.log(`  [PASS] ${check.name} (${type})`);
      }
    } catch (err) {
      console.log(`  [ERROR] ${check.name} (${type}): ${err.message}`);
      allPassed = false;
    }
  }

  console.log('');
  if (allPassed) {
    console.log('All prechecks passing.');
  } else {
    console.log('Some prechecks failing — goal loop will block stop.');
  }
}

main().catch((err) => {
  console.error(`Error checking status: ${err.message}`);
  process.exit(1);
});
