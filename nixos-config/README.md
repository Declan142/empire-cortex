# Empire NixOS Install Guide

Complete step-by-step guide to install NixOS on Aditya's workstation.

**Hardware:** Ryzen 7 3700X / GTX 1660 / 32GB RAM / 2TB external NVMe (NixOS root) / 4TB HDD (Windows)

---

## Prerequisites

- USB flash drive (4GB+) for the NixOS installer
- 2TB external NVMe connected via USB/Thunderbolt
- Internet connection (Ethernet recommended for install — WiFi adapter needs drivers)
- This config directory copied to a USB drive or accessible via network

---

## Step 1: Download NixOS ISO

Download the **NixOS Minimal ISO** (recommended) or GNOME ISO from:

```
https://nixos.org/download/#nixos-iso
```

Choose the **unstable** channel to match the flake's nixpkgs pin.

---

## Step 2: Flash USB Installer

### From Windows (current OS):
```powershell
# Using Rufus: https://rufus.ie
# Select the ISO, select your USB drive, use DD mode (not ISO mode)
```

### From Linux:
```bash
sudo dd if=nixos-minimal.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

Replace `/dev/sdX` with your USB drive (check with `lsblk`).

---

## Step 3: Boot the Installer

1. Plug in both the USB installer and the 2TB external NVMe
2. Enter BIOS (usually Del or F2 on boot)
3. Set boot order: USB first
4. Boot into NixOS installer

---

## Step 4: Connect to Internet

Ethernet should work automatically. Verify:
```bash
ping -c 3 nixos.org
```

If you need WiFi (unlikely during install):
```bash
sudo systemctl start wpa_supplicant
wpa_cli
> add_network 0
> set_network 0 ssid "YourSSID"
> set_network 0 psk "YourPassword"
> enable_network 0
> quit
```

---

## Step 5: Partition the NVMe

Identify the NVMe drive:
```bash
lsblk
# Look for the 2TB drive — likely /dev/nvme0n1 or /dev/sda
# DO NOT touch the 4TB internal HDD (your Windows drive!)
```

Partition with `parted`:
```bash
sudo parted /dev/nvme0n1 -- mklabel gpt

# EFI System Partition (512MB)
sudo parted /dev/nvme0n1 -- mkpart ESP fat32 1MiB 512MiB
sudo parted /dev/nvme0n1 -- set 1 esp on

# Swap partition (8GB — optional, useful for hibernate with 32GB RAM)
sudo parted /dev/nvme0n1 -- mkpart swap linux-swap 512MiB 8704MiB

# Root partition (rest of the drive)
sudo parted /dev/nvme0n1 -- mkpart root ext4 8704MiB 100%
```

Format the partitions:
```bash
# EFI
sudo mkfs.fat -F 32 -n BOOT /dev/nvme0n1p1

# Swap
sudo mkswap -L SWAP /dev/nvme0n1p2
sudo swapon /dev/nvme0n1p2

# Root
sudo mkfs.ext4 -L NIXOS /dev/nvme0n1p3
```

---

## Step 6: Mount Filesystems

```bash
# Mount root
sudo mount /dev/disk/by-label/NIXOS /mnt

# Create and mount boot
sudo mkdir -p /mnt/boot
sudo mount /dev/disk/by-label/BOOT /mnt/boot
```

---

## Step 7: Generate Hardware Config

```bash
sudo nixos-generate-config --root /mnt
```

This creates `/mnt/etc/nixos/hardware-configuration.nix` with your actual UUIDs.

---

## Step 8: Copy Empire Config

Copy the config files from this directory to the target system:

```bash
# If you have the files on a second USB drive mounted at /mnt2:
sudo mkdir -p /mnt/etc/nixos
sudo cp /mnt2/nixos-config/configuration.nix /mnt/etc/nixos/
sudo cp /mnt2/nixos-config/flake.nix /mnt/etc/nixos/
sudo cp /mnt2/nixos-config/install.sh /mnt/etc/nixos/

