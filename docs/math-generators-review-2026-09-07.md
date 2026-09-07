# Math Fluency and Math Studio: generator review

September 7, 2026. Scope: the current working-tree Math Fluency player, shipped fixed-form data, unpublished alternate-form generator, Math Studio/Assessment Builder, shared generation helpers, and their scoring/persistence connections. This pass adds review evidence and documentation; it does not modify application logic.

The strongest next step is consistency: use the same validation across generation entry points, keep adaptation inside the teacher's selected skill range, and make every learning comparison attributable to a learner and an administration protocol.

## Evidence and limits

- Executed the real module exports and AST-extracted callbacks with controlled inputs and mocked AI responses. The examples below are reproducible code behavior, not claims about how frequently a live model makes these mistakes.
- Independently recomputed **450 answers in 18 shipped forms** (K–5, A/B/C) and **3,000 answers in 120 unpublished draft forms** (grades 1–6). All were arithmetically correct. Shipped forms had no identical ordered problems within a form.
- Ran 353 relevant existing tests: initially 343 passed and 10 failed. Reran the six affected files with one worker and a 30-second test timeout: 132/136 passed. Combining the latest result for each test leaves **349 passing and four failing**. The four remaining failures are detailed below; the review does not claim a green suite.
- Compared six relevant root modules/data files with their public copies: all matched. Source hashes are saved with the reproduction results.
- No production-browser, real classroom, screen-reader, live-model quality, or psychometric-equivalence study was performed. Computational correctness and empirical validity are different questions.

Run the diagnostic from the repository root:

`node reports/math-generators-review-2026-09-07/reproduce.cjs`

Evidence: [reproduction results](../reports/math-generators-review-2026-09-07/reproduction-results.json), [test summary](../reports/math-generators-review-2026-09-07/test-summary.json).

## Existing safeguards to preserve

The fixed-form player already disables adaptive changes and practice feedback, marks interrupted runs invalid, and separates instructional references from validated norms. Assessment Center preserves named-learner attribution. The regular Math Studio generator already normalizes malformed data and guards stale generation results. These are useful foundations; the findings concern gaps between these paths and the remaining measurement assumptions.

## Highest-priority findings

### 1. Assessment Builder bypasses the stronger shared generation pipeline

**Confirmed behavior:** a three-problem computation block was given a mocked response containing only `2 + 2 = 5`. Builder saved the wrong answer and announced “Assessment complete,” with one problem. It did not call the shared normalizer or arithmetic verifier. Two immediate invocations launched two requests and saved two artifacts.

The regular generator already has normalization, stable problem identity, arithmetic verification, stale-request protection, and content-language policy. Builder independently constructs its prompt, parses JSON, lightly normalizes steps, and writes to history. Its prompt does not carry the regular generator's content-language/translation policy. A malformed or partial model response can therefore have different consequences depending on which button the teacher used.

**Refinement:** route both entry points through one preparation service. Keep section IDs, requested/accepted/rejected counts, validation reasons, and a generation-run ID. Give Builder a pending state and duplicate-request guard. Show partial completion and allow retrying only failed sections. Keep final publication as a deliberate teacher action after review when validation is unresolved.

**Acceptance check:** requesting three items and receiving one produces an explicit partial result; an incorrect answer is reviewed or corrected consistently; double-clicking creates one run; language policy survives every entry point.

Evidence: [Builder generation callback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_create_module.js:260), [shared normalizer and verification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generation_helpers_source.jsx:1700).

### 2. An inconsistent expression can overwrite a correct answer

**Confirmed behavior:** the main verifier received:

- Question: `4 × 5`
- Expression: `4 + 5`
- Answer: `20`
- Explanation: multiply four by five to get twenty.

It changed the answer to `9` while leaving the question and explanation unchanged. It records `_originalAnswer` and an auto-correction flag, and the renderer offers an auto-correction indicator; the saved task is nevertheless internally contradictory.

The evaluator establishes what the `expression` computes. It does not establish that the expression models the question. The same distinction matters for word problems, units, algebra, fractions, and diagram-dependent questions.

**Refinement:** distinguish “expression evaluated,” “answer agrees with expression,” and “task verified.” For a conflict, preserve both candidates and require review or regenerate the entire inconsistent item. For template-generated arithmetic, derive the displayed question, answer, and worked steps from one structured operation. Avoid independently generating fields that must agree.

**Acceptance check:** the example above remains a review-needed conflict; it never becomes a student task with `4 × 5` keyed to `9`.

Evidence: [verification and auto-correction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generation_helpers_source.jsx:1318), [renderer status indicator](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_math_source.jsx:1120).

