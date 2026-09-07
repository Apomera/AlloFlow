# Aquarium and Aquaculture learning review

Review date: 7 September 2026

## Scope and assessment

This review examined the Aquarium and Aquaculture tools as learning experiences: how a learner starts, makes a decision, observes consequences, explains evidence, and chooses another investigation. It combined source inspection, targeted runtime tests, and browser checks. The implementation strengthens the existing tools rather than replacing their extensive simulations and reference libraries.

The main problem was orientation and feedback. Both tools already contain substantial educational content, but learners could encounter many controls and progress indicators before understanding the next useful action. The changes make investigations easier to start and their evidence easier to interpret. Passing automated checks establishes behavior under tested conditions; it does not establish learning effectiveness in a classroom.

## Existing strengths

Aquarium connects water chemistry, organism vitality, habitat design, and an exchange network. Its existing prediction, baseline, time-series, and habitat-mission features can support causal reasoning. Learners can inspect relationships across the tank rather than treating each organism as an isolated collectible. Habitat missions already separate prediction accuracy from rewards for investigation and organism welfare.

Aquaculture combines an ecosystem builder, seasonal comparisons, paired surface/crop-depth sampling, a mussel-health investigation, and boat decisions. Guided 2D offers an alternative to the WebGL mission. Teacher Studio, local portfolios, printable assignments, topic search, and learning journeys provide useful classroom infrastructure. The mussel station distinguishes probe measurements from stock observations, helping learners recognize different evidence sources.

## Problems diagnosed

- **Competing starts:** Aquaculture Home presented profile setup, resume, adaptive guidance, progress summaries, learning journeys, operations routes, and notebook content together. A learner had to choose among several plausible starting points. Library-wide previous/next controls also competed with activity progression.
- **Weak experimental framing:** Ecosystem outputs updated immediately, but a learner did not have a clear place to commit to a prediction before saving scenario A. Comparison instructions permitted several simultaneous changes without prominently explaining the resulting ambiguity.
- **Incomplete evidence:** Saved A/B reports retained outcomes but omitted the full paired configurations. A reviewer could not reconstruct which water settings, organisms, or disturbance produced those outcomes.
- **Misleading completion signals:** The evidence coach counted nonempty fields and described the result as portfolio-ready. An autofill action inserted an investigation question into the claim field. Neither behavior demonstrated a scientific explanation.
- **Feedback and preservation defects:** The thirteenth ecosystem save silently displaced older evidence. Resilience could remain unchanged while the same community became hypoxic. Aquarium had edge cases involving midnight, chemistry warnings, time stepping, and quiz behavior that weakened confidence in observations.

## Changes implemented

Aquaculture Home now leads with “Start an ecosystem investigation” for the default goal and continues unfinished experiments before suggesting boat missions. Profile, boat instructions, activity tools, and generic progress controls sit behind disclosures. In the browser checks, the Home document height fell from **5,307 to 1,243 pixels at desktop width**, and from **8,609 to 1,508 pixels at phone width**. These measurements demonstrate reduced initial page length, not a measured improvement in learning or task-completion time.

The ecosystem builder now presents four visible stages: **Set up A → Change one input → Compare and explain → Evidence saved**. Prediction is encouraged but optional; an absent prediction is identified explicitly. Three guided questions supply a starting community, a concrete change, relevant evidence, and a next test: **Oxygen buffer** lowers reference oxygen; **Stocking trade-off** adds one salmon unit; **Flow without a crash** lowers exchange while asking whether unchanged survival can conceal chemistry changes. Progress records submitted comparison evidence, not mastery.

Comparison feedback identifies zero, one, or multiple changed inputs and explains limits on attribution. Paired A/B values and differences include units, including percentage points for survival. Learners are asked to select the result relevant to their prediction rather than compare the sizes of unrelated numbers. Biomass differences are neutral and explicitly include starting stock. Exchange is labeled a relative 0–100 setting. Water settings supply each modeled month’s reference, and identical settings produce identical results; replay does not create independent experimental replicates.

The evidence coach now reports **fields drafted** and asks learners to review the science and reasoning. Question-to-claim autofill was removed. Comparisons and new snapshots store full settings for review, export, and replay. Loading an investigation or replaying evidence keeps the earlier design and writing as a recoverable draft. Removal has a session undo action. Both save paths stop at 12 records, and imports reject a merge that would exceed capacity rather than silently discard evidence. Device-save failures expose retry and current-session backup controls; evidence is not reported as saved when persistence fails.

The named sea cucumber, *Cucumaria frondosa*, was corrected from deposit feeding to suspension feeding. Its modeled contribution now concerns suspended particles rather than direct dissolved-ammonia uptake. This distinction is supported by the [original feeding-behavior study](https://doi.org/10.1016/j.aquaculture.2020.735369). Resilience now responds to modeled oxygen deficits, temperature excursions, and incompatible placement; its coefficients remain illustrative teaching weights.

Aquarium now puts the objective, tank, and care actions before optional systems and equipment disclosures. This addresses the previously documented phone-density issue: the measured active mobile page fell from **7,092 to 4,090 pixels**. One-hour observation controls, baseline chemistry deltas, midnight handling, complete seven-parameter warnings, and quiz fixes strengthen the link between action and evidence. The remaining page length still warrants observation with learners; reduced scrolling alone does not demonstrate understanding.

## Intended learning loops

**Aquarium:** Inspect the starting tank and its warnings. Make a prediction, record a baseline, and change one controllable factor. Use the explicit hour step or the existing timed investigation to observe changes. Compare chemistry, vitality, and habitat evidence, trace a plausible mechanism through the exchange network, and revise the explanation. A short observation step should not be confused with sufficient observation time for every mission.

**Aquaculture ecosystem:** Choose or inspect a community, state a prediction, and save scenario A. Change one input for a focused comparison. Read the changed-input list and seasonal results, explain the observed trade-off, and save the paired evidence. If several inputs change, frame the result as a comparison between designs rather than proof of one isolated cause.

**Aquaculture fieldwork:** Compare surface and crop-depth samples from the same visit, choose a verification response, and connect the record to the mussel-health station. Predict the priority signal before revealing the interpretation. Explain both the evidence and what remains uncertain.

For novice classes, demonstrate one worked example before asking learners to investigate independently; revisit the key concept with a later retrieval question. The [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) reports moderate evidence for worked examples and combined graphical/verbal explanations, and strong evidence for explanatory questions and quizzes that revisit content. Applying those principles here is a design rationale, not a product-specific efficacy finding.

## Teacher review prompts

1. What did you predict before seeing the result, and why?
2. Which input changed, and which relevant conditions stayed the same?
3. Cite two readings or baseline differences, including units and observation time or depth.
4. What mechanism could connect the change to the outcome? What alternative explanation remains?
5. Did an unexpected result change your thinking? Design the next test to reduce one uncertainty.

Review the explanation, evidence selection, and treatment of uncertainty separately. A saved record, character minimum, checked lesson, or populated field establishes participation or submission; it does not certify understanding.

## Validation and remaining scope

The first pass passed **107 distinct focused tests**: 54 Aquarium and 53 Aquaculture tests. Its browser harness passed both tools at **1,440-pixel and 390-pixel widths**, including observation stepping, midnight rollover, quiz feedback, comparison guards, restoration, saving, reload, and repeated investigations. Tested screens had no page errors, unnamed visible controls, or horizontal document overflow. Source syntax, source/desktop parity, and focused diff checks also passed for that integration.

The second pass finishes with **118 passing targeted tests**: 55 Aquarium tests and 63 Aquaculture tests across accessibility contracts, ecosystem behavior, guided questions, evidence integrity, replay/recovery, learning portfolios, and mussel health. A boat-evidence case that timed out during a busy run passed unchanged in isolation. The new recovery suite uses a longer setup allowance for the large tool. Both tool scripts pass syntax checks, their desktop mirrors are byte-identical, and the edited files pass whitespace checks.

Browser checks pass at **1440px and 390px** for the Aquarium hierarchy, objectives, clock, evidence, disclosures, and quiz; and for Aquaculture replay, parked-draft reload/return, immutable records, failed-save preservation, backup/retry, undo, capacity limits, and comfortable text. The inspected views have no horizontal overflow, unnamed visible controls, or console errors. Unit tests also verify capacity-safe imports and all three guided questions. Results from the resolved initial replay-locator mismatch are retained as historical diagnostics and excluded from the final aggregate.

See [the verified second-pass browser report](../.codex-artifacts/aquatic-qa/second-pass-verified/report.json) and adjacent compact screenshots. Reproduce browser checks with `node dev-tools/aquatic_browser_qa.cjs --label verification --interactive --aquarium-v2 --evidence-v2`. The harness uses local React, CSS, and tool assets; it does not validate the full production host, external services, or every 3D scenario.

The ecological models simplify growth, mortality, compatibility, filtration, nutrient processing, and seasonality. The biofilter connection now explicitly discloses its fixed processing allowance and lack of biofilter-failure or nitrate-buildup simulation. Reference bands and indices should support comparisons, not operational forecasts. The broad libraries were not comprehensively revalidated during this pass; dated biological claims, regional context, terminology, and external links still need a dedicated content review. Manual keyboard/screen-reader testing, educator review, and observed learner sessions remain the next evidence needed to assess usability and pedagogy beyond the tested paths.
