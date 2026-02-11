# Schema Reference

This document covers the full schemas for `marketplace.json` (the marketplace catalog) and `plugin.json` (individual plugin manifests).

## marketplace.json

Location: `.claude-plugin/marketplace.json` at the repository root.

### Full Schema

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "metadata": {
    "description": "A collection of Claude Code plugins"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./plugins/my-plugin",
      "version": "1.0.0",
      "description": "What this plugin does"
    }
  ]
}
```

### Fields

#### `name` (string, required)

Marketplace identifier. Must be kebab-case.

```json
"name": "claude-plugins"
```

#### `owner` (object, required)

Maintainer information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Maintainer name |
| `email` | string | No | Contact email |

```json
"owner": {
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

#### `metadata` (object, optional)

Additional marketplace metadata.

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description of the marketplace |

```json
"metadata": {
  "description": "My personal collection of plugins for Claude Code"
}
```

#### `plugins` (array, required)

List of plugin entries. See [Plugin Entry Schema](#plugin-entry-schema) below.

---

## Plugin Entry Schema

Each entry in the `plugins` array describes a plugin available in the marketplace.

### Fields

#### `name` (string, required)

Plugin identifier. Must be kebab-case and match the plugin directory name.

```json
"name": "code-review"
```

#### `source` (required)

Where to find the plugin. Three source types are supported:

**Relative path** — for plugins in this repository:
```json
"source": "./plugins/code-review"
```

**GitHub repository** — for plugins hosted in a separate repo:
```json
"source": {
  "type": "github",
  "repo": "owner/repo-name"
}
```

**Git URL** — for plugins in any git repository:
```json
"source": "https://github.com/owner/repo.git"
```

#### `version` (string, optional)

Semantic version of the plugin. Follow [semver](https://semver.org/) format.

```json
"version": "1.2.3"
```

#### `description` (string, optional)

Brief description of what the plugin does. Shown when users browse the marketplace.

```json
"description": "Automated code review with customizable rule sets"
```

### Complete Plugin Entry Examples

**Local plugin:**
```json
{
  "name": "code-review",
  "source": "./plugins/code-review",
  "version": "1.0.0",
  "description": "Automated code review with customizable rule sets"
}
```

**GitHub-hosted plugin:**
```json
{
  "name": "deploy-tools",
  "source": {
    "type": "github",
    "repo": "myorg/claude-deploy-plugin"
  },
  "version": "2.1.0",
  "description": "Deployment automation tools"
}
```

**Git URL plugin:**
```json
{
  "name": "custom-linter",
  "source": "https://gitlab.com/myorg/claude-linter-plugin.git",
  "version": "0.5.0",
  "description": "Custom linting rules for our codebase"
}
```

---

## plugin.json

Location: `.claude-plugin/plugin.json` inside each plugin directory.

### Full Schema

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does"
}
```

### Fields

#### `name` (string, required)

Plugin identifier. Must be kebab-case and match the containing directory name.

```json
"name": "code-review"
```

This name is used as the namespace prefix for commands (e.g., `/code-review:run`).

#### `version` (string, optional)

Semantic version. Follow [semver](https://semver.org/) format.

```json
"version": "1.0.0"
```

#### `description` (string, optional)

Brief description of the plugin's purpose.

```json
"description": "Automated code review with customizable rule sets"
```

---

## Complete Marketplace Example

```json
{
  "name": "acme-plugins",
  "owner": {
    "name": "Acme Corp",
    "email": "dev@acme.com"
  },
  "metadata": {
    "description": "Acme Corp's official Claude Code plugin collection"
  },
  "plugins": [
    {
      "name": "code-review",
      "source": "./plugins/code-review",
      "version": "1.0.0",
      "description": "Automated code review with customizable rule sets"
    },
    {
      "name": "deploy",
      "source": "./plugins/deploy",
      "version": "2.0.0",
      "description": "Deployment automation for AWS and GCP"
    },
    {
      "name": "community-linter",
      "source": {
        "type": "github",
        "repo": "community/claude-linter"
      },
      "version": "0.8.0",
      "description": "Community-maintained linting rules"
    }
  ]
}
```
