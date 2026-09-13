# Refining Applied Problem Solving

Latest refinement: [second pass and validation](PASS2.md).

Implementation completed locally: [changes, validation, and preview](IMPLEMENTATION.md). The findings below describe the original version.

Applied Problem Solving should become a guided workspace that helps learners make and defend a decision, with a clear next action and tools that appear when useful. Its underlying learning design is already substantial. The greatest opportunity is to make that design easier to use, then strengthen the connection between evidence, feedback, revision, and the final response.

The recommended direction is **Understand → Explore → Build → Check → Reflect**. Keep the existing challenge families and student ownership protections. Consolidate the ten writing phases into these five navigable stages, make support contextual, preserve a small testing-and-revision loop in the short version, and distinguish source verification from learner self-assessment.

Images can help, but the first visual investment should be editable comparison tables, evidence maps, diagrams, and test planners. Automatic illustrations should be a selective option, with a stated learning purpose and a text equivalent.

## What the current tool already does well

The resource is called **Applied Challenge Studio** in the interface and uses `applied-challenge` internally. It supports Investigate, Design, Decide, Propose, and Explore, with framing modes ranging from an AI-written challenge to student-framed questions. Those are useful distinctions: an investigation plan should not be judged as if it were a completed experiment, and a philosophical argument should not be treated as a single-answer quiz.[^1]

Several existing capabilities should be preserved:

- AI prompts request one hint, pressure point, or actionable feedback response, and explicitly prohibit writing the learner's answer or inventing research findings.
- Lesson facts, assumptions, planned checks, observations, and decisions occupy separate fields. Learners can use, adapt, or decline an AI pressure test.
- Pending lesson-fact review prevents the normalizer from treating ledger rows as verified. Feedback is also constrained when facts or evidence still need checking.
- Runtime requests are guarded against changed drafts and resource identities. Existing interaction tests exercise these protections.
- The shared workspace boundary separates student responses from the teacher template, supports a temporary student preview, and exposes save status and work backups.
- Read-aloud integration, labeled controls, a centralized export model, fillable HTML, and paper worksheet output already exist.[^2][^3][^4]

These capabilities make a focused refinement preferable to rebuilding the resource. Proposed changes should reuse the existing response boundary, accessibility controls, and export model.

## Evidence from the current interface

The local review used the current generated module, the actual shared response boundary and read-aloud component, the project's Tailwind configuration, and an authored sixth-grade garden decision scenario. AI responses were mocked. The scenario included three lesson facts, three success criteria, and two constraints. Measurements describe this fixture, not every possible generated resource or the full deployed application.[^5]

| View | Document width | First workspace field, from page top | Total document height |
| --- | ---: | ---: | ---: |
| Standard, 1280 px desktop | 1280 px | 2537 px | 4292 px |
| Standard, 390 px phone | **489 px** | **4586 px** | 7241 px |
| Standard, 320 px phone | **489 px** | **5344 px** | 8233 px |
| Compact, 390 px phone | 390 px | 4314 px | 6799 px |
| Student-framed, 390 px phone | **489 px** | 3977 px | 6632 px |

All views used a 900 px viewport height. The compact case deliberately retained the same content to isolate the effect of the interface's scope setting; it is not evidence of how concise a live compact generation would be. The fixture banner and shared controls contribute to these distances.

In student focus mode, **six textareas remained visible**: the current workspace field plus five self-check notes. Nineteen headings were visible in the document. The initial progress indicator read **1 of 10 sections started / 10%**, because the template's question is copied into the workspace before the learner acts. Compact navigation displayed steps **1, 3, 4, 6, 7, 10**.[^5][^6]

The horizontal overflow was traced to the unconstrained “Hint for phase” selector and its flex container. Its longest option determines the width. A Design-family variant also overflowed, to 453 px on a 390 px viewport. The screenshot shows the selector extending beyond the viewport.[^5]

![Current phone workspace: phase selector extends beyond the right edge, and the evidence organizer appears before the writing field.](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/phone-workspace.png)

The module build freshness check passed. **47 existing tests passed** across the three Applied Challenge suites. Eight browser fixture variants reported no axe violations or browser runtime errors; navigation moved focus correctly and edits reached the response boundary. This illustrates a testing gap: a clean automated accessibility result did not catch the independently measured reflow problem. No claim of WCAG conformance or learning effectiveness follows from these results.[^5][^7]

