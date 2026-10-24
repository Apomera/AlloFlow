# Bug report delivery and developer inbox

Open `Open Bug Report Inbox.cmd` from the repository folder on the configured Windows computer. It copies the inbox token and opens the private inbox. Paste the token into **Inbox access token**, then choose **Open inbox**. You can also run `catalog/cloudflare-worker/open-bug-inbox.ps1` in PowerShell.

Inbox: https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/bug-inbox

The inbox uses a dedicated `BUG_REPORTS_ADMIN_TOKEN` Worker secret. It authorizes reading bug reports and adding private review events. Existing `ADMIN_TOKEN` remains unchanged for other queues. If the dedicated secret is absent, the inbox supports the existing admin token as a fallback. Send the token as an Authorization Bearer header; query-string tokens are not accepted.

The local copy is encrypted with Windows DPAPI for the current Windows account, at `desktop/.local/bug-inbox-token.dpapi.secret`. Git ignores this directory and `.secret` files. The opener does not print the token or put it into a URL. The browser holds it in memory until sign-out, navigation, or closing the page. Paste it only into the inbox; copying another item afterwards replaces it on the clipboard.

For another computer, an administrator must provision the token securely, or rotate the dedicated Worker secret and save the replacement locally. Do not publish it in this repository, logs, screenshots, or chat. `wrangler secret put BUG_REPORTS_ADMIN_TOKEN` prompts for a replacement; rotating it invalidates the previous token. The `-CheckOnly` opener option checks local decryption without changing the clipboard or opening a browser.

## What delivery means

The reporter shows **Report saved** only after the service acknowledges storage. The receipt stays visible and can be copied. This confirms that the service received and stored the report. Receiving the daily email confirms receipt of a notification; neither confirmation means a developer has opened or reviewed the report. Use the private inbox to read reports and record review progress.

The submit endpoint writes to private `BUG_REPORTS` KV and returns its record ID. The inbox loads newest reports first, with pagination. Cloudflare KV can take time to make a new write visible at every location; refresh if a freshly saved receipt is not listed immediately.

If a request times out or loses its connection, the reporter says delivery is unconfirmed: the service may already have saved it. If you use the alternate form, paste the copied log and press **Submit** there; opening the form alone sends nothing. The app cannot confirm alternate-form submissions.

## Reviewing reports

Select a receipt to see its original report and **Private review**. Choose **New**, **Investigating**, or **Resolved**, add an optional note, and choose **Save review**. Notes are appended to a dated history; they do not replace earlier notes or alter the original report. Everyone with the inbox token can read these notes. The app does not send them back to the reporter.

Search, the status filter, and **Group similar loaded reports** apply only to reports already loaded. Grouping ignores timestamps and stack line coordinates but preserves error codes and other meaningful numbers. Every receipt remains separately selectable; grouping never merges or deletes stored reports.

Drafts stay in page memory when changing reports, filtering, or refreshing. Sign-out, navigation, or closing the page clears them. Saved events are retained on screen during storage propagation. If a save is not confirmed, refresh the history before retrying: the service may have saved it already, and a retry can add a duplicate note. Saves are never retried automatically.

You can opt into **Refresh every 30 seconds while this page is visible**. It starts off, pauses when the page is hidden, and reports newly loaded receipts without removing older loaded reports or drafts. It requires the inbox to stay open and signed in; it does not send email or operating-system notifications.

Review events use separate `bug-review:` keys in the existing private KV namespace. Status is determined by the latest status event's server timestamp, with the event ID breaking ties. Notes are append-only, so simultaneous saves preserve both notes. KV propagation means another browser may briefly show an older status or incomplete history. This is not an atomic multi-user editing system.

## Daily email digest

The separate [bug digest Worker](../bug-digest-worker/README.md) is configured to notify the verified developer recipient at **09:00 America/New_York**, with daylight saving changes handled automatically. It sends only when there are newly discovered reports after the configured setup cutoff; empty digests are not sent. Submitting a report does not send an immediate email. Storage propagation can defer a report to a later digest, and a delayed scheduled run is handled by the next hourly check.

Each email contains only the new-report count and the fixed private inbox link. The digest never reads report bodies or notes, and emails contain no report details, receipt IDs, or access tokens. Report storage continues independently of notification delivery. The digest's `accepted` state means the email service acknowledged the send, not that the message appeared in the recipient's inbox or was read. Viewing a report or changing its review status does not change whether it counts as a new receipt.

Opening the link still requires the separate inbox token. On the configured Windows computer, Codex can retrieve a specified report when asked, using the saved local credential privately and matching its receipt. A digest email does not automatically start an agent review or repair. Keep recipient addresses and credentials out of shared logs, screenshots, and chat; share only the receipt and report details needed for the requested work.

## Verification and scope

Focused tests cover submission receipts, timeouts, duplicate clicks, private inbox access, safe text rendering, expired sessions, pagination, review history, draft preservation, and eventual consistency. Test reports must be clearly labeled synthetic and contain no private learner information.

The reporting release is assembled from the deployed baseline plus reporting-only edits. Other unfinished app changes are excluded. Production evidence and the exact narrow patch are in `artifacts/error-report-delivery-2026-10-21/` on the working computer; those artifacts and the encrypted credential are not part of the release.

The review-workflow follow-up uses the same narrow deployment approach. Its local evidence is in `artifacts/bug-inbox-workflow-2026-10-22/`.
