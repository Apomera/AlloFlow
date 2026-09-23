# Clinical validation log

This is the sign-off sheet for the numbers and labels AlloFlow's clinical tools produce. Each item below was written from the publisher's manual or a standard text, but by software, not by a licensed reviewer checking the physical manual. **Nothing here is validated until a qualified reviewer initials it.**

- **Report Writer score labels:** a licensed school psychologist with access to the manuals.
- **BehaviorLens inter-observer agreement (IOA):** a BCBA.

When you sign an item, add your initials and the date. When a manual disagrees with an item, change the oracle in the test first (see "Where the code lives"), then the module, and note it in the change log at the end.

## Where the code lives

| What | Code | Test (the oracle) |
|---|---|---|
| Score bands for badge, AI prompt and verifier | `report_writer_module.js`, `RW_SCORE_SYSTEMS` | `tests/report_writer_score_classification.test.js`, `ORACLE` |
| Reference text given to the AI | `report_writer_module.js`, `SCORE_INTERPRETATION_GUIDES`, `DSM5_SCREENING_CRITERIA` | same file, "diagnostic references" |
| IOA formulas | `behavior_lens_module.js`, `computeIOA` | `tests/behavior_lens_ioa.test.js` |

## 1. Score classification bands

"Confidence" is how sure the author was **without** the manual open. Low and medium are the ones to check first.

| Instrument | Bands as encoded (low end inclusive) | Confidence | Reviewer |
|---|---|---|---|
| WISC-V (composites) | ≥130 Extremely High · 120–129 Very High · 110–119 High Average · 90–109 Average · 80–89 Low Average · 70–79 Very Low · ≤69 Extremely Low | High | |
| Traditional Wechsler (WAIS-IV, WPPSI-IV, WISC-IV); used only to recognise legacy terms | ≥130 Very Superior · 120–129 Superior · 110–119 High Average · 90–109 Average · 80–89 Low Average · 70–79 Borderline · ≤69 Extremely Low | High | |
| WJ IV (COG and ACH) | ≥131 Very Superior · 121–130 Superior · 111–120 High Average · 90–110 Average · 80–89 Low Average · 70–79 Low · ≤69 Very Low | High | |
| KABC-II | ≥131 Upper Extreme · 116–130 Above Average · 85–115 Average · 70–84 Below Average · ≤69 Lower Extreme | Medium-high | |
| Vineland-3 (domains, ABC) | ≥130 High · 115–129 Moderately High · 86–114 Adequate · 71–85 Moderately Low · ≤70 Low | High | |
| BASC-3 clinical scales | ≥70 Clinically Significant · 60–69 At-Risk · 41–59 Average · 31–40 Low · ≤30 Very Low | High | |
| BASC-3 adaptive scales | ≥70 Very High · 60–69 High · 41–59 Average · 31–40 At-Risk · ≤30 Clinically Significant | High | |
| Conners 4 | ≥70 Very Elevated · 65–69 Elevated · 60–64 Slightly Elevated · 40–59 Average · ≤39 Low | High. MHS manual Table 4.1; an MHS sample report prints T 63 as "Slightly Elevated". Not for the ADHD Index, which is a probability. | |
| BRIEF-2 | ≥70 Clinically Elevated · 65–69 Potentially Clinically Elevated · 60–64 Mildly Elevated · ≤59 Average | High for 60 and above (sentence in two PAR interpretive reports). PAR names no band below 60; its narratives say "within the average range". | |
| SRS-2 | ≥76 Severe · 66–75 Moderate · 60–65 Mild · ≤59 Normal | High for the ranges; medium for the ≤59 wording (WPS report legend says "Normal"; "Within Normal Limits" is widely quoted but was not found in a primary source). The verifier reads "within normal limits" as "Normal". | |
| BOT-2 (standard scores, mean 50) | ≥70 Well-Above Average · 60–69 Above Average · 41–59 Average · 31–40 Below Average · ≤30 Well-Below Average | Medium-high | |
| DAS-II | ≥130 Very High · 120–129 High · 110–119 Above Average · 90–109 Average · 80–89 Below Average · 70–79 Low · ≤69 Very Low | Medium-high. Dumont, Willis & Elliott (2009) *Essentials of DAS-II Assessment*, Rapid Reference 5.1, seen via a secondary source; two Pearson sample reports agree but have no score on a band edge. | |
| WIAT-4, 10-point (default) | ≥130 Extremely High · 120–129 Very High · 110–119 High Average · 90–109 Average · 80–89 Low Average · 70–79 Very Low · ≤69 Extremely Low | High. Pearson's US and Canadian sample score reports and parent report all print this system. | |
| WIAT-4 and KTEA-3, 15-point | ≥146 Very High · 131–145 High · 116–130 Above Average · 85–115 Average · 70–84 Below Average · 55–69 Low · ≤54 Very Low | High for KTEA-3 (Q-global help, verbatim). Medium for WIAT-4's endpoints: Pearson's 2020 "Suggested Qualitative Descriptors" slide shows the labels and cut points but not which band gets 115, 130 or 145. | |
| KTEA-3, 10-point | ≥130 Very High · 120–129 High · 110–119 Above Average · 90–109 Average · 80–89 Below Average · 70–79 Low · ≤69 Very Low | High (Q-global help, verbatim). Same cut points as WIAT-4, different words. | |
| CELF-5 (Core Language and index scores) | ≥115 Above Average · 86–114 Average · 78–85 Below Average · 71–77 Low · ≤70 Very Low | High. Examiner's Manual Table 4.5, reproduced in Pearson's "Determining the Severity of a Language Disorder" (2013): "Marginal/Below average/Mild", "Low range/Moderate", "Very low range/Severe". The verifier reads "marginal" as Below Average. | |
| GARS-3 Autism Index (probability of autism; HIGH is the concern) | ≥71 Very Likely · 55–70 Probable · ≤54 Unlikely. Severity levels, not shown in the label: 55–70 Level 1, 71–100 Level 2, ≥101 Level 3. | Medium-high for the ranges, medium for the label text. From two peer-reviewed papers citing Gilliam (2014): Samadi et al. (2022) *Brain Sciences* 12:537, and a Prader-Willi screening study (PMC7735061). The Pro-Ed manual was not available. | |

