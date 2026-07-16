'use strict';

module.exports = new Map([
  ['What is the function of the hippocampus?', {
    back: 'The hippocampal formation supports the encoding and consolidation of declarative memories and spatial-context processing. Bilateral damage can severely impair formation of new declarative memories while sparing some other learning and memory functions.',
    reason: 'Removed the misleading short-term-to-long-term transfer metaphor and made the memory-system limits explicit.',
  }],
  ["What does the amygdala do?", {
    back: 'The amygdala participates in detecting biologically relevant stimuli, emotional learning, and modulation of memory and behavior. It is especially well studied in threat and fear conditioning, but it is not a single-purpose fear or aggression center.',
    reason: 'Replaced single-center language with a network-based, nonexclusive description.',
  }],
  ['Thalamus function', {
    back: 'The thalamus contains nuclei that relay and transform most sensory information on its way to cortex and also participates in motor, attention, arousal, and sleep-related circuits. Olfactory input is the usual exception to the simple sensory-relay summary.',
    reason: 'Replaced the relay-station metaphor with a more accurate description of multiple thalamic functions.',
  }],
  ["What does Wernicke's area control?", {
    front: 'What functions are associated with the classic Wernicke language region?',
    back: 'The posterior left temporal language network classically associated with Wernicke contributes to understanding spoken and written language. Damage can produce fluent aphasia with impaired comprehension, but contemporary models treat language as a distributed network rather than a single area that controls comprehension.',
    reason: 'Removed localization absolutism and distinguished the classic model from contemporary network accounts.',
  }],
  ['What is the HPA axis?', {
    back: 'The hypothalamic-pituitary-adrenal axis is a stress-response system: hypothalamic CRH promotes pituitary ACTH release, which stimulates glucocorticoid release from the adrenal cortex. Feedback regulation helps limit the response; persistent dysregulation is associated with, but does not by itself establish, psychological or medical disorders.',
    reason: 'Added feedback regulation and replaced a deterministic disorder claim with an association.',
  }],
  ['What is hemispatial neglect?', {
    back: 'Hemispatial neglect is impaired awareness of or response to stimuli on one side of space that is not explained by primary sensory loss. It commonly follows right-hemisphere, especially parietal-network, injury and often affects left space, but lesion sites and presentations vary.',
    reason: 'Replaced a single-lesion cause claim with the more accurate network and variability framing.',
  }],
  ['What is the primary inhibitory neurotransmitter?', {
    back: 'GABA is the principal inhibitory neurotransmitter in the mature mammalian central nervous system. Its effects depend on receptor subtype and circuit context; GABA-A receptor signaling is enhanced by benzodiazepines.',
    reason: 'Removed a nonspecific low-GABA-causes-anxiety shortcut and retained the core neurochemical distinction.',
  }],
  ['What is the blood-brain barrier?', {
    back: 'The blood-brain barrier is formed chiefly by tight junctions between central nervous system capillary endothelial cells, with support from pericytes, astrocytes, and other neurovascular-unit components. It selectively regulates movement of substances between blood and brain rather than simply blocking all large or water-soluble molecules.',
    reason: 'Clarified the primary cellular structure and removed an overly simple permeability rule.',
  }],
  ['What is neuroplasticity?', {
    back: 'Neuroplasticity is experience- or injury-related change in neural function or organization, including changes in synaptic strength, connectivity, and functional recruitment. Plasticity occurs across the lifespan, although its form and extent depend on age, circuit, experience, and health.',
    reason: 'Removed an unqualified childhood maximum and rehabilitation guarantee.',
  }],
  ['What is the split-brain procedure?', {
    back: 'In a split-brain procedure, some or all corpus callosum fibers are severed, historically to reduce severe epilepsy. Carefully controlled studies show reduced information transfer between hemispheres and reveal some lateralized processing, while avoiding the inaccurate claim that one hemisphere is wholly analytical and the other wholly holistic.',
    reason: 'Removed the popular left-brain/right-brain caricature and added clinical context.',
  }],
  ['What is the reticular activating system (RAS)?', {
    back: 'The reticular activating system is a distributed set of brainstem and related pathways involved in arousal, wakefulness, attention, and sleep-wake regulation. Severe injury to these systems can impair consciousness, but outcome depends on lesion location and extent.',
    reason: 'Replaced a deterministic coma claim and sensory-filter metaphor with a distributed-system description.',
  }],
  ['What is the overjustification effect?', {
    back: 'The overjustification effect is a possible reduction in intrinsic motivation after expected, controlling external rewards are introduced for an already enjoyable activity and later removed. The effect depends on reward type, expectations, and context rather than following every reward.',
    reason: 'Added the boundary conditions missing from the legacy causal statement.',
  }],
  ['What is the misinformation effect?', {
    back: 'The misinformation effect occurs when misleading information encountered after an event influences later memory reports about that event. It demonstrates reconstructive memory; it does not mean every leading question changes every witness\'s memory.',
    reason: 'Made the finding probabilistic and separated a group-level effect from an individual rule.',
  }],
  ['What is the serial position effect?', {
    back: 'The serial position effect is better recall, on average, for items near the beginning and end of a list than for middle items. Primacy and recency can reflect multiple processes, including rehearsal, retrieval context, and the timing of recall; they are not simple direct readouts of long- versus short-term stores.',
    reason: 'Removed an overly literal two-store explanation.',
  }],
  ['What is the generation effect?', {
    back: 'The generation effect is better later memory, under many conditions, for information a learner generates than for equivalent information the learner only reads. Its size depends on the task, the generation rule, and whether generation is successful.',
    reason: 'Removed an unrelated testing-effect claim and added task-dependent limits.',
  }],
  ['What is the spacing effect?', {
    back: 'The spacing effect is improved long-term retention when learning opportunities are distributed over time rather than massed together. The best interval depends on the material, learner, retention goal, and retrieval conditions, so spacing is a principle rather than one universal schedule.',
    reason: 'Removed universal-effect and equal-study-time overclaims while retaining the practical retrieval principle.',
  }],
  ['Cognitive load theory', {
    back: 'Cognitive load theory emphasizes the limited capacity of working memory during complex learning. Instruction can manage element interactivity and reduce unnecessary processing; the older intrinsic, extraneous, and germane three-part terminology should be treated as a model whose definitions and measurement remain debated.',
    reason: 'Distinguished the instructional model from settled cognitive architecture and noted debate around load categories.',
  }],
  ['Dual-process theory (Kahneman)', {
    back: 'Dual-process accounts distinguish relatively fast, automatic processing from relatively slow, controlled processing. System 1 and System 2 are useful labels for families of processes, not two literal brain systems, and either mode can produce accurate or biased judgments depending on context.',
    reason: 'Removed the implication that two labels are literal systems or that fast processing is inherently biased.',
  }],
  ['Describe Schachter-Singer two-factor theory.', {
    back: 'Schachter and Singer proposed that emotion reflects physiological arousal interpreted in light of situational cues. It is an influential historical two-factor account, but contemporary emotion science does not treat it as a complete explanation of every emotion.',
    reason: 'Labeled the theory historically and removed a universal requirement claim.',
  }],
  ['What is the bystander effect?', {
    back: 'The bystander effect is the finding that the presence of other people can reduce an individual\'s likelihood or speed of helping in some situations. Diffusion of responsibility and pluralistic ignorance are proposed mechanisms, but danger, communication, relationships, and context can change the pattern.',
    reason: 'Replaced a deterministic more-bystanders-less-help rule with a contextual finding.',
  }],
  ['What is stereotype threat?', {
    back: 'Stereotype threat refers to concern about being judged through a negative group stereotype, which can affect attention, stress, belonging, or performance in some contexts. Effects vary across tasks, cues, people, and study designs and should not be treated as inevitable.',
    reason: 'Removed a single-mechanism causal claim and added documented context sensitivity.',
  }],
  ['What is deindividuation?', {
    back: 'Deindividuation theories examine how reduced self-awareness, identifiability, or accountability can shift behavior toward salient group norms. Anonymity does not inherently produce antisocial or impulsive behavior; the active norms and situation matter.',
    reason: 'Removed the outdated anonymity-causes-disinhibition rule and added the role of group norms.',
  }],
  ['Fundamental attribution error', {
    back: 'The fundamental attribution error is a tendency, observed in some judgment settings, to give too much weight to dispositional explanations for another person\'s behavior and too little to situational constraints. Its size and expression vary with information, perspective, and cultural context.',
    reason: 'Replaced a broad culture ranking with a contextual definition.',
  }],
  ["Allport's contact hypothesis", {
    back: 'The contact hypothesis proposes that intergroup contact is more likely to reduce prejudice when it includes equal status within the setting, shared goals, cooperation, and institutional support. Contact effects vary, and poorly structured or threatening contact can fail to help or can worsen attitudes.',
    reason: 'Made the proposed conditions probabilistic instead of sufficient guarantees.',
  }],
  ["Attribution theory: Kelley's covariation model", {
    back: 'Kelley\'s covariation model uses consensus, distinctiveness, and consistency information to explain attributions. High consensus, high distinctiveness, and high consistency tend to support an attribution to the stimulus or situation; low consensus and low distinctiveness with high consistency tend to support a person attribution.',
    reason: 'Expanded the ambiguous repeated initials and identified both common attribution patterns.',
  }],
  ['Individualistic vs. collectivist cultures', {
    back: 'Individualism and collectivism describe cultural tendencies in how autonomy, relationships, and group obligations are emphasized. They vary within every region and person, can coexist, and should not be used to stereotype all people from broad geographic groups.',
    reason: 'Removed regional stereotyping and reframed the constructs as variable dimensions.',
  }],
  ['Attachment theory applied to adult relationships', {
    back: 'Adult attachment research uses dimensions such as attachment anxiety and avoidance to describe patterns in close relationships. These patterns are related to, but are not fixed copies of, infant classifications and can vary across relationships and over time.',
    reason: 'Removed a deterministic infant-to-adult mapping and categorical relationship predictions.',
  }],
  ["Ainsworth's attachment types", {
    back: 'The Strange Situation classically distinguishes secure, avoidant, and resistant or ambivalent patterns; later work added a disorganized classification. These are observed relationship patterns in a particular assessment context, not fixed child traits or proof of maltreatment.',
    reason: 'Removed an abuse inference and clarified the assessment context.',
  }],
  ['Crystallized vs. fluid intelligence in aging?', {
    back: 'Crystallized abilities draw on accumulated knowledge and often remain relatively stable longer in adulthood, whereas many fluid abilities involved in novel problem solving show earlier average age-related decline. Trajectories vary widely by ability, person, health, education, and experience.',
    reason: 'Changed categorical age claims into average trajectories with individual variability.',
  }],
  ['What is theory of mind?', {
    back: 'Theory of mind is the capacity to reason about others\' beliefs, desires, knowledge, and intentions. Performance on explicit false-belief tasks often changes substantially during the preschool years, but development is gradual, task-dependent, culturally variable, and not a diagnostic test for autism.',
    reason: 'Removed a fixed age milestone and diagnostic-style autism claim.',
  }],
  ["Name Erikson's crisis for adolescence.", {
    back: 'Erikson described adolescence primarily in terms of identity versus role confusion: exploring and integrating commitments into a coherent sense of self. The stage is a broad psychosocial framework, not a fixed age deadline or a diagnostic account of identity development.',
    reason: 'Removed rigid ages and success/failure language from a historical stage model.',
  }],
  ['Piaget vs. Vygotsky: key differences', {
    back: 'Piaget emphasized children\'s active construction of knowledge and broad developmental changes in reasoning. Vygotsky emphasized culturally organized activity, language, social guidance, and learning within the zone of proximal development. The contrast is useful, but neither theory reduces to individual versus social learning alone.',
    reason: 'Removed slogans that overstated opposition between the two developmental theories.',
  }],
  ['Adaptive testing (CAT)', {
    back: 'Computerized adaptive testing uses an item-selection algorithm, often based on item response theory, to choose informative next items from an eligible pool. Selection depends on the algorithm and constraints, not simply correct means harder and incorrect means easier; adaptive designs can improve efficiency while requiring strong calibration and security controls.',
    reason: 'Replaced the simplistic staircase description and removed current-exam examples.',
  }],
  ["What is Cronbach's alpha?", {
    back: 'Cronbach\'s alpha is an index of internal consistency under assumptions about item relationships. It is influenced by test length and dimensionality and does not by itself prove that a scale is unidimensional, reliable for every use, or valid; acceptable values depend on the intended interpretation and stakes.',
    reason: 'Removed a universal .70 cutoff and added interpretation limits.',
  }],
  ['Criterion-referenced vs. norm-referenced tests', {
    back: 'Criterion-referenced interpretations compare performance with a defined content standard or performance level. Norm-referenced interpretations compare performance with a specified reference group. A test can support one or both interpretations when appropriate validity evidence exists.',
    reason: 'Removed an unofficial EPPP score example and clarified that the distinction concerns interpretations.',
  }],
  ['Reliability types comparison', {
    back: 'Test-retest evidence addresses score stability over time; alternate-forms evidence addresses equivalence across forms; internal-consistency indices address relationships among items; and interrater evidence addresses scoring agreement. The evidence required and acceptable precision depend on the score use and consequences, not one universal cutoff.',
    reason: 'Removed a universal clinical reliability threshold and clarified what each estimate addresses.',
  }],
  ['Neuropsychological screening vs. comprehensive battery', {
    back: 'A cognitive screen is a brief tool used to identify whether fuller evaluation may be warranted. A comprehensive neuropsychological evaluation integrates history, interview, behavior, validity evidence, and multiple measures chosen for the referral question; it is not defined by administering one fixed named battery.',
    reason: 'Removed an outdated fixed-battery contrast and emphasized referral-driven evaluation.',
  }],
  ['The Dodo bird verdict', {
    back: 'The Dodo bird debate asks whether bona fide psychotherapies tend to have broadly similar average outcomes and how much change is associated with common versus treatment-specific factors. Findings depend on the disorder, treatment comparison, outcome, study quality, and analytic method; equivalence is not a universal verdict.',
    reason: 'Reframed a contested research debate and removed an equivalence overclaim.',
  }],
  ['What is systematic desensitization?', {
    back: 'Systematic desensitization is a behavioral procedure that combines a graduated fear hierarchy with relaxation or another response while the learner encounters feared cues. It is historically linked to reciprocal inhibition and exposure learning; relaxation and anxiety are not literally mutually exclusive.',
    reason: 'Removed the false claim that anxiety and relaxation cannot co-occur.',
  }],
  ['Motivational Interviewing core principles', {
    back: 'Motivational interviewing is a collaborative, person-centered method for strengthening motivation and commitment to change. Its spirit emphasizes partnership, acceptance, compassion, and evocation; practice uses engaging, focusing, evoking, and planning rather than confronting or labeling resistance.',
    reason: 'Updated legacy roll-with-resistance terminology to the current MI spirit and process framework.',
  }],
  ['Psychoanalytic defense mechanisms', {
    back: 'Defense mechanisms are largely unconscious ways of managing conflict or distress in psychodynamic theory. Common examples include denial, projection, displacement, rationalization, reaction formation, suppression, and sublimation; maturity groupings vary by theorist and should not be treated as a single fixed taxonomy.',
    reason: 'Removed a rigid, mixed taxonomy and identified its theoretical context.',
  }],
  ['Therapeutic alliance', {
    back: 'Bordin described the therapeutic alliance in terms of agreement on goals, agreement on tasks, and an affective bond. Alliance measures are associated with psychotherapy outcome across approaches, but the size and causal interpretation of that association vary across studies.',
    reason: 'Removed an unsupported fixed variance estimate and added the correlational-evidence limit.',
  }],
  ['Emotion-Focused Therapy (EFT)', {
    back: 'Emotion-focused approaches use experiential methods to help clients identify, experience, regulate, and transform emotion. Greenberg\'s individual emotion-focused therapy and Johnson\'s emotionally focused couple therapy are related but distinct models and should not be collapsed into one protocol or one evidence claim.',
    reason: 'Separated two distinct EFT traditions and removed a broad effectiveness claim.',
  }],
  ['Hawthorne effect', {
    back: 'The Hawthorne effect is a broad label for behavior change attributed to awareness of observation or study participation. It is best treated as a possible reactivity or measurement concern rather than a single established mechanism that automatically explains change.',
    reason: 'Removed a deterministic and historically oversimplified explanation.',
  }],
  ['What is an ABA design?', {
    back: 'An ABA single-case design measures baseline, introduces an intervention, and then withdraws it to examine whether behavior changes systematically with the phase. Stronger inference requires repeated measurement, clear phase change, control of alternatives, and replication; withdrawal may be unethical or irreversible for some outcomes.',
    reason: 'Added design requirements and limits on causal and ethical interpretation.',
  }],
  ["Cohen's effect size benchmarks", {
    back: 'Cohen offered conventional reference points such as d values of about .20, .50, and .80 and correlations of about .10, .30, and .50 for small, medium, and large effects. They are context-dependent heuristics, not universal thresholds; interpretation should use domain knowledge, uncertainty, and practical consequences.',
    reason: 'Labeled conventional benchmarks as context-dependent heuristics.',
  }],
  ['Random assignment vs. random sampling', {
    back: 'Random assignment uses chance to place study units into conditions and supports causal inference by balancing confounders in expectation. Random sampling uses a probability method to select units from a target population and supports generalization when sampling and nonresponse assumptions are met. Neither guarantees equal groups or perfect representativeness.',
    reason: 'Corrected the claim that random assignment distributes participants equally and added inferential limits.',
  }],
  ['Correlation does NOT imply causation', {
    back: 'A correlation alone does not identify a causal direction and may reflect reverse causation, confounding, selection, measurement, or chance. Randomized experiments can strengthen causal inference when well implemented, while some nonexperimental designs can also support causal conclusions under explicit assumptions.',
    reason: 'Removed the claim that only randomized experiments can ever support causal inference.',
  }],
  ['What is a confounding variable?', {
    back: 'A confounder is associated with both an exposure or predictor and an outcome in a way that can create or distort an estimated relationship. Design and analysis can reduce confounding, but the appropriate strategy depends on the causal structure; random assignment balances measured and unmeasured confounders in expectation.',
    reason: 'Removed a reductive demographic example and clarified the causal role of confounding.',
  }],
  ['What increases statistical power?', {
    back: 'Power generally increases with larger sample size, larger true effect, more precise measurement, lower unexplained variability, and an analysis suited to the design. Raising alpha can increase power but also raises Type I error risk, so it is not a free improvement; assumptions and multiplicity also matter.',
    reason: 'Added the Type I error tradeoff and removed a one-size-fits-all within-subjects rule.',
  }],
  ['What is the difference between a boundary crossing and violation?', {
    back: 'A boundary crossing is a departure from customary professional boundaries that may be benign, helpful, or harmful depending on context. A boundary violation exploits or harms the client or seriously risks the professional relationship. Labels do not replace analysis of power, culture, alternatives, documentation, and foreseeable effects.',
    reason: 'Removed an example that could be misread as automatically acceptable and added contextual risk analysis.',
  }],
  ['Competence boundaries', {
    back: 'APA Ethics Code Standard 2.01 requires psychologists to provide services, teach, and conduct research within boundaries of competence based on education, training, supervised experience, consultation, study, or professional experience. New areas may require relevant preparation; emergency and emerging-area provisions have specific limits.',
    reason: 'Aligned the summary more closely with the standard and avoided one mandatory path for every new area.',
  }],
  ['Supervision models in psychology', {
    front: 'What should competency-based clinical supervision address?',
    back: 'Competency-based supervision should establish roles and expectations, attend to the supervisory relationship and diversity, use direct observation and other appropriate evidence, provide formative and summative feedback, document decisions, and protect client welfare. Named developmental models may organize practice, but they are not themselves ethical requirements.',
    reason: 'Replaced an unsupported model list with content directly aligned to APA clinical-supervision guidelines.',
  }],
  ['Ethics of assessment with diverse populations', {
    back: 'Ethical assessment requires evidence that a measure and its interpretation are appropriate for the purpose and population, attention to language, disability, culture, and testing context, qualified use of interpreters when needed, and clear reporting of limitations. Group membership alone does not establish that a test is valid or invalid for one person.',
    reason: 'Removed unsupported categorical interpreter and norm rules and focused on evidence, context, and limitations.',
  }],
  ['Dual relationship with student scenario', {
    back: 'Providing therapy to a student one evaluates or supervises creates overlapping roles and substantial risks to objectivity, consent, confidentiality, and exploitation. The psychologist should normally avoid the arrangement and facilitate an appropriate alternative, while considering access, emergencies, applicable policy, and documentation rather than treating a vignette as a universal legal rule.',
    reason: 'Preserved the ethical concern while removing a categorical rule unsupported by all contexts or jurisdictions.',
  }],
  ['What are the two divisions of the nervous system?', {
    back: 'The nervous system is commonly divided into the central nervous system, comprising the brain and spinal cord, and the peripheral nervous system, comprising neural structures outside them. The peripheral system includes somatic, autonomic, and enteric components; these labels describe organization rather than fully independent systems.',
    reason: 'Added the enteric component and avoided treating organizational subdivisions as exhaustive independent systems.',
  }],
  ['Gate Control Theory of pain', {
    back: 'Gate control theory proposes that spinal cord mechanisms modulate nociceptive signaling before it contributes to pain experience, with descending brain processes also influencing modulation. Attention, expectation, emotion, and competing sensory input can affect pain, but the gate is a functional model rather than a literal switch.',
    reason: 'Removed a literal open-or-close gate metaphor and an unsupported treatment-basis claim.',
  }],
  ['What is the biopsychosocial model?', {
    back: 'The biopsychosocial model examines health and illness through interacting biological, psychological, behavioral, and social influences. It broadens rather than simply replaces biomedical analysis, and the relevant influences and their weights depend on the person, condition, and question.',
    reason: 'Removed the claim that one model replaced biomedicine and added case-specific interaction limits.',
  }],
  ['What is the difference between positive and negative reinforcement?', {
    back: 'Both positive and negative reinforcement increase the future probability of a behavior in a particular context. Positive reinforcement presents a stimulus after the behavior; negative reinforcement removes or reduces a stimulus. Positive and negative refer to adding and subtracting, not pleasant and unpleasant.',
    reason: 'Corrected the common but inaccurate pleasant-versus-aversive definition.',
  }],
  ['Encoding specificity principle (Tulving)', {
    back: 'The encoding specificity principle proposes that retrieval is facilitated when cues available at test overlap with information encoded with the memory. Context- and state-dependent effects are examples, but matching context does not guarantee retrieval and mismatch does not make retrieval impossible.',
    reason: 'Replaced a best-when rule with a cue-overlap principle and explicit limits.',
  }],
  ['What is the availability heuristic?', {
    back: 'The availability heuristic is judging frequency or probability partly by how readily examples come to mind. Ease of recall can be informative, but salience, recency, media exposure, and personal experience can make availability diverge from actual frequency.',
    reason: 'Removed a stock risk-comparison example and clarified when accessibility can bias judgment.',
  }],
  ['Social identity theory (Tajfel)', {
    back: 'Social identity theory proposes that people can define part of the self through group memberships and compare in-groups with out-groups. Categorization, identification, status, and comparison can contribute to in-group favoritism, but favoritism and self-esteem effects depend on context and are not inevitable.',
    reason: 'Changed universal self-esteem and favoritism claims into contextual theoretical predictions.',
  }],
  ["Sternberg's triangular theory of love", {
    back: 'Sternberg\'s triangular theory describes love using intimacy, passion, and commitment. Different combinations are labeled liking, infatuated, empty, romantic, companionate, fatuous, or consummate love. These are theoretical descriptions, not diagnostic categories or a required sequence for relationships.',
    reason: 'Labeled the combinations as a theory and removed implied categorical certainty.',
  }],
  ['Elaboration Likelihood Model (Petty & Cacioppo)', {
    back: 'The elaboration likelihood model describes persuasion along a continuum. Greater motivation and ability support more careful processing of message-relevant information; lower elaboration gives relatively more influence to simple cues. Attitudes based on greater elaboration often, but not invariably, show more persistence and resistance.',
    reason: 'Replaced a strict two-route and lasting-versus-temporary dichotomy with a continuum and probabilistic outcomes.',
  }],
  ['What is groupthink (Janis)?', {
    back: 'Groupthink is Janis\'s model of flawed group decision making in which pressures for concurrence can suppress critical evaluation. Proposed signs include self-censorship, perceived unanimity, and mindguards; cohesion alone is insufficient, and structured dissent, outside input, and independent review can reduce risk.',
    reason: 'Clarified that cohesion alone does not cause groupthink and framed symptoms as proposed indicators.',
  }],
  ['Gender schema theory (Bem)', {
    back: 'Gender schema theory proposes that people learn culturally available gender categories and use them to organize some information about self and others. Which schemas are learned, how strongly they guide attention or memory, and how flexibly they are applied vary across people and contexts.',
    reason: 'Removed universal child effects and binary assumptions from the legacy summary.',
  }],
  ["Harlow's contact comfort experiments", {
    back: 'In historically influential studies, infant rhesus monkeys often sought contact with a soft surrogate even when a wire surrogate provided milk. The findings challenged simple drive-reduction accounts of attachment, but animal welfare concerns and limits on generalizing from this paradigm must be acknowledged.',
    reason: 'Added ethical and generalization limits to a historical animal study.',
  }],
  ['What is the Zone of Proximal Development?', {
    back: 'Vygotsky described the zone of proximal development as the range between what a learner can do independently and what the learner can accomplish with capable guidance or collaboration. Scaffolding is a later instructional term often used to describe temporary support within that range.',
    reason: 'Distinguished Vygotsky\'s construct from the later scaffolding terminology.',
  }],
  ['Adolescent egocentrism (Elkind)', {
    back: 'Elkind used adolescent egocentrism to describe constructs such as the imaginary audience and personal fable during developing perspective taking. They are historical theoretical ideas with variable empirical support and should not be treated as universal stages or direct causes of risk behavior.',
    reason: 'Removed a fixed peak and causal risk-taking claim.',
  }],
  ["Marcia's identity statuses", {
    back: 'Marcia\'s identity-status model crosses exploration with commitment: diffusion reflects low exploration and commitment, foreclosure commitment without substantial exploration, moratorium active exploration without settled commitment, and achievement commitment following exploration. Statuses can differ by life domain and can change over time.',
    reason: 'Removed a stereotyped family example and clarified that statuses are domain-specific and changeable.',
  }],
  ["What is Carstensen's socioemotional selectivity theory?", {
    back: 'Socioemotional selectivity theory proposes that perceived time horizons shift goal priorities: expansive horizons favor knowledge-oriented goals, while limited horizons favor emotionally meaningful goals and relationships. It helps explain some age-related patterns but does not mean every older adult has a smaller network or a positivity bias.',
    reason: 'Removed a universal aging trajectory and an unsupported life-satisfaction explanation.',
  }],
  ['What is incremental validity?', {
    back: 'Incremental validity asks whether a new measure improves an intended prediction or decision beyond information already available. The size and value of that increment must be weighed against uncertainty, burden, fairness, cost, and consequences; statistical increment alone does not justify use.',
    reason: 'Removed the claim that incremental prediction automatically justifies added assessment.',
  }],
  ['Sensitivity vs. specificity', {
    back: 'Sensitivity is the proportion of people with the target condition who test positive; specificity is the proportion without it who test negative. Their practical meaning depends on the threshold, population base rate, consequences of errors, and predictive values, so high sensitivity alone does not make a screen sufficient.',
    reason: 'Added threshold, base-rate, and error-cost context.',
  }],
  ['Achievement vs. aptitude tests', {
    back: 'Achievement interpretations emphasize demonstrated learning in a defined content domain. Aptitude interpretations emphasize prediction of future learning or performance. Both reflect prior opportunities and learned skills, so the distinction concerns intended interpretation and evidence rather than pure learned ability versus innate potential.',
    reason: 'Removed branded examples and the misleading learned-versus-potential dichotomy.',
  }],
  ['Validity types: Criterion vs. construct vs. content', {
    front: 'How are content, criterion, and construct evidence used in validity arguments?',
    back: 'Modern testing standards treat validity as a unitary evaluation of evidence for an intended score interpretation and use. Evidence may come from test content, relationships with external variables or criteria, internal structure, response processes, and consequences. These are sources of evidence, not three independent properties that a test simply possesses.',
    reason: 'Updated the legacy three-types taxonomy to the unified validity framework in current testing standards.',
  }],
  ['What is the Standard Error of Measurement?', {
    back: 'In classical test theory, the standard error of measurement estimates the standard deviation of measurement errors for scores in a population. Under common assumptions it is SD times the square root of one minus reliability; a confidence interval also requires a stated confidence level and assumptions and is not a certainty about one fixed true score.',
    reason: 'Distinguished an error standard deviation from a confidence interval and stated the model assumptions.',
  }],
  ['Standard scores: z, T, IQ, stanine', {
    back: 'A z score has a reference mean of 0 and standard deviation of 1; a T score commonly uses 50 and 10; many IQ scales use 100 and 15; stanines divide a reference distribution into nine broad categories. Exact conversions and percentile interpretations depend on the norming method and distribution, not an automatic normal-curve rule.',
    reason: 'Removed the false claim that every score is derived from a normal curve and that conversion is always exact.',
  }],
  ['Stages of Change model', {
    back: 'The transtheoretical model describes precontemplation, contemplation, preparation, action, and maintenance as patterns of readiness for change. Movement can be nonlinear and definitions vary by behavior; the model can guide questions about readiness but should not mechanically assign one intervention to every person in a stage.',
    reason: 'Removed a fixed sequence and automatic stage-matching rule.',
  }],
  ['Empty chair technique', {
    back: 'The empty-chair technique is an experiential exercise associated with Gestalt and emotion-focused therapies in which a client addresses an imagined person or part of self. Its purpose and pacing depend on the formulation, client consent, culture, and emotional safety; it is not appropriate merely because expression is difficult.',
    reason: 'Added clinical context and removed guaranteed integration or awareness outcomes.',
  }],
  ["Bowen's eight interlocking concepts", {
    back: 'Bowen family systems theory describes differentiation of self, triangles, the nuclear-family emotional system, family projection, multigenerational transmission, emotional cutoff, sibling position, and societal emotional process. These are constructs within one family-systems model, not independently established laws of family functioning.',
    reason: 'Labeled the eight concepts as theory-specific rather than settled mechanisms.',
  }],
  ['Play therapy modalities', {
    back: 'Play therapy includes approaches that vary in therapist direction and theoretical orientation, including child-centered, cognitive-behavioral, filial, and expressive methods. Selection should reflect developmental level, goals, evidence, culture, training, consent, and safety; play is a useful communication medium but not a universal natural language.',
    reason: 'Removed a universal slogan and added selection and competence considerations.',
  }],
  ['What is the therapeutic frame?', {
    back: 'The therapeutic frame is the agreed structure for treatment, such as roles, setting, timing, communication, fees, privacy limits, and boundaries. Consistency can support predictability, while clinically or culturally appropriate changes should be considered deliberately, discussed, and documented rather than assumed harmful.',
    reason: 'Added consent and cultural context and removed a categorical frame-violation claim.',
  }],
  ['Structural family therapy (Minuchin)', {
    back: 'Structural family therapy conceptualizes interaction through family organization, subsystems, hierarchy, and boundaries. Techniques associated with the model include joining, observing or eliciting enactments, boundary making, and unbalancing. These are theory-specific formulations and require contextual and cultural judgment.',
    reason: 'Removed value-laden shorthand and identified the concepts as model-specific.',
  }],
  ['What is a meta-analysis?', {
    back: 'Meta-analysis uses statistical methods to synthesize effect estimates from multiple studies addressing a defined question. Conclusions depend on search and inclusion methods, study quality, effect comparability, heterogeneity, model choice, and reporting bias; pooling does not automatically resolve weaknesses in the underlying evidence.',
    reason: 'Added the major validity conditions missing from the one-line definition.',
  }],
  ['Internal vs. external validity', {
    back: 'Internal validity concerns whether a study supports its causal or explanatory inference; external validity concerns how findings apply across people, settings, treatments, measures, and times. Random assignment can strengthen causal inference, while representative sampling can support some generalizations, but neither form of validity reduces to one design feature or an inevitable tradeoff.',
    reason: 'Removed one-feature definitions and an inevitable tradeoff claim.',
  }],
  ['Types of research validity', {
    back: 'Common validity concerns include internal validity, external validity, construct validity, and statistical-conclusion validity. Their relevance and priority depend on the research question and intended inference; strengthening one concern does not guarantee the others, and not every study aims to make every kind of inference.',
    reason: 'Removed the claim that every study requires all four forms equally.',
  }],
  ['Within-subjects vs. between-subjects', {
    back: 'Within-subjects designs expose the same units to multiple conditions and can improve precision by controlling stable individual differences, but may introduce order, carryover, or attrition effects. Between-subjects designs use different units in conditions and avoid carryover but require attention to group comparability. Power depends on the full design and correlation structure.',
    reason: 'Replaced the unconditional more-power claim with design-specific benefits and risks.',
  }],
  ['Quasi-experimental vs. true experimental design', {
    back: 'Randomized experiments assign units to conditions by chance and can provide strong causal evidence when implementation, measurement, and analysis are sound. Quasi-experimental designs lack random assignment but use design and analytic strategies such as interrupted time series or comparison groups; credible causal strength depends on assumptions and execution, not the label alone.',
    reason: 'Removed the blanket weaker-causal-claims hierarchy and emphasized design assumptions.',
  }],
]);
