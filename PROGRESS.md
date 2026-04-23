# Typing Practice Module — PROGRESS

Handoff log for the scheduled remote agent (trigger `trig_01JVqwNDJ7MCKTyXAj26gkTm`).
Updated by the chat session on **2026-04-23** (five refinement passes after
initial deploy). The scheduled trigger is currently **disabled** — Aaron
verified Max-plan quota usage, so re-enabling is safe when Phase 1 remainder
work is ready to resume.

**Current file sizes:**
- `stem_lab/stem_tool_typingpractice.js` — 3626 lines
- `stem_lab/stem_tool_allobotsage.js` — 1702 lines (+ 3 typing-practice spells)
- `AlloFlowANTI.txt:5862` — plugin load-list entry
- `PROGRESS.md` — this file

**Fifth refinement pass added:**
- **Accommodation presets** — 4 one-click bundles at top of Settings: 🧠 Dyslexia-friendly, 👓 Low vision, 🤲 Motor planning, 🎯 Focus/ADHD. Each applies an evidence-informed combo of existing toggles. Earns a preset-id badge on first use. `ACC_PRESETS` array is editable to add more bundles.
- **Session reflection tag** on summary — 🌱 Too easy / 😌 Just right / 💪 Hard. Saves into `session.reflection`. Surfaces in CSV (`reflection` column), IEP session-notes line ("felt: hard"), AND a "STUDENT REFLECTION ROLL-UP" summary when ≥3 sessions are tagged. Closes the loop between student voice and clinician report.
- **Drill practice recommendations** on menu — pattern-based nudges via `computePracticeRecommendation(state)`. Detects, in priority order: (1) 5+ sessions in last 2 hours → rest suggestion, (2) close to clearing current tier mastery (≤3 WPM gap) → encouragement + direct-start button, (3) drill not practiced in 10+ days → revisit nudge, (4) accuracy dip ≥8 points below personal best → precision-over-speed coaching. Only the top-priority match renders, so the student sees the most relevant suggestion.
- **First-run onboarding** — dismissible welcome card on the Menu view when `sessions.length === 0 && !state.onboardingSeen`. Four bullets explaining the tool ethos (no timers/races, accommodations are the product, clinicians can export IEP-ready reports). One-click dismiss sets `state.onboardingSeen = true`.
- **Per-key error tracking + heatmap** — each wrong keystroke increments `errorChars[expected.toLowerCase()]` locally, saved into the session record and aggregated into `state.aggregateErrors` on completion. Progress view renders a QWERTY heatmap (`renderErrorHeatmap`) blending `palette.bg` → `palette.danger` by intensity, with per-key count labels. IEP report surfaces the top 5 error-prone keys as "TOP ERROR-PRONE KEYS" section. CSV gets `error_chars` column (compact `a:2|d:1|...` format).

**Fourth refinement pass added:**
- **Report filters** (date range + drill type) in Progress view. Affects trend sparkline, IEP report, CSV export. Baseline / skill-tree / lifetime totals stay all-time (milestone anchors). `applySessionFilters(sessions, opts)` helper; both `buildIEPReport` and `downloadSessionsCSV` accept optional `opts = {startDate, endDate, drillId}`. Filter bar shows "N of M sessions" live count.
- **Rest-break nudge** accommodation — after N minutes of ACTIVE drill time (paused time not counted), a gentle toast fires: "X minutes of typing — consider a short break. Your WPM won't be affected." Options: off / 5 / 10 / 15 / 20 min. Once per drill (refs reset on drill-view entry).
- **Passage difficulty slider** — within-grade modifier (🌱 Easier / 📘 On-level / 🌿 Stretch) injected into the `callGemini` prompt. "Easier" trims 1-2 words per sentence and prefers common words; "Stretch" adds 1-2 harder vocab with context + slightly longer sentences; "On-level" = exact grade match (default). Saved to `passagePrefs.difficulty` so next generation remembers the choice.

**Third refinement pass added:**
- 15 samples per structured drill (up from 5) — ~75 new sample sentences total
- Drill introduction screen (`view: 'drill-intro'`) with preview + active-accommodations list + IEP-goal reminder + Start button (space/enter shortcut, auto-focused)
- Per-session teacher/clinician note field on the summary view; saved into session record, surfaced in CSV (`note` column) + IEP report ("SESSION NOTES" section, last 10)
- Copy-to-clipboard button for IEP report (uses `navigator.clipboard.writeText` with `document.execCommand('copy')` fallback)
- Predictive-assist accommodation: shows next 1–3 chars with soft dotted-underline preview. Auto-fades by current drill's personal-best accuracy (3 chars < 85% → 2 < 92% → 1 < 96% → 0 ≥ 96%). Evidence-based motor-planning support that fades as skill grows.
- Session detail drill-down in Progress view: sparkline bars are now clickable buttons that expand a detail panel showing that session's full record (WPM, accuracy, duration, errors, paused time, accommodations used, personal-best / mastery-advance flags, teacher note)

