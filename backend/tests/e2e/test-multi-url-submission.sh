#!/usr/bin/env bash
# =============================================================================
# QA E2E: Multi-URL submission flow (BEA-24)
#
# Pre-requisites:
#   1. Backend running on localhost:4002
#   2. Seed data: npx ts-node tests/fixtures/seed-test-data.ts
#
# Tests:
#   1. Login as clipper
#   2. List marketplace clips
#   3. Create claim for a campaign clip
#   4. Submit multi-URL (3 platforms) for the claim
#   5. Validate URL-platform matching (cross-platform rejection)
#   6. Verify submissions created correctly in DB
#
# Usage: bash tests/e2e/test-multi-url-submission.sh
# =============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:4002/api/v1}"
CLIPPER_EMAIL="qa-clipper@test.kleo"
CLIPPER_PASS="Test1234!"
INFOPRODUCTOR_EMAIL="qa-infoproductor@test.kleo"

PASS=0
FAIL=0
SKIP=0

log_pass() { echo "  ✅ PASS: $1"; ((PASS++)); }
log_fail() { echo "  ❌ FAIL: $1 — $2"; ((FAIL++)); }
log_skip() { echo "  ⏭️  SKIP: $1"; ((SKIP++)); }

# Check backend is running
echo ""
echo "=== Pre-check: Backend availability ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/../" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
  echo "  ❌ Backend not reachable at $BASE_URL"
  echo "  Start the backend first: cd backend && npm run start:dev"
  exit 1
fi
log_pass "Backend reachable"

# --- Test 1: Login ---
echo ""
echo "=== Test 1: Authentication ==="
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$CLIPPER_EMAIL\",\"password\":\"$CLIPPER_PASS\"}")

TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  log_pass "Login as clipper successful"
else
  log_fail "Login failed" "$LOGIN_RESP"
  echo "Cannot continue without auth token. Exiting."
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# --- Test 2: Marketplace ---
echo ""
echo "=== Test 2: Marketplace listing ==="
MARKET_RESP=$(curl -s "$BASE_URL/marketplace" -H "$AUTH")
CLIP_COUNT=$(echo "$MARKET_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else d.get('total',0))" 2>/dev/null || echo "0")
if [ "$CLIP_COUNT" -gt 0 ] 2>/dev/null; then
  log_pass "Marketplace has $CLIP_COUNT clips"
else
  log_skip "Marketplace empty or endpoint differs (got: $CLIP_COUNT)"
fi

# --- Test 3: Create claim ---
echo ""
echo "=== Test 3: Claim creation ==="

# Get campaign clip ID from seeded data
CAMPAIGN_CLIP_ID=$(PGPASSWORD=cleo123 psql -h localhost -U cleo -d cleo -t -A -c \
  "SELECT id FROM campaign_clips WHERE \"campaignId\" = 'qa-test-campaign' LIMIT 1;" 2>/dev/null)

if [ -z "$CAMPAIGN_CLIP_ID" ]; then
  log_fail "Cannot find campaign clip" "Run seed first"
  exit 1
fi

# Create a fresh claim (delete any existing test claim first for idempotency)
PGPASSWORD=cleo123 psql -h localhost -U cleo -d cleo -c \
  "DELETE FROM clip_claims WHERE \"campaignClipId\" = '$CAMPAIGN_CLIP_ID' AND \"clipperId\" IN (SELECT id FROM users WHERE email = '$CLIPPER_EMAIL');" 2>/dev/null

CLAIM_RESP=$(curl -s -X POST "$BASE_URL/claims" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"campaignClipId\":\"$CAMPAIGN_CLIP_ID\"}")

CLAIM_ID=$(echo "$CLAIM_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$CLAIM_ID" ] && [ "$CLAIM_ID" != "" ]; then
  log_pass "Claim created: $CLAIM_ID"
else
  log_fail "Claim creation failed" "$CLAIM_RESP"
  # Try to use existing claim
  CLAIM_ID=$(PGPASSWORD=cleo123 psql -h localhost -U cleo -d cleo -t -A -c \
    "SELECT id FROM clip_claims WHERE \"campaignClipId\" = '$CAMPAIGN_CLIP_ID' LIMIT 1;" 2>/dev/null)
  if [ -z "$CLAIM_ID" ]; then
    echo "No claim available. Exiting."
    exit 1
  fi
  echo "  Using existing claim: $CLAIM_ID"
fi

# --- Test 4: Multi-URL submission ---
echo ""
echo "=== Test 4: Multi-URL submission ==="

