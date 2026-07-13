/* ============================================================
   PasstheEPPP — Textbook Ch 1: Psychometric Foundations
   Domain: Assessment & Diagnosis (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-1',
    domain: 'Assessment & Diagnosis',
    domainNumber: 1,
    title: 'Psychometric Foundations',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Assessment and Diagnosis accounts for <strong>16% of the current EPPP Part 1–Knowledge blueprint used in 2026 and 2027</strong>. Psychometrics is its foundation. ASPPB plans to introduce an integrated EPPP blueprint beginning in fall 2027, so candidates should confirm which examination pathway and blueprint apply in their jurisdiction.</p>' +
                '<p>This chapter covers the core psychometric principles that underpin all psychological measurement: Classical Test Theory, reliability types, validity types, the Standard Error of Measurement, and modern advances like Item Response Theory and Generalizability Theory.</p>'
        },
        {
            heading: 'Classical Test Theory (CTT)',
            content: '<p>Classical Test Theory (CTT) rests on a deceptively simple equation:</p>' +
                '<p class="formula"><strong>X = T + E</strong></p>' +
                '<p>Where <strong>X</strong> is the observed score, <strong>T</strong> is the true score (the expected score across a defined set of hypothetical replications of the testing procedure), and <strong>E</strong> is error (random fluctuation).</p>' +
                '<p><strong>Key assumptions of CTT:</strong></p>' +
                '<ul>' +
                '<li>The expected value of error scores across repeated measurements is zero: <em>E(e) = 0</em></li>' +
                '<li>True scores and error scores are uncorrelated</li>' +
                '<li>Error scores across different tests are uncorrelated</li>' +
                '</ul>' +
                '<p>CTT treats reliability as the proportion of observed score variance that is true score variance: <em>r = \u03C3\u00B2(T) / \u03C3\u00B2(X)</em>. Under the CTT model for a specified population and testing procedure, a reliability of .90 means 90% of observed-score variance is attributed to true-score variance and 10% to error variance. It does not mean that each person\'s score is 90% accurate.</p>' +
                '<p><strong>EPPP Tip:</strong> A conventional CTT report often gives one population-level SEM, which can hide changes in precision across score levels. A <em>conditional SEM</em> can be estimated at a particular score level; IRT models conditional precision directly through information functions.</p>',
            keyTerms: ['True score', 'Observed score', 'Error score', 'X = T + E', 'CTT assumptions']
        },
        {
            heading: 'Reliability: Is the Test Consistent?',
            content: '<p>Reliability refers to the <strong>consistency and stability</strong> of test scores. A reliable test produces similar results under consistent conditions. Remember: <em>reliability is necessary but not sufficient for validity</em> — a test can be reliably wrong.</p>' +
                '<p><strong>Types of reliability (with coefficients):</strong></p>' +
                '<table>' +
                '<tr><th>Type</th><th>What It Measures</th><th>Method</th><th>Best For</th><th>Watch Out For</th></tr>' +
                '<tr><td><strong>Test-Retest</strong></td><td>Stability over time</td><td>Same test, same people, two occasions; correlate scores</td><td>Stable traits (IQ, personality)</td><td>Practice effects, memory, true change</td></tr>' +
                '<tr><td><strong>Parallel/Alternate Forms</strong></td><td>Equivalence across versions</td><td>Two equivalent forms; correlate scores</td><td>Reducing practice effects</td><td>Hard to create truly parallel forms</td></tr>' +
                '<tr><td><strong>Internal Consistency</strong></td><td>Item homogeneity</td><td>Single administration; \u03B1, KR-20, or split-half</td><td>Multi-item scales measuring one construct</td><td>Inflated by test length; not for speed tests</td></tr>' +
                '<tr><td><strong>Inter-Rater</strong></td><td>Agreement between raters</td><td>Cohen\'s kappa (\u03BA) or ICC</td><td>Subjective scoring (essays, behavioral coding)</td><td>Rater drift, training effects</td></tr>' +
                '</table>' +
                '<p><strong>Cronbach\'s Alpha (\u03B1)</strong> is the most commonly reported internal consistency coefficient. It is computed from the number of components, their interrelationships, and total-score variance. Alpha alone does not prove unidimensionality. KR-20 (Kuder-Richardson Formula 20) is the coefficient-alpha form for dichotomously scored items.</p>' +
                '<p><strong>Split-half reliability</strong> divides a test into two halves and correlates the scores. The raw half-test correlation describes two shorter forms, not the full test. The <strong>Spearman-Brown prophecy formula</strong> estimates full-length reliability from that correlation; the result can depend on how the items were split.</p>',
            keyTerms: ['Test-retest', 'Parallel forms', 'Internal consistency', 'Inter-rater', 'Cronbach\'s alpha', 'KR-20', 'Split-half', 'Spearman-Brown', 'Cohen\'s kappa']
        },
        {
            heading: 'The Standard Error of Measurement (SEM)',
            content: '<p>The SEM summarizes <strong>score inconsistency across hypothetical replications</strong> for a specified population and testing procedure. In the conventional CTT formulation it is estimated as:</p>' +
                '<p class="formula"><strong>SEM = SD \u00d7 \u221a(1 \u2212 r)</strong></p>' +
                '<p>Where <em>SD</em> is the standard deviation of the test and <em>r</em> is the reliability coefficient.</p>' +
                '<p><strong>Using the SEM to build confidence intervals:</strong></p>' +
                '<ul>' +
                '<li>68% CI: Score \u00b1 1 SEM</li>' +
                '<li>95% CI: Score \u00b1 1.96 SEM (~2 SEM)</li>' +
                '<li>99% CI: Score \u00b1 2.58 SEM (~2.5 SEM)</li>' +
                '</ul>' +
                '<p><strong>Example:</strong> A student scores 100 on a test with SD = 15 and reliability = .91. SEM = 15 \u00d7 \u221a(1 \u2212 .91) = 15 \u00d7 .30 = 4.5 points. The 95% CI is approximately 100 \u00b1 9, or [91, 109]. Under the model assumptions, the interval procedure is designed to cover the true score about 95% of the time across repeated uses; the reported interval is approximately [91, 109].</p>' +
                '<p><strong>EPPP Tip:</strong> Higher reliability \u2192 smaller SEM \u2192 narrower confidence intervals \u2192 more precise measurement. Holding the observed-score SD and model definition fixed, higher reliability produces a smaller conventional SEM.</p>',
            keyTerms: ['SEM', 'Confidence interval', 'SEM formula', '68-95-99 rule'],
            knowledgeCheck: {
                question: 'If a test developer revises a personality inventory and successfully increases its internal consistency reliability from .75 to .90, what will happen to the Standard Error of Measurement (SEM)?',
                options: [
                    'The SEM will increase proportionally.',
                    'The SEM will decrease, resulting in narrower confidence intervals.',
                    'The SEM will remain unchanged because it depends only on the test\'s standard deviation.',
                    'The SEM will become zero.'
                ],
                answer: 1,
                rationale: 'The Standard Error of Measurement (SEM) is inversely related to reliability (SEM = SD × √(1 - r)). When reliability increases, measurement error decreases, meaning the SEM shrinks and confidence intervals become narrower and more precise.'
            }
        },
        {
            heading: 'Validity: Does the Test Measure What It Claims?',
            content: '<p>Validity is the <strong>degree to which evidence supports the intended interpretation of test scores</strong> for its proposed purpose. Modern standards treat validity as a <em>unitary argument</em> about a proposed score interpretation and use. Evidence may come from test content, response processes, internal structure, relations to other variables, and consequences of testing.</p>' +
                '<p><strong>Sources of validity evidence:</strong></p>' +
                '<table>' +
                '<tr><th>Traditional Label</th><th>What It Assesses</th><th>Methods</th></tr>' +
                '<tr><td><strong>Content Validity</strong></td><td>Does the test adequately sample the content domain?</td><td>Expert review, content specification table, test blueprint</td></tr>' +
                '<tr><td><strong>Criterion-Related: Concurrent</strong></td><td>Does the test correlate with a current criterion?</td><td>Test scores correlated with current criterion data (same time point)</td></tr>' +
                '<tr><td><strong>Criterion-Related: Predictive</strong></td><td>Does the test predict future outcomes?</td><td>Test scores correlated with future criterion data (later time point)</td></tr>' +
                '<tr><td><strong>Construct Validity</strong></td><td>Does the test measure the theoretical construct it claims to?</td><td>Factor analysis, convergent/discriminant validity, MTMM, known-groups validity</td></tr>' +
                '<tr><td><strong>Face Validity</strong></td><td>Does the test <em>appear</em> to measure what it claims? (not technically validity)</td><td>Subjective judgment by test-takers or lay observers</td></tr>' +
                '</table>' +
                '<p><strong>Key distinctions for the EPPP:</strong></p>' +
                '<ul>' +
                '<li><strong>Content</strong> validity involves expert judgment about item representativeness; it is NOT based on statistical analysis</li>' +
                '<li><strong>Concurrent</strong> validity: test and criterion measured at the <em>same time</em></li>' +
                '<li><strong>Predictive</strong> validity: test measured <em>now</em>, criterion measured <em>later</em></li>' +
                '<li><strong>Face validity</strong> is NOT true validity — it\'s about appearance, not measurement accuracy</li>' +
                '<li><strong>Validity belongs to a proposed interpretation and use</strong>, not to a test in the abstract; converging evidence and plausible alternative explanations both matter</li>' +
                '</ul>',
            keyTerms: ['Content validity', 'Criterion validity', 'Concurrent validity', 'Predictive validity', 'Construct validity', 'Face validity', 'Messick']
        },
        {
            heading: 'The Multitrait-Multimethod Matrix (MTMM)',
            content: '<p>Campbell and Fiske (1959) introduced the MTMM matrix as a systematic approach to evaluating <strong>convergent and discriminant validity</strong> — two essential components of construct validity.</p>' +
                '<p><strong>How it works:</strong></p>' +
                '<ol>' +
                '<li>Measure <strong>multiple traits</strong> (e.g., anxiety, depression, self-esteem)</li>' +
                '<li>Using <strong>multiple methods</strong> (e.g., self-report, clinician rating, behavioral observation)</li>' +
                '<li>Organize correlations into a matrix</li>' +
                '</ol>' +
                '<p><strong>Reading the matrix:</strong></p>' +
                '<table>' +
                '<tr><th>Correlation Type</th><th>What It Shows</th><th>Expected Pattern</th></tr>' +
                '<tr><td><strong>Monotrait-Heteromethod</strong></td><td>Same trait, different methods</td><td>HIGH = convergent validity</td></tr>' +
                '<tr><td><strong>Heterotrait-Monomethod</strong></td><td>Different traits, same method</td><td>LOW = discriminant validity (low method bias)</td></tr>' +
                '<tr><td><strong>Heterotrait-Heteromethod</strong></td><td>Different traits, different methods</td><td>LOWEST = baseline</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> If heterotrait-monomethod correlations (same method, different traits) are high, this suggests <em>method variance</em> — the method is creating artificial correlation, not the constructs themselves. This is a threat to discriminant validity.</p>' +
                '<p>Modern analysis of MTMM data often uses <strong>Confirmatory Factor Analysis (CFA)</strong> rather than just visual inspection, allowing researchers to model trait factors and method factors simultaneously and estimate their relative contributions.</p>',
            keyTerms: ['Campbell and Fiske', 'MTMM', 'Convergent validity', 'Discriminant validity', 'Method variance', 'Monotrait-heteromethod', 'Heterotrait-monomethod']
        },
        {
            heading: 'Item Response Theory (IRT)',
            content: '<p>Item Response Theory (IRT) is a <strong>family of latent-trait models that complements CTT</strong> by relating responses to individual items to a test-taker\'s location on a latent scale.</p>' +
                '<p><strong>Key differences from CTT:</strong></p>' +
                '<table>' +
                '<tr><th>Feature</th><th>CTT</th><th>IRT</th></tr>' +
                '<tr><td>Unit of analysis</td><td>Total test</td><td>Individual item</td></tr>' +
                '<tr><td>Measurement precision</td><td>Often summarized with one overall SEM; conditional SEMs are possible</td><td>Expressed conditionally through item/test information across the latent scale</td></tr>' +
                '<tr><td>Parameter transport</td><td>Item statistics are population dependent</td><td>Item parameters may be invariant only when the model fits and calibrations are placed on a common scale</td></tr>' +
                '<tr><td>Key output</td><td>Reliability coefficient</td><td>Item characteristic curves (ICCs), test information function</td></tr>' +
                '</table>' +
                '<p><strong>IRT Item Parameters:</strong></p>' +
                '<ul>' +
                '<li><strong>Location/difficulty (b)</strong>: In a 1PL or 2PL logistic model, the latent-trait level where the modeled probability is .50. In a 3PL model, it is the midpoint between the lower asymptote <em>c</em> and 1, not necessarily 50% correct</li>' +
                '<li><strong>Discrimination (a)</strong>: How well the item differentiates between high and low ability (slope of the ICC)</li>' +
                '<li><strong>Guessing (c)</strong>: The probability of answering correctly by chance (lower asymptote)</li>' +
                '</ul>' +
                '<p><strong>Common IRT models:</strong></p>' +
                '<ul>' +
                '<li><strong>1-PL / Rasch-family models</strong>: Item location varies and discrimination is constrained; Rasch and generic 1PL parameterizations are closely related but are not interchangeable in every formulation</li>' +
                '<li><strong>2-PL</strong>: Difficulty and discrimination vary</li>' +
                '<li><strong>3-PL</strong>: Difficulty, discrimination, and guessing all vary</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> IRT can support <em>parameter invariance</em> across suitable populations when the model fits and scores are linked to a common scale. This property, together with item information, supports <strong>computerized adaptive testing (CAT)</strong>, where the algorithm selects informative items while also meeting content, exposure, and stopping constraints.</p>',
            keyTerms: ['IRT', 'Item characteristic curve', 'Difficulty', 'Discrimination', 'Guessing parameter', '1-PL Rasch', '2-PL', '3-PL', 'CAT', 'Item invariance'],
            expandableCase: {
                title: 'Building a Computerized Adaptive Test',
                clinicalDescription: 'A testing company is developing a new Computerized Adaptive Test (CAT) for licensure. Their goal is to reach a defensible target precision across the score range used for licensing decisions while preserving blueprint coverage and item-security constraints.',
                diagnosis: 'Item Response Theory (IRT)',
                explanation: 'IRT estimates conditional information from the administered items at a candidate\'s estimated latent-trait level. When the model fits and the bank is calibrated on a common scale, a CAT can select informative items and stop after reaching a precision rule. Precision is not automatically equal at extreme scores, and operational CATs must also enforce content and exposure controls.'
            },
            knowledgeCheck: {
                question: 'In a three-parameter logistic IRT model, what does an item location parameter b represent?',
                options: [
                    'The point where the probability correct must equal .50.',
                    'The latent-trait point where the curve is halfway between its lower asymptote c and 1.',
                    'The item\'s lower-asymptote probability.',
                    'The test\'s single overall standard error of measurement.'
                ],
                answer: 1,
                rationale: 'In the 3PL model, c raises the lower asymptote above zero. At theta = b, the modeled probability is halfway between c and 1; only when c = 0 is that probability .50.'
            }
        },
        {
            heading: 'Ceiling and Floor Effects',
            content: '<p><strong>Ceiling effect:</strong> When a substantial proportion of test-takers achieve the maximum score. The test is too <em>easy</em> for the population, and cannot differentiate among high performers. Scores cluster at the top.</p>' +
                '<p><strong>Floor effect:</strong> When a substantial proportion of test-takers score at the minimum. The test is too <em>difficult</em>, and cannot differentiate among low performers. Scores cluster at the bottom.</p>' +
                '<p><strong>Why these matter:</strong></p>' +
                '<ul>' +
                '<li>Both can <em>restrict the observed range</em>, which commonly attenuates correlations and can distort reliability or validity estimates</li>' +
                '<li>Both reduce the test\'s <strong>discriminative power</strong> — you can\'t tell apart people who differ in ability</li>' +
                '<li>Both produce <strong>skewed distributions</strong> (ceiling = negative skew; floor = positive skew)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Direct range restriction usually attenuates an observed correlation, but the size and even direction of bias depend on the selection process and model. If a question asks why a validity coefficient is lower than expected, consider whether the sample has restricted range (e.g., testing only graduate students on a test designed for the general population).</p>',
            keyTerms: ['Ceiling effect', 'Floor effect', 'Restriction of range', 'Attenuation']
        },
        {
            heading: 'Generalizability Theory',
            content: '<p>Generalizability Theory (G theory; Cronbach et al., 1972) extends CTT by <strong>partitioning error into multiple sources</strong> rather than treating all error as one undifferentiated lump.</p>' +
                '<p>In CTT, error = everything that isn\'t true score. In G theory, you can estimate how much error comes from:</p>' +
                '<ul>' +
                '<li><strong>Items</strong> (different questions produce different results)</li>' +
                '<li><strong>Raters</strong> (different raters score differently)</li>' +
                '<li><strong>Occasions</strong> (different testing times produce different results)</li>' +
                '<li><strong>Settings</strong> (different environments affect performance)</li>' +
                '<li><strong>Interactions</strong> between these facets</li>' +
                '</ul>' +
                '<p>G theory uses <strong>ANOVA-based variance component estimation</strong> to calculate the proportion of variance attributable to each facet. This tells you WHERE your measurement error is coming from, so you can target improvements.</p>' +
                '<p><strong>Two phases of G theory:</strong></p>' +
                '<ol>' +
                '<li><strong>G study</strong> (Generalizability study): Estimates all variance components — identifies the sources and sizes of error</li>' +
                '<li><strong>D study</strong> (Decision study): Uses the G study results to design the most reliable measurement procedure given practical constraints</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> G theory is more sophisticated but less commonly tested than CTT. Its key advantage is disentangling multiple error sources. Relative rank-order decisions commonly use a generalizability coefficient, whereas absolute level decisions include additional facet effects and use a dependability coefficient (often written Phi).</p>',
            keyTerms: ['Generalizability theory', 'G study', 'D study', 'Facets', 'Variance components', 'g-coefficient']
        },
        {
            heading: 'Putting It All Together: A Decision Framework',
            content: '<p>When the EPPP presents an assessment question, use this framework:</p>' +
                '<ol>' +
                '<li><strong>"Is it consistent?"</strong> \u2192 This is a <strong>reliability</strong> question. Ask: <em>what kind</em> of consistency? Over time (test-retest), across items (internal consistency), across raters (inter-rater), across forms (parallel forms)?</li>' +
                '<li><strong>"Does it measure what it claims?"</strong> \u2192 This is a <strong>validity</strong> question. Ask: <em>what kind</em> of evidence? Content representation (content), correlation with criterion (criterion-related), or fit with theoretical network (construct)?</li>' +
                '<li><strong>"How precise is the score?"</strong> \u2192 This is a <strong>SEM/confidence interval</strong> question. Use the formula: SEM = SD \u00d7 \u221a(1-r)</li>' +
                '<li><strong>"Is the test appropriate for this population?"</strong> \u2192 Consider ceiling/floor effects, restriction of range, and whether norms are appropriate</li>' +
                '</ol>' +
                '<p><strong>The reliability-validity relationship:</strong> Measurement error limits an observed test-criterion correlation. The attenuation bound is <em>|r<sub>xy</sub>| \u2264 \u221a(r<sub>xx</sub>r<sub>yy</sub>)</em>. If the criterion were perfectly reliable, a test reliability of .64 would cap the observed correlation at .80; with an imperfect criterion, the bound is lower.</p>'
        }
    ],
    aiCoda: {
        teaser: 'X = T + E \u2014 but what if the entity doesn\'t persist long enough to have a true score?',
        content: '<p>CTT begins by defining a testing procedure and the replications over which a score is expected to vary. That design step matters for AI evaluations: a score from one model version, prompt, decoding setting, tool configuration, and conversation context does not automatically generalize to another.</p>' +
            '<p>A defensible reliability study would specify facets such as task sampling, prompt wording, model version, decoding randomness, tool availability, evaluator, and occasion. Generalizability theory can then estimate which facets contribute most to score variation and whether the intended decision is relative (ranking systems) or absolute (meeting a safety or quality threshold).</p>' +
            '<p>Validity also requires a precise interpretation and use. A benchmark score might support a narrow claim about performance on sampled tasks, but it does not by itself establish broad "understanding," clinical competence, or safe performance in new contexts. Evidence should include task content, response processes where observable, internal structure, relations to external criteria, subgroup performance, and consequences of use.</p>' +
            '<p>The practical lesson applies equally to human and machine assessment: define the construct, population, conditions, and decision first; then ask whether reliability and validity evidence support that particular inference without overstating what the score means.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the current EPPP blueprint, remember: validity evidence supports a proposed interpretation and use; reliability/precision constrains the strength of that inference; and, holding SD fixed, the conventional SEM formula SD \u00d7 \u221a(1-r) yields a smaller SEM as reliability increases.'
    },
    references: [
        'Association of State and Provincial Psychology Boards. (2026). <em>Current EPPP content areas and domain weights</em>.',
        'Association of State and Provincial Psychology Boards. (2026). <em>Future integrated EPPP content areas and transition timeline</em>.',
        'American Educational Research Association, American Psychological Association, & National Council on Measurement in Education. (2014). <em>Standards for educational and psychological testing</em>. AERA.',
        'Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. <em>Psychological Bulletin, 56</em>(2), 81\u2013105.',
        'Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. <em>Psychometrika, 16</em>(3), 297\u2013334.',
        'Cronbach, L. J., Gleser, G. C., Nanda, H., & Rajaratnam, N. (1972). <em>The dependability of behavioral measurements: Theory of generalizability of scores and profiles</em>. Wiley.',
        'Embretson, S. E., & Reise, S. P. (2000). <em>Item response theory for psychologists</em>. Lawrence Erlbaum Associates.',
        'Messick, S. (1995). Validity of psychological assessment: Validation of inferences from persons\' responses and performances as scientific inquiry into score meaning. <em>American Psychologist, 50</em>(9), 741\u2013749.',
        'Nunnally, J. C., & Bernstein, I. H. (1994). <em>Psychometric theory</em> (3rd ed.). McGraw-Hill.',
        'Rasch, G. (1960). <em>Probabilistic models for some intelligence and attainment tests</em>. Danish Institute for Educational Research.',
        'Spearman, C. (1904). The proof and measurement of association between two things. <em>American Journal of Psychology, 15</em>(1), 72\u2013101.'
    ]
});
