# Draft feasibility protocol

**Status:** Concept protocol for investigator co-design. Not an IRB submission and not authorized for recruitment or data collection.

## 1. Study objective

Assess the feasibility, usability, efficiency, and output quality of a frozen AlloFlow workflow for creating accessible differentiated instructional materials.

The study will not test “AlloFlow” as an undifferentiated suite and will not claim student efficacy.

## 2. Stage 1 design

Use a within-participant, counterbalanced crossover design.

- **Participants:** approximately 15–30 practicing or preservice educators. The PI will determine eligibility and sample size based on the intended inference.
- **Condition A:** participant's ordinary material-development process, with the tools they normally use documented.
- **Condition B:** frozen AlloFlow research workflow with a standard orientation.
- **Tasks:** two source passages matched for length, complexity, topic familiarity, and required outputs.
- **Target output:** one differentiated passage, one vocabulary support, one response scaffold, and one accessible digital export.
- **Counterbalancing:** randomize or systematically alternate condition and task order.
- **Blinding:** remove condition-identifying metadata before expert scoring where practical.

## 3. Outcomes

### Primary feasibility outcomes

| Construct | Proposed measure |
|---|---|
| Completion | Percentage completing all required outputs without researcher rescue |
| Active time | Instrumented active task time, with idle-time rules specified in advance |
| Accessibility quality | Human rubric covering headings, reading order, text alternatives, contrast, forms, language, and export integrity |
| Instructional quality | Human rubric covering factual fidelity, goal alignment, appropriateness, clarity, and scaffold usefulness |
| Revision burden | Number, severity, and minutes of human revisions before “classroom-ready” judgment |
| Critical errors | Factual, accessibility, safety, or pedagogical defects that would prevent classroom use |

### Secondary outcomes

- System Usability Scale or investigator-selected alternative.
- NASA-TLX or a shorter cognitive-load instrument.
- Trust calibration: confidence before and after reviewing output defects.
- Feature-use and failure-path logs.
- Qualitative interview on fit, risks, and workflow changes.

### Exploratory analysis

- Results by educator experience or role.
- Types of errors introduced, detected, or corrected by AI and by educators.
- Relationship between time saved and revision quality.

No subgroup inference should be made from an inadequately sized feasibility sample.

## 4. Intervention specification

Before enrollment, archive:

- Git commit and release identifier;
- exact modules enabled in the research interface;
- model provider, model identifier, parameters, and fallback behavior;
- system and task prompts;
- standards or reading-level algorithms used;
- accessibility checks and their known limits;
- export format and validator version; and
- allowed configuration changes.

Any material change after enrollment creates a new intervention version and must be documented. Critical safety fixes may be applied under a predefined deviation process.

## 5. Data-minimization rule

Stage 1 uses researcher-provided, non-student source material. Participants must not enter:

- student names or identifiers;
- IEPs, evaluations, behavior records, or education records;
- identifiable student work;
- protected health information; or
- confidential district material without express authorization.

The default research configuration should be local or use UMaine-approved services. See [privacy and system boundary](03_PRIVACY_AND_SYSTEM_BOUNDARY.md).

## 6. Analysis approach

- Report descriptive feasibility estimates with uncertainty, not only p-values.
- Compare within-participant time, rubric, defect, and revision outcomes using methods chosen by the investigator after inspecting distributional assumptions.
- Report all critical errors individually by category.
- Calculate inter-rater agreement for human rubric scoring.
- Separate human ratings from automated accessibility scores.
- Preserve and report protocol deviations, missingness, model failures, and researcher rescues.

## 7. Progression criteria

The PI should finalize thresholds before data collection. Candidate criteria for proceeding to a student-facing feasibility phase are:

- at least 85% unaided task completion;
- no unresolved severe privacy or security event;
- no systematic factual-integrity failure that makes routine review impractical;
- no critical accessibility defect left undetected by the documented review workflow;
- median usability in an acceptable range selected by the investigator; and
- evidence that educator review remains meaningful rather than becoming automation bias.

Failure to meet a threshold is useful evidence and should produce redesign, not threshold revision after the fact.

## 8. Stage 2 option

If Stage 1 supports progression, conduct a separate, approved classroom-feasibility protocol.

Possible questions:

- Can educators implement the workflow with fidelity during normal planning?
- What support and training are required?
- Which learners encounter access barriers?
- How often do technical or AI failures disrupt instruction?
- Do students and families regard the materials as useful and respectful?

Any collection of student interaction or outcome data requires a new data plan, appropriate consent/assent decisions, school authorization, and IRB review or determination.

## 9. Independence and conflicts

Aaron is the platform creator and therefore has an unavoidable intellectual and professional conflict. The protocol should state it explicitly.

- The UMaine PI controls study design, recruitment, analysis, and publication decisions.
- Independent raters score primary quality outcomes.
- Aaron may explain the system and correct reproducible technical defects but should not score participant outputs or decide data exclusions.
- Results may be published whether favorable, null, or unfavorable.
- Any future employment or IP agreement is disclosed under UMaine policy.