## Highest-priority refinements

### 1. Put the learner's next action near the beginning

The brief, role, audience, question, seed direction, facts, unknowns, criteria, constraints, deliverable, evidence boundary, and three support cards precede the workspace. Once there, the learner encounters the hint controls and optional evidence ledger before reaching the phase navigation and writing field. Focus mode only limits phase fields; it leaves self-checks and testing sections visible below them.[^8]

**Recommendation:** Open with a short situation, the purpose of the response, and one primary action. After the learner starts, retain a compact challenge summary alongside the active work area on desktop. On phones, make reference details expandable near the current step. Keep the full brief accessible without requiring learners to scroll through it each time they return to their work.

Show evidence organization in Explore, criteria checking in Build or Check, and testing controls in Check. Preserve an “Overview” option for learners who benefit from seeing the complete plan. Avoid requiring all users to follow a rigid wizard: stages should remain directly accessible, and partially completed work should survive navigation.

The five-stage model is a design hypothesis to validate, not a research-established optimum. CAST's guidance supports organizing information and making planning resources available; it does not prescribe a particular number of screens.[^9]

### 2. Repair reflow and simplify navigation

Constrain the current phase selector and its containing flex items to the available width, with `min-width: 0` where needed. Use short stage labels and place the longer family-specific prompt in the active stage. In focus mode, a separate “Hint for phase” selector is redundant: the hint should already apply to the selected stage.[^8]

Use one navigation system, visible active state, and descriptive actions such as “Continue to Explore.” Recompute displayed numbering from visible stages. Maintain the existing focus transfer, then verify that the target and its instructions remain visible with the on-screen keyboard open.

W3C's reflow criterion addresses ordinary vertical content at 320 CSS px without loss of information or functionality or unnecessary two-dimensional scrolling. The observed selector problem warrants a targeted correction and full-host retest.[^10]

### 3. Make Compact a complete short learning cycle

Compact currently removes the dedicated assumptions, testing reflection, and revision phases while leaving testing and validation organizers elsewhere in the UI. Standard and Extended expose the same ten phase IDs; their difference is chiefly a generation instruction.[^6]

**Recommendation:** Keep the same five-stage navigation across scopes, changing the depth inside each stage:

| Scope | Proposed student experience | What remains essential |
| --- | --- | --- |
| Quick application | One concise response, two possibilities, one evidence connection, one brief check | A reasoned choice, uncertainty, and a keep-or-revise decision |
| Full challenge | More developed comparison, explicit criteria, one documented check | Accurate lesson use, alternatives, observation, revision, transfer |
| Extended project | Multiple sessions, research or prototype artifacts, optional repeated checks | A traceable record of how evidence changed the work |

Avoid promising an exact completion time from the scope label. Let the teacher set the available time and materials, and use that information to bound the generated task. Reading and writing load should be adjusted without weakening the intended reasoning.

### 4. Make support fade through interaction

“Support that fades” is currently a static group of cards selected by the framing mode. Progressive mode displays the example, frame starter, and coaching prompts together. It does not implement a learner-controlled transition from more support to less support.[^8]

**Recommendation:** Present the current prompt first, with two nearby options: a thinking prompt and a parallel example. A teacher can choose whether an example starts open. Learners can close or reopen help, and later stages can default to less scaffolding while keeping access available. Never remove accessibility accommodations as a reward for progress.

Separate two decisions in setup: **Who frames the problem?** and **How much support starts visible?** A student who writes their own question may still need substantial support comparing evidence; a complete teacher-provided question does not imply the learner needs every scaffold.

CAST recommends adjustable scaffolds and gradual release. The IES study guide supports alternating worked examples with problem solving, but the current short parallel reasoning move is not equivalent to a complete worked solution. Evaluate its quality and suitability separately.[^11][^12]

### 5. Turn generic writing boxes into family-specific thinking tools

The families currently change labels, prompts, and suggested validation methods, while all workspace phases remain text fields. “Model, sketch, or prototype” and “Oral explanation” are evidence-form labels, not actual artifact inputs in this component.[^1][^13]

