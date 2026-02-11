# Configuring LSP Servers

LSP (Language Server Protocol) server configurations live in `.lsp.json` at the plugin root. LSP servers provide language intelligence — diagnostics, completions, hover info, and go-to-definition — for specific file types.

## File Location

```
plugins/my-plugin/
  .lsp.json
```

## JSON Schema

```json
{
  "lspServers": {
    "server-name": {
      "command": "path-to-lsp-binary",
      "args": ["--stdio"],
      "languages": ["python"],
      "filePatterns": ["**/*.py"]
    }
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lspServers` | object | Yes | Top-level container keyed by server name |
| `command` | string | Yes | Path to the LSP server binary |
| `args` | array | Yes | Command-line arguments (typically `["--stdio"]`) |
| `languages` | array | Yes | Language identifiers the server handles |
| `filePatterns` | array | Yes | Glob patterns for files the server applies to |

## How It Works

When the plugin is loaded and a matching file is opened, Claude Code starts the LSP server and communicates with it over stdio. The server provides language-specific intelligence that Claude Code uses to improve its understanding of the code.

## Binary Prerequisites

The LSP binary must be installed on the user's system. Unlike MCP servers which can use `npx` for on-demand installation, LSP servers typically require pre-installed binaries.

Document the installation requirements in your plugin's description or README:

```
# Requires: pip install python-lsp-server
# Requires: npm install -g typescript-language-server
```

## Examples

### Python LSP

```json
{
  "lspServers": {
    "python": {
      "command": "pylsp",
      "args": ["--stdio"],
      "languages": ["python"],
      "filePatterns": ["**/*.py"]
    }
  }
}
```

**Prerequisite:** `pip install python-lsp-server`

### TypeScript LSP

```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "languages": ["typescript", "typescriptreact", "javascript", "javascriptreact"],
      "filePatterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
    }
  }
}
```

**Prerequisite:** `npm install -g typescript-language-server typescript`

### Go LSP

```json
{
  "lspServers": {
    "gopls": {
      "command": "gopls",
      "args": ["serve"],
      "languages": ["go"],
      "filePatterns": ["**/*.go"]
    }
  }
}
```

**Prerequisite:** `go install golang.org/x/tools/gopls@latest`

### Rust LSP

```json
{
  "lspServers": {
    "rust-analyzer": {
      "command": "rust-analyzer",
      "args": [],
      "languages": ["rust"],
      "filePatterns": ["**/*.rs"]
    }
  }
}
```

**Prerequisite:** Install via `rustup component add rust-analyzer`

## Best Practices

- **Document prerequisites clearly.** Users need to install the LSP binary separately — make this obvious.
- **Use `--stdio` for communication.** Most LSP servers support stdio mode, which is what Claude Code expects.
- **Be specific with `filePatterns`.** Use precise glob patterns to avoid activating the server for unrelated files.
- **Match `languages` to standard identifiers.** Use the language identifiers that the LSP specification defines (e.g., `python`, `typescript`, `go`, `rust`).
- **Test with `claude --plugin-dir`.** Load the plugin and open relevant files to verify the LSP server starts and provides intelligence.
