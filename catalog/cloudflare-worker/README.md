# AlloFlow Catalog Submission Worker

A small Cloudflare Worker that accepts lesson submissions from the in-canvas form, validates them, runs a server-side PII rescan, and commits each one to `catalog/pending/<timestamp>-<slug>.json` in this repo via the GitHub API.

The Worker holds the GitHub token as a Cloudflare secret. Clients (the Canvas form) only see the public Worker URL; they never see the token.

## One-time setup

### 1. Create a free Cloudflare account
- Go to https://dash.cloudflare.com/sign-up
- No credit card needed for the Workers free tier (100K requests/day).

### 2. Install the Wrangler CLI

```
npm install -g wrangler
```

### 3. Authenticate

```
wrangler login
```

Opens a browser window. Authorize Wrangler with your Cloudflare account.

### 4. Create a fine-grained GitHub Personal Access Token

- Go to https://github.com/settings/personal-access-tokens
- Click **Generate new token** → **Fine-grained token**
- **Resource owner**: your account (Apomera)
- **Repository access**: Only select repositories → `Apomera/AlloFlow`
- **Repository permissions**:
  - Contents: **Read and write**
  - Metadata: **Read-only** (auto)
- **Expiration**: 90 days (set a calendar reminder to rotate)
- Click **Generate token**, then copy it once. You will not see it again.

### 5. Store the token as a Worker secret

From this directory (`catalog/cloudflare-worker/`):

```
wrangler secret put GITHUB_PAT
```

Paste the token when prompted. The token is encrypted at rest in Cloudflare and is only injected into the Worker at runtime.

### 6. Deploy

```
wrangler deploy
```

Wrangler will print the public URL of your Worker, e.g.:

```
https://alloflow-catalog-submit.<your-cf-subdomain>.workers.dev
```

Copy this URL. You will paste it into one constant in the AlloFlow main app code (the `WORKER_SUBMIT_URL` near the in-canvas Submit view).

### 7. Smoke-test

```
curl https://alloflow-catalog-submit.<your-cf-subdomain>.workers.dev/healthz
```

Should return `{"ok":true}`.

Then a fake-submission test:

```
curl -X POST https://alloflow-catalog-submit.<your-cf-subdomain>.workers.dev/submit \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_payload": {"title":"Test","content":"hello"},
    "metadata": {"title":"Test","subject":"Other","grade_level":"K"},
    "affirmations": {
      "author_or_authorized": true,
      "no_pii": true,
      "license_agreed": true,
      "age_eligible": true
    }
  }'
```

Should return `{"ok":true,"slug":"test","filename":"<ts>-test.json","pii_findings_count":0}` and you should see a new file appear in `catalog/pending/` on GitHub within a few seconds.

## Local development

```
wrangler dev
```

Runs the Worker on http://localhost:8787. Note that you still need the secret set (Wrangler uses the same secret in dev). The Worker will commit to the real GitHub repo unless you change `wrangler.toml` to point at a fork.

## Updating

After editing `src/index.js`, redeploy:

```
wrangler deploy
```

## Rotating the GitHub token

Every 90 days when the token expires:

1. Generate a new fine-grained PAT (same scope as before)
2. `wrangler secret put GITHUB_PAT` and paste the new token
3. Worker picks up the new secret on the next request; no redeploy needed

## Security notes

- The Worker is rate-limited only by Cloudflare's default Worker limits. If abuse appears, add Cloudflare WAF rules or KV-based rate limiting in the handler.
- The Worker writes to `catalog/pending/`. The PAT cannot push directly to a branch protection rule; consider adding branch protection on `main` for additional safety.
- All submitted data ends up in a public GitHub commit, even pending ones. The Worker is NOT a private staging area. Reviewers must promptly delete rejected submissions to keep PII out of git history (and use `git filter-repo` if real PII slips through and needs to be erased).
- The Worker does not implement spam protection beyond size + schema validation. If submission volume warrants, add Cloudflare Turnstile to the form and verify the token in the Worker.
