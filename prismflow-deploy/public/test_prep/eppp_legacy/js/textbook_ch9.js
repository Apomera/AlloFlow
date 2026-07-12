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
            content: '<p><strong>Malpractice</strong> (professional negligence) requires the plaintiff to prove all four of the following elements, commonly called the <strong>"Four Ds"</strong>:</p>' +
                '<table>' +
                '<tr><th>Element</th><th>Definition</th><th>Example</th></tr>' +
                '<tr><td><strong>Duty</strong></td><td>A professional relationship existed, creating a duty of care</td><td>The psychologist had a client in therapy</td></tr>' +
                '<tr><td><strong>Dereliction (Breach)</strong></td><td>The psychologist\u2019s conduct fell below the <em>standard of care</em></td><td>The psychologist failed to assess for suicidality despite clear risk factors</td></tr>' +
                '<tr><td><strong>Damage</strong></td><td>The client suffered actual harm</td><td>The client attempted suicide and was hospitalized</td></tr>' +
                '<tr><td><strong>Direct Causation</strong></td><td>The breach <em>directly caused</em> the damage</td><td>The failure to assess led directly to the suicide attempt</td></tr>' +
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
            content: '<p><strong>Psychotherapist-patient privilege</strong> protects confidential communications from being compelled in court proceedings. Critical distinctions:</p>' +
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
                title: 'Responding to Legal Demands for Records',
                description: 'Decision path: preserve records and deadlines, identify the demand, verify authority and jurisdiction, consult the client and counsel as appropriate, assert privilege or seek protection when available, and disclose only through a legally authorized route and only within its scope.',
                svg: '<svg viewBox="0 0 920 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="legalDemandTitle legalDemandDesc"><title id="legalDemandTitle">Legal demand response pathway</title><desc id="legalDemandDesc">A five-step pathway begins by preserving records and deadlines, then classifies the demand, verifies authority and jurisdiction, considers consent privilege objections and protective relief, and ends with a limited legally authorized response.</desc><defs><marker id="ldArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#475569"/></marker></defs><rect width="920" height="360" rx="22" fill="#f8fafc"/><text x="460" y="40" text-anchor="middle" font-family="system-ui" font-size="23" font-weight="700" fill="#172554">A demand is not permission to disclose</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(25 85)"><rect width="150" height="145" rx="16" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="75" y="34" font-size="18" font-weight="700" fill="#1e40af">1. Preserve</text><text x="75" y="66" font-size="14" fill="#1e3a8a">Records</text><text x="75" y="89" font-size="14" fill="#1e3a8a">Deadlines</text><text x="75" y="112" font-size="14" fill="#1e3a8a">No alteration</text></g><path d="M175 157H200" stroke="#475569" stroke-width="3" marker-end="url(#ldArrow)"/><g transform="translate(205 85)"><rect width="150" height="145" rx="16" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/><text x="75" y="34" font-size="18" font-weight="700" fill="#5b21b6">2. Classify</text><text x="75" y="66" font-size="14" fill="#4c1d95">Authorization?</text><text x="75" y="89" font-size="14" fill="#4c1d95">Subpoena?</text><text x="75" y="112" font-size="14" fill="#4c1d95">Court order?</text></g><path d="M355 157H380" stroke="#475569" stroke-width="3" marker-end="url(#ldArrow)"/><g transform="translate(385 85)"><rect width="150" height="145" rx="16" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="75" y="34" font-size="18" font-weight="700" fill="#92400e">3. Verify</text><text x="75" y="66" font-size="14" fill="#78350f">Validity</text><text x="75" y="89" font-size="14" fill="#78350f">Jurisdiction</text><text x="75" y="112" font-size="14" fill="#78350f">HIPAA + law</text></g><path d="M535 157H560" stroke="#475569" stroke-width="3" marker-end="url(#ldArrow)"/><g transform="translate(565 85)"><rect width="150" height="145" rx="16" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="75" y="34" font-size="18" font-weight="700" fill="#991b1b">4. Protect</text><text x="75" y="66" font-size="14" fill="#7f1d1d">Privilege</text><text x="75" y="89" font-size="14" fill="#7f1d1d">Objection</text><text x="75" y="112" font-size="14" fill="#7f1d1d">Legal counsel</text></g><path d="M715 157H740" stroke="#475569" stroke-width="3" marker-end="url(#ldArrow)"/><g transform="translate(745 85)"><rect width="150" height="145" rx="16" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="75" y="34" font-size="18" font-weight="700" fill="#166534">5. Respond</text><text x="75" y="66" font-size="14" fill="#14532d">Authorized route</text><text x="75" y="89" font-size="14" fill="#14532d">Limited scope</text><text x="75" y="112" font-size="14" fill="#14532d">Document action</text></g><rect x="180" y="270" width="560" height="55" rx="14" fill="#fff" stroke="#334155" stroke-width="2"/><text x="460" y="303" font-size="16" font-weight="700" fill="#334155">Never ignore • Never automatically disclose • Never exceed authority</text></g></svg>'
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
