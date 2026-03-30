# QA Test Suite — BEA-24: Multi-Platform View Tracking

## Quick Start

```bash
cd /home/ubuntu/cleo/backend

# 1. Seed test data
npx ts-node tests/fixtures/seed-test-data.ts

# 2. yt-dlp validation (no backend needed)
bash tests/e2e/validate-ytdlp.sh

# 3. View tracking + earnings (DB only, no backend needed)
npx ts-node tests/e2e/test-view-tracking-earnings.ts

# 4. Multi-URL submission API (requires backend running on :4002)
bash tests/e2e/test-multi-url-submission.sh
```

## Test Coverage

| Test | What it validates | Backend needed? |
|------|------------------|-----------------|
| `validate-ytdlp.sh` | yt-dlp install, JSON output, view_count extraction, URL patterns, post ID extraction | No |
| `test-view-tracking-earnings.ts` | ViewSnapshot creation, earnings calculation (3 platforms summed), campaign spend, budget exhaustion, idempotency | No (DB only) |
| `test-multi-url-submission.sh` | Auth, marketplace, claim creation, multi-URL submission, cross-platform URL rejection, DB verification | Yes |

## Test Data

- **Infoproductor**: `qa-infoproductor@test.kleo` / `Test1234!`
- **Clipper**: `qa-clipper@test.kleo` / `Test1234!`
- **Campaign**: `qa-test-campaign` — $5 CPM, $1000 budget
- **Expected earnings**: 3 platforms x 1000 views = $12.00 net (20% fee)
