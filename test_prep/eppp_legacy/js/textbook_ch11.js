/* ============================================================
   PasstheEPPP — Textbook Ch 11: Professional Issues & Contemporary Challenges
   Domain: Ethical, Legal & Professional Issues (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-11',
    domain: 'Ethical, Legal & Professional Issues',
    domainNumber: 2,
    title: 'Professional Issues & Contemporary Challenges',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Psychology is evolving rapidly. Relevant professional-practice questions may address <strong>contemporary professional issues</strong>: teletherapy and technology ethics, social media boundaries, the prescription privileges debate, integrated healthcare, burnout and self-care, and advocacy. Understanding these issues demonstrates that you are not just clinically competent but professionally informed about the real-world landscape of modern practice.</p>'
        },
        {
            heading: 'Teletherapy and Technology Ethics',
            content: '<p>Telepsychology requires the same core ethical analysis as in-person work plus technology, location, privacy, accessibility, emergency, and interjurisdictional considerations:</p>' +
                '<p><strong>Key ethical issues:</strong></p>' +
                '<ul>' +
                '<li><strong>Informed consent</strong> must be modified to address technology-specific risks: potential for technology failure, limits of confidentiality online (data breaches, unsecured connections), and emergency procedures when therapist and client are in different locations</li>' +
                '<li><strong>Competence</strong>: Psychologists must be competent in the <em>technology</em> they use for service delivery, not just the clinical content (Standard 2.01)</li>' +
                '<li><strong>Licensure jurisdiction</strong>: Psychologists must have legal authority for practice connected to each relevant jurisdiction, commonly including the client’s location at the time of service and sometimes the psychologist’s location. PSYPACT authorizes qualifying psychologists—not every licensee—to practice under compact credentials and rules in participating jurisdictions.</li>' +
                '<li><strong>HIPAA compliance</strong>: When HIPAA applies, the regulated entity must conduct risk analysis, implement reasonable administrative, physical, and technical safeguards, and obtain a BAA when a vendor is acting as a business associate. A product is not “HIPAA compliant” in isolation, and some conduit relationships do not require a BAA.</li>' +
                '<li><strong>Emergency planning</strong>: At the outset and as needed, establish how locations will be confirmed, what emergency resources and support persons are available, how technology failures will be handled, and what limits apply to response across distance.</li>' +
                '</ul>' +
                '<p><strong>APA Telepsychology Guidelines (2013):</strong> Provide a comprehensive framework covering competence, informed consent, confidentiality, testing, and interjurisdictional practice.</p>' +
                '<p><strong>EPPP Tip:</strong> If a question describes a psychologist providing therapy via video to a client in another state, the key issue is <em>licensure jurisdiction</em>. Identify the client’s actual location and verify current authority-to-practice rules in every relevant jurisdiction; PSYPACT is one possible route only for eligible psychologists and participating jurisdictions.</p>',
            keyTerms: ['Teletherapy', 'Telehealth', 'PSYPACT', 'Interjurisdictional practice', 'HIPAA compliance', 'BAA', 'APA Telepsychology Guidelines'],
            knowledgeCheck: {
                question: 'A psychologist’s established client temporarily relocates to another jurisdiction and requests continued video therapy. The psychologist has not verified that jurisdiction’s rules and holds no compact authority. What is the best next step?',
                options: [
                    'Continue because the original treatment relationship controls jurisdiction.',
                    'Continue because technology-specific informed consent replaces licensure requirements.',
                    'Pause interjurisdictional sessions while promptly verifying and, if needed, obtaining lawful authority in all relevant jurisdictions or arranging an appropriate continuity-of-care alternative.',
                    'Terminate immediately because cross-border telepsychology is always prohibited.'
                ],
                answer: 2,
                rationale: 'A client’s current location is commonly central, but legal authority depends on current rules in all relevant jurisdictions. The original relationship and informed consent do not substitute for authorization. Appropriate options may include a license, temporary permission, compact authority, another exception, or a continuity-of-care referral, depending on law.'
            }
        },
        {
            heading: 'Social Media and Digital Boundaries',
            content: '<p>Social media creates new and complex boundary issues for psychologists:</p>' +
                '<p><strong>Common scenarios tested on the EPPP:</strong></p>' +
                '<ul>' +
                '<li><strong>Client sends a friend/follow request</strong>: Avoid blanket rules while recognizing substantial privacy, boundary, exploitation, and role risks. Establish and apply a reasoned policy, consider the client and context, and do not imply that every connection automatically violates Standard 3.05.</li>' +
                '<li><strong>Googling a client</strong>: Before searching, identify a legitimate professional purpose, necessity, reliability, consent and expectation issues, foreseeable effects, documentation needs, and safer alternatives. Emergency, forensic, assessment, and treatment contexts may differ.</li>' +
                '<li><strong>Client finds therapist\u2019s social media</strong>: Psychologists should assume all online content is public and permanent. Personal posts can be viewed by clients, potentially affecting the therapeutic frame.</li>' +
                '<li><strong>Online reviews</strong>: Psychologists may NOT solicit testimonials from current clients (Standard 5.05). Responding to negative online reviews must not breach confidentiality.</li>' +
                '</ul>' +
                '<p><strong>Best practices:</strong></p>' +
                '<ul>' +
                '<li>Establish a clear <strong>social media policy</strong> as part of informed consent at the outset of treatment</li>' +
                '<li>Separate personal and professional online presence</li>' +
                '<li>Do not search reflexively; establish a defensible professional purpose and address consent or advance notice when appropriate to the role and context</li>' +
                '<li>Discuss any incidental online encounters in session</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Evaluate confidentiality, role, power, exploitation, clinical effect, documentation, and the stated policy. Declining a connection is often prudent, but “never engage” is not a substitute for applying the facts and Standards.</p>',
            keyTerms: ['Social media policy', 'Digital boundaries', 'Online reviews', 'Googling clients', 'Standard 5.05']
        },
        {
            heading: 'Prescription Privileges',
            content: '<p>The <strong>prescription privileges (PP) debate</strong> is one of the most significant ongoing professional issues in psychology and is tested on the EPPP.</p>' +
                '<p><strong>The debate:</strong></p>' +
                '<table>' +
                '<tr><th>Position</th><th>Arguments</th></tr>' +
                '<tr><td><strong>Supporters</strong> (APA policy supports PP)</td><td>Increases access to care (especially in underserved/rural areas); psychologists already prescribe in military and some states; training programs are rigorous; reduces psychiatrist bottleneck; improved integrated care</td></tr>' +
                '<tr><td><strong>Opponents</strong></td><td>Insufficient medical/pharmacological training; patient safety concerns; scope creep; opposition from psychiatry and medicine; potential liability; training programs vary in quality</td></tr>' +
                '</table>' +
                '<p><strong>Current status:</strong></p>' +
                '<ul>' +
                '<li>Prescriptive-authority jurisdictions and covered practice settings change over time; verify the current psychology board, statute, regulations, formulary, collaboration requirements, and credential</li>' +
                '<li>Requirements are jurisdiction-specific and may include advanced psychopharmacology education, supervised clinical experience, examinations, collaboration, and continuing education</li>' +
                '<li>APA\u2019s official position supports prescriptive authority for appropriately trained psychologists (since 1995, reaffirmed multiple times)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Know that APA supports prescription privileges as official policy. Do not memorize a static state list. Distinguish APA policy from legal authority and apply any jurisdictional facts provided in the question.</p>',
            keyTerms: ['Prescription privileges', 'Prescriptive authority', 'Psychopharmacology training', 'APA policy on PP']
        },
        {
            heading: 'Integrated Care and Interprofessional Practice',
            content: '<p><strong>Integrated care</strong> refers to models where behavioral health services are embedded within primary care or medical settings, creating seamless, coordinated treatment.</p>' +
                '<p><strong>Key models:</strong></p>' +
                '<table>' +
                '<tr><th>Model</th><th>Description</th></tr>' +
                '<tr><td><strong>Co-located</strong></td><td>Services share a site, but communication, workflows, records, and treatment planning can range from separate to partly coordinated</td></tr>' +
                '<tr><td><strong>Collaborative</strong></td><td>Providers coordinate roles and care processes; record and organizational arrangements vary by model and setting</td></tr>' +
                '<tr><td><strong>Highly integrated</strong></td><td>Teams use shared workflows, accountability, and care planning; privacy permissions, access controls, records, and professional roles still require explicit governance.</td></tr>' +
                '</table>' +
                '<p><strong>Psychologist roles in integrated care:</strong></p>' +
                '<ul>' +
                '<li><strong>Behavioral Health Consultant (BHC)</strong>: Brief, focused interventions (15\u201330 minutes) embedded in primary care</li>' +
                '<li><strong>Screening and assessment</strong>: PHQ-9 for depression, GAD-7 for anxiety, AUDIT-C for alcohol use</li>' +
                '<li><strong>Consultation</strong>: Advising medical providers on behavioral and psychological aspects of patient care</li>' +
                '<li><strong>Population health management</strong>: Using data to identify at-risk patients and implement preventive interventions</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Treat these three labels as a simplified continuum, not a universal taxonomy. Outcomes depend on population, implementation, financing, workflows, measurement, and team communication.</p>',
            keyTerms: ['Integrated care', 'Collaborative care', 'Behavioral Health Consultant', 'PHQ-9', 'GAD-7', 'Primary care psychology'],
            interactiveDiagram: {
                description: 'The Spectrum of Integrated Care',
                svg: '<svg viewBox="0 0 800 240" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="integrationTitle integrationDesc"><title id="integrationTitle">Illustrative healthcare integration continuum</title><desc id="integrationDesc">An illustrative continuum moves from co-location, through active collaboration, to highly integrated team workflows. Real programs may combine features and do not necessarily progress linearly.</desc><defs><linearGradient id="intGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#10b981"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981"/></marker></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Healthcare Integration Spectrum</text><line x1="80" y1="120" x2="720" y2="120" stroke="url(#intGrad)" stroke-width="8" marker-end="url(#arrow)"/><rect x="50" y="50" width="180" height="140" rx="8" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/><text x="140" y="80" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="14">Co-Located</text><text x="140" y="105" text-anchor="middle" fill="#cbd5e1" font-size="11">Same building,</text><text x="140" y="125" text-anchor="middle" fill="#cbd5e1" font-size="11">separate systems.</text><text x="140" y="150" text-anchor="middle" fill="#94a3b8" font-size="10" font-style="italic">"Down the hall"</text><rect x="310" y="50" width="180" height="140" rx="8" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2"/><text x="400" y="80" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="14">Collaborative</text><text x="400" y="105" text-anchor="middle" fill="#bfdbfe" font-size="11">Regular communication,</text><text x="400" y="125" text-anchor="middle" fill="#bfdbfe" font-size="11">shared treatment goals.</text><text x="400" y="150" text-anchor="middle" fill="#93c5fd" font-size="10" font-style="italic">"Working together"</text><rect x="570" y="50" width="180" height="140" rx="8" fill="#064e3b" stroke="#10b981" stroke-width="2"/><text x="660" y="80" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="14">Highly Integrated</text><text x="660" y="105" text-anchor="middle" fill="#a7f3d0" font-size="11">Shared workflows and</text><text x="660" y="125" text-anchor="middle" fill="#a7f3d0" font-size="11">team accountability.</text><text x="660" y="150" text-anchor="middle" fill="#6ee7b7" font-size="10" font-style="italic">"Coordinated system"</text></svg>'
            }
        },
        {
            heading: 'Burnout, Self-Care, and the Impaired Professional',
            content: '<p><strong>Burnout</strong> is a syndrome resulting from chronic workplace stress that has not been successfully managed. The WHO\u2019s ICD-11 classifies burnout as an <strong>occupational phenomenon</strong>, not a medical condition.</p>' +
                '<p><strong>Maslach\u2019s three dimensions of burnout:</strong></p>' +
                '<table>' +
                '<tr><th>Dimension</th><th>Description</th></tr>' +
                '<tr><td><strong>Emotional Exhaustion</strong></td><td>Feeling drained, depleted, unable to give more of oneself emotionally</td></tr>' +
                '<tr><td><strong>Depersonalization</strong> (Cynicism)</td><td>Detached, callous attitude toward clients; treating people as objects</td></tr>' +
                '<tr><td><strong>Reduced Personal Accomplishment</strong></td><td>Feelings of incompetence, lack of achievement, decreased professional efficacy</td></tr>' +
                '</table>' +
                '<p><strong>Self-care as an ethical imperative:</strong></p>' +
                '<ul>' +
                '<li>APA Standard 2.06 requires psychologists to take action when personal problems may interfere with competence</li>' +
                '<li>The Ethics Code does not prescribe a universal self-care regimen; Standard 2.06 requires appropriate action when personal problems may interfere with adequate professional performance</li>' +
                '<li>Strategies include: peer support, personal therapy, balanced caseload, exercise, mindfulness, continuing education, and setting boundaries</li>' +
                '</ul>' +
                '<p><strong>Compassion fatigue vs. burnout:</strong></p>' +
                '<ul>' +
                '<li><strong>Burnout</strong> = cumulative stress from the <em>work environment</em> (too many clients, administrative burden, lack of support)</li>' +
                '<li><strong>Secondary traumatic stress</strong> refers to trauma-like symptoms related to indirect exposure to others’ trauma. “Compassion fatigue” is used inconsistently and may refer to secondary traumatic stress, burnout, or their combination; define the construct before comparing it.</li>' +
                '<li><strong>Compassion satisfaction</strong> = the positive counterpart \u2014 the sense of fulfillment that comes from helping others. Serves as a protective factor against both burnout and compassion fatigue.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Know Maslach\u2019s three components. Know the distinction between burnout (systemic/environmental) and compassion fatigue (empathic/trauma-related). The ethical trigger is potential interference with competent performance; effective responses may include individual, supervisory, workload, and organizational changes.</p>',
            keyTerms: ['Burnout', 'Maslach', 'Emotional exhaustion', 'Depersonalization', 'Compassion fatigue', 'Secondary traumatic stress', 'Self-care'],
            expandableCase: {
                title: 'The Cynical Clinician',
                clinicalDescription: 'After five years working in a high-volume community mental health clinic with strict billing quotas, a dedicated therapist finds herself increasingly irritated by her clients. She begins making sarcastic comments about them to colleagues, calling them "frequent flyers," and feels little empathy when they describe their struggles.',
                diagnosis: 'Burnout (Depersonalization)',
                explanation: 'This therapist is exhibiting "depersonalization" or cynicism, one of the three core dimensions of burnout identified by Maslach. It is characterized by a detached, callous, or dehumanized response to clients, often developing as a defensive coping mechanism in response to chronic, unmanaged workplace stress (the high volume and billing quotas).'
            }
        },
        {
            heading: 'Record Keeping in the Digital Age',
            content: '<p>Proper record keeping is both an ethical obligation and a legal protection:</p>' +
                '<ul>' +
                '<li><strong>Standard 6.01</strong>: Create and maintain records related to professional work</li>' +
                '<li><strong>Records facilitate</strong>: continuity of care, supervision, billing, legal defense, and research</li>' +
                '<li><strong>Retention</strong>: Retention periods depend on jurisdiction, setting, payer and contract rules, record type, age, limitation periods, pending proceedings, and institutional policy. Older APA guidance is not a universal current retention law.</li>' +
                '<li><strong>Electronic records</strong>: Use safeguards proportionate to risk and applicable law. When HIPAA applies, regulated entities conduct risk analysis and implement reasonable and appropriate administrative, physical, and technical safeguards; no storage product is compliant by itself.</li>' +
                '<li><strong>Disposal</strong>: Dispose consistently with law, policy, litigation holds, contracts, and the sensitivity and recoverability of the medium; use methods reasonably designed to prevent unauthorized reconstruction</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Do not default to seven years. Use the jurisdiction, setting, client age, record type, limitation period, payer/contract, and pending-proceeding facts supplied in the item.</p>',
            keyTerms: ['Record keeping', 'Standard 6.01', 'Record retention', 'Electronic records', 'HIPAA Security Rule'],
            knowledgeCheck: {
                question: 'A psychologist is closing a practice and asks whether every record can be destroyed exactly seven years after the final session. What is the best answer?',
                options: ['Yes. Seven years is a universal APA rule that overrides state law.', 'Yes, except records for minors must always be kept forever.', 'No. Determine retention and destruction requirements from current jurisdictional law, record type, client age, limitation periods, contracts and payers, institutional policy, and any litigation hold or pending proceeding.', 'No. Ethical records may never be destroyed.'],
                answer: 2,
                rationale: 'There is no universal seven-year rule for every psychology record. A defensible schedule integrates applicable legal and institutional requirements and suspends destruction when a hold or proceeding requires preservation.'
            }
        },
        {
            heading: 'Advocacy and Social Justice in Psychology',
            content: '<p>The profession of psychology has increasingly recognized <strong>advocacy</strong> as a core professional competency:</p>' +
                '<ul>' +
                '<li><strong>APA Guidelines on Multicultural Education (2003, 2017)</strong>: The guidelines encourage psychologists to understand ecological and systemic context and consider roles that promote responsiveness and equity</li>' +
                '<li><strong>Healthcare disparities</strong>: Racial, ethnic, and socioeconomic disparities in access to mental health care remain significant. Psychologists may address these gaps through competent clinical, organizational, research, educational, and policy roles while respecting scope and stakeholder needs.</li>' +
                '<li><strong>Legislative advocacy</strong>: Psychologists may advocate for laws that improve mental health access, parity, and protections</li>' +
                '<li><strong>Organizational advocacy</strong>: Addressing systemic barriers within institutions (e.g., hospitals, schools, prisons) that prevent equitable access to services</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Advocacy is consistent with Principle D (Justice) \u2014 ensuring fairness and equal access to psychology\u2019s benefits. When systemic barriers are relevant, consider individual and systems-level options, collaboration, competence, client preferences, role boundaries, and likely consequences rather than assuming one advocacy action is always required.</p>',
            keyTerms: ['Advocacy', 'Social justice', 'Healthcare disparities', 'Mental health parity', 'Principle D']
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: selecting and governing AI-enabled mental-health tools',
        content: '<p><strong>Reflective extension grounded in current APA guidance:</strong> Psychology now has formal ethical guidance for AI in health-service practice. Psychologists should evaluate whether an AI tool is appropriate for the intended purpose, communicate its role and material risks, protect privacy, assess bias and accessibility, critically review output, and preserve meaningful human oversight.</p>' +
            '<p>Governance questions include who receives data, whether a vendor is a HIPAA business associate, how information is retained or reused, what happens after model updates, how errors are corrected, and when the tool must be discontinued. Marketing language such as “HIPAA compliant” or “clinically validated” does not replace a relationship-specific risk and evidence review.</p>' +
            '<p>AI tools may widen access while also creating unequal error, surveillance, dependency, and privacy risks. Justice therefore requires measuring who benefits, who is excluded, and who bears mistakes—not assuming that automation is inherently equitable or inherently harmful.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Verify authority to practice in all relevant telepsychology jurisdictions; PSYPACT requires eligibility and compact authority. (2) Social-media choices require contextual boundary and confidentiality analysis. (3) Do not memorize a fixed prescribing-state list. (4) Standard 2.06 requires action when personal problems may impair work; it does not prescribe one self-care routine. (5) Record retention is jurisdiction- and context-specific, not universally seven years.'
    },
    references: [
        'American Psychological Association. (2013). <em>Guidelines for the practice of telepsychology</em>. APA.',
        'American Psychological Association. (2017). <em>Multicultural guidelines: An ecological approach to context, identity, and intersectionality</em>. APA.',
        'Figley, C. R. (2002). Compassion fatigue: Psychotherapists\u2019 chronic lack of self care. <em>Journal of Clinical Psychology, 58</em>(11), 1433\u20131441.',
        'Kolmes, K. (2012). Social media in the future of professional psychology. <em>Professional Psychology: Research and Practice, 43</em>(6), 606\u2013612.',
        'Maslach, C., & Leiter, M. P. (2016). Understanding the burnout experience: Recent research and its implications for psychiatry. <em>World Psychiatry, 15</em>(2), 103\u2013111.',
        'McGrath, R. E., & Moore, B. A. (Eds.). (2010). <em>Pharmacotherapy for psychologists: Prescribing and collaborative roles</em>. American Psychological Association.',
        'Sammons, M. T., Paige, R. U., & Levant, R. F. (Eds.). (2003). <em>Prescriptive authority for psychologists: A history and guide</em>. APA.',
        'World Health Organization. (2019). Burn-out an \"occupational phenomenon\": International Classification of Diseases. WHO.'
    ]
});
