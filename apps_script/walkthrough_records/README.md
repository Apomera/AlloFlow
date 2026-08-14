# AlloFlow Walkthrough Records — principal setup (one time, about three minutes)

This is a small script that runs on **your own Google account**. AlloFlow sends
it walkthrough feedback you have already written and approved. It saves that
feedback to a folder in your Drive and shares each note with exactly one named
teacher, then emails that teacher a link containing no feedback text.

Your district does not have to build or run anything. It only has to permit
Apps Script and the two permissions below.

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
3. Rename the project to **AlloFlow Walkthrough Records** and save.
4. Click **Deploy → New deployment**, choose type **Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
6. Authorize when prompted. Google will warn that it "hasn't verified this app,"
   because a script you just wrote is an unpublished OAuth app. That warning is
   expected, and it is not by itself an assurance of safety. Continue only if
   you created this project, you read the code you pasted, and you recognize the
   account and project name. Otherwise cancel.
7. Copy the **Web app URL** (it ends in `/exec`) and paste it into AlloFlow:
   **Walkthrough Copilot → Set up delivery → Connect**. AlloFlow claims the
   script and runs a self-test.

**Updating later:** paste new code, then Deploy → **Manage deployments** →
pencil icon → Version: New version → Deploy. The URL does not change.

## Why "Who has access: Anyone" is safe here

That setting is what lets AlloFlow talk to the script at all, and it means the
request itself carries no Google identity. So the script issues a token to the
first device that connects, and refuses every later request that does not
present it. Re-claiming requires the existing token, so someone who discovers
your URL cannot take it over.

That token authorizes **your** tool to write to **your** Drive. It is not a
stand-in for anyone's identity. The teacher's identity is enforced separately,
by Google, at the sharing boundary: the file is Restricted and shared with one
address, so reading it requires signing in as that person.

This is the difference from the Class Mailbox, whose links intentionally stand
in for anonymous student identity. That model is right for a class session and
wrong for anything about a named staff member.

To disconnect a device, open the script editor and run `forgetConnection`, then
reconnect from AlloFlow to issue a new token.

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
