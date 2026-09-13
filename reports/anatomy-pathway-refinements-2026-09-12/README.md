# Anatomy pathway refinements

This pass improves the four existing physiological pathways: blood, air, food, and a withdrawal reflex. Changes are present in the active web source and its identical desktop mirror.

## Scientific accuracy

- **Digestive route:** rectal passage now selects the large intestine instead of the bladder. The text distinguishes defecation from urinary elimination and explains that the marker represents the larger organ. Gastric acid unfolds proteins and supports pepsin activation; pepsin starts protein digestion. Updated intestinal copy explains absorption, bile, bicarbonate, and microbial fermentation without fixed transit times or tennis-court surface-area comparisons. Sources: [OpenStax: stomach](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-4-the-stomach), [small and large intestines](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-5-the-small-and-large-intestines), and [urine transport](https://openstax.org/books/anatomy-and-physiology-2e/pages/25-2-gross-anatomy-of-urine-transport).
- **Withdrawal reflex:** the hand example uses sensory fibers in the median nerve, cervical spinal circuits, and motor output through the brachial plexus and musculocutaneous nerve to biceps. It previously mixed hand withdrawal with sciatic and femoral nerves. The explanation distinguishes nerves from neurons and allows concurrent ascending information and spinal withdrawal. Sources: [UAMS: upper-limb nerves](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/nerve-tables/nerves-of-the-upper-limb/), [Texas Tech: hand anatomy](https://anatomy.elpaso.ttuhsc.edu/schemes/hand_tables.html), and [OpenStax: motor responses](https://openstax.org/books/anatomy-and-physiology-2e/pages/14-3-motor-responses).
- **Blood flow:** the right-atrium step selects the heart instead of the superior vena cava. Chamber, pulmonary-vein, and tissue-exchange steps explain the scope of their landmarks. The left-heart description includes filling through the mitral valve. The heart legend labels oxygen content as O₂−/O₂+ instead of equating vein/artery initials with oxygenation. Source: [OpenStax: heart anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy).
- **Breathing:** air passes between vocal folds; airway protection involves coordinated closure. Quiet exhalation follows inspiratory-muscle relaxation and elastic recoil, with airflow driven by pressure differences. The diaphragm marker is identified as a breathing muscle. Sources: [OpenStax: respiratory structures](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system) and [breathing mechanics](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing).
- **Related muscle correction:** gluteus maximus weakness is associated with impaired forceful hip extension. Trendelenburg gait is attributed to hip-abductor dysfunction, particularly gluteus medius and minimus. Source: [Cleveland Clinic: Trendelenburg gait](https://my.clevelandclinic.org/health/diseases/trendelenburg-gait).

## Learning and navigation

Eight authored concept questions replace marker-generated pathway recaps. Each pathway has two questions and each choice has explanatory feedback. Incorrect answers identify the correct explanation and offer a direct return to the relevant step and diagram. Questions cover vessel direction, pulmonary venous return, gas exchange, quiet expiration, fecal elimination, intestinal surface area, hand sensation, and spinal withdrawal.

Answers lock after submission. Scores remain separate from structure confidence and recall counts. Only a fully answered check updates the displayed latest score. Finishing without completing checks preserves an earlier completed score and does not fabricate a new one. Legacy marker-based answers are ignored by the new versioned recap. Route-completion badges remain separate from concept-check performance.

A native step selector supports direct review. Marker recovery now checks the selected structure as well as system and view. Phone layouts place pathway instruction before the diagram. “Show marker on diagram” and “Return to pathway step” move focus between them. Read-aloud text includes the marker explanation. Controls have visible focus and at least 44-pixel height; step selectors use 16-pixel text. The pathway panel, progress indicator, questions, and feedback have explicit dark-theme colors.

All **124 new strings** have French, Latin American Spanish, and Arabic translations in both distributions, including orientation and progress labels.

## Verification

- **662/662 tests passed across 39 anatomy test files**, including 24 new tests covering both distributions. Tests cover corrected landmarks, direct navigation, wrong-answer feedback, scoring, legacy and malformed state, duplicate submissions, skipped checks, and confidence separation.
- Browser checks traversed all **31 steps** and completed both questions in all four pathways. Keyboard checks exercised answer submission, step selection, diagram return, and revisiting a missed concept.
- The sampled 1280-, 390-, and 320-pixel layouts had no horizontal page overflow. French, Spanish, Arabic, and Arabic dark-theme screens were checked.
- **12 scoped axe scans reported zero violations and zero incomplete results** across pathway recaps, phone feedback, dark-theme steps, and the dark-theme chooser. These are scoped automated checks, not whole-application accessibility certification. No browser JavaScript errors were recorded.
- The full suite preceded the final two orientation translation keys; syntax, translation parity, and browser checks were then rerun. The English labels and behavior did not change.
- Syntax passed; the web source and desktop mirror match byte for byte. All new translations and interpolation placeholders were validated across six catalogs.

Final source SHA-256: `0b95227acb5a7e057c2f4daea4f819c7c952e6f095e5398dbe1ba865dba0cdea`.

## Evidence and limits

[Full test results](final-tests.json) · [Final browser results](final-browser-results.json) · [Source and localization validation](validation-summary.json)

[Phone concept feedback](phone-320-feedback.png) · [Digestive step](desktop-digestive-step.png) · [Arabic dark-theme nerve step](phone-arabic-dark-path_nerve-step.png)

The diagrams remain teaching schematics. Several steps deliberately use whole-organ or regional markers; their captions identify that limitation. Concept scores are local activity state and are not added to the portable study-record format. The questions and translations have automated and editorial checks, but have not undergone learner-cohort evaluation or independent specialist review. This pass verifies the changed content, not every existing claim in the anatomy catalog.
