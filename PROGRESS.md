# Typing Practice Module — PROGRESS

Handoff log for the scheduled remote agent (trigger `trig_01JVqwNDJ7MCKTyXAj26gkTm`).
Updated by the chat session on **2026-04-23** (fifteen refinement passes after
initial deploy). The scheduled trigger is currently **disabled** — Aaron
verified Max-plan quota usage, so re-enabling is safe when Phase 1 remainder
work is ready to resume.

**Current file sizes:**
- `stem_lab/stem_tool_typingpractice.js` — 5730 lines
- `stem_lab/stem_tool_allobotsage.js` — 1702 lines (+ 3 typing-practice spells)
- `AlloFlowANTI.txt:5862` — plugin load-list entry
- `PROGRESS.md` — this file

**Fifteenth refinement pass added:**
- **Drill abandonment tracking** — when Escape exits an in-progress drill (startTime set, not complete, not a warmup), `state.lifetime.abandonments` increments. Fire-and-forget, no prompt. Gives the IEP report a signal for whether drill difficulty is calibrated right.
- **▶ Continue card on menu** — last-session quick-resume prominently displayed above recommendations. Shows drill icon + name (or passage topic / custom label), age ("12 min ago", "2 days ago"), last WPM/accuracy, and a "▶ Continue" primary button that routes straight into the drill-intro screen for that drill. Removes friction for the most common re-entry path.
- **Drill completion rate** in IEP report — now computes `completed / (completed + abandoned) * 100` and emits "Drill completion rate: 94% (47 completed, 3 abandoned)" under mastery progression. Calibration signal: low rates suggest a drill is too hard and the student keeps bailing; high rates suggest the tool is at the right level.
- **Filter empty states** in Progress view — when `sessions` is empty but `allSessions` has entries (i.e., filter excludes everything), the view now shows "🔎 No sessions match the current filter" with a "✕ Clear filters" button. Distinct from the "no sessions yet" message for first-time users.

**Fourteenth refinement pass added:**
- **Full state backup / restore** in Settings, below the profile import/export. Export writes a JSON blob with `_format: "alloflow-typing-practice-backup"` + version tag containing the entire `state` — sessions, personal best, mastery, aggregate errors, lifetime totals, both libraries, everything. Import validates the format tag, shows a session-count confirmation, and replaces current state with the backup keys. Filename auto-includes student name + date. Covers localStorage-loss recovery and device moves, not just settings transfer.
- **Clear all data** button (red-outlined, below backup) — double `window.confirm` guard, wipes back to `DEFAULT_STATE`. Useful for clinicians resetting a device for a new student without leaving prior-student data behind.
- **⌨️ Keyboard shortcuts reference** — new `shortcuts` view reachable from menu nav ("? Shortcuts"). Four sections (Menu / Drill intro / While drilling / Form fields) with `<kbd>` chips showing actual key bindings. Affirms the tool's keyboard-first design for screen-reader users and motor-planning accommodations.
- **Time-of-day performance analysis** in IEP report — new `computeTimeOfDayPerformance(sessions)` helper groups sessions into Early morning / Morning / Afternoon / Evening / Night buckets (based on local hour from `session.date`) and reports avg WPM + accuracy per bucket. Surfaces as "TIME-OF-DAY PERFORMANCE" section in the report. Helps scheduling decisions — if the student averages 22 WPM in the morning and 12 WPM at night, a clinician can advocate for morning-scheduled typing intervention. Only emits when ≥5 sessions exist and ≥2 non-empty buckets.

