# Educator evaluation share helper

A **principal** deploys this in their **own district Google account**. It is not the district
portal and it is not a replacement for it.

| | Share helper (this folder) | District portal (`../educator_evaluation`) |
| --- | --- | --- |
| Deployed by | one principal, in their own account | a district-owned Apps Script project |
| Web app access | `MYSELF` — only the deployer can open it | `DOMAIN` — every signed-in district account |
| Knows about | nothing; the deployer is the only user | roster, roles, evaluator assignments, audit chain |
| Stores | files in the deployer's Drive | a district repository |
| Gives you | filing, sharing, and share expiry | live two-way records for everyone |

Use the share helper when you want the evaluation to reach the educator and to expire, without
asking the district to stand anything up. Use the portal when the district wants one system.

## What it does

1. **Files** an evaluation packet into `AlloFlow Evaluations / <academic year> / <educator>` in
   your Drive, creating those folders once and reusing them afterwards.
2. **Shares** that file with one educator, as commenter (default) or viewer.
3. **Expires** that share on a date, if your Workspace edition supports it. This is the one thing
   an emailed attachment can never do.

It also lists everything filed for a year, so at the end of a cycle you can move or copy one
folder to wherever the district keeps evaluation records. Treat the folder as a working store with
a deliberate handoff, not as the system of record.

## Setup

1. Create a new Apps Script project **in your district Google account** (not a personal one).
2. Copy in `Code.gs`, `Index.html`, and `appsscript.json`.
3. Optional but recommended: **Services → add Drive API** (advanced service). Share expiry needs
   it. Without it everything else still works and expiry is reported as not applied.
4. **Deploy → New deployment → Web app**, with **Execute as: Me** and **Who has access: Only
   myself**. Open the `/exec` URL.
5. Run **Check this deployment**. It tells you which account it runs as and whether expiry is
   available to you before you rely on it.

## Using it

Export an **educator packet** from AlloFlow (Reports & audit → *Educator packet*), open the
downloaded `.html` file in a text editor, and paste its contents into the helper along with the
educator's email. The educator receives a Drive share and can read the packet in a browser; the
packet's own response form still works, so they can send you a response file as before.

## Boundaries, stated plainly

- **Expiry is best-effort and is reported honestly.** Google only expires viewer and commenter
  access, only on some Workspace editions, and only within about a year. If Drive refuses, the
  helper says the file is shared and the timer is *not* running rather than implying otherwise.
- **It sends no email.** There is no mail scope. It shares in Drive; Google's own notification is
  the only message anyone receives.
- **It has no roles.** It cannot tell an evaluator from anyone else, because only the deployer can
  open it. Do not treat it as an access-control system.
- **Records custody is yours.** Files live in your Drive under your account. If you leave the
  district that account is normally suspended, so move the folder at the end of each cycle.
- **Check your district policy first.** Deploying Apps Script, sharing personnel records in Drive,
  and any retention requirement are district decisions, not technical ones.
