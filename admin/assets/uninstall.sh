#!/bin/bash
#
# AlloFlow Admin - Complete Uninstall Script for macOS
# This script removes the application and all associated data
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AlloFlow Admin - Uninstall Tool         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
  echo -e "${YELLOW}⚠️  This script requires administrator privileges${NC}"
  echo "Please run with: sudo ./uninstall.sh"
  exit 1
fi

# Get the actual user (not root when using sudo)
ACTUAL_USER="${SUDO_USER:-$USER}"
USER_HOME=$(eval echo ~$ACTUAL_USER)

echo -e "${YELLOW}This will remove:${NC}"
echo "  • AlloFlow Admin application"
echo "  • Application preferences and cache"
echo "  • Application Support files"
echo ""
echo -e "${RED}Optionally remove:${NC}"
echo "  • Docker containers and AI models (~5-10GB)"
echo "  • PocketBase database (student data)"
echo "  • All student work and generated content"
echo ""
read -p "$(echo -e ${YELLOW}Do you want to continue? [y/N]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Uninstall cancelled."
  exit 0
fi

echo ""
read -p "$(echo -e ${RED}Remove Docker data and student information? [y/N]: ${NC})" -n 1 -r
echo ""
REMOVE_DATA=$REPLY

echo ""
echo -e "${BLUE}🗑️  Starting uninstall process...${NC}"
echo ""

# 1. Stop Docker services if data removal requested
if [[ $REMOVE_DATA =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Stopping Docker services...${NC}"
  if [ -f "$USER_HOME/AlloFlow/docker/docker-compose.yml" ]; then
    docker compose -f "$USER_HOME/AlloFlow/docker/docker-compose.yml" down -v 2>/dev/null || echo "No running containers"
  fi
  echo -e "${GREEN}✓ Docker services stopped${NC}"
fi

# 2. Remove application
echo -e "${YELLOW}Removing application...${NC}"
if [ -d "/Applications/AlloFlow Admin.app" ]; then
  rm -rf "/Applications/AlloFlow Admin.app"
  echo -e "${GREEN}✓ Application removed${NC}"
else
  echo -e "${YELLOW}⚠ Application not found in /Applications${NC}"
fi

# 3. Remove application support files
echo -e "${YELLOW}Removing application data...${NC}"
rm -rf "$USER_HOME/Library/Application Support/AlloFlow Admin"
rm -rf "$USER_HOME/Library/Preferences/com.alloflow.admin.plist"
rm -rf "$USER_HOME/Library/Logs/AlloFlow Admin"
rm -rf "$USER_HOME/Library/Caches/com.alloflow.admin"
rm -rf "$USER_HOME/Library/Caches/com.alloflow.admin.ShipIt"
rm -rf "$USER_HOME/Library/Saved Application State/com.alloflow.admin.savedState"
echo -e "${GREEN}✓ Application data removed${NC}"

# 4. Remove server data if requested
if [[ $REMOVE_DATA =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Removing server data...${NC}"
  
  if [ -d "$USER_HOME/AlloFlow/docker" ]; then
    rm -rf "$USER_HOME/AlloFlow/docker"
    echo -e "${GREEN}✓ Docker data removed${NC}"
  fi
  
  if [ -f "$USER_HOME/AlloFlow/ai-config.json" ]; then
    rm -f "$USER_HOME/AlloFlow/ai-config.json"
    echo -e "${GREEN}✓ AI configuration removed${NC}"
  fi
  
  if [ -f "$USER_HOME/AlloFlow/.env" ]; then
    rm -f "$USER_HOME/AlloFlow/.env"
    echo -e "${GREEN}✓ Environment configuration removed${NC}"
  fi
  
  if [ -f "$USER_HOME/AlloFlow/setup-complete.lock" ]; then
    rm -f "$USER_HOME/AlloFlow/setup-complete.lock"
    echo -e "${GREEN}✓ Setup lock removed${NC}"
  fi
  
  # Remove Docker volumes
  echo -e "${YELLOW}Removing Docker volumes...${NC}"
  VOLUMES=$(docker volume ls -q | grep alloflow 2>/dev/null || true)
  if [ ! -z "$VOLUMES" ]; then
    echo "$VOLUMES" | xargs docker volume rm 2>/dev/null || true
    echo -e "${GREEN}✓ Docker volumes removed${NC}"
  else
    echo -e "${YELLOW}⚠ No AlloFlow Docker volumes found${NC}"
  fi
  
  # Check if AlloFlow directory is empty and remove if so
  if [ -d "$USER_HOME/AlloFlow" ]; then
    if [ -z "$(ls -A $USER_HOME/AlloFlow)" ]; then
      rm -rf "$USER_HOME/AlloFlow"
      echo -e "${GREEN}✓ AlloFlow directory removed${NC}"
    else
      echo -e "${YELLOW}⚠ AlloFlow directory not empty, keeping remaining files${NC}"
    fi
  fi
else
  echo -e "${BLUE}ℹ️  Server data preserved for future installations${NC}"
  echo -e "${BLUE}   Location: $USER_HOME/AlloFlow/${NC}"
fi

# 5. Check for any remaining processes
echo -e "${YELLOW}Checking for remaining processes...${NC}"
PIDS=$(pgrep -f "AlloFlow Admin" || true)
if [ ! -z "$PIDS" ]; then
  echo "$PIDS" | xargs kill 2>/dev/null || true
  echo -e "${GREEN}✓ Terminated remaining processes${NC}"
else
  echo -e "${GREEN}✓ No remaining processes${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ AlloFlow Admin uninstalled            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""

if [[ ! $REMOVE_DATA =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Your server data is preserved at:${NC}"
  echo -e "${BLUE}$USER_HOME/AlloFlow/${NC}"
  echo ""
  echo "To completely remove all data later, run:"
  echo -e "${YELLOW}sudo rm -rf $USER_HOME/AlloFlow${NC}"
fi

echo ""
echo -e "${BLUE}Thank you for using AlloFlow Admin!${NC}"
echo ""
