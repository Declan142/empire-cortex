# ============================================================================
# Empire NixOS Flake — Top-level entry point
# ============================================================================
# Usage:
#   sudo nixos-rebuild switch --flake .#empire
#
# This flake wraps configuration.nix so you get:
#   - Pinned nixpkgs (reproducible builds)
#   - Easy updates via `nix flake update`
#   - Future extensibility (home-manager, devShells, etc.)
# ============================================================================
{
  description = "Empire Command Center — NixOS configuration for Aditya's workstation";

  inputs = {
    # Pin to nixos-unstable for latest packages (especially NVIDIA drivers).
    # Switch to nixos-24.11 if you prefer stability over freshness.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }:
  {
    nixosConfigurations.empire = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        ./hardware-configuration.nix
      ];
    };
  };
}
