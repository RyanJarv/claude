# Creating Agent Skills

Skills live in `skills/<skill-name>/SKILL.md`. Each skill is a directory containing a `SKILL.md` file that tells the model what the skill does and when to use it.

## Directory Structure

```
plugins/my-plugin/
  skills/
    code-review/
      SKILL.md
    test-writer/
      SKILL.md
```

## SKILL.md Format

Each `SKILL.md` file has YAML frontmatter with a `description` field, followed by the skill's instructions in Markdown.

```markdown
---
description: "Activate when the user asks for a code review or when reviewing pull request changes"
---

# Code Review Skill

When performing a code review, follow these guidelines:

1. Check for potential bugs and edge cases
2. Look for security vulnerabilities
3. Evaluate readability and naming conventions
4. Suggest performance improvements where relevant

Provide feedback as a numbered list with file paths and line references.
Keep suggestions actionable and specific.
```

## How Skills Work

The `description` frontmatter is the key mechanism. The model reads all available skill descriptions and decides which skills to activate based on the current conversation context.

- The model sees the description and evaluates whether the current context matches
- If it matches, the model reads the full SKILL.md and follows its instructions
- The user never explicitly invokes a skill — the model decides

## Skills vs Commands

| | Skills | Commands |
|---|--------|----------|
| **Invocation** | Model decides automatically | User types `/plugin:command` |
| **Trigger** | Context-based (description match) | Explicit (user action) |
| **Frontmatter** | `description` field required | No frontmatter |
| **Use when** | Behavior should activate in context | User wants explicit control |

**Use a skill** when the behavior should activate automatically based on what the model is doing — e.g., applying coding standards during a refactor, suggesting tests when writing new functions.

**Use a command** when the user should explicitly choose to trigger it — e.g., generating a commit message, running a specific review checklist.

## Examples

### Coding Standards Skill

**`skills/coding-standards/SKILL.md`**

```markdown
---
description: "Apply when writing or editing code to ensure consistent coding standards"
---

# Coding Standards

When writing or modifying code, follow these standards:

## Naming
- Variables and functions: camelCase
- Classes and types: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case

## Functions
- Maximum 30 lines per function
- Single responsibility — one function, one job
- Always add JSDoc for exported functions

## Error Handling
- Never swallow errors silently
- Use custom error classes for domain errors
- Always include context in error messages
```

### Test Writer Skill

**`skills/test-writer/SKILL.md`**

```markdown
---
description: "Activate when writing tests or when the user asks to add test coverage"
---

# Test Writing Skill

When writing tests, follow these patterns:

## Structure
- Use describe/it blocks with clear descriptions
- Group tests by function or behavior
- Follow Arrange-Act-Assert pattern

## Coverage
- Test happy path first
- Add edge cases: empty inputs, null values, boundary conditions
- Test error scenarios and exception handling

## Naming
- Describe the behavior: "it should return empty array when no items match"
- Never use "test1", "test2" naming
```

## Best Practices

- **Write precise descriptions.** The `description` field determines when the skill activates. Be specific about the context — vague descriptions lead to unnecessary activation.
- **Keep skills focused.** One skill per concern. Don't combine code review and test writing into a single skill.
- **Avoid overlap with commands.** If you have both a code-review skill and a `/review` command, make them complementary — the skill applies standards automatically while the command runs a thorough on-demand review.
- **Test activation.** Use `claude --plugin-dir ./plugins/my-plugin` and observe whether the skill activates at the right times.
