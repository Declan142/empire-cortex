#!/bin/bash
# block-destructive.sh — PreToolUse hook for /careful
# Blocks dangerous commands deterministically (exit 2 = block)

INPUT="$CLAUDE_TOOL_INPUT"

# Check for destructive patterns
if echo "$INPUT" | grep -qiE \
  'rm -rf|rm -r |rmdir /s|del /s /q|Remove-Item.*-Recurse.*-Force|DROP TABLE|TRUNCATE|DELETE FROM [a-zA-Z]+ WHERE 1|DELETE FROM [a-zA-Z]+;|git push.*--force|git push.*-f |git reset --hard|git clean -fd|git checkout \.|kubectl delete|docker rm -f|docker system prune|format [a-zA-Z]:'; then
  echo "BLOCKED by /careful — destructive command detected. Disable safety mode first."
  exit 2
fi

exit 0
