/* PasstheEPPP — APA References Overlay 16
   Covers: Batch 26 (80 questions) */
(function(){
    if (typeof EPPPData === 'undefined' || !EPPPData.referenceOverlay) return;
    const refs = {
        "Diffusion tensor imaging (DTI) measures:":
            "Basser, P. J., Mattiello, J., & LeBihan, D. (1994). MR diffusion tensor spectroscopy and imaging. *Biophysical Journal, 66*(1), 259-267.",
        "The thalamus is often described as the brain's:":
            "Sherman, S. M., & Guillery, R. W. (2002). The role of the thalamus in the flow of information to the cortex. *Philosophical Transactions of the Royal Society of London. Series B: Biological Sciences, 357*(1428), 1695-1708.",
        "Positron emission tomography (PET) works by:":
            "Raichle, M. E. (1998). Behind these images. *Scientific American, 27* (Mind Special Issue), 16-23.",
        "Glia cells differ from neurons in that they:":
            "Verkhratsky, A., & Butt, A. M. (2013). *Glial neurobiology: A textbook.* John Wiley & Sons.",
        "Down syndrome (Trisomy 21) is caused by:":
            "Lejeune, J., Gautier, M., & Turpin, R. (1959). Etude des chromosomes somatiques de neuf enfants mongoliens. *Comptes Rendus de l'Académie des Sciences, 248*(11), 1721-1722.",
        "The amygdala plays a central role in:":
            "LeDoux, J. E. (2000). Emotion circuits in the brain. *Annual Review of Neuroscience, 23*, 155-184.",
        "Clozapine (Clozaril) is unique among antipsychotics because:":
            "Kane, J., Honigfeld, G., Singer, J., & Meltzer, H. (1988). Clozapine for the treatment-resistant schizophrenic. *Archives of General Psychiatry, 45*(9), 789-796.",
        "The cerebellum's role extends beyond motor coordination to include:":
            "Petersen, S. E., Fox, P. T., Posner, M. I., Mintun, M., & Raichle, M. E. (1989). Positron emission tomographic studies of the processing of single words. *Journal of Cognitive Neuroscience, 1*(2), 153-170.",
        "Sleep deprivation primarily affects:":
            "Goel, N., Rao, H., Durmer, J. S., & Dinges, D. F. (2009). Neurocognitive consequences of sleep deprivation. *Seminars in Neurology, 29*(4), 320-339.",
        "The pituitary gland is called the 'master gland' because:":
            "Melmed, S. (2011). *The pituitary* (3rd ed.). Academic Press.",
        "The bystander effect (Darley & Latané) is mediated by:":
            "Darley, J. M., & Latané, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. *Journal of Personality and Social Psychology, 8*(4), 377-383.",
        "Heuristic-systematic model (HSM, Chaiken) proposes:":
            "Chaiken, S. (1980). Heuristic versus systematic information processing and the use of source versus message cues in persuasion. *Journal of Personality and Social Psychology, 39*(5), 752-766.",
        "Social norms influence behavior through:":
            "Cialdini, R. B., Reno, R. R., & Kallgren, C. A. (1990). A focus theory of normative conduct: Recycling the concept of norms to reduce littering in public places. *Journal of Personality and Social Psychology, 58*(6), 1015-1026.",
        "The social dominance orientation (SDO) scale measures:":
            "Pratto, F., Sidanius, J., Stallworth, L. M., & Malle, B. F. (1994). Social dominance orientation: A personality variable predicting social and political attitudes. *Journal of Personality and Social Psychology, 67*(4), 741-763.",
        "Right-wing authoritarianism (RWA, Altemeyer) is characterized by:":
            "Altemeyer, B. (1981). *Right-wing authoritarianism.* University of Manitoba Press.",
        "Intersectionality (Crenshaw) recognizes that:":
            "Crenshaw, K. (1989). Demarginalizing the intersection of race and sex: A black feminist critique of antidiscrimination doctrine, feminist theory and antiracist politics. *University of Chicago Legal Forum, 1989*(1), 139-167.",
        "Cognitive dissonance is GREATEST when:":
            "Festinger, L. (1957). *A theory of cognitive dissonance.* Stanford University Press.",
        "The looking-glass self (Cooley) proposes that:":
            "Cooley, C. H. (1902). *Human nature and the social order.* Scribner.",
        "The illusory correlation occurs when:":
            "Chapman, L. J. (1967). Illusory correlation in observational report. *Journal of Verbal Learning and Verbal Behavior, 6*(1), 151-155.",
        "Acculturation strategies (Berry) include:":
            "Berry, J. W. (1997). Immigration, acculturation, and adaptation. *Applied Psychology, 46*(1), 5-34.",
        "The WAIS-V is designed for ages:":
            "Wechsler, D. (2024). *Wechsler Adult Intelligence Scale—Fifth Edition (WAIS-V) technical and interpretive manual.* NCS Pearson.",
        "Practice effects in testing refer to:":
            "Hausknecht, J. P., Halpert, J. A., Di Paolo, N. T., & Moriarty Gerrard, M. O. (2007). Retesting in selection: A meta-analysis of coaching and practice effects for tests of cognitive ability. *Journal of Applied Psychology, 92*(2), 373-385.",
        "The NEO-PI-R (NEO Personality Inventory-Revised) measures:":
            "Costa, P. T., & McCrae, R. R. (1992). *Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) professional manual.* Psychological Assessment Resources.",
        "Base rate in diagnostic assessment refers to:":
            "Meehl, P. E., & Rosen, A. (1955). Antecedent probability and the efficiency of psychometric signs, patterns, or cutting scores. *Psychological Bulletin, 52*(3), 194-216.",
        "The Halstead-Reitan Neuropsychological Battery assesses:":
            "Reitan, R. M., & Wolfson, D. (1993). *The Halstead-Reitan neuropsychological test battery: Theory and clinical interpretation* (2nd ed.). Neuropsychology Press.",
        "Flooding (implosive therapy) involves:":
            "Stampfl, T. G., & Levis, D. J. (1967). Essentials of implosive therapy: A learning-theory-based psychodynamic behavioral therapy. *Journal of Abnormal Psychology, 72*(6), 496-503.",
        "Solution-focused brief therapy (SFBT) assumes:":
            "de Shazer, S. (1985). *Keys to solution in brief therapy.* Norton.",
        "Aversion therapy pairs:":
            "Rachman, S., & Teasdale, J. (1969). *Aversion therapy and behaviour disorders: An analysis.* University of Miami Press.",
        "Genograms in family therapy:":
            "McGoldrick, M., Gerson, R., & Petry, S. (2008). *Genograms: Assessment and intervention.* Norton.",
        "The dose-response relationship in psychotherapy research shows:":
            "Howard, K. I., Kopta, S. M., Krause, M. S., & Orlinsky, D. E. (1986). The dose-effect relationship in psychotherapy. *American Psychologist, 41*(2), 159-164.",
        "Counterbalancing in within-subjects designs:":
            "Rosenthal, R., & Rosnow, R. L. (2008). *Essentials of behavioral research: Methods and data analysis* (3rd ed.). McGraw-Hill.",
        "Matched-pairs design:":
            "Campbell, D. T., & Stanley, J. C. (1963). *Experimental and quasi-experimental designs for research.* Rand McNally.",
        "Standard deviation is:":
            "Howell, D. C. (2012). *Statistical methods for psychology* (8th ed.). Wadsworth.",
        "A confounding variable:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). *Experimental and quasi-experimental designs for generalized causal inference.* Houghton Mifflin.",
        "APA style requires research papers to include:":
            "American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.).",
        "The HIPAA Privacy Rule requires:":
            "U.S. Department of Health and Human Services. (2003). *Summary of the HIPAA privacy rule.* Office for Civil Rights.",
        "Competence to stand trial requires that the defendant:":
            "Dusky v. United States, 362 U.S. 402 (1960).",
        "The McNaughten rule (insanity defense) requires proving that:":
            "R v. McNaughten, 8 Eng. Rep. 718 (1843).",
        "Psychologists working with interpreters must:":
            "American Psychological Association. (2020). *Guidelines for providers of psychological services to ethnic, linguistic, and culturally diverse populations.*",
        "The irreconcilable conflict clause in the Ethics Code instructs psychologists that:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 1.02.",
    };
    Object.assign(EPPPData.referenceOverlay, refs);
    console.log(`PasstheEPPP: Loaded ${Object.keys(refs).length} APA references (overlay 16 — batch 26).`);
})();