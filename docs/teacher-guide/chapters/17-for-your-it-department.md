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

The full data-path table, including live sessions, exports, QR codes, and LMS launches, is in [Privacy and responsible AI](07-privacy-and-responsible-ai.md); it is written to be reviewed line by line with a privacy officer.

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

## The two-sentence version for a busy director

AlloFlow is a static, open source web app with no accounts and no vendor-side data storage; work stays on the device, and AI runs only through the backend the district chooses, including a fully local option. The realistic review effort is the same as approving a website plus, if you choose one, an AI provider you have likely already reviewed.
