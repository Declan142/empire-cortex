# Empire V3 — Full Architecture

## Overview
A self-hosted AI agent system running entirely on one Windows 11 machine.
You send commands via Telegram → agents do the work → you get results back.
GitHub is the single source of truth. All work flows through repos.

---

## Physical Layer (your machine)

```
Windows 11 (32GB RAM)
├── Docker Desktop          — container runtime
├── WSL2 / Ubuntu           — Linux environment for all services
│   ├── NanoClaw            — systemd service, port 3001
│   ├── nanoclaw-agent:latest — Docker image (693MB), spawned per task
│   └── Langfuse stack      — 6 Docker containers, port 3000
└── D:\~Claude              — Empire command center (this repo)
```

---

## Service Layer

### NanoClaw
- **What:** Lightweight Claude assistant / agent dispatcher
- **Where:** `~/nanoclaw` in WSL Ubuntu
- **Process:** systemd service `nanoclaw.service` — auto-starts on WSL boot
- **Credential proxy:** port 3001, OAuth mode (Claude Max token, no API key needed)
- **Trigger word:** `@Andy`
- **Logs:** `wsl -d Ubuntu -u root -- journalctl -u nanoclaw -f`
- **Restart:** `wsl -d Ubuntu -u root -- systemctl restart nanoclaw`
- **Source:** fork of `qwibitai/nanoclaw` + `qwibitai/nanoclaw-telegram` merged

### nanoclaw-agent Docker Image
- **What:** The worker container spawned for each agent task
- **Base:** `node:22-slim` + Chromium + Claude Code CLI
- **Size:** 693MB
- **Lifecycle:** spawned on message → Claude runs task → container exits
- **Isolation:** each task gets its own container, fully isolated
- **Dockerfile:** `~/nanoclaw/container/Dockerfile`
- **Rebuild:** `wsl -d Ubuntu -- bash -c "cd ~/nanoclaw && docker build -t nanoclaw-agent:latest ./container/"`

### Telegram Channel
- **Bot:** `@aditya7274nano_bot`
- **Token:** stored in `~/nanoclaw/.env`
- **Trigger:** mention `@Andy` in a message
- **Flow:** Telegram API → NanoClaw polls → stores message → spawns container → gets reply → sends back

### Langfuse (Observability — parked)
- **What:** LLM observability dashboard (traces, token costs, latency)
- **Where:** `~/langfuse/docker-compose.yml` in WSL
- **UI:** `http://localhost:3000` — login: `wickedrita@gmail.com` / `Empire2026!`
- **Stack:** postgres + redis + clickhouse + minio + langfuse-web + langfuse-worker
- **Status:** running but showing 0 traces — NanoClaw has no Langfuse SDK calls yet
- **Start:** `wsl -d Ubuntu -u aditya -- bash -c 'cd ~/langfuse && docker compose --env-file .env up -d'`

---

## Agent Layer

### Hierarchy
```
Human (Aditya)
    └── Lead (Claude Opus 4) — decomposes tasks, assigns agents, synthesizes results
         ├── Scout   (Sonnet) — research only, read-only, writes to artifacts/tasks/{id}/research.md
         ├── Builder (Sonnet) — implements in feature branches, commits with Co-Authored-By
         ├── Critic  (Sonnet) — reviews code, writes to artifacts/tasks/{id}/review.md, approves PRs
         └── Guardian (Haiku) — silent monitor, flags anomalies and cost overruns

Scheduled (background):
         ├── dep-auditor    (Haiku)  — daily dependency audit
         ├── issue-triager  (Haiku)  — daily GitHub issue triage
         ├── auto-reviewer  (Sonnet) — triggers on new PRs
         └── report-generator (Sonnet) — weekly summary
```

### Token Budget
| Agent | Model | Budget |
|---|---|---|
| Lead | Opus | 10% |
| Scout, Builder, Critic, scheduled | Sonnet | 70% |
| Guardian, dep-auditor, issue-triager | Haiku | 20% |

### Token Optimization (ACON Principle)
- **Compress Observations, Preserve Decisions** — agents compress what they saw, write decisions in full
- **CodeAgents format** — pseudocode + English comments, not prose (~55-87% fewer tokens)
- **File references** — agents cite `path:line` instead of pasting file contents
- **State to files** — agents write to `artifacts/tasks/{id}/` files, not inline messages
- **50K guardrail** — Guardian flags sessions that burn 50K tokens without shipping

---

## Git Workflow

```
Every task:
  1. Scout researches → writes artifacts/tasks/{id}/research.md
  2. Lead assigns Builder
  3. Builder creates branch: {agent}/{task-id}-{slug}
  4. Builder implements → commits with Co-Authored-By trailer
  5. Critic reviews → writes artifacts/tasks/{id}/review.md
  6. If APPROVED → merge to master → push
  7. Audit log entry appended to artifacts/audit/log.jsonl
```

- **Never push to main without CI passing**
- **Never force-push**
- **Feature branches only**, naming: `builder/42-add-auth`

---

## File Structure

```
D:/~Claude/                         (command center repo)
├── CLAUDE.md                       (constitution — Priority 0)
├── ARCHITECTURE.md                 (this file)
├── .gitattributes                  (LF enforcement for shell scripts)
├── src/
│   ├── health.sh                   (Empire health dashboard — 6 checks)
│   └── health.ps1                  (Windows launcher for health.sh)
└── .claude/
    ├── agents/                     (8 agent definition files)
    ├── hooks/                      (governance scripts)
    ├── skills/                     (custom slash commands)
    ├── settings.json               (project settings)
    └── artifacts/
        ├── tasks/
        │   └── 001/                (health dashboard — completed)
        │       ├── research.md
        │       ├── implementation.md
        │       └── review.md
        ├── audit/log.jsonl         (immutable audit trail)
        └── progress.json           (cross-session handoff state)
```

---

## Message Flow (end to end)

```
1. You: "@Andy write me a Python script to rename files"
2. Telegram API receives message
3. NanoClaw (WSL systemd) polls Telegram, stores message in SQLite DB
4. NanoClaw spawns Docker container: nanoclaw-agent:latest
5. Container starts, Claude Code CLI initializes
6. Claude reads message, thinks, uses tools (writes files, runs commands)
7. Claude produces response
8. Container exits, output passed back to NanoClaw
9. NanoClaw sends reply to Telegram
10. You receive the script
```

---

## What's Not Built Yet

| Feature | Priority | Notes |
|---|---|---|
| Empire web dashboard | HIGH | Animated UI, real-time status, drag-and-drop task board |
| Langfuse SDK instrumentation | MEDIUM | Wire traces into NanoClaw source |
| WhatsApp channel | MEDIUM | Same pattern as Telegram |
| Scheduled agents (cron) | MEDIUM | dep-auditor, issue-triager |
| OpenClaw web UI | LOW | Optional browser-based chat |

---

## Quick Reference

| Task | Command |
|---|---|
| Health check | `.\src\health.ps1` (from D:\~Claude) |
| NanoClaw logs | `wsl -d Ubuntu -u root -- journalctl -u nanoclaw -f` |
| Restart NanoClaw | `wsl -d Ubuntu -u root -- systemctl restart nanoclaw` |
| Langfuse UI | `http://localhost:3000` |
| Start Langfuse | `wsl -d Ubuntu -u aditya -- bash -c 'cd ~/langfuse && docker compose --env-file .env up -d'` |
| Rebuild agent image | `wsl -d Ubuntu -- bash -c "cd ~/nanoclaw && docker build -t nanoclaw-agent:latest ./container/"` |
