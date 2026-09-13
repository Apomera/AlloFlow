**Anatomy follow-up review: assessment, relationships, and imaging — September 12, 2026**

The most important new finding is a disagreement between the quiz answer and the diagram: a correctly answered Clavicle question places its green checkmark on the mandible. This pass also found opportunities to improve keyboard continuity, assessment quality, clinical explanations, relationship maps, and the imaging activity.

Application code was not changed. This report extends the [previous refinement review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/README.md); its age-gating, EEG, contrast, glossary, tutor-context, and sleep-lesson findings remain open.

| Priority | Finding | Evidence strength | Recommended next step |
| --- | --- | --- | --- |
| P1 | Quiz feedback can mark the wrong structure | Browser reproduction and recorded drawing coordinates | Use the displayed question's structure for every answer cue |
| P1 | MRI explanations need more precise wording | Visible lesson text checked against FDA guidance | Correct radiation wording and explain device-specific screening |
| P2 | Next Question loses keyboard focus | Real keyboard sequence | Focus and announce the new question |
| P2 | Quiz sequence and progress weaken assessment | Six predictable binary answers; counter wraps | Persist varied questions and clarify the session structure |
| P2 | Quiz feedback drops reviewed clinical context | Browser reproduction plus all 13 sourced notes inventoried | Reuse the full clinical explanation and source |
| P2 | Relationship maps follow the collection, not the selected organ | Three organs receive the same process link | Author direct structure-to-process relationships |
| P2 | Scan input can create unintended annotations and lose cursor position | Real Enter and pointer input | Make challenge and annotation states explicit |
| P2 | A retained quiz callback can overwrite newer learning records | Deliberate lifecycle probe | Validate current state before accepting an answer |

P1 identifies the next accuracy fixes; P2 identifies subsequent usability, pedagogy, and reliability work. The proposed teaching changes have not been tested with learners.

**1. Make the quiz's text and diagram agree.**

In Skeletal / Anterior / Full detail, the visible pool contains 19 structures. At saved quiz index 20, the question asks for the horizontal strut connecting scapula and sternum. Choosing Clavicle is correctly scored and explained, but the green checkmark appears at the mandible.

The question selector includes a lap offset, while the canvas feedback selector omits it. Recorded drawing coordinates place the checkmark at logical position `(180, 52)`, matching the mandible. The clavicle's anchor is `(144, 80.6)`. The index was seeded to reproduce a later round directly; this was not the first question in a new session.

Use the already-selected quiz structure as the single answer identity for the prompt, score, diagram, narration, and study link. Verify agreement on both correct and incorrect responses in the first and later laps, after confidence reordering, and after restoring a saved question. [Question selector](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:5945), [canvas selector](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:9408), [diagram screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/quiz-later-lap-diagram.png), and [answer screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/quiz-later-lap-feedback.png).

**2. Refine the MRI explanation without changing the lesson's useful comparison.**

“Same slice, three ways” currently describes MRI T1 as using “No radiation.” The skull-fracture feedback says MRI “is unsafe until metal is ruled out.” Both statements need qualification. MRI uses radiofrequency energy and does not use **ionizing** radiation. Device compatibility is assessed through screening and the device's MR safety information; MR Conditional devices can be used under their specified conditions. [FDA: MRI benefits and risks](https://www.fda.gov/radiation-emitting-products/mri-magnetic-resonance-imaging/benefits-and-risks), [FDA: information before an MRI exam](https://www.fda.gov/radiation-emitting-products/mri-magnetic-resonance-imaging/what-patients-should-know-having-mri-exam).

Revise the T1 caption to say “No ionizing radiation.” Explain that MRI requires safety screening for implants, devices, and other hazards; avoid teaching that any metal automatically precludes MRI. Keep the comparison focused on what information each modality provides, with a prompt such as “Which scan best fits this teaching scenario?” Add the supporting source beside the explanation and update the corresponding translations.

Verify the visible captions and revealed question feedback, rather than only the main imaging introduction. [Modality descriptions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:15206), [fracture explanation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:15217), and [screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/modality-explanations.png).

**3. Preserve keyboard continuity after Next Question.**

Reproduction: focus the quiz, answer with a number key, focus Next Question, and press Enter. The Next button disappears and focus falls to the document body. Pressing `1` then leaves the attempt count unchanged because the quiz's key handler no longer receives the event. This is a real keyboard flow, not a synthetic callback test.

Move focus to the new question panel or heading after Next and Restart, and announce the new question's position and prompt. Include a read-aloud prompt control consistent with the refined Spotter. Verify the entire sequence across multiple questions without pointer input, including a wrong-answer review detour and return. [Next handler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14068). The exact active-element and attempt-count evidence is saved in `keyboard` in the [browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/browser-results.json).

**4. Make quiz sequencing and progress support meaningful practice.**

The binary questions alternate deterministically: True/Fact, False/Myth, True/Fact, and so on. At indices 1, 5, 9, 13, 17, and 21, selecting that sequence produced six correct answers without using the question content. This affects the binary question type; it does not establish that every quiz question is answerable without anatomical knowledge.

The progress display also wraps from “Question 19/19” to “Question 1/19” while retaining the cumulative score and attempts. No round summary appears. Continuous practice can be useful, but this presentation gives no clear stopping point or explanation of what the fraction represents.

