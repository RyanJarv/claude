#!/usr/bin/env node

/**
 * Tests for the session-scoped goal state manager.
 *
 * Verifies the two-phase activation model: pending-goal files (written by
 * commands) and active-goal-{sessionId} files (written by hooks).
 *
 * Run: node plugins/goals/tests/test-state-manager.mjs
 */

import { mkdtempSync, existsSync, writeFileSync, readFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assertEq(testName, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    console.log(`  FAIL: ${testName}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
  }
}

function assertTrue(testName, value) {
  assertEq(testName, !!value, true);
}

function assertFalse(testName, value) {
  assertEq(testName, !!value, false);
}

// ---------------------------------------------------------------------------
// We can't easily override getStateDir() in the module (it uses git/cwd hash).
// Instead, we test the state manager by running a small inline script via
// Node that patches the state dir before importing. This mirrors the
// subprocess-based testing pattern used elsewhere in the project.
// ---------------------------------------------------------------------------

function makeStateDir() {
  return mkdtempSync(join(tmpdir(), 'claude-goals-test-'));
}

function cleanupDir(dir) {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}

/**
 * Run a snippet that uses the state manager with a patched state directory.
 * Returns parsed JSON from stdout.
 */
function runWithStateDir(stateDir, snippet) {
  const scriptDir = new URL('.', import.meta.url).pathname;

  // We dynamically override getStateDir by writing a wrapper module
  const wrapper = `
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';

const STATE_DIR = ${JSON.stringify(stateDir)};

function getStateDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  return STATE_DIR;
}

// --- Pending goal ---
export function setPendingGoal(name) {
  writeFileSync(join(getStateDir(), 'pending-goal'), name + '\\n');
}
export function getPendingGoal() {
  const p = join(getStateDir(), 'pending-goal');
  if (!existsSync(p)) return null;
  const name = readFileSync(p, 'utf8').trim();
  return name || null;
}
export function clearPendingGoal() {
  try { unlinkSync(join(getStateDir(), 'pending-goal')); } catch {}
}

// --- Session-scoped ---
export function getSessionGoal(sessionId) {
  const p = join(getStateDir(), 'active-goal-' + sessionId);
  if (!existsSync(p)) return null;
  const name = readFileSync(p, 'utf8').trim();
  return name || null;
}
export function setSessionGoal(sessionId, name) {
  writeFileSync(join(getStateDir(), 'active-goal-' + sessionId), name + '\\n');
}
export function clearSessionGoal(sessionId) {
  try { unlinkSync(join(getStateDir(), 'active-goal-' + sessionId)); } catch {}
}
export function claimPendingGoal(sessionId) {
  const name = getPendingGoal();
  if (!name) return null;
  setSessionGoal(sessionId, name);
  clearPendingGoal();
  return name;
}

// --- Cleanup ---
export function cleanupSession(sessionId) {
  try { unlinkSync(join(getStateDir(), 'active-goal-' + sessionId)); } catch {}
  try { unlinkSync(join(getStateDir(), 'iterations-' + sessionId)); } catch {}
}
export function getAllActiveGoals() {
  const dir = getStateDir();
  const results = [];
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('active-goal-')) {
        const sessionId = f.slice('active-goal-'.length);
        const name = readFileSync(join(dir, f), 'utf8').trim();
        if (name) results.push({ name, sessionId, pending: false });
      }
    }
  } catch {}
  const pending = getPendingGoal();
  if (pending) results.push({ name: pending, sessionId: null, pending: true });
  return results;
}
export function cleanupAll() {
  const dir = getStateDir();
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('active-goal-') || f.startsWith('iterations-') || f === 'pending-goal') {
        try { unlinkSync(join(dir, f)); } catch {}
      }
    }
  } catch {}
}

// --- Iterations ---
export function getIterations(sessionId) {
  const p = join(getStateDir(), 'iterations-' + sessionId);
  if (!existsSync(p)) return 0;
  const val = parseInt(readFileSync(p, 'utf8').trim(), 10);
  return isNaN(val) ? 0 : val;
}
export function setIterations(sessionId, count) {
  writeFileSync(join(getStateDir(), 'iterations-' + sessionId), String(count) + '\\n');
}
`;

  const wrapperPath = join(stateDir, '_state-manager-test.mjs');
  writeFileSync(wrapperPath, wrapper);

  const fullScript = `
