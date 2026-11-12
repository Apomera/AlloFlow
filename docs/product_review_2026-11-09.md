# AlloFlow product review (2026-11-09)

Read-only review from code: three parallel reviewers (teacher experience, student/family experience, project health), with the top claims re-checked by hand. Nothing was run in a browser and no code was changed. Line numbers are for the working tree on 2026-11-09 and will drift. "ANTI" = `AlloFlowANTI.txt`. Items are proposals: revalidate before building.

Checked by hand: A1, A2, A3, A4, B2, C1 (file size, idle fetch, no minifier), C6 (three tracked files).

## A. Student experience

| # | Problem | Evidence | Fix |
|---|---|---|---|
| A1 | QR and live-session work is not saved on the device, but students are told it is. A reload loses answers and the codename. | `_alloShouldSuppressLearnerDeviceStorage` ANTI ~3084 gates autosave at ~14931, 14970, 21207, 31057, 31104. Messages: "Your work remains on this device." ~37553; "Your work stays on this device." ~44442; "Changes saved locally." | M. Decide the policy first: suppression looks deliberate (shared devices). Either keep a tab-lifetime draft per assignment, or change the wording and warn before leaving with unsent work. |
| A2 | A homework link that fails leaves "Loading your homework" on screen permanently; the reason is a short toast. On `?allo_mbp` every failure gives one generic message. | ANTI ~45727; `?allo_mbp` ~40362 vs per-cause messages ~39853 | S–M. Hold the load error in state; show it with Retry; reuse the per-cause messages. |
| A3 | Live-session students who are waiting see the homework text ("ask your teacher for a new link or QR code"). | ANTI ~45726: `isStudentLinkMode` picks the homework copy; every student entry sets it | S. Use the live copy when a session code is set. Confirm in a browser. |
| A4 | "Change codename" opens the "load a lesson file" dialog. | ANTI ~44612 `changeCodename: () => setShowStudentWelcome(true)` | S |
| A5 | Closing the codename dialog on a QR link shows the four-role picker, including Teacher. | `handleCloseStudentEntry` ANTI ~18836 → `RoleSelectionModal` ~47363 | S |
| A6 | An ended mailbox session says "check the connection" and shows a Retry that cannot work. | ANTI ~40016, ~44481 | S |
| A7 | Students see backend jargon in errors ("class Firebase project refused this student device…", "attempt N of 4"). | ANTI ~37514, 37516, 39987 | S |
| A8 | Submitting asks for the codename again under "Student Name / Nickname", may pick a new random name, and leaves no lasting "Sent" receipt. | `student_interaction_source.jsx` ~261–327; `host_handlers_source.jsx` ~4795 | M |
| A9 | Reading supports are split across "Settings & more", "Student tools", the Reading Library's own panel and the immersive reader. Read-aloud has five names (Listen, Read to me, Read this page, Read aloud, Speak). "Focus" means two different things. | `view_header_source.jsx` ~1184; `view_fab_stack_source.jsx` ~402; `reading_library_module.js` ~2223; `immersive_reader_source.jsx` ~579 | M |
| A10 | Codename dialog: says "Enter…" but has only dropdowns; button "Start New Adventure" even for homework; re-randomises on each open. | `ui_modals_source.jsx` ~1902–1960 | S |
| A11 | Students see the teacher PII warning. | `view_header_source.jsx` ~811, 941 | S |

AI-off for students is handled well: AI buttons are hidden, not failing.

## B. Teacher, family and independent-learner experience

| # | Problem | Evidence | Fix |
|---|---|---|---|
| B1 | Eight guidance systems (Launch Pad, coach, Quick Start wizard, Guided Mode, 34-step tour, Help Mode, AI Guide/Blueprint chat, AlloBot intro) with no rule against overlap. | AI Guide button has no `!guidedMode` gate ANTI ~44967; `startAppTour` `view_header_source.jsx` ~264 | M. One Help menu; hide the others while Guided Mode runs. |
| B2 | A Guided Mode AI-access error offers "Review settings", which opens grade/language settings, not AI setup. | `view_guided_mode_banner_source.jsx` ~2044 `onClick={openUniversalSettings}` | S |
| B3 | Six tools have different names in Guided Mode and the sidebar (e.g. "Text Adaptation" vs "Original with Supports"; "Curriculum Audit" vs "Standards & UDL Alignment"). | `guided_mode_config_source.jsx` ~84–111 vs `sidebar.tool_*` | S |
| B4 | One thing, several names: AI settings (5 names), live session (4), saved work (4), educator area (3), setup wizard (3). | ui_strings | S. Name glossary, then apply. |
| B5 | The Launch Pad coach describes four doors that the Launch Pad no longer shows. | `onboarding_coach_source.jsx` ~395–428 vs `view_launch_pad_source.jsx` ~950 | S |
| B6 | Export and print sit behind "Settings & more"; that menu has two pairs of buttons doing the same thing. | `view_header_source.jsx` ~1947–2018 | S |
| B7 | Help "?" and its first-run tip are only in the expanded header; the tip fires during the Launch Pad and is then marked as seen. | ANTI ~14034 | S |
| B8 | Of 210 error toasts, 128 give no next step; 46 append a raw error message; one generation failure is reported three ways. | ui_strings `toasts.*`; `generate_dispatcher_source.jsx` ~10257 | M. One error helper: plain message plus one action. |
| B9 | Outside Canvas, AI setup is 9 providers and 13 inputs, then a reload. | `view_misc_modals_source.jsx` ~2837 | M. "Paste a Gemini key" quick path; the rest under Advanced. |
| B10 | Jargon on teacher labels: "Webb's Depth of Knowledge Target", "Blueprint", "Curriculum Audit", "remediation" (87 strings), "pipeline" (137), "Drop Student JSON Files Here", "Global Context". | ui_strings | S–M |
| B11 | Delivery offers 20 formats in 5 groups plus four separate share paths. | `guided_mode_config_source.jsx` ~78 | M. Ask "Print, link or live?" first. |
| B12 | Three whole-lesson builders (Guided AI planner, AI Guide/Blueprint, Full Resource Pack). | — | L |
| B13 | Second slot of the default bar is "Teacher Grading Dashboard", a JSON drop zone on day one. | `view_header_source.jsx` | S |
| B14 | Quick Start wizard is suppressed on every Launch Pad path and reachable only via "Re-run Setup Wizard". | ANTI ~21294 | S. Retire or shrink it. |
| B15 | Parent and Independent modes still reach Student QR / Homework QR and the Student/Teacher view toggle; teacher "UDL Goal" notes show; parent "View Scores" reveals the answer key; Independent is blocked by "Admin Access Required" where an access code is set; Family mode has four names. | `view_header_source.jsx` ~1925–2022, 263; `view_quiz_source.jsx` ~6610, 7798; `ui_modals_source.jsx` ~1580 | S each |

