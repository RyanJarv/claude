# Claude Code Plugin Marketplace

A curated collection of plugins for [Claude Code](https://claude.ai/code). Each plugin bundles commands, skills, agents, hooks, and/or MCP server configurations that can be installed into any project.

## Adding This Marketplace

```
/plugin marketplace add RyanJarv/claude
```

## Installing a Plugin

```
/plugin install <plugin-name>@RyanJarv/claude
```

## Updating

```
/plugin marketplace update
```

## Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| [goals](plugins/goals/) | Declarative verification loops — prevents Claude from stopping until preconditions are verified. Define prechecks in YAML; the Stop hook enforces them automatically. | [docs/goals.md](docs/goals.md) |
| [detect-non-ascii](plugins/detect-non-ascii/) | Flags non-ASCII characters in Bash commands before execution. Prompts for approval and maintains a per-project allowlist. | [docs/detect-non-ascii.md](docs/detect-non-ascii.md) |

## Documentation

| Topic | Location |
|-------|----------|
| Project structure & conventions | [CLAUDE.md](CLAUDE.md) |
| Component types & decision guide | [docs/components.md](docs/components.md) |
| Marketplace & plugin.json schema | [docs/marketplace-schema.md](docs/marketplace-schema.md) |
| Creating commands | [docs/commands.md](docs/commands.md) |
| Creating skills | [docs/skills.md](docs/skills.md) |
| Creating agents | [docs/agents.md](docs/agents.md) |
| Creating hooks | [docs/hooks.md](docs/hooks.md) |
| MCP server integration | [docs/mcp-servers.md](docs/mcp-servers.md) |
| LSP server integration | [docs/lsp-servers.md](docs/lsp-servers.md) |
| Goals system reference | [docs/goals.md](docs/goals.md) |
| detect-non-ascii reference | [docs/detect-non-ascii.md](docs/detect-non-ascii.md) |

## Testing a Plugin Locally

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

## Contributing

Each plugin lives in its own directory under `plugins/` with a `.claude-plugin/plugin.json` manifest. See [CLAUDE.md](CLAUDE.md) for structure and conventions, and [docs/components.md](docs/components.md) for choosing the right component type.
