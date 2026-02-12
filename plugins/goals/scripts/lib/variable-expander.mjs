/**
 * Expand ${var} references in a string.
 *
 * @param {string} text - The template string
 * @param {Object} goalVars - Variables from the goal's vars: section
 * @param {Object} runtimeVars - Runtime variables (RESULT, MISSING, INACTIVE, EXTRA, etc.)
 * @returns {string} Expanded text
 */
export function expandVars(text, goalVars = {}, runtimeVars = {}) {
  if (!text) return text;

  let result = text;

  // Expand goal vars first
  for (const [key, value] of Object.entries(goalVars)) {
    result = result.replaceAll(`\${${key}}`, String(value));
  }

  // Expand runtime vars
  const runtimeKeys = [
    'RESULT', 'MISSING', 'INACTIVE', 'EXTRA',
    'EXPECTED_COUNT', 'DEPLOYED_COUNT',
    'ITERATIONS', 'MAX_ITERATIONS'
  ];

  for (const key of runtimeKeys) {
    if (key in runtimeVars) {
      result = result.replaceAll(`\${${key}}`, String(runtimeVars[key]));
    }
  }

  return result;
}