## PhaseStatus

**PHASE1_SEED** — Foundation complete, deployed to production, unreviewed-in-the-wild.

Phase 1 scope per the approved plan (`~/.claude/plans/got-it-i-am-drifting-charm.md`):
- Standalone module only (NOT Simplified View integration — that's Phase 2)
- Four pillars: disability-first design · AI-personalized content · IEP workflow · hub integration
- Banned: leaderboards, timer pressure, streak guilt, racing, loot-box, ads

## Done

**Architecture**
- STEM Lab sub-tool at `stem_lab/stem_tool_typingpractice.js` (2071 lines, hand-authored JS, `React.createElement`)
- Registered via `window.StemLab.registerTool('typingPractice', {category: 'life-skills', ...})`
- Plugin load-list entry at `AlloFlowANTI.txt:5862`
- Deployed (unknown commit hash — deploy happened in a separate chat session)

**UI surface**
- Menu view with tiered drill cards + stats strip + accommodation-badge count
- Drill view with keystroke capture (focusable div, onKeyDown), per-char highlight (done / current / wrong / upcoming), space indicators (subtle middle-dots throughout)
- Summary view with baseline detection, personal-best detection, mastery-advancement banner
- Progress view with skill tree, baseline→current metrics, last-12 trend sparkline, accommodation badges, IEP-ready text export
- Settings view with 6 accommodation toggles + pace-target stepper + IEP-goal setter (targetWpm, targetAcc, notes, student name)
- Passage-setup view with grade selector (K / 1 / 2-3 / 4-5 / 6-8 / 9-12) + topic input + generate action + cached-passage preview

**Drills (expanded to 8 after refinement pass)**
- 7 structured drills: home-row, top-row, bottom-row, common-words, **capitalization** (tier 4, shift-key practice), **number-row** (tier 5), **symbols** (tier 6, shift + numbers)
- Plus AI passage (tier 7, always unlocked)
- Each drill has 5 sample texts; `pickDrillSample(drill, drillRunId)` is seeded on `drillRunId`:
  - Increments when student starts fresh from menu (new text)
  - Stays same on "Drill again" from summary (identical retry — fair before/after)
  - Summary also offers a 🔀 "Different sample" button that explicitly bumps `drillRunId`
- Mastery thresholds (disability-first, low bars): 10/80%, 12/80%, 15/80%, 18/85%, 14/82% (cap), 14/80% (num), 12/80% (sym), 20/90% (passage)
- `TIER_ORDER` constant is the single source of truth for progression order

**Accommodations (all 6 wired) + audio theme + pause/resume**
- Dyslexia-friendly font (OpenDyslexic → Comic Sans MS → Lexend fallback chain)
- Large-key visual keyboard (finger-color coded with `KB_LAYOUT` + `FINGER_COLOR` maps, highlights next target key, shows finger name)
- High-contrast mode (swaps to black/yellow/white palette via `getPalette()`)
- Audio cues (Web Audio API, lazy-init `AudioContext`) with **theme picker** (chime / soft / mute, `AUDIO_THEMES` map, live preview on selection)
- Error-tolerant mode (on wrong key, logs error + auto-advances with expected char — dysgraphia accommodation)
- Pace target (stepper 10/15/20/25/30/40 WPM, renders a sinusoidal pulsing dot; explicitly "reference, not deadline")
- Accommodation badges earned on first toggle ("tried-X")
- **Pause/resume button** on drill screen. Paused time is tracked separately (`pausedMs` + `pauseStartedAt`) and subtracted from elapsed time so WPM stays honest. Keystrokes swallowed while paused. Session summary records `pausedSec` separately. Disability-aware — no all-or-nothing session pressure.

**AI integration**
- `ctx.callGemini(prompt, jsonMode=false, ...)` via grade-level complexity guides lifted from `handleGenerate` simplified branch (`GRADE_COMPLEXITY` map)
- jsonMode=FALSE per feedback memory (jsonMode=true wraps HTML/text output)
- Passage post-processing: strips outer quotes, normalizes curly quotes/em-dashes/ellipsis to ASCII
- Passages cached in `state.aiPassage`; students can re-use or regenerate

**Clinical workflow**
- Baseline captured on first-ever session
- Personal best per-drill (wpm AND accuracy must improve)
- IEP goal setter (targetWpm, targetAcc, notes) surfaces as green-left-border banner on drill screen + populates IEP report
- Student name field (FERPA-safe phrasing: "use initials or pseudonym")
- `buildIEPReport(state)` produces copy-paste plain text with baseline / current avg / per-drill PBs / mastery tier status / accommodations in use / notes

**Cross-tool integration (pull-based, verified against allobotsage.js spell architecture)**
- Three typing-practice spells added to `stem_tool_allobotsage.js`:
  - `home_row_focus` (unlock: masteryLevel ≥ 1)
  - `fluent_keys` (unlock: sessions ≥ 10)
  - `ready_words` (unlock: common-words personal-best WPM ≥ 15)
- Each spell has 7-entry `challengeBank` with typing-technique + accommodation + reading-fluency questions
- No push hook needed — AlloBot Sage reads `d.typingPractice.masteryLevel` / `.sessions` / `.personalBest` directly

**Accessibility**
- `.tp-root` CSS wrapper with injected `<style>` targeting `:focus-visible` → 3px amber outline, no persistent mouse-click rings
- `role="switch"` on accommodation toggles with `aria-checked`
- `role="textbox"` on drill capture with `aria-label`
- Color-contrast palette passes AA for default and high-contrast modes
- **Blur-refocus respects keyboard navigation** — checks `e.relatedTarget` so tabbing to Back / Pause / Accommodation buttons no longer gets trapped back on the capture div (prior version was a WCAG keyboard-trap violation)
- **Visually-hidden `aria-live` region** at `.tp-root` root reads milestone announcements to screen readers: mastery advancement, new personal best, baseline saved
- Space characters render as subtle middle-dots throughout the drill (not just at cursor), with opacity varying by state, so students can see word boundaries and count remaining words

**Clinical workflow (expanded)**
- Session cap at 200 most recent; `state.lifetime` tracks cumulative totalSessions / totalCharsTyped / totalErrorsLogged across the cap
- **Per-accommodation efficacy** computed via `computeAccommodationEfficacy(sessions)` — for each accommodation the student has tried both WITH and WITHOUT, report `sessions_with / sessions_without / wpm_delta / acc_delta`. Surfaced in IEP report with a confounding caveat ("aggregate across drill types")
- **CSV export button** in Progress view (`downloadSessionsCSV`) — download all sessions with headers `date, drill_id, drill_name, wpm, accuracy_pct, duration_sec, paused_sec, errors, chars_typed, accommodations_used, is_new_best, is_baseline, mastery_advanced, new_mastery_level`. File named `typing_practice_{student}_{date}.csv` for drag-into-Sheets workflows.

## Next Up

Ordered by value + effort. Tackle top-down.

1. **Browser-verify end-to-end.** Aaron STILL hasn't reviewed. Cumulative diff since last browser-verified deploy is approaching +1800 lines. Needs eyes. Walk-through: first-run welcome → menu → practice-recommendation banner (if triggered) → 8 accommodations incl. presets → 7 drill tiers + passage (with difficulty slider) → drill-intro → drill with pause + predictive-assist + rest-break nudge → summary with reflection tag + session note → progress view with skill tree + filters + trend detail panel + error heatmap → IEP report (📋 Copy) + CSV (📥) both honoring filters.
2. **Teacher/clinician dashboard view.** Per-student summary table, batch IEP export, goal progress at a glance. Lives in progress view OR as a new "Educator" view behind a toggle. Big enough to warrant a dedicated feature branch + scheduled-agent session.
3. **Per-drill accommodation efficacy.** Current analysis is aggregate across all drills. More rigorous: for each (drill, accommodation) pair, compute with-vs-without delta. Less confounding from drill difficulty mix. Surface as a small grid in IEP report.
4. **Multi-student switching.** Breaking change to state shape — needs `state.profiles = {[studentKey]: {sessions, iepGoal, accommodations, aggregateErrors, ...}}`. Needs a migration path and explicit sign-off. Defer until single-student flow is battle-tested.
5. **Lexile-anchored passage difficulty.** "Easier / on-level / stretch" is grade-band based. Lexile anchoring is what most reading specialists actually use. Would need a Lexile-to-prompt mapping and Lexile slider UI.
6. **Error-coaching suggestions.** Use `aggregateErrors` to surface specific coaching text: "You miss 'b' and 'v' often — they're both left index finger. Try pressing slowly and check your wrist angle." Small rule-based hints keyed off top error keys.
7. **Session-end celebration polish.** Mastery advancement currently just shows a headline. Consider dignified (not Nitrotype-style) acknowledgement: subtle scale animation on tier node in skill tree next time progress view is opened, or a one-line "Congrats — [specific capability unlocked]" next-steps hint.
8. **Re-enable scheduled trigger.** Confirmed Max-plan quota usage. Once Phase 1 is verified in-browser, flip `enabled: true` on `trig_01JVqwNDJ7MCKTyXAj26gkTm` and let the agent iterate on items 2–7.

## Decisions

- **Placement: STEM Lab sub-tool, not standalone.** STEM Lab has a `life-skills` category precedent (RoadReady). Faster to ship, reuses STEM Lab chrome, can promote to standalone later if usage justifies. Hub integration works equally well from either location.
- **Use `ctx.callGemini` directly, not `handleGenerate`.** `handleGenerate` is a Canvas-flow reformatter (takes user-provided text and transforms it). For passage *generation* we lift its complexity-guide prompt language but call callGemini directly with a purpose-built prompt.
- **Drill sample rotation keyed on `drillRunId`, NOT `sessions.length`.** The original attempt seeded on session count which meant "Drill again" gave different text each time — broke the fair-comparison use case. `drillRunId` only increments on menu→drill entry; summary→"Drill again" keeps it stable. Explicit "🔀 Different sample" button bumps it when student wants variety.
- **Mastery thresholds LOW by design.** A dysgraphic 3rd-grader clearing 10 WPM at 80% has shown real skill — reward it. No artificially inflated bars. Thresholds DROP slightly for shift-heavy drills (capitalization 14/82, symbols 12/80) to reflect motor load.
- **Pace target is a rhythm reference, NOT a timer.** Soft sinusoidal pulse dot, no penalty for missing the beat, no countdown. Motor-planning support, not performance pressure.
- **Error-tolerant mode auto-advances with the EXPECTED character on error.** Dysgraphia can mean motor output mismatches intent; letting the student get stuck on a wrong keystroke defeats the purpose. Error still logged for accuracy calc.
- **Pause excludes paused time from WPM calc.** If a student needs a break mid-drill, their pause time shouldn't penalize their measured speed. `pausedTotal` subtracted from `endMs - startTime`. Session stores both `durationSec` (active) and `pausedSec` (break time) separately.
- **Session history capped at 200 most recent; `state.lifetime` holds cumulative totals.** Prevents runaway localStorage growth for long-term students without losing long-horizon context.
- **AlloBot integration: PULL, not push.** Spells in allobotsage.js predicate on `d.typingPractice.*` directly. No event hook needed. Writing to `ctx.toolData` via `updMulti` IS the contract.
- **Student name stored in tool state, not a global profile.** For now. If AlloFlow adds a global student identity later, migrate.
- **Per-accommodation efficacy analysis is `with - without` aggregate only.** A per-drill split would be more rigorous but the UI cost exceeds the value at this stage. Report includes a confound caveat. Proper per-drill analytics is a Next Up item.

## Blocked

- **Phase 2: Simplified View / Resource Mode integration.** Do NOT touch until Phase 1 is browser-verified and a `PHASE1_DONE` marker is explicitly added to this file. Integration hook when cleared: add a "Practice typing this" button to the simplified-passage surface in Canvas mode that calls `window.StemLab.renderTool('typingPractice', ctx)` with the passage pre-loaded as `state.aiPassage`.
- **Scheduled trigger currently disabled.** Re-enable only after Aaron browser-verifies Phase 1. Trigger ID: `trig_01JVqwNDJ7MCKTyXAj26gkTm`.

## Stop conditions (inherited from scheduled-agent prompt)

- Do NOT edit `AlloFlowANTI.txt` beyond the single plugin-load-list entry.
- Do NOT modify Simplified View / Resource Mode until `PHASE1_DONE`.
- Do NOT sync `Shareablealloflowcanvas.txt`.
- Do NOT deploy; do NOT touch main; do NOT force-push.
- Do NOT add banned-gamification patterns (leaderboards, timers as default, streak-guilt, racing, loot-box, ads).
