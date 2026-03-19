# ============================================================================
# Hardware Configuration — Auto-generated template
# ============================================================================
# IMPORTANT: After installing NixOS, replace this file with the one generated
# by `nixos-generate-config`. The UUIDs below are PLACEHOLDERS.
#
# This template is structured for:
#   - 2TB external NVMe as root (/)
#   - EFI System Partition on the NVMe
#   - 4TB internal HDD (Windows NTFS) — optional mount
# ============================================================================
{ config, lib, pkgs, modulesPath, ... }:

{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
  ];

  # --------------------------------------------------------------------------
  # Kernel & initrd modules
  # --------------------------------------------------------------------------
  boot.initrd.availableKernelModules = [
    "nvme"            # NVMe SSD support
    "xhci_pci"        # USB 3.x host controller
    "ahci"            # SATA (for internal HDD)
    "usb_storage"     # USB storage devices
    "usbhid"          # USB HID (keyboard/mouse in initrd)
    "sd_mod"          # SCSI disk module
  ];

  boot.initrd.kernelModules = [ ];

  # Kernel modules loaded at boot
  boot.kernelModules = [
    "kvm-amd"         # KVM virtualization for AMD CPUs
  ];

  boot.extraModulePackages = [ ];

  # --------------------------------------------------------------------------
  # Filesystem layout
  # --------------------------------------------------------------------------

  # Root partition — 2TB external NVMe
  # Replace UUID after running `nixos-generate-config`
  fileSystems."/" = {
    device = "/dev/disk/by-uuid/REPLACE-WITH-ROOT-UUID";
    fsType = "ext4";
  };

  # EFI System Partition — on the NVMe
  # Replace UUID after running `nixos-generate-config`
  fileSystems."/boot" = {
    device = "/dev/disk/by-uuid/REPLACE-WITH-BOOT-UUID";
    fsType = "vfat";
    options = [ "fmask=0077" "dmask=0077" ];
  };

  # Swap partition (optional — create one if you want hibernate support)
  # swapDevices = [
  #   { device = "/dev/disk/by-uuid/REPLACE-WITH-SWAP-UUID"; }
  # ];

  # --------------------------------------------------------------------------
  # 4TB Internal HDD (Windows NTFS) — commented out template
  # --------------------------------------------------------------------------
  # To find the UUID: `sudo blkid | grep ntfs`
  # Uncomment and fill in the UUID to auto-mount at boot.
  #
  # fileSystems."/mnt/windows" = {
  #   device = "/dev/disk/by-uuid/REPLACE-WITH-NTFS-UUID";
  #   fsType = "ntfs-3g";
  #   options = [
  #     "rw"              # Read-write access
  #     "uid=1000"        # Map files to user aditya (UID 1000)
  #     "gid=100"         # Map files to group users (GID 100)
  #     "dmask=022"       # Directory permissions: 755
  #     "fmask=133"       # File permissions: 644
  #     "windows_names"   # Reject filenames invalid on Windows
  #     "nofail"          # Don't block boot if the drive is missing
  #   ];
  # };

  # --------------------------------------------------------------------------
  # CPU
  # --------------------------------------------------------------------------
  nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";
  hardware.cpu.amd.updateMicrocode =
    lib.mkDefault config.hardware.enableRedistributableFirmware;
}
