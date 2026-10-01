# District-controlled bug reporting

This change defaults reporting to **disabled**. It does not establish a signed agreement, district authorization, a FERPA compliance determination, or deployed protection. Configure nothing with real student data until the district has approved the complete collection and support chain.

## Behavior

The diagnostic log and explicit local Copy log action remain available. External reports contain only a manually entered summary (2,000 characters maximum), optional reproduction steps (4,000), a category, and the district/policy/retention/review fields. Logs, stack traces, traces, URLs, user agents, screen sizes, student identifiers, and IP/country fields are not automatically attached.

The user first reviews the actual category, summary and steps, then acknowledges removing student information and explicitly sends. This acknowledgement is not FERPA consent or district approval. A small server-side sensitive-pattern check rejects recognizable identifiers/links/credentials without retaining samples. It cannot recognize every student name or education record, so the approved governance boundary remains required.

There is no Google Form, popup, report-URL clipboard, or alternate-destination fallback. An ambiguous failure leaves the draft in memory and never retries automatically. Closing the form discards the draft and aborts its request; abort cannot retract a report already received by the server.

## District gateway: required integration, not provisioned by this patch

The district host may set window.__alloBugReportBasePath to a path such as /api/bug-reports, only after it has configured an authenticated gateway on the same HTTPS origin. Only simple same-origin paths are accepted; absolute URLs, query strings, fragments, encoded segments and HTTP/file origins cannot enable reporting. Do not expose this setting as a learner preference or load it from localStorage or URL parameters.

The gateway must:

- Authenticate each eligible staff user against the district's identity system. Deny learners/anonymous callers unless the district explicitly authorizes their reporting workflow.
- Apply CSRF protection (validate Origin, require the X-AlloFlow-Report: 2 header for submissions, use appropriate session-cookie settings) and per-user rate limits.
- Map GET {base}/policy to Worker GET /bug-report-policy, and POST {base}/reports to POST /submitBug. Forward only these methods/routes; never forward browser requests to the admin read/delete endpoints.
- Use a server-held, submit-only credential. Discard any browser Authorization header and set the gateway credential itself. Never embed this credential in JavaScript, localStorage, URLs, HTML or logs.
- Forward the payload unchanged. The Worker checks the district, policy and retention rather than trusting client approval flags.
- Record the authenticated staff actor and returned report ID in the district's covered audit system, without copying report contents. The Worker's submit audit identifies the gateway service, not the individual staff user.
- Disable response caching and request-body/header logging. Do not redirect requests or send them to an alternate collector on failure.
- Bind the deployment to one approved district and approved backend destination. Do not use a caller-supplied district ID to choose a credential or destination.

The gateway is deliberately not invented or enabled here: its district identity provider, host, agreement and operators were not supplied. Unconfigured clients perform no reporting network requests.

## Worker configuration

Use a dedicated district deployment with separate approved private BUG_REPORTS and BUG_REPORT_AUDIT KV namespaces. Do not reuse the shared legacy namespace for a new district. Cloudflare account owners and direct KV credentials can bypass application auditing; restrict those credentials and use the district's approved infrastructure audit procedures.

BUG_REPORTS_ENABLED is the exact string "true" only after approval. It defaults to "false" in wrangler.toml.

BUG_REPORTS_POLICY is JSON with exactly these fields:

| Field | Meaning |
| --- | --- |
| districtId | Stable lowercase identifier, 1–64 characters: letters, digits, underscore, hyphen |
| policyId | Versioned reference to the district's approval and agreement record; same identifier format |
| destinationName | Human-readable district support destination, at most 120 characters |
| noticeUrl | HTTPS district reporting notice, without credentials or a fragment |
| approvedUntil | ISO date/time when collection authorization expires |
| retentionSeconds | Required integer, 60–2,592,000 seconds (30-day implementation ceiling; choose the approved duration) |
| auditRetentionSeconds | Required integer, 60–31,536,000 seconds (choose the approved audit duration) |

The bounds are product constraints, not FERPA-prescribed periods. Changing the destination, purpose, agreement, or retention requires a new policyId and renewed district review. Disabled or expired approval stops collection. Existing authorized readers/deleters can finish handling and deletion; revoke their credentials separately when access must end.

