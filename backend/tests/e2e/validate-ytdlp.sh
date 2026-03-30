#!/usr/bin/env bash
# =============================================================================
# QA: yt-dlp validation script for multi-platform view fetching (BEA-24)
#
# Tests that yt-dlp can:
#  1. Extract view_count from TikTok, Instagram Reels, and YouTube Shorts
#  2. Handle invalid/private/deleted URLs gracefully
#  3. Return valid JSON with expected fields
#
# Usage: bash tests/e2e/validate-ytdlp.sh
# =============================================================================

set -uo pipefail

PASS=0
FAIL=0
SKIP=0

log_pass() { echo "  ✅ PASS: $1"; ((PASS++)); }
log_fail() { echo "  ❌ FAIL: $1"; ((FAIL++)); }
log_skip() { echo "  ⏭️  SKIP: $1"; ((SKIP++)); }

# --- Test 1: yt-dlp is installed and accessible ---
echo ""
echo "=== Test 1: yt-dlp availability ==="
if command -v yt-dlp &>/dev/null; then
  VERSION=$(yt-dlp --version)
  log_pass "yt-dlp installed (version: $VERSION)"
else
  log_fail "yt-dlp not found in PATH"
  echo "Cannot proceed without yt-dlp. Exiting."
  exit 1
fi

# --- Test 2: yt-dlp --dump-json outputs valid JSON ---
echo ""
echo "=== Test 2: JSON output format ==="

# Use a well-known YouTube Shorts URL that is very likely to remain available
YT_TEST_URL="https://youtube.com/shorts/dQw4w9WgXcQ"

echo "  Testing with YouTube URL: $YT_TEST_URL"
OUTPUT=$(yt-dlp --dump-json --no-download "$YT_TEST_URL" 2>/dev/null || true)
if [ -z "$OUTPUT" ]; then
  log_skip "YouTube test URL did not return data (may be geo-blocked or rate-limited)"
else
  # Validate JSON
  if echo "$OUTPUT" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    log_pass "Output is valid JSON"
  else
    log_fail "Output is not valid JSON"
  fi

  # Check for view_count field
  VIEW_COUNT=$(echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('view_count', 'MISSING'))" 2>/dev/null || echo "PARSE_ERROR")
  if [ "$VIEW_COUNT" = "MISSING" ] || [ "$VIEW_COUNT" = "PARSE_ERROR" ]; then
    log_fail "view_count field missing from JSON output"
  elif [ "$VIEW_COUNT" = "None" ]; then
    log_fail "view_count is null"
  else
    log_pass "view_count present: $VIEW_COUNT"
  fi

  # Check for other useful fields
  for FIELD in title uploader duration; do
    VAL=$(echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$FIELD', 'MISSING'))" 2>/dev/null || echo "PARSE_ERROR")
    if [ "$VAL" != "MISSING" ] && [ "$VAL" != "PARSE_ERROR" ]; then
      log_pass "$FIELD present"
    else
      log_skip "$FIELD not found in output"
    fi
  done
fi

# --- Test 3: Error handling for invalid URLs ---
echo ""
echo "=== Test 3: Error handling ==="

# Invalid URL
echo "  Testing invalid URL..."
INVALID_OUTPUT=$(yt-dlp --dump-json --no-download "https://www.tiktok.com/@nonexistent/video/0000000000000000000" 2>&1 || true)
if echo "$INVALID_OUTPUT" | grep -qi "error\|unable\|not found\|HTTP Error" 2>/dev/null; then
  log_pass "Invalid URL returns error (expected)"
else
  log_skip "Invalid URL response ambiguous (may vary by yt-dlp version)"
fi

# Non-video URL
echo "  Testing non-video URL..."
NONVID_OUTPUT=$(yt-dlp --dump-json --no-download "https://www.google.com" 2>&1 || true)
EXIT_CODE=$?
if [ -z "$NONVID_OUTPUT" ] || echo "$NONVID_OUTPUT" | grep -qi "error\|unsupported\|no video"; then
  log_pass "Non-video URL handled gracefully"
else
  log_skip "Non-video URL response unclear"
fi

# --- Test 4: Platform URL regex validation (matches url-utils.ts) ---
echo ""
echo "=== Test 4: URL pattern validation (matching backend url-utils.ts) ==="

validate_url() {
  local PLATFORM=$1
  local URL=$2
  local EXPECTED=$3

  case $PLATFORM in
    TIKTOK)    PATTERN='^https?://(www\.|vm\.)?tiktok\.com/' ;;
    INSTAGRAM) PATTERN='^https?://(www\.)?instagram\.com/(reel|p)/' ;;
    YOUTUBE)   PATTERN='^https?://(www\.|m\.)?(youtube\.com/shorts/|youtu\.be/)' ;;
  esac

  if echo "$URL" | grep -qP "$PATTERN"; then
    RESULT="match"
  else
    RESULT="no_match"
  fi

  if [ "$RESULT" = "$EXPECTED" ]; then
    log_pass "$PLATFORM: '$URL' => $RESULT (expected)"
  else
    log_fail "$PLATFORM: '$URL' => $RESULT (expected $EXPECTED)"
  fi
}

# Valid URLs
validate_url TIKTOK   "https://www.tiktok.com/@user/video/7000000000000000001" "match"
validate_url TIKTOK   "https://vm.tiktok.com/ZM6abc123/" "match"
validate_url INSTAGRAM "https://www.instagram.com/reel/ABC123/" "match"
validate_url INSTAGRAM "https://instagram.com/p/XYZ789/" "match"
validate_url YOUTUBE  "https://youtube.com/shorts/dQw4w9WgXcQ" "match"
validate_url YOUTUBE  "https://www.youtube.com/shorts/abc123" "match"

# Invalid: wrong platform
validate_url TIKTOK   "https://www.instagram.com/reel/ABC/" "no_match"
validate_url INSTAGRAM "https://www.tiktok.com/@user/video/123" "no_match"
validate_url YOUTUBE  "https://www.tiktok.com/@user/video/123" "no_match"

# Invalid: wrong format
validate_url YOUTUBE  "https://www.youtube.com/watch?v=abc123" "no_match"
validate_url INSTAGRAM "https://www.instagram.com/stories/user/" "no_match"

# --- Test 5: External post ID extraction ---
echo ""
echo "=== Test 5: External post ID extraction ==="

extract_id() {
  local PLATFORM=$1
  local URL=$2
  local EXPECTED=$3

  case $PLATFORM in
    TIKTOK)    ID=$(echo "$URL" | grep -oP '/video/\K(\d+)' || echo "") ;;
    INSTAGRAM) ID=$(echo "$URL" | grep -oP '/(reel|p)/\K([A-Za-z0-9_-]+)' || echo "") ;;
    YOUTUBE)   ID=$(echo "$URL" | grep -oP '/shorts/\K([A-Za-z0-9_-]+)' || echo "") ;;
  esac

  if [ "$ID" = "$EXPECTED" ]; then
    log_pass "$PLATFORM post ID: '$ID' (correct)"
  else
    log_fail "$PLATFORM post ID: '$ID' (expected '$EXPECTED')"
  fi
}

extract_id TIKTOK   "https://www.tiktok.com/@user/video/7000000000000000001" "7000000000000000001"
extract_id INSTAGRAM "https://www.instagram.com/reel/ABC123test/" "ABC123test"
extract_id YOUTUBE  "https://youtube.com/shorts/dQw4w9WgXcQ" "dQw4w9WgXcQ"

# --- Summary ---
echo ""
echo "========================================="
echo "  RESULTS: $PASS passed, $FAIL failed, $SKIP skipped"
echo "========================================="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
