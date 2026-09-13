The product recommendations, including the follow-through features, are implemented locally. See [the completed implementation and validation](IMPLEMENTATION.md) and [classroom evaluation protocol](CLASSROOM-PILOT.md). The analysis below records the original review.

# Memory Aid resource: UI, UX, and learning design review

Reviewed September 12, 2026. Recommendation: present a usable mnemonic, a closely related visual, and a short cue-to-fact explanation as one study card. Make personalization and recall distinct activities. Keep the existing generation, response saving, accessibility, and export foundations.

This is an analysis and design proposal. Application source and runtime modules were not changed. A local current-component fixture and an interactive design concept were created for review.

## What already exists

The resource is considerably more capable than its default presentation suggests:

- Eight mnemonic types; lesson-aware selection; examples, scaffolded creation, and learner authorship.
- Automatic image generation enabled by default for example and scaffolded cards. Student-authored cards are deliberately skipped.
- Optional image upload, image editing, visual alignment checks, image descriptions, and teacher review.
- Recall with supporting material hidden, learner self-checks, private practice history, and revision goals.
- Separate learner responses, autosave and submission integration, teacher preview, translated interface strings, saved read-aloud, and worksheet/reference export paths.

The next version should organize these capabilities around the learner's task. Adding another image button would not address the central problem.

Evidence: `memory_aid_source.jsx:1926`, `memory_aid_source.jsx:2036`, `memory_aid_source.jsx:2261`; automatic visuals at `generate_dispatcher_source.jsx:7714`. The existing shared integration is documented in `docs/STUDIO_INTEGRATION_REVIEW_2026-09-04.md`.

## Main findings

| Priority | Observed behavior | Why it matters | Proposed refinement |
| --- | --- | --- | --- |
| 1 | Each card starts with a practice panel, status messages and facts; the mnemonic and picture come later. | A new learner has to work through instructions before encountering the thing meant to help them remember. | Lead with target, short mnemonic and related picture, followed immediately by the explanation. Offer recall as the next action. |
| 1 | Default generation cycles distinct targets through `generated`, `scaffolded`, `student-authored`. | A teacher requesting a memory aid gets an example, an incomplete aid, and a creation assignment. The resource combines studying content with learning to author mnemonics. | Default to complete study aids for the chosen targets. Offer a separate “Create memory aids” activity preset that preserves the current gradual-release approach. |
| 1 | Every card repeats creation fields, optional reflection, feedback controls and explanatory text. | The main activity is unclear, and even compact content produces a long page. | Show one target at a time with clear target navigation; use Study, Make it mine, and Try recall views. Provide a compact all-target reference when wanted. |
| 1 | Image generation is awaited before the resource is assembled; individual image failures are logged without a per-card failure result in the resource. | The teacher waits for optional media, then may receive a card with no clear explanation of a missing image. | Show text as soon as it is usable. Add per-card image states and retry only the missing picture. Persist the reason an image is absent. |
| 2 | The cue-to-fact mapping is one prose string. The picture appears in another section, below it and any fun fact. | A learner must mentally connect three separated representations. | Put picture and mnemonic together. Render short, explicit mappings from cue element to term/fact; keep the mappings adjacent to the relevant visual. |
| 2 | Student language includes “AI example,” “What must stay accurate,” “Visual direction,” and “Get strengths-first AI feedback.” | Process and authoring language competes with learning content. | Use “Your memory cue,” “Facts to remember,” “Describe your picture,” and “Check my connection.” Keep provenance in a compact detail. |
| 2 | Facts can be labelled teacher-verified immediately after generation when essential facts exist. | The label can imply a review action that the teacher has not actually performed. | Separate generated/ready status from an explicit “Reviewed by you” record. Preserve fast generation and existing holds; avoid introducing repetitive approval dialogs. |
| 2 | Practice retains the selected mnemonic and target title. Both can contain the fact to be recalled. | A successful supported attempt is not necessarily evidence of recall without help. | Label cue-supported practice accurately. Add a later round without the mnemonic/image, and use a question/title that does not give away the answer. |

These are design findings and source-supported behavior observations, not measured evidence of classroom learning gains or a claim that all existing controls are defective.

## Browser evidence

Rendered the current, byte-for-byte fresh runtime component using local React and Tailwind built with the project's configuration. The authored fixture used three short states-of-matter cards: example, scaffolded and student-authored. It intentionally had no images, did not call an AI provider, and did not load the entire application shell or shared studio boundary.

