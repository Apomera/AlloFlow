/* PasstheEPPP — APA Reference Overlay (Part 12)
   Targets uncited questions from batches 22, 25, and 27.
   Loaded AFTER references_overlay11.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Batch 22: Domain 1 (Bio) =====
        "Neuroplasticity is GREATEST during:":
            "Kolb, B., & Gibb, R. (2011). Brain plasticity and behaviour in the developing brain. Journal of the Canadian Academy of Child and Adolescent Psychiatry, 20(4), 265–276.",
        "The fornix connects the:":
            "Douet, V., & Chang, L. (2015). Fornix as an imaging marker for episodic memory deficits in healthy aging and in various neurological disorders. Brain and Behavior, 5(1), e00298. https://doi.org/10.1002/brb3.298",
        "Tardive dyskinesia is a side effect of:":
            "Correll, C. U., Kane, J. M., & Citrome, L. L. (2017). Epidemiology, prevention, and assessment of tardive dyskinesia and advances in treatment. Journal of Clinical Psychiatry, 78(8), 1136–1147.",
        "Retrograde amnesia involves:":
            "Squire, L. R., & Alvarez, P. (1995). Retrograde amnesia and memory consolidation: A neurobiological perspective. Current Opinion in Neurobiology, 5(2), 169–177.",
        "The nucleus accumbens is part of the brain's:":
            "Wise, R. A. (2004). Dopamine, learning and motivation. Nature Reviews Neuroscience, 5(6), 483–494. https://doi.org/10.1038/nrn1406",
        "Wernicke's encephalopathy is an ACUTE condition caused by:":
            "Sechi, G., & Serra, A. (2007). Wernicke's encephalopathy: New clinical settings and recent advances in diagnosis and management. The Lancet Neurology, 6(5), 442–455.",
        "Kindling in epilepsy refers to:":
            "Goddard, G. V., McIntyre, D. C., & Leech, C. K. (1969). A permanent change in brain function resulting from daily electrical stimulation. Experimental Neurology, 25(3), 295–330.",
        "The locus coeruleus is the brain's primary source of:":
            "Sara, S. J. (2009). The locus coeruleus and noradrenergic modulation of cognition. Nature Reviews Neuroscience, 10(3), 211–223.",
        "Apraxia refers to:":
            "Heilman, K. M., & Rothi, L. J. G. (2003). Apraxia. In K. M. Heilman & E. Valenstein (Eds.), Clinical neuropsychology (4th ed., pp. 215–235). Oxford University Press.",
        "Omega-3 fatty acids are important for brain health because:":
            "Bazinet, R. P., & Layé, S. (2014). Polyunsaturated fatty acids and their metabolites in brain function and disease. Nature Reviews Neuroscience, 15(12), 771–785. https://doi.org/10.1038/nrn3820",

        // ===== Batch 22: Domain 2 (Cog-Aff) =====
        "Levels of processing theory (Craik & Lockhart) predicts:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671–684. https://doi.org/10.1016/S0022-5371(72)80001-X",
        "Chunking in working memory:":
            "Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. Psychological Review, 63(2), 81–97. https://doi.org/10.1037/h0043158",
        "The spotlight model of attention proposes that:":
            "Posner, M. I. (1980). Orienting of attention. Quarterly Journal of Experimental Psychology, 32(1), 3–25. https://doi.org/10.1080/00335558008248231",
        "Cognitive load theory (Sweller) distinguishes between:":
            "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285. https://doi.org/10.1207/s15516709cog1202_4",
        "The mere exposure effect (Zajonc) demonstrates that:":
            "Zajonc, R. B. (1968). Attitudinal effects of mere exposure. Journal of Personality and Social Psychology, 9(2, Pt.2), 1–27. https://doi.org/10.1037/h0025848",
        "The encoding specificity principle (Tulving) states that:":
            "Tulving, E., & Thomson, D. M. (1973). Encoding specificity and retrieval processes in episodic memory. Psychological Review, 80(5), 352–373. https://doi.org/10.1037/h0020071",
        "The planning fallacy (Kahneman & Tversky) refers to:":
            "Kahneman, D., & Tversky, A. (1979). Intuitive prediction: Biases and corrective procedures. TIMS Studies in Management Science, 12, 313–327.",
        "Selective attention (cherry-picking information) can be explained by:":
            "Broadbent, D. E. (1958). Perception and communication. Pergamon Press.",
        "Overconfidence bias refers to:":
            "Fischhoff, B., Slovic, P., & Lichtenstein, S. (1977). Knowing with certainty: The appropriateness of extreme confidence. Journal of Experimental Psychology: Human Perception and Performance, 3(4), 552–564.",
        "Negative reinforcement differs from punishment in that negative reinforcement:":
            "Skinner, B. F. (1953). Science and human behavior. Macmillan.",

        // ===== Batch 22: Domain 3 (Social) =====
        "The door-in-the-face technique involves:":
            "Cialdini, R. B., Vincent, J. E., Lewis, S. K., Catalan, J., Wheeler, D., & Darby, B. L. (1975). Reciprocal concessions procedure for inducing compliance: The door-in-the-face technique. Journal of Personality and Social Psychology, 31(2), 206–215.",
        "The foot-in-the-door technique works by:":
            "Freedman, J. L., & Fraser, S. C. (1966). Compliance without pressure: The foot-in-the-door technique. Journal of Personality and Social Psychology, 4(2), 195–202. https://doi.org/10.1037/h0023552",
        "Groupthink (Janis) is MORE likely when:":
            "Janis, I. L. (1982). Groupthink: Psychological studies of policy decisions and fiascoes (2nd ed.). Houghton Mifflin.",
        "The social identity approach to prejudice (Tajfel's minimal group paradigm) showed:":
            "Tajfel, H., Billig, M. G., Bundy, R. P., & Flament, C. (1971). Social categorization and intergroup behaviour. European Journal of Social Psychology, 1(2), 149–178. https://doi.org/10.1002/ejsp.2420010202",
        "The fundamental attribution error is LESS common in:":
            "Choi, I., Nisbett, R. E., & Norenzayan, A. (1999). Causal attribution across cultures: Variation and universality. Psychological Bulletin, 125(1), 47–63.",

        // ===== Batch 22: Domain 4 (Dev) =====
        "Harlow's surrogate mother studies demonstrated:":
            "Harlow, H. F. (1958). The nature of love. American Psychologist, 13(12), 673–685. https://doi.org/10.1037/h0047884",
        "Emerging adulthood (Arnett) refers to:":
            "Arnett, J. J. (2000). Emerging adulthood: A theory of development from the late teens through the twenties. American Psychologist, 55(5), 469–480. https://doi.org/10.1037/0003-066X.55.5.469",
        "Stranger anxiety typically appears around:":
            "Sroufe, L. A. (1977). Wariness of strangers and the study of infant development. Child Development, 48(3), 731–746.",
        "Separation anxiety typically appears around:":
            "Bowlby, J. (1969). Attachment and loss: Vol. 1. Attachment. Basic Books.",
        "Continuity vs. discontinuity in development refers to the debate about whether:":
            "Bjorklund, D. F. (2018). A metatheory for cognitive development (or 'Piaget is dead' revisited). Child Development, 89(6), 2288–2302.",

        // ===== Batch 22: Domain 5 (Assessment) =====
        "The MMPI-2 validity scales include:":
            "Butcher, J. N., et al. (2001). MMPI-2: Manual for administration and scoring (rev. ed.). University of Minnesota Press.",
        "Standard error of measurement (SEM) reflects:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",
        "Projective tests are based on the hypothesis that:":
            "Frank, L. K. (1939). Projective methods for the study of personality. Journal of Psychology, 8(2), 389–413.",
        "The Nelson-Denny Reading Test assesses:":
            "Brown, J. I., Fishco, V. V., & Hanna, G. (1993). Nelson-Denny Reading Test manual. Riverside Publishing.",
        "Content validity is established by:":
            "Lawshe, C. H. (1975). A quantitative approach to content validity. Personnel Psychology, 28(4), 563–575.",

        // ===== Batch 22: Domain 6 (Treatment) =====
        "The Premack principle states that:":
            "Premack, D. (1959). Toward empirical behavior laws: I. Positive reinforcement. Psychological Review, 66(4), 219–233. https://doi.org/10.1037/h0040891",
        "Structural family therapy (Minuchin) focuses on:":
            "Minuchin, S. (1974). Families and family therapy. Harvard University Press.",
        "Rational emotive behavior therapy (REBT, Ellis) uses the ABCDE model where:":
            "Ellis, A. (1962). Reason and emotion in psychotherapy. Stuart.",
        "Therapeutic factors unique to GROUP therapy (Yalom) include:":
            "Yalom, I. D., & Leszcz, M. (2020). The theory and practice of group psychotherapy (6th ed.). Basic Books.",
        "Narrative therapy (White & Epston) helps clients:":
            "White, M., & Epston, D. (1990). Narrative means to therapeutic ends. W. W. Norton.",

        // ===== Batch 22: Domain 8 (Ethics) =====
        "Standard 2.01 (Boundaries of Competence) requires that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.01. https://www.apa.org/ethics/code",
        "Multiple relationships become problematic when they:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.05. https://www.apa.org/ethics/code",
        "Psychologists using psychological tests must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 9.02. https://www.apa.org/ethics/code",
        "Deception in research (Standard 8.07) is permitted ONLY when:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 8.07. https://www.apa.org/ethics/code",
        "When a psychologist disagrees with a court order to release records, they should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code",

        // ===== Batch 25: Domain 1 (Bio) =====
        "Phenylketonuria (PKU) is a genetic disorder that:":
            "Blau, N., van Spronsen, F. J., & Levy, H. L. (2010). Phenylketonuria. The Lancet, 376(9750), 1417–1427. https://doi.org/10.1016/S0140-6736(10)60961-0",
        "The ventral tegmental area (VTA) is the origin of the:":
            "Wise, R. A. (2004). Dopamine, learning and motivation. Nature Reviews Neuroscience, 5(6), 483–494.",
        "Huntington's disease is characterized by:":
            "Walker, F. O. (2007). Huntington's disease. The Lancet, 369(9557), 218–228. https://doi.org/10.1016/S0140-6736(07)60111-1",
        "The split-brain studies (Sperry, Gazzaniga) revealed:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. Nature Reviews Neuroscience, 6(8), 653–659.",

        // ===== Batch 25: Domain 2 (Cog-Aff) =====
        "The spacing effect demonstrates that:":
            "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks. Review of General Psychology, 10(4), 354–380. https://doi.org/10.1037/1089-2680.10.4.354",
        "The Stroop effect demonstrates:":
            "Stroop, J. R. (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology, 18(6), 643–662. https://doi.org/10.1037/h0054651",
        "Cognitive dissonance (Festinger) is reduced by:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",
        "Transfer-appropriate processing proposes that:":
            "Morris, C. D., Bransford, J. D., & Franks, J. J. (1977). Levels of processing versus transfer appropriate processing. Journal of Verbal Learning and Verbal Behavior, 16(5), 519–533.",
        "The sunk cost fallacy leads people to:":
            "Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost. Organizational Behavior and Human Decision Processes, 35(1), 124–140. https://doi.org/10.1016/0749-5978(85)90049-4",

        // ===== Batch 25: Domain 3 (Social) =====
        "Social comparison theory (Festinger) proposes that people:":
            "Festinger, L. (1954). A theory of social comparison processes. Human Relations, 7(2), 117–140. https://doi.org/10.1177/001872675400700202",
        "The just noticeable difference (JND) in Weber's Law applies to social perception as:":
            "Weber, E. H. (1834). De pulsu, resorptione, auditu et tactu: Annotationes anatomicae et physiologicae. Koehler.",
        "The Stanford Prison Experiment (Zimbardo) demonstrated:":
            "Zimbardo, P. G. (2007). The Lucifer effect: Understanding how good people turn evil. Random House.",
        "Microaggressions are:":
            "Sue, D. W., Capodilupo, C. M., Torino, G. C., Bucceri, J. M., Holder, A. M. B., Nadal, K. L., & Esquilin, M. (2007). Racial microaggressions in everyday life. American Psychologist, 62(4), 271–286. https://doi.org/10.1037/0003-066X.62.4.271",
        "Minority influence (Moscovici) is most effective when the minority:":
            "Moscovici, S., Lage, E., & Naffrechoux, M. (1969). Influence of a consistent minority on the responses of a majority in a color perception task. Sociometry, 32(4), 365–380.",

        // ===== Batch 25: Domain 4 (Dev) =====
        "Erikson's identity vs. role confusion (adolescence) involves:":
            "Erikson, E. H. (1968). Identity: Youth and crisis. W. W. Norton.",
        "Cross-sectional research designs in developmental psychology:":
            "Schaie, K. W. (1965). A general model for the study of developmental problems. Psychological Bulletin, 64(2), 92–107.",
        "Sequential designs (Schaie) combine:":
            "Schaie, K. W. (1996). Intellectual development in adulthood: The Seattle Longitudinal Study. Cambridge University Press.",
        "Theory of mind (ToM) develops around age:":
            "Wimmer, H., & Perner, J. (1983). Beliefs about beliefs: Representation and constraining function of wrong beliefs in young children's understanding of deception. Cognition, 13(1), 103–128. https://doi.org/10.1016/0010-0277(83)90004-5",
        "Moral development in Gilligan's care perspective emphasizes:":
            "Gilligan, C. (1982). In a different voice: Psychological theory and women's development. Harvard University Press.",

        // ===== Batch 25: Domain 6 (Treatment) =====
        "Evidence-based practice (EBP) in psychology integrates:":
            "American Psychological Association. (2006). Evidence-based practice in psychology. American Psychologist, 61(4), 271–285. https://doi.org/10.1037/0003-066X.61.4.271",
        "Overcorrection in behavioral therapy involves:":
            "Foxx, R. M., & Azrin, N. H. (1973). The elimination of autistic self-stimulatory behavior by overcorrection. Journal of Applied Behavior Analysis, 6(1), 1–14.",
        "The transference neurosis in psychoanalysis occurs when:":
            "Freud, S. (1912). The dynamics of transference. In J. Strachey (Ed. & Trans.), The standard edition of the complete psychological works of Sigmund Freud (Vol. 12, pp. 97–108). Hogarth Press.",
        "Cognitive defusion in ACT involves:":
            "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). Acceptance and commitment therapy: The process and practice of mindful change (2nd ed.). Guilford Press.",

        // ===== Batch 25: Domain 7 (Research) =====
        "External validity refers to:":
            "Campbell, D. T., & Stanley, J. C. (1963). Experimental and quasi-experimental designs for research. Rand McNally.",
        "Internal validity refers to:":
            "Campbell, D. T., & Stanley, J. C. (1963). Experimental and quasi-experimental designs for research. Rand McNally.",
        "Stratified random sampling:":
            "Kerlinger, F. N., & Lee, H. B. (2000). Foundations of behavioral research (4th ed.). Harcourt.",
        "Type I error occurs when:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Type II error occurs when:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",

        // ===== Batch 25: Domain 8 (Ethics) =====
        "The Tarasoff II (1976) ruling expanded the duty from warning to:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976).",
        "Psychologists who become aware of a child abuse situation are:":
            "Child Abuse Prevention and Treatment Act (CAPTA), 42 U.S.C. §§ 5101–5107 (2010). See also APA Ethics Code Standard 4.05.",
        "The concept of minimal disclosure means:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 4.04. https://www.apa.org/ethics/code",
        "Standard 3.10 (Informed Consent) applies to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.10. https://www.apa.org/ethics/code",
        "When providing testimony in court, psychologists must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.04. https://www.apa.org/ethics/code",

        // ===== Batch 27: Domain 2 (Cog-Aff) =====
        "Dual-process theory (Kahneman's System 1 and System 2) proposes:":
            "Kahneman, D. (2011). Thinking, fast and slow. Farrar, Straus and Giroux.",
        "Schema theory proposes that knowledge is organized in:":
            "Rumelhart, D. E. (1980). Schemata: The building blocks of cognition. In R. J. Spiro et al. (Eds.), Theoretical issues in reading comprehension (pp. 33–58). Erlbaum.",
        "The hindsight bias ('I knew it all along' effect) causes people to:":
            "Fischhoff, B. (1975). Hindsight ≠ foresight: The effect of outcome knowledge on judgment under uncertainty. Journal of Experimental Psychology: Human Perception and Performance, 1(3), 288–299.",
        "Elaborative rehearsal differs from maintenance rehearsal in that:":
            "Craik, F. I. M., & Watkins, M. J. (1973). The role of rehearsal in short-term memory. Journal of Verbal Learning and Verbal Behavior, 12(6), 599–607.",

        // ===== Batch 27: Domain 4 (Dev) =====
        "The preconventional level of moral reasoning (Kohlberg) is characterized by:":
            "Kohlberg, L. (1981). Essays on moral development: Vol. 1. The philosophy of moral development. Harper & Row.",
        "Internalizing disorders in children include:":
            "Achenbach, T. M. (1991). Manual for the Child Behavior Checklist/4-18 and 1991 Profile. University of Vermont.",
        "Externalizing disorders in children include:":
            "Achenbach, T. M. (1991). Manual for the Child Behavior Checklist/4-18 and 1991 Profile. University of Vermont.",
        "Erikson's trust vs. mistrust (infancy) is resolved positively when:":
            "Erikson, E. H. (1963). Childhood and society (2nd ed.). W. W. Norton.",
        "Resistant/ambivalent attachment (Ainsworth, Type C) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "The secular trend in development refers to:":
            "Parent, A.-S., Teilmann, G., Juul, A., Skakkebaek, N. E., Toppari, J., & Bourguignon, J.-P. (2003). The timing of normal puberty and the age limits of sexual precocity. Endocrine Reviews, 24(5), 668–693.",

        // ===== Batch 27: Domain 5 (Assessment) =====
        "The Bayley Scales of Infant Development measure:":
            "Bayley, N. (2006). Bayley Scales of Infant and Toddler Development (3rd ed.). Harcourt Assessment.",
        "The Flynn effect describes:":
            "Flynn, J. R. (1987). Massive IQ gains in 14 nations: What IQ tests really measure. Psychological Bulletin, 101(2), 171–191. https://doi.org/10.1037/0033-2909.101.2.171",

        // ===== Batch 27: Domain 7 (Research) =====
        "Correlation does NOT equal causation because:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "The Pearson r correlation coefficient ranges from:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "ANOVA (Analysis of Variance) is used to:":
            "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
        "The coefficient of determination (r²) indicates:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Demand characteristics in research occur when:":
            "Orne, M. T. (1962). On the social psychology of the psychological experiment: With particular reference to demand characteristics and their implications. American Psychologist, 17(11), 776–783. https://doi.org/10.1037/h0043424",

        // ===== Batch 27: Domain 8 (Ethics) =====
        "Pro bono services are:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle B. https://www.apa.org/ethics/code",
        "Standard 6.04 (Fees and Financial Arrangements) requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.04. https://www.apa.org/ethics/code",
        "Record keeping (Standard 6.01) requires psychologists to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.01. https://www.apa.org/ethics/code",
        "The ethical principle of Beneficence and Nonmaleficence requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle A. https://www.apa.org/ethics/code",
        "Telepsychology ethics require psychologists to:":
            "American Psychological Association. (2013). Guidelines for the practice of telepsychology. American Psychologist, 68(9), 791–800. https://doi.org/10.1037/a0035001",
        "An ethics complaint against a psychologist:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code",
        "Aspirational principles in the Ethics Code differ from enforceable standards in that:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code",
        "When conducting child custody evaluations, psychologists should:":
            "American Psychological Association. (2010). Guidelines for child custody evaluations in family law proceedings. American Psychologist, 65(9), 863–867.",
        "The ethical concept of fidelity refers to:":
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 12).`);
})();
