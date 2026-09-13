# SEL positioning, SEL AlloPacks, catalog discoverability, units, and a student-AI filter

Prepared September 13, 2026 for Aaron, after Christian Perry (PBIS, King Middle School) agreed to monthly teacher PD on AlloFlow. Aaron's clarification the same day: Christian wants teachers to deliver SEL lessons to students, and Aaron wants to author HOWL- and EL-aligned SEL lessons for the catalog. That makes section 3 the central deliverable; sections 4 to 6 exist to make those lessons findable and runnable. Read alongside the September 13 entry in `pilot/10_reflective_journal.md`.

Everything below was checked against the repo on this date unless marked as an external source. Where a claim rests on a web page, the URL is in the Sources section.

---

## 1. The situation this analysis is for

| Fact | Source | Why it matters |
| --- | --- | --- |
| King is an EL Education school: Crew of 10-12 students meets daily for homeroom and 40 minutes Mon/Tue/Thu for academic coaching and SEL; HOWLs (respect, responsibility, perseverance); a PBIS matrix across classroom, cafetorium, hallway, bathroom, fieldwork, culminating event, online. 550 students, 22 countries, 29 languages. | King Teaching & Learning page; Wikipedia | The SEL slot that exists is Crew. Any SEL material we ship has to fit a 40-minute Crew block and HOWL vocabulary. |
| PPS district SEL: Second Step at elementary; Facing History and Ourselves being piloted at middle and high school; CASEL framework; Second Step framed as operating inside PBIS. CharacterStrong is not named on the district page. | PPS SEL page | CharacterStrong is the comparison Aaron asked for, but it is not the district's adopted middle school program as far as the public page shows. Confirm with Christian whether King uses CharacterStrong for Crew. If not, the live comparison is Facing History plus Crew, and the positioning is the same either way: supplement, not program. |
| PPS PBIS is mature: district strategic goal "Whole Student, Connected Community," building teams, Tiered Fidelity Inventory 3.0, seven schools in Maine DOE Advanced Tiers cohorts, Culture and Climate Coordinators at Rowe and Lincoln. | Maine DOE Newsroom, Jan 13 2026 | Christian's frame is tiers, fidelity, and data. He will ask where a tool sits in the tiers and what evidence it produces. |
| Christian Perry: PPS lists him as an educator at King; district newsletter April 3 2026 has him in the 80s cover band My Blue Monday with Bobby Shaddox and Annemarie Orth, playing a King drama fundraiser. No public page names him as PBIS coordinator. | PPS newsletter; ZoomInfo | Thin public record. Do not put his title in outreach copy without confirming it with him. |
| PPS has not given students Gemini access. Teachers have it through Workspace. Students will use the Cloudflare browser shell. | Aaron | Student-facing runtime = `alloflow-cdn.pages.dev/app/` with student AI off. |
| The browser shell defect from Sept 6 is half fixed as of a live check on Sept 13. `app/ai_backend_module.js` now serves as real JavaScript (200, application/javascript, 155 KB), so the AI provider loads. Two scripts the shell still references come back as the HTML fallback page: `/alloflow_desktop_bridge.js` (harmless in a browser) and `/vendor/drag-drop-touch-2.0.3.esm.min.js` (touch drag-and-drop on phones and tablets is still likely dead; concept sorts are drag-based). | Live curl of `alloflow-cdn.pages.dev`, Sept 13; `project_role_modes_review_2026-09-06` memory | Publish `vendor/` to Pages or point the shell at a CDN copy before the first session, then test a concept sort on a phone. |
| Student AI already has a policy gate: homework QR shares default to "Student AI stays off"; `student-byok` is the only way a student gets AI and it must be authorized by the packet, not the URL. Socratic tutor is behind `allowSocraticTutor` and `studentAiFeaturesHidden`. | `AlloFlowANTI.txt` ~1197-1990, ~27550, ~53824 | The runtime already supports the AI-free student path. What is missing is catalog metadata that tells a teacher which lessons are complete without it. |

## 2. What AlloFlow offers for SEL relative to CharacterStrong

### CharacterStrong, as of the 2026-27 updates (external)

- Middle school: 35 lessons per grade for 6-8, about 30 minutes each, delivered in a common weekly time. Five principles: Emotion Understanding and Regulation, Empathy and Compassion, Values and Purpose, Goals and Habits, Leadership and Teamwork. Each lesson ends in a CharacterDare.
- 2026-27: a check for understanding in every lesson, progress tracking, redesigned slides, a Future Ready unit (11 lessons), three Digital Citizenship lessons per grade including AI and media literacy, Safe and Supported prevention lessons, Tier 2 sessions cut to 15-25 minutes with one-page facilitator guides, Tier 3 products, and Intellispark, an MTSS data engine with pulse assessments and early-warning flags. Tier 1 and Tier 2 content in 50+ languages.
- Evidence: cluster-randomized trial, 14 secondary schools, one urban Pacific Northwest district, 2019-20, delivery went virtual mid-year. Significant effects only in the Academic Engagement cluster of the P-SELS: learning strategies +0.19, self-management +0.11, grit +0.10. Evidence for ESSA rating: Promising. Listed cost: $3,999 curriculum, $1,999 training and coaching. Acquired by FullBloom in February 2025.

