# Empire PowerShell Profile
# Copy this to your $PROFILE path or source it: . D:\~Claude\scripts\powershell-profile.ps1
#
# On Windows: C:\Users\<user>\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
# On Linux:   ~/.config/powershell/Microsoft.PowerShell_profile.ps1

# cc = Claude Code, always runs from Empire command center
function cc { Push-Location "D:\~Claude"; claude --dangerously-skip-permissions $args; Pop-Location }

# Power Profile Switchers (run as admin for full effect)
function dev {
    $script = "C:\Users\adity\scripts\power-profiles\Dev-Mode.ps1"
    if ((New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        & $script
    } else {
        Start-Process pwsh -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" -Verb RunAs
    }
}

function ai {
    $script = "C:\Users\adity\scripts\power-profiles\AI-Mode.ps1"
    if ((New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        & $script
    } else {
        Start-Process pwsh -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" -Verb RunAs
    }
}

function pstatus { & "C:\Users\adity\scripts\power-profiles\Profile-Status.ps1" }
