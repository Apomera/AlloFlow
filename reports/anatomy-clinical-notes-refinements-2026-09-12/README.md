# Anatomy: clinical context and reasoning

This pass revises 13 structure-level clinical notes and their presentation in Explore and revealed flashcards. It follows the fact-inquiry refinements and focuses on connecting anatomical mechanisms with careful interpretation of clinical findings.

## Learning and interface changes

- Each reviewed note includes a named clinical source and an optional **Reason it through** disclosure. The prompts ask learners to trace forces, blood supply, organ function, or the distinction between an observation and its explanation.
- Reviewed notes stay complete on revealed flashcards. Important qualifications at the end of a note are no longer lost to the old 200-character clipping limit.
- Clinical context and reasoning prompts each support read-aloud. Native disclosures support keyboard activation and reset when the selected structure changes.
- The notes use readable paragraph spacing, visible focus indicators, and 44-pixel source-link, disclosure, and read-aloud targets. Layouts were exercised at 320 and 390 pixels, including Arabic direction and dark theme.
- The existing selected learning level continues to determine age-appropriate content. Adult clinical notes and their new prompts are hidden at the K–5 level; the younger spleen explanation now describes blood-cell clearance and immune function.
- Reading or hearing a note does not award quiz credit or change self-reported confidence.
- Added 33 localized strings in French, Latin American Spanish, and Arabic, across both sets of language packs.

## Scientific revisions and sources

The sources below were checked on September 12, 2026. These revisions apply to the specified entries; they do not represent a new review of every clinical statement in the tool.

| Entry | Revised emphasis | Supporting source |
| --- | --- | --- |
| Femur | Femoral-neck injury can threaten femoral-head perfusion; fracture pattern and patient factors matter when interpreting outcomes. | [AAOS: Hip fractures](https://www.orthoinfo.org/diseases--conditions/hip-fractures/) |
| Quadriceps | Tendons transmit extension force; anterior knee pain alone does not establish a tendon rupture or a single-muscle cause. | [AAOS: Quadriceps tendon tear](https://www.orthoinfo.org/diseases--conditions/quadriceps-tendon-tear/) |
| Rotator cuff | Pain and weakness require interpretation alongside history, examination, and appropriate imaging. | [AAOS: Rotator cuff tears](https://www.orthoinfo.org/diseases--conditions/rotator-cuff-tears) |
| Aorta | Aneurysm and dissection are distinct. Decisions vary with the aortic segment, size, growth, symptoms, and patient factors. | [ACC/AHA: Aortic disease guideline](https://www.acc.org/Guidelines/Guidelines/2022/11/02/14/08/Aortic-Disease) |
| Carotid arteries | Plaque can narrow a vessel or embolize. Stenosis is not proof of a completed stroke; intervention requires more than a percentage. | [ESVS: 2023 carotid guidelines](https://esvs.org/wp-content/uploads/2023/03/ESVS-2023-Carotid-guidelines.pdf) |
| Hippocampus | Structural imaging findings require clinical interpretation. The function description now distinguishes episodic memory, spatial relationships, and interacting memory processes. | [NIA: Biomarkers and dementia diagnosis](https://www.nia.nih.gov/health/alzheimers-symptoms-and-diagnosis/how-biomarkers-help-diagnose-dementia); [OpenStax: Explicit memories](https://openstax.org/books/introduction-behavioral-neuroscience/pages/18-3-explicit-memories-episodic-and-semantic-memories) |
| Spleen | Trauma management depends on circulation, injury findings, and expertise; some stable patients receive monitoring or embolization. Injury does not automatically require splenectomy. | [WSES: 2022 consensus](https://doi.org/10.1186/s13017-022-00457-5) |
| Kidneys | Dialysis initiation uses a combined assessment of symptoms, signs, laboratory findings, kidney function, and preferences. | [KDIGO: 2024 CKD guideline, practice point 5.4.1](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf) |
| Pancreas | Tumor type, extent, resectability, and health influence prognosis; one survival percentage is not an individual forecast. | [NCI: Pancreatic cancer treatment](https://www.cancer.gov/types/pancreatic/patient/pancreatic-treatment-pdq) |
| Sweat glands | Evaporation depends on environmental conditions. Heat stroke can occur with profuse sweating as well as dry skin. | [CDC/NIOSH: Heat-related illnesses](https://www.cdc.gov/niosh/heat-stress/about/illnesses.html) |
| Testes | Torsion compromises blood supply. Urgent assessment should not be delayed or dismissed because of a fixed elapsed-time cutoff. | [AUA: Acute scrotum curriculum](https://www.auanet.org/documents/education/Acute-Scrotum.pdf) |
| Epididymis | Pain and swelling can overlap with torsion; relief with elevation alone cannot establish that blood flow is safe. | [CDC: Epididymitis](https://www.cdc.gov/std/treatment-guidelines/epididymitis.htm); [AUA: Acute scrotum](https://auau.auanet.org/sites/default/files/Lesson%2038.pdf) |
| Prostate | PSA can rise with malignant and nonmalignant conditions. Neither an elevated PSA nor an examination finding alone confirms cancer. | [NCI: PSA fact sheet](https://www.cancer.gov/types/prostate/psa-fact-sheet) |

## Review artifacts

- `content.json` and `english.json`: reviewed content and translation keys.
- `browser.cjs` and `browser-results.json`: real Chromium interactions, accessibility results, and layout measurements.
- `test-results.json`: full anatomy regression results.
- `verification.json`: final source hash, mirror equality, localization checks, and test totals.
- `phone-320-flashcards.png`: smallest-screen note with its reasoning prompt open.
- `phone-arabic-dark-expanded.png`: Arabic note and prompt in dark theme.

The browser checks are scoped to the clinical-note component. They are not a claim of accessibility conformance for the entire application. One axe contrast result at 320 pixels required review: the paragraph's background was reported as partially obscured. The diagnostic captured rendered colors and sampled text visibility; the screenshot was also inspected. The original incomplete result remains in the browser evidence.

## Final verification

- 818 tests passed across 44 anatomy test files.
- All 13 notes exercised in Explore and revealed flashcards; no browser errors.
- 35 scoped axe scans: zero violations; one incomplete contrast result independently checked at 9.90:1, with no sampled text occlusion.
- 10 screenshots; no horizontal page overflow at the tested phone widths.
- Both active source copies are identical. JavaScript syntax, all 33 localization keys, six pack copies, and placeholders passed validation.
- Active source SHA-256: `b9c2d3e64ff752970239433e3839439876f40791a25e329227e84c45b5656a42`.
