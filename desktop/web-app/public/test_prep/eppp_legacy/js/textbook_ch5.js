/* ============================================================
   PasstheEPPP — Textbook Ch 5: Clinical Interviewing & DSM-5-TR
   Domain: Assessment & Diagnosis (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-5',
    domain: 'Assessment & Diagnosis',
    domainNumber: 1,
    title: 'Clinical Interviewing & DSM-5-TR Diagnosis',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Clinical interviewing is widely used, but format and scope differ across clinical, forensic, school, health, research, and consultation roles. Interview data should be integrated with records, observation, collateral information, measures, and medical evaluation when indicated. The EPPP tests your knowledge of interview formats, the Mental Status Exam, DSM-5-TR organization, differential diagnosis logic, and the cultural formulation framework. This chapter is the bridge between assessment tools and clinical decision-making.</p>'
        },
        {
            heading: 'Types of Clinical Interviews',
            content: '<p><strong>Three levels of structure:</strong></p>' +
                '<table>' +
                '<tr><th>Format</th><th>Description</th><th>Strengths</th><th>Limitations</th></tr>' +
                '<tr><td><strong>Unstructured</strong></td><td>Topics and wording are not standardized; the interviewer follows a flexible clinical approach</td><td>Flexible, builds rapport, can explore unexpected areas</td><td>Reliability and coverage may be lower, and bias or omitted domains can affect conclusions</td></tr>' +
                '<tr><td><strong>Semi-Structured</strong></td><td>Standardized domains, prompts, anchors, or algorithms with defined opportunities for clarification and clinical judgment</td><td>Can improve consistency while supporting clarification; appropriateness depends on purpose and evidence</td><td>Requires training; longer to administer</td></tr>' +
                '<tr><td><strong>Structured</strong></td><td>Highly standardized questions, sequence, coding, and decision rules; permitted clarification depends on the instrument</td><td>Can improve inter-rater reliability when well designed, trained, and used with the intended population</td><td>Rigid; can feel impersonal; misses nuance</td></tr>' +
                '</table>' +
                '<p><strong>Key Semi-Structured Interviews for the EPPP:</strong></p>' +
                '<ul>' +
                '<li><strong>SCID-5-CV</strong> (Structured Clinical Interview for DSM-5, Clinician Version): A modular clinician-administered interview for selected DSM-5 diagnoses; use requires the appropriate version, training, and current manual</li>' +
                '<li><strong>SCID-5-PD</strong>: Personality Disorders version</li>' +
                '<li><strong>SCID-5-AMPD</strong>: Alternative Model for Personality Disorders</li>' +
                '<li><strong>MINI</strong> (Mini International Neuropsychiatric Interview): A brief structured diagnostic interview; suitability depends on version, setting, population, and purpose</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The SCID is <em>semi-structured</em>, not fully structured. It allows clinical judgment in rating symptoms as present, subthreshold, or absent. Do not choose structure level by slogan. Match the instrument\u2019s validation, coverage, language, population, setting, time, and decision consequences to the referral question.</p>',
            keyTerms: ['Unstructured interview', 'Semi-structured interview', 'Structured interview', 'SCID-5', 'MINI', 'Inter-rater reliability'],
            knowledgeCheck: {
                question: 'A research clinic wants to ensure the highest possible inter-rater reliability when screening participants for a clinical trial on Major Depressive Disorder. Which interview format should they use?',
                options: [
                    'Unstructured Clinical Interview',
                    'Semi-structured Clinical Interview',
                    'Structured Clinical Interview',
                    'Behavioral Interview'
                ],
                answer: 2,
                rationale: 'A highly structured interview can reduce interviewer variation and support reliability in a trial when validated for the population and purpose. Reliability still depends on training, coding rules, base rates, information quality, and implementation; structure alone does not guarantee accuracy.'
            }
        },
        {
            heading: 'The Mental Status Exam (MSE)',
            content: '<p>The MSE is a <strong>systematic observation of the patient\u2019s current mental functioning</strong> at the time of the interview. It is a structured description of current presentation and functioning\u2014not a diagnosis, capacity determination, or substitute for history, physical/neurologic evaluation, collateral data, or longitudinal observation.</p>' +
                '<p><strong>Components (use the mnemonic ABC STAMP LICKER):</strong></p>' +
                '<table>' +
                '<tr><th>Component</th><th>What Is Assessed</th><th>Key Terms</th></tr>' +
                '<tr><td><strong>Appearance</strong></td><td>Dress, grooming, hygiene, physical characteristics, apparent vs. stated age</td><td>Disheveled, well-groomed, malodorous</td></tr>' +
                '<tr><td><strong>Behavior</strong></td><td>Psychomotor activity, eye contact, gait, posture, mannerisms, attitude toward examiner</td><td>Agitation, retardation, cooperative, guarded, hostile</td></tr>' +
                '<tr><td><strong>Cognition</strong></td><td>Orientation (person, place, time, situation), attention, concentration, memory, abstract reasoning</td><td>Alert and oriented \u00d74 (A&O\u00d74)</td></tr>' +
                '<tr><td><strong>Speech</strong></td><td>Rate, rhythm, volume, tone, fluency, articulation</td><td>Pressured, slow, monotone, stuttering</td></tr>' +
                '<tr><td><strong>Thought Process</strong></td><td>How the person thinks: organization and flow of ideas</td><td>Linear, tangential, circumstantial, flight of ideas, loose associations, thought blocking, perseveration, clang associations, word salad</td></tr>' +
                '<tr><td><strong>Thought Content</strong></td><td>What the person thinks: specific ideation</td><td>Delusions (paranoid, grandiose, referential, somatic), obsessions, phobias, suicidal ideation (SI), homicidal ideation (HI)</td></tr>' +
                '<tr><td><strong>Affect</strong></td><td>Clinician-described emotional expression, interpreted with cultural, neurological, situational, medication, communication, and individual context</td><td>Flat, blunted, constricted, full, labile, inappropriate, congruent/incongruent with mood</td></tr>' +
                '<tr><td><strong>Mood</strong></td><td>Person\u2019s reported prevailing emotional experience, supplemented by context and longitudinal information</td><td>Dysphoric, euphoric, anxious, euthymic, irritable</td></tr>' +
                '<tr><td><strong>Perception</strong></td><td>Sensory disturbances</td><td>Hallucinations (auditory, visual, olfactory, tactile, gustatory), illusions, depersonalization, derealization</td></tr>' +
                '<tr><td><strong>Insight</strong></td><td>Understanding of own condition</td><td>Good, fair, poor, absent</td></tr>' +
                '<tr><td><strong>Judgment</strong></td><td>Ability to make sound decisions</td><td>Good, fair, poor, impaired</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> The critical distinction: Mood is primarily reported experience; affect is clinician-described expression. \u201cObserved\u201d does not mean bias-free or culturally universal. A patient can report euthymic mood while displaying blunted affect. When they don\u2019t match, it\u2019s called <strong>mood-affect incongruence</strong>.</p>',
            keyTerms: ['MSE', 'Mood', 'Affect', 'Thought process', 'Thought content', 'Insight', 'Judgment', 'Orientation', 'Psychomotor', 'Tangential', 'Circumstantial', 'Flight of ideas'],
            expandableCase: {
                title: 'Mood vs. Affect',
                clinicalDescription: 'During an intake evaluation, a patient states, "I am feeling absolutely wonderful today, everything is going my way." However, the clinician notes that the patient sits with slumped shoulders, makes no eye contact, and speaks in a slow, monotonous, crying tone.',
                diagnosis: 'Reported Mood and Observed Affect Differ',
                explanation: 'The person reports a positive mood while the clinician describes constricted or dysphoric-appearing affect. Record both without assuming deception or a diagnosis. Clarify meaning, baseline, culture, neurological and medical factors, medications, context, and whether the expression is congruent with the topics discussed.'
            }
        },
        {
            heading: 'DSM-5-TR Organization',
            content: '<p>The DSM-5-TR (American Psychiatric Association, 2022) is organized into <strong>three sections</strong>:</p>' +
                '<table>' +
                '<tr><th>Section</th><th>Content</th></tr>' +
                '<tr><td><strong>Section I</strong></td><td>Introduction, use of the manual, cautionary statement</td></tr>' +
                '<tr><td><strong>Section II</strong></td><td>Diagnostic criteria and codes \u2014 the 20 major diagnostic chapters</td></tr>' +
                '<tr><td><strong>Section III</strong></td><td>Emerging measures, cultural formulation, Alternative Model for Personality Disorders (AMPD), conditions for further study</td></tr>' +
                '</table>' +
                '<p><strong>Chapter ordering follows a developmental lifespan sequence:</strong></p>' +
                '<ol>' +
                '<li>Neurodevelopmental Disorders (ASD, ADHD, ID, LD, Tics)</li>' +
                '<li>Schizophrenia Spectrum & Other Psychotic Disorders</li>' +
                '<li>Bipolar and Related Disorders</li>' +
                '<li>Depressive Disorders</li>' +
                '<li>Anxiety Disorders</li>' +
                '<li>Obsessive-Compulsive and Related Disorders</li>' +
                '<li>Trauma- and Stressor-Related Disorders</li>' +
                '<li>Dissociative Disorders</li>' +
                '<li>Somatic Symptom and Related Disorders</li>' +
                '<li>Feeding and Eating Disorders</li>' +
                '<li>Elimination Disorders</li>' +
                '<li>Sleep-Wake Disorders</li>' +
                '<li>Sexual Dysfunctions</li>' +
                '<li>Gender Dysphoria</li>' +
                '<li>Disruptive, Impulse-Control, and Conduct Disorders</li>' +
                '<li>Substance-Related and Addictive Disorders</li>' +
                '<li>Neurocognitive Disorders (Delirium, Major/Mild NCD)</li>' +
                '<li>Personality Disorders</li>' +
                '<li>Paraphilic Disorders</li>' +
                '<li>Other Conditions That May Be a Focus of Clinical Attention (Z-codes)</li>' +
                '</ol>' +
                '<p><strong>Key changes from DSM-IV-TR to DSM-5/DSM-5-TR:</strong></p>' +
                '<ul>' +
                '<li><strong>Multiaxial system eliminated</strong> \u2014 no more Axes I-V; all disorders listed together</li>' +
                '<li>Uses <strong>ICD-10-CM codes</strong> for billing and data collection</li>' +
                '<li>Personality disorders and medical conditions are now listed alongside other disorders (not separate axes)</li>' +
                '<li>DSM-5-TR (2022) updated descriptive text, added prolonged grief disorder, added or revised selected categories and codes, and extensively updated text; consult current APA update supplements because DSM-5-TR receives post-publication changes</li>' +
                '</ul>',
            keyTerms: ['DSM-5-TR', 'Section I', 'Section II', 'Section III', 'Multiaxial system', 'ICD-10-CM', 'Developmental ordering']
        },
        {
            heading: 'Specifiers, Severity, and Course',
            content: '<p>DSM-5-TR diagnoses are refined using <strong>specifiers</strong> that provide additional clinical information:</p>' +
                '<ul>' +
                '<li><strong>Severity:</strong> Mild, Moderate, Severe (based on criteria count, symptom intensity, or functional impairment)</li>' +
                '<li><strong>Course:</strong> First episode, recurrent, in partial remission, in full remission</li>' +
                '<li><strong>Descriptive features:</strong> "With anxious distress," "with mixed features," "with psychotic features," "with peripartum onset," "with seasonal pattern"</li>' +
                '</ul>' +
                '<p><strong>Example for Major Depressive Disorder:</strong></p>' +
                '<p><code>F32.1 Major Depressive Disorder, single episode, moderate, with anxious distress</code></p>' +
                '<p><strong>EPPP Tip:</strong> Specifiers communicate clinically relevant features but do not prescribe treatment by themselves. Treatment planning also requires severity, safety, course, differential diagnosis, medical factors, evidence, preferences, access, and monitoring.</p>',
            keyTerms: ['Specifiers', 'Severity', 'Course', 'Remission', 'With anxious distress', 'With psychotic features', 'Seasonal pattern']
        },
        {
            heading: 'Z-Codes: Other Conditions That May Be a Focus of Clinical Attention',
            content: '<p><strong>Z-codes</strong> (formerly V-codes in DSM-IV) are used for conditions that are <em>not mental disorders</em> but may affect diagnosis, treatment, or prognosis.</p>' +
                '<p><strong>Key categories:</strong></p>' +
                '<ul>' +
                '<li><strong>Relational problems:</strong> Relationship distress with spouse/partner, parent-child relational problem, sibling relational problem</li>' +
                '<li><strong>Abuse and neglect:</strong> Maltreatment, neglect, and related encounter/context codes require current ICD-10-CM coding guidance; do not assume every such condition is a Z-code or a trauma-disorder diagnosis</li>' +
                '<li><strong>Educational and occupational problems:</strong> Academic problems, job dissatisfaction</li>' +
                '<li><strong>Housing and economic problems:</strong> Homelessness, financial problems</li>' +
                '<li><strong>Social environment:</strong> Social exclusion, target of discrimination</li>' +
                '<li><strong>Nonadherence to medical treatment</strong></li>' +
                '<li><strong>Malingering:</strong> Z76.5 \u2014 Not a mental disorder; a condition warranting clinical attention</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Factors influencing health status or contact can be the principal focus even without a mental disorder. Malingering is not a mental disorder, but coding and documentation should follow current ICD-10-CM and setting rules.</p>',
            keyTerms: ['Z-codes', 'V-codes', 'Malingering', 'Relational problems', 'Conditions of clinical attention']
        },
        {
            heading: 'Differential Diagnosis',
            content: '<p>Differential diagnosis is the <strong>systematic process of distinguishing between disorders with overlapping symptoms</strong>. The EPPP frequently tests this skill.</p>' +
                '<p><strong>Parallel, iterative differential diagnosis tasks:</strong></p>' +
                '<ol>' +
                '<li><strong>Assess information and response validity when indicated</strong>\u2014avoid assuming that inconsistency means intentional deception; factitious disorder and malingering differ in motivation and can coexist with genuine illness</li>' +
                '<li><strong>Assess substances and medications</strong>\u2014exposure, dose, timing, interactions, intoxication, withdrawal, and persistence outside exposure windows</li>' +
                '<li><strong>Assess medical and neurological explanations</strong>\u2014urgent onset, altered attention/awareness, vital-sign or neurological change, injury, infection, metabolic disturbance, sleep, pain, and other indicated data</li>' +
                '<li><strong>Evaluate mental-disorder hypotheses</strong>\u2014criteria, duration, impairment, exclusion rules, development, culture/language, course, and context</li>' +
                '<li><strong>Allow co-occurring and interacting conditions</strong>\u2014do not force one \u201cprimary\u201d explanation when multiple diagnoses or contextual conditions are supported</li>' +
                '</ol>' +
                '<p><strong>High-yield differential diagnosis pairs for the EPPP:</strong></p>' +
                '<table>' +
                '<tr><th>This vs. That</th><th>Key Distinguisher</th></tr>' +
                '<tr><td>MDD vs. Bipolar II</td><td>Bipolar II requires at least one hypomanic episode and at least one major depressive episode, no manic episode, plus the full criteria and exclusion analysis</td></tr>' +
                '<tr><td>Schizophrenia vs. Schizoaffective</td><td>Schizoaffective has major mood episodes concurrent with psychotic symptoms, plus psychosis WITHOUT mood symptoms for \u22652 weeks</td></tr>' +
                '<tr><td>GAD vs. OCD</td><td>GAD and OCD differ in phenomenology, functions, associated behaviors, time course, and criteria; real-life content or insight alone does not decide the diagnosis</td></tr>' +
                '<tr><td>PTSD vs. Acute Stress Disorder</td><td>Duration: ASD = 3 days to 1 month; PTSD = >1 month</td></tr>' +
                '<tr><td>Delirium vs. Dementia (Major NCD)</td><td>Delirium centers on acute disturbance in attention and awareness with fluctuation and another physiological cause; major NCD is typically more persistent, but onset and fluctuation vary by etiology and can coexist with delirium</td></tr>' +
                '<tr><td>Panic Disorder vs. GAD</td><td>Panic = sudden, discrete attacks; GAD = chronic, pervasive worry</td></tr>' +
                '<tr><td>Anorexia vs. Bulimia</td><td>Anorexia nervosa requires significantly low weight and may include binge/purge behavior; bulimia nervosa requires recurrent binge eating and compensatory behavior not occurring exclusively during anorexia\u2014body weight is not otherwise fixed</td></tr>' +
                '</table>',
            keyTerms: ['Differential diagnosis', 'Rule out', 'Comorbidity', 'Substance-induced', 'Medical condition'],
            interactiveDiagram: {
                description: 'Differential Diagnosis Hierarchy',
                svg: '<svg viewBox="0 0 920 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ddTitle ddDesc"><title id="ddTitle">Parallel differential diagnosis hypothesis map</title><desc id="ddDesc">Assessment begins with immediate safety and medical urgency, then develops parallel hypotheses concerning medical or neurologic conditions, substances and medications, mental disorders, response style, development and cognition, and cultural or contextual explanations. Data are gathered iteratively and multiple conditions may coexist.</desc><rect width="920" height="430" rx="24" fill="#f8fafc"/><text x="460" y="38" text-anchor="middle" font-family="system-ui" font-size="23" font-weight="700" fill="#172554">Differential diagnosis is iterative\u2014not a suspicion-first ladder</text><g font-family="system-ui"><rect x="260" y="65" width="400" height="55" rx="14" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="460" y="99" text-anchor="middle" font-size="17" font-weight="700" fill="#991b1b">Triage immediate safety and medical urgency</text><path d="M460 120V150" stroke="#475569" stroke-width="3"/><g transform="translate(25 155)"><rect width="205" height="95" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#1e40af">Medical / neurologic</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#1e3a8a">onset • course • exam</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#1e3a8a">labs/records when indicated</text></g><g transform="translate(245 155)"><rect width="205" height="95" rx="14" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#92400e">Substances / medicines</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#78350f">exposure • dose • timing</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#78350f">intoxication • withdrawal</text></g><g transform="translate(465 155)"><rect width="205" height="95" rx="14" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#166534">Mental disorders</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#14532d">criteria • impairment</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#14532d">course • comorbidity</text></g><g transform="translate(685 155)"><rect width="205" height="95" rx="14" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#5b21b6">Response validity</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#4c1d95">under/over-reporting</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#4c1d95">factitious/malingering</text></g><path d="M130 270V295M350 270V295M570 270V295M790 270V295" stroke="#475569" stroke-width="2"/><rect x="85" y="295" width="750" height="65" rx="16" fill="#fff" stroke="#334155" stroke-width="3"/><text x="460" y="322" text-anchor="middle" font-size="16" font-weight="700" fill="#334155">Integrate development, cognition, culture, language, trauma, environment, collateral data</text><text x="460" y="346" text-anchor="middle" font-size="14" fill="#475569">Revise hypotheses as evidence arrives • document uncertainty • allow multiple explanations</text><path d="M460 360V382" stroke="#475569" stroke-width="3"/><rect x="245" y="382" width="430" height="35" rx="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/><text x="460" y="405" text-anchor="middle" font-size="15" font-weight="700" fill="#075985">Diagnosis + formulation + plan + monitoring</text></g></svg>'
            },
            knowledgeCheck: {
                question: 'A 45-year-old patient presents with sudden onset of visual hallucinations, confusion, and disorientation. What should the psychologist do FIRST in the differential diagnosis process?',
                options: [
                    'Diagnose Schizophrenia, late onset',
                    'Administer the MMPI-2 to assess for psychotic symptoms',
                    'Refer for medical evaluation to rule out delirium or other medical causes',
                    'Begin cognitive-behavioral therapy for psychotic symptoms'
                ],
                answer: 2,
                rationale: 'The differential diagnosis hierarchy requires ruling out medical conditions (Step 3) before diagnosing a primary mental disorder. Sudden onset of visual hallucinations with confusion is highly suggestive of delirium (a medical emergency), not schizophrenia. Medical referral is essential.'
            }
        },
        {
            heading: 'Categorical vs. Dimensional Models',
            content: '<p>This is one of the <strong>most important conceptual debates in clinical psychology</strong> and is increasingly tested on the EPPP.</p>' +
                '<table>' +
                '<tr><th>Feature</th><th>Categorical Model</th><th>Dimensional Model</th></tr>' +
                '<tr><td><strong>Concept</strong></td><td>Disorders are distinct categories \u2014 you either have it or you don\u2019t</td><td>Traits/symptoms exist on a continuum \u2014 everyone has some degree</td></tr>' +
                '<tr><td><strong>Example</strong></td><td>DSM-5-TR Section II: MDD requires 5+ symptoms</td><td>PHQ-9 score of 5 vs. 10 vs. 20 = different severity levels</td></tr>' +
                '<tr><td><strong>Strengths</strong></td><td>Clear communication, treatment protocols, research consistency</td><td>Can represent severity and subthreshold variation; effects on stigma, reliability, and utility depend on construct, measure, threshold, and implementation</td></tr>' +
                '<tr><td><strong>Limitations</strong></td><td>Arbitrary cutoffs, symptom overlap, comorbidity problem</td><td>Requires validated measures, interpretable reference points, and decisions about thresholds; practicality varies by setting</td></tr>' +
                '<tr><td><strong>Where used</strong></td><td>DSM-5-TR Section II (primary diagnoses)</td><td>DSM-5-TR Section III (AMPD), ICD-11 Personality Disorders, Level 1/2 Cross-Cutting Symptom Measures</td></tr>' +
                '</table>' +
                '<p><strong>The DSM-5-TR Alternative Model for Personality Disorders (AMPD) \u2014 Section III:</strong></p>' +
                '<ul>' +
                '<li><strong>Criterion A:</strong> Level of Personality Functioning Scale (LPFS) \u2014 rates impairment in Self (identity, self-direction) and Interpersonal (empathy, intimacy) functioning on 5 levels (0 = none to 4 = extreme)</li>' +
                '<li><strong>Criterion B:</strong> 5 pathological personality trait domains: Negative Affectivity, Detachment, Antagonism, Disinhibition, Psychoticism (with 25 trait facets)</li>' +
                '<li>Only 6 specific PDs retained: Antisocial, Avoidant, Borderline, Narcissistic, Obsessive-Compulsive, Schizotypal</li>' +
                '<li>Plus a general "Personality Disorder \u2014 Trait Specified" category</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The AMPD is in Section III, meaning it is an official alternative model in the manual\u2019s Emerging Measures and Models section, not the primary Section II categorical personality-disorder system. It is a hybrid categorical-dimensional model, not a fully dimensional replacement. However, the ICD-11 (used internationally) has adopted a fully dimensional approach to PDs. Know both systems.</p>',
            keyTerms: ['Categorical', 'Dimensional', 'AMPD', 'LPFS', 'Personality trait domains', 'Section III', 'ICD-11']
        },
        {
            heading: 'Cultural Formulation',
            content: '<p>The DSM-5-TR includes the <strong>Cultural Formulation Interview (CFI)</strong> in Section III \u2014 a 16-question semi-structured interview that helps clinicians understand the cultural context of a patient\u2019s presenting problem.</p>' +
                '<p><strong>Four core CFI domains:</strong></p>' +
                '<ol>' +
                '<li><strong>Cultural definition of the problem:</strong> the person\u2019s description, language, identity, and reference-group perspectives</li>' +
                '<li><strong>Cultural perceptions of cause, context, and support:</strong> explanatory models, stressors, supports, identity, discrimination, and meanings</li>' +
                '<li><strong>Cultural factors affecting self-coping and past help seeking:</strong> coping, barriers, resources, prior services, and what was helpful or unhelpful</li>' +
                '<li><strong>Cultural factors affecting current help seeking:</strong> preferences, concerns, relationship expectations, and services or supports the person wants now</li>' +
                '</ol>' +
                '<p><strong>Key terms:</strong></p>' +
                '<ul>' +
                '<li><strong>Cultural concepts of distress</strong> (DSM-5-TR term): Replaced "culture-bound syndromes." Includes cultural syndromes, cultural idioms of distress, and cultural explanations</li>' +
                '<li><strong>Cultural humility</strong>: Ongoing self-reflection about one\u2019s own cultural biases; supports ongoing self-reflection and attention to power; it complements, rather than replaces, demonstrable knowledge and skills for the task</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Use the CFI when cultural context may improve understanding and care\u2014not only when symptoms seem unusual or the person is from a visibly different group. The CFI enhances but does not independently determine diagnosis. Also know that DSM-5-TR uses "cultural concepts of distress" rather than the older term "culture-bound syndromes."</p>',
            keyTerms: ['CFI', 'Cultural formulation', 'Cultural concepts of distress', 'Cultural humility', 'Idioms of distress', 'Ataque de nervios'],
            knowledgeCheck: {
                question: 'When is the DSM-5-TR Cultural Formulation Interview most appropriately used?',
                options: ['Only when a patient belongs to a racial or ethnic group different from the clinician.', 'Only after standard diagnostic criteria fail to produce a diagnosis.', 'When cultural identity, meanings, stressors, supports, coping, help seeking, or clinician-patient expectations may improve assessment and care, while integrating the information with other diagnostic data.', 'As a stand-alone test that replaces the clinical interview and DSM criteria.'],
                answer: 2,
                rationale: 'Culture is relevant to every clinical encounter. The 16-question CFI elicits the person\u2019s definitions, explanations, context, supports, coping, past and current help seeking, and preferences. It supplements\u2014not replaces\u2014diagnostic assessment.'
            }
        },
        {
            heading: 'Putting It Together: The Diagnostic Process',
            content: '<p><strong>Complete diagnostic assessment flow:</strong></p>' +
                '<ol>' +
                '<li><strong>Clinical interview</strong> matched to referral question, setting, language, population, and decision stakes \u2192 presenting problem, history, psychosocial context</li>' +
                '<li><strong>Mental Status Exam</strong> \u2192 current functioning snapshot</li>' +
                '<li><strong>Psychological testing</strong> (if indicated) \u2192 cognitive, personality, or neurocognitive measures</li>' +
                '<li><strong>Cultural formulation</strong> \u2192 context for understanding symptoms</li>' +
                '<li><strong>Differential diagnosis</strong> \u2192 iterative comparison of medical, substance/medication, developmental, cultural/contextual, response-validity, and mental-disorder hypotheses</li>' +
                '<li><strong>Diagnosis + specifiers</strong> \u2192 ICD-10-CM coded</li>' +
                '<li><strong>Case conceptualization</strong> \u2192 integrates all data into a coherent formulation guiding treatment</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> The diagnostic process is <em>hypothesis-driven</em>. You generate hypotheses from the interview, test them with additional data (tests, records, collateral), and revise as evidence arrives, retain uncertainty where warranted, and allow multiple interacting explanations rather than forcing parsimony. This is the scientist-practitioner model applied to diagnosis.</p>',
            keyTerms: ['Diagnostic process', 'Case conceptualization', 'Hypothesis-driven', 'Multimethod assessment']
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: AI can organize diagnostic information but should not impersonate diagnosis',
        content: '<p><strong>Reflective extension:</strong> DSM diagnoses apply to people in clinical and cultural context. Applying a Mental Status Exam or psychiatric diagnosis to an AI system is a category error and does not illuminate either machine behavior or human psychopathology.</p>' +
            '<p>AI may help structure history, summarize records, prompt missing domains, or generate hypotheses, but it can amplify biased documentation, miss medical urgency, confuse correlation with criteria, and produce confident unsupported codes. Diagnostic responsibility requires informed consent, qualified judgment, current criteria and coding, cultural formulation, corroboration, differential diagnosis, and attention to consequences.</p>' +
            '<p>A safe tool communicates uncertainty, shows the evidence behind each hypothesis, separates observations from inference, flags urgent human review, and never treats a screening score or generated narrative as a diagnosis.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> Mood is reported experience; affect is clinician-described expression, not a bias-free objective fact. Differential diagnosis is parallel and iterative\u2014not a fixed malingering-first ladder. The CFI\u2019s four domains concern definition of the problem; cause/context/support; coping and past help seeking; and current help seeking. AMPD is an official Section III alternative model, not the primary Section II system.'
    },
    references: [
        'American Psychiatric Association. (2022). <em>Diagnostic and statistical manual of mental disorders</em> (5th ed., text rev.). APA.',
        'First, M. B., Williams, J. B. W., Karg, R. S., & Spitzer, R. L. (2016). <em>Structured Clinical Interview for DSM-5 Disorders, Clinician Version (SCID-5-CV)</em>. American Psychiatric Association.',
        'Folstein, M. F., Folstein, S. E., & McHugh, P. R. (1975). "Mini-mental state": A practical method for grading the cognitive state of patients for the clinician. <em>Journal of Psychiatric Research, 12</em>(3), 189\u2013198.',
        'Krueger, R. F., Derringer, J., Markon, K. E., Watson, D., & Skodol, A. E. (2012). Initial construction of a maladaptive personality trait model and inventory for DSM-5. <em>Psychological Medicine, 42</em>(9), 1879\u20131890.',
        'Lewis-Fern\u00e1ndez, R., Aggarwal, N. K., B\u00e4arnhielm, S., Rohlof, H., Kirmayer, L. J., Weiss, M. G., ... & Lu, F. (2014). Culture and psychiatric evaluation: Operationalizing cultural formulation for DSM-5. <em>Psychiatry, 77</em>(2), 130\u2013154.',
        'Sheehan, D. V., Lecrubier, Y., Sheehan, K. H., Amorim, P., Janavs, J., Weiller, E., ... & Dunbar, G. C. (1998). The Mini-International Neuropsychiatric Interview (M.I.N.I.): The development and validation of a structured diagnostic psychiatric interview for DSM-IV and ICD-10. <em>Journal of Clinical Psychiatry, 59</em>(Suppl 20), 22\u201333.',
        'Widiger, T. A., & Samuel, D. B. (2005). Diagnostic categories or dimensions? A question for the <em>Diagnostic and Statistical Manual of Mental Disorders\u2014Fifth Edition</em>. <em>Journal of Abnormal Psychology, 114</em>(4), 494\u2013504.',
        'World Health Organization. (2019). <em>International statistical classification of diseases and related health problems</em> (11th ed.). WHO.'
    ]
});