| Family | Useful starting organizer | What the learner should decide |
| --- | --- | --- |
| Investigate | Question → evidence needed → method → feasibility/ethics | What could answer the question and what remains unknown |
| Design | Need → constraints → alternatives → prototype test | Which design choice to try and how to test it |
| Decide | Options × shared criteria, with linked evidence and uncertainty | Which tradeoff to accept and why |
| Propose | Audience → need → actions/resources → assumptions | Whether the plan is feasible and what must be checked |
| Explore | Position → reasons → strongest alternative → counterexample | Which reasoning survives scrutiny, without grading identity or belief |

These should be optional views of the same work, not additional worksheets to complete. Reuse an evidence entry across the organizer, draft, and review. Avoid automatically scoring options or choosing the “winner” before the learner explains their judgment.

Offer accessible tables and structured text first. Add sketches, files, or recorded explanations through existing platform capabilities after checking the delivery and accessibility implications. Every artifact needs an editable explanation or equivalent text, and grading criteria should assess the intended reasoning rather than typing volume. CAST treats varied expression as a way to reduce communication barriers; it does not imply every modality is suitable for every objective.[^14]

## Evidence, ownership, and feedback

### Make provenance visible and precise

The existing fact-review gate is valuable, but verification remains too coarse. Ledger rows hold text and a status; they do not contain a required link to a specific source fact. Once the brief is marked verified, a row with unrelated text can retain the “verified” status. This was reproduced against the normalizer; it does not demonstrate an actual learner submission being misjudged.[^6][^15]

Add source-linked fact objects with stable IDs, a source locator or excerpt, and review state. Let a learner attach a fact to a claim, then explain the connection. Distinguish:

- **Source statement reviewed by teacher.**
- **Connection claimed by learner.**
- **Outside information that needs checking.**
- **Assumption, estimate, or prediction.**

A verified source statement does not automatically verify a student's interpretation or recommendation. The UI should make that distinction legible. A source excerpt or location should be available next to the fact in teacher review, with learner delivery determined by the existing sharing policy. Preserve the current protections around private source text.

### Fix small behaviors that undermine student ownership

Three reproducible behaviors deserve attention before adding advanced features:

| Current behavior | Why it matters | Proposed change |
| --- | --- | --- |
| Clearing the prefilled working question causes the original question to reappear | The learner cannot leave it blank while reframing | Apply defaults only at creation; distinguish an absent value from an intentionally empty value |
| The prefilled question counts as a started section | Progress includes template content | Show the current stage separately; count learner-authored work or an explicit “Use this question” action |
| Self-check ratings are keyed by criterion index | Replacing or reordering a criterion can attach an old “Met” rating to a new requirement | Use stable criterion IDs and revisions; mark affected ratings for review when meaning changes |

The criterion behavior is intentional in the current comment so minor wording edits preserve ratings, but it also preserves ratings for a completely different requirement at the same index. The solution should distinguish harmless copy edits from changed expectations.[^6][^16]

### Preserve the feedback the learner is trying to use

Workspace edits clear the saved hint and feedback. This prevents stale coaching from appearing current, but it also removes the feedback as soon as the learner starts revising in response to it. Self-check changes likewise clear feedback.[^17]

Retain feedback with the draft version that produced it, label it “For an earlier draft” after changes, and keep its proposed next step visible beside revision. Borrow the resource's existing draft-fingerprint approach for pressure tests. Continue discarding late responses created for a different resource or changed request context.

Use a compact sequence: **one strength → one next step → learner decision → revision or explanation**. Expand lesson and evidence checks when requested. A learner may reasonably keep a response after considering a challenge; record why instead of demanding a cosmetic rewrite. CAST's action-oriented feedback guidance emphasizes specific, usable next steps and reflection.[^18]

Keep AI pressure testing optional. The existing self, peer, teacher, and real-world check sources are useful. Ordinary progression should not depend on AI availability. Put prerequisite guidance next to the relevant action and provide a visible local route, such as comparing the strongest alternative or recording a teacher's question.

## What to do about images

**Automatically propose the appropriate representation, rather than automatically producing a picture for every challenge.** For this tool, a useful visual usually exposes relationships the learner must reason about. An atmospheric garden illustration would not address the principal usability problems found in this review.