Choose and persist each binary statement's truth value when creating the question, keeping it stable during review and reload. Offer a short practice round with a recap, or explicitly label continuous practice and show cumulative attempts separately. A recap could identify concepts to revisit and offer a new application question after study. Use those transfer responses to evaluate the teaching change; a longer streak alone would not demonstrate better understanding. [Binary selection](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:5996), [progress display](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:13979), and [counter-wrap screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/quiz-cycle-wrap.png).

**5. Preserve the reviewed clinical explanation in quiz feedback.**

This extends the previous source-propagation finding to Quiz. All 13 structures with the newer direct clinical references are shortened by the quiz's 140-character feedback formatter. The generic feedback renderer does not include their clinical reference or reasoning prompt.

The kidneys reproduction shows the effect clearly: the stored note explains why dialysis decisions use several factors and why one low filtration estimate is insufficient. Quiz feedback retains only the opening sentence about filtration, fluid balance, electrolytes, and acid-base regulation. It contains no source link. The preceding “Clinical Challenge” is a masked version of that same generic sentence, with Kidneys and Adrenal Glands as its two options.

Use an authored question stem with a stated learning objective, and reuse the reviewed clinical-note component for feedback. Preserve qualifications and sources, with expandable detail where needed. Do not rely on clipping expository paragraphs to create a clinical reasoning task. Verify the 13 reviewed notes in Explore, Cards, Quiz, and narration together. [Question renderer](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14014), [feedback clipping](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14066), [content inventory](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/content-results.json), and [kidney feedback screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/kidney-quiz-feedback.png).

**6. Prioritize relationships that involve the selected organ.**

Selecting Kidneys, Liver, and Thyroid in the Organ Systems collection produces the same sole process link: “Portal Circulation and Nutrient Processing.” The displayed scientific system memberships correctly change to Urinary, Digestive, and Endocrine. The process selection, however, depends only on the navigation collection.

The existing caption now explains that some links concern the wider collection. That caveat helps, but the heading and selected-structure diagram still frame the result as a map of the chosen organ. This is a pedagogical relevance issue, not evidence that the caption explicitly states the kidneys belong to hepatic portal circulation.

Add structure IDs and relationship types to the connection records. Show direct relationships first, label broader collection links separately, and allow an honest empty state when no direct link has been authored. A selected organ's map should answer “How does this organ participate?” before presenting neighboring topics. Verify the three reproduced organs and shared-organ entries. [Selection logic](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:5500), [map renderer](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:11553), and [kidney map](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/kidney-relationship-map.png).

**7. Keep scan answers separate from annotation actions.**

Two ordinary input sequences expose problems in Imaging. First, start “Spot it on the scan,” focus the scan, and press Enter. The answer is recorded. Press Enter again while its feedback remains active: an Observation pin is added to the log, although the challenge has not ended. The score is not duplicated; the unintended change is to the observation log.

Second, click the scan away from its center in Pin mode. The pin is stored near normalized position `(0.267, 0.342)`, but the saved keyboard cursor remains at `(0.5, 0.5)`. The click handler first saves the cursor and then places the pin; the latter update rebuilds the imaging state from the earlier snapshot, losing the cursor update. Switching from pointer to keyboard therefore resumes at a different location.

Represent answering, reviewing, and annotating as explicit states. During challenge feedback, repeated canvas input should have a defined review behavior and should not create annotations. Commit cursor and annotation changes together from current state. Verify pointer-to-keyboard handoff, repeated Enter, double-click, ruler placement, and End challenge. [Placement dispatcher](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:15462), [click handler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:15481), and [state update helper](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:15197). The `imaging` and `cursor` records in the browser results preserve the before/after state.

**8. Reject answers from an obsolete quiz render.**

A deliberate lifecycle probe retained an answer callback, switched to Explore, and installed newer Femur recall evidence and confidence. Invoking the old callback recorded a Skull answer and replaced those newer Femur records. The callback uses values captured during its original render and does not validate the current activity or question before updating the shared maps.

This establishes a missing state guard. It does not establish that an ordinary user interaction currently delivers that retained callback; treat it as a robustness follow-up. The existing protection against invoking the same callback twice does not cover this case.

Use a functional update that validates the active quiz and question identity against the latest state, and derive recall/confidence changes from that state. Reject obsolete callbacks without sounds or announcements. Verify that navigation, Restart, a newer answer, and unrelated updated study records are preserved. This would bring Quiz closer to the protections already added to Spotter. [Answer handler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:6050); evidence is under `retainedAnswer` in the browser results.

**Verification and recommended sequence.** The browser audit completed with zero page errors and saved seven screenshots. It exercised the later-lap marker, six binary rounds, a counter wrap, keyboard continuation, a kidney clinical question, three relationship maps, scan answer/annotation behavior, cursor persistence, modality feedback, and the retained-callback probe. The clinical inventory checked all 13 directly sourced notes. The anatomy file and desktop mirror remain identical, with SHA-256 `1e6e7959dc78f014589afed116727368ed41a7afbfd816e3c8ee43260c72b125`, unchanged from the previous validated implementation pass. Its 846 passing tests remain the baseline; the full regression suite was not rerun for this read-only audit.

Start with the diagram identity mismatch and the science corrections already identified across EEG and MRI. Then make quiz submission and navigation consistent, including focus and current-state validation. Follow with clinical feedback reuse, explicit scan interaction states, and the authored relationship/assessment improvements. The audit scripts are [browser.cjs](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/browser.cjs) and [content.cjs](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-assessment-review-2026-09-12/content.cjs).
