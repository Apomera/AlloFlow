/* PasstheEPPP — APA References Overlay 17
   Covers: Batch 27 (80 questions) */
(function(){
    if (typeof EPPPData === 'undefined' || !EPPPData.referenceOverlay) return;
    const refs = {
        "The generation effect shows that:":
            "Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. *Journal of Experimental Psychology: Human Learning and Memory, 4*(6), 592-604.",
        "Dual-process theory (Kahneman's System 1 and System 2) proposes:":
            "Kahneman, D. (2011). *Thinking, fast and slow.* Farrar, Straus and Giroux.",
        "Source monitoring errors occur when:":
            "Johnson, M. K., Hashtroudi, S., & Lindsay, D. S. (1993). Source monitoring. *Psychological Bulletin, 114*(1), 3-28.",
        "The testing effect (retrieval practice) shows that:":
            "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249-255.",
        "The weapon focus effect in eyewitness testimony describes:":
            "Steblay, N. M. (1992). A meta-analytic review of the weapon focus effect. *Law and Human Behavior, 16*(4), 413-424.",
        "Schema theory proposes that knowledge is organized in:":
            "Bartlett, F. C. (1932). *Remembering: A study in experimental and social psychology.* Cambridge University Press.",
        "The mood congruency effect demonstrates that:":
            "Bower, G. H. (1981). Mood and memory. *American Psychologist, 36*(2), 129-148.",
        "Functional fixedness prevents people from:":
            "Duncker, K. (1945). On problem-solving. *Psychological Monographs, 58*(5), 1-113.",
        "The hindsight bias ('I knew it all along' effect) causes people to:":
            "Fischhoff, B. (1975). Hindsight is not equal to foresight: The effect of outcome knowledge on judgment under uncertainty. *Journal of Experimental Psychology: Human Perception and Performance, 1*(3), 288-299.",
        "Elaborative rehearsal differs from maintenance rehearsal in that:":
            "Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. *Journal of Verbal Learning and Verbal Behavior, 11*(6), 671-684.",
        "The goodness-of-fit model (Thomas & Chess) proposes:":
            "Thomas, A., & Chess, S. (1977). *Temperament and development.* Brunner/Mazel.",
        "Kohlberg's conventional level of moral reasoning involves:":
            "Kohlberg, L. (1984). *The psychology of moral development: The nature and validity of moral stages.* Harper & Row.",
        "The preconventional level of moral reasoning (Kohlberg) is characterized by:":
            "Kohlberg, L. (1984). *The psychology of moral development: The nature and validity of moral stages.* Harper & Row.",
        "Internalizing disorders in children include:":
            "Achenbach, T. M., & Edelbrock, C. S. (1978). The classification of child psychopathology: A review and analysis of empirical efforts. *Psychological Bulletin, 85*(6), 1275-1301.",
        "Externalizing disorders in children include:":
            "Achenbach, T. M. (1991). *Manual for the Child Behavior Checklist/4-18 and 1991 Profile.* University of Vermont Department of Psychiatry.",
        "Erikson's trust vs. mistrust (infancy) is resolved positively when:":
            "Erikson, E. H. (1950). *Childhood and society.* Norton.",
        "Secure attachment (Ainsworth, Type B) is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). *Patterns of attachment: A psychological study of the strange situation.* Erlbaum.",
        "Resistant/ambivalent attachment (Ainsworth, Type C) is characterized by:":
            "Ainsworth, M. D. S. (1979). Infant-mother attachment. *American Psychologist, 34*(10), 932-937.",
        "Selective optimization with compensation (SOC, Baltes) is a model of:":
            "Baltes, P. B., & Baltes, M. M. (1990). Psychological perspectives on successful aging: The model of selective optimization with compensation. In P. B. Baltes & M. M. Baltes (Eds.), *Successful aging: Perspectives from the behavioral sciences* (pp. 1-34). Cambridge University Press.",
        "The secular trend in development refers to:":
            "Tanner, J. M. (1981). *A history of the study of human growth.* Cambridge University Press.",
        "The MCMI-IV (Millon Clinical Multiaxial Inventory) is specifically designed to assess:":
            "Millon, T., Grossman, S., & Millon, C. (2015). *MCMI-IV manual.* NCS Pearson.",
        "Face validity refers to:":
            "Bornstein, R. F. (1996). Face validity in psychological assessment: Implications for a unified model of validity. *American Psychologist, 51*(9), 983-984.",
        "The Bayley Scales of Infant Development measure:":
            "Bayley, N. (2006). *Bayley scales of infant and toddler development* (3rd ed.). Harcourt Assessment.",
        "Incremental validity asks:":
            "Hunsley, J., & Meyer, G. J. (2003). The incremental validity of psychological testing and assessment: Conceptual, methodological, and statistical issues. *Psychological Assessment, 15*(4), 446-455.",
        "The Flynn effect describes:":
            "Flynn, J. R. (1987). Massive IQ gains in 14 nations: What IQ tests really measure. *Psychological Bulletin, 101*(2), 171-191.",
        "Correlation does NOT equal causation because:":
            "Pearl, J. (2009). *Causality: Models, reasoning, and inference* (2nd ed.). Cambridge University Press.",
        "The Pearson r correlation coefficient ranges from:":
            "Cohen, J., Cohen, P., West, S. G., & Aiken, L. S. (2003). *Applied multiple regression/correlation analysis for the behavioral sciences* (3rd ed.). Erlbaum.",
        "ANOVA (Analysis of Variance) is used to:":
            "Fisher, R. A. (1925). *Statistical methods for research workers.* Oliver and Boyd.",
        "The coefficient of determination (r²) indicates:":
            "Field, A. (2013). *Discovering statistics using IBM SPSS statistics* (4th ed.). Sage.",
        "Demand characteristics in research occur when:":
            "Orne, M. T. (1962). On the social psychology of the psychological experiment. *American Psychologist, 17*(11), 776-783.",
        "Pro bono services are:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Principle E.",
        "Standard 6.04 (Fees and Financial Arrangements) requires:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 6.04.",
        "Record keeping (Standard 6.01) requires psychologists to:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 6.01.",
        "The ethical principle of Beneficence and Nonmaleficence requires:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Principle A.",
        "Bartering for services (Standard 6.05) is:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 6.05.",
        "Telepsychology ethics require psychologists to:":
            "American Psychological Association. (2013). *Guidelines for the practice of telepsychology.*",
        "An ethics complaint against a psychologist:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 1.04-1.08.",
        "Aspirational principles in the Ethics Code differ from enforceable standards in that:":
            "Knapp, S. J., VandeCreek, L. D., & Fingerhut, R. (2017). *Practical ethics for psychologists: A positive approach* (3rd ed.). American Psychological Association.",
        "When conducting child custody evaluations, psychologists should:":
            "American Psychological Association. (2010). Guidelines for child custody evaluations in family law proceedings. *American Psychologist, 65*(9), 863-867.",
        "The ethical concept of fidelity refers to:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Principle B.",
    };
    Object.assign(EPPPData.referenceOverlay, refs);
    console.log(`PasstheEPPP: Loaded ${Object.keys(refs).length} APA references (overlay 17 — batch 27).`);
})();