### 3. Fluency adaptation can violate the selected range—and make support harder

**Confirmed behavior from the actual adaptive branch:**

| Starting configuration | Trigger | Generated next item |
|---|---|---|
| Kindergarten, addition within 10 | Third first-try success | `52 + 19` |
| Grade 3, addition within 10 | Second missed/coached response | `54 + 33` |

“Stretch” chooses the generic `extended` set. “Support” chooses the grade recommendation, which can exceed a teacher-selected remedial range. Neither checks the original range. The replacement also uses the just-answered operation, so adaptation can change the next operation in a mixed set.

**Refinement:** make the teacher's selected domain a hard boundary. Adapt scaffolding, fact family, regrouping, operand distribution, and spacing inside that boundary first. Require sustained evidence across distinct facts before proposing a broader range. A support action should be demonstrably no harder than the selected domain. Track the actual item difficulty, rather than retaining only the starting set label.

**Acceptance check:** every answer in “within 10” stays within 10 under successes and errors; support cannot promote the range; mixed-operation quotas survive adaptation.

Evidence: [three-response threshold](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:305), [adaptive replacement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:1756).

### 4. The Fluency panel's own history and mastery are not learner-scoped

The Assessment Center callback correctly writes a completed, valid, named fixed-form result to that student's probe history. **The separate Fluency panel dashboard has a different storage path:** shared `allo_fluency_history`, shared fact-mastery storage, and an Accuracy Focus draft key. The panel accepts grade but no general learner-identity prop. Its comparison key contains grade, mode, form, operation, difficulty, and duration—no learner.

**Confirmed helper behavior:** histories representing two learners at 50% and 100% produce a combined 75% report. Equal configuration creates equal comparison keys; an illustrative two-session addition history also produces a +40 DCPM trend across the two records. These examples show the aggregation behavior; they do not imply the Assessment Center's separately scoped history has the same defect. Ordinary practice currently stores `student: null`, making later attribution especially difficult.

**Refinement:** carry a stable learner ID through practice, fixed forms, mastery, resumable drafts, goals, reports, and exports. Partition or filter storage consistently. Preserve unattributed legacy records separately rather than assigning them to whoever next opens the panel. Clear or switch in-memory state when the learner changes.

**Acceptance check:** two learners on one teacher device never share mastery, personal-best comparisons, suggested facts, or resumable work.

Evidence: [comparison key and persistence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:1300), [report aggregation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:800), [correct Assessment Center attribution guard](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_sidebar_panels_source.jsx:1953).

## Fixed forms and measurement refinements

### 5. Define and validate form difficulty beyond operation counts

All shipped answers are correct, but form characteristics vary:

| Grade | Total answer digits A / B / C | Other observed difference |
|---|---|---|
| K | 25 / 25 / 25 | A has 14 additions/11 subtractions; B and C have 13/12 |
| 1 | 40 / 40 / 41 | Ones-place regrouping items: 24 / 24 / 23 |
| 2 | 48 / 50 / 50 | A has 6 multiplications; B and C have 7 |
| 3 | 38 / 38 / 38 | First ten items supply 16 / 15 / 15 answer digits |
| 4 | 56 / 58 / 61 | First ten items supply 22 / 22 / 25 answer digits |
| 5 | 65 / 68 / 68 | Ones-place regrouping items: 11 / 11 / 10 |

These differences do not independently prove that one form is harder. They identify uncontrolled characteristics relevant to a timed, digits-correct measure. Position also matters when learners reach only part of a form.

The unpublished generator preserves operation histograms but samples operands independently. It does not enforce its own dividend lower bound: **147 draft division items fall below the recorded minimum**. Examples include grade 3 `20 ÷ 5` with minimum dividend 24, grade 4 `30 ÷ 6` with minimum 60, and grade 5 `30 ÷ 10` with minimum 132. Draft grade 2 forms contain 4–13 ones-place regrouping items versus 16–17 in the shipped forms they were derived from. The draft is explicitly marked unpublished and pending review; that gate should remain.

**Refinement:** create explicit blueprints for operation mix, operand and answer ranges, answer length, regrouping/borrowing, fact families, zero/identity facts, and difficulty by item position. Validate every constraint and fail generation when it cannot be satisfied. Keep stable seeds, form IDs, versions, and hashes. Check repeat exposure across forms, not only duplicates within one form.

