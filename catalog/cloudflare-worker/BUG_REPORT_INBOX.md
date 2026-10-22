# Bug report delivery and developer inbox

Open `Open Bug Report Inbox.cmd` from the repository folder on the configured Windows computer. It copies the inbox token and opens the private inbox. Paste the token into **Inbox access token**, then choose **Open inbox**. You can also run `catalog/cloudflare-worker/open-bug-inbox.ps1` in PowerShell.

Inbox: https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/bug-inbox

The inbox uses a dedicated `BUG_REPORTS_ADMIN_TOKEN` Worker secret. It authorizes only the bug report reader. Existing `ADMIN_TOKEN` remains unchanged for other queues. If the dedicated secret is absent, the reader supports the existing admin token as a fallback. Send the token as an Authorization Bearer header; query-string tokens are not accepted.

The local copy is encrypted with Windows DPAPI for the current Windows account, at `desktop/.local/bug-inbox-token.dpapi.secret`. Git ignores this directory and `.secret` files. The opener does not print the token or put it into a URL. The browser holds it in memory until sign-out, navigation, or closing the page. Paste it only into the inbox; copying another item afterwards replaces it on the clipboard.

For another computer, an administrator must provision the token securely, or rotate the dedicated Worker secret and save the replacement locally. Do not publish it in this repository, logs, screenshots, or chat. `wrangler secret put BUG_REPORTS_ADMIN_TOKEN` prompts for a replacement; rotating it invalidates the previous token. The `-CheckOnly` opener option checks local decryption without changing the clipboard or opening a browser.

## What delivery means

The reporter shows **Report saved** only after the service acknowledges storage. The receipt stays visible and can be copied. It confirms storage, not developer review. There is no automatic developer email or notification; check this inbox to review reports.

The submit endpoint writes to private `BUG_REPORTS` KV and returns its record ID. The inbox loads newest reports first, with pagination. Cloudflare KV can take time to make a new write visible at every location; refresh if a freshly saved receipt is not listed immediately.

If a request times out or loses its connection, the reporter says delivery is unconfirmed: the service may already have saved it. If you use the alternate form, paste the copied log and press **Submit** there; opening the form alone sends nothing. The app cannot confirm alternate-form submissions.

## Verification and scope

Focused tests cover submission receipts, timeouts, duplicate clicks, private inbox access, safe text rendering, expired sessions, and pagination. Test reports must be clearly labeled synthetic and contain no private learner information.

The reporting release is assembled from the deployed baseline plus reporting-only edits. Other unfinished app changes are excluded. Production evidence and the exact narrow patch are in `artifacts/error-report-delivery-2026-10-21/` on the working computer; those artifacts and the encrypted credential are not part of the release.
