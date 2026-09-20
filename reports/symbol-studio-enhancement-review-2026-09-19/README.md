# Symbol Studio enhancement review — 19 September 2026

Symbol Studio has a strong foundation and substantial feature breadth. Its best next investment is making the existing tools feel like one dependable workflow: choose a learner, find or create a symbol, review a support, use it, and revisit meaningful evidence. Four confirmed correctness problems should come first: learner wish isolation, multilingual symbol lookup, incompatible category systems, and misleading or inconsistent progress interpretation.

This is an analysis-only review. Application source, snapshots, and deployed services were not changed. New files contain the report, reproducible review scripts, measurements, and screenshots.

## Scope and evidence

- Reviewed the current 952,531-byte `symbol_studio_module.js`, its desktop distribution copy, integrations, and the September 12 review/refinement/draft reports.
- Ran the existing Symbol Studio suite: **236 passed, 1 failed, 237 total across 26 files**. The sole failure is the Sequences golden snapshot: text color changed from `#059669` to `#047857`. This is a baseline mismatch, not evidence of a broken sequence interaction. I did not update snapshots to conceal the failure.
- Rendered **27 initial tab states**: all nine tabs at **1440, 390, and 320 CSS pixels**, using local Chromium, the real module, fictional records, stubbed providers, and blocked external requests. No page exceptions or measured workflow overflow occurred. The intentional scrolling tab strip is excluded from overflow counts.
- Inspected representative desktop and phone screenshots. The fictional images are generic placeholders, so these captures do not evaluate AI image quality or symbol comprehensibility.
- Ran additional executable probes for multilingual normalization/search, category filters, foreign-profile wish visibility, and vocabulary-bridge scoring. See [probe results](behavior-probes.json).
- Root and desktop copies have matching SHA-256: `8efb84f34b20fd04e7a2f85abf78c6fa61700fa6649ac33df732ae4a554dec40`.

This is not a full accessibility conformance audit, performance benchmark, live cloud round-trip, or real-device speech/switch assessment. The browser sweep covers initial states, not every populated editor, game round, overlay, or export. Earlier verified work is credited below, but its historical browser checks were not all rerun.

## What is already worth preserving

The current implementation supports nine connected areas: Symbol Bank, Board Builder, Sequences, Social Stories, Quick Boards, Visual Packs, Symbol Quest, Symbol Search, and Word Garden.

Notable existing strengths include symbol aliases, review states, preferred variants and locks; multipage boards; direct AAC and switch scanning; cell speech preparation; portable HTML and OBF/OBZ exports; shareable packs with an explicit field allowlist; per-learner IndexedDB draft recovery; editable story text; save versus save-a-copy behavior; board-page deletion undo; and guards against stale generation, translation, recording, and playback results.

The recent mobile and draft work is meaningful. A proposal to simply “add autosave,” “make stories editable,” or “make it responsive” would duplicate capabilities already present. The opportunity is to complete and unify those capabilities.

## Prioritized opportunities

Effort is relative implementation complexity, not a delivery estimate. P1 items affect correctness or trust; P2 items improve everyday usability and maintainability.

| Priority | Opportunity | Evidence | Effort | Success condition |
| --- | --- | --- | --- | --- |
| P1 | Isolate learner wishes consistently | Reproduced another profile's wish in the active learner's Garden | Small–medium | Foreign wishes never enter that learner's garden, recommendations, reports, or session summary |
| P1 | Support Unicode throughout symbol identity and search | Four non-Latin searches normalize to an empty string | Medium | Exact lookup, aliases, search, reuse, and bridge vocabulary work across supported scripts |
| P1 | Make progress language match evidence | Formula uses taps, quiz results, recency, and resource presence; bridge uses a different formula | Medium | Activity, practice performance, and observed independent use are distinct and consistently calculated |
| P1 | Separate topic tags from grammatical categories | Creator stores `food`/`actions`; filter expects `noun`/`verb` | Small–medium | Every creatable category can be found and interpreted consistently |
| P1/P2 | Make persistence and transfer guarantees explicit | Cloud payload is partial; backups omit drafts; some writes ignore failures | Large, with small copy/status improvements first | A user can tell what is saved where and verify a complete supported transfer |
| P2 | Organize around create, use, practice, and review | Nine equally weighted tabs and a long shared settings sidebar | Medium | Teachers can reopen and use a saved support quickly without navigating authoring controls |
| P2 | Save completed stories and Quick Boards as reusable resources | Story template saves prompts, not pages; packs accept boards/sequences/assets | Medium–large | Several finished stories and Quick Boards coexist and can join a pack |
| P2 | Add consistent reversible editing | Page deletion has Undo; saved resource deletion does not | Medium | Delete/replace can be recovered without disturbing another learner's work |
| P2 | Improve language and access-mode consistency | Hardcoded English controls; compact desktop controls; transient debrief | Medium | Language, input mode, and key interaction patterns work consistently across tools |
| P2 | Extract shared services and views behind current tests | One large component contains storage, authoring, metrics, games, speech, and export | Large, incremental | Shared rules have one implementation and independent regression coverage |

