/* PasstheEPPP — APA Reference Overlay (Part 8)
   Targets uncited questions from batches 22, 25, and earlier gaps.
   Loaded AFTER references_overlay7.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Domain 1: Biological =====
        "The fornix connects the:":
            "Aggleton, J. P., & Brown, M. W. (1999). Episodic memory, amnesia, and the hippocampal–anterior thalamic axis. Behavioral and Brain Sciences, 22(3), 425–489. https://doi.org/10.1017/S0140525X99002034",
        "Tardive dyskinesia is a side effect of:":
            "Correll, C. U., Kane, J. M., & Citrome, L. L. (2017). Epidemiology, prevention, and assessment of tardive dyskinesia. Journal of Clinical Psychiatry, 78(8), 1136–1147. https://doi.org/10.4088/JCP.tv17016ah4c",
        "Retrograde amnesia involves:":
            "Squire, L. R., & Alvarez, P. (1995). Retrograde amnesia and memory consolidation: A neurobiological perspective. Current Opinion in Neurobiology, 5(2), 169–177. https://doi.org/10.1016/0959-4388(95)80023-9",
        "Wernicke's encephalopathy is an ACUTE condition caused by:":
            "Harper, C. G., Giles, M., & Finlay-Jones, R. (1986). Clinical signs in the Wernicke-Korsakoff complex: A retrospective analysis of 131 cases. Journal of Neurology, Neurosurgery & Psychiatry, 49(4), 341–345. https://doi.org/10.1136/jnnp.49.4.341",
        "The locus coeruleus is the brain's primary source of:":
            "Berridge, C. W., & Waterhouse, B. D. (2003). The locus coeruleus–noradrenergic system: Modulation of behavioral state and state-dependent cognitive processes. Brain Research Reviews, 42(1), 33–84. https://doi.org/10.1016/S0165-0173(03)00143-7",
        "Apraxia refers to:":
            "Heilman, K. M., & Rothi, L. J. G. (2003). Apraxia. In K. M. Heilman & E. Valenstein (Eds.), Clinical neuropsychology (4th ed., pp. 215–235). Oxford University Press.",
        "Omega-3 fatty acids are important for brain health because:":
            "Bazinet, R. P., & Layé, S. (2014). Polyunsaturated fatty acids and their metabolites in brain function and disease. Nature Reviews Neuroscience, 15(12), 771–785. https://doi.org/10.1038/nrn3820",
        "Huntington's disease is characterized by:":
            "Walker, F. O. (2007). Huntington's disease. The Lancet, 369(9557), 218–228. https://doi.org/10.1016/S0140-6736(07)60111-1",
        "The split-brain studies (Sperry, Gazzaniga) revealed:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. Nature Reviews Neuroscience, 6(8), 653–659. https://doi.org/10.1038/nrn1723",
        "Endorphins are endogenous opioids that:":
            "Sprouse-Blum, A. S., Smith, G., Sugai, D., & Parsa, F. D. (2010). Understanding endorphins and their importance in pain management. Hawaii Medical Journal, 69(3), 70–71.",
        "The nucleus accumbens is part of the brain's:":
            "Salgado, S., & Kaplitt, M. G. (2015). The nucleus accumbens: A comprehensive review. Stereotactic and Functional Neurosurgery, 93(2), 75–93. https://doi.org/10.1159/000368279",
        "Phenylketonuria (PKU) is a genetic disorder that:":
            "National Institutes of Health. (2000). Phenylketonuria: Screening and management. NIH Consensus Statement, 17(3), 1–33.",
        "The ventral tegmental area (VTA) is the origin of the:":
            "Wise, R. A. (2004). Dopamine, learning and motivation. Nature Reviews Neuroscience, 5(6), 483–494. https://doi.org/10.1038/nrn1406",
        "The default mode network (DMN) is most active during:":
            "Raichle, M. E. (2015). The brain's default mode network. Annual Review of Neuroscience, 38, 433–447. https://doi.org/10.1146/annurev-neuro-071013-014030",
        "Broca's aphasia is characterized by:":
            "Goodglass, H., Kaplan, E., & Barresi, B. (2001). The assessment of aphasia and related disorders (3rd ed.). Lippincott Williams & Wilkins.",

        // ===== Domain 2: Cognitive-Affective =====
        "Levels of processing theory (Craik & Lockhart) predicts:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671–684. https://doi.org/10.1016/S0022-5371(72)80001-X",
        "Chunking in working memory:":
            "Miller, G. A. (1956). The magical number seven, plus or minus two. Psychological Review, 63(2), 81–97. https://doi.org/10.1037/h0043158",
        "The spotlight model of attention proposes that:":
            "Posner, M. I. (1980). Orienting of attention. Quarterly Journal of Experimental Psychology, 32(1), 3–25. https://doi.org/10.1080/00335558008248231",
        "The mere exposure effect (Zajonc) demonstrates that:":
            "Zajonc, R. B. (1968). Attitudinal effects of mere exposure. Journal of Personality and Social Psychology, 9(2, Pt. 2), 1–27. https://doi.org/10.1037/h0025848",
        "The encoding specificity principle (Tulving) states that:":
            "Tulving, E., & Thomson, D. M. (1973). Encoding specificity and retrieval processes in episodic memory. Psychological Review, 80(5), 352–373. https://doi.org/10.1037/h0020071",
        "The planning fallacy (Kahneman & Tversky) refers to:":
            "Kahneman, D., & Tversky, A. (1979). Intuitive prediction: Biases and corrective procedures. TIMS Studies in Management Science, 12, 313–327.",
        "Selective attention (cherry-picking information) can be explained by:":
            "Broadbent, D. E. (1958). Perception and communication. Pergamon Press.",
        "Overconfidence bias refers to:":
            "Lichtenstein, S., Fischhoff, B., & Phillips, L. D. (1982). Calibration of probabilities. In D. Kahneman, P. Slovic, & A. Tversky (Eds.), Judgment under uncertainty (pp. 306–334). Cambridge University Press.",
        "Negative reinforcement differs from punishment in that negative reinforcement:":
            "Skinner, B. F. (1953). Science and human behavior. Macmillan.",
        "The spacing effect demonstrates that:":
            "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks. Review of General Psychology, 10(4), 354–380. https://doi.org/10.1037/1089-2680.10.4.354",
        "The Stroop effect demonstrates:":
            "Stroop, J. R. (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology, 18(6), 643–662. https://doi.org/10.1037/h0054651",
        "Cognitive dissonance (Festinger) is reduced by:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",
        "Transfer-appropriate processing proposes that:":
            "Morris, C. D., Bransford, J. D., & Franks, J. J. (1977). Levels of processing versus transfer appropriate processing. Journal of Verbal Learning and Verbal Behavior, 16(5), 519–533. https://doi.org/10.1016/S0022-5371(77)80016-9",
        "The sunk cost fallacy leads people to:":
            "Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost. Organizational Behavior and Human Decision Processes, 35(1), 124–140. https://doi.org/10.1016/0749-5978(85)90049-4",
        "The generation effect demonstrates that:":
            "Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. Journal of Experimental Psychology: Human Learning and Memory, 4(6), 592–604. https://doi.org/10.1037/0278-7393.4.6.592",
        "Functional fixedness prevents people from:":
            "Duncker, K. (1945). On problem-solving (L. S. Lees, Trans.). Psychological Monographs, 58(5, Whole No. 270).",
        "The cocktail party effect demonstrates:":
            "Cherry, E. C. (1953). Some experiments on the recognition of speech, with one and with two ears. Journal of the Acoustical Society of America, 25(5), 975–979. https://doi.org/10.1121/1.1907229",
        "Source monitoring errors occur when:":
            "Johnson, M. K., Hashtroudi, S., & Lindsay, D. S. (1993). Source monitoring. Psychological Bulletin, 114(1), 3–28. https://doi.org/10.1037/0033-2909.114.1.3",
        "The testing effect (retrieval practice) demonstrates that:":
            "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x",
        "Baddeley's model of working memory includes:":
            "Baddeley, A. D. (2000). The episodic buffer: A new component of working memory? Trends in Cognitive Sciences, 4(11), 417–423. https://doi.org/10.1016/S1364-6613(00)01538-2",
        "Peak-end rule (Kahneman) states that:":
            "Kahneman, D., Fredrickson, B. L., Schreiber, C. A., & Redelmeier, D. A. (1993). When more pain is preferred to less: Adding a better end. Psychological Science, 4(6), 401–405. https://doi.org/10.1111/j.1467-9280.1993.tb00589.x",
        "The representativeness heuristic leads to errors when:":
            "Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124–1131. https://doi.org/10.1126/science.185.4157.1124",

        // ===== Domain 3: Social & Cultural =====
        "The door-in-the-face technique involves:":
            "Cialdini, R. B., Vincent, J. E., Lewis, S. K., Catalan, J., Wheeler, D., & Darby, B. L. (1975). Reciprocal concessions procedure for inducing compliance: The door-in-the-face technique. Journal of Personality and Social Psychology, 31(2), 206–215. https://doi.org/10.1037/h0076284",
        "The foot-in-the-door technique works by:":
            "Freedman, J. L., & Fraser, S. C. (1966). Compliance without pressure: The foot-in-the-door technique. Journal of Personality and Social Psychology, 4(2), 195–202. https://doi.org/10.1037/h0023552",
        "Groupthink (Janis) is MORE likely when:":
            "Janis, I. L. (1982). Groupthink: Psychological studies of policy decisions and fiascoes (2nd ed.). Houghton Mifflin.",
        "The social identity approach to prejudice (Tajfel's minimal group paradigm) showed:":
            "Tajfel, H., Billig, M. G., Bundy, R. P., & Flament, C. (1971). Social categorization and intergroup behaviour. European Journal of Social Psychology, 1(2), 149–178. https://doi.org/10.1002/ejsp.2420010202",
        "The fundamental attribution error is LESS common in:":
            "Choi, I., Nisbett, R. E., & Norenzayan, A. (1999). Causal attribution across cultures: Variation and universality. Psychological Bulletin, 125(1), 47–63. https://doi.org/10.1037/0033-2909.125.1.47",
        "The Stanford Prison Experiment (Zimbardo) demonstrated:":
            "Zimbardo, P. G. (2007). The Lucifer effect: Understanding how good people turn evil. Random House.",
        "Minority influence (Moscovici) is most effective when the minority:":
            "Moscovici, S., Lage, E., & Naffrechoux, M. (1969). Influence of a consistent minority on the responses of a majority in a color perception task. Sociometry, 32(4), 365–380. https://doi.org/10.2307/2786541",
        "The elaboration likelihood model (ELM, Petty & Cacioppo) proposes:":
            "Petty, R. E., & Cacioppo, J. T. (1986). The elaboration likelihood model of persuasion. In L. Berkowitz (Ed.), Advances in experimental social psychology (Vol. 19, pp. 123–205). Academic Press.",
        "Relative deprivation theory proposes that social unrest results from:":
            "Runciman, W. G. (1966). Relative deprivation and social justice. Routledge & Kegan Paul.",
        "The actor-observer bias states that:":
            "Jones, E. E., & Nisbett, R. E. (1971). The actor and the observer: Divergent perceptions of the causes of behavior. General Learning Press.",
        "Social comparison theory (Festinger) proposes that people:":
            "Festinger, L. (1954). A theory of social comparison processes. Human Relations, 7(2), 117–140. https://doi.org/10.1177/001872675400700202",
        "Attribution theory (Heider, Weiner) examines how people:":
            "Weiner, B. (1985). An attributional theory of achievement motivation and emotion. Psychological Review, 92(4), 548–573. https://doi.org/10.1037/0033-295X.92.4.548",
        "System justification theory proposes that:":
            "Jost, J. T., & Banaji, M. R. (1994). The role of stereotyping in system-justification and the production of false consciousness. British Journal of Social Psychology, 33(1), 1–27. https://doi.org/10.1111/j.2044-8309.1994.tb01008.x",
        "The self-fulfilling prophecy occurs when:":
            "Merton, R. K. (1948). The self-fulfilling prophecy. The Antioch Review, 8(2), 193–210.",
        "Microaggressions are:":
            "Sue, D. W., Capodilupo, C. M., Torino, G. C., Bucceri, J. M., Holder, A. M. B., Nadal, K. L., & Esquilin, M. (2007). Racial microaggressions in everyday life. American Psychologist, 62(4), 271–286. https://doi.org/10.1037/0003-066X.62.4.271",

        // ===== Domain 4: Growth & Lifespan =====
        "Harlow's surrogate mother studies demonstrated:":
            "Harlow, H. F. (1958). The nature of love. American Psychologist, 13(12), 673–685. https://doi.org/10.1037/h0047884",
        "Stranger anxiety typically appears around:":
            "Sroufe, L. A. (1977). Wariness of strangers and the study of infant development. Child Development, 48(3), 731–746. https://doi.org/10.2307/1128323",
        "Separation anxiety typically appears around:":
            "Bowlby, J. (1969). Attachment and loss: Vol. 1. Attachment. Basic Books.",
        "Continuity vs. discontinuity in development refers to the debate about whether:":
            "Lerner, R. M. (2002). Concepts and theories of human development (3rd ed.). Erlbaum.",
        "Secure attachment (Ainsworth Type B) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "Kohlberg's conventional level of moral reasoning includes:":
            "Kohlberg, L. (1981). The philosophy of moral development: Moral stages and the idea of justice. Harper & Row.",
        "Fluid intelligence (Gf) typically:":
            "Horn, J. L., & Cattell, R. B. (1967). Age differences in fluid and crystallized intelligence. Acta Psychologica, 26, 107–129. https://doi.org/10.1016/0001-6918(67)90011-X",
        "Authoritarian parenting (Baumrind) is characterized by:":
            "Baumrind, D. (1971). Current patterns of parental authority. Developmental Psychology Monographs, 4(1, Pt. 2), 1–103. https://doi.org/10.1037/h0030372",
        "Permissive parenting (Baumrind) is characterized by:":
            "Baumrind, D. (1971). Current patterns of parental authority. Developmental Psychology Monographs, 4(1, Pt. 2), 1–103.",
        "Selective optimization with compensation (SOC, Baltes) proposes that successful aging involves:":
            "Baltes, P. B., & Baltes, M. M. (1990). Psychological perspectives on successful aging: The model of selective optimization with compensation. In P. B. Baltes & M. M. Baltes (Eds.), Successful aging (pp. 1–34). Cambridge University Press.",
        "Erikson's identity vs. role confusion (adolescence) involves:":
            "Erikson, E. H. (1968). Identity: Youth and crisis. W. W. Norton.",
        "Cross-sectional research designs in developmental psychology:":
            "Schaie, K. W. (1965). A general model for the study of developmental problems. Psychological Bulletin, 64(2), 92–107. https://doi.org/10.1037/h0022371",
        "Sequential designs (Schaie) combine:":
            "Schaie, K. W. (1965). A general model for the study of developmental problems. Psychological Bulletin, 64(2), 92–107.",
        "Theory of mind (ToM) develops around age:":
            "Wimmer, H., & Perner, J. (1983). Beliefs about beliefs: Representation and constraining function of wrong beliefs in young children's understanding of deception. Cognition, 13(1), 103–128. https://doi.org/10.1016/0010-0277(83)90004-5",
        "Moral development in Gilligan's care perspective emphasizes:":
            "Gilligan, C. (1982). In a different voice: Psychological theory and women's development. Harvard University Press.",

        // ===== Domain 5: Assessment =====
        "The MMPI-2 validity scales include:":
            "Butcher, J. N., Graham, J. R., Ben-Porath, Y. S., Tellegen, A., Dahlstrom, W. G., & Kaemmer, B. (2001). MMPI-2 manual for administration and scoring (Rev. ed.). University of Minnesota Press.",
        "Standard error of measurement (SEM) reflects:":
            "Nunnally, J. C., & Bernstein, I. H. (1994). Psychometric theory (3rd ed.). McGraw-Hill.",
        "Projective tests are based on the hypothesis that:":
            "Frank, L. K. (1939). Projective methods for the study of personality. Journal of Psychology, 8(2), 389–413. https://doi.org/10.1080/00223980.1939.9917671",
        "The Nelson-Denny Reading Test assesses:":
            "Brown, J. I., Fishco, V. V., & Hanna, G. (1993). The Nelson-Denny Reading Test. Riverside Publishing.",
        "Content validity is established by:":
            "Messick, S. (1995). Validity of psychological assessment: Validation of inferences from persons' responses and performances as scientific inquiry into score meaning. American Psychologist, 50(9), 741–749. https://doi.org/10.1037/0003-066X.50.9.741",
        "The WISC-V (Wechsler Intelligence Scale for Children) is designed for ages:":
            "Wechsler, D. (2014). Wechsler Intelligence Scale for Children—Fifth Edition (WISC-V). Pearson.",
        "Incremental validity asks whether:":
            "Hunsley, J., & Meyer, G. J. (2003). The incremental validity of psychological testing and assessment. Psychological Assessment, 15(4), 446–455. https://doi.org/10.1037/1040-3590.15.4.446",
        "A T-score of 70 on the MMPI-2 indicates:":
            "Butcher, J. N. (2011). A beginner's guide to the MMPI-2 (3rd ed.). American Psychological Association.",
        "Ceiling and floor effects in testing:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Face validity refers to:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Inter-rater reliability is assessed by:":
            "Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: Uses in assessing rater reliability. Psychological Bulletin, 86(2), 420–428. https://doi.org/10.1037/0033-2909.86.2.420",

        // ===== Domain 6: Treatment =====
        "The Premack principle states that:":
            "Premack, D. (1959). Toward empirical behavior laws: I. Positive reinforcement. Psychological Review, 66(4), 219–233. https://doi.org/10.1037/h0040891",
        "Structural family therapy (Minuchin) focuses on:":
            "Minuchin, S. (1974). Families and family therapy. Harvard University Press.",
        "Rational emotive behavior therapy (REBT, Ellis) uses the ABCDE model where:":
            "Ellis, A. (1962). Reason and emotion in psychotherapy. Lyle Stuart.",
        "Therapeutic factors unique to GROUP therapy (Yalom) include:":
            "Yalom, I. D., & Leszcz, M. (2005). The theory and practice of group psychotherapy (5th ed.). Basic Books.",
        "Bowen's family therapy focuses on:":
            "Bowen, M. (1978). Family therapy in clinical practice. Jason Aronson.",
        "Evidence-based practice (EBP) in psychology integrates:":
            "APA Presidential Task Force on Evidence-Based Practice. (2006). Evidence-based practice in psychology. American Psychologist, 61(4), 271–285. https://doi.org/10.1037/0003-066X.61.4.271",
        "Overcorrection in behavioral therapy involves:":
            "Foxx, R. M., & Azrin, N. H. (1973). The elimination of autistic self-stimulatory behavior by overcorrection. Journal of Applied Behavior Analysis, 6(1), 1–14. https://doi.org/10.1901/jaba.1973.6-1",
        "Cognitive defusion in ACT involves:":
            "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). Acceptance and commitment therapy: The process and practice of mindful change (2nd ed.). Guilford Press.",
        "Acceptance and Commitment Therapy (ACT) emphasizes:":
            "Hayes, S. C., Luoma, J. B., Bond, F. W., Masuda, A., & Lillis, J. (2006). Acceptance and commitment therapy: Model, processes and outcomes. Behaviour Research and Therapy, 44(1), 1–25. https://doi.org/10.1016/j.brat.2005.06.006",
        "Contingency management uses:":
            "Petry, N. M. (2000). A comprehensive guide to the application of contingency management procedures in clinical settings. Drug and Alcohol Dependence, 58(1-2), 9–25. https://doi.org/10.1016/S0376-8716(99)00071-X",
        "Exposure and response prevention (ERP) is the gold-standard treatment for:":
            "Foa, E. B., Yadin, E., & Lichner, T. K. (2012). Exposure and response (ritual) prevention for obsessive-compulsive disorder: Therapist guide (2nd ed.). Oxford University Press.",
        "Paradoxical intention (Frankl) involves:":
            "Frankl, V. E. (1967). Psychotherapy and existentialism: Selected papers on logotherapy. Washington Square Press.",
        "The stages of change model (Prochaska & DiClemente) includes:":
            "Prochaska, J. O., & DiClemente, C. C. (1983). Stages and processes of self-change of smoking. Journal of Consulting and Clinical Psychology, 51(3), 390–395. https://doi.org/10.1037/0022-006X.51.3.390",
        "Interpersonal therapy (IPT) focuses primarily on:":
            "Klerman, G. L., Weissman, M. M., Rounsaville, B. J., & Chevron, E. S. (1984). Interpersonal psychotherapy of depression. Basic Books.",
        "Reality therapy (Glasser) focuses on:":
            "Glasser, W. (1998). Choice theory: A new psychology of personal freedom. HarperCollins.",
        "Psychoeducation in therapy involves:":
            "Lukens, E. P., & McFarlane, W. R. (2004). Psychoeducation as evidence-based practice. Brief Treatment and Crisis Intervention, 4(3), 205–225. https://doi.org/10.1093/brief-treatment/mhh019",
        "The transference neurosis in psychoanalysis occurs when:":
            "Freud, S. (1912). The dynamics of transference. Standard Edition, 12, 97–108.",

        // ===== Domain 7: Research =====
        "The Hawthorne effect refers to:":
            "McCarney, R., Warner, J., Iliffe, S., van Haselen, R., Griffin, M., & Fisher, P. (2007). The Hawthorne Effect: A randomised, controlled trial. BMC Medical Research Methodology, 7, 30. https://doi.org/10.1186/1471-2288-7-30",
        "Cronbach's alpha measures:":
            "Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika, 16(3), 297–334. https://doi.org/10.1007/BF02310555",
        "External validity refers to:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Internal validity refers to:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Type I error occurs when:":
            "Neyman, J., & Pearson, E. S. (1933). On the problem of the most efficient tests of statistical hypotheses. Philosophical Transactions of the Royal Society A, 231(694–706), 289–337. https://doi.org/10.1098/rsta.1933.0009",
        "Type II error occurs when:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",

        // ===== Domain 8: Ethics =====
        "Standard 2.01 (Boundaries of Competence) requires that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.01. https://www.apa.org/ethics/code",
        "Multiple relationships become problematic when they:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.05. https://www.apa.org/ethics/code",
        "Psychologists using psychological tests must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 9.02. https://www.apa.org/ethics/code",
        "Deception in research (Standard 8.07) is permitted ONLY when:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 8.07. https://www.apa.org/ethics/code",
        "When a psychologist disagrees with a court order to release records, they should:":
            "Koocher, G. P., & Keith-Spiegel, P. (2016). Ethics in psychology and the mental health professions (4th ed.). Oxford University Press.",
        "The Tarasoff II (1976) ruling expanded the duty from warning to:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976). https://law.justia.com/cases/california/supreme-court/3d/17/425.html",
        "Psychologists who become aware of a child abuse situation are:":
            "Kalichman, S. C. (1999). Mandated reporting of suspected child abuse: Ethics, law, and policy (2nd ed.). American Psychological Association.",
        "The concept of minimal disclosure means:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. See Standards 4.04 & 4.05. https://www.apa.org/ethics/code",
        "Standard 3.10 (Informed Consent) applies to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.10. https://www.apa.org/ethics/code",
        "When providing testimony in court, psychologists must:":
            "American Psychological Association. (2013). Specialty guidelines for forensic psychology. American Psychologist, 68(1), 7–19. https://doi.org/10.1037/a0029889",
        "Principle A (Beneficence and Nonmaleficence) directs psychologists to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct — General Principles. https://www.apa.org/ethics/code",
        "Pro bono services are:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle B. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 8).`);
})();