### The SEL Hub, as of today (repo)

- 72 tool files in `sel_hub/` (the June journal said 34; the count has doubled). Organized by an expanded CASEL 5 (`sel_hub_module.js` ~681). Seven pre-built journeys: Morning Check-In, Calm Down Corner, Conflict Resolution Unit, Empathy and Perspective Week, Decision-Making Deep Dive, Self-Discovery Journey, Friendship and Social Skills (~1307-1313).
- A standards layer (`sel_standards_alignment.js`) that maps each tool to a CASEL competency and subcompetency, EL Education HOWL, DBT/CBT, MTSS tier, and IDEA/IEP use, with an optional Crew prompt. Two tools are King-shaped by name: `crewProtocols` and `howlTracker`.
- 72 learning guides (`sel_learning_guides.json`) in a purpose / model / practice / reflect / transfer / boundary shape, which is close to explicit-instruction structure.
- A safety layer (`assessSafety`) wrapped around every AI call. 30 of 72 tools call Gemini; the buttons render only when a provider exists, so the tools work without AI, with a few "AI advisor not available" toasts.
- `FOR_EDUCATORS.md` (reviewed Sept 8): formative practice space, not a validated assessment, not a screener, not a counseling substitute, no teacher dashboard, no surveillance. Sneakernet save/load. A classroom verification plan exists but claims no classroom observation.
- Known debt: about 2 MB of never-rendered generated narrative in four tools (anxietytoolkit, bigfeelings, stressbucket, griefloss), flagged Aug 25, decision still Aaron's.

### The honest comparison

| Dimension | CharacterStrong | AlloFlow SEL Hub |
| --- | --- | --- |
| What it is | Tier 1 scope and sequence plus Tier 2/3 products plus MTSS data | A toolbox of practice surfaces plus seven loosely sequenced journeys |
| "What do I do Tuesday?" | Lesson 14 | No answer today |
| Evidence | One RCT, Promising, small effects | None; the guide says so |
| Data for the PBIS team | Intellispark pulse assessments, early warning | None by design (no dashboard) |
| Cost | ~$6k first year plus renewals | $0, AGPL |
| Privacy | Vendor platform, student accounts | Local-first, no accounts, export is a file |
| Languages | 50+ (slides) | Language packs for UI; leveled text, Immersive Reader, AAC, TTS for the content itself |
| Depth of clinical grounding | Character education plus SEL skills | DBT (DEAR MAN, TIPP), CBT thought records, MI, SFBT, polyvagal, window of tolerance, restorative circles, PATH and MAPS planning |
| Fit to King vocabulary | Generic | Crew and HOWL already in the alignment metadata |
| Differentiation | Translation | Reading level, symbols, AAC, karaoke TTS, UDL choice of response |

Reading of the table: these are different kinds of thing. CharacterStrong answers the Tier 1 question (what does every student get every week) and the PBIS team's data question. The Hub answers the Tier 2 and differentiation questions (what does this student practice, in a form they can access, with an adult) and it does so at zero cost with a privacy story a district can approve without procurement. Positioning that tries to displace CharacterStrong or Facing History will lose on evidence and on the Tuesday problem. Positioning as "Crew and Tier 2 practice that fits inside whatever program you run" wins on every row it is actually in.

Two things to say to Christian in the first meeting, in this order: the Hub is not an assessment and produces no tier data, on purpose; and the Hub's alignment data already speaks Crew and HOWL, so it can be dropped into the existing Crew block without renaming anything.

## 3. Should we make more SEL AlloPacks?

Short answer: yes. Given the clarified ask (teachers delivering SEL lessons, HOWL and EL aligned, in the catalog) this is the deliverable, not an option. Build a Crew-paced set, not a loose handful, and give it a new pack shape rather than more of the same.

### What to align to (King's own words and EL's own cadence)

King's grading guide defines the three HOWLs with an "I" statement and observable behaviors, graded 1-4 per course each trimester alongside, and separate from, academic standards:

| HOWL | Statement | Behaviors |
| --- | --- | --- |
| Respect | "I am a respectful member of the King community." | Work cooperatively with others; steward community resources and materials |
| Responsibility | "I take responsibility for my success as a learner." | Arrive prepared; participate fully and mindfully; complete assignments thoughtfully and on time |
| Perseverance | "I persevere to produce high quality work." | Advocate for learning through questions; self-assess using targets and rubrics; learn from feedback and revise |

