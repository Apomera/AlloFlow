# Bug-report privacy safeguards — implementation handoff

Prepared on 2026-09-27 in an isolated source snapshot. Shared runtime files and deployment were not changed. No live reports, Cloudflare secrets, district accounts, or Google Form responses were accessed.

## Result

The candidate defaults external reporting to disabled. It removes the hardcoded collector and Google Form fallback, keeps captured diagnostics out of submissions, and adds a review form for manually entered category/summary/reproduction steps. A configured same-origin district gateway and current server policy are required before any submission.

The Worker rejects legacy payloads and query-string/shared admin credentials. District scope, policy version, retention, principal roles, bounded payloads and review acknowledgement are validated on the server. New reports and audit records have explicit expiry. Individual reads and deletion requests are audited; audit failure blocks access. Metadata listing excludes report text. Generic queue export no longer includes bug reports.

A regular-expression check rejects some recognizable sensitive text without storing match samples. This is not de-identification and does not prove that free text contains no education-record information.

## Verification completed

- **74/74 focused tests passed**, four suites: Worker governance (34), reporter privacy/lifecycle/accessibility (21), existing local diagnostic sanitization (11), and existing TTS diagnostics (8). Evidence: final-tests.json.
- **68 Worker smoke assertions passed, 0 failed**, using the existing mocked network/KV runner. This checked neighboring catalog, translation, PD and plugin behavior as well as default-disabled bug routes.
- **Two Edge browser cases passed**, 1280×900 and 390×844. Browser 154.0.4258.37. All requests were intercepted in a disposable context; the fixture's synthetic gateway called the candidate's real Worker handlers with synthetic credentials and in-memory KV. Default reporting generated no request beyond loading the fixture. Reviewed submissions created exactly two synthetic reports and four audit events. No uncaught page errors. Evidence: browser-results.json and review-1280.png / review-390.png.
- Desktop and phone review screenshots were inspected for layout. Keyboard focus stayed in the form. The DOM harness initially grouped selector-list results out of document order; explicit document ordering fixed that compatibility failure and passed both the DOM suite and browser.
- The root reporter and desktop public mirror are byte-identical in the candidate.
- Integration patch passed git apply --check --whitespace=error-all against local HEAD 758bdb5e7d0974f8afc9a5f9ef7443bbaba12322. It was **not applied**. All snapshotted shared files still matched their original hashes at that check.

No full application build, production deployment, real gateway authentication check, or live retention purge was performed.

## Baseline and isolation

Source snapshot HEAD: cbdace49bcacebd6d1693dced3d5d3fd75e9f36e. Exact file hashes are in basis.json. Local checkout state is not assumed to equal deployment state.

The managed full-worktree attempt failed with a disk-full error and was cleaned up by the worktree service. No failed worktree remained in Git's worktree listing. Work continued with only the relevant files under candidate/ and basis/. Existing dependencies are referenced through a node_modules junction; no packages were installed.

## Integration files and owners

- Diagnostic UI: error_reporter_module.js and desktop/web-app/public/error_reporter_module.js. The reporter is handwritten; update both together through the normal release process.
- Worker: catalog/cloudflare-worker/src/bug-reports.js (new), src/index.js routing, wrangler.toml default-disabled flag.
- Operator workflow: BUG_REPORTING.md (new), README.md, SETUP.md, CLOUDFLARE_SETUP.md, read-queues.ps1, set-admin-token.ps1.
- Tests: tests/bug_report_governance.test.js and tests/error_reporter_privacy.test.js (new), existing reporter tests updated to inspect the explicit local export rather than the removed upload behavior, and Worker smoke tests updated for fail-closed bug routes.

Use bug-report-privacy.patch for the bounded integration. Do not copy the entire candidate directory into the primary checkout: its package.json and vitest.config.js are only an isolated test harness, and node_modules is a junction. The preparation scripts and prepared.json are historical assembly artifacts, not deployment/install commands. Source changes in the patch and the verified candidate are authoritative.

## Before enabling reporting

Read candidate/catalog/cloudflare-worker/BUG_REPORTING.md for the full configuration and operating contract.

The district's identity provider, same-origin gateway, signed agreement/approval, responsible operators, retention duration, and deletion process were not supplied. This patch does **not** invent or provision them. The gateway must authenticate eligible users, enforce CSRF/rate limits, hold only a submit credential, record staff identity in the district audit system, and never expose admin routes or secrets to the browser.

Each district needs approved report and audit storage, individual administrator credentials, a current policy reference, and an approval expiry. Keep reporting disabled until that complete flow is validated with synthetic data. The repository's legacy shared namespace must not be reused as a new district's store.

Existing reports remain untouched. Default-disabled code does not purge prior KV records, response sheets, URLs, logs, exports or backups. An authorized operator must inventory and handle them under the district's retention/incident process. Direct Cloudflare account access also requires scoped permissions and covered infrastructure auditing.

KV deletion propagates eventually; a 202 means accepted, not immediate erasure everywhere. Retention reduction hides older records through the API but does not rewrite existing physical expirations; authorized cleanup is required for those records and audit copies. Audit-write failure after a successful report write can produce an ambiguous response, so the client never automatically retries.

Coordinate client and Worker rollout. Updating only the Worker leaves cached old clients able to open the Google Form fallback; updating only the client leaves an old Worker accepting legacy callers. Verify actual deployed artifacts and invalidate applicable caches before treating the old route as closed.

This privacy work is separate from the earlier reader-performance candidate and does not resolve its comparison-latency acceptance gate.

