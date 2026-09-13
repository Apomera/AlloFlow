# Anatomy fact and description refinements

September 12, 2026. This pass replaces the 30-item fact banner with sourced question-and-explanation cards across all 10 anatomy collections. It also revises six collection summaries and eight related structure or grade-specific descriptions.

## Learning experience

Each card starts with a short question. Learners can think first or open the explanation immediately, then hide it for another attempt. A source link appears alongside the explanation. Read-aloud includes only the question while the explanation is hidden, and both when it is visible.

Previous and next controls cycle through the three ideas in each collection. A position indicator makes the small collection visible. Browsing remembers a separate position for each collection and closes the explanation when navigating. These interactions do not award quiz correctness or structure mastery.

Controls use visible focus and a minimum height of 44 pixels. The question announces changes politely to screen readers. Layout and text alignment support small screens, dark mode, and right-to-left content.

## Scientific revisions

The old fact bank mixed useful teaching points with unsupported fixed totals and memorable comparisons that obscured mechanisms. The replacement content emphasizes the relationship between structure and function, distinguishes examples from reference values, and avoids presenting a single estimate as universal.

| Area | Revised emphasis and sources |
| --- | --- |
| Skeleton | Bone fusion during growth, living bone tissue, and the complementary properties of minerals and collagen. The adult bone count is identified as a conventional reference. [Skeletal divisions](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-1-divisions-of-the-skeletal-system), [bone structure](https://openstax.org/books/anatomy-and-physiology-2e/pages/6-3-bone-structure). |
| Muscle | Coordinated movement and stabilization replace a fixed muscles-per-step count. Isometric force and cardiac relaxation are explained. [Muscle interactions](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-1-interactions-of-skeletal-muscles-their-fascicle-arrangement-and-their-lever-systems), [muscle tension](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension), [cardiac cycle](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle). |
| Circulation | Vessel walls and exchange, cardiac output as rate × stroke volume, and red-cell replacement. The output calculation is explicitly illustrative. [Blood vessels](https://openstax.org/books/anatomy-and-physiology-2e/pages/20-1-structure-and-function-of-blood-vessels), [cardiac physiology](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology), [erythrocytes](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-3-erythrocytes). |
| Nervous system | Neurons and glia, variable conduction speed, and ATP-supported ion gradients replace fixed connectivity totals, race-car comparisons, and the brain-as-light-bulb claim. [Nervous tissue](https://openstax.org/books/anatomy-and-physiology-2e/pages/12-2-nervous-tissue), [action potentials](https://openstax.org/books/anatomy-and-physiology-2e/pages/12-4-the-action-potential). |
| Lymph and spleen | Lymph nodes monitor lymph; the spleen monitors blood and helps remove aging blood cells. Valves, movement, breathing, and vessel-wall activity support lymph return. [Lymphatic and immune anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems). |
| Internal organs | Specific liver functions, intestinal folds/villi/microvilli, and filtrate reabsorption replace fixed job counts and intestine-length analogies. [Liver and accessory organs](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder), [intestines](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-5-the-small-and-large-intestines), [kidney microanatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney). |
| Skin | Avascular epidermis, gradual renewal, and dermal collagen/elastic fibers replace a universal skin area and replacement schedule. [Skin layers](https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin). |
| Breathing | Minute ventilation is distinguished from air reaching gas-exchange surfaces. Diffusion and quiet expiration replace the lungs-as-floating-organs claim. [Breathing mechanics](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing), [gas exchange](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange). |
| Hormones | Pituitary influence has limits. Adrenal cortex and medulla, and pancreatic alpha and beta cells, are distinguished. [Pituitary and hypothalamus](https://openstax.org/books/anatomy-and-physiology-2e/pages/17-3-the-pituitary-gland-and-hypothalamus), [adrenal glands](https://openstax.org/books/anatomy-and-physiology-2e/pages/17-6-the-adrenal-glands), [endocrine pancreas](https://openstax.org/books/anatomy-and-physiology-2e/pages/17-9-the-endocrine-pancreas). |
| Reproduction | Oocyte versus follicle, sperm structures, and normally separate maternal and fetal circulations replace superlative cell-size and fixed pregnancy-output claims. [Ovarian system](https://openstax.org/books/anatomy-and-physiology-2e/pages/27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system), [testicular system](https://openstax.org/books/anatomy-and-physiology-2e/pages/27-1-anatomy-and-physiology-of-the-testicular-reproductive-system), [placental development](https://openstax.org/books/anatomy-and-physiology-2e/pages/28-2-embryonic-development). |

Related edits qualify the femur’s strength and loading, explain variable cardiac output, and replace the pituitary “master gland” shortcut in its main and younger-learner descriptions. The femur content was also checked against [lower-limb anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/8-4-bones-of-the-lower-limb).

## Localization and state

All 82 new source strings are translated into French, Latin American Spanish, and Arabic in both runtime locations. The translations include every question and explanation, six summaries, eight descriptions, and the new controls. Validation checks key coverage, source fallbacks, placeholders, and pack values.

The new versioned browsing state accepts only valid collection positions and canonical disclosure IDs. Legacy numeric positions still work, including negative wrapping. Stale controls cannot navigate a different collection or reveal a different card; repeated navigation reads the latest state and preserves other collections’ positions.

## Verification scope

Automated component tests cover all 30 ideas, sources, hidden versus revealed speech, hide/retry behavior, wrapping, independent positions, stale callbacks, and malformed saved data in both source copies. The browser harness exercises every idea with keyboard controls and checks narrow screens, translations, and Arabic dark mode. Exact final counts and hashes are recorded below and in the accompanying JSON files.

These questions support informal reasoning and recall. They do not assess written answers or establish mastery. The content review is based on published sources; classroom effectiveness and translation nuance still benefit from observation and educator review. Remaining structure-level clinical descriptions warrant their own focused pass.

## Final verification

- 784 tests passed across 43 anatomy test files.
- 40 scoped axe scans: zero violations and zero incomplete checks.
- The first full run passed 782 of 784 tests. Two tests expected the old fact-button label; their assertions now check the visible accessible name, Next idea. All four control-name tests passed on a targeted rerun, giving 784 unique passing tests across the two runs. The application source was unchanged between runs.
- All 30 ideas exercised in Chromium; no page errors.
- Source copies are identical; syntax, localization, and whitespace checks passed.
- Active source SHA-256: `fdc55db4c0f378ff4ca921f3d2d0681a78b4d2d6774e7e7008a0f075397489f1`.
