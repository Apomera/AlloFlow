# Behavior Lens: calculations and safety checks, 2026-09-23

Every number Behavior Lens shows, prints or exports was checked against its published definition. So was every threshold that turns a number into a label. The work ran in seven passes over two days. **The first fixed defects in 27 reachable tools** (17 AI prompts counted as one). **The second worked through the first pass's open leads and fixed 13 more.** **The third went through the remaining tools and fixed about 25 more**, plus two cross-cutting problems: 22 AI features asking for prose in JSON mode, and 102 buttons with generated screen-reader names. **The fourth covered the last 36 tools and fixed about 60 more**, plus three cross-cutting problems: 32 tools that lost entered data when their panel closed, 61 AI calls that claimed success (or showed an error) with AI switched off, and 13 more generated screen-reader names. For each fix:

- a test reproduces it and was proven to fail without the fix;
- a deliberate re-break of the fix, restored afterwards from a saved copy, turned that test red (71 such mutations in the first pass, 95 in the second, 97 in the third, 144 in the fourth and 61 in the fifth, every one caught; in the sixth, 76 of 78, and in the seventh 71 of 72, with the survivors explained).

**The first three passes were committed as `ea152912b` (on origin/main). The fourth to seventh passes are not committed:** they are in the working tree for Aaron to review.

The full Behavior Lens suite (`tests/behavior_lens*`, `tests/behaviorlens_i18n.test.js`) was 285 of 286 passing before this work (one stale test). After the first pass, with 12 new test files, it was 375 of 375 in 49 files, and after the second 453 of 453 in 59. After the third, with 15 more, it was 520 of 520 in 74 files. After the fourth, with 5 more, it was 635 of 635 in 79 files. After the fifth, with 6 more, it was 682 of 683 in 85 files (a golden test pinning the old roster-id code, since updated). After the sixth, with 3 more, it was 723 of 728 in 88 files. The five failures were golden tests: four snapshots whose first render now shows the Family view the host has always chosen when it is not in teacher mode (it used to take one more render), and the pin on the old small-sample count. The snapshot changes were read line by line, then re-baselined, and the golden file passes (44 of 44). After the seventh, with 4 more, the last full run was **770 of 771 in 92 files**. The one failure was a third-pass test pinning the 250-entry snapshot cap, which this pass removed because it deleted entries already there; it was updated and passes (4 of 4). Under heavy machine load, a few timing-sensitive mounted tests (`workspace_lifecycle`, `daily_sessions`, `connected_workflows`) can time out, and vitest sometimes fails to start a worker; each file passes when run alone.

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

The six items listed here were all fixed in the fourth pass, below.

## Fourth pass: the last tools, and what survives closing a panel

Two more read-only agents inventoried the 36 tools no earlier pass had covered, and every finding was checked in the code before anything changed. The open items from the third pass are fixed too. 144 deliberate re-breaks, every one caught.

### Crashes, blank screens and wrong times

