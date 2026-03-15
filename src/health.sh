#!/usr/bin/env bash
# Empire Health Dashboard
# Run via: wsl -d Ubuntu -u aditya -- bash /mnt/d/~Claude/src/health.sh

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
CYAN='\033[36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; }
hdr()  { echo -e "\n${CYAN}${BOLD}▶ $*${RESET}"; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "═══════════════════════════════════════════"
echo "        EMPIRE HEALTH CHECK                "
echo "        $(date '+%Y-%m-%d %H:%M:%S %Z')   "
echo "═══════════════════════════════════════════"
echo -e "${RESET}"

# ── Check 1: NanoClaw systemd service ─────────────────────────────────────────
hdr "NanoClaw Service (systemd)"
NC_STATE=$(systemctl is-active nanoclaw 2>/dev/null || echo "inactive")
if [[ "$NC_STATE" == "active" ]]; then
    ok "nanoclaw.service — ${GREEN}running${RESET}"
else
    fail "nanoclaw.service — ${RED}${NC_STATE}${RESET}"
fi

# ── Check 2: Docker containers ────────────────────────────────────────────────
hdr "Docker Containers"
if docker info &>/dev/null; then
    CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null)
    if [[ -z "$(docker ps -q 2>/dev/null)" ]]; then
        warn "No containers running"
    else
        # Print each container line with color coding
        while IFS= read -r line; do
            if [[ "$line" == NAME* ]]; then
                echo -e "  ${BOLD}${line}${RESET}"
            elif echo "$line" | grep -qi "up"; then
                ok "$line"
            else
                fail "$line"
            fi
        done <<< "$CONTAINERS"
    fi

    # Specifically flag nanoclaw-agent and langfuse containers
    for svc in "nanoclaw-agent" "langfuse"; do
        MATCH=$(docker ps --filter "name=${svc}" --format "{{.Names}}" 2>/dev/null | head -1)
        if [[ -n "$MATCH" ]]; then
            ok "${svc} container present: ${MATCH}"
        else
            warn "${svc} container NOT found (may be normal if no active job)"
        fi
    done
else
    fail "Docker daemon unreachable"
fi

# ── Check 3: Langfuse HTTP health ─────────────────────────────────────────────
hdr "Langfuse Health (http://localhost:3000)"
LF_RESP=$(curl -s --max-time 5 http://localhost:3000/api/public/health 2>/dev/null || echo "")
if echo "$LF_RESP" | grep -qi '"status":"ok"' 2>/dev/null || \
   echo "$LF_RESP" | grep -qi '"healthy"' 2>/dev/null || \
   echo "$LF_RESP" | grep -qi 'ok' 2>/dev/null; then
    ok "Langfuse API healthy — response: ${LF_RESP:0:80}"
elif [[ -n "$LF_RESP" ]]; then
    warn "Langfuse responded but status unclear: ${LF_RESP:0:80}"
else
    fail "Langfuse unreachable (timeout or connection refused)"
fi

# ── Check 4: Telegram bot last seen ───────────────────────────────────────────
hdr "Telegram Bot (@aditya7274nano_bot)"
TG_LINE=$(journalctl -u nanoclaw -n 100 --no-pager 2>/dev/null \
    | grep -i "telegram bot connected\|telegram.*start\|polling\|bot.*ready" \
    | tail -1 || echo "")
if [[ -n "$TG_LINE" ]]; then
    ok "Last Telegram event: ${TG_LINE:0:120}"
else
    warn "No recent Telegram connection entry found in nanoclaw journal"
fi

# ── Check 5: Last NanoClaw log lines ──────────────────────────────────────────
hdr "NanoClaw Recent Logs (last 3 lines)"
LOG_LINES=$(journalctl -u nanoclaw -n 3 --no-pager 2>/dev/null || echo "  (no logs)")
if [[ -z "$LOG_LINES" ]]; then
    warn "(no journal entries)"
else
    while IFS= read -r line; do
        echo -e "  ${YELLOW}│${RESET} $line"
    done <<< "$LOG_LINES"
fi

# ── Check 6: Git status of D:/~Claude ─────────────────────────────────────────
hdr "Git Repo Status (/mnt/d/~Claude)"
REPO="/mnt/d/~Claude"
if [[ -d "$REPO/.git" ]]; then
    LAST_COMMIT=$(git -C "$REPO" log -1 --pretty=format:"%h %s (%cr)" 2>/dev/null || echo "unknown")
    ok "Last commit: ${LAST_COMMIT}"

    BRANCH=$(git -C "$REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    echo -e "  ${CYAN}Branch:${RESET} ${BRANCH}"

    DIRTY=$(git -C "$REPO" status --porcelain 2>/dev/null || echo "")
    if [[ -z "$DIRTY" ]]; then
        ok "Working tree clean"
    else
        DIRTY_COUNT=$(echo "$DIRTY" | wc -l)
        warn "${DIRTY_COUNT} uncommitted change(s):"
        echo "$DIRTY" | head -10 | while IFS= read -r line; do
            echo -e "    ${YELLOW}${line}${RESET}"
        done
        [[ "$DIRTY_COUNT" -gt 10 ]] && warn "  ... and $((DIRTY_COUNT - 10)) more"
    fi
else
    fail "Repo not found at ${REPO}"
fi

# ── Footer ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}═══════════════════════════════════════════${RESET}"
echo -e "${CYAN}Empire health check complete.${RESET}"
echo ""
