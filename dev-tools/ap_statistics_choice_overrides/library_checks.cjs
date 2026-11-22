'use strict';

// Section-specific retrieval checks for the 15 AP Statistics learning library
// sections (replacing the generic repeated study-move check) plus balanced
// choice overrides for the 15 transfer checks so answer indices and option
// lengths are balanced across all 30 checks.

const FOUNDATIONAL_CHECKS = {
  'ap-stats-ch-01-section-01': {
    prompt: 'A distribution of household incomes has a long right tail with several extreme high values. Which summary pair best describes center and spread?',
    choices: [
      'Median and interquartile range',
      'Mean and full range of all reported values',
      'Mean and standard deviation of the sample',
      'Mode and maximum observed income figure',
    ],
    answerIndex: 0,
    rationale: 'Because income is strongly right-skewed with high outliers, the median and IQR resist extreme pull better than the mean and standard deviation.',
  },
  'ap-stats-ch-01-section-02': {
    prompt: 'A school divides students by grade level and draws a simple random sample within each grade. Why might researchers choose this stratified design?',
    choices: [
      'It eliminates the need to contact selected students who decline to reply.',
      'It guarantees representation from every grade and can reduce estimate variability.',
      'It allows causal claims without assigning treatments across experimental groups.',
      'It surveys entire homerooms at once to avoid building a full student roster.',
    ],
    answerIndex: 1,
    rationale: 'Stratifying by a characteristic linked to the response ensures every subgroup is represented and often yields more precise population estimates.',
  },
  'ap-stats-ch-01-section-03': {
    prompt: 'Volunteers in a clinic trial are randomly assigned to a new sleep routine or usual habits, and the new routine group sleeps longer. What scope of inference applies?',
    choices: [
      'Generalization to all adults nationwide, without supporting any causal link',
      'Neither causal inference nor generalization to the study’s own participants',
      'Causal evidence for these volunteers, without broad population generalization',
      'Proof that the sample mean equals the exact population parameter nationwide',
    ],
    answerIndex: 2,
    rationale: 'Random assignment supports cause-and-effect for the volunteers in the experiment, while lack of random sampling limits generalization to a wider population.',
  },
  'ap-stats-ch-02-section-01': {
    prompt: 'A two-way table shows transit mode across two campuses of very different sizes. Why use conditional proportions instead of raw counts to compare campuses?',
    choices: [
      'Raw counts cannot be added together to compute column or row totals.',
      'Conditional proportions convert categorical variables into quantitative scores.',
      'Raw counts automatically force every campus to show identical percentages.',
      'Conditional proportions adjust for unequal campus sizes when comparing rates.',
    ],
    answerIndex: 3,
    rationale: 'Dividing each cell count by its campus total puts unequal-sized groups on the same scale so patterns can be compared fairly.',
  },
  'ap-stats-ch-02-section-02': {
    prompt: 'If two events A and B each have positive probability and are mutually exclusive, what must be true about P(A and B)?',
    choices: [
      'P(A and B) equals 0, so the two events cannot be independent.',
      'P(A and B) equals P(A) times P(B), proving the events are independent.',
      'P(A and B) equals P(A) plus P(B) whenever both probabilities are small.',
      'P(A and B) equals 1 because one of the two events must always occur.',
    ],
    answerIndex: 0,
    rationale: 'Mutually exclusive events share no outcomes, so P(A and B) = 0; since P(A)P(B) > 0, they cannot be independent.',
  },
  'ap-stats-ch-02-section-03': {
    prompt: 'When a constant $5 bonus is added to every payout in a game, how do the mean and standard deviation of payouts change?',
    choices: [
      'Both the mean and the standard deviation increase by $5.',
      'The mean increases by $5, while the standard deviation stays unchanged.',
      'The mean stays unchanged, while the standard deviation increases by $5.',
      'Both the mean and the standard deviation are multiplied by five.',
    ],
    answerIndex: 1,
    rationale: 'Adding a constant shifts every value equally, moving the mean up by $5 without altering the spread among payouts.',
  },
  'ap-stats-ch-03-section-01': {
    prompt: 'If sample size is quadrupled while the confidence level stays at 95%, how does the margin of error of a one-proportion z-interval change roughly?',
    choices: [
      'It quadruples because larger samples span more population variation.',
      'It stays unchanged because the critical value z* remains identical.',
      'It is cut roughly in half because standard error scales with 1/sqrt(n).',
      'It drops to zero once expected successes and failures exceed ten.',
    ],
    answerIndex: 2,
    rationale: 'Because standard error has sqrt(n) in the denominator, multiplying n by 4 divides the margin of error by sqrt(4) = 2.',
  },
  'ap-stats-ch-03-section-02': {
    prompt: 'In a hypothesis test of H0: p = 0.50 versus Ha: p > 0.50, what does committing a Type I error mean in context?',
    choices: [
      'Failing to reject H0 when the true population proportion exceeds 0.50.',
      'Using a sample proportion p-hat instead of p inside the null statement.',
      'Computing a two-sided p-value when a one-sided alternative was planned.',
      'Rejecting H0 and claiming p > 0.50 when the true proportion is 0.50.',
    ],
    answerIndex: 3,
    rationale: 'A Type I error occurs when sample evidence leads us to reject a null hypothesis that is actually true.',
  },
  'ap-stats-ch-03-section-03': {
    prompt: 'How does a chi-square test of homogeneity differ in study design from a chi-square test of independence?',
    choices: [
      'Homogeneity samples separate populations; independence samples one population.',
      'Homogeneity requires quantitative responses; independence uses categorical counts.',
      'Independence compares observed counts to zero; homogeneity compares sample means.',
      'Homogeneity always uses one degree of freedom regardless of table dimensions.',
    ],
    answerIndex: 0,
    rationale: 'Homogeneity compares a categorical distribution across two or more independent samples, whereas independence tests association between two variables in one sample.',
  },
  'ap-stats-ch-04-section-01': {
    prompt: 'Why is the sampling distribution of x-bar less variable than the underlying population distribution of individual values?',
    choices: [
      'Averaging removes every outlier from the original population data set.',
      'High and low sample values tend to offset each other, dividing spread by sqrt(n).',
      'The Central Limit Theorem forces the population standard deviation toward zero.',
      'Sample means are always computed without using the smallest observed values.',
    ],
    answerIndex: 1,
    rationale: 'Because extremes average out across n independent observations, the standard deviation of x-bar is sigma / sqrt(n), which shrinks as n grows.',
  },
  'ap-stats-ch-04-section-02': {
    prompt: 'Why do t-distributions have heavier tails than the standard normal distribution when sample size n is small?',
    choices: [
      'Sample means from small samples are biased away from the population mean.',
      'Small samples are always drawn from heavily skewed categorical populations.',
      'Estimating sigma with s adds extra uncertainty to the standardized statistic.',
      'Degrees of freedom equal n + 1, which stretches the center of the curve.',
    ],
    answerIndex: 2,
    rationale: 'Replacing unknown population sigma with sample standard deviation s introduces extra variability, which widens the tails of the t-distribution especially for small df.',
  },
  'ap-stats-ch-04-section-03': {
    prompt: 'A 95% confidence interval for mean delivery time is (26.4, 31.6) minutes. Which interpretation accurately reflects 95% confidence?',
    choices: [
      '95% of individual deliveries take between 26.4 and 31.6 minutes.',
      'There is a 95% chance that the next sample mean falls in this interval.',
      'Exactly 95% of future customers will wait less than 31.6 minutes.',
      'We are 95% confident the true mean delivery time lies between 26.4 and 31.6 minutes.',
    ],
    answerIndex: 3,
    rationale: 'A confidence interval estimates the population parameter (the true mean), not individual observations or future sample means.',
  },
  'ap-stats-ch-05-section-01': {
    prompt: 'What effect can a single high-leverage point that lies far off the overall linear trend have on a least-squares regression line?',
    choices: [
      'It can pull the slope strongly toward itself and shift correlation.',
      'It leaves the slope unchanged because leverage affects only the y-intercept.',
      'It turns the explanatory variable into a categorical grouping factor.',
      'It forces every remaining residual in the data set to become positive.',
    ],
    answerIndex: 0,
    rationale: 'Points far from x-bar have high leverage; if they also depart from the pattern of the other points, they can dramatically tilt the regression slope and alter r.',
  },
  'ap-stats-ch-05-section-02': {
    prompt: 'In least-squares regression, what is always true about the point (x-bar, y-bar) and the sum of the residuals?',
    choices: [
      'The line misses (x-bar, y-bar), and residuals sum to the correlation r.',
      'The line passes through (x-bar, y-bar), and the residuals sum to zero.',
      'The line passes through the origin, and every residual equals zero.',
      'The residuals sum to the slope, while the intercept equals y-bar.',
    ],
    answerIndex: 1,
    rationale: 'By construction, the least-squares regression line always passes through the mean point (x-bar, y-bar), and its residuals balance to sum to 0.',
  },
  'ap-stats-ch-05-section-03': {
    prompt: 'Why is a high correlation such as r = 0.94 insufficient by itself to confirm that a linear model is appropriate?',
    choices: [
      'Correlations above 0.90 indicate the variables must be categorical labels.',
      'Correlation depends on measurement units and changes when x is rescaled.',
      'A strongly curved monotone pattern can still yield a large r value.',
      'Linear models require r to be negative before checking residual plots.',
    ],
    answerIndex: 2,
    rationale: 'A smooth curved trend can produce a very high r value, so inspecting the scatterplot and residual plot is essential to verify linear form.',
  },
};

