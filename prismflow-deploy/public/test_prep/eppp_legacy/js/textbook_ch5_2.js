/* ============================================================
   PasstheEPPP — Textbook Ch 2: Cognitive & Intellectual Assessment
   Domain: Assessment & Diagnosis (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-2',
    domain: 'Assessment & Diagnosis',
    domainNumber: 1,
    title: 'Cognitive & Intellectual Assessment',
    examWeight: '16%',
    sections: [
    {
        "heading": "Why This Chapter Matters",
        "content": "<p>Cognitive assessment questions require more than memorizing test names. The central skills are matching an instrument to the referral question and examinee, interpreting scores with their norms and measurement limits, and integrating intellectual, adaptive, developmental, cultural, linguistic, medical, and validity evidence.</p><p><strong>Blueprint scope:</strong> In the current EPPP Part 1-Knowledge blueprint for 2026-2027, Assessment and Diagnosis represents 16% of scored content. ASPPB has announced an integrated content structure for the transition beginning in fall 2027, so this chapter labels current exam facts separately from enduring assessment principles.</p>"
    },
    {
        "heading": "CHC Theory: The Map of Human Intelligence",
        "content": "<p>The <strong>Cattell-Horn-Carroll (CHC)</strong> framework is a prominent hierarchical account of cognitive abilities that integrates Cattell-Horn Gf-Gc traditions with Carroll's factor-analytic hierarchy. It is influential in test development and interpretation, but its taxonomy has evolved and should not be treated as a fixed list of exactly 16 broad or 80 narrow abilities.</p><p><strong>Three levels:</strong></p><table><tr><th>Level</th><th>Construct</th><th>Interpretive caution</th></tr><tr><td>Higher order</td><td>General ability (<em>g</em>)</td><td>Represents variance shared across diverse cognitive tasks.</td></tr><tr><td>Broad</td><td>Examples include Gf, Gc, Gv, Gwm, Gs, Glr, Ga, and Gq</td><td>The number and labels depend on the CHC formulation being used.</td></tr><tr><td>Narrow</td><td>More specific abilities beneath broad domains</td><td>A subtest can draw on several abilities and task demands.</td></tr></table><p><strong>High-yield broad abilities:</strong></p><table><tr><th>Code</th><th>Ability</th><th>Illustrative tasks</th><th>Approximate test-index relation</th></tr><tr><td><strong>Gf</strong></td><td>Fluid reasoning</td><td>Novel pattern or quantitative reasoning</td><td>Often emphasized by fluid-reasoning indices</td></tr><tr><td><strong>Gc</strong></td><td>Comprehension-knowledge</td><td>Vocabulary and acquired knowledge</td><td>Often emphasized by verbal-comprehension indices</td></tr><tr><td><strong>Gv</strong></td><td>Visual processing</td><td>Spatial relations and visualization</td><td>Often emphasized by visual-spatial indices</td></tr><tr><td><strong>Gwm</strong></td><td>Working memory capacity</td><td>Maintaining or manipulating information</td><td>Often emphasized by working-memory indices</td></tr><tr><td><strong>Gs</strong></td><td>Processing speed</td><td>Rapid, accurate performance on simple tasks</td><td>Often emphasized by processing-speed indices</td></tr><tr><td><strong>Glr</strong></td><td>Long-term storage and retrieval</td><td>Learning and fluent retrieval</td><td>May be represented by supplementary measures</td></tr><tr><td><strong>Ga</strong></td><td>Auditory processing</td><td>Discriminating and analyzing sounds</td><td>No universal one-to-one Wechsler index</td></tr></table><p><strong>Developmental nuance:</strong> Performance on many fluid-reasoning and speeded tasks tends to show earlier age-related decline than accumulated knowledge. Crystallized knowledge is often maintained longer, but neither trajectory is universal; education, cohort, health, sensory status, practice, and the specific task all matter.</p>",
        "keyTerms": [
            "CHC theory",
            "Cattell-Horn-Carroll",
            "Gf",
            "Gc",
            "Gv",
            "Gwm",
            "Gs",
            "Glr",
            "Three-stratum",
            "g factor"
        ],
        "interactiveDiagram": {
            "title": "CHC Hierarchy: From General to Specific",
            "description": "Accessible hierarchy showing general ability, illustrative broad CHC abilities, and narrower examples, with a reminder that test tasks can reflect multiple abilities.",
            "svg": "<svg viewBox=\"0 0 860 360\" width=\"100%\" role=\"img\" aria-labelledby=\"ch2ChcTitle ch2ChcDesc\" xmlns=\"http://www.w3.org/2000/svg\"><title id=\"ch2ChcTitle\">CHC hierarchical model</title><desc id=\"ch2ChcDesc\">General cognitive ability appears at the top, several illustrative broad abilities appear in the middle, and example narrow abilities and tasks appear at the bottom. Arrows show that test performance can reflect more than one ability, so index-to-ability mappings are approximate rather than one-to-one.</desc><defs><marker id=\"ch2Arrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"6\" markerHeight=\"6\" orient=\"auto\"><path d=\"M0 0L10 5L0 10Z\" fill=\"#94a3b8\"/></marker></defs><rect x=\"330\" y=\"25\" width=\"200\" height=\"58\" rx=\"14\" fill=\"#312e81\" stroke=\"#818cf8\" stroke-width=\"2\"/><text x=\"430\" y=\"51\" text-anchor=\"middle\" fill=\"#e0e7ff\" font-weight=\"bold\">General ability (g)</text><text x=\"430\" y=\"70\" text-anchor=\"middle\" fill=\"#c7d2fe\" font-size=\"12\">higher-order common variance</text><path d=\"M430 83V118\" stroke=\"#94a3b8\" stroke-width=\"2\" marker-end=\"url(#ch2Arrow)\"/><text x=\"430\" y=\"111\" text-anchor=\"middle\" fill=\"#cbd5e1\" font-size=\"12\">broad abilities</text><g font-size=\"13\" text-anchor=\"middle\"><rect x=\"40\" y=\"130\" width=\"130\" height=\"58\" rx=\"12\" fill=\"#0f766e\"/><text x=\"105\" y=\"154\" fill=\"white\" font-weight=\"bold\">Gf</text><text x=\"105\" y=\"173\" fill=\"#ccfbf1\">fluid reasoning</text><rect x=\"185\" y=\"130\" width=\"130\" height=\"58\" rx=\"12\" fill=\"#0369a1\"/><text x=\"250\" y=\"154\" fill=\"white\" font-weight=\"bold\">Gc</text><text x=\"250\" y=\"173\" fill=\"#e0f2fe\">knowledge</text><rect x=\"330\" y=\"130\" width=\"130\" height=\"58\" rx=\"12\" fill=\"#7c3aed\"/><text x=\"395\" y=\"154\" fill=\"white\" font-weight=\"bold\">Gv</text><text x=\"395\" y=\"173\" fill=\"#ede9fe\">visual processing</text><rect x=\"475\" y=\"130\" width=\"130\" height=\"58\" rx=\"12\" fill=\"#b45309\"/><text x=\"540\" y=\"154\" fill=\"white\" font-weight=\"bold\">Gwm</text><text x=\"540\" y=\"173\" fill=\"#fef3c7\">working memory</text><rect x=\"620\" y=\"130\" width=\"130\" height=\"58\" rx=\"12\" fill=\"#be123c\"/><text x=\"685\" y=\"154\" fill=\"white\" font-weight=\"bold\">Gs</text><text x=\"685\" y=\"173\" fill=\"#ffe4e6\">processing speed</text></g><g stroke=\"#94a3b8\" stroke-width=\"2\" marker-end=\"url(#ch2Arrow)\"><path d=\"M105 188V238\"/><path d=\"M250 188V238\"/><path d=\"M395 188V238\"/><path d=\"M540 188V238\"/><path d=\"M685 188V238\"/></g><g font-size=\"12\" text-anchor=\"middle\"><rect x=\"30\" y=\"250\" width=\"150\" height=\"65\" rx=\"10\" fill=\"#1e293b\" stroke=\"#475569\"/><text x=\"105\" y=\"276\" fill=\"#e2e8f0\">induction</text><text x=\"105\" y=\"296\" fill=\"#cbd5e1\">quantitative reasoning</text><rect x=\"175\" y=\"250\" width=\"150\" height=\"65\" rx=\"10\" fill=\"#1e293b\" stroke=\"#475569\"/><text x=\"250\" y=\"276\" fill=\"#e2e8f0\">lexical knowledge</text><text x=\"250\" y=\"296\" fill=\"#cbd5e1\">general information</text><rect x=\"320\" y=\"250\" width=\"150\" height=\"65\" rx=\"10\" fill=\"#1e293b\" stroke=\"#475569\"/><text x=\"395\" y=\"276\" fill=\"#e2e8f0\">spatial relations</text><text x=\"395\" y=\"296\" fill=\"#cbd5e1\">visualization</text><rect x=\"465\" y=\"250\" width=\"150\" height=\"65\" rx=\"10\" fill=\"#1e293b\" stroke=\"#475569\"/><text x=\"540\" y=\"276\" fill=\"#e2e8f0\">memory span</text><text x=\"540\" y=\"296\" fill=\"#cbd5e1\">manipulation tasks</text><rect x=\"610\" y=\"250\" width=\"150\" height=\"65\" rx=\"10\" fill=\"#1e293b\" stroke=\"#475569\"/><text x=\"685\" y=\"276\" fill=\"#e2e8f0\">perceptual speed</text><text x=\"685\" y=\"296\" fill=\"#cbd5e1\">timed scanning</text></g><text x=\"430\" y=\"344\" text-anchor=\"middle\" fill=\"#fbbf24\" font-size=\"12\">Illustrative hierarchy: specific tasks may draw on multiple abilities; consult the instrument manual.</text></svg>"
        }
    },
    {
        "heading": "The Wechsler Scales",
        "content": "<p>The Wechsler scales are major individually administered cognitive batteries. Select the edition and norms appropriate to the examinee and referral question, and verify administration, scoring, composite construction, and interpretation in the current manual.</p><table><tr><th>Test</th><th>Published age range</th><th>Current edition</th><th>Use note</th></tr><tr><td><strong>WPPSI</strong></td><td>2:6-7:7</td><td>WPPSI-IV</td><td>Subtests and composites vary by age band.</td></tr><tr><td><strong>WISC</strong></td><td>6:0-16:11</td><td>WISC-V</td><td>Child and adolescent battery; consult manual for FSIQ and index composition.</td></tr><tr><td><strong>WAIS</strong></td><td>16:0-90:11</td><td>WAIS-5</td><td>Adult battery published in 2024; structure differs from WAIS-IV and from WISC-V.</td></tr></table><p><strong>Common index families and representative tasks:</strong></p><table><tr><th>Index family</th><th>Abbreviation</th><th>Representative tasks</th><th>Primary CHC emphasis</th></tr><tr><td>Verbal Comprehension</td><td>VCI</td><td>Similarities, vocabulary</td><td>Gc</td></tr><tr><td>Visual Spatial</td><td>VSI</td><td>Block construction or spatial analysis</td><td>Gv</td></tr><tr><td>Fluid Reasoning</td><td>FRI</td><td>Matrix or quantitative reasoning</td><td>Gf</td></tr><tr><td>Working Memory</td><td>WMI</td><td>Sequencing or mental manipulation</td><td>Gwm</td></tr><tr><td>Processing Speed</td><td>PSI</td><td>Rapid visual scanning or coding</td><td>Gs</td></tr></table><p>These are <em>representative</em> relationships, not interchangeable subtest lists across editions. WAIS-5 expanded its index structure and task set; WISC-V and WPPSI-IV have their own age-based rules.</p><p><strong>Score metric:</strong> Many Wechsler subtest scaled scores use mean 10 and SD 3, while many index and IQ standard scores use mean 100 and SD 15. Qualitative labels and boundaries must be taken from the applicable manual and are descriptive score bands, not diagnoses. Interpret confidence intervals, base rates, validity, and the full clinical context rather than a label alone.</p>",
        "keyTerms": [
            "WAIS-5",
            "WISC-V",
            "WPPSI-IV",
            "FSIQ",
            "VCI",
            "VSI",
            "FRI",
            "WMI",
            "PSI",
            "Scaled score",
            "Standard score"
        ]
    },
    {
        "heading": "Other Major Intelligence Tests",
        "content": "<p><strong>Stanford-Binet Intelligence Scales, Fifth Edition (SB5):</strong></p><ul><li>Published for ages 2 through 85+.</li><li>Includes verbal and nonverbal routes across Fluid Reasoning, Knowledge, Quantitative Reasoning, Visual-Spatial Processing, and Working Memory.</li><li>Modern scores are deviation scores; the historical ratio IQ formula was mental age / chronological age &times; 100.</li></ul><p><strong>Kaufman Assessment Battery for Children, Second Edition (KABC-II):</strong></p><ul><li>Published for ages 3-18 and permits interpretation through Luria-based or CHC-based models.</li><li>Its design includes language-reduced options, but no cognitive test is culture-free. Selection and interpretation still require evidence about language proficiency, acculturation, disability access, norms, and the intended use.</li></ul><p><strong>Bayley Scales of Infant and Toddler Development, Fourth Edition (Bayley-4):</strong></p><ul><li>Published age range is 16 days through 42 months.</li><li>Assesses cognitive, language, motor, social-emotional, and adaptive behavior development through different task and report components.</li><li>Used to describe development and identify follow-up needs; early scores should not be treated as fixed predictions of later adult intelligence.</li></ul>",
        "keyTerms": [
            "Stanford-Binet",
            "SB5",
            "Binet",
            "Terman",
            "Ratio IQ",
            "Deviation IQ",
            "KABC-II",
            "Kaufman",
            "Bayley-4"
        ]
    },
    {
        "heading": "Cognitive Screening Tools",
        "content": "<p>Brief cognitive screeners identify whether more evaluation may be warranted; they do <strong>not</strong> by themselves diagnose mild cognitive impairment, dementia, or a specific disorder. Choose a validated version and interpret it with the person's baseline, education, language, culture, sensory or motor access, medical status, medications, mood, daily functioning, and local norms.</p><table><tr><th>Tool</th><th>Illustrative coverage</th><th>Strength</th><th>Cut-score caution</th></tr><tr><td><strong>MMSE</strong></td><td>Orientation, registration, attention, recall, language</td><td>Widely recognized brief global screen</td><td>No single score universally separates normal from impaired; version, population, education, and purpose matter.</td></tr><tr><td><strong>MoCA</strong></td><td>Attention, executive, memory, language, visuospatial, abstraction, calculation, orientation</td><td>Includes executive and complex tasks useful when subtle decline is a concern</td><td>The original conventional threshold was 26 or above, with an education adjustment in the standard version, but official versions and validated norms must guide interpretation.</td></tr></table><p><strong>Exam reasoning:</strong> Among common brief options, the MoCA is often favored when mild or executive change is the referral concern. That is a selection principle, not permission to diagnose from one score. Abnormal or declining results should lead to history, functional assessment, collateral information, medical evaluation, and, when indicated, comprehensive neuropsychological assessment.</p>",
        "keyTerms": [
            "MMSE",
            "MoCA",
            "Screening",
            "MCI",
            "Sensitivity",
            "Dementia",
            "Norms"
        ],
        "knowledgeCheck": {
            "question": "A 68-year-old reports subtle memory change but still manages complex daily activities. Among these options, what is the best next assessment step?",
            "options": [
                "Diagnose dementia from an MMSE score below 24",
                "Use a validated MoCA version as a brief screen, interpret it in context, and follow up as indicated",
                "Administer the WAIS-5 and diagnose mild cognitive impairment from the FSIQ",
                "Assume intact finances rule out clinically meaningful change"
            ],
            "answer": 1,
            "rationale": "The MoCA includes executive and other tasks that can be useful when subtle change is suspected, but a screener is not diagnostic. Version-specific norms, baseline and contextual factors, daily functioning, collateral and medical information, and follow-up assessment determine the interpretation."
        }
    },
    {
        "heading": "Adaptive Behavior Assessment",
        "content": "<p>Adaptive behavior refers to learned <strong>conceptual, social, and practical skills</strong> used in everyday life. Under DSM-5-TR and AAIDD frameworks, evaluating intellectual disability requires evidence about both intellectual and adaptive functioning plus developmental onset; an IQ score alone is insufficient.</p><ul><li><strong>Conceptual:</strong> language, literacy, number concepts, time, money, and self-direction.</li><li><strong>Social:</strong> interpersonal judgment, communication, responsibility, and understanding social expectations.</li><li><strong>Practical:</strong> personal care, health and safety, routines, travel, work, and community participation.</li></ul><table><tr><th>Instrument</th><th>Published range</th><th>Method and caution</th></tr><tr><td><strong>Vineland-3</strong></td><td>Interview and parent/caregiver forms: birth-90; teacher form: 3-21</td><td>Standardized informant measures of communication, daily living, socialization, and optional motor or maladaptive content. Informant, setting, and opportunity affect ratings.</td></tr><tr><td><strong>ABAS-3</strong></td><td>Across the lifespan</td><td>Rating forms sample multiple practical skill areas. Use the appropriate respondent and integrate cross-setting evidence.</td></tr></table><p><strong>Interpretive principle:</strong> Describe strengths and support needs in the person's actual environments. Consider culture, language, community expectations, opportunity, communication access, and co-occurring conditions before attributing a low rating to disability.</p>",
        "keyTerms": [
            "Adaptive behavior",
            "Vineland-3",
            "ABAS-3",
            "AAIDD",
            "DSM-5-TR",
            "Conceptual",
            "Social",
            "Practical"
        ]
    },
    {
        "heading": "The Flynn Effect",
        "content": "<p>The <strong>Flynn effect</strong> describes historical cohort increases in performance on many intelligence-test measures. A large meta-analysis estimated an overall gain near 2.31 IQ points per decade, but effects varied greatly by ability, country, age, time period, and study design; some samples show slowing or reversal.</p><p><strong>Clinical implication:</strong> Aging norms can change a person's standing relative to the reference group. Use the most current appropriate norms and document any limitation. Do <em>not</em> mechanically subtract a fixed number of points or call the adjusted value a person's true IQ. Diagnosis also requires confidence intervals, adaptive functioning, developmental and contextual evidence, and the governing clinical or legal standard.</p><ul><li>Norm obsolescence is one possible interpretation issue, not an automatic explanation for an unexpected score.</li><li>Revisions may change content, scaling, norms, and constructs at the same time, so edition differences are not a pure Flynn-effect correction.</li><li>Fair high-stakes decisions require current evidence, not a universal points-per-decade rule.</li></ul>",
        "keyTerms": [
            "Flynn effect",
            "Cohort effect",
            "Norm obsolescence",
            "Test norms",
            "Measurement uncertainty"
        ]
    },
    {
        "heading": "Malingering and Performance Validity",
        "content": "<p><strong>Malingering</strong> is the intentional production of false or grossly exaggerated symptoms for external incentives. DSM-5-TR lists it as a condition that may be a focus of clinical attention (Z76.5), not a mental disorder. Intent cannot be inferred from one low score.</p><table><tr><th>Concept</th><th>Intentional symptom production?</th><th>Defining context</th></tr><tr><td><strong>Malingering</strong></td><td>Yes</td><td>External incentive; conclusion requires converging evidence about intent and context.</td></tr><tr><td><strong>Factitious disorder</strong></td><td>Yes, deception is present</td><td>Behavior occurs without an obvious external reward; motivations should not be reduced to seeking attention.</td></tr><tr><td><strong>Somatic symptom disorder</strong></td><td>No requirement for deception</td><td>Distressing thoughts, feelings, or behaviors related to symptoms.</td></tr><tr><td><strong>Functional neurological symptom disorder</strong></td><td>No requirement for deception</td><td>Neurological-type symptoms show clinical incompatibility with recognized disease patterns; neurological disease can coexist.</td></tr></table><p><strong>Performance validity tests (PVTs), including the TOMM:</strong></p><ul><li>Evaluate whether test performance provides a valid estimate of the targeted ability under the assessment conditions.</li><li>The TOMM is a visual recognition PVT with learning trials and an optional retention trial.</li><li>A below-criterion result may reflect several factors, including misunderstanding, language or access barriers, severe impairment, fluctuating engagement, psychiatric or medical factors, or intentional underperformance.</li><li>Interpret embedded and stand-alone indicators using their validated populations and cut scores, patterns across measures, behavioral observations, history, and collateral evidence.</li></ul><p><strong>Core distinction:</strong> Invalid cognitive findings limit what can be concluded from those scores. They should not automatically be equated with malingering, and a forensic setting alone is not proof of invalidity or deception.</p>",
        "keyTerms": [
            "Malingering",
            "Performance validity",
            "PVT",
            "TOMM",
            "Factitious disorder",
            "Z76.5",
            "Converging evidence"
        ],
        "knowledgeCheck": {
            "question": "An examinee scores below criterion on one stand-alone performance validity test. What is the most defensible conclusion?",
            "options": [
                "The examinee is malingering because a failed PVT proves intent",
                "All neurological impairment can be ruled out",
                "The affected cognitive scores may not validly estimate ability; integrate multiple validity indicators and context before drawing conclusions about cause or intent",
                "The result should be ignored whenever the examinee has a diagnosed disorder"
            ],
            "answer": 2,
            "rationale": "A low PVT result raises concern about whether the associated performance is interpretable. It does not, by itself, identify why validity was reduced or establish intentional deception. Conclusions require validated indicators, history, observations, access and medical factors, collateral evidence, and the assessment context."
        }
    },
    {
        "heading": "Clinical vs. Actuarial Prediction",
        "content": "<p><strong>Clinical prediction</strong> combines information through informal professional judgment; <strong>mechanical or actuarial prediction</strong> uses an explicit, reproducible rule. Grove and colleagues' meta-analysis found mechanical methods about 10% more accurate on average. Mechanical prediction was often equal or better, but not universally superior in every study or application.</p><p><strong>Why explicit rules can help:</strong> They apply weights consistently and reduce hindsight, availability, and confirmation biases. Their advantage depends on using a validated, current rule in a population and setting sufficiently similar to the one for which it was developed.</p><ul><li>Do not use a model outside its intended population, outcome, time horizon, or decision threshold without supporting validation.</li><li>Clinicians still define the question, verify data quality, assess applicability and fairness, communicate uncertainty, and act on information the model was not designed to process.</li><li>A rare, objectively verified event may place a case outside a rule's scope. This is a reason to document non-applicability or update the inputs, not a general license for intuition to override an inconvenient result.</li></ul><p><strong>Exam principle:</strong> Prefer a well-validated, applicable mechanical method over unaided intuition for the same prediction task. First check whether the rule is actually appropriate for the person, setting, and decision.</p>",
        "keyTerms": [
            "Paul Meehl",
            "Clinical prediction",
            "Actuarial prediction",
            "Mechanical prediction",
            "Applicability",
            "Grove meta-analysis"
        ],
        "expandableCase": {
            "title": "When a Model Is Outside Scope",
            "clinicalDescription": "An attendance model uses prior visits and scheduling variables to estimate whether a patient will attend group therapy. After the prediction is generated, the patient is admitted to a hospital and the group program confirms that attendance is impossible.",
            "diagnosis": "Documented Non-Applicability or Updated Input",
            "explanation": "The new event is objective information that the model did not represent. The defensible response is to document why the original prediction is no longer applicable or rerun an approved model with updated inputs. This example does not justify replacing validated rules with intuition whenever clinician and model disagree."
        }
    },
    {
        "heading": "Intellectual Disability & Giftedness",
        "content": "<p><strong>Intellectual disability (DSM-5-TR):</strong> Diagnosis requires deficits in intellectual functions confirmed through clinical assessment and individualized standardized testing; deficits in adaptive functioning that limit independence and social responsibility; and onset during the developmental period. AAIDD similarly requires significant limitations in intellectual and adaptive functioning and currently operationalizes developmental onset as before age 22.</p><p>An IQ around two standard deviations below the mean, with allowance for measurement error, is relevant evidence rather than a stand-alone diagnostic cutoff. The commonly discussed 65-75 range reflects uncertainty around an approximate score of 70, not a separate category.</p><table><tr><th>Adaptive domain</th><th>Assessment focus</th><th>Support-oriented interpretation</th></tr><tr><td>Conceptual</td><td>Language, literacy, number, time, money, and self-direction in context</td><td>Identify tasks, environments, instruction, and communication supports that improve participation.</td></tr><tr><td>Social</td><td>Communication, relationships, judgment, and recognition of risk or exploitation</td><td>Describe strengths and situation-specific support needs without assuming a fixed social capacity.</td></tr><tr><td>Practical</td><td>Personal care, routines, work, health, safety, travel, and community living</td><td>Base conclusions on actual opportunity and functioning across relevant settings.</td></tr></table><p>DSM-5-TR severity levels are based on adaptive functioning and needed supports, not IQ bands. Profiles vary within every level and can change with effective supports, education, health, and opportunity.</p><p><strong>Giftedness:</strong> IQ at or above 130 is a common psychometric convention, but schools, programs, and jurisdictions use different definitions and may consider achievement, creativity, motivation, opportunity, and local criteria. <strong>Twice-exceptional</strong> describes high ability together with a disability; one can mask the other, so assessment should examine both strengths and access needs.</p>",
        "keyTerms": [
            "Intellectual disability",
            "DSM-5-TR criteria",
            "AAIDD",
            "Adaptive functioning severity",
            "Measurement error",
            "Giftedness",
            "Renzulli",
            "Twice-exceptional"
        ]
    }
],
    aiCoda: {
    "teaser": "Can human cognitive tests measure an AI system?",
    "content": "<p>Human cognitive tests are standardized for defined human populations, tasks, and uses. An AI system can produce an answer that resembles a test response, but that does not make a human IQ, index, or adaptive-behavior score valid for the system. Training-data exposure, interface design, stochastic output, tool access, and lack of human development can all change what the performance means.</p><p>The same caution applies to CHC labels. Calling a model's text output crystallized intelligence or its latency processing speed is an analogy, not a validated measurement interpretation. Evidence would be needed for the construct, comparison population, administration conditions, reliability, and intended decision.</p><p>Adaptive-functioning and disability frameworks describe people in social and developmental contexts. Lack of embodiment in software must not be equated with intellectual disability or a human support-needs classification. The useful lesson is about <strong>validity and scope</strong>: a score has meaning only when evidence supports the inference and use being made from it.</p><p>Prediction tools also require human accountability. A model may combine data consistently, but professionals remain responsible for data quality, population fit, fairness, uncertainty, communication, and consequences.</p>",
    "studyNote": "<strong>Study note:</strong> Screeners are not diagnoses; performance validity is not synonymous with malingering; intellectual disability requires intellectual and adaptive evidence plus developmental onset; and a validated, applicable mechanical rule generally improves consistency over unaided intuition."
},
    references: [
        'American Association on Intellectual and Developmental Disabilities. (2021). <em>Intellectual disability: Definition, diagnosis, classification, and systems of supports</em> (12th ed.). AAIDD.',
        'American Psychiatric Association. (2022). <em>Diagnostic and statistical manual of mental disorders</em> (5th ed., text rev.). APA.',
        'Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. <em>Psychological Bulletin, 56</em>(2), 81\u2013105.',
        'Flynn, J. R. (1987). Massive IQ gains in 14 nations: What IQ tests really measure. <em>Psychological Bulletin, 101</em>(2), 171\u2013191.',
        'Grove, W. M., Zald, D. H., Lebow, B. S., Snitz, B. E., & Nelson, C. (2000). Clinical versus mechanical prediction: A meta-analysis. <em>Psychological Assessment, 12</em>(1), 19\u201330.',
        'McGrew, K. S. (2009). CHC theory and the human cognitive abilities project: Standing on the shoulders of the giants of psychometric intelligence research. <em>Intelligence, 37</em>(1), 1\u201310.',
        'Meehl, P. E. (1954). <em>Clinical versus statistical prediction: A theoretical analysis and a review of the evidence</em>. University of Minnesota Press.',
        'Nasreddine, Z. S., Phillips, N. A., B\u00e9dirian, V., et al. (2005). The Montreal Cognitive Assessment, MoCA: A brief screening tool for mild cognitive impairment. <em>Journal of the American Geriatrics Society, 53</em>(4), 695\u2013699.',
        'Renzulli, J. S. (2005). The three-ring conception of giftedness. In R. J. Sternberg & J. E. Davidson (Eds.), <em>Conceptions of giftedness</em> (2nd ed., pp. 246\u2013279). Cambridge University Press.',
        'Sparrow, S. S., Cicchetti, D. V., & Saulnier, C. A. (2016). <em>Vineland Adaptive Behavior Scales</em> (3rd ed.). Pearson.',
        'Sweet, J. J., Heilbronner, R. L., Morgan, J. E., et al. (2021). American Academy of Clinical Neuropsychology consensus conference statement on validity assessment. <em>The Clinical Neuropsychologist, 35</em>(6), 1053-1106.',
        'Trahan, L. H., Stuebing, K. K., Fletcher, J. M., & Hiscock, M. (2014). The Flynn effect: A meta-analysis. <em>Psychological Bulletin, 140</em>(5), 1332-1360.',
        'Wechsler, D. (2024). <em>Wechsler Adult Intelligence Scale</em> (5th ed.). Pearson.'
    ]
});
