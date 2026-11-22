'use strict';

// Enriched distractor rationales for AP Statistics foundation pilot (slice 1: items 001-084).

module.exports = {
  'ap-statistics-foundation-pilot-item-001': {
    'What is the name of the school mascot chosen for this year?':
      'Naming the school mascot asks for a single fixed fact with one deterministic answer, whereas a valid statistical investigative question anticipates variability across a group of individuals.',
  },
  'ap-statistics-foundation-pilot-item-002': {
    'Whether the participant has a phone':
      'Recording whether someone owns a phone yields a binary yes-or-no label rather than a numerical measurement with units, so it is a categorical variable instead of a quantitative one.',
  },
  'ap-statistics-foundation-pilot-item-003': {
    '0.65':
      '0.65 is the complement 1 − 0.35, which gives the proportion of surveyed students who did not pick the later lunch period rather than the 84 out of 240 who actually chose it.',
  },
  'ap-statistics-foundation-pilot-item-004': {
    'A histogram':
      'Histograms group a quantitative variable into contiguous numerical intervals on a scaled axis, whereas student transportation methods are distinct categories that belong on a bar chart.',
    'A boxplot':
      'Boxplots summarize a quantitative distribution using ordered quartiles, median, and extremes, which cannot be computed for unordered categorical labels like transportation modes.',
  },
  'ap-statistics-foundation-pilot-item-005': {
    'Bimodal and skewed left':
      'The commute-time histogram shows a single prominent peak rather than two separate modes, and its stretched tail of unusually long times extends to the right, indicating right skewness.',
  },
  'ap-statistics-foundation-pilot-item-006': {
    'The mean':
      'Because computing the arithmetic mean sums every observation in the data set, a single unusually large outlier pulls the average noticeably upward instead of leaving it steady.',
    'The range':
      'The range equals the maximum value minus the minimum value, so adding one unusually large observation stretches the maximum directly and inflates the entire spread measure.',
  },
  'ap-statistics-foundation-pilot-item-007': {
    '12':
      '12 is only the raw deviation above the mean (64 − 52); converting that difference to a standardized z-score requires dividing by the standard deviation of 6 to obtain 2.',
  },
  'ap-statistics-foundation-pilot-item-008': {
    '5':
      '5 equals Q1 minus the minimum (9 − 4), which gives the span of the lower whisker in the bottom quarter rather than the spread of the central 50% between Q1 and Q3.',
    '14':
      '14 subtracts the minimum from the third quartile (18 − 4), combining the lowest three quarters instead of isolating the interquartile range by subtracting Q1 from Q3.',
    '23':
      '23 equals the overall range from maximum to minimum (27 − 4), measuring total spread across every observation rather than the interquartile range spanning the middle half.',
  },
  'ap-statistics-foundation-pilot-item-009': {
    'Class A has more of its scores below the median.':
      'By definition roughly half of the scores in any class fall below its median; a smaller interquartile range reflects tighter clustering in the middle 50%, not a higher share below the median.',
  },
  'ap-statistics-foundation-pilot-item-010': {
    'It ensures that the study will end up with a much larger random sample of people.':
      'Altering a survey prompt after inspecting responses neither increases the number of participants nor makes their selection random; sample size and sampling design are set separately.',
    'It turns an observational study into a fully randomized experiment instead.':
      'Conducting a randomized experiment requires actively imposing treatments through random assignment to subjects, whereas revising survey wording after seeing data remains observational.',
    'It eliminates all of the response bias from every one of the survey responses given.':
      'Adjusting question phrasing to pursue a desired pattern introduces wording and confirmation bias into responses rather than removing systematic measurement error from the survey.',
  },
  'ap-statistics-foundation-pilot-item-012': {
    'A convenience sample':
      'Although whole neighborhoods are surveyed together, those three neighborhoods were chosen through random selection rather than picked simply because they were nearby or easy to reach.',
    'A census of the city':
      'A true census attempts to gather data from every household across the entire city, whereas this design surveys only the households located inside three randomly chosen neighborhoods.',
  },
  'ap-statistics-foundation-pilot-item-013': {
    'Placebo bias':
      'Placebo effects arise in experiments when participants respond to an inactive treatment, whereas an open online poll imposes no treatment and suffers instead from self-selected respondents.',
  },
  'ap-statistics-foundation-pilot-item-014': {
    'Type I error':
      'A Type I error is a hypothesis-testing mistake of rejecting a true null hypothesis, whereas excluding non-English speakers from a survey creates a sampling-frame coverage flaw.',
  },
  'ap-statistics-foundation-pilot-item-015': {
    'It guarantees that every participant receives the preferred treatment.':
      'Random assignment uses a chance mechanism so participants cannot choose their group, preventing preference from confounding results while roughly balancing uncontrolled variables.',
    'It allows the researcher to generalize to every population.':
      'Broadening conclusions to a larger population requires random sampling from that target population, whereas random assignment to treatments supports causal inference among study subjects.',
  },
  'ap-statistics-foundation-pilot-item-018': {
    'The sample statistic is exactly equal to the population parameter itself.':
      'Even a well-chosen random sample introduces sampling variability, so the sample mean estimates the true population parameter with a margin of error rather than matching it exactly.',
  },
  'ap-statistics-foundation-pilot-item-019': {
    'The minimum of the data':
      'Adding a constant to every observation shifts all position summaries upward by that same constant, so the smallest value moves directly alongside the mean and median.',
    'The maximum of the data':
      'Because every data point receives the same added constant, the largest observation shifts by that exact amount too; only measures of spread such as IQR and SD remain constant.',
  },
  'ap-statistics-foundation-pilot-item-020': {
    '6':
      '6 results from dividing 18 by 3 instead of multiplying; scaling every observation in a data set by a constant factor multiplies the mean by that same factor to give 54.',
    '18':
      'Leaving the mean unchanged at 18 would apply only if every value were multiplied by 1 or shifted by 0, whereas tripling every observation also triples the mean to 54.',
    '21':
      '21 adds 3 to the original mean of 18 as if a constant had been added to each value, whereas multiplying every observation by 3 scales the mean multiplicatively to 54.',
  },
  'ap-statistics-foundation-pilot-item-021': {
    'The grand total of the entire two-way table':
      'The grand total collapses the entire table into one overall participant count, hiding how device ownership rates vary from one grade level to another.',
    'The sample mean of all the device categories':
      'Device ownership categories are qualitative labels without numerical magnitudes, so computing an arithmetic mean across categories is statistically meaningless.',
  },
  'ap-statistics-foundation-pilot-item-022': {
    '0.18':
      '0.18 divides the 18 late bikers by 100 as though the count were already a percentage, whereas the conditional proportion must divide by the 60 biking commuters to get 0.30.',
    '3.33':
      '3.33 inverts the ratio by dividing 60 bikers by 18 late arrivals; a valid conditional proportion puts the subset count in the numerator and can never exceed 1.',
  },
  'ap-statistics-foundation-pilot-item-023': {
    '0.0023':
      '0.0023 misplaces the decimal point by a factor of ten, as though 46 successes occurred in 20,000 simulated hands rather than dividing 46 by the 2,000 trials to get 0.023.',
    '0.046':
      '0.046 divides 46 by 1,000 instead of 2,000, doubling the empirical probability estimate; using all 2,000 simulated hands yields 46/2,000 = 0.023.',
    '0.23':
      '0.23 corresponds to 46 successes out of only 200 hands, overstating the empirical probability by ten times compared with dividing 46 by the full 2,000 repetitions.',
  },
  'ap-statistics-foundation-pilot-item-024': {
    '0.62':
      '0.62 is the probability of event A occurring rather than its complement; the probability that A does not occur is found by subtracting 0.62 from 1 to obtain 0.38.',
    '1.62':
      '1.62 adds 0.62 to 1 instead of subtracting it from 1, which violates both the complement rule and the axiom that every probability must lie between 0 and 1.',
    '0.06':
      '0.06 does not follow from the complement rule for a single event; because P(A) + P(not A) = 1, subtracting 0.62 from 1 gives exactly 0.38.',
  },
  'ap-statistics-foundation-pilot-item-025': {
    'P(A) = P(B)':
      'Being mutually exclusive means two events share no common outcomes so their intersection has probability zero, whereas their individual probabilities can differ completely.',
  },
  'ap-statistics-foundation-pilot-item-027': {
    '0.10':
      '0.10 subtracts the two event probabilities (0.5 − 0.4) instead of applying the multiplication rule for independent events, which requires multiplying 0.4 by 0.5 to obtain 0.20.',
    '0.45':
      '0.45 averages the two marginal probabilities rather than multiplying them; when events A and B are independent, their joint probability equals the product P(A) × P(B) = 0.20.',
    '0.90':
      '0.90 adds 0.4 and 0.5 together, which would even exceed the union probability here; finding P(A and B) for independent events requires multiplying rather than adding.',
  },
  'ap-statistics-foundation-pilot-item-028': {
    '0.20':
      '0.20 is the intersection probability P(A and B) where both events happen together, whereas the union probability combines both events and subtracts that overlap once to get 0.70.',
    '0.50':
      '0.50 accounts only for event B by itself; the general addition rule requires adding P(A) and P(B) and then subtracting the double-counted intersection 0.20 to obtain 0.70.',
  },
  'ap-statistics-foundation-pilot-item-029': {
    'All outcomes have the same probability.':
      'Assigning identical probabilities to every outcome defines a special discrete uniform model, whereas any valid discrete probability distribution may weight outcomes unequally.',
    'The mean must equal 0.':
      'A discrete random variable can have any positive, negative, or zero expected value; validity depends solely on every probability lying between 0 and 1 and totaling 1.',
    'There must be exactly four possible outcomes.':
      'A valid discrete probability model can contain any finite or countably infinite list of outcomes, not strictly four, provided all probabilities are nonnegative and sum to 1.',
  },
  'ap-statistics-foundation-pilot-item-030': {
    '1.0':
      '1.0 takes the unweighted arithmetic average of the three values 0, 1, and 2, overlooking that the larger outcome of 2 has a higher probability (0.3) than 0 (0.2).',
    '1.5':
      '1.5 does not properly weight each outcome by its probability; computing the expected value via 0(0.2) + 1(0.5) + 2(0.3) produces 0 + 0.5 + 0.6 = 1.1.',
  },
  'ap-statistics-foundation-pilot-item-031': {
    'Every single player will receive exactly $2.40 on each play.':
      'Expected value describes a long-run mean across many repeated plays rather than a guaranteed constant payout on every individual turn, which can vary widely.',
    'The game must pay exactly $2.40 on its single most common outcome.':
      'An expected payout is a probability-weighted mean that need not match the modal outcome or even appear among the possible payouts on a single play of the game.',
    'The probability of winning on any one play is exactly 2.40.':
      'Probabilities are bounded between 0 and 1 and cannot equal 2.40; the figure $2.40 represents a long-run average monetary payout per play rather than a win probability.',
  },
  'ap-statistics-foundation-pilot-item-032': {
    'The total amount of rainfall that is recorded tomorrow at the local weather station in the city':
      'Measuring total rainfall produces a continuous quantitative amount rather than a discrete count of binary successes across a fixed number of independent trials with constant probability.',
  },
  'ap-statistics-foundation-pilot-item-033': {
    '0.25':
      '0.25 is only the single-trial success probability p rather than the expected number of successes; multiplying n = 40 trials by p = 0.25 gives a binomial mean of 10.',
    '30':
      '30 computes n(1 − p) = 40(0.75), which represents the expected count of failures instead of the expected count of successes np = 10 for the binomial variable X.',
    '160':
      '160 divides the number of trials by the success probability (40 / 0.25) instead of multiplying; an expected count cannot exceed n = 40 trials, and np equals 10.',
  },
  'ap-statistics-foundation-pilot-item-035': {
    '24, the variance of X':
      '24 computes the binomial variance np(1 − p) = 100(0.60)(0.40) without taking the square root; the standard deviation of X is sqrt(24), which is approximately 4.90.',
  },
  'ap-statistics-foundation-pilot-item-036': {
    '−2':
      'A negative z-score indicates an observation lying below the distribution mean, whereas a test score of 86 sits two standard deviations above the mean of 70, giving +2.',
    '16':
      '16 is the unstandardized difference 86 − 70 in raw score points; finding the z-score requires dividing that deviation by the standard deviation of 8 to yield 2.',
  },
  'ap-statistics-foundation-pilot-item-037': {
    'The first quartile only':
      'The first quartile marks the 25th percentile with only one-quarter of the distribution below it, whereas the 50th percentile lies at the symmetric center of a normal curve.',
    'The standard deviation':
      'The standard deviation quantifies how widely values spread around the center rather than naming a score location or percentile rank inside a normal distribution.',
    'The maximum':
      'A maximum represents the top extreme of a data set rather than its midpoint, and an idealized normal curve extends indefinitely without a finite maximum at the 50th percentile.',
  },
  'ap-statistics-foundation-pilot-item-038': {
    '0.16':
      '0.16 approximates the area in a single tail beyond one standard deviation from the mean, whereas the empirical rule places roughly 0.68 of the area between −1 and 1.',
    '0.95':
      '0.95 approximates the central probability within two standard deviations of the mean (−2 < Z < 2), not the narrower interval within one standard deviation, which holds about 0.68.',
  },
  'ap-statistics-foundation-pilot-item-039': {
    'It says that every individual observation in the population is normally distributed whatever the sample size happens to be.':
      'The Central Limit Theorem governs the distribution of sample means across repeated samples, while individual population values retain whatever skewed or non-normal shape they originally have.',
    'It eliminates all of the sampling variability whenever the sample is large enough for the procedure to be applied here.':
      'Increasing sample size reduces standard error and makes the sampling distribution more nearly normal, but sample means still fluctuate from sample to sample rather than losing all variability.',
  },
  'ap-statistics-foundation-pilot-item-041': {
    'It has no sampling variability at all in repeated samples.':
      'Unbiasedness refers strictly to accuracy of the center of an estimator’s sampling distribution, not zero spread; unbiased statistics still vary across different random samples.',
    'It has the smallest possible standard deviation of all.':
      'Small spread reflects precision or low variability rather than lack of bias; an estimator can center exactly on the true parameter while still exhibiting a relatively large standard deviation.',
  },
  'ap-statistics-foundation-pilot-item-042': {
    '0.0049':
      '0.0049 shifts the decimal place by a factor of ten; evaluating sqrt(0.40 × 0.60 / 100) gives sqrt(0.0024), which rounds to 0.049 rather than 0.0049.',
    '0.24':
      '0.24 stops after multiplying p(1 − p) = 0.40 × 0.60, omitting both the division by n = 100 and the square root required for the standard deviation of p-hat.',
    '0.40':
      '0.40 is the population proportion p and thus the mean of the sampling distribution of p-hat, not its standard deviation, which equals sqrt(p(1 − p)/n) ≈ 0.049.',
  },
  'ap-statistics-foundation-pilot-item-043': {
    'A two-sample t-test':
      'A two-sample t-test evaluates a hypothesis about the difference between two quantitative population means, whereas estimating a single population share calls for a z-interval for one proportion.',
  },
  'ap-statistics-foundation-pilot-item-044': {
    'The sample mean must be 0.':
      'A one-proportion z-interval deals with categorical counts rather than a quantitative sample mean, and the large-counts normality check instead requires at least 10 successes and 10 failures.',
  },
  'ap-statistics-foundation-pilot-item-045': {
    'Exactly 95% of individuals have the characteristic.':
      'The 95% figure refers to our confidence in the interval method, not the proportion possessing the trait, which the interval estimates to fall plausibly between 0.42 and 0.58.',
  },
  'ap-statistics-foundation-pilot-item-046': {
    'Its center must move to zero.':
      'A confidence interval is centered at the observed sample statistic, and taking a larger sample improves precision around the parameter rather than pulling the center toward zero.',
    'It loses its connection to the population.':
      'Increasing sample size shrinks the standard error and narrows the margin of error, yielding a tighter and more informative estimate of the population parameter rather than a weaker one.',
  },
  'ap-statistics-foundation-pilot-item-047': {
    'H_a: p = 0.30':
      'A statement of equality belongs in the null hypothesis H_0, whereas the alternative hypothesis must use a strict inequality—here p > 0.30—to express the researcher’s directional claim.',
    'H_a: p-hat > 0.30 for every sample':
      'Statistical hypotheses always make claims about an unknown population parameter such as p, never about a sample statistic like p-hat that varies from sample to sample.',
  },
  'ap-statistics-foundation-pilot-item-048': {
    'There is a 97% chance that the alternative hypothesis is actually true for the whole population.':
      'A p-value measures the probability of data as extreme as observed assuming H_0 holds, never the probability that either hypothesis is true, so 1 − 0.03 is not the chance H_a is true.',
  },
  'ap-statistics-foundation-pilot-item-049': {
    'Reject the null hypothesis.':
      'Rejecting H_0 requires the p-value to be less than or equal to the significance level alpha; because 0.08 exceeds 0.05, the sample does not provide convincing evidence against H_0.',
    'Accept the null hypothesis as proven true.':
      'Significance tests can lack sufficient evidence to reject a null model, yet failing to reject H_0 never proves that the null value is literally true in the population.',
    'Increase the sample proportion by 0.03.':
      'Hypothesis-test decisions evaluate the observed data against alpha without altering the recorded statistic; changing the sample proportion to force a smaller p-value would invalidate inference.',
  },
  'ap-statistics-foundation-pilot-item-050': {
    'Fails to reject a false null hypothesis.':
      'Missing a real effect by failing to reject a false null hypothesis defines a Type II error (false negative), whereas a Type I error is a false positive against a true null.',
    'Rejects a false alternative hypothesis.':
      'In classical significance testing, decisions are framed solely as rejecting or failing to reject the null hypothesis, and rejecting a false claim would not constitute an error anyway.',
  },
  'ap-statistics-foundation-pilot-item-051': {
    'Lowering the sample size':
      'Reducing the number of observations inflates the standard error of the test statistic, making genuine departures from the null harder to detect and decreasing statistical power.',
  },
  'ap-statistics-foundation-pilot-item-052': {
    '0.05':
      '0.05 cuts the true difference in half without justification; the expected value of the difference between two independent sample proportions equals p1 − p2 = 0.50 − 0.40 = 0.10.',
    '0.90':
      '0.90 sums the two population proportions (0.50 + 0.40) instead of subtracting them; because the statistic is p-hat1 − p-hat2, its sampling distribution centers at p1 − p2 = 0.10.',
    '−0.10':
      'The subtraction order is reversed here (0.40 − 0.50); since the statistic is defined as p-hat1 − p-hat2, its mean is centered at 0.50 − 0.40, which equals positive 0.10.',
  },
  'ap-statistics-foundation-pilot-item-054': {
    'The first population proportion is definitely the larger of the two population proportions.':
      'Because the interval (−0.04, 0.12) spans negative values as well as zero, p1 could plausibly be smaller than or equal to p2, ruling out any definite claim that p1 is larger.',
    'The second population proportion is definitely the larger of the two population proportions.':
      'Because the interval (−0.04, 0.12) extends well into positive values and contains zero, p1 could plausibly exceed or equal p2, so neither proportion is established as larger.',
  },
  'ap-statistics-foundation-pilot-item-055': {
    'The population proportion p1, which is known':
      'In a hypothesis test the true population proportions are unknown parameters rather than given constants, so the standard error under H_0: p1 = p2 must use a pooled sample estimate.',
    'The difference p1 − p2 without estimation':
      'The null hypothesis sets the difference p1 − p2 equal to zero, which supplies no common proportion p to substitute into the binomial variance terms of the standard error formula.',
  },
  'ap-statistics-foundation-pilot-item-056': {
    'The two sample sizes must have been exactly equal for this result to appear in the data.':
      'A p-value reflects the strength of evidence against the null hypothesis rather than group balance, and a valid two-proportion z-test never requires equal sample sizes.',
  },
  'ap-statistics-foundation-pilot-item-057': {
    'A one-proportion z-test':
      'A one-proportion z-test compares a single binary proportion against a hypothesized constant, whereas comparing a multicategory distribution across three separate schools requires a chi-square homogeneity test.',
  },
  'ap-statistics-foundation-pilot-item-058': {
    'A one-sample t-test':
      'A one-sample t-test tests a hypothesis about one quantitative population mean, whereas checking whether two categorical variables from a single population are related requires a chi-square test.',
  },
  'ap-statistics-foundation-pilot-item-059': {
    '80':
      '80 is the entire row total rather than one cell’s expected count; multiplying the row total by the column total and dividing by the grand total gives (80 × 50)/200 = 20.',
    '130':
      '130 adds the row total and column total (80 + 50), which violates the independence formula; an expected cell count is computed as (row total × column total) / grand total = 20.',
  },
  'ap-statistics-foundation-pilot-item-060': {
    'Every one of the expected counts in the whole table is exactly zero.':
      'Expected cell counts come from positive marginal totals and must be strictly positive (and typically at least 5) for valid chi-square inference; zero denominators would make the statistic undefined.',
  },
  'ap-statistics-foundation-pilot-item-061': {
    '0.33':
      '0.33 divides the population standard deviation by n = 36 instead of sqrt(36); the formula sigma / sqrt(n) gives 12 / 6 = 2 rather than 12 / 36.',
    '12':
      '12 is the standard deviation of individual observations in the population, whereas sample averages of size 36 vary less by a factor of sqrt(36), yielding 12 / 6 = 2.',
    '72':
      '72 multiplies the population standard deviation of 12 by sqrt(36) instead of dividing by it; averaging 36 observations shrinks variability to 12 / 6 = 2 rather than enlarging it.',
  },
  'ap-statistics-foundation-pilot-item-062': {
    'n = 2 with no additional information':
      'A sample of just two observations leaves the sampling distribution of the mean heavily skewed like the parent population, whereas a large sample invokes the Central Limit Theorem.',
    'A sample size cannot affect the sampling distribution':
      'Sample size directly shapes the sampling distribution of x-bar by reducing its spread by sqrt(n) and making its shape increasingly normal as n grows larger.',
  },
  'ap-statistics-foundation-pilot-item-063': {
    'The population mean stays fixed at zero in every one of the samples that could be drawn.':
      'The population mean is an unknown target parameter that can take any real value; we use a t-distribution specifically because sigma is unknown and replaced by the sample standard deviation s.',
  },
  'ap-statistics-foundation-pilot-item-064': {
    'A chi-square test for independence':
      'A chi-square independence test checks association between two categorical variables rather than producing a confidence interval for the mean of a single quantitative measurement like battery life.',
    'A two-proportion z-test':
      'Battery life is a quantitative variable measured on one random sample, so procedures comparing two categorical proportions do not match either the data type or the estimation goal.',
  },
  'ap-statistics-foundation-pilot-item-065': {
    'The two population means are equal.':
      'Because 0 lies completely outside the interval (1.2, 4.8), a zero difference is not a plausible value at the 90% confidence level, indicating that the two means differ.',
    'Exactly 90% of individual differences are between 1.2 and 4.8.':
      'A confidence interval estimates a plausible range for the population mean difference, not the percentage of individual observations or paired differences that fall inside those endpoints.',
  },
  'ap-statistics-foundation-pilot-item-066': {
    'Increasing the confidence level':
      'Raising the confidence level demands a larger critical value t* to capture the parameter more often, which increases the margin of error and widens the confidence interval.',
    'Increasing the sample standard deviation':
      'A larger sample standard deviation s inflates the standard error s / sqrt(n), enlarging the margin of error and making the resulting confidence interval wider rather than narrower.',
  },
  'ap-statistics-foundation-pilot-item-067': {
    'A chi-square test for homogeneity':
      'Chi-square homogeneity tests compare distributions of a categorical variable across populations, whereas before-and-after running times on the same runners are paired quantitative measurements.',
  },
  'ap-statistics-foundation-pilot-item-068': {
    'The two original variables must both be categorical rather than numeric.':
      'Matched-pairs t procedures calculate a numerical difference for each subject and average those differences, which is possible only when the before-and-after measurements are quantitative.',
    'The population standard deviation must always be known exactly in advance.':
      'Using a t-distribution instead of a z-distribution is needed precisely because the population standard deviation of the differences is unknown and must be estimated from the sample.',
  },
  'ap-statistics-foundation-pilot-item-069': {
    'H_a: x-bar < 500 for every sample':
      'Hypotheses are always written in terms of the unknown population mean mu rather than the sample statistic x-bar, which is observed directly from the collected data.',
    'H_a: mu = 500':
      'Equality specifies the null hypothesis H_0: mu = 500; the alternative hypothesis must state the directional claim being tested, which here is a mean strictly below 500 mL.',
    'H_a: mu > 500':
      'Using a greater-than sign tests whether containers are overfilled, whereas the researcher wants to test whether the true mean fill volume falls below 500 mL.',
  },
  'ap-statistics-foundation-pilot-item-070': {
    'The probability that the alternative hypothesis is actually true in the population.':
      'A p-value is a conditional probability about the test statistic calculated assuming the null hypothesis is true, and it never gives the probability that either hypothesis holds.',
  },
  'ap-statistics-foundation-pilot-item-071': {
    'Reject the null hypothesis at the 1% significance level.':
      'Rejecting H_0 at alpha = 0.01 requires a p-value of 0.01 or smaller; because 0.02 exceeds 0.01, the evidence is not strong enough to reject at the 1% level.',
    'Accept the null hypothesis as having been proven true.':
      'Failing to reject H_0 at alpha = 0.01 means the data do not meet that strict threshold for evidence against the null, not that the null hypothesis has been proven true.',
    'The p-value must be recalculated so that it becomes 0.99.':
      'The p-value is determined directly by the observed test statistic and null distribution; no statistical rule replaces an observed p-value with 1 − alpha.',
  },
  'ap-statistics-foundation-pilot-item-072': {
    '4':
      '4 reverses the subtraction order (14 − 10); because the difference is defined as x-bar1 − x-bar2, its sampling distribution centers at mu1 − mu2 = 10 − 14 = −4.',
    '10':
      '10 is only the first population mean mu1 by itself, ignoring the second population mean of 14 that must be subtracted to find the center of x-bar1 − x-bar2.',
    '24':
      '24 adds the two population means together (10 + 14) instead of subtracting them; the expected value of a difference in sample means equals the difference of population means, −4.',
  },
  'ap-statistics-foundation-pilot-item-073': {
    'It must become zero.':
      'Although enlarging both samples shrinks the standard error of x-bar1 − x-bar2, the expression sqrt(s1^2/n1 + s2^2/n2) remains strictly positive whenever the samples exhibit variability.',
    'It generally increases without bound.':
      'Because n1 and n2 sit in the denominators of the variance terms s1^2/n1 + s2^2/n2, increasing both sample sizes reduces the standard error rather than making it grow.',
    'It becomes equal to the population mean.':
      'A standard error quantifies the typical sampling variability of a statistic across repeated samples and has no tendency to equal the value of any population mean.',
  },
  'ap-statistics-foundation-pilot-item-074': {
    'A matched-pairs procedure for the same individuals':
      'Matched-pairs inference requires linked observations such as repeated measures on the same subjects, whereas comparing two independent groups calls for a two-sample t-interval.',
    'A chi-square test for independence':
      'A chi-square test evaluates whether two categorical variables are associated in a contingency table rather than constructing an interval estimate for the gap between two quantitative means.',
  },
  'ap-statistics-foundation-pilot-item-075': {
    'The first population mean is definitely the smaller of the two means.':
      'Because the interval (−3.1, 1.4) extends above zero as well as below it, mu1 could plausibly be greater than or equal to mu2, so no definite ordering is supported.',
    'The second population mean is definitely the smaller of the two means.':
      'Because the interval (−3.1, 1.4) includes negative values and zero, mu1 could plausibly be smaller than or equal to mu2, leaving no convincing evidence of a difference.',
  },
  'ap-statistics-foundation-pilot-item-076': {
    'Two independent random samples of different people are compared.':
      'Measuring unrelated individuals in two separate groups creates independent samples with no natural pairing, which calls for a two-sample t-test rather than a matched-pairs procedure.',
    'Two categorical variables from one population are compared.':
      'Investigating an association between two categorical variables recorded on one sample requires a chi-square test of independence rather than any t-test for quantitative means.',
    'A single proportion is compared with a target value.':
      'Testing whether one population proportion differs from a specified benchmark uses a one-proportion z-test rather than a matched-pairs t-test for quantitative differences.',
  },
  'ap-statistics-foundation-pilot-item-077': {
    'The two sample means must be equal.':
      'Nothing requires two samples to share the same average before running a t procedure; equal sample means would merely yield a test statistic of zero rather than ensuring independence.',
    'The response variable must be categorical.':
      'Two-sample t procedures compare averages of a quantitative response variable; categorical outcomes have proportions or counts instead of sample means and standard deviations.',
  },
  'ap-statistics-foundation-pilot-item-078': {
    'Fail to reject the null hypothesis because 0.004 is greater than the 0.001 cutoff here.':
      'The specified significance level is alpha = 0.01 rather than 0.001; since the p-value of 0.004 is smaller than 0.01, the correct decision is to reject H_0.',
    'Accept the null hypothesis as having been proven true by this one particular sample.':
      'A p-value of 0.004 is strong evidence against H_0 at alpha = 0.01, and even with a large p-value a significance test never proves a null hypothesis true.',
    'Conclude that every individual in group 1 exceeds every individual in group 2 here.':
      'A two-sample t-test makes an inference about the difference between population averages, whereas individual observations from the two populations can still overlap substantially.',
  },
  'ap-statistics-foundation-pilot-item-079': {
    'It becomes narrower.':
      'Raising confidence from 90% to 99% requires a larger critical value so the method captures the parameter more often, which increases the margin of error and widens the interval.',
    'Its center must become zero.':
      'Changing the confidence level alters only the critical multiplier in the margin of error; the point estimate at the center of the interval stays fixed at the observed sample statistic.',
    'It changes from a mean interval to a proportion interval.':
      'Adjusting the confidence level modifies only the width of the interval estimate and never changes which population parameter or data type is being analyzed.',
  },
  'ap-statistics-foundation-pilot-item-080': {
    'The null value is rejected strictly when it falls inside the confidence interval.':
      'Values inside a confidence interval are plausible estimates for the parameter given the data, so a two-sided test fails to reject H_0 whenever the null value lies inside the interval.',
    'The interval must contain every individual observation in the whole sample.':
      'A confidence interval gives plausible values for an unknown population parameter such as a mean or proportion, not a range designed to enclose every individual sample observation.',
    'The test and the interval routinely target two different population parameters.':
      'The duality between a two-sided test and a confidence interval at matched levels holds precisely because both procedures make inference about the exact same population parameter.',
  },
  'ap-statistics-foundation-pilot-item-081': {
    'Perfect causation':
      'A scatterplot can reveal the direction, form, and strength of an association, but establishing cause and effect requires a controlled experiment, and points merely close to a line are not perfect.',
  },
  'ap-statistics-foundation-pilot-item-082': {
    'A linear model applies strictly to categorical variables.':
      'Least-squares linear regression requires two quantitative variables measured on numerical scales; categorical variables cannot be summarized with a regression line at all.',
    'Clusters prove that the response variable caused the explanatory variable.':
      'Visual clustering in an observational scatterplot never proves causation in either direction; instead, it warns that distinct subgroups may follow different underlying patterns.',
  },
  'ap-statistics-foundation-pilot-item-083': {
    'A strong positive linear association between the two variables':
      'Although |r| = 0.82 indicates a strong straight-line relationship, the negative sign shows that larger values of one variable tend to pair with smaller values of the other.',
    'That 82% of all of the observations are negative numbers in value':
      'Correlation is a unitless measure of linear strength and direction between standardized variables, not a percentage of observations whose raw values happen to be negative.',
    'That the response variable causes the explanatory variable here':
      'A strong correlation magnitude like −0.82 describes how tightly points cluster along a downward line, yet correlation alone never establishes causation in either direction.',
  },
  'ap-statistics-foundation-pilot-item-084': {
    'The intercept units':
      'A regression y-intercept is expressed in the units of the response variable, so converting meters to centimeters multiplies the intercept by 100 and changes its units.',
    'The numerical values of the observations':
      'Converting every distance from meters to centimeters multiplies each recorded measurement by 100, changing the numerical data values while leaving standardized z-scores and r unchanged.',
  },
};
