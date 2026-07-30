/* PasstheEPPP — Rationale Enhancement Overlay
   Patches questions from batches 1-5 (questions_bank.js) to add
   "Why others are wrong" explanations to each rationale.
   
   Loaded AFTER questions_bank.js — matches questions by text and patches their rationale field. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    /* Map: question text → enhanced rationale.
       Only questions from old batches that need the "Why others are wrong" format. */
    const enhancements = {
        // ===== DOMAIN 1 — Batch 1 (extra) =====
        "A patient with damage to the ventromedial prefrontal cortex would MOST likely show:":
            "The vmPFC is critical for decision-making, emotional regulation, and social behavior. Damage (as in Phineas Gage) leads to impulsivity, poor judgment, and personality changes.\n\nWhy others are wrong:\n(A) Inability to form new memories → hippocampus damage (anterograde amnesia)\n(C) Loss of vision in left visual field → right occipital lobe or optic pathway damage\n(D) Inability to understand spoken language → Wernicke's area (left temporal lobe) damage",

        "Which neurotransmitter system is MOST directly implicated in the reward pathway?":
            "The mesolimbic dopamine pathway (VTA → nucleus accumbens) is the primary reward circuit. Dysregulation is implicated in addiction and schizophrenia.\n\nWhy others are wrong:\n(A) Serotonergic system → mood regulation and depression, not the primary reward pathway\n(B) GABAergic system → inhibitory neurotransmission, anxiety regulation, not reward\n(D) Cholinergic system → memory, attention, neuromuscular function, not reward",

        "A patient presents with intention tremor, ataxia, and difficulty with rapid alternating movements. The MOST likely site of damage is:":
            "The cerebellum coordinates voluntary movement, balance, and motor learning. Cerebellar damage produces intention tremor, ataxia, and dysmetria — distinct from basal ganglia's resting tremor.\n\nWhy others are wrong:\n(A) Basal ganglia → resting tremor, rigidity, bradykinesia (Parkinson's-type symptoms), not intention tremor\n(C) Hippocampus → memory formation, not motor coordination\n(D) Thalamus → sensory relay, not motor coordination (though thalamic lesions can cause tremor)",

        "Split-brain research by Sperry demonstrated that in right-handed individuals:":
            "Sperry's Nobel Prize-winning research showed left hemisphere dominance for language and the right hemisphere's superiority for spatial/visual processing in split-brain patients.\n\nWhy others are wrong:\n(A) The LEFT hemisphere is dominant for language in most right-handed individuals, not the right\n(B) The hemispheres have distinct specializations — they do NOT process information identically\n(D) The corpus callosum IS necessary for integrated function — split-brain patients show clear deficits in cross-hemisphere communication",

        "The blood-brain barrier is MOST permeable to:":
            "The blood-brain barrier selectively allows lipid-soluble (fat-soluble) substances to pass while blocking large, water-soluble molecules. This is why lipophilic drugs like benzodiazepines cross readily.\n\nWhy others are wrong:\n(A) Large water-soluble molecules are BLOCKED by the BBB's tight junctions\n(C) Ionized medications cannot easily cross the lipid bilayer of the BBB\n(D) Proteins and antibodies are too large to cross — this is why the brain is an 'immune-privileged' site",

        "A 65-year-old presents with progressive memory loss, language deterioration, and personality changes. Autopsy would MOST likely reveal:":
            "Neurofibrillary tangles (tau protein) and amyloid plaques (beta-amyloid) are the hallmark neuropathological features of Alzheimer's disease.\n\nWhy others are wrong:\n(A) Lewy bodies in the brainstem → Parkinson's disease (Lewy body dementia involves cortical Lewy bodies with different presentation)\n(C) CNS demyelination → multiple sclerosis, not Alzheimer's\n(D) Enlarged ventricles alone are nonspecific — they occur in many conditions including normal aging",

        "Which of the following is TRUE about long-term potentiation (LTP)?":
            "LTP requires activation of NMDA glutamate receptors, which allow calcium influx that triggers molecular cascades strengthening synaptic connections — the cellular basis of learning.\n\nWhy others are wrong:\n(A) LTP STRENGTHENS synaptic connections — weakening would be long-term depression (LTD)\n(B) LTP is most studied in the hippocampus, not primarily the frontal lobe\n(D) LTP is the primary cellular mechanism underlying learning and memory formation",

        "Wernicke-Korsakoff syndrome is caused by deficiency of:":
            "Wernicke-Korsakoff syndrome results from thiamine (B1) deficiency, most commonly due to chronic alcoholism. Features confabulation, anterograde amnesia, and ataxia.\n\nWhy others are wrong:\n(A) Vitamin B12 deficiency → pernicious anemia, peripheral neuropathy, and cognitive changes, not WKS\n(C) Folic acid deficiency → megaloblastic anemia and neural tube defects in pregnancy\n(D) Vitamin D deficiency → rickets (children), osteomalacia (adults), not neuropsychiatric syndrome",

        "The hypothalamus regulates all of the following EXCEPT:":
            "The hypothalamus controls homeostatic functions (temperature, hunger, thirst, sleep/wake cycles, hormonal release). Language comprehension is a cortical function (Wernicke's area).\n\nWhy others are wrong:\n(A) Body temperature IS regulated by the hypothalamus (anterior = cooling, posterior = heating)\n(B) Hunger and thirst ARE regulated by the hypothalamus (VMH = satiety, LH = hunger)\n(D) Circadian rhythms ARE regulated by the suprachiasmatic nucleus of the hypothalamus",

        "A patient cannot recognize familiar faces despite intact vision. This condition is called:":
            "Prosopagnosia (face blindness) involves inability to recognize faces, typically from damage to the fusiform face area in the temporal lobe. Visual acuity is preserved.\n\nWhy others are wrong:\n(A) Agnosia is a broader term for recognition failure — prosopagnosia is a specific type of visual agnosia\n(C) Aphasia → language impairment, not face recognition\n(D) Apraxia → inability to perform learned movements, not recognition failure",

        "Second-generation (atypical) antipsychotics differ from first-generation primarily because they:":
            "Atypical antipsychotics (e.g., clozapine, risperidone, olanzapine) block both D2 dopamine and 5-HT2A serotonin receptors, reducing EPS risk while addressing both positive and negative symptoms.\n\nWhy others are wrong:\n(A) Atypicals are generally LESS potent dopamine blockers, not more — their efficacy comes from combined D2/5-HT2A blockade\n(C) Atypicals have LOWER risk of tardive dyskinesia than first-generation antipsychotics\n(D) Atypicals are available in multiple forms (oral, injectable, LAI) — not only injectable",

        "In behavioral genetics, a heritability estimate of 0.50 means:":
            "Heritability is a POPULATION statistic — it estimates what proportion of variance in a trait across a population is due to genetic differences. It does NOT apply to individuals.\n\nWhy others are wrong:\n(A) Heritability applies to POPULATIONS, not individuals — you can't say 50% of one person's trait is genetic\n(C) Same error as (A) — heritability doesn't apply to individual people\n(D) 'Genes responsible for half the phenotype' confuses population variance with individual determination",

        "A patient with left neglect syndrome most likely has damage to the:":
            "Left hemispatial neglect typically results from right parietal lobe damage. Patients ignore stimuli in the left visual field despite intact visual pathways.\n\nWhy others are wrong:\n(A) Left parietal damage would cause RIGHT neglect (contralateral to the lesion)\n(C) Left frontal lobe damage → motor/executive deficits, not hemispatial neglect\n(D) Bilateral occipital damage → cortical blindness, not neglect (patients are unaware of visual loss but don't 'neglect' one side)",

        "Which brain imaging technique provides the BEST temporal resolution?":
            "EEG (electroencephalography) measures electrical activity in real-time (millisecond resolution), giving superior temporal resolution. fMRI has better spatial resolution but poorer temporal resolution.\n\nWhy others are wrong:\n(A) fMRI has temporal resolution of seconds (hemodynamic lag), not milliseconds\n(B) PET has poor temporal resolution (minutes) and requires radioactive tracers\n(D) CT scan provides structural images, not real-time brain activity measurement",

        "The adrenal glands release cortisol in response to stress via the:":
            "The HPA (Hypothalamic-Pituitary-Adrenal) axis: hypothalamus releases CRH → pituitary releases ACTH → adrenal cortex releases cortisol. Chronic activation is linked to depression and immune suppression.\n\nWhy others are wrong:\n(A) The sympathetic NS releases epinephrine/norepinephrine (fast response), not the slower cortisol pathway\n(C) The parasympathetic NS promotes rest/digest, opposing stress responses\n(D) The somatic NS controls voluntary skeletal muscles, not hormonal stress responses",

        // ===== DOMAIN 2 — Batch 1 =====
        "A researcher conditions a dog to salivate to a tone, then pairs the tone with a light. Eventually, the light alone elicits salivation. This is:":
            "Higher-order (second-order) conditioning: a new CS (light) is paired with an established CS (tone) rather than with the original UCS, acquiring the ability to elicit a CR.\n\nWhy others are wrong:\n(A) Stimulus generalization = responding to similar stimuli (e.g., similar tones), not pairing with a new stimulus\n(C) Spontaneous recovery = reappearance of an extinguished CR after time passes\n(D) Sensory preconditioning = pairing two neutral stimuli BEFORE any conditioning with a UCS",

        "According to dual-process theory, System 1 thinking is BEST characterized as:":
            "Kahneman's System 1 is fast, automatic, and intuitive (heuristic-based). System 2 is slow, deliberate, and analytical. Most thinking relies on System 1, leading to predictable biases.\n\nWhy others are wrong:\n(A) Slow/deliberate/analytical = System 2, not System 1\n(C) System 1 is used for ALL types of problems by default — not only complex ones\n(D) System 1 is largely UNCONSCIOUS and automatic, not conscious and controlled",

        "Token economies are based primarily on principles of:":
            "Token economies use operant conditioning — tokens serve as secondary/conditioned reinforcers that can be exchanged for backup reinforcers (rewards). Based on positive reinforcement principles.\n\nWhy others are wrong:\n(A) Classical conditioning involves involuntary responses to paired stimuli — tokens involve voluntary behavior for earned reinforcement\n(C) Observational learning (Bandura) involves modeling, not earning tokens\n(D) Cognitive restructuring changes thought patterns — token economies change behavior via reinforcement contingencies",

        "A child is rewarded for drawing. After the reward is removed, the child draws LESS than before rewards were introduced. This illustrates:":
            "The overjustification effect: providing extrinsic rewards for intrinsically motivated behavior undermines intrinsic motivation when rewards are removed.\n\nWhy others are wrong:\n(A) Extinction = stopping a previously reinforced behavior — but the behavior drops BELOW baseline, not just to zero\n(C) Negative punishment = removing something pleasant to decrease behavior — here no punishment was applied\n(D) Habituation = decreased response to repeated stimulation, a different process from motivational change",

        "Which memory system allows you to remember what you had for breakfast?":
            "Episodic memory (a type of explicit/declarative memory) stores personally experienced events in their temporal-spatial context — your breakfast is a personal event.\n\nWhy others are wrong:\n(A) Semantic memory stores general facts and knowledge (e.g., 'breakfast is the first meal of the day'), not personal events\n(B) Procedural memory stores skills and habits (e.g., how to use a fork), not specific events\n(D) Implicit memory is unconscious — recalling breakfast requires conscious, explicit retrieval",

        "The serial position effect demonstrates that items at the _____ and _____ of a list are best remembered.":
            "Serial position effect: primacy (beginning items — transferred to LTM) and recency (end items — still in STM). Middle items are recalled poorest.\n\nWhy others are wrong:\n(A) Middle items are recalled WORST, not best — the serial position curve is U-shaped\n(B) Beginning items are recalled well (primacy) but middle items are not\n(D) The serial position effect shows a SYSTEMATIC pattern, not random recall",

        "A clinician suspects malingering. Which test feature would BEST help detect this?":
            "Forced-choice (symptom validity) tests present choices where below-chance performance indicates deliberate wrong answers (malingering). Established method for detecting feigned cognitive impairment.\n\nWhy others are wrong:\n(A) High face validity makes a test EASIER to fake — it shows what's being measured, helping malingerers\n(C) Projective stimuli have limited empirical support for detecting malingering specifically\n(D) Open-ended questions allow narrative construction without clear validity detection mechanisms",

        "According to Lazarus's transactional model of stress, the MOST critical factor determining the stress response is:":
            "Lazarus argued cognitive appraisal is central: primary appraisal (Is this threatening?) and secondary appraisal (Can I cope?) determine the stress response, not objective threat level.\n\nWhy others are wrong:\n(A) Objective severity matters less than PERCEIVED threat — the same event can be appraised differently\n(C) Physiological arousal is a CONSEQUENCE of appraisal, not the primary determining factor\n(D) Social support is a coping resource that affects secondary appraisal, but appraisal itself is the critical factor",

        "Flashbulb memories are characterized by:":
            "Flashbulb memories (Brown & Kulik) feel vivid and are held with high confidence, but research shows they are prone to distortion and reconstruction like other memories — vividness ≠ accuracy.\n\nWhy others are wrong:\n(A) Flashbulb memories are NOT perfectly accurate — high vividness/confidence does not equal accuracy\n(C) Flashbulb memories are EXPLICIT (conscious, vivid recollections), not implicit\n(D) Photographic memory (eidetic memory) is a separate concept — flashbulb memories are about emotional significance, not visual precision",

        "In operant conditioning, a variable-interval schedule would produce:":
            "Variable-interval schedules produce moderate, steady response rates (e.g., checking email — reinforcement available at unpredictable times). No post-reinforcement pause because timing is unpredictable.\n\nWhy others are wrong:\n(A) High, steady rates are more characteristic of variable-ratio schedules (e.g., slot machines)\n(C) Post-reinforcement pauses are characteristic of fixed-ratio schedules\n(D) Rapid bursts then stops describe fixed-ratio patterns, not variable-interval",

        "Tolman's research on latent learning demonstrated that:":
            "Tolman showed rats learned maze layouts (cognitive maps) without reinforcement, demonstrating learning when there was no motivation to perform — challenging strict behaviorism.\n\nWhy others are wrong:\n(A) Tolman's research specifically DISPROVED this — learning occurred WITHOUT reinforcement\n(C) Tolman's cognitive approach was a challenge TO classical conditioning explanations, not support for them\n(D) Tolman's work did not address punishment vs. reinforcement — it was about whether reinforcement is necessary for learning at all",

        "The availability heuristic leads people to:":
            "Availability heuristic (Tversky & Kahneman): judging frequency/probability by how readily instances come to mind. Dramatic events (plane crashes) seem more common than they are.\n\nWhy others are wrong:\n(A) Seeking confirming evidence = confirmation bias, a different heuristic/bias\n(C) Anchoring to initial values = anchoring heuristic, a different judgment bias\n(D) Preferring the status quo = status quo bias, unrelated to the availability heuristic",

        "Garcia and Koelling's research on taste aversion demonstrated that:":
            "Garcia showed rats readily associated taste (not light/sound) with illness — demonstrating biological preparedness/selective association. Animals are predisposed to make certain CS-UCS pairings.\n\nWhy others are wrong:\n(A) The key finding was that NOT all stimuli are equally associable — taste pairs with illness, not audiovisual cues\n(C) The study was about acquisition constraints, not extinction permanence\n(D) Higher-order conditioning was not the topic — the study was about biological constraints on CS-UCS associations",

        "A child who can sort objects by color OR shape, but not both simultaneously, is likely in Piaget's:":
            "Centration in the preoperational stage: children can focus on only one dimension at a time. Multi-dimensional classification emerges in concrete operations.\n\nWhy others are wrong:\n(A) Sensorimotor stage (0-2) children wouldn't be sorting at all — they're developing object permanence\n(C) Concrete operational children CAN classify by multiple dimensions simultaneously\n(D) Formal operational thinkers handle abstract multi-dimensional reasoning easily",

        "Encoding specificity principle predicts that memory retrieval is best when:":
            "Tulving's encoding specificity principle: retrieval cues are most effective when they match the conditions present during encoding (context-dependent and state-dependent memory).\n\nWhy others are wrong:\n(A) Overlearning helps but isn't what encoding specificity predicts — it's about context MATCH\n(C) Distributed practice enhances retention but is a separate principle from encoding specificity\n(D) Deep processing (levels of processing) improves encoding but is a different theory from encoding specificity",

        // ===== DOMAIN 3 — Batch 1 =====
        "Zimbardo's Stanford Prison Experiment primarily demonstrated:":
            "Zimbardo's SPE showed how rapidly assigned social roles (guard/prisoner) shaped behavior, demonstrating the power of situational forces over individual personality traits.\n\nWhy others are wrong:\n(A) The SPE showed the INSTABILITY of behavior across situations — personality traits were overridden by roles\n(C) Obedience to authority relates to Milgram's study — Zimbardo focused on ROLE behavior, not obedience to a specific authority\n(D) The SPE wasn't about punishment effectiveness — it was about how social roles and situations control behavior",

        "According to the contact hypothesis (Allport), prejudice is reduced when intergroup contact involves:":
            "Allport's contact hypothesis specifies four conditions: equal status between groups, common goals, intergroup cooperation, and support of authorities/institutions.\n\nWhy others are wrong:\n(A) Any type of exposure can actually INCREASE prejudice if the conditions aren't right\n(C) Competition INCREASES intergroup conflict (Sherif's realistic conflict theory)\n(D) Mere proximity without the four conditions is insufficient and may increase prejudice",

        "In Sherif's Robbers Cave experiment, intergroup conflict was BEST reduced by:":
            "Sherif found that superordinate goals (objectives requiring cooperation between groups) were most effective at reducing intergroup conflict — not mere contact or separation.\n\nWhy others are wrong:\n(A) Separating the groups maintained hostility — physical distance didn't reduce prejudice\n(C) Punishing aggression addresses symptoms, not the underlying intergroup dynamics\n(D) Individual therapy wasn't used and wouldn't address the group-level dynamics driving the conflict",

        "The just-world hypothesis leads people to:":
            "The just-world hypothesis (Lerner): belief that people get what they deserve. Leads to victim-blaming as a way to maintain belief in a fair, predictable world.\n\nWhy others are wrong:\n(A) The just-world hypothesis assumes outcomes are NOT random — they're 'deserved'\n(C) Cultural equality assumptions are separate from the just-world belief\n(D) Overestimating one's abilities = better-than-average effect / self-enhancement bias, a different phenomenon",

        "Self-serving bias is MOST likely when:":
            "Self-serving bias (attributing success internally, failure externally) is strongest in public success situations. It's less prominent in collectivist cultures and often reversed in depression.\n\nWhy others are wrong:\n(A) During failure, self-serving bias attributes externally — it's strongest during SUCCESS\n(C) Collectivist cultures show LESS self-serving bias due to emphasis on modesty and group harmony\n(D) Depression is associated with REVERSED self-serving bias — depressed individuals often blame themselves",

        "Social identity theory (Tajfel) proposes that intergroup discrimination occurs because:":
            "Tajfel's social identity theory: people categorize into in-groups/out-groups, derive self-esteem from group identity, and engage in in-group favoritism to enhance self-concept — even with minimal groups.\n\nWhy others are wrong:\n(A) Competition for scarce resources = realistic conflict theory (Sherif), a different explanation\n(C) Stereotypes being accurate isn't the mechanism — SIT focuses on self-esteem maintenance through group identity\n(D) SIT doesn't claim outgroups are genuinely inferior — it's about psychological processes, not objective differences",

        "A person publicly agrees with a group but privately disagrees. This is an example of:":
            "Compliance (Kelman): public conformity without private acceptance. The person goes along to avoid conflict or gain reward but doesn't truly change their beliefs.\n\nWhy others are wrong:\n(A) Internalization = private acceptance with genuine belief change — the opposite of compliance\n(C) Identification = conforming based on desire to be like the group — involves some private acceptance\n(D) Conversion = genuine attitude change (usually from minority influence), not superficial public agreement",

        "The door-in-the-face technique works by first:":
            "Door-in-the-face: start with an unreasonably large request (refused), then follow with the actual smaller request. Based on reciprocal concessions — compliance increases after the requester 'backs down.'\n\nWhy others are wrong:\n(A) Starting with a SMALL request = foot-in-the-door technique, the opposite strategy\n(C) Offering a gift = reciprocity norm, a different influence principle\n(D) Establishing expertise = authority-based influence, not the DITF sequential request technique",

        "An African American student performs worse on a test described as measuring intelligence than on the same test described as a problem-solving exercise. This BEST illustrates:":
            "Steele & Aronson: framing the test as diagnostic of intelligence activates stereotype threat, causing anxiety that impairs performance. Same test without that framing shows no decrement.\n\nWhy others are wrong:\n(A) Test bias involves differential prediction across groups — here the SAME test produced different results based on framing\n(C) Low motivation doesn't explain why performance changed based on how the test was described\n(D) Inadequate education would affect performance equally regardless of how the test was framed",

        "Collectivist cultures are MOST likely to emphasize:":
            "Collectivist cultures (common in East Asia, Latin America) prioritize group harmony, interdependence, familial obligations, and fitting in over individual achievement.\n\nWhy others are wrong:\n(A) Individual achievement and self-reliance = individualistic culture values (US, Western Europe)\n(C) Competition between family members is discouraged in collectivist cultures\n(D) Personal autonomy above all = individualistic priority, not collectivistic",

        "According to realistic conflict theory (Sherif), intergroup hostility is caused by:":
            "Realistic conflict theory: intergroup prejudice and hostility arise from competition for scarce resources (jobs, territory, power), as demonstrated in the Robbers Cave experiment.\n\nWhy others are wrong:\n(A) Innate aggression = instinct theory (ethological/psychoanalytic), not Sherif's social-psychological approach\n(C) Personality disorders are individual-level pathology, not a group-level intergroup theory\n(D) Genetic differences don't explain intergroup hostility — RCT is about situational competition, not biology",

        "Implicit bias is BEST measured by:":
            "The IAT measures reaction time differences in pairing concepts (e.g., race + evaluative words), revealing automatic associations not captured by explicit self-report measures.\n\nWhy others are wrong:\n(A) Self-report measures capture EXPLICIT attitudes — people may not be aware of or willing to report implicit biases\n(C) Behavioral observation can reveal bias but isn't the most controlled/standardized measurement method\n(D) Clinical interviews capture conscious self-report, not implicit/automatic associations",

        "Informational social influence is MOST powerful when:":
            "Informational influence: looking to others for guidance when uncertain. Most powerful in ambiguous situations where people assume others have better knowledge (e.g., Sherif's autokinetic effect).\n\nWhy others are wrong:\n(A) In clear/unambiguous situations, people can judge for themselves and don't need others' information\n(C) Larger groups typically increase both informational and normative influence\n(D) High self-esteem may slightly reduce conformity but isn't the primary factor — ambiguity is",

        "The foot-in-the-door technique is based on:":
            "Foot-in-the-door: start with small request, then escalate. Based on commitment/consistency (Cialdini) — once people comply with a small request, they see themselves as cooperative and agree to larger ones.\n\nWhy others are wrong:\n(A) Scarcity principle = increased value of limited items, not sequential request compliance\n(C) Authority = compliance based on perceived expertise/power, not self-consistency\n(D) Reciprocity = returning favors, which underlies door-in-the-face, not foot-in-the-door",

        "Deindividuation is MOST likely to occur when:":
            "Deindividuation occurs in large groups with anonymity and arousal, reducing self-awareness and increasing impulsive, uninhibited behavior (e.g., mobs, online anonymity).\n\nWhy others are wrong:\n(A) People alone maintain self-awareness — deindividuation requires group anonymity\n(B) Being identifiable PREVENTS deindividuation — identification increases accountability\n(D) Leaders are typically MORE identifiable and self-aware, reducing deindividuation"
    };

    /* Walk all domains and patch matching questions */
    let patched = 0;
    EPPPData.domains.forEach(domain => {
        domain.questions.forEach(question => {
            const enhanced = enhancements[question.q];
            if (enhanced && !question.rationale.includes('Why others are wrong')) {
                question.rationale = enhanced;
                patched++;
            }
        });
    });

    console.log(`PasstheEPPP: Enhanced rationales patched for ${patched} questions (batch 1 overlay).`);
})();
