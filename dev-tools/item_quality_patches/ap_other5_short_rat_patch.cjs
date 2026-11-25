'use strict';

module.exports = {
  ap_statistics_foundation_pilot: {
    'ap-statistics-foundation-pilot-item-002': {
      rationale:
        'A quantitative variable records numerical measurements or counts for which arithmetic operations like averaging make sense; total SMS count is a discrete numerical count, whereas messaging app, phone ownership, and grade level are categorical.',
    },
    'ap-statistics-foundation-pilot-item-003': {
      rationale:
        'Relative frequency expresses a category count as a proportion of the total sample size, so dividing the 84 students who chose the later lunch period by all 240 surveyed students gives 84/240 = 0.35 (35%).',
    },
    'ap-statistics-foundation-pilot-item-007': {
      rationale:
        'A z-score standardizes an observation by measuring how many standard deviations it falls from the mean: z = (x - mean)/SD = (64 - 52)/6 = 12/6 = 2, placing 64 exactly two standard deviations above the mean.',
    },
    'ap-statistics-foundation-pilot-item-011': {
      rationale:
        'Dividing the population into non-overlapping grade-level strata and drawing a simple random sample within every grade defines a stratified random sample, guaranteeing representation from each grade level.',
    },
    'ap-statistics-foundation-pilot-item-014': {
      rationale:
        'Administering a survey exclusively in English systematically excludes non-English-speaking residents from the sampling process, creating undercoverage bias because a sizable segment of the target population cannot be selected.',
    },
    'ap-statistics-foundation-pilot-item-016': {
      rationale:
        'Grouping experimental units by a known confounding variable such as prior GPA before randomly assigning treatments within each homogeneous group forms blocks, reducing unexplained variation in the response.',
    },
    'ap-statistics-foundation-pilot-item-017': {
      rationale:
        'When neither the participants nor the staff evaluating outcomes know who receives the active treatment versus the placebo, the experiment is double-blind, limiting both placebo expectations and assessor bias.',
    },
    'ap-statistics-foundation-pilot-item-020': {
      rationale:
        'Linear rescaling affects measures of center proportionally: multiplying every observation in a data set by a constant k multiplies the mean by k as well, so multiplying all values by 3 yields a new mean of 3(18) = 54.',
    },
    'ap-statistics-foundation-pilot-item-021': {
      rationale:
        'Because grade levels may have different total student counts, computing conditional proportions of device ownership within each grade puts every grade on a 0-to-1 scale so their distributions can be compared fairly.',
    },
    'ap-statistics-foundation-pilot-item-025': {
      rationale:
        'Mutually exclusive (disjoint) events share no common outcomes and cannot happen on the same trial, which forces the probability of their joint occurrence, P(A and B), to equal exactly 0.',
    },
    'ap-statistics-foundation-pilot-item-031': {
      rationale:
        'The expected value of a discrete random variable is its long-run average over many independent plays, not a guaranteed payout on any single play, the modal outcome, or a probability.',
    },
    'ap-statistics-foundation-pilot-item-032': {
      rationale:
        'A binomial random variable counts successes across a fixed number of independent binary trials with a constant success probability, matching the count of defective items in 12 independent, equal-probability inspections.',
    },
    'ap-statistics-foundation-pilot-item-035': {
      rationale:
        'For a binomial random variable X ~ Binomial(n, p), the variance is np(1 - p) and the standard deviation is sqrt(np(1 - p)); substituting n = 100 and p = 0.60 gives sqrt(100 * 0.60 * 0.40) = sqrt(24), or about 4.90.',
    },
    'ap-statistics-foundation-pilot-item-037': {
      rationale:
        'Every normal density curve is symmetric and unimodal around its center, splitting the total area exactly in half so the mean, median, and 50th percentile all occupy the exact same value.',
    },
    'ap-statistics-foundation-pilot-item-038': {
      rationale:
        'By the Empirical (68-95-99.7) Rule for a normal distribution, approximately 68% of the area under the standard normal curve falls within one standard deviation of the mean, so P(-1 < Z < 1) is about 0.68.',
    },
    'ap-statistics-foundation-pilot-item-040': {
      rationale:
        'Standardizing the observed sample mean against the sampling distribution gives z = (56 - 50)/3 = 2, meaning 56 lies two standard deviations above the center; a single sample statistic never proves the population mean.',
    },
    'ap-statistics-foundation-pilot-item-046': {
      rationale:
        'Because sample size n appears in the denominator of the standard error as sqrt(n), increasing n reduces the standard error and margin of error, making the confidence interval narrower when confidence level stays fixed.',
    },
    'ap-statistics-foundation-pilot-item-051': {
      rationale:
        'Power is the probability of correctly rejecting a false null hypothesis; increasing the sample size shrinks the standard error, separating the null and alternative sampling distributions so real effects are easier to detect.',
    },
    'ap-statistics-foundation-pilot-item-054': {
      rationale:
        'Because 0 falls inside the confidence interval (-0.04, 0.12) for p1 - p2, a zero difference remains a plausible value for the population parameter, so the data lack convincing evidence that p1 and p2 differ.',
    },
    'ap-statistics-foundation-pilot-item-055': {
      rationale:
        'A two-proportion z-test assumes the null hypothesis H0: p1 = p2 holds, so both samples estimate one shared population proportion, estimated by the pooled sample proportion p-hat_c = (x1 + x2)/(n1 + n2) in the standard error.',
    },
    'ap-statistics-foundation-pilot-item-056': {
      rationale:
        'Because p = 0.01 is smaller than alpha = 0.05, we reject the null hypothesis and conclude there is convincing statistical evidence of a difference in the population proportions in the direction of the alternative.',
    },
    'ap-statistics-foundation-pilot-item-057': {
      rationale:
        'A chi-square test for homogeneity compares the categorical distribution of a single variable—here preferred study location—across multiple separate populations or treatment groups, such as three different schools.',
    },
    'ap-statistics-foundation-pilot-item-059': {
      rationale:
        'Under the chi-square null model for a two-way table, each cell expected count equals (row total * column total) / (grand total), giving (80 * 50) / 200 = 4000 / 200 = 20.',
    },
    'ap-statistics-foundation-pilot-item-069': {
      rationale:
        'Hypotheses always refer to unknown population parameters rather than sample statistics, so testing whether the mean fill volume is below 500 mL requires the left-tailed alternative H_a: mu < 500.',
    },
    'ap-statistics-foundation-pilot-item-070': {
      rationale:
        'A p-value is a conditional probability calculated assuming the null hypothesis (mu = 0) is true: for H_a: mu > 0, p = 0.02 is the probability of obtaining a test statistic t >= 2.4 by random chance alone.',
    },
    'ap-statistics-foundation-pilot-item-071': {
      rationale:
        'Because the p-value of 0.02 exceeds the chosen significance level alpha = 0.01, the data do not provide statistically significant evidence against H0, so we fail to reject (never prove or accept) the null hypothesis.',
    },
    'ap-statistics-foundation-pilot-item-072': {
      rationale:
        'The sampling distribution of the difference between two independent sample means is centered at the difference of their population means: mu_(x-bar1 - x-bar2) = mu1 - mu2 = 10 - 14 = -4.',
    },
    'ap-statistics-foundation-pilot-item-079': {
      rationale:
        'Raising the confidence level from 90% to 99% requires capturing more central area under the reference distribution, which increases the critical multiplier (z* or t*) and therefore widens the confidence interval.',
    },
    'ap-statistics-foundation-pilot-item-083': {
      rationale:
        'The correlation coefficient r = -0.82 is close to -1, indicating a strong negative linear association between two quantitative variables—higher values of one tend to pair with lower values of the other—without implying causation.',
    },
    'ap-statistics-foundation-pilot-item-086': {
      rationale:
        'In the linear regression equation y-hat = 12 + 4x, the slope b = 4 indicates that for each one-unit increase in the explanatory variable x, the predicted response y-hat increases by 4 units on average.',
    },
    'ap-statistics-foundation-pilot-item-093': {
      rationale:
        'The least-squares regression line is uniquely defined as the line that minimizes the sum of squared vertical residuals, sum(y - y-hat)^2, preventing positive and negative errors from canceling out.',
    },
    'ap-statistics-foundation-pilot-item-094': {
      rationale:
        'Using a fitted regression equation to predict a response at an explanatory x-value far outside the observed data domain is extrapolation, which is unreliable because the linear trend may not continue beyond the data.',
    },
    'ap-statistics-foundation-pilot-item-096': {
      rationale:
        'An observational association between ice cream sales and sunburns can be driven by a confounding variable like hot sunny weather that increases both outcomes simultaneously, so correlation alone cannot prove causation.',
    },
    'ap-statistics-foundation-pilot-item-097': {
      rationale:
        'Slope equals predicted change in y per one-unit change in x; because one minute is 1/60 of an hour, the predicted change in y per minute is 1/60 of the hourly slope, giving 0.5/60 response units per minute.',
    },
    'ap-statistics-foundation-pilot-item-100': {
      rationale:
        'Before fitting a linear model, inspecting the scatterplot for form (linearity), direction, strength, and unusual features such as outliers or high-leverage influential points ensures that linear regression is appropriate.',
    },
    'ap-statistics-foundation-pilot-item-105': {
      rationale:
        'Daily step count is a quantitative variable measured on a numerical scale, so grouping counts into contiguous numeric bins in a histogram properly displays the shape, center, spread, and potential outliers.',
    },
    'ap-statistics-foundation-pilot-item-106': {
      rationale:
        'In a left-skewed distribution, the extended tail of lower values pulls the non-resistant arithmetic mean downward relative to the resistant median, making the mean typically less than the median.',
    },
    'ap-statistics-foundation-pilot-item-108': {
      rationale:
        'The 1.5-IQR rule flags any observation falling below the lower fence Q1 - 1.5(IQR) or above the upper fence Q3 + 1.5(IQR) as a potential outlier using the quartiles and interquartile range (Q3 - Q1).',
    },
    'ap-statistics-foundation-pilot-item-109': {
      rationale:
        'Standard deviation quantifies the typical distance of observations from the mean, so a smaller standard deviation in Distribution A shows tighter clustering around the center without determining skewness or median.',
    },
    'ap-statistics-foundation-pilot-item-110': {
      rationale:
        'Because the researcher merely observes existing study habits and exam scores without randomly imposing treatments on students, the design is an observational study rather than a controlled experiment.',
    },
    'ap-statistics-foundation-pilot-item-113': {
      rationale:
        'Random assignment balances confounding variables across treatment groups on average, supporting a causal inference for the volunteer sample, whereas generalizing broadly to all students would require random sampling.',
    },
    'ap-statistics-foundation-pilot-item-114': {
      rationale:
        'Comparing conditional breakfast percentages calculated within athletes and within nonathletes controls for unequal subgroup sizes, directly showing whether breakfast preferences differ across the two groups.',
    },
    'ap-statistics-foundation-pilot-item-115': {
      rationale:
        'A conditional percentage restricts the denominator to the specified subgroup total, so 24 students choosing option A out of 40 students in that group yields 24/40 = 0.60, or 60%.',
    },
    'ap-statistics-foundation-pilot-item-117': {
      rationale:
        'For disjoint (mutually exclusive) events, P(A and B) = 0, so the general addition rule simplifies to P(A or B) = P(A) + P(B) = 0.35 + 0.20 = 0.55.',
    },
    'ap-statistics-foundation-pilot-item-120': {
      rationale:
        'Two events A and B with positive probability are independent whenever knowing B occurred does not alter the likelihood of A, which is satisfied directly here because P(A | B) = 0.42 = P(A).',
    },
    'ap-statistics-foundation-pilot-item-122': {
      rationale:
        'Expected value is the theoretical long-run average of a random variable over infinitely many independent repetitions; individual trials can still deviate widely from 12, and 12 need not be the mode or standard deviation.',
    },
    'ap-statistics-foundation-pilot-item-123': {
      rationale:
        'The four binomial (BINS) conditions require binary outcomes, independent trials, a fixed number of trials n, and a constant success probability p, so a probability that changes across trials violates the model.',
    },
    'ap-statistics-foundation-pilot-item-125': {
      rationale:
        'The standard deviation of x-bar is sigma/sqrt(n): at n = 25 it is 18/sqrt(25) = 3.6, and at n = 100 it is 18/sqrt(100) = 1.8, illustrating that quadrupling the sample size cuts the standard error in half.',
    },
    'ap-statistics-foundation-pilot-item-128': {
      rationale:
        'In a one-proportion confidence interval, margin of error is z* * sqrt(p-hat(1 - p-hat)/n); holding confidence level fixed while increasing n decreases the standard error and narrows the margin of error.',
    },
    'ap-statistics-foundation-pilot-item-129': {
      rationale:
        'A 90% confidence interval lists the range of population proportion values consistent with the sample at the 90% level; because 0.50 lies well outside (0.31, 0.39), it is not a plausible value for p.',
    },
    'ap-statistics-foundation-pilot-item-132': {
      rationale:
        'A significance test decision compares the p-value directly against the pre-specified alpha; since p = 0.012 > alpha = 0.01, we fail to reject H0 at the 1% level even though p is below 0.05.',
    },
    'ap-statistics-foundation-pilot-item-133': {
      rationale:
        'A Type II error (probability beta) happens when the null hypothesis is actually false in the population, yet the sample test fails to reject H0—missing a genuine effect or difference.',
    },
    'ap-statistics-foundation-pilot-item-134': {
      rationale:
        'Because each sample proportion p-hat is an unbiased estimator of its population proportion p, the sampling distribution of p-hat1 - p-hat2 is centered at the true difference in population proportions, p1 - p2.',
    },
    'ap-statistics-foundation-pilot-item-135': {
      rationale:
        'A two-proportion z-interval constructed from independent random samples uses the statistic p-hat1 - p-hat2 to estimate the unknown population parameter p1 - p2, the difference between the two population proportions.',
    },
    'ap-statistics-foundation-pilot-item-139': {
      rationale:
        'In a chi-square test for independence on a single population cross-classified by two categorical variables, the null hypothesis states that the two variables are independent (not associated) in that population.',
    },
    'ap-statistics-foundation-pilot-item-141': {
      rationale:
        'For simple random samples drawn from a population with mean mu, the sample mean x-bar is an unbiased estimator of mu, meaning the expected value (center) of its sampling distribution equals the population mean.',
    },
    'ap-statistics-foundation-pilot-item-144': {
      rationale:
        'Statistical hypotheses are always stated in terms of population parameters; testing whether true mean battery life exceeds 10 hours sets up the right-tailed alternative hypothesis Ha: mu > 10.',
    },
    'ap-statistics-foundation-pilot-item-146': {
      rationale:
        'By linearity of expectation for unbiased sample means from independent samples, E(x-bar1 - x-bar2) = E(x-bar1) - E(x-bar2) = mu1 - mu2, centering the sampling distribution at the true mean difference.',
    },
    'ap-statistics-foundation-pilot-item-148': {
      rationale:
        'Because 0 falls inside the confidence interval (-1.4, 2.1) for mu1 - mu2, equal population means remain plausible, so we do not have convincing evidence of a difference (though exact equality is not proven).',
    },
    'ap-statistics-foundation-pilot-item-149': {
      rationale:
        'Defining the parameter as mu_new - mu_old means a shorter completion time under the new process makes mu_new smaller than mu_old, corresponding to the population alternative Ha: mu_new - mu_old < 0.',
    },
    'ap-statistics-foundation-pilot-item-158': {
      rationale:
        'Both the mean and standard deviation use every observation numerically and are non-resistant to outliers, so appending a single extreme high value pulls the mean upward and inflates the standard deviation.',
    },
    'ap-statistics-foundation-pilot-item-159': {
      rationale:
        'Converting from hours to minutes multiplies every data value by 60; multiplying all observations by a positive constant scales measures of spread by that same factor, multiplying the standard deviation by 60.',
    },
    'ap-statistics-foundation-pilot-item-160': {
      rationale:
        'Comparing two quantitative distributions on the AP Statistics exam requires explicitly contrasting center, shape, spread, and any unusual features like outliers or gaps in the context of the problem.',
    },
    'ap-statistics-foundation-pilot-item-162': {
      rationale:
        'Selecting city blocks randomly at the first stage and then randomly sampling homes within each chosen block uses nested random sampling steps, defining a multistage sample rather than a single-stage SRS.',
    },
    'ap-statistics-foundation-pilot-item-164': {
      rationale:
        'In a matched-pairs design where each subject experiences both treatments in randomized order, the two measurements are dependent, so analysis computes one within-subject difference per pair and performs one-sample inference on those differences.',
    },
    'ap-statistics-foundation-pilot-item-166': {
      rationale:
        'By the Law of Large Numbers, increasing the number of independent simulation repetitions reduces random Monte Carlo sampling error, yielding a more precise estimate of the underlying probability.',
    },
    'ap-statistics-foundation-pilot-item-172': {
      rationale:
        'In Binomial(20, 0.30), getting X = 0 successes requires all 20 independent trials to end in failure, each with probability 1 - 0.30 = 0.70, so P(X = 0) = (0.70)^20.',
    },
    'ap-statistics-foundation-pilot-item-173': {
      rationale:
        'For a normal distribution with mean 50 and SD 10, the value 70 has z = (70 - 50)/10 = 2; about 95% lies within 2 SDs of the mean, leaving 5% across both tails and roughly 2.5% (0.025) above 70.',
    },
    'ap-statistics-foundation-pilot-item-179': {
      rationale:
        'A test rejects H0 whenever p < alpha and fails to reject when p >= alpha; rejecting at alpha = 0.10 but failing to reject at alpha = 0.05 bounds the p-value strictly between 0.05 and 0.10.',
    },
    'ap-statistics-foundation-pilot-item-180': {
      rationale:
        'The probability of a Type II error is beta = 1 - Power; increasing the sample size lowers standard error and boosts statistical power, thereby decreasing the risk of failing to reject a false null hypothesis.',
    },
    'ap-statistics-foundation-pilot-item-181': {
      rationale:
        'In a two-proportion confidence interval, larger sample sizes n1 and n2 shrink sqrt(p-hat1(1-p-hat1)/n1 + p-hat2(1-p-hat2)/n2), reducing the standard error and producing a narrower interval at a fixed confidence level.',
    },
    'ap-statistics-foundation-pilot-item-182': {
      rationale:
        'Because chi-square sums (Observed - Expected)^2 / Expected across all cells, a value much larger than the degrees of freedom signals substantial discrepancies between the observed counts and the null expected counts.',
    },
    'ap-statistics-foundation-pilot-item-186': {
      rationale:
        'In a paired t-test of blood pressure changes, the null hypothesis states no population effect using the parameter for the true mean difference: H0: mu_difference = 0.',
    },
    'ap-statistics-foundation-pilot-item-187': {
      rationale:
        'Since the p-value of 0.08 is greater than alpha = 0.05, the sample result is not statistically significant at the 5% level, meaning we fail to reject H0 rather than proving the null true or the alternative false.',
    },
    'ap-statistics-foundation-pilot-item-188': {
      rationale:
        'The standard error of x-bar1 - x-bar2 is sqrt(s1^2/n1 + s2^2/n2); increasing n1 and n2 in the denominators shrinks both variance terms, causing the overall standard error of the difference to decrease.',
    },
    'ap-statistics-foundation-pilot-item-190': {
      rationale:
        'When the difference is defined as mu_new - mu_old, expecting the new method to raise the true mean score implies mu_new > mu_old, written in terms of population parameters as Ha: mu_new - mu_old > 0.',
    },
    'ap-statistics-foundation-pilot-item-193': {
      rationale:
        'The sign of the correlation coefficient r indicates the direction of the linear relationship—here negative, meaning larger x values correspond to smaller y values—while |r| = 0.80 reflects strong linear strength.',
    },
    'ap-statistics-foundation-pilot-item-194': {
      rationale:
        'Standard linear regression form is y-hat = a + bx, where a is the y-intercept (predicted response when x = 0) and b is the slope multiplying x; substituting a = 10 and b = 4 gives y-hat = 10 + 4x.',
    },
    'ap-statistics-foundation-pilot-item-196': {
      rationale:
        'A residual is defined as actual minus predicted (y - y-hat), so a positive residual means y > y-hat, indicating that the observed data point lies vertically above the fitted regression line.',
    },
    'ap-statistics-foundation-pilot-item-200': {
      rationale:
        'Evaluating the regression line at x = 250 when the observed data span only 10 to 80 is extreme extrapolation, which is hazardous because there is no evidence the linear pattern continues outside the measured domain.',
    },
    'ap-statistics-foundation-pilot-item-201': {
      rationale:
        'A statistical question anticipates variability across individuals and requires collecting data from a group to summarize; asking what proportion of students are satisfied captures variation across the student body.',
    },
    'ap-statistics-foundation-pilot-item-205': {
      rationale:
        'Wait times recorded in minutes and seconds sit on incompatible numeric scales (differing by a factor of 60), so converting both data sets to the same unit is essential before comparing their centers.',
    },
    'ap-statistics-foundation-pilot-item-208': {
      rationale:
        'When a sampling frame omits evening-only students from the population list, those students have zero probability of selection, creating undercoverage bias if their responses differ from daytime students.',
    },
    'ap-statistics-foundation-pilot-item-209': {
      rationale:
        'Nearly identical conditional percentages of late arrivals across bus riders and walkers indicate little or no association between transportation mode and tardiness, though minor differences can reflect sampling variability.',
    },
    'ap-statistics-foundation-pilot-item-210': {
      rationale:
        'According to the Law of Large Numbers, conducting many more independent simulation trials causes the empirical relative frequency to stabilize closer to the true theoretical probability without guaranteeing any single trial.',
    },
    'ap-statistics-foundation-pilot-item-215': {
      rationale:
        'Using the complement rule, the event of at least one success (X >= 1) is the complement of zero successes (X = 0); for Binomial(12, 0.25), P(X = 0) = (0.75)^12, so P(X >= 1) = 1 - (0.75)^12.',
    },
    'ap-statistics-foundation-pilot-item-217': {
      rationale:
        'Unbiasedness means an estimator sampling distribution is centered at the true population parameter, while a smaller standard deviation means Estimator A exhibits less sampling variability and tighter clustering around that target.',
    },
    'ap-statistics-foundation-pilot-item-219': {
      rationale:
        'Significance-test hypotheses always make claims about population parameters rather than sample statistics, so testing whether over 55% of all customers prefer option A uses the right-tailed alternative Ha: p > 0.55.',
    },
    'ap-statistics-foundation-pilot-item-220': {
      rationale:
        'A p-value of 0.20 means that if the null hypothesis were true, observing a statistic at least as extreme as the sample result would happen 20% of the time by chance—it is not the probability that H0 is true.',
    },
    'ap-statistics-foundation-pilot-item-224': {
      rationale:
        'For a chi-square goodness-of-fit test examining one categorical variable with k categories and no parameters estimated from the sample, degrees of freedom equal k - 1, giving df = 5 - 1 = 4.',
    },
    'ap-statistics-foundation-pilot-item-225': {
      rationale:
        'Because n = 64 >= 30, the Central Limit Theorem makes the sampling distribution of x-bar approximately normal with mean mu = 70 and standard deviation sigma/sqrt(n) = 16/sqrt(64) = 16/8 = 2.',
    },
    'ap-statistics-foundation-pilot-item-228': {
      rationale:
        'Comparing the p-value directly with the significance level shows p = 0.003 < alpha = 0.01, providing statistically significant evidence at the 1% level to reject the null hypothesis.',
    },
    'ap-statistics-foundation-pilot-item-229': {
      rationale:
        'Computing the mean of the paired differences x-bar_diff summarizes the sample change per individual and serves as the point estimator for mu_diff, the population mean within-pair difference.',
    },
    'ap-statistics-foundation-pilot-item-230': {
      rationale:
        'Every plausible value in the confidence interval (2.5, 6.5) for mu1 - mu2 is strictly positive and excludes 0, providing convincing evidence that the first population mean exceeds the second population mean.',
    },
    'ap-statistics-foundation-pilot-item-232': {
      rationale:
        'Because p = 0.04 < alpha = 0.05, we reject H0 and report statistically significant evidence of a population mean difference in the direction of Ha, without misinterpreting p as P(H0) or claiming causation without random assignment.',
    },
    'ap-statistics-foundation-pilot-item-239': {
      rationale:
        'Unsquared residuals sum to zero for infinitely many lines through (x-bar, y-bar); squaring each residual eliminates sign cancellation and penalizes large misses, uniquely determining the least-squares regression line.',
    },
    'ap-statistics-foundation-pilot-item-240': {
      rationale:
        'Even slightly outside the observed x-range, predicting y constitutes extrapolation and must be treated cautiously because the data provide no direct evidence that the linear relationship persists beyond the sampled interval.',
    },
  },
  ap_calculus_ab_foundation_pilot: {
    'ap-calculus-ab-foundation-pilot-item-005': {
      rationale:
        'Factoring gives (x^2 - 1)/(x - 1) = x + 1 for x != 1, so lim_{x->1} f(x) = 2 exists as a finite number but disagrees with f(1) = 4, creating a removable discontinuity that redefining f(1) = 2 would repair.',
    },
    'ap-calculus-ab-foundation-pilot-item-009': {
      rationale:
        'Because f is continuous on the closed interval [1, 4] and the target value 0 lies strictly between f(1) = -2 and f(4) = 5, the Intermediate Value Theorem guarantees at least one c in (1, 4) with f(c) = 0.',
    },
    'ap-calculus-ab-foundation-pilot-item-013': {
      rationale:
        'Although f(x) = |x - 2| is continuous at x = 2, its left-hand derivative is -1 while its right-hand derivative is +1; because the one-sided limits of the difference quotient disagree, f\'(2) does not exist.',
    },
    'ap-calculus-ab-foundation-pilot-item-033': {
      rationale:
        'Instantaneous velocity is the first derivative of position with respect to time: differentiating s(t) = t^3 - 3t^2 yields v(t) = s\'(t) = 3t^2 - 6t, and evaluating at t = 3 gives v(3) = 3(9) - 6(3) = 9.',
    },
    'ap-calculus-ab-foundation-pilot-item-043': {
      rationale:
        'By the Extreme Value Theorem and the Candidates Test, absolute extrema of a continuous function on a closed interval [a, b] must occur either at the endpoints a and b or at interior critical numbers where f\' is 0 or undefined.',
    },
    'ap-calculus-ab-foundation-pilot-item-045': {
      rationale:
        'For f\'(x) = (x + 2)(x - 1), the derivative is positive on (-inf, -2), negative on (-2, 1), and positive on (1, inf); by the First Derivative Test, f has a local maximum at x = -2 and a local minimum at x = 1.',
    },
    'ap-calculus-ab-foundation-pilot-item-060': {
      rationale:
        'Using u-substitution with u = x^2 + 1 gives du = 2x dx, transforming the integral into integral of u^4 du = u^5/5 + C = (x^2 + 1)^5/5 + C.',
    },
    'ap-calculus-ab-foundation-pilot-item-081': {
      rationale:
        'A two-sided limit depends solely on the y-values approached as x nears 1 from both left and right—here 4—while the displaced filled dot at (1, 7) determines only f(1) and does not affect the limit.',
    },
    'ap-calculus-ab-foundation-pilot-item-082': {
      rationale:
        'As x approaches 2 from both the left and right, the table outputs converge smoothly toward -1; a limit can exist and equal -1 even when f(2) itself is undefined.',
    },
    'ap-calculus-ab-foundation-pilot-item-088': {
      rationale:
        'As x approaches 3 from the left (x < 3), the denominator x - 3 stays negative while shrinking toward 0, so the quotient 1/(x - 3) is negative and grows arbitrarily large in magnitude, approaching negative infinity.',
    },
    'ap-calculus-ab-foundation-pilot-item-089': {
      rationale:
        'Because f is continuous on [2, 5] and 4 lies strictly between f(5) = 1 and f(2) = 8, the Intermediate Value Theorem guarantees at least one c in (2, 5) with f(c) = 4, without specifying uniqueness or exact location.',
    },
    'ap-calculus-ab-foundation-pilot-item-090': {
      rationale:
        'The Intermediate Value Theorem requires only two hypotheses: f must be continuous on the closed interval [a, b], and the target output k must lie between f(a) and f(b); differentiability is not required.',
    },
    'ap-calculus-ab-foundation-pilot-item-093': {
      rationale:
        'For f\'(c) to exist, the left-hand and right-hand limits of the difference quotient must both exist and be equal; because the one-sided slopes are 2 and -1, f has a corner and is not differentiable at x = c.',
    },
    'ap-calculus-ab-foundation-pilot-item-094': {
      rationale:
        'Differentiability at x = c implies continuity at x = c because lim_{x->c} [f(x) - f(c)] = f\'(c) * 0 = 0; however, having a finite first derivative implies nothing about extrema, f\'\'(c), or f(c) = 0.',
    },
    'ap-calculus-ab-foundation-pilot-item-103': {
      rationale:
        'Differentiating x^2 + xy + y^2 = 7 implicitly with the product and chain rules gives 2x + y + xy\' + 2yy\' = 0, so dy/dx = -(2x + y)/(x + 2y); evaluating at (1, 2) yields -(2 + 2)/(1 + 4) = -4/5.',
    },
    'ap-calculus-ab-foundation-pilot-item-107': {
      rationale:
        'Rewriting ln((x^2 + 1)^3) as 3 ln(x^2 + 1) and applying the chain rule gives f\'(x) = 3 * (2x)/(x^2 + 1) = 6x/(x^2 + 1), which matches differentiating the composite logarithm directly.',
    },
    'ap-calculus-ab-foundation-pilot-item-108': {
      rationale:
        'Because x^2 sin(e^x) is the product of x^2 and the composite function sin(e^x), differentiating it requires the product rule together with a chain rule to differentiate sin(e^x) through its inner function e^x.',
    },
    'ap-calculus-ab-foundation-pilot-item-111': {
      rationale:
        'The derivative R\'(t) represents the instantaneous rate of change of population with respect to time in people per hour, so R\'(10) = 12 means that at t = 10 hours the population is increasing at 12 people per hour.',
    },
    'ap-calculus-ab-foundation-pilot-item-119': {
      rationale:
        'Because sin(3x)/sin(5x) gives the indeterminate form 0/0 at x = 0, L\'Hopital\'s Rule yields lim_{x->0} [3 cos(3x)] / [5 cos(5x)] = 3(1)/[5(1)] = 3/5, matching the standard limit sin(kx)/(kx) -> 1.',
    },
    'ap-calculus-ab-foundation-pilot-item-121': {
      rationale:
        'Because f(x) = x^3 is continuous on [-1, 2] and differentiable on (-1, 2), MVT sets f\'(c) = 3c^2 equal to the secant slope (8 - (-1))/(2 - (-1)) = 3, giving c = +/-1, of which only c = 1 lies in the open interval (-1, 2).',
    },
    'ap-calculus-ab-foundation-pilot-item-123': {
      rationale:
        'Setting f\'(x) = 4x^3 - 8x = 4x(x^2 - 2) = 0 yields interior critical points x = 0 and x = +/-sqrt(2) inside (-3, 3); by the Candidates Test, absolute extrema are found by comparing f at those points and endpoints -3 and 3.',
    },
    'ap-calculus-ab-foundation-pilot-item-125': {
      rationale:
        'Since x^2 >= 0 for all real x, f\'(x) = x^2(x - 2) stays negative on both sides of x = 0 (no extremum there) and switches from negative to positive across x = 2, producing a local minimum at x = 2 only.',
    },
    'ap-calculus-ab-foundation-pilot-item-128': {
      rationale:
        'By the Second Derivative Test, when f\'(c) = 0 (horizontal tangent) and f\'\'(c) > 0 (graph strictly concave up near c), the curve sits at the bottom of a local trough, confirming a local minimum at x = c.',
    },
    'ap-calculus-ab-foundation-pilot-item-129': {
      rationale:
        'When the graph of f\' crosses the x-axis from negative to positive at x = 2, the original function f transitions from decreasing to increasing, which by the First Derivative Test identifies a local minimum at x = 2.',
    },
    'ap-calculus-ab-foundation-pilot-item-132': {
      rationale:
        'By the Net Change Theorem (FTC Part 2), integrating the marginal cost rate C\'(q) in dollars per item from q = 0 to q = 100 yields C(100) - C(0), the net change in total production cost from 0 to 100 items.',
    },
    'ap-calculus-ab-foundation-pilot-item-135': {
      rationale:
        'Reversing the limits of integration gives G(x) = -integral from 3 to x of t^2 dt; applying the Fundamental Theorem of Calculus Part 1 then yields G\'(x) = -x^2 because x is the lower bound.',
    },
    'ap-calculus-ab-foundation-pilot-item-139': {
      rationale:
        'Integrating term by term gives integral of 4x^3 dx = x^4 and integral of (2/x) dx = 2 ln|x|, where the absolute value handles negative intervals and + C captures the full family of antiderivatives.',
    },
    'ap-calculus-ab-foundation-pilot-item-140': {
      rationale:
        'Setting u = 3x + 1 produces du = 3 dx, which matches the numerator exactly, so integral of 3/(3x + 1) dx = integral of (1/u) du = ln|u| + C = ln|3x + 1| + C.',
    },
    'ap-calculus-ab-foundation-pilot-item-141': {
      rationale:
        'In the differential equation dQ/dt = -0.1Q, the rate of change is proportional to the current value Q with constant -0.1, meaning Q undergoes continuous exponential decay at 10% of its current amount per unit time.',
    },
    'ap-calculus-ab-foundation-pilot-item-142': {
      rationale:
        'Direct proportionality between a population\'s rate of change dP/dt and its current size P means their ratio is the constant k, yielding the exponential growth-and-decay differential equation dP/dt = kP.',
    },
    'ap-calculus-ab-foundation-pilot-item-147': {
      rationale:
        'Separating variables gives y dy = x dx; integrating yields y^2/2 = x^2/2 + C1, or y^2 = x^2 + C. Applying y(0) = 2 fixes C = 4 and selects the positive square root branch, giving y = sqrt(x^2 + 4).',
    },
    'ap-calculus-ab-foundation-pilot-item-148': {
      rationale:
        'Separating variables yields (1/y) dy = -x dx; integrating gives ln|y| = -x^2/2 + C1, so y = Ce^(-x^2/2). Substituting the initial condition y(0) = 5 gives C = 5, resulting in y = 5e^(-x^2/2).',
    },
    'ap-calculus-ab-foundation-pilot-item-151': {
      rationale:
        'The average value on [1, 3] is [1/(3 - 1)] * integral from 1 to 3 of (2x + 1) dx = (1/2)[x^2 + x] evaluated from 1 to 3 = (1/2)[(9 + 3) - (1 + 1)] = 10/2 = 5.',
    },
    'ap-calculus-ab-foundation-pilot-item-152': {
      rationale:
        'For any function continuous on [a, b], the Mean Value Theorem for Integrals guarantees at least one number c in [a, b] where f(c) equals the average value [1/(b - a)] * integral from a to b of f(x) dx.',
    },
    'ap-calculus-ab-foundation-pilot-item-155': {
      rationale:
        'Setting 4 - x^2 = x^2 gives intersections at x = +/-sqrt(2); integrating top minus bottom, integral from -sqrt(2) to sqrt(2) of (4 - 2x^2) dx = 2[4x - 2x^3/3]_0^{sqrt(2)} = 16sqrt(2)/3.',
    },
    'ap-calculus-ab-foundation-pilot-item-157': {
      rationale:
        'An equilateral triangle with side s(x) has altitude (sqrt(3)/2)s(x), so its cross-sectional area A(x) = (1/2) * base * height = (1/2)s(x) * (sqrt(3)/2)s(x) = (sqrt(3)/4)[s(x)]^2.',
    },
    'ap-calculus-ab-foundation-pilot-item-158': {
      rationale:
        'For a solid with known cross sections perpendicular to the x-axis, volume equals the integral of cross-sectional area A(x); squaring the side length gives A(x) = (sqrt(x) - x)^2, integrated from 0 to 1 without pi.',
    },
    'ap-calculus-ab-foundation-pilot-item-159': {
      rationale:
        'Rotating around the horizontal line y = -1 shifts both vertical radii by +1: outer radius R(x) = x - (-1) = x + 1 and inner radius r(x) = 0 - (-1) = 1, yielding the washer volume pi * integral from 0 to 2 of [(x + 1)^2 - 1] dx.',
    },
  },
  ap_biology_foundation_pilot: {
    'ap-bio-u1-002': {
      rationale:
        'A biological buffer consists of a weak acid and its conjugate base in equilibrium; when HCl adds free H+ ions, the conjugate base binds most of them, preventing a large drop in solution pH.',
    },
    'ap-bio-u1-005': {
      rationale:
        'Phospholipids are amphipathic molecules with polar phosphate heads and nonpolar fatty-acid tails, causing them to self-assemble in water into a selectively permeable bilayer with hydrophobic tails shielded inside.',
    },
    'ap-bio-u2-011': {
      rationale:
        'In the endomembrane system, ribosomes bound to rough ER translate proteins destined for export or membranes, and the Golgi apparatus chemically modifies, sorts, and packages those proteins into secretory vesicles.',
    },
    'ap-bio-u3-015': {
      rationale:
        'Because a reversible competitive inhibitor binds directly to the enzyme active site in competition with the substrate, raising substrate concentration increases the probability that substrate occupies active sites and restores reaction rate.',
    },
    'ap-bio-u3-018': {
      rationale:
        'Cellular respiration is regulated via allosteric negative feedback: abundant ATP binds allosteric sites on key glycolytic enzymes such as phosphofructokinase, inhibiting catabolism when cellular energy supply already meets demand.',
    },
    'ap-bio-u4-019': {
      rationale:
        'In a phosphorylation cascade, each activated protein kinase phosphorylates and activates multiple downstream relay molecules, exponentially amplifying a tiny extracellular ligand signal into a robust cellular response.',
    },
    'ap-bio-u4-022': {
      rationale:
        'The G1/S DNA-damage checkpoint halts cell-cycle progression before DNA replication begins, giving repair enzymes time to fix lesions—or triggering apoptosis if unrepairable—so mutations are not copied into daughter cells.',
    },
    'ap-bio-u5-025': {
      rationale:
        'During prophase I of meiosis, synapsed homologous chromosomes exchange corresponding nonsister chromatid segments at chiasmata, generating recombinant chromosomes with novel combinations of maternal and paternal alleles.',
    },
    'ap-bio-u5-026': {
      rationale:
        'Because homologous pairs of nonhomologous chromosomes align randomly along the metaphase I plate, Mendel\'s law of independent assortment ensures that inheriting a particular allele at one locus does not alter allele probabilities at the other.',
    },
    'ap-bio-u5-027': {
      rationale:
        'In a monohybrid Aa x Aa cross, each parent transmits the recessive a allele with probability 1/2, so independent fertilization yields genotypes in a 1 AA : 2 Aa : 1 aa ratio, making 1/4 of offspring homozygous recessive.',
    },
    'ap-bio-u5-028': {
      rationale:
        'Under incomplete dominance, neither allele completely masks the other in heterozygotes, so combining one red allele and one white allele yields an intermediate pink phenotype distinct from both homozygotes.',
    },
    'ap-bio-u5-030': {
      rationale:
        'Crossing a dominant-phenotype individual with a homozygous recessive tester (aa) ensures that any recessive allele carried by the unknown parent appears in roughly half of the offspring, cleanly distinguishing AA from Aa.',
    },
    'ap-bio-u6-031': {
      rationale:
        'The two sugar-phosphate strands of a DNA double helix run in opposite chemical orientations—one 5-prime to 3-prime and its partner 3-prime to 5-prime—which enables proper antiparallel hydrogen bonding between complementary base pairs.',
    },
    'ap-bio-u6-032': {
      rationale:
        'During semiconservative DNA replication, helicase unwinds the double helix so each original parental strand acts as a template for a newly synthesized complementary strand, leaving every daughter duplex half old and half new.',
    },
    'ap-bio-u6-034': {
      rationale:
        'Because the genetic code is degenerate—multiple codons often specify the same amino acid, especially differing at the third wobble base—a point substitution that preserves the encoded amino acid is a synonymous (silent) mutation.',
    },
    'ap-bio-u6-037': {
      rationale:
        'In PCR, forward and reverse oligonucleotide primers anneal to complementary flanking sequences on opposite DNA strands, providing free 3-prime OH ends for Taq polymerase and strictly defining the start and end boundaries of amplification.',
    },
    'ap-bio-u7-038': {
      rationale:
        'Natural selection alters population allele frequencies over generations only when heritable phenotypic variation already exists and individuals with advantageous variants exhibit higher differential survival and reproductive success.',
    },
    'ap-bio-u7-040': {
      rationale:
        'In Hardy-Weinberg equilibrium, p + q = 1; with p = 0.6 for allele A, q = 1 - 0.6 = 0.4 for allele a, so the expected frequency of homozygous recessive aa individuals is q^2 = (0.4)^2 = 0.16.',
    },
    'ap-bio-u7-041': {
      rationale:
        'A catastrophic event like a wildfire that drastically shrinks population size leaves a random subset of surviving alleles, illustrating a population bottleneck—a classic form of non-adaptive genetic drift.',
    },
    'ap-bio-u8-048': {
      rationale:
        'When two insectivorous bird species forage in different microhabitats (bark versus foliage) within the same trees, resource partitioning reduces niche overlap and interspecific competition, enabling stable coexistence.',
    },
    'ap-bio-u3-066': {
      rationale:
        'Enzyme activity peaks at 18 units per minute at pH 8 and falls at both lower (pH 4, 6) and higher (pH 10) values, demonstrating that active-site ionization is optimized near pH 8 within the tested range.',
    },
    'ap-bio-u5-079': {
      rationale:
        'For two independently assorting loci in an AaBb x AaBb cross, the probability of aa is 1/4 and the probability of at least one dominant B allele (BB or Bb) is 3/4; by the multiplication rule, P(aa and B_) = (1/4)(3/4) = 3/16.',
    },
    'ap-bio-u5-080': {
      rationale:
        'When heterozygotes display a blended pink phenotype intermediate between red and white homozygotes, a self-cross produces a 1 red : 2 pink : 1 white phenotypic ratio matching the genotypic ratio—the hallmark of incomplete dominance.',
    },
    'ap-bio-u6-083': {
      rationale:
        'RNA polymerase reads the DNA template 3-prime to 5-prime and synthesizes an antiparallel 5-prime to 3-prime mRNA strand using uracil instead of thymine, transcribing 3-prime-TAC GGA-5-prime into 5-prime-AUG CCU-3-prime.',
    },
    'ap-bio-u8-097': {
      rationale:
        'Population size change combines additions (births plus immigration) minus removals (deaths plus emigration): delta N = (80 + 20) - (30 + 10) = 100 - 40 = +60, a net increase of 60 individuals.',
    },
    'ap-bio-u5-127': {
      rationale:
        'Out of 160 total offspring, an independent-assortment 9:3:3:1 ratio expects 90, 30, 30, and 10 individuals per class; the observed counts of 90, 28, 31, and 11 fit those expectations closely within random sampling variation.',
    },
    'ap-bio-u5-129': {
      rationale:
        'Because IA and IB are codominant and both dominate i, an IAi x IBi cross can yield IAIB (type AB), IAi (type A), IBi (type B), or ii (type O), making all four ABO blood-type phenotypes possible.',
    },
    'ap-bio-u6-135': {
      rationale:
        'Ribosomal translation reads mRNA codons 5-prime to 3-prime: AUG initiates synthesis with methionine, GCU adds alanine, and UGA recruits a release factor as a stop codon, terminating translation after a two-amino-acid dipeptide.',
    },
    'ap-bio-u8-148': {
      rationale:
        'Removing sea stars allows competitively dominant mussels to monopolize rocky-shore space and exclude other species, demonstrating that sea stars function as a keystone predator with a disproportionately large effect on community diversity.',
    },
    'ap-bio-u8-397': {
      rationale:
        'Under unrestricted exponential growth, a 9-hour span contains 9 / 3 = 3 complete doubling intervals, so the initial 500 bacteria grow to N = 500 * 2^3 = 500 * 8 = 4,000 cells.',
    },
  },
  ap_us_history_foundation_pilot: {
    'apush-foundation-033': {
      rationale:
        'During the Gilded Age, rapidly expanding factories relied on steady inflows of low-wage immigrant workers even as nativist groups campaigned for restrictions on cultural, religious, and racial grounds, allowing both forces to coexist.',
    },
    'apush-foundation-041': {
      rationale:
        'Once World War II ended, the U.S.-Soviet alliance collapsed over Eastern European governance, economic reconstruction, and competing democratic-capitalist versus communist ideologies, directly prompting U.S. containment strategy.',
    },
    'apush-foundation-090': {
      rationale:
        'Post-1945 American history was shaped simultaneously by expanded global Cold War leadership and profound domestic transformations—economic growth, suburbanization, mass media, and persistent struggles over racial and social inequality.',
    },
    'apush-foundation-229': {
      rationale:
        'Beginning in the mid-seventeenth century, colonial slave codes—such as Virginia\'s 1662 partus sequitur ventrem statute—codified lifelong, inheritable servitude tied specifically to African ancestry to secure plantation labor and property.',
    },
    'apush-foundation-468': {
      rationale:
        'Rapid Gilded Age industrialization generated stark wealth inequality, political machine corruption, hazardous factory labor, and overcrowded tenements, motivating Populists, labor unions, settlement workers, and muckrakers to demand reform.',
    },
    'apush-foundation-510': {
      rationale:
        'Before 1848, the expansion of universal white male suffrage under Jacksonian democracy sharpened political conflicts over freedom because it coexisted with entrenched chattel slavery, Indian Removal, and legal barriers against women.',
    },
    'apush-foundation-517': {
      rationale:
        'World War II exposed the glaring contradiction between fighting fascist racism abroad and enforcing Jim Crow at home, energizing the Double V campaign, wartime Great Migration activism, and demands for federal civil rights action.',
    },
    'apush-foundation-521': {
      rationale:
        'From the 1940s through the 1970s, rising female college enrollment and labor-force participation coexisted with occupational segregation and domestic norms, fueling second-wave feminist challenges to legal and cultural gender barriers.',
    },
    'apush-foundation-548': {
      rationale:
        'Repeated North American imperial wars before 1776 grew out of overlapping British, French, and Spanish territorial claims, competing fur and Atlantic trade networks, shifting Indigenous alliances, and wider European dynastic rivalries.',
    },
    'apush-foundation-556': {
      rationale:
        'Although the early republic broadened political participation for many white men by easing property qualifications, constitutional compromises and state laws continued to deny equal citizenship to women, enslaved and free Black people, and Native nations.',
    },
    'apush-foundation-570': {
      rationale:
        'Emancipation transformed the Civil War into a struggle for abolition: enslaved people\'s self-emancipation eroded Confederate labor, nearly 200,000 Black soldiers bolstered Union forces, and the Thirteenth Amendment made freedom permanent.',
    },
    'apush-foundation-583': {
      rationale:
        'The 1920s displayed deep cultural tension as urban consumerism, radio, jazz, and the Harlem Renaissance expanded alongside powerful traditionalist reactions including the 1924 immigration quotas, Prohibition, fundamentalism, and a revived KKK.',
    },
    'apush-foundation-584': {
      rationale:
        'The Great Depression became a global crisis through intertwined war debts, reparations, gold-standard constraints, collapsing commodity prices, bank failures, and retaliatory tariffs like Smoot-Hawley that contracted international trade.',
    },
    'apush-foundation-590': {
      rationale:
        'Cold War rivalry pitted competing global models against one another: the United States championed market capitalism and multiparty liberal democracy, whereas the Soviet Union promoted one-party communist rule and state-planned economies.',
    },
  },
  ap_us_government_foundation_pilot: {
    'ap-usg-u2-027': {
      rationale:
        'Affirmed in Marbury v. Madison (1803) and grounded in Federalist No. 78, judicial review empowers federal courts to declare acts of Congress or executive actions unconstitutional, serving as the judiciary\'s primary constitutional check.',
    },
    'ap-usg-u3-049': {
      rationale:
        'Ratified in 1791 to address Anti-Federalist concerns, the first ten amendments enumerate core individual civil liberties and procedural protections—such as speech, religion, and due process—that limit federal and, via incorporation, state authority.',
    },
    'ap-usg-u5-076': {
      rationale:
        'Ratified in 1971 amid Vietnam-era debates over drafting eighteen-year-olds who could not vote, the Twenty-Sixth Amendment constitutionally lowered the minimum voting age in federal and state elections to eighteen.',
    },
    'ap-usg-u5-079': {
      rationale:
        'Because political party platforms are nonbinding strategic documents rather than constitutional rules, major parties periodically revise their policy stances after electoral shifts to assemble broader winning coalitions and retain voter support.',
    },
    'ap-usg-u5-082': {
      rationale:
        'Under pluralist and elite theories of interest-group politics, even a small organization can wield substantial policy clout when it concentrates financial resources, specialized technical expertise, intense member commitment, and institutional lobbying access.',
    },
    'ap-usg-u5-084': {
      rationale:
        'Members of Congress running for reelection benefit from the incumbency advantage—high name recognition, franking and constituent casework, established PAC and donor networks, and media visibility—though electoral waves can still unseat them.',
    },
    'ap-usg-u5-089': {
      rationale:
        'Retrospective voting occurs when voters look backward to judge an incumbent or governing party on recent economic conditions and policy performance, rewarding perceived success and punishing perceived failure at the polls.',
    },
    'ap-usg-u2-136': {
      rationale:
        'Higher party-line unity on salient floor votes than on routine legislation shows that congressional voting behavior is conditional—shaped by issue visibility, leadership whipping, and constituency stakes—rather than absolute party lockstep.',
    },
    'ap-usg-u5-179': {
      rationale:
        'When an emerging demographic bloc gains pivotal weight in swing states, office-seeking parties strategically adjust their platform rhetoric and policy priorities to court those voters and expand their competitive electoral coalition.',
    },
    'ap-usg-u2-218': {
      rationale:
        'Resolving statutory ambiguity by analyzing legislative text, statutory structure, and congressional purpose in a live controversy is a core judicial function of Article III courts—distinct from legislative lawmaking or executive administration.',
    },
    'ap-usg-u5-251': {
      rationale:
        'Revising a party platform as new voter groups enter the coalition and a high-salience issue rises to the agenda demonstrates party adaptation—how linkage institutions continuously realign their messages to shifting voter demands and incentives.',
    },
  },
};
