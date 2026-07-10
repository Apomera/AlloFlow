# AlloFlow Class Mailbox — teacher setup (one time, ~2 minutes)

The Class Mailbox is a tiny message-drop that runs on **your own Google
account** (Google Apps Script). It lets students join live sessions and open
image-rich homework QR codes **without any accounts, apps, or district IT** —
AlloFlow's servers are never involved and nothing about your class touches
infrastructure the school doesn't already trust.

## Deploy steps

1. Type **script.new** into your browser's address bar (it is a Google
   shortcut URL, like docs.new — it creates a blank Google Apps Script
   project and opens the editor; the long way is script.google.com →
   "New project"). Do this in a browser where you are signed into the
   Google account that should own the mailbox (a school account is ideal;
   see "School accounts" below).
2. Delete the starter code in the editor and paste the full contents of
   `Code.gs` from this folder. Name the project **AlloFlow Class Mailbox**
   (click "Untitled project" to rename). Save (Ctrl+S).
3. Click **Deploy → New deployment**. Click the gear next to "Select type"
   and choose **Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
5. Authorize when prompted. Google shows a "Google hasn't verified this app"
   screen because the script is your own unpublished code — click
   **Advanced → Go to AlloFlow Class Mailbox (unsafe)** and allow. The code
   you are authorizing is the ~200 reviewable lines you just pasted; it only
   touches a Drive folder it creates itself.
6. Copy the **Web app URL** (ends in `/exec`) and paste it into AlloFlow:
   **Student QR → Live class without accounts → Connect mailbox**. AlloFlow
   runs a self-test and claims the admin token automatically.

**Updating later:** paste new code, then Deploy → **Manage deployments** →
pencil icon → Version: New version → Deploy. The URL stays the same.

## What it stores

| Data | Where | Lifetime |
| --- | --- | --- |
| Live-session messages (join names, hand-raises, pushed resources) | In-memory script cache | auto-deleted ≤ 45 min |
| Live-session codes | In-memory script cache | auto-deleted ≤ 6 h |
| Homework packs (hosted QR assignments, may include images) | `AlloFlow Class Mailbox` folder in **your** Drive | until you delete them |

No student accounts exist; students are identified only by the nickname they
type. Access is guarded by random tokens carried in your QR codes: only you
(admin token) can open sessions or upload packs; only people with a specific
QR can read that session or pack.

## School accounts

Some Workspace districts disable "Anyone" access for Apps Script web apps.
If the **Who has access** dropdown has no "Anyone" option, either ask IT to
allow it for your account, or deploy from a personal Google account —
homework packs then live in that account's Drive, so prefer the school
account when policy allows.

## Your admin token (reconnecting from a new device)

When AlloFlow first connects it claims an **admin token** and shows it to
you once — save it like a password. Connecting from a new device (or a fresh
Canvas paste) just needs that token pasted into the "Admin token" field.

**Lost the token? Check your Drive first:** the script keeps a copy in the
`AlloFlow Class Mailbox` folder as `ADMIN-TOKEN (do not share).txt` (written
at claim and refreshed on every successful reconnect). It cannot be fetched
automatically by the app — any "fetch my token" endpoint would hand it to
students too, which is exactly what the token exists to prevent.

If the Drive file is also gone: open the script → Project Settings (gear) →
**Script properties** → delete the `admin` property → reconnect from
AlloFlow, and it will claim (and show, and re-save) a new one.

## Live sessions are real-time when the network allows

Students first connect through the mailbox (poll every few seconds), then
AlloFlow automatically upgrades each student to a direct device-to-device
WebRTC channel using the mailbox only for the handshake. Upgraded students
get instant pushes and hand-raises; students whose network blocks
peer-to-peer stay on mailbox polling and everything still works, just a few
seconds slower. Flood protection caps each session at ~900 messages/minute.

## Capacity notes

Designed for classroom scale: one poll every ~2.5 s per connected device
(a 30-student class ≈ 12 requests/s, well inside Apps Script's 30 concurrent
executions). Hosted homework packs are capped at ~8 MB each (a full
image-rich lesson compresses well under that). Live messages cap at 90 KB
each; AlloFlow chunks bigger payloads automatically.
