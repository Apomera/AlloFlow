# Educator manual generated-example and image-style audit

**Release examined:** AlloFlow v1.2 in signed-in Gemini Canvas
**Audit date:** August 20, 2026
**Live example:** synthetic third-grade water-cycle lesson; no student data or PII
**Screenshot index:** [current-v1.2-resources](assets/live-screenshots/current-v1.2-resources/README.md)
**Visual QA:** [file-by-file screenshot quality audit](current-v1.2-screenshot-quality-audit.md)

## Executive recommendation

Add a dedicated **Real Generated Examples Atlas** covering all 22 educator resource steps. Each entry should pair the complete left generation panel with the resulting teacher or student resource view. The current manual explains the workflows well, but educators cannot yet see, in one place, how a setting choice turns into an actual artifact or how the 22 outputs fit together as a coherent pack.

Use one continuous lesson scenario across the atlas. The water-cycle run works well because it demonstrates vocabulary, sequences, visual processes, assessment, STEAM, and standards alignment without requiring personal data. A second, shorter humanities example can later demonstrate DBQ, Interview Mode, and narrative resources more naturally.

For image style, consolidate around Universal Settings. Do not simply delete all resource-level controls. Replace implicit precedence with an explicit two-state model:

1. **Use Universal style** — the default, showing the current inherited style.
2. **Override for this resource** — reveals presets or a custom prompt only when selected.

That removes duplicate choices while preserving intentional art direction.

## What the manuals already do well

- The complete manual describes Universal Image Style as the default for Visuals, Glossary, Timeline, and Concept Sort unless a tool sets its own style.
- The modular Universal Settings chapter clearly explains that universal settings affect new generations rather than rewriting existing resources.
- The measured resource-setting coverage report tests whether grade, language, standards, interests, DOK, custom instructions, and emoji reach the real generation prompts.
- The workspace chapter explains how generated resources accumulate and can be reviewed or packaged.

## Highest-value additions

### 1. A 22-resource generated-example atlas

Every entry should use the same six-part caption pattern:

- **Teaching purpose:** why an educator would choose the resource.
- **Inherited settings:** grade, language, standard, DOK, interests, emoji, and image style in force.
- **Tool-specific choices:** only controls changed from their defaults.
- **Generated result:** what the screenshot shows.
- **Teacher verification:** what must be checked for accuracy, accessibility, and age appropriateness.
- **Next action:** refine, add to pack, assign, export, or regenerate.

This is more useful than screenshots that only label buttons. It teaches cause and effect: “these settings produced this artifact.”

### 2. Keep left panel and resource view together

The screenshot pairs should be displayed side by side on wide pages and stacked on narrow pages. Do not crop out the Universal Settings summary or resource title. Those elements establish the provenance of the generated output.

For especially dense results, add one optional detail crop below the pair. Good candidates are the standards-evidence section of Alignment, a DBQ source/evidence row, an assessment item with feedback, and the Package/Deliver destination controls.

### 3. Show one coherent pack rather than 22 unrelated demos

The current capture demonstrates the educational benefit of continuity:

- Analyze identifies the source demands.
- Glossary, Adaptation, Visual Organizer, Anchor Chart, and Lesson Images reduce access barriers.
- FAQ, Writing Scaffolds, Note-Taking, Sequence Builder, and Concept Sort provide practice structures.
- DBQ, STEAM Lab, Adventure, and Assess diversify activity and evidence types.
- Alignment, Lesson Plan, Directions, and Package/Deliver connect the artifacts to teacher planning and student delivery.

This sequence should become the narrative spine of the atlas.

### 4. Separate successful examples from troubleshooting evidence

The main atlas should show clean, completed outputs. A troubleshooting appendix should show real failure states and the recovery action. This pass produced three active failure examples plus one resolved blocked-state example:

- Text Adaptation first returned an authentication-category error, then loaded a resource shell with no adapted passage; a second retry remained on “Adapting text complexity…”.
- Word Sounds prepared all 3 manually supplied words, then advanced slowly through voice preloading and reached 10 of 57 prompts during the capture window.
- Interview Mode returned blank or missing candidates across repeated attempts, including explicit candidate instructions.
- Curriculum Audit was initially disabled without an explanation after NGSS 3-ESS2-1 was added. It later became available and produced a complete alignment report, so the older blocked-state screenshot is now diagnostic only.