Pearson prints WIAT-4 and KTEA-3 labels in sentence case ("Low average"); AlloFlow shows Title Case, and the verifier ignores case.

**Descriptor scale (WIAT-4, KTEA-3).** The examiner picks 10-point or 15-point descriptors in Q-global ("Descriptive categories scale"); no default is documented. AlloFlow defaults to what each publisher's sample reports print: WIAT-4 10-point, KTEA-3 15-point. Step 4 has a "Descriptors" choice for these two, which relabels scores already entered, and a saved report keeps it. When a draft's label fits the other scale, the verifier's message says so and points at that setting.

**Only the generic "Custom Assessment" preset** still gets a WISC-V-style label. A new preset must be added to `RW_INSTRUMENT_SYSTEMS` or to the test's `KNOWINGLY_GENERIC` list.

**GARS-3 words are GARS-3's alone.** "Unlikely" or "very likely" in a sentence about another test is an ordinary word, not a classification claim, and does not hide that test's real label.

### How the verifier uses the bands

- A label is judged against the score's **range on that instrument**, never against the label stored with the score.
- **Another system's term at the same level of concern** gets a non-blocking terminology note. Example: "Borderline" for a WISC-V score of 75.
- **A term that softens the concern** is a blocking mismatch. Example: "Average" for a GARS-3 Autism Index of 100, which is Very Likely.
- **A specific band name from another metric** is a blocking mismatch: "High Average" (a standard-score band) for a BASC-3 T of 63. A plain comparison ("below average", "normal") that no manual on that metric uses is left unchecked.

Reviewer question: is that split right, and is a blocking mismatch too strict for any common phrasing?

## 2. Reference text given to the AI

Reviewer to confirm each item is accurate and not overstated.

