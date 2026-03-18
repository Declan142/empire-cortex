#!/usr/bin/env bash
# ============================================================================
# Empire Post-Install Bootstrap Script
# ============================================================================
# Run this AFTER NixOS is installed and you've booted into your new system.
#
# What this script does:
#   1. Installs npm global tools (Claude Code CLI, Codex CLI)
#   2. Clones the Empire Command Center repo
#   3. Sets up OpenClaw as a systemd user service
#   4. Prompts for API keys and writes them to ~/.env.empire
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
# ============================================================================

set -euo pipefail

# --- Colors ---------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# --- Preflight checks -----------------------------------------------------
if [[ $EUID -eq 0 ]]; then
  err "Don't run this as root. Run as your normal user (aditya)."
  exit 1
fi

if ! command -v node &>/dev/null; then
  err "Node.js not found. Did the NixOS config apply correctly?"
  exit 1
fi

info "Node.js $(node --version) detected"
info "npm $(npm --version) detected"
echo ""

# --- Step 1: npm global tools ---------------------------------------------
info "=== Step 1: Installing npm global packages ==="

# Set npm global prefix to user directory (avoids sudo for global installs)
NPM_GLOBAL_DIR="$HOME/.npm-global"
mkdir -p "$NPM_GLOBAL_DIR"
npm config set prefix "$NPM_GLOBAL_DIR"

# Ensure the path is in bashrc
if ! grep -q 'npm-global/bin' "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" << 'BASHRC'

# npm global binaries
export PATH="$HOME/.npm-global/bin:$PATH"
BASHRC
  info "Added npm-global/bin to PATH in ~/.bashrc"
fi

# Export for current session
export PATH="$NPM_GLOBAL_DIR/bin:$PATH"

info "Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code && ok "Claude Code CLI installed" || warn "Claude Code CLI install failed — install manually later"

info "Installing Codex CLI..."
npm install -g @openai/codex && ok "Codex CLI installed" || warn "Codex CLI install failed — install manually later"

echo ""

# --- Step 2: Clone Empire repo --------------------------------------------
info "=== Step 2: Cloning Empire Command Center ==="

EMPIRE_DIR="$HOME/empire-command-center"

if [[ -d "$EMPIRE_DIR" ]]; then
  warn "Directory $EMPIRE_DIR already exists, skipping clone"
else
  git clone https://github.com/Declan142/empire-command-center.git "$EMPIRE_DIR"
  ok "Cloned to $EMPIRE_DIR"
fi

echo ""

# --- Step 3: API Keys -----------------------------------------------------
info "=== Step 3: API Keys & Secrets ==="
info "These will be saved to ~/.env.empire (chmod 600)"
info "Press Enter to skip any key you don't have yet."
echo ""

ENV_FILE="$HOME/.env.empire"

read -rp "Anthropic API Key (ANTHROPIC_API_KEY): " ANTHROPIC_KEY
read -rp "OpenAI API Key (OPENAI_API_KEY): " OPENAI_KEY
read -rp "GitHub Personal Access Token (GITHUB_TOKEN): " GH_TOKEN
read -rp "OpenClaw port [18789]: " OC_PORT
OC_PORT="${OC_PORT:-18789}"

cat > "$ENV_FILE" << EOF
# Empire Environment — generated $(date -Iseconds)
# Source this file: source ~/.env.empire

ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
OPENAI_API_KEY=${OPENAI_KEY}
GITHUB_TOKEN=${GH_TOKEN}
OPENCLAW_PORT=${OC_PORT}
EOF

chmod 600 "$ENV_FILE"
ok "Saved to $ENV_FILE (permissions: 600)"

# Add sourcing to bashrc if not already present
if ! grep -q 'env.empire' "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" << 'BASHRC'

# Empire environment
[ -f "$HOME/.env.empire" ] && source "$HOME/.env.empire"
BASHRC
  info "Added auto-source of ~/.env.empire to ~/.bashrc"
