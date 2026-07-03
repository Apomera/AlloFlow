# AlloHaven as a cozy world — knowledge-economy rooms, not a flat portfolio

Aaron's vision (2026-07-02): AlloHaven shouldn't be a flat hub — more Animal Crossing /
generative-Sims: students have avatars, earn coins through learning (never money), spend them
generating assets (images, gifs, statues, stereograms), collect artifacts that *live* in a 3D
space, and share knowledge with their class community. Goals: **true ownership of learning**
and **academic belonging**. "Knowledge is the economy."

Verdict: coherent and buildable — **if built as rings, not as an MMO**. More than half the
substrate already exists in the tree.

---

## 0. What already exists (the substrate)

| Piece | Where | State |
|---|---|---|
| Artifact store | `allohaven_module.js` `StudentArtifactStore` (localStorage, 80-cap, typed artifacts from SEL/StoryForge/Adventure/PoetTree/Story Stage) | LIVE — this is the inventory |
| XP | `globalPoints` + every game's `onScoreUpdate`/`onGameComplete` (incl. Strand Challenge + Recall Walk) | LIVE — this is the income |
| Cosmetic spend precedent | AlloBot accessories (per-resource mascot cosmetics) | LIVE |
| 3D room tech | `memory_palace_module.js` — rooms, walls, framed artifacts, first-person walk, a11y route | SHIPPED 2026-07-02 |
| Generated-asset pipelines | Furnish (Imagen per-locus), Art Studio (incl. GIF export + Imagen depth maps), visual-supports GIFs, statues (design §3) | LIVE / designed |
| Class-scoped realtime | Live-session protocol (teacher-hosted Firestore sessions, presence gating, arming) | HARDENED |
| Share/submit boundary | Submission Inbox + offline export packets | DEPLOYED |

The palace engine is the single biggest unlock: **a Haven room is a palace whose loci are your
artifacts.**

## 1. The rings (each shippable alone; stop anywhere and it's still good)

**Ring 0 — My Haven Room (single-player, no sync).** A walkable 3D room rendering the
StudentArtifactStore: stories as books on shelves, images/gifs in frames, statues on plinths,
palaces as door-portals, constellations in a window "sky." Device-local like everything else.
The flat hub remains as the *inventory list*; the room is the *home*. This alone delivers the
ownership feeling — your work has **place**.

**Ring 1 — The knowledge economy (coins).** XP stays the score; **coins** are earned alongside
it (recall walks, challenges, quests) and are SPENT on *creation*: Furnish images, gif
artifacts, statues, room decor, avatar/AlloBot cosmetics. No money anywhere, ever.
**Design bonus: coin-gating is also honest quota governance** — Imagen calls cost real API
budget, so "creation costs coins you earn by learning" aligns pedagogy with cost control
instead of fighting it. Ledger = a small device-local store beside globalPoints.

**Ring 2 — Class-scoped sharing (the social layer that matters).** Not feeds, not likes, not
follower counts — cozy games work *because* those are absent. The serious mechanic:
**gifts are lessons.** A student gifts a classmate an artifact + the insight attached to it
(a constellation edge with its justify-your-weight sentence, a palace room they built, a
mnemonic that finally made a concept stick). Peer teaching in miniature — learning-by-teaching
is one of the best-supported effects available to us. Transport = the existing
export-packet/Inbox pattern; visibility = teacher always sees the flow; scope = the class,
never global.

**Ring 3 — Avatars + co-presence (the careful ring).** Cozy blob/mascot avatars (AlloBot
cosmetics reuse — no photos, no real names required), visiting classmates' rooms during
teacher-hosted sessions, canned reactions/emotes only. Presence rides the hardened
live-session doc. This ring ships last and only with the guardrails below.

## 2. Why this is pedagogically serious (and the honest limits)

- **Self-Determination Theory is the right lens**: autonomy (decorate/curate your room),
  competence (earned artifacts visibly accumulate), relatedness (class gifting). The cozy-game
  vibe isn't decoration — it's an SDT delivery mechanism.
- **Ownership**: artifacts are things you MADE (generated assets, palaces, constellations,
  stories) and things you EARNED — the room makes growth visible. That's portfolio pedagogy
  with a heartbeat.
- **Belonging, honestly framed**: belonging interventions have real but *modest* evidence;
  don't oversell. The strongest lever in this design is not the avatar — it's **knowledge
  gifting** (peer teaching) and **teacher-visible community rituals** (class gallery walks).
- **Rituals make it feel alive** cheaply: artifact-placement moment after a perfect recall
  walk, seasonal room themes (light/shader swaps), a weekly "class constellation" that grows
  as students add justified edges.

## 3. Hard constraints (non-negotiable guardrails)

- **FERPA/COPPA**: everything social is class-boundary, teacher-hosted, pseudonymous. No PII
  in avatars, no photos, no under-13 open social. Rooms are device-local; sharing is an
  explicit, teacher-visible packet — the same invariant the FERPA scrub work protects.
- **No free-text student↔student chat.** Moderation burden we cannot carry; canned
  reactions + artifact gifts (which the teacher can review via the Inbox pattern) only.
- **Storage budgets**: base64 images/gifs fatten localStorage fast — per-room caps,
  compression, and the existing 80-artifact cap philosophy extend to assets.
