# Empire Skills Revolution — Implementation Plan

**Task:** 009
**Date:** 2026-03-19
**Based on:** Thariq's 9 categories + official docs + community patterns

---

## Current State: 5 flat .md files (no power)

```
.claude/skills/
├── status.md        ← no hooks, no scripts, no references
├── deploy.md        ← no pre-deploy checks, no rollback
├── audit.md         ← no filtering, no dynamic context
├── scout-report.md  ← no memory, no progressive disclosure
└── weekly-report.md ← no templates, no data fetching
```

## Target State: Folder-based skills with full power

```
.claude/skills/
├── interview/               ← NEW — Thariq's killer pattern
│   └── SKILL.md
├── careful/                 ← NEW — on-demand safety hooks
│   ├── SKILL.md
│   └── scripts/
│       └── block-destructive.sh
├── status/                  ← UPGRADED
│   ├── SKILL.md
│   └── scripts/
│       └── gather-metrics.sh
├── deploy/                  ← UPGRADED
│   ├── SKILL.md
│   ├── scripts/
│   │   ├── pre-deploy-check.sh
│   │   └── rollback.sh
│   └── gotchas.md
├── audit/                   ← UPGRADED
│   └── SKILL.md
├── scout-report/            ← UPGRADED
│   ├── SKILL.md
│   └── references/
│       └── research-template.md
├── weekly-report/           ← UPGRADED
│   ├── SKILL.md
│   └── templates/
│       └── report-template.md
├── tweet-nuke/              ← NEW — productizable tool
│   ├── SKILL.md
│   ├── scripts/
│   │   └── twitter_nuke_browser.py
│   └── gotchas.md
├── memory-sync/             ← NEW — cross-agent memory ops
│   ├── SKILL.md
│   └── scripts/
│       └── materialize-progress.sh
└── git-ops/                 ← NEW — safe git operations
    ├── SKILL.md
    ├── scripts/
    │   └── branch-cleanup.sh
    └── gotchas.md
```

---

## Skill Designs

### 1. /interview — The Killer Skill (Thariq Pattern)

```yaml
---
name: interview
description: "Conduct a deep requirements interview using AskUserQuestionTool before building. Use when planning a large feature, designing architecture, or when requirements are unclear."
model: opus
---
```

```markdown
Read the spec or prompt provided by the user: $ARGUMENTS

Interview the user in detail using the AskUserQuestionTool about:
- Technical implementation details
- UI & UX decisions
- Edge cases and error handling
- Performance and scaling concerns
- Security implications
- Tradeoffs between approaches

Rules:
- Ask NON-OBVIOUS questions only — skip anything Claude already knows
- Continue interviewing until the user says "done" or you've covered all angles
- After interview, write a complete spec to `.claude/artifacts/tasks/{id}/spec.md`
- The spec should be detailed enough for a fresh session to execute without questions

## Gotchas
- Don't ask "what language/framework?" — read the codebase first
- Don't ask obvious questions about well-known patterns
- Group related questions (3 at a time via AskUserQuestionTool)
- If user gives one-word answers, probe deeper — they're thinking, not dismissing
```

### 2. /careful — On-Demand Safety Hooks

```yaml
---
name: careful
description: "Activate production safety mode — blocks destructive commands (rm -rf, DROP TABLE, force-push, kubectl delete). Use when working with production systems or sensitive data."
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/scripts/block-destructive.sh"
---
```

```markdown
# Production Safety Mode — ACTIVE

Destructive commands are now blocked:
- `rm -rf` / `del /s /q`
- `DROP TABLE` / `TRUNCATE`
- `git push --force` / `git reset --hard`
- `kubectl delete` / `docker rm -f`

Run `/careful` again or start a new session to deactivate.
```

**scripts/block-destructive.sh:**
```bash
#!/bin/bash
INPUT="$CLAUDE_TOOL_INPUT"
if echo "$INPUT" | grep -qiE 'rm -rf|drop table|truncate|force-push|--force|reset --hard|kubectl delete|docker rm'; then
  echo '{"decision":"block","reason":"🛑 BLOCKED by /careful — destructive command detected"}'
  exit 2
fi
exit 0
```

### 3. /deploy — Upgraded Pipeline

```yaml
---
name: deploy
description: "Run the full Empire deployment pipeline — Scout researches, Builder implements, Critic reviews, then PR. Use when implementing a feature or fix end-to-end."
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/scripts/pre-deploy-check.sh"
---
```

```markdown
# /deploy $ARGUMENTS

## Pipeline
1. Scout → research the task
2. Builder → implement in feature branch
3. Critic → review the implementation
4. Ship → PR if approved, fix if changes requested, stop if blocked

## Gotchas
- Always `git pull` before creating feature branch — stale branches cause merge hell
- Run tests BEFORE spawning Critic — don't waste review on broken code
- If Critic blocks, DON'T auto-retry more than once — report to user
- Never skip the Scout phase even for "simple" tasks — Scout finds things you miss
- Check if a branch with the same name already exists before creating
```

