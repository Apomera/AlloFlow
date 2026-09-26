---
target: AlloFlow first-run / onboarding flow
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
target_identity: "file:/Users/hubby/AlloFlow/AlloFlowANTI.txt"
target_fingerprint: "sha256:3a470626b3acfd2c3cfcbacda1e9923efdd7e95588afe14896be6c7a031ebbe4"
target_path: /Users/hubby/AlloFlow/AlloFlowANTI.txt
timestamp: 2026-09-25T14-17-40Z
slug: alloflowanti-txt
---
Method: dual-agent (A: ab1d14b6962b67c28 · B: a543d60add1c8b19d)

Target: AlloFlow first-run and onboarding flow (Launch Pad, AlloBot coach, role modal, Guided Mode landing, Learning Tools and Educator Tools hubs), live at https://alloflow-cdn.pages.dev/app/, sources view_launch_pad_source.jsx, onboarding_coach_source.jsx, ui_modals_source.jsx, view_learning_hub_modal_source.jsx, view_educator_hub_modal_source.jsx, AlloFlowANTI.txt.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Loading tools… 143 left" never advances; "Run Analysis" gives no feedback when no AI is connected |
| 2 | Match System / Real World | 2 | "Full Platform", "Destinations", "AI Backend Settings", "Adaptive Levels, Layers, & Outputs" before any task |
| 3 | User Control and Freedom | 2 | No way back to the Launch Pad from the role modal; a student in Guided Mode cannot escape the teacher pipeline |
| 4 | Consistency and Standards | 2 | Three chooser styles in a row; two language pickers in the role modal; "Full AlloFlow" vs "Full Platform" vs "Guided Setup" |
| 5 | Error Prevention | 1 | Student can land in teacher authoring; keyless teacher finds out at step 2, silently |
| 6 | Recognition Rather Than Recall | 2 | Mode cards describe the UI, not the task; hubs rely on brand names |
| 7 | Flexibility and Efficiency | 3 | Deep links, Cmd/Ctrl+K palette, favorites, recents, example passage |
| 8 | Aesthetic and Minimalist Design | 2 | Launch Pad is clean; Guided landing shows 20 buttons and 4 live regions on step 1 |
| 9 | Error Recovery | 1 | Primary CTA no-ops with no AI; "Tap to connect an AI" no-ops |
| 10 | Help and Documentation | 2 | 36-step tour and AlloBot coach exist but neither is reachable on the first screen |
| **Total** | | **19/40** | **Needs work** |

## Design Specificity Verdict

LLM assessment: the Launch Pad is a well-built dark SaaS chooser (gradient title, RECOMMENDED pill, eyebrow labels). Nothing on it says school, class, lesson, or reading. The role modal is the first K-12 signal and it arrives after the user has already committed to a mode. The Guided workspace is authored for teachers ("DO THIS NOW", "Show me where to click", example passage). Student surfaces are generic tool grids with adult copy ("source-grounded notes", "inquiry journal"). Net: authored for an educator power user, not for a first-year teacher or a nine-year-old.

Deterministic scan: 37 findings across 4 files. 1 overused-font (Inter, view_launch_pad_source.jsx:570). 36 ai-color-palette: 21 in view_educator_hub_modal_source.jsx (indigo/purple/violet headings at 419, 436, 447, 480, 490, 532, 553, 574, 596, 608, 619, 879, 901; gradients at 443, 477, 529, 571, 593, 605, 898) and 15 in view_learning_hub_modal_source.jsx (headings at 305, 322, 363, 385, 409, 446, 456, 468, 491, 512; gradients at 406, 453, 465, 509). onboarding_coach_source.jsx clean. No false positives.

Visual overlays: not available. The built-in browser blocks localhost (net::ERR_BLOCKED_BY_CLIENT), so detect.js could not be injected. Fallback signal: CLI scan plus DOM measurements.

## Overall Impression

The pieces of a good onboarding already exist: a tour, an AI coach, a guided mode with a real "try an example" button, a role model. They are wired in the wrong order and two of them are unreachable. The single biggest opportunity: ask "who are you?" first, then show each role one screen with one thing to do.

## What's Working

1. "New here? Try it with an example passage" is a real zero-friction first action, and its DONE copy ("Source captured. Now let us find what students will struggle with.") is the best line in the flow.
2. Launch Pad accessibility plumbing is careful: per-card aria-labelledby, 44px minimums, focus-visible rings, reduced-motion guard, focus restore.
3. Guided Mode persists per device ("Saved on this device at 10:04 AM", "Resume Guided Mode") and resuming after reload restored the source.

## Priority Issues

**[P0] The AlloBot coach and the help tip are unreachable on the first screen.** The Launch Pad marks every sibling inert (view_launch_pad_source.jsx:471-476). The coach mounts as a sibling (AlloFlowANTI.txt:43997), so its launcher is inert and covered. The header "Click ? anytime for help!" tip fires at 4s and self-expires at 14s (AlloFlowANTI.txt:12349-12362) behind the pad. Fix: render OnboardingCoach inside the Launch Pad root or portal it above; gate the help-tip timer on hasSelectedMode. Command: /impeccable onboard.

