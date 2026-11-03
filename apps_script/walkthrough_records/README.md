# AlloFlow Walkthrough Records — principal setup (one time, about three minutes)

This is a small script that runs on **your own Google account**. AlloFlow sends
it walkthrough feedback you have already written and approved. It saves that
feedback to a folder in your Drive and shares each note with exactly one named
teacher, then emails that teacher a link containing no feedback text.

Your district does not have to build or run anything. It only has to permit
Apps Script and the permissions below, including email identity for owner setup.

## What it can and cannot reach

The script asks for `drive.file`, so the consent screen says it may work with
"only the specific Google Drive files you use with this app." It cannot read
the rest of your Drive. It also asks to send mail as you, so the teacher gets a
notification from your address rather than from a stranger.

It never makes a file link-accessible. Each note is shared with one address, so
a forwarded link opens nothing.

## Deploy steps

1. Type **script.new** into your browser's address bar, signed into the Google
   account that should own these records. A school account is the right choice.
2. Delete the starter code and paste the Walkthrough Records script. The easiest
   source is AlloFlow itself: **Walkthrough Copilot → Set up delivery → "Copy
   script code"**. The script ships inside the app, so that button works offline
   and inside Gemini Canvas. This folder's `Code.gs` is the same file.
3. Rename the project to **AlloFlow Walkthrough Records**. In Project Settings,
   enable **Show appsscript.json manifest file** and replace that file with the
   manifest from **Copy manifest** (or this directory's `appsscript.json`). Save.
   Run **setupWalkthroughOwner** from the editor as the deploying account.
   Copy `wr_admin_token` from **Project Settings > Script properties** into
   AlloFlow's **Owner token** field. Keep it private.
4. Click **Deploy → New deployment**, choose type **Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
6. Authorize when prompted. Google will warn that it "hasn't verified this app,"
   because a script you just wrote is an unpublished OAuth app. That warning is
   expected, and it is not by itself an assurance of safety. Continue only if
   you created this project, you read the code you pasted, and you recognize the
   account and project name. Otherwise cancel.
7. Copy the **Web app URL** (it ends in `/exec`) and paste it into AlloFlow:
   **Walkthrough Copilot → Set up delivery → Connect**. The
   connection uses the **Owner token** copied from Script properties and runs a
   self-test. Public first-caller enrollment is disabled.

**Updating later:** paste new code, then Deploy → **Manage deployments** →
pencil icon → Version: New version → Deploy. The URL does not change.

## Owner setup and public access

The public URL does not establish the caller's Google identity and never issues
a token. Before connecting, copy this directory's `appsscript.json` into the
manifest (Project Settings > Show appsscript.json). Its email identity scope
lets setup verify the account; the other scopes remain `drive.file` and sending
mail. Run **setupWalkthroughOwner** in the Apps Script editor as the account
that will deploy this script. Active and effective identities must match.
Copy `wr_admin_token` from **Project Settings > Script properties** into the
AlloFlow **Owner token** field. The helper returns instructions, not the token.

**Version 2 migration:** existing tokens and Drive files are preserved. Running
owner setup again binds the owner's identity and keeps the existing token.
An older client that only tries to claim will fail closed; update the client
to use token-based reconnect. Source changes do not update existing deployments.

That token authorizes **your** tool to write to **your** Drive. It is not a
stand-in for anyone's identity. The teacher's identity is enforced separately,
by Google, at the sharing boundary: the file is Restricted and shared with one
address, so reading it requires signing in as that person.

This is the difference from the Class Mailbox, whose links intentionally stand
in for anonymous student identity. That model is right for a class session and
wrong for anything about a named staff member.

To revoke an existing device token, the verified owner runs `forgetConnection`
in the script editor. It atomically replaces the token under a lock, with no
publicly claimable interval. Copy the replacement `wr_admin_token` into AlloFlow
and reconnect. Existing Drive files and their sharing are unchanged.

## What it stores

| Data | Where | Lifetime |
| --- | --- | --- |
| Approved walkthrough feedback | "AlloFlow Walkthrough Records" folder in **your** Drive | until you delete it, per your school's records policy |
| The connecting device token | Apps Script Properties in **your** Google account | until you run `forgetConnection` |
| The folder id and your account domain | Apps Script Properties in **your** Google account | same |

Nothing is sent to an AlloFlow server. There is no AlloFlow-operated database.

## Before you use it on a real staff member

This script stores feedback a human wrote and approved. It does not rate anyone
and it is not an evaluation system of record. Using it on real staff is a
district decision, not a settings change. Get answers to three questions first:

1. Which AI provider, if any, may process observation notes, and under what
   data agreement.
2. Whether a walkthrough counts as one of the evidence collections in your
   evaluation system. If it does, this is not formative-only, whatever it is
   called, and the records may carry obligations about notice, review and
   retention.
3. How long these records should be kept, and who is entitled to see them.

For a district-administered system of record with verified identity, evaluator
assignments and a tamper-evident audit trail, see
`apps_script/educator_evaluation/`. That one is deployed and run by the district
rather than by one principal, and it is deliberately not reachable from inside
AlloFlow.
