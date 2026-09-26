---
target: AlloFlow first-run / onboarding flow
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/hubby/AlloFlow/AlloFlowANTI.txt"
target_fingerprint: "sha256:6570323a91bdc486c8453e6ec7c95f4c81d8b8afec0e930ef8596d83590072f6"
target_path: /Users/hubby/AlloFlow/AlloFlowANTI.txt
timestamp: 2026-09-25T22-27-52Z
slug: alloflowanti-txt
---
Method: dual-agent (A: a039e909952fce152 · B: a457810d3c220fdf5)

Target: AlloFlow first-run and onboarding (role-first Launch Pad, coach, Guided landing, student entry, Learning and Educator hubs). Local uncommitted build, injected over the live shell in headless Chromium; keyless visitor. Second run; baseline 19/40 on 2026-09-25 14:17.

Post-assessment defects (reported by the owner, reproduced, fixed, verified after both assessments ran):
- Version skew asked the role question twice: a newer Launch Pad module on an older app shell (the local test server's app/ folder; also any Gemini Canvas user on an older paste, since the CDN serves the current module) fell back to the old role popup. Fixed: the pad detects a shell without onChooseRole and shows the workspace chooser that shell was built for. Rendered test added and mutation-verified.
- On localhost and desktop, the dormant "first-time AI setup" prompt (revived by the pump fix) opened over the Launch Pad. Fixed: it now waits for an adult in the plain workspace, never over the pad, the Quick Start wizard, or a hub.
- Gated schools: cancelling the access-code gate from a door now returns to the doors instead of leaving the old role popup.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Loading tools... N left" runs about 30 s; failed student join shows "CONNECTED / Loading your homework" beside a sign-in error |
| 2 | Match System / Real World | 2 | "Global Context", "Tier 2 (Acad.)", raw "[allo/no-backend-configured]" shown to children |
| 3 | User Control and Freedom | 3 | Escape at codename returns to the doors; Guided has Back, Skip, Resume later; coach tour silently picks Teacher |
| 4 | Consistency and Standards | 2 | Specialist door promises Report Writer and BehaviorLens, opens on teacher recommendations under a TEACHER label |
| 5 | Error Prevention | 2 | AI requirement surfaces at Guided step 2; Run Analysis silently disabled |
| 6 | Recognition Rather Than Recall | 2 | First Guided task sits about 1,500 px below the fold behind an 8-way chooser |
| 7 | Flexibility and Efficiency | 3 | Guided vs full link, presets, hub search, "Last time" badge, class-code shortcut |
| 8 | Aesthetic and Minimalist Design | 2 | Launch Pad excellent; first workspace screen carries 4 overlays and "Step 1 of 26" |
| 9 | Error Recovery | 1 | "Use Retry below" with no Retry; disabled Generate gives no feedback |
| 10 | Help and Documentation | 3 | "Show me where to click", worked example, coach; tour is a 35-step feature catalog |
| **Total** | | **22/40** | **Acceptable, up from 19** |

## Design Specificity Verdict

LLM assessment: the front door is authored for K-12. Four plain doors, audience one-liners, a 5-character class code, private codenames, and "Do not use your real name". That specificity collapses one click later: Family and Specialist land on teacher surfaces with teacher language and teacher recommendations, and the student tool list includes "Inspect frequency and concordance".

Deterministic scan: 63 findings across 7 files (ai-color-palette 38, gray-on-color 18, gradient-text 2, bounce-easing 2, border-accent-on-rounded 2, overused-font 1). Only 2 sit on changed lines: header:1016 (near-black on yellow, false positive) and header:1027 (bounce on the new compact help tip, real). 17 of 18 gray-on-color hits are false positives (disabled/hover variants or opposite ternary branches).

Visual overlays: direct injection was blocked by Chromium's loopback check; a same-origin proxy ran the detector in-page. Launch Pad 26, Teacher landing 26, Learning Tools 18 (includes the concealed workspace behind the pad). Notable: all-caps 10 px tagline, 11 px footer, placeholder contrast 2.5:1 in hub search, "Saved to Device" pill fully occluded on the teacher landing.

## Overall Impression

The Launch Pad is now the best screen in the product, and it routes every role correctly. The rooms behind three of the four doors do not keep the door's promise yet. The single biggest opportunity is making the first screen after each door the thing the door named.

## What's Working

1. The Launch Pad: four role doors, inline Student options, code field that uppercases and waits for 5 characters, "Last time" as a hint, first focus on a door.
2. The AI setup doorway: one tap from the amber strip, leads with the no-setup Canvas option, honest about time and hardware.
3. In-flow guidance: "Show me where to click" scrolls and rings the target; DONE cards give clear status; Escape at codename is safe.

## Priority Issues

**[P1] The Specialist door breaks its promise.** It names BehaviorLens and Report Writer, but the hub opens on "Recommendations for Educators" (lesson, document, whiteboard), both named tools sit in folded sections, and the header says TEACHER. Fix: open the Educator hub with the clinician recommendation set (it already exists) and the section holding Report Writer expanded. Where: chooseLaunchRole specialist branch in AlloFlowANTI.txt, EducatorHubModal props, view_educator_hub_modal_source.jsx:351-355. Command: /impeccable harden.

**[P1] The Teacher door buries the first task.** "Step 1 of 26" and an 8-way "What would you like to build?" push the source box and the example-passage button about 1,500 px down. Fix: default to "Adapt a reading (7 steps)" with a one-line "Path: Adapt a reading · Change", and put the example button and source box first. Note: teachers may still choose a path before pasting, which tests pin as intended. Command: /impeccable distill.

**[P1] Keyless teachers learn about AI too late.** Run Analysis is silently disabled at step 2. Fix: state AI status at Guided step 1 with the doorway link, and make blocked generate buttons open the doorway instead of swallowing the click. Where: view_sidebar_panels_source.jsx AiSetupNotice and adjacent generate buttons. Command: /impeccable onboard.

**[P1] A failed student join is a dead end.** The toast says "Use Retry below" with no Retry, the pane says "CONNECTED / Loading your homework" indefinitely, and a raw error code is shown to children. Fix: an inline recovery card (Try again, Explore on my own, Tell your teacher the code) and codename copy that echoes the class code ("Join ZZZ99 as Solar Moose"). Where: joinClassSession error branch in AlloFlowANTI.txt, ui_modals_source.jsx StudentEntryModal. Command: /impeccable harden.

**[P2] The Family door lands parents in the teacher workspace.** Quick Start "Global Context", 48 controls, "Tier 2 (Acad.)". Fix: a Family first step ("What is your child reading?") showing only stories, word lists, simpler versions. Command: /impeccable shape.

**[P2] Ambient chrome on every first screen.** Loading pill about 30 s, "UNSAVED CHANGES" before any edit, help tip covering the PII note on mobile, role toast. Fix: loading pill only when a needed tool is still loading; save pill after the first edit; one tip at a time. Command: /impeccable quieter.

## Persona Red Flags

Jordan (first-year teacher, no AI key): 8 unexplained paths and "Step 1 of 26", scrolls 1.5 screens to find the example, hits a silently disabled button at step 2. Likely leaves with nothing generated.

4th grader: door and code field are fine. Codename subtitle says "Enter" with nothing to type; "Start New Adventure vs Load Saved File". A failed join shows a red paragraph with an error code and "Loading your homework" forever.

School psychologist: the door names Report Writer, then the hub recommends a Whiteboard under a TEACHER label. Needs search: 3 actions, about 7 s. Report Writer itself is well built.

Parent via Family: expects stories from their child's reading; gets "Global Context" and a dense teacher sidebar with 3 "Needs AI setup" strips.

## Minor Observations

- Help tip aria-label reads "Dismiss", not what it dismisses.
- Hub chips are 40 px tall and favorite stars 36x36, under the 44 px floor the pad meets.
- Educator hub logs a MIME error for allo_sheet/host_bridge.js.
- Coach shows "needs Google Gemini" before any question and does not mention the Canvas option the AI modal recommends.
- "Manage favorites" shown with zero favorites; section toggles are a bare "-".
- XP "NEXT LEVEL 0/100" in a teacher's header.
- 10 px uppercase tagline on the pad means nothing to any of the four audiences.

## Questions to Consider

1. If a keyless visitor cannot generate anything, should the Teacher door open on a pre-generated example pack, with AI setup as the upgrade?
2. Could the lesson path be chosen after the first result instead of before it?
3. Family and Specialist have doors but no rooms. Build two small honest landing screens, or hide the doors until they exist?
4. What would a 5-step "first lesson in 3 minutes" tour cut from the current 35?
