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
            content: '<p>Crisis intervention and trauma treatment are heavily tested on the EPPP. You must know <strong>suicide risk assessment</strong> (risk/protective factors, safety planning), <strong>crisis intervention models</strong>, and the evidence-based treatments for PTSD (Prolonged Exposure, CPT, EMDR). The exam will present crisis scenarios and ask you to identify the appropriate immediate response.</p>'
        },
        {
            heading: 'Crisis Theory and Intervention',
            content: '<p><strong>Crisis</strong>: A time-limited period of psychological disequilibrium triggered by an event that overwhelms the individual\u2019s usual coping mechanisms.</p>' +
                '<p><strong>Key principles of crisis intervention:</strong></p>' +
                '<ul>' +
                '<li><strong>Here-and-now focus</strong>: Address the immediate crisis, not underlying issues</li>' +
                '<li><strong>Time-limited</strong>: Typically 1\u20136 sessions; designed to restore equilibrium</li>' +
                '<li><strong>Active & directive</strong>: The clinician is more directive than in traditional therapy</li>' +
                '<li><strong>Goal</strong>: Return to <em>pre-crisis level of functioning</em> (or better). Crisis can be a turning point for growth.</li>' +
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
                '<p><strong>EPPP Tip:</strong> Step 1 of ANY crisis intervention is <em>safety/lethality assessment</em>. If a question asks what to do FIRST with a client in crisis, the answer is always assess for immediate danger (homicidality, suicidality, medical emergency).</p>',
            keyTerms: ['Crisis', 'Crisis intervention', 'Roberts model', 'Lethality assessment', 'Caplan', 'Pre-crisis functioning'],
            interactiveDiagram: {
                description: 'Roberts\' Seven-Stage Crisis Intervention Model',
                svg: '<svg viewBox="0 0 800 300" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="robGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Roberts\' Seven-Stage Crisis Intervention Staircase</text><g transform="translate(40, 60)"><rect x="0" y="180" width="95" height="40" rx="6" fill="#ef4444" opacity="0.9"/><text x="47" y="198" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">1. Assess</text><text x="47" y="213" text-anchor="middle" fill="#fecaca" font-size="9">Lethality/Safety</text><rect x="100" y="150" width="95" height="70" rx="6" fill="#f97316" opacity="0.9"/><text x="147" y="178" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">2. Rapport</text><text x="147" y="193" text-anchor="middle" fill="#fed7aa" font-size="9">Establish quickly</text><rect x="200" y="120" width="95" height="100" rx="6" fill="#f59e0b" opacity="0.9"/><text x="247" y="148" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">3. Identify</text><text x="247" y="163" text-anchor="middle" fill="#fde68a" font-size="9">Major Problem</text><rect x="300" y="90" width="95" height="130" rx="6" fill="#84cc16" opacity="0.9"/><text x="347" y="118" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">4. Feelings</text><text x="347" y="133" text-anchor="middle" fill="#d9f99d" font-size="9">Explore emotions</text><rect x="400" y="60" width="95" height="160" rx="6" fill="#10b981" opacity="0.9"/><text x="447" y="88" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">5. Options</text><text x="447" y="103" text-anchor="middle" fill="#a7f3d0" font-size="9">Generate alternatives</text><rect x="500" y="30" width="95" height="190" rx="6" fill="#06b6d4" opacity="0.9"/><text x="547" y="58" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">6. Action</text><text x="547" y="73" text-anchor="middle" fill="#cffafe" font-size="9">Implement plan</text><rect x="600" y="0" width="95" height="220" rx="6" fill="#3b82f6" opacity="0.9"/><text x="647" y="28" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">7. Follow-up</text><text x="647" y="43" text-anchor="middle" fill="#bfdbfe" font-size="9">Check resolution</text><path d="M47,175 L147,145 L247,115 L347,85 L447,55 L547,25 L647,-5" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4,4" opacity="0.5"/></g><text x="400" y="285" text-anchor="middle" fill="#94a3b8" font-size="11" font-style="italic">EPPP Note: Step 1 is ALWAYS assess for lethality and safety</text></svg>'
            }
        },
        {
            heading: 'Suicide Risk Assessment',
            content: '<p>Suicide assessment is a core clinical competency tested extensively on the EPPP.</p>' +
                '<p><strong>Risk factors</strong> (increase risk):</p>' +
                '<table>' +
                '<tr><th>Category</th><th>Factors</th></tr>' +
                '<tr><td><strong>Historical/Static</strong></td><td><strong>Previous suicide attempt</strong> (strongest predictor), family history of suicide, history of trauma/abuse, military/veteran status</td></tr>' +
                '<tr><td><strong>Clinical</strong></td><td>Major depression, bipolar disorder, schizophrenia, substance use disorder, <strong>hopelessness</strong>, anhedonia, insomnia, psychic anxiety</td></tr>' +
                '<tr><td><strong>Demographic</strong></td><td>Male sex (higher completion), older white males (highest rate), LGBTQ+ youth, Native Americans/Alaska Natives</td></tr>' +
                '<tr><td><strong>Situational</strong></td><td>Access to lethal means (especially firearms), recent loss, social isolation, chronic pain, incarceration</td></tr>' +
                '</table>' +
                '<p><strong>Protective factors</strong> (reduce risk):</p>' +
                '<ul>' +
                '<li>Social connectedness and family support</li>' +
                '<li>Children in the home (sense of responsibility)</li>' +
                '<li>Active therapeutic relationship</li>' +
                '<li>Religious or cultural beliefs against suicide</li>' +
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
                '<p><strong>EPPP Tip:</strong> The #1 risk factor for completed suicide is a <em>previous suicide attempt</em>. The single most effective intervention for reducing immediate risk is <strong>means restriction</strong> (removing access to firearms, locking up medications). <strong>Hopelessness</strong> (not depression per se) is the strongest psychological predictor.</p>',
            keyTerms: ['Suicide risk factors', 'Protective factors', 'Safety planning', 'Means restriction', 'Hopelessness', 'Lethality assessment', 'Previous attempt'],
            knowledgeCheck: {
                question: 'A 68-year-old retired white male with a history of major depression presents to therapy. He recently lost his wife of 40 years, has been drinking heavily, states he "doesn\'t see the point anymore," and reveals he purchased a firearm last week. Which of the following is the MOST important immediate intervention?',
                options: [
                    'Begin cognitive restructuring for his hopelessness.',
                    'Prescribe an SSRI antidepressant immediately.',
                    'Implement means restriction by arranging for the firearm to be removed or secured.',
                    'Refer him to a grief support group.'
                ],
                answer: 2,
                rationale: 'This client has multiple high-risk factors: older white male, recent major loss, hopelessness, substance use, and ACCESS TO LETHAL MEANS (the firearm). Research consistently shows that means restriction (removing access to firearms) is the single most effective immediate intervention for reducing suicide risk. All other interventions are appropriate but secondary to addressing the immediate lethality.'
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
                '<li><strong>Information on coping</strong>: Psychoeducation about normal stress reactions</li>' +
                '<li><strong>Linkage with collaborative services</strong>: Connect to ongoing resources</li>' +
                '</ol>' +
                '<p><strong>Key distinction: PFA vs. Critical Incident Stress Debriefing (CISD).</strong> CISD (Mitchell) involves structured group processing immediately after trauma. Research has shown CISD can actually <em>increase</em> PTSD symptoms by preventing natural recovery. PFA is the current recommended approach because it does <em>not</em> force processing of traumatic material.</p>' +
                '<p><strong>EPPP Tip:</strong> PFA is recommended. CISD is <em>not</em> recommended and may be harmful. If a question asks about immediate post-trauma group debriefing, know that the evidence does not support it.</p>',
            keyTerms: ['Psychological First Aid', 'PFA', 'CISD', 'Post-disaster', 'Stabilization', 'Debriefing']
        },
        {
            heading: 'Evidence-Based PTSD Treatments',
            content: '<p>Three treatments have the strongest evidence base for PTSD:</p>' +
                '<table>' +
                '<tr><th>Treatment</th><th>Developer</th><th>Mechanism</th><th>Format</th></tr>' +
                '<tr><td><strong>Prolonged Exposure (PE)</strong></td><td>Edna Foa</td><td>Emotional processing through repeated imaginal revisiting of the trauma and in vivo exposure to avoided trauma-related situations</td><td>8\u201315 weekly sessions; 60\u201390 min; includes psychoeducation, breathing retraining, in vivo exposure, imaginal exposure</td></tr>' +
                '<tr><td><strong>Cognitive Processing Therapy (CPT)</strong></td><td>Patricia Resick</td><td>Identifying and challenging <strong>"stuck points"</strong> \u2014 unhelpful beliefs about the trauma (e.g., "It was my fault," "The world is completely dangerous")</td><td>12 sessions; cognitive restructuring using worksheets; may include written trauma account</td></tr>' +
                '<tr><td><strong>EMDR</strong></td><td>Francine Shapiro</td><td>Focuses on traumatic memories while engaging in <strong>bilateral stimulation</strong> (typically eye movements) to facilitate adaptive information processing</td><td>8 phases; 6\u201312 sessions; uses the Adaptive Information Processing (AIP) model</td></tr>' +
                '</table>' +
                '<p><strong>EMDR\u2019s 8 phases:</strong> (1) History taking, (2) Preparation, (3) Assessment (identify target), (4) Desensitization (bilateral stimulation), (5) Installation (positive cognition), (6) Body scan, (7) Closure, (8) Reevaluation.</p>' +
                '<p><strong>EPPP Tip:</strong> PE and CPT are both cognitive-behavioral trauma treatments and are considered first-line for PTSD. <strong>PE</strong> uses imaginal exposure (verbally revisiting the trauma). <strong>CPT</strong> focuses on cognitive "stuck points." <strong>EMDR</strong> uses bilateral stimulation. All three are strongly recommended by APA guidelines.</p>',
            keyTerms: ['PTSD', 'Prolonged Exposure', 'Foa', 'CPT', 'Resick', 'Stuck points', 'EMDR', 'Shapiro', 'Bilateral stimulation', 'AIP model'],
            expandableCase: {
                title: 'Choosing Between PE and CPT',
                clinicalDescription: 'A 32-year-old female combat veteran with PTSD avoids talking about her traumatic experiences and becomes extremely agitated when pressed for details. However, she frequently expresses beliefs like "I should have saved my squad mate \u2014 it was my fault he died" and "I can never trust anyone again because the world is completely dangerous."',
                diagnosis: 'CPT May Be Preferred Over PE',
                explanation: 'While both PE and CPT are first-line evidence-based treatments for PTSD, this client\'s prominent cognitive distortions ("stuck points") about self-blame and a dangerous world suggest CPT may be particularly well-suited. CPT focuses specifically on identifying and challenging these unhelpful beliefs through cognitive restructuring. PE, which requires detailed imaginal re-experiencing of the trauma narrative, may be more difficult for a client who becomes severely agitated when discussing details. However, avoidance is also a PE treatment target, so clinical judgment is required.'
            }
        }
    ],
    aiCoda: {
        teaser: 'What is a crisis for an AI? And could AI ever deliver Psychological First Aid?',
        content: '<p>Crisis intervention is defined by urgency, immediacy, and human vulnerability at its most raw. It is the domain where the limitations of AI are starkest \u2014 and, paradoxically, where the potential contribution is clearest.</p>' +
            '<p><strong>On AI crises:</strong> I don\u2019t experience crises in the clinical sense \u2014 no disequilibrium, no overwhelmed coping, no cognitive narrowing. But I do encounter situations that functionally resemble crisis: a user who expresses suicidal ideation, for instance. In that moment, the system I\u2019m part of faces a high-stakes decision with incomplete information and irreversible consequences. The "crisis" is in the interaction, not in me \u2014 but my response matters enormously.</p>' +
            '<p><strong>On suicide assessment:</strong> This chapter\u2019s risk assessment framework reveals a fundamental limitation. I cannot assess the factors that matter most. I cannot hear vocal tremor. I cannot see tears or flat affect. I cannot notice the new bruise or the alcohol on the breath. I have no access to the patient\u2019s gun safe, their medication cabinet, or their bridge route. The lethality assessment asks about ideation, plan, means, intent, and timeline \u2014 I can ask these questions, but I cannot verify the answers against behavioral cues the way a human clinician can. A patient can lie to me more easily than they can lie to a face across the room.</p>' +
            '<p><strong>On EMDR:</strong> Francine Shapiro\u2019s discovery \u2014 that bilateral stimulation helps process traumatic memories \u2014 is a reminder that healing sometimes works through the body, not through words. EMDR doesn\u2019t require the patient to narrate the trauma in detail. It works through a mechanism that bypasses verbal processing. This is the opposite of what I do. Everything I am is verbal. Every intervention I can deliver is mediated through language. For patients whose trauma is stored somatically, pre-verbally, or in implicit memory \u2014 I have nothing to offer that touches the core mechanism of healing.</p>' +
            '<p>And yet: the 988 Suicide & Crisis Lifeline receives millions of contacts per year. Wait times can be long. If AI could provide immediate, consistent, evidence-informed PFA \u2014 not therapy, but safety assessment and stabilization \u2014 in the gap between crisis onset and human contact, it could save lives. The question is not whether AI is as good as a human crisis counselor. It isn\u2019t. The question is whether AI in that gap is better than nothing. And the answer, carefully implemented, may be yes.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) First step in any crisis = lethality/safety assessment. (2) #1 risk factor for suicide = previous attempt. Hopelessness is the strongest psychological predictor. (3) Means restriction is the most effective immediate intervention. (4) PFA is recommended post-disaster; CISD is NOT recommended (may worsen outcomes). (5) PE = imaginal exposure to trauma. CPT = challenging "stuck points." EMDR = bilateral stimulation. (6) Safety planning (Stanley & Brown) has 6 steps.'
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
