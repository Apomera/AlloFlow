# Product option: research-informed teaching scripts
Date: 2026-09-04  
Status: fit assessment and proposed pilot; not implemented.

## Recommendation

Add an optional **Full teaching script** depth setting, with separately optional **Research support**. Keep the current concise planning workflow available.

This directly addresses the user's stated need for more extensive, usable teaching guidance. Its value should come from complete teaching moves, accurate examples, responsive checks and defensible instructional choices—not word count alone. The saved-plan input snapshot proposal remains a useful foundation for recording the materials and evidence used.

## Current fit

The cloud teacher prompt already requests a detailed script, teacher dialogue, checks for understanding, expected responses and timing (prompts_library_source.jsx:117–147). The Lesson Plan panel currently offers custom additions but no dedicated depth or research setting (view_sidebar_panels_source.jsx:3932).

The dispatcher local-model route explicitly requests a compact plan, uses a bounded context excerpt and asks for concise explanations (generate_dispatcher_source.jsx:6920–6935). Those are verified constraints; this assessment did not establish a universal output-token problem or evaluate the quality of all providers' current outputs.

A reliable new mode needs a structured output and generation workflow, not just another “be detailed” sentence in the prompt.

## Proposed teacher experience

Inputs: lesson goal, official standard/jurisdiction, subject, grade/age range, duration, relevant prior knowledge/supports, and selected lesson resources. Reuse existing settings where present.

Keep a one-page overview and offer expandable scripted segments. Each segment contains:

- Time and intended learning.
- Suggested teacher wording and modeling/think-aloud.
- What learners do, with time for thinking and practice.
- Check-for-understanding questions and plausible response examples.
- Likely misconceptions and conditional follow-ups.
- Links to the exact AlloFlow text, image, questions or activity being used.
- Brief rationale and supporting source where relevant.

Scripted wording remains editable. Student responses are possible examples, not predictions. A complete script includes guided practice, discussion and decisions to reteach or move on.

## What research support would mean

Use three distinct inputs:

1. **Official standards** establish the expected learning.
2. **Lesson materials** establish the content, examples and actual tasks.
3. **Instructional research** supports choices about how to teach that content to the relevant learners.

Retrieve credible evidence syntheses/practice guides first, then use targeted web search to find context-specific guidance or fill gaps. Open the actual sources, verify the relevant passages and applicability, and link each supported recommendation to the lesson step that uses it. Search-result snippets or model-generated bibliographies are insufficient.

Preserve authorship, publication/review date, URL or DOI, recommendation/page locator, population/setting, reported evidence strength and a short applicability note. Broader guidance must be labelled as broader guidance when no evidence matches the exact standard/age/context.

Suggested product label: **Research-informed teaching script**. Research can support the instructional approach; the new AI-written script itself has not been evaluated as an intervention. A failed or unavailable search should be visible and must not result in an “evidence checked” badge.

The [EEF's guidance on using research evidence](https://educationendowmentfoundation.org.uk/news/eef-blog-using-research-evidence-navigating-the-maze-of-evidence-claims) recommends examining multiple studies/syntheses, variation across learners and contexts, implementation, and professional judgement.

## Concrete fit example

For a fractions lesson, the [WWC fractions practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/15) recommends developing understanding of fractions as numbers and using number lines. That can inform the app's lesson sequence: model a number-line representation, ask learners to justify a placement, inspect their reasoning, and give a targeted follow-up.

The guide supports the instructional recommendation; the generated wording and example sequence are the app's adaptation.

Population matching matters. The [2021 WWC mathematics intervention guide](https://ies.ed.gov/ncee/WWC/PracticeGuide/26/Published) addresses students struggling with elementary mathematics. The [English learner guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/19) addresses a different instructional population and reports differing evidence levels across recommendations. The app should retain those distinctions.

## Small first pilot

Start with one bounded area—fractions instruction in a selected grade band—rather than promising research-backed scripts across every subject and age.

1. Build a compact, verified evidence brief for the selected objective and context.
2. Draft the sequence and timing.
3. Generate scripted segments using the actual selected resource content.
4. Check factual accuracy, source support, resource links, completeness and realistic pacing.
5. Present overview, full script and evidence notes for educator editing.

A full script needs more actual content than the current planning summaries: the exact question, passage or activity must be available before the script claims to model or discuss it. A quiz count alone cannot ground a worked-through quiz question.

Reuse existing web-search/source-reading and evidence facilities where appropriate; source applicability and support verification still need an explicit lesson-planning layer. Cache reviewed guidance with its provenance. Show the added time/cost of a fresh research run, and do not silently claim live verification when using cached guidance.

## Success criteria before broad rollout

Have educators compare the current plan and pilot script for the same source/standard. Check usable preparation support, factual accuracy, appropriateness for the learners, plausible pacing, and whether the teacher can adapt the guidance.

Every research-backed recommendation must resolve to a retrieved supporting source and retain its context/evidence limitations. Unsupported claims are identified; citations are not invented. Script length alone is not a success measure.

The prior input-tracking scope can preserve the resource and research versions used, so later revisions remain reviewable. No automatic implementation or deployment is included in this assessment.
