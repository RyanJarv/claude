# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is a **Claude Code plugin marketplace** — a catalog of installable plugins that bundle commands, skills, agents, hooks, and MCP server configurations for Claude Code. Users add this marketplace and install plugins via the `/plugin` command.

This repo does **not** contain a single plugin. Each directory under `plugins/` is an independent plugin package.

## Repository Structure

```
/                                  # Marketplace root
├── CLAUDE.md                      # This file — repo-level instructions
├── .claude-plugin/
│   └── marketplace.json           # Marketplace catalog (name, owner, plugin list)
├── plugins/
│   ├── <plugin-a>/                # One plugin per directory
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json        # Plugin manifest (name, version, description)
│   │   ├── commands/              # User-invoked slash commands (Markdown files)
│   │   ├── skills/                # Agent Skills (directories with SKILL.md)
│   │   │   └── <skill-name>/
│   │   │       └── SKILL.md
│   │   ├── agents/                # Subagent definitions (Markdown files)
│   │   ├── hooks/
│   │   │   └── hooks.json         # Event handlers (PreToolUse, PostToolUse, etc.)
│   │   ├── .mcp.json              # MCP server configurations
│   │   ├── .lsp.json              # LSP server configurations
│   │   └── scripts/               # Supporting scripts referenced by hooks/skills
│   ├── <plugin-b>/
│   │   └── ...
│   └── ...
└── ...
```

## Marketplace Catalog

The marketplace catalog lives at `.claude-plugin/marketplace.json`. Required fields:

| Field     | Type   | Description                                          |
|-----------|--------|------------------------------------------------------|
| `name`    | string | Marketplace identifier (kebab-case)                  |
| `owner`   | object | Maintainer info — `name` (required), `email` (optional) |
| `plugins` | array  | List of plugin entries                                |

Each plugin entry needs at minimum `name` and `source`:

```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin",
  "description": "What this plugin does",
  "version": "1.0.0"
}
```

The `source` can be a relative path (for plugins in this repo), a GitHub repo (`{"source": "github", "repo": "owner/repo"}`), or a git URL.

**Keep `.claude-plugin/marketplace.json` in sync** whenever a plugin is added, removed, or updated.

## Key Conventions

- **Plugin naming**: Use kebab-case for directory names and the `name` field in `plugin.json`. The name is the namespace prefix for all commands (e.g., `/my-plugin:hello`).
- **Paths in hooks/MCP configs**: Always use `${CLAUDE_PLUGIN_ROOT}` — plugins are cached/copied on install, so absolute paths break.
- **Manifest**: `name` is the only required field in `plugin.json`. Use semantic versioning for `version`.
- **Skills vs Commands**: `skills/` directories contain `SKILL.md` files (model-invoked based on context). `commands/` contain plain Markdown files (user-invoked via `/name`).
- **No cross-plugin references**: Plugins are copied to a cache on install. Never reference files outside the plugin directory (e.g., `../shared-utils`).

## Development & Testing

Test a plugin locally without installing:
```bash
claude --plugin-dir ./plugins/<plugin-name>
```

Load multiple plugins simultaneously:
```bash
claude --plugin-dir ./plugins/plugin-one --plugin-dir ./plugins/plugin-two
```

Validate the marketplace:
```bash
claude plugin validate .
```

Or from within Claude Code:
```
/plugin validate .
```

## Adding & Installing

Users add this marketplace with:
```
/plugin marketplace add <github-owner>/<repo-name>
```

Then install individual plugins:
```
/plugin install <plugin-name>@<marketplace-name>
```

Update to get the latest plugins:
```
/plugin marketplace update
```