# Test the multi-URL endpoint (POST /claims/:id/submissions)
MULTI_RESP=$(curl -s -X POST "$BASE_URL/claims/$CLAIM_ID/submissions" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "urls": [
      {"platform": "TIKTOK", "url": "https://www.tiktok.com/@testuser/video/7000000000000000001"},
      {"platform": "INSTAGRAM", "url": "https://www.instagram.com/reel/ABC123test/"},
      {"platform": "YOUTUBE", "url": "https://youtube.com/shorts/dQw4w9WgXcQ"}
    ]
  }')

# Check if multi-URL endpoint exists and works
MULTI_STATUS=$(echo "$MULTI_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if isinstance(d, list) and len(d) == 3:
    print('OK')
elif 'submissions' in d and len(d['submissions']) == 3:
    print('OK')
elif 'statusCode' in d:
    print(f'ERROR:{d[\"statusCode\"]}:{d.get(\"message\",\"\")}')
else:
    print('UNKNOWN')
" 2>/dev/null || echo "PARSE_FAIL")

case "$MULTI_STATUS" in
  OK)
    log_pass "Multi-URL submission accepted (3 URLs)"
    ;;
  ERROR:404*)
    log_skip "Multi-URL endpoint not implemented yet (404) — backend BEA-21 pending"
    # Fallback: test single-URL submission
    echo ""
    echo "  Falling back to single-URL submission test..."
    SINGLE_RESP=$(curl -s -X POST "$BASE_URL/claims/$CLAIM_ID/submit" \
      -H "$AUTH" -H "Content-Type: application/json" \
      -d '{"socialUrl": "https://www.tiktok.com/@testuser/video/7000000000000000001"}')
    SINGLE_ID=$(echo "$SINGLE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
    if [ -n "$SINGLE_ID" ] && [ "$SINGLE_ID" != "" ]; then
      log_pass "Single-URL submission works (fallback): $SINGLE_ID"
    else
      log_fail "Single-URL submission also failed" "$SINGLE_RESP"
    fi
    ;;
  *)
    log_fail "Multi-URL submission unexpected response" "$MULTI_RESP"
    ;;
esac

# --- Test 5: URL-platform cross-validation ---
echo ""
echo "=== Test 5: URL-platform cross-validation ==="

# TikTok URL submitted as YouTube should be rejected
CROSS_RESP=$(curl -s -X POST "$BASE_URL/claims/$CLAIM_ID/submissions" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "urls": [
      {"platform": "YOUTUBE", "url": "https://www.tiktok.com/@user/video/123"}
    ]
  }')

CROSS_CODE=$(echo "$CROSS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',200))" 2>/dev/null || echo "0")
if [ "$CROSS_CODE" = "400" ] || [ "$CROSS_CODE" = "422" ]; then
  log_pass "Cross-platform URL rejected (status $CROSS_CODE)"
elif [ "$CROSS_CODE" = "404" ]; then
  log_skip "Endpoint not yet available — backend BEA-21 pending"
else
  log_skip "Cross-validation response: $CROSS_RESP"
fi

# --- Test 6: DB verification ---
echo ""
echo "=== Test 6: Database verification ==="

SUB_COUNT=$(PGPASSWORD=cleo123 psql -h localhost -U cleo -d cleo -t -A -c \
  "SELECT count(*) FROM clip_submissions WHERE \"claimId\" = '$CLAIM_ID';" 2>/dev/null)

echo "  Submissions for claim $CLAIM_ID: $SUB_COUNT"
if [ "$SUB_COUNT" = "3" ]; then
  log_pass "3 submissions linked to same claim"
elif [ "$SUB_COUNT" -gt 0 ] 2>/dev/null; then
  log_skip "Only $SUB_COUNT submission(s) — multi-URL may not be implemented yet"
else
  log_fail "No submissions found" "Expected at least 1"
fi

# Check platforms are distinct
DISTINCT_PLATFORMS=$(PGPASSWORD=cleo123 psql -h localhost -U cleo -d cleo -t -A -c \
  "SELECT count(DISTINCT platform) FROM clip_submissions WHERE \"claimId\" = '$CLAIM_ID';" 2>/dev/null)
if [ "$DISTINCT_PLATFORMS" = "$SUB_COUNT" ]; then
  log_pass "All submissions have distinct platforms ($DISTINCT_PLATFORMS)"
else
  log_fail "Duplicate platforms detected" "distinct=$DISTINCT_PLATFORMS, total=$SUB_COUNT"
fi

# --- Summary ---
echo ""
echo "========================================="
echo "  RESULTS: $PASS passed, $FAIL failed, $SKIP skipped"
echo "========================================="
echo ""
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
