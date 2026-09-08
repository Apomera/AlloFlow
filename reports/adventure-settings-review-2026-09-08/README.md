# Adventure Mode setup and settings review

Follow-up: the revised design has now been implemented while retaining both teacher and student setup. See [Implemented changes](IMPLEMENTED.md) for the final behavior and verification. The original audit follows.

Reviewed September 8, 2026. Scope: the current local Adventure launch view, teacher sidebar, assignment permissions, supporting handlers, and existing settings tests. This is a design and implementation audit; application behavior was not changed.

## Recommendation

Use one shared Adventure setup editor. Let the sidebar summarize the current configuration and open that editor. Lead with the existing learning profiles, show a small set of essential decisions, and group optional controls by the task they serve. Keep student launch and active play focused on their respective tasks.

The feature already has strong foundations: four useful learning presets, explicit decision counts, bounded episodes, separate reasoning/chance feedback, translated settings text, lesson-scoped saves, and substantially improved controls in the main launch view. The largest remaining issue is that features have accumulated in two different editors, with different groupings and different coverage.

## Findings, in priority order

### 1. Two editors make setup longer and allow their behavior to diverge

The teacher sidebar renders its own mode, difficulty, language, free-response, social, systems, peaceful-story, image, permission, and finale controls. Its Start handler opens a second, detailed setup view. The launch view repeats much of the sidebar while also adding presets, choice count, typing pace, and reading practice.

**Impact:** A teacher can finish configuring the sidebar and then encounter another screen that appears to require configuring the same adventure again. Changes to labels, permissions, or available options must be maintained in both places.

**Recommended change:** Sidebar: current profile or “Custom setup,” length, response format, language, assignment status, Edit setup, and Start/Resume. Full editor: all configuration, shared between its entry points. Opening the editor should not itself reset or abandon an active run.

Evidence: `view_sidebar_panels_source.jsx:1186`; `view_adventure_source.jsx:1192`; `adventure_handlers_source.jsx:639`.

### 2. Presets are useful, but their dependent fields are not consistently available

- Social Practice sets social mode, but the launch view does not expose the social focus field. That field lives in the sidebar. The starting prompt actually uses it, so this is meaningful configuration rather than a cosmetic omission.
- Systems Challenge enables resources and sets their mode to AI. The launch view has the resource toggle, but manual/AI selection and the resource editor live in the sidebar.
- The presets have detailed state-matching logic; changing a matching value can remove the selected indicator. There is no explicit “Guided Story — customized” state explaining the relationship to the original preset.
- Reapplying Systems Challenge changes resource mode back to AI. A teacher who has configured manual resources needs to understand that consequence.

**Recommended change:** Show the social skill immediately when Social Practice is selected. Show resource setup immediately for Systems Challenge, including its manual editor when selected. Retain preset origin and display “Customized” when its controlled values differ. Explain preset changes near the control and preserve unrelated lesson/language/guidance values, as the current implementation already intends.

Evidence: `view_adventure_source.jsx:76`; `view_sidebar_panels_source.jsx:1350`; `view_sidebar_panels_source.jsx:1380`; `adventure_handlers_source.jsx:288`.

### 3. The three launch columns group unrelated decisions together

The main setup uses Core Settings, Modifiers, and Customization. The modifiers column combines response format, typing pace, reading practice, chance, peaceful story mode, consistent characters, art style, visual quality, and conditional resources. Episode length appears above this grid, while its final-challenge controls appear in Customization.

**Impact:** “Modifiers” does not help teachers predict where a setting belongs. The long middle column makes related decisions feel disconnected, particularly when the grid becomes one column on phones.

**Recommended change:** Keep length and finale together. Put response format next to choice count, and hide the count when written responses make it irrelevant. Group learning supports separately from game rules and media. Use a single expandable level with current-value summaries, not nested accordions or a mandatory multi-step wizard.

Evidence: `view_adventure_source.jsx:135`; `view_adventure_source.jsx:1194`; `view_adventure_source.jsx:1261`; `view_adventure_source.jsx:1397`.

### 4. Several labels imply more than the controls actually change

Difficulty changes energy loss and XP; its existing explanatory text says reasoning expectations follow the lesson and success thresholds remain the same. “Hard” can therefore be mistaken for harder academic questions.

