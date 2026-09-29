# Practice Mode: rehearse a choice before taking it

The outing now includes an optional rehearsal panel alongside the action controls. Learners can make a prediction, preview a choice's immediate effects, and compare the result with their idea before taking the action.

1. Open **Rehearse a choice before you take it** at a station or inspected object.
2. Select an available action. Think about what will happen, discuss it, or write a short prediction.
3. Choose **Preview this choice**. A table compares the current clock, object states and travel plan with the expected immediate result.
4. Compare the preview with the prediction and decide what to check.
5. Choose **Take this action in the outing**, or continue exploring and making a plan.

The preview uses the same preparation, inventory and travel rules as an actual action. It runs in a temporary state and leaves the outing's clock, journal, objects, observations and save unchanged. Disabled actions retain their actual prerequisites. A rehearsal cannot fill an empty bottle, pack an item or complete an outing until the learner takes the action.

Rehearsal uses information available at the current decision. Future weather and bus updates appear during the actual outing. For example, rehearsing an outfit after two preparation actions shows its time cost and clothing change. Taking that action can then bring the authored forecast update, giving the learner a reason to recheck the plan.

After an update has occurred, the preview uses the latest facts, including the delayed bus's arrival. Weather swaps show their actual time cost, including a swap that does not advance the clock. An allowed departure previews the selected route's arrival and remains unfinished until the learner confirms the actual action.

Predictions are optional and are displayed as text. They are scratch work in the open page, excluded from saves, backups and story requests. The interface does not grade them. The preview clears when a prediction is edited, a station changes, another action happens or a different practice opens. Plan edits and accepted story wording do not change the simulated world, so they do not invalidate an otherwise current preview.

The panel uses native buttons, a select and a textarea. Focus moves to the preview heading when results are ready, then returns to an available action when a rehearsed choice is taken. It is available with storage or 3D disabled and is hidden when the visible actions are all unavailable or the outing is complete.

**104 tests passed across nine focused suites**, covering the outing engine, plan board, rehearsal, page interaction, optional story bridge, launcher and existing Life Skills 3D integration. New checks cover inert previews, hidden future events, current travel facts, zero-time swaps, departure prerequisites, version 1 rules, prediction text, stale previews, focus and storage/3D fallback.

Live Chromium checks at 1280 and 390 pixels confirmed that previews do not change the saved run, an actual rehearsed choice advances the outing and can trigger its forecast update, and the preview table fits both layouts. The checked phone state had no horizontal overflow and zero automated WCAG 2 A/AA or WCAG 2.1 AA axe violations. Contrast review remains manual for the canvas caption and decorative glyphs.

The companion assets and launcher have matching copies under `desktop/web-app/public`. The build companion list includes `life_skills_outing` so the normal asset build includes Practice Mode.
