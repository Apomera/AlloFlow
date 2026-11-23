'use strict';

/**
 * Curated misconception families and 4-stage remediation playbooks (24 total) for:
 * - praxis_core_5752 (6 pairs: Reading, Writing, and Mathematics Core traps)
 * - parapro (6 pairs: foundational Reading/Math/Writing skills + classroom application/scope traps)
 * - plt_early_childhood_5621 (6 pairs: Pre-K through Grade 3 developmental, guidance, assessment, and legal traps)
 * - plt_k6_5622 (6 pairs: Grades K–6 backward design, UDL/MTSS, questioning, management, rubric, and PLC/legal traps)
 */

const PLAYBOOK_META = {
  status: 'internal-remediation-playbook',
  reviewStatus: 'source-reviewed-editorial-pass',
  releaseEligible: false
};

const praxis_core_5752 = {
  misconceptionFamilies: [
    {
      id: 'core5752-main-idea-vs-narrow-detail-or-extreme-inference',
      label: 'Confusing Main Idea with a Narrow Detail or Extreme Inference',
      description: 'Selecting an answer choice that restates a single supporting example or introduces a sweeping, unsupported claim ("always," "proves," "solely") instead of synthesizing the central thesis that every paragraph of the Praxis Core reading passage actually supports.',
      remediationMove: 'Test each main-idea or inference choice against the whole passage: eliminate choices that cover only one sentence, contradict a concession, or leap past the author\'s stated evidence using extreme qualifiers.',
      remediationPlaybookId: 'core5752-playbook-main-idea-vs-narrow-detail-or-extreme-inference',
      itemIds: [
        'core5752-b1-001',
        'core5752-b1-002',
        'core5752-b1-003',
        'core5752-b1-004',
        'core5752-b1-005',
        'core5752-b1-006',
        'core5752-b1-007',
        'core5752-b1-008',
        'core5752-b1-009',
        'core5752-b1-010',
        'core5752-b1-011',
        'core5752-b1-012'
      ]
    },
    {
      id: 'core5752-tone-and-rhetorical-purpose-misread',
      label: 'Misreading Author Tone and Rhetorical Purpose',
      description: 'Choosing an emotionally exaggerated tone label ("outraged," "dismissive," "enthusiastic") when the passage uses measured academic qualification ("cautiously optimistic," "analytical"), or confusing what a paragraph says literally with why the author placed it in the argument.',
      remediationMove: 'Track hedging verbs, contrast transitions ("however," "although," "yet"), and structural pivots to separate literal topic content from rhetorical function and calibrated authorial attitude.',
      remediationPlaybookId: 'core5752-playbook-tone-and-rhetorical-purpose-misread',
      itemIds: [
        'core5752-b1-014',
        'core5752-b1-015',
        'core5752-b1-017',
        'core5752-b1-018',
        'core5752-b1-019',
        'core5752-b1-020',
        'core5752-b1-022',
        'core5752-b1-024',
        'core5752-b1-026',
        'core5752-b1-029',
        'core5752-b1-040',
        'core5752-b1-045'
      ]
    },
    {
      id: 'core5752-modifier-agreement-and-comma-splice-traps',
      label: 'Missing Dangling Modifiers, Subject-Verb Agreement, and Comma Splice Traps',
      description: 'Approving sentences where an introductory participial phrase modifies the wrong noun, a verb agrees with a nearby prepositional-phrase noun instead of the true subject, or two independent clauses are joined with only a comma (often before "however" or "therefore").',
      remediationMove: 'Strip intervening prepositional phrases to pair subject and verb directly, verify that the noun immediately following an opening modifier performs its action, and test both sides of every comma for complete independent clauses.',
      remediationPlaybookId: 'core5752-playbook-modifier-agreement-and-comma-splice-traps',
      itemIds: [
        'core5752-b1-046',
        'core5752-b1-047',
        'core5752-b1-048',
        'core5752-b1-049',
        'core5752-b1-050',
        'core5752-b1-051',
        'core5752-b1-052',
        'core5752-b1-053',
        'core5752-b1-054',
        'core5752-b1-055',
        'core5752-b1-042',
        'core5752-b2-040'
      ]
    },
    {
      id: 'core5752-proportional-vs-additive-scaling-and-percent-base',
      label: 'Applying Additive Scaling to Ratios and Using the Wrong Percent Base',
      description: 'Solving ratio or recipe problems by adding the same constant to both quantities instead of multiplying by a constant scale factor, or computing percent increase, percent decrease, or reverse-percent original price against the ending value instead of the original base.',
      remediationMove: 'Anchor every ratio problem to a multiplicative unit rate (k = y / x) and write every percent change over the starting quantity: percent change = (new − original) / original, and reverse-discount original = sale price / (1 − r).',
      remediationPlaybookId: 'core5752-playbook-proportional-vs-additive-scaling-and-percent-base',
      itemIds: [
        'core5752-b1-064',
        'core5752-b1-065',
        'core5752-b1-066',
        'core5752-b1-067',
        'core5752-b1-068',
        'core5752-b1-069',
        'core5752-b1-070',
        'core5752-b1-071',
        'core5752-b1-072',
        'core5752-b1-073',
        'core5752-b1-074',
        'core5752-b1-075'
      ]
    },
    {
      id: 'core5752-algebraic-sign-and-slope-intercept-errors',
      label: 'Sign Distribution Errors, Inequality Flips, and Swapped Slope-Intercept Roles',
      description: 'Dropping a negative sign when distributing across parentheses, forgetting to reverse an inequality sign when multiplying or dividing by a negative number, inverting run-over-rise in slope calculations, or confusing the fixed y-intercept with the per-unit rate of change.',
      remediationMove: 'Distribute the signed coefficient explicitly to every term inside parentheses, check whether an inequality step divides by a negative value, compute slope as (y₂ − y₁) / (x₂ − x₁) with matched point order, and label b as starting cost and m as rate per unit.',
      remediationPlaybookId: 'core5752-playbook-algebraic-sign-and-slope-intercept-errors',
      itemIds: [
        'core5752-b1-089',
        'core5752-b1-090',
        'core5752-b1-091',
        'core5752-b1-092',
        'core5752-b1-093',
        'core5752-b1-094',
        'core5752-b1-067',
        'core5752-b1-069',
        'core5752-b1-073',
        'core5752-b1-075'
      ]
    },
    {
      id: 'core5752-mean-median-sampling-and-geometry-dimension-traps',
      label: 'Mean vs. Median Distortion, Sampling Overreach, and Geometry Dimension Confusion',
      description: 'Treating the arithmetic mean as resistant to extreme outliers, overgeneralizing from convenience or non-random samples, reading truncated graph axes literally, or mixing up 1D perimeter/circumference, 2D area, 3D volume, and linear vs. area scale factors.',
      remediationMove: 'Check data skewness before choosing median over mean, verify random sampling vs. random assignment before claiming population or causal scope, inspect graph axis origins, and match every geometric formula and scale factor to its exact dimension (k, k², or k³).',
      remediationPlaybookId: 'core5752-playbook-mean-median-sampling-and-geometry-dimension-traps',
      itemIds: [
        'core5752-b1-077',
        'core5752-b1-078',
        'core5752-b1-079',
        'core5752-b1-081',
        'core5752-b1-086',
        'core5752-b1-087',
        'core5752-b1-088',
        'core5752-b1-095',
        'core5752-b1-096',
        'core5752-b1-097',
        'core5752-b1-099',
        'core5752-b1-100'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'core5752-playbook-main-idea-vs-narrow-detail-or-extreme-inference',
      familyId: 'core5752-main-idea-vs-narrow-detail-or-extreme-inference',
      familyLabel: 'Confusing Main Idea with a Narrow Detail or Extreme Inference',
      title: 'Filter Out Narrow Details and Extreme Inferences in Core Reading',
      recognitionCue: 'A reading stem asks for the primary purpose, central claim, or best-supported inference, and tempting distractors either copy a true one-sentence fact verbatim or slip in extreme words like "all," "never," "proves," or "only."',
      repairQuestion: 'Does this choice cover the unifying claim across the entire passage while staying strictly inside the evidence the author actually gave?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Tag each reading option with one of four labels—True-but-Narrow Detail, Extreme Overreach, Outside Assumption, or Passage-Wide Synthesis—before comparing phrasing.',
          requiredOutput: 'Quote the exact word or phrase (such as "proves," "eliminates," or a single-example noun) that exposes each distractor as too narrow or too extreme.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Draft a one-sentence passage umbrella statement ("The author argues/explains X while noting qualification Y") and contrast it with an unsupported inference leap.',
          requiredOutput: 'Write a two-part validity test: every valid main idea must absorb both the central claim and any major concession, and every valid inference must be logically forced by stated lines.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate a short passage describing a town rail-to-trail project that increased foot traffic while raising maintenance costs, then sort four candidate summaries into Narrow Detail, Extreme Inference, Reversed Claim, and Best Central Idea.',
          requiredOutput: 'Assign each of the four candidate statements to its category and cite the passage phrase that confirms the balanced central idea.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply the umbrella-and-evidence check to a fresh paired or informational passage where an attractive distractor repeats exact vocabulary from paragraph two.',
          requiredOutput: 'Select the choice supported across the full text and state why the vocabulary-matching detail option fails the passage-wide scope test.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'core5752-playbook-tone-and-rhetorical-purpose-misread',
      familyId: 'core5752-tone-and-rhetorical-purpose-misread',
      familyLabel: 'Misreading Author Tone and Rhetorical Purpose',
      title: 'Calibrate Author Tone and Distinguish Content from Rhetorical Function',
      recognitionCue: 'A craft-and-structure item asks why the author mentions a study, counterexample, or metaphor—or asks for the author\'s attitude—and one distractor names an extreme emotion while another merely summarizes the quoted sentence without explaining its job.',
      repairQuestion: 'What rhetorical job does this sentence perform for the surrounding argument (concede, qualify, illustrate, contrast), and how strong or restrained is the author\'s wording?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Highlight every attitude marker (qualifiers such as "perhaps," "bridge technology," "quietly daring") and every structural hinge ("although," "for example," "however") around the referenced lines.',
          requiredOutput: 'List the exact lexical cues showing whether the author\'s tone is neutral, cautiously evaluative, skeptical, or appreciative rather than hostile or ecstatic.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Convert a "what it says" paraphrase into a "why it is there" rhetorical-verb statement using precise function verbs (illustrate, qualify, anticipate an objection, contrast two approaches).',
          requiredOutput: 'Write a paired contrast showing why "reports winter sampling" is literal content whereas "qualifies the generalizability of the study\'s recommendation" is rhetorical purpose.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze two Core-style excerpts—one calling a budget proposal "ambitious, perhaps too ambitious" and another describing a street closure feared by merchants that later boosted sales—and match each to its calibrated tone and function.',
          requiredOutput: 'Provide the precise tone pair (measured skepticism vs. evidence-backed rebuttal) and reject one overly emotional distractor for each excerpt.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-test on a two-paragraph passage where paragraph one diagnoses a problem and paragraph two weighs trade-offs of a remedy, plus a writing-tone revision item with sarcastic wording.',
          requiredOutput: 'Identify the structural relationship between paragraphs and revise the sarcastic phrasing into objective academic prose suitable for educated adult readers.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'core5752-playbook-modifier-agreement-and-comma-splice-traps',
      familyId: 'core5752-modifier-agreement-and-comma-splice-traps',
      familyLabel: 'Missing Dangling Modifiers, Subject-Verb Agreement, and Comma Splice Traps',
      title: 'Run the Clause-Boundary, Subject-Core, and Modifier-Anchor Audit',
      recognitionCue: 'A Writing multiple-choice item looks smooth to the ear because a plural noun sits right before a plural verb, an opening "-ing" phrase sits next to an inanimate object, or ", however," glues two complete sentences together.',
      repairQuestion: 'Who is the true grammatical subject after deleting prepositional phrases, who performs the opening modifier\'s action, and can both sides of the comma stand alone as complete sentences?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect every Writing stem with three quick markers: cross out prepositional phrases ("of the committees"), box the noun immediately after any introductory comma, and run a period test at every internal comma.',
          requiredOutput: 'Name which of the three grammar traps (agreement distractor noun, dangling/misplaced modifier, or comma splice/run-on) is embedded in the sentence.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Review the four legal clause joins (period, semicolon, comma + FANBOYS coordinating conjunction, or subordination) and verify why conjunctive adverbs ("however," "therefore," "moreover") require a semicolon or period before them.',
          requiredOutput: 'Write the corrected rule set: semicolon + conjunctive adverb + comma for independent clauses, and noun-actor immediately following an introductory participial phrase.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Repair three flawed sentences: (1) "The box of archival photographs were damaged." (2) "Walking through the gallery, the new exhibit impressed the visitors." (3) "The pilot shortened wait times, however, staffing costs rose."',
          requiredOutput: 'Produce the grammatically repaired version of each sentence and state the exact rule applied to each fix.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Audit a multi-error Core Writing item combining parallel structure, pronoun-antecedent clarity, and semicolon usage so that no single surface check misses a secondary error.',
          requiredOutput: 'Select the completely error-free sentence and explain the specific flaw that disqualifies each of the remaining options.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'core5752-playbook-proportional-vs-additive-scaling-and-percent-base',
      familyId: 'core5752-proportional-vs-additive-scaling-and-percent-base',
      familyLabel: 'Applying Additive Scaling to Ratios and Using the Wrong Percent Base',
      title: 'Lock In Multiplicative Scaling and Original-Base Percent Equations',
      recognitionCue: 'A ratio, map-scale, unit-rate, or discount/markup item tempts you to add the difference between two numbers ("3 cups for 2 batches → add 3 to get 6 cups for 5 batches") or to compute a 25% markup and 25% discount as canceling each other out.',
      repairQuestion: 'What is the constant multiplicative rate per 1 unit, and which quantity is the 100% original base before the percent change occurred?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot additive-thinking traps in proportions and base-switching traps in percent problems (discount-to-original, successive percents, and percent increase vs. decrease).',
          requiredOutput: 'Identify the exact unit ratio (such as cups per batch or miles per inch) and label which number represents 100% (the original base) before computing.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast additive change (adding +3 to both numerator and denominator breaks equivalence) with multiplicative scaling (multiplying both by 5/2), and write the multiplier model for percent change: final = original × (1 ± r).',
          requiredOutput: 'Show with a numeric check why a 20% increase followed by a 20% decrease yields 0.96 of the original (not 1.00) because the second base is larger.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Solve three Core Number & Quantity problems step by step: (1) 3 cups of flour for 2 batches scaled to 5 batches, (2) a $60 sale price after a 25% discount to find the original price, and (3) a 1 inch : 12 miles map scaled to 3.5 inches.',
          requiredOutput: 'Show the unit-rate or multiplier equation for each item (7.5 cups, $80 original price, 42 miles) and verify each answer by plugging it back into the original context.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh percent-change and unit-conversion word problem (such as meters to centimeters combined with a rate comparison) without falling into an additive or reversed-base distractor.',
          requiredOutput: 'State the scale multiplier, the 100% base, and the verified final quantity with matching units.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'core5752-playbook-algebraic-sign-and-slope-intercept-errors',
      familyId: 'core5752-algebraic-sign-and-slope-intercept-errors',
      familyLabel: 'Sign Distribution Errors, Inequality Flips, and Swapped Slope-Intercept Roles',
      title: 'Protect Signs, Inequality Direction, and Slope-Intercept Meaning',
      recognitionCue: 'An algebra item contains parentheses preceded by a minus sign, an inequality with a negative coefficient on x, two coordinate points for slope, or a word problem combining a one-time fee with a recurring monthly charge.',
      repairQuestion: 'Did every distributed term keep its signed product, did any division by a negative flip the inequality, and does the slope match vertical change divided by horizontal change?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Circle every negative sign before parentheses or variables, highlight whether the prompt asks for an expression vs. a solution set, and tag the fixed starting amount vs. the per-unit rate in linear word problems.',
          requiredOutput: 'Flag the exact high-risk step (distribution sign, inequality flip, point-order subtraction, or m vs. b assignment) before solving.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Verify the four algebra guardrails: distribute a(bx − c) = abx − ac; reverse the inequality symbol whenever multiplying or dividing both sides by a negative; compute m = (y₂ − y₁) / (x₂ − x₁) in consistent order; map y = mx + b so m carries the "per" unit and b is the value at x = 0.',
          requiredOutput: 'Write one worked check showing why −2x + 6 ≥ 14 becomes x ≤ −4 (substituting x = −5 confirms 16 ≥ 14, whereas x = 0 fails).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Work three Core Algebra items: expand 4(2x − 3) + 5, compute the slope through (0, 5) and (4, 13) and build the equation, and model a $12 signup fee plus $4 per month for m months.',
          requiredOutput: 'Report 8x − 7, slope m = 2 with y = 2x + 5, and C = 4m + 12, including a quick substitution check for each result.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a transfer item evaluating a quadratic function f(x) = 2x² − 3 at a negative input or solving a linear inequality with a negative coefficient, checking order of operations (exponent before multiplication).',
          requiredOutput: 'Provide the solved value or solution set and confirm it with a test-point substitution.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'core5752-playbook-mean-median-sampling-and-geometry-dimension-traps',
      familyId: 'core5752-mean-median-sampling-and-geometry-dimension-traps',
      familyLabel: 'Mean vs. Median Distortion, Sampling Overreach, and Geometry Dimension Confusion',
      title: 'Separate Center, Sampling Scope, and 1D/2D/3D Geometry Measures',
      recognitionCue: 'A statistics item includes an extreme outlier, a truncated vertical axis starting at 95, or a volunteer sample claiming cause-and-effect—or a geometry item gives a radius or scale factor and slips perimeter/diameter/linear-scale distractors into an area or volume question.',
      repairQuestion: 'Is the distribution skewed (favoring median over mean), does the study design support population generalization or causation, and does the geometric formula match 1D length, 2D area, or 3D volume?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan data prompts for outliers, axis-origin breaks, sample selection method, and margin-of-error wording; scan geometry prompts for radius vs. diameter and the target unit dimension (cm, cm², or cm³).',
          requiredOutput: 'List the exact statistical distortion or dimensional mismatch that creates the primary distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Pair each concept with its rule: outliers pull the mean toward the tail while leaving the median stable; random sampling supports generalizing to a population whereas random assignment supports causal inference; scaling every linear side by k multiplies perimeter by k, area by k², and volume by k³.',
          requiredOutput: 'Build a compact reference table contrasting C = 2πr vs. A = πr², perimeter vs. area vs. prism volume (l × w × h), and mean vs. median sensitivity.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Solve three Core Data/Geometry items: (1) find the missing fourth score when the mean of four scores is 18 and three are 14, 17, and 21; (2) explain how a y-axis starting at 95 exaggerates bars of 98 and 100; (3) compute both the new side length and new area when a square of side 4 is enlarged by scale factor 3.',
          requiredOutput: 'Report fourth score = 20 (total 72 − 52), note that a non-zero baseline inflates visual difference (2.5× bar height for a 2% numeric gap), and distinguish new side = 12 (×3) from new area = 144 (×9).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Tackle a fresh probability, sampling, or right-triangle/circle item (such as radius 5 circumference vs. area, or margin of error 60% ± 4 percentage points) and verify units and interpretation bounds.',
          requiredOutput: 'State the verified numeric or interpretive answer (such as 56% to 64% plausible interval, or 10π circumference vs. 25π area) and rule out the dimension-swapped distractor.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const parapro = {
  misconceptionFamilies: [
    {
      id: 'parapro-main-idea-vs-outside-assumption-in-reading',
      label: 'Confusing Passage Main Idea with Supporting Details or Outside Assumptions',
      description: 'Answering ParaPro reading comprehension items using real-world background beliefs that never appear in the passage, or choosing a single vivid fact from a table, notice, or paragraph instead of the overarching main idea or strictly text-supported inference.',
      remediationMove: 'Point directly to the sentence or table row that proves your answer: discard any option that sounds reasonable in everyday life but lacks explicit textual support, and separate fact from opinion using verifiable evidence.',
      remediationPlaybookId: 'parapro-playbook-main-idea-vs-outside-assumption-in-reading',
      itemIds: [
        'parapro-reading-skills-001',
        'parapro-reading-skills-002',
        'parapro-reading-skills-003',
        'parapro-reading-skills-004',
        'parapro-reading-skills-005',
        'parapro-reading-skills-006',
        'parapro-reading-skills-007',
        'parapro-reading-skills-008',
        'parapro-reading-skills-009',
        'parapro-reading-skills-010',
        'parapro-reading-skills-011',
        'parapro-reading-skills-012'
      ]
    },
    {
      id: 'parapro-fraction-denominator-addition-and-percent-base',
      label: 'Adding Fraction Denominators Directly and Misapplying Percent or Decimal Place Value',
      description: 'Adding or subtracting fractions straight across (treating 3/4 + 1/8 as 4/12), misaligning decimal place value when dividing by a decimal (4.8 ÷ 0.6) or comparing tenths/hundredths, or taking a percentage of the wrong whole without calculator support.',
      remediationMove: 'Convert unlike fractions to a common denominator before adding numerators only, scale both divisor and dividend by the same power of 10 to clear decimal divisors, and anchor percents to parts per 100 of the specified whole.',
      remediationPlaybookId: 'parapro-playbook-fraction-denominator-addition-and-percent-base',
      itemIds: [
        'parapro-mathematics-skills-002',
        'parapro-mathematics-skills-003',
        'parapro-mathematics-skills-005',
        'parapro-mathematics-skills-006',
        'parapro-mathematics-skills-007',
        'parapro-mathematics-skills-008',
        'parapro-mathematics-skills-009',
        'parapro-mathematics-skills-010',
        'parapro-mathematics-skills-011',
        'parapro-mathematics-skills-012'
      ]
    },
    {
      id: 'parapro-equation-balance-and-area-vs-perimeter',
      label: 'Breaking Equation Balance, Order of Operations, and Area vs. Perimeter Distinctions',
      description: 'Evaluating arithmetic expressions strictly left to right (computing 18 − 3 × 4 as 15 × 4 = 60), expanding exponents as multiplication by the exponent (2⁵ as 2 × 5 = 10), breaking equality by performing an operation on only one side of an equation, or confusing perimeter boundary length with enclosed area.',
      remediationMove: 'Follow order of operations (grouping → exponents → multiplication/division left to right → addition/subtraction left to right), apply every inverse operation to both sides of an equation, and distinguish perimeter (sum of outer sides in linear units) from area (interior square units).',
      remediationPlaybookId: 'parapro-playbook-equation-balance-and-area-vs-perimeter',
      itemIds: [
        'parapro-mathematics-skills-001',
        'parapro-mathematics-skills-002',
        'parapro-mathematics-skills-003',
        'parapro-mathematics-skills-004',
        'parapro-mathematics-skills-005',
        'parapro-mathematics-skills-006',
        'parapro-mathematics-skills-009',
        'parapro-mathematics-skills-010',
        'parapro-mathematics-skills-011',
        'parapro-mathematics-skills-012'
      ]
    },
    {
      id: 'parapro-comma-splice-homophone-and-subject-verb-traps',
      label: 'Missing Comma Splices, Homophone Mix-Ups, and Subject-Verb Agreement Errors',
      description: 'Overlooking commonly confused words ("their/there/they\'re," "then/than," "its/it\'s"), misplacing plural possessive apostrophes ("two teachers\' lesson plans"), pairing a verb with a nearby object instead of the subject, or joining two independent clauses with a bare comma.',
      remediationMove: 'Expand every contraction mentally ("they are," "it is") to test homophones, locate the true subject apart from modifying phrases, check whether possession is singular or plural before placing the apostrophe, and verify clause boundaries around every comma.',
      remediationPlaybookId: 'parapro-playbook-comma-splice-homophone-and-subject-verb-traps',
      itemIds: [
        'parapro-writing-skills-001',
        'parapro-writing-skills-002',
        'parapro-writing-skills-003',
        'parapro-writing-skills-004',
        'parapro-writing-skills-005',
        'parapro-writing-skills-006',
        'parapro-writing-skills-007',
        'parapro-writing-skills-008',
        'parapro-writing-skills-009',
        'parapro-writing-skills-010',
        'parapro-writing-skills-011',
        'parapro-writing-skills-012'
      ]
    },
    {
      id: 'parapro-doing-work-for-students-vs-scaffolding',
      label: 'Doing the Work for Students Instead of Scaffolding Independent Thinking',
      description: 'Helping a struggling reader, writer, or math learner by supplying the final answer, rewriting the student\'s sentence, or completing calculation steps for them instead of giving a targeted hint, modeling one parallel step, or prompting self-correction.',
      remediationMove: 'Keep the cognitive pencil in the student\'s hand: offer the smallest effective prompt (chunking directions, pointing to a strategy anchor, asking a guiding question, or modeling one step) so the learner completes the target skill.',
      remediationPlaybookId: 'parapro-playbook-doing-work-for-students-vs-scaffolding',
      itemIds: [
        'parapro-reading-skills-001',
        'parapro-reading-skills-004',
        'parapro-reading-skills-007',
        'parapro-reading-skills-010',
        'parapro-mathematics-skills-001',
        'parapro-mathematics-skills-002',
        'parapro-mathematics-skills-010',
        'parapro-mathematics-skills-012',
        'parapro-writing-skills-001',
        'parapro-writing-skills-003',
        'parapro-writing-skills-005',
        'parapro-writing-skills-009'
      ]
    },
    {
      id: 'parapro-crossing-teacher-directed-paraprofessional-scope',
      label: 'Crossing Teacher-Directed Paraprofessional Scope and Instructional Boundaries',
      description: 'Selecting classroom-application choices where a paraprofessional independently designs core curriculum, modifies IEP goals or grading policies, diagnoses a learning disability, or delivers unapproved parent evaluations instead of reinforcing teacher-planned instruction and reporting observations to the supervising teacher.',
      remediationMove: 'Apply the ParaPro role filter to every classroom scenario: paraprofessionals reinforce teacher-planned lessons, guide small-group practice, check student understanding, and share objective observations with the licensed teacher—never replace teacher authority on curriculum, diagnosis, IEP changes, or formal grading.',
      remediationPlaybookId: 'parapro-playbook-crossing-teacher-directed-paraprofessional-scope',
      itemIds: [
        'parapro-reading-skills-002',
        'parapro-reading-skills-008',
        'parapro-reading-skills-011',
        'parapro-reading-skills-012',
        'parapro-mathematics-skills-004',
        'parapro-mathematics-skills-006',
        'parapro-mathematics-skills-008',
        'parapro-mathematics-skills-011',
        'parapro-writing-skills-002',
        'parapro-writing-skills-004',
        'parapro-writing-skills-007',
        'parapro-writing-skills-010'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'parapro-playbook-main-idea-vs-outside-assumption-in-reading',
      familyId: 'parapro-main-idea-vs-outside-assumption-in-reading',
      familyLabel: 'Confusing Passage Main Idea with Supporting Details or Outside Assumptions',
      title: 'Ground Every ParaPro Reading Answer in Explicit Text and Table Evidence',
      recognitionCue: 'A short passage, school announcement, lab procedure, or checkout table is followed by an option that sounds true in real life ("students should always recycle") or quotes one detail while missing what the entire passage is mostly about.',
      repairQuestion: 'Which exact sentence, procedural step, or table entry proves this choice—and does it reflect the whole text rather than one minor detail or personal opinion?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Classify every reading distractor as either an Outside Assumption (not stated in the text), a Single Narrow Detail, or a Fact/Opinion confusion before picking an answer.',
          requiredOutput: 'Cite the exact line or table cell that verifies the right answer and identify the unstated assumption inside the main trap choice.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast main idea (the unifying message covering beginning, middle, and end) with supporting detail (one step, example, or statistic), and distinguish verifiable fact from value-judgment opinion.',
          requiredOutput: 'Write a 3-point verification checklist: (1) stated or directly implied in text, (2) matches the full passage scope, (3) uses neutral verifiable proof for fact items.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Inspect a 4-day classroom book-checkout table (Mon. 18, Tue. 22, Wed. 15, Thu. 25) and a notice moving band rehearsal to the auditorium; separate one valid conclusion from one unsupported assumption for each text.',
          requiredOutput: 'State one text-verified conclusion for each stimulus (for example, Thursday had the highest checkout total at 25 books) and explain why assuming "Wednesday had a snow day" is invalid.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply the evidence-pointing habit to a vocabulary-in-context sentence using a contrast signal ("Although Nia was eager to perform, she was reluctant to sing a solo") and a multi-step science procedure.',
          requiredOutput: 'Use the contrast clue to define the target word accurately and verify step sequence without skipping or importing outside rules.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'parapro-playbook-fraction-denominator-addition-and-percent-base',
      familyId: 'parapro-fraction-denominator-addition-and-percent-base',
      familyLabel: 'Adding Fraction Denominators Directly and Misapplying Percent or Decimal Place Value',
      title: 'Master No-Calculator Fractions, Decimals, and Percent Bases for ParaPro',
      recognitionCue: 'A non-calculator ParaPro math item pairs unlike fractions (such as 3/4 + 1/8), decimal division (4.8 ÷ 0.6), place-value digits (42.681), or a percentage of a whole number (35% of 80), and lists 4/12 or 0.8 as classic trap options.',
      repairQuestion: 'Are the fraction pieces the same size (common denominator), have both decimal numbers been scaled by the same power of 10, and what is the 100% whole for the percent?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot the three highest-frequency no-calculator slips: adding denominators straight across, misplacing the decimal point after dividing by a number less than 1, and confusing tenths with hundredths.',
          requiredOutput: 'Explain why 3/4 + 1/8 cannot equal 4/12 (4/12 is less than 3/4!) using a quick benchmark reasonableness estimate.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Review the exact no-calculator mechanics: rewrite 3/4 as 6/8 before adding 1/8 = 7/8; multiply both 4.8 and 0.6 by 10 to compute 48 ÷ 6 = 8; decompose percents into friendly benchmarks (35% of 80 = 10% × 3 + 5% = 24 + 4 = 28).',
          requiredOutput: 'Write one benchmark-estimation check for each operation so an off-by-10 decimal error or shrunken fraction sum is caught immediately.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Compute without a calculator: (1) 3/4 + 1/8, (2) 4.8 ÷ 0.6, (3) the place value of 8 in 42.681, and (4) 35% of 80, plus the number halfway between 0.4 and 0.5.',
          requiredOutput: 'Show the clean mental/paper setup yielding 7/8, 8, hundredths (0.08), 28, and 0.45.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Compare two rational numbers in mixed forms (such as 3/4 vs. 0.72 or 5/8 vs. 0.65) and convert a decimal to a reduced fraction without a calculator.',
          requiredOutput: 'Convert both values to a common representation (both decimals or common-denominator fractions) and prove which comparison statement is true.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'parapro-playbook-equation-balance-and-area-vs-perimeter',
      familyId: 'parapro-equation-balance-and-area-vs-perimeter',
      familyLabel: 'Breaking Equation Balance, Order of Operations, and Area vs. Perimeter Distinctions',
      title: 'Enforce Order of Operations, Balanced Equations, and Perimeter vs. Area',
      recognitionCue: 'A ParaPro math item combines subtraction and multiplication (18 − 3 × 4), presents an exponent (2⁵), asks to solve a two-step equation, or describes fencing vs. carpeting a rectangular garden.',
      repairQuestion: 'Did multiplication and exponents run before subtraction, did both sides of the equation receive the exact same inverse operation, and does the prompt ask for outer boundary length (perimeter) or interior square coverage (area)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify left-to-right arithmetic traps (18 − 3 first), base-times-exponent errors (2⁵ → 10), one-sided equation steps, and perimeter/area formula swaps before computing.',
          requiredOutput: 'Label the trap baked into the distractor (for example, 60 comes from subtracting before multiplying; 10 comes from multiplying base by exponent).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Anchor four concrete rules: exponents mean repeated multiplication of the base (2⁵ = 2×2×2×2×2 = 32); multiplication precedes addition/subtraction; an equation is a balance scale requiring identical inverse operations on both sides; perimeter adds all boundary edges (units) while area multiplies perpendicular dimensions (square units).',
          requiredOutput: 'Write a side-by-side comparison of perimeter (2l + 2w, fencing/trim) vs. area (l × w, tile/carpet) for a 6 ft by 4 ft rectangle.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Solve four no-calculator checks: (1) 18 − 3 × 4, (2) 2⁵, (3) 684 − 297 with regrouping verification, and (4) solve 3x + 5 = 20 while verifying by substitution.',
          requiredOutput: 'Record the step-by-step results (6, 32, 387 verified by 387 + 297 = 684, and x = 5 verified by 3(5) + 5 = 20).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a classroom word problem requiring both choosing the right measurement (border ribbon vs. poster surface) and setting up a balanced equation for a missing side length.',
          requiredOutput: 'State whether perimeter or area applies, show the balanced inverse step, and include the correct linear or square unit.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'parapro-playbook-comma-splice-homophone-and-subject-verb-traps',
      familyId: 'parapro-comma-splice-homophone-and-subject-verb-traps',
      familyLabel: 'Missing Comma Splices, Homophone Mix-Ups, and Subject-Verb Agreement Errors',
      title: 'Eliminate Homophone, Apostrophe, Agreement, and Clause-Join Errors',
      recognitionCue: 'A ParaPro Writing question tests "they\'re/their/there," "then/than," plural possessives ("teachers\'"), dangling modifiers, or comma splices where a wrong option sounds completely normal when read aloud.',
      repairQuestion: 'When you expand contractions, isolate the core subject, check singular vs. plural ownership, and test whether each side of a comma is a full sentence, which option stays 100% standard?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Read Writing items visually rather than by ear alone: underline every homophone pair, apostrophe, verb-subject pair, and clause boundary.',
          requiredOutput: 'Pinpoint the exact mechanical category tested (homophone, possessive apostrophe, agreement, dangling modifier, tense shift, or comma splice).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply rapid mechanical tests: "they\'re" = "they are," "their" = ownership, "there" = place; "than" = comparison, "then" = time sequence; plural nouns ending in -s take the apostrophe after the s ("two teachers\' plans"); two independent clauses need a period, semicolon, or comma + FANBOYS.',
          requiredOutput: 'Write one contrast pair for each rule (such as "faster than" vs. "finish math, then read" and "the teacher\'s desk" vs. "two teachers\' lesson plans").'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Edit three ParaPro-style sentences: (1) fix "there/their/they\'re" in a sentence about students putting coats in lockers, (2) repair a dangling hallway modifier ("Walking through the hallway, the bulletin board caught Maya\'s eye"), and (3) fix a comma splice joining two closely related independent clauses.',
          requiredOutput: 'Provide all three corrected sentences and name the mechanical check that verifies each edit.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Complete a mixed proofreading item combining direct-quotation punctuation, pronoun clarity, and parts-of-speech identification ("carefully" modifying a verb vs. adjective modifying a noun).',
          requiredOutput: 'Select the error-free sentence, place quotation marks and commas accurately, and classify the target word by its syntactic job in the sentence.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'parapro-playbook-doing-work-for-students-vs-scaffolding',
      familyId: 'parapro-doing-work-for-students-vs-scaffolding',
      familyLabel: 'Doing the Work for Students Instead of Scaffolding Independent Thinking',
      title: 'Coach Student Independence with Graduated Scaffolds Instead of Rescuing',
      recognitionCue: 'A ParaPro classroom-application vignette shows a student stuck on a word problem, decoding word, or draft paragraph, and the tempting "helpful" distractor has the paraprofessional give the answer, rewrite the sentence, or excuse the student from trying.',
      repairQuestion: 'Does this paraprofessional move build the student\'s own strategy so they can take the next step themselves, or does it take the learning task out of the student\'s hands?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot "rescue" distractors in classroom-support stems: telling the student the answer, writing on the student\'s paper, simplifying away the target skill, or abandoning the student with zero guidance ("try harder").',
          requiredOutput: 'Label each option as Rescue (over-helping), Neglect (no support), or Effective Scaffold (guided student ownership).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Structure a 3-step paraprofessional scaffolding ladder: (1) ask the student to show or explain where they got stuck, (2) offer a concrete tool or prompt (reread step 2, underline clue words, use a place-value chart or sound-out cue), (3) let the student execute and verify the step independently.',
          requiredOutput: 'Write one effective scaffolding question for reading comprehension, one for fraction/order-of-operations math, and one for student writing revision.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Respond to two realistic vignettes: (1) a fifth grader writes 3/4 + 1/8 = 4/12 during teacher-assigned small-group practice; (2) a fourth grader\'s draft has a comma splice and missing topic detail.',
          requiredOutput: 'Script a two-sentence paraprofessional prompt for each student that guides them to discover the error using visual models or read-aloud checks without telling them the final fix.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new classroom-support item where a student misreads multi-step lab instructions or gets overwhelmed by a graphic organizer.',
          requiredOutput: 'Choose the scaffold that breaks the task into manageable steps while keeping the student responsible for reading, calculating, or revising.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'parapro-playbook-crossing-teacher-directed-paraprofessional-scope',
      familyId: 'parapro-crossing-teacher-directed-paraprofessional-scope',
      familyLabel: 'Crossing Teacher-Directed Paraprofessional Scope and Instructional Boundaries',
      title: 'Stay Inside Teacher-Directed Paraprofessional Scope and Reporting Roles',
      recognitionCue: 'A ParaPro scenario involves a struggling learner, a parent asking for an evaluation, or a student needing a different assignment—and a proactive-sounding distractor has the paraprofessional rewrite the lesson plan, change IEP accommodations, assign report-card grades, or diagnose a disability.',
      repairQuestion: 'Is this action within a paraprofessional\'s supervised instructional-support role, or does it cross into the licensed teacher\'s or IEP team\'s legal authority?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan classroom-application choices for scope-violation verbs: "diagnose," "modify the IEP," "design a new curriculum unit," "assign final grades," or "tell the parent the student has dyslexia."',
          requiredOutput: 'Flag every authority boundary crossed by the distractor and name who holds legal responsibility for that decision.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Divide classroom duties cleanly into Paraprofessional Scope (implementing teacher-designed plans, facilitating small-group practice, modeling approved strategies, collecting objective anecdotal/accuracy data, alerting the teacher) vs. Licensed Teacher/Team Scope (initial instruction of new standards, grading, formal assessment interpretation, IEP changes, parent conferences on eligibility).',
          requiredOutput: 'Write a 2-column role boundary card plus one polite script for redirecting a parent\'s diagnostic or grading question to the supervising teacher.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Decide the compliant paraprofessional response in three vignettes: (1) a student finishes teacher-assigned practice with 40% accuracy on fraction addition, (2) a parent asks at pickup whether their child needs special education testing, (3) a student\'s IEP accommodation seems unclear during a quiz.',
          requiredOutput: 'Specify the exact in-scope action for all three cases: document specific error patterns and notify the teacher, refer the parent warmly to the teacher/team without speculating, and verify the accommodation directly with the teacher before altering test conditions.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh ParaPro scenario balancing proactive student support against professional boundaries during small-group literacy or math work.',
          requiredOutput: 'Select the option that pairs immediate teacher-aligned support with objective communication back to the supervising teacher, rejecting both passive inaction and overstepping.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const plt_early_childhood_5621 = {
  misconceptionFamilies: [
    {
      id: 'plt5621-developmental-mismatch-abstract-before-concrete',
      label: 'Developmental Mismatch: Pushing Abstract Worksheets Before Concrete Play and Manipulatives',
      description: 'Selecting extended whole-group lectures, timed abstract symbol drills, or silent seatwork for preschool through grade 3 learners instead of developmentally appropriate hands-on exploration, concrete manipulatives, guided play, and short multisensory learning cycles aligned to Piagetian preoperational and early concrete-operational thinking.',
      remediationMove: 'Check the child\'s developmental stage first (Pre-K through Grade 3): anchor new math, science, and literacy ideas in concrete manipulatives, active play, movement, and real-world objects before moving to pictorial models and abstract symbols.',
      remediationPlaybookId: 'plt5621-playbook-developmental-mismatch-abstract-before-concrete',
      itemIds: [
        'plt5621-b1-001',
        'plt5621-b1-003',
        'plt5621-b1-006',
        'plt5621-b1-007',
        'plt5621-b1-009',
        'plt5621-b1-010',
        'plt5621-b1-011',
        'plt5621-b1-012',
        'plt5621-b1-036',
        'plt5621-b1-037',
        'plt5621-b1-040',
        'plt5621-b1-042'
      ]
    },
    {
      id: 'plt5621-zpd-over-scaffolding-or-no-scaffolding',
      label: 'Missing the Zone of Proximal Development: Over-Scaffolding or Zero-Scaffold Discovery',
      description: 'Either turning an early-childhood task into unguided free-for-all discovery with no modeling or prompts, or permanently over-scaffolding young learners by never fading prompts—instead of matching Vygotsky\'s Zone of Proximal Development (ZPD) with contingent support and gradual release.',
      remediationMove: 'Diagnose what the young learner can do independently vs. with timely cues, provide modeled think-alouds and targeted scaffolds inside the ZPD, and systematically fade assistance as competence grows.',
      remediationPlaybookId: 'plt5621-playbook-zpd-over-scaffolding-or-no-scaffolding',
      itemIds: [
        'plt5621-b1-002',
        'plt5621-b1-004',
        'plt5621-b1-005',
        'plt5621-b1-007',
        'plt5621-b1-031',
        'plt5621-b1-032',
        'plt5621-b1-033',
        'plt5621-b1-034',
        'plt5621-b1-035',
        'plt5621-b1-038',
        'plt5621-b1-039',
        'plt5621-b1-041'
      ]
    },
    {
      id: 'plt5621-punishment-vs-positive-guidance-and-routines',
      label: 'Confusing Punitive Control with Positive Guidance, Predictable Routines, and Reinforcement',
      description: 'Treating public shaming, recess removal, or harsh reprimands as effective early-childhood behavior management, or confusing negative reinforcement (removing an aversive demand to strengthen a desired behavior) with punishment instead of using predictable routines, visual cues, redirection, and explicit social-emotional coaching.',
      remediationMove: 'Build proactive early-childhood environments with visual schedules, clear transition warnings, and taught self-regulation skills; distinguish reinforcement (increases target behavior) from punishment (decreases behavior) and respond to misbehavior with calm positive guidance.',
      remediationPlaybookId: 'plt5621-playbook-punishment-vs-positive-guidance-and-routines',
      itemIds: [
        'plt5621-b1-005',
        'plt5621-b1-008',
        'plt5621-b1-009',
        'plt5621-b1-010',
        'plt5621-b1-011',
        'plt5621-b1-012',
        'plt5621-b1-033',
        'plt5621-b1-037',
        'plt5621-b1-040',
        'plt5621-b1-041'
      ]
    },
    {
      id: 'plt5621-summative-only-vs-authentic-formative-play-checks',
      label: 'Relying on Summative Paper Tests Instead of Authentic Formative and Play-Based Checks',
      description: 'Assessing preschool through grade 3 learners solely through end-of-unit paper tests or unfocused folders of crafts instead of gathering ongoing formative evidence through objective anecdotal notes, checklists, work-sample portfolios tied to criteria, and play-embedded performance checks that guide next-day teaching.',
      remediationMove: 'Use continuous authentic assessment—objective anecdotal records (observable actions, not value judgments), purposeful portfolios showing growth against learning goals, and formative checks during centers and small groups—to adjust instruction immediately.',
      remediationPlaybookId: 'plt5621-playbook-summative-only-vs-authentic-formative-play-checks',
      itemIds: [
        'plt5621-b1-061',
        'plt5621-b1-062',
        'plt5621-b1-063',
        'plt5621-b1-064',
        'plt5621-b1-065',
        'plt5621-b1-066',
        'plt5621-b1-067',
        'plt5621-b1-068',
        'plt5621-b1-069',
        'plt5621-b1-035'
      ]
    },
    {
      id: 'plt5621-norm-vs-criterion-and-reliability-vs-validity',
      label: 'Confusing Norm- vs. Criterion-Referenced Scores and Reliability vs. Validity',
      description: 'Treating a consistent test score (reliability) as proof that the test measures the intended early-childhood standard (validity), mixing up norm-referenced peer rankings with criterion-referenced mastery standards, or confusing accommodations (preserving construct validity) with modifications (altering the measured standard).',
      remediationMove: 'Separate consistency (reliability: repeatable scores) from accuracy of construct alignment (validity: measures the intended skill), match norm-referenced scores to peer comparison vs. criterion-referenced scores to mastery targets, and verify that accommodations remove access barriers without lowering the measured standard.',
      remediationPlaybookId: 'plt5621-playbook-norm-vs-criterion-and-reliability-vs-validity',
      itemIds: [
        'plt5621-b1-061',
        'plt5621-b1-062',
        'plt5621-b1-063',
        'plt5621-b1-064',
        'plt5621-b1-066',
        'plt5621-b1-068',
        'plt5621-b1-069',
        'plt5621-b1-070',
        'plt5621-b1-071',
        'plt5621-b1-072'
      ]
    },
    {
      id: 'plt5621-ferpa-idea-mandated-reporting-and-family-partnership-traps',
      label: 'FERPA Confidentiality, IDEA/IFSP Rights, Mandated Reporting, and Family Partnership Traps',
      description: 'Sharing identifiable child records without authorization, delaying a mandated child-abuse/neglect report to investigate personally, bypassing IDEA multidisciplinary team procedures or Least Restrictive Environment (LRE), or treating family conferences as one-way deficit reporting without translated communication.',
      remediationMove: 'Enforce legal and ethical guardrails automatically: protect student privacy under FERPA, report suspected abuse/neglect immediately through mandated channels without conducting an investigation, follow IDEA/IEP team protocols, and build reciprocal, linguistically accessible partnerships with families.',
      remediationPlaybookId: 'plt5621-playbook-ferpa-idea-mandated-reporting-and-family-partnership-traps',
      itemIds: [
        'plt5621-b1-081',
        'plt5621-b1-082',
        'plt5621-b1-083',
        'plt5621-b1-084',
        'plt5621-b1-085',
        'plt5621-b1-086',
        'plt5621-b1-087',
        'plt5621-b1-088',
        'plt5621-b1-089',
        'plt5621-b1-090',
        'plt5621-b1-091',
        'plt5621-b1-092'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'plt5621-playbook-developmental-mismatch-abstract-before-concrete',
      familyId: 'plt5621-developmental-mismatch-abstract-before-concrete',
      familyLabel: 'Developmental Mismatch: Pushing Abstract Worksheets Before Concrete Play and Manipulatives',
      title: 'Match Pre-K–3 Instruction to Concrete, Active, Whole-Child Development',
      recognitionCue: 'A PLT 5621 vignette describes preschool, kindergarten, or grades 1–3 children struggling with a concept or showing varied fine-motor readiness, and distractors prescribe silent worksheet packets, 40-minute teacher lectures, or delaying all instruction until every child matures identically.',
      repairQuestion: 'Does this choice honor young children\'s concrete-to-abstract progression and uneven across-domain development without watering down meaningful learning?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan early-childhood options for developmental red flags: abstract symbolic drills before hands-on modeling, ignoring fine-motor/physical variance across same-age children, or treating cognitive growth apart from social-emotional and language development.',
          requiredOutput: 'Flag the exact developmental mismatch in the distractor and name the cognitive, physical, or social-emotional domain the child actually needs supported.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Connect Piaget\'s preoperational and early concrete-operational stages to the CRA progression (Concrete manipulatives → Representational drawings/models → Abstract symbols) and normal uneven maturation (such as varied pencil grip in kindergarten).',
          requiredOutput: 'Write a two-sentence planning rule explaining how to adapt materials (such as thicker grips, fraction tiles, or science sorting trays) while holding rich conceptual goals.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Redesign two Pre-K–3 lessons: (1) introducing equal parts/fractions to second graders who only recognize one textbook circle diagram, and (2) supporting two 6-year-olds with very different fine-motor control during writer\'s workshop.',
          requiredOutput: 'Specify concrete manipulatives across varied shapes (bars, tiles, sets) for fractions and low-barrier motor scaffolds (adaptive grips, varied line spacing, oral-to-written dictation) for writing.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new PLT 5621 scenario where a teacher plans a science inquiry unit for first graders holding persistent misconceptions about floating and sinking.',
          requiredOutput: 'Choose the developmentally responsive sequence that surfaces prior ideas through hands-on testing and guided reflection rather than lecturing abstract density formulas.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5621-playbook-zpd-over-scaffolding-or-no-scaffolding',
      familyId: 'plt5621-zpd-over-scaffolding-or-no-scaffolding',
      familyLabel: 'Missing the Zone of Proximal Development: Over-Scaffolding or Zero-Scaffold Discovery',
      title: 'Target the Zone of Proximal Development with Contingent, Fading Scaffolds',
      recognitionCue: 'A young learner succeeds on a complex task only with well-timed teacher prompts—or a teacher wants guided inquiry rather than chaotic play—and distractors either declare the task "too hard" and drop it, keep permanent hand-holding, or leave children completely unguided.',
      repairQuestion: 'Is the task positioned right inside the child\'s Zone of Proximal Development, and does the teacher plan to model, prompt contingently, and gradually fade support toward independence?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Sort instructional distractors into two opposite ZPD errors: Under-Scaffolding (unstructured discovery with no criteria or modeling) vs. Over-Scaffolding (permanent dependency or lowering expectations below the child\'s reach).',
          requiredOutput: 'Diagnose which ZPD failure each distractor represents and identify the evidence showing the learner is currently inside the ZPD.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map the four-step explicit-and-scaffolded sequence (Model with think-aloud → Guided practice with prompts → Collaborative/supported practice with fading cues → Independent application) and link Bandura\'s social learning theory to verbalized strategy modeling.',
          requiredOutput: 'State the exact instructional signal that tells an early-childhood teacher when to fade a scaffold vs. when to provide targeted remediation instead of mere repetition.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Plan a teacher response for a kindergarten child who can retell a story with picture cards and teacher sentence starters, plus a second-grade guided inquiry activity that risks becoming unstructured tinkering.',
          requiredOutput: 'Specify how to fade the picture/starter cues step by step for the retell and list two guardrails (focused question + structured observation sheet) that keep inquiry conceptually productive.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply ZPD and gradual-release criteria to a fresh PLT 5621 item testing preassessment, backward planning, or remediation vs. repetition.',
          requiredOutput: 'Select the response that uses preassessment data to pitch instruction inside the ZPD and targets root misconceptions rather than repeating the exact same worksheet.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5621-playbook-punishment-vs-positive-guidance-and-routines',
      familyId: 'plt5621-punishment-vs-positive-guidance-and-routines',
      familyLabel: 'Confusing Punitive Control with Positive Guidance, Predictable Routines, and Reinforcement',
      title: 'Distinguish Positive Guidance and Reinforcement Principles in Pre-K–3',
      recognitionCue: 'A PLT 5621 behavior or motivation item describes a teacher removing an unpleasant extra drill when students hit a goal, or young children melting down during transitions, and distractors mislabel negative reinforcement as punishment or recommend public clip charts and lost recess.',
      repairQuestion: 'Does the consequence increase or decrease a target behavior (reinforcement vs. punishment), and does the classroom routine proactively teach the expected self-regulation skill?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check two axes on every operant-conditioning or guidance item: (1) Is something added (+) or removed (−)? (2) Does the target behavior increase (reinforcement) or decrease (punishment)? Also flag punitive early-childhood traps like public shaming or withholding physical movement.',
          requiredOutput: 'Correctly classify the scenario on the 2×2 operant grid and point out any developmental harm in punitive distractors.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast negative reinforcement (removing an aversive task to strengthen desired fluency/effort) with punishment (weakening an unwanted behavior), and connect Erikson\'s initiative vs. guilt (Pre-K/K) and industry vs. inferiority (Grades 1–3) to specific, effort-focused encouragement and predictable routines.',
          requiredOutput: 'Write one crisp example of negative reinforcement vs. presentation punishment, plus two proactive transition routines (such as 2-minute visual chime warning and modeled cleanup roles).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze two Pre-K–3 cases: (1) a first-grade teacher excuses students from an extra drill sheet once they demonstrate accurate sight-word reading; (2) a preschooler repeatedly grabs blocks during center cleanup.',
          requiredOutput: 'Identify Case 1 as negative reinforcement and design a positive-guidance sequence for Case 2 (calm proximity, visual transition warning, explicit language model for turn-taking, and practiced cleanup routine).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh motivation or classroom-climate scenario involving young children\'s sense of competence (industry vs. inferiority) or peer modeling.',
          requiredOutput: 'Choose the proactive routine that teaches clear behavioral expectations, protects emotional safety, and reinforces genuine mastery rather than compliance through fear.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5621-playbook-summative-only-vs-authentic-formative-play-checks',
      familyId: 'plt5621-summative-only-vs-authentic-formative-play-checks',
      familyLabel: 'Relying on Summative Paper Tests Instead of Authentic Formative and Play-Based Checks',
      title: 'Use Formative Checks, Objective Anecdotals, and Purposeful Portfolios',
      recognitionCue: 'An early-childhood assessment item asks how to monitor young learners\' emerging skills or make anecdotal notes and portfolios useful, and distractors offer subjective labels ("lazy," "smart"), end-of-unit multiple-choice grades, or stuffing every worksheet into a folder.',
      repairQuestion: 'Does this assessment gather objective, criteria-aligned evidence during authentic early-childhood tasks so the teacher can adjust tomorrow\'s instruction?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot three early-childhood assessment traps: (1) using summative tests to do formative monitoring, (2) writing interpretive value judgments instead of objective behavioral observations in anecdotal notes, and (3) confusing a storage folder with a purposeful portfolio.',
          requiredOutput: 'Underline the non-objective wording or purpose mismatch inside each distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Define the four classroom assessment roles: preassessment/diagnostic (uncovers prior knowledge and error patterns before teaching), formative (in-process checks that steer immediate instruction), summative (end-of-unit mastery evaluation), and authentic performance/portfolio (dated, criteria-tagged work samples plus reflection showing growth).',
          requiredOutput: 'Rewrite a flawed anecdotal note ("Leo was unfocused and bad at math today") into an objective, date-stamped behavioral record aligned to a target counting skill.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Match three Pre-K–3 objectives—(1) demonstrating a plant-growth experiment, (2) tracking writing progress across a quarter, (3) identifying why a second grader misses subtraction with regrouping—to the best assessment method (performance task with analytic rubric, purposeful portfolio, or diagnostic probe).',
          requiredOutput: 'Justify each pairing and explain why an analytic rubric beats a single holistic score when giving feedback to young learners and families.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a new early-childhood assessment scenario asking how to keep peer feedback fair or align an assessment with a hands-on science objective.',
          requiredOutput: 'Select the option grounded in explicit, age-appropriate criteria and authentic demonstration rather than a mismatched paper quiz.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5621-playbook-norm-vs-criterion-and-reliability-vs-validity',
      familyId: 'plt5621-norm-vs-criterion-and-reliability-vs-validity',
      familyLabel: 'Confusing Norm- vs. Criterion-Referenced Scores and Reliability vs. Validity',
      title: 'Separate Reliability from Validity and Norm- vs. Criterion-Referenced Meaning',
      recognitionCue: 'A PLT 5621 test-design item describes an assessment that gives identical scores every time yet actually tests reading speed rather than math reasoning—or asks how to interpret a percentile rank vs. a mastery rubric or whether an accommodation harms validity.',
      repairQuestion: 'Is the score flaw about repeatability (reliability) or about measuring the intended construct (validity), and does the score compare the child to peers (norm) or to a fixed learning standard (criterion)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Diagnose psychometric keywords immediately: "consistent/repeatable" signals reliability; "measures what it intends to measure/construct alignment" signals validity; "percentile/compared to national age peers" signals norm-referenced; "meets standard/rubric benchmark" signals criterion-referenced.',
          requiredOutput: 'Map the vignette\'s exact symptom (such as high consistency + wrong construct = reliable but not valid) before reading the answer options.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Lock in two core test rules: (1) a test can be reliable without being valid, though it cannot be valid without reasonable reliability; (2) a valid accommodation (such as reading math word problems aloud to a child with a decoding disability) removes construct-irrelevant barriers and increases validity without changing the math standard.',
          requiredOutput: 'Contrast one valid accommodation (read-aloud on a math reasoning task) with an invalid accommodation (read-aloud on a reading-decoding test) in two concise lines.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate three scenarios: (1) a timed grade-2 math test yields repeatable scores but mostly measures reading speed; (2) a child scores at the 72nd percentile on a screening battery; (3) a child scores 9/10 on a phonemic-blending mastery checklist.',
          requiredOutput: 'Classify each case (reliable/low-validity construct interference; norm-referenced peer rank; criterion-referenced mastery evidence) and state what instructional decision each score can and cannot support.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply the validity and reference-frame checks to a fresh PLT 5621 item on test accommodations or interpreting district benchmark data for an early-childhood team.',
          requiredOutput: 'Select the defensible interpretation that preserves construct validity and never confuses a percentile rank with percentage of items answered correctly.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5621-playbook-ferpa-idea-mandated-reporting-and-family-partnership-traps',
      familyId: 'plt5621-ferpa-idea-mandated-reporting-and-family-partnership-traps',
      familyLabel: 'FERPA Confidentiality, IDEA/IFSP Rights, Mandated Reporting, and Family Partnership Traps',
      title: 'Uphold FERPA, IDEA, Mandated Reporting, and Reciprocal Family Partnerships',
      recognitionCue: 'A professional-responsibility scenario features a caregiver with limited English proficiency, a child needing coordinated speech/OT/academic services, a colleague asking about another child\'s IEP, or a suspected safety concern—and distractors invite informal shortcuts ("ask another student to translate," "wait for proof before reporting," or "talk at parents").',
      repairQuestion: 'Does this response satisfy federal privacy and disability law (FERPA/IDEA), fulfill immediate mandated-reporting duties, and treat families as equitable, linguistically supported partners?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot four high-stakes legal/ethical red flags in distractors: disclosing records to unauthorized parties (FERPA violation), conducting your own abuse investigation or delaying a report, using a child or untrained neighbor to translate confidential school info, or acting solo instead of convening the multidisciplinary team (IDEA).',
          requiredOutput: 'Name the exact legal duty or partnership principle violated by each trap option.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Anchor four non-negotiable protocols: (1) FERPA restricts educational records to parents and staff with legitimate educational interest; (2) IDEA/IFSP requires parental consent, multidisciplinary evaluation, LRE, and coordinated service delivery; (3) mandated reporters report reasonable suspicion immediately through official channels without interrogating the child or family; (4) reciprocal family communication uses qualified interpreters/translated materials and invites caregiver insights.',
          requiredOutput: 'Write a 4-bullet compliance checklist covering FERPA, IDEA collaboration, mandated reporting, and equitable family conferences.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Determine the compliant action for three Pre-K–3 cases: (1) a first grader requires coordinated speech, motor, and classroom reading supports; (2) a parent conference is scheduled for a family speaking primarily Spanish; (3) a classroom paraeducator joins the room to support small-group literacy.',
          requiredOutput: 'Specify the exact collaborative protocol for each case: participate in multidisciplinary IEP coordination, provide a qualified interpreter/translated notices and invite two-way dialogue, and share clear instructional goals/roles with the paraeducator under teacher direction.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh PLT 5621 professional-practice item involving reflective action research, mentor coaching, or non-comparable study claims.',
          requiredOutput: 'Choose the evidence-based, legally compliant, collaborative response while rejecting overgeneralized study claims or unilateral privacy breaches.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const plt_k6_5622 = {
  misconceptionFamilies: [
    {
      id: 'plt5622-passive-coverage-vs-backward-design-alignment',
      label: 'Activity-First Textbook Coverage Instead of Backward Design Alignment',
      description: 'Planning K–6 units by marching page-by-page through a textbook or picking a fun hands-on craft first, rather than unpacking standards into observable, measurable learning objectives, designing aligned evidence of mastery second, and sequencing instructional activities third (backward design).',
      remediationMove: 'Start every unit with unpacked standards and measurable student outcomes, align the assessment directly to the cognitive verb of the objective, and select learning tasks and digital/print resources only when they drive that target evidence.',
      remediationPlaybookId: 'plt5622-playbook-passive-coverage-vs-backward-design-alignment',
      itemIds: [
        'plt5622-b1-031',
        'plt5622-b1-032',
        'plt5622-b1-033',
        'plt5622-b1-034',
        'plt5622-b1-035',
        'plt5622-b1-036',
        'plt5622-b1-037',
        'plt5622-b1-038',
        'plt5622-b1-039',
        'plt5622-b1-040',
        'plt5622-b1-041',
        'plt5622-b1-042'
      ]
    },
    {
      id: 'plt5622-single-modality-vs-udl-and-mtss-differentiation',
      label: 'One-Size-Fits-All Single-Modality Instruction Instead of UDL and Tiered MTSS Differentiation',
      description: 'Delivering identical text-heavy instruction to all K–6 learners—or repeating the same explanation louder when students struggle—instead of proactively designing Universal Design for Learning (UDL) options for representation, engagement, and expression alongside data-driven MTSS/RTI tiered remediation.',
      remediationMove: 'Use preassessment and formative error data to differentiate content access, instructional process, and product options via UDL while preserving grade-level rigor, and deploy targeted Tier 2/Tier 3 remediation when repetition fails to fix underlying conceptual gaps.',
      remediationPlaybookId: 'plt5622-playbook-single-modality-vs-udl-and-mtss-differentiation',
      itemIds: [
        'plt5622-b1-001',
        'plt5622-b1-003',
        'plt5622-b1-004',
        'plt5622-b1-006',
        'plt5622-b1-009',
        'plt5622-b1-010',
        'plt5622-b1-011',
        'plt5622-b1-035',
        'plt5622-b1-037',
        'plt5622-b1-038',
        'plt5622-b1-040',
        'plt5622-b1-070'
      ]
    },
    {
      id: 'plt5622-closed-recall-questioning-vs-dok-wait-time-and-cooperative-accountability',
      label: 'Closed Recall Questioning and Unguided Group Work Instead of Higher-DOK Discourse, Wait Time, and Cooperative Accountability',
      description: 'Limiting K–6 classroom questioning to rapid-fire yes/no recall with zero wait time, calling only on immediate hand-raisers, or assigning unstructured "group projects" where one student does all the work instead of pairing higher-order Depth of Knowledge (DOK) prompts with 3–5 seconds of wait time and structured cooperative accountability.',
      remediationMove: 'Ask open-ended conceptual questions that require evidence and justification, protect 3–5 seconds of wait time (plus think-pair-share) so all learners process, and design cooperative tasks with both positive interdependence and individual accountability.',
      remediationPlaybookId: 'plt5622-playbook-closed-recall-questioning-vs-dok-wait-time-and-cooperative-accountability',
      itemIds: [
        'plt5622-b1-002',
        'plt5622-b1-004',
        'plt5622-b1-005',
        'plt5622-b1-007',
        'plt5622-b1-032',
        'plt5622-b1-033',
        'plt5622-b1-036',
        'plt5622-b1-041',
        'plt5622-b1-042',
        'plt5622-b1-067'
      ]
    },
    {
      id: 'plt5622-reactive-discipline-vs-proactive-classroom-management',
      label: 'Reactive Punitive Discipline Instead of Proactive Classroom Management and Routines',
      description: 'Waiting for off-task K–6 behavior to escalate and responding with public reprimands, whole-class punishment, or inconsistent consequences instead of establishing explicitly taught routines, smooth transitions, logical consequences, positive reinforcement, and supportive conditions for Erikson\'s industry vs. inferiority stage.',
      remediationMove: 'Prevent disruptions proactively through practiced classroom procedures, clear positively stated expectations, active monitoring, and targeted private redirection that preserves dignity and instructional momentum.',
      remediationPlaybookId: 'plt5622-playbook-reactive-discipline-vs-proactive-classroom-management',
      itemIds: [
        'plt5622-b1-005',
        'plt5622-b1-008',
        'plt5622-b1-009',
        'plt5622-b1-010',
        'plt5622-b1-011',
        'plt5622-b1-012',
        'plt5622-b1-033',
        'plt5622-b1-040',
        'plt5622-b1-041',
        'plt5622-b1-042'
      ]
    },
    {
      id: 'plt5622-grade-averaging-vs-error-analysis-and-rubric-alignment',
      label: 'Score Averaging Without Error Analysis, Construct Validity, or Analytic Rubric Alignment',
      description: 'Recording raw quiz averages and moving on—or grading complex K–6 performance tasks with a vague holistic number—instead of analyzing specific error patterns diagnostically, matching assessment format to objective rigor, using analytic rubrics for actionable feedback, and checking reliability, validity, and norm- vs. criterion-referenced meaning.',
      remediationMove: 'Treat classroom assessment as an instructional compass: align tasks directly to objectives, score multi-trait work with transparent analytic rubrics, diagnose recurring error patterns before reteaching, and distinguish reliable consistency from valid construct measurement.',
      remediationPlaybookId: 'plt5622-playbook-grade-averaging-vs-error-analysis-and-rubric-alignment',
      itemIds: [
        'plt5622-b1-061',
        'plt5622-b1-062',
        'plt5622-b1-063',
        'plt5622-b1-064',
        'plt5622-b1-065',
        'plt5622-b1-066',
        'plt5622-b1-067',
        'plt5622-b1-068',
        'plt5622-b1-069',
        'plt5622-b1-070',
        'plt5622-b1-071',
        'plt5622-b1-072'
      ]
    },
    {
      id: 'plt5622-isolated-practice-vs-plc-co-teaching-and-legal-ethics',
      label: 'Isolated Solo Practice Instead of Data-Driven PLCs, Co-Teaching, and Legal/Ethical Compliance',
      description: 'Treating professional growth as one-shot passive workshops, working in isolation from specialists and paraeducators, overclaiming causality from small classroom trials, or neglecting FERPA confidentiality, IDEA team collaboration, and linguistically accessible reciprocal family communication.',
      remediationMove: 'Embed ongoing reflective practice inside collaborative Professional Learning Communities (PLCs) using student work data, coordinate actively with co-teachers, specialists, and paraeducators under clear roles, critically appraise research evidence, and uphold FERPA, IDEA, and equitable family partnership standards.',
      remediationPlaybookId: 'plt5622-playbook-isolated-practice-vs-plc-co-teaching-and-legal-ethics',
      itemIds: [
        'plt5622-b1-081',
        'plt5622-b1-082',
        'plt5622-b1-083',
        'plt5622-b1-084',
        'plt5622-b1-085',
        'plt5622-b1-086',
        'plt5622-b1-087',
        'plt5622-b1-088',
        'plt5622-b1-089',
        'plt5622-b1-090',
        'plt5622-b1-091',
        'plt5622-b1-092'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'plt5622-playbook-passive-coverage-vs-backward-design-alignment',
      familyId: 'plt5622-passive-coverage-vs-backward-design-alignment',
      familyLabel: 'Activity-First Textbook Coverage Instead of Backward Design Alignment',
      title: 'Anchor K–6 Unit Planning in Backward Design and Objective-Assessment Alignment',
      recognitionCue: 'A PLT 5622 planning question asks where to begin a unit, how to unpack a broad standard, or how to pick an educational app—and distractors start with engaging crafts, textbook chapter order, or vague unmeasurable verbs like "understand" and "appreciate."',
      repairQuestion: 'Does the plan move in strict backward-design order (measurable standard outcome → aligned mastery evidence → targeted learning sequence) with every activity serving the exact cognitive verb?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect K–6 planning options for two classic flaws: unmeasurable internal verbs ("know," "appreciate") and misaligned triplets where an objective asks students to compare or analyze while the quiz only tests vocabulary recall.',
          requiredOutput: 'Flag the exact verb mismatch or activity-first shortcut in each distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map the 3-stage Backward Design sequence (1. Unpack standard into observable, measurable objectives → 2. Determine acceptable assessment evidence → 3. Plan scaffolded learning experiences and resources) and contrast curriculum scope (what is taught) with sequence (logical developmental order).',
          requiredOutput: 'Rewrite a vague objective ("Students will understand two historical sources") into an observable, measurable K–6 objective plus one directly aligned assessment task.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Audit an interdisciplinary fourth-grade unit blending math graphing and science weather data, plus a teacher\'s decision between two digital apps—one flashy game and one standards-aligned simulation.',
          requiredOutput: 'Verify that each discipline\'s genuine standards stay intact (avoiding superficial theme crafts) and state why objective alignment—not entertainment value—must lead resource selection.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply backward-design and preassessment logic to a fresh PLT 5622 planning scenario where half the class already mastered a prerequisite skill before the unit begins.',
          requiredOutput: 'Select the plan that uses brief preassessment data to tighten pacing and match aligned learning tasks to verified readiness rather than blind textbook coverage.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5622-playbook-single-modality-vs-udl-and-mtss-differentiation',
      familyId: 'plt5622-single-modality-vs-udl-and-mtss-differentiation',
      familyLabel: 'One-Size-Fits-All Single-Modality Instruction Instead of UDL and Tiered MTSS Differentiation',
      title: 'Differentiate K–6 Access Through UDL and Data-Driven MTSS Remediation',
      recognitionCue: 'A vignette shows diverse elementary learners struggling to transfer fraction concepts across formats, holding science misconceptions, or needing varied access supports—and distractors prescribe repeating the exact same lecture, lowering grade-level standards, or segregating learners permanently.',
      repairQuestion: 'Does this instructional adjustment remove access barriers through UDL (representation, engagement, expression) and targeted MTSS remediation while keeping every student anchored to the core learning standard?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Distinguish genuine UDL/MTSS differentiation from three exam traps: pure repetition (more of the same failed method), tracking/watering down the cognitive standard, and confusing accommodations with modifications.',
          requiredOutput: 'Label each distractor by its exact failure mode (repetition without diagnosis, lowered rigor, or unaligned access barrier).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Connect the three UDL pillars (multiple means of engagement, representation, and action/expression) to MTSS tiers (Tier 1 universal differentiated core → Tier 2 targeted small-group skill remediation → Tier 3 intensive individualized intervention) and concrete-operational scaffolds for elementary learners.',
          requiredOutput: 'Write a clear rule contrasting repetition (building automaticity once a concept is understood) from remediation (re-teaching an underlying misconception using a new representation).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Design a differentiated response for two fifth-grade challenges: (1) students solve fraction addition on worksheets but fail on word problems and number lines; (2) a student with fine-motor fatigue knows the science explanation orally but struggles to write a full page.',
          requiredOutput: 'Pair Challenge 1 with multi-representational transfer practice (visual models + varied contexts) and Challenge 2 with a UDL expression option (speech-to-text, structured graphic organizer, or oral explanation) that preserves the science standard.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new K–6 vignette asking how to keep examples developmentally appropriate without watering down academic expectations or how to evaluate an assessment accommodation.',
          requiredOutput: 'Select the choice that scaffolds access and background connections while preserving construct validity and high expectations.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5622-playbook-closed-recall-questioning-vs-dok-wait-time-and-cooperative-accountability',
      familyId: 'plt5622-closed-recall-questioning-vs-dok-wait-time-and-cooperative-accountability',
      familyLabel: 'Closed Recall Questioning and Unguided Group Work Instead of Higher-DOK Discourse, Wait Time, and Cooperative Accountability',
      title: 'Elevate K–6 Discourse with Higher-DOK Prompts, Wait Time, and Accountable Groups',
      recognitionCue: 'A PLT 5622 instruction item asks how to deepen metacognition, make inquiry productive, or ensure fair peer/group work—and distractors rely on rapid yes/no recall checks, moving immediately to the first raised hand, or assigning one shared group grade with no individual roles.',
      repairQuestion: 'Does this discourse or group routine push student thinking beyond recall, give every learner processing time, and guarantee both group interdependence and individual accountability?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify passive-discourse and group-work traps: closed recall questions (DOK 1) when analysis/justification (DOK 2–3) is required, zero wait time, unstructured "turn and chat" with no protocol, and free-rider group grading.',
          requiredOutput: 'Point out the exact missing element (cognitive level, wait time, metacognitive reflection, or individual accountability) in each distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Combine four research-backed K–6 routines: (1) stem escalation from recall ("What is the main character\'s name?") to justification ("How does your text evidence support that claim?"), (2) 3–5 seconds of wait time + Think-Pair-Share, (3) metacognitive self-monitoring prompts ("Which strategy worked and why?"), and (4) cooperative groups with defined roles plus individual check-ins.',
          requiredOutput: 'Upgrade two closed recall questions into higher-DOK prompts and specify one structure that prevents one student from carrying a 4-person elementary group.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Design (1) a metacognitive routine for fourth graders solving multi-step math problems, and (2) the fairness guardrails needed before third graders conduct peer assessment on persuasive paragraphs.',
          requiredOutput: 'Specify a structured strategy-check/error-reflection routine for math and require explicit rubric criteria, teacher modeling, and constructive sentence frames before peer feedback.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh PLT 5622 scenario contrasting unstructured discovery with teacher-scaffolded inquiry and explicit modeling.',
          requiredOutput: 'Choose the sequence that pairs clear conceptual goals, modeled thinking, guided questioning, and accountable student synthesis.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5622-playbook-reactive-discipline-vs-proactive-classroom-management',
      familyId: 'plt5622-reactive-discipline-vs-proactive-classroom-management',
      familyLabel: 'Reactive Punitive Discipline Instead of Proactive Classroom Management and Routines',
      title: 'Build Proactive K–6 Classroom Routines and Constructive Behavior Support',
      recognitionCue: 'A management or motivation scenario features elementary off-task behavior, transition chaos, or a student losing confidence—and distractors choose sarcastic public call-outs, whole-class recess loss, vague threats, or misidentifying negative reinforcement as punishment.',
      repairQuestion: 'Does this teacher action proactively teach and reinforce clear expectations while protecting student dignity and building elementary competence (industry vs. inferiority)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Flag reactive management errors immediately: escalating publicly in front of peers, punishing the entire class for two students\' actions, adding busywork as a penalty, or confusing removing an unpleasant task (negative reinforcement) with punishment.',
          requiredOutput: 'Explain why each reactive distractor escalates power struggles or undermines intrinsic competence in K–6 learners.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast proactive management (explicitly teaching, modeling, and rehearsing routines; smooth transitions; proximity and nonverbal cues; logical consequences tied to the behavior; specific mastery feedback) with reactive punishment, and link Erikson\'s industry vs. inferiority stage to attainable, scaffolded classroom success.',
          requiredOutput: 'Write a 3-step low-profile redirection ladder (nonverbal proximity/cue → brief private reminder of expected routine → logical consequence/reteach of procedure).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Solve two K–6 scenarios: (1) a fifth-grade teacher removes an unpleasant extra fluency drill once students meet their accuracy target—classify the operant principle; (2) transitions from science labs to reading repeatedly take 9 noisy minutes.',
          requiredOutput: 'Identify Scenario 1 as negative reinforcement (strengthening accuracy by removing an aversive requirement) and write a proactive transition routine for Scenario 2 (clear timer cue, modeled cleanup jobs, practiced rehearsal, and specific positive feedback).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply proactive-climate and social-learning principles to a new scenario supporting a hesitant fourth grader who avoids challenging tasks for fear of failing in front of peers.',
          requiredOutput: 'Select the classroom condition that pairs modeled problem-solving, manageable growth goals, and private effort-linked feedback to build genuine industry.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5622-playbook-grade-averaging-vs-error-analysis-and-rubric-alignment',
      familyId: 'plt5622-grade-averaging-vs-error-analysis-and-rubric-alignment',
      familyLabel: 'Score Averaging Without Error Analysis, Construct Validity, or Analytic Rubric Alignment',
      title: 'Turn K–6 Assessments into Diagnostic Error Analysis and Rubric-Aligned Feedback',
      recognitionCue: 'An assessment item asks why an analytic rubric outperforms a holistic score, when performance tasks beat selected response, why a consistent test can still be invalid, or how to use formative and diagnostic evidence—and distractors focus on grading speed, ranking peers, or raw average percentages.',
      repairQuestion: 'Does this assessment choice diagnose exact skill gaps, align directly to the performance demanded by the standard, and give students criterion-specific feedback for revision?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot four recurring PLT 5622 assessment traps: equating formative checks with graded mini-summative quizzes, choosing a holistic score when students need trait-by-trait feedback, mistaking score consistency (reliability) for construct validity, and conflating norm-referenced percentiles with criterion-referenced mastery.',
          requiredOutput: 'Name the exact assessment concept tested in the stem (diagnostic, formative, summative, analytic rubric, portfolio, validity, or norm vs. criterion).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Build a sharp decision matrix: selected-response efficiently checks factual/conceptual breadth; performance tasks assess complex multi-step execution (like conducting and explaining an experiment); analytic rubrics isolate strengths and next steps per criterion; reliability = consistency across administrations while validity = accurate measurement of the target construct.',
          requiredOutput: 'Write a 2-sentence explanation of why a highly reliable science test that mostly measures reading speed fails construct validity and how an accommodation can restore validity.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze three K–6 assessment problems: (1) grading a fifth-grade lab investigation and written explanation; (2) turning a stack of completed math papers into a purposeful portfolio; (3) interpreting a third grader\'s 65th percentile reading score vs. 85% mastery on a fraction-equivalence rubric.',
          requiredOutput: 'Specify an analytic rubric aligned to investigation and explanation traits, require dated criteria-linked samples plus student reflection for the portfolio, and contrast the norm-referenced peer standing with criterion-referenced standard mastery.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh PLT 5622 scenario where half a class misses items on an exit ticket and a teacher must decide between averaging the score into the gradebook or conducting error analysis.',
          requiredOutput: 'Select the formative error-analysis move that groups students by specific misconception and adjusts the next lesson before summative evaluation.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5622-playbook-isolated-practice-vs-plc-co-teaching-and-legal-ethics',
      familyId: 'plt5622-isolated-practice-vs-plc-co-teaching-and-legal-ethics',
      familyLabel: 'Isolated Solo Practice Instead of Data-Driven PLCs, Co-Teaching, and Legal/Ethical Compliance',
      title: 'Lead Collaborative PLCs, Co-Teaching, Research Literacy, and Legal Ethics in K–6',
      recognitionCue: 'A professional-practice scenario covers peer observations, mentor feedback, classroom action research, IEP/specialist coordination, paraeducator supervision, or family communication—and distractors choose unaligned one-day workshops, unshared solo fixes, sweeping causal claims from tiny trials, or one-way English-only notices.',
      repairQuestion: 'Does this professional move embed sustained data-driven collaboration (PLC/co-teaching/mentoring), apply disciplined evidence limits, and honor legal and equitable family-partnership duties?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot five professional-domain distractors: one-shot PD without classroom follow-up, unfocused peer observation with no agreed lens, causal overclaiming from non-equivalent comparison groups, leaving paraeducators or specialists unbriefed, and one-way caregiver reporting without language access.',
          requiredOutput: 'Identify the specific collaboration, research-literacy, or legal-ethics gap embedded in each distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Establish five PLT 5622 professional standards: (1) effective PD is sustained, job-embedded, and tied to student evidence; (2) peer observation begins with a mutually agreed focus and non-evaluative protocol; (3) small action-research cycles inform local practice adjustment rather than universal proof; (4) teachers coordinate IEP/specialist/paraeducator supports around shared student goals; (5) schools ensure legally required language access (qualified translation/interpretation) and reciprocal family dialogue while safeguarding FERPA confidentiality.',
          requiredOutput: 'Write one actionable SMART-style professional goal tied to student learning data and one protocol for establishing shared focus before a peer observation.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Resolve three K–6 leadership cases: (1) a program study shows higher scores than a non-equivalent comparison group; (2) a fourth-grade PLC starts a team action plan for reading comprehension; (3) a teacher collaborates with an SLP, OT, and classroom paraeducator for a student with an IEP.',
          requiredOutput: 'State why baseline group differences prevent causal proof in Case 1, begin Case 2 by analyzing shared student data to define a measurable target, and outline clear coordinated roles and regular check-ins for specialists and the paraeducator in Case 3.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh PLT 5622 item on reciprocal family conferences, mentor coaching for a new teacher, or communicating essential academic updates to caregivers with limited English proficiency.',
          requiredOutput: 'Select the choice that builds two-way partnership, provides qualified translated communication, and connects collaborative reflection directly to improved K–6 student outcomes.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

module.exports = {
  praxis_core_5752,
  parapro,
  plt_early_childhood_5621,
  plt_k6_5622
};
