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

# ── Step 0: release.json freshness check (advisory only) ──────────
# Warns if release.json (top-level canonical) was NOT modified in the
# most recent git commit. Pure advisory — never aborts the deploy.
{
  _af_yellow=$'\033[33m'
  _af_green=$'\033[32m'
  _af_reset=$'\033[0m'
  echo ""
  echo "=== Step 0: release.json freshness check ==="
  if git rev-parse --git-dir >/dev/null 2>&1; then
    if git log -1 --name-only --format= 2>/dev/null | grep -q "release.json"; then
      printf "%s✓ release.json was bumped in last commit%s\n" "$_af_green" "$_af_reset"
    else
      printf "%s⚠️  release.json was NOT modified in last commit — did you forget to run bump-link.mjs?%s\n" "$_af_yellow" "$_af_reset"
      printf "%s   (Continuing anyway — Step 0 is advisory only.)%s\n" "$_af_yellow" "$_af_reset"
    fi
  else
    printf "%s⚠️  Not in a git repo; skipping freshness check.%s\n" "$_af_yellow" "$_af_reset"
  fi
  echo "=== end Step 0 ==="
  echo ""
} || true
# === end Step 0 ===

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

# ── Step 0.6: render-path free-variable gate ──────────────────────
# Blocks the deploy if any *_module.js has an undeclared identifier in a hook
# dependency array (the data / onPlayAudio / isEscaped render-crash class that
# hard-crashes WordSoundsModal/TeacherModule on render). set -e aborts the
# deploy on failure. Emergency bypass: SKIP_RENDER_CHECK=1 ./deploy.sh "..."
if [[ "${SKIP_RENDER_CHECK:-0}" != "1" ]]; then
  echo ""
  echo "=== Step 0.6: render-path free-variable gate ==="
  node dev-tools/check_render_refs.cjs --quiet
  echo "  ✓ no render-path free vars in CDN modules."
  node dev-tools/check_keyless_map.cjs --quiet
  echo "  ✓ no keyless list children in CDN modules / STEM tools."
  node dev-tools/check_stem_render.cjs --quiet
  echo "  ✓ all STEM tools render without throwing (render-phase smoke)."
  node dev-tools/check_sel_render.cjs --quiet
  echo "  ✓ all SEL Hub tools render without throwing (render-phase smoke)."
  node dev-tools/check_module_render.cjs --quiet
  echo "  ✓ curated non-STEM CDN modules render without throwing."
  node dev-tools/check_aria_handler.cjs --quiet
  echo "  ✓ no object-typed aria-labels / unguarded tool-state array-spreads."
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
# Capture the hash build.js will stamp into pluginCdnVersion. build.js uses
# `git rev-parse --short HEAD` (build.js:1262) to set the CDN version, so this
# is the value the deployed AlloFlowANTI.txt SHOULD carry. Step 10 asserts it.
BUILD_HASH=$(git rev-parse --short HEAD)
echo "  Expected pluginCdnVersion (from HEAD): @${BUILD_HASH}"
node build.js --mode=prod --force
echo "  ✓ build.js complete."

# ── Step 3.5: Mirror link-distribution files into prismflow-deploy/public/ ──
# The 4 link-distribution files (launch.html, changelog.html, release.json,
# releases.json) live at the repo root as source-of-truth (served by GitHub
# Pages). We copy them into prismflow-deploy/public/ so the React build picks
# them up and Firebase serves them too. cp -p preserves mtimes.
echo ""
echo "=== Step 3.5: Mirror link-distribution files to prismflow-deploy/public/ ==="
for f in launch.html changelog.html release.json releases.json; do
  if [[ -f "$f" ]]; then
    cp -p "$f" "prismflow-deploy/public/$f"
    echo "  ✓ mirrored $f"
  else
    echo "  ⚠ $f missing at repo root — skipping"
  fi
done

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
# Self-cleaning deploys: build.js auto-copies committed roots over the public
# mirrors during Step 3; without this line those deterministic copies linger
# as a dirty tree after every deploy.
git add prismflow-deploy/public/ 2>/dev/null || true
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

