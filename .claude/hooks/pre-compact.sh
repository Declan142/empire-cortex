#!/bin/bash
# PreCompact hook — saves state before context compaction
# This preserves cross-session continuity (Anthropic long-running agents pattern)

# Ensure jq is on PATH (Windows Git Bash fix)
export PATH="$HOME/bin:$PATH"

PROGRESS_FILE="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")/.claude/artifacts/progress.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read existing progress or create skeleton
if [ -f "$PROGRESS_FILE" ]; then
  EXISTING=$(cat "$PROGRESS_FILE")
else
  EXISTING='{}'
fi

# Update the last_compaction timestamp
UPDATED=$(echo "$EXISTING" | jq --arg ts "$TIMESTAMP" '. + {last_compaction: $ts, compaction_count: ((.compaction_count // 0) + 1)}')

# ── AgentAttnRes: Promote top residuals to progress.json ──
# Scans all task residuals.jsonl files and picks the 3 highest-confidence entries
# for cross-session context. Caps total promoted residuals at 20.
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
TASKS_DIR="$ROOT/.claude/artifacts/tasks"

if [ -d "$TASKS_DIR" ]; then
  # Collect all residuals across tasks, take the 3 most recent high-confidence ones
  TOP_RESIDUALS=$(find "$TASKS_DIR" -name "residuals.jsonl" -exec cat {} + 2>/dev/null | \
    jq -s '[.[] | select(.confidence == "high")] | sort_by(.timestamp) | reverse | .[0:3] | [.[] | {taskId, agent, summary, tags, confidence, timestamp}]' 2>/dev/null)

  if [ -n "$TOP_RESIDUALS" ] && [ "$TOP_RESIDUALS" != "null" ] && [ "$TOP_RESIDUALS" != "[]" ]; then
    # Merge with existing promoted residuals, keeping max 20
    EXISTING_PROMOTED=$(echo "$UPDATED" | jq '.attn_residuals.top_residuals // []')
    MERGED=$(echo "$EXISTING_PROMOTED $TOP_RESIDUALS" | jq -s 'add | unique_by(.taskId + .agent + .timestamp) | sort_by(.timestamp) | reverse | .[0:20]')
    UPDATED=$(echo "$UPDATED" | jq --argjson residuals "$MERGED" '.attn_residuals.top_residuals = $residuals')
  fi
fi

echo "$UPDATED" > "$PROGRESS_FILE"

# ── AttnRes Bridge: Sync residuals to OpenClaw ──
BRIDGE_SCRIPT="$ROOT/.claude/hooks/sync-residuals.sh"
if [ -f "$BRIDGE_SCRIPT" ]; then
  bash "$BRIDGE_SCRIPT"
fi

exit 0
