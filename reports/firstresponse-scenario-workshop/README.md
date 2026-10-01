# First Response Lab: scenario workshop

## Changes

- Seven scenarios, including **When breathing changes**: normal breathing, deterioration to gasping, AED analysis, and two AED outcome variants. Retrying this case switches the AED outcome.
- Corrective rehearsal: a learner uses feedback to revise an incomplete or unsafe decision before continuing. The original choice remains in the debrief.
- Answer positions vary across decisions and retries. Scores retain first choices; coaching cues and revisions do not earn an independent-run badge.
- A full decision trail explains each safe action, links to its source, and asks learners to explain an observation and response in speech, writing, sign, or discussion.
- Responsive case cards, contextual SVG illustrations, an observation panel, a progress strip, and readable feedback. Figures remain schematic; written observations determine the action.
- Keyboard focus moves to each new decision. Feedback uses a polite live region. The mental-health warning is an inline section with an opt-out. Legacy attempts offer a fresh run.
- Explicit scene safety, early emergency activation in choking, safe swallowing before oral carbohydrate, and normal breathing/injury conditions before recovery positioning. Corrected the conflation of texting 988 with a separate crisis service. Removed guilt-inducing mental-health feedback.

The root tool and desktop public copy match. New English fallback keys were added to both existing catalogs without replacing unrelated edits. Other-language translations for the new keys have not been authored; they use the existing English fallback.

## Guidance consulted

These sources support the new breathing/AED case and the specific clarifications above; this pass is not a clinical audit of every pre-existing lab activity.

- [AHA 2025 adult basic life support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support): recognition, gasping, prompt CPR, and emergency activation.
- [AHA cardiac arrest treatment](https://www.heart.org/en/health-topics/cardiac-arrest/emergency-treatment-of-cardiac-arrest): AED prompts and CPR.
- [Red Cross: unresponsive and breathing](https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person): assessment, recovery positioning, injury exceptions, and reassessment.
- [Red Cross: adult/child choking](https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking): emergency activation and changing care when a person becomes unresponsive.
- [Red Cross: diabetic emergencies](https://www.redcross.org/take-a-class/resources/learn-first-aid/diabetic-emergencies) and [ADA: hypoglycemia](https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose): oral carbohydrate conditions and escalation.
- [988 Lifeline](https://988lifeline.org/) and [help someone else](https://988lifeline.org/help-someone-else/): correct contact route and supportive involvement of help.

## Validation

Regression coverage includes the new scenario suite, CPR practice, 3D body practice, fixed React hook-order navigation, and the six existing tab-accessibility suites (277 checks). The browser suite has **3 end-to-end tests** covering all seven cases, both AED outcomes, correction and cue scoring, keyboard operation, warning opt-out, and first-choice retention. See `unit-tests.log` and `browser-tests.log` for the final results.

The browser suite runs axe WCAG A/AA checks on the catalog, active feedback, expanded coaching, and debrief. It also checks 320px reflow, increased text spacing, reduced motion, and forced colors. No axe violations were found on the audited surfaces. This is automated coverage, not a full manual screen-reader audit.

Commands:

```powershell
npx.cmd vitest run tests/firstresponse_scenario_workshop.test.js tests/firstresponse_cpr_practice.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1
npx.cmd playwright test tests/e2e/firstresponse-scenario-workshop.spec.ts --workers=1 --retries=0 --reporter=list
```

## Screenshots

- [Desktop case selection](catalog-desktop.png)
- [Desktop decision and correction feedback](decision-feedback-desktop.png)
- [Desktop debrief](debrief-desktop.png)
- [Phone decision](decision-phone.png)
- [Phone debrief with increased text spacing](debrief-phone-spacing.png)
- [Phone forced colors](forced-colors-phone.png)

Saved locally for review; no deployment was performed.
