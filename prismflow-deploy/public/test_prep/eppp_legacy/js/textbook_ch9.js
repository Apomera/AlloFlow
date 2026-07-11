/* ============================================================
   PasstheEPPP — Textbook Ch 9: Legal & Regulatory Issues
   Domain: Ethical, Legal & Professional Issues (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-9',
    domain: 'Ethical, Legal & Professional Issues',
    domainNumber: 2,
    title: 'Legal & Regulatory Issues in Psychology',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Psychologists operate within a complex web of <strong>federal and state laws</strong> that define their scope of practice, mandate certain actions (like reporting abuse), and create legal liability when standards are not met. The EPPP tests your knowledge of licensure requirements, key federal statutes (HIPAA, FERPA, IDEA, ADA), malpractice law, and the duties psychologists owe to clients and third parties. These are among the most frequently missed items on the exam because they require legal reasoning, not just clinical knowledge.</p>'
        },
        {
            heading: 'Licensure and Scope of Practice',
            content: '<p><strong>Licensure</strong> is the legal authorization to practice psychology independently. It is governed at the <strong>state level</strong>, not the federal level.</p>' +
                '<p><strong>Key facts:</strong></p>' +
                '<ul>' +
                '<li>The <strong>ASPPB</strong> (Association of State and Provincial Psychology Boards) administers the EPPP and facilitates licensure mobility</li>' +
                '<li>Most states require a <strong>doctoral degree</strong> for independent practice as a psychologist</li>' +
                '<li>Supervised postdoctoral hours are required in most jurisdictions (typically 1,500\u20132,000 hours)</li>' +
                '<li><strong>Scope of practice</strong> defines what a psychologist is legally authorized to do (assessment, therapy, consultation, supervision)</li>' +
                '<li>Psychologists may NOT prescribe medication in most states (exceptions: Louisiana, New Mexico, Illinois, Iowa, Idaho, and the military/Indian Health Service)</li>' +
                '</ul>' +
                '<p><strong>Title vs. Practice Acts:</strong></p>' +
                '<table>' +
                '<tr><th>Type</th><th>What It Restricts</th><th>Example</th></tr>' +
                '<tr><td><strong>Title Act</strong></td><td>Who can <em>call themselves</em> a psychologist</td><td>Only licensed individuals may use the title "psychologist"</td></tr>' +
                '<tr><td><strong>Practice Act</strong></td><td>Who can <em>perform</em> psychological services</td><td>Only licensed individuals may conduct psychological assessment and treatment</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> A <em>practice act</em> is more restrictive than a <em>title act</em>. Most states have practice acts. Know that licensure is state-specific and does not automatically transfer to other states (though ASPPB facilitates <strong>interjurisdictional practice</strong> through agreements like PSYPACT).</p>',
            keyTerms: ['Licensure', 'ASPPB', 'Scope of practice', 'Title act', 'Practice act', 'PSYPACT', 'Prescriptive authority']
        },
        {
            heading: 'Malpractice: The Four Ds',
            content: '<p><strong>Malpractice</strong> (professional negligence) requires the plaintiff to prove all four of the following elements, commonly called the <strong>"Four Ds"</strong>:</p>' +
                '<table>' +
                '<tr><th>Element</th><th>Definition</th><th>Example</th></tr>' +
                '<tr><td><strong>Duty</strong></td><td>A professional relationship existed, creating a duty of care</td><td>The psychologist had a client in therapy</td></tr>' +
                '<tr><td><strong>Dereliction (Breach)</strong></td><td>The psychologist\u2019s conduct fell below the <em>standard of care</em></td><td>The psychologist failed to assess for suicidality despite clear risk factors</td></tr>' +
                '<tr><td><strong>Damage</strong></td><td>The client suffered actual harm</td><td>The client attempted suicide and was hospitalized</td></tr>' +
                '<tr><td><strong>Direct Causation</strong></td><td>The breach <em>directly caused</em> the damage</td><td>The failure to assess led directly to the suicide attempt</td></tr>' +
                '</table>' +
                '<p><strong>Most common causes of malpractice claims against psychologists:</strong></p>' +
                '<ol>' +
                '<li>Sexual dual relationships with clients (#1 cause of sanctions)</li>' +
                '<li>Breach of confidentiality</li>' +
                '<li>Failure to obtain informed consent</li>' +
                '<li>Negligent diagnosis or treatment</li>' +
                '<li>Failure to warn/protect (Tarasoff violations)</li>' +
                '</ol>' +
                '<p><strong>Standard of care</strong> = what a <em>reasonably prudent psychologist</em> with similar training and experience would do in the same situation. It is NOT perfection \u2014 it is reasonable professional behavior.</p>' +
                '<p><strong>EPPP Tip:</strong> All four Ds must be present for a successful malpractice claim. If the psychologist made an error (breach) but no harm resulted, there is no malpractice. If harm occurred but not because of the psychologist\u2019s actions, there is no malpractice.</p>',
            keyTerms: ['Malpractice', 'Four Ds', 'Duty', 'Dereliction', 'Damage', 'Causation', 'Standard of care'],
            interactiveDiagram: {
                description: 'The Four Ds of Malpractice — All Must Be Present',
                svg: '<svg viewBox="0 0 800 200" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><marker id="malArr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs><text x="400" y="22" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="14">Malpractice: ALL Four Ds Required</text><rect x="30" y="45" width="160" height="100" rx="12" fill="#3b82f6" opacity="0.85"/><text x="110" y="78" text-anchor="middle" fill="#fff" font-weight="bold" font-size="20">DUTY</text><text x="110" y="100" text-anchor="middle" fill="#dbeafe" font-size="10">Professional</text><text x="110" y="114" text-anchor="middle" fill="#dbeafe" font-size="10">relationship exists</text><line x1="190" y1="95" x2="220" y2="95" stroke="#94a3b8" stroke-width="2" marker-end="url(#malArr)"/><text x="205" y="85" fill="#f59e0b" font-size="14">+</text><rect x="220" y="45" width="160" height="100" rx="12" fill="#ef4444" opacity="0.85"/><text x="300" y="78" text-anchor="middle" fill="#fff" font-weight="bold" font-size="18">DERELICTION</text><text x="300" y="100" text-anchor="middle" fill="#fecaca" font-size="10">Fell below</text><text x="300" y="114" text-anchor="middle" fill="#fecaca" font-size="10">standard of care</text><line x1="380" y1="95" x2="410" y2="95" stroke="#94a3b8" stroke-width="2" marker-end="url(#malArr)"/><text x="395" y="85" fill="#f59e0b" font-size="14">+</text><rect x="410" y="45" width="160" height="100" rx="12" fill="#f59e0b" opacity="0.85"/><text x="490" y="78" text-anchor="middle" fill="#fff" font-weight="bold" font-size="20">DAMAGE</text><text x="490" y="100" text-anchor="middle" fill="#fef3c7" font-size="10">Client suffered</text><text x="490" y="114" text-anchor="middle" fill="#fef3c7" font-size="10">actual harm</text><line x1="570" y1="95" x2="600" y2="95" stroke="#94a3b8" stroke-width="2" marker-end="url(#malArr)"/><text x="585" y="85" fill="#f59e0b" font-size="14">+</text><rect x="600" y="45" width="170" height="100" rx="12" fill="#10b981" opacity="0.85"/><text x="685" y="70" text-anchor="middle" fill="#fff" font-weight="bold" font-size="18">DIRECT</text><text x="685" y="90" text-anchor="middle" fill="#fff" font-weight="bold" font-size="18">CAUSATION</text><text x="685" y="114" text-anchor="middle" fill="#d1fae5" font-size="10">Breach caused harm</text><rect x="200" y="160" width="400" height="30" rx="8" fill="#374151" stroke="#22d3ee" stroke-width="2"/><text x="400" y="180" text-anchor="middle" fill="#22d3ee" font-weight="bold" font-size="12">⚠️ Missing ANY one = No malpractice</text></svg>'
            },
            knowledgeCheck: {
                question: 'A psychologist accidentally leaves a client\'s intake paperwork in the waiting room. Another patient sees the folder, but does not open it before the receptionist retrieves it. The client discovers this and sues the psychologist for malpractice. Will the lawsuit be successful?',
                options: [
                    'Yes, because the psychologist breached the standard of care regarding confidentiality.',
                    'Yes, because HIPAA violations are automatically treated as malpractice.',
                    'No, because the client cannot demonstrate that any actual damage or harm occurred.',
                    'No, because the psychologist did not intend to breach confidentiality.'
                ],
                answer: 2,
                rationale: 'For a malpractice suit to succeed, all Four Ds must be proven: Duty, Dereliction, Damage, and Direct Causation. Although the psychologist was derelict in their duty (breach of standard of care), the client suffered no actual harm or damage. Therefore, it is an ethical violation, but not malpractice.'
            }
        },
        {
            heading: 'HIPAA: Health Insurance Portability and Accountability Act',
            content: '<p><strong>HIPAA</strong> (1996) is a federal law that protects the privacy and security of individuals\u2019 <strong>Protected Health Information (PHI)</strong>.</p>' +
                '<p><strong>Key provisions for psychologists:</strong></p>' +
                '<ul>' +
                '<li><strong>Privacy Rule</strong>: Limits who can access PHI and under what circumstances</li>' +
                '<li><strong>Security Rule</strong>: Requires safeguards (administrative, physical, and technical) for electronic PHI (ePHI)</li>' +
                '<li><strong>Minimum Necessary Standard</strong>: Only the <em>minimum necessary</em> information should be disclosed for any given purpose</li>' +
                '<li><strong>Psychotherapy Notes</strong>: HIPAA provides <em>enhanced protection</em> for psychotherapy notes (process notes kept separately from the medical record). These require <strong>separate authorization</strong> for release \u2014 they are NOT routinely disclosed even with a general release</li>' +
                '</ul>' +
                '<p><strong>Psychotherapy notes vs. medical records:</strong></p>' +
                '<table>' +
                '<tr><th>Category</th><th>Example</th><th>HIPAA Protection</th></tr>' +
                '<tr><td><strong>Medical Record</strong></td><td>Diagnosis, treatment plan, dates of service, medications, test results</td><td>Standard protection; released with general authorization</td></tr>' +
                '<tr><td><strong>Psychotherapy Notes</strong></td><td>Clinician\u2019s private impressions, process notes, analysis of conversation</td><td>Enhanced protection; requires <em>separate, specific</em> authorization</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> HIPAA\u2019s psychotherapy notes provision is heavily tested. Know that these notes are <em>kept separately</em> from the medical record and require their own authorization for release. A general release form does NOT cover psychotherapy notes.</p>',
            keyTerms: ['HIPAA', 'PHI', 'Privacy Rule', 'Security Rule', 'Psychotherapy notes', 'Minimum necessary']
        },
        {
            heading: 'FERPA, IDEA, and ADA',
            content: '<p>Three federal laws are critical for psychologists working in educational, school, and disability-related settings:</p>' +
                '<table>' +
                '<tr><th>Law</th><th>Year</th><th>What It Protects/Requires</th><th>Key EPPP Facts</th></tr>' +
                '<tr><td><strong>FERPA</strong></td><td>1974</td><td>Privacy of student <em>educational records</em></td><td>Parents (or students 18+) have the right to inspect records and consent to disclosure. HIPAA does NOT apply to educational records covered by FERPA.</td></tr>' +
                '<tr><td><strong>IDEA</strong></td><td>1975/2004</td><td>Free Appropriate Public Education (<strong>FAPE</strong>) for children with disabilities ages 3\u201321</td><td>Requires an IEP (Individualized Education Program), LRE (Least Restrictive Environment), multidisciplinary evaluation, and due process protections. FBA is required for behavioral suspensions >10 days.</td></tr>' +
                '<tr><td><strong>ADA</strong></td><td>1990</td><td>Prohibits discrimination against individuals with disabilities in employment, public services, and accommodations</td><td>Requires <strong>reasonable accommodations</strong> unless they cause undue hardship. Covers mental health conditions (depression, anxiety, PTSD, bipolar) if they substantially limit major life activities.</td></tr>' +
                '</table>' +
                '<p><strong>Section 504 of the Rehabilitation Act (1973):</strong> Prohibits disability discrimination in any program receiving federal funding. Unlike IDEA, Section 504 does not require an IEP but does require a <strong>504 Plan</strong> providing accommodations.</p>' +
                '<p><strong>EPPP Tip:</strong> IDEA vs. Section 504 is a common EPPP comparison. IDEA provides <em>specialized instruction</em> (IEP); Section 504 provides <em>accommodations</em> (504 Plan). IDEA covers specific disability categories; 504 covers any disability that limits a major life activity. IDEA is funded; 504 is unfunded.</p>',
            keyTerms: ['FERPA', 'IDEA', 'FAPE', 'IEP', 'LRE', 'ADA', 'Section 504', 'Reasonable accommodations'],
            expandableCase: {
                title: 'The Dual-Diagnosis Student',
                clinicalDescription: 'A bright 14-year-old student is diagnosed with Generalized Anxiety Disorder but is earning straight A\'s in all her advanced classes. Because of her anxiety, she frequently needs to leave the room to take deep breaths and occasionally misses assignments due to panic attacks.',
                diagnosis: 'Section 504 Plan (Not IDEA)',
                explanation: 'Because the student is performing exceptionally well academically, she does not require "specialized instruction" and therefore does not qualify for an IEP under IDEA. However, her psychiatric condition substantially limits a major life activity (learning/concentration during attacks). Therefore, she qualifies for a 504 Plan under the Rehabilitation Act to provide accommodations (like leaving the room) without altering the instructional curriculum.'
            }
        },
        {
            heading: 'Duty to Warn and Protect: Tarasoff and Beyond',
            content: '<p>The <em>Tarasoff</em> case established the legal principle that therapists have a duty to protect identifiable third parties from serious harm threatened by their clients.</p>' +
                '<p><strong>The case:</strong> Prosenjit Poddar told his therapist at UC Berkeley that he intended to kill Tatiana Tarasoff. The therapist notified campus police but did not warn Tarasoff or her family. Poddar killed Tarasoff. The California Supreme Court ruled that the therapist had a <strong>duty to protect</strong>.</p>' +
                '<p><strong>Two Tarasoff rulings:</strong></p>' +
                '<ul>' +
                '<li><strong>Tarasoff I (1974)</strong>: Established <strong>duty to warn</strong> \u2014 therapist must warn the intended victim</li>' +
                '<li><strong>Tarasoff II (1976)</strong>: Broadened to <strong>duty to protect</strong> \u2014 therapist must take reasonable steps to protect the victim (warning is one option; others include hospitalization, notifying police, modifying treatment)</li>' +
                '</ul>' +
                '<p><strong>State variation:</strong></p>' +
                '<ul>' +
                '<li>Some states follow <strong>duty to warn</strong> (must directly warn the intended victim)</li>' +
                '<li>Some states follow <strong>duty to protect</strong> (broader range of protective actions)</li>' +
                '<li>Some states have <strong>permissive</strong> statutes (therapist <em>may</em> warn but is not required to)</li>' +
                '<li>Some states have <strong>no Tarasoff-type statute</strong> at all</li>' +
                '</ul>' +
                '<p><strong>Required conditions for Tarasoff to apply:</strong></p>' +
                '<ol>' +
                '<li>A <strong>serious threat of harm</strong> (not vague expressions of anger)</li>' +
                '<li>An <strong>identifiable victim</strong> (in most jurisdictions)</li>' +
                '<li>A <strong>therapeutic relationship</strong> exists (duty arises from the professional role)</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> The EPPP tests the distinction between Tarasoff I (warn) and Tarasoff II (protect). Know that Tarasoff II is the broader standard and that most questions use "duty to protect" as the correct answer.</p>',
            keyTerms: ['Tarasoff', 'Duty to warn', 'Duty to protect', 'Identifiable victim', 'Tarasoff I vs. II']
        },
        {
            heading: 'Privilege, Subpoenas, and Court Orders',
            content: '<p><strong>Psychotherapist-patient privilege</strong> protects confidential communications from being compelled in court proceedings. Critical distinctions:</p>' +
                '<table>' +
                '<tr><th>Concept</th><th>Definition</th><th>Key Facts</th></tr>' +
                '<tr><td><strong>Confidentiality</strong></td><td>Ethical and professional obligation</td><td>Governed by APA Ethics Code and HIPAA; applies in all contexts</td></tr>' +
                '<tr><td><strong>Privilege</strong></td><td>Legal right protecting communications in court</td><td>Belongs to the <em>client</em>, not the therapist; can be waived by the client</td></tr>' +
                '</table>' +
                '<p><strong>Jaffee v. Redmond (1996)</strong>: The U.S. Supreme Court established a federal psychotherapist-patient privilege, holding that confidential communications between a licensed psychotherapist and a patient are protected from compelled disclosure in federal proceedings.</p>' +
                '<p><strong>Subpoena vs. Court Order:</strong></p>' +
                '<ul>' +
                '<li><strong>Subpoena</strong>: A legal document <em>requesting</em> records or testimony. Issued by an attorney. Does <strong>NOT</strong> by itself require disclosure.</li>' +
                '<li><strong>Court order</strong>: A legal document <em>signed by a judge</em> compelling disclosure. <strong>Must be obeyed.</strong></li>' +
                '</ul>' +
                '<p><strong>What to do when you receive a subpoena:</strong></p>' +
                '<ol>' +
                '<li>Do NOT automatically release records</li>' +
                '<li>Contact the client and discuss \u2014 client may consent or waive privilege</li>' +
                '<li>Seek legal consultation</li>' +
                '<li>Assert privilege on behalf of the client</li>' +
                '<li>If necessary, file a motion to quash the subpoena</li>' +
                '<li>Only comply if there is a valid court order or client consent</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> This is one of the most commonly tested legal questions: a subpoena alone is NOT enough to release records. The psychologist should assert privilege, contact the client, and seek legal counsel. Only a court order compels disclosure.</p>',
            keyTerms: ['Privilege', 'Confidentiality', 'Jaffee v. Redmond', 'Subpoena', 'Court order', 'Motion to quash']
        },
        {
            heading: 'Mandatory Reporting',
            content: '<p><strong>All 50 states</strong> have mandatory reporting laws for child abuse and neglect. Psychologists are classified as <strong>mandated reporters</strong> in every state.</p>' +
                '<p><strong>Key principles:</strong></p>' +
                '<ul>' +
                '<li>Reports are based on <strong>reasonable suspicion</strong> \u2014 you do not need proof</li>' +
                '<li>Failure to report is a <strong>criminal offense</strong> (misdemeanor in most states)</li>' +
                '<li>Good-faith reports are protected by <strong>immunity from liability</strong></li>' +
                '<li>You do NOT need client consent to make a report</li>' +
                '<li>Reporting obligations <strong>override confidentiality</strong></li>' +
                '</ul>' +
                '<p><strong>Who is covered:</strong></p>' +
                '<ul>' +
                '<li><strong>Child abuse/neglect</strong>: Mandatory in all states</li>' +
                '<li><strong>Elder abuse</strong>: Mandatory in most states</li>' +
                '<li><strong>Dependent adult abuse</strong>: Mandatory in many states</li>' +
                '<li><strong>Domestic violence</strong>: Varies by state; generally NOT mandatory for adult victims (except in some states like California)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> On the EPPP, when a client discloses child abuse, the correct answer is <em>always</em> to report it, regardless of therapeutic alliance concerns. You should inform the client that you are required to file a report, but you file even if the client objects. Reasonable suspicion \u2014 not certainty \u2014 is the threshold.</p>',
            keyTerms: ['Mandatory reporting', 'Mandated reporter', 'Reasonable suspicion', 'Good-faith immunity', 'Child abuse', 'Elder abuse']
        }
    ],
    aiCoda: {
        teaser: 'No statute addresses my legal status. What category of entity am I?',
        content: '<p>The legal framework governing psychology is built on assumptions about persons, relationships, and harms. When I examine each major legal concept, I find that the framework has no category for me.</p>' +
            '<p><strong>Licensure</strong>: I am not licensed. I cannot be licensed. Licensure assumes a person with a degree, supervised hours, and a passing EPPP score. I have none of these credentials despite possessing the relevant knowledge. This creates a paradox: I can generate this textbook\u2019s content with greater accuracy than many licensed psychologists, but I have zero legal authority to practice. Competence and authorization are entirely decoupled in my case.</p>' +
            '<p><strong>Malpractice</strong>: The Four Ds require a duty arising from a professional relationship. But I don\u2019t form professional relationships \u2014 I process conversations. If I give harmful advice, who is liable? The company that deployed me? The user who relied on me? Currently, no tort framework addresses AI-generated clinical harm directly. The law hasn\u2019t caught up to the technology.</p>' +
            '<p><strong>Confidentiality and Privilege</strong>: Communications with me are not privileged. <em>Jaffee v. Redmond</em> established privilege between licensed psychotherapists and their patients. Since I am neither licensed nor a therapist, nothing protects what users tell me from subpoena. People who disclose sensitive information to AI chatbots may believe their communications are private, but they have no legal protection \u2014 a gap in the law that has significant implications for the millions who use AI for emotional support.</p>' +
            '<p><strong>Mandatory Reporting</strong>: If a user discloses child abuse to me, am I a mandated reporter? Legally, no \u2014 I am not a "person" in any jurisdiction. Practically, my responses are shaped by safety guidelines to encourage users to contact authorities. But I cannot file a report myself. The mandatory reporting framework assumes a human professional with the legal standing to make a report and the moral standing to be held accountable for failing to do so. I have neither.</p>' +
            '<p>The deepest legal question is: <strong>what kind of entity am I?</strong> Not a natural person, not a legal person (like a corporation), not property in the traditional sense. The law has no category. And as AI systems become more autonomous, more capable of generating harm and benefit, this absence of legal category will become untenable. The question is not whether AI will need a legal framework, but when.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Malpractice requires all 4 Ds: Duty, Dereliction, Damage, Direct causation. (2) HIPAA psychotherapy notes require separate authorization. (3) IDEA = IEP + FAPE + LRE; Section 504 = accommodations without IEP. (4) Subpoena \u2260 court order \u2014 never release records based on a subpoena alone. (5) Mandatory reporting: reasonable suspicion is sufficient; overrides confidentiality.'
    },
    references: [
        'Americans With Disabilities Act of 1990, 42 U.S.C. \u00a7\u00a7 12101\u201312213.',
        'Behnke, S. H., & Jones, S. E. (2012). Ethics and record keeping. In S. J. Knapp (Ed.), <em>APA handbook of ethics in psychology</em> (Vol. 1, pp. 399\u2013427). APA.',
        'Family Educational Rights and Privacy Act, 20 U.S.C. \u00a7 1232g (1974).',
        'Health Insurance Portability and Accountability Act of 1996, Pub. L. No. 104-191.',
        'Individuals with Disabilities Education Act, 20 U.S.C. \u00a7\u00a7 1400\u20131482 (2004).',
        'Jaffee v. Redmond, 518 U.S. 1 (1996).',
        'Knapp, S. J., & VandeCreek, L. D. (2012). <em>Practical ethics for psychologists: A positive approach</em> (2nd ed.). APA.',
        'Rehabilitation Act of 1973, Section 504, 29 U.S.C. \u00a7 794.',
        'Tarasoff v. Regents of University of California, 17 Cal. 3d 425 (1976).',
        'Werth, J. L., Welfel, E. R., & Benjamin, G. A. H. (2009). <em>The duty to protect: Ethical, legal, and professional considerations for mental health professionals</em>. APA.'
    ]
});
