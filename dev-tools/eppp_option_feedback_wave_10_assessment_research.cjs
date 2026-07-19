'use strict';

const revisions = {
  'eppp-b014-assessment-2': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Pearson\'s official BASC-3 materials describe triangulation across parent, teacher, and self perspectives, distinguish the home/community and school contexts sampled by the rating forms, add direct observation and developmental-history methods, compare corresponding scores across raters, and caution that a generated report should not be the sole basis for diagnostic or treatment decisions. Peer-reviewed observational research further shows that parent-teacher discrepancies can track cross-context behavioral variation and informants\' perspectives. The key therefore emphasizes contextual investigation and multi-method integration rather than averaging, informant hierarchy, or premature threshold attribution.',
    feedbackDesign: ['cross-informant-score-averaging', 'informant-hierarchy', 'rater-threshold-overattribution'],
    prompt: 'On a BASC-3 evaluation, a parent rates hyperactivity as clinically significant while a teacher rates it in the average range. Both protocols appear interpretable, and interview data suggest that behavior changes with task structure. What is the most defensible next step?',
    choices: {
      0: 'Average the two T scores and treat the mean as a context-neutral estimate',
      1: 'Give the teacher rating priority because teachers observe same-age peers',
      2: 'Examine setting demands and rater perspectives, then integrate additional data',
      3: 'Interpret the discrepancy primarily as a difference in rater thresholds and qualify the parent elevation accordingly',
    },
    rationale: 'Multi-informant ratings sample behavior from different observers and settings. A discrepancy can reflect contextual demands, opportunity to observe, rater perspective, or measurement error, so it should generate hypotheses to examine with interviews, records, observation, and validity information. Neither mechanical averaging nor a fixed informant hierarchy resolves the discrepancy.',
    references: [
      'https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-multirater-report-sample.pdf',
      'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Behavior/Behavior-Assessment-System-for-Children-C-Third-Edition/p/100001402',
      'https://pubmed.ncbi.nlm.nih.gov/19247829/',
    ],
    sourceDetails: [
      {
        url: 'https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-multirater-report-sample.pdf',
        title: 'BASC-3 Rating Scales Multirater Report Sample',
        organization: 'Pearson Clinical Assessment',
        summary: 'Pearson\'s official sample report displays corresponding BASC-3 scale scores for multiple raters, flags statistically significant rater differences, reports profile similarity and validity information, and cautions against using the generated report as the sole basis for important decisions.',
        credibility: 'Pearson publishes and scores the BASC-3, and this document is an official output authored by the test developers, Randy Kamphaus and Cecil Reynolds. It directly documents how the instrument presents multi-rater agreement, discrepancies, validity indicators, and interpretive limits.',
      },
      {
        url: 'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Behavior/Behavior-Assessment-System-for-Children-C-Third-Edition/p/100001402',
        title: 'Behavior Assessment System for Children, Third Edition (BASC-3)',
        organization: 'Pearson Assessments',
        summary: 'Pearson\'s official BASC-3 documentation describes its triangulation of parent, teacher, and self perspectives, identifies the distinct home/community and school settings sampled by the rating forms, and documents direct-observation and developmental-history components that can supplement ratings.',
        credibility: 'Pearson is the BASC-3 publisher, so this is primary documentation for the instrument\'s forms, settings, and intended multi-method structure. It is authoritative for test design and administration, while independent research remains necessary for empirical claims about discrepancy meaning.',
      },
      {
        url: 'https://pubmed.ncbi.nlm.nih.gov/19247829/',
        title: 'Linking Informant Discrepancies to Observed Variations in Young Children\'s Disruptive Behavior',
        organization: 'Journal of Abnormal Child Psychology; National Library of Medicine PubMed record',
        summary: 'In a study of 327 preschoolers, behavior observed in different interaction contexts related uniquely to parent- and teacher-identified behavior, supporting the interpretation that informant discrepancies can reflect cross-context behavioral variation and distinct informant perspectives.',
        credibility: 'This peer-reviewed empirical study is indexed by the U.S. National Library of Medicine and was supported by NIH- and CDC-linked grants. Its observational design directly tests whether informant discrepancies correspond to behavior that varies across contexts.',
      },
    ],
    qualityFlags: [
      'Replaces absolute distractors with plausible but flawed methods for resolving a parent-teacher discrepancy.',
      'Tests integrative interpretation of multi-informant evidence rather than simple recognition that several BASC-3 forms exist.',
    ],
    incorrectFeedback: {
      0: 'Mechanical averaging can conceal a meaningful home-school difference and creates a composite whose interpretation is not established merely because both inputs are T scores. The clinician should first investigate why opportunities, demands, or observed behavior differ across settings.',
      1: 'Teacher access to same-age peers can inform interpretation, but it does not create a general evidentiary hierarchy over caregivers. Each informant observes different situations, so the teacher score cannot resolve the discrepancy without corroborating contextual data.',
      3: 'Different response thresholds can contribute to informant disagreement, yet interpretable protocols do not establish that threshold variation produced this pattern. Qualifying the parent elevation before corroboration would suppress a potentially meaningful setting effect; interviews, observation, and validity data should test competing explanations.',
    },
  },
  'eppp-v3-assessment-041': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'The APA Dictionary of Psychology identifies the Seashore Rhythm and Finger Tapping tests among the five core HRNB subtests. A peer-reviewed Brain and Language methods section describes the Reitan Rhythm Test as paired five-, six-, or seven-note patterns requiring same-or-different judgments, while peer-reviewed Behavior Research Methods documentation describes Finger Tapping as rapid index-finger key depression during timed 10-second trials administered separately to each hand. Together these sources support the exact nomenclature, task contrast, and preserved key.',
    feedbackDesign: ['finger-tapping-domain-confusion', 'tactual-performance-visual-guidance', 'category-test-grip-strength-confusion'],
    prompt: 'An examiner is checking a trainee\'s description of the Halstead-Reitan Neuropsychological Battery. Which option correctly matches two core subtests with their task demands?',
    choices: {
      0: 'Category Test - abstract concept formation; Finger Tapping - auditory sequencing',
      1: 'Speech Sounds Perception - auditory discrimination; Tactual Performance - visually guided form-board copying',
      2: 'Seashore Rhythm Test - paired-rhythm discrimination; Finger Tapping - fine-motor speed',
      3: 'Tactual Performance Test - tactile-spatial problem solving; Category Test - maximal grip strength',
    },
    rationale: 'The Seashore Rhythm Test requires judging whether paired rhythmic patterns are the same or different, whereas Finger Tapping samples rapid unilateral motor output. The other pairings attach a plausible HRNB function to the wrong subtest or misstate how the task is administered.',
    references: [
      'https://dictionary.apa.org/halstead-reitan-neuropsychological-battery',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC2364719/',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC3151309/',
    ],
    sourceDetails: [
      {
        url: 'https://dictionary.apa.org/halstead-reitan-neuropsychological-battery',
        title: 'Halstead-Reitan Neuropsychological Battery (HRNB)',
        organization: 'APA Dictionary of Psychology, American Psychological Association',
        summary: 'The APA entry defines the HRNB, names its five core and five optional subtests, and identifies the broad cognitive and sensorimotor functions represented in the battery.',
        credibility: 'The American Psychological Association is the principal U.S. professional organization for psychology, and its editorially maintained dictionary is an authoritative terminology source. This entry directly names the HRNB core subtests and their intended functional coverage.',
      },
      {
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2364719/',
        title: 'Speech Perception and Short-Term Memory Deficits in Persistent Developmental Speech Disorder',
        organization: 'Brain and Language; National Institute of Neurological Disorders and Stroke, National Institutes of Health',
        summary: 'The methods describe the Reitan Neuropsychology Laboratory Rhythm Test as pairs of five-, six-, or seven-note rhythmic patterns for which examinees make same-or-different judgments, directly documenting paired-rhythm discrimination.',
        credibility: 'This is a peer-reviewed Brain and Language article archived by the U.S. National Library of Medicine. Its investigators were primarily affiliated with the National Institute of Neurological Disorders and Stroke, and its methods explicitly document the task mechanics used in the study.',
      },
      {
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3151309/',
        title: 'Measuring Motor Speed Through Typing: A Surrogate for the Finger Tapping Test',
        organization: 'Behavior Research Methods; Oregon Health & Science University',
        summary: 'The article describes the Finger Tapping Test as depressing a key rapidly with the index finger during a 10-second interval, testing each hand separately and summarizing performance across repeated trials.',
        credibility: 'This peer-reviewed Behavior Research Methods study is indexed in PubMed and archived by the U.S. National Library of Medicine. Its procedure used manual tapping equipment obtained from the Reitan Neuropsychology Laboratory and reports the task mechanics in replicable detail.',
      },
    ],
    qualityFlags: [
      'Corrects the imprecise Rhythm Test label to Seashore Rhythm Test and replaces an unspecific battery-membership question with matched task demands.',
      'Makes each distractor partly plausible by pairing a genuine HRNB subtest or function with one consequential mismatch.',
    ],
    incorrectFeedback: {
      0: 'The Category Test does involve concept formation and abstraction, so the first half is plausible. Finger Tapping, however, records rapid motor output from each hand; auditory pattern discrimination belongs to the Seashore Rhythm and Speech Sounds Perception tasks.',
      1: 'Speech Sounds Perception does require auditory-verbal discrimination, but the Tactual Performance task is not ordinary visually guided copying. The examinee places blocks in a form board without vision, adding tactile-spatial problem solving and incidental spatial-memory demands.',
      3: 'Tactual Performance does sample tactile-spatial problem solving, which makes this pairing tempting. Maximal grip strength is measured with a separate grip-strength procedure; the Category Test instead assesses abstraction, concept formation, and learning from feedback.',
    },
  },
  'eppp-v3-research-002': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Statistics Canada defines stratified sampling by partitioning the target population into mutually exclusive, exhaustive strata and selecting samples within strata. Its survey manual separately distinguishes proportional from disproportionate allocation, confirming that unequal sampling fractions do not change a probability design into another sampling method.',
    feedbackDesign: ['unequal-fractions-as-nonprobability', 'strata-versus-clusters', 'weights-versus-selection-design'],
    prompt: 'A licensing survey divides its frame into rural and urban practice strata, selects an independent random sample in each, and samples rural psychologists at a higher rate. Which interpretation is most accurate?',
    choices: {
      0: 'It is nonprobability sampling because stratum sampling fractions differ',
      1: 'It is cluster sampling because practice location defines the groups',
      2: 'It remains stratified; proportional allocation is a design choice',
      3: 'It becomes simple random sampling once design weights are applied',
    },
    rationale: 'Stratification is defined by partitioning the frame into nonoverlapping, exhaustive strata and sampling within them. Allocation may be proportional or disproportionate. Oversampling a smaller stratum can improve its estimate, while appropriate weighting is then needed for population-level estimates when selection probabilities differ.',
    references: [
      'https://www150.statcan.gc.ca/n1/pub/12-001-x/2019002/article/00006/02-eng.htm',
      'https://www150.statcan.gc.ca/n1/en/pub/12-587-x/12-587-x2003001-eng.pdf',
    ],
    sourceDetails: [
      {
        url: 'https://www150.statcan.gc.ca/n1/pub/12-001-x/2019002/article/00006/02-eng.htm',
        title: 'A General Sampling System for Multi-Objective Surveys: Section 2, Stratified Sampling',
        organization: 'Survey Methodology, Statistics Canada',
        summary: 'This section defines strata as well-defined, mutually exclusive, exhaustive population subgroups and explains that stratification can improve overall precision or control stratum-specific sample sizes and precision.',
        credibility: 'Statistics Canada is Canada\'s national statistical agency, and Survey Methodology is its peer-reviewed research journal. The article provides a technically explicit definition of stratification and describes its design purposes.',
      },
      {
        url: 'https://www150.statcan.gc.ca/n1/en/pub/12-587-x/12-587-x2003001-eng.pdf',
        title: 'Survey Methods and Practices',
        organization: 'Statistics Canada and Library and Archives Canada',
        summary: 'The official survey manual explains sample allocation across strata, distinguishes common-fraction proportional allocation from unequal-rate disproportionate allocation, and develops stratum-weighted estimators for stratified samples.',
        credibility: 'Statistics Canada is Canada\'s national statistical agency, and Library and Archives Canada preserves this official methodological manual. Its chapters on allocation and estimation directly support retaining an oversample while weighting population estimates.',
      },
    ],
    qualityFlags: [
      'Corrects the bank\'s substantive overclaim that stratified random sampling necessarily produces proportional representation.',
      'Uses unequal sampling fractions to distinguish stratification from allocation, clustering, nonprobability selection, and post-selection weighting.',
    ],
    incorrectFeedback: {
      0: 'Different sampling fractions do not make selection nonprobabilistic when each unit has a known, nonzero chance through random sampling within its stratum. The unequal fractions describe disproportionate allocation and must be reflected in population estimation.',
      1: 'Cluster sampling selects a subset of groups and samples units from those chosen clusters. Here rural and urban categories partition the population into strata, and an independent sample is drawn from each category rather than selecting a subset of locations.',
      3: 'Design weights affect how selected observations contribute to estimates; they do not retroactively alter the sample-selection procedure. A sample drawn independently within defined strata remains a stratified design before and after weighting.',
    },
  },
  'eppp-v2-research-003': {
    expectedAnswerIndex: 3,
    difficulty: 'advanced',
    sourceCheck: 'Statistics Canada explains that disproportionate allocation samples strata at different rates and that proportional allocation is only one option. For an aggregate population estimate after deliberate oversampling, stratum estimates must be recombined according to population sizes, equivalently using design weights based on selection probabilities; random selection within strata alone does not justify an unweighted pooled estimate.',
    feedbackDesign: ['discarding-oversample', 'equal-stratum-weighting', 'unweighted-pooling-under-unequal-selection'],
    prompt: 'A survey oversamples rural psychologists so the rural estimate will meet its precision target. Response rates are similar across rural and urban strata, and reliable population counts are available. To estimate the population-wide burnout proportion, the analyst should:',
    choices: {
      0: 'Remove rural cases until sample shares mirror the population shares',
      1: 'Give the rural and urban sample proportions equal influence',
      2: 'Pool respondent records without weights because selection was random within strata',
      3: 'Combine stratum estimates using their population shares or equivalent design weights',
    },
    rationale: 'Disproportionate allocation intentionally gives strata different selection probabilities. The analyst can retain the rural oversample and estimate the population proportion by weighting stratum estimates by known population shares, or by applying equivalent inverse-probability design weights to records. Equal or unweighted pooling would generally target the sample composition rather than the population composition.',
    references: ['https://www150.statcan.gc.ca/n1/en/pub/12-587-x/12-587-x2003001-eng.pdf'],
    sourceDetails: [
      {
        url: 'https://www150.statcan.gc.ca/n1/en/pub/12-587-x/12-587-x2003001-eng.pdf',
        title: 'Survey Methods and Practices',
        organization: 'Statistics Canada and Library and Archives Canada',
        summary: 'The official survey manual explains sample allocation across strata, distinguishes common-fraction proportional allocation from unequal-rate disproportionate allocation, and develops stratum-weighted estimators for stratified samples.',
        credibility: 'Statistics Canada is Canada\'s national statistical agency, and Library and Archives Canada preserves this official methodological manual. Its chapters on allocation and estimation directly support retaining an oversample while weighting population estimates.',
      },
    ],
    qualityFlags: [
      'Replaces an inaccurate definition item with an advanced estimation decision following purposeful subgroup oversampling.',
      'Separates the benefit of subgroup precision from the weighting required to recover a population-composition estimate.',
    ],
    incorrectFeedback: {
      0: 'Discarding valid rural observations could recreate proportional allocation, but it sacrifices the subgroup precision the oversample was designed to provide. Design weighting uses the full probability sample while adjusting each stratum\'s contribution to the population estimate.',
      1: 'Equal influence estimates the midpoint of the two stratum proportions, not the population proportion, unless the strata happen to be equally large. Known population counts should determine each stratum\'s contribution to the aggregate estimate.',
      2: 'Random selection within each stratum supports valid stratum estimates, but unequal sampling fractions give rural and urban records different selection probabilities. Unweighted pooling can therefore distort the aggregate when stratum sizes or burnout rates differ.',
    },
  },
};

module.exports = { revisions };
