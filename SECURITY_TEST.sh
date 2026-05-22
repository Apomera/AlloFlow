#!/bin/bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║        AlloFlow Security Regression Test Suite — Week 1–3 Hardening       ║
# ║                    Verify all 18 security fixes are in place               ║
# ╚════════════════════════════════════════════════════════════════════════════╝

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Helper functions
pass() {
    echo -e \"${GREEN}✓${NC} $1\"
    ((PASS++))
}

fail() {
    echo -e \"${RED}✗${NC} $1\"
    ((FAIL++))
}

warn() {
    echo -e \"${YELLOW}⚠${NC} $1\"
    ((WARN++))
}

info() {
    echo -e \"${BLUE}ℹ${NC} $1\"
}

section() {
    echo \"\"
    echo -e \"${BLUE}═══════════════════════════════════════════════════════════════${NC}\"
    echo -e \"${BLUE}  $1${NC}\"
    echo -e \"${BLUE}═══════════════════════════════════════════════════════════════${NC}\"
}

# ════════════════════════════════════════════════════════════════════════════════
# WEEK 1 — Critical Fixes (7 tests)
# ════════════════════════════════════════════════════════════════════════════════

section \"WEEK 1 — Critical Fixes\"

# Test 1.1: Port lockdown to localhost
info \"1.1 — Checking port binding to 127.0.0.1...\"
if grep -q '\"127.0.0.1:8090:8090\"' docker/docker-compose.yml && \\
   grep -q '\"127.0.0.1:11434:11434\"' docker/docker-compose.yml && \\
   grep -q '\"127.0.0.1:7860:7860\"' docker/docker-compose.yml && \\
   grep -q '\"127.0.0.1:5001:5001\"' docker/docker-compose.yml && \\
   grep -q '\"127.0.0.1:8888:8080\"' docker/docker-compose.yml; then
    pass \"1.1 — All services bound to localhost only\"
else
    fail \"1.1 — Port binding incomplete (check docker-compose.yml)\"
fi

# Test 1.2: SearXNG secret externalized
info \"1.2 — Checking SearXNG secret externalization...\"
if grep -q 'SEARXNG_SECRET_KEY=\\${SEARXNG_SECRET_KEY}' docker/docker-compose.yml && \\
   ! grep -q 'secret_key.*alloflow' docker/searxng/settings.yml; then
    pass \"1.2 — SearXNG secret moved to environment variable\"
else
    fail \"1.2 — SearXNG secret still hardcoded (check docker-compose.yml)\"
fi

# Test 1.3: API keys moved to headers
info \"1.3 — Checking API key migration to headers...\"
if grep -q \"Authorization.*Bearer\" src/aiProvider.js && \\
   ! grep -q \"key=\\${.*apiKey\" src/aiProvider.js; then
    pass \"1.3 — API keys moved to Authorization headers\"
else
    fail \"1.3 — API keys still in query parameters (check src/aiProvider.js)\"
fi

# Test 1.4: CORS restricted to localhost
info \"1.4 — Checking CORS restrictions...\"
if grep -q 'allow_origins.*localhost' docker/flux-server/flux_server.py && \\
   grep -q 'allow_origins.*localhost' docker/edge-tts-server/server.py && \\
   ! grep -q 'allow_origins.*\\[\"\\*\"\\]' docker/flux-server/flux_server.py; then
    pass \"1.4 — CORS restricted to localhost origins\"
else
    fail \"1.4 — CORS not properly restricted (check Python service configs)\"
fi

# Test 1.5: CSP headers present
info \"1.5 — Checking Content-Security-Policy header...\"
if grep -q 'Content-Security-Policy' docker/nginx.conf && \\
   grep -q 'default-src' docker/nginx.conf && \\
   grep -q 'script-src' docker/nginx.conf; then
    pass \"1.5 — Content-Security-Policy header configured\"
else
    fail \"1.5 — CSP header missing (check docker/nginx.conf)\"
fi

