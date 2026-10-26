#!/bin/sh
# fsr installer for macOS and Linux.
#   curl -fsSL https://raw.githubusercontent.com/agrublev/freedcamp-script-runner/feature/rust/install.sh | sh
# Options (env): FSR_VERSION=v7.7.0 (default: latest), FSR_INSTALL_DIR=~/.local/bin
set -eu

REPO="agrublev/freedcamp-script-runner"
VERSION="${FSR_VERSION:-latest}"
DIR="${FSR_INSTALL_DIR:-$HOME/.local/bin}"

err() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || err "$1 is required"; }

case "$(uname -s)" in
  Darwin) os=macos ;;
  Linux) os=linux ;;
  *) err "unsupported OS $(uname -s) (on Windows use install.ps1)" ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) err "unsupported CPU $(uname -m)" ;;
esac
# Apple Silicon running under Rosetta reports x86_64; prefer the native build.
if [ "$os" = macos ] && [ "$arch" = x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ]; then
  arch=arm64
fi

name="fsr-$os-$arch"
if [ -n "${FSR_BASE_URL:-}" ]; then
  base="$FSR_BASE_URL"
elif [ "$VERSION" = latest ]; then
  base="https://github.com/$REPO/releases/latest/download"
else
  base="https://github.com/$REPO/releases/download/$VERSION"
fi

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1" -o "$2"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO "$2" "$1"; }
else
  err "curl or wget is required"
fi
need tar

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

printf 'Downloading %s (%s)...\n' "$name" "$VERSION"
fetch "$base/$name.tar.gz" "$tmp/$name.tar.gz" || err "download failed: $base/$name.tar.gz"

if fetch "$base/$name.tar.gz.sha256" "$tmp/sum" 2>/dev/null; then
  want="$(cut -d' ' -f1 <"$tmp/sum")"
  if command -v sha256sum >/dev/null 2>&1; then
    got="$(sha256sum "$tmp/$name.tar.gz" | cut -d' ' -f1)"
  else
    got="$(shasum -a 256 "$tmp/$name.tar.gz" | cut -d' ' -f1)"
  fi
  [ "$want" = "$got" ] || err "checksum mismatch (expected $want, got $got)"
else
  echo "warning: no checksum file found, skipping verification" >&2
fi

tar -xzf "$tmp/$name.tar.gz" -C "$tmp"
mkdir -p "$DIR"
install -m 755 "$tmp/$name/fsr" "$DIR/fsr" 2>/dev/null || { cp "$tmp/$name/fsr" "$DIR/fsr"; chmod 755 "$DIR/fsr"; }
# Downloaded binaries can carry macOS quarantine; clear it so Gatekeeper doesn't block.
[ "$os" = macos ] && xattr -d com.apple.quarantine "$DIR/fsr" 2>/dev/null || true

printf '\033[32m✓\033[0m installed %s\n' "$("$DIR/fsr" --version 2>/dev/null || echo fsr) -> $DIR/fsr"
case ":$PATH:" in
  *":$DIR:"*) ;;
  *)
    echo
    echo "$DIR is not on your PATH. Add it:"
    echo "  bash/zsh: echo 'export PATH=\"$DIR:\$PATH\"' >> ~/.zshrc   (or ~/.bashrc)"
    echo "  fish:     fish_add_path $DIR"
    ;;
esac
command -v node >/dev/null 2>&1 || echo "note: plugins need Node 22+ (core fsr works without it)"