| Tool | Was | Now |
|---|---|---|
| ABC log | Sorting by Intensity **crashed the log** (it called a text comparison on a number). An unrated entry was read out as "Intensity: 0 out of 5". | Sorts by rating with unrated entries last; "Intensity not rated". |
| Natural-language notes, voice transcript | Every entry was stamped with the moment the notes were **parsed**: a 9:15 incident pasted at 3:40 pm counted at 15:00, and on the wrong day if parsed the next morning. Entries skipped normalization, so they had no time zone or local day. The model had to fill in a consequence and a function the notes never stated. | The stated clock time is used on a date the teacher picks, and either can be edited before adding. With no stated time, the time of adding is used and the card says so. Nothing unstated is filled in. |
| Guided workflow, skill tracker, PD path | "Open Live Observation", "AI Analysis" and "Interval Recording" opened an **empty panel**, and skipped the check that a student is selected. | They open through the same launcher as the hub. A test checks that every step's tool id opens something. |
| Overview, trend heatmap, predictive insights, report grid | Day and hour came from the **viewer's** clock, so for a viewer in another time zone, a 9:30 pm Monday entry counted as Tuesday. The student context sent to the AI dated session notes by their UTC day. | The recorder's clock (the entry's saved offset), as the scatterplot already did; notes by their local day. |
| AI features with AI switched off | 61 AI calls showed "generated" over an empty result, or an error right after the "AI is off" message. | Each returns quietly on no reply. A test checks every AI call. |

### Numbers that were wrong

| Tool | Was | Now |
|---|---|---|
| Registered text over the data | Nine more messages had registered text that replaced the data in their fallback. IEP goals read **"Goal "** and "Objective " with no goal. The data-quality grade read "Dataset grade". Two tips said the **opposite** of their condition ("Entries are well spread across days" when all data was from one day). | The real values are shown. A test fails on any registered key whose fallback carries data. |
| Reinforcer assessment | Four items all rated 5 were numbered 1, 2, 3 and **the fourth was left out**. | Ties share a rank (1, 1, 1, 1) and every item ranked 3rd or better is shown. |
| Reinforcement inventory | "10 favorites found" with 14. A custom item named like a listed one was counted twice. | Counts every favorite; refuses a duplicate name. |
| Replacement-behavior trials | The trend compared counts from windows of different sizes: I, I, I, I, I, F (100% then 80% independent) read **"Trending Up"**. | Compares the independent rate over the last 5 trials with the 5 before. |
| Check-in streak | Midnights compared by elapsed time, so the 25-hour day when clocks fall back **broke a real streak**. A streak that ended weeks ago still showed as current. | Calendar days on the student's clock, current only through yesterday; badges keep the longest run. |
| Impact calculator | Time lost used 36 weeks of the days entered, but cost per minute always used 180 days (a 4-day week understated cost by a fifth). $0 and 0 days silently became $15,000 and 5 days. | One school year for both, zero means zero, whole dollars, and the 6.5-hour day is stated. |
| IEP goals, IEP prep | The goal prompt called 15 undated entries "N entries" and sent none of the observations counted on screen; unrated entries went as "null/5". IEP prep sent the three **oldest** sessions as current, and the analysis as JSON cut at 500 characters. | Dated entries, "the 15 most recent of N", the latest sessions, the analysis as text, "not rated". |
| MI practice | A reply with no score counted as 3 of 5. | Not scored, and left out of the average. |
| Cultural reflection | Counted only "Yes", so N/A lowered the score: 5 Yes and 3 N/A said "revisit the Not Yet items" with none marked. | Based on the questions that apply. |
| Bias monitor | Counted the preset "Task removed" (escape) as a punitive consequence. | Only exclusionary ones such as "removed from", "sent to", detention. |
| Latency recorder | Save did not clear the trials, so a second Save **recorded them twice**. | Save clears them. |

### AI drafts that overwrote staff work

- **Behavior contract**: "AI Draft Contract" kept the previous contract's **signatures on the new terms**, so a new record and its printout showed a student signing terms never shown to them. A "{}" reply blanked every field. It now asks first, clears the signatures, and rejects an empty reply.
- **Pocket BIP, GAS rubric, escalation cycle, task analysis**: an AI draft replaced typed text without asking. They now ask first. Pocket BIP prints the whole text (a one-row box printed one line of a 2-3 step plan). The GAS rubric reads a reply keyed "+1"/"+2". The escalation cycle's personalization is keyed by phase id, so it shows in every language. The task analysis sent the student's name as the JSON-mode flag.
- **Home note**: regenerating lost the edited note with no undo. It now keeps the edit for Undo AI.
- **ABC form quick fill**: overwrote typed fields and pre-filled an intensity nobody gave. It now fills only empty fields and uses a time the teacher stated.
- **AlloBot**: was sent the newest entry as JSON cut at 200 characters (ids and timestamps, with no A, B or C), plus the student context twice. It now gets the five latest entries as text.
- **MI practice**: sent the open student's profile and notes into a fictional role-play. It no longer does.
- **FCT template**: switching the function kept the previous function's phrase ("I need a break" for attention).

### Kept with the student

These were plain component state and vanished when the panel closed:

- ABA graph: manual, multiple-baseline and alternating-treatment data, and titles.
- Scatterplot grid, risk screening, BIP draft.
- Social-validity results kept "for pre/post comparison".
- Latency trials, cumulative record, effect-size data.
- Token board, DTT session in progress.
- Replacement-behavior trials, replacement plans, antecedent modifications, relationship map.
- Family voice entries, family contact log, restitution plans (after "Restitution plan saved").
- Cultural reflection, GAS rubric, reinforcement inventory, check-ins, impact inputs.
- Pocket BIP, home note, IEP drafts, FCT plan.

Related fixes:

- The session tracker's history now lists the saved sessions. It showed "(0)" after reopening.
- Single-case design opens on the saved design and phases. It opened blank, and choosing the design again replaced the saved phase starts.
- The PD learning path remembers completed modules on this device, like the skill tracker.
- The family contact log records the day a contact happened.
- A saved restitution plan can be reopened, and the 21st no longer drops the oldest.

### Privacy

- Every share role carried the **whole profile, including staff notes**, whatever the role card said.
- A parent share's strengths were always empty.
- Nothing said the code is not encrypted.

Now the parent share has strengths, a summary labelled as an unreviewed AI summary, and strategies. The teacher share has the profile without notes. Sharing asks first and says the code is readable by anyone who has it.

### Asked first, named properly

- 17 more actions ask before they destroy or send data (32 confirmations in all): deleting saved records, clearing entered data, AI drafts over typed work, changing a design, sharing.
- 13 buttons were named from handler names ("On Analyze", "Run Second A I Pass", "Select M S W O") or had one name for every item: every quiz option, suggested goal, restitution plan, MI scenario and preference item a student could pick. A test fails if a generated name comes back.
- The notes mic always said "Listening... speak now". Note buttons were invisible until hovered.
- The IOA second AI pass was called "double-blind" and graded "Acceptable", a reliability verdict, though it is the same model run twice. It is now a consistency check.
- The ABA graph's alternating-treatment hooks ran after an early return, so the number of hooks depended on the design. They now run before it.

## Fifth pass: problems that repeat across tools

This pass swept the whole module for patterns rather than tool by tool, then closed the fourth pass's open items, and ended with two read-only audits of the reports and the student workspace. 61 more deliberate re-breaks, every one caught.

### Copying, printing and dates

| Area | Was | Now |
|---|---|---|
| Copy buttons (30) | 17 said **"Copied!" without waiting** for the clipboard. The clipboard is often blocked where AlloFlow runs (a sandboxed frame), so a teacher could paste an empty clipboard into an IEP. The other 13 showed nothing when the copy failed. | One helper tries the clipboard, then the older copy command. The success message shows only when the text was copied; otherwise it says to select the text and press Ctrl+C. |
| Print buttons (18 tools) | `window.print()` printed the page. The tool sits in a fixed, scrolling overlay, so the browser printed **the part on screen, over the app behind it**, and a text box printed only the lines in its box. Measured in Chromium with the same layout: 29 of 150 lines, all of the app behind, and 0 of 40 note lines. | For the length of the print, everything outside the tool is hidden, the tool's containers stop clipping, and each field prints its full text: 150 of 150 lines, none of the app, 40 of 40. |
| IEP goals "Copy All" | Left out each goal's measurement method and schedule, the objectives' criteria and dates, the progress-monitoring plan and the interventions; printed "undefined" for anything missing. | Everything the generator produced. |
| AlloSheet export | Grouped entries by their **UTC day**: a 9 pm entry was summarised under the next date. | The recorder's day. |
| Demo sandbox | Saved date-only entries, which normalize to UTC midnight: every demo incident landed about **8 pm the evening before**, so the time-of-day charts showed a pattern that is not in the data. | Real timestamps, with the current field names. |
| Manual graph points, file names | Dated by the UTC day (tomorrow's date after 8 pm Eastern). | The local day. |

### Records that were silently deleted

Each of these **deleted the oldest record** without a word:

- the 21st saved behavior contract, signed or not;
- the 11th reinforcer snapshot and the 11th momentum sequence;
- the 251st home-log or self-check entry (a family logging daily can reach that in a school year);
- the 51st token-board session.

None of them is capped now. Only the AlloBot chat still keeps its last 30 messages.

### The fourth pass's open items

| Tool | Was | Now |
|---|---|---|
| Preference assessment wizard | Kept nothing: a finished assessment, its results and the AI summary were lost on close. The BIP generator read a storage key that **only the demo sandbox ever wrote**, so every real BIP said "No formal preference assessment generated." MSWO results listed the last two items **twice**, the second time as "Tied - Unselected". | The wizard's state, results and free-operant clock are kept with the student, and each result is summarised where the BIP generator reads it. MSWO lists each item once. Starting a new assessment asks first. |
| Definition builder | Choosing another target replaced an unsaved definition. | Asks first. |
| Replacement planner "AI Suggest" | Replaced typed fields, and said "applied" when the reply had no replacement. | Asks first; an empty reply is an error. |
| Observation coach | "7/10" from the model showed as **"7/10/10"**, and its colour bands compared text. | The number is read out of the reply, and the screen says which entries the score is based on. |

### Exports and reports

Found by a read-only audit of every report and export path, then checked in the code.

| Area | Was | Now |
|---|---|---|
| Toolbar session CSV | Read `count` and `rate` off every record. A Session Data Tracker session exported an **empty row**; a duration exported its seconds as "Count" and 0 as "Rate"; a latency exported its trial count as "Count" and seconds as "Rate". | One row per measurement with its type, value and unit, on the recorder's day, newest first. |
| Observation copy / download | Read `s.type` (sessions have `method`): every row was "Type:  \|" with no result, saved unescaped as `.csv`. | Method and result for each session, as a real CSV; anything else downloads as text. |
| Order of exported logs | Stored order, which is mixed: the form prepends, imports append, a merge sorts oldest first. | Newest first in every export, report and printout. |
| "The most recent sessions" | IEP prep, IEP goals, the hub list and the profile prompt took the first (or last) N stored sessions. **After a snapshot merge those were the oldest.** (The fourth pass's IEP prep fix had assumed newest-first storage.) | Sorted by time first. |
| Export panel | "Last 7 days" was a rolling 168 hours; latency results were blank; the text export printed no duration result; "3/10" opens in a spreadsheet as 10 March; no function column. | Calendar days as in the progress report, every result in words, a function column. |
| Progress-report chart | Quarter ticks labelled by rounding: with a peak of 3 the lines at 0.75 and 1.5 read "1" and "2", so **points sat beside the wrong labels**. | Whole-number ticks. |
| AlloSheet | Rolling windows; a day with no recorded durations exported **"0 seconds"**. | Calendar days; blank when nothing was recorded. |
| FBA report temporal grid | Colours relative to the busiest cell, so **one incident all week read red "High"**; weekend and out-of-hours entries dropped without a word. | Fixed levels (1, 2-3, 4+) and a count of what is not shown. |
| Phases | In the portfolio, anything but exact lowercase names was badged A' (return to baseline): "Baseline", "Condition A", "Intervention (B)". "Baseline" and "baseline" were two rows in the FBA phase table. | Recognised however they are written; others show their own name. |
| Parent progress report | Included the staff's free-text notes by default. | Left out, as in the parent share. |

### Switching and restoring students

Found by a read-only audit of the workspace lifecycle, then checked in the code.

| Action | Was | Now |
|---|---|---|
| "Switching" to the student already open (Caseload "View", Compare "Switch", loading the demo twice) | **Reset or reverted the whole workspace and saved that**, locally and to the cloud, because the name did not change and nothing reloaded. Reproduced in the mounted app. | Does nothing. |
| Quick switch "Clear" | Emptied the roster. The open student **stopped saving** (no roster id) while the screen still said changes save automatically, and every student's saved work was unreachable: adding the same name again minted a new id. | Asks, and keeps the open student. Adding a name again finds that student's saved work (when there is exactly one). |
| "Load workspace from file" | Replaced the saved workspace **without asking**, so restoring last week's backup erased this week's entries. Import warnings were never shown. | Asks, with both copies' entry counts and dates, and shows the warnings. |
| A cloud conflict | Showed, and acted, on whichever student was open. **"Replace cloud with local" could overwrite another student's cloud copy.** "Use cloud copy" did not ask. | Tied to its student, with a note when it belongs to another. Both choices ask. |
| Profile CSV import | A CSV with only names and grades **erased accommodations** and replaced staff notes. | Blank cells keep what was saved; notes are added to. |

### Checked and clean

These sweeps found nothing, and each now has a test that plants a mistake to prove it can fail:

- every `tt()` message placeholder has a value (1,723 calls);
- every registered `t()` key used without a fallback exists (108 calls);
- no non-button element is clickable without a keyboard route;
- no tool sorts an array it was handed in place.

## Sixth pass: the workspace, the family view and the AI analysis

This pass closed four of the fifth pass's open workspace items, then acted on two read-only audits: one of the family and student views, one of the AI analysis. Every finding was checked in the code before anything changed. 78 deliberate re-breaks: 76 caught, and the other two explained under "Checked and left".

### The workspace

| Situation | Was | Now |
|---|---|---|
| A save fails (browser storage full), then you switch student and back | The unsaved changes were **lost**: switching back loaded the last good save. The next successful save for any student hid the warning. | Switching back reopens the unsaved changes, with a warning to free space or export a backup. The warning stays until every waiting save has gone through. |
| Two tabs open | The quick-switch roster was last-writer-wins: a student added in one tab **dropped out of the other's roster** at its next save. | Each tab merges the other's roster in (a student removed in this tab stays removed). |
| Saved tool data over the size limits | 512 KB of tool data, strings over 20,000 characters or lists over 1,000 items were **dropped without a word** when the workspace loaded. The whole tool state went if the total was over. | 2 MB, 100,000 characters and 10,000 items. Anything still over is dropped largest first, and a message names the tools affected and says to export a backup. |
| Opening a student in a second tab | The first tab showed **"Another tab changed this student"**: the second tab re-saves what it loads, with a new save id. | Only a real change counts (the save id, time and revision are ignored in the comparison). |

### The family view

Behavior Lens's Family view is a switch inside the teacher's workspace (the host always opens Behavior Lens as a teacher), so it is a view for showing families, not a locked mode. Until now its only rule was the filter on the hub's tool cards.

| Area | Was | Now |
|---|---|---|
| The role | Saved with each student and restored with them: switching student in the Family view brought back the teacher view, and a teacher who had shown the Family view **reopened that student in it**. Family off always went to the teacher view, even from the specialist view. | The role belongs to whoever is at the device. The staff choice (teacher or specialist) is remembered on this device; Family view is not saved, and turning it off returns to the view you came from. |
| Other students | The Today picker, Quick switch and the setup list showed **every student in the class**. | Family view shows one student. |
| Workspace files | "Download backup" exported the **whole workspace** (staff notes, team notes, the profile, the audit log), and "Load workspace" could replace it. | Not offered in Family view. |
| All tools | The staff profile editor with its notes, the AI analysis and summary, the staff alerts ("consult your BCBA") and heatmap links into staff tools. | Left out; the heatmap itself stays. |
| The Overview | "Edit observation" opened the staff ABC form, and the support and report buttons opened staff tools. Each note showed the observer's name and the staff's notes. A layout saved by staff opened it as a document with **their review notes**, which also hid the notes list. The 📤 menu exported every record and offered AlloSheet. "Related tools" linked to the ABC data and the AI analysis. | No staff buttons, observer names or staff notes (the family's own home-log notes stay), no document layout, no 📤 menu, and related links only to family tools. "Record an observation" opens the home log. |
| AI replies a family or student reads | The home log, home note, family voice, pocket plan and snapshot tools, and the student's self-check, self-regulation and traffic-light screens, sent the AI the **staff notes, known triggers, accommodations and recent session notes**, which a reply could repeat. | The student screens always send only interests and strengths. The family tools do the same in Family view; staff keep the full context. |
| Home log "Push to ABC" | An entry staff had **deleted came back** with the next push. Pushed entries had no source or observer ("Observer: Not recorded"). | Each entry is sent once. Pushed entries say they came from the family's home log. |
| Snapshot sent from Family view | Labelled as from the educator, with every school record and observation session included by default. | From the family, with the school records left out unless ticked. |

Family view can still be switched back to the teacher view with one click, and Escape still closes Behavior Lens. Making it a locked mode (a PIN, a kiosk mode for the student screens) is a product decision.

### The AI analysis

| Area | Was | Now |
|---|---|---|
| An analysis of data that has since changed | Only the Overview and the progress report checked. The hub card, the "Ready" badge, the alerts, the exported text, the BCBA handoff, IEP prep, the full summary, the parent share and 19 other tools **reused it as current**. | Marked "Out of date" with a button to run it again; tools, exports and summaries leave it out until then. |
| After a reload | **Every analysis read as out of date**: a reload turns the entries' behavior labels into targets, and the targets were part of the comparison. | Compared with the data as a reload loads it. Analyses saved before this change are read the way they were saved. |
| The reply | An array, `{}` or unrelated JSON was saved as the analysis (an **empty card replaced the saved one**). Any text was taken as the function, so "Escape-maintained" did not match Escape, and an unknown answer was drawn in Attention's blue with its eyes icon. Patterns written as sentences were dropped. | An empty reply is an error and the saved analysis stays. The function is matched to the named ones (Escape, Attention, Tangible, Sensory, Multiple, Unknown); anything else is kept as said and drawn in a neutral colour. Sentences are kept. |
| The hub card | Never showed the model's own caveats or what the analysis was based on. The small-sample warning counted **today's** entries. | Shows both, and counts the entries it analyzed. |
| The sample | Always began with an undated entry, and was described (to the model and on screen) as "stratified-across-date-range". | Undated entries go last, and it is described as what it is: entries spread evenly through the records in time order. |
| Clinical progress report | Printed each pattern as **raw JSON**. | Words: the pattern, how often, the evidence. |
| Alerts | A saved entry with no date counted as **1 January 1970**, so the average rate was near zero and any three recent entries were a "frequency spike"; an empty date turned the check off. "Intensity has increased" fired on any 3 of the last 4 steps, dips included. A dismissed alert **never came back**, whatever happened next. | Undated entries stay out of the time maths. Intensity has to rise (or fall) at each of the last three steps. A dismissal covers the alert as it was: a new severe incident, a new gap or a new day brings it back. |
| Recent sessions on the hub | Divided by the planned intervals (a session stopped at 8 of 20 read "3/20"), showed 0 for a multi-counter count, and read latency from a field that is never saved. | Each result as the exports show it. |

### Checked and left

- Nothing in the Family view now links to a staff tool, so the new check that refuses to open one there has no route a test can reach. It stays as a second line of defense; its re-break is one of the two that survived.
- The other survivor: letting an array through the reply check changes nothing, because an array has no summary, function, patterns or recommendations and the next check refuses it.
- The family contact log is a staff tracker that is also in the family tool list, so a family sees the staff's outcomes and follow-ups about them. Whether it belongs there is a product decision.

## Seventh pass: the cloud roster, and every way data comes in

This pass fixed the last open workspace item (the cloud roster), then acted on a read-only audit of every path that brings records into Behavior Lens: files, snapshots, pasted text and other tools. Each finding was checked in the code (most by running the real component) before anything changed. 72 deliberate re-breaks, 71 caught; the one survivor is explained under "Checked and left". Three changes only make things faster (the target lookup and two memos), so they were checked by timing rather than by a re-break.

### The cloud roster (outside Gemini Canvas)

| Situation | Was | Now |
|---|---|---|
| A new browser signed in to the same account | The account's roster was written on every change and **never read**. The student a new browser opened got a new id, so their cloud work was not found, and that browser's first save **replaced the account's whole roster** with its one-student list. | The roster is read once after sign-in, and a name new to the browser waits for it (up to 5 seconds; no wait in Canvas, without Firebase, or after a failed sign-in). Each save merges with the account's roster. |
| A student removed from quick switch | Stayed removed only until the page closed. Opening the name again gave a new id, away from the saved work. | Kept on this device. Opening the name again brings back the same id and its work. |
| The background roster read | (new) | Leaves the open student's sync status and any cloud conflict alone. |

### Batch Import (CSV)

| Area | Was | Now |
|---|---|---|
| A sheet with a student column | **Every row went into the open student**; the column was never shown. The panel invites exactly this ("Onboard 10-15 students at once"). | Rows for other students are listed by name and not imported; the column shows in the preview. |
| Importing the same file twice | Doubled every entry, with a success message each time. | Rows already here (same minute, antecedent, behavior and consequence) are marked and skipped. |
| Dates | Read with `new Date()`: "2026-09-10" became **the evening of the 9th** west of UTC, "9/10/50" 1950, "Sep 10" 2001, an Excel serial number the year 45910, "10.09.2026" 9 October. The preview showed the UTC string, which hid the shift. A date with no time sat at midnight unmarked. | Read on this computer's clock: ISO and US dates, day-first dotted dates, 12-hour times and spreadsheet serials; anything else (two-digit years, no year, 31 April, years outside 2000-2100) is refused with the format to use. The preview shows the local date and time, and a date with no time is marked. |
| Behavior Lens's own exports | "Duration (s)" became "durations" and was **dropped**; notes kept the formula-guard apostrophe; the export's session table became row errors; the toolbar CSV (Date and Time columns) was refused. | All read back. A "Duration (min)" column is converted to seconds. |
| Intensity 2.5 | Accepted (the form cannot enter it). | Must be a whole number from 1 to 5. |
| A Windows spreadsheet CSV | "Niño lloró" became "Ni?o llor?" without a word. | Read again as Windows-1252 when UTF-8 fails. |

### Snapshot Exchange and the home log

| Area | Was | Now |
|---|---|---|
| Matching records | By time alone: a para's **different incident in the same minute was skipped** as a duplicate, and an edited copy of an entry went in as a second record with the **same id** (deleting one then deleted both). Merged entries were not normalized (intensity 0 stayed, no local day) and said nothing about where they came from. | By content; a copy whose id is taken gets a new one. Entries are normalized on merge and marked with who sent them. |
| Home-log times | When a home incident happened was dropped, so it counted at the time it was logged (undoing the third pass's fix for anything sent by snapshot). | Kept, with the family's clock. |
| A merge | Kept 250 home-log and self-check entries, **deleting the oldest ones already here**. | Keeps everything. |
| The home log's Export | Wrote a file Snapshot Exchange **refused** ("Not a valid AlloFlow snapshot file"). | Writes a snapshot; files exported the old way import too. |
| A crafted `__proto__` key | Could give an entry a rating it did not have until the next reload. | Dropped when the entry is normalized. |

### Other tools

| Tool | Was | Now |
|---|---|---|
| Target aliases | An imported (or pasted, spoken, home-log) entry using a target's alias, such as "bolted" for Elopement, **became its own target after a reload** and was counted apart. | Stays with that target. A separately defined target of the same name is kept. |
| Natural-language notes | Read only the first 3,000 characters, then "Add all" **cleared the rest** from the box. | Over 3,000 characters cannot be parsed, and the counter says to parse in parts. |
| ABA graph "Paste CSV" | Replaced the graph's points without asking and threw away stated session numbers ("3,7 / 5,9 / 4,8" became sessions 1, 2, 3). | Asks first; keeps the session numbers, in order. |
| IOA bulk entry | Line breaks were read as spaces, so a blank cell in a pasted spreadsheet column vanished, every later interval shifted, and two shifted records could score **100% "Acceptable"**. | Line breaks and tabs separate intervals like commas; a blank is reported. |
| Shared workspace import | Said "Imported Workspace Preview" while **nothing was added**. | Says it is view only and how to add a colleague's records. |
| Comparison files | A newer backup of a student already shown was dropped (while the message said "Loaded"); two files for one student both went in; file rows counted raw behavior text, only the top 5, and the session history. | One row per student, the newest copy, counted the way a live row is. |
| Consent template import | Replaced the form **without asking**, could remove or rewrite the FERPA rights section, and left an AI-rewrite Undo that would bring the old form back. | Asks; keeps the rights section; clears that Undo. |

### A year of data

A second read-only audit mounted the app with 3,000 and 5,000 entries (a school year) and timed each step. Typing stays fast everywhere (under 50 ms per keystroke). What did not:

| Area | Was | Now |
|---|---|---|
| Speed with free-text behaviors | The target lookup was rebuilt for **every entry**. With 40 free-text behaviors (what a CSV import produces), opening the Overview on 3,000 entries took 1.3 s (2.6 s in wall time), and Progress Reports, the printable report and Data Quality about 2 s. | Built once per target list. Grouping 3,000 entries: 117 ms to 0.4 ms; loading a workspace: 132 ms to 16 ms. The Overview's before/behavior table is counted in one pass (it went through every entry 25 times), its review fingerprint and the hub's heatmap and quality badge are worked out when the data change, not on every keystroke. |
| A large student's backup | "Download backup" wrote indented JSON: **6.3 MB at 5,000 entries, over the 4 MB the loader accepts**, so the backup could not be restored. | Compact JSON, and the loader accepts up to 16 MB. |
| Recently deleted | A bulk delete of 400 said "400 entries moved to Recently deleted" when **250 were kept**. The list showed 25, so entries 26 to 250 could not be restored. The audit record dropped the id list past about 420 ids. | The confirmation and the message say how many cannot be kept; the list shows more on request; the audit record keeps the count. |
| Scatterplot auto-fill | Used every entry ever, so with a year of data **every cell read "high"**. | Uses the 2, 4 or 8 weeks up to the newest entry (4 by default), or all, and says how many older entries were left out. |
| "Consider consulting your BCBA" | Counted every high-intensity entry ever: with a year of data it was **on for good** ("1002 high-intensity incidents recorded"). | The last 30 days; a new severe incident after a dismissal brings it back. |
| AI analysis | Saw 24 of 3,000 entries (0.8%) and no counts over the rest. | Also gets the counts over every entry, by behavior, antecedent, consequence and setting (the sample is still disclosed). |
| Cloud sync over 1 MB | A workspace over Firestore's document limit (about 1,000 entries with a full audit log) failed for good while the badge said **"Offline"** (while online). | "Too large to sync", explained once: the data is safe in this browser; export a backup. |
| Lists | The home log and the student's self-checks showed 20 under a count of all of them; integrity checks showed 10. | Each says how many it shows and shows the rest on request. The Batch Import preview says it shows the first 50 rows. |

### Checked and left

- The cloud roster read leaves the sync status alone. Re-breaking only its first "syncing" status survives, because the read starts at sign-in, before the student's own load, which overwrites the status either way.

- Entries with no time (from notes or a date-only import) are marked, but the time-of-day charts still place them at midnight. Leaving them out of hour-based views is a change to several tools. (Fixed in the eighth pass.)
- **Browser storage is the next limit.** A normalized 3,000-entry workspace is 2.7 million characters and a 5,000-entry one 4.7 million; the browser allows about 5 million for the whole site. Two heavy students fill it, and a single 3,000-entry student already shows "Storage near limit". Behavior Lens reports it honestly and offers an export, but the real fix is moving entries to IndexedDB.
- Speed work that remains, each measured at 10 to 70 ms at 3,000 entries: entries already in the workspace are normalized again by the data-quality check and the AI fingerprint; opening a panel rewrites the whole workspace to storage (visited panels and activity times live in it; fixed in the ninth pass); the incident rate checks every entry against every session window.
- The Overview graph with a year of data: about 180 points in a fixed width, labelled by point number, with gaps in time hidden.
- Suspected by the audit and not changed: switching to a comparison row loaded from a file may open the copy on this device rather than the file's; Voice-to-ABC keeps at most 100 entries; CSV row numbers in errors can drift from the spreadsheet's with blank lines; "Load workspace from file" accepts an export or share file as a full backup (it does ask first). (All but the last fixed in the eighth pass.)

## Eighth pass: recording in a real classroom, and with a keyboard or screen reader

This pass ran each recorder the way it gets used: a laptop lid closed mid-session, a phone locked, a tool left and reopened, latency trials across two days. It then acted on a read-only accessibility audit of the recording screens and the student boards, and closed four of the seventh pass's open items. 104 deliberate re-breaks, all caught in the end. Five survived the first run: two showed test gaps (now closed), and three showed changes that were not needed (a focus branch no route reaches, and two colours that already passed), which were taken out.

### Time that was not observed

| Recorder | Was | Now |
|---|---|---|
| Live Observation, Frequency Counter, Session Data Tracker | Time the page was not running (a closed lid, a locked phone) **counted as observed**. A 1-minute observation with a 10-minute closed lid saved 660 seconds; a Frequency Counter left running overnight saved 8 hours 40 minutes and a rate of 0. | Recording pauses at the last moment the page ran and says so. That time is not counted. |
| Live Observation, pausing | Dropped the part-second at every pause: ten 5.9-second stretches saved 50 seconds. | Keeps it: 59 seconds. |
| Live Observation, intervals | Rolled over on a timer that stopped with the page, so a 10-minute closed lid became **one 15-second interval scored "not occurred"**. The interval in progress was saved as a whole one (1 of 4 plus a marked current interval saved 40% while the screen said 25%). Every session was saved as incomplete, so **the Overview graph never showed them**, and with no mode. | Intervals come from the recorded time. Only completed intervals are scored; the one in progress is reported apart. Sessions reach the graph. |
| Live Observation, changing method | Switching method after recording threw the recording away without a word. | The method is fixed once something is recorded ("Save or discard this session to change method"). |
| When a session happened | Stamped with the moment Save was pressed, and the per-hour incident rate took the stretch just before that as the observed time. | Stamped with when observing began, with the stretches actually observed; the rate counts incidents inside them. Sessions saved before this are read as before. |
| Rates | Live Observation saved its rate as text; the Frequency Counter rounded to one decimal, so 1 in 40 minutes saved as 0 per minute. | A number, to 4 decimals. |
| Frequency Counter, a counter added mid-session | Divided by the whole session: 3 in its own 5 minutes of a 20-minute session saved 0.15 per minute. | Divided by its own time: 0.6. |
| Interval Grid | A second tap on "Occurred" **unmarked** the interval, and the current cell did not show the mark. A session stopped before its planned end never reached the Overview graph. | Marks stay marked; the cell shows it; stopped sessions are graphed. |
| Session Data Tracker | Leaving the panel lost a session in progress (it came back to an empty setup). No way to pause. | Kept as a draft, back paused with the counts shown. Pause and Resume. |
| ABC form, editing an entry | Escape, the backdrop and ✕ threw away changes without asking. | Asks "Discard your changes to this entry?", only when something changed. |
| Latency Recorder | Trials from two days were saved as **one record, dated the second day, averaging both days**. | One record per day, dated by that day's first trial. |
| Portfolio PDF | One count in 40 minutes printed "1 (0/min)"; a latency session printed a dash. | The result as the exports give it ("frequency count, 1 occurrences", "latency, 4.2 s"). |

### The seventh pass's open items

| Area | Was | Now |
|---|---|---|
| Entries with no time | Placed at midnight in every time-of-day view: the Overview's hour chart and peak time, the trend dashboard's early block, the FBA report grid (counted as "outside 7:00-18:59"), the scatterplot. Shown and exported as 12:00 AM. Predictive Insights took the day of the week from the viewer's clock. | Left out of hour-based views and counted apart ("1 entry with no time recorded is not shown"). The time is blank in the CSV and "No time recorded" in the log. Predictive Insights uses the clock the entry was recorded on. |
| Comparison rows loaded from a file | Switching to that student could open a different copy. | A student known only from the file opens the file's records; one with records on this device opens that copy and says so. |
| Voice-to-ABC | Kept the first 100 entries and cut long fields, without a word. | Says how many were left out and how many fields were shortened. |
| CSV import errors | Counted rows without the blank ones, so "Row 3" meant spreadsheet row 4. | The spreadsheet's row. |

### Keyboard, screen reader and low vision

| Area | Was | Now |
|---|---|---|
| Escape | Inside any tool, **closed all of Behavior Lens** (a token board or a latency run with it), and every return to the tools left focus on the page. | Returns to the tools, with focus back on the control that opened the tool. On the tools, Escape closes. |
| A recovered draft | Live Observation opened on "Discard draft". | The recorders open on Start. |
| "Keep draft and close?" | Says "Recording will be paused", but recording went on while it was open: 5 minutes on the question scored 20 more "not occurred" intervals in the Interval Grid. | Recording stops while it asks, and "Continue recording" starts it again. |
| Controls that replace themselves | Start becoming Pause, Pause becoming Resume, Present Stimulus becoming Response, the latency response going away: each dropped focus onto the page. After Start in the Interval Grid, "Occurred" was 23 Tab stops away. | Focus goes to the next step. |
| Momentary "Occurring now" | Disabled except in the last 2 seconds of each interval, so focus fell off it every interval; the countdown was a live region that spoke every second. | Stays focusable and says "Not yet: mark it in the last 2 seconds of the interval". Only "Look now" is announced. |
| Results | Counts, taps and latency results (including "no response") were silent. | Announced. |
| Names | "+1" and "-1"; "Remove Counter" on every counter, a 12-pixel target; latency inputs named "eg Responding to name" and "eg 3"; token slots read "○"; Start read "Pause, pressed" while recording; the interval mark was named by its state. | "Add one occurrence of Yelled"; "Remove counter Out of seat", 24 pixels; "Behavior" and "Goal (seconds)"; "Token 1 of 5: not yet earned"; Start and Pause say the action; the mark is a named toggle. |
| Contrast | The rule meant to darken grey text made it **lighter**, and its correction had a broken selector. White or grey text below 4.5:1 on the recording screens (grey on the dark overlay 2.4:1, Pause on amber 2.1:1, green cells 2.5:1, Save 3.3:1) and the student boards (choice colours 1.7 to 2.8:1, the locked Then panel and its message, the token count, name and reward, Range and SD). An empty token slot had no border (`border-3` is not a class) at 40% opacity. | All at 4.5:1 or more (3:1 for large text), checked by the tests against the colour behind each piece of text. |
| A confirmation whose control had gone | Threw an error (a variable that does not exist there) and left focus on the page. The ABC form did the same. | Focus goes to the panel's "Add observation". |

### Checked and left

- Every tool opens through one function that already moves focus to the tool's heading, including links from one tool to another, so only the return to the tools needed fixing.
- "Occurring now" is dimmed outside its window. It is marked unavailable to assistive technology, and inactive controls are exempt from contrast.
- "Load workspace from file" still accepts an export or share file as a full backup (it asks first). (Fixed in the ninth pass.)
- `workspace_lifecycle`'s "retries a transient cloud save after browser reconnects" sometimes sees two save attempts instead of one when the machine is busy. It fails the same way with the code from before this pass (1 run in 4, interleaved with the current code), so it is a timing-sensitive test, not a regression.

## Ninth pass: every other panel, on a keyboard, a screen reader and a phone

Two read-only audits ran first. One mounted all 101 tools with realistic data and checked them with axe-core and by hand; the other ran the recorders and the hub in real Chromium at 360, 390 and 414 px wide with touch rules on. Each finding was reproduced before it changed. The accessibility audit's verification script (14 checks) went from 14 open to 14 fixed. 47 deliberate re-breaks, all caught in the end. Two survived the first run because their tests could not fail: one looked at a backup button that never shows the reminder, and one checked text that the whole page also contains. Both tests were fixed.

### Files and saving

| Area | Was | Now |
|---|---|---|
| Loading a report export or a share file | The report's JSON export and a BCBA share file carry entries at the top level, so "Load workspace from file" took either one as a workspace. After a "Replace" it **deleted the targets, notes, plans, tool data and Recently deleted list** and kept only the file's entries (a date range, for an export). | Only a backup (it has a version or save time) replaces saved work. A report export or share file for the open student adds its new records, after asking, and skips the ones already there. One for another student with saved work is refused, with the name to open first. |
| Loading a snapshot file | "No recognized BehaviorLens workspace data was found." | Says it is a snapshot and to use Snapshot Exchange. |
| Opening a tool | **Rewrote the whole workspace** to browser storage each time (163 KB at 300 entries; about 1.6 MB for a school year) and, outside Canvas, saved it to the cloud two seconds later. It also turned the backup reminder red after only browsing, and told a second tab that the student had changed. The visited-tools list was rebuilt even for tools already visited. | Visit times and diagnostics are saved with the next real change. Opening a tool again writes nothing; a first visit saves once. A save that failed (storage full) is still retried when you move between tools: the old rewrite did that by accident, and the full suite caught its loss. |
| ABC form | Save stayed disabled until Before, Behavior and After were all filled, with nothing saying which was missing. | The three are marked "(required)", and a line above Save lists what is still missing. |

### Keyboard and screen reader

| Area | Was | Now |
|---|---|---|
| AI analysis from the ABC log | Moved the user to the tools list, where the result came after **310 focusable controls**, and nothing announced it. | Announced when it starts, finishes or fails. Focus goes to the result unless the user has moved on to another tool. |
| Switching student | The pressed quick-switch button disappeared and focus fell to the page. The only sign was a toast, so a screen reader user could go on recording for the student they had just left. | "Now viewing Student B" is announced, and focus stays in the quick switch, which names the open student. Removing a student from quick switch works the same way. |
| ABC log | Delete, "Yes, Delete", Restore, "Clear all filters" and "Clear selection" dropped focus onto the page. Every row's controls had the same names ("Delete" 42 times). "No entries match your filters" was never announced. | Focus goes to the next row, the next Restore, "Recently deleted", or the search box. Each control names its entry ("Delete Task refusal, Sep 24, 8:27 AM"). The empty result is announced. |
| Options shown by colour only | Export format and date range, the IOA method, interval and mode, the ABA graph's data source and behavior, conditional probability views, the progress report style, and BCBA handoff views and urgency. | Each option says whether it is selected, and each group is named by its label. |
| Names | 19 inputs were named by their example ("eg 12, 15, 14, 13, 16"). One was named "Optional". The Data Quality badge was named "🟢 100%". Four tables were captioned "behavior lens module data table". Tools were announced by internal id ("Opened ioacalc panel"). | Each takes its visible label ("Baseline phase (A) data, separated by commas"). The badge says "Data quality: strong, 100%" and that it opens. Captions say what the table holds. Tools are announced by title. |
| Results that appeared silently | Effect sizes, IOA agreement, the IEP prep packet, an inspected Overview graph point, and the scatterplot's auto-fill summary. | Focus moves to the result (the auto-fill summary is announced instead). |
| Overview charts | Daily notes and the time-of-day chart kept their numbers in tooltips and colour. The co-occurrence table's row labels were plain cells. | Each chart has a table a screen reader reads, and the drawing is hidden from it. Row labels are row headers. |
| ABA graph, manual entry | Its points are buttons inside an image, so a screen reader flattened them. | The graph is a group, and its label names the phases. |
| Contrast | Chart axis numbers were #94a3b8 on white (2.6:1) in 13 places, and the Effect Size metric names were 3.7 to 4.0:1. | 7.6:1 and above 4.5:1. |

### Phones (measured in Chromium, 360-414 px)

| Screen | Was | Now |
|---|---|---|
| Live Observation, duration and latency | 406 px of a 664 px screen never scrolled: the top bar and the method buttons each took two rows, and the notes bar was fixed at the bottom. The episode and response buttons sat under the notes bar while recording, and the round Start button was squashed to 96 x 44. | The method buttons take one scrolling row, and the top bar shows an icon-only Save. The notes scroll with the rest, and the round buttons keep their size. Every main action is on screen at 360 x 640 and 390 x 664. |
| Frequency Counter | Opened scrolled 96 to 196 px past its own header (Save and Close off the top). With three counters, Start/Pause and the timer were below the screen. | Opens at the top. The header stays, and the timer and Start/Pause sit in a bar at the bottom. With three counters, the third +1 needs one scroll. |
| Every recorder | The target's definition took 114 px above the controls. | It folds under "Definition" below 640 px. |
| ABC log | The table was 825 px wide in a 334 to 388 px frame. Every row action was off-screen, with nothing to show the table scrolls. Checkboxes were 14 px. | The actions column stays in view as the table scrolls, and checkboxes are 24 px. |
| Session Data Tracker | Its setup row did not wrap, so the whole panel scrolled sideways (474 px). | It wraps. The on/off switch's knob is centred under the touch rule. |
| Behavior Lens header | A long subtitle pushed Close onto its own row (189 px of header). | The subtitle is cut short to fit, and the header is 121 px. |
| Latency chart | Drawn 500 wide and shrunk, so its numbers were 4 to 5 px and the goal label was cut off. | Larger text and room for the labels, and it scrolls sideways on a phone instead of shrinking. Numbers are about 10 px. |

### Checked and left

- On the hub at 360 px the header's status badges still wrap to a second row (173 px). Making that row scroll would clip the Data Quality popover.
- The Frequency Counter keeps two columns with more than one counter. One column fixes cut-off labels but puts the third counter's +1 further down. The label box shows about 30% of a long label; the +1 button's name has it in full.
- Scatterplot cells cycle through three states, so they state their level in their name rather than as pressed.
- Twice during this pass, another process copied the module into `desktop/web-app/public/`. Both times the copy was byte-identical to one of this pass's own saved versions, so nothing of anyone else's was overwritten when the mirrors were synced.

## Files

| Path | Change |
|---|---|
| `behavior_lens_module.js` | All fixes. |
| `behavior_lens_workspace_module.js` | The observed-hour rate (`calculateIncidentRate`, new `observationWindow`; eighth pass: the stretches observed, `observationSpans`), and later passes' workspace, roster and CSV row fixes. |
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
| `tests/behavior_lens_escalation_reinforcers_impact.test.js`, `…_notes_time_and_labels`, `…_kept_records_and_ai_drafts`, `…_data_tools_keep_data`, `…_names_sharing_and_clocks` | New tests, fourth pass (5 files). |
| `tests/behavior_lens_golden.test.js`, `…_confirmations_a11y` | 38 confirmations, listed by title (32 after the fourth pass, 6 more in the fifth). |
| `tests/behavior_lens_missing_ratings.test.js` | Its share test confirms the new "Share student data" question. |
| `tests/behavior_lens_copy_dates_and_caps.test.js`, `…_print_panel`, `…_preference_and_drafts`, `…_exports_order_and_units`, `…_roster_and_restore`, `…_report_scales_and_windows` | New tests, fifth pass (6 files). |
| `tests/behavior_lens_workspace_lifecycle.test.js` | Confirms the new "Use cloud copy" question. |
| `tests/behavior_lens_improvement_contract.test.js`, `…_golden` | Pin the shared `csvCell` in the export panel, and the reused roster id. |
| `tests/behavior_lens_workspace_ux.test.js` | Confirms the new "Discard unsaved definition" question. |
| `tests/helpers/behavior_lens_component_harness.js` | An optional log of persisted writes (`__durableLog`), so a test can see what a tool saves. |
| `tests/behavior_lens_family_view.test.js`, `…_ai_analysis_trust`, `…_ai_analysis_hub` | New tests, sixth pass (3 files). |
| `tests/behavior_lens_roster_and_restore.test.js` | Sixth pass: a failed save, two tabs, oversized tool data and a second tab opening the same student. |
| `tests/behavior_lens_home_log_push.test.js` | Sixth pass: pushes sent once, labelled, and a snapshot sent from the Family view. |
| `tests/behavior_lens_golden.test.js`, `tests/__snapshots__/behavior_lens_golden.test.js.snap` | Sixth pass: the small-sample pin reads the count analyzed; four hub snapshots re-baselined to the Family view their props select. |
| `tests/behavior_lens_cloud_roster.test.js`, `…_imports`, `…_imports_app`, `…_scale` | New tests, seventh pass (4 files). |
| `tests/behavior_lens_golden.test.js`, `…_confirmations_a11y` | Seventh pass: 40 confirmations (replacing graph data, importing a consent template); the roster-id and snapshot-duplicate pins follow the new code. |
| `tests/behavior_lens_ai_analysis_trust.test.js`, `…_ai_analysis_hub` | Seventh pass: the BCBA alert's 30-day window and its dismissal key. |
| `tests/behavior_lens_snapshot_import.test.js` | Seventh pass: a snapshot merge keeps every entry (it pinned the 250 cap). |
| `tests/behavior_lens_untimed.test.js`, `…_recorders_real_use`, `…_recording_a11y` | New tests, eighth pass (3 files). The seventh pass's open items are tested in `…_untimed`, `…_imports` and `…_imports_app`. |
| `tests/behavior_lens_live_pause.test.js`, `…_recording_measures`, `…_measurement_flows` | Eighth pass: intervals come from the recorded time, the method is fixed once recorded, and durations keep their part-seconds. |
| `tests/behavior_lens_golden.test.js`, `…_confirmations_a11y` | Eighth pass: 41 confirmations ("Discard entry changes"). |
| `tests/behavior_lens_ux_recovery.test.js`, `…_interval_grid_clock`, `…_measure_labels` | Eighth pass: Start has no pressed state, "Occurring now" is marked unavailable instead of disabled, and the latency goal field is found by its new name. |
| `tests/behavior_lens_navigation_saves.test.js`, `…_panels_a11y` | New tests, ninth pass (2 files). The ninth pass also added to `…_recording_a11y` (the ABC form's required fields, the phone layout) and `…_roster_and_restore` (loading an export, share or snapshot file). |
| `tests/behavior_lens_workspace_ux.test.js`, `…_cumulative_record`, `…_measurement_flows`, `…_effect_size_autofill` | Ninth pass: find controls by their new names ("Edit entry: …", "Phase change at session number", "Remove target …", "Baseline phase (A) data …"). |
| `tests/behavior_lens_golden.test.js`, `…_confirmations_a11y`, `…_app_shell_visualizations_a11y`, `tests/__snapshots__/behavior_lens_golden.test.js.snap` | Ninth pass: 42 confirmations ("Add records from file"); the ABC row buttons' pin reads their new names; the ABA graph may be a group; six hub snapshots re-baselined for the header's three class changes (nothing else differed). |

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
- third pass: `BehaviorLensCrisis`, `BehaviorLensTrafficLight`, `BehaviorLensConsent`, `BehaviorLensSnapshot`, `BehaviorLensCaseload`, `BehaviorLensIntegrity`, `BehaviorLensDTT`, `BehaviorLensTaskAnalysis`, `BehaviorLensHomeLog`, `BehaviorLensComparison`, `BehaviorLensTriangulation`, and `ioaGridLists` on `BehaviorLensIOA`
- sixth pass: `BehaviorLensAnalysisReply`, and on the workspace runtime `sameWorkspaceContent` and `legacyDataFingerprint`
- seventh pass: `BehaviorLensImport`, `snapshotRecords` on `BehaviorLensSnapshot`, and `mergeRosterEntries` on the workspace runtime
- eighth pass: `observationSpans` on the workspace runtime
- fourth pass: `BehaviorLensEscalation`, `BehaviorLensReinforcers`, `BehaviorLensGamification`, `BehaviorLensImpact`, `BehaviorLensGas`, `BehaviorLensAbcNotes`, `BehaviorLensTrials`, `BehaviorLensCulturalReflection`, `BehaviorLensContract`, `BehaviorLensPocketBip`, `BehaviorLensBias`, `BehaviorLensWorkflowChecks`

## Translation keys

178 new `tt('behavior_lens.…', 'English')` keys are not yet in `ui_strings.js` (the ninth pass added 6: `abc.required`, `abc.missing`, and four `workspace.partial_*` messages): 48 from the first two passes, 55 from the third, 47 from the fourth, 11 from the fifth, 4 from the sixth (`toast.unsaved_reopened`, `toast.tool_data_too_large`, `toast.staff_tool_in_family_view`, `hub.family_one_student`), 5 from the seventh (`abagraph.duplicate_sessions`, `abagraph.replace_confirm`, `consent.import_confirm`, `toast.switched_from_file`, `toast.switched_device_copy`) and 2 from the eighth (`obs.saved_v2`, `interval.look_wait`).

- First pass (23): `risk.*` (13), `graph.*` (6), `pref.*` (2), `obs.latency_response`, `ioa.ai_lengths_differ`, `tracker.no_trials_yet`.
- Second pass (25): `effectsize.*` (8), `interval.*` (4), `cumrec.*` (3), `case.*` (2), `progress.*` (2), `token.*` (2), `checklist.rate_all`, `feasibility.source_note`, `maintenance.record_probe`, `practicum.ai_key_rejected`.
- Third pass (55), including 24 `…_v2` keys that replace registered messages whose text had the numbers flattened to "N". The old registered keys can be retired once the new ones are registered.
- Fourth pass (47), including 12 more `…_v2` keys that replace registered text which dropped the data ("Goal ", "Dataset grade", tips that said the opposite of their condition).

Behavior Lens translates unregistered English at runtime, so they work now. Registering them is a separate i18n pass. The keys were left unregistered because `ui_strings.js` is shared with other sessions.

## Still open

The first pass's leads are all resolved above, except the two under "Leads checked and left as they are". The third pass's open items were fixed in the fourth, the fourth's in the fifth, and four of the fifth's five workspace items in the sixth. Still open:

- **AI analysis is never marked reviewed.** It is saved with `reviewStatus: 'unreviewed'` and nothing changes that, so the parent share labels its summary as unreviewed and the guided workflow never turns the hypothesis step green on its own. A "reviewed by" step is a product decision.
- **Browser storage at scale** (seventh pass, "Checked and left"): a school year of data for two students fills the browser's roughly 5 million characters. Moving entries to IndexedDB is the fix.
- **Family view is not a locked mode.** One click returns to the teacher view, and Escape on the tools list closes Behavior Lens (from inside a tool it now returns to the list). A PIN, or a kiosk mode for the student screens, is a product decision. So is whether the family contact log belongs in the family tool list.
- Registering the translation keys.
