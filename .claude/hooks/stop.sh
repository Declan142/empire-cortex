#!/bin/bash
# Stop hook — quality gate before session ends
# Checks if progress.json was updated and artifacts were written

PROGRESS_FILE="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")/.claude/artifacts/progress.json"

# Warn if progress.json wasn't updated this session
if [ -f "$PROGRESS_FILE" ]; then
  LAST_UPDATE=$(stat -c %Y "$PROGRESS_FILE" 2>/dev/null || stat -f %m "$PROGRESS_FILE" 2>/dev/null)
  NOW=$(date +%s)
  AGE=$(( NOW - LAST_UPDATE ))

  # If progress.json is older than 1 hour, warn
  if [ "$AGE" -gt 3600 ]; then
    echo "WARNING: progress.json hasn't been updated this session. State may be lost on next session."
  fi
fi

exit 0