EL Education's secondary Crew curriculum is paced as a 6-week Crew Launch (norms, getting to know one another, the year's work), then Fall, Winter, and Spring modules of 8 weeks each with three strands and one lesson per strand per week, then a 2-week Wrap-Up. King's Crew meets 40 minutes on Mon, Tue, Thu, which is three slots a week, the same count as EL's three strands. Design the packs to that grid: one pack equals one 40-minute Crew slot, three packs equal one Crew week, and a collection equals a strand.

Because HOWLs are graded per course, the strongest lesson hook is not "be respectful" in the abstract. It is the student translating a HOWL behavior into a move they can make in Tuesday's science class: ask one question, self-assess against a posted learning target, revise after feedback. That is where AlloFlow's existing tools already sit (self-advocacy, DEAR MAN, goals, growth mindset, thought record, restorative circle) and where CharacterStrong's generic lessons do not.

### Scope and shape

Facts: there are 50 text AlloPacks and 43 illustrated editions in `allopacks/`; the live catalog (`catalog/index.json`) holds the 43 illustrated entries. Subjects: Science 21, Math 12, ELA 9, Social Studies 1, SEL 0. The catalog's subject dropdown already offers "SEL / Character" (`catalog_module.js` ~89). The shelf exists and is empty. The AlloPack spec (`docs/ALLOPACK_FORMAT_SPEC.md`) has 15 resource types and no way to reference an SEL Hub tool; the STEM Lab has quest objectives that tether a pack to a lab, the SEL Hub does not.

Recommendation, in priority order:

1. **A Crew Launch strand first: 6 packs, two per HOWL, one per 40-minute Crew slot.** That covers the six-week EL Launch module at one AlloFlow lesson per week, leaving the other two weekly slots for the Crew leader's own routines. Grade 6-8, each pack aligned to one HOWL behavior and one CASEL competency, with the HOWL "I" statement quoted verbatim as the pack's essential question. Fall, Winter, and Spring strands (8 packs each) follow only if the Launch strand is actually run. Shape per pack: a short leveled text (`simplified`), a `glossary` of the 5-8 terms, a `concept-sort` or `sentence-frames` practice, a `faq` written for the Crew leader, `directions` that name which Hub tool to open and for how long, and a `memory-aid`. No quiz scored for correctness; SEL is not graded, and the educator guide says the Hub is not an assessment. Candidate Launch strand, mapped to a HOWL behavior and to Hub tools that already exist:

   | Week | HOWL behavior | Lesson | Hub tools |
   | --- | --- | --- | --- |
   | 1 | Respect: work cooperatively | Crew norms we can name and keep | crewProtocols, teamwork |
   | 2 | Respect: steward resources | Repair when something goes wrong | restorativeCircle, perspective |
   | 3 | Responsibility: participate fully and mindfully | Where am I right now, and what do I need to be in the room | zones, sensoryRegulation, windowOfTolerance |
   | 4 | Responsibility: arrive prepared, complete on time | One system for the week | execFunction, goals, transitions |
   | 5 | Perseverance: advocate through questions | Asking for what you need (DEAR MAN for school) | dearman, selfadvocacy, advocacy |
   | 6 | Perseverance: self-assess and revise from feedback | Feedback is information, not a verdict | growthmindset, thoughtRecord, howlTracker |

   Every lesson ends with a one-line commitment the student carries into a specific class that week and reports back on in the next Crew. That is the EL and CharacterStrong move (CharacterDare) done in King's vocabulary, and it is the only piece of the lesson that touches HOWL grading, which stays with the course teacher.
2. **Add one small resource type or convention so a pack can open a Hub tool.** Cheapest version: a `directions` step whose `link` is the in-app SEL Hub route (the history panel already carries `setShowSelHub` and `setSelHubTab`). Better version: a `sel-tool` resource `{ toolId, minutes, prompt }` validated against the tool registry, mirrored in the catalog validators the same way `memory-aid` was added on Aug 28. Without this, an SEL pack is just a reading with a glossary and the 72 tools stay invisible from the lesson.
3. **Label them as practice, not program, in the pack metadata and the catalog card.** Tag `sel`, `crew`, `tier-1-supplement` or `tier-2-practice`, and carry the CASEL competency in the pack's `standards` block the way CCSS and NGSS codes are carried now. Do not use the word "curriculum."
4. **Do not author 35 per grade.** That is CharacterStrong's product and it took an RCT to earn a Promising rating. Eight packs that a Crew leader can run this fall are worth more than a shelf that looks like a curriculum and cannot back the claim.
5. **Ship the six packs as one catalog collection named Crew Launch** so the PD session can say "load this" once. See section 5.
6. **Reuse the PD system for Christian's sessions.** The community catalog already has a PD module library, an editor, an hours log, and a walkthrough bridge (`catalog_module.js` ~64-360, `project_pd_system_overhaul` memory). A "Running AlloFlow SEL in Crew" PD module authored there, with a `resource` activity snapshotting one of the new packs, makes the monthly PD and the product the same object. `pilot/14_training_session_guide.md` and `pilot/15_week_by_week_implementation.md` already exist and can seed the first two sessions.

