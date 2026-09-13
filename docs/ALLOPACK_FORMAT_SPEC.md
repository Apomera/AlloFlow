# AlloPack Format — v0.1 (draft)

A pack is a **plain JSON file** a teacher can load via **Load Project** (or share over any
AlloFlow channel). This spec exists so producers OTHER than the in-app generator — a teacher's
editor, another tool, an AI author — can create packs that render correctly. It was written by
auditing the actual producers (generate_dispatcher prompts) and consumers (view renderers,
translation normalizers) on 2026-07-20; the flagship pack + `tests/allopack_flagship.test.js`
are its executable examples.

## Envelope

Either a raw ARRAY of resource items, or (preferred):

```json
{
  "allopack": { "spec": "0.1", "title": "…", "author": "…", "license": "…", "language": "en", "gradeLevel": "6th Grade", "createdAt": "ISO-8601" },
  "sourceTopic": "The Water Cycle",
  "history": [ …resource items… ]
}
```

`history` is what the loader consumes (`handleLoadProject`: raw array OR `.history`). The
`allopack` block is producer metadata — ignored by today's loader, load-bearing for the
community catalog.

**`selStations` (optional, added 2026-09-13).** A pack may carry SEL Stations, the same records
the SEL Hub's Station Builder saves: `{ "id", "name", "tools": [toolId], "teacherNote", "quests": [{ "qid", "type": "xpThreshold"|"timeSpent"|"freeResponse"|"manualComplete", "toolId", "label", "params": { "minutes"?|"threshold"?|"minChars"? } }], "createdAt", "source" }`.
The loader already installs `rawData.selStations` (misc_handlers `handleLoadProject`), so after
Load Project the station lists under **SEL Stations** in the History panel beside STEM stations and
opens the hub filtered to its tools with quest tracking. This is the pack-level pathway into the hub;
the inline `#sel-hub/<toolId>` link (above) is the text-level one. Use both: the station holds the
time and the self-check, the link takes the student to the right tool from the sentence that
names it. Every `toolId` must be registered; `tests/sel_hub_tool_links.test.js` checks it.

## Resource item envelope

```json
{ "id": "unique-string", "type": "<type>", "title": "…", "timestamp": "ISO-8601", "data": <type-specific>, "meta": "display string"? }
```

Rules: `id` unique across the pack; `type` from the registry below; students receive every type
NOT in `TEACHER_ONLY_TYPES` (lesson-plan, brainstorm, udl-advice, …). Delivery order = array
order, except `directions` always opens first (delivery rule, not storage order).

**`meta` is a DISPLAY STRING** (the history panel renders it verbatim — e.g.
`"6th Grade • Leveled reading • ~450 words"`). Machine data goes in producer-namespaced
top-level fields instead (e.g. `imageSlot`); the app tolerates extra fields on load, but only
spec'd fields are guaranteed to survive session serializers. (Exception already in the app:
directions items created by the in-app composer may carry an object meta for provenance — the
history panel now renders only string metas, so object metas display as blank, never
`[object Object]`.)

**Standards** belong in the `allopack` block (e.g.
`"standards": "NGSS MS-ESS2-4 (…); CCSS.ELA-LITERACY.RST.6-8.4 (…)"`) — human-readable codes
with a parenthetical gloss, so catalog browsing and alignment review need no lookup.

**Catalog language policy (v0.1, settled 2026-07-20): packs are ENGLISH-ONLY.** Do not embed
`translations` in catalog packs. Localization is the teacher's move, via the in-app Translate
flow (whole-pack or single resource), which creates translated copies in the language their
class actually needs — including directions with goal tethers repointed at the translated
resources. Rationale: one catalog entry per unit; no half-translated packs to QA or maintain;
teachers can hand-correct AI translations for their community's dialect. (The `translations`
field remains legal in the format — the in-app translator and hand-authored packs use it — it
is simply not part of catalog submissions.)

## Type registry (shapes verified against renderers)

### `simplified` — leveled text
`data`: **markdown string**. Paragraph breaks = blank lines. Optional bilingual form:
`"<target-language text>\n--- ENGLISH TRANSLATION ---\n<english>"`.

### `glossary`
`data`: **array** of `{ "term", "def", "tier": "Academic"|"Domain-Specific", "translations"?: { "<Language>": "TranslatedTerm: TranslatedDefinition" }, "etymology"?, "roots"?: [{root, lang, meaning}] }`.
The glossary powers the word games (crossword, word scramble, memory, matching, bingo) — a pack
with game objectives MUST include a glossary (8+ terms recommended; short single-word terms
play best in crossword/scramble).

### `concept-sort`
`data`: `{ "categories": [{ "id", "label", "color": "bg-<tailwind>-500" }], "items": [{ "id", "content", "categoryId" }] }`.
Every `categoryId` must resolve; 2-4 categories, 6-12 items.

### `quiz`
`data`: `{ "questions": [ … ], "reflections": [{ "text" }] }`.
MCQ: `{ "type": "mcq", "question", "options": [4 strings], "correctAnswer": <exact option text>, "conceptLabel": "2-4 lowercase words" }`.
Short answer: `{ "type": "shortAnswer", "question", "expectedAnswer", "conceptLabel" }`.
`correctAnswer` must equal one option **byte-for-byte**. Distractors should encode real
misconceptions, not random wrong answers. `conceptLabel` is stable across items testing the
same concept (retention tracking).

### `sentence-frames`
`data`: `{ "mode": "list", "items": [{ "text" }], "rubric": "<markdown table>" }`.

### `faq`
`data`: **array** of `{ "question", "answer" }`. Emoji welcome; short student-friendly answers.

### `directions` (spec'd fully here — newest type)
`data`: markdown **string**, or `{ "body": <markdown>, "objectives": [ … ], "softGate"?: true }`.
Objective: `{ "id", "label", "kind": "xp"|"game"|"manual", "amount"? (xp), "gameType"? (game), "resourceRef"? (game, a pack item id) }`.
`gameType` ∈ crossword | wordScramble | memory | matching | bingo (+ timelineGame,
conceptSortGame, syntaxScramble, vennDiagram, causeEffectSort). XP is a **delta** from the
student's first view. `softGate: true` = friendly finish-goals-first nudge; nothing ever locks.

**Linking to an SEL Hub tool (2026-09-13).** Name a Hub tool in the body as a plain markdown link whose
target is `#sel-hub/<toolId>`: `Open [Emotion Zones](#sel-hub/zones) and do the one-word check-in.`
The `toolId` is the id the tool registers with (`registerTool('zones', …)` in `sel_hub/sel_tool_*.js`);
`#sel-hub` alone opens the tool grid. The click is handled by `sel_hub_module.js`
(`window.SelHub.toolLinks`): it opens the hub at that tool instead of following the href, waits for
a tool that has not registered yet, and tells the student when an id does not exist. Any rendered
markdown can carry the link (FAQ answers, notes), not only directions. Use the student-facing label
as the link text. `tests/sel_hub_tool_links.test.js` checks every `#sel-hub/` link in `allopacks/`
against the registered ids, so a typo fails there rather than in a classroom.

