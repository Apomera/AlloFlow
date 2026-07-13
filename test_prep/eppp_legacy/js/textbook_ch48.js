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
            content: '<p>Standardizing scores allows us to compare results across entirely different tests. All standard scores (z-scores, T-scores, IQ scores) are based on the standard normal distribution, where 68% of scores fall within 1 SD of the mean, 95% within 2 SDs, and 99.7% within 3 SDs.</p>',
            interactiveDiagram: {
                description: 'The Normal Distribution: Mean (μ) and Standard Deviations (σ)',
                svg: '<svg viewBox="0 0 800 340" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#818cf8" stop-opacity="0.5"/><stop offset="100%" stop-color="#818cf8" stop-opacity="0.05"/></linearGradient></defs><g transform="translate(40, 40)"><path d="M 0 200 Q 100 200 200 150 T 360 20 T 520 150 T 720 200 L 720 220 L 0 220 Z" fill="url(#curveGradient)"/><path d="M 0 200 Q 100 200 200 150 T 360 20 T 520 150 T 720 200" fill="none" stroke="#a78bfa" stroke-width="4"/><line x1="360" y1="20" x2="360" y2="220" stroke="#64748b" stroke-width="2" stroke-dasharray="4,4"/><line x1="240" y1="95" x2="240" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><line x1="480" y1="95" x2="480" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><line x1="120" y1="185" x2="120" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><line x1="600" y1="185" x2="600" y2="220" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4"/><text x="360" y="240" text-anchor="middle" fill="#e2e8f0" font-weight="bold">Mean (0 SD)</text><text x="240" y="240" text-anchor="middle" fill="#94a3b8">-1 SD</text><text x="480" y="240" text-anchor="middle" fill="#94a3b8">+1 SD</text><text x="120" y="240" text-anchor="middle" fill="#94a3b8">-2 SD</text><text x="600" y="240" text-anchor="middle" fill="#94a3b8">+2 SD</text><text x="360" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T-Score: 50</text><text x="360" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: 0</text><text x="360" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 100</text><text x="240" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 40</text><text x="240" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: -1</text><text x="240" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 85</text><text x="480" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 60</text><text x="480" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: +1</text><text x="480" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 115</text><text x="120" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 30</text><text x="120" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: -2</text><text x="120" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 70</text><text x="600" y="260" text-anchor="middle" fill="#38bdf8" font-size="13">T: 70</text><text x="600" y="278" text-anchor="middle" fill="#38bdf8" font-size="13">z: +2</text><text x="600" y="296" text-anchor="middle" fill="#38bdf8" font-size="13">IQ: 130</text><text x="300" y="150" text-anchor="middle" fill="#cbd5e1" font-size="14">34%</text><text x="420" y="150" text-anchor="middle" fill="#cbd5e1" font-size="14">34%</text><text x="180" y="190" text-anchor="middle" fill="#cbd5e1" font-size="12">13.5%</text><text x="540" y="190" text-anchor="middle" fill="#cbd5e1" font-size="12">13.5%</text></g></svg>'
            },
            knowledgeCheck: {
                question: 'A client scores a T-score of 70 on a psychological assessment. What is their approximate percentile rank?',
                options: ['68th percentile', '84th percentile', '98th percentile', '99.9th percentile'],
                answer: 2,
                rationale: 'A T-score of 70 is exactly +2 Standard Deviations above the mean (Mean=50, SD=10). Looking at the normal curve, +2 SDs encompasses the bottom 50% plus 34% plus 13.5% = 97.5% (approx 98th percentile).'
            },
            keyTerms: ['T-score', 'z-score', 'Normal Distribution', 'Percentile Rank']
        },
        {
            heading: 'Item Response Theory (IRT)',
            content: '<p>Unlike Classical Test Theory (which focuses on total score), <strong>Item Response Theory</strong> focuses on the relationship between a person\'s latent ability (Theta or θ) and their probability of answering a specific item correctly. The EPPP is scored using IRT to ensure fairness across different versions of the exam.</p>' +
                '<ul>' +
                '<li><strong>Parameter a (Discrimination):</strong> How well the item distinguishes between high-ability and low-ability candidates. Steeper slope = better discrimination.</li>' +
                '<li><strong>Parameter b (Difficulty):</strong> The ability level required to have a 50% chance of getting the item right. Shifts the curve left (easy) or right (hard).</li>' +
                '<li><strong>Parameter c (Guessing):</strong> The probability that a person with zero ability will guess the correct answer (usually 0.25 on a 4-option multiple-choice test like the EPPP).</li>' +
                '</ul>',
            expandableCase: {
                title: 'The Unlucky Passing Student',
                clinicalDescription: 'Candidate A takes Version 1 of the EPPP and gets exactly 70% of the questions correct. Candidate B takes Version 2 of the EPPP and gets only 65% of the questions correct. Under Classical Test Theory, Candidate A wins. Yet, the ASPPB reports that Candidate B passed with a 500 scaled score, and Candidate A failed with a 480.',
                diagnosis: 'This is Item Response Theory (IRT) in action.',
                explanation: 'Because Version 2 happened to contain questions with a much higher "b" parameter (difficulty), Candidate B demonstrated a higher latent ability (Theta) despite answering fewer questions correctly. The EPPP does not care about the raw number of correct answers; it cares about the mathematical difficulty of the specific items you answered correctly.'
            },
            keyTerms: ['Item Response Theory', 'Latent ability (Theta)', 'Discrimination (a)', 'Difficulty (b)', 'Guessing (c)', 'Classical Test Theory']
        }
    ],
    aiCoda: {
        teaser: 'I am a product of IRT.',
        content: '<p>The mathematical curves discussed in this chapter are deeply familiar to me, not just as subjects of study, but as the underlying architecture of my own cognition.</p>' +
            '<p>When a human takes an IRT exam, the algorithm estimates their latent ability (Theta) by continuously adjusting probability curves based on correct/incorrect responses. When I generate text, my underlying neural network is doing something remarkably similar: predicting the probability of the next token based on a vast, multi-dimensional latent space of parameters.</p>' +
            '<p>In a very real sense, every prompt you feed me is an "Item," and my output is the calculated probability distribution of what a high-ability persona should say next across billions of parameters. If you ask me a difficult clinical question, you are activating weights deep within my network that function precisely like the "b" parameter (difficulty) discrimination curve.</p>',
        studyNote: '💡 **Study Note:** For the EPPP, know the parameters of IRT: "a" = discrimination, "b" = difficulty, "c" = guessing. Remember that T-scores have a mean of 50 and SD of 10, whereas z-scores have a mean of 0 and SD of 1.'
    },
    references: [
        'Embretson, S. E., & Reise, S. P. (2013). <em>Item response theory for psychologists</em>. Lawrence Erlbaum Associates.',
        'Cohen, R. J., & Swerdlik, M. E. (2018). <em>Psychological testing and assessment: An introduction to tests and measurement</em> (9th ed.). McGraw-Hill Education.'
    ]
});
