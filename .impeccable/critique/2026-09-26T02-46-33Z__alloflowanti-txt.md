---
target: AlloFlow first-run / onboarding flow
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/hubby/AlloFlow/AlloFlowANTI.txt"
target_fingerprint: "sha256:b3a6dc2eda62873350e4d43ecb032f2f06817402be418e32449e8bf37a9e488a"
target_path: /Users/hubby/AlloFlow/AlloFlowANTI.txt
timestamp: 2026-09-26T02-46-33Z
slug: alloflowanti-txt
---
Method: dual-agent (A: aacf47d6c4c8dd8f9 · B: a4addfb8c6425b4eb)

Target: AlloFlow first-run and onboarding, including the teacher's second sidebar tab (renamed "Class & Materials"). Local uncommitted build served from a local test server; keyless visitor; localhost counts as the desktop build. Third run.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Preview pane still says "Configure your settings…" after the example loads; three progress counters in Guided |
| 2 | Match System / Real World | 2 | "AI Backend Settings", "Global Context", "PII", "Class Roster Key", "pack" reach parents and children |
| 3 | User Control and Freedom | 3 | Change path, Back, Skip, Resume later, Try again, "switch anytime" |
| 4 | Consistency and Standards | 2 | Class & Materials works in Guided on desktop, disabled on phones; "Edit groups" opens "Class Roster Key" |
| 5 | Error Prevention | 3 | Join waits for 5 characters; AI gate announced before the click |
| 6 | Recognition Rather Than Recall | 2 | Coach role cards look clickable and are not; icon-only header buttons |
| 7 | Flexibility and Efficiency | 3 | Full-workspace link, "Last time", hub search, role-based recommendations |
| 8 | Aesthetic and Minimalist Design | 2 | Launch Pad calm; Guided card about 12 controls around one action |
| 9 | Error Recovery | 3 | Student recovery card is strong; undercut by a green "Welcome" toast beside it |
| 10 | Help and Documentation | 3 | Coach, help mode, "Show me where to click"; tour is 35 steps |
| **Total** | | **25/40** | **Acceptable, up from 22** |

## Design Specificity Verdict

LLM assessment: the Launch Pad and the student recovery card are specific and well made. Past the doors, every adult lands in the same dense teacher workspace; the only role signal is the header label. It reads as a strong new front door on a feature-heavy tool.

Deterministic scan: 69 findings across 11 files (ai-color-palette 38, gray-on-color 20, gradient-text 2, bounce-easing 2, border-accent-on-rounded 2, layout-transition 2, side-tab 2, overused-font 1). The tab, nav and class-groups modules are clean. Only 2 findings sit on changed lines (header help control: one false positive, one approved bounce). Most gray-on-color hits are disabled/hover variants or opposite ternary branches.

Visual overlays: injected directly on the local server. Launch Pad 26, Teacher landing 25, Class & Materials 9 (nested cards x3, skipped heading h1 to h3, 11 px text).

## Overall Impression

Front door good, rooms behind it still generic. The renamed tab explains itself when you can see it, but in Guided Mode the Guided panel stays pinned above it, so opening the tab looks like nothing happened.

## What's Working

1. Launch Pad doors: role names, one-line descriptions, "Last time" badge, a code panel that explains the next step.
2. Student join recovery card: plain title, two actions, a code to show the teacher, technical detail aimed at the teacher.
3. Keyless honesty in Guided: step-1 AI notice, "Needs AI setup" on the gated button, "Show me where to click".

## Priority Issues

**[P1] Class & Materials looks empty during Guided Mode.** On desktop the Guided panel (784 px) and a "still running" notice stay above the tab content, so Class Groups lands about 1,100 px down and the viewport does not change after the click. On phones the tab is disabled in Guided, with the reason only in a tooltip. Fix: when the tab is active, collapse the Guided panel to its one-line summary with "Back to my step"; on phones enable the tab or show the reason as visible text. Where: AlloFlowANTI.txt around the Guided banner mount and the mobile workspace tabs. Command: /impeccable layout.

**[P1] A keyless teacher never sees value.** After "Try an example passage" nothing scrolls to the passage and the preview keeps the generic empty state; step 2 is gated. Fix: show the sample passage in the preview and ship a pre-computed sample analysis for the fixed sample text, labelled "Sample result (no AI needed)". Command: /impeccable onboard.

**[P1] The desktop first-time AI modal still stacks over other first-run surfaces.** It opens behind Report Writer (Specialist) and under the 35-step tour, where the spotlight then shows the modal. Fix: remove the auto modal and rely on the inline notices at the first AI action. Desktop and localhost only. Command: /impeccable harden.

**[P1] The Family door delivers a teacher workspace.** Quick Start "Global Context / Standards / Region", then the AI modal, then "Paste curriculum text here". Fix: a Family Guided preset ("Help with my child's reading"), no Quick Start, parent copy in the materials intro. Command: /impeccable shape.

**[P2] Class groups setup is heavy.** "Edit groups" and "Set up groups" both open "Class Roster Key", which shows 11 actions before the group-name field. The materials panel uses a clock icon while the tab uses a folder; "No resources generated yet." offers no action. Fix: first-group quick form, roster tools behind "More", FolderOpen icon, empty state with a Create button. Command: /impeccable distill.

**[P2] Student failure-state noise.** A green "Welcome" toast fires with the red failure; child-facing header says "Do not input PII"; body says "Check the code" when the cause is the backend. Fix: suppress welcome toasts while the card is up, child header copy, reason-specific body. Command: /impeccable clarify.

## Persona Red Flags

First-year teacher, no AI key: does the example, sees nothing change, then meets a wall at step 2 and an AI modal with three competing "best" badges.

4th grader: codename word lists and "Load Saved File" under Join; on a failed join the kind card is buried under three toasts on a phone.

School psychologist: Report Writer in 2 clicks, but a second modal opens behind it and the hub is titled "Educator Tools".

Parent: standards, region, curriculum and "pack" before anything about their child.

## Minor Observations

- "Class & Materials" wraps to two lines in the phone tab bar.
- Launch Pad never says in plain words what AlloFlow does; "AI Backend Settings" is the first thing read on phones.
- Coach role cards are plain divs, not buttons.
- On phones the AlloBot pill covers the class-code input and Join button.
- Hub chips 40 px, favorite stars 36 px, Guided "Set up AI" 36 px, "Change" 32 px.
- Recovery card detail line is 4.76:1, just above the floor.

## Questions to Consider

1. The sample passage is fixed; why can't a keyless teacher see its finished analysis now?
2. Why does a parent answer a standards wizard before seeing one simpler sentence?
3. Should class groups live in Create, where they change what is produced?
4. If the coach's "Best if you are…" lines went onto the doors, would the pad still need the coach?
