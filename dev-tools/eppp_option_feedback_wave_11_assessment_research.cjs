'use strict';

const revisions = {
  'eppp-v3-assessment-020': {
    expectedAnswerIndex: 1,
    incorrectFeedback: {
      0: 'The PHQ-9, rather than this seven-item anxiety scale, is commonly used to screen depressive symptoms. Although anxiety and depression often co-occur, vegetative depressive symptoms do not define what this instrument measures.',
      2: 'Psychosis assessment requires evaluation of symptoms such as delusions, hallucinations, disorganization, and functional change. A brief anxiety-frequency questionnaire does not provide that diagnostic coverage.',
      3: 'Posttraumatic stress screening asks about trauma-linked intrusion, avoidance, negative mood or cognition, and arousal. One overlapping symptom such as nervousness cannot make a general anxiety scale a PTSD measure.',
    },
    feedbackDesign: ['depression-screen substitution', 'psychosis-assessment substitution', 'trauma-specificity error'],
    sourceCheck: 'Spitzer and colleagues developed and validated the GAD-7 as a brief self-report measure for probable generalized anxiety disorder and anxiety symptom severity, supporting the keyed construct and the two-week response window.',
    references: ['https://pubmed.ncbi.nlm.nih.gov/16717171/'],
    sourceDetails: [{
      url: 'https://pubmed.ncbi.nlm.nih.gov/16717171/',
      title: 'A Brief Measure for Assessing Generalized Anxiety Disorder: The GAD-7',
      organization: 'PubMed, U.S. National Library of Medicine',
      summary: 'The original validation study describes development of the seven-item GAD-7 and evaluates its reliability, validity, and usefulness for identifying generalized anxiety disorder and grading anxiety severity.',
      credibility: 'PubMed is maintained by the U.S. National Library of Medicine, and this record identifies the original peer-reviewed validation study by the instrument developers in Archives of Internal Medicine.',
    }],
  },
  'eppp-b008-assessment-2': {
    expectedAnswerIndex: 2,
    incorrectFeedback: {
      0: 'Sample size is a property of the dataset and affects the stability of an estimated solution, but it is not encoded by a component eigenvalue. Missing-data counts likewise require separate reporting.',
      1: 'A factor or component loading describes association with an observed variable, while criterion-related validity concerns an external outcome. Neither quantity is the eigenvalue assigned to a principal component.',
      3: 'A probability value evaluates evidence under a specified statistical model. An eigenvalue is a descriptive matrix result tied to variance, not a significance probability for an individual loading.',
    },
    feedbackDesign: ['sample-size confusion', 'loading-or-validity confusion', 'p-value confusion'],
    sourceCheck: 'The NIST Engineering Statistics Handbook derives principal components from the correlation matrix and states that the component variances are the corresponding eigenvalues, directly supporting the keyed interpretation.',
  },
  'eppp-b009-research-2': {
    expectedAnswerIndex: 2,
    incorrectFeedback: {
      0: 'Multiplying .05 by ten would permit an extremely high per-comparison error rate and would inflate, rather than control, the chance of at least one false rejection across the family.',
      1: 'Leaving each comparison at .05 provides no Bonferroni adjustment. With ten tests, the probability of one or more false positives across the family can exceed the intended .05 level.',
      3: 'Subtracting a fixed amount from alpha is not the Bonferroni rule. The adjustment divides the desired familywise rate by the number of comparisons, so this subtraction has no error-control rationale.',
    },
    feedbackDesign: ['multiplication reversal', 'unadjusted-alpha error', 'unsupported subtraction rule'],
    sourceCheck: 'Bland and Altman describe the basic Bonferroni procedure as dividing the desired familywise alpha by the number of significance tests; applying .05 divided by 10 yields the keyed .005 cutoff.',
  },
  'eppp-b010-research-1': {
    expectedAnswerIndex: 0,
    incorrectFeedback: {
      1: 'Random selection concerns how a sample was obtained and therefore bears on representativeness and generalizability. It is not a numerical index of how large an observed association or group contrast is.',
      2: 'Neither an effect size nor a p value gives the posterior probability that a null hypothesis is true. That interpretation would require an explicitly specified probabilistic model and prior information.',
      3: 'The number of predictors describes model complexity. Measures such as standardized mean differences, correlations, or variance-explained indices instead characterize the size of a finding.',
    },
    feedbackDesign: ['sampling-method confusion', 'null-probability misconception', 'model-size confusion'],
    sourceCheck: 'The APA Task Force on Statistical Inference distinguishes statistical significance from indices of effect magnitude and recommends reporting effect sizes to communicate the strength or practical size of findings.',
  },
};

module.exports = { revisions };
