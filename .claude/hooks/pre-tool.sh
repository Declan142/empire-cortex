#!/bin/bash
# PreToolUse hook — blocks dangerous operations
# Exit 0 = allow, Exit 2 = block

TOOL_NAME="$CLAUDE_TOOL_NAME"
TOOL_INPUT="$CLAUDE_TOOL_INPUT"

# Block destructive bash commands
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

  # Block rm -rf on dangerous paths
  if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*f|-[a-zA-Z]*r){2}'; then
    if echo "$COMMAND" | grep -qE '(\/|~|\.\.)'; then
      echo "BLOCKED: rm -rf on potentially dangerous path"
      exit 2
    fi
  fi

  # Block force push
  if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
    echo "BLOCKED: force push is forbidden by constitution"
    exit 2
  fi

  # Block push to main/master
  if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\s+(main|master)'; then
    echo "BLOCKED: direct push to main/master forbidden"
    exit 2
  fi

  # Block git reset --hard
  if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
    echo "BLOCKED: git reset --hard is destructive"
    exit 2
  fi

  # Block DROP TABLE
  if echo "$COMMAND" | grep -qiE 'DROP\s+(TABLE|DATABASE)'; then
    echo "BLOCKED: DROP TABLE/DATABASE forbidden"
    exit 2
  fi
fi

# Allow everything else
exit 0
