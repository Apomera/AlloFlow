# Anatomy clinical-case refinements

September 12, 2026. This pass revises all eight advanced clinical cases in the active Anatomy tool and its desktop public copy.

## What changed

The cases now ask learners to connect clues with anatomy and identify uncertainty. A short vignette no longer supplies enough information to confidently label a tendon tear, lymphoma subtype, cartilage injury, or harmless cardiac rhythm.

Each case supports this sequence:

1. Read or listen to the presentation and question.
2. Write an optional reasoning draft: relevant structure or mechanism, supporting clue, and remaining uncertainty.
3. Use a hint if needed.
4. Compare with the explanation and its limits, with a link to the source.
5. Explicitly mark the explanation reviewed. This records participation and does not award diagnostic correctness or structure mastery.
6. Hide the explanation for another attempt, or visit the related diagram and return to the case.

Drafts are limited to 600 characters and stay associated with individual cases in the activity state. Hiding answers preserves drafts and review progress. Case actions read the latest state, preserve other cases, and reject stale review actions after hiding an answer, closing cases, or switching systems. Existing reviewed-case flags and valid legacy reveal state remain readable.

## Scientific revisions and sources

| Case | Main correction | Source |
| --- | --- | --- |
| Runner’s knee | A symptom pattern supports examining the patellofemoral region; it does not prove cartilage injury or abnormal tracking. Articular cartilage lacks pain-sensing nerves. | [AAOS: Patellofemoral pain](https://www.orthoinfo.org/diseases--conditions/patellofemoral-pain-syndrome/) |
| Shoulder pain | Rotator-cuff symptoms do not establish a tear. The explanation distinguishes pain-limited movement from demonstrated weakness. | [AAOS: Rotator cuff tears](https://www.orthoinfo.org/diseases--conditions/rotator-cuff-tears) |
| Exercise and heart rate | The vignette now concerns supervised normal physiology. It distinguishes intrinsic SA-node activity from autonomic and hormonal modulation. | [OpenStax: Cardiac electrical activity](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-2-cardiac-muscle-and-electrical-activity), [cardiac physiology](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology) |
| Hand tingling | The median sensory territory includes the palmar thumb, index, middle, and radial half of the ring finger. The pattern does not prove a compression site or typing as the cause. | [AAOS: Carpal tunnel syndrome](https://www.orthoinfo.org/diseases--conditions/carpal-tunnel-syndrome/) |
| Enlarged lymph node | Persistent enlargement with systemic symptoms warrants assessment; the story alone cannot establish Hodgkin lymphoma. | [NCI: Hodgkin lymphoma](https://www.cancer.gov/types/lymphoma/patient/adult-hodgkin-treatment-pdq) |
| Diabetes emergency | The case supplies hospital findings of hyperglycemia, ketosis, and metabolic acidosis. It explains insulin deficiency, hepatic ketone production, and respiratory compensation. | [CDC: Diabetic ketoacidosis](https://www.cdc.gov/diabetes/about/diabetic-ketoacidosis.html), [2024 consensus report](https://doi.org/10.2337/dci24-0032) |
| Clavicle fracture | Imaging confirms the fracture. The explanation covers load transfer and the clavicle’s supporting role without claiming that it lacks muscle attachments. | [AAOS: Clavicle fracture](https://www.orthoinfo.org/diseases--conditions/clavicle-fracture-broken-collarbone/) |
| High altitude | Oxygen fraction remains about 21%; lower barometric pressure reduces inspired oxygen partial pressure. The case does not identify a single “most stressed” structure. | [OpenStax: Respiratory modifications](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-6-modifications-in-respiratory-functions) |

Each diagram link explains what its marker represents. Whole-heart, rotator-cuff, islet, lymph-node, and alveolar markers do not imply a visible lesion or patient measurement.

## Interface and localization

Case cards now have semantic headings, labeled text areas, accessible disclosure state, visible keyboard focus, and controls at least 44 pixels high. Diagram navigation selects the appropriate orientation and supports keyboard return to the originating case. Dark mode and narrow layouts use the same learning sequence.

All 77 new strings are translated into French, Latin American Spanish, and Arabic in both runtime locations. This includes case content, hints, uncertainty explanations, diagram scope, instructions, controls, and review counts. Placeholder and source-fallback validation covers all six packs.

## Verification

Browser verification exercised all eight cases, including drafting, keyboard-operated hints and explanations, explicit review, hiding and reopening, read-aloud callbacks, and round-trip diagram navigation. The shoulder link selected the posterior view. Phone checks covered 390- and 320-pixel widths; localized checks covered all three languages and Arabic in dark mode.

All 25 scoped axe scans reported zero violations and zero incomplete checks. No browser page errors or horizontal overflow were recorded. Screenshots of the 320-pixel reasoning card and Arabic dark-mode explanation were inspected visually.

The active source and desktop copy are byte-identical and parse successfully. The touched-file whitespace check passed. Exact automated test totals and source hashes are recorded in the accompanying verification files.

## Scope and next opportunities

These are fictional educational cases with model explanations, not a validated diagnostic assessment. Written reasoning is retained for learner comparison and is not automatically graded. Browser tests use the existing Anatomy harness; they verify the learning interactions rather than every application persistence or deployment path. The content and translations would benefit from educator, clinician, and native-language review with learners.

A useful next pass is the remaining “fun facts” and structure-description bank: replace unsupported fixed numbers, qualify normal biological variation, and align those statements with the new case explanations.

### Automated results

- 756 tests passed across 42 anatomy test files.
- 25 axe scans: no violations or incomplete checks.
- Active source SHA-256: `41bda3c8f638c7c7b746266e16c62177fe62e1a927fdee412701b3ebb19db87a`.
- Two initial targeted tests exceeded the cold-file-access time limits; the full run used a 30-second test timeout and a 60-second hook timeout. No assertion changes were needed for those timeouts.
