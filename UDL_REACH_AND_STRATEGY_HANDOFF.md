# AlloFlow — Reach Strategy & Strategic Shadow-Work Handoff

_Authored 2026-07-24. Working session between Aaron and Claude. Status: strategy and one prototype only, no production code shipped._

This document has two parts that should be read as separate registers:

- **Part I — Reach Strategy.** A grounded technical roadmap for how AlloFlow ("the ultimate UDL engine") can reach into the materials teachers actually use, in the spirit of competitors like Brisk, but without adopting a Chrome extension. Verified against the real codebase.
- **Part II — Strategic Shadow-Work.** A deliberately Machiavellian / _Art of War_ reading of AlloFlow's position. This is a stress-test lens Aaron asked for explicitly. It is **not** the project's stated values, which remain humanistic, peaceful, and social-justice oriented. It is here to surface arguments that framework would make, and to notice the temptations before they arrive unannounced.

---

# PART I — REACH STRATEGY

## The question on the table

Brisk is a competitor. Should AlloFlow chase it? The premise we started from: a Chrome extension probably does not fit AlloFlow. Could we instead get Brisk-like reach by reusing existing infrastructure (Video Studio screen capture, the Gemini Canvas surface, the veraPDF client-side stack, the mailbox transport)?

## The core constraint: there are two different walls

Most of the confusion in "can we escape the iframe" dissolves once you separate two walls:

1. **The sandbox-capability wall** — "this frame can't run a JVM / persist to disk / do heavy compute." AlloFlow already escapes this: veraPDF via CheerpJ (a WASM JVM running _inside our own frame_), and the storage bridge (postMessage to our own CDN origin). These are impressive but they never leave our own property.

2. **The same-origin wall** — "web content cannot read another origin's document (a Google Doc in another tab)." This is a hard browser security boundary. It is exactly what Brisk needs to cross, and it is exactly why Brisk is an extension: extensions get host permissions that ordinary web content (including an AlloFlow Canvas iframe) is categorically denied.

**Key correction to keep in mind:** the veraPDF / storage-bridge escapes are the _wrong wall_ for Brisk parity. They do not generalize to reading arbitrary Google Docs. And agentic computer control is **not** downstream of escaping the iframe either — it requires a privileged process _outside_ the sandbox entirely.

## The no-extension reach ladder (in ship order)

### Rung 1 — Capture "Lens" command center (ship first)
Reuse Video Studio's `getDisplayMedia` capture. Grab a frame, send to `ctx.callGeminiVision`, run an AlloFlow transform, put the tailored output on the clipboard with one click. The teacher pastes it wherever they need it.