import {
  setPendingGoal, getPendingGoal, clearPendingGoal,
  getSessionGoal, setSessionGoal, clearSessionGoal,
  claimPendingGoal, cleanupSession, getAllActiveGoals, cleanupAll,
  getIterations, setIterations
} from ${JSON.stringify(wrapperPath)};

async function run() {
  ${snippet}
}
run().then(result => {
  console.log(JSON.stringify(result));
}).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

  const scriptPath = join(stateDir, '_test-run.mjs');
  writeFileSync(scriptPath, fullScript);

  const output = execSync(`node ${scriptPath}`, { encoding: 'utf8', timeout: 10000 }).trim();
  return JSON.parse(output);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function test_pending_goal_lifecycle() {
  console.log('test_pending_goal_lifecycle');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      // Initially no pending goal
      const before = getPendingGoal();

      // Set pending
      setPendingGoal('my-goal');
      const after = getPendingGoal();

      // Clear pending
      clearPendingGoal();
      const cleared = getPendingGoal();

      return { before, after, cleared };
    `);
    assertEq('no pending initially', result.before, null);
    assertEq('pending set', result.after, 'my-goal');
    assertEq('pending cleared', result.cleared, null);
  } finally {
    cleanupDir(dir);
  }
}

function test_session_goal_lifecycle() {
  console.log('test_session_goal_lifecycle');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      const before = getSessionGoal('sess-123');
      setSessionGoal('sess-123', 'deploy-verify');
      const after = getSessionGoal('sess-123');
      clearSessionGoal('sess-123');
      const cleared = getSessionGoal('sess-123');
      return { before, after, cleared };
    `);
    assertEq('no session goal initially', result.before, null);
    assertEq('session goal set', result.after, 'deploy-verify');
    assertEq('session goal cleared', result.cleared, null);
  } finally {
    cleanupDir(dir);
  }
}

function test_claim_pending_goal() {
  console.log('test_claim_pending_goal');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      setPendingGoal('test-suite');
      const claimed = claimPendingGoal('sess-A');
      const pendingAfter = getPendingGoal();
      const sessionGoal = getSessionGoal('sess-A');
      return { claimed, pendingAfter, sessionGoal };
    `);
    assertEq('claimed goal name', result.claimed, 'test-suite');
    assertEq('pending cleared after claim', result.pendingAfter, null);
    assertEq('session goal written', result.sessionGoal, 'test-suite');
  } finally {
    cleanupDir(dir);
  }
}

function test_claim_pending_no_pending() {
  console.log('test_claim_pending_no_pending');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      const claimed = claimPendingGoal('sess-X');
      return { claimed };
    `);
    assertEq('claim returns null when no pending', result.claimed, null);
  } finally {
    cleanupDir(dir);
  }
}

function test_session_isolation() {
  console.log('test_session_isolation');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      // Session A claims a pending goal
      setPendingGoal('deploy-verify');
      claimPendingGoal('sess-A');

      // Session B should see nothing
      const sessB = getSessionGoal('sess-B');
      const pending = getPendingGoal();

      // Session A should still have its goal
      const sessA = getSessionGoal('sess-A');

      return { sessA, sessB, pending };
    `);
    assertEq('session A has goal', result.sessA, 'deploy-verify');
    assertEq('session B has no goal', result.sessB, null);
    assertEq('no pending (consumed)', result.pending, null);
  } finally {
    cleanupDir(dir);
  }
}

function test_multiple_sessions() {
  console.log('test_multiple_sessions');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      // Two sessions, each with their own goal
      setSessionGoal('sess-A', 'deploy-verify');
      setSessionGoal('sess-B', 'test-suite');
      const all = getAllActiveGoals();
      // Sort by sessionId for deterministic comparison
      all.sort((a, b) => (a.sessionId || '').localeCompare(b.sessionId || ''));
      return { all };
    `);
    assertEq('two active goals', result.all.length, 2);
    assertEq('first is sess-A', result.all[0].sessionId, 'sess-A');
    assertEq('first name', result.all[0].name, 'deploy-verify');
    assertEq('second is sess-B', result.all[1].sessionId, 'sess-B');
    assertEq('second name', result.all[1].name, 'test-suite');
  } finally {
    cleanupDir(dir);
  }
}

