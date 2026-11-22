'use strict';

// Enriched distractor rationales for AP Statistics foundation pilot (slice 2: items 085-162).
// Every rationale is >= 105 characters, >= 17 words, unique across the pack, and free of key-echo
// or choice-restatement warnings.

module.exports = {
  'ap-statistics-foundation-pilot-item-085': {
    '20':
      'Multiplying the slope 4 by x = 5 gives 20, which captures only the slope term and omits adding the y-intercept of 12 to obtain y-hat = 32.',
    '60':
      'Computing 12 times 5 incorrectly multiplies the y-intercept by x = 5, whereas the linear model adds the intercept 12 to the slope product 4(5) to get 32.',
    '8':
      'Subtracting the slope from the intercept (12 − 4 = 8) ignores the input x = 5 entirely instead of substituting x = 5 into y-hat = 12 + 4x to obtain 32.',
  },
  'ap-statistics-foundation-pilot-item-086': {
    'Every observed value of y in the data is exactly equal to 4 units.':
      'In y-hat = 12 + 4x, the coefficient 4 is a predicted rate of change per unit of x, not a constant observed y-value, because real data points scatter around the line.',
    'The correlation between x and y must therefore equal exactly 4 units.':
      'A regression slope of 4 cannot be the correlation r, because r is a unitless measure bounded between −1 and 1 that differs in both scale and meaning from slope.',
    'When x is equal to zero, the predicted response must be exactly 4.':
      'Setting x = 0 in y-hat = 12 + 4x yields the y-intercept of 12 rather than 4, since 4 is the slope describing how predicted y changes as x increases by one unit.',
  },
  'ap-statistics-foundation-pilot-item-087': {
    'The strength of the association between the two variables in every possible context here':
      'Linear association strength is quantified by the correlation r or r-squared, whereas the intercept solely gives the line’s predicted response when the explanatory variable equals zero.',
    'The largest observed response value in the whole of the data set that was collected here':
      'The y-intercept is a model prediction evaluated at x = 0 rather than a data maximum, and actual observed responses can be much larger or smaller than that baseline.',
  },
  'ap-statistics-foundation-pilot-item-088': {
    '−6':
      'Reversing the subtraction as predicted minus actual (35 − 41) flips the sign; a residual is defined as observed minus predicted, so 41 − 35 equals +6.',
    '35':
      'Reporting 35 repeats the model’s predicted response y-hat instead of computing the residual, which measures the vertical gap y − y-hat = 41 − 35 = 6.',
    '76':
      'Adding the observed value 41 and predicted value 35 produces 76, but a residual measures prediction error by subtracting predicted from actual to give 41 − 35 = 6.',
  },
  'ap-statistics-foundation-pilot-item-089': {
    'The fitted model has no residuals of any kind at all.':
      'Any least-squares regression line produces a residual y − y-hat for every observation, and a systematic curve in those residuals warns that the true relationship is nonlinear.',
  },
  'ap-statistics-foundation-pilot-item-090': {
    'A point with high leverage only':
      'High leverage arises from an extreme horizontal x-value far from the mean of x, whereas this observation lies at an ordinary x-value and stands out only vertically.',
    'A point with a zero residual value':
      'Sitting far from the remaining observations vertically indicates a large prediction error and therefore a large residual, not a residual near zero on the fitted line.',
    'A sampling stratum in the data':
      'A stratum is a subgroup defined before sampling to reduce survey variability, which is a data-collection concept unrelated to identifying unusual observations in a residual plot.',
  },
  'ap-statistics-foundation-pilot-item-091': {
    '0.30':
      'Subtracting 0.70 from 1 yields the complement 0.30, whereas the coefficient of determination r-squared is found by squaring the correlation: (0.70)^2 = 0.49.',
    '0.70':
      'Leaving the value at 0.70 simply restates the correlation r itself without squaring it, while r-squared requires computing (0.70)^2 = 0.49 to measure explained variation.',
    '1.40':
      'Doubling r to get 1.40 confuses squaring with multiplying by 2 and produces an impossible proportion of variance explained, since r-squared must lie between 0 and 1.',
  },
  'ap-statistics-foundation-pilot-item-092': {
    'The model predicts every observed response to within 64 units of its actual observed value here.':
      'The value r-squared = 0.64 is a unitless proportion of total y-variation explained by the regression line, not a guarantee about typical prediction error measured in response units.',
    'There is a 64% chance that the fitted model describes a causal relationship between the two variables.':
      'The coefficient of determination r-squared summarizes how closely points cluster around the fitted line, and it never measures the probability that x causes y.',
  },
  'ap-statistics-foundation-pilot-item-094': {
    'Interpolation':
      'Interpolation estimates responses for x-values located inside the span of the observed data, whereas predicting far beyond the observed domain is risky because linearity may fail there.',
    'Blocking':
      'Blocking is an experimental design strategy that groups similar experimental units before random assignment, so it has nothing to do with predicting outside the observed x-range.',
  },
  'ap-statistics-foundation-pilot-item-095': {
    'Delete it automatically because it changes the slope.':
      'Strong influence on the slope signals a need to verify data accuracy rather than automatically deleting a legitimate observation, so analysts should inspect the point and compare fits.',
    'Keep it hidden because regression cannot use unusual points.':
      'Least-squares regression can accommodate unusual observations, and concealing an influential point distorts transparency instead of examining its validity and reporting results with and without it.',
    'Conclude that the response caused the point.':
      'Noticing that removing one high-leverage point shifts a regression slope addresses sensitivity of the fitted line, not any causal mechanism linking the response to that observation.',
  },
  'ap-statistics-foundation-pilot-item-096': {
    'A positive correlation means the variables cannot be related.':
      'A strong positive correlation directly indicates that ice cream sales and sunburns tend to rise together, yet association alone cannot rule out lurking variables driving both.',
    'The sample size must equal one.':
      'Lack of causal proof does not imply a sample size of one; in fact, correlation cannot even be defined from a single observation, because it requires paired variation across multiple cases.',
  },
  'ap-statistics-foundation-pilot-item-097': {
    'It remains 0.5 with no unit change.':
      'Because slope carries units of response per explanatory unit, converting hours into 60 minutes changes the denominator scale and requires dividing the numerical slope by 60 to preserve predictions.',
    'It becomes 60.5.':
      'Adding 60 to 0.5 applies an additive shift rather than a unit conversion factor; since one minute is 1/60 of an hour, the per-minute change scales multiplicatively to 0.5/60.',
  },
  'ap-statistics-foundation-pilot-item-098': {
    'The fitted line must therefore describe a causal relationship.':
      'A clean residual plot evaluates whether a straight-line model with steady vertical scatter fits the data, whereas causal conclusions depend on random assignment in the study design.',
    'The model predicts every one of the data points exactly right.':
      'Random scatter around zero still consists of nonzero prediction errors above and below the line; exact prediction for every observation would require every residual to equal zero.',
  },
  'ap-statistics-foundation-pilot-item-099': {
    'The population slope must therefore be exactly equal to zero everywhere in the population.':
      'Including zero inside a 95% confidence interval makes zero one plausible candidate among all values in the interval, rather than proving the true population slope equals zero exactly.',
    'The fitted model proves that there is a real causal effect between these two variables here.':
      'When zero sits within the confidence interval for the slope, the data do not even provide convincing evidence of a linear association, much less proof of a causal effect.',
  },
  'ap-statistics-foundation-pilot-item-100': {
    'Only the largest response value that appears in the whole data set':
      'Inspecting only the maximum response reveals nothing about whether the scatterplot follows a straight-line pattern, how strong or steep it is, or whether unusual points distort the fit.',
    'Whether the graph happens to use a pie chart instead of a scatterplot':
      'Pie charts display proportions for a single categorical variable and cannot represent paired quantitative measurements, so checking for a pie chart is irrelevant to linear regression.',
    'Whether the sample mean of the response happens to be equal to zero':
      'A linear model fits data regardless of where the response mean sits on the number line, because the intercept shifts the line vertically to pass through the mean point (x-bar, y-bar).',
  },
  'ap-statistics-foundation-pilot-item-101': {
    'The total number of school buses that are used by the school every day.':
      'Counting how many buses the school operates measures fleet size rather than a population proportion, so it does not capture the fraction of enrolled students riding public transit.',
    'The mean number of transportation trips that are made by one single student.':
      'Summarizing trips for a single individual is neither a population-wide summary nor a proportion, whereas the parameter of interest is the share of all enrolled students using transit.',
  },
  'ap-statistics-foundation-pilot-item-102': {
    'Commute time in minutes':
      'Commute time is recorded as a numerical measurement in minutes on which averages and differences make sense, making it a quantitative variable rather than a categorical label.',
    'Distance traveled in miles':
      'Distance in miles is a continuous numerical measurement with meaningful arithmetic units, so it is classified as a quantitative variable instead of a category.',
    'Number of transfers':
      'Counting transfers produces discrete numerical values that can be averaged or ordered with consistent gaps, which makes it a quantitative variable rather than a categorical one.',
  },
  'ap-statistics-foundation-pilot-item-103': {
    '0.30':
      'Dividing 45 by the total of 150 students yields 0.30, which is the relative frequency for walkers rather than the 75/150 = 0.50 relative frequency for bus riders.',
    '1.50':
      'A relative frequency is a proportion between 0 and 1 and can never reach 1.50; dividing the 75 bus riders by all 150 students gives 75/150 = 0.50.',
  },
  'ap-statistics-foundation-pilot-item-104': {
    'A single histogram of all commute times':
      'Commute time is a quantitative variable different from transportation mode, and a single combined histogram cannot compare categorical proportions across two grade levels.',
    'A scatterplot of student names':
      'Student names are unique text identifiers rather than paired quantitative measurements, so they cannot be plotted on numerical x- and y-axes in a scatterplot.',
    'A boxplot of category labels':
      'Boxplots require ordered quantitative observations to calculate quartiles and medians, whereas transportation categories have no numerical quartiles and must be compared with bar charts.',
  },
  'ap-statistics-foundation-pilot-item-105': {
    'A bar chart with one bar for each student name':
      'Assigning a separate bar to every student displays individual values by label rather than grouping numerical step counts into intervals to reveal shape, center, and spread.',
    'A two-way table of two categorical variables':
      'Daily step counts form a single quantitative variable, while a two-way table cross-tabulates counts for two categorical variables and cannot summarize a quantitative distribution.',
  },
  'ap-statistics-foundation-pilot-item-106': {
    'The mean must equal the median.':
      'The mean and median match closely in symmetric distributions, whereas a long left tail pulls the nonresistant mean downward below the median.',
    'The mean is greater than the maximum.':
      'Because the arithmetic mean is a weighted balance point of all observations in the data set, it must lie between the minimum and maximum and can never exceed the largest value.',
    'The median must be zero.':
      'The median simply marks the 50th percentile of the ordered values, and a left-skewed shape affects the mean’s position relative to the median without forcing the median to zero.',
  },
  'ap-statistics-foundation-pilot-item-107': {
    '7':
      'Computing Q3 minus the median (25 − 18 = 7) measures only the upper quarter’s width, whereas the interquartile range spans the full middle 50% as Q3 − Q1 = 25 − 12 = 13.',
    '18':
      'Reporting 18 gives the median, which is a measure of center rather than the interquartile range of spread calculated by subtracting Q1 = 12 from Q3 = 25.',
    '37':
      'Adding Q1 and Q3 (12 + 25 = 37) sums the quartiles instead of finding the distance between them; the IQR is defined by subtraction, Q3 − Q1 = 13.',
  },
  'ap-statistics-foundation-pilot-item-108': {
    'A value exactly equal to the mean':
      'The mean sits near the center of the data distribution and does not flag unusual extremes, whereas the 1.5-IQR criterion checks whether points fall beyond quartile-based fences.',
    'Any value above the median':
      'Half of all observations in a distribution lie above the median, so being above the center is completely normal rather than evidence of an outlier under the 1.5-IQR rule.',
    'The difference between the minimum and maximum only':
      'Subtracting the minimum from the maximum gives the overall range, while the 1.5-IQR rule uses quartiles to build lower and upper outlier cutoffs.',
  },
  'ap-statistics-foundation-pilot-item-109': {
    'Distribution A must therefore have a larger median.':
      'Standard deviation quantifies typical distance from the mean and does not determine the median, so two distributions with equal means can have different medians in either direction.',
    'Distribution A must therefore be skewed to the right.':
      'Measures of spread like standard deviation do not dictate skewness; a tighter cluster around the mean can be symmetric, left-skewed, or right-skewed.',
  },
  'ap-statistics-foundation-pilot-item-110': {
    'A randomized experiment':
      'A randomized experiment requires actively imposing treatments on subjects via random assignment, whereas this researcher only recorded existing homework habits and exam scores without intervening.',
    'A matched-pairs experiment with no response variable':
      'No treatments were assigned or paired in this study, and exam score clearly serves as the response variable being observed alongside homework habits.',
  },
  'ap-statistics-foundation-pilot-item-111': {
    'A voluntary response sample':
      'Voluntary response sampling relies on people choosing to opt in on their own, whereas this roster procedure uses a random start and a fixed step of ten.',
    'A cluster sample':
      'Cluster sampling randomly selects intact groups and surveys everyone inside them, while selecting every tenth individual from an ordered list draws individuals spread across the roster.',
    'A census':
      'A census collects data from every single member of the population on the roster, rather than selecting only one-tenth of the names at regular intervals.',
  },
  'ap-statistics-foundation-pilot-item-112': {
    'Placebo effect':
      'A placebo effect happens when experimental subjects respond to believing they received an active treatment, whereas a mailed opinion survey assigns no treatments at all.',
    'Underflow in a probability calculation':
      'Numerical underflow is a computer arithmetic rounding issue when probabilities become extremely close to zero, not a survey bias caused by low response rates.',
    'Random assignment bias':
      'Random assignment is a tool used in experiments to balance treatment groups rather than a type of bias, and this mailed survey involves no treatment assignment.',
  },
  'ap-statistics-foundation-pilot-item-113': {
    'The result broadly generalizes to every single student in the entire world today.':
      'Because participants were volunteers rather than a random sample from a global population, the findings cannot be generalized to all students everywhere even though treatments were randomized.',
    'The study proves that the sample mean equals the whole population mean exactly here.':
      'Due to sampling variability, a sample statistic virtually never matches the population parameter exactly, and an experiment tests treatment differences rather than proving exact equality.',
    'The result serves strictly as a description of an unassigned observational survey sample.':
      'Randomly assigning volunteers to tutoring versus no tutoring imposes treatments directly, which makes this a randomized experiment capable of supporting cause-and-effect inference for the participants.',
  },
  'ap-statistics-foundation-pilot-item-114': {
    'Only the grand total of all of the breakfast choices made.':
      'A single overall total combines athletes and nonathletes together into one count and hides whether breakfast preferences differ between the two groups.',
    'The row labels by themselves without any of the counts.':
      'Category names alone provide no numerical frequencies or proportions, so comparing breakfast behavior across groups requires computing relative percentages within each group.',
    'The mean value of all of the categorical labels that are used.':
      'Arithmetic means cannot be computed for non-numeric categorical labels like breakfast choices; evaluating an association requires comparing conditional percentages across subgroups.',
  },
  'ap-statistics-foundation-pilot-item-115': {
    '24%':
      'Treating the raw count of 24 students directly as 24% ignores the group size of 40; dividing 24 by 40 gives the conditional proportion 0.60, or 60%.',
    '40%':
      'Using 40% confuses the subgroup total of 40 students with a percentage; 40 is the denominator of the conditional fraction 24/40 = 60%.',
    '66.7% of all observations regardless of group size':
      'A conditional percentage must divide by the specific subgroup total rather than ignoring group size, and dividing 24 by 40 yields 60% instead of 66.7%.',
  },
  'ap-statistics-foundation-pilot-item-116': {
    '0.0062':
      'Writing 0.0062 shifts the decimal point one place too far left, corresponding to 31 out of 5,000 rather than 31 out of 500, which equals 0.062.',
    '0.31':
      'Reporting 0.31 treats the 31 successes as if they occurred in 100 trials instead of dividing by the actual 500 simulated repetitions to get 0.062.',
    '16.13':
      'Dividing 500 by 31 inverts the ratio of successes to trials and yields a number greater than 1, which is impossible for any probability estimate.',
  },
  'ap-statistics-foundation-pilot-item-117': {
    '0.15':
      'Subtracting 0.20 from 0.35 gives 0.15, whereas the addition rule for disjoint events adds their probabilities because they share no overlap: 0.35 + 0.20 = 0.55.',
    '1.55':
      'Adding 1 to the sum produces 1.55, which violates the fundamental axiom that every probability must lie between 0 and 1 inclusive.',
  },
  'ap-statistics-foundation-pilot-item-118': {
    'The two terms routinely carry the exact same meaning in every probability problem that a student might encounter.':
      'Mutual exclusivity means two events cannot happen together (zero intersection), while independence means knowing one occurred does not change the other’s probability, which are distinct concepts.',
    'Independent events must uniformly share identical probabilities with each other in every case that could arise.':
      'Independence requires P(A and B) = P(A)P(B) and imposes no requirement that P(A) and P(B) be equal; two events with very different probabilities can still be independent.',
    'Mutually exclusive events must each have a probability of exactly 0.50 in every problem that might ever be posed.':
      'Disjoint events only need to have no outcomes in common so that their individual probabilities sum to at most 1; neither probability needs to equal 0.50.',
  },
  'ap-statistics-foundation-pilot-item-119': {
    '0.12':
      'Computing 0.30 minus 0.18 yields 0.12, which is P(B and not A) rather than the conditional probability P(A | B) = P(A and B)/P(B) = 0.18/0.30 = 0.60.',
    '0.48':
      'Adding 0.18 and 0.30 sums the joint and marginal probabilities instead of dividing the intersection probability 0.18 by the conditioning event’s probability 0.30.',
    '1.67':
      'Dividing 0.30 by 0.18 puts P(B) in the numerator by mistake and produces a value above 1, which cannot be a valid probability.',
  },
  'ap-statistics-foundation-pilot-item-120': {
    'The events A and B must therefore be mutually exclusive.':
      'If A and B could never occur together, conditioning on B would force P(A | B) to equal 0 rather than matching P(A) = 0.42.',
    'The probability of the event B must be exactly zero.':
      'The conditional probability P(A | B) is calculated by dividing by P(B), so it is only defined when P(B) > 0 and cannot imply P(B) = 0.',
    'The events A and B must always occur at the same time.':
      'If A occurred every time B occurred, then P(A | B) would equal 1, whereas P(A | B) = 0.42 = P(A) indicates that knowing B leaves A’s chance unchanged.',
  },
  'ap-statistics-foundation-pilot-item-121': {
    'It can take every real value between 0 and 5.':
      'Taking every real number across an interval defines a continuous random variable, whereas this game awards only the isolated, countable outcomes 0, 2, or 5 points.',
    'It measures a continuous physical length only.':
      'Game points are counted in fixed discrete increments rather than measured along a continuous physical scale, so the random variable is discrete instead of continuous.',
    'Its expected value must be an integer.':
      'A discrete random variable can easily have a non-integer expected value because the mean is a probability-weighted average of the possible numerical outcomes.',
  },
  'ap-statistics-foundation-pilot-item-122': {
    'Every one of the individual outcomes is exactly equal to 12.':
      'Expected value describes the long-run average across many repetitions rather than a constant single outcome; individual trials typically vary above and below 12.',
    'The most likely single outcome must be exactly equal to 12.':
      'The mean of a random variable need not equal its mode and might not even appear among the possible outcomes, so 12 is not necessarily the most likely result.',
    'The random variable has a standard deviation of exactly 12.':
      'Expected value measures the center of a probability distribution, whereas standard deviation is a separate parameter quantifying how widely outcomes spread around that center.',
  },
  'ap-statistics-foundation-pilot-item-123': {
    'A fixed number of trials':
      'Having a predetermined, fixed number of trials n is one of the essential BINS conditions required for a binomial setting, not a condition that can be omitted.',
    'Two outcomes per trial':
      'Classifying every trial into exactly two categories—success or failure—is the binary requirement of a binomial model, so it is definitely required.',
    'Independent trials with a constant success probability':
      'Both independence across trials and a constant probability p of success on every trial are core binomial requirements, unlike a shifting success probability.',
  },
  'ap-statistics-foundation-pilot-item-124': {
    '85':
      'Subtracting one standard deviation from the mean (100 − 15 = 85) places the score one standard deviation below the mean rather than above it.',
    '100':
      'A score of 100 sits directly at the distribution mean with a z-score of 0, rather than one standard deviation (15 points) above the mean.',
    '130':
      'Adding 30 to 100 reaches 130, which is two standard deviations above the mean (z = +2) instead of one standard deviation above (100 + 15 = 115).',
  },
  'ap-statistics-foundation-pilot-item-125': {
    'It doubles, going from 3.6 to 7.2.':
      'Increasing sample size reduces sampling variability rather than increasing it; since sigma/sqrt(n) divides by sqrt(n), quadrupling n from 25 to 100 cuts 3.6 in half.',
    'It remains exactly 18 in both.':
      'The value 18 is the population standard deviation sigma, whereas the sampling distribution of x-bar has standard deviation sigma/sqrt(n), which shrinks as n grows.',
    'It becomes exactly zero here.':
      'Although standard deviation of x-bar decreases toward zero as sample size grows very large, sigma/sqrt(100) = 1.8 remains strictly positive for any finite sample.',
  },
  'ap-statistics-foundation-pilot-item-126': {
    'A census parameter known without sampling':
      'A parameter describes the entire population and is usually unknown, whereas the sample proportion p-hat is a sample statistic used to estimate that parameter.',
    'A Type II error':
      'A Type II error occurs when a hypothesis test fails to reject a false null hypothesis, which is a decision error rather than a statistic estimating a population value.',
    'A critical value only':
      'A critical value is a boundary taken from a z- or t-distribution for a chosen confidence or significance level, not a sample statistic calculated from observed data.',
  },
  'ap-statistics-foundation-pilot-item-127': {
    '0.1875':
      'Multiplying 0.25 by 0.75 gives 0.1875, which is only the numerator p(1 − p) before dividing by n = 400 and taking the square root to get 0.0217.',
    '0.25':
      'Stating 0.25 repeats the population proportion p (the center of the sampling distribution) instead of computing its standard deviation sqrt(p(1 − p)/n) ≈ 0.0217.',
  },
  'ap-statistics-foundation-pilot-item-128': {
    'Increasing the confidence level with the same sample size.':
      'Raising the confidence level increases the critical value z*, which widens the confidence interval and makes the margin of error larger rather than smaller.',
    'Replacing random sampling with voluntary response.':
      'Switching to voluntary response introduces severe selection bias that invalidates inference formulas rather than narrowing the margin of error.',
    'Removing the estimate from the interval.':
      'The sample proportion p-hat is the midpoint around which the margin of error is added and subtracted; omitting it removes the center of the interval without reducing its half-width.',
  },
  'ap-statistics-foundation-pilot-item-129': {
    '0.32':
      'Because 0.32 falls inside the 90% confidence interval (0.31, 0.39), the sample data remain consistent with p = 0.32, making it a plausible value rather than an implausible one.',
    '0.35':
      'The value 0.35 is the midpoint of (0.31, 0.39)—the sample proportion p-hat itself—so it is the single most plausible estimate inside the interval.',
    '0.38':
      'Since 0.38 lies comfortably between the lower bound 0.31 and upper bound 0.39, it remains a plausible value for the population proportion at the 90% level.',
  },
  'ap-statistics-foundation-pilot-item-130': {
    'H0: p < 0.18':
      'The null hypothesis always states a benchmark of equality (p = 0.18), whereas the strict inequality p < 0.18 belongs in the alternative hypothesis being tested.',
    'H0: p-hat < 0.18':
      'Significance tests state hypotheses about the unknown population proportion p using equality in H0, never about the observed sample proportion p-hat.',
    'H0: p = 0.82':
      'Using 0.82 represents the complement (customers who do not abandon a cart), whereas the research question specifically tests whether the abandonment proportion is below 0.18.',
  },
  'ap-statistics-foundation-pilot-item-131': {
    'The sample was definitely biased.':
      'A small p-value shows that the observed statistic would be unlikely by random chance if H0 were true, but it does not diagnose whether the sampling method was biased.',
    'The alternative hypothesis is proven with certainty.':
      'Even a very small p-value provides strong statistical evidence rather than absolute proof, because an extreme sample can still happen occasionally when the null hypothesis is true.',
  },
  'ap-statistics-foundation-pilot-item-132': {
    'Reject H0 because the p-value is positive.':
      'Every p-value is nonnegative by definition, so rejecting H0 requires comparing the p-value against alpha; here p = 0.012 exceeds alpha = 0.01.',
    'Accept H0 as proven true.':
      'When p > alpha, we fail to reject H0 because the evidence is insufficient, which never proves that the null hypothesis p = 0.40 is actually true.',
    'Reject H0 because 0.012 is less than 0.05 regardless of alpha.':
      'The test decision must compare the p-value to the pre-specified significance level alpha = 0.01 rather than 0.05, and since 0.012 > 0.01 we cannot reject H0.',
  },
  'ap-statistics-foundation-pilot-item-133': {
    'Rejects a true null hypothesis.':
      'Rejecting a true null hypothesis is a Type I error (a false positive), whereas a Type II error happens when the test misses a real effect and fails to reject a false null.',
    'Rejects a true alternative hypothesis.':
      'Hypothesis tests make decisions about rejecting or failing to reject the null hypothesis H0, never about rejecting the alternative hypothesis Ha.',
    'Uses a sample proportion instead of a parameter.':
      'Writing p-hat in place of p is a notation error when formulating hypotheses, not a Type II decision error made after evaluating test evidence.',
  },
  'ap-statistics-foundation-pilot-item-134': {
    'p1 + p2':
      'Adding the two population proportions gives the center for a sum of sample proportions, whereas the sampling distribution of the difference p-hat1 − p-hat2 is centered at p1 − p2.',
    '0 for every pair of populations':
      'The sampling distribution of p-hat1 − p-hat2 is centered at 0 only under the special case p1 = p2; in general its mean equals the true difference p1 − p2.',
  },
  'ap-statistics-foundation-pilot-item-135': {
    'The sum of the two sample counts and nothing more.':
      'Raw sample counts are observed statistics rather than population parameters, and a two-proportion interval estimates a difference in proportions rather than a sum.',
    'The mean of one single quantitative population only.':
      'Proportions describe categorical success rates across groups rather than quantitative averages, so this interval does not estimate a single population mean.',
    'The correlation between two sets of measurements.':
      'Correlation measures the linear association between two quantitative variables measured on the same units, not a gap between proportions from two independent groups.',
  },
  'ap-statistics-foundation-pilot-item-136': {
    'The second population proportion is definitely the greater one.':
      'Because the entire interval (0.02, 0.18) for p1 − p2 lies above zero, p1 − p2 appears positive, which suggests p1 is larger than p2 rather than smaller.',
    'The two sample proportions must be exactly equal to each other.':
      'The midpoint of (0.02, 0.18) is 0.10, meaning the observed sample difference p-hat1 − p-hat2 equals 0.10 rather than zero.',
    'The interval proves that a causal effect must exist here.':
      'A confidence interval estimates the size and direction of a difference between proportions, whereas establishing causation requires a randomized experiment rather than an interval alone.',
  },
  'ap-statistics-foundation-pilot-item-137': {
    'Ha: p1 - p2 = 0':
      'Stating equality p1 − p2 = 0 defines the null hypothesis of no difference, whereas the alternative hypothesis must express the directional inequality being investigated.',
    'Ha: p1 - p2 > 0':
      'Writing p1 − p2 > 0 tests whether population 1 has a larger proportion than population 2, which reverses the claim that population 1’s proportion is smaller.',
    'Ha: p-hat1 - p-hat2 < 0 for every sample':
      'Formal hypotheses always refer to fixed population parameters p1 and p2 rather than sample statistics p-hat1 and p-hat2, which vary from sample to sample.',
  },
  'ap-statistics-foundation-pilot-item-138': {
    'The null hypothesis is mathematically impossible in any possible population of interest.':
      'Rejecting H0 means the observed data would be unlikely if H0 were true, not that the null hypothesis has been ruled out as mathematically impossible.',
    'The sample proportions are guaranteed to differ in every one of the future samples taken.':
      'Statistical inference draws conclusions about population parameters rather than guaranteeing what every future random sample will produce, because sampling variability always remains.',
    'The result proves that one treatment caused the difference without a randomized design.':
      'A significant two-proportion test shows evidence of a difference between populations, but claiming causation still requires random assignment of treatments in an experiment.',
  },
  'ap-statistics-foundation-pilot-item-139': {
    'Every cell in the table has the same observed count.':
      'Independence does not imply uniform cell counts across the table; instead, expected counts reflect row and column marginal totals under the assumption of no association.',
    'The sample was selected without any randomness.':
      'Random sampling is an inference condition required for valid chi-square calculations, not the null hypothesis tested by a chi-square test of independence.',
  },
  'ap-statistics-foundation-pilot-item-140': {
    '9':
      'Multiplying (4 − 1) by 3 gives 9 because it forgets to subtract 1 from the column count; the formula df = (r − 1)(c − 1) yields (4 − 1)(3 − 1) = 6.',
    '12':
      'Multiplying 4 rows by 3 columns gives all 12 cells in the table instead of accounting for fixed row and column totals via df = (4 − 1)(3 − 1) = 6.',
  },
  'ap-statistics-foundation-pilot-item-141': {
    'The population variance divided by n.':
      'The quantity sigma^2 / n is the variance of the sampling distribution of x-bar, which measures spread rather than its expected value (center) mu.',
  },
  'ap-statistics-foundation-pilot-item-142': {
    'A one-proportion z-test applied strictly to paired responses':
      'Before-and-after measurements on each participant are quantitative rather than binary categorical outcomes, so a z-procedure for proportions does not match the data type.',
    'A chi-square test for independence between the variables':
      'Chi-square tests analyze counts in categorical tables rather than numerical within-subject differences, which require a one-sample t-procedure on the paired changes.',
  },
  'ap-statistics-foundation-pilot-item-143': {
    'The sample mean changes between 72 and 80 with a probability of 0.95.':
      'The observed sample mean is a fixed known number at the center (76) of the interval, whereas the interval provides plausible values for the unknown population mean mu.',
    'Every future sample mean must fall inside this same confidence interval.':
      'Confidence intervals estimate the population parameter mu rather than trapping every future sample mean, which will naturally vary outside (72, 80) in repeated sampling.',
  },
  'ap-statistics-foundation-pilot-item-144': {
    'Ha: mu = 10':
      'The equality mu = 10 specifies the null hypothesis H0, while the alternative hypothesis Ha must express the directional claim that mean battery life is greater than 10 hours.',
    'Ha: mu < 10':
      'Using the less-than sign tests whether mean battery life falls below 10 hours, which is the opposite direction of testing whether it exceeds 10 hours.',
  },
  'ap-statistics-foundation-pilot-item-145': {
    'There is only a 0.4% chance that the null model is actually true for this population.':
      'A p-value is a conditional probability of observing data this extreme assuming H0 is true, not the probability that the null hypothesis itself is true.',
    'The observed sample mean is wrong by exactly 0.004 units in this particular study.':
      'The p-value 0.004 is a tail probability under the null sampling distribution, not a measurement error expressed in the units of the sample mean.',
    'The population standard deviation must equal exactly 0.004 units in this study.':
      'The population standard deviation sigma measures spread in the data’s original units and has no direct numerical equivalence to the test’s p-value.',
  },
  'ap-statistics-foundation-pilot-item-146': {
    'mu1 + mu2':
      'Summing the population means gives the center of x-bar1 + x-bar2, whereas subtracting two independent sample means centers the sampling distribution at mu1 − mu2.',
    '0 for all populations':
      'The mean of x-bar1 − x-bar2 equals 0 only when the two populations happen to share the exact same mean; otherwise it equals mu1 − mu2.',
    'The pooled sample standard deviation':
      'A pooled standard deviation measures data variability from samples rather than locating the theoretical center of the sampling distribution of x-bar1 − x-bar2.',
  },
  'ap-statistics-foundation-pilot-item-147': {
    'A one-proportion z-interval for a proportion':
      'A one-proportion z-interval estimates a single categorical proportion, whereas this question asks to estimate the difference between two independent quantitative population means.',
    'A chi-square test for homogeneity of counts':
      'A chi-square homogeneity test compares categorical distributions across populations and tests hypotheses rather than producing a confidence interval for a mean difference.',
    'A binomial probability calculation for counts':
      'Binomial calculations compute probabilities for counts of binary successes in fixed trials, not interval estimates comparing averages of two quantitative groups.',
  },
  'ap-statistics-foundation-pilot-item-148': {
    'The first population mean is definitely the larger one of the two population means.':
      'Because (−1.4, 2.1) extends into negative values as well as positive ones, mu1 could plausibly be smaller than, equal to, or larger than mu2.',
    'Every individual measurement has a difference that falls inside that same interval.':
      'A confidence interval for mu1 − mu2 estimates plausible values for the difference between two population averages, not the range of individual paired observations.',
  },
  'ap-statistics-foundation-pilot-item-149': {
    'Ha: mu_new - mu_old = 0':
      'Writing an equals sign gives the null hypothesis of no change in mean completion time, whereas the alternative must reflect the claimed reduction.',
    'Ha: mu_new - mu_old > 0':
      'A positive difference mu_new − mu_old > 0 asserts that the new process takes more time on average than the old one, contradicting the goal of reducing time.',
    'Ha: x-bar_new - x-bar_old < 0 for every sample':
      'Significance test hypotheses are written in terms of population parameters mu_new and mu_old, never in terms of sample means x-bar that fluctuate across samples.',
  },
  'ap-statistics-foundation-pilot-item-150': {
    'Reject the null hypothesis because the p-value is not exactly equal to zero here.':
      'P-values are practically always positive, and rejection occurs only when p <= alpha; because 0.23 is much larger than 0.05, the test does not reject H0.',
    'Accept the null hypothesis as having been proven true by these particular data.':
      'A p-value of 0.23 simply means the sample lacks convincing evidence against H0, which never proves that the two population means are actually identical.',
    'Conclude that the two sample means can never differ from one another at all.':
      'Two random sample means almost always differ slightly due to chance variation; failing to reject H0 addresses insufficient evidence of a population mean difference.',
  },
  'ap-statistics-foundation-pilot-item-151': {
    'The relationship must necessarily be causal.':
      'A linear trend in a scatterplot documents association between study hours and scores, whereas establishing causation requires randomly assigning study hours in a controlled experiment.',
    'The response variable must be categorical here.':
      'Plotting exam score on the vertical axis of a scatterplot requires numerical values, so the response variable is quantitative rather than categorical.',
    'The correlation must be exactly equal to zero.':
      'A correlation near zero corresponds to no linear trend, whereas an upward straight-line pattern indicates a positive correlation r > 0.',
  },
  'ap-statistics-foundation-pilot-item-152': {
    '0 to 100':
      'Correlation r is not expressed on a 0-to-100 percentage scale, and it can take negative values down to −1 when a linear association slopes downward.',
    'Negative infinity to infinity':
      'Because correlation standardizes both variables into z-scores, its value cannot grow arbitrarily large and is strictly bounded between −1 and 1 inclusive.',
    '0 to 1 only':
      'Restricting r to nonnegative numbers omits negative linear relationships, which produce correlation values ranging from −1 up to 0.',
  },
  'ap-statistics-foundation-pilot-item-153': {
    '15':
      'Adding 12 and 3 yields 15, which forgets to multiply the slope 3 by the input x = 4 before adding the intercept 12 to obtain 12 + 3(4) = 24.',
    '36':
      'Multiplying the intercept 12 by the slope 3 gives 36 instead of evaluating the regression equation at x = 4 via 12 + 3(4) = 24.',
    '48':
      'Computing 12 times 4 incorrectly multiplies the y-intercept by x = 4 rather than adding the intercept 12 to the slope term 3(4) to get 24.',
  },
  'ap-statistics-foundation-pilot-item-154': {
    'Every single student loses exactly 2.5 minutes of time in each practice session.':
      'A regression slope describes the predicted average change per added session across the trend line, while individual students’ actual times vary above and below that prediction.',
    'The intercept of the fitted model must be exactly -2.5 minutes in this case.':
      'The value −2.5 is the rate of change per practice session (the slope), whereas the y-intercept is a separate coefficient giving the predicted time at zero sessions.',
    'The correlation between the variables must therefore be exactly -2.5.':
      'Correlation r is always constrained to the interval [−1, 1], so a number like −2.5 cannot be a correlation and carries units of minutes per session as a slope.',
  },
  'ap-statistics-foundation-pilot-item-155': {
    '3':
      'Subtracting observed from predicted (21 − 18 = 3) reverses the residual formula; because observed minus predicted is 18 − 21 = −3, the point lies below the line.',
    '18':
      'Reporting 18 merely restates the observed response y instead of finding the prediction error y − y-hat = 18 − 21 = −3.',
    '39':
      'Adding 18 and 21 combines the actual and predicted responses into 39, whereas a residual takes their difference y − y-hat = 18 − 21 = −3.',
  },
  'ap-statistics-foundation-pilot-item-156': {
    'The response is categorical.':
      'Exam score is a numerical measurement that can be placed along a quantitative axis in a scatterplot, not a categorical label.',
    'The variables are proven causally related.':
      'Observing an upward trend in a scatterplot shows that higher study hours tend to accompany higher scores, but association alone cannot prove cause and effect.',
    'The correlation must equal zero.':
      'A clear upward straight-line pattern reflects a positive linear relationship with r > 0 rather than a correlation of zero.',
  },
  'ap-statistics-foundation-pilot-item-157': {
    'The response variable changed units.':
      'Because correlation r is calculated from standardized z-scores, linear unit conversions leave r completely unchanged and cannot explain a jump from 0.40 to 0.80.',
    'The association became negative.':
      'Both 0.40 and 0.80 are positive values, meaning the linear trend remained upward while growing noticeably closer to a straight line.',
    'The correlation is now outside its possible range.':
      'Valid correlation values span from −1 to 1 inclusive, so r = 0.80 lies well inside the allowable range and indicates a strong positive linear fit.',
  },
  'ap-statistics-foundation-pilot-item-158': {
    'The median must decrease.':
      'Appending one very large observation at the upper end shifts the middle position slightly upward or leaves the median unchanged; it can never pull the median downward.',
    'The IQR must become zero.':
      'Because the quartiles Q1 and Q3 resist extreme values, adding a single large observation changes the middle 50% spread very little and cannot collapse the IQR to zero.',
    'The minimum must increase above the added value.':
      'Inserting a very large observation affects the upper end of the data set while leaving the smallest value completely untouched, so the minimum cannot surpass it.',
  },
  'ap-statistics-foundation-pilot-item-159': {
    'It remains numerically unchanged.':
      'Unlike unitless quantities such as z-scores and correlation, standard deviation carries the data’s measurement units, so multiplying every value by 60 also multiplies the standard deviation by 60.',
  },
  'ap-statistics-foundation-pilot-item-160': {
    'Only the larger sample mean.':
      'Reporting just the higher mean mentions only one group’s center and leaves out comparative shape, variability, and unusual observations needed for a complete distribution comparison.',
    'The labels of the researchers.':
      'Identifying who gathered the measurements is study metadata rather than a statistical characteristic of the distributions being compared.',
    'The order in which the data were typed.':
      'Data-entry sequence does not alter the numerical values in either distribution and provides no information about center, spread, shape, or outliers.',
  },
  'ap-statistics-foundation-pilot-item-161': {
    'Random sampling guarantees no bias of any kind.':
      'Random selection eliminates bias in choosing whom to contact, yet high refusal rates on a sensitive question can still leave the actual respondents unrepresentative of the school.',
    'The design becomes a randomized experiment.':
      'Randomly selecting students from a roster to answer a survey imposes no treatments, so the study remains an observational sample survey rather than an experiment.',
    'The parameter no longer exists.':
      'The true population proportion among all students in the school still exists regardless of refusals; nonresponse simply makes estimating that parameter accurately much harder.',
  },
  'ap-statistics-foundation-pilot-item-162': {
    'A census of every city home.':
      'A census would survey every household in the entire city, whereas this plan randomly selects only four blocks and then samples a subset of homes within those blocks.',
    'A voluntary response sample only.':
      'Households are chosen through probability sampling at two levels rather than relying on residents to self-select into the survey.',
    'A simple random sample of all possible households with no stages.':
      'A simple random sample gives every subset of households an equal chance directly from one citywide frame, whereas this design first chooses blocks and then selects homes inside them.',
  },
};
