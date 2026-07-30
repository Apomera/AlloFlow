/* ============================================================
   PasstheEPPP — Textbook Ch 48: Advanced Statistical Design & IRT
   Domain: Integrative Seminars
   Features: SVG Diagrams, Knowledge Checks, Expandable Cases
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-48',
    domain: 'Integrative Seminars',
    domainNumber: 9,
    title: 'Advanced Statistical Design & IRT',
    examWeight: 'N/A',
    sections: [
        {
            heading: 'The Normal Distribution & Standard Scores',
            content: '<p>A standard score expresses position relative to a reference distribution through a defined transformation. A z score has mean 0 and standard deviation 1 in the reference data; T scores often use mean 50 and SD 10, and many IQ scales use mean 100 and SD 15. These transformations do not require the observed distribution to be normal. The 68.27%, 95.45%, and 99.73% areas apply when a normal model is appropriate.</p>',
            interactiveDiagram: {
                title: "Normal-Model Areas and Common Standard-Score Transforms",
                description: "A symmetric normal curve is marked at the mean and at one and two standard deviations on either side. Each half between the mean and one standard deviation contains about 34.13 percent, and each band from one to two standard deviations contains about 13.59 percent. Matching z, T, and illustrative IQ-score transforms are shown. The area percentages require a normal model; a linear standard-score transformation does not make observed data normal.",
                svg: "<svg viewBox=\"0 0 960 420\" width=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"ch48NormalTitle ch48NormalDesc\"><title id=\"ch48NormalTitle\">Normal curve areas and standard-score transforms</title><desc id=\"ch48NormalDesc\">Symmetric bell curve marked at minus two, minus one, zero, plus one, and plus two standard deviations. Areas are 34.13 percent from the mean to one standard deviation and 13.59 percent from one to two. Rows align z, T, and illustrative IQ scores.</desc><rect width=\"960\" height=\"420\" rx=\"20\" fill=\"#0f172a\"/><text x=\"480\" y=\"30\" text-anchor=\"middle\" fill=\"#f8fafc\" font-family=\"system-ui\" font-size=\"20\" font-weight=\"700\">Normal-model areas and score transforms</text><path d=\"M60 260C190 260 250 250 330 170C390 105 420 55 480 55C540 55 570 105 630 170C710 250 770 260 900 260L900 270L60 270Z\" fill=\"#818cf8\" opacity=\"0.22\"/><path d=\"M60 260C190 260 250 250 330 170C390 105 420 55 480 55C540 55 570 105 630 170C710 250 770 260 900 260\" fill=\"none\" stroke=\"#a78bfa\" stroke-width=\"5\"/><line x1=\"60\" y1=\"270\" x2=\"900\" y2=\"270\" stroke=\"#64748b\" stroke-width=\"2\"/><g stroke=\"#94a3b8\" stroke-dasharray=\"5,4\"><line x1=\"240\" y1=\"238\" x2=\"240\" y2=\"275\"/><line x1=\"360\" y1=\"138\" x2=\"360\" y2=\"275\"/><line x1=\"480\" y1=\"55\" x2=\"480\" y2=\"275\"/><line x1=\"600\" y1=\"138\" x2=\"600\" y2=\"275\"/><line x1=\"720\" y1=\"238\" x2=\"720\" y2=\"275\"/></g><g fill=\"#e2e8f0\" font-family=\"system-ui\" font-size=\"14\" font-weight=\"700\" text-anchor=\"middle\"><text x=\"240\" y=\"294\">-2&#963;</text><text x=\"360\" y=\"294\">-1&#963;</text><text x=\"480\" y=\"294\">&#956;</text><text x=\"600\" y=\"294\">+1&#963;</text><text x=\"720\" y=\"294\">+2&#963;</text></g><g fill=\"#f8fafc\" font-family=\"system-ui\" font-size=\"14\" font-weight=\"700\" text-anchor=\"middle\"><text x=\"300\" y=\"226\">13.59%</text><text x=\"420\" y=\"150\">34.13%</text><text x=\"540\" y=\"150\">34.13%</text><text x=\"660\" y=\"226\">13.59%</text></g><g font-family=\"system-ui\" font-size=\"13\" text-anchor=\"middle\"><text x=\"110\" y=\"322\" fill=\"#cbd5e1\" font-weight=\"700\">z</text><text x=\"240\" y=\"322\" fill=\"#bae6fd\">-2</text><text x=\"360\" y=\"322\" fill=\"#bae6fd\">-1</text><text x=\"480\" y=\"322\" fill=\"#bae6fd\">0</text><text x=\"600\" y=\"322\" fill=\"#bae6fd\">+1</text><text x=\"720\" y=\"322\" fill=\"#bae6fd\">+2</text><text x=\"110\" y=\"344\" fill=\"#cbd5e1\" font-weight=\"700\">T</text><text x=\"240\" y=\"344\" fill=\"#bae6fd\">30</text><text x=\"360\" y=\"344\" fill=\"#bae6fd\">40</text><text x=\"480\" y=\"344\" fill=\"#bae6fd\">50</text><text x=\"600\" y=\"344\" fill=\"#bae6fd\">60</text><text x=\"720\" y=\"344\" fill=\"#bae6fd\">70</text><text x=\"110\" y=\"366\" fill=\"#cbd5e1\" font-weight=\"700\">IQ*</text><text x=\"240\" y=\"366\" fill=\"#bae6fd\">70</text><text x=\"360\" y=\"366\" fill=\"#bae6fd\">85</text><text x=\"480\" y=\"366\" fill=\"#bae6fd\">100</text><text x=\"600\" y=\"366\" fill=\"#bae6fd\">115</text><text x=\"720\" y=\"366\" fill=\"#bae6fd\">130</text></g><text x=\"480\" y=\"402\" text-anchor=\"middle\" fill=\"#fbbf24\" font-family=\"system-ui\" font-size=\"12\">Areas require a normal model. Linear transforms do not make data normal. *Illustrative mean 100, SD 15.</text></svg>"
            },
            knowledgeCheck: {
                question: 'A client scores a T-score of 70 on a psychological assessment. What is their approximate percentile rank?',
                options: ['68th percentile', '84th percentile', '98th percentile', '99.9th percentile'],
                answer: 2,
                rationale: 'Using the conventional T metric, z = (70 - 50)/10 = 2. If the reference distribution is modeled as normal, the cumulative area below z = 2 is about 97.7%, so 98th percentile is the closest option. Without the normal-model assumption or an empirical norm table, a T score alone does not determine an exact percentile.'
            },
            keyTerms: ['T-score', 'z-score', 'Normal Distribution', 'Percentile Rank']
        },
        {
            heading: 'Item Response Theory (IRT)',
            content: '<p><strong>Item Response Theory (IRT)</strong> models the relationship between a latent-trait parameter and item responses under specified assumptions. Classical test theory summarizes observed scores with true-score and error concepts; the two frameworks answer different measurement questions. ASPPB\u2019s current Candidate Handbook describes EPPP scaled scores as an arithmetic conversion of the raw number correct with form equating; it does not say candidates are scored by the response-pattern IRT story previously presented here.</p>' +
                '<ul>' +
                '<li><strong>Parameter a (Discrimination):</strong> How well the item distinguishes between high-ability and low-ability candidates. Steeper slope = better discrimination.</li>' +
                '<li><strong>Parameter b (location/difficulty):</strong> Locates the curve on the trait scale. In a 1PL or 2PL logistic model, probability is .50 at theta = b; in a 3PL model it is halfway between the lower asymptote c and 1, not necessarily .50.</li>' +
                '<li><strong>Parameter c (lower asymptote or pseudo-guessing):</strong> The model\u2019s lower response-probability asymptote. It is estimated or constrained within a model and is not automatically .25 merely because an item has four options.</li>' +
                '</ul>',
            expandableCase: {
                title: 'Why Raw Passing Counts Can Differ Across Forms',
                clinicalDescription: 'Two candidates take different EPPP Part 1 forms. Each jurisdiction uses the ASPPB-recommended scaled standard of 500, but the raw number correct needed to reach 500 differs slightly across the forms.',
                diagnosis: 'Form Equating and Raw-to-Scaled Score Conversion',
                explanation: 'ASPPB explains that raw number-correct scores are converted to a 200\u2013800 scale and equated so scores have comparable meaning across forms. An easier form can require more correct answers and a harder form fewer. This does not mean each candidate\u2019s correct answers receive unique difficulty weights, and raw percentages from an independent practice bank cannot be converted into an official EPPP score.'
            },
            keyTerms: ['Item Response Theory', 'Latent ability (Theta)', 'Discrimination (a)', 'Difficulty (b)', 'Guessing (c)', 'Classical Test Theory']
        }
    ],
    aiCoda: {
        teaser: 'I am a product of IRT.',
        content: '<p>IRT and neural language models both use probability, parameters, and latent mathematical representations, but that shared vocabulary does not make them the same architecture or establish an AI \u201ccognition\u201d equivalent to a psychometric trait.</p>' +
            '<p>An IRT model relates responses to a defined latent variable through item characteristic functions. A language model predicts token sequences from context using learned network parameters. Theta, item difficulty, and token probability are not interchangeable constructs.</p>' +
            '<p>Prompts should therefore not be labeled test items with b parameters unless a genuine measurement model, population, scoring rule, fit analysis, and validity argument have been specified. Analogy can generate hypotheses, but it is not evidence of equivalence.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> z scores use mean 0 and SD 1; T scores commonly use 50 and 10. Normal-curve percentile conversions require a normal reference model. In common IRT notation, a is discrimination, b is trait location or difficulty, and c is the lower asymptote in a 3PL model. The EPPP Candidate Handbook describes raw-number-correct conversion and equating; do not infer official scaled scores from AlloFlow practice percentages.'
    },
    references: [
        'Embretson, S. E., & Reise, S. P. (2013). <em>Item response theory for psychologists</em>. Lawrence Erlbaum Associates.',
        'Cohen, R. J., & Swerdlik, M. E. (2018). <em>Psychological testing and assessment: An introduction to tests and measurement</em> (9th ed.). McGraw-Hill Education.'
    ]
});