- [ ] BASC-3: clinical ≥70 Clinically Significant, 60–69 At-Risk; adaptive scales run the other way.
- [ ] BRIEF-2: higher T means more difficulty; 60–64 mildly, 65–69 potentially clinically, ≥70 clinically elevated. ADHD convergent evidence is *elevated* BRIEF-2 Working Memory and Inhibit.
- [ ] Vineland-3 with FSIQ: "consistent with the score pattern" for ID, with IQ about 65–75 once measurement error is considered. Diagnosis also needs onset in the developmental period and clinical judgment.
- [ ] SLD: the ability-achievement discrepancy is permitted but not required under IDEA 2004 (34 CFR §300.307), and thresholds vary by state. Confirm the current Maine (MUSER) position before any Maine-facing use.
- [ ] Conners 4: rating scales alone do not establish ADHD or its presentation.
- [ ] ICD-10-CM codes as listed in DSM-5-TR:
  - ADHD: F90.0 / F90.1 / F90.2
  - SLD: F81.0 / F81.81 / F81.2
  - ASD: F84.0
  - ID: F70–F73

  These codes are not currently shown to users.
- [ ] Triggers:
  - The ADHD reference is added only for an elevated attention scale (BASC-3 Attention Problems or Hyperactivity; Conners 4 Inattention/Executive Dysfunction, Hyperactivity or Impulsivity; BRIEF-2 Inhibit or Working Memory; each ≥65).
  - The ID reference is added only for a global cognitive composite ≤75 (WISC-V FSIQ, WJ IV GIA, KABC-II MPI, DAS-II GCA).

  Reviewer question: are these the right thresholds and scales?

## 3. BehaviorLens inter-observer agreement

Definitions from Cooper, Heron & Heward, *Applied Behavior Analysis* (3rd ed.), ch. 5. The known-answer cases are in `tests/behavior_lens_ioa.test.js`.

- [ ] **Interval-by-interval (point-by-point).** Intervals where the observers agree on occurrence or non-occurrence, divided by all intervals.
- [ ] **Scored-interval.** Uses only intervals where at least one observer scored an occurrence. Not applicable when there are none.
- [ ] **Unscored-interval.** Uses only intervals where at least one observer scored a non-occurrence. Not applicable when there are none.
- [ ] **Total count.** Smaller total divided by larger total. Not applicable when both totals are 0.
- [ ] **Exact count-per-interval.** Intervals with identical counts, divided by all intervals.
- [ ] **Mean count-per-interval.** Average of smaller ÷ larger per interval. An interval where both observers recorded 0 counts as 100%.
- [ ] **Unequal records.** Records of different lengths are refused for interval methods.
- [ ] **Occurrence marks.** "+", "x", "y" and "yes" count as occurrence; "-", "n", "no" and 0 do not.
- [ ] **Threshold.** 80% is labelled acceptable. Reviewer question: should 90% be shown as the preferred standard?

## 3b. Report Writer checker rules added 2026-09-23 (not yet committed)

The tests for each rule are listed in brackets.

- [ ] **Every subtest the clinician can enter is checkable.** Before this change, 47 of the 110 preset subtests were never matched to a draft citation, so a wrong score for them passed silently. All WJ IV, KABC-II, DAS-II, CELF-5, KTEA-3, SRS-2, GARS-3 and BOT-2 subtests were affected. [`report_writer_verifier_coverage.test.js`]
- [ ] **A bare test name is matched to the right form.** "BASC-3" or "WJ IV" on its own is matched to whichever form holds that subtest with that value. Before, a bare "BASC-3" always meant the Teacher form.
- [ ] **A subtest binds only to a number in its own sentence.** Numbers that are counts ("85 out of 90 days", "45 words") are not read as scores. The bounds of a range or interval ("97-107", "CI 97 to 107") are not read as scores either.
- [ ] **Percentiles** [`report_writer_percentiles.test.js`, `report_writer_report_values.test.js`]
  - Standard scores use the normal curve. They are shown as whole numbers from 1 to 99 and to one decimal outside that; never 0 or 100.
  - T-score percentiles, and every confidence interval, are used **only** when the clinician copies them from the score report.
  - A draft that states a T-score percentile or an interval with nothing recorded is flagged as *unsourced*. This blocks export until the figure is entered or removed.
  - **Reviewer question:** is blocking right, or should unsourced figures be advisory only?
