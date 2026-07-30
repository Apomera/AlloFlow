/* PasstheEPPP — APA Reference Overlay (Part 2)
   Patches additional questions with APA citations and source links.
   Loaded AFTER references_overlay1.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== DOMAIN 1: Biological Bases (continued) =====
        "The anterior cingulate cortex (ACC) is involved in:":
            "Bush, G., Luu, P., & Posner, M. I. (2000). Cognitive and emotional influences in anterior cingulate cortex. Trends in Cognitive Sciences, 4(6), 215–222. https://doi.org/10.1016/S1364-6613(00)01483-2",
        "The reticular activating system (RAS) regulates:":
            "Moruzzi, G., & Magoun, H. W. (1949). Brain stem reticular formation and activation of the EEG. Electroencephalography and Clinical Neurophysiology, 1(1–4), 455–473. https://doi.org/10.1016/0013-4694(49)90219-9",
        "The 10-20 system in EEG refers to:":
            "Jasper, H. H. (1958). The ten-twenty electrode system of the International Federation. Electroencephalography and Clinical Neurophysiology, 10, 371–375.",
        "Korsakoff's syndrome is characterized by:":
            "Kopelman, M. D., Thomson, A. D., Guerrini, I., & Marshall, E. J. (2009). The Korsakoff syndrome: Clinical aspects, psychology and treatment. Alcohol and Alcoholism, 44(2), 148–154. https://doi.org/10.1093/alcalc/agn118",
        "Ipsilateral control is an exception to contralateral organization, seen in:":
            "Kolb, B., & Whishaw, I. Q. (2015). Fundamentals of human neuropsychology (7th ed.). Worth Publishers.",
        "Mirror neurons fire both when:":
            "Rizzolatti, G., & Craighero, L. (2004). The mirror-neuron system. Annual Review of Neuroscience, 27, 169–192. https://doi.org/10.1146/annurev.neuro.27.070203.144230",
        "Hemispheric specialization research shows the LEFT hemisphere typically excels at:":
            "Springer, S. P., & Deutsch, G. (2001). Left brain, right brain: Perspectives from cognitive neuroscience (5th ed.). W. H. Freeman.",
        "Anterograde amnesia involves:":
            "Scoville, W. B., & Milner, B. (1957). Loss of recent memory after bilateral hippocampal lesions. Journal of Neurology, Neurosurgery, and Psychiatry, 20(1), 11–21. https://doi.org/10.1136/jnnp.20.1.11",
        "The basal ganglia are primarily involved in:":
            "Lanciego, J. L., Luquin, N., & Obeso, J. A. (2012). Functional neuroanatomy of the basal ganglia. Cold Spring Harbor Perspectives in Medicine, 2(12), a009621. https://doi.org/10.1101/cshperspect.a009621",
        "The suprachiasmatic nucleus (SCN) of the hypothalamus:":
            "Reppert, S. M., & Weaver, D. R. (2002). Coordination of circadian timing in mammals. Nature, 418(6901), 935–941. https://doi.org/10.1038/nature00965",
        "Phenylketonuria (PKU) is a genetic disorder that:":
            "National Institutes of Health. (2000). Phenylketonuria: Screening and management (NIH Consensus Statement, Vol. 17, No. 3). https://consensus.nih.gov/2000/2000phenylketonuria113html.htm",
        "The ventral tegmental area (VTA) is the origin of the:":
            "Wise, R. A. (2004). Dopamine, learning and motivation. Nature Reviews Neuroscience, 5(6), 483–494. https://doi.org/10.1038/nrn1406",
        "Huntington's disease is characterized by:":
            "Walker, F. O. (2007). Huntington's disease. The Lancet, 369(9557), 218–228. https://doi.org/10.1016/S0140-6736(07)60111-1",
        "The split-brain studies (Sperry, Gazzaniga) revealed:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. Nature Reviews Neuroscience, 6(8), 653–659. https://doi.org/10.1038/nrn1723",
        "Endorphins are endogenous opioids that:":
            "Pert, C. B., & Snyder, S. H. (1973). Opiate receptor: Demonstration in nervous tissue. Science, 179(4077), 1011–1014. https://doi.org/10.1126/science.179.4077.1011",
        "Diffusion tensor imaging (DTI) measures:":
            "Basser, P. J., & Pierpaoli, C. (1996). Microstructural and physiological features of tissues elucidated by quantitative-diffusion-tensor MRI. Journal of Magnetic Resonance, Series B, 111(3), 209–219. https://doi.org/10.1006/jmrb.1996.0086",
        "The thalamus is often described as the brain's:":
            "Sherman, S. M. (2007). The thalamus is more than just a relay. Current Opinion in Neurobiology, 17(4), 417–422. https://doi.org/10.1016/j.conb.2007.07.003",
        "Positron emission tomography (PET) works by:":
            "Phelps, M. E. (2000). PET: The merging of biology and imaging into molecular imaging. Journal of Nuclear Medicine, 41(4), 661–681.",
        "Glia cells differ from neurons in that they:":
            "Allen, N. J., & Barres, B. A. (2009). Glia — more than just brain glue. Nature, 457(7230), 675–677. https://doi.org/10.1038/457675a",
        "Down syndrome (Trisomy 21) is caused by:":
            "Bull, M. J. (2020). Down syndrome. New England Journal of Medicine, 382(24), 2344–2352. https://doi.org/10.1056/NEJMra1706537",
        "The amygdala plays a central role in:":
            "LeDoux, J. E. (2000). Emotion circuits in the brain. Annual Review of Neuroscience, 23, 155–184. https://doi.org/10.1146/annurev.neuro.23.1.155",
        "Clozapine (Clozaril) is unique among antipsychotics because:":
            "Kane, J. M., Honigfeld, G., Singer, J., & Meltzer, H. (1988). Clozapine for the treatment-resistant schizophrenic. Archives of General Psychiatry, 45(9), 789–796. https://doi.org/10.1001/archpsyc.1988.01800330013001",
        "Sleep deprivation primarily affects:":
            "Walker, M. P. (2017). Why we sleep: Unlocking the power of sleep and dreams. Scribner.",
        "The pituitary gland is called the 'master gland' because:":
            "Bear, M. F., Connors, B. W., & Paradiso, M. A. (2016). Neuroscience: Exploring the brain (4th ed.). Wolters Kluwer.",

        // ===== DOMAIN 2: Cognitive-Affective (continued) =====
        "Anchoring bias occurs when:":
            "Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124–1131. https://doi.org/10.1126/science.185.4157.1124",
        "Implicit memory is demonstrated through:":
            "Schacter, D. L. (1987). Implicit memory: History and current status. Journal of Experimental Psychology: Learning, Memory, and Cognition, 13(3), 501–518. https://doi.org/10.1037/0278-7393.13.3.501",
        "The confirmation bias leads people to:":
            "Wason, P. C. (1960). On the failure to eliminate hypotheses in a conceptual task. Quarterly Journal of Experimental Psychology, 12(3), 129–140. https://doi.org/10.1080/17470216008416717",
        "Proactive interference occurs when:":
            "Underwood, B. J. (1957). Interference and forgetting. Psychological Review, 64(1), 49–60. https://doi.org/10.1037/h0044616",
        "Retroactive interference occurs when:":
            "Müller, G. E., & Pilzecker, A. (1900). Experimentelle Beiträge zur Lehre vom Gedächtnis [Experimental contributions to the science of memory]. Zeitschrift für Psychologie, Ergänzungsband 1, 1–300.",
        "The spacing effect demonstrates that:":
            "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354",
        "The Stroop effect demonstrates:":
            "Stroop, J. R. (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology, 18(6), 643–662. https://doi.org/10.1037/h0054651",
        "Cognitive dissonance (Festinger) is reduced by:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",
        "Transfer-appropriate processing proposes that:":
            "Morris, C. D., Bransford, J. D., & Franks, J. J. (1977). Levels of processing versus transfer appropriate processing. Journal of Verbal Learning and Verbal Behavior, 16(5), 519–533. https://doi.org/10.1016/S0022-5371(77)80016-9",
        "The sunk cost fallacy leads people to:":
            "Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost. Organizational Behavior and Human Decision Processes, 35(1), 124–140. https://doi.org/10.1016/0749-5978(85)90049-4",
        "The generation effect shows that:":
            "Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. Journal of Experimental Psychology: Human Learning and Memory, 4(6), 592–604. https://doi.org/10.1037/0278-7393.4.6.592",
        "Dual-process theory (Kahneman's System 1 and System 2) proposes:":
            "Kahneman, D. (2011). Thinking, fast and slow. Farrar, Straus and Giroux.",
        "Source monitoring errors occur when:":
            "Johnson, M. K., Hashtroudi, S., & Lindsay, D. S. (1993). Source monitoring. Psychological Bulletin, 114(1), 3–28. https://doi.org/10.1037/0033-2909.114.1.3",
        "The testing effect (retrieval practice) shows that:":
            "Roediger, H. L., III, & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x",
        "The weapon focus effect in eyewitness testimony describes:":
            "Loftus, E. F., Loftus, G. R., & Messo, J. (1987). Some facts about 'weapon focus.' Law and Human Behavior, 11(1), 55–62. https://doi.org/10.1007/BF01044839",
        "Schema theory proposes that knowledge is organized in:":
            "Bartlett, F. C. (1932). Remembering: A study in experimental and social psychology. Cambridge University Press.",
        "The mood congruency effect demonstrates that:":
            "Bower, G. H. (1981). Mood and memory. American Psychologist, 36(2), 129–148. https://doi.org/10.1037/0003-066X.36.2.129",
        "Functional fixedness prevents people from:":
            "Duncker, K. (1945). On problem-solving (L. S. Lees, Trans.). Psychological Monographs, 58(5), i–113. https://doi.org/10.1037/h0093599",
        "The hindsight bias ('I knew it all along' effect) causes people to:":
            "Fischhoff, B. (1975). Hindsight is not equal to foresight: The effect of outcome knowledge on judgment under uncertainty. Journal of Experimental Psychology: Human Perception and Performance, 1(3), 288–299. https://doi.org/10.1037/0096-1523.1.3.288",
        "Elaborative rehearsal differs from maintenance rehearsal in that:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671–684. https://doi.org/10.1016/S0022-5371(72)80001-X",

        // ===== DOMAIN 3: Social & Cultural (continued) =====
        "Realistic conflict theory (Sherif) proposes that prejudice arises from:":
            "Sherif, M. (1966). In common predicament: Social psychology of intergroup conflict and cooperation. Houghton Mifflin.",
        "Self-serving bias refers to:":
            "Miller, D. T., & Ross, M. (1975). Self-serving biases in the attribution of causality: Fact or fiction? Psychological Bulletin, 82(2), 213–225. https://doi.org/10.1037/h0076486",
        "The contact hypothesis (Allport) states that intergroup prejudice is reduced when:":
            "Allport, G. W. (1954). The nature of prejudice. Addison-Wesley.",
        "System justification theory (Jost & Banaji) proposes that:":
            "Jost, J. T., & Banaji, M. R. (1994). The role of stereotyping in system-justification and the production of false consciousness. British Journal of Social Psychology, 33(1), 1–27. https://doi.org/10.1111/j.2044-8309.1994.tb01008.x",
        "The actor-observer bias describes:":
            "Jones, E. E., & Nisbett, R. E. (1971). The actor and the observer: Divergent perceptions of the causes of behavior. In E. E. Jones et al. (Eds.), Attribution: Perceiving the causes of behavior (pp. 79–94). General Learning Press.",
        "Social comparison theory (Festinger) proposes that people:":
            "Festinger, L. (1954). A theory of social comparison processes. Human Relations, 7(2), 117–140. https://doi.org/10.1177/001872675400700202",
        "The Stanford Prison Experiment (Zimbardo) demonstrated:":
            "Haney, C., Banks, W. C., & Zimbardo, P. G. (1973). Interpersonal dynamics in a simulated prison. International Journal of Criminology and Penology, 1, 69–97.",
        "Microaggressions are:":
            "Sue, D. W., Capodilupo, C. M., Torino, G. C., Bucceri, J. M., Holder, A. M., Nadal, K. L., & Esquilin, M. (2007). Racial microaggressions in everyday life: Implications for clinical practice. American Psychologist, 62(4), 271–286. https://doi.org/10.1037/0003-066X.62.4.271",
        "Minority influence (Moscovici) is most effective when the minority:":
            "Moscovici, S., Lage, E., & Naffrechoux, M. (1969). Influence of a consistent minority on the responses of a majority in a color perception task. Sociometry, 32(4), 365–380. https://doi.org/10.2307/2786541",
        "The bystander effect (Darley & Latané) is mediated by:":
            "Darley, J. M., & Latané, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. Journal of Personality and Social Psychology, 8(4), 377–383. https://doi.org/10.1037/h0025589",
        "Intersectionality (Crenshaw) recognizes that:":
            "Crenshaw, K. (1989). Demarginalizing the intersection of race and sex. University of Chicago Legal Forum, 1989(1), 139–167.",
        "The looking-glass self (Cooley) proposes that:":
            "Cooley, C. H. (1902). Human nature and the social order. Scribner.",
        "The illusory correlation occurs when:":
            "Hamilton, D. L., & Gifford, R. K. (1976). Illusory correlation in interpersonal perception: A cognitive basis of stereotypic judgments. Journal of Experimental Social Psychology, 12(4), 392–407. https://doi.org/10.1016/S0022-1031(76)80006-6",
        "Acculturation strategies (Berry) include:":
            "Berry, J. W. (1997). Immigration, acculturation, and adaptation. Applied Psychology, 46(1), 5–34. https://doi.org/10.1111/j.1464-0597.1997.tb01087.x",

        // ===== DOMAIN 4: Growth & Lifespan (continued) =====
        "Erikson's generativity vs. stagnation stage (~40-65) involves:":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton.",
        "Piaget's assimilation involves:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Piaget's accommodation involves:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "The zone of proximal development (Vygotsky) represents:":
            "Vygotsky, L. S. (1978). Mind in society: The development of higher psychological processes. Harvard University Press.",
        "Disengagement theory (Cumming & Henry) proposes that:":
            "Cumming, E., & Henry, W. E. (1961). Growing old: The process of disengagement. Basic Books.",
        "Erikson's identity vs. role confusion (adolescence) involves:":
            "Erikson, E. H. (1968). Identity: Youth and crisis. W. W. Norton.",
        "Cross-sectional research designs in developmental psychology:":
            "Schaie, K. W. (1965). A general model for the study of developmental problems. Psychological Bulletin, 64(2), 92–107. https://doi.org/10.1037/h0022371",
        "Sequential designs (Schaie) combine:":
            "Schaie, K. W. (1977). Quasi-experimental research designs in the psychology of aging. In J. E. Birren & K. W. Schaie (Eds.), Handbook of the psychology of aging (pp. 39–58). Van Nostrand Reinhold.",
        "Theory of mind (ToM) develops around age:":
            "Wimmer, H., & Perner, J. (1983). Beliefs about beliefs: Representation and constraining function of wrong beliefs in young children's understanding of deception. Cognition, 13(1), 103–128. https://doi.org/10.1016/0010-0277(83)90004-5",
        "Moral development in Gilligan's care perspective emphasizes:":
            "Gilligan, C. (1982). In a different voice: Psychological theory and women's development. Harvard University Press.",
        "The goodness-of-fit model (Thomas & Chess) proposes:":
            "Thomas, A., & Chess, S. (1977). Temperament and development. Brunner/Mazel.",
        "Kohlberg's conventional level of moral reasoning involves:":
            "Kohlberg, L. (1981). Essays on moral development: Vol. 1. The philosophy of moral development. Harper & Row.",
        "The preconventional level of moral reasoning (Kohlberg) is characterized by:":
            "Kohlberg, L. (1981). Essays on moral development: Vol. 1. The philosophy of moral development. Harper & Row.",
        "Erikson's trust vs. mistrust (infancy) is resolved positively when:":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton.",
        "Secure attachment (Ainsworth, Type B) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "Resistant/ambivalent attachment (Ainsworth, Type C) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "Selective optimization with compensation (SOC, Baltes) is a model of:":
            "Baltes, P. B., & Baltes, M. M. (1990). Psychological perspectives on successful aging: The model of selective optimization with compensation. In P. B. Baltes & M. M. Baltes (Eds.), Successful aging (pp. 1–34). Cambridge University Press.",
        "The secular trend in development refers to:":
            "Tanner, J. M. (1990). Foetus into man: Physical growth from conception to maturity (2nd ed.). Harvard University Press.",

        // ===== DOMAIN 6: Treatment (continued) =====
        "Token economy is a behavior modification system that:":
            "Ayllon, T., & Azrin, N. (1968). The token economy: A motivational system for therapy and rehabilitation. Appleton-Century-Crofts.",
        "Brief psychodynamic therapy differs from traditional psychoanalysis by:":
            "Sifneos, P. E. (1979). Short-term dynamic psychotherapy: Evaluation and technique. Plenum Press.",
        "Psychoeducation in therapy involves:":
            "Lukens, E. P., & McFarlane, W. R. (2004). Psychoeducation as evidence-based practice: Considerations for practice, research, and policy. Brief Treatment and Crisis Intervention, 4(3), 205–225. https://doi.org/10.1093/brief-treatment/mhh019",
        "Relapse prevention (Marlatt) identifies:":
            "Marlatt, G. A., & Gordon, J. R. (Eds.). (1985). Relapse prevention: Maintenance strategies in the treatment of addictive behaviors. Guilford Press.",
        "Bowen's family therapy focuses on:":
            "Bowen, M. (1978). Family therapy in clinical practice. Jason Aronson.",
        "Overcorrection in behavioral therapy involves:":
            "Foxx, R. M., & Azrin, N. H. (1973). The elimination of autistic self-stimulatory behavior by overcorrection. Journal of Applied Behavior Analysis, 6(1), 1–14. https://doi.org/10.1901/jaba.1973.6-1",
        "The transference neurosis in psychoanalysis occurs when:":
            "Freud, S. (1912). The dynamics of transference. Standard Edition, 12, 97–108.",
        "Cognitive defusion in ACT involves:":
            "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). Acceptance and commitment therapy: The process and practice of mindful change (2nd ed.). Guilford Press.",
        "Flooding (implosive therapy) involves:":
            "Stampfl, T. G., & Levis, D. J. (1967). Essentials of implosive therapy: A learning-theory-based psychodynamic behavioral therapy. Journal of Abnormal Psychology, 72(6), 496–503. https://doi.org/10.1037/h0025238",
        "Aversion therapy pairs:":
            "Elkins, R. L. (1991). An appraisal of chemical aversion (emetic therapy) approaches to alcoholism treatment. Behaviour Research and Therapy, 29(5), 387–413. https://doi.org/10.1016/0005-7967(91)90025-Y",
        "Genograms in family therapy:":
            "McGoldrick, M., Gerson, R., & Petry, S. (2008). Genograms: Assessment and intervention (3rd ed.). W. W. Norton.",
        "The dose-response relationship in psychotherapy research shows:":
            "Howard, K. I., Kopta, S. M., Krause, M. S., & Orlinsky, D. E. (1986). The dose-effect relationship in psychotherapy. American Psychologist, 41(2), 159–164. https://doi.org/10.1037/0003-066X.41.2.159",

        // ===== DOMAIN 5: Assessment (continued) =====
        "The WAIS-V is designed for ages:":
            "Wechsler, D. (2024). Wechsler Adult Intelligence Scale—Fifth Edition (WAIS-V). Pearson.",
        "Concurrent validity is established by:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Norm-referenced tests compare an individual's performance to:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Criterion-referenced tests measure:":
            "Hambleton, R. K. (1994). The rise and fall of criterion-referenced measurement? Educational Measurement: Issues and Practice, 13(4), 21–26. https://doi.org/10.1111/j.1745-3992.1994.tb00566.x",
        "The Flynn effect describes:":
            "Flynn, J. R. (1987). Massive IQ gains in 14 nations: What IQ tests really measure. Psychological Bulletin, 101(2), 171–191. https://doi.org/10.1037/0033-2909.101.2.171",
        "Base rate in diagnostic assessment refers to:":
            "Meehl, P. E., & Rosen, A. (1955). Antecedent probability and the efficiency of psychometric signs, patterns, or cutting scores. Psychological Bulletin, 52(3), 194–216. https://doi.org/10.1037/h0048070",
        "Face validity refers to:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Incremental validity asks:":
            "Hunsley, J., & Meyer, G. J. (2003). The incremental validity of psychological testing and assessment: Conceptual, methodological, and statistical issues. Psychological Assessment, 15(4), 446–455. https://doi.org/10.1037/1040-3590.15.4.446",

        // ===== DOMAIN 7: Research (continued) =====
        "Construct validity encompasses:":
            "Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. Psychological Bulletin, 56(2), 81–105. https://doi.org/10.1037/h0046016",
        "An operational definition:":
            "Bridgman, P. W. (1927). The logic of modern physics. Macmillan.",
        "External validity refers to:":
            "Campbell, D. T., & Stanley, J. C. (1963). Experimental and quasi-experimental designs for research. Houghton Mifflin.",
        "Internal validity refers to:":
            "Campbell, D. T., & Stanley, J. C. (1963). Experimental and quasi-experimental designs for research. Houghton Mifflin.",
        "Type I error occurs when:":
            "Neyman, J., & Pearson, E. S. (1933). On the problem of the most efficient tests of statistical hypotheses. Philosophical Transactions of the Royal Society of London, Series A, 231, 289–337. https://doi.org/10.1098/rsta.1933.0009",
        "Type II error occurs when:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Correlation does NOT equal causation because:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "The Pearson r correlation coefficient ranges from:":
            "Pearson, K. (1895). Notes on regression and inheritance in the case of two parents. Proceedings of the Royal Society of London, 58, 240–242. https://doi.org/10.1098/rspl.1895.0041",
        "ANOVA (Analysis of Variance) is used to:":
            "Fisher, R. A. (1925). Statistical methods for research workers. Oliver and Boyd.",
        "The coefficient of determination (r²) indicates:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Demand characteristics in research occur when:":
            "Orne, M. T. (1962). On the social psychology of the psychological experiment: With particular reference to demand characteristics and their implications. American Psychologist, 17(11), 776–783. https://doi.org/10.1037/h0043424",
        "Counterbalancing in within-subjects designs:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Standard deviation is:":
            "Field, A. (2017). Discovering statistics using IBM SPSS Statistics (5th ed.). SAGE Publications.",
        "A confounding variable:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Stratified random sampling:":
            "Kish, L. (1965). Survey sampling. Wiley.",

        // ===== DOMAIN 8: Ethics (continued) =====
        "Informed consent for therapy (Standard 10.01) must include:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.01. https://www.apa.org/ethics/code",
        "The ethical standard on test security (Standard 9.11) requires that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 9.11. https://www.apa.org/ethics/code",
        "When laws and the APA Ethics Code conflict, psychologists should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 1.02. https://www.apa.org/ethics/code",
        "Standard 4.05 (Disclosures) permits psychologists to disclose confidential information:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 4.05. https://www.apa.org/ethics/code",
        "Abandonment in therapy occurs when a psychologist:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.10. https://www.apa.org/ethics/code See also: Younggren, J. N., & Gottlieb, M. C. (2008). Termination and abandonment: History, risk, and risk management. Professional Psychology: Research and Practice, 39(5), 498–504.",
        "Psychologists who become aware of a child abuse situation are:":
            "Child Abuse Prevention and Treatment Act (CAPTA), 42 U.S.C. §5101 et seq. (2010). See also: Kalichman, S. C. (1999). Mandated reporting of suspected child abuse: Ethics, law, & policy (2nd ed.). American Psychological Association.",
        "The concept of minimal disclosure means:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 4.04. https://www.apa.org/ethics/code",
        "Standard 3.10 (Informed Consent) applies to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.10. https://www.apa.org/ethics/code",
        "When providing testimony in court, psychologists must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.04. https://www.apa.org/ethics/code",
        "When conducting child custody evaluations, psychologists should:":
            "American Psychological Association. (2010). Guidelines for child custody evaluations in family law proceedings. American Psychologist, 65(9), 863–867. https://doi.org/10.1037/a0021250",
        "Bartering for services (Standard 6.05) is:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.05. https://www.apa.org/ethics/code",
        "Telepsychology ethics require psychologists to:":
            "Joint Task Force for the Development of Telepsychology Guidelines for Psychologists. (2013). Guidelines for the practice of telepsychology. American Psychologist, 68(9), 791–800. https://doi.org/10.1037/a0035001",
        "Psychologists working with interpreters must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.05. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 2).`);
})();
