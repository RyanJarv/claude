#!/usr/bin/env bash
set -euo pipefail

# scaffold-plugin.sh — Create a new plugin with the standard directory structure
# Usage: ./scripts/scaffold-plugin.sh <plugin-name>

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES_DIR="$REPO_ROOT/templates"
PLUGINS_DIR="$REPO_ROOT/plugins"

# --- Validation ---

if [[ $# -lt 1 ]]; then
  echo "Usage: scaffold-plugin.sh <plugin-name>"
  echo "  plugin-name: kebab-case identifier (e.g., my-awesome-plugin)"
  exit 1
fi

PLUGIN_NAME="$1"

# Validate kebab-case
if [[ ! "$PLUGIN_NAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
  echo "Error: Plugin name must be kebab-case (e.g., my-plugin)"
  echo "  - Start with a lowercase letter"
  echo "  - Use only lowercase letters, numbers, and hyphens"
  echo "  - No consecutive hyphens or trailing hyphens"
  exit 1
fi

PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"

if [[ -d "$PLUGIN_DIR" ]]; then
  echo "Error: Plugin directory already exists: $PLUGIN_DIR"
  exit 1
fi

# --- Create directory structure ---

echo "Scaffolding plugin: $PLUGIN_NAME"

mkdir -p "$PLUGIN_DIR"/{.claude-plugin,commands,skills,agents,hooks,scripts}

# --- Generate files from templates ---

DESCRIPTION="A Claude Code plugin"

# plugin.json
if [[ -f "$TEMPLATES_DIR/plugin.json" ]]; then
  sed "s/{{PLUGIN_NAME}}/$PLUGIN_NAME/g; s/{{DESCRIPTION}}/$DESCRIPTION/g" \
    "$TEMPLATES_DIR/plugin.json" > "$PLUGIN_DIR/.claude-plugin/plugin.json"
else
  cat > "$PLUGIN_DIR/.claude-plugin/plugin.json" <<EOF
{
  "name": "$PLUGIN_NAME",
  "version": "0.1.0",
  "description": "$DESCRIPTION"
}
EOF
fi

# README.md
if [[ -f "$TEMPLATES_DIR/plugin-readme.md" ]]; then
  sed "s/{{PLUGIN_NAME}}/$PLUGIN_NAME/g; s/{{DESCRIPTION}}/$DESCRIPTION/g" \
    "$TEMPLATES_DIR/plugin-readme.md" > "$PLUGIN_DIR/README.md"
else
  cat > "$PLUGIN_DIR/README.md" <<EOF
# $PLUGIN_NAME

$DESCRIPTION

## Installation

\`\`\`
/plugin install $PLUGIN_NAME@claude-plugins
\`\`\`

## Development

\`\`\`bash
claude --plugin-dir ./plugins/$PLUGIN_NAME
\`\`\`
EOF
fi

# Sample command
if [[ -f "$TEMPLATES_DIR/command.md" ]]; then
  sed "s/{{PLUGIN_NAME}}/$PLUGIN_NAME/g" \
    "$TEMPLATES_DIR/command.md" > "$PLUGIN_DIR/commands/hello.md"
else
  cat > "$PLUGIN_DIR/commands/hello.md" <<'EOF'
Respond with a friendly greeting. If the user provided arguments, incorporate them:

$ARGUMENTS
EOF
fi

# hooks.json
if [[ -f "$TEMPLATES_DIR/hooks.json" ]]; then
  cp "$TEMPLATES_DIR/hooks.json" "$PLUGIN_DIR/hooks/hooks.json"
else
  echo '{"hooks": {}}' > "$PLUGIN_DIR/hooks/hooks.json"
fi

# --- Summary ---

echo ""
echo "Created plugin at: plugins/$PLUGIN_NAME/"
echo ""
echo "  .claude-plugin/plugin.json  — Plugin manifest"
echo "  README.md                   — Plugin documentation"
echo "  commands/hello.md           — Sample command (/$(echo $PLUGIN_NAME):hello)"
echo "  hooks/hooks.json            — Hook definitions (empty)"
echo "  skills/                     — Agent skills (empty)"
echo "  agents/                     — Subagent definitions (empty)"
echo "  scripts/                    — Supporting scripts (empty)"
echo ""
echo "Next steps:"
echo "  1. Edit .claude-plugin/plugin.json with your description"
echo "  2. Add commands, skills, or hooks"
echo "  3. Test: claude --plugin-dir ./plugins/$PLUGIN_NAME"
echo "  4. Register: /register $PLUGIN_NAME"
echo "  5. Validate: /validate-plugin $PLUGIN_NAME"
