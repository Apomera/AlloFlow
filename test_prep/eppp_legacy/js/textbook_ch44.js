/* ============================================================
   PasstheEPPP â€” Textbook Ch 44: Ethics in Research
   Domain: Research Methods & Statistics (7% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-44',
    domain: 'Research Methods & Statistics',
    domainNumber: 8,
    title: 'Ethics in Research',
    examWeight: '7%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Research ethics questions appear on both the Ethics and Research Methods sections of the EPPP. You must know the key ethical documents, IRB requirements, and rules around deception, informed consent, and data management.</p>'
        },
        {
            heading: 'Foundational Documents',
            content: '<p><strong>Belmont Report (1979)</strong> \u2014 Three core principles:</p>' +
                '<ol>' +
                '<li><strong>Respect for Persons</strong>: Autonomy + protection of vulnerable individuals. Requires <strong>informed consent</strong>.</li>' +
                '<li><strong>Beneficence</strong>: Maximize benefits, minimize risks. Requires <strong>risk-benefit analysis</strong>.</li>' +
                '<li><strong>Justice</strong>: Fair distribution of research burdens and benefits. No exploitation of vulnerable populations.</li>' +
                '</ol>' +
                '<p><strong>Historical catalysts:</strong></p>' +
                '<ul>' +
                '<li><strong>Nuremberg Code (1947)</strong>: First international code of research ethics. Voluntary consent is essential.</li>' +
                '<li><strong>U.S. Public Health Service Syphilis Study at Tuskegee (1932\u20131972)</strong>: Researchers withheld adequate disclosure and treatment from Black men. Public exposure of the study was one major catalyst for the 1974 National Research Act, which created the National Commission that later issued the Belmont Report.</li>' +
                '<li><strong>Declaration of Helsinki (1964)</strong>: WMA guidelines for medical research. Updated regularly.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Belmont = Respect for Persons, Beneficence, and Justice. Connect Tuskegee to the National Research Act and National Commission rather than treating the study as the sole or direct author of Belmont. The Nuremberg Code emphasizes voluntary consent.</p>',
            keyTerms: ['Belmont Report', 'Respect for Persons', 'Beneficence', 'Justice', 'Nuremberg Code', 'Tuskegee', 'Declaration of Helsinki'],
            knowledgeCheck: {
                question: 'A researcher designs a study that selectively recruits low-income participants because they are easier to recruit and less likely to refuse. The study involves moderate risk. This practice MOST violates which Belmont Report principle?',
                options: [
                    'Respect for Persons \u2014 failure to obtain informed consent',
                    'Beneficence \u2014 failure to minimize risks',
                    'Justice \u2014 unfair distribution of research burdens on a vulnerable population',
                    'Fidelity \u2014 failure to maintain professional relationships'
                ],
                answer: 2,
                rationale: 'Justice requires that the burdens and benefits of research be fairly distributed. Selectively recruiting low-income participants because they are \"easier\" exploits a vulnerable population \u2014 they bear the risks while the benefits (new treatments, knowledge) may primarily serve other groups. This was exactly the problem with the Tuskegee study: Black men bore all the risk while benefiting not at all. Fidelity is an APA principle, not a Belmont Report principle. For the EPPP: Belmont = Respect, Beneficence, Justice. Justice = fair distribution of burdens and benefits.'
            }
        },
        {
            heading: 'APA Ethics Code Standard 8: Research',
            content: '<p><strong>Key standards for research:</strong></p>' +
                '<ul>' +
                '<li><strong>8.01 Institutional Approval</strong>: When institutional approval is required, provide accurate information, obtain approval before conducting the research, and follow the approved protocol.</li>' +
                '<li><strong>8.02 Informed Consent</strong>: Participants must understand purpose, procedures, risks, benefits, right to withdraw, limits of confidentiality</li>' +
                '<li><strong>8.03 Consent for Recording</strong>: Get permission before recording voices or images</li>' +
                '<li><strong>8.04 Client/Patient Participants</strong>: When patients are research participants, clarify that declining won\u2019t affect their treatment</li>' +
                '<li><strong>8.05 Dispensing with Informed Consent</strong>: Dispense only where research is not reasonably assumed to create distress or harm and fits specified low-risk educational, anonymous-questionnaire, naturalistic-observation, archival, or organizational categories with required confidentiality protections, or where law or regulation permits it.</li>' +
                '<li><strong>8.06 Offering Inducements</strong>: Compensation is acceptable but shouldn\u2019t be so excessive as to be coercive</li>' +
                '<li><strong>8.07 Deception</strong>: Use only when justified by significant prospective scientific, educational, or applied value and effective nondeceptive alternatives are not feasible. Never deceive about research reasonably expected to cause physical pain or severe emotional distress; explain the deception as early as feasible and no later than the end of data collection, and permit withdrawal of data.</li>' +
                '<li><strong>8.08 Debriefing</strong>: Promptly offer appropriate information about the nature, results, and conclusions, correct known misconceptions, minimize risk if debriefing is delayed for scientific or humane reasons, and take reasonable steps to reduce harm.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Deception is permitted only under the safeguards in 8.07 and requires timely explanation. Consent is not automatically waived merely because a survey is anonymous or an observation is naturalistic; all 8.05 conditions or applicable law must be satisfied. Protect clients and patients from adverse consequences of declining or withdrawing.</p>',
            keyTerms: ['IRB', 'Informed consent', 'Deception', 'Debriefing', 'Standard 8', 'Inducements', 'Dispensing with consent'],
            expandableCase: {
                title: 'The Deception Dilemma: When Milgram Meets the IRB',
                clinicalDescription: 'A modern researcher proposes replicating Milgram\'s obedience study. Participants would be told they are administering real shocks (deception). The researcher argues this is the only way to study true obedience. The IRB must decide whether to approve.',
                diagnosis: 'APA Standard 8.07 \u2014 Deception in Research',
                explanation: 'APA Standard 8.07 requires significant prospective value and infeasibility of effective nondeceptive alternatives, and prohibits deception about research reasonably expected to cause physical pain or severe emotional distress. A direct Milgram-style replication raises serious problems under that rule and under IRB risk-benefit review; the code alone does not justify predicting what every IRB would decide. If deception is used, it must be explained as early as feasible and no later than the end of data collection, with an opportunity to withdraw the data. Debriefing under 8.08 also requires appropriate information, correction of misconceptions, and steps to reduce harm.'
            }
        },
        {
            heading: 'IRB Process, Data Management & Reproducibility',
            content: '<p><strong>Institutional Review Board (IRB):</strong></p>' +
                '<table>' +
                '<tr><th>Review Level</th><th>Criteria</th></tr>' +
                '<tr><td><strong>Exempt</strong></td><td>Must fit a regulatory exemption category and its conditions. Institutional determination procedures still apply, and some exempt research requires limited IRB review.</td></tr>' +
                '<tr><td><strong>Expedited</strong></td><td>Available for specified categories of no-more-than-minimal-risk research and certain minor changes; review is conducted by the chair or one or more experienced reviewers designated by the chair.</td></tr>' +
                '<tr><td><strong>Convened IRB</strong></td><td>Used when research does not qualify for exemption or expedited review, including research presenting greater than minimal risk.</td></tr>' +
                '</table>' +
                '<p><strong>Vulnerable populations</strong> requiring extra protections: children, prisoners, pregnant women, individuals with intellectual disabilities, economically disadvantaged persons.</p>' +
                '<p><strong>Reproducibility crisis:</strong></p>' +
                '<ul>' +
                '<li>Many published psychological findings fail to replicate</li>' +
                '<li><strong>p-hacking</strong>: Manipulating analyses until p < .05 (running many tests, selectively reporting)</li>' +
                '<li><strong>HARKing</strong>: Hypothesizing After Results are Known (presenting post-hoc hypotheses as a priori)</li>' +
                '<li><strong>Preregistration or Registered Reports</strong>: Time-stamp hypotheses and analysis plans or obtain review before results are known. These practices help distinguish confirmatory from exploratory work and reduce undisclosed analytic flexibility; they do not by themselves eliminate bias or guarantee reproducibility.</li>' +
                '<li><strong>Open science</strong>: Sharing data, materials, and code for transparency and replicability</li>' +
                '</ul>' +
                '<p><strong>Data management:</strong> The APA Ethics Code does not impose one universal five-year retention period. Plan retention and destruction around applicable law, institutional and sponsor rules, consent promises, confidentiality, repository or journal policy, and legitimate verification needs.</p>' +
                '<p><strong>EPPP Tip:</strong> Exempt, expedited, and convened review are regulatory pathways with category and risk criteria, not merely faster or slower labels. Preregistration can reduce undisclosed flexibility, while HARKing presents post-hoc hypotheses as if they were planned. Determine data retention from the governing requirements rather than memorizing a universal five-year APA rule.</p>',
            keyTerms: ['IRB', 'Exempt', 'Expedited', 'Full board', 'Vulnerable populations', 'p-hacking', 'HARKing', 'Pre-registration', 'Reproducibility', 'Open science'],
            knowledgeCheck: {
                question: 'A researcher runs 20 statistical tests on their data. Only one reaches p < .05, which they report as the primary finding. They do not mention the other 19 tests. This practice is called:',
                options: [
                    'HARKing \u2014 hypothesizing after results are known',
                    'p-hacking \u2014 selectively reporting significant results from multiple analyses',
                    'Publication bias \u2014 journals refusing to publish null results',
                    'Pre-registration \u2014 declaring analyses in advance'
                ],
                answer: 1,
                rationale: 'Option B is best: selecting the lone significant result while concealing the other analyses is selective reporting associated with p-hacking. If all 20 tests concerned true nulls and met the relevant probability assumptions, the expected number below .05 would be 20 \u00d7 .05 = 1, but that expectation does not guarantee exactly one result in a realized study. HARKing instead presents a hypothesis formed after seeing results as though it were specified in advance. Preregistration or Registered Reports can make the planned-versus-exploratory distinction visible, but no single practice is a complete solution to bias or irreproducibility.'
            }
        }
    ],
    aiCoda: {
        teaser: 'The IRB application nobody has written \u2014 who reviews research on AI?',
        content: '<p>Human-subjects oversight in AI research turns on who the participants or identifiable data subjects are and what an intervention collects or changes. Using an AI tool does not remove duties to protect people whose behavior, records, work, or communities are studied.</p>' +
            '<p>Researchers should also examine bystander and downstream effects: an AI study can expose sensitive data, influence decisions, distribute burdens unevenly, or affect people who never interact directly with the system. Belmont principles remain useful for analyzing those human impacts without making unsupported claims about machine personhood.</p>' +
            '<p>For claims about AI behavior, preregistered criteria, documented prompts and model versions, representative sampling, robustness checks, and transparent reporting can improve interpretability. These practices reduce some flexibility but do not guarantee a valid construct or an unbiased conclusion.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> Belmont: Respect for Persons, Beneficence, Justice. Tuskegee was a major catalyst for the National Research Act and the Commission that produced Belmont. Deception requires prospective value, no feasible effective nondeceptive alternative, no deception about expected pain or severe distress, timely explanation, and data-withdrawal opportunity. Consent waivers and exempt or expedited review require all applicable conditions. No universal APA five-year data-retention rule applies. Preregistration supports transparency but is not a complete cure.'
    },
    references: [
        'American Psychological Association. (2017, with amendments effective 2010 and 2017). <em>Ethical Principles of Psychologists and Code of Conduct</em>, Standards 8.01\u20138.08.',
        'National Commission for the Protection of Human Subjects of Biomedical and Behavioral Research. (1979). <em>The Belmont Report</em>.',
        'Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. <em>Science, 349</em>(6251), aac4716.',
        'U.S. Department of Health and Human Services. <em>45 CFR 46, Subpart A: Federal Policy for the Protection of Human Subjects</em>.',
        'Center for Open Science. <em>Registered Reports</em>.'
    ]
});
