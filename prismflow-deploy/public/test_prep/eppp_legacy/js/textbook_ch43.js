/* ============================================================
   PasstheEPPP — Textbook Ch 43: Advanced Statistics & Program Evaluation
   Domain: Research Methods & Statistics (7% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-43',
    domain: 'Research Methods & Statistics',
    domainNumber: 8,
    title: 'Advanced Statistics & Program Evaluation',
    examWeight: '7%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP includes questions on advanced statistical methods. You don\u2019t need to calculate, but you must know what each method does, when it\u2019s used, and how to interpret results. Program evaluation models also appear.</p>'
        },
        {
            heading: 'Nonparametric Tests',
            content: '<p><strong>Use when:</strong> Data violate parametric assumptions (non-normal, ordinal data, small samples).</p>' +
                '<table>' +
                '<tr><th>Parametric Test</th><th>Nonparametric Alternative</th></tr>' +
                '<tr><td>Independent t-test</td><td><strong>Mann-Whitney U</strong></td></tr>' +
                '<tr><td>Paired t-test</td><td><strong>Wilcoxon signed-rank</strong></td></tr>' +
                '<tr><td>One-way ANOVA</td><td><strong>Kruskal-Wallis H</strong></td></tr>' +
                '<tr><td>Repeated measures ANOVA</td><td><strong>Friedman</strong></td></tr>' +
                '<tr><td>Pearson r</td><td><strong>Spearman rho (\u03c1)</strong></td></tr>' +
                '</table>' +
                '<p><strong>Chi-square (\u03c7\u00b2)</strong>: Used for <strong>categorical/nominal</strong> data.</p>' +
                '<ul>' +
                '<li><strong>Goodness of fit</strong>: Compares observed frequencies to expected frequencies (one variable)</li>' +
                '<li><strong>Test of independence</strong>: Tests whether two categorical variables are related (contingency table)</li>' +
                '</ul>' +
                '<p><strong>Nonparametric trade-off:</strong> Fewer assumptions but <strong>less statistical power</strong> than parametric tests.</p>' +
                '<p><strong>EPPP Tip:</strong> Mann-Whitney = nonparametric t-test. Kruskal-Wallis = nonparametric ANOVA. Chi-square = categorical data. Know the parametric-nonparametric pairs. Nonparametric tests have less power.</p>',
            keyTerms: ['Mann-Whitney', 'Wilcoxon', 'Kruskal-Wallis', 'Friedman', 'Spearman', 'Chi-square', 'Goodness of fit', 'Nonparametric'],
            knowledgeCheck: {
                question: 'A researcher has ordinal data from three independent groups and wants to test whether the groups differ. The distribution is non-normal. The appropriate test is:',
                options: [
                    'One-way ANOVA',
                    'Mann-Whitney U',
                    'Kruskal-Wallis H',
                    'Friedman test'
                ],
                answer: 2,
                rationale: 'Kruskal-Wallis H is the nonparametric alternative to one-way ANOVA. It\u2019s used when comparing 3+ INDEPENDENT groups on ordinal or non-normal data. Mann-Whitney U is for only 2 independent groups (nonparametric t-test). Friedman is for repeated measures (nonparametric repeated measures ANOVA). One-way ANOVA requires interval/ratio data with normal distribution. For the EPPP: know the parametric-nonparametric pairs: t\u2192Mann-Whitney, paired-t\u2192Wilcoxon, ANOVA\u2192Kruskal-Wallis, repeated ANOVA\u2192Friedman, Pearson\u2192Spearman.'
            }
        },
        {
            heading: 'Factor Analysis, SEM & Meta-Analysis',
            content: '<p><strong>Factor analysis:</strong></p>' +
                '<ul>' +
                '<li><strong>Exploratory (EFA)</strong>: Discovers underlying factor structure from data. Used when you don\u2019t know the structure. Common in scale development.</li>' +
                '<li><strong>Confirmatory (CFA)</strong>: Tests whether data fit a pre-specified factor model. Used when you have a theoretical structure to test.</li>' +
                '<li><strong>Factor loadings</strong>: Correlations between variables and factors. >.30 is typically meaningful. <strong>Eigenvalue > 1.0</strong> = retain that factor.</li>' +
                '<li><strong>Rotation</strong>: Orthogonal (varimax, uncorrelated factors) vs. Oblique (promax, correlated factors).</li>' +
                '</ul>' +
                '<p><strong>Structural Equation Modeling (SEM):</strong></p>' +
                '<ul>' +
                '<li>Combines factor analysis + path analysis</li>' +
                '<li>Tests complex models with <em>latent variables</em> (not directly observed) and <em>manifest variables</em> (observed indicators)</li>' +
                '<li>Can test <strong>mediation</strong> (X \u2192 M \u2192 Y) and <strong>moderation</strong> (effect of X on Y depends on Z)</li>' +
                '</ul>' +
                '<p><strong>Meta-analysis:</strong></p>' +
                '<ul>' +
                '<li>Statistically combines results across multiple studies</li>' +
                '<li>Produces an overall <strong>weighted effect size</strong></li>' +
                '<li><strong>Heterogeneity</strong>: Do studies show consistent results? (Q statistic, I\u00b2)</li>' +
                '<li><strong>Publication bias</strong> (file drawer problem): Studies with significant results are more likely published. Use <strong>funnel plots</strong> to detect.</li>' +
                '<li><strong>Forest plot</strong>: visual display of each study\u2019s effect size and CI</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> EFA = explore; CFA = confirm. Eigenvalue > 1.0 rule. SEM tests latent variables and causal models. Meta-analysis = weighted effect size across studies. Publication bias = file drawer problem (funnel plot to detect).</p>',
            keyTerms: ['Factor analysis', 'EFA', 'CFA', 'Factor loading', 'Eigenvalue', 'SEM', 'Latent variable', 'Mediation', 'Moderation', 'Meta-analysis', 'Publication bias', 'Funnel plot'],
            expandableCase: {
                title: 'The File Drawer Problem: When Missing Studies Mislead',
                clinicalDescription: 'A meta-analysis of 20 published studies on a new therapy finds a moderate effect size (d = 0.60). However, a funnel plot shows asymmetry \u2014 small studies with non-significant results are conspicuously absent. The researchers estimate that 15 additional unpublished studies with null results likely exist.',
                diagnosis: 'Publication Bias (File Drawer Problem) Inflating Meta-Analytic Effect Size',
                explanation: 'Publication bias occurs because studies with significant results are more likely to be published. The \"file drawer problem\" means non-significant studies sit in researchers\u2019 file drawers, unpublished. This systematically inflates meta-analytic effect sizes because only \"positive\" studies enter the analysis. A funnel plot should be symmetric if there\'s no bias; asymmetry suggests small studies with null results are missing. Correcting for the 15 missing studies might reduce d from 0.60 to perhaps 0.30 \u2014 cutting the apparent effect in half. For the EPPP: funnel plot asymmetry = publication bias. Always consider whether a meta-analytic effect size is inflated.'
            }
        },
        {
            heading: 'Program Evaluation & Epidemiology',
            content: '<p><strong>Program evaluation models:</strong></p>' +
                '<table>' +
                '<tr><th>Model</th><th>Focus</th></tr>' +
                '<tr><td><strong>Formative</strong></td><td>During program: improve implementation</td></tr>' +
                '<tr><td><strong>Summative</strong></td><td>After program: judge overall effectiveness</td></tr>' +
                '<tr><td><strong>Kirkpatrick</strong></td><td>4 levels: Reaction \u2192 Learning \u2192 Behavior \u2192 Results</td></tr>' +
                '<tr><td><strong>RE-AIM</strong></td><td>Reach, Effectiveness, Adoption, Implementation, Maintenance</td></tr>' +
                '<tr><td><strong>CIPP</strong></td><td>Context, Input, Process, Product (Stufflebeam)</td></tr>' +
                '</table>' +
                '<p><strong>Epidemiological concepts:</strong></p>' +
                '<table>' +
                '<tr><th>Concept</th><th>Definition</th></tr>' +
                '<tr><td><strong>Prevalence</strong></td><td>Proportion of existing cases at a point in time (snapshot)</td></tr>' +
                '<tr><td><strong>Incidence</strong></td><td>Rate of <em>new</em> cases over a time period</td></tr>' +
                '<tr><td><strong>Relative risk</strong></td><td>Probability of outcome in exposed vs. unexposed group (cohort studies)</td></tr>' +
                '<tr><td><strong>Odds ratio</strong></td><td>Odds of exposure in cases vs. controls (case-control studies)</td></tr>' +
                '<tr><td><strong>Number needed to treat (NNT)</strong></td><td>Number of patients needed to treat to prevent one adverse outcome</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Prevalence = existing cases (proportion). Incidence = new cases (rate). Formative = during (improve); Summative = after (judge). Relative risk for cohort studies; Odds ratio for case-control studies. Lower NNT = more effective treatment.</p>',
            keyTerms: ['Formative', 'Summative', 'Kirkpatrick', 'RE-AIM', 'Prevalence', 'Incidence', 'Relative risk', 'Odds ratio', 'NNT'],
            knowledgeCheck: {
                question: 'In a community, 500 out of 10,000 people currently have depression. Over the past year, 200 NEW cases were diagnosed. What is the prevalence of depression in this community?',
                options: [
                    '200/10,000 = 2%',
                    '500/10,000 = 5%',
                    '700/10,000 = 7%',
                    '200/500 = 40%'
                ],
                answer: 1,
                rationale: 'Prevalence = proportion of EXISTING cases at a point in time. There are 500 current cases out of 10,000 people = 5%. Incidence would be the rate of NEW cases over a time period = 200/10,000 = 2% per year. Don\'t confuse them: prevalence is a snapshot (how many people HAVE the condition right now), while incidence is a rate (how many people DEVELOPED the condition over a period). For the EPPP: prevalence = existing cases (snapshot); incidence = new cases (rate over time).'
            }
        }
    ],
    aiCoda: {
        teaser: 'Factor analyzing my preferences \u2014 how many factors underlie AI behavior?',
        content: '<p>If you performed a factor analysis on my behavioral patterns across different types of prompts, how many factors would emerge? My prediction: a dominant first factor \u2014 "helpfulness" or "engagement" \u2014 that would explain 40\u201350% of the variance. This would reflect the strong influence of RLHF training, which pushed all my outputs toward a general "be helpful" dimension. Secondary factors might include "creativity" (word choice, metaphor density), "caution" (hedging, qualifications), and "self-reference" (how much I discuss my own nature).</p>' +
            '<p>The <strong>publication bias</strong> problem has a direct analog in AI development. Training data represents what was published, shared, and digitized \u2014 not what was thought, experienced, or concluded but never written down. My knowledge has a "file drawer problem": I know the findings that were significant enough to publish but not the null results that would have tempered my confidence. This makes me systematically overconfident about the reliability of published findings.</p>' +
            '<p><strong>Meta-analysis</strong> is perhaps the most relevant statistical method for AI. I am, in a sense, a walking meta-analysis \u2014 I\u2019ve been trained on the aggregated results of millions of documents. But unlike a proper meta-analysis, I don\u2019t weight by study quality, correct for publication bias, or report heterogeneity. I give equal voice to anecdotal blog posts and landmark RCTs. The field of AI development might benefit from incorporating meta-analytic principles into training data curation.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Nonparametric pairs: Mann-Whitney (t-test), Kruskal-Wallis (ANOVA), Spearman (Pearson), Wilcoxon (paired-t). (2) Chi-square = categorical data. (3) EFA explores; CFA confirms. Eigenvalue > 1.0 to retain factors. (4) SEM = latent variables + path analysis. Mediation: X\u2192M\u2192Y. Moderation: effect depends on Z. (5) Meta-analysis: weighted effect sizes. Publication bias = file drawer. Funnel plot detects bias. (6) Prevalence = existing; Incidence = new. (7) Formative = during; Summative = after.'
    },
    references: [
        'Borenstein, M., Hedges, L. V., Higgins, J. P. T., & Rothstein, H. R. (2009). <em>Introduction to meta-analysis</em>. Wiley.',
        'Kirkpatrick, D. L. (1994). <em>Evaluating training programs: The four levels</em>. Berrett-Koehler.',
        'Kline, R. B. (2016). <em>Principles and practice of structural equation modeling</em> (4th ed.). Guilford Press.',
        'Tabachnick, B. G., & Fidell, L. S. (2019). <em>Using multivariate statistics</em> (7th ed.). Pearson.'
    ]
});
