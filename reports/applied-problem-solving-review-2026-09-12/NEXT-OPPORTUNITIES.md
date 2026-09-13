# Applied Problem Solving: additional enhancement opportunities

Review of the pass 7 implementation, September 12, 2026. This is an analysis pass; no application source, generated bundle, or deployment was changed.

The next iteration should reduce navigation and repeated writing, make evidence collection work across response formats, and establish how well the experience works with learners. The existing five stages, optional supports, explicit source checks, recovery controls, and actionable review provide a useful foundation.

## What this review established

I inspected the authoring, learner, review, source-search, feedback, and shared response code. I also inspected ten browser states in the current authored preview, including all five learner stages at 390px, the initial view at 1280px and 320px, compact scope, and teacher setup. Mobile screenshots of Understand, Check, and teacher setup were visually reviewed.

| Observed state | First writing field, measured from page top | Page height |
| --- | ---: | ---: |
| Understand, 1280px | 777px | 1376px |
| Understand, 390px | 964px | 2139px |
| Understand, 320px | 1094px | 2341px |
| Understand, compact scope, 390px | 964px | 2045px |
| Check, 390px | 848px | 2671px |

These measurements include the preview's explanatory banner and shared workspace toolbar. They describe this fixture, not every generated task or the full production host. The existing **Start writing** shortcut mitigates the initial scroll. Compact scope removes some optional content but does not move the first field upward in this example.

The run produced no page errors and made no AI or search requests. It was an inspection, not a fresh regression or accessibility certification. Prior pass 7 validation remains documented separately. [Analysis data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/opportunity-analysis.json).

## 1. Let learners point to reasoning they have already expressed

**Priority: high. Confirmed behavior. Effort: medium, including saved-data and export handling.**

The final review checks particular fields. A learner can explain their lesson connection, uncertainty, keep-or-revise decision, and transfer example in the main response, yet receive four prompts to record those ideas elsewhere.

I reproduced this with an authored response that connects infiltration to runoff, acknowledges that no local test has happened, explains keeping the comparison as the next step, and applies the idea to a sports field. With only the question and response fields filled, the review marked the other four coverage categories as **Not recorded**. That result follows the current field checks; it does not mean the response lacks all four ideas.

Add **I've explained this elsewhere** beside relevant review prompts. Let the learner point to a passage in their response, an organizer note, or a location in a linked artifact. Display **Pointed to in my response** or **Learner identified this in linked work** rather than treating it as an automatic quality judgment. If the referenced passage changes, invite a quick recheck.

Keep the current direct-edit shortcuts for learners who want to add reasoning. Preserve the distinction between a reference, an explanation, and evidence that a check actually happened. A bare link should still not satisfy the reasoning requirement.

**Acceptance example:** a learner can connect the four relevant passages in the authored response to the review, without copying the same sentences into four fields; the references survive save, restore, submission, and export.

This design direction is consistent with CAST's support for varied media of expression when a particular medium is not itself the learning goal. The proposed cross-reference mechanism is an inference from that principle and the observed behavior. [CAST: multiple media for communication](https://udlguidelines.cast.org/action-expression/expression-communication/multiple-media/).

Implementation anchors: `appliedChallengeReviewItems`, `appliedChallengeReviewFollowups`, and `appliedChallengeReviewTarget` in `applied_challenge_source.jsx`; response serialization in `studio_response_module.js`.

## 2. Make the active task occupy more of the mobile screen

**Priority: high. Layout observations confirmed; learner benefit needs testing. Effort: small to medium.**

The start screen stacks backup actions and explanations, task identity, deliverable, reading controls, five stage buttons, progress, context, and a question suggestion before the writing field. On Check, the prompt repeats its heading verbatim in the inspected example. Lesson ideas and requirements appear below the working area on narrow screens.

Consolidate normal backup/restore controls under a clearly named work menu, while keeping save failures and the save destination visible. Shorten repeated explanatory text. Keep task context available without requiring the entire brief above every activity.