**[P0] Student who picks Guided Mode then Student lands in the teacher authoring pipeline.** pickMode('guided') sets guidedMode before the role is known; executeRoleSelect('student') (AlloFlowANTI.txt:19044-19051) never clears it. Student sees "Step 1 of 26 / Plan phase complete / Continue to Understand". Fix: setGuidedMode(false) and route to the Learning Hub in the student branch, or hide Student/Parent when guidedMode is set. Command: /impeccable harden.

**[P0] Keyless web teacher hits a silent wall at first generate.** "Run Analysis" and "Needs AI setup · Tap to connect an AI" both no-op; AlloModules.AIBackendModal never registered; "Loading tools… 143 left" never advances. Every load logs 8 console errors: vendor/lz-string-1.4.4.min.js and vendor/idb-keyval-6.2.0.umd.min.js return text/html (SPA fallback). Fix: verify the deploy ships /app/vendor/*; make the Launch Pad's AI Backend loader the shared entry for every "Needs AI setup" affordance; show an inline error with retry when the module cannot load. Command: /impeccable harden.

**[P1] The first question is "which workspace?" when it should be "who are you?".** Teachers map Guided/Full/Learning/Educator onto themselves, then get asked their role anyway. Fix: first screen = Teacher / Student / Family / Specialist; Guided vs Full only for Teacher, default Guided; "I have a code from my teacher" for Student. Command: /impeccable shape.

**[P1] Guided landing shows the whole cockpit on step 1.** 20 buttons, 4 live regions, "Reading choices are loading.", Universal Settings, Based on, header. Fix: while guidedStep is 0 and no source, show only the instruction, the textarea, and the example button. Command: /impeccable distill.

**[P2] Hubs open as 16 to 22 card catalogs with brand names.** Student copy: "inspect exact supporting passages", "Lumen Study", "Text Inquiry Studio". Fix: first visit shows the 4 recommended cards large plus "Show all tools"; student copy uses task verbs. Command: /impeccable clarify.

**[P2] Tour unreachable in practice.** Only live entry is an icon inside "More information"; clicking did nothing (TourOverlay unregistered). Fix: preload TourOverlay on teacher mode; add "Show me around" text button to the step 1 banner. Command: /impeccable onboard.

## Cognitive Load

Checklist: 6 of 8 fail (single focus, one thing at a time, ≤4 options, working memory fail; chunking, hierarchy, progressive disclosure partial; grouping partial). Decision points with more than 4 visible options: Launch Pad above fold (8), role modal (7), "What would you like to build?" (8), Guided landing (20), Learning hub (14), Educator hub (14), More information header (20+). Interruptions in first session: teacher via Guided = 5 visible + 2 spent invisibly + up to 3 latent; student via Guided = 6.

## Persona Red Flags

Jordan (first-year teacher, 10 minutes): loses 8s to splash, picks Guided, picks Teacher, sees "Step 1 of 26" and 7 lesson paths. Uses example passage (good). Clicks Run Analysis, nothing. Will not find "AI Backend Settings" because it lives on the screen they already left. Ten minutes end with zero output. Universal Settings default "5th Grade" silently mis-levels a 9th-grade teacher.

4th grader on a Chromebook: told "click the green one", lands in Learning Tools with 44 buttons and a "Recommendations for: Students" dropdown that reads like admin. Told "pick Guided Mode", ends up in the teacher pipeline. Nothing read aloud by default; the TTS toggle is in the unreachable coach. No "my teacher gave me a code" on the first screen.

School psychologist (Report Writer only): Educator Tools card names Report Writer (good), but the hub lands on 5 recommended chips and Report Writer is card 16 of 22, two screens down. Behind the hub the teacher workspace opened with a PII warning, Teach Live, and a lesson source nobody asked for.

## Minor Observations

- Role modal stacks two language controls; the Launch Pad already had one. Mic is asked twice (voice disclosure, then role modal).
- Deployed copy ("Full Platform", "Choose your learning pathway", "switch modes anytime from the menu") differs from source fallbacks, and there is no menu on the Launch Pad.
- localStorage.clear() does not reset the workspace; source text returns from IndexedDB. A shared classroom Chromebook shows the last user's content to the next one.
- "Reading choices are loading." never resolved in 4 minutes.
- On mobile (375px) the Educator Tools card, voice disclosure, and coach launcher sit below the fold with no scroll cue.
- Dark mode: the Launch Pad is dark by its own styling and ignores prefers-color-scheme; the app writes allo_theme=light.
- "Teacher Grading Dashboard" is the first header button for a teacher with zero students. XP "NEXT LEVEL 0/100" shows in the teacher header on first run.
- Assessment B saw the Launch Pad dismiss itself twice in visible-tab runs. Both agents shared one browser pane (A's clicks matched B's observed state), so this is attributed to test interference, not the app.

## Questions to Consider

1. Why is the first question "which workspace?" when every downstream surface keys off role?
2. If the recommended path cannot produce anything without an AI key, should the first card for keyless visitors be "Connect your AI (2 minutes)"?
3. What would a student-first Launch Pad look like with exactly two options: "I have a code from my teacher" and "Explore on my own"?
4. Does a 26-step flow with a 9-phase counter and 7 presets still count as guided?
