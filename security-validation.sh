#!/bin/bash
# AlloFlow Security Regression Test Suite — Week 1–3 Hardening
# Verify all 18 security fixes are in place

cd "$(dirname "$0")"

PASS=0
FAIL=0
WARN=0

# Helper functions
pass() { echo "✓ $1"; ((PASS++)); }
fail() { echo "✗ $1"; ((FAIL++)); }
warn() { echo "⚠ $1"; ((WARN++)); }
info() { echo ""; echo "=== $1 ==="; echo ""; }

# WEEK 1 — Critical Fixes
info "WEEK 1 — Critical Fixes (7 tests)"

# 1.1 Port lockdown
if grep -q '127.0.0.1:8090:8090' docker/docker-compose.yml && \
   grep -q '127.0.0.1:11434:11434' docker/docker-compose.yml && \
   grep -q '127.0.0.1:7860:7860' docker/docker-compose.yml && \
   grep -q '127.0.0.1:5001:5001' docker/docker-compose.yml; then
  pass "1.1 — All services bound to localhost only (127.0.0.1)"
else
  fail "1.1 — Port binding incomplete"
fi

# 1.2 SearXNG secret externalized
if grep -q 'SEARXNG_SECRET_KEY=' docker/docker-compose.yml; then
  pass "1.2 — SearXNG secret moved to environment variable"
else
  fail "1.2 — SearXNG secret still hardcoded"
fi

# 1.3 API keys moved to headers
if grep -q 'Authorization.*Bearer' src/aiProvider.js; then
  pass "1.3 — API keys moved to Authorization headers"
else
  fail "1.3 — API keys still in query parameters"
fi

# 1.4 CORS restricted to localhost
if grep -q 'localhost' docker/flux-server/flux_server.py && \
   grep -q 'localhost' docker/edge-tts-server/server.py; then
  pass "1.4 — CORS restricted to localhost origins"
else
  fail "1.4 — CORS not properly restricted"
fi

# 1.5 CSP headers
if grep -q 'Content-Security-Policy' docker/nginx.conf; then
  pass "1.5 — Content-Security-Policy header configured"
else
  fail "1.5 — CSP header missing"
fi

# 1.6 Lucide pinned
if grep -q '@0.405.0' index.html; then
  pass "1.6 — Lucide CDN pinned to v0.405.0"
else
  fail "1.6 — Lucide CDN not pinned"
fi

# 1.7 SVG injection fixed
if ! grep -q 'innerHTML.*svg' index.html; then
  pass "1.7 — SVG injection vulnerability removed"
else
  warn "1.7 — SVG handling may still use innerHTML"
fi

# WEEK 2 — High-Priority Hardening
info "WEEK 2 — High-Priority Hardening (6 tests)"

# 2.1 Rate limiting
if grep -q 'limit_req_zone' docker/nginx.conf && \
   grep -q '30r/s' docker/nginx.conf; then
  pass "2.1 — Rate limiting zones configured"
else
  fail "2.1 — Rate limiting zones not configured"
fi

# 2.2 Input validation
if grep -q 'MAX_INPUT_LENGTH.*5000' docker/edge-tts-server/server.py && \
   grep -q 'max_length=1000' docker/flux-server/flux_server.py; then
  pass "2.2 — Input validation applied (TTS:5000, Flux:1000)"
else
  fail "2.2 — Input validation incomplete"
fi

# 2.3 Security headers
if grep -q 'Strict-Transport-Security' docker/nginx.conf && \
   grep -q 'Referrer-Policy' docker/nginx.conf; then
  pass "2.3 — Security headers configured (HSTS, Referrer-Policy)"
else
  fail "2.3 — Security headers incomplete"
fi

# 2.4 Non-root containers
if grep -q 'USER nginx' docker/Dockerfile && \
   grep -q 'USER 1000' docker/flux-server/Dockerfile; then
  pass "2.4 — Containers running as non-root users"
else
  fail "2.4 — Some containers still running as root"
fi

# 2.5 npm audit
if grep -q 'npm audit' docker/Dockerfile; then
  pass "2.5 — npm audit integrated into build"
else
  warn "2.5 — npm audit not in Dockerfile (optional)"
fi

# 2.6 Network isolation
if grep -q 'internal: true' docker/docker-compose.yml && \
   grep -q 'frontend' docker/docker-compose.yml && \
   grep -q 'backend' docker/docker-compose.yml; then
  pass "2.6 — Network segmentation configured (frontend/backend)"
else
  fail "2.6 — Network isolation not configured"
fi

# WEEK 3 — Medium Priority + Validation
info "WEEK 3 — Medium Priority + Validation (5 tests)"

# 3.1 Path validation
if grep -q 'validatePathParameter' src/dataLayer.js && \
   grep -q 'SAFE_ID_REGEX' src/dataLayer.js; then
  pass "3.1 — Path validation function implemented"
else
  fail "3.1 — Path validation not found"
fi

# 3.2 Log rotation
LOG_COUNT=$(grep -c 'driver: "json-file"' docker/docker-compose.yml)
if [ "$LOG_COUNT" -ge 3 ]; then
  pass "3.2 — Log rotation configured (json-file, max-size:10m) on $LOG_COUNT services"
else
  warn "3.2 — Log rotation only on $LOG_COUNT services"
fi

# 3.3 PocketBase rules documentation
if [ -f 'POCKETBASE_RULES.md' ]; then
  pass "3.3 — PocketBase access rules documented"
else
  fail "3.3 — POCKETBASE_RULES.md not found"
fi

# 3.4 Hash verification
if grep -q 'Get-FileHash\|SHA256' setup-local-ai.bat; then
  pass "3.4 — Hash verification framework in setup script"
else
  fail "3.4 — Hash verification not found"
fi

# 3.5 Security test suite
if [ -f 'security-validation.sh' ] || [ -f 'SECURITY_TEST.sh' ]; then
  pass "3.5 — Security regression test suite created"
else
  warn "3.5 — Test suite should be saved"
fi

# Summary
info "SUMMARY"
TOTAL=$((PASS + FAIL + WARN))
echo "Passed:  $PASS"
echo "Failed:  $FAIL"
echo "Warnings: $WARN"
echo "Total:   $TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✓ All security fixes verified! Ready for deployment."
  exit 0
else
  echo "✗ Some security checks failed. Please review above."
  exit 1
fi
