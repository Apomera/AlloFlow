**Anatomy refinement review — September 12, 2026**

The next pass should focus on the brain lesson and on preserving learning support when a student changes activities or language. Six actionable opportunities remain after the recent refinements. The findings below distinguish reproduced defects from proposed teaching improvements.

This was an audit. Application code and language packs were not changed. The active anatomy file still matches its desktop mirror and the previous validated SHA-256: `1e6e7959dc78f014589afed116727368ed41a7afbfd816e3c8ee43260c72b125`.

| Priority | Opportunity | Evidence | Suggested scope |
| --- | --- | --- | --- |
| P1 | Apply learning-level rules consistently | Adult clinical text appears in first-grade brain and comparison panels | Shared content selection across display and narration |
| P1 | Correct EEG claims and clinical context | Disease equations and an unqualified brain-death claim remain | Review five wave cards and the brain clinical note |
| P1 | Fix EEG text contrast | All five wave-name labels fail the normal-text target | Accessible text colors and verified themes |
| P2 | Make vocabulary help work across languages | English matching reaches 7/10 terms; French and Arabic reach none | Semantic term IDs, translated definitions, contextual access |
| P2 | Give the tutor the reviewed lesson context | Kidney clinical explanation and KDIGO reference are omitted | Grade-aware context shared with Explore |
| P2 | Turn the sleep material into a guided lesson | Nine expanded cards contain 615 words in 11px body text | Short overview, optional detail, and a reasoning activity |

P1 means address in the next refinement pass; P2 means the following bounded improvement. These priorities reflect educational accuracy and access, rather than a production incident classification.

**1. Apply the same learning-level rules to every content surface.**

Confirmed in the browser: with a first-grade profile and Elementary learning level, selecting Brain hides the main clinical note but displays all five EEG cards and all four sleep cards. The exposed text includes ADHD, schizophrenia, drug effects, and diagnostic interpretations. With a fourth-grade profile, the main panel correctly switches to “Staying Healthy,” while the same advanced subcards remain visible. The control cases at Middle School and High School levels display the full main clinical note as expected.

A separate reproduction selects Skull, pins Femur for comparison, and uses first-grade/Elementary mode. The comparison still displays the femoral-neck fracture note. Its renderer reads the adult clinical field directly and clips it to 150 characters, without the clinical source or reasoning prompt. This bypasses both the grade rules and the fuller presentation introduced in the clinical-note pass.

Proposed refinement: use one grade-aware content selector for the main note, comparison, EEG/sleep subcards, and their spoken text. Give younger learners a short brain/sleep explanation with authored vocabulary. Keep advanced neuroscience behind an explicitly labeled detail control where appropriate. Preserve source context when clinical material is shown.

Verify with the same structure and comparison pair across all four learning bands. Check visible text and spoken text; a hidden main note must not reappear through a second panel. Code locations: [main clinical gate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14167), [brain subcards](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14187), and [comparison clinical text](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14244). Evidence: [first-grade EEG screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/k2-brain-waves.png) and [comparison screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/k2-comparison.png).

**2. Replace EEG disease equations with qualified, sourced explanations.**

The current cards use statements such as “Excessive theta in waking = ADHD,” “Reduced alpha = anxiety, insomnia,” and “Reduced gamma = schizophrenia, Alzheimer disease.” The concern is the certainty and missing interpretive context, not a claim that every association is false. For a concrete comparison, FDA's NEBA documentation describes a specific theta/beta measurement as an aid used with a completed clinical evaluation, and explicitly excludes standalone ADHD diagnosis. The current shorthand does not communicate that distinction. [FDA NEBA classification review, pp. 1–2](https://www.accessdata.fda.gov/cdrh_docs/reviews/k112711.pdf).