Place **Lesson ideas and requirements** within easy reach of the active field on mobile. A small expandable reference panel can preserve the learner's location and return focus to the draft. Avoid a large fixed panel that competes with the on-screen keyboard.

Align progress with the five visible stages. The current **0 of 10 sections started** describes writing activity, but uses a different unit from navigation. A stage label such as **Explore · Step 2 of 5**, with optional writing coverage inside it, would reduce that translation effort. Keep movement between stages unrestricted.

**Acceptance examples:** reach the active field and a lesson idea without searching below the stage's Continue button; preserve writing and keyboard focus when opening and closing the reference; compare time to first meaningful entry and navigation mistakes in the learner trial. Test zoom and an open mobile keyboard, not just viewport width.

W3C's supplemental cognitive-accessibility guidance emphasizes showing current location, progress, pending steps, and important choices so people can resume after distraction. It supports the direction of this proposal; it is not an additional WCAG conformance requirement. [W3C: make each step clear](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/).

Evidence: [mobile start](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/analysis-understand-390.png), [mobile Check](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/analysis-check-390.png). Implementation anchors: `renderReference`, `renderStage`, the header, and `StudioResponse.Boundary`.

## 3. Make outside evidence useful in every supported writing format

**Priority: high for capture consistency; medium for richer research support. Confirmed implementation limits. Effort: small to medium initially, larger for structured citations.**

Google-backed search is already optional, explicit, and integrated with source review. The next opportunities concern what happens around the search:

- **Keep capture available when the organizer is off.** The source-search component still renders, but its `onAddReference` callback is removed when `visualMode` is `none`. Learners can open results, but the add-reference action is absent. Offer a way to retain the selected reference alongside ordinary evidence notes, without requiring an organizer.
- **Help define the evidence gap.** Offer a short query starter based on a learner-selected question or uncertainty, editable before searching. For example: “What affects how quickly this kind of soil absorbs water?” The learner should initiate the search and control the query. Sources can inform a values discussion without deciding the learner's position.
- **Support teacher-selected starting sources.** A short set of useful reading options can help with tasks where unrestricted results are too technical or distract from the lesson. The earlier live-search sample returned technical papers alongside an explanatory page; that small sample is evidence of variability, not a general ranking evaluation.
- **Separate citations from explanations over time.** Titles, URLs, retrieval dates, and learner notes currently share a 2200-character field. This requires heuristics to distinguish a citation from reasoning. Structured references would preserve the full learner note and distinguish publication dates from retrieval dates. A learner's source-review note should remain distinct from verification of a claim.

The current source search also shares the runtime-AI availability gate. If classroom policy should permit research while disabling AI coaching, introduce an explicit search capability/policy rather than inheriting that decision accidentally. Preserve teacher restrictions and offline behavior.

**Acceptance examples:** capture the same reference with and without the organizer; retain existing writing; preserve references through backup/export; do not count citation metadata as explanation; never run a search merely because a learner opens Explore.

Implementation anchors: `renderStage`'s Explore branch, `AppliedChallengeSourceSearch`, `appliedChallengeAttachReference`, and `appliedChallengeEvidenceHasNotes`.

## 4. Make teacher setup describe the resulting classroom task

**Priority: medium. Controls confirmed; setup confusion is a hypothesis. Effort: medium.**

The panel exposes challenge match, AI role, starting support, organizer, depth, and instructions. Available time and materials sit inside a disclosure. These settings serve different purposes, but their combined effect is not summarized before generation. One long selected option is also visually clipped in the narrow setup preview.

Lead with the lesson idea and available time, then show a short editable task summary: what learners will produce, how much support is available, and whether this session involves planning a check or carrying it out. Reuse the existing Quick application / Full challenge / Extended project settings. Put less frequently changed controls in customization rather than adding another layer of presets.

Explain question ownership separately from starting support in ordinary classroom language. For example, “Learners choose their question; thinking prompts are available.” Show the selected behavior outside long dropdown options.

