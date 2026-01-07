#!/bin/bash

# Quick install script for local testing
# Usage: ./install-local.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_NAME="bv-ga4-tracking"

echo -e "${GREEN}Installing ${PLUGIN_NAME} plugin for local testing...${NC}"
echo ""

# Try to find Local sites directory
LOCAL_SITES_DIR="$HOME/Local Sites"
if [ ! -d "$LOCAL_SITES_DIR" ]; then
    LOCAL_SITES_DIR="$HOME/Library/Application Support/Local"
fi

if [ ! -d "$LOCAL_SITES_DIR" ]; then
    echo -e "${RED}Could not find Local sites directory.${NC}"
    echo -e "${YELLOW}Please enter the path to your WordPress plugins directory:${NC}"
    read -r WP_PLUGINS_DIR
else
    echo -e "${YELLOW}Found Local sites directory: $LOCAL_SITES_DIR${NC}"
    echo -e "${YELLOW}Enter your Local site name (e.g., shopboardwalkvintage):${NC}"
    read -r SITE_NAME
    
    WP_PLUGINS_DIR="$LOCAL_SITES_DIR/$SITE_NAME/app/public/wp-content/plugins"
fi

# Validate directory
if [ ! -d "$WP_PLUGINS_DIR" ]; then
    echo -e "${RED}Error: Directory does not exist: $WP_PLUGINS_DIR${NC}"
    exit 1
fi

TARGET="$WP_PLUGINS_DIR/$PLUGIN_NAME"

# Check if already exists
if [ -L "$TARGET" ]; then
    echo -e "${YELLOW}Symlink already exists. Removing...${NC}"
    rm "$TARGET"
elif [ -d "$TARGET" ] || [ -f "$TARGET" ]; then
    echo -e "${RED}Error: $TARGET already exists and is not a symlink.${NC}"
    echo -e "${YELLOW}Remove it manually and run this script again.${NC}"
    exit 1
fi

# Create symlink
ln -s "$PLUGIN_DIR" "$TARGET"
echo -e "${GREEN}✓ Created symlink: $TARGET -> $PLUGIN_DIR${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Go to WordPress Admin → Plugins"
echo "2. Activate 'Boardwalk Vintage GA4 Ecommerce Tracking'"
echo "3. Go to Settings → GA4 Tracking to configure"
