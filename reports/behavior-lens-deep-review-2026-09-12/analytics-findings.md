# Behavior Lens analytics and measurement review

Read-only review, September 12, 2026. No application changes. Ran the actual workspace runtime and isolated copies of component functions with controlled hook state. These are callback and calculation reproductions, not browser layout tests or full React lifecycle tests. All twelve characterization probes pass; passing means the suspected defect was reproduced. Run `node reports/behavior-lens-deep-review-2026-09-12/analytics-probes.cjs`.

## Highest-priority findings

### A1. P1: ABA Graph reverses chronological session order and can reverse the apparent trend

Evidence: behavior_lens_module.js:29694 prepends each new Session Data Tracker session. Observation bridge paths also prepend at 27048-27110. ABAGraphEngine at 16720-16735 maps that newest-first array directly to session numbers starting at 1. There is no chronological sort. Phase membership at 16811 uses those generated session numbers.

Reproduction: record September 1 count 10, September 2 count 5, September 3 count 1; graph export is values [1,5,10] with an increasing slope. The real sequence decreases. Adding later sessions also moves historical records across numerical phase boundaries.

Suggested change: maintain stable session IDs and occurrence timestamps; derive a chronological series before assigning display positions, and define phase boundaries using stable sessions. Add an interaction test that saves three sessions, defines phases, saves another, and verifies old phase assignments do not shift.

### A2. P1: Open duration episodes disappear at session end and contaminate the following session

Evidence: SessionDataTracker endSession at 16455-16480 serializes completed target.durations only. Open timers live separately at 16389 and 16485-16494 and are neither finalized nor cleared by endSession or startSession (16445).

Reproduction: start a duration target, leave its episode running for five seconds, then End Session & Save. Saved durations=[] and count=0. Start another session: its duration button already says Stop. Stopping then records time measured from the prior session, including time outside observation.

Suggested change: compute end time once, finalize all open episodes before serializing, clear timer state on end/start, and make closing a running recorder a deliberate preserve/discard action.

### A3. P1: Zero-event observations cannot be saved; mixed-counter zero observations disappear from graphs

Evidence: FrequencyCounter handleSave at 2493 returns when totalCount===0 regardless of observation duration. The enabled Save control provides no explanation. When another counter does have events, the bridge at 27048 filters counters to count>0.

Reproduction: a 60-second observation with count=0 leaves Save enabled, but invokes neither save nor close. A mixed session with A=2 and B=0 saves the session but only A enters sessionHistory.

Impact: successful zero-event periods cannot enter the observation denominator or target's time series consistently. This is missing measurement data, rather than merely a disabled-button issue.

Suggested change: allow zero count when valid observation time exists; preserve each named measured target, including zero. Distinguish an observed zero from a day without observation. Extend phase summaries to include observation-only phases: the current workspace summarizer at 649-658 derives phase names only from ABC incidents and drops a fully observed zero-incident intervention phase.

### A4. P1: Graph import and auto mode can silently plot the wrong measurement

Evidence: CSV parser at 16758-16767 takes the first number matched per line. The UI at 17345 explicitly says it accepts `1,5`. Auto series at 16727 has no percentage-target branch; flat observation data at 16731 chooses count before rate, including interval records that carry both occurrence count and percentage.

Reproductions:

- Paste `1,12`, `2,8`, `3,4`: resulting measurements are [1,2,3], not [12,8,4]. This turns decreasing values into increasing values.
- A Session Data Tracker percentage target with 3 correct of 4 trials plots 3 rather than 75%.
- A flat interval bridge record with occurredCount=2 and percentage=50 plots 2. The default Y-axis label is Frequency (16684), even for duration and latency values.

Suggested change: parse supported CSV formats explicitly and display a preview with session/value columns; use a shared measurement adapter returning value, unit, numerator, denominator, and measurement type. Reject mixed-unit series or require an explicit metric selection. Test each recorder-to-graph path.

### A5. P2: Adding a target after deletion creates duplicate target IDs

Evidence: SessionDataTracker addTarget at 16438 and suggestion-button add at 16554 use `b` plus array length+1. Remove at 16441 retains other IDs; updateTarget at 16443 updates every matching ID.

