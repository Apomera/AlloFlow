/* PasstheEPPP — APA Reference Overlay (Part 7)
   Targets uncited questions from batches 15-20.
   Loaded AFTER references_overlay6.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Domain 1: Biological =====
        "The difference between agonists and antagonists is:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology: Neuroscientific basis and practical applications (5th ed.). Cambridge University Press.",
        "Phantom limb pain after amputation is best explained by:":
            "Ramachandran, V. S., & Rogers-Ramachandran, D. (2000). Phantom limbs and neural plasticity. Archives of Neurology, 57(3), 317–320. https://doi.org/10.1001/archneur.57.3.317",
        "The action potential follows the:":
            "Bear, M. F., Connors, B. W., & Paradiso, M. A. (2016). Neuroscience: Exploring the brain (4th ed.). Wolters Kluwer.",
        "Chronic traumatic encephalopathy (CTE) is associated with:":
            "McKee, A. C., Cantu, R. C., Nowinski, C. J., Hedley-Whyte, E. T., Gavett, B. E., Budson, A. E., ... & Stern, R. A. (2009). Chronic traumatic encephalopathy in athletes. Journal of Neuropathology & Experimental Neurology, 68(7), 709–735. https://doi.org/10.1097/NEN.0b013e3181a9d503",
        "The ventricles of the brain contain:":
            "Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "Functional connectivity in neuroimaging refers to:":
            "Friston, K. J. (2011). Functional and effective connectivity: A review. Brain Connectivity, 1(1), 13–36. https://doi.org/10.1089/brain.2011.0008",
        "Anosognosia refers to:":
            "Prigatano, G. P. (2010). The study of anosognosia. Oxford University Press.",
        "Sensitization is a form of non-associative learning in which:":
            "Kandel, E. R. (2001). The molecular biology of memory storage: A dialogue between genes and synapses. Science, 294(5544), 1030–1038. https://doi.org/10.1126/science.1067020",
        "The blood alcohol concentration (BAC) that legally defines intoxication in most U.S. states is:":
            "National Highway Traffic Safety Administration. (2000). Setting limits, saving lives: The case for .08 BAC laws. U.S. Department of Transportation.",
        "The ventral tegmental area (VTA) is a key structure in:":
            "Wise, R. A. (2004). Dopamine, learning and motivation. Nature Reviews Neuroscience, 5(6), 483–494. https://doi.org/10.1038/nrn1406",
        "Phenylketonuria (PKU) illustrates:":
            "National Institutes of Health. (2000). Phenylketonuria: Screening and management (NIH Consensus Statement, Vol. 17, No. 3). https://consensus.nih.gov/2000/2000phenylketonuria113html.htm",
        "The superior colliculus is responsible for:":
            "Wurtz, R. H., & Albano, J. E. (1980). Visual-motor function of the primate superior colliculus. Annual Review of Neuroscience, 3, 189–226. https://doi.org/10.1146/annurev.ne.03.030180.001201",
        "Melatonin, produced by the pineal gland, is important for:":
            "Pandi-Perumal, S. R., Trakht, I., Srinivasan, V., Spence, D. W., Maestroni, G. J. M., Zisapel, N., & Cardinali, D. P. (2008). Physiological effects of melatonin. Progress in Neurobiology, 85(3), 335–353. https://doi.org/10.1016/j.pneurobio.2008.04.001",
        "The prefrontal cortex undergoes significant development through:":
            "Casey, B. J., Giedd, J. N., & Thomas, K. M. (2000). Structural and functional brain development and its relation to cognitive development. Biological Psychology, 54(1–3), 241–257. https://doi.org/10.1016/S0301-0511(00)00058-2",
        "The insula is involved in:":
            "Craig, A. D. (2009). How do you feel — now? The anterior insula and human awareness. Nature Reviews Neuroscience, 10(1), 59–70. https://doi.org/10.1038/nrn2555",
        "The sympathetic nervous system's fight-or-flight response includes:":
            "Cannon, W. B. (1932). The wisdom of the body. W. W. Norton.",
        "Multiple sclerosis (MS) is caused by:":
            "Compston, A., & Coles, A. (2008). Multiple sclerosis. The Lancet, 372(9648), 1502–1517. https://doi.org/10.1016/S0140-6736(08)61620-7",

        // ===== Domain 2: Cognitive-Affective =====
        "Schemas (Bartlett) influence memory by:":
            "Bartlett, F. C. (1932). Remembering: A study in experimental and social psychology. Cambridge University Press.",
        "Learned helplessness (Seligman) occurs when:":
            "Seligman, M. E. P. (1975). Helplessness: On depression, development, and death. W. H. Freeman.",
        "Intrinsic motivation (Deci & Ryan) is enhanced by satisfaction of:":
            "Deci, E. L., & Ryan, R. M. (2000). The 'what' and 'why' of goal pursuits: Human needs and the self-determination of behavior. Psychological Inquiry, 11(4), 227–268. https://doi.org/10.1207/S15327965PLI1104_01",
        "Dunning-Kruger effect describes:":
            "Kruger, J., & Dunning, D. (1999). Unskilled and unaware of it: How difficulties in recognizing one's own incompetence lead to inflated self-assessments. Journal of Personality and Social Psychology, 77(6), 1121–1134. https://doi.org/10.1037/0022-3514.77.6.1121",
        "Mood-congruent memory refers to:":
            "Bower, G. H. (1981). Mood and memory. American Psychologist, 36(2), 129–148. https://doi.org/10.1037/0003-066X.36.2.129",
        "Semantic memory refers to:":
            "Tulving, E. (1972). Episodic and semantic memory. In E. Tulving & W. Donaldson (Eds.), Organization of memory (pp. 381–402). Academic Press.",
        "Decision fatigue refers to:":
            "Baumeister, R. F., Bratslavsky, E., Muraven, M., & Tice, D. M. (1998). Ego depletion: Is the active self a limited resource? Journal of Personality and Social Psychology, 74(5), 1252–1265. https://doi.org/10.1037/0022-3514.74.5.1252",
        "The availability heuristic leads people to:":
            "Tversky, A., & Kahneman, D. (1973). Availability: A heuristic for judging frequency and probability. Cognitive Psychology, 5(2), 207–232. https://doi.org/10.1016/0010-0285(73)90033-9",
        "The weapons focus effect in eyewitness testimony refers to:":
            "Loftus, E. F., Loftus, G. R., & Messo, J. (1987). Some facts about 'weapon focus.' Law and Human Behavior, 11(1), 55–62. https://doi.org/10.1007/BF01044839",

        // ===== Domain 3: Social & Cultural =====
        "Cognitive dissonance increases with:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",
        "Acculturation strategies (Berry) include all EXCEPT:":
            "Berry, J. W. (1997). Immigration, acculturation, and adaptation. Applied Psychology, 46(1), 5–34. https://doi.org/10.1111/j.1464-0597.1997.tb01087.x",
        "Asch's conformity studies found that conformity INCREASED with:":
            "Asch, S. E. (1956). Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1–70. https://doi.org/10.1037/h0093718",
        "Prosocial behavior is MOST likely when:":
            "Batson, C. D. (2011). Altruism in humans. Oxford University Press.",
        "The authoritarian personality (Adorno) is characterized by:":
            "Adorno, T. W., Frenkel-Brunswik, E., Levinson, D. J., & Sanford, R. N. (1950). The authoritarian personality. Harper & Row.",
        "Implicit bias differs from explicit bias in that implicit bias:":
            "Greenwald, A. G., McGhee, D. E., & Schwartz, J. L. K. (1998). Measuring individual differences in implicit cognition: The Implicit Association Test. Journal of Personality and Social Psychology, 74(6), 1464–1480. https://doi.org/10.1037/0022-3514.74.6.1464",
        "Intergroup anxiety refers to:":
            "Stephan, W. G., & Stephan, C. W. (1985). Intergroup anxiety. Journal of Social Issues, 41(3), 157–175. https://doi.org/10.1111/j.1540-4560.1985.tb01134.x",
        "Conformity is REDUCED by:":
            "Asch, S. E. (1956). Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1–70.",
        "Cultural dimensions theory (Hofstede) includes:":
            "Hofstede, G. (2001). Culture's consequences: Comparing values, behaviors, institutions, and organizations across nations (2nd ed.). Sage Publications.",
        "The sleeper effect in persuasion occurs when:":
            "Kumkale, G. T., & Albarracín, D. (2004). The sleeper effect in persuasion: A meta-analytic review. Psychological Bulletin, 130(1), 143–172. https://doi.org/10.1037/0033-2909.130.1.143",

        // ===== Domain 4: Growth & Lifespan =====
        "The 'still face' paradigm (Tronick) demonstrates:":
            "Tronick, E., Als, H., Adamson, L., Wise, S., & Brazelton, T. B. (1978). The infant's response to entrapment between contradictory messages in face-to-face interaction. Journal of the American Academy of Child Psychiatry, 17(1), 1–13. https://doi.org/10.1016/S0002-7138(09)62273-1",
        "The rooting reflex in newborns:":
            "Palazzi, A., Meschini, R., & Piccinini, C. A. (2017). Neonatal reflexes and development. In N. Seel (Ed.), Encyclopedia of the sciences of learning. Springer.",
        "Conservation tasks (Piaget) assess whether children understand that:":
            "Piaget, J. (1965). The child's conception of number (C. Gattegno & F. M. Hodgson, Trans.). W. W. Norton.",
        "Preterm birth is defined as delivery before:":
            "World Health Organization. (2018). Preterm birth fact sheet. https://www.who.int/news-room/fact-sheets/detail/preterm-birth",
        "The socioemotional selectivity theory (Carstensen) proposes that:":
            "Carstensen, L. L. (1992). Social and emotional patterns in adulthood: Support for socioemotional selectivity theory. Psychology and Aging, 7(3), 331–338. https://doi.org/10.1037/0882-7974.7.3.331",
        "Transitive inference (Piaget) is achieved during:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Goodness of fit (Thomas & Chess) refers to:":
            "Thomas, A., & Chess, S. (1977). Temperament and development. Brunner/Mazel.",
        "Marcia's identity status of foreclosure involves:":
            "Marcia, J. E. (1966). Development and validation of ego-identity status. Journal of Personality and Social Psychology, 3(5), 551–558. https://doi.org/10.1037/h0023281",
        "Resiliency research has identified protective factors including:":
            "Werner, E. E. (1995). Resilience in development. Current Directions in Psychological Science, 4(3), 81–85. https://doi.org/10.1111/1467-8721.ep10772327",

        // ===== Domain 5: Assessment =====
        "A confidence interval around a test score represents:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "The Vineland Adaptive Behavior Scales assess:":
            "Sparrow, S. S., Cicchetti, D. V., & Saulnier, C. A. (2016). Vineland Adaptive Behavior Scales, Third Edition (Vineland-3). Pearson.",
        "In factor analysis, eigenvalues represent:":
            "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
        "Norm-referenced tests differ from criterion-referenced tests in that norm-referenced tests:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "The MCMI-IV (Millon Clinical Multiaxial Inventory) is specifically designed to assess:":
            "Millon, T., Grossman, S., & Millon, C. (2015). MCMI-IV manual. Pearson.",
        "Percentile rank of 84 means:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "A stanine score of 5 indicates:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "The Rorschach Performance Assessment System (R-PAS) is:":
            "Meyer, G. J., Viglione, D. J., Mihura, J. L., Erard, R. E., & Erdberg, P. (2011). Rorschach Performance Assessment System: Administration, coding, interpretation, and technical manual. https://r-pas.org",

        // ===== Domain 6: Treatment =====
        "The token economy is MOST appropriate for use in:":
            "Ayllon, T., & Azrin, N. (1968). The token economy: A motivational system for therapy and rehabilitation. Appleton-Century-Crofts.",
        "Flooding (implosive therapy) differs from systematic desensitization in that flooding:":
            "Stampfl, T. G., & Levis, D. J. (1967). Essentials of implosive therapy. Journal of Abnormal Psychology, 72(6), 496–503. https://doi.org/10.1037/h0025238",
        "Strategic family therapy (Haley) uses:":
            "Haley, J. (1976). Problem-solving therapy. Jossey-Bass.",
        "Pharmacotherapy for ADHD in children typically involves:":
            "Wolraich, M. L., Hagan, J. F., Allan, C., et al. (2019). Clinical practice guideline for the diagnosis, evaluation, and treatment of ADHD in children and adolescents. Pediatrics, 144(4), e20192528. https://doi.org/10.1542/peds.2019-2528",
        "Thought stopping is a technique where:":
            "Wolpe, J. (1958). Psychotherapy by reciprocal inhibition. Stanford University Press.",
        "Narrative therapy (White & Epston) involves helping clients:":
            "White, M., & Epston, D. (1990). Narrative means to therapeutic ends. W. W. Norton.",

        // ===== Domain 7: Research =====
        "A confounding variable threatens internal validity because it:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Counterbalancing is used in within-subjects designs to control for:":
            "Rosenthal, R., & Rosnow, R. L. (2008). Essentials of behavioral research: Methods and data analysis (3rd ed.). McGraw-Hill.",
        "Meta-analysis is a statistical technique that:":
            "Glass, G. V. (1976). Primary, secondary, and meta-analysis of research. Educational Researcher, 5(10), 3–8. https://doi.org/10.3102/0013189X005010003",
        "A single-case experimental design such as ABA (reversal) includes:":
            "Barlow, D. H., Nock, M. K., & Hersen, M. (2009). Single case experimental designs (3rd ed.). Allyn & Bacon.",
        "A correlation coefficient of r = -.85 indicates:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Regression analysis allows researchers to:":
            "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
        "Ecological validity in research refers to:":
            "Bronfenbrenner, U. (1979). The ecology of human development. Harvard University Press.",
        "Effect size measures:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "Ceiling and floor effects reduce:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",

        // ===== Domain 8: Ethics =====
        "Tarasoff v. Regents of the University of California established:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976). https://law.justia.com/cases/california/supreme-court/3d/17/425.html",
        "Informed consent must include:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.10. https://www.apa.org/ethics/code",
        "HIPAA's 'minimum necessary' standard requires:":
            "U.S. Department of Health and Human Services. (2003). Summary of the HIPAA Privacy Rule. https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html",
        "Competence to stand trial requires that the defendant:":
            "Dusky v. United States, 362 U.S. 402 (1960). https://supreme.justia.com/cases/federal/us/362/402/",
        "The distinction between ethics and law is that:":
            "Koocher, G. P., & Keith-Spiegel, P. (2016). Ethics in psychology and the mental health professions (4th ed.). Oxford University Press.",
        "Mandatory reporting of child abuse typically:":
            "Child Abuse Prevention and Treatment Act (CAPTA), 42 U.S.C. §5101 et seq. See also: Kalichman, S. C. (1999). Mandated reporting of suspected child abuse (2nd ed.). APA.",
        "The APA Ethics Code applies to psychologists':":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct — Introduction and Applicability. https://www.apa.org/ethics/code",
        "A psychologist who testifies as an expert witness should:":
            "American Psychological Association. (2013). Specialty guidelines for forensic psychology. American Psychologist, 68(1), 7–19. https://doi.org/10.1037/a0029889",
        "Group therapy confidentiality differs from individual therapy because:":
            "Lasky, G. B., & Riva, M. T. (2006). Confidentiality and privileged communication in group psychotherapy. International Journal of Group Psychotherapy, 56(4), 455–476. https://doi.org/10.1521/ijgp.2006.56.4.455",
        "The insanity defense (M'Naghten standard) requires demonstrating that:":
            "M'Naghten's Case, 10 Cl. & Fin. 200, 8 Eng. Rep. 718 (1843).",
        "A psychologist who has a sexual relationship with a current client is:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.05. https://www.apa.org/ethics/code",
        "Record-keeping requirements for psychologists typically state that:":
            "APA Committee on Professional Practice and Standards. (2007). Record keeping guidelines. American Psychologist, 62(9), 993–1004. https://doi.org/10.1037/0003-066X.62.9.993",
        "Psychologists must report their own ethical violations or impairment because:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standards 1.05 & 2.06. https://www.apa.org/ethics/code",
        "When psychologists provide services via telehealth, they must:":
            "Joint Task Force for the Development of Telepsychology Guidelines for Psychologists. (2013). Guidelines for the practice of telepsychology. American Psychologist, 68(9), 791–800. https://doi.org/10.1037/a0035001",
        "The APA Ethics Code's aspiration principles are:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct — General Principles. https://www.apa.org/ethics/code",
        "When a psychologist receives a subpoena for client records, they should:":
            "Committee on Legal Issues, APA. (2006). Strategies for private practitioners coping with subpoenas or compelled testimony for client records or test data. Professional Psychology: Research and Practice, 37(2), 215–222. https://doi.org/10.1037/0735-7028.37.2.215",
        "Bartering (accepting goods/services instead of payment) is:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.05. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 7).`);
})();
