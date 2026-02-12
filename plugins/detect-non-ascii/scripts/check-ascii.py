#!/usr/bin/env python3
"""Claude Code hook that flags tool calls containing non-ASCII characters.

PreToolUse: prompts with permissionDecision "ask". Yes = always allow (auto-adds
to allowlist), No = deny.

PostToolUse: auto-adds approved non-ASCII characters to the allowlist so they
won't be flagged again.

For Edit tool calls, only flags non-ASCII characters that are newly introduced
(not already present in old_string) to avoid false positives from existing content.

The allowlist is stored per-project at .claude/ascii-allowlist.txt (relative to CWD).
"""

import json
import os
import sys


def get_allowlist_path() -> str:
    """Return the path to the per-project allowlist file.

    Uses .claude/ascii-allowlist.txt in the current working directory so each
    project maintains its own set of approved characters.
    """
    return os.path.join(os.getcwd(), ".claude", "ascii-allowlist.txt")


def load_allowlist() -> set[str]:
    """Load allowlisted Unicode characters from the per-project allowlist.

    Reads U+XXXX codepoints (one per line) from .claude/ascii-allowlist.txt.
    Comments (#) and blank lines are ignored.
    Returns a set of allowed characters. Returns empty set if the file doesn't exist.
    """
    allowlist_path = get_allowlist_path()
    if not os.path.exists(allowlist_path):
        return set()

    allowed = set()
    with open(allowlist_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # Parse U+XXXX format, strip inline comments
            if line.upper().startswith("U+"):
                try:
                    hex_part = line.split()[0][2:]  # "U+2014  # em dash" -> "2014"
                    codepoint = int(hex_part, 16)
                    allowed.add(chr(codepoint))
                except (ValueError, IndexError):
                    continue
    return allowed


def get_content(data: dict) -> str:
    """Extract the relevant text content from the hook input."""
    event = data.get("hook_event_name", "")
    tool = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    if event == "PreToolUse":
        if tool == "Bash":
            return tool_input.get("command", "")
        elif tool == "Write":
            return tool_input.get("content", "")
        elif tool == "Edit":
            old = tool_input.get("old_string", "")
            new = tool_input.get("new_string", "")
            # Only flag non-ASCII chars newly introduced by the edit
            old_non_ascii = {ch for ch in old if ord(ch) > 127}
            return "".join(ch for ch in new if ord(ch) > 127 and ch not in old_non_ascii)

    if event == "PostToolUse":
        # PostToolUse tool_input may have escaped sequences, so use tool_response
        tool_response = data.get("tool_response", {})
        if tool == "Bash":
            return tool_response.get("stdout", "")
        elif tool == "Write":
            return tool_input.get("content", "")
        elif tool == "Edit":
            return tool_input.get("new_string", "")

    return ""


def find_non_ascii(text: str, allowlist: set[str]) -> list[tuple[str, str]]:
    """Find unique non-ASCII characters and return them with their Unicode codepoints.

    Characters in the allowlist are excluded from results.
    """
    seen = {}
    for ch in text:
        if ord(ch) > 127 and ch not in seen and ch not in allowlist:
            seen[ch] = f"U+{ord(ch):04X}"
    return sorted(seen.items())


def add_to_allowlist(non_ascii: list[tuple[str, str]]) -> None:
    """Append non-ASCII characters to the per-project allowlist file.

    Creates the .claude/ directory and allowlist file if they don't exist.

    @param non_ascii - List of (character, codepoint_str) tuples to add
    """
    allowlist_path = get_allowlist_path()
    os.makedirs(os.path.dirname(allowlist_path), exist_ok=True)
    with open(allowlist_path, "a") as f:
        for ch, code in non_ascii:
            f.write(f"{code}  # {ch}\n")


def main() -> None:
    data = json.load(sys.stdin)
    event = data.get("hook_event_name", "")
    tool = data.get("tool_name", "")

    allowlist = load_allowlist()
    content = get_content(data)
    non_ascii = find_non_ascii(content, allowlist)

    if not non_ascii:
        sys.exit(0)

    if event == "PostToolUse":
        # User approved — auto-add to allowlist
        add_to_allowlist(non_ascii)
        sys.exit(0)

    chars_display = " ".join(f"'{ch}' ({code})" for ch, code in non_ascii)

    if event == "PreToolUse":
        result = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "ask",
                "permissionDecisionReason": f"Non-ASCII in {tool}: {chars_display}\nYes = always allow, No = deny",
            }
        }
        print(json.dumps(result))
        sys.exit(0)


if __name__ == "__main__":
    main()
