/* PasstheEPPP — APA Reference Overlay (Part 10)
   Targets uncited questions from batches 17, 21, and 24.
   Loaded AFTER references_overlay9.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Batch 17: Domain 1 (Bio) =====
        "The hypothalamic-pituitary-gonadal (HPG) axis regulates:":
            "Sisk, C. L., & Foster, D. L. (2004). The neural basis of puberty and adolescence. Nature Neuroscience, 7(10), 1040–1047. https://doi.org/10.1038/nn1326",
        "Executive functions are primarily associated with the:":
            "Miyake, A., Friedman, N. P., Emerson, M. J., Witzki, A. H., Howerter, A., & Wager, T. D. (2000). The unity and diversity of executive functions. Cognitive Psychology, 41(1), 49–100. https://doi.org/10.1006/cogp.1999.0734",
        "Norepinephrine is involved in all EXCEPT:":
            "Sara, S. J. (2009). The locus coeruleus and noradrenergic modulation of cognition. Nature Reviews Neuroscience, 10(3), 211–223. https://doi.org/10.1038/nrn2573",
        "The Wisconsin Card Sorting Test (WCST) primarily assesses:":
            "Heaton, R. K., Chelune, G. J., Talley, J. L., Kay, G. G., & Curtiss, G. (1993). Wisconsin Card Sorting Test manual: Revised and expanded. Psychological Assessment Resources.",
        "Glia cells include all EXCEPT:":
            "Allen, N. J., & Barres, B. A. (2009). Glia — more than just brain glue. Nature, 457(7230), 675–677. https://doi.org/10.1038/457675a",
        "The gate control theory of pain (Melzack & Wall) proposes that:":
            "Melzack, R., & Wall, P. D. (1965). Pain mechanisms: A new theory. Science, 150(3699), 971–979. https://doi.org/10.1126/science.150.3699.971",
        "Endorphins are:":
            "Pert, C. B., & Snyder, S. H. (1973). Opiate receptor: Demonstration in nervous tissue. Science, 179(4077), 1011–1014. https://doi.org/10.1126/science.179.4077.1011",
        "Hemispheric lateralization research shows that the LEFT hemisphere (in most right-handed people) is specialized for:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. Nature Reviews Neuroscience, 6(8), 653–659. https://doi.org/10.1038/nrn1723",
        "Agonist medications for opioid use disorder include:":
            "Mattick, R. P., Breen, C., Kimber, J., & Davoli, M. (2009). Methadone maintenance therapy versus no opioid replacement therapy for opioid dependence. Cochrane Database of Systematic Reviews, (3), CD002209. https://doi.org/10.1002/14651858.CD002209.pub2",
        "The occipital lobe is primarily responsible for:":
            "Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (2012). Neuroscience (5th ed.). Sinauer Associates.",

        // ===== Batch 17: Domain 3 (Social) =====
        "The halo effect refers to:":
            "Thorndike, E. L. (1920). A constant error in psychological ratings. Journal of Applied Psychology, 4(1), 25–29. https://doi.org/10.1037/h0071663",
        "Social loafing is MOST likely when:":
            "Latané, B., Williams, K., & Harkins, S. (1979). Many hands make light the work: The causes and consequences of social loafing. Journal of Personality and Social Psychology, 37(6), 822–832. https://doi.org/10.1037/0022-3514.37.6.822",
        "Realistic conflict theory and social identity theory DIFFER in that:":
            "Tajfel, H., & Turner, J. C. (1979). An integrative theory of intergroup conflict. In W. G. Austin & S. Worchel (Eds.), The social psychology of intergroup relations (pp. 33–47). Brooks/Cole.",
        "The false consensus effect is:":
            "Ross, L., Greene, D., & House, P. (1977). The 'false consensus effect': An egocentric bias in social perception and attribution processes. Journal of Experimental Social Psychology, 13(3), 279–301. https://doi.org/10.1016/0022-1031(77)90049-X",
        "Terror management theory (TMT) proposes that:":
            "Greenberg, J., Pyszczynski, T., & Solomon, S. (1986). The causes and consequences of a need for self-esteem: A terror management theory. In R. F. Baumeister (Ed.), Public self and private self (pp. 189–212). Springer.",
        "Ethnocentrism refers to:":
            "Sumner, W. G. (1906). Folkways: A study of the sociological importance of usages, manners, customs, mores, and morals. Ginn.",
        "The identifiable victim effect shows that:":
            "Small, D. A., Loewenstein, G., & Slovic, P. (2007). Sympathy and callousness: The impact of deliberative thought on donations to identifiable and statistical victims. Organizational Behavior and Human Decision Processes, 102(2), 143–153. https://doi.org/10.1016/j.obhdp.2006.01.005",
        "Intersectionality (Crenshaw) highlights that:":
            "Crenshaw, K. (1989). Demarginalizing the intersection of race and sex: A Black feminist critique of antidiscrimination doctrine, feminist theory and antiracist politics. University of Chicago Legal Forum, 1989(1), 139–167.",
        "Cognitive consistency theories predict that people are motivated to:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",
        "The contact hypothesis works BEST when contact involves:":
            "Allport, G. W. (1954). The nature of prejudice. Addison-Wesley.",

        // ===== Batch 17: Domain 5 (Assessment) =====
        "The WAIS-V measures:":
            "Wechsler, D. (2024). Wechsler Adult Intelligence Scale–Fifth Edition (WAIS-V): Technical and interpretive manual. Pearson.",
        "Split-half reliability involves:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",
        "Predictive validity is demonstrated when:":
            "Cronbach, L. J. (1990). Essentials of psychological testing (5th ed.). Harper & Row.",
        "The Beck Depression Inventory (BDI-II) is:":
            "Beck, A. T., Steer, R. A., & Brown, G. K. (1996). Manual for the Beck Depression Inventory–II. Psychological Corporation.",
        "Divergent validity (discriminant validity) is established when a test:":
            "Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. Psychological Bulletin, 56(2), 81–105. https://doi.org/10.1037/h0046016",
        "The Halstead-Reitan Neuropsychological Battery:":
            "Reitan, R. M., & Wolfson, D. (1993). The Halstead-Reitan Neuropsychological Test Battery: Theory and clinical interpretation (2nd ed.). Neuropsychology Press.",
        "Response bias in testing includes:":
            "Paulhus, D. L. (1991). Measurement and control of response bias. In J. P. Robinson et al. (Eds.), Measures of personality and social psychological attitudes (pp. 17–59). Academic Press.",
        "The Stanford-Binet Intelligence Scales use the deviation IQ with a mean of:":
            "Roid, G. H. (2003). Stanford-Binet Intelligence Scales, Fifth Edition: Technical manual. Riverside Publishing.",
        "A raw score by itself is:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",
        "The BASC-3 (Behavior Assessment System for Children) uses:":
            "Reynolds, C. R., & Kamphaus, R. W. (2015). BASC-3: Behavior Assessment System for Children (3rd ed.). Pearson.",

        // ===== Batch 17: Domain 6 (Treatment) =====
        "Cognitive behavioral therapy (CBT) is based on the idea that:":
            "Beck, A. T. (1976). Cognitive therapy and the emotional disorders. International Universities Press.",
        "Aversion therapy pairs:":
            "Rachman, S., & Teasdale, J. (1969). Aversion therapy and behaviour disorders: An analysis. University of Miami Press.",
        "Bowen's family therapy focuses on:":
            "Bowen, M. (1978). Family therapy in clinical practice. Jason Aronson.",
        "Eye movement desensitization and reprocessing (EMDR) Phase 3 involves:":
            "Shapiro, F. (2018). Eye movement desensitization and reprocessing (EMDR) therapy (3rd ed.). Guilford Press.",
        "Relapse prevention (Marlatt) identifies:":
            "Marlatt, G. A., & Donovan, D. M. (Eds.). (2005). Relapse prevention: Maintenance strategies in the treatment of addictive behaviors (2nd ed.). Guilford Press.",
        "The therapeutic factor of 'universality' in group therapy refers to:":
            "Yalom, I. D., & Leszcz, M. (2020). The theory and practice of group psychotherapy (6th ed.). Basic Books.",
        "Stimulus control in behavioral treatment for insomnia involves:":
            "Bootzin, R. R., & Epstein, D. R. (2011). Understanding and treating insomnia. Annual Review of Clinical Psychology, 7, 435–458. https://doi.org/10.1146/annurev-clinpsy-042709-141220",
        "Assertiveness training helps clients:":
            "Alberti, R. E., & Emmons, M. L. (2017). Your perfect right: Assertiveness and equality in your life and relationships (10th ed.). New Harbinger.",
        "Biofeedback involves:":
            "Schwartz, M. S., & Andrasik, F. (Eds.). (2017). Biofeedback: A practitioner's guide (4th ed.). Guilford Press.",
        "Psychodynamic therapy differs from classical psychoanalysis in that psychodynamic therapy:":
            "Shedler, J. (2010). The efficacy of psychodynamic psychotherapy. American Psychologist, 65(2), 98–109. https://doi.org/10.1037/a0018378",

        // ===== Batch 17: Domain 8 (Ethics) =====
        "Psychologists must obtain informed consent for therapy from:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.01. https://www.apa.org/ethics/code",
        "When a psychologist discovers they lack competence in a needed area, they should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.01. https://www.apa.org/ethics/code",
        "Confidentiality can be broken without client authorization when:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976). See also APA Ethics Code Standard 4.05.",
        "Abandonment of a client occurs when a psychologist:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.10. https://www.apa.org/ethics/code",
        "The APA Ethics Code General Principle E (Respect for People's Rights and Dignity) addresses:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Principle E. https://www.apa.org/ethics/code",
        "If an ethics complaint is filed against a psychologist, the investigative body is typically:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code",
        "Cultural competence in psychology requires:":
            "Sue, D. W., Arredondo, P., & McDavis, R. J. (1992). Multicultural counseling competencies and standards. Journal of Counseling & Development, 70(4), 477–486.",
        "When a psychologist is involved in a custody evaluation and one parent asks them to also be the child's therapist, the psychologist should:":
            "American Psychological Association. (2010). Guidelines for child custody evaluations in family law proceedings. American Psychologist, 65(9), 863–867. https://doi.org/10.1037/a0021250",
        "Boundary crossings differ from boundary violations in that:":
            "Gutheil, T. G., & Gabbard, G. O. (1993). The concept of boundaries in clinical practice. American Journal of Psychiatry, 150(2), 188–196. https://doi.org/10.1176/ajp.150.2.188",
        "Standard 9.01 of the APA Ethics Code requires that psychologists base their assessments on:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 9.01. https://www.apa.org/ethics/code",

        // ===== Batch 21: Domain 1 (Bio) =====
        "Long-term potentiation (LTP) is:":
            "Bliss, T. V. P., & Lømo, T. (1973). Long-lasting potentiation of synaptic transmission in the dentate area of the anaesthetized rabbit following stimulation of the perforant path. Journal of Physiology, 232(2), 331–356. https://doi.org/10.1113/jphysiol.1973.sp010273",
        "The vestibular system is responsible for:":
            "Purves, D., et al. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "Epigenetics refers to:":
            "Meaney, M. J. (2001). Maternal care, gene expression, and the transmission of individual differences in stress reactivity across generations. Annual Review of Neuroscience, 24, 1161–1192. https://doi.org/10.1146/annurev.neuro.24.1.1161",
        "The parasympathetic nervous system promotes:":
            "Bear, M. F., Connors, B. W., & Paradiso, M. A. (2016). Neuroscience: Exploring the brain (4th ed.). Wolters Kluwer.",
        "The HPA axis involves:":
            "Sapolsky, R. M. (2004). Why zebras don't get ulcers (3rd ed.). Holt Paperbacks.",

        // ===== Batch 21: Domain 2 (Cog-Aff) =====
        "The misinformation effect (Loftus) demonstrates that:":
            "Loftus, E. F., & Palmer, J. C. (1974). Reconstruction of automobile destruction. Journal of Verbal Learning and Verbal Behavior, 13(5), 585–589. https://doi.org/10.1016/S0022-5371(74)80011-3",
        "Emotional intelligence (Mayer & Salovey) includes:":
            "Mayer, J. D., & Salovey, P. (1997). What is emotional intelligence? In P. Salovey & D. J. Sluyter (Eds.), Emotional development and emotional intelligence (pp. 3–34). Basic Books.",
        "The self-reference effect shows that:":
            "Rogers, T. B., Kuiper, N. A., & Kirker, W. S. (1977). Self-reference and the encoding of personal information. Journal of Personality and Social Psychology, 35(9), 677–688. https://doi.org/10.1037/0022-3514.35.9.677",
        "Opponent-process theory of emotion (Solomon) proposes that:":
            "Solomon, R. L., & Corbit, J. D. (1974). An opponent-process theory of motivation. Psychological Review, 81(2), 119–145. https://doi.org/10.1037/h0036128",
        "Flashbulb memories are:":
            "Brown, R., & Kulik, J. (1977). Flashbulb memories. Cognition, 5(1), 73–99. https://doi.org/10.1016/0010-0277(77)90018-X",

        // ===== Batch 21: Domain 3 (Social) =====
        "Deindividuation occurs when:":
            "Zimbardo, P. G. (1969). The human choice: Individuation, reason, and order versus deindividuation, impulse, and chaos. In W. J. Arnold & D. Levine (Eds.), Nebraska Symposium on Motivation, 1969 (pp. 237–307). University of Nebraska Press.",
        "The bystander effect is WEAKENED by:":
            "Latané, B., & Darley, J. M. (1970). The unresponsive bystander: Why doesn't he help? Appleton-Century-Crofts.",
        "Perspective-taking (empathic accuracy) involves:":
            "Batson, C. D. (2011). Altruism in humans. Oxford University Press.",
        "Social exchange theory proposes that relationships:":
            "Thibaut, J. W., & Kelley, H. H. (1959). The social psychology of groups. Wiley.",
        "The scapegoat theory of prejudice links:":
            "Dollard, J., Miller, N. E., Doob, L. W., Mowrer, O. H., & Sears, R. R. (1939). Frustration and aggression. Yale University Press.",

        // ===== Batch 21: Domain 4 (Dev) =====
        "Strange Situation procedure (Ainsworth) is used to assess:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",
        "Scaffolding (Bruner, based on Vygotsky) involves:":
            "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. Journal of Child Psychology and Psychiatry, 17(2), 89–100. https://doi.org/10.1111/j.1469-7610.1976.tb00381.x",
        "Disorganized attachment (Main & Solomon, Type D) is characterized by:":
            "Main, M., & Solomon, J. (1990). Procedures for identifying infants as disorganized/disoriented during the Ainsworth Strange Situation. In M. T. Greenberg et al. (Eds.), Attachment in the preschool years (pp. 121–160). University of Chicago Press.",
        "Object permanence develops during Piaget's:":
            "Piaget, J. (1954). The construction of reality in the child (M. Cook, Trans.). Basic Books.",
        "Ainsworth's avoidant attachment (Type A) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment. Erlbaum.",

        // ===== Batch 21: Domain 5 (Assessment) =====
        "The PAI (Personality Assessment Inventory) is preferred over the MMPI-2 by some clinicians because:":
            "Morey, L. C. (2007). The Personality Assessment Inventory professional manual (2nd ed.). Psychological Assessment Resources.",
        "Malingering on psychological tests involves:":
            "Rogers, R. (Ed.). (2008). Clinical assessment of malingering and deception (3rd ed.). Guilford Press.",
        "Sensitivity of a diagnostic test reflects:":
            "Straus, S. E., Glasziou, P., Richardson, W. S., & Haynes, R. B. (2019). Evidence-based medicine: How to practice and teach EBM (5th ed.). Elsevier.",
        "Specificity of a diagnostic test reflects:":
            "Straus, S. E., Glasziou, P., Richardson, W. S., & Haynes, R. B. (2019). Evidence-based medicine: How to practice and teach EBM (5th ed.). Elsevier.",
        "The Conners Rating Scales are specifically designed to assess:":
            "Conners, C. K. (2008). Conners 3rd Edition manual. Multi-Health Systems.",

        // ===== Batch 21: Domain 6 (Treatment) =====
        "Prolonged exposure therapy (PE) for PTSD involves:":
            "Foa, E. B., Hembree, E. A., & Rothbaum, B. O. (2007). Prolonged exposure therapy for PTSD. Oxford University Press.",
        "The working alliance (Bordin) consists of:":
            "Bordin, E. S. (1979). The generalizability of the psychoanalytic concept of the working alliance. Psychotherapy: Theory, Research & Practice, 16(3), 252–260. https://doi.org/10.1037/h0085885",
        "Harm reduction approaches:":
            "Marlatt, G. A. (1996). Harm reduction: Come as you are. Addictive Behaviors, 21(6), 779–788. https://doi.org/10.1016/0306-4603(96)00042-1",
        "Emotion-focused therapy (EFT, Greenberg) views emotions as:":
            "Greenberg, L. S. (2015). Emotion-focused therapy: Coaching clients to work through their feelings (2nd ed.). American Psychological Association.",
        "Behavioral activation (BA) for depression focuses on:":
            "Martell, C. R., Dimidjian, S., & Herman-Dunn, R. (2010). Behavioral activation for depression: A clinician's guide. Guilford Press.",

        // ===== Batch 21: Domain 7 (Research) =====
        "Effect size describes:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "A factorial design allows researchers to:":
            "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
        "Institutional Review Boards (IRBs) are responsible for:":
            "National Commission for the Protection of Human Subjects. (1979). The Belmont Report. U.S. Government Printing Office. https://www.hhs.gov/ohrp/regulations-and-policy/belmont-report",
        "Regression to the mean occurs when:":
            "Campbell, D. T., & Kenny, D. A. (1999). A primer on regression artifacts. Guilford Press.",
        "Qualitative research differs from quantitative research primarily in:":
            "Creswell, J. W., & Poth, C. N. (2018). Qualitative inquiry and research design: Choosing among five approaches (4th ed.). SAGE.",

        // ===== Batch 21: Domain 8 (Ethics) =====
        "The Jaffee v. Redmond (1996) case established:":
            "Jaffee v. Redmond, 518 U.S. 1 (1996). https://supreme.justia.com/cases/federal/us/518/1/",
        "When working with minors, psychologists should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standards 3.10 & 4.02. https://www.apa.org/ethics/code",
        "Standard 3.04 (Avoiding Harm) states that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 3.04. https://www.apa.org/ethics/code",
        "Fee-splitting arrangements are:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 6.07. https://www.apa.org/ethics/code",
        "After a client dies, confidentiality:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 4.01. https://www.apa.org/ethics/code",
        "Forensic psychologists who provide treatment to a defendant should generally NOT:":
            "American Psychological Association. (2013). Specialty guidelines for forensic psychology. American Psychologist, 68(1), 7–19. https://doi.org/10.1037/a0029889",
        "The duty to warn third parties was FIRST established in:":
            "Tarasoff v. Regents of the University of California, 13 Cal. 3d 177 (1974).",
        "A psychologist who knowingly makes a false statement in a professional context violates:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 5.01. https://www.apa.org/ethics/code",
        "Psychologists conducting research must:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 8.02. https://www.apa.org/ethics/code",
        "The APA Ethics Code can be enforced by:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct. https://www.apa.org/ethics/code",

        // ===== Batch 24: Domain 1 (Bio) =====
        "The reticular activating system (RAS) regulates:":
            "Moruzzi, G., & Magoun, H. W. (1949). Brain stem reticular formation and activation of the EEG. Electroencephalography and Clinical Neurophysiology, 1(1–4), 455–473. https://doi.org/10.1016/0013-4694(49)90219-9",
        "The 10-20 system in EEG refers to:":
            "Jasper, H. H. (1958). The ten-twenty electrode system of the International Federation. Electroencephalography and Clinical Neurophysiology, 10, 371–375.",
        "Korsakoff's syndrome is characterized by:":
            "Kopelman, M. D., Thomson, A. D., Guerrini, I., & Marshall, E. J. (2009). The Korsakoff syndrome: Clinical aspects, psychology and treatment. Alcohol and Alcoholism, 44(2), 148–154. https://doi.org/10.1093/alcalc/agn118",
        "Ipsilateral control is an exception to contralateral organization, seen in:":
            "Purves, D., et al. (2012). Neuroscience (5th ed.). Sinauer Associates.",
        "Mirror neurons fire both when:":
            "Rizzolatti, G., & Craighero, L. (2004). The mirror-neuron system. Annual Review of Neuroscience, 27, 169–192. https://doi.org/10.1146/annurev.neuro.27.070203.144230",
        "Hemispheric specialization research shows the LEFT hemisphere typically excels at:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. Nature Reviews Neuroscience, 6(8), 653–659.",
        "Anterograde amnesia involves:":
            "Scoville, W. B., & Milner, B. (1957). Loss of recent memory after bilateral hippocampal lesions. Journal of Neurology, Neurosurgery & Psychiatry, 20(1), 11–21. https://doi.org/10.1136/jnnp.20.1.11",
        "The basal ganglia are primarily involved in:":
            "Graybiel, A. M. (2000). The basal ganglia. Current Biology, 10(14), R509–R511. https://doi.org/10.1016/S0960-9822(00)00593-5",
        "The suprachiasmatic nucleus (SCN) of the hypothalamus:":
            "Ralph, M. R., Foster, R. G., Davis, F. C., & Menaker, M. (1990). Transplanted suprachiasmatic nucleus determines circadian period. Science, 247(4945), 975–978. https://doi.org/10.1126/science.2305266",

        // ===== Batch 24: Domain 3 (Social) =====
        "Realistic conflict theory (Sherif) proposes that prejudice arises from:":
            "Sherif, M. (1966). In common predicament: Social psychology of intergroup conflict and cooperation. Houghton Mifflin.",
        "Self-serving bias refers to:":
            "Miller, D. T., & Ross, M. (1975). Self-serving biases in the attribution of causality: Fact or fiction? Psychological Bulletin, 82(2), 213–225. https://doi.org/10.1037/h0076486",
        "The contact hypothesis (Allport) states that intergroup prejudice is reduced when:":
            "Allport, G. W. (1954). The nature of prejudice. Addison-Wesley.",
        "System justification theory (Jost & Banaji) proposes that:":
            "Jost, J. T., & Banaji, M. R. (1994). The role of stereotyping in system-justification and the production of false consciousness. British Journal of Social Psychology, 33(1), 1–27. https://doi.org/10.1111/j.2044-8309.1994.tb01008.x",
        "The actor-observer bias describes:":
            "Jones, E. E., & Nisbett, R. E. (1972). The actor and the observer: Divergent perceptions of the causes of behavior. In E. E. Jones et al. (Eds.), Attribution: Perceiving the causes of behavior (pp. 79–94). General Learning Press.",

        // ===== Batch 24: Domain 5 (Assessment) =====
        "Concurrent validity is established by:":
            "Cronbach, L. J. (1990). Essentials of psychological testing (5th ed.). Harper & Row.",
        "Norm-referenced tests compare an individual's performance to:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice-Hall.",
        "Criterion-referenced tests measure:":
            "Popham, W. J. (1978). Criterion-referenced measurement. Prentice-Hall.",
        "The Vineland Adaptive Behavior Scales measure:":
            "Sparrow, S. S., Cicchetti, D. V., & Saulnier, C. A. (2016). Vineland Adaptive Behavior Scales, Third Edition (Vineland-3). Pearson.",

        // ===== Batch 24: Domain 6 (Treatment) =====
        "Token economy is a behavior modification system that:":
            "Ayllon, T., & Azrin, N. H. (1968). The token economy: A motivational system for therapy and rehabilitation. Appleton-Century-Crofts.",
        "Brief psychodynamic therapy differs from traditional psychoanalysis by:":
            "Sifneos, P. E. (1972). Short-term psychotherapy and emotional crisis. Harvard University Press.",
        "Psychoeducation in therapy involves:":
            "Bäuml, J., Froböse, T., Kraemer, S., Rentrop, M., & Pitschel-Walz, G. (2006). Psychoeducation: A basic psychotherapeutic intervention for patients with schizophrenia and their families. Schizophrenia Bulletin, 32(S1), S1–S9. https://doi.org/10.1093/schbul/sbl017",
        "EMDR (Eye Movement Desensitization and Reprocessing) for PTSD involves:":
            "Shapiro, F. (2018). Eye movement desensitization and reprocessing (EMDR) therapy (3rd ed.). Guilford Press.",

        // ===== Batch 24: Domain 7 (Research) =====
        "A meta-analysis:":
            "Glass, G. V. (1976). Primary, secondary, and meta-analysis of research. Educational Researcher, 5(10), 3–8. https://doi.org/10.3102/0013189X005010003",
        "Construct validity encompasses:":
            "Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. Psychological Bulletin, 56(2), 81–105.",
        "A between-subjects design:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "A within-subjects (repeated measures) design:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
        "An operational definition:":
            "Kerlinger, F. N., & Lee, H. B. (2000). Foundations of behavioral research (4th ed.). Harcourt.",

        // ===== Batch 24: Domain 8 (Ethics) =====
        "Informed consent for therapy (Standard 10.01) must include:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 10.01. https://www.apa.org/ethics/code",
        "The ethical standard on test security (Standard 9.11) requires that psychologists:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 9.11. https://www.apa.org/ethics/code",
        "When laws and the APA Ethics Code conflict, psychologists should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 1.02. https://www.apa.org/ethics/code",
        "Standard 4.05 (Disclosures) permits psychologists to disclose confidential information:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 4.05. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 10).`);
})();