// Overrides for the 15 transfer checks (indexed 0..14) to balance lengths
// and rotate answer indices across 0, 1, 2, 3.
const TRANSFER_CHECK_OVERRIDES = {
  'ap-stats-ch-01-section-01-transfer-check': { answerIndex: 1 },
  'ap-stats-ch-01-section-02-transfer-check': { answerIndex: 2 },
  'ap-stats-ch-01-section-03-transfer-check': { answerIndex: 3 },
  'ap-stats-ch-02-section-01-transfer-check': {
    answer: 'Conditional rates per group total',
    answerIndex: 0,
  },
  'ap-stats-ch-02-section-02-transfer-check': { answerIndex: 1 },
  'ap-stats-ch-02-section-03-transfer-check': {
    answer: 'Fixed independent trials with constant p',
    answerIndex: 2,
  },
  'ap-stats-ch-03-section-01-transfer-check': { answerIndex: 3 },
  'ap-stats-ch-03-section-02-transfer-check': { answerIndex: 0 },
  'ap-stats-ch-03-section-03-transfer-check': {
    answer: 'Observed versus expected counts',
    answerIndex: 1,
  },
  'ap-stats-ch-04-section-01-transfer-check': { answerIndex: 2 },
  'ap-stats-ch-04-section-02-transfer-check': {
    answer: 'When each unit yields a within-pair difference',
    answerIndex: 3,
  },
  'ap-stats-ch-04-section-03-transfer-check': { answerIndex: 0 },
  'ap-stats-ch-05-section-01-transfer-check': {
    answer: 'A linear model may miss the curved form',
    answerIndex: 1,
  },
  'ap-stats-ch-05-section-02-transfer-check': { answerIndex: 2 },
  'ap-stats-ch-05-section-03-transfer-check': { answerIndex: 3 },
};

module.exports = {
  FOUNDATIONAL_CHECKS,
  TRANSFER_CHECK_OVERRIDES,
};
