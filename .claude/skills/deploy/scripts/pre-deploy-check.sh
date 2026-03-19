#!/bin/bash
# pre-deploy-check.sh — validates bash commands during deploy pipeline
# Blocks pushes to main/master and force operations

INPUT="$CLAUDE_TOOL_INPUT"

# Block direct push to main/master
if echo "$INPUT" | grep -qiE 'git push.*\b(main|master)\b'; then
  echo "BLOCKED — cannot push directly to main/master during deploy. Use a PR."
  exit 2
fi

# Block force operations
if echo "$INPUT" | grep -qiE 'git push.*--force|git push.*-f '; then
  echo "BLOCKED — force push not allowed during deploy pipeline."
  exit 2
fi

exit 0
