# For your IT department: the one-page technical brief

When a school pilots AlloFlow, the questions come from IT within a week. This chapter answers them in IT's own terms. It describes the public deployment; if your district self-hosts, verify each answer against your own instance, in the spirit of [Privacy and responsible AI](07-privacy-and-responsible-ai.md): assume nothing until verified.

## What it is, architecturally

The core teacher workspace is a client-side web application that can be served as static assets from a CDN or bundled in the desktop package. That does **not** make every AlloFlow workflow serverless: AI backends, live-session transport, LMS launches, online lookups, optional school-owned Apps Script services, and the optional evaluation portal have their own network, identity, and storage paths. The code is open source (AGPL) and publicly auditable on GitHub, so a security review can inspect the paths enabled in the deployment being approved.

## Accounts and authentication

The standalone public and desktop workspace does not require users to create an AlloFlow vendor account. A surrounding Gemini or Canvas environment, LMS, district gateway, AI provider, optional Google Apps Script service, or evaluation portal may require its own account or identity. Review authentication per route; do not generalize the standalone behavior to every deployment.

## Where data lives

Authoring state is stored in the browser or desktop profile by default (localStorage, IndexedDB, and related device storage). Explicit actions and configured features can transmit or copy content to an AI provider, live-session service, LMS, share route, school-owned service, downloaded file, or synced folder. The practical consequences cut both ways:

- The default local workspace does not create a central AlloFlow roster or project store, but each connected route must be reviewed for its own records, retention, deletion, and access controls.
- A lost or wiped device loses its local work unless the user exported a project file. Treat exported project files as instructional records under your normal file-handling policy.

### Every place work can come to rest

Browser storage is the default, not the only destination. These are the paths an audit should account for, in rough order of how often they are used:

| Destination | Who owns the storage | What lands there |
|---|---|---|
| Browser storage on the device | The device, under your fleet policy | All working state: workspaces, drafts, settings, generated resources |
| AlloFlow project file (`Save Project`) | Wherever the user saves it | A full snapshot: source material, generated resources, settings, notes |
| Exports (PDF, print, accessible document, worksheet, teacher copy) | Wherever the user saves it | Finished copies, and the teacher copy also carries answer keys |
| QR code or student share link | No new storage; a new access path | Whatever the shared route exposes |
| Live session transport | Local peer connections, a configured Firestore path, or a mailbox/service the school deploys | Session coordination, delivery state, and student responses, according to that transport |
| LMS launch | Your LMS | Course, role, and assignment context supplied by the LMS |
| Optional Apps Script services | **Your school's own Google Drive** | Only what that specific service is for (below) |
| On-device model and remediation caches | The device | Cached speech models and remediation working data |

Two consequences worth stating to a leadership team. Browser storage means a wiped device or a cleared profile destroys unexported work, so "save the project file" is an operational instruction, not a nicety. And "local" is not the same as "safe": a shared Windows profile, a synced Downloads folder, or a copied project file moves instructional content exactly as far as any other file would.

The full teacher-facing data-path table is in [Privacy and responsible AI](07-privacy-and-responsible-ai.md); it is written to be reviewed line by line with a privacy officer. The teacher-side mechanics of saving, exporting, storage presets and recovery are in [Saving, loading, and managing storage](24-saving-and-storage.md).

### The Google Drive option: services you deploy in your own tenant

The standalone workspace does not require a vendor-side application server. When a school chooses one of the repository's optional Apps Script integrations for shared or persistent storage, deploy it into a school-managed Google account under the district's approved Workspace terms, not a personal account. Each service is optional, has a different security model, and remains off until it is configured. The packages and their deployment READMEs are in `apps_script/`.

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
| **A local model** (LM Studio, Ollama, LocalAI on the device or a district server) | Prompts go to the endpoint the district configured; content may stay on one device or inside the district network depending on that endpoint and its logging | Contexts approved for that specific local or district-managed service |
| **No backend** | No AI-generation request is made; AI-dependent controls disable or explain the missing connection | Evaluation phase, or a deliberate non-AI deployment |

Teachers are instructed throughout this guide to use de-identified content with any cloud backend. In the no-backend state, many non-AI tools, existing resources, settings, saving, and exports remain available. Verify the exact activity: an AI-dependent option or a feature that needs an external lookup will not become offline merely because generation is disabled.

## Network requirements

- Allow the application host (for the public deployment, `alloflow-cdn.pages.dev`).
- If a cloud AI backend is chosen, allow that provider's endpoint (for Gemini, Google's API hosts).
- If live sessions, an LMS, online lookups, or a school-owned service are enabled, allow only the documented endpoints for those approved features and confirm their retention and authentication settings.
- Exported HTML handouts are designed for offline use with their required lesson content embedded. Optional web fonts, external links or media, and connected interactions can add network dependencies; test the exported file offline before relying on it.

## What to verify yourself, because you should not take a guide's word for it

1. Open the app on a managed device with your standard filtering and confirm it loads and a sample tool runs.
2. Watch the network tab during generation, live delivery, exports, and any connected tool. Compare every destination with the deployment's approved allowlist and investigate unexpected traffic.
3. Review the repository if your process requires code review; the license permits it and the build is reproducible from source.
4. If you deploy the evaluation portal, inspect its `Code.gs` for network-capable services such as `UrlFetchApp` before approval. The source reviewed for this guide on 22 August 2026 contains zero `UrlFetchApp` references; repeat the check against the exact commit you deploy, and separately review Google services the script intentionally uses inside your tenant.

## The two-sentence version for a busy director

AlloFlow's core workspace is a client-side, open-source app whose authoring state stays on the device by default. Accounts, transmission, and storage change when the school enables Gemini or another AI provider, live-session transport, an LMS, online lookups, shared links, or optional school-owned services, so approve and test those routes individually rather than relying on one product-wide privacy sentence.
