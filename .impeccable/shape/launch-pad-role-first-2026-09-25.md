# Shape brief: role-first Launch Pad

Date: 2026-09-25. Mode: Operate. Target: `view_launch_pad_source.jsx` (first screen), the host `pickMode` dispatch and role handling in `AlloFlowANTI.txt` (mounts near line 44036, `executeRoleSelect` near 19075), `RoleSelectionModal` and `StudentEntryModal` in `ui_modals_source.jsx`, and the coach's four mode chips in `onboarding_coach_source.jsx` (which must mirror the new doors).

Decisions taken with the owner: four role doors (Teacher / Student / Family / Specialist); Teacher lands in Guided by default with a quiet "Open full workspace" link; Student's first choice is "I have a class code" or "Explore on my own", with the codename after.

## 1. Job and audience

Someone arrives at `/app/` with no account and, most days, no AI key: a teacher with ten minutes of planning time, a student handed a Chromebook, a parent following a family link, a school psychologist who wants Report Writer and nothing else. The screen's only job is to route each of them to their first working surface in one decision. Visitor mode is Operate: recognition over reading, no marketing.

## 2. Outcome and proof

Primary action: pick who you are. Success is measured as clicks and seconds to a surface where the person can act: Teacher reaches the Guided step 1 textarea in two clicks (role, then nothing else); Student reaches a codename or a code field in one; Family reaches the parent workspace in one; Specialist reaches the Educator Tools hub in one (plus the device access-code gate where a school configured one). Product truth the screen must carry: the app works without an account, keeps data on the device, and can run without cloud AI (the "Private, on-device options" and "AI Backend Settings" affordances stay).

## 3. Selected direction

Incumbent visual world is preserved: the dark Launch Pad, its card grammar, icon set, 44 px targets, focus rings, reduced-motion guard and inert-background behaviour are authority. Structural thesis: the pad stops asking "which workspace?" and asks "who are you?", using the role modal's copy and semantics (`roles.student`, `roles.teacher`, family = today's `parent` role, specialist = today's Educator Tools card). The second question, where one exists, is asked on the same surface as a reveal, not a new modal:

- **Teacher** sets teacher mode and guided mode in one dispatch (today's Guided card plus `executeRoleSelect('teacher')`), and the Quick Start wizard stays suppressed. A small text link under the Teacher card, "Open the full workspace instead", dispatches today's Full card. The last choice is remembered in `alloflow_last_role` plus a mode flag, and the header's existing Start & setup menu remains the way to switch later.
- **Student** reveals two options in place: "I have a class code" opens the existing join-code input (today's header Join popover, `joinClassSession`) and then the codename; "Explore on my own" goes codename then Learning Tools (the harden pass already wired codename → Learning Tools). Adult self-study is a checkbox-style switch inside the Student reveal, "I'm learning on my own (adult)", which maps to today's `independent` role.
- **Family** dispatches today's `parent` role (adventure story mode on) and honours the `?allo_family` deep link, which already skips the pad.
- **Specialist** dispatches today's Educator Tools card, including `_alloEducatorAccessCodeRequired()` and the TeacherGate.

Focal moment: the four doors, each with a one-line description in the role modal's plain words ("Build accessible lessons and adapt materials for your class", "Join your class and learn with a private codename"). Everything else on the pad demotes: AI Backend Settings and language stay in the utility bar; voice setup stays collapsed; the "Open a tool directly" section is removed because its two cards become doors.

## 4. Scope and boundaries

Fidelity: production screen, single surface, both breakpoints, keyboard and screen reader complete. Breadth: the pad, the host dispatch, the coach's chips, and retiring the role modal from the pad path (it stays for any other caller that opens it, e.g. deep links that set mode but not role). Untouched: workspace surfaces after the door, Guided Mode content, the hubs, AI settings modal, voice setup, deep-link handling (`?tool=`, `?allo_family`, QR assignment modes, session resume), the educator gate, and all a11y tests in `tests/launch_pad_*_a11y.test.js` (update expectations only where the card count changes). Anti-goals: no new modal, no illustration pass, no copy that promises AI without a key, no fifth door.

## 5. States and ranges

First run (no stored role), returning (stored role highlighted with the existing "Last time" badge and focused first), student with a code in the URL (skip the door), device-gated school (Specialist and Teacher show the gate on selection, with one sentence saying where the code comes from), keyless visitor (doors work; the AI doorway appears later in the workspace), reduced motion, 375 px wide (four doors stack, first door above the fold, no horizontal scroll), 200% zoom, RTL, and long translations (German and Vietnamese labels wrap inside the card without clipping).

## 6. Interaction and layout

Hierarchy: brand mark and one heading ("Who's using AlloFlow today?" or the existing `roles.title` copy), then the four doors as a 2×2 grid on desktop and a column on phones, then the utility row. Each door is a native `<button>` with visible title and description bound by `aria-labelledby`/`aria-describedby`, as today. Selecting Student expands the card in place (`aria-expanded`) to show the two options and the adult switch; Escape or a second click collapses it. Teacher's secondary link is a text button beneath the card, never a second card. Feedback: the existing launch transition (button busy state, then the workspace reveal). Coach chips re-map to the four doors and keep the "Not sure? Ask AlloBot" launcher inside the pad.

## 7. Constraints and open decisions

Platform: the monolith (`AlloFlowANTI.txt` → `build.js`), CDN view modules with three mirrors, Gemini Canvas paste (keep comments tight), desktop bundle. Strings go through `t()` with fallbacks; new keys land in `ui_strings.js` and the language packs per the i18n gates. Reuse: `LaunchPadIcon`, `.lp-card`, `runLaunchTransition`, `RoleSelectionModal` copy keys and `lastTimeBadge` logic, `StudentEntryModal`, the header Join popover input. Decisions a builder must not invent: the heading copy (owner's call; the brief proposes the existing `roles.title` line), whether the join-code field on the pad also accepts a QR scan (out of scope unless the owner asks), and whether the role modal is deleted or kept for non-pad callers (keep, until every caller is audited).
