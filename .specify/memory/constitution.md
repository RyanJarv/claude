<!--
Sync Impact Report
===================
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (initial)
Added sections:
  - Core Principles (5): Research Before Build, Plugin Isolation,
    Convention Over Configuration, Test Before Publish, Simplicity
  - Plugin Quality Standards
  - Marketplace Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no updates needed
    (Constitution Check section is generic/dynamic)
  - .specify/templates/spec-template.md — ✅ no updates needed
    (requirements structure is compatible)
  - .specify/templates/tasks-template.md — ✅ no updates needed
    (phase structure is compatible)
Follow-up TODOs: None
-->

# Claude Code Plugin Marketplace Constitution

## Core Principles

### I. Research Before Build

Every plugin MUST solve a clear, validated need. Before creating a new
plugin, the developer MUST:

- Articulate the specific problem the plugin addresses
- Research whether a trusted, maintained alternative already exists
  (built-in Claude Code feature, existing marketplace plugin, or
  established community tool)
- Document why a new plugin is warranted if alternatives exist

A plugin that duplicates well-maintained existing functionality without
meaningful differentiation MUST NOT be published to the marketplace.

### II. Plugin Isolation

Every plugin MUST be fully self-contained:

- No cross-plugin runtime dependencies — a plugin MUST NOT import from
  or reference another plugin's files
- All internal file paths in hooks, MCP configs, and scripts MUST use
  `${CLAUDE_PLUGIN_ROOT}` — absolute paths are forbidden because
  plugins are cached/copied on install
- Shared utilities MUST be duplicated into each plugin that needs them,
  not extracted to a common location outside the plugin boundary

### III. Convention Over Configuration

Plugins MUST follow the standard Claude Code plugin directory structure:

- `.claude-plugin/plugin.json` for manifest (only `name` is required)
- `commands/` for user-invoked slash commands (Markdown files)
- `skills/` for agent skills (subdirectories with `SKILL.md`)
- `agents/` for subagent definitions (Markdown files)
- `hooks/hooks.json` for event handlers
- `.mcp.json` for MCP server configurations
- `scripts/` for supporting scripts

Additional conventions:

- Plugin names MUST use kebab-case
- Each plugin MUST include a `README.md` at its root documenting
  purpose, installation, and usage
- Semantic versioning MUST be used for the `version` field

### IV. Test Before Publish

Every plugin MUST be locally validated before marketplace distribution:

- Load and test with `claude --plugin-dir ./<plugin-name>`
- Verify all commands appear and function correctly
- Verify agents are listed in `/agents` (if applicable)
- Verify hooks trigger on their target events (if applicable)
- Hook scripts MUST be executable (`chmod +x`) and independently
  runnable outside Claude Code for debugging
- Run `claude --debug` to confirm no loading errors
- Validate manifest with `/plugin validate`

### V. Simplicity

Each plugin MUST solve one clear problem:

- Avoid bundling unrelated functionality into a single plugin
- Start with the minimum viable feature set; expand only when a
  validated need exists
- Prefer fewer, well-crafted commands over many shallow ones
- If a plugin grows beyond its original scope, split it into
  focused plugins

## Plugin Quality Standards

Plugins published to this marketplace MUST meet these criteria:

- Passes all checks from Principle IV (Test Before Publish)
- Has a complete `plugin.json` manifest with `name`, `version`, and
  `description`
- Includes a `README.md` with: what it does, how to install, how to
  use, and any prerequisites
- Contains no hardcoded absolute paths
- Contains no secrets, API keys, or credentials
- Listed in the root `marketplace.json` with accurate metadata

## Marketplace Workflow

The development-to-distribution lifecycle:

1. **Create** — Scaffold plugin directory with `.claude-plugin/plugin.json`
2. **Develop** — Add commands, skills, agents, hooks, or MCP configs
3. **Test** — Validate locally with `claude --plugin-dir`
4. **Document** — Write `README.md` and ensure manifest is complete
5. **Register** — Add entry to root `marketplace.json`
6. **Distribute** — Others install via `/plugin install <name>`

## Governance

This constitution is the authoritative guide for all plugin development
and marketplace operations in this repository. All contributions MUST
comply with these principles.

Amendment procedure:

- Propose changes via pull request with rationale
- Update `CONSTITUTION_VERSION` per semantic versioning:
  MAJOR for principle removals/redefinitions, MINOR for new principles
  or material expansions, PATCH for clarifications and wording fixes
- Update `LAST_AMENDED_DATE` to the date of merge
- Propagate changes to dependent templates and `CLAUDE.md` as needed

**Version**: 1.0.0 | **Ratified**: 2026-02-11 | **Last Amended**: 2026-02-11