“Story” names a difficulty option and part of the Guided Story preset, while Peaceful Mode is a separate toggle. These are distinct concepts. Language also depends on another location: the adventure chooses story language, while Universal Settings determines translation language.

**Recommended change:** Use “Energy & rewards” for the difficulty control, with existing multiplier explanations. Use “Peaceful exploration” for the story toggle. Use “Student responses: Choose from suggestions / Write or dictate” for free response. Show the resolved language combination, such as “Spanish + English translation,” instead of requiring the teacher to mentally combine two settings screens. Keep “decisions” explicit; do not promise minutes without evidence.

Evidence: `view_sidebar_panels_source.jsx:1209`; `view_sidebar_panels_source.jsx:1277`; `view_adventure_source.jsx:1316`.

### 5. Student locks and accessibility differ between the editors

The launch view associates the core selects with their visible labels and uses larger controls. In the sidebar, mode, difficulty, and language each use the generic accessible name `common.selection`, with unassociated visible labels. This prevents assistive technology from identifying those controls by their visible names reliably.

The sidebar cloud-storage toggle is conditionally displayed based on the cloud permission, but it does not use `lockAllAdventureSettings` as a disabled guard. A student with cloud access allowed can therefore have this toggle remain enabled when the general lock is on. This is an implementation inconsistency; it should not be described as a verified data leak.

**Recommended change:** Centralize capability checks and accessible field components. Distinguish assignment permissions from the user's current cloud-storage preference. For locked student launch, show a readable teacher-set summary and only the adjustments that are allowed. Any intentionally exempt control should have an explicitly defined policy rather than an incidental missing guard.

Evidence: `view_sidebar_panels_source.jsx:1247`; `view_sidebar_panels_source.jsx:1265`; `view_sidebar_panels_source.jsx:1280`; `view_sidebar_panels_source.jsx:1576`; `view_project_settings_source.jsx:635`.

### 6. Finale status still mixes legacy rounds with the newer episode model

The sidebar supports finite episode lengths, but its finale status displays `turnCount / climaxMinTurns` and a mastery threshold. Its manual finale action checks `climaxMinTurns`. The main decision-progress component instead tracks completed decisions against the episode limit.

**Impact:** A six-decision episode can coexist with a finale status using the default twenty-round threshold. Even where this reflects an intentional distinction between automatic and manual finales, the UI does not make that distinction clear.

**Recommended change:** Show “Decisions completed / episode length” during finite episodes. Reveal the minimum finale round only for open-ended play with a finale enabled. Put manual finale intervention in teacher controls during active play, and clarify whether it overrides or follows normal pacing. Preserve the tested episode-ending rules.

Evidence: `view_sidebar_panels_source.jsx:1660`; `view_sidebar_panels_source.jsx:1692`; `view_sidebar_panels_source.jsx:1707`; `view_adventure_source.jsx:28`.

### 7. The setup screen inherits controls from active play

The view places the game header, XP/energy displays, log, immersive controls, auto-read, and restart before the empty-state setup. These controls make sense during a run but compete with setup before the first scene exists. The Start action is at the bottom of the complete form without a compact review summary.

**Recommended change:** Give setup a simple header with lesson context and Back/Close where appropriate. Keep Start and a concise configuration summary easy to reach. During play, prioritize the scene, response area, and decision progress; group less frequent teacher actions such as edit choices, manual finale, and restart in a labeled teacher menu. Continue making reading support easy to find.

Evidence: `view_adventure_source.jsx:978`; `view_adventure_source.jsx:1043`; `view_adventure_source.jsx:1454`.

## Proposed information architecture

| Location | Contents |
| --- | --- |
| Sidebar | Current setup summary, assignment availability, Edit setup, Start or Resume |
| Setup header | Lesson/source and grade context, current assignment status |
| Starting experience | Guided Story, Evidence Debate, Systems Challenge, Social Practice |
| Essential setup | Episode length, language, student response format, conditional choice count, final challenge |
| Mode-specific fields | Social skill; resource creation mode and manual resources |
| Learning supports | Reading practice, typing pace when writing is enabled, automatic reading |
| Story & game rules | Peaceful exploration, chance, energy and rewards |
| Visuals & audio | Art style, consistent cast, visual quality, ambience |
| Teacher guidance | Custom instructions |
| Student permissions | Student-editable options, lock policy, cloud-image permission; use the same permission state as Project Settings |
| Launch footer | Resolved configuration summary, Start; student preview as a possible follow-up feature |
| Student launch | Lesson and adventure summary, permitted adjustments, Start or Resume |
| Active play | Scene, responses, progress, accessible reading controls; separate teacher interventions |

