'use strict';
// AP Statistics foundation pilot: option-level feedback for items 081-160.
// See part1.cjs for the format.
module.exports = {
  'item-081': {
    'Negative and weak linear association': 'The points rise from left to right, so the association is positive, and points close to a line indicate strength, not weakness.',
    'No association because both variables are quantitative': 'Association is assessed between two quantitative variables all the time; a rising pattern is an association.',
    'Perfect causation': 'A scatterplot shows association only; causation needs an experiment, and nothing here is perfect.',
  },
  'item-082': {
    'Two clusters guarantee a correlation of zero.': 'Clusters can produce any correlation, sometimes a misleadingly strong one driven by the gap between groups.',
    'A linear model is only allowed for categorical variables.': 'Linear regression requires quantitative variables; categorical variables cannot be fit with a line.',
    'Clusters prove that the response variable caused the explanatory variable.': 'A scatterplot cannot establish causation in either direction; clusters only suggest subgroups.',
  },
  'item-083': {
    'A strong positive linear association': 'The negative sign means the variables move in opposite directions, so the association is negative.',
    'That 82% of observations are negative': 'Correlation is unitless and says nothing about the signs of individual observations.',
    'That the response causes the explanatory variable': 'Correlation measures association only; it cannot assign cause in either direction.',
  },
  'item-084': {
    'The slope units': 'The slope carries response units per explanatory unit, so converting meters to centimeters changes it by a factor of 100 in each direction.',
    'The intercept units': 'The intercept is measured in response units, which change when the response is converted.',
    'The numerical values of the observations': 'Every measurement becomes 100 times larger in centimeters, so the values change.',
  },
  'item-085': {
    '20': '20 is 4 times 5, the slope contribution alone, without adding the intercept of 12.',
    '60': '60 multiplies the intercept by the x-value, (12)(5); the intercept is added, not multiplied.',
    '8': '8 is 12 minus 4, which has no place in evaluating the model at x = 5.',
  },
  'item-086': {
    'Every observed y is exactly 4.': 'The slope is a rate of change, not a value of y, and observed values scatter around the line.',
    'The correlation between x and y is 4.': 'Correlation lies between −1 and 1 and is a different quantity from the slope.',
    'When x is zero, the response must be 4.': 'The prediction at x = 0 is the intercept, 12, not the slope.',
  },
  'item-087': {
    'The strength of the association in every context': 'Strength is measured by correlation or r-squared, not by the intercept.',
    'The largest observed response': 'The intercept is a model prediction at x = 0; it is unrelated to the maximum of the data.',
    'The residual for every observation': 'Residuals differ from point to point and are computed from observed minus predicted values, not from the intercept.',
  },
  'item-088': {
    '−6': 'The sign is reversed; residual is observed minus predicted, 41 − 35 = +6.',
    '35': '35 is the predicted value, not the difference between observed and predicted.',
    '76': '76 adds the observed and predicted values; a residual is their difference.',
  },
  'item-089': {
    'The correlation must be exactly 1.': 'A correlation of 1 would put every point on the line with zero residuals; a curved residual pattern shows the line misses the shape.',
    'The explanatory variable is categorical.': 'Residual plots are made for quantitative explanatory variables; a curved pattern is about model form, not variable type.',
    'The model has no residuals.': 'Every fitted model has residuals; the pattern in them is the point.',
  },
  'item-090': {
    'A high-leverage point only': 'Leverage comes from an unusual x-value; this point is not unusual horizontally.',
    'A point with zero residual': 'Being far from the rest vertically means a large residual, not zero.',
    'A sampling stratum': 'A stratum is a group in a sampling design and has nothing to do with residual plots.',
  },
  'item-091': {
    '0.30': '0.30 is 1 − 0.70; r-squared is the square of r, not its complement.',
    '0.70': '0.70 is r itself; r-squared requires squaring it.',
    '1.40': '1.40 doubles r; r-squared can never exceed 1.',
  },
  'item-092': {
    'The model predicts every response within 64 units.': 'r-squared is a proportion of variation explained, not a prediction error in response units.',
    'The correlation is 0.64 regardless of direction.': 'The correlation is the square root, 0.80 in magnitude, and its sign depends on the direction of the association.',
    'There is a 64% chance the model is causal.': 'r-squared says nothing about causation; it describes fit, not the reason for the association.',
  },
  'item-093': {
    'It minimizes the sum of residuals without squaring.': 'Unsquared residuals cancel; many lines make their sum zero, so that criterion does not pick a unique line.',
    'It passes through every data point.': 'A line passes through every point only when the data are perfectly linear; otherwise residuals are nonzero.',
    'It makes every residual positive.': 'Residuals are positive above the line and negative below it; the least-squares line has residuals summing to zero.',
  },
  'item-094': {
    'Interpolation': 'Interpolation predicts within the observed range, which is the safer case.',
    'Blocking': 'Blocking is an experimental design technique for grouping similar units, unrelated to prediction range.',
    'Random assignment': 'Random assignment is how treatments are allocated in an experiment, not a property of regression predictions.',
  },
  'item-095': {
    'Delete it automatically because it changes the slope.': 'Influence is a reason to investigate, not to discard; the point may be a valid observation.',
    'Keep it hidden because regression cannot use unusual points.': 'Regression can include unusual points; concealing them misrepresents the data.',
    'Conclude that the response caused the point.': 'A single point’s influence says nothing about causation.',
  },
  'item-096': {
    'Correlation is calculated only for categorical variables.': 'Correlation applies to quantitative variables like sales counts; the issue is a lurking variable, not the data type.',
    'A positive correlation means the variables cannot be related.': 'A positive correlation means they are related; what it cannot show is that one causes the other.',
    'The sample size must always be one.': 'Sample size is irrelevant here, and a correlation cannot even be computed from one observation.',
  },
  'item-097': {
    'It becomes 30, with response units per minute.': '30 multiplies by 60; a one-minute change is 1/60 of an hour, so the slope per minute is smaller, 0.5/60.',
    'It remains 0.5 with no unit change.': 'The slope’s units change with x, and its numerical value must change to keep predictions the same.',
    'It becomes 60.5.': 'Adding 60 has no basis; converting units rescales the slope by a factor, not an added amount.',
  },
  'item-098': {
    'The response variable is categorical.': 'Residual plots exist only for quantitative responses; a good-looking plot supports the model conditions, not a change in variable type.',
    'The fitted line must be causal.': 'Residual patterns concern fit; causation depends on how the data were collected.',
    'The model predicts every point exactly.': 'Residuals scattered around zero are still nonzero; exact prediction would put every residual at zero.',
  },
  'item-099': {
    'The variables are proven independent in every population.': 'Failing to find evidence of a slope does not prove no relationship, and the result applies only to the population sampled.',
    'The slope is exactly zero.': 'Zero is one plausible value among many in the interval; the data do not pin the slope to zero.',
    'The model proves there is a causal effect.': 'An interval that includes zero provides no evidence of an effect, causal or otherwise.',
  },
  'item-100': {
    'Only the largest response value': 'One extreme value cannot tell you about form, direction, strength, or unusual points.',
    'Whether the graph uses a pie chart': 'Pie charts display categorical data and have nothing to do with regression.',
    'Whether the sample mean equals zero': 'The mean of either variable is irrelevant to whether a line fits the scatterplot.',
  },
  'item-101': {
    'The proportion in the sample who answer the survey.': 'A sample proportion is a statistic used to estimate the parameter; the parameter describes all enrolled students.',
    'The number of buses used by the school.': 'The bus count is unrelated to the proportion of students who use public transportation.',
    'The mean number of trips made by one student.': 'One student’s trips is neither a proportion nor a population summary.',
  },
  'item-102': {
    'Commute time in minutes': 'Time in minutes is a measured quantity with units, so it is quantitative.',
    'Distance traveled in miles': 'Distance is a measurement, which makes it quantitative.',
    'Number of transfers': 'A count of transfers is a quantitative variable, even though it takes whole-number values.',
  },
  'item-103': {
    '0.30': '0.30 is 45 out of 150, the relative frequency for walkers, not bus riders.',
    '0.67': '0.67 would require 100 of the 150 students; only 75 ride the bus, so the relative frequency is 0.50.',
    '1.50': '1.50 is greater than 1, which no relative frequency can be; the bus share is 75 of 150.',
  },
  'item-104': {
    'A single histogram of all commute times': 'Commute time is a different variable, and a histogram cannot compare transportation categories between grades.',
    'A scatterplot of student names': 'Names are labels, not quantitative variables, so a scatterplot has nothing to plot.',
    'A boxplot of category labels': 'Boxplots summarize quantitative distributions; categories have no quartiles.',
  },
  'item-105': {
    'A bar chart with one bar for each student name': 'One bar per student shows individual values, not the distribution of step counts.',
    'A pie chart of numerical intervals without bins': 'A pie chart displays parts of a categorical whole, and step counts need defined intervals to be grouped at all.',
    'A two-way table of two categorical variables': 'Step count is a single quantitative variable; a two-way table needs two categorical ones.',
  },
  'item-106': {
    'The mean must equal the median.': 'Equality is typical of symmetric distributions; a long left tail pulls the mean below the median.',
    'The mean is greater than the maximum.': 'The mean is an average of the values and can never exceed the largest one.',
    'The median must be zero.': 'The median is the middle value of the data; nothing about skewness forces it to zero.',
  },
  'item-107': {
    '7': '7 is Q3 minus the median (25 − 18), only the upper half of the middle 50%.',
    '18': '18 is the median, a measure of center, not spread.',
    '37': '37 adds Q1 and Q3; the IQR subtracts them.',
  },
  'item-108': {
    'A value exactly equal to the mean': 'The mean is the center of the data and could never be an outlier.',
    'Any value above the median': 'Half the data lie above the median; being above it is ordinary, not unusual.',
    'The difference between the minimum and maximum only': 'That is the range; the 1.5-IQR rule uses fences built from the quartiles.',
  },
  'item-109': {
    'Distribution A must have a larger median.': 'Standard deviation measures spread and gives no information about the median.',
    'Distribution A must be skewed right.': 'Spread and shape are separate; a smaller standard deviation can accompany any shape.',
    'Distribution A has no variability.': 'A smaller standard deviation still means some variability unless it is exactly zero, which is not stated.',
  },
  'item-110': {
    'A randomized experiment': 'An experiment requires the researcher to assign study methods; here habits were only observed.',
    'A census of every possible student': 'A census means collecting data from the whole population, which is not described and is unrelated to whether treatments are imposed.',
    'A matched-pairs experiment with no response variable': 'No treatments were assigned, and exam score is clearly a response variable.',
  },
  'item-111': {
    'A voluntary response sample': 'People did not choose to participate; they were selected by a fixed rule from the roster.',
    'A cluster sample': 'Cluster sampling selects whole groups; taking every tenth name selects individuals spread through the list.',
    'A census': 'A census would include every name on the roster, not one in ten.',
  },
  'item-112': {
    'Placebo effect': 'Placebo effects occur in experiments with treatments; a mailed survey has none.',
    'Underflow in a probability calculation': 'Underflow is a computing issue with tiny numbers, not a survey bias.',
    'Random assignment bias': 'Random assignment is an experimental technique, not a bias, and no treatments are assigned.',
  },
  'item-113': {
    'The result automatically generalizes to every student in the world.': 'Volunteers are not a random sample, so generalization beyond similar participants is not supported.',
    'The study proves the sample mean equals the population mean.': 'A sample statistic never equals the population parameter with certainty.',
    'The result is only a description of an unassigned survey.': 'Treatments were randomly assigned, which is what makes this an experiment rather than a survey.',
  },
  'item-114': {
    'Only the grand total of all breakfast choices.': 'The grand total is one number and cannot show whether the groups differ.',
    'The row labels without any counts.': 'Labels alone contain no data to compare.',
    'The mean of the categorical labels.': 'Categories have no mean; the comparison must use conditional percentages.',
  },
  'item-115': {
    '24%': '24% treats the count of 24 as a percentage; the count must be divided by the group total of 40.',
    '40%': '40% treats the group size as the answer; 40 is the denominator, not the proportion.',
    '66.7% of all observations regardless of group size': 'A conditional percentage is computed within the group, and 24/40 is 60%, not 66.7%.',
  },
  'item-116': {
    '0.0062': '0.0062 is off by a factor of ten; 31/500 = 0.062.',
    '0.31': '0.31 would be 31 out of 100; there were 500 repetitions.',
    '16.13': '16.13 divides 500 by 31, the inverse ratio, and a probability cannot exceed 1.',
  },
  'item-117': {
    '0.07': '0.07 multiplies the probabilities, which would apply to independent events occurring together; disjoint events are added.',
    '0.15': '0.15 subtracts the probabilities; the union of disjoint events adds them.',
    '1.55': '1.55 adds 1 to the correct sum and exceeds the maximum possible probability.',
  },
  'item-118': {
    'The two terms always mean exactly the same thing.': 'They describe different ideas: one is about events overlapping, the other about probabilities changing.',
    'Independent events must have equal probabilities.': 'Independence places no requirement on the sizes of the probabilities, only on their product.',
    'Mutually exclusive events must each have probability 0.50.': 'Mutually exclusive events can have any probabilities whose sum is at most 1.',
  },
  'item-119': {
    '0.12': '0.12 is off by a factor of five; 0.18/0.30 = 0.60.',
    '0.48': '0.48 adds the two probabilities; conditional probability divides the joint probability by P(B).',
    '1.67': '1.67 divides 0.30 by 0.18, the inverse ratio, and a probability cannot exceed 1.',
  },
  'item-120': {
    'The events A and B are mutually exclusive.': 'If they were mutually exclusive, P(A | B) would be 0, not 0.42.',
    'The probability of B must be zero.': 'Conditional probability on B is only defined when P(B) is positive.',
    'A and B must always occur together.': 'Always occurring together would make P(A | B) equal to 1.',
  },
  'item-121': {
    'It can take every real value between 0 and 5.': 'Taking every value in an interval describes a continuous variable; this one takes only 0, 2, or 5.',
    'It measures a continuous physical length only.': 'Points awarded are counted, not measured continuously.',
    'Its expected value must be an integer.': 'The expected value of a discrete variable is a weighted average and is often not an integer.',
  },
  'item-122': {
    'Every individual outcome equals 12.': 'Expected value is an average over many repetitions; individual outcomes vary around it.',
    'The most likely outcome must equal 12.': 'The expected value need not be a possible outcome at all, let alone the most likely one.',
    'The variable has standard deviation 12.': 'Standard deviation measures spread and is a separate quantity from the expected value.',
  },
  'item-123': {
    'A fixed number of trials': 'A fixed number of trials is one of the binomial requirements.',
    'Two outcomes per trial': 'Each trial being a success or failure is required for a binomial model.',
    'Independent trials with a constant success probability': 'Independence and a constant probability are both required conditions.',
  },
  'item-124': {
    '85': '85 is one standard deviation below the mean (100 − 15).',
    '100': '100 is the mean itself, zero standard deviations away.',
    '130': '130 is two standard deviations above the mean (100 + 30).',
  },
  'item-125': {
    'It doubles from 3.6 to 7.2.': 'Larger samples reduce the standard error; the change goes down by half, not up.',
    'It remains 18.': '18 is the population standard deviation; the standard error is 18 divided by the square root of n.',
    'It becomes zero.': 'The standard error shrinks with larger samples but stays positive for any finite n.',
  },
  'item-126': {
    'A census parameter known without sampling': 'A parameter is the population value; the sample proportion is the statistic that estimates it.',
    'A Type II error': 'A Type II error is a wrong test decision, not a statistic.',
    'A critical value only': 'A critical value is a cutoff from a reference distribution, not a sample statistic.',
  },
  'item-127': {
    '0.00054': '0.00054 is close to the variance 0.00046875 before taking the square root, not the standard deviation.',
    '0.1875': '0.1875 is p(1 − p) = 0.25(0.75), before dividing by n and taking the square root.',
    '0.25': '0.25 is the population proportion itself, not the standard deviation of the sample proportion.',
  },
  'item-128': {
    'Increasing the confidence level with the same sample size.': 'Higher confidence requires a larger critical value, which increases the margin of error.',
    'Replacing random sampling with voluntary response.': 'A voluntary response sample introduces bias and does not reduce the margin of error.',
    'Removing the estimate from the interval.': 'The estimate is the interval’s center; removing it leaves nothing to report.',
  },
  'item-129': {
    '0.32': '0.32 lies inside the interval (0.31, 0.39), so it remains a plausible value.',
    '0.35': '0.35 is the center of the interval and is entirely plausible.',
    '0.38': '0.38 is inside the interval and therefore plausible at this confidence level.',
  },
  'item-130': {
    'H0: p < 0.18': 'The null hypothesis states equality; the inequality belongs to the alternative.',
    'H0: p-hat < 0.18': 'Hypotheses are about the population proportion p, not the sample statistic.',
    'H0: p = 0.82': '0.82 is the complement of 0.18; the claim concerns the proportion who abandon, which is 0.18.',
  },
  'item-131': {
    'The null hypothesis has a higher probability of being true.': 'A smaller p-value is stronger evidence against the null, and p-values never give the probability that a hypothesis is true.',
    'The sample was definitely biased.': 'A small p-value says the result is unusual under the null; it says nothing about bias in sampling.',
    'The alternative hypothesis is proven with certainty.': 'A small p-value is evidence, not proof; the null could still be true.',
  },
  'item-132': {
    'Reject H0 because the p-value is positive.': 'Every p-value is positive; the decision depends on comparing it with alpha.',
    'Accept H0 as proven true.': 'Failing to reject never proves the null; it only means the evidence was not strong enough.',
    'Reject H0 because 0.012 is less than 0.05 regardless of alpha.': 'The stated alpha is 0.01, and the decision must use the alpha chosen before the test.',
  },
  'item-133': {
    'Rejects a true null hypothesis.': 'Rejecting a true null is a Type I error, the false positive.',
    'Rejects a true alternative hypothesis.': 'Tests decide about the null; there is no decision to reject the alternative.',
    'Uses a sample proportion instead of a parameter.': 'That would be a mistake in stating hypotheses, not a Type II error.',
  },
  'item-134': {
    'p1 + p2': 'The sum of the proportions is not the center of a difference.',
    'p1p2': 'A product of proportions arises for independent joint events, not for the difference of sample proportions.',
    '0 for every pair of populations': 'The center is zero only when the two population proportions happen to be equal.',
  },
  'item-135': {
    'The sum of the two sample counts only.': 'Counts are not the parameter, and the interval concerns a difference, not a sum.',
    'The mean of one quantitative population.': 'Proportions summarize categorical data; no mean is involved.',
    'The correlation between two measurements.': 'Correlation applies to paired quantitative variables, not to proportions from two groups.',
  },
  'item-136': {
    'The second population proportion is definitely greater.': 'The interval for p1 − p2 is entirely positive, which points to the first proportion being larger.',
    'The two sample proportions are equal.': 'The interval is centered at 0.10, so the sample proportions differ by 0.10.',
    'The interval proves a causal effect.': 'A confidence interval describes a difference; causation depends on the study design.',
  },
  'item-137': {
    'Ha: p1 - p2 = 0': 'A statement of equality is the null hypothesis; the alternative must express the claimed difference.',
    'Ha: p1 - p2 > 0': 'A positive difference would mean population 1 has the larger proportion, the opposite of the claim.',
    'Ha: p-hat1 - p-hat2 < 0 for every sample': 'Hypotheses concern the population parameters, not sample statistics.',
  },
  'item-138': {
    'The null is mathematically impossible.': 'Rejecting the null means the data are unlikely under it, not that it is impossible.',
    'The sample proportions are guaranteed to differ in every future sample.': 'Sample results vary; a test conclusion is about the populations, not future samples.',
    'The result proves one treatment caused the difference without a randomized design.': 'Causal conclusions require random assignment; a test on observational data shows association only.',
  },
  'item-139': {
    'The variables have a perfect causal relationship.': 'Chi-square tests concern association, and the null is the absence of association, not a causal claim.',
    'Every cell in the table has the same observed count.': 'Equal observed counts are not required by either hypothesis; expected counts follow from the totals.',
    'The sample was selected without any randomness.': 'Random selection is a condition for the test, not a hypothesis being tested.',
  },
  'item-140': {
    '7': '7 adds the row and column counts (4 + 3); the degrees of freedom multiply (rows − 1) by (columns − 1).',
    '9': '9 is 3 times 3, using the column count without subtracting 1.',
    '12': '12 is rows times columns, the number of cells, not the degrees of freedom.',
  },
  'item-141': {
    'The sample standard deviation.': 'The sample standard deviation measures spread within one sample and is not the center of a sampling distribution.',
    'Zero for every population.': 'The sample mean is centered at the population mean, which is zero only for a population with mean zero.',
    'The population variance divided by n.': 'That is the variance of the sample mean, which describes its spread rather than its center.',
  },
  'item-142': {
    'A one-proportion z-test': 'Measurements before and after are quantitative; there is no proportion to test.',
    'A chi-square test for independence': 'Chi-square procedures handle categorical variables, not paired measurements.',
    'A two-sample procedure that ignores the pairing': 'Ignoring the pairing treats the two sets as independent and discards the within-person structure that the design created.',
  },
  'item-143': {
    '95% of individual observations are between 72 and 80.': 'The interval estimates the population mean, not the range of individual values, which is typically much wider.',
    'The sample mean changes between 72 and 80 with probability 0.95.': 'The sample mean is a known number at the center of the interval and does not move.',
    'Every future sample mean must be in the interval.': 'Future sample means vary and can fall outside any particular interval.',
  },
  'item-144': {
    'Ha: mu = 10': 'Equality is the null hypothesis; the alternative expresses the claim of exceeding 10.',
    'Ha: x-bar > 10 for every sample': 'Hypotheses describe the population mean mu; x-bar is a sample statistic that varies from sample to sample.',
    'Ha: mu < 10': 'The researcher is testing whether the mean exceeds 10, so the alternative must point above 10.',
  },
  'item-145': {
    'There is a 0.4% chance the null is true.': 'A p-value is computed assuming the null is true and does not give the probability that it is.',
    'The sample mean is wrong by 0.004 units.': 'A p-value is a probability, not an error in the estimate.',
    'The population standard deviation is 0.004.': 'The p-value has no connection to the population standard deviation.',
  },
  'item-146': {
    'mu1 + mu2': 'The sum of means is not the center of a difference of sample means.',
    '0 for all populations': 'The center is zero only when the population means happen to be equal.',
    'The pooled sample standard deviation': 'A standard deviation describes spread, not the center of a sampling distribution.',
  },
  'item-147': {
    'A one-proportion z-interval': 'Proportions summarize categorical data for one group; the target here is a difference in means.',
    'A chi-square test for homogeneity': 'Chi-square procedures compare categorical distributions and produce no mean estimate.',
    'A binomial probability calculation': 'Binomial probabilities model counts of successes, not differences in means.',
  },
  'item-148': {
    'The first mean is definitely larger.': 'The interval includes negative values, so a smaller first mean also remains plausible.',
    'The two population means are proven equal.': 'Zero being plausible is not the same as zero being proven; other differences in the interval are plausible too.',
    'Every individual measurement has a difference in that interval.': 'The interval estimates the population mean difference, not individual differences.',
  },
  'item-149': {
    'Ha: mu_new - mu_old = 0': 'An equals sign marks the null hypothesis; the alternative states the reduction being tested.',
    'Ha: mu_new - mu_old > 0': 'A positive difference would mean the new process takes longer, the opposite of a reduction.',
    'Ha: x-bar_new - x-bar_old < 0 for every sample': 'Hypotheses concern population means, not sample means.',
  },
  'item-150': {
    'Reject the null because the p-value is nonzero.': 'Every p-value is nonzero; rejection requires p at most alpha, and 0.23 is far above 0.05.',
    'Accept the null as proven true.': 'A large p-value means insufficient evidence against the null, not proof of it.',
    'Conclude the two sample means can never differ.': 'Sample means always vary; the test concerns population means.',
  },
  'item-151': {
    'The relationship is necessarily causal.': 'An observational scatterplot shows association only; causation would need random assignment of study hours.',
    'The response variable is categorical.': 'Score is a quantitative measurement, which is why it can be plotted on a scatterplot.',
    'The correlation must equal zero.': 'An upward linear pattern means a positive correlation, not zero.',
  },
  'item-152': {
    '0 to 100': 'Correlation is not a percentage and can be negative.',
    'Negative infinity to infinity': 'Correlation is standardized, so it is bounded between −1 and 1.',
    '0 to 1 only': 'Negative correlations are possible and describe associations that decrease.',
  },
  'item-153': {
    '15': '15 adds the intercept and the slope (12 + 3) without multiplying the slope by x = 4.',
    '36': '36 is 12 times 3, multiplying the intercept by the slope instead of substituting x.',
    '48': '48 is 12 times 4, multiplying the intercept by x rather than adding it to 3(4).',
  },
  'item-154': {
    'Every student loses exactly 2.5 minutes.': 'The slope describes a predicted average change; individual students vary around the line.',
    'The intercept is -2.5 minutes.': 'The slope and intercept are different coefficients; −2.5 is the slope.',
    'The correlation is -2.5.': 'Correlation lies between −1 and 1 and cannot be −2.5.',
  },
  'item-155': {
    '3': 'The sign is reversed; observed minus predicted is 18 − 21 = −3, placing the point below the line.',
    '18': '18 is the observed value, not the difference between observed and predicted.',
    '39': '39 adds observed and predicted; a residual subtracts them.',
  },
  'item-156': {
    'The response is categorical.': 'Exam score is quantitative; that is what allows a scatterplot and a linear description.',
    'The variables are proven causally related.': 'A scatterplot of observed data cannot prove causation.',
    'The correlation must equal zero.': 'An upward linear pattern corresponds to a positive correlation.',
  },
  'item-157': {
    'The response variable changed units.': 'Correlation is unaffected by unit changes, so a change in r cannot come from rescaling.',
    'The association became negative.': 'Both values are positive; the association stayed positive and became stronger.',
    'The correlation is now outside its possible range.': '0.80 is within the range from −1 to 1.',
  },
  'item-158': {
    'The median must decrease.': 'Adding a large value can leave the median unchanged or nudge it upward, never downward.',
    'The IQR must become zero.': 'One added value barely affects the quartiles and cannot collapse the middle half to zero spread.',
    'The minimum must increase above the added value.': 'The minimum stays the same; the added value is large, not small.',
  },
  'item-159': {
    'It is divided by 60.': 'Converting hours to minutes multiplies every value by 60, so the standard deviation is multiplied, not divided.',
    'It remains numerically unchanged.': 'Only correlation and z-scores are unchanged by rescaling; the standard deviation scales with the data.',
    'It becomes zero.': 'Rescaling by a positive constant preserves variability; the standard deviation is zero only if all values are equal.',
  },
  'item-160': {
    'Only the larger sample mean.': 'Comparing only one mean ignores spread, shape, and unusual values.',
    'The labels of the researchers.': 'Who collected the data is not a feature of the distributions.',
    'The order in which the data were typed.': 'Data order has no bearing on the distributions being compared.',
  },
};