**Thirteenth refinement pass added:**
- **Daily goal** (distinct from IEP goal) — new "Your goals (student)" section in Settings with `targetSessions` + `targetWpm` fields. Displays as a banner on the Menu: "☀️ Today's goal: 3 sessions @ 20+ WPM · progress 1/3". Auto-expires when `dailyGoal.date` is from a different calendar day (no persistent guilt). Met state flips headline to green "✓ Daily goal met." Student-owned target, separate from clinician's IEP goal which is long-term.
- **"Why I'm practicing"** student motivation statement — 200-char textarea in the same Student-agency settings section. Renders as an italic success-border quote block on the Menu ("Typing feels hard now, but I\'m going to write my own stories.") BEFORE any system nudge. Also surfaces in the IEP report under "STUDENT MOTIVATION (self-authored)". Gives the student voice ownership over their practice narrative.
- **🖨 Print-friendly IEP report** — new button next to Copy + CSV. Opens a new browser window with a minimal clinical-looking HTML (monospace, 0.75in margins, auto-print on load). Per `@media print` rules, the control button hides when printing. Works with the existing filter bar so clinicians can print just a specific IEP window.
- **Multi-slot custom drill library** — `state.customDrill` (single slot) migrated to `state.customDrillLibrary` (array, cap 5) + `state.activeCustomDrillId`. Non-destructive migration on mount: if library is empty but legacy customDrill exists, seed the library with it. Custom-setup view is now a list with per-entry Drill / Edit / 🗑 Delete actions + a collapsible draft form. Clinician can now save 5 different custom drills (spelling list, IEP sight words, science vocab, etc.) and switch between them — not just overwrite.

**Twelfth refinement pass added:**
- **Filter preset chips** in Progress view — 6 one-click ranges above the date inputs: All / Today / This week / This month / Last 30 days / Last 90 days. Computes the ISO date pair on click and sets `filterStart`/`filterEnd`. Chip highlights when its computed range matches the current filter, so the state is visible at a glance. Removes manual date-typing friction for common IEP reporting windows.
- **Clinical session tagging** — summary view now has a "Session tag (for clinicians)" chip row with Untagged / 📍 Baseline / 📈 Progress check / 📊 Assessment / ✏️ Practice. Saves to `session.tag`. Surfaces: (1) as a badge in the drill-history timeline, (2) as a `tag` column in CSV, (3) as a "SESSION TAG BREAKDOWN" roll-up in the IEP report ("baseline: 1 · progress-check: 3 · practice: 12"). Useful for filtering a dataset to just assessment sessions for a baseline comparison in a progress review.
- **Gentle practice-days counter** — new stat card on the menu shows "🗓 N" unique calendar days in the last 30 with at least one session. Positive framing ("days you showed up") rather than streak guilt ("you missed 3 days"). Tooltip clarifies: "No guilt for days off." Deliberately named "Practice days · 30d" not "streak" to avoid the pressure pattern explicitly banned in the gamification rules.

**Eleventh refinement pass added:**
- **Error-pattern → recommended drill** — `analyzeErrorPatterns` now returns an optional `recommendedDrill` field mapping the dominant error pattern to the specific drill that targets it (top-row errors → top-row drill, bottom-row → bottom-row, home-row reset → home-row, shift timing → capitalization). Surfaces in the Progress-view coaching card as a "🎯 Recommended drill: X — [reason]" + "Try it" button (gated on whether the drill is unlocked), AND in the IEP report as "Recommended practice: X". Closes the diagnosis-to-intervention loop — the tool now says not just "here are your weak keys" but "here's the drill that targets them."
- **Session pace graph** on summary — every keystroke's timestamp is captured via `keystrokeTimesRef` (ref, not state, to avoid per-key re-renders). On completion, keystrokes are bucketed into 10-second windows stored as `session.paceBuckets: number[]`. The summary view renders a small bar chart of chars-per-10-seconds with per-bucket WPM tooltips. Shows intra-session variability (slowed down after 30 sec? Sped up? Flat?) — useful for attention/fatigue analysis.
- **Focus-mode keyboard shadow** (child of large-keys accommodation) — heavily dims all on-screen-keyboard keys except the next target. Same-finger keys stay at 55% opacity as a motor-planning hint ("this finger is about to act"); everything else drops to 20%. Reduces visual noise for attention-challenged students. Only visible in Settings when the on-screen keyboard accommodation is already on.
- **Speak-words-as-typed** accommodation — when enabled, the tool reads each just-completed word aloud after the student presses space. Uses `ctx.callTTS` (same as Listen-First). Rate-limited by space presses so TTS doesn't spam. For auditory-first learners, emergent bilingual students who want word-level audio reinforcement, and low-vision typists who need auditory confirmation of what they've produced.

