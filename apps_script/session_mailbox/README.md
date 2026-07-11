# AlloFlow Class Mailbox — teacher setup (one time, ~2 minutes)

The Class Mailbox is a tiny message-drop that runs on **your own Google
account** (Google Apps Script). It lets students join live sessions and open
image-rich homework QR codes **without any accounts, apps, or district IT** —
AlloFlow maintainer servers are never involved. Live state and hosted homework
remain in the Google account chosen by the teacher.

## Deploy steps

1. Type **script.new** into your browser's address bar (it is a Google
   shortcut URL, like docs.new — it creates a blank Google Apps Script
   project and opens the editor; the long way is script.google.com →
   "New project"). Do this in a browser where you are signed into the
   Google account that should own the mailbox (a school account is ideal;
   see "School accounts" below).
2. Delete the starter code in the editor and paste the mailbox script. The
   easiest source is AlloFlow itself: **Student QR → Live class without
   accounts → "copy script code"** — the script ships inside the app, so the
   button works offline and inside Gemini Canvas (this folder's `Code.gs` is
   the same file). Name the project **AlloFlow Class Mailbox** (click
   "Untitled project" to rename). Save (Ctrl+S).
3. Click **Deploy → New deployment**. Click the gear next to "Select type"
   and choose **Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
5. Authorize when prompted. Google shows a "Google hasn't verified this app"
   screen because this is your own unpublished script. Review the pasted code
   first; then, if it matches the source you intended to deploy, choose
   **Advanced → Go to AlloFlow Class Mailbox (unsafe)** and allow access. The
   script uses Apps Script cache/properties for live sessions and the Drive
   folder it creates for homework packs.
6. Copy the **Web app URL** (ends in `/exec`) and paste it into AlloFlow:
   **Student QR → Live class without accounts → Connect mailbox**. AlloFlow
   runs a self-test and claims the admin token automatically.

**Updating later:** paste new code, then Deploy → **Manage deployments** →
pencil icon → Version: New version → Deploy. The URL stays the same.

> **v7 (required for secure live QR sessions):** separates the QR join secret
> from teacher authority. Each student receives a signed, session-scoped
> participant credential. Older scripts must be updated before new AlloFlow
> builds will show a live-session QR.

## What it stores

| Data | Where | Lifetime |
| --- | --- | --- |
| Live messages and session documents | Apps Script cache in **your** Google account | eligible for early eviction; requested expiry at most 45 min or 6 h |
| Live-session markers and random join secrets | Apps Script Properties in **your** Google account | at most 6 h |
| Homework pack manifests and chunks | AlloFlow Class Mailbox folder in **your** Drive | until you delete them |
| Admin token recovery note | the same private Drive folder | until rotated or deleted |

No student accounts exist. A live QR carries a random **join-only secret**.
The mailbox exchanges it for a signed participant credential bound to one
random student id. Participants can send their own presence and activity
signals, read a privacy-filtered session view, and modify only their own
approved fields. The admin token is required for teacher broadcasts, complete
class state, ending sessions, and pack management; it is never placed in a QR.
Treat a QR like a classroom invitation and the admin token like a password.

## School accounts

Some Workspace districts disable "Anyone" access for Apps Script web apps.
If the **Who has access** dropdown has no "Anyone" option, either ask IT to
allow it for your account, or deploy from a personal Google account —
live cache/properties and homework packs then live in that personal account.
Use this only when school policy permits it; prefer the school account.

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
seconds slower. Participant and class-wide rate limits, bounded replay rings,
and retry guidance protect the teacher's Apps Script execution capacity.

## Capacity notes

Designed for classroom-scale testing: one poll every ~2.5 seconds per
connected device, with slower polling when idle or hidden and WebRTC as the
fast path. Google currently limits simultaneous Apps Script executions per
user, and quotas can change; request rate is not the same as concurrency.
Monitor the Apps Script **Executions** dashboard during pilots. Hosted packs
are capped at ~8 MB and stored as individual download chunks. Live messages
cap at 90 KB; AlloFlow chunks larger resource pushes automatically.

## Two-device smoke test (after deploying or updating the script)

1. Teacher: connect the mailbox, start a live session, scan the QR with a
   phone, pick a codename — the student should appear in the roster within a
   few seconds and gain the ⚡ badge within ~10–30 s on open networks.
2. Push a resource — it should appear on the phone; raise a hand on the
   phone — it should appear next to the codename.
3. With a v7 script: open a Quick Check or Live Poll from the Live Session
   Center — the question should reach the phone and the answer should come
   back to the teacher dashboard.
4. **Mid-session, refresh the teacher tab** — you should land back in your
   running session with the roster repopulating within a few seconds and
   students' ⚡ returning within ~15–30 s (no student action needed).
5. **Lock the student phone for a minute, then wake it** — it should
   reconnect on its own within ~30 s, without any taps.

## Admin lifecycle and incident controls

AlloFlow masks the saved admin token by default. Use **Rotate token** when a
token may have been exposed; rotation invalidates the old token. Active
sessions must be closed first. **Close all sessions** removes every durable
session marker, causing participant requests to fail closed.

Before AlloFlow displays a new live QR, it opens the session, obtains a real
participant credential, and performs a privacy-filtered session read. A stale
script or broken permission deployment therefore fails on the teacher device
instead of producing a QR that students cannot use.

Apps Script cache is intentionally ephemeral: Google may evict entries before
their requested expiry. AlloFlow can re-seed teacher state after eviction and
uses a version precondition so a stale recovery cannot overwrite a document
that was already recreated. Very recent transient student activity can still
need resubmission after a cache eviction.