- At 1280px wide, the student resource was 3,993px high. Its three cards were approximately 1,086px, 1,136px and 1,506px high.
- At a 390 × 844 phone viewport, the resource was 4,847px high, about 5.7 screen heights. The first mnemonic heading began at document y=864px. The small fixture identification banner contributes roughly 50px; this is an illustrative component measurement, not a production performance metric.
- There was no horizontal overflow at those two widths. The immediate issue was vertical hierarchy and density.
- Starting recall hid the other cards and the facts, mapping and creation sections, and focus moved to the recall heading. This behavior should be retained.
- The retained target title and mnemonic were still visible. In this sample, both included part of the answer, supporting the recommendation to distinguish supported from unsupported recall.
- Teacher mode was longer still: 4,598px at 1280px wide without entering Edit, even with no actual images or AI visual checks displayed.

The fixture's body font, available shared controls, content length and application shell differ from a full deployed session. No live generated resource, provider reliability or provider timing was measured.

## Should it automatically generate an image?

Yes, where the picture makes the mnemonic easier to decode or retrieve. This already happens for two of the three cards in the usual default progression. Refine its selection, presentation and delivery instead of treating automatic images as a new capability.

Use **Visual support: Auto** as the default. Auto should choose a representation based on the cue, not simply attach a decorative illustration to every target:

| Memory task | Recommended visual support |
| --- | --- |
| A concrete keyword or memorable association | A simple, uncluttered illustration showing the actual association. |
| Ordered steps or a story chain | A small sequence diagram or short storyboard with clearly preserved order. |
| An acronym or acrostic | Prominent letters aligned with their meanings. Add a scene only when it reinforces that connection. |
| Categories or chunking | A grouped layout with labels. Avoid an unrelated generated scene. |
| A contrast or relationship | A comparison diagram with the distinguishing features made explicit. |
| A rhyme or rhythm | Clear line breaks and optional playback. Add an image only when it conveys useful meaning. |

Offer “On demand” and “Text only” as alternatives. Keep uploaded and learner-created images available. In the explicit creation activity, invite the learner's own picture idea before filling the space with a finished AI scene.

The visual must be based on the selected mnemonic AND its facts. For “solid statue,” show an object retaining shape and space; a generic illustration of matter is insufficient. Preserve one consistent style across a resource, keep labels as selectable interface text where possible, and avoid embedded AI lettering when exact spelling or notation matters. A diagram with reliable labels may serve the task better than a raster image.

After generating an image, use the existing vision check to describe the pixels and identify mismatches. Keep the image description separate from the explanation of its mnemonic meaning. A prompt or drawing plan is not a verified description of the finished picture. Handle that distinction if vision is unavailable.

Changes to the mnemonic or facts should mark the associated visual/mapping as needing another look. Keep a usable earlier image until a replacement is ready; do not silently change a learner's chosen cue during practice. Reuse the component's existing cancellation and stale-result guards for asynchronous replacements.

