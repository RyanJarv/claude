# Configuring MCP Servers

MCP (Model Context Protocol) server configurations live in `.mcp.json` at the plugin root. Each server provides additional tools that Claude Code can call during a session.

## File Location

```
plugins/my-plugin/
  .mcp.json
  scripts/
    server.js
```

## JSON Schema

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/server.js"],
      "env": {
        "API_KEY": ""
      }
    }
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mcpServers` | object | Yes | Top-level container keyed by server name |
| `command` | string | Yes | Executable to run (e.g., `node`, `python`, `npx`) |
| `args` | array | No | Command-line arguments |
| `env` | object | No | Environment variables passed to the server process |

## How It Works

When the plugin is loaded, Claude Code starts each configured MCP server as a subprocess. The server communicates over stdio using the MCP protocol, exposing tools that Claude Code can call just like built-in tools.

## Path Handling

**Always use `${CLAUDE_PLUGIN_ROOT}`** in `args` for any path that references files within your plugin. Plugins are cached/copied on install, so hardcoded paths will break.

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/server.js"]
    }
  }
}
```

For system-installed binaries, use the command name directly:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/some-server"]
    }
  }
}
```

## Examples

### Filesystem Server

Provide file management tools with scoped access:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

### Database Server

Expose database query tools:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://localhost:5432/mydb"
      }
    }
  }
}
```

### Custom Tool Server

A plugin-bundled server that provides domain-specific tools:

```json
{
  "mcpServers": {
    "deploy-tools": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/deploy-server.js"],
      "env": {
        "DEPLOY_ENV": "staging"
      }
    }
  }
}
```

## Environment Variables

Use the `env` field to pass configuration to the server. For sensitive values like API keys, leave the value empty — the user will be prompted to provide them, or they can set them in their environment.

```json
{
  "mcpServers": {
    "my-api": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/api-server.js"],
      "env": {
        "API_KEY": "",
        "API_BASE_URL": "https://api.example.com"
      }
    }
  }
}
```

## Best Practices

- **Use `${CLAUDE_PLUGIN_ROOT}` for plugin-local paths.** System commands like `npx` or `python` are fine without it.
- **Document required environment variables.** If your server needs API keys or configuration, document them in your plugin's README.
- **Name servers descriptively.** The server name appears in tool listings — `postgres-db` is clearer than `server1`.
- **Keep servers lightweight.** MCP servers run as long-lived subprocesses. Minimize memory and CPU usage.
- **Handle connection failures gracefully.** If your server can't connect to an external service, return helpful error messages rather than crashing.
