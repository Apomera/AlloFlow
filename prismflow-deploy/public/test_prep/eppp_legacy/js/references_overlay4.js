/* PasstheEPPP — APA Reference Overlay (Part 4)
   Covers remaining questions from data_batch16 through data_batch27.
   Loaded AFTER references_overlay3.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Batch 16-19: Additional Domain 1 =====
        "The cerebellum's role extends beyond motor coordination to include:":
            "Schmahmann, J. D. (2019). The cerebellum and cognition. Neuroscience Letters, 688, 62–75. https://doi.org/10.1016/j.neulet.2018.07.005",
        "The locus coeruleus is the brain's primary source of:":
            "Aston-Jones, G., & Cohen, J. D. (2005). An integrative theory of locus coeruleus–norepinephrine function: Adaptive gain and optimal performance. Annual Review of Neuroscience, 28, 403–450. https://doi.org/10.1146/annurev.neuro.28.061604.135709",
        "The autonomic nervous system consists of:":
            "Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "The raphe nuclei are the primary source of:":
            "Jacobs, B. L., & Azmitia, E. C. (1992). Structure and function of the brain serotonin system. Physiological Reviews, 72(1), 165–229. https://doi.org/10.1152/physrev.1992.72.1.165",
        "The myelin sheath functions to:":
            "Nave, K. A. (2010). Myelination and support of axonal integrity by glia. Nature, 468(7321), 244–252. https://doi.org/10.1038/nature09614",

        // ===== Batch 16-19: Additional Domain 2 =====
        "The levels of processing framework (Craik & Lockhart) proposes:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671–684. https://doi.org/10.1016/S0022-5371(72)80001-X",
        "The misinformation effect (Loftus) demonstrates that:":
            "Loftus, E. F., & Palmer, J. C. (1974). Reconstruction of automobile destruction: An example of the interaction between language and memory. Journal of Verbal Learning and Verbal Behavior, 13(5), 585–589. https://doi.org/10.1016/S0022-5371(74)80011-3",
        "Working memory (Baddeley) consists of:":
            "Baddeley, A. D. (2000). The episodic buffer: A new component of working memory? Trends in Cognitive Sciences, 4(11), 417–423. https://doi.org/10.1016/S1364-6613(00)01538-2",
        "The peak-end rule (Kahneman) states that:":
            "Kahneman, D., Fredrickson, B. L., Schreiber, C. A., & Redelmeier, D. A. (1993). When more pain is preferred to less: Adding a better end. Psychological Science, 4(6), 401–405. https://doi.org/10.1111/j.1467-9280.1993.tb00589.x",
        "The representativeness heuristic leads to:":
            "Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124–1131. https://doi.org/10.1126/science.185.4157.1124",
        "The cocktail party effect demonstrates:":
            "Cherry, E. C. (1953). Some experiments on the recognition of speech, with one and with two ears. Journal of the Acoustical Society of America, 25(5), 975–979. https://doi.org/10.1121/1.1907229",
        "Change blindness demonstrates:":
            "Simons, D. J., & Chabris, C. F. (1999). Gorillas in our midst: Sustained inattentional blindness for dynamic events. Perception, 28(9), 1059–1074. https://doi.org/10.1068/p281059",
        "The self-reference effect in memory shows that:":
            "Rogers, T. B., Kuiper, N. A., & Kirker, W. S. (1977). Self-reference and the encoding of personal information. Journal of Personality and Social Psychology, 35(9), 677–688. https://doi.org/10.1037/0022-3514.35.9.677",

        // ===== Batch 16-19: Additional Domain 3 =====
        "The elaboration likelihood model (Petty & Cacioppo) proposes:":
            "Petty, R. E., & Cacioppo, J. T. (1986). The elaboration likelihood model of persuasion. In L. Berkowitz (Ed.), Advances in experimental social psychology (Vol. 19, pp. 123–205). Academic Press.",
        "Groupthink (Janis) occurs when:":
            "Janis, I. L. (1982). Groupthink: Psychological studies of policy decisions and fiascoes (2nd ed.). Houghton Mifflin.",
        "Social loafing (Latané) refers to:":
            "Latané, B., Williams, K., & Harkins, S. (1979). Many hands make light the work: The causes and consequences of social loafing. Journal of Personality and Social Psychology, 37(6), 822–832. https://doi.org/10.1037/0022-3514.37.6.822",
        "The autokinetic effect (Sherif) was used to study:":
            "Sherif, M. (1935). A study of some social factors in perception. Archives of Psychology, 27(187), 1–60.",
        "Group polarization refers to:":
            "Stoner, J. A. F. (1968). Risky and cautious shifts in group decisions: The influence of widely held values. Journal of Experimental Social Psychology, 4(4), 442–459. See also: Moscovici, S., & Zavalloni, M. (1969). The group as a polarizer of attitudes. Journal of Personality and Social Psychology, 12(2), 125–135.",
        "Relative deprivation theory proposes:":
            "Crosby, F. (1976). A model of egoistical relative deprivation. Psychological Review, 83(2), 85–113. https://doi.org/10.1037/0033-295X.83.2.85",

        // ===== Batch 16-19: Additional Domain 4 =====
        "Vygotsky's concept of private speech:":
            "Vygotsky, L. S. (1986). Thought and language (A. Kozulin, Trans. and Ed.). MIT Press. (Original work published 1934)",
        "Bronfenbrenner's ecological systems theory:":
            "Bronfenbrenner, U. (1979). The ecology of human development: Experiments by nature and design. Harvard University Press.",
        "Erikson's integrity vs. despair (late adulthood):":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton. See also: Erikson, E. H., & Erikson, J. M. (1997). The life cycle completed (Extended version). W. W. Norton.",
        "Piaget's preoperational stage (~2-7) is characterized by:":
            "Piaget, J. (1962). Play, dreams and imitation in childhood (C. Gattegno & F. M. Hodgson, Trans.). W. W. Norton.",
        "Kohlberg's postconventional level includes:":
            "Kohlberg, L. (1981). Essays on moral development: Vol. 1. The philosophy of moral development. Harper & Row.",

        // ===== Batch 16-19: Additional Domain 5 =====
        "The WISC-V is designed for ages:":
            "Wechsler, D. (2014). Wechsler Intelligence Scale for Children—Fifth Edition (WISC-V). Pearson.",
        "Response bias in assessment includes:":
            "Paulhus, D. L. (1991). Measurement and control of response bias. In J. P. Robinson, P. R. Shaver, & L. S. Wrightsman (Eds.), Measures of personality and social psychological attitudes (pp. 17–59). Academic Press.",
        "The MMPI-2 contains how many items:":
            "Butcher, J. N., Dahlstrom, W. G., Graham, J. R., Tellegen, A., & Kaemmer, B. (1989). MMPI-2: Manual for administration and scoring. University of Minnesota Press.",
        "Cronbach's alpha measures:":
            "Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika, 16(3), 297–334. https://doi.org/10.1007/BF02310555",
        "Test-retest reliability measures:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Inter-rater reliability measures:":
            "Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: Uses in assessing rater reliability. Psychological Bulletin, 86(2), 420–428. https://doi.org/10.1037/0033-2909.86.2.420",
        "Predictive validity is demonstrated by:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Practice effects in testing refer to:":
            "Calamia, M., Markon, K., & Tranel, D. (2012). Scoring higher the second time around: Meta-analyses of practice effects in neuropsychological assessment. The Clinical Neuropsychologist, 26(4), 543–570. https://doi.org/10.1080/13854046.2012.680913",

        // ===== Batch 20-23: Additional Domain 6 =====
        "Motivational enhancement therapy (MET):":
            "Miller, W. R., Zweben, A., DiClemente, C. C., & Rychtarik, R. G. (1992). Motivational Enhancement Therapy manual (NIAAA Project MATCH Monograph Series, Vol. 2). U.S. Department of Health and Human Services.",
        "Play therapy is primarily used with:":
            "Landreth, G. L. (2012). Play therapy: The art of the relationship (3rd ed.). Brunner-Routledge.",
        "The empty chair technique in Gestalt therapy:":
            "Perls, F. S. (1969). Gestalt therapy verbatim. Real People Press.",
        "Free association in psychoanalysis:":
            "Freud, S. (1913). On beginning the treatment (Further recommendations on the technique of psycho-analysis I). Standard Edition, 12, 121–144.",
        "Reality therapy (Glasser) focuses on:":
            "Glasser, W. (1998). Choice theory: A new psychology of personal freedom. HarperCollins.",
        "Functional analytic psychotherapy (FAP):":
            "Kohlenberg, R. J., & Tsai, M. (1991). Functional analytic psychotherapy: Creating intense and curative therapeutic relationships. Plenum Press.",

        // ===== Batch 20-23: Additional Domain 7 =====
        "A between-subjects design:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "A within-subjects (repeated measures) design:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Matched-pairs design:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "APA style requires research papers to include:":
            "American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). https://doi.org/10.1037/0000165-000",

        // ===== Batch 24-27: Additional Domain 3 =====
        "Heuristic-systematic model (HSM, Chaiken) proposes:":
            "Chaiken, S. (1980). Heuristic versus systematic information processing and the use of source versus message cues in persuasion. Journal of Personality and Social Psychology, 39(5), 752–766. https://doi.org/10.1037/0022-3514.39.5.752",
        "Social norms influence behavior through:":
            "Cialdini, R. B., Reno, R. R., & Kallgren, C. A. (1990). A focus theory of normative conduct: Recycling the concept of norms to reduce littering in public places. Journal of Personality and Social Psychology, 58(6), 1015–1026. https://doi.org/10.1037/0022-3514.58.6.1015",
        "The social dominance orientation (SDO) scale measures:":
            "Sidanius, J., & Pratto, F. (1999). Social dominance: An intergroup theory of social hierarchy and oppression. Cambridge University Press.",
        "Right-wing authoritarianism (RWA, Altemeyer) is characterized by:":
            "Altemeyer, B. (1996). The authoritarian specter. Harvard University Press.",
        "Cognitive dissonance is GREATEST when:":
            "Festinger, L., & Carlsmith, J. M. (1959). Cognitive consequences of forced compliance. Journal of Abnormal and Social Psychology, 58(2), 203–210. https://doi.org/10.1037/h0041593",

        // ===== Batch 24-27: Additional Domain 8 =====
        "Pro bono services are:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle B. https://www.apa.org/ethics/code",
        "Standard 6.04 (Fees and Financial Arrangements) requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.04. https://www.apa.org/ethics/code",
        "Record keeping (Standard 6.01) requires psychologists to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.01. https://www.apa.org/ethics/code See also: APA Committee on Professional Practice and Standards. (2007). Record keeping guidelines. American Psychologist, 62(9), 993–1004.",
        "The ethical principle of Beneficence and Nonmaleficence requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle A. https://www.apa.org/ethics/code",
        "An ethics complaint against a psychologist:":
            "American Psychological Association. (2018). Rules and procedures: Ethics Committee of the American Psychological Association. https://www.apa.org/ethics/code/committee",
        "Aspirational principles in the Ethics Code differ from enforceable standards in that:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct — Introduction and Applicability. https://www.apa.org/ethics/code",
        "The ethical concept of fidelity refers to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle B. https://www.apa.org/ethics/code",
        "The irreconcilable conflict clause in the Ethics Code instructs psychologists that:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standards 1.02 & 1.03. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 4).`);
})();
