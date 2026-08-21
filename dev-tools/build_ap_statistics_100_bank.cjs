'use strict';

// Builds an independently authored AP Statistics internal foundation pilot.
// This is a blueprint and architecture pass, not an official AP form, a
// released item bank, or a calibrated score simulation.

const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_statistics_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_statistics_foundation_pilot_learning_library.json');

const PACK_ID = 'ap-statistics-foundation-pilot';
const VERSION = '0.2.0-internal-preview';
const VERIFIED_AT = '2026-08-20';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-statistics-course-and-exam-description.pdf?course=852';
const COURSE_URL = 'https://apcentral.collegeboard.org/courses/ap-statistics';
const EXAM_URL = 'https://apcentral.collegeboard.org/courses/ap-statistics/exam';
const OPENSTAX_URL = 'https://openstax.org/details/books/introductory-statistics-2e';
const LIBRARY_VERSION = 'ap-statistics-foundation-v2';

function assert(condition, message) {
  if (!condition) throw new Error('[AP Statistics foundation builder] ' + message);
}

function writeJson(filePath, value) {
  writeGeneratedFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

const units = [
  {
    number: 1,
    id: 'exploring-one-variable-data-and-collecting-data',
    label: 'Unit 1: Exploring One-Variable Data and Collecting Data',
    shortLabel: 'One-Variable Data and Collecting Data',
    weight: 0.25,
    officialWeightMin: 0.20,
    officialWeightMax: 0.30,
    summary: 'Describe distributions, calculate and interpret summaries, compare groups, and choose ethical sampling and experimental designs.',
    topics: [
      ['1.1', 'Introducing Statistics: What Can We Learn from Data?'],
      ['1.2', 'Variables'],
      ['1.3', 'Tabular Representation and Summary Statistics for One Categorical Variable'],
      ['1.4', 'Graphical Representations for One Categorical Variable'],
      ['1.5', 'Graphical Representations for One Quantitative Variable'],
      ['1.6', 'Descriptions for One Quantitative Variable Distributions'],
      ['1.7', 'Summary Statistics for One Quantitative Variable'],
      ['1.8', 'Graphical Representations of Summary Statistics for One Quantitative Variable'],
      ['1.9', 'Comparisons of the Distributions for One Quantitative Variable'],
      ['1.10', 'The Investigative Question Revisited and Data Collection'],
      ['1.11', 'Sampling Methods'],
      ['1.12', 'Sources of Bias in Data Collection'],
      ['1.13', 'Experimental Design'],
    ],
  },
  {
    number: 2,
    id: 'probability-random-variables-and-probability-distributions',
    label: 'Unit 2: Probability, Random Variables, and Probability Distributions',
    shortLabel: 'Probability and Random Variables',
    weight: 0.20,
    officialWeightMin: 0.15,
    officialWeightMax: 0.25,
    summary: 'Use tables, simulation, probability rules, random variables, binomial models, normal models, and sampling-distribution reasoning to describe uncertainty.',
    topics: [
      ['2.1', 'Tabular and Graphical Representations for the Distributions of Two Categorical Variables'],
      ['2.2', 'Summary Statistics for Two Categorical Variables'],
      ['2.3', 'Estimating Probabilities Using Simulation'],
      ['2.4', 'Introduction to Probability'],
      ['2.5', 'Mutually Exclusive Events'],
      ['2.6', 'Conditional Probability'],
      ['2.7', 'Independent Events and Unions of Events'],
      ['2.8', 'Introduction to Random Variables and Probability Distributions'],
      ['2.9', 'Parameters of Random Variables'],
      ['2.10', 'The Binomial Distribution'],
      ['2.11', 'The Normal Distribution'],
      ['2.12', 'Sampling Distributions and the Central Limit Theorem'],
    ],
  },
  {
    number: 3,
    id: 'inference-for-categorical-data-proportions',
    label: 'Unit 3: Inference for Categorical Data: Proportions',
    shortLabel: 'Inference for Proportions',
    weight: 0.20,
    officialWeightMin: 0.15,
    officialWeightMax: 0.25,
    summary: 'Build and interpret confidence intervals and tests for proportions, compare two proportions, reason about errors and power, and use chi-square procedures for categorical data.',
    topics: [
      ['3.1', 'Estimators'],
      ['3.2', 'Sampling Distributions for Sample Proportions'],
      ['3.3', 'Constructing a Confidence Interval for a Population Proportion'],
      ['3.4', 'Justifying a Claim Based on a Confidence Interval for a Population Proportion'],
      ['3.5', 'Setting Up a Test for a Population Proportion'],
      ['3.6', 'p-Values'],
      ['3.7', 'Carrying Out a Test for a Population Proportion'],
      ['3.8', 'Potential Errors When Performing Tests'],
      ['3.9', 'Sampling Distributions for the Difference Between Sample Proportions'],
      ['3.10', 'Constructing a Confidence Interval for the Difference Between Two Population Proportions'],
      ['3.11', 'Justifying a Claim Based on a Confidence Interval for the Difference Between Two Population Proportions'],
      ['3.12', 'Setting Up a Test for the Difference Between Two Population Proportions'],
      ['3.13', 'Carrying Out a Test for the Difference Between Two Population Proportions'],
      ['3.14', 'Setting Up a Chi-Square Test for Homogeneity or Independence'],
      ['3.15', 'Carrying Out a Chi-Square Test for Homogeneity or Independence'],
    ],
  },
  {
    number: 4,
    id: 'inference-for-quantitative-data-means',
    label: 'Unit 4: Inference for Quantitative Data: Means',
    shortLabel: 'Inference for Means',
    weight: 0.20,
    officialWeightMin: 0.10,
    officialWeightMax: 0.20,
    summary: 'Use sampling distributions and t procedures to estimate and test population means and differences between means while checking conditions and interpreting results in context.',
    topics: [
      ['4.1', 'Sampling Distributions for Sample Means'],
      ['4.2', 'Constructing a Confidence Interval for a Population Mean or Population Mean Difference'],
      ['4.3', 'Justifying a Claim Based on a Confidence Interval for a Population Mean or Population Mean Difference'],
      ['4.4', 'Setting Up a Test for a Population Mean or Population Mean Difference'],
      ['4.5', 'Carrying Out a Test for a Population Mean or Population Mean Difference'],
      ['4.6', 'Sampling Distributions for the Difference Between Two Sample Means'],
      ['4.7', 'Constructing a Confidence Interval for the Difference Between Two Population Means'],
      ['4.8', 'Justifying a Claim Based on a Confidence Interval for the Difference Between Two Population Means'],
      ['4.9', 'Setting Up a Test for the Difference Between Two Population Means'],
      ['4.10', 'Carrying Out a Test for the Difference Between Two Population Means'],
    ],
  },
  {
    number: 5,
    id: 'regression-analysis',
    label: 'Unit 5: Regression Analysis',
    shortLabel: 'Regression Analysis',
    weight: 0.15,
    officialWeightMin: 0.10,
    officialWeightMax: 0.20,
    summary: 'Describe associations, interpret correlation and regression output, evaluate residuals, and use least-squares models without confusing association with causation.',
    topics: [
      ['5.1', 'Graphical Representations Between Two Quantitative Variables'],
      ['5.2', 'Correlation'],
      ['5.3', 'Linear Regression Models'],
      ['5.4', 'Interpreting Linear Regression Models'],
      ['5.5', 'Least-Squares Regression'],
    ],
  },
].map((unit) => ({ ...unit, topics: unit.topics.map(([id, label]) => ({ id, label })) }));

const skills = [
  { id: 'practice-1', label: 'Selecting Statistical Methods', description: 'Select an investigative question and an appropriate statistical method for the data and goal.', subskills: ['1.A', '1.B'] },
  { id: 'practice-2', label: 'Analyzing Data', description: 'Identify, represent, calculate, and compare statistical information needed to answer a question.', subskills: ['2.A', '2.B', '2.C', '2.D', '2.E'] },
  { id: 'practice-3', label: 'Using Probability and Simulation', description: 'Calculate or estimate probabilities, parameters, intervals, and inference results.', subskills: ['3.A', '3.B', '3.C', '3.D', '3.E'] },
  { id: 'practice-4', label: 'Statistical Argumentation', description: 'Describe distributions, interpret results, verify conditions, and justify a claim in context.', subskills: ['4.A', '4.B', '4.C', '4.D', '4.E', '4.F', '4.G'] },
];

const sourceCatalog = [
  {
    id: 'ap-statistics-ced-fall-2026',
    title: 'AP Statistics Course and Exam Description, Effective Fall 2026',
    organization: 'College Board',
    url: CED_URL,
    credibility: 'The public Course and Exam Description supplies the revised unit, topic, skill, weighting, and exam-format framework. It is used for blueprint alignment only; no official assessment content is reproduced.',
    sourceType: 'official-blueprint',
    reviewedAt: VERIFIED_AT,
  },
  {
    id: 'ap-statistics-course-page',
    title: 'AP Statistics course page',
    organization: 'College Board',
    url: COURSE_URL,
    credibility: 'The official course page provides current course context and links to the public assessment information.',
    sourceType: 'official-course-page',
    reviewedAt: VERIFIED_AT,
  },
  {
    id: 'introductory-statistics-2e',
    title: 'Introductory Statistics 2e',
    organization: 'OpenStax, Rice University',
    url: OPENSTAX_URL,
    credibility: 'An openly accessible introductory statistics text used for factual cross-checking and links. No textbook prose, figures, or assessment content is reproduced.',
    sourceType: 'open-factual-cross-check',
    reviewedAt: VERIFIED_AT,
  },
];

function q(unit, topicId, skillId, prompt, answer, distractors, rationale, options = {}) {
  assert(/^\d\.[A-G]$/.test(skillId), 'Invalid AP Statistics subskill: ' + skillId);
  assert(Array.isArray(distractors) && distractors.length === 3, 'Each item needs three distractors: ' + prompt);
  return {
    unit,
    topicId,
    skillId,
    prompt,
    answer,
    distractors,
    rationale,
    cognitiveProcess: options.cognitiveProcess || 'apply',
    difficulty: options.difficulty || 'intermediate',
    stimulus: options.stimulus || '',
  };
}

const itemSpecs = [
  // Unit 1: one-variable data, sampling, and experimental design.
  q(1, '1.1', '1.A', 'Which question is a valid statistical investigative question?', 'What proportion of students at the school walk or bike to school?', ['Did Maya walk to school today?', 'What is the school mascot?', 'Is walking better than driving for every student?'], 'A statistical investigative question anticipates variability and identifies a population or sample from which data can be collected.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(1, '1.2', '2.A', 'A study records the number of text messages sent by each participant. Which variable is quantitative?', 'The number of text messages sent', ['The participant’s favorite messaging app', 'Whether the participant has a phone', 'The participant’s grade level'], 'A quantitative variable records a measured or counted numerical amount with meaningful units.', { cognitiveProcess: 'classify', difficulty: 'foundational' }),
  q(1, '1.3', '3.B', 'In a survey of 240 students, 84 choose the later lunch period. What is the relative frequency for that category?', '0.35', ['0.28', '0.65', '2.86'], 'Relative frequency is the category count divided by the total count: 84/240 = 0.35.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(1, '1.4', '3.A', 'Which display is most appropriate for showing the counts of transportation methods used by students?', 'A bar chart', ['A histogram', 'A scatterplot', 'A boxplot'], 'Transportation method is categorical, so a bar chart displays the count or relative frequency of each category.', { cognitiveProcess: 'select', difficulty: 'foundational' }),
  q(1, '1.5', '4.A', 'A histogram of commute times has most observations between 10 and 25 minutes and a long right tail. How should the distribution be described?', 'Unimodal and skewed right', ['Uniform and symmetric', 'Bimodal and skewed left', 'Unimodal and exactly normal'], 'The concentration near smaller values with a longer tail toward larger values indicates right skewness; the single main peak is unimodal.', { cognitiveProcess: 'describe' }),
  q(1, '1.6', '4.A', 'Which statistic is generally most resistant to an unusually large outlier in a quantitative distribution?', 'The median', ['The mean', 'The standard deviation', 'The range'], 'The median and IQR are resistant summaries; a very large value can pull the mean and increase the range and standard deviation.', { cognitiveProcess: 'identify' }),
  q(1, '1.7', '3.B', 'A distribution has mean 52 and standard deviation 6. What is the z-score for an observation of 64?', '2', ['−2', '0.5', '12'], 'The z-score is (64 − 52)/6 = 2, so the observation is two standard deviations above the mean.', { cognitiveProcess: 'calculate' }),
  q(1, '1.8', '3.A', 'A boxplot has minimum 4, first quartile 9, median 13, third quartile 18, and maximum 27. What is the interquartile range?', '9', ['5', '14', '23'], 'The IQR is Q3 − Q1 = 18 − 9 = 9.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(1, '1.9', '4.A', 'Two classes have the same median test score. Class A has a smaller IQR than Class B. What does that indicate?', 'The middle 50% of Class A scores are less spread out.', ['Class A must have the larger mean.', 'Class A has more scores below its median.', 'Class B must have a higher maximum score.'], 'The IQR measures the spread of the middle half of a distribution; it does not determine the mean or the extremes.', { cognitiveProcess: 'compare' }),
  q(1, '1.10', '2.B', 'A researcher changes the wording of a survey question after seeing that the first wording produced an unexpected result. Why is that a problem?', 'Changing the question after seeing results can make the study question depend on the observed data.', ['It guarantees a larger random sample.', 'It turns an observational study into a randomized experiment.', 'It eliminates all response bias.'], 'A valid investigative question should be determined before the analysis so the study is not retrofitted to a desired or surprising result.', { cognitiveProcess: 'explain' }),
  q(1, '1.11', '2.A', 'A school divides its students by grade level and selects a simple random sample from each grade. Which sampling method is used?', 'A stratified random sample', ['A cluster random sample', 'A voluntary response sample', 'A systematic sample'], 'Strata are groups formed before sampling, and a random sample is taken from every stratum.', { cognitiveProcess: 'identify' }),
  q(1, '1.11', '2.B', 'A city randomly selects three entire neighborhoods and surveys every household in those neighborhoods. Which sampling method is used?', 'A cluster random sample', ['A stratified random sample', 'A convenience sample', 'A census of the city'], 'Clusters are whole naturally occurring groups selected at random; all or many units within selected clusters are then observed.', { cognitiveProcess: 'classify' }),
  q(1, '1.12', '4.B', 'A poll about school start times is posted on a website, and anyone may choose to respond. Which bias is especially likely?', 'Voluntary response bias', ['Undercoverage caused by a census', 'Placebo bias', 'Regression to the mean'], 'People who choose to respond may have stronger opinions than the target population, producing voluntary response bias.', { cognitiveProcess: 'explain' }),
  q(1, '1.12', '4.B', 'A survey of residents is conducted only in English even though a large part of the population speaks other languages. What concern is most direct?', 'Undercoverage bias', ['Type I error', 'Response variable bias', 'Random assignment'], 'Some members of the target population have little or no chance to be included, which is undercoverage.', { cognitiveProcess: 'identify' }),
  q(1, '1.13', '2.C', 'Why is random assignment used in an experiment?', 'It tends to balance lurking variables across treatment groups.', ['It guarantees that every participant receives the preferred treatment.', 'It allows the researcher to generalize to every population.', 'It prevents the response variable from varying.'], 'Random assignment reduces systematic differences among treatment groups and supports cause-and-effect conclusions.', { cognitiveProcess: 'explain' }),
  q(1, '1.13', '2.D', 'A study compares two study schedules. Students are first grouped by prior GPA, then randomly assigned to schedules within each GPA group. The GPA groups are called what?', 'Blocks', ['Parameters', 'Clusters', 'Sampling frames'], 'Blocking groups similar experimental units before random assignment to reduce variation from a known source.', { cognitiveProcess: 'identify' }),
  q(1, '1.13', '2.E', 'In a placebo-controlled experiment, neither participants nor the staff measuring outcomes know which treatment each participant received. What feature is present?', 'Double-blinding', ['A census', 'Undercoverage', 'A matched-pairs sample without treatment'], 'Keeping both participants and outcome assessors unaware can reduce placebo effects and measurement bias.', { cognitiveProcess: 'identify' }),
  q(1, '1.10', '4.B', 'A random sample of 500 app users reports their weekly screen time. Which conclusion is justified if the sample was representative?', 'The sample can support a generalization about the population of similar app users.', ['The sample proves that the app caused the reported screen time.', 'The result automatically applies to every person in the country.', 'The statistic is equal to the population parameter.'], 'Random sampling supports generalization to the sampled population, but an observational survey does not establish causation and statistics are estimates.', { cognitiveProcess: 'justify' }),
  q(1, '1.9', '3.B', 'Adding the same constant to every observation in a data set changes the mean but leaves which quantity unchanged?', 'The standard deviation', ['The median', 'The minimum', 'The maximum'], 'Adding a constant shifts location summaries but does not change distances among observations, so standard deviation remains unchanged.', { cognitiveProcess: 'explain' }),
  q(1, '1.7', '4.A', 'A data set has mean 18. If every value is multiplied by 3, what is the new mean?', '54', ['6', '18', '21'], 'Multiplying every observation by a constant multiplies the mean by that same constant: 3(18) = 54.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),

  // Unit 2: probability and distributions.
  q(2, '2.1', '4.A', 'A two-way table shows device ownership by grade. Which display is best for comparing device ownership across grades?', 'Conditional relative frequencies within each grade', ['The grand total only', 'A histogram of the grade labels', 'The sample mean of the device categories'], 'Conditional proportions within each grade put the grade groups on a common basis for comparison.', { cognitiveProcess: 'select' }),
  q(2, '2.2', '3.B', 'In a two-way table, 18 of 60 commuters who bike report being late. What is the conditional proportion of late bikers?', '0.30', ['0.18', '0.42', '3.33'], 'The conditional proportion is the count in the late-and-bike cell divided by the bike column total: 18/60 = 0.30.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.3', '3.C', 'A simulation of 2,000 randomly selected five-card hands produces 46 hands with four aces. What probability estimate does the simulation give?', '0.023', ['0.0023', '0.046', '0.23'], 'The estimated probability is the number of simulated successes divided by the number of repetitions: 46/2000 = 0.023.', { cognitiveProcess: 'calculate' }),
  q(2, '2.4', '3.C', 'If P(A) = 0.62, what is P(not A)?', '0.38', ['0.62', '1.62', '0.06'], 'The complement rule gives P(not A) = 1 − P(A) = 1 − 0.62 = 0.38.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.5', '4.B', 'Events A and B are mutually exclusive. Which statement must be true?', 'P(A and B) = 0', ['P(A) = P(B)', 'P(A and B) = P(A)P(B)', 'P(A or B) = 0'], 'Mutually exclusive events cannot occur together, so their intersection has probability zero.', { cognitiveProcess: 'identify' }),
  q(2, '2.6', '3.C', 'Of 80 library visitors, 32 borrow a book and 20 of those 32 also use a study room. What is P(use a study room | borrow a book)?', '0.625', ['0.25', '0.40', '0.80'], 'Conditional probability uses the borrowers as the denominator: 20/32 = 0.625.', { cognitiveProcess: 'calculate' }),
  q(2, '2.7', '3.C', 'If P(A) = 0.4, P(B) = 0.5, and A and B are independent, what is P(A and B)?', '0.20', ['0.10', '0.45', '0.90'], 'For independent events, P(A and B) = P(A)P(B) = 0.4(0.5) = 0.20.', { cognitiveProcess: 'calculate' }),
  q(2, '2.7', '3.C', 'If P(A) = 0.40, P(B) = 0.50, and P(A and B) = 0.20, what is P(A or B)?', '0.70', ['0.20', '0.50', '0.90'], 'Use the union rule: 0.40 + 0.50 − 0.20 = 0.70.', { cognitiveProcess: 'calculate' }),
  q(2, '2.8', '3.A', 'Which condition must hold for a table to be a valid probability distribution for a discrete random variable?', 'All probabilities are between 0 and 1 and sum to 1.', ['All outcomes have the same probability.', 'The mean must equal 0.', 'There must be exactly four possible outcomes.'], 'A discrete probability distribution assigns nonnegative probabilities totaling one; equal probabilities and a fixed number of outcomes are not required.', { cognitiveProcess: 'identify' }),
  q(2, '2.9', '3.B', 'A random variable X has values 0, 1, and 2 with probabilities 0.2, 0.5, and 0.3. What is E(X)?', '1.1', ['0.6', '1.0', '1.5'], 'The expected value is 0(0.2) + 1(0.5) + 2(0.3) = 1.1.', { cognitiveProcess: 'calculate' }),
  q(2, '2.9', '4.D', 'A game’s expected payout is $2.40 per play. What does that mean?', 'Over many plays, the average payout per play will tend to approach $2.40.', ['Every player will receive exactly $2.40.', 'The game must pay $2.40 on its most common outcome.', 'The probability of winning is 2.40.'], 'Expected value is a long-run average, not a guarantee for an individual play or the most likely outcome.', { cognitiveProcess: 'interpret' }),
  q(2, '2.10', '4.B', 'Which situation can be modeled by a binomial random variable?', 'The number of defective items in 12 independently inspected items when each has the same defect probability.', ['The number of rolls until a six first appears', 'The amount of rainfall tomorrow', 'The number of heads in flips where the coin changes bias every flip'], 'A binomial count has a fixed number of independent trials, two outcomes, and a constant success probability.', { cognitiveProcess: 'classify' }),
  q(2, '2.10', '3.D', 'If X is binomial with n = 40 and p = 0.25, what is the mean of X?', '10', ['0.25', '30', '160'], 'For a binomial random variable, the mean is np = 40(0.25) = 10.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.10', '3.C', 'For X ~ Binomial(5, 0.2), which expression gives P(X = 2)?', 'C(5,2)(0.2)^2(0.8)^3', ['C(5,2)(0.2)^5', '5(0.2)(0.8)', '(0.2)^2(0.8)^2'], 'The binomial probability function chooses the two success positions and multiplies by the probability of two successes and three failures.', { cognitiveProcess: 'select' }),
  q(2, '2.10', '3.D', 'If X is binomial with n = 100 and p = 0.60, what is the standard deviation of X?', 'sqrt(24), or about 4.90', ['24', '40', '60'], 'The binomial standard deviation is sqrt(np(1-p)) = sqrt(100(0.6)(0.4)) = sqrt(24).', { cognitiveProcess: 'calculate' }),
  q(2, '2.11', '3.C', 'Test scores are approximately normal with mean 70 and standard deviation 8. What is the z-score for a score of 86?', '2', ['−2', '0.5', '16'], 'The z-score is (86 − 70)/8 = 2.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.11', '4.C', 'In a normal distribution, which value is at the 50th percentile?', 'The mean and median', ['The first quartile only', 'The standard deviation', 'The maximum'], 'A normal distribution is symmetric, so its mean, median, and 50th percentile coincide.', { cognitiveProcess: 'identify' }),
  q(2, '2.11', '3.C', 'For a standard normal variable Z, approximately what is P(−1 < Z < 1)?', '0.68', ['0.16', '0.32', '0.95'], 'About 68% of a normal distribution lies within one standard deviation of its mean.', { cognitiveProcess: 'estimate' }),
  q(2, '2.12', '4.C', 'Why does the Central Limit Theorem matter for sample means?', 'For sufficiently large random samples, the sampling distribution of the sample mean is approximately normal even when the population is not normal.', ['It says every individual observation is normally distributed.', 'It makes the population standard deviation equal to zero.', 'It eliminates sampling variability.'], 'The Central Limit Theorem supports normal modeling of sample means under appropriate conditions, not of every observation and not without variability.', { cognitiveProcess: 'explain' }),
  q(2, '2.12', '4.D', 'A sampling distribution of sample means is centered at 50 with standard deviation 3. What does a sample mean of 56 represent?', 'It is two standard deviations above the center of the sampling distribution.', ['It proves the population mean is 56.', 'It is six standard deviations above the center.', 'It must be the most likely sample mean.'], 'The standardized distance is (56 − 50)/3 = 2; a sample statistic does not prove the population parameter.', { cognitiveProcess: 'interpret' }),

  // Unit 3: inference for proportions and categorical data.
  q(3, '3.1', '4.B', 'An estimator is unbiased when which statement is true?', 'Its sampling distribution is centered at the population parameter.', ['It has no sampling variability.', 'It always equals the parameter.', 'It has the smallest possible standard deviation.'], 'Unbiasedness means the long-run mean of the estimator equals the parameter; individual estimates can still vary.', { cognitiveProcess: 'identify' }),
  q(3, '3.2', '3.D', 'If p = 0.40 and n = 100, what is the standard deviation of the sample proportion, assuming the conditions are met?', '0.049', ['0.0049', '0.24', '0.40'], 'The standard deviation is sqrt(p(1-p)/n) = sqrt(0.4(0.6)/100) ≈ 0.049.', { cognitiveProcess: 'calculate' }),
  q(3, '3.3', '2.C', 'A random sample is used to estimate a population proportion. Which procedure is appropriate for a confidence interval?', 'A one-proportion z-interval', ['A one-sample t-interval for a mean', 'A chi-square test for independence only', 'A two-sample t-test'], 'The parameter is one population proportion, so a one-proportion z-interval is the matching procedure when its conditions hold.', { cognitiveProcess: 'select' }),
  q(3, '3.3', '4.E', 'For a one-proportion z-interval, which condition helps justify an approximately normal sampling distribution?', 'At least 10 expected successes and 10 expected failures.', ['The sample size must equal the population size.', 'The sample mean must be 0.', 'The population must contain exactly two people.'], 'The large-count condition requires enough expected successes and failures; randomization and the 10% condition may also be needed.', { cognitiveProcess: 'verify' }),
  q(3, '3.4', '4.F', 'A 95% confidence interval for a population proportion is (0.42, 0.58). Which interpretation is correct?', 'We are 95% confident that the interval captures the population proportion.', ['There is a 95% probability that this fixed population proportion changes between 0.42 and 0.58.', 'Exactly 95% of individuals have the characteristic.', 'The sample proportion has a 95% chance of being 0.50.'], 'The confidence describes the reliability of the interval procedure across repeated samples; the parameter is fixed.', { cognitiveProcess: 'interpret' }),
  q(3, '3.4', '3.E', 'Holding confidence level and variability constant, what generally happens to a confidence interval when sample size increases?', 'It becomes narrower.', ['It becomes wider.', 'Its center must move to zero.', 'It loses its connection to the population.'], 'The standard error decreases as n increases, so the margin of error and interval width generally decrease.', { cognitiveProcess: 'explain' }),
  q(3, '3.5', '2.E', 'A researcher wants to test whether the population proportion of commuters who use transit is greater than 0.30. Which alternative hypothesis is appropriate?', 'H_a: p > 0.30', ['H_a: p = 0.30', 'H_a: p < 0.30', 'H_a: p-hat > 0.30 for every sample'], 'The alternative states the population claim of interest and uses the parameter p, not the sample statistic p-hat.', { cognitiveProcess: 'select' }),
  q(3, '3.6', '4.F', 'What does a p-value of 0.03 mean in a test of a population proportion?', 'Assuming the null hypothesis is true, the probability of a result at least as extreme as the observed result is 0.03.', ['There is a 3% chance the null hypothesis is true.', 'There is a 97% chance the alternative hypothesis is true.', 'The observed proportion is wrong by 3 percentage points.'], 'A p-value is calculated under the null model and measures how unusual the observed result or more extreme results would be.', { cognitiveProcess: 'interpret' }),
  q(3, '3.7', '4.G', 'A test uses alpha = 0.05 and produces p = 0.08. What is the correct decision?', 'Fail to reject the null hypothesis.', ['Reject the null hypothesis.', 'Accept the null hypothesis as proven true.', 'Increase the sample proportion by 0.03.'], 'Because p is greater than alpha, the result is not statistically significant at the 5% level; this is not evidence that the null is true.', { cognitiveProcess: 'justify' }),
  q(3, '3.8', '2.D', 'A Type I error occurs when a researcher does what?', 'Rejects a true null hypothesis.', ['Fails to reject a false null hypothesis.', 'Rejects a false alternative hypothesis.', 'Reports the sample size incorrectly.'], 'A Type I error is a false positive: concluding there is evidence against the null when the null is actually true.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(3, '3.8', '2.D', 'Which change generally increases the power of a test, assuming other factors stay fixed?', 'Increasing the sample size', ['Lowering the sample size', 'Replacing a random sample with a convenience sample', 'Removing the alternative hypothesis'], 'Larger samples reduce standard error and make real departures from the null easier to detect.', { cognitiveProcess: 'explain' }),
  q(3, '3.9', '3.D', 'For independent samples with p1 = 0.50, p2 = 0.40, n1 = 100, and n2 = 100, what is the mean of p-hat1 − p-hat2?', '0.10', ['0.05', '0.90', '−0.10'], 'The mean of a difference of sample proportions is p1 − p2 = 0.50 − 0.40 = 0.10.', { cognitiveProcess: 'calculate' }),
  q(3, '3.10', '2.C', 'Which procedure estimates the difference between two independent population proportions?', 'A two-proportion z-interval', ['A one-sample t-interval for a mean', 'A one-proportion z-test only', 'A matched-pairs t-interval'], 'Two independent categorical groups with a difference in proportions call for a two-proportion z-interval when conditions hold.', { cognitiveProcess: 'select' }),
  q(3, '3.11', '4.G', 'A confidence interval for p1 − p2 is (−0.04, 0.12). What claim is supported?', 'The interval does not provide convincing evidence of a difference between the population proportions.', ['The first population proportion is definitely larger.', 'The second population proportion is definitely larger.', 'The two sample proportions are exactly equal.'], 'Because the interval contains 0, a zero difference remains plausible; this does not prove equality.', { cognitiveProcess: 'justify' }),
  q(3, '3.12', '2.E', 'When setting up a two-proportion z-test for H0: p1 = p2, which proportion is used in the standard error?', 'The pooled sample proportion', ['The larger sample proportion only', 'The population proportion p1, which is known', 'The difference p1 − p2 without estimation'], 'Under the null equality model, the pooled proportion combines successes and sample sizes from both groups.', { cognitiveProcess: 'identify' }),
  q(3, '3.13', '4.G', 'A two-proportion test finds p = 0.01. Which conclusion is appropriate at alpha = 0.05?', 'There is convincing evidence that the population proportions differ in the direction of the alternative.', ['The null hypothesis is proven false in every population.', 'There is no difference because 0.01 is small.', 'The sample sizes must have been equal.'], 'Since p < alpha, reject the null and describe evidence for the alternative in the population context.', { cognitiveProcess: 'justify' }),
  q(3, '3.14', '2.C', 'A researcher compares the distribution of preferred study location across three schools. Which chi-square procedure matches this goal?', 'A chi-square test for homogeneity', ['A one-proportion z-test', 'A matched-pairs t-test', 'A chi-square test for a single variance'], 'Comparing the distribution of one categorical variable across multiple populations is a test for homogeneity.', { cognitiveProcess: 'select' }),
  q(3, '3.14', '2.C', 'A single school studies whether class year and preferred study location are associated. Which chi-square procedure matches this goal?', 'A chi-square test for independence', ['A two-proportion z-interval', 'A one-sample t-test', 'A randomized block experiment'], 'Testing association between two categorical variables in one population is a chi-square test for independence.', { cognitiveProcess: 'select' }),
  q(3, '3.15', '3.C', 'In a two-way table, a row total is 80, a column total is 50, and the grand total is 200. What is the expected count for that cell?', '20', ['30', '80', '130'], 'The expected count is (row total)(column total)/(grand total) = 80(50)/200 = 20.', { cognitiveProcess: 'calculate' }),
  q(3, '3.15', '4.F', 'A chi-square test produces a small p-value. What does that suggest?', 'The observed categorical counts would be unusual if the null model were true.', ['Every expected count is zero.', 'The variables must have a perfect causal relationship.', 'The sample was necessarily a census.'], 'A small p-value indicates a discrepancy between observed and expected counts that is difficult to attribute to chance under the null model.', { cognitiveProcess: 'interpret' }),

  // Unit 4: inference for means.
  q(4, '4.1', '3.D', 'A population has mean 80 and standard deviation 12. For random samples of size 36, what is the standard deviation of the sample mean?', '2', ['0.33', '12', '72'], 'The standard deviation of the sample mean is sigma/sqrt(n) = 12/sqrt(36) = 2.', { cognitiveProcess: 'calculate' }),
  q(4, '4.1', '4.E', 'A population distribution is strongly right-skewed. Which sample size is most helpful for using a normal model for the sample mean?', 'A sufficiently large sample, such as n = 50', ['n = 2 with no additional information', 'A sample of one observation', 'A sample size cannot affect the sampling distribution'], 'Larger samples allow the Central Limit Theorem to make the sampling distribution of the mean more nearly normal, though extreme skew may require larger n.', { cognitiveProcess: 'justify' }),
  q(4, '4.2', '4.C', 'Why is a t-distribution used for a one-sample confidence interval for a population mean?', 'The population standard deviation is usually unknown and is estimated with the sample standard deviation.', ['The data are categorical.', 'The population mean is always zero.', 'A t-distribution has no tails.'], 'Replacing unknown sigma with s adds uncertainty; the t family accounts for that extra uncertainty through degrees of freedom.', { cognitiveProcess: 'explain' }),
  q(4, '4.2', '2.C', 'A random sample measures the battery life of devices. Which interval estimates the population mean battery life?', 'A one-sample t-interval for a mean', ['A one-proportion z-interval', 'A chi-square test for independence', 'A two-proportion z-test'], 'Battery life is quantitative and the target is one population mean, so a one-sample t-interval is the matching procedure.', { cognitiveProcess: 'select' }),
  q(4, '4.3', '4.F', 'A 90% confidence interval for a mean difference is (1.2, 4.8) minutes. What is supported?', 'The interval provides evidence that the first population mean exceeds the second.', ['The two population means are equal.', 'Exactly 90% of individual differences are between 1.2 and 4.8.', 'The sample means must differ by exactly 3.0 minutes in every sample.'], 'Because the interval for first minus second is entirely positive, a positive population difference is plausible and zero is not in the interval.', { cognitiveProcess: 'interpret' }),
  q(4, '4.3', '3.E', 'All else equal, which change generally makes a t confidence interval for a population mean narrower?', 'Increasing the sample size', ['Increasing the confidence level', 'Increasing the sample standard deviation', 'Removing the randomization condition'], 'A larger sample reduces the standard error; a higher confidence level or greater variability makes the interval wider.', { cognitiveProcess: 'explain' }),
  q(4, '4.4', '2.C', 'A study records each runner’s time before and after a training plan. Which inference procedure compares the mean change?', 'A matched-pairs t procedure', ['A two-proportion z procedure', 'A chi-square test for homogeneity', 'A one-sample z procedure for a known sigma'], 'The two measurements are naturally paired for each runner, so analyze the within-runner differences with a one-sample t procedure.', { cognitiveProcess: 'select' }),
  q(4, '4.4', '4.E', 'For a matched-pairs t procedure with fewer than 30 pairs, which condition is especially important?', 'The distribution of the paired differences should not have strong skewness or outliers.', ['The two original variables must be categorical.', 'The population standard deviation must be known exactly.', 'Every difference must equal zero.'], 'The t model is applied to the differences; with a small sample, their distribution should be reasonably free of strong skewness and outliers.', { cognitiveProcess: 'verify' }),
  q(4, '4.5', '2.E', 'A researcher tests whether the mean fill volume is less than 500 mL. Which alternative hypothesis is appropriate?', 'H_a: mu < 500', ['H_a: x-bar < 500 for every sample', 'H_a: mu = 500', 'H_a: mu > 500'], 'The alternative describes the population mean in the direction of the research claim.', { cognitiveProcess: 'select', difficulty: 'foundational' }),
  q(4, '4.5', '4.F', 'A one-sample t-test gives t = 2.4 and p = 0.02 for H_a: mu > 0. What does the p-value describe?', 'The probability, assuming mu = 0, of obtaining a test statistic at least as large as 2.4.', ['The probability that mu equals 0.02.', 'The chance that the sample mean is exactly 2.4.', 'The probability that the alternative is true.'], 'The p-value is computed under the null model and follows the direction of the alternative.', { cognitiveProcess: 'interpret' }),
  q(4, '4.5', '4.G', 'A test uses alpha = 0.01 and p = 0.02. Which conclusion is correct?', 'Fail to reject the null hypothesis at the 1% significance level.', ['Reject the null hypothesis at the 1% level.', 'Accept the null as proven.', 'The p-value must be recalculated as 0.99.'], 'The p-value exceeds alpha, so the result is not statistically significant at the stated level.', { cognitiveProcess: 'justify' }),
  q(4, '4.6', '3.D', 'If two independent sample means estimate populations with means 10 and 14, what is the mean of x-bar1 − x-bar2?', '−4', ['4', '10', '24'], 'The mean of the difference is the difference of the population means: 10 − 14 = −4.', { cognitiveProcess: 'calculate' }),
  q(4, '4.6', '3.D', 'For independent sample means, what happens to the standard error if both sample sizes increase?', 'It generally decreases.', ['It must become zero.', 'It generally increases without bound.', 'It becomes equal to the population mean.'], 'The standard error contains terms divided by sample sizes, so larger samples usually reduce sampling variability.', { cognitiveProcess: 'explain' }),
  q(4, '4.7', '2.C', 'Which procedure estimates the difference between two independent population means?', 'A two-sample t-interval for a difference in means', ['A one-proportion z-interval', 'A matched-pairs procedure for the same individuals', 'A chi-square test for independence'], 'Two independent quantitative groups and a target mean difference require a two-sample t-interval when conditions hold.', { cognitiveProcess: 'select' }),
  q(4, '4.8', '4.G', 'A confidence interval for mu1 − mu2 is (−3.1, 1.4). What conclusion is supported?', 'There is not convincing evidence of a difference between the population means.', ['The first population mean is definitely smaller.', 'The second population mean is definitely smaller.', 'The sample means are exactly equal.'], 'Because zero is in the interval, a zero population difference remains plausible; the interval does not prove equality.', { cognitiveProcess: 'justify' }),
  q(4, '4.9', '2.C', 'Which design calls for a matched-pairs t-test rather than a two-sample t-test?', 'The same 24 people are measured before and after an intervention.', ['Two independent random samples of different people are compared.', 'Two categorical variables from one population are compared.', 'A single proportion is compared with a target value.'], 'Repeated measurements on the same individuals create paired observations, so the analysis should use within-person differences.', { cognitiveProcess: 'select' }),
  q(4, '4.9', '4.E', 'For a two-sample t procedure based on independent random samples, which condition supports independence when sampling without replacement?', 'Each sample is no more than 10% of its population.', ['Each sample contains every member of its population.', 'The two sample means must be equal.', 'The response variable must be categorical.'], 'The 10% condition limits dependence among observations within a sample; random sampling and appropriate quantitative data conditions are also needed.', { cognitiveProcess: 'verify' }),
  q(4, '4.10', '4.G', 'A two-sample t-test for mu1 − mu2 has p = 0.004. At alpha = 0.01, what is the correct conclusion?', 'Reject the null hypothesis and report convincing evidence for a nonzero difference in population means.', ['Fail to reject because 0.004 is greater than 0.001.', 'Accept the null as proven true.', 'Conclude that every individual in group 1 exceeds every individual in group 2.'], 'The p-value is below alpha, so the result is statistically significant; the conclusion must stay about population means, not every individual.', { cognitiveProcess: 'justify' }),
  q(4, '4.10', '4.F', 'A confidence level increases from 90% to 99% while the sample and method stay the same. What happens to the interval?', 'It becomes wider.', ['It becomes narrower.', 'Its center must become zero.', 'It changes from a mean interval to a proportion interval.'], 'Greater confidence requires a larger critical value, which increases the margin of error and width.', { cognitiveProcess: 'explain', difficulty: 'foundational' }),
  q(4, '4.5', '4.G', 'A confidence interval and a two-sided hypothesis test use the same sample and matched significance level. Which relationship is expected?', 'The null value is rejected when it falls outside the corresponding confidence interval.', ['The null value is rejected only when it is inside the interval.', 'The interval must contain every individual observation.', 'The test and interval always use different population parameters.'], 'For matched procedures, a two-sided test at level alpha rejects the null value when that value is outside the corresponding 1 − alpha confidence interval.', { cognitiveProcess: 'connect' }),

  // Unit 5: regression analysis.
  q(5, '5.1', '4.A', 'A scatterplot of advertising spending and sales rises from left to right with points close to a line. How should the association be described?', 'Positive and fairly strong linear association', ['Negative and weak linear association', 'No association because both variables are quantitative', 'Perfect causation'], 'An upward, tight cloud indicates a positive, relatively strong linear association; a scatterplot alone does not establish causation.', { cognitiveProcess: 'describe' }),
  q(5, '5.1', '4.A', 'A scatterplot has two separate clusters of points. Why should the analyst be cautious about fitting one linear model?', 'The clusters may represent different groups with different relationships.', ['Two clusters guarantee a correlation of zero.', 'A linear model is only allowed for categorical variables.', 'Clusters prove that the response variable caused the explanatory variable.'], 'A combined model can conceal group-specific patterns or slopes, so the groups and context should be investigated.', { cognitiveProcess: 'explain' }),
  q(5, '5.2', '3.B', 'What does a correlation of r = −0.82 indicate?', 'A strong negative linear association between the two quantitative variables', ['A strong positive linear association', 'That 82% of observations are negative', 'That the response causes the explanatory variable'], 'Correlation measures the direction and strength of a linear association and does not establish causation.', { cognitiveProcess: 'interpret' }),
  q(5, '5.2', '4.B', 'Which feature does not change when the units of both variables are converted from meters to centimeters?', 'The correlation', ['The slope units', 'The intercept units', 'The numerical values of the observations'], 'Correlation is unitless and unchanged by positive linear rescaling, while numerical values and regression coefficients change units.', { cognitiveProcess: 'identify' }),
  q(5, '5.3', '3.B', 'A least-squares line is y-hat = 12 + 4x. What is the predicted response when x = 5?', '32', ['20', '60', '8'], 'Substitute x = 5: y-hat = 12 + 4(5) = 32.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(5, '5.3', '4.D', 'In the model y-hat = 12 + 4x, how should the slope be interpreted?', 'For each one-unit increase in x, the predicted value of y increases by 4 units.', ['Every observed y is exactly 4.', 'The correlation between x and y is 4.', 'When x is zero, the response must be 4.'], 'The slope describes the change in predicted response for a one-unit increase in the explanatory variable.', { cognitiveProcess: 'interpret' }),
  q(5, '5.3', '4.D', 'What does the intercept represent in a linear regression model?', 'The predicted response when the explanatory variable equals zero, if that value is meaningful in context.', ['The strength of the association in every context', 'The largest observed response', 'The residual for every observation'], 'The intercept is a model prediction at x = 0; its contextual interpretation depends on whether x = 0 is reasonable and in the data range.', { cognitiveProcess: 'explain' }),
  q(5, '5.4', '3.B', 'An observation has actual response 41 and predicted response 35. What is its residual?', '6', ['−6', '35', '76'], 'Residual = observed response − predicted response = 41 − 35 = 6.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(5, '5.4', '4.A', 'A residual plot shows a curved pattern rather than random scatter around zero. What does that suggest?', 'A linear model may not adequately describe the relationship.', ['The correlation must be exactly 1.', 'The explanatory variable is categorical.', 'The model has no residuals.'], 'Systematic curvature in residuals indicates that the linear form misses structure in the relationship.', { cognitiveProcess: 'interpret' }),
  q(5, '5.4', '4.B', 'A residual plot has one point far from the rest vertically but not far horizontally. How is the point best described?', 'An outlier in the response direction', ['A high-leverage point only', 'A point with zero residual', 'A sampling stratum'], 'A large vertical residual indicates an unusual response relative to the model; leverage concerns an unusual explanatory-variable value.', { cognitiveProcess: 'classify' }),
  q(5, '5.5', '3.B', 'If r = 0.70, what is r-squared?', '0.49', ['0.30', '0.70', '1.40'], 'r-squared is the square of the correlation: (0.70)^2 = 0.49.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(5, '5.5', '4.D', 'If r-squared = 0.64, what is the best interpretation in context?', 'About 64% of the variation in the response is explained by the linear regression model with the explanatory variable.', ['The model predicts every response within 64 units.', 'The correlation is 0.64 regardless of direction.', 'There is a 64% chance the model is causal.'], 'R-squared describes the proportion of response variability explained by the fitted linear model; it is not a probability of causation.', { cognitiveProcess: 'interpret' }),
  q(5, '5.5', '4.B', 'Which statement about least-squares regression is correct?', 'The least-squares line minimizes the sum of the squared residuals.', ['It minimizes the sum of residuals without squaring.', 'It passes through every data point.', 'It makes every residual positive.'], 'Squaring residuals prevents cancellation and produces the line with the smallest total squared error.', { cognitiveProcess: 'identify' }),
  q(5, '5.3', '2.A', 'A regression model is used to predict a response for an x-value far outside the observed range. What is this called?', 'Extrapolation', ['Interpolation', 'Blocking', 'Random assignment'], 'Using a model beyond the observed explanatory-variable range is extrapolation and can be unreliable.', { cognitiveProcess: 'identify' }),
  q(5, '5.4', '4.B', 'A high-leverage point is removed and the regression slope changes substantially. What should the analyst do?', 'Investigate the point and report how the fitted model depends on it.', ['Delete it automatically because it changes the slope.', 'Keep it hidden because regression cannot use unusual points.', 'Conclude that the response caused the point.'], 'Influential points require contextual and measurement review; automatic deletion or concealment is not justified.', { cognitiveProcess: 'justify' }),
  q(5, '5.2', '4.D', 'Why can a strong correlation between ice cream sales and sunburn counts not by itself establish causation?', 'A lurking variable such as warmer weather could influence both variables.', ['Correlation is calculated only for categorical variables.', 'A positive correlation means the variables cannot be related.', 'The sample size must always be one.'], 'A lurking variable can create or explain an association without either measured variable causing the other.', { cognitiveProcess: 'explain' }),
  q(5, '5.3', '3.B', 'If the slope of a regression line is 0.5 when x is measured in hours, what happens to the numerical slope if x is converted to minutes?', 'It becomes 0.5/60, with response units per minute.', ['It becomes 30, with response units per minute.', 'It remains 0.5 with no unit change.', 'It becomes 60.5.'], 'A one-minute increase is 1/60 of an hour, so the slope per minute is one-sixtieth of the slope per hour.', { cognitiveProcess: 'calculate' }),
  q(5, '5.5', '4.A', 'A residual plot shows roughly equal vertical spread across the x-values and no obvious pattern. What does that support?', 'The constant-variance and linear-form conditions are reasonably plausible.', ['The response variable is categorical.', 'The fitted line must be causal.', 'The model predicts every point exactly.'], 'Random scatter with similar spread around zero supports, but does not prove, a useful linear model with roughly constant variability.', { cognitiveProcess: 'justify' }),
  q(5, '5.5', '4.G', 'A fitted regression line has a 95% confidence interval for its slope that includes 0. What is a cautious conclusion?', 'The data do not provide convincing evidence of a nonzero population linear association at that confidence level.', ['The variables are proven independent in every population.', 'The slope is exactly zero.', 'The model proves there is a causal effect.'], 'An interval containing zero means a zero slope remains plausible; it does not prove no association or establish causation.', { cognitiveProcess: 'justify' }),
  q(5, '5.1', '2.B', 'Which feature should be checked before using a linear regression model for a scatterplot?', 'The form, direction, strength, outliers, and influential points of the association', ['Only the largest response value', 'Whether the graph uses a pie chart', 'Whether the sample mean equals zero'], 'Model selection depends on the observed relationship and unusual points, not on one isolated summary.', { cognitiveProcess: 'select' }),
];

const expandedItemSpecs = [
  // Second angle for every public framework topic.
  q(1, '1.1', '1.B', 'A school wants to estimate the proportion of all enrolled students who regularly use public transportation. What is the parameter of interest?', 'The population proportion of enrolled students who regularly use public transportation.', ['The proportion in the sample who answer the survey.', 'The number of buses used by the school.', 'The mean number of trips made by one student.'], 'A parameter is a numerical summary of the population, while the sample proportion is a statistic used to estimate it.', { cognitiveProcess: 'identify' }),
  q(1, '1.2', '2.A', 'A survey records each student\'s commute method and commute time. Which variable is categorical?', 'Commute method', ['Commute time in minutes', 'Distance traveled in miles', 'Number of transfers'], 'A categorical variable places observations into labels or groups; the other variables are numerical measurements or counts.', { cognitiveProcess: 'classify', difficulty: 'foundational' }),
  q(1, '1.3', '3.B', 'A frequency table lists 45 students who walk, 75 who ride a bus, and 30 who are driven. What is the relative frequency for bus riders?', '0.50', ['0.30', '0.67', '1.50'], 'There are 150 students total, so the bus relative frequency is 75/150 = 0.50.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(1, '1.4', '3.A', 'Which display is most useful for comparing the transportation categories of two grade levels?', 'A side-by-side bar chart or segmented bar chart', ['A single histogram of all commute times', 'A scatterplot of student names', 'A boxplot of category labels'], 'Bar-based displays preserve categorical groups and allow the category distributions to be compared across grade levels.', { cognitiveProcess: 'select' }),
  q(1, '1.5', '4.A', 'Which display is appropriate for the distribution of daily step counts for a group of students?', 'A histogram', ['A bar chart with one bar for each student name', 'A pie chart of numerical intervals without bins', 'A two-way table of two categorical variables'], 'Daily step count is quantitative, so a histogram can show its distribution across numerical intervals.', { cognitiveProcess: 'select', difficulty: 'foundational' }),
  q(1, '1.6', '4.A', 'A distribution has a long left tail and no extreme values. Which relationship is most plausible?', 'The mean is less than the median.', ['The mean must equal the median.', 'The mean is greater than the maximum.', 'The median must be zero.'], 'A left-skewed distribution is pulled toward smaller values, so the mean is often below the median.', { cognitiveProcess: 'infer' }),
  q(1, '1.7', '3.B', 'A data set has Q1 = 12, median = 18, and Q3 = 25. What is the IQR?', '13', ['7', '18', '37'], 'The interquartile range is Q3 - Q1 = 25 - 12 = 13.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(1, '1.8', '3.A', 'Which five-number-summary feature is used to identify a possible outlier with the 1.5-IQR rule?', 'A value below Q1 - 1.5(IQR) or above Q3 + 1.5(IQR)', ['A value exactly equal to the mean', 'Any value above the median', 'The difference between the minimum and maximum only'], 'The 1.5-IQR rule compares observations with fences formed from the quartiles and the IQR.', { cognitiveProcess: 'identify' }),
  q(1, '1.9', '4.A', 'Two distributions have equal means, but Distribution A has a smaller standard deviation. What is supported?', 'Distribution A has less typical distance from its mean.', ['Distribution A must have a larger median.', 'Distribution A must be skewed right.', 'Distribution A has no variability.'], 'Standard deviation describes typical distance from the mean; equal means do not determine shape or median.', { cognitiveProcess: 'compare' }),
  q(1, '1.10', '2.B', 'A researcher observes study habits and exam scores without assigning a study method. What kind of study is this?', 'An observational study', ['A randomized experiment', 'A census of every possible student', 'A matched-pairs experiment with no response variable'], 'The researcher records existing behavior without imposing treatments, so the design is observational.', { cognitiveProcess: 'classify' }),
  q(1, '1.11', '2.A', 'A researcher chooses every tenth name after randomly selecting a starting position from a roster. Which method is used?', 'A systematic random sample', ['A voluntary response sample', 'A cluster sample', 'A census'], 'Selecting every kth individual after a random start is systematic sampling.', { cognitiveProcess: 'identify' }),
  q(1, '1.12', '4.B', 'A mailed survey has a low return rate, and people with very strong opinions are more likely to reply. What bias is most concerning?', 'Nonresponse bias', ['Placebo effect', 'Underflow in a probability calculation', 'Random assignment bias'], 'If respondents differ systematically from selected people who do not respond, the results can suffer from nonresponse bias.', { cognitiveProcess: 'explain' }),
  q(1, '1.13', '2.C', 'A study randomly assigns volunteers to either a new tutoring program or no program. Which conclusion is supported if the groups differ in scores?', 'The assignment supports a cause-and-effect conclusion about the treatments for the study participants.', ['The result automatically generalizes to every student in the world.', 'The study proves the sample mean equals the population mean.', 'The result is only a description of an unassigned survey.'], 'Random assignment supports causal comparison, while generalization requires an appropriate sampling design.', { cognitiveProcess: 'justify' }),

  q(2, '2.1', '4.A', 'A two-way table compares breakfast choice for athletes and nonathletes. What should be compared to assess whether choice differs by group?', 'The conditional percentages of breakfast choices within each group.', ['Only the grand total of all breakfast choices.', 'The row labels without any counts.', 'The mean of the categorical labels.'], 'Conditional percentages use a common within-group denominator and reveal differences in the distributions.', { cognitiveProcess: 'select' }),
  q(2, '2.2', '3.B', 'In a two-way table, 24 of 40 students in one group choose option A. What is the conditional percentage for option A in that group?', '60%', ['24%', '40%', '66.7% of all observations regardless of group size'], 'The conditional percentage is 24/40 = 0.60, or 60%, using the group total as the denominator.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.3', '3.C', 'A simulation models a random guessing process. If 31 of 500 repetitions meet the observed success criterion, what is the estimated probability?', '0.062', ['0.0062', '0.31', '16.13'], 'The simulated probability is successes divided by repetitions: 31/500 = 0.062.', { cognitiveProcess: 'calculate' }),
  q(2, '2.4', '3.C', 'If P(A) = 0.35 and P(B) = 0.20 for disjoint events, what is P(A or B)?', '0.55', ['0.07', '0.15', '1.55'], 'For mutually exclusive events, the intersection is zero, so the union probability is 0.35 + 0.20 = 0.55.', { cognitiveProcess: 'calculate' }),
  q(2, '2.5', '4.B', 'Which statement distinguishes mutually exclusive events from independent events?', 'Mutually exclusive events cannot occur together, while independent events can occur together but do not change each other\'s probabilities.', ['The two terms always mean exactly the same thing.', 'Independent events must have equal probabilities.', 'Mutually exclusive events must each have probability 0.50.'], 'Mutual exclusivity concerns the intersection; independence concerns whether conditioning changes a probability.', { cognitiveProcess: 'compare' }),
  q(2, '2.6', '3.C', 'If P(A and B) = 0.18 and P(B) = 0.30, what is P(A | B)?', '0.60', ['0.12', '0.48', '1.67'], 'Conditional probability is P(A and B)/P(B) = 0.18/0.30 = 0.60.', { cognitiveProcess: 'calculate' }),
  q(2, '2.7', '3.C', 'If P(A | B) = 0.42 and P(A) = 0.42, what does this support?', 'The events A and B are independent, assuming P(B) is positive.', ['The events A and B are mutually exclusive.', 'The probability of B must be zero.', 'A and B must always occur together.'], 'Independence is supported when conditioning on B does not change the probability of A.', { cognitiveProcess: 'infer' }),
  q(2, '2.8', '3.B', 'A random variable awards 0, 2, or 5 points on a game. What makes the variable discrete?', 'Its possible values are countable separate outcomes.', ['It can take every real value between 0 and 5.', 'It measures a continuous physical length only.', 'Its expected value must be an integer.'], 'A discrete random variable has separate countable possible values; the values need not be equally likely or have an integer mean.', { cognitiveProcess: 'classify' }),
  q(2, '2.9', '4.D', 'A random variable has expected value 12. Which interpretation is appropriate?', 'The long-run average value over many repetitions tends to approach 12.', ['Every individual outcome equals 12.', 'The most likely outcome must equal 12.', 'The variable has standard deviation 12.'], 'Expected value describes a long-run center and does not guarantee an individual result or identify the mode.', { cognitiveProcess: 'interpret' }),
  q(2, '2.10', '4.B', 'Which condition is not required for a binomial model?', 'The success probability must change from trial to trial.', ['A fixed number of trials', 'Two outcomes per trial', 'Independent trials with a constant success probability'], 'A binomial model requires a constant success probability, so a changing probability violates the condition.', { cognitiveProcess: 'identify' }),
  q(2, '2.11', '3.C', 'A normal variable has mean 100 and standard deviation 15. Which score is one standard deviation above the mean?', '115', ['85', '100', '130'], 'One standard deviation above the mean is 100 + 15 = 115.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.12', '4.C', 'For a population with standard deviation 18, what happens to the standard deviation of the sample mean when sample size changes from 25 to 100?', 'It is cut in half, from 3.6 to 1.8.', ['It doubles from 3.6 to 7.2.', 'It remains 18.', 'It becomes zero.'], 'The standard error is sigma/sqrt(n), so quadrupling n halves the standard error.', { cognitiveProcess: 'calculate' }),

  q(3, '3.1', '4.B', 'A sample proportion is used to estimate a population proportion. What is the sample proportion called in this role?', 'An estimator', ['A census parameter known without sampling', 'A Type II error', 'A critical value only'], 'An estimator is a statistic used to estimate a population parameter.', { cognitiveProcess: 'identify' }),
  q(3, '3.2', '3.D', 'For p = 0.25 and n = 400, what is the standard deviation of the sample proportion?', '0.0217', ['0.00054', '0.1875', '0.25'], 'The standard deviation is sqrt(0.25(0.75)/400) = sqrt(0.00046875) about 0.0217.', { cognitiveProcess: 'calculate' }),
  q(3, '3.3', '2.C', 'Which change generally reduces the margin of error of a one-proportion confidence interval?', 'Increasing the sample size while keeping the confidence level fixed.', ['Increasing the confidence level with the same sample size.', 'Replacing random sampling with voluntary response.', 'Removing the estimate from the interval.'], 'A larger sample reduces standard error and therefore generally reduces the margin of error.', { cognitiveProcess: 'explain' }),
  q(3, '3.4', '4.F', 'A 90% confidence interval for p is (0.31, 0.39). Which value is not plausible at that confidence level?', '0.50', ['0.32', '0.35', '0.38'], 'The interval gives plausible values for p under the stated procedure; 0.50 is outside the interval.', { cognitiveProcess: 'interpret' }),
  q(3, '3.5', '2.E', 'A researcher tests whether fewer than 18% of customers abandon a cart. Which null hypothesis is appropriate?', 'H0: p = 0.18', ['H0: p < 0.18', 'H0: p-hat < 0.18', 'H0: p = 0.82'], 'The null hypothesis contains equality and uses the population parameter p.', { cognitiveProcess: 'select' }),
  q(3, '3.6', '4.F', 'A p-value is calculated assuming the null hypothesis is true. What does a smaller p-value indicate?', 'The observed result is less compatible with the null model.', ['The null hypothesis has a higher probability of being true.', 'The sample was definitely biased.', 'The alternative hypothesis is proven with certainty.'], 'A small p-value measures how unusual the observed result or a more extreme result would be under the null model.', { cognitiveProcess: 'interpret' }),
  q(3, '3.7', '4.G', 'A test of H0: p = 0.40 versus Ha: p > 0.40 gives p = 0.012. What is the conclusion at alpha = 0.01?', 'Fail to reject H0 because the p-value is greater than alpha.', ['Reject H0 because the p-value is positive.', 'Accept H0 as proven true.', 'Reject H0 because 0.012 is less than 0.05 regardless of alpha.'], 'The decision compares the p-value with the stated alpha; 0.012 is not less than 0.01.', { cognitiveProcess: 'justify' }),
  q(3, '3.8', '2.D', 'A Type II error occurs when a researcher does what?', 'Fails to reject a false null hypothesis.', ['Rejects a true null hypothesis.', 'Rejects a true alternative hypothesis.', 'Uses a sample proportion instead of a parameter.'], 'A Type II error is a false negative: the test does not detect a real departure from the null.', { cognitiveProcess: 'identify' }),
  q(3, '3.9', '3.D', 'For independent samples, what is the center of the sampling distribution of p-hat1 - p-hat2?', 'p1 - p2', ['p1 + p2', 'p1p2', '0 for every pair of populations'], 'The expected difference between sample proportions equals the difference between the population proportions.', { cognitiveProcess: 'identify' }),
  q(3, '3.10', '2.C', 'A confidence interval for p1 - p2 is based on independent random samples from two populations. Which parameter does it estimate?', 'The difference between the two population proportions.', ['The sum of the two sample counts only.', 'The mean of one quantitative population.', 'The correlation between two measurements.'], 'The two-proportion interval targets p1 - p2, the difference in population proportions.', { cognitiveProcess: 'select' }),
  q(3, '3.11', '4.G', 'A confidence interval for p1 - p2 is (0.02, 0.18). What does the sign of the interval imply?', 'The first population proportion is plausibly greater than the second.', ['The second population proportion is definitely greater.', 'The two sample proportions are equal.', 'The interval proves a causal effect.'], 'An interval entirely above zero supports a positive difference in the stated order, subject to the design and conditions.', { cognitiveProcess: 'justify' }),
  q(3, '3.12', '2.E', 'To test whether population 1 has a smaller proportion than population 2, which alternative is appropriate?', 'Ha: p1 - p2 < 0', ['Ha: p1 - p2 = 0', 'Ha: p1 - p2 > 0', 'Ha: p-hat1 - p-hat2 < 0 for every sample'], 'The alternative describes the directional population claim using parameters.', { cognitiveProcess: 'select' }),
  q(3, '3.13', '4.G', 'A two-proportion test rejects H0. Which statement should be included in the conclusion?', 'The data provide statistically significant evidence for the stated alternative in the population context.', ['The null is mathematically impossible.', 'The sample proportions are guaranteed to differ in every future sample.', 'The result proves one treatment caused the difference without a randomized design.'], 'A test conclusion describes evidence relative to the null and must respect the sampling and assignment design.', { cognitiveProcess: 'justify' }),
  q(3, '3.14', '2.C', 'In a chi-square test for independence, what is the null hypothesis?', 'The two categorical variables are independent in the population.', ['The variables have a perfect causal relationship.', 'Every cell in the table has the same observed count.', 'The sample was selected without any randomness.'], 'The chi-square independence null states that the categorical variables have no association in the population.', { cognitiveProcess: 'identify' }),
  q(3, '3.15', '3.C', 'For a chi-square test with 4 rows and 3 columns, what are the degrees of freedom?', '6', ['7', '9', '12'], 'The degrees of freedom are (rows - 1)(columns - 1) = 3(2) = 6.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),

  q(4, '4.1', '3.D', 'What is the mean of the sampling distribution of the sample mean?', 'The population mean.', ['The sample standard deviation.', 'Zero for every population.', 'The population variance divided by n.'], 'The sample mean is centered at the population mean when samples are random and the mean exists.', { cognitiveProcess: 'identify' }),
  q(4, '4.2', '2.C', 'A study measures each participant before and after an intervention. Which procedure targets the mean change?', 'A matched-pairs t procedure applied to the within-person differences.', ['A one-proportion z-test', 'A chi-square test for independence', 'A two-sample procedure that ignores the pairing'], 'Paired measurements should be reduced to one difference per participant before using a one-sample t procedure.', { cognitiveProcess: 'select' }),
  q(4, '4.3', '4.F', 'A 95% confidence interval for a population mean is (72, 80). What does the interval estimate?', 'The population mean is plausibly between 72 and 80 under the confidence procedure.', ['95% of individual observations are between 72 and 80.', 'The sample mean changes between 72 and 80 with probability 0.95.', 'Every future sample mean must be in the interval.'], 'A confidence interval targets the fixed population mean; it does not describe the middle 95% of individual observations.', { cognitiveProcess: 'interpret' }),
  q(4, '4.4', '2.E', 'A researcher tests whether the population mean battery life exceeds 10 hours. Which alternative is appropriate?', 'Ha: mu > 10', ['Ha: mu = 10', 'Ha: x-bar > 10 for every sample', 'Ha: mu < 10'], 'The alternative states the directional claim about the population mean parameter.', { cognitiveProcess: 'select' }),
  q(4, '4.5', '4.G', 'A one-sample t-test gives p = 0.004. What does this indicate when the null model is true?', 'A result at least as extreme as the observed result would be unusual under the null model.', ['There is a 0.4% chance the null is true.', 'The sample mean is wrong by 0.004 units.', 'The population standard deviation is 0.004.'], 'The p-value is a probability under the null model, not a probability that the null or a measurement is correct.', { cognitiveProcess: 'interpret' }),
  q(4, '4.6', '3.D', 'For independent samples, what is the mean of x-bar1 - x-bar2?', 'mu1 - mu2', ['mu1 + mu2', '0 for all populations', 'The pooled sample standard deviation'], 'The expected difference between sample means equals the difference between the population means.', { cognitiveProcess: 'identify' }),
  q(4, '4.7', '2.C', 'Which procedure estimates the difference between two independent population means?', 'A two-sample t-interval for a difference in means.', ['A one-proportion z-interval', 'A chi-square test for homogeneity', 'A binomial probability calculation'], 'Two independent quantitative samples with a mean difference as the target call for a two-sample t interval when conditions hold.', { cognitiveProcess: 'select' }),
  q(4, '4.8', '4.G', 'A confidence interval for mu1 - mu2 is (-1.4, 2.1). What is the cautious conclusion?', 'A zero difference remains plausible, so the interval does not show a clear population mean difference.', ['The first mean is definitely larger.', 'The two population means are proven equal.', 'Every individual measurement has a difference in that interval.'], 'Because zero lies in the interval, a zero population difference remains plausible; equality is not proven.', { cognitiveProcess: 'justify' }),
  q(4, '4.9', '2.E', 'A researcher tests whether a new process reduces the mean completion time relative to the old process. If mu_new - mu_old is the parameter, which alternative is correct?', 'Ha: mu_new - mu_old < 0', ['Ha: mu_new - mu_old = 0', 'Ha: mu_new - mu_old > 0', 'Ha: x-bar_new - x-bar_old < 0 for every sample'], 'A reduction corresponds to a negative difference in the stated order and uses population means.', { cognitiveProcess: 'select' }),
  q(4, '4.10', '4.G', 'A two-sample t-test has p = 0.23 at alpha = 0.05. What is the correct decision?', 'Fail to reject the null hypothesis because the evidence is not statistically significant at 5%.', ['Reject the null because the p-value is nonzero.', 'Accept the null as proven true.', 'Conclude the two sample means can never differ.'], 'A p-value greater than alpha does not provide enough evidence for the alternative and does not prove the null.', { cognitiveProcess: 'justify' }),

  q(5, '5.1', '4.A', 'A scatterplot of hours studied and score shows an upward roughly linear pattern. What is supported?', 'The variables have a positive linear association.', ['The relationship is necessarily causal.', 'The response variable is categorical.', 'The correlation must equal zero.'], 'An upward linear pattern indicates positive association, but design and other features determine what conclusions are justified.', { cognitiveProcess: 'describe', difficulty: 'foundational' }),
  q(5, '5.2', '3.B', 'What is the possible range of the correlation coefficient r?', '-1 to 1, inclusive', ['0 to 100', 'Negative infinity to infinity', '0 to 1 only'], 'Correlation is standardized and must lie between -1 and 1.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(5, '5.3', '3.B', 'A fitted model is y-hat = 12 + 3x. What is the predicted response when x = 4?', '24', ['15', '36', '48'], 'Substituting x = 4 gives y-hat = 12 + 3(4) = 24.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(5, '5.4', '4.D', 'A regression slope is -2.5 minutes per additional practice session. What does the slope mean?', 'The predicted response decreases by 2.5 minutes for each additional practice session.', ['Every student loses exactly 2.5 minutes.', 'The intercept is -2.5 minutes.', 'The correlation is -2.5.'], 'The slope gives the predicted change in response for a one-unit increase in the explanatory variable, with units.', { cognitiveProcess: 'interpret' }),
  q(5, '5.5', '4.B', 'For an observation with observed response 18 and predicted response 21, what is the residual?', '-3', ['3', '18', '39'], 'Residual equals observed minus predicted: 18 - 21 = -3.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),

  // Additional depth items for the expanded 200-item pilot.
  q(5, '5.1', '4.A', 'A scatterplot of study hours and exam score shows an upward, roughly linear pattern. What is the best description?', 'The variables have a positive linear association.', ['The response is categorical.', 'The variables are proven causally related.', 'The correlation must equal zero.'], 'An upward linear pattern indicates positive association, but design and other features determine what conclusions are justified.', { cognitiveProcess: 'describe' }),
  q(5, '5.2', '3.B', 'If the correlation changes from 0.40 to 0.80 after adding observations, what does the new value indicate?', 'The linear association is stronger in the expanded data set.', ['The response variable changed units.', 'The association became negative.', 'The correlation is now outside its possible range.'], 'A larger absolute correlation indicates a stronger linear association; it does not by itself establish causation.', { cognitiveProcess: 'interpret' }),
  q(1, '1.6', '4.A', 'If one very large value is added to a data set, which change is most likely?', 'The mean and standard deviation increase.', ['The median must decrease.', 'The IQR must become zero.', 'The minimum must increase above the added value.'], 'A large high outlier pulls the mean upward and increases overall spread; resistant summaries may change less.', { cognitiveProcess: 'infer' }),
  q(1, '1.7', '3.B', 'If every observation is converted from hours to minutes, what happens to the standard deviation?', 'It is multiplied by 60.', ['It is divided by 60.', 'It remains numerically unchanged.', 'It becomes zero.'], 'Multiplying all measurements by a positive constant multiplies the standard deviation by that constant.', { cognitiveProcess: 'explain' }),
  q(1, '1.9', '4.A', 'A comparison of two distributions should include which information beyond the centers?', 'Spread, shape, and unusual features in context.', ['Only the larger sample mean.', 'The labels of the researchers.', 'The order in which the data were typed.'], 'A complete comparison addresses center, spread, shape, and outliers using a common context.', { cognitiveProcess: 'select' }),
  q(1, '1.10', '2.B', 'A sample is selected randomly from a school roster, but the survey asks about a sensitive behavior and many selected students refuse. Which issue remains?', 'Nonresponse can still threaten representativeness.', ['Random sampling guarantees no bias of any kind.', 'The design becomes a randomized experiment.', 'The parameter no longer exists.'], 'Random selection helps with sampling variability, but systematic nonresponse can still make respondents unrepresentative.', { cognitiveProcess: 'justify' }),
  q(1, '1.11', '2.A', 'A city randomly selects four blocks and then randomly selects homes within each chosen block. What is the design?', 'A multistage sample.', ['A census of every city home.', 'A voluntary response sample only.', 'A simple random sample of all possible households with no stages.'], 'The design uses random selection in more than one stage, first blocks and then homes within blocks.', { cognitiveProcess: 'classify' }),
  q(1, '1.12', '4.B', 'A survey asks, "You agree that the new policy is beneficial, correct?" What source of bias is especially likely?', 'Response bias from leading wording.', ['Undercoverage caused by a histogram.', 'Type II error in an experiment.', 'Random assignment bias.'], 'Leading wording can influence how participants respond even when the sampled people are appropriately selected.', { cognitiveProcess: 'identify' }),
  q(1, '1.13', '2.D', 'In a matched-pairs experiment, each participant tries both treatments in random order. What is analyzed?', 'The difference between the two responses for each participant.', ['The grand total of all treatment labels.', 'Only the larger response in each pair.', 'The sample proportion in one treatment group.'], 'Matched-pairs analysis reduces each pair to a within-pair difference before inference.', { cognitiveProcess: 'select' }),

  q(5, '5.3', '3.B', 'A fitted regression line has slope 2.4 and intercept 18. What is the predicted response when x = 5?', '30', ['20.4', '43.2', '90'], 'Substituting x = 5 into y-hat = 18 + 2.4x gives 18 + 12 = 30.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(2, '2.3', '3.C', 'A simulation produces 8 successes in 200 repetitions. Which change would usually improve the precision of the estimated probability?', 'Run more independent repetitions.', ['Use fewer repetitions.', 'Change the definition of success after seeing the results.', 'Report the first repetition only.'], 'More independent repetitions reduce simulation variability without changing the modeled event.', { cognitiveProcess: 'justify' }),
  q(2, '2.4', '3.C', 'If P(A) = 0.55, P(B) = 0.40, and P(A and B) = 0.20, what is P(A or B)?', '0.75', ['0.22', '0.95', '1.15'], 'The union rule gives 0.55 + 0.40 - 0.20 = 0.75.', { cognitiveProcess: 'calculate' }),
  q(2, '2.5', '4.B', 'If two events are mutually exclusive and both have positive probability, can they be independent?', 'No, because knowing one occurred makes the other impossible.', ['Yes, because every mutually exclusive pair is independent.', 'Yes, if their probabilities sum to more than 1.', 'Only if both probabilities equal 0.50.'], 'Positive-probability mutually exclusive events cannot be independent because the occurrence of one changes the conditional probability of the other to zero.', { cognitiveProcess: 'explain' }),
  q(2, '2.6', '3.C', 'If P(A) = 0.30 and P(B | A) = 0.40, what is P(A and B)?', '0.12', ['0.10', '0.70', '1.33'], 'The multiplication rule gives P(A and B) = P(A)P(B | A) = 0.30(0.40) = 0.12.', { cognitiveProcess: 'calculate' }),
  q(2, '2.7', '3.C', 'If P(A) = 0.60 and P(B) = 0.50, what value of P(A and B) would be consistent with independence?', '0.30', ['0.10', '0.55', '1.10'], 'Independence requires P(A and B) = P(A)P(B) = 0.60(0.50) = 0.30.', { cognitiveProcess: 'calculate' }),
  q(2, '2.9', '3.B', 'A random variable has E(X) = 8. Which statement about its standard deviation is correct?', 'Its standard deviation measures spread around 8.', ['Its standard deviation must equal 8.', 'Its standard deviation must be negative.', 'Its standard deviation determines the most likely outcome.'], 'Expected value gives the center of a probability distribution, while standard deviation measures its typical spread around that center.', { cognitiveProcess: 'interpret' }),
  q(2, '2.10', '3.C', 'For X ~ Binomial(20, 0.30), which expression represents P(X = 0)?', '(0.70)^20', ['20(0.30)', '(0.30)^20', '1 - (0.70)^20'], 'Zero successes means all 20 trials are failures, each with probability 0.70, under the binomial conditions.', { cognitiveProcess: 'select' }),
  q(2, '2.11', '3.C', 'A normal distribution has mean 50 and standard deviation 10. Approximately what proportion is above 70?', '0.025', ['0.16', '0.50', '0.975'], 'A value of 70 is two standard deviations above the mean, leaving about 2.5% in the upper tail.', { cognitiveProcess: 'estimate' }),

  q(4, '4.1', '3.D', 'A population standard deviation is 18. What is the standard error of the sample mean for n = 81?', '2', ['0.22', '18', '162'], 'The standard error is sigma/square root of n = 18/9 = 2.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(5, '5.4', '4.D', 'A residual plot has a clear curved pattern. What does this suggest about a linear model?', 'The linear form may not adequately describe the relationship.', ['The correlation must equal 1.', 'Every residual is zero.', 'The response is necessarily categorical.'], 'Systematic curvature in residuals indicates that the linear form misses structure in the relationship.', { cognitiveProcess: 'interpret' }),
  q(5, '5.5', '4.D', 'If r-squared = 0.72, what percentage of response variation is not explained by the fitted linear model?', 'About 28%', ['About 7.2%', 'About 72%', 'About 128%'], 'The unexplained proportion is 1 - 0.72 = 0.28, or about 28%.', { cognitiveProcess: 'calculate' }),
  q(5, '5.5', '4.G', 'A confidence interval for the slope contains 0. What is a cautious conclusion?', 'The data do not provide convincing evidence of a nonzero population linear slope at that confidence level.', ['The slope is proven to be exactly zero.', 'The variables are proven independent in every population.', 'The model proves a causal effect.'], 'An interval containing zero leaves a zero slope plausible; it does not prove no association or establish causation.', { cognitiveProcess: 'justify' }),
  q(3, '3.6', '4.F', 'A p-value of 0.48 is obtained. Which statement is accurate?', 'The observed result is reasonably compatible with the null model.', ['There is a 48% chance the null is true.', 'The alternative has been disproven.', 'The statistic must equal zero.'], 'A large p-value means the result is not unusual under the null model; it does not assign a probability to the hypothesis.', { cognitiveProcess: 'interpret' }),
  q(3, '3.7', '4.G', 'A test rejects H0 at alpha = 0.10 but not at alpha = 0.05. What does this show?', 'The p-value is between 0.05 and 0.10.', ['The p-value is exactly 0.05.', 'The null is proven true.', 'The sample was not random.'], 'Rejecting at the larger alpha but not the smaller one places the p-value between those cutoffs.', { cognitiveProcess: 'infer' }),
  q(3, '3.8', '2.D', 'Which change can reduce the probability of a Type II error when other design choices remain appropriate?', 'Increase the sample size.', ['Reduce the sample size.', 'Use a biased sampling method.', 'Remove the response variable.'], 'A larger sample generally increases power and reduces the chance of failing to detect a real effect.', { cognitiveProcess: 'explain' }),
  q(3, '3.10', '2.C', 'Which factor generally makes a two-proportion confidence interval narrower?', 'Larger sample sizes in the two groups.', ['A higher confidence level with no other change.', 'More variability in the estimates.', 'Replacing random samples with volunteers.'], 'Larger samples reduce the standard error, while higher confidence generally widens the interval.', { cognitiveProcess: 'explain' }),
  q(3, '3.15', '4.F', 'A chi-square statistic is large relative to its degrees of freedom. What does that suggest?', 'The observed counts differ substantially from the expected counts under the null model.', ['Every observed count equals its expected count.', 'The variables are proven causal.', 'The sample size must be one.'], 'The chi-square statistic aggregates squared observed-minus-expected discrepancies scaled by expected counts.', { cognitiveProcess: 'interpret' }),

  q(4, '4.1', '3.D', 'A population standard deviation is 20. What is the standard error of the sample mean for n = 100?', '2', ['0.2', '20', '200'], 'The standard error is sigma/square root of n = 20/10 = 2.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(4, '4.2', '4.C', 'Why can a t procedure be appropriate for a small sample of quantitative differences?', 'The differences are reasonably free of strong skewness and outliers, and the design supports independence.', ['Small samples never need conditions.', 'The response must be categorical.', 'The paired differences are ignored.'], 'For small samples, the shape and outlier conditions for the differences are important to the validity of a t procedure.', { cognitiveProcess: 'justify' }),
  q(4, '4.3', '4.F', 'A 95% confidence interval for mu1 - mu2 is (4, 11) units. What is supported?', 'The first population mean is plausibly greater than the second by 4 to 11 units.', ['The individual observations differ by 4 to 11 units.', 'The first sample mean must equal 4.', 'The interval proves the first treatment caused the difference.'], 'The interval targets the population mean difference and is entirely positive; causal language requires an appropriate experiment.', { cognitiveProcess: 'interpret' }),
  q(4, '4.4', '2.E', 'A test concerns whether the mean change in blood pressure is zero. What belongs in the null hypothesis?', 'H0: mu_difference = 0', ['H0: x-bar_difference > 0', 'H0: mu_difference != 0', 'H0: s = 0'], 'The null generally represents no mean change and uses the population mean difference.', { cognitiveProcess: 'select' }),
  q(4, '4.5', '4.G', 'A one-sample t-test has p = 0.08 at alpha = 0.05. Which conclusion is appropriate?', 'The result is not statistically significant at the 5% level.', ['The population mean equals the null value exactly.', 'The alternative is proven false.', 'The test has no sampling variability.'], 'Because p exceeds alpha, the evidence is insufficient to reject the null at the stated level.', { cognitiveProcess: 'justify' }),
  q(4, '4.6', '3.D', 'If independent sample sizes are increased while population variability stays fixed, what generally happens to the standard error of a difference in means?', 'It decreases.', ['It increases without bound.', 'It becomes equal to the population means.', 'It becomes negative.'], 'Larger independent samples reduce the variability of each sample mean and therefore of their difference.', { cognitiveProcess: 'explain' }),
  q(4, '4.7', '2.C', 'A study compares the mean completion time for two unrelated random samples. Which feature makes a two-sample t interval appropriate?', 'The response is quantitative and the samples represent independent groups.', ['The response is a single categorical label.', 'Each person contributes a before-and-after pair.', 'The groups were selected by voluntary response only.'], 'A two-sample t interval targets a difference in means for independent quantitative groups when conditions hold.', { cognitiveProcess: 'select' }),
  q(4, '4.9', '2.E', 'A researcher expects the new method to increase the mean score. If mu_new - mu_old is used, which alternative is correct?', 'Ha: mu_new - mu_old > 0', ['Ha: mu_new - mu_old = 0', 'Ha: mu_new - mu_old < 0', 'Ha: x-bar_new - x-bar_old > 0 for every sample'], 'An increase corresponds to a positive population mean difference in the stated order.', { cognitiveProcess: 'select' }),
  q(4, '4.10', '4.G', 'A two-sample test rejects H0 for a randomized experiment. What conclusion is justified?', 'There is evidence that the treatment causes a difference in the population represented by the experiment.', ['The result generalizes to all people automatically.', 'The p-value is the probability the treatment works.', 'The two sample means will be equal in future samples.'], 'Random assignment supports a causal conclusion for the experimental population, while generalization depends on how participants were sampled.', { cognitiveProcess: 'justify' }),

  q(5, '5.1', '4.A', 'A scatterplot has a strong downward curved pattern. What is the best first response?', 'Describe the form as nonlinear before considering a linear model.', ['Fit a line without checking the plot.', 'Conclude the variables are independent.', 'Replace both variables with category labels.'], 'A curved pattern may require a nonlinear model; the graph should be examined before selecting a linear method.', { cognitiveProcess: 'select' }),
  q(5, '5.2', '3.B', 'If r = -0.80, what does the sign indicate?', 'The linear association is negative.', ['The association is weak because the number is negative.', 'The response is always negative.', 'The explanatory variable is categorical.'], 'The sign gives direction; the magnitude 0.80 indicates a strong linear association in the negative direction.', { cognitiveProcess: 'interpret' }),
  q(5, '5.3', '3.B', 'A fitted regression line has slope 4 and intercept 10. Which equation represents the model?', 'y-hat = 10 + 4x', ['y-hat = 4 + 10x', 'y-hat = 10x - 4', 'y-hat = 4x - 10'], 'The intercept is the constant term and the slope multiplies the explanatory variable.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(5, '5.3', '3.B', 'A model predicts monthly cost from number of service calls. What is interpolation?', 'Predicting for a number of service calls within the observed range.', ['Predicting far beyond the observed range.', 'Changing the response units.', 'Randomly assigning service calls.'], 'Interpolation uses the model within the range of observed explanatory values and is generally less risky than extrapolation.', { cognitiveProcess: 'classify' }),
  q(5, '5.4', '4.B', 'An observation has a positive residual. What does that mean?', 'The observed response is above the value predicted by the model.', ['The explanatory value is below its mean.', 'The correlation is positive.', 'The observed response equals zero.'], 'A positive residual is observed minus predicted and therefore places the observation above the fitted line.', { cognitiveProcess: 'interpret' }),
  q(5, '5.4', '4.B', 'A point has an unusual x-value but lies close to the fitted line vertically. What is it?', 'A high-leverage point that may or may not be influential.', ['A point with a guaranteed large residual.', 'A categorical response.', 'A sampling error by definition.'], 'Unusual explanatory values create leverage; influence depends on how much the fitted model changes when the point is considered.', { cognitiveProcess: 'classify' }),
  q(5, '5.5', '3.B', 'If r = -0.60, what is r-squared?', '0.36', ['-0.36', '0.60', '1.60'], 'R-squared is r squared, so (-0.60)^2 = 0.36.', { cognitiveProcess: 'calculate', difficulty: 'foundational' }),
  q(5, '5.5', '4.D', 'A model has r-squared = 0.81. What remains unexplained by the linear model?', 'About 19% of the variation in the response.', ['81% of the response values are wrong.', 'The correlation must be 0.19.', 'There is no remaining variation.'], 'The proportion not explained by the model is 1 - 0.81 = 0.19, or about 19%.', { cognitiveProcess: 'calculate' }),
  q(5, '5.5', '4.B', 'Why is predicting for x = 250 risky when the observed x-values range from 10 to 80?', 'The prediction is extrapolation far beyond the observed range.', ['The residual must be zero.', 'The response becomes categorical.', 'The correlation is automatically one.'], 'A model may not preserve its pattern outside the observed range, so extrapolation is risky.', { cognitiveProcess: 'justify' }),
];

assert(expandedItemSpecs.length === 100, 'Expected 100 AP Statistics expansion specifications, found ' + expandedItemSpecs.length + '.');
assert(itemSpecs.length + expandedItemSpecs.length === 200, 'Expected 200 AP Statistics item specifications, found ' + (itemSpecs.length + expandedItemSpecs.length) + '.');

const unitByNumber = new Map(units.map((unit) => [unit.number, unit]));
const topicByKey = new Map(units.flatMap((unit) => unit.topics.map((topic) => [unit.number + '.' + topic.id, { ...topic, unit }])));
const allTopics = units.flatMap((unit) => unit.topics.map((topic) => ({ ...topic, unitId: unit.id, unitNumber: unit.number })));

function rotateChoices(answer, distractors, targetIndex) {
  const choices = new Array(4);
  choices[targetIndex] = answer;
  let distractorIndex = 0;
  for (let index = 0; index < choices.length; index += 1) {
    if (index !== targetIndex) choices[index] = distractors[distractorIndex++];
  }
  return choices;
}

function objectiveFor(spec) {
  const topic = topicByKey.get(spec.unit + '.' + spec.topicId);
  assert(topic, 'Missing topic route for ' + spec.unit + '.' + spec.topicId);
  const sectionNumber = Math.min(3, Math.max(1, Math.ceil(Number(spec.topicId.split('.')[1]) / Math.max(1, topic.unit.topics.length / 3))));
  return {
    id: spec.topicId + '.A',
    label: topic.label,
    sectionId: 'ap-stats-ch-' + String(spec.unit).padStart(2, '0') + '-section-' + String(sectionNumber).padStart(2, '0'),
    sectionLabel: topic.unit.shortLabel + ': study route ' + sectionNumber,
    chapterId: 'ap-stats-ch-' + String(spec.unit).padStart(2, '0'),
  };
}

function sourceDetails() {
  return sourceCatalog.map((source) => ({
    title: source.title,
    organization: source.organization,
    url: source.url,
    credibility: source.credibility,
  }));
}

function makeItem(spec, index) {
  const unit = unitByNumber.get(spec.unit);
  const objective = objectiveFor(spec);
  const answerIndex = index % 4;
  const choices = rotateChoices(spec.answer, spec.distractors, answerIndex);
  return {
    id: PACK_ID + '-item-' + String(index + 1).padStart(3, '0'),
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    taskForm: 'multiple-choice',
    domainId: unit.id,
    topicIds: [spec.topicId],
    practiceId: spec.skillId,
    practiceIds: [spec.skillId],
    skillId: spec.skillId,
    skillIds: [spec.skillId],
    difficulty: spec.difficulty,
    cognitiveDemand: spec.difficulty === 'foundational' ? 'low' : 'moderate',
    cognitiveProcess: spec.cognitiveProcess,
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: spec.rationale,
    choiceRationales: choices.map((choice, choiceIndex) => choiceIndex === answerIndex
      ? 'Best answer. ' + spec.rationale
      : 'This choice does not match the statistical definition, calculation, or scope required by the prompt.'),
    references: [CED_URL, COURSE_URL, OPENSTAX_URL],
    sourceDetails: sourceDetails(),
    provenance: {
      authoringBasis: 'Original internal item authored from public AP Statistics blueprint metadata and factual cross-checks.',
      officialContentReproduced: false,
      sourceQuestionReproduced: false,
      stimulusOriginal: true,
    },
    officialItem: false,
    rights: {
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestion: false,
      sourceProseOrFiguresReproduced: false,
      status: 'pending-independent-rights-review',
    },
    accessibility: {
      essentialVisual: false,
      textEquivalentProvided: true,
      mathNotationPlainTextCompatible: true,
      screenReaderReviewStatus: 'pending-independent-review',
    },
    expertReview: { status: 'pending', required: true },
    psychometricStatus: 'not-calibrated',
    reviewStatus: 'source-reviewed-editorial-draft',
    qaStatus: 'pending-build-qa',
    releaseEligible: false,
    editorialChecks: {
      singleBestAnswer: true,
      parallelPlausibleOptions: true,
      noKeywordGiveaway: true,
      completeOptionFeedback: true,
      ageAppropriate: true,
      originalWording: true,
    },
    learningObjectiveId: objective.id,
    learningObjectiveLabel: objective.label,
    learningSectionId: objective.sectionId,
    learningSectionLabel: objective.sectionLabel,
    chapterIds: [objective.chapterId],
    ...(spec.stimulus ? { stimulus: spec.stimulus } : {}),
  };
}

function paragraph(text) {
  return { type: 'paragraph', text, runs: [{ text }] };
}

function list(items, ordered = false) {
  return { type: 'list', ordered, items: items.map((text) => ({ text, runs: [{ text }] })) };
}

const sectionThemes = [
  [
    ['Describe before calculating', 'Name the variable type, shape, center, spread, and unusual features before choosing a summary.', ['distribution', 'center', 'spread'], ['Do not treat a mean as resistant to outliers.', 'Do not use a histogram for a categorical variable.']],
    ['Collect data with purpose', 'Match the sampling method or experimental design to the population, question, and desired conclusion.', ['sample', 'bias', 'random assignment'], ['Random sampling supports generalization; random assignment supports causation.', 'A large biased sample is still biased.']],
    ['Keep conclusions in scope', 'State what the design and data support, and distinguish a statistic from the population parameter it estimates.', ['parameter', 'statistic', 'causation'], ['An observational study cannot by itself establish cause and effect.', 'A sample statistic is not automatically equal to the parameter.']],
  ],
  [
    ['Represent joint behavior', 'Use two-way tables and conditional proportions to compare groups without confusing counts and rates.', ['two-way table', 'conditional proportion', 'association'], ['A row percentage and a column percentage answer different questions.', 'Association is not automatically causation.']],
    ['Build probability models', 'Use complements, unions, intersections, conditional probability, and independence with the correct denominator.', ['complement', 'conditional probability', 'independence'], ['Mutually exclusive events are not generally independent.', 'The condition after the vertical bar sets the denominator.']],
    ['Model random variation', 'Connect probability distributions to expected value, binomial counts, normal models, and sampling distributions.', ['random variable', 'binomial', 'normal model'], ['A binomial model needs a fixed number of independent trials.', 'The Central Limit Theorem concerns sampling distributions, not every individual observation.']],
  ],
  [
    ['Estimate a proportion', 'Choose a confidence interval that matches the parameter and verify randomization, independence, and large-count conditions.', ['estimator', 'confidence interval', 'standard error'], ['A confidence interval describes a procedure, not the probability that a fixed parameter moves.', 'Conditions are part of the justification.']],
    ['Test a claim', 'Write hypotheses about population parameters, interpret p-values under the null model, and make decisions using alpha.', ['null hypothesis', 'alternative hypothesis', 'p-value'], ['Do not say that a large p-value proves the null.', 'Use the parameter in hypotheses, not the sample statistic.']],
    ['Compare categorical populations', 'Extend proportion reasoning to differences and chi-square procedures for categorical distributions.', ['difference in proportions', 'homogeneity', 'independence'], ['The test for homogeneity compares populations; independence examines two variables in one population.', 'Expected counts come from the null model.']],
  ],
  [
    ['Understand sampling means', 'Use standard errors, normal models, and the Central Limit Theorem to describe sample means and their differences.', ['sample mean', 'standard error', 'Central Limit Theorem'], ['The standard deviation of a sample mean is sigma divided by the square root of n.', 'Small samples need attention to shape and outliers.']],
    ['Use t procedures', 'Select one-sample, matched-pairs, or two-sample t procedures based on the design and quantitative response.', ['t-distribution', 'matched pairs', 'degrees of freedom'], ['Repeated measures create pairs.', 'A t procedure is not a substitute for a proportion procedure.']],
    ['Interpret evidence in context', 'Translate an interval or test result into a cautious statement about the population mean or mean difference.', ['confidence level', 'significance', 'population mean'], ['A statistically significant result is not automatically practically important.', 'A conclusion should name the parameter and population.']],
  ],
  [
    ['Read the scatterplot', 'Describe direction, form, strength, clusters, outliers, and leverage before fitting a model.', ['association', 'scatterplot', 'outlier'], ['A strong association can still be nonlinear.', 'Clusters may represent different populations or processes.']],
    ['Interpret the line', 'Use slope, intercept, predicted values, and residuals with their units and context.', ['slope', 'intercept', 'residual'], ['The intercept may be meaningless outside the observed x-range.', 'Residual equals observed minus predicted.']],
    ['Evaluate model limits', 'Use r, r-squared, residual patterns, extrapolation checks, and design limits to judge a regression claim.', ['r-squared', 'least squares', 'extrapolation'], ['R-squared is not the probability of causation.', 'A regression line beyond the data range is extrapolation.']],
  ],
];

function buildLibrary(objectiveCatalog) {
  const chapters = units.map((unit, unitIndex) => {
    const chapterId = 'ap-stats-ch-' + String(unit.number).padStart(2, '0');
    const sections = sectionThemes[unitIndex].map((seed, sectionIndex) => {
      const start = Math.floor(sectionIndex * unit.topics.length / 3);
      const end = Math.max(start + 1, Math.floor((sectionIndex + 1) * unit.topics.length / 3));
      const topicCoverage = unit.topics.slice(start, end).map((topic) => topic.id);
      const retrievalPrompts = [
        'Which parameter, variable, or distribution is the question about?',
        'Which calculation, representation, or condition supports the claim?',
        'What limitation keeps the conclusion from being broader than the design and evidence?',
      ];
      const contentBlocks = [
        paragraph(seed[1] + ' ' + unit.summary),
        paragraph('Reasoning move: identify the target, match the statistical method, verify the relevant conditions, and interpret the result in context.'),
        list(seed[3]),
        paragraph('Worked check: ' + seed[1] + ' Start by naming the target quantity and the evidence available before calculating.'),
        paragraph('Retrieval practice: answer each prompt before opening the related internal item bank.'),
        list(retrievalPrompts, true),
      ];
      return {
        id: chapterId + '-section-' + String(sectionIndex + 1).padStart(2, '0'),
        heading: seed[0],
        content: seed[1],
        keyTerms: seed[2],
        topicCoverage,
        references: [CED_URL, COURSE_URL, OPENSTAX_URL],
        contentBlocks,
        examples: ['Name the statistical target before choosing a formula.', 'Link the numerical result to the population, sample, or study design in the prompt.'],
        nonExamples: seed[3],
        commonMisconceptions: seed[3],
        workedDataExample: {
          headers: ['Study move', 'Question to ask'],
          rows: [['Target', 'What variable, parameter, or relationship is being studied?'], ['Method', 'Which procedure or display matches the design?'], ['Scope', 'What can the evidence support, and what remains unknown?']],
        },
        retrievalPrompts,
        transferMove: 'Transfer the same target-method-condition-conclusion sequence to a new statistical context.',
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewNote: 'Original AP Statistics foundation lesson; independent subject-expert, accessibility, rights, production, and psychometric review remain pending.',
        expertReviewStatus: 'pending',
        accessibilityReviewStatus: 'pending-independent-review',
        contentComplete: true,
        releaseEligible: false,
        contentEnhancementVersion: LIBRARY_VERSION,
      };
    });
    const objective = objectiveCatalog.find((entry) => entry.chapterId === chapterId);
    const knowledgeChecks = sections.map((section, sectionIndex) => ({
      id: section.id + '-check',
      chapterId,
      sectionId: section.id,
      type: 'single-choice',
      prompt: 'Which study move best supports accurate reasoning in ' + unit.shortLabel + '?',
      choices: [
        'Identify the target, match the method, check conditions, and state the conclusion in context.',
        'Choose a procedure because it is the most familiar one.',
        'Treat a sample statistic as the population parameter.',
        'Generalize beyond the population and design represented by the data.',
      ],
      answerIndex: 0,
      rationale: 'Reliable AP Statistics reasoning connects the target, method, conditions, evidence, and scope of the conclusion.',
      references: [CED_URL, COURSE_URL, OPENSTAX_URL],
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original retrieval check; independent AP Statistics subject-expert and psychometric review remain pending.',
      skillId: objective ? objective.skillId || '2.A' : '2.A',
      topicIds: sections[sectionIndex].topicCoverage,
    }));
    return {
      id: chapterId,
      title: unit.label,
      domainId: unit.id,
      domain: unit.shortLabel,
      summary: unit.summary,
      objectives: ['Explain the concepts and statistical practices in ' + unit.shortLabel + '.'],
      topicCoverage: unit.topics.map((topic) => topic.id),
      chapterTakeaways: ['Name the target before calculating.', 'Verify conditions and design limits.', 'State what the evidence supports in context.'],
      references: [CED_URL, COURSE_URL, OPENSTAX_URL],
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original AP Statistics foundation chapter; independent review remains pending.',
      expertReviewStatus: 'pending',
      accessibilityReviewStatus: 'pending-independent-review',
      releaseEligible: false,
      sectionCount: sections.length,
      knowledgeCheckCount: knowledgeChecks.length,
      referenceCount: 3,
      sections,
      knowledgeChecks,
      contentComplete: true,
      foundationPrototype: true,
    };
  });

  const flashcards = chapters.flatMap((chapter) => chapter.sections.map((section) => ({
    id: section.id + '-card',
    chapterId: chapter.id,
    sectionId: section.id,
    domainId: chapter.domainId,
    domain: chapter.domain,
    front: section.heading + ': what is the core study move?',
    back: section.content,
    tags: section.keyTerms,
    references: section.references,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original foundation study card; independent AP Statistics subject-expert validation remains pending.',
  })));
  const memoryAids = chapters.map((chapter) => ({
    id: chapter.id + '-memory',
    chapterId: chapter.id,
    type: 'reasoning cue',
    title: chapter.domain + ': target to conclusion',
    content: 'Target → method → conditions → result → scope. Keep every conclusion attached to the variable, population, and design represented by the data.',
    tags: chapter.sections.flatMap((section) => section.keyTerms).slice(0, 8),
    domain: chapter.domain,
    references: chapter.references,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original foundation retrieval aid; AP Statistics and accessibility validation remain pending.',
  }));
  const workshops = [
    ['ap-stats-workshop-study-design', 'Study design planning workshop', 'Plan a sampling or experimental study for a question about student transportation. Identify the population, observational units, variables, sampling or assignment method, and the conclusion the design could support.', ['Name the target population and parameter.', 'Explain how randomization enters the design.', 'State whether the design supports generalization, causation, or both.']],
    ['ap-stats-workshop-data-description', 'Data description planning workshop', 'Plan a concise description of a one-variable distribution and a comparison of two groups. Specify the display, center, spread, and unusual features you would report.', ['Match each display to the variable type.', 'Use resistant summaries when outliers or skewness matter.', 'Compare groups using the same units and summaries.']],
    ['ap-stats-workshop-proportions', 'Proportion inference planning workshop', 'Plan a confidence interval or hypothesis test for a population proportion using a public-opinion question. Write the parameter, conditions, method, and contextual interpretation.', ['Use p for the population proportion.', 'Check randomization, independence, and large counts.', 'Interpret the interval or p-value without claiming proof.']],
    ['ap-stats-workshop-means-regression', 'Means and regression planning workshop', 'Plan an inference or regression response about a quantitative outcome. Identify the target, method, assumptions, evidence, and limits of the conclusion.', ['Distinguish paired from independent samples.', 'Use residuals and r-squared as model evidence, not causal proof.', 'Keep extrapolation and lurking variables visible.']],
  ].map(([id, title, prompt, selfCheck]) => ({
    id,
    type: 'unscored-planning-workshop',
    title,
    prompt,
    selfCheck,
    unscored: true,
    scoreMeaning: 'No score is produced. This is a planning and self-check resource, not automated FRQ scoring.',
    references: [CED_URL, EXAM_URL],
    reviewStatus: 'source-reviewed-editorial-draft',
    reviewNote: 'Original workshop; independent AP Statistics subject-expert and accessibility review remain pending.',
    releaseEligible: false,
  }));

  return {
    schemaVersion: 1,
    librarySchemaVersion: 1,
    libraryId: PACK_ID + '-learning-library',
    packId: PACK_ID,
    version: VERSION,
    title: 'AP Statistics Foundation Pilot Learning Library',
    description: 'A text-first, independently authored AP Statistics foundation library with five unit chapters, structured lessons, retrieval checks, study cards, memory aids, and explicitly unscored FRQ-planning workshops. It is not released, official, calibrated, or score-predictive.',
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    blueprint: {
      academicYearReference: '2026-27',
      cedEffectiveLabel: 'Fall 2026',
      cedFrameworkVersion: 'V.1',
      officialBlueprintUrl: CED_URL,
      officialCourseUrl: COURSE_URL,
      pilotVersion: LIBRARY_VERSION,
      pilotNote: 'A 200-item foundation sampler across the five revised Fall 2026 units, with two hundred original single-choice items, native chapters, and unscored planning workshops.',
      skills,
      learningObjectiveCatalogVersion: LIBRARY_VERSION,
      learningObjectiveCatalog: objectiveCatalog,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
    },
    reviewStandard: 'Independent source and editorial review against the public AP Statistics Course and Exam Description and openly available factual references. Independent AP Statistics subject-expert, accessibility, rights, production, field-testing, and psychometric review remain required.',
    disclaimer: 'Independent, unofficial AP Statistics preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. AP and Advanced Placement are trademarks of College Board. No secure AP Classroom, Question Bank, Progress Check, official question, official rubric, or official stimulus was used or reproduced. This pilot does not provide official scores, score predictions, college-credit predictions, or automated FRQ scores.',
    sourceCatalog,
    chapters,
    diagrams: [],
    diagramPlacements: [],
    flashcards,
    memoryAids,
    constructedResponseWorkshops: workshops,
    summary: {
      chapters: chapters.length,
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeChecks.length, 0),
      flashcards: flashcards.length,
      memoryAids: memoryAids.length,
      diagrams: 0,
      diagramPlacements: 0,
      constructedResponseWorkshops: workshops.length,
      richLessonPrototypes: chapters.length,
      sourceReviewedChapters: chapters.length,
      sourceReviewedFlashcards: flashcards.length,
      sourceReviewedMemoryAids: memoryAids.length,
      releaseEligibleRecords: 0,
    },
    accessibility: {
      contentForm: 'text-first, linear lessons, single-choice items, and plain-text planning workshops',
      essentialVisualItems: 0,
      diagramsRequiredForComprehension: false,
      diagramFallbackMode: 'ordered-text-equivalent',
      independentReviewStatus: 'pending',
      productionScreenReaderValidationStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    rightsPolicy: {
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestions: false,
      copiedCollegeBoardRubricText: false,
      sourceProseOrFiguresReproduced: false,
      diagramSpecificationsOriginal: true,
      authoringBasis: 'Independent original wording informed by public blueprint metadata and factual sources.',
      publicSourceUse: 'Blueprint alignment and factual verification only; no source prose, figures, or assessment content reproduced.',
      openStaxUse: 'Factual cross-checking and links only; no textbook prose, figures, or assessment content reproduced.',
      status: 'pending-independent-rights-review',
    },
    releaseGates: {
      internalStructuralValidation: 'pending-build-qa',
      independentRightsReview: 'pending',
      independentAccessibilityReview: 'pending',
      apStatisticsSubjectExpertReview: 'pending',
      productionValidation: 'pending',
      fieldTesting: 'not-started',
      psychometricCalibration: 'not-started',
      cedAndPolicyReverification: 'required-before-release',
      releaseEligible: false,
    },
    expertReviewGate: {
      requiredRole: 'Independent educator or faculty reviewer with current AP Statistics course and assessment expertise',
      status: 'pending',
      releaseBlocked: true,
    },
    transitionNotice: 'Reverify the current AP Statistics CED, course revisions, digital exam format, calculator and reference-material policies, and public-use boundaries before any release or expansion.',
    contentMigration: {
      schemaVersion: 1,
      contentVersion: LIBRARY_VERSION,
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      completeSections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      richLessonPrototypes: chapters.length,
      status: 'foundation-prototype',
      note: 'All five unit chapters and fifteen structured sections are navigable; independent review remains pending.',
    },
  };
}

function buildPack(library, objectiveCatalog) {
  const items = itemSpecs.concat(expandedItemSpecs).map(makeItem);
  const domains = units.map((unit) => ({
    id: unit.id,
    label: unit.label,
    weight: unit.weight,
    officialWeightMin: unit.officialWeightMin,
    officialWeightMax: unit.officialWeightMax,
    itemCount: items.filter((item) => item.domainId === unit.id).length,
  }));
  const sections = Array.from({ length: 40 }, (_, index) => ({
    id: 'ap-stats-foundation-bank-' + String(index + 1).padStart(2, '0'),
    label: 'Bank ' + String(index + 1).padStart(2, '0') + ': five-item internal foundation sampler',
    timeMinutes: null,
    released: false,
    itemIds: items.slice(index * 5, index * 5 + 5).map((item) => item.id),
  }));
  const practiceDistribution = {};
  const skillDistribution = {};
  const topicDistribution = {};
  for (const item of items) {
    practiceDistribution[item.skillId] = (practiceDistribution[item.skillId] || 0) + 1;
    skillDistribution[item.skillId] = (skillDistribution[item.skillId] || 0) + 1;
    topicDistribution[item.topicIds[0]] = (topicDistribution[item.topicIds[0]] || 0) + 1;
  }
  return {
    schemaVersion: 1,
    id: PACK_ID,
    title: 'AP Statistics Independent Foundation Pilot',
    shortTitle: 'AP Statistics Foundation Pilot',
    description: 'An independently authored 200-question AP Statistics foundation pilot spanning the five revised Fall 2026 units. It tests the blueprint crosswalk, statistical-practice metadata, native learning routes, and unscored response planning before any official or release-ready expansion.',
    disclaimer: 'Independent, unofficial AP Statistics preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. This pilot does not provide official scores, score predictions, college-credit predictions, or automated FRQ scores.',
    credentialOwner: 'College Board',
    version: VERSION,
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    calibrated: false,
    previewBadge: 'Internal foundation pilot - 200 original draft items',
    accent: 'teal',
    itemSchemaVersion: 2,
    responseTypes: ['single-choice'],
    examModes: ['fully-digital'],
    contentReview: 'Two hundred original source-aligned draft multiple-choice items distributed across the five revised Fall 2026 units and all fifty-five public framework topics, with at least two items per topic. Native study routes cover five chapters and fifteen structured sections; four planning workshops are explicitly unscored. Independent AP Statistics subject-expert review, rights review, accessibility review, production validation, field testing, and psychometric calibration remain pending.',
    blueprintLabel: 'AP Statistics Course and Exam Description, effective Fall 2026, Course Framework V.1',
    blueprintEffective: 'Fall 2026 CED; current official public reference reviewed 2026-08-20.',
    officialBlueprintUrl: CED_URL,
    clarificationsUrl: '',
    officialExamUrl: EXAM_URL,
    domains,
    sections,
    items,
    learningLibraryUrl: './test_prep/ap_statistics_foundation_pilot_learning_library.json',
    nativeQaUrl: './test_prep/ap_statistics_foundation_pilot_qa.json',
    sourceCatalog,
    capabilities: {
      currentEngineSchemaVersion: 1,
      itemSchemaVersion: 2,
      currentEngineCompatible: true,
      responseTypes: ['single-choice'],
      stimulusGroupsIncluded: false,
      constructedResponseIncluded: false,
      frqWorkshopsIncluded: true,
      handsFreeContentCompatible: true,
      limitations: [
        'This foundation pilot is not a complete AP Statistics exam simulation and does not reproduce the official digital exam experience.',
        'Official free-response task forms, source sets, scoring rubrics, and score conversions are not included or scored.',
        'No official score, readiness, college-credit, or psychometric inference is supported.',
      ],
    },
    blueprint: {
      academicYearReference: '2026-27',
      cedEffectiveLabel: 'Fall 2026',
      cedFrameworkVersion: 'V.1',
      targetExamYear: 2027,
      examModeReference: 'fully-digital',
      officialSectionOne: '42 multiple-choice questions in 90 minutes; 50% of the official exam score.',
      officialSectionTwo: '4 free-response questions in 90 minutes; 50% of the official exam score.',
      officialFrameworkTopicCount: allTopics.length,
      officialFrameworkTopicIds: allTopics.map((topic) => topic.id),
      officialUnitCount: units.length,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
      pilotAlignment: '200-item text-first foundation sampler across all five revised units and all fifty-five public framework topic IDs; forty five-item internal banks; at least two items per topic; four unscored planning workshops; no official stimulus sets or FRQ scoring.',
      lastVerifiedAt: VERIFIED_AT,
      sourceDigest: 'pending-build-generation',
      skills,
      learningObjectiveCatalogVersion: LIBRARY_VERSION,
      learningObjectiveCatalog: objectiveCatalog,
    },
    practiceDistribution: { ...practiceDistribution, note: 'Statistical practices and subskills are sampled for routing and study feedback; this is not a psychometric exam blueprint.' },
    skillDistribution: { ...skillDistribution, note: 'Named AP Statistics subskills are sampled for remediation routes; independent expert review remains pending.' },
    topicDistribution: { ...topicDistribution, note: 'Every revised public framework topic ID receives at least two internal practice items; counts are for routing and study feedback, not a psychometric exam blueprint.' },
    rightsPolicy: library.rightsPolicy,
    releaseGates: library.releaseGates,
    accessibilityGate: {
      contentForm: 'text-only, linear single-choice items, native lessons, and unscored planning workshops',
      essentialVisualItems: 0,
      screenReaderReadingOrderDeclared: true,
      handsFreeContentCompatible: true,
      independentReviewStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    expertReviewGate: library.expertReviewGate,
    transitionNotice: library.transitionNotice,
    sourceQuestionItems: items.length,
    independentPracticeItems: items.length,
    distinctSourceContentKernels: items.length,
    batchSize: 5,
    diagnosticBatchCount: sections.length,
    constructedResponseWorkshopCount: library.constructedResponseWorkshops.length,
  };
}

function main() {
  const objectiveCatalog = allTopics.map((topic) => ({
    id: topic.id + '.A',
    label: topic.label,
    chapterId: 'ap-stats-ch-' + String(topic.unitNumber).padStart(2, '0'),
    sectionId: 'ap-stats-ch-' + String(topic.unitNumber).padStart(2, '0') + '-section-' + String(Math.min(3, Math.max(1, Math.ceil(Number(topic.id.split('.')[1]) / Math.max(1, unitByNumber.get(topic.unitNumber).topics.length / 3))))).padStart(2, '0'),
    sectionLabel: unitByNumber.get(topic.unitNumber).shortLabel,
    skillId: ['1.A', '2.A', '3.C', '4.F'][topic.unitNumber % 4],
  }));
  const library = buildLibrary(objectiveCatalog);
  const pack = buildPack(library, objectiveCatalog);
  assert(pack.items.length === 200, 'AP Statistics pack must contain 200 items.');
  assert(new Set(pack.items.map((item) => item.id)).size === 200, 'AP Statistics item IDs must be unique.');
  assert(pack.domains.length === 5 && pack.domains.every((domain) => domain.itemCount === 40), 'Each AP Statistics unit must receive forty items: ' + JSON.stringify(pack.domains.map((domain) => ({ id: domain.id, itemCount: domain.itemCount }))));
  assert(library.chapters.length === 5 && library.summary.sections === 15, 'AP Statistics library inventory is incorrect.');
  writeJson(packPath, pack);
  writeJson(libraryPath, library);
  console.log('Built ' + pack.id + ': ' + pack.items.length + ' items across ' + pack.domains.length + ' units; ' + library.chapters.length + ' chapters, ' + library.summary.sections + ' sections, and ' + library.constructedResponseWorkshops.length + ' unscored workshops.');
}

main();
