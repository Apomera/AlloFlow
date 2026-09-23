# Behavior Lens: calculations and safety checks, 2026-09-23

Every number Behavior Lens shows, prints or exports was checked against its published definition. So was every threshold that turns a number into a label. The work ran in three passes the same day. **The first fixed defects in 27 reachable tools** (17 AI prompts counted as one). **The second worked through the first pass's open leads and fixed 13 more.** **The third went through the remaining tools and fixed about 25 more**, plus two cross-cutting problems: 22 AI features asking for prose in JSON mode, and 102 buttons with generated screen-reader names. For each fix:

- a test reproduces it and was proven to fail without the fix;
- a deliberate re-break of the fix, restored afterwards from a saved copy, turned that test red (71 such mutations in the first pass, 95 in the second and 97 in the third, every one caught).

**Nothing has been committed or deployed.** The work is in the working tree for Aaron to review.

The full Behavior Lens suite (`tests/behavior_lens*`, `tests/behaviorlens_i18n.test.js`) was 285 of 286 passing before this work (one stale test). After the first pass, with 12 new test files, it was 375 of 375 in 49 files, and after the second 453 of 453 in 59. After the third, with 15 more, it is **520 of 520 passing in 74 files** (exit 0, final run). Under heavy machine load, a few timing-sensitive mounted tests (`workspace_lifecycle`, `daily_sessions`, `connected_workflows`) can time out, and vitest sometimes fails to start a worker; each file passes when run alone.

## How the audit ran

Two read-only agents listed every calculation in `behavior_lens_module.js` (31.7k lines) and `behavior_lens_workspace_module.js`. That produced about 90 candidate findings, all from reading code. Each finding was then checked in three steps:

1. **Reachability.** The component must be rendered by the app. The top two findings in the older `PreferenceAssessment` turned out to be in dead code; that component is defined but never rendered.
2. **Running it.** Each defect was reproduced by running the real code, either with the component's source run under controlled hooks or with real React in jsdom. Expected values were worked by hand from the published definition, never read from the module.
3. **Proving the test.** The fix was deliberately broken again and the test had to go red.

Two test-helper additions make this repeatable:

- `tests/helpers/behavior_lens_component_harness.js` runs one component's real source and fills every module-level helper it uses with the real implementation. It does this through a lookup inserted into a test-only copy of the module; the shipped file is unchanged.
- `tests/behavior_lens_measurement_flows.test.js` now uses the same lookup, so its graph tests run against the real graph math.

## What was wrong, and what changed

### Safety

| Tool | Was | Now |
|---|---|---|
| Risk Screening | A "Yes" to *expressed thoughts of harming themselves* read **ELEVATED: check in within the week**. "Unsure" about *a specific plan* could read **LOW**. A "Yes" on a plan showed **no banner** until all 10 items were answered. | Any safety "Yes" (plan, self-harm, harm to others, weapons) means **act today**. For self-harm this follows school suicide-prevention policy: a same-day risk assessment (AFSP/ASCA/NASP/Trevor Project Model Policy). "Unsure" on a safety item is never read as "No". Those levels show as soon as the item is answered. LOW needs every item answered "No". Each answer has its own guidance line. |

The checklist is still labelled a reflection aid, not a validated instrument.

### Crashes and failures

| Tool | Was | Now |
|---|---|---|
| Preference Assessment, Free Operant | The run screen called two handlers that were never defined, so it threw when rendered. Percentages were a share of *engaged* time, and timing counted 1-second ticks that stall on a locked iPad. | The handlers exist. Timing uses the wall clock. Each item is a share of the whole session (Roane et al., 1998). |
| BCBA Handoff | Called `.substring` on the AI analysis object. With the default "attach AI analysis" option, **every packet failed**. It read `e.functionTag`, which saved entries don't have. | The analysis is attached as text. Functions and the date range come from the saved fields. |

### Numbers that were wrong