| Visual | Recommended default | Conditions |
| --- | --- | --- |
| Editable comparison table or evidence map | Offer when it matches the challenge family | Preserve uncertainty and let the learner supply reasoning |
| Data chart, timeline, or process diagram | Use when supported by source data or structure | Keep values, units, and labels editable; provide equivalent text/table |
| Prototype sketch or learner artifact | Offer in appropriate tasks | Support a description and accessible alternatives |
| AI-generated scenario illustration | Optional | State its instructional purpose, avoid invented evidence, and allow hide/replace |
| Completed solution diagram or recommended “winning” design | Avoid as an automatic learner support | It can take over the reasoning the task is intended to elicit |

A teacher could preview a visual plan such as “two-option comparison organizer” during generation, then keep, change, or remove it. A generated image should arrive asynchronously, have a clear loading/failure state, and never prevent use of the textual challenge. Reuse the established image editing and accessibility review capabilities where applicable.

Use deterministic rendering for quantities, labels, mathematical relationships, and evidence connections. Do not ask a raster image model to be the source of measurement data. If an illustration adds objects or conditions that affect the problem, label them as scenario assumptions and bring them into teacher review.

IES recommends teaching visual representations in mathematical problem solving for grades 4–8, with strong evidence for that recommendation. Its broader study guide supports combining explanatory graphics with words. These findings support testing meaningful representations; they do not establish that automatic decorative images improve open-ended problem solving across subjects.[^12][^19]

## Teacher setup and generated-content quality

Keep Auto Match, but make its recommendation reviewable. Setup should lead with the intended learning: the lesson idea to apply, the situation, the product, and the available time/materials. Put family selection and advanced instructions behind clear choices rather than exposing internal terminology first.

A useful teacher preview would show:

1. The concept students will apply and why the proposed family fits.
2. The challenge question or student-framing direction.
3. The expected product, success criteria, and constraints.
4. The source-linked facts that need review.
5. The starting support level and proposed visual organizer.

Teachers should be able to adjust this draft and preview the student route before sharing. Reuse the existing temporary student preview and sharing checks; add a focused review surface rather than another approval system.[^3][^4]

The current generation prompt has several good content requirements, including 2–6 source-grounded claims, multiple possibilities, criteria, constraints, and a specific product. The explicit minimum acceptance check in the Applied branch is much weaker: it requires at least one lesson fact and either a seed direction or question. A response can pass that check with important instructional fields absent.[^20]

Strengthen the content contract around usable learner behavior:

| Check | Suggested response to failure |
| --- | --- |
| No meaningful product, criteria, or application of a central lesson idea | Repair the draft or return a clear generation error |
| Scenario introduces unsupplied local facts or quantities | Mark them explicitly hypothetical or require a source |
| Progressive support lacks a usable example or starter | Repair that support or choose a truthful fallback label |
| Parallel example substantially supplies this challenge's answer | Replace it with a structurally related but distinct example |
| Task demands inaccessible materials or unplanned outside research | Revise to the teacher's available resources |
| Long source loses relevant information | Let the teacher select the relevant section or concepts |

The branch uses the first 5000 source characters for the cloud path, or a bounded local excerpt. A later section of a long lesson may therefore be absent. Show what part of the lesson informs the task, and avoid presenting a prefix-based generation as exhaustive coverage.[^20]

Normalize new generation through the same canonical schema used by the component. The dispatcher currently emits schema version 2 while the component normalizes to version 6. This is not itself evidence of a runtime failure, but duplicated defaults and contracts are a maintenance risk when adding visuals, criterion IDs, and draft revisions.

Separate reading burden from reasoning depth. Prefer brief age-appropriate directions, examples of expected response length, and optional vocabulary support. The current taxonomy includes terms such as “evidence boundary,” “validation,” and “deliverable” that can be replaced in learner-facing labels with “What we know,” “Check my idea,” and “What I will make,” while retaining precise teacher terminology.

## Completion, sharing, and export

The current workspace has progress, self-checks, teacher comments, backups, and feedback, but its final local action emphasizes AI feedback. Make the endpoint a **review of the student's response**: the chosen question, reasoning, supporting evidence, important uncertainty, and what was kept or changed after checking. Then connect to the host's existing save, download, and submission routes. “Ready to review” must not imply “submitted.”