Use design controls as a starting point, then collect field evidence before claiming equivalence. NCII explicitly distinguishes alternate-form design from empirical comparability and evaluates alternate forms alongside reliability, validity, and growth sensitivity. [NCII on parallel/equated forms](https://intensiveintervention.org/resource/why-do-we-need-ensure-we-have-multiple-parallel-or-equated-forms-when-measuring-student), [NCII progress-monitoring tools guidance](https://intensiveintervention.org/resource/academic-progress-monitoring-tools-chart).

Evidence: [shipped bank](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/psychometric_math_probes.json:1), [draft generator](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/generate_pm_math_forms.cjs:112).

### 6. Tighten the meaning of a comparable run

The panel records access supports, but its comparison key omits adaptive status, read-aloud, keypad/response method, item count, and bank/scoring version. The reproduction confirms that adaptive spoken practice and nonadaptive silent practice collide in the same key.

Also, every shipped form contains 25 items. Completing those items early calls `finishProbe('complete')`; scoring uses actual elapsed time and marks the run valid for comparison. Thus a short exhausted form can join a full-duration series without a separate ceiling or protocol flag. This is a measurement-policy decision, not necessarily an arithmetic error.

**Refinement:** distinguish descriptive practice rates from protocol-compatible assessment comparisons. Include relevant administration settings and versioned form identity. Record completed-form exhaustion separately, retain item-level response evidence, and establish an explicit policy for early completion. Avoid withholding access supports; instead preserve and explain their use when comparing results.

The current code already labels its targets as instructional references rather than validated diagnostic norms. Preserve that improvement.

Evidence: [comparison key](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:1300), [elapsed-time validity calculation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:1393), [end-of-form completion](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:1791).

## Teacher workflow and learning refinement

### 7. Make quantity controls and completion messages trustworthy

The Math Studio quantity control is passed through state, but the Problem Set Generator prompt says to produce five problems when the topic text omits a count. A test with quantity 12 and “addition practice” confirmed that instruction; a one-item response was accepted with a generic success message. Builder similarly requests an exact count without enforcing it.

The legacy/basic fluency generator has a different count issue: single-level subtraction has only 91 unique ordered nonnegative facts in its 0–12 range. Asking for 120 returned 91. The newer practice generator allows repeats after exhaustion, so behavior depends on the chosen set.

**Refinement:** resolve one effective requested count, explain explicit-text overrides, and validate delivered count. When a fact domain is too small, disclose the repeat policy or cap the UI selection. Show “12 requested, 10 ready, 2 need review” rather than generic completion.

Evidence: [quantity control](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_create_module.js:490), [topic-generation prompt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generation_helpers_source.jsx:1604), [legacy fact generator](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:236).

### 8. Distinguish successful practice from durable mastery

The existing coach offers useful strategies, retries, and eventual answer reveal; first-try accuracy is already separated in Accuracy Focus. However, the fact dashboard can label a fact “Secure” after three correct attempts, and one six-second speed threshold applies across fact types. That is thin evidence for durable recall, especially with immediate repeats, different input methods, or different supports.

**Refinement:** show “successful in recent practice” until evidence includes spaced retrieval across sessions. Track support and answer-reveal provenance. Make speed expectations appropriate to the task and response method. Generate a mix of targeted facts, related facts, and delayed retrieval while preserving the chosen instructional range. For Math Studio, structured skill/answer schemas would also enable meaningful error explanations, equivalent fraction/unit handling, and diagnostic distractors without relying on a model to invent all fields independently.

Evidence: [mastery classification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/math_fluency_module.js:687).

## Test and implementation priorities

The four remaining existing-test failures are three stale source-location/adjacency assertions and an extracted Area Model grading harness that omits the `feedback` binding. The relevant sidebar wiring now lives in its extracted module. These are distinct from the confirmed runtime defects above; they should be repaired without weakening behavior checks. Six initial failures disappeared on the slower, single-worker rerun.

A focused implementation sequence:

1. **Protect answers and generation completion:** unify Builder and standard preparation; retain conflicting answers for review; enforce counts and duplicate-run protection.
2. **Protect learner evidence:** carry learner identity through Fluency state/storage and constrain adaptive changes to the selected range.
3. **Strengthen fixed forms:** enforce a versioned blueprint, repair draft division bounds, and add administration/comparison provenance before considering the draft bank for release.
4. **Refine instruction and teacher review:** spaced mastery evidence, clearer validation summaries, consistent language policy, and section-level retries.

Add behavior tests that run the actual generation-to-review-to-student path, malformed/partial model responses, two learners on one device, all adaptive boundary transitions, and whole-bank constraint audits. Current passing tests cover many useful safeguards, but they did not expose the reproduced cross-path inconsistencies.
