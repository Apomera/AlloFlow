# Adventure Mode refinement review — September 12, 2026

Completed a further refinement pass across Guided Story, Evidence Debate, Systems Lab, and Social Practice. Changes are implemented locally, with rebuilt browser and desktop bundles.

## Improvements

| Mode | Result |
| --- | --- |
| All modes | Profile cards explain each activity's purpose. Launch and sidebar settings explain the selected interaction mode. Profile controls respect in-progress work. |
| Guided Story | Generation prompts consistently request the configured number of meaningful choices and no longer demand fixed quotas of obviously bad answers. |
| Evidence Debate | Written-response adventures retain the initial position choices, then switch to writing an argument. Standard and Reading views follow the same sequence. If a written debate has no suggested positions, the learner can state their own. A missing-position opening in choices-only mode uses the recoverable start failure. |
| Systems Lab | Resources beyond the first five can be expanded. Reading view supports long names and a scrollable inventory above the story panel. Decimal values and large budgets remain valid; percentages are bounded to 0–100. Updates match resource names despite surrounding spaces or capitalization changes. |
| Social Practice | The response prompt asks what the learner could say or do, with guidance about needs, perspectives, boundaries, and support. Generation prompts request plausible approaches and no longer mandate aggressive or passive distractors. |

## Bugs addressed

- Written debate previously lost its initial position choices during scene normalization; Reading view could also show the writing box too early.
- Systems updates could create a duplicate resource or miss a manually defined resource when the generated name changed capitalization.
- Manual starting percentages could exceed their intended bounds; numeric controls rejected otherwise valid decimal amounts.
- Resources after the first five were represented only by an inaccessible count.
- Long Reading view inventories could extend out of view, truncate names, or place their final rows behind the story panel. The last issue was discovered during screenshot inspection and reproduced with a browser hit-test before fixing the stacking order.

## Validation

- **297/297 Adventure unit tests passed across 29 files.** Includes six additional mode regression cases.
- **85 distinct Chromium browser cases verified across the full run and focused reruns.** The full run passed 82 and exposed three resource-header text-label failures. After fixing the markup, the final focused run passed all 13 affected mode/header cases, including the strengthened inventory hit-test. This is not a claim that the initial full run was entirely green.
- The inventory hit-test failed before the layering correction and passed afterward.
- Existing image lifecycle, journey, recovery, setup, writing, theme, and mobile checks remain covered. Relevant browser cases include automated accessibility checks.
- All four edited JSX sources parse; rebuilt handler, session, Adventure view, and sidebar bundles match their desktop copies. English UI string mirrors match. Targeted `git diff --check` passed.

Evidence: [unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/unit-results.json), [full browser log](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/browser.log), [final focused browser log](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/browser-final.log), [inventory reproduction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/inventory-before.log).

## Screenshots

- [Mode profile cards](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/browser-tests/adventure-visuals-profiles-and-debrief-reflow-in-light/profiles-light-1200.png)
- [Expanded Systems resources on a phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/browser-final/adventure-visuals-Systems--5ae3d--can-be-expanded-on-a-phone/systems-resources-phone.png)
- [Reading view inventory with the final resource visible](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/browser-final/adventure-visuals-Reading--18e8f-y-within-the-phone-viewport/systems-reading-inventory.png)
- [Social Practice writing guidance](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adventure-mode-refinement-2026-09-12/browser-final/adventure-visuals-Social-P-9a383-se-guidance-in-reading-view/social-true.png)

Browser fixtures use the shipped renderer with deterministic state and simulated provider responses. Some unrelated translation labels in screenshots are fixture placeholders. No paid generation, live classroom session, production deployment, or audio-provider run was performed. New guidance is supplied in English; translated copies were not authored in this pass.
