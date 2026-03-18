# ============================================================================
# Empire NixOS Configuration — Main System Config
# ============================================================================
# Machine : Aditya's workstation (Ryzen 7 3700X / GTX 1660 / 32GB)
# Purpose : Development + Empire Command Center
# Desktop : GNOME on Wayland (falls back to X11 if needed)
# Audio   : PipeWire (replaces PulseAudio)
# GPU     : NVIDIA proprietary drivers
# ============================================================================
{ config, pkgs, lib, ... }:

{
  # ==========================================================================
  # Nix Settings
  # ==========================================================================
  nix = {
    settings = {
      # Enable flakes and the new `nix` CLI
      experimental-features = [ "nix-command" "flakes" ];

      # Automatic store optimization (dedup identical files)
      auto-optimise-store = true;

      # Allow the wheel group to manage the Nix store
      trusted-users = [ "root" "@wheel" ];
    };

    # Garbage-collect old generations weekly
    gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
    };
  };

  # Allow unfree packages (NVIDIA drivers, Chrome, etc.)
  nixpkgs.config.allowUnfree = true;

  # ==========================================================================
  # Boot
  # ==========================================================================
  boot = {
    loader = {
      # Use systemd-boot (simple, reliable UEFI bootloader)
      systemd-boot = {
        enable = true;
        # Limit boot entries to prevent /boot from filling up
        configurationLimit = 20;
      };
      efi.canTouchEfiVariables = true;
    };

    # Use the latest kernel for best hardware support
    kernelPackages = pkgs.linuxPackages_latest;

    # Extra kernel parameters
    kernelParams = [
      "nvidia-drm.modeset=1"    # Required for NVIDIA Wayland support
      "nvidia-drm.fbdev=1"      # Framebuffer device (smoother boot)
    ];
  };

  # ==========================================================================
  # Networking
  # ==========================================================================
  networking = {
    hostName = "empire";

    # NetworkManager handles both wired and wireless
    networkmanager.enable = true;

    # Firewall — enabled by default, open ports as needed
    firewall = {
      enable = true;
      allowedTCPPorts = [
        18789   # OpenClaw gateway
        4000    # Empire Dashboard (dev)
        3000    # Generic dev server
      ];
    };
  };

  # ==========================================================================
  # Locale & Time
  # ==========================================================================
  time.timeZone = "America/New_York";  # Change to your timezone

  i18n = {
    defaultLocale = "en_US.UTF-8";
    extraLocaleSettings = {
      LC_TIME = "en_US.UTF-8";
      LC_MONETARY = "en_US.UTF-8";
    };
  };

  # ==========================================================================
  # NVIDIA GPU — Proprietary Drivers
  # ==========================================================================
  # GTX 1660 is Turing architecture, well supported by the production branch.
  hardware.graphics = {
    enable = true;
    enable32Bit = true;   # For Steam / 32-bit OpenGL apps
  };

  hardware.nvidia = {
    # Use the production driver branch (tested, stable)
    package = config.boot.kernelPackages.nvidiaPackages.production;

    # Enable modesetting (required for Wayland and GDM)
    modesetting.enable = true;

    # Power management — safe to leave off for desktop
    powerManagement.enable = false;

    # Open-source kernel module — not recommended for GTX 1660 (Turing)
    open = false;

    # NVIDIA Settings GUI (nvidia-settings)
    nvidiaSettings = true;
  };

  # Tell Xserver to use the nvidia driver
  services.xserver.videoDrivers = [ "nvidia" ];

  # ==========================================================================
  # DisplayLink — Targus USB3 DV4K DOCK
  # ==========================================================================
  # DisplayLink requires a proprietary driver. NixOS packages it but you must
  # accept the license. If the module isn't available in your nixpkgs pin,
  # see: https://nixos.wiki/wiki/Displaylink
  #
  # NOTE: DisplayLink works best on X11. Wayland support is experimental.
  # If your dock display doesn't work, switch GDM to X11 (see GNOME section).
  services.xserver.displayManager.sessionCommands = ''
    ${lib.getBin pkgs.xorg.xrandr}/bin/xrandr --setprovideroutputsource 1 0 || true
    ${lib.getBin pkgs.xorg.xrandr}/bin/xrandr --setprovideroutputsource 2 0 || true
  '';

  # Uncomment if the displaylink kernel module is available in your nixpkgs:
  # services.xserver.videoDrivers = [ "nvidia" "displaylink" ];
  # boot.extraModulePackages = [ config.boot.kernelPackages.displaylink ];

  # ==========================================================================
  # TP-Link USB WiFi (RTL8821CU chipset)
  # ==========================================================================
  # The rtl8821cu driver is not in mainline Linux. Options:
  #
  # Option A: Use the rtw88 driver (mainline, partial support for some chips)
  #   — Already loaded by default if your kernel is recent enough.
  #
  # Option B: Build the out-of-tree driver manually:
  #   git clone https://github.com/morrownr/8821cu-20210916.git
  #   cd 8821cu-20210916
  #   nix-shell -p linuxPackages_latest.kernel.dev gnumake gcc
  #   make && sudo make install
  #
  # Option C: Use a nix overlay to package it (advanced, see README).
  #
  # For now, we ensure USB WiFi firmware is available:
  hardware.firmware = [ pkgs.linux-firmware ];

  # If rtw88 works out of the box, NetworkManager will pick it up.
  # Check `ip link` after boot. If not detected, use Option B above.

  # ==========================================================================
  # Audio — PipeWire
  # ==========================================================================
  # PipeWire replaces PulseAudio with better latency, Bluetooth, and USB
  # headset support (Jabra Evolve 20).

  # Disable PulseAudio (conflicts with PipeWire)
  services.pulseaudio.enable = false;

  # Enable real-time scheduling for audio
  security.rtkit.enable = true;

  services.pipewire = {
    enable = true;
    alsa.enable = true;           # ALSA compatibility
    alsa.support32Bit = true;     # 32-bit ALSA apps
    pulse.enable = true;          # PulseAudio compatibility layer
    jack.enable = false;          # Enable if you need JACK apps
    # wireplumber is the default session manager
  };

  # ==========================================================================
  # Desktop — GNOME
  # ==========================================================================
  services.xserver = {
    enable = true;

    displayManager.gdm = {
      enable = true;
      wayland = true;       # Set to false if DisplayLink has issues
    };

    desktopManager.gnome.enable = true;
  };

  # Auto-login for user aditya
  services.displayManager.autoLogin = {
    enable = true;
    user = "aditya";
  };

  # Workaround: GNOME auto-login on Wayland needs this
  # (race condition between GDM and gnome-session)
  systemd.services."getty@tty1".enable = false;
  systemd.services."autovt@tty1".enable = false;

  # Remove some GNOME bloat
  environment.gnome.excludePackages = with pkgs; [
    epiphany          # Web browser (we use Chrome)
    geary             # Email client
    gnome-music       # Music player
    gnome-tour        # Welcome tour
    totem             # Video player (use VLC if needed)
    yelp              # Help viewer
  ];

  # ==========================================================================
  # NTFS Support
  # ==========================================================================
  # Required to mount the 4TB internal Windows HDD.
  # The actual mount point is defined in hardware-configuration.nix.
  boot.supportedFilesystems = [ "ntfs" ];

  # ==========================================================================
  # System Packages
  # ==========================================================================
  environment.systemPackages = with pkgs; [
    # --- Development ---
    git
    gcc
    gnumake
    python3
    nodejs_22             # Node.js 22 LTS
    nodePackages.npm

    # --- Browsers ---
    google-chrome         # Unfree — requires allowUnfree = true
    # chromium            # Use this instead if you prefer FOSS

    # --- Communication ---
    discord               # Discord desktop app
    telegram-desktop      # Telegram
    whatsapp-for-linux    # WhatsApp (Electron wrapper)
    bitwarden-desktop     # Password manager

    # --- Media ---
    obs-studio

    # --- CLI Tools ---
    curl
    wget
    htop
    btop
    neofetch
    ripgrep               # Fast grep (used by Claude Code)
    fd                    # Fast find
    jq                    # JSON processor
    tree
    unzip
    file
    pciutils              # lspci
    usbutils              # lsusb

    # --- System ---
    ntfs3g                # NTFS read/write support
    mesa                  # OpenGL
    vulkan-tools          # GPU diagnostics
    glxinfo               # OpenGL diagnostics

    # --- GNOME extras ---
    gnome-tweaks          # GNOME Tweaks for customization
    dconf-editor          # Advanced GNOME settings
  ];

  # ==========================================================================
  # Programs
  # ==========================================================================
  # Some programs need special NixOS module activation beyond just being
  # in systemPackages.

  programs.bash.enableCompletion = true;

  # Git — system-wide defaults
  programs.git = {
    enable = true;
    config = {
      init.defaultBranch = "master";
      core.autocrlf = "input";     # Unix line endings in the repo
      pull.rebase = true;           # Rebase by default on pull
    };
  };

  # ==========================================================================
  # User — aditya
  # ==========================================================================
  users.users.aditya = {
    isNormalUser = true;
    description = "Aditya Sharma";
    extraGroups = [
      "wheel"           # sudo access
      "networkmanager"  # Manage network connections
      "video"           # GPU access
      "audio"           # Audio device access
      "plugdev"         # USB device access (DisplayLink, etc.)
    ];
    # Set a password on first boot: `passwd aditya`
    initialPassword = "changeme";
  };

  # ==========================================================================
  # Services
  # ==========================================================================

  # SSH server — disabled by default, uncomment if needed
  # services.openssh = {
  #   enable = true;
  #   settings = {
  #     PermitRootLogin = "no";
  #     PasswordAuthentication = false;
  #   };
  # };

  # Printing (CUPS) — enable if you need it
  # services.printing.enable = true;

  # Automatic timezone detection
  services.automatic-timezoned.enable = true;

  # fstrim for SSD health (weekly TRIM)
  services.fstrim.enable = true;

  # Firmware updates via fwupd
  services.fwupd.enable = true;

  # ==========================================================================
  # Security
  # ==========================================================================
  security.sudo = {
    enable = true;
    # Allow wheel group members to sudo with password
    wheelNeedsPassword = true;
  };

  # ==========================================================================
  # System State Version
  # ==========================================================================
  # This value determines the NixOS release from which the default settings
  # for stateful data (like databases) are taken. Do NOT change this after
  # install unless you've read the release notes for the target version.
  system.stateVersion = "24.11";
}