These are useful documentation, but they should not replace the successful examples educators expect in the primary workflow.

### 5. Add a final delivery example

The retry now includes the real Preview, Package & Deliver route chooser and a generated Document Builder output. The manual should build on that capture and show:

- the selected resources and their order;
- teacher versus student visibility;
- preview or quest-map view;
- share/export destination choices;
- answer-key handling;
- the final confirmation state.

This is the point where educators decide whether the entire workflow is usable. It deserves one of the most detailed examples in the manual.

## Recommended content for each of the 22 entries

| # | Resource | Best real example to show | Main teaching point |
|---:|---|---|---|
| 1 | Analyze Source Material | Grounded reading-level and concept analysis | Start with evidence about the source rather than guessing the barrier. |
| 2 | Glossary & Language Selection | Ten illustrated water-cycle terms | Demonstrate tiered vocabulary, image support, and language choices. |
| 3 | Text Adaptation | Original beside third-grade adaptation | Show that access changes while the learning goal stays intact. |
| 4 | Word Sounds | Finished decoding/blending activity | Explain audio provider choice, preload time, and student controls. |
| 5 | Visual Organizer | Evaporation versus condensation Venn diagram | Match organizer form to the relationship being taught. |
| 6 | Anchor Charts | Water-cycle process chart | Show a reusable classroom reference rather than decorative art. |
| 7 | Visual Support | Two-panel evaporation/condensation sequence | Connect image style, layout, and no-text settings to the generated prompt. |
| 8 | FAQ Generator | Five common student questions | Model concise clarification and misconception prevention. |
| 9 | Writing Scaffolds | Sentence starters plus rubric | Show support for composing evidence-based explanations. |
| 10 | Note-Taking Templates | Cornell notes | Demonstrate how structure changes without changing source content. |
| 11 | Brainstorm Activity Ideas | Seven varied activities | Show breadth, then explain how to select rather than use all suggestions. |
| 12 | Interview Mode | Working candidate selection and first exchange | Clarify candidate generation, educator review, and role boundaries. |
| 13 | Sequence Builder | Seven-step visual water-cycle sequence | Show ordering logic and the cost/time of generated visuals. |
| 14 | Concept Sort | Fourteen visual cards | Demonstrate categories, card-image behavior, and teacher review of ambiguous items. |
| 15 | DBQ | Three-document water-cycle evidence packet | Show source framing, evidence prompts, and citation verification. |
| 16 | STEAM Lab | Water Cycle interactive activity | Teach search, launch, student sharing, and the difference between a lab and a generated document. |
| 17 | Adventure Mode | Opening scene with choices | Explain the two-stage launch, art direction, and educator preview. |
| 18 | Assess | Five-question exit ticket plus reflection | Show purpose-first assessment settings and item review. |
| 19 | Standards & UDL Alignment | Completed six-dimension curriculum audit | Make the distinction between AI-supported alignment evidence and official certification explicit. |
| 20 | Lesson Plan | UDL lesson plan built from pack resources | Demonstrate how generated resources are orchestrated into instruction. |
| 21 | Assignment Directions & Goals | Teacher draft and student quest-map view | Show the change from teacher planning language to student-facing directions. |
| 22 | Preview, Package & Deliver | Final ordered pack and delivery controls | Close the loop from source to student access, export, and answer-key handling. |

## Image-style duplication audit

### Current behavior confirmed in source and live UI