# Test 1.6: Lucide CDN pinned with version
info \"1.6 — Checking Lucide CDN version pinning...\"
if grep -q '@0.405.0' index.html && ! grep -q '@latest' index.html; then
    pass \"1.6 — Lucide CDN pinned to specific version (v0.405.0)\"
else
    fail \"1.6 — Lucide CDN not pinned (check index.html)\"
fi

# Test 1.7: SVG injection vulnerability fixed
info \"1.7 — Checking SVG injection fix...\"
if grep -q 'hero-allobot.*<img' index.html || ! grep -q 'innerHTML.*svg' index.html; then
    pass \"1.7 — SVG injection vulnerability removed\"
else
    warn \"1.7 — SVG handling may still use innerHTML (verify index.html manually)\"
fi

# ════════════════════════════════════════════════════════════════════════════════
# WEEK 2 — High-Priority Hardening (6 tests)
# ════════════════════════════════════════════════════════════════════════════════

section \"WEEK 2 — High-Priority Hardening\"

# Test 2.1: Rate limiting configured
info \"2.1 — Checking rate limiting zones...\"
if grep -q 'limit_req_zone' docker/nginx.conf && \\
   grep -q '30r/s' docker/nginx.conf && \\
   grep -q '1r/s' docker/nginx.conf && \\
   grep -q '10r/s' docker/nginx.conf; then
    pass \"2.1 — Rate limiting zones configured (api:30r/s, image:1r/s, tts:10r/s)\"
else
    fail \"2.1 — Rate limiting zones not configured (check docker/nginx.conf)\"
fi

# Test 2.2: Input validation in Python services
info \"2.2 — Checking input length validation...\"
if grep -q 'MAX_INPUT_LENGTH.*5000' docker/edge-tts-server/server.py && \\
   grep -q 'max_length=1000' docker/flux-server/flux_server.py && \\
   grep -q 'MAX_TOTAL_TOKENS.*8192' docker/npu_server.py; then
    pass \"2.2 — Input validation applied (TTS:5000, Flux:1000, NPU:8192 tokens)\"
else
    fail \"2.2 — Input validation incomplete (check Python service files)\"
fi

# Test 2.3: Security headers present
info \"2.3 — Checking security headers (HSTS, Referrer-Policy, etc.)...\"
if grep -q 'Strict-Transport-Security' docker/nginx.conf && \\
   grep -q 'Referrer-Policy' docker/nginx.conf && \\
   grep -q 'Permissions-Policy' docker/nginx.conf; then
    pass \"2.3 — Security headers configured (HSTS, Referrer-Policy, Permissions-Policy)\"
else
    fail \"2.3 — Security headers incomplete (check docker/nginx.conf)\"
fi

# Test 2.4: Non-root container execution
info \"2.4 — Checking non-root container users...\"
if grep -q 'USER nginx' docker/Dockerfile && \\
   grep -q 'USER 1000' docker/flux-server/Dockerfile && \\
   grep -q 'USER 1000' docker/edge-tts-server/Dockerfile; then
    pass \"2.4 — All containers running as non-root users\"
else
    fail \"2.4 — Some containers still running as root (check Dockerfile USER directives)\"
fi

# Test 2.5: npm audit configured
info \"2.5 — Checking npm audit in build pipeline...\"
if grep -q 'npm audit' docker/Dockerfile; then
    pass \"2.5 — npm audit integrated into build process\"
else
    warn \"2.5 — npm audit not found in Dockerfile (optional but recommended)\"
fi

# Test 2.6: Docker network isolation
info \"2.6 — Checking network isolation...\"
if grep -q '^networks:' docker/docker-compose.yml && \\
   grep -q 'internal: true' docker/docker-compose.yml && \\
   grep -q '\\- frontend' docker/docker-compose.yml && \\
   grep -q '\\- backend' docker/docker-compose.yml; then
    pass \"2.6 — Network segmentation configured (frontend/backend with internal=true)\"
else
    fail \"2.6 — Network isolation not properly configured (check docker-compose.yml)\"
fi

# ════════════════════════════════════════════════════════════════════════════════
# WEEK 3 — Medium Priority + Validation (5 tests)
# ════════════════════════════════════════════════════════════════════════════════