### 4. /status — Upgraded with Dynamic Context

```yaml
---
name: status
description: "Show Empire status dashboard — active tasks, git state, agent activity, recent audit events. Use when user asks about current state or progress."
---
```

```markdown
# /status

Gather and display Empire status:

1. Read `.claude/artifacts/progress.json` (or per-agent files if split)
2. Run `!git log --oneline -5` for recent commits
3. Run `!git status -s` for uncommitted changes
4. Read last 10 entries from `.claude/artifacts/audit/log.jsonl`
5. Check for guardian alerts

Format:
```
EMPIRE STATUS — {timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch: {current}
Tasks:  {active} active | {done} done | {blocked} blocked
Recent: {last 3 commits one-line}
Agents: {who ran recently}
Alerts: {guardian alerts or "✅ all clear"}
```

## Gotchas
- progress.json may not exist yet — handle gracefully
- Audit log can be huge — only read last 10 lines, not the whole file
- Git status in worktrees shows different info — check if in worktree first
```

### 5. /scout-report — With Memory & Templates

```yaml
---
name: scout-report
description: "Dispatch Scout agent to research a topic and deliver a structured report. Use when user needs research, investigation, or information gathering."
context: fork
agent: scout
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch
---
```

```markdown
# /scout-report $ARGUMENTS

Research the topic: $ARGUMENTS

## Output Format
Write findings to `.claude/artifacts/tasks/{id}/research.md` using this template:
@${CLAUDE_SKILL_DIR}/references/research-template.md

## Rules
- Check your memory first for past research on this topic
- Use file references as `path:line` — never paste large code blocks
- Max 50 lines in the report
- Include sources with links
- End with clear recommendation for Lead/Builder

## Gotchas
- WebFetch fails on Twitter/X — use WebSearch instead
- Large repos: use Grep with head_limit, don't read entire files
- If research exceeds 20 turns, summarize what you have — don't burn tokens
- Always check if someone already researched this in artifacts/tasks/
```

### 6. /tweet-nuke — Productizable Tool

```yaml
---
name: tweet-nuke
description: "Delete tweets/replies from Twitter/X using browser automation. Use when user wants to clean up their Twitter account."
disable-model-invocation: true
---
```

```markdown
# /tweet-nuke $ARGUMENTS

Delete tweets from Twitter/X using browser automation.

## Usage
- `/tweet-nuke` — delete all tweets and replies
- `/tweet-nuke --dry-run` — preview without deleting
- `/tweet-nuke --replies-only` — only delete replies

## How It Works
Runs `${CLAUDE_SKILL_DIR}/scripts/twitter_nuke_browser.py` which:
1. Launches Chromium via Playwright
2. Logs into Twitter using .env credentials
3. Navigates to profile's /with_replies tab
4. Clicks ... → Delete → Confirm for each tweet
5. Logs every deletion to twitter_nuke_log.jsonl

## Gotchas
- Needs .env with TWITTER_USERNAME and TWITTER_PASSWORD in tools/ dir
- Twitter may ask for phone/email verification — script handles it automatically
- Anti-detection pauses every 20/100 deletions — be patient for large accounts
- If stuck on one tweet, script reloads page after 15 empty scrolls
- Browser must NOT be headless — Twitter detects headless Chromium
```

### 7. /memory-sync — Cross-Agent Memory Operations

```yaml
---
name: memory-sync
description: "Materialize per-agent progress files into a unified view, or sync memory state across agents. Use when checking cross-agent state or before major operations."
user-invocable: true
---
```

```markdown
# /memory-sync

Sync and materialize the Empire memory state.

## Operations
1. Read all files in `.empire/progress/` (per-agent state files)
2. Merge into `_view.json` (materialized read-only view)
3. Report any conflicts or stale state (files older than 24h)
4. Show summary of each agent's last known state

## Gotchas
- _view.json is gitignored — never commit it
- If progress/ dir doesn't exist yet, create it from progress.json
- Stale state (>24h) should be flagged but not deleted
```

---

## Migration Steps

1. Create folder structure for each skill
2. Move existing .md content into SKILL.md with proper frontmatter
3. Add Gotchas sections based on observed failures
4. Add scripts/ and references/ where needed
5. Create new skills: interview, careful, tweet-nuke, memory-sync, git-ops
6. Delete old flat .md files
7. Test each skill: `/interview`, `/careful`, `/status`, etc.

## Priority Order

1. `/interview` — highest impact, use immediately for all new features
2. `/careful` — safety net for production work
3. `/status` — daily use, quick wins
4. `/deploy` — core pipeline
5. Rest can follow incrementally
