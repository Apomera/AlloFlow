/* ============================================================
   PasstheEPPP — Textbook Ch 18: Crisis Intervention & Trauma Treatment
   Domain: Treatment, Intervention & Prevention (15% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-18',
    domain: 'Treatment, Intervention & Prevention',
    domainNumber: 3,
    title: 'Crisis Intervention & Trauma Treatment',
    examWeight: '15%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Crisis and trauma questions require prioritized, context-sensitive reasoning about <strong>suicide risk assessment</strong> (risk/protective factors, safety planning), <strong>crisis intervention models</strong>, and the evidence-based treatments for PTSD (Prolonged Exposure, CPT, EMDR). The exam will present crisis scenarios and ask you to identify the appropriate immediate response.</p>'
        },
        {
            heading: 'Crisis Theory and Intervention',
            content: '<p><strong>Crisis</strong>: A time-limited period of psychological disequilibrium triggered by an event that overwhelms the individual\u2019s usual coping mechanisms.</p>' +
                '<p><strong>Key principles of crisis intervention:</strong></p>' +
                '<ul>' +
                '<li><strong>Here-and-now focus</strong>: Prioritize immediate safety, stabilization, practical needs, and the precipitating problem while recognizing relevant medical, psychiatric, developmental, cultural, and systemic context</li>' +
                '<li><strong>Time-limited</strong>: Often brief, but duration and intensity follow risk, setting, needs, response, resources, and continuity of care rather than a universal session range</li>' +
                '<li><strong>Active & directive</strong>: The clinician may be more active and structured when needed while preserving collaboration, autonomy, accessibility, and trauma-informed care</li>' +
                '<li><strong>Goal</strong>: Promote safety, stabilization, effective coping, connection, and appropriate follow-up; \u201creturn to baseline\u201d may be unrealistic or undesirable after loss, disability, or ongoing danger.</li>' +
                '</ul>' +
                '<p><strong>Caplan\u2019s Crisis Phases:</strong></p>' +
                '<ol>' +
                '<li>Initial rise in tension; usual coping attempted</li>' +
                '<li>Coping fails; tension increases further</li>' +
                '<li>Emergency resources mobilized; novel problem-solving attempted</li>' +
                '<li>If still unresolved \u2192 active crisis state (disorganization, cognitive narrowing)</li>' +
                '</ol>' +
                '<p><strong>Roberts\u2019 Seven-Stage Crisis Intervention Model:</strong></p>' +
                '<ol>' +
                '<li>Biopsychosocial and <strong>lethality assessment</strong></li>' +
                '<li>Rapidly establish <strong>rapport</strong></li>' +
                '<li>Identify the <strong>major problem</strong> (crisis precipitant)</li>' +
                '<li>Explore <strong>feelings and emotions</strong></li>' +
                '<li>Generate and explore <strong>alternatives</strong></li>' +
                '<li>Implement an <strong>action plan</strong></li>' +
                '<li>Plan <strong>follow-up</strong></li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> Immediate triage includes medical danger, suicide or violence risk, intoxication/withdrawal, abuse, environmental danger, and capacity to participate. Sequence may be simultaneous: address an active emergency while gathering only the information needed for safety.</p>',
            keyTerms: ['Crisis', 'Crisis intervention', 'Roberts model', 'Lethality assessment', 'Caplan', 'Pre-crisis functioning'],
            interactiveDiagram: {
                title: "Roberts’ Seven-Stage Crisis Framework With Concurrent Safety Triage",
                description: "Roberts’ educational framework includes biopsychosocial and crisis assessment, rapid rapport, problem definition, exploration of feelings, alternatives, an action plan, and follow-up. The stages can overlap, repeat, or change order. Medical danger, suicide or violence risk, intoxication or withdrawal, abuse, environmental danger, and capacity may require concurrent urgent action. This framework does not replace local emergency protocols, crisis-system standards, or clinical judgment.",
                svg: "<svg viewBox=\"0 0 900 455\" width=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"ch18RobertsTitle ch18RobertsDesc\"><title id=\"ch18RobertsTitle\">Roberts crisis framework with concurrent safety triage</title><desc id=\"ch18RobertsDesc\">Seven numbered cards present assessment, rapport, problem definition, feelings, alternatives, action, and follow-up. A band crossing the model states that urgent medical and safety triage can occur throughout, and a footer says stages can overlap, repeat, or change order.</desc><defs><marker id=\"ch18RobertsArrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto\"><path d=\"M0 0L10 5L0 10Z\" fill=\"#64748b\"/></marker></defs><text x=\"450\" y=\"28\" text-anchor=\"middle\" fill=\"#cbd5e1\" font-weight=\"bold\" font-size=\"18\">Roberts’ seven-stage crisis intervention framework</text><rect x=\"50\" y=\"48\" width=\"800\" height=\"48\" rx=\"12\" fill=\"#7f1d1d\" stroke=\"#f87171\" stroke-width=\"2\"/><text x=\"450\" y=\"69\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"14\">CONCURRENT TRIAGE: medical danger • suicide/violence risk • intoxication/withdrawal</text><text x=\"450\" y=\"87\" text-anchor=\"middle\" fill=\"#fecaca\" font-size=\"12\">Address an active emergency while gathering only the information needed for safety.</text><g font-family=\"system-ui\"><g transform=\"translate(30 125)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#7f1d1d\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">1. Assess</text><text x=\"95\" y=\"55\" text-anchor=\"middle\" fill=\"#fecaca\" font-size=\"12\">Biopsychosocial + crisis</text><text x=\"95\" y=\"76\" text-anchor=\"middle\" fill=\"#fecaca\" font-size=\"12\">Safety, resources, needs</text></g><g transform=\"translate(245 125)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#9a3412\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">2. Build rapport</text><text x=\"95\" y=\"58\" text-anchor=\"middle\" fill=\"#ffedd5\" font-size=\"12\">Rapid, respectful engagement</text></g><g transform=\"translate(460 125)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#92400e\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">3. Define problem</text><text x=\"95\" y=\"55\" text-anchor=\"middle\" fill=\"#fef3c7\" font-size=\"12\">Precipitant, meaning,</text><text x=\"95\" y=\"76\" text-anchor=\"middle\" fill=\"#fef3c7\" font-size=\"12\">immediate priorities</text></g><g transform=\"translate(675 125)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#3f6212\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">4. Explore feelings</text><text x=\"95\" y=\"58\" text-anchor=\"middle\" fill=\"#ecfccb\" font-size=\"12\">Listen, validate, understand</text></g><g transform=\"translate(140 255)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#065f46\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">5. Explore options</text><text x=\"95\" y=\"55\" text-anchor=\"middle\" fill=\"#d1fae5\" font-size=\"12\">Alternatives, strengths,</text><text x=\"95\" y=\"76\" text-anchor=\"middle\" fill=\"#d1fae5\" font-size=\"12\">supports, linkage</text></g><g transform=\"translate(355 255)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#155e75\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">6. Action plan</text><text x=\"95\" y=\"55\" text-anchor=\"middle\" fill=\"#cffafe\" font-size=\"12\">Collaborative, concrete,</text><text x=\"95\" y=\"76\" text-anchor=\"middle\" fill=\"#cffafe\" font-size=\"12\">feasible next steps</text></g><g transform=\"translate(570 255)\"><rect width=\"190\" height=\"95\" rx=\"12\" fill=\"#1e40af\"/><text x=\"95\" y=\"28\" text-anchor=\"middle\" fill=\"#fff\" font-weight=\"bold\" font-size=\"16\">7. Follow up</text><text x=\"95\" y=\"55\" text-anchor=\"middle\" fill=\"#dbeafe\" font-size=\"12\">Check safety and progress;</text><text x=\"95\" y=\"76\" text-anchor=\"middle\" fill=\"#dbeafe\" font-size=\"12\">connect continuity of care</text></g></g><path d=\"M220 173H240M435 173H455M650 173H670M770 222C810 270 795 325 765 325M570 302H550M355 302H335\" fill=\"none\" stroke=\"#64748b\" stroke-width=\"3\" marker-end=\"url(#ch18RobertsArrow)\"/><rect x=\"110\" y=\"382\" width=\"680\" height=\"50\" rx=\"11\" fill=\"#0f172a\" stroke=\"#94a3b8\"/><text x=\"450\" y=\"403\" text-anchor=\"middle\" fill=\"#e2e8f0\" font-size=\"13\">Flexible road map: stages may overlap, repeat, or change order.</text><text x=\"450\" y=\"421\" text-anchor=\"middle\" fill=\"#cbd5e1\" font-size=\"12\">Not a substitute for emergency protocols, system standards, or clinical judgment.</text></svg>"
            }
        },
        {
            heading: 'Suicide Risk Assessment',
            content: '<p>Suicide assessment is a core clinical competency tested extensively on the EPPP.</p>' +
                '<p><strong>Risk factors</strong> (increase risk):</p>' +
                '<table>' +
                '<tr><th>Category</th><th>Factors</th></tr>' +
                '<tr><td><strong>Historical/Static</strong></td><td>Prior suicide attempt or self-harm, family or peer suicide exposure, trauma or violence, and other history interpreted with recency, severity, context, and current state</td></tr>' +
                '<tr><td><strong>Clinical</strong></td><td>Current suicidal thoughts and behavior, agitation, intoxication or withdrawal, severe mood or psychotic symptoms, hopelessness, sleep disruption, pain, and abrupt clinical change</td></tr>' +
                '<tr><td><strong>Population and structural context</strong></td><td>Suicide rates and attempts differ across age, sex, geography, veteran status, sexual and gender identity, race/ethnicity, and tribal communities, reflecting heterogeneous methods, exposures, discrimination, access, and protective contexts. Group membership is not an individual risk score.</td></tr>' +
                '<tr><td><strong>Situational</strong></td><td>Access to lethal means, recent loss or humiliation, relationship/financial/legal stress, isolation, chronic illness or pain, incarceration or transition, and barriers to care</td></tr>' +
                '</table>' +
                '<p><strong>Protective factors</strong> (reduce risk):</p>' +
                '<ul>' +
                '<li>Social connectedness and family support</li>' +
                '<li>Personally meaningful reasons for living, which may include relationships, responsibilities, identity, values, or future goals</li>' +
                '<li>Active therapeutic relationship</li>' +
                '<li>Cultural, spiritual, or moral beliefs and community connection when experienced as supportive by the person</li>' +
                '<li>Problem-solving and coping skills</li>' +
                '<li>Access to effective mental health treatment</li>' +
                '</ul>' +
                '<p><strong>Lethality assessment components:</strong></p>' +
                '<ul>' +
                '<li><strong>Ideation</strong>: "Are you thinking about suicide?" (direct questioning is recommended)</li>' +
                '<li><strong>Plan</strong>: How specific? More specific = higher risk</li>' +
                '<li><strong>Means</strong>: Do they have access to the means? (guns, medications)</li>' +
                '<li><strong>Intent</strong>: "Do you intend to act on these thoughts?"</li>' +
                '<li><strong>Timeline</strong>: When do they plan to act?</li>' +
                '</ul>' +
                '<p><strong>Safety planning (Stanley & Brown):</strong></p>' +
                '<ol>' +
                '<li>Recognize warning signs</li>' +
                '<li>Use internal coping strategies</li>' +
                '<li>Contact people/settings that provide distraction</li>' +
                '<li>Contact people who can help</li>' +
                '<li>Contact professionals/agencies (988 Lifeline)</li>' +
                '<li>Reduce access to lethal means</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> No single factor predicts an individual outcome. Prior attempts, current thoughts/intent, feasible plan and access, recent changes, intoxication, agitation, supports, and reasons for living inform a structured formulation. Collaborative lethal-means safety is important within a broader disposition, safety-plan, treatment, and follow-up response.</p>',
            keyTerms: ['Suicide risk factors', 'Protective factors', 'Safety planning', 'Means restriction', 'Hopelessness', 'Lethality assessment', 'Previous attempt'],
            knowledgeCheck: {
                question: 'A recently bereaved client reports escalating alcohol use, hopelessness, a newly purchased firearm, and current thoughts of suicide. What is the best immediate response?',
                options: [
                    'Begin cognitive restructuring and defer direct suicide questions to preserve rapport.',
                    'Ask the client to sign a no-suicide contract and schedule next week.',
                    'Conduct a direct, structured assessment of current thoughts, plan, intent, access, past behavior, intoxication, supports, and ability to stay safe; do not leave the person alone if imminent risk is present, arrange the appropriate emergency disposition, and include collaborative lethal-means safety.',
                    'Provide a grief-group referral as the sole intervention because bereavement explains the thoughts.'
                ],
                answer: 2,
                rationale: 'The facts require direct assessment and disposition rather than inference from demographics or a single intervention. Current suicidal thoughts with intoxication and firearm access may require emergency evaluation and continuous safety support. Collaborative safe storage or removal is part of the response, alongside safety planning, treatment connection, and follow-up as appropriate.'
            }
        },
        {
            heading: 'Psychological First Aid (PFA)',
            content: '<p><strong>Psychological First Aid</strong> is the <em>immediate</em> post-disaster/trauma response \u2014 not therapy, but stabilization and support.</p>' +
                '<p><strong>Eight core actions (NCTSN/NCPTSD):</strong></p>' +
                '<ol>' +
                '<li><strong>Contact and engagement</strong>: Compassionate, nonintrusive initial contact</li>' +
                '<li><strong>Safety and comfort</strong>: Ensure immediate physical and emotional safety</li>' +
                '<li><strong>Stabilization</strong>: Calm and orient emotionally overwhelmed individuals</li>' +
                '<li><strong>Information gathering</strong>: Assess current needs and concerns</li>' +
                '<li><strong>Practical assistance</strong>: Help with immediate problem-solving</li>' +
                '<li><strong>Connection with social supports</strong>: Link to family, friends, community</li>' +
                '<li><strong>Information on coping</strong>: Clear, culturally and developmentally appropriate information about varied stress reactions and coping without implying that every response is \u201cnormal\u201d or harmless</li>' +
                '<li><strong>Linkage with collaborative services</strong>: Connect to ongoing resources</li>' +
                '</ol>' +
                '<p><strong>Key distinction: PFA vs. Critical Incident Stress Debriefing (CISD).</strong> CISD (Mitchell) involves structured group processing immediately after trauma. Routine compulsory single-session psychological debriefing that requires detailed recounting is not recommended for preventing PTSD: trials have not shown benefit and some found worse outcomes. Do not equate that procedure with all voluntary peer, operational, memorial, or supportive group contact. PFA is flexible, nonintrusive, needs-based support rather than forced trauma processing.</p>' +
                '<p><strong>EPPP Tip:</strong> PFA is an evidence-informed immediate-support framework. Avoid compulsory one-size-fits-all emotional processing or detailed recounting; assess needs, safety, preferences, culture, and referral indications.</p>',
            keyTerms: ['Psychological First Aid', 'PFA', 'CISD', 'Post-disaster', 'Stabilization', 'Debriefing'],
            knowledgeCheck: {
                question: 'Immediately after a disaster, an organization proposes requiring every survivor to recount the event in detail during a single group session to prevent PTSD. What is the best response?',
                options: ['Require attendance because immediate emotional ventilation prevents PTSD.', 'Replace individualized triage with the group session so everyone receives identical care.', 'Do not require detailed recounting. Offer flexible, nonintrusive PFA-style safety, practical support, connection, coping information, and referral based on needs and preferences.', 'Avoid all contact because any early support interferes with natural recovery.'],
                answer: 2,
                rationale: 'Routine compulsory single-session debriefing has not prevented PTSD and may worsen outcomes for some people. PFA is needs-based and nonintrusive; it supports safety, practical needs, social connection, coping, and linkage without forcing trauma narration.'
            }
        },
        {
            heading: 'Evidence-Based PTSD Treatments',
            content: '<p>The 2023 VA/DoD guideline strongly recommends three individual, manualized trauma-focused psychotherapies for PTSD:</p>' +
                '<table>' +
                '<tr><th>Treatment</th><th>Developer</th><th>Mechanism</th><th>Format</th></tr>' +
                '<tr><td><strong>Prolonged Exposure (PE)</strong></td><td>Edna Foa</td><td>Emotional processing through repeated imaginal revisiting of the trauma and in vivo exposure to avoided trauma-related situations</td><td>A manualized course using psychoeducation and gradual in vivo and imaginal exposure; session count, duration, and adjunct components follow the current protocol and patient context</td></tr>' +
                '<tr><td><strong>Cognitive Processing Therapy (CPT)</strong></td><td>Patricia Resick</td><td>Identifying and challenging <strong>"stuck points"</strong> \u2014 unhelpful beliefs about the trauma (e.g., "It was my fault," "The world is completely dangerous")</td><td>A structured protocol focused on trauma-related beliefs; versions and session count can vary, and a written account is not universally required</td></tr>' +
                '<tr><td><strong>EMDR</strong></td><td>Francine Shapiro</td><td>A structured eight-phase therapy that includes attention to traumatic memories with bilateral stimulation. Effectiveness is supported; the precise mechanism and unique contribution of eye movements are separate empirical questions</td><td>Eight-phase manualized protocol; duration is individualized. AIP is EMDR\u2019s theoretical model, not an established biological mechanism</td></tr>' +
                '</table>' +
                '<p><strong>EMDR\u2019s 8 phases:</strong> (1) History taking, (2) Preparation, (3) Assessment (identify target), (4) Desensitization (bilateral stimulation), (5) Installation (positive cognition), (6) Body scan, (7) Closure, (8) Reevaluation.</p>' +
                '<p><strong>EPPP Tip:</strong> PE and CPT are both cognitive-behavioral trauma treatments and are considered first-line for PTSD. <strong>PE</strong> uses imaginal exposure (verbally revisiting the trauma). <strong>CPT</strong> focuses on cognitive "stuck points." <strong>EMDR</strong> uses bilateral stimulation. All three are strongly recommended in the 2023 VA/DoD guideline; guideline recommendations, availability, contraindications, patient preference, and clinical context guide selection.</p>',
            keyTerms: ['PTSD', 'Prolonged Exposure', 'Foa', 'CPT', 'Resick', 'Stuck points', 'EMDR', 'Shapiro', 'Bilateral stimulation', 'AIP model'],
            expandableCase: {
                title: 'Choosing Between PE and CPT',
                clinicalDescription: 'A 32-year-old female combat veteran with PTSD avoids talking about her traumatic experiences and becomes extremely agitated when pressed for details. However, she frequently expresses beliefs like "I should have saved my squad mate \u2014 it was my fault he died" and "I can never trust anyone again because the world is completely dangerous."',
                diagnosis: 'Shared Decision Among Recommended Trauma-Focused Treatments',
                explanation: 'The self-blame beliefs are directly addressed in CPT, but agitation and avoidance do not by themselves rule out PE and should not determine treatment from a vignette alone. Discuss CPT, PE, EMDR, and other guideline-supported options; assess safety, dissociation, substance use, cognition, access, preference, readiness, and prior response; use the chosen protocol competently and monitor outcomes.'
            }
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: defining a safe support role for AI during crisis',
        content: '<p><strong>Reflective extension:</strong> An AI system should not present itself as a crisis clinician, determine that someone is safe, replace emergency services, or claim that automated support is \u201cbetter than nothing.\u201d Crisis language can be incomplete, ambiguous, coerced, or rapidly changing, and system errors can delay lifesaving care.</p>' +
            '<p>A safer role is limited and explicit: encourage direct connection with human crisis resources, support immediate help-seeking, provide location-appropriate options when known, avoid secrecy or no-suicide contracts, and escalate according to the product\u2019s tested safety protocol. In the United States, call or text 988; imminent danger may require local emergency services.</p>' +
            '<p>AI can support administrative routing, reminders, or access to a collaboratively created safety plan only when privacy, accessibility, human oversight, failure modes, and evidence are addressed. It should not independently deliver trauma processing, exposure, EMDR, or a suicide-risk disposition.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> Crisis triage prioritizes immediate medical and safety needs, sometimes while assessment is still occurring. Suicide risk is multifactorial; avoid \u201csingle strongest predictor/intervention\u201d shortcuts. Use direct inquiry, appropriate disposition, collaborative safety planning, lethal-means safety, treatment connection, and follow-up. PFA is flexible and nonintrusive; compulsory one-session trauma recounting is not recommended. VA/DoD strongly recommends CPT, PE, and EMDR for PTSD.'
    },
    references: [
        'Foa, E. B., Hembree, E. A., & Rothbaum, B. O. (2007). <em>Prolonged exposure therapy for PTSD: Emotional processing of traumatic experiences</em>. Oxford University Press.',
        'Resick, P. A., Monson, C. M., & Chard, K. M. (2017). <em>Cognitive processing therapy for PTSD: A comprehensive manual</em>. Guilford Press.',
        'Roberts, A. R. (2005). <em>Crisis intervention handbook: Assessment, treatment, and research</em> (3rd ed.). Oxford University Press.',
        'Shapiro, F. (2018). <em>Eye movement desensitization and reprocessing (EMDR) therapy: Basic principles, protocols, and procedures</em> (3rd ed.). Guilford Press.',
        'Stanley, B., & Brown, G. K. (2012). Safety planning intervention: A brief intervention to mitigate suicide risk. <em>Cognitive and Behavioral Practice, 19</em>(2), 256\u2013264.',
        'Vernberg, E. M., Steinberg, A. M., Jacobs, A. K., Brymer, M. J., Watson, P. J., Osofsky, J. D., ... & Ruzek, J. I. (2008). Innovations in disaster mental health: Psychological first aid. <em>Professional Psychology: Research and Practice, 39</em>(4), 381\u2013388.'
    ]
});
