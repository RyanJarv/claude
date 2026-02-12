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

const FLAG_FILE = 'active-goal';

export function getActiveGoal() {
  const dir = getStateDir();
  const flagPath = join(dir, FLAG_FILE);
  if (!existsSync(flagPath)) return null;

  const lines = readFileSync(flagPath, 'utf8').trim().split('\n');
  const name = lines[0] || '';
  const ownerSession = lines[1] || '';

  if (!name) {
    unlinkSync(flagPath);
    return null;
  }

  return { name, ownerSession: ownerSession || null };
}

export function setActiveGoal(name, sessionId) {
  const dir = getStateDir();
  const flagPath = join(dir, FLAG_FILE);
  let content = name;
  if (sessionId) {
    content += '\n' + sessionId;
  }
  writeFileSync(flagPath, content + '\n');
}

export function claimSession(sessionId) {
  const goal = getActiveGoal();
  if (!goal) return;
  setActiveGoal(goal.name, sessionId);
}

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

export function cleanup(sessionId) {
  const dir = getStateDir();
  const flagPath = join(dir, FLAG_FILE);
  if (existsSync(flagPath)) unlinkSync(flagPath);

  if (sessionId) {
    const iterPath = join(dir, `iterations-${sessionId}`);
    if (existsSync(iterPath)) unlinkSync(iterPath);
  }

  // Clean up any orphaned iteration files
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('iterations-')) {
        try { unlinkSync(join(dir, f)); } catch {}
      }
    }
  } catch {}
}

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
