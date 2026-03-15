# Empire Health Dashboard — Windows launcher
# Delegates to the bash script running inside WSL Ubuntu as user aditya
# Usage: .\health.ps1

wsl -d Ubuntu -u aditya -- bash /mnt/d/~Claude/src/health.sh
