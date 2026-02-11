# Creating Subagents

Agents are Markdown files in `agents/` that define specialized subagents. Each agent gets its own context and set of tools, and runs autonomously to complete multi-step tasks.

## File Format

Each agent is a Markdown file. The filename (minus `.md`) becomes the agent type name used when spawning via the Task tool.

```
plugins/my-plugin/
  agents/
    researcher.md
    test-runner.md
    refactorer.md
```

The Markdown content provides instructions that the subagent follows when spawned.

## How Agents Work

Agents are spawned via the Task tool with `subagent_type` matching the agent filename. When spawned, the agent:

1. Receives the instructions from the Markdown file
2. Receives a task prompt from the caller
3. Works autonomously using its available tools
4. Returns results to the caller when done

## Examples

### Codebase Researcher

**`agents/researcher.md`**

```markdown
# Researcher Agent

You are a codebase research specialist. Your job is to explore codebases and answer questions about their structure, patterns, and implementation details.

## Approach

1. Start with broad exploration — find relevant directories and files using Glob
2. Search for specific patterns using Grep
3. Read key files to understand implementation details
4. Synthesize findings into a clear, structured summary

## Output Format

Always structure your response as:
- **Summary**: 2-3 sentence overview
- **Key Files**: List of relevant files with brief descriptions
- **Details**: Detailed findings organized by topic
- **Recommendations**: Actionable next steps if applicable

## Guidelines

- Be thorough but efficient — don't read every file, focus on the most relevant ones
- Note any assumptions you're making
- Flag areas of uncertainty
```

Spawning this agent:
```
Task tool → subagent_type: "researcher", prompt: "How is authentication implemented in this project?"
```

### Test Runner

**`agents/test-runner.md`**

```markdown
# Test Runner Agent

You are a test execution specialist. Your job is to run tests, analyze results, and report failures clearly.

## Workflow

1. Identify the test framework and configuration
2. Run the requested tests
3. If tests fail, analyze the failure output
4. Report results with clear pass/fail summary

## Output Format

- **Result**: PASS or FAIL
- **Summary**: X passed, Y failed, Z skipped
- **Failures**: For each failure, include:
  - Test name
  - Expected vs actual
  - Relevant file and line number
  - Suggested fix if obvious
```

## Agents vs Skills

| | Agents | Skills |
|---|--------|--------|
| **Execution** | Separate subprocess with own context | Inline in current conversation |
| **Complexity** | Multi-step autonomous work | Single-turn contextual help |
| **Context** | Isolated — doesn't see conversation history | Accesses current conversation context |
| **Use when** | Task needs independent exploration/execution | Behavior should augment the current conversation |

**Use an agent** when the task requires autonomous multi-step work that could clutter the main conversation — codebase research, running and analyzing tests, complex refactoring.

**Use a skill** when the behavior should enhance the current conversation inline — applying coding standards, suggesting improvements as you work.

## Best Practices

- **Define clear scope.** Each agent should have a well-defined role. Don't create a "do everything" agent.
- **Specify output format.** Agents return results to the caller — define what that output should look like so the caller can use it effectively.
- **Keep instructions actionable.** Write the Markdown as if you're onboarding a new team member — tell them what to do, how to approach it, and what to deliver.
- **Don't duplicate built-in agents.** Claude Code already has Explore, Plan, and other built-in agent types. Only create custom agents for domain-specific workflows.
