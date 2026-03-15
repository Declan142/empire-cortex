# Task 003: OpenClaw + Claude Code — Latest State (March 16, 2026)

## Corrections From Prior Research

| Claim | Old | Real |
|-------|-----|------|
| Chrome browser | Isolated headless only | **3 profiles: openclaw, user (logged-in!), chrome-relay** |
| OAuth/Max auth | "Dead" | Docs show setup-token flow, but field reports: unreliable (401s) |
| Safe version | v2026.3.11 | **v2026.3.13** (March 14) |
| Claude Code hooks | 24+ | **22 events, 4 handler types** (command, http, prompt, agent) |
| Agent SDK | Claude Code SDK | **Renamed: Claude Agent SDK v0.1.48** |

---

## OpenClaw v2026.3.13 — What's Actually New

### Chrome Logged-In Profile (The Big One)
- `profile='user'` — attaches to your RUNNING Chrome via DevTools Protocol
- Reuses all your logged-in sessions (Gmail, GitHub, Notion, etc.)
- No extension needed, just enable `chrome://inspect/#remote-debugging`
- `profile='chrome-relay'` — extension-based tab-level control
- Browser action batching, selector targeting, delayed clicks

### Dashboard v2 (v2026.3.12)
- Modular views: overview, chat, config, agents, sessions
- Command palette
- Fast Mode toggle (speed vs quality per session)

### Plugin Architecture (v2026.3.12)
- Ollama, SGLang, vLLM as swappable provider plugins
- Smaller core, extensible

### Other v2026.3.13
- Docker OPENCLAW_TZ timezone env var
- Memory: single root file load fix (no duplication)
- Per-agent config override restored (was broken in .12)
- Telegram webhook secret validation
- Security: single-use bootstrap codes, boundary marker sanitization

---

## Claude Code Latest (v2.1.76 — March 14, 2026)

### Surfaces
- Terminal CLI, VS Code, JetBrains (beta), Desktop app, Web (claude.ai/code), Chrome extension, Slack, GitHub Actions, GitLab CI

### Chrome Integration (Claude Code side)
- `claude --chrome` or `/chrome` in session
- Shares browser login state — interact with any site you're signed into
- Requires Chrome extension v1.0.36+ and paid plan
- **Does NOT work in WSL** — must run Claude Code natively on Windows

### New Hooks (22 events total)
- New: InstructionsLoaded, PostCompact, Elicitation, ElicitationResult
- 4 handler types: command (shell), http (POST endpoint), prompt (LLM call), agent (subagent with tools)
- async:true for non-blocking background hooks

### MCP Updates
- Elicitation: MCP servers request structured user input mid-task
- Tool Search: lazy-loads tools on demand (95% context reduction)
- `claude mcp serve` — use Claude Code ITSELF as an MCP server
- OAuth 2.0 client for remote MCP servers

### Agent SDK v0.1.48
- Renamed from Claude Code SDK → Claude Agent SDK
- Python + TypeScript
- Same tools/hooks/agent loop as CLI but programmatic
- Xcode 26.3 native integration
- Auth: ANTHROPIC_API_KEY only (OAuth NOT permitted for SDK apps)

### Key Releases (March 2026)
| Version | Date | Highlights |
|---------|------|-----------|
| v2.1.76 | Mar 14 | MCP Elicitation, PostCompact hook, /effort command |
| v2.1.75 | Mar 13 | 1M context for Opus 4.6 on Max, /color command |
| v2.1.74 | Mar 12 | /context command, autoMemoryDirectory |
| v2.1.71 | Mar 7 | /loop cron scheduling, voice push-to-talk (20 langs) |
| v2.1.69 | Mar 5 | InstructionsLoaded hook, /claude-api skill |
| v2.1.68 | Mar 4 | Opus 4.6 default on Max/Team |

---

## Auth Reality Check

### What the docs say
- OpenClaw docs show a `claude setup-token` flow for Max/Pro subscribers
- Config: `auth.profiles.anthropic:setup-token`

### What actually happens in the field
- GitHub issues #17689, #23538, #39423: 401 rejections
- Root cause: OpenClaw user-agent includes `(external, cli)` — Anthropic detects it's not real Claude Code
- Community patch exists but breaks on every update
- Issue #17689 closed administratively, not fixed

### Working auth paths
1. **API key** (`sk-ant-api03-*`) from console.anthropic.com — stable, pay-per-use
2. **openclaw-plugin-claude-code** — runs real Claude Code CLI in containers, uses Max subscription legitimately
3. **claude-max-api-proxy** (port 3456) — community tool, ToS risk

---

## Integration Architecture (Updated)

### Claude Code ↔ OpenClaw Bridge
| Pattern | Direction | What |
|---------|-----------|------|
| openclaw-mcp-server | CC → OC | Claude Code calls OpenClaw tools (messaging, memory, scheduling) |
| openclaw-claude-code-skill | OC → CC | OpenClaw delegates coding to Claude Code |
| openclaw-plugin-claude-code | OC → CC containers | Uses Max subscription, no API key needed |
| claude mcp serve | CC as server | Claude Code exposes Read/Edit/Bash as MCP tools |

### Chrome Synergy
- OpenClaw: profile='user' attaches to Chrome for web automation
- Claude Code: /chrome attaches to Chrome for dev/debugging
- Both can share the same Chrome instance (different DevTools sessions)
