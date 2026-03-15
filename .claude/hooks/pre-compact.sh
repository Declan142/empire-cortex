#!/bin/bash
# PreCompact hook — saves state before context compaction
# This preserves cross-session continuity (Anthropic long-running agents pattern)

PROGRESS_FILE="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")/.claude/artifacts/progress.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read existing progress or create skeleton
if [ -f "$PROGRESS_FILE" ]; then
  EXISTING=$(cat "$PROGRESS_FILE")
else
  EXISTING='{}'
fi

# Update the last_compaction timestamp
echo "$EXISTING" | jq --arg ts "$TIMESTAMP" '. + {last_compaction: $ts, compaction_count: ((.compaction_count // 0) + 1)}' > "$PROGRESS_FILE"

exit 0
