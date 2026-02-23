#!/usr/bin/env node

/**
 * Goal engine — Stop hook entry point.
 *
 * Reads hook context from stdin, evaluates the active goal's prechecks,
 * and outputs a JSON decision: {"decision": "block"|"approve", "reason": "..."}
 *
 * On any error, approves to never trap the user.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getSessionGoal, claimPendingGoal, getIterations, setIterations, cleanupSession, getGoalsDir } from './lib/state-manager.mjs';
import { loadGoal } from './lib/yaml-parser.mjs';
import { validateGoal } from './lib/schema.mjs';
import { runPrecheck } from './lib/precheck-runner.mjs';
import { expandVars } from './lib/variable-expander.mjs';

function approve(reason) {
  console.log(JSON.stringify({ decision: 'approve', reason }));
}

function block(reason) {
  console.log(JSON.stringify({ decision: 'block', reason }));
}

async function main() {
  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let context;
  try {
    context = JSON.parse(input);
  } catch {
    context = {};
  }

  const sessionId = context.session_id || '';
  const stopHookActive = context.stop_hook_active ?? false;
  const transcriptSummary = context.transcript_summary || '';

  // Check if this session already has an active goal
  let goalName = getSessionGoal(sessionId);

  // If not, try to claim the pending goal
  if (!goalName) {
    goalName = claimPendingGoal(sessionId);
  }

  // No goal for this session — exit silently
  if (!goalName) {
    process.exit(0);
  }

  // Find goal YAML
  const goalsDir = getGoalsDir();
  const goalPath = join(goalsDir, `${goalName}.yaml`);

  if (!existsSync(goalPath)) {
    approve('Goal definition not found. Allowing stop.');
    cleanupSession(sessionId);
    return;
  }

  // Iteration counting
  let iterations = getIterations(sessionId);
  if (stopHookActive === false) {
    iterations = 0;
  }
  iterations++;
  setIterations(sessionId, iterations);

  // Load goal
  const goalDef = await loadGoal(goalPath);
  const maxIterations = goalDef.max_iterations || 10;

  // Over iteration limit?
  if (iterations > maxIterations) {
    approve(`Reached iteration limit (${maxIterations}). Allowing stop to prevent infinite loop.`);
    cleanupSession(sessionId);
    return;
  }

  // Stuck detection
  const defaultStuckPhrases = [
    'I am stuck',
    "I'm stuck",
    'no clear path forward',
    'I cannot proceed',
    "I'm giving up",
    'I am giving up',
    'stopping the goal',
    'goal should stop',
  ];
  const stuckPhrases = goalDef.stuck_phrases || defaultStuckPhrases;

  const lowerTranscript = transcriptSummary.toLowerCase();
  for (const phrase of stuckPhrases) {
    if (lowerTranscript.includes(phrase.toLowerCase())) {
      approve('Claude indicated being stuck or explicitly requested to stop.');
      cleanupSession(sessionId);
      return;
    }
  }

  // Run prechecks
  const prechecks = goalDef.prechecks || [];
  const goalVars = goalDef.vars || {};
  let runtimeVars = {
    RESULT: '',
    MISSING: '',
    INACTIVE: '',
    EXTRA: '',
    EXPECTED_COUNT: '',
    DEPLOYED_COUNT: '',
    ITERATIONS: iterations,
    MAX_ITERATIONS: maxIterations,
  };

  for (const check of prechecks) {
    const result = runPrecheck(check, goalDef, goalVars, runtimeVars);
    runtimeVars = result.runtimeVars;

    if (result.blocked) {
      block(result.message);
      return;
    }
  }

  // All prechecks passed

  // First pass (stop_hook_active=false): show instructions
  if (stopHookActive === false) {
    const instructions = goalDef.instructions || '';
    if (instructions) {
      const expanded = expandVars(instructions, goalVars, runtimeVars);
      block(`${expanded.trim()} Iteration ${iterations}/${maxIterations}.`);
      return;
    }
  }

  // Subsequent passes: check transcript for success phrases
  const successPhrases = goalDef.success_phrases || [];
  if (successPhrases.length > 0) {
    for (const phrase of successPhrases) {
      if (lowerTranscript.includes(phrase.toLowerCase())) {
        approve('Verification appears complete.');
        cleanupSession(sessionId);
        return;
      }
    }
  }

  // Default: allow after verification phase
  approve('Verification phase complete.');
  cleanupSession(sessionId);
}

main().catch((err) => {
  // On any error, approve to never trap the user
  console.log(JSON.stringify({
    decision: 'approve',
    reason: `Goal engine error: ${err.message}. Allowing stop.`,
  }));
});
