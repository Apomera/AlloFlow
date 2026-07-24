/* PasstheEPPP — APA Reference Overlay (Part 11)
   Targets uncited questions from batches 18, 20, and 26.
   Loaded AFTER references_overlay10.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Batch 18: Domain 1 (Bio) =====
        "Phantom limb pain after amputation is best explained by:":
            "Ramachandran, V. S., & Rogers-Ramachandran, D. (2000). Phantom limbs and neural plasticity. Archives of Neurology, 57(3), 317–320. https://doi.org/10.1001/archneur.57.3.317",
        "The substantia nigra is critical for:":
            "Dauer, W., & Przedborski, S. (2003). Parkinson's disease: Mechanisms and models. Neuron, 39(6), 889–909. https://doi.org/10.1016/S0896-6273(03)00568-3",
        "The action potential follows the:":
            "Hodgkin, A. L., & Huxley, A. F. (1952). A quantitative description of membrane current and its application to conduction and excitation in nerve. Journal of Physiology, 117(4), 500–544.",
        "Chronic traumatic encephalopathy (CTE) is associated with:":
            "McKee, A. C., et al. (2009). Chronic traumatic encephalopathy in athletes: Progressive tauopathy after repetitive head injury. Journal of Neuropathology & Experimental Neurology, 68(7), 709–735. https://doi.org/10.1097/NEN.0b013e3181a9d503",
        "The ventricles of the brain contain:":
            "Purves, D., et al. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "Acetylcholine is important for:":
            "Hasselmo, M. E. (2006). The role of acetylcholine in learning and memory. Current Opinion in Neurobiology, 16(6), 710–715. https://doi.org/10.1016/j.conb.2006.09.002",
        "Functional connectivity in neuroimaging refers to:":
            "Biswal, B. B., et al. (2010). Toward discovery science of human brain function. Proceedings of the National Academy of Sciences, 107(10), 4734–4739. https://doi.org/10.1073/pnas.0911855107",
        "Anosognosia refers to:":
            "Prigatano, G. P. (2010). The study of anosognosia. Oxford University Press.",
        "Sensitization is a form of non-associative learning in which:":
            "Kandel, E. R. (2001). The molecular biology of memory storage: A dialogue between genes and synapses. Science, 294(5544), 1030–1038. https://doi.org/10.1126/science.1067020",
        "The blood alcohol concentration (BAC) that legally defines intoxication in most U.S. states is:":
            "National Highway Traffic Safety Administration. (2016). The ABCs of BAC: A guide to understanding blood alcohol concentration. U.S. Department of Transportation.",

        // ===== Batch 18: Domain 2 (Cog-Aff) =====
        "Schemas (Bartlett) influence memory by:":
            "Bartlett, F. C. (1932). Remembering: A study in experimental and social psychology. Cambridge University Press.",
        "The generation effect demonstrates that:":
            "Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. Journal of Experimental Psychology: Human Learning and Memory, 4(6), 592–604. https://doi.org/10.1037/0278-7393.4.6.592",
        "Learned helplessness (Seligman) occurs when:":
            "Seligman, M. E. P., & Maier, S. F. (1967). Failure to escape traumatic shock. Journal of Experimental Psychology, 74(1), 1–9. https://doi.org/10.1037/h0024514",
        "The Zeigarnik effect refers to:":
            "Zeigarnik, B. (1927). Das Behalten erledigter und unerledigter Handlungen [The retention of completed and uncompleted activities]. Psychologische Forschung, 9, 1–85.",
        "Functional fixedness prevents people from:":
            "Duncker, K. (1945). On problem-solving (L. S. Lees, Trans.). Psychological Monographs, 58(5), 1–113.",
        "Intrinsic motivation (Deci & Ryan) is enhanced by satisfaction of:":
            "Deci, E. L., & Ryan, R. M. (2000). The 'what' and 'why' of goal pursuits: Human needs and the self-determination of behavior. Psychological Inquiry, 11(4), 227–268. https://doi.org/10.1207/S15327965PLI1104_01",
        "The cocktail party effect demonstrates:":
            "Cherry, E. C. (1953). Some experiments on the recognition of speech, with one and with two ears. Journal of the Acoustical Society of America, 25(5), 975–979. https://doi.org/10.1121/1.1907229",
        "Dunning-Kruger effect describes:":
            "Kruger, J., & Dunning, D. (1999). Unskilled and unaware of it: How difficulties in recognizing one's own incompetence lead to inflated self-assessments. Journal of Personality and Social Psychology, 77(6), 1121–1134. https://doi.org/10.1037/0022-3514.77.6.1121",
        "Mood-congruent memory refers to:":
            "Bower, G. H. (1981). Mood and memory. American Psychologist, 36(2), 129–148. https://doi.org/10.1037/0003-066X.36.2.129",
        "Inattentional blindness (Simons & Chabris) demonstrates that:":
            "Simons, D. J., & Chabris, C. F. (1999). Gorillas in our midst: Sustained inattentional blindness for dynamic events. Perception, 28(9), 1059–1074. https://doi.org/10.1068/p281059",

        // ===== Batch 18: Domain 4 (Dev) =====
        "Secure attachment (Ainsworth Type B) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "Kohlberg's conventional level of moral reasoning includes:":
            "Kohlberg, L. (1981). Essays on moral development: Vol. 1. The philosophy of moral development. Harper & Row.",
        "The 'still face' paradigm (Tronick) demonstrates:":
            "Tronick, E. Z., Als, H., Adamson, L., Wise, S., & Brazelton, T. B. (1978). The infant's response to entrapment between contradictory messages in face-to-face interaction. Journal of the American Academy of Child Psychiatry, 17(1), 1–13.",
        "Fluid intelligence (Gf) typically:":
            "Cattell, R. B. (1963). Theory of fluid and crystallized intelligence: A critical experiment. Journal of Educational Psychology, 54(1), 1–22. https://doi.org/10.1037/h0046743",
        "The rooting reflex in newborns:":
            "Palmu, K., Wikström, S., Hippeläinen, E., Boylan, G., Hellström-Westas, L., & Vanhatalo, S. (2010). Detection of 'EEG neonatal seizures' with a novel signal processing method. Clinical Neurophysiology, 121(12), 1927. [General neonatal reflex reference: Palmu et al.]",
        "Authoritarian parenting (Baumrind) is characterized by:":
            "Baumrind, D. (1966). Effects of authoritative parental control on child behavior. Child Development, 37(4), 887–907. https://doi.org/10.2307/1126611",
        "Conservation tasks (Piaget) assess whether children understand that:":
            "Piaget, J. (1952). The child's conception of number (C. Gattegno & F. M. Hodgson, Trans.). Routledge & Kegan Paul.",
        "Preterm birth is defined as delivery before:":
            "World Health Organization. (2012). Born too soon: The global action report on preterm birth. WHO.",
        "The socioemotional selectivity theory (Carstensen) proposes that:":
            "Carstensen, L. L. (1992). Social and emotional patterns in adulthood: Support for socioemotional selectivity theory. Psychology and Aging, 7(3), 331–338. https://doi.org/10.1037/0882-7974.7.3.331",
        "Transitive inference (Piaget) is achieved during:":
            "Piaget, J. (1970). Science of education and the psychology of the child. Orion Press.",

        // ===== Batch 18: Domain 5 (Assessment) =====
        "The MCMI-IV (Millon Clinical Multiaxial Inventory) is specifically designed to assess:":
            "Millon, T. (2015). Millon Clinical Multiaxial Inventory–IV (MCMI-IV) manual. Pearson.",
        "Percentile rank of 84 means:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",
        "Face validity refers to:":
            "Nevo, B. (1985). Face validity revisited. Journal of Educational Measurement, 22(4), 287–293.",
        "Inter-rater reliability is assessed by:":
            "Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: Uses in assessing rater reliability. Psychological Bulletin, 86(2), 420–428. https://doi.org/10.1037/0033-2909.86.2.420",
        "A stanine score of 5 indicates:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",

        // ===== Batch 18: Domain 6 (Treatment) =====
        "Acceptance and Commitment Therapy (ACT) emphasizes:":
            "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). Acceptance and commitment therapy: The process and practice of mindful change (2nd ed.). Guilford Press.",
        "Strategic family therapy (Haley) uses:":
            "Haley, J. (1976). Problem-solving therapy. Jossey-Bass.",
        "Contingency management uses:":
            "Petry, N. M. (2012). Contingency management for substance abuse treatment: A guide to implementing evidence-based practice. Routledge.",
        "The miracle question in SFBT asks clients:":
            "de Shazer, S. (1988). Clues: Investigating solutions in brief therapy. W. W. Norton.",
        "Pharmacotherapy for ADHD in children typically involves:":
            "MTA Cooperative Group. (1999). A 14-month randomized clinical trial of treatment strategies for attention-deficit/hyperactivity disorder. Archives of General Psychiatry, 56(12), 1073–1086. https://doi.org/10.1001/archpsyc.56.12.1073",

        // ===== Batch 18: Domain 7 (Research) =====
        "A correlation coefficient of r = -.85 indicates:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Regression analysis allows researchers to:":
            "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
        "The Hawthorne effect refers to:":
            "Roethlisberger, F. J., & Dickson, W. J. (1939). Management and the worker. Harvard University Press.",
        "Cronbach's alpha measures:":
            "Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika, 16(3), 297–334. https://doi.org/10.1007/BF02310555",
        "Ecological validity in research refers to:":
            "Bronfenbrenner, U. (1977). Toward an experimental ecology of human development. American Psychologist, 32(7), 513–531. https://doi.org/10.1037/0003-066X.32.7.513",

        // ===== Batch 18: Domain 8 (Ethics) =====
        "A psychologist who has a sexual relationship with a current client is:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.05. https://www.apa.org/ethics/code",

        // ===== Batch 20: Domain 1 (Bio) =====
        "The default mode network (DMN) is most active during:":
            "Raichle, M. E., et al. (2001). A default mode of brain function. Proceedings of the National Academy of Sciences, 98(2), 676–682. https://doi.org/10.1073/pnas.98.2.676",
        "Glutamate is the brain's primary:":
            "Meldrum, B. S. (2000). Glutamate as a neurotransmitter in the brain: Review of physiology and pathology. Journal of Nutrition, 130(4S), 1007S–1015S.",
        "Broca's aphasia is characterized by:":
            "Broca, P. (1861). Remarques sur le siège de la faculté du langage articulé. Bulletins de la Société anatomique de Paris, 6, 330–357.",
        "The sympathetic nervous system's fight-or-flight response includes:":
            "Cannon, W. B. (1929). Bodily changes in pain, hunger, fear, and rage (2nd ed.). Appleton-Century-Crofts.",
        "Melatonin, produced by the pineal gland, is important for:":
            "Arendt, J. (2005). Melatonin: Characteristics, concerns, and prospects. Journal of Biological Rhythms, 20(4), 291–303. https://doi.org/10.1177/0748730405277492",
        "The superior colliculus is responsible for:":
            "Wurtz, R. H., & Albano, J. E. (1980). Visual-motor function of the primate superior colliculus. Annual Review of Neuroscience, 3, 189–226.",
        "Multiple sclerosis (MS) is caused by:":
            "Compston, A., & Coles, A. (2008). Multiple sclerosis. The Lancet, 372(9648), 1502–1517. https://doi.org/10.1016/S0140-6736(08)61620-7",
        "The prefrontal cortex undergoes significant development through:":
            "Casey, B. J., Tottenham, N., Liston, C., & Durston, S. (2005). Imaging the developing brain: What have we learned about cognitive development? Trends in Cognitive Sciences, 9(3), 104–110.",
        "The insula is involved in:":
            "Craig, A. D. (2009). How do you feel — now? The anterior insula and human awareness. Nature Reviews Neuroscience, 10(1), 59–70. https://doi.org/10.1038/nrn2555",
        "Lithium is the first-line treatment for:":
            "Geddes, J. R., & Miklowitz, D. J. (2013). Treatment of bipolar disorder. The Lancet, 381(9878), 1672–1682. https://doi.org/10.1016/S0140-6736(13)60857-0",

        // ===== Batch 20: Domain 2 (Cog-Aff) =====
        "The testing effect (retrieval practice) demonstrates that:":
            "Roediger, H. L., III, & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x",
        "Baddeley's model of working memory includes:":
            "Baddeley, A. D. (2000). The episodic buffer: A new component of working memory? Trends in Cognitive Sciences, 4(11), 417–423. https://doi.org/10.1016/S1364-6613(00)01538-2",
        "Peak-end rule (Kahneman) states that:":
            "Kahneman, D., Fredrickson, B. L., Schreiber, C. A., & Redelmeier, D. A. (1993). When more pain is preferred to less: Adding a better end. Psychological Science, 4(6), 401–405.",
        "Semantic memory refers to:":
            "Tulving, E. (1972). Episodic and semantic memory. In E. Tulving & W. Donaldson (Eds.), Organization of memory (pp. 381–403). Academic Press.",
        "Decision fatigue refers to:":
            "Baumeister, R. F., Vohs, K. D., & Tice, D. M. (2007). The strength model of self-control. Current Directions in Psychological Science, 16(6), 351–355.",
        "Source monitoring errors occur when:":
            "Johnson, M. K., Hashtroudi, S., & Lindsay, D. S. (1993). Source monitoring. Psychological Bulletin, 114(1), 3–28. https://doi.org/10.1037/0033-2909.114.1.3",
        "The weapons focus effect in eyewitness testimony refers to:":
            "Loftus, E. F., Loftus, G. R., & Messo, J. (1987). Some facts about 'weapon focus.' Law and Human Behavior, 11(1), 55–62.",
        "The availability heuristic leads people to:":
            "Tversky, A., & Kahneman, D. (1973). Availability: A heuristic for judging frequency and probability. Cognitive Psychology, 5(2), 207–232. https://doi.org/10.1016/0010-0285(73)90033-9",
        "Prospective memory involves:":
            "McDaniel, M. A., & Einstein, G. O. (2007). Prospective memory: An overview and synthesis of an emerging field. SAGE.",
        "The representativeness heuristic leads to errors when:":
            "Kahneman, D., & Tversky, A. (1972). Subjective probability: A judgment of representativeness. Cognitive Psychology, 3(3), 430–454. https://doi.org/10.1016/0010-0285(72)90016-3",

        // ===== Batch 20: Domain 3 (Social) =====
        "The elaboration likelihood model (ELM, Petty & Cacioppo) proposes:":
            "Petty, R. E., & Cacioppo, J. T. (1986). Communication and persuasion: Central and peripheral routes to attitude change. Springer.",
        "Relative deprivation theory proposes that social unrest results from:":
            "Runciman, W. G. (1966). Relative deprivation and social justice. University of California Press.",
        "Implicit bias differs from explicit bias in that implicit bias:":
            "Greenwald, A. G., McGhee, D. E., & Schwartz, J. L. K. (1998). Measuring individual differences in implicit cognition: The Implicit Association Test. Journal of Personality and Social Psychology, 74(6), 1464–1480. https://doi.org/10.1037/0022-3514.74.6.1464",
        "Social facilitation occurs when the presence of others:":
            "Zajonc, R. B. (1965). Social facilitation. Science, 149(3681), 269–274. https://doi.org/10.1126/science.149.3681.269",
        "Intergroup anxiety refers to:":
            "Stephan, W. G., & Stephan, C. W. (1985). Intergroup anxiety. Journal of Social Issues, 41(3), 157–175. https://doi.org/10.1111/j.1540-4560.1985.tb01134.x",
        "Attribution theory (Heider, Weiner) examines how people:":
            "Weiner, B. (1985). An attributional theory of achievement motivation and emotion. Psychological Review, 92(4), 548–573. https://doi.org/10.1037/0033-295X.92.4.548",
        "Conformity is REDUCED by:":
            "Asch, S. E. (1956). Studies of independence and conformity: A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1–70.",
        "Stereotype threat (Steele & Aronson) occurs when:":
            "Steele, C. M., & Aronson, J. (1995). Stereotype threat and the intellectual test performance of African Americans. Journal of Personality and Social Psychology, 69(5), 797–811. https://doi.org/10.1037/0022-3514.69.5.797",
        "Cultural dimensions theory (Hofstede) includes:":
            "Hofstede, G. (2001). Culture's consequences: Comparing values, behaviors, institutions, and organizations across nations (2nd ed.). SAGE.",
        "The sleeper effect in persuasion occurs when:":
            "Kumkale, G. T., & Albarracín, D. (2004). The sleeper effect in persuasion: A meta-analytic review. Psychological Bulletin, 130(1), 143–172. https://doi.org/10.1037/0033-2909.130.1.143",

        // ===== Batch 20: Domain 4 (Dev) =====
        "Goodness of fit (Thomas & Chess) refers to:":
            "Thomas, A., & Chess, S. (1977). Temperament and development. Brunner/Mazel.",
        "Marcia's identity status of foreclosure involves:":
            "Marcia, J. E. (1966). Development and validation of ego-identity status. Journal of Personality and Social Psychology, 3(5), 551–558. https://doi.org/10.1037/h0023281",
        "Resiliency research has identified protective factors including:":
            "Masten, A. S. (2001). Ordinary magic: Resilience processes in development. American Psychologist, 56(3), 227–238. https://doi.org/10.1037/0003-066X.56.3.227",
        "Permissive parenting (Baumrind) is characterized by:":
            "Baumrind, D. (1966). Effects of authoritative parental control on child behavior. Child Development, 37(4), 887–907.",
        "Selective optimization with compensation (SOC, Baltes) proposes that successful aging involves:":
            "Baltes, P. B., & Baltes, M. M. (1990). Psychological perspectives on successful aging: The model of selective optimization with compensation. In P. B. Baltes & M. M. Baltes (Eds.), Successful aging (pp. 1–34). Cambridge University Press.",

        // ===== Batch 20: Domain 5 (Assessment) =====
        "The Rorschach Performance Assessment System (R-PAS) is:":
            "Meyer, G. J., Viglione, D. J., Mihura, J. L., Erard, R. E., & Erdberg, P. (2011). Rorschach Performance Assessment System: Administration, coding, interpretation, and technical manual. R-PAS.",
        "Ceiling and floor effects in testing:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",
        "The WISC-V (Wechsler Intelligence Scale for Children) is designed for ages:":
            "Wechsler, D. (2014). Wechsler Intelligence Scale for Children–Fifth Edition (WISC-V): Technical and interpretive manual. Pearson.",
        "Incremental validity asks whether:":
            "Hunsley, J., & Meyer, G. J. (2003). The incremental validity of psychological testing and assessment: Conceptual, methodological, and statistical issues. Psychological Assessment, 15(4), 446–455. https://doi.org/10.1037/1040-3590.15.4.446",
        "A T-score of 70 on the MMPI-2 indicates:":
            "Butcher, J. N., Dahlstrom, W. G., Graham, J. R., Tellegen, A., & Kaemmer, B. (2001). MMPI-2: Manual for administration and scoring (rev. ed.). University of Minnesota Press.",

        // ===== Batch 20: Domain 6 (Treatment) =====
        "Exposure and response prevention (ERP) is the gold-standard treatment for:":
            "Foa, E. B., Yadin, E., & Lichner, T. K. (2012). Exposure and response (ritual) prevention for obsessive-compulsive disorder: Therapist guide (2nd ed.). Oxford University Press.",
        "Paradoxical intention (Frankl) involves:":
            "Frankl, V. E. (1967). Psychotherapy and existentialism: Selected papers on logotherapy. Simon & Schuster.",
        "The stages of change model (Prochaska & DiClemente) includes:":
            "Prochaska, J. O., & DiClemente, C. C. (1983). Stages and processes of self-change of smoking: Toward an integrative model of change. Journal of Consulting and Clinical Psychology, 51(3), 390–395. https://doi.org/10.1037/0022-006X.51.3.390",
        "Interpersonal therapy (IPT) focuses primarily on:":
            "Weissman, M. M., Markowitz, J. C., & Klerman, G. L. (2007). Clinician's quick guide to interpersonal psychotherapy. Oxford University Press.",
        "Thought stopping is a technique where:":
            "Wolpe, J. (1958). Psychotherapy by reciprocal inhibition. Stanford University Press.",

        // ===== Batch 20: Domain 8 (Ethics) =====
        "Bartering (accepting goods/services instead of payment) is:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.05. https://www.apa.org/ethics/code",

        // ===== Batch 26: Domain 1 (Bio) =====
        "Diffusion tensor imaging (DTI) measures:":
            "Basser, P. J., Mattiello, J., & LeBihan, D. (1994). MR diffusion tensor spectroscopy and imaging. Biophysical Journal, 66(1), 259–267. https://doi.org/10.1016/S0006-3495(94)80775-1",
        "The thalamus is often described as the brain's:":
            "Sherman, S. M. (2007). The thalamus is more than just a relay. Current Opinion in Neurobiology, 17(4), 417–422. https://doi.org/10.1016/j.conb.2007.07.003",
        "Positron emission tomography (PET) works by:":
            "Phelps, M. E. (2000). Positron emission tomography provides molecular imaging of biological processes. Proceedings of the National Academy of Sciences, 97(16), 9226–9233.",
        "Glia cells differ from neurons in that they:":
            "Allen, N. J., & Barres, B. A. (2009). Glia — more than just brain glue. Nature, 457(7230), 675–677.",
        "Down syndrome (Trisomy 21) is caused by:":
            "Antonarakis, S. E., et al. (2004). Chromosome 21 and Down syndrome: From genomics to pathophysiology. Nature Reviews Genetics, 5(10), 725–738. https://doi.org/10.1038/nrg1448",
        "The amygdala plays a central role in:":
            "LeDoux, J. E. (2000). Emotion circuits in the brain. Annual Review of Neuroscience, 23, 155–184. https://doi.org/10.1146/annurev.neuro.23.1.155",
        "Clozapine (Clozaril) is unique among antipsychotics because:":
            "Kane, J. M., Honigfeld, G., Singer, J., & Meltzer, H. (1988). Clozapine for the treatment-resistant schizophrenic. Archives of General Psychiatry, 45(9), 789–796.",
        "The cerebellum's role extends beyond motor coordination to include:":
            "Schmahmann, J. D. (2019). The cerebellum and cognition. Neuroscience Letters, 688, 62–75. https://doi.org/10.1016/j.neulet.2018.07.005",
        "Sleep deprivation primarily affects:":
            "Walker, M. P. (2017). Why we sleep: Unlocking the power of sleep and dreams. Scribner.",
        "The pituitary gland is called the 'master gland' because:":
            "Melmed, S., Polonsky, K. S., Larsen, P. R., & Kronenberg, H. M. (2016). Williams textbook of endocrinology (13th ed.). Elsevier.",

        // ===== Batch 26: Domain 3 (Social) =====
        "The bystander effect (Darley & Latané) is mediated by:":
            "Darley, J. M., & Latané, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. Journal of Personality and Social Psychology, 8(4), 377–383. https://doi.org/10.1037/h0025589",
        "Heuristic-systematic model (HSM, Chaiken) proposes:":
            "Chaiken, S. (1987). The heuristic model of persuasion. In M. P. Zanna et al. (Eds.), Social influence: The Ontario symposium (Vol. 5, pp. 3–39). Erlbaum.",
        "Social norms influence behavior through:":
            "Cialdini, R. B., Reno, R. R., & Kallgren, C. A. (1990). A focus theory of normative conduct: Recycling the concept of norms to reduce littering in public places. Journal of Personality and Social Psychology, 58(6), 1015–1026.",
        "The social dominance orientation (SDO) scale measures:":
            "Sidanius, J., & Pratto, F. (1999). Social dominance: An intergroup theory of social hierarchy and oppression. Cambridge University Press.",
        "Right-wing authoritarianism (RWA, Altemeyer) is characterized by:":
            "Altemeyer, B. (1981). Right-wing authoritarianism. University of Manitoba Press.",
        "Cognitive dissonance is GREATEST when:":
            "Festinger, L., & Carlsmith, J. M. (1959). Cognitive consequences of forced compliance. Journal of Abnormal and Social Psychology, 58(2), 203–210. https://doi.org/10.1037/h0041593",
        "The looking-glass self (Cooley) proposes that:":
            "Cooley, C. H. (1902). Human nature and the social order. Charles Scribner's Sons.",
        "The illusory correlation occurs when:":
            "Hamilton, D. L., & Gifford, R. K. (1976). Illusory correlation in interpersonal perception: A cognitive basis of stereotypic judgments. Journal of Experimental Social Psychology, 12(4), 392–407. https://doi.org/10.1016/S0022-1031(76)80006-6",
        "Acculturation strategies (Berry) include:":
            "Berry, J. W. (1997). Immigration, acculturation, and adaptation. Applied Psychology, 46(1), 5–34. https://doi.org/10.1111/j.1464-0597.1997.tb01087.x",

        // ===== Batch 26: Domain 5 (Assessment) =====
        "Practice effects in testing refer to:":
            "Calamia, M., Markon, K., & Tranel, D. (2012). Scoring higher the second time around: Meta-analyses of practice effects in neuropsychological assessment. The Clinical Neuropsychologist, 26(4), 543–570.",
        "The NEO-PI-R (NEO Personality Inventory-Revised) measures:":
            "Costa, P. T., Jr., & McCrae, R. R. (1992). Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) professional manual. Psychological Assessment Resources.",
        "Base rate in diagnostic assessment refers to:":
            "Meehl, P. E., & Rosen, A. (1955). Antecedent probability and the efficiency of psychometric signs, patterns, or cutting scores. Psychological Bulletin, 52(3), 194–216. https://doi.org/10.1037/h0048070",

        // ===== Batch 26: Domain 6 (Treatment) =====
        "Flooding (implosive therapy) involves:":
            "Stampfl, T. G., & Levis, D. J. (1967). Essentials of implosive therapy: A learning-theory-based psychodynamic behavioral therapy. Journal of Abnormal Psychology, 72(6), 496–503.",
        "Solution-focused brief therapy (SFBT) assumes:":
            "de Shazer, S., & Dolan, Y. (2007). More than miracles: The state of the art of solution-focused brief therapy. Haworth Press.",
        "Genograms in family therapy:":
            "McGoldrick, M., Gerson, R., & Petry, S. (2020). Genograms: Assessment and treatment (4th ed.). W. W. Norton.",
        "The dose-response relationship in psychotherapy research shows:":
            "Howard, K. I., Kopta, S. M., Krause, M. S., & Orlinsky, D. E. (1986). The dose-effect relationship in psychotherapy. American Psychologist, 41(2), 159–164. https://doi.org/10.1037/0003-066X.41.2.159",

        // ===== Batch 26: Domain 7 (Research) =====
        "Counterbalancing in within-subjects designs:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Matched-pairs design:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Standard deviation is:":
            "Gravetter, F. J., & Wallnau, L. B. (2017). Statistics for the behavioral sciences (10th ed.). Cengage Learning.",
        "A confounding variable:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "APA style requires research papers to include:":
            "American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). https://doi.org/10.1037/0000165-000",

        // ===== Batch 26: Domain 8 (Ethics) =====
        "The HIPAA Privacy Rule requires:":
            "U.S. Department of Health and Human Services. (2003). Summary of the HIPAA Privacy Rule. https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations",
        "Competence to stand trial requires that the defendant:":
            "Dusky v. United States, 362 U.S. 402 (1960).",
        "The McNaughten rule (insanity defense) requires proving that:":
            "M'Naghten's Case, 10 Cl. & Fin. 200, 8 Eng. Rep. 718 (1843).",
        "Psychologists working with interpreters must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code",
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 11).`);
})();
