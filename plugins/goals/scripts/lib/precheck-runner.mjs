import { execSync } from 'child_process';
import { expandVars } from './variable-expander.mjs';

/**
 * Execute a shell command, returning stdout. Non-zero exit returns empty string.
 */
function execCommand(cmd, timeoutSec = 30) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      timeout: timeoutSec * 1000,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    }).trim();
  } catch (err) {
    const out = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    return out.trim() || '';
  }
}

/**
 * Run a single precheck.
 *
 * @param {Object} check - The precheck definition from the YAML
 * @param {Object} goalDef - The full goal definition (for resolving expected_list references)
 * @param {Object} goalVars - Variables from the goal's vars: section
 * @param {Object} runtimeVars - Mutable runtime vars (ITERATIONS, MAX_ITERATIONS, etc.)
 * @returns {{ blocked: boolean, message: string|null, runtimeVars: Object }}
 */
export function runPrecheck(check, goalDef, goalVars, runtimeVars) {
  const type = check.type || 'match';
  const timeoutSec = check.timeout || 30;

  // Expand vars in the command
  const expandedCmd = expandVars(check.command, goalVars, runtimeVars);

  const iterSuffix = ` Iteration ${runtimeVars.ITERATIONS}/${runtimeVars.MAX_ITERATIONS}.`;

  switch (type) {
    case 'match':
      return runMatchCheck(check, expandedCmd, goalDef, goalVars, runtimeVars, timeoutSec, iterSuffix);
    case 'expect_all_active':
      return runExpectAllActiveCheck(check, expandedCmd, goalDef, goalVars, runtimeVars, timeoutSec, iterSuffix);
    case 'reject_pattern':
      return runRejectPatternCheck(check, expandedCmd, goalDef, goalVars, runtimeVars, timeoutSec, iterSuffix);
    default:
      return { blocked: false, message: null, runtimeVars };
  }
}

function runMatchCheck(check, expandedCmd, goalDef, goalVars, runtimeVars, timeoutSec, iterSuffix) {
  const result = execCommand(expandedCmd, timeoutSec);
  runtimeVars = { ...runtimeVars, RESULT: result };

  // Empty result = failure
  if (!result) {
    const defaultMsg = `Check '${check.name}' returned empty output.`;
    let msg = check.fail_message || defaultMsg;
    msg = expandVars(msg, goalVars, runtimeVars);
    return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
  }

  // Check success value
  const successVal = check.success || '';
  if (successVal && result === successVal) {
    // Also check reject_pattern even on success match
    const reject = check.reject_pattern || '';
    if (reject) {
      try {
        if (new RegExp(reject).test(result)) {
          const defaultMsg = `Check '${check.name}' matched reject pattern.`;
          let msg = check.fail_message || defaultMsg;
          msg = expandVars(msg, goalVars, runtimeVars);
          return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
        }
      } catch {}
    }
    // Check passed
    return { blocked: false, message: null, runtimeVars };
  }

  // Check wait_on values
  const waitOn = check.wait_on || [];
  for (const waitVal of waitOn) {
    if (result === waitVal) {
      const defaultMsg = `Check '${check.name}' returned ${result}. Waiting.`;
      let msg = check.wait_message || defaultMsg;
      msg = expandVars(msg, goalVars, runtimeVars);
      return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
    }
  }

  // Check fail_on values
  const failOn = check.fail_on || [];
  for (const failVal of failOn) {
    if (result === failVal) {
      const defaultMsg = `Check '${check.name}' failed with value: ${result}.`;
      let msg = check.fail_message || defaultMsg;
      msg = expandVars(msg, goalVars, runtimeVars);
      return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
    }
  }

  // If success was specified and result didn't match, it's a failure
  if (successVal) {
    const defaultMsg = `Check '${check.name}' expected '${successVal}' but got '${result}'.`;
    let msg = check.fail_message || defaultMsg;
    msg = expandVars(msg, goalVars, runtimeVars);
    return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
  }

  // No success value specified — check reject_pattern
  const reject = check.reject_pattern || '';
  if (reject) {
    try {
      if (new RegExp(reject).test(result)) {
        const defaultMsg = `Check '${check.name}' matched reject pattern.`;
        let msg = check.fail_message || defaultMsg;
        msg = expandVars(msg, goalVars, runtimeVars);
        return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
      }
    } catch {}
  }

  // Passed (no success specified, no reject matched)
  return { blocked: false, message: null, runtimeVars };
}

function runExpectAllActiveCheck(check, expandedCmd, goalDef, goalVars, runtimeVars, timeoutSec, iterSuffix) {
  const listName = check.expected_list;
  const expectedItems = goalDef[listName] || [];
  const expectedCount = expectedItems.length;
  runtimeVars = { ...runtimeVars, EXPECTED_COUNT: expectedCount };

  const activeOutput = execCommand(expandedCmd, timeoutSec);

  if (!activeOutput) {
    const msg = `Could not retrieve data for check '${check.name}' (command returned empty). Iteration ${runtimeVars.ITERATIONS}/${runtimeVars.MAX_ITERATIONS}.`;
    return { blocked: true, message: msg, runtimeVars };
  }

  // Parse "name state" lines
  const lines = activeOutput.split('\n').filter(l => l.trim());

  let missing = [];
  let inactive = [];

  for (const item of expectedItems) {
    const line = lines.find(l => l.startsWith(item));
    if (!line) {
      missing.push(item);
    } else {
      const parts = line.trim().split(/\s+/);
      const state = parts[1] || '';
      if (state !== 'ACTIVE') {
        inactive.push(`${item}(${state})`);
      }
    }
  }

  runtimeVars = {
    ...runtimeVars,
    MISSING: missing.join(', '),
    INACTIVE: inactive.join(', '),
  };

  if (missing.length > 0) {
    const defaultMsg = `Missing items: ${missing.join(', ')}`;
    let msg = check.fail_message || defaultMsg;
    msg = expandVars(msg, goalVars, runtimeVars);
    return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
  }

  if (inactive.length > 0) {
    const defaultMsg = `Items not ACTIVE: ${inactive.join(', ')}`;
    let msg = check.inactive_message || defaultMsg;
    msg = expandVars(msg, goalVars, runtimeVars);
    return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
  }

  // Check for unexpected extra items
  const deployedCount = lines.length;
  runtimeVars = { ...runtimeVars, DEPLOYED_COUNT: deployedCount };

  if (deployedCount > expectedCount) {
    const deployedNames = lines.map(l => l.trim().split(/\s+/)[0]);
    const extra = deployedNames.filter(n => !expectedItems.includes(n));
    runtimeVars = { ...runtimeVars, EXTRA: extra.join(', ') };

    const extraMsg = check.extra_message || '';
    if (extraMsg) {
      let msg = expandVars(extraMsg, goalVars, runtimeVars);
      return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
    }
  }

  // All expected items are active
  return { blocked: false, message: null, runtimeVars };
}

function runRejectPatternCheck(check, expandedCmd, goalDef, goalVars, runtimeVars, timeoutSec, iterSuffix) {
  const result = execCommand(expandedCmd, timeoutSec);
  runtimeVars = { ...runtimeVars, RESULT: result };

  const pattern = check.reject_pattern || '';
  if (pattern) {
    try {
      if (new RegExp(pattern).test(result)) {
        const defaultMsg = `Check '${check.name}' matched reject pattern.`;
        let msg = check.fail_message || defaultMsg;
        msg = expandVars(msg, goalVars, runtimeVars);
        return { blocked: true, message: msg.trim() + iterSuffix, runtimeVars };
      }
    } catch {}
  }

  return { blocked: false, message: null, runtimeVars };
}
