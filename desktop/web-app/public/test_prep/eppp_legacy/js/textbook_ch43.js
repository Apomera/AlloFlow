/* ============================================================
   PasstheEPPP â€” Textbook Ch 43: Advanced Statistics & Program Evaluation
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
            content: '<p><strong>Use when:</strong> The outcome scale, estimand, sampling design, or distribution makes a rank-based or distribution-free procedure appropriate. Small samples alone do not automatically require a nonparametric test.</p>' +
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
                '<p><strong>Nonparametric trade-off:</strong> These procedures replace some parametric assumptions with their own assumptions and often test ranks or distributional differences rather than exactly the same estimand. Their power is not uniformly lower; it depends on the data-generating conditions and the question being tested.</p>' +
                '<p><strong>EPPP Tip:</strong> Mann-Whitney and Kruskal-Wallis are common rank-based choices for independent groups; Wilcoxon signed-rank and Friedman address paired or repeated observations. Chi-square procedures analyze counts in categories. Treat these as common design pairings, not assumption-free substitutes that always answer the identical question.</p>',
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
                rationale: 'Kruskal-Wallis H is the best answer because the prompt specifies one ordinal outcome and three independent groups. Mann-Whitney U addresses two independent groups, while Friedman addresses related or repeated observations. A conventional one-way ANOVA models group means and assumes independent errors, an appropriate error model, and sufficiently well-behaved residuals; normality is an assumption about errors rather than a requirement that every observed score be perfectly normal. Rank-based procedures are common design counterparts, but they need not test exactly the same quantity.'
            }
        },
        {
            heading: 'Factor Analysis, SEM & Meta-Analysis',
            content: '<p><strong>Factor analysis:</strong></p>' +
                '<ul>' +
                '<li><strong>Exploratory (EFA)</strong>: Discovers underlying factor structure from data. Used when you don\u2019t know the structure. Common in scale development.</li>' +
                '<li><strong>Confirmatory (CFA)</strong>: Tests whether data fit a pre-specified factor model. Used when you have a theoretical structure to test.</li>' +
                '<li><strong>Factor loadings</strong>: Relations between indicators and factors; their practical meaning depends on measurement quality, theory, and the model. The eigenvalue-greater-than-one rule is only a heuristic; also consider parallel analysis, the scree plot, interpretability, and theory.</li>' +
                '<li><strong>Rotation</strong>: Orthogonal (varimax, uncorrelated factors) vs. Oblique (promax, correlated factors).</li>' +
                '</ul>' +
                '<p><strong>Structural Equation Modeling (SEM):</strong></p>' +
                '<ul>' +
                '<li>Combines factor analysis + path analysis</li>' +
                '<li>Tests complex models with <em>latent variables</em> (not directly observed) and <em>manifest variables</em> (observed indicators)</li>' +
                '<li>Can represent hypotheses about <strong>mediation</strong> (X \u2192 M \u2192 Y) and <strong>moderation</strong> (the effect of X on Y depends on Z), but model fit alone does not establish temporal order or causality</li>' +
                '</ul>' +
                '<p><strong>Meta-analysis:</strong></p>' +
                '<ul>' +
                '<li>Statistically combines results across multiple studies</li>' +
                '<li>Produces an overall <strong>weighted effect size</strong></li>' +
                '<li><strong>Heterogeneity</strong>: Do studies show consistent results? (Q statistic, I\u00b2)</li>' +
                '<li><strong>Reporting and publication bias</strong>: Disseminated results can differ systematically from unavailable results. Funnel-plot asymmetry can flag small-study effects, but it has multiple possible causes and does not by itself diagnose publication bias.</li>' +
                '<li><strong>Forest plot</strong>: visual display of each study\u2019s effect size and CI</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> EFA explores and CFA evaluates a prespecified measurement model. SEM can include latent variables and hypothesized paths, but causal interpretation requires design and identification support beyond fit indices. Meta-analysis combines study estimates while examining uncertainty and heterogeneity. Funnel plots are exploratory checks for small-study effects, not proof of publication bias.</p>',
            keyTerms: ['Factor analysis', 'EFA', 'CFA', 'Factor loading', 'Eigenvalue', 'SEM', 'Latent variable', 'Mediation', 'Moderation', 'Meta-analysis', 'Publication bias', 'Funnel plot'],
            expandableCase: {
                title: 'The File Drawer Problem: When Missing Studies Mislead',
                clinicalDescription: 'A meta-analysis of 20 published studies on a new therapy finds d = 0.60. Its funnel plot is asymmetric, with smaller studies tending to show larger effects. The team must decide what that pattern supports and what additional analyses or evidence are needed.',
                diagnosis: 'Small-Study Effects Requiring Investigation',
                explanation: 'Funnel-plot asymmetry is a warning sign, not a count of missing studies or proof of publication bias. Selective publication is one possible cause, but heterogeneity, study-quality differences, chance, outcome selection, or a real relation between study size and effect can also produce asymmetry. Tests for asymmetry often have low power when few studies are available; Cochrane uses about 10 studies as a general minimum rule of thumb. Investigate plausible causes and use sensitivity analyses rather than inventing a corrected effect from the plot alone.'
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
                '<p><strong>EPPP Tip:</strong> Prevalence describes existing cases at a specified time; cumulative incidence uses new cases among people initially at risk, while incidence rate uses person-time. Formative evaluation supports improvement during implementation; summative evaluation judges outcomes. A lower NNT can indicate a larger absolute benefit only when outcome, follow-up, comparator, baseline risk, harms, and uncertainty are comparable.</p>',
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
                rationale: 'Prevalence is the proportion of the specified population who are existing cases at the stated time: 500/10,000 = 5%, so option B is correct. The 200 new diagnoses describe incidence information, but cumulative incidence needs the number initially at risk and an incidence rate needs person-time. The prompt establishes neither denominator, so 200/10,000 should not automatically be labeled a 2% incidence rate.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Factor analyzing my preferences \u2014 how many factors underlie AI behavior?',
        content: '<p>Factor analysis could study patterns in outputs from a defined AI system, but the result would depend on prompts, scoring rules, sample, model version, and extraction method. Predicting a fixed number of factors or percentage of variance without data would be inappropriate.</p>' +
            '<p>Training corpora can reflect selective availability: published and digitized material is not a representative sample of all observations or viewpoints. That analogy motivates source appraisal, but it does not establish that every model response is systematically overconfident.</p>' +
            '<p>A language model is not a formal meta-analysis. A stronger evidence workflow separates source types, weights evidence quality for the decision, records uncertainty and heterogeneity, and tests how conclusions change under plausible missingness.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> Match rank-based procedures to design and estimand; they are not assumption-free or uniformly less powerful. EFA explores; CFA evaluates a prespecified model; factor-retention rules are evidence inputs. SEM fit alone does not establish causality. Funnel asymmetry has several causes and does not prove publication bias. Prevalence uses existing cases; incidence requires an at-risk or person-time denominator. Interpret NNT with outcome, time, baseline risk, harms, comparator, and uncertainty.'
    },
    references: [
        'Borenstein, M., Hedges, L. V., Higgins, J. P. T., & Rothstein, H. R. (2009). <em>Introduction to meta-analysis</em>. Wiley.',
        'Kirkpatrick, D. L. (1994). <em>Evaluating training programs: The four levels</em>. Berrett-Koehler.',
        'Kline, R. B. (2016). <em>Principles and practice of structural equation modeling</em> (4th ed.). Guilford Press.',
        'Tabachnick, B. G., & Fidell, L. S. (2019). <em>Using multivariate statistics</em> (7th ed.). Pearson.',
        'Cochrane. (2024). <em>Handbook for Systematic Reviews of Interventions</em>, Chapters 10 and 13: meta-analysis and risk of reporting bias.',
        'Centers for Disease Control and Prevention. <em>Principles of Epidemiology: Measures of Risk</em>.'
    ]
});
