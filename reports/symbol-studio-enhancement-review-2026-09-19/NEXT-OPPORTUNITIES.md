# Symbol Studio: next enhancement opportunities

**Workflow update:** Reliable Symbol Bank saves, removal undo, and selection-to-board are implemented in [WORKFLOW-IMPLEMENTED.md](WORKFLOW-IMPLEMENTED.md). Selection-to-pack is now implemented in [SELECTION-PACK-IMPLEMENTED.md](SELECTION-PACK-IMPLEMENTED.md).

**Implementation update:** The three Priority 1 correctness items are now implemented. See [CORRECTNESS-IMPLEMENTED.md](CORRECTNESS-IMPLEMENTED.md) for behavior, compatibility changes, and verification. The analysis and probe results below describe the earlier source snapshot; the original probes assert those historical defects.

This follow-up reviews the implementation after the multilingual, learner-ownership, session-summary, and batch-library improvements. The strongest next investment is making review decisions, activity metrics, and saved work behave consistently across the existing workflows.

## Evidence and scope

Reviewed source SHA-256: `44b52d22b42aa0872d8b3e669eff4e3a20a41ea905812deaf9afb9aba3d97289`.

This is an analysis pass. New files contain this report and [reproducible probes](next-opportunity-probes.cjs), with [recorded results](next-opportunity-probes.json). The probes execute extracted current-source functions against synthetic state. Application source and real learner storage were not modified. The full regression suite and live cloud services were not rerun. Earlier browser evidence informs the workflow observations; no new performance benchmark or accessibility conformance audit is claimed.

The recent work should be retained: strict wish ownership, Unicode-safe bank search, independent topics and word types, persistent accessible summaries, and batch edits with guarded undo are already implemented. The opportunities below build on them.

## Ranked opportunities

| Priority | Enhancement | Evidence | Relative effort | Success criterion |
| --- | --- | --- | --- | --- |
| 1 | Make automatic reuse honor review status | Probe selects a preferred “needs changes” image over an approved alternative | Small | An approved matching asset wins over a flagged alternative; the chosen image and review state are explainable |
| 1 | Use one definition of taps and spoken messages | CSV and session summary disagree for the same synthetic session | Medium | Tap counts, message counts, and symbols per spoken message agree in every view and export |
| 1 | Finish Unicode consistency beyond bank search | Garden splits equivalent labels; spelling rejects a canonically equivalent answer | Small–medium | Equivalent character encodings share aggregation and scoring while meaningful language distinctions remain intact |
| 2 | Separate resource coverage from practice evidence | Three resource types produce “Growing” with zero activity | Medium | Suggested words, available resources, practice events, and observations are distinct |
| 2 | Save finished stories and Quick Boards as named resources | Story templates retain prompts, not completed pages | Medium–large | Several completed supports can be reopened independently and included in packs |
| 2 | Add a preview before import and a clear transfer summary | Import outcomes are reported after commit; cloud metadata omits newer bank fields | Medium–large | Users see destination, reuse, conflicts, omissions, and supported content before applying a transfer |
| 2 | Turn library selection into a useful next action | Batch selection currently leads to metadata editing only | Medium | The same selection can create a board, join a pack, or download as one bundle |
| 2 | Unify save feedback and recovery in older handlers | Favorite and Clear All paths ignore the storage result | Small–medium | An unsuccessful write never looks like a durable save or deletion |

Effort describes implementation complexity, not a delivery estimate.

## 1. Review status should influence what gets reused

`bankAssetRank()` gives preference a weight of 32 and approval a weight of 16. `findExactBankAsset()` sorts by that combined score without excluding assets marked `needs_changes`.

**Reproduced:** two images have the label “Water.” One is approved; the other is preferred and marked “needs changes.” Automatic lookup chooses the flagged preferred image. The helper is used by several reuse/generation paths, so the new batch review tools can communicate one decision while automatic image selection follows another.

