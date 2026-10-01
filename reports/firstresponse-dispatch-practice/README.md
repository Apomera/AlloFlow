# First Response Lab: emergency communication practice

## What changed

The Call module's **Practice a call** tab now includes a five-turn dispatcher rehearsal. The existing voice and text reference scripts remain available in an expandable section.

- Two fictional locations: a community-center gym and a river trail. The maps reinforce entrances, landmarks, and access details.
- Voice-call and Maine text-to-911 practice. Text practice requires the location and emergency in the opening message.
- Learners assemble a message from supplied facts. Feedback identifies missing information and unsupported claims. The exercise does not grade natural-language wording or require speech, recording, or typing personal information.
- Later turns rehearse a callback number, a new observation, and staying connected. The new observation is a scripted teaching event, not a predicted patient outcome or a consequence of taking time to answer.
- The conversation review preserves incomplete first responses, corrected messages, and example use. Completion badges describe a rehearsal; they do not certify clinical or communication competence.
- A scenario-debrief button leads into communication practice. Existing practice can be resumed after switching Call tabs; leaving or choosing a new rehearsal clears its conversation.
- Keyboard focus follows each turn, feedback uses a polite status region, and the map has equivalent text. Native radio buttons and checkboxes support keyboard selection. Layouts support small screens, text spacing, reduced motion, and forced colors.

All locations and callback numbers are fictional. The new rehearsal contains no dial or SMS links, microphone controls, or network submission. Actual emergency-contact links remain in the separate, existing **Tap to call** tab.

Root and desktop public tool copies are synchronized. The 110 new English fallback strings are registered in both existing catalogs, preserving unrelated catalog edits. Other-language translations have not been authored for these additions.

## Guidance

Communication prompts and feedback were checked against the [National 911 Program's calling FAQ](https://www.911.gov/calling-911/frequently-asked-questions/) and [Maine's text-to-911 guidance](https://www.maine.gov/maine911/using-911/tty-wireless-voip). The rehearsal states that actual dispatchers may ask questions in a different order and callers should follow their instructions.

## Validation

The focused unit suite covers both locations in both modes, incomplete messages, unsupported guesses, changed observations, callback-number confusion, example-supported practice, locked completed responses, tab continuity, reset behavior, malformed saved sessions, scenario-to-call navigation, matching deployment copies, and translation registration. The existing scenario, Call tab accessibility, and React hook-order suites also run.

The browser suite exercises keyboard correction, both locations and modes, conversation reviews, no outbound contact controls, 320px reflow, enlarged text spacing, reduced motion, and forced colors. Axe checks run on the picker, active practice, correction feedback, and review. This is automated accessibility coverage, not a manual screen-reader audit.

**28 unit checks passed. All 6 browser cases passed across the combined run and an isolated rerun.** The combined run passed the 3 new dispatcher cases and the existing desktop scenario case, then timed out during Chromium context shutdown after the phone scenario check; the browser logged a transient GPU communication failure. That phone case and the skipped final scenario case both passed in a fresh browser (2/2). No application assertions failed in the rerun.

Results: `unit-tests.log`, `browser-tests.log`, and `scenario-rerun.log`. The initial browser failure log is retained.

```powershell
npx.cmd vitest run tests/firstresponse_dispatch_practice.test.js tests/firstresponse_scenario_workshop.test.js tests/firstresponse_call_tabs_a11y.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1
npx.cmd playwright test tests/e2e/firstresponse-dispatch-practice.spec.ts --workers=1 --retries=0 --reporter=list
```

## Visual review

- [Desktop picker](picker-desktop.png)
- [Location feedback](location-feedback-desktop.png)
- [Changed observation](changing-observation-desktop.png)
- [Conversation review](conversation-review-desktop.png)
- [Phone text practice](text-practice-phone.png)
- [Phone review with text spacing](review-phone-spacing.png)
- [Forced colors on a phone](forced-colors-phone.png)

Saved locally. No deployment was performed.