- Why it works: the **human is the bridge across the same-origin wall on both sides** — pixels in (a screenshot of any site), paste out (a human keystroke code isn't allowed to make). Nothing in the chain is blocked by same-origin or needs elevated permissions.
- Reach: **any** site, including districts that lock down extensions (where Brisk can't even install). This is a genuine wedge, not a consolation prize.
- Friction to design around: `getDisplayMedia` shows a picker and can't capture silently. Mitigation: pick once, keep the `MediaStream` alive for the session, grab many frames off it. One picker per session, not per action.
- Honest limit: pixels are lossy (tables, math, multi-column, long scroll). Paste is manual — you can copy for them but can't target a field or auto-submit. That targeting is the extension superpower we choose to live without.

### Rung 2 — Google Docs in-place write-back (no extension, no add-on)
Google gives web apps a sanctioned door through the same-origin wall: **user-consented OAuth + Google Picker + the Docs/Drive API.**

- Flow: teacher clicks Connect, picks a doc via Picker, AlloFlow reads it with the Docs API, runs the transform, writes back via `documents.batchUpdate` (inserted text) and/or the Drive comments API (inline comments).
- **Compliance win:** scope to `drive.file`, not full Drive. `drive.file` only touches files the teacher explicitly picks, is **not a restricted scope, and does not trigger the CASA security assessment.** It is about the most FERPA-defensible OAuth posture available.
- Trade: the teacher picks the file each time (you cannot auto-detect the open doc — that is the one thing only an extension can do), plus a one-time consent screen.
- Canvas caveat: the OAuth flow needs a stable registered origin and popups, which the Gemini Canvas sandbox constrains. This lives in the **standalone AlloFlow web app** (or a companion window popped from Canvas), not in the Canvas artifact.
- **Prototype exists:** `C:\tmp\allolens-docs-prototype.html`. Self-contained; needs Aaron's OAuth Client ID + API key and to be served from a registered origin (e.g. `python -m http.server 8080`). It cannot be a Claude Artifact — the Artifact CSP blocks Google's SDKs, which is itself confirmation this flow needs a real origin. The transforms are local stubs; the single `runAlloFlowTransform()` function is the seam where real leveling / a11y / differentiation infra plugs in.

### Rung 3 — Other platforms via their own sanctioned doors (breadth without an extension)
The same-origin wall applies to every third-party origin. The only no-extension doors are the ones each vendor builds:

- **Google** → Picker + Drive/Docs API (Rung 2).
- **LMSs (Canvas, Schoology, Moodle, Brightspace)** → **LTI.** The edtech integration standard, reaches where teachers assign work, schools already trust it, no extension. Arguably higher-value reach than Docs.
- **Microsoft** → Graph API (but the in-Word surface is an Office Add-in).
- **Any random webpage / YouTube / non-LTI site** → **nothing.** No sanctioned door exists. This long tail is permanently extension-only. It is Brisk's real moat, and it is the least important surface for a special-ed audience that lives in Docs + the LMS.

Conclusion: assemble broad coverage from a **set of sanctioned connectors**, unified by AlloFlow's transforms. Do not chase the arbitrary-webpage tail.

### Rung 4 — Supervised computer-use agent (research spike, not a pilot feature)
The full-automation end of the ladder. Because computer control needs a privileged process outside the browser, host it in **AlloFlow Desktop / School Box** (already an Electron app, already outside the sandbox), not the Canvas iframe.

- Two tiers of blast radius: **browser-scoped** (Playwright/CDP driving a browser we launch — reaches arbitrary DOM because the driver has full privileges; contained) vs **OS-scoped** (controls the whole machine, any app; much larger security surface).
- Open-source tooling to evaluate (verify current status and license before committing): **browser-use** (Playwright + LLM, model-agnostic, has a step/pause mode — best fit), **Skyvern**, **Open Operator**, **LaVague** for browser; **UI-TARS / UI-TARS-desktop** (self-hostable GUI-grounding model — the local path), **Self-Operating Computer**, **OpenAdapt** (record-then-review, fits "supervised"), **Open Interpreter** for OS-level; **nut.js** as the Electron input substrate.
- **Gemini** now ships a first-party Computer Use capability (Gemini 2.5 Computer Use / Project Mariner) — the turnkey path today.
- Supervision is a dial: **Suggest** (agent reads, human actuates — this is Rung 1) → **One-click apply** (agent proposes each action, human approves) → **Autonomous with a hard human gate**, scoped to a dedicated browser profile.
- **Do not let this jump the queue.** The near-term gate is King Middle pilot reliability (Garry conditional on PDF reliability). This is the ambitious edge of the roadmap; Rung 1 is what ships first.

## What the existing infrastructure actually gives us (verified in code)

### Mailbox (`apps_script/session_mailbox/Code.gs`, VERSION 9)
A **teacher-deployed Apps Script Web App** (`Execute as: Me / Access: Anyone`) that runs on the teacher's own Google account.

- **Auth = capability tokens, not OAuth:** an admin token (teacher), a join secret carried in the student QR, and an HMAC-signed participant token bound to a random `uid`. No student logins. No per-user OAuth.
- **Storage:** live messages/docs in bounded `CacheService` (45 min – 6 h TTL); homework packs and student submissions as chunked JSON files in one `"AlloFlow Class Mailbox"` Drive folder. No endpoint lists or downloads submissions.
- **Therefore:** mailbox is a _third_ auth model, distinct from both Firebase and from the `drive.file` OAuth of Rung 2. It is **not redundant** with the Docs write-back path, and it does **not** shortcut that path's OAuth. It writes only to its own folder, never to arbitrary teacher Docs.

### SessionTransport (`session_transport_module.js`) — the delivery seam
A unified, dependency-injected abstraction over the two content channels. `createFirebaseTransport` and `createMailboxTransport` both expose the same interface: `capabilities()`, `publishResources(history)`, `publishPolicy()`. One shared `studentSafeResources` filter (an item needs an `id` and a `type` and must not be teacher-only). `selectTransportKind({mailboxActive})` chooses the backend. `followResource` (the "class follows me here" pointer) rides the shared session doc on **both** transports.

**Implication for the command center:** it should not grow its own delivery layer. It becomes a **producer of resources** (each capture-and-transform output gets an `id` and a `type`) and calls `publishResources()`. Delivery then happens over Firebase **or** mailbox-over-QR for free, and you can point the class at the output identically on either backend.

## The one decision that actually matters: the FERPA fork

Mailbox's stated value, in its own header, is "nothing runs on AlloFlow's servers and no student accounts are involved." That is a strong FERPA posture the rest of AlloFlow is built around.

A **cloud-vision** capture command center (frames to `callGeminiVision`) introduces exactly the egress path mailbox was designed to avoid. So:

- **Cloud vision** — best capability now, breaks the "nothing leaves the teacher's account" property.
- **Local LM** (the UI-TARS / local-model-chunking thread) — preserves it end to end, on-device.

This is not a quality decision dressed up as a privacy one. It is a posture decision. If capture-over-arbitrary-sites becomes a real product line, the local-model path is what keeps it consistent with what AlloFlow already promises. Aaron's call.

## Open items / next concrete steps
- [ ] Point `runAlloFlowTransform()` in the Docs prototype at a real leveling/differentiation call.
- [ ] Build the capture panel that emits resources into `SessionTransport`.
- [ ] Decide the cloud-vs-local capture fork (posture, not features).
- [ ] Evaluate LTI as the higher-reach sibling to the Docs connector.
- [ ] Treat computer-use as a spike behind the pilot-reliability gate.

---

# PART II — STRATEGIC SHADOW-WORK

> **Framing.** What follows is a deliberately cold, calculating, _Art of War_ / Machiavelli reading of AlloFlow. It is a red-team of our own position, requested as an exercise. It is **not** the mission and not Aaron's belief. The point of shadow-work is to see clearly what this framework would argue — including where it tempts us — so that our actual, humane choices are made with eyes open rather than by default. Two ground rules the exercise keeps: the "power" in question is power **for** educators and students, never over them; and the "enemy" is never a student or a teacher.

## Who the enemy actually is under this lens

Sun Tzu: _know the enemy._ Reframed coldly, AlloFlow's adversary is not Brisk. Brisk is a rival for the same ground. The real adversaries are the **structures that disempower the edge**: vendor lock-in, surveillance-ware that monetizes student attention and data, deskilling automation that hollows out the teacher's judgment, platform dependency that lets a single company change the rules overnight, and austerity that starves schools of tools. AlloFlow "wins" when teachers and students take power back from those structures. That reframing is what keeps the exercise aligned rather than predatory.

## The principles, mapped

**1. Win without fighting (Sun Tzu). Do not fight on the enemy's terrain.**
Feature-parity war against a VC-funded competitor on the extension battlefield is a losing attrition fight. Supreme excellence is to take ground the incumbent _cannot follow you onto without abandoning their own model_. AlloFlow's privacy architecture (teacher-owned mailbox, no student accounts, on-device options) is ground a data-monetizing competitor structurally cannot occupy, because occupying it would gut their revenue. Attack where they cannot defend.

**2. Terrain and the fortress (Machiavelli, _The Prince_ Ch. X, XX).**
The strongest fortress is not to be hated. For AlloFlow the fortress is being _genuinely_ trustworthy: FERPA-real, extraction-free, transparent. A besieger cannot take a privacy fortress without becoming visibly the thing schools fear. Note the twist Machiavelli would enjoy: here the virtuous wall is also the militarily strongest wall.

**3. Your own arms, not mercenaries (Machiavelli Ch. XII–XIII).**
A prince who rests on mercenary troops is never secure. AlloFlow's mercenaries are the platforms it rents power from (Chrome's extension policy, a single cloud backend, one AI vendor). Brisk _is_ a mercenary army — it exists at the pleasure of Chrome's store policy, which can change overnight. AlloFlow's swappable SessionTransport backends, the desktop app, the offline School Box, and the local-model track are "your own arms": sovereignty bought by refusing single points of dependence. Every reduction in platform dependence is a gain in strategic autonomy.

**4. The people as the prince's base (Machiavelli Ch. IX, the civil principality).**
He who has the people has a foundation nobody can easily shake. AlloFlow's base is teachers and students at the edge. "Wresting power" concretely means handing edge actors capability that reduces their dependence on the center: the capability-token, no-accounts, QR-join model literally lets a teacher run a full class **without district provisioning, IT tickets, or admin permission.** That is decentralization of power as both moat and mission. The colder the calculation, the more it points at empowering the edge — because the edge, once empowered by you, defends you.

**5. Formlessness and speed (Sun Tzu).**
"Be subtle to the point of formlessness." AlloFlow runs as a Gemini Canvas artifact, a desktop app, a web app, an offline bundle, a QR code. There is no single chokepoint to block, ban, deplatform, or regulate to death. A hostile district can block a domain or ban an extension; it is far harder to block a tool with many bodies. Distribution polymorphism is survivability.

**6. Economy of force / asymmetry (Sun Tzu).**
A small contributor team cannot out-feature a funded rival head-on. So do not. Concentrate overwhelming force where the enemy is weak or absent: the special-education / UDL / accessibility niche is unglamorous to generalist VCs and therefore under-defended, yet it is where AlloFlow can be _dominant_ and where the moral stakes are highest. Depth in a niche the giants won't stoop to is a winning asymmetry.

**7. Seize the flood (Machiavelli Ch. XXV, virtù over fortuna).**
Fortune is a flood; the prince who built dikes in calm weather governs it. The AI moment is that flood. Whoever defines "AI in the classroom" first sets the terrain. The extractive incumbents will define it as surveillance-plus-automation unless someone defines it first as _AI that serves the teacher and protects the student_. Building that definition now, before the flood crests, is virtù seizing fortuna.

**8. Perception is a weapon (Machiavelli Ch. XVIII).**
Adoption in schools is won as much on _being seen as safe and aligned_ as on features. The cold read and the sincere read converge here: the most credible privacy perception is actual privacy. AlloFlow's genuine values are simultaneously its most defensible marketing. Integrity is, among other things, the cheapest and most durable propaganda.

**9. The gift that binds (a colder read of open-source and offline bundles).**
Contract lock-in breeds resentment and churn. Gift-based obligation (open source, offline School Box, real license compliance, tools that make teachers _more_ capable) breeds loyalty. A network that depends on you because you empower it is more durable than one that depends on you because it is trapped. Generosity, calculated ruthlessly, out-retains coercion.

## The convergence thesis (the payoff of the exercise)

Run the cold calculus honestly and it keeps arriving at the moves the humane mission already recommends: protect privacy, decentralize power to the edge, refuse platform-mercenary dependence, be many-bodied, go deep where the giants won't, and define the AI-in-classroom terrain around service rather than surveillance. **For AlloFlow, virtue is not a tax on strategy; it _is_ the strategy.** The reason is structural: AlloFlow's power derives entirely from being trusted by, and aligned with, a disempowered edge. Any move that betrays that alignment also destroys the source of the power. The Machiavellian and the humanistic paths are, unusually, the same path.

## The shadow of the shadow (what this lens tempts us toward — name it to resist it)

Shadow-work is only useful if it also shows where the cold logic corrupts. The same capabilities in this handoff carry their own dark inversions:

- **Capture and computer-use are one design decision away from surveillance.** A tool that can watch a screen "to help the teacher" can watch a screen. The supervision dial, the local-model option, and hard human gates are not just features; they are the guardrails against becoming the enemy we named.
- **"Power to teachers" can quietly become "power over students."** Roster analytics, engagement scores, and progress dashboards can empower or can discipline. Watch which one the defaults serve.
- **Data that empowers can be extracted.** The moment retention or "insights" tempts AlloFlow to pool student data centrally, the privacy fortress is abandoned from the inside — the one siege that always succeeds.
- **The will to win can rationalize dark patterns.** Every argument above can be turned, with a small twist, toward manipulating adoption rather than earning it. The convergence thesis holds only while the power stays _with_ the edge. The instant it flows to the center, the same playbook becomes the incumbent's.

The value of having looked into this shadow is precisely this list. These are the moves that would feel strategically clever and would cost AlloFlow its soul and, not coincidentally, its actual source of power. Seeing them here, in cold ink, is how we decline them on purpose later.

---

_End of handoff. Part I is actionable now; Part II is a lens, filed on purpose, to be reread when a decision feels "strategically obvious."_