- [ ] **Confidence intervals.** A stated interval must match the recorded bounds (±0.5) and level. An interval that doesn't contain the score is flagged.
- [ ] **Subtest scaled scores (mean 10, SD 3)** can be entered as custom subtests with the score type "Scaled score". [`report_writer_score_entry.test.js`]
  - They get a mean-10 percentile and no composite label.
  - The checker looks for them directly, since 1–19 is below the range it normally reads as scores.
  - **Reviewer question:** should WISC-V scaled-score descriptors be encoded?
- [ ] **Entry limits.** Scores outside these limits are refused. A single-digit standard score gets a hint that it may be a scaled score.

  | Score type | Refused outside | Warned outside |
  |---|---|---|
  | Standard score | 20–200 | 40–160 |
  | T-score | 10–120 | 20–100 |
  | BOT-2 (mean 50) | 10–90 | 20–80 |
  | Scaled score | 1–19 | — |

- [ ] **Eligibility wording.** A draft that states eligibility as a finding ("is eligible for special education", "meets eligibility criteria") gets an advisory note, citing 34 CFR §300.306. Team-framed wording is not flagged. The note never blocks export. [`report_writer_eligibility_language.test.js`]
- [ ] **What the AI receives.** Each score is described with its metric, its label, and a percentile or interval only if one exists. New rules in the generation prompt:
  - Rule 6: never state a percentile or interval that isn't in the data.
  - Rule 7: use the label exactly as given.
  - Rule 8: don't state eligibility.
- [ ] **Summary of Scores.** The printed and copied report include a Summary of Scores table built from the entered data, never by the AI. Normal-curve percentiles are marked \*, and intervals appear only where recorded. [`report_writer_score_table.test.js`]

## 3c. Grounding and draft selection, added 2026-09-23 (not yet committed)

- [ ] **Draft selection.** Of the parallel drafts written for a section (3 by default), the one with the fewest score-check findings is kept. Citation count and length only break ties. Before this change, the draft checker never saw the candidates. [`report_writer_draft_selection.test.js`]
- [ ] **References.** The reference library is split into passages by Lumen's local evidence core. Each section is given the passages that match it: its name, blueprint notes, hypotheses and instruments are the query, within a 6,000-character budget. [`report_writer_reference_retrieval.test.js`]
  - Before, every prompt got the first 3,000 characters of all references, with no notice.
  - Headings in regulation numbering ("VII.2.L.", "§ 300.307", "Chapter 101") are kept as citations.
  - Queries are expanded with clinical synonyms (SLD, OHI, PSW, RTI…) and plural/singular forms.
  - Passages are citable (`[ref:…]`) and appear as evidence chips.
  - If Lumen cannot load, the old first-part behaviour is used, and both the clinician and the model are told.
  - **Reviewer question:** is the synonym table complete for your district's terms?
- [ ] **Accuracy audit.** The audit is given the same passages. A claim about what a regulation says is verified only against them; a claim about the student must still match the facts.
- [ ] **Quotations.** A quotation of six or more words that appears in no background note, observation, verified fact or reference is listed as advisory. It never blocks export. [`report_writer_quote_check.test.js`]
- [ ] **File import.** References can be added from a file (PDF text layer, Word, text) through Lumen's document reader. A scanned PDF is refused with the reader's own instruction to run OCR first. [`report_writer_reference_import.test.js`]
- [ ] **Storage warning.** If the reference library is too large to save on the device, the clinician is told, instead of it silently disappearing on the next visit.

## 3d. Case documents (prior evaluations, IEPs), added 2026-09-23 (not yet committed)

A privacy reviewer and a licensed school psychologist should both check these.

