#!/usr/bin/env bash
# Publish only an already-built, tested, signed static hosting candidate.
# Source commits, source pushes, builds, and backups are deliberately separate.
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Usage:
  CLOUDFLARE_ACCOUNT_ID=<existing-account-id> ./dev-tools/deploy_verified_candidate.sh --verified-candidate <manifest.json> <payload-directory>

Prepare a candidate using .github/workflows/release-candidate.yml at the exact
reviewed source SHA, after verify.yml and security-safeguards.yml pass. Download
that run's alloflow-release-candidate-<sha>-<attempt> artifact. In a clean isolated
checkout of that SHA, pass its manifest.json and payload directory above.

The verifier requires GitHub CLI with attestation support, live successful checks
for the same SHA and latest run attempts, and exact manifest/artifact hashes.
Evidence expires after 72 hours. Missing/unavailable/skipped/red/stale evidence
blocks publication. No locally written success flag or SKIP_* bypass is accepted.

The selected payload is copied into a private temporary staging directory and
reverified immediately before installed Wrangler 4 publishes static Pages assets
to the existing alloflow-cdn project, production branch main. The signed manifest
binds that target and includes both /app/ and the root public modules. Firebase
is not part of this release. CLOUDFLARE_ACCOUNT_ID must identify the existing
account; use its already-provisioned authentication. No login,
dependency installation, source commit/push, rebuilding, or backup is performed.
The staging directory is retained for review. Website publication still requires
the operator's authorization; passing verification does not grant that authority.

The old combined commit/build/push/deploy mode is disabled. Git-integrated Pages
promotion and account branch rules are separate and are not changed by this tool.
EOF
  exit 0
fi

if [[ "${1:-}" != "--verified-candidate" || "$#" -ne 3 ]]; then
  echo "Release blocked: the combined commit/build/push/deploy path is disabled." >&2
  echo "Run ./dev-tools/deploy_verified_candidate.sh --help for the verified-candidate publication flow." >&2
  exit 2
fi
for name in SKIP_RENDER_CHECK SKIP_CHANGED_TESTS SKIP_CDN_DEPLOYABLE SKIP_COMMENT_BUDGET SKIP_POST_VERIFY SKIP_DESKTOP_BUILD SKIP_FIREBASE_DEPLOY SKIP_BACKUP SKIP_CLOUD_PARITY ALLOFLOW_SKIP_RUNTIME_INTEGRITY; do
  if [[ -n "${!name:-}" && "${!name}" != "0" ]]; then
    echo "Release blocked: $name is not supported for candidate publication." >&2
    exit 2
  fi
done
for name in "${!SKIP_@}" "${!ALLOFLOW_SKIP_@}"; do
  if [[ -n "${!name:-}" && "${!name}" != "0" ]]; then
    echo "Release blocked: $name is not supported for candidate publication." >&2
    exit 2
  fi
done
for name in WRANGLER_CONFIG CLOUDFLARE_API_BASE_URL; do
  if [[ -n "${!name:-}" ]]; then
    echo "Release blocked: $name override is not allowed for candidate publication." >&2
    exit 2
  fi
done
if [[ ! "${CLOUDFLARE_ACCOUNT_ID:-}" =~ ^[a-fA-F0-9]{32}$ ]]; then
  echo "Release blocked: explicitly set the existing CLOUDFLARE_ACCOUNT_ID." >&2
  exit 2
fi
if ! command -v gh >/dev/null || ! command -v wrangler >/dev/null || ! command -v node >/dev/null; then
  echo "Release blocked: provision GitHub CLI, Node and Wrangler 4 before publication; this script does not install or log in." >&2
  exit 2
fi
export CLOUDFLARE_ACCOUNT_ID
export WRANGLER_SEND_METRICS=false
export CI=true
WRANGLER_VERSION="$(wrangler --version)"
if [[ ! "$WRANGLER_VERSION" =~ (^|[[:space:]])4\.[0-9]+\.[0-9]+([[:space:]]|$) ]]; then
  echo "Release blocked: installed Wrangler 4 is required." >&2
  exit 2
fi

CALLER_PWD="$PWD"
MANIFEST_ARG="$2"
PAYLOAD_ARG="$3"
[[ "$MANIFEST_ARG" = /* || "$MANIFEST_ARG" =~ ^[A-Za-z]:[\\/] ]] || MANIFEST_ARG="$CALLER_PWD/$MANIFEST_ARG"
[[ "$PAYLOAD_ARG" = /* || "$PAYLOAD_ARG" =~ ^[A-Za-z]:[\\/] ]] || PAYLOAD_ARG="$CALLER_PWD/$PAYLOAD_ARG"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"
RELEASE_GATE="$SCRIPT_DIR/dev-tools/security_release_candidate.cjs"
VERIFIED_STAGE="$(node "$RELEASE_GATE" stage "--root=$SCRIPT_DIR" "--manifest=$MANIFEST_ARG" "--payload=$PAYLOAD_ARG")"
[[ -n "$VERIFIED_STAGE" && ! -L "$VERIFIED_STAGE" && -d "$VERIFIED_STAGE/payload/site" && "$(basename -- "$VERIFIED_STAGE")" == alloflow-verified-release-* ]] || {
  echo "Release blocked: invalid staging directory returned." >&2
  exit 2
}
STAGE_PARENT="$(dirname -- "$VERIFIED_STAGE")"
for cfg in wrangler.toml wrangler.json wrangler.jsonc; do
  if [[ -e "$STAGE_PARENT/$cfg" ]]; then
    echo "Release blocked: unexpected $cfg in staging parent directory." >&2
    exit 2
  fi
done
echo "Publishing verified candidate to Cloudflare Pages: alloflow-cdn (main)"
(
  cd "$VERIFIED_STAGE/payload/site"
  SOURCE_SHA="$(node "$RELEASE_GATE" verified-source "--root=$SCRIPT_DIR" "--manifest=$VERIFIED_STAGE/manifest.json" "--payload=$VERIFIED_STAGE/payload")"
  [[ "$SOURCE_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo "Release blocked: invalid verified source." >&2; exit 2; }
  wrangler pages deploy . --project-name alloflow-cdn --branch main --commit-hash "$SOURCE_SHA" --commit-dirty=false
)
echo "Verified candidate staging retained at: $VERIFIED_STAGE"
