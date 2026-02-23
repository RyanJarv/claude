import { readFileSync } from 'fs';
import { load, dump } from '../vendor/js-yaml.mjs';

/**
 * Load and parse a YAML goal file.
 * @param {string} goalPath - Path to the .yaml file
 * @returns {Object} Parsed goal definition
 */
export function loadGoal(goalPath) {
  const content = readFileSync(goalPath, 'utf8');
  const goal = load(content);

  if (!goal || typeof goal !== 'object') {
    throw new Error(`Invalid goal file: ${goalPath} — expected a YAML object`);
  }

  return goal;
}

/**
 * Dump an object to YAML string.
 * @param {Object} obj
 * @returns {string}
 */
export function dumpYaml(obj) {
  return dump(obj, { lineWidth: -1, noRefs: true });
}