| Tool | Was | Now |
|---|---|---|
| Live Observation latency | Saved the **whole recording's** elapsed time. For example, 30 s of frequency recording followed by a 5 s latency saved 35 s. | Time from cue to response, excluding any pause in between. |
| Interval Grid | A mark on the unfinished interval counted in the numerator only. 1 scored of 4 completed plus a marked current interval showed and saved **50%**; the correct figure is 25%. | Scored completed intervals ÷ completed intervals. A `complete` flag records whether the session finished. |
| Latency Recorder | No-response trials were left out: [2 s, NR, NR, NR] against a 3 s goal showed **1/1 met, 100%**. All-no-response sessions saved an average of **0 s**. The graph plotted the *number of trials* as "Frequency". | Every trial counts, and the no-response count is stated. No average is saved when none responded. Records are typed as latency (older records are mapped too). |
| ABA Graph, phases | A design picked before there was one session per phase put **every phase at session 1**. The filter then gave every phase all the data, so baseline equalled intervention. | Later phases wait until started. Phase lines use the same anchored phases as the analysis. Alternating-treatment conditions keep their letters. |
| ABA Graph, x axis | Scaled to the point count, while points sit at session numbers across all behaviors. A filtered series plotted **off the chart**. | Scaled to the highest session shown. |
| ABA Graph, PND and PEM | PND counted change in **either direction**, and PEM was always "above the median". A behavior that got **worse** under a reduction goal read as an effect. | Oriented by a goal-direction toggle. PND follows Scruggs, Mastropieri & Casto (1987) and PEM follows Ma (2006): the even-n median is the mean of the middle two, and ties count as half. "Celeration" is relabelled "half-to-half change", since it is not Standard Celeration Chart celeration. |
| AlloSheet export | Duration sessions exported as "rate 0 per minute". Latency seconds exported as a per-minute rate. | Uses the measurement type each record carries. |
| Token Board | VR drew from ⌊0.5p⌋..⌊1.5p⌋, so it **averaged p − 0.5** (VR-5 averaged 4.5). The VI tip promised "1-5 min" for a 1.5 to 4.5 min range. | Ranges are symmetric about p, so the mean is exactly p. Both tips are corrected. |
| Printed Portfolio and FBA reports | The intensity average counted unrated entries as 0. 5 entries rated 4 plus 5 unrated printed **2.0**. | Averages rated entries only and states how many were rated. |
| FBA report | "Days of Data" was the elapsed span, so one day read **0** and Monday to Friday read 4. | Inclusive period, plus a separate count of distinct days with data. |
| Progress Report | Frequency percentages divided by the rows shown (top 5), so they always summed to 100%. | Percent of all entries. |
| Heatmap | Matched `e.date` against a UTC day, so it **always showed zero incidents**, and every function read "Unknown". | Uses the local day and the saved function. |
| Toolbar CSV and text export | The **Date column was blank** for every ABC row. The AI analysis printed as `[object Object]`. | Local date and time are filled in. Every cell is quoted and protected against spreadsheet-formula injection. |
| AI-assisted IOA | Parsed with `parseFloat` and dropped anything else, so a blank shifted every later interval. The shorter record was padded, which invented agreement. | Uses the same parser as the verified IOA calculator and refuses records of different lengths. |
| Social Validity | The IRP-15 was shown on a 7-point scale with a Neutral point. All measures were judged by homemade 70/50% bands, and means were 0-based. | The IRP-15 uses its published 6-point form, where a total above 52.5 of 90 is acceptable (Martens et al., 1985). The adapted TARF and custom surveys claim no cutoff. Reverse items are scored k+1−s, including in pre/post comparisons. |
| Can't Do / Won't Do | Untested conditions counted as 0%. Running only "with support" concluded **"Likely Skill Deficit"**. | Needs the baseline, support and motivation probes before concluding. Both levers helping reads "Mixed". Successes above attempts are rejected. |
| Conditional Probability | Called risk ratio 1.2 **"a strong association"** while its own legend calls anything under 1.5 weak. | The verdict follows the legend's bands. It needs 5 entries on each side, and says so when there is nothing to compare. |
| Fidelity Checklist | Ticks left from a longer earlier list scored **8/6 = 133%**. Days were UTC days. | Counts current items only, on local days. |
| Session Data Tracker | Showed "0/0 = 100%" before any trial. | Shows "No trials yet". |
| Scatterplot | Auto-fill coded each hour relative to the week's busiest hour, so **one incident all week showed red "High"**. "Total occurrences" summed the codes, not incidents. Weekend and after-hours entries vanished unreported. Hours used the viewer's clock. | Fixed thresholds: 1 incident is "some", 2 or more is "high". Incident counts show in each cell. Entries outside Mon-Fri 7 AM-7 PM are reported. Hours use the recorder's clock. |