- **A11y parity**: every room is also a list (the palace route pattern); every artifact
  carries an accessible description; stereograms are one *form* among many and never the sole
  carrier (≈5% can't fuse them) — same rule for gifs (reduced-motion: static first frame).

## 4. Artifact forms registry (Aaron: "stereogram is one of many forms")

One registry, many renderers: `image`, `gif` (visual-supports/Art Studio infra; CanvasTexture
frame-playback in 3D; reduced-motion = poster frame), `statue` (depth-relief, design §3),
`stereogram` (novelty form; always paired with its plain image + description), `palace`
(door-portal to a nested walk), `constellation` (window-sky), `story/poem/packet` (existing
StudentArtifactStore types as books/scrolls). Every form: {render3d, render2d, describe}.

## 4.5 CORRECTION (2026-07-02, after reading the module): the substrate is bigger

`allohaven_module.js` (28.6k lines) already contains most of Ring 1: a **token economy**
(earned via pomodoro/reflections/quizzes/walks with daily caps and no-guilt quest design),
**AI-generated decorations** (Imagen via template+slot prompts, `tokensSpent`, art styles),
**four rooms with wall/floor slot placement and unlock criteria**, journals, IEP-style goals,
achievements — and decorations carry a `linkedContent: null // v2+ memory palace pointer`
extension slot that literally anticipated this design. So: Ring 1 is mostly *connective*
work (bridge `globalPoints`/game XP → haven tokens; route new artifact forms through the
existing decoration pipeline), not new construction. **Ring 0 shipped 2026-07-02**: the
🏛 "Walk in 3D" button renders the whole haven (unlocked rooms → palace rooms, placed
decorations wall-then-floor → framed loci with their AI art, portfolio artifacts → a Gallery
room) through the shared memory-palace walk, as a read-only overlay
(`buildHavenPalaceData` pure + tested, incl. image↔locus id alignment).

## 4.6 Inquiry Commons — Aaron's live collaborative-inquiry layer (assessed 2026-07-02)

Aaron's refinement of Ring 2: not transactional gifting — **live exchange of ideas**
(philosophical / scientific / clever-humorous inquiry pertinent to the topic), governed by a
**teacher/class-authored community agreement**, with Gemini flagging possible violations for
teacher review, students explicitly told the space is monitored and on-topic. Groups
participate multimodally: dictation, shared scribes (2–3 typers for a table), etc.

**Assessment: this is Knowledge Building discourse (Scardamalia & Bereiter / CSCL) with an
AI-assisted moderation layer — a real, respected pedagogical lineage** ("build-on" moves,
communal idea improvement, discourse norms = accountable talk). It revises this doc's
"no free-text chat ever" rule into something more precise:

- **Free text is acceptable ONLY inside live, teacher-hosted sessions** (synchronous,
  teacher present, session-scoped) — never DMs, never async unsupervised channels. The
  existing hardened live-session protocol is exactly this boundary.
- **The community agreement is a first-class object**: co-authored by the class (itself a
  belonging ritual — SEL Hub's crew protocols / restorative circle tools are prior art in
  this repo), displayed in the space, versioned by the teacher, and injected (fenced,
  teacher-authored-only, injection-sanitized) into Gemini's moderation rubric.
- **AI flagging assists, never assures**: false positives/negatives are certain; copy must
  say "flags for your review," never "keeps the space safe." **Fail-visible, not fail-open**
  (the SEL-Hub fail-open triage finding is the cautionary tale): if the moderation call
  errors, messages queue as *unreviewed* with a visible badge — silence never means clean.
- **Ephemeral by default** (FERPA data minimization): transcripts live in the session doc,
  teacher may export a packet, nothing persists per-student without explicit action.
- **Structure beats moderation**: CSCL research says scripted roles (proposer / questioner /
  connector / scribe) and sentence-frame "talk moves" (Build on / Ask / Connect / Wonder)
  produce better discourse than open chat AND shrink the moderation surface. Chips-first
  composer with free-text elaboration is the sweet spot.
- **Tie to the constellation**: contributions that get *built upon* brighten the class
  constellation (knowledge-as-light again); quality = peer uptake + teacher endorsement,
  never AI judgment alone.
- **Multimodal participation is UDL-right**: dictation (Web Speech / the Whisper popup),
  scribe roles, chips — multiple means of action & expression.

Sequencing: this is a Ring-2.5/3 feature and should ride the live-session tree, which has
its own deploy gate (?v= bumps pending) and NEVER-bare-stash rules — build it as its own
project with the live-session owner's hat on, not as a haven side quest.

## 5. Sequencing recommendation

Ring 0 first (1–2 sessions; mostly palace-engine reuse + artifact renderers) — it alone
answers "AlloHaven doesn't resonate." Ring 1 next (small; ledger + spend gates on existing
generation buttons). Ring 2 when the Inbox review UX is ready for gifts. Ring 3 only after a
pilot conversation about avatars/presence with the schools. Constellation mode (memory-palace
doc §4.5) and unified Furnish slot naturally into Rings 0–1.

## 6. Open questions for Aaron

1. Coin exchange rate & prices (how many recall-walk points buy one Imagen image?) — and do
   teachers get a class budget dial?
2. Does the room live per-student-per-project, or one room per student across projects
   (needs a cross-project store — new persistence surface)?
3. Gift review: teacher pre-approves gifts before delivery (safest) or post-hoc visibility?
4. Avatar art direction: AlloBot-family mascots (reuse, cohesive) vs. new humanoid-ish
   avatars (more identity, more risk)?
5. Name the coins ("Lumens"? — knowledge-as-light fits the constellation/starfield language
   already everywhere in the 3D work).

---

*Grounded against: allohaven_module.js (StudentArtifactStore), AlloFlowANTI.txt globalPoints,
memory_palace_module.js, live-session protocol docs, submission Inbox, AlloBot accessories.
Companion to docs/memory_palace_3d_design.md (§4.5 constellation). Written 2026-07-02.*
