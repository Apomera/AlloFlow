# AlloFlow Desktop, School Box, and Local-First Classroom Infrastructure Vision

Prepared for Fable and future AlloFlow collaborators on July 4, 2026.

Status refresh, July 9, 2026: this document remains the strategic vision, but
several "next" items from July 4 are now shipped. AlloFlow Desktop is the
everyday no-Docker path; Desktop LAN / Local Network is the same-room classroom
path; the Docker School Box stack is optional server/appliance infrastructure.
The built-in local engine, local ASR, Kokoro fixes, LAN adapter, QR/join
link/PIN controls, and LAN Share smoke coverage have all advanced since the
original handoff. A fresh installer is still needed whenever those source and
app-build changes need to reach the installed desktop app.

## Executive Summary

AlloFlow Desktop changes the strategic shape of the project. It moves AlloFlow from "a powerful app that can run inside Gemini Canvas" toward "school-controllable educational infrastructure." That matters because the core promise of AlloFlow is not just more AI tools. The promise is accessible, adaptive, teacher-shaped learning technology that can respect student privacy, work in constrained environments, and avoid locking classrooms into vendor-controlled SaaS systems.

The desktop path should be treated as a major new pillar:

- Canvas remains useful for fast sharing, experimentation, and web access.
- Desktop gives educators a no-command, installed command center.
- School Box becomes the local or district-owned control plane.
- LAN sessions allow same-room classroom participation without requiring student data to flow through Aaron's Firebase or a third-party SaaS account.
- A future district/server mode can support remote instruction while keeping ownership with the school, district, co-op, or trusted community host.

The strategic north star is local-first, school-owned, accessible educational technology.

## Why Desktop Matters

Desktop expands AlloFlow in ways the Canvas delivery path cannot fully provide.

1. It lowers the technical barrier.
   Teachers should not need a terminal, repo checkout, or developer workflow. An installer and app icon make AlloFlow feel like something educators can simply open.

2. It protects API keys and local configuration.
   API keys can live in the OS keychain instead of plain local JSON. The app can guide the user through Gemini, Ollama, LM Studio, LocalAI, or other provider choices without exposing secrets to a web-hosted deployment.

3. It makes local models realistic.
   Desktop can coordinate local model providers, local TTS such as Kokoro, and eventually a bundled model runner. This lets AlloFlow serve classrooms where cloud AI is blocked, unaffordable, or inappropriate.

4. It creates a privacy boundary.
   A teacher-owned local app can host classroom state on the teacher machine or a school machine. This reduces dependence on Aaron-owned Firebase/Firestore and helps avoid becoming the custodian of student records.

5. It creates a path for offline or low-bandwidth classrooms.
   Local static app hosting, local models, local TTS, and LAN sessions can keep core workflows available even when the internet is unreliable.

6. It makes School Box concrete.
   School Box can become a guided setup surface inside Desktop instead of a separate product. Desktop can be the command center for classroom mode, district/server mode, model configuration, diagnostics, and privacy posture.

## Current State As Of July 4, 2026, With July 9 Refresh

Working foundation:

- Electron Desktop shell and command center exist.
- The app can serve a bundled-static AlloFlow build locally.
- Windows installer work exists, including shortcut and Allobot icon improvements.
- The app now has stronger diagnostic visibility, including copyable diagnostic output.
- API key storage has been moved toward OS keychain behavior.
- Local AI provider setup exists for cloud and local providers, including Gemini, Ollama, LM Studio/OpenAI-compatible endpoints, and LocalAI-style flows.
- The AlloFlow Built-in Engine now exists as an opt-in managed local llama.cpp path, with LM Studio and Ollama kept as compatibility presets.
- Kokoro local TTS and local ASR have moved from foundation work into the desktop local stack, though installed apps still need fresh builds to receive the newest fixes.
- AI backend settings can be surfaced from the starting pathway screen.
- School Box has a guided setup foundation and is now framed as optional Docker server/appliance infrastructure.
- A local-first live-session mode exists, with Desktop guarding against accidental Firestore usage.
- A local LAN session bridge exists for teacher-hosted sessions.
- A separate public LAN Share listener exists so students can join from other devices on the same network without exposing private Desktop APIs.
- The in-app LAN adapter is applied in the canonical app source, so session documents and session assets can ride the LAN bridge.
- The public LAN Share listener is intended to expose only student-safe session/join endpoints and now has smoke coverage for private-endpoint isolation.
- QR codes, copyable join links, optional PIN/passphrase protection, presenter view, and clearer network diagnostics have been added to the Desktop LAN flow.