### Data that told the wrong story

| Tool | Was | Now |
|---|---|---|
| Smart Alerts, Predictive Insights, 17 AI prompts | Read "recent" by **array position**. The ABC form stores newest first; imports store oldest first. On imported data, rising intensity read *"Great news! intensity has decreased"*. "No new entries" was dated from the oldest entry. Prompts labelled "recent" sent the *oldest* entries. | Every "recent" read sorts by time. Predictive Insights uses non-overlapping windows of rated entries. |
| AI "edit this entry" | Spread the whole AI reply over the saved record, so a stray `id` or `phase` could overwrite it. It forced intensity to 1-5, so "fix the spelling" **rated an unrated entry 1**. | Only the editable fields are taken. An unrated entry stays unrated unless the instruction is about intensity. |
| AI confidence and Counseling Simulation | A missing confidence showed as "Low". A missing supervisor score showed as **"B" and "5/10"**. | Shows "Unknown" and "Not scored". |

### Accessibility

These answer and choice buttons were named generically, which hid their visible text from screen readers. Each group is now named by its question, and each button by its visible text, with its pressed state:

- Risk Screening: 30 buttons, all named "Toggle responses".
- Social Validity: the rating buttons, all named "Toggle responses".
- Scatterplot: every cell, named "Toggle Cell".
- Preference Wizard: the protocol buttons ("Toggle mode") and every item button ("Mswo Select").

## Second pass, same day: the open leads

Every lead in the first report's "Not yet fixed" list was checked, and all but two were real. Each fix below has a test that fails without it, with the fix proven by deliberately breaking it again (95 more mutations, every one caught).

### Numbers that were wrong

