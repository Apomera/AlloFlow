#!/usr/bin/env bash
# deploy.sh — AlloFlow turbo-all deploy in one command.
#
# Usage:
#   1. Stage your source changes:    git add <files-you-want-committed>
#   2. Run the deploy:                ./deploy.sh "Your commit message"
#
# What it does (10 steps in one shot):
#   1.  Commits staged changes (skips if nothing staged — useful for re-deploys)
#   2.  Pushes source commit to origin (GitHub)
#   3.  Runs `node build.js --mode=prod --force` (rewrites CDN hash refs)
#   4.  Runs `npm run build` in prismflow-deploy/
#   5.  Runs `firebase deploy --only hosting`
#   6.  Auto-commits the post-deploy hash refs (the mirror files)
#   7.  Pushes the post-deploy commit to origin
#   8.  Mirrors main to the `backup` remote (Codeberg) — if configured
#   9.  Pushes any new tags to backup
#  10.  Reports the live URL + final hash
#
# Aborts on any error. Run `./deploy.sh --help` for details.

set -e          # abort on any error
set -u          # abort on undefined variables
set -o pipefail # abort on pipe failure

# ── Help ───────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<EOF
Usage: ./deploy.sh "Commit message describing the source change"

WORKFLOW:
  1. Stage the files you want to commit:
       git add view_foo_module.js AlloFlowANTI.txt prismflow-deploy/...
  2. Run the script with your commit message:
       ./deploy.sh "Extract FooView into CDN module"

The script handles: source commit, push, build, deploy, post-deploy
commit (with hash refs), push, and mirror to the Codeberg backup.

If nothing is staged, the script skips the source commit and just
runs build + deploy + post-deploy. Useful when re-running a deploy
after fixing a build error.

Aborts on any error — your local state is left in a recoverable place.
EOF
  exit 0
fi

# ── Argument validation ────────────────────────────────────────────
if [[ -z "${1:-}" ]]; then
  echo "Error: Commit message required as first argument."
  echo "Usage: ./deploy.sh \"Your commit message here\""
  echo "Run './deploy.sh --help' for details."
  exit 1
fi

COMMIT_MSG="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Verify git repo + branch ───────────────────────────────────────
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: Not in a git repository."
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Warning: Current branch is '$CURRENT_BRANCH', not 'main'."
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# ── Step 1: Source commit ──────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "  AlloFlow Turbo-All Deploy"
echo "════════════════════════════════════════════"
echo ""
echo "=== Step 1: Source commit ==="
SOURCE_COMMITTED=0
if git diff --cached --quiet; then
  echo "  No staged changes. Skipping source commit."
  echo "  (Will still run build + deploy + post-deploy commit.)"
else
  echo "  Committing with message: \"$COMMIT_MSG\""
  git commit -m "$COMMIT_MSG"
  SOURCE_COMMITTED=1
  echo "  ✓ Source commit created."
fi

# ── Step 2: Push source commit to origin ──────────────────────────
echo ""
echo "=== Step 2: Push source commit to origin ==="
if [[ $SOURCE_COMMITTED -eq 1 ]]; then
  git push origin main
  echo "  ✓ Pushed source to origin."
else
  echo "  Skipped (no source commit to push)."
fi

# ── Step 3: Run build.js prod ──────────────────────────────────────
echo ""
echo "=== Step 3: Run build.js --mode=prod --force ==="
node build.js --mode=prod --force
echo "  ✓ build.js complete."

# ── Step 4: npm run build (prismflow-deploy) ──────────────────────
echo ""
echo "=== Step 4: npm run build (prismflow-deploy) ==="
(cd prismflow-deploy && npm run build)
echo "  ✓ npm build complete."

# ── Step 5: Firebase deploy ────────────────────────────────────────
echo ""
echo "=== Step 5: Firebase deploy ==="
(cd prismflow-deploy && npx firebase deploy --only hosting)
echo "  ✓ Firebase deploy complete."

# ── Step 6: Post-deploy commit (hash refs in mirror files) ────────
echo ""
echo "=== Step 6: Post-deploy commit (CDN hash refs) ==="
git add AlloFlowANTI.txt prismflow-deploy/src/AlloFlowANTI.txt prismflow-deploy/src/App.jsx 2>/dev/null || true
POST_COMMITTED=0
if git diff --cached --quiet; then
  echo "  No post-deploy changes. (Hash refs were already current.)"
else
  HASH=$(git rev-parse --short HEAD)
  git commit -m "Post-deploy: update CDN hash refs to @${HASH}"
  POST_COMMITTED=1
  echo "  ✓ Post-deploy commit created (hash @${HASH})."
fi

# ── Step 7: Push post-deploy commit to origin ─────────────────────
echo ""
echo "=== Step 7: Push post-deploy commit to origin ==="
if [[ $POST_COMMITTED -eq 1 ]]; then
  git push origin main
  echo "  ✓ Pushed post-deploy to origin."
else
  echo "  Skipped (no post-deploy commit to push)."
fi

# ── Step 8: Mirror everything to Codeberg backup ──────────────────
echo ""
echo "=== Step 8: Mirror to Codeberg backup ==="
if git remote get-url backup >/dev/null 2>&1; then
  git push backup main
  echo "  ✓ Mirrored main to backup (Codeberg)."

  # Step 9: Push any tags that exist locally
  if [[ -n "$(git tag -l)" ]]; then
    echo ""
    echo "=== Step 9: Push tags to backup ==="
    git push backup --tags 2>&1 | tail -5 || echo "  (Tag push had warnings; main is already up-to-date.)"
    echo "  ✓ Tags mirrored."
  fi
else
  echo "  WARNING: 'backup' remote not configured. Skipping Codeberg mirror."
  echo "  To configure: git remote add backup https://codeberg.org/Pomera/AlloFlow-backup.git"
fi

# ── Done ───────────────────────────────────────────────────────────
HASH_FINAL=$(git rev-parse --short HEAD)
echo ""
echo "════════════════════════════════════════════"
echo "  ✓ Deploy complete"
echo "════════════════════════════════════════════"
echo ""
echo "  Live URL:  https://prismflow-911fe.web.app"
echo "  Hash:      @${HASH_FINAL}"
echo "  GitHub:    https://github.com/Apomera/AlloFlow"
echo "  Codeberg:  https://codeberg.org/Pomera/AlloFlow-backup"
echo ""