## 1. Learner isolation needs one shared rule

**Confirmed:** wishes are stored globally with `profileId`. Some views explicitly filter by the active learner, but `computeWordBank()` adds all wishes without that filter. A synthetic wish belonging to `other-learner` appeared as a word in Demo Learner's Word Garden. This is a local cross-profile exposure; no external disclosure was tested or observed.

The AAC debrief also counts all wishes from the last two minutes rather than wishes owned by the current learner and session. The two-minute window can miss wishes from longer sessions and include unrelated recent ones.

Introduce one `getWishesForProfile()` selector and use it for aggregation, student/teacher views, reports, recommendations, and session summaries. Establish an explicit migration rule for older wishes without an owner. Associate new wishes with a session ID instead of approximating session membership by recency.

Source: `symbol_studio_module.js:3072`, `:8089`, `:8817`, `:12173`. Probe: `foreignWishVisible: 1`.

## 2. Multilingual search is a functional gap

**Confirmed:** `normalizeSymbolLabel()` retains only ASCII letters, numbers, whitespace, apostrophes, and hyphens after normalization. `水`, `ماء`, `вода`, and `पानी` all normalize to an empty string. Consequently:

- Searching any of those terms matches an unrelated English symbol because an empty query is treated as “match all.”
- Exact asset reuse fails even when an asset has the identical original label.
- Those labels disappear when supplied as aliases.
- The cross-tool vocabulary bridge skips words whose normalized identity becomes empty.

Preserve Unicode letters, combining marks, and numbers. Separate durable concept identity from language-specific display labels and search keys. Use language-aware matching where necessary; do not assume stripping diacritics is harmless for every language. Retain existing IDs during migration.

Acceptance cases should include Arabic, Chinese, Cyrillic, Devanagari, mixed scripts, composed/decomposed characters, punctuation, and duplicate labels in different languages. Matching and search should be checked both in the bank and through the bridge.

Source: `:800–864`, `:12778–12781`. Executable results are in `behavior-probes.json`.

## 3. Word Garden needs more honest evidence labels

**Confirmed behavior:** the main familiarity score combines interaction volume, quiz accuracy, and recency. A word can reach approximately **0.754 from 19 recent taps and no quiz answers**. Garden “mastered” additionally requires appearance in four resource types, which measures where the author has placed a word, not independent use in four real-world settings. Yet its description says “used spontaneously everywhere.”

The bridge separately marks 19 taps as `isMastered: true`, without the Garden's context, accuracy, or recency requirements. A word's interpretation therefore changes depending on the consuming tool.

There is also a baseline problem: the fixture contains eight actual bank symbols, but Garden initially reports **52 words** because default Quick Board text contributes 44 additional entries. Those defaults can be useful suggestions; presenting them alongside adopted vocabulary makes the total difficult to interpret.

Recommended model:

- **Available vocabulary:** deliberately added or adopted resources.
- **Interaction activity:** taps, exposure, and last use, with source shown.
- **Practice performance:** game results, attempts, and any assistance used.
- **Observed communication:** optional teacher/partner observations of independent or prompted use in a stated context.
- **Suggested vocabulary:** unused defaults and wishes, visibly separate.

Keep the garden metaphor, but use labels such as “recently practiced” or “used in these activities.” Reserve stronger achievement statements for explicitly defined evidence. Use one shared scoring implementation, version it, and explain what the score does and does not measure. Replace substring matching of story text with meaningful token/phrase matching: the current `indexOf()` can count a short label inside an unrelated word.

