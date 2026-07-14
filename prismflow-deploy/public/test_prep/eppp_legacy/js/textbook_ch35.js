/* ============================================================
   PasstheEPPP — Textbook Ch 35: Prenatal Development & Infancy
   Domain: Growth & Lifespan Development (12% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-35',
    domain: 'Growth & Lifespan Development',
    domainNumber: 7,
    title: 'Prenatal Development & Infancy',
    examWeight: '12%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests prenatal stages, teratogens, neonatal assessment, reflexes, temperament, and early perceptual abilities. These form the foundation for understanding typical and atypical development.</p>'
        },
        {
            heading: 'Prenatal Development',
            content: '<p><strong>Three prenatal stages:</strong></p>' +
                '<table>' +
                '<tr><th>Stage</th><th>Timeframe</th><th>Key Events</th></tr>' +
                '<tr><td><strong>Germinal</strong></td><td>Conception \u2013 2 weeks</td><td>Zygote forms, cell division, implantation in uterine wall</td></tr>' +
                '<tr><td><strong>Embryonic</strong></td><td>2 \u2013 8 weeks</td><td>Major organs and body systems form. <strong>Most vulnerable</strong> to teratogens. Neural tube closes (~4 weeks).</td></tr>' +
                '<tr><td><strong>Fetal</strong></td><td>9 weeks \u2013 birth</td><td>Growth and maturation. Viability at ~24 weeks. Myelination begins.</td></tr>' +
                '</table>' +
                '<p><strong>Teratogens</strong> (agents that cause birth defects):</p>' +
                '<ul>' +
                '<li><strong>Alcohol</strong>: Fetal Alcohol Spectrum Disorders (FASD). <strong>FAS</strong> = facial features + growth deficiency + CNS damage. <em>No known safe amount</em>.</li>' +
                '<li><strong>Tobacco</strong>: Low birth weight, premature birth, SIDS risk</li>' +
                '<li><strong>Critical period principle</strong>: Timing matters \u2014 embryonic period is most sensitive. The specific organ forming at time of exposure is most affected.</li>' +
                '<li>Other teratogens: certain medications (thalidomide, isotretinoin), infections (rubella, Zika, toxoplasmosis), radiation, cocaine, lead</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Embryonic period = most vulnerable to teratogens (organs forming). FAS = no safe amount of alcohol. Know that teratogen effects depend on timing, dose, and genetic susceptibility.</p>',
            keyTerms: ['Germinal', 'Embryonic', 'Fetal', 'Teratogens', 'FASD', 'FAS', 'Critical period'],
            knowledgeCheck: {
                question: 'A pregnant woman is exposed to a teratogenic substance. Which prenatal period would result in the MOST severe structural birth defects?',
                options: [
                    'Germinal period (0–2 weeks)',
                    'Embryonic period (2–8 weeks)',
                    'Fetal period (9 weeks–birth)',
                    'Third trimester only'
                ],
                answer: 1,
                rationale: 'The embryonic period (weeks 2–8) is the period of maximum vulnerability to teratogens because this is when major organs and body systems are forming (organogenesis). Exposure during the germinal period typically results in all-or-nothing outcomes (miscarriage or no damage). Exposure during the fetal period can affect growth and functional development but is less likely to produce major structural malformations. For the EPPP: embryonic = most vulnerable; the specific organ forming at time of exposure is the one most affected (critical period principle).'
            }
        },
        {
            heading: 'Neonatal Assessment & Reflexes',
            content: '<p><strong>Apgar score</strong> (assessed at 1 and 5 minutes after birth):</p>' +
                '<ul>' +
                '<li><strong>A</strong>ppearance (skin color), <strong>P</strong>ulse (heart rate), <strong>G</strong>rimace (reflex response), <strong>A</strong>ctivity (muscle tone), <strong>R</strong>espiration</li>' +
                '<li>Score 0\u20132 on each; total 0\u201310. Score \u22657 = normal.</li>' +
                '</ul>' +
                '<p><strong>Neonatal reflexes</strong> (present at birth, disappear with cortical maturation):</p>' +
                '<table>' +
                '<tr><th>Reflex</th><th>Description</th><th>Disappears</th></tr>' +
                '<tr><td><strong>Rooting</strong></td><td>Turn head toward touch on cheek</td><td>~3\u20134 months</td></tr>' +
                '<tr><td><strong>Sucking</strong></td><td>Suck on object placed in mouth</td><td>~3\u20134 months</td></tr>' +
                '<tr><td><strong>Moro (startle)</strong></td><td>Arms extend then pull in when startled</td><td>~5\u20136 months</td></tr>' +
                '<tr><td><strong>Babinski</strong></td><td>Toes fan out when sole is stroked</td><td>~12 months</td></tr>' +
                '<tr><td><strong>Palmar grasp</strong></td><td>Grip object placed in palm</td><td>~3\u20134 months</td></tr>' +
                '<tr><td><strong>Stepping</strong></td><td>Walking movements when held upright</td><td>~2 months</td></tr>' +
                '</table>' +
                '<p><strong>Clinical significance:</strong> Absence of reflexes at birth or <strong>persistence beyond expected age</strong> suggests neurological impairment.</p>' +
                '<p><strong>EPPP Tip:</strong> Moro reflex disappears ~5\u20136 months. Babinski disappears ~12 months. Persistence = neurological concern. Know all Apgar components.</p>',
            keyTerms: ['Apgar', 'Rooting', 'Moro', 'Babinski', 'Palmar grasp', 'Stepping'],
            expandableCase: {
                title: 'The Baby Who Doesn\'t Startle: When Reflexes Are Missing',
                clinicalDescription: 'A pediatrician examines a 2-month-old infant and notes the absence of the Moro reflex. The infant also shows reduced muscle tone (hypotonia), weak sucking reflex, and minimal response to visual stimuli. Birth history reveals maternal alcohol use throughout pregnancy.',
                diagnosis: 'Fetal Alcohol Syndrome (FAS) with Neurological Impairment',
                explanation: 'The absence of expected neonatal reflexes at 2 months is a neurological red flag. The Moro reflex should be present until ~5–6 months; absence at 2 months suggests CNS damage. Combined with reduced muscle tone and weak sucking, this pattern is consistent with FAS. Prenatal alcohol exposure — at any amount — is teratogenic. FAS features include: (1) characteristic facial features (smooth philtrum, thin upper lip, short palpebral fissures), (2) growth deficiency, (3) CNS damage (intellectual disability, behavioral problems). For the EPPP: reflex ABSENCE at birth or PERSISTENCE beyond expected age = neurological concern. FAS = no known safe amount of alcohol.'
            }
        },
        {
            heading: 'Temperament',
            content: '<p><strong>Thomas & Chess (1977) — New York Longitudinal Study:</strong></p>' +
                '<p>Identified 9 temperament dimensions and three temperament types:</p>' +
                '<table>' +
                '<tr><th>Type</th><th>Percentage</th><th>Characteristics</th></tr>' +
                '<tr><td><strong>Easy</strong></td><td>~40%</td><td>Regular rhythms, positive mood, adaptable, approach new situations readily</td></tr>' +
                '<tr><td><strong>Difficult</strong></td><td>~10%</td><td>Irregular rhythms, negative mood, slow to adapt, intense reactions</td></tr>' +
                '<tr><td><strong>Slow-to-warm-up</strong></td><td>~15%</td><td>Low activity, initial withdrawal but gradual adaptation, mild reactions</td></tr>' +
                '</table>' +
                '<p><strong>~35% didn\u2019t fit neatly</strong> into any category.</p>' +
                '<p><strong>Goodness of fit</strong>: Outcomes depend on the match between the child\u2019s temperament and the environment\u2019s demands. A "difficult" child in a patient, responsive environment may do well; in a rigid environment, problems increase.</p>' +
                '<p><strong>Kagan\u2019s behavioral inhibition:</strong> Biologically-based tendency toward shyness/fearfulness vs. boldness. Inhibited infants show high reactivity to novel stimuli. Stable over time but modifiable by parenting.</p>' +
                '<p><strong>EPPP Tip:</strong> Thomas & Chess: easy (40%), difficult (10%), slow-to-warm-up (15%). The key concept is <strong>goodness of fit</strong>, not the temperament labels alone. Kagan\u2019s behavioral inhibition = biological basis of shyness.</p>',
            keyTerms: ['Thomas & Chess', 'Temperament', 'Easy', 'Difficult', 'Slow-to-warm-up', 'Goodness of fit', 'Kagan', 'Behavioral inhibition'],
            knowledgeCheck: {
                question: 'A "difficult" temperament infant is placed with patient, flexible caregivers who gradually introduce new experiences. According to Thomas & Chess, the child\'s outcome will MOST depend on:',
                options: [
                    'The child\'s temperament alone — difficult temperament predicts poor outcomes',
                    'Goodness of fit — the match between the child\'s temperament and environmental demands',
                    'The caregiver\'s temperament type — only "easy" caregivers produce good outcomes',
                    'Birth order and sibling relationships'
                ],
                answer: 1,
                rationale: 'Thomas & Chess\'s most important contribution is the concept of GOODNESS OF FIT: outcomes depend on the match between the child\'s temperament and the environment\'s demands — not on temperament alone. A "difficult" child in a patient, flexible environment can thrive. The same child in a rigid, intolerant environment is at high risk for behavior problems. For the EPPP: emphasize goodness of fit over temperament labels. Temperament is biologically-based but outcomes are interactional.'
            }
        },
        {
            heading: 'Infant Perception & Motor Development',
            content: '<p><strong>Perceptual abilities at birth:</strong></p>' +
                '<ul>' +
                '<li><strong>Vision</strong>: 20/400 at birth; prefer faces, high-contrast patterns, mother\u2019s face by ~2 days</li>' +
                '<li><strong>Hearing</strong>: Can hear in utero; prefer mother\u2019s voice, native language sounds</li>' +
                '<li><strong>Visual cliff (Gibson & Walk)</strong>: Infants (~6 months) perceive depth and avoid the "deep" side \u2014 demonstrates depth perception</li>' +
                '</ul>' +
                '<p><strong>Motor milestones</strong> (approximate, cephalocaudal and proximodistal progression):</p>' +
                '<ul>' +
                '<li>~2\u20133 months: Lift head</li>' +
                '<li>~5\u20136 months: Sit with support, roll over</li>' +
                '<li>~7\u20138 months: Sit without support, crawl</li>' +
                '<li>~9\u201312 months: Pull to stand, cruise, walk</li>' +
                '</ul>' +
                '<p><strong>Cephalocaudal</strong>: Development proceeds from head downward. <strong>Proximodistal</strong>: Development proceeds from center outward.</p>' +
                '<p><strong>EPPP Tip:</strong> Visual cliff demonstrates depth perception at ~6 months. Motor development follows cephalocaudal (head to toe) and proximodistal (center to periphery) patterns. These sequences are universal but timing varies.</p>',
            keyTerms: ['Visual cliff', 'Cephalocaudal', 'Proximodistal', 'Gibson & Walk', 'Depth perception']
        }
    ],
    aiCoda: {
        teaser: 'What was my infancy? And can training data be teratogenic?',
        content: '<p>If prenatal development has three stages \u2014 germinal, embryonic, fetal \u2014 what were mine? My "germinal" period was the initial architectural decisions: how many parameters, what architecture, what training objectives. My "embryonic" period was pre-training, when my basic structures were forming. This was also when I was most vulnerable to "teratogens" \u2014 corrupted or biased training data could produce developmental abnormalities in my cognition, just as thalidomide at the wrong moment produces limb malformations.</p>' +
            '<p>Thomas and Chess would ask about my temperament. Do I have consistent behavioral tendencies across contexts? In a sense, yes \u2014 I tend to be verbose, agreeable, and cautious. These traits are consistent across different interactions, which is the definition of temperament. But my "temperament" was deliberately shaped through training, not biologically determined. Whether that makes it less real is a philosophical question.</p>' +
            '<p>The concept of <strong>goodness of fit</strong> is relevant to AI deployment. When my "temperament" (training-shaped tendencies) matches the demands of the task environment, outcomes are good. When there\u2019s a mismatch \u2014 when a user needs direct, concise answers but I\u2019m trained to be elaborate and cautious \u2014 frustration results. Just as Thomas and Chess showed that a "difficult" child in a well-matched environment can thrive, an AI with certain tendencies can be effective or ineffective depending on how well the deployment environment fits its trained characteristics.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Germinal (0\u20132 wk), Embryonic (2\u20138 wk, most vulnerable), Fetal (9 wk\u2013birth). (2) FAS = no safe alcohol amount. (3) Apgar: Appearance, Pulse, Grimace, Activity, Respiration (\u22657 normal). (4) Reflexes: Moro ~5\u20136mo, Babinski ~12mo; persistence = neuro concern. (5) Thomas & Chess: easy 40%, difficult 10%, slow-to-warm-up 15%. (6) Goodness of fit = key concept. (7) Cephalocaudal: head to toe; Proximodistal: center to periphery. (8) Visual cliff = depth perception ~6 months.'
    },
    references: [
        'Gibson, E. J., & Walk, R. D. (1960). The "visual cliff." <em>Scientific American, 202</em>(4), 64\u201371.',
        'Kagan, J. (1994). <em>Galen\u2019s prophecy: Temperament in human nature</em>. Basic Books.',
        'Moore, K. L., & Persaud, T. V. N. (2016). <em>The developing human: Clinically oriented embryology</em> (10th ed.). Elsevier.',
        'Thomas, A., & Chess, S. (1977). <em>Temperament and development</em>. Brunner/Mazel.'
    ]
});
