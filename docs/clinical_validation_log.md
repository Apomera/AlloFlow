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
| Conners 4 | ≥70 Very Elevated · 65–69 Elevated · 60–64 High Average · 40–59 Average · ≤39 Low | Medium (carried over from Conners 3; confirm the 4th edition kept them) | |
| BRIEF-2 | ≥70 Clinically Elevated · 65–69 Potentially Clinically Elevated · 60–64 Mildly Elevated · ≤59 Within Normal Limits | Medium-high | |
| SRS-2 | ≥76 Severe Range · 66–75 Moderate Range · 60–65 Mild Range · ≤59 Within Normal Limits | Medium-high | |
| BOT-2 (standard scores, mean 50) | ≥70 Well-Above Average · 60–69 Above Average · 41–59 Average · 31–40 Below Average · ≤30 Well-Below Average | Medium-high | |
| DAS-II; used only to recognise its terms, not to label | ≥130 Very High · 120–129 High · 110–119 Above Average · 90–109 Average · 80–89 Below Average · 70–79 Low · ≤69 Very Low | Medium | |

**Not encoded yet.** These show a generic WISC-V-style label, and the verifier accepts any recognised term for the score:
- WIAT-4 (possibly the same system as the WISC-V; the manual may also offer a 15-point system)
- DAS-II
- CELF-5
- KTEA-3

Encoding one means adding it to `RW_INSTRUMENT_SYSTEMS` and to the test's `ORACLE`.

**Deliberately unclassified:** the GARS-3 Autism Index. It is a likelihood scale, not an ability score, so it gets no generic label and a low index is not treated as a concern. If the manual's probability levels are to be shown, encode them from the manual; do not reuse ability-score bands.

### How the verifier uses the bands

- A label is judged against the score's **range on that instrument**, never against the label stored with the score.
- **Another system's term at the same level of concern** gets a non-blocking terminology note. Example: "Borderline" for a WISC-V score of 75.
- **A term that softens the concern** is a blocking mismatch. Example: Conners' "High Average" for a BASC-3 T of 63, which the BASC-3 calls At-Risk.

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

## 4. Open questions found during this pass (not changed)

- `sel_tool_emotions.js` cites "Wilkes 2017" for upright posture biasing *memory retrieval*. As far as the author recalls, Wilkes et al. (2017) measured affect and fatigue. The memory-bias finding may belong to Michalak et al. (2014). This has not been verified.
- The Report Writer treats WJ IV and WISC-V labels as authoritative for those instruments. Scored reports from Q-global or Riverside may use a different classification scheme selected by the examiner. Should the verifier respect a scheme recorded with the scores?

## Change log

| Date | Change | Commit |
|---|---|---|
| 2026-09-22 | Per-instrument bands replace one generic table; verifier judges label against range; saved reports re-labelled on load | f3729341d |
| 2026-09-22 | Reference text and triggers corrected | 459a4724a |
| 2026-09-22 | Frozen-copy classification tests removed | 9fe2f727d |
| 2026-09-22 | IOA formulas corrected; grid result no longer one click behind | f55ff3bdf |
| 2026-09-22 | Remaining power-posing citations hedged; gate extended | 380c790eb |
