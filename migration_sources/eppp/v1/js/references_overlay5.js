/* PasstheEPPP — APA Reference Overlay (Part 5)
   Targets questions from batches 14-20 not yet covered by overlays 1-4.
   Loaded AFTER references_overlay4.js. */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const refs = {
        // ===== Domain 1: Biological (batch 14+) =====
        "Epigenetics in psychology refers to:":
            "Meaney, M. J. (2010). Epigenetics and the biological definition of gene × environment interactions. Child Development, 81(1), 41–79. https://doi.org/10.1111/j.1467-8624.2009.01381.x",
        "Glutamate is the brain's primary:":
            "Meldrum, B. S. (2000). Glutamate as a neurotransmitter in the brain: Review of physiology and pathology. Journal of Nutrition, 130(4), 1007S–1015S. https://doi.org/10.1093/jn/130.4.1007S",
        "Neuroplasticity is GREATEST during:":
            "Kolb, B., & Gibb, R. (2011). Brain plasticity and behaviour in the developing brain. Journal of the Canadian Academy of Child and Adolescent Psychiatry, 20(4), 265–276.",
        "Kindling in epilepsy refers to:":
            "Goddard, G. V., McIntyre, D. C., & Leech, C. K. (1969). A permanent change in brain function resulting from daily electrical stimulation. Experimental Neurology, 25(3), 295–330. https://doi.org/10.1016/0014-4886(69)90128-9",
        "The insula cortex is involved in:":
            "Craig, A. D. (2009). How do you feel — now? The anterior insula and human awareness. Nature Reviews Neuroscience, 10(1), 59–70. https://doi.org/10.1038/nrn2555",
        "Broca's area is located in the:":
            "Broca, P. (1861). Remarques sur le siège de la faculté du langage articulé. Bulletins de la Société Anatomique de Paris, 6, 330–357.",
        "Tardive dyskinesia is MOST associated with long-term use of:":
            "Correll, C. U., Kane, J. M., & Citrome, L. L. (2017). Epidemiology, prevention, and assessment of tardive dyskinesia and advances in treatment. Journal of Clinical Psychiatry, 78(8), 1136–1147. https://doi.org/10.4088/JCP.tv17016ah4c",
        "The nucleus accumbens is primarily associated with:":
            "Salgado, S., & Kaplitt, M. G. (2015). The nucleus accumbens: A comprehensive review. Stereotactic and Functional Neurosurgery, 93(2), 75–93. https://doi.org/10.1159/000368279",
        "Selective serotonin reuptake inhibitors (SSRIs) work by:":
            "Stahl, S. M. (2021). Stahl's essential psychopharmacology: Neuroscientific basis and practical applications (5th ed.). Cambridge University Press.",
        "The corpus callosum connects:":
            "Paul, L. K., Brown, W. S., Adolphs, R., Tyszka, J. M., Richards, L. J., Mukherjee, P., & Sherr, E. H. (2007). Agenesis of the corpus callosum: Genetic, developmental and functional aspects of connectivity. Nature Reviews Neuroscience, 8(4), 287–299. https://doi.org/10.1038/nrn2107",
        "Aphasia is BEST defined as:":
            "Goodglass, H., Kaplan, E., & Barresi, B. (2001). The assessment of aphasia and related disorders (3rd ed.). Lippincott Williams & Wilkins.",
        "Serotonin syndrome can result from:":
            "Boyer, E. W., & Shannon, M. (2005). The serotonin syndrome. New England Journal of Medicine, 352(11), 1112–1120. https://doi.org/10.1056/NEJMra041867",
        "Neurogenesis in the adult brain occurs primarily in:":
            "Eriksson, P. S., Perfilieva, E., Björk-Eriksson, T., Alborn, A. M., Nordborg, C., Peterson, D. A., & Gage, F. H. (1998). Neurogenesis in the adult human hippocampus. Nature Medicine, 4(11), 1313–1317. https://doi.org/10.1038/3305",
        "The substantia nigra is associated with:":
            "Lanciego, J. L., Luquin, N., & Obeso, J. A. (2012). Functional neuroanatomy of the basal ganglia. Cold Spring Harbor Perspectives in Medicine, 2(12), a009621. https://doi.org/10.1101/cshperspect.a009621",

        // ===== Domain 2: Cognitive-Affective (batch 14+) =====
        "Cognitive load theory distinguishes between:":
            "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285. https://doi.org/10.1207/s15516709cog1202_4",
        "Amygdala hijack (Goleman) refers to:":
            "Goleman, D. (1995). Emotional intelligence. Bantam Books. See also: LeDoux, J. E. (1996). The emotional brain. Simon & Schuster.",
        "Prospective memory involves:":
            "Einstein, G. O., & McDaniel, M. A. (1990). Normal aging and prospective memory. Journal of Experimental Psychology: Learning, Memory, and Cognition, 16(4), 717–726. https://doi.org/10.1037/0278-7393.16.4.717",
        "Cognitive dissonance theory (Festinger) predicts that people who receive MINIMAL justification for counter-attitudinal behavior will:":
            "Festinger, L., & Carlsmith, J. M. (1959). Cognitive consequences of forced compliance. Journal of Abnormal and Social Psychology, 58(2), 203–210. https://doi.org/10.1037/h0041593",
        "The negativity bias refers to:":
            "Rozin, P., & Royzman, E. B. (2001). Negativity bias, negativity dominance, and contagion. Personality and Social Psychology Review, 5(4), 296–320. https://doi.org/10.1207/S15327957PSPR0504_2",
        "Working memory capacity is approximately:":
            "Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. Behavioral and Brain Sciences, 24(1), 87–114. https://doi.org/10.1017/S0140525X01003922",
        "The Zeigarnik effect demonstrates that:":
            "Zeigarnik, B. (1927). Über das Behalten von erledigten und unerledigten Handlungen [On the retention of completed and uncompleted activities]. Psychologische Forschung, 9, 1–85.",
        "Inattentional blindness occurs when:":
            "Simons, D. J., & Chabris, C. F. (1999). Gorillas in our midst: Sustained inattentional blindness for dynamic events. Perception, 28(9), 1059–1074. https://doi.org/10.1068/p281059",
        "The framing effect demonstrates that:":
            "Tversky, A., & Kahneman, D. (1981). The framing of decisions and the psychology of choice. Science, 211(4481), 453–458. https://doi.org/10.1126/science.7455683",
        "Chunking in memory refers to:":
            "Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. Psychological Review, 63(2), 81–97. https://doi.org/10.1037/h0043158",
        "The primacy and recency effects are components of:":
            "Atkinson, R. C., & Shiffrin, R. M. (1968). Human memory: A proposed system and its control processes. In K. W. Spence & J. T. Spence (Eds.), The psychology of learning and motivation (Vol. 2, pp. 89–195). Academic Press.",
        "Learned helplessness (Seligman) is most associated with:":
            "Abramson, L. Y., Seligman, M. E. P., & Teasdale, J. D. (1978). Learned helplessness in humans: Critique and reformulation. Journal of Abnormal Psychology, 87(1), 49–74. https://doi.org/10.1037/0021-843X.87.1.49",

        // ===== Domain 3: Social & Cultural (batch 14+) =====
        "Bystander apathy (bystander effect) is MOST influenced by:":
            "Darley, J. M., & Latané, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. Journal of Personality and Social Psychology, 8(4), 377–383. https://doi.org/10.1037/h0025589",
        "The fundamental attribution error is the tendency to:":
            "Ross, L. (1977). The intuitive psychologist and his shortcomings. In L. Berkowitz (Ed.), Advances in experimental social psychology (Vol. 10, pp. 173–220). Academic Press.",
        "Social facilitation theory predicts that the presence of others will:":
            "Zajonc, R. B. (1965). Social facilitation. Science, 149(3681), 269–274. https://doi.org/10.1126/science.149.3681.269",
        "Stereotype threat affects performance by:":
            "Steele, C. M. (1997). A threat in the air: How stereotypes shape intellectual identity and performance. American Psychologist, 52(6), 613–629. https://doi.org/10.1037/0003-066X.52.6.613",
        "Milgram's obedience studies found that approximately what percentage of participants administered the maximum shock?":
            "Milgram, S. (1963). Behavioral study of obedience. Journal of Abnormal and Social Psychology, 67(4), 371–378. https://doi.org/10.1037/h0040525",
        "In-group bias (in-group favoritism) occurs even in:":
            "Tajfel, H., Billig, M. G., Bundy, R. P., & Flament, C. (1971). Social categorization and intergroup behaviour. European Journal of Social Psychology, 1(2), 149–178. https://doi.org/10.1002/ejsp.2420010202",
        "Scapegoat theory proposes that prejudice increases when:":
            "Dollard, J., Miller, N. E., Doob, L. W., Mowrer, O. H., & Sears, R. R. (1939). Frustration and aggression. Yale University Press.",
        "Attribution theory (Weiner) classifies causes along dimensions of:":
            "Weiner, B. (1985). An attributional theory of achievement motivation and emotion. Psychological Review, 92(4), 548–573. https://doi.org/10.1037/0033-295X.92.4.548",
        "Social exchange theory proposes that relationships are maintained when:":
            "Homans, G. C. (1958). Social behavior as exchange. American Journal of Sociology, 63(6), 597–606. https://doi.org/10.1086/222355",
        "Cognitive dissonance is MOST likely when:":
            "Festinger, L. (1957). A theory of cognitive dissonance. Stanford University Press.",

        // ===== Domain 4: Growth & Lifespan (batch 14+) =====
        "Scaffolding in Vygotsky's theory refers to:":
            "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. Journal of Child Psychology and Psychiatry, 17(2), 89–100. https://doi.org/10.1111/j.1469-7610.1976.tb00381.x",
        "Gilligan's critique of Kohlberg argued that:":
            "Gilligan, C. (1982). In a different voice: Psychological theory and women's development. Harvard University Press.",
        "Resilience in child development is BEST predicted by:":
            "Masten, A. S. (2014). Ordinary magic: Resilience in development. Guilford Press.",
        "The Strange Situation (Ainsworth) assesses:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). Patterns of attachment: A psychological study of the strange situation. Erlbaum.",
        "Emerging adulthood (Arnett) spans approximately:":
            "Arnett, J. J. (2000). Emerging adulthood: A theory of development from the late teens through the twenties. American Psychologist, 55(5), 469–480. https://doi.org/10.1037/0003-066X.55.5.469",
        "Object permanence is fully achieved by approximately:":
            "Piaget, J. (1954). The construction of reality in the child (M. Cook, Trans.). Basic Books.",
        "The 'personal fable' (Elkind) refers to adolescents' belief that:":
            "Elkind, D. (1967). Egocentrism in adolescence. Child Development, 38(4), 1025–1034. https://doi.org/10.2307/1127100",
        "Parallel play is typical of children around age:":
            "Parten, M. B. (1932). Social participation among preschool children. Journal of Abnormal and Social Psychology, 27(3), 243–269. https://doi.org/10.1037/h0074524",
        "Internalizing disorders in children include:":
            "Achenbach, T. M. (1991). Manual for the Child Behavior Checklist/4-18 and 1991 Profile. University of Vermont, Department of Psychiatry.",
        "Externalizing disorders in children include:":
            "Achenbach, T. M. (1991). Manual for the Child Behavior Checklist/4-18 and 1991 Profile. University of Vermont, Department of Psychiatry.",

        // ===== Domain 5: Assessment (batch 14+) =====
        "A T-score of 70 on a clinical scale corresponds to:":
            "Butcher, J. N. (2011). A beginner's guide to the MMPI-2 (3rd ed.). American Psychological Association.",
        "The PAI (Personality Assessment Inventory) differs from the MMPI-2 in that it:":
            "Morey, L. C. (2007). The Personality Assessment Inventory professional manual (2nd ed.). Psychological Assessment Resources.",
        "Differential item functioning (DIF) analysis examines whether:":
            "Holland, P. W., & Wainer, H. (Eds.). (1993). Differential item functioning. Erlbaum.",
        "In classical test theory, an observed score equals:":
            "Lord, F. M., & Novick, M. R. (1968). Statistical theories of mental test scores. Addison-Wesley.",
        "Ceiling effects in testing occur when:":
            "Anastasi, A., & Urbina, S. (1997). Psychological testing (7th ed.). Prentice Hall.",

        // ===== Domain 6: Treatment (batch 14+) =====
        "The therapeutic alliance is BEST defined as:":
            "Bordin, E. S. (1979). The generalizability of the psychoanalytic concept of the working alliance. Psychotherapy: Theory, Research & Practice, 16(3), 252–260. https://doi.org/10.1037/h0085885",
        "Prolonged exposure therapy (Foa) for PTSD involves:":
            "Foa, E. B., Hembree, E. A., & Rothbaum, B. O. (2007). Prolonged exposure therapy for PTSD: Emotional processing of traumatic experiences—Therapist guide. Oxford University Press.",
        "Functional analysis in behavioral therapy identifies:":
            "Cooper, J. O., Heron, T. E., & Heward, W. L. (2020). Applied behavior analysis (3rd ed.). Pearson.",
        "Harm reduction approaches to substance use differ from abstinence-only by:":
            "Marlatt, G. A. (Ed.). (1998). Harm reduction: Pragmatic strategies for managing high-risk behaviors. Guilford Press.",
        "Lithium is the first-line pharmacological treatment for:":
            "Geddes, J. R., Burgess, S., Hawton, K., Jamison, K., & Goodwin, G. M. (2004). Long-term lithium therapy for bipolar disorder: Systematic review and meta-analysis of randomized controlled trials. American Journal of Psychiatry, 161(2), 217–222. https://doi.org/10.1176/appi.ajp.161.2.217",

        // ===== Domain 7: Research (batch 14+) =====
        "A mediator variable explains:":
            "Baron, R. M., & Kenny, D. A. (1986). The moderator–mediator variable distinction in social psychological research: Conceptual, strategic, and statistical considerations. Journal of Personality and Social Psychology, 51(6), 1173–1182. https://doi.org/10.1037/0022-3514.51.6.1173",
        "A moderator variable specifies:":
            "Baron, R. M., & Kenny, D. A. (1986). The moderator–mediator variable distinction in social psychological research. Journal of Personality and Social Psychology, 51(6), 1173–1182. https://doi.org/10.1037/0022-3514.51.6.1173",
        "Intention-to-treat analysis includes:":
            "Gupta, S. K. (2011). Intention-to-treat concept: A review. Perspectives in Clinical Research, 2(3), 109–112. https://doi.org/10.4103/2229-3485.83221",
        "Publication bias occurs when:":
            "Rosenthal, R. (1979). The file drawer problem and tolerance for null results. Psychological Bulletin, 86(3), 638–641. https://doi.org/10.1037/0033-2909.86.3.638",
        "Cohen's kappa measures:":
            "Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37–46. https://doi.org/10.1177/001316446002000104",
        "Power analysis determines:":
            "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum.",
        "The Bonferroni correction:":
            "Bland, J. M., & Altman, D. G. (1995). Multiple significance tests: The Bonferroni method. BMJ, 310(6973), 170. https://doi.org/10.1136/bmj.310.6973.170",
        "A null hypothesis states that:":
            "Fisher, R. A. (1925). Statistical methods for research workers. Oliver and Boyd.",
        "Sampling bias occurs when:":
            "Kish, L. (1965). Survey sampling. Wiley.",

        // ===== Domain 8: Ethics (batch 14+) =====
        "Duty to protect (Tarasoff) applies when:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976). https://law.justia.com/cases/california/supreme-court/3d/17/425.html",
        "Psychologists who learn of a colleague's ethical violation should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 1.04–1.05. https://www.apa.org/ethics/code",
        "Test obsolescence (Standard 9.08) requires psychologists to:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 9.08. https://www.apa.org/ethics/code",
        "The Goldwater Rule in psychology/psychiatry states:":
            "American Psychiatric Association. (2017). APA commentary on ethics in practice. See Principle 7.3 (Goldwater Rule). https://www.psychiatry.org/psychiatrists/practice/ethics",
        "Cultural competence in psychology (Standard 2.01b) requires:":
            "American Psychological Association. (2017). Multicultural guidelines: An ecological approach to context, identity, and intersectionality. https://www.apa.org/about/policy/multicultural-guidelines",
        "The ethical concept of autonomy refers to:":
            "Beauchamp, T. L., & Childress, J. F. (2019). Principles of biomedical ethics (8th ed.). Oxford University Press.",
        "When asked to provide services outside their area of competence, psychologists should:":
            "American Psychological Association. (2017). Ethical principles of psychologists and code of conduct, Standard 2.01. https://www.apa.org/ethics/code"
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

    console.log(`PasstheEPPP: APA references added to ${patched} questions (overlay 5).`);
})();
