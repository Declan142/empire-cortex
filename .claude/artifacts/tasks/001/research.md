# Task 001 — Empire Health Dashboard: Scout Research

## Objective
Single-command health check for all Empire V3 services.

## Services to Monitor
| # | Service          | Check Method                                      |
|---|------------------|---------------------------------------------------|
| 1 | NanoClaw systemd | `wsl -d Ubuntu -u root -- systemctl is-active nanoclaw` |
| 2 | Docker containers| `wsl -d Ubuntu -u aditya -- docker ps --format`   |
| 3 | Langfuse HTTP    | `curl -s http://localhost:3000/api/public/health`  |
| 4 | Telegram bot     | journalctl grep for "telegram bot connected"       |
| 5 | NanoClaw logs    | last 3 lines of nanoclaw journal                  |
| 6 | Git status       | last commit + dirty files in /mnt/d/~Claude       |

## Implementation Plan
- `src/health.sh` — bash script (WSL Ubuntu), ANSI colors, runs all 6 checks
- `src/health.ps1` — PowerShell launcher, delegates to WSL

## Key Context from progress.json
- NanoClaw service: `/etc/systemd/system/nanoclaw.service`
- Langfuse UI: `http://localhost:3000`
- Logs cmd: `journalctl -u nanoclaw`
- WSL distro: Ubuntu, users: root (systemd), aditya (docker)

## Paths
- Windows: `D:/~Claude/src/health.sh`
- WSL: `/mnt/d/~Claude/src/health.sh`
