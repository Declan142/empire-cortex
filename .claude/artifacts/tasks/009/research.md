# Task 009 — Skills Architecture Research (2x Opus)

**Date:** 2026-03-19
**Status:** Complete

---

## Thariq's 9 Skill Categories

| # | Category | Example |
|---|----------|---------|
| 1 | Library & API Reference | SDK docs + code snippets + gotchas |
| 2 | Product Verification | Playwright tests, tmux-based verification |
| 3 | Data Fetching & Analysis | BigQuery + domain-specific reference files |
| 4 | Business Process Automation | Multi-skill + MCP workflows |
| 5 | Code Scaffolding & Templates | Repo-specific boilerplate generators |
| 6 | Code Quality & Review | Adversarial review subagents, style enforcement |
| 7 | CI/CD & Deployment | PR monitoring, test, deploy, auto-rollback |
| 8 | Runbooks | Symptom → structured investigation across systems |
| 9 | Infrastructure Operations | Ops procedures with destructive-action safeguards |

## Key Insights

### Gotchas = Highest Signal
- Build from **observed failures**, not theory
- Iteratively updated as new failures found
- Push Claude out of "default thinking patterns"

### Progressive Disclosure via File System
- SKILL.md = table of contents (< 500 lines)
- Reference files loaded only when needed (zero token cost until read)
- One level deep only (SKILL.md → reference, never reference → sub-reference)

### Description = Trigger Condition
- Write in third person (injected into system prompt)
- Include WHAT + WHEN to use
- Bad: "Helps with documents"
- Good: "Extract text from PDFs. Use when working with PDF files or document extraction."

### On-Demand Hooks
- `/careful` — blocks rm -rf, DROP TABLE, force-push via PreToolUse
- `/freeze` — blocks Edit/Write outside specific directory
- Hooks only active while skill runs, auto-cleaned up after

### Skills vs Rules vs CLAUDE.md
- CLAUDE.md: memory (always loaded)
- Skills: routines (on-demand)
- Hooks: guarantees (deterministic)
- Agents: delegation (isolated)

## SKILL.md Format

```yaml
---
name: my-skill
description: "Third person trigger condition"
allowed-tools: Read, Grep, Glob
model: sonnet
context: fork              # run in isolated subagent
agent: general-purpose     # which subagent type
disable-model-invocation: true  # user-only
user-invocable: false      # Claude-only (background)
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/check.sh"
---

Instructions here. $ARGUMENTS for user input.
!`command` for dynamic context injection.
${CLAUDE_SKILL_DIR} for referencing bundled files.
```

## Sources
- [Thariq Skills Thread](https://x.com/trq212/status/2033949937936085378)
- [TechTwitter Article](https://www.techtwitter.com/articles/lessons-from-building-claude-code-how-we-use-skills)
- [Official Skills Docs](https://code.claude.com/docs/en/skills)
- [Official Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Anthropic Skills Repo (97K stars)](https://github.com/anthropics/skills)
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [Agent Skills Standard](https://agentskills.io/specification)
- [Interview Pattern Gist](https://gist.github.com/robzolkos/40b70ed2dd045603149c6b3eed4649ad)
