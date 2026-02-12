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

## Available Plugins

See [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) for the full catalog.

## Testing a Plugin Locally

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

## Contributing

Each plugin lives in its own directory under `plugins/` with a `.claude-plugin/plugin.json` manifest. See [CLAUDE.md](CLAUDE.md) for the full structure and conventions.
