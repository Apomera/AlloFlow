# Goal Setter: health and wellness planning

Date: 2026-09-12. Twenty-second SEL enhancement pass.

## What changed

Nine grade-adapted SMART plans and nine starter prompts now model practical choices, access, support and review. Each worked example includes a situation, learner choices, support options, an adaptation question and five editable SMART fields.

| Purpose | Elementary | Middle | High |
| --- | --- | --- | --- |
| Make drinking water easier to access | Ask for a usable water source and cup | Coordinate drinking and bathroom access | Address an obstacle across classes, work or travel |
| Movement that fits me | Choose a supported way to join an activity | Explore an option with variable energy and equipment access | Plan a suitable opportunity alongside responsibilities and access needs |
| Support for getting ready to rest | Choose a preparation step with adult help | Ask about workload, noise or shared-space barriers | Request a feasible change around work, caregiving or school demands |

The earlier examples prescribed fixed fluid amounts, workout quotas, exact bedtimes, consecutive-day challenges and mandatory tracking. They also assumed access to a yard, equipment, a gym or a private bedroom and made overly broad health-benefit claims. The revised examples keep individual care guidance in place and make private notes optional. They distinguish preparing for rest from controlling when sleep happens.

## Pedagogy and facilitation

The authored lesson is to choose an action within reach, identify what other people need to help with, decide what evidence would show the arrangement works, and set a time to reconsider. Evidence can be an agreed access arrangement or an identified unresolved barrier; it does not have to be a numerical bodily target. Review may lead to adaptation, more support or a pause.

Ask learners to explore a fictional example before deciding whether it fits their own lives. They can discuss, draw or think about a plan without creating a saved goal. Do not require disclosure of health details or household circumstances. A plan that reveals an access problem should lead to practical adult support rather than a lower effort score. Existing school and individual care arrangements remain relevant.

## Source checks and limits

CDC explains that [water intake recommendations vary with individual factors](https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/index.html). This supports removing the tool's universal amounts; the revised activity teaches access planning and does not calculate fluid needs.

CDC's [sleep guidance](https://www.cdc.gov/sleep/about/) distinguishes age-related needs, sleep quality and disorders, and recommends healthcare help for regular sleep problems. The examples therefore avoid treating a bedtime or falling asleep as a compliance score and include a route to further support when difficulties continue.

CDC's [physical activity and disability guidance](https://www.cdc.gov/disability-and-health/articles-documents/physical-activity-for-people-with-disability.html) discusses environmental barriers and professional advice about suitable activities. Much of that page addresses adults; adult exercise targets were not transferred into student examples. The design uses the general access principle and offers individual support when suitability is uncertain.

These sources were checked on 2026-09-12. They inform the boundaries of the authored planning examples; they do not validate this digital SEL activity or establish clinical outcomes.

## Compatibility and interface

Health examples retain `example-0`, `example-1` and `example-2` IDs so saved category/band selections still resolve. Existing goals, including old health wording, remain unchanged. Use as Template creates an independent editable copy of the five SMART fields and moves focus to the first field. Support and review instructions are included in those copied fields, rather than appearing only in the library context.

The existing one-example-at-a-time library, keyboard controls and disclosures serve all nine revised plans. New category guidance explains that this tool supports choices and planning rather than setting medical targets. Notes remain in current project state; use the hub's save/export workflow for durable storage and review private details before sharing. The other five categories' example and starter data were verified unchanged.

## Validation

- 13 focused browser workflows passed: all nine age-adapted copies, editing and serialized restoration, old health goals and library selection preservation, keyboard selection, and three phone themes.
- 581 regression checks across 16 files passed; two pre-existing skips remain.
- Three selected actual-hub workflows passed, including copying a health plan, editing it and returning to it with support/review fields preserved. The filter excluded 87 other cases.
- 597 unique tests passed in total. All 72 SEL tools passed the render smoke check.
- Three axe scans of the health library at 320px found no violations. All six light/dark/high-contrast phone captures were visually reviewed. The native select truncates long titles at narrow widths; the full selected title is shown directly below it.
- Syntax, source/public byte parity and scoped whitespace checks passed. Other categories' data matched the preceding committed version.

Evidence: `reports/sel-goals-health/validation.json`, six phone images and three axe outputs. Raw run logs are in `reports/sel-goals-health-{focused,regressions,hub,render}.log`. This is targeted validation, not full-app accessibility certification. No push or deployment was performed. The ignored generated `desktop/app-build` output was not rebuilt; an installed or packaged app needs a fresh build to receive these source changes.
