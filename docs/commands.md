# Creating Commands

Commands are Markdown files in `commands/` that define user-invoked slash commands. The filename (minus `.md`) becomes the command name, namespaced under the plugin.

## File Format

Each command is a plain Markdown file. The contents are interpreted as a prompt — there is no frontmatter.

```
plugins/my-plugin/
  commands/
    hello.md       →  /my-plugin:hello
    review.md      →  /my-plugin:review
    deploy.md      →  /my-plugin:deploy
```

## The `$ARGUMENTS` Variable

Use `$ARGUMENTS` anywhere in the Markdown to capture whatever the user types after the command name.

When the user runs:
```
/my-plugin:review src/auth.ts
```

Then `$ARGUMENTS` is replaced with `src/auth.ts` before the prompt is processed.

## Examples

### Simple Greeting Command

**`commands/hello.md`**

```markdown
Say hello to the user and briefly introduce yourself as a helpful coding assistant.
If the user provided a name — $ARGUMENTS — greet them by name.
```

Usage:
```
/my-plugin:hello Ryan
```

### Code Review Command

**`commands/review.md`**

```markdown
Perform a thorough code review of the following file or path: $ARGUMENTS

Focus on:
- Potential bugs and edge cases
- Security vulnerabilities (OWASP top 10)
- Performance concerns
- Readability and maintainability

Provide specific, actionable feedback with line references. If no path is provided,
review the most recently edited files using git status.
```

Usage:
```
/my-plugin:review src/api/auth.ts
```

### Commit Message Generator

**`commands/commit.md`**

```markdown
Look at the current staged changes using git diff --cached.

Write a concise, conventional commit message following this format:
  type(scope): description

Where type is one of: feat, fix, docs, style, refactor, test, chore.

If the user provided additional context — $ARGUMENTS — incorporate it into the message.

Output only the commit message, nothing else.
```

Usage:
```
/my-plugin:commit fixed the login redirect bug
```

## Best Practices

- **Keep commands focused.** Each command should do one thing well. Split complex workflows into multiple commands.
- **Write clear instructions.** The Markdown content is a prompt — be specific about what you want the model to do.
- **Use `$ARGUMENTS` intentionally.** Document what the user should pass. Handle the case where `$ARGUMENTS` is empty.
- **Avoid side effects.** Commands should primarily instruct the model. Use hooks for automated side effects.
- **Name commands descriptively.** `review`, `test`, `explain` are better than `r`, `t`, `e`.
