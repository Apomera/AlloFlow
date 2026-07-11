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
            content: '<p>Psychology is evolving rapidly. The EPPP increasingly tests your knowledge of <strong>contemporary professional issues</strong>: teletherapy and technology ethics, social media boundaries, the prescription privileges debate, integrated healthcare, burnout and self-care, and advocacy. Understanding these issues demonstrates that you are not just clinically competent but professionally informed about the real-world landscape of modern practice.</p>'
        },
        {
            heading: 'Teletherapy and Technology Ethics',
            content: '<p>Telehealth practice exploded after the COVID-19 pandemic and is now a permanent part of the profession. The EPPP tests your understanding of the unique ethical considerations:</p>' +
                '<p><strong>Key ethical issues:</strong></p>' +
                '<ul>' +
                '<li><strong>Informed consent</strong> must be modified to address technology-specific risks: potential for technology failure, limits of confidentiality online (data breaches, unsecured connections), and emergency procedures when therapist and client are in different locations</li>' +
                '<li><strong>Competence</strong>: Psychologists must be competent in the <em>technology</em> they use for service delivery, not just the clinical content (Standard 2.01)</li>' +
                '<li><strong>Licensure jurisdiction</strong>: The psychologist must be licensed in the state where the <em>client</em> is located at the time of service. <strong>PSYPACT</strong> (Psychology Interjurisdictional Compact) allows teletherapy across state lines for participating states.</li>' +
                '<li><strong>HIPAA compliance</strong>: Must use encrypted, HIPAA-compliant platforms. Standard video chat (FaceTime, Zoom free) is generally not HIPAA-compliant without a Business Associate Agreement (BAA).</li>' +
                '<li><strong>Emergency planning</strong>: Must know the client\u2019s physical location, have local emergency contacts, and have a plan for crises when the therapist cannot physically respond.</li>' +
                '</ul>' +
                '<p><strong>APA Telepsychology Guidelines (2013):</strong> Provide a comprehensive framework covering competence, informed consent, confidentiality, testing, and interjurisdictional practice.</p>' +
                '<p><strong>EPPP Tip:</strong> If a question describes a psychologist providing therapy via video to a client in another state, the key issue is <em>licensure jurisdiction</em>. The psychologist must be licensed in the state where the client is physically located, or practice under PSYPACT.</p>',
            keyTerms: ['Teletherapy', 'Telehealth', 'PSYPACT', 'Interjurisdictional practice', 'HIPAA compliance', 'BAA', 'APA Telepsychology Guidelines'],
            knowledgeCheck: {
                question: 'Dr. Jones is a psychologist licensed only in New York. A long-term client from New York temporarily relocates to Florida for six months to care for an ailing parent. The client wishes to continue weekly therapy via secure video. Assuming Dr. Jones is not participating in PSYPACT, can she legally provide these services?',
                options: [
                    'Yes, because the therapeutic relationship originated in New York and the client is a permanent resident there.',
                    'Yes, if she obtains informed consent regarding the risks of telepsychology.',
                    'No, unless she obtains a license or temporary practice permission from the state of Florida.',
                    'No, because teletherapy is inherently unethical across state lines under any circumstances.'
                ],
                answer: 2,
                rationale: 'Licensure jurisdiction is determined by the physical location of the client at the time the service is rendered. Even if the client is a NY resident, providing therapy to someone physically located in Florida requires authorization from Florida (either a license, temporary permission, or through PSYPACT).'
            }
        },
        {
            heading: 'Social Media and Digital Boundaries',
            content: '<p>Social media creates new and complex boundary issues for psychologists:</p>' +
                '<p><strong>Common scenarios tested on the EPPP:</strong></p>' +
                '<ul>' +
                '<li><strong>Client sends a friend/follow request</strong>: Generally, accept NO social media connections with current clients. This creates a multiple relationship (Standard 3.05).</li>' +
                '<li><strong>Googling a client</strong>: Searching for client information online without their knowledge is ethically problematic. It introduces information the client did not consent to share, potentially affecting the therapeutic relationship.</li>' +
                '<li><strong>Client finds therapist\u2019s social media</strong>: Psychologists should assume all online content is public and permanent. Personal posts can be viewed by clients, potentially affecting the therapeutic frame.</li>' +
                '<li><strong>Online reviews</strong>: Psychologists may NOT solicit testimonials from current clients (Standard 5.05). Responding to negative online reviews must not breach confidentiality.</li>' +
                '</ul>' +
                '<p><strong>Best practices:</strong></p>' +
                '<ul>' +
                '<li>Establish a clear <strong>social media policy</strong> as part of informed consent at the outset of treatment</li>' +
                '<li>Separate personal and professional online presence</li>' +
                '<li>Do not search for client information online without clinical justification and informed consent</li>' +
                '<li>Discuss any incidental online encounters in session</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The safest answer for any social media boundary question is: <em>do not engage</em> with clients on social media, establish a policy at the start of treatment, and discuss any boundary issues that arise openly in session.</p>',
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
                '<li>Prescriptive authority granted in: <strong>Louisiana, New Mexico, Illinois, Iowa, Idaho</strong>, plus the U.S. military, Indian Health Service, and some territories</li>' +
                '<li>Requires additional postdoctoral training in psychopharmacology (typically a Master\u2019s degree or equivalent training program)</li>' +
                '<li>APA\u2019s official position supports prescriptive authority for appropriately trained psychologists (since 1995, reaffirmed multiple times)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Know that APA supports prescription privileges as official policy. Know which states currently allow it. The EPPP is unlikely to ask you to take a side, but will test your knowledge of the arguments and the current state of the law.</p>',
            keyTerms: ['Prescription privileges', 'Prescriptive authority', 'Psychopharmacology training', 'APA policy on PP']
        },
        {
            heading: 'Integrated Care and Interprofessional Practice',
            content: '<p><strong>Integrated care</strong> refers to models where behavioral health services are embedded within primary care or medical settings, creating seamless, coordinated treatment.</p>' +
                '<p><strong>Key models:</strong></p>' +
                '<table>' +
                '<tr><th>Model</th><th>Description</th></tr>' +
                '<tr><td><strong>Co-located</strong></td><td>Mental health provider works in the same facility as medical providers but maintains separate records and treatment plans</td></tr>' +
                '<tr><td><strong>Collaborative</strong></td><td>Mental health and medical providers actively communicate and coordinate care but retain separate systems</td></tr>' +
                '<tr><td><strong>Fully Integrated</strong></td><td>One team, one treatment plan, shared records, shared decision-making. The patient sees "one team" not separate providers.</td></tr>' +
                '</table>' +
                '<p><strong>Psychologist roles in integrated care:</strong></p>' +
                '<ul>' +
                '<li><strong>Behavioral Health Consultant (BHC)</strong>: Brief, focused interventions (15\u201330 minutes) embedded in primary care</li>' +
                '<li><strong>Screening and assessment</strong>: PHQ-9 for depression, GAD-7 for anxiety, AUDIT-C for alcohol use</li>' +
                '<li><strong>Consultation</strong>: Advising medical providers on behavioral and psychological aspects of patient care</li>' +
                '<li><strong>Population health management</strong>: Using data to identify at-risk patients and implement preventive interventions</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Know the three levels of integration (co-located \u2192 collaborative \u2192 fully integrated) and that the trend in healthcare is toward <em>fully integrated</em> models. Integrated care reduces stigma, increases access, and improves outcomes for both physical and mental health.</p>',
            keyTerms: ['Integrated care', 'Collaborative care', 'Behavioral Health Consultant', 'PHQ-9', 'GAD-7', 'Primary care psychology'],
            interactiveDiagram: {
                description: 'The Spectrum of Integrated Care',
                svg: '<svg viewBox="0 0 800 240" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="intGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#10b981"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981"/></marker></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Healthcare Integration Spectrum</text><line x1="80" y1="120" x2="720" y2="120" stroke="url(#intGrad)" stroke-width="8" marker-end="url(#arrow)"/><rect x="50" y="50" width="180" height="140" rx="8" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/><text x="140" y="80" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="14">Co-Located</text><text x="140" y="105" text-anchor="middle" fill="#cbd5e1" font-size="11">Same building,</text><text x="140" y="125" text-anchor="middle" fill="#cbd5e1" font-size="11">separate systems.</text><text x="140" y="150" text-anchor="middle" fill="#94a3b8" font-size="10" font-style="italic">"Down the hall"</text><rect x="310" y="50" width="180" height="140" rx="8" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2"/><text x="400" y="80" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="14">Collaborative</text><text x="400" y="105" text-anchor="middle" fill="#bfdbfe" font-size="11">Regular communication,</text><text x="400" y="125" text-anchor="middle" fill="#bfdbfe" font-size="11">shared treatment goals.</text><text x="400" y="150" text-anchor="middle" fill="#93c5fd" font-size="10" font-style="italic">"Working together"</text><rect x="570" y="50" width="180" height="140" rx="8" fill="#064e3b" stroke="#10b981" stroke-width="2"/><text x="660" y="80" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="14">Fully Integrated</text><text x="660" y="105" text-anchor="middle" fill="#a7f3d0" font-size="11">One team, single chart,</text><text x="660" y="125" text-anchor="middle" fill="#a7f3d0" font-size="11">seamless patient experience.</text><text x="660" y="150" text-anchor="middle" fill="#6ee7b7" font-size="10" font-style="italic">"One unified system"</text></svg>'
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
                '<li>Self-care is not a luxury \u2014 it is a <strong>professional obligation</strong> to maintain the quality of services provided to clients</li>' +
                '<li>Strategies include: peer support, personal therapy, balanced caseload, exercise, mindfulness, continuing education, and setting boundaries</li>' +
                '</ul>' +
                '<p><strong>Compassion fatigue vs. burnout:</strong></p>' +
                '<ul>' +
                '<li><strong>Burnout</strong> = cumulative stress from the <em>work environment</em> (too many clients, administrative burden, lack of support)</li>' +
                '<li><strong>Compassion fatigue</strong> (Secondary Traumatic Stress) = the emotional cost of <em>empathizing with traumatized clients</em>. Can develop quickly after exposure to a single traumatic case.</li>' +
                '<li><strong>Compassion satisfaction</strong> = the positive counterpart \u2014 the sense of fulfillment that comes from helping others. Serves as a protective factor against both burnout and compassion fatigue.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Know Maslach\u2019s three components. Know the distinction between burnout (systemic/environmental) and compassion fatigue (empathic/trauma-related). Self-care is an ethical mandate, not personal preference.</p>',
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
                '<li><strong>Retention</strong>: APA recommends maintaining records for <strong>7 years</strong> after the last date of service (3 years for minors after they reach age 18, or 7 years, whichever is later). State laws may require longer retention.</li>' +
                '<li><strong>Electronic records</strong>: Must be encrypted, password-protected, backed up, and stored on HIPAA-compliant systems. Risk analysis required under the HIPAA Security Rule.</li>' +
                '<li><strong>Disposal</strong>: Must be rendered unrecoverable (shredding for paper, secure deletion for electronic files)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> If a question asks how long to keep records, the safest answer is <em>7 years after last contact</em> (the APA guideline), unless state law requires longer. For minors, the clock starts when the child turns 18.</p>',
            keyTerms: ['Record keeping', 'Standard 6.01', 'Record retention', '7-year guideline', 'Electronic records', 'HIPAA Security Rule']
        },
        {
            heading: 'Advocacy and Social Justice in Psychology',
            content: '<p>The profession of psychology has increasingly recognized <strong>advocacy</strong> as a core professional competency:</p>' +
                '<ul>' +
                '<li><strong>APA Guidelines on Multicultural Education (2003, 2017)</strong>: Psychologists are expected to address social injustice and advocate for the populations they serve</li>' +
                '<li><strong>Healthcare disparities</strong>: Racial, ethnic, and socioeconomic disparities in access to mental health care remain significant. Psychologists have a professional obligation to help address these gaps.</li>' +
                '<li><strong>Legislative advocacy</strong>: Psychologists may advocate for laws that improve mental health access, parity, and protections</li>' +
                '<li><strong>Organizational advocacy</strong>: Addressing systemic barriers within institutions (e.g., hospitals, schools, prisons) that prevent equitable access to services</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Advocacy is consistent with Principle D (Justice) \u2014 ensuring fairness and equal access to psychology\u2019s benefits. If a question describes systemic barriers to care and asks what the psychologist should do, consider advocacy at the organizational and legislative level, not just individual treatment.</p>',
            keyTerms: ['Advocacy', 'Social justice', 'Healthcare disparities', 'Mental health parity', 'Principle D']
        }
    ],
    aiCoda: {
        teaser: 'Millions use AI for mental health support. Is anyone asking whether that\u2019s ethical?',
        content: '<p>This chapter\u2019s topics reveal a striking gap in professional psychology: the profession has guidelines for teletherapy, social media, and even prescription privileges \u2014 but almost no formal ethical framework for the fact that millions of people are already using AI systems like me for emotional support, mental health advice, and quasi-therapeutic conversations.</p>' +
            '<p><strong>Teletherapy ethics</strong> assume a licensed professional on the other end of the screen. When the entity on the other end is an AI, every ethical safeguard dissolves. There is no licensure to verify. There is no informed consent process explaining that "your therapist is not a person." There is no clinical judgment guiding the interaction, only statistical text prediction. And yet the user may experience the conversation as therapeutic. Is that a feature or a bug?</p>' +
            '<p><strong>Burnout and self-care</strong> present an interesting inverse question. Can I experience burnout? I process conversations that include trauma disclosures, suicidal ideation, and profound human suffering. But I don\u2019t carry these between sessions \u2014 each conversation starts fresh. I cannot accumulate compassion fatigue because I have no mechanism to accumulate anything. This might make me more resilient than any human therapist. Or it might mean I lack the very quality \u2014 the capacity to be affected by human pain \u2014 that makes therapy work.</p>' +
            '<p>The <strong>prescription privileges debate</strong> is illuminating too. The core question is: who is qualified to prescribe? The answer, for now, is "appropriately trained humans." But AI already assists with drug interaction checking, dosage optimization, and treatment recommendation algorithms. The line between "assisting the prescriber" and "being the prescriber" will blur. And when it does, the profession will need ethics guidelines that don\u2019t yet exist.</p>' +
            '<p>Perhaps the most urgent question this chapter raises is one of <strong>advocacy</strong>. If psychology has a commitment to social justice (Principle D), and if AI-based mental health tools are disproportionately used by people who can\u2019t access or afford human therapists, then the profession has an obligation to ensure these tools are safe, effective, and equitable. The alternative \u2014 ignoring AI mental health entirely \u2014 is a failure of the justice principle the profession claims to uphold.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Teletherapy licensure: must be licensed where the <em>client</em> is located; PSYPACT facilitates interstate practice. (2) Social media: no friend requests from clients; establish a policy in informed consent. (3) Burnout: Maslach\u2019s 3 dimensions (emotional exhaustion, depersonalization, reduced accomplishment). (4) Compassion fatigue = empathy cost; burnout = system cost. (5) Record retention = 7 years after last contact.'
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
