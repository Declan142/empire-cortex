---
name: weekly-report
description: Generate a weekly Empire status report — commits, PRs, agent activity, token usage.
user_invocable: true
---

# /weekly-report — Weekly Empire Report

Generate the weekly status report.

## Instructions
When the user runs `/weekly-report`:

1. Run `git log --oneline --since="7 days ago"` to get recent commits
2. Run `gh pr list --state all --json number,title,state,mergedAt --limit 20` for PR activity
3. Read `.claude/artifacts/audit/log.jsonl` and count events from the past 7 days
4. Read `.claude/artifacts/progress.json` for task stats
5. Check for any guardian alerts in artifacts
6. Compile into the report-generator format and save to `.claude/artifacts/tasks/weekly-{date}/report.md`

Display the report to the user.