Known caveats:

- The installer needs to be rebuilt after the latest desktop/app-build changes.
- The project is not code-signed yet. Windows SmartScreen friction should be expected until signing is solved or reputation accumulates.
- The July 4 desktop web-build timeout caveat is superseded. The desktop build and smoke paths have since passed, but packaging should still run a fresh `web:build` from the `desktop/` folder before producing installers.
- Public LAN Share needs real classroom network testing. School Wi-Fi client isolation may block peer-to-peer LAN access.
- LAN sessions now have QR/join link/PIN/presenter/diagnostic controls; the remaining question is real school-network behavior.
- There is no production-ready remote district/server mode yet.
- FERPA-aligned deployment support is a product and institutional process, not a single code switch.

## Architecture Direction

The clean mental model is three concentric layers.

### 1. Private Teacher Runtime

The teacher's Desktop app runs a private local runtime on localhost. It can access:

- App management.
- AI provider settings.
- API keys through the OS keychain.
- Diagnostics.
- School Box setup.
- Local model and TTS coordination.
- Private session creation and teacher controls.

This layer must remain private to the teacher machine.

### 2. Student-Safe LAN Share

The LAN Share listener is a separate public-facing local network surface. It should be off by default and explicitly started by the teacher.

It should expose only:

- Join page.
- Session status/read endpoints.
- Student-safe update/event endpoints.
- Health/status needed for joining.

It should not expose:

- API keys.
- Provider configuration.
- Diagnostics.
- App management.
- School Box administrative controls.
- Arbitrary file access.
- Any endpoint that can create/delete private resources without teacher intent.

This separation is the key privacy/security design decision.

### 3. School-Owned Remote/District Server

For remote instruction, LAN is not enough. The future answer should not be "use Aaron's Firebase." The preferred remote path is a school-owned or district-owned relay/server.

Possible remote patterns:

- District School Box server: hosted by district IT, a school co-op, or a trusted nonprofit partner.
- School-approved VPN or secure tunnel: Desktop still hosts, but students connect through a school-controlled network path.
- Bring-your-own school cloud: Firebase, Supabase, or another backend inside the school's own tenant.
- Minimal relay service: later possibility, but only if it is designed for data minimization and institutional control.

## Live Sessions And FERPA-Oriented Connectivity

LAN sessions are physically local in ordinary school networks. They usually require students to be on the same network as the teacher device. However, LAN is best understood as "same trusted network," not just "same room." A school VPN, managed network segment, or secure tunnel could extend that trusted network to remote learners.

For long-distance instruction, AlloFlow should support FERPA-aligned patterns without making Aaron the vendor of record by default:

1. School-owned server mode.
   The school or district runs the session relay and stores any needed data under its own policies.

2. Local-first with ephemeral relay.
   Session state is temporary, expires quickly, and avoids storing student records unless a teacher deliberately exports them.

3. BYO cloud tenant.
   AlloFlow supplies configuration guidance, but the school owns Firebase/Supabase/cloud credentials, retention settings, and access controls.

4. Minimal data design.
   Prefer display names or classroom nicknames, session codes, short-lived responses, and local exports over durable personally identifiable records.

Important language: AlloFlow can be designed to support FERPA-aligned deployments, but FERPA compliance depends on school policy, contracts, access controls, retention, consent, and actual use.

## Product Positioning

AlloFlow Desktop can be positioned as:

- Classroom AI without cloud dependency.
- School-controlled adaptive learning infrastructure.
- A grassroots alternative to extractive SaaS.
- Accessible in every definition: disability access, language access, economic access, technical access, and institutional access.
- A local-first command center for teachers who want powerful tools without surrendering student data.

This is not only nostalgia for LAN sessions. It is a new form of agency using older network assumptions. The "LAN party" resonance can be playful, but the serious point is sovereignty: the classroom can own its own learning environment.