CAST recommends multiple representations with explicit connections between text and the accompanying representation. This supports coherent cue-and-picture design; it does not establish that every AI image improves learning. [CAST: Illustrate through multiple media](https://udlguidelines.cast.org/representation/language-symbols/multiple-media/)

### If the current resource has no pictures

Several code-supported possibilities need distinguishing before declaring generation broken:

1. The card is student-authored and is intentionally excluded from automatic images.
2. Visuals were disabled for that generation, or the resource predates image generation.
3. The image provider or Memory Aid prompt helper was unavailable, or a generation call failed. Current code can leave the card text-only without a stored per-card failure reason.
4. The cloud copy omitted the image to fit artwork storage limits. The schema already has a visual omission notice.

The reviewed build and source match. There is no evidence from this review that the user's particular resource failed for any one of these reasons.

## Recommended experience

### Teacher setup

Start with two plain-language choices: **Study and remember** (complete aids; recommended default) and **Create memory aids** (examples, scaffolds and coaching). This makes the instructional purpose explicit.

Keep the initial form small: selected lesson/topic, a short editable list of proposed targets, number of aids, and visual support. Allow a single focused target; the current generator clamps the count to three through five. Put exact aid types, authorship settings, reflection requirements and custom instructions under additional options. Keep grade, language and existing accessibility settings inherited from the lesson.

Recommend a strategy based on the selected material. Do not force a variety of mnemonic types when one approach fits all targets. Preserve the ability to override it. A short target preview lets the teacher catch an irrelevant or over-broad target before paying for images.

Keep fun facts off by default, as they are now. If included, put them under “Explore more,” after the study activity. They should not interrupt the cue-to-fact explanation or become required recall content.

### Student study view

Use a restrained surface with one accent color. The mnemonic is the strongest text; the picture sits beside it on wide screens and directly below on phones. Replace multiple colored inset panels with short sections and spacing.

For the selected target show:

1. What the learner is remembering.
2. The short mnemonic and its visual as one unit.
3. Two to five concise cue-to-fact connections, adjusted to the actual content.
4. One primary action, “Try recall,” and a secondary “Make it mine.”

Put reference playback close to the cue. Keep print/export and teacher editing in resource actions. Keep important status visible, but move repeated technical explanation and provenance into details. Private practice can initially say “Practice is private,” with accessible detail explaining storage scope when relevant.

Add keyboard-operable target navigation and preserve the selected target when returning. A compact overview can show which targets were attempted or need practice, without treating confidence or a single self-check as mastery.

### Personalization

Open a focused activity with the current cue available to keep or edit. “Use this cue” and “Make another” should be equally legitimate paths. Do not make every student write a justification just to use a provided aid.

Keep reasoning optional unless the teacher explicitly chose a reasoning activity. Preserve the current structured feedback, but present the most useful next step first. Let feedback distinguish factual accuracy, whether all needed facts are cued, and whether the association makes sense to this learner. Avoid creativity scores.

Visual authors should be able to create, upload, or describe a picture without an unnecessary written mnemonic requirement. The current feedback readiness check requires a written studentDraft even though recall can support a sufficiently described visual-only cue; align these paths.

### Recall and return practice

Retain the existing isolated practice and fact-by-fact self-check. Make the sequence explicit: retrieve, reveal, compare, choose what to revisit. Keep typed, spoken/off-screen and drawn responses viable; do not require a transcript for every attempt.

Offer a supported round and a later unsupported round. Record the support level with an attempt if progress is shown. Hide answer-bearing titles, images, mappings, read-aloud text and tooltips when the learner chooses unsupported practice.

Add a later-review entry point on return, with dates presented as adjustable study suggestions. A fixed immediate success should not automatically mean “mastered.” One short application question can check whether the learner understands the concept beyond reciting the cue.

IES recommends integrating useful graphics and verbal descriptions, spacing learning, and using active retrieval. These principles motivate the design; the prototype itself has not demonstrated a learning effect. [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)

## Generation and content improvements

- Treat a mnemonic as a short retrieval cue with explicit coverage, not a long lesson summary. Reject a catchy cue if it reverses order, omits a key distinction or introduces a misconception.
- The current prompt asks for explicit mappings, but stores one prose string. Add structured entries such as cue element, fact ID and explanation; retain legacy mapping text for old resources.
- Store visual state and reason separately: queued, generating, ready, unavailable, failed, intentionally off, and student-created. Avoid a blank space with no explanation.
- Publish usable text before visual completion. Keep the existing small generation pool, attach results to stable resource/card IDs and avoid overwriting edits while work continues.
- Replace unconditional time estimates with stage progress and a count of completed images. Use measured timing ranges only when available.
- Check mnemonic fit in the output language. Translating an English acronym literally often destroys its mapping; regenerate or use another strategy when necessary.
- Keep source support close to teacher review so a disputed fact can be checked against the actual lesson. Do not equate an AI alignment result with human review.

## Accessibility, saving and export

Preserve the shared learner-response boundary, autosave feedback, teacher preview isolation, private practice scope, and read-aloud integration. This is a presentation redesign, not a reason to rebuild those systems.

Keep text and image descriptions available with every visual; do not encode the mapping through color alone. Support keyboard operation, narrow screens, large text, translated labels, high contrast, and reduced motion. Avoid autoplay and decorative animation in the study card. Verify with real assistive technology after implementation.

Offer clearly different exports: study card/reference (cue, image, connections), recall worksheet (cue and response space), and teacher answer key. If an unsupported recall worksheet is added, omit answer-bearing cues there too. Preserve the selected cue and reviewed image across screen, print and shared copies. Where cloud artwork limits prevent preservation, make that limitation visible before sharing and provide a usable fallback.

## Suggested delivery order

1. **First pass:** lead with the mnemonic and image; move creation and reflection into their own view; simplify labels; separate ready-made study from the creation activity; make missing images explain themselves. Retain current response, practice and export behavior.
2. **Second pass:** structured mappings, content-appropriate diagram/illustration selection, partial rendering while images finish, consistent image replacement, and visual-only feedback support.
3. **Third pass:** cue fading, later-review suggestions, brief application checks, compact target progress and export presets.

Before and after the first pass, have teachers prepare the same lesson and learners study the same targets. Measure time to a usable aid, teacher corrections, discovery of the mnemonic, successful entry to recall, and delayed recall/understanding. Compare useful image support against text-only versions; do not use image counts or aesthetic ratings as evidence of memory improvement. No classroom study was run here.

## Validation completed

- `_build_memory_aid_module.js --check`: source and both runtime mirrors are byte-for-byte fresh.
- Two existing suites passed: `tests/memory_aid.test.js` and `tests/memory_aid_teacher_review_flow.test.js`; **103 tests passed**.
- Current component inspected at desktop and phone widths, with practice isolation and focus checked.
- The proposed interactive concept was exercised for study/personalization/recall, cue hiding and response self-check behavior. It illustrates the intended hierarchy; its diagram is authored for the concept and is not an AI generation result.
- Application code was not modified or deployed. Live AI providers, cloud persistence, full app navigation, print output and manual screen-reader behavior were not tested in this review.
