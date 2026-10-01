# First Response Lab: connect clues to actions

First Action Sleuth now asks learners to select **both an observation and the next action**. The ten scenes cover collapse, drowning, bleeding, choking, AED use, recovery positioning, possible stroke, chest discomfort, and severe breathing difficulty.

## Learning flow

- Each scene states the helper's role, available equipment, and whether someone has already called 911. Scene safety is explicitly established before the decision.
- Learners distinguish an important observation from background information and an unsupported assumption. They then choose an action using native radio controls.
- Separate feedback checks the clue and the action. Both must be correct before continuing. Optional hints count as supported practice.
- The review preserves the first submitted pair after correction. A changed-situation prompt encourages transfer beyond the original scene; these prompts are reflective and are not separately scored.
- Learners can revisit just supported decisions, start a new mixed set, or choose an individual scene. Scene and option orders vary in mixed practice. There is no speed score.
- The practice record tracks completed practice and decisions correct on the first check without a hint. Earlier action-only records remain stored and are labeled separately. The old single-answer mastery celebration is retired.

The record describes this activity, not clinical competence. Completed records use the existing local persistence mechanism; an in-progress session survives navigation between activities but is not added to the reload-persistent snapshot.

## Guidance and wording

Clinical wording was checked against these primary sources:

- [AHA adult basic life support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support): lay-rescuer assessment, calling while starting care, and AED use.
- [Red Cross water safety](https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html): the drowning scene explicitly describes a trained adult without an immediately available phone or helper.
- [Red Cross bleeding](https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external) and [choking](https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking): immediate care with help already being called.
- [AHA/Red Cross first aid](https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines): seizure and breathing-emergency content.
- [AHA warning signs](https://www.heart.org/en/about-us/heart-attack-and-stroke-symptoms): possible stroke and heart attack.
- [Red Cross unresponsive and breathing guidance](https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person): normal breathing, injury considerations, and ongoing observation.

The revised cases remove lay-rescuer pulse checks, ambiguous slow-breathing descriptions, and claims that a correct quiz answer establishes mastery. Source links appear with each completed scene and in the decision review.

## Visuals and accessibility

The new layout uses numbered learning steps, paired clue/action panels, clear selection borders, a scene progress strip, and a review organized by decision. On phones, panels stack without horizontal scrolling. Status feedback is announced politely, and focus moves to the new scene or review heading. Radio groups support standard keyboard navigation.

Screenshots:

- [Introduction](intro-desktop.png)
- [Reasoning and feedback](reasoning-feedback-desktop.png)
- [Decision review](decision-review-desktop.png)
- [Practice record](practice-record-desktop.png)
- [Phone practice](reasoning-phone.png)
- [Phone record with enlarged text spacing](practice-record-phone-spacing.png)
- [Forced colors](forced-colors-phone.png)

## Validation

The unit tests cover all ten cases, separate clue/action errors, first-attempt preservation, hint use, locked completed answers, targeted retries, local persistence, older records, invalid sessions, navigation, source/public equality, and translation registration. Existing CPR, scenario, dispatcher, and hook-order regressions also run.

The browser tests cover keyboard operation, every case, correction and targeted retries, practice records, 320px reflow, enlarged text spacing, reduced motion, and forced colors. Axe checks cover the introduction, practice, feedback, review, and record. This is automated accessibility coverage, not a manual screen-reader audit.

**151 unit/regression checks and all 3 browser cases passed.** Commands and results are recorded in `unit-tests.log` and `browser-tests.log`.

```powershell
npx.cmd vitest run tests/firstresponse_reasoning_practice.test.js tests/firstresponse_cpr_practice.test.js tests/stem_firstresponse_hook_order.test.js tests/firstresponse_scenario_workshop.test.js tests/firstresponse_dispatch_practice.test.js --maxWorkers=1
npx.cmd playwright test tests/e2e/firstresponse-reasoning-practice.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-reasoning-practice/browser-artifacts
```

Both tool copies are synchronized. The 152 new English strings are registered in both existing catalogs. Translations into other languages have not been authored for this addition. Changes are saved locally; no deployment was performed.
