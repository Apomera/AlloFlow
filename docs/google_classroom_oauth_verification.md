# Google OAuth verification for the Classroom roster helper

Status on 2026-09-25: the shipped helper (`classroom-import.html`) is **disabled** on every public origin because `classroom_import_config.js` carries no client ID. It was exercised end to end on 2026-09-25 from a Google Workspace Business trial tenant using an OAuth client whose consent audience was *Internal*, which needs no Google review. Turning the helper on for schools we do not administer requires a client that Google has verified for the two Classroom scopes. This page is the packet for that submission and the exact product switch that follows it.

Nothing here changes how the helper behaves. The scopes, requests and data handling are pinned in [google_classroom_import.md](google_classroom_import.md).

## Why verification is required

Google classifies `classroom.courses.readonly` and `classroom.rosters.readonly` as **sensitive** scopes. An *External* app that requests them runs in one of two states:

| Publishing status | Who can connect | Limits |
| --- | --- | --- |
| Testing | Up to 100 Google accounts listed as test users on the consent screen | Access tokens expire after 7 days; the consent screen carries an "unverified app" warning |
| In production, verified | Any Google account whose Workspace admin allows the app | None from Google's side; districts still apply their own third-party app access policy |

An *Internal* app (audience limited to one Workspace organization) never needs verification, but it only works inside that one tenant. That is the right choice for a district that self-hosts the helper under its own client ID, and it is what the 2026-09-25 test used. It is not a route to a single public deployment.

Sensitive scopes need the standard OAuth app review only. They do **not** trigger the annual CASA security assessment that *restricted* scopes (Gmail, Drive file contents) require. Google quotes 3 to 5 business days for a straightforward sensitive-scope review; expect longer if the reviewer asks questions.

## Decisions to make before submitting

