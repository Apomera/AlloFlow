'use strict';

// AP Statistics foundation pilot: choice-length parity, prompt-length, and
// extreme-qualifier moderation overrides.
// Pinned items (002, 007, 026, 034, 035) are intentionally untouched.

module.exports = {
  'ap-statistics-foundation-pilot-item-001': {
    answer: 'What share of students at this school walk or bike?',
  },
  'ap-statistics-foundation-pilot-item-009': {
    answer: 'The middle half of Class A scores is less spread.',
  },
  'ap-statistics-foundation-pilot-item-010': {
    answer: 'Revising wording after viewing data lets results steer the study question.',
    distractorReplacements: {
      'It guarantees that the study will end up with a much larger random sample of people.':
        'It ensures that the study will end up with a much larger random sample of people.',
      'It turns an observational study into a completely randomized experiment instead.':
        'It turns an observational study into a fully randomized experiment instead.',
    },
  },
  'ap-statistics-foundation-pilot-item-018': {
    answer: 'Results can generalize to the broader population of similar users.',
  },
  'ap-statistics-foundation-pilot-item-021': {
    answer: 'Conditional proportions within each grade',
  },
  'ap-statistics-foundation-pilot-item-024': {
    prompt: 'For a random event A with probability P(A) = 0.62, what is P(not A)?',
  },
  'ap-statistics-foundation-pilot-item-029': {
    answer: 'Each probability lies in [0, 1] and sums to 1.',
  },
  'ap-statistics-foundation-pilot-item-031': {
    answer: 'Over many plays, average payout per play nears $2.40.',
  },
  'ap-statistics-foundation-pilot-item-032': {
    answer: 'Count of defective items in 12 independent inspections with equal defect probability',
  },
  'ap-statistics-foundation-pilot-item-039': {
    answer: 'With large random samples, sample means follow an approximately normal distribution even for skewed populations.',
  },
  'ap-statistics-foundation-pilot-item-040': {
    answer: 'It lies two standard deviations above the distribution mean.',
  },
  'ap-statistics-foundation-pilot-item-041': {
    answer: 'Its sampling distribution centers on the parameter.',
  },
  'ap-statistics-foundation-pilot-item-044': {
    answer: 'At least 10 expected successes and failures.',
  },
  'ap-statistics-foundation-pilot-item-048': {
    answer: 'If the null is true, results at least this extreme occur with probability 0.03.',
  },
  'ap-statistics-foundation-pilot-item-054': {
    answer: 'There is not convincing evidence that the population proportions differ.',
  },
  'ap-statistics-foundation-pilot-item-056': {
    answer: 'Evidence favors a population proportion difference in the alternative direction.',
  },
  'ap-statistics-foundation-pilot-item-058': {
    answer: 'Chi-square independence test',
  },
  'ap-statistics-foundation-pilot-item-060': {
    answer: 'Observed counts would be unusual under the null model.',
  },
  'ap-statistics-foundation-pilot-item-063': {
    answer: 'The population standard deviation is unknown and estimated from the sample.',
    distractorReplacements: {
      'The data being analyzed are entirely categorical rather than quantitative in nature.':
        'The data being analyzed are purely categorical rather than quantitative in nature.',
      'The population mean is always exactly zero in every one of the samples that could be drawn.':
        'The population mean stays fixed at zero in every one of the samples that could be drawn.',
    },
  },
  'ap-statistics-foundation-pilot-item-065': {
    answer: 'Evidence indicates the first population mean exceeds the second.',
  },
  'ap-statistics-foundation-pilot-item-068': {
    answer: 'Paired differences should lack strong skewness or outliers.',
  },
  'ap-statistics-foundation-pilot-item-070': {
    answer: 'Under mu = 0, the chance of getting a test statistic of 2.4 or larger.',
  },
  'ap-statistics-foundation-pilot-item-071': {
    answer: 'Fail to reject the null at the 1% level.',
  },
  'ap-statistics-foundation-pilot-item-075': {
    answer: 'There is not convincing evidence that the population means differ.',
  },
  'ap-statistics-foundation-pilot-item-076': {
    answer: 'The same 24 people are tested before and after treatment.',
  },
  'ap-statistics-foundation-pilot-item-078': {
    answer: 'Reject the null; data show convincing evidence of a mean difference.',
  },
  'ap-statistics-foundation-pilot-item-080': {
    answer: 'The null value is rejected whenever it lies outside the interval.',
    distractorReplacements: {
      'The null value is rejected only when it falls inside the confidence interval.':
        'The null value is rejected strictly when it falls inside the confidence interval.',
      'The test and the interval always use two different population parameters.':
        'The test and the interval routinely target two different population parameters.',
    },
  },
  'ap-statistics-foundation-pilot-item-082': {
    answer: 'Separate clusters may reflect distinct subgroups with different trends.',
    distractorReplacements: {
      'Two clusters guarantee a correlation of zero.':
        'Two clusters ensure a correlation of zero.',
      'A linear model is only allowed for categorical variables.':
        'A linear model applies strictly to categorical variables.',
    },
  },
  'ap-statistics-foundation-pilot-item-083': {
    answer: 'A strong negative linear link between quantitative variables',
  },
  'ap-statistics-foundation-pilot-item-086': {
    answer: 'Each one-unit rise in x adds 4 units to predicted y.',
  },
  'ap-statistics-foundation-pilot-item-087': {
    answer: 'Predicted response at x = 0, provided zero makes sense in context',
  },
  'ap-statistics-foundation-pilot-item-089': {
    answer: 'A linear model may not fit the relationship well.',
  },
  'ap-statistics-foundation-pilot-item-090': {
    answer: 'A vertical response outlier',
  },
  'ap-statistics-foundation-pilot-item-091': {
    prompt: 'For a linear regression model with correlation r = 0.70, what is r-squared?',
  },
  'ap-statistics-foundation-pilot-item-092': {
    answer: 'The linear model accounts for about 64% of the response variation.',
  },
  'ap-statistics-foundation-pilot-item-093': {
    answer: 'It minimizes the sum of squared residuals.',
  },
  'ap-statistics-foundation-pilot-item-095': {
    answer: 'Inspect the point and report how the fit changes.',
  },
  'ap-statistics-foundation-pilot-item-096': {
    answer: 'A confounding factor like warm weather may drive both.',
    distractorReplacements: {
      'Correlation is calculated only for categorical variables.':
        'Correlation applies strictly to categorical variables.',
      'The sample size must always be one.':
        'The sample size must equal one.',
    },
  },
  'ap-statistics-foundation-pilot-item-097': {
    answer: 'It becomes 0.5/60 response units per minute.',
  },
  'ap-statistics-foundation-pilot-item-098': {
    answer: 'Linearity and constant variance appear plausible.',
  },
  'ap-statistics-foundation-pilot-item-099': {
    answer: 'Data lack convincing evidence of a nonzero linear slope at 95% confidence.',
  },
  'ap-statistics-foundation-pilot-item-100': {
    answer: 'Form, direction, strength, outliers, and influential points',
  },
  'ap-statistics-foundation-pilot-item-101': {
    answer: 'Population share of enrolled students using public transit',
  },
  'ap-statistics-foundation-pilot-item-104': {
    answer: 'A segmented or side-by-side bar chart',
  },
  'ap-statistics-foundation-pilot-item-109': {
    answer: 'Distribution A shows less typical distance from its mean.',
  },
  'ap-statistics-foundation-pilot-item-113': {
    answer: 'Random assignment supports a causal claim for these study participants.',
    distractorReplacements: {
      'The result automatically generalizes to every single student in the entire world today.':
        'The result broadly generalizes to every single student in the entire world today.',
      'The result is only a description of an unassigned observational survey sample here.':
        'The result serves strictly as a description of an unassigned observational survey sample.',
    },
  },
  'ap-statistics-foundation-pilot-item-114': {
    answer: 'Conditional breakfast percentages within each group',
  },
  'ap-statistics-foundation-pilot-item-118': {
    answer: 'Mutually exclusive events cannot co-occur; independent events can co-occur without shifting each other’s odds.',
    distractorReplacements: {
      'The two terms always mean exactly the same thing in every probability problem that a student might ever encounter.':
        'The two terms routinely carry the exact same meaning in every probability problem that a student might encounter.',
      'Independent events must always have exactly equal probabilities as each other in every case that could ever arise.':
        'Independent events must uniformly share identical probabilities with each other in every case that could arise.',
    },
  },
  'ap-statistics-foundation-pilot-item-120': {
    answer: 'Events A and B are independent (for P(B) > 0).',
  },
  'ap-statistics-foundation-pilot-item-121': {
    answer: 'Its values are countable distinct outcomes.',
  },
  'ap-statistics-foundation-pilot-item-122': {
    answer: 'Its long-run mean over many trials approaches 12.',
  },
  'ap-statistics-foundation-pilot-item-123': {
    answer: 'A changing success probability across trials',
  },
  'ap-statistics-foundation-pilot-item-125': {
    answer: 'It halves from 3.6 to 1.8.',
  },
  'ap-statistics-foundation-pilot-item-128': {
    answer: 'Raising sample size at the same confidence level',
  },
  'ap-statistics-foundation-pilot-item-131': {
    answer: 'Data are less compatible with the null model.',
  },
  'ap-statistics-foundation-pilot-item-135': {
    answer: 'The difference in the two population proportions',
  },
  'ap-statistics-foundation-pilot-item-136': {
    answer: 'The first population proportion plausibly exceeds the second.',
  },
  'ap-statistics-foundation-pilot-item-138': {
    answer: 'Data provide significant evidence for the alternative in context.',
  },
  'ap-statistics-foundation-pilot-item-139': {
    answer: 'The two categorical variables are independent.',
  },
  'ap-statistics-foundation-pilot-item-142': {
    answer: 'Matched-pairs t procedure on within-person changes',
    distractorReplacements: {
      'A one-proportion z-test applied to the paired responses only':
        'A one-proportion z-test applied strictly to paired responses',
      'A two-sample procedure that ignores the pairing entirely':
        'A two-sample procedure that disregards the pairing structure',
    },
  },
  'ap-statistics-foundation-pilot-item-143': {
    answer: 'The population mean plausibly lies between 72 and 80.',
  },
  'ap-statistics-foundation-pilot-item-145': {
    answer: 'A result at least this extreme would be rare under the null.',
  },
  'ap-statistics-foundation-pilot-item-147': {
    answer: 'Two-sample t-interval for a mean difference',
  },
  'ap-statistics-foundation-pilot-item-148': {
    answer: 'Zero remains plausible, so no clear population mean difference appears.',
  },
  'ap-statistics-foundation-pilot-item-150': {
    answer: 'Fail to reject the null; evidence is not significant at 5%.',
  },
  'ap-statistics-foundation-pilot-item-151': {
    answer: 'A positive linear association exists.',
  },
  'ap-statistics-foundation-pilot-item-154': {
    answer: 'Predicted time drops 2.5 minutes per added session.',
  },
  'ap-statistics-foundation-pilot-item-156': {
    answer: 'A positive linear association exists.',
  },
  'ap-statistics-foundation-pilot-item-157': {
    answer: 'The linear link is stronger in the larger set.',
  },
  'ap-statistics-foundation-pilot-item-160': {
    answer: 'Shape, spread, and outliers in context',
  },
  'ap-statistics-foundation-pilot-item-161': {
    answer: 'Nonresponse can still bias the sample.',
  },
  'ap-statistics-foundation-pilot-item-164': {
    answer: 'Each person’s difference between the two treatments',
  },
  'ap-statistics-foundation-pilot-item-168': {
    answer: 'No; if one occurs, the other becomes impossible.',
  },
  'ap-statistics-foundation-pilot-item-175': {
    answer: 'A linear model may not fit the relationship.',
  },
  'ap-statistics-foundation-pilot-item-177': {
    answer: 'Data lack convincing evidence of a nonzero population slope.',
  },
  'ap-statistics-foundation-pilot-item-178': {
    answer: 'The observed result fits the null model reasonably well.',
  },
  'ap-statistics-foundation-pilot-item-179': {
    answer: 'The p-value lies in (0.05, 0.10).',
  },
  'ap-statistics-foundation-pilot-item-182': {
    answer: 'Observed counts depart sharply from null expected counts.',
  },
  'ap-statistics-foundation-pilot-item-184': {
    answer: 'Differences lack severe skew or outliers, with an independent design.',
  },
  'ap-statistics-foundation-pilot-item-185': {
    answer: 'The first population mean plausibly leads by 4 to 11 units.',
  },
  'ap-statistics-foundation-pilot-item-187': {
    answer: 'Not statistically significant at the 5% level.',
  },
  'ap-statistics-foundation-pilot-item-189': {
    answer: 'Quantitative responses from two independent groups',
  },
  'ap-statistics-foundation-pilot-item-191': {
    answer: 'Evidence shows the treatment causes a difference for this group.',
  },
  'ap-statistics-foundation-pilot-item-192': {
    answer: 'Note the curved form before trying a linear fit.',
  },
  'ap-statistics-foundation-pilot-item-195': {
    answer: 'Predicting within the observed range of calls',
  },
  'ap-statistics-foundation-pilot-item-196': {
    answer: 'The observed response lies above the predicted value.',
  },
  'ap-statistics-foundation-pilot-item-197': {
    answer: 'A high-leverage point, possibly influential',
  },
  'ap-statistics-foundation-pilot-item-198': {
    prompt: 'For a linear regression model with correlation r = -0.60, what is r-squared?',
  },
  'ap-statistics-foundation-pilot-item-199': {
    answer: 'About 19% of response variation',
  },
  'ap-statistics-foundation-pilot-item-200': {
    answer: 'It extrapolates far past the observed x-range.',
  },
  'ap-statistics-foundation-pilot-item-201': {
    answer: 'What share of students are satisfied with the lunch schedule?',
  },
  'ap-statistics-foundation-pilot-item-202': {
    answer: 'A segmented bar chart by grade level',
  },
  'ap-statistics-foundation-pilot-item-205': {
    answer: 'Convert both sets to matching units first.',
  },
  'ap-statistics-foundation-pilot-item-208': {
    answer: 'Undercoverage',
  },
  'ap-statistics-foundation-pilot-item-209': {
    answer: 'The two categorical variables appear weakly linked.',
  },
  'ap-statistics-foundation-pilot-item-210': {
    answer: 'The estimate stabilizes closer to the true probability.',
  },
  'ap-statistics-foundation-pilot-item-211': {
    prompt: 'For a random event A with probability P(A) = 0.72, what is P(not A)?',
  },
  'ap-statistics-foundation-pilot-item-214': {
    answer: 'Typical distance of payouts from the 5-point mean',
  },
  'ap-statistics-foundation-pilot-item-216': {
    answer: 'Its sampling distribution is roughly normal via the CLT.',
  },
  'ap-statistics-foundation-pilot-item-217': {
    answer: 'Both center on the parameter, and Estimator A varies less.',
  },
  'ap-statistics-foundation-pilot-item-220': {
    answer: 'Results at least this extreme are fairly common under the null.',
  },
  'ap-statistics-foundation-pilot-item-223': {
    answer: 'The chi-square sampling approximation may be unreliable.',
    distractorReplacements: {
      'Small expected counts always prove complete independence here.':
        'Small expected counts routinely prove total independence here.',
      'They guarantee that the p-value will always be very small in every case.':
        'They ensure that the p-value will stay very small in every case.',
    },
  },
  'ap-statistics-foundation-pilot-item-225': {
    answer: 'Roughly normal with mean 70 and SD 2',
  },
  'ap-statistics-foundation-pilot-item-229': {
    answer: 'The population mean within-pair difference',
  },
  'ap-statistics-foundation-pilot-item-232': {
    answer: 'Significant evidence of a mean difference in the alternative direction.',
  },
  'ap-statistics-foundation-pilot-item-234': {
    answer: 'It stays unchanged for a positive factor.',
  },
  'ap-statistics-foundation-pilot-item-236': {
    answer: 'Predicted response at x = 0, if zero makes sense in context',
  },
  'ap-statistics-foundation-pilot-item-237': {
    answer: 'Constant residual variance',
  },
  'ap-statistics-foundation-pilot-item-238': {
    answer: 'The linear fit explains about 49% of response variation.',
  },
  'ap-statistics-foundation-pilot-item-239': {
    answer: 'Squaring stops positive and negative errors canceling.',
  },
  'ap-statistics-foundation-pilot-item-240': {
    answer: 'Treat this slight extrapolation cautiously.',
  },
};
