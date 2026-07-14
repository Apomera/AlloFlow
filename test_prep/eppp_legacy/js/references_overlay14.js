/* PasstheEPPP — APA References Overlay 14
   Covers: Batch 24 (80 questions) */
(function(){
    if (typeof EPPPData === 'undefined' || !EPPPData.referenceOverlay) return;
    const refs = {
        "The anterior cingulate cortex (ACC) is involved in:":
            "Bush, G., Luu, P., & Posner, M. I. (2000). Cognitive and emotional influences in anterior cingulate cortex. *Trends in Cognitive Sciences, 4*(6), 215-222.",
        "The reticular activating system (RAS) regulates:":
            "Moruzzi, G., & Magoun, H. W. (1949). Brain stem reticular formation and activation of the EEG. *Electroencephalography and Clinical Neurophysiology, 1*(4), 455-473.",
        "The 10-20 system in EEG refers to:":
            "Jasper, H. H. (1958). The ten-twenty electrode system of the International Federation. *Electroencephalography and Clinical Neurophysiology, 10*, 371-375.",
        "Korsakoff's syndrome is characterized by:":
            "Kopelman, M. D., Thomson, A. D., Guerrini, I., & Marshall, E. J. (2009). The Korsakoff syndrome: Clinical aspects, psychology and treatment. *Alcohol and Alcoholism, 44*(2), 148-154.",
        "Ipsilateral control is an exception to contralateral organization, seen in:":
            "Manto, M., et al. (2012). Consensus paper: Roles of the cerebellum in motor control—the diversity of ideas on cerebellar involvement in movement. *The Cerebellum, 11*(2), 457-487.",
        "Mirror neurons fire both when:":
            "Rizzolatti, G., & Craighero, L. (2004). The mirror-neuron system. *Annual Review of Neuroscience, 27*, 169-192.",
        "Hemispheric specialization research shows the LEFT hemisphere typically excels at:":
            "Gazzaniga, M. S. (2000). Cerebral specialization and interhemispheric communication: Does the corpus callosum enable the human condition? *Brain, 123*(7), 1293-1326.",
        "Anterograde amnesia involves:":
            "Scoville, W. B., & Milner, B. (1957). Loss of recent memory after bilateral hippocampal lesions. *Journal of Neurology, Neurosurgery, and Psychiatry, 20*(1), 11-21.",
        "The basal ganglia are primarily involved in:":
            "Graybiel, A. M. (2000). The basal ganglia. *Current Biology, 10*(14), R509-R511.",
        "The suprachiasmatic nucleus (SCN) of the hypothalamus:":
            "Weaver, D. R. (1998). The suprachiasmatic nucleus: A 25-year retrospective. *Journal of Biological Rhythms, 13*(2), 100-112.",
        "Anchoring bias occurs when:":
            "Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. *Science, 185*(4157), 1124-1131.",
        "Implicit memory is demonstrated through:":
            "Schacter, D. L. (1987). Implicit memory: History and current status. *Journal of Experimental Psychology: Learning, Memory, and Cognition, 13*(3), 501-518.",
        "The confirmation bias leads people to:":
            "Nickerson, R. S. (1998). Confirmation bias: A ubiquitous phenomenon in many guises. *Review of General Psychology, 2*(2), 175-220.",
        "Proactive interference occurs when:":
            "Underwood, B. J. (1957). Interference and forgetting. *Psychological Review, 64*(1), 49-60.",
        "Retroactive interference occurs when:":
            "McGeoch, J. A. (1932). Forgetting and the law of disuse. *Psychological Review, 39*(4), 352-370.",
        "Realistic conflict theory (Sherif) proposes that prejudice arises from:":
            "Sherif, M. (1966). *In common predicament: Social psychology of intergroup conflict and cooperation.* Houghton Mifflin.",
        "Self-serving bias refers to:":
            "Miller, D. T., & Ross, M. (1975). Self-serving biases in the attribution of causality: Fact or fiction? *Psychological Bulletin, 82*(2), 213-225.",
        "The contact hypothesis (Allport) states that intergroup prejudice is reduced when:":
            "Allport, G. W. (1954). *The nature of prejudice.* Addison-Wesley.",
        "System justification theory (Jost & Banaji) proposes that:":
            "Jost, J. T., & Banaji, M. R. (1994). The role of stereotyping in system-justification and the production of false consciousness. *British Journal of Social Psychology, 33*(1), 1-27.",
        "The actor-observer bias describes:":
            "Jones, E. E., & Nisbett, R. E. (1971). *The actor and the observer: Divergent perceptions of the causes of behavior.* General Learning Press.",
        "Erikson's generativity vs. stagnation stage (~40-65) involves:":
            "Erikson, E. H. (1950). *Childhood and society.* Norton.",
        "Piaget's assimilation involves:":
            "Piaget, J. (1952). *The origins of intelligence in children.* International Universities Press.",
        "Piaget's accommodation involves:":
            "Piaget, J. (1954). *The construction of reality in the child.* Basic Books.",
        "Disengagement theory (Cumming & Henry) proposes that:":
            "Cumming, E., & Henry, W. E. (1961). *Growing old: The process of disengagement.* Basic Books.",
        "The zone of proximal development (Vygotsky) represents:":
            "Vygotsky, L. S. (1978). *Mind in society: The development of higher psychological processes.* Harvard University Press.",
        "The Beck Depression Inventory-II (BDI-II) is:":
            "Beck, A. T., Steer, R. A., & Brown, G. K. (1996). *Manual for the Beck Depression Inventory-II.* Psychological Corporation.",
        "Concurrent validity is established by:":
            "Cronbach, L. J., & Meehl, P. E. (1955). Construct validity in psychological tests. *Psychological Bulletin, 52*(4), 281-302.",
        "Norm-referenced tests compare an individual's performance to:":
            "Anastasi, A., & Urbina, S. (1997). *Psychological testing* (7th ed.). Prentice Hall.",
        "Criterion-referenced tests measure:":
            "Glaser, R. (1963). Instructional technology and the measurement of learning outcomes: Some questions. *American Psychologist, 18*(8), 519-521.",
        "The Vineland Adaptive Behavior Scales measure:":
            "Sparrow, S. S., Cicchetti, D. V., & Saulnier, C. A. (2016). *Vineland Adaptive Behavior Scales* (3rd ed.). NCS Pearson.",
        "Token economy is a behavior modification system that:":
            "Ayllon, T., & Azrin, N. H. (1968). *The token economy: A motivational system for therapy and rehabilitation.* Appleton-Century-Crofts.",
        "Brief psychodynamic therapy differs from traditional psychoanalysis by:":
            "Levenson, H. (2010). *Brief dynamic therapy.* American Psychological Association.",
        "Psychoeducation in therapy involves:":
            "Lukens, E. P., & McFarlane, W. R. (2004). Psychoeducation as evidence-based practice: Considerations for practice, research, and policy. *Brief Treatment and Crisis Intervention, 4*(3), 205-225.",
        "EMDR (Eye Movement Desensitization and Reprocessing) for PTSD involves:":
            "Shapiro, F. (1989). Efficacy of the eye movement desensitization procedure in the treatment of traumatic memories. *Journal of Traumatic Stress, 2*(2), 199-223.",
        "Relapse prevention (Marlatt) identifies:":
            "Marlatt, G. A., & Gordon, J. R. (Eds.). (1985). *Relapse prevention: Maintenance strategies in the treatment of addictive behaviors.* Guilford Press.",
        "A meta-analysis:":
            "Glass, G. V. (1976). Primary, secondary, and meta-analysis of research. *Educational Researcher, 5*(10), 3-8.",
        "Construct validity encompasses:":
            "Campbell, D. T., & Fiske, D. W. (1959). Convergent and discriminant validation by the multitrait-multimethod matrix. *Psychological Bulletin, 56*(2), 81-105.",
        "A between-subjects design:":
            "Keppel, G., & Wickens, T. D. (2004). *Design and analysis: A researcher's handbook* (4th ed.). Pearson.",
        "A within-subjects (repeated measures) design:":
            "Greenwald, A. G. (1976). Within-subjects designs: To use or not to use? *Psychological Bulletin, 83*(2), 314-320.",
        "An operational definition:":
            "Bridgman, P. W. (1927). *The logic of modern physics.* Macmillan.",
        "Informed consent for therapy (Standard 10.01) must include:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 10.01.",
        "The ethical standard on test security (Standard 9.11) requires that psychologists:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 9.11.",
        "When laws and the APA Ethics Code conflict, psychologists should:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 1.02.",
        "Standard 4.05 (Disclosures) permits psychologists to disclose confidential information:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 4.05.",
        "Abandonment in therapy occurs when a psychologist:":
            "Vasquez, M. J. T., Bingham, R. P., & Barnett, J. E. (2008). Psychotherapy termination: Clinical and ethical responsibilities. *Journal of Clinical Psychology, 64*(5), 653-665."
    };
    Object.assign(EPPPData.referenceOverlay, refs);
    console.log(`PasstheEPPP: Loaded ${Object.keys(refs).length} APA references (overlay 14 — batch 24).`);
})();