'use strict';
// AP Statistics foundation pilot: option-level feedback for items 001-080.
// Keyed by short item id ('item-001' expands to the pack id prefix in
// index.cjs), then by the exact distractor text. Each note names the
// misconception or the miscalculation that produces the distractor, then
// points back to the correct idea. Original editorial text.
module.exports = {
  'item-001': {
    'Did Maya walk to school on Tuesday morning last week?': 'This asks about one person on one day, so there is no variability to investigate and no population to describe.',
    'What is the name of the school mascot chosen for this year?': 'The mascot is a single fact with one answer, not a question whose answers vary across a group.',
    'Is walking always better than driving for every student?': 'This is an opinion question about every student, not a measurable characteristic that varies and can be estimated from data.',
  },
  'item-002': {
    'The participant’s favorite messaging app': 'A favorite app is a category label, so the variable is categorical, not a counted or measured amount.',
    'Whether the participant has a phone': 'Yes or no is a categorical response with two labels; it has no numerical units.',
    'The participant’s grade level': 'Grade level names a group a student belongs to; even when written as a number it functions as a category here.',
  },
  'item-003': {
    '0.28': '0.28 would be 84 out of 300; the survey had 240 students, so the relative frequency is 84/240 = 0.35.',
    '0.65': '0.65 is 1 − 0.35, the share of students who did not choose the later period, not the share who did.',
    '2.86': '2.86 comes from dividing the total by the category count (240/84); relative frequency divides the other way and must be at most 1.',
  },
  'item-004': {
    'A histogram': 'A histogram displays the distribution of a quantitative variable in bins; transportation method is categorical.',
    'A scatterplot': 'A scatterplot shows the relationship between two quantitative variables, and here there is one categorical variable.',
    'A boxplot': 'A boxplot summarizes a quantitative distribution with quartiles; categories have no quartiles.',
  },
  'item-005': {
    'Uniform and symmetric': 'A uniform shape has no peak and equal heights; this histogram has a clear concentration between 10 and 25 minutes and a long tail.',
    'Bimodal and skewed left': 'There is one main peak, not two, and a long right tail means the skew is to the right.',
    'Unimodal and exactly normal': 'A normal shape is symmetric; a long right tail rules out normality even though the distribution has one peak.',
  },
  'item-006': {
    'The mean': 'The mean adds every value, so one very large observation pulls it upward; it is not resistant.',
    'The standard deviation': 'Standard deviation squares each distance from the mean, so a single extreme value inflates it substantially.',
    'The range': 'The range is the maximum minus the minimum, so an unusually large value changes it directly.',
  },
  'item-007': {
    '−2': 'A negative z-score would mean the observation is below the mean; 64 is above 52, so the sign is positive.',
    '0.5': '0.5 is the standard deviation divided by the distance (6/12); the z-score divides the distance by the standard deviation, 12/6 = 2.',
    '12': '12 is the raw distance from the mean (64 − 52) before dividing by the standard deviation of 6.',
  },
  'item-008': {
    '5': '5 is Q1 minus the minimum (9 − 4), which describes the lower whisker, not the middle half.',
    '14': '14 is the third quartile minus the minimum (18 − 4); the IQR uses Q3 minus Q1.',
    '23': '23 is the range (27 − 4), which measures the full spread, not the spread of the middle 50%.',
  },
  'item-009': {
    'Class A must therefore have the larger mean score.': 'The IQR measures spread of the middle half and says nothing about the mean; equal medians with different IQRs are consistent with any ordering of means.',
    'Class A has more of its scores below the median.': 'By definition about half of each class is below its own median; the IQR does not change that.',
    'Class B must therefore have a higher maximum score.': 'A larger IQR means a wider middle half, but the maximum is an extreme value the IQR does not determine.',
  },
  'item-010': {
    'It guarantees that the study will end up with a much larger random sample of people.': 'Rewording a question changes nothing about how many people are sampled or how they were selected.',
    'It turns an observational study into a completely randomized experiment instead.': 'An experiment requires imposing treatments with random assignment; changing survey wording does not do that.',
    'It eliminates all of the response bias from every one of the survey responses given.': 'Wording chosen to chase a result is more likely to introduce response bias than to remove it.',
  },
  'item-011': {
    'A cluster random sample': 'Cluster sampling selects whole groups and surveys everyone inside them; here every grade contributes a random sample, which is stratification.',
    'A voluntary response sample': 'A voluntary response sample lets people opt in; this design uses random selection within each grade.',
    'A systematic sample': 'A systematic sample takes every kth person from a list after a random start; no such rule is used here.',
  },
  'item-012': {
    'A stratified random sample': 'Stratified sampling takes a random sample from every group; here only three neighborhoods are chosen and then fully surveyed.',
    'A convenience sample': 'The neighborhoods were selected at random, not because they were easy to reach.',
    'A census of the city': 'A census would survey every household in the city, not only those in three selected neighborhoods.',
  },
  'item-013': {
    'Undercoverage caused by a census': 'A census includes everyone, so it does not cause undercoverage, and no census is involved in an open web poll.',
    'Placebo bias': 'Placebo effects belong to experiments with treatments; a web poll imposes no treatment.',
    'Regression to the mean': 'Regression to the mean concerns extreme measurements moving toward average on remeasurement, not who chooses to answer a poll.',
  },
  'item-014': {
    'Type I error': 'A Type I error is a hypothesis-test mistake; the problem here is who has a chance to be surveyed.',
    'Response variable bias': 'This is not a standard bias term, and the concern is that non-English speakers are left out of the sample entirely.',
    'Random assignment': 'Random assignment is an experimental design feature, not a bias, and no treatments are assigned in a survey.',
  },
  'item-015': {
    'It guarantees that every participant receives the preferred treatment.': 'Random assignment deliberately gives participants no choice of treatment; that is how it balances groups.',
    'It allows the researcher to generalize to every population.': 'Generalization depends on how participants were sampled, not on how they were assigned to treatments.',
    'It prevents the response variable from varying.': 'The response still varies; random assignment makes group differences attributable to treatment rather than lurking variables.',
  },
  'item-016': {
    'Parameters': 'A parameter is a numerical summary of a population; the GPA groups are sets of students, not numbers.',
    'Clusters': 'Clusters are groups selected whole in a sampling design; here the groups exist to control variation before random assignment.',
    'Sampling frames': 'A sampling frame is the list from which a sample is drawn; it is not a grouping used inside an experiment.',
  },
  'item-017': {
    'A census': 'A census is collecting data from an entire population; blinding is about who knows the treatment assignment.',
    'Undercoverage': 'Undercoverage is a sampling problem where some people cannot be selected, not a feature of treatment concealment.',
    'A matched-pairs sample without treatment': 'Matched pairs describe a design structure, and this experiment does impose treatments; the feature described is double-blinding.',
  },
  'item-018': {
    'The sample proves that the app itself caused the reported screen time.': 'A survey observes behavior without assigning treatments, so it cannot establish that the app caused anything.',
    'The result automatically applies to every single person in the country.': 'The sample was drawn from app users, so generalization reaches similar app users, not the whole country.',
    'The sample statistic is exactly equal to the population parameter itself.': 'A sample statistic estimates the parameter with sampling variability; it is not equal to it.',
  },
  'item-019': {
    'The median of the data': 'Adding a constant shifts every value, including the middle one, so the median increases by that constant.',
    'The minimum of the data': 'The smallest value also receives the added constant, so the minimum shifts.',
    'The maximum of the data': 'The largest value shifts by the constant as well; only measures of spread stay the same.',
  },
  'item-020': {
    '6': '6 is 18 divided by 3; multiplying each value by 3 multiplies the mean by 3.',
    '18': 'The mean is unchanged only when zero is added; multiplying every value by 3 triples it.',
    '21': '21 is 18 plus 3; the values were multiplied, not increased by 3.',
  },
  'item-021': {
    'The grand total of the entire two-way table': 'The grand total is a single number and cannot show how ownership differs from grade to grade.',
    'A histogram showing the grade labels only': 'Grade is categorical, and a histogram of labels would not display device ownership within each grade.',
    'The sample mean of all the device categories': 'Categories have no mean; averaging labels is meaningless.',
  },
  'item-022': {
    '0.18': '0.18 treats the count of 18 as if it were out of 100; the denominator must be the 60 bikers.',
    '0.42': '0.42 is the late count over the number of bikers who were not late (18/42); the conditional proportion uses the full group of 60.',
    '3.33': '3.33 divides 60 by 18, the inverse of the correct ratio; a proportion cannot exceed 1.',
  },
  'item-023': {
    '0.0023': '0.0023 is off by a factor of ten; 46 out of 2,000 is 0.023.',
    '0.046': '0.046 would be 46 out of 1,000; the simulation ran 2,000 repetitions.',
    '0.23': '0.23 would be 46 out of 200; dividing by the actual 2,000 repetitions gives 0.023.',
  },
  'item-024': {
    '0.62': '0.62 is P(A) itself; the complement is what remains after subtracting from 1.',
    '1.62': '1.62 adds 0.62 to 1 instead of subtracting, and no probability can exceed 1.',
    '0.06': '0.06 does not follow from any rule here; the complement is 1 − 0.62 = 0.38.',
  },
  'item-025': {
    'P(A) = P(B)': 'Mutually exclusive events can have any probabilities; nothing requires them to be equal.',
    'P(A and B) = P(A)P(B)': 'That is the rule for independent events; mutually exclusive events with positive probability are not independent.',
    'P(A or B) = 0': 'For mutually exclusive events, P(A or B) = P(A) + P(B), which is positive whenever either event can occur.',
  },
  'item-026': {
    '0.25': '0.25 is 20 out of 80, using all visitors as the denominator; the condition restricts attention to the 32 borrowers.',
    '0.40': '0.40 is 32 out of 80, the probability of borrowing a book, not the conditional probability of using a study room.',
    '0.375': '0.375 is 12 out of 32, the share of borrowers who did not use a study room; the question asks for the share who did.',
  },
  'item-027': {
    '0.10': '0.10 does not come from the independence rule; multiplying 0.4 by 0.5 gives 0.20.',
    '0.45': '0.45 is the average of the two probabilities; independence calls for their product.',
    '0.90': '0.90 is the sum of the probabilities, which would overstate even P(A or B) here.',
  },
  'item-028': {
    '0.20': '0.20 is P(A and B), the overlap, not the probability of A or B.',
    '0.50': '0.50 is P(B) alone; the union combines both events while removing the double-counted overlap.',
    '0.90': '0.90 adds P(A) and P(B) without subtracting the overlap of 0.20, so it double counts outcomes in both events.',
  },
  'item-029': {
    'All outcomes have the same probability.': 'Equal probabilities describe a uniform distribution, which is one valid case, not a requirement.',
    'The mean must equal 0.': 'The expected value can be any number; validity depends only on the probabilities themselves.',
    'There must be exactly four possible outcomes.': 'A discrete distribution can have any countable number of outcomes.',
  },
  'item-030': {
    '0.6': '0.6 is 2 times 0.3, the contribution of the last outcome alone; the expected value sums every value times its probability.',
    '1.0': '1.0 is the average of the values 0, 1, and 2, ignoring that they are not equally likely.',
    '1.5': '1.5 does not weight the values by their probabilities correctly; 0(0.2) + 1(0.5) + 2(0.3) = 1.1.',
  },
  'item-031': {
    'Every single player will receive exactly $2.40 on each play.': 'Expected value is a long-run average; individual plays can pay much more or less.',
    'The game must pay exactly $2.40 on its single most common outcome.': 'The expected value need not equal any actual payout, let alone the most frequent one.',
    'The probability of winning on any one play is exactly 2.40.': 'A probability cannot exceed 1; $2.40 is an average payout, not a probability.',
  },
  'item-032': {
    'The number of separate rolls that are needed until a six first appears on a fair six-sided die': 'Counting trials until the first success has no fixed number of trials; that is a geometric setting, not binomial.',
    'The total amount of rainfall that is recorded tomorrow at the local weather station in the city': 'Rainfall is a continuous measurement, not a count of successes in a fixed number of trials.',
    'The number of heads in a set of flips where the coin changes its bias on every single flip': 'A binomial model requires the same success probability on every trial; a changing bias violates that.',
  },
  'item-033': {
    '0.25': '0.25 is the success probability p, not the expected count; the mean is np = 40(0.25) = 10.',
    '30': '30 is the expected number of failures, n(1 − p); the mean of X counts successes.',
    '160': '160 divides n by p (40/0.25) instead of multiplying.',
  },
  'item-034': {
    'C(5,2)(0.2)^2(0.8)^5': 'This uses five failures, but two successes in five trials leave only three, so the exponent on 0.8 must be 3.',
    'C(5,2)(0.2)^3(0.8)^2': 'This swaps the exponents and gives the probability of three successes and two failures rather than two successes.',
    'C(5,3)(0.2)^2(0.8)^3': 'The count of arrangements must match the two successes being counted, so C(5,2) is required rather than C(5,3).',
  },
  'item-035': {
    '24, the variance of X': '24 is the variance np(1 − p); the standard deviation is its square root, about 4.90.',
    'sqrt(40), or about 6.32': '40 is the expected number of failures, n(1 − p), not the variance, so its square root is not the standard deviation.',
    'sqrt(60), or about 7.75': '60 is the mean np; taking its square root does not give the standard deviation, which is the square root of np(1 − p).',
  },
  'item-036': {
    '−2': 'A negative z-score would place the score below the mean; 86 is above 70.',
    '0.5': '0.5 divides the standard deviation by the distance (8/16); the z-score is the distance divided by the standard deviation.',
    '16': '16 is the raw distance 86 − 70 before dividing by the standard deviation of 8.',
  },
  'item-037': {
    'The first quartile only': 'The first quartile is the 25th percentile, below the center.',
    'The standard deviation': 'The standard deviation measures spread; it is not a location in the distribution.',
    'The maximum': 'The maximum is the 100th percentile, not the middle.',
  },
  'item-038': {
    '0.16': '0.16 is the probability in one tail beyond one standard deviation, not the area between −1 and 1.',
    '0.32': '0.32 is the combined area in both tails outside one standard deviation, the complement of the answer.',
    '0.95': '0.95 is the area within two standard deviations, not one.',
  },
  'item-039': {
    'It says that every individual observation in the population is normally distributed whatever the sample size happens to be.': 'The theorem describes the sampling distribution of the mean; individual observations keep the population’s shape.',
    'It makes the population standard deviation become exactly equal to zero once the sample size is large enough for the study.': 'The population standard deviation is a fixed feature of the population; the theorem changes nothing about it.',
    'It eliminates all of the sampling variability whenever the sample is large enough for the procedure to be applied here.': 'Sample means still vary; the theorem describes the shape of that variability, not its absence.',
  },
  'item-040': {
    'It proves that the population mean must be exactly 56 in this case.': 'A single sample mean is an estimate that varies from sample to sample; it cannot prove the parameter’s value.',
    'It is six standard deviations above the center of the distribution.': 'Six is the raw distance from 50; dividing by the standard deviation of 3 gives two standard deviations.',
    'It must therefore be the most likely sample mean in the distribution.': 'The most likely sample mean is near the center of 50; a value two standard deviations away is relatively unusual.',
  },
  'item-041': {
    'It has no sampling variability at all in repeated samples.': 'Unbiased estimators still vary from sample to sample; unbiasedness concerns where they are centered.',
    'It always equals the population parameter in every sample.': 'An estimator that always equaled the parameter would need no sampling; unbiased means correct on average, not every time.',
    'It has the smallest possible standard deviation of all.': 'Low variability is a separate property; an estimator can be unbiased and still highly variable.',
  },
  'item-042': {
    '0.0049': '0.0049 is off by a factor of ten; sqrt(0.24/100) = sqrt(0.0024) ≈ 0.049.',
    '0.24': '0.24 is p(1 − p) before dividing by n and taking the square root.',
    '0.40': '0.40 is the population proportion p itself, not the standard deviation of the sample proportion.',
  },
  'item-043': {
    'A one-sample t-interval for a mean': 'A t-interval estimates a population mean of a quantitative variable; the target here is a proportion.',
    'A chi-square test for independence only': 'A chi-square test assesses association between two categorical variables and produces no interval for a single proportion.',
    'A two-sample t-test': 'A two-sample t-test compares two population means; there is one sample and one proportion here.',
  },
  'item-044': {
    'The sample size must equal the population size.': 'That would be a census; the normal approximation depends on enough expected successes and failures, not on sampling everyone.',
    'The sample mean must be 0.': 'A proportion interval involves no sample mean, and a value of zero would mean no successes at all.',
    'The population must contain exactly two people.': 'Population size is not a condition; if anything the sample should be less than 10% of a much larger population.',
  },
  'item-045': {
    'There is a 95% probability that this fixed population proportion changes between 0.42 and 0.58.': 'The population proportion is a fixed number that does not move; the 95% describes how often the interval method captures it.',
    'Exactly 95% of individuals have the characteristic.': 'The interval estimates the proportion, which is somewhere near 0.42 to 0.58, not 0.95.',
    'The sample proportion has a 95% chance of being 0.50.': 'The sample proportion is already known (it is the interval’s center) and has no probability attached to it.',
  },
  'item-046': {
    'It becomes wider.': 'A larger sample reduces the standard error, and a smaller standard error shrinks the margin of error.',
    'Its center must move to zero.': 'The center is the sample estimate, which does not depend on sample size in any systematic way.',
    'It loses its connection to the population.': 'A larger random sample estimates the population more precisely; the connection gets stronger, not weaker.',
  },
  'item-047': {
    'H_a: p = 0.30': 'Equality belongs in the null hypothesis; the alternative expresses the claim of a difference.',
    'H_a: p < 0.30': 'The researcher suspects the proportion is greater than 0.30, so the alternative must point in that direction.',
    'H_a: p-hat > 0.30 for every sample': 'Hypotheses are statements about the population parameter p, not about sample statistics.',
  },
  'item-048': {
    'There is only a 3% chance that the null hypothesis is actually true for the whole population here.': 'A p-value is computed assuming the null is true; it does not give the probability that the null is true.',
    'There is a 97% chance that the alternative hypothesis is actually true for the whole population.': 'A p-value is not a probability about either hypothesis; 1 − p has no such meaning.',
    'The observed sample proportion is wrong by exactly 3 percentage points in this particular study.': 'The p-value measures how surprising the result would be under the null, not an error in the estimate.',
  },
  'item-049': {
    'Reject the null hypothesis.': 'Rejection requires the p-value to be at most alpha; 0.08 is larger than 0.05.',
    'Accept the null hypothesis as proven true.': 'A test can fail to find evidence against the null, but it never proves the null true.',
    'Increase the sample proportion by 0.03.': 'A test decision never involves altering the observed statistic.',
  },
  'item-050': {
    'Fails to reject a false null hypothesis.': 'Failing to detect a false null is a Type II error, the false negative.',
    'Rejects a false alternative hypothesis.': 'Tests make decisions about the null hypothesis, not about rejecting the alternative.',
    'Reports the sample size incorrectly.': 'A reporting mistake is not an inference error; Type I error is a specific wrong decision about the null.',
  },
  'item-051': {
    'Lowering the sample size': 'Smaller samples increase the standard error, making real effects harder to detect and lowering power.',
    'Replacing a random sample with a convenience sample': 'A convenience sample introduces bias and does not increase the test’s ability to detect a true effect.',
    'Removing the alternative hypothesis': 'Power is the probability of rejecting the null when a specific alternative is true; without an alternative there is no power to discuss.',
  },
  'item-052': {
    '0.05': '0.05 halves the difference; the mean of the difference is simply p1 − p2 = 0.10.',
    '0.90': '0.90 is the sum of the two proportions, not their difference.',
    '−0.10': 'The sign is reversed; p-hat1 − p-hat2 is centered at 0.50 − 0.40, which is positive.',
  },
  'item-053': {
    'A one-sample t-interval for a mean': 'A t-interval targets one population mean of a quantitative variable; here there are two groups and proportions.',
    'A one-proportion z-test only': 'A one-proportion procedure handles a single group and a test rather than an interval for a difference.',
    'A matched-pairs t-interval': 'Matched pairs require the same units measured twice on a quantitative variable; these are independent samples with categorical outcomes.',
  },
  'item-054': {
    'The first population proportion is definitely the larger of the two population proportions.': 'The interval includes negative values, so the first proportion could be smaller; nothing is definite.',
    'The second population proportion is definitely the larger of the two population proportions.': 'The interval includes positive values, so a larger first proportion also remains plausible.',
    'The two sample proportions in the study must be exactly equal to one another here.': 'The interval is centered at 0.04, so the sample proportions differ by 0.04; equality is about the populations, and even that is not established.',
  },
  'item-055': {
    'The larger sample proportion only': 'Using one group’s proportion ignores the other group; under the null the two are estimates of the same value and should be combined.',
    'The population proportion p1, which is known': 'Population proportions are unknown; if p1 were known there would be nothing to test.',
    'The difference p1 − p2 without estimation': 'The null sets the difference to zero, so it provides no proportion to plug into the standard error.',
  },
  'item-056': {
    'The null hypothesis has been proven false in every possible population of interest here.': 'A significant result provides evidence against the null for the populations sampled; it proves nothing universally.',
    'There is no difference between the two proportions because 0.01 is such a small value.': 'A small p-value is evidence against the null, which is the hypothesis of no difference, so this reverses the logic.',
    'The two sample sizes must have been exactly equal for this result to appear in the data.': 'Nothing about a p-value indicates the sample sizes; two-proportion tests do not require equal groups.',
  },
  'item-057': {
    'A one-proportion z-test': 'A one-proportion test addresses a single proportion, not a whole categorical distribution across three schools.',
    'A matched-pairs t-test': 'Matched pairs handle paired quantitative measurements; study location is categorical and the schools are separate groups.',
    'A chi-square test for a single variance': 'A test about one variance concerns a quantitative variable’s spread, not distributions of a categorical variable.',
  },
  'item-058': {
    'A two-proportion z-interval': 'A two-proportion interval compares one proportion across two groups; here the question is association between two variables, each with several categories.',
    'A one-sample t-test': 'A one-sample t-test concerns one quantitative mean, not two categorical variables.',
    'A randomized block experiment': 'That is an experimental design, not an inference procedure, and the school is observing existing preferences.',
  },
  'item-059': {
    '30': '30 is the row total minus the column total (80 − 50), which has no meaning as an expected count; the expected count is 80 × 50 / 200 = 20.',
    '80': '80 is the row total alone; the expected count for one cell must be smaller than its row total.',
    '130': '130 is the row total plus the column total, which has no meaning as an expected count.',
  },
  'item-060': {
    'Every one of the expected counts in the whole table is exactly zero.': 'Expected counts come from the totals and are positive; zeros would make the statistic undefined.',
    'The two variables must have a perfect causal relationship here.': 'A chi-square test detects association, not causation, and a small p-value does not mean the association is perfect.',
    'The sample must necessarily have been a full census of the population.': 'A p-value is only meaningful for a sample; a census would have no sampling variability to test against.',
  },
  'item-061': {
    '0.33': '0.33 divides the standard deviation by the sample size (12/36) instead of by its square root.',
    '12': '12 is the population standard deviation; the sample mean varies less than individual observations.',
    '72': '72 multiplies 12 by the square root of 36 instead of dividing.',
  },
  'item-062': {
    'n = 2 with no additional information': 'Two observations do almost nothing to reduce skewness in the sampling distribution of the mean.',
    'A sample of one observation': 'With n = 1 the sample mean is just one observation, so its distribution is exactly as skewed as the population.',
    'A sample size cannot affect the sampling distribution': 'Sample size is the main factor that makes the sampling distribution of the mean more nearly normal.',
  },
  'item-063': {
    'The data being analyzed are entirely categorical rather than quantitative in nature.': 'A confidence interval for a mean requires quantitative data; the t-distribution is about estimating sigma, not about data type.',
    'The population mean is always exactly zero in every one of the samples that could be drawn.': 'The population mean is unknown and is what the interval estimates; it has no fixed value.',
    'A t-distribution has no tails at all, and so it cannot be used for any interval here.': 't-distributions have heavier tails than the normal, which is exactly how they account for the extra uncertainty.',
  },
  'item-064': {
    'A one-proportion z-interval': 'Battery life is a quantitative measurement, not a yes-or-no category, so a proportion interval does not apply.',
    'A chi-square test for independence': 'A chi-square test examines association between categorical variables and produces no estimate of a mean.',
    'A two-proportion z-test': 'There is one sample and one quantitative variable; nothing involves two groups or proportions.',
  },
  'item-065': {
    'The two population means are equal.': 'Zero is not in the interval, so a zero difference is not plausible at this confidence level.',
    'Exactly 90% of individual differences are between 1.2 and 4.8.': 'The interval estimates the population mean difference, not the spread of individual differences.',
    'The sample means must differ by exactly 3.0 minutes in every sample.': 'The observed sample difference is about 3.0 for this sample only; other samples would give other values.',
  },
  'item-066': {
    'Increasing the confidence level': 'A higher confidence level uses a larger critical value, which widens the interval.',
    'Increasing the sample standard deviation': 'More variability increases the standard error and therefore the margin of error.',
    'Removing the randomization condition': 'Dropping a condition affects validity, not width; a non-random sample gives a biased interval, not a narrower one.',
  },
  'item-067': {
    'A two-proportion z procedure': 'Times are quantitative and each runner contributes two measurements; there are no proportions or independent groups.',
    'A chi-square test for homogeneity': 'Chi-square procedures compare categorical distributions; running times are quantitative.',
    'A one-sample z procedure for a known sigma': 'The population standard deviation of the differences is unknown, and pairing calls for a t procedure on the differences.',
  },
  'item-068': {
    'The two original variables must both be categorical rather than numeric.': 'Paired t procedures require quantitative measurements so that differences can be computed.',
    'The population standard deviation must always be known exactly in advance.': 'The t procedure exists precisely because the population standard deviation is unknown.',
    'Every one of the paired differences must be exactly equal to zero here.': 'If every difference were zero there would be no variability and no need for inference; the condition is about shape, not values.',
  },
  'item-069': {
    'H_a: x-bar < 500 for every sample': 'Hypotheses concern the population mean mu, not the sample mean.',
    'H_a: mu = 500': 'Equality is the null hypothesis; the alternative states the suspected departure.',
    'H_a: mu > 500': 'The researcher suspects underfilling, so the alternative must point below 500.',
  },
  'item-070': {
    'The probability that the population mean mu is exactly equal to 0.02 here.': 'A p-value is not a probability about the parameter’s value; 0.02 is the chance of such a large t under the null.',
    'The chance that the observed sample mean turns out to be exactly 2.4 again.': '2.4 is the test statistic, not the sample mean, and the p-value concerns results at least that extreme.',
    'The probability that the alternative hypothesis is actually true in the population.': 'A p-value is computed assuming the null; it never gives the probability of either hypothesis.',
  },
  'item-071': {
    'Reject the null hypothesis at the 1% significance level.': 'Rejection requires p at most 0.01; a p-value of 0.02 is above that threshold.',
    'Accept the null hypothesis as having been proven true.': 'Failing to reject is not proof; the test simply lacks strong enough evidence against the null.',
    'The p-value must be recalculated so that it becomes 0.99.': 'The p-value is what it is; no rule converts it to its complement.',
  },
  'item-072': {
    '4': 'The sign is reversed; x-bar1 − x-bar2 is centered at 10 − 14, which is negative.',
    '10': '10 is the first population mean alone, not the difference.',
    '24': '24 is the sum of the two means; the statistic is a difference.',
  },
  'item-073': {
    'It must become zero.': 'The standard error shrinks with larger samples but stays positive as long as the populations vary.',
    'It generally increases without bound.': 'Sample sizes appear in the denominators, so larger samples reduce the standard error.',
    'It becomes equal to the population mean.': 'A standard error measures variability and has no relationship to the value of the population mean.',
  },
  'item-074': {
    'A one-proportion z-interval': 'Proportions summarize categorical data for one group; the target here is a difference in means between two groups.',
    'A matched-pairs procedure for the same individuals': 'Matched pairs apply when each unit is measured twice; independent samples involve different individuals.',
    'A chi-square test for independence': 'A chi-square test addresses association between categorical variables and estimates no mean difference.',
  },
  'item-075': {
    'The first population mean is definitely the smaller of the two means.': 'The interval extends above zero, so a larger first mean is also plausible; nothing is definite.',
    'The second population mean is definitely the smaller of the two means.': 'The interval extends below zero, so a smaller first mean remains plausible too.',
    'The two sample means must be exactly equal to one another here.': 'The interval is centered at −0.85, so the sample means differ; the question is about the populations.',
  },
  'item-076': {
    'Two independent random samples of different people are compared.': 'Different people in each group means there is no pairing, so a two-sample t-test is the right tool.',
    'Two categorical variables from one population are compared.': 'Categorical variables call for a chi-square procedure, not any t-test.',
    'A single proportion is compared with a target value.': 'That is a one-proportion z-test; no means or pairs are involved.',
  },
  'item-077': {
    'Each sample contains every member of its population.': 'Sampling everyone is a census and removes the sampling variability the procedure models; the condition asks for small samples relative to the population.',
    'The two sample means must be equal.': 'Equal sample means are not a condition; they would simply produce a test statistic of zero.',
    'The response variable must be categorical.': 't procedures require a quantitative response so means can be computed.',
  },
  'item-078': {
    'Fail to reject the null hypothesis because 0.004 is greater than the 0.001 cutoff here.': 'The comparison is with alpha, 0.01, not 0.001; 0.004 is below alpha, so the null is rejected.',
    'Accept the null hypothesis as having been proven true by this one particular sample.': 'The p-value is small, which is evidence against the null, and a test never proves the null anyway.',
    'Conclude that every individual in group 1 exceeds every individual in group 2 here.': 'The test concerns population means; individual values in the two groups can and do overlap.',
  },
  'item-079': {
    'It becomes narrower.': 'Higher confidence needs a larger critical value, so the interval widens.',
    'Its center must become zero.': 'The center is the sample estimate and does not depend on the confidence level.',
    'It changes from a mean interval to a proportion interval.': 'The confidence level does not change the parameter being estimated.',
  },
  'item-080': {
    'The null value is rejected only when it falls inside the confidence interval.': 'Values inside the interval are plausible, so the null is not rejected when it lies there.',
    'The interval must contain every individual observation in the whole sample.': 'A confidence interval estimates a parameter; it says nothing about containing individual data values.',
    'The test and the interval always use two different population parameters.': 'The matched test and interval concern the same parameter, which is why their conclusions agree.',
  },
};
