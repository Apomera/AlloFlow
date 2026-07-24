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
            content: '<p>The EPPP explicitly includes <strong>prevention</strong> in this domain title. Know two distinct classification systems—Caplan’s primary/secondary/tertiary framework and the IOM/Gordon universal/selective/indicated framework—plus community psychology and consultation models. The systems answer different questions, so the same program can receive different labels depending on the framework named.</p>'
        },
        {
            heading: 'Caplan\u2019s Prevention Model',
            content: '<p><strong>Gerald Caplan (1964)</strong> adapted the public health prevention framework for mental health:</p>' +
                '<table>' +
                '<tr><th>Level</th><th>Target</th><th>Goal</th><th>Example</th></tr>' +
                '<tr><td><strong>Primary Prevention</strong></td><td>Entire population (before disorder occurs)</td><td>Reduce <em>incidence</em> (new cases) of a disorder</td><td>Anti-bullying programs in schools; prenatal education; stress management workshops</td></tr>' +
                '<tr><td><strong>Secondary Prevention</strong></td><td>At-risk individuals or early-stage cases</td><td>Detect and intervene early; historically described as shortening duration and thereby potentially reducing prevalence</td><td>Depression screening at primary care visits; crisis hotlines; developmental screenings</td></tr>' +
                '<tr><td><strong>Tertiary Prevention</strong></td><td>Individuals already diagnosed</td><td>Reduce <em>disability</em> and prevent relapse</td><td>Rehabilitation programs; relapse prevention; support groups for chronic mental illness</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> In Caplan’s historical framework, primary prevention aims to reduce incidence; secondary emphasizes early detection and prompt intervention; tertiary aims to reduce disability or recurrence. Do not assume every screening program actually reduces prevalence—benefit depends on test performance, follow-up, effective services, access, and unintended harms.</p>',
            keyTerms: ['Caplan', 'Primary prevention', 'Secondary prevention', 'Tertiary prevention', 'Incidence', 'Prevalence'],
            interactiveDiagram: {
                description: 'Caplan’s historical prevention continuum',
                svg: '<svg viewBox="0 0 800 240" width="100%" role="img" aria-labelledby="ch17CaplanTitle ch17CaplanDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch17CaplanTitle">Caplan’s historical prevention continuum</title><desc id="ch17CaplanDesc">Primary prevention precedes disorder onset and targets incidence; secondary prevention emphasizes early detection and intervention; tertiary prevention follows established disorder and targets disability or recurrence. This is a historical framework, not a guarantee of program effect.</desc><defs><marker id="ch17ArrowHead" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1"/></marker></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Caplan\'s Public Health Prevention Model</text><line x1="100" y1="120" x2="700" y2="120" stroke="#cbd5e1" stroke-width="4" marker-end="url(#ch17ArrowHead)"/><line x1="250" y1="100" x2="250" y2="140" stroke="#ef4444" stroke-width="4"/><text x="250" y="90" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="14">Disease Onset</text><line x1="500" y1="100" x2="500" y2="140" stroke="#f59e0b" stroke-width="4"/><text x="500" y="90" text-anchor="middle" fill="#f59e0b" font-weight="bold" font-size="14">Diagnosis / Chronicity</text><rect x="50" y="150" width="160" height="70" rx="6" fill="#10b981" opacity="0.85"/><text x="130" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Primary (1°)</text><text x="130" y="195" text-anchor="middle" fill="#d1fae5" font-size="12">Target: Incidence</text><text x="130" y="210" text-anchor="middle" fill="#a7f3d0" font-size="10">(New cases)</text><rect x="290" y="150" width="160" height="70" rx="6" fill="#3b82f6" opacity="0.85"/><text x="370" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Secondary (2°)</text><text x="370" y="195" text-anchor="middle" fill="#bfdbfe" font-size="12">Target: Prevalence</text><text x="370" y="210" text-anchor="middle" fill="#93c5fd" font-size="10">(Early Detection)</text><rect x="530" y="150" width="160" height="70" rx="6" fill="#8b5cf6" opacity="0.85"/><text x="610" y="175" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Tertiary (3°)</text><text x="610" y="195" text-anchor="middle" fill="#ddd6fe" font-size="12">Target: Disability</text><text x="610" y="210" text-anchor="middle" fill="#c4b5fd" font-size="10">(Rehab / Relapse)</text><text x="130" y="60" text-anchor="middle" fill="#a7f3d0" font-size="11">e.g., Anti-Bullying Prog.</text><text x="370" y="60" text-anchor="middle" fill="#93c5fd" font-size="11">e.g., Depression Screening</text><text x="610" y="60" text-anchor="middle" fill="#c4b5fd" font-size="11">e.g., AA or Rehab</text></svg>'
            },
            knowledgeCheck: {
                question: 'Under Caplan’s historical framework, a school district screens every 10th-grade student for depression and refers positive screens for further evaluation. Which classification best fits the screening purpose?',
                options: [
                    'Primary prevention',
                    'Secondary prevention',
                    'Tertiary prevention',
                    'Universal prevention'
                ],
                answer: 1,
                rationale: 'Under Caplan’s framework, screening for otherwise unrecognized cases is secondary prevention because its purpose is early detection and prompt intervention. Under the IOM/Gordon framework, the same all-student delivery can be called universal because the audience was not selected by elevated risk. Always identify the framework before choosing the label; a positive screen is not a diagnosis.'
            }
        },
        {
            heading: 'IOM (Gordon) Prevention Classification',
            content: '<p>The <strong>Institute of Medicine (1994)</strong>, building on Gordon’s framework, classified prevention by the population offered an intervention and its risk/sign profile rather than by Caplan’s stage labels:</p>' +
                '<table>' +
                '<tr><th>Level</th><th>Target</th><th>Risk Level</th><th>Example</th></tr>' +
                '<tr><td><strong>Universal</strong></td><td>Entire population</td><td>All risk levels</td><td>Public health campaigns; seatbelt laws; school-wide social-emotional learning</td></tr>' +
                '<tr><td><strong>Selective</strong></td><td>Subgroups with elevated risk</td><td>Above average risk</td><td>Support groups for children of divorce; programs for adolescents in high-crime areas</td></tr>' +
                '<tr><td><strong>Indicated</strong></td><td>Individuals with minimal but detectable signs or symptoms who do not yet meet diagnostic criteria</td><td>Elevated individual risk or early signs below diagnostic threshold</td><td>Intervention for a student showing early signs of conduct problems; brief intervention for at-risk drinkers</td></tr>' +
                '</table>' +
                '<p><strong>Caplan vs. IOM:</strong></p>' +
                '<ul>' +
                '<li>Caplan classifies by <em>disease stage</em> (before, during onset, after)</li>' +
                '<li>IOM classifies by <em>population risk</em> (everyone, high-risk group, symptomatic individuals)</li>' +
                '<li>IOM indicated prevention is not simply another name for Caplan secondary prevention: indicated targets people with minimal detectable signs below diagnostic threshold, while Caplan secondary is a broader historical early-detection/early-intervention category</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> In the IOM continuum, universal, selective, and indicated are prevention categories; treatment applies once a disorder is present, followed by maintenance/recovery supports. “Indicated” can include early signs—it does not mean symptom-free—and boundaries may depend on the condition and framework.</p>',
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
                '<li><strong>Promotion and prevention</strong>: Strengthening protective conditions and reducing risk while recognizing that accessible treatment, recovery supports, and structural change also matter</li>' +
                '<li><strong>Diversity and cultural competence</strong>: Honoring multiple perspectives and identities</li>' +
                '<li><strong>Sense of community</strong>: Fostering belonging and mutual support</li>' +
                '</ul>' +
                '<p><strong>Key models:</strong></p>' +
                '<ul>' +
                '<li><strong>Ecological model (Bronfenbrenner)</strong>: Nested systems \u2014 microsystem, mesosystem, exosystem, macrosystem, chronosystem. Behavior is a function of the interaction between the individual and their multiple environmental contexts.</li>' +
                '<li><strong>Empowerment theory (Rappaport)</strong>: Empowerment is multilevel and relational: participation, access to resources, critical awareness, and collective influence can expand control. Communities should help define priorities, methods, success, data governance, and interpretation.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Systems change, ecological analysis, prevention, empowerment, participatory collaboration, and social justice cue community psychology. Avoid portraying the psychologist as acting on a community without shared decision-making or evaluation of intended and unintended effects.</p>',
            keyTerms: ['Community psychology', 'Empowerment', 'Social justice', 'Ecological model', 'Bronfenbrenner', 'Microsystem', 'Macrosystem']
        },
        {
            heading: 'Consultation Models',
            content: '<p><strong>Caplan\u2019s Mental Health Consultation</strong> is the most commonly tested model on the EPPP:</p>' +
                '<table>' +
                '<tr><th>Type</th><th>Focus</th><th>Description</th></tr>' +
                '<tr><td><strong>Client-centered case consultation</strong></td><td>The client</td><td>Consultant helps the consultee understand a client-related problem and consider recommendations; the consultant may not directly assess or diagnose the client, depending on role, consent, information, and setting</td></tr>' +
                '<tr><td><strong>Consultee-centered case consultation</strong></td><td>The consultee</td><td>Consultant helps the consultee manage their own reactions, knowledge gaps, or skill deficits. Goal is to improve the <em>consultee\u2019s</em> effectiveness.</td></tr>' +
                '<tr><td><strong>Program-centered administrative consultation</strong></td><td>The program</td><td>Consultant evaluates a program and recommends improvements</td></tr>' +
                '<tr><td><strong>Consultee-centered administrative consultation</strong></td><td>The consultee (admin)</td><td>Consultant helps administrators develop their own problem-solving capacity</td></tr>' +
                '</table>' +
                '<p><strong>Key features of consultation (vs. supervision):</strong></p>' +
                '<ul>' +
                '<li>The consultee is free to <strong>accept or reject</strong> the consultant\u2019s recommendations</li>' +
                '<li>The consultant ordinarily lacks supervisory authority and the consultee retains decision-making responsibility, but the consultant remains accountable for competence, role clarity, recommendations, confidentiality, documentation, and foreseeable harms within the consultation role</li>' +
                '<li>Case consultation is often conceptualized as triadic—consultant, consultee, and client/system—even when the consultant has no direct client contact</li>' +
                '<li>The consultant does not have <strong>administrative authority</strong> over the consultee</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> <strong>Consultee-centered case consultation</strong> is the most tested type. If the consultee’s reactions or a knowledge/skill gap are the focus, that cues consultee-centered case consultation. “Theme interference” is a hypothesis to explore collaboratively, not a diagnosis inferred from one emotional statement.</p>',
            keyTerms: ['Consultation', 'Caplan', 'Client-centered', 'Consultee-centered', 'Theme interference', 'Triadic relationship'],
            expandableCase: {
                title: 'The Teacher Who "Can\'t Stand" Her Student',
                clinicalDescription: 'A school psychologist (consultant) is asked by a 3rd-grade teacher (consultee) for help with a defiant boy in her class. During the consultation, the teacher becomes tearful and says, "He\'s just like my ex-husband \u2014 nothing I do is ever good enough for him." She has tried every behavioral strategy but says, "I just can\'t deal with him anymore."',
                diagnosis: 'Possible theme interference—consultee-centered case consultation formulation',
                explanation: 'The teacher’s comparison suggests that her reactions may be affecting the consultation, making consultee-centered case consultation a plausible model. It does not prove projection, rule out ineffective strategies, or explain the student’s behavior. Clarify the consultation role, protect student confidentiality, assess context and safety, review data and prior strategies, and help the teacher reflect and choose feasible next steps; direct student services would require a separate role and appropriate consent.'
            },
            knowledgeCheck: {
                question: 'A consultant has no supervisory authority, and the consultee may reject a recommendation. Which statement is most accurate?',
                options: ['The consultant therefore has no ethical responsibility for the recommendation.', 'The consultant becomes the client’s treating clinician automatically.', 'The consultee retains implementation decisions, while the consultant remains accountable for competence, role clarity, confidentiality, and the quality and foreseeable implications of the consultation.', 'The consultant may receive any identifiable client information without consent because consultation is indirect.'],
                answer: 2,
                rationale: 'Consultation differs from supervision in authority and implementation responsibility, but it is not an accountability-free role. Competence, role boundaries, confidentiality, necessary disclosure, documentation, and foreseeable effects remain relevant.'
            }
        }
    ],
    aiCoda: {
        teaser: 'How can AI support prevention without turning communities into surveillance targets?',
        content: '<p>AI can help summarize evidence, translate materials, analyze de-identified program data, or support scenario planning. Scale does not itself make an intervention preventive, effective, equitable, or acceptable.</p>' +
            '<p>Population screening and prediction require more than a model score: a defined purpose, evidence of validity for the population and setting, informed governance, privacy protections, accessible confirmatory assessment, effective follow-up, monitoring for false positives and false negatives, and evaluation of disparate or unintended effects. Mining personal language to infer distress without meaningful community participation or consent can increase stigma, surveillance, and mistrust.</p>' +
            '<p>A community-psychology approach begins with shared power. Affected communities help define the problem, decide whether AI is appropriate, govern data, specify success and harms, interpret findings, and retain ways to challenge or stop the program. In consultation, AI output remains a tool—not a consultant with professional accountability—and identifiable information should not be entered without authorization and appropriate safeguards.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Caplan: primary targets incidence; secondary = early detection/intervention; tertiary = disability/recurrence. (2) IOM/Gordon: universal = general audience, selective = elevated-risk subgroup, indicated = minimal signs below diagnosis. (3) The same screening can be Caplan-secondary and IOM-universal. (4) Community psychology emphasizes ecology, empowerment, justice, participation, and evaluation. (5) Consultation differs from supervision in authority, not in ethical accountability.'
},
    references: [
        'Bronfenbrenner, U. (1979). <em>The ecology of human development</em>. Harvard University Press.',
        'Caplan, G. (1964). <em>Principles of preventive psychiatry</em>. Basic Books.',
        'Institute of Medicine. (1994). <em>Reducing risks for mental disorders: Frontiers for preventive intervention research</em>. National Academies Press.',
        'Rappaport, J. (1987). Terms of empowerment/exemplars of prevention: Toward a theory for community psychology. <em>American Journal of Community Psychology, 15</em>(2), 121\u2013148.',
        'Wandersman, A., & Florin, P. (2003). Community interventions and effective prevention. <em>American Psychologist, 58</em>(6-7), 441\u2013448.',
        'National Research Council & Institute of Medicine. (2009). <em>Preventing mental, emotional, and behavioral disorders among young people</em>. National Academies Press. https://doi.org/10.17226/12480',
        'Substance Abuse and Mental Health Services Administration. (2019). <em>Selecting best-fit programs and practices</em>. https://store.samhsa.gov/sites/default/files/selecting-best-fit-programs-pep19-02.pdf',
        'Centers for Disease Control and Prevention. (2024). <em>CDC Program Evaluation Framework</em>. https://www.cdc.gov/evaluation/php/evaluation-framework/index.html',
        'American Psychological Association. (2017). <em>Ethical principles of psychologists and code of conduct</em> (Standard 4.06, Consultations). https://www.apa.org/ethics/code'
    ]
});
