/* PasstheEPPP — APA Reference Overlay (Part 3)
   Covers questions from data_batch7 through data_batch15.
   Loaded AFTER references_overlay2.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Batch 7-8 questions =====
        "The default mode network (DMN) is most active during:":
            "Raichle, M. E., MacLeod, A. M., Snyder, A. Z., Powers, W. J., Gusnard, D. A., & Shulman, G. L. (2001). A default mode of brain function. Proceedings of the National Academy of Sciences, 98(2), 676–682. https://doi.org/10.1073/pnas.98.2.676",
        "Broca's aphasia is characterized by:":
            "Broca, P. (1861). Remarks on the seat of the faculty of articulated language, following an observation of aphemia. Bulletin de la Société Anatomique, 6, 330–357. See also: Dronkers, N. F., Plaisant, O., Iba-Zizen, M. T., & Cabanis, E. A. (2007). Paul Broca's historic cases: High resolution MR imaging of the brains of Leborgne and Lelong. Brain, 130(5), 1432–1441.",
        "Wernicke's aphasia is characterized by:":
            "Wernicke, C. (1874). Der aphasische Symptomenkomplex [The aphasia symptom complex]. Cohn & Weigert.",
        "Neuroplasticity refers to:":
            "Kolb, B., & Gibb, R. (2011). Brain plasticity and behaviour in the developing brain. Journal of the Canadian Academy of Child and Adolescent Psychiatry, 20(4), 265–276.",
        "The Wisconsin Card Sorting Test (WCST) primarily assesses:":
            "Berg, E. A. (1948). A simple objective technique for measuring flexibility in thinking. Journal of General Psychology, 39(1), 15–22. https://doi.org/10.1080/00221309.1948.9918159",
        "Milgram's obedience studies demonstrated:":
            "Milgram, S. (1963). Behavioral study of obedience. Journal of Abnormal and Social Psychology, 67(4), 371–378. https://doi.org/10.1037/h0040525",
        "Asch's conformity experiments showed:":
            "Asch, S. E. (1956). Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1–70. https://doi.org/10.1037/h0093718",
        "The fundamental attribution error refers to:":
            "Ross, L. (1977). The intuitive psychologist and his shortcomings: Distortions in the attribution process. In L. Berkowitz (Ed.), Advances in experimental social psychology (Vol. 10, pp. 173–220). Academic Press.",
        "Cognitive behavioral therapy (CBT) is based on the premise that:":
            "Beck, A. T. (1976). Cognitive therapy and the emotional disorders. International Universities Press. See also: Beck, J. S. (2020). Cognitive behavior therapy: Basics and beyond (3rd ed.). Guilford Press.",
        "Systematic desensitization (Wolpe) involves:":
            "Wolpe, J. (1958). Psychotherapy by reciprocal inhibition. Stanford University Press.",
        "Motivational interviewing (MI) is characterized by:":
            "Miller, W. R., & Rollnick, S. (2013). Motivational interviewing: Helping people change (3rd ed.). Guilford Press.",
        "Dialectical behavior therapy (DBT) was originally developed for:":
            "Linehan, M. M. (1993). Cognitive-behavioral treatment of borderline personality disorder. Guilford Press.",
        "The therapeutic alliance is considered:":
            "Horvath, A. O., & Symonds, B. D. (1991). Relation between working alliance and outcome in psychotherapy: A meta-analysis. Journal of Counseling Psychology, 38(2), 139–149. https://doi.org/10.1037/0022-0167.38.2.139",
        "Paradoxical intention (Frankl) involves:":
            "Frankl, V. E. (1967). Psychotherapy and existentialism: Selected papers on logotherapy. Simon & Schuster.",
        "The dodo bird verdict in psychotherapy research suggests:":
            "Luborsky, L., Singer, B., & Luborsky, L. (1975). Comparative studies of psychotherapies: Is it true that 'everyone has won and all must have prizes'? Archives of General Psychiatry, 32(8), 995–1008. https://doi.org/10.1001/archpsyc.1975.01760260059004",
        "Statistical significance (p < .05) means:":
            "Fisher, R. A. (1925). Statistical methods for research workers. Oliver and Boyd. See also: Wasserstein, R. L., & Lazar, N. A. (2016). The ASA statement on p-values. The American Statistician, 70(2), 129–133. https://doi.org/10.1080/00031305.2016.1154108",
        "Random assignment in experiments:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "The Rorschach Inkblot Test is classified as:":
            "Exner, J. E. (2003). The Rorschach: A comprehensive system (4th ed.). Wiley. See also: Meyer, G. J., Viglione, D. J., Mihura, J. L., Erard, R. E., & Erdberg, P. (2011). Rorschach Performance Assessment System (R-PAS). https://r-pas.org",
        "The TAT (Thematic Apperception Test) assesses:":
            "Murray, H. A. (1943). Thematic Apperception Test manual. Harvard University Press.",
        "Standard error of measurement (SEM) indicates:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",
        "Content validity is established by:":
            "Haynes, S. N., Richard, D. C. S., & Kubany, E. S. (1995). Content validity in psychological assessment: A functional approach to concepts and methods. Psychological Assessment, 7(3), 238–247. https://doi.org/10.1037/1040-3590.7.3.238",

        // ===== Batch 9-12 questions =====
        "The learned helplessness model (Seligman) proposes that:":
            "Seligman, M. E. P. (1975). Helplessness: On depression, development, and death. W. H. Freeman. See also: Maier, S. F., & Seligman, M. E. P. (2016). Learned helplessness at fifty. Annual Review of Psychology, 67, 209–234. https://doi.org/10.1146/annurev-psych-010416-044054",
        "Beck's cognitive triad in depression includes negative views of:":
            "Beck, A. T. (1967). Depression: Clinical, experimental, and theoretical aspects. Harper & Row.",
        "Ellis's REBT identifies irrational beliefs such as:":
            "Ellis, A. (1962). Reason and emotion in psychotherapy. Lyle Stuart.",
        "The WAIS-IV index scores include:":
            "Wechsler, D. (2008). Wechsler Adult Intelligence Scale—Fourth Edition (WAIS-IV). Pearson.",
        "Regression to the mean occurs when:":
            "Galton, F. (1886). Regression towards mediocrity in hereditary stature. Journal of the Anthropological Institute, 15, 246–263.",
        "The Hawthorne effect describes:":
            "Landsberger, H. A. (1958). Hawthorne revisited. Cornell University Press. See also: Adair, J. G. (1984). The Hawthorne effect: A reconsideration of the methodological artifact. Journal of Applied Psychology, 69(2), 334–345.",
        "Social desirability bias in self-report measures:":
            "Crowne, D. P., & Marlowe, D. (1960). A new scale of social desirability independent of psychopathology. Journal of Consulting Psychology, 24(4), 349–354. https://doi.org/10.1037/h0047358",
        "Bandura's self-efficacy theory proposes:":
            "Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. Psychological Review, 84(2), 191–215. https://doi.org/10.1037/0033-295X.84.2.191",
        "Bandura's social learning theory emphasizes:":
            "Bandura, A. (1977). Social learning theory. Prentice Hall. See also: Bandura, A. (1986). Social foundations of thought and action: A social cognitive theory. Prentice Hall.",
        "The Health Belief Model proposes that health behavior is determined by:":
            "Rosenstock, I. M. (1974). Historical origins of the Health Belief Model. Health Education Monographs, 2(4), 328–335. https://doi.org/10.1177/109019817400200403",
        "Maslow's hierarchy of needs proposes:":
            "Maslow, A. H. (1943). A theory of human motivation. Psychological Review, 50(4), 370–396. https://doi.org/10.1037/h0054346",

        // ===== Batch 13-15 questions =====
        "The biopsychosocial model (Engel) proposes:":
            "Engel, G. L. (1977). The need for a new medical model: A challenge for biomedicine. Science, 196(4286), 129–136. https://doi.org/10.1126/science.847460",
        "Response prevention in ERP for OCD:":
            "Foa, E. B., & Kozak, M. J. (1986). Emotional processing of fear: Exposure to corrective information. Psychological Bulletin, 99(1), 20–35. https://doi.org/10.1037/0033-2909.99.1.20",
        "Interpersonal therapy (IPT) focuses on:":
            "Klerman, G. L., Weissman, M. M., Rounsaville, B. J., & Chevron, E. S. (1984). Interpersonal psychotherapy of depression. Basic Books.",
        "The stages of change model (Prochaska & DiClemente) includes:":
            "Prochaska, J. O., & DiClemente, C. C. (1983). Stages and processes of self-change of smoking: Toward an integrative model of change. Journal of Consulting and Clinical Psychology, 51(3), 390–395. https://doi.org/10.1037/0022-006X.51.3.390",
        "Acceptance and commitment therapy (ACT) emphasizes:":
            "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). Acceptance and commitment therapy: The process and practice of mindful change (2nd ed.). Guilford Press.",
        "Ecological validity in assessment refers to:":
            "Chaytor, N., & Schmitter-Edgecombe, M. (2003). The ecological validity of neuropsychological tests: A review of the literature on everyday cognitive skills. Neuropsychology Review, 13(4), 181–197. https://doi.org/10.1023/B:NERV.0000009483.91468.fb",
        "Cross-battery assessment approach:":
            "Flanagan, D. P., & Dixon, S. G. (2014). The Cattell-Horn-Carroll theory of cognitive abilities. In C. R. Reynolds, K. J. Vannest, & E. Fletcher-Janzen (Eds.), Encyclopedia of special education. Wiley.",
        "The PHQ-9 is commonly used to:":
            "Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9: Validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606–613. https://doi.org/10.1046/j.1525-1497.2001.016009606.x",
        "The GAD-7 measures:":
            "Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder: The GAD-7. Archives of Internal Medicine, 166(10), 1092–1097. https://doi.org/10.1001/archinte.166.10.1092",

        // ===== More Domain 4: Growth & Lifespan =====
        "Marcia's identity statuses include:":
            "Marcia, J. E. (1966). Development and validation of ego-identity status. Journal of Personality and Social Psychology, 3(5), 551–558. https://doi.org/10.1037/h0023281",
        "Attachment theory (Bowlby) proposes:":
            "Bowlby, J. (1969). Attachment and loss: Vol. 1. Attachment. Basic Books.",
        "Permissive parenting (Baumrind) is characterized by:":
            "Baumrind, D. (1971). Current patterns of parental authority. Developmental Psychology Monographs, 4(1, Pt. 2), 1–103. https://doi.org/10.1037/h0030372",
        "Authoritarian parenting (Baumrind) is characterized by:":
            "Baumrind, D. (1971). Current patterns of parental authority. Developmental Psychology Monographs, 4(1, Pt. 2), 1–103. https://doi.org/10.1037/h0030372",
        "Conservation (Piaget) refers to the understanding that:":
            "Piaget, J. (1965). The child's conception of number (C. Gattegno & F. M. Hodgson, Trans.). W. W. Norton. (Original work published 1941)",
        "Piaget's formal operational stage (~12+) is characterized by:":
            "Inhelder, B., & Piaget, J. (1958). The growth of logical thinking from childhood to adolescence (A. Parsons & S. Milgram, Trans.). Basic Books.",
        "Piaget's concrete operational stage (~7-11) is characterized by:":
            "Piaget, J. (1952). The origins of intelligence in children (M. Cook, Trans.). International Universities Press.",
        "Kübler-Ross's stages of grief include:":
            "Kübler-Ross, E. (1969). On death and dying. Macmillan.",
        "Teratogenic effects are most severe during:":
            "Moore, K. L., Persaud, T. V. N., & Torchia, M. G. (2019). The developing human: Clinically oriented embryology (11th ed.). Elsevier.",
        "Stranger anxiety typically emerges around:":
            "Sroufe, L. A. (1977). Wariness of strangers and the study of infant development. Child Development, 48(3), 731–746. https://doi.org/10.2307/1128322",
        "Separation anxiety typically peaks between:":
            "Bowlby, J. (1973). Attachment and loss: Vol. 2. Separation: Anxiety and anger. Basic Books.",

        // ===== More Domain 6: Treatment =====
        "The common factors model in psychotherapy suggests:":
            "Wampold, B. E. (2015). How important are the common factors in psychotherapy? An update. World Psychiatry, 14(3), 270–277. https://doi.org/10.1002/wps.20238",
        "Exposure and response prevention (ERP) is the gold standard for:":
            "Foa, E. B., Yadin, E., & Lichner, T. K. (2012). Exposure and response (ritual) prevention for obsessive-compulsive disorder: Therapist guide (2nd ed.). Oxford University Press.",
        "Unconditional positive regard (Rogers) means:":
            "Rogers, C. R. (1961). On becoming a person: A therapist's view of psychotherapy. Houghton Mifflin.",
        "Paradoxical interventions in strategic therapy:":
            "Haley, J. (1976). Problem-solving therapy. Jossey-Bass.",
        "Mindfulness-based stress reduction (MBSR) was developed by:":
            "Kabat-Zinn, J. (1990). Full catastrophe living: Using the wisdom of your body and mind to face stress, pain, and illness. Delacorte.",
        "Contingency management uses:":
            "Higgins, S. T., Silverman, K., & Heil, S. H. (Eds.). (2008). Contingency management in substance abuse treatment. Guilford Press.",
        "Cognitive processing therapy (CPT) for PTSD:":
            "Resick, P. A., Monson, C. M., & Chard, K. M. (2017). Cognitive processing therapy for PTSD: A comprehensive manual. Guilford Press.",

        // ===== More Domain 7: Research =====
        "Single-subject (N=1) research designs:":
            "Barlow, D. H., Nock, M. K., & Hersen, M. (2009). Single case experimental designs: Strategies for studying behavior change (3rd ed.). Allyn & Bacon.",
        "Quasi-experimental designs differ from true experiments in that:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "Multiple regression analysis:":
            "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
        "Factor analysis is used to:":
            "Fabrigar, L. R., Wegener, D. T., MacCallum, R. C., & Strahan, E. J. (1999). Evaluating the use of exploratory factor analysis in psychological research. Psychological Methods, 4(3), 272–299. https://doi.org/10.1037/1082-989X.4.3.272",
        "Chi-square test is used to:":
            "Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. Philosophical Magazine, Series 5, 50(302), 157–175.",
        "Nonparametric tests are used when:":
            "Siegel, S., & Castellan, N. J. (1988). Nonparametric statistics for the behavioral sciences (2nd ed.). McGraw-Hill.",
        "Positive predictive value (PPV) in assessment:":
            "Meehl, P. E., & Rosen, A. (1955). Antecedent probability and the efficiency of psychometric signs, patterns, or cutting scores. Psychological Bulletin, 52(3), 194–216. https://doi.org/10.1037/h0048070",

        // ===== More Domain 8: Ethics =====
        "Multiple relationships (Standard 3.05):":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.05. https://www.apa.org/ethics/code See also: Gottlieb, M. C. (1993). Avoiding exploitive dual relationships: A decision-making model. Psychotherapy, 30(1), 41–48.",
        "Competence (Standard 2.01) requires psychologists to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.01. https://www.apa.org/ethics/code",
        "The principle of Justice (Principle D) requires:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle D. https://www.apa.org/ethics/code See also: Beauchamp, T. L., & Childress, J. F. (2019). Principles of biomedical ethics (8th ed.). Oxford University Press.",
        "The principle of Respect for People's Rights and Dignity (Principle E):":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle E. https://www.apa.org/ethics/code",
        "Confidentiality with minors requires psychologists to:":
            "Koocher, G. P., & Keith-Spiegel, P. (2016). Ethics in psychology and the mental health professions: Standards and cases (4th ed.). Oxford University Press.",
        "Research with deception (Standard 8.07):":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 8.07. https://www.apa.org/ethics/code",
        "Sexual intimacy with current clients (Standard 10.05):":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.05. https://www.apa.org/ethics/code",
        "The two-year rule (Standard 10.08) regarding former clients:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.08. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 3).`);
})();