## Who Will Care

Teachers:

- They get a no-command app, faster startup, local tools, and less dependence on unstable web contexts.

Special education, UDL, assistive technology, and intervention staff:

- They get adaptive supports, TTS, simplified generation, local privacy, and more control over student needs.

School IT:

- They get a clearer deployment model, installable app, local/district control options, and fewer unknown third-party data flows.

District privacy and compliance staff:

- They get a path that does not require Aaron to hold student data by default.

Grant reviewers and funders:

- They can understand this as public-interest infrastructure rather than another subscription product.

Open-source collaborators:

- They get a meaningful technical and moral project: AI for education that can be inspected, extended, localized, and owned by communities.

## What Fable Should Do Next

1. Preserve the dirty workspace.
   Run a status check first. Do not revert uncommitted changes unless Aaron explicitly asks.

2. Keep builds fresh before installer work.
   Run `cd desktop` and then `npm run web:build` before packaging. Verify the compiled Desktop app contains the LAN adapter and `?allo_lan_join=CODE` behavior.

3. Re-run desktop smoke coverage.
   Confirm runtime startup, bundled app serving, local AI settings, Kokoro availability, diagnostics copy, School Box panel rendering, LAN session creation, and public LAN Share isolation.

4. Package the next installer.
   Start with Windows ARM64 for Aaron's machine. Then consider Windows x64 and macOS builds.

5. Test LAN classroom usability on real school networks.
   QR code, join link copy, optional PIN/passphrase, presenter view, and firewall diagnostics now exist. The next risk is school Wi-Fi client isolation and managed-device behavior.

6. Continue School Box wizard design.
   First mode: local classroom. Second mode: school-owned district/server. Third mode: BYO cloud tenant. Keep the default privacy-preserving.

7. Write the remote/district architecture doc.
   Define what can be stored, what expires, what is never stored, how keys are managed, how logs are redacted, and what a school must configure.

8. Create open-source contributor scaffolding.
   Add or improve `CONTRIBUTING.md`, `ROADMAP.md`, `GOVERNANCE.md`, issue labels, good-first-issue lists, privacy/security docs, and setup docs for non-coders.

## Open Source Attractor Strategy

AlloFlow can attract collaborators by making the values legible and the entry points real.

Near-term assets:

- A short manifesto: local-first, accessible, educator-led AI for learning.
- A roadmap with tracks: Desktop, School Box, live sessions, accessibility, STEM/SEL tools, model providers, translations, documentation.
- Good first issues that are genuinely bounded.
- Contributor docs for educators, designers, researchers, translators, accessibility testers, and developers.
- Architecture diagrams for the desktop runtime and live-session privacy model.
- Demo videos that show practical classroom workflows rather than only feature lists.
- A public privacy posture that says what AlloFlow does not collect by default.
- A "build with us" page that invites school IT, accessibility experts, open-source AI builders, and educators.

Collaboration culture:

- Treat educators as co-designers, not just users.
- Treat accessibility as a design source, not a checklist at the end.
- Prefer school ownership over platform dependency.
- Invite small, reviewable contributions.
- Make it easy to run and test locally.
- Name privacy/security issues clearly and fix them in public when possible.

Potential community hooks:

- "LAN classroom" as a playful revival of shared local computing.
- "Bring your own model, bring your own keys, own your classroom data."
- "AI tools that can survive bad Wi-Fi."
- "Open educational infrastructure for the post-SaaS classroom."

## Risks To Track

- Public LAN exposure: keep the student-facing listener narrow and audited.
- School network friction: client isolation, firewalls, managed devices, and captive portals may complicate LAN joins.
- Signing and installer trust: unsigned builds will create user friction.
- Model licensing: bundled local models require careful license review.
- FERPA claims: avoid overpromising compliance.
- Support load: desktop multiplies OS and installer complexity.
- Drift between source/public/app-build copies: prefer repeatable builds and verification.
- Scope creep: local, LAN, district server, and cloud modes need clear labels so users understand what data goes where.

## The Core Design Rule

When in doubt, choose the path where the teacher or school owns the data boundary.

That does not mean rejecting cloud tools. It means cloud use should be explicit, school-owned when possible, and never the hidden default for student data.
