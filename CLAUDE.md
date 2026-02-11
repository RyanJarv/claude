# CLAUDE.md

A **Claude Code plugin marketplace** — a catalog of installable plugins bundling commands, skills, agents, hooks, MCP servers, and LSP servers. Each directory under `plugins/` is an independent plugin package.

## Quick Start

```
/scaffold my-plugin          # Create plugin with boilerplate
# ... add commands, skills, hooks ...
claude --plugin-dir ./plugins/my-plugin   # Test locally
/register my-plugin           # Add to marketplace.json
/validate-plugin my-plugin    # Check quality standards
```

## Repository Structure

```
├── .claude-plugin/marketplace.json    # Marketplace catalog
├── plugins/<plugin>/
│   ├── .claude-plugin/plugin.json     # Manifest (name, version, description)
│   ├── commands/                      # Slash commands (Markdown)
│   ├── skills/<name>/SKILL.md         # Agent skills
│   ├── agents/                        # Subagent definitions (Markdown)
│   ├── hooks/hooks.json               # Lifecycle event handlers
│   ├── .mcp.json                      # MCP server configs
│   ├── .lsp.json                      # LSP server configs
│   └── scripts/                       # Supporting scripts
├── docs/                              # Component & schema docs
├── templates/                         # Boilerplate templates
└── scripts/                           # Developer tooling scripts
```

## Component Types

| Component | Location | Trigger | Use When | Docs |
|-----------|----------|---------|----------|------|
| Command | `commands/*.md` | User types `/plugin:cmd` | Explicit user action | [docs/commands.md](docs/commands.md) |
| Skill | `skills/*/SKILL.md` | Model invokes automatically | Context-sensitive behavior | [docs/skills.md](docs/skills.md) |
| Agent | `agents/*.md` | Spawned via Task tool | Multi-step autonomous work | [docs/agents.md](docs/agents.md) |
| Hook | `hooks/hooks.json` | Claude Code events | React to lifecycle events | [docs/hooks.md](docs/hooks.md) |
| MCP Server | `.mcp.json` | Available as tools | External API/tool integration | [docs/mcp-servers.md](docs/mcp-servers.md) |
| LSP Server | `.lsp.json` | Automatic | Language code intelligence | [docs/lsp-servers.md](docs/lsp-servers.md) |

See [docs/components.md](docs/components.md) for a decision guide on choosing between types.

## Key Conventions

- **Naming**: kebab-case for plugin directories and `name` in plugin.json
- **Paths**: Always use `${CLAUDE_PLUGIN_ROOT}` in hooks/MCP/LSP configs — never absolute paths
- **Manifest**: `name` is the only required field in `plugin.json`; use semver for `version`
- **Isolation**: No cross-plugin references — plugins are copied to a cache on install
- **Keep in sync**: Update `.claude-plugin/marketplace.json` when adding/removing plugins

## Developer Commands

| Command | Purpose |
|---------|---------|
| `/scaffold <name>` | Create a new plugin with standard structure |
| `/register <name>` | Add/update plugin entry in marketplace.json |
| `/validate-plugin <name>` | Check plugin against quality standards |

## Testing

```bash
claude --plugin-dir ./plugins/<name>                    # Test one plugin
claude --plugin-dir ./plugins/a --plugin-dir ./plugins/b  # Test multiple
claude plugin validate .                                  # Validate marketplace
```

## Marketplace Usage

```
/plugin marketplace add <github-owner>/<repo-name>    # Add marketplace
/plugin install <plugin-name>@<marketplace-name>       # Install plugin
/plugin marketplace update                             # Update catalog
```

## Reference

- [Component comparison & decision guide](docs/components.md)
- [Marketplace & plugin.json schema](docs/marketplace-schema.md)
- Templates: `templates/` directory
