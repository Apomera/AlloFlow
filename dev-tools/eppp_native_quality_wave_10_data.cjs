'use strict';

module.exports = {
  "reviewedAt": "2026-07-23",
  "reviewWave": "eppp-native-quality-wave-10",
  "warningCountsBefore": {
    "totalItems": 1500,
    "warningOnly": true,
    "forbiddenAggregateChoices": 0,
    "uniqueKeyStemLexicalLeakageCandidates": 168,
    "asymmetricExtremeDistractorCandidates": 346,
    "advancedDirectRecallCandidates": 24,
    "semanticConceptDuplicatePairs": 303,
    "semanticConceptDuplicateClusters": 130,
    "editorialAnchorsWithActiveWarnings": 5,
    "editorialAnchorsWithNoCurrentWarning": 5,
    "priorityDocketItems": 20
  },
  "revisions": [
    {
      "id": "eppp-b024-assessment-3",
      "expectedActionRank": 1,
      "expectedAnswerIndex": 2,
      "expectedPrompt": "The Halstead-Reitan Neuropsychological Battery was developed primarily to evaluate:",
      "prompt": "A client with possible cerebral dysfunction completes a fixed battery containing the Category Test, Tactual Performance Test, Speech Sounds Perception Test, Finger Tapping Test, and Trail Making Test. What is the most appropriate interpretive use of the combined results?",
      "choices": [
        "Use the performance profile mainly to quantify academic achievement and select grade-level instructional goals",
        "Treat the lowest performance score as a stand-alone locator of the damaged brain region",
        "Integrate the pattern and overall level across sensory, motor, and cognitive measures when evaluating neuropsychological functioning",
        "Convert the performance scores into an informant rating of independence in communication, socialization, and daily living"
      ],
      "rationale": "This fixed-battery approach is interpreted through the pattern and level of performance across measures sampling sensory-perceptual, motor, attention, and other cognitive functions. The profile may contribute evidence about neuropsychological impairment, but a single low score does not independently localize a lesion or establish a diagnosis.",
      "choiceRationales": [
        "Achievement testing addresses learned academic skills and curriculum-relevant performance. The described battery instead combines multiple sensory, motor, and cognitive tasks to examine a neuropsychological pattern rather than grade-level mastery.",
        "A low score can reflect many influences and should be interpreted within the broader profile, norms, history, and clinical context. Treating one result as a direct anatomical locator overstates what the battery supports.",
        "This fixed-battery approach is interpreted through the pattern and level of performance across measures sampling sensory-perceptual, motor, attention, and other cognitive functions. The profile may contribute evidence about neuropsychological impairment, but a single low score does not independently localize a lesion or establish a diagnosis.",
        "Adaptive behavior ratings use reports about everyday functioning across practical domains. They do not transform a standardized neuropsychological performance profile into an informant-based measure of daily independence."
      ],
      "references": [
        "https://doi.org/10.1007/978-1-4757-9825-3"
      ],
      "sourceDetails": [
        {
          "url": "https://doi.org/10.1007/978-1-4757-9825-3",
          "title": "The Halstead-Reitan Neuropsychological Test Battery: Theory and Clinical Interpretation",
          "organization": "Springer Nature",
          "summary": "Reitan and Wolfson describe the fixed battery, its component measures, and a profile-based interpretive framework for examining patterns and levels of neuropsychological performance associated with cerebral dysfunction.",
          "credibility": "This DOI identifies the authoritative Springer monograph by the principal developers and interpreters of the battery. It is a primary technical source for the battery composition and intended profile-based clinical interpretation."
        }
      ],
      "sourceCheck": "The Reitan and Wolfson technical monograph supports interpretation of the fixed battery through patterns and levels across component tests, while emphasizing integrated clinical interpretation rather than lesion claims from a single score.",
      "learningObjectiveId": "assessment-fixed-battery-profile-interpretation",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "achievement-purpose-substitution",
        "single-score-localization-overreach",
        "adaptive-rating-method-substitution"
      ]
    },
    {
      "id": "eppp-b015-professional-1",
      "expectedActionRank": 2,
      "expectedAnswerIndex": 1,
      "expectedPrompt": "How do APA General Principles differ from Ethical Standards?",
      "prompt": "An APA ethics complaint cites Principle A, Beneficence and Nonmaleficence, but does not identify a numbered conduct requirement. How should the distinction affect adjudication?",
      "choices": [
        "Conclude that citing a broad professional value carries the same adjudicatory status as identifying a numbered conduct requirement",
        "Use the concern to guide professional reflection, while basing a formal violation on an applicable numbered requirement",
        "Dismiss the concern because broad professional values have no role once minimum conduct requirements have been considered",
        "Refer the issue to a court because broad professional values can be interpreted as legal duties rather than ethical guidance"
      ],
      "rationale": "The Code presents its broad professional values as goals that guide psychologists toward high ideals, but they are not themselves rules used as the basis for sanctions. An APA ethics violation must be tied to an applicable numbered conduct requirement, while the broader value can still inform reflection and responsible judgment.",
      "choiceRationales": [
        "The Code gives broad values an important guiding role, but it does not give them the same adjudicatory function as numbered conduct requirements. Treating the two sections as interchangeable would erase the Code's stated distinction.",
        "The Code presents its broad professional values as goals that guide psychologists toward high ideals, but they are not themselves rules used as the basis for sanctions. An APA ethics violation must be tied to an applicable numbered conduct requirement, while the broader value can still inform reflection and responsible judgment.",
        "A value such as Beneficence and Nonmaleficence remains relevant to professional deliberation even when conduct meets minimum requirements. Its nonadjudicatory status does not make it irrelevant to ethical reflection.",
        "Ethical guidance and legal duties are distinct sources of obligation. A court referral does not resolve the Code's internal distinction between values that orient professional conduct and requirements used in APA adjudication."
      ],
      "references": [
        "https://www.apa.org/science/programs/research/codes.html"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/science/programs/research/codes.html",
          "title": "Professional Codes of Conduct",
          "summary": "The APA explains that broad ethical principles are aspirational goals, whereas enforceable standards establish rules whose violation can support sanctions or other adjudicatory action.",
          "credibility": "This official American Psychological Association page directly explains the distinction between aspirational principles and enforceable standards. It is an authoritative organizational source for how APA structures professional ethics guidance and adjudication.",
          "organization": "American Psychological Association"
        }
      ],
      "sourceCheck": "The official APA Code states that the broad principles are goals intended to guide psychologists toward the profession's highest ideals and, unlike the numbered requirements, are not obligations or bases for sanctions.",
      "learningObjectiveId": "professional-ethics-adjudication-versus-guidance",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "equal-adjudicatory-status-error",
        "guidance-irrelevance-error",
        "law-ethics-conflation"
      ]
    },
    {
      "id": "eppp-b023-professional-1",
      "expectedActionRank": 3,
      "expectedAnswerIndex": 0,
      "expectedPrompt": "Under the APA Ethics Code, the General Principles are best understood as:",
      "prompt": "After confirming that two consultation plans satisfy the numbered conduct requirements, a psychologist considers Beneficence, Fidelity, Integrity, Justice, and Respect for Rights and Dignity. What is the purpose of that additional step?",
      "choices": [
        "Orient professional judgment toward the field's highest ideals when conduct requirements leave room for a choice",
        "Create a separate disciplinary charge even when neither plan implicates a conduct requirement",
        "Replace analysis of law, regulation, and institutional policy with the psychologist's personal moral preference",
        "Restrict ethical deliberation to research roles rather than clinical, teaching, or consultation work"
      ],
      "rationale": "The five broad values are intended to orient psychologists toward the profession's highest ideals. They can help choose among otherwise permissible actions and encourage conduct above the disciplinary floor, but they do not create a separate sanctionable charge or replace analysis of law and policy.",
      "choiceRationales": [
        "The five broad values are intended to orient psychologists toward the profession's highest ideals. They can help choose among otherwise permissible actions and encourage conduct above the disciplinary floor, but they do not create a separate sanctionable charge or replace analysis of law and policy.",
        "The values guide ethical judgment but are not independent obligations used as grounds for sanctions. A disciplinary finding would require an applicable numbered conduct requirement rather than a value standing alone.",
        "Professional values supplement rather than displace analysis of legal, regulatory, institutional, and contextual duties. Personal preference is not a substitute for identifying the obligations relevant to the consultation.",
        "The Code applies across psychologists' professional roles, including clinical, educational, research, supervisory, and consultative work. The guiding values are not confined to research decisions."
      ],
      "references": [
        "https://www.apa.org/science/programs/research/codes.html"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/science/programs/research/codes.html",
          "title": "Professional Codes of Conduct",
          "summary": "The APA explains that broad ethical principles are aspirational goals, whereas enforceable standards establish rules whose violation can support sanctions or other adjudicatory action.",
          "credibility": "This official American Psychological Association page directly explains the distinction between aspirational principles and enforceable standards. It is an authoritative organizational source for how APA structures professional ethics guidance and adjudication.",
          "organization": "American Psychological Association"
        }
      ],
      "sourceCheck": "The official APA Code identifies five broad principles as goals that guide psychologists toward the profession's highest ideals, supporting their use when compliant options still require professional ethical judgment.",
      "learningObjectiveId": "professional-values-beyond-minimum-compliance",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "independent-sanction-error",
        "personal-preference-substitution",
        "role-scope-restriction"
      ]
    },
    {
      "id": "eppp-v2-assessment-028",
      "expectedActionRank": 4,
      "expectedAnswerIndex": 0,
      "expectedPrompt": "Complete the statement: The standard error of estimate (SEE) is used in:",
      "prompt": "A regression model predicts practicum ratings from selection scores. Its output reports a residual standard deviation of 5.8 rating points. Which interpretation is most accurate?",
      "choices": [
        "Observed ratings tend to scatter around model-predicted ratings with a residual spread of about 5.8 points",
        "The residual statistic gives each observed rating a reliability-based true-score band of plus or minus 5.8 points",
        "A one-point increase in the selection score raises the model-predicted rating by 5.8 points",
        "The model accounts for 5.8 percent of the variance in observed practicum ratings"
      ],
      "rationale": "The residual standard deviation summarizes the typical vertical spread of observed criterion values around the regression function, in the criterion's units. Here it indicates prediction errors on the order of 5.8 rating points; it is not the slope, the proportion of explained variance, or a reliability-based standard error of measurement.",
      "choiceRationales": [
        "The residual standard deviation summarizes the typical vertical spread of observed criterion values around the regression function, in the criterion's units. Here it indicates prediction errors on the order of 5.8 rating points; it is not the slope, the proportion of explained variance, or a reliability-based standard error of measurement.",
        "A true-score band based on score reliability concerns the standard error of measurement. The reported regression residual instead describes discrepancy between observed criterion values and values predicted by the fitted model.",
        "Change in the predicted criterion for a one-unit predictor increase is represented by a regression coefficient. The residual spread describes prediction error around the fitted function rather than the slope of that function.",
        "Explained variance is represented by a statistic such as R-squared. A residual spread expressed in rating points retains the criterion's units and cannot be read as a percentage of variance explained."
      ],
      "references": [
        "https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd431.htm"
      ],
      "sourceDetails": [
        {
          "url": "https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd431.htm",
          "title": "4.4.3.1 Least Squares - NIST/SEMATECH e-Handbook of Statistical Methods",
          "organization": "National Institute of Standards and Technology",
          "summary": "The NIST handbook derives least-squares estimation and defines the estimated error-term standard deviation from the residual sum of squares and residual degrees of freedom, describing it as the residual standard deviation.",
          "credibility": "NIST is the United States national measurement institute. Its statistical engineering handbook is a government technical reference authored for rigorous applied modeling and directly documents the regression quantity used here."
        }
      ],
      "sourceCheck": "The NIST least-squares chapter defines the error-term estimate as the square root of residual sum of squares over residual degrees of freedom and explains that it describes response variation around the fitted regression function.",
      "learningObjectiveId": "assessment-regression-residual-spread-interpretation",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "sem-confusion",
        "slope-confusion",
        "r-squared-confusion"
      ]
    },
    {
      "id": "eppp-v3-social-cultural-015",
      "expectedActionRank": 5,
      "expectedAnswerIndex": 2,
      "expectedPrompt": "In-group bias (in-group favoritism) refers to:",
      "prompt": "Participants are assigned by coin flip to Blue or Green. They privately divide points between two strangers and consistently give slightly more to a recipient who shares their assigned color. Which process is most directly illustrated?",
      "choices": [
        "Realistic conflict produced by competition over a scarce material resource",
        "Perceiving members of the other category as more similar to one another than they are",
        "Favoritism toward people categorized as belonging to the same group",
        "Explaining another person's allocation by character while discounting the situational instructions"
      ],
      "rationale": "The allocation pattern demonstrates preferential treatment of people categorized as members of one's own group. Minimal-group research shows that even arbitrary classification can be sufficient for own-group favoritism, so prior hostility or meaningful competition is not required for this pattern.",
      "choiceRationales": [
        "Realistic conflict theory concerns competition over valued scarce resources. The categories here were arbitrary, and the pattern is preferential allocation by shared category rather than a response to an established material conflict.",
        "Outgroup homogeneity concerns perceiving members of another category as unusually alike. The behavior described is unequal allocation favoring a shared category, not a judgment about variability among other-category members.",
        "The allocation pattern demonstrates preferential treatment of people categorized as members of one's own group. Minimal-group research shows that even arbitrary classification can be sufficient for own-group favoritism, so prior hostility or meaningful competition is not required for this pattern.",
        "The fundamental attribution error involves overemphasizing dispositional explanations for another person's behavior. The scenario instead reports the participant's own allocation pattern as a function of an arbitrary shared label."
      ],
      "references": [
        "https://doi.org/10.1002/ejsp.2420010202"
      ],
      "sourceDetails": [
        {
          "url": "https://doi.org/10.1002/ejsp.2420010202",
          "title": "Social Categorization and Intergroup Behaviour",
          "organization": "European Journal of Social Psychology",
          "summary": "Tajfel, Billig, Bundy, and Flament report minimal-group experiments in which arbitrary classification influenced allocation of real rewards, including choices favoring one's assigned category over another category.",
          "credibility": "This DOI identifies the peer-reviewed foundational minimal-group experiment published by Wiley in the European Journal of Social Psychology, making it a primary empirical source for the allocation effect tested."
        }
      ],
      "sourceCheck": "The foundational minimal-group experiments found that arbitrary categorization influenced distributions of real rewards and produced preference for one's assigned category, directly supporting the applied allocation scenario.",
      "learningObjectiveId": "social-cultural-minimal-group-allocation-bias",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "realistic-conflict-substitution",
        "outgroup-homogeneity-substitution",
        "attribution-error-substitution"
      ]
    },
    {
      "id": "eppp-v2-intervention-032",
      "expectedActionRank": 6,
      "expectedAnswerIndex": 1,
      "expectedPrompt": "Complete the statement: Acceptance and Commitment Therapy (ACT) differs from traditional CBT primarily in that ACT:",
      "prompt": "A client becomes entangled with the thought \"I am a failure\" and spends each session debating whether it is literally true. A therapist working from a psychological-flexibility model would most likely:",
      "choices": [
        "Compile evidence against the thought and replace it with a more accurate self-statement before the client resumes valued activity",
        "Practice noticing the thought as a mental event, make room for discomfort, and take a small action linked to a chosen value",
        "Use relaxation until the thought becomes less frequent, then postpone meaningful activity until distress declines",
        "Arrange external rewards for target behavior while leaving the relationship between thoughts and values outside the treatment plan"
      ],
      "rationale": "A psychological-flexibility intervention would use defusion and acceptance to alter the function of the thought rather than making successful thought replacement a prerequisite for action. The client practices noticing the thought, allowing discomfort, clarifying values, and taking committed action in the thought's presence.",
      "choiceRationales": [
        "Evaluating evidence and replacing a maladaptive cognition is characteristic of cognitive restructuring. It can be useful in other approaches, but it does not capture the defusion-and-values process highlighted by this model.",
        "A psychological-flexibility intervention would use defusion and acceptance to alter the function of the thought rather than making successful thought replacement a prerequisite for action. The client practices noticing the thought, allowing discomfort, clarifying values, and taking committed action in the thought's presence.",
        "Relaxation may reduce arousal, but making valued activity contingent on lower distress reinforces symptom control as the gate for action. The model instead supports willingness and meaningful action in the presence of discomfort.",
        "Contingency management can shape observable behavior, but excluding the client's relationship to thoughts and chosen values omits the defusion, acceptance, and committed-action processes central to this formulation."
      ],
      "references": [
        "https://doi.org/10.1016/j.brat.2005.06.006"
      ],
      "sourceDetails": [
        {
          "url": "https://doi.org/10.1016/j.brat.2005.06.006",
          "title": "Acceptance and Commitment Therapy: Model, Processes and Outcomes",
          "organization": "Behaviour Research and Therapy",
          "summary": "Hayes and colleagues present the treatment model and review evidence concerning psychological flexibility, acceptance, cognitive defusion, values, and committed action as linked processes of behavior change.",
          "credibility": "This DOI identifies the peer-reviewed model and process review authored by central developers of the intervention and published in Behaviour Research and Therapy, a primary scholarly source for the tested distinction."
        }
      ],
      "sourceCheck": "The peer-reviewed model paper describes changing the function and context of private events through acceptance and defusion while strengthening values-guided committed action, supporting the scenario's intervention choice.",
      "learningObjectiveId": "intervention-psychological-flexibility-defusion-values",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "cognitive-restructuring-substitution",
        "symptom-control-gate",
        "contingency-management-substitution"
      ]
    },
    {
      "id": "eppp-b026-professional-1",
      "expectedActionRank": 7,
      "expectedAnswerIndex": 2,
      "expectedPrompt": "Under APA Ethics Code Standard 6.05, accepting barter from a client is:",
      "prompt": "A client with limited cash proposes exchanging original artwork for psychotherapy sessions. Before agreeing, what should the psychologist do?",
      "choices": [
        "Accept once the estimated market values appear equal and document the exchange as a routine fee arrangement",
        "Decline on the ground that professional fees must be monetary rather than examining clinical and power considerations",
        "Evaluate possible effects on treatment and exploitation risk, along with valuation, boundaries, alternatives, and applicable law",
        "Accept after written consent and defer discussion of boundary effects unless a later disagreement develops"
      ],
      "rationale": "Noncash exchange can be permissible when it is not clinically contraindicated and the arrangement is not exploitative. Before agreeing, the psychologist should examine effects on treatment, power and boundaries, valuation, cultural context, alternatives, documentation, taxes, and applicable law rather than relying on price equivalence or consent alone.",
      "choiceRationales": [
        "Comparable market value addresses part of valuation but does not resolve clinical contraindication, exploitation, power, boundary, cultural, tax, or legal concerns. Documentation cannot substitute for evaluating those risks before agreement.",
        "The Code does not make monetary payment the exclusive ethical fee form. A categorical refusal misses the required case-specific analysis of clinical contraindication and exploitation as well as relevant contextual duties.",
        "Noncash exchange can be permissible when it is not clinically contraindicated and the arrangement is not exploitative. Before agreeing, the psychologist should examine effects on treatment, power and boundaries, valuation, cultural context, alternatives, documentation, taxes, and applicable law rather than relying on price equivalence or consent alone.",
        "Written agreement supports clarity but does not by itself address clinical or exploitation concerns. Boundary effects and foreseeable disputes should be evaluated before the exchange begins rather than deferred until a problem appears."
      ],
      "references": [
        "https://www.apa.org/ethics/code#605"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/ethics/code#605",
          "title": "Ethical Principles of Psychologists and Code of Conduct - Standard 6.05",
          "summary": "APA Ethics Code Standard 6.05 addresses noncash exchanges for psychological services and conditions their acceptability on clinical appropriateness and freedom from exploitation.",
          "credibility": "The American Psychological Association publishes the operative text of its professional Ethics Code. This section-specific official link is the primary APA source for the barter standard, although applicable law and licensing rules may impose additional duties.",
          "organization": "American Psychological Association"
        }
      ],
      "sourceCheck": "The official APA Code permits noncash exchange when it is not clinically contraindicated and the resulting arrangement is not exploitative, supporting a prospective case-specific risk analysis rather than a blanket rule.",
      "learningObjectiveId": "professional-noncash-fee-clinical-exploitation-analysis",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "market-value-safe-harbor",
        "blanket-monetary-rule",
        "consent-only-boundary-deferral"
      ]
    },
    {
      "id": "eppp-v2-professional-020",
      "expectedActionRank": 8,
      "expectedAnswerIndex": 1,
      "expectedPrompt": "Complete the statement: APA Standard 9.01 regarding assessment states that psychologists must:",
      "prompt": "An organizational psychologist receives a supervisor's informal account and an online screener that was not validated for fitness-for-duty decisions. The employer requests a definitive opinion by the end of the day. What is the best response?",
      "choices": [
        "Issue a provisional conclusion from the supervisor's account and add a disclaimer that supporting data will be collected later",
        "Clarify the referral question, obtain sufficient relevant information, and use techniques appropriate to that purpose before reaching a conclusion",
        "Use the employer's preferred screener because stakeholder selection resolves questions about validity for the referral purpose",
        "Treat prior treatment notes as an adequate assessment basis because they were written by a licensed clinician"
      ],
      "rationale": "Assessment opinions require information sufficient to substantiate the findings and techniques appropriate to the purpose. An urgent deadline does not make an informal account and mismatched screener adequate for a definitive fitness-for-duty conclusion; the psychologist should clarify the question and gather an appropriate evidentiary basis.",
      "choiceRationales": [
        "Calling a conclusion provisional and promising later data does not supply an adequate present basis for a definitive high-stakes opinion. The psychologist should resolve the evidentiary gap before making the requested conclusion.",
        "Assessment opinions require information sufficient to substantiate the findings and techniques appropriate to the purpose. An urgent deadline does not make an informal account and mismatched screener adequate for a definitive fitness-for-duty conclusion; the psychologist should clarify the question and gather an appropriate evidentiary basis.",
        "A stakeholder's preference does not establish that an instrument is valid or appropriate for the referral purpose and population. Technique selection remains a professional responsibility tied to the question being answered.",
        "Treatment notes can contribute relevant history, but their authorship does not make them an adequate stand-alone basis for a distinct fitness-for-duty determination. The evaluator still needs sufficient purpose-appropriate information."
      ],
      "references": [
        "https://www.apa.org/ethics/code#901"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/ethics/code#901",
          "title": "Ethical Principles of Psychologists and Code of Conduct - Standard 9.01",
          "summary": "APA Ethics Code Standard 9.01 requires psychologists to base assessment opinions, recommendations, and diagnostic or evaluative statements on information and techniques sufficient to substantiate their findings.",
          "credibility": "The American Psychological Association publishes the operative text of its professional Ethics Code. This section-specific official link is the primary APA source for the evidentiary basis required for assessment opinions, subject to applicable law and licensing rules.",
          "organization": "American Psychological Association"
        }
      ],
      "sourceCheck": "The official APA Code requires assessment opinions to rest on information and techniques sufficient to substantiate findings, directly supporting refusal to issue a definitive occupational opinion from an informal report and mismatched screener.",
      "learningObjectiveId": "professional-assessment-basis-fitness-for-duty",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "provisional-disclaimer-shortcut",
        "stakeholder-preference-validity-error",
        "treatment-records-sufficiency-error"
      ]
    }
  ]
};
