'use strict';

/**
 * 36 Exam-Authentic Misconception Families & Remediation Playbooks
 * across 6 AP Learning Libraries (6 paired entries per library):
 *  - ap_biology_foundation_pilot
 *  - ap_chemistry_foundation_pilot
 *  - ap_psychology_pilot
 *  - ap_statistics_foundation_pilot
 *  - ap_us_government_foundation_pilot
 *  - ap_us_history_foundation_pilot
 */

const ap_biology_foundation_pilot = {
  misconceptionFamilies: [
    {
      id: 'ap-bio-mf-correlation-vs-mechanism',
      label: 'Correlation vs. Biological Mechanism',
      description:
        'Learners mistake a co-occurring trend in a data table or graph for a proven causal cellular or physiological pathway, skipping the intermediate molecular step that links stimulus to response.',
      remediationMove:
        'Trace the explicit molecular chain from signal or perturbation → intermediate molecule or pathway step → measured biological outcome before accepting any causal claim.',
      remediationPlaybookId: 'ap-bio-pb-correlation-vs-mechanism',
      itemIds: [
        'ap-bio-u3-013',
        'ap-bio-u3-014',
        'ap-bio-u3-015',
        'ap-bio-u3-016',
        'ap-bio-u3-017',
        'ap-bio-u3-018',
        'ap-bio-u4-019',
        'ap-bio-u4-020',
        'ap-bio-u4-021',
        'ap-bio-u4-022',
        'ap-bio-u4-023',
        'ap-bio-u4-024',
      ],
    },
    {
      id: 'ap-bio-mf-teleology-evolution',
      label: 'Teleological and Need-Driven Evolution',
      description:
        'Learners select distractors claiming organisms mutate, adapt, or develop traits in order to survive an environmental change, rather than recognizing pre-existing heritable variation filtered by differential reproductive success.',
      remediationMove:
        'Rewrite every evolutionary explanation in three strict steps: pre-existing random variation → selective pressure → higher reproductive fitness increasing allele frequency across generations.',
      remediationPlaybookId: 'ap-bio-pb-teleology-evolution',
      itemIds: [
        'ap-bio-u7-038',
        'ap-bio-u7-039',
        'ap-bio-u7-040',
        'ap-bio-u7-041',
        'ap-bio-u7-042',
        'ap-bio-u7-043',
        'ap-bio-u7-044',
        'ap-bio-u7-089',
        'ap-bio-u7-090',
        'ap-bio-u7-091',
        'ap-bio-u7-092',
        'ap-bio-u7-093',
      ],
    },
    {
      id: 'ap-bio-mf-water-potential-osmosis-sign',
      label: 'Water Potential and Osmosis Sign Reversal',
      description:
        'Learners drop the negative sign in solute potential (Ψs = −iCRT), omit turgor pressure potential (Ψp), or reverse net osmotic flow by moving water toward higher solute potential instead of from higher total Ψ to lower total Ψ.',
      remediationMove:
        'Compute Ψ = Ψp + Ψs for both compartments with explicit signs, place both values on a signed number line, and draw the osmosis arrow strictly from the more positive Ψ → more negative Ψ.',
      remediationPlaybookId: 'ap-bio-pb-water-potential-osmosis-sign',
      itemIds: [
        'ap-bio-u2-007',
        'ap-bio-u2-008',
        'ap-bio-u2-009',
        'ap-bio-u2-010',
        'ap-bio-u2-011',
        'ap-bio-u2-012',
        'ap-bio-u2-058',
        'ap-bio-u2-059',
        'ap-bio-u2-060',
        'ap-bio-u2-061',
        'ap-bio-u2-062',
        'ap-bio-u2-063',
      ],
    },
    {
      id: 'ap-bio-mf-gene-regulation-operon',
      label: 'Gene Regulation and Operon Logic Inversion',
      description:
        'Learners invert inducible (lac) and repressible (trp) operon switches, confuse corepressors with inducers, or conflate cis-acting promoter/operator mutations with trans-acting repressor protein mutations.',
      remediationMove:
        'Build a 2-state operon truth table mapping effector presence → repressor conformation → operator occupancy → RNA polymerase transcription rate before reading the answer choices.',
      remediationPlaybookId: 'ap-bio-pb-gene-regulation-operon',
      itemIds: [
        'ap-bio-u6-031',
        'ap-bio-u6-032',
        'ap-bio-u6-033',
        'ap-bio-u6-034',
        'ap-bio-u6-035',
        'ap-bio-u6-036',
        'ap-bio-u6-037',
        'ap-bio-u6-083',
        'ap-bio-u6-084',
        'ap-bio-u6-085',
        'ap-bio-u6-086',
        'ap-bio-u6-087',
      ],
    },
    {
      id: 'ap-bio-mf-experimental-control-confounding',
      label: 'Experimental Control and Confounding Variable Blindness',
      description:
        'Learners misclassify negative vs. positive controls, treat overlapping ±2 SE error bars as statistically distinct outcomes, or attribute treatment differences to the wrong independent variable when two conditions vary simultaneously.',
      remediationMove:
        'Audit the experimental design by naming the single manipulated independent variable, the matched negative control baseline, and whether ±2 SE error bars overlap before endorsing any data conclusion.',
      remediationPlaybookId: 'ap-bio-pb-experimental-control-confounding',
      itemIds: [
        'ap-bio-u1-001',
        'ap-bio-u1-002',
        'ap-bio-u1-003',
        'ap-bio-u1-004',
        'ap-bio-u1-005',
        'ap-bio-u1-006',
        'ap-bio-u3-065',
        'ap-bio-u3-066',
        'ap-bio-u3-067',
        'ap-bio-u3-068',
        'ap-bio-u3-069',
        'ap-bio-u3-070',
      ],
    },
    {
      id: 'ap-bio-mf-population-vs-individual',
      label: 'Population vs. Individual Scale Conflation',
      description:
        'Learners apply single-organism physiology, gamete segregation, or individual acclimation directly to population-level metrics such as allele frequencies (p and q), genetic drift, or logistic carrying capacity (K).',
      remediationMove:
        'Tag the unit of analysis first (single cell, individual organism, or breeding population) and match the quantitative tool (Punnett ratio vs. Hardy-Weinberg p² + 2pq + q² = 1 vs. dN/dt) strictly to that scale.',
      remediationPlaybookId: 'ap-bio-pb-population-vs-individual',
      itemIds: [
        'ap-bio-u5-025',
        'ap-bio-u5-026',
        'ap-bio-u5-027',
        'ap-bio-u5-028',
        'ap-bio-u5-029',
        'ap-bio-u5-030',
        'ap-bio-u8-045',
        'ap-bio-u8-046',
        'ap-bio-u8-047',
        'ap-bio-u8-048',
        'ap-bio-u8-049',
        'ap-bio-u8-050',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ap-bio-pb-correlation-vs-mechanism',
      familyId: 'ap-bio-mf-correlation-vs-mechanism',
      familyLabel: 'Correlation vs. Biological Mechanism',
      title: 'Separating Observed Biological Trends from Proven Cellular Mechanisms',
      recognitionCue:
        'You selected an option asserting that variable X directly activates or inhibits pathway Y even though the graph only reports an association without blocking or isolating an intermediate step.',
      repairQuestion:
        'What specific molecular intermediate or experimental perturbation would be required to prove direct causation rather than a shared upstream trigger?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the stimulus figure or table and circle the exact measured variables on both axes, flagging any answer choice that inserts an unmeasured enzyme, receptor, or direct causal verb.',
          requiredOutput:
            'A two-column note listing what the graph directly measures versus the unproven causal step claimed by the distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Map the cellular pathway using a three-node chain (input signal → tested intermediate → measured readout) and note where an alternative shared factor could produce the same correlation.',
          requiredOutput:
            'A completed three-node mechanism diagram plus one plausible third biological factor that could explain the observed association.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Compare two AP Biology energetics or signal-transduction data sets: one with an inhibitor knockout and one purely observational, labeling which supports a mechanistic claim.',
          requiredOutput:
            'A side-by-side justification showing why the inhibitor trial supports causation while the observational dataset supports only association.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed item and solve a new cell-communication or enzyme-kinetics graph item by disqualifying every distractor that overstates mechanism beyond the experimental evidence.',
          requiredOutput:
            'Correct selection on both items accompanied by a one-sentence evidence check tying the winning choice to the exact experimental manipulation.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-bio-pb-teleology-evolution',
      familyId: 'ap-bio-mf-teleology-evolution',
      familyLabel: 'Teleological and Need-Driven Evolution',
      title: 'Replacing Need-Based Adaptation Language with Selection Mechanics',
      recognitionCue:
        'You chose an answer containing goal-directed phrasing such as "mutated to resist", "adapted so it could survive", or "developed traits because the habitat changed".',
      repairQuestion:
        'Did the favorable allele appear after the selective pressure as a purposeful response, or did it already exist randomly before selection shifted survival and reproduction?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Underline every teleological trigger phrase ("in order to", "needed to", "tried to", "became resistant to survive") across the answer choices of the missed natural-selection item.',
          requiredOutput:
            'A marked list of goal-directed distractor phrases and why each violates random mutation and non-random selection.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Rebuild the evolutionary explanation using the AP Bio 4-part frame: pre-existing variation → selective agent → differential reproductive success → shift in population allele frequency.',
          requiredOutput:
            'A four-clause non-teleological explanation of the scenario that never attributes intent or need to organisms or mutations.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Rewrite two classic AP evolution prompts (antibiotic resistance in bacteria and pesticide resistance in insects) from teleological statements into mechanistic selection statements.',
          requiredOutput:
            'Two corrected mechanistic paragraphs specifying the timing of mutation relative to exposure and the fitness metric (offspring count).',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 7 item and one novel speciation or genetic-drift item, eliminating any distractor that describes individuals evolving during a single lifetime.',
          requiredOutput:
            'Verified correct responses on both items with explicit identification of the selective pressure and population-level allele shift.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-bio-pb-water-potential-osmosis-sign',
      familyId: 'ap-bio-mf-water-potential-osmosis-sign',
      familyLabel: 'Water Potential and Osmosis Sign Reversal',
      title: 'Locking Down Water Potential Signs and Net Osmosis Direction',
      recognitionCue:
        'You calculated a positive solute potential, treated a more negative Ψ value as "larger", or predicted water moving out of a hypotonic bath into a higher-Ψ cell.',
      repairQuestion:
        'After computing Ψ = Ψp + (−iCRT) for both the cell and the surrounding solution, which numerical value sits further to the right on the number line?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Audit your calculation from the missed cell-transport item to pinpoint whether the error came from dropping the minus sign in −iCRT, misreading ionization constant i (sucrose i = 1 vs. NaCl i = 2), or comparing absolute values instead of signed numbers.',
          requiredOutput:
            'An error diagnosis tagging the exact sign, constant, or direction reversal in the original calculation.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Plot both Ψ_cell and Ψ_solution on a horizontal number line from −15 bar to +5 bar and draw the net water-movement arrow strictly from right (higher Ψ) → left (lower Ψ).',
          requiredOutput:
            'A labeled signed calculation for both compartments, the number-line placement, and the resulting tonicity and mass-change prediction.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Solve two paired osmosis drills: one open-beaker plant cell (Ψp = 0 in beaker, positive Ψp in turgid cell) and one sucrose-vs-NaCl comparison at equal molarity.',
          requiredOutput:
            'Step-by-step Ψs, Ψp, and total Ψ values for both drills showing why 0.2 M NaCl has twice the magnitude of Ψs compared with 0.2 M sucrose.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the original Unit 2 transport item and a fresh dialysis-tubing or potato-core percent-mass-change graph item using the signed number-line check.',
          requiredOutput:
            'Accurate answers on both items plus a brief explanation of the zero-percent-mass-change x-intercept (isotonic molarity).',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-bio-pb-gene-regulation-operon',
      familyId: 'ap-bio-mf-gene-regulation-operon',
      familyLabel: 'Gene Regulation and Operon Logic Inversion',
      title: 'Tracing Inducible vs. Repressible Operon and Mutation Logic',
      recognitionCue:
        'You predicted transcription turns ON when tryptophan binds the trp repressor, or assumed a mutated operator still allows a normal repressor protein to block RNA polymerase.',
      repairQuestion:
        'In this operon, is the default repressor active or inactive without its small-molecule effector, and does the mutation break DNA binding at the operator or effector binding on the repressor?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Classify the operon in the prompt as inducible (catabolic, default OFF, such as lac) or repressible (anabolic, default ON, such as trp) and mark where your original prediction flipped the switch.',
          requiredOutput:
            'A clear label of operon class, default transcriptional state, and the exact polarity flip in your previous answer.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Construct a 4-row state table (effector absent/present × wild-type/mutant) tracking repressor shape → operator binding → RNA polymerase access → mRNA output.',
          requiredOutput:
            'A completed 4-row operon logic table distinguishing loss of operator affinity (constitutive ON) from loss of inducer affinity (constitutive OFF).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Predict transcription outcomes for three classic AP Bio mutations: a deleted promoter, a mutated lac operator that cannot bind repressor, and a lac repressor unable to bind allolactose.',
          requiredOutput:
            'Three concise predictions specifying whether structural enzymes are never made or continuously made regardless of lactose presence.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 6 item and transfer the regulatory-switch checklist to a eukaryotic transcription-factor or epigenetic chromatin-remodeling question.',
          requiredOutput:
            'Correct selections on both items with a note explaining how DNA accessibility governs RNA polymerase initiation in both prokaryotes and eukaryotes.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-bio-pb-experimental-control-confounding',
      familyId: 'ap-bio-mf-experimental-control-confounding',
      familyLabel: 'Experimental Control and Confounding Variable Blindness',
      title: 'Auditing Controls, Confounders, and ±2 SE Error Bars',
      recognitionCue:
        'You claimed two treatment means were significantly different despite overlapping ±2 SE error bars, or picked a control group that changed more than one variable at once.',
      repairQuestion:
        'Which single variable differs between the experimental and control treatments, and do the ±2 SE bars separate cleanly enough to reject the null hypothesis?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the experimental setup and bar/line graph from the missed item, highlighting any secondary condition (pH, temperature, solvent, or buffer) not held constant and checking error-bar overlap.',
          requiredOutput:
            'An audit listing the intended independent variable, any uncontrolled confounder, and a yes/no check on ±2 SE error-bar overlap.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Specify what a proper negative control (baseline without active treatment) and positive control (known working response) must contain so only one factor varies.',
          requiredOutput:
            'A two-line control specification stating the exact composition and expected baseline reading for both negative and positive controls.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate two enzyme-assay scenarios: one where boiled enzyme serves as a negative control and one where two treatments have overlapping 95% CI bars despite different sample means.',
          requiredOutput:
            'Written verdicts explaining why boiled enzyme isolates catalytic activity and why overlapping ±2 SE bars prevent claiming a statistically significant difference.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed AP Biology lab-design item and solve a second unfamiliar data-analysis prompt using the single-variable and error-bar checklist.',
          requiredOutput:
            'Correct choices on both items supported by explicit reference to the control baseline and error-bar separation.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-bio-pb-population-vs-individual',
      familyId: 'ap-bio-mf-population-vs-individual',
      familyLabel: 'Population vs. Individual Scale Conflation',
      title: 'Matching Biological Reasoning to Individual vs. Population Scale',
      recognitionCue:
        'You used an individual Punnett-square genotype ratio to answer a population allele-frequency question, or claimed an individual organism evolves or shifts carrying capacity on its own.',
      repairQuestion:
        'Is the prompt asking about one organism and its offspring, or about allele frequencies and density-dependent growth across an entire interbreeding population?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Underline the biological unit named in the stem ("individual", "gamete", "offspring", "population", "gene pool", or "community") and compare it against the scale assumed by your missed answer.',
          requiredOutput:
            'A brief mismatch note stating the scale required by the prompt versus the scale used in the distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Pair each biological scale with its governing math: individual cross → Punnett probability; population genetics → q² (homozygous recessive frequency) → q → p = 1 − q → 2pq; ecology → dN/dt = r_max N (K − N)/K.',
          requiredOutput:
            'A scale-to-tool reference card showing why dominant phenotype frequency equals p² + 2pq rather than p alone.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Work two contrasting items: a Hardy-Weinberg problem starting from 16% recessive phenotype (q² = 0.16 → q = 0.4 → 2pq = 0.48) and a logistic growth problem explaining why per-capita growth slows as N approaches K.',
          requiredOutput:
            'Exact carrier-frequency calculation and a density-dependent explanation of why population growth rate peaks near K/2 rather than at K.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the original Unit 5 or Unit 8 item and complete one cross-unit transfer item linking genetic drift or bottleneck effects to population-level heterozygosity.',
          requiredOutput:
            'Correct solutions on both items with an explicit scale verification line before each final choice.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const ap_chemistry_foundation_pilot = {
  misconceptionFamilies: [
    {
      id: 'ap-chem-mf-stoichiometry-limiting-reactant',
      label: 'Stoichiometry and Limiting Reactant Mass Shortcut',
      description:
        'Learners identify the limiting reactant by choosing the smaller given mass or smaller raw mole amount without dividing by balanced stoichiometric coefficients, or calculate product yield from the excess reactant.',
      remediationMove:
        'Convert every reactant to moles, divide each by its balanced coefficient to find reaction extents, and run a Before-Change-After (BCA) mole table to track both product formed and excess remaining.',
      remediationPlaybookId: 'ap-chem-pb-stoichiometry-limiting-reactant',
      itemIds: [
        'ap-chem-u4-061',
        'ap-chem-u4-062',
        'ap-chem-u4-063',
        'ap-chem-u4-064',
        'ap-chem-u4-065',
        'ap-chem-u4-066',
        'ap-chem-u4-067',
        'ap-chem-u4-068',
        'ap-chem-u4-069',
        'ap-chem-u4-070',
        'ap-chem-u4-071',
        'ap-chem-u4-072',
      ],
    },
    {
      id: 'ap-chem-mf-imf-vs-covalent-bond',
      label: 'Intermolecular Forces vs. Intramolecular Covalent Bonds',
      description:
        'Learners claim phase changes like boiling or melting break covalent bonds inside molecules, misattribute hydrogen bonding to molecules lacking N−H, O−H, or F−H bonds, or ignore polarizability in London dispersion forces.',
      remediationMove:
        'Separate substance type first (molecular vs. ionic vs. covalent network vs. metallic), identify the exact attraction broken during phase change, and verify H-bond donor/acceptor atoms before ranking boiling points.',
      remediationPlaybookId: 'ap-chem-pb-imf-vs-covalent-bond',
      itemIds: [
        'ap-chem-u2-021',
        'ap-chem-u2-022',
        'ap-chem-u2-023',
        'ap-chem-u2-024',
        'ap-chem-u2-025',
        'ap-chem-u2-026',
        'ap-chem-u3-041',
        'ap-chem-u3-042',
        'ap-chem-u3-043',
        'ap-chem-u3-044',
        'ap-chem-u3-045',
        'ap-chem-u3-046',
      ],
    },
    {
      id: 'ap-chem-mf-q-vs-k-equilibrium-shift',
      label: 'Reaction Quotient (Q) vs. Equilibrium Constant (K) Shift Confusion',
      description:
        'Learners include pure solids or liquids in Q and K expressions, predict that concentration or pressure changes alter the numerical value of K, or invert the shift direction when Q exceeds K.',
      remediationMove:
        'Write Q using only aqueous and gaseous species, compare Q against K to predict the forward or reverse shift, and enforce the rule that only a temperature change modifies K.',
      remediationPlaybookId: 'ap-chem-pb-q-vs-k-equilibrium-shift',
      itemIds: [
        'ap-chem-u7-121',
        'ap-chem-u7-122',
        'ap-chem-u7-123',
        'ap-chem-u7-124',
        'ap-chem-u7-125',
        'ap-chem-u7-126',
        'ap-chem-u7-127',
        'ap-chem-u7-128',
        'ap-chem-u7-129',
        'ap-chem-u7-130',
        'ap-chem-u7-131',
        'ap-chem-u7-132',
      ],
    },
    {
      id: 'ap-chem-mf-ph-buffer-henderson-hasselbalch',
      label: 'pH, Equivalence Point, and Buffer Henderson-Hasselbalch Trap',
      description:
        'Learners assume every titration reaches equivalence at pH 7.00, confuse the half-equivalence buffer point (pH = pKa) with equivalence, or plug pre-neutralization molarities into Henderson-Hasselbalch without doing stoichiometry first.',
      remediationMove:
        'Run a mole-based neutralization table before any equilibrium step, identify the dominant species left in solution (buffer pair vs. weak conjugate salt vs. excess strong species), and match the pH method to that regime.',
      remediationPlaybookId: 'ap-chem-pb-ph-buffer-henderson-hasselbalch',
      itemIds: [
        'ap-chem-u8-141',
        'ap-chem-u8-142',
        'ap-chem-u8-143',
        'ap-chem-u8-144',
        'ap-chem-u8-145',
        'ap-chem-u8-146',
        'ap-chem-u8-147',
        'ap-chem-u8-148',
        'ap-chem-u8-149',
        'ap-chem-u8-150',
        'ap-chem-u8-151',
        'ap-chem-u8-152',
      ],
    },
    {
      id: 'ap-chem-mf-kinetics-vs-thermodynamics',
      label: 'Kinetics vs. Thermodynamics Conflation',
      description:
        'Learners assume a reaction with negative ΔG° must proceed quickly, claim a catalyst alters ΔH° or equilibrium yield, or write rate laws from overall stoichiometric coefficients instead of experimental orders or the rate-determining step.',
      remediationMove:
        'Partition every reaction-coordinate problem into two separate questions: barrier height Ea and slow-step molecularity (kinetics) versus reactant-to-product energy gap ΔH° and ΔG° (thermodynamics).',
      remediationPlaybookId: 'ap-chem-pb-kinetics-vs-thermodynamics',
      itemIds: [
        'ap-chem-u5-081',
        'ap-chem-u5-082',
        'ap-chem-u5-083',
        'ap-chem-u5-084',
        'ap-chem-u5-085',
        'ap-chem-u5-086',
        'ap-chem-u5-087',
        'ap-chem-u5-088',
        'ap-chem-u5-089',
        'ap-chem-u5-090',
        'ap-chem-u5-091',
        'ap-chem-u5-092',
      ],
    },
    {
      id: 'ap-chem-mf-sign-deltah-deltag-ecell',
      label: 'Sign Convention Reversals in ΔH°, ΔG°, and E°cell',
      description:
        'Learners flip endothermic/exothermic signs in bond-enthalpy sums (reactants − products vs. products − reactants), mix J and kJ in ΔG° = ΔH° − TΔS°, or multiply standard reduction potentials E° by stoichiometric coefficients.',
      remediationMove:
        'Verify sign polarity and units before computing: bond breaking is positive and bond forming is negative; convert ΔS° to kJ/(mol·K); keep intensive E° values unscaled and check ΔG° = −nFE°cell sign alignment.',
      remediationPlaybookId: 'ap-chem-pb-sign-deltah-deltag-ecell',
      itemIds: [
        'ap-chem-u6-101',
        'ap-chem-u6-102',
        'ap-chem-u6-103',
        'ap-chem-u6-104',
        'ap-chem-u6-105',
        'ap-chem-u6-106',
        'ap-chem-u9-161',
        'ap-chem-u9-162',
        'ap-chem-u9-163',
        'ap-chem-u9-164',
        'ap-chem-u9-165',
        'ap-chem-u9-166',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ap-chem-pb-stoichiometry-limiting-reactant',
      familyId: 'ap-chem-mf-stoichiometry-limiting-reactant',
      familyLabel: 'Stoichiometry and Limiting Reactant Mass Shortcut',
      title: 'Using Reaction-Extent Ratios and BCA Tables for Limiting Reactants',
      recognitionCue:
        'You picked the limiting reactant by comparing raw grams or unscaled moles, or reported zero leftover reactant for the species that actually stayed in excess.',
      repairQuestion:
        'When you divide each reactant mole amount by its balanced stoichiometric coefficient, which reactant allows the fewest full reaction turnovers?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Compare your original choice against the balanced equation and highlight where molar mass or stoichiometric ratio (such as 2:1 or 3:2) overturned the raw mass comparison.',
          requiredOutput:
            'A short diagnostic line showing raw grams, raw moles, and mole-to-coefficient ratios for every reactant.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a 3-row Before-Change-After (BCA) mole table using the smaller reaction extent x so the limiting reactant hits 0 mol while excess reactant and products update in strict stoichiometric multiples of x.',
          requiredOutput:
            'A complete BCA mole table with final moles of product produced and final moles (and grams) of excess reactant remaining.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Solve a particulate-diagram stoichiometry item and a precipitation molarity limiting-reactant item by counting stoichiometric packets rather than raw particle totals.',
          requiredOutput:
            'Two verified counts showing remaining spectator/excess particles and theoretical yield in moles.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Unit 4 item and a percent-yield transfer item where experimental yield is compared against the limiting-reactant theoretical yield.',
          requiredOutput:
            'Correct final answers on both items with explicit identification of the limiting reactant and the BCA extent x.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-chem-pb-imf-vs-covalent-bond',
      familyId: 'ap-chem-mf-imf-vs-covalent-bond',
      familyLabel: 'Intermolecular Forces vs. Intramolecular Covalent Bonds',
      title: 'Distinguishing Intermolecular Attractions from Covalent Bonds',
      recognitionCue:
        'You explained a higher boiling point by citing stronger C−H or O−H covalent bonds inside the molecule, or claimed hydrogen bonding exists in a molecule where H is bonded only to carbon.',
      repairQuestion:
        'During vaporization of this substance, do intact molecules separate from each other by overcoming IMFs, or is this a covalent network solid whose actual covalent bonds break?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Draw two neighboring molecules of the substance in the prompt and label the intramolecular bonds inside one molecule separately from the dashed intermolecular attractions between the two molecules.',
          requiredOutput:
            'A two-molecule sketch or text diagram distinguishing intact intramolecular bonds from broken intermolecular attractions during boiling.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Inventory all IMFs for both compared substances (London dispersion scaled by electron cloud size/polarizability, dipole-dipole, and true H-bonding requiring H covalently attached to N, O, or F).',
          requiredOutput:
            'A side-by-side IMF checklist naming the decisive interaction that accounts for the higher boiling point or lower vapor pressure.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Rank two AP Chem trap pairs: CH₃OCH₃ vs. CH₃CH₂OH (isomers testing H-bonding) and F₂ vs. I₂ (nonpolar halogens where larger electron cloud polarizability drives higher boiling point).',
          requiredOutput:
            'Two AP FRQ-ready justification sentences naming both substances, their specific IMFs, and why one requires more thermal energy to separate.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 2/3 item and a new solubility or chromatography polarity item without once conflating covalent bond strength with IMF strength.',
          requiredOutput:
            'Correct selections on both items accompanied by an explicit check of whether molecules stay intact during the physical change.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-chem-pb-q-vs-k-equilibrium-shift',
      familyId: 'ap-chem-mf-q-vs-k-equilibrium-shift',
      familyLabel: 'Reaction Quotient (Q) vs. Equilibrium Constant (K) Shift Confusion',
      title: 'Diagnosing Equilibrium Shifts via Q vs. K Without Mutating K',
      recognitionCue:
        'You predicted a shift after adding a pure solid, claimed adding reactant increases K, or moved the reaction forward even though Q already exceeded K.',
      repairQuestion:
        'How does the disturbance immediately change the numerator or denominator of Q (using only aqueous and gaseous terms), and did the temperature change at all?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Write the exact mass-action expression Q for the reaction in the stem, crossing out any pure solid (s) or liquid (l), and note where your previous answer mistakenly changed K or included a solid.',
          requiredOutput:
            'The cleaned Q expression alongside a one-line diagnosis of the original Le Chatelier or K-invariance slip.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the Q-vs-K compass: if Q is smaller than K, the system shifts right (products increase) until Q = K; if Q exceeds K, the system shifts left (reactants increase) until Q = K; only temperature moves K.',
          requiredOutput:
            'A completed disturbance table showing immediate effect on Q, comparison of Q against K, shift direction, and whether K stayed constant or changed.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate three classic AP Equilibrium perturbations on an exothermic gas reaction: halving container volume, adding inert He gas at constant volume, and raising temperature.',
          requiredOutput:
            'Three concise verdicts giving the Q-vs-K relation, shift direction, and K status (unchanged vs. decreased) for each perturbation.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Unit 7 item and solve a solubility-equilibrium (Ksp) common-ion item using the same Q-vs-K framework.',
          requiredOutput:
            'Verified correct answers on both items showing why adding a common ion makes Q exceed Ksp without changing Ksp.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-chem-pb-ph-buffer-henderson-hasselbalch',
      familyId: 'ap-chem-mf-ph-buffer-henderson-hasselbalch',
      familyLabel: 'pH, Equivalence Point, and Buffer Henderson-Hasselbalch Trap',
      title: 'Separating Stoichiometric Neutralization from Buffer and Salt Hydrolysis',
      recognitionCue:
        'You set the weak-acid/strong-base equivalence point to pH 7.00, used pH = pKa at equivalence instead of half-equivalence, or ignored the stoichiometry of added strong base.',
      repairQuestion:
        'After the one-way neutralization reaction finishes in moles, which acid-base species actually remain in the flask?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Locate the titration point in the missed item on a weak-acid/strong-base curve (initial, buffer region, half-equivalence, equivalence, or post-equivalence) and note which zone rule you misapplied.',
          requiredOutput:
            'Zone label for the item plus the exact mismatch (for instance, applying neutral pH 7.00 where conjugate base A⁻ hydrolyzes to produce OH⁻).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Execute the two-step AP Acid-Base protocol: Step 1 complete a mole BCA neutralization table; Step 2 choose the matching equilibrium equation (Henderson-Hasselbalch if both HA and A⁻ remain; Kb hydrolysis if only A⁻ remains; excess OH⁻ molarity if strong base dominates).',
          requiredOutput:
            'Completed mole BCA table followed by the regime-matched pH setup and qualitative check (basic equivalence pH for weak acid + strong base).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Compare the pH and buffer capacity of two acetate buffers: one at 0.10 M HA / 0.10 M A⁻ and one at 0.50 M HA / 0.50 M A⁻, then predict how adding 0.02 mol HCl shifts the [A⁻]/[HA] ratio.',
          requiredOutput:
            'Explanation showing both share pH = pKa initially, why the 0.50 M buffer resists pH drift more strongly, and the updated mole ratio after HCl addition.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 8 item and transfer the protocol to a weak-base/strong-acid titration curve item asking for the best indicator or dominant species at a given pH.',
          requiredOutput:
            'Correct choices on both items with explicit identification of the dominant species (BH⁺ vs. B) relative to pKa.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-chem-pb-kinetics-vs-thermodynamics',
      familyId: 'ap-chem-mf-kinetics-vs-thermodynamics',
      familyLabel: 'Kinetics vs. Thermodynamics Conflation',
      title: 'Decoupling Activation Energy and Rate Laws from ΔG° and ΔH°',
      recognitionCue:
        'You predicted a faster reaction solely because ΔG° was very negative, claimed a catalyst lowers ΔH° or shifts K, or copied overall equation coefficients into the rate law.',
      repairQuestion:
        'Does the prompt ask about the pathway barrier and reaction speed (kinetics: Ea, k, slow step) or the endpoint stability and yield (thermodynamics: ΔH°, ΔG°, K)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Sort every term in the missed Unit 5 item into two buckets: Kinetics (rate, k, Ea, half-life, slow step, catalyst pathway) versus Thermodynamics (ΔH°, ΔS°, ΔG°, K), flagging where your answer crossed the boundary.',
          requiredOutput:
            'A two-bucket classification identifying the exact kinetics-thermodynamics crossover error.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Inspect a reaction-coordinate diagram with and without a catalyst, marking that a catalyst introduces an alternate mechanism with lower Ea while leaving reactant energy, product energy, ΔH°, and K untouched.',
          requiredOutput:
            'An annotated energy-profile summary contrasting what changes with a catalyst (Ea, k, mechanism steps) against what stays invariant (ΔH°, ΔG°, K).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Determine the rate law for a two-step mechanism (fast equilibrium followed by slow second step) and verify why an intermediate must be substituted out using the fast pre-equilibrium.',
          requiredOutput:
            'The derived experimental rate law expressed solely in terms of reactants (no intermediate) plus a check confirming it differs from the overall stoichiometry.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed kinetics item and solve a thermodynamically favorable yet kinetically controlled reaction prompt (such as diamond → graphite or H₂O₂ decomposition).',
          requiredOutput:
            'Correct responses on both items clearly separating high activation barrier from negative ΔG°.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-chem-pb-sign-deltah-deltag-ecell',
      familyId: 'ap-chem-mf-sign-deltah-deltag-ecell',
      familyLabel: 'Sign Convention Reversals in ΔH°, ΔG°, and E°cell',
      title: 'Enforcing Sign, Unit, and Intensive-Property Discipline in Thermo & Electrochem',
      recognitionCue:
        'You subtracted reactants from products in a bond-enthalpy sum, forgot to divide ΔS° by 1000 before subtracting TΔS°, or doubled E° when doubling a half-reaction.',
      repairQuestion:
        'Does your final sign make physical sense across all three linked indicators: exothermic/endothermic heat flow, ΔG° negativity, and positive E°cell for a galvanic cell?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Audit your calculation from the missed Unit 6 or Unit 9 item against three red-flag checkpoints: formula direction (broken − formed vs. ΔHf° products − reactants), J-to-kJ unit match, and intensive E° invariance.',
          requiredOutput:
            'A specific tag naming which of the three sign/unit traps inverted the original answer.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Assemble a unified favorability alignment strip: thermodynamically favorable ↔ ΔG° negative ↔ K greater than 1 ↔ E°cell positive (via ΔG° = −nFE°cell = −RT ln K).',
          requiredOutput:
            'A completed alignment table verifying consistent signs across ΔH°, ΔS° (in kJ/mol·K), ΔG°, K, and E°cell for the prompt reaction.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Work two precision drills: compute ΔH°rxn from bond energies (sum broken − sum formed) and compute E°cell = E°cathode − E°anode for a 2e⁻/3e⁻ redox reaction without scaling either reduction potential.',
          requiredOutput:
            'Two sign-verified calculations showing explicit unit conversion and confirming n = 6 enters ΔG° = −nFE°cell while E°cell remains unscaled.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the original Unit 6/9 item and one temperature-dependence item predicting when a reaction with ΔH° positive and ΔS° positive switches from non-spontaneous to spontaneous.',
          requiredOutput:
            'Correct solutions on both items including the threshold temperature estimate T = ΔH° / ΔS° with matching energy units.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const ap_psychology_pilot = {
  misconceptionFamilies: [
    {
      id: 'ap-psych-mf-correlation-causation-third-variable',
      label: 'Correlation vs. Causation and Third-Variable Blindness',
      description:
        'Learners treat a strong correlation coefficient (such as r = −0.84) as causal proof, confuse negative correlation direction with weak strength, or ignore unmeasured third variables and reverse directionality.',
      remediationMove:
        'Inspect study design before strength: read |r| for magnitude and its sign strictly for direction, then test whether a third variable or reverse causation explains the relationship when no random assignment occurred.',
      remediationPlaybookId: 'ap-psych-pb-correlation-causation-third-variable',
      itemIds: [
        'ap-psych-u4-001',
        'ap-psych-u4-003',
        'ap-psych-u4-002',
        'ap-psych-u4-004',
        'ap-psych-u4-005',
        'ap-psych-u4-006',
        'ap-psych-u5-001',
        'ap-psych-u5-002',
        'ap-psych-u5-003',
        'ap-psych-u5-004',
        'ap-psych-u5-005',
        'ap-psych-u5-006',
      ],
    },
    {
      id: 'ap-psych-mf-operational-def-confounding',
      label: 'Operational Definition, Random Assignment, and Confounding Confusion',
      description:
        'Learners conflate random selection (generalizing to a population) with random assignment (controlling preexisting group differences), accept vague constructs as operational definitions, or miss placebo and experimenter-expectancy confounds.',
      remediationMove:
        'Verify four research pillars in order: exact measurable operational definition, independent variable manipulation, random assignment vs. random sampling, and blinding against expectancy bias.',
      remediationPlaybookId: 'ap-psych-pb-operational-def-confounding',
      itemIds: [
        'ap-psych-u2-001',
        'ap-psych-u2-002',
        'ap-psych-u2-004',
        'ap-psych-u2-003',
        'ap-psych-u2-005',
        'ap-psych-u2-006',
        'ap-psych-u4-007',
        'ap-psych-u4-008',
        'ap-psych-u4-009',
        'ap-psych-u4-010',
        'ap-psych-u4-011',
        'ap-psych-u4-012',
      ],
    },
    {
      id: 'ap-psych-mf-neg-reinforcement-vs-punishment',
      label: 'Negative Reinforcement vs. Positive Punishment Reversal',
      description:
        'Learners read "negative" as "unpleasant punishment" instead of "subtraction of a stimulus", causing them to misclassify behaviors strengthened by removing an aversive cue as punishment.',
      remediationMove:
        'Apply a strict 2×2 operant decision grid: first decide whether the target behavior increases (reinforcement) or decreases (punishment), then decide whether a stimulus is added (positive) or removed (negative).',
      remediationPlaybookId: 'ap-psych-pb-neg-reinforcement-vs-punishment',
      itemIds: [
        'ap-psych-u3-001',
        'ap-psych-u3-002',
        'ap-psych-u3-003',
        'ap-psych-u3-004',
        'ap-psych-u3-005',
        'ap-psych-u3-006',
        'ap-psych-u3-007',
        'ap-psych-u3-008',
        'ap-psych-u3-009',
        'ap-psych-u3-010',
        'ap-psych-u3-011',
        'ap-psych-u3-012',
      ],
    },
    {
      id: 'ap-psych-mf-sensation-perception-top-down',
      label: 'Sensation vs. Perception and Bottom-Up vs. Top-Down Conflation',
      description:
        'Learners blur physical receptor transduction (sensation) with cortical selection, grouping, and schema-guided interpretation (perception), or mislabel expectation-driven perceptual sets as bottom-up processing.',
      remediationMove:
        'Locate the process on the sensory-to-cognitive pipeline: physical energy → receptor transduction (sensation/bottom-up) versus prior schemas, context, and expectations shaping meaning (perception/top-down).',
      remediationPlaybookId: 'ap-psych-pb-sensation-perception-top-down',
      itemIds: [
        'ap-psych-u1-003',
        'ap-psych-u1-002',
        'ap-psych-u1-001',
        'ap-psych-u1-004',
        'ap-psych-u1-005',
        'ap-psych-u1-006',
        'ap-psych-u2-007',
        'ap-psych-u2-008',
        'ap-psych-u2-009',
        'ap-psych-u2-010',
        'ap-psych-u2-011',
        'ap-psych-u2-012',
      ],
    },
    {
      id: 'ap-psych-mf-neurotransmitter-brain-localization',
      label: 'Neurotransmitter and Brain-Localization Oversimplification',
      description:
        'Learners swap agonists with antagonists, confuse reuptake inhibitors with receptor blockers, or mix up paired neural structures such as Broca vs. Wernicke areas, hippocampus vs. amygdala, and sympathetic vs. parasympathetic branches.',
      remediationMove:
        'Verify synaptic direction (increases vs. blocks signaling) and pair each neural structure with its signature clinical deficit rather than a vague one-word nickname.',
      remediationPlaybookId: 'ap-psych-pb-neurotransmitter-brain-localization',
      itemIds: [
        'ap-psych-u1-003',
        'ap-psych-u1-002',
        'ap-psych-u1-001',
        'ap-psych-u1-004',
        'ap-psych-u1-005',
        'ap-psych-u1-006',
        'ap-psych-u1-007',
        'ap-psych-u1-008',
        'ap-psych-u1-009',
        'ap-psych-u1-010',
        'ap-psych-u1-011',
        'ap-psych-u1-012',
      ],
    },
    {
      id: 'ap-psych-mf-reliability-validity-biopsychosocial',
      label: 'Reliability vs. Validity and Biopsychosocial Attribution Trap',
      description:
        'Learners equate test consistency (reliability) with measuring the intended construct (validity), or reduce psychological disorders and health outcomes to a single isolated biological or environmental cause.',
      remediationMove:
        'Separate consistency across trials (reliability) from construct accuracy (validity), and map clinical/health scenarios across all three interacting biopsychosocial domains before choosing an explanation or intervention.',
      remediationPlaybookId: 'ap-psych-pb-reliability-validity-biopsychosocial',
      itemIds: [
        'ap-psych-u5-001',
        'ap-psych-u5-002',
        'ap-psych-u5-003',
        'ap-psych-u5-004',
        'ap-psych-u5-005',
        'ap-psych-u5-006',
        'ap-psych-u5-007',
        'ap-psych-u5-008',
        'ap-psych-u5-009',
        'ap-psych-u5-010',
        'ap-psych-u5-011',
        'ap-psych-u5-012',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ap-psych-pb-correlation-causation-third-variable',
      familyId: 'ap-psych-mf-correlation-causation-third-variable',
      familyLabel: 'Correlation vs. Causation and Third-Variable Blindness',
      title: 'Reading Correlation Strength, Direction, and Third-Variable Limits',
      recognitionCue:
        'You concluded that variable A causes variable B from a survey or naturalistic observation, or ranked r = +0.35 as stronger than r = −0.78.',
      repairQuestion:
        'Which value has the larger distance from zero (|r|), and what unmeasured third variable could simultaneously drive both measured variables?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the study method in the missed item for manipulation and random assignment; if both are absent, flag every causal verb ("causes", "leads to", "prevents", "reduces") in the choices as an overclaim.',
          requiredOutput:
            'A quick audit stating study design (correlational vs. experimental), the sign/magnitude breakdown of r, and the flagged causal distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Sketch a 3-node triangle for the scenario showing A ↔ B along with a plausible third variable C (such as socioeconomic status, sleep deprivation, or baseline stress) pointing to both A and B.',
          requiredOutput:
            'A three-variable diagram plus one sentence explaining both reverse-directionality and third-variable alternatives.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Compare three correlation coefficients (r = −0.81, r = +0.52, r = −0.12) by predictive strength, then rewrite an overclaiming headline about screen time and anxiety into a defensible AP Psych conclusion.',
          requiredOutput:
            'Correct strength ranking (−0.81 strongest, −0.12 weakest) and a revised non-causal conclusion naming one plausible confounder.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed item and solve a fresh Unit 4 or Unit 5 study-critique item by confirming whether the conclusion matches the design limits.',
          requiredOutput:
            'Verified correct answers on both items with an explicit check of design-to-claim alignment.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-psych-pb-operational-def-confounding',
      familyId: 'ap-psych-mf-operational-def-confounding',
      familyLabel: 'Operational Definition, Random Assignment, and Confounding Confusion',
      title: 'Separating Operational Definitions, Random Assignment, and Sampling',
      recognitionCue:
        'You answered that random assignment makes a sample representative of the population, or selected a broad conceptual label instead of a replicable measurement procedure as an operational definition.',
      repairQuestion:
        'Does this procedure determine WHO enters the study (random sampling → generalizability) or WHICH condition each participant receives (random assignment → causal control)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Identify whether the missed item tested measurement precision (operational definition), external validity (random sampling), or internal validity (random assignment and double-blind control).',
          requiredOutput:
            'A one-line diagnosis naming the research-design concept targeted by the stem versus the concept confused in the chosen distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Convert the abstract psychological construct in the scenario (such as aggression, memory retention, or stress) into a concrete numeric operational definition, and pair random sampling with population generalization and random assignment with confounding control.',
          requiredOutput:
            'A replicable operational definition (with units or scoring criteria) plus a 2-row table separating random sampling from random assignment.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Critique a flawed memory experiment where morning volunteers receive mnemonic training and evening volunteers serve as the control group with an unblinded grader.',
          requiredOutput:
            'Identification of two confounds (time-of-day self-selection and experimenter bias) plus the exact design fixes (random assignment and double-blind scoring).',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the original research-methods item and one new Unit 2/4 experimental vignette, verifying both operational measurability and confound elimination.',
          requiredOutput:
            'Correct choices on both items accompanied by a brief justification naming the exact validity threat eliminated.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-psych-pb-neg-reinforcement-vs-punishment',
      familyId: 'ap-psych-mf-neg-reinforcement-vs-punishment',
      familyLabel: 'Negative Reinforcement vs. Positive Punishment Reversal',
      title: 'Mastering the 2×2 Operant Conditioning Decision Matrix',
      recognitionCue:
        'You labeled buckling a seatbelt to silence a car chime or taking aspirin to stop a headache as punishment because an unpleasant stimulus appeared in the story.',
      repairQuestion:
        'After the consequence occurs, does the target behavior happen MORE often (reinforcement) or LESS often (punishment), and was a stimulus added (+) or removed (−)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Isolate three elements in the missed Unit 3 scenario: the exact target behavior, whether its future frequency rises or falls, and whether the consequence adds or removes a stimulus.',
          requiredOutput:
            'A three-part breakdown exposing where emotional tone ("bad/unpleasant") hijacked the mathematical +/- and increase/decrease rule.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Fill in a 2×2 operant grid mapping Increase/Decrease on the rows and Add (+)/Remove (−) on the columns, placing the scenario cleanly in its single quadrant.',
          requiredOutput:
            'A completed 2×2 matrix with one concrete everyday example in each quadrant (PR, NR, PP, NP).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Classify four quick AP Psych vignettes: ending a loud alarm by standing up (NR), losing phone privileges after curfew violation (NP), receiving extra chores after arguing (PP), and earning bonus credit for early submission (PR).',
          requiredOutput:
            'All four vignettes labeled accurately with explicit arrows showing behavior frequency direction and stimulus addition/removal.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed learning item and solve a paired classical-vs-operant item distinguishing voluntary consequence-driven learning from involuntary UCS → UCR / CS → CR associations.',
          requiredOutput:
            'Verified correct answers on both items without confusing negative reinforcement with punishment or classical conditioning.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-psych-pb-sensation-perception-top-down',
      familyId: 'ap-psych-mf-sensation-perception-top-down',
      familyLabel: 'Sensation vs. Perception and Bottom-Up vs. Top-Down Conflation',
      title: 'Separating Sensory Transduction from Schema-Driven Perception',
      recognitionCue:
        'You called reading a misspelled sentence via context "bottom-up processing", or labeled retinal rod/cone transduction as "perception".',
      repairQuestion:
        'Is the phenomenon happening at physical stimulus detection and neural transduction (sensation/bottom-up) or during brain-level interpretation guided by expectations and prior knowledge (perception/top-down)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Trace the stimulus in the missed item from external energy to conscious meaning and pinpoint the boundary where receptor transduction ends and cortical interpretation begins.',
          requiredOutput:
            'A two-step pipeline note stating the sensory receptor involved and whether the item turns on transduction or cognitive expectation.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Contrast bottom-up feature assembly (receptors → feature detectors → whole object) against top-down guidance (perceptual set, priming, Gestalt context → expectation shaping what you notice).',
          requiredOutput:
            'A two-column comparison mapping key AP terms (absolute threshold, Weber law, transduction vs. perceptual set, figure-ground, binocular cues) to the right stage.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Classify two contrasting scenarios: a radiologist spotting a faint tumor cue using years of training (top-down perceptual set) versus a listener noticing a tone drop below their absolute threshold after sensory adaptation (sensation).',
          requiredOutput:
            'Two labeled justifications citing the exact cue (prior schema vs. receptor-level sensitivity shift).',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 1/2 item and one unfamiliar Gestalt or selective-attention (inattentional blindness) item using the transduction-vs-interpretation check.',
          requiredOutput:
            'Correct choices on both items with a one-sentence confirmation of processing direction (bottom-up vs. top-down).',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-psych-pb-neurotransmitter-brain-localization',
      familyId: 'ap-psych-mf-neurotransmitter-brain-localization',
      familyLabel: 'Neurotransmitter and Brain-Localization Oversimplification',
      title: 'Pinpointing Synaptic Drug Action and Paired Brain-Structure Deficits',
      recognitionCue:
        'You labeled an SSRI reuptake inhibitor as an antagonist because it "blocks" a transporter, or swapped Broca expressive aphasia with Wernicke receptive aphasia.',
      repairQuestion:
        'Does this drug ultimately INCREASE postsynaptic neurotransmitter signaling (agonist) or DECREASE it (antagonist), and which exact functional deficit matches the damaged neural structure?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Check the missed Unit 1 item to see whether the slip was a synaptic-direction inversion (blocking reuptake leaves MORE neurotransmitter in the cleft → agonist) or a swapped anatomical pair.',
          requiredOutput:
            'An exact error tag naming the confused neurotransmitter mechanism or brain-region pair.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a high-yield paired-contrast cheat sheet: agonist (mimics or blocks reuptake) vs. antagonist (blocks postsynaptic receptors); Broca (speech production, frontal) vs. Wernicke (language comprehension, temporal); hippocampus (explicit memory consolidation) vs. amygdala (fear/emotion).',
          requiredOutput:
            'A 4-pair clinical-deficit table linking each structure or synaptic mechanism to its unmistakable AP symptom signature.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Diagnose two short case vignettes: a stroke patient who speaks fluently in nonsensical sentences (Wernicke area) and a medication that binds to acetylcholine receptors without opening ion channels (ACh antagonist).',
          requiredOutput:
            'Correct diagnosis for both vignettes explaining the exact functional mechanism rather than a generic brain-lobe guess.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed neurobiology item and solve a fresh autonomic-nervous-system item contrasting sympathetic mobilization against parasympathetic recovery.',
          requiredOutput:
            'Correct answers on both items backed by precise synaptic or anatomical mechanism statements.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-psych-pb-reliability-validity-biopsychosocial',
      familyId: 'ap-psych-mf-reliability-validity-biopsychosocial',
      familyLabel: 'Reliability vs. Validity and Biopsychosocial Attribution Trap',
      title: 'Distinguishing Test Consistency from Validity and Single-Cause Clinical Traps',
      recognitionCue:
        'You judged a consistently biased scale as valid because scores repeated closely, or picked a purely biological or purely willpower explanation when the vignette included interacting biological, cognitive, and social stressors.',
      repairQuestion:
        'Are the scores merely repeatable (reliable) or truly measuring the target construct (valid), and how do biological vulnerability, cognitive appraisal, and social context interact in this case?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Examine the missed Unit 5 item and highlight whether the distractor conflated test-retest/split-half consistency with construct/predictive validity, or ignored one of the three biopsychosocial legs.',
          requiredOutput:
            'A targeted error note distinguishing the psychometric property or clinical model factor missed in the original choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the bullseye rule (tight cluster off-center = reliable but invalid; centered tight cluster = reliable and valid) and map the clinical vignette onto a 3-column Biopsychosocial grid (Bio: genetics/neurochemistry; Psycho: maladaptive thoughts/coping; Social: support/culture/stressors).',
          requiredOutput:
            'A bullseye classification plus a filled 3-column biopsychosocial breakdown for the case.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate two items: a depression scale that yields identical scores every week yet mostly asks about math anxiety (high reliability, low construct validity) and a diathesis-stress depression vignette combining genetic vulnerability with job loss.',
          requiredOutput:
            'Two concise rationales demonstrating why reliability never guarantees validity and why diathesis-stress requires interaction rather than a single cause.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the original Unit 5 item and complete one therapy-matching transfer item pairing cognitive-behavioral therapy (CBT), exposure, and biomedical interventions with their exact targets.',
          requiredOutput:
            'Verified correct answers on both items with explicit alignment to validity type or biopsychosocial mechanism.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const ap_statistics_foundation_pilot = {
  misconceptionFamilies: [
    {
      id: 'ap-stat-mf-sampling-vs-random-assignment',
      label: 'Random Sampling vs. Random Assignment Scope of Inference',
      description:
        'Learners claim cause-and-effect from an observational study simply because the sample was large and random, or claim population-wide generalization from a volunteer experiment that used only random assignment.',
      remediationMove:
        'Run the 2×2 Scope of Inference matrix before reading choices: random selection unlocks generalization to the sampled population; random assignment to treatments unlocks cause-and-effect.',
      remediationPlaybookId: 'ap-stat-pb-sampling-vs-random-assignment',
      itemIds: [
        'ap-statistics-foundation-pilot-item-001',
        'ap-statistics-foundation-pilot-item-002',
        'ap-statistics-foundation-pilot-item-003',
        'ap-statistics-foundation-pilot-item-004',
        'ap-statistics-foundation-pilot-item-005',
        'ap-statistics-foundation-pilot-item-006',
        'ap-statistics-foundation-pilot-item-007',
        'ap-statistics-foundation-pilot-item-008',
        'ap-statistics-foundation-pilot-item-009',
        'ap-statistics-foundation-pilot-item-010',
        'ap-statistics-foundation-pilot-item-011',
        'ap-statistics-foundation-pilot-item-012',
      ],
    },
    {
      id: 'ap-stat-mf-pvalue-confidence-level',
      label: 'p-Value and Confidence Level Misinterpretation',
      description:
        'Learners misread a p-value as the probability that H₀ is true, or misread a 95% confidence interval as a 95% chance that the fixed parameter lands inside one computed interval or that 95% of individual data values lie in that interval.',
      remediationMove:
        'Anchor both interpretations to repeated sampling: p-value = P(observed or more extreme statistic | H₀ true); confidence level = long-run proportion of repeated-sample intervals that capture the fixed population parameter.',
      remediationPlaybookId: 'ap-stat-pb-pvalue-confidence-level',
      itemIds: [
        'ap-statistics-foundation-pilot-item-041',
        'ap-statistics-foundation-pilot-item-042',
        'ap-statistics-foundation-pilot-item-043',
        'ap-statistics-foundation-pilot-item-044',
        'ap-statistics-foundation-pilot-item-045',
        'ap-statistics-foundation-pilot-item-046',
        'ap-statistics-foundation-pilot-item-061',
        'ap-statistics-foundation-pilot-item-062',
        'ap-statistics-foundation-pilot-item-063',
        'ap-statistics-foundation-pilot-item-064',
        'ap-statistics-foundation-pilot-item-065',
        'ap-statistics-foundation-pilot-item-066',
      ],
    },
    {
      id: 'ap-stat-mf-correlation-linearity-outliers',
      label: 'Correlation, Nonlinearity, Extrapolation, and Influential Outliers',
      description:
        'Learners treat a large |r| or R² as proof that a linear model fits without checking the residual plot, extrapolate LSRL predictions far outside observed x-values, or confuse vertical outliers with high-leverage influential points.',
      remediationMove:
        'Verify linearity from a scatter-free residual plot first, confine predictions to the observed x-range, and test how deleting an extreme x-value shifts both slope b₁ and correlation r.',
      remediationPlaybookId: 'ap-stat-pb-correlation-linearity-outliers',
      itemIds: [
        'ap-statistics-foundation-pilot-item-081',
        'ap-statistics-foundation-pilot-item-082',
        'ap-statistics-foundation-pilot-item-083',
        'ap-statistics-foundation-pilot-item-084',
        'ap-statistics-foundation-pilot-item-085',
        'ap-statistics-foundation-pilot-item-086',
        'ap-statistics-foundation-pilot-item-087',
        'ap-statistics-foundation-pilot-item-088',
        'ap-statistics-foundation-pilot-item-089',
        'ap-statistics-foundation-pilot-item-090',
        'ap-statistics-foundation-pilot-item-091',
        'ap-statistics-foundation-pilot-item-092',
      ],
    },
    {
      id: 'ap-stat-mf-independence-vs-mutually-exclusive',
      label: 'Independent Events vs. Mutually Exclusive Events Conflation',
      description:
        'Learners assume mutually exclusive (disjoint) events must be independent because they do not overlap, forgetting that when P(A and B) = 0 for nonzero-probability events, knowing A occurred forces P(B|A) = 0 ≠ P(B).',
      remediationMove:
        'Test both definitions quantitatively with two separate equations: mutually exclusive checks P(A and B) = 0; independence checks P(A|B) = P(A) or P(A and B) = P(A)·P(B).',
      remediationPlaybookId: 'ap-stat-pb-independence-vs-mutually-exclusive',
      itemIds: [
        'ap-statistics-foundation-pilot-item-021',
        'ap-statistics-foundation-pilot-item-022',
        'ap-statistics-foundation-pilot-item-023',
        'ap-statistics-foundation-pilot-item-024',
        'ap-statistics-foundation-pilot-item-025',
        'ap-statistics-foundation-pilot-item-026',
        'ap-statistics-foundation-pilot-item-027',
        'ap-statistics-foundation-pilot-item-028',
        'ap-statistics-foundation-pilot-item-029',
        'ap-statistics-foundation-pilot-item-030',
        'ap-statistics-foundation-pilot-item-031',
        'ap-statistics-foundation-pilot-item-032',
      ],
    },
    {
      id: 'ap-stat-mf-conditions-before-inference',
      label: 'Skipping Inference Conditions and z-vs-t Procedure Errors',
      description:
        'Learners apply a z-procedure for means when population σ is unknown, check Large Counts with sample p-hat instead of null p₀ in a 1-proportion z-test, or overlook the 10% condition and small-sample skewness/outlier checks.',
      remediationMove:
        'Complete the 3-gate inference preflight (Random, 10% Independence when sampling without replacement, and Normal/Large-Counts or CLT/no-strong-skew) and match z vs. t strictly to parameter type.',
      remediationPlaybookId: 'ap-stat-pb-conditions-before-inference',
      itemIds: [
        'ap-statistics-foundation-pilot-item-047',
        'ap-statistics-foundation-pilot-item-048',
        'ap-statistics-foundation-pilot-item-049',
        'ap-statistics-foundation-pilot-item-050',
        'ap-statistics-foundation-pilot-item-051',
        'ap-statistics-foundation-pilot-item-052',
        'ap-statistics-foundation-pilot-item-067',
        'ap-statistics-foundation-pilot-item-068',
        'ap-statistics-foundation-pilot-item-069',
        'ap-statistics-foundation-pilot-item-070',
        'ap-statistics-foundation-pilot-item-071',
        'ap-statistics-foundation-pilot-item-072',
      ],
    },
    {
      id: 'ap-stat-mf-type-error-and-power',
      label: 'Type I vs. Type II Error and Statistical Power Tradeoff Confusion',
      description:
        'Learners swap Type I (rejecting a true H₀) with Type II (failing to reject a false H₀) in context, claim failing to reject H₀ proves H₀ true, or mispredict how changing α, sample size n, or effect size shifts power (1 − β).',
      remediationMove:
        'State the truth of H₀ first, match the erroneous decision (Type I: H₀ true, wrongly rejected; Type II: H₀ false, missed), and verify the three power levers (larger α, larger n, larger true effect size → higher power).',
      remediationPlaybookId: 'ap-stat-pb-type-error-and-power',
      itemIds: [
        'ap-statistics-foundation-pilot-item-041',
        'ap-statistics-foundation-pilot-item-043',
        'ap-statistics-foundation-pilot-item-045',
        'ap-statistics-foundation-pilot-item-047',
        'ap-statistics-foundation-pilot-item-049',
        'ap-statistics-foundation-pilot-item-051',
        'ap-statistics-foundation-pilot-item-061',
        'ap-statistics-foundation-pilot-item-063',
        'ap-statistics-foundation-pilot-item-065',
        'ap-statistics-foundation-pilot-item-067',
        'ap-statistics-foundation-pilot-item-069',
        'ap-statistics-foundation-pilot-item-071',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ap-stat-pb-sampling-vs-random-assignment',
      familyId: 'ap-stat-mf-sampling-vs-random-assignment',
      familyLabel: 'Random Sampling vs. Random Assignment Scope of Inference',
      title: 'Locking Scope of Inference to Random Sampling vs. Random Assignment',
      recognitionCue:
        'You selected a causal conclusion for an observational survey or claimed results generalize to all U.S. adults from an experiment using only campus volunteers.',
      repairQuestion:
        'Did the researchers randomly select units from a target population (generalization), randomly assign treatments to units (causation), both, or neither?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Mark two binary flags on the missed data-collection stem: Random Sample (Yes/No) and Random Assignment of Treatments (Yes/No), then spot which flag your chosen answer violated.',
          requiredOutput:
            'Two binary design flags plus a one-line statement of the unsupported claim (generalization or causation).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Place the study inside the AP Stats 2×2 Scope of Inference table so that only the licensed conclusions remain available.',
          requiredOutput:
            'A filled 2×2 scope table naming the exact population (if random sampling) and whether causation is licensed (only if random assignment).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate two classic AP designs: a stratified random survey of 2,500 voters comparing coffee drinkers and sleep hours, and a randomized double-blind drug trial on 80 clinic volunteers.',
          requiredOutput:
            'Exact scope-of-inference verdicts showing the survey generalizes without proving causation, while the volunteer trial supports causation only for similar individuals.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Unit 1 collecting-data item and one blocking or matched-pairs experimental design item distinguishing confounding reduction from sampling bias.',
          requiredOutput:
            'Correct selections on both items with explicit confirmation of both random-selection and random-assignment flags.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-stat-pb-pvalue-confidence-level',
      familyId: 'ap-stat-mf-pvalue-confidence-level',
      familyLabel: 'p-Value and Confidence Level Misinterpretation',
      title: 'Phrasing p-Values and Confidence Intervals with Repeated-Sampling Precision',
      recognitionCue:
        'You chose a distractor saying "there is a 3% probability that H₀ is true" or "95% of all students in the school have scores inside this interval".',
      repairQuestion:
        'In repeated random sampling, what is actually varying from sample to sample (the statistic and interval endpoints) versus what stays fixed (the true population parameter and truth of H₀)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Highlight the fatal phrase in your missed choice: either assigning a probability to H₀/Ha directly, assigning 95% probability to one static interval, or substituting individual observations for the population parameter.',
          requiredOutput:
            'An error callout quoting the invalid phrase and explaining why the fixed parameter does not move once the interval is computed.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Rewrite the interpretation using AP rubric templates: p-value = "Assuming H₀ is true, the probability of obtaining a sample statistic this extreme or more extreme by chance alone is p"; confidence level = "In repeated samples of size n, about C% of resulting intervals will capture the true parameter".',
          requiredOutput:
            'Context-filled AP rubric sentences for both the p-value and the confidence level in the scenario.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Edit two flawed student FRQ statements: one claiming a 90% CI for μ means 90% of individual battery lifetimes lie between 11.2 and 12.8 hours, and one claiming p = 0.018 means there is a 98.2% chance Ha is true.',
          requiredOutput:
            'Two repaired AP-scoring interpretations referencing the true population mean μ and conditional probability assuming H₀ true.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed inference item and one two-sided confidence-interval-to-hypothesis-test duality item checking whether the null value falls inside the (1 − α) interval.',
          requiredOutput:
            'Verified correct answers on both items showing exact alignment between CI capture and two-sided test rejection at α.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-stat-pb-correlation-linearity-outliers',
      familyId: 'ap-stat-mf-correlation-linearity-outliers',
      familyLabel: 'Correlation, Nonlinearity, Extrapolation, and Influential Outliers',
      title: 'Inspecting Residual Plots, Extrapolation Bounds, and Influential Leverage',
      recognitionCue:
        'You endorsed a linear model solely because r = 0.94 despite a curved U-shaped residual plot, or assumed every outlier with a large residual strongly rotates the LSRL slope.',
      repairQuestion:
        'What does the residual plot look like, is the requested x-value inside the observed domain, and is the unusual point extreme in x (high leverage) or only extreme in y (vertical outlier)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Audit the missed regression item across three checks: residual-plot pattern (random scatter vs. curve/fan), x-domain bounds (interpolation vs. extrapolation), and point location (x-leverage vs. y-residual).',
          requiredOutput:
            'A three-point audit identifying which regression safeguard the chosen distractor skipped.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Compute a residual explicitly as observed y − predicted ŷ (never predicted − observed) and contrast how a high-leverage point far in x pulls the LSRL slope toward itself versus how a mid-x outlier mainly inflates s and weakens r.',
          requiredOutput:
            'Correct sign check for residual = y − ŷ plus a 2-case summary of slope, y-intercept, r, and s shifts for leverage vs. mid-x outliers.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Interpret standard regression computer output (Coef, SE Coef, s, R-sq) for a dataset with a curved residual plot and a point far to the right of x-bar.',
          requiredOutput:
            'Written slope and s interpretations in context, plus an explanation of why a curved residual plot invalidates linear prediction despite high R².',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed regression item and solve a transfer item on transforming nonlinear power/exponential data via log(y) vs. x to achieve a random residual plot.',
          requiredOutput:
            'Correct choices on both items with explicit reference to residual-plot randomness and x-domain boundaries.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-stat-pb-independence-vs-mutually-exclusive',
      familyId: 'ap-stat-mf-independence-vs-mutually-exclusive',
      familyLabel: 'Independent Events vs. Mutually Exclusive Events Conflation',
      title: 'Separating Disjoint (Mutually Exclusive) from Statistically Independent Events',
      recognitionCue:
        'You claimed two events were independent because their Venn circles did not overlap, or added P(A) + P(B) without subtracting P(A and B) when the events overlapped.',
      repairQuestion:
        'If event A occurs, does the probability of event B stay unchanged (independent: P(B|A) = P(B)), or drop immediately to zero (mutually exclusive: P(A and B) = 0)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Write out P(A), P(B), and P(A and B) from the missed probability item or two-way table and spot where P(A and B) = 0 was mistakenly treated as evidence of independence.',
          requiredOutput:
            'A numerical check comparing P(A and B) against 0 and against the product P(A)·P(B).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Verify the fundamental AP Probability theorem: if P(A) and P(B) are both positive and A, B are mutually exclusive, then P(A and B) = 0 ≠ P(A)·P(B), so they CANNOT be independent.',
          requiredOutput:
            'A side-by-side formula card contrasting Disjoint (P(A and B) = 0; P(A or B) = P(A) + P(B)) against Independent (P(A and B) = P(A)·P(B); P(A|B) = P(A)).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Use a 2×2 contingency table of student grade level and bus ridership to compute P(Bus), P(Bus | Senior), and P(Bus and Senior), determining both whether the events are mutually exclusive and whether they are independent.',
          requiredOutput:
            'Exact fractional/decimal calculations showing the two separate verdicts (not mutually exclusive because intersection is nonzero; independent only if P(Bus | Senior) equals P(Bus)).',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 2 probability item and complete a binomial/geometric independence check explaining why sampling without replacement requires the 10% condition for approximate independence.',
          requiredOutput:
            'Correct solutions on both items with explicit numerical verification of the intersection and conditional probabilities.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-stat-pb-conditions-before-inference',
      familyId: 'ap-stat-mf-conditions-before-inference',
      familyLabel: 'Skipping Inference Conditions and z-vs-t Procedure Errors',
      title: 'Running the Three-Gate Inference Preflight and z-vs-t Selector',
      recognitionCue:
        'You chose a 1-sample z-interval for a mean when only sample standard deviation s was given, used p-hat instead of p₀ to verify Large Counts for a z-test, or missed a small-sample outlier blocking a t-procedure.',
      repairQuestion:
        'Are we inferring a proportion (z) or a mean with unknown σ (t), and do Random, 10% Independence, and Normality/Large Counts all pass using the right quantities?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the missed inference item and identify which preflight condition failed or which test family (1-prop z, 2-prop z, 1-sample t, paired t, 2-sample t) was misselected.',
          requiredOutput:
            'A specific tag naming the failed condition or incorrect z/t/paired procedure choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Complete the AP Inference Preflight checklist: (1) Random sample or random assignment; (2) n ≤ 10% of N when sampling without replacement; (3) Large Counts (n·p₀ and n·(1 − p₀) at least 10 for 1-prop test; n·p-hat and n·(1 − p-hat) at least 10 for CI) OR for means (population normal, n at least 30 via CLT, or sample graph has no strong skew/outliers).',
          requiredOutput:
            'A fully checked 3-gate table with explicit numerical substitution and the exact named inference procedure (including df for t).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Distinguish two tricky AP pairings: before-and-after heart rates measured on the same 18 runners (paired 1-sample t on differences, checking dotplot of differences) versus two independent groups of 18 runners (2-sample t, checking both group dotplots).',
          requiredOutput:
            'Correct procedure names, degrees-of-freedom rules, and graph-condition checks for both scenarios.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed proportion or mean inference item and solve one fresh condition-violation item asking why the standard error formula or normal approximation breaks down.',
          requiredOutput:
            'Verified correct answers on both items naming the exact violated condition and its consequence on the sampling distribution.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-stat-pb-type-error-and-power',
      familyId: 'ap-stat-mf-type-error-and-power',
      familyLabel: 'Type I vs. Type II Error and Statistical Power Tradeoff Confusion',
      title: 'Mapping Error Consequences in Context and Controlling Statistical Power',
      recognitionCue:
        'You described a Type II error as rejecting a true null, treated "fail to reject H₀" as proving H₀ true, or claimed decreasing α from 0.05 to 0.01 increases statistical power.',
      repairQuestion:
        'In this scenario, what real-world mistake happens if we falsely sound the alarm (Type I, α) versus fail to detect a real effect (Type II, β), and how does changing n or α shift power = 1 − β?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Write down H₀ and Ha in plain context from the missed item, then identify whether your chosen answer reversed the true state of nature (H₀ true vs. H₀ false) or flipped the direction of power.',
          requiredOutput:
            'Context statements of H₀ and Ha plus a one-line diagnosis of the Type I/II or power-lever reversal.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build the 2×2 Decision-vs-Truth table labeling Type I error (probability α), Type II error (probability β), and Power (1 − β = probability of correctly rejecting a specific false H₀), noting the only way to shrink both α and β simultaneously is increasing sample size n.',
          requiredOutput:
            'A context-specific 2×2 table describing the concrete practical consequence of each error and the three factors that increase power.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Analyze a pharmaceutical safety test (H₀: drug has no harmful side effect; Ha: drug increases risk) by contrasting the human consequence of Type I vs. Type II errors and explaining how raising n from 40 to 160 changes standard error and power.',
          requiredOutput:
            'Clear contextual descriptions of both errors plus an explanation of why halving the standard error increases power without raising α.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the original hypothesis-testing error item and one fresh power-tradeoff item without ever writing "accept H₀" or "prove H₀ true".',
          requiredOutput:
            'Correct selections on both items accompanied by precise AP decision language ("convincing evidence for Ha" vs. "lack of convincing evidence").',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const ap_us_government_foundation_pilot = {
  misconceptionFamilies: [
    {
      id: 'ap-usg-mf-federalism-enumerated-reserved',
      label: 'Federalism: Enumerated, Implied, Concurrent, and Reserved Powers Mix-Up',
      description:
        'Learners confuse vertical federalism (national vs. state authority under the Supremacy, Commerce, Necessary and Proper, and Tenth Amendment clauses) with horizontal branch checks, or swap categorical grants, block grants, and unfunded mandates.',
      remediationMove:
        'Ask first whether the dispute is vertical (federal vs. state) or horizontal (branch vs. branch), then anchor national-state leverage to the exact constitutional clause or fiscal grant instrument.',
      remediationPlaybookId: 'ap-usg-pb-federalism-enumerated-reserved',
      itemIds: [
        'ap-usg-u1-001',
        'ap-usg-u1-002',
        'ap-usg-u1-003',
        'ap-usg-u1-004',
        'ap-usg-u1-005',
        'ap-usg-u1-006',
        'ap-usg-u1-007',
        'ap-usg-u1-008',
        'ap-usg-u1-009',
        'ap-usg-u1-010',
        'ap-usg-u1-011',
        'ap-usg-u1-012',
      ],
    },
    {
      id: 'ap-usg-mf-separation-vs-checks',
      label: 'Separation of Powers vs. Checks and Balances and Chamber Roles',
      description:
        'Learners blur each branch’s distinct constitutional authority with inter-branch constraints, or invert House-only powers (revenue origination, impeachment charges) and Senate-only powers (treaty ratification, advice-and-consent confirmation, filibuster/cloture).',
      remediationMove:
        'Map the action to its constitutional actor first (House, Senate, President, Courts, or Bureaucracy), then verify whether the prompt asks for an exclusive branch duty or a check exercised by another branch.',
      remediationPlaybookId: 'ap-usg-pb-separation-vs-checks',
      itemIds: [
        'ap-usg-u2-019',
        'ap-usg-u2-020',
        'ap-usg-u2-021',
        'ap-usg-u2-022',
        'ap-usg-u2-023',
        'ap-usg-u2-024',
        'ap-usg-u2-025',
        'ap-usg-u2-026',
        'ap-usg-u2-027',
        'ap-usg-u2-028',
        'ap-usg-u2-029',
        'ap-usg-u2-030',
      ],
    },
    {
      id: 'ap-usg-mf-liberties-incorporation-vs-rights',
      label: 'Civil Liberties, Selective Incorporation, vs. Civil Rights Conflation',
      description:
        'Learners confuse civil liberties (Bill of Rights shields against government intrusion, extended to states via the Fourteenth Amendment Due Process Clause) with civil rights (equal treatment under the Fourteenth Amendment Equal Protection Clause and statutory acts).',
      remediationMove:
        'Separate the constitutional shield: government restricting speech, press, religion, or defendant protections → Civil Liberties (Bill of Rights + 14th Due Process); government or institutions treating groups unequally → Civil Rights (14th Equal Protection + statutes).',
      remediationPlaybookId: 'ap-usg-pb-liberties-incorporation-vs-rights',
      itemIds: [
        'ap-usg-u3-049',
        'ap-usg-u3-050',
        'ap-usg-u3-051',
        'ap-usg-u3-052',
        'ap-usg-u3-053',
        'ap-usg-u3-054',
        'ap-usg-u3-055',
        'ap-usg-u3-056',
        'ap-usg-u3-057',
        'ap-usg-u3-058',
        'ap-usg-u3-059',
        'ap-usg-u3-060',
      ],
    },
    {
      id: 'ap-usg-mf-scotus-holding-overgeneralization',
      label: 'Required SCOTUS Case Holding and Constitutional Clause Overgeneralization',
      description:
        'Learners attach a required Supreme Court precedent to the wrong constitutional clause (such as citing the Second Amendment in U.S. v. Lopez instead of the Commerce Clause) or stretch a bounded holding into an absolute ban or unrestricted right.',
      remediationMove:
        'Lock every required SCOTUS case into a strict 3-part anchor: Case Name → Exact Constitutional Clause → Narrow Majority Holding and Limit.',
      remediationPlaybookId: 'ap-usg-pb-scotus-holding-overgeneralization',
      itemIds: [
        'ap-usg-u1-001',
        'ap-usg-u1-002',
        'ap-usg-u1-003',
        'ap-usg-u1-004',
        'ap-usg-u1-005',
        'ap-usg-u1-006',
        'ap-usg-u3-049',
        'ap-usg-u3-050',
        'ap-usg-u3-051',
        'ap-usg-u3-052',
        'ap-usg-u3-053',
        'ap-usg-u3-054',
      ],
    },
    {
      id: 'ap-usg-mf-linkage-electoral-college',
      label: 'Linkage Institutions, Campaign Finance, and Electoral College Rules',
      description:
        'Learners confuse traditional PAC contribution limits with Super PAC independent-expenditure rules, mix up primary types with general elections, or assume national popular-vote leads guarantee Electoral College victory under winner-take-all state rules.',
      remediationMove:
        'Verify the exact institutional rule before answering: PAC (limited direct donations) vs. Super PAC (unlimited uncoordinated spending), primary voter eligibility rules, and state-by-state winner-take-all electoral math (270 threshold).',
      remediationPlaybookId: 'ap-usg-pb-linkage-electoral-college',
      itemIds: [
        'ap-usg-u5-076',
        'ap-usg-u5-077',
        'ap-usg-u5-078',
        'ap-usg-u5-079',
        'ap-usg-u5-080',
        'ap-usg-u5-081',
        'ap-usg-u5-082',
        'ap-usg-u5-083',
        'ap-usg-u5-084',
        'ap-usg-u5-085',
        'ap-usg-u5-086',
        'ap-usg-u5-087',
      ],
    },
    {
      id: 'ap-usg-mf-polling-margin-of-error-data',
      label: 'Public Opinion Polling, Margin of Error, and Data-Stimulus Overclaiming',
      description:
        'Learners declare a statistically clear leader when two candidates’ polling intervals overlap within ± margin of error, overlook biased wording or unrepresentative sampling frames, or claim ideology shifts not supported by the chart’s actual subgroup breakdown.',
      remediationMove:
        'Compute the ± margin-of-error band around every cited poll percentage, inspect sample methodology for selection/wording bias, and confirm that the chart actually reports the claimed subgroup or causal trend.',
      remediationPlaybookId: 'ap-usg-pb-polling-margin-of-error-data',
      itemIds: [
        'ap-usg-u4-064',
        'ap-usg-u4-065',
        'ap-usg-u4-066',
        'ap-usg-u4-067',
        'ap-usg-u4-068',
        'ap-usg-u4-069',
        'ap-usg-u4-070',
        'ap-usg-u4-071',
        'ap-usg-u4-072',
        'ap-usg-u4-073',
        'ap-usg-u4-074',
        'ap-usg-u4-075',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ap-usg-pb-federalism-enumerated-reserved',
      familyId: 'ap-usg-mf-federalism-enumerated-reserved',
      familyLabel: 'Federalism: Enumerated, Implied, Concurrent, and Reserved Powers Mix-Up',
      title: 'Mapping Vertical Federalism Clauses and Fiscal Grant Leverage',
      recognitionCue:
        'You labeled a state-vs-federal clash as "checks and balances", or confused strings-attached categorical grants with broader discretionary block grants.',
      repairQuestion:
        'Is power shifting vertically between Washington and the states, and which exact constitutional clause or fiscal tool (categorical grant, block grant, or mandate) is shifting that balance?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the missed Unit 1 item to classify the power conflict as vertical (federal ↔ state) or horizontal (legislative ↔ executive ↔ judicial) and spot the exact power category you mislabeled.',
          requiredOutput:
            'A one-line axis check (vertical vs. horizontal) plus the confused constitutional power or grant type.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Sort key AP federalism anchors into two opposing columns: Nationalizing tools (Supremacy Clause, Necessary and Proper, Commerce Clause, categorical grants with conditions, McCulloch v. Maryland) versus State-empowering tools (Tenth Amendment, block grants, devolution, U.S. v. Lopez).',
          requiredOutput:
            'A completed two-column federalism balance sheet connecting each constitutional clause to its landmark case or fiscal instrument.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Contrast two federal policy scenarios: Congress withholding highway funds unless states enforce a specific safety rule (categorical grant condition) versus Congress giving states broad lump-sum welfare funds with flexible spending rules (block grant).',
          requiredOutput:
            'Two concise classifications explaining how each instrument shifts policy discretion toward either Congress or state legislatures.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Unit 1 federalism item and solve one foundational-document comparison linking Brutus No. 1 fears of the Necessary and Proper Clause against Federalist No. 51 double security.',
          requiredOutput:
            'Verified correct choices on both items tied directly to the vertical power clause in the prompt.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-usg-pb-separation-vs-checks',
      familyId: 'ap-usg-mf-separation-vs-checks',
      familyLabel: 'Separation of Powers vs. Checks and Balances and Chamber Roles',
      title: 'Tracking Branch Powers, Checks, and House vs. Senate Procedures',
      recognitionCue:
        'You assigned treaty ratification or judicial confirmation to the House, or confused an exclusive legislative duty with an inter-branch check.',
      repairQuestion:
        'Which specific chamber or branch holds this constitutional tool, and which other branch’s action is being constrained by it?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Underline the acting institution and the target institution in the missed Unit 2 stem, noting where House/Senate rules or branch powers were swapped.',
          requiredOutput:
            'An actor-to-target check identifying the misplaced chamber power or branch check.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a House-vs-Senate and Inter-Branch Checks reference grid covering revenue bills, Rules Committee/discharge petition, filibuster/60-vote cloture, impeachment vs. removal trial, confirmation, veto override (2/3 both chambers), and bureaucratic oversight/power of the purse.',
          requiredOutput:
            'A clean chamber-and-checks table linking each formal constitutional check to the exact vote threshold or committee tool.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Trace two realistic AP Gov scenarios: a President issuing an executive order after Congress stalls (informal executive action checked by judicial review or statutory reversal) and a Senator placing a hold on a cabinet nominee (Senate advice-and-consent leverage).',
          requiredOutput:
            'Two accurate actor-check chains identifying both the initial action and the constitutional counter-check.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 2 item and one iron-triangle / bureaucratic-discretion item showing how congressional committees check executive agencies via oversight hearings and appropriations.',
          requiredOutput:
            'Correct selections on both items with explicit naming of the acting branch, target branch, and constitutional check.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-usg-pb-liberties-incorporation-vs-rights',
      familyId: 'ap-usg-mf-liberties-incorporation-vs-rights',
      familyLabel: 'Civil Liberties, Selective Incorporation, vs. Civil Rights Conflation',
      title: 'Distinguishing Bill of Rights Incorporation from Equal Protection Civil Rights',
      recognitionCue:
        'You cited the Equal Protection Clause for a state free-speech or gun-rights incorporation case, or cited the Due Process Clause for a school-desegregation or racial-gerrymandering claim.',
      repairQuestion:
        'Is the claimant asking the government to stop infringing a Bill of Rights freedom (Civil Liberty + 14th Due Process incorporation) or demanding equal treatment as a group (Civil Rights + 14th Equal Protection)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Classify the grievance in the missed Unit 3 item as either "government restriction on individual liberty" or "unequal group treatment", flagging the mismatched Fourteenth Amendment clause.',
          requiredOutput:
            'A concise diagnosis naming the grievance type and the clause reversal (Due Process vs. Equal Protection).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Construct a two-track Unit 3 map: Track A (Civil Liberties + Selective Incorporation via 14th Due Process: Engel, Wisconsin v. Yoder, Tinker, Schenck, Gideon, McDonald, and New York Times Co. v. United States) vs. Track B (Civil Rights via 14th Equal Protection + Acts: Brown v. Board, Letter from Birmingham Jail, Civil Rights Act of 1964, Voting Rights Act of 1965, and Title IX).',
          requiredOutput:
            'A completed two-track anchor chart separating Due Process incorporation precedents from Equal Protection civil-rights precedents.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Match two contrasting state-level disputes to their exact constitutional pathway: a state court denying an indigent felony defendant a lawyer (6th Amendment incorporated via 14th Due Process, Gideon) versus a state drawing congressional districts predominantly by race (14th Equal Protection, Shaw v. Reno).',
          requiredOutput:
            'Two verified constitutional-clause matches explaining why each pathway governs the specific claim.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Unit 3 item and one fresh First Amendment balancing item contrasting Establishment Clause limits (Engel) against Free Exercise protections (Yoder).',
          requiredOutput:
            'Correct choices on both items with explicit identification of the governing amendment and Fourteenth Amendment clause.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-usg-pb-scotus-holding-overgeneralization',
      familyId: 'ap-usg-mf-scotus-holding-overgeneralization',
      familyLabel: 'Required SCOTUS Case Holding and Constitutional Clause Overgeneralization',
      title: 'Anchoring Required SCOTUS Precedents to Their Exact Clause and Scope',
      recognitionCue:
        'You picked a distractor saying Tinker protects ALL student speech without limit, or claimed U.S. v. Lopez struck down the Gun-Free School Zones Act under the Second Amendment.',
      repairQuestion:
        'Which exact constitutional clause decided this required SCOTUS case, and what boundary or balancing test limits the holding?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Spot the overgeneralization or wrong-clause trap in your missed answer (such as absolutist words like "always", "never", "all speech", or a plausible-sounding but incorrect amendment).',
          requiredOutput:
            'A brief callout naming the required case, the trap clause or overbroad claim, and the true deciding clause.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Write a 3-slot precedent card for the target case and its closest confusable twin: Clause → Holding → Limiting Condition (for example, Tinker protects symbolic student speech UNLESS it causes material and substantial disruption; New York Times Co. v. United States sets a heavy presumption against prior restraint unless direct, immediate national-security harm is proved).',
          requiredOutput:
            'Two paired precedent cards displaying exact constitutional clause, core holding, and explicit limiting boundary.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Complete two AP SCOTUS Comparison drills: match a non-required federal-regulation case to McCulloch vs. Lopez using the Commerce Clause boundary, and match a non-required campaign-spending case to Citizens United using First Amendment political speech.',
          requiredOutput:
            'Two structured SCOTUS comparisons stating the shared constitutional principle and the exact factual analogy.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed SCOTUS item and a fresh precedent-application item while disqualifying every choice that cites the wrong clause or omits the Court’s limiting standard.',
          requiredOutput:
            'Verified correct answers on both items citing the exact clause and bounded legal standard.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-usg-pb-linkage-electoral-college',
      familyId: 'ap-usg-mf-linkage-electoral-college',
      familyLabel: 'Linkage Institutions, Campaign Finance, and Electoral College Rules',
      title: 'Separating Campaign-Finance Rules, Primaries, and Winner-Take-All Math',
      recognitionCue:
        'You chose an answer claiming Super PACs can donate unlimited funds directly to a candidate’s campaign, or predicted candidates prioritize high-population safe states over competitive swing states.',
      repairQuestion:
        'Does this rule permit direct candidate coordination/contributions (PAC) or unlimited independent spending only (Super PAC), and how does state winner-take-all Electoral College allocation shape campaign strategy?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Identify the exact institutional rule misrepresented in your missed Unit 5 item: PAC vs. Super PAC financing, open vs. closed primaries, single-member district plurality (Duverger law), or Electoral College allocation.',
          requiredOutput:
            'A one-sentence rule check pinpointing the exact electoral or campaign-finance confusion.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a 3-row institutional rule card contrasting: (1) PACs (capped direct contributions, coordinated) vs. Super PACs (unlimited independent expenditures, no direct coordination); (2) Closed vs. Open primaries; (3) Winner-take-all Electoral College incentives (focus on battleground states, 270 to win).',
          requiredOutput:
            'A verified rule table highlighting the exact legal boundary and strategic consequence of each mechanism.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Analyze two Unit 5 scenarios: why a third party winning 15% nationally earns zero House seats and zero electoral votes, and why an interest group forms a Super PAC after Citizens United rather than expanding a traditional PAC.',
          requiredOutput:
            'Two precise explanations referencing single-member winner-take-all districts and unlimited independent-expenditure protections.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Unit 5 item and solve one media/voter-turnout transfer item connecting linkage-institution incentives (horse-race journalism, rational-choice/retrospective voting) to observed behavior.',
          requiredOutput:
            'Correct choices on both items supported by exact institutional-rule citations.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'ap-usg-pb-polling-margin-of-error-data',
      familyId: 'ap-usg-mf-polling-margin-of-error-data',
      familyLabel: 'Public Opinion Polling, Margin of Error, and Data-Stimulus Overclaiming',
      title: 'Checking Margins of Error, Sampling Bias, and Subgroup Evidence in Polls',
      recognitionCue:
        'You claimed Candidate A is clearly ahead at 48% vs. 45% in a poll with a ±3.5% margin of error, or accepted a conclusion about voter motives that the chart never measured.',
      repairQuestion:
        'Once you add and subtract the sampling margin of error for each figure, do the intervals overlap, and does the polling methodology avoid selection or question-wording bias?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Calculate the low-to-high interval (estimate − MOE to estimate + MOE) for the numbers in the missed Unit 4 chart or poll and flag any choice that overclaims precision or invents unmeasured causes.',
          requiredOutput:
            'Explicit interval bounds for the compared poll numbers plus the exact overclaim identified in the distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the 4-check Scientific Poll Audit: (1) Random representative sampling (not opt-in online convenience poll); (2) Neutral question wording; (3) Clear ± margin of error comparison (overlapping intervals = statistical tie); (4) Distinguish percent share from raw turnout count.',
          requiredOutput:
            'A completed 4-check audit for the stimulus poll explaining what the data can and cannot legitimately prove.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Inspect two Unit 4 data prompts: a poll showing 51% support vs. 47% oppose with ±3% MOE (statistical tie, since 48%–54% overlaps 44%–50%) and a party-ideology trend chart comparing fiscal vs. social policy preferences across age cohorts.',
          requiredOutput:
            'Interval-overlap proof for the first prompt and an evidence-bounded trend statement tied strictly to the plotted cohorts for the second.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Unit 4 polling/data item and one political-socialization transfer item matching generational/lifecycle effects accurately to the displayed survey evidence.',
          requiredOutput:
            'Verified correct answers on both items anchored explicitly to non-overlapping intervals and measured variables.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const ap_us_history_foundation_pilot = {
  misconceptionFamilies: [
    {
      id: 'apush-mf-anachronism-periodization-drift',
      label: 'Anachronism and Periodization Boundary Drift',
      description:
        'Learners choose an historically true statement that belongs to an earlier or later APUSH time period than the prompt specifies (such as applying Progressive or New Deal reforms to Gilded Age Period 6 or antebellum debates to Period 2).',
      remediationMove:
        'Bracket the prompt’s exact start and end years first, verify the date of every event named in each choice, and eliminate any chronologically out-of-bounds option immediately regardless of how familiar it sounds.',
      remediationPlaybookId: 'apush-pb-anachronism-periodization-drift',
      itemIds: [
        'apush-foundation-011',
        'apush-foundation-012',
        'apush-foundation-013',
        'apush-foundation-014',
        'apush-foundation-015',
        'apush-foundation-016',
        'apush-foundation-035',
        'apush-foundation-036',
        'apush-foundation-037',
        'apush-foundation-038',
        'apush-foundation-039',
        'apush-foundation-040',
      ],
    },
    {
      id: 'apush-mf-causation-vs-chronology',
      label: 'Causation vs. Mere Chronology (Post Hoc Reasoning)',
      description:
        'Learners assume an earlier event caused a later development simply because it happened beforehand, or reverse immediate triggers, underlying structural causes, and downstream historical effects.',
      remediationMove:
        'Draw a directional timeline marking structural preconditions → immediate catalyst → target event → downstream consequences, and check which side of the arrow the question stem actually asks for.',
      remediationPlaybookId: 'apush-pb-causation-vs-chronology',
      itemIds: [
        'apush-foundation-023',
        'apush-foundation-024',
        'apush-foundation-025',
        'apush-foundation-026',
        'apush-foundation-027',
        'apush-foundation-028',
        'apush-foundation-041',
        'apush-foundation-042',
        'apush-foundation-043',
        'apush-foundation-044',
        'apush-foundation-045',
        'apush-foundation-090',
      ],
    },
    {
      id: 'apush-mf-hipp-summary-vs-analysis',
      label: 'Primary-Source HIPP Summary vs. Sourcing Analysis',
      description:
        'Learners merely paraphrase what an excerpt says at face value instead of analyzing how Historical Situation, Intended Audience, Purpose, or Point of View shapes the speaker’s argument, bias, or strategic omissions.',
      remediationMove:
        'Read the attribution line first (author, date, venue, role) and ask why THIS speaker made THIS specific claim to THIS audience in THIS exact year before examining the answer choices.',
      remediationPlaybookId: 'apush-pb-hipp-summary-vs-analysis',
      itemIds: [
        'apush-foundation-017',
        'apush-foundation-018',
        'apush-foundation-019',
        'apush-foundation-020',
        'apush-foundation-021',
        'apush-foundation-022',
        'apush-foundation-029',
        'apush-foundation-030',
        'apush-foundation-031',
        'apush-foundation-032',
        'apush-foundation-033',
        'apush-foundation-034',
      ],
    },
    {
      id: 'apush-mf-regional-labor-conflation',
      label: 'Regional and Labor-System Conflation',
      description:
        'Learners collapse distinct colonial, antebellum, or industrial regions and labor regimes—confusing Spanish encomienda, French fur-trade alliances, Chesapeake tobacco servitude/chattel slavery, New England mixed family farms, and Northern wage factories.',
      remediationMove:
        'Tag both the geographic region and its dominant economic/labor structure before evaluating choices, confirming whether the prompt asks for a regional similarity or a sharp regional contrast.',
      remediationPlaybookId: 'apush-pb-regional-labor-conflation',
      itemIds: [
        'apush-foundation-001',
        'apush-foundation-002',
        'apush-foundation-003',
        'apush-foundation-004',
        'apush-foundation-005',
        'apush-foundation-051',
        'apush-foundation-006',
        'apush-foundation-007',
        'apush-foundation-008',
        'apush-foundation-009',
        'apush-foundation-010',
        'apush-foundation-057',
      ],
    },
    {
      id: 'apush-mf-ccot-balance',
      label: 'Continuity vs. Change Over Time (CCOT) One-Sidedness',
      description:
        'Learners treat major turning points (such as Reconstruction, Industrialization, the New Deal, or the 1980s Conservative Resurgence) as total rupture or total stasis, missing the enduring structures that persisted alongside change.',
      remediationMove:
        'Force a balanced CCOT ledger on every turning-point prompt: name one concrete institutional or social transformation AND one persistent structural continuity across the date span.',
      remediationPlaybookId: 'apush-pb-ccot-balance',
      itemIds: [
        'apush-foundation-080',
        'apush-foundation-081',
        'apush-foundation-082',
        'apush-foundation-083',
        'apush-foundation-084',
        'apush-foundation-108',
        'apush-foundation-046',
        'apush-foundation-047',
        'apush-foundation-048',
        'apush-foundation-049',
        'apush-foundation-050',
        'apush-foundation-096',
      ],
    },
    {
      id: 'apush-mf-evidence-thesis-alignment',
      label: 'Evidence-to-Thesis Alignment and Stimulus Overreach',
      description:
        'Learners choose factually true statements or absolute claims ("completely ended", "universally accepted") that fail to match the stimulus author’s specific argument or the prompt’s targeted historical reasoning skill.',
      remediationMove:
        'Underline the exact task verb (corroborate, refute, directly resulted from, best reflects the excerpt’s viewpoint) and reject any option whose scope is broader, more extreme, or off-axis from the stimulus claim.',
      remediationPlaybookId: 'apush-pb-evidence-thesis-alignment',
      itemIds: [
        'apush-foundation-063',
        'apush-foundation-064',
        'apush-foundation-065',
        'apush-foundation-066',
        'apush-foundation-067',
        'apush-foundation-068',
        'apush-foundation-091',
        'apush-foundation-092',
        'apush-foundation-093',
        'apush-foundation-094',
        'apush-foundation-095',
        'apush-foundation-116',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'apush-pb-anachronism-periodization-drift',
      familyId: 'apush-mf-anachronism-periodization-drift',
      familyLabel: 'Anachronism and Periodization Boundary Drift',
      title: 'Enforcing Strict Date Windows and APUSH Periodization Anchors',
      recognitionCue:
        'You selected an historically accurate U.S. event or policy that actually occurred decades before or after the date bracket printed in the prompt or source attribution.',
      repairQuestion:
        'What exact APUSH period and start/end years bound this question, and which date belongs to each policy, movement, or court ruling named in the choices?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Write the stimulus date and prompt date window at the top of your notes, then attach an approximate year or APUSH period (Periods 1–9) to every choice in the missed item.',
          requiredOutput:
            'A date-tagged list of all four choices highlighting the exact chronological boundary crossed by your original selection.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Anchor the era’s boundary turning points (including 1754 French & Indian War, 1800 Jeffersonian transition, 1848 Mexican Cession, 1877 End of Reconstruction, 1898 Spanish-American War, 1945 Postwar/Cold War, and 1980 Reagan election) to separate adjacent look-alike eras.',
          requiredOutput:
            'A boundary-anchor strip separating the prompt’s period from the immediately preceding and following periods.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Sort six frequently confused reforms and policies into their exact periods: Stamp Act protests (P3), Seneca Falls (P4), Interstate Commerce Act (P6), Meat Inspection Act (P7), Great Society Medicare (P8), and Welfare Reform 1996 (P9).',
          requiredOutput:
            'All six items placed cleanly in their exact APUSH periods with one distinguishing era marker for each.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed APUSH item and solve a fresh cross-period stimulus question by eliminating every out-of-window distractor before comparing the surviving in-period choices.',
          requiredOutput:
            'Verified correct answers on both items accompanied by explicit date-window verification notes.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'apush-pb-causation-vs-chronology',
      familyId: 'apush-mf-causation-vs-chronology',
      familyLabel: 'Causation vs. Mere Chronology (Post Hoc Reasoning)',
      title: 'Separating Causal Mechanisms from Earlier Events and Downstream Effects',
      recognitionCue:
        'You picked an effect when the prompt asked for a cause, or chose a chronologically earlier event that had no direct causal mechanism linking it to the historical outcome.',
      repairQuestion:
        'Is the stem asking what led INTO the target event (cause) or what flowed OUT of it (effect), and what concrete mechanism connects the two developments?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Box the causal direction phrase in the missed stem ("most directly led to", "contributed to the rise of", "was a direct consequence of") and check whether your chosen option sat on the wrong side of the event arrow.',
          requiredOutput:
            'A directional arrow diagram showing what the prompt asked for versus where your distractor actually sits in time.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Map the historical episode into a 3-column causation chain: Long-Term Structural Conditions → Immediate Catalyst → Direct Outcome, verifying an explicit "because/therefore" link at every arrow.',
          requiredOutput:
            'A completed 3-column causation chain with a one-sentence mechanism proving the link is causal rather than coincidental chronology.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Contrast causes and effects for two high-frequency APUSH pivots: the Mexican-American War (cause: Texas annexation & expansionism → effect: Wilmot Proviso & renewed sectional crisis over slavery in territories) and the Gulf of Tonkin Resolution (cause: Cold War containment → effect: escalated executive military commitment & later War Powers Act).',
          requiredOutput:
            'Two verified cause → event → effect chains clearly distinguishing preconditions from consequences.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed causation item and complete one new Period 5 or Period 8 causation item by checking arrow direction before selecting.',
          requiredOutput:
            'Correct choices on both items paired with a concise "because → therefore" causal verification sentence.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'apush-pb-hipp-summary-vs-analysis',
      familyId: 'apush-mf-hipp-summary-vs-analysis',
      familyLabel: 'Primary-Source HIPP Summary vs. Sourcing Analysis',
      title: 'Moving from Excerpt Paraphrase to Purposeful HIPP Sourcing',
      recognitionCue:
        'You treated a partisan speech, corporate defense, or reform pamphlet as an objective textbook summary rather than analyzing how the author’s position and audience shaped the claim.',
      repairQuestion:
        'Who wrote this document, in what immediate historical crisis, for which specific audience, and what action or belief were they trying to persuade that audience to adopt?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Read the attribution line of the missed stimulus first (name, occupation/role, publication type, and year) and note which sourcing clue (H, I, P, or P) your face-value reading overlooked.',
          requiredOutput:
            'An attribution breakdown flagging the exact author role, audience, and historical tension missed in the first attempt.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Complete a rapid HIPP matrix for the excerpt—Historical Situation, Intended Audience, Purpose, Point of View—and connect at least one element directly to WHY the author framed or omitted specific evidence.',
          requiredOutput:
            'A 4-row HIPP analysis ending with a sourcing sentence ("Because the author was X addressing Y during Z, the excerpt emphasizes a specific claim").',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Contrast two paired primary perspectives from the same era: Andrew Carnegie’s "Gospel of Wealth" (industrialist defending laissez-faire philanthropy) versus a Populist Omaha Platform excerpt (indebted farmers demanding federal railroad regulation and free silver).',
          requiredOutput:
            'Side-by-side Point-of-View and Purpose statements explaining how each author’s economic stake shaped their proposed remedy.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed primary-source item and solve a fresh Period 4 or Period 6 sourcing item by inspecting the attribution line before reading the body text.',
          requiredOutput:
            'Correct answers on both items backed by a specific HIPP-based rationale rather than mere plot summary.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'apush-pb-regional-labor-conflation',
      familyId: 'apush-mf-regional-labor-conflation',
      familyLabel: 'Regional and Labor-System Conflation',
      title: 'Differentiating Regional Economies and Labor Systems Across Eras',
      recognitionCue:
        'You matched Chesapeake plantation labor patterns to New England town settlements, or conflated Spanish encomienda coercion with French fur-trade diplomatic alliances.',
      repairQuestion:
        'Which exact geographic region and dominant labor/economic system does the prompt describe, and how did environment and imperial goals make it distinct from neighboring regions?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Highlight the region or imperial power named in the missed Period 1 or Period 2 item and pinpoint which neighboring region’s demographic or labor traits leaked into your chosen distractor.',
          requiredOutput:
            'A region-mismatch note identifying the target region versus the region actually described by the distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a 4-column comparative matrix separating Spanish (encomienda, mission/casta hierarchy), French/Dutch (trade alliances, smaller settlements), Chesapeake/Southern British (tobacco/rice cash crops, shift from indentured servitude to racialized chattel slavery after Bacon’s Rebellion), and New England British (Puritan family migration, mixed maritime/subsistence economy).',
          requiredOutput:
            'A filled 4-column regional-and-labor comparison chart tying environment and demographics to each labor regime.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Compare two APUSH labor transitions: Chesapeake’s 1670s–1700s shift from indentured servants to enslaved African labor and the post-Civil War South’s transition from chattel slavery to sharecropping and tenant farming.',
          requiredOutput:
            'Two concise explanations specifying the economic driver and legal/social control mechanism behind each regional labor regime.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Period 1/2 item and one Market Revolution regional-specialization item contrasting Northeast textile mills, Midwest grain farming, and Southern cotton plantations.',
          requiredOutput:
            'Verified correct answers on both items explicitly anchored to the matching geographic region and labor system.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'apush-pb-ccot-balance',
      familyId: 'apush-mf-ccot-balance',
      familyLabel: 'Continuity vs. Change Over Time (CCOT) One-Sidedness',
      title: 'Balancing Structural Continuity Against Historical Change Across Turning Points',
      recognitionCue:
        'You chose an answer claiming a turning point "completely abolished" an older pattern or "produced no meaningful change", missing the coexistence of reform and persistence.',
      repairQuestion:
        'Across this date span, what specific policy, economy, or social boundary genuinely changed, AND what underlying power structure or debate persisted?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Check the missed CCOT item for absolutist rupture/stasis words ("completely ended", "entirely replaced", "unchanged", "eliminated all") and note whether the stem asked specifically for continuity or for change.',
          requiredOutput:
            'A one-line audit naming the prompt’s CCOT target (continuity vs. change) and the overbroad absolutes flagged in distractors.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a two-sided CCOT balance ledger for the era in the prompt, entering at least one specific institutional change alongside one specific enduring continuity supported by named historical evidence.',
          requiredOutput:
            'A balanced 2-column CCOT ledger showing both genuine transformation and structural persistence across the same period.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Construct balanced CCOT summaries for two classic APUSH eras: Post-Civil War New South (change: legal emancipation & rail/textile growth vs. continuity: cotton dependence, sharecropping, Jim Crow disenfranchisement) and Period 9 1980s Conservatism (change: tax cuts & deregulation vs. continuity: intact core entitlements like Social Security/Medicare and high defense spending).',
          requiredOutput:
            'Two nuanced CCOT statements pairing concrete change evidence with concrete continuity evidence.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Period 6 or Period 9 CCOT item and solve one fresh long-arc comparison item (such as First vs. Second Great Migration or Gilded Age vs. 1920s immigration restrictions).',
          requiredOutput:
            'Correct choices on both items accompanied by an explicit check confirming both continuity and change were weighed.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'apush-pb-evidence-thesis-alignment',
      familyId: 'apush-mf-evidence-thesis-alignment',
      familyLabel: 'Evidence-to-Thesis Alignment and Stimulus Overreach',
      title: 'Aligning Evidence Strictly to the Prompt’s Claim and Reasoning Task',
      recognitionCue:
        'You picked an historically true statement that did not actually support, challenge, or reflect the specific argument inside the stimulus excerpt or prompt thesis.',
      repairQuestion:
        'Does this choice directly corroborate or counter the exact thesis in the stimulus, or is it merely a true side-fact from the same decade?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Summarize the stimulus author’s core claim in ten words or fewer, then test whether your missed answer directly backs that exact claim or drifts onto a related but separate topic.',
          requiredOutput:
            'A ten-word stimulus claim summary plus a brief explanation of why the distractor was "true but off-target".',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the APUSH Evidence Alignment Filter: (1) Match the exact task verb (supports, challenges, exemplifies, contrasts); (2) Verify the subject group matches the stimulus (such as labor unions vs. women’s suffrage vs. civil rights); (3) Reject extreme quantifiers unsupported by historical reality.',
          requiredOutput:
            'A 3-step alignment checklist scoring all four choices on factual accuracy AND direct relevance to the stimulus claim.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Test two candidate pieces of evidence against a thesis about Federalist vs. Anti-Federalist debates (Period 3) and a thesis about Cold War domestic consensus vs. youth counterculture (Period 8), selecting only the evidence that proves the specific causal or comparative claim.',
          requiredOutput:
            'Two defended evidence pairings explaining why the rejected true fact fails to advance the thesis.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Period 3 or Period 8 stimulus item and one secondary-source historian-debate item comparing two historians’ competing interpretations of the same event.',
          requiredOutput:
            'Verified correct answers on both items anchored to the exact line of reasoning in each stimulus.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

module.exports = {
  ap_biology_foundation_pilot,
  ap_chemistry_foundation_pilot,
  ap_psychology_pilot,
  ap_statistics_foundation_pilot,
  ap_us_government_foundation_pilot,
  ap_us_history_foundation_pilot,
};