# ── Step 10: Post-deploy verification ─────────────────────────────
# The deploy is already live by now, so this step NEVER undoes anything — it
# tells you whether the deploy is actually serving the bits you just built, and
# surfaces issues you'd otherwise only find by hand-curling. Three checks:
#   (1) Hash consistency  — root AlloFlowANTI.txt pluginCdnVersion == @BUILD_HASH
#                            == the prismflow-deploy/src mirror, and is a real
#                            commit. Catches build.js-didn't-rewrite / drift.   [HARD]
#   (2) Firebase host      — https://prismflow-911fe.web.app → 200 + non-trivial.[HARD]
#   (3) CDN modules        — alloflow-cdn.pages.dev key modules → 200 (HARD) and
#                            md5 == local root module (FRESHNESS — soft warning,
#                            Cloudflare Pages rebuilds async ~1-2 min after push).
# HARD failures make the script exit 1 (so a "successful" deploy that didn't
# actually land is loud). Skip with SKIP_POST_VERIFY=1 (e.g. offline re-deploys).
PV_FAIL=0
PV_WARN=0
PV_DETAILS=""
if [[ "${SKIP_POST_VERIFY:-0}" == "1" ]]; then
  echo ""
  echo "=== Step 10: Post-deploy verification (SKIPPED via SKIP_POST_VERIFY=1) ==="