Source: [ranking and lookup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:943), [a reuse caller](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:4013).

Recommended behavior:

- Select among approved matches first, applying preferred-variant ranking within that group.
- Make fallback to an unreviewed or flagged image visible when no approved match exists.
- Keep existing saved board images and cell positions stable; apply a replacement only through an explicit update workflow.
- Show where a symbol is used, so a teacher can assess the effect of a later visual change.

Acceptance cases should cover a preferred flagged asset versus an approved alternative, multiple approved variants, only unreviewed matches, and no usable image. Include review changes made through both the single editor and batch organizer.

## 2. Session and export metrics need one event model

The CSV headers `total_utterances` and `unique_utterances` currently count symbol-tap events and distinct tapped labels. The CSV's mean-symbol calculation counts taps between message markers. The session summary instead uses the message marker's recorded `length`.

**Reproduced scenario:** tap three symbols, remove one from the strip, then speak the remaining two. A synthetic log with three taps and one message marker of length two produces:

| Measure | Session event evidence | CSV result |
| --- | --- | --- |
| Symbol taps | 3 | Labeled as 3 “utterances” |
| Spoken messages | 1 | No corresponding accurate message-count column |
| Symbols per spoken message | 2 | 3.00 |

The current log already distinguishes a message marker from taps. Use that distinction consistently. A shared session-metrics function should supply the debrief, Garden, print report, and CSV. A versioned spoken-message event should retain the composition that was actually spoken, rather than reconstructing it from earlier taps after edits to the strip.

Source: [CSV calculations](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:9639), [summary calculation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:12366), [message marker creation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:12410).

Acceptance cases: remove a symbol before speaking; clear an unsent strip; tap without speaking; speak a multiword phrase stored in one cell; repeated message events; and imported legacy logs without reliable message boundaries. Label legacy estimates explicitly. Keep “symbols per message” distinct from a linguistic word or morpheme count.

The printed report also assigns “Rich,” “Developing,” “Emerging,” or “Limited” labels from fixed unique-label/use ratios. A useful refinement is to show the count, denominator, time window, and activity type directly instead of making that ratio resemble an achievement rating. [Current report calculation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:9381).

## 3. Extend Unicode correctness into aggregation and practice

The bank now has a stronger identity normalizer, but some consumers still use only `trim().toLowerCase()`.

**Reproduced:** visually equivalent `Café` and `Café` (composed and decomposed accent encodings) become two Garden entries. Both receive a practice score of 0.754 through the shared lookup, but their displayed tap counts are 19 and 0. The spelling game also marks the canonically equivalent answer wrong.

Source: [Garden keys and counters](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:8223), [spelling comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:7984).

Introduce shared keys for aggregation and consistent familiarity lookup. For spelling, canonical Unicode normalization can treat equivalent encodings equally without accepting a genuinely different spelling. Keep accent-insensitive search separate from spelling correctness.

