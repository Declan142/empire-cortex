# Empire Health Dashboard — Windows launcher
# Delegates to the bash script running inside WSL Ubuntu as user aditya
# Usage: .\health.ps1

$wslState = wsl -l --running 2>&1
if ($wslState -notmatch "Ubuntu") {
    Write-Host "  [!] WSL Ubuntu is not running. Starting it..." -ForegroundColor Yellow
    wsl -d Ubuntu -- echo "WSL ready" | Out-Null
    Start-Sleep -Seconds 2
}

wsl -d Ubuntu -u aditya -- bash /mnt/d/~Claude/src/health.sh
