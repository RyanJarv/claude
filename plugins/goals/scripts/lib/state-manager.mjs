import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';

function getProjectHash() {
  try {
    const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    return createHash('md5').update(root).digest('hex').slice(0, 12);
  } catch {
    // Fallback: hash cwd
    const cwd = process.cwd();
    return createHash('md5').update(cwd).digest('hex').slice(0, 12);
  }
}

function getStateDir() {
  const dir = `/tmp/claude-goals-${getProjectHash()}`;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// --- Pending goal (written by commands, consumed by hooks) ---

export function setPendingGoal(name) {
  const dir = getStateDir();
  writeFileSync(join(dir, 'pending-goal'), name + '\n');
}

export function getPendingGoal() {
  const dir = getStateDir();
  const p = join(dir, 'pending-goal');
  if (!existsSync(p)) return null;
  const name = readFileSync(p, 'utf8').trim();
  return name || null;
}

export function clearPendingGoal() {
  const dir = getStateDir();
  const p = join(dir, 'pending-goal');
  try { unlinkSync(p); } catch {}
}

// --- Session-scoped goal state ---

export function getSessionGoal(sessionId) {
  const dir = getStateDir();
  const p = join(dir, `active-goal-${sessionId}`);
  if (!existsSync(p)) return null;
  const name = readFileSync(p, 'utf8').trim();
  return name || null;
}

export function setSessionGoal(sessionId, name) {
  const dir = getStateDir();
  writeFileSync(join(dir, `active-goal-${sessionId}`), name + '\n');
}

export function clearSessionGoal(sessionId) {
  const dir = getStateDir();
  const p = join(dir, `active-goal-${sessionId}`);
  try { unlinkSync(p); } catch {}
}

/**
 * Atomically claim the pending goal for this session.
 * Returns the goal name if claimed, null otherwise.
 */
export function claimPendingGoal(sessionId) {
  const name = getPendingGoal();
  if (!name) return null;
  setSessionGoal(sessionId, name);
  clearPendingGoal();
  return name;
}

// --- Session cleanup ---

export function cleanupSession(sessionId) {
  const dir = getStateDir();
  const goalPath = join(dir, `active-goal-${sessionId}`);
  const iterPath = join(dir, `iterations-${sessionId}`);
  try { unlinkSync(goalPath); } catch {}
  try { unlinkSync(iterPath); } catch {}
}

// --- Multi-session queries ---

/**
 * Scan directory for all active goals (session-scoped + pending).
 * Returns array of { name, sessionId, pending }.
 */
export function getAllActiveGoals() {
  const dir = getStateDir();
  const results = [];

  try {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('active-goal-')) {
        const sessionId = f.slice('active-goal-'.length);
        const name = readFileSync(join(dir, f), 'utf8').trim();
        if (name) {
          results.push({ name, sessionId, pending: false });
        }
      }
    }
  } catch {}

  const pending = getPendingGoal();
  if (pending) {
    results.push({ name: pending, sessionId: null, pending: true });
  }

  return results;
}

/**
 * Delete all goal state: active-goal-*, iterations-*, pending-goal.
 */
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

// --- Iterations (unchanged, already per-session) ---

export function getIterations(sessionId) {
  const dir = getStateDir();
  const iterPath = join(dir, `iterations-${sessionId}`);
  if (!existsSync(iterPath)) return 0;
  const val = parseInt(readFileSync(iterPath, 'utf8').trim(), 10);
  return isNaN(val) ? 0 : val;
}

export function setIterations(sessionId, count) {
  const dir = getStateDir();
  const iterPath = join(dir, `iterations-${sessionId}`);
  writeFileSync(iterPath, String(count) + '\n');
}

// --- Directory helpers (unchanged) ---

export function getGoalsDir() {
  try {
    const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    return join(root, '.goals');
  } catch {
    return join(process.cwd(), '.goals');
  }
}

export function getProjectRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch {
    return process.cwd();
  }
}
