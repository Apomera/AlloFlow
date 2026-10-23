# Private AlloFlow report digest

This separate Worker emails the developer a count and the fixed private inbox link at **09:00 America/New_York**. It never reads report bodies or notes and never modifies `BUG_REPORTS`. Deployment leaves automatic email disabled. Empty digests are never sent.

## Bindings and prerequisites

- `BUG_DIGEST`: SQLite Durable Object class `BugDigest`, one object for this inbox/destination.
- `BUG_REPORTS`: existing KV namespace `b8dddf6fa1404c088ab63376255e2620`, used only with `list({prefix:'bug:'})`.
- `EMAIL`: `send_email` binding. The committed Wrangler configuration restricts sender `alerts@alloflow.dev`; the production deployment helper instead applies `destination_address` for the verified developer recipient, keeping that private address out of the repository. The sender remains fixed to `alerts@alloflow.dev` in code.
- Secrets configured separately: `ADMIN_TOKEN` and `DIGEST_RECIPIENT`. The recipient must be a verified Cloudflare Email Routing destination. Neither value belongs in source control.
- Domain Email Routing must be onboarded before the manual test. Sending to a verified destination is free on Workers Free, including when only Email Routing is configured. Arbitrary recipients require a paid plan. SQLite Durable Objects also support Workers Free. This configuration does not enroll in a paid plan; free service quotas still apply. [Email plans](https://developers.cloudflare.com/email-service/), [SQLite plan support](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Cron runs hourly (`0 * * * *` UTC) and checks a persisted next 09:00 America/New_York timestamp, accounting for daylight saving transitions. Missed runs are caught on the next hourly invocation. Enabling after 09:00 begins the following day. Local tests must use simulated bindings: do not enable `remote:true` or point local tests at production storage/email.

## Private admin API

All routes require `Authorization: Bearer <ADMIN_TOKEN>` and return `Cache-Control: no-store, private`. Query parameters are rejected. JSON request bodies are bounded to 4 KiB. There is no public report or health endpoint.

| Request | JSON body | Behavior |
| --- | --- | --- |
| `GET /admin/status` | — | Enabled state, cutoff, next run, last scan problem, reserved receipt count, latest 20 batches. No recipient or report content. |
| `POST /admin/setup` | `{"operationId":"unique_setup_id_01","enabled":true,"cutoff":"2026-10-22T21:00:00.000Z"}` | Explicitly enables from the chosen cutoff. Use the actual current ISO timestamp to exclude historical reports. The initial cutoff is immutable. |
| `POST /admin/setup` | `{"operationId":"unique_disable_01","enabled":false}` | Disables future automatic digests and invalidates a running scan. An external send already started cannot be withdrawn. |
| `POST /admin/test` | `{"operationId":"unique_test_id_001"}` | Sends one labeled setup test, even while automatic digests are disabled. No report scan, mutation, or cutoff change. |
| `POST /admin/retry` | `{"operationId":"unique_retry_id_01","batchId":"returned-batch-id","acceptDuplicateRisk":true}` | Explicit retry of a failed/uncertain batch after at least 60 seconds; maximum three attempts total. |

Operation IDs must be 16–100 letters, digits, underscores or hyphens. Repeating an identical request with the same operation ID returns the existing result and never sends again. Reusing an operation ID for another request returns 409. Keep the ID after a timeout and inspect status before further action.

Batch status is `sending`, `accepted`, `failed`, or `uncertain`. **Accepted means the email service returned a message ID, not confirmed mailbox delivery.** Known validation/quota rejections are failed. Timeouts, missing acknowledgements, other errors and interrupted sends are uncertain. Provider diagnostic text is never exposed or stored. An explicit retry of an uncertain outcome may duplicate a message; this requires acknowledgement of that risk. No send is automatically retried. Cron logs only a fixed failure category or a batch ID/status requiring review.

## Storage and delivery behavior

Receipt reservations, batch and attempt records are written atomically in SQLite; `storage.sync()` completes before the external send. A reserved receipt remains tied to its batch even if email fails. Restarted unfinished sends become uncertain. Stale unfinished attempts are also surfaced after two minutes. The service does not promise exactly-once external delivery.

Each due digest scans KV from the beginning, follows empty continuation pages, and deduplicates against the permanent receipt ledger. Only keys newer than the selected cutoff and no later than scan start qualify. No maximum-timestamp watermark is used: a key omitted by KV's eventual consistency can appear in a later digest even if its timestamp is older than the previous scan.

Invalid pages/keys, missing/repeated cursors, storage failures or more than 40 pages fail visibly without sending a partial batch. No receipt reservation occurs before the complete scan succeeds. A scan lease and settings revision prevent overlapping or disabled scans from reserving a batch. The next hourly cron may retry a failed scan, which had no email side effect. Inbox growth beyond the scan bound requires an explicit design change.

Email contains no receipt keys, user information, stack traces, notes or tokens. Its fixed link is `https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/bug-inbox`; reading the inbox still requires its separate bearer token.

## Validation and references

Run from the repository root: `node node_modules/vitest/vitest.mjs run tests/bug_report_digest.test.js --maxWorkers=1`. Tests use actual in-memory SQLite and synthetic bindings; they send no mail and need no dependency installation.

[Email binding API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [SQLite transaction/sync API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [KV listing](https://developers.cloudflare.com/kv/api/list-keys/).
