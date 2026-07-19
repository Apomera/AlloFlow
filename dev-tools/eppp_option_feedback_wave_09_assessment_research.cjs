'use strict';

const revisions = {
  'eppp-b004-assessment-2': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Hunsley and Meyer directly define incremental validity as prediction or explanation added beyond information already available, supporting the preserved key and the applied model-comparison rewrite. The construct is stable, and the DOI remains an appropriate primary methodological citation.',
    feedbackDesign: ['administrative-feasibility', 'internal-score-consistency', 'missing-data-completeness'],
    prompt: 'A clinic\'s intake interview already predicts treatment dropout. Which finding would most directly support the incremental validity of a new questionnaire?',
    choices: {
      0: 'The questionnaire takes less time to administer than the interview',
      1: 'Its items yield a high internal-consistency coefficient in the clinic sample',
      2: 'Its scores explain additional outcome variation after interview scores are entered',
      3: 'Its score reports contain fewer missing responses than the interview records',
    },
    rationale: 'Incremental validity concerns the additional prediction or explanation contributed by a measure after relevant existing information is accounted for. The gain is conditional on the criterion, population, and comparison set; efficiency, internal consistency, and data completeness address different qualities.',
    references: ['https://doi.org/10.1037/1040-3590.15.4.446'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/1040-3590.15.4.446',
        title: 'The Incremental Validity of Psychological Testing and Assessment: Conceptual, Methodological, and Statistical Issues',
        organization: 'Psychological Assessment, American Psychological Association',
        summary: 'Hunsley and Meyer examine research designs and statistical issues for determining whether tests, test-informed inferences, or new measures add prediction beyond information already available.',
        credibility: 'This DOI identifies a peer-reviewed methodological article in the American Psychological Association\'s assessment journal. The article directly addresses the comparison-set and criterion distinctions tested by this item.',
      },
    ],
    qualityFlags: [
      'Rewrites a cued definition as an applied comparison-model decision while preserving the verified answer position.',
      'Uses feasibility, internal-score consistency, and data completeness as plausible neighboring qualities rather than unrelated foils.',
    ],
    incorrectFeedback: {
      0: 'Shorter administration time concerns feasibility and clinical utility. A quicker questionnaire may add no information; incremental validity requires a measurable gain in predicting dropout after the interview is already in the model.',
      1: 'A high internal-consistency coefficient shows that questionnaire items covary, assuming the coefficient is appropriate. It does not show that scores explain additional dropout outcome variation beyond the interview.',
      3: 'Fewer missing responses improve data completeness and may reduce missing-data bias. They do not establish that questionnaire scores add criterion prediction after the interview\'s contribution has been controlled.',
    },
  },
  'eppp-b008-assessment-1': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'The ETS guideline states that the standard error of measurement estimates score accuracy and supports confidence intervals around obtained scores, while Harvill directly explains how SEM-based score bands communicate uncertainty in individual-score interpretation. Together they support the key without treating one realized interval as proof.',
    feedbackDesign: ['future-score-prediction-interval', 'population-mean-sampling-interval', 'unidimensionality-evidence'],
    prompt: 'An examinee earns an observed score of 70, reported with a 95% interval of 66–74 calculated from the test\'s standard error of measurement. The interval is intended primarily to indicate that:',
    choices: {
      0: 'The observed result is an imprecise estimate of the examinee\'s standing',
      1: 'The examinee\'s next observed score is predicted to fall between 66 and 74',
      2: 'The population mean for similar examinees lies between 66 and 74',
      3: 'The interval supplies evidence that the scale measures a single construct',
    },
    rationale: 'An SEM-based interval expresses uncertainty in interpreting an individual obtained score because observed scores contain measurement error. It is not a prediction interval for a future score, an interval estimate of a population mean, or evidence about internal structure. Greater measurement precision produces a narrower interval.',
    references: [
      'https://www.ets.org/pdfs/about/best-practices-validity-fairness-ela.pdf',
      'https://doi.org/10.1111/j.1745-3992.1991.tb00195.x',
    ],
    sourceDetails: [
      {
        url: 'https://www.ets.org/pdfs/about/best-practices-validity-fairness-ela.pdf',
        title: 'Guidelines for Best Test Development Practices to Ensure Validity and Fairness for International English Language Proficiency Assessments',
        organization: 'Educational Testing Service',
        summary: 'Young, So, and Ockey explain that the standard error of measurement estimates score accuracy and supports score intervals that communicate precision and encourage cautious individual decisions.',
        credibility: 'Educational Testing Service is a major nonprofit assessment and measurement-research organization. This technical guideline was written by ETS measurement specialists and directly explains SEM-based score intervals.',
      },
      {
        url: 'https://doi.org/10.1111/j.1745-3992.1991.tb00195.x',
        title: 'Standard Error of Measurement: An NCME Instructional Module',
        organization: 'Educational Measurement: Issues and Practice, National Council on Measurement in Education',
        summary: 'Harvill defines SEM as the variability of measurement errors associated with scores and explains how score bands communicate uncertainty in interpreting individual scores.',
        credibility: 'This DOI identifies a peer-reviewed instructional module in the National Council on Measurement in Education\'s measurement-practice journal. It directly addresses the construction, interpretation, and limitations of SEM-based score bands.',
      },
    ],
    qualityFlags: [
      'Replaces absolute giveaway claims with neighboring interval, sampling, and internal-structure interpretations.',
      'Adds a direct NCME measurement source to the existing authoritative ETS guidance and avoids overstating confidence-interval certainty.',
    ],
    incorrectFeedback: {
      1: 'A prediction interval concerns the examinee\'s future observed performance and must incorporate occasion-to-occasion score variation. An SEM-based score interval instead expresses uncertainty in interpreting the examinee\'s current obtained score.',
      2: 'An interval for a population mean quantifies sampling error in estimating a group parameter. This score interval concerns measurement error around one examinee\'s obtained score, not uncertainty about a group average.',
      3: 'Evidence of unidimensionality comes from analyses of internal structure, such as factor models. A score interval quantifies measurement precision and cannot establish what construct, or how many dimensions, the test measures.',
    },
  },
  'eppp-b008-research-2': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Cronbach\'s foundational article supports alpha\'s item-covariance and split-half basis, while Sijtsma demonstrates that a high alpha does not establish unidimensionality and can coexist with correlated dimensions. The rewrite preserves the key while replacing a duplicated definition with an interpretation problem.',
    feedbackDesign: ['alpha-versus-factor-model-evidence', 'correlated-factor-covariance', 'internal-structure-versus-criterion-evidence'],
    prompt: 'A 12-item scale yields α = .92, but a confirmatory factor analysis favors two correlated factors over one factor. Which interpretation is most defensible?',
    choices: {
      0: 'The alpha result provides stronger evidence for one dimension than the factor analysis does',
      1: 'The two-factor solution implies too little item covariance for the reported alpha',
      2: 'A high alpha can coexist with multiple related dimensions and does not establish unidimensionality',
      3: 'The differing results show that the scale will predict external criteria poorly',
    },
    rationale: 'Alpha is a function of item variances and covariances and can be elevated when items are redundant or dimensions are correlated. It does not test whether one latent factor adequately explains responses; factor analysis supplies the relevant internal-structure evidence. Neither result alone establishes criterion validity.',
    references: [
      'https://doi.org/10.1007/BF02310555',
      'https://doi.org/10.1007/s11336-008-9101-0',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1007/BF02310555',
        title: 'Coefficient Alpha and the Internal Structure of Tests',
        organization: 'Psychometrika, The Psychometric Society',
        summary: 'Cronbach derives coefficient alpha from item covariances, relates it to split-half equivalence, and discusses its interpretation for multi-item scores.',
        credibility: 'This DOI identifies Cronbach\'s foundational peer-reviewed article in Psychometrika, the Psychometric Society\'s methods journal. It is the primary source for the coefficient and its original interpretation.',
      },
      {
        url: 'https://doi.org/10.1007/s11336-008-9101-0',
        title: 'On the Use, the Misuse, and the Very Limited Usefulness of Cronbach\'s Alpha',
        organization: 'Psychometrika, The Psychometric Society',
        summary: 'Sijtsma reviews common interpretations of alpha and explains why a high value should not be treated as evidence that a test is unidimensional or that its scores are valid.',
        credibility: 'This DOI identifies an open-access, peer-reviewed methodological analysis in Psychometrika by a measurement scholar. It directly supports the cautions required to avoid overinterpreting alpha.',
      },
    ],
    qualityFlags: [
      'Reauthors a near-duplicate alpha definition as an applied conflict between a coefficient and factor-analytic evidence.',
      'Adds a peer-reviewed methodological caution so the explanation does not equate high alpha with unidimensionality or criterion validity.',
    ],
    incorrectFeedback: {
      0: 'A one-factor interpretation requires internal-structure evidence from the factor model. Alpha summarizes the item covariance pattern but can remain high when multiple dimensions are correlated, so it cannot override the better-fitting two-factor result.',
      1: 'Correlated factors can produce substantial covariance among items, which is precisely why alpha may remain high. The two-factor solution disputes unidimensionality, not the presence of interitem association.',
      3: 'Criterion validity concerns relations between scores and an external outcome. Alpha and factor analysis use internal item-response information, so their different conclusions do not show that criterion prediction is weak.',
    },
  },
  'eppp-b009-research-1': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'McCambridge, Witton, and Elbourne directly review behavior changes associated with awareness of research participation or observation and conclude that the evidence is heterogeneous across conditions, mechanisms, and magnitudes. The applied rewrite therefore preserves both the key and the existing rationale\'s caution.',
    feedbackDesign: ['observer-expectancy-bias', 'practice-effect', 'regression-to-the-mean'],
    prompt: 'Clinic staff report deliberately following hand-hygiene procedures more often while a visible audit team is present, even though the team gives no feedback and no policy changes. Which research artifact is most directly illustrated?',
    choices: {
      0: 'Reactivity to awareness of being observed',
      1: 'Observer-expectancy bias in how auditors classify behavior',
      2: 'A testing effect from repeated exposure to the same ability measure',
      3: 'Regression to the mean after selecting extreme baseline performers',
    },
    rationale: 'The Hawthorne label is commonly applied when awareness of research participation or observation changes participants\' behavior. It concerns participant reactivity, not observers\' scoring expectations, learning from repeated testing, or statistical movement after selection on extreme scores. Reviews nevertheless find heterogeneous mechanisms and effect sizes.',
    references: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC3969247/'],
    sourceDetails: [
      {
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3969247/',
        title: 'Systematic Review of the Hawthorne Effect: New Concepts Are Needed to Study Research Participation Effects',
        organization: 'Journal of Clinical Epidemiology and U.S. National Library of Medicine',
        summary: 'McCambridge, Witton, and Elbourne systematically review behavioral effects associated with research participation and observation, finding heterogeneous definitions, conditions, mechanisms, and effect sizes.',
        credibility: 'PubMed Central provides the complete peer-reviewed systematic review from the Journal of Clinical Epidemiology. The review directly evaluates both the common meaning and the evidentiary limits of the Hawthorne-effect construct.',
      },
    ],
    qualityFlags: [
      'Replaces a terminology-recall stem with an applied observation-reactivity scenario while preserving the verified answer position.',
      'Uses observer expectancy, practice effects, and regression to the mean as plausible neighboring research artifacts.',
    ],
    incorrectFeedback: {
      1: 'Observer-expectancy bias occurs when a recorder\'s beliefs influence ratings or interactions, especially with subjective outcomes. The stem describes a deliberate change in staff behavior while observed, not distortion in the auditors\' scoring.',
      2: 'A testing or practice effect is improvement caused by prior exposure to the same task or measure. Here no ability test is repeated; the relevant change coincides with awareness that workplace behavior is being observed.',
      3: 'Regression to the mean occurs when units selected for extreme baseline values tend to score less extremely on remeasurement even without an intervention. The stem gives no extreme-score selection and ties the change to visible observation.',
    },
  },
};

module.exports = { revisions };
