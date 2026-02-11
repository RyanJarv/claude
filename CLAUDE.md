# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is a Claude Code plugin marketplace — a central place to develop, test, and distribute custom Claude Code commands, skills, agents, hooks, and MCP server configurations. Plugins developed here can be installed across different projects using the `/plugin` command.

## Plugin Architecture

Each plugin lives in its own directory at the repo root and follows the Claude Code plugin structure:

```
<plugin-name>/
├── .claude-plugin/
│   └── plugin.json           # Manifest (name, version, description, author)
├── commands/                 # User-invoked slash commands (Markdown files)
├── skills/                   # Agent Skills (directories with SKILL.md)
│   └── <skill-name>/
│       └── SKILL.md
├── agents/                   # Subagent definitions (Markdown files)
├── hooks/
│   └── hooks.json            # Event handlers (PreToolUse, PostToolUse, etc.)
├── .mcp.json                 # MCP server configurations
├── .lsp.json                 # LSP server configurations
└── scripts/                  # Supporting scripts referenced by hooks/skills
```

Only `plugin.json` goes inside `.claude-plugin/`. All other directories must be at the plugin root.

## Key Conventions

- **Plugin naming**: Use kebab-case for plugin names (the `name` field in `plugin.json` is the namespace prefix for all commands, e.g., `/my-plugin:hello`)
- **Paths in hooks/MCP configs**: Always use `${CLAUDE_PLUGIN_ROOT}` for paths — plugins are cached/copied on install, so absolute paths break
- **Manifest**: `name` is the only required field in `plugin.json`. Use semantic versioning for `version`.
- **Skills vs Commands**: `skills/` directories contain `SKILL.md` files (model-invoked based on context). `commands/` contain plain Markdown files (user-invoked via `/name`).

## Development & Testing

Test a plugin locally without installing:
```bash
claude --plugin-dir ./<plugin-name>
```

Load multiple plugins simultaneously:
```bash
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two
```

Debug plugin loading issues:
```bash
claude --debug
```

Validate inside Claude Code with `/plugin validate`.

## Marketplace Distribution

This repo can serve as a plugin marketplace. The marketplace configuration file (`marketplace.json` at repo root) lists available plugins with their source paths, descriptions, and versions. Other projects install plugins from this marketplace via `/plugin install <name>`.
