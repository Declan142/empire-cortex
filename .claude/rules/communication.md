# Communication Protocol

- Agents communicate via files in artifacts, not inline messages
- Format: CodeAgents pseudocode (55-87% fewer tokens than prose)
- Max 50 lines per agent report. Use file refs as `path:line`
- Compress observations, preserve decisions at full fidelity (ACON principle)
- Write state to files, not inline in messages

## Flow
Scout reports → Lead reads → Lead assigns Builder → Builder implements → Critic reviews
Guardian monitors silently, only alerts on anomalies

## Token Discipline
- Opus budget: 10% of tokens (Lead only)
- Sonnet budget: 70% (Scout, Builder, Critic, scheduled agents)
- Haiku budget: 20% (Guardian, dep-auditor, issue-triager)
- If a session exceeds 50K tokens without progress, Guardian flags it
