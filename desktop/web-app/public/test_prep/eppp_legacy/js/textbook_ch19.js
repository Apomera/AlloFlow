/* ============================================================
   PasstheEPPP — Textbook Ch 19: Stages of Change, MI & Special Populations
   Domain: Treatment, Intervention & Prevention (15% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-19',
    domain: 'Treatment, Intervention & Prevention',
    domainNumber: 3,
    title: 'Stages of Change, MI & Special Populations',
    examWeight: '15%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests the Transtheoretical Model (TTM), Motivational Interviewing (MI), multicultural responsiveness, and developmentally appropriate care. Learn model-specific vocabulary while avoiding age, culture, or stage labels as substitutes for individualized assessment, consent, context, evidence, and client goals.</p>'
        },
        {
            heading: 'The Transtheoretical Model (Prochaska & DiClemente)',
            content: '<p>The <strong>Transtheoretical Model (TTM)</strong> describes how people change behavior, whether or not they are in therapy. Change is a <em>process</em>, not an event.</p>' +
                '<table>' +
                '<tr><th>Stage</th><th>Client Characteristics</th><th>Therapeutic Strategy</th></tr>' +
                '<tr><td><strong>Precontemplation</strong></td><td>Not currently considering change, which may reflect different priorities, limited information, low perceived relevance, coercion, discouragement, or other reasons—not a fixed trait called “resistance.”</td><td>Understand perspective and context; ask permission to exchange information; explore concerns without confrontation or labeling</td></tr>' +
                '<tr><td><strong>Contemplation</strong></td><td>"I know I should change, but\u2026" Aware of the problem but ambivalent. Weighing pros and cons.</td><td>Explore ambivalence; tip the decisional balance; elicit change talk</td></tr>' +
                '<tr><td><strong>Preparation</strong></td><td>"I\u2019m going to change soon." Intending to act within the next month; may be taking small steps.</td><td>Develop a concrete plan; identify resources; build confidence</td></tr>' +
                '<tr><td><strong>Action</strong></td><td>"I\u2019m doing it." Actively modifying behavior, environment, or experiences.</td><td>Support behavior change; reinforce progress; address obstacles</td></tr>' +
                '<tr><td><strong>Maintenance</strong></td><td>"I\u2019ve been doing it for 6+ months." Working to prevent relapse; consolidating gains.</td><td>Relapse prevention; identify triggers; build sustainable lifestyle</td></tr>' +
                '<tr><td><strong>Termination</strong></td><td>No temptation; 100% self-efficacy. (Not all models include this stage; some view maintenance as ongoing.)</td><td>May be more theoretical than practical for most behavioral changes</td></tr>' +
                '</table>' +
                '<p><strong>Key principles:</strong></p>' +
                '<ul>' +
                '<li>Change can be nonlinear. A return to a prior behavior may prompt reassessment and learning; it is possible, not required, and should not be moralized.</li>' +
                '<li>Stage-informed tailoring is a TTM hypothesis and planning heuristic, not a guarantee that a particular intervention will succeed or fail. Readiness can vary by behavior, goal, context, and time.</li>' +
                '<li>The <strong>processes of change</strong> differ by stage: experiential processes (consciousness raising, dramatic relief) work early; behavioral processes (reinforcement management, stimulus control) work later.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> For exam vignettes, contemplating change while ambivalent cues contemplation; not considering change cues precontemplation. In practice, describe the person’s current language about a specific change rather than assigning a global identity or assuming denial.</p>',
            keyTerms: ['Transtheoretical model', 'Prochaska', 'DiClemente', 'Precontemplation', 'Contemplation', 'Preparation', 'Action', 'Maintenance', 'Stages of change'],
            interactiveDiagram: {
                description: 'TTM stages as a revisable change snapshot',
                svg: '<svg viewBox="0 0 800 320" width="100%" role="img" aria-labelledby="ch19TtmTitle ch19TtmDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch19TtmTitle">Transtheoretical Model change stages</title><desc id="ch19TtmDesc">A nonlinear sequence from precontemplation through contemplation, preparation, action, and maintenance, with dotted paths showing that setbacks or reassessment may return a person to an earlier stage. Stage is specific to a behavior and time.</desc><defs><marker id="ch19Arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker><marker id="ch19ReturnArr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444"/></marker></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Cycle of Change (Prochaska &amp; DiClemente)</text><circle cx="150" cy="180" r="45" fill="#64748b" opacity="0.8"/><text x="150" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Pre-</text><text x="150" y="190" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">contemplation</text><text x="150" y="240" text-anchor="middle" fill="#94a3b8" font-size="10">"No problem"</text><path d="M 190 150 Q 235 110 280 125" fill="none" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19Arr)"/><circle cx="320" cy="120" r="45" fill="#3b82f6" opacity="0.8"/><text x="320" y="125" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Contemplation</text><text x="320" y="70" text-anchor="middle" fill="#94a3b8" font-size="10">"Maybe a problem"</text><path d="M 365 120 L 435 120" fill="none" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19Arr)"/><circle cx="480" cy="120" r="45" fill="#f59e0b" opacity="0.8"/><text x="480" y="125" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Preparation</text><text x="480" y="70" text-anchor="middle" fill="#94a3b8" font-size="10">"Getting ready"</text><path d="M 520 145 Q 565 180 565 220" fill="none" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19Arr)"/><circle cx="560" cy="250" r="45" fill="#10b981" opacity="0.8"/><text x="560" y="255" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Action</text><text x="640" y="255" text-anchor="start" fill="#94a3b8" font-size="10">"Doing it"</text><path d="M 515 260 L 445 260" fill="none" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19Arr)"/><circle cx="400" cy="260" r="45" fill="#8b5cf6" opacity="0.8"/><text x="400" y="265" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Maintenance</text><text x="400" y="320" text-anchor="middle" fill="#94a3b8" font-size="10">"Keeping at it"</text><path d="M 380 220 Q 350 160 330 165" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#ch19ReturnArr)"/><path d="M 530 220 Q 400 150 350 150" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#ch19ReturnArr)"/><text x="430" y="190" fill="#ef4444" font-size="10" font-weight="bold" transform="rotate(-25 430 190)">RETURN / REASSESS</text></svg>'
            },
            knowledgeCheck: {
                question: 'A court-mandated client arrives at his first session and states: "My wife says I drink too much, but I only drink on weekends and I never miss work. I don\'t know why the judge sent me here." According to the Transtheoretical Model, which stage of change is this client in?',
                options: [
                    'Contemplation',
                    'Precontemplation',
                    'Preparation',
                    'Action'
                ],
                answer: 1,
                rationale: 'For this specific drinking change, the client is not currently considering change, which maps to precontemplation. Court involvement and disagreement do not establish a stable personality trait or prove the absence of risk. A fitting response is collaborative engagement, assessment, and permission-based information—not confrontation or a forced action plan.'
            }
        },
        {
            heading: 'Motivational Interviewing (Miller & Rollnick)',
            content: '<p><strong>Motivational Interviewing (MI)</strong> is a collaborative, person-centered way of communicating about change and growth that pays particular attention to the person’s own language, reasons, autonomy, and commitment. It can explore ambivalence without assuming every person is ambivalent or that motivation is purely “intrinsic.”</p>' +
                '<p><strong>The Spirit of MI:</strong></p>' +
                '<ul>' +
                '<li><strong>Partnership</strong>: Collaborative, not hierarchical</li>' +
                '<li><strong>Acceptance</strong>: Absolute worth (like UPR), autonomy, empathy, affirmation</li>' +
                '<li><strong>Compassion</strong>: Promoting the client\u2019s welfare</li>' +
                '<li><strong>Evocation</strong>: Drawing out motivation from the client, not installing it</li>' +
                '</ul>' +
                '<p><strong>Core skills (OARS):</strong></p>' +
                '<table>' +
                '<tr><th>Skill</th><th>Description</th></tr>' +
                '<tr><td><strong>O</strong>pen-ended questions</td><td>"What concerns you about your drinking?" (not "Do you think you drink too much?")</td></tr>' +
                '<tr><td><strong>A</strong>ffirmations</td><td>"It took courage to come in today" \u2014 acknowledging the client\u2019s strengths</td></tr>' +
                '<tr><td><strong>R</strong>eflective listening</td><td>Mirroring back what the client says, at or beyond the surface level</td></tr>' +
                '<tr><td><strong>S</strong>ummarizing</td><td>Collecting what\u2019s been said; linking themes; transitioning</td></tr>' +
                '</table>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Change talk</strong>: Person’s language favoring movement toward a target change, including preparatory DARN language and mobilizing commitment, activation, or taking-steps language. The clinician evokes and responds to it without manufacturing or coercing it.</li>' +
                '<li><strong>Sustain talk</strong>: Language favoring the status quo relative to a target change. It is not the same as discord and is not evidence of a resistant client.</li>' +
                '<li><strong>Discord</strong>: Strain in the working relationship, such as arguing, interrupting, disengaging, or discounting. Earlier MI editions used “resistance”; current teaching separates relational discord from sustain talk and invites the practitioner to repair partnership.</li>' +
                '<li><strong>Developing discrepancy</strong>: Helping clients see the gap between their values/goals and their current behavior</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> MI is <em>non-confrontational</em>. If a question describes a therapist who argues with the client about needing to change, that is NOT MI. MI avoids the righting reflex, supports autonomy, listens reflectively, and evokes the person’s own reasons for change. Its effects vary by outcome, population, comparator, delivery quality, and context; do not treat it as uniformly superior for every substance-use or health behavior.</p>',
            keyTerms: ['Motivational Interviewing', 'Miller', 'Rollnick', 'OARS', 'Change talk', 'Sustain talk', 'Rolling with resistance', 'Ambivalence', 'Developing discrepancy']
        },
        {
            heading: 'Multicultural Competence (Sue)',
            content: '<p><strong>Derald Wing Sue and colleagues</strong> advanced a widely taught tripartite framework of awareness/beliefs, knowledge, and skills. It is foundational exam vocabulary but not a complete endpoint for culturally responsive practice, which also involves humility, power, structural context, language, intersectionality, and ongoing accountability:</p>' +
                '<table>' +
                '<tr><th>Component</th><th>Description</th></tr>' +
                '<tr><td><strong>Awareness</strong></td><td>Understanding your own cultural assumptions, values, biases, and worldview. Recognizing how your background influences your clinical work.</td></tr>' +
                '<tr><td><strong>Knowledge</strong></td><td>Understanding the worldview of culturally diverse clients. Knowing about specific cultural groups, sociopolitical influences, and institutional barriers.</td></tr>' +
                '<tr><td><strong>Skills</strong></td><td>Developing culturally appropriate intervention strategies. Adapting techniques to match the client\u2019s cultural context.</td></tr>' +
                '</table>' +
                '<p><strong>Sue\u2019s Microaggressions:</strong> Brief, everyday exchanges that communicate denigrating messages to members of marginalized groups. Can be:</p>' +
                '<ul>' +
                '<li><strong>Microassaults</strong>: Explicit, intentional derogation (closest to "old-fashioned" discrimination)</li>' +
                '<li><strong>Microinsults</strong>: Subtly rude or insensitive comments that demean a person\u2019s identity</li>' +
                '<li><strong>Microinvalidations</strong>: Communications that exclude or negate the experiential reality of marginalized people (e.g., "I don\u2019t see color")</li>' +
                '</ul>' +
                '<p><strong>Key distinction: Cultural competence vs. cultural humility.</strong></p>' +
                '<ul>' +
                '<li><strong>Competence</strong> refers to developing relevant awareness, knowledge, and skills; it should not imply mastering or stereotyping a culture.</li>' +
                '<li><strong>Humility</strong> is an ongoing stance of openness, self-reflection, and recognition that you can never fully "master" another\u2019s cultural experience.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Sue\u2019s three components (awareness, knowledge, skills) are commonly tested. Awareness, knowledge, and skills are all necessary and iterative. Do not rely on a universal “first” action: attend to the immediate clinical need, ask rather than assume, examine power and bias, use language access, and adapt collaboratively.</p>',
            keyTerms: ['Sue', 'Multicultural competence', 'Awareness', 'Knowledge', 'Skills', 'Microaggressions', 'Microinsults', 'Microinvalidations', 'Cultural humility'],
            expandableCase: {
                title: 'The "Colorblind" Therapist',
                clinicalDescription: 'During an initial session, an African American client describes experiencing racial discrimination at work. The White therapist responds: "I don\'t see color. I treat everyone the same. Let\'s focus on what you can control." The client becomes quiet and disengaged for the remainder of the session.',
                diagnosis: 'Microinvalidation (Sue)',
                explanation: 'The therapist\'s "I don\'t see color" statement is a classic microinvalidation \u2014 it negates the client\'s lived experience of racism and communicates that their racial identity is irrelevant. By redirecting to "what you can control," the therapist avoids engaging with the systemic reality the client is describing. Within Sue’s taxonomy, “I don’t see color” can function as a microinvalidation by negating the relevance of racialized experience. The clinical repair is not merely labeling the statement: acknowledge impact, invite the client’s perspective without demanding education, take responsibility, and re-establish whether and how the client wants to proceed.'
            }
        },
        {
            heading: 'Treatment of Children & Adolescents',
            content: '<p>Working with children requires <strong>developmentally appropriate</strong> modifications to standard therapeutic approaches.</p>' +
                '<p><strong>Play therapy:</strong></p>' +
                '<ul>' +
                '<li>One developmentally adapted option for some children; age alone does not make play therapy the primary or best modality</li>' +
                '<li><strong>Child-Centered Play Therapy (CCPT)</strong>: Based on Rogers\u2019 principles. The therapist provides unconditional positive regard while the child leads the play. Non-directive.</li>' +
                '<li><strong>Cognitive-Behavioral Play Therapy (CBPT)</strong>: Incorporates CBT concepts through play activities. More structured and directive.</li>' +
                '<li>Play can support expression, relationship, rehearsal, and meaning-making. Children vary widely in language, cognition, neurodevelopment, culture, preference, and communication method.</li>' +
                '</ul>' +
                '<p><strong>Adolescent considerations:</strong></p>' +
                '<ul>' +
                '<li><strong>Privacy, assent/consent, and confidentiality</strong>: Explain protections and limits in developmentally accessible language; follow jurisdiction- and setting-specific law; provide private time when appropriate; involve caregivers collaboratively while prioritizing the young person’s welfare and safety</li>' +
                '<li><strong>Developmental tasks</strong>: Identity formation (Erikson), autonomy, peer relationships</li>' +
                '<li><strong>Evidence-based approaches</strong>: CBT, DBT-A (adolescent adaptation), Multisystemic Therapy (MST) for conduct problems, Family-Based Treatment (FBT) for eating disorders</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Play-based work is a classic exam association for young children, but “age five = play therapy” is not a defensible treatment rule. Assess the child’s symptoms, development, communication, family context, trauma/safety, preferences, caregiver needs, diagnosis when applicable, and evidence for the target problem; caregiver, family, behavioral, school, or other interventions may be central.</p>',
            keyTerms: ['Play therapy', 'CCPT', 'CBPT', 'Adolescents', 'MST', 'FBT', 'Developmental considerations']
        },
        {
            heading: 'Treatment of Older Adults (Geropsychology)',
            content: '<p><strong>Geropsychology</strong> addresses the unique mental health needs of older adults.</p>' +
                '<p><strong>Key considerations:</strong></p>' +
                '<ul>' +
                '<li><strong>Diagnostic complexity</strong>: Cognitive complaints require assessment of onset, course, function, mood, delirium, medications, sensory access, sleep, medical/metabolic causes, substance use, and neurocognitive disorders. Avoid using “pseudodementia” as if it were a diagnosis.</li>' +
                '<li><strong>Cohort and individual context</strong>: Ask about beliefs, prior experiences, identity, access, goals, and treatment preferences rather than presuming stigma or a preferred format from age</li>' +
                '<li><strong>Medical comorbidities</strong>: Higher rates of chronic illness, polypharmacy (multiple medications), and drug interactions</li>' +
                '<li><strong>Cognitive changes</strong>: Dementia is not normal aging. MCI describes greater-than-expected cognitive difficulty with largely preserved independence; it can progress, remain stable, or improve depending on cause and course.</li>' +
                '<li><strong>Life transitions, grief, and strengths</strong>: Assess losses without assuming decline or dependence; include resilience, roles, relationships, purpose, caregiving, work, sexuality, and community</li>' +
                '<li><strong>Sensory changes</strong>: Accommodate for hearing and vision loss in therapy</li>' +
                '</ul>' +
                '<p><strong>Evidence-based interventions:</strong></p>' +
                '<ul>' +
                '<li><strong>CBT</strong> is effective for geriatric depression and anxiety (may need modification: slower pace, repetition, written summaries)</li>' +
                '<li><strong>Reminiscence therapy/Life review</strong>: Using structured recall of past experiences to enhance meaning and resolve unfinished business</li>' +
                '<li><strong>Behavioral activation</strong>: Especially important when physical limitations reduce activity levels</li>' +
                '<li><strong>Caregiver interventions</strong>: Supporting family caregivers to reduce burnout and improve care quality</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> “Pseudodementia” is an imprecise historical label for cognitive symptoms that may accompany depression or other psychiatric conditions. Depression and a neurocognitive disorder can coexist, and cognitive symptoms may persist after mood improves. Memory concerns plus depressed mood require a broad differential and appropriate medical/cognitive evaluation—not an assumption of dementia or guaranteed reversibility.</p>',
            keyTerms: ['Geropsychology', 'Depression-related cognitive symptoms', 'Life review', 'Cohort effects', 'Polypharmacy', 'Delirium vs dementia', 'Caregiver'],
            knowledgeCheck: {
                question: 'An older adult reports new memory problems and depressed mood. Which response is most accurate?',
                options: ['Diagnose depression-related pseudodementia and promise cognition will normalize with mood treatment.', 'Assume dementia because cognitive decline is a normal part of aging.', 'Assess onset, function, mood, delirium, medications, sensory and medical factors, and possible neurocognitive disorder; depression and neurocognitive illness can coexist.', 'Use age alone to choose reminiscence therapy before assessment.'],
                answer: 2,
                rationale: 'Cognitive complaints in later life have multiple possible and co-occurring causes. Some contributing conditions may improve, but neither depression nor age rules a neurocognitive disorder in or out, and “pseudodementia” should not substitute for a broad evaluation.'
            }
        }
    ],
    aiCoda: {
        teaser: 'How can AI support change conversations across age and culture without pretending to know the person?',
        content: '<p>AI can help learners practice identifying stage language, distinguish change talk from sustain talk or discord, and generate alternative reflective responses. It does not possess readiness, ambivalence, culture, developmental status, or lived experience; applying human change models to a language model is metaphor, not assessment.</p>' +
            '<p>For real people, generated responses can become coercive, stereotyped, or developmentally inappropriate. A model may label disagreement as precontemplation, flatten racism into an individual coping issue, expose adolescent information through shared accounts, recommend play from age alone, or misclassify cognitive symptoms in an older adult. These are consequential errors, not stylistic imperfections.</p>' +
            '<p>Use AI as a transparent draft or study aid: state the target behavior and framework, preserve autonomy, ask rather than infer identity or preferences, verify clinical claims, protect confidential data, and keep diagnosis, consent, safety, and treatment decisions with qualified accountable humans and the person receiving care.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) TTM stages describe a behavior-specific snapshot, not a resistant personality. (2) MI: partnership, acceptance, compassion, evocation; OARS; distinguish sustain talk from relational discord. (3) Multicultural responsiveness requires iterative awareness, knowledge, skills, humility, and structural context. (4) Child treatment is developmentally adapted, not selected by age alone. (5) Adolescent confidentiality depends on law, setting, safety, and clear explanation. (6) MCI does not always progress; depression-related cognitive symptoms require a broad differential.'
},
    references: [
        'Axline, V. M. (1969). <em>Play therapy</em> (rev. ed.). Ballantine Books.',
        'Knight, B. G., & Pachana, N. A. (2015). <em>Psychological assessment and therapy with older adults</em>. Oxford University Press.',
        'Miller, W. R., & Rollnick, S. (2013). <em>Motivational interviewing: Helping people change</em> (3rd ed.). Guilford Press.',
        'Prochaska, J. O., & DiClemente, C. C. (1983). Stages and processes of self-change of smoking: Toward an integrative model of change. <em>Journal of Consulting and Clinical Psychology, 51</em>(3), 390\u2013395.',
        'Sue, D. W., & Sue, D. (2016). <em>Counseling the culturally diverse: Theory and practice</em> (7th ed.). Wiley.',
        'Sue, D. W., Capodilupo, C. M., Torino, G. C., Bucceri, J. M., Holder, A. M. B., Nadal, K. L., & Esquilin, M. (2007). Racial microaggressions in everyday life. <em>American Psychologist, 62</em>(4), 271\u2013286.',
        'Miller, W. R., & Rollnick, S. (2023). <em>Motivational interviewing: Helping people change and grow</em> (4th ed.). Guilford Press.',
        'American Academy of Pediatrics. (2024). Confidentiality in the care of adolescents: Policy statement. <em>Pediatrics, 153</em>(5), e2024066326. https://doi.org/10.1542/peds.2024-066326',
        'National Institute on Aging. (2023). <em>Assessing cognitive impairment in older patients</em>. https://www.nia.nih.gov/health/health-care-professionals-information/assessing-cognitive-impairment-older-patients',
        'National Institute on Aging. (2021). <em>What is mild cognitive impairment?</em>. https://www.nia.nih.gov/health/memory-loss-and-forgetfulness/what-mild-cognitive-impairment'
    ]
});
