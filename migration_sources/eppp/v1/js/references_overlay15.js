/* PasstheEPPP — APA References Overlay 15
   Covers: Batch 25 (80 questions) */
(function(){
    if (typeof EPPPData === 'undefined' || !EPPPData.referenceOverlay) return;
    const refs = {
        "Phenylketonuria (PKU) is a genetic disorder that:":
            "Scriver, C. R., & Kaufman, S. (2001). Hyperphenylalaninemia: Phenylalanine hydroxylase deficiency. In C. R. Scriver et al. (Eds.), *The metabolic and molecular bases of inherited disease* (8th ed., pp. 1667-1724). McGraw-Hill.",
        "The ventral tegmental area (VTA) is the origin of the:":
            "Wise, R. A. (2004). Dopamine, learning and motivation. *Nature Reviews Neuroscience, 5*(6), 483-494.",
        "Huntington's disease is characterized by:":
            "Walker, F. O. (2007). Huntington's disease. *The Lancet, 369*(9557), 218-228.",
        "The split-brain studies (Sperry, Gazzaniga) revealed:":
            "Gazzaniga, M. S. (2005). Forty-five years of split-brain research and still going strong. *Nature Reviews Neuroscience, 6*(8), 653-659.",
        "Endorphins are endogenous opioids that:":
            "Pert, C. B., & Snyder, S. H. (1973). Opiate receptor: Demonstration in nervous tissue. *Science, 179*(4077), 1011-1014.",
        "The spacing effect demonstrates that:":
            "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354-380.",
        "The Stroop effect demonstrates:":
            "MacLeod, C. M. (1991). Half a century of research on the Stroop effect: An integrative review. *Psychological Bulletin, 109*(2), 163-203.",
        "Cognitive dissonance (Festinger) is reduced by:":
            "Festinger, L. (1957). *A theory of cognitive dissonance.* Stanford University Press.",
        "Transfer-appropriate processing proposes that:":
            "Morris, C. D., Bransford, J. D., & Franks, J. J. (1977). Levels of processing versus transfer appropriate processing. *Journal of Verbal Learning and Verbal Behavior, 16*(5), 519-533.",
        "The sunk cost fallacy leads people to:":
            "Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost. *Organizational Behavior and Human Decision Processes, 35*(1), 124-140.",
        "Social comparison theory (Festinger) proposes that people:":
            "Festinger, L. (1954). A theory of social comparison processes. *Human Relations, 7*(2), 117-140.",
        "The just noticeable difference (JND) in Weber's Law applies to social perception as:":
            "Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. *Econometrica, 47*(2), 263-291.",
        "The Stanford Prison Experiment (Zimbardo) demonstrated:":
            "Haney, C., Banks, C., & Zimbardo, P. (1973). Interpersonal dynamics in a simulated prison. *International Journal of Criminology and Penology, 1*(1), 69-97.",
        "Microaggressions are:":
            "Sue, D. W., et al. (2007). Racial microaggressions in everyday life: Implications for clinical practice. *American Psychologist, 62*(4), 271-286.",
        "Minority influence (Moscovici) is most effective when the minority:":
            "Moscovici, S., Lage, E., & Naffrechoux, M. (1969). Influence of a consistent minority on the responses of a majority in a color perception task. *Sociometry, 32*(4), 365-380.",
        "Erikson's identity vs. role confusion (adolescence) involves:":
            "Erikson, E. H. (1968). *Identity: Youth and crisis.* Norton.",
        "Cross-sectional research designs in developmental psychology:":
            "Baltes, P. B., Reese, H. W., & Nesselroade, J. R. (1977). *Life-span developmental psychology: Introduction to research methods.* Brooks/Cole.",
        "Sequential designs (Schaie) combine:":
            "Schaie, K. W. (1965). A general model for the study of developmental problems. *Psychological Bulletin, 64*(2), 92-107.",
        "Theory of mind (ToM) develops around age:":
            "Wellman, H. M., Cross, D., & Watson, J. (2001). Meta-analysis of theory-of-mind development: The truth about false belief. *Child Development, 72*(3), 655-684.",
        "Moral development in Gilligan's care perspective emphasizes:":
            "Gilligan, C. (1982). *In a different voice: Psychological theory and women's development.* Harvard University Press.",
        "Bowen's family therapy focuses on:":
            "Bowen, M. (1978). *Family therapy in clinical practice.* Jason Aronson.",
        "Evidence-based practice (EBP) in psychology integrates:":
            "APA Presidential Task Force on Evidence-Based Practice. (2006). Evidence-based practice in psychology. *American Psychologist, 61*(4), 271-285.",
        "Overcorrection in behavioral therapy involves:":
            "Foxx, R. M., & Azrin, N. H. (1972). Restitution: A method of eliminating aggressive-disruptive behavior of retarded and brain damaged patients. *Behaviour Research and Therapy, 10*(1), 15-27.",
        "The transference neurosis in psychoanalysis occurs when:":
            "Freud, S. (1914). Remembering, repeating and working-through (Further recommendations on the technique of psycho-analysis II). *Standard Edition, 12*, 145-156.",
        "Cognitive defusion in ACT involves:":
            "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (1999). *Acceptance and commitment therapy: An experiential approach to behavior change.* Guilford Press.",
        "External validity refers to:":
            "Campbell, D. T., & Stanley, J. C. (1963). *Experimental and quasi-experimental designs for research.* Rand McNally.",
        "Internal validity refers to:":
            "Cook, T. D., & Campbell, D. T. (1979). *Quasi-experimentation: Design & analysis issues for field settings.* Houghton Mifflin.",
        "Stratified random sampling:":
            "Cochran, W. G. (1977). *Sampling techniques* (3rd ed.). Wiley.",
        "Type I error occurs when:":
            "Jaccard, J., & Becker, M. A. (2002). *Statistics for the behavioral sciences* (4th ed.). Wadsworth.",
        "Type II error occurs when:":
            "Cohen, J. (1992). A power primer. *Psychological Bulletin, 112*(1), 155-159.",
        "The Tarasoff II (1976) ruling expanded the duty from warning to:":
            "Tarasoff v. Regents of the University of California, 17 Cal. 3d 425, 551 P.2d 334, 131 Cal. Rptr. 14 (1976).",
        "Psychologists who become aware of a child abuse situation are:":
            "Kalichman, S. C. (1999). *Mandated reporting of suspected child abuse: Ethics, law, and policy* (2nd ed.). American Psychological Association.",
        "The concept of minimal disclosure means:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 4.04.",
        "Standard 3.10 (Informed Consent) applies to:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 3.10.",
        "When providing testimony in court, psychologists must:":
            "American Psychological Association. (2013). Specialty guidelines for forensic psychology. *American Psychologist, 68*(1), 7-19.",
    };
    Object.assign(EPPPData.referenceOverlay, refs);
    console.log(`PasstheEPPP: Loaded ${Object.keys(refs).length} APA references (overlay 15 — batch 25).`);
})();