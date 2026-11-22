'use strict';

module.exports = {
  'ap-statistics-foundation-pilot-item-163': {
    'Undercoverage caused by a histogram.':
      'A histogram is merely a graphical display for quantitative data and cannot exclude members of a population; here, the flaw is leading question phrasing that nudges respondents toward agreement.',
    'Type II error in an experiment.':
      'Type II error occurs only when a hypothesis test fails to reject a false null, whereas this scenario describes a survey whose wording systematically pressures participants to endorse the policy.',
    'Random assignment bias.':
      'Random assignment is an experimental safeguard that balances lurking variables rather than a source of bias, and no treatments are assigned when respondents simply answer a loaded survey prompt.',
  },
  'ap-statistics-foundation-pilot-item-164': {
    'The grand total of all of the treatment labels that are used.':
      'Treatment labels only identify which condition was applied and carry no measurement value; a matched-pairs analysis must compare each participant\'s two quantitative responses by subtracting one from the other.',
    'Only the larger of the two responses in each matched pair.':
      'Keeping just the higher score discards the paired comparison that controls for person-to-person variability, whereas matched-pairs inference requires calculating how each participant\'s two outcomes differ.',
    'The sample proportion within one of the treatment groups.':
      'Each subject contributes quantitative measurements under both treatments rather than a single categorical outcome in one isolated group, so inference focuses on the mean of the within-subject differences.',
  },
  'ap-statistics-foundation-pilot-item-165': {
    '20.4':
      '20.4 simply adds the intercept 18 and slope 2.4 as though x were 1; substituting x = 5 into y-hat = 18 + 2.4x requires multiplying 2.4 by 5 before adding 18 to obtain 30.',
    '43.2':
      '43.2 multiplies the intercept 18 by the slope 2.4 instead of using the explanatory value x = 5; a linear prediction multiplies only the slope by x and then adds the intercept.',
    '90':
      '90 multiplies the intercept 18 by x = 5 and omits the slope term entirely; the intercept stays fixed at 18 while only the slope 2.4 scales with x = 5 to yield 18 + 12 = 30.',
  },
  'ap-statistics-foundation-pilot-item-166': {
    'Use fewer repetitions.':
      'Using fewer simulation trials increases sampling variability around the true probability rather than reducing it; by the Law of Large Numbers, greater precision requires many more independent trials.',
    'Change the definition of success after seeing the results.':
      'Altering what counts as a success after inspecting the 200 outcomes changes the event being modeled and introduces bias, instead of tightening the variability of the original probability estimate.',
    'Report the first repetition only.':
      'Relying on a single trial yields an estimate of either 0 or 1 with maximum variability; improving precision demands combining outcomes across a much larger number of independent simulated repetitions.',
  },
  'ap-statistics-foundation-pilot-item-167': {
    '0.22':
      '0.22 multiplies P(A) = 0.55 by P(B) = 0.40, which tests independence for an intersection rather than applying the general addition rule P(A) + P(B) - P(A and B) for a union.',
    '0.95':
      '0.95 adds P(A) = 0.55 and P(B) = 0.40 while forgetting to subtract their 0.20 overlap, double-counting outcomes where both events occur and overstating P(A or B) by 0.20.',
    '1.15':
      '1.15 adds the overlap 0.20 to 0.55 + 0.40 instead of subtracting it, producing a value above 1 that cannot be a valid probability and violating the general addition rule.',
  },
  'ap-statistics-foundation-pilot-item-169': {
    '0.10':
      '0.10 subtracts 0.30 from 0.40, but finding the joint probability P(A and B) requires the general multiplication rule P(A) * P(B | A) = 0.30 * 0.40 = 0.12 rather than subtraction.',
    '0.70':
      '0.70 adds P(A) and P(B | A), which conflates a conditional probability with a mutually exclusive union; a joint occurrence of A and B is computed by multiplying 0.30 by 0.40.',
    '1.33':
      '1.33 divides 0.40 by 0.30 and exceeds 1, which is impossible for any probability; the general multiplication rule multiplies P(A) by the conditional probability P(B | A) instead.',
  },
  'ap-statistics-foundation-pilot-item-170': {
    '0.10':
      '0.10 takes the difference 0.60 - 0.50, whereas two events are independent only when their joint probability equals the product P(A) * P(B), giving 0.60 * 0.50 = 0.30 here.',
    '0.55':
      '0.55 averages P(A) = 0.60 and P(B) = 0.50 rather than multiplying them; under independence, P(A and B) must equal P(A) times P(B), which cannot exceed either individual probability.',
    '1.10':
      '1.10 sums 0.60 and 0.50 to a number greater than 1, which violates probability bounds; checking independence requires multiplying P(A) and P(B) to obtain an intersection probability of 0.30.',
  },
  'ap-statistics-foundation-pilot-item-171': {
    'Its standard deviation must be negative.':
      'Standard deviation is defined as the square root of the average squared deviation from the mean, so it is always zero or positive and describes typical distance from E(X) = 8.',
    'Its standard deviation determines the most likely outcome.':
      'Standard deviation summarizes typical spread around the expected value of 8, not the mode; identifying the most probable outcome requires inspecting the individual probabilities in the distribution itself.',
  },
  'ap-statistics-foundation-pilot-item-172': {
    '20(0.30)':
      '20(0.30) = 6 computes the binomial mean np, not a probability; getting zero successes in 20 independent trials requires multiplying the failure probability 1 - 0.30 = 0.70 across all 20 trials.',
    '(0.30)^20':
      '(0.30)^20 calculates the probability that all 20 independent trials succeed rather than fail; for X = 0, every trial must be a failure with probability 0.70, yielding (0.70)^20.',
    '1 - (0.70)^20':
      '1 - (0.70)^20 is the complement of P(X = 0) and therefore gives the probability of at least one success, whereas zero successes requires all 20 trials to fail directly.',
  },
  'ap-statistics-foundation-pilot-item-173': {
    '0.16':
      '0.16 is the approximate upper-tail area beyond one standard deviation (60), whereas 70 lies two standard deviations above the mean of 50, leaving about 2.5% in the upper tail.',
    '0.50':
      '0.50 represents the proportion above the mean of 50 in any symmetric normal distribution; because 70 is two standard deviations higher than 50, far less than half lies above it.',
    '0.975':
      '0.975 gives the proportion falling below 70—two standard deviations above 50—rather than above it; by the Empirical Rule, the complementary upper tail beyond z = 2 is about 0.025.',
  },
  'ap-statistics-foundation-pilot-item-174': {
    '0.22':
      '0.22 divides the population standard deviation 18 by n = 81 instead of sqrt(81) = 9; the standard error formula sigma / sqrt(n) divides by the square root of sample size.',
    '18':
      '18 is the population standard deviation for individual observations, whereas averages of 81 values vary much less and have standard error sigma / sqrt(n) = 18 / 9 = 2.',
    '162':
      '162 multiplies 18 by sqrt(81) = 9 instead of dividing by it; larger samples reduce the spread of the sample mean, so the formula divides sigma by sqrt(n).',
  },
  'ap-statistics-foundation-pilot-item-175': {
    'Every one of the residuals must be exactly zero here.':
      'A distinct curved pattern proves the residuals deviate systematically from zero across x; if every residual were zero, all points would lie flat on the horizontal zero line with a perfect linear fit.',
    'The response variable must necessarily be categorical.':
      'Residual plots exist only when both variables in a regression are quantitative; curvature in the residuals signals a nonlinear relationship between quantitative variables rather than a categorical response.',
  },
  'ap-statistics-foundation-pilot-item-176': {
    'About 7.2%':
      '7.2% arbitrarily shifts the decimal point of 0.72 by a factor of 10; because r-squared = 0.72 is the explained fraction, the unexplained percentage is 100% minus 72%, or 28%.',
    'About 72%':
      '72% is the percentage of response variability explained by the least-squares line, whereas the question asks for the remaining unexplained share, which is the complement 1 - r-squared = 0.28.',
  },
  'ap-statistics-foundation-pilot-item-177': {
    'The population slope has been proven to be exactly zero in the entire population here.':
      'Zero is merely one plausible value inside the confidence interval alongside other nonzero slopes, so capturing 0 never proves the true population slope equals zero exactly.',
    'The fitted model proves that a real causal effect exists between the two variables here.':
      'Because 0 lies inside the interval, the data do not even establish a nonzero linear relationship, and observational regression slope intervals can never by themselves prove causation.',
  },
  'ap-statistics-foundation-pilot-item-178': {
    'There is a 48% chance that the null model is actually true.':
      'A p-value is a conditional probability calculated under the assumption that H0 is true, not the probability that the null hypothesis itself is true given the observed data.',
    'The alternative hypothesis has been disproven entirely.':
      'A large p-value of 0.48 shows only that the sample result is consistent with random variation under H0; failing to reject the null never disproves the alternative hypothesis.',
    'The test statistic must therefore equal exactly zero.':
      'A p-value of 0.48 indicates a modest test statistic near the center of the null distribution rather than exactly zero, since a two-sided statistic of 0 would yield p = 1.00.',
  },
  'ap-statistics-foundation-pilot-item-179': {
    'The null model has been proven true.':
      'Not only did the test reject H0 at alpha = 0.10, but failing to reject at alpha = 0.05 only reflects insufficient evidence at that stricter threshold and never proves H0 true.',
    'The sample was not a random one.':
      'Knowing that a test rejects at 0.10 yet fails to reject at 0.05 only bounds the p-value between 0.05 and 0.10; it provides no information about whether random sampling was used.',
  },
  'ap-statistics-foundation-pilot-item-180': {
    'Reduce the sample size.':
      'Shrinking the sample size increases standard error and lowers statistical power, making a true effect harder to detect and raising rather than reducing the probability of a Type II error.',
    'Use a biased sampling method.':
      'Introducing sampling bias distorts point estimates and invalidates inference instead of sharpening precision; lowering Type II error probability requires greater power, such as collecting a larger random sample.',
    'Remove the response variable.':
      'Eliminating the response variable leaves no outcome to measure or test statistically; reducing Type II error means improving power through larger sample size, higher alpha, or lower noise.',
  },
  'ap-statistics-foundation-pilot-item-181': {
    'A higher confidence level with no other change.':
      'Raising the confidence level increases the critical value z*, which expands the margin of error and widens the two-proportion confidence interval rather than making it narrower.',
    'More variability in the estimates.':
      'Greater variability in the sample proportions enlarges the standard error term inside the margin of error, causing the confidence interval to grow wider rather than more precise.',
    'Replacing random samples with volunteers.':
      'Switching to voluntary response samples introduces selection bias and breaks the random-sampling condition for inference without shrinking the standard error of the difference in proportions.',
  },
  'ap-statistics-foundation-pilot-item-182': {
    'Every one of the observed counts equals its expected count exactly here.':
      'When every observed count matches its expected count, each (O - E)^2 / E term is zero and the chi-square statistic equals 0, the exact opposite of a large value.',
    'The two variables are proven to be causally related to each other here.':
      'A large chi-square test statistic points to a strong discrepancy between observed and null expected counts, which signals association rather than causation unless treatments were randomly assigned.',
  },
  'ap-statistics-foundation-pilot-item-183': {
    '0.2':
      '0.2 divides the population standard deviation 20 by the sample size 100 instead of its square root 10; the standard error of the sample mean equals sigma / sqrt(n) = 20 / 10 = 2.',
    '20':
      '20 is the standard deviation of single observations in the population, not the standard error of x-bar, which shrinks by a factor of sqrt(100) = 10 when averaging 100 observations.',
    '200':
      '200 multiplies 20 by sqrt(100) = 10 rather than dividing; increasing sample size decreases the variability of the sample mean according to the formula sigma / sqrt(n).',
  },
  'ap-statistics-foundation-pilot-item-184': {
    'The response variable must be categorical rather than quantitative in every single case.':
      'A t procedure estimates a population mean from numerical differences and therefore requires quantitative measurements, whereas categorical data use proportion or chi-square inference instead.',
    'The paired differences are simply ignored throughout the entire procedure used here now.':
      'In a paired t procedure, the within-pair differences are the exact data values analyzed to compute the sample mean, standard deviation, and test statistic or confidence interval.',
  },
  'ap-statistics-foundation-pilot-item-185': {
    'The individual observations differ by exactly 4 to 11 units each.':
      'This 95% interval estimates the difference between two population means, mu1 - mu2, not the spread or range of differences between individual observations from the two groups.',
    'The first sample mean must therefore be exactly equal to 4 units.':
      '4 is the lower endpoint of the confidence interval for the difference mu1 - mu2, not the value of x-bar1 itself; the midpoint 7.5 is the observed difference between sample means.',
    'The interval proves that the first treatment caused the whole difference.':
      'Confidence intervals quantify plausible values for a parameter difference, but causal attribution depends on random assignment in the study design and cannot be established by an interval alone.',
  },
  'ap-statistics-foundation-pilot-item-186': {
    'H0: mu_difference != 0':
      'Inequality (!=) belongs in a two-sided alternative hypothesis, whereas a null hypothesis must specify a statement of no effect or equality—here, that the mean blood pressure change equals 0.',
  },
  'ap-statistics-foundation-pilot-item-187': {
    'The population mean equals the null value exactly.':
      'With p = 0.08 exceeding alpha = 0.05, we simply fail to reject H0 for lack of convincing evidence; failing to reject never proves that the population mean matches the null value.',
    'The alternative is proven false.':
      'A p-value of 0.08 means the sample data are not rare enough at the 5% significance level to reject H0, which leaves the alternative unconfirmed rather than disproved.',
    'The test has no sampling variability.':
      'Sampling variability is always present in any random sample, and the p-value of 0.08 directly measures how likely a t statistic this extreme is under random sampling if H0 holds.',
  },
  'ap-statistics-foundation-pilot-item-188': {
    'It increases without bound.':
      'In sqrt(s1^2/n1 + s2^2/n2), both sample sizes sit in the denominators, so enlarging n1 and n2 while variability stays fixed makes the standard error shrink toward zero rather than grow.',
    'It becomes equal to the population means.':
      'Standard error measures the typical sampling spread of x-bar1 - x-bar2, which depends on variances and sample sizes and does not converge to the values of the population means.',
    'It becomes negative.':
      'Standard error is computed as a positive square root of summed squared standard deviations divided by sample sizes, so it remains nonnegative even as larger samples pull it closer to zero.',
  },
  'ap-statistics-foundation-pilot-item-189': {
    'The response variable is a single categorical label in each group.':
      'Categorical labels are summarized with counts and proportions rather than means, requiring a two-proportion z procedure or chi-square test instead of a two-sample t interval.',
    'Each person contributes a single before-and-after pair of values.':
      'Before-and-after measurements on the same individual are dependent rather than independent groups and therefore call for a one-sample paired t interval on the within-person differences.',
    'The two groups were selected by voluntary response alone here.':
      'Voluntary response sampling introduces severe selection bias and violates the random-sampling or random-assignment condition required for valid two-sample t inference.',
  },
  'ap-statistics-foundation-pilot-item-190': {
    'Ha: mu_new - mu_old = 0':
      'A statement of equality belongs in the null hypothesis H0 to represent no difference between methods, whereas the alternative hypothesis Ha must express the directional claim being tested.',
    'Ha: mu_new - mu_old < 0':
      'Using < 0 asserts that the new method has a lower mean score than the old method, reversing the researcher\'s expectation that the new method increases the mean (mu_new - mu_old > 0).',
  },
  'ap-statistics-foundation-pilot-item-191': {
    'The result generalizes automatically to all of the people in any possible population here.':
      'Random assignment supports cause-and-effect conclusions for the study participants, whereas generalizing to a broader population requires random sampling from that target population.',
  },
  'ap-statistics-foundation-pilot-item-192': {
    'Fit a straight line without checking the plot at all.':
      'Applying linear regression blindly to strongly curved data produces biased predictions and misleading slope summaries; analysts should inspect the scatterplot first and consider nonlinear models or transformations.',
    'Conclude that the two variables must be independent here.':
      'A tight downward curve demonstrates a strong systematic association between the variables; nonlinearity only means the relationship is not straight-line, not that the variables are independent.',
    'Replace both of the variables with categorical labels.':
      'Converting quantitative measurements into rough categories throws away valuable numerical detail shown in the scatterplot instead of modeling the curved relationship directly.',
  },
  'ap-statistics-foundation-pilot-item-193': {
    'The association is weak because the number is negative.':
      'The minus sign communicates only downward direction, not weakness; linear strength depends on the absolute value |r|, and |-0.80| = 0.80 reflects a fairly strong linear relationship.',
    'The response is always negative.':
      'A negative correlation means higher x-values tend to pair with lower y-values, which can happen even when every observed response value in the data set is positive.',
    'The explanatory variable is categorical.':
      'Pearson\'s correlation r is defined exclusively for two quantitative variables and cannot be computed when either the explanatory or response variable is categorical.',
  },
  'ap-statistics-foundation-pilot-item-194': {
    'y-hat = 10x - 4':
      'This equation reverses the intercept and slope by attaching 10 to x and also flips the slope\'s sign to negative, whereas a line with intercept 10 and slope 4 is written y-hat = 10 + 4x.',
    'y-hat = 4x - 10':
      'Although the slope multiplying x is correctly 4, subtracting 10 gives an intercept of -10 instead of +10, shifting every predicted response down by 20 units.',
  },
  'ap-statistics-foundation-pilot-item-195': {
    'Predicting far beyond the observed range of the data values.':
      'Predicting outside the observed x-values is called extrapolation and carries extra risk because the linear pattern may not hold there, whereas interpolation predicts inside the observed range.',
    'Changing the measurement units of the response variable.':
      'Converting response units linearly rescales the slope and intercept of the model, which is a unit transformation and unrelated to predicting within the observed domain of service calls.',
    'Randomly assigning the service calls across all of the months.':
      'Random assignment is a principle of experimental design for establishing causation, not the regression concept of predicting responses inside the span of observed explanatory values.',
  },
  'ap-statistics-foundation-pilot-item-196': {
    'The explanatory value must be below its own mean value.':
      'A residual equals observed y minus predicted y-hat and measures vertical distance from the regression line, which says nothing about whether x lies below or above x-bar.',
    'The correlation between the variables must be positive.':
      'Both positively and negatively correlated data sets have points above and below the least-squares line, so a single positive residual gives no information about the sign of r.',
    'The observed response must be exactly equal to zero here.':
      'A positive residual means y - y-hat > 0 so the observed value exceeds the prediction, whereas an observed value of zero would produce a positive residual only if y-hat were negative.',
  },
  'ap-statistics-foundation-pilot-item-197': {
    'A categorical response variable in the whole data set.':
      'Regression scatterplots and fitted lines require a quantitative response variable; having an extreme x-value affects leverage along the horizontal axis rather than changing variable type.',
    'A sampling error by definition in every possible case.':
      'An extreme explanatory value can be a genuine, accurately recorded observation rather than a mistake; its horizontal extremity gives it high leverage, not automatic status as an error.',
  },
  'ap-statistics-foundation-pilot-item-198': {
    '-0.36':
      'Squaring r = -0.60 produces (-0.60)^2 = +0.36, not a negative value; the coefficient of determination r-squared is always between 0 and 1 regardless of the sign of r.',
    '0.60':
      '0.60 is simply the absolute value of the correlation r = -0.60 rather than its square; computing r-squared requires squaring -0.60 to obtain 0.36.',
    '1.60':
      '1.60 adds 1 to the magnitude 0.60 and exceeds 1, which is impossible for r-squared because a linear model cannot explain more than 100% of the variation in y.',
  },
  'ap-statistics-foundation-pilot-item-199': {
    '81% of the response values are wrong.':
      'r-squared = 0.81 represents the proportion of variability in y accounted for by the linear model, not an error rate or count of incorrect individual predictions.',
    'The correlation must be 0.19.':
      'The complement 1 - 0.81 = 0.19 is the unexplained fraction of variation, not r; the correlation magnitude is sqrt(0.81) = 0.90, with sign matching the slope.',
    'There is no remaining variation.':
      'Only r-squared = 1.00 would mean zero residual variation; because the linear model accounts for 81% of the response variability, roughly 19% still remains unexplained.',
  },
  'ap-statistics-foundation-pilot-item-200': {
    'The residual value must therefore be exactly zero here.':
      'A residual is defined as observed y minus predicted y-hat, so no residual even exists at x = 250 without an observed measurement there, and extrapolation errors are often large.',
    'The response variable becomes a categorical variable.':
      'Plugging an extreme x-value like 250 into a regression equation still produces a numerical prediction and never converts the quantitative response variable into a categorical one.',
    'The correlation becomes automatically equal to one here.':
      'The sample correlation r is fixed by the observed data pairs spanning x = 10 to 80 and does not change when the fitted equation is evaluated at a new x-value.',
  },
  'ap-statistics-foundation-pilot-item-201': {
    'Is one particular named student satisfied with the lunch schedule?':
      'Asking about a single named student produces one deterministic response with no variability across individuals, whereas a statistical question anticipates variation across the student body.',
    'What color are the tables in the cafeteria at the school this year?':
      'Identifying the cafeteria table color seeks a single factual attribute rather than data that vary across students and can be summarized by a distribution or proportion.',
    'Did the principal personally choose this lunch schedule all alone?':
      'This asks a one-time historical yes-or-no question about an administrative decision rather than collecting variable responses across students to estimate satisfaction.',
  },
  'ap-statistics-foundation-pilot-item-202': {
    'A histogram of grade labels.':
      'Histograms bin quantitative measurements along a continuous numeric scale, whereas both grade level and transportation choice are categorical variables best compared using conditional percentages in a bar chart.',
    'A scatterplot with no quantitative variables.':
      'Scatterplots display ordered pairs of two quantitative variables on numerical axes and cannot represent the relationship between two categorical variables like grade level and transportation method.',
    'A boxplot of transportation categories.':
      'Boxplots summarize five-number summaries (minimum, quartiles, median, maximum) of quantitative data, which do not exist for unordered categorical labels such as transportation types.',
  },
  'ap-statistics-foundation-pilot-item-203': {
    'The distribution is necessarily symmetric.':
      'In a roughly symmetric distribution, the mean and median are nearly equal; having a mean of 38 noticeably above a median of 31 indicates asymmetry pulled toward high values.',
    'The distribution is skewed left with no exceptions.':
      'Left-skewed distributions have a long lower tail that pulls the mean below the median, which contradicts a mean of 38 exceeding the median of 31.',
    'The distribution has no variability.':
      'If a distribution had zero variability, every observation would be identical, forcing the mean and median to be equal rather than separated by 7 units.',
  },
  'ap-statistics-foundation-pilot-item-204': {
    '38':
      '38 adds only 0.5 * IQR (6) to Q3 = 32; since IQR = 32 - 20 = 12, the standard upper outlier fence uses Q3 + 1.5 * IQR = 32 + 18 = 50.',
    '44':
      '44 adds a single IQR (12) to Q3 = 32 instead of 1.5 IQRs; Tukey\'s upper fence rule multiplies the interquartile range 12 by 1.5 to add 18, giving 50.',
    '64':
      '64 doubles Q3 (32 + 32) instead of using the interquartile range 32 - 20 = 12; the upper fence is calculated as Q3 + 1.5(IQR) = 32 + 18 = 50.',
  },
  'ap-statistics-foundation-pilot-item-205': {
    'Compare only the sample sizes.':
      'Sample sizes tell how many wait times were recorded in each group, not where their centers lie; comparing centers validly requires putting both distributions on the same time unit.',
    'Convert both variables to categories.':
      'Grouping numerical wait times into broad categories destroys quantitative precision and prevents computing meaningful numerical centers like means or medians on a common scale.',
  },
  'ap-statistics-foundation-pilot-item-206': {
    'A simple random sample of the club.':
      'A simple random sample selects only a random subset of the population, whereas surveying every single member of the club collects data from the entire population, making it a census.',
    'A voluntary response sample from the city.':
      'The target population here is the small club rather than the entire city, and the researcher actively contacted every member instead of letting people self-select into responding.',
    'A randomized experiment.':
      'An experiment actively imposes treatments through random assignment to measure effects, whereas simply asking club members about their opinions on a policy is observational data collection.',
  },
  'ap-statistics-foundation-pilot-item-207': {
    'A convenience sample.':
      'Convenience sampling picks whoever is easiest to reach without randomization, whereas this district first forms school-size strata and then selects students randomly inside every stratum.',
    'A census of the district.':
      'A census would include every student in the entire district, whereas this design draws a random sample from each school-size group rather than surveying everyone.',
  },
  'ap-statistics-foundation-pilot-item-208': {
    'Type I error.':
      'Type I error is a hypothesis-testing mistake—rejecting a true null—whereas excluding evening-only students from the sampling frame is a sampling design flaw that prevents them from being selected.',
    'Placebo effect.':
      'A placebo effect occurs when experimental subjects respond to an inactive treatment, which has nothing to do with an incomplete sampling frame leaving out part of the population.',
    'Random assignment.':
      'Random assignment is a method for allocating experimental units to treatments rather than a sampling bias, and no treatments are being assigned when constructing a sampling frame.',
  },
  'ap-statistics-foundation-pilot-item-209': {
    'The two categorical variables must be perfectly dependent.':
      'Nearly identical conditional percentages of late arrivals across bus riders and walkers show almost no association, which is the opposite of strong or perfect dependence.',
    'The sample mean of all the data must be exactly zero here.':
      'Arrival status (late or on time) and commuting mode (bus or walk) are categorical variables analyzed with proportions and counts, so a numerical sample mean does not apply.',
  },
  'ap-statistics-foundation-pilot-item-210': {
    'It guarantees that the next repetition will be a success here.':
      'Independent simulation trials have no memory of past results; increasing the number of repetitions stabilizes the long-run proportion without predicting or forcing any single upcoming trial.',
    'It changes the actual event that is being modeled in the simulation.':
      'Repeating the identical simulation procedure more times keeps the underlying event and true probability fixed while reducing sampling fluctuation in the estimated proportion.',
    'It makes the estimated probability rise above a value of 1.':
      'An estimated probability is the count of successes divided by total repetitions, so it can never exceed 1 no matter how many thousands of repetitions are executed.',
  },
  'ap-statistics-foundation-pilot-item-211': {
    '0.72':
      '0.72 repeats P(A) itself instead of finding its complement; by the complement rule, the probability that A does not occur is 1 - P(A) = 1 - 0.72 = 0.28.',
    '1.28':
      '1.28 adds 0.28 to 1 (or misapplies the complement direction) and produces a value above 1, which violates probability rules; P(not A) must equal 1 - 0.72 = 0.28.',
    '0.07':
      '0.07 does not come from any valid probability rule here; subtracting P(A) = 0.72 from 1 gives P(not A) = 0.28 rather than dividing 0.72 by 10.',
  },
  'ap-statistics-foundation-pilot-item-212': {
    '0.20':
      '0.20 subtracts P(A | B) = 0.30 from P(B) = 0.50, whereas the general multiplication rule computes the intersection P(A and B) by multiplying P(B) * P(A | B) = 0.15.',
    '0.80':
      '0.80 adds 0.50 and 0.30, which yields neither a joint nor a union probability here; finding P(A and B) requires multiplying P(B) by the conditional probability P(A | B).',
    '1.67':
      '1.67 divides 0.50 by 0.30 and produces a number greater than 1, which cannot be a probability; the joint probability P(A and B) equals 0.50 * 0.30 = 0.15.',
  },
  'ap-statistics-foundation-pilot-item-213': {
    '1.00':
      '1.00 is merely the sum of the three probabilities (0.10 + 0.25 + 0.65), whereas the expected value multiplies each numerical outcome by its probability before summing: 1(0.10) + 2(0.25) + 4(0.65) = 3.20.',
    '2.50':
      '2.50 ignores the unequal probability weights (resembling an unweighted average of 1, 2, and 4); because the outcome 4 carries weight 0.65, the weighted mean is pulled up to 3.20.',
  },
  'ap-statistics-foundation-pilot-item-214': {
    'The probability of winning the game must be exactly 2 points.':
      'Probabilities are unitless numbers constrained between 0 and 1, whereas 2 points is measured in payout units and quantifies how far payouts typically deviate from the 5-point mean.',
    'The single most common payout must be exactly 5 points here.':
      'An expected value of 5 points is a long-run probability-weighted average that need not be the mode—or even a possible single-game payout—and is distinct from the 2-point standard deviation.',
  },
  'ap-statistics-foundation-pilot-item-215': {
    '(0.25)^12':
      '(0.25)^12 computes the probability that all 12 independent trials succeed (X = 12), whereas at least one success includes X = 1 through 12 and is found via the complement 1 - (0.75)^12.',
    '12(0.25)':
      '12(0.25) = 3 gives the expected number of successes np for this binomial random variable, not a probability, since probabilities cannot exceed 1 and P(X >= 1) equals 1 - P(X = 0).',
  },
  'ap-statistics-foundation-pilot-item-216': {
    'The sample mean has no variability at all across any of the repeated samples.':
      'Even with n = 100, different random samples yield different sample means; the Central Limit Theorem reduces their spread by a factor of sqrt(100) = 10 rather than eliminating variability.',
    'The shape of the population is changed by the sampling process used here.':
      'Drawing random samples of size 100 leaves the strongly skewed population completely unchanged; the CLT makes the sampling distribution of x-bar approximately normal, not the population itself.',
  },
  'ap-statistics-foundation-pilot-item-217': {
    'Estimator A equals the population parameter exactly in every sample that is taken.':
      'Having a smaller standard deviation means Estimator A clusters more tightly around the true parameter than Estimator B, not that sampling error vanishes in every individual sample.',
    'Estimator B must therefore necessarily be a biased estimator of the parameter.':
      'Both estimators are given as unbiased, meaning both sampling distributions center on the true parameter; higher variance makes Estimator B less precise without introducing any bias.',
    'Both of the estimators have zero sampling variability in all repeated samples.':
      'Being unbiased only ensures that an estimator\'s long-run mean equals the parameter; both estimators still fluctuate from sample to sample, with Estimator A exhibiting smaller spread.',
  },
  'ap-statistics-foundation-pilot-item-218': {
    'Use a more extreme confidence level.':
      'Raising the confidence level enlarges the critical value and widens the interval, and it also violates the constraint that the confidence level must remain unchanged.',
    'Replace the sample with volunteers.':
      'Replacing a random sample with volunteers introduces severe selection bias and invalidates the interval\'s coverage without reliably shrinking the standard error.',
    'Increase the standard error.':
      'Because margin of error equals critical value times standard error, a larger standard error makes the confidence interval wider; narrowing it requires decreasing standard error via larger n.',
  },
  'ap-statistics-foundation-pilot-item-219': {
    'Ha: p = 0.55':
      'An equality statement belongs in the null hypothesis H0, whereas the alternative hypothesis Ha must express the directional research claim that more than 55% of customers prefer option A.',
    'Ha: p < 0.55':
      'The inequality < 0.55 tests whether fewer than 55% prefer option A, reversing the stated claim of "more than 55%," which requires a right-tailed alternative p > 0.55.',
    'Ha: p-hat > 0.55 for every sample':
      'Statistical hypotheses are always formulated about the unknown population parameter p rather than the sample statistic p-hat, which naturally varies from sample to sample.',
  },
  'ap-statistics-foundation-pilot-item-220': {
    'There is a 20% probability that the null hypothesis is actually true in this one case.':
      'A p-value of 0.20 is computed assuming H0 is true and describes how often data at least this extreme occur by chance, not the probability that the null hypothesis itself is true.',
    'The alternative hypothesis is entirely impossible for this whole population here.':
      'Obtaining p = 0.20 shows only that the sample does not give strong evidence against H0; failing to reject never proves the alternative hypothesis is impossible.',
  },
  'ap-statistics-foundation-pilot-item-221': {
    'A test fails to reject a false null hypothesis.':
      'Failing to reject a false null hypothesis is a Type II error (a false negative), whereas a Type I error is a false positive committed when a true null is mistakenly rejected.',
    'A sample statistic equals its parameter.':
      'Having a sample statistic match the population parameter exactly is an unusually accurate estimate rather than a hypothesis-testing decision error of either Type I or Type II.',
    'A confidence interval contains the parameter.':
      'When a confidence interval successfully captures the true population parameter, the estimation procedure has worked as intended rather than committing any inference error.',
  },
  'ap-statistics-foundation-pilot-item-222': {
    'The difference between the population proportions known without error.':
      'The true difference p1 - p2 is unknown—that is why we construct a confidence interval—and the midpoint 0.08 is the sample point estimate p-hat1 - p-hat2 rather than an exact parameter.',
    'The pooled sample size.':
      'Sample sizes determine the standard error and width of a two-proportion confidence interval, whereas the interval\'s center is always the point estimate p-hat1 - p-hat2.',
  },
  'ap-statistics-foundation-pilot-item-223': {
    'Small expected counts routinely prove total independence here.':
      'Expected counts are calculated solely from marginal totals and hypothesized proportions, so small expected values say nothing about independence and instead undermine the chi-square curve approximation.',
    'They ensure that the p-value will stay very small in every case.':
      'When expected counts are too small, the discrete test statistic is poorly approximated by a continuous chi-square distribution, making the resulting p-value unreliable rather than systematically small.',
  },
  'ap-statistics-foundation-pilot-item-224': {
    '5':
      '5 is the total number of categories, but because the category counts must sum to the fixed sample size, a chi-square goodness-of-fit test has df = categories - 1 = 4.',
    '6':
      '6 adds 1 to the 5 categories instead of subtracting 1; once 4 category counts are known for a fixed total, the 5th is determined, so df = 5 - 1 = 4.',
    '10':
      '10 doubles the number of categories and has no basis in chi-square inference; a goodness-of-fit test with k = 5 categories uses k - 1 = 4 degrees of freedom.',
  },
  'ap-statistics-foundation-pilot-item-226': {
    '18':
      '18 is the sample size n itself, whereas estimating the population standard deviation with s uses one degree of freedom, giving df = n - 1 = 17 for a one-sample t interval.',
    '16':
      '16 subtracts 2 from n = 18—as in simple linear regression slope inference—whereas a one-sample t interval for a mean uses df = n - 1 = 17.',
    '36':
      '36 doubles the sample size of 18 without statistical justification; degrees of freedom for a one-sample t procedure equal n - 1, which is always one less than n.',
  },
  'ap-statistics-foundation-pilot-item-227': {
    'H0: mu > 10':
      'Strict inequalities such as > belong in an alternative hypothesis, whereas the null hypothesis must state the benchmark equality being tested—that mean battery life equals 10 hours.',
    'H0: x-bar = 10 in every sample':
      'Hypotheses make claims about the fixed population parameter mu rather than the sample mean x-bar, which fluctuates randomly from sample to sample even when H0 holds.',
    'H0: s = 10':
      'The symbol s denotes a sample standard deviation, whereas the research question concerns the population mean battery life mu and requires setting mu equal to 10.',
  },
  'ap-statistics-foundation-pilot-item-228': {
    'Fail to reject the null because p is positive.':
      'Every p-value is a probability between 0 and 1 and is therefore nonnegative; the rejection decision compares p to alpha, and since 0.003 <= 0.01, we reject H0.',
    'Accept the null as proven true.':
      'A tiny p-value of 0.003 provides strong evidence against the null hypothesis rather than in favor of it, and hypothesis tests never prove a null hypothesis true anyway.',
    'Reject the null only if p is greater than alpha.':
      'This reverses the significance-testing rule: smaller p-values indicate stronger evidence against H0, so we reject when p <= alpha, not when p exceeds alpha.',
  },
  'ap-statistics-foundation-pilot-item-229': {
    'The sum of the two separate population means added together.':
      'Paired designs subtract one condition from the other for each participant, so the mean of those differences estimates the mean difference between conditions rather than their sum.',
    'The correlation coefficient between the two conditions.':
      'Correlation measures the strength and direction of linear association between two paired variables, whereas the average of within-person differences estimates the mean shift between conditions.',
  },
  'ap-statistics-foundation-pilot-item-230': {
    'The second population mean is greater.':
      'Because every plausible value in (2.5, 6.5) for mu1 - mu2 is positive, mu1 exceeds mu2 across the entire interval, directly contradicting the claim that the second mean is larger.',
    'The population means are exactly equal.':
      'Equal population means would imply mu1 - mu2 = 0, but 0 falls outside the interval (2.5, 6.5), providing convincing evidence against equality at this confidence level.',
    'The individual data values all lie between 2.5 and 6.5.':
      'The endpoints 2.5 and 6.5 bound plausible values for the difference between two population means, not the range of individual observations within either population.',
  },
  'ap-statistics-foundation-pilot-item-231': {
    'The 95% interval contains more individual observations by definition.':
      'Confidence intervals estimate an unknown population parameter rather than capturing individual data points, and a narrower interval spans a smaller range of values anyway.',
    'The population mean changes with confidence level.':
      'The true population mean is a fixed unknown constant; changing from 99% to 95% alters only the critical multiplier and resulting width of the interval constructed from the sample.',
    'The 99% interval has no sampling variability.':
      'Both intervals are built from the same random sample and reflect sampling variability; the 99% interval is wider specifically because it requires a larger critical value to achieve higher long-run capture.',
  },
  'ap-statistics-foundation-pilot-item-232': {
    'There is only a 4% chance that the null hypothesis is actually true for this population.':
      'A p-value of 0.04 assumes H0 is true and measures how unusual the observed difference in means is by chance, not the probability that the null hypothesis itself is true.',
    'The sample means will differ by exactly the same amount in every future study done here.':
      'Future random samples will naturally produce different sample mean differences due to sampling variability; rejecting H0 supports a difference in population means, not identical future samples.',
    'The result proves causation regardless of the design of the whole study that was used.':
      'Statistical significance at alpha = 0.05 indicates a likely difference between population means, but cause-and-effect conclusions require random assignment in an experiment rather than any arbitrary study design.',
  },
  'ap-statistics-foundation-pilot-item-233': {
    'No association because the slope is negative.':
      'A downward slope still represents a clear association—larger x-values systematically accompany smaller y-values—and the tight clustering around the line indicates that this negative linear relationship is strong.',
    'A categorical distribution.':
      'Scatterplots display paired numerical observations for two quantitative variables, whereas categorical distributions summarize counts or percentages across group labels using bar charts or two-way tables.',
  },
  'ap-statistics-foundation-pilot-item-234': {
    'It triples along with the response values.':
      'Correlation r standardizes both variables into z-scores before computing their average product, so multiplying y by positive 3 scales the spread and deviations equally and leaves r unchanged.',
    'It becomes exactly zero after the change.':
      'Multiplying every response value by 3 stretches the vertical scale linearly without disrupting how tightly points follow a straight line, so the linear correlation keeps its exact value.',
    'It changes its sign after the multiplication.':
      'Because 3 is positive, the relative ordering of response values stays identical and the direction of association is preserved; only multiplying by a negative constant reverses the sign of r.',
  },
  'ap-statistics-foundation-pilot-item-235': {
    '1.8 response units.':
      '1.8 response units is the predicted change for a single 1-unit increase in x, whereas a 5-unit increase multiplies the slope by 5 to predict a change of 9 response units.',
    '3.2 response units.':
      '3.2 subtracts 1.8 from 5 rather than multiplying the slope by the change in x; linear predicted change equals slope times delta-x, which is 1.8 * 5 = 9 units.',
    '90 response units.':
      '90 multiplies the slope 1.8 by 50 instead of 5 (a decimal-place error); multiplying 1.8 response units per x-unit by a 5-unit rise yields 9 response units.',
  },
  'ap-statistics-foundation-pilot-item-236': {
    'The correlation coefficient between the two variables in this one fitted model here.':
      'Correlation r is a unitless measure bounded between -1 and 1, whereas an intercept of 6 is expressed in response units and gives the predicted y-value when x = 0.',
    'The residual value for every one of the observations in the entire collected data set.':
      'Residuals equal observed minus predicted values and vary from observation to observation (summing to zero), whereas the intercept is a single fixed parameter marking y-hat at x = 0.',
    'The predicted response at the sample mean of the explanatory variable and nowhere else.':
      'Evaluating the least-squares line at x-bar yields the sample mean y-bar rather than the y-intercept; the intercept specifically gives the model\'s predicted response when x equals 0.',
  },
  'ap-statistics-foundation-pilot-item-237': {
    'The response must be categorical.':
      'Residual plots are constructed only for quantitative regression models; an outward fan shape points to nonconstant spread of residuals across x rather than a categorical response.',
    'The correlation must equal zero.':
      'Residuals can fan outward even around a strongly sloped linear trend with high correlation; widening vertical scatter violates equal variance, not the presence of a linear association.',
  },
  'ap-statistics-foundation-pilot-item-238': {
    'The model is correct for exactly 49% of all of the individuals.':
      'r-squared = 0.49 measures the percentage of total variance in the response variable explained by the linear regression, not the proportion of individual cases predicted without error.',
    'There is a 49% chance that the association is truly causal here.':
      'The coefficient of determination summarizes linear goodness of fit in the observed sample and never represents a probability or establishes whether the explanatory variable causes changes in y.',
  },
  'ap-statistics-foundation-pilot-item-240': {
    'The prediction is guaranteed accurate because it is close.':
      'Even slight extrapolation relies on the unproven assumption that the linear pattern continues unchanged past the observed x-values, so accuracy is never guaranteed outside the data range.',
    'The response must be zero.':
      'Predicting slightly past the observed x-range simply evaluates the fitted linear equation at that x-value and does not force the predicted response to equal zero.',
    'The model proves a causal effect.':
      'Using a fitted regression line to predict values inside or outside the observed x-range describes association only and cannot prove causation without a randomized experiment.',
  },
};
