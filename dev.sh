#!/bin/bash

# Define URLs for downloading Zellij binaries
LINUX_TAR="https://github.com/zellij-org/zellij/releases/latest/download/zellij-x86_64-unknown-linux-musl.tar.gz"
MAC_x86_64_TAR="https://github.com/zellij-org/zellij/releases/latest/download/zellij-x86_64-apple-darwin.tar.gz"
MAC_aarch64_TAR="https://github.com/zellij-org/zellij/releases/latest/download/zellij-aarch64-apple-darwin.tar.gz"

# Determine the operating system
OS=$(uname -s)

# Choose the appropriate binary to download based on the OS and architecture
case "$OS" in
  "Linux")
    TAR_URL=$LINUX_TAR
    ;;
  "Darwin")
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
      TAR_URL=$MAC_x86_64_TAR
    elif [ "$ARCH" = "arm64" ]; then
      TAR_URL=$MAC_aarch64_TAR
    else
      echo "Unsupported macOS architecture: $ARCH"
      exit 1
    fi
    ;;
  *)
    echo "Unsupported operating system: $OS"
    exit 1
    ;;
esac

# Check if Zellij is installed, if not, download and install it
if ! command -v zellij &> /dev/null; then
  echo "Zellij could not be found. Installing now..."
  curl -fsSL $TAR_URL | tar xzv
  sudo mv zellij /usr/local/bin/
fi

# Launch Zellij with the unified layout file
zellij --layout layout.kdl 