The debrief's “MLU” is the mean number of selected cells in spoken strips; a multiword phrase on one cell still counts as one. Call this “average symbols per message” unless a separate linguistic measure is deliberately implemented. This distinction is consistent with [ASHA's description of language sampling across communication contexts](https://www.asha.org/practice-portal/resources/assessment-tools-techniques-and-data-sources/); the formula findings above come from local source and probes, not a clinical evaluation.

Source: `:3126`, `:7934`, `:8067–8110`, `:12165`, `:12800–12802`.

## 4. Categories currently represent two different concepts

The single-symbol creator offers `emotions`, `classroom`, `daily living`, `food`, `social`, `actions`, `places`, and `objects`. The bank filters and AAC color mapping expect `noun`, `verb`, `adjective`, and `other`.

**Reproduced:** eight assets with `category: "food"` appear under All, but zero appear under Other or Nouns. The interface does not offer a Food filter. This is a schema inconsistency, not merely a label preference.

Use separate fields for `partOfSpeech` and `topicTags`. Migrate existing topic values without guessing grammar, allow correction, and apply the same interpretation to creation, search, board colors, imports, exports, and category games. Keep learner-facing colors stable during migration.

Source: `:346`, `:3409`, `:10839`, `:10924`.

## 5. Complete the persistence story

There are currently several distinct promises:

| Mechanism | Current scope | Enhancement |
| --- | --- | --- |
| Saved resources | Mostly JSON collections in localStorage, including images | Move binary media into asynchronous asset storage and surface write failures consistently |
| Automatic drafts | Per-profile IndexedDB, validated and bounded to 25 MiB | Offer explicit draft export/recovery and communicate capacity before failure |
| Downloadable backup | Version 8, per-profile saved data | Offer a clearly labeled option to include drafts and supported media |
| Cloud sync | Selected metadata; active in-memory boards/sequences; no complete per-profile envelope in this module | Define a versioned ownership-aware contract and preview restore effects |
| Shareable Visual Pack | Boards, sequences, selected assets; intentional private-field exclusions | Retain these exclusions and add a clear pre-share content preview |

The module's cloud payload omits board pages and much cell metadata, complete image data, packs, and drafts; gallery metadata is sent but not restored by the shown loader. The UI does say “Metadata only (images stay local),” which is helpful, but does not explain all omissions. The loader writes restored boards/sequences into the active profile's scoped keys. Host/backend partitioning was not live-tested, so these findings concern the module's visible serialization and restoration contract.

Start with a storage/transfer summary that shows “saved on this device,” “draft only,” and “included in this export.” Then implement profile-aware transfer with schema versions, conflict preview, stable asset references, and bounded transactions. Preserve deliberate identity and voice exclusions instead of broadening cloud payloads indiscriminately.

Some residual handlers, including favorite/lock changes, Clear All, goal changes, and usage logging, ignore the boolean returned by `store()`. Bring these under the same honest persistence status used by newer bank/draft paths. Deleting a profile removes its profile record and draft but does not explicitly purge all scoped resource/audio stores in that handler; define archive versus full device deletion and verify the intended lifecycle.

Source: `:549–577`, `:728`, `:1890`, `:3383`, `:3628–3639`, `:3701–3818`, `:3960`, `:12142–12149`.

## 6. Make the main workflow easier to discover

The desktop view presents nine equally prominent tabs plus a long shared sidebar of learner, generation, voice, Garden, backup, and goal controls. Board Builder's empty state emphasizes AI generation even though templates, bank reuse, imports, and existing supports are available. On phones, collapsed settings and stacked panels work, but a horizontally scrolling tab list hides some destinations.

Add a start/resume view with recent supports and clear actions: **Use a support**, **Create a support**, **Practice**, and **Review activity**. Keep familiar tool names and stable AAC cell positions. Group authoring settings by task, place advanced settings in a disclosure, and give each screen one primary action. “Symbol Search” is a listening/practice activity while the bank also has symbol search; “Listen & Find” would explain the former more clearly.

A proposed flow is: **Learner → recent support or template → edit → review readiness → use / print / share**. A readiness summary could show missing images, unreviewed visuals, speech availability, and included export content without blocking immediate communication.

W3C's [familiar hierarchy and design guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p02-familiar-design/) supports a clear organization with recognizable controls. Whether these specific groupings help teachers should be validated through task-based testing.

## 7. Promote finished work into a reusable library

Social Stories have page editing and draft recovery, but “Save as Template” stores only `label`, `situation`, and `details`; it does not save the completed text and illustrations as an independent story. A current draft is not a library of completed stories. Quick Boards similarly deserve named saved instances, and Visual Packs currently reference boards, sequences, and assets rather than complete stories and Quick Boards.

Add Save support, Duplicate, Rename, and version history for finished stories and Quick Boards. Extend packs through a versioned resource type rather than special-case references for every tool. A morning-arrival pack could then contain a communication board, arrival sequence, finished story, and calming support, all ready to reuse together.

Expand the existing library's practical features: recent/favorite supports, searchable titles, consistent learner ownership, bulk review/tagging, and an explicit “adopt for this learner” action for shared templates. Avoid silently propagating a new visual to every established board; show where an asset is used and make updates deliberate.

Source: `:890`, `:11715–11727`, `:11814–12078`.

## 8. Finish the access and recovery experience

The measured phone layout is much improved. Desktop controls remain dense: the initial Symbol Bank state has 61 visible-by-style interactive elements below 44 pixels in at least one dimension, including sidebar controls. This is a comfort-target measurement, not a claim that all violate WCAG. On mobile, the errorless-learning checkbox is 13×13, but its associated label's clickable area needs separate evaluation; Garden search collapses to roughly 37 pixels wide at 390px, visibly obscuring its purpose.

Use consistent readable field widths and larger desktop/tablet controls. Audit game-round and session-completion overlays, not only authoring dialogs. The completion debrief is a clickable overlay with “Tap anywhere to close,” no native close button, and a five-second timeout. A persistent summary with a named Close button and deliberate focus management would be easier to use and review.

Extend the existing page-delete Undo pattern to resource deletion and bulk changes. Recover the resource together with pack memberships and learner ownership. Avoid global keyboard shortcuts that interfere with AAC/switch interaction.

Validate with actual keyboard-only users, screen readers, switch access, microphone permissions, offline speech, browser zoom, long translations, and right-to-left content. Many labels are still literal English despite the translation accessor; translating symbol labels alone does not localize the workflow.

Source: `:4714`, `:4914`, `:6445`, `:12090–12118`, `:12184`; measurements in `browser/measurements.json`.

## 9. Improve engineering structure without a rewrite

Extract pure Unicode/search, category, ownership, and scoring rules first because current inconsistencies already demonstrate the cost of duplication. Next extract persistence/export services, the asset repository, and speech ownership. Then move individual editors and learner views into components while preserving the `AlloModules.SymbolStudio` loading contract and distributed-file parity.

The bank currently filters and normalizes assets during render and renders every matching tile. The Garden aggregates several collections, and the single component owns many unrelated states. These are plausible scaling risks, not measured performance failures. Benchmark representative 100/1,000/5,000-asset libraries before selecting memoization, indexing, or virtualization. Preserve keyboard behavior when virtualizing.

Maintain tests for behavior and failure paths alongside snapshots. Resolve the current color snapshot mismatch deliberately after review. Add focused regressions for the confirmed probes, per-profile wish exports, completed-support round trips, storage failures in older handlers, and shared metric consistency.

## Suggested delivery sequence

1. **Correctness and trust:** isolate wishes; fix Unicode identity/search; separate taxonomy fields; remove unsupported progress claims; unify scoring; reconcile the known snapshot mismatch.
2. **Daily workflow:** add recent supports and clearer primary actions; make saved/draft/transfer status explicit; improve Garden's vocabulary baseline; add consistent undo and persistent session summaries.
3. **Reusable delivery:** save completed stories and Quick Boards; include them in packs; add explicit draft transfer; version the cloud/asset model with conflict handling.
4. **Scale and validation:** extract modules, benchmark larger libraries, and test real access devices and external-service failures.

Measure time to reopen and use a support, successful save/reload/transfer, recovery after mistakes, time to find a desired symbol, and task completion without assistance. Raw taps and generated-image counts should not be treated as evidence that the product is improving communication.

## Review artifacts

- [27-state browser summary](browser/summary.json)
- [Detailed measurements and captured UI text](browser/measurements.json)
- [Targeted behavior probe results](behavior-probes.json)
- [Repeatable browser sweep](browser-audit.cjs)
- [Repeatable behavior probes](behavior-probes.cjs)
- [Desktop Symbol Bank](browser/1440-symbols.png)
- [Desktop Board Builder](browser/1440-board.png)
- [Phone Word Garden](browser/390-garden.png)
- [Phone Symbol Quest](browser/390-quest.png)

Reproduce from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/symbol_studio --maxWorkers=1 --pool=threads --hookTimeout=60000 --testTimeout=30000
node reports/symbol-studio-enhancement-review-2026-09-19/browser-audit.cjs
node reports/symbol-studio-enhancement-review-2026-09-19/behavior-probes.cjs
```