- [ ] **Session only.** Case documents are held in memory for the session. They are not in a saved report, the device draft store or a JSON export, and a report JSON that contains them has them removed on import. Opening another report clears them. [`report_writer_case_documents.test.js`]
- [ ] **Off until turned on.** A document reaches no AI prompt until the clinician ticks "Use redacted passages with the AI" for it. The tick is unavailable while no student name is set, and clearing the name takes an enabled document back out of the prompts, because with no name nothing can be redacted.
- [ ] **Redacted before indexing.** The passages the AI sees come from an index built from redacted text (student name, listed people, emails, phone numbers, IDs, addresses, calendar dates), with the same scrubber as every other prompt. The index is rebuilt when the names change. Each document shows what redaction will miss (name parts that are ordinary words; titled people not listed) before the clinician opts in.
- [ ] **No fallback.** If the passage search cannot load, no case text is sent at all, and the clinician is told. (The reference library instead falls back to its first part.)
- [ ] **Past results stay past.** The prompt tells the model to attribute record content to its record and year, never to present a record's score as a current result, and to give such a score exactly as the record does.
- [ ] **Prior scores in the checker.** A score that contradicts the current data is normally a blocking mismatch. It is accepted as a prior score only when BOTH hold: (a) its sentence marks it as past (a year, "previous", "prior", "earlier", "initial evaluation", "at that time", "last evaluation"...), and (b) one of the case documents contains that subtest with that exact number within 40 characters. It is then listed as matched to that record. Without a record, the mismatch stands, so a wrong current score cannot pass by being called "previous". Reviewer question: is a marker in the SAME sentence the right requirement, or too strict for "In 2022 she was evaluated by the district. Her Full Scale IQ was 82."?
- [ ] **Scaled score at the end of a sentence.** Found while testing the above: a subtest scaled score followed by a full stop ("Block Design was 6.") was read as a decimal and never checked. It is now checked; "6.5" is still skipped.
- [ ] **Citations.** A cited record passage appears as 📁 evidence and in the report's "References Consulted" appendix as "Case record: <redacted title>".

## 3e. Subtests added by hand, and reading the score report, added 2026-09-23 (not yet committed)

