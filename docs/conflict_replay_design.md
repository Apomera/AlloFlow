# Conflict Replay — Design Document (v1, 2026-07-16)

**One-liner:** Students (or a counselor) record the first ~3 minutes of a conflict — roleplayed
first, real only under a gated consent flow — and get back a tagged timeline of observable
moments (startup tone, escalation, bids offered/received/missed) with developmentally-leveled
repair suggestions and a "re-shoot the scene" loop. A lens and a conversation scaffold —
**never a measurement, never a prediction.**

Extends the existing SEL Hub Conflict Resolution Unit (`conflict`, `conflicttheater`,
`restorativeCircle`, `perspective`) and reuses BehaviorLens's proven video primitive
(`callGeminiVision`, inline video ≤ 20 MB — which comfortably fits ~3 minutes at classroom
resolution and deliberately scopes analysis to the opening of a conflict).

---

## 1. Research foundation — a layered stack (Gottman demoted to one layer)

The interpretive spine is **child-validated** work; Gottman-derived categories serve only as
the *camera vocabulary* (what is observable on video), because that is the defensible part of
his contribution for this population.

| Layer | Framework | What it contributes | Evidence posture |
|---|---|---|---|
| Timeline/arc | **Colvin & Sugai acting-out cycle** (trigger → agitation → acceleration → peak → de-escalation → recovery) | The shape of the timeline UI; school-native (PBIS lineage) | School-validated, widely adopted |
| Moment tags | **Gottman-derived observables**: harsh/soft startup, Four Horsemen (criticism, contempt, defensiveness, stonewalling), bids for connection, repair attempts offered/received/missed, flooding | The codeable vocabulary an AI can tag from video/audio | Strong observational lineage (SPAFF) on ADULT COUPLES — used here as descriptive vocabulary ONLY (see invariants) |
| Interpretation | **Social Information Processing** (Crick & Dodge): cue encoding → interpretation → goals → response generation/selection; **hostile attribution bias** | The kid-facing meaning-making questions ("What did you see? What did you think it meant? What else could it have meant?") | Extensively replicated on children in peer conflict — the strongest layer |
| Developmental leveling | **Selman's Interpersonal Negotiation Strategies** (impulsive → unilateral → reciprocal → collaborative) | Repair suggestions matched to the student's demonstrated level, nudging one rung up | Developmental research on children/adolescents |
| Repair playbook | **Johnson & Johnson, Teaching Students to Be Peacemakers** (wants → feelings → reasons → perspective reversal → invent options → agree) + **restorative questions** (already in `restorativeCircle`) | The re-shoot script and the debrief structure | Decades of school studies (skills learned, retained, used); restorative practices show modest positive RCT evidence (RAND; Chicago) |
| Ethos + adult debrief | **Tronick rupture-and-repair** (mutual regulation) + **emotion coaching** (Gottman's child-validated meta-emotion line; RCT-tested descendants e.g. Tuning in to Kids) | Shame-free framing ("conflict is normal; repair is the muscle") and the counselor/teacher stance | Infancy/child research; emotion-coaching RCTs |

**Honest caveats to carry in-product:** restorative-practice effects are modest and do not by
themselves close discipline disparities (frame as skill-building, not a discipline cure);
Gottman's *prediction* claims (the "94% divorce accuracy") were post-hoc model fits and are
excluded here entirely; the Gottman-Murray "mathematics of relationships" and the 5:1 ratio
are NOT validated for children and never appear in this tool.

---

## 2. Integrity invariants (testable, Lumen-floor style — a `check_conflict_replay_floor` gate
pins each of these before any deploy)

1. **No prediction.** The tool never predicts the future of any relationship, friendship, or
   person. Banned output classes: probabilities, "risk", "doomed", "headed for", trajectory
   language. (Gate: output-schema whitelist + prompt pin + string scan.)
