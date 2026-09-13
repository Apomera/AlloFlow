# Anatomy connections and memory-aid refinements

This pass improves all ten Connections lessons and all 17 memory aids. The changes are present in the active web tool and its identical desktop mirror.

## Scientific accuracy

Connection explanations and examples now distinguish mechanisms and avoid absolute claims:

- Gas exchange depends on diffusion across a tissue barrier, with air and blood normally separate. The neuromuscular example explicitly concerns skeletal muscle. Sources: [OpenStax: gas exchange](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange) and [skeletal muscle](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-2-skeletal-muscle).
- Breathing content distinguishes quiet exhalation through relaxation and elastic recoil from forced expiration. Airway smooth muscle adjusts airway diameter; the old claim that lungs contain no muscle is removed. Sources: [breathing mechanics](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing) and [smooth muscle](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-8-smooth-muscle).
- Reproductive regulation distinguishes hypothalamic GnRH from anterior-pituitary FSH and LH. The stress example includes CRH, ACTH, cortisol, and negative feedback without claiming that the pituitary controls all endocrine activity. Sources: [ovarian reproductive physiology](https://openstax.org/books/anatomy-and-physiology-2e/pages/27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system) and [adrenal glands](https://openstax.org/books/anatomy-and-physiology-2e/pages/17-6-the-adrenal-glands).
- Portal circulation content distinguishes the initial lymphatic route of many long-chain dietary lipids from intestinal capillary absorption of monosaccharides and amino acids. The liver example no longer implies that glycogen storage prevents every post-meal rise in glucose. Source: [digestion and absorption](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look).
- Marrow content identifies platelets as megakaryocyte fragments and allows for immune-cell maturation elsewhere. Lymph-node enlargement is possible during an immune response, rather than inevitable after every cut. Sources: [blood-cell production](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-2-production-of-the-formed-elements) and [lymphatic anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems).

Memory aids now use explicit letter or number cues, with explanations of sequence, scope, and exceptions. Corrections include the two carpal rows and their direction; six cranial bone types versus eight bones; erector spinae versus trapezius; thick-skin restriction of the lucidum layer; bronchioles in the air route; serosa versus adventitia; and variability in leukocyte proportions. The incorrect erector-spinae association with the trapezius marker is removed. Sources: [wrist bones](https://openstax.org/books/anatomy-and-physiology-2e/pages/8-2-bones-of-the-upper-limb), [back muscles](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back), [skin layers](https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin), [digestive-wall layers](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-1-overview-of-the-digestive-system), and [leukocytes](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-4-leukocytes-and-platelets).

Each lesson and memory explanation has a source link. The liver segmentation aid distinguishes functional segments from surface lobes and links to the radiologist-authored [Radiology Assistant explanation](https://radiologyassistant.nl/abdomen/liver/segmental-anatomy). The complete [content and source index](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-connections-refinements-2026-09-12/content.json) records all changed explanations and questions.

## Learning and interaction

Ten authored application questions replace the old partner-system identification exercise. Questions cover diffusion distance, receptor blockade, joint torque, hormone origin, lymph obstruction, negative feedback, quiet expiration, sensory processing, lipid absorption, and platelet formation. Learners can consult the lesson text while answering. Feedback explains the mechanism and identifies the best answer. Explored topics, answered questions, and correct answers are counted separately.

Concept answers use their own versioned state. Legacy system-name answers and malformed saved choices cannot score the new questions. Duplicate responses cannot overwrite an accepted answer, and updates preserve newer answers to other questions. Stale handlers are ignored after changing the connection or leaving the mode. These checks do not change structure confidence or retrieval counts.

Connections retain expandable, labeled sections and gain a native topic selector. Selecting a topic moves focus to its lesson. Showing a connected diagram preserves the open lesson and its answer; a return button restores lesson focus. Phone layouts put the lesson before the diagram and avoid the former nested scrolling region.

All 17 memory aids can be revealed, hidden, and recalled again. Hiding an explanation preserves the record that it has been viewed. Invalid saved visibility flags are ignored. Read-aloud speaks the current connection explanation or revealed memory explanation. Letter cues are identified as using English anatomical names; their explanations are localized.

All **112 new and revised strings** have French, Latin American Spanish, and Arabic translations in both distributions. Controls use visible focus and at least 44-pixel heights. The final dark-theme review strengthened memory-heading contrast and replaced decorative text arrows with CSS chevrons.

## Verification

- **730/730 tests passed across 41 anatomy test files**, including 32 new tests covering both distributions. Tests verify authored question behavior, explanatory feedback, legacy and malformed state, duplicate and stale answers, diagram continuity, all 17 memory aids, and repeated reveal/hide without losing progress.
- Browser verification exercised all ten questions with incorrect and correct answers, all 17 memory aids, read-aloud text, keyboard interaction, diagram navigation, and return focus.
- The sampled 1280-, 390-, and 320-pixel layouts had no horizontal page overflow. French, Spanish, Arabic, and Arabic dark-theme states were checked visually and programmatically.
- **27 scoped axe scans reported zero violations and zero incomplete results.** No browser JavaScript errors were recorded. These scans cover the changed learning panels, not the whole application.
- Source syntax, English fallback consistency, translation key and placeholder coverage, and six language catalogs passed validation. The web source and desktop mirror match byte for byte. Git whitespace checks passed for the changed tracked files.

Final source SHA-256: `aaa29472cca2c7f72a7b0a0989a6504db21d22d2481bca4cffd43fa5297d948f`.

[Full test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-connections-refinements-2026-09-12/full-tests.json) · [Browser evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-connections-refinements-2026-09-12/browser-results.json) · [Source and translation validation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-connections-refinements-2026-09-12/validation-summary.json)

[Phone connection feedback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-connections-refinements-2026-09-12/phone-320-portal-feedback.png) · [Arabic dark-theme memory aid](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-connections-refinements-2026-09-12/phone-arabic-dark-memory.png)

The diagrams remain teaching schematics. These open-book questions provide practice and feedback; they have not been validated as measures of mastery. Connection answers remain local activity state and are not added to the portable study-record format. Content and translations have editorial and automated checks, but have not undergone independent specialist, linguistic, or learner-cohort evaluation. This pass does not certify every claim in the other existing modes.
