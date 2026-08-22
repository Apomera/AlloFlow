# For school leaders: the Leadership Hub

Principals, coaches, and student-services leaders get their own tool suite: open **Educator Tools** and choose the **Leadership Hub** 🏛️ card. Nine tools live behind it. This chapter explains what each one is for, how a first session goes, and the boundaries each tool deliberately keeps — because in this suite the boundaries are the product.

If you have not read [Privacy and responsible AI](07-privacy-and-responsible-ai.md), read it first. Everything below assumes its ground rules.

## The covenant every tool follows

The hub states this once, and every tool holds to it:

- **Aggregate or de-identified where that is the point.** The analysis tools take counts or student codes, never rosters of names tied to outcomes. The tools that do hold names — evaluation, meeting documentation — are real working records, not previews; what a district portal adds is shared, authenticated access and a retained store, not permission to do the work.
- **Local by default, with named exceptions.** The standalone hub computes and stores working state in the current browser or desktop profile. AI drafting and translation, an optional evaluation portal, Drive backup, live or shared routes, an LMS, and other configured services can transmit or copy data outside that profile. Review the disclosure and destination for the exact tool and deployment. AlloFlow does not add application-level encryption to ordinary browser storage, so device access and disk protection still matter.
- **Descriptive, never a verdict.** Every output is framed as material *for human review*. No tool places a student in a tier, rates a teacher, decides eligibility, or certifies a translation. You do, and the exports say so.

A practical consequence worth planning around: because the data is on-device, a leadership workflow lives on the device where you started it. The hub's **Back up this hub** section covers this two ways:

- **Download backup / Restore from backup** — one file with every tool's saved data, restorable on a new device or after a wipe. Treat the file as the confidential records it may describe. Restoring only ever writes the hub tools' own data; it cannot touch anything else in AlloFlow.
- **Automatic Drive backup** — an optional script installed in a **school-managed Google Workspace for Education account**, not a personal account. Once connected, it saves dated backups when the hub reports changed data on close or reopen, shows the last-save state, and maintains the history described by that script version. Follow `apps_script/leadership_hub_backup/README.md` for the exact deployment. The reviewed package requests access to files it creates and creates them Restricted; re-check scopes, sharing, retention, and behavior against the commit you install.

Either way, the backup is working continuity, not filing. When a record needs to reach wherever your district officially stores it, download it from Drive and share it through the normal district channel yourself — that handoff stays deliberate and human.

## Classroom visits and coaching

### UDL Walkthrough 🚪

Growth-framed classroom visits scored against UDL 3.0 look-fors, with feedback cards for teachers, a building heatmap, trends over time, and inter-rater checks.

**First session.** Open **Roster & setup** and add your classrooms — a teacher name is optional, and either way each classroom gets a code that the analytics use. Then open **Observe**, pick the classroom, and record what you see against the look-fors during a ten-minute visit. The visit lands in **Visits**, and **Building** starts filling in once you have a handful.

**Keep in mind.** The heatmap describes patterns in *your observations*, not teacher quality; two observers can calibrate with the inter-rater view before you trust a trend. Share feedback cards as conversation starters, not scores.

### Walkthrough Copilot 📝

Turns your shorthand walkthrough notes into evidence-based coaching feedback — that you edit and approve. Every claim it drafts is cited back to a line in your own notes; anything it cannot anchor to your notes is flagged rather than trusted. It also includes practice scenarios for building the note-taking habit.

**First session.** Try a practice scenario before a real visit: it hands you sample notes so you can see how drafting, citation, and your approval step work without any real classroom involved.

**Keep in mind.** Formative coaching only. The Copilot never assigns a rating, never computes an evaluation score, and never makes an employment recommendation — by design, not by omission. If a draft sentence has no citation to your notes, that is the tool telling you it invented something; delete or rewrite it.

### Educator Evaluation ✅

The card behaves differently depending on your district. If your district runs a connected evaluation portal, the card opens it — sign in there, and records live there. Without a portal it opens a private on-device workspace with completion and weighting views, walkthroughs, formal observations, SPM/SLO tracking, dialogue, receipts, and audit history, with framework profiles for PA Act 13, Portland (Maine) PEPG, and a general Maine PEPG profile that mirrors your district plan.

**Keep in mind.** The on-device workspace holds real working records — it is not a demo. What you enter stays in your signed-in profile on that device and is never uploaded, which on a managed 1:1 fleet means it is scoped to you and encrypted at rest by the device itself. AlloFlow adds no encryption of its own, so device sign-in and disk encryption are what protect it; that is a question for your technology director, in [For your IT department](17-for-your-it-department.md).

Two things the on-device workspace genuinely cannot do, which is what the district portal adds: educators cannot sign in to see and acknowledge their own records, and there is no shared, retained, discoverable store for the district. Those are records-management needs, not a reason to keep real work out of the tool. Apply your district's retention rules to what you keep here, and back it up.

A note on the legal frame, since it is easy to reach for the wrong one: evaluation records are **personnel** records, so what governs is your state's personnel-records law, your collective bargaining agreement, and district retention policy — not FERPA, which covers student education records. FERPA enters only by the side door, if observation evidence names identifiable students, which is a good reason to keep written evidence focused on educator practice.

