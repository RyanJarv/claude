# Component Comparison Guide

A Claude Code plugin can contain up to six component types. This guide explains what each does and when to use one over another.

## Component Overview

| Component | Location | Invocation | Purpose |
|-----------|----------|------------|---------|
| Commands | `commands/*.md` | User types `/plugin-name:command` | Explicit user-triggered actions |
| Skills | `skills/*/SKILL.md` | Model invokes automatically | Context-aware agent capabilities |
| Agents | `agents/*.md` | Spawned via Task tool | Autonomous subagent workers |
| Hooks | `hooks/hooks.json` | Triggered by Claude Code events | Lifecycle event handlers |
| MCP Servers | `.mcp.json` | Available as tools | External tool integrations |
| LSP Servers | `.lsp.json` | Automatic code intelligence | Language-aware editing support |

## Commands

Markdown files in `commands/`. The filename (minus `.md`) becomes the slash command, namespaced under the plugin name.

```
commands/hello.md  →  /my-plugin:hello
commands/review.md →  /my-plugin:review
```

The user explicitly types the command. The file contents are interpreted as a prompt. Use `$ARGUMENTS` to capture user input after the command name.

**Best for:** Repeatable actions the user triggers on demand — code review, formatting, scaffolding, deployment checklists.

## Skills

Directories under `skills/` containing a `SKILL.md` file. The model reads the `description` frontmatter and decides when to activate the skill — the user never invokes it directly.

```
skills/code-review/SKILL.md
skills/test-writer/SKILL.md
```

**Best for:** Context-sensitive behavior that should activate automatically — suggesting tests when the model sees untested code, offering optimization tips when it detects performance issues.

## Agents

Markdown files in `agents/`. Each file defines a specialized subagent that gets spawned via the Task tool with `subagent_type` matching the agent filename.

```
agents/researcher.md
agents/test-runner.md
```

**Best for:** Complex, multi-step autonomous work — codebase exploration, running test suites, implementing features across multiple files.

## Hooks

Defined in `hooks/hooks.json`. Shell commands that execute in response to Claude Code lifecycle events (PreToolUse, PostToolUse, Stop, etc.).

```
hooks/hooks.json  →  runs scripts on events
```

**Best for:** Guardrails, validation, logging, and automation that should happen before or after tool use — blocking writes to protected files, logging tool usage, running linters after edits.

## MCP Servers

Configured in `.mcp.json` at the plugin root. Each server provides additional tools that Claude Code can call.

```
.mcp.json  →  registers external tool servers
```

**Best for:** Integrating external APIs and services — database access, third-party APIs, custom tooling.

## LSP Servers

Configured in `.lsp.json` at the plugin root. Provides language intelligence (completions, diagnostics, hover info) for specific file types.

```
.lsp.json  →  registers language servers
```

**Best for:** Adding IDE-like language support — type checking, go-to-definition, diagnostics for languages not covered by default.

## Decision Flowchart

Use these questions to choose the right component:

```
Should the user explicitly trigger it?
├── Yes → Command
└── No
    ├── Should the model decide when to use it?
    │   └── Yes → Skill
    ├── Does it need autonomous multi-step work?
    │   └── Yes → Agent
    ├── Should it react to Claude Code events?
    │   └── Yes → Hook
    ├── Does it integrate an external API/tool?
    │   └── Yes → MCP Server
    └── Does it provide language intelligence?
        └── Yes → LSP Server
```

## Quick Comparison

### Commands vs Skills

| | Commands | Skills |
|---|---------|--------|
| Trigger | User types `/plugin:name` | Model activates automatically |
| Use when | User knows what they want | Model detects the right context |
| Example | `/my-plugin:review` for on-demand review | Auto-suggest reviews on PR diffs |

### Skills vs Agents

| | Skills | Agents |
|---|--------|--------|
| Scope | Single-turn contextual help | Multi-step autonomous work |
| Invocation | Model activates inline | Spawned as a subprocess |
| Use when | Augmenting current conversation | Delegating complex tasks |

### Hooks vs MCP Servers

| | Hooks | MCP Servers |
|---|-------|-------------|
| Mechanism | Shell commands on events | Persistent tool servers |
| Use when | Reacting to lifecycle events | Providing new tool capabilities |
| Example | Validate files before write | Query a database |

## Multi-Component Patterns

Some plugins combine several component types to implement higher-level behavior.

### Goals (Verification Loops)

The [goals plugin](../plugins/goals/) combines **commands** + **hooks** + **skills** to create declarative verification loops. A Stop hook runs prechecks before Claude can stop, commands let users manage goals, and a skill provides context-aware guidance.

See [docs/goals.md](goals.md) for the full reference.

### detect-non-ascii (Unicode Guard)

The [detect-non-ascii plugin](../plugins/detect-non-ascii/) uses **PreToolUse** and **PostToolUse hooks** to catch non-ASCII characters before they reach Bash, Write, or Edit tools. It prompts for approval and maintains a per-project allowlist so approved characters are never flagged again.

See [docs/detect-non-ascii.md](detect-non-ascii.md) for the full reference.
