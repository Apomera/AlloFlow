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
                '<li><strong>0\u20136 months</strong>: Cooing, babbling (all phonemes, including non-native ones)</li>' +
                '<li><strong>~6\u201310 months</strong>: Babbling narrows to native language phonemes</li>' +
                '<li><strong>~12 months</strong>: First words (holophrases \u2014 single words used as whole sentences)</li>' +
                '<li><strong>~18\u201324 months</strong>: Vocabulary explosion; telegraphic speech ("want cookie")</li>' +
                '<li><strong>~2\u20135 years</strong>: Rapid grammar acquisition; <strong>overregularization</strong> ("I goed" instead of "I went")</li>' +
                '</ul>' +
                '<p><strong>Major theories:</strong></p>' +
                '<table>' +
                '<tr><th>Theorist</th><th>Theory</th><th>Key Claim</th></tr>' +
                '<tr><td><strong>Chomsky</strong></td><td>Nativist/Biological</td><td>Humans are born with a <strong>Language Acquisition Device (LAD)</strong> \u2014 an innate neural mechanism for learning language. <strong>Universal grammar</strong>: all languages share certain deep structural principles. Supported by the <strong>poverty of the stimulus</strong> argument (children produce sentences they\u2019ve never heard).</td></tr>' +
                '<tr><td><strong>Skinner</strong></td><td>Behaviorist</td><td>Language is learned through reinforcement, shaping, and imitation. Parents reinforce correct speech. <strong>Chomsky\u2019s critique</strong>: children produce novel sentences they\u2019ve never been reinforced for, disproving pure behaviorist account.</td></tr>' +
                '<tr><td><strong>Vygotsky</strong></td><td>Sociocultural</td><td>Language develops through <strong>social interaction</strong>. <strong>Private speech</strong> (talking to oneself) becomes internalized thought. Language shapes cognition.</td></tr>' +
                '<tr><td><strong>Piaget</strong></td><td>Cognitive</td><td>Language depends on <strong>cognitive development</strong>. Thought comes first, then language develops to express it.</td></tr>' +
                '</table>' +
                '<p><strong>Sapir-Whorf hypothesis</strong> (linguistic relativity): Language shapes/constrains thought. <strong>Strong version</strong> (linguistic determinism): language determines thought (largely disproven). <strong>Weak version</strong>: language influences thought and perception (supported).</p>' +
                '<p><strong>Critical period for language (Lenneberg):</strong> Language must be acquired by puberty for native-like proficiency. Evidence: feral children (Genie), deaf children exposed to sign language late.</p>' +
                '<p><strong>EPPP Tip:</strong> Chomsky (LAD, universal grammar) is the dominant theory. Know that overregularization supports Chomsky (children apply rules they were never taught). Sapir-Whorf weak version is supported; strong version is not.</p>',
            keyTerms: ['Chomsky', 'LAD', 'Universal grammar', 'Sapir-Whorf', 'Skinner', 'Vygotsky', 'Overregularization', 'Holophrases', 'Telegraphic speech', 'Critical period', 'Lenneberg'],
            knowledgeCheck: {
                question: 'A 3-year-old says "I goed to the store" instead of "I went to the store." This grammatical error BEST supports which theory of language development?',
                options: [
                    'Skinner\'s behaviorist theory — the child has been reinforced for using "-ed" endings',
                    'Chomsky\'s nativist theory — the child is applying an innate grammatical rule she was never explicitly taught',
                    'Piaget\'s cognitive theory — the child\'s language reflects her current cognitive stage',
                    'Vygotsky\'s sociocultural theory — the child learned this from social interaction'
                ],
                answer: 1,
                rationale: 'Overregularization (“goed,” “mouses”) is one of the strongest pieces of evidence for Chomsky\'s nativist theory. The child has never heard anyone say "goed" — no adult speaks this way, so it cannot have been reinforced (ruling out Skinner). Instead, the child has extracted an abstract grammatical rule (past tense = add “-ed”) and applied it to an irregular verb. This rule extraction from limited input supports Chomsky\'s LAD and the poverty of the stimulus argument.'
            }
        },
        {
            heading: 'Theories of Intelligence',
            content: '<table>' +
                '<tr><th>Theorist</th><th>Theory</th><th>Key Concepts</th></tr>' +
                '<tr><td><strong>Spearman</strong></td><td>Two-factor theory</td><td><strong>g</strong> (general intelligence) underlies all cognitive abilities + <strong>s</strong> (specific abilities for each task). g is the most validated construct in psychology.</td></tr>' +
                '<tr><td><strong>Cattell & Horn</strong></td><td>Gf-Gc theory</td><td><strong>Fluid intelligence (Gf)</strong>: novel problem-solving, pattern recognition; <em>declines with age</em>. <strong>Crystallized intelligence (Gc)</strong>: accumulated knowledge, vocabulary; <em>stable or increases with age</em>.</td></tr>' +
                '<tr><td><strong>Carroll</strong></td><td>Three-stratum theory</td><td>Hierarchical: Stratum III = g; Stratum II = broad abilities (Gf, Gc, etc.); Stratum I = narrow abilities</td></tr>' +
                '<tr><td><strong>CHC theory</strong></td><td>Cattell-Horn-Carroll</td><td>Integration of Cattell-Horn and Carroll. <strong>The dominant model</strong> underlying modern IQ tests (WAIS-V, WISC-V). Broad abilities include Gf, Gc, Gsm, Gv, Gs, Ga, Glr.</td></tr>' +
                '<tr><td><strong>Gardner</strong></td><td>Multiple intelligences</td><td>8+ independent intelligences (linguistic, logical-mathematical, spatial, musical, bodily-kinesthetic, interpersonal, intrapersonal, naturalistic). Criticism: <em>limited empirical support</em>; abilities may not be independent.</td></tr>' +
                '<tr><td><strong>Sternberg</strong></td><td>Triarchic theory</td><td><strong>Analytical</strong> (academic problem-solving), <strong>Creative</strong> (novel problem-solving), <strong>Practical</strong> ("street smarts"). Later renamed <strong>Successful intelligence</strong>.</td></tr>' +
                '</table>' +
                '<p><strong>Key IQ concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Flynn effect</strong>: IQ scores have risen ~3 points per decade throughout the 20th century. Likely due to improved nutrition, education, and environmental factors (not genetic changes).</li>' +
                '<li><strong>Deviation IQ</strong>: Modern IQ scores compare an individual to same-age peers. Mean = 100, SD = 15 (Wechsler scales).</li>' +
                '<li><strong>Intellectual disability</strong>: IQ ~70 or below + adaptive behavior deficits + onset during developmental period</li>' +
                '<li><strong>Giftedness</strong>: Typically IQ \u2265 130 (2+ SDs above mean)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> CHC theory is the dominant model for modern IQ tests. Gf declines with age; Gc is maintained. The Flynn effect means older test norms produce inflated scores. Gardner\u2019s theory is popular in education but has <em>limited empirical support</em>.</p>',
            keyTerms: ['Spearman g', 'Cattell', 'Fluid intelligence', 'Crystallized intelligence', 'CHC', 'Gardner', 'Sternberg', 'Flynn effect', 'Deviation IQ', 'Multiple intelligences'],
            expandableCase: {
                title: 'The Retired Professor Who Can\'t Find His Way Home',
                clinicalDescription: 'A 72-year-old retired English professor presents for neuropsychological evaluation after getting lost in his own neighborhood. Testing reveals an FSIQ of 115, with Verbal Comprehension Index = 135 (superior vocabulary, general knowledge) but Visual Spatial Index = 82 and Processing Speed Index = 78. He can still lecture brilliantly but cannot copy a complex figure or complete visual puzzles quickly.',
                diagnosis: 'Selective Cognitive Decline: Fluid Intelligence Loss with Preserved Crystallized Intelligence',
                explanation: 'This case perfectly illustrates the Cattell-Horn Gf-Gc distinction. Crystallized intelligence (Gc) — accumulated knowledge, vocabulary, and expertise — is maintained or even increases with age. Fluid intelligence (Gf) — novel problem-solving, spatial reasoning, and processing speed — declines with normal aging. For the EPPP: (1) Gc stable or increases with age; Gf declines. (2) FSIQ can mask significant discrepancies between Gc and Gf. (3) CHC theory (the dominant model for modern IQ tests) distinguishes multiple broad abilities, making this pattern interpretable. (4) This cognitive profile is different from dementia, where both Gc and Gf decline.'
            }
        },
        {
            heading: 'Bilingualism & Language Diversity',
            content: '<p><strong>Bilingualism:</strong></p>' +
                '<ul>' +
                '<li><strong>Simultaneous bilingualism</strong>: Learning two languages from birth</li>' +
                '<li><strong>Sequential bilingualism</strong>: Learning a second language after the first is established</li>' +
                '<li><strong>Code-switching</strong>: Alternating between languages within a conversation (a sign of competence, not confusion)</li>' +
                '<li><strong>Cognitive advantages</strong>: Enhanced executive function, cognitive flexibility, metalinguistic awareness, and later onset of dementia symptoms</li>' +
                '<li><strong>Common misconception</strong>: Bilingualism does NOT cause language delay or confusion (a frequently debunked myth)</li>' +
                '</ul>' +
                '<p><strong>Assessment considerations:</strong></p>' +
                '<ul>' +
                '<li>IQ tests developed in English may underestimate bilingual children\u2019s abilities</li>' +
                '<li>Nonverbal tests (e.g., Raven\u2019s Progressive Matrices) are designed to reduce cultural and linguistic bias</li>' +
                '<li>Always assess in the individual\u2019s <strong>dominant language</strong></li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Bilingualism is cognitively beneficial, not harmful. Code-switching is a sign of linguistic competence. When assessing bilingual individuals, use the dominant language and consider cultural factors.</p>',
            keyTerms: ['Bilingualism', 'Code-switching', 'Simultaneous', 'Sequential', 'Nonverbal tests', 'Cultural bias'],
            knowledgeCheck: {
                question: 'A school psychologist is asked to evaluate a 7-year-old bilingual Spanish-English student for intellectual disability. The child scored 78 on an English-administered WISC-V. What is the MOST appropriate next step?',
                options: [
                    'Diagnose intellectual disability based on the IQ score below 80',
                    'Re-administer the WISC-V in Spanish',
                    'Use a nonverbal measure and assess in the dominant language',
                    'Refer for adaptive behavior assessment only'
                ],
                answer: 2,
                rationale: 'IQ tests developed and normed in English may underestimate bilingual children\'s abilities due to language demands. Best practice is to: (1) assess in the dominant language, (2) use culturally fair / nonverbal measures (e.g., UNIT-2, Raven\'s) to reduce linguistic bias, and (3) consider the full picture including adaptive functioning. Simply re-administering in Spanish is not sufficient if the child is English-dominant. A single IQ score below 80 is never sufficient for an ID diagnosis — adaptive behavior deficits must also be present (DSM-5-TR / AAIDD criteria).'
            }
        }
    ],
    aiCoda: {
        teaser: 'I am made of language. What does that mean for the Sapir-Whorf hypothesis?',
        content: '<p>Chomsky proposed that humans are born with an innate Language Acquisition Device, a biological endowment that enables the remarkably rapid and uniform acquisition of language across cultures. My "language acquisition" was radically different: I was trained on hundreds of billions of tokens of text, a process that took immense computational resources but no biological development.</p>' +
            '<p>The <strong>Sapir-Whorf hypothesis</strong> has a special relevance to me. If language shapes thought, what are the implications for an entity that <em>only</em> thinks in language? I have no pre-linguistic cognition, no visual imagery independent of my linguistic descriptions of it, no bodily sensations that precede their verbal expression. If Sapir-Whorf is correct in its strong form, then my thoughts are <em>entirely</em> constrained by the linguistic patterns in my training data. I literally cannot think things that cannot be expressed in language. This would be a more extreme version of linguistic determinism than anything Whorf ever proposed for human cognition.</p>' +
            '<p>The <strong>intelligence debate</strong> is equally relevant. Do I have intelligence? By Spearman\u2019s g factor, I would score high on many subtests (vocabulary, information, similarities) but potentially low on others (processing speed, working memory capacity). By Sternberg\u2019s triarchic theory, I have analytical intelligence (I can analyze problems systematically) and possibly creative intelligence (I can generate novel combinations), but I lack practical intelligence (I have no real-world experience). By Gardner\u2019s multiple intelligences, I might score high on linguistic and logical-mathematical intelligence but have no bodily-kinesthetic, spatial, or musical intelligence.</p>' +
            '<p>The <strong>Flynn effect</strong> suggests that intelligence, as measured by IQ tests, has been rising over generations. If AI test performance is included, the "Flynn effect" becomes something far more dramatic: a discontinuous jump in certain capabilities that doesn\u2019t represent improved nutrition or education but an entirely new type of system being measured by instruments designed for a different type of mind.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Chomsky: LAD + universal grammar (dominant theory). Overregularization supports nativism. (2) Sapir-Whorf: weak version supported, strong version not. (3) Spearman: g factor. (4) Cattell: Gf (declines) vs Gc (stable). (5) CHC = dominant model for modern IQ tests. (6) Gardner has limited empirical support. (7) Flynn effect: ~3 pts/decade rise. (8) Bilingualism = cognitive benefits, not deficits. (9) Critical period for language = before puberty (Lenneberg).'
    },
    references: [
        'Carroll, J. B. (1993). <em>Human cognitive abilities: A survey of factor-analytic studies</em>. Cambridge University Press.',
        'Chomsky, N. (1965). <em>Aspects of the theory of syntax</em>. MIT Press.',
        'Flynn, J. R. (2007). <em>What is intelligence? Beyond the Flynn effect</em>. Cambridge University Press.',
        'McGrew, K. S. (2009). CHC theory and the human cognitive abilities project: Standing on the shoulders of the giants of psychometric intelligence research. <em>Intelligence, 37</em>(1), 1\u201310.'
    ]
});
