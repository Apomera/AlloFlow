/* PasstheEPPP — APA References Overlay 13
   Covers: Batch 19 (80 questions), Batch 23 (80 questions) */
(function(){
    if (typeof EPPPData === 'undefined' || !EPPPData.referenceOverlay) return;

    const refs = {
        // ===== BATCH 19 =====
        // Domain 1: Biological Bases
        "Transcranial magnetic stimulation (TMS) works by:":
            "Hallett, M. (2007). Transcranial magnetic stimulation: A primer. *Neuron, 55*(2), 187–199.",
        "The orbitofrontal cortex (OFC) is important for:":
            "Rolls, E. T. (2004). The functions of the orbitofrontal cortex. *Brain and Cognition, 55*(1), 11–29.",
        "Electroconvulsive therapy (ECT) is most effective for:":
            "UK ECT Review Group. (2003). Efficacy and safety of electroconvulsive therapy in depressive disorders. *The Lancet, 361*(9360), 799–808.",
        "Synaptogenesis refers to:":
            "Huttenlocher, P. R. (2002). *Neural plasticity: The effects of environment on the development of the cerebral cortex.* Harvard University Press.",
        "Synaptic pruning during development:":
            "Huttenlocher, P. R., & Dabholkar, A. S. (1997). Regional differences in synaptogenesis in human cerebral cortex. *Journal of Comparative Neurology, 387*(2), 167–178.",
        "The dorsolateral prefrontal cortex (dlPFC) is critical for:":
            "Goldman-Rakic, P. S. (1996). Regional and cellular fractionation of working memory. *Proceedings of the National Academy of Sciences, 93*(24), 13473–13480.",
        "Wernicke's area damage produces:":
            "Geschwind, N. (1970). The organization of language and the brain. *Science, 170*(3961), 940–944.",
        "Selective serotonin reuptake inhibitors (SSRIs) have a therapeutic lag of approximately:":
            "Machado-Vieira, R., Baumann, J., Wheeler-Castillo, C., et al. (2010). The timing of antidepressant effects: A comparison of diverse pharmacological and somatic treatments. *Pharmaceuticals, 3*(1), 19–41.",
        "Hemispatial neglect syndrome most commonly results from damage to the:":
            "Heilman, K. M., Watson, R. T., & Valenstein, E. (2003). Neglect and related disorders. In K. M. Heilman & E. Valenstein (Eds.), *Clinical neuropsychology* (4th ed., pp. 296–346). Oxford University Press.",
        "Fetal Alcohol Spectrum Disorders (FASD) can include:":
            "Hoyme, H. E., et al. (2005). A practical clinical approach to diagnosis of fetal alcohol spectrum disorders. *Pediatrics, 115*(1), 39–47.",

        // Domain 2: Cognitive-Affective
        "The method of loci is a mnemonic strategy that involves:":
            "Roediger, H. L. (1980). The effectiveness of four mnemonics in ordering recall. *Journal of Experimental Psychology: Human Learning and Memory, 6*(5), 558–567.",
        "Change blindness refers to:":
            "Simons, D. J., & Rensink, R. A. (2005). Change blindness: Past, present, and future. *Trends in Cognitive Sciences, 9*(1), 16–20.",
        "Elaborative rehearsal is more effective than maintenance rehearsal because:":
            "Craik, F. I. M., & Tulving, E. (1975). Depth of processing and the retention of words in episodic memory. *Journal of Experimental Psychology: General, 104*(3), 268–294.",
        "Hindsight bias (the 'I knew it all along' effect) refers to:":
            "Fischhoff, B. (1975). Hindsight is not equal to foresight: The effect of outcome knowledge on judgment under uncertainty. *Journal of Experimental Psychology: Human Perception and Performance, 1*(3), 288–299.",
        "The dual-coding theory (Paivio) proposes that:":
            "Paivio, A. (1991). Dual coding theory: Retrospect and current status. *Canadian Journal of Psychology, 45*(3), 255–287.",

        // Domain 3: Social & Cultural
        "Just-world beliefs (Lerner) are associated with:":
            "Lerner, M. J. (1980). *The belief in a just world: A fundamental delusion.* Plenum Press.",
        "The autokinetic effect (Sherif) was used to demonstrate:":
            "Sherif, M. (1936). *The psychology of social norms.* Harper.",
        "Reciprocal determinism (Bandura) proposes that:":
            "Bandura, A. (1978). The self system in reciprocal determinism. *American Psychologist, 33*(4), 344–358.",
        "The outgroup homogeneity effect is:":
            "Linville, P. W., Fischer, G. W., & Salovey, P. (1989). Perceived distributions of the characteristics of in-group and out-group members. *Journal of Personality and Social Psychology, 57*(2), 165–188.",
        "Moral disengagement (Bandura) involves:":
            "Bandura, A. (1999). Moral disengagement in the perpetration of inhumanities. *Personality and Social Psychology Review, 3*(3), 193–209.",

        // Domain 4: Growth & Lifespan
        "Ainsworth's anxious-resistant (ambivalent, Type C) attachment is characterized by:":
            "Ainsworth, M. D. S., Blehar, M. C., Waters, E., & Wall, S. (1978). *Patterns of attachment: A psychological study of the strange situation.* Erlbaum.",
        "Puberty onset is primarily triggered by:":
            "Sisk, C. L., & Foster, D. L. (2004). The neural basis of puberty and adolescence. *Nature Neuroscience, 7*(10), 1040–1047.",
        "Lev Vygotsky's key contribution to developmental psychology was emphasizing:":
            "Vygotsky, L. S. (1978). *Mind in society: The development of higher psychological processes.* Harvard University Press.",
        "Egocentrism in Piaget's preoperational stage means:":
            "Piaget, J., & Inhelder, B. (1956). *The child's conception of space.* Routledge & Kegan Paul.",
        "The activity theory of aging proposes that:":
            "Havighurst, R. J. (1961). Successful aging. *The Gerontologist, 1*(1), 8–13.",

        // Domain 6: Treatment
        "Dialectical behavior therapy (DBT) was originally developed for:":
            "Linehan, M. M. (1993). *Cognitive-behavioral treatment of borderline personality disorder.* Guilford Press.",
        "Cognitive processing therapy (CPT) for PTSD focuses on:":
            "Resick, P. A., Monson, C. M., & Chard, K. M. (2017). *Cognitive processing therapy for PTSD: A comprehensive manual.* Guilford Press.",
        "Unconditional positive regard (Rogers) means:":
            "Rogers, C. R. (1957). The necessary and sufficient conditions of therapeutic personality change. *Journal of Consulting Psychology, 21*(2), 95–103.",
        "The common factors model of psychotherapy identifies:":
            "Wampold, B. E. (2015). How important are the common factors in psychotherapy? *World Psychiatry, 14*(3), 270–277.",
        "Systematic desensitization (Wolpe) involves:":
            "Wolpe, J. (1958). *Psychotherapy by reciprocal inhibition.* Stanford University Press.",
        "Multicultural counseling competencies require:":
            "Sue, D. W., Arredondo, P., & McDavis, R. J. (1992). Multicultural counseling competencies and standards: A call to the profession. *Journal of Counseling & Development, 70*(4), 477–486.",
        "Termination in therapy should ideally:":
            "Vasquez, M. J. T., Bingham, R. P., & Barnett, J. E. (2008). Psychotherapy termination: Clinical and ethical responsibilities. *Journal of Clinical Psychology, 64*(5), 653–665.",
        "Motivational enhancement therapy (MET) is a:":
            "Miller, W. R., Zweben, A., DiClemente, C. C., & Rychtarik, R. G. (1992). *Motivational enhancement therapy manual.* National Institute on Alcohol Abuse and Alcoholism.",
        "Shaping in behavioral therapy involves:":
            "Skinner, B. F. (1953). *Science and human behavior.* Macmillan.",
        "The placebo effect in psychotherapy research demonstrates that:":
            "Kirsch, I. (2005). Placebo psychotherapy: Synonym or oxymoron? *Journal of Clinical Psychology, 61*(7), 791–803.",

        // Domain 7: Research
        "Power in statistical testing refers to:":
            "Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Erlbaum.",
        "A longitudinal study follows:":
            "Baltes, P. B., Reese, H. W., & Nesselroade, J. R. (1977). *Life-span developmental psychology: Introduction to research methods.* Brooks/Cole.",
        "Selection bias threatens internal validity because:":
            "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). *Experimental and quasi-experimental designs for generalized causal inference.* Houghton Mifflin.",
        "Chi-square (χ²) tests are used to analyze:":
            "Agresti, A. (2007). *An introduction to categorical data analysis* (2nd ed.). Wiley.",
        "Demand characteristics are:":
            "Orne, M. T. (1962). On the social psychology of the psychological experiment. *American Psychologist, 17*(11), 776–783.",

        // ===== BATCH 23 =====
        // Domain 1: Biological Bases
        "Agnosia is the inability to:":
            "Farah, M. J. (2004). *Visual agnosia* (2nd ed.). MIT Press.",
        "Atypical (second-generation) antipsychotics differ from typical antipsychotics in that they:":
            "Meltzer, H. Y. (2013). Update on typical and atypical antipsychotic drugs. *Annual Review of Medicine, 64*, 393–406.",
        "Contralateral control means:":
            "Kandel, E. R., Schwartz, J. H., & Jessell, T. M. (2000). *Principles of neural science* (4th ed.). McGraw-Hill.",
        "The raphe nuclei are the brain's primary source of:":
            "Hornung, J. P. (2003). The human raphe nuclei and the serotonergic system. *Journal of Chemical Neuroanatomy, 26*(4), 331–343.",
        "Neuroimaging technique fMRI measures:":
            "Logothetis, N. K. (2008). What we can do and what we cannot do with fMRI. *Nature, 453*, 869–878.",

        // Domain 2: Cognitive-Affective
        "The serial position effect shows that:":
            "Murdock, B. B. (1962). The serial position effect of free recall. *Journal of Experimental Psychology, 64*(5), 482–488.",
        "Deductive reasoning moves from:":
            "Johnson-Laird, P. N. (1999). Deductive reasoning. *Annual Review of Psychology, 50*, 109–135.",
        "Inductive reasoning moves from:":
            "Heit, E. (2000). Properties of inductive reasoning. *Psychonomic Bulletin & Review, 7*(4), 569–592.",
        "State-dependent learning means:":
            "Goodwin, D. W., Powell, B., Bremer, D., Hoine, H., & Stern, J. (1969). Alcohol and recall: State-dependent effects in man. *Science, 163*(3873), 1358–1360.",
        "Interference theory explains forgetting as:":
            "Anderson, M. C., & Neely, J. H. (1996). Interference and inhibition in memory retrieval. In E. L. Bjork & R. A. Bjork (Eds.), *Memory* (pp. 237–313). Academic Press.",

        // Domain 3: Social & Cultural
        "Pluralistic ignorance describes situations where:":
            "Prentice, D. A., & Miller, D. T. (1993). Pluralistic ignorance and alcohol use on campus. *Journal of Personality and Social Psychology, 64*(2), 243–256.",
        "Cognitive neuroassociative model of aggression (Berkowitz) proposes that:":
            "Berkowitz, L. (1990). On the formation and regulation of anger and aggression: A cognitive-neoassociationistic analysis. *American Psychologist, 45*(4), 494–503.",
        "The Robbers Cave experiment (Sherif) demonstrated:":
            "Sherif, M., Harvey, O. J., White, B. J., Hood, W. R., & Sherif, C. W. (1961). *Intergroup conflict and cooperation: The Robbers Cave experiment.* University of Oklahoma Press.",
        "Cultural humility differs from cultural competence in emphasizing:":
            "Tervalon, M., & Murray-García, J. (1998). Cultural humility versus cultural competence: A critical distinction. *Journal of Health Care for the Poor and Underserved, 9*(2), 117–125.",
        "The elaboration likelihood model predicts that the CENTRAL route to persuasion is used when:":
            "Petty, R. E., & Cacioppo, J. T. (1986). *Communication and persuasion: Central and peripheral routes to attitude change.* Springer.",

        // Domain 4: Growth & Lifespan
        "Diana Baumrind's authoritative parenting is associated with:":
            "Baumrind, D. (1991). The influence of parenting style on adolescent competence and substance use. *Journal of Early Adolescence, 11*(1), 56–95.",
        "Concrete operational thinking (Piaget, ages ~7-11) is characterized by:":
            "Piaget, J. (1952). *The origins of intelligence in children.* International Universities Press.",
        "Formal operational thinking (Piaget, ~12+) enables:":
            "Inhelder, B., & Piaget, J. (1958). *The growth of logical thinking from childhood to adolescence.* Basic Books.",
        "Ainsworth's attachment theory proposes that the INTERNAL WORKING MODEL:":
            "Bowlby, J. (1969). *Attachment and loss: Vol. 1. Attachment.* Basic Books.",
        "Teratogens are:":
            "Moore, K. L., & Persaud, T. V. N. (2008). *The developing human: Clinically oriented embryology* (8th ed.). Saunders.",

        // Domain 6: Treatment
        "Existential therapy focuses on:":
            "Yalom, I. D. (1980). *Existential psychotherapy.* Basic Books.",
        "Gestalt therapy emphasizes:":
            "Perls, F. S. (1969). *Gestalt therapy verbatim.* Real People Press.",
        "The therapeutic window for medication refers to:":
            "Stahl, S. M. (2013). *Stahl's essential psychopharmacology* (4th ed.). Cambridge University Press.",
        "Person-centered therapy (Rogers) considers the therapeutic relationship as:":
            "Rogers, C. R. (1961). *On becoming a person: A therapist's view of psychotherapy.* Houghton Mifflin.",
        "Modeling (Bandura) in therapy involves:":
            "Bandura, A. (1977). *Social learning theory.* Prentice-Hall.",
        "Decisional balance in motivational interviewing involves:":
            "Miller, W. R., & Rollnick, S. (2013). *Motivational interviewing: Helping people change* (3rd ed.). Guilford Press.",
        "The empty chair technique is associated with:":
            "Greenberg, L. S. (2002). Emotion-focused therapy: Coaching clients to work through their feelings. *APA.*",
        "Culturally adapted evidence-based treatments:":
            "Bernal, G., Jiménez-Chafey, M. I., & Domenech Rodríguez, M. M. (2009). Cultural adaptation of treatments. *Clinical Psychology: Science and Practice, 16*(4), 361–378.",
        "The Dodo bird verdict in psychotherapy research suggests:":
            "Luborsky, L., Singer, B., & Luborsky, L. (1975). Comparative studies of psychotherapies: Is it true that 'everyone has won and all must have prizes'? *Archives of General Psychiatry, 32*(8), 995–1008.",
        "Play therapy is particularly appropriate for children because:":
            "Landreth, G. L. (2012). *Play therapy: The art of the relationship* (3rd ed.). Routledge.",

        // Domain 8: Ethics
        "Standard 10.10 (Terminating Therapy) states that psychologists:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 10.10.",
        "Standard 10.08 prohibits sexual relationships with FORMER clients for:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standard 10.08.",
        "The ethical principle of Justice directs psychologists to:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Principle D: Justice.",
        "When a psychologist is aware of potential impairment in a colleague, they should:":
            "American Psychological Association. (2017). *Ethical principles of psychologists and code of conduct.* Standards 1.04–1.05.",
        "Supervision in psychology training requires that the supervisor:":
            "Bernard, J. M., & Goodyear, R. K. (2019). *Fundamentals of clinical supervision* (6th ed.). Pearson."
    };

    Object.assign(EPPPData.referenceOverlay, refs);
    console.log(`PasstheEPPP: Loaded ${Object.keys(refs).length} APA references (overlay 13 — batches 19, 23).`);
})();