**Tenth refinement pass added:**
- **Saved-passage library** — `state.aiPassageLibrary` now holds up to `MAX_PASSAGE_LIBRARY` (8) previously-generated passages with id + text + grade + topic + language + difficulty + generatedAt. Each generation prepends to the library and deduplicates by text so regenerating the same prompt doesn't bloat the stash. Passage-setup view renders a scrollable list of saved passages with per-entry "Drill" + 🗑 "Delete" actions and a "current" badge on the active passage. Students/clinicians can now build a themed library for a curriculum unit and drill against the SAME passage across sessions for fair before/after comparison.
- **Inline drill stats** on menu cards — unlocked drills with session history now show a small footer line ("15 WPM best · 8 sessions"), surfaced from `state.personalBest` and `state.sessions` filtered by drillId. Students see at a glance where they stand on each drill without opening Progress.
- **📊 Assessment mode** accommodation — toggle in Settings that hides live WPM / accuracy / timer during the drill (replaced with a small "📊 Assessment · metrics hidden" chip). Metrics are still computed and saved; just not shown until the summary screen. For clinicians running a clean typing-speed baseline where clock-watching would artifact the measurement.
- **Profile import / export (JSON)** — Settings now has a Profile section with two buttons. Export serializes accommodations + IEP goal + audio theme + passagePrefs + studentName to a downloadable JSON file tagged `_format: "alloflow-typing-practice-profile"` with a version field. Import opens a file picker, validates the format tag, confirms with `window.confirm`, and applies non-destructively (session history and progress are preserved). Enables clinicians to move an accommodation profile across devices or between students.

**Ninth refinement pass added:**
- **Drill-history scrollable timeline** in Progress view — list of every filtered session (newest first), showing drill icon/name, date/time, WPM/accuracy/duration, reflection emoji, session note preview, and milestone badges (📍 baseline / ⭐ PB / 🌟 tier ↑). Max 320px scroll container. Honors the existing date + drill filter bar. Clinical audit trail in one glance.
- **Multi-language passage generation** — `PASSAGE_LANGUAGES` list (English, Spanish, French, Portuguese, Simplified Chinese hybrid) with per-language prompt hints that request ASCII-only output (no accents/diacritics) so standard keyboard keys remain the practice target. ELL + bilingual-home support. Language chip row in passage-setup; saved in `passagePrefs.language`; language tagged on generated passage record.
- **Per-drill accommodation efficacy matrix** in IEP report — new `computePerDrillEfficacy(sessions)` helper groups sessions by drillId and computes with-vs-without deltas per (drill, accommodation) pair. Requires 2+ sessions on both sides of the split to emit a row (avoids noise). IEP now prints both sections: aggregate (across all drills) AND per-drill (less confounded by drill difficulty). The matrix is the defensible-rigor version clinicians will cite in IEP reviews.

**Eighth refinement pass added:**
- **Custom drill** — 📋 drill card on the menu routes to a new `renderCustomSetup` view. Teacher or student authors free text (5–500 chars), gives it an optional label ("Week 4 spelling list", "IEP sight words", "science vocab"). Single slot, editable, deletable. Saved custom text persists as `state.customDrill = { text, label, savedAt }`. Does NOT feed mastery progression — `tier: null` + no masteryWpm/Acc so the completion effect skips advancement. Sessions record `drillId: 'custom'`. Clinician value: adapt the tool to ANY curriculum, not just the preset drills.
- **Pre-drill accommodation quick-toggles** on drill-intro — 6 high-frequency accommodations as compact chips (🔤 Font, ⌨️ Keyboard, 🌓 Contrast, 🔔 Audio, 🤝 Error-tolerant, 🪄 Predict). `aria-pressed` for screen readers. Lets clinicians/students adjust without round-tripping to Accommodations. The existing active-accommodations summary line still shows as read-only confirmation.
- **Warmup mode** — checkbox on drill-intro ("🤸 Warmup mode — this session won't be saved"). When on, completion effect SKIPS all persistence (no session record, no lifetime totals, no aggregate errors, no mastery, no personal best). Summary headline reads "🤸 Warmup complete — not saved." A warmup chip shows in the drill top bar so the mode is never accidentally hidden. Intended for motor-planning anxiety, accidental re-tries, and low-pressure practice. Flag is local state — reset on drill-intro entry from the menu, preserved on summary → Drill again.

