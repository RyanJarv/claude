Register a plugin in the marketplace catalog.

The user wants to register the plugin named: $ARGUMENTS

Steps:
1. Read the plugin manifest at `plugins/$ARGUMENTS/.claude-plugin/plugin.json`.
2. Read the current marketplace catalog at `.claude-plugin/marketplace.json`.
3. Check if the plugin already has an entry in the `plugins` array (match by `name`).
4. If it exists, update the existing entry. If not, add a new entry.
5. The entry should include:
   - `name`: from plugin.json
   - `source`: `"./plugins/$ARGUMENTS"`
   - `version`: from plugin.json (if present)
   - `description`: from plugin.json (if present)
6. Write the updated marketplace.json back.
7. Confirm what was added/updated.

If the plugin directory or manifest doesn't exist, tell the user to scaffold it first with `/scaffold`.