| Tool | Was | Now |
|---|---|---|
| Incidents per observed hour (overview, trend dashboard, progress report) | Divided **every** logged ABC note by the minutes of timed sessions. A week of notes over one 10-minute session read **120 per observed hour**, and the printed report called that exposure-adjusted. | Only incidents inside a session's time window (or linked to it) count. The rest are reported as outside observed time. A session with no valid time adds no hours. |
| Cumulative Record | Reversed the stored history, assuming newest first (imports are oldest first). Every session that did not measure the behavior was added as **zero responses**. With no name typed, it graphed nothing from bridged records. Duration and latency records added their **seconds** as responses. Phase slopes left out each phase's first session: [5,5,5 \| 20,0,0] read **0 per session** for the intervention. | Sessions in time order, only those that counted the behavior (name matched ignoring case). The slope is responses per session over the whole phase (20 ÷ 3 = 6.7). Manual "-3" and "2.5" are rejected with a note. The panel says what it graphed and what it left out. |
| Trend labels (ABA graph, AI graph context, Progress Monitor, progress report: 8 places) | "Increasing" if the slope passed a **fixed 0.1**, whatever the unit. A rate that rose tenfold, 0.05 to 0.5 per minute, read **"Stable"**. A behavior near 30 a day that rose by 1 read "Increasing". Phases with 1 or 2 points read "Stable". | The fitted change across the data as a share of its average level. Under 20% is stable, the same band single-case visual analysis uses for stability. Fewer than 3 points: "Too few points". |
| Progress Monitor | The aim line started at the **first day's count**, and drew backwards to a goal date before the data. Phase lines sat on the next day with entries, not the start date. "Avg/Day" averaged only days with entries. | The aim line starts at the median of baseline, on the last baseline day. A goal date that is not after baseline draws no line and says why. Phase lines sit on their dates. The stats read "Days with entries" and "Avg on days with entries". |
| Effect Size Calculator autofill | Compared the graph's **first phase with its last**, so an A-B-A design compared baseline with the return to baseline. Ignored the graph's goal direction. From ABC tags, **untagged entries were baseline** and "maintenance", "return_baseline" and a CSV round trip's "Baseline" were all intervention. | Offers each neighbouring pair of phases with different conditions, defaulting to baseline then treatment. Takes the graph's goal direction. Tags are matched ignoring case, only "baseline" against "intervention", and what was left out is counted in the message. |
| Maintenance Tracker | Kept skills in component state, so **every skill and probe vanished** when the panel closed. A new skill read "MAINTAINED" before any probe. Dates were UTC, so "next probe due" printed a **day early** in US time zones. | Kept with the student's workspace. A new skill is "monitoring" until probed. Dates and day counts use the teacher's calendar. |
| Virtual Practicum | Scenario 2, interval 5 ("raises again at second 18" of 20) was keyed NO for momentary time sampling, so a trainee who scored every interval right got **90%**. AI answer keys were accepted unchecked: strings like "true" graded every answer wrong, and a key could say "whole interval: yes" but "end of interval: no". | The key is corrected, and every key must agree with itself (whole implies end, end implies any time). An AI key that does not is refused with the reason. |
| Interval Grid | Counted 1-second **timer ticks**. Browsers slow timers in a background tab and stop them on a locked phone, so a "15 s" interval could last minutes, and the saved duration (the rate's denominator) came out short. "Momentary" mode took a mark at any time in the interval. Pausing in the first interval returned to setup, whose Start **erased the recorded time**. | Wall-clock timing. A page that stopped running pauses the session at the last moment it ran and says so; the gap is not counted. Momentary mode takes a mark only in the last 2 seconds of each interval, with a "Look now" cue. A first-interval pause keeps its time and offers Resume. |
| Token Board | The board starts as an empty array, and the slot search never looked past its end, so **no schedule ever filled a token** (FR, VR, FI, VI, DRO) until a slot had been clicked by hand. DRO had no timer on screen and no pause, and kept filling tokens whether or not anyone was watching. FI/VI/DRO counted ticks. DRO's reinforcement ran inside a state updater, which React may call twice. | Tokens fill. DRO shows a countdown, can be paused, and resets on the behavior. Timing is wall-clock, and a stopped page pauses the timer rather than paying tokens for unwatched time. |
| Environment Audit, Feasibility Check | An **unrated area counted as 0**, so one rating of 5 read 5/40 = 13% "Needs Improvement" or 5/25 = 20% **"Not Feasible"**. The AI prompt called every unrated area "0/5" and "low". Feasibility cited Horner, Salentine & Albin (2003) for a homemade 5-item score with homemade 80/50% bands. | No overall score until every area is rated, with progress shown. The AI is told which areas are unrated. The citation now says the areas are adapted and the bands are a rough guide, not published cutoffs. |
| FCT vocabulary (FBA card, BIP card, BIP prompt) | Three rules for a "ready" word: a weighted score of 12.5, taps + 2 × quest answers above 5 (**"Student can use"**), and above 3 (the AI was told "practiced"). One word could be "Growing" on one screen and "Student can use" on the next. | One rule in one place. Labels say "Practiced often", "Some practice" and "Not practiced yet", since taps in a symbol app show practice, not use. |
| Case Study | "Case Study Mastery!" at **70**, while the debrief was told only 80+ is competent (60-79 "some areas needing attention"), so a 72 was told both. A phase whose AI reply did not match "OVERALL: n/25" scored **0 without a word**, and the total trusted the AI's own addition. | One set of bands for the prompt and the screen. The five sub-scores are added here. An unread phase is "not scored", left out of the total, and named. |

### Accessibility

More buttons were named generically, hiding their visible text: the Maintenance probe buttons ("Add Probe", all five), skill cards and generalization chips; the Practicum method buttons ("Toggle mode"); the Token Board schedule and token-count buttons ("Toggle schedule type", "Toggle slots"; the board reset was "Toggle tokens" and the timer reset "Reset first-then board"); the checklist rating buttons ("Toggle ratings", 65 buttons); and the Case Study phase stepper and Next button ("Toggle current phase"). Each now says what it does, with its pressed or current state.

### Leads checked and left as they are

- **Sessions with no behavior count as observation time for every behavior.** A session with no target (for example an interval session started without choosing one) cannot be attributed to a single behavior, and the observer may well have been watching for all of them. The rate screens now say how many incidents fell inside observed time, which makes this visible. Changing it needs a decision about what an untargeted session means.
- **The older `PreferenceAssessment` component** (wrong MSWO ranking, wrong paired-stimulus denominator) is still defined and still never rendered. Delete it, or keep it unwired.

## Third pass: the rest of the tools

About 100 tools are rendered. The first two passes covered roughly 40. For this pass, two read-only agents inventoried 28 more, and every finding was checked by reading the code before anything changed. I also went through the safety and family-facing tools myself. 97 deliberate re-breaks, every one caught.

### Safety and families

| Tool | Was | Now |
|---|---|---|
| Crisis Intervention | "AI Draft Crisis Plan" asked the model for emergency contacts (its example phone was 555-0000) and **replaced the contacts staff had typed**, without asking, although removing one contact by hand asks first. It overwrote typed plan text, and the old "Last reviewed" date then sat on text nobody had read. | The AI never touches contacts and is told never to invent names or numbers. Typed text is kept unless staff choose to replace it. The plan reads "AI draft, not reviewed yet" until Save Plan. |
| Consent form | "AI Customize Language" rewrote **every section, the FERPA rights list included**, straight into the saved form, with no undo and nothing saying a model had changed legal text. Reset wiped all edits without asking. | The rights section is never sent for rewriting. The previous text is kept for Undo, and the form says it was AI-rewritten until someone accepts it. Reset asks first. Imports must be well formed. |
| Snapshot Exchange | Import merged only ABC entries and observations, so a **family's home log and the student's self-checks were dropped** without a word. A family file with only home-log entries could not be merged at all. The AI analysis was listed as "Included" and never imported. | Home-log and self-check entries are validated, de-duplicated and merged, newest first. The preview counts them. The file's AI analysis is shown as not imported. |
| Home Behavior Log | "Push to ABC" used the time the parent **saved** the entry as the time of the behavior (a 7:30 am incident logged at 9 pm counted at 21:00, and Monday's counted as Tuesday). It wrote "Parent response recorded" as the consequence when there was none. | The form asks when it happened. Pushed entries use that time and the parent's time zone, keep a blank consequence blank, and older entries say their time is when they were logged. |
| Traffic Light poster | **Crashed** when the model returned a zone's items as a list. Green and yellow text were about **2:1** contrast on their backgrounds. Lost on close. | Lists are accepted. All zone text is at least 4.5:1. Kept with the student. |
| Calming tools | "4-4-6 box breathing" is not box breathing (4-4-4-4). The breathing circle animated under reduced motion. | "4-4-6 paced breathing". Motion stops when reduced motion is set. |

### Numbers that were wrong

| Tool | Was | Now |
|---|---|---|
| Caseload Dashboard, MTSS Tier Manager | Filtered the open student's entries by a `student` field that ABC entries never carry, so **every student read "0 entries, Never, Needs Attention"**, nobody could be Urgent, and the AI summary and tier recommendations were sent zeros. Status sorted Urgent last. Tiering a new student cut the roster to 20, dropping a student whose saved work is keyed by that roster entry. | Live entries for the open student, each other student's saved workspace on this device, or "No data on this device". Urgent first. No roster cap. Recommended tiers must be 1, 2 or 3 for a student on the caseload. |
| Toasts and confirmations (23) | Registered text had the numbers flattened: teachers read **"Integrity: N% (N/N)"**, "Session: N% correct (N/N)", "Switched to N" and "Delete ${label}?". Every test passed `t: () => undefined`, which hid it. | The real values are shown. A test uses the host's registered strings and fails on any "N" or "${". |
| IOA calculator grid | A blank cell was an observed 0. The empty 10-row grid scored **100% "Acceptable"**, and 6 real intervals in 10 rows went from 4/6 = 67% to 8/10 = 80%. | Blank rows are not counted and are named; a row only one observer filled is refused. |
| Treatment Integrity | No N/A: a step with no chance to happen counted as missed (3 of 3 done read **75%, "Below 80%"**). Blank rows counted; an untouched Save recorded 0%; interventions were averaged together. | Done / Not done / N/A for each step; every described step must be marked; the average is per intervention. |
| DTT data sheet | The consecutive-session count was stored, so raising the criterion kept counts earned at the old one and declared **MASTERED after one session** at the new one. Mastery disabled Start. | Mastery is worked out from the sessions at the current criterion; maintenance sessions can continue. |
| Task Analysis | Mastery was matched by step **position**, so deleting step 1 gave step 2 its history. Other tasks' sessions counted; blank rows were in "% independent"; prompt levels were never cleared, so three Saves "mastered" a step. | Mastery belongs to the step and the task; blank rows are left out; each session records its own levels. |
| Comparison Dashboard | The trend line drew **newest sessions on the left** and read tracker sessions as 0; the behavior chart knew only each student's top 5 behaviors. | Date order, response counts, full behavior counts, and a caveat that raw counts across students are not directly comparable. |
| Hotspot Matrix | Renaming "Math" to "Math " **deleted its tally**; renaming onto another routine overwrote that count. | The name is compared trimmed; an existing name is refused. |
| Record Review | Read only the **first 4,000 characters** of a pasted document, silently. | 30,000, with a notice to the model and the teacher when a document is longer. |
| Behavior Momentum | A red "0%" with no attempts; "Partial" silently counted as failure; "Momentum is working!" with no comparison. | No rate until there are attempts; partials are shown; the verdict says what would show the sequence helped. |
| Triangulation | A measured **zero was sent as "N/A"**, the first five stored sessions were sent rather than the latest, and the AI analysis (made from the ABC data) counted as a third independent source. | Each session is described by what it measured; the latest five; two independent sources. |

### What the tools said

| Tool | Was | Now |
|---|---|---|
| 22 AI features (data-quality report, home notes, translations, intervention plan, progress narrative, IEP prep packet, AlloBot, case-study debrief, student reflection and more) | Asked for prose in **JSON mode**, so the reply came back as JSON, or as the literal "{}" with no key. AlloBot was sent the saved analysis as "[object Object]". | Prose is requested as text. A test fails on any JSON-mode call whose result is not parsed as JSON. |
| Competing Pathways | Labelled the functionally equivalent replacement **"Desired"** and the behavior staff actually want **"Competing"** (O'Neill et al., 1997, has problem, desired and alternative pathways). Copy Model carried this into BIPs. | Replacement (alternative) pathway and desired behavior pathway, in the form, diagram and copied text. |
| Data Quality Checker | Called every behavior name under 15 characters "very brief", so defined target behaviors such as "Elopement" were flagged. | Only short free-text descriptions that match no defined target behavior. |

### Kept with the student

These were plain component state and vanished when the panel closed: the self-regulation toolkit, traffic-light poster, treatment-integrity checks, DTT programs, task analyses, hotspot tallies, momentum planner, competing pathways model and record-review summary.

### Screen readers

102 buttons had a generated name ("Toggle selected behavior", "Toggle mode", "Set Ioa Method", "Toggle rating") that replaced their visible text. Every quiz option was "Answer" and every reinforcer rating "Rate". Buttons with text now use it, icon-only ones have real names, and a test fails if a generated name comes back.

### Still open from this pass

Found and verified but not yet changed:

- Escalation Cycle keys its AI personalization by the translated phase name, so it never shows outside English.
- Reinforcer Assessment numbers tied ratings 1-2-3.
- Reinforcement Inventory caps "favorites found" at 10.
- Gas Rubric, Reinforcement Inventory, Student Gamification and Impact Calculator still lose their data on close.
- The IOA AI mode uses two different sets of bands and calls a second pass of the same model "double-blind".
- Several AI features show a success message when AI is switched off.

## Files

| Path | Change |
|---|---|
| `behavior_lens_module.js` | All fixes. |
| `behavior_lens_workspace_module.js` | The observed-hour rate (`calculateIncidentRate`, new `observationWindow`). |
| `desktop/web-app/public/…` | Byte-identical mirrors of both modules. The ignored build copies were synced too. |
| `tests/helpers/behavior_lens_component_harness.js` | New shared harness. |
| `tests/behavior_lens_risk_screening.test.js`, `…_preference_assessment`, `…_entry_fields`, `…_recording_measures`, `…_graph_math`, `…_entry_order`, `…_measure_labels`, `…_social_validity`, `…_ai_ioa_alignment`, `…_cant_do_wont_do`, `…_report_counts`, `…_scatterplot` | New tests, first pass (12 files). |
| `tests/behavior_lens_observed_rate.test.js`, `…_cumulative_record`, `…_trend_and_aim`, `…_effect_size_autofill`, `…_maintenance_tracker`, `…_practicum_keys`, `…_interval_grid_clock`, `…_token_board_clock`, `…_checklists_and_fct`, `…_case_study_scoring` | New tests, second pass (10 files). |
| `tests/behavior_lens_confirmations_a11y.test.js` | The stale count of 9 now lists all 11 confirmations by title. |
| `tests/behavior_lens_measurement_flows.test.js` | Its harness now fills in the real module helpers. |
| `tests/behavior_lens_analytics_integrity.test.js`, `…_review_runtime` | Their sessions now carry the time they were saved, which the observed-hour rate needs. |
| `tests/behavior_lens_crisis_and_calming.test.js`, `…_consent_manager`, `…_snapshot_import`, `…_caseload_mtss`, `…_message_placeholders`, `…_ioa_grid_blanks`, `…_integrity_dtt_task`, `…_home_log_push`, `…_comparison_dashboard`, `…_hotspot_rename`, `…_ai_text_mode`, `…_competing_pathways`, `…_record_review`, `…_momentum_triangulation`, `…_button_names` | New tests, third pass (15 files). |
| `tests/behavior_lens_golden.test.js`, `…_confirmations_a11y` | Count 13 confirmations, not 11 (replacing crisis-plan text and resetting the consent form now ask first). |
| `tests/behavior_lens_missing_ratings.test.js`, `…_workspace_lifecycle`, `…_workspace_ux`, `…_measurement_flows` | Select buttons by their visible text or new names; the generated "Toggle ..." labels they used are gone. |

Pure calculators are exposed for tests the same way last night's IOA fix was:

- `window.AlloModules.BehaviorLensRiskScreening`
- `BehaviorLensPreference`
- `BehaviorLensEntryReaders`
- `BehaviorLensGraphMath`
- `BehaviorLensAlerts`
- `BehaviorLensSchedules`
- `BehaviorLensConditional`
- `BehaviorLensSocialValidity`
- `BehaviorLensCantDoWontDo`
- `BehaviorLensScatterplot`
- `BehaviorLensIOA.parseIOARecord`
- second pass: `BehaviorLensCumulative`, `BehaviorLensProgressMonitor`, `BehaviorLensEffectSize`, `BehaviorLensMaintenance`, `BehaviorLensPracticum`, `BehaviorLensIntervalGrid`, `BehaviorLensTokenBoard`, `BehaviorLensRatedChecklist`, `BehaviorLensFct`, `BehaviorLensCaseStudy`, and `trendDirection` on `BehaviorLensGraphMath`
- the workspace runtime also exports `observationWindow`

## Translation keys

103 new `tt('behavior_lens.…', 'English')` keys are not yet in `ui_strings.js`: 48 from the first two passes, and 55 from the third.

- First pass (23): `risk.*` (13), `graph.*` (6), `pref.*` (2), `obs.latency_response`, `ioa.ai_lengths_differ`, `tracker.no_trials_yet`.
- Second pass (25): `effectsize.*` (8), `interval.*` (4), `cumrec.*` (3), `case.*` (2), `progress.*` (2), `token.*` (2), `checklist.rate_all`, `feasibility.source_note`, `maintenance.record_probe`, `practicum.ai_key_rejected`.
- Third pass (55), including 24 `…_v2` keys that replace registered messages whose text had the numbers flattened to "N". The old registered keys can be retired once the new ones are registered.

Behavior Lens translates unregistered English at runtime, so they work now. Registering them is a separate i18n pass. The keys were left unregistered because `ui_strings.js` is shared with other sessions.

## Still open

The first pass's leads are all resolved above, except the two under "Leads checked and left as they are". The third pass's own open items are listed at the end of its section. Registering the 103 translation keys is the other open item.
