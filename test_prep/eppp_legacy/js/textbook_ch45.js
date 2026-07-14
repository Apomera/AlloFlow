/* ============================================================
   PasstheEPPP â€” Textbook Ch 45: Sampling, Scales & Special Topics
   Domain: Research Methods & Statistics (7% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-45',
    domain: 'Research Methods & Statistics',
    domainNumber: 8,
    title: 'Sampling, Measurement & Special Topics',
    examWeight: '7%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>This closing chapter covers foundational topics that cut across research design and statistics: sampling methods, measurement scales, reliability/validity in research context, and special design considerations. These "connecting" concepts tie together everything in the domain.</p>'
        },
        {
            heading: 'Sampling Methods',
            content: '<p><strong>Probability sampling</strong> gives each population unit a known, nonzero selection probability and supports design-based estimates when the frame, selection, weighting, measurement, and response processes are adequate. It does not guarantee that one realized sample is representative or that findings generalize to every setting.</p>' +
                '<table>' +
                '<tr><th>Method</th><th>Description</th></tr>' +
                '<tr><td><strong>Simple random</strong></td><td>Every member has an equal chance of selection</td></tr>' +
                '<tr><td><strong>Stratified random</strong></td><td>Population divided into strata (e.g., gender, ethnicity), then random sample from each stratum</td></tr>' +
                '<tr><td><strong>Cluster</strong></td><td>Randomly select naturally occurring groups, then observe all units or a probability sample within selected clusters; clustering affects precision and should be reflected in analysis</td></tr>' +
                '<tr><td><strong>Systematic</strong></td><td>After a random start, select every <em>k</em>th unit; inspect ordering for periodic patterns that could bias selection</td></tr>' +
                '</table>' +
                '<p><strong>Non-probability sampling</strong> uses unknown selection probabilities. It can answer valuable questions, but population inference depends on explicit modeling assumptions, coverage, recruitment, adjustment, and transparency rather than a conventional design-based margin of sampling error.</p>' +
                '<table>' +
                '<tr><th>Method</th><th>Description</th></tr>' +
                '<tr><td><strong>Convenience</strong></td><td>Whoever is available (most common, least generalizable)</td></tr>' +
                '<tr><td><strong>Purposive</strong></td><td>Researcher selects participants who meet specific criteria</td></tr>' +
                '<tr><td><strong>Snowball</strong></td><td>Participants recruit other participants (hard-to-reach populations)</td></tr>' +
                '<tr><td><strong>Quota</strong></td><td>Non-random version of stratified sampling (fill category quotas)</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Simple random sampling gives equal selection probability; other probability designs can use unequal known probabilities. Stratification samples within defined strata. Cluster designs sample groups and may continue with another sampling stage. Snowball or respondent-driven recruitment uses participant networks. Evaluate the frame, nonresponse, weighting, measurement, and target population before claiming generalizability.</p>',
            keyTerms: ['Simple random', 'Stratified random', 'Cluster', 'Systematic', 'Convenience', 'Purposive', 'Snowball', 'Probability sampling'],
            knowledgeCheck: {
                question: 'A researcher studying injection drug users recruits initial participants from a needle exchange program and asks them to refer other drug users. This sampling method is:',
                options: [
                    'Stratified random sampling',
                    'Convenience sampling',
                    'Snowball sampling',
                    'Cluster sampling'
                ],
                answer: 2,
                rationale: 'Option C is best because initial participants recruit people from their networks, the defining feature of snowball sampling. Recruiting only at the needle-exchange site would be convenience sampling; adding peer referrals changes the design. The method can improve access to networked or less readily enumerated populations, but dependence on network structure and recruitment means population inference requires additional assumptions and design features. It is not accurate to say that useful inference is categorically impossible.'
            }
        },
        {
            heading: 'Scales of Measurement',
            content: '<p><strong>Stevens\u2019 four scales of measurement (NOIR):</strong></p>' +
                '<table>' +
                '<tr><th>Scale</th><th>Properties</th><th>Examples</th><th>Statistics</th></tr>' +
                '<tr><td><strong>Nominal</strong></td><td>Categories only (no order)</td><td>Gender, diagnosis, race</td><td>Mode, chi-square</td></tr>' +
                '<tr><td><strong>Ordinal</strong></td><td>Ordered categories (unequal intervals)</td><td>Class rank, Likert items, severity ratings</td><td>Median, Spearman, nonparametric tests</td></tr>' +
                '<tr><td><strong>Interval</strong></td><td>Equal intervals, <em>no true zero</em></td><td>Temperature (\u00b0F/\u00b0C), IQ scores, standard scores</td><td>Mean, SD, Pearson r, t-test, ANOVA</td></tr>' +
                '<tr><td><strong>Ratio</strong></td><td>Equal intervals + <em>true zero</em></td><td>Height, weight, reaction time, income</td><td>All statistics + ratios (\"twice as much\")</td></tr>' +
                '</table>' +
                '<p><strong>Key distinctions:</strong></p>' +
                '<ul>' +
                '<li>Measurement level informs coding and interpretation, but nominal or ordinal variables do not automatically force one named family of tests</li>' +
                '<li>Model choice also depends on the estimand, design, distribution, link function, dependence, and robustness; a parametric model is not defined solely by normally distributed raw scores</li>' +
                '<li>Ratio interpretations require a meaningful zero for the attribute; even then, scientific meaning depends on the construct and measurement process</li>' +
                '<li>Conventional IQ scores are norm-referenced transformations without a meaningful absence-of-intelligence zero, so statements such as IQ 100 being twice IQ 50 are not supported</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> NOIR is a useful vocabulary for permissible transformations and interpretations, not an automatic test-selection algorithm. IQ and other standard scores do not support ratio claims. Choose an analysis from the research question, design, outcome structure, assumptions, and evidence about robustness.</p>',
            keyTerms: ['Nominal', 'Ordinal', 'Interval', 'Ratio', 'NOIR', 'True zero', 'Stevens'],
            expandableCase: {
                title: 'Is IQ 100 Twice as Smart as IQ 50? The True Zero Problem',
                clinicalDescription: 'A graduate student presents research findings claiming that a child with an IQ of 140 is \"twice as intelligent\" as a child with an IQ of 70. The professor asks: \"What scale of measurement is IQ?\"',
                diagnosis: 'Misunderstanding Interval vs. Ratio Scales',
                explanation: 'Conventional IQ scores are norm-referenced standard scores and do not have a meaningful zero that represents absence of intelligence. Therefore the ratio claim is invalid: 140 cannot be interpreted as twice 70. Treating equal score differences as equally meaningful is a measurement-model convention that should also be interpreted with reliability, uncertainty, the reference norm, and the construct in mind; the conclusion does not require claiming that intelligence itself has perfectly equal units.'
            }
        },
        {
            heading: 'Special Research Considerations',
            content: '<p><strong>Cross-sectional vs. Longitudinal vs. Cross-sequential:</strong></p>' +
                '<table>' +
                '<tr><th>Design</th><th>Description</th><th>Strength</th><th>Weakness</th></tr>' +
                '<tr><td><strong>Cross-sectional</strong></td><td>Different age groups measured at one time</td><td>Quick, inexpensive</td><td><strong>Cohort effects</strong> (generational differences)</td></tr>' +
                '<tr><td><strong>Longitudinal</strong></td><td>Same group measured over time</td><td>Tracks developmental change</td><td>Time-consuming, <strong>attrition</strong>, <strong>practice effects</strong></td></tr>' +
                '<tr><td><strong>Cross-sequential (Schaie)</strong></td><td>Multiple cohorts measured at multiple times</td><td>Provides overlapping age, cohort, and period comparisons</td><td>Complex and still depends on identification assumptions, measurement invariance, and attrition</td></tr>' +
                '</table>' +
                '<p><strong>Qualitative research methods:</strong></p>' +
                '<ul>' +
                '<li><strong>Grounded theory</strong>: Theory emerges from data through iterative coding (Glaser & Strauss)</li>' +
                '<li><strong>Phenomenology</strong>: Understanding the lived experience of participants</li>' +
                '<li><strong>Ethnography</strong>: Immersive study of a cultural group</li>' +
                '<li><strong>Case study</strong>: In-depth analysis of a single case or small number of cases</li>' +
                '</ul>' +
                '<p><strong>Mixed methods</strong>: Integrates quantitative and qualitative components when their combination answers the question better than either alone. Triangulation can expose convergence or disagreement; it does not automatically strengthen a conclusion.</p>' +
                '<p><strong>Analogue research</strong>: Studies a theoretically relevant process under simplified or controlled conditions. Inference to clinical populations or settings depends on whether participants, manipulations, measures, and context preserve the features needed for the claim.</p>' +
                '<p><strong>EPPP Tip:</strong> Cross-sectional age comparisons combine age and cohort differences. Longitudinal designs reveal within-person change but face attrition, retest, and period effects. Cross-sequential designs add overlapping cohorts and occasions, helping evaluate competing explanations without automatically controlling every confound. Grounded theory develops theory iteratively from data.</p>',
            keyTerms: ['Cross-sectional', 'Longitudinal', 'Cross-sequential', 'Cohort effects', 'Grounded theory', 'Phenomenology', 'Ethnography', 'Mixed methods', 'Analogue', 'Schaie'],
            knowledgeCheck: {
                question: 'A study compares memory performance in 20-year-olds, 40-year-olds, and 60-year-olds, all tested at the same time. The results show 60-year-olds perform worst. The MOST significant limitation of this finding is:',
                options: [
                    'Attrition \u2014 participants dropped out over time',
                    'Practice effects \u2014 participants improved from repeated testing',
                    'Cohort effects \u2014 generational differences may explain the results, not aging',
                    'Regression to the mean \u2014 extreme scores moved toward average'
                ],
                answer: 2,
                rationale: 'Option C is best because age group and birth cohort vary together in this single-occasion comparison, so the observed difference cannot be attributed to aging alone. Attrition and repeated-test practice effects require follow-up occasions and therefore do not describe this design. A cross-sequential design adds cohorts and measurement occasions, which can help separate age, cohort, and period patterns under explicit assumptions; it does not guarantee that all three are perfectly controlled.'
            }
        }
    ],
    aiCoda: {
        teaser: 'The final chapter \u2014 and the methods used to study what I am.',
        content: '<p>Sampling and measurement questions also apply to research on AI systems. The target population must be defined: model versions, deployments, prompts, users, outputs, or affected communities are different units, and none is represented automatically by a convenient prompt set.</p>' +
            '<p>A comparison of model versions at one time can mix architecture, training data, prompting, and deployment context. Repeated evaluation can track change, but software updates, data contamination, and shifting measurement instruments complicate interpretation. Multiple versions measured across occasions may help examine these sources without magically identifying each effect.</p>' +
            '<p>Claims about subjective experience require a defensible construct and measurement argument before a score is calculated. Behavioral ratings may be useful for a specified purpose, but a numerical scale does not by itself establish consciousness or personhood.</p>' +
            '<p>The practical lesson is to state the population, sampling mechanism, construct, unit, comparison, and limits of inference. Those choices matter more than attaching a prestigious method label after data are collected.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> NOIR describes measurement properties but does not mechanically select a statistical test. Probability sampling supports design-based inference when implementation and response are adequate; it does not guarantee representativeness. Nonprobability inference requires explicit assumptions. Cross-sectional designs mix age and cohort; longitudinal designs add attrition and retest concerns; cross-sequential designs add overlapping cohorts and occasions without eliminating every confound. Mixed-method triangulation can reveal convergence or disagreement.'
    },
    references: [
        'Creswell, J. W., & Creswell, J. D. (2018). <em>Research design: Qualitative, quantitative, and mixed methods approaches</em> (5th ed.). Sage.',
        'Schaie, K. W. (2013). <em>Developmental influences on adult intelligence: The Seattle Longitudinal Study</em> (2nd ed.). Oxford University Press.',
        'Stevens, S. S. (1946). On the theory of scales of measurement. <em>Science, 103</em>(2684), 677\u2013680.'
    ]
});
