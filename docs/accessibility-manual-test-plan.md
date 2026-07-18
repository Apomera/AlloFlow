# Accessibility Manual Test Plan

Use this plan for release-level accessibility evidence. Automated axe and source audits are useful gates, but they do not establish WCAG conformance or replace testing with assistive technology.

## Test record

| Field | Value |
|---|---|
| Release / commit | _Required_ |
| Build URL or package | _Required_ |
| Test dates | _Required_ |
| Tester(s) | _Required_ |
| Browser and version | _Required_ |
| Operating system | _Required_ |
| Assistive technology and version | _Required_ |
| Input method | Keyboard / touch / pointer / switch or adaptive controller |
| Result key | Pass / Fail / Blocked / Not tested / Not applicable |

Record failures as issues with the exact surface, steps, expected result, actual result, severity, evidence, and retest commit. A blocked or untested result is not a pass.

## Required environment matrix

| Environment | Minimum coverage | Status | Evidence / issue |
|---|---|---|---|
| Windows + Chrome or Edge + NVDA | Representative teacher and student workflows | Not tested | |
| macOS + Safari + VoiceOver | Representative teacher and student workflows | Not tested | |
| Keyboard only, no screen reader | Every workflow below | Not tested | |
| 200% browser zoom | Every workflow below | Not tested | |
| 400% browser zoom / 320 CSS-pixel reflow | Representative complex workflows | Not tested | |
| WCAG text-spacing override | Reading, forms, dialogs, and dashboards | Not tested | |
| Forced colors / high contrast | Navigation, forms, dialogs, charts, and status | Not tested | |
| Reduced motion | Games, dialogs, progress, and generated-content transitions | Not tested | |
| Mobile screen reader and touch | Launch, student join, reading, and one activity | Not tested | |

## Representative workflow matrix

For each workflow, verify headings and landmarks, accessible names and instructions, logical focus order, visible and unobscured focus, keyboard operation, status/error announcements, dialog focus lifecycle, reflow, contrast, target size, and recovery from errors.

| Workflow | Keyboard | NVDA | VoiceOver | Zoom/reflow | Contrast/motion | Issue / evidence |
|---|---|---|---|---|---|---|
| Launch and choose a mode | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Enter source material and generate a Fullpack | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Read simplified or immersive content with voice controls | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Complete a quiz and review errors | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Start and join a Live Session | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Open a STEM tool with canvas or visualization output | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Complete one SEL activity | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Build or edit a Symbol Studio board | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Use one BehaviorLens data-entry and export workflow | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Audit, remediate, and export a document or PDF | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Use Desktop settings and a local/provider configuration | Not tested | Not tested | Not tested | Not tested | Not tested | |
| Recover from an invalid field, failed provider call, and destructive-action prompt | Not tested | Not tested | Not tested | Not tested | Not tested | |

## WCAG 2.2 focus areas

- 2.4.11 Focus Not Obscured (Minimum): sticky headers, drawers, dialogs, and on-screen keyboards do not cover the focused control.
- 2.5.7 Dragging Movements: every drag interaction has a single-pointer and keyboard alternative.
- 2.5.8 Target Size (Minimum): small controls meet the size or spacing exceptions.
- 3.2.6 Consistent Help: help mechanisms appear in a consistent relative order where applicable.
- 3.3.7 Redundant Entry: previously supplied information is populated or selectable when required again in the same process.
- 3.3.8 Accessible Authentication (Minimum): authentication does not require a cognitive-function test without an allowed alternative.

## Release decision

Summarize tested scope, unresolved failures, blocked environments, output formats evaluated, and any workflows excluded. Do not state that the product conforms to WCAG 2.2 AA unless the evidence supports every applicable success criterion across the declared scope.