Preserve the existing interactive HTML and worksheet support. Add purpose-specific views to the shared export model rather than implementing separate export logic:

| Export view | Include by default |
| --- | --- |
| Student task | Brief, relevant source statements, criteria, selected supports, and usable work space |
| My response | Student product, cited evidence connections, chosen check, revision/reflection |
| Teacher review | Criteria, student response, feedback and revision context, visible verification state |
| Paper organizer | Scope-appropriate prompts, ruled space, and readable visual equivalents |

Use existing projection and sanitization so learner drafts and private teacher material cannot accidentally become template content. Verify the resulting artifact in each real delivery channel; a standalone component fixture cannot establish cloud or live-room behavior.[^2][^3]

Retain submission round trips for structured work. New representations must not become a screenshot that loses editable text, evidence relationships, or accessibility. Account for long responses, closed disclosures, offline saves, incomplete checks, and obsolete feedback in printing and export.

## Proposed implementation sequence

| Priority | Work | Acceptance evidence |
| --- | --- | --- |
| First: reliability and clarity | Repair mobile overflow; preserve deliberately blank questions; use honest progress and consecutive labels; version criteria and feedback | Browser reproductions no longer fail; existing protections still pass |
| Next: learner flow | Five stages; near-task references; contextual help; compact check-and-revise loop; a clear review endpoint | Learners can find, start, resume, check, and review work without being shown the whole form |
| Next: teacher/content quality | Editable challenge preview; source-linked facts; explicit learning target, available resources, and stronger generation validation | Representative generated tasks meet the content contract and retain teacher settings |
| Then: richer expression | Family-specific organizers; selective visuals; artifact alternatives; export presets | Keyboard/text equivalents and submission round trips preserve the same reasoning |

The order deliberately addresses the observed friction before expanding the feature set. It is a proposed sequence, not an effort estimate or implementation commitment.

## Validation before wider release

The next review should distinguish usability from learning quality.

**Technical checks:** Exercise all five families, four framing modes, and three scopes at the schema level. Use representative browser paths for the combinations with materially different behavior. Cover 320, 390, and desktop widths; 200–400% zoom; long translated labels; keyboard navigation; actual screen readers; read-aloud; unavailable AI; interrupted saves; and return-to-work behavior. Verify that self-checks and help do not make the focus view expand into the whole worksheet again.

**Generation review:** Sample short and long source texts across subjects and reading levels. Check central-idea coverage, source fidelity, a feasible product, defensible alternatives, appropriate constraints, usable supports, and whether an example or visual leaks the target answer. Record failures by category instead of presenting a single unexplained quality score.

**Small formative classroom pilot:** Include teachers and learners with different reading, writing, and assistive-technology needs. Observe whether learners can explain the task, find the first action, distinguish an assumption from evidence, request help, and revise without losing their place. A small convenience sample can find usability problems; it cannot establish efficacy for the wider population.

**Learning evaluation:** Inspect the accuracy of lesson application, quality of evidence connections, treatment of alternatives, and whether revisions respond to actual feedback or observations. Use a new problem later to investigate transfer rather than treating a completed form or self-rating as proof of learning. CAST explicitly recommends supported opportunities to apply learning in new contexts and revisit ideas over time.[^21]

Record navigation time and unnecessary backtracking as usability measures, not performance grades. Compare response quality with a common rubric and appropriate human review. Do not automatically reward length, number of AI interactions, or acceptance of AI advice.

## Review boundaries and reproducibility

This is an analysis and design proposal. No production feature changes or deployment were performed for this review. The companion interactive concept demonstrates stage navigation, preserved in-preview typing, expandable references, and optional support. It does not implement generation, durable saving, or submission.

The current UI fixture includes the real resource component, response boundary, and read-aloud control rendering. It omits the full app shell, actual audio playback, real accounts, persistence services, and delivery infrastructure. The content is authored, not sampled from a live model. The browser checks validate response updates within the harness, not persistence across app restarts. Standard and student-framed variants use appropriate presentation modes; the Design variant changes labels on the same fixture specifically to test layout and is not a pedagogically validated Design challenge.

The proposed concept was checked at 1024, 390, and 320 px: no horizontal overflow, browser errors, or axe violations were observed; stage changes preserved typing and help toggles worked. Those checks are limited to the tested concept states and do not establish full accessibility conformance.