# IMPORTANT: Keep the auto-generated hardware-configuration.nix!
# It has your real UUIDs. Do NOT overwrite it with the template.
# But review it — you may want to add the NTFS mount from the template.
```

If using git instead:
```bash
sudo nix-env -iA nixos.git
cd /mnt/etc/nixos
sudo git clone https://github.com/Declan142/empire-command-center.git /tmp/empire
sudo cp /tmp/empire/nixos-config/configuration.nix .
sudo cp /tmp/empire/nixos-config/flake.nix .
# Again: keep the generated hardware-configuration.nix
```

### Review hardware-configuration.nix

Compare the generated file with the template. You may want to add:
- The commented NTFS mount block (for the 4TB Windows drive)
- The `boot.supportedFilesystems = [ "ntfs" ]` line

---

## Step 9: Install NixOS

```bash
sudo nixos-install --flake /mnt/etc/nixos#empire
```

When prompted, set the root password.

**This will take 10-30 minutes** depending on download speed (it fetches all packages).

---

## Step 10: Reboot

```bash
sudo reboot
```

1. Remove the USB installer
2. Enter BIOS → set NVMe as first boot device
3. NixOS should boot into GNOME with auto-login as `aditya`

---

## Step 11: Post-Boot Setup

### Set your password
```bash
passwd
```

### Copy and run the bootstrap script
```bash
# If install.sh is in /etc/nixos:
cp /etc/nixos/install.sh ~/install.sh
chmod +x ~/install.sh
./install.sh
```

This will:
- Install Claude Code CLI and Codex CLI
- Clone the Empire Command Center repo
- Prompt for API keys (Anthropic, OpenAI, GitHub)
- Set up OpenClaw as a systemd user service
- Configure git

---

## Step 12: Mount Windows Drive (Optional)

Find the UUID of your 4TB NTFS drive:
```bash
sudo blkid | grep ntfs
```

Edit the hardware config:
```bash
sudo nano /etc/nixos/hardware-configuration.nix
```

Uncomment the NTFS mount block and replace `REPLACE-WITH-NTFS-UUID` with the actual UUID. Then rebuild:
```bash
sudo nixos-rebuild switch --flake /etc/nixos#empire
```

---

## Step 13: WiFi Setup (TP-Link USB Adapter)

The RTL8821CU chipset is **not** in the mainline Linux kernel. After boot:

```bash
# Check if it's detected
lsusb | grep -i realtek
ip link

# If not detected, build the out-of-tree driver:
cd /tmp
git clone https://github.com/morrownr/8821cu-20210916.git
cd 8821cu-20210916

# Enter a dev shell with kernel headers
nix-shell -p linuxPackages_latest.kernel.dev gnumake gcc bc

make
sudo make install
sudo modprobe 8821cu
```

After the module loads, NetworkManager should detect the WiFi adapter. Connect via:
```bash
nmcli device wifi list
nmcli device wifi connect "YourSSID" password "YourPassword"
```

> **Note:** The out-of-tree driver needs to be rebuilt after each kernel update.
> For a permanent solution, consider creating a Nix derivation or using a
> compatible USB WiFi adapter with mainline driver support.

---

## Ongoing Maintenance

### Rebuild after config changes
```bash
sudo nixos-rebuild switch --flake /etc/nixos#empire
```

### Update all packages
```bash
cd /etc/nixos
nix flake update
sudo nixos-rebuild switch --flake .#empire
```

### Garbage collect old generations
```bash
sudo nix-collect-garbage -d    # Delete ALL old generations
nix-collect-garbage -d          # User-level cleanup
```

### Check OpenClaw status
```bash
systemctl --user status openclaw
journalctl --user -u openclaw -f
```

---

## Troubleshooting

### DisplayLink monitor not working
DisplayLink has limited Wayland support. Try switching to X11:
```nix
# In configuration.nix, change:
services.xserver.displayManager.gdm.wayland = false;
```
Rebuild and reboot.

### NVIDIA issues
```bash
nvidia-smi                    # Check driver status
glxinfo | grep "OpenGL"       # Check OpenGL renderer
journalctl -b | grep -i nvidia  # Check boot logs
```

### No sound from USB headset
```bash
wpctl status                  # Show PipeWire devices
wpctl set-default <id>        # Set default audio device
pavucontrol                   # GUI audio mixer (install: nix-env -iA nixpkgs.pavucontrol)
```

### Boot fails after kernel update
Select a previous generation from the systemd-boot menu. Then:
```bash
sudo nixos-rebuild switch --flake /etc/nixos#empire --rollback
```
