#!/bin/bash
#
# Local Update Testing Script
# This script helps test the auto-update system locally without needing a remote server
#

set -e

echo "🔄 AlloFlow Local Update Testing"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIST_DIR="$SCRIPT_DIR/dist"

echo -e "${BLUE}Step 1: Build current version${NC}"
echo "Current version in package.json:"
grep '"version"' package.json

read -p "Press Enter to build this version..."
npm run build
npm run dist -- --publish never

echo ""
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${BLUE}Step 2: Start local update server${NC}"
echo "Starting HTTP server on http://localhost:8080"
echo ""

if [ -d "$DIST_DIR" ]; then
  cd "$DIST_DIR"
  
  # Check if python3 is available
  if command -v python3 &> /dev/null; then
    echo "Using Python 3 http.server..."
    python3 -m http.server 8080 &
    SERVER_PID=$!
  elif command -v npx &> /dev/null; then
    echo "Using http-server (Node.js)..."
    npx http-server -p 8080 --cors &
    SERVER_PID=$!
  else
    echo -e "${YELLOW}⚠️  No HTTP server found. Please install Python 3 or Node.js${NC}"
    exit 1
  fi
  
  echo ""
  echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
  echo ""
  echo "Update files available at:"
  echo "  ${BLUE}http://localhost:8080/${NC}"
  echo ""
  echo "Files in dist directory:"
  ls -lh
  echo ""
  echo -e "${YELLOW}──────────────────────────────────────────${NC}"
  echo ""
  echo "📝 Next steps:"
  echo ""
  echo "1. Install the current version (.exe or .dmg)"
  echo "2. Bump version in package.json (e.g., 0.2.0 → 0.3.0)"
  echo "3. Run this script again to build new version"
  echo "4. Open installed app → Should see 'Update Available' notification"
  echo "5. Click 'Download Update' → 'Restart & Install'"
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
  echo ""
  
  # Wait for user to stop server
  wait $SERVER_PID
else
  echo -e "${YELLOW}⚠️  dist directory not found. Build failed?${NC}"
  exit 1
fi