The main Brain clinical note also lists brain death among EEG diagnostic uses without qualification. The 2023 US AAN/AAP/CNS/SCCM consensus guideline advises against EEG as an ancillary test for brain death/death by neurologic criteria because it does not assess brainstem function. This needs a jurisdiction- and guideline-specific correction, rather than a universal statement about legal death. [Original consensus guideline, Recommendation 28, p. 14; SUNY Upstate-hosted copy](https://www.upstate.edu/medstaff/pdf/braindeath_declaration_and_organ_donation_november2025.pdf).

Proposed refinement: organize each wave card around the observation, contexts in which it may occur, and limits on interpretation. Review vague claims such as “expanded consciousness” and fixed beta sub-band-to-mental-state mappings before retaining them. Add direct references and review dates to the neuroscience content. A useful reasoning prompt would ask what additional information is needed before interpreting a wave pattern.

Verify that no band-to-disease equation remains, each clinical statement has a supporting source, and the clinical note agrees with its named guideline. Review all five cards together to keep the level of certainty consistent. [Brain data and clinical note](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:3181).

**3. Fix the EEG labels' contrast, including the gradient background.**

The wave-name labels use their bright category colors as small text on lightly tinted cards. Browser-computed colors, composited over both endpoints of the actual detail-panel gradient, give these approximate ranges:

| Label | Contrast range |
| --- | --- |
| Delta | 4.12–4.31:1 |
| Theta | 3.91–4.08:1 |
| Alpha | 2.26–2.36:1 |
| Beta | 2.01–2.10:1 |
| Gamma | 3.46–3.62:1 |

All five are below the 4.5:1 requirement for normal text. Their bold styling does not make these small labels large text under WCAG. [W3C explanation of minimum contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Eight scoped axe scans reported no automatic violations, but every scan marked contrast incomplete because it could not resolve the gradient. They must not be interpreted as clean accessibility passes. The follow-up calculation resolves this specific label issue; it is not a complete accessibility assessment of all remaining text or themes.

Proposed refinement: use darker, theme-aware text colors, preserving bright category colors for accents. Verify the frequency badges separately; they share the same color scheme but were not included in the five-label calculation. Check normal, dark, and high-contrast modes at 320px and at text zoom. [Label renderer](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14194), [calculation and assumptions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/contrast-results.json), and [mobile screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/phone-390-waves.png).

**4. Match glossary concepts by identity and offer help while reading.**

The glossary contains ten hardcoded English terms. Its Spotter renderer finds a term by searching for that English string inside the displayed structure name. The current data inventory gives this coverage:

| Language | Terms matching a structure name |
| --- | --- |
| English | 7 of 10 |
| Spanish, Latin America | 2 of 10 |
| French | 0 of 10 |
| Arabic | 0 of 10 |

Psoas Major, Nephron, and Villi match no English structure name. This describes reachability through the current automatic glossary trigger, not the presence of those concepts elsewhere in the tool. Browser reproduction with Hyoid confirms the consequence: English provides a Study Term button and reveals its definition; Spanish, French, and Arabic provide neither. The translated Hyoid feedback also retains an English function paragraph.

Proposed refinement: associate term IDs with structure IDs and relevant passages, localize labels and definitions, and make help available in Explore and Cards as well as Spotter feedback. A concise definition, example, and read-aloud control would support comprehension when the term is first encountered. Existing “studied” progress should migrate by term ID.

Verify equivalent concept availability across languages, including accented names and Arabic, and provide intentional entry points for all ten terms. Merely translating the button label will not fix the string-matching problem. [Glossary data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:3025), [matching logic](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:14576), [inventory](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/inventory.json), and [Arabic reproduction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/glossary-arabic.png).

**5. Carry reviewed clinical context into the tutor.**

Confirmed with a mocked model call: Explore shows the kidneys' revised dialysis explanation, its reasoning prompt, and the KDIGO source link. Switching to the tutor and asking why dialysis is not based on one filtration number sends the general function paragraph and two OpenStax references. It omits the clinical explanation and KDIGO reference that would directly answer that question.

The tutor already has learning-band guidance, recent conversation, and instructions about uncertainty and citations. The remaining issue is incomplete supplied context. This audit captured the prompt locally; it did not call an external model or establish that a real response would necessarily be wrong.

Proposed refinement: build tutor context from the same grade-appropriate lesson content shown in Explore, including relevant clinical references, prompts, and the active subsection. When the service is unavailable, offer the relevant authored explanation and source. Avoid copying adult clinical fields into younger learners' prompts.

Verify with representative clinical questions that the relevant authored explanation and reference reach the request, and that hidden age-inappropriate material does not. [Tutor context construction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:9809) and [captured request and displayed lesson](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/browser-results.json).

**6. Make sleep a guided pattern-reading activity.**

Measured in the browser: the five EEG cards contain 311 words and the four sleep cards contain 304. Their paragraph text is 11px. Together they occupy about 2,058px vertically at a 390px viewport and 2,503px at 320px, excluding the rest of the structure panel. Neither layout overflows horizontally. The opportunity is reading burden and instructional sequence, rather than horizontal layout breakage.

The sleep copy also needs a focused accuracy pass. It calls N1 the lightest sleep and then says “True sleep begins” at N2; Delta is labeled “Deep dreamless sleep.” Clarify the transition language and explain that dreaming can occur during non-REM sleep. Stage proportions and durations should state their population and approximate nature; sleep patterns change with age and across the night. [NICHD on sleep and dreaming](https://www.nichd.nih.gov/health/topics/sleep/conditioninfo/what-happens), [NHLBI on stages and age-related patterns](https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep).

Proposed teaching design, not yet learner-tested: begin with one short explanation and a labeled example night. Let students compare an early and late period, predict which stage is more prominent, and reveal an explanation. Provide the same information in an accessible table. Introduce EEG, eye movement, and muscle activity only as the selected learning level warrants. Move detailed clinical associations into optional, sourced sections and increase the reading text size.

Verify keyboard and read-aloud access, a reduced-motion presentation, and a short overview at phone widths. Evaluate the teaching change with a transfer question about a different example night; clicks or time spent alone would not establish improved understanding. [Sleep data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js:3189) and [320px sleep screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/phone-320-sleep.png).

**Evidence and limits.** The review inventoried 128 structures and ten glossary terms; reproduced four learning-band states, a first-grade comparison, a mocked tutor request, and Hyoid feedback in four languages; and saved eleven screenshots. Browser execution completed without page errors. Accessibility work included eight scoped axe scans and a separate calculation for five light-mode wave labels. The two dark-class probes are not a complete test of the host's theme controls. No learner study, real model-response evaluation, or exhaustive clinical review was performed.

The previous implementation pass recorded 846 passing tests. That is the unchanged-source baseline, not a suite rerun during this audit. The runnable audit scripts are [browser.cjs](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/browser.cjs), [inventory.cjs](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/inventory.cjs), and [contrast.cjs](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-next-review-2026-09-12/contrast.cjs). Browser state changes stayed in the isolated local harness. Start the next implementation pass with the age gates and EEG review, then fix the contrast in that revised presentation.