Default optional sections to collapsed, with a summary such as “Peaceful · Chance off.” Automatically expose a mode-specific field when a selected profile needs it. Remember presentation preferences separately from saved learning configuration.

## Implementation sequence

1. Extract a shared settings model and permission helpers without changing persisted field names or defaults. Keep saved adventures and older assignments compatible.
2. Build shared setting groups; fix accessible names and the cloud-toggle lock inconsistency. Consolidate the sidebar into a summary and editor entry point.
3. Reorganize the launch view around presets, essential setup, and optional groups. Add Social Practice focus and Systems resource configuration to the same editor.
4. Separate setup, student launch, and active teacher controls. Make the semantics of starting over and editing a running adventure explicit.
5. Update the teacher guide and screenshots after the behavior settles. The current guide describes an older, smaller settings panel and does not cover the newer profiles and decision pacing sufficiently.

## Validation and limits

`audit.cjs` renders the shipped local view modules with React, real translation strings, Tailwind generated from the source, fixture state, and stubbed unrelated leaf components. It captures desktop, phone, social, systems, teacher-sidebar, and locked-student cases. `findings.json` records the final sidebar pass: control positions, names, disabled states, horizontal overflow, browser errors, and scoped axe findings. PNG files also preserve the five launch-screen cases from the preceding pass. These are component fixtures, not the complete running application or AI-generated journeys.

The first focused Vitest attempt failed before executing tests: worker startup timed out for the settings-consistency, setup-accessibility, and learning-support suites. This is an environment failure and is not evidence that those assertions failed. No passing test count is claimed from that attempt.

The interactive proposal in the conversation is a design preview. Its controls demonstrate grouping and dependent fields using illustrative lesson data. It does not launch an adventure, modify an assignment, or fully implement the permission and resource editors.

Before implementing, preserve and extend behavioral coverage for preset application, custom configurations, finite/open-ended pacing, language resolution, teacher/student permissions, manual resources, and save/resume. Verify both sidebar and full setup with keyboard navigation, screen-reader names, mobile reflow, and light/dark/high-contrast themes. Existing static markup assertions will need to be updated to test the new semantic structure rather than the old three-column group names.


## Observed rendering results

| Local fixture | Viewport width | Document height | Horizontal overflow | Scoped axe result |
| --- | ---: | ---: | --- | --- |
| Teacher launch | 1200 px | 1668 px | No | No violations in this fixture |
| Teacher launch, phone | 375 px | 2781 px | No | Scrollable-region keyboard focus |
| Locked student launch | 375 px | 2208 px | No | Contrast and scrollable-region keyboard focus |
| Social setup | 1000 px | 1685 px | No | Scrollable-region keyboard focus |
| Systems setup | 1000 px | 1760 px | No | Scrollable-region keyboard focus |
| Teacher sidebar, optional settings expanded | 380 px | 1339 px | No | Six low-contrast nodes |
| Locked student sidebar, optional settings expanded | 380 px | 1193 px | No | One low-contrast node |

These measurements describe the isolated fixtures, including their header and margins; they are not full-application viewport measurements. The first five cases were captured before a missing sidebar icon dependency stopped that fixture pass. Supplying the missing icons allowed both sidebar cases to complete. All seven completed captures had no browser errors. Automated accessibility findings warrant checking in the complete application, whose surrounding CSS and focus handling may differ.

The locked sidebar fixture directly confirmed that the cloud-storage input was enabled (`disabled: false`) with `lockAllSettings: true` and cloud permission allowed. The teacher sidebar's measured contrast ratios ranged from 2.47:1 to 4.32:1 across the six flagged nodes. The cloud-storage helper text was 3.42:1 in both sidebar cases.

`verify-proposal.cjs` passed at 375 px and 736 px in light and dark appearance, with no horizontal overflow or browser errors. It also verified profile selection, social/resource dependent fields, written-response hiding of choice count, the open-ended finale field, and the local student-summary preview. The desktop render was visually inspected. These checks validate the proposal interactions; they do not certify application accessibility.

