#!/bin/bash
# branch-cleanup.sh — list branches safe to delete
# Only lists, never deletes — Claude handles user confirmation

echo "=== Merged branches (safe to delete) ==="
git branch --merged main 2>/dev/null | grep -v "main\|master\|\*" || echo "  (none)"

echo ""
echo "=== Stale branches (no commits in 30+ days) ==="
git for-each-ref --sort=committerdate --format='%(committerdate:relative) %(refname:short)' refs/heads/ | while read line; do
  if echo "$line" | grep -qE '(months?|years?) ago'; then
    echo "  $line"
  fi
done || echo "  (none)"
