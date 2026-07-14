/* ============================================================
   PasstheEPPP — Textbook Ch 12: Research Ethics
   Domain: Ethical, Legal & Professional Issues (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-12',
    domain: 'Ethical, Legal & Professional Issues',
    domainNumber: 2,
    title: 'Research Ethics & the Belmont Report',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests research ethics separately from clinical ethics. You must know the <strong>Belmont Report</strong> and its three core principles, the <strong>IRB process</strong>, Standard 8 of the APA Ethics Code, and the rules governing deception, debriefing, informed consent in research, and publication ethics. These are recurring exam-content distinctions, but emphasis varies by exam form.</p>'
        },
        {
            heading: 'The Belmont Report (1979)',
            content: '<p>The <strong>Belmont Report</strong> is the foundational document for ethical research with human subjects. It was developed by the National Commission for the Protection of Human Subjects following ethical scandals (notably the Tuskegee Syphilis Study).</p>' +
                '<p><strong>Three core principles:</strong></p>' +
                '<table>' +
                '<tr><th>Principle</th><th>Definition</th><th>Application</th></tr>' +
                '<tr><td><strong>Respect for Persons</strong></td><td>Individuals are autonomous agents; persons with diminished autonomy deserve protection</td><td><strong>Informed consent</strong>: adequate information, comprehension, and voluntariness</td></tr>' +
                '<tr><td><strong>Beneficence</strong></td><td>Maximize benefits and minimize harm</td><td><strong>Risk/benefit analysis</strong>: systematic assessment of risks and anticipated benefits</td></tr>' +
                '<tr><td><strong>Justice</strong></td><td>Fair distribution of the burdens and benefits of research</td><td><strong>Fair selection of subjects</strong>: no group should bear disproportionate research burden</td></tr>' +
                '</table>' +
                '<p><strong>Belmont vs. APA General Principles:</strong></p>' +
                '<ul>' +
                '<li>Belmont\u2019s "Respect for Persons" \u2248 APA Principle E (Respect for Rights and Dignity)</li>' +
                '<li>Belmont\u2019s "Beneficence" \u2248 APA Principle A (Beneficence and Nonmaleficence)</li>' +
                '<li>Belmont\u2019s "Justice" \u2248 APA Principle D (Justice)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The Belmont Report has <em>three</em> principles, not five (like the APA code). Know them cold: Respect for Persons, Beneficence, Justice. The Belmont Report applies specifically to <em>research</em>, not clinical practice.</p>',
            keyTerms: ['Belmont Report', 'Respect for Persons', 'Beneficence', 'Justice', 'Tuskegee', 'Research ethics'],
            interactiveDiagram: {
                title: 'From Belmont Principles to Protocol Questions',
                description: 'Three-column concept map connecting Respect for Persons to informed and voluntary consent, Beneficence to risk-benefit assessment, and Justice to equitable subject selection. Each column ends with a protocol-review question.',
                svg: '<svg viewBox="0 0 900 390" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="belmontTitle belmontDesc"><title id="belmontTitle">Belmont principles concept map</title><desc id="belmontDesc">Respect for Persons leads to informed, comprehensible, voluntary consent. Beneficence leads to minimizing risk and assessing anticipated benefit. Justice leads to equitable selection and distribution of burdens and benefits.</desc><rect width="900" height="390" rx="24" fill="#f5f7ff"/><text x="450" y="42" text-anchor="middle" font-size="24" font-weight="700" fill="#172554">Belmont Report â†’ protocol review</text><g font-family="system-ui, sans-serif"><g transform="translate(30 75)"><rect width="260" height="275" rx="18" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/><text x="130" y="40" text-anchor="middle" font-size="19" font-weight="700" fill="#075985">Respect for Persons</text><text x="20" y="82" font-size="16" fill="#0c4a6e">â€¢ Recognize autonomy</text><text x="20" y="112" font-size="16" fill="#0c4a6e">â€¢ Protect diminished autonomy</text><path d="M130 135v35" stroke="#0284c7" stroke-width="3"/><text x="130" y="197" text-anchor="middle" font-size="16" font-weight="700" fill="#075985">Consent application</text><text x="130" y="226" text-anchor="middle" font-size="14" fill="#0c4a6e">Understandable and voluntary?</text></g><g transform="translate(320 75)"><rect width="260" height="275" rx="18" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="130" y="40" text-anchor="middle" font-size="19" font-weight="700" fill="#166534">Beneficence</text><text x="20" y="82" font-size="16" fill="#14532d">â€¢ Minimize possible harms</text><text x="20" y="112" font-size="16" fill="#14532d">â€¢ Maximize possible benefits</text><path d="M130 135v35" stroke="#16a34a" stroke-width="3"/><text x="130" y="197" text-anchor="middle" font-size="16" font-weight="700" fill="#166534">Risk-benefit application</text><text x="130" y="226" text-anchor="middle" font-size="14" fill="#14532d">Necessary and reasonable?</text></g><g transform="translate(610 75)"><rect width="260" height="275" rx="18" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="130" y="40" text-anchor="middle" font-size="19" font-weight="700" fill="#92400e">Justice</text><text x="20" y="82" font-size="16" fill="#78350f">â€¢ Select subjects fairly</text><text x="20" y="112" font-size="16" fill="#78350f">â€¢ Distribute burdens fairly</text><path d="M130 135v35" stroke="#d97706" stroke-width="3"/><text x="130" y="197" text-anchor="middle" font-size="16" font-weight="700" fill="#92400e">Selection application</text><text x="130" y="226" text-anchor="middle" font-size="14" fill="#78350f">Who bears and benefits?</text></g></g></svg>'
            },
            knowledgeCheck: {
                question: 'A university researcher seeks to test a new, highly effective, but expensive reading intervention. To save money, he recruits participants exclusively from a low-income housing project, but he intends to market the final program to wealthy suburban school districts. Which principle of the Belmont Report is most directly violated here?',
                options: [
                    'Respect for Persons',
                    'Beneficence',
                    'Justice',
                    'Nonmaleficence'
                ],
                answer: 2,
                rationale: 'The Belmont principle of Justice requires a fair distribution of the burdens and benefits of research. Recruiting only from a low-income population to bear the burdens of research, while intending for a wealthy population to reap the benefits, is a direct violation of this principle.'
            }
        },
        {
            heading: 'Institutional Review Boards (IRBs)',
            content: '<p>Human-subjects research covered by the Common Rule must receive the required institutional determination or <strong>Institutional Review Board (IRB)</strong> review before research activities begin. Coverage depends on the activity, funding or regulatory authority, institutional assurances, and other applicable rules; investigators should not make their own exemption determination unless institutional policy authorizes it.</p>' +
                '<p><strong>IRB review levels:</strong></p>' +
                '<table>' +
                '<tr><th>Review Level</th><th>When Used</th><th>Example</th></tr>' +
                '<tr><td><strong>Exempt category</strong></td><td>Fits a category in 45 CFR 46.104; some categories require limited IRB review</td><td>Certain educational tests, surveys, interviews, observations, or secondary research that meet the category conditions</td></tr>' +
                '<tr><td><strong>Expedited review</strong></td><td>No more than minimal risk and within an eligible federal category, or an eligible minor change to approved research</td><td>A qualifying minimal-risk procedure reviewed by the IRB chair or experienced designee</td></tr>' +
                '<tr><td><strong>Convened IRB review</strong></td><td>Required when covered nonexempt research is not eligible for expedited review</td><td>A greater-than-minimal-risk protocol; population or deception alone does not determine the review route</td></tr>' +
                '</table>' +
                '<p><strong>IRB composition:</strong></p>' +
                '<ul>' +
                '<li>Must have at least <strong>5 members</strong></li>' +
                '<li>Must include at least <strong>one non-scientist</strong></li>' +
                '<li>Must include at least <strong>one member not affiliated with the institution</strong></li>' +
                '<li>Membership must promote competent review through diversity of professional experience and backgrounds, including consideration of race, gender, and cultural backgrounds and sensitivity to community attitudes</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The IRB is a <em>prospective</em> review \u2014 approval must be obtained <em>before</em> research begins. When approval is required, research activities cannot begin first and be retroactively approved.</p>',
            keyTerms: ['IRB', 'Exempt review', 'Expedited review', 'Full board review', 'Minimal risk', 'Prospective review']
        },
        {
            heading: 'APA Standard 8: Research and Publication',
            content: '<p>Standard 8 of the APA Ethics Code covers research-specific ethical obligations:</p>' +
                '<table>' +
                '<tr><th>Standard</th><th>Topic</th><th>Key Rule</th></tr>' +
                '<tr><td><strong>8.01</strong></td><td>IRB Approval</td><td>Must obtain institutional approval and comply with approved protocol</td></tr>' +
                '<tr><td><strong>8.02</strong></td><td>Informed Consent to Research</td><td>Inform participants about: purpose, procedures, right to decline/withdraw, risks and benefits, limits of confidentiality, incentives</td></tr>' +
                '<tr><td><strong>8.03</strong></td><td>Consent for Recording</td><td>Obtain consent before recording voices or images (exception: naturalistic observation in public places)</td></tr>' +
                '<tr><td><strong>8.04</strong></td><td>Client/Patient as Research Participant</td><td>When recruiting therapy clients, take steps to protect them from adverse consequences of declining</td></tr>' +
                '<tr><td><strong>8.05</strong></td><td>Dispensing with Consent</td><td>Psychologists dispense with consent only where federal or institutional rules permit it and the activity fits the standard\'s specified low-risk research or service-evaluation circumstances, or where law or regulation otherwise permits</td></tr>' +
                '<tr><td><strong>8.06</strong></td><td>Offering Inducements</td><td>Incentives must not be excessive or coercive; must not interfere with voluntariness</td></tr>' +
                '<tr><td><strong>8.07</strong></td><td>Deception in Research</td><td>Permitted only when: (a) the study is justified by significant value, (b) non-deceptive alternatives are not feasible, (c) participants are <em>not</em> deceived about aspects that would affect their willingness to participate (e.g., physical pain, emotional distress)</td></tr>' +
                '<tr><td><strong>8.08</strong></td><td>Debriefing</td><td>Promptly offer appropriate information about the research; correct misconceptions as early as feasible, with limited delay only when scientifically or humanely justified, and take reasonable steps to reduce harm</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Standard 8.07 is critical: deception is allowed but ONLY under strict conditions. You may NOT deceive participants about aspects that would affect their willingness to participate, such as risk of physical pain or significant emotional distress. Always debrief as soon as feasible (8.08).</p>',
            keyTerms: ['Standard 8', 'Informed consent in research', 'Deception', 'Debriefing', 'Inducements', 'Right to withdraw']
        },
        {
            heading: 'Vulnerable Populations in Research',
            content: '<p><strong>Vulnerable populations</strong> require additional protections because they may have <em>diminished autonomy</em> or be at <em>increased risk</em> of coercion or harm:</p>' +
                '<table>' +
                '<tr><th>Population</th><th>Special Protections</th></tr>' +
                '<tr><td><strong>Children</strong></td><td>Subpart D defines approvable risk/benefit categories and usually requires parental permission and age-appropriate child assent, subject to specific IRB findings and waiver provisions.</td></tr>' +
                '<tr><td><strong>Prisoners</strong></td><td>Subpart C restricts permissible HHS-supported research categories and requires prisoner representation plus findings addressing coercion, selection, advantages, risk, and parole effects.</td></tr>' +
                '<tr><td><strong>Pregnant women and fetuses</strong></td><td>Subpart B requires applicable preclinical/clinical information, risk minimization, specified risk-benefit conditions, appropriate consent, and safeguards against inducement or influence.</td></tr>' +
                '<tr><td><strong>Individuals with cognitive impairment</strong></td><td>May lack capacity for informed consent. Require legally authorized representative consent plus participant assent when possible.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> For children, <em>parental permission</em> and the child\'s <em>assent</em> are distinct. Whether each is required depends on the child, protocol, applicable rules, and documented IRB findings; a capable child\'s dissent generally deserves serious weight.</p>',
            keyTerms: ['Vulnerable populations', 'Children', 'Prisoners', 'Consent vs. assent', 'Diminished autonomy', 'Coercion']
        },
        {
            heading: 'Publication Ethics and Scientific Integrity',
            content: '<p>The APA Ethics Code and broader scientific community require honesty and integrity in publication:</p>' +
                '<p><strong>Key rules:</strong></p>' +
                '<ul>' +
                '<li><strong>Plagiarism (Standard 8.11)</strong>: Do not present others\u2019 work or data as your own, even in small portions</li>' +
                '<li><strong>Publication credit (Standard 8.12)</strong>: Credit must reflect scientific or professional contributions, not status. Faculty do not take authorship on a student dissertation publication solely because of their position; authorship order follows relative contribution and applicable publication policy.</li>' +
                '<li><strong>Duplicate publication (Standard 8.13)</strong>: Do not publish the same data as original data in more than one publication</li>' +
                '<li><strong>Sharing data (Standard 8.14)</strong>: After publication, do not withhold data needed for verification from competent professionals who protect confidentiality and use it only for that purpose, absent legal, proprietary, or other recognized constraints; reasonable costs may be assigned.</li>' +
                '<li><strong>Fabrication and falsification</strong>: Creating or altering data is the most serious form of scientific misconduct</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Do not assign authorship by seniority. A dissertation-based article ordinarily gives the student principal credit when the article is substantially based on the student\'s work, but actual contributions and publication policy still matter.</p>',
            keyTerms: ['Plagiarism', 'Publication credit', 'First author', 'Data sharing', 'Scientific misconduct', 'Fabrication'],
            expandableCase: {
                title: 'The Dissertation Dilemma',
                clinicalDescription: 'A clinical psychology PhD student spends three years designing, running, and analyzing a complex study for her dissertation. Her faculty advisor secured the grant funding, provided the lab space, and offered weekly methodological guidance. When preparing the manuscript for publication, the faculty advisor demands to be listed as first author.',
                diagnosis: 'Unethical Authorship (Standard 8.12)',
                explanation: 'Under APA Standard 8.12 (Publication Credit), principal authorship must accurately reflect the relative scientific contributions, regardless of status. The standard gives students principal authorship on multiple-authored articles substantially based on their doctoral dissertations. On the facts given, the advisor\'s status, funding, space, and routine supervision do not by themselves establish the greater scientific contribution needed to displace the student.'
            }
        },
        {
            heading: 'Historical Ethics Violations and Their Legacy',
            content: '<p>The EPPP expects you to know key historical cases that shaped modern research ethics:</p>' +
                '<table>' +
                '<tr><th>Study</th><th>Year</th><th>Violation</th><th>Legacy</th></tr>' +
                '<tr><td><strong>Tuskegee Syphilis Study</strong></td><td>1932\u20131972</td><td>Black men with syphilis were denied treatment (penicillin) so researchers could observe the natural course of the disease. No informed consent.</td><td>Led directly to the <strong>Belmont Report</strong> and federal research regulations.</td></tr>' +
                '<tr><td><strong>Milgram Obedience Studies</strong></td><td>1961\u20131963</td><td>Participants believed they were administering potentially lethal shocks. Experienced extreme psychological distress. Deception about core study purpose.</td><td>Led to stricter rules on <strong>deception</strong> and <strong>debriefing</strong> (Standards 8.07, 8.08).</td></tr>' +
                '<tr><td><strong>Stanford Prison Experiment</strong></td><td>1971</td><td>Participants experienced degrading treatment and distress in a simulated prison that ended early; later critiques also challenge demand characteristics, researcher influence, and the strength of its conclusions.</td><td>Prompts discussion of <strong>oversight, role conflict, stopping rules, and participant welfare</strong>.</td></tr>' +
                '<tr><td><strong>Little Albert</strong></td><td>1920</td><td>An infant was exposed to fear-conditioning procedures under standards that would not meet modern protections; the historical record leaves important details uncertain.</td><td>Often used to discuss modern concerns about <strong>child protection, risk, and follow-up</strong>.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Know Tuskegee \u2192 Belmont Report. Know Milgram \u2192 stricter deception/debriefing rules. These are commonly used as answer choices.</p>',
            keyTerms: ['Tuskegee', 'Milgram', 'Stanford Prison Experiment', 'Little Albert', 'Belmont Report']
        }
    ],
    aiCoda: {
        teaser: 'A modern extension: applying Belmont when AI research affects people',
        content: '<p><strong>Reflective extension (not a settled EPPP rule):</strong> AI systems are not currently a human-subject category under the Common Rule. The exam-relevant question is usually whether an AI study obtains information or biospecimens through intervention or interaction with living individuals, uses identifiable private information, or otherwise falls under applicable oversight.</p>' +
            '<p>Belmont remains useful when AI research affects people: <strong>Respect for Persons</strong> asks whether consent and explanation are understandable and voluntary; <strong>Beneficence</strong> asks researchers to minimize privacy, discrimination, psychological, and other foreseeable risks; <strong>Justice</strong> asks whether data collection and system errors burden some communities while benefits flow elsewhere.</p>' +
            '<p>Researchers should distinguish philosophical questions about possible machine moral status from current human-subject protections. Those philosophical questions are unsettled and should not be presented as established regulation or psychological fact.</p>',
        studyNote: 'ðŸ’¡ <strong>Study Note:</strong> (1) Belmont = Respect for Persons, Beneficence, Justice. (2) Obtain any required institutional or IRB determination before research begins. (3) Deception requires significant value, no feasible nondeceptive alternative, and no deception about risks likely to affect willingness to participate; debrief promptly. (4) For child research, distinguish parental permission from child assent and follow the IRB\'s findings. (5) Publication credit follows contribution; dissertation-based articles ordinarily give principal credit to the student when substantially based on the student\'s work.'
    },
    references: [
        'American Psychological Association. (2017). <em>Ethical principles of psychologists and code of conduct</em>. APA.',
        'Bersoff, D. N. (2008). <em>Ethical conflicts in psychology</em> (4th ed.). American Psychological Association.',
        'Milgram, S. (1963). Behavioral study of obedience. <em>Journal of Abnormal and Social Psychology, 67</em>(4), 371\u2013378.',
        'National Commission for the Protection of Human Subjects of Biomedical and Behavioral Research. (1979). <em>The Belmont Report: Ethical principles and guidelines for the protection of human subjects of research</em>. U.S. Department of Health and Human Services.',
        'Sales, B. D., & Folkman, S. (Eds.). (2000). <em>Ethics in research with human participants</em>. American Psychological Association.',
        'U.S. Department of Health and Human Services. (2009). <em>Code of Federal Regulations, Title 45, Part 46: Protection of Human Subjects</em>.',
        'Zimbardo, P. G. (2007). <em>The Lucifer Effect: Understanding how good people turn evil</em>. Random House.'
    ]
});
