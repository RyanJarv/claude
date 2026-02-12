#!/usr/bin/env python3
"""Tests for the check-ascii.py Claude Code hook.

Pipes realistic JSON payloads (matching the actual Claude Code hook API shape)
into the hook script and verifies stdout, exit codes, and allowlist side effects.

Run: python3 scripts/test-check-ascii.py
"""

import json
import os
import subprocess
import sys
import tempfile
import shutil

HOOK_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-ascii.py")

passed = 0
failed = 0


def run_hook(payload: dict, cwd: str | None = None) -> tuple[str, int]:
    """Run the hook script with a JSON payload on stdin.

    @param cwd - Working directory for the hook process. The hook resolves
                 the allowlist relative to CWD, so tests use a temp dir.
    @returns (stdout, exit_code)
    """
    result = subprocess.run(
        [sys.executable, HOOK_SCRIPT],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=cwd,
    )
    return result.stdout.strip(), result.returncode


def assert_eq(test_name: str, actual, expected) -> None:
    global passed, failed
    if actual == expected:
        passed += 1
        print(f"  PASS: {test_name}")
    else:
        failed += 1
        print(f"  FAIL: {test_name}")
        print(f"    expected: {expected!r}")
        print(f"    actual:   {actual!r}")


# ---------------------------------------------------------------------------
# Fixtures: realistic payloads matching Claude Code hook API shape
# ---------------------------------------------------------------------------

def pre_tool_use_bash(command: str) -> dict:
    """PreToolUse Bash payload — tool_input.command has the literal command string."""
    return {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {"command": command},
    }


def post_tool_use_bash(command: str, stdout: str) -> dict:
    """PostToolUse Bash payload — tool_input.command may have escape sequences,
    tool_response.stdout has the actual rendered output."""
    return {
        "hook_event_name": "PostToolUse",
        "tool_name": "Bash",
        "tool_input": {"command": command},
        "tool_response": {"stdout": stdout, "stderr": ""},
    }


def pre_tool_use_edit(old_string: str, new_string: str) -> dict:
    return {
        "hook_event_name": "PreToolUse",
        "tool_name": "Edit",
        "tool_input": {"old_string": old_string, "new_string": new_string},
    }


def pre_tool_use_write(content: str) -> dict:
    return {
        "hook_event_name": "PreToolUse",
        "tool_name": "Write",
        "tool_input": {"content": content},
    }


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