1. **Which Cloud project and who owns it.** The client ID becomes part of the product's public configuration and the consent screen shows the project's brand. It should live in a Cloud project owned by the organization that stands behind the product (Aaron's), with at least two owners, not in a personal or trial account. The 2026-09-25 test client (`237375383775-…`) lives in a 14-day trial tenant and should not be promoted.
2. **Which domain the helper is served from.** Google requires every *authorized domain* to be verified in Search Console by the same Google account that owns the Cloud project, and the homepage, privacy policy and terms links must sit on those domains. Today the app is served from `alloflow-cdn.pages.dev` (Cloudflare) and mirrored at `apomera.github.io/AlloFlow` and Firebase Hosting. Subdomains of `pages.dev` and `github.io` can be verified per-site through Search Console, but reviewers treat shared-platform subdomains with more suspicion, and the canonical link in `index.html` still points at the GitHub Pages mirror. A first-party domain (for example `alloflow.app` or `alloflow.org`) that the organization owns is the cleanest answer and is worth settling before the submission, because changing it later means re-verification.
3. **A public privacy policy page.** Google will not review an app without a privacy policy URL on an authorized domain. The repository has connector-level privacy notes (`desktop/mcp/PRIVACY.md`, the portable-remediation `PRIVACY.md`) but no public privacy page for the web app. That page is a legal statement by the organization and should be written by Tyler and Aaron, not generated. The Classroom-specific paragraph it must contain is drafted below.

## Consent screen fields

Fill these on the OAuth consent screen (Google Auth Platform → Branding / Audience / Data access):

| Field | Value |
| --- | --- |
| App name | AlloFlow Classroom roster import |
| User support email | A monitored organizational mailbox |
| App logo | The AlloFlow mark (120×120 px). Adding a logo triggers a separate brand verification; it can be skipped for the first submission |
| App home page | The public AlloFlow site on the authorized domain |
| Privacy policy link | The public privacy page (see below) |
| Terms of service link | Optional but recommended; same domain |
| Authorized domains | The domain(s) serving the helper, verified in Search Console |
| Developer contact | Two organizational addresses |
| Audience | External |
| Scopes | `https://www.googleapis.com/auth/classroom.courses.readonly`, `https://www.googleapis.com/auth/classroom.rosters.readonly` — nothing else |

## Scope justifications

Google asks for a justification per sensitive scope. These match the pinned API contract exactly; do not describe features the helper does not have.

**classroom.courses.readonly** — "The teacher chooses one of the classes they teach. The app calls `courses.list` with `teacherId=me` and `courseStates=ACTIVE`, requesting only `id`, `name`, `section` and `courseState`, so the teacher can pick the class whose roster they want to bring into AlloFlow. It also calls `courses.teachers.list` for the chosen class to confirm the signed-in teacher is a member before reading any student. No course is created, modified or archived."

**classroom.rosters.readonly** — "For the one class the teacher selected, the app calls `courses.students.list`, requesting only `userId` and the profile name fields, so the teacher can review each student's name beside a randomly generated AlloFlow codename. The names and Google IDs stay in the browser tab's memory and are discarded when the tab is cleared or closed. The only output is a roster of codenames with new random identifiers; it contains no names, emails, Google user IDs or course IDs. No grades, assignments, guardians or Drive content are requested."

## Demo video

The reviewer watches a short unlisted video of the real consent flow and of every scope in use. Record it against the production origin with the production client ID and a fictional test class:

1. Start on the AlloFlow roster panel; click **Google Classroom setup** so the helper opens in a new tab. Show the URL bar with the authorized domain.
2. Click **Connect Google Classroom**. Show the Google account chooser and the consent screen listing exactly the two scopes. Approve.
3. Show the class list populate (courses scope), choose the class, click **Read selected roster** (rosters scope).
4. Show the private preview: names beside codenames. Say on screen that the names never leave this tab.
5. Tick the new-class acknowledgement and click **Send to the AlloFlow tab**. Switch tabs, confirm the replacement, and show the roster panel containing codenames only.
6. Click **Revoke Google access** and show the confirmation, then show the app gone from the account's third-party access page.

Keep it under three minutes, no narration needed beyond captions. Upload as unlisted on a channel the organization controls and paste the link in the submission.

## Draft privacy policy paragraph

For Tyler and Aaron to adapt into the public privacy page; it must be present before submission:

> **Google Classroom roster import.** When a teacher chooses to connect Google Classroom, AlloFlow's roster helper asks Google for read-only access to the classes that teacher teaches and to the student roster of the one class the teacher selects. The helper uses this access solely to show the teacher their students' names beside newly generated AlloFlow codenames, in the teacher's browser, so the teacher can bring the class into AlloFlow without student names. Student names and Google identifiers are held only in the browser tab's memory and are discarded when the tab is cleared or closed. They are not stored on AlloFlow servers, not written to the roster that AlloFlow keeps, and not shared with any third party or AI model. AlloFlow's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. A teacher can revoke this access at any time from the helper or from their Google Account's third-party access page.

The Limited Use sentence is a Google requirement and must appear verbatim in substance.

## The product switch, once the client is verified

Two changes, both public, neither secret:

1. `classroom_import_config.js` (root; `_build_classroom_import.js` copies it to `desktop/web-app/public/`):

   ```js
   window.ALLOFLOW_CLASSROOM_IMPORT_CONFIG = Object.freeze({
     enabled: true,
     reviewedDeployment: true,
     clientId: '<verified production client ID>.apps.googleusercontent.com',
     allowedOrigins: ['https://<authorized domain>'],   // exact origins only; add each mirror that should work
     allowedAccountIds: []
   });
   ```

2. On the OAuth client in Cloud Console, *Authorized JavaScript origins* must list every origin in `allowedOrigins`, exactly. No redirect URIs are needed; the helper uses the Google Identity Services token model.

Then deploy (`deploy.sh`). The helper enables itself only when both the config and its own origin agree, so a mirror that is not listed on either side stays disabled with the "Not configured" message rather than half-working.

Districts that run their own Workspace tenant can skip all of the above: they create an *Internal* client in their own Cloud project, host the helper on an origin they control, and put their client ID in their copy of the config. The 2026-09-25 test is the template for that path.

## Checklist

- [ ] Production Cloud project chosen, two owners, billing not required for OAuth
- [ ] Authorized domain decided and verified in Search Console by the project owner
- [ ] Public privacy page live on that domain with the Classroom paragraph and the Limited Use sentence
- [ ] Consent screen filled as above, audience External, exactly two scopes
- [ ] Web client created with the production origins as authorized JavaScript origins
- [ ] Demo video recorded against the production origin and uploaded unlisted
- [ ] Submission sent; reviewer replies handled by the project owner
- [ ] After approval: config updated, origins double-checked, deployed, and the helper connected once from a non-tenant Google account to confirm no "unverified app" warning