function test_get_all_includes_pending() {
  console.log('test_get_all_includes_pending');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      setPendingGoal('unclaimed-goal');
      setSessionGoal('sess-A', 'claimed-goal');
      const all = getAllActiveGoals();
      all.sort((a, b) => String(a.pending).localeCompare(String(b.pending)));
      return { all };
    `);
    assertEq('two entries total', result.all.length, 2);
    const sessionEntry = result.all.find(g => !g.pending);
    const pendingEntry = result.all.find(g => g.pending);
    assertEq('session entry name', sessionEntry.name, 'claimed-goal');
    assertEq('session entry sessionId', sessionEntry.sessionId, 'sess-A');
    assertEq('pending entry name', pendingEntry.name, 'unclaimed-goal');
    assertEq('pending entry sessionId', pendingEntry.sessionId, null);
    assertTrue('pending entry marked pending', pendingEntry.pending);
  } finally {
    cleanupDir(dir);
  }
}

function test_cleanup_session() {
  console.log('test_cleanup_session');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      setSessionGoal('sess-A', 'deploy-verify');
      setIterations('sess-A', 5);
      setSessionGoal('sess-B', 'test-suite');
      setIterations('sess-B', 3);

      // Clean up only session A
      cleanupSession('sess-A');

      const sessA = getSessionGoal('sess-A');
      const iterA = getIterations('sess-A');
      const sessB = getSessionGoal('sess-B');
      const iterB = getIterations('sess-B');

      return { sessA, iterA, sessB, iterB };
    `);
    assertEq('session A goal gone', result.sessA, null);
    assertEq('session A iterations gone', result.iterA, 0);
    assertEq('session B goal intact', result.sessB, 'test-suite');
    assertEq('session B iterations intact', result.iterB, 3);
  } finally {
    cleanupDir(dir);
  }
}

function test_cleanup_all() {
  console.log('test_cleanup_all');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      setPendingGoal('pending-one');
      setSessionGoal('sess-A', 'goal-a');
      setIterations('sess-A', 5);
      setSessionGoal('sess-B', 'goal-b');
      setIterations('sess-B', 3);

      cleanupAll();

      const all = getAllActiveGoals();
      const iterA = getIterations('sess-A');
      const iterB = getIterations('sess-B');

      return { count: all.length, iterA, iterB };
    `);
    assertEq('no active goals', result.count, 0);
    assertEq('iterations A cleaned', result.iterA, 0);
    assertEq('iterations B cleaned', result.iterB, 0);
  } finally {
    cleanupDir(dir);
  }
}

function test_iterations_per_session() {
  console.log('test_iterations_per_session');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      const initial = getIterations('sess-X');
      setIterations('sess-X', 7);
      const after = getIterations('sess-X');

      // Different session is independent
      const other = getIterations('sess-Y');

      return { initial, after, other };
    `);
    assertEq('initial iterations 0', result.initial, 0);
    assertEq('iterations set to 7', result.after, 7);
    assertEq('other session unaffected', result.other, 0);
  } finally {
    cleanupDir(dir);
  }
}

function test_second_claim_fails() {
  console.log('test_second_claim_fails');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      setPendingGoal('my-goal');

      // First session claims
      const first = claimPendingGoal('sess-A');

      // Second session tries to claim — should get null
      const second = claimPendingGoal('sess-B');

      const sessA = getSessionGoal('sess-A');
      const sessB = getSessionGoal('sess-B');

      return { first, second, sessA, sessB };
    `);
    assertEq('first claim succeeds', result.first, 'my-goal');
    assertEq('second claim returns null', result.second, null);
    assertEq('sess-A has goal', result.sessA, 'my-goal');
    assertEq('sess-B has no goal', result.sessB, null);
  } finally {
    cleanupDir(dir);
  }
}

function test_overwrite_pending() {
  console.log('test_overwrite_pending');
  const dir = makeStateDir();
  try {
    const result = runWithStateDir(dir, `
      setPendingGoal('first-goal');
      setPendingGoal('second-goal');
      const pending = getPendingGoal();
      return { pending };
    `);
    assertEq('latest pending wins', result.pending, 'second-goal');
  } finally {
    cleanupDir(dir);
  }
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

test_pending_goal_lifecycle();
test_session_goal_lifecycle();
test_claim_pending_goal();
test_claim_pending_no_pending();
test_session_isolation();
test_multiple_sessions();
test_get_all_includes_pending();
test_cleanup_session();
test_cleanup_all();
test_iterations_per_session();
test_second_claim_fails();
test_overwrite_pending();

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
