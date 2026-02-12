const VALID_PRECHECK_TYPES = ['match', 'expect_all_active', 'reject_pattern'];

/**
 * Validate a parsed goal definition.
 * @param {Object} goal - Parsed goal object
 * @returns {string[]} Array of validation errors (empty if valid)
 */
export function validateGoal(goal) {
  const errors = [];

  if (!goal || typeof goal !== 'object') {
    return ['Goal must be a YAML object'];
  }

  // Required: name
  if (!goal.name || typeof goal.name !== 'string') {
    errors.push('Missing required field: name (must be a string)');
  }

  // Optional: description (string)
  if (goal.description !== undefined && typeof goal.description !== 'string') {
    errors.push('Field "description" must be a string');
  }

  // Optional: vars (object)
  if (goal.vars !== undefined && (typeof goal.vars !== 'object' || Array.isArray(goal.vars))) {
    errors.push('Field "vars" must be an object mapping variable names to values');
  }

  // Optional: max_iterations (positive integer)
  if (goal.max_iterations !== undefined) {
    if (typeof goal.max_iterations !== 'number' || !Number.isInteger(goal.max_iterations) || goal.max_iterations < 1) {
      errors.push('Field "max_iterations" must be a positive integer');
    }
  }

  // Optional: stuck_phrases (array of strings)
  if (goal.stuck_phrases !== undefined) {
    if (!Array.isArray(goal.stuck_phrases)) {
      errors.push('Field "stuck_phrases" must be an array of strings');
    } else {
      for (let i = 0; i < goal.stuck_phrases.length; i++) {
        if (typeof goal.stuck_phrases[i] !== 'string') {
          errors.push(`stuck_phrases[${i}] must be a string`);
        }
      }
    }
  }

  // Optional: prechecks (array)
  if (goal.prechecks !== undefined) {
    if (!Array.isArray(goal.prechecks)) {
      errors.push('Field "prechecks" must be an array');
    } else {
      for (let i = 0; i < goal.prechecks.length; i++) {
        const check = goal.prechecks[i];
        if (!check || typeof check !== 'object') {
          errors.push(`prechecks[${i}] must be an object`);
          continue;
        }

        if (!check.name || typeof check.name !== 'string') {
          errors.push(`prechecks[${i}]: missing required field "name"`);
        }

        if (!check.command || typeof check.command !== 'string') {
          errors.push(`prechecks[${i}]: missing required field "command"`);
        }

        const type = check.type || 'match';
        if (!VALID_PRECHECK_TYPES.includes(type)) {
          errors.push(`prechecks[${i}]: invalid type "${type}". Must be one of: ${VALID_PRECHECK_TYPES.join(', ')}`);
        }

        if (type === 'expect_all_active' && !check.expected_list) {
          errors.push(`prechecks[${i}]: type "expect_all_active" requires "expected_list" field`);
        }

        // Optional: timeout (positive number)
        if (check.timeout !== undefined) {
          if (typeof check.timeout !== 'number' || check.timeout <= 0) {
            errors.push(`prechecks[${i}]: "timeout" must be a positive number`);
          }
        }
      }
    }
  }

  // Optional: success_phrases (array of strings)
  if (goal.success_phrases !== undefined) {
    if (!Array.isArray(goal.success_phrases)) {
      errors.push('Field "success_phrases" must be an array of strings');
    }
  }

  // Optional: instructions (string)
  if (goal.instructions !== undefined && typeof goal.instructions !== 'string') {
    errors.push('Field "instructions" must be a string');
  }

  return errors;
}