class ProjectDir:
    """Context manager that creates a temp project dir with .claude/ for tests."""

    def __init__(self, allowlist_content: str | None = None):
        self.allowlist_content = allowlist_content
        self.tmpdir = None

    def __enter__(self) -> str:
        self.tmpdir = tempfile.mkdtemp()
        claude_dir = os.path.join(self.tmpdir, ".claude")
        os.makedirs(claude_dir)
        if self.allowlist_content is not None:
            with open(os.path.join(claude_dir, "ascii-allowlist.txt"), "w") as f:
                f.write(self.allowlist_content)
        return self.tmpdir

    def __exit__(self, *args):
        shutil.rmtree(self.tmpdir)

    @property
    def allowlist_path(self) -> str:
        return os.path.join(self.tmpdir, ".claude", "ascii-allowlist.txt")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_pre_tool_use_ascii_only():
    """ASCII-only commands should pass silently."""
    print("test_pre_tool_use_ascii_only")
    with ProjectDir() as cwd:
        stdout, code = run_hook(pre_tool_use_bash("echo hello world"), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        assert_eq("no stdout", stdout, "")


def test_pre_tool_use_flags_non_ascii():
    """Non-ASCII in command should return permissionDecision 'ask'."""
    print("test_pre_tool_use_flags_non_ascii")
    with ProjectDir() as cwd:
        stdout, code = run_hook(pre_tool_use_bash("echo hello \u2014 world"), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        result = json.loads(stdout)
        decision = result["hookSpecificOutput"]["permissionDecision"]
        reason = result["hookSpecificOutput"]["permissionDecisionReason"]
        assert_eq("decision is ask", decision, "ask")
        assert_eq("reason contains U+2014", "U+2014" in reason, True)
        assert_eq("reason contains always allow hint", "Yes = always allow" in reason, True)


def test_pre_tool_use_multiple_chars():
    """Multiple non-ASCII chars should all be listed."""
    print("test_pre_tool_use_multiple_chars")
    with ProjectDir() as cwd:
        stdout, _ = run_hook(pre_tool_use_bash("echo \u2018hello\u2019 \u2014"), cwd=cwd)
        result = json.loads(stdout)
        reason = result["hookSpecificOutput"]["permissionDecisionReason"]
        assert_eq("contains U+2018", "U+2018" in reason, True)
        assert_eq("contains U+2019", "U+2019" in reason, True)
        assert_eq("contains U+2014", "U+2014" in reason, True)


def test_pre_tool_use_edit_only_new_chars():
    """Edit should only flag chars in new_string that aren't in old_string."""
    print("test_pre_tool_use_edit_only_new_chars")
    with ProjectDir() as cwd:
        # old has em dash, new has em dash + curly quote — only curly quote is new
        stdout, code = run_hook(pre_tool_use_edit(
            old_string="hello \u2014 world",
            new_string="hello \u2014 world\u2019",
        ), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        result = json.loads(stdout)
        reason = result["hookSpecificOutput"]["permissionDecisionReason"]
        assert_eq("flags U+2019", "U+2019" in reason, True)
        assert_eq("does not flag U+2014", "U+2014" not in reason, True)


def test_pre_tool_use_edit_no_new_chars():
    """Edit with same non-ASCII in old and new should pass silently."""
    print("test_pre_tool_use_edit_no_new_chars")
    with ProjectDir() as cwd:
        stdout, code = run_hook(pre_tool_use_edit(
            old_string="hello \u2014 world",
            new_string="hello \u2014 there",
        ), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        assert_eq("no stdout", stdout, "")


def test_allowlist_filters_chars():
    """Allowlisted characters should not be flagged."""
    print("test_allowlist_filters_chars")
    with ProjectDir("# test allowlist\nU+2014\n") as cwd:
        # em dash should be filtered, curly quote should still flag
        stdout, code = run_hook(pre_tool_use_bash("echo \u2014 \u2019"), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        result = json.loads(stdout)
        reason = result["hookSpecificOutput"]["permissionDecisionReason"]
        assert_eq("does not flag U+2014", "U+2014" not in reason, True)
        assert_eq("flags U+2019", "U+2019" in reason, True)


def test_allowlist_all_filtered_passes_silently():
    """When all non-ASCII chars are allowlisted, hook should exit silently."""
    print("test_allowlist_all_filtered_passes_silently")
    with ProjectDir("U+2014\nU+2019\n") as cwd:
        stdout, code = run_hook(pre_tool_use_bash("echo \u2014 \u2019"), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        assert_eq("no stdout", stdout, "")


def test_allowlist_ignores_comments_and_blanks():
    """Comments and blank lines in allowlist should be ignored."""
    print("test_allowlist_ignores_comments_and_blanks")
    with ProjectDir("# comment\n\n  \nU+2014  # em dash\n# another comment\n") as cwd:
        stdout, code = run_hook(pre_tool_use_bash("echo \u2014"), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        assert_eq("no stdout (filtered)", stdout, "")


def test_post_tool_use_adds_to_allowlist():
    """PostToolUse should auto-add non-ASCII chars from stdout to the allowlist.

    This is the critical test — PostToolUse tool_input.command has escaped sequences
    (e.g. \\xe2\\x80\\x94) while tool_response.stdout has the literal characters.
    The hook must read from stdout, not tool_input.
    """
    print("test_post_tool_use_adds_to_allowlist")
    with ProjectDir("# test\n") as cwd:
        # Simulate realistic PostToolUse: escaped in tool_input, literal in stdout
        stdout, code = run_hook(post_tool_use_bash(
            command="printf 'em dash: \\xe2\\x80\\x94\\n'",  # escaped — no literal non-ASCII
            stdout="em dash: \u2014",                         # literal em dash in output
        ), cwd=cwd)
        assert_eq("exit code is 0", code, 0)
        assert_eq("no stdout (PostToolUse is silent)", stdout, "")

        # Verify it was added to the allowlist
        allowlist_path = os.path.join(cwd, ".claude", "ascii-allowlist.txt")
        with open(allowlist_path) as f:
            content = f.read()
        assert_eq("allowlist contains U+2014", "U+2014" in content, True)


def test_post_tool_use_skips_already_allowlisted():
    """PostToolUse should not re-add characters already in the allowlist."""
    print("test_post_tool_use_skips_already_allowlisted")
    with ProjectDir("U+2014  # \u2014\n") as cwd:
        stdout, code = run_hook(post_tool_use_bash(
            command="printf 'test \\xe2\\x80\\x94\\n'",
            stdout="test \u2014",
        ), cwd=cwd)
        assert_eq("exit code is 0", code, 0)

        # Count occurrences — should still be exactly 1
        allowlist_path = os.path.join(cwd, ".claude", "ascii-allowlist.txt")
        with open(allowlist_path) as f:
            content = f.read()
        count = content.count("U+2014")
        assert_eq("U+2014 appears exactly once (not duplicated)", count, 1)


def test_missing_allowlist_file():
    """Hook should work fine if the allowlist file doesn't exist."""
    print("test_missing_allowlist_file")
    # Use a temp dir with .claude/ but no allowlist file
    tmpdir = tempfile.mkdtemp()
    try:
        stdout, code = run_hook(pre_tool_use_bash("echo \u2014"), cwd=tmpdir)
        assert_eq("exit code is 0", code, 0)
        result = json.loads(stdout)
        assert_eq("decision is ask", result["hookSpecificOutput"]["permissionDecision"], "ask")
    finally:
        shutil.rmtree(tmpdir)


def test_post_tool_use_creates_allowlist():
    """PostToolUse should create .claude/ascii-allowlist.txt if it doesn't exist."""
    print("test_post_tool_use_creates_allowlist")
    tmpdir = tempfile.mkdtemp()
    try:
        stdout, code = run_hook(post_tool_use_bash(
            command="echo test",
            stdout="test \u2014",
        ), cwd=tmpdir)
        assert_eq("exit code is 0", code, 0)

        allowlist_path = os.path.join(tmpdir, ".claude", "ascii-allowlist.txt")
        assert_eq("allowlist file created", os.path.exists(allowlist_path), True)
        with open(allowlist_path) as f:
            content = f.read()
        assert_eq("allowlist contains U+2014", "U+2014" in content, True)
    finally:
        shutil.rmtree(tmpdir)


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_pre_tool_use_ascii_only()
    test_pre_tool_use_flags_non_ascii()
    test_pre_tool_use_multiple_chars()
    test_pre_tool_use_edit_only_new_chars()
    test_pre_tool_use_edit_no_new_chars()
    test_allowlist_filters_chars()
    test_allowlist_all_filtered_passes_silently()
    test_allowlist_ignores_comments_and_blanks()
    test_post_tool_use_adds_to_allowlist()
    test_post_tool_use_skips_already_allowlisted()
    test_missing_allowlist_file()
    test_post_tool_use_creates_allowlist()

    print(f"\n{passed + failed} tests: {passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