**Starting the pack's station from the same link.** Add `?station=<stationId>` to name a station the
pack carries in `selStations`: `[Emotion Zones](#sel-hub/zones?station=sel_station_crew_launch_zones)`.
The click opens the tool and starts that station, so the student sees the station's steps and
reflection above the tool instead of having to find it in the History panel. `#sel-hub?station=<id>`
starts the station in the tool grid. The id is explicit and must match a station the project holds
(the pack's own, or one the teacher built); nothing is guessed from tool membership, because
stations from earlier packs stay on the device. A link to a station the project does not carry opens
the tool and tells the student to load the pack. The same test checks that every `?station=` in a
pack names a station in that pack and that the linked tool belongs to it.

### `image`
Prefer **slots over payloads**: author an image SHOT-LIST (see the flagship's IMAGES.md) with
placement, generator prompt, and born-accessible alt text; the teacher generates in-app (which
produces correctly-shaped image resources) or drops files in. Packs stay small and
license-clean.

### `anchor-chart`
`data`: `{ "chartType"?: "reference", "title", "sections": [{ "label", "bullets": [string], "iconPrompt"? }] }`. 3-5 sections, 1-3 bullets each.

### `note-taking` (Cornell notes)
`data`: `{ "templateType": "cornell-notes", "cues": [{ "id", "text" }], "notes": [{ "id", "text": "" }], "summary": "" }`. One blank note row per cue (4+ cues).

### `timeline`
`data`: `{ "progressionLabel": "AXIS: low -> high", "items": [{ "date", "event", "description"? }] }`. 4+ items; also used for process steps ("PROCESS: Step 1 -> Step 7").

### `outline`
`data`: `{ "main", "branches": [{ "title", "items": [string] }] }`. 2+ branches.

### `math`
`data`: `{ "problems": [{ "question", "answer", "steps": [{ "explanation" }] }] }`. 4+ problems; every step is a sentence a student could say.

### `memory-aid` (Memory Aid Studio, added 2026-08-28; pack shape settled 2026-09-05)
`data`: `{ "schemaVersion": 2, "title", "instructions", "selectionMode": "manual", "selectedTypes": [type], "authorshipMode": "scaffolded", "reflectionLevel": "quick", "reasoningRequired": false, "sourceExcerpt", "lessonRef": { "resourceId", "title" }, "cards": [card] }`.
Card: `{ "id", "target", "essentialFacts": [2-10 strings], "factLocked": true, "factVerified": true, "type", "mode": "scaffolded", "aiExample", "mapping", "scaffoldStarter", "scaffoldSteps": [string], "coachPrompts": [string], "studentPrompt", "reasoningPrompt", "hookFact"?: { "text", "sourceTitle" } }`.
`type` is one of acronym-acrostic | rhyme-rhythm | chunking | story-chain | keyword-association | visual-association | analogy-pattern | sequence-cue. 2-8 cards (3 is the sweet spot). `factVerified: true` records that the pack author checked the facts; the studio then shows "0 items to review". Quote `essentialFacts` from the pack's own reading so a fact-check can find them. The example aid must be one a student could have written; the mapping must say how each part leads back to a fact.

### `applied-challenge` (Applied Challenge Studio, added 2026-08-28; pack shape settled 2026-09-05)
`data`: `{ "schemaVersion": 6, "title", "instructions", "selectionMode": "manual", "family", "fitReason", "agencyMode": "co-framed", "scope": "compact"|"standard", "brief", "supports", "coachHint", "sourceExcerpt", "lessonRef": { "resourceId", "title" } }`.
`family` is one of investigate | design | decide | propose | explore, and `brief.family` must match. Brief: `{ "family", "context", "role", "audience", "drivingQuestion", "seedDirection", "lockedLessonFacts": [3-12 strings], "openQuestions": [string], "stakeholders": [string], "criteria": [2+], "constraints": [1+], "deliverable", "factLocked": true, "factVerified": true }`. Supports: `{ "parallelExample": { "context", "move", "whyItHelps" }, "frameStarter", "frameChoices": [2+], "coachPrompts": [string] }`.
Leave `workspace`, `evidenceLedger`, `validationCycles`, `feedback` and `teacherComment` out: the studio fills them as the student works. `lockedLessonFacts` are the only facts the brief may treat as established; everything else the student needs is an `openQuestion`. A good brief has a real audience, a deliverable a student can finish, and at least one criterion that requires the pack's vocabulary.

Executable examples of every type above: any file in `allopacks/` (all 21 carry memory-aid and applied-challenge since 2026-09-05) and the per-type shape checks in `tests/allopack_catalog.test.js`.
## Authoring rules (the ones that bite)

1. **Never** put student names, levels, accommodations, or grouping rationale anywhere in a pack.
2. Audio: none needed — TTS renders on-device in the student's language at play time.
3. Alt text at authoring time for every image slot (born-accessible, not remediated).
4. Validate before sharing: `npx vitest run tests/allopack_flagship.test.js` (adapt its shape
   checks for new packs), plus the Agent Core envelope validator for catalog submissions.
5. Sizes: contract cap ~2,000,000 serialized chars; keep packs well under.
