/* PasstheEPPP — APA Reference Overlay (Part 9)
   Targets uncited questions from batches 16, 19, and 23.
   Loaded AFTER references_overlay8.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Domain 1: Biological =====
        "The thalamus is often referred to as the brain's 'relay station' because it:":
            "Sherman, S. M., & Guillery, R. W. (2006). Exploring the thalamus and its role in cortical function (2nd ed.). MIT Press.",
        "Neurotransmitter deactivation occurs through all of the following EXCEPT:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology: Neuroscientific basis and practical applications (5th ed.). Cambridge University Press.",
        "The limbic system includes all EXCEPT:":
            "Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "During REM sleep:":
            "Hobson, J. A., & Pace-Schott, E. F. (2002). The cognitive neuroscience of sleep: Neuronal systems, consciousness and learning. Nature Reviews Neuroscience, 3(9), 679–693. https://doi.org/10.1038/nrn915",
        "The anterior cingulate cortex (ACC) is involved in:":
            "Bush, G., Luu, P., & Posner, M. I. (2000). Cognitive and emotional influences in anterior cingulate cortex. Trends in Cognitive Sciences, 4(6), 215–222. https://doi.org/10.1016/S1364-6613(00)01483-2",
        "Dopamine hypothesis of schizophrenia proposes:":
            "Howes, O. D., & Kapur, S. (2009). The dopamine hypothesis of schizophrenia: Version III — the final common pathway. Schizophrenia Bulletin, 35(3), 549–562. https://doi.org/10.1093/schbul/sbp006",
        "The cerebellum contains approximately what percentage of the brain's neurons?":
            "Herculano-Houzel, S. (2009). The human brain in numbers: A linearly scaled-up primate brain. Frontiers in Human Neuroscience, 3, 31. https://doi.org/10.3389/neuro.09.031.2009",
        "Afferent neurons carry information:":
            "Bear, M. F., Connors, B. W., & Paradiso, M. A. (2016). Neuroscience: Exploring the brain (4th ed.). Wolters Kluwer.",
        "Neurogenesis in adults has been documented primarily in the:":
            "Eriksson, P. S., Perfilieva, E., Björk-Eriksson, T., Alborn, A.-M., Nordborg, C., Peterson, D. A., & Gage, F. H. (1998). Neurogenesis in the adult human hippocampus. Nature Medicine, 4(11), 1313–1317. https://doi.org/10.1038/3305",
        "Benzodiazepines work by:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology (5th ed.). Cambridge University Press.",
        "Transcranial magnetic stimulation (TMS) works by:":
            "Hallett, M. (2007). Transcranial magnetic stimulation: A primer. Neuron, 55(2), 187–199. https://doi.org/10.1016/j.neuron.2007.06.026",
        "The orbitofrontal cortex (OFC) is important for:":
            "Rolls, E. T. (2004). The functions of the orbitofrontal cortex. Brain and Cognition, 55(1), 11–29. https://doi.org/10.1016/S0278-2626(03)00277-X",
        "Electroconvulsive therapy (ECT) is most effective for:":
            "UK ECT Review Group. (2003). Efficacy and safety of electroconvulsive therapy in depressive disorders. The Lancet, 361(9360), 799–808. https://doi.org/10.1016/S0140-6736(03)12705-5",
        "Synaptogenesis refers to:":
            "Huttenlocher, P. R. (2002). Neural plasticity: The effects of environment on the development of the cerebral cortex. Harvard University Press.",
        "Synaptic pruning during development:":
            "Huttenlocher, P. R., & Dabholkar, A. S. (1997). Regional differences in synaptogenesis in human cerebral cortex. Journal of Comparative Neurology, 387(2), 167–178. https://doi.org/10.1002/(SICI)1096-9861(19971020)387:2<167::AID-CNE1>3.0.CO;2-Z",
        "The dorsolateral prefrontal cortex (dlPFC) is critical for:":
            "Miller, E. K., & Cohen, J. D. (2001). An integrative theory of prefrontal cortex function. Annual Review of Neuroscience, 24, 167–202. https://doi.org/10.1146/annurev.neuro.24.1.167",
        "Selective serotonin reuptake inhibitors (SSRIs) have a therapeutic lag of approximately:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology (5th ed.). Cambridge University Press.",
        "Hemispatial neglect syndrome most commonly results from damage to the:":
            "Heilman, K. M., Watson, R. T., & Valenstein, E. (2003). Neglect and related disorders. In K. M. Heilman & E. Valenstein (Eds.), Clinical neuropsychology (4th ed., pp. 296–346). Oxford University Press.",
        "Fetal Alcohol Spectrum Disorders (FASD) can include:":
            "Hoyme, H. E., Kalberg, W. O., Elliott, A. J., Blankenship, J., Buckley, D., Marais, A.-S., ... & May, P. A. (2016). Updated clinical guidelines for diagnosing fetal alcohol spectrum disorders. Pediatrics, 138(2), e20154256. https://doi.org/10.1542/peds.2015-4256",
        "Agnosia is the inability to:":
            "Farah, M. J. (2004). Visual agnosia (2nd ed.). MIT Press.",
        "Atypical (second-generation) antipsychotics differ from typical antipsychotics in that they:":
            "Meltzer, H. Y. (2013). Update on typical and atypical antipsychotic drugs. Annual Review of Medicine, 64, 393–406. https://doi.org/10.1146/annurev-med-050911-161504",
        "Contralateral control means:":
            "Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "The raphe nuclei are the brain's primary source of:":
            "Jacobs, B. L., & Azmitia, E. C. (1992). Structure and function of the brain serotonin system. Physiological Reviews, 72(1), 165–229. https://doi.org/10.1152/physrev.1992.72.1.165",
        "Neuroimaging technique fMRI measures:":
            "Logothetis, N. K. (2008). What we can do and what we cannot do with fMRI. Nature, 453(7197), 869–878. https://doi.org/10.1038/nature06976",

        // ===== Domain 2: Cognitive-Affective =====
        "Proactive interference occurs when:":
            "Underwood, B. J. (1957). Interference and forgetting. Psychological Review, 64(1), 49–60. https://doi.org/10.1037/h0044616",
        "The Yerkes-Dodson law states that:":
            "Yerkes, R. M., & Dodson, J. D. (1908). The relation of strength of stimulus to rapidity of habit-formation. Journal of Comparative Neurology and Psychology, 18(5), 459–482. https://doi.org/10.1002/cne.920180503",
        "Prototype theory of categorization proposes that:":
            "Rosch, E. (1975). Cognitive representations of semantic categories. Journal of Experimental Psychology: General, 104(3), 192–233. https://doi.org/10.1037/0096-3445.104.3.192",
        "The anchoring bias occurs when people:":
            "Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124–1131. https://doi.org/10.1126/science.185.4157.1124",
        "Implicit memory is demonstrated by:":
            "Schacter, D. L. (1987). Implicit memory: History and current status. Journal of Experimental Psychology: Learning, Memory, and Cognition, 13(3), 501–518. https://doi.org/10.1037/0278-7393.13.3.501",
        "Confirmation bias leads people to:":
            "Nickerson, R. S. (1998). Confirmation bias: A ubiquitous phenomenon in many guises. Review of General Psychology, 2(2), 175–220. https://doi.org/10.1037/1089-2680.2.2.175",
        "Cognitive appraisal theory of emotion (Lazarus) argues that:":
            "Lazarus, R. S. (1991). Emotion and adaptation. Oxford University Press.",
        "The serial position effect shows that:":
            "Murdock, B. B. (1962). The serial position effect of free recall. Journal of Experimental Psychology, 64(5), 482–488. https://doi.org/10.1037/h0045106",
        "Deductive reasoning moves from:":
            "Johnson-Laird, P. N. (2006). How we reason. Oxford University Press.",
        "Inductive reasoning moves from:":
            "Holland, J. H., Holyoak, K. J., Nisbett, R. E., & Thagard, P. R. (1986). Induction: Processes of inference, learning, and discovery. MIT Press.",
        "State-dependent learning means:":
            "Goodwin, D. W., Powell, B., Bremer, D., Hoine, H., & Stern, J. (1969). Alcohol and recall: State-dependent effects in man. Science, 163(3873), 1358–1360. https://doi.org/10.1126/science.163.3873.1358",
        "Interference theory explains forgetting as:":
            "Anderson, M. C., & Neely, J. H. (1996). Interference and inhibition in memory retrieval. In E. L. Bjork & R. A. Bjork (Eds.), Memory (pp. 237–313). Academic Press.",
        "The method of loci is a mnemonic strategy that involves:":
            "Yates, F. A. (1966). The art of memory. University of Chicago Press.",
        "Change blindness refers to:":
            "Simons, D. J., & Rensink, R. A. (2005). Change blindness: Past, present, and future. Trends in Cognitive Sciences, 9(1), 16–20. https://doi.org/10.1016/j.tics.2004.11.006",
        "Elaborative rehearsal is more effective than maintenance rehearsal because:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671–684.",
        "Hindsight bias (the 'I knew it all along' effect) refers to:":
            "Fischhoff, B. (1975). Hindsight ≠ foresight: The effect of outcome knowledge on judgment under uncertainty. Journal of Experimental Psychology: Human Perception and Performance, 1(3), 288–299. https://doi.org/10.1037/0096-1523.1.3.288",
        "The dual-coding theory (Paivio) proposes that:":
            "Paivio, A. (1986). Mental representations: A dual coding approach. Oxford University Press.",
        "Cognitive load theory (Sweller) distinguishes between:":
            "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285. https://doi.org/10.1207/s15516709cog1202_4",

        // ===== Domain 3: Social & Cultural =====
        "Just-world beliefs (Lerner) are associated with:":
            "Lerner, M. J. (1980). The belief in a just world: A fundamental delusion. Plenum Press.",
        "The autokinetic effect (Sherif) was used to demonstrate:":
            "Sherif, M. (1936). The psychology of social norms. Harper & Brothers.",
        "Reciprocal determinism (Bandura) proposes that:":
            "Bandura, A. (1986). Social foundations of thought and action: A social cognitive theory. Prentice-Hall.",
        "The outgroup homogeneity effect is:":
            "Quattrone, G. A., & Jones, E. E. (1980). The perception of variability within in-groups and out-groups. Journal of Personality and Social Psychology, 38(1), 141–152. https://doi.org/10.1037/0022-3514.38.1.141",
        "Moral disengagement (Bandura) involves:":
            "Bandura, A. (1999). Moral disengagement in the perpetration of inhumanities. Personality and Social Psychology Review, 3(3), 193–209. https://doi.org/10.1207/s15327957pspr0303_3",
        "Pluralistic ignorance describes situations where:":
            "Prentice, D. A., & Miller, D. T. (1993). Pluralistic ignorance and alcohol use on campus. Journal of Personality and Social Psychology, 64(2), 243–256. https://doi.org/10.1037/0022-3514.64.2.243",
        "Cognitive neuroassociative model of aggression (Berkowitz) proposes that:":
            "Berkowitz, L. (1989). Frustration-aggression hypothesis: Examination and reformulation. Psychological Bulletin, 106(1), 59–73. https://doi.org/10.1037/0033-2909.106.1.59",
        "The Robbers Cave experiment (Sherif) demonstrated:":
            "Sherif, M., Harvey, O. J., White, B. J., Hood, W. R., & Sherif, C. W. (1961). Intergroup conflict and cooperation: The Robbers Cave experiment. University of Oklahoma Press.",
        "Cultural humility differs from cultural competence in emphasizing:":
            "Tervalon, M., & Murray-García, J. (1998). Cultural humility versus cultural competence: A critical distinction in defining physician training outcomes in multicultural education. Journal of Health Care for the Poor and Underserved, 9(2), 117–125. https://doi.org/10.1353/hpu.2010.0233",
        "The elaboration likelihood model predicts that the CENTRAL route to persuasion is used when:":
            "Petty, R. E., & Cacioppo, J. T. (1986). The elaboration likelihood model of persuasion. Advances in Experimental Social Psychology, 19, 123–205.",

        // ===== Domain 4: Growth & Lifespan =====
        "Assimilation in Piaget's theory involves:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Accommodation in Piaget's theory involves:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Erikson's stage of Generativity vs. Stagnation occurs during:":
            "Erikson, E. H. (1963). Childhood and society (2nd ed.). W. W. Norton.",
        "The zone of proximal development (ZPD) is:":
            "Vygotsky, L. S. (1978). Mind in society: The development of higher psychological processes. Harvard University Press.",
        "Crystallized intelligence (Gc) tends to:":
            "Horn, J. L., & Cattell, R. B. (1967). Age differences in fluid and crystallized intelligence. Acta Psychologica, 26, 107–129. https://doi.org/10.1016/0001-6918(67)90011-X",
        "Attachment theory (Bowlby) proposes that attachment serves:":
            "Bowlby, J. (1969). Attachment and loss: Vol. 1. Attachment. Basic Books.",
        "Gender identity is typically established by age:":
            "Kohlberg, L. (1966). A cognitive-developmental analysis of children's sex-role concepts and attitudes. In E. E. Maccoby (Ed.), The development of sex differences (pp. 82–173). Stanford University Press.",
        "Piaget's concept of centration means:":
            "Piaget, J. (1965). The child's conception of number (C. Gattegno & F. M. Hodgson, Trans.). W. W. Norton.",
        "Elisabeth Kübler-Ross's stages of grief should be understood as:":
            "Kübler-Ross, E. (1969). On death and dying. Macmillan.",
        "The secular trend in development refers to:":
            "Malina, R. M. (2004). Secular trends in growth, maturation and physical performance. American Journal of Human Biology, 16(5), 500–512. https://doi.org/10.1002/ajhb.20054",
        "Ainsworth's anxious-resistant (ambivalent, Type C) attachment is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "Puberty onset is primarily triggered by:":
            "Sisk, C. L., & Foster, D. L. (2004). The neural basis of puberty and adolescence. Nature Neuroscience, 7(10), 1040–1047. https://doi.org/10.1038/nn1326",
        "Lev Vygotsky's key contribution to developmental psychology was emphasizing:":
            "Vygotsky, L. S. (1978). Mind in society: The development of higher psychological processes. Harvard University Press.",
        "Egocentrism in Piaget's preoperational stage means:":
            "Piaget, J., & Inhelder, B. (1956). The child's conception of space. Routledge & Kegan Paul.",
        "The activity theory of aging proposes that:":
            "Havighurst, R. J. (1961). Successful aging. The Gerontologist, 1(1), 8–13. https://doi.org/10.1093/geront/1.1.8",
        "Diana Baumrind's authoritative parenting is associated with:":
            "Baumrind, D. (1991). The influence of parenting style on adolescent competence and substance use. Journal of Early Adolescence, 11(1), 56–95. https://doi.org/10.1177/0272431691111004",
        "Concrete operational thinking (Piaget, ages ~7-11) is characterized by:":
            "Piaget, J. (1965). The child's conception of number. W. W. Norton.",
        "Formal operational thinking (Piaget, ~12+) enables:":
            "Inhelder, B., & Piaget, J. (1958). The growth of logical thinking from childhood to adolescence. Basic Books.",
        "Ainsworth's attachment theory proposes that the INTERNAL WORKING MODEL:":
            "Bretherton, I. (1992). The origins of attachment theory: John Bowlby and Mary Ainsworth. Developmental Psychology, 28(5), 759–775. https://doi.org/10.1037/0012-1649.28.5.759",
        "Teratogens are:":
            "Moore, K. L., Persaud, T. V. N., & Torchia, M. G. (2016). The developing human: Clinically oriented embryology (10th ed.). Elsevier.",

        // ===== Domain 6: Treatment =====
        "Dialectical behavior therapy (DBT) was originally developed for:":
            "Linehan, M. M. (1993). Cognitive-behavioral treatment of borderline personality disorder. Guilford Press.",
        "Cognitive processing therapy (CPT) for PTSD focuses on:":
            "Resick, P. A., Monson, C. M., & Chard, K. M. (2017). Cognitive processing therapy for PTSD: A comprehensive manual. Guilford Press.",
        "Unconditional positive regard (Rogers) means:":
            "Rogers, C. R. (1957). The necessary and sufficient conditions of therapeutic personality change. Journal of Consulting Psychology, 21(2), 95–103. https://doi.org/10.1037/h0045357",
        "The common factors model of psychotherapy identifies:":
            "Wampold, B. E. (2015). How important are the common factors in psychotherapy? An update. World Psychiatry, 14(3), 270–277. https://doi.org/10.1002/wps.20238",
        "Systematic desensitization (Wolpe) involves:":
            "Wolpe, J. (1958). Psychotherapy by reciprocal inhibition. Stanford University Press.",
        "Multicultural counseling competencies require:":
            "Sue, D. W., Arredondo, P., & McDavis, R. J. (1992). Multicultural counseling competencies and standards: A call to the profession. Journal of Counseling & Development, 70(4), 477–486. https://doi.org/10.1002/j.1556-6676.1992.tb01642.x",
        "Termination in therapy should ideally:":
            "Norcross, J. C., Zimmerman, B. E., Greenberg, R. P., & Swift, J. K. (2017). Do all therapists do that when saying goodbye? A study of commonalities in termination behaviors. Psychotherapy, 54(1), 66–75. https://doi.org/10.1037/pst0000097",
        "Shaping in behavioral therapy involves:":
            "Skinner, B. F. (1953). Science and human behavior. Macmillan.",
        "The placebo effect in psychotherapy research demonstrates that:":
            "Kirsch, I. (2019). Placebo effect in the treatment of depression and anxiety. Frontiers in Psychiatry, 10, 407. https://doi.org/10.3389/fpsyt.2019.00407",
        "Existential therapy focuses on:":
            "Yalom, I. D. (1980). Existential psychotherapy. Basic Books.",
        "Gestalt therapy emphasizes:":
            "Perls, F. S., Hefferline, R. F., & Goodman, P. (1951). Gestalt therapy: Excitement and growth in the human personality. Julian Press.",
        "The therapeutic window for medication refers to:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology (5th ed.). Cambridge University Press.",
        "Person-centered therapy (Rogers) considers the therapeutic relationship as:":
            "Rogers, C. R. (1957). The necessary and sufficient conditions of therapeutic personality change. Journal of Consulting Psychology, 21(2), 95–103.",
        "Modeling (Bandura) in therapy involves:":
            "Bandura, A. (1977). Social learning theory. Prentice-Hall.",
        "Decisional balance in motivational interviewing involves:":
            "Miller, W. R., & Rollnick, S. (2013). Motivational interviewing: Helping people change (3rd ed.). Guilford Press.",
        "The empty chair technique is associated with:":
            "Perls, F. S. (1969). Gestalt therapy verbatim. Real People Press.",
        "Culturally adapted evidence-based treatments:":
            "Griner, D., & Smith, T. B. (2006). Culturally adapted mental health intervention: A meta-analytic review. Psychotherapy: Theory, Research, Practice, Training, 43(4), 531–548. https://doi.org/10.1037/0033-3204.43.4.531",
        "The Dodo bird verdict in psychotherapy research suggests:":
            "Luborsky, L., Singer, B., & Luborsky, L. (1975). Comparative studies of psychotherapies: Is it true that 'everyone has won and all must have prizes'? Archives of General Psychiatry, 32(8), 995–1008. https://doi.org/10.1001/archpsyc.1975.01760260059004",
        "Play therapy is particularly appropriate for children because:":
            "Landreth, G. L. (2012). Play therapy: The art of the relationship (3rd ed.). Routledge.",
        "Motivational enhancement therapy (MET) is a:":
            "Miller, W. R., Zweben, A., DiClemente, C. C., & Rychtarik, R. G. (1992). Motivational enhancement therapy manual (Project MATCH Monograph Series, Vol. 2). NIAAA.",

        // ===== Domain 7: Research =====
        "The null hypothesis (H₀) typically states that:":
            "Fisher, R. A. (1925). Statistical methods for research workers. Oliver & Boyd.",
        "A p-value of .03 means:":
            "Wasserstein, R. L., & Lazar, N. A. (2016). The ASA statement on p-values: Context, process, and purpose. The American Statistician, 70(2), 129–133. https://doi.org/10.1080/00031305.2016.1154108",
        "Maturation is a threat to internal validity because:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Attrition (mortality) threatens validity because:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "A double-blind study means:":
            "Rosenthal, R., & Rosnow, R. L. (2008). Essentials of behavioral research (3rd ed.). McGraw-Hill.",
        "The Bonferroni correction is used to:":
            "Bland, J. M., & Altman, D. G. (1995). Multiple significance tests: The Bonferroni method. BMJ, 310(6973), 170. https://doi.org/10.1136/bmj.310.6973.170",
        "Construct validity of a study is concerned with:":
            "Cronbach, L. J., & Meehl, P. E. (1955). Construct validity in psychological tests. Psychological Bulletin, 52(4), 281–302. https://doi.org/10.1037/h0040957",
        "ANOVA is used to compare:":
            "Fisher, R. A. (1925). Statistical methods for research workers. Oliver & Boyd.",
        "Retrospective studies differ from prospective studies in that retrospective studies:":
            "Grimes, D. A., & Schulz, K. F. (2002). Cohort studies: Marching towards outcomes. The Lancet, 359(9303), 341–345. https://doi.org/10.1016/S0140-6736(02)07500-1",
        "Social desirability bias occurs when participants:":
            "Paulhus, D. L. (1991). Measurement and control of response bias. In J. P. Robinson, P. R. Shaver, & L. S. Wrightsman (Eds.), Measures of personality and social psychological attitudes (pp. 17–59). Academic Press.",
        "Power in statistical testing refers to:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "A longitudinal study follows:":
            "Baltes, P. B. (1968). Longitudinal and cross-sectional sequences in the study of age and generation effects. Human Development, 11(3), 145–171. https://doi.org/10.1159/000270604",
        "Selection bias threatens internal validity because:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Chi-square (χ²) tests are used to analyze:":
            "Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. Philosophical Magazine, 50(302), 157–175.",
        "Demand characteristics are:":
            "Orne, M. T. (1962). On the social psychology of the psychological experiment. American Psychologist, 17(11), 776–783. https://doi.org/10.1037/h0043424",
        "Stratified random sampling:":
            "Kish, L. (1965). Survey sampling. Wiley.",

        // ===== Domain 8: Ethics =====
        "Standard 10.10 (Terminating Therapy) states that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.10. https://www.apa.org/ethics/code",
        "Standard 10.08 prohibits sexual relationships with FORMER clients for:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.08. https://www.apa.org/ethics/code",
        "The ethical principle of Justice directs psychologists to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle D. https://www.apa.org/ethics/code",
        "When a psychologist is aware of potential impairment in a colleague, they should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standards 1.04 & 1.05. https://www.apa.org/ethics/code",
        "Supervision in psychology training requires that the supervisor:":
            "Falender, C. A., & Shafranske, E. P. (2004). Clinical supervision: A competency-based approach. American Psychological Association. https://doi.org/10.1037/10806-000"
    };

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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 9).`);
})();