Reproduction: add targets b1,b2,b3; remove b2; add another, yielding b1,b3,b3. Editing the final name also edits the preceding target. Counts, types, and duration timer lookup are coupled by the same duplicated ID.

Suggested change: generate unique immutable IDs and add a regression covering add/remove/add/edit. The same pattern also appears in TaskAnalysisTool (19887) and TreatmentIntegrityTracker (21676); those need a similar follow-up audit.

### A6. P2: Phase rate summaries use mismatched or missing observation denominators

Evidence: workspace summarizePhases at 657 passes null for the Unassigned phase filter. summarizeExposure at 623 treats null as no filter, so Unassigned borrows observations from every named phase. BehaviorTrendDashboard at 10605 requests phase summaries without the selected behavior filter even though the main selected-rate card at 10597 does filter its denominator.

Reproduction: one Unassigned ABC entry and one baseline-only hour yield an Unassigned rate of 1/hour with denominatorAvailable=true, despite no Unassigned observation time. A phase represented by observation sessions but no ABC entries is omitted altogether.

Suggested change: use explicit predicates for missing phase versus all phases, propagate the selected canonical behavior to phase exposure filtering, and create phases from the union of observations and incidents. Link incident-rate numerators to the same observation scope as their denominators.

## Additional confirmed correctness and UX issues

- **Goal date is decorative and zero goals vanish.** ProgressMonitorDashboard stores goalDate (23098) and displays its input (23210), but never uses it in calculations. Aim line always ends at the latest recorded day (23172). Setting a new future goal date leaves the SVG byte-for-byte unchanged; setting goal=0 removes the line and legend (23172-23173,23233). Use a calendar-time axis that extends to the goal date and distinguish no goal from a valid zero goal.
- **AI freshness does not include inputs actually sent to AI.** Workspace fingerprint at 681-684 omits setting, notes, duration, and narrative strings. Analysis prompt at 26979-26982 includes setting and notes; quality-check prompt at 10492-10496 includes setting and duration. Editing just notes or setting can leave an analysis marked current. Include the full normalized prompt inputs plus relevant target definitions and analysis configuration. Narrative changes through update paths that preserve IDs also escape the fingerprint.
- **Unknown timezone mutates into UTC on repeated normalization.** normalizeTimezoneOffset at workspace 250-252 calls Number(null), yielding 0. Missing offset first normalizes to null, then re-normalizing the resulting record turns null into 0. localDayKey itself normalizes a null offset again, so missing offsets can be interpreted as UTC rather than local time. Explicitly preserve null/undefined/empty as unknown. Separate issue: Progress Monitor at 23113 uses UTC ISO day while other dashboards use canonical localDate.
- **Data quality undercounts incomplete records.** inspectAbcData at workspace 673 returns the maximum missing-field count. With one record missing antecedent and a different record missing consequence, it reports one incomplete record instead of two. Count distinct entries missing any required field.
- **Missing intensity is still imputed in older tools.** ABCModal initializes missing intensity to 3 (637); EffectSizeCalculator ABC auto-fill does the same at 22453-22454, and CaseloadDashboard at 22152 also replaces missing intensity with 3. This disagrees with newer Overview/Trend/Report code, which excludes missing ratings and displays the rated count. Preserve unknown explicitly and expose n throughout.

## Functionality improvements suggested by the cross-tool audit

1. Create one measurement contract used by recorders, session history, graphs, phase comparisons, exports, and reports. Include stable session ID, target ID, value/unit, occurrence time, observation duration, and applicable numerator/denominator.
2. Reuse canonical target definitions and local-day grouping throughout Progress Monitor, older planners, and case summaries. The current product contains parallel implementations that disagree on behavior aliases, missing intensity, date boundaries, and zero measurements.
3. Add a single durable goal/phase model shared between Session Data Tracker, Single Case Design Manager, Progress Monitor, ABA Graph, and report generation. Currently users configure related concepts in separate panels with limited agreement.
4. Prioritize end-to-end tests of data semantics over source-string tests: recorder -> save -> reopen -> graph -> phase summary -> export. Existing accessibility contract tests frequently assert text is present; they do not catch the measurement errors above.
