/* PasstheEPPP — APA Reference Overlay (Part 6)
   Final sweep — covers remaining uncited questions from all batches.
   Loaded AFTER references_overlay5.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Domain 1: Biological (remaining) =====
        "The prefrontal cortex is MOST involved in:":
            "Miller, E. K., & Cohen, J. D. (2001). An integrative theory of prefrontal cortex function. Annual Review of Neuroscience, 24, 167–202. https://doi.org/10.1146/annurev.neuro.24.1.167",
        "GABA (gamma-aminobutyric acid) is the brain's primary:":
            "Olsen, R. W., & Sieghart, W. (2009). GABA_A receptors: Subtypes provide diversity of function and pharmacology. Neuropharmacology, 56(1), 141–148. https://doi.org/10.1016/j.neuropharm.2008.07.045",
        "The hippocampus is MOST critical for:":
            "Squire, L. R. (1992). Memory and the hippocampus: A synthesis from findings with rats, monkeys, and humans. Psychological Review, 99(2), 195–231. https://doi.org/10.1037/0033-295X.99.2.195",
        "Multiple sclerosis involves damage to the:":
            "Compston, A., & Coles, A. (2008). Multiple sclerosis. The Lancet, 372(9648), 1502–1517. https://doi.org/10.1016/S0140-6736(08)61620-7",
        "Parkinson's disease is caused by degeneration of:":
            "Davie, C. A. (2008). A review of Parkinson's disease. British Medical Bulletin, 86(1), 109–127. https://doi.org/10.1093/bmb/ldn013",
        "Benzodiazepines enhance the effects of:":
            "Möhler, H. (2006). GABA_A receptor diversity and pharmacology. Cell and Tissue Research, 326(2), 505–516. https://doi.org/10.1007/s00441-006-0284-3",
        "The fight-or-flight response is mediated by the:":
            "Cannon, W. B. (1932). The wisdom of the body. W. W. Norton. See also: Selye, H. (1956). The stress of life. McGraw-Hill.",
        "Fetal alcohol spectrum disorders (FASD) result from:":
            "Hoyme, H. E., Kalberg, W. O., Elliott, A. J., Blankenship, J., Buckley, D., Marais, A. S., ... & May, P. A. (2016). Updated clinical guidelines for diagnosing fetal alcohol spectrum disorders. Pediatrics, 138(2), e20154256. https://doi.org/10.1542/peds.2015-4256",
        "Acetylcholine is primarily involved in:":
            "Sarter, M., & Parikh, V. (2005). Choline transporters, cholinergic transmission and cognition. Nature Reviews Neuroscience, 6(1), 48–56. https://doi.org/10.1038/nrn1588",
        "The temporal lobe is MOST associated with:":
            "Squire, L. R., & Zola-Morgan, S. (1991). The medial temporal lobe memory system. Science, 253(5026), 1380–1386. https://doi.org/10.1126/science.1896849",
        "The occipital lobe is primarily responsible for:":
            "Wandell, B. A., Dumoulin, S. O., & Brewer, A. A. (2007). Visual field maps in human cortex. Neuron, 56(2), 366–383. https://doi.org/10.1016/j.neuron.2007.10.012",
        "The parietal lobe is involved in:":
            "Culham, J. C., & Kanwisher, N. G. (2001). Neuroimaging of cognitive functions in human parietal cortex. Current Opinion in Neurobiology, 11(2), 157–163. https://doi.org/10.1016/S0959-4388(00)00191-4",
        "The frontal lobe is responsible for:":
            "Stuss, D. T., & Knight, R. T. (Eds.). (2013). Principles of frontal lobe function (2nd ed.). Oxford University Press.",
        "Somatosensory cortex is located in the:":
            "Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (2012). Neuroscience (5th ed.). Sinauer Associates.",

        // ===== Domain 2: Cognitive-Affective (remaining) =====
        "Classical conditioning was discovered by:":
            "Pavlov, I. P. (1927). Conditioned reflexes (G. V. Anrep, Trans.). Oxford University Press.",
        "Operant conditioning (Skinner) involves:":
            "Skinner, B. F. (1938). The behavior of organisms: An experimental analysis. Appleton-Century-Crofts.",
        "Negative reinforcement:":
            "Skinner, B. F. (1953). Science and human behavior. Macmillan.",
        "Positive punishment:":
            "Skinner, B. F. (1953). Science and human behavior. Macmillan.",
        "Extinction in classical conditioning occurs when:":
            "Pavlov, I. P. (1927). Conditioned reflexes (G. V. Anrep, Trans.). Oxford University Press.",
        "Stimulus generalization in classical conditioning:":
            "Pavlov, I. P. (1927). Conditioned reflexes (G. V. Anrep, Trans.). Oxford University Press.",
        "Observational learning (Bandura) requires:":
            "Bandura, A. (1977). Social learning theory. Prentice Hall.",
        "The levels of processing framework (Craik & Lockhart) proposes that:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671–684. https://doi.org/10.1016/S0022-5371(72)80001-X",
        "State-dependent learning demonstrates that:":
            "Goodwin, D. W., Powell, B., Bremer, D., Hoine, H., & Stern, J. (1969). Alcohol and recall: State-dependent effects in man. Science, 163(3873), 1358–1360. https://doi.org/10.1126/science.163.3873.1358",
        "Ebbinghaus's forgetting curve shows that:":
            "Ebbinghaus, H. (1885/1913). Memory: A contribution to experimental psychology (H. A. Ruger & C. E. Bussenius, Trans.). Teachers College, Columbia University.",

        // ===== Domain 3: Social (remaining) =====
        "The Robbers Cave experiment demonstrated that:":
            "Sherif, M., Harvey, O. J., White, B. J., Hood, W. R., & Sherif, C. W. (1961). Intergroup conflict and cooperation: The Robbers Cave experiment. University of Oklahoma Book Exchange.",
        "Prejudice reduction is MOST effective when:":
            "Pettigrew, T. F., & Tropp, L. R. (2006). A meta-analytic test of intergroup contact theory. Journal of Personality and Social Psychology, 90(5), 751–783. https://doi.org/10.1037/0022-3514.90.5.751",
        "Conformity increases with:":
            "Asch, S. E. (1955). Opinions and social pressure. Scientific American, 193(5), 31–35.",
        "The halo effect describes:":
            "Nisbett, R. E., & Wilson, T. D. (1977). The halo effect: Evidence for unconscious alteration of judgments. Journal of Personality and Social Psychology, 35(4), 250–256. https://doi.org/10.1037/0022-3514.35.4.250",
        "Mere exposure effect (Zajonc) demonstrates that:":
            "Zajonc, R. B. (1968). Attitudinal effects of mere exposure. Journal of Personality and Social Psychology, 9(2, Pt. 2), 1–27. https://doi.org/10.1037/h0025848",
        "Equity theory (Adams) in relationships proposes:":
            "Adams, J. S. (1965). Inequity in social exchange. In L. Berkowitz (Ed.), Advances in experimental social psychology (Vol. 2, pp. 267–299). Academic Press.",
        "The self-fulfilling prophecy (Rosenthal effect) occurs when:":
            "Rosenthal, R., & Jacobson, L. (1968). Pygmalion in the classroom: Teacher expectation and pupils' intellectual development. Holt, Rinehart & Winston.",
        "Cognitive dissonance is strongest when behavior is:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",

        // ===== Domain 4: Growth & Lifespan (remaining) =====
        "Erikson's industry vs. inferiority (school age) involves:":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton.",
        "Erikson's initiative vs. guilt (preschool) involves:":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton.",
        "Erikson's autonomy vs. shame and doubt (toddlerhood) involves:":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton.",
        "Erikson's intimacy vs. isolation (young adulthood) involves:":
            "Erikson, E. H. (1950). Childhood and society. W. W. Norton.",
        "Piaget's sensorimotor stage (0-2) is characterized by:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Crystallized intelligence (Cattell) refers to:":
            "Cattell, R. B. (1963). Theory of fluid and crystallized intelligence: A critical experiment. Journal of Educational Psychology, 54(1), 1–22. https://doi.org/10.1037/h0046743",
        "Fluid intelligence (Cattell) refers to:":
            "Cattell, R. B. (1963). Theory of fluid and crystallized intelligence: A critical experiment. Journal of Educational Psychology, 54(1), 1–22. https://doi.org/10.1037/h0046743",
        "Cross-cultural research on attachment shows:":
            "van IJzendoorn, M. H., & Sagi-Schwartz, A. (2008). Cross-cultural patterns of attachment: Universal and contextual dimensions. In J. Cassidy & P. R. Shaver (Eds.), Handbook of attachment (2nd ed., pp. 880–905). Guilford Press.",
        "Selective attention develops significantly during:":
            "Rueda, M. R., Posner, M. I., & Rothbart, M. K. (2005). The development of executive attention: Contributions to the emergence of self-regulation. Developmental Neuropsychology, 28(2), 573–594. https://doi.org/10.1207/s15326942dn2802_2",
        "Habituation studies in infancy demonstrate that:":
            "Fantz, R. L. (1964). Visual experience in infants: Decreased attention to familiar patterns relative to novel ones. Science, 146(3644), 668–670. https://doi.org/10.1126/science.146.3644.668",

        // ===== Domain 5: Assessment (remaining) =====
        "The Wechsler scales use a deviation IQ with a mean of:":
            "Wechsler, D. (2008). Wechsler Adult Intelligence Scale—Fourth Edition (WAIS-IV). Pearson.",
        "The Strong Interest Inventory measures:":
            "Donnay, D. A. C., Morris, M. L., Schaubhut, N. A., & Thompson, R. C. (2005). Strong Interest Inventory manual: Research, development, and strategies for interpretation. CPP, Inc.",
        "Convergent validity is demonstrated when:":
            "Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. Psychological Bulletin, 56(2), 81–105. https://doi.org/10.1037/h0046016",
        "Discriminant validity is demonstrated when:":
            "Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. Psychological Bulletin, 56(2), 81–105. https://doi.org/10.1037/h0046016",
        "Item response theory (IRT) differs from classical test theory by:":
            "Embretson, S. E., & Reise, S. P. (2000). Item response theory for psychologists. Erlbaum.",
        "A z-score of 0 indicates:":
            "Field, A. (2017). Discovering statistics using IBM SPSS Statistics (5th ed.). SAGE Publications.",
        "Structured interviews differ from unstructured interviews in:":
            "Groth-Marnat, G., & Wright, A. J. (2016). Handbook of psychological assessment (6th ed.). Wiley.",

        // ===== Domain 6: Treatment (remaining) =====
        "Cognitive therapy (Beck) for depression targets:":
            "Beck, A. T. (1976). Cognitive therapy and the emotional disorders. International Universities Press.",
        "Psychoanalytic therapy uses free association to:":
            "Freud, S. (1913). On beginning the treatment. Standard Edition, 12, 121–144.",
        "Transference in psychoanalytic therapy occurs when:":
            "Freud, S. (1912). The dynamics of transference. Standard Edition, 12, 97–108.",
        "Countertransference refers to:":
            "Heimann, P. (1950). On countertransference. International Journal of Psycho-Analysis, 31, 81–84.",
        "Systematic desensitization involves:":
            "Wolpe, J. (1958). Psychotherapy by reciprocal inhibition. Stanford University Press.",
        "Applied behavior analysis (ABA) is the treatment of choice for:":
            "Lovaas, O. I. (1987). Behavioral treatment and normal educational and intellectual functioning in young autistic children. Journal of Consulting and Clinical Psychology, 55(1), 3–9. https://doi.org/10.1037/0022-006X.55.1.3",
        "Group therapy offers unique therapeutic factors including:":
            "Yalom, I. D., & Leszcz, M. (2005). The theory and practice of group psychotherapy (5th ed.). Basic Books.",
        "Resistance in psychoanalytic therapy refers to:":
            "Freud, S. (1926). Inhibitions, symptoms and anxiety. Standard Edition, 20, 75–175.",
        "The miracle question in solution-focused therapy asks:":
            "de Shazer, S. (1988). Clues: Investigating solutions in brief therapy. W. W. Norton.",
        "Cognitive restructuring involves:":
            "Beck, J. S. (2020). Cognitive behavior therapy: Basics and beyond (3rd ed.). Guilford Press.",
        "Biofeedback involves:":
            "Schwartz, M. S., & Andrasik, F. (Eds.). (2017). Biofeedback: A practitioner's guide (4th ed.). Guilford Press.",
        "Assertiveness training teaches:":
            "Alberti, R. E., & Emmons, M. L. (2017). Your perfect right: Assertiveness and equality in your life and relationships (10th ed.). Impact Publishers.",
        "Family systems theory views:":
            "Von Bertalanffy, L. (1968). General system theory: Foundations, development, applications. George Braziller. See also: Bowen, M. (1978). Family therapy in clinical practice. Jason Aronson.",

        // ===== Domain 7: Research (remaining) =====
        "The independent variable in an experiment is:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "The dependent variable in an experiment is:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "A double-blind study:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Informed consent in research requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 8.02. https://www.apa.org/ethics/code",
        "Debriefing in research is required to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 8.08. https://www.apa.org/ethics/code",
        "The placebo effect:":
            "Benedetti, F. (2014). Placebo effects: Understanding the mechanisms in health and disease (2nd ed.). Oxford University Press.",
        "Construct validity in research:":
            "Cronbach, L. J., & Meehl, P. E. (1955). Construct validity in psychological tests. Psychological Bulletin, 52(4), 281–302. https://doi.org/10.1037/h0040957",
        "Cross-lagged panel designs:":
            "Kenny, D. A. (1975). Cross-lagged panel correlation: A test for spuriousness. Psychological Bulletin, 82(6), 887–903. https://doi.org/10.1037/0033-2909.82.6.887",

        // ===== Domain 8: Ethics (remaining) =====
        "Privilege (therapist-client privilege) applies in:":
            "Jaffee v. Redmond, 518 U.S. 1 (1996). https://supreme.justia.com/cases/federal/us/518/1/",
        "The right to refuse treatment:":
            "Rennie v. Klein, 653 F.2d 836 (3d Cir. 1981). See also: Rogers v. Commissioner, 390 Mass. 489 (1983).",
        "Involuntary commitment requires:":
            "O'Connor v. Donaldson, 422 U.S. 563 (1975). https://supreme.justia.com/cases/federal/us/422/563/",
        "Least restrictive alternative in mental health treatment:":
            "Wyatt v. Stickney, 325 F. Supp. 781 (M.D. Ala. 1971). See also: Lake v. Cameron, 364 F.2d 657 (D.C. Cir. 1966).",
        "The insanity defense:":
            "M'Naghten's Case, 10 Cl. & Fin. 200, 8 Eng. Rep. 718 (1843). See also: American Law Institute. (1962). Model Penal Code § 4.01.",
        "Child custody evaluations should be guided by:":
            "American Psychological Association. (2010). Guidelines for child custody evaluations in family law proceedings. American Psychologist, 65(9), 863–867. https://doi.org/10.1037/a0021250",
        "Standard 3.06 (Conflict of Interest) requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.06. https://www.apa.org/ethics/code",
        "Supervisors are ethically responsible for:":
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 6).`);
})();
