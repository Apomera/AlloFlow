# Anatomy breathing refinements — September 19, 2026

This pass clarifies respiratory structure and function and adds a manually controlled breathing lesson inside Explore. The canonical anatomy module and active desktop mirror contain the same changes.

## Scientific and teaching changes

- **Airflow and gas exchange:** The lesson distinguishes movement of air through the airways from diffusion of oxygen and carbon dioxide across the air–blood barrier. It explains why gas exchange can continue at the end of a quiet breath, even when there is no net airflow through an open airway.
- **Breathing muscles:** The diaphragm misconception no longer states that lungs have no muscle. Airway walls contain smooth muscle that changes airway width; the diaphragm and other breathing muscles drive chest expansion. The child-level explanation now describes a dome-shaped muscle rather than a permanently flat one.
- **Clearer structure functions:** Six entries—lungs, alveoli, diaphragm, its muscular-collection alias, pleura, and respiratory muscles—now have translated process explanations. The core descriptions avoid fixed alveolar counts, surface areas, a single pleural-pressure value, and a fixed percentage contribution from the diaphragm. Type II cells, surfactant, and macrophages remain in the older alveolar explanation.
- **Age-appropriate copy:** These structures have K–2 and grades 3–5 descriptions. The activity uses a simpler gas-exchange-location question for younger learners and a pressure-versus-diffusion question for older learners. Adult pressure details and the older question are hidden at the younger level.
- **Lung clinical context:** A sourced pneumonia explanation replaces the compressed disease list and unqualified cancer-ranking statement. It explains how affected alveoli can interfere with exchange and separates symptoms from establishing the cause. The existing clinical age gates remain in effect.
- **Shared content:** Revised function and misconception text flows through the existing Explore, comparison, card, quiz, and tutor helpers. The new lesson appears for the six relevant structure entries in Explore.

## Interaction and accessibility

The expandable lesson has three buttons: breathing in, quiet breathing out, and the end of a quiet breath. A small SVG shows lung-size and diaphragm changes and the direction of airflow. The resting state retains visible lung volume and has no airflow arrow. Text and an accessible image description communicate the same state. It is a schematic of unassisted breathing, with no timing, pace, measured volumes, or claim to represent an individual person's anatomy.

The concept check allows answer revisions and explains both processes. It does not change scores, research points, confidence ratings, or retrieval evidence. The selected phase and valid answer persist through reload; a different learning band does not inherit the prior answer. Updates use current state to preserve newer writing and ignore callbacks after leaving the selected structure or Explore.

Controls have at least 44px targets in the tested layouts. The lesson supports keyboard input, live phase descriptions, read-aloud controls, dark mode, reduced motion, narrow screens, and right-to-left text. **59 new text keys** are translated in French, Latin American Spanish, and Arabic, including the revised functions and misconceptions.

## References checked

- [NHLBI: What breathing does for the body](https://www.nhlbi.nih.gov/health/lungs/breathing-benefits): inhalation, exhalation, and gas exchange.
- [NHLBI: The respiratory system](https://www.nhlbi.nih.gov/health/lungs/respiratory-system): airways, alveoli, and pleura.
- [NHLBI: How the body controls breathing](https://www.nhlbi.nih.gov/health/lungs/body-controls-breathing): respiratory muscles.
- [NHLBI: What is pneumonia?](https://www.nhlbi.nih.gov/health/pneumonia): alveolar effects, causes, and diagnosis.
- [NHLBI: Keeping lungs healthy](https://www.nhlbi.nih.gov/health/lungs/lung-health): avoiding tobacco smoke.
- [OpenStax: Respiratory organs and structures](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system): airway smooth muscle, alveolar cells, surfactant, and the respiratory membrane.
- [OpenStax: The process of breathing](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing): alveolar versus pleural pressure and ventilation mechanics.

References were checked September 19, 2026. The changed structures' science-review dates reflect this function-content pass. Clinical notes other than the lungs were not comprehensively re-reviewed.

## Validation

**358 targeted regression checks pass across seven files. All 11 scoped accessibility scans have zero violations and zero incomplete checks.** The browser run has no page errors and retains ten screenshots. The inhalation, exhalation, dark-mode phone, and Arabic phone captures were visually inspected. Final test counts, source hashes, translation parity, and browser results are recorded in `verification.json`. Regression coverage includes the new breathing lesson plus existing misconception, comparison, tutor, scientific-content, pathway, and general anatomy tests. Browser checks exercise all three states, keyboard input, answer revision without score changes, restoration, younger grades, the diaphragm alias, and all three languages. Accessibility scans are scoped to the breathing lesson and do not certify the entire app.

The explainer is a qualitative teaching diagram, not a physiological simulation. The broad anatomy catalog still contains older descriptions and clinical content outside this pass. No commit or deployment was performed.
