/* ============================================================
   PasstheEPPP â€” Textbook Ch 48: Advanced Statistical Design & IRT
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
                description: 'The Normal Distribution: Mean (Î¼) and Standard Deviations (Ïƒ)',
                svg: '<svg viewBox="0 0 800 340" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#818cf8" stop-opacity="0.5"/><stop offset="100%" stop-color="#818cf8" stop-opacity="0.05"/></linearGradient></defs><g transform="translate(40, 40)"><path d="M 0 200 Q 100 200 200 150 T 360 20 T 520 150 T 720 200 L 720 220 L 0 220 Z" fill="url(#curveGradient)"/><path d="M 0 200 Q 100 200 200 150 T 360 20 T 520 150 T 720 200" fill="none" stroke="#a78bfa" stroke-width="4"/><line x1="360" y1="20" x2="360" y2="220" stroke="#64748b" stroke-width="2" stroke-dasharray="4,4"/><line x1="240" y1="95" x2="240" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><line x1="480" y1="95" x2="480" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><line x1="120" y1="185" x2="120" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><line x1="600" y1="185" x2="600" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><text x="360" y="240" text-anchor="middle" fill="#e2e8f0" font-weight="bold">Mean (0 SD)</text><text x="240" y="240" text-anchor="middle" fill="#94a3b8">-1 SD</text><text x="480" y="240" text-anchor="middle" fill="#94a3b8">+1 SD</text><text x="120" y="240" text-anchor="middle" fill="#94a3b8">-2 SD</text><text x="600" y="240" text-anchor="middle" fill="#94a3b8">+2 SD</text><text x="360" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T-Score: 50</text><text x="360" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: 0</text><text x="360" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 100</text><text x="240" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 40</text><text x="240" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: -1</text><text x="240" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 85</text><text x="480" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 60</text><text x="480" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: +1</text><text x="480" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 115</text><text x="120" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 30</text><text x="120" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: -2</text><text x="120" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 70</text><text x="600" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 70</text><text x="600" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: +2</text><text x="600" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 130</text><text x="300" y="150" text-anchor="middle" fill="#cbd5e1" font-size="14">34%</text><text x="420" y="150" text-anchor="middle" fill="#cbd5e1" font-size="14">34%</text><text x="180" y="190" text-anchor="middle" fill="#cbd5e1" font-size="12">13.5%</text><text x="540" y="190" text-anchor="middle" fill="#cbd5e1" font-size="12">13.5%</text></g></svg>'
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
