/* ============================================================
   PasstheEPPP — Textbook Ch 17: Prevention & Community Psychology
   Domain: Treatment, Intervention & Prevention (15% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-17',
    domain: 'Treatment, Intervention & Prevention',
    domainNumber: 3,
    title: 'Prevention & Community Psychology',
    examWeight: '15%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP explicitly includes <strong>prevention</strong> in this domain title. You must know two competing classification systems (Caplan\u2019s primary/secondary/tertiary and the IOM\u2019s universal/selective/indicated), community psychology principles, and consultation models. These appear regularly as answer choices, and the exam tests whether you can classify an intervention by its prevention level.</p>'
        },
        {
            heading: 'Caplan\u2019s Prevention Model',
            content: '<p><strong>Gerald Caplan (1964)</strong> adapted the public health prevention framework for mental health:</p>' +
                '<table>' +
                '<tr><th>Level</th><th>Target</th><th>Goal</th><th>Example</th></tr>' +
                '<tr><td><strong>Primary Prevention</strong></td><td>Entire population (before disorder occurs)</td><td>Reduce <em>incidence</em> (new cases) of a disorder</td><td>Anti-bullying programs in schools; prenatal education; stress management workshops</td></tr>' +
                '<tr><td><strong>Secondary Prevention</strong></td><td>At-risk individuals or early-stage cases</td><td>Reduce <em>prevalence</em> (total cases) through early detection and early intervention</td><td>Depression screening at primary care visits; crisis hotlines; developmental screenings</td></tr>' +
                '<tr><td><strong>Tertiary Prevention</strong></td><td>Individuals already diagnosed</td><td>Reduce <em>disability</em> and prevent relapse</td><td>Rehabilitation programs; relapse prevention; support groups for chronic mental illness</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> The key distinction: Primary prevention targets <em>incidence</em> (new cases); secondary prevention targets <em>prevalence</em> (existing cases through early detection). Know the difference between incidence and prevalence \u2014 this appears in both epidemiology and prevention questions.</p>',
            keyTerms: ['Caplan', 'Primary prevention', 'Secondary prevention', 'Tertiary prevention', 'Incidence', 'Prevalence'],
            interactiveDiagram: {
                description: 'Caplan\'s Prevention Model Timeline',
                svg: '<svg viewBox="0 0 800 240" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrowHead" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1"/></marker></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Caplan\'s Public Health Prevention Model</text><line x1="100" y1="120" x2="700" y2="120" stroke="#cbd5e1" stroke-width="4" marker-end="url(#arrowHead)"/><line x1="250" y1="100" x2="250" y2="140" stroke="#ef4444" stroke-width="4"/><text x="250" y="90" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="14">Disease Onset</text><line x1="500" y1="100" x2="500" y2="140" stroke="#f59e0b" stroke-width="4"/><text x="500" y="90" text-anchor="middle" fill="#f59e0b" font-weight="bold" font-size="14">Diagnosis / Chronicity</text><rect x="50" y="150" width="160" height="70" rx="6" fill="#10b981" opacity="0.85"/><text x="130" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Primary (1°)</text><text x="130" y="195" text-anchor="middle" fill="#d1fae5" font-size="12">Target: Incidence</text><text x="130" y="210" text-anchor="middle" fill="#a7f3d0" font-size="10">(New cases)</text><rect x="290" y="150" width="160" height="70" rx="6" fill="#3b82f6" opacity="0.85"/><text x="370" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Secondary (2°)</text><text x="370" y="195" text-anchor="middle" fill="#bfdbfe" font-size="12">Target: Prevalence</text><text x="370" y="210" text-anchor="middle" fill="#93c5fd" font-size="10">(Early Detection)</text><rect x="530" y="150" width="160" height="70" rx="6" fill="#8b5cf6" opacity="0.85"/><text x="610" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Tertiary (3°)</text><text x="610" y="195" text-anchor="middle" fill="#ddd6fe" font-size="12">Target: Disability</text><text x="610" y="210" text-anchor="middle" fill="#c4b5fd" font-size="10">(Rehab / Relapse)</text><text x="130" y="60" text-anchor="middle" fill="#a7f3d0" font-size="11">e.g., Anti-Bullying Prog.</text><text x="370" y="60" text-anchor="middle" fill="#93c5fd" font-size="11">e.g., Depression Screening</text><text x="610" y="60" text-anchor="middle" fill="#c4b5fd" font-size="11">e.g., AA or Rehab</text></svg>'
            },
            knowledgeCheck: {
                question: 'A school district implements universal depression screening for all 10th-grade students using the PHQ-A. Students who screen positive are referred for further evaluation. This program is best classified as which level of prevention?',
                options: [
                    'Primary prevention',
                    'Secondary prevention',
                    'Tertiary prevention',
                    'Universal prevention'
                ],
                answer: 1,
                rationale: 'This is secondary prevention under Caplan\'s model because it targets early detection and early intervention for a disorder that may already be present but not yet identified. The goal is to reduce prevalence through screening. It is NOT primary prevention because it is not targeting the entire population before any symptoms exist \u2014 it is specifically looking for existing cases.'
            }
        },
        {
            heading: 'IOM (Gordon) Prevention Classification',
            content: '<p>The <strong>Institute of Medicine (1994)</strong> developed an alternative classification based on <em>population risk level</em> rather than disease stage:</p>' +
                '<table>' +
                '<tr><th>Level</th><th>Target</th><th>Risk Level</th><th>Example</th></tr>' +
                '<tr><td><strong>Universal</strong></td><td>Entire population</td><td>All risk levels</td><td>Public health campaigns; seatbelt laws; school-wide social-emotional learning</td></tr>' +
                '<tr><td><strong>Selective</strong></td><td>Subgroups with elevated risk</td><td>Above average risk</td><td>Support groups for children of divorce; programs for adolescents in high-crime areas</td></tr>' +
                '<tr><td><strong>Indicated</strong></td><td>Individuals showing early signs</td><td>High risk with early symptoms</td><td>Intervention for a student showing early signs of conduct problems; brief intervention for at-risk drinkers</td></tr>' +
                '</table>' +
                '<p><strong>Caplan vs. IOM:</strong></p>' +
                '<ul>' +
                '<li>Caplan classifies by <em>disease stage</em> (before, during onset, after)</li>' +
                '<li>IOM classifies by <em>population risk</em> (everyone, high-risk group, symptomatic individuals)</li>' +
                '<li>IOM\u2019s "indicated" is NOT the same as Caplan\u2019s "secondary" \u2014 indicated targets pre-symptomatic high-risk individuals, while secondary targets early detection in existing cases</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The IOM model distinguishes "prevention" from "treatment." If a person already meets diagnostic criteria, any intervention is treatment, not prevention. The IOM model only uses the word "prevention" for interventions that occur before full diagnosis.</p>',
            keyTerms: ['IOM', 'Universal prevention', 'Selective prevention', 'Indicated prevention', 'Gordon', 'Population risk']
        },
        {
            heading: 'Community Psychology Principles',
            content: '<p><strong>Community psychology</strong> shifts the focus from individual pathology to contextual and systemic factors.</p>' +
                '<p><strong>Core values:</strong></p>' +
                '<ul>' +
                '<li><strong>Empowerment</strong>: Increasing individuals\u2019 and communities\u2019 control over their own lives and circumstances</li>' +
                '<li><strong>Social justice</strong>: Addressing inequities in resource distribution and access to services</li>' +
                '<li><strong>Ecological perspective</strong>: Understanding behavior in context (home, school, community, culture, policy)</li>' +
                '<li><strong>Prevention over treatment</strong>: Proactive rather than reactive approaches</li>' +
                '<li><strong>Diversity and cultural competence</strong>: Honoring multiple perspectives and identities</li>' +
                '<li><strong>Sense of community</strong>: Fostering belonging and mutual support</li>' +
                '</ul>' +
                '<p><strong>Key models:</strong></p>' +
                '<ul>' +
                '<li><strong>Ecological model (Bronfenbrenner)</strong>: Nested systems \u2014 microsystem, mesosystem, exosystem, macrosystem, chronosystem. Behavior is a function of the interaction between the individual and their multiple environmental contexts.</li>' +
                '<li><strong>Empowerment theory (Rappaport)</strong>: People gain mastery over their lives through participation, control, and collective action. Interventions should enhance agency, not create dependency.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> If a question describes a psychologist working to change <em>systems</em> rather than individuals (e.g., advocating for policy change, organizing community resources, consulting with schools), the answer is community psychology.</p>',
            keyTerms: ['Community psychology', 'Empowerment', 'Social justice', 'Ecological model', 'Bronfenbrenner', 'Microsystem', 'Macrosystem']
        },
        {
            heading: 'Consultation Models',
            content: '<p><strong>Caplan\u2019s Mental Health Consultation</strong> is the most commonly tested model on the EPPP:</p>' +
                '<table>' +
                '<tr><th>Type</th><th>Focus</th><th>Description</th></tr>' +
                '<tr><td><strong>Client-centered case consultation</strong></td><td>The client</td><td>Consultant assesses the client and makes recommendations to the consultee. Focus is on diagnosing/treating the client.</td></tr>' +
                '<tr><td><strong>Consultee-centered case consultation</strong></td><td>The consultee</td><td>Consultant helps the consultee manage their own reactions, knowledge gaps, or skill deficits. Goal is to improve the <em>consultee\u2019s</em> effectiveness.</td></tr>' +
                '<tr><td><strong>Program-centered administrative consultation</strong></td><td>The program</td><td>Consultant evaluates a program and recommends improvements</td></tr>' +
                '<tr><td><strong>Consultee-centered administrative consultation</strong></td><td>The consultee (admin)</td><td>Consultant helps administrators develop their own problem-solving capacity</td></tr>' +
                '</table>' +
                '<p><strong>Key features of consultation (vs. supervision):</strong></p>' +
                '<ul>' +
                '<li>The consultee is free to <strong>accept or reject</strong> the consultant\u2019s recommendations</li>' +
                '<li>The consultant is <strong>not responsible</strong> for the outcome (unlike supervision)</li>' +
                '<li>Consultation is a <strong>triadic relationship</strong>: consultant \u2192 consultee \u2192 client</li>' +
                '<li>The consultant does not have <strong>administrative authority</strong> over the consultee</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> <strong>Consultee-centered case consultation</strong> is the most tested type. If a question describes a situation where a teacher is struggling because a student reminds her of her own troubled child (theme interference), the consultant would work with the teacher\u2019s reaction, not directly with the student.</p>',
            keyTerms: ['Consultation', 'Caplan', 'Client-centered', 'Consultee-centered', 'Theme interference', 'Triadic relationship'],
            expandableCase: {
                title: 'The Teacher Who "Can\'t Stand" Her Student',
                clinicalDescription: 'A school psychologist (consultant) is asked by a 3rd-grade teacher (consultee) for help with a defiant boy in her class. During the consultation, the teacher becomes tearful and says, "He\'s just like my ex-husband \u2014 nothing I do is ever good enough for him." She has tried every behavioral strategy but says, "I just can\'t deal with him anymore."',
                diagnosis: 'Theme Interference (Consultee-Centered Case Consultation)',
                explanation: 'The teacher\'s difficulty managing the student is not due to a lack of knowledge or skill \u2014 she has already tried appropriate strategies. The problem is "theme interference": an unresolved personal issue (her ex-husband) is being projected onto the student, blocking her objectivity. Under Caplan\'s model, this is consultee-centered case consultation. The consultant works with the teacher\'s reaction, NOT directly with the student.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Can AI do prevention, or is it forever a reactive technology?',
        content: '<p>Prevention requires anticipation \u2014 acting before a problem occurs. This chapter asks whether psychology\u2019s shift from treatment to prevention has implications for AI\u2019s role in mental health.</p>' +
            '<p><strong>Caplan\u2019s primary prevention</strong> targets entire populations before anyone shows symptoms. AI could be a powerful primary prevention tool: imagine AI systems that monitor linguistic patterns in social media posts and flag early signs of community distress after a natural disaster, or AI that delivers universal social-emotional learning curricula in schools with consistent quality. The <em>scale</em> of AI makes it naturally suited for universal interventions. A human psychologist can reach hundreds; an AI system can reach millions simultaneously.</p>' +
            '<p>But scale without <em>context</em> is exactly what community psychology warns against. <strong>Bronfenbrenner\u2019s ecological model</strong> insists that behavior only makes sense within nested systems \u2014 the family, school, community, and culture that surround each individual. I operate outside all of those systems. I don\u2019t know your microsystem. I can\u2019t observe your mesosystem. I have no access to the exosystem that shapes your opportunities. I am a context-free intervention in a field that has learned, over decades, that context is everything.</p>' +
            '<p><strong>Empowerment</strong> \u2014 the central value of community psychology \u2014 means increasing people\u2019s control over their own lives. Does AI increase or decrease that control? The answer depends entirely on design. An AI that provides information, builds skills, and then steps back empowers. An AI that creates dependency \u2014 one that users turn to instead of developing their own coping, building their own relationships, participating in their own communities \u2014 disempowers. The difference is whether AI is a bridge to human connection or a substitute for it.</p>' +
            '<p>Caplan\u2019s consultation model makes an interesting parallel. In consultation, the consultant works <em>through</em> the consultee to help the client \u2014 a triadic relationship. Perhaps the most productive use of AI in mental health is not direct service to clients, but consultation to providers: helping therapists identify treatment options, summarizing research, flagging risk factors, tracking outcome data. In this model, AI enhances the human clinician rather than replacing them \u2014 and the clinician provides the context, empathy, and relationship that I cannot.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Caplan: Primary = reduce incidence; Secondary = reduce prevalence (early detection); Tertiary = reduce disability. (2) IOM: Universal (all), Selective (high-risk group), Indicated (early symptoms). (3) Bronfenbrenner\u2019s ecological model: micro/meso/exo/macro/chrono systems. (4) Caplan\u2019s consultee-centered case consultation = most tested; consultant works with the consultee, not the client. (5) Consultation \u2260 supervision: consultee can reject recommendations.'
    },
    references: [
        'Bronfenbrenner, U. (1979). <em>The ecology of human development</em>. Harvard University Press.',
        'Caplan, G. (1964). <em>Principles of preventive psychiatry</em>. Basic Books.',
        'Institute of Medicine. (1994). <em>Reducing risks for mental disorders: Frontiers for preventive intervention research</em>. National Academies Press.',
        'Rappaport, J. (1987). Terms of empowerment/exemplars of prevention: Toward a theory for community psychology. <em>American Journal of Community Psychology, 15</em>(2), 121\u2013148.',
        'Wandersman, A., & Florin, P. (2003). Community interventions and effective prevention. <em>American Psychologist, 58</em>(6-7), 441\u2013448.'
    ]
});