Counts: 7 always-visible header controls (about 26 after expanding); 23 sidebar tools (7 in the default Recommended filter); about 55 app-wide settings; first resource in about 5 actions inside Canvas, 9–10 plus a reload outside it.

## C. Project health

| # | Problem | Evidence | Fix |
|---|---|---|---|
| C1 | Heavy first load: 24 boot modules (3.2 MB) then about 140 more (15.8 MB) fetched in the background regardless of role; modules are not minified; `ui_strings.js` (16.1 MB) and help strings are fetched on idle at each boot. | ANTI ~15892, ~16732, ~7057; no terser/minify in `build.js` | M. Minify at build; load role-specific modules on use; split strings by section. |
| C2 | Language packs (9–13 MB) load whole and re-download on every release. | ANTI ~7241, ~7769, ~7820 | M. Per-section hashes. |
| C3 | CI was red on 11-08: 109 failing files; quarantine list has 18 entries from 10-17. | `C:\tmp\release_2026-11-08\ci_failing_files.txt`; `tests/QUARANTINE.txt` | M. Fix or quarantine each with a reason. |
| C4 | Uncommitted work (155 modified, 334 untracked, +73k lines) has no backup other than OneDrive sync; the `backup` remote points at a retired host. | `git status`; `dev-tools/push_slim_backup.sh` | S. Scheduled diff + untracked-file snapshot to another drive. |
| C5 | No single check covers all four copies of modules, STEM tools and language packs; the two build copies are gitignored so CI skips them. `lang/french.js` already differs from its build copies. | `dev-tools/check_deploy_mirror.cjs`, `check_sel_four_copy_parity.cjs` | M. One `sync_mirrors --check/--write`. |
| C6 | Personal correspondence is tracked in a repo that appears public: `email_to_hayley_didriksen.md`, `letter_to_knowbility.md`, `knowbility_meeting_prep.md`. | `git ls-files` | S. Owner decision. |
| C7 | Four copies of the language packs use about 2.5 GB; C: has about 13 GB free. | sizes | S–M. Copy packs only at packaging. |
| C8 | Held packs are mislabelled in the language picker (four say "English text, not yet translated" but hold native text); fallback English is unmarked; `lang/manifest.json` is stale. | `ui_language_selector_source.jsx` ~29–160; `lang/PACK_QUALITY_STATUS.md` | S + M |
| C9 | Trust strings from the 10-27 backlog ("not matched to this lesson", "checked N of M") are English in every pack. | ui_strings vs packs | S |
| C10 | No fast smoke test set; about 9 tests re-read every language pack. | `package.json` | S |
| C11 | Modules are hash-pinned but served without long-lived cache headers. | `_headers` | S (inferred) |
| C12 | Root clutter: 311 untracked skyschool images, stray `NUL`/`null` files, old `.tmp` copies of ui_strings (10 MB), stale audit files. | `git status` | S |

## 10-27 backlog status

Done: glossary sense match, timeline verdict completeness, note-taking source coverage, tables/charts, 3,000-character cap disclosure. Partly: DBQ grounding (excerpt caps remain), Writing Supports (rename and >85 = mastery remain). Open: FAQ supporting passages, sequence branching, concept-sort student reasoning, end-to-end flow checklist.

## Suggested order

1. A1–A6 and B2 (a student or teacher is misled or stuck).
2. C4 and C6 (protect the work; privacy).
3. B3–B7, B13–B15, A7, A10, A11 (small wording and placement fixes).
4. C1–C2 (load time), then B1, B8, B9, A8, A9.
5. C3, C5, C10, then the ANTI extraction plan (`docs/anti_extraction_plan_2026-11-09.md`).