## 4. Discoverability of the lesson catalogs

Where the catalog is today: Full Platform, Teacher, close the wizard, Educator Tools, then the card with `data-hub-id="community-catalog"`. That is four decisions deep, and the card sits in the same hub as Behavior Lens and the Assessment Center, which frames it as a specialist tool rather than "lessons ready to use." Students never see it. The filter is a subject dropdown, a free-text grade field matched by substring (so "3" also matches "3-4" and "13"), and a title-or-tags search. Cards show subject and grade only.

Recommended moves, cheapest first:

1. **Put "Ready-made lessons" on the teacher launch pad and in the empty-source state.** The empty main panel currently says "generate diverse entry points for your curriculum." A teacher with no source text and no time should see "or start from 43 ready lessons" right there. `openCommunityCatalog` already exists on the app API (~46432), so this is a button, not a feature.
2. **Publish the text-only editions too, or explain why not.** 50 packs exist, 43 illustrated ones are live. The text editions load faster on the shell and matter for the AI-off path. `dev-tools/build_allopack_catalog_entries.cjs --apply` prints the entries; this was left as Aaron's publication decision on Sept 5 and still is.
3. **Richer cards.** Resource-type chips (reading, glossary, sort, quiz, memory aid, challenge), estimated minutes, standards codes, and the student-AI badge from section 6. All of this can be derived from the pack at index build time; none of it needs an author to type.
4. **Grade as a band picker, not a substring.** K-2, 3-5, 6-8, 9-12 as chips, computed from the `grade_level` string. Middle school teachers at King should get a 6-8 view in one click.
5. **Collections.** A collection is a manifest entry with an ordered list of pack slugs and a one-line rationale. "Crew starter," "Newcomer science, grade 6," "Fractions, weeks 1-3." This is the smallest form of unit support and it is metadata only; see section 5.
6. **A student-facing shelf later, not now.** Students on the shell get packets from a teacher by QR. Giving students the whole catalog is a scope decision with privacy and appropriateness questions (the SEL packs especially). Defer.

## 5. Units

What exists: the history panel already has units (`units`, `activeUnitId`, `handleCreateUnit` at ~32187, `handleMoveToUnit`, a unit filter). Two design docs are shelved on purpose: Throughline, a spatial unit builder over the mind-map module, and Generate Unit, a paced multi-lesson generator. Both were deferred in July behind the PDF pipeline and both say so in their headers. The catalog has no unit concept at all: one entry equals one lesson.

Recommendation: add units to the catalog as collections (section 4, item 5) and make import respect the existing units feature. Concretely: a collection entry `{ slug, title, subject, grade_level, lessons: [slug...], rationale }`; "Load collection" creates a unit in the history panel and tags each imported pack's items with that `unitId`. That is one manifest shape, one importer branch, and zero new UI concepts, because teachers already see units in the history panel. Do not revive Throughline or Generate Unit for this. Throughline's own design doc says the biggest risk is standing up a second unit system, and a catalog collection that feeds the shipped units feature is the "one system" answer it asked for.

Sequencing for King: the first collection should be the Crew starter set from section 3, so the SEL packs, the collection feature, and the first PD session land as one thing.

## 6. A filter for lessons that do not require students to use AI

Yes, but built as a derived property, not an authored tag, and shown as a badge on every card rather than only as a filter.

