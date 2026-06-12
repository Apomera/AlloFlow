#!/bin/bash
#
# Deploy AlloFlow Update to Remote Server
# Usage: ./deploy-update.sh [test|production]
#

set -e

CHANNEL="${1:-test}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AlloFlow Update Deployment           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Validate channel
if [[ "$CHANNEL" != "test" && "$CHANNEL" != "production" ]]; then
  echo -e "${RED}❌ Invalid channel: $CHANNEL${NC}"
  echo "Usage: ./deploy-update.sh [test|production]"
  exit 1
fi

# Get current version
CURRENT_VERSION=$(grep '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "${BLUE}Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo -e "${BLUE}Deploy channel: ${YELLOW}$CHANNEL${NC}"
echo ""

# Confirm deployment
read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Building application...${NC}"

# Set environment variables based on channel
if [ "$CHANNEL" == "test" ]; then
  export UPDATE_SERVER_URL="${TEST_UPDATE_SERVER:-http://test-updates.alloflow.local/test}"
  export UPDATE_CHANNEL="test"
  REMOTE_USER="${TEST_REMOTE_USER:-alloflow}"
  REMOTE_HOST="${TEST_REMOTE_HOST:-test-updates.alloflow.local}"
  REMOTE_PATH="${TEST_REMOTE_PATH:-/var/www/alloflow-updates/test}"
else
  export UPDATE_SERVER_URL="${PRODUCTION_UPDATE_SERVER:-https://updates.alloflow.com/production}"
  export UPDATE_CHANNEL="production"
  REMOTE_USER="${PRODUCTION_REMOTE_USER:-alloflow}"
  REMOTE_HOST="${PRODUCTION_REMOTE_HOST:-updates.alloflow.com}"
  REMOTE_PATH="${PRODUCTION_REMOTE_PATH:-/var/www/alloflow-updates/production}"
  
  # Extra confirmation for production
  echo ""
  echo -e "${RED}⚠️  PRODUCTION DEPLOYMENT${NC}"
  read -p "$(echo -e ${RED}Are you ABSOLUTELY SURE? Type 'DEPLOY' to continue: ${NC})" CONFIRM
  if [ "$CONFIRM" != "DEPLOY" ]; then
    echo "Production deployment cancelled."
    exit 0
  fi
fi

echo "Update server URL: $UPDATE_SERVER_URL"
echo "Update channel: $UPDATE_CHANNEL"

# Build with publish flag
npm run build
npm run dist -- --publish always

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Check if dist directory has files
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
  echo -e "${RED}❌ No files in dist directory${NC}"
  exit 1
fi

echo -e "${BLUE}Step 2: Deploying to $CHANNEL server...${NC}"
echo ""

# Show files to be deployed
echo "Files to deploy:"
ls -lh dist/*.{exe,dmg,zip,yml} 2>/dev/null || echo "No installers found"
echo ""

# Deploy files via SCP
echo "Deploying to: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"

# Create remote directory if it doesn't exist
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"

# Copy files
scp -r dist/*.exe dist/*.dmg dist/*.zip dist/*.yml "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" 2>/dev/null || {
  echo -e "${YELLOW}⚠️  Some files may not exist (e.g., .dmg on Windows). Continuing...${NC}"
}

echo ""
echo -e "${GREEN}✓ Files deployed to $CHANNEL server${NC}"
echo ""

# Verify deployment
echo -e "${BLUE}Step 3: Verifying deployment...${NC}"
echo ""

# Check if latest.yml is accessible
UPDATE_CHECK_URL="$UPDATE_SERVER_URL/latest.yml"
echo "Checking: $UPDATE_CHECK_URL"

if curl -f -s "$UPDATE_CHECK_URL" > /dev/null; then
  echo -e "${GREEN}✓ Update metadata accessible${NC}"
  
  # Show version from latest.yml
  DEPLOYED_VERSION=$(curl -s "$UPDATE_CHECK_URL" | grep "version:" | sed 's/version: //')
  echo "Deployed version: $DEPLOYED_VERSION"
else
  echo -e "${YELLOW}⚠️  Could not verify update metadata${NC}"
  echo "Make sure your server is accessible and CORS is configured"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Deployment Complete                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo "Version: $CURRENT_VERSION"
echo "Channel: $CHANNEL"
echo "Server: $UPDATE_SERVER_URL"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test update on installed client"
echo "2. Verify update notification appears"
echo "3. Confirm download and installation works"
if [ "$CHANNEL" == "test" ]; then
  echo "4. If successful, deploy to production: ./deploy-update.sh production"
fi
echo ""
