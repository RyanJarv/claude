import { readFileSync } from 'fs';

let yaml = null;

async function getYaml() {
  if (yaml) return yaml;
  try {
    yaml = await import('js-yaml');
    return yaml;
  } catch (e) {
    throw new Error(
      'js-yaml is not installed. Run: npm install --prefix <plugin-dir>\n' +
      `Original error: ${e.message}`
    );
  }
}

/**
 * Load and parse a YAML goal file.
 * @param {string} goalPath - Path to the .yaml file
 * @returns {Promise<Object>} Parsed goal definition
 */
export async function loadGoal(goalPath) {
  const jsYaml = await getYaml();
  const content = readFileSync(goalPath, 'utf8');
  const goal = jsYaml.load(content);

  if (!goal || typeof goal !== 'object') {
    throw new Error(`Invalid goal file: ${goalPath} — expected a YAML object`);
  }

  return goal;
}

/**
 * Dump an object to YAML string.
 * @param {Object} obj
 * @returns {Promise<string>}
 */
export async function dumpYaml(obj) {
  const jsYaml = await getYaml();
  return jsYaml.dump(obj, { lineWidth: -1, noRefs: true });
}