- [ ] **Subtests added by hand are checked.** A subtest the clinician types in (for example WIAT-4 Pseudoword Decoding) was invisible to the checker: a wrong score for it in the draft passed, and the row was listed as "not discussed". Each row's own name is now recognised for that report only, and wins over any built-in alias with the same words. [`report_writer_verifier_coverage.test.js`]
- [ ] **Two aliases that joined different scales were removed.** WIAT-4 "Math Problem Solving" (a subtest) was checked against the Math Composite, and WISC-IV "Perceptual Reasoning" / "PRI" against the WISC-V Visual Spatial index. The first gave false blocking findings; the second compared a 2019 WISC-IV index with a current WISC-V one.
- [ ] **Reading the score report.** Step 4 can read the score table pasted from a score report, or its file, on the device (no AI). Nothing is added until the clinician ticks each row. [`report_writer_score_paste.test.js`]
  - No layout is assumed. On a line naming a subtest of the chosen instrument, the score is the number that lies inside the interval that follows it and agrees with its percentile. This is how the sum of scaled scores printed beside a composite, or a raw score printed before a T-score, is told apart. Only numbers with that evidence compete; with none, the first plausible number is shown, unticked.
  - **How far a percentile may sit from the normal curve, calibrated 2026-09-23 on publisher samples** (score/percentile pairs read from the reports, gap = printed minus normal-curve percentile):

    | Instruments | What their percentiles are | Largest gap seen | Tolerance used |
    |---|---|---|---|
    | WISC-V, WIAT-4, KTEA-3, DAS-II (incl. subtest T-scores), CELF-5, Vineland-3, BOT-2 | Normalized: the normal-curve value, rounded | 0.54 (about 110 pairs; the CELF-5 manual's full 121-row table stays within 0.49) | 1 point |
    | WJ IV COG/ACH | Normal curve, but the score is rounded before printing | 1.49 (Academic Applications 104 → 62) | 2 points |
    | KABC-II | Not verified (no sample report found) | — | 2 points, provisionally |
    | BASC-3, BRIEF-2, Conners 4, GARS-3 | Percentile of the raw-score distribution (linear or empirical) | +17.0 (BRIEF-2 self-report T 51 → 71), +13.2 (BASC-3 T 53 → 75), largest in mid-range | Direction only: T ≥ 60 must be above the 50th, T ≤ 40 below |
    | SRS-2 | Score reports print raw and T only | — | No check: the last plausible number is taken as the T-score, and the row says so |

    Sources, all publisher sample reports or manuals read directly unless noted: WISC-V score and interpretive reports; WIAT-4 sample score report; KTEA-3 US and UK samples; WJ IV US, Australasian comprehensive and achievement samples; DAS-II school-age and early-years samples; CELF-5 sample report and Examiner's Manual pp. 142–144 and Appendix B; Vineland-3 interview and teacher form samples; BOT-2 complete form sample; BASC-3 PRS-C, multirater TRS-C and SRP-College samples, a Pearson training deck, and Kamphaus's BASC-2 chapter (a direct BASC-3 manual statement that its T-scores are linear was only seen quoted); Conners 4 single-rater sample and a Buros review; BRIEF-2 parent, teacher and self-report samples ("linear transformations of the raw scale scores"); SRS-2 WPS sample reports; GARS-3 only through a student test review quoting the manual (low–medium confidence). URLs are listed under "Sources: percentile calibration" at the end of this log.
  - Layouts handled: interval before or after the percentile (WIAT-4, KTEA-3, Vineland-3, Conners 4, BOT-2 print it before); percentile before the score (one WJ IV layout); intervals written "88-103", "88–103" or "74 to 86"; ordinal percentiles ("84th", Conners 4); bounds "<0.1", "<1", "> 99", ">99.9"; "± 5" bands (BOT-2) and "82/90" RPIs (WJ IV) ignored; "68% Band" read as the interval level.
  - A row stays unticked when there is no such evidence (prose), when the score is outside its own interval, when the subtest is already entered or listed twice, or when the name is not one of the instrument's (offered as a custom subtest, as a scaled score where the numbers fit that).
  - A percentile that does not fit its score is not recorded. "<0.1" is recorded as 0.1, and said so.
  - The interval level is read from the text ("95% Confidence Interval") and shown for the clinician to confirm or change; when it is not stated, that is said.
  - The report's own labels are compared with AlloFlow's for each score. For WIAT-4 and KTEA-3 they identify the descriptor scale the report used (10- or 15-point), which is switched to when the rows are added.
  - Reviewer questions: KABC-II and GARS-3 score reports were not found; please check a real one. Is taking the last number as the SRS-2 T-score safe for your report layout?
- [ ] **The writing-style sample is de-identified before it is sent.** It goes to the AI with every section and is a report about another student. The scrubber knows only this student's names, so the sample's student, family, teacher and school were sent as written, and the model could copy them, or the sample's ages and scores, into this report. Its proper nouns now become [Name] and its numbers [#], and the Blueprint step lists the names that will be replaced. A capitalised word is kept only if it is report vocabulary (instrument, subtest, label, section words), a common word the sample also uses in lower case, or a title. The prompt calls it another student's report and says to take no facts from it. [`report_writer_style_and_identity.test.js`]
- [ ] **Prior scores (reevaluations).** Each score row can carry the score from an earlier evaluation and where it came from ("2021 evaluation"), typed in Step 4 (checked against the scale's possible range) or found in a case document and ticked. [`report_writer_prior_scores.test.js`]
  - The Summary of Scores shows a Prior column, with the note that scores from different editions, or small differences, may not be comparable. No change is called significant; that needs the manual's critical values.
  - The prompts give it as "prior score 82 (2021 evaluation), from records" and tell the model to name that evaluation when citing it, never to present it as current, and not to call a change significant unless the data says so. The generation-time score check is told a cited prior is not an error.
  - The checker accepts the recorded prior in a sentence marked as past ("up from 82 in the 2021 evaluation"). The same number given as a current score is still a mismatch, and so is any other past number.
  - Found in a case document: its score lines are read for each instrument entered in Step 4 and matched to the rows entered there; the default label takes a year from the document's title only, since a year in its text may be a date of birth.
- [ ] **Score facts that no longer match Step 4.** The report is written from fact chunks copied from Step 4 when facts are extracted. A score, percentile, interval or prior changed afterwards left the prompts using the old fact while the checker used the new one. Step 5 and Generate now say how many score facts no longer match, and "Update score facts" refreshes only those (keeping their ids so citations still resolve, and requiring them to be verified again) without re-running the AI on the background facts. [`report_writer_stale_facts.test.js`]
- [ ] **Differences called significant.** Whether a difference between scores is statistically significant, and how unusual it is, comes from the manual's critical values and base rates, which the AI is never given. Prompt rule 10 forbids the claim unless the data says so; Verify lists any that remain ("significantly lower", "a significant discrepancy", "not significantly different"), advisory. "Clinically significant" (the BASC-3 band term) is not treated as one. Reviewer question: should these block export instead? [`report_writer_significance.test.js`]
- [ ] **Age and grade in the draft.** Verify compares statements of the student's current age or grade ("a 10-year-old", "a fifth grader", "is in the fifth grade", "is in kindergarten") with Step 1, as advisory notes. A sibling's age, a comparison group ("other 10-year-old students") and the past tense ("was a 2nd grader", "as a 3-year-old", "retained in 1st grade") are not read.

## 4. Open questions found during this pass (not changed)

- `sel_tool_emotions.js` cites "Wilkes 2017" for upright posture biasing *memory retrieval*. As far as the author recalls, Wilkes et al. (2017) measured affect and fatigue. The memory-bias finding may belong to Michalak et al. (2014). This has not been verified.
- The Report Writer treats WJ IV and WISC-V labels as authoritative for those instruments. Scored reports from Q-global or Riverside may use a different classification scheme selected by the examiner. **Partly answered 2026-09-23:** WIAT-4 and KTEA-3 now record the descriptor scale with the scores. WISC-V and WJ IV do not yet; is a scheme choice needed for them too?

## Sources: percentile calibration (section 3e)

Read directly unless marked "quoted".

- WISC-V: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-score-report.pdf and https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-interpretive-report.pdf
- WIAT-4: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wiat-4/wiat-4-sample-score-report.pdf
- KTEA-3: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/ktea-3/ktea-3-score-report.pdf and https://www.pearsonclinical.co.uk/content/dam/school/global/clinical/uk-clinical/files/KTEA-3-Score-Report-Sample.pdf
- WJ IV: https://www.waketech.edu/sites/default/files/page-file-uploads/Woodcock%20Johnson%20IV%20Score%20Report%20Example%20-%20Template.pdf ; https://paa.com.au/wp-content/uploads/2018/12/WJ-IV-Comprehensive-Sample-Report-COGNITIVE-ACHIEVEMENT.pdf ; https://paa.com.au/wp-content/uploads/2018/12/WJ-IV-ACHIEVEMENT-Score-Report-Sample.pdf ; online scoring FAQ (up to 8 selectable columns): https://pages.nelson.com/assessment/pdf/WJIVOnlineScoring_ReportingFAQVolume1.pdf
- DAS-II: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/das/das-ii-score-report-school-age-battery-sample.pdf and https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/das/das-ii-score-report-early-years-battery-sample.pdf
- CELF-5: https://reachoutandread.org/wp-content/uploads/2023/06/CELF-Q-Global-Sample-Score-Report.pdf ; Examiner's Manual: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/field-research/celf5-examiners-manual.pdf
- Vineland-3: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/vineland-3/vineland-3-comprehensive-interview-form-sample-report.pdf and https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/vineland-3/vineland-3-domain-level-teacher-form-sample-report.pdf
- BOT-2: https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/bot-2/bot-2-complete-form-sample-report.pdf
- BASC-3: https://www.pearsonclinical.co.uk/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-report-sample.pdf ; https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-multirater-report-sample.pdf ; https://www.pearsonclinical.ca/content/dam/school/global/clinical/us/assets/basc-3/basc-3-srp-college-interpretive-summary-report.pdf ; training deck: https://www.cgcatogo.com/uploads/1/0/6/7/10675379/introduction_to_basc-3_and_flex_monitor_gnets_sept_2016__1_.pdf ; Kamphaus, BASC-2: https://reachoutandread.org/wp-content/uploads/2023/06/BASC-2-Kamphaus-2015.pdf ; BASC-3 manual statement quoted only: https://quizlet.com/238969169/basc-3-manual-ch-2-flash-cards/
- Conners 4: https://www.pearsonclinical.co.uk/content/dam/school/global/clinical/uk-clinical/files/conners-4/Conners-4-Sample-Single-Rater-Report.pdf ; Canivez, Buros review: https://www.ux1.eiu.edu/~glcanivez/Adobe%20pdf/Publications-Papers/Canivez%20(in%20press)%20Buros%20MMY%20Conners-4%20Review.pdf
- BRIEF-2: https://www.parinc.com/docs/default-source/product-resources/brief2-parent-form-interpretive-report-sample-(002).pdf?sfvrsn=520a468a_4 ; https://www.parinc.com/docs/default-source/brief2-docs/brief2-teacher-form-score-report-sample.pdf ; https://paa.com.au/wp-content/uploads/2018/09/BRIEF2-Parent-Form-Interpretive-Report-Sample.pdf ; https://www.acer.org/files/BRIEF2_Self_PiC_Interpretive_Sample_Report.pdf
- SRS-2: https://paa.com.au/wp-content/uploads/2018/12/SRS-2-Sample-Report.pdf and https://www.acer.org/files/SRS-2_OES_sample_report.pdf
- GARS-3 (manual quoted only, low–medium confidence): https://s3.amazonaws.com/rm3.photos.prod.readmedia.com/students/3410412/photos/original/CSD_262_Test_Review.pdf
- KABC-II report configuration: https://qglobal.pearsonclinical.com/qg/static/Product/nl/KABC/KABC_Configure_Reports.htm

## Change log

| Date | Change | Commit |
|---|---|---|
| 2026-09-22 | Per-instrument bands replace one generic table; verifier judges label against range; saved reports re-labelled on load | f3729341d |
| 2026-09-22 | Reference text and triggers corrected | 459a4724a |
| 2026-09-22 | Frozen-copy classification tests removed | 9fe2f727d |
| 2026-09-22 | IOA formulas corrected; grid result no longer one click behind | f55ff3bdf |
| 2026-09-22 | Remaining power-posing citations hedged; gate extended | 380c790eb |
| 2026-09-23 | Checker covers every preset subtest; percentiles, confidence intervals and scaled scores sourced and checked; entry guard; Summary of Scores table; eligibility-language notes (section 3b) | not yet committed |
| 2026-09-23 | Checker-first draft selection; per-section reference retrieval on Lumen's core; audit sees reference passages; quotation check; reference file import (section 3c) | not yet committed |
| 2026-09-23 | Hand-added subtests checked; two cross-scale aliases removed; score report reading in Step 4; style sample de-identified; age and grade notes; prior scores (section 3e) | not yet committed |
| 2026-09-23 | Case documents (session-only, opt-in, redacted before indexing); prior scores matched to their records; sentence-final scaled scores checked (section 3d) | not yet committed |
| 2026-09-23 | Bands sourced and encoded for WIAT-4 (10 and 15-point), KTEA-3 (10 and 15-point), DAS-II, CELF-5 and GARS-3; Conners 4 60–64 "Slightly Elevated"; SRS-2 legend wording; BRIEF-2 ≤59 "Average"; descriptor-scale choice in Step 4 (section 1) | not yet committed |
