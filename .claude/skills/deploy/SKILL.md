---
name: deploy
description: "Run the full Empire deployment pipeline — Scout researches, Builder implements, Critic reviews, then PR. Use when implementing a feature or fix end-to-end."
disable-model-invocation: true
argument-hint: "[task-description]"
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/scripts/pre-deploy-check.sh"
---

# /deploy — Full Pipeline

Deploy a feature or fix through the Empire pipeline: $ARGUMENTS

## Pipeline

1. **Scout** — research the task, gather context, identify affected files
2. **Builder** — implement in feature branch (`builder/{task-id}-{slug}`)
3. **Test** — run test suite, fix failures
4. **Critic** — review the implementation
5. **Ship** — PR if approved, fix if changes requested, stop if blocked

## Rules

- Always `git pull` before creating feature branch
- Run tests BEFORE spawning Critic — don't waste review on broken code
- If Critic blocks, retry once — if still blocked, report to user
- Never skip the Scout phase, even for "simple" tasks
- Update progress.json after each phase

## Gotchas

- Check if branch already exists: `git branch --list builder/*` before creating
- If tests fail and it's a pre-existing issue, document it and proceed
- Critic may request changes that conflict with Scout findings — defer to user
- Don't create PR if there are uncommitted changes — commit everything first
- If `gh` CLI is not authenticated, warn user instead of failing silently
