Scaffold a new plugin in this marketplace.

The user wants to create a new plugin named: $ARGUMENTS

Steps:
1. Run the scaffold script to create the plugin directory structure:
   ```bash
   bash scripts/scaffold-plugin.sh $ARGUMENTS
   ```
2. Show the user what was created and suggest next steps.
3. If the script fails (e.g., invalid name, directory exists), explain the error and how to fix it.
