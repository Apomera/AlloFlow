'use strict';
// AP Statistics foundation pilot: option-level feedback for items 161-240.
// See part1.cjs for the format.
module.exports = {
  'item-161': {
    'Random sampling guarantees no bias of any kind.': 'Random selection addresses selection bias, but refusals after selection can still make the respondents unrepresentative.',
    'The design becomes a randomized experiment.': 'No treatments are imposed; a survey with random selection is still an observational design.',
    'The parameter no longer exists.': 'The population proportion exists regardless of who responds; the problem is estimating it well.',
  },
  'item-162': {
    'A census of every city home.': 'A census would include every home; this design samples blocks and then homes within them.',
    'A voluntary response sample only.': 'Homes were chosen at random, not by residents opting in.',
    'A simple random sample of all possible households with no stages.': 'A simple random sample draws directly from all households; this design draws in two stages.',
  },
  'item-163': {
    'Undercoverage caused by a histogram.': 'A histogram is a display and cannot cause undercoverage; the issue is how the question is worded.',
    'Type II error in an experiment.': 'Type II error is a testing mistake, and this is a survey, not an experiment.',
    'Random assignment bias.': 'Random assignment is not a bias, and no treatments are assigned in a survey.',
  },
  'item-164': {
    'The grand total of all treatment labels.': 'Labels are not data; the analysis needs each participant’s two responses.',
    'Only the larger response in each pair.': 'Keeping one response discards the comparison the pairing was designed to make.',
    'The sample proportion in one treatment group.': 'Responses are quantitative and paired; there is no single treatment group or proportion.',
  },
  'item-165': {
    '20.4': '20.4 adds the slope and intercept (18 + 2.4) without multiplying the slope by x = 5.',
    '43.2': '43.2 multiplies the intercept by the slope (18 × 2.4) instead of substituting x.',
    '90': '90 multiplies the intercept by x (18 × 5) rather than adding it to 2.4(5).',
  },
  'item-166': {
    'Use fewer repetitions.': 'Fewer repetitions make the estimate more variable, not more precise.',
    'Change the definition of success after seeing the results.': 'Redefining success after the fact changes the event being estimated and biases the result.',
    'Report the first repetition only.': 'One repetition gives a probability estimate of 0 or 1, the least precise estimate possible.',
  },
  'item-167': {
    '0.22': '0.22 is the product of P(A) and P(B), which is not part of the union rule.',
    '0.95': '0.95 adds P(A) and P(B) without subtracting the overlap of 0.20.',
    '1.15': '1.15 adds the overlap instead of subtracting it and exceeds 1.',
  },
  'item-168': {
    'Yes, because every mutually exclusive pair is independent.': 'Mutually exclusive events with positive probability are never independent, since one occurring rules the other out.',
    'Yes, if their probabilities sum to more than 1.': 'Mutually exclusive probabilities cannot sum to more than 1, and the sum has nothing to do with independence.',
    'Only if both probabilities equal 0.50.': 'Two mutually exclusive events with probability 0.50 each still cannot be independent; P(A and B) would be 0, not 0.25.',
  },
  'item-169': {
    '0.10': '0.10 subtracts the probabilities; the multiplication rule multiplies P(A) by P(B | A).',
    '0.70': '0.70 adds the probabilities, which does not give a joint probability.',
    '1.33': '1.33 divides 0.40 by 0.30 and exceeds 1, which no probability can.',
  },
  'item-170': {
    '0.10': '0.10 is the difference of the probabilities; independence requires their product, 0.30.',
    '0.55': '0.55 is the average of 0.60 and 0.50, not their product.',
    '1.10': '1.10 is the sum, which exceeds 1 and cannot be a probability.',
  },
  'item-171': {
    'Its standard deviation must equal 8.': 'The center and the spread are separate quantities; knowing E(X) says nothing about the standard deviation.',
    'Its standard deviation must be negative.': 'A standard deviation is a square root and can never be negative.',
    'Its standard deviation determines the most likely outcome.': 'Spread does not identify the mode; the most likely outcome comes from the probability distribution.',
  },
  'item-172': {
    '20(0.30)': '20(0.30) is the mean number of successes, not the probability of zero successes.',
    '(0.30)^20': '(0.30)^20 is the probability that all 20 trials succeed, the opposite of zero successes.',
    '1 - (0.70)^20': '1 − (0.70)^20 is the probability of at least one success, the complement of the event asked about.',
  },
  'item-173': {
    '0.16': '0.16 is the tail beyond one standard deviation; 70 is two standard deviations above 50.',
    '0.50': '0.50 is the proportion above the mean of 50, not above 70.',
    '0.975': '0.975 is the proportion below 70, the complement of the answer.',
  },
  'item-174': {
    '0.22': '0.22 divides 18 by 81 instead of by the square root of 81.',
    '18': '18 is the population standard deviation; the sample mean varies less than single observations.',
    '162': '162 multiplies 18 by 9 instead of dividing.',
  },
  'item-175': {
    'The correlation must equal 1.': 'A correlation of 1 means a perfect line with zero residuals; a curved residual pattern shows the line misses the shape.',
    'Every residual is zero.': 'A pattern in the residuals means they are nonzero; zero residuals would give a flat plot at zero.',
    'The response is necessarily categorical.': 'Residual plots require a quantitative response; curvature concerns model form, not variable type.',
  },
  'item-176': {
    'About 7.2%': '7.2% divides 72 by 10 and has no meaning here; the unexplained share is 100% − 72%.',
    'About 72%': '72% is the share explained by the model, not the share left unexplained.',
    'About 128%': 'Adding instead of subtracting gives a percentage above 100, which is impossible for a share of variation.',
  },
  'item-177': {
    'The slope is proven to be exactly zero.': 'Zero is one plausible value in the interval, not the proven value.',
    'The variables are proven independent in every population.': 'Lack of evidence for a slope is not proof of no relationship, and the result applies only to the sampled population.',
    'The model proves a causal effect.': 'An interval containing zero gives no evidence of any effect, let alone a causal one.',
  },
  'item-178': {
    'There is a 48% chance the null is true.': 'A p-value assumes the null is true; it does not measure the probability that it is.',
    'The alternative has been disproven.': 'A large p-value means the data are compatible with the null; it does not rule out the alternative.',
    'The statistic must equal zero.': 'A p-value of 0.48 means the test statistic is unremarkable under the null, not that it equals zero.',
  },
  'item-179': {
    'The p-value is exactly 0.05.': 'A p-value of exactly 0.05 would typically lead to rejection at 0.05, and the result was not rejected there.',
    'The null is proven true.': 'The test rejected the null at the 10% level, and no test proves the null true anyway.',
    'The sample was not random.': 'The p-value’s position between two alpha levels says nothing about how the sample was chosen.',
  },
  'item-180': {
    'Reduce the sample size.': 'Smaller samples make real effects harder to detect and increase the Type II error rate.',
    'Use a biased sampling method.': 'Bias distorts the estimate; it does not improve the test’s ability to detect a true effect.',
    'Remove the response variable.': 'Without a response variable there is nothing to test.',
  },
  'item-181': {
    'A higher confidence level with no other change.': 'A higher confidence level widens the interval by increasing the critical value.',
    'More variability in the estimates.': 'More variability increases the standard error and the interval’s width.',
    'Replacing random samples with volunteers.': 'Volunteers introduce bias and do not reduce the standard error.',
  },
  'item-182': {
    'Every observed count equals its expected count.': 'Equal observed and expected counts would give a chi-square statistic of zero, not a large one.',
    'The variables are proven causal.': 'A chi-square statistic measures association, never causation.',
    'The sample size must be one.': 'A sample of one cannot produce a chi-square statistic at all; larger discrepancies, not tiny samples, make it large.',
  },
  'item-183': {
    '0.2': '0.2 divides 20 by 100 instead of by the square root of 100.',
    '20': '20 is the population standard deviation, not the standard error of the mean.',
    '200': '200 multiplies 20 by 10 instead of dividing.',
  },
  'item-184': {
    'Small samples never need conditions.': 'Small samples need the conditions most, since the t model is sensitive to skewness and outliers when n is small.',
    'The response must be categorical.': 't procedures require quantitative data so that differences and means exist.',
    'The paired differences are ignored.': 'The paired differences are exactly what the procedure analyzes.',
  },
  'item-185': {
    'The individual observations differ by 4 to 11 units.': 'The interval estimates the difference in population means, not the spread of individual differences.',
    'The first sample mean must equal 4.': '4 is the lower bound of the interval for the difference, not a sample mean.',
    'The interval proves the first treatment caused the difference.': 'Causal language requires random assignment; a confidence interval alone describes the size of a difference.',
  },
  'item-186': {
    'H0: x-bar_difference > 0': 'The null concerns the population mean difference, not a sample mean, and states equality rather than an inequality.',
    'H0: mu_difference != 0': 'A statement of inequality is an alternative hypothesis; the null asserts no change.',
    'H0: s = 0': 's is the sample standard deviation; hypotheses are about population parameters, and no one is testing spread here.',
  },
  'item-187': {
    'The population mean equals the null value exactly.': 'Failing to reject does not establish that the null value is exactly right.',
    'The alternative is proven false.': 'Insufficient evidence for the alternative is not proof against it.',
    'The test has no sampling variability.': 'Every test involves sampling variability; that is what the p-value accounts for.',
  },
  'item-188': {
    'It increases without bound.': 'Sample sizes appear in the denominators of the standard error, so larger samples reduce it.',
    'It becomes equal to the population means.': 'A standard error measures spread and is unrelated to the values of the means.',
    'It becomes negative.': 'A standard error is a square root and is always positive.',
  },
  'item-189': {
    'The response is a single categorical label.': 'A categorical response would call for a proportion or chi-square procedure, not a t interval.',
    'Each person contributes a before-and-after pair.': 'Paired data call for a matched-pairs procedure, not a two-sample one.',
    'The groups were selected by voluntary response only.': 'Voluntary response is a source of bias, not a condition that justifies any inference procedure.',
  },
  'item-190': {
    'Ha: mu_new - mu_old = 0': 'Equality is the null hypothesis, not the alternative.',
    'Ha: mu_new - mu_old < 0': 'A negative difference would mean the new method lowers the mean, the opposite of the expectation.',
    'Ha: x-bar_new - x-bar_old > 0 for every sample': 'Sample means cannot appear in a hypothesis; the claim is about the population means mu_new and mu_old.',
  },
  'item-191': {
    'The result generalizes to all people automatically.': 'Generalization depends on how participants were selected, not on random assignment.',
    'The p-value is the probability the treatment works.': 'A p-value describes how unusual the data would be under the null, not the chance the treatment works.',
    'The two sample means will be equal in future samples.': 'Rejecting the null suggests a real difference; future sample means will vary and are unlikely to be equal.',
  },
  'item-192': {
    'Fit a line without checking the plot.': 'Fitting a line to a curved pattern produces a misleading model; the plot must be examined first.',
    'Conclude the variables are independent.': 'A strong curved pattern is a strong association, not independence.',
    'Replace both variables with category labels.': 'Turning quantitative data into categories discards the information the scatterplot shows.',
  },
  'item-193': {
    'The association is weak because the number is negative.': 'The sign gives direction only; a magnitude of 0.80 is strong.',
    'The response is always negative.': 'Correlation describes how variables move together, not the signs of the values.',
    'The explanatory variable is categorical.': 'Correlation is computed only for two quantitative variables.',
  },
  'item-194': {
    'y-hat = 4 + 10x': 'This swaps the coefficients, putting the slope as the constant term and the intercept as the multiplier of x.',
    'y-hat = 10x - 4': 'This uses the intercept as the slope and changes the sign of the slope.',
    'y-hat = 4x - 10': 'The slope is right but the intercept should be +10, not −10.',
  },
  'item-195': {
    'Predicting far beyond the observed range.': 'Predicting beyond the observed range is extrapolation, the riskier practice.',
    'Changing the response units.': 'Unit conversion rescales the model but has nothing to do with the range of predictions.',
    'Randomly assigning service calls.': 'Random assignment is an experimental design idea, not a use of a regression model.',
  },
  'item-196': {
    'The explanatory value is below its mean.': 'A residual concerns the response, not the position of x relative to its mean.',
    'The correlation is positive.': 'One residual’s sign says nothing about the overall correlation.',
    'The observed response equals zero.': 'A positive residual means observed exceeds predicted, not that the observed value is zero.',
  },
  'item-197': {
    'A point with a guaranteed large residual.': 'The point lies close to the line, so its residual is small; leverage does not require a large residual.',
    'A categorical response.': 'Responses in regression are quantitative; an unusual x-value does not change that.',
    'A sampling error by definition.': 'An unusual x-value can be a perfectly valid observation; it is not an error.',
  },
  'item-198': {
    '-0.36': 'Squaring a negative number gives a positive result; r-squared is always nonnegative.',
    '0.60': '0.60 is the magnitude of r, not its square.',
    '1.60': '1.60 adds 1 to 0.60; r-squared cannot exceed 1.',
  },
  'item-199': {
    '81% of the response values are wrong.': 'r-squared is a proportion of variation explained, not a count of wrong predictions.',
    'The correlation must be 0.19.': 'The correlation magnitude is the square root of 0.81, which is 0.90.',
    'There is no remaining variation.': 'The model explains 81%, which leaves 19% of the variation unexplained.',
  },
  'item-200': {
    'The residual must be zero.': 'Residuals exist only for observed points; no observation exists at x = 250 to compare against.',
    'The response becomes categorical.': 'The response variable stays quantitative regardless of the x-value used for prediction.',
    'The correlation is automatically one.': 'Correlation describes the observed data and does not change when predicting for a new x-value.',
  },
  'item-201': {
    'Is one named student satisfied?': 'One student’s answer has no variability to study; a statistical question asks about a group.',
    'What color are the cafeteria tables?': 'Table color is a single fact, not a characteristic that varies across students.',
    'Did the principal choose the schedule?': 'This asks about one decision with a yes-or-no answer, not about a distribution of responses.',
  },
  'item-202': {
    'A histogram of grade labels.': 'A histogram displays a quantitative distribution; grade level and transportation method are categorical.',
    'A scatterplot with no quantitative variables.': 'A scatterplot needs two quantitative variables; there are none here.',
    'A boxplot of transportation categories.': 'Boxplots summarize quantitative data with quartiles; categories have none.',
  },
  'item-203': {
    'The distribution is necessarily symmetric.': 'A symmetric distribution has a mean close to its median; here they differ by 7.',
    'The distribution is skewed left with no exceptions.': 'Left skew tends to pull the mean below the median; here the mean is above it.',
    'The distribution has no variability.': 'If there were no variability, every value, the mean, and the median would all be equal.',
  },
  'item-204': {
    '38': '38 adds only half the IQR to Q3 (32 + 6); the fence uses 1.5 times the IQR.',
    '44': '44 adds one IQR to Q3 (32 + 12) instead of 1.5 IQRs.',
    '64': '64 doubles Q3 (32 + 32) rather than adding 1.5 IQRs; the fence is 32 + 1.5(12) = 50.',
  },
  'item-205': {
    'Compare the raw numerical values without conversion.': 'A center of 3 minutes and a center of 120 seconds describe different things numerically unless converted to one unit.',
    'Compare only the sample sizes.': 'Sample size says nothing about where the distributions are centered.',
    'Convert both variables to categories.': 'Turning times into categories discards the numerical information needed to compare centers.',
  },
  'item-206': {
    'A simple random sample of the club.': 'A sample includes only part of the population; asking every member is a census.',
    'A voluntary response sample from the city.': 'The population is the club, not the city, and members were asked rather than opting in.',
    'A randomized experiment.': 'No treatments are assigned; asking opinions is data collection, not an experiment.',
  },
  'item-207': {
    'A cluster sample of one school.': 'Cluster sampling would select whole schools and survey them entirely; here students are sampled from every size group.',
    'A convenience sample.': 'Students were chosen at random within each group, not because they were easy to reach.',
    'A census of the district.': 'A census would survey every student; this design samples from each stratum.',
  },
  'item-208': {
    'Type I error.': 'Type I error is a hypothesis-test mistake; the problem here is who can be selected.',
    'Placebo effect.': 'Placebo effects belong to experiments with treatments, not to sampling frames.',
    'Random assignment.': 'Random assignment is an experimental technique, not a bias, and no treatments are involved.',
  },
  'item-209': {
    'The variables must be perfectly dependent.': 'Similar conditional percentages suggest little association, the opposite of strong dependence.',
    'The sample mean is zero.': 'Categorical data have no mean; late arrival is a category, not a measurement.',
    'The categories are quantitative measurements.': 'Bus rider, walker, and late are labels; conditional percentages are computed because the variables are categorical.',
  },
  'item-210': {
    'It guarantees the next repetition is a success.': 'Each repetition is still random; more repetitions do not determine any single outcome.',
    'It changes the event being modeled.': 'Running more repetitions of the same simulation estimates the same event more precisely.',
    'It makes the probability exceed 1.': 'An estimated probability is a proportion of repetitions and can never exceed 1.',
  },
  'item-211': {
    '0.72': '0.72 is P(A) itself; the complement subtracts it from 1.',
    '1.28': '1.28 adds 0.72 to 1 instead of subtracting, and no probability can exceed 1.',
    '0.07': '0.07 does not follow from any rule; 1 − 0.72 = 0.28.',
  },
  'item-212': {
    '0.20': '0.20 subtracts 0.30 from 0.50; the multiplication rule multiplies P(B) by P(A | B).',
    '0.80': '0.80 adds the two probabilities, which gives neither a joint nor a conditional probability.',
    '1.67': '1.67 divides 0.50 by 0.30 and exceeds 1.',
  },
  'item-213': {
    '1.00': '1.00 is the sum of the probabilities, not the weighted sum of outcomes.',
    '2.50': '2.50 is close to the unweighted average of 1, 2, and 4 (2.33) and ignores the probabilities.',
    '4.00': '4.00 is the most likely outcome, not the expected value; the average must weight all three outcomes.',
  },
  'item-214': {
    'The probability of winning is 2.': 'A probability cannot exceed 1; 2 points is a measure of spread, not a probability.',
    'Every payout is between 3 and 7 points.': 'Standard deviation describes typical distance, not a guaranteed range; payouts can fall outside one standard deviation.',
    'The most common payout is exactly 5 points.': 'The expected value need not be a possible or common payout; it is a long-run average.',
  },
  'item-215': {
    '(0.25)^12': '(0.25)^12 is the probability that all 12 trials succeed, not that at least one does.',
    '12(0.25)': '12(0.25) is the mean number of successes, which is 3, not a probability.',
    '1 - (0.25)^12': 'This is the complement of all successes; at least one success is the complement of zero successes, whose probability is (0.75)^12.',
  },
  'item-216': {
    'Every observation in the population becomes normal.': 'The theorem concerns the sampling distribution of the mean; individual observations keep the skewed population shape.',
    'The sample mean has no variability.': 'Sample means still vary; with n = 100 that variability is smaller but not zero.',
    'The population shape is changed by sampling.': 'Sampling does not alter the population; it only produces estimates of it.',
  },
  'item-217': {
    'Estimator A equals the parameter in every sample.': 'A smaller standard deviation means less variation, not none; estimates still differ from the parameter.',
    'Estimator B is necessarily biased.': 'Both estimators were stated to be unbiased; more variability does not create bias.',
    'Both estimators have zero sampling variability.': 'Unbiased estimators vary from sample to sample; only their long-run centers match the parameter.',
  },
  'item-218': {
    'Use a more extreme confidence level.': 'A higher confidence level widens the interval, and the question specified keeping the level fixed.',
    'Replace the sample with volunteers.': 'Volunteers add bias; they do not reduce the standard error.',
    'Increase the standard error.': 'A larger standard error widens the interval; narrowing requires a smaller one.',
  },
  'item-219': {
    'Ha: p = 0.55': 'Equality is the null hypothesis; the alternative expresses the claim of exceeding 0.55.',
    'Ha: p < 0.55': 'The claim is that more than 55% prefer option A, so the alternative must point above 0.55.',
    'Ha: p-hat > 0.55 for every sample': 'Hypotheses are about the population proportion p, not sample proportions.',
  },
  'item-220': {
    'There is a 20% probability the null hypothesis is true.': 'A p-value is computed assuming the null is true; it is not the probability that the null is true.',
    'The alternative hypothesis is impossible.': 'A large p-value means weak evidence against the null; it does not rule out the alternative.',
    'The sample proportion is wrong by 20 percentage points.': 'A p-value is not an error in the estimate; it measures how unusual the result would be under the null.',
  },
  'item-221': {
    'A test fails to reject a false null hypothesis.': 'Missing a false null is a Type II error, the false negative.',
    'A sample statistic equals its parameter.': 'That is a lucky estimate, not an error.',
    'A confidence interval contains the parameter.': 'An interval capturing the parameter is a success of the method, not an error.',
  },
  'item-222': {
    'The difference between the population proportions known without error.': 'The population difference is unknown; the center is the sample difference that estimates it.',
    'The pooled sample size.': 'Sample sizes affect the interval’s width, not its center.',
    'The chi-square statistic.': 'A chi-square statistic belongs to a different procedure and is not the center of a proportion interval.',
  },
  'item-223': {
    'Small expected counts prove independence.': 'Expected counts come from the totals and say nothing about whether the variables are associated.',
    'They make the variables quantitative.': 'The variables remain categorical; expected counts are a computational check, not a change of variable type.',
    'They guarantee a small p-value.': 'Small expected counts make the p-value unreliable; they do not push it in a particular direction.',
  },
  'item-224': {
    '5': '5 is the number of categories; the degrees of freedom subtract 1 from it.',
    '6': '6 adds 1 to the number of categories instead of subtracting.',
    '10': '10 doubles the number of categories and has no basis in the goodness-of-fit formula.',
  },
  'item-225': {
    'Normal with mean 64 and standard deviation 16.': '64 is the sample size, not the mean, and 16 is the population standard deviation rather than the standard error.',
    'Approximately normal with mean 0 and standard deviation 70.': 'The sampling distribution is centered at the population mean of 70, and 70 is not a standard deviation.',
    'Uniform with mean 70 and standard deviation 16.': 'With n = 64 the sampling distribution is approximately normal, and its standard deviation is 16/8 = 2.',
  },
  'item-226': {
    '18': '18 is the sample size; the degrees of freedom are n − 1.',
    '16': '16 subtracts 2 from the sample size; a one-sample procedure subtracts 1.',
    '36': '36 doubles the sample size and has no meaning here.',
  },
  'item-227': {
    'H0: mu > 10': 'An inequality belongs in an alternative hypothesis; the null asserts equality.',
    'H0: x-bar = 10 in every sample': 'Hypotheses are about the population mean, not sample means.',
    'H0: s = 10': 's is a sample standard deviation; the test concerns the population mean.',
  },
  'item-228': {
    'Fail to reject the null because p is positive.': 'All p-values are positive; 0.003 is less than alpha, so the null is rejected.',
    'Accept the null as proven true.': 'A small p-value is evidence against the null, and a test never proves the null true.',
    'Reject the null only if p is greater than alpha.': 'The decision rule is reversed; rejection requires p at most alpha.',
  },
  'item-229': {
    'The sum of the two population means.': 'Pairing produces differences, and their mean estimates a difference of means, not a sum.',
    'The proportion of participants who improve.': 'The mean difference is a quantitative summary; a proportion would count participants rather than average their changes.',
    'The correlation coefficient only.': 'Correlation describes the association between the two measurements, not the average change.',
  },
  'item-230': {
    'The second population mean is greater.': 'The interval for mu1 − mu2 is entirely positive, which indicates the first mean is larger.',
    'The population means are exactly equal.': 'Zero is outside the interval, so equality is not plausible at this confidence level.',
    'The individual data values all lie between 2.5 and 6.5.': 'The interval estimates a difference in means, not the range of individual observations.',
  },
  'item-231': {
    'The 95% interval contains more individual observations by definition.': 'Confidence intervals estimate a parameter, not the spread of individual observations.',
    'The population mean changes with confidence level.': 'The population mean is fixed; the confidence level changes only the interval’s width.',
    'The 99% interval has no sampling variability.': 'Every interval reflects sampling variability; the 99% interval is wider precisely to allow for it.',
  },
  'item-232': {
    'There is a 4% chance the null is true.': 'A p-value assumes the null is true; it does not give the probability that it is.',
    'The sample means will differ by exactly the same amount forever.': 'Sample differences vary; the conclusion is about population means.',
    'The result proves causation regardless of design.': 'Causal claims require random assignment; a significant difference alone does not establish cause.',
  },
  'item-233': {
    'A weak positive nonlinear association.': 'The points cluster tightly around a straight, downward line, so the association is strong, negative, and linear.',
    'No association because the slope is negative.': 'A negative slope is an association; the direction is just downward.',
    'A categorical distribution.': 'A scatterplot displays two quantitative variables, not a categorical distribution.',
  },
  'item-234': {
    'It triples.': 'Correlation is unitless and unaffected by multiplying a variable by a positive constant.',
    'It becomes zero.': 'Rescaling preserves the linear relationship, so the correlation keeps its value.',
    'It changes sign.': 'A positive multiplier preserves direction; only a negative multiplier would flip the sign.',
  },
  'item-235': {
    '1.8 response units.': '1.8 is the change for a one-unit increase; a five-unit increase multiplies it by 5.',
    '3.2 response units.': '3.2 does not come from the slope; the predicted change is slope times change in x.',
    '90 response units.': '90 multiplies by 50 instead of 5.',
  },
  'item-236': {
    'The correlation coefficient.': 'The intercept is a model coefficient in response units, not the unitless correlation.',
    'The residual for every observation.': 'Residuals vary by point and are computed from observed minus predicted values.',
    'The predicted response at the sample mean only.': 'The intercept is the prediction at x = 0; the prediction at the mean of x is the mean of y.',
  },
  'item-237': {
    'The response must be categorical.': 'Residual plots require a quantitative response; a fan shape concerns changing spread, not variable type.',
    'The correlation must equal zero.': 'A fan pattern in residuals says nothing about the correlation being zero.',
    'The sample must be a census.': 'Residual plots do not depend on how the sample was drawn; the funnel indicates non-constant variance.',
  },
  'item-238': {
    'The correlation must be 0.49 regardless of direction.': 'The correlation magnitude is the square root of 0.49, which is 0.70, with a sign given by the direction.',
    'The model is correct for 49% of individuals.': 'r-squared is a share of variation explained, not a count of individuals predicted correctly.',
    'There is a 49% chance of causation.': 'r-squared measures fit; it says nothing about causation.',
  },
  'item-239': {
    'Squaring makes every residual positive before fitting.': 'The purpose is to prevent cancellation in the sum, not merely to change signs; positive and negative residuals still exist after fitting.',
    'It forces the line through every point.': 'No line passes through every point of scattered data; least squares minimizes the total squared error.',
    'It removes the need to inspect the scatterplot.': 'The plot should always be examined; the squaring criterion does not check whether a line is appropriate.',
  },
  'item-240': {
    'The prediction is guaranteed accurate because it is close.': 'Even a small extrapolation assumes the pattern continues beyond the data, which is not guaranteed.',
    'The response must be zero.': 'Nothing about extrapolation forces the predicted response to zero.',
    'The model proves a causal effect.': 'Regression predictions do not establish causation regardless of where they are made.',
  },
};