BUG_REPORTS_PRINCIPALS is a Worker secret containing an array of objects with exactly id, tokenSha256 and roles. IDs and SHA-256 hashes must be unique. Valid roles are submit, read, delete. Give the gateway only submit. Assign each administrator their own credential and only the needed roles. Do not reuse the catalog ADMIN_TOKEN, distribute shared administrator tokens, or store raw credentials in this repository.

Generate each credential from at least 32 cryptographically random bytes, encode with base64url, and store only its lowercase SHA-256 hex digest in the principal configuration. The caller sends the raw credential in Authorization: Bearer <credential>; accepted token length is 43–128 base64url characters. Rotate/revoke a credential by replacing/removing its principal entry. Use the approved secret manager and administrative client; do not paste real tokens into chats or command history.

The Worker rejects reporting CORS preflights and adds no public CORS headers to these routes. Gateway/server authorization is still mandatory; CORS alone is not an access control.

## Access, retention and deletion

- GET /bugs with a read credential returns up to 50 records' IDs, category and timestamps, plus a pagination cursor. It does not return summary/steps. Follow the returned cursor until null; an empty page may still have a cursor.
- GET /bugs/{id} requires read and returns the individual report.
- DELETE /bugs/{id} requires delete, writes an expiring deletion marker and deletes the report. A 202 receipt means deletion was requested, not instant global erasure.
- The old /bugs?token=... path and shared ADMIN_TOKEN cannot authorize these routes.
- Every authorized submit/list/read/delete attempt and successful completion has a mandatory content-free audit record with principal, district, policy, action, stage, report ID where applicable, and time. Audit-storage failure blocks access. A completion-audit failure after a storage write can yield an ambiguous 503; do not blindly retry.
- Reports and audit records receive KV expiry. Reads also reject expired records independently of KV cleanup. Increasing policy retention never extends an existing record's saved expiry.
- Shortening retention immediately hides older records through these APIs, but does not rewrite their original physical KV expiry. The operator must enumerate and delete those records under the approved retention procedure. Audit-retention changes likewise require handling older audit records.
- KV changes propagate eventually. Verification must include the covered regions and any authorized downstream copies, not just a successful DELETE response. Deletion markers contain only random report IDs and expire after 31 days, beyond the maximum report lifetime.
- Disabling collection does not delete data. Revoking a reader does not delete their prior exports. Copies, backups, gateway logging, infrastructure logs, support exports, incident handling and deletion obligations belong in the district's approved operational procedure.

Cloudflare reference: https://developers.cloudflare.com/kv/api/write-key-value-pairs/ and https://developers.cloudflare.com/kv/concepts/how-kv-works/

## Existing reports and rollout

1. Verify the deployed client and Worker versions separately; this source snapshot is not proof of a deployed release.
2. Have the authorized operator stop the legacy collection path while the replacement ships. Updating only the Worker leaves old clients capable of opening the Google Form fallback. Updating only the client leaves the old Worker accepting legacy callers. Coordinate both, clear/invalidate applicable caches and validate deployed network behavior.
3. Inventory the old BUG_REPORTS namespace, Google Form response sheets, saved report URLs, logs and any exports through the approved incident/retention process. Do not copy their contents into this repository, a public issue or a developer chat.
4. Determine with the district what must be returned, preserved or deleted. Obtain authorization before deleting existing records. This patch neither migrates legacy reports nor silently purges them.
5. Use scoped infrastructure access for any authorized legacy cleanup and record completion in the covered audit system. The generic read-queues.ps1 helper now excludes bug reports.
6. Deploy the default-disabled client and Worker. Verify no default upload or fallback, including old cached clients.
7. Configure and validate the district gateway, storage, principal permissions, notice, agreement record, retention and deletion process using synthetic data.
8. Enable only after that end-to-end validation and district authorization.

## Focused verification

Run the reporter privacy, existing local diagnostic, and Worker governance suites from the repository's existing test environment. Run catalog/cloudflare-worker/smoke_test.mjs for neighboring endpoint routing. All fixtures use synthetic data, mocked KV and mocked transport; these checks do not certify a deployed gateway or the district's agreements.

Acceptance includes missing/expired configuration, credential roles/revocation, cross-district and stale-policy rejection, unknown payload fields, reviewed-only transmission, no raw logs/URLs/traces, no fallback, bounded bodies, rejection without PII samples, expiring data and audit records, audited read/delete, legacy isolation, storage/audit failures, and close/late-response lifecycle behavior.
