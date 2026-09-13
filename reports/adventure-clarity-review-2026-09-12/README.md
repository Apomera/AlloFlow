# Adventure Mode clarity review

Update: the approved improvements and bug fixes are implemented. See [implementation notes and final screenshots](IMPLEMENTED.md). The review below records the earlier UI.

Reviewed September 12, 2026 against the current local implementation, including the September 8 setup improvements. This is a review with recommendations; application code was not edited.

The strongest improvement is to give the story and the next action a clearer hierarchy on phones. The existing profiles, grouped settings, response guidance, and episode recap provide a good foundation. A broad visual redesign is unnecessary.

## Recommended changes, in priority order

### 1. Give the scene more space on phones — high priority

At **375 × 900**, the active-play fixture allocates about **217 px** to the scrolling scene and **404 px** to the separate action panel. The header occupies much of the remaining space. At **375 × 667**, the header's own scroll limit can hide its toolbar; the initial reading area shows the notebook and scene heading before any narrative.

The scene also reserves a large image area when there is no image. That placeholder can fill the visible reading area while decisions remain prominent below it. Learners must navigate separate scrolling areas to discover the situation, read the options, and find supporting tools.

**Change:** Compact the phone header to episode progress and an expandable status area. Keep reading tools visible. Use one main reading flow for the scene and choices, or an explicitly expandable response panel with a compact “Choose your next action” control. Collapse the empty-image placeholder into a small status line. Keep image size adjustable when an image exists.

**Acceptance:** At 375 × 667 and 375 × 900, show meaningful scene text and an obvious next-action control without scrolling an unlabeled header. Verify longer scenes and the on-screen keyboard in the complete app.

Evidence: [short-phone initial view](active-short-phone-initial.png), [phone scene view](active-phone.png), `view_adventure_source.jsx:1150`, `:1375`, `:1502`, `:1954`.

### 2. Keep useful toolbar labels visible — high priority

On phones, the story summary, immersive view, and automatic reading controls become icons, while **Restart** keeps its text label. That gives an infrequent action more visual clarity than everyday reading support. Accessible names exist, but their wording includes “Narrative Ledger (AI Memory)” and “Auto-Read (DM Voice).” Those terms require knowledge unrelated to learning the lesson.

**Change:** Use short visible labels such as **Story summary**, **Reading view**, and **Auto-read: Off/On**. Group secondary controls in **More**. Distinguish **Story summary** from **Journey notebook**: one summarizes the story; the other contains the recorded scenes and decisions. Replace technical tooltip wording in the actual translation strings, not only JSX fallbacks.

Evidence: [phone toolbar](active-phone.png), `view_adventure_source.jsx:1310`, `:1320`, `:1335`; `ui_strings.js:11203`, `:11224`.

### 3. Put a clear launch action before the long form — medium priority

The locked-student screen says **Configure your journey** and displays disabled form controls. Its **Start Adventure** button begins roughly **1,503 px** down the 375 px-wide fixture; the teacher fixture's button begins at **2,001 px**. Students have to work through a configuration presentation even when their task is simply to begin.

**Change:** Lead with the lesson title, a short adventure summary, and **Start Adventure**. For fully locked students, use **Your adventure is ready** and offer **View teacher settings**. For students with permissions, prioritize editable fields and keep the remaining configuration available for review. Preserve both existing setup locations and permitted student edits. Teachers can retain the full editor with an easy-to-reach launch action.

Evidence: [locked-student setup](student-locked-phone.png), [teacher setup](teacher-phone.png), `view_adventure_settings_source.jsx:158`, `view_adventure_source.jsx:1420`, `:1427`.

### 4. Make summaries describe the selected experience — medium priority

After selecting **Social Practice**, the launch summary still reads **Standard Adventure Mode · 12 decisions · 4 suggested choices · English Only**. It omits the social focus. Separately, turning automatic reading on leaves the collapsed Learning supports summary at **Reading practice: OFF**. That label accurately describes microphone practice, but does not tell teachers that another reading support is enabled.

**Change:** Include the selected profile, relevant mode-specific goal, and final-challenge status in the launch summary. Summarize support controls independently. Resolve the translation language in the summary when that information is available.

Examples:

- **Social Practice · Resolving disagreements · 12 decisions · 4 choices · English · Final challenge on**
- **Learning supports: Auto-read on · Microphone practice off**

Evidence: [social summary state](social-summary.json), [automatic-reading state](support-summary.json), `view_adventure_settings_source.jsx:198`, `:230`.

### 5. Distinguish starting over from continuing the story — medium priority

The visible **Restart** control invokes `handleStartAdventure`, which clears the current scene and in-memory story history and opens setup. The label does not explain that transition. At an episode's end, **Start New Story (Sequel)** appears alongside **Reset to start a new journey**, even though continuing the completed chapter is available.

**Change:** Use **Continue the story** for sequels and **Start over** for a fresh run. Keep an existing run available while a new setup is being prepared, committing the reset only when the learner starts it, or provide a clear recoverable cancellation step. Replace the ending footer with guidance matching the actions actually available.

This review establishes the in-memory reset behavior; it does not establish permanent loss of saved adventures.

Evidence: [episode ending](ending-phone.png), `view_adventure_source.jsx:1365`, `:2075`; `adventure_handlers_source.jsx:639`; `ui_strings.js:10760`, `:11160`.

### 6. Match the instruction to the current stage — quick improvement

Before anyone presses Start, the launch screen says **Waiting for story...**. During play, the header says **Explore the topic. Earn XP to increase the challenge.** Neither is as useful as a direct instruction for the current task.

**Change:** Hide the waiting message until generation begins. During choice-based play, use **Read the scene, then choose what happens next.** Retain the existing mode-specific written-response guidance and the loading card that repeats the submitted decision. At completion, show continuation and export guidance.

Evidence: [locked-student setup](student-locked-phone.png), [loading state](loading-phone.png), `view_adventure_source.jsx:1276`, `:2075`; `ui_strings.js:11073`.

## Verification and limits

The review harness renders the current local view bundles with React, actual English translation strings, generated Tailwind CSS, scripted lesson state, and stubs for unrelated leaf components. It exercises teacher and locked-student setup, profile/support changes, standard and written play, debate, systems, loading, recovery, completion, and immersive presentation at desktop and phone sizes, including a dark phone case.

These are component fixtures, not a complete application session. Parent-shell scrolling, real AI generation, microphone/audio behavior, networked classroom voting, and persistent save/resume were not exercised. The setup fixtures use natural document height; active-play fixtures receive a viewport-height panel. Position measurements are fixture-specific.

All 15 rendered cases completed with zero browser errors, no document-level horizontal overflow, and zero scoped axe violations. These checks covered WCAG 2 A/AA and 2.2 AA rule tags available in the bundled checker. The captures and scoped automated accessibility checks are recorded in [findings.json](findings.json). Passing overflow and axe checks does not establish that a screen is easy to understand; the constrained reading area remains visible in the screenshots. Screenshots ending in `-initial.png` show initial active-panel positions; the unsuffixed active captures scroll the scene or recap into view first.

Reproduce with `node reports/adventure-clarity-review-2026-09-12/audit.cjs`. The harness reuses the established September 8 fixture loader. It makes no AI-service calls.

I would implement items 1–3 first, then make the summary and wording changes in the same clarity pass.