#!/usr/bin/env node
'use strict';

// Original, unscored written-response planning workshops for AP Biology, one
// per unit, in the shape the Hub's written-response renderer reads (the same
// shape as the AP U.S. Government workshops): three task parts, a four-step
// planning frame, four success criteria, four common pitfalls, a three-point
// sample outline, and an original synthetic stimulus.
//
// These are planning and self-check resources. They are not official AP
// free-response questions, College Board rubrics, scored responses, or score
// predictions, and the stimuli are invented for practice. Original text only;
// no CED, OpenStax, or assessment content is reproduced.

const REVIEW_NOTE = 'Original unscored planning workshop with a synthetic stimulus. AlloFlow does not score written responses. Not an official AP Biology free-response question, rubric, or score; AP Biology subject-expert, accessibility, and rights review remain pending.';

const AP_BIOLOGY_WORKSHOPS = Object.freeze([
  {
    unit: 1, topicIds: ['1.1', '1.7'], taskType: 'Structure-function explanation',
    title: 'Explain a property from a molecular feature',
    prompt: 'Plan a response that traces one observable property of a biological system back to a specific molecular structure, and state one claim the evidence cannot support. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: A student compares two enzyme variants. Variant A has a hydrophobic amino acid at position 42 in the protein interior; variant B has a charged amino acid at the same position. In a water bath at 37 degrees Celsius, variant A converts substrate at 12 micromoles per minute and variant B at 3 micromoles per minute. At 20 degrees Celsius both variants convert substrate at about 5 micromoles per minute.',
    taskParts: [
      'Identify the structural difference between the two variants and describe the level of protein structure it most directly affects.',
      'Explain how that difference could change the enzyme’s shape and account for the rate difference at 37 degrees Celsius.',
      'Using the data at both temperatures, state one conclusion the evidence supports and one it does not, and justify the boundary.',
    ],
    planningFrame: [
      { label: 'Structure', guidance: 'Name the molecule, the specific feature that differs, and the level of structure involved in one sentence.' },
      { label: 'Mechanism', guidance: 'Connect the feature to folding or active-site shape before you mention any rate.' },
      { label: 'Evidence', guidance: 'Point to the specific numbers that support your mechanism and note what changed between conditions.' },
      { label: 'Boundary', guidance: 'State a plausible conclusion the two temperatures alone cannot establish, such as which variant is more stable.' },
    ],
    successCriteria: [
      'The response names the interior position and the hydrophobic-to-charged substitution rather than a vague difference.',
      'The mechanism links the substitution to interactions that hold the fold and therefore to active-site shape.',
      'The rate numbers at 37 degrees are used as evidence for the mechanism rather than restated.',
      'The response identifies a limit on what the two temperatures can establish about stability or optimum.',
    ],
    commonPitfalls: [
      'Claiming the charged amino acid breaks peptide bonds, when it changes weak interactions that hold the fold.',
      'Treating the 20 degree result as proof that the variants are identical rather than as a condition where both are slowed.',
      'Concluding that variant B is denatured with no evidence that its structure has changed irreversibly.',
      'Describing the rate difference without ever naming a structural cause.',
    ],
    sampleOutline: [
      'Claim: a single interior substitution changes tertiary interactions and therefore active-site shape.',
      'Evidence: at 37 degrees variant A runs four times faster; at 20 degrees the two are similar, so temperature interacts with the structural difference.',
      'Boundary: the data do not show which variant keeps its shape longer or whether the effect is reversible.',
    ],
  },
  {
    unit: 2, topicIds: ['2.6', '2.7'], taskType: 'Prediction from a model',
    title: 'Predict water movement and defend the prediction',
    prompt: 'Plan a response that predicts what happens to cells placed in solutions of different concentrations, explains the prediction with a water-potential model, and identifies one measurement that would test it. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: Identical potato cylinders are weighed and placed in sucrose solutions of 0.0, 0.2, 0.4, and 0.6 molar for 30 minutes. Percent mass changes are +8, +3, −2, and −7. A student proposes that the potato tissue has a water potential equal to that of a solution between 0.2 and 0.4 molar.',
    taskParts: [
      'Explain, using water potential, why the cylinders gained mass in the 0.0 molar solution and lost mass in the 0.6 molar solution.',
      'Evaluate the student’s proposal about the tissue’s water potential using the data, and identify the assumption it rests on.',
      'Describe one additional measurement or condition that would make the estimate more precise, and state what result you would expect.',
    ],
    planningFrame: [
      { label: 'Model', guidance: 'State the direction water moves in terms of water potential, from higher to lower, before mentioning any solution.' },
      { label: 'Apply', guidance: 'Place each solution relative to the tissue and predict the direction of net water movement for it.' },
      { label: 'Evaluate', guidance: 'Find where the mass change would be zero and explain why that point estimates the tissue’s water potential.' },
      { label: 'Refine', guidance: 'Choose a change to the method, such as more concentrations near the crossover, that narrows the estimate.' },
    ],
    successCriteria: [
      'The response uses water potential or solute concentration correctly to predict direction of net water movement.',
      'The zero-change crossover between 0.2 and 0.4 molar is identified as the basis of the estimate.',
      'The assumption that mass change reflects only water movement is named and its limit acknowledged.',
      'The proposed refinement would actually narrow the interval rather than repeat the same measurement.',
    ],
    commonPitfalls: [
      'Saying water moves toward the higher solute concentration without stating that this is toward lower water potential.',
      'Treating the 0.2 molar gain as proof that the tissue equals 0.2 molar rather than as one side of an interval.',
      'Ignoring that solute might also move or that the cut surface affects the result.',
      'Proposing a longer soaking time as the refinement without explaining what it would change.',
    ],
    sampleOutline: [
      'Model: water moves from higher to lower water potential; pure water has the highest.',
      'Evidence: gains at 0.0 and 0.2, losses at 0.4 and 0.6, so the zero point lies between 0.2 and 0.4.',
      'Refinement: test 0.25, 0.3, and 0.35 molar to locate the crossover more precisely, expecting the smallest change near 0.3.',
    ],
  },
  {
    unit: 3, topicIds: ['3.4', '3.5'], taskType: 'Experimental design and analysis',
    title: 'Design a test of a limiting factor in photosynthesis',
    prompt: 'Plan a response that designs an investigation to determine whether light intensity or carbon dioxide availability limits the rate of photosynthesis in an aquatic plant, and explains how the results would be interpreted. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: A class measures oxygen bubbles per minute from a submerged plant. At low light the rate rises as a lamp is moved closer, but beyond a certain distance moving the lamp closer no longer increases the rate. A student suggests the plant has run out of carbon dioxide.',
    taskParts: [
      'State a testable hypothesis about which factor limits the rate at high light intensity, and identify the independent, dependent, and controlled variables.',
      'Describe a procedure that would distinguish carbon dioxide limitation from another explanation, including how the rate would be measured.',
      'Predict the results that would support the hypothesis and the results that would refute it, and explain one reason the bubble count could mislead.',
    ],
    planningFrame: [
      { label: 'Hypothesis', guidance: 'Write an if-then statement that names the limiting factor and the predicted change in rate.' },
      { label: 'Variables', guidance: 'List what you change, what you measure, and at least three conditions you hold constant.' },
      { label: 'Procedure', guidance: 'Give steps that change only the factor under test, with repeated measurements at each level.' },
      { label: 'Interpretation', guidance: 'Describe the pattern that would confirm the hypothesis and the pattern that would reject it.' },
    ],
    successCriteria: [
      'The hypothesis names carbon dioxide availability as a candidate limit and predicts a specific change in rate.',
      'Temperature, plant sample, and light distance are among the controlled variables in the carbon dioxide test.',
      'The procedure adds a carbon dioxide source at fixed high light and compares rates with a control.',
      'The response explains that bubble count is an indirect measure that can vary with bubble size and gas composition.',
    ],
    commonPitfalls: [
      'Changing light and carbon dioxide at the same time, so neither can be isolated.',
      'Omitting a control that receives no added carbon dioxide.',
      'Treating a single measurement as a rate rather than averaging repeated counts.',
      'Concluding that the plant has stopped absorbing light when the rate plateaus.',
    ],
    sampleOutline: [
      'Hypothesis: at high light, adding dissolved carbon dioxide will increase the rate; if not, another factor limits it.',
      'Procedure: fixed lamp distance and temperature; add bicarbonate to one set, water to the control; count bubbles for three trials each.',
      'Interpretation: a higher rate with added carbon dioxide supports the hypothesis; no change points to another limit such as enzyme capacity.',
    ],
  },
  {
    unit: 4, topicIds: ['4.4', '4.6'], taskType: 'Mechanism and consequence',
    title: 'Trace a feedback loop and a checkpoint failure',
    prompt: 'Plan a response that explains a homeostatic feedback loop, then predicts the consequence of a failure in cell-cycle control, keeping the two mechanisms distinct. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: In a cultured cell line, a signaling protein that normally activates cell division is found in a permanently active form. Cells in the culture continue dividing even when a chemical that damages DNA is added, and they show a much higher rate of chromosome abnormalities than a normal cell line treated the same way.',
    taskParts: [
      'Describe how a negative feedback loop normally keeps a regulated variable within a range, using a specific physiological example.',
      'Explain how a checkpoint in the cell cycle normally responds to DNA damage, and predict why the cultured cells continue to divide.',
      'Justify why the permanently active protein leads to more chromosome abnormalities, and identify what additional data would strengthen that explanation.',
    ],
    planningFrame: [
      { label: 'Loop', guidance: 'Name the sensor, control center, and effector, and state that the response opposes the change.' },
      { label: 'Checkpoint', guidance: 'State what the checkpoint checks and what normally happens when the check fails.' },
      { label: 'Failure', guidance: 'Connect the permanently active signal to bypassing the checkpoint before you describe outcomes.' },
      { label: 'Evidence', guidance: 'Name one measurement, such as time spent in each phase, that would support your account.' },
    ],
    successCriteria: [
      'The feedback example includes a response that counteracts the original change and returns the variable toward a set point.',
      'The checkpoint explanation says division is normally held until damage is repaired or the cell is directed to die.',
      'The permanently active protein is identified as overriding the checkpoint signal, not as directly damaging DNA.',
      'The link from uncorrected damage to chromosome abnormalities is stated explicitly.',
    ],
    commonPitfalls: [
      'Describing positive feedback while calling it negative feedback.',
      'Claiming the protein causes DNA damage rather than allowing damaged cells to divide.',
      'Treating mitosis as the whole cell cycle and placing the checkpoint in the wrong phase.',
      'Asserting the cells are cancerous without stating which control has been lost.',
    ],
    sampleOutline: [
      'Loop: a rise in blood glucose triggers insulin release, cells take up glucose, and the level returns toward its set point.',
      'Checkpoint: damaged DNA normally pauses the cycle before division; the constant signal pushes cells past the pause.',
      'Consequence: damaged chromosomes are copied and segregated, producing abnormalities; measuring phase durations would test this.',
    ],
  },
  {
    unit: 5, topicIds: ['5.3', '5.4'], taskType: 'Data-based genetic reasoning',
    title: 'Infer an inheritance pattern from cross data',
    prompt: 'Plan a response that uses offspring ratios to infer an inheritance pattern, tests the inference with probability, and identifies what the data cannot decide. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: In a plant species, a cross between two red-flowered plants produces 121 red, 62 pink, and 58 white offspring. A separate cross between a pink plant and a white plant produces 48 pink and 51 white offspring.',
    taskParts: [
      'Propose an inheritance pattern that explains both crosses, and state the genotypes of the parents in each cross.',
      'Calculate the expected numbers of each phenotype for the first cross under your model and compare them with the observed numbers.',
      'Identify one alternative pattern that the first cross alone could not rule out, and explain how the second cross helps.',
    ],
    planningFrame: [
      { label: 'Pattern', guidance: 'Name the pattern, such as incomplete dominance, and write the genotype-to-phenotype rule in one line.' },
      { label: 'Genotypes', guidance: 'Assign parent genotypes that make the observed offspring possible in both crosses.' },
      { label: 'Probability', guidance: 'Use a Punnett square or the product rule to get expected fractions, then scale to the total.' },
      { label: 'Limits', guidance: 'Say what the ratios cannot distinguish and which cross or data would resolve it.' },
    ],
    successCriteria: [
      'Incomplete dominance is proposed, with heterozygotes as pink and the two homozygotes as red and white.',
      'The first cross is treated as heterozygote by heterozygote, giving an expected 1 to 2 to 1 ratio of about 60, 120, and 60.',
      'The second cross is treated as heterozygote by homozygous recessive, giving an expected 1 to 1 ratio.',
      'The response notes that the first cross alone could be confused with other patterns and that the second cross constrains the model.',
    ],
    commonPitfalls: [
      'Calling pink a blend that loses the parental alleles rather than a heterozygous phenotype.',
      'Expecting a 3 to 1 ratio from the first cross by assuming complete dominance.',
      'Comparing observed and expected without scaling expected fractions to the actual total of 241.',
      'Claiming the data prove the model instead of stating that the data are consistent with it.',
    ],
    sampleOutline: [
      'Pattern: incomplete dominance; RR red, RW pink, WW white.',
      'Cross 1: RW × RW gives 1 RR, 2 RW, 1 WW; expected about 60, 120, 60 versus observed 121, 62, 58.',
      'Cross 2: RW × WW gives 1 pink to 1 white, matching 48 and 51; the data are consistent with but do not prove the model.',
    ],
  },
  {
    unit: 6, topicIds: ['6.5', '6.7'], taskType: 'Molecular mechanism and prediction',
    title: 'Predict the effect of a mutation on gene expression',
    prompt: 'Plan a response that predicts how a specific DNA change affects the amount and sequence of a protein, distinguishes effects on transcription from effects on translation, and proposes a test. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: Two mutant versions of a gene are studied. Mutant 1 has a base substitution in the promoter region upstream of the coding sequence. Mutant 2 has a single-base deletion 30 bases into the coding sequence. Cells with mutant 1 make about one fifth of the normal amount of protein, and the protein works normally. Cells with mutant 2 make a normal amount of messenger RNA but the protein is short and inactive.',
    taskParts: [
      'Explain why mutant 1 reduces the amount of protein but not its function, naming the step of gene expression affected.',
      'Explain why mutant 2 produces a short, inactive protein despite normal messenger RNA levels, naming the step affected.',
      'Propose one experiment that would confirm which step is affected in each mutant, and state the expected result.',
    ],
    planningFrame: [
      { label: 'Locate', guidance: 'Place each mutation on the path from DNA to protein: promoter, coding sequence, transcript, or ribosome.' },
      { label: 'Amount versus sequence', guidance: 'Decide for each mutant whether the change alters how much product is made or what the product is.' },
      { label: 'Mechanism', guidance: 'Name the molecular reason: transcription-factor binding, reading frame, or codon change.' },
      { label: 'Test', guidance: 'Choose a measurement that separates messenger RNA level from protein sequence.' },
    ],
    successCriteria: [
      'Mutant 1 is explained by reduced transcription initiation, with the coding sequence unchanged.',
      'Mutant 2 is explained by a frameshift that changes downstream codons and creates an early stop codon.',
      'The response uses the normal messenger RNA level in mutant 2 as evidence that transcription is unaffected.',
      'The proposed experiment measures messenger RNA amount for mutant 1 and protein sequence or length for mutant 2.',
    ],
    commonPitfalls: [
      'Saying the promoter mutation changes the protein sequence.',
      'Treating the single-base deletion as a substitution that changes only one amino acid.',
      'Claiming mutant 2 has reduced transcription when its messenger RNA level is normal.',
      'Proposing an experiment that measures protein amount alone, which cannot distinguish the two mechanisms.',
    ],
    sampleOutline: [
      'Mutant 1: promoter change lowers RNA polymerase or transcription-factor binding, so less messenger RNA and less protein; sequence intact.',
      'Mutant 2: a deletion shifts the reading frame, producing wrong codons and an early stop; messenger RNA amount is unaffected.',
      'Test: compare messenger RNA levels for mutant 1 and sequence the protein or run a size gel for mutant 2.',
    ],
  },
  {
    unit: 7, topicIds: ['7.4', '7.5'], taskType: 'Population genetics analysis',
    title: 'Use allele frequencies to detect evolution',
    prompt: 'Plan a response that calculates allele and genotype frequencies, compares them with Hardy-Weinberg expectations, and argues whether the population is evolving at this locus. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: In a population of 500 beetles, a recessive allele produces a pale color. A survey finds 20 pale beetles. Five years later, a second survey of 500 beetles finds 45 pale beetles. Predators in the area have shifted from birds that hunt by sight to rodents that hunt by smell.',
    taskParts: [
      'Calculate the recessive allele frequency and the expected heterozygote frequency in the first survey, stating the assumptions used.',
      'Determine whether the allele frequency changed by the second survey and explain what a change indicates.',
      'Propose a mechanism consistent with the predator shift, and describe one additional observation that would distinguish selection from genetic drift.',
    ],
    planningFrame: [
      { label: 'Calculate', guidance: 'Start from the recessive phenotype frequency to find q, then p, then 2pq.' },
      { label: 'Assume', guidance: 'List the Hardy-Weinberg conditions you are assuming and flag the ones the scenario may violate.' },
      { label: 'Compare', guidance: 'Repeat the calculation for the second survey and state the direction of change in q.' },
      { label: 'Explain', guidance: 'Connect the predator change to relative fitness, and name evidence that separates selection from chance.' },
    ],
    successCriteria: [
      'q is found as the square root of 0.04, giving 0.2, and 2pq is 0.32 for the first survey.',
      'The second survey gives q of 0.3, and the response states that a change in allele frequency is evolution by definition.',
      'The proposed mechanism explains why pale color is no longer strongly selected against when predators hunt by smell.',
      'The response names a distinguishing observation, such as consistent change across multiple populations or measured survival by color.',
    ],
    commonPitfalls: [
      'Using the phenotype frequency directly as the allele frequency.',
      'Claiming the population is in Hardy-Weinberg equilibrium because a calculation was possible.',
      'Attributing the change to selection without considering that a population of 500 can drift.',
      'Saying the beetles changed color in response to predators rather than that allele frequencies changed across generations.',
    ],
    sampleOutline: [
      'Survey 1: q squared is 0.04, q is 0.2, p is 0.8, 2pq is 0.32.',
      'Survey 2: q squared is 0.09, q is 0.3; the allele frequency rose, so the population evolved at this locus.',
      'Mechanism: relaxed visual predation lowers the cost of pale color; replicated populations or survival data would separate selection from drift.',
    ],
  },
  {
    unit: 8, topicIds: ['8.2', '8.7'], taskType: 'Ecosystem prediction and argument',
    title: 'Predict the effects of removing a species',
    prompt: 'Plan a response that predicts how removing one species changes energy flow and community structure, supports the prediction with a model, and identifies what would make the prediction uncertain. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: In a coastal ecosystem, sea otters eat sea urchins, and sea urchins graze on kelp, which shelters many fish species. A disease removes most of the otters over two years. Surveys before and after show urchin density rising from 4 to 22 per square meter and kelp cover falling from 70 percent to 15 percent.',
    taskParts: [
      'Describe the flow of energy through this food chain and explain why only a fraction of energy passes between levels.',
      'Predict the effect of otter loss on the fish community and justify the prediction using the survey data.',
      'Identify one factor that could weaken or reverse your prediction, and describe data that would reveal it.',
    ],
    planningFrame: [
      { label: 'Structure', guidance: 'Write the chain from producer to top consumer and label each trophic level.' },
      { label: 'Energy', guidance: 'State that most energy at each level is lost to metabolism and heat, so biomass declines up the chain.' },
      { label: 'Cascade', guidance: 'Trace the change from otters to urchins to kelp to fish, using the numbers at each step.' },
      { label: 'Uncertainty', guidance: 'Name a compensating interaction, such as another urchin predator, and how you would detect it.' },
    ],
    successCriteria: [
      'Kelp is identified as the producer and otters as a top consumer with a large effect relative to their numbers.',
      'The energy explanation includes metabolic loss and heat rather than only saying energy decreases.',
      'The prediction that fish decline is tied to the loss of kelp habitat and the urchin increase shown in the data.',
      'The uncertainty is a specific ecological factor, and the proposed data would show whether it is acting.',
    ],
    commonPitfalls: [
      'Claiming energy is destroyed between trophic levels rather than transferred to the surroundings as heat.',
      'Predicting that urchins will starve immediately without acknowledging the lag as kelp declines.',
      'Ignoring the possibility that another predator or a storm also affected kelp during the two years.',
      'Treating the survey data as proof of causation without considering what else changed.',
    ],
    sampleOutline: [
      'Chain: kelp to urchin to otter; fish depend on kelp habitat rather than eating it.',
      'Cascade: otter loss releases urchins, which overgraze kelp, so fish lose shelter and are predicted to decline.',
      'Uncertainty: another urchin predator or a change in water conditions; surveys of other predators and kelp recovery would test this.',
    ],
  },
]);

module.exports = { AP_BIOLOGY_WORKSHOPS, AP_BIOLOGY_WORKSHOP_REVIEW_NOTE: REVIEW_NOTE };
