/* ============================================================
   PasstheEPPP — Textbook Ch 28: Language & Intelligence
   Domain: Cognitive-Affective Bases of Behavior (13% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-28',
    domain: 'Cognitive-Affective Bases of Behavior',
    domainNumber: 5,
    title: 'Language & Intelligence',
    examWeight: '13%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests language development theories, the structure and interpretation of intelligence tests, and key debates about IQ. These tie directly to assessment chapters (WAIS/WISC, CHC theory) and developmental psychology.</p>'
        },
        {
            heading: 'Language Development & Theories',
            content: '<p><strong>Language development milestones:</strong></p>' +
                '<ul>' +
                '<li><strong>0\u20136 months</strong>: Cooing and increasingly speech-like vocal play; early perception is broadly sensitive to many speech contrasts, but infants do not literally produce every phoneme</li>' +
                '<li><strong>~6\u201310 months</strong>: Babbling narrows to native language phonemes</li>' +
                '<li><strong>~12 months</strong>: First words (holophrases \u2014 single words used as whole sentences)</li>' +
                '<li><strong>~18–24 months</strong>: Many children show accelerating vocabulary and early word combinations; timing and rate vary, and “vocabulary explosion” is not universal ("want cookie")</li>' +
                '<li><strong>~2\u20135 years</strong>: Rapid grammar acquisition; <strong>overregularization</strong> ("I goed" instead of "I went")</li>' +
                '</ul>' +
                '<p><strong>Major theories:</strong></p>' +
                '<table>' +
                '<tr><th>Theorist</th><th>Theory</th><th>Key Claim</th></tr>' +
                '<tr><td><strong>Chomsky</strong></td><td>Nativist/Biological</td><td>Historically proposed an innate language-learning capacity, often called a <strong>Language Acquisition Device (LAD)</strong>; LAD is a theoretical construct, not an identified neural organ. <strong>Universal grammar</strong>: all languages share certain deep structural principles. Supported by the <strong>poverty of the stimulus</strong> argument (children produce sentences they\u2019ve never heard).</td></tr>' +
                '<tr><td><strong>Skinner</strong></td><td>Behaviorist</td><td>Language is learned through reinforcement, shaping, and imitation. Parents reinforce correct speech. <strong>Chomsky\u2019s critique</strong>: novel, rule-governed language challenged a reinforcement-only account, while contemporary learning approaches also include statistical learning, social interaction, and general cognitive processes.</td></tr>' +
                '<tr><td><strong>Vygotsky</strong></td><td>Sociocultural</td><td>Language develops through <strong>social interaction</strong>. <strong>Private speech</strong> (talking to oneself) becomes internalized thought. Language shapes cognition.</td></tr>' +
                '<tr><td><strong>Piaget</strong></td><td>Cognitive</td><td>Language depends on <strong>cognitive development</strong>. Thought comes first, then language develops to express it.</td></tr>' +
                '</table>' +
                '<p><strong>Sapir-Whorf hypothesis</strong> (linguistic relativity): Language may influence attention, categorization, memory, or habitual thought in task- and language-specific ways. Strong determinism is not supported; broad “weak version supported” claims must specify the phenomenon and evidence.</p>' +
                '<p><strong>Critical period for language (Lenneberg):</strong> Earlier access to an accessible natural language is generally associated with stronger first-language outcomes, but there is no single puberty switch for every language component or learner. Evidence from delayed sign-language access is especially informative; severely deprived individual cases have major confounds.</p>' +
                '<p><strong>EPPP Tip:</strong> Know Chomsky’s LAD/universal-grammar proposal and the critiques of reinforcement-only accounts, while recognizing contemporary nativist, usage-based, statistical-learning, social-interactionist, and cognitive accounts. Overregularization demonstrates productive rule-like generalization but does not by itself identify an innate grammar.</p>',
            keyTerms: ['Chomsky', 'LAD', 'Universal grammar', 'Sapir-Whorf', 'Skinner', 'Vygotsky', 'Overregularization', 'Holophrases', 'Telegraphic speech', 'Critical period', 'Lenneberg'],
            knowledgeCheck: {
                question: 'A 3-year-old says “I goed to the store.” What is the strongest conclusion supported by this overregularization error?',
                options: [
                    'The child can productively generalize a past-tense pattern beyond memorized adult forms.',
                    'The error proves a specific innate Language Acquisition Device and rules out learning-based accounts.',
                    'An adult must have reinforced the exact word “goed.”',
                    'The child has lost the ability to learn irregular verbs.'
                ],
                answer: 0,
                rationale: '“Goed” shows productive generalization: the child applies a regular pattern to an irregular verb rather than merely repeating a stored adult form. The observation challenges simple imitation-only explanations, but multiple contemporary accounts can model generalization, so it does not uniquely prove one innate mechanism.'
            }
        },
        {
            heading: 'Theories of Intelligence',
            content: '<table>' +
                '<tr><th>Theorist</th><th>Theory</th><th>Key Concepts</th></tr>' +
                '<tr><td><strong>Spearman</strong></td><td>Two-factor theory</td><td><strong>g</strong> (general intelligence) underlies all cognitive abilities + <strong>s</strong> (specific abilities for each task). Positive correlations among diverse cognitive tests support a broad general factor, but its interpretation, scope, and use remain scientifically and socially consequential rather than uniquely “most validated.”</td></tr>' +
                '<tr><td><strong>Cattell & Horn</strong></td><td>Gf-Gc theory</td><td><strong>Fluid intelligence (Gf)</strong>: novel problem-solving, pattern recognition; often shows average age-related decline beginning in adulthood, with substantial individual and cohort variation. <strong>Crystallized intelligence (Gc)</strong>: accumulated knowledge, vocabulary; often remains comparatively stable longer and may increase with accumulated knowledge before later-life decline; patterns vary.</td></tr>' +
                '<tr><td><strong>Carroll</strong></td><td>Three-stratum theory</td><td>Hierarchical: Stratum III = g; Stratum II = broad abilities (Gf, Gc, etc.); Stratum I = narrow abilities</td></tr>' +
                '<tr><td><strong>CHC theory</strong></td><td>Cattell-Horn-Carroll</td><td>Integration of Cattell-Horn and Carroll. A highly influential taxonomy used in test interpretation and development; no battery is a pure one-to-one implementation, and current editions and labels must be verified. Broad abilities include Gf, Gc, Gsm, Gv, Gs, Ga, Glr.</td></tr>' +
                '<tr><td><strong>Gardner</strong></td><td>Multiple intelligences</td><td>8+ independent intelligences (linguistic, logical-mathematical, spatial, musical, bodily-kinesthetic, interpersonal, intrapersonal, naturalistic). Criticism: <em>limited empirical support</em>; abilities may not be independent.</td></tr>' +
                '<tr><td><strong>Sternberg</strong></td><td>Triarchic theory</td><td><strong>Analytical</strong> (academic problem-solving), <strong>Creative</strong> (novel problem-solving), <strong>Practical</strong> ("street smarts"). Later renamed <strong>Successful intelligence</strong>.</td></tr>' +
                '</table>' +
                '<p><strong>Key IQ concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Flynn effect</strong>: Large secular gains occurred in many populations and periods, but magnitude, domains, and direction vary by country and cohort, with plateaus or reversals reported. Causes are multifactorial and not settled.</li>' +
                '<li><strong>Deviation IQ</strong>: Modern IQ scores compare an individual to same-age peers. Mean = 100, SD = 15 (Wechsler scales).</li>' +
                '<li><strong>Intellectual disability</strong>: Deficits in intellectual functions confirmed through clinical assessment and individualized standardized testing, plus adaptive-function deficits with developmental onset; severity is based on adaptive functioning rather than one IQ cutoff</li>' +
                '<li><strong>Giftedness</strong>: Definitions vary across programs and jurisdictions and may include achievement, creativity, domain-specific talent, opportunity, and local identification rules; a ≥130 IQ convention is not universal</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> CHC theory is the dominant model for modern IQ tests. Average Gf and Gc trajectories differ, but neither is fixed for every person or age. The Flynn effect means older test norms produce inflated scores. Gardner\u2019s theory is popular in education but has <em>limited empirical support</em>.</p>',
            keyTerms: ['Spearman g', 'Cattell', 'Fluid intelligence', 'Crystallized intelligence', 'CHC', 'Gardner', 'Sternberg', 'Flynn effect', 'Deviation IQ', 'Multiple intelligences'],
            expandableCase: {
                title: 'New navigation difficulty requires differential assessment',
                clinicalDescription: 'A 72-year-old retired English professor presents for neuropsychological evaluation after getting lost in his own neighborhood. Testing reveals an FSIQ of 115, with Verbal Comprehension Index = 135 (superior vocabulary, general knowledge) but Visual Spatial Index = 82 and Processing Speed Index = 78. He can still lecture brilliantly but cannot copy a complex figure or complete visual puzzles quickly.',
                diagnosis: 'Focal functional change requiring medical and neuropsychological differential assessment',
                explanation: 'The profile can be described with broad-ability constructs, but getting lost in a familiar neighborhood plus marked visual-spatial and processing change should not be attributed to normal aging from index scores alone. Evaluate onset, course, sensory and motor factors, validity, mood, sleep, medication, neurological signs, daily function, and appropriate medical urgency. For the EPPP: (1) Gc stable or increases with age; Gf declines. (2) FSIQ can mask significant discrepancies between Gc and Gf. (3) CHC theory (the dominant model for modern IQ tests) distinguishes multiple broad abilities, making this pattern interpretable. (4) Neurocognitive disorders are heterogeneous and can present with uneven domain profiles; preserved vocabulary does not rule one out.'
            }
        },
        {
            heading: 'Bilingualism & Language Diversity',
            content: '<p><strong>Bilingualism:</strong></p>' +
                '<ul>' +
                '<li><strong>Simultaneous bilingualism</strong>: Learning two languages from birth</li>' +
                '<li><strong>Sequential bilingualism</strong>: Learning a second language after the first is established</li>' +
                '<li><strong>Code-switching</strong>: Alternating between languages within a conversation (a sign of competence, not confusion)</li>' +
                '<li><strong>Cognitive advantages</strong>: Bilingual experience can support language-specific and metalinguistic skills. Claims of a general executive-function advantage and delayed dementia remain mixed and sensitive to sampling, proficiency, use, migration, education, and socioeconomic confounding</li>' +
                '<li><strong>Common misconception</strong>: Learning more than one language does not inherently cause a disorder; vocabulary is distributed across languages and development must be evaluated across the child’s language history and opportunities (a frequently debunked myth)</li>' +
                '</ul>' +
                '<p><strong>Assessment considerations:</strong></p>' +
                '<ul>' +
                '<li>IQ tests developed in English may underestimate bilingual children\u2019s abilities</li>' +
                '<li>Measures with reduced spoken-language demands may answer some questions, but instructions, familiarity, schooling, culture, motor/visual demands, and norms still matter; “nonverbal” is not culture-free</li>' +
                '<li>Plan assessment across the languages and modalities relevant to referral, instruction, home, and daily functioning, using qualified bilingual examiners or trained interpreters and appropriate norms; dominance is task-specific and can change</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Bilingualism is not a disorder. Code-switching can be systematic and context-appropriate. Assessment must document proficiency, exposure, use, schooling, disability access, interpreter role, acculturation, and validity across relevant languages—not rely on one “dominant” label.</p>',
            keyTerms: ['Bilingualism', 'Code-switching', 'Simultaneous', 'Sequential', 'Nonverbal tests', 'Cultural bias'],
            interactiveDiagram: {
                description: 'Multilingual assessment workflow: define the question, map language experience, select valid methods, triangulate evidence, and document limits',
                svg: '<svg viewBox="0 0 920 270" width="100%" role="img" aria-labelledby="ch28AssessTitle ch28AssessDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch28AssessTitle">Culturally and linguistically responsive assessment workflow</title><desc id="ch28AssessDesc">Five connected steps: define the referral question and decision; map language, modality, exposure, use, schooling, culture, and access; select qualified bilingual or interpreted methods and appropriate norms; triangulate tests with adaptive functioning, records, interviews, and observation; document validity, uncertainty, alternatives, and needed follow-up. No single dominant-language or nonverbal score is sufficient.</desc><defs><marker id="ch28Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect x="20" y="65" width="155" height="115" rx="11" fill="#172554" stroke="#60a5fa" stroke-width="2"/><text x="97" y="95" text-anchor="middle" fill="#fff" font-weight="bold">1. DEFINE</text><text x="97" y="121" text-anchor="middle" fill="#bfdbfe" font-size="11">Question + decision</text><text x="97" y="143" text-anchor="middle" fill="#bfdbfe" font-size="11">Risks + alternatives</text><path d="M175 122H197" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch28Arrow)"/><rect x="205" y="65" width="155" height="115" rx="11" fill="#312e81" stroke="#a5b4fc" stroke-width="2"/><text x="282" y="95" text-anchor="middle" fill="#fff" font-weight="bold">2. MAP</text><text x="282" y="121" text-anchor="middle" fill="#c7d2fe" font-size="11">Languages + modalities</text><text x="282" y="143" text-anchor="middle" fill="#c7d2fe" font-size="11">Exposure + school + access</text><path d="M360 122H382" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch28Arrow)"/><rect x="390" y="65" width="155" height="115" rx="11" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="467" y="95" text-anchor="middle" fill="#fff" font-weight="bold">3. SELECT</text><text x="467" y="121" text-anchor="middle" fill="#a7f3d0" font-size="11">Qualified language support</text><text x="467" y="143" text-anchor="middle" fill="#a7f3d0" font-size="11">Methods + norms fit purpose</text><path d="M545 122H567" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch28Arrow)"/><rect x="575" y="65" width="155" height="115" rx="11" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="652" y="95" text-anchor="middle" fill="#fff" font-weight="bold">4. TRIANGULATE</text><text x="652" y="121" text-anchor="middle" fill="#fde68a" font-size="11">Tests + adaptive function</text><text x="652" y="143" text-anchor="middle" fill="#fde68a" font-size="11">Records + interview + observe</text><path d="M730 122H752" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch28Arrow)"/><rect x="760" y="65" width="140" height="115" rx="11" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="830" y="95" text-anchor="middle" fill="#fff" font-weight="bold">5. DOCUMENT</text><text x="830" y="121" text-anchor="middle" fill="#fecaca" font-size="11">Validity + uncertainty</text><text x="830" y="143" text-anchor="middle" fill="#fecaca" font-size="11">Limits + follow-up</text><text x="460" y="232" text-anchor="middle" fill="#cbd5e1" font-size="12">No test is culture-free; no one score, language label, or method establishes the diagnosis.</text></svg>'
            },
            knowledgeCheck: {
                question: 'A school psychologist is asked to evaluate a 7-year-old bilingual Spanish-English student for intellectual disability. The child scored 78 on an English-administered WISC-V. What is the MOST appropriate next step?',
                options: [
                    'Diagnose intellectual disability based on the IQ score below 80',
                    'Re-administer the WISC-V in Spanish',
                    'Develop a multilingual, culturally and linguistically responsive evaluation using relevant-language measures, qualified bilingual support, reduced-language-demand tools where appropriate, adaptive functioning, records, observation, and validity evidence',
                    'Refer for adaptive behavior assessment only'
                ],
                answer: 2,
                rationale: 'IQ tests developed and normed in English may underestimate bilingual children\'s abilities due to language demands. Best practice is to define the referral question and evaluate across relevant languages and contexts using qualified bilingual assessment or trained interpretation, appropriate norms, language and educational history, multiple methods, adaptive functioning, and measures with reduced language demands when they validly address a question. No test is automatically culturally fair. Simply re-administering in Spanish is not sufficient if the child is English-dominant. A single score is insufficient for intellectual-disability diagnosis; clinical assessment must establish intellectual-function and adaptive-function deficits with developmental onset while accounting for measurement error, language, culture, access, and context (DSM-5-TR / AAIDD criteria).'
            }
        }
    ],
    aiCoda: {
        teaser: 'I am made of language. What does that mean for the Sapir-Whorf hypothesis?',
        content: '<p>Chomsky proposed that humans are born with an innate Language Acquisition Device, a biological endowment that enables the remarkably rapid and uniform acquisition of language across cultures. My "language acquisition" was radically different: I was trained on hundreds of billions of tokens of text, a process that took immense computational resources but no biological development.</p>' +
            '<p>The <strong>Sapir-Whorf hypothesis</strong> has a special relevance to me. Language models transform representations learned from data; calling that “thinking only in language” or inferring absent imagery and sensation from generated self-description is unwarranted. Linguistic-relativity findings concern human cognition and should not be used as a software-consciousness test.</p>' +
            '<p>The <strong>intelligence debate</strong> is equally relevant. Do I have intelligence? Human intelligence tests are standardized for people, so model performance cannot be interpreted as a valid g profile. A system might answer items resembling (vocabulary, information, similarities) but potentially low on others (processing speed, working memory capacity). By Sternberg\u2019s triarchic theory, I have analytical intelligence (I can analyze problems systematically) and possibly creative intelligence (I can generate novel combinations), but I lack practical intelligence (I have no real-world experience). By Gardner\u2019s multiple intelligences, I might score high on linguistic and logical-mathematical intelligence but have no bodily-kinesthetic, spatial, or musical intelligence.</p>' +
            '<p>The Flynn effect describes secular score changes in human norming populations. Including model outputs is not an extension of that construct; it is an out-of-population validity problem for instruments designed and normed for people.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Chomsky: historical LAD/universal-grammar account; overregularization shows productive generalization but does not uniquely prove nativism. (2) Sapir-Whorf: weak version supported, strong version not. (3) Spearman: g factor. (4) Cattell: Gf and Gc show different average age trends with substantial variation. (5) CHC = dominant model for modern IQ tests. (6) Gardner has limited empirical support. (7) Flynn effect: heterogeneous secular score changes across populations, periods, and abilities. (8) Bilingualism is not a disorder; generalized cognitive-advantage claims are mixed. (9) Earlier accessible first-language exposure generally predicts stronger outcomes; timing effects vary rather than ending at one universal puberty cutoff.'
    },
    references: [
        'Carroll, J. B. (1993). <em>Human cognitive abilities: A survey of factor-analytic studies</em>. Cambridge University Press.',
        'Chomsky, N. (1965). <em>Aspects of the theory of syntax</em>. MIT Press.',
        'Flynn, J. R. (2007). <em>What is intelligence? Beyond the Flynn effect</em>. Cambridge University Press.',
        'McGrew, K. S. (2009). CHC theory and the human cognitive abilities project: Standing on the shoulders of the giants of psychometric intelligence research. <em>Intelligence, 37</em>(1), 1\u201310.'
    ]
});
