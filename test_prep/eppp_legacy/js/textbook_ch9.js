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
            content: '<p>Psychologists operate within a complex web of <strong>federal and state laws</strong> that define their scope of practice, mandate certain actions (like reporting abuse), and create legal liability when standards are not met. The EPPP tests your knowledge of licensure requirements, key federal statutes (HIPAA, FERPA, IDEA, ADA), malpractice law, and the duties psychologists owe to clients and third parties. These topics require careful distinction between federal rules, jurisdiction-specific law, ethics, and institutional policy.</p>'
        },
        {
            heading: 'Licensure and Scope of Practice',
            content: '<p><strong>Licensure</strong> is the legal authorization to practice psychology independently. It is governed at the <strong>state level</strong>, not the federal level.</p>' +
                '<p><strong>Key facts:</strong></p>' +
                '<ul>' +
                '<li>The <strong>ASPPB</strong> (Association of State and Provincial Psychology Boards) administers the EPPP and facilitates licensure mobility</li>' +
                '<li>Jurisdictions set their own education, examination, supervised-experience, and title requirements; doctoral training is commonly required for independent psychologist licensure</li>' +
                '<li>Required supervised experience and whether it must occur after the doctorate vary by jurisdiction</li>' +
                '<li><strong>Scope of practice</strong> defines what a psychologist is legally authorized to do (assessment, therapy, consultation, supervision)</li>' +
                '<li>Prescriptive authority is jurisdiction- and credential-specific and changes over time; verify the current psychology board and prescribing law rather than memorizing a fixed state list</li>' +
                '</ul>' +
                '<p><strong>Title vs. Practice Acts:</strong></p>' +
                '<table>' +
                '<tr><th>Type</th><th>What It Restricts</th><th>Example</th></tr>' +
                '<tr><td><strong>Title Act</strong></td><td>Who can <em>call themselves</em> a psychologist</td><td>Only licensed individuals may use the title "psychologist"</td></tr>' +
                '<tr><td><strong>Practice Act</strong></td><td>Who can <em>perform</em> psychological services</td><td>Only licensed individuals may conduct psychological assessment and treatment</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> A <em>practice act</em> is more restrictive than a <em>title act</em>. Licensure authority is jurisdiction-specific. PSYPACT can authorize qualifying telepsychology or temporary in-person practice in participating jurisdictions, but it does not convert one license into a universal license.</p>',
            keyTerms: ['Licensure', 'ASPPB', 'Scope of practice', 'Title act', 'Practice act', 'PSYPACT', 'Prescriptive authority']
        },
        {
            heading: 'Malpractice: The Four Ds',
            content: '<p><strong>Malpractice</strong> commonly refers to professional negligence. Under governing jurisdictional law, a plaintiff generally must prove each required element; the familiar <strong>"Four Ds"</strong> are a teaching mnemonic for duty, dereliction or breach, damage, and causation:</p>' +
                '<table>' +
                '<tr><th>Element</th><th>Definition</th><th>Example</th></tr>' +
                '<tr><td><strong>Duty</strong></td><td>A professional relationship existed, creating a duty of care</td><td>The psychologist had a client in therapy</td></tr>' +
                '<tr><td><strong>Dereliction (Breach)</strong></td><td>The psychologist\u2019s conduct fell below the <em>standard of care</em></td><td>The psychologist failed to assess for suicidality despite clear risk factors</td></tr>' +
                '<tr><td><strong>Damage</strong></td><td>The client suffered actual harm</td><td>The client attempted suicide and was hospitalized</td></tr>' +
                '<tr><td><strong>Causation</strong></td><td>The breach was a factual and legally sufficient cause of the harm, using the jurisdiction\u2019s applicable actual/proximate-cause rules</td><td>The evidence connects the proven breach to the claimed harm under the governing causation standard</td></tr>' +
                '</table>' +
                '<p><strong>Recurring sources of professional liability and discipline include:</strong></p>' +
                '<ol>' +
                '<li>Sexual relationships and boundary violations</li>' +
                '<li>Breach of confidentiality</li>' +
                '<li>Failure to obtain informed consent</li>' +
                '<li>Negligent diagnosis or treatment</li>' +
                '<li>Failure to take legally required protective action when a serious threat arises</li>' +
                '</ol>' +
                '<p><strong>Standard of care</strong> = what a <em>reasonably prudent psychologist</em> with similar training and experience would do in the same situation. It is NOT perfection \u2014 it is reasonable professional behavior.</p>' +
                '<p><strong>EPPP Tip:</strong> A professional-negligence claim fails if a required element is not proved under governing law—for example, breach without legally cognizable harm or harm not caused by the breach. That conclusion does not determine whether an ethics complaint, licensing action, contract claim, or another legal theory could proceed.</p>',
            keyTerms: ['Malpractice', 'Four Ds', 'Duty', 'Dereliction', 'Damage', 'Causation', 'Standard of care'],
            interactiveDiagram: {
                title: "Common Elements of a Professional-Negligence Claim",
                description: "The common four-D mnemonic maps to duty, dereliction or breach of the applicable standard of care, legally cognizable damage, and causation. A professional-negligence plaintiff generally must establish every required element under the governing jurisdiction. Failure of an element defeats that negligence claim, but does not rule out an ethics complaint, licensing action, contract claim, or another legal theory.",
                svg: "<svg viewBox=\"0 0 860 265\" width=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"ch9MalpracticeTitle ch9MalpracticeDesc\"><title id=\"ch9MalpracticeTitle\">Common professional-negligence elements</title><desc id=\"ch9MalpracticeDesc\">Four linked cards show duty, breach, legally cognizable harm, and factual or proximate causation as applicable. A footer notes that governing law varies and a failed negligence element does not resolve ethics, licensing, contract, or other claims.</desc><defs><marker id=\"ch9MalpracticeArrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto\"><path d=\"M0 0L10 5L0 10Z\" fill=\"#94a3b8\"/></marker></defs><text x=\"430\" y=\"26\" text-anchor=\"middle\" fill=\"#cbd5e1\" font-weight=\"bold\" font-size=\"17\">Common professional-negligence elements (jurisdiction-specific)</text><g font-family=\"system-ui\"><g transform=\"translate(20 50)\"><rect width=\"185\" height=\"125\" rx=\"13\" fill=\"#1e40af\"/><text x=\"92\" y=\"34\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"18\">DUTY</text><text x=\"92\" y=\"67\" text-anchor=\"middle\" fill=\"#dbeafe\" font-size=\"12\">A legally recognized</text><text x=\"92\" y=\"87\" text-anchor=\"middle\" fill=\"#dbeafe\" font-size=\"12\">duty of care</text></g><path d=\"M205 112H230\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch9MalpracticeArrow)\"/><g transform=\"translate(235 50)\"><rect width=\"185\" height=\"125\" rx=\"13\" fill=\"#991b1b\"/><text x=\"92\" y=\"34\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"18\">BREACH</text><text x=\"92\" y=\"67\" text-anchor=\"middle\" fill=\"#fecaca\" font-size=\"12\">Conduct below the</text><text x=\"92\" y=\"87\" text-anchor=\"middle\" fill=\"#fecaca\" font-size=\"12\">applicable standard</text></g><path d=\"M420 112H445\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch9MalpracticeArrow)\"/><g transform=\"translate(450 50)\"><rect width=\"185\" height=\"125\" rx=\"13\" fill=\"#92400e\"/><text x=\"92\" y=\"34\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"18\">DAMAGE</text><text x=\"92\" y=\"67\" text-anchor=\"middle\" fill=\"#fef3c7\" font-size=\"12\">Legally cognizable</text><text x=\"92\" y=\"87\" text-anchor=\"middle\" fill=\"#fef3c7\" font-size=\"12\">harm or loss</text></g><path d=\"M635 112H660\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch9MalpracticeArrow)\"/><g transform=\"translate(665 50)\"><rect width=\"175\" height=\"125\" rx=\"13\" fill=\"#166534\"/><text x=\"87\" y=\"34\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"18\">CAUSATION</text><text x=\"87\" y=\"67\" text-anchor=\"middle\" fill=\"#dcfce7\" font-size=\"12\">Factual / proximate</text><text x=\"87\" y=\"87\" text-anchor=\"middle\" fill=\"#dcfce7\" font-size=\"12\">as law requires</text></g></g><rect x=\"80\" y=\"200\" width=\"700\" height=\"47\" rx=\"10\" fill=\"#0f172a\" stroke=\"#22d3ee\"/><text x=\"430\" y=\"220\" text-anchor=\"middle\" fill=\"#cffafe\" font-size=\"12\">Missing a required element defeats the negligence claim under governing law—</text><text x=\"430\" y=\"238\" text-anchor=\"middle\" fill=\"#cffafe\" font-size=\"12\">not necessarily an ethics, licensing, contract, or other proceeding.</text></svg>"
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
                '<li><strong>Minimum Necessary Standard</strong>: When it applies, covered entities take reasonable steps to limit PHI to what is needed. Important exceptions include treatment disclosures, disclosures to the individual, authorized disclosures, disclosures required by law, and specified HIPAA compliance uses.</li>' +
                '<li><strong>Psychotherapy Notes</strong>: HIPAA provides <em>enhanced protection</em> for psychotherapy notes (process notes kept separately from the medical record). Most uses and disclosures require a specific authorization that is not combined with authorization for other PHI, but HIPAA contains limited exceptions, including use by the originator for treatment and disclosures required by law</li>' +
                '</ul>' +
                '<p><strong>Psychotherapy notes vs. medical records:</strong></p>' +
                '<table>' +
                '<tr><th>Category</th><th>Example</th><th>HIPAA Protection</th></tr>' +
                '<tr><td><strong>Medical Record</strong></td><td>Diagnosis, treatment plan, dates of service, medications, test results</td><td>Subject to the applicable Privacy Rule pathway: authorization, permitted use/disclosure, required disclosure, or individual access right</td></tr>' +
                '<tr><td><strong>Psychotherapy Notes</strong></td><td>Clinician\u2019s private impressions, process notes, analysis of conversation</td><td>Special protection; specific authorization is generally required, subject to limited regulatory exceptions</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> HIPAA\u2019s psychotherapy notes provision is heavily tested. Know that these notes are <em>kept separately</em> from the medical record and require their own authorization for release. Do not assume a general authorization covers psychotherapy notes; apply the specific authorization rule and its limited exceptions.</p>',
            keyTerms: ['HIPAA', 'PHI', 'Privacy Rule', 'Security Rule', 'Psychotherapy notes', 'Minimum necessary']
        },
        {
            heading: 'FERPA, IDEA, and ADA',
            content: '<p>Three federal laws are critical for psychologists working in educational, school, and disability-related settings:</p>' +
                '<table>' +
                '<tr><th>Law</th><th>Year</th><th>What It Protects/Requires</th><th>Key EPPP Facts</th></tr>' +
                '<tr><td><strong>FERPA</strong></td><td>1974</td><td>Privacy of student <em>educational records</em></td><td>Rights generally belong to parents and transfer to an eligible student at age 18 or attendance at a postsecondary institution. FERPA permits specified disclosures without consent; education records covered by FERPA are excluded from HIPAA PHI.</td></tr>' +
                '<tr><td><strong>IDEA</strong></td><td>1975/2004</td><td>Free Appropriate Public Education (<strong>FAPE</strong>) for children with disabilities ages 3\u201321</td><td>Requires an IEP (Individualized Education Program), LRE (Least Restrictive Environment), multidisciplinary evaluation, and due process protections. Discipline rules turn on whether removals constitute a change of placement and on manifestation determinations; IDEA requires or contemplates an FBA/BIP in specified circumstances, not automatically after every suspension exceeding ten days.</td></tr>' +
                '<tr><td><strong>ADA</strong></td><td>1990</td><td>Prohibits discrimination against individuals with disabilities in employment, public services, and accommodations</td><td>Requires <strong>reasonable accommodations</strong> unless they cause undue hardship. Covers mental health conditions (depression, anxiety, PTSD, bipolar) if they substantially limit major life activities.</td></tr>' +
                '</table>' +
                '<p><strong>Section 504 of the Rehabilitation Act (1973):</strong> Prohibits disability discrimination in any program receiving federal funding. Section 504 requires an appropriate education and procedural safeguards for eligible students; schools commonly document services and accommodations in a 504 plan, but eligibility and obligations are broader than a form label.</p>' +
                '<p><strong>EPPP Tip:</strong> IDEA vs. Section 504 is a common EPPP comparison. IDEA eligibility requires a qualifying disability and a need for special education and related services; Section 504 uses its own disability and educational-need standards. Either framework may involve services and accommodations, so determine eligibility individually rather than using an instruction-versus-accommodation shortcut.</p>',
            keyTerms: ['FERPA', 'IDEA', 'FAPE', 'IEP', 'LRE', 'ADA', 'Section 504', 'Reasonable accommodations'],
            expandableCase: {
                title: 'The Dual-Diagnosis Student',
                clinicalDescription: 'A bright 14-year-old student is diagnosed with Generalized Anxiety Disorder but is earning straight A\'s in all her advanced classes. Because of her anxiety, she frequently needs to leave the room to take deep breaths and occasionally misses assignments due to panic attacks.',
                diagnosis: 'Individual IDEA and Section 504 Evaluation Required',
                explanation: 'Grades alone do not decide IDEA eligibility: federal regulations expressly recognize that a child advancing from grade to grade may still need special education. The school must evaluate whether the student meets an IDEA category and needs special education and related services; if not, it should separately evaluate Section 504 eligibility and needed supports. The facts support evaluation, not a predetermined legal outcome.'
            }
        },
        {
            heading: 'Duty to Warn and Protect: Tarasoff and Beyond',
            content: '<p><em>Tarasoff</em> is a California decision recognizing a duty to use reasonable care to protect a foreseeable victim under the circumstances presented. Other jurisdictions define mandatory, permissive, or absent duties differently by statute and case law.</p>' +
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
                '<p><strong>Common exam factors (not universal jurisdictional elements):</strong></p>' +
                '<ol>' +
                '<li>A <strong>serious threat of harm</strong> (not vague expressions of anger)</li>' +
                '<li>An identifiable or reasonably foreseeable victim or class, where required by the governing law</li>' +
                '<li>A <strong>therapeutic relationship</strong> exists (duty arises from the professional role)</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> The EPPP tests the distinction between Tarasoff I (warn) and Tarasoff II (protect). Know the historical warn/protect distinction, then follow the question\'s stated jurisdictional rule rather than assuming California law applies everywhere.</p>',
            keyTerms: ['Tarasoff', 'Duty to warn', 'Duty to protect', 'Identifiable victim', 'Tarasoff I vs. II']
        },
        {
            heading: 'Privilege, Subpoenas, and Court Orders',
            content: '<p><strong>A demand is not automatic permission for unrestricted disclosure.</strong> Psychotherapist-patient privilege can protect confidential communications from compelled disclosure, subject to governing jurisdictional law. Critical distinctions:</p>' +
                '<table>' +
                '<tr><th>Concept</th><th>Definition</th><th>Key Facts</th></tr>' +
                '<tr><td><strong>Confidentiality</strong></td><td>Ethical and professional obligation</td><td>Governed by APA Ethics Code and HIPAA; applies in all contexts</td></tr>' +
                '<tr><td><strong>Privilege</strong></td><td>Legal right protecting communications in court</td><td>Belongs to the <em>client</em>, not the therapist; can be waived by the client</td></tr>' +
                '</table>' +
                '<p><strong>Jaffee v. Redmond (1996)</strong>: The U.S. Supreme Court established a federal psychotherapist-patient privilege, holding that confidential communications between a licensed psychotherapist and a patient are protected from compelled disclosure in federal proceedings.</p>' +
                '<p><strong>Subpoena vs. Court Order:</strong></p>' +
                '<ul>' +
                '<li><strong>Subpoena</strong>: A formal demand that may be attorney- or court-issued. Do not ignore it or automatically disclose; promptly assess validity, jurisdiction, privilege, authorization, HIPAA, objections, deadlines, and available protective procedures.</li>' +
                '<li><strong>Court order</strong>: A judicial directive requiring a timely response. Comply as legally required while considering appeal, stay, protective-order, privilege, and scope options with counsel; disclose no more than the order and applicable law require.</li>' +
                '</ul>' +
                '<p><strong>What to do when you receive a subpoena:</strong></p>' +
                '<ol>' +
                '<li>Do NOT automatically release records</li>' +
                '<li>Contact the client and discuss \u2014 client may consent or waive privilege</li>' +
                '<li>Seek legal consultation</li>' +
                '<li>Assert privilege on behalf of the client</li>' +
                '<li>If necessary, file a motion to quash the subpoena</li>' +
                '<li>Respond through the legally appropriate route; disclosure may rest on authorization, an order, another HIPAA permission or requirement, or other applicable law</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> This is one of the most commonly tested legal questions: a subpoena alone is NOT enough to release records. The psychologist should assert privilege, contact the client, and seek legal counsel. A subpoena requires a timely legal response but does not automatically authorize disclosure; evaluate privilege, HIPAA, applicable law, and protective options.</p>',
            keyTerms: ['Privilege', 'Confidentiality', 'Jaffee v. Redmond', 'Subpoena', 'Court order', 'Motion to quash'],
            interactiveDiagram: {
                title: "Responding to Authorizations, Subpoenas, and Court Orders",
                description: "A demand is not automatic permission for unrestricted disclosure. Preserve records and deadlines; classify an authorization, subpoena or other process, or court/administrative order; verify validity, authority, jurisdiction, HIPAA, privilege, state and specially protected information; consult the client and counsel as appropriate; seek protection when available; then disclose only through an authorized route, within its scope, and document the response.",
                svg: "<svg viewBox=\"0 0 930 390\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"ch9LegalDemandTitle ch9LegalDemandDesc\"><title id=\"ch9LegalDemandTitle\">Response pathway for legal demands and authorizations</title><desc id=\"ch9LegalDemandDesc\">A six-step pathway preserves records and deadlines, classifies the request, verifies authority and jurisdiction, evaluates confidentiality and protective options, responds only through an authorized route within scope, and documents the decision.</desc><defs><marker id=\"ch9LegalDemandArrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto\"><path d=\"M0 0L10 5L0 10Z\" fill=\"#475569\"/></marker></defs><rect width=\"930\" height=\"390\" rx=\"22\" fill=\"#f8fafc\"/><text x=\"465\" y=\"40\" text-anchor=\"middle\" font-family=\"system-ui\" font-size=\"22\" font-weight=\"700\" fill=\"#172554\">A demand is not automatic permission for unrestricted disclosure</text><g font-family=\"system-ui\" text-anchor=\"middle\"><g transform=\"translate(18 82)\"><rect width=\"135\" height=\"170\" rx=\"14\" fill=\"#dbeafe\" stroke=\"#2563eb\" stroke-width=\"3\"/><text x=\"67\" y=\"31\" font-size=\"17\" font-weight=\"700\" fill=\"#1e40af\">1. Preserve</text><text x=\"67\" y=\"66\" font-size=\"13\" fill=\"#1e3a8a\">Records</text><text x=\"67\" y=\"91\" font-size=\"13\" fill=\"#1e3a8a\">Deadlines</text><text x=\"67\" y=\"116\" font-size=\"13\" fill=\"#1e3a8a\">No alteration</text></g><path d=\"M153 167H170\" stroke=\"#475569\" stroke-width=\"3\" marker-end=\"url(#ch9LegalDemandArrow)\"/><g transform=\"translate(175 82)\"><rect width=\"135\" height=\"170\" rx=\"14\" fill=\"#ede9fe\" stroke=\"#7c3aed\" stroke-width=\"3\"/><text x=\"67\" y=\"31\" font-size=\"17\" font-weight=\"700\" fill=\"#5b21b6\">2. Classify</text><text x=\"67\" y=\"62\" font-size=\"12\" fill=\"#4c1d95\">Authorization</text><text x=\"67\" y=\"87\" font-size=\"12\" fill=\"#4c1d95\">Subpoena / process</text><text x=\"67\" y=\"112\" font-size=\"12\" fill=\"#4c1d95\">Court / admin order</text></g><path d=\"M310 167H327\" stroke=\"#475569\" stroke-width=\"3\" marker-end=\"url(#ch9LegalDemandArrow)\"/><g transform=\"translate(332 82)\"><rect width=\"135\" height=\"170\" rx=\"14\" fill=\"#fef3c7\" stroke=\"#d97706\" stroke-width=\"3\"/><text x=\"67\" y=\"31\" font-size=\"17\" font-weight=\"700\" fill=\"#92400e\">3. Verify</text><text x=\"67\" y=\"62\" font-size=\"12\" fill=\"#78350f\">Validity + authority</text><text x=\"67\" y=\"87\" font-size=\"12\" fill=\"#78350f\">Jurisdiction</text><text x=\"67\" y=\"112\" font-size=\"12\" fill=\"#78350f\">HIPAA + state law</text></g><path d=\"M467 167H484\" stroke=\"#475569\" stroke-width=\"3\" marker-end=\"url(#ch9LegalDemandArrow)\"/><g transform=\"translate(489 82)\"><rect width=\"135\" height=\"170\" rx=\"14\" fill=\"#fee2e2\" stroke=\"#dc2626\" stroke-width=\"3\"/><text x=\"67\" y=\"31\" font-size=\"17\" font-weight=\"700\" fill=\"#991b1b\">4. Protect</text><text x=\"67\" y=\"62\" font-size=\"12\" fill=\"#7f1d1d\">Client + counsel</text><text x=\"67\" y=\"87\" font-size=\"12\" fill=\"#7f1d1d\">Privilege / objection</text><text x=\"67\" y=\"112\" font-size=\"12\" fill=\"#7f1d1d\">Protective relief</text></g><path d=\"M624 167H641\" stroke=\"#475569\" stroke-width=\"3\" marker-end=\"url(#ch9LegalDemandArrow)\"/><g transform=\"translate(646 82)\"><rect width=\"135\" height=\"170\" rx=\"14\" fill=\"#dcfce7\" stroke=\"#16a34a\" stroke-width=\"3\"/><text x=\"67\" y=\"31\" font-size=\"17\" font-weight=\"700\" fill=\"#166534\">5. Respond</text><text x=\"67\" y=\"62\" font-size=\"12\" fill=\"#14532d\">Authorized route</text><text x=\"67\" y=\"87\" font-size=\"12\" fill=\"#14532d\">Required scope only</text><text x=\"67\" y=\"112\" font-size=\"12\" fill=\"#14532d\">Secure delivery</text></g><path d=\"M781 167H798\" stroke=\"#475569\" stroke-width=\"3\" marker-end=\"url(#ch9LegalDemandArrow)\"/><g transform=\"translate(803 82)\"><rect width=\"109\" height=\"170\" rx=\"14\" fill=\"#e0f2fe\" stroke=\"#0284c7\" stroke-width=\"3\"/><text x=\"54\" y=\"31\" font-size=\"17\" font-weight=\"700\" fill=\"#075985\">6. Record</text><text x=\"54\" y=\"66\" font-size=\"12\" fill=\"#0c4a6e\">Authority</text><text x=\"54\" y=\"91\" font-size=\"12\" fill=\"#0c4a6e\">Scope</text><text x=\"54\" y=\"116\" font-size=\"12\" fill=\"#0c4a6e\">Response</text></g><rect x=\"135\" y=\"290\" width=\"660\" height=\"58\" rx=\"14\" fill=\"#fff\" stroke=\"#334155\" stroke-width=\"2\"/><text x=\"465\" y=\"315\" font-size=\"14\" font-weight=\"700\" fill=\"#334155\">Court order: limit disclosure to what the order authorizes or requires.</text><text x=\"465\" y=\"337\" font-size=\"13\" fill=\"#475569\">Subpoena/process: do not ignore; HIPAA conditions and protective routes may apply.</text></g></svg>"
            }
        },
        {
            heading: 'Mandatory Reporting',
            content: '<p><strong>All 50 states</strong> have mandatory reporting laws for child abuse and neglect. Psychologists are classified as <strong>mandated reporters</strong> in every state.</p>' +
                '<p><strong>Key principles:</strong></p>' +
                '<ul>' +
                '<li>Reporting thresholds vary in wording by jurisdiction (for example, reasonable suspicion, reasonable cause, or reasonable belief); proof is generally not required</li>' +
                '<li>Failure to report can carry jurisdiction-specific criminal, civil, licensing, or employment consequences</li>' +
                '<li>Statutes commonly provide qualified immunity for good-faith reports, with wording and exceptions varying by jurisdiction</li>' +
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
                '<p><strong>EPPP Tip:</strong> When facts meet the governing reporting threshold, make the required report promptly; do not investigate beyond what is needed to determine the reporting duty. You should inform the client that you are required to file a report, but you file even if the client objects. Use the threshold, reporter category, child definition, timing, agency, and documentation rules supplied by the jurisdiction.</p>',
            keyTerms: ['Mandatory reporting', 'Mandated reporter', 'Reasonable suspicion', 'Good-faith immunity', 'Child abuse', 'Elder abuse']
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: legal accountability when psychologists use AI tools',
        content: '<p><strong>Reflective extension (not a settled EPPP rule):</strong> AI does not erase a psychologist\'s existing duties. A psychologist remains responsible for practicing within competence and scope, protecting confidential information, evaluating vendors and data flows, obtaining appropriate consent, checking outputs, and avoiding unsupported clinical conclusions.</p>' +
            '<p>Different laws may attach to different actors and data: licensure law governs professional practice; HIPAA may govern covered entities and business associates; consumer-protection, disability, employment, education, product, contract, and negligence law may also apply. Whether a tool is regulated and who may be liable depend on its use, claims, deployment, jurisdiction, and facts.</p>' +
            '<p>The practical reasoning sequence is: identify the human decision and foreseeable harm, identify who controls the data and professional judgment, map the applicable legal and ethical duties, preserve meaningful human review, and document why the tool was appropriate. Claims that AI has no legal framework or that one actor is always liable are too broad.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Malpractice generally requires duty, breach, harm, and causation. (2) HIPAA psychotherapy notes receive special protection but have limited exceptions. (3) IDEA eligibility is individualized; passing grades do not rule it out. (4) A subpoena requires a prompt legal response but is not automatic permission to disclose. (5) Reporting and duty-to-protect rules are jurisdiction-specific—apply the facts and law supplied in the item.'
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
