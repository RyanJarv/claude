Validate a plugin against quality standards.

The user wants to validate the plugin named: $ARGUMENTS

Run through these checks and report pass/fail for each:

1. **Manifest exists**: `plugins/$ARGUMENTS/.claude-plugin/plugin.json` exists
2. **Name field**: plugin.json has a `name` field that matches the directory name
3. **README exists**: `plugins/$ARGUMENTS/README.md` exists
4. **No hardcoded paths**: No absolute paths (starting with `/`) in hooks/hooks.json or .mcp.json — should use `${CLAUDE_PLUGIN_ROOT}` instead
5. **Scripts executable**: All `.sh` files in `plugins/$ARGUMENTS/scripts/` are executable
6. **Valid JSON**: All JSON files (plugin.json, hooks.json, .mcp.json, .lsp.json) are valid JSON
7. **Version format**: If version is specified in plugin.json, it follows semver (X.Y.Z)
8. **Plugin name format**: Plugin name is kebab-case

For each check:
- Show a checkmark or X with the check name and result
- If a check fails, explain what needs to be fixed
- At the end, show a summary: X/Y checks passed

Skip checks for files that don't exist (e.g., don't fail on hooks.json check if there's no hooks.json — that's optional).
