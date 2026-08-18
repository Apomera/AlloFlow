# For your IT department: the one-page technical brief

When a school pilots AlloFlow, the questions come from IT within a week. This chapter answers them in IT's own terms. It describes the public deployment; if your district self-hosts, verify each answer against your own instance, in the spirit of [Privacy and responsible AI](07-privacy-and-responsible-ai.md): assume nothing until verified.

## What it is, architecturally

A static web application served from a CDN. There is no application server holding user data, no database of students, and no login system. The code is open source (AGPL) and publicly auditable on GitHub, so your security review can read exactly what runs.

## Accounts and authentication

None. Staff and students use it without creating accounts. This removes the usual pilot blockers (rostering, SSO integration, account lifecycle) and also means AlloFlow holds no credential or directory data at all.

## Where data lives

Work product stays in the browser's own storage on the device that created it (localStorage and equivalent browser storage). Nothing is synced to an AlloFlow server, because there is not one. The practical consequences cut both ways:

- Nothing to breach centrally, nothing to subpoena from a vendor, nothing to delete on offboarding.
- A lost or wiped device loses its local work unless the user exported a project file. Treat exported project files as instructional records under your normal file-handling policy.

### Every place work can come to rest

Browser storage is the default, not the only destination. These are the paths an audit should account for, in rough order of how often they are used:

| Destination | Who owns the storage | What lands there |
|---|---|---|
| Browser storage on the device | The device, under your fleet policy | All working state: workspaces, drafts, settings, generated resources |
| AlloFlow project file (`Save Project`) | Wherever the user saves it | A full snapshot: source material, generated resources, settings, notes |
| Exports (PDF, print, accessible document, worksheet, teacher copy) | Wherever the user saves it | Finished copies, and the teacher copy also carries answer keys |
| QR code or student share link | No new storage; a new access path | Whatever the shared route exposes |
| Live session transport | Local peer connections, or a mailbox you deploy (below) | Session coordination and student responses |
| LMS launch | Your LMS | Course, role, and assignment context supplied by the LMS |
| Optional Apps Script services | **Your school's own Google Drive** | Only what that specific service is for (below) |
| On-device model and remediation caches | The device | Cached speech models and remediation working data |

Two consequences worth stating to a leadership team. Browser storage means a wiped device or a cleared profile destroys unexported work, so "save the project file" is an operational instruction, not a nicety. And "local" is not the same as "safe": a shared Windows profile, a synced Downloads folder, or a copied project file moves instructional content exactly as far as any other file would.

The full teacher-facing data-path table is in [Privacy and responsible AI](07-privacy-and-responsible-ai.md); it is written to be reviewed line by line with a privacy officer. The teacher-side mechanics of saving, exporting, storage presets and recovery are in [Saving, loading, and managing storage](24-saving-and-storage.md).

### The Google Drive option: services you deploy in your own tenant

AlloFlow has no server. When a school genuinely needs shared or persistent storage, the pattern is always the same: a small Apps Script project deployed **into a school-owned Google account, never a personal one**, so the data sits in your Drive under the Workspace for Education agreement you already hold. Each is optional, and each is off until someone deploys it. The packages and their deployment READMEs are in `apps_script/`.

They do not share one security model, and the differences are the part worth your attention:

| Service | Deployed by | Identity model | Holds |
|---|---|---|---|
| Educator Evaluation repository | District administrator | Google identity, locked to your domain; the server decides each person's role | Personnel records, with a tamper-evident audit chain |
| Walkthrough Records | A principal, in their own account | `drive.file` scope only; each file is Restricted and shared with one named teacher, so Google enforces the reader's identity | Walkthrough feedback a human wrote and approved |
| Class Mailbox | A teacher, in their own account | Capability tokens, no student accounts; possession of the link stands in for identity | Live session and homework-pack traffic |
| Leadership Hub backup | A school leader, in their own account | Capability token that can only touch files the script itself created; files created Restricted | The Leadership Hub's own backup file |

The distinction that matters: **a link-possession model is appropriate for anonymous class traffic and inappropriate for anything about a named staff member.** The Class Mailbox is deliberately built the first way and the other three are not. Walkthrough Records is explicitly not a system of record and never scores anyone; if you need a district system of record with verified identity, assignments and an audit trail, that is the Educator Evaluation repository.

### The educator evaluation portal, in one paragraph

The one service that holds **personnel** records deserves a named pointer rather than a summary here. It is optional; without it the evaluation tool keeps records in the signed-in browser profile on one device like every other tool. When a district does deploy it, an administrator installs it into a **district-owned Google account, never a personal one**, and from there it runs in your tenant, makes **no external network calls**, **fails closed** to accounts on your domain, sets its storage private and verifies that it took effect, and sends notifications that carry no ratings or evidence. The legal frame is personnel law, your collective bargaining agreement and district retention policy, not FERPA. You can verify a deployment yourself with `verifyDeploymentIdentity()`, `getPortalSetupHealth()`, `verifyAuditChain()` and `doGet?api=health`.

For the full treatment, read the [Educator Growth & Evaluation user manual](https://alloflow-cdn.pages.dev/educator-evaluation-manual), which covers setup, roles, the audit chain and the release workflow in detail, and [For school leaders](20-for-school-leaders.md) for how it sits beside the rest of the suite.

## The AI question, which is really three options

AI features only work when a backend is configured, and the district controls which:

| Option | What leaves the device | Fits when |
| --- | --- | --- |
| **Gemini Canvas or a Gemini API key** | Prompts and source content go to Google under the account or key used | The district already permits Google AI services |
| **A local model** (LM Studio, Ollama, LocalAI on the device or a district server) | Nothing leaves the machine or the district network | Confidential contexts, strict no-egress requirements |
| **No backend** | Nothing; AI features hide or disable themselves and everything else keeps working | Evaluation phase, or a deliberate non-AI deployment |

Teachers are instructed throughout this guide to use de-identified content with any cloud backend. The no-backend state is honest by design: the interactive tools, delivery, and documents all work without AI.

## Network requirements

- Allow the application host (for the public deployment, `alloflow-cdn.pages.dev`).
- If a cloud AI backend is chosen, allow that provider's endpoint (for Gemini, Google's API hosts).
- Exported HTML handouts are self-contained and work offline; the optional high-legibility web fonts are off by default and clearly labeled "needs internet" when a teacher opts in.

## What to verify yourself, because you should not take a guide's word for it

1. Open the app on a managed device with your standard filtering and confirm it loads and a sample tool runs.
2. Watch the network tab during generation with your chosen backend and confirm traffic goes only where this chapter says.
3. Review the repository if your process requires code review; the license permits it and the build is reproducible from source.
4. If you deploy the evaluation portal, grep its `Code.gs` for `UrlFetchApp` before you approve it. There are zero occurrences, which is the claim that nothing leaves your tenant, and it takes one search to confirm rather than trust.

## The two-sentence version for a busy director

AlloFlow is a static, open source web app with no accounts and no vendor-side data storage; work stays on the device by default, and AI runs only through the backend the district chooses, including a fully local option. Where a school does want shared storage, it deploys a small optional service into its own Google Drive, so that data stays in your tenant too. The realistic review effort is the same as approving a website plus, if you choose one, an AI provider you have likely already reviewed.