**Seventh refinement pass added:**
- **Session-end celebration polish** — mastery advancement now shows a specific next-step hint naming the drill just unlocked ("⌨️ Top Row is now unlocked. When you're ready, it's waiting on the menu."). Personal-best adds a gap reminder ("You're 2 WPM from clearing this tier"). Baseline gets its own anchor message. Dignified, not Nitrotype-style fanfare — success color accent on the headline.
- **Sight-read count-in accommodation** — opt-in N-second countdown on drill entry (off / 3 / 5 / 8 / 12 sec). Shows a large number + "Reading time. Typing starts in X seconds" panel. Keystrokes swallowed during countdown. Skippable via Skip button. Reading-first scaffold for students who benefit from comprehension before production.
- **Locked-drill threshold hint on menu cards** — locked cards now show the specific text "Clear [previous-tier name] first (X WPM @ Y%)" instead of an opaque "Locked" chip. Tells the student exactly what to do. Also improves `aria-label` so screen readers announce the same context.
- **Discard this session** button on summary — surgical undo for accidental runs. Pops the session from state, rolls back lifetime totals, subtracts the session's per-char errors from `aggregateErrors`, reverts mastery advancement if this session caused it, recomputes personal best for that drill from the remaining sessions, and clears baseline if this was the first-ever session. Requires `window.confirm` before executing. Only visible for the most-recent session.

**Sixth refinement pass added:**
- **Error-pattern analyzer** (`analyzeErrorPatterns(aggregateErrors)`) — returns finger-grouped counts, top error keys, and rule-based coaching hints. Rules trigger on patterns like "pinky-dominant errors" (both LP/RP held >25% share), "top-row reaches" (q-p share >35%), "bottom-row stretches" (z-m share >35%), "b/v or n/m cluster" (both index-finger twin errors), and a gentle "spread with no single pattern" fallback. All hints use specific, actionable language with no effort-judgment.
- **Finger-group stacked bar** in Progress view — horizontal proportion bar colored by `FINGER_COLOR` (same palette as on-screen-keyboard accommodation, so visual language stays consistent). Legend chips list each finger's % share. `role="img"` + `aria-label` for screen readers.
- **Coaching card** in Progress view — left-accented card below the heatmap lists the 1–3 hints from the analyzer, prefaced "🧭 Coaching."
- **IEP report expanded** — "TOP ERROR-PRONE KEYS" section now includes a finger-breakdown summary line ("left pinky 32%, right index 24%, ...") AND a new "COACHING HINTS (based on error pattern)" section with the same rule-based text. The report now gives clinicians concrete, defensible coaching targets keyed to the data.
- **TTS "🔊 Listen first" button** on drill-intro — uses `ctx.callTTS(targetStr)` to read the passage aloud before the student types it. Supports auditory-first learners, low-vision students, and pre-writing comprehension. Only renders when `ctx.callTTS` is available and target text is loaded. Toast confirms playback start.

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
6. **Drill-text-to-speech during typing.** Beyond Listen First (which reads the passage before typing), some blind/low-vision students benefit from the tool announcing each character as it's typed. High accessibility value; moderate complexity because of rate-limiting.
7. **Error pattern → recommended drill.** The analyzer identifies finger dominance. Extend by recommending a SPECIFIC drill or custom-text prompt that targets the weak finger. "Your errors concentrate on left pinky — try this home-row drill focused on q/a/z."
8. **Session pace graph within a session.** After completion, show a rolling-10-second WPM chart as part of the summary so the student sees intra-session variability (did they slow down after 30 sec? Speed up?).
9. **Focus-mode keyboard shadow.** On the on-screen keyboard accommodation, dim all keys except the next target and its immediate neighbors to reduce visual noise for students with attention differences.
10. **Re-enable scheduled trigger.** Confirmed Max-plan quota usage. Once Phase 1 is verified in-browser, flip `enabled: true` on `trig_01JVqwNDJ7MCKTyXAj26gkTm` and let the agent iterate on items 2–9.

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