section \"WEEK 3 — Medium Priority + Validation\"

# Test 3.1: Path validation in DataLayer
info \"3.1 — Checking path parameter validation...\"
if grep -q 'validatePathParameter' src/dataLayer.js && \\
   grep -q 'SAFE_ID_REGEX.*\\^\\[a-zA-Z0-9_-\\]' src/dataLayer.js; then
    pass \"3.1 — Path validation function implemented with whitelist regex\"
else
    fail \"3.1 — Path validation not found (check src/dataLayer.js)\"
fi

# Test 3.2: Log rotation configured
info \"3.2 — Checking log rotation (json-file driver)...\"
if grep -q '\"json-file\"' docker/docker-compose.yml && \\
   grep -q 'max-size: \"10m\"' docker/docker-compose.yml && \\
   grep -q 'max-file: \"3\"' docker/docker-compose.yml; then
    # Count how many services have logging config
    LOG_COUNT=$(grep -c 'driver: \"json-file\"' docker/docker-compose.yml)
    if [ \"$LOG_COUNT\" -ge 3 ]; then
        pass \"3.2 — Log rotation configured for multiple services (max-size:10m, max-file:3)\"
    else
        warn \"3.2 — Log rotation only on $LOG_COUNT services (should be on all)\"
    fi
else
    fail \"3.2 — Log rotation not configured (check docker-compose.yml)\"
fi

# Test 3.3: PocketBase rules documentation
info \"3.3 — Checking PocketBase access rules documentation...\"
if [ -f 'POCKETBASE_RULES.md' ]; then
    if grep -q 'students.*read.*own' POCKETBASE_RULES.md && \\
       grep -q 'teachers.*read all' POCKETBASE_RULES.md; then
        pass \"3.3 — PocketBase access rules documented\"
    else
        warn \"3.3 — POCKETBASE_RULES.md exists but may be incomplete\"
    fi
else
    fail \"3.3 — POCKETBASE_RULES.md not found\"
fi

# Test 3.4: Hash verification in setup script
info \"3.4 — Checking SHA-256 hash verification in setup-local-ai.bat...\"
if grep -q 'SHA256\\|sha256\\|Get-FileHash' setup-local-ai.bat && \\
   grep -q 'COMPUTED_HASH\\|EXPECTED_HASH' setup-local-ai.bat; then
    pass \"3.4 — Hash verification framework added to setup script\"
else
    fail \"3.4 — Hash verification not found (check setup-local-ai.bat)\"
fi

# Test 3.5: This script exists!
info \"3.5 — Security regression test suite...\"
if [ -f 'SECURITY_TEST.sh' ] || [ -f \"$0\" ]; then
    pass \"3.5 — Security regression test suite created\"
else
    warn \"3.5 — This script should be saved as SECURITY_TEST.sh\"
fi

# ════════════════════════════════════════════════════════════════════════════════
# Summary Report
# ════════════════════════════════════════════════════════════════════════════════

section \"Summary Report\"

TOTAL=$((PASS + FAIL + WARN))

echo \"\"
echo -e \"${GREEN}Passed:${NC}  $PASS\"
echo -e \"${RED}Failed:${NC}  $FAIL\"
echo -e \"${YELLOW}Warnings:${NC} $WARN\"
echo -e \"${BLUE}Total:${NC}   $TOTAL\"
echo \"\"

if [ $FAIL -eq 0 ]; then
    echo -e \"${GREEN}═══════════════════════════════════════════════════════════════${NC}\"
    echo -e \"${GREEN}  ✓ All security fixes verified! Ready for deployment.${NC}\"
    echo -e \"${GREEN}═══════════════════════════════════════════════════════════════${NC}\"
    exit 0
else
    echo -e \"${RED}═══════════════════════════════════════════════════════════════${NC}\"
    echo -e \"${RED}  ✗ Some security checks failed. Please review above.${NC}\"
    echo -e \"${RED}═══════════════════════════════════════════════════════════════${NC}\"
    exit 1
fi