2. **No scores, no ratios.** No numeric score, grade, percentage, or positivity ratio is ever
   shown for a conflict or a child. Counts of *tagged moments* are allowed (e.g. "2 repair
   attempts — 1 received"); a 5:1-style target is banned. (Gate: render scan.)
3. **Lens, not measurement.** Every analysis surface carries the permanent caption:
   *"These are conversation starters an AI noticed — not an assessment of any student."*
   (Same pattern as BehaviorLens's screening-heuristic caption and Lumen's AI-estimate note.)
4. **Tags are behaviors, never traits.** Tag text names the MOMENT ("a criticism-shaped
   opener at 0:12"), never the PERSON ("Maya is critical"). Person-level adjectives from the
   horsemen vocabulary are banned in output. (Gate: prompt pin + lint.)
5. **Adult-couples math never ships.** No Gottman-Murray equations, no 5:1, no SPAFF weights.
   The word "Gottman" appears only in the methods/attribution note as "informed by
   observational research on conflict interactions (Gottman & colleagues), interpreted through
   child-development frameworks (Crick & Dodge; Selman)" — never branded as the Gottman Method
   (trademarked clinical program).
6. **Ephemeral footage.** Video/audio is analyzed and **discarded**: never written to project
   files, localStorage/IDB, the session doc, or any cloud store. Only de-identified moment
   tags + timeline (no names unless a counselor types them; default = Speaker A/B) may be
   saved, and only by explicit adult action. (Gate: no persistence sinks in the video path.)
7. **Adult-in-the-loop.** Students never receive AI conflict analysis without a teacher/
   counselor mediating surface. Student-facing mode is the roleplay re-shoot loop, where the
   student sees tags on their OWN acted scene.
8. **Developmental honesty.** Repair suggestions are Selman-leveled and phrased as invitations
   ("You could try…"), never prescriptions; the level itself is internal — students are never
   labeled with a developmental stage.
9. **Crisis boundary.** Physical aggression, threats, self-harm signals → the tool STOPS
   analysis and routes to the existing SEL safety layer (`sel_safety_layer.js`) / adult
   escalation. Conflict Replay is for garden-variety peer conflict only.
10. **Consent gate precedes camera** (see §3) — the record button is unreachable until the
    consent state for the current mode is satisfied.

---

## 3. Consent & FERPA flow

**Phase 1 — Contrived (roleplay) only. Ships first.**
- Scenes are ACTED from theater cards (`conflicttheater` extension). No real conflict footage.
- Consent = the standard classroom media norm: participants are the actors, the recording
  stays on-device, auto-deleted after the session (and on tab close), never leaves the device.
- This phase is the pedagogy core: act a harsh startup → watch the tagged replay → re-shoot
  with a soft startup and a received repair bid. The re-do IS the learning.

**Phase 2 — Real footage, counselor-mediated. Gated, later, opt-in.**
- Teacher/counselor mode only; requires a per-recording confirmation checklist rendered
  in-product: (a) school/district recording policy permits it, (b) guardians of every visible
  student have consented per policy, (c) footage will be deleted after this session (enforced
  — see invariant 6), (d) purpose is coaching, not discipline (stated on the consent screen;
  see §7 "What this is NOT").
- Multi-student footage is the heaviest artifact this platform touches: processing is
  in-memory only, tags default to Speaker A/B, and the SAVE action stores tags only —
  the counselor may rename speakers in their own notes, not in the tool's persisted output.
- Two-party-consent audio states + district policy vary: the checklist defers to local policy
  rather than asserting legality. (Not legal advice; posture doc language reused.)

**Storage table (extends docs/DATA_PRIVACY_POSTURE.md):** footage = never stored; transcript =
never stored; moment tags = device-local only, de-identified by default, explicit adult save;
nothing session-synced; nothing cloud.

---

## 4. UX — "Conflict Replay" inside conflicttheater

1. **Set the scene** — pick/generate a conflict card (existing theater flow), roles assigned.
2. **Record** — ≤ 3 minutes (hard cap; mirrors the harsh-startup scope and the 20 MB inline
   limit). Camera optional: audio-only mode works (tags degrade gracefully to voice cues).
3. **Tagged replay** — the acting-out-cycle arc rendered as a timeline; tap a tag to jump the
   video there. Tags (kid-facing wording):
   - 🚪 *Opener* — "soft start" / "harsh start (criticism-shaped / contempt-shaped)"
   - 📈 *Heating up* — escalation moments (voice, interruption, body cues)
   - 🤝 *Bid* — "tried to connect / lighten / fix it" → *received / missed / turned away*
   - 🔧 *Repair attempt* — offered; landed or didn't
   - 🌊 *Flooded?* — "someone might have needed a break here"
4. **SIP pause points** — at 1-2 chosen moments the replay pauses and asks the SIP questions
   ("What did you see? What did you think it meant? What else could it have meant?").
5. **Re-shoot loop** — the tool proposes ONE Selman-leveled change ("this time, start with
   what you need instead of what they did") and the students re-act the scene; the two
   timelines render side-by-side (the before/after is the payoff artifact).
6. **Debrief** — restorative questions + a Peacemakers-structured agreement scaffold; the
   emotion-coaching cue card for the adult ("name it before you tame it… validate before
   problem-solving").

Teacher/counselor surface adds: tag editing (the ADULT can correct/remove any AI tag — the AI
proposes, the human disposes, same as pictionary guess-marking), and the Phase-2 gate.

---

## 5. Technical architecture

- **Video path:** reuse BehaviorLens's `callGeminiVision` inline-base64 flow (≤ 20 MB) — no
  new upload infrastructure; the recording is captured via MediaRecorder into memory,
  analyzed, and released (invariant 6).
- **Prompt design:** system prompt pins the taxonomy (§4 tags with behavioral definitions),
  the invariants (no prediction/scores/trait language, Speaker A/B), and a strict JSON output
  schema `{ arc: [...], tags: [{t, type, speaker, evidence, kidLine, repairSuggestion,
  selmanLevel}], pausePoints: [...], debriefSeeds: [...] }` — parsed with resilientJsonParse,
  validated fail-closed (an invalid response renders "analysis unavailable", never partial
  invented content).
- **Selman leveling:** the model estimates the negotiation level ONLY to choose the register
  of `repairSuggestion`; the level never renders (invariant 8).
- **Module shape:** new `sel_hub/sel_tool_conflictreplay.js` (or an upgrade wave inside
  `conflicttheater` — decide at build; separate tool keeps the theater tool simple),
  registered in the SEL Hub Conflict Resolution Unit; `check_sel_render` covers it
  automatically; new `dev-tools/check_conflict_replay_floor.cjs` pins §2.
- **Safety:** every transcriptable utterance passes the existing SafetyContentChecker; crisis
  routing per invariant 9.

---

## 6. What this tool is NOT (rendered in the teacher-facing methods note)

- Not a discipline instrument — tags are inadmissible-by-design for consequences (stated on
  the consent screen and the methods note).
- Not a screener or diagnostic — no child-level flags, rosters, or cross-session profiles.
- Not therapy, and not the Gottman Method — a classroom skill-building lens informed by
  published research, mediated by the adults who know the students.
- Not for crises — see invariant 9.

---

## 7. Build plan (phased, each phase independently shippable)

- **P0 — Floor + doc (this document):** `check_conflict_replay_floor.cjs` scaffold with the
  §2 string/schema pins written FIRST (they gate every later phase).
- **P1 — Roleplay MVP:** conflicttheater + MediaRecorder + tagged replay + re-shoot loop
  (audio-only acceptable for v1); adult tag-editing; SIP pause points; debrief scaffold.
- **P2 — Side-by-side before/after timelines + Selman-leveled suggestion registers.**
- **P3 — Counselor-mediated real-footage mode** behind the §3 Phase-2 consent gate.
- **P4 (maybe-never, Aaron's call):** exportable de-identified debrief summary (tags only)
  through the existing FERPA-gated export path.

**Open questions for Aaron:** (a) separate tool vs. conflicttheater wave? (b) audio-only v1
to soften the camera-consent surface further? (c) should Phase 2 exist at all in the pilot
year, or is roleplay-only the right 2026-27 scope? (d) K-2 register: the tag vocabulary above
reads ~3rd-grade+; younger needs a picture-based variant.