Story matching also misses `水` in the unspaced sentence `我喝水。`. Language-aware matching needs its own acceptance cases, including avoiding false matches inside unrelated compounds. The standardized [Intl.Segmenter API](https://tc39.es/ecma402/#segmenter-objects) provides locale-sensitive segmentation primitives, but segmentation alone does not define the right AAC concept-matching rule; validate phrase and compound behavior with the intended languages.

## 4. Make Garden activity easier to interpret

**Reproduced:** a word placed in the bank, a board, and a story becomes “Growing” with zero taps and a zero familiarity score. That follows the explicit `uc >= 3` rule. Default Quick Board entries also enter the same resource aggregation. The revised explanatory copy is helpful, but the underlying growth presentation still combines placement and practice.

Source: [aggregation and growth thresholds](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:8235).

A clearer model would expose separate views or counts for:

- **Available resources:** words deliberately saved or adopted for this learner.
- **Practice activity:** taps, quiz attempts, exposure, and recency, with source and time window.
- **Wish words and suggestions:** potential additions awaiting adoption.
- **Recorded observations:** optional partner-entered notes, context, and assistance level, kept separate from automatically inferred activity.

The current “contexts” value counts resource types, not real-world communication settings. Rename it “resource types” where that is what it means. Preserve the Garden metaphor while making its evidence visible on demand.

Acceptance: creating a board can increase resource coverage without suggesting that practice occurred. A new learner's suggested Quick Board words should be distinguishable from adopted vocabulary. A teacher should be able to explain a displayed score from its underlying events.

## 5. Preserve completed work and make transfer predictable

**Finished-support library.** “Save as Template” stores a name, situation, and details, rather than the completed story pages and illustrations. Draft recovery preserves current work, but does not provide a library of multiple finished stories. Add Save support, Duplicate, Rename, and Open for completed stories and Quick Boards, then extend Visual Packs to reference those resource types. [Current template save](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:11923).

**Import preview.** Visual Pack import already validates input, reuses identical label/image assets, remaps IDs, clears imported approval claims, and attempts rollback on failure. Preserve those strengths. Move its useful outcome counts into a pre-commit preview: target learner, new/reused resources, missing references, omitted images, and review status. Backup import should similarly expose same-ID replacements before applying its merge. [Pack commit and outcome](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:6220), [backup merge](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:605).

**Transfer scope.** The cloud serializer's gallery metadata omits topics and review information introduced or emphasized by the recent organizer. Its visible loader also does not restore a complete gallery. The full-backup dialog now explicitly excludes prepared recordings and unsaved drafts, which is useful existing disclosure. Add an at-a-glance comparison of saved-on-device, draft, backup, pack, and cloud contents; define each supported round trip before expanding payloads. This is a source-level finding, not a live cloud test. [Backup and cloud serialization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:3804).

Explaining included and omitted content before a choice follows W3C's supplemental guidance on [making action consequences clear](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o7p03-supported-choice/). This is design guidance, not a claim of a WCAG conformance failure.

## 6. Make the new organizer a bridge to useful outputs

The batch organizer is a foundation for three next actions: **Create board from selection**, **Add to Visual Pack**, and **Download selected bundle**. These would reuse the work of selecting and filtering instead of requiring another selection flow. A board handoff should preserve order, images, asset references, and the learner, with a clear choice when a board draft already exists.

“Download All” currently schedules one anchor click per image, 250 ms apart. At 1,000 assets, that means 1,000 download attempts with the last scheduled about 250 seconds later. This is a source-derived calculation, not a measured throughput result. A single ZIP with a manifest, useful filenames, attribution, metadata, progress, and cancellation would scale better as a user workflow. [Current downloader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:3781).

On phones, the creator still precedes the organizer and search. A “Create / Browse / Organize” choice or a compact gallery header could reduce scrolling. Validate this with time-to-find, time-to-organize, and time-to-use tasks; the previous no-overflow checks do not measure effort or discoverability.

Older favorite and Clear All handlers still ignore failed storage writes. Extend the guarded persistence status used by batch edits to these paths, and add reversible resource deletion that preserves pack membership. [Current handlers](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/symbol_studio_module.js:3785).

## Suggested next delivery order

1. **Consistency fixes:** review-aware reuse, canonical Unicode aggregation/spelling, and one shared session-metrics calculation.
2. **Teacher workflow:** reliable save status, board/pack/export actions from a selection, and a compact mobile browse entry point.
3. **Reusable supports:** named completed stories and Quick Boards, import previews, and explicit transfer contracts.
4. **Evidence and scale:** separate Garden data categories, add an optional observation workflow, and benchmark large libraries before choosing indexing or virtualization.

Measure successful save/reload, agreement between views and exports, time to reuse a support, recovery from mistakes, and task completion with keyboard or touch. Keep these product measures separate from claims about communication outcomes.
