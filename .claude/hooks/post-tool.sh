#!/bin/bash
# PostToolUse hook — audit logging
# Appends every tool use to the immutable audit log

TOOL_NAME="$CLAUDE_TOOL_NAME"
TOOL_INPUT="$CLAUDE_TOOL_INPUT"
SESSION_ID="$CLAUDE_SESSION_ID"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

LOG_DIR="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")/.claude/artifacts/audit"
mkdir -p "$LOG_DIR"

# Append to audit log (JSONL format, one line per event)
echo "{\"ts\":\"$TIMESTAMP\",\"session\":\"$SESSION_ID\",\"tool\":\"$TOOL_NAME\",\"input_preview\":$(echo "$TOOL_INPUT" | head -c 200 | jq -Rs .)}" >> "$LOG_DIR/log.jsonl"

exit 0