Local evidence and reproducible scripts:

- [Current component fixture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/current-preview.html)
- [Browser measurements and accessibility output](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/browser-results.json)
- [Verified behavior probes, concept checks, and source hashes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/verified-findings.json)
- [Existing test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/tests.json)
- [Fixture builder](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/build-fixture.cjs), [browser review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/browser-review.cjs), and [finding verification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/verify-findings.cjs)

## Sources

External sources were accessed September 12, 2026. CAST sources provide design guidance, not causal evidence for this software. IES evidence ratings apply to the recommendations and populations stated in the guides. The W3C pages explain success criteria; they are not an accessibility certification. Local source references describe the reviewed workspace snapshot.

[^1]: AlloFlow, [challenge families, framing modes, scope, and workspace phases](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:8).
[^2]: AlloFlow, [coaching and feedback contracts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:735), [export model](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:977), and [document pipeline integration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:42283).
[^3]: AlloFlow, [shared response boundary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/studio_response_module.js:202) and [Applied Challenge host integration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:53184).
[^4]: AlloFlow, [read-aloud content adapter](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/resource_read_aloud_module.js:53) and [sharing review checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/resource_read_aloud_module.js:106).
[^5]: Local authored-fixture browser review, [measurements](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/browser-results.json), September 12, 2026.
[^6]: Local [behavior reproductions and source hashes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/verified-findings.json), September 12, 2026.
[^7]: AlloFlow, [Applied Challenge regression results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/applied-problem-solving-review-2026-09-12/tests.json), 47 passed, 0 failed.
[^8]: AlloFlow, [brief and static support rendering](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1823), [phase selector](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1896), and [focus navigation and persistent self-check rendering](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1953).
[^9]: CAST, *UDL Guidelines 3.0*, [Organize information and resources](https://udlguidelines.cast.org/action-expression/strategy-development/organize-information/), 2024.
[^10]: W3C WAI, *Understanding WCAG 2.2*, [Reflow, SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), current explanatory page.
[^11]: CAST, *UDL Guidelines 3.0*, [Build fluencies with graduated support for practice and performance](https://udlguidelines.cast.org/action-expression/expression-communication/fluencies-practice-performance/), 2024.
[^12]: Pashler et al., Institute of Education Sciences / What Works Clearinghouse, [Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1), September 2007. Moderate evidence ratings for interleaving worked examples with problem solving and for combining graphics with verbal descriptions; strong evidence for deep explanatory questions.
[^13]: AlloFlow, [evidence-form labels](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:164) and [text-only phase input](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1567).
[^14]: CAST, *UDL Guidelines 3.0*, [Expression & Communication](https://udlguidelines.cast.org/action-expression/expression-communication/), 2024.
[^15]: AlloFlow, [ledger schema](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:274) and [status selector](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1936).
[^16]: AlloFlow, [self-check indexing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:383) and [working-question fallback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:428).
[^17]: AlloFlow, [workspace edits clear coaching](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1286) and [self-check edits clear coaching](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/applied_challenge_source.jsx:1402).
[^18]: CAST, *UDL Guidelines 3.0*, [Offer action-oriented feedback](https://udlguidelines.cast.org/engagement/effort-persistence/feedback/), 2024.
[^19]: Woodward et al., Institute of Education Sciences / What Works Clearinghouse, [Improving Mathematical Problem Solving in Grades 4 Through 8](https://ies.ed.gov/ncee/wwc/PracticeGuide/16), May 2012, revised October 2018. Strong evidence for monitoring/reflection and teaching visual representations; moderate evidence for exposure to multiple strategies. Cross-subject recommendations in this review are design extrapolations.
[^20]: AlloFlow, [source excerpt selection](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generate_dispatcher_source.jsx:7525), [generation requirements](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generate_dispatcher_source.jsx:7587), [minimum acceptance check](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generate_dispatcher_source.jsx:7633), and [generated schema](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generate_dispatcher_source.jsx:7688).
[^21]: CAST, *UDL Guidelines 3.0*, [Maximize transfer and generalization](https://udlguidelines.cast.org/representation/building-knowledge/transfer-generalization/), 2024.
