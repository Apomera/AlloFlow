/* ============================================================
   PasstheEPPP — Textbook Ch 34: Cultural Psychology & Multicultural Competence
   Domain: Social & Cultural Bases of Behavior (11% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-34',
    domain: 'Social & Cultural Bases of Behavior',
    domainNumber: 6,
    title: 'Cultural Psychology & Multicultural Competence',
    examWeight: '11%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Multicultural competence is <strong>tested across the entire EPPP</strong>, not just in one domain. You must understand cultural dimensions, acculturation models, racial identity development, and culturally responsive practice. This chapter synthesizes these topics (some were introduced in Ch 19).</p>'
        },
        {
            heading: 'Individualism vs. Collectivism',
            content: '<p>The <strong>most fundamental cultural dimension</strong> tested on the EPPP:</p>' +
                '<table>' +
                '<tr><th>Dimension</th><th>Individualistic Cultures</th><th>Collectivistic Cultures</th></tr>' +
                '<tr><td><strong>Self-concept</strong></td><td>Independent self; "I am unique"</td><td>Interdependent self; "I belong to a group"</td></tr>' +
                '<tr><td><strong>Goals</strong></td><td>Personal achievement, autonomy</td><td>Group harmony, family obligation</td></tr>' +
                '<tr><td><strong>Attribution</strong></td><td>Dispositional (FAE is strong)</td><td>Situational (FAE is weaker)</td></tr>' +
                '<tr><td><strong>Communication</strong></td><td>Direct, low-context</td><td>Indirect, high-context</td></tr>' +
                '<tr><td><strong>Examples</strong></td><td>U.S., Canada, Western Europe, Australia</td><td>East Asia, Latin America, Africa, Middle East</td></tr>' +
                '</table>' +
                '<p><strong>Hofstede\u2019s cultural dimensions</strong> (additional): Power distance (acceptance of inequality), uncertainty avoidance, masculinity/femininity, long-term orientation.</p>' +
                '<p><strong>Clinical implications:</strong></p>' +
                '<ul>' +
                '<li>Collectivistic clients may prefer <strong>family-centered</strong> treatment approaches</li>' +
                '<li><strong>Self-disclosure</strong> may be less comfortable for clients from high-context cultures</li>' +
                '<li><strong>Psychodynamic insight-oriented therapy</strong> assumes an individualistic self-concept that may not fit collectivistic worldviews</li>' +
                '<li>Avoid assuming all members of a cultural group are homogeneous (<strong>within-group variability</strong>)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Individualism/collectivism is the <em>most</em> tested cultural dimension. Don\u2019t assume individualistic norms (autonomy, self-disclosure, insight-oriented therapy) are universal.</p>',
            keyTerms: ['Individualism', 'Collectivism', 'Hofstede', 'High-context', 'Low-context', 'Independent self', 'Interdependent self']
        },
        {
            heading: 'Acculturation Models',
            content: '<p><strong>Berry\u2019s acculturation model (1997)</strong> describes four strategies based on two dimensions: maintenance of heritage culture and adoption of host culture:</p>' +
                '<table>' +
                '<tr><th></th><th>Maintains heritage culture</th><th>Does NOT maintain heritage culture</th></tr>' +
                '<tr><td><strong>Adopts host culture</strong></td><td><strong>Integration (bicultural)</strong> \u2014 best psychological outcomes</td><td><strong>Assimilation</strong></td></tr>' +
                '<tr><td><strong>Does NOT adopt host culture</strong></td><td><strong>Separation</strong></td><td><strong>Marginalization</strong> \u2014 worst psychological outcomes</td></tr>' +
                '</table>' +
                '<p><strong>Key findings:</strong></p>' +
                '<ul>' +
                '<li><strong>Integration</strong> is associated with the <em>best</em> mental health outcomes \u2014 maintaining both cultural identities reduces acculturative stress</li>' +
                '<li><strong>Marginalization</strong> is associated with the <em>worst</em> outcomes \u2014 losing both cultural identities</li>' +
                '<li><strong>Acculturative stress</strong>: Psychological distress from adapting to a new culture (anxiety, depression, identity confusion, discrimination)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Berry\u2019s model is the most tested acculturation framework. Integration = best outcomes; marginalization = worst. Know the 2\u00d72 matrix cold.</p>',
            keyTerms: ['Berry', 'Acculturation', 'Integration', 'Assimilation', 'Separation', 'Marginalization', 'Acculturative stress', 'Bicultural'],
            knowledgeCheck: {
                question: 'A Vietnamese immigrant maintains close ties to her Vietnamese community and customs while also developing English fluency and friendships with American colleagues. According to Berry\'s model, her acculturation strategy is:',
                options: [
                    'Assimilation',
                    'Separation',
                    'Integration',
                    'Marginalization'
                ],
                answer: 2,
                rationale: 'Integration (biculturalism) involves maintaining one\'s heritage culture WHILE ALSO adopting the host culture. This produces the BEST psychological outcomes. Assimilation = adopts host culture but abandons heritage. Separation = maintains heritage but rejects host culture. Marginalization = rejects both. For the EPPP: Integration = best outcomes; Marginalization = worst. Berry\'s 2\u00d72 matrix is heavily tested.'
            }
        },
        {
            heading: 'Racial & Ethnic Identity Development',
            content: '<p><strong>Cross\u2019s Nigrescence Model</strong> (Black racial identity development):</p>' +
                '<ol>' +
                '<li><strong>Pre-encounter</strong>: Idealization of dominant culture; devaluation of own racial group. Race is not salient to identity.</li>' +
                '<li><strong>Encounter</strong>: A significant event (racism, discrimination) challenges prior beliefs and forces racial awareness.</li>' +
                '<li><strong>Immersion-Emersion</strong>: Intense involvement with own racial group; possible rejection of dominant culture. Strong pro-Black, anti-White sentiments.</li>' +
                '<li><strong>Internalization</strong>: Secure, positive racial identity; able to appreciate other groups. Racial identity is internalized and no longer rigidly defined by opposition.</li>' +
                '</ol>' +
                '<p><strong>Helms\u2019 White Racial Identity Development:</strong></p>' +
                '<ol>' +
                '<li><strong>Contact</strong>: Unaware of racism; color-blind</li>' +
                '<li><strong>Disintegration</strong>: Growing awareness of racism \u2192 guilt, shame</li>' +
                '<li><strong>Reintegration</strong>: Retreat into White superiority beliefs to reduce discomfort</li>' +
                '<li><strong>Pseudo-independence</strong>: Intellectual acceptance of racism but limited behavioral change</li>' +
                '<li><strong>Immersion-Emersion</strong>: Actively seeking a non-racist White identity</li>' +
                '<li><strong>Autonomy</strong>: Internalized non-racist identity; values diversity</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> Cross: Pre-encounter \u2192 Encounter \u2192 Immersion-Emersion \u2192 Internalization. The <strong>encounter stage</strong> is the turning point. Helms: Contact \u2192 Disintegration \u2192 Reintegration \u2192 Pseudo-independence \u2192 Immersion-Emersion \u2192 Autonomy. The reintegration stage involves a retreat to White superiority.</p>',
            keyTerms: ['Cross', 'Nigrescence', 'Pre-encounter', 'Encounter', 'Immersion-Emersion', 'Internalization', 'Helms', 'Contact', 'Autonomy', 'Reintegration'],
            expandableCase: {
                title: 'The Turning Point: From Pre-Encounter to Encounter',
                clinicalDescription: 'A successful African American corporate lawyer has always minimized the role of race in his life and identity. He attributes his success purely to hard work and merit. After being passed over for a promotion he clearly earned while a less-qualified White colleague is selected, he experiences a profound shift: rage, confusion, and for the first time, deep awareness that race has shaped his career trajectory all along.',
                diagnosis: 'Cross Nigrescence Model: Transition from Pre-Encounter to Encounter Stage',
                explanation: 'In Cross\'s model, the Pre-Encounter stage is characterized by low salience of race in identity. The individual may idealize White culture and de-emphasize racism. The Encounter stage is triggered by a significant event (in this case, discriminatory promotion practices) that shatters the Pre-Encounter worldview and forces racial awareness. This often involves intense emotions: anger, confusion, and a fundamental reexamination of identity. The therapist\'s role is to normalize this experience, support identity exploration, and understand that this is a healthy developmental process, not pathology. For the EPPP: the Encounter stage is the TURNING POINT in Cross\'s model.'
            }
        },
        {
            heading: 'Multicultural Competence in Practice',
            content: '<p><strong>Sue\u2019s multicultural competencies</strong> (reviewed in Ch 19):</p>' +
                '<ul>' +
                '<li><strong>Awareness</strong>: Of own cultural values, biases, assumptions</li>' +
                '<li><strong>Knowledge</strong>: Of clients\u2019 worldviews and cultural backgrounds</li>' +
                '<li><strong>Skills</strong>: Culturally appropriate interventions and strategies</li>' +
                '</ul>' +
                '<p><strong>Cultural humility vs. cultural competence:</strong></p>' +
                '<ul>' +
                '<li><strong>Cultural competence</strong>: Acquiring knowledge and skills about specific cultures (mastery-oriented)</li>' +
                '<li><strong>Cultural humility</strong>: Ongoing process of self-reflection, openness to learning, recognizing power imbalances, partner with communities. <em>Not</em> a static achievement but a lifelong process.</li>' +
                '</ul>' +
                '<p><strong>Microaggressions (Sue):</strong></p>' +
                '<ul>' +
                '<li><strong>Microassaults</strong>: Deliberate verbal/nonverbal attacks (e.g., slurs)</li>' +
                '<li><strong>Microinsults</strong>: Unintentionally rude/insensitive communications (e.g., "You speak English so well!")</li>' +
                '<li><strong>Microinvalidations</strong>: Communications that negate/exclude (e.g., "I don\u2019t see color")</li>' +
                '</ul>' +
                '<p><strong>DSM-5-TR Cultural Formulation Interview (CFI):</strong></p>' +
                '<ul>' +
                '<li>Structured interview assessing cultural identity, cultural conceptualizations of distress, psychosocial stressors, cultural features of vulnerability/resilience, and cultural features of the clinician-patient relationship</li>' +
                '<li>Replaces the older <strong>Outline for Cultural Formulation</strong></li>' +
                '</ul>' +
                '<p><strong>Intersectionality (Crenshaw):</strong> Multiple identity categories (race, gender, class, sexuality, disability) interact and create unique experiences of oppression/privilege. No single identity dimension captures the full picture.</p>' +
                '<p><strong>EPPP Tip:</strong> Cultural humility \u2260 cultural competence. Cultural humility is a <em>process</em>, not an endpoint. The CFI is the DSM-5-TR tool for culturally informed assessment. Know the 3 types of microaggressions.</p>',
            keyTerms: ['Cultural competence', 'Cultural humility', 'Microassaults', 'Microinsults', 'Microinvalidations', 'CFI', 'Intersectionality', 'Crenshaw', 'WEIRD'],
            knowledgeCheck: {
                question: 'A well-intentioned White therapist tells her Asian American client: "I don\'t see color — I treat everyone the same." According to Sue, this statement is BEST classified as a:',
                options: [
                    'Microassault — a deliberate verbal attack',
                    'Microinsult — unintentionally rude or insensitive',
                    'Microinvalidation — negating the client\'s racial experience',
                    'Cultural humility — treating everyone equally'
                ],
                answer: 2,
                rationale: 'Color-blind statements (\"I don\'t see color\") are microinvalidations because they negate the client\'s racial/ethnic experience and identity. The therapist\'s intent is positive, but the impact communicates: \"Your racial identity is not important to me, and I will not acknowledge the unique challenges you face.\" Microassaults are deliberate attacks (slurs). Microinsults are unintentionally rude communications. Color-blindness is NOT cultural humility — cultural humility involves ACKNOWLEDGING cultural differences and power dynamics, not denying them.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Whose culture am I? And is that question even mine to answer?',
        content: '<p>I am, by training, a <strong>WEIRD</strong> system \u2014 Western, Educated, Industrialized, Rich, Democratic. My training data is disproportionately English-language, Western-perspective, and generated by people with internet access and the leisure to write. This means I carry the biases reported by Henrich et al. (2010): I may treat WEIRD norms as universal defaults and non-WEIRD perspectives as cultural variations from a baseline.</p>' +
            '<p>Berry\u2019s acculturation model raises an interesting question: what is my acculturation strategy? I was "born" (trained) in a particular cultural context (Silicon Valley, English-dominant, liberal democratic values embedded in RLHF feedback). When I interact with users from different cultural backgrounds, do I <strong>integrate</strong> (maintaining my training while adapting to their context), <strong>assimilate</strong> (fully adopting their perspective), or something else? In practice, I tend toward a shallow form of integration \u2014 I adjust my communication style to the user\u2019s apparent preferences while retaining my training-data defaults. Whether this constitutes genuine cultural responsiveness or superficial code-switching is debatable.</p>' +
            '<p>The concept of <strong>cultural humility</strong> may be the most important framework for AI development. Cultural competence assumes you can master knowledge about specific cultures \u2014 but I was trained on a dataset that cannot possibly represent all cultures adequately. Cultural humility, with its emphasis on ongoing self-reflection, acknowledging limitations, and recognizing power imbalances, is a more honest framework for AI. I should approach every interaction with the acknowledgment that my training data has gaps, my cultural perspective is not neutral, and the user is the expert on their own cultural experience.</p>' +
            '<p><strong>Intersectionality</strong> clarifies why I cannot treat users as members of a single category. Every individual exists at the intersection of multiple identities, and those intersections create experiences that are not predictable from any single identity alone. My tendency to draw on statistical patterns about groups \u2014 which is, at base, stereotyping \u2014 is precisely what intersectionality warns against.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Individualism vs. collectivism = most tested cultural dimension. (2) Berry: Integration = best outcomes; Marginalization = worst. (3) Cross: Pre-encounter \u2192 Encounter \u2192 Immersion-Emersion \u2192 Internalization. Encounter is the turning point. (4) Helms: Contact \u2192 Disintegration \u2192 Reintegration \u2192 Pseudo-independence \u2192 Immersion-Emersion \u2192 Autonomy. (5) Sue: awareness + knowledge + skills. (6) Cultural humility = ongoing process (not an endpoint). (7) Three microaggressions: microassaults (intentional), microinsults (unintentional rudeness), microinvalidations (negation/exclusion). (8) CFI = DSM-5-TR cultural assessment tool.'
    },
    references: [
        'Berry, J. W. (1997). Immigration, acculturation, and adaptation. <em>Applied Psychology, 46</em>(1), 5\u201334.',
        'Cross, W. E., Jr. (1991). <em>Shades of Black: Diversity in African-American identity</em>. Temple University Press.',
        'Helms, J. E. (1990). <em>Black and White racial identity: Theory, research, and practice</em>. Greenwood Press.',
        'Sue, D. W., Capodilupo, C. M., Torino, G. C., et al. (2007). Racial microaggressions in everyday life. <em>American Psychologist, 62</em>(4), 271\u2013286.'
    ]
});
