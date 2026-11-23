'use strict';

/**
 * Rich, section-specific lesson fields for all 15 sections in
 * test_prep/ap_statistics_foundation_pilot_learning_library.json.
 *
 * Schema per sectionId:
 *   - examples: [string, string] (each 75-170 chars)
 *   - workedDataExample: { headers: [string, string], rows: [[string, string], [string, string], [string, string]] }
 *   - retrievalPrompts: [string, string, string] (each 55-145 chars, ending in '?')
 *   - transferMove: string (85-185 chars)
 */
module.exports = {
  'ap-stats-ch-01-section-01': {
    examples: [
      'For seven commute times (12, 15, 16, 18, 20, 22, 65 min), the outlier 65 pulls the mean to 24.0 min, so median (18 min) and IQR (7 min) fit better.',
      'In a survey of 200 students (92 bus, 64 car, 44 bike), transit mode is categorical, so display relative frequencies (46%, 32%, 22%) in a bar chart.',
    ],
    workedDataExample: {
      headers: ['Distribution profile', 'Appropriate summary and reasoning'],
      rows: [
        [
          'Right-skewed commutes (12, 15, 16, 18, 20, 22, 65 min)',
          'Use median = 18 min and IQR = 7 min; 65 exceeds upper fence 22 + 1.5(7) = 32.5',
        ],
        [
          'Roughly symmetric quiz scores (n = 40, no outliers)',
          'Use mean = 81.4 and SD = 6.2; both summarize center and typical spread accurately',
        ],
        [
          'Categorical transit modes (92 bus, 64 car, 44 bike)',
          'Use counts or relative frequencies (46%, 32%, 22%) in a bar chart, not a histogram',
        ],
      ],
    },
    retrievalPrompts: [
      'Why are median and IQR preferred over mean and standard deviation for a strongly skewed distribution?',
      'How do you apply the 1.5*IQR fence rule to check whether a high or low observation is an outlier?',
      'What graphical and numerical differences separate a one-variable categorical summary from a quantitative one?',
    ],
    transferMove:
      'Before computing any statistic on a new dataset, classify the variable, sketch its shape, check for outliers, and pair resistant or non-resistant center and spread measures.',
  },

  'ap-stats-ch-01-section-02': {
    examples: [
      'At a 1,200-student school (300 per grade), a stratified random sample of 30 per grade (n = 120) balances class years and lowers sampling variability.',
      'An online opt-in poll draws 4,500 responses with 68% opposing a fee, yet voluntary response bias still distorts the estimate despite the large count.',
    ],
    workedDataExample: {
      headers: ['Data collection design', 'Mechanism and bias or variance effect'],
      rows: [
        [
          'Stratified random sample (30 per grade, n = 120)',
          'Draws SRS inside homogeneous strata to guarantee representation and cut variance',
        ],
        [
          'Cluster sample (4 random homerooms of 30, n = 120)',
          'Surveys everyone in chosen heterogeneous groups; practical, but higher variability',
        ],
        [
          'Randomized block experiment (block by prior GPA)',
          'Randomly assigns tutoring within GPA blocks to control a known confounding factor',
        ],
      ],
    },
    retrievalPrompts: [
      'How does stratified random sampling differ from cluster sampling in how groups are formed and selected?',
      'Why does increasing the size of a voluntary response sample fail to eliminate selection bias?',
      'When should an experimenter use a randomized block design rather than a completely randomized design?',
    ],
    transferMove:
      'For any proposed survey or experiment, name the sampling frame or blocking variable first, diagnose likely bias direction, and confirm random selection or random assignment.',
  },

  'ap-stats-ch-01-section-03': {
    examples: [
      'An SRS of 500 city households finds p-hat = 0.62 compost (a statistic estimating city parameter p), supporting generalization but not a causal claim.',
      'Randomly assigning 60 volunteers to 8-hour vs. 6-hour sleep produces a 9.4-point mean gain, supporting causation for similar volunteers only.',
    ],
    workedDataExample: {
      headers: ['Design combination', 'Permitted scope of inference and target'],
      rows: [
        [
          'Random sample + observational (n = 500, p-hat = 0.62)',
          'Generalize p-hat to city parameter p; confounding variables prevent causal claims',
        ],
        [
          'Volunteers + random assignment (n = 60, diff = 9.4)',
          'Supports cause-and-effect among similar volunteers; cannot generalize to all adults',
        ],
        [
          'Random sample + random assignment (n = 200, x-bar diff)',
          'Supports both causal conclusions about treatments and generalization to population',
        ],
      ],
    },
    retrievalPrompts: [
      'How do you distinguish a sample statistic such as x-bar or p-hat from the population parameter mu or p?',
      'Why does random assignment allow causal inference while random sampling allows population generalization?',
      'How can a confounding variable explain an observed difference in an observational study?',
    ],
    transferMove:
      'Audit every headline or study summary with a two-check scope gate: verify random sampling before generalizing to a population and random assignment before claiming causation.',
  },

  'ap-stats-ch-02-section-01': {
    examples: [
      'In a 200-commuter table, 70 of 100 downtown workers take rail (70%) versus 25 of 100 suburban workers (25%), showing a strong workplace-mode association.',
      'When 48 of 80 club members (60%) and 48 of 120 non-members (40%) pass, comparing raw counts (48 vs. 48) hides a 20-percentage-point rate difference.',
    ],
    workedDataExample: {
      headers: ['Two-way table proportion', 'Calculation from 200 commuters (70/100 urban, 25/100 suburban rail)'],
      rows: [
        [
          'Marginal proportion P(Rail)',
          '(70 + 25) / 200 = 95 / 200 = 0.475 (overall rail share across all commuters)',
        ],
        [
          'Joint proportion P(Downtown and Rail)',
          '70 / 200 = 0.350 (fraction of all 200 commuters in both categories at once)',
        ],
        [
          'Conditional P(Rail | Downtown) vs. P(Downtown | Rail)',
          '70/100 = 0.70 != 25/100 = 0.25 (associated), while P(Downtown | Rail) = 70/95 = 0.737',
        ],
      ],
    },
    retrievalPrompts: [
      'How do marginal, joint, and conditional relative frequencies differ in the denominator each one uses?',
      'What evidence in a set of conditional proportions indicates an association between two categorical variables?',
      'Why can a row percentage and a column percentage for the same cell answer completely different questions?',
    ],
    transferMove:
      'When reading an unfamiliar two-way table, convert counts into conditional proportions within the explanatory group before comparing rates or judging association.',
  },

  'ap-stats-ch-02-section-02': {
    examples: [
      'Given P(Tea) = 0.40, P(Coffee) = 0.55, and P(Tea and Coffee) = 0.22, the events are independent (0.40*0.55 = 0.22) and P(Tea or Coffee) = 0.73.',
      'If 10% of clinic patients have flu, P(Pos and Flu) = 0.09, and P(Pos) = 0.18, conditioning on a positive test gives P(Flu | Pos) = 0.09/0.18 = 0.50.',
    ],
    workedDataExample: {
      headers: ['Probability rule', 'Worked formula and numerical verification'],
      rows: [
        [
          'Complement for at-least-one events',
          'P(>= 1 defect in 3 independent parts, p = 0.05) = 1 - 0.95^3 = 1 - 0.8574 = 0.1426',
        ],
        [
          'Conditional and general addition rule',
          'With P(A) = 0.40, P(B) = 0.55, P(A and B) = 0.22: P(A|B) = 0.22/0.55 = 0.40; P(A or B) = 0.73',
        ],
        [
          'Mutually exclusive vs. independent check',
          'Two nonzero-probability disjoint events have P(A and B) = 0 != P(A)*P(B), so they are dependent',
        ],
      ],
    },
    retrievalPrompts: [
      'Why are two events with positive probabilities never both mutually exclusive and independent?',
      'How does the event after the vertical bar in P(A | B) determine the denominator of the calculation?',
      'When is using the complement rule 1 - P(none) cleaner than summing individual union cases?',
    ],
    transferMove:
      'Translate any word-problem probability into event symbols first, lock in the conditioning denominator, and check for overlap or independence before multiplying or adding.',
  },

  'ap-stats-ch-02-section-03': {
    examples: [
      'For X ~ Bin(n = 20, p = 0.30), the expected count of successes is mu = 20(0.30) = 6 with standard deviation sigma = sqrt(20*0.30*0.70) = 2.05.',
      'If battery lifespans follow N(500, 40) hours, a 560-hour battery has z = (560 - 500)/40 = +1.50, placing it near the 93.3rd percentile.',
    ],
    workedDataExample: {
      headers: ['Probability distribution model', 'Worked parameters and applicability check'],
      rows: [
        [
          'Discrete RV: $0 (0.7), $10 (0.2), $50 (0.1)',
          'E(X) = 0(0.7) + 10(0.2) + 50(0.1) = $7.00; SD = sqrt(270 - 49) = $14.87',
        ],
        [
          'Binomial count: X ~ Bin(n = 20, p = 0.30)',
          'Verify BINS (binary, independent, fixed n, constant p); mu = 6.0, sigma = 2.05',
        ],
        [
          'Normal N(500, 40) vs. mean of n = 16 units',
          'Individual SD is 40 hours, whereas sample mean x-bar follows N(500, 40/sqrt(16) = 10)',
        ],
      ],
    },
    retrievalPrompts: [
      'Which four BINS conditions must hold before modeling a count with a binomial distribution?',
      'How do expected value and standard deviation summarize the long-run behavior of a discrete random variable?',
      'Why does the Central Limit Theorem describe the distribution of sample means rather than raw observations?',
    ],
    transferMove:
      'Match an unfamiliar random process to its probability model by checking whether the outcome is discrete, fixed-trial binomial, or continuous normal before computing z or mu.',
  },

  'ap-stats-ch-03-section-01': {
    examples: [
      'In an SRS of n = 200 voters (N = 50,000), 110 back a bond (p-hat = 0.55), yielding SE = 0.0352 and a 95% z-interval of 0.55 +/- 0.069, or (0.481, 0.619).',
      'Quadrupling sample size from n = 100 to n = 400 at 95% confidence cuts the standard error and margin of error exactly in half because SE scales as 1/sqrt(n).',
    ],
    workedDataExample: {
      headers: ['One-proportion z-interval step', 'Worked verification (n = 200, p-hat = 0.55, N = 50,000)'],
      rows: [
        [
          'Random, 10%, and Large Counts checks',
          'SRS taken; 200 <= 0.10(50,000) = 5,000; 110 >= 10 successes and 90 >= 10 failures',
        ],
        [
          'Standard error and 95% interval',
          'SE = sqrt(0.55*0.45/200) = 0.0352; 0.55 +/- 1.96(0.0352) gives (0.481, 0.619)',
        ],
        [
          'Confidence level interpretation',
          'About 95% of intervals built from repeated SRSs of n = 200 will capture true p',
        ],
      ],
    },
    retrievalPrompts: [
      'What three conditions justify using a one-proportion z-interval to estimate a population proportion p?',
      'How do changes in confidence level z* and sample size n affect the width of a confidence interval?',
      'Why is it incorrect to say there is a 95% probability that a fixed parameter p falls inside one computed interval?',
    ],
    transferMove:
      'Whenever asked to estimate a population proportion, verify Random, 10%, and Large Counts using observed counts first, then pair p-hat +/- z*SE with a parameter-focused statement.',
  },

  'ap-stats-ch-03-section-02': {
    examples: [
      'Testing H0: p = 0.50 vs. Ha: p > 0.50 with n = 100 and p-hat = 0.60 gives SD0 = 0.05, z = 2.00, and p-value = 0.0228, rejecting H0 at alpha = 0.05.',
      'Lowering the significance level from alpha = 0.05 to alpha = 0.01 cuts Type I error risk but increases Type II error probability and reduces power.',
    ],
    workedDataExample: {
      headers: ['Hypothesis test element', 'Worked one-proportion z-test (H0: p = 0.50, Ha: p > 0.50)'],
      rows: [
        [
          'Null standard deviation and z-score',
          'With n = 100, p-hat = 0.60: SD0 = sqrt(0.50*0.50/100) = 0.05; z = (0.60 - 0.50)/0.05 = 2.00',
        ],
        [
          'p-value interpretation and decision',
          'If p = 0.50, P(p-hat >= 0.60) = 0.0228 < 0.05; reject H0 for convincing evidence p > 0.50',
        ],
        [
          'Type I vs. Type II error and power',
          'Type I rejects true p = 0.50 (prob = alpha); Type II misses true p > 0.50 (power = 1 - beta)',
        ],
      ],
    },
    retrievalPrompts: [
      'Why does a one-proportion z-test compute standard deviation with p0 instead of the sample proportion p-hat?',
      'What does a p-value of 0.0228 specifically measure under the assumption that the null hypothesis is true?',
      'Why must a test with p-value > alpha conclude insufficient evidence for Ha rather than claiming H0 is proven?',
    ],
    transferMove:
      'For any proportion claim, state H0 and Ha in terms of p, compute z using p0 in the denominator, interpret the p-value assuming H0 is true, and link the alpha decision to context.',
  },

  'ap-stats-ch-03-section-03': {
    examples: [
      'Comparing pass rates of 72/100 (0.72) and 60/100 (0.60) uses pooled p_c = 132/200 = 0.66 in a two-proportion z-test, giving z = 1.79 and two-sided p = 0.073.',
      'In a 2x3 table of 150 urban and 150 rural voters across 3 policies (df = 2), a policy with 90 total votes has expected count (150*90)/300 = 45 per group.',
    ],
    workedDataExample: {
      headers: ['Multi-group categorical test', 'Design setup, expected counts, and degrees of freedom'],
      rows: [
        [
          'Two-proportion z-test (p1 - p2)',
          '2 independent samples, binary outcome; test uses pooled p_c = (x1 + x2)/(n1 + n2)',
        ],
        [
          'Chi-square test for homogeneity',
          '2+ populations or treatments, 1 categorical variable; all E = (row*col)/total >= 5',
        ],
        [
          'Chi-square test for independence',
          '1 random sample, 2 categorical variables; df = (r - 1)(c - 1) tests association',
        ],
      ],
    },
    retrievalPrompts: [
      'How does the sampling design distinguish a chi-square test for homogeneity from a chi-square test for independence?',
      'Why do we pool sample proportions for a two-proportion z-test of H0: p1 = p2 but not for a confidence interval?',
      'How are expected cell counts and degrees of freedom calculated for an r-by-c contingency table?',
    ],
    transferMove:
      'Count the number of sampled populations and categorical variables first to select two-proportion z, homogeneity, or independence, then verify every expected count is at least 5.',
  },

  'ap-stats-ch-04-section-01': {
    examples: [
      'If wait times have mu = 12 min and sigma = 6 min (skewed), SRSs of n = 36 follow approx N(12, 6/sqrt(36) = 1.0 min) by CLT, so P(x-bar > 14) = 0.0228.',
      'For independent samples (n1 = 25, s1 = 8; n2 = 25, s2 = 6), variances add so SE(x-bar1 - x-bar2) = sqrt(64/25 + 36/25) = 2.0, not 1.6 + 1.2 = 2.8.',
    ],
    workedDataExample: {
      headers: ['Sampling distribution target', 'Center, spread formula, and shape condition'],
      rows: [
        [
          'Sample mean x-bar (n = 36, mu = 12, sigma = 6)',
          'Center mu = 12; SD = 6/sqrt(36) = 1.0; approximately Normal by CLT because 36 >= 30',
        ],
        [
          'Small-sample mean x-bar (n = 12, s = 4.2)',
          'SE = 4.2/sqrt(12) = 1.21; inspect sample graph for strong skewness or outliers',
        ],
        [
          'Difference x-bar1 - x-bar2 (n1=n2=25, s1=8, s2=6)',
          'Center mu1 - mu2; SE = sqrt(8^2/25 + 6^2/25) = sqrt(4) = 2.0 because variances add',
        ],
      ],
    },
    retrievalPrompts: [
      'How does dividing sigma by sqrt(n) change the spread of x-bar as sample size increases from 9 to 36?',
      'What must you verify about a sample graph when n < 30 and the population distribution is unknown?',
      'Why do we add variances rather than standard deviations when finding the standard error of x-bar1 - x-bar2?',
    ],
    transferMove:
      'Before computing probabilities for a sample mean or mean difference, write the center, divide spread by sqrt(n) (or add squared SEs), and verify population normality or n >= 30.',
  },

  'ap-stats-ch-04-section-02': {
    examples: [
      'Timing 16 runners before and after a drill gives 16 differences (d-bar = -9.0 s, s_d = 12.0 s), requiring a matched-pairs t-test with df = 15 and t = -3.00.',
      'Comparing quiz scores of 24 students in Section A and 28 independent students in Section B requires a two-sample t procedure with Welch df (at least 23).',
    ],
    workedDataExample: {
      headers: ['Quantitative study design', 'Correct t-procedure, SE, and degrees of freedom'],
      rows: [
        [
          'One SRS of n = 20 measurements (sigma unknown)',
          'One-sample t; SE = s/sqrt(20); df = 19; heavier t-tails account for estimating sigma with s',
        ],
        [
          '16 subjects measured pre- and post-training',
          'Matched-pairs t on d = post - pre; SE = s_d/sqrt(16); df = 15 (do not use two-sample t)',
        ],
        [
          'Two independent groups (n1 = 24, n2 = 28)',
          'Two-sample t; SE = sqrt(s1^2/24 + s2^2/28); Welch df (conservative bound min(23, 27) = 23)',
        ],
      ],
    },
    retrievalPrompts: [
      'Why does replacing unknown sigma with sample SD s require a t-distribution with heavier tails than z?',
      'How can you tell from a study design whether to run a matched-pairs t-test instead of a two-sample t-test?',
      'How do degrees of freedom change the shape of a t-distribution as sample size grows larger?',
    ],
    transferMove:
      'Check whether observations are paired before picking a formula: matched differences use one-sample t (df = n - 1), whereas independent groups require two-sample t.',
  },

  'ap-stats-ch-04-section-03': {
    examples: [
      'A 95% CI of (1.4, 5.8) minutes for mu_A - mu_B excludes 0, so a two-sided alpha = 0.05 test rejects H0 and estimates Route A averages 1.4 to 5.8 min longer.',
      'In a 10,000-patient trial, a 0.6 mmHg blood pressure drop yields p = 0.002 (statistically significant), yet the tiny effect may lack practical clinical value.',
    ],
    workedDataExample: {
      headers: ['t-inference output', 'Cautious contextual statement and limitation'],
      rows: [
        [
          '95% CI for mu_diff: (-15.4, -2.6) sec (n = 16)',
          '95% confident true mean change is 2.6 to 15.4 sec faster; excluding 0 aligns with p < 0.05',
        ],
        [
          'Two-sample t-test: p-value = 0.14 at alpha = 0.05',
          'Fail to reject H0; insufficient evidence that population means differ (does not prove equality)',
        ],
        [
          'Large-n test: mean diff = 0.6 mmHg, p = 0.002',
          'Statistically significant due to tiny SE, but judge practical size against cost and risk',
        ],
      ],
    },
    retrievalPrompts: [
      'How does checking whether 0 lies inside a 95% confidence interval for mu1 - mu2 mirror a two-sided test?',
      'Why can a tiny, practically unimportant mean difference still produce a very small p-value when n is huge?',
      'Which elements must appear in a complete contextual interpretation of a confidence interval for a population mean?',
    ],
    transferMove:
      'Close every mean-inference write-up by naming the population parameter and units, checking the null value against the interval, and weighing practical importance.',
  },

  'ap-stats-ch-05-section-01': {
    examples: [
      'Plotting vehicle weight (x, kg) against fuel economy (y, mpg) shows a moderately strong negative, slightly curved trend plus one high-mpg hybrid outlier.',
      'A height vs. jump-reach scatterplot combining middle-school and varsity athletes forms two clusters, inflating linear r despite weak within-group trends.',
    ],
    workedDataExample: {
      headers: ['Scatterplot diagnostic', 'What to inspect before fitting a linear model'],
      rows: [
        [
          'Direction and form',
          'Note positive or negative trend and linear vs. curved pattern; curvature invalidates a line',
        ],
        [
          'Strength and clusters',
          'Gauge vertical scatter around the trend; distinct clusters signal separate subgroups',
        ],
        [
          'Outliers vs. high-leverage points',
          'Extreme-y points yield large residuals; extreme-x points have high leverage and can pull slope',
        ],
      ],
    },
    retrievalPrompts: [
      'Why should you describe direction, unusual features, form, and strength on a scatterplot before computing r?',
      'How does a high-leverage point with an extreme x-value differ from an outlier with an extreme y-value?',
      'Why can a correlation r near 0 still coexist with a very strong relationship between two quantitative variables?',
    ],
    transferMove:
      'Before fitting a line to two quantitative variables, put the explanatory variable on x, scan for curvature, clusters, and high-leverage points, and verify linearity.',
  },

  'ap-stats-ch-05-section-02': {
    examples: [
      'In y-hat = 52.0 + 4.5x (score vs. study hours), each extra hour predicts a 4.5-point average gain; a student with x = 6 and y = 83 has residual 83 - 79 = +4.0.',
      'Given r = 0.80, s_x = 2.0 hours, and s_y = 11.25 points, the LSRL slope is b = 0.80*(11.25/2.0) = 4.50 points per hour and the line passes through (x-bar, y-bar).',
    ],
    workedDataExample: {
      headers: ['LSRL component', 'Worked value and contextual wording (y-hat = 52.0 + 4.5x)'],
      rows: [
        [
          'Slope b = r*(s_y / s_x)',
          'b = 0.80*(11.25/2.0) = 4.5 pts/hr: predicted score rises 4.5 pts per extra study hour',
        ],
        [
          'y-intercept a = 52.0 pts',
          'Predicted score at x = 0 hours; interpret only when x = 0 is plausible within observed data',
        ],
        [
          'Residual e = y - y-hat',
          'For x = 6 hrs, y = 83: y-hat = 79, so e = +4.0 pts (observed score is 4 pts above line)',
        ],
      ],
    },
    retrievalPrompts: [
      'Why must a slope interpretation include predicted or average language along with both variable units?',
      'How does the sign of a residual e = y - y-hat tell whether the regression line overestimated or underestimated y?',
      'When is the y-intercept of a least-squares regression line mathematically needed yet contextually meaningless?',
    ],
    transferMove:
      'When interpreting a fitted line, compute b = r*(s_y/s_x) from summary stats, state slope with units and predicted-change wording, and find residuals as y minus y-hat.',
  },

  'ap-stats-ch-05-section-03': {
    examples: [
      'With r = 0.80, r^2 = 0.64 means 64% of the variation in exam scores is explained by the linear model with study hours, while s = 6.8 pts gives typical error size.',
      'Using a child growth line fitted on ages 2 to 10 (y-hat = 30 + 2.6x inches) to predict height at age 30 (108 inches) fails because of domain extrapolation.',
    ],
    workedDataExample: {
      headers: ['Model evaluation metric', 'Evidence for adequacy vs. regression limitation'],
      rows: [
        [
          'r^2 = 0.64 and residual SD s = 6.8 pts',
          '64% of y-variation explained linearly; typical prediction differs from observed y by 6.8 pts',
        ],
        [
          'Residual plot check',
          'Even random scatter around 0 supports a line; curved arc or widening fan signals model failure',
        ],
        [
          'Extrapolation and causation limits',
          'Avoid predicting outside the observed x-range; high r^2 in observational data never proves causation',
        ],
      ],
    },
    retrievalPrompts: [
      'How do the interpretations of r^2 and the standard deviation of the residuals s complement each other?',
      'What specific patterns in a residual plot indicate that a linear regression model is inappropriate?',
      'Why do high r^2 values still fail to justify extrapolation beyond observed x-values or causal conclusions?',
    ],
    transferMove:
      'Before trusting a regression claim, inspect the residual plot for curves or fanning, report r^2 and s in context, confirm x is in-domain, and check design for causation.',
  },
};