fi

echo ""

# --- Step 4: OpenClaw systemd user service --------------------------------
info "=== Step 4: Setting up OpenClaw systemd user service ==="

# Install OpenClaw dependencies if package.json exists
OPENCLAW_DIR="$EMPIRE_DIR/openclaw"
if [[ -d "$OPENCLAW_DIR" ]] && [[ -f "$OPENCLAW_DIR/package.json" ]]; then
  info "Installing OpenClaw dependencies..."
  (cd "$OPENCLAW_DIR" && npm install)
  ok "OpenClaw dependencies installed"
  OPENCLAW_EXEC="$OPENCLAW_DIR/node_modules/.bin/openclaw"
  OPENCLAW_WORKDIR="$OPENCLAW_DIR"
else
  # Fallback: OpenClaw might be an npm global or in a different location
  warn "OpenClaw directory not found at $OPENCLAW_DIR"
  info "Installing openclaw globally as fallback..."
  npm install -g openclaw && ok "OpenClaw installed globally" || warn "OpenClaw global install failed"
  OPENCLAW_EXEC="$NPM_GLOBAL_DIR/bin/openclaw"
  OPENCLAW_WORKDIR="$HOME"
fi

# Create systemd user service
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"

cat > "$SYSTEMD_USER_DIR/openclaw.service" << EOF
[Unit]
Description=OpenClaw Messaging Gateway
Documentation=https://github.com/Declan142/empire-command-center
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${OPENCLAW_WORKDIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${OPENCLAW_EXEC} serve --port ${OC_PORT}
Restart=on-failure
RestartSec=5

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=openclaw

[Install]
WantedBy=default.target
EOF

# Enable lingering so user services start at boot (not just at login)
sudo loginctl enable-linger aditya 2>/dev/null || warn "Could not enable linger — run: sudo loginctl enable-linger aditya"

# Reload and enable the service
systemctl --user daemon-reload
systemctl --user enable openclaw.service
ok "OpenClaw service created and enabled"

info "Start it now with: systemctl --user start openclaw"
info "Check status with: systemctl --user status openclaw"
info "View logs with:    journalctl --user -u openclaw -f"
echo ""

# --- Step 5: Git config ---------------------------------------------------
info "=== Step 5: Git configuration ==="

CURRENT_NAME=$(git config --global user.name 2>/dev/null || echo "")
CURRENT_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

if [[ -z "$CURRENT_NAME" ]]; then
  read -rp "Git user.name [Aditya Sharma]: " GIT_NAME
  GIT_NAME="${GIT_NAME:-Aditya Sharma}"
  git config --global user.name "$GIT_NAME"
  ok "Set git user.name = $GIT_NAME"
else
  info "Git user.name already set: $CURRENT_NAME"
fi

if [[ -z "$CURRENT_EMAIL" ]]; then
  read -rp "Git user.email: " GIT_EMAIL
  if [[ -n "$GIT_EMAIL" ]]; then
    git config --global user.email "$GIT_EMAIL"
    ok "Set git user.email = $GIT_EMAIL"
  else
    warn "Skipped — set later with: git config --global user.email you@example.com"
  fi
else
  info "Git user.email already set: $CURRENT_EMAIL"
fi

echo ""

# --- Done ------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Empire bootstrap complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Open a new terminal (or run: source ~/.bashrc)"
echo "  2. Run 'claude' to launch Claude Code CLI"
echo "  3. Run 'systemctl --user start openclaw' to start OpenClaw"
echo "  4. Mount your Windows drive (edit hardware-configuration.nix, uncomment fstab entry)"
echo "  5. Update your timezone in configuration.nix if needed"
echo ""
echo "Useful commands:"
echo "  sudo nixos-rebuild switch --flake ~/nixos-config#empire   # Rebuild system"
echo "  nix flake update ~/nixos-config                           # Update packages"
echo "  journalctl --user -u openclaw -f                          # OpenClaw logs"
echo ""
