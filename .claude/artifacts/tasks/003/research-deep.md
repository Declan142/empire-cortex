# Task 003: OpenClaw Deep Research — Phase 2 (Beast Mode)

## Critical Blocker: API Key Situation

**sk-ant-oat01 (OAuth/Max subscription) tokens are DEAD.**
- Blocked by Anthropic server-side ~Feb 20 2026
- GitHub issue: openclaw/openclaw#17689
- Only `sk-ant-api03-*` console API keys work (separate pay-per-use billing)
- Workaround: `openclaw-plugin-claude-code` runs Claude Code CLI in containers using Max subscription
- Risky workaround: `claude-max-api-proxy` (community tool, port 3456, ToS risk)

## Native Install (No Docker)

```bash
# 1. Enable systemd in WSL2
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
# Then: wsl --shutdown in PowerShell, reopen Ubuntu

# 2. Install Node 22 LTS (if not already via nvm)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install OpenClaw
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
# OR: sudo npm install -g openclaw@latest

# 4. Onboard
openclaw onboard --flow quickstart --install-daemon

# 5. Start
openclaw gateway run --port 18789 --bind loopback
# OR daemon: openclaw gateway start
```

Latest version: v2026.3.13 (safe, all CVEs patched)
Minimum safe: v2026.3.11

## Memory Architecture (The Fix)

### Config (openclaw.json5)
```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 40000,        // double default (biggest single fix)
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          prompt: "Write lasting notes to memory/YYYY-MM-DD.md; NO_REPLY if nothing."
        }
      },
      memorySearch: {
        query: {
          hybrid: {
            enabled: true,
            vectorWeight: 0.7,
            textWeight: 0.3,
            candidateMultiplier: 4,
            mmr: { enabled: true, lambda: 0.7 },
            temporalDecay: { enabled: true, halfLifeDays: 30 }
          }
        },
        cache: { enabled: true, maxEntries: 50000 }
      }
    }
  }
}
```

### File Hierarchy (load order every session)
| File | Purpose | Limit |
|------|---------|-------|
| SOUL.md | Identity, tone, values, boundaries | 500 lines max |
| AGENTS.md | Operating rules + Memory Protocol | No hard limit |
| USER.md | Projects, preferences, environment | Keep lean |
| MEMORY.md | Cross-session decisions, curated rules | 100 lines MAX |
| memory/YYYY-MM-DD.md | Daily append-only logs | Searched on-demand only |

### Memory Protocol (bake into AGENTS.md)
```
- Before non-trivial task: memory_search("{topic}") first
- Before starting work: check memory/{today}.md for active context
- When learning something important: write it immediately
- When corrected: add correction as rule to MEMORY.md
- When session ending: summarize to memory/YYYY-MM-DD.md
```

### Plugin Stack (tiered)
| Tier | Plugin | What It Does | Install |
|------|--------|-------------|---------|
| 0 | Native config fixes | reserveTokensFloor=40000 + flush | Config only |
| 1 | Bootstrap files | SOUL.md + AGENTS.md + MEMORY.md | Manual |
| 2 | Mem0 | Auto-extract facts → Qdrant | `openclaw plugins install github:tensakulabs/openclaw-mem0` |
| 3 | openclaw-graphiti | Neo4j temporal knowledge graph | Docker Compose + plugin |
| 4 | lossless-claw | DAG immutable context | `plugins.slots.contextEngine = "lossless-claw"` |

### Embedding Models
| Model | Quality | Size | Cost |
|-------|---------|------|------|
| Gemini Embedding 001 | MTEB #1 (68.32) | Cloud | Pay-per-use |
| EmbeddingGemma-300M | ~ada-002 | 600MB local | Free (default) |
| nomic-embed-text-v1 | Beats ada-002 | 274MB local | Free |

## Skills Marketplace

Registry: ClawHub (clawhub.com) — 13,729 skills
Curated: github.com/VoltAgent/awesome-openclaw-skills — 5,366 vetted

### Day-One Must-Haves
```bash
clawhub install tavily           # AI-optimized web search
clawhub install gog              # Gmail+Calendar+Drive unified
clawhub install agent-browser    # Headless browser control
clawhub install github           # Repos, issues, PRs via chat
clawhub install capability-evolver  # Agent self-improvement
clawhub install summarize        # Document condensation
```

## Channel Setup

### Telegram
```json5
channels: {
  telegram: {
    enabled: true,
    botToken: "TOKEN_FROM_BOTFATHER",
    dmPolicy: "pairing",
    groups: { "*": { requireMention: true } }
  }
}
```
Pairing: send /start → `openclaw pairing approve telegram <CODE>`

### WhatsApp (Baileys — no Meta API needed)
```json5
channels: {
  whatsapp: {
    dmPolicy: "pairing",
    allowFrom: ["+15551234567"],
    textChunkLimit: 4000,
    sendReadReceipts: true
  }
}
```
Login: `openclaw channels login --channel whatsapp` → QR scan

### Discord
Developer Portal → Bot → Token → `openclaw config set channels.discord.token`

## Claude Code Integration Patterns

| Pattern | Direction | Repo | Best For |
|---------|-----------|------|----------|
| openclaw-mcp-server | Claude Code → OpenClaw | Helms-AI | Claude Code agents send messages, search memory |
| openclaw-claude-code-skill | OpenClaw → Claude Code | Enderfga | OpenClaw delegates coding tasks |
| openclaw-plugin-claude-code | OpenClaw → Claude Code containers | 13rac1 | Uses Max subscription, no API key |
| cc-openclaw skills | Claude Code manages OpenClaw | rahulsub-be | /openclaw-status, /openclaw-restart |

## Security Status (March 2026)

- CVE-2026-25253 (CVSS 8.8 RCE) — patched v2026.1.29
- ClawJacked class — patched v2026.2.26
- Origin bypass — patched v2026.3.11
- **1,184+ malicious ClawHub skills** — no automated vetting
- Safe minimum: **v2026.3.11+**

## Governance

- Creator Peter Steinberger joined OpenAI (Feb 15 2026)
- Project moving to open-source foundation (not yet finalized)
- 315K+ GitHub stars (surpassed React)

## Day-One Setup Sequence

1. `openclaw onboard --flow quickstart --install-daemon`
2. `openclaw dashboard` — verify web UI at :18789
3. Configure Telegram → pairing approve
4. Configure WhatsApp (dedicated number) → QR scan
5. Install 6 must-have skills
6. Write SOUL.md (50-150 lines)
7. Fix memory config (reserveTokensFloor=40000, flush enabled)
8. Install Mem0 plugin for persistent facts
9. `openclaw plugins install acpx` → ACP for IDE bridge
10. Wire openclaw-mcp-server into Claude Code settings