Evaluation is the one tool in this suite complex enough to have its own dedicated manual, and this chapter deliberately does not duplicate it. For the full walkthrough — choosing between workspace and portal, the evaluation cycle step by step, framework profiles, portal deployment, how released evaluations reach teachers, and its own troubleshooting — see the [Educator Growth & Evaluation user manual](https://alloflow-cdn.pages.dev/educator-evaluation-manual), which is also linked from inside the tool.

## Equity and student-services analytics

### Disproportionality Analyzer ⚖️

Risk indexes, risk ratios, and composition from aggregate discipline or identification counts — the arithmetic your state uses, on counts you type in, computed entirely on this device.

**First session.** In **Analyze**, name the outcome (say, out-of-school suspensions), then enter at least two rows of counts: a group's enrollment and how many students in it had the outcome, unduplicated. Results appear as you type. Save the analysis and it joins **Saved** and, across years, **Trends**.

**Keep in mind.** Small groups make unstable ratios, and the tool says so rather than hiding it. When a comparison group inside the building is too small, use the alternate-comparison entry (the 34 CFR 300.647 statewide alternate risk ratio) — the tool shows the alternate ratio beneath any flagged standard one. A flagged ratio is a question to investigate, not a finding of discrimination.

### MTSS Triage 🧮

Screening scores in, team-review flags out. You paste a screening window (student codes and scores), enter *your* benchmark and intensive cut scores, and get suggested risk bands, intervention grouping, and window-over-window movement.

**First session.** In **Screen**, describe the measure and window, set the two cut scores, and paste scores one per line as `code, score`. Save the window and the tier board builds. The **Groups** tab drafts intervention groupings you can rearrange; **Progress** compares windows once you have two.

**Keep in mind.** The tool ships **no benchmark tables** — publisher cut scores are proprietary and measure- and season-specific, so you must enter your own. "At the cut" deliberately counts as the *less* intensive band in both directions. Bands are flags for team review, never automatic placement. Progress means movement between bands, which is not the same thing as a score going up — and for measures where lower is better, the tool inverts correctly, but check the "higher is better" toggle when you set up the window.

### SpEd Timelines ⏰

Evaluation clocks, IEP annuals, and triennials on one urgency dashboard (overdue / due in 14 / due in 30), with per-provider caseload views. Students are entered as codes only.

**First session.** Add timelines on the **Timelines** tab; the **Dashboard** sorts them into urgency bands automatically.

**Keep in mind — this one matters legally.** Due dates are *editable prefills*, not legal determinations. The evaluation clock uses the federal 60-**calendar**-day rule after parental consent, while [34 CFR § 300.301(c)(1)](https://sites.ed.gov/idea/regs/b/d/300.301) also permits a state-established timeframe to control. Confirm every date against the current state rule, district procedure, consent facts, and school calendar. The screen and CSV repeat the warning, and a hand-edited due date is not overwritten by the prefill.

### Diagnosis, Evaluation & School Eligibility 🧩

A reference and reasoning tool: compare clinical diagnosis, IDEA eligibility, and Section 504; walk the evaluation path; review federal definitions, safeguards, and timelines; explore open-question cases; and build a privacy-safe meeting-preparation guide.

**Keep in mind.** It never decides eligibility, services, or placement — it prepares the humans who will. Definitions are federal; your state adds its own layer, so treat it as the map, not the territory.

## Communication and documentation

### Meeting Documentation 📋

Notes or a transcript in, your district's meeting format out. Six built-in formats (SST, IEP team, 504, parent/family conference, staff/PLC, evaluation planning) plus a custom-template builder — model your district's own form once and reuse it.

**First session.** Pick a format on **New record**, paste your notes, and draft. Review the result, certify it, and save; action items land in the **Action items** tracker with checkboxes.

**Keep in mind — the two integrity mechanisms.** Before an AI call, each name the preparer explicitly adds to **Names to mask** is replaced locally with a code such as "Person A" and restored locally in the result. A name omitted from that list remains in the notes and can reach the configured provider, so review the list before drafting. Every drafted decision or action item also carries a source quote that is checked as an exact substring of the masked notes; an unmatched quote is visibly flagged for review. You certify before saving, and the export footer records human review. A manual no-AI route is also available.

### Family Announcements 📣

One announcement, every family language: write the English master, pick your building's languages (sixteen presets including right-to-left scripts), translate with AI, review each translation, and export an accessible packet with every section properly language-tagged and direction-aware.

**First session.** Compose a short real announcement — a picture day notice is a good first run — select two or three of your building's languages, translate, and *read the translations* before saving. The language selection is remembered for next time.

**Keep in mind.** Translations are machine-assisted and you certify the final text — review with bilingual staff where you can. Every export carries a machine-translation disclosure with a contact-the-office line; do not remove it. The language tagging is not cosmetic: it is what makes the packet work in screen readers and in right-to-left scripts, which is the point of the tool.

## A year in the hub, roughly

- **August–September:** enter classrooms in UDL Walkthrough; set up SpEd Timelines from your caseload; run the fall screening window through MTSS Triage; send your first multilingual announcement.
- **October–February:** short walkthrough cycles with Copilot-drafted coaching; Meeting Documentation for SST/IEP season; winter screening window and progress comparison.
- **March–June:** spring window closes the progress picture; Disproportionality Analyzer on the year's discipline and identification counts while the data is fresh; save everything — the Trends views only pay off in year two.

## Troubleshooting and support

The hub tools are ordinary AlloFlow modules: if a card opens to a loading screen that never resolves, the recovery sequence in [Troubleshooting](08-troubleshooting.md) applies. AI drafting and translation require a configured backend. Without one, local forms, calculations, saved records, and manual routes that do not call AI may remain available, but verify the exact tool and export path. For the rollout conversation with staff, pair this chapter with [School rollout and coaching](10-school-rollout-and-coaching.md).