| Surface | Current behavior | Recommendation |
|---|---|---|
| Universal Settings | Stores `universalImageStyle`; the UI says it reaches Visuals, Glossary, Timeline, and Concept Sort unless overridden. | Keep as the lesson-wide default and show the effective value in every visual-producing resource. |
| Lesson Images / Visual Support | Displays an Art Style dropdown whose `Default` value inherits the universal style in the dispatcher. An explicit preset overrides Universal Settings. | Highest-priority deduplication. Rename `Default` to `Use Universal: …`; place presets behind **Override for this resource**. |
| Glossary | Initial image generation resolves `glossaryImageStyle || universalImageStyle`. The resource view exposes an unlabeled-in-context style text box beside Add Term. | Hide the field until **Override for Glossary images** is selected. Show inherited style as read-only status. Clarify whether the override affects only new/regenerated terms or the entire glossary. |
| Sequence Builder / Timeline | The visible panel asks whether to include visuals but does not expose a duplicate style field. Generation resolves `timelineImageStyle || universalImageStyle`. | Keep the clean panel. Remove or migrate any legacy hidden `timelineImageStyle` state if it is no longer user-reachable. |
| Concept Sort | The visible panel controls when card visuals appear, not their art style. Generation resolves `conceptSortImageStyle || universalImageStyle`. | Keep Card Visuals because it controls presence, not style. Remove or migrate legacy hidden style state if it is no longer user-reachable. |
| Assess | The panel controls whether visual MCQs are generated. With no explicit image-style override, visual assessment prompts inherit Universal Image Style. | Keep visual-mode controls; do not add another default style selector. Offer an override only in an advanced section if educators need it. |
| Word Sounds | Owns an independent `imageTheme` field and does not currently inherit `universalImageStyle`. | Do not remove yet. First initialize it from Universal Settings or add an inherit/override switch; then hide the field by default. |
| Adventure Mode | Owns domain-specific art styles and character-consistency behavior; it does not currently use the universal default. | Retain the control because it meaningfully steers a repeated-scene experience. Add `Use Universal style` as an option if visual coherence across the pack is desired. |

### Recommended state model

Use the same contract for every visual-producing resource:

```text
styleMode: "inherit" | "override"
styleValue: ""
effectiveStyle = styleMode === "override" && styleValue.trim()
  ? styleValue.trim()
  : universalImageStyle.trim()
```

Migration rules:

- blank, `Default`, or legacy `auto` values become `inherit` where semantics match;
- a saved explicit preset or custom phrase becomes `override`;
- Adventure's `auto` should remain separate until its semantics are reconciled;
- the UI should always display the effective style and the source of that value.

### Precedence language for the manual

Add this short rule to Universal Settings and every visual tool:

> Universal Image Style is the lesson default. A resource override changes only new images made in that resource. A one-image refinement changes only that image.

That statement resolves the current ambiguity among universal defaults, resource-level fields, and one-off regeneration/refinement controls.

### Test coverage to add

`docs/resource_setting_coverage.md` currently measures eight settings across 19 dispatcher resource types, but not image-style inheritance. Extend the poison-pill harness with:

- `imageStyleInherited`: a unique universal style reaches every supported image prompt;
- `imageStyleOverride`: an explicit resource style wins over the universal style;
- `imageStyleNoLeak`: a resource override does not affect a different resource;
- `imageStylePresenceOnly`: controls such as Include Visuals or Card Visuals do not silently alter style;
- Word Sounds and Adventure rows once they participate in inheritance.

## Documentation drift and gaps found

1. The modular Universal Settings chapter lists grade, language, translations, standards, interests, DOK, and emoji, but omits Image Style even though the live panel includes it.
2. The complete manual reports 142 STEAM Lab tools; the live v1.2 panel used in this audit reported 137. Replace hard-coded totals with a generated catalog count or date-stamp the number.
3. The measured resource-setting matrix has 19 dispatcher resource types, while Guided Mode presents 22 educator resource steps. The manual should explain that these counts represent different things.
4. The current manual lacks a single visual index linking each generation panel to its resulting resource view.
5. The standards workflow needs a visible reason whenever Curriculum Audit is disabled; `disabled` without a prerequisite message is not actionable documentation or usable UI.

## Capture completion and next pass

This pass produced 49 high-resolution screenshots and 19 content-complete panel/result pairs. All 22 resource panels were recaptured without the floating assistant, diagnostics badge, or transient toast blocking the controls. Three entries still need a finished result:

- Text Adaptation result;
- Word Sounds finished activity;
- Interview Mode candidate/result flow;

The next pass should replace those three incomplete flows, retain the diagnostic images for troubleshooting, and refresh the legacy result screenshots identified in the visual QA. A short capture manifest should record release URL, release version, date, viewport, synthetic source title, and Universal Settings. That makes future manual updates reproducible instead of dependent on an unrecorded session.
