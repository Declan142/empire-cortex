# Agent Hierarchy & Models

```
Human → Lead (Opus) → Scout, Builder, Critic (Sonnet) + Guardian (Haiku)
Scheduled: dep-auditor, issue-triager (Haiku) | auto-reviewer, report-generator (Sonnet)
```

- Lead (Opus): decomposition, synthesis, final decisions — 10% token budget
- Scout (Sonnet): all research FIRST — never escalate research to Opus
- Builder (Sonnet): implementation, testing, PRs
- Critic (Sonnet): code review, security audit
- Guardian (Haiku): background monitor, anomaly detection
- Scheduled agents run daily/weekly via hooks or cron

Each agent has persistent memory via `memory: project` in frontmatter.
Agent memory lives in `.claude/agent-memory/<agent-name>/`.