**Acceptance example:** a teacher can accurately describe the intended product, support, and checking activity before generating; a 20-minute planning activity does not appear to require completed experimental findings. Compare setup time and task-feasibility corrections with the current panel.

Evidence: [teacher setup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/analysis-setup-390.png). Implementation anchor: `AppliedChallengePanel` and the existing task-quality review.

## 5. Make expression choices and language support easier to discover

**Priority: medium. Current workflow confirmed; specific learner barriers need observation. Effort: small for wording, larger for media integration.**

The Build step foregrounds a text response. Sketches, models, and recordings are supported through a link and written explanation inside a disclosure. This is useful, but learners must arrange an external artifact and accessible link. The AI only sees the supplied explanation.

Offer a clear choice near the start of Build: write here or explain work made elsewhere. For the latter, allow a concise location marker such as a slide, diagram label, or recording timestamp. Pair this with the review cross-references in recommendation 1.

Before adding an APS-specific recorder or drawing surface, audit the application's shared expression tools and storage/submission paths. Reuse a suitable shared capability if available. This review has not established that those capabilities are absent elsewhere in the app.

Offer brief explanations for terms such as claim, assumption, tradeoff, and criterion at their point of use. Remove repeated instructions first. Test wording with the intended ages and languages rather than assuming grade-aware generation makes the interface language appropriate.

CAST recommends associating unfamiliar vocabulary and symbols with explanations or alternate representations. That supports targeted language help; it does not prescribe a particular glossary UI. [CAST: clarify vocabulary, symbols, and language structures](https://udlguidelines.cast.org/representation/language-symbols/vocabulary-symbols-structure/).

## 6. Use the next validation pass to decide what to build after these fixes

**Priority: high, alongside the first changes. Evidence gap confirmed.**

The existing browser checks establish useful interaction properties. They do not establish the quality of generated tasks, the accuracy of feedback, or whether learners can use the tool independently.

The recorded live-AI evaluation remains blocked, with no model calls completed. Its five task-generation cases and five feedback cases should be run when a configured provider is accessible. Review whether feedback recognizes reasoning across formats, accepts an honest untested plan, addresses important later evidence rows, and identifies one useful action without writing the learner's answer.

Then use the already prepared 4–6 learner trial. Add the single-response coverage case and organizer-off source capture. Observe whether learners can start, consult the lesson, revise, and distinguish saving, downloading, and submitting. Inspect the actual host handoff during that trial; this component preview cannot establish the complete submission experience.

Also ask a teacher to review several completed responses. Measure how easily they find the main reasoning, uncertainties, checks, and revision. Use that evidence before adding a new teacher dashboard or more review controls.

CAST's guidance emphasizes specific, usable feedback tied to progress toward the learning goal. Use that as a human-review criterion for the live outputs, not as evidence that the current AI feedback meets it. [CAST: action-oriented feedback](https://udlguidelines.cast.org/engagement/effort-persistence/feedback/).

Existing plans: [learner trial](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/LEARNER-TRIAL.md), [search and AI evaluation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/SEARCH-AND-EVALUATION.md).

## Suggested sequence

1. Shorten the mobile opening and give lesson references a nearby entry point; make source capture work with the organizer off.
2. Add learner-controlled references to existing reasoning, with reliable save/restore/export behavior.
3. Run the learner trial and live-AI evaluation; use the observed friction to refine teacher setup and expression support.
4. Introduce structured citations and teacher-selected research paths if the evidence workflow remains a substantial source of effort.

A later extension could offer a short second situation with less support, asking which lesson idea transfers and where it stops applying. The present transfer field records a reflection; it does not demonstrate successful application in a new task. Trial this separately before making it part of the default workload.

Automatic decorative images, more AI coaching buttons, and additional completion requirements have lower priority than these changes. A visual is most useful here when it helps compare options, show a system, or communicate learner reasoning. The existing organizer is a sensible starting point.
