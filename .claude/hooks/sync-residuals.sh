#!/bin/bash
# ── AttnRes Bridge: Claude Code → OpenClaw residual sync ──
# Called by pre-compact hook to push top residuals to OpenClaw's memory
# This writes a residuals-bridge.md file that OpenClaw's empire agent reads

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
TASKS_DIR="$ROOT/.claude/artifacts/tasks"
BRIDGE_FILE="$HOME/.openclaw/memory/residuals-bridge.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Ensure target directory exists
mkdir -p "$(dirname "$BRIDGE_FILE")"

# Collect all residuals from all tasks
ALL_RESIDUALS=""
if [ -d "$TASKS_DIR" ]; then
  for f in $(find "$TASKS_DIR" -name "residuals.jsonl" 2>/dev/null); do
    if [ -f "$f" ]; then
      CONTENT=$(cat "$f" 2>/dev/null)
      if [ -n "$CONTENT" ]; then
        ALL_RESIDUALS="$ALL_RESIDUALS
$CONTENT"
      fi
    fi
  done
fi

# If no residuals found, write minimal bridge file
if [ -z "$ALL_RESIDUALS" ]; then
  cat > "$BRIDGE_FILE" << 'BRIDGEEOF'
# AttnRes Bridge — Claude Code → OpenClaw
> Last sync: no residuals yet

No agent residuals available. Claude Code agents have not produced findings yet.
BRIDGEEOF
  exit 0
fi

# Sort by confidence (high first), take top 10, format as bridge file
TOP=$(echo "$ALL_RESIDUALS" | grep -v '^$' | \
  jq -s '
    [.[] | select(.confidence == "high")] +
    [.[] | select(.confidence == "medium")] +
    [.[] | select(.confidence == "low")]
    | .[0:10]
  ' 2>/dev/null)

if [ -z "$TOP" ] || [ "$TOP" = "null" ]; then
  exit 0
fi

# Generate the bridge markdown
{
  echo "# AttnRes Bridge — Claude Code -> OpenClaw"
  echo "> Last sync: $TIMESTAMP"
  echo "> Source: Claude Code pre-compact hook"
  echo "> Protocol: Read entries with weight > 0.3 fully; skim 0.1-0.3; skip < 0.1"
  echo ""

  # Write each residual as a structured block
  echo "$TOP" | jq -r '.[] | "## [\(.agent)] \(.summary)\n- **Task:** \(.taskId)\n- **Phase:** \(.phase)\n- **Confidence:** \(.confidence)\n- **Weight:** \(if .weight then .weight else 0.5 end)\n- **Tags:** \(.tags | join(", "))\n- **Decisions:** \(.decisions | join("; "))\n- **Risks:** \(if (.risks | length) > 0 then (.risks | join("; ")) else "none" end)\n- **Timestamp:** \(.timestamp)\n"' 2>/dev/null

} > "$BRIDGE_FILE"

# Log the sync event
LOG_DIR="$ROOT/.claude/artifacts/audit"
mkdir -p "$LOG_DIR"
COUNT=$(echo "$TOP" | jq 'length' 2>/dev/null)
echo "{\"ts\":\"$TIMESTAMP\",\"tool\":\"attnres-bridge\",\"input_preview\":\"synced $COUNT residuals to OpenClaw\"}" >> "$LOG_DIR/log.jsonl"

exit 0