else
  echo ""
  echo "=== Step 10: Post-deploy verification ==="

  FIREBASE_URL="https://prismflow-911fe.web.app"
  CDN_BASE="https://alloflow-cdn.pages.dev"
  # Modules most worth confirming reached the CDN (pipeline-critical first).
  CDN_MODULES=(doc_pipeline_module.js view_pdf_audit_module.js gemini_api_module.js)
  CDN_RETRIES="${POST_VERIFY_CDN_RETRIES:-4}"   # freshness re-checks (Cloudflare lag)
  CDN_WAIT="${POST_VERIFY_CDN_WAIT:-20}"        # seconds between freshness re-checks

  pv_fail() { PV_FAIL=$((PV_FAIL+1)); PV_DETAILS="${PV_DETAILS}\n  ✗ $1"; printf "  \033[31m✗ %s\033[0m\n" "$1"; }
  pv_warn() { PV_WARN=$((PV_WARN+1)); PV_DETAILS="${PV_DETAILS}\n  ⚠ $1"; printf "  \033[33m⚠ %s\033[0m\n" "$1"; }
  pv_ok()   { printf "  \033[32m✓ %s\033[0m\n" "$1"; }

  # ── Check 1: hash consistency (local, deterministic) ──
  echo "  [1/3] Hash consistency…"
  ROOT_VER=$(grep -m1 "var pluginCdnVersion = " AlloFlowANTI.txt 2>/dev/null | sed -E "s/.*'([^']*)'.*/\1/")
  MIRROR_VER=$(grep -m1 "var pluginCdnVersion = " prismflow-deploy/src/AlloFlowANTI.txt 2>/dev/null | sed -E "s/.*'([^']*)'.*/\1/")
  if [[ -z "${ROOT_VER:-}" ]]; then
    pv_fail "could not read pluginCdnVersion from AlloFlowANTI.txt"
  else
    if [[ "$ROOT_VER" == "$BUILD_HASH" ]]; then
      pv_ok "pluginCdnVersion @${ROOT_VER} matches the built hash"
    else
      pv_fail "pluginCdnVersion @${ROOT_VER} != built hash @${BUILD_HASH} (build.js may not have rewritten refs)"
    fi
    if [[ "$MIRROR_VER" == "$ROOT_VER" ]]; then
      pv_ok "prismflow-deploy/src mirror agrees (@${MIRROR_VER})"
    else
      pv_fail "mirror pluginCdnVersion @${MIRROR_VER:-<empty>} != root @${ROOT_VER} (root/mirror drift)"
    fi
    if git cat-file -e "${ROOT_VER}^{commit}" 2>/dev/null; then
      pv_ok "@${ROOT_VER} is a real commit in history"
    else
      pv_fail "@${ROOT_VER} is not a commit in this repo (garbage hash)"
    fi
  fi

  # ── Check 2: Firebase host reachable ──
  echo "  [2/3] Firebase host ($FIREBASE_URL)…"
  FB_RESP=$(curl -s -o /dev/null -w "%{http_code} %{size_download}" "$FIREBASE_URL" 2>/dev/null || echo "000 0")
  FB_CODE=${FB_RESP%% *}; FB_SIZE=${FB_RESP##* }
  if [[ "$FB_CODE" == "200" && "${FB_SIZE:-0}" -gt 1000 ]]; then
    pv_ok "host returned 200 (${FB_SIZE} bytes)"
  else
    pv_fail "host returned HTTP ${FB_CODE}, ${FB_SIZE} bytes (expected 200 + >1KB)"
  fi

  # ── Check 3: CDN modules reachable (HARD) + fresh (soft, retried) ──
  echo "  [3/3] CDN modules ($CDN_BASE)…"
  STALE=()
  for mod in "${CDN_MODULES[@]}"; do
    [[ -f "$mod" ]] || { pv_warn "local $mod missing — skipping CDN check"; continue; }
    LOCAL_MD5=$(md5sum "$mod" | awk '{print $1}')
    TMP=$(mktemp)
    HCODE=$(curl -s -o "$TMP" -w "%{http_code}" "$CDN_BASE/$mod?v=$BUILD_HASH" 2>/dev/null || echo "000")
    if [[ "$HCODE" != "200" || ! -s "$TMP" ]]; then
      pv_fail "$mod → HTTP ${HCODE} / empty (CDN unreachable or misconfigured)"
      rm -f "$TMP"; continue
    fi
    CDN_MD5=$(md5sum "$TMP" | awk '{print $1}'); rm -f "$TMP"
    if [[ "$CDN_MD5" == "$LOCAL_MD5" ]]; then
      pv_ok "$mod reachable + fresh (md5 matches local)"
    else
      pv_ok "$mod reachable (200) — content not yet propagated"
      STALE+=("$mod")
    fi
  done
  # Retry only the stale ones — Cloudflare Pages builds async after the push.
  attempt=0
  while [[ ${#STALE[@]} -gt 0 && $attempt -lt $CDN_RETRIES ]]; do
    attempt=$((attempt+1))
    echo "  … ${#STALE[@]} module(s) still propagating; re-checking in ${CDN_WAIT}s (attempt ${attempt}/${CDN_RETRIES})"
    sleep "$CDN_WAIT"
    STILL=()
    for mod in "${STALE[@]}"; do
      LOCAL_MD5=$(md5sum "$mod" | awk '{print $1}')
      TMP=$(mktemp)
      curl -s -o "$TMP" "$CDN_BASE/$mod?v=$BUILD_HASH" 2>/dev/null || true
      CDN_MD5=$(md5sum "$TMP" | awk '{print $1}'); rm -f "$TMP"
      if [[ "$CDN_MD5" == "$LOCAL_MD5" ]]; then
        pv_ok "$mod now fresh (md5 matches local)"
      else
        STILL+=("$mod")
      fi
    done
    STALE=("${STILL[@]}")
  done
  if [[ ${#STALE[@]} -gt 0 ]]; then
    pv_warn "${#STALE[@]} module(s) still stale after ${CDN_RETRIES} retries: ${STALE[*]}"
    echo "    (Cloudflare Pages can take a few min. Re-check later with:)"
    echo "    for m in ${STALE[*]}; do curl -s \"$CDN_BASE/\$m\" | md5sum; md5sum \"\$m\"; done"
  fi
fi

# ── Done ───────────────────────────────────────────────────────────
HASH_FINAL=$(git rev-parse --short HEAD)
echo ""
echo "════════════════════════════════════════════"
if [[ $PV_FAIL -gt 0 ]]; then
  echo "  ✗ Deploy ran, but post-deploy verification FAILED ($PV_FAIL issue(s))"
elif [[ $PV_WARN -gt 0 ]]; then
  echo "  ✓ Deploy complete (with $PV_WARN warning(s) — see above)"
else
  echo "  ✓ Deploy complete + verified"
fi
echo "════════════════════════════════════════════"
echo ""
echo "  Live URL:  https://prismflow-911fe.web.app"
echo "  Hash:      @${HASH_FINAL}"
echo "  GitHub:    https://github.com/Apomera/AlloFlow"
echo "  Codeberg:  https://codeberg.org/Pomera/AlloFlow-backup"
if [[ -n "$PV_DETAILS" ]]; then
  printf "\n  Verification notes:%b\n" "$PV_DETAILS"
fi
echo ""
if [[ $PV_FAIL -gt 0 ]]; then
  exit 1
fi