Why derived: authored tags drift and lie (see the Sept 5 audit's stance on quiz tells and the general rule that scan gates go blind). The pack is fully inspectable at index build time. A resource type either calls student-side AI or it does not:

| Resource type | Student AI at runtime | Notes |
| --- | --- | --- |
| simplified, glossary, concept-sort, sentence-frames, faq, directions, image, anchor-chart, note-taking, timeline, outline, math | none | Static or locally graded |
| quiz | optional | Grading is byte-exact from the pack; the "explain" button renders only when `callGemini` is a function (`view_quiz_source.jsx` ~2087) |
| memory-aid | none for scaffolded mode | cards ship fact-locked |
| applied-challenge | optional, degrades | `allowRuntimeAi` and `learnerReadOnly` gates (`applied_challenge_source.jsx` ~1845); coaching prompts are in the brief |
| SEL Hub tools | optional | 30 of 72 tools show AI buttons only when a provider exists |

So every pack in the catalog today is complete with student AI off, and a few have optional AI extras. That means a filter labelled "no student AI" would return everything and teach nothing. The useful surface is a three-state badge computed per pack: "Works with student AI off" (all today), "Optional AI extras: quiz explanations, challenge coaching" (listed per resource), and "Requires student AI" (none today, reserved for future persona or live-practice packs). The filter then becomes "hide packs that require student AI," which is honest and stays useful as packs that do require it appear.

Two follow-ups this exposes:

- The same badge belongs on the SEL Hub tool cards (30 of 72 have optional AI; the mute and badge toolbars were the Aug 25 pass, this is a similar sweep).
- The packet flow already says "Student AI stays off" in a toast at share time (~27550). Put the same sentence on the packet's landing screen so a King student, and a King teacher looking over a shoulder, can see it without the teacher remembering the toast.

Design constraint to hold: the badge must be computed by the same code path that the runtime uses to decide whether to render an AI button. If the catalog says "optional" and the runtime shows a dead button, the badge is wrong in the way that costs trust. A single test that walks every pack, mounts each resource with `callGemini` absent, and asserts no AI control renders is the gate.

## 7. What to do before the first PD session, in order

0. Author the six Crew Launch packs and the collection entry (section 3). This is what Christian asked for; everything below makes it reachable.
1. Finish the browser shell fix: the AI backend now loads, but `vendor/drag-drop-touch` still 404s as HTML, so publish `vendor/` (or point the shell at a CDN copy) and test a concept sort by touch on a phone. The Crew Launch packs each carry a concept sort.
2. Pin a release and commit the tree. As of Sept 6 the tree was 125 commits ahead with 280 dirty files and the RCE fix was local only; the Sept 11 full deploy cleaned some of that, but confirm before teachers bookmark anything.
3. Put "Ready-made lessons" on the launch pad and the empty state. Publish the text editions.
4. Write the one-page "AlloFlow in an MTSS building" sheet for Christian: what it is (differentiation and practice), what it is not (assessment, screener, data source), where student data goes (nowhere, unless a file is saved), and the student-AI-off default.
5. One PD module in the catalog's PD library that walks a Crew leader through loading the collection and running week 1.
6. Student-AI badge and band picker.

Units beyond collections, Throughline, Generate Unit, and any student-facing catalog stay deferred.

## 7a. What was built on September 13 (same day, after the clarification)

The six Crew Launch packs now exist in `allopacks/`, text-only, with image shot-lists, NOT published to the catalog and NOT committed:

| Week | File | HOWL behavior | Hub tools named in the directions |
| --- | --- | --- | --- |
| 1 | `crew_norms_grade6_8.allopack.json` | Respect: work cooperatively | Crew Protocols |
| 2 | `crew_repair_grade6_8.allopack.json` | Respect: steward resources | Restorative Circle, Perspective Lens |
| 3 | `crew_zones_grade6_8.allopack.json` | Responsibility: participate fully and mindfully | Emotion Zones, Window of Tolerance, Sensory Regulation |
| 4 | `crew_system_grade6_8.allopack.json` | Responsibility: arrive prepared, complete on time | Executive Function, Goal Setter |
| 5 | `crew_ask_grade6_8.allopack.json` | Perseverance: advocate through questions | DEAR MAN, Self-Advocacy Studio |
| 6 | `crew_feedback_grade6_8.allopack.json` | Perseverance: self-assess and revise | Growth Mindset, HOWL Tracker, CBT Thought Record |

Each pack: directions with three goals (one word game, 20 XP, one honest self-check that is the week's real-class commitment), a leveled reading of about 450-510 words that quotes the HOWL "I" statement, a 10-term glossary, an anchor chart, a concept sort, a quiz (5 MCQ with misconception distractors plus 1 short answer and a reflection), sentence frames with a rubric, a 5-question FAQ whose last answer always says how the lesson connects to the HOWL grade and that teachers score HOWLs, two memory-aid cards quoting the reading, and a compact applied challenge (decide, propose, investigate, design, decide, explore). All scenarios are fictional and no student, staff, or school identifiers appear beyond "King" and the HOWL text.

**Gap closed the same evening: a pack can now open a Hub tool.** The convention is a plain markdown link in any rendered text, `[Emotion Zones](#sel-hub/zones)`, documented in `docs/ALLOPACK_FORMAT_SPEC.md` under directions. All six packs now use it (13 links across the six directions bodies). Nothing in `AlloFlowANTI.txt` changed, on purpose, because another session is extracting modules from it. The pieces:

- `sel_hub/sel_hub_module.js` (loads at boot for every role) installs one capture-phase document click listener and `window.SelHub.toolLinks` (parse, open, consumePending). A click on a `#sel-hub/<toolId>` link is intercepted instead of opening a blank tab, the request is written to `window.__alloSelHubPendingTool`, and the hub is asked to open through `window.__alloSelHubOpener` if a surface has lent one.
- `view_history_panel_source.jsx` (mounted for every student session, and for teachers while the History tab is showing) lends the open setter in an effect and clears it on unmount. Order-independent: the hub reads the slot at click time.
- The hub component consumes the pending tool when it mounts, when a link fires while it is already open, and again as tool plugins stream in; an id that never registers gets an error toast after 20 s.
- `catalog/allopack_entry.js` change from earlier still stands.

Verification: `tests/sel_hub_tool_links.test.js` (70 tests: real DOM clicks through the capture listener, the real hub component mounted with a pending tool and with a tool requested while open, every `#sel-hub/` link in every pack checked against the ids the tool files register, source and mirror parity). The existing SEL Hub mount suites (tablist arrow keys, navigation, bypass block: 64 tests) and the five history panel suites (22 tests) still pass, the pack suites pass (562), the audit is clean, and `check_deploy_mirror` reports 0 drift across 8,205 files. The host markdown parser was run on a real crew directions body and emits `<a href="#sel-hub/zones" target="_blank">` as expected.

Two limits to know: a teacher who has left the History tab has no lender mounted, so the link records the tool but does not open the hub until they open it themselves (the students the packs are for always have the panel). And the live app pins module versions by hash, so this reaches users at the next deploy, not before.

Verification run on the final files:

| Check | Result |
| --- | --- |
| `tests/allopack_catalog.test.js` (all 56 packs) | 338 passed |
| `tests/allopack_answer_integrity.test.js` | 224 passed |
| `tests/catalog_index.test.js` | 9 passed |
| `dev-tools/audit_allopacks.cjs` | 0 flags on all six (reading level FK 4.0-5.1, quiz answer positions spread 1/1/2/1 or 1/2/1/1, all glossary terms bolded on first use, every quiz has a retention pair) |
| `dev-tools/qa_allopack_imports.cjs` (headless Chromium, offline, the production `loadProjectFromJson` bridge and `MiscHandlers.handleLoadProject`) | 99 files / 1,185 resources passed; all six Crew packs load whole with every resource field preserved. Result kept as `docs/allopack-quality-2026-09-13/imports-crew-launch.json`; the other session's `imports.json` in that folder was restored untouched. |

Not verified: a real-app load through the Community Catalog UI (the packs are not in the catalog yet, so `smoke_allopacks_live.mjs` cannot reach them), full-view rendering of each resource in the browser, and a phone touch test of the concept sorts on the shell. Those belong to the pre-PD checklist.

One code change outside the packs: `catalog/allopack_entry.js` now maps any pack whose standards cite CASEL to the subject "SEL / Character" (before the NGSS, Math, C3, ELA checks), adds `sel`, `howl`, and `crew` tags from the standards string, and strips a `_grade6_8` style suffix from the slug tag. Existing entries are unchanged (the index test proves the regenerated index is byte-identical). Preview of what publishing would add, from `node dev-tools/build_allopack_catalog_entries.cjs` without `--apply`:

```
crew_norms_grade6_8    | SEL / Character | 6-8 | crew-norms,    memory-aid, applied-challenge, sel, howl, crew, text-only
crew_repair_grade6_8   | SEL / Character | 6-8 | crew-repair,   ...
crew_zones_grade6_8    | SEL / Character | 6-8 | crew-zones,    ...
crew_system_grade6_8   | SEL / Character | 6-8 | crew-system,   ...
crew_ask_grade6_8      | SEL / Character | 6-8 | crew-ask,      ...
crew_feedback_grade6_8 | SEL / Character | 6-8 | crew-feedback, ...
```

Publishing is Aaron's call: `node dev-tools/build_allopack_catalog_entries.cjs --apply`, then regenerate the index, then the usual commit and push. The catalog has no collection concept yet (section 5), so for now the "Crew Launch Week N" titles carry the sequence; a `crew-launch` tag can be added by hand in `published_allopacks.json` at publish time if the catalog search is the way teachers will find the set.

## 7b. The SEL Hub pass (same night, on Aaron's go-ahead)

Full record with before/after sizes in `docs/sel_hub_review_queue.md` §19. In short:

- **5.05 MB of unreachable content removed from 11 tools** (review items 17f and 18d): 652 module-scope literal declarations that nothing read. Emotion Zones went from 2.1 MB to 1.6 MB, the HOWL tool from 1.75 MB to 1.1 MB, the anxiety toolkit from 621 KB to 88 KB. `sel_hub/` is 5 MB lighter. The August 25 gate (`dev-tools/check_sel_dead_content.cjs` with its baseline and `tests/sel_dead_content_ratchet.test.js`) was re-baselined from 652 to 1 and keeps it from growing back. Was it redundant? Unreachable, provably (nothing referenced it, strings included); not duplicate (zero overlap with live text); and not all filler: the four narrative tools' libraries were judged telegraphic in August, but howl, zones, mindfulness, advocacy, upstander and digitalwellbeing lost real authored material that never had a view (coaching moves, conference and repair scripts, trauma adaptations, cultural zone adaptations, validation phrases, gratitude and practice prompt banks). Every removed declaration is archived verbatim in `docs/sel_hub_unwired_content/` (12 JSON files) with the audit in `docs/sel_hub_removed_content_audit_2026-09-13.md`. That archive is the content backlog for enhancing the tools: wire an item into a view and it leaves the archive.
- **Thirteen linked tools verified with no AI provider** by a real mount-and-click sweep (`tests/sel_crew_path_ai_off.test.js`): no crashes, no dead-end AI toasts.
- **HOWL Tracker gained a Respect, Responsibility, Perseverance preset** with King's "I" statements, behaviors, a 1-4 rubric, and content-bank mapping so the Library, Evidence and Prompt views stay populated (`tests/sel_howl_preset.test.js`).
- **Nine cards no longer claim elementary eligibility** (17g), ranges raised to 6-12 or 8-12.
- **Shell touch fix staged**: the drag-and-drop polyfill (plus idb-keyval and lz-string) now lives in root `vendor/`, which Pages serves; `tests/app_shell_vendor_assets.test.js` guards every `/vendor/` reference in the shell. Live after the next deploy.

Verification: 16 SEL suites, 196 tests green; `check_sel_a11y.cjs` 0 errors across 72 tools; deploy mirror clean except another session's `launch.html`. Not verified: a phone walk of the thirteen tools, and a pack link reaching the hub in the deployed shell.

## 7c. Stations, links, and the content wired back (same night, later)

**Stations versus links.** SEL Stations are the existing pack-level pathway: a bundle of tools and quests, built in the hub's Station Builder, saved into the project file as `selStations`, installed by the loader, and listed under SEL Stations in the History panel beside STEM stations. The `#sel-hub/<toolId>` link is text-level: it points one sentence at one tool. They are not duplicates; they are two layers, and they now meet. Every Crew Launch pack carries a station (its linked tools, a 5-minute time quest on the first tool, the week's commitment as a self-check), the directions say where to find it, the format spec documents the field, and a real-loader check shows the station landing where the hub reads it.

**Content wired back with views.** Emotion Zones: body cues that suggest a zone, a validating sentence once a zone is chosen, real co-regulation situations in Help a Friend, educator guidance on the Classroom tab. HOWL Tracker: three micro-actions per HOWL with one-tap add, coaching moves for the Crew leader, repair conversations, conference scripts, and the EL library. Mindfulness: trauma-sensitive alternatives on the practice tabs, sensory and visual anchors, awe practices, and a 390-prompt gratitude bank. Emotion Explorer: illustrations replace emoji wherever a manifest lists an image, emoji stay otherwise, and a 127-item shot list is written for a generation pass. Full table and verification in `docs/sel_hub_review_queue.md` section 19h; the mount-and-click suite is `tests/sel_wired_content.test.js`.

**The rest of the shelf, wired later the same night.** Advocacy (power-up cards, practice ladder, first aid, triggers, scripts, Maine rights with a not-legal-advice caveat, words that hurt, voices, history, family conversations, a friendship audit), Upstander (courage ladder, everyday moments, scripts, situations with the low-risk move first, why people freeze, repair, voices, stories, history, questions, adult guidance), Digital Wellbeing (habits, daily prompts, situations and recovery, how the apps work on you, talking to an AI, voices, stories, words, research with limits, adult guidance), and the Emotion Explorer's 20 guided journal templates. Curricula, directories, laws-by-state, film and book lists, and the terse adult-oriented story volumes stay archived. Record in `docs/sel_hub_review_queue.md` section 19i; suite `tests/sel_wired_content_2.test.js`. The research lines inside the wired libraries were authored, not reviewed; the Library view shows each study's caveat for that reason, and a subject-matter read of those citations belongs on the pre-PD checklist.

**Later the same evening: the link starts the station.** The last seam in the Crew path was that a
pack's tool link and the pack's station were two separate things a student had to find. A
`#sel-hub/<toolId>?station=<stationId>` link now opens the tool with that station active, so the
week's steps, the teacher note, and the self-check sit above the tool from the first click. The six
packs carry it on every link. A real-browser click check of all six also caught a pre-existing fault:
on a page where localStorage is blocked, the hub used to wipe the stations a project had just loaded.
Fixed in the hub's initializer. Details in `docs/sel_hub_review_queue.md` §19j.

**Night: the station comes back.** The active station was React state in a component that exists
only while the hub is open, so a student returning midweek to mark the self-check had to start the
station again, and time in the tool between visits did not count. The active station now persists
for the page and across a reload, is dropped when its record disappears, does not steal focus on
resume, and the guide says when every step is recorded and that saving the project keeps the record.
Quest progress got the same storage fallback as the stations. Six packs gained a "come back later in
the week" sentence. Details in `docs/sel_hub_review_queue.md` §19k.

**Late: the HOWL Tracker stops bluffing.** A duplication scan found generated libraries whose
"per-item" explanations were one sentence copied onto every row: 80 exemplars behind a "Why is this
level?" button, 41 misconceptions with one shared truth, 200 micro-actions that were 50 copied under
every HOWL. The tool now strips constant fields at load and says each true sentence once in the
view's introduction; the micro-actions are 50 curated rows under the HOWL they serve; the weekly
check-in offers recorded Crew station steps as evidence, and the hub shows the "5 minutes here" step
while the tool is open. This is the first content-honesty pass; the scan should run across the other
SEL tools before the PD. Details in `docs/sel_hub_review_queue.md` §19l.

**Later still: the rest of the HOWL padding.** Both scans (constant fields, duplicate rows) were
run across all 72 tools; the pattern lives only in the HOWL Tracker. Its 80 openers were 12 copied
per grade, its 150 coaching moves 50, its 192 student voices 48, its 252 goal sentences 36, and its
conference, repair and climate "libraries" were one script each with thirty titles. Deduplicated at
source; each script is shown once with the situations it fits; the climate navigation is shown once
with the crisis escalation line on the cards that need it. The tool is 1.12 MB, from 2.1 MB before
this week. Details in `docs/sel_hub_review_queue.md` §19m.

## 8. Questions only Aaron or Christian can answer

- Does King run CharacterStrong in Crew, Facing History, or neither? The comparison and the pack topics change slightly with the answer; the positioning does not.
- Is Christian's PD block whole-faculty or opt-in? Opt-in favors a workflow-per-session design; whole-faculty favors one workflow repeated with a different subject each month.
- Is Christian comfortable with the Hub producing no tier data? If the PBIS team wants any signal at all, the answer should be a paper fidelity checklist for the Crew leader (`pilot/07_fidelity_checklist.md` is a start), never Hub telemetry.
- Confirm Christian's title before it appears in any outreach or grant text; the public record only says educator.
- The PPS outside-work and IP policy question from the Sept 6 strategic review still applies once a colleague is running district PD on a tool Aaron built.

## Sources

- King Middle School, Teaching & Learning: https://king.portlandschools.org/academic-programs/teaching-learning
- King Middle School, HOWLs grading guide (student and family handbook): https://king.portlandschools.org/families/handbook/handbook-interior/~board/king-student-family-handbook/post/grading-guide
- EL Education, Grades 9-12 Crew Curriculum Implementation Study, Getting Started (module pacing): https://sites.google.com/eleducation.org/9-12-crew-implementation-study/getting-started
- EL Education, We Are Crew overview (2020): https://el-education-production.s3.amazonaws.com/media/documents/ELED-We_Are_Crew_Video_Overview-2020.pdf
- King Middle School (Portland, Maine), Wikipedia: https://en.wikipedia.org/wiki/King_Middle_School_(Portland,_Maine)
- Portland Public Schools, Social Emotional Learning: https://www.portlandschools.org/academic-programs/sel
- PPS Community Newsletter, April 3, 2026: https://www.portlandschools.org/calendars/pps-community-newsletter/april-3-2026
- Maine DOE Newsroom, PBIS in Action: How Portland Public Schools Is Transforming School Culture (Jan 13, 2026): https://mainedoenews.net/2026/01/13/pbis-in-action-how-portland-public-schools-is-transforming-school-culture/
- ZoomInfo listing for Christian Perry, King Middle School: https://www.zoominfo.com/p/Christian-Perry/-1222462874
- CharacterStrong, Middle School Curriculum: https://characterstrong.com/middle-school-curriculum/
- CharacterStrong, What's New for 2026-2027: https://www.characterstrong.com/the-characterstrong-blog/26-27-school-year-updates
- Evidence for ESSA, CharacterStrong Secondary: https://evidenceforessa.org/program/characterstrong/
- ERIC ED629619, Evaluation of CharacterStrong's Secondary Curriculum (2023): https://eric.ed.gov/?id=ED629619
- A multi-site cluster randomized trial of CharacterStrong's Secondary Curriculum in middle schools (ScienceDirect, 2026): https://www.sciencedirect.com/science/article/pii/S2773233926000033
