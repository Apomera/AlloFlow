/* PasstheEPPP — APA Reference Overlay (Part 1)
   Patches questions with APA citations and source links.
   Loaded AFTER all data batch files. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== DOMAIN 1: Biological Bases =====
        "A patient with damage to the ventromedial prefrontal cortex would MOST likely show:":
            "Damasio, A. R. (1994). Descartes' error: Emotion, reason, and the human brain. Putnam. See also: Bechara, A., Damasio, H., Tranel, D., & Damasio, A. R. (1997). Deciding advantageously before knowing the advantageous strategy. Science, 275(5304), 1293–1295. https://doi.org/10.1126/science.275.5304.1293",
        "Which neurotransmitter system is MOST directly implicated in the reward pathway?":
            "Wise, R. A. (2004). Dopamine, learning and motivation. Nature Reviews Neuroscience, 5(6), 483–494. https://doi.org/10.1038/nrn1406",
        "A patient presents with intention tremor, ataxia, and difficulty with rapid alternating movements. The MOST likely site of damage is:":
            "Kolb, B., & Whishaw, I. Q. (2015). Fundamentals of human neuropsychology (7th ed.). Worth Publishers.",
        "Split-brain research by Sperry demonstrated that in right-handed individuals:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. Nature Reviews Neuroscience, 6(8), 653–659. https://doi.org/10.1038/nrn1723",
        "The blood-brain barrier is MOST permeable to:":
            "Abbott, N. J., Patabendige, A. A. K., Dolman, D. E. M., Yusof, S. R., & Begley, D. J. (2010). Structure and function of the blood–brain barrier. Neurobiology of Disease, 37(1), 13–25. https://doi.org/10.1016/j.nbd.2009.07.030",
        "A 65-year-old presents with progressive memory loss, language deterioration, and personality changes. Autopsy would MOST likely reveal:":
            "Alzheimer's Association. (2024). 2024 Alzheimer's disease facts and figures. Alzheimer's & Dementia, 20(5), 3708–3821. https://doi.org/10.1002/alz.13809",
        "Which of the following is TRUE about long-term potentiation (LTP)?":
            "Bliss, T. V. P., & Collingridge, G. L. (1993). A synaptic model of memory: Long-term potentiation in the hippocampus. Nature, 361(6407), 31–39. https://doi.org/10.1038/361031a0",
        "Wernicke-Korsakoff syndrome is caused by deficiency of:":
            "Arts, N. J. M., Walvoort, S. J. W., & Kessels, R. P. C. (2017). Korsakoff's syndrome: A critical review. Neuropsychiatric Disease and Treatment, 13, 2875–2890. https://doi.org/10.2147/NDT.S130078",
        "The hypothalamus regulates all of the following EXCEPT:":
            "Bear, M. F., Connors, B. W., & Paradiso, M. A. (2016). Neuroscience: Exploring the brain (4th ed.). Wolters Kluwer.",
        "A patient cannot recognize familiar faces despite intact vision. This condition is called:":
            "Kanwisher, N., & Yovel, G. (2006). The fusiform face area: A cortical region specialized for the perception of faces. Philosophical Transactions of the Royal Society B, 361(1476), 2109–2128. https://doi.org/10.1098/rstb.2006.1934",
        "Second-generation (atypical) antipsychotics differ from first-generation primarily because they:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology: Neuroscientific basis and practical applications (5th ed.). Cambridge University Press.",
        "In behavioral genetics, a heritability estimate of 0.50 means:":
            "Plomin, R., DeFries, J. C., Knopik, V. S., & Neiderhiser, J. M. (2016). Top 10 replicated findings from behavioral genetics. Perspectives on Psychological Science, 11(1), 3–23. https://doi.org/10.1177/1745691615617439",
        "A patient with left neglect syndrome most likely has damage to the:":
            "Corbetta, M., & Shulman, G. L. (2011). Spatial neglect and attention networks. Annual Review of Neuroscience, 34, 569–599. https://doi.org/10.1146/annurev-neuro-061010-113731",
        "Which brain imaging technique provides the BEST temporal resolution?":
            "Luck, S. J. (2014). An introduction to the event-related potential technique (2nd ed.). MIT Press.",
        "The adrenal glands release cortisol in response to stress via the:":
            "Herman, J. P., McKlveen, J. M., Ghosal, S., Kopp, B., Wulsin, A., Makinson, R., ... & Myers, B. (2016). Regulation of the hypothalamic-pituitary-adrenocortical stress response. Comprehensive Physiology, 6(2), 603–621. https://doi.org/10.1002/cphy.c150015",

        // ===== DOMAIN 2: Cognitive-Affective =====
        "A researcher conditions a dog to salivate to a tone, then pairs the tone with a light. Eventually, the light alone elicits salivation. This is:":
            "Pavlov, I. P. (1927). Conditioned reflexes: An investigation of the physiological activity of the cerebral cortex (G. V. Anrep, Trans.). Oxford University Press.",
        "According to dual-process theory, System 1 thinking is BEST characterized as:":
            "Kahneman, D. (2011). Thinking, fast and slow. Farrar, Straus and Giroux.",
        "Token economies are based primarily on principles of:":
            "Ayllon, T., & Azrin, N. (1968). The token economy: A motivational system for therapy and rehabilitation. Appleton-Century-Crofts.",
        "A child is rewarded for drawing. After the reward is removed, the child draws LESS than before rewards were introduced. This illustrates:":
            "Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. Psychological Bulletin, 125(6), 627–668. https://doi.org/10.1037/0033-2909.125.6.627",
        "Which memory system allows you to remember what you had for breakfast?":
            "Tulving, E. (1972). Episodic and semantic memory. In E. Tulving & W. Donaldson (Eds.), Organization of memory (pp. 381–403). Academic Press.",
        "The serial position effect demonstrates that items at the _____ and _____ of a list are best remembered.":
            "Murdock, B. B. (1962). The serial position effect of free recall. Journal of Experimental Psychology, 64(5), 482–488. https://doi.org/10.1037/h0045106",
        "A clinician suspects malingering. Which test feature would BEST help detect this?":
            "Tombaugh, T. N. (1996). Test of Memory Malingering (TOMM). Multi-Health Systems.",
        "According to Lazarus's transactional model of stress, the MOST critical factor determining the stress response is:":
            "Lazarus, R. S., & Folkman, S. (1984). Stress, appraisal, and coping. Springer.",
        "Flashbulb memories are characterized by:":
            "Brown, R., & Kulik, J. (1977). Flashbulb memories. Cognition, 5(1), 73–99. https://doi.org/10.1016/0010-0277(77)90018-X",
        "In operant conditioning, a variable-interval schedule would produce:":
            "Ferster, C. B., & Skinner, B. F. (1957). Schedules of reinforcement. Appleton-Century-Crofts.",
        "Tolman's research on latent learning demonstrated that:":
            "Tolman, E. C., & Honzik, C. H. (1930). Introduction and removal of reward, and maze performance in rats. University of California Publications in Psychology, 4, 257–275.",
        "The availability heuristic leads people to:":
            "Tversky, A., & Kahneman, D. (1973). Availability: A heuristic for judging frequency and probability. Cognitive Psychology, 5(2), 207–232. https://doi.org/10.1016/0010-0285(73)90033-9",
        "Garcia and Koelling's research on taste aversion demonstrated that:":
            "Garcia, J., & Koelling, R. A. (1966). Relation of cue to consequence in avoidance learning. Psychonomic Science, 4(1), 123–124. https://doi.org/10.3758/BF03342209",
        "A child who can sort objects by color OR shape, but not both simultaneously, is likely in Piaget's:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Encoding specificity principle predicts that memory retrieval is best when:":
            "Tulving, E., & Thomson, D. M. (1973). Encoding specificity and retrieval processes in episodic memory. Psychological Review, 80(5), 352–373. https://doi.org/10.1037/h0020071",

        // ===== DOMAIN 3: Social & Cultural =====
        "Zimbardo's Stanford Prison Experiment primarily demonstrated:":
            "Zimbardo, P. G. (2007). The Lucifer effect: Understanding how good people turn evil. Random House. See also: Haney, C., Banks, W. C., & Zimbardo, P. G. (1973). Interpersonal dynamics in a simulated prison. International Journal of Criminology and Penology, 1, 69–97.",
        "According to the contact hypothesis (Allport), prejudice is reduced when intergroup contact involves:":
            "Allport, G. W. (1954). The nature of prejudice. Addison-Wesley. See also: Pettigrew, T. F., & Tropp, L. R. (2006). A meta-analytic test of intergroup contact theory. Journal of Personality and Social Psychology, 90(5), 751–783. https://doi.org/10.1037/0022-3514.90.5.751",
        "In Sherif's Robbers Cave experiment, intergroup conflict was BEST reduced by:":
            "Sherif, M., Harvey, O. J., White, B. J., Hood, W. R., & Sherif, C. W. (1961). Intergroup conflict and cooperation: The Robbers Cave experiment. University of Oklahoma Book Exchange.",
        "The just-world hypothesis leads people to:":
            "Lerner, M. J. (1980). The belief in a just world: A fundamental delusion. Plenum Press. https://doi.org/10.1007/978-1-4899-0448-5",
        "Self-serving bias is MOST likely when:":
            "Miller, D. T., & Ross, M. (1975). Self-serving biases in the attribution of causality: Fact or fiction? Psychological Bulletin, 82(2), 213–225. https://doi.org/10.1037/h0076486",
        "Social identity theory (Tajfel) proposes that intergroup discrimination occurs because:":
            "Tajfel, H., & Turner, J. C. (1979). An integrative theory of intergroup conflict. In W. G. Austin & S. Worchel (Eds.), The social psychology of intergroup relations (pp. 33–47). Brooks/Cole.",
        "A person publicly agrees with a group but privately disagrees. This is an example of:":
            "Kelman, H. C. (1958). Compliance, identification, and internalization: Three processes of attitude change. Journal of Conflict Resolution, 2(1), 51–60. https://doi.org/10.1177/002200275800200106",
        "The door-in-the-face technique works by first:":
            "Cialdini, R. B., Vincent, J. E., Lewis, S. K., Catalan, J., Wheeler, D., & Darby, B. L. (1975). Reciprocal concessions procedure for inducing compliance: The door-in-the-face technique. Journal of Personality and Social Psychology, 31(2), 206–215. https://doi.org/10.1037/h0076284",
        "An African American student performs worse on a test described as measuring intelligence than on the same test described as a problem-solving exercise. This BEST illustrates:":
            "Steele, C. M., & Aronson, J. (1995). Stereotype threat and the intellectual test performance of African Americans. Journal of Personality and Social Psychology, 69(5), 797–811. https://doi.org/10.1037/0022-3514.69.5.797",
        "Collectivist cultures are MOST likely to emphasize:":
            "Triandis, H. C. (1995). Individualism and collectivism. Westview Press.",
        "According to realistic conflict theory (Sherif), intergroup hostility is caused by:":
            "Sherif, M. (1966). In common predicament: Social psychology of intergroup conflict and cooperation. Houghton Mifflin.",
        "Implicit bias is BEST measured by:":
            "Greenwald, A. G., McGhee, D. E., & Schwartz, J. L. K. (1998). Measuring individual differences in implicit cognition: The Implicit Association Test. Journal of Personality and Social Psychology, 74(6), 1464–1480. https://doi.org/10.1037/0022-3514.74.6.1464",
        "Informational social influence is MOST powerful when:":
            "Sherif, M. (1935). A study of some social factors in perception. Archives of Psychology, 27(187), 1–60. See also: Deutsch, M., & Gerard, H. B. (1955). A study of normative and informational social influences upon individual judgment. Journal of Abnormal and Social Psychology, 51(3), 629–636.",
        "The foot-in-the-door technique is based on:":
            "Freedman, J. L., & Fraser, S. C. (1966). Compliance without pressure: The foot-in-the-door technique. Journal of Personality and Social Psychology, 4(2), 195–202. https://doi.org/10.1037/h0023552",
        "Deindividuation is MOST likely to occur when:":
            "Zimbardo, P. G. (1969). The human choice: Individuation, reason, and order vs. deindividuation, impulse, and chaos. Nebraska Symposium on Motivation, 17, 237–307.",

        // ===== DOMAIN 4: Growth & Lifespan =====
        "Strange Situation procedure (Ainsworth) is used to assess:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment: A psychological study of the strange situation. Erlbaum.",
        "Scaffolding (Bruner, based on Vygotsky) involves:":
            "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. Journal of Child Psychology and Psychiatry, 17(2), 89–100. https://doi.org/10.1111/j.1469-7610.1976.tb00381.x",
        "Disorganized attachment (Main & Solomon, Type D) is characterized by:":
            "Main, M., & Solomon, J. (1990). Procedures for identifying infants as disorganized/disoriented during the Ainsworth Strange Situation. In M. T. Greenberg, D. Cicchetti, & E. M. Cummings (Eds.), Attachment in the preschool years (pp. 121–160). University of Chicago Press.",
        "Object permanence develops during Piaget's:":
            "Piaget, J. (1954). The construction of reality in the child (M. Cook, Trans.). Basic Books.",
        "Ainsworth's avoidant attachment (Type A) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment: A psychological study of the strange situation. Erlbaum.",
        "Harlow's surrogate mother studies demonstrated:":
            "Harlow, H. F. (1958). The nature of love. American Psychologist, 13(12), 673–685. https://doi.org/10.1037/h0047884",
        "Emerging adulthood (Arnett) refers to:":
            "Arnett, J. J. (2000). Emerging adulthood: A theory of development from the late teens through the twenties. American Psychologist, 55(5), 469–480. https://doi.org/10.1037/0003-066X.55.5.469",
        "Diana Baumrind's authoritative parenting is associated with:":
            "Baumrind, D. (1991). The influence of parenting style on adolescent competence and substance use. Journal of Early Adolescence, 11(1), 56–95. https://doi.org/10.1177/0272431691111004",

        // ===== DOMAIN 5: Assessment =====
        "The PAI (Personality Assessment Inventory) is preferred over the MMPI-2 by some clinicians because:":
            "Morey, L. C. (2007). The Personality Assessment Inventory professional manual (2nd ed.). Psychological Assessment Resources.",
        "Malingering on psychological tests involves:":
            "Rogers, R. (Ed.). (2008). Clinical assessment of malingering and deception (3rd ed.). Guilford Press.",
        "Sensitivity of a diagnostic test reflects:":
            "Groth-Marnat, G., & Wright, A. J. (2016). Handbook of psychological assessment (6th ed.). Wiley.",
        "Specificity of a diagnostic test reflects:":
            "Groth-Marnat, G., & Wright, A. J. (2016). Handbook of psychological assessment (6th ed.). Wiley.",
        "The Conners Rating Scales are specifically designed to assess:":
            "Conners, C. K. (2008). Conners 3rd edition manual. Multi-Health Systems.",
        "The MMPI-2 validity scales include:":
            "Ben-Porath, Y. S., & Tellegen, A. (2008). MMPI-2-RF (Minnesota Multiphasic Personality Inventory-2 Restructured Form): Manual for administration, scoring, and interpretation. University of Minnesota Press.",
        "The Beck Depression Inventory-II (BDI-II) is:":
            "Beck, A. T., Steer, R. A., & Brown, G. K. (1996). Manual for the Beck Depression Inventory-II. Psychological Corporation.",
        "The Vineland Adaptive Behavior Scales measure:":
            "Sparrow, S. S., Cicchetti, D. V., & Saulnier, C. A. (2016). Vineland Adaptive Behavior Scales, Third Edition (Vineland-3). Pearson.",
        "The NEO-PI-R (NEO Personality Inventory-Revised) measures:":
            "Costa, P. T., & McCrae, R. R. (1992). Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) professional manual. Psychological Assessment Resources.",
        "The Halstead-Reitan Neuropsychological Battery assesses:":
            "Reitan, R. M., & Wolfson, D. (1993). The Halstead-Reitan Neuropsychological Test Battery: Theory and clinical interpretation (2nd ed.). Neuropsychology Press.",
        "The MCMI-IV (Millon Clinical Multiaxial Inventory) is specifically designed to assess:":
            "Millon, T., Grossman, S., & Millon, C. (2015). MCMI-IV manual. NCS Pearson.",
        "The Bayley Scales of Infant Development measure:":
            "Bayley, N., & Aylward, G. P. (2019). Bayley Scales of Infant and Toddler Development (4th ed.). Pearson.",
        "The Nelson-Denny Reading Test assesses:":
            "Brown, J. I., Fishco, V. V., & Hanna, G. S. (1993). Nelson-Denny Reading Test. Riverside Publishing.",

        // ===== DOMAIN 6: Treatment =====
        "Prolonged exposure therapy (PE) for PTSD involves:":
            "Foa, E. B., Hembree, E. A., & Rothbaum, B. O. (2007). Prolonged exposure therapy for PTSD: Emotional processing of traumatic experiences—Therapist guide. Oxford University Press.",
        "The working alliance (Bordin) consists of:":
            "Bordin, E. S. (1979). The generalizability of the psychoanalytic concept of the working alliance. Psychotherapy: Theory, Research & Practice, 16(3), 252–260. https://doi.org/10.1037/h0085885",
        "Harm reduction approaches:":
            "Marlatt, G. A. (Ed.). (1998). Harm reduction: Pragmatic strategies for managing high-risk behaviors. Guilford Press.",
        "Emotion-focused therapy (EFT, Greenberg) views emotions as:":
            "Greenberg, L. S. (2015). Emotion-focused therapy: Coaching clients to work through their feelings (2nd ed.). American Psychological Association. https://doi.org/10.1037/14692-000",
        "Behavioral activation (BA) for depression focuses on:":
            "Martell, C. R., Dimidjian, S., & Herman-Dunn, R. (2010). Behavioral activation for depression: A clinician's guide. Guilford Press.",
        "The Premack principle states that:":
            "Premack, D. (1959). Toward empirical behavior laws: I. Positive reinforcement. Psychological Review, 66(4), 219–233. https://doi.org/10.1037/h0040891",
        "Structural family therapy (Minuchin) focuses on:":
            "Minuchin, S. (1974). Families and family therapy. Harvard University Press.",
        "Rational emotive behavior therapy (REBT, Ellis) uses the ABCDE model where:":
            "Ellis, A. (1962). Reason and emotion in psychotherapy. Lyle Stuart.",
        "Narrative therapy (White & Epston) helps clients:":
            "White, M., & Epston, D. (1990). Narrative means to therapeutic ends. W. W. Norton.",
        "Person-centered therapy (Rogers) considers the therapeutic relationship as:":
            "Rogers, C. R. (1957). The necessary and sufficient conditions of therapeutic personality change. Journal of Consulting Psychology, 21(2), 95–103. https://doi.org/10.1037/h0045357",
        "Existential therapy focuses on:":
            "Yalom, I. D. (1980). Existential psychotherapy. Basic Books.",
        "Gestalt therapy emphasizes:":
            "Perls, F. S., Hefferline, R. F., & Goodman, P. (1951). Gestalt therapy: Excitement and growth in the human personality. Julian Press.",
        "Solution-focused brief therapy (SFBT) assumes:":
            "de Shazer, S. (1985). Keys to solution in brief therapy. W. W. Norton.",
        "EMDR (Eye Movement Desensitization and Reprocessing) for PTSD involves:":
            "Shapiro, F. (2018). Eye movement desensitization and reprocessing (EMDR) therapy: Basic principles, protocols, and procedures (3rd ed.). Guilford Press.",
        "Evidence-based practice (EBP) in psychology integrates:":
            "American Psychological Association Presidential Task Force on Evidence-Based Practice. (2006). Evidence-based practice in psychology. American Psychologist, 61(4), 271–285. https://doi.org/10.1037/0003-066X.61.4.271",

        // ===== DOMAIN 7: Research =====
        "Effect size describes:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Institutional Review Boards (IRBs) are responsible for:":
            "U.S. Department of Health and Human Services. (2018). Federal policy for the protection of human subjects (Common Rule, 45 CFR 46). https://www.hhs.gov/ohrp/regulations-and-policy/regulations/45-cfr-46/index.html",
        "A meta-analysis:":
            "Borenstein, M., Hedges, L. V., Higgins, J. P. T., & Rothstein, H. R. (2009). Introduction to meta-analysis. Wiley. https://doi.org/10.1002/9780470743386",

        // ===== DOMAIN 8: Ethics =====
        "The Jaffee v. Redmond (1996) case established:":
            "Jaffee v. Redmond, 518 U.S. 1 (1996). https://supreme.justia.com/cases/federal/us/518/1/",
        "Standard 3.04 (Avoiding Harm) states that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct (2002, amended effective June 1, 2010, and January 1, 2017). https://www.apa.org/ethics/code",
        "Fee-splitting arrangements are:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.07. https://www.apa.org/ethics/code",
        "Forensic psychologists who provide treatment to a defendant should generally NOT:":
            "American Psychological Association. (2013). Specialty guidelines for forensic psychology. American Psychologist, 68(1), 7–19. https://doi.org/10.1037/a0029889",
        "The duty to warn third parties was FIRST established in:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976). See also: Tarasoff v. Regents of the University of California, 13 Cal. 3d 177 (1974).",
        "The Tarasoff II (1976) ruling expanded the duty from warning to:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976). https://law.justia.com/cases/california/supreme-court/3d/17/425.html",
        "Competence to stand trial requires that the defendant:":
            "Dusky v. United States, 362 U.S. 402 (1960). https://supreme.justia.com/cases/federal/us/362/402/",
        "The McNaughten rule (insanity defense) requires proving that:":
            "M'Naghten's Case, 10 Cl. & Fin. 200, 8 Eng. Rep. 718 (1843). See also: Melton, G. B., Petrila, J., Poythress, N. G., & Slobogin, C. (2018). Psychological evaluations for the courts (4th ed.). Guilford Press.",
        "The APA Ethics Code can be enforced by:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code See also: APA Ethics Committee rules and procedures. https://www.apa.org/ethics/code/committee",
        "The HIPAA Privacy Rule requires:":
            "U.S. Department of Health and Human Services. (2013). Summary of the HIPAA Privacy Rule. https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html"
    };

    /* Walk all domains and patch matching questions */
    let patched = 0;
    EPPPData.domains.forEach(domain => {
        domain.questions.forEach(question => {
            const ref = refs[question.q];
            if (ref && !question.reference) {
                question.reference = ref;
                patched++;
            }
        });
    });

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 1).`);
})();
