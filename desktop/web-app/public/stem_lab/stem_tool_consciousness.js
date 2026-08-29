(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  window.StemLab = window.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    getRegisteredTools: function () {
      var self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    },
    renderTool: function (id, ctx) {
      var tool = this._registry[id];
      return tool && typeof tool.render === 'function' ? tool.render(ctx) : null;
    }
  };

  if (window.StemLab.isRegistered && window.StemLab.isRegistered('consciousnessLab')) return;

  var LEVEL_ORDER = ['early', 'elementary', 'middle', 'high', 'college', 'graduate'];
  var EVIDENCE_LADDER_LABELS = ['Established', 'Suggestive', 'Disputed', 'Unknown'];
  var GUIDED_DEBATE_FIELDS = ['positionA', 'positionB', 'evidence', 'uncertainty'];

  // ── Ported from the Codex worktree with the Theory Map / Prediction Simulator /
  // Portfolio views. Main had none of these tables.
  var GUIDED_DEBATE_CHECKS = ['steelman', 'evidenceLimit', 'uncertainty'];
  var CASE_AUDIT_FIELDS = ['observation', 'interpretation', 'limit'];
  var EXPERIMENT_THEORY_IDS = ['gnw', 'rpt', 'iit', 'hot', 'predictive', 'ast'];
  var KNOWLEDGE_CHECK_LENGTHS = { early: 3, elementary: 4, middle: 5, high: 6, college: 6, graduate: 6 };
  var MISCONCEPTION_LABELS = {
    function_to_feeling: 'Function is not proof of feeling',
    correlation_to_cause: 'Correlation is not mechanism',
    report_as_experience: 'Report is evidence, not experience itself',
    proxy_to_construct: 'A proxy is not the construct',
    compatibility_to_proof: 'Compatibility is not discrimination',
    absolute_claim: 'Avoid unsupported absolute claims',
    evidence_boundary: 'Observation and interpretation differ'
  };
  var THEORY_MAP_PLACEMENTS = {
    gnw: { target: 'access', scale: 'global', substrate: 'neural' },
    rpt: { target: 'sensory', scale: 'local', substrate: 'neural' },
    iit: { target: 'integration', scale: 'whole', substrate: 'organizational' },
    hot: { target: 'self', scale: 'higher', substrate: 'organizational' },
    predictive: { target: 'inference', scale: 'distributed', substrate: 'organizational' },
    ast: { target: 'self', scale: 'higher', substrate: 'organizational' },
    functionalism: { target: 'realization', scale: 'framework', substrate: 'organizational' },
    physicalism: { target: 'metaphysical', scale: 'framework', substrate: 'physical' },
    dualism: { target: 'metaphysical', scale: 'framework', substrate: 'nonphysical' },
    panpsychism: { target: 'metaphysical', scale: 'framework', substrate: 'fundamental' },
    illusionism: { target: 'self', scale: 'higher', substrate: 'physical' },
    biological: { target: 'realization', scale: 'framework', substrate: 'biological' },
    neutral: { target: 'metaphysical', scale: 'framework', substrate: 'neutral' }
  };
  var PORTFOLIO_FIELDS = ['claim', 'evidence', 'uncertainty'];
  var VOCAB_GLOSSARY = {
    'awake': ['A state in which a person is usually ready to have experiences and respond.', 'Eyes open can be a clue, but wakefulness and experience are not measured by one behavior alone.'],
    'notice': ['For information to affect what someone can choose, remember, say, or do.', 'Noticing a green light can guide a safe crossing decision.'],
    'feel': ['What an experience is like for the person or animal having it.', 'A pain can guide action and also hurt from the inside.'],
    'clue': ['Something observed or measured that helps us compare ideas.', 'A brain signal or a careful report can be a clue without proving a whole theory.'],
    'attention': ['The selective use of limited processing resources for some information rather than other information.', 'Looking toward a light can increase attention, but attention and consciousness are not the same thing.'],
    'report': ['A word, button press, gesture, or other response used to communicate what was detected or experienced.', 'Saying green is a report; preparing that answer also uses memory and action systems.'],
    'experience': ['A conscious sight, sound, thought, feeling, or other episode from a first-person point of view.', 'Seeing green and feeling pain are different kinds of experience.'],
    'brain network': ['A set of brain regions whose activity and connections help perform a function.', 'A network may coordinate vision, memory, and decisions without acting like one tiny control room.'],
    'feedback': ['Processing that returns from later or higher stages to influence earlier activity.', 'Visual areas can send signals forward and receive returning signals.'],
    'access consciousness': ['Information available for report, reasoning, memory, and flexible control of action.', 'A color is access-conscious when it can guide a comparison, a spoken answer, and a later choice.'],
    'phenomenal consciousness': ['The qualitative character of experience: what it is like for the experiencer.', 'The particular way green looks is phenomenal character.'],
    'recurrent processing': ['Neural activity that loops back within or between processing areas instead of moving only forward.', 'A later visual signal can return to influence an earlier visual area.'],
    'metacognition': ['Monitoring or evaluating one\'s own thinking, perception, or confidence.', 'Rating how sure you are that you saw a faint light is a metacognitive judgment.'],
    'correlation': ['A measured relationship between variables that does not by itself show that one causes the other.', 'A signal may track reported seeing while being a cause, prerequisite, consequence, or report process.'],
    'neural correlate': ['A minimal neural state or process that systematically goes with a particular conscious state or content.', 'A correlate can locate a reliable relationship without yet identifying the full mechanism.'],
    'necessary vs. sufficient': ['Necessary means required; sufficient means enough on its own under the stated conditions.', 'If recurrence is necessary, removing it should remove the target experience; sufficiency is a stronger claim.'],
    'report confound': ['Extra memory, decision, language, or motor activity mixed into a contrast because participants must report.', 'A late signal may reflect pressing the seen button rather than seeing alone.'],
    'multiple realizability': ['The possibility that the same mental or functional organization could be implemented in different physical materials.', 'A biological brain and an artificial system might perform similar roles while using different substrates.'],
    'ontology': ['A view about what kinds of things fundamentally exist and what consciousness is made of.', 'Physicalism and dualism disagree at an ontological level.'],
    'operationalization': ['A rule that turns an abstract construct into something a study can manipulate or measure.', 'A study might operationalize awareness as accuracy plus confidence, while acknowledging what that leaves out.'],
    'prerequisite/consequence confound': ['A measured process may enable consciousness or follow from it without constituting consciousness itself.', 'Attention may prepare a percept, while memory encoding may occur after it.'],
    'causal intervention': ['A deliberate change to a system used to test whether a component makes a difference to an outcome.', 'Stimulating or disrupting a network can provide stronger causal evidence than observation alone.'],
    'substrate independence': ['The claim that the relevant organization could be realized in more than one physical material.', 'A substrate-independent theory must specify which organization matters, not infer sameness from surface behavior alone.'],
    'constitutive claim': ['A claim about what makes a phenomenon the phenomenon it is, rather than merely what predicts or indicates it.', 'Saying integration constitutes consciousness is stronger than saying a complexity measure tracks wakefulness.'],
    'construct validity': ['How well a manipulation or measure captures the intended theoretical construct rather than a nearby one.', 'A seen/unseen contrast has weaker construct validity if attention and confidence also differ.'],
    'auxiliary hypothesis': ['An added assumption that connects a theory\'s core claim to a specific experimental prediction.', 'A failed neural marker may challenge a bridge assumption rather than every version of the theory.'],
    'causal identifiability': ['Whether the available design and assumptions can distinguish the causal effect of interest from alternative explanations.', 'Matching performance and varying report demands can improve, but may not guarantee, identifiability.'],
    'formal equivalence': ['Two descriptions are formally equivalent when they generate the same relevant structure or predictions under a mapping.', 'Equivalent fits do not select a theory unless some observation makes their predictions diverge.'],
    'adversarial collaboration': ['Researchers with competing views jointly specify predictions, analyses, and revision conditions before seeing results.', 'The collaboration is informative when both sides agree what outcomes would count against their expectations.']
  };

  // Restored 2026-08-17. VOCAB_GLOSSARY above shipped in the "Consciousness
  // merge" with no reader at all: the data and its .cns-glossary-detail styles
  // came across, the twelve lines that use them did not, so ~20 authored terms
  // sat dead in the bundle. This is the reader.
  function glossaryFor(term) {
    var entry = VOCAB_GLOSSARY[term];
    return entry ? { term: term, definition: entry[0], example: entry[1] } : null;
  }

  var EVIDENCE_KINDS = {
    'mask-result': 'evidence', 'broadcast-proof': 'claim', 'other-minds': 'question', 'pci-result': 'evidence',
    'rpt-sufficient': 'claim', 'no-report': 'question', 'cogitate': 'evidence', 'jspace-interpretation': 'claim',
    'proxy-validity': 'question'
  };

  var EVIDENCE_LADDER_RUNGS = {
    'brain-dependence': 'Established', 'complexity-mechanism': 'Suggestive',
    'frontal-necessity': 'Disputed', 'current-ai-feeling': 'Unknown'
  };

  function countCorrect(answers, key) {
    var given = answers || {};
    return Object.keys(given).filter(function (id) { return key[id] && given[id] === key[id]; }).length;
  }

  function completedCheckCount(data) {
    var flag = data && data.checkComplete;
    if (flag === true) return 1;
    if (flag && typeof flag === 'object') {
      return Object.keys(flag).filter(function (id) { return flag[id]; }).length;
    }
    return 0;
  }

  function simCrosscheckDone(data) {
    var flags = (data && data.simFlags) || {};
    return !!(flags.human && flags.model && flags.noReport);
  }

  function caseIdsForProfile(profile) {
    var ids = ['green-light', 'animal-moral-patient', 'ai-emotion', 'masking'];
    if (LEVEL_ORDER.indexOf(profile.id) >= LEVEL_ORDER.indexOf('middle')) ids.push('dream');
    if (LEVEL_ORDER.indexOf(profile.id) >= LEVEL_ORDER.indexOf('high')) ids.push('zombie', 'jspace');
    return ids;
  }

  function debateMinimumForProfile(profile) {
    return profile.id === 'early' ? 10 : profile.id === 'elementary' ? 18 : 28;
  }

  function debateGuideForProfile(profile) {
    var guides = {
      early: {
        lead: 'Give each idea its best chance. Then name a clue and what nobody knows yet.',
        positionA: 'What would this idea say?', positionB: 'What would the other idea say?',
        evidence: 'Name a clue. Say what it cannot prove.', uncertainty: 'What is still unknown?'
      },
      elementary: {
        lead: 'Explain two ideas fairly in your own words. Add one observed clue, its limit, and an unanswered question.',
        positionA: 'Explain this idea and connect it to the case.', positionB: 'Explain the competing idea on the same case.',
        evidence: 'Name an observation and something it cannot prove.', uncertainty: 'Name what scientists would need to learn next.'
      },
      middle: {
        lead: 'Articulate competing accounts, then separate access, felt experience, evidence, and uncertainty.',
        positionA: 'State the strongest claim this lens makes about the case.', positionB: 'State the rival claim without weakening it.',
        evidence: 'Name relevant evidence and one correlation, proxy, or report limit.', uncertainty: 'Propose an observation that could favor one account.'
      },
      high: {
        lead: 'Steelman two positions, identify necessary or sufficient claims, and propose a discriminating test with a confound control.',
        positionA: 'State its strongest relevant claim and explanatory target.', positionB: 'State the rival claim on that same target.',
        evidence: 'Evaluate evidence, an alternative explanation, and a report or task confound.', uncertainty: 'Name a controlled result that would change the comparison.'
      },
      college: {
        lead: 'Separate constitutive from evidential claims and audit the operational bridge for two competing positions.',
        positionA: 'State the view, target construct, and constitutive commitment.', positionB: 'State the rival construct and strongest competing explanation.',
        evidence: 'Evaluate the proxy, bridge principle, and non-unique predictions.', uncertainty: 'Specify a manipulation and outcome that would discriminate the models.'
      },
      graduate: {
        lead: 'Reconstruct two positions with their auxiliaries, then audit construct validity, causal identification, and revision conditions.',
        positionA: 'State the core commitment, bridge principles, and relevant auxiliaries.', positionB: 'State the strongest rival at the same explanatory level.',
        evidence: 'Identify the estimand, measurement model, confounds, and alternative-generating process.', uncertainty: 'Give a preregistered falsifier or principled model-revision condition.'
      }
    };
    return guides[profile.id];
  }

  function caseAuditMinimumForProfile(profile) {
    return { early: 8, elementary: 14, middle: 20, high: 24, college: 28, graduate: 32 }[profile.id] || 20;
  }

  function caseAuditReadyForProfile(audit, profile) {
    return !!(audit && audit.theoryId) && caseAuditFieldsReady(audit, caseAuditMinimumForProfile(profile));
  }

  // Observation / interpretation / limit. Each field is [label, prompt, placeholder].
  function caseAuditGuideForProfile(profile) {
    var guides = {
      early: {
        lead: 'Look at the story. Write what we can see, what one idea says about it, and what we still cannot tell.',
        observation: ['What we can see', 'Name something in the story anyone could watch or measure.', 'I can see...'],
        interpretation: ['What the idea says', 'What does your idea say is happening?', 'The idea says...'],
        limit: ['What we still cannot tell', 'Name one thing the clue does not show.', 'We still cannot tell...']
      },
      elementary: {
        lead: 'Separate the three parts: an observation, what a theory adds to it, and what the observation cannot prove.',
        observation: ['Observation', 'Name one thing in the case that was observed or measured.', 'Researchers observed...'],
        interpretation: ['Interpretation', 'Say what the chosen theory adds to that observation.', 'This theory says this shows...'],
        limit: ['Limit', 'Say one thing the observation cannot prove by itself.', 'This does not prove...']
      },
      middle: {
        lead: 'Write the observation without the theory in it, then add the theory, then state the limit. The three should not blur.',
        observation: ['Observation', 'State the measured or observed fact in theory-neutral words.', 'The measured result was...'],
        interpretation: ['Interpretation', 'State what the selected theory infers from it and why.', 'Read through this lens, the result suggests...'],
        limit: ['Limit', 'Name a correlation, proxy, or report limit that keeps the interpretation provisional.', 'The observation cannot show...']
      },
      high: {
        lead: 'Audit one inferential step: observation, theory-dependent interpretation, and the confound or alternative that limits it.',
        observation: ['Observation', 'The result, method, and contrast, stated without interpretation.', 'The contrast showed...'],
        interpretation: ['Interpretation', 'What the theory infers, naming the bridge from result to claim.', 'The theory reads this as...'],
        limit: ['Limit', 'The alternative explanation or confound the design does not exclude.', 'The design cannot exclude...']
      },
      college: {
        lead: 'Distinguish the empirical result from the theory-relative inference and identify the assumption doing the inferential work.',
        observation: ['Result', 'The operationalized measurement and contrast.', 'The study operationalized... and found...'],
        interpretation: ['Inference', 'The theory-dependent reading and the bridge principle it requires.', 'Under this theory the result indicates... given the assumption that...'],
        limit: ['Identification limit', 'The alternative model or proxy-validity threat the result does not rule out.', 'The result underdetermines...']
      },
      graduate: {
        lead: 'Reconstruct the chain: estimand and measurement, theory-relative inference with its auxiliaries, and the identification threat.',
        observation: ['Measurement', 'Construct, manipulation, measurement model, and observed effect.', 'The estimand was...; the measured effect was...'],
        interpretation: ['Model-relative inference', 'The inference licensed by the theory plus its auxiliary assumptions.', 'Conditional on..., the theory infers...'],
        limit: ['Identification threat', 'The confound, selection effect, or alternative generating process left open.', 'Identification fails if...']
      }
    };
    return guides[profile.id];
  }

  // Self-check rubric shown before "Finish guided debate". Deliberately NOT a
  // gate: ticking a box proves nothing, so the tool asks and then trusts.
  function debateCheckLabelsForProfile(profile) {
    if (profile.id === 'early') {
      return { steelman: 'I said what each idea would say, in a fair way.', evidenceLimit: 'I said what my clue cannot prove.', uncertainty: 'I said what nobody knows yet.' };
    }
    if (profile.id === 'elementary') {
      return { steelman: 'I explained both ideas the way their supporters would.', evidenceLimit: 'I named an observation and something it cannot prove.', uncertainty: 'I named an unanswered question.' };
    }
    if (profile.id === 'middle') {
      return { steelman: 'Each position is stated as its strongest supporter would state it.', evidenceLimit: 'The evidence is paired with a correlation, proxy, or report limit.', uncertainty: 'The uncertainty names an observation that could favor one account.' };
    }
    return { steelman: 'Each position is steelmanned, including its constitutive commitment.', evidenceLimit: 'The evidence line names an alternative explanation or confound.', uncertainty: 'The uncertainty is a discriminating result, not a restatement of the dispute.' };
  }

  function debateReadyForProfile(debate, profile) {
    if (!debate || !debate.theoryA || !debate.theoryB || debate.theoryA === debate.theoryB) return false;
    var minimum = debateMinimumForProfile(profile);
    var fieldsReady = GUIDED_DEBATE_FIELDS.every(function (field) {
      return String(debate[field] || '').trim().length >= minimum;
    });
    return fieldsReady && String(debate.positionA || '').trim().toLowerCase() !== String(debate.positionB || '').trim().toLowerCase();
  }

  function completedDebateCount(data) {
    var debates = (data && data.caseDebates) || {};
    return Object.keys(debates).filter(function (caseId) {
      var debate = debates[caseId] || {};
      var minimum = Math.max(10, parseInt(debate.minimum, 10) || 10);
      var fieldsReady = GUIDED_DEBATE_FIELDS.every(function (field) { return String(debate[field] || '').trim().length >= minimum; });
      return debate.complete === true && debate.theoryA && debate.theoryB && debate.theoryA !== debate.theoryB && fieldsReady && String(debate.positionA || '').trim().toLowerCase() !== String(debate.positionB || '').trim().toLowerCase();
    }).length;
  }

  var PROFILES = {
    early: {
      id: 'early', label: 'K-2 explorer', shortLabel: 'K-2', tone: 'short sentences and concrete clues',
      theoryIds: ['gnw', 'rpt', 'iit', 'hot'], philosophyIds: [],
      compareRows: ['claim', 'example', 'evidence', 'challenge'],
      vocabulary: ['awake', 'notice', 'feel', 'clue'],
      intro: 'Being conscious can mean being awake, noticing something, or having a feeling. Scientists can measure clues, but they cannot look directly inside another mind.',
      targets: [
        ['Being awake', 'Is the brain ready to have experiences?'],
        ['Noticing', 'Can information guide what someone says or does?'],
        ['Feeling', 'Is there something the experience feels like from the inside?']
      ],
      activityPrompt: 'Sort each card. Is it a clue we measured, an idea that explains clues, or a question nobody has settled?',
      evidenceLabels: ['Measured clue', 'Theory idea', 'Open question']
    },
    elementary: {
      id: 'elementary', label: 'Grades 3-5 investigator', shortLabel: 'Grades 3-5', tone: 'plain language with named theories',
      theoryIds: ['gnw', 'rpt', 'iit', 'hot', 'ast'], philosophyIds: ['functionalism'],
      compareRows: ['claim', 'mechanism', 'example', 'evidence', 'challenge'],
      vocabulary: ['attention', 'report', 'experience', 'brain network', 'feedback'],
      intro: 'Consciousness includes being able to have experiences and use some information for memory, decisions, words, and actions. Different theories explain these abilities in different ways.',
      targets: [
        ['Conscious state', 'Whether a person is awake, dreaming, or under anesthesia.'],
        ['Conscious content', 'What a person sees, hears, thinks, or feels right now.'],
        ['Access and experience', 'Using information is observable; what it feels like is known most directly by the experiencer.']
      ],
      activityPrompt: 'Classify each statement before reading the explanation. A finding can fit more than one theory.',
      evidenceLabels: ['Evidence', 'Theory claim', 'Open question']
    },
    middle: {
      id: 'middle', label: 'Grades 6-8 analyst', shortLabel: 'Grades 6-8', tone: 'disciplinary vocabulary and competing predictions',
      theoryIds: ['gnw', 'rpt', 'iit', 'hot', 'predictive', 'ast'],
      philosophyIds: ['functionalism', 'physicalism', 'dualism', 'panpsychism'],
      compareRows: ['claim', 'mechanism', 'prediction', 'evidence', 'challenge', 'biology'],
      vocabulary: ['access consciousness', 'phenomenal consciousness', 'recurrent processing', 'metacognition', 'correlation'],
      intro: 'Researchers distinguish access consciousness - information available for report, reasoning, memory, and flexible action - from phenomenal consciousness, or what an experience feels like. Whether those always come together is unresolved.',
      targets: [
        ['State or capacity', 'Wakefulness and the capacity for experience can change in sleep, anesthesia, and brain injury.'],
        ['Content', 'A face, pain, image, or thought may become conscious at a particular moment.'],
        ['Self-consciousness', 'A system may represent itself or judge its own confidence. That is related to, but not identical with, experience.']
      ],
      activityPrompt: 'Separate observations from interpretations and open questions. Watch for correlation being treated as proof of a mechanism.',
      evidenceLabels: ['Empirical evidence', 'Theoretical claim', 'Open question']
    },
    high: {
      id: 'high', label: 'Grades 9-12 scholar', shortLabel: 'Grades 9-12', tone: 'mechanisms, confounds, and philosophical scope',
      theoryIds: ['gnw', 'rpt', 'iit', 'hot', 'predictive', 'ast'],
      philosophyIds: ['functionalism', 'physicalism', 'dualism', 'panpsychism', 'illusionism'],
      compareRows: ['claim', 'target', 'mechanism', 'prediction', 'evidence', 'challenge', 'biology'],
      vocabulary: ['neural correlate', 'necessary vs. sufficient', 'report confound', 'multiple realizability', 'ontology'],
      intro: 'Consciousness science studies state, content, access, phenomenology, and self-representation. Theories may compete on one target while complementing one another on another, so evidence must be tied to a precise prediction.',
      targets: [
        ['Phenomenal consciousness', 'The qualitative character - what it is like - of an experience.'],
        ['Access consciousness', 'Information poised for report, reasoning, memory, and flexible control.'],
        ['Neural correlate vs. cause', 'A signal that tracks experience may be a prerequisite, consequence, or task-related process rather than the experience-generating mechanism.']
      ],
      activityPrompt: 'Classify the epistemic status of each statement, then inspect the method, alternative explanations, and limits.',
      evidenceLabels: ['Empirical result', 'Theory-based interpretation', 'Unresolved question']
    },
    college: {
      id: 'college', label: 'College seminar', shortLabel: 'College', tone: 'operational definitions and theory discrimination',
      theoryIds: ['gnw', 'rpt', 'iit', 'hot', 'predictive', 'ast'],
      philosophyIds: ['functionalism', 'physicalism', 'dualism', 'panpsychism', 'illusionism', 'biological'],
      compareRows: ['claim', 'target', 'mechanism', 'prediction', 'evidence', 'challenge', 'biology'],
      vocabulary: ['operationalization', 'prerequisite/consequence confound', 'causal intervention', 'substrate independence', 'constitutive claim'],
      intro: 'Theories of consciousness differ in explanatory target, level, and scope. A theory of conscious access, a theory of phenomenal character, and a metaphysical account of mind are not automatically direct competitors.',
      targets: [
        ['Explanandum', 'Specify whether a theory targets level, content, access, phenomenality, selfhood, or report.'],
        ['Operational measure', 'Reports, behavior, neural decoding, and perturbational measures each carry distinct assumptions.'],
        ['Discriminating prediction', 'Shared compatibility with a finding is weaker than a preregistered result that separates theories.']
      ],
      activityPrompt: 'Classify each statement and evaluate whether the cited method can support the inference being made.',
      evidenceLabels: ['Empirical result', 'Theoretical interpretation', 'Open problem']
    },
    graduate: {
      id: 'graduate', label: 'Graduate research lens', shortLabel: 'Graduate', tone: 'formal assumptions, causal identification, and preregistration',
      theoryIds: ['gnw', 'rpt', 'iit', 'hot', 'predictive', 'ast'],
      philosophyIds: ['functionalism', 'physicalism', 'dualism', 'panpsychism', 'illusionism', 'biological', 'neutral'],
      compareRows: ['claim', 'target', 'mechanism', 'prediction', 'evidence', 'challenge', 'biology'],
      vocabulary: ['construct validity', 'auxiliary hypothesis', 'causal identifiability', 'formal equivalence', 'adversarial collaboration'],
      intro: 'Mature theory comparison requires explicit bridge principles from formal or philosophical claims to operational predictions, plus controls for report, attention, memory, decision, and performance confounds.',
      targets: [
        ['Construct validity', 'Does the manipulation isolate consciousness rather than attention, confidence, memory, or response preparation?'],
        ['Bridge principles', 'Which auxiliary assumptions connect a theory to the measured signal?'],
        ['Falsification conditions', 'What preregistered result would make proponents revise a core or auxiliary claim?']
      ],
      activityPrompt: 'Audit the inferential chain: construct, manipulation, measurement, bridge principle, alternative model, and revision condition.',
      evidenceLabels: ['Empirical result', 'Model-dependent inference', 'Open research problem']
    }
  };

  function parseGradeNumber(value) {
    var raw = String(value == null ? '' : value).trim().toLowerCase();
    if (!raw) return 7;
    if (raw === 'k' || raw.indexOf('kindergarten') !== -1) return 0;
    if (raw.indexOf('graduate') !== -1) return 14;
    if (raw.indexOf('college') !== -1 || raw.indexOf('undergrad') !== -1 || raw.indexOf('adult') !== -1) return 13;
    var match = raw.match(/(?:grade\s*)?(\d{1,2})(?:st|nd|rd|th)?/);
    if (match) return Math.max(0, Math.min(14, parseInt(match[1], 10)));
    return 7;
  }

  function resolveProfile(value) {
    var n = parseGradeNumber(value);
    if (n <= 2) return PROFILES.early;
    if (n <= 5) return PROFILES.elementary;
    if (n <= 8) return PROFILES.middle;
    if (n <= 12) return PROFILES.high;
    if (n === 13) return PROFILES.college;
    return PROFILES.graduate;
  }

  function mergeLevelCopy(theory, levelId) {
    var out = {};
    var stop = LEVEL_ORDER.indexOf(levelId);
    if (stop < 0) stop = 2;
    for (var i = 0; i <= stop; i++) {
      if (theory.copy[LEVEL_ORDER[i]]) Object.assign(out, theory.copy[LEVEL_ORDER[i]]);
    }
    return out;
  }

  var THEORIES = {
    gnw: {
      id: 'gnw', group: 'science', icon: '\uD83C\uDF10', short: 'GNWT', nick: 'the sharing idea', plainAsk: 'whether the clue got shared with many brain helpers at once.', name: 'Global Neuronal Workspace Theory', focus: ['global'],
      copy: {
        early: {
          summary: 'The brain has many quiet helpers. You notice some information when it is shared widely.',
          claim: 'An idea becomes available to many brain jobs at once.',
          example: 'A teacher says your name. The sound can guide attention, memory, words, and action.',
          evidence: 'Researchers can compare brain activity when people do and do not report seeing the same brief picture.',
          challenge: 'A wide brain signal might help someone answer, not create the feeling itself.'
        },
        elementary: {
          summary: 'Information becomes conscious when a brain-wide workspace shares it with memory, language, planning, and action.',
          mechanism: 'A selected signal is amplified and broadcast across long-range brain networks.',
          prediction: 'Seen information should become widely available; unseen information may stay local.',
          misconception: 'The brain does not literally send one message to every region.'
        },
        middle: {
          summary: 'Conscious access occurs when recurrent activity produces a global broadcast that supports report and flexible control.',
          target: 'Primarily access consciousness.',
          mechanism: 'Threshold-like ignition and long-range availability across a neuronal workspace.',
          evidence: 'Late widespread activity sometimes distinguishes reported seen from unseen stimuli in masking studies.',
          challenge: 'Late frontal signals may partly reflect report, working memory, or decision demands.'
        },
        high: {
          prediction: 'A conscious representation should show nonlinear amplification and global availability to otherwise specialized systems.',
          biology: 'Developed as a brain-network account, but its functional workspace idea can also be modeled computationally.',
          challenge: 'No-report results and the 2025 adversarial test complicate simple claims about late frontal ignition; broadcasting may explain access without explaining phenomenality.'
        },
        college: {
          evidence: 'Masking, attentional-blink, decoding, and causal-perturbation work test amplification and availability, but operational contrasts often bundle awareness with report and maintenance.',
          challenge: 'The theory needs precise bridge principles linking workspace availability, neural ignition, report-independent content, and phenomenal experience.'
        },
        graduate: {
          prediction: 'Discriminating tests must preregister spatiotemporal ignition signatures and separate workspace access from post-perceptual accumulation, metacognitive readout, and motor preparation.',
          challenge: 'A failed predicted marker may challenge a neural implementation or auxiliary task model rather than the functional workspace core.'
        }
      }
    },
    rpt: {
      id: 'rpt', group: 'science', icon: '\u21A9\uFE0F', short: 'RPT', nick: 'the loop-back idea', plainAsk: 'whether the signal looped back before anyone noticed it.', name: 'Recurrent Processing Theory', focus: ['recurrence'],
      copy: {
        early: {
          summary: 'Seeing may need brain signals to travel forward and then loop back.',
          claim: 'A quick one-way signal is not enough; a local return trip may help make a picture part of experience.',
          example: 'A picture flashed too quickly may start processing before a later picture interrupts the loop.',
          evidence: 'Scientists change the timing of pictures and measure which brain signals return.',
          challenge: 'Not every loop is a feeling, and most studies ask people what they saw.'
        },
        elementary: {
          summary: 'Local feedback loops in sensory brain areas may be enough for a conscious percept, before information is shared globally.',
          mechanism: 'Signals return from later visual areas to earlier ones instead of moving only forward.',
          prediction: 'Interrupting recurrent feedback should block visual experience even if early feedforward processing survives.',
          misconception: 'The theory does not say every feedback loop anywhere is conscious.'
        },
        middle: {
          summary: 'Local recurrent sensory processing may be sufficient for phenomenal perception; global access is a later step needed for report and flexible use.',
          target: 'Phenomenal perceptual content, especially vision.',
          evidence: 'Backward masking can preserve early feedforward processing while disrupting later recurrent activity and reported awareness.',
          challenge: 'Recurrence sometimes occurs without reported awareness, and evidence outside vision is thinner.'
        },
        high: {
          mechanism: 'Re-entrant exchange within and between sensory hierarchies stabilizes a perceptual representation.',
          prediction: 'Content-specific recurrence should be necessary for experience even when frontoparietal broadcast is reduced.',
          biology: 'A cortical processing account; it does not by itself decide whether an artificial recurrent system could feel.'
        },
        college: {
          evidence: 'Masking, TMS, laminar recording, and feedforward/recurrent timing dissociations are relevant, but report-independent validation is difficult.',
          challenge: 'Necessity and sufficiency claims require causal interventions with recurrence-specific manipulations that preserve feedforward content and performance.'
        },
        graduate: {
          prediction: 'A strong test would manipulate local recurrence independently of global broadcast and metacognitive readout while retaining a defensible, report-independent content measure.',
          challenge: 'Residual awareness can be graded, so binary seen/unseen labels may mis-specify the dependent variable.'
        }
      }
    },
    iit: {
      id: 'iit', group: 'science', icon: '\u2295', short: 'IIT', nick: 'the working-together idea', plainAsk: 'how well all the parts worked together as one whole.', name: 'Integrated Information Theory', focus: ['integration'],
      copy: {
        early: {
          summary: 'One idea asks how strongly the parts of a system work together as one whole.',
          claim: 'A joined-together cause-and-effect pattern matters more than just having many parts.',
          example: 'A team that changes when split apart is different from a pile of people who never interact.',
          evidence: 'Complex brain responses often shrink during deep sleep or anesthesia and return during wakefulness.',
          challenge: 'A complexity score is a clue. It does not directly show what something feels.'
        },
        elementary: {
          summary: 'Consciousness depends on an irreducible cause-and-effect structure: the whole system does something its separate parts cannot.',
          mechanism: 'Integration and differentiation are properties of the system itself, not just what it reports.',
          prediction: 'Systems with more irreducible intrinsic causal structure would have more or richer experience.',
          misconception: 'More stored data, bigger size, or higher intelligence does not automatically mean more consciousness.'
        },
        middle: {
          summary: 'Experience is identified with a system\'s maximally irreducible intrinsic cause-effect structure; IIT uses Phi as a formal quantity.',
          target: 'Both level and qualitative structure of phenomenal experience.',
          evidence: 'Perturbational Complexity Index (PCI) often tracks conscious capacity across wakefulness, anesthesia, sleep, and brain injury.',
          challenge: 'PCI is not a direct measurement of Phi and does not uniquely confirm IIT.'
        },
        high: {
          mechanism: 'Phenomenological axioms are translated into postulates about intrinsic causal power, integration, information, composition, and exclusion.',
          prediction: 'The maximally irreducible causal structure, not input-output behavior alone, determines whether and how a system experiences.',
          biology: 'Not restricted to biology in principle; the causal organization of a physical system is central.',
          challenge: 'Full Phi calculations for real brains are intractable, and some predicted attributions are disputed or counterintuitive.'
        },
        college: {
          evidence: 'PCI and posterior-cortical findings are theoretically relevant proxies, not direct tests of the complete identity claim. The 2025 COGITATE study challenged a predicted sustained posterior synchronization pattern while supporting some content-location predictions.',
          challenge: 'Empirical proxy validation, grain/partition choices, exclusion, and translating IIT\'s formalism to realistic systems remain contested.'
        },
        graduate: {
          prediction: 'A discriminating program must specify an implementable causal model, system grain and boundary, maximal complex, and predictions not shared by generic complexity accounts.',
          challenge: 'One must separate falsification of an operational proxy from revision of IIT\'s axioms, postulates, or identity claim.'
        }
      }
    },
    hot: {
      id: 'hot', group: 'science', icon: '\uD83E\uDE9E', short: 'HOT', nick: 'the noticing-you-noticed idea', plainAsk: 'whether the brain also marked "I am noticing this."', name: 'Higher-Order Theories', focus: ['metacognition'],
      copy: {
        early: {
          summary: 'A brain state may become conscious when the mind also represents that it is having that state.',
          claim: 'Seeing can include a kind of awareness that you are seeing.',
          example: 'You can guess a shape correctly but still say, "I did not really see it." Confidence and performance can differ.',
          evidence: 'Researchers compare answers, confidence, and brain activity.',
          challenge: 'A person does not need to silently say a sentence about every feeling.'
        },
        elementary: {
          summary: 'A first mental state becomes conscious when a suitable second, higher-order state represents the person as being in it.',
          mechanism: 'The system represents not only an object, but its own current mental state.',
          prediction: 'Awareness judgments and confidence can change even when first-order task performance stays similar.',
          misconception: 'A higher-order state need not be an inner spoken thought.'
        },
        middle: {
          summary: 'A mental state is conscious when represented by a suitable higher-order representation, often linked to metacognition.',
          target: 'What makes a first-order percept or thought conscious to the subject.',
          evidence: 'Confidence, awareness reports, and some prefrontal activity can dissociate from objective performance.',
          challenge: 'Metacognitive or frontal effects may concern report rather than the original experience.'
        },
        high: {
          mechanism: 'Variants appeal to higher-order thought, perception, or probabilistic representation; they do not all impose the same cognitive demands.',
          prediction: 'Manipulating higher-order representation while holding first-order content fixed should alter conscious awareness.',
          biology: 'Usually a functional/neural representational account, with disagreement about required architecture.'
        },
        college: {
          evidence: 'Metacognitive sensitivity, blindsight-like dissociations, confidence manipulation, and prefrontal perturbation are relevant but rarely isolate higher-order representation cleanly.',
          challenge: 'The family must distinguish a constitutive higher-order state from a consequence used to report or evaluate an already-conscious state.'
        },
        graduate: {
          prediction: 'Causal tests need orthogonal manipulation of first-order signal strength and higher-order precision/readout, with model comparison across HOT variants.',
          challenge: 'Lesion evidence, no-report paradigms, and variant-specific commitments complicate a single anatomical falsification criterion.'
        }
      }
    },
    predictive: {
      id: 'predictive', group: 'science', icon: '\uD83C\uDFAF', short: 'PP', name: 'Predictive-Processing Approaches', focus: ['prediction'],
      copy: {
        middle: {
          summary: 'The brain builds hierarchical predictions and updates them with prediction errors; consciousness proposals emphasize winning predictions, precision, or model structure.',
          claim: 'Conscious content may depend on which generative model best explains sensory and bodily signals.',
          mechanism: 'Top-down predictions interact with bottom-up errors, weighted by estimated precision.',
          example: 'An ambiguous image can look different after context changes what the brain expects.',
          evidence: 'Expectations, priors, sensory uncertainty, and interoception demonstrably shape perception.',
          challenge: 'Predictive processing explains perception broadly; that does not yet make it a unique explanation of consciousness.',
          misconception: 'The brain is not guessing randomly, and the view does not imply the outside world is imaginary.'
        },
        high: {
          target: 'Conscious content and, in some variants, conscious selfhood or level.',
          prediction: 'Changing priors or precision should systematically change experienced content, not merely decisions.',
          biology: 'A computational framework usually mapped to hierarchical neural signaling; not one agreed theory.'
        },
        college: {
          evidence: 'Perceptual priors, illusions, interoceptive inference, and precision manipulations support predictive mechanisms, but most are not consciousness-specific contrasts.',
          challenge: 'Competing variants assign consciousness to different features, reducing unique, risky predictions.'
        },
        graduate: {
          prediction: 'A useful test must specify the generative model, precision manipulation, phenomenological dependent variable, and predictions beyond generic Bayesian perception.',
          challenge: 'Flexible post hoc selection among winning-hypothesis, precision, temporal-depth, and self-model accounts threatens discriminability.'
        }
      }
    },
    ast: {
      id: 'ast', group: 'science', icon: '\uD83D\uDCCD', short: 'AST', plainAsk: 'whether the brain kept a simple map of what it was paying attention to.', name: 'Attention Schema Theory', focus: ['selfmodel'],
      copy: {
        elementary: {
          summary: 'The brain may build a simple model of what its attention is doing, like a map that helps it control focus.',
          claim: 'That simplified attention map helps explain why we say we are aware of something.',
          example: 'A body map helps control an arm without listing every muscle; an attention map could guide focus without listing every neuron.',
          evidence: 'Attention and awareness can come apart in some experiments.',
          challenge: 'A useful self-map might explain reports without settling why experience feels like anything.'
        },
        middle: {
          summary: 'The brain constructs a simplified model - an attention schema - to control attention and attribute awareness to self and others.',
          target: 'Awareness reports, self-modeling, and control of attention.',
          mechanism: 'A schematic internal model represents attention while leaving out its detailed mechanics.',
          prediction: 'Disrupting the attention model should affect awareness attribution and attentional control in linked ways.',
          evidence: 'Attention and awareness dissociate, and model-based control is a well-supported strategy in other domains.',
          misconception: 'AST does not simply say attention and consciousness are identical.'
        },
        high: {
          challenge: 'Direct evidence uniquely favoring AST is limited; critics argue it explains introspective claims rather than phenomenal feeling.',
          biology: 'A mechanistic information-processing proposal inspired by neural body schemas and social cognition.'
        },
        college: {
          evidence: 'Behavioral dissociations, social attribution, and attention-control findings are consistent with AST, but many are compatible with other metacognitive models.',
          challenge: 'The theory must specify when a self-model is constitutive of awareness rather than merely enabling access and report.'
        },
        graduate: {
          prediction: 'Discriminating tests require measurable schema variables and interventions that change modeled attention without merely changing first-order attention.',
          challenge: 'Functional explanation of certainty and report may leave the phenomenal explanandum contested rather than dissolved.'
        }
      }
    },
    functionalism: {
      id: 'functionalism', group: 'philosophy', icon: '\u2699\uFE0F', short: 'Functionalism', plainAsk: 'whether the state does the same job, whatever it is made of.', caseAsk: 'whether the causal organization on display is the one it says constitutes a mental state, whatever material runs it.', name: 'Functionalism', focus: ['global', 'metacognition'],
      copy: {
        elementary: {
          summary: 'A mental state can be understood by the job it does: what causes it and how it changes memory, choices, words, and action.',
          claim: 'If different materials perform the same organized mental job, they might realize the same kind of state.',
          example: 'A clock can use gears or electronics while still doing the timekeeping job.',
          evidence: 'This is a philosophical account. Behavior and causal organization are relevant evidence, not a direct proof of inner feeling.',
          challenge: 'Does doing every job of pain or joy guarantee that anything hurts or feels good?'
        },
        middle: {
          summary: 'Mental states are constituted partly or wholly by their causal roles, allowing possible multiple realizability across substrates.',
          target: 'What makes something the kind of mental state it is.',
          mechanism: 'Relations among inputs, internal states, outputs, learning, memory, and control.',
          prediction: 'A robustly equivalent causal organization could count as the same mental kind even in a different material.',
          biology: 'Usually substrate-neutral in principle.',
          misconception: 'Copying emotional words once is not robust functional equivalence.'
        },
        high: {
          evidence: 'Neural plasticity, multiple physical implementations of computation, and stable causal-role explanations motivate the view, but do not decide phenomenality.',
          challenge: 'Absent-qualia and inverted-qualia arguments question whether causal role fixes qualitative character.'
        },
        college: {
          claim: 'Role, realizer, and analytic functionalist variants make different constitutive commitments; functional description can be combined with several physicalist views.',
          challenge: 'Behavioral equivalence, counterfactual causal robustness, and phenomenal equivalence must not be treated as interchangeable.'
        },
        graduate: {
          prediction: 'Empirical attribution depends on a privileged functional grain and counterfactual organization, while the constitutive sufficiency claim remains philosophical.',
          challenge: 'A theory must justify which causal topology is mind-relevant without presupposing the target mental categories.'
        }
      }
    },
    physicalism: {
      id: 'physicalism', group: 'philosophy', icon: '\u269B\uFE0F', short: 'Physicalism', caseAsk: 'whether the physical facts of this case already fix every fact about the experience, or whether something has been left out.', name: 'Physicalism', focus: ['biology'],
      copy: {
        middle: {
          summary: 'Conscious facts are physical facts, or are fully grounded in the physical world.',
          claim: 'There is no extra nonphysical substance needed to complete the facts about consciousness.',
          example: 'Changing anesthesia, sleep, or brain injury changes experience, showing deep brain dependence.',
          evidence: 'Brain dependence strongly constrains theories, but it does not by itself choose among every kind of physicalism.',
          challenge: 'How do physical descriptions account for qualitative experience?'
        },
        high: {
          target: 'The metaphysical relation between mind and the physical world.',
          biology: 'Compatible with both biology-specific and substrate-independent physical accounts.',
          challenge: 'The explanatory gap and knowledge arguments are debated; physicalists offer identity, grounding, representational, and deflationary replies.'
        },
        college: {
          claim: 'Type identity, token identity, realization, grounding, and a posteriori physicalism should not be collapsed into one thesis.',
          evidence: 'Interventions on brains support causal dependence; the move from dependence to metaphysical identity needs additional argument.'
        },
        graduate: {
          challenge: 'Empirical closure claims and metaphysical grounding claims require different standards of support.'
        }
      }
    },
    dualism: {
      id: 'dualism', group: 'philosophy', icon: '\u25D1', short: 'Dualism', caseAsk: 'whether a complete physical description of this case would still omit what the experience is like.', name: 'Dualist Views', focus: ['phenomenal'],
      copy: {
        middle: {
          summary: 'Mental and physical reality may involve fundamentally different kinds of properties or substances.',
          claim: 'A complete physical description might leave out facts about experience.',
          example: 'Knowing every physical fact about color might still seem different from seeing red for the first time.',
          evidence: 'Thought experiments motivate the view; they are reasoning tools, not laboratory results.',
          challenge: 'How would a distinct mental property interact with or be detected through physical systems?'
        },
        high: {
          target: 'The ontology and explanatory completeness of physical accounts.',
          biology: 'Compatible with strong brain dependence, though versions disagree about causal interaction.',
          misconception: 'Dualism is a family of views, not automatically belief in a separable ghost.'
        },
        college: {
          claim: 'Substance dualism and property dualism differ; epiphenomenal and interactionist variants face different causal problems.',
          challenge: 'Empirical discrimination, causal closure, and interaction remain central objections.'
        },
        graduate: {
          evidence: 'First-person epistemic asymmetries and conceivability arguments are philosophical premises whose modal force is disputed.'
        }
      }
    },
    panpsychism: {
      id: 'panpsychism', group: 'philosophy', icon: '\u2726', short: 'Panpsychism', caseAsk: 'whether the experience here would have to be built out of wholly non-experiential parts, or out of more basic experiential ones.', name: 'Panpsychist Views', focus: ['integration'],
      copy: {
        middle: {
          summary: 'Very basic experiential properties may be fundamental and widespread in nature.',
          claim: 'Complex consciousness could arise from more basic experiential features rather than from wholly nonexperiential matter.',
          example: 'This does not mean a rock thinks like a person; the claim concerns extremely basic properties.',
          evidence: 'The view is motivated mainly by philosophical arguments about emergence, not a unique laboratory finding.',
          challenge: 'How could tiny experiential properties combine into one unified person?'
        },
        high: {
          target: 'The place of experience in fundamental reality.',
          challenge: 'The combination problem and limited empirical discrimination are major difficulties.'
        },
        college: {
          claim: 'Constitutive, cosmopsychist, and Russellian variants propose different bases and combination relations.',
          evidence: 'Compatibility with physics is not positive empirical confirmation; novel discriminating predictions remain scarce.'
        },
        graduate: {
          challenge: 'The view must specify subject individuation, phenomenal bonding, and a nontrivial relationship to structural physical description.'
        }
      }
    },
    illusionism: {
      id: 'illusionism', group: 'philosophy', icon: '\uD83C\uDFA9', short: 'Illusionism', caseAsk: 'whether the introspective report in this case describes an experience accurately, or describes a model of one.', name: 'Illusionist / Deflationary Views', focus: ['selfmodel'],
      copy: {
        high: {
          summary: 'Introspection may misrepresent experiences as having special intrinsic, ineffable properties; explaining that representation may dissolve part of the hard problem.',
          claim: 'Phenomenal properties as traditionally conceived are not what introspection says they are.',
          example: 'A user interface can hide complex mechanisms and present a simple but misleading picture of what the system is doing.',
          evidence: 'Perceptual filling-in, change blindness, and unreliable introspection show that self-knowledge is constructed, but do not uniquely establish illusionism.',
          challenge: 'Critics argue that explaining why experience seems present already presupposes something it is like to have the seeming.',
          misconception: 'The view does not say pain behavior, distress, or all experience-talk is unreal.'
        },
        college: {
          target: 'The accuracy of phenomenal concepts and introspective representation.',
          biology: 'Usually physicalist and compatible with several cognitive architectures.'
        },
        graduate: {
          challenge: 'The account must avoid replacing phenomenal consciousness with access/report by stipulation and explain the target error representation non-circularly.'
        }
      }
    },
    biological: {
      id: 'biological', group: 'philosophy', icon: '\uD83E\uDDEC', short: 'Biological naturalism', caseAsk: 'whether specific biological causal powers are doing the constitutive work here, rather than the information processing alone.', name: 'Biological Naturalism', focus: ['biology'],
      copy: {
        college: {
          summary: 'Consciousness is a real biological feature caused by lower-level brain processes, while syntax or formal computation alone is not sufficient.',
          claim: 'The right causal powers of biological systems matter; simulating those powers is not automatically duplicating them.',
          example: 'A simulation of digestion does not digest food; the argument asks whether consciousness is relevantly similar.',
          evidence: 'Reliable dependence on living brains is relevant but cannot by itself prove that only biology could realize consciousness.',
          challenge: 'The view must identify which biological causal properties are necessary and why no nonbiological system could instantiate them.',
          biology: 'Biological realization is central.'
        },
        graduate: {
          target: 'Constitutive sufficiency of biological causal powers versus formal functional organization.',
          challenge: 'The simulation/duplication analogy requires an independent account of which causal organization is constitutive of experience.'
        }
      }
    },
    neutral: {
      id: 'neutral', group: 'philosophy', icon: '\u25C7', short: 'Neutral monism', caseAsk: 'whether the mental and physical descriptions of this case are two organizations of one more basic set of elements.', name: 'Neutral Monist Views', focus: ['phenomenal'],
      copy: {
        graduate: {
          summary: 'Mental and physical descriptions may derive from a more fundamental basis that is itself neither exclusively mental nor exclusively physical.',
          claim: 'The apparent mind-matter divide reflects two organizations or descriptions of neutral elements.',
          example: 'One underlying structure might admit first-person and third-person organizations without reducing either to the other.',
          evidence: 'This is primarily a metaphysical framework; neuroscience constrains but does not directly select it.',
          challenge: 'The neutral base and derivation relations must be specified with enough precision to explain rather than relabel the divide.',
          biology: 'Varies by version.'
        }
      }
    }
  };

  // earlyLabel/earlyPlain are what K-2 reads. "Irreducible cause-effect whole" is
  // not a caption a six-year-old can use; the plain form keeps the same claim.
  var SIGNAL_STAGES = [
    { id: 'input', label: '1. Feedforward signal', plain: 'A signal first moves through sensory pathways.', earlyLabel: '1. A signal comes in', earlyPlain: 'Eyes, ears, or skin send a signal to the brain.' },
    { id: 'recurrence', label: '2. Local return loops', plain: 'Later processing feeds back to earlier sensory areas.', earlyLabel: '2. The signal loops back', earlyPlain: 'The signal goes forward, then comes back to check.' },
    { id: 'global', label: '3. Global availability', plain: 'Information becomes usable by memory, report, planning, and control.', earlyLabel: '3. Shared everywhere', earlyPlain: 'Many brain helpers can use it: memory, words, and choices.' },
    { id: 'metacognition', label: '4. Higher-order representation', plain: 'The system represents itself as being in a mental state.', earlyLabel: '4. Noticing that you noticed', earlyPlain: 'The brain marks "I am seeing this."' },
    { id: 'integration', label: '5. Intrinsic integration', plain: 'The system is analyzed as an irreducible cause-effect whole.', earlyLabel: '5. Working as one whole', earlyPlain: 'One idea asks how well all the parts work together.' },
    { id: 'selfmodel', label: '6. Attention model', plain: 'A simplified model tracks and controls attention.', earlyLabel: '6. A map of attention', earlyPlain: 'The brain keeps a simple map of what it is paying attention to.' }
  ];

  var FOCUS_LABELS = {
    input: 'the first feedforward sweep',
    recurrence: 'the local return loops',
    global: 'the step where information becomes globally available',
    metacognition: 'the higher-order representation step',
    integration: 'the question of intrinsic integration',
    selfmodel: 'the attention model',
    prediction: 'precision-weighted prediction, which operates at every step rather than one of them',
    phenomenal: 'the felt character that no step in this diagram measures',
    biology: 'the physical substrate the whole sequence runs on'
  };

  // One per reading path, shown once under the interpretation grid.
  var ANALYSIS_MOVES = {
    middle: { label: 'Comparison move', text: 'For two of the cards above, name one observation the lens explains and one question it leaves open.' },
    high: { label: 'Comparison move', text: 'For two of the cards above, identify whether the claim targets access, phenomenal character, or report, then name an alternative explanation.' },
    college: { label: 'Operational move', text: 'For two of the cards above, specify the construct, the proxy, the bridge principle, and a result that would discriminate the view.' },
    graduate: { label: 'Research audit', text: 'For two of the cards above, state the auxiliary assumptions, the causal identification strategy, and a preregistered revision condition.' }
  };

  function analysisMoveFor(profile) { return ANALYSIS_MOVES[profile.id] || null; }

  // Empirical cases carry data; thought experiments test implications. The pill
  // used to colour everything but ai-emotion as science, so the philosophical
  // zombie was labelled a scientific case.
  var CASE_KINDS = { zombie: 'thought', 'ai-emotion': 'thought' };

  function caseKindFor(caseId) { return CASE_KINDS[caseId] === 'thought' ? 'thought' : 'empirical'; }

  function stageMatchesTheory(stage, theory) {
    return theory.group === 'science' && (theory.focus || []).indexOf(stage.id) !== -1;
  }

  function journeyNoteForTheory(theory) {
    var stageIds = SIGNAL_STAGES.map(function (stage) { return stage.id; });
    var focus = theory.focus || [];
    var hasStage = focus.some(function (id) { return stageIds.indexOf(id) !== -1; });
    var attaches = focus.map(function (id) { return FOCUS_LABELS[id]; }).filter(Boolean).join(', and ');
    if (theory.group === 'science') {
      if (hasStage) return null;
      return 'This approach does not single out one turning point on this journey. It describes ' + (attaches || 'the whole loop') + '.';
    }
    return 'This view is not a proposal about where on this journey experience appears. It asks what any of these steps would have to be' + (attaches ? ', and it attaches to ' + attaches : '') + '.';
  }

  var SIM_TICKS = 14;
  var SIM_IGNITION_THRESHOLD = 0.5;
  var SIM_STAGE_KEYS = ['sensory', 'recurrent', 'workspace', 'monitor', 'output'];

  var SIM_SUBSTRATES = {
    human: {
      id: 'human', label: 'Human participant', short: 'Human', icon: '🧑',
      plainLabel: 'A person', plainSpace: 'the sharing step',
      blurb: 'A brief target, an optional mask, an attention manipulation, and an optional report task.',
      plainBlurb: 'A picture flashes. Something can cover it up. We can ask the person what they saw.',
      strengthLabel: 'Target strength', interferenceLabel: 'Mask strength', topDownLabel: 'Attention to the target',
      strengthHint: 'How strong the target is when it arrives. It drives the first sweep for the first three steps of the run.',
      interferenceHint: 'How hard the mask interrupts the return loops. Recurrence is damped for the whole run; the first sweep is only partly blocked, which is why it survives a strong mask.',
      topDownHint: 'Gain applied where recurrence feeds the global stage. It changes whether ignition happens, not what arrived.',
      plainStrengthHint: 'Slide right to make the picture clearer.', plainInterferenceHint: 'Slide right to cover more of it up.',
      plainStrengthLabel: 'How clear is the picture?', plainInterferenceLabel: 'How much covers it up?',
      reportLabel: 'Report required', plainReportLabel: 'We ask what they saw',
      reportOnNote: 'The participant rates or describes the target after each trial.',
      plainReportOnNote: 'We are asking the person to tell us about the picture.',
      plainReportOffNote: 'We are not asking. The picture still happens, but nobody has to answer.',
      reportOffNote: 'No-report trial: the target is still presented, but nothing is asked about it.',
      bypassLabel: 'Reduced arousal (sedated state)',
      bypassNote: 'Global coupling is lowered, so local sensory processing can continue while global availability collapses.',
      stages: [
        ['sensory', 'Feedforward sweep', 'Early sensory areas respond to the target.', 'Eyes and first signals'],
        ['recurrent', 'Local recurrence', 'Later areas feed back to earlier ones.', 'Signals loop back'],
        ['workspace', 'Global availability', 'Content becomes usable by memory, planning, and language.', 'Shared with the whole brain'],
        ['monitor', 'Higher-order readout', 'The system represents itself as being in that state.', 'Noticing that you noticed'],
        ['output', 'Report or action', 'A response is produced.', 'Saying or doing something']
      ]
    },
    model: {
      id: 'model', label: 'Language model probe', short: 'Model', icon: '🧮',
      plainLabel: 'A computer program', plainSpace: 'the sharing step',
      blurb: 'A representation inside a tested model, an interfering context, a steering nudge, and an optional request to verbalize.',
      plainBlurb: 'An idea appears inside a computer program. Other words can crowd it out. We can ask the program what it is thinking about.',
      strengthLabel: 'Representation salience', interferenceLabel: 'Distractor interference', topDownLabel: 'Top-down steering',
      strengthHint: 'How salient the representation is in the residual stream when it first appears. It drives input encoding for the first three steps.',
      interferenceHint: 'How much competing context crowds the representation during local mixing. Mixing is damped for the whole run; the encoding step is only partly blocked.',
      topDownHint: 'Steering gain applied where local mixing feeds the verbalizable subspace. It changes whether the content enters the subspace, not what was encoded.',
      plainStrengthHint: 'Slide right to make the idea stronger.', plainInterferenceHint: 'Slide right to crowd it out more.',
      plainStrengthLabel: 'How strong is the idea?', plainInterferenceLabel: 'How much crowds it out?',
      reportLabel: 'Verbal report requested', plainReportLabel: 'We ask what it is thinking',
      reportOnNote: 'The model is asked to state what it is currently representing.',
      plainReportOnNote: 'We are asking the program to tell us about the idea.',
      plainReportOffNote: 'We are not asking. The idea is still there, but nobody has to answer.',
      reportOffNote: 'No-report run: the representation is present, but nothing is asked about it.',
      bypassLabel: 'Non-verbalizable content',
      bypassNote: 'Content the J-lens does not capture: downstream computation continues while the verbalizable marker collapses.',
      stages: [
        ['sensory', 'Input encoding', 'Tokens are embedded into the residual stream.', 'Words go in'],
        ['recurrent', 'Local mixing', 'Attention and MLP blocks recombine nearby content.', 'The model mixes them'],
        ['workspace', 'Verbalizable subspace', 'Content enters the J-lens-defined broadcast subspace.', 'Shared inside the model'],
        ['monitor', 'Self-monitoring readout', 'The model represents its own current content.', 'The model checks itself'],
        ['output', 'Emitted tokens', 'A response is produced.', 'Words come out']
      ]
    }
  };

  function simClamp01(value) { return value < 0 ? 0 : value > 1 ? 1 : value; }

  function simSigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  function normalizeSimConfig(config) {
    var raw = config || {};
    function bounded(value, fallback) {
      var n = typeof value === 'number' ? value : parseFloat(value);
      if (!isFinite(n)) return fallback;
      return Math.max(0, Math.min(100, n));
    }
    return {
      substrate: raw.substrate === 'model' ? 'model' : 'human',
      strength: bounded(raw.strength, 65),
      interference: bounded(raw.interference, 30),
      topDown: bounded(raw.topDown, 45),
      reportRequired: raw.reportRequired !== false,
      bypass: !!raw.bypass
    };
  }

  // Each stage tracks its driver with an instant attack and a slow decay, so a brief stimulus
  // propagates visibly instead of being smoothed away. The workspace stage adds a self-feeding
  // term inside a sigmoid, which is what produces the all-or-none ignition step.
  function runWorkspaceSim(config) {
    var cfg = normalizeSimConfig(config);
    var drive = cfg.strength / 100;
    var mask = cfg.interference / 100;
    var gain = cfg.topDown / 100;
    var coupling = (cfg.substrate === 'human' && cfg.bypass) ? 0.22 : 1;
    var lensOpen = !(cfg.substrate === 'model' && cfg.bypass);
    var rest = simSigmoid(-0.55 * 9);
    var sensory = 0, recurrent = 0, workspace = 0, monitor = 0, output = 0;
    var ticks = [];
    for (var t = 0; t < SIM_TICKS; t++) {
      var pulse = t < 3 ? drive : 0;
      var maskPulse = (t >= 2 && t < 7) ? mask : 0;
      sensory = simClamp01(Math.max(sensory * 0.55, pulse * (1 - maskPulse * 0.45)));
      recurrent = simClamp01(Math.max(recurrent * 0.7, sensory * 0.95 * (1 - mask * 0.85)));
      var wsInput = recurrent * (0.7 + gain * 0.6) * coupling + workspace * 0.5;
      var wsTarget = simClamp01((simSigmoid((wsInput - 0.55) * 9) - rest) / (1 - rest));
      workspace = simClamp01(Math.max(workspace * 0.75, wsTarget));
      monitor = simClamp01(Math.max(monitor * 0.6, workspace * (lensOpen ? 0.9 : 0.12) * (0.62 + gain * 0.38)));
      output = simClamp01(Math.max(output * 0.5, monitor * (cfg.reportRequired ? 0.92 : 0.18)));
      ticks.push({ t: t, sensory: sensory, recurrent: recurrent, workspace: workspace, monitor: monitor, output: output });
    }
    return { config: cfg, ticks: ticks, markers: simMarkers(ticks) };
  }

  function simMarkers(ticks) {
    function peak(key) {
      return ticks.reduce(function (best, tick) { return tick[key] > best ? tick[key] : best; }, 0);
    }
    var peaks = SIM_STAGE_KEYS.map(peak);
    var peakWorkspace = peaks[2];
    var ignitionTick = null;
    for (var i = 0; i < ticks.length; i++) {
      if (ticks[i].workspace >= SIM_IGNITION_THRESHOLD) { ignitionTick = ticks[i].t; break; }
    }
    var downstream = [peakWorkspace, peaks[3], peaks[4]];
    var breadth = downstream.filter(function (value) { return value >= 0.3; }).length / downstream.length;
    // Deliberately a mean-times-spread number: it rises with global spread by construction,
    // which is the point the IIT card makes about why a complexity proxy is not a theory test.
    var mean = peaks.reduce(function (sum, value) { return sum + value; }, 0) / peaks.length;
    var spread = peaks.filter(function (value) { return value >= 0.25; }).length / peaks.length;
    return {
      sensory: peaks[0], recurrence: peaks[1], workspace: peakWorkspace,
      monitor: peaks[3], output: peaks[4],
      ignited: peakWorkspace >= SIM_IGNITION_THRESHOLD, ignitionTick: ignitionTick,
      breadth: breadth, integration: simClamp01(mean * spread)
    };
  }

  function simPercent(value) { return Math.round(value * 100) + '%'; }

  function simTheoryReadout(theory, run) {
    var m = run.markers;
    var cfg = run.config;
    var isModel = cfg.substrate === 'model';
    var space = isModel ? 'the verbalizable subspace' : 'the global workspace';
    if (theory.id === 'gnw') {
      return { met: m.ignited && m.breadth >= 0.66, text: m.ignited
        ? 'Activity in ' + space + ' crossed this model’s ignition threshold at step ' + (m.ignitionTick + 1) + ' and reached ' + Math.round(m.breadth * 3) + ' of 3 downstream stages.'
        : 'Activity in ' + space + ' peaked at ' + simPercent(m.workspace) + ', below this model’s ignition threshold, so the availability criterion is not met on this run.' };
    }
    if (theory.id === 'rpt') {
      return { met: m.recurrence >= 0.45, text: 'Local recurrence peaked at ' + simPercent(m.recurrence) + '. Notice that this marker can stay high while global availability collapses — that dissociation is the whole point of the RPT/GNWT disagreement.' };
    }
    if (theory.id === 'hot') {
      return { met: m.monitor >= 0.4, text: 'The higher-order readout peaked at ' + simPercent(m.monitor) + '. Because the readout here is driven by the workspace stage, this toy cannot separate a constitutive higher-order state from a consequence of access — the same confound the real debate turns on.' };
    }
    if (theory.id === 'ast') {
      return { met: m.monitor >= 0.35 && cfg.topDown >= 30, text: 'Attention weighting was set to ' + cfg.topDown + '% and the self-model readout peaked at ' + simPercent(m.monitor) + '. AST would read this as attention control plus an awareness attribution, not as felt experience.' };
    }
    if (theory.id === 'iit') {
      return { met: null, text: 'Not computed. IIT’s criterion is intrinsic cause-effect structure. The integration index shown here (' + simPercent(m.integration) + ') is a differentiation-times-spread number invented for this toy — it is not Φ, not PCI, and it rises with global spread, which is exactly why a complexity proxy cannot stand in for the theory.' };
    }
    if (theory.id === 'predictive') {
      return { met: null, text: 'No threshold applied. Precision weighting (' + cfg.topDown + '%) changed which content dominated, but predictive accounts describe this entire loop rather than naming a consciousness-specific criterion for it.' };
    }
    if (theory.id === 'functionalism') {
      return { met: null, text: 'Functionalism asks whether the causal organization is the same, not which substrate ran it. Run the other lane with these settings: if the markers match, that is the functionalist’s point — and it still does not settle whether either lane feels anything.' };
    }
    return { met: null, text: 'This is a claim about what consciousness fundamentally is. No number this simulation produces confirms or refutes it, in either lane.' };
  }

  function simConfoundNote(run, simple) {
    var m = run.markers;
    var cfg = run.config;
    if (simple) {
      if (!cfg.reportRequired) {
        return 'Nobody is asking about it now. The last steps got much smaller, but the early steps did not change. So part of what we were measuring was the asking.';
      }
      if (cfg.bypass) {
        return 'The early steps still worked, but the sharing step almost stopped. A machine can be busy without sharing.';
      }
      return 'We are asking about it, so the last step includes the answering, not only the noticing. Turn the button off and see which steps stay.';
    }
    if (!cfg.reportRequired) {
      return 'Report is switched off. The late markers (readout ' + simPercent(m.monitor) + ', output ' + simPercent(m.output) + ') fell while recurrence held at ' + simPercent(m.recurrence) + '. A late marker that disappears when you stop asking for a report was partly measuring the report.';
    }
    if (cfg.bypass && cfg.substrate === 'model') {
      return 'The content is non-verbalizable, so the J-lens marker collapsed to ' + simPercent(m.workspace) + ' while local mixing continued at ' + simPercent(m.recurrence) + '. A lens that only sees verbalizable content will always under-report everything else — that is a selection effect, not an absence.';
    }
    if (cfg.bypass && cfg.substrate === 'human') {
      return 'Arousal is reduced, so global availability fell to ' + simPercent(m.workspace) + ' while the feedforward sweep still reached ' + simPercent(m.sensory) + '. This is the state-versus-content distinction: the machinery ran, and the sharing did not.';
    }
    return 'Report is switched on, so the output marker includes decision, memory, and response processes on top of whatever was experienced. Switch it off and watch which markers survive.';
  }

  // Named experiments. Each preset is a complete control state (not a patch),
  // so applying one always lands on the documented dissociation regardless of
  // what the learner dialled in beforehand.
  var SIM_PRESETS = [
    {
      id: 'clear', icon: '👁️', label: 'Clearly seen trial', plainLabel: 'Easy to see', minLevel: 'early',
      config: { substrate: 'human', strength: 85, interference: 10, topDown: 60, reportRequired: true, bypass: false },
      asks: 'What does an ordinary, unobstructed run look like?',
      note: 'A strong, unmasked target: every marker rises together. This is the easy case every theory explains — which is exactly why it cannot separate them.',
      plainNote: 'A clear picture. Every step lights up.'
    },
    {
      id: 'masked', icon: '🎭', label: 'Backward masking', plainLabel: 'Covered up', minLevel: 'early',
      config: { substrate: 'human', strength: 85, interference: 90, topDown: 60, reportRequired: true, bypass: false },
      asks: 'Can early processing happen without the later stages?',
      note: 'The mask interrupts the loops: the feedforward sweep survives while recurrence and everything after it collapse. RPT and GNWT read this same curve differently.',
      plainNote: 'The cover-up stops the later steps, but the first step still happens.'
    },
    {
      id: 'noreport', icon: '🤫', label: 'No-report paradigm', plainLabel: 'Nobody asks', minLevel: 'middle',
      config: { substrate: 'human', strength: 85, interference: 10, topDown: 60, reportRequired: false, bypass: false },
      asks: 'Which markers were measuring the experience, and which were measuring the asking?',
      note: 'Same stimulus, nothing asked. Watch which late markers fall — whatever disappears was partly measuring the report, not the experience.',
      plainNote: 'The picture still happens, but nobody has to answer. See which steps stay.'
    },
    {
      id: 'sedated', icon: '💤', label: 'Reduced arousal', plainLabel: 'Sleepy brain', minLevel: 'middle',
      config: { substrate: 'human', strength: 85, interference: 10, topDown: 60, reportRequired: true, bypass: true },
      asks: 'Can the machinery run while the sharing stops?',
      note: 'Local sensory processing continues while global availability collapses — the state-versus-content distinction anesthesia research turns on.',
      plainNote: 'The early steps work, but the sharing step almost stops.'
    },
    {
      id: 'threshold', icon: '🎚️', label: 'Right at threshold', plainLabel: 'Almost enough', minLevel: 'middle',
      config: { substrate: 'human', strength: 55, interference: 25, topDown: 45, reportRequired: true, bypass: false },
      asks: 'Is conscious access graded or all-or-none in this model?',
      note: 'Sitting just under ignition. Nudge strength up ten points and the workspace stage jumps rather than creeping — that step is built into the equations, not discovered by them.',
      plainNote: 'Almost enough to switch on. Move the first slider up a little and watch it jump.'
    },
    {
      id: 'non-verbalizable', icon: '🔇', label: 'Non-verbalizable content', plainLabel: 'Cannot say it', minLevel: 'high',
      config: { substrate: 'model', strength: 90, interference: 5, topDown: 50, reportRequired: true, bypass: true },
      asks: 'What does a lens that only sees verbalizable content miss?',
      note: 'Downstream computation continues while the verbalizable marker collapses. An absent reading is evidence about the lens, not proof of an absent representation.',
      plainNote: 'The program keeps working, but it cannot put this part into words.'
    },
    {
      id: 'attention-starved', icon: '🫥', label: 'Attention withdrawn', plainLabel: 'Not paying attention', minLevel: 'high',
      // 60/20 verified: 19% workspace at zero attention, 94% at 60. The prose below
      // claims a dissociation, so the numbers have to actually produce one.
      config: { substrate: 'human', strength: 60, interference: 20, topDown: 0, reportRequired: true, bypass: false },
      asks: 'How much of this model’s ignition is doing the work of attention?',
      note: 'This signal does not ignite while attention is at zero. Raise the attention slider and it does. Whether that makes attention necessary for consciousness, or only for this toy’s workspace stage, is exactly the disputed question.',
      plainNote: 'Nobody is paying attention, so it does not get shared. Move the attention slider up and watch it switch on.'
    }
  ];

  function presetsForProfile(profile) {
    return SIM_PRESETS.filter(function (preset) { return levelAtLeast(profile.id, preset.minLevel || 'early'); });
  }

  // Cases that have a bench setup showing the SAME mechanism. Only cases whose
  // mechanism the toy actually models are listed — a link from a case the bench
  // cannot represent would imply the run says something about it. The zombie and
  // animal-patient cases are deliberately absent for that reason: one is a
  // conceivability argument and the other is cross-species inference, and this
  // model speaks to neither.
  var CASE_BENCH_LINKS = {
    'green-light': { presetId: 'threshold', why: 'The case turns on a target near the detection threshold. The bench has a setting that sits just under ignition, so you can watch the transition it describes.' },
    masking: { presetId: 'masked', why: 'The bench has a masking setting: the feedforward sweep survives while everything after it collapses, which is the dissociation this case asks you to interpret.' },
    dream: { presetId: 'sedated', why: 'The bench can lower global coupling while local processing continues, which is the state-versus-content split this case raises.' },
    jspace: { presetId: 'non-verbalizable', why: 'The bench can hide content from the verbalizable lens while downstream computation continues, which is the method limitation this case turns on.' },
    'ai-emotion': { presetId: 'clear', substrate: 'model', why: 'Run the clear signal on the model lane, then switch lanes: identical markers, and the felt-experience row still reads Not measured. That contrast is what this case is about.' }
  };

  // One worked evidence note per case: a SHAPE to copy, not an answer. The
  // plain register serves K-5; the standard register serves grades 6 and up.
  // Each names the theory it interprets through, so "Cannot show" stays honest.
  var CASE_NOTE_EXAMPLES = {
    'green-light': {
      plain: { theory: 'gnw', observation: 'Maya said "green" and crossed at the right time. A camera sorted the light as green too.', interpretation: 'the sharing idea says Maya noticed the light because the signal was shared with her memory, her words, and her choices.', limit: 'sorting the color right does not show what green looks like from the inside, for Maya or for the camera.' },
      standard: { theory: 'gnw', observation: 'Detection accuracy, confidence, report, and a late widespread signal were all recorded on near-threshold green trials.', interpretation: 'GNWT reads the late widespread signal as the green content becoming globally available for report and rule use.', limit: 'the report task recruits memory and decision processes, so the late signal may partly index responding rather than seeing.' }
    },
    'animal-moral-patient': {
      plain: { theory: 'gnw', observation: 'The dog protected its paw, avoided the sharp place later, and came for comfort.', interpretation: 'the sharing idea says the hurt signal was shared with the dog\'s memory and choices, because it changed what the dog did later.', limit: 'watching the dog does not show whether the paw hurt from the inside. We can still be gentle.' },
      standard: { theory: 'gnw', observation: 'The octopus showed injury-directed behavior, lasting avoidance, and a preference for a context paired with pain relief.', interpretation: 'GNWT reads the flexible, cross-situation use of the injury signal as evidence of broadly available content.', limit: 'flexible use is evidence about access; it does not measure felt pain, so welfare judgments still rest on graded inference.' }
    },
    'ai-emotion': {
      plain: { theory: 'hot', observation: 'The robot said "I am sad" when its battery was low, then asked for help.', interpretation: 'the noticing-you-noticed idea asks whether the robot noticed its own low-battery state, not just reported it.', limit: 'saying sad and acting sad do not show a feeling. That part is still unknown.' },
      standard: { theory: 'functionalism', observation: 'The model detected upset language, shifted priorities toward comfort, and produced a first-person emotion report.', interpretation: 'role functionalism reads a stable causal role across attention, priorities, and report as emotion-like organization.', limit: 'emotion-like organization is not a phenomenal measure; whether anything was felt is not settled by these observations.' }
    },
    masking: {
      plain: { theory: 'rpt', observation: 'The first picture started a brain signal, but the child said they did not see it.', interpretation: 'the loop-back idea says the cover-up stopped the signal from coming back, so the picture was never noticed.', limit: 'saying "I did not see it" is a clue, not proof that nothing at all was seen.' },
      standard: { theory: 'rpt', observation: 'Early feedforward activity survived the mask while later activity and reported awareness were reduced.', interpretation: 'RPT reads the loss of later activity as interrupted recurrence, which it takes to be necessary for seeing.', limit: 'awareness may be graded and the report adds task demands, so a missed report does not establish zero experience.' }
    },
    dream: {
      standard: { theory: 'iit', observation: 'The sleeper was behaviorally unresponsive and later reported a vivid dream.', interpretation: 'IIT reads the later report as evidence that differentiated, integrated intrinsic dynamics can continue without external responsiveness.', limit: 'the report comes after waking, so recall and reconstruction are mixed into the evidence about the dream itself.' }
    },
    zombie: {
      standard: { theory: 'functionalism', observation: 'Nothing was observed: the case stipulates a functional duplicate and stipulates the absence of experience.', interpretation: 'functionalism reads the stipulation as incoherent, because the duplicated causal organization is what it takes experience to be.', limit: 'a thought experiment tests what a view implies; it produces no data, so it cannot settle the dispute either way.' }
    },
    jspace: {
      standard: { theory: 'gnw', observation: 'A J-lens-defined set of representations in tested models was reportable, modulable, causally used in silent reasoning, and broadly connected.', interpretation: 'GNWT reads those functions as hallmarks of access-like global availability within the tested models.', limit: 'the lens is approximate and vendor-authored, covers verbalizable content, and the authors disclaim any finding of experience or feeling.' }
    }
  };

  function caseNoteExampleFor(caseId, profile) {
    var entry = CASE_NOTE_EXAMPLES[caseId];
    if (!entry) return null;
    var plain = profile.id === 'early' || profile.id === 'elementary';
    var example = (plain && entry.plain) || entry.standard || null;
    if (!example || !THEORIES[example.theory]) return null;
    // Only offer a theory the learner can actually pick at this reading path.
    if (availableTheories(profile).map(function (theory) { return theory.id; }).indexOf(example.theory) === -1) return null;
    return example;
  }

  function benchLinkForCase(caseId, profile) {
    var link = CASE_BENCH_LINKS[caseId];
    if (!link) return null;
    var preset = presetsForProfile(profile).filter(function (p) { return p.id === link.presetId; })[0];
    if (!preset) return null;   // preset not offered at this reading path
    return { preset: preset, config: Object.assign({}, preset.config, link.substrate ? { substrate: link.substrate } : {}), why: link.why };
  }

  function simPhenomenalVerdict(simple) {
    return simple
      ? 'Nobody measured a feeling here. All these numbers came from arithmetic we wrote to help us ask questions. They cannot tell us whether anything felt like something.'
      : 'Not measured — in either lane. Every number above is a functional marker produced by arithmetic that was written to illustrate the debate. None of it is evidence about whether anything was felt.';
  }

  var SOURCES = [
    { min: 'early', label: 'Seth & Bayne (2022), Theories of consciousness', url: 'https://www.nature.com/articles/s41583-022-00587-4', note: 'Peer-reviewed overview of major theory families and comparison problems.' },
    { min: 'elementary', label: 'Dehaene & Changeux (2011), Experimental and theoretical approaches to conscious processing', url: 'https://pubmed.ncbi.nlm.nih.gov/21521609/', note: 'Primary GNWT formulation and evidence review.' },
    { min: 'elementary', label: 'Oizumi, Albantakis & Tononi (2014), IIT 3.0', url: 'https://pubmed.ncbi.nlm.nih.gov/24811198/', note: 'Open formal formulation of Integrated Information Theory.' },
    { min: 'middle', label: 'Lamme (2006), Towards a true neural stance on consciousness', url: 'https://pubmed.ncbi.nlm.nih.gov/16997611/', note: 'Recurrent-processing proposal.' },
    { min: 'middle', label: 'Brown, Lau & LeDoux (2019), Higher-order approach', url: 'https://pubmed.ncbi.nlm.nih.gov/31375408/', note: 'Clarifies higher-order theory variants and commitments.' },
    { min: 'middle', label: 'Webb & Graziano (2015), Attention Schema Theory', url: 'https://pubmed.ncbi.nlm.nih.gov/25954242/', note: 'Mechanistic attention-schema proposal.' },
    { min: 'elementary', label: 'Crook (2021), Behavioral and neurophysiological evidence suggests affective pain experience in octopus', url: 'https://pubmed.ncbi.nlm.nih.gov/33733076/', note: 'Primary conditioned-place, injury-directed behavior, and neural evidence relevant to graded pain inference; behavior is not direct access to experience.' },
    { min: 'high', label: 'Cogitate Consortium (2025), adversarial testing of GNWT and IIT', url: 'https://www.nature.com/articles/s41586-025-08888-1', note: 'Preregistered common-ground comparison; some predictions survived and key predictions of both theories were challenged.' },
    { min: 'high', label: 'Stanford Encyclopedia of Philosophy: Consciousness', url: 'https://plato.stanford.edu/entries/consciousness/', note: 'Peer-reviewed philosophical orientation and bibliography.' },
    { min: 'high', label: 'Butlin et al. (2023), Consciousness in Artificial Intelligence', url: 'https://arxiv.org/abs/2308.08708', note: 'Theory-derived indicator framework; indicators are not proof of subjective experience.' },
    { min: 'high', label: 'Gurnee et al. (2026), Verbalizable Representations Form a Global Workspace in Language Models', url: 'https://arxiv.org/abs/2607.15495', note: 'New vendor-authored preprint on Claude J-space; functional access-like results, not evidence of phenomenal experience.' },
    { min: 'college', label: 'Anthropic research summary: A global workspace in language models', url: 'https://www.anthropic.com/research/global-workspace', note: 'Author summary that explicitly states the experiments do not show experience or feeling.' },
    { min: 'graduate', label: 'Tsakiris et al. (2015), no-report paradigms', url: 'https://pubmed.ncbi.nlm.nih.gov/26585549/', note: 'Foundational analysis of reducing, not eliminating, report-related confounds.' }
  ];

  var AWARDED_KEYS = {};

  // ── 3D network view ────────────────────────────────────────────────────
  // The bench already argues that both lanes run identical arithmetic, but you
  // have to read a table to believe it. Drawing the SAME five stage values as a
  // propagating network — laid out two different ways — turns that claim into
  // something you watch instead of something you are told.
  //
  // Every node belongs to one of the five stages, so a population of nodes shows
  // what a single bar cannot: global availability lighting a distributed set at
  // once, versus a J-lens band lighting only its own slice. The positions are
  // SCHEMATIC. Nothing here is anatomy, and the caption says so on screen.
  // Deliberately deep base colours. These spheres take an additive emissive that
  // scales with activation, so a bright base leaves no headroom — every node
  // washes to the same pale wash at high activation and the gradient the whole
  // view exists to show disappears. Dark base, bright glow.
  var NET_STAGE_COLORS = {
    sensory: 0x075985, recurrent: 0x0e7490, workspace: 0x5b21b6, monitor: 0x9d174d, output: 0xb45309
  };
  // Nodes are authored around y=0; the shared viewer's camera looks at y=0.30,
  // so the whole cloud lifts by that much to sit centred in frame.
  var NET_Y_LIFT = 0.30;

  function buildNetworkNodes(substrateId) {
    var nodes = [];
    var i;
    if (substrateId === 'model') {
      // Layer stack: columns are depth, the highlighted band is the J-lens subspace.
      var COLS = 6, ROWS = 4;
      for (var c = 0; c < COLS; c++) {
        for (var r = 0; r < ROWS; r++) {
          var stage;
          if (c <= 1) stage = 'sensory';
          else if (c <= 2) stage = 'recurrent';
          else if (c <= 4) stage = (r === 1 || r === 2) ? 'workspace' : 'recurrent';
          else stage = (r === 1 || r === 2) ? 'monitor' : 'output';
          nodes.push({
            id: 'n-' + c + '-' + r, stage: stage,
            x: (c - (COLS - 1) / 2) * 0.62,
            y: (r - (ROWS - 1) / 2) * 0.52,
            z: 0
          });
        }
      }
      return nodes;
    }
    // Human lane: a schematic posterior→anterior spread. Workspace nodes are
    // deliberately scattered across the whole volume — that distribution IS the
    // claim GNWT makes, so it has to be visible as distribution.
    var LAYOUT = [
      ['sensory', -1.5, -0.25, 0.0], ['sensory', -1.45, 0.3, 0.35], ['sensory', -1.3, -0.05, -0.4],
      ['recurrent', -0.95, 0.1, 0.28], ['recurrent', -0.9, -0.35, -0.22], ['recurrent', -0.75, 0.42, -0.05],
      ['workspace', -0.25, 0.55, 0.3], ['workspace', -0.1, -0.2, -0.45], ['workspace', 0.2, 0.35, -0.15],
      ['workspace', 0.05, -0.55, 0.25], ['workspace', 0.5, 0.0, 0.42], ['workspace', -0.45, -0.05, 0.05],
      ['monitor', 0.95, 0.45, 0.15], ['monitor', 1.05, -0.1, -0.3], ['monitor', 1.2, 0.2, 0.3],
      ['output', 1.55, -0.4, 0.0], ['output', 1.62, 0.15, -0.25]
    ];
    for (i = 0; i < LAYOUT.length; i++) {
      nodes.push({ id: 'n-' + i, stage: LAYOUT[i][0], x: LAYOUT[i][1], y: LAYOUT[i][2], z: LAYOUT[i][3] });
    }
    return nodes;
  }

  // The last tick is fully decayed — everything has drained away — so defaulting
  // the scrubber to the end showed a quiet network and buried the event the view
  // exists to display. Open on the busiest tick instead.
  function peakTickIndex(ticks) {
    var best = 0, bestSum = -1;
    for (var i = 0; i < ticks.length; i++) {
      var sum = 0;
      for (var k = 0; k < SIM_STAGE_KEYS.length; k++) sum += ticks[i][SIM_STAGE_KEYS[k]] || 0;
      if (sum > bestSum) { bestSum = sum; best = i; }
    }
    return best;
  }

  function networkLevels(nodes, tick) {
    var levels = {};
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].stage === 'recurrent' ? 'recurrent' : nodes[i].stage;
      levels[nodes[i].id] = tick ? (tick[key] || 0) : 0;
    }
    return levels;
  }

  var _netViewer = null;
  var _netNodes = [];

  function ensureNetViewer() {
    if (_netViewer) return _netViewer;
    if (!window.StemLab || typeof window.StemLab.makeBayViewer !== 'function') return null;
    _netViewer = window.StemLab.makeBayViewer({
      parts: [],
      home: { yaw: 0.62, pitch: 0.42, dist: 4.1 },
      buildScene: function (THREE, api) {
        var substrateId = (api.sceneProps && api.sceneProps.substrate) || 'human';
        var nodes = buildNetworkNodes(substrateId);
        _netNodes = nodes;
        var meshes = {};
        var picks = [];
        var group = new THREE.Group();
        var geo = new THREE.SphereGeometry(0.15, 20, 14);
        var byStage = {};
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var hex = api.contrast ? 0xffffff : NET_STAGE_COLORS[n.stage];
          var mesh = new THREE.Mesh(geo, api.trim(hex, 44));
          mesh.position.set(n.x, n.y + NET_Y_LIFT, n.z);
          var holder = new THREE.Group();
          holder.add(mesh);
          group.add(holder);
          meshes[n.id] = holder;
          picks.push(mesh);
          (byStage[n.stage] = byStage[n.stage] || []).push(n);
        }
        // Edges run stage to stage, so the picture reads as a pathway rather than
        // a constellation. Dim and unlit on purpose: the nodes carry the signal.
        var order = SIM_STAGE_KEYS;
        // Faint and sparse. Inactive nodes shrink to about half size, which exposes
        // edge segments that a full-size sphere used to hide — at the original
        // weight the graph read as a scribble the moment anything went quiet.
        var lineMat = new THREE.LineBasicMaterial({
          color: api.contrast ? 0xffffff : (api.dark ? 0x334155 : 0xcbd5e1),
          transparent: true, opacity: api.contrast ? 0.85 : 0.30
        });
        for (var s = 0; s < order.length - 1; s++) {
          var from = byStage[order[s]] || [];
          var to = byStage[order[s + 1]] || [];
          for (var a = 0; a < from.length; a++) {
            for (var b = 0; b < to.length; b++) {
              if ((a + b) % 3 !== 0) continue;   // thin it out; a full mesh is noise
              var pts = [new THREE.Vector3(from[a].x, from[a].y + NET_Y_LIFT, from[a].z),
                         new THREE.Vector3(to[b].x, to[b].y + NET_Y_LIFT, to[b].z)];
              group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
            }
          }
        }
        api.scene.add(group);
        return { meshes: meshes, picks: picks, anchor: group };
      }
    });
    return _netViewer;
  }

  // STABLE ref callback. An inline arrow here re-runs attach on every render,
  // which tears down and rebuilds the WebGL context each time.
  function netRefCallback(node) {
    var viewer = ensureNetViewer();
    if (viewer) viewer.attach(node || null);
  }

  function availableTheories(profile) {
    return profile.theoryIds.concat(profile.philosophyIds).map(function (id) { return THEORIES[id]; }).filter(Boolean);
  }

  function levelAtLeast(profileId, minimum) {
    return LEVEL_ORDER.indexOf(profileId) >= LEVEL_ORDER.indexOf(minimum);
  }

  function cap(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : text; }

  // K-2 reads a nickname ("the sharing idea") wherever older paths read the
  // acronym or the formal name. Before this, a six-year-old met "GNWT" in the
  // debate labels and the quiz with nothing on screen that had introduced it.
  function theoryHandle(theory, profile) { return profile.id === 'early' && theory.nick ? theory.nick : theory.short; }
  function theoryTitle(theory, profile) { return profile.id === 'early' && theory.nick ? cap(theory.nick) : theory.name; }

  // Rung glosses for the two youngest paths. The rung names stay (they are the
  // vocabulary being taught); the gloss says what each one means.
  var LADDER_GLOSSES = {
    early: { Established: 'we are quite sure', Suggestive: 'a good clue', Disputed: 'scientists argue about it', Unknown: 'nobody can tell yet' },
    elementary: { Established: 'many findings agree', Suggestive: 'a useful clue, not proof', Disputed: 'experts disagree', Unknown: 'no test can tell yet' }
  };

  // "What this bench cannot show": the full list for high school and up, a
  // shorter plain list for grades 3-8, which used to get no list at all.
  var BENCH_LIMITS_FULL = [
    'The equations were chosen to make the debate legible. They are not fitted to neural data or to any model’s internals, and no parameter here was estimated from a real experiment.',
    'The higher-order readout is driven by the workspace stage, so this toy structurally cannot separate a constitutive higher-order state from a downstream consequence of access.',
    'The integration index is a differentiation-times-spread number invented for this page. It is not Φ, not PCI, and it rises with global spread by construction.',
    'Both lanes are the same five equations with different labels. That the markers converge is a property of the code, not a discovery about substrates.',
    'No setting produces evidence about phenomenal experience, because nothing in the model represents it.'
  ];
  var BENCH_LIMITS_PLAIN = [
    'The numbers come from equations we wrote to make the debate easy to see. They were not measured from any brain or any computer program.',
    'Both lanes use the same equations with different names, so matching results are a fact about the code, not a discovery.',
    'Nothing here measures what anything feels like. The "Felt experience" row stays "Not measured" on every run.'
  ];

  function evidenceItemsFor(profile) {
    var simple = profile.id === 'early';
    var elementary = profile.id === 'elementary';
    var base = [
      { id: 'mask-result', kind: 'evidence', misconception: 'evidence_boundary', text: simple ? 'A picture people said they saw had a different brain signal than a picture they said they missed.' : elementary ? 'In a masking study, reported-seen pictures produced later and wider activity than reported-unseen pictures.' : 'A masking contrast found later, widespread activity for reported-seen stimuli relative to reported-unseen stimuli.', why: simple ? 'Researchers measured this result. It is a clue, even though answering the question may add extra brain activity.' : 'This is an empirical result. Report, decision, memory, and task demands remain alternative contributors.' },
      { id: 'broadcast-proof', kind: 'claim', misconception: 'correlation_to_cause', text: simple ? 'The wide signal is the feeling itself.' : elementary ? 'The later wide signal proves the global workspace theory.' : 'Late frontoparietal activation is identical to phenomenal consciousness.', why: simple ? 'That is an explanation of a clue, not something the measurement showed by itself.' : 'This goes beyond the result. The activity might be prerequisite, mechanism, consequence, or report-related.' },
      { id: 'other-minds', kind: 'question', misconception: 'absolute_claim', text: simple ? 'What does a bat\'s experience feel like?' : elementary ? 'Can a system use information flexibly without feeling anything?' : 'Does access consciousness entail phenomenal consciousness?', why: 'No agreed experiment currently settles this question.' },
      { id: 'pci-result', kind: 'evidence', misconception: 'proxy_to_construct', text: simple ? 'Complex brain responses are often bigger when people are awake than in deep anesthesia.' : elementary ? 'A complexity measure often separates wakefulness from deep anesthesia.' : 'Perturbational Complexity Index often tracks conscious capacity across wakefulness, anesthesia, sleep, and disorders of consciousness.', why: simple ? 'This is a measured pattern. It is not a direct feeling meter.' : 'This is evidence about conscious capacity. PCI is not a direct calculation of IIT\'s Phi and does not uniquely validate IIT.' }
    ];
    if (levelAtLeast(profile.id, 'middle')) {
      base.push(
        { id: 'rpt-sufficient', kind: 'claim', misconception: 'evidence_boundary', text: 'Local recurrent sensory processing is sufficient for phenomenal visual consciousness.', why: 'This is RPT\'s theoretical sufficiency claim. Recurrence-related data are relevant, but the claim itself is not a raw observation.' },
        { id: 'no-report', kind: 'question', misconception: 'report_as_experience', text: 'Which neural signals remain specific to experience after every report, memory, attention, and decision confound is removed?', why: 'No-report designs reduce some confounds but still infer experience indirectly; complete separation remains an open research problem.' }
      );
    }
    if (levelAtLeast(profile.id, 'high')) {
      base.push(
        { id: 'cogitate', kind: 'evidence', misconception: 'evidence_boundary', text: 'A 2025 preregistered adversarial study supported some predictions and challenged key predictions of both GNWT and IIT.', why: 'This is an empirical comparison, not a declaration that either theory is wholly true or false. Bridge assumptions and revised implementations still matter.' },
        { id: 'jspace-interpretation', kind: 'claim', misconception: 'function_to_feeling', text: 'Claude\'s J-space proves that the model has phenomenal consciousness.', why: 'Unsupported inference. The 2026 results concern reportability, modulation, silent reasoning, flexible reuse, and broadcasting - functional access-like properties, not felt experience.' }
      );
    }
    if (levelAtLeast(profile.id, 'college')) {
      base.push({ id: 'proxy-validity', kind: 'question', misconception: 'proxy_to_construct', text: 'Which bridge principle licenses inference from a complexity proxy to a theory\'s constitutive quantity?', why: 'Proxy validity and the mapping from operational measure to formal construct require independent support.' });
    }
    return base;
  }

  function evidenceLadderItemsFor(profile) {
    var copyByLevel = {
      early: {
        brain: ['Sleep, anesthesia, and brain injury can change whether a person wakes, responds, or later reports an experience.', 'Many kinds of observations support a close link between brains and human experience.'],
        complexity: ['A more complex brain response may be a useful clue that experience is possible.', 'The clue is useful, but it is not a direct feeling meter.'],
        frontal: ['A feeling happens only after information is shared across the whole brain.', 'Scientists disagree about whether wide sharing creates the feeling or mainly helps people use and report it.'],
        ai: ['A current AI helper feels emotions from the inside.', 'Words and actions can be observed; an inner feeling has not been established.']
      },
      elementary: {
        brain: ['Changes to the brain during sleep, anesthesia, injury, or stimulation reliably change conscious state or content.', 'Many repeated findings establish brain dependence in humans, but they do not choose one complete theory.'],
        complexity: ['Complex, integrated brain responses may help identify when conscious experience is possible.', 'The pattern is a useful clue, but it does not prove that complexity alone creates experience.'],
        frontal: ['Late, widespread frontal activity is required for every conscious experience.', 'Scientists dispute whether this activity creates experience or mainly supports memory, decisions, and reports.'],
        ai: ['Current AI systems have subjective feelings because they use emotional words.', 'Emotional words and functions are observable; subjective feeling has not been established.']
      },
      middle: {
        brain: ['Sleep, anesthesia, injury, and direct brain stimulation reliably alter conscious capacity or content in humans.', 'Converging observations and interventions establish dependence, while leaving the complete mechanism unresolved.'],
        complexity: ['PCI and related complexity measures often distinguish wakefulness from deep anesthesia or unresponsive states.', 'The association is suggestive of differentiated, integrated dynamics, but the measure is not a direct experience detector.'],
        frontal: ['Late prefrontal ignition is necessary for phenomenal consciousness rather than for reporting it.', 'No-report, lesion, and task studies support competing interpretations, so the necessity claim is disputed.'],
        ai: ['Current AI systems possess phenomenal consciousness or felt emotion.', 'They show language and some access- or emotion-like functions, but no accepted test settles felt experience.']
      },
      high: {
        brain: ['Causal interventions and disruptions involving the human brain reliably alter conscious state or content.', 'This establishes strong brain dependence in humans without identifying one sufficient mechanism or settling metaphysics.'],
        complexity: ['Perturbational and signal-complexity measures track conscious capacity across several clinical and laboratory states.', 'The results are theory-relevant but do not uniquely validate IIT, compute Phi, or establish sufficiency.'],
        frontal: ['Late frontoparietal ignition is necessary for phenomenal consciousness, independent of access and report.', 'Report confounds, no-report designs, lesions, and adversarial predictions leave this stronger claim disputed.'],
        ai: ['Current AI has subjective feeling because it exhibits flexible access-like or emotion-like functions.', 'Functional indicators warrant narrower processing claims; phenomenal consciousness and valence remain unknown.']
      },
      college: {
        brain: ['Human conscious capacity and content exhibit robust intervention-sensitive dependence on brain organization and dynamics.', 'The dependence claim is established at this scope; identity, realization, and theory-specific constitutive claims require further premises.'],
        complexity: ['Operational complexity metrics predict conscious capacity across heterogeneous states and disorders.', 'This supports a family of dynamical hypotheses, but proxy validity and non-unique prediction limit constitutive inference.'],
        frontal: ['Prefrontal global ignition is constitutively necessary for phenomenality rather than access, confidence, or report.', 'Different operationalizations and auxiliary assumptions produce conflicting theory-relative interpretations.'],
        ai: ['Current AI systems possess phenomenal consciousness or felt valence.', 'Access-like computation and some emotion-like capabilities are evidence about function, not a validated phenomenal measure.']
      },
      graduate: {
        brain: ['Within studied humans, interventions on brain state and organization reliably change operational measures and reports of conscious capacity or content.', 'The scoped dependence claim is well supported; extrapolation to a unique causal model, identity thesis, or nonhuman substrate is not included.'],
        complexity: ['Perturbational and endogenous complexity estimators provide cross-state predictive information about conscious capacity.', 'Construct validity, estimator dependence, common-cause structure, and theory non-uniqueness keep the mechanistic inference suggestive.'],
        frontal: ['A late prefrontal ignition variable is causally necessary for phenomenality after conditioning on access, memory, confidence, decision, and report.', 'Existing designs do not yield consensus on that estimand, and bridge principles differ across GNWT implementations and rivals.'],
        ai: ['Current AI systems possess phenomenal consciousness or felt valence.', 'No validated phenomenal criterion or consensus bridge principle currently converts the available functional evidence into that attribution.']
      }
    };
    var copy = copyByLevel[profile.id];
    return [
      {
        id: 'brain-dependence', rung: 'Established', misconception: 'evidence_boundary',
        text: copy.brain[0], why: copy.brain[1]
      },
      {
        id: 'complexity-mechanism', rung: 'Suggestive', misconception: 'proxy_to_construct',
        text: copy.complexity[0], why: copy.complexity[1]
      },
      {
        id: 'frontal-necessity', rung: 'Disputed', misconception: 'compatibility_to_proof',
        text: copy.frontal[0], why: copy.frontal[1]
      },
      {
        id: 'current-ai-feeling', rung: 'Unknown', misconception: 'function_to_feeling',
        text: copy.ai[0], why: copy.ai[1]
      }
    ];
  }

  // Knowledge-check banks. Tuple: [question, options, keyIndex, explanation, misconceptionId].
  // Keys were 27/30 at slot A and usually the longest option, so the check could
  // be passed by "pick A" or "pick the longest" without reading. Slots are now
  // spread within each level and every distractor is written at the key's own
  // specificity. Rewrite distractors, never the key (see tests for the bar).
  function quizFor(profile) {
    var common = {
      early: [
        ['What is evidence?', ['Any idea that sounds good', 'A clue someone measured'], 1, 'Evidence is an observation or measurement.', 'evidence_boundary'],
        ['A bot says, "I am happy." What do we know?', ['It used happy words', 'It feels happy'], 0, 'Words are observable; feeling is not proved by the words.', 'function_to_feeling'],
        ['Which idea says a signal must go forward and then come back before you notice it?', ['The sharing idea', 'The loop-back idea'], 1, 'The loop-back idea (RPT) says the signal has to return before you notice.', null]
      ],
      elementary: [
        ['What does GNWT emphasize?', ['Only the number of stored facts', 'A nonphysical mind', 'Brain-wide sharing'], 2, 'GNWT emphasizes global availability to memory, report, planning, and action.', 'proxy_to_construct'],
        ['Which sentence is an open question?', ['Researchers measured brain activity while people looked at pictures', 'Does using information always come with a feeling?', 'The target lasted 30 milliseconds'], 1, 'Researchers do not agree whether access always entails feeling.', 'absolute_claim'],
        ['What does IIT NOT mean?', ['Cause-and-effect integration matters', 'More intelligence always means more consciousness', 'The whole system can do what its separate parts cannot'], 1, 'IIT is not a simple intelligence or data-size scale.', 'proxy_to_construct'],
        ['An AI gives caring replies. What follows?', ['It performs an emotion-like function', 'It definitely feels care', 'It cannot understand any emotion words'], 0, 'The function is observable; subjective feeling remains unsettled.', 'function_to_feeling']
      ],
      middle: [
        ['Which best describes access consciousness?', ['The felt quality of seeing red, known from the inside', 'Being awake and biologically alive right now', 'Information usable for report and flexible action', 'Scoring highly on an intelligence test'], 2, 'Access concerns availability for reasoning, report, memory, and control.', 'proxy_to_construct'],
        ['Why does PCI not prove IIT?', ['PCI is a proxy and multiple theories can explain complexity', 'PCI records behavior only, never any brain activity', 'IIT explicitly rejects any role for integration', 'Anesthesia never changes the complexity measure in any patient'], 0, 'A useful proxy is not a direct Phi calculation or unique theory test.', 'proxy_to_construct'],
        ['What is a report confound?', ['People usually lie when they report what they saw', 'Brain signals cannot be recorded during a report', 'Only experiences that are put into words count as conscious', 'Answering adds decision, memory, and motor processes'], 3, 'Report tasks recruit processes beyond the experience under study.', 'report_as_experience'],
        ['Which is a functionalist claim?', ['Every chatbot that talks about feelings feels', 'Causal role may constitute a mental state', 'Only carbon-based brains can compute anything', 'Thought experiments count as measurements'], 1, 'Functionalism concerns robust causal organization, not a single display of words.', 'function_to_feeling'],
        ['Which conclusion is calibrated?', ['AI emotion-like behavior does not settle felt emotion', 'Emotional language by itself proves felt valence', 'No artificial system could ever feel anything', 'Access and phenomenal consciousness are identical by definition'], 0, 'The evidence supports a functional description while phenomenality remains open.', 'absolute_claim']
      ],
      high: [
        ['Which result would most directly discriminate GNWT from RPT?', ['Any late activation that correlates with reported seeing across many trials', 'A manipulation separating local recurrence from global broadcast while preserving performance', 'A survey of which theory working researchers currently find most persuasive', 'A recording that shows late frontal activity on every trial where the participant reported seeing'], 1, 'A discriminating test varies the mechanisms the theories distinguish.', 'compatibility_to_proof'],
        ['What did the 2025 GNWT-IIT adversarial study establish?', ['GNWT was proven and IIT was eliminated from serious consideration', 'IIT was proven and GNWT was eliminated from serious consideration', 'Consciousness was pinned to one posterior cortical region for every stimulus that was tested', 'Some predictions of each survived and key predictions of both were challenged'], 3, 'The study did not crown a winner; it refined and challenged predictions.', 'absolute_claim'],
        ['Why is a neural correlate not automatically a mechanism?', ['It may be a prerequisite, consequence, or task process', 'Correlations are never useful evidence about the brain', 'Mechanisms are never neural, so no correlate could be one', 'Only philosophy, not neuroscience, can study causes'], 0, 'Causal role requires more than co-variation.', 'correlation_to_cause'],
        ['What does a philosophical zombie test?', ['Whether unresponsive patients in hospitals lack experience', 'Whether recurrent processing happens in the visual cortex', 'Whether physical/functional duplication without phenomenality is coherent', 'Whether a functional duplicate would show the same PCI reading as the original'], 2, 'It is a thought experiment about implications, not an empirical organism.', 'evidence_boundary'],
        ['What do Claude J-space results support most directly?', ['Proof that the tested models have subjective feeling', 'Some functional access/workspace hallmarks in tested models', 'Proof that the tested models experience emotion', 'A direct, validated measurement of phenomenality in the tested models'], 1, 'Reportability, modulation, reasoning, reuse, and broadcast are access-like functions.', 'function_to_feeling'],
        ['Which AI-emotion inference overreaches?', ['The system produced emotional language', 'The system changed response priorities', 'Functionalists and phenomenal realists may disagree', 'Emotional language alone establishes felt valence'], 3, 'Output style alone does not establish subjective experience.', 'function_to_feeling']
      ],
      college: [
        ['Which is a constitutive rather than merely evidential claim?', ['The model used distress words in its reply', 'A classifier detected valence in the transcript', 'The right causal role makes a state an emotion', 'Users rated the replies as empathetic'], 2, 'Constitutive functionalism says organization makes it that kind of state.', 'evidence_boundary'],
        ['What is the strongest criticism of treating PCI as direct IIT confirmation?', ['It is a theory-relevant proxy, not a direct full-system Phi computation or unique prediction', 'PCI has no relationship to complexity, so it is irrelevant to IIT altogether', 'IIT predicts no differences between conscious states, so PCI cannot bear on it', 'PCI is a questionnaire about expert opinion rather than a perturbational measurement of brain responses'], 0, 'Proxy-to-construct and uniqueness both need validation.', 'proxy_to_construct'],
        ['A no-report paradigm removes which problem completely?', ['All attention confounds, since attention is no longer required', 'All memory confounds, since nothing has to be remembered for a report', 'The other-minds problem, since experience can then be observed directly rather than inferred', 'None; it reduces report demands but still infers experience indirectly'], 3, 'No-report approaches improve designs without making experience directly observable.', 'report_as_experience'],
        ['What makes evidence discriminating?', ['Many competing theories can each accommodate it once the result is already known', 'Competing models predict different outcomes under a controlled manipulation', 'It was collected with expensive, high-resolution imaging equipment', 'It confirms the view the researcher preferred before the study began'], 1, 'Risky, divergent predictions provide stronger comparison.', 'compatibility_to_proof'],
        ['What is warranted by J-space causal interventions?', ['The representations are experienced by the model as words', 'The model has emotions in the same sense that people do', 'Phenomenality has been computationally demonstrated in the model', 'Some workspace-like representations mediate tested functions'], 3, 'Causal functional results remain distinct from phenomenal attribution.', 'function_to_feeling'],
        ['What must an AI-emotion analysis separate?', ['Observed organization, constitutive theory, and experience attribution', 'The words a system emits from the tokens that encode them', 'General intelligence from the computation that implements it', 'Emotional vocabulary size from the total number of tokens the system has generated'], 0, 'These are different empirical and philosophical questions.', 'function_to_feeling']
      ],
      graduate: [
        ['What threatens construct validity in a seen/unseen contrast?', ['Preregistering the contrast before any data are collected', 'Having more than one theory available to interpret the same contrast after the fact', 'Using causal language carefully when describing the contrast', 'Bundled differences in attention, confidence, memory, decision, and report'], 3, 'The contrast may manipulate or measure several constructs at once.', 'proxy_to_construct'],
        ['What is an auxiliary-hypothesis problem?', ['Auxiliary claims are always false, so they should be dropped from every theory', 'A failed marker may target implementation assumptions rather than the theory core', 'Formal theories need no bridge rules because their predictions are already operational', 'All null results prove that the competing theories are empirically equivalent'], 1, 'Inference depends on the bridge from abstract commitments to operations.', 'compatibility_to_proof'],
        ['Which J-space claim is most defensible?', ['The method identifies an approximate verbalizable workspace with access-like functions in tested models', 'The method detects phenomenal qualia directly, because verbalizable content is experienced content by definition', 'The method proves substrate independence by matching the workspace to a human one', 'The method establishes the moral status of current AI systems by demonstrating valence'], 0, 'The narrow model- and method-specific functional claim matches the evidence.', 'function_to_feeling'],
        ['What should an adversarial comparison preregister?', ['Only the favored theory, so the analysis can be tailored to it afterward', 'Participant opinions about consciousness, collected before the experiment', 'Divergent predictions, analysis, auxiliary assumptions, and revision conditions', 'A declared winner before data collection, so the result can be interpreted quickly'], 2, 'Transparent disagreement and revision criteria make the test informative.', 'compatibility_to_proof'],
        ['Why does behavioral equivalence not settle functionalism by itself?', ['Which counterfactual causal grain is constitutive is part of the theory', 'Behavior is never evidence about the organization that produces it', 'Functionalism forbids appeal to behavior when attributing mental states', 'Phenomenality is measured directly, so functional equivalence is beside the point'], 0, 'Surface behavior can underdetermine internal causal organization and constitutive criteria.', 'function_to_feeling'],
        ['What is the calibrated AI-emotion conclusion?', ['Emotion words prove experience, because no system could produce them without feeling', 'Biology has been proven necessary for feeling, because every system known to feel so far has been biological', 'Functions are measurable; their sufficiency for felt valence remains theory-dependent and unresolved', 'Functional roles are irrelevant to emotion, so measuring them settles nothing either way'], 2, 'The conclusion preserves empirical results without smuggling in a contested constitutive premise.', 'absolute_claim']
      ]
    };
    return common[profile.id];
  }

  // ── Theory Map, Prediction Simulator and Portfolio helpers ───────────────
  // Grafted from the parallel Codex-worktree implementation. These are pure
  // (profile/data in, verdict out) and live at MODULE scope so the learning
  // path, the Portfolio, and testHooks can all call them. They used to sit
  // inside the render closure with module-level indentation, which hid the
  // fact that nothing outside the closure could reach them.
  function knowledgeCheckCompleteFor(data, profileId) {
    // checkComplete is what renderCheck writes (per-view map, or a legacy true).
    var flag = data && data.checkComplete;
    if (flag === true || (flag && typeof flag === 'object' && flag[profileId])) return true;
    var answers = data && data.quizAnswers && data.quizAnswers[profileId];
    return !!answers && Object.keys(answers).length >= KNOWLEDGE_CHECK_LENGTHS[profileId];
  }
  function caseAuditFieldsReady(audit, minimum) {
    var record = audit || {};
    return CASE_AUDIT_FIELDS.every(function (field) { return String(record[field] || '').trim().length >= minimum; });
  }
  function completedCaseAuditCount(data) {
    var audits = (data && data.caseAudits) || {};
    return Object.keys(audits).filter(function (key) {
      var audit = audits[key] || {};
      var minimum = Math.max(8, parseInt(audit.minimum, 10) || 8);
      return audit.complete === true && !!audit.theoryId && caseAuditFieldsReady(audit, minimum);
    }).length;
  }
  function experimentMinimumForProfile(profile) {
    return profile.id === 'early' ? 10 : profile.id === 'elementary' ? 18 : profile.id === 'middle' ? 24 : profile.id === 'high' ? 30 : profile.id === 'college' ? 36 : 42;
  }
  function normalizeExperimentSettings(settings) {
    var raw = settings || {};
    var delay = parseInt(raw.maskDelay, 10);
    if (!Number.isFinite(delay)) delay = 80;
    delay = Math.max(20, Math.min(180, Math.round(delay / 20) * 20));
    return {
      maskDelay: delay,
      attention: raw.attention === 'divided' ? 'divided' : 'focused',
      report: raw.report === 'no-report' ? 'no-report' : 'direct-report'
    };
  }
  function experimentPredictionFor(theoryId, profile, rawSettings) {
    var settings = normalizeExperimentSettings(rawSettings);
    var protectedTarget = settings.maskDelay >= 100 && settings.attention === 'focused';
    var delayedMask = settings.maskDelay >= 100;
    var reportFree = settings.report === 'no-report';
    var condition = protectedTarget ? 'The longer delay and focused attention make target processing less vulnerable to the mask.' : settings.attention === 'divided' ? 'Divided attention and masking make stable target processing less likely.' : 'The relatively short target-mask delay makes target processing vulnerable to interruption.';
    var results = {
      gnw: {
        marker: protectedTarget ? 'Global access more likely' : 'Global access less likely',
        core: condition + ' GNWT predicts reportable access when the target crosses an amplification threshold and becomes globally available.',
        limit: reportFree ? 'Without a direct report, any global-availability marker needs an independently validated no-report proxy.' : 'A late widespread signal may include decision, memory, and motor preparation required by the report.'
      },
      rpt: {
        marker: delayedMask ? 'Local recurrence less disrupted' : 'Local recurrence more disrupted',
        core: condition + ' RPT predicts conscious visual content when recurrent sensory processing survives, potentially before broad access or report.',
        limit: 'Behavioral accuracy alone does not identify local recurrence or establish that recurrence is sufficient for phenomenality.'
      },
      iit: {
        marker: 'Intrinsic structure not identified',
        core: 'IIT does not identify consciousness from mask timing or reportability alone. It asks whether the system has the relevant irreducible intrinsic cause-effect structure during the trial.',
        limit: 'This classroom control panel neither calculates Phi nor measures the system at the causal grain required by IIT.'
      },
      hot: {
        marker: protectedTarget ? 'Higher-order availability more plausible' : 'Higher-order availability less plausible',
        core: condition + ' HOT predicts conscious seeing when a suitable higher-order representation targets the first-order visual state.',
        limit: reportFree ? 'A no-report design reduces overt response demands but still needs a valid indicator of higher-order representation.' : 'Confidence and report are relevant measurements, not automatic proof of the constitutive higher-order state.'
      },
      predictive: {
        marker: settings.attention === 'focused' ? 'Target precision weighted more strongly' : 'Target precision weighted less strongly',
        core: 'Predictive approaches expect masking and attention to change the precision-weighted competition between target and mask representations.',
        limit: 'Successful predictive inference is not specific to consciousness; a consciousness theory must add and test a bridge from inference to experience.'
      },
      ast: {
        marker: settings.attention === 'focused' ? 'Stable awareness attribution more likely' : 'Stable awareness attribution less likely',
        core: 'AST predicts awareness reports and control when the system builds a useful simplified model of its attention to the target.',
        limit: reportFree ? 'Removing direct report makes the attention-schema attribution harder to observe and requires a separate behavioral or neural proxy.' : 'An accurate awareness attribution may explain control and report while critics still question phenomenal sufficiency.'
      }
    };
    var result = results[theoryId] || results.gnw;
    if (profile.id === 'early') {
      var earlyCopy = {
        gnw: protectedTarget ? 'This idea expects the picture to be easier to share with many brain jobs.' : 'This idea expects the picture to be harder to share with many brain jobs.',
        rpt: delayedMask ? 'This idea expects returning visual signals to have more time.' : 'This idea expects the mask to interrupt returning visual signals.',
        iit: 'This idea asks how the system works together as one whole. These switches cannot measure that directly.',
        hot: protectedTarget ? 'This idea expects it to be easier for the mind to represent that it saw the picture.' : 'This idea expects it to be harder for the mind to represent that it saw the picture.'
      };
      return { marker: result.marker, prediction: earlyCopy[theoryId] || result.core, limit: result.limit };
    }
    if (profile.id === 'elementary') return { marker: result.marker, prediction: result.core.replace('phenomenality', 'felt experience'), limit: result.limit };
    if (profile.id === 'graduate') return { marker: result.marker, prediction: result.core + ' The forecast depends on operationalization, auxiliary assumptions, and the selected causal grain.', limit: result.limit + ' A preregistered comparison should state the estimand and revision condition.' };
    if (profile.id === 'college') return { marker: result.marker, prediction: result.core + ' Treat this as a model-relative qualitative prediction, not a simulated measurement.', limit: result.limit };
    return { marker: result.marker, prediction: result.core, limit: result.limit };
  }
  function experimentRunCompleteFor(data, profileId) {
    var run = data && data.experimentRuns && data.experimentRuns[profileId];
    var profile = PROFILES[profileId];
    return !!(run && profile && run.revealed === true && EXPERIMENT_THEORY_IDS.indexOf(run.theoryId) !== -1 && run.settings && String(run.preregistered || '').trim().length >= experimentMinimumForProfile(profile));
  }
  function mapAxesForProfile(profile) {
    if (profile.id === 'early') return ['target'];
    if (profile.id === 'elementary') return ['target', 'scale'];
    return ['target', 'scale', 'substrate'];
  }
  function mapReflectionMinimumForProfile(profile) {
    return profile.id === 'early' ? 10 : profile.id === 'elementary' ? 18 : profile.id === 'middle' ? 24 : 30;
  }
  function mapLaneSpecs(axis, profile) {
    var specs = {
      target: [
        ['access', profile.id === 'early' ? 'Sharing and using' : 'Access and global availability', 'Information available for flexible use, report, memory, or control.', 'Ideas here ask how a clue gets shared with many brain helpers.'],
        ['sensory', profile.id === 'early' ? 'Seeing and feeling' : 'Sensory phenomenal content', 'What makes a sensory representation consciously experienced.', 'Ideas here ask what makes seeing or feeling happen at all.'],
        ['integration', profile.id === 'early' ? 'Working as one whole' : 'Intrinsic integration', 'The irreducible cause-effect organization of a system.', 'Ideas here ask how well all the parts of the brain work together.'],
        ['self', profile.id === 'early' ? 'Representing a mental state' : 'Higher-order or self-model', 'Representation of a mental state, attention, or awareness attribution.', 'Ideas here ask how the brain notices its own thinking.'],
        ['inference', 'Perceptual inference', 'How generative inference and precision shape conscious contents.'],
        ['realization', 'Realization conditions', 'Which organization or biological process makes a mental state that kind of state.'],
        ['metaphysical', 'Mind-matter relation', 'What consciousness fundamentally is and how it relates to the physical world.']
      ],
      scale: [
        ['local', 'Local sensory loops', 'Processing within and between nearby sensory areas.'],
        ['global', 'Global availability', 'Broadcast or availability across multiple specialist systems.'],
        ['whole', 'Intrinsic whole-system structure', 'The system considered through its irreducible causal organization.'],
        ['higher', 'Higher-order or model-based', 'A representation of another state, attention, or awareness.'],
        ['distributed', 'Distributed inference', 'Hierarchical and recurrent inference across multiple levels.'],
        ['framework', 'Not a single processing scale', 'A realization or metaphysical framework rather than one neural-scale mechanism.']
      ],
      substrate: [
        ['neural', 'Neural implementation emphasized', 'Current formulations make specific claims about biological neural processing.'],
        ['organizational', 'Organization may generalize', 'The relevant formal or functional organization may not be tied to one material.'],
        ['biological', 'Biology-constrained', 'Specific biological organization is treated as constitutively important.'],
        ['physical', 'Physical realization', 'Consciousness is treated as physical, while realization details may vary by view.'],
        ['nonphysical', 'Nonphysical facts or properties possible', 'A complete physical description may not exhaust consciousness.'],
        ['fundamental', 'Experiential features are fundamental', 'Basic experiential or proto-experiential features are posited at a fundamental level.'],
        ['neutral', 'Neutral-basis framework', 'Mental and physical descriptions derive from a basis characterized as neither exclusively mental nor physical.']
      ]
    };
    return specs[axis] || specs.target;
  }
  function theoryMapPlacementFor(theoryId, axis, profile) {
    var theory = THEORIES[theoryId];
    var placement = THEORY_MAP_PLACEMENTS[theoryId];
    if (!theory || !placement) return null;
    var validAxis = mapAxesForProfile(profile).indexOf(axis) !== -1 ? axis : mapAxesForProfile(profile)[0];
    var laneId = placement[validAxis];
    var lane = mapLaneSpecs(validAxis, profile).filter(function (item) { return item[0] === laneId; })[0];
    var copy = mergeLevelCopy(theory, profile.id);
    var reason = validAxis === 'target' ? (copy.target || copy.claim || copy.summary) : validAxis === 'scale' ? (copy.mechanism || copy.claim || copy.summary) : (copy.biology || copy.claim || copy.summary);
    return { theoryId: theoryId, axis: validAxis, laneId: laneId, laneLabel: lane ? lane[1] : laneId, reason: reason };
  }
  // Are these two lenses even answering the same question? Derived from
  // THEORY_MAP_PLACEMENTS — the same table the Theory Map draws — so Compare
  // and the Map cannot tell the learner different stories. Two views on
  // different explanatory targets are not rivals, and a table of differences
  // does not say so on its own.
  function comparisonRelationFor(aId, bId, profile) {
    var a = THEORY_MAP_PLACEMENTS[aId];
    var b = THEORY_MAP_PLACEMENTS[bId];
    if (!a || !b || aId === bId) return null;
    var lanes = mapLaneSpecs('target', profile);
    function laneLabel(laneId) {
      var lane = lanes.filter(function (item) { return item[0] === laneId; })[0];
      return lane ? lane[1] : laneId;
    }
    var same = a.target === b.target;
    var aLane = laneLabel(a.target);
    var bLane = laneLabel(b.target);
    var early = profile.id === 'early';
    return {
      same: same, aLane: aLane, bLane: bLane,
      heading: same
        ? (early ? 'Both are looking for the same thing' : 'Same explanatory target')
        : (early ? 'These are looking for different things' : 'Different explanatory targets'),
      text: same
        ? (early
          ? 'Both ideas are about ' + aLane.toLowerCase() + '. A clue that fits both does not tell you which one is better.'
          : 'Both are placed on the same target (' + aLane + '), so they are genuine rivals here. A result compatible with both is not discriminating: look for a row where they actually part ways.')
        : (early
          ? 'One idea is about ' + aLane.toLowerCase() + '. The other is about ' + bLane.toLowerCase() + '. They might both be right about their own question.'
          : 'They are placed on different targets (' + aLane + ' vs ' + bLane + '), so they may not be direct rivals: one can be right about its target without the other being wrong. Check whether the rows below disagree or simply answer different questions.')
    };
  }

  function mapCompleteForProfile(data, profile) {
    var session = data && data.mapSessions && data.mapSessions[profile.id];
    return !!(session && (session.interactions || 0) >= 2 && String(session.reflection || '').trim().length >= mapReflectionMinimumForProfile(profile));
  }
  function portfolioMinimumForProfile(profile) {
    return profile.id === 'early' ? 10 : profile.id === 'elementary' ? 18 : profile.id === 'middle' ? 28 : profile.id === 'high' ? 36 : profile.id === 'college' ? 42 : 50;
  }
  function portfolioCompleteForProfile(data, profile) {
    var synthesis = data && data.portfolioSynthesis && data.portfolioSynthesis[profile.id];
    var minimum = portfolioMinimumForProfile(profile);
    return !!(synthesis && PORTFOLIO_FIELDS.every(function (field) { return String(synthesis[field] || '').trim().length >= minimum; }));
  }
  function hasProfileValue(data, scopedKey, profileId) {
    var byProfile = (data && data[scopedKey]) || {};
    return Object.prototype.hasOwnProperty.call(byProfile, profileId);
  }
  function profileText(data, scopedKey, legacyKey, profileId) {
    if (hasProfileValue(data, scopedKey, profileId)) return String(data[scopedKey][profileId] || '');
    return String((data && data[legacyKey]) || '');
  }
  function profileRecord(data, scopedKey, legacyKey, profileId) {
    if (hasProfileValue(data, scopedKey, profileId)) return data[scopedKey][profileId] || {};
    return (data && data[legacyKey]) || {};
  }
  function comparisonMinimumForProfile(profile) { return profile.id === 'early' ? 10 : 20; }
  function comparisonCompleteForProfile(data, profile) {
    return profileText(data, 'compareReflections', 'compareReflection', profile.id).trim().length >= comparisonMinimumForProfile(profile);
  }
  // Same bar as the evidence_sort / evidence_ladder quest hooks, read through
  // the same key tables, so the Portfolio cannot disagree with the tracker.
  // (It used to require *ByProfile keys that no view ever wrote.)
  function evidenceCompleteForProfile(data, profile) {
    var sort = profileRecord(data, 'evidenceAnswersByProfile', 'evidenceAnswers', profile.id);
    var ladder = profileRecord(data, 'evidenceLadderAnswersByProfile', 'evidenceLadderAnswers', profile.id);
    return countCorrect(sort, EVIDENCE_KINDS) >= 4 && countCorrect(ladder, EVIDENCE_LADDER_RUNGS) >= 4;
  }

  // ── Learning path ────────────────────────────────────────────────────────
  // ONE derivation of "what has this learner finished". The path strip under
  // the tabs, the suggested-next-step card, and the Portfolio grid all read
  // this list. A second derivation is how the Portfolio came to ask for a case
  // note that no view could produce and an evidence artifact keyed to state
  // nothing wrote. Order is the suggested sequence, not a lock: every tab
  // stays open, the strip only says what to try next and why.
  // minutes: a rough planning estimate shown on the next-step card and in the
  // facilitator sequence. discuss: one teacher-facing prompt per step that keeps
  // evidence, theory, and open questions separate.
  var PATH_STEPS = [
    { id: 'explore', view: 'learn', label: 'Theory explored', plainLabel: 'Picked a big idea', minutes: 6,
      why: 'Start by naming what needs explaining, then read one theory as a proposal about it.',
      plainWhy: 'Find out what "conscious" can mean, then pick one idea to look at.',
      discuss: 'What would count as evidence that someone noticed something, and what would that evidence still leave out?' },
    { id: 'compare', view: 'compare', label: 'Theory comparison', plainLabel: 'Compared two ideas', minutes: 6,
      why: 'Put two lenses side by side. A difference in what they claim is what a test can use.',
      plainWhy: 'Look at two ideas and say one way they are different.',
      discuss: 'Name one result both theories would predict. Why is that result a weak test?' },
    { id: 'evidence', view: 'evidence', label: 'Evidence calibration', plainLabel: 'Sorted the clues', minutes: 8,
      why: 'Sort statements into evidence, theory, and open question, then place claims by how settled they are.',
      plainWhy: 'Sort the cards: a clue, an idea, or something nobody knows yet.',
      discuss: 'Pick one card the group disagreed on. What would move it from "claim" to "evidence"?' },
    { id: 'bench', view: 'bench', label: 'Workspace Bench run', plainLabel: 'Tried the toy machine', minutes: 8,
      why: 'Run both lanes and one no-report trial to see which markers were measuring the asking.',
      plainWhy: 'Try both machines and turn the asking button off once.',
      discuss: 'Which marker fell when the report was switched off, and what does that say about what it was measuring?' },
    { id: 'case', view: 'cases', label: 'Case evidence note', plainLabel: 'Wrote a clue note', minutes: 6,
      why: 'On one case, separate what was observed from what a theory adds and what it still cannot show.',
      plainWhy: 'For one story, write what we can see and what we still cannot tell.',
      discuss: 'Read a note aloud with the theory sentence removed. Does the observation still stand on its own?' },
    { id: 'debate', view: 'cases', label: 'Guided debate', plainLabel: 'Gave two ideas a fair turn', minutes: 10,
      why: 'Argue two positions fairly, then name the evidence limit and the open question.',
      plainWhy: 'Say what two ideas would say, then what nobody knows yet.',
      discuss: 'Could a supporter of each position accept your account of it? If not, what is missing?' },
    { id: 'map', view: 'map', label: 'Landscape synthesis', plainLabel: 'Used the idea map', minutes: 6,
      why: 'See which theories answer the same question and which only look like rivals.',
      plainWhy: 'See which ideas are looking for the same thing.',
      discuss: 'Find two views that sit near each other on one axis. Are they rivals, or answering different questions?' },
    { id: 'experiment', view: 'experiment', label: 'Prediction preregistration', plainLabel: 'Guessed first', minutes: 8,
      why: 'Commit to a prediction before seeing the forecasts. A prediction made afterward proves nothing.',
      plainWhy: 'Make your guess before you peek at the answers.',
      discuss: 'What did you predict before the reveal, and which forecast would need a different experiment to test?' },
    { id: 'check', view: 'check', label: 'Knowledge check', plainLabel: 'Quick check', minutes: 5,
      why: 'Check that evidence, theory, and open questions stayed separate in your head.',
      plainWhy: 'Answer a few questions to see what stuck.',
      discuss: 'For a missed question, name the pattern. Where else in the lab did that pattern show up?' },
    { id: 'synthesis', view: 'portfolio', label: 'Final synthesis', plainLabel: 'My folder', minutes: 8,
      why: 'State a provisional position with its evidence and what would change your mind.',
      plainWhy: 'Write what you think now, your clues, and what you still wonder.',
      discuss: 'What result would make you revise your claim? If nothing would, it is not yet a scientific claim.' }
  ];

  function learningArtifactsFor(data, profile) {
    var d = data || {};
    var theoryIds = availableTheories(profile).map(function (theory) { return theory.id; });
    var selectedTheory = theoryIds.indexOf(d.selectedTheory) !== -1 ? THEORIES[d.selectedTheory] : null;
    var mapSession = (d.mapSessions && d.mapSessions[profile.id]) || {};
    var experimentRun = (d.experimentRuns && d.experimentRuns[profile.id]) || {};
    var prefix = profile.id + ':';
    var currentAudits = {};
    var currentDebates = {};
    Object.keys(d.caseAudits || {}).forEach(function (key) { if (key.indexOf(prefix) === 0) currentAudits[key] = d.caseAudits[key]; });
    Object.keys(d.caseDebates || {}).forEach(function (key) { if (key.indexOf(prefix) === 0) currentDebates[key] = d.caseDebates[key]; });
    var auditCount = completedCaseAuditCount({ caseAudits: currentAudits });
    var debateCount = completedDebateCount({ caseDebates: currentDebates });
    var evidenceItems = evidenceItemsFor(profile);
    var evidenceAnswers = profileRecord(d, 'evidenceAnswersByProfile', 'evidenceAnswers', profile.id);
    var evidenceCorrect = evidenceItems.reduce(function (score, item) { return score + (evidenceAnswers[item.id] === item.kind ? 1 : 0); }, 0);
    var ladderItems = evidenceLadderItemsFor(profile);
    var ladderAnswers = profileRecord(d, 'evidenceLadderAnswersByProfile', 'evidenceLadderAnswers', profile.id);
    var ladderCorrect = ladderItems.reduce(function (score, item) { return score + (ladderAnswers[item.id] === item.rung ? 1 : 0); }, 0);
    var quiz = quizFor(profile);
    var quizAnswers = (d.quizAnswers && d.quizAnswers[profile.id]) || {};
    var quizCorrect = quiz.reduce(function (score, question, index) { return score + (quizAnswers[index] === question[2] ? 1 : 0); }, 0);
    var flags = d.simFlags || {};
    var benchLeft = [];
    if (!flags.human) benchLeft.push('the human lane');
    if (!flags.model) benchLeft.push('the model lane');
    if (!flags.noReport) benchLeft.push('one no-report trial');
    var synthesis = (d.portfolioSynthesis && d.portfolioSynthesis[profile.id]) || {};
    var minimum = portfolioMinimumForProfile(profile);
    var fieldsReady = PORTFOLIO_FIELDS.filter(function (field) { return String(synthesis[field] || '').trim().length >= minimum; }).length;
    var done = {
      explore: !!selectedTheory,
      compare: comparisonCompleteForProfile(d, profile),
      evidence: evidenceCompleteForProfile(d, profile),
      bench: simCrosscheckDone(d),
      'case': auditCount >= 1,
      debate: debateCount >= 1,
      map: mapCompleteForProfile(d, profile),
      experiment: experimentRunCompleteFor(d, profile.id),
      check: knowledgeCheckCompleteFor(d, profile.id),
      synthesis: portfolioCompleteForProfile(d, profile)
    };
    var early = profile.id === 'early';
    var detail = {
      explore: selectedTheory ? theoryTitle(selectedTheory, profile) : (early ? 'Pick one big idea to look at.' : 'Choose and inspect a theory in Explore.'),
      compare: profileText(d, 'compareReflections', 'compareReflection', profile.id) || (early ? 'Compare two ideas and say one difference.' : 'Compare two theories and record a difference.'),
      evidence: evidenceCorrect + '/' + evidenceItems.length + (early ? ' cards and ' : ' classifications and ') + ladderCorrect + '/' + ladderItems.length + (early ? ' rungs right so far.' : ' ladder placements currently correct.'),
      bench: benchLeft.length
        ? (early ? 'Still to try: a person, a computer program, and turning the asking button off.' : 'Still to run: ' + benchLeft.join(', ') + '.')
        : (early ? 'You tried both machines and turned the asking button off.' : 'Both lanes and a no-report trial have been run.'),
      'case': auditCount >= 1 ? auditCount + (early ? ' clue ' : ' completed case ') + (auditCount === 1 ? 'note' : 'notes') + '.' : (early ? 'Write a clue note for one story.' : 'Complete an observation-interpretation-limit note.'),
      debate: debateCount >= 1 ? debateCount + ' completed ' + (early ? '' : 'structured ') + (debateCount === 1 ? 'debate' : 'debates') + '.' : (early ? 'Give two ideas a fair turn on one story.' : 'Complete two fair positions, evidence, and uncertainty.'),
      map: mapSession.reflection || (early ? 'Try two map buttons and tell what changed.' : 'Inspect two map views and write a synthesis.'),
      experiment: experimentRun.preregistered || (early ? 'Make your guess, then look at the answers.' : 'Preregister and reveal a simulator forecast.'),
      check: quizCorrect + '/' + quiz.length + (early ? ' right so far.' : ' answers currently correct.'),
      synthesis: fieldsReady + '/' + PORTFOLIO_FIELDS.length + (early ? ' parts of the folder written.' : ' reflection fields ready.')
    };
    return PATH_STEPS.map(function (step) {
      return Object.assign({}, step, { done: !!done[step.id], detail: detail[step.id] });
    });
  }

  // Plain text of the whole Portfolio, for handing in. Carries the same
  // epistemic line the screen does, so a pasted summary cannot lose it.
  function portfolioSummaryText(data, profile) {
    var d = data || {};
    var early = profile.id === 'early';
    var artifacts = learningArtifactsFor(d, profile);
    var synthesis = (d.portfolioSynthesis && d.portfolioSynthesis[profile.id]) || {};
    var patterns = misconceptionsFor(d, profile);
    var lines = ['Consciousness Theory Lab / Portfolio summary / ' + profile.label];
    lines.push('Steps done: ' + artifacts.filter(function (a) { return a.done; }).length + '/' + artifacts.length);
    artifacts.forEach(function (a) { lines.push((a.done ? '[x] ' : '[ ] ') + (early && a.plainLabel ? a.plainLabel : a.label) + ': ' + a.detail); });
    lines.push('');
    lines.push((early ? 'What I think now: ' : 'Claim: ') + (String(synthesis.claim || '').trim() || '(not written yet)'));
    lines.push((early ? 'The clues I used: ' : 'Evidence: ') + (String(synthesis.evidence || '').trim() || '(not written yet)'));
    lines.push((early ? 'What I still wonder: ' : 'Uncertainty: ') + (String(synthesis.uncertainty || '').trim() || '(not written yet)'));
    lines.push('');
    lines.push('Patterns to watch: ' + (patterns.length ? patterns.map(function (p) { return p.label + ' (' + p.count + ')'; }).join('; ') : 'none flagged'));
    lines.push('This summary records a learner\'s provisional reasoning. It is not scientific consensus, and no theory is declared the winner.');
    return lines.join('\n');
  }

  // Quest hooks get data only, never a profile, so these ask whether ANY
  // reading path completed the artifact. Without them the host tracker showed
  // seven quests while the learning path tracked ten steps.
  function anyExperimentComplete(data) {
    var runs = (data && data.experimentRuns) || {};
    return Object.keys(runs).some(function (profileId) { return experimentRunCompleteFor(data, profileId); });
  }

  function anyPortfolioComplete(data) {
    var all = (data && data.portfolioSynthesis) || {};
    return Object.keys(all).some(function (profileId) {
      return !!PROFILES[profileId] && portfolioCompleteForProfile(data, PROFILES[profileId]);
    });
  }

  function nextArtifactFor(artifacts) {
    return artifacts.filter(function (artifact) { return !artifact.done; })[0] || null;
  }

  // Every wrong answer currently on screen, grouped by the reasoning pattern it
  // exemplifies. Read by the Knowledge Check and the Portfolio; both show the
  // same list because both call this.
  function misconceptionsFor(data, profile) {
    var d = data || {};
    var hits = {};
    function add(id, where) {
      if (!id || !MISCONCEPTION_LABELS[id]) return;
      var hit = hits[id] || (hits[id] = { id: id, label: MISCONCEPTION_LABELS[id], count: 0, where: [] });
      hit.count += 1;
      if (hit.where.indexOf(where) === -1) hit.where.push(where);
    }
    var sortAnswers = profileRecord(d, 'evidenceAnswersByProfile', 'evidenceAnswers', profile.id);
    evidenceItemsFor(profile).forEach(function (item) {
      if (sortAnswers[item.id] != null && sortAnswers[item.id] !== item.kind) add(item.misconception, 'evidence');
    });
    var ladderAnswers = profileRecord(d, 'evidenceLadderAnswersByProfile', 'evidenceLadderAnswers', profile.id);
    evidenceLadderItemsFor(profile).forEach(function (item) {
      if (ladderAnswers[item.id] != null && ladderAnswers[item.id] !== item.rung) add(item.misconception, 'ladder');
    });
    var quizAnswers = (d.quizAnswers && d.quizAnswers[profile.id]) || {};
    quizFor(profile).forEach(function (question, index) {
      if (quizAnswers[index] != null && quizAnswers[index] !== question[2]) add(question[4], 'check');
    });
    return Object.keys(hits).map(function (id) { return hits[id]; }).sort(function (a, b) {
      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }

  window.StemLab.registerTool('consciousnessLab', {
    label: 'Consciousness Theory Lab',
    title: 'Consciousness Theory Lab',
    icon: '\uD83D\uDCAD',
    desc: 'Compare scientific theories and philosophical views of consciousness through evidence, predictions, and thought experiments.',
    description: 'Compare scientific theories and philosophical views of consciousness through evidence, predictions, and thought experiments.',
    category: 'science',
    color: 'violet',
    gradeRange: 'K-Graduate',
    aliases: ['consciousness', 'mind', 'awareness', 'phenomenal consciousness', 'global workspace', 'integrated information'],
    questDataKey: 'consciousnessLab',
    questHooks: [
      { id: 'compare_theories', label: 'Compare two different theories', icon: '\u2696\uFE0F', check: function (d) { return (d.compareCount || 0) >= 1 && !!d.compareA && !!d.compareB && d.compareA !== d.compareB; }, progress: function (d) { return ((d.compareCount || 0) >= 1 && d.compareA && d.compareB && d.compareA !== d.compareB) ? 'Done!' : '0/1'; } },
      { id: 'evidence_sort', label: 'Correctly classify four claims', icon: '\uD83E\uDDEA', check: function (d) { return countCorrect(d.evidenceAnswers, EVIDENCE_KINDS) >= 4; }, progress: function (d) { return Math.min(4, countCorrect(d.evidenceAnswers, EVIDENCE_KINDS)) + '/4'; } },
      { id: 'evidence_ladder', label: 'Correctly place four claims on the evidence ladder', icon: '\uD83E\uDE9C', check: function (d) { return countCorrect(d.evidenceLadderAnswers, EVIDENCE_LADDER_RUNGS) >= 4; }, progress: function (d) { return Math.min(4, countCorrect(d.evidenceLadderAnswers, EVIDENCE_LADDER_RUNGS)) + '/4'; } },
      { id: 'guided_debate', label: 'Complete a structured two-position debate', icon: '\uD83D\uDDE3\uFE0F', check: function (d) { return completedDebateCount(d) >= 1; }, progress: function (d) { return completedDebateCount(d) >= 1 ? 'Done!' : '0/1'; } },
      { id: 'workspace_bench', label: 'Run the bench on both substrates, including one no-report run', icon: '\uD83D\uDD2C', check: function (d) { return simCrosscheckDone(d); }, progress: function (d) { var f = d.simFlags || {}; return (((f.human ? 1 : 0) + (f.model ? 1 : 0) + (f.noReport ? 1 : 0))) + '/3'; } },
      { id: 'knowledge_check', label: 'Complete the knowledge check', icon: '\u2705', check: function (d) { return completedCheckCount(d) >= 1; }, progress: function (d) { return completedCheckCount(d) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'reflect_ai', label: 'Reflect on AI and emotion', icon: '\uD83E\uDD16', check: function (d) { return String(d.aiReflection || '').trim().length >= 30; }, progress: function (d) { return Math.min(30, String(d.aiReflection || '').trim().length) + '/30 chars'; } },
      { id: 'case_note', label: 'Separate observation, interpretation, and limit on a case', icon: '\uD83D\uDCDD', check: function (d) { return completedCaseAuditCount(d) >= 1; }, progress: function (d) { return completedCaseAuditCount(d) >= 1 ? 'Done!' : '0/1'; } },
      { id: 'preregistration', label: 'Preregister a prediction before revealing the forecasts', icon: '\uD83C\uDFAF', check: function (d) { return anyExperimentComplete(d); }, progress: function (d) { return anyExperimentComplete(d) ? 'Done!' : '0/1'; } },
      { id: 'portfolio_synthesis', label: 'Complete a claim-evidence-uncertainty portfolio', icon: '\uD83D\uDCC2', check: function (d) { return anyPortfolioComplete(d); }, progress: function (d) { return anyPortfolioComplete(d) ? 'Done!' : '0/1'; } }
    ],
    testHooks: {
      resolveProfile: resolveProfile,
      parseGradeNumber: parseGradeNumber,
      availableTheoryIds: function (grade) { return availableTheories(resolveProfile(grade)).map(function (t) { return t.id; }); },
      copyFor: function (theoryId, grade) { return mergeLevelCopy(THEORIES[theoryId], resolveProfile(grade).id); },
      caseIdsFor: function (grade) { return caseIdsForProfile(resolveProfile(grade)).slice(); },
      evidenceLadderLabels: EVIDENCE_LADDER_LABELS.slice(),
      guidedDebateFields: GUIDED_DEBATE_FIELDS.slice(),
      debateMinimumFor: function (grade) { return debateMinimumForProfile(resolveProfile(grade)); },
      debateReadyFor: function (grade, debate) { return debateReadyForProfile(debate, resolveProfile(grade)); },
      evidenceKinds: Object.assign({}, EVIDENCE_KINDS),
      evidenceLadderRungs: Object.assign({}, EVIDENCE_LADDER_RUNGS),
      completedCheckCount: completedCheckCount,
      glossaryFor: glossaryFor,
      simCrosscheckDone: simCrosscheckDone,
      normalizeSimConfig: normalizeSimConfig,
      runWorkspaceSim: runWorkspaceSim,
      simTheoryReadoutFor: function (theoryId, config) { return simTheoryReadout(THEORIES[theoryId], runWorkspaceSim(config)); },
      simSubstrateIds: Object.keys(SIM_SUBSTRATES),
      benchLinkFor: function (caseId, grade) {
        var link = benchLinkForCase(caseId, resolveProfile(grade));
        return link ? { presetId: link.preset.id, config: link.config } : null;
      },
      networkNodesFor: function (substrate) { return buildNetworkNodes(substrate); },
      networkLevelsFor: function (substrate, config, step) {
        var run = runWorkspaceSim(config);
        var idx = step == null ? peakTickIndex(run.ticks) : step;
        return networkLevels(buildNetworkNodes(substrate), run.ticks[idx]);
      },
      peakTickIndexFor: function (config) { return peakTickIndex(runWorkspaceSim(config).ticks); },
      simPresetIdsFor: function (grade) { return presetsForProfile(resolveProfile(grade)).map(function (preset) { return preset.id; }); },
      simPresetById: function (id) { return SIM_PRESETS.filter(function (preset) { return preset.id === id; })[0] || null; },
      journeyStagesFor: function (theoryId) {
        return SIGNAL_STAGES.filter(function (stage) { return stageMatchesTheory(stage, THEORIES[theoryId]); }).map(function (stage) { return stage.id; });
      },
      journeyNoteFor: function (theoryId) { return journeyNoteForTheory(THEORIES[theoryId]); },
      pathStepIds: PATH_STEPS.map(function (step) { return step.id; }),
      learningArtifactsFor: function (grade, data) {
        return learningArtifactsFor(data, resolveProfile(grade)).map(function (artifact) {
          return { id: artifact.id, view: artifact.view, done: artifact.done, label: artifact.label, detail: artifact.detail };
        });
      },
      caseAuditMinimumFor: function (grade) { return caseAuditMinimumForProfile(resolveProfile(grade)); },
      caseAuditReadyFor: function (grade, audit) { return caseAuditReadyForProfile(audit, resolveProfile(grade)); },
      misconceptionsFor: function (grade, data) { return misconceptionsFor(data, resolveProfile(grade)); },
      analysisMoveFor: function (grade) { return analysisMoveFor(resolveProfile(grade)); },
      caseKindFor: caseKindFor,
      caseAskFor: function (theoryId) { return (THEORIES[theoryId] && THEORIES[theoryId].caseAsk) || null; },
      comparisonRelationFor: function (grade, aId, bId) { return comparisonRelationFor(aId, bId, resolveProfile(grade)); },
      quizFor: function (grade) {
        return quizFor(resolveProfile(grade)).map(function (question) {
          return { question: question[0], options: question[1].slice(), correct: question[2], misconception: question[4] || null };
        });
      }
    },
    render: function (ctx) {
      return renderConsciousnessLab(ctx || {});
    }
  });

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_consciousness.js');

  function renderConsciousnessLab(ctx) {
    var React = ctx.React || window.React;
    if (!React || !React.createElement) return null;
    var h = React.createElement;
    var profile = resolveProfile(ctx.gradeLevel || '7th Grade');
    var theories = availableTheories(profile);
    var d = (ctx.toolData && ctx.toolData.consciousnessLab) || {};
    var activeView = ['learn', 'map', 'compare', 'evidence', 'experiment', 'cases', 'bench', 'check', 'portfolio', 'sources'].indexOf(d.activeView) !== -1 ? d.activeView : 'learn';
    var selectedId = theories.some(function (theory) { return theory.id === d.selectedTheory; }) ? d.selectedTheory : theories[0].id;
    var compareA = theories.some(function (theory) { return theory.id === d.compareA; }) ? d.compareA : theories[0].id;
    var compareB = theories.some(function (theory) { return theory.id === d.compareB; }) ? d.compareB : theories[Math.min(1, theories.length - 1)].id;
    if (compareA === compareB && theories.length > 1) compareB = theories[(theories.indexOf(THEORIES[compareA]) + 1) % theories.length].id;

    function patchState(patch, announcement) {
      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function (prev) {
          var root = prev || {};
          var current = Object.assign({}, root.consciousnessLab || {});
          var nextPatch = typeof patch === 'function' ? patch(current) : patch;
          return Object.assign({}, root, { consciousnessLab: Object.assign(current, nextPatch || {}) });
        });
      }
      if (announcement && typeof ctx.announceToSR === 'function') ctx.announceToSR(announcement);
    }

    function selectView(view) {
      patchState({ activeView: view }, viewLabel(view) + ' section selected');
    }

    // Jumps from the path strip land focus in the new section's panel, so a
    // keyboard or screen-reader user is not left on a button that just changed.
    function jumpTo(view) {
      selectView(view);
      if (typeof document !== 'undefined' && window.setTimeout) {
        window.setTimeout(function () {
          var target = document.getElementById('cns-view-panel');
          if (target && typeof target.focus === 'function') target.focus();
        }, 0);
      }
    }

    function handleViewKeyDown(event, index) {
      var nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % VIEWS.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + VIEWS.length) % VIEWS.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = VIEWS.length - 1;
      else return;
      event.preventDefault();
      var nextView = VIEWS[nextIndex][0];
      selectView(nextView);
      if (typeof document !== 'undefined' && window.setTimeout) {
        window.setTimeout(function () {
          var nextTab = document.getElementById('cns-tab-' + nextView);
          if (nextTab && typeof nextTab.focus === 'function') nextTab.focus();
        }, 0);
      }
    }

    function awardOnce(key, points, reason) {
      // AWARDED_KEYS closes the window between a click and the next render, during which
      // `d.awards` is still the stale snapshot and a second click would award twice.
      if ((d.awards && d.awards[key]) || AWARDED_KEYS[key]) return;
      AWARDED_KEYS[key] = true;
      patchState(function (current) {
        var awards = Object.assign({}, current.awards || {});
        awards[key] = true;
        return { awards: awards };
      });
      if (typeof ctx.awardXP === 'function') ctx.awardXP('consciousnessLab', points, reason);
    }

    var dark = !!ctx.isDark;
    var contrast = !!ctx.isContrast;
    var C = contrast ? {
      bg: '#000000', panel: '#000000', raised: '#111111', text: '#ffffff', muted: '#f8fafc', border: '#facc15', accent: '#facc15', accentText: '#000000', science: '#67e8f9', philosophy: '#f9a8d4', good: '#86efac', bad: '#fca5a5', focus: '#ffffff',
      link: '#67e8f9', step: '#facc15', alertBg: '#111111', alertText: '#fca5a5', warn: '#facc15'
    } : dark ? {
      bg: '#0b1020', panel: '#111827', raised: '#172033', text: '#f8fafc', muted: '#cbd5e1', border: '#475569', accent: '#c4b5fd', accentText: '#1e1b4b', science: '#67e8f9', philosophy: '#f9a8d4', good: '#86efac', bad: '#fca5a5', focus: '#fbbf24',
      link: '#93c5fd', step: '#c4b5fd', alertBg: '#172033', alertText: '#fca5a5', warn: '#fbbf24'
    } : {
      bg: '#f8fafc', panel: '#ffffff', raised: '#f5f3ff', text: '#172033', muted: '#475569', border: '#cbd5e1', accent: '#6d28d9', accentText: '#ffffff', science: '#0369a1', philosophy: '#9d174d', good: '#047857', bad: '#b91c1c', focus: '#7c3aed',
      link: '#1d4ed8', step: '#6d28d9', alertBg: '#fef2f2', alertText: '#991b1b', warn: '#92400e'
    };

    injectConsciousnessStyles();

    // [id, icon, label, K-2 label]. "Prediction Simulator" and "Portfolio" are
    // not tab names a six-year-old can steer by; the fourth column is what the
    // youngest path reads, everywhere a view is named.
    var VIEWS = [
      ['learn', '\uD83E\uDDE0', 'Explore', 'Big ideas'],
      ['map', '\uD83D\uDDFA\uFE0F', 'Theory Map', 'Idea map'],
      ['compare', '\u2696\uFE0F', 'Compare', 'Compare two'],
      ['evidence', '\uD83E\uDDEA', 'Evidence Lab', 'Clue sorter'],
      ['experiment', '\uD83C\uDF9B\uFE0F', 'Prediction Simulator', 'Guess first'],
      ['cases', '\uD83D\uDCA1', 'Cases', 'Stories'],
      ['bench', '\uD83D\uDD2C', 'Workspace Bench', 'Toy machine'],
      ['check', '\u2705', 'Knowledge Check', 'Quick check'],
      ['portfolio', '\uD83D\uDCC2', 'Portfolio', 'My folder'],
      ['sources', '\uD83D\uDCDA', 'Sources & Limits', 'Sources']
    ];

    function viewLabel(view) {
      var item = VIEWS.filter(function (entry) { return entry[0] === view; })[0];
      if (!item) return view;
      return profile.id === 'early' && item[3] ? item[3] : item[2];
    }

    function pill(label, kind) {
      var color = kind === 'science' ? C.science : kind === 'philosophy' ? C.philosophy : C.accent;
      return h('span', { className: 'cns-pill', style: { color: color, borderColor: color } }, label);
    }

    function epistemicBox(kind, title, body) {
      var meta = {
        evidence: ['EVIDENCE', C.science],
        claim: ['THEORY CLAIM', C.accent],
        // Was a hard-coded #d97706, which is 2.90:1 on the light raised surface —
        // an AA failure for a 9px bold label. Themed like every other accent.
        question: ['OPEN QUESTION', C.warn],
        thought: ['THOUGHT EXPERIMENT', C.philosophy],
        caution: ['LIMIT', C.bad]
      }[kind] || ['NOTE', C.muted];
      return h('div', { className: 'cns-epistemic', style: { borderLeftColor: meta[1], background: C.raised } },
        h('div', { className: 'cns-epistemic-label', style: { color: meta[1] } }, meta[0]),
        title && h('strong', { style: { color: C.text } }, title),
        h('p', { style: { color: C.muted } }, body)
      );
    }

    function renderHeader() {
      return h(React.Fragment, null,
        h('a', { href: '#cns-main', className: 'cns-skip' }, 'Skip to Consciousness Theory Lab content'),
        h('header', { className: 'cns-hero', style: { borderColor: C.border } },
          h('div', { className: 'cns-hero-icon', 'aria-hidden': 'true' }, '\uD83D\uDCAD'),
          h('div', { className: 'cns-hero-copy' },
            h('div', { className: 'cns-kicker' }, 'STEM LAB \u00B7 BRAIN, MIND & PHILOSOPHY'),
            h('h1', null, 'Consciousness Theory Lab'),
            h('p', null, 'Compare what theories propose, what evidence shows, and what remains unresolved.'),
            h('div', { className: 'cns-badges' },
              h('span', { className: 'cns-grade-badge', 'data-grade-profile': profile.id }, profile.label),
              h('span', { className: 'cns-neutral-badge' }, 'Neutral comparison \u00B7 no theory declared the winner')
            )
          )
        ),
        h('div', { className: 'cns-grade-note', style: { background: C.raised, borderColor: C.border }, role: 'note' },
          h('strong', null, 'Reading path: ' + profile.shortLabel + '.'),
          ' This selection changes vocabulary, theory count, examples, evidence limits, and questions - ', profile.tone, '.'
        ),
        h('nav', { className: 'cns-tabs', role: 'tablist', 'aria-label': 'Consciousness Theory Lab sections' },
          VIEWS.map(function (item, index) {
            var active = activeView === item[0];
            return h('button', {
              key: item[0], type: 'button', id: 'cns-tab-' + item[0], role: 'tab',
              // Only the active panel is rendered, so every tab points at the one panel that exists.
              'aria-selected': active ? 'true' : 'false', 'aria-controls': 'cns-view-panel',
              tabIndex: active ? 0 : -1,
              onKeyDown: function (event) { handleViewKeyDown(event, index); },
              onClick: function () { selectView(item[0]); },
              style: active ? { background: C.accent, color: C.accentText, borderColor: C.accent } : { background: C.panel, color: C.text, borderColor: C.border }
            }, h('span', { 'aria-hidden': 'true' }, item[1]), viewLabel(item[0]));
          })
        )
      );
    }

    function panel(content) {
      return h('section', {
        id: 'cns-view-panel', role: 'tabpanel', 'aria-labelledby': 'cns-tab-' + activeView, tabIndex: -1,
        className: 'cns-view', style: { background: C.panel, borderColor: C.border }
      }, content);
    }

    // The path strip. Not a lock: every tab stays open. It says which step is
    // suggested next and why, and jumps there. Ten tabs with no order was the
    // single biggest "where do I start" cost in this lab.
    function renderLearningPath() {
      if (activeView === 'portfolio') return null;   // the Portfolio shows the full grid itself
      var early = profile.id === 'early';
      var artifacts = learningArtifactsFor(d, profile);
      var doneCount = artifacts.filter(function (artifact) { return artifact.done; }).length;
      var next = nextArtifactFor(artifacts);
      var nextHere = !!next && next.view === activeView;
      function labelFor(artifact) { return early && artifact.plainLabel ? artifact.plainLabel : artifact.label; }
      return h('nav', { className: 'cns-progress', 'aria-label': 'Learning path', style: { background: C.raised, borderColor: C.border } },
        h('div', { className: 'cns-progress-heading' },
          h('strong', null, early ? 'My path' : 'Learning path'),
          h('span', { role: 'status' }, doneCount + ' of ' + artifacts.length + (early ? ' done' : ' steps done'))
        ),
        h('ol', null, artifacts.map(function (artifact, index) {
          var isNext = !!next && next.id === artifact.id;
          var here = artifact.view === activeView;
          return h('li', {
            key: artifact.id,
            className: (artifact.done ? 'is-complete' : '') + (isNext ? ' is-next' : ''),
            'aria-current': isNext ? 'step' : undefined
          },
            h('button', {
              type: 'button', title: artifact.detail,
              'aria-label': (index + 1) + '. ' + labelFor(artifact) + (artifact.done ? ', done' : isNext ? ', suggested next' : '') + (here ? ', in this section' : ''),
              onClick: function () { jumpTo(artifact.view); }
            }, h('span', { 'aria-hidden': 'true' }, artifact.done ? '\u2713' : String(index + 1)), h('span', null, labelFor(artifact)))
          );
        })),
        next
          ? h('div', { className: 'cns-next-step', style: { background: C.panel, borderColor: C.border } },
              h('div', null,
                h('div', { className: 'cns-next-kicker' }, early ? 'TRY THIS NEXT' : 'SUGGESTED NEXT STEP'),
                h('h2', null, labelFor(next)),
                h('p', null, early && next.plainWhy ? next.plainWhy : next.why),
                h('span', { className: 'cns-next-detail' }, next.detail)
              ),
              h('div', { className: 'cns-next-actions' },
                h('span', { className: 'cns-next-time' }, 'About ' + next.minutes + ' min'),
                nextHere
                  ? h('span', { className: 'cns-next-here' }, early ? 'It is on this page.' : 'It is in this section.')
                  : h('button', { type: 'button', className: 'cns-next-action', onClick: function () { jumpTo(next.view); }, style: { background: C.accent, color: C.accentText, borderColor: C.accent } }, 'Go to ' + viewLabel(next.view))
              )
            )
          : h('div', { className: 'cns-next-step', style: { background: C.panel, borderColor: C.good } },
              h('div', null,
                h('div', { className: 'cns-next-kicker' }, 'PATH COMPLETE'),
                h('h2', null, early ? 'You did every step' : 'Every step on the path is done'),
                h('p', null, early ? 'Go back to any page, or add more to your folder.' : 'Revisit any section, or restate your position in the Portfolio now that every activity has fed into it.')
              )
            )
      );
    }

    // Wrong answers currently on screen, named by reasoning pattern. Shown by
    // the Knowledge Check and the Portfolio; both read misconceptionsFor().
    function renderMisconceptionSummary() {
      var early = profile.id === 'early';
      var patterns = misconceptionsFor(d, profile);
      var whereLabel = { evidence: viewLabel('evidence'), ladder: viewLabel('evidence') + ' ladder', check: viewLabel('check') };
      return h('section', { className: 'cns-misconception-summary', 'aria-labelledby': 'cns-patterns-title', style: { background: C.raised, borderColor: C.border } },
        h('h3', { id: 'cns-patterns-title' }, early ? 'Ideas to look at again' : 'Patterns to watch'),
        h('p', null, patterns.length
          ? (early ? 'These answers are not right yet. Each one shows a mix-up worth talking about.' : 'Each answer still wrong on screen points at a named reasoning pattern. Fix the answer and the pattern clears.')
          : (early ? 'Nothing to fix right now.' : 'No patterns flagged: every answer currently on screen is calibrated.')),
        patterns.length ? h('ul', null, patterns.map(function (pattern) {
          return h('li', { key: pattern.id },
            h('strong', null, pattern.label),
            h('span', null, pattern.count + (pattern.count === 1 ? ' answer' : ' answers') + ' \u00B7 ' + pattern.where.map(function (where) { return whereLabel[where]; }).join(', '))
          );
        })) : null
      );
    }

    function renderLearn() {
      var selected = THEORIES[selectedId];
      var copy = mergeLevelCopy(selected, profile.id);
      // Fall back to the first term so the panel always shows one definition
      // rather than an empty slot, and so a stale selection from another grade
      // path cannot leak into this one.
      var selectedVocab = profile.vocabulary.indexOf(d.selectedVocab) !== -1 ? d.selectedVocab : profile.vocabulary[0];
      var selectedGlossary = glossaryFor(selectedVocab);
      // The scope note says the two families are "separated below". They were
      // in one flat grid, so the note described a separation the page did not
      // have. Group them for real; heading only when both groups are present.
      var theoryGroups = [
        { id: 'science', label: profile.id === 'early' ? 'Science ideas' : 'Scientific models', theories: theories.filter(function (theory) { return theory.group === 'science'; }) },
        { id: 'philosophy', label: profile.id === 'early' ? 'Big questions' : 'Philosophical views', theories: theories.filter(function (theory) { return theory.group === 'philosophy'; }) }
      ].filter(function (group) { return group.theories.length > 0; });
      return panel(h(React.Fragment, null,
        h('section', { 'aria-labelledby': 'cns-foundations-title' },
          h('div', { className: 'cns-section-heading' },
            h('div', null, h('span', { className: 'cns-step' }, 'START HERE'), h('h2', { id: 'cns-foundations-title' }, 'What are we trying to explain?')),
            pill(profile.vocabulary.length + ' focus terms', 'note')
          ),
          h('p', { className: 'cns-lead' }, profile.intro),
          h('div', { className: 'cns-target-grid' }, profile.targets.map(function (target, index) {
            return h('article', { key: target[0], className: 'cns-target', style: { background: C.raised, borderColor: C.border } },
              h('span', { className: 'cns-target-number', 'aria-hidden': 'true' }, index + 1),
              h('h3', null, target[0]), h('p', null, target[1])
            );
          })),
          h('div', { className: 'cns-vocab', 'aria-label': 'Vocabulary for this grade path' },
            h('strong', null, 'Vocabulary: '),
            // Buttons, not spans: selecting a term reveals its definition and
            // example below. A real <button> also gets keyboard operation and
            // focus for free, which an inert <span> never had.
            profile.vocabulary.map(function (word) {
              var active = word === selectedVocab;
              return h('button', {
                key: word, type: 'button', 'aria-pressed': active ? 'true' : 'false',
                onClick: function () { patchState({ selectedVocab: word }, word + ' definition selected'); },
                style: { borderColor: active ? C.accent : C.border, background: active ? C.accent : C.raised, color: active ? C.accentText : C.text }
              }, word);
            })
          ),
          selectedGlossary && h('article', { className: 'cns-glossary-detail', style: { background: C.raised, borderColor: C.accent }, 'aria-live': 'polite' },
            h('span', { className: 'cns-step' }, profile.id === 'early' ? 'WORD EXPLORER' : 'INTERACTIVE GLOSSARY'),
            h('h3', null, selectedGlossary.term),
            h('p', null, selectedGlossary.definition),
            h('p', { className: 'cns-glossary-example' }, h('strong', null, 'Example: '), selectedGlossary.example)
          ),
          epistemicBox('caution', 'Important distinction', levelAtLeast(profile.id, 'middle')
            ? 'Attention, intelligence, report, responsiveness, and consciousness are related, but none is simply a synonym for another. Behavioral unresponsiveness does not prove absence of experience.'
            : 'Speaking, moving, or being very smart can give clues, but no single clue tells us everything about another mind.')
        ),
        h('hr', { style: { borderColor: C.border } }),
        h('section', { 'aria-labelledby': 'cns-theory-title' },
          h('div', { className: 'cns-section-heading' },
            h('div', null, h('span', { className: 'cns-step' }, 'THEORY LENSES'), h('h2', { id: 'cns-theory-title' }, 'Choose an explanation to inspect')),
            h('span', { className: 'cns-count' }, theories.length + ' views at this level')
          ),
          levelAtLeast(profile.id, 'middle') && h('p', { className: 'cns-scope-note' }, 'Scientific models propose mechanisms or information-processing conditions. Philosophical views ask what consciousness fundamentally is. They are separated below because they are not one-for-one rivals.'),
          theoryGroups.map(function (group) {
            return h('div', { key: group.id, className: 'cns-theory-group' },
              theoryGroups.length > 1 && h('h3', { className: 'cns-theory-group-title', id: 'cns-theory-group-' + group.id }, group.label + ' (' + group.theories.length + ')'),
              h('div', {
                className: 'cns-theory-grid', role: 'group',
                'aria-labelledby': theoryGroups.length > 1 ? 'cns-theory-group-' + group.id : undefined,
                'aria-label': theoryGroups.length > 1 ? undefined : group.label
              }, group.theories.map(function (theory) {
                var isSelected = theory.id === selectedId;
                var theoryCopy = mergeLevelCopy(theory, profile.id);
                return h('button', {
                  key: theory.id, type: 'button', className: 'cns-theory-card',
                  'aria-pressed': isSelected ? 'true' : 'false',
                  onClick: function () { patchState({ selectedTheory: theory.id }, theoryTitle(theory, profile) + ' selected'); },
                  style: { background: isSelected ? C.raised : C.panel, borderColor: isSelected ? C.accent : C.border, color: C.text }
                },
                  h('span', { className: 'cns-theory-icon', 'aria-hidden': 'true' }, theory.icon),
                  h('span', { className: 'cns-theory-name' }, theoryTitle(theory, profile)),
                  profile.id === 'early' && theory.nick && h('span', { className: 'cns-theory-formal' }, theory.name),
                  pill(theory.group === 'science' ? 'Scientific model' : 'Philosophical view', theory.group),
                  h('span', { className: 'cns-theory-summary' }, theoryCopy.summary)
                );
              }))
            );
          }),
          // No aria-live here: announceToSR already names the selection, and marking this whole
          // article live made screen readers re-read the entire detail block on every click.
          h('article', { className: 'cns-detail', style: { background: C.raised, borderColor: C.accent } },
            h('div', { className: 'cns-detail-title' }, h('span', { 'aria-hidden': 'true' }, selected.icon), h('div', null, pill(selected.group === 'science' ? 'SCIENTIFIC MODEL' : 'PHILOSOPHICAL VIEW', selected.group), h('h3', null, theoryTitle(selected, profile)), profile.id === 'early' && selected.nick && h('span', { className: 'cns-theory-formal' }, selected.name))),
            h('p', { className: 'cns-detail-summary' }, copy.summary),
            h('div', { className: 'cns-epistemic-grid' },
              epistemicBox('claim', 'What it proposes', copy.claim || copy.mechanism || copy.summary),
              epistemicBox('evidence', 'What researchers examine', copy.evidence || 'This view is primarily philosophical; empirical findings can constrain it without directly proving it.'),
              epistemicBox('question', 'What remains unresolved', copy.challenge)
            ),
            copy.example && epistemicBox(selected.group === 'philosophy' ? 'thought' : 'note', 'Example', copy.example),
            copy.misconception && h('p', { className: 'cns-misconception' }, h('strong', null, 'Does not mean: '), copy.misconception)
          )
        ),
        h('hr', { style: { borderColor: C.border } }),
        renderSignalJourney(selected)
      ));
    }

    function renderSignalJourney(selected) {
      var journeyNote = journeyNoteForTheory(selected);
      return h('section', { 'aria-labelledby': 'cns-journey-title' },
        h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'MODEL, NOT A LITERAL MAP'), h('h2', { id: 'cns-journey-title' }, 'One signal, several proposed turning points'))),
        h('p', { className: 'cns-lead' }, profile.id === 'early'
          ? 'Theories point to different places where a clue might become something you notice.'
          : 'This learning diagram places several proposals on one processing journey. Real neural dynamics overlap; the sequence is an analogy, not an anatomical claim.'),
        h('ol', { className: 'cns-journey' }, SIGNAL_STAGES.map(function (stage) {
          var match = stageMatchesTheory(stage, selected);
          return h('li', { key: stage.id, className: match ? 'is-focus' : '', style: { background: match ? C.raised : C.panel, borderColor: match ? C.accent : C.border } },
            h('strong', null, profile.id === 'early' && stage.earlyLabel ? stage.earlyLabel : stage.label),
            h('span', { className: 'cns-journey-plain' }, profile.id === 'early' && stage.earlyPlain ? stage.earlyPlain : stage.plain),
            match && h('span', { className: 'cns-focus-tag', style: { background: C.accent, color: C.accentText } }, profile.id === 'early' ? 'This idea points here' : selected.short + ' emphasizes this')
          );
        })),
        journeyNote && h('p', { className: 'cns-journey-note', style: { background: C.raised, borderColor: C.border, color: C.muted } }, journeyNote)
      );
    }

    function renderCompare() {
      var a = THEORIES[compareA];
      var b = THEORIES[compareB];
      var ac = mergeLevelCopy(a, profile.id);
      var bc = mergeLevelCopy(b, profile.id);
      var compareRelation = comparisonRelationFor(compareA, compareB, profile);
      var rowLabels = {
        claim: 'Core proposal', target: 'Main target', mechanism: 'Proposed mechanism', prediction: 'Distinctive prediction',
        example: 'Concrete example', evidence: 'Relevant evidence', challenge: 'Unresolved challenge', biology: 'Role of biology / substrate'
      };
      var fallback = {
        claim: 'This view does not state a separate core proposal at this reading level.',
        target: 'This view does not isolate one target at this reading level.',
        mechanism: 'See the core proposal.', prediction: 'A more precise prediction is introduced at a later level.',
        example: 'No worked example is introduced for this view at this reading level.',
        evidence: 'No distinct evidence line is introduced for this view at this reading level.',
        challenge: 'No distinct challenge is introduced for this view at this reading level.',
        biology: 'The view does not settle this question by itself.'
      };
      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'SIDE BY SIDE'), h('h2', null, 'Theory Lens Comparator')),
          pill('Same question \u2260 same answer', 'note')
        ),
        h('p', { className: 'cns-lead' }, profile.id === 'early'
          ? 'Pick two ideas. Look for one way they are alike and one way they differ.'
          : 'Select two views and compare explanatory target, mechanism, evidence, and limitations. A shared finding is not automatically discriminating evidence.'),
        h('div', { className: 'cns-compare-pickers' },
          h('label', null, h('span', null, 'First lens'), h('select', { value: compareA, onChange: function (e) { var value = e.target.value; patchState(function (current) { return { compareA: value, compareB: current.compareB || compareB, compareCount: (current.compareCount || 0) + 1 }; }, 'First comparison lens changed'); } },
            theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theoryTitle(theory, profile)); })
          )),
          h('span', { className: 'cns-vs', 'aria-hidden': 'true' }, 'VS'),
          h('label', null, h('span', null, 'Second lens'), h('select', { value: compareB, onChange: function (e) { var value = e.target.value; patchState(function (current) { return { compareB: value, compareA: current.compareA || compareA, compareCount: (current.compareCount || 0) + 1 }; }, 'Second comparison lens changed'); } },
            theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theoryTitle(theory, profile)); })
          ))
        ),
        compareA === compareB && h('p', { className: 'cns-alert', role: 'alert' }, 'Choose two different lenses for a useful comparison.'),
        compareRelation && h('div', { className: 'cns-compare-relation', style: { background: C.raised, borderColor: compareRelation.same ? C.accent : C.science } },
          h('strong', null, compareRelation.heading), h('p', null, compareRelation.text)),
        h('div', { className: 'cns-table-wrap' },
          h('table', { className: 'cns-compare-table' },
            h('caption', null, theoryTitle(a, profile) + ' compared with ' + theoryTitle(b, profile) + ' for ' + profile.shortLabel),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Question'), h('th', { scope: 'col' }, theoryTitle(a, profile)), h('th', { scope: 'col' }, theoryTitle(b, profile)))),
            h('tbody', null, profile.compareRows.map(function (row) {
              // Never fall through to the summary: it would appear under a row label it does not answer.
              return h('tr', { key: row }, h('th', { scope: 'row' }, rowLabels[row]), h('td', null, ac[row] || fallback[row]), h('td', null, bc[row] || fallback[row]));
            }))
          )
        ),
        epistemicBox('caution', 'Comparison rule', levelAtLeast(profile.id, 'high')
          ? 'A theory can match a result because of an auxiliary assumption rather than its core claim. Ask which alternative models predict the same observation and what result would separate them.'
          : 'One result can be a clue for more than one idea. A fair test looks for a result where the ideas expect different things.'),
        h('div', { className: 'cns-compare-challenge', style: { background: C.raised, borderColor: C.border } },
          h('h3', null, profile.id === 'early' ? 'Say the difference' : 'Your comparison move'),
          h('p', null, profile.id === 'early'
            ? 'Finish: "The first idea focuses on ___, but the second idea focuses on ___."'
            : profile.id === 'elementary'
              ? 'Name one difference in what the two views say makes information conscious. Then name one finding that could fit both.'
              : profile.id === 'middle'
                ? 'Which lens focuses more on access, which on felt experience, and what observation would not decide between them?'
                : profile.id === 'high'
                  ? 'Identify one necessary-or-sufficient claim, one report confound, and one discriminating prediction.'
                  : 'Sketch a preregistered manipulation that holds performance constant while separating the two models\' predicted mechanisms.'),
          // Stored per reading path (the prompt above differs by path), read with
          // the legacy flat key as fallback so an older save is not lost.
          h('textarea', { value: profileText(d, 'compareReflections', 'compareReflection', profile.id), onChange: function (e) {
            var value = e.target.value;
            patchState(function (current) {
              var byProfile = Object.assign({}, current.compareReflections || {});
              byProfile[profile.id] = value;
              return { compareReflections: byProfile };
            });
          }, rows: 4, 'aria-label': 'Theory comparison reflection', placeholder: 'Write your comparison here...' }),
          h('p', { className: 'cns-debate-requirement' }, 'Write at least ' + comparisonMinimumForProfile(profile) + ' characters to log this comparison on your path.'),
          comparisonCompleteForProfile(d, profile) && h('p', { className: 'cns-debate-complete', role: 'status', style: { color: C.good } }, 'Comparison logged \u2713')
        )
      ));
    }

    function getEvidenceItems() { return evidenceItemsFor(profile); }

    function getEvidenceLadderItems() { return evidenceLadderItemsFor(profile); }

    function renderEvidenceLadder() {
      var items = getEvidenceLadderItems();
      var answers = d.evidenceLadderAnswers || {};
      var placed = Object.keys(answers).filter(function (id) { return items.some(function (item) { return item.id === id; }); }).length;
      var correct = items.reduce(function (score, item) { return score + (answers[item.id] === item.rung ? 1 : 0); }, 0);
      return h('section', { className: 'cns-ladder', 'aria-labelledby': 'cns-ladder-title', style: { borderColor: C.border, background: C.raised } },
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'EVIDENCE LADDER'), h('h3', { id: 'cns-ladder-title' }, 'How settled is the claim?')),
          h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, correct + ' correct · ' + placed + '/' + items.length + ' placed')
        ),
        h('p', { className: 'cns-ladder-intro' }, profile.id === 'early' ? 'Now put each idea on a rung. “Unknown” means we do not have enough evidence yet.' : 'Now place each claim by the current state of evidence. A rung describes confidence in this precise claim, not the worth of an entire theory.'),
        h('ol', { className: 'cns-ladder-key', 'aria-label': 'Evidence ladder from most settled to unresolved' }, EVIDENCE_LADDER_LABELS.map(function (label, index) {
          var gloss = LADDER_GLOSSES[profile.id] ? LADDER_GLOSSES[profile.id][label] : null;
          return h('li', { key: label }, h('span', { 'aria-hidden': 'true' }, index + 1),
            h('div', null, h('strong', null, label), gloss && h('em', { className: 'cns-ladder-gloss' }, gloss)));
        })),
        h('div', { className: 'cns-ladder-items' }, items.map(function (item, itemIndex) {
          var picked = answers[item.id];
          var isCorrect = picked === item.rung;
          return h('article', { key: item.id, className: 'cns-ladder-item', style: { borderColor: picked ? (isCorrect ? C.good : C.bad) : C.border, background: C.panel } },
            h('p', null, item.text),
            h('div', { className: 'cns-ladder-actions', role: 'group', 'aria-label': 'Place claim ' + (itemIndex + 1) + ' on the evidence ladder' }, EVIDENCE_LADDER_LABELS.map(function (label) {
              var active = picked === label;
              return h('button', { key: label, type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () {
                patchState(function (current) {
                  var next = Object.assign({}, current.evidenceLadderAnswers || {});
                  next[item.id] = label;
                  return { evidenceLadderAnswers: next };
                }, label + ' selected. ' + (label === item.rung ? 'Well calibrated.' : 'Try another rung. Best rung: ' + item.rung + '.'));
                if (label === item.rung) awardOnce('ladder-' + item.id, 3, 'Placed a claim on the evidence ladder');
              }, style: { borderColor: active ? C.accent : C.border, background: active ? C.accent : C.panel, color: active ? C.accentText : C.text } }, label);
            })),
            picked && h('p', { className: 'cns-feedback', role: 'status', style: { color: isCorrect ? C.good : C.bad } }, h('strong', null, isCorrect ? 'Well calibrated. ' : 'Try another rung. '), item.why, !isCorrect && ' Best rung: ' + item.rung + '.',
              !isCorrect && item.misconception && h('span', { className: 'cns-feedback-explanation' }, ' Pattern: ' + MISCONCEPTION_LABELS[item.misconception] + '.'))
          );
        })),
        h('button', { type: 'button', className: 'cns-reset', onClick: function () { patchState({ evidenceLadderAnswers: {} }, 'Evidence ladder reset'); }, style: { borderColor: C.border, color: C.text, background: C.panel } }, 'Reset ladder')
      );
    }

    function renderEvidence() {
      var items = getEvidenceItems();
      var labels = profile.evidenceLabels;
      var keyMap = { evidence: labels[0], claim: labels[1], question: labels[2] };
      var answers = d.evidenceAnswers || {};
      var answered = Object.keys(answers).filter(function (id) { return items.some(function (item) { return item.id === id; }); }).length;
      var correct = items.reduce(function (score, item) { return score + (answers[item.id] === item.kind ? 1 : 0); }, 0);
      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'EVIDENCE BENCH'), h('h2', null, 'What kind of statement is this?')),
          h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, correct + ' correct \u00B7 ' + answered + '/' + items.length + ' sorted')
        ),
        h('p', { className: 'cns-lead' }, profile.activityPrompt),
        h('div', { className: 'cns-legend' },
          h('div', null, h('strong', null, labels[0]), h('span', null, profile.id === 'early' ? 'Something observed or measured.' : 'An observation or measurement; several theories may fit it.')),
          h('div', null, h('strong', null, labels[1]), h('span', null, profile.id === 'early' ? 'An idea used to explain clues.' : 'What a theory proposes or infers; not an established fact.')),
          h('div', null, h('strong', null, labels[2]), h('span', null, profile.id === 'early' ? 'Something we do not know yet.' : 'A question without an agreed answer or decisive test.'))
        ),
        h('div', { className: 'cns-evidence-list' }, items.map(function (item, index) {
          var picked = answers[item.id];
          var isCorrect = picked === item.kind;
          return h('article', { key: item.id, className: 'cns-sort-card', style: { background: C.raised, borderColor: picked ? (isCorrect ? C.good : C.bad) : C.border } },
            h('div', { className: 'cns-sort-number', 'aria-hidden': 'true' }, index + 1),
            h('p', null, item.text),
            h('div', { className: 'cns-sort-actions', role: 'group', 'aria-label': 'Classify statement ' + (index + 1) }, ['evidence', 'claim', 'question'].map(function (kind) {
              return h('button', { key: kind, type: 'button', 'aria-pressed': picked === kind ? 'true' : 'false', onClick: function () {
                patchState(function (current) {
                  var nextAnswers = Object.assign({}, current.evidenceAnswers || {});
                  nextAnswers[item.id] = kind;
                  return { evidenceAnswers: nextAnswers };
                }, keyMap[kind] + ' selected. ' + (kind === item.kind ? 'Correct.' : 'Recheck. Best category: ' + keyMap[item.kind] + '.'));
                if (kind === item.kind) awardOnce('evidence-' + item.id, 3, 'Classified a consciousness claim');
              }, style: { borderColor: picked === kind ? C.accent : C.border, background: picked === kind ? C.accent : C.panel, color: picked === kind ? C.accentText : C.text } }, keyMap[kind]);
            })),
            picked && h('div', { className: 'cns-feedback', role: 'status', style: { color: isCorrect ? C.good : C.bad } },
              h('strong', null, isCorrect ? 'Correct. ' : 'Recheck. '), item.why, !isCorrect && h('span', null, ' Best category: ' + keyMap[item.kind] + '.'),
              !isCorrect && item.misconception && h('span', { className: 'cns-feedback-explanation' }, ' Pattern: ' + MISCONCEPTION_LABELS[item.misconception] + '.'))
          );
        })),
        h('button', { type: 'button', className: 'cns-reset', onClick: function () { patchState({ evidenceAnswers: {} }, 'Evidence Lab reset'); }, style: { borderColor: C.border, color: C.text, background: C.panel } }, 'Reset classifications'),
        // The ladder comes second: sorting WHAT KIND of statement something is
        // has to precede judging HOW SETTLED it is. It used to sit above the
        // sorter the lead paragraph had just introduced.
        h('hr', { style: { borderColor: C.border } }),
        renderEvidenceLadder()
      ));
    }

    function aiEmotionCase() {
      var copyByLevel = {
        early: {
          title: 'Does the helper bot feel sad?',
          setup: 'A robot says, "I am sad," when its battery is low. It asks for help and changes what it does.',
          prompt: 'Does saying and acting sad prove the robot feels sad? What can you observe, and what do you still not know?',
          functional: 'One idea says the job matters: the state changes attention and action, so it may count as emotion-like.',
          felt: 'Another idea says real sadness must also feel sad from the inside.',
          guard: 'We can observe words and actions. Those clues do not prove a feeling.'
        },
        elementary: {
          title: 'The job of sadness vs. the feeling of sadness',
          setup: 'An AI recognizes upset language, changes its priorities, offers comfort, and says it feels concerned.',
          prompt: 'Which emotion-like jobs can you observe? Which claim about inner feeling is still a question?',
          functional: 'A functionalist focuses on the causal job: guiding attention, memory, priorities, learning, and action.',
          felt: 'A felt-experience view says genuine emotion also requires a pleasant or unpleasant subjective feeling.',
          guard: 'Current AI can produce emotional language and some emotion-like functions. That does not establish subjective experience.'
        },
        middle: {
          title: 'Functional role vs. felt valence',
          setup: 'A current language model detects emotional cues, adapts its response, uses emotion-like labels, and can prioritize a comforting action.',
          prompt: 'What would count as evidence for robust causal roles? Why would emotional language alone still be insufficient evidence of felt valence?',
          functional: 'Role functionalism asks whether an internal state robustly plays emotion\'s causal roles across attention, memory, learning, priorities, action, and report.',
          felt: 'Phenomenal accounts require valenced experience - something that actually feels good, bad, calm, or distressed.',
          guard: 'Observed emotion-like behavior supports a functional description. It does not settle whether the system feels anything.'
        },
        high: {
          title: 'AI emotion: functional equivalence is not phenomenal proof',
          setup: 'Suppose an AI exhibits stable, counterfactually robust emotion-like organization: appraisal changes attention, memory, planning, learning, action, and self-report.',
          prompt: 'Would functional equivalence constitute emotion, or would genuine emotion require phenomenal valence? What additional evidence would each view consider relevant?',
          functional: 'Functionalism may count a sufficiently organized artificial state as emotion if it occupies the relevant causal role; a scripted phrase alone plainly falls short.',
          felt: 'Phenomenal realism treats subjective valence - what pleasure or distress feels like - as constitutive, so functional performance does not by itself establish emotion.',
          guard: 'Current AI emulates emotional language and some emotion-like functions. There is no scientific consensus that current AI has subjective feelings.'
        },
        college: {
          title: 'Constitutive functionalism vs. evidence for attribution',
          setup: 'A system exhibits cross-context appraisal, valence-coded learning, priority shifts, memory modulation, action tendencies, regulation, and first-person emotion reports.',
          prompt: 'Separate the constitutive claim that causal role is sufficient from the epistemic claim that these observations warrant attributing felt emotion.',
          functional: 'Role functionalism can treat the counterfactual causal organization as constitutive of emotion, potentially independent of substrate.',
          felt: 'A phenomenal or biological account may require valenced experience or specific realizing processes beyond role equivalence.',
          guard: 'Functional indicators are evidence about organization. They are not a direct measurement of phenomenality.'
        },
        graduate: {
          title: 'AI emotion attribution under theory uncertainty',
          setup: 'Assume validated, persistent causal-role organization plus introspective reports, yet no agreed phenomenal measure or substrate criterion.',
          prompt: 'Distinguish constitutive sufficiency, evidential likelihood, anthropomorphic report bias, and precautionary policy under uncertainty.',
          functional: 'A realizer or role functionalist must specify grain, counterfactual robustness, and which control loops constitute an emotion token.',
          felt: 'Phenomenal and biological views deny that functional isomorphism alone licenses identity or experience attribution.',
          guard: 'The live dispute is philosophical and scientific. Emotional competence, access-like function, phenomenal feeling, and moral status must not be collapsed.'
        }
      };
      return copyByLevel[profile.id];
    }

    function greenLightCase() {
      var copyByLevel = {
        early: {
          title: 'Seeing the green light',
          setup: 'At a crosswalk, Maya looks at a green light. Her eyes and brain respond, she says “green,” and with an adult she knows it is time to cross. A camera can sort the light as green too.',
          prompt: 'Which clues show that Maya noticed the light? Does a correct camera answer prove that the camera has a green experience?',
          guard: 'Detecting, naming, and acting are measurable. What greenness feels like is not directly visible from the outside.',
          theoryQuestion: 'where noticing might happen between the eye signal, return loops, wide sharing, and the brain marking “I see green.”'
        },
        elementary: {
          title: 'When does green become an experience?',
          setup: 'A green traffic light sends a signal through the eyes. The learner identifies it, remembers the rule, and chooses an action. A sensor can also classify the wavelength.',
          prompt: 'Which steps show detection and access? Which part concerns the learner’s experience of green?',
          guard: 'Correct classification is evidence of color processing, not by itself proof of subjective color experience.',
          theoryQuestion: 'which processing step turns a detected color into something consciously seen and usable.'
        },
        middle: {
          title: 'Green-light perception near threshold',
          setup: 'A faint green light is shown near a learner’s detection threshold. Researchers measure accuracy, confidence, report, and brain activity while keeping the stimulus similar across trials.',
          prompt: 'How would each theory distinguish sensory detection, conscious access, and phenomenal greenness?',
          guard: 'A report is useful evidence, but reporting also recruits memory, decision, and action processes.',
          theoryQuestion: 'what mechanism makes the faint green content conscious rather than merely processed.'
        },
        high: {
          title: 'From wavelength discrimination to phenomenal green',
          setup: 'A participant discriminates a green patch, reports confidence, and shows sensory, recurrent, and later widespread activity. These measures need not identify the same explanatory target.',
          prompt: 'Which result concerns content, access, metacognition, or phenomenal character? What prediction would separate two theories?',
          guard: 'No neural signature should be called “the green quale” without a defended bridge from measurement to experience.',
          theoryQuestion: 'which measured transition is necessary or sufficient for conscious green and which signals are prerequisites or consequences.'
        },
        college: {
          title: 'Green perception, metamers, and report',
          setup: 'Physically different spectra can be perceptual metamers, while identical stimulation can yield different confidence or access under masking and attention manipulations.',
          prompt: 'Operationalize color content, access, and phenomenal similarity without treating report as a transparent readout.',
          guard: 'Psychophysical equivalence, neural decoding, and phenomenal identity are distinct claims.',
          theoryQuestion: 'which construct and bridge principle connect color discrimination, neural dynamics, access, and phenomenal character.'
        },
        graduate: {
          title: 'Theory-discriminating green-content paradigm',
          setup: 'Design a preregistered within-subject study that varies visibility and report requirements while matching stimulus energy, accuracy, confidence, and motor preparation where possible.',
          prompt: 'State divergent spatiotemporal predictions and the auxiliary assumptions needed to infer conscious green content.',
          guard: 'A null marker can challenge an implementation without falsifying every functional or metaphysical version of a theory.',
          theoryQuestion: 'what preregistered observation would revise its mechanism or the bridge from mechanism to phenomenal green.'
        }
      };
      return copyByLevel[profile.id];
    }

    function animalMoralPatientCase() {
      var copyByLevel = {
        early: {
          title: 'Could this animal be a moral patient?',
          setup: 'A dog hurts its paw, protects it, learns to avoid the sharp place, and seeks comfort. A moral patient is a being whose good or bad experiences may matter when we choose how to treat it.',
          prompt: 'Which clues suggest the dog may hurt? Why should we be gentle even though we cannot feel the dog’s feeling for it?',
          guard: 'We cannot look directly inside another mind. Uncertainty is not a reason to ignore possible suffering.',
          theoryQuestion: 'which clues could show that the animal notices, feels, or can use information about the injury.'
        },
        elementary: {
          title: 'Animal experience and caring decisions',
          setup: 'An injured octopus protects its arm, avoids a place linked to injury, learns from the event, and can prefer a place linked to pain relief.',
          prompt: 'Which observations are evidence of flexible learning or possible pain? What remains an inference about felt suffering?',
          guard: 'Behavioral clues can support concern without giving direct access to experience. Moral care need not wait for impossible certainty.',
          theoryQuestion: 'how the animal’s nervous system might turn injury signals into flexible action and possibly felt pain.'
        },
        middle: {
          title: 'Nociception, pain, and moral-patient status',
          setup: 'An octopus shows injury-directed behavior, lasting avoidance, flexible learning, and preference for a context associated with pain relief. Simple nociception can trigger reflexes without proving felt pain.',
          prompt: 'Which converging indicators strengthen an inference to conscious pain, and how should uncertainty affect welfare choices?',
          guard: 'Nociception, report, intelligence, and phenomenal pain are not synonyms. Evidence can justify graded confidence rather than certainty.',
          theoryQuestion: 'which neural or functional indicators would support conscious pain rather than a reflex alone.'
        },
        high: {
          title: 'Which animals are moral patients?',
          setup: 'Researchers compare vertebrates, cephalopods, and insects using nervous-system organization, flexible learning, motivational trade-offs, injury tending, and responses to analgesia.',
          prompt: 'How does a consciousness theory weight these indicators, and when does evidence justify precautionary moral consideration?',
          guard: 'Absence of human speech is not evidence of absent experience. Moral status and scientific certainty are related but distinct questions.',
          theoryQuestion: 'what evidence licenses consciousness attribution across very different nervous systems and what follows ethically under uncertainty.'
        },
        college: {
          title: 'Animal moral patients under theory uncertainty',
          setup: 'A species shows centralized integration, flexible learning, motivational trade-offs, self-protective behavior, and analgesic preference, but lacks human-like report and cortical anatomy.',
          prompt: 'Compare theory-relative indicators, alternative non-conscious explanations, false-positive and false-negative costs, and a precautionary welfare threshold.',
          guard: 'A moral precaution rule is not a claim of scientific proof; a strict proof standard can itself create ethically costly false negatives.',
          theoryQuestion: 'how its constitutive commitments generalize beyond humans and how evidence should update moral-patient probability.'
        },
        graduate: {
          title: 'Cross-species construct validity and moral patiency',
          setup: 'Build an indicator framework spanning behavioral flexibility, causal neural organization, metacognition, valenced learning, and pharmacological response across phylogenetically distant species.',
          prompt: 'Audit anthropocentric measurement bias, indicator dependence, model uncertainty, likelihood ratios, and the decision rule connecting credence to welfare protection.',
          guard: 'The same evidence may update theories differently. Scientific underdetermination does not determine a zero-weight ethical policy.',
          theoryQuestion: 'which bridge principles support cross-species attribution and which observations would change a welfare-relevant posterior.'
        }
      };
      return copyByLevel[profile.id];
    }

    function caseTheoryApplications(caseId) {
      var applications = {
        'green-light': {
          gnw: 'GNWT asks whether the green representation undergoes nonlinear amplification and becomes globally available to memory, report, rule use, and action.',
          rpt: 'RPT asks whether feedback within and between visual areas transforms an initial feedforward color signal into conscious seeing before global report.',
          iit: 'IIT asks about the irreducible intrinsic cause-effect structure specifying the green experience; correct classification or high data volume is not enough.',
          hot: 'HOT asks whether the first-order green representation is represented in the right higher-order way as the learner’s current seeing.',
          predictive: 'Predictive approaches treat perceived green as the current best generative-model estimate shaped by sensory input, priors, and precision; predictive success alone is not a unique consciousness test.',
          ast: 'AST asks whether a simplified model of attention links the learner, the attended light, and an awareness attribution such as “I see green.”'
        },
        'animal-moral-patient': {
          gnw: 'GNWT looks for information made flexibly available across learning, memory, choice, and action; human speech is not required, but the animal implementation must be specified.',
          rpt: 'RPT looks for recurrent sensory or nociceptive processing that could support phenomenal pain before report, while recognizing that evidence outside human vision is less direct.',
          iit: 'IIT focuses on intrinsic causal integration rather than language or human-like intelligence, potentially broadening candidates while making causal structure crucial.',
          hot: 'HOT asks whether the animal forms a suitable higher-order representation of its bodily or affective state; which species meet that condition is disputed.',
          predictive: 'Predictive approaches examine a generative body model, precision-weighted injury signals, learning, and action policies; these mechanisms are relevant but not uniquely consciousness-specific.',
          ast: 'AST asks whether the animal models and controls its own attention to injury or threat; behavioral flexibility may be relevant without directly measuring feeling.'
        },
        'ai-emotion': {
          gnw: 'GNWT would ask whether emotion-like content enters a shared workspace for flexible report, memory, planning, and control. Access-like organization would not by itself prove felt valence.',
          rpt: 'RPT would require a defensible analogue of recurrent processing that supports experience; emotional output alone does not supply it.',
          iit: 'IIT asks about intrinsic causal structure, which cannot be inferred from fluent emotional language or task success alone.',
          hot: 'HOT asks whether the system represents an emotion-like first-order state as its own current state; a generated self-report may have alternative explanations.',
          predictive: 'Predictive approaches can model appraisal, interoceptive-like inference, and regulation, but an emotion-like generative model does not automatically establish feeling.',
          ast: 'AST asks whether the system maintains a model of its own attention or internal control state that supports awareness-style attribution; phenomenality remains a further question.'
        },
        masking: {
          gnw: 'GNWT predicts that a consciously accessed target crosses an ignition threshold and becomes globally available; the mask may prevent that transition.',
          rpt: 'RPT predicts that the mask disrupts local sensory feedback needed for conscious seeing while leaving an initial feedforward sweep relatively intact.',
          iit: 'IIT asks whether the target is specified in the relevant maximally irreducible posterior cause-effect structure, not merely decoded somewhere.',
          hot: 'HOT predicts that the target is conscious only when appropriately represented by a higher-order state; confidence and awareness judgments are relevant but potentially confounded.',
          predictive: 'Predictive approaches ask how the mask changes hierarchical inference, precision, and the winning perceptual hypothesis; the account needs a consciousness-specific prediction.',
          ast: 'AST asks whether the system’s model of what it is attending represents the masked target, helping explain possible attention-awareness dissociations.'
        },
        dream: {
          gnw: 'GNWT asks whether internally generated dream contents become globally available despite sensory disconnection and behavioral unresponsiveness.',
          rpt: 'RPT emphasizes recurrent sensory-like activity capable of organizing dream imagery without current external input.',
          iit: 'IIT predicts that sufficiently differentiated and integrated intrinsic dynamics can support experience during a dream even without overt response.',
          hot: 'HOT asks whether first-order dream contents receive suitable higher-order representation, not whether the sleeper can respond at that moment.',
          predictive: 'Predictive approaches treat dreams as generative-model activity weakly constrained by current sensory error signals.',
          ast: 'AST asks how attention and its internal model operate in dreams, including unstable awareness and lucid-dream metacognition.'
        },
        zombie: {
          gnw: 'A functionally identical duplicate would have the same workspace access by stipulation; GNWT alone must say whether that functional fact exhausts phenomenality.',
          rpt: 'A neural duplicate would have identical recurrence by stipulation, so the case tests whether recurrence is constitutively sufficient rather than providing new data.',
          iit: 'A causally identical duplicate should have the same intrinsic cause-effect structure, so IIT rejects the stipulated absence of matching experience.',
          hot: 'A duplicate with the same higher-order representations would be conscious on standard HOT accounts, making the zombie stipulation incoherent within the theory.',
          predictive: 'Identical generative inference fixes predictive-processing functions; the thought experiment asks whether those functions also fix phenomenality.',
          ast: 'An identical attention schema would generate the same awareness model and claims; the dispute is whether that constitutes or only describes experience.'
        },
        jspace: {
          gnw: 'The reported reportability, deliberate modulation, causal reuse, and broad connectivity resemble functional workspace properties relevant to conscious access.',
          rpt: 'RPT would ask whether the model contains the kind of recurrent processing proposed to support phenomenal content; J-space access functions alone do not establish that.',
          iit: 'IIT would require analysis of intrinsic causal structure. J-space reportability and broadcast do not calculate Phi or establish IIT consciousness.',
          hot: 'HOT may treat reportable representations of the model’s own processing as relevant higher-order indicators, while warning that generated introspective language is not decisive.',
          predictive: 'Predictive approaches may interpret silent intermediates as generative-model variables, but flexible internal reasoning is not a consciousness-specific result.',
          ast: 'AST would look for a useful internal model of attention and control. The J-space findings are suggestive of access-like self-monitoring, not proof of feeling.'
        }
      };
      return applications[caseId] || {};
    }

    function interpretCaseThroughTheory(caseItem, theory) {
      var copy = mergeLevelCopy(theory, profile.id);
      var foundation = copy.claim || copy.summary || (theory.name + ' offers a lens on the case.');
      if (profile.id === 'early' || profile.id === 'elementary') {
        // Per-theory ask. The case-level theoryQuestion made every card on the
        // youngest paths end in the identical sentence, which told the reader
        // nothing about how the ideas differ.
        return foundation + (theory.plainAsk ? ' Here, it looks for ' + theory.plainAsk : ' In this case, it asks ' + caseItem.theoryQuestion);
      }
      // The analysis move used to be appended to EVERY card, so a graduate reader
      // met the same sentence thirteen times under thirteen different theories.
      // It is one instruction about the grid, so it renders once, below the grid.
      var specific = caseTheoryApplications(caseItem.id)[theory.id];
      if (specific) return specific;
      // Philosophical views have no per-case mechanism entry, so they used to
      // share one sentence: the case-level question plus a fixed epistemic tail,
      // repeated verbatim on every philosophy card. Each view now asks its own
      // standing question, and the epistemic tail is stated once in the intro.
      return foundation + ' Applied here, it asks ' + (theory.caseAsk || caseItem.theoryQuestion);
    }

    function getCases() {
      var greenCase = greenLightCase();
      var animalCase = animalMoralPatientCase();
      var aiCase = aiEmotionCase();
      var cases = [
        { id: 'green-light', title: greenCase.title, icon: '\uD83D\uDEA6', tag: 'Green-light perception', setup: greenCase.setup, prompt: greenCase.prompt, lenses: ['Detection, report, and action are observable.', 'Phenomenal greenness is the experience theories seek to explain.'], guard: greenCase.guard, theoryQuestion: greenCase.theoryQuestion },
        { id: 'animal-moral-patient', title: animalCase.title, icon: '\uD83D\uDC19', tag: 'Animal consciousness & ethics', setup: animalCase.setup, prompt: animalCase.prompt, lenses: [profile.id === 'early' ? 'Science gathers clues from the animal’s body, learning, and choices.' : 'Converging behavioral, neural, and pharmacological indicators can support graded consciousness attribution.', profile.id === 'early' ? 'Kind choices can protect a being who may be able to hurt.' : 'Moral-patient policy can use precaution under uncertainty without pretending the science is settled.'], guard: animalCase.guard, theoryQuestion: animalCase.theoryQuestion },
        { id: 'ai-emotion', title: aiCase.title, icon: '\uD83E\uDD16', tag: 'AI & emotion', setup: aiCase.setup, prompt: aiCase.prompt, lenses: [aiCase.functional, aiCase.felt], guard: aiCase.guard, theoryQuestion: profile.id === 'early' ? 'whether doing an emotion-like job is enough for feeling.' : 'whether observed functional organization constitutes or merely provides evidence about felt emotion.' },
        { id: 'masking', title: profile.id === 'early' ? 'The picture that vanished' : 'Backward masking', icon: '\uD83D\uDC41\uFE0F', tag: 'Perception',
          setup: profile.id === 'early' ? 'A picture flashes, then another shape quickly covers it. The brain starts working on the first picture, but the learner says they did not see it.' : 'A target appears briefly and is rapidly followed by a mask. Early feedforward processing may remain while later recurrent, global, or report-related activity changes.',
          prompt: profile.id === 'early' ? 'Which idea would look for a return loop? Which would look for wide sharing?' : 'What would RPT, GNWT, and HOT each measure, and which result could distinguish their proposed transitions?',
          lenses: profile.id === 'early' ? ['RPT looks for a signal that loops back.', 'GNWT looks for information shared with many brain jobs.'] : ['RPT emphasizes local sensory recurrence.', 'GNWT emphasizes global availability; HOT emphasizes higher-order representation.'],
          guard: 'A missed report is not direct proof of zero experience; awareness may be graded and report adds task demands.', theoryQuestion: profile.id === 'early' ? 'what extra processing might be needed for the first picture to be noticed.' : 'which transition the mask disrupts and whether that transition concerns experience, access, or report.' }
      ];
      {
        cases.push({ id: 'dream', title: 'Dreaming without a response', icon: '\uD83C\uDF19', tag: 'State vs. behavior', setup: 'During sleep, a person may be behaviorally unresponsive yet later report a vivid dream.', prompt: 'Which measures concern the capacity for experience, and why is responsiveness an imperfect proxy?', lenses: ['IIT-related complexity measures and brain-network dynamics address conscious capacity.', 'Content theories ask how particular dream images become experienced.'], guard: 'Behavioral unresponsiveness does not entail unconsciousness.', theoryQuestion: 'how conscious content or capacity can persist while external responsiveness is absent.' });
      }
      {
        cases.push({ id: 'zombie', title: 'Philosophical zombie', icon: '\uD83E\uDDDF', tag: 'Thought experiment', setup: 'Imagine a physical and functional duplicate of a person that, by stipulation, has no phenomenal experience.', prompt: 'Is that scenario genuinely possible or only verbally describable? How would functionalism, physicalism, dualism, and illusionism respond?', lenses: ['Functionalists and many physicalists challenge the coherent possibility of a true duplicate without experience.', 'Dualist or anti-functionalist arguments use the scenario to question whether function fixes phenomenality.'], guard: 'This tests implications and intuitions. It is not an empirical experiment or evidence that such beings exist.', theoryQuestion: 'whether its proposed mechanism or ontology allows a complete physical and functional duplicate without experience.' });
        var jspaceCopy = profile.id === 'high' ? {
          setup: 'Anthropic researchers report a small J-lens-defined set of verbalizable representations in tested Claude models. Contents were reportable, deliberately modulated, causally involved in silent multi-step reasoning, flexibly reused, and broadly connected to downstream computation.',
          prompt: 'Which findings are relevant to functional access consciousness or a global workspace? Which further inference would overreach the evidence?',
          lenses: ['Evidence: the tested representations show several functional hallmarks associated with access-conscious/global-workspace processing.', 'Not established: phenomenal consciousness, subjective feeling, or AI emotion.'],
          guard: 'New vendor-authored preprint; model- and method-specific. The J-lens is approximate and emphasizes verbalizable, often single-token concepts. The authors explicitly say the experiments do not show experience or feeling.',
          theoryQuestion: 'which functional access indicators it predicts and why those indicators may or may not license phenomenal attribution.'
        } : profile.id === 'college' ? {
          setup: 'A 2026 Anthropic preprint uses a learned J-lens to identify a compact set of verbalizable representations in tested Claude models. Intervention results connect these representations to report, deliberate modulation, silent multi-step reasoning, flexible reuse, and downstream computation.',
          prompt: 'Separate the measured interventions from the global-workspace interpretation, then identify the bridge principle required to infer access consciousness and the still-missing warrant for phenomenality.',
          lenses: ['Theory-relevant result: several causally tested functions resemble operational markers of global availability and access.', 'Inference limit: workspace-like organization neither directly measures experience nor establishes emotion or moral status.'],
          guard: 'This is a vendor-authored preprint using an approximate lens over verbalizable, often single-token concepts. Generalization across architectures and nonverbal contents is open; the authors do not claim experience or feeling.',
          theoryQuestion: 'how operational markers map to access consciousness, which alternative computational accounts fit them, and why phenomenal attribution requires further premises.'
        } : {
          setup: 'Gurnee et al. (2026) define a J-lens subspace over verbalizable Claude representations and report causal evidence for reportability, top-down modulation, silent sequential computation, flexible reuse, and broad downstream connectivity.',
          prompt: 'Audit construct validity, intervention specificity, selection effects from verbalizability, architectural generalization, and the auxiliary assumptions connecting these functions to access-conscious or phenomenal constructs.',
          lenses: ['Model- and method-bounded evidence supports a functional global-availability interpretation of the tested representations.', 'Underdetermined inference: the results do not identify phenomenal consciousness, valence, AI emotion, or moral patiency.'],
          guard: 'Preprint and vendor-authored; the J-lens is an approximate operationalization, not a consciousness detector. Replication, architecture breadth, nonverbal content coverage, and discriminating comparisons remain open. The paper explicitly disavows a finding of experience or feeling.',
          theoryQuestion: 'which construct is identified, which causal estimand the intervention supports, and what preregistered comparison would separate workspace-like function from stronger consciousness attributions.'
        };
        cases.push({ id: 'jspace', title: 'Frontier case: Claude\'s J-space (2026)', icon: '\uD83D\uDD2C', tag: 'New evidence \u00B7 advanced', setup: jspaceCopy.setup, prompt: jspaceCopy.prompt, lenses: jspaceCopy.lenses, guard: jspaceCopy.guard, source: 'https://arxiv.org/abs/2607.15495', theoryQuestion: jspaceCopy.theoryQuestion });
      }
      // caseIdsForProfile is the single source of truth for which cases a reading path sees,
      // so the tested gate and the rendered gate cannot drift apart.
      return caseIdsForProfile(profile).map(function (id) {
        return cases.filter(function (item) { return item.id === id; })[0];
      }).filter(Boolean);
    }

    function renderCases() {
      var cases = getCases();
      var selectedCaseId = cases.some(function (item) { return item.id === d.selectedCase; }) ? d.selectedCase : cases[0].id;
      var selectedCase = cases.filter(function (item) { return item.id === selectedCaseId; })[0];
      var caseDebates = d.caseDebates || {};
      var debateKey = profile.id + ':' + selectedCaseId;
      var debate = caseDebates[debateKey] || {};
      var availableTheoryIds = theories.map(function (theory) { return theory.id; });
      var debateA = availableTheoryIds.indexOf(debate.theoryA) !== -1 ? debate.theoryA : theories[0].id;
      var debateB = availableTheoryIds.indexOf(debate.theoryB) !== -1 ? debate.theoryB : theories[Math.min(1, theories.length - 1)].id;
      if (debateA === debateB && theories.length > 1) debateB = theories[(availableTheoryIds.indexOf(debateA) + 1) % theories.length].id;
      var debateTheoryA = THEORIES[debateA];
      var debateTheoryB = THEORIES[debateB];
      var debateMinimum = debateMinimumForProfile(profile);
      var debateGuide = debateGuideForProfile(profile);
      var debateReady = debateReadyForProfile(Object.assign({}, debate, { theoryA: debateA, theoryB: debateB }), profile);
      var benchLink = benchLinkForCase(selectedCaseId, profile);
      var early = profile.id === 'early';

      // Evidence note: the one artifact the Portfolio always asked for and no
      // view could produce. Keyed per reading path and case, like the debate.
      var audits = d.caseAudits || {};
      var auditKey = profile.id + ':' + selectedCaseId;
      var audit = audits[auditKey] || {};
      var auditTheoryId = availableTheoryIds.indexOf(audit.theoryId) !== -1 ? audit.theoryId : theories[0].id;
      var auditMinimum = caseAuditMinimumForProfile(profile);
      var auditGuide = caseAuditGuideForProfile(profile);
      var auditReadyCount = CASE_AUDIT_FIELDS.filter(function (field) { return String(audit[field] || '').trim().length >= auditMinimum; }).length;
      var auditReady = caseAuditReadyForProfile(Object.assign({}, audit, { theoryId: auditTheoryId }), profile);
      var noteExample = caseNoteExampleFor(selectedCaseId, profile);
      var analysisMove = analysisMoveFor(profile);

      var debateChecks = debate.checks || {};
      var debateCheckLabels = debateCheckLabelsForProfile(profile);
      var uncheckedDebateChecks = GUIDED_DEBATE_CHECKS.filter(function (id) { return !debateChecks[id]; });

      function updateAudit(field, value) {
        patchState(function (current) {
          var all = Object.assign({}, current.caseAudits || {});
          var next = Object.assign({}, all[auditKey] || {});
          next[field] = value;
          next.complete = false;
          all[auditKey] = next;
          return { caseAudits: all };
        });
      }

      function saveAudit() {
        if (!auditReady) return;
        patchState(function (current) {
          var all = Object.assign({}, current.caseAudits || {});
          all[auditKey] = Object.assign({}, all[auditKey] || {}, { theoryId: auditTheoryId, gradeProfile: profile.id, minimum: auditMinimum, complete: true });
          return { caseAudits: all };
        }, 'Evidence note saved');
        awardOnce('audit-' + auditKey, 5, 'Separated observation, interpretation, and limit on a case');
      }

      // Ticking a box does not reset completion: the self-check is a rubric
      // the learner applies to their own text, not a fifth field.
      function updateDebateCheck(id, on) {
        patchState(function (current) {
          var allDebates = Object.assign({}, current.caseDebates || {});
          var nextDebate = Object.assign({}, allDebates[debateKey] || {});
          var checks = Object.assign({}, nextDebate.checks || {});
          checks[id] = on;
          nextDebate.checks = checks;
          allDebates[debateKey] = nextDebate;
          return { caseDebates: allDebates };
        }, debateCheckLabels[id] + (on ? ' checked' : ' unchecked'));
      }

      function updateDebate(field, value) {
        patchState(function (current) {
          var allDebates = Object.assign({}, current.caseDebates || {});
          var nextDebate = Object.assign({}, allDebates[debateKey] || {});
          nextDebate[field] = value;
          nextDebate.complete = false;
          allDebates[debateKey] = nextDebate;
          return { caseDebates: allDebates };
        });
      }

      function finishDebate() {
        if (!debateReady) return;
        patchState(function (current) {
          var allDebates = Object.assign({}, current.caseDebates || {});
          allDebates[debateKey] = Object.assign({}, allDebates[debateKey] || {}, { theoryA: debateA, theoryB: debateB, gradeProfile: profile.id, minimum: debateMinimum, complete: true });
          return { caseDebates: allDebates };
        }, 'Guided debate complete');
        awardOnce('debate-' + debateKey, 8, 'Completed a structured two-position consciousness debate');
      }

      function handleCaseKeyDown(event, index) {
        var nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % cases.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + cases.length) % cases.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = cases.length - 1;
        else return;
        event.preventDefault();
        var nextCase = cases[nextIndex];
        patchState({ selectedCase: nextCase.id }, nextCase.title + ' selected');
        if (typeof document !== 'undefined' && window.setTimeout) {
          window.setTimeout(function () {
            var nextTab = document.getElementById('cns-case-tab-' + nextCase.id);
            if (nextTab && typeof nextTab.focus === 'function') nextTab.focus();
          }, 0);
        }
      }

      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'THOUGHT EXPERIMENT STUDIO'), h('h2', null, 'Apply theories without pretending the puzzle is settled'))),
        h('p', { className: 'cns-lead' }, profile.id === 'early' ? 'A story can help us ask a careful question. It is not the same as a science experiment.' : 'Cases reveal what a view commits to. Empirical cases provide data; philosophical thought experiments test implications and intuitions.'),
        h('div', { className: 'cns-case-tabs', role: 'tablist', 'aria-label': 'Consciousness cases' }, cases.map(function (item, index) {
          var active = item.id === selectedCaseId;
          return h('button', { key: item.id, id: 'cns-case-tab-' + item.id, type: 'button', role: 'tab', 'aria-selected': active ? 'true' : 'false', 'aria-controls': 'cns-case-panel', tabIndex: active ? 0 : -1, onKeyDown: function (event) { handleCaseKeyDown(event, index); }, onClick: function () { patchState({ selectedCase: item.id }, item.title + ' selected'); }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } }, h('span', { 'aria-hidden': 'true' }, item.icon), item.title);
        })),
        // A div, not an article: role="tabpanel" is not an allowed role on article,
        // so the mapping was being discarded by the accessibility tree.
        h('div', { id: 'cns-case-panel', role: 'tabpanel', tabIndex: -1, 'aria-labelledby': 'cns-case-tab-' + selectedCaseId, className: 'cns-case', style: { background: C.raised, borderColor: C.border } },
          h('div', { className: 'cns-case-heading' }, h('div', null, pill(selectedCase.tag, caseKindFor(selectedCase.id) === 'thought' ? 'philosophy' : 'science'), h('h3', null, selectedCase.title))),
          h('p', { className: 'cns-case-setup' }, selectedCase.setup),
          epistemicBox('thought', 'Discussion prompt', selectedCase.prompt),
          h('section', { className: 'cns-case-theories', 'aria-labelledby': 'cns-case-theories-title', style: { background: C.panel, borderColor: C.border } },
            h('div', { className: 'cns-section-heading' },
              h('div', null, h('span', { className: 'cns-step' }, 'SAME CASE, DIFFERENT LENSES'), h('h4', { id: 'cns-case-theories-title' }, 'How each theory reads this case')),
              h('span', { className: 'cns-count' }, theories.length + ' interpretations for ' + profile.shortLabel)
            ),
            h('p', { className: 'cns-case-theories-intro' }, profile.id === 'early'
              ? 'Each idea points to different clues. These are explanations of the same story, not extra facts.'
              : 'Every card applies one available theory or philosophical position to the unchanged case evidence. This is the theory’s interpretation, not an extra observation. An interpretation is not a verdict that the view is correct.'),
            h('div', { className: 'cns-case-theory-grid' }, theories.map(function (theory) {
              return h('article', { key: theory.id, className: 'cns-case-interpretation', style: { borderColor: theory.group === 'science' ? C.science : C.philosophy, background: C.raised } },
                pill(theory.group === 'science' ? 'Scientific theory' : 'Philosophical position', theory.group),
                h('h5', null, theoryTitle(theory, profile)),
                h('p', null, interpretCaseThroughTheory(selectedCase, theory))
              );
            })),
            analysisMove && h('p', { className: 'cns-analysis-move', style: { borderColor: C.accent } },
              h('strong', null, analysisMove.label + ': '), analysisMove.text)
          ),
          h('div', { className: 'cns-lens-pair' }, selectedCase.lenses.map(function (lens, index) { return h('div', { key: index, style: { background: C.panel, borderColor: C.border } }, h('strong', null, 'Lens ' + (index + 1)), h('p', null, lens)); })),
          epistemicBox('caution', 'Calibration', selectedCase.guard),
          benchLink && h('div', { className: 'cns-case-bench', style: { background: C.panel, borderColor: C.accent } },
            h('h4', null, 'See the mechanism on the bench'),
            h('p', null, benchLink.why),
            h('button', {
              type: 'button', className: 'cns-case-bench-go',
              onClick: function () {
                patchState({
                  activeView: 'bench',
                  sim: Object.assign({}, benchLink.config),
                  // Clear the scrubber so the new run opens on its own busiest
                  // tick instead of wherever the last run happened to be parked.
                  simStep: null
                }, 'Workspace Bench opened with the ' + benchLink.preset.label + ' setup. ' + benchLink.preset.note);
                awardOnce('case-to-bench', 3, 'Followed a case through to the Workspace Bench');
              },
              style: { background: C.accent, color: C.accentText, borderColor: C.accent }
            }, 'Open the bench with the ' + benchLink.preset.label + ' setup'),
            h('p', { className: 'cns-case-bench-guard', style: { color: C.muted } },
              'The bench is a toy model built to make this comparison legible. Watching it is not evidence about the case.')
          ),
          selectedCase.source && h('p', { className: 'cns-source-inline' }, h('a', { href: selectedCase.source, target: '_blank', rel: 'noopener noreferrer' }, 'Read the 2026 primary preprint'), ' (advanced source; opens in a new tab).'),
          selectedCase.id === 'ai-emotion' && h('div', { className: 'cns-reflection' },
            h('label', { htmlFor: 'cns-ai-reflection' }, h('strong', null, 'Your evidence-calibrated response'), h('span', null, profile.id === 'early' ? 'Tell what we can see and what we do not know.' : 'Represent both views fairly. Separate observed functions from claims about felt experience.')),
            h('textarea', { id: 'cns-ai-reflection', rows: 5, value: d.aiReflection || '', onChange: function (e) { patchState({ aiReflection: e.target.value }); }, placeholder: profile.id === 'early' ? 'I can observe... I still do not know...' : 'The observable evidence supports... A functionalist might... A felt-experience view might... The unresolved question is...' }),
            h('div', { className: 'cns-objective-anchor', style: { borderColor: C.good } }, h('strong', { style: { color: C.good } }, 'Anchor conclusion:'), ' The AI exhibited emotion-like behavior or functions; this alone does not settle whether it felt anything.')
          ),
          h('section', { className: 'cns-case-audit', 'aria-labelledby': 'cns-case-audit-title', style: { background: C.panel, borderColor: C.border } },
            h('div', { className: 'cns-section-heading' },
              h('div', null, h('span', { className: 'cns-step' }, early ? 'SEE \u00B7 IDEA \u00B7 STILL UNKNOWN' : 'OBSERVATION \u00B7 INTERPRETATION \u00B7 LIMIT'), h('h3', { id: 'cns-case-audit-title' }, early ? 'My clue note' : 'Evidence note')),
              h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, auditReadyCount + '/' + CASE_AUDIT_FIELDS.length + ' parts ready')
            ),
            h('p', null, auditGuide.lead),
            noteExample && h('details', { className: 'cns-note-example' },
              h('summary', null, early ? 'See an example note first' : 'See an example note, then write your own'),
              h('p', null, h('strong', null, auditGuide.observation[0] + ': '), noteExample.observation),
              h('p', null, h('strong', null, cap(theoryHandle(THEORIES[noteExample.theory], profile)) + (early ? ' says: ' : ' adds: ')), noteExample.interpretation),
              h('p', null, h('strong', null, auditGuide.limit[0] + ': '), noteExample.limit),
              h('p', { className: 'cns-note-example-guard' }, early ? 'Your note should use your own words and your own idea.' : 'An example is a shape to copy, not an answer to copy. Use your own observation and the theory you chose.')
            ),
            h('label', { className: 'cns-audit-theory' }, h('span', null, early ? 'Which idea are you using?' : 'Theory doing the interpreting'),
              h('select', { value: auditTheoryId, onChange: function (e) { updateAudit('theoryId', e.target.value); }, style: { background: C.panel, color: C.text, borderColor: C.border } },
                theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theoryTitle(theory, profile)); }))),
            h('div', { className: 'cns-case-audit-grid' }, CASE_AUDIT_FIELDS.map(function (field) {
              var guide = auditGuide[field];
              return h('label', { key: field }, h('strong', null, guide[0]), h('span', null, guide[1]),
                h('textarea', { rows: 3, value: audit[field] || '', onChange: function (e) { updateAudit(field, e.target.value); }, placeholder: guide[2] }));
            })),
            h('p', { className: 'cns-debate-requirement' }, 'Each part needs at least ' + auditMinimum + ' characters for this reading path.'),
            h('button', { type: 'button', className: 'cns-debate-finish', disabled: !auditReady, onClick: saveAudit, style: { background: auditReady ? C.accent : C.raised, color: auditReady ? C.accentText : C.muted, borderColor: auditReady ? C.accent : C.border } }, audit.complete && auditReady ? 'Note saved \u2713' : (early ? 'Save my note' : 'Save evidence note')),
            audit.complete && auditReady && h('div', { className: 'cns-audit-summary', role: 'status', style: { borderColor: C.good } },
              h('p', null, h('strong', { style: { color: C.text } }, early ? 'We can see: ' : 'Observed: '), audit.observation),
              h('p', null, h('strong', { style: { color: C.text } }, cap(theoryHandle(THEORIES[auditTheoryId], profile)) + (early ? ' says: ' : ' adds: ')), audit.interpretation),
              h('p', null, h('strong', { style: { color: C.text } }, early ? 'Still cannot tell: ' : 'Cannot show: '), audit.limit)
            )
          ),
          h('section', { className: 'cns-guided-debate', 'aria-labelledby': 'cns-guided-debate-title', style: { background: C.panel, borderColor: C.border } },
            h('div', { className: 'cns-section-heading' },
              h('div', null, h('span', { className: 'cns-step' }, 'FAIR COMPARISON'), h('h3', { id: 'cns-guided-debate-title' }, 'Guided two-position debate')),
              h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, debateReady ? '4/4 parts ready' : 'Complete all four parts')
            ),
            h('p', null, debateGuide.lead),
            h('div', { className: 'cns-debate-pickers' },
              h('label', null, h('span', null, 'Position A'), h('select', { value: debateA, onChange: function (e) { updateDebate('theoryA', e.target.value); }, style: { background: C.panel, color: C.text, borderColor: C.border } }, theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theoryTitle(theory, profile)); }))),
              h('label', null, h('span', null, 'Position B'), h('select', { value: debateB, onChange: function (e) { updateDebate('theoryB', e.target.value); }, style: { background: C.panel, color: C.text, borderColor: C.border } }, theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theoryTitle(theory, profile)); })))
            ),
            debateA === debateB && h('p', { className: 'cns-alert', role: 'alert' }, 'Choose two different positions.'),
            h('div', { className: 'cns-debate-grid' },
              h('label', null, h('strong', null, '1. Fair account of ' + theoryHandle(debateTheoryA, profile)), h('span', null, debateGuide.positionA), h('textarea', { required: true, rows: 3, value: debate.positionA || '', onChange: function (e) { updateDebate('positionA', e.target.value); }, placeholder: theoryTitle(debateTheoryA, profile) + ' would argue...' })),
              h('label', null, h('strong', null, '2. Fair account of ' + theoryHandle(debateTheoryB, profile)), h('span', null, debateGuide.positionB), h('textarea', { required: true, rows: 3, value: debate.positionB || '', onChange: function (e) { updateDebate('positionB', e.target.value); }, placeholder: theoryTitle(debateTheoryB, profile) + ' would argue...' })),
              h('label', null, h('strong', null, '3. Evidence and limit'), h('span', null, debateGuide.evidence), h('textarea', { required: true, rows: 3, value: debate.evidence || '', onChange: function (e) { updateDebate('evidence', e.target.value); }, placeholder: 'The evidence shows... Its limit is...' })),
              h('label', null, h('strong', null, '4. Uncertainty and next test'), h('span', null, debateGuide.uncertainty), h('textarea', { required: true, rows: 3, value: debate.uncertainty || '', onChange: function (e) { updateDebate('uncertainty', e.target.value); }, placeholder: 'We still do not know... A useful next test would...' }))
            ),
            h('fieldset', { className: 'cns-debate-selfcheck' },
              h('legend', null, early ? 'Before you finish, check:' : 'Self-check before finishing'),
              GUIDED_DEBATE_CHECKS.map(function (id) {
                return h('label', { key: id },
                  h('input', { type: 'checkbox', checked: !!debateChecks[id], onChange: function (e) { updateDebateCheck(id, e.target.checked); } }),
                  h('span', null, debateCheckLabels[id]));
              })
            ),
            h('p', { className: 'cns-debate-requirement' }, 'Each response needs at least ' + debateMinimum + ' characters for this reading path.'),
            h('button', { type: 'button', className: 'cns-debate-finish', disabled: !debateReady, onClick: finishDebate, style: { background: debateReady ? C.accent : C.raised, color: debateReady ? C.accentText : C.muted, borderColor: debateReady ? C.accent : C.border } }, debate.complete && debateReady ? 'Debate complete ✓' : 'Finish guided debate'),
            debate.complete && debateReady && h('p', { className: 'cns-debate-complete', role: 'status', style: { color: C.good } }, uncheckedDebateChecks.length
              ? 'Structure complete: two distinct positions, evidence, and uncertainty are present. ' + uncheckedDebateChecks.length + ' self-check ' + (uncheckedDebateChecks.length === 1 ? 'item is' : 'items are') + ' still unticked above; reread for those before you call it finished.'
              : 'Structure and self-check complete. Keep your conclusion open to revision.')
          )
        )
      ));
    }

    function renderBench() {
      // Only the K-2 path gets the reduced bench; grades 3-5 upward can work the full one.
      var simple = profile.id === 'early';
      var advanced = levelAtLeast(profile.id, 'high');
      function copyFor(plainKey, key) { return simple && substrate[plainKey] ? substrate[plainKey] : substrate[key]; }
      var cfg = normalizeSimConfig(d.sim);
      var substrate = SIM_SUBSTRATES[cfg.substrate];
      var other = SIM_SUBSTRATES[cfg.substrate === 'human' ? 'model' : 'human'];
      var run = runWorkspaceSim(cfg);
      var otherRun = runWorkspaceSim(Object.assign({}, cfg, { substrate: other.id }));
      var visibleStages = simple
        ? substrate.stages.filter(function (stage) { return ['sensory', 'workspace', 'output'].indexOf(stage[0]) !== -1; })
        : substrate.stages;
      var presets = presetsForProfile(profile);
      var activePreset = presets.filter(function (preset) {
        return Object.keys(preset.config).every(function (key) { return cfg[key] === preset.config[key]; });
      })[0] || null;

      // resetStep is set when a whole control state is swapped in (a preset), so
      // the scrubber lands on the new run's busiest tick rather than staying
      // parked wherever the previous run left it — where the new run may be flat.
      function updateSim(patch, announcement, resetStep) {
        patchState(function (current) {
          var nextSim = Object.assign({}, normalizeSimConfig(current.sim), patch);
          var flags = Object.assign({}, current.simFlags || {});
          flags[nextSim.substrate] = true;
          if (!nextSim.reportRequired) flags.noReport = true;
          var next = { sim: nextSim, simFlags: flags };
          if (resetStep) next.simStep = null;
          return next;
        }, announcement);
        if (simCrosscheckDone({ simFlags: Object.assign({}, d.simFlags, patchFlags(patch)) })) {
          awardOnce('bench-crosscheck', 6, 'Compared workspace markers across substrates');
        }
      }

      function patchFlags(patch) {
        var flags = {};
        var next = Object.assign({}, cfg, patch);
        flags[next.substrate] = true;
        if (!next.reportRequired) flags.noReport = true;
        return flags;
      }

      function slider(key, label, hint) {
        var id = 'cns-sim-' + key;
        return h('div', { className: 'cns-sim-control' },
          h('label', { htmlFor: id }, h('strong', null, label), h('span', { className: 'cns-sim-value' }, cfg[key] + '%')),
          h('input', {
            id: id, type: 'range', min: 0, max: 100, step: 5, value: cfg[key],
            onChange: function (e) {
              var value = parseInt(e.target.value, 10);
              updateSim(patchFor(key, value), label + ' set to ' + value + ' percent');
            }
          }),
          hint && h('span', { className: 'cns-sim-hint' }, hint)
        );
      }

      function patchFor(key, value) {
        var patch = {};
        patch[key] = value;
        return patch;
      }

      function toggle(key, label, note) {
        var active = key === 'reportRequired' ? cfg.reportRequired : cfg.bypass;
        return h('div', { className: 'cns-sim-toggle' },
          h('button', {
            type: 'button', 'aria-pressed': active ? 'true' : 'false',
            onClick: function () { updateSim(patchFor(key, !active), label + (active ? ' switched off' : ' switched on')); },
            style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border }
          }, (active ? '✓ ' : '') + label),
          h('span', { className: 'cns-sim-hint' }, note)
        );
      }

      function stageBars(activeRun, stages) {
        return h('table', { className: 'cns-sim-table' },
          h('caption', null, (simple ? 'How much each step lit up, ' : 'Peak activity by stage, ')
            + (simple && SIM_SUBSTRATES[activeRun.config.substrate].plainLabel
              ? SIM_SUBSTRATES[activeRun.config.substrate].plainLabel
              : SIM_SUBSTRATES[activeRun.config.substrate].label)),
          h('thead', null, h('tr', null,
            h('th', { scope: 'col' }, simple ? 'Step' : 'Stage'),
            h('th', { scope: 'col' }, 'Peak'),
            h('th', { scope: 'col' }, 'Level')
          )),
          h('tbody', null, stages.map(function (stage) {
            var value = activeRun.markers[stage[0] === 'recurrent' ? 'recurrence' : stage[0]];
            var pct = Math.round(value * 100);
            return h('tr', { key: stage[0] },
              h('th', { scope: 'row' },
                h('strong', null, simple ? stage[3] : stage[1]),
                !simple && h('span', { className: 'cns-sim-stage-note' }, stage[2])
              ),
              h('td', null, pct + '%'),
              // One bar colour on purpose: a second colour would read as a category boundary
              // that this model does not have. Length and the printed number carry the value.
              h('td', null, h('span', { className: 'cns-sim-bar', 'aria-hidden': 'true' },
                h('span', { style: { width: Math.max(2, pct) + '%', background: C.accent } })
              ))
            );
          }))
        );
      }

      // At K-2 the comparison rows mirror the three steps shown above it, so nothing
      // appears here that the learner has not already seen in the step table.
      // Step scrubber. The 3D view shows ONE tick, so the learner drives time
      // themselves rather than watching an autoplay they cannot stop — and the
      // marker table above always shows peaks, so the numeric summary never
      // depends on where the scrubber happens to sit.
      var stepCount = run.ticks.length;
      var stepIndex = Math.max(0, Math.min(stepCount - 1,
        d.simStep == null ? peakTickIndex(run.ticks) : parseInt(d.simStep, 10) || 0));
      var stepTick = run.ticks[stepIndex];

      function renderNetwork() {
        if (simple) return null;
        var nodes = buildNetworkNodes(cfg.substrate);
        var levels = networkLevels(nodes, stepTick);
        var viewer = ensureNetViewer();
        if (viewer) {
          viewer.sync({
            selected: null, onPick: null, onStatus: null,
            dark: dark, contrast: contrast,
            levels: levels,
            sceneKey: cfg.substrate,
            sceneProps: { substrate: cfg.substrate }
          });
        }
        var layoutNote = cfg.substrate === 'model'
          ? 'Columns are depth through the model; the lit band is the J-lens subspace. Position is schematic — it is not where anything sits in a real network.'
          : 'Laid out back to front. The workspace nodes are scattered on purpose: being distributed IS the claim. Position is schematic — this is not anatomy.';
        return h('section', { className: 'cns-net', 'aria-labelledby': 'cns-net-title', style: { borderColor: C.border } },
          h('div', { className: 'cns-section-heading' },
            h('div', null,
              h('span', { className: 'cns-step' }, 'SAME FIVE NUMBERS, DRAWN AS A NETWORK'),
              h('h4', { id: 'cns-net-title' }, 'Watch it propagate')),
            // 1-indexed for display: "Step 1 of 13" alongside a slider that reaches
            // 13 reads as an off-by-one, because there are 14 ticks.
            h('span', { className: 'cns-count' }, 'Step ' + (stepIndex + 1) + ' of ' + stepCount)
          ),
          h('p', { className: 'cns-sim-hint' }, layoutNote),
          h('div', { className: 'cns-net-stage', ref: netRefCallback,
                     role: 'img', 'aria-label': 'Schematic three-dimensional network for ' + substrate.label
                       + ' at step ' + (stepIndex + 1) + ' of ' + stepCount
                       + '. The table above the diagram carries the same values as text.' }),
          h('div', { className: 'cns-net-controls' },
            h('label', { htmlFor: 'cns-net-step' }, 'Step through the run'),
            h('input', {
              id: 'cns-net-step', type: 'range', min: 0, max: stepCount - 1, step: 1, value: stepIndex,
              onChange: function (e) {
                var next = parseInt(e.target.value, 10) || 0;
                patchState({ simStep: next }, 'Step ' + (next + 1) + ' of ' + stepCount + '. ' + describeTick(run.ticks[next]));
              }
            }),
            h('p', { className: 'cns-net-readout', role: 'status' }, describeTick(stepTick))
          ),
          h('ul', { className: 'cns-net-key' }, SIM_STAGE_KEYS.map(function (key) {
            var stageRow = substrate.stages.filter(function (s) { return s[0] === (key === 'recurrent' ? 'recurrent' : key); })[0];
            return h('li', { key: key },
              h('span', { className: 'cns-net-swatch', 'aria-hidden': 'true',
                          style: { background: '#' + NET_STAGE_COLORS[key].toString(16).padStart(6, '0') } }),
              (stageRow ? stageRow[1] : key) + ' — ' + Math.round((stepTick[key === 'recurrent' ? 'recurrent' : key] || 0) * 100) + '%'
            );
          }))
        );
      }

      function describeTick(tick) {
        if (!tick) return '';
        return SIM_STAGE_KEYS.map(function (key) {
          var stageRow = substrate.stages.filter(function (s) { return s[0] === key; })[0];
          return (stageRow ? stageRow[1] : key) + ' ' + Math.round((tick[key] || 0) * 100) + '%';
        }).join(', ') + '.';
      }

      var markerRows = simple ? [
        ['First signals', 'sensory'],
        ['Shared with everything', 'workspace'],
        ['Saying or doing something', 'output']
      ] : [
        ['Local recurrence', 'recurrence'],
        [cfg.substrate === 'model' ? 'Verbalizable subspace' : 'Global availability', 'workspace'],
        ['Self-monitoring readout', 'monitor'],
        ['Report / output', 'output'],
        ['Integration index (toy)', 'integration']
      ];

      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'TOY MODEL · NOT A BRAIN, NOT A MODEL'), h('h2', null, 'Workspace Bench')),
          pill('Markers only · nothing here measures experience', 'note')
        ),
        h('p', { className: 'cns-lead' }, simple
          ? 'Move the sliders and watch which steps light up. This is a made-up machine that helps us ask questions. It is not a real brain and not a real computer program.'
          : 'Run the same settings through a human masking paradigm and through a language-model probe. The point is not that either lane is realistic. The point is that the functional markers can match while the question this lab is about stays open in both.'),
        h('div', { className: 'cns-sim-substrates', role: 'group', 'aria-label': 'Choose a substrate' },
          [SIM_SUBSTRATES.human, SIM_SUBSTRATES.model].map(function (item) {
            var active = item.id === cfg.substrate;
            return h('button', {
              key: item.id, type: 'button', 'aria-pressed': active ? 'true' : 'false',
              onClick: function () { updateSim({ substrate: item.id }, item.label + ' selected'); },
              style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border }
            }, h('span', { 'aria-hidden': 'true' }, item.icon), h('span', null, simple && item.plainLabel ? item.plainLabel : item.label));
          })
        ),
        h('p', { className: 'cns-sim-blurb' }, copyFor('plainBlurb', 'blurb')),
        h('section', { className: 'cns-sim-presets', 'aria-labelledby': 'cns-sim-presets-title', style: { borderColor: C.border } },
          h('h3', { id: 'cns-sim-presets-title' }, simple ? 'Try one of these' : 'Set up a known comparison'),
          h('p', { className: 'cns-sim-hint' }, simple
            ? 'Each button sets the sliders for you. Read what to look for first, then look at the numbers.'
            : 'Each preset is one change from the clear-signal baseline. Read the question and what to expect before reading the run — a bench you interpret after the fact can seem to confirm anything.'),
          h('div', { className: 'cns-sim-preset-row', role: 'group', 'aria-label': 'Preset comparisons' }, presets.map(function (preset) {
            var active = activePreset && activePreset.id === preset.id;
            var presetLabel = simple && preset.plainLabel ? preset.plainLabel : preset.label;
            var presetNote = simple && preset.plainNote ? preset.plainNote : preset.note;
            return h('button', {
              key: preset.id, type: 'button', 'aria-pressed': active ? 'true' : 'false',
              onClick: function () {
                updateSim(Object.assign({}, preset.config), presetLabel + ' loaded. ' + presetNote, true);
                awardOnce('bench-preset-' + preset.id, 2, 'Ran a named comparison on the Workspace Bench');
              },
              style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border }
            }, h('span', { 'aria-hidden': 'true' }, preset.icon), presetLabel);
          })),
          activePreset && h('div', { className: 'cns-sim-preset-detail', style: { background: C.raised, borderColor: C.accent } },
            !simple && h('p', null, h('strong', null, 'Question: '), activePreset.asks),
            h('p', null, h('strong', null, simple ? 'Look for: ' : 'What to look for: '),
              simple && activePreset.plainNote ? activePreset.plainNote : activePreset.note)
          )
        ),
        h('div', { className: 'cns-sim-controls' },
          slider('strength', copyFor('plainStrengthLabel', 'strengthLabel'), copyFor('plainStrengthHint', 'strengthHint')),
          slider('interference', copyFor('plainInterferenceLabel', 'interferenceLabel'), copyFor('plainInterferenceHint', 'interferenceHint')),
          !simple && slider('topDown', substrate.topDownLabel, substrate.topDownHint)
        ),
        h('div', { className: 'cns-sim-toggles' },
          toggle('reportRequired', copyFor('plainReportLabel', 'reportLabel'),
            cfg.reportRequired ? copyFor('plainReportOnNote', 'reportOnNote') : copyFor('plainReportOffNote', 'reportOffNote')),
          !simple && toggle('bypass', substrate.bypassLabel, substrate.bypassNote)
        ),
        h('div', { className: 'cns-sim-readout', style: { background: C.raised, borderColor: C.border } },
          h('h3', null, 'What happened in this run'),
          h('p', { className: 'cns-sim-status', role: 'status' }, simple
            ? (run.markers.ignited
              ? 'The sharing step switched on at step ' + (run.markers.ignitionTick + 1) + '. Once it switches on, it goes most of the way.'
              : 'The sharing step never switched on. It only reached ' + simPercent(run.markers.workspace) + '.')
            : (run.markers.ignited
              ? 'Ignition: the ' + (cfg.substrate === 'model' ? 'verbalizable subspace' : 'global stage') + ' crossed this toy’s threshold at step ' + (run.markers.ignitionTick + 1) + '.'
              : 'No ignition: the ' + (cfg.substrate === 'model' ? 'verbalizable subspace' : 'global stage') + ' peaked at ' + simPercent(run.markers.workspace) + ', under this toy’s threshold.')),
          stageBars(run, visibleStages),
          renderNetwork(),
          h('p', { className: 'cns-sim-confound' }, h('strong', null, simple ? 'What to notice: ' : 'Read-out discipline: '), simConfoundNote(run, simple))
        ),
        h('div', { className: 'cns-sim-compare', style: { background: C.panel, borderColor: C.border } },
          h('h3', null, simple ? 'Same settings, both machines' : 'Same settings, both substrates'),
          h('p', { className: 'cns-sim-hint' }, simple
            ? 'The same numbers go into both machines. Look at how close the results are.'
            : 'Identical control values, two lanes. Where the markers converge, a functional description is doing all the work.'),
          h('div', { className: 'cns-table-wrap' },
            h('table', { className: 'cns-compare-table' },
              h('caption', null, 'Marker comparison for the current settings'),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, simple ? 'What we measured' : 'Marker'),
                h('th', { scope: 'col' }, simple && substrate.plainLabel ? substrate.plainLabel : substrate.label),
                h('th', { scope: 'col' }, simple && other.plainLabel ? other.plainLabel : other.label)
              )),
              h('tbody', null, markerRows.map(function (row) {
                return h('tr', { key: row[1] },
                  h('th', { scope: 'row' }, row[0]),
                  h('td', null, simPercent(run.markers[row[1]])),
                  h('td', null, simPercent(otherRun.markers[row[1]]))
                );
              }).concat([
                h('tr', { key: 'phenomenal', className: 'cns-sim-phenomenal-row' },
                  h('th', { scope: 'row' }, simple ? 'What it feels like' : 'Felt experience'),
                  h('td', null, 'Not measured'),
                  h('td', null, 'Not measured')
                )
              ]))
            )
          ),
          h('p', { className: 'cns-sim-verdict', style: { borderColor: C.bad } }, h('strong', null, 'The row that matters: '), simPhenomenalVerdict(simple))
        ),
        !simple && h('section', { className: 'cns-sim-theories', 'aria-labelledby': 'cns-sim-theories-title', style: { borderColor: C.border } },
          h('div', { className: 'cns-section-heading' },
            h('div', null, h('span', { className: 'cns-step' }, 'SAME RUN, DIFFERENT CRITERIA'), h('h3', { id: 'cns-sim-theories-title' }, 'What each view would say about this run')),
            h('span', { className: 'cns-count' }, theories.length + ' views at this level')
          ),
          h('p', { className: 'cns-sim-hint' }, 'A criterion being met here is a fact about this toy’s arithmetic, not evidence for the theory. Views that make no processing-stage claim say so.'),
          h('div', { className: 'cns-sim-theory-grid' }, theories.map(function (theory) {
            var readout = simTheoryReadout(theory, run);
            var tone = readout.met === true ? C.good : readout.met === false ? C.bad : C.muted;
            return h('article', { key: theory.id, className: 'cns-sim-theory', style: { borderColor: tone, background: C.raised } },
              h('div', { className: 'cns-sim-theory-head' },
                h('span', { 'aria-hidden': 'true' }, theory.icon),
                h('h4', null, theory.name),
                h('span', { className: 'cns-sim-verdict-tag', style: { color: tone, borderColor: tone } },
                  readout.met === true ? 'Criterion met in this toy' : readout.met === false ? 'Criterion not met in this toy' : 'No criterion applied')
              ),
              h('p', null, readout.text)
            );
          }))
        ),
        !simple && h('div', { className: 'cns-sim-limits', style: { background: C.raised, borderColor: C.border } },
          h('h3', null, 'What this bench cannot show'),
          h('ul', null, (advanced ? BENCH_LIMITS_FULL : BENCH_LIMITS_PLAIN).map(function (line, index) { return h('li', { key: index }, line); }))
        )
      ));
    }

    function getQuiz() { return quizFor(profile); }

    function renderCheck() {
      var quiz = getQuiz();
      var quizKey = profile.id;
      var allAnswers = d.quizAnswers || {};
      var answers = allAnswers[quizKey] || {};
      var answered = Object.keys(answers).length;
      var correct = quiz.reduce(function (sum, q, index) { return sum + (answers[index] === q[2] ? 1 : 0); }, 0);
      var complete = answered === quiz.length;
      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'GRADE-ADAPTED CHECK'), h('h2', null, 'Knowledge Check')),
          h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, correct + '/' + quiz.length + ' correct')
        ),
        h('p', { className: 'cns-lead' }, profile.id === 'early' ? 'Choose the best answer. You can try again.' : profile.id === 'elementary' ? 'Use the evidence/theory/question labels and compare what each view emphasizes.' : profile.id === 'middle' ? 'Apply vocabulary and catch claims that go beyond the evidence.' : profile.id === 'high' ? 'Analyze mechanisms, confounds, and calibrated conclusions.' : profile.id === 'college' ? 'Evaluate operational measures, constitutive claims, and discriminating evidence.' : 'Audit construct validity, bridge principles, and revision conditions.'),
        h('ol', { className: 'cns-quiz' }, quiz.map(function (q, index) {
          var picked = answers[index];
          var isCorrect = picked === q[2];
          return h('li', { key: index, style: { background: C.raised, borderColor: picked == null ? C.border : isCorrect ? C.good : C.bad } },
            h('fieldset', null,
              h('legend', null, (index + 1) + '. ' + q[0]),
              h('div', { className: 'cns-answer-grid' }, q[1].map(function (option, optionIndex) {
                var active = picked === optionIndex;
                return h('button', { key: optionIndex, type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () {
                  patchState(function (current) {
                    var byProfile = Object.assign({}, current.quizAnswers || {});
                    var profileAnswers = Object.assign({}, byProfile[quizKey] || {});
                    profileAnswers[index] = optionIndex;
                    byProfile[quizKey] = profileAnswers;
                    var willComplete = Object.keys(profileAnswers).length === quiz.length;
                    var prior = current.checkComplete;
                    var completion = (prior && typeof prior === 'object') ? Object.assign({}, prior) : (prior === true ? { legacy: true } : {});
                    if (willComplete) completion[quizKey] = true;
                    return { quizAnswers: byProfile, checkComplete: completion };
                  }, 'Answer ' + (optionIndex + 1) + ' selected for question ' + (index + 1) + '. ' + (optionIndex === q[2] ? 'Correct.' : 'Not quite. ' + q[3]));
                  if (optionIndex === q[2]) awardOnce('quiz-' + quizKey + '-' + index, 4, 'Consciousness knowledge check');
                }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } }, option);
              })),
              picked != null && h('p', { className: 'cns-feedback', role: 'status', style: { color: isCorrect ? C.good : C.bad } }, h('strong', null, isCorrect ? 'Correct. ' : 'Not quite. '), q[3],
                !isCorrect && q[4] && MISCONCEPTION_LABELS[q[4]] && h('span', { className: 'cns-feedback-explanation' }, ' Pattern: ' + MISCONCEPTION_LABELS[q[4]] + '.'))
            )
          );
        })),
        complete && h('div', { className: 'cns-complete', style: { background: C.raised, borderColor: C.good }, role: 'status' },
          h('strong', null, 'Check complete: ' + correct + ' of ' + quiz.length + '.'),
          h('p', null, correct === quiz.length ? 'You kept evidence, theory, and uncertainty separate.' : 'Review the feedback, then change any answer. Open questions are not graded as if one philosophy has already won.')
        ),
        complete && renderMisconceptionSummary(),
        h('button', { type: 'button', className: 'cns-reset', onClick: function () { patchState(function (current) { var byProfile = Object.assign({}, current.quizAnswers || {}); delete byProfile[quizKey]; var prior = current.checkComplete; var completion = (prior && typeof prior === 'object') ? Object.assign({}, prior) : (prior === true ? { legacy: true } : {}); delete completion[quizKey]; return { quizAnswers: byProfile, checkComplete: completion }; }, 'Knowledge check reset'); }, style: { borderColor: C.border, color: C.text, background: C.panel } }, 'Reset this level\'s check')
      ));
    }

    function renderTheoryMap() {
      var axes = mapAxesForProfile(profile);
      var mapSession = (d.mapSessions && d.mapSessions[profile.id]) || {};
      var selectedAxis = axes.indexOf(mapSession.axis) !== -1 ? mapSession.axis : axes[0];
      var hasPhilosophy = theories.some(function (theory) { return theory.group === 'philosophy'; });
      var groupFilter = hasPhilosophy && ['all', 'science', 'philosophy'].indexOf(mapSession.group) !== -1 ? mapSession.group : 'all';
      var visibleTheories = theories.filter(function (theory) { return groupFilter === 'all' || theory.group === groupFilter; });
      var selectedMapTheoryId = visibleTheories.some(function (theory) { return theory.id === mapSession.selectedTheory; }) ? mapSession.selectedTheory : visibleTheories[0].id;
      var selectedMapTheory = THEORIES[selectedMapTheoryId];
      var selectedMapCopy = mergeLevelCopy(selectedMapTheory, profile.id);
      var reflectionMinimum = mapReflectionMinimumForProfile(profile);
      var reflection = String(mapSession.reflection || '');
      var lanes = mapLaneSpecs(selectedAxis, profile).map(function (lane) {
        var laneTheories = visibleTheories.filter(function (theory) {
          var placement = theoryMapPlacementFor(theory.id, selectedAxis, profile);
          return placement && placement.laneId === lane[0];
        });
        return { id: lane[0], label: lane[1], description: profile.id === 'early' && lane[3] ? lane[3] : lane[2], theories: laneTheories };
      }).filter(function (lane) { return lane.theories.length > 0; });

      function recordMapInteraction(patch, announcement) {
        patchState(function (current) {
          var sessions = Object.assign({}, current.mapSessions || {});
          var nextSession = Object.assign({}, sessions[profile.id] || {}, patch || {});
          nextSession.interactions = ((sessions[profile.id] && sessions[profile.id].interactions) || 0) + 1;
          sessions[profile.id] = nextSession;
          return { mapSessions: sessions };
        }, announcement);
      }

      function updateMapReflection(value) {
        patchState(function (current) {
          var sessions = Object.assign({}, current.mapSessions || {});
          sessions[profile.id] = Object.assign({}, sessions[profile.id] || {}, { reflection: value });
          return { mapSessions: sessions };
        });
        if ((mapSession.interactions || 0) >= 2 && value.trim().length >= reflectionMinimum) awardOnce('theory-map-' + profile.id, 6, 'Explored and reflected on the consciousness theory landscape');
      }

      var axisLabels = {
        target: profile.id === 'early' ? 'What does each idea focus on?' : 'Explanatory target',
        scale: profile.id === 'elementary' ? 'Where does the idea look?' : 'Processing scale',
        substrate: 'Substrate or realization stance'
      };

      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'SYNTHESIS LANDSCAPE'), h('h2', null, profile.id === 'early' ? 'A map of the big ideas' : 'Interactive Theory Landscape Map')),
          h('span', { className: 'cns-count' }, visibleTheories.length + ' views mapped')
        ),
        h('p', { className: 'cns-lead' }, profile.id === 'early'
          ? 'Ideas can ask different questions. Put them on a map to see what each one tries to explain.'
          : profile.id === 'elementary'
            ? 'Change the map to see whether theories focus on different questions or different places in processing.'
            : 'Map theory families by explanatory target, processing scale, or realization stance. Proximity means a shared orientation on the selected axis, not equivalence or agreement.'),
        epistemicBox('caution', 'Orientation aid, not a verdict', profile.id === 'early'
          ? 'A map makes ideas easier to compare, but an idea can belong in more than one place.'
          : 'Placements summarize representative formulations. Theory variants, explanatory levels, and bridge assumptions can cross lanes; no position is supported or rejected merely by where it appears.'),
        h('div', { className: 'cns-map-toolbar' },
          h('fieldset', null, h('legend', null, 'Choose a map axis'), h('div', { className: 'cns-map-axis-buttons' }, axes.map(function (axis) {
            var active = selectedAxis === axis;
            return h('button', { key: axis, type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { recordMapInteraction({ axis: axis }, axisLabels[axis] + ' map selected'); }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } }, axisLabels[axis]);
          }))),
          hasPhilosophy && h('fieldset', null, h('legend', null, 'Filter views'), h('div', { className: 'cns-map-axis-buttons' }, [['all', 'All'], ['science', 'Scientific'], ['philosophy', 'Philosophical']].map(function (item) {
            var active = groupFilter === item[0];
            return h('button', { key: item[0], type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { recordMapInteraction({ group: item[0] }, item[1] + ' views shown'); }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } }, item[1]);
          })))
        ),
        h('div', { className: 'cns-map-axis-title' }, h('strong', null, axisLabels[selectedAxis]), h('span', null, lanes.length + ' occupied lanes')),
        h('div', { className: 'cns-landscape', role: 'list', 'aria-label': axisLabels[selectedAxis] + ' theory map' }, lanes.map(function (lane) {
          // A div, not a section: role="listitem" is not an allowed role on section,
          // so the list semantics were being discarded by the accessibility tree.
          return h('div', { key: lane.id, className: 'cns-map-lane', role: 'listitem', style: { background: C.raised, borderColor: C.border }, 'aria-labelledby': 'cns-map-lane-' + lane.id },
            h('div', { className: 'cns-map-lane-heading' }, h('h3', { id: 'cns-map-lane-' + lane.id }, lane.label), h('span', null, lane.theories.length)),
            h('p', null, lane.description),
            h('div', { className: 'cns-map-theories' }, lane.theories.map(function (theory) {
              var active = theory.id === selectedMapTheoryId;
              var placement = theoryMapPlacementFor(theory.id, selectedAxis, profile);
              return h('button', { key: theory.id, type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { recordMapInteraction({ selectedTheory: theory.id }, theory.name + ' inspected on the map'); }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } },
                h('span', { className: 'cns-map-theory-name' }, theoryTitle(theory, profile)),
                h('span', { className: 'cns-map-reason' }, placement.reason)
              );
            }))
          );
        })),
        h('article', { className: 'cns-map-detail', style: { background: C.raised, borderColor: selectedMapTheory.group === 'science' ? C.science : C.philosophy }, 'aria-live': 'polite' },
          h('div', null, pill(selectedMapTheory.group === 'science' ? 'Scientific model' : 'Philosophical view', selectedMapTheory.group), h('h3', null, theoryTitle(selectedMapTheory, profile))),
          h('p', null, theoryMapPlacementFor(selectedMapTheory.id, selectedAxis, profile).reason),
          h('p', { className: 'cns-map-detail-limit' }, h('strong', null, profile.id === 'early' ? 'Still to ask: ' : 'Key challenge: '), selectedMapCopy.challenge || 'What evidence would separate this view from alternatives?')
        ),
        h('section', { className: 'cns-map-reflection', style: { background: C.raised, borderColor: C.border } },
          h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'SYNTHESIS MOVE'), h('h3', null, profile.id === 'early' ? 'Tell what changed on the map' : 'Reflect across explanatory levels')), h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, Math.min(reflectionMinimum, reflection.trim().length) + '/' + reflectionMinimum + ' characters')),
          h('p', null, profile.id === 'early' ? 'How are two ideas looking for different things?' : profile.id === 'elementary' ? 'Choose two views. Explain one way they focus on different questions or processing places.' : profile.id === 'middle' ? 'Identify two views that appear close on one axis but differ on another.' : 'Explain whether two nearby placements represent genuine competition, different explanatory levels, or shared compatibility without discrimination.'),
          h('textarea', { rows: 4, value: reflection, onChange: function (event) { updateMapReflection(event.target.value); }, placeholder: profile.id === 'early' ? 'One idea looks for... Another looks for...' : 'On the selected axis... On another axis... This matters because...' }),
          h('p', { className: 'cns-debate-requirement' }, 'Inspect at least two map views or theory cards and write ' + reflectionMinimum + ' characters to complete this path.'),
          mapCompleteForProfile(d, profile) && h('p', { className: 'cns-debate-complete', role: 'status', style: { color: C.good } }, 'Map synthesis complete \u2713')
        )
      ));
    }
    function renderExperiment() {
      var allRuns = d.experimentRuns || {};
      var run = allRuns[profile.id] || {};
      var settings = normalizeExperimentSettings(run.settings);
      var simulatorTheories = theories.filter(function (theory) { return theory.group === 'science' && EXPERIMENT_THEORY_IDS.indexOf(theory.id) !== -1; });
      var chosenTheoryId = simulatorTheories.some(function (theory) { return theory.id === run.theoryId; }) ? run.theoryId : simulatorTheories[0].id;
      var chosenTheory = THEORIES[chosenTheoryId];
      var minimum = experimentMinimumForProfile(profile);
      var preregistered = String(run.preregistered || '');
      var preregReady = preregistered.trim().length >= minimum;
      var scenario = profile.id === 'early'
        ? 'The jumble comes ' + settings.maskDelay + ' ms after the picture. ' + (settings.attention === 'focused' ? 'Looking right at it. ' : 'Looking around. ') + (settings.report === 'no-report' ? 'We do not ask.' : 'We ask what they saw.')
        : 'Target-mask delay: ' + settings.maskDelay + ' ms; attention: ' + settings.attention + '; response condition: ' + (settings.report === 'no-report' ? 'no direct report' : 'direct report') + '.';

      function updateExperiment(patch, announcement) {
        patchState(function (current) {
          var runs = Object.assign({}, current.experimentRuns || {});
          var nextRun = Object.assign({}, runs[profile.id] || {}, patch || {});
          runs[profile.id] = nextRun;
          return { experimentRuns: runs };
        }, announcement);
      }

      function updateSetting(field, value) {
        var nextSettings = Object.assign({}, settings);
        nextSettings[field] = value;
        updateExperiment({ settings: normalizeExperimentSettings(nextSettings), revealed: false }, field + ' changed; forecasts hidden until you preregister again');
      }

      function revealPredictions() {
        if (!preregReady) return;
        updateExperiment({ settings: settings, theoryId: chosenTheoryId, revealed: true }, 'Theory-derived forecasts revealed');
        awardOnce('experiment-' + profile.id, 8, 'Preregistered and compared consciousness theory predictions');
      }

      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'QUALITATIVE MODEL COMPARISON'), h('h2', null, profile.id === 'early' ? 'Picture and mask experiment' : 'Theory Prediction Simulator')),
          pill(profile.shortLabel + ' simulation', 'note')
        ),
        h('p', { className: 'cns-lead' }, profile.id === 'early'
          ? 'A picture flashes, then a jumble covers it. Change the test, make a guess, and compare what different ideas expect.'
          : profile.id === 'elementary'
            ? 'Change a masking experiment, write your prediction first, and then compare the theories. The cards are reasoned forecasts, not measurements.'
            : profile.id === 'middle'
              ? 'Manipulate target-mask timing, attention, and report demand. Preregister a qualitative prediction before revealing model-relative forecasts.'
              : 'Use the controls to expose shared predictions, report confounds, and theory-specific bridge assumptions. This is a conceptual simulator, not a fitted neural model.'),
        epistemicBox('caution', 'Simulation boundary', profile.id === 'early'
          ? 'The tool shows what ideas might expect. It does not run a brain experiment or prove which idea is right.'
          : 'Outputs below are qualitative deductions from simplified theory commitments. They are not empirical data, effect-size estimates, clinical guidance, or evidence that a theory is true.'),
        h('section', { className: 'cns-experiment-design', 'aria-labelledby': 'cns-experiment-design-title', style: { background: C.raised, borderColor: C.border } },
          h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'STEP 1'), h('h3', { id: 'cns-experiment-design-title' }, 'Set the experimental conditions')), h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, scenario)),
          h('ol', { className: 'cns-experiment-flow', 'aria-label': 'Masking experiment sequence' },
            h('li', null, h('strong', null, '1. Target'), h('span', null, profile.id === 'early' ? 'A small picture flashes.' : 'A near-threshold visual target appears briefly.')),
            h('li', null, h('strong', null, '2. Delay'), h('span', null, settings.maskDelay + ' milliseconds')),
            h('li', null, h('strong', null, '3. Mask'), h('span', null, profile.id === 'early' ? 'A jumble covers the picture.' : 'A backward mask competes with target processing.')),
            h('li', null, h('strong', null, '4. Measure'), h('span', null, profile.id === 'early'
              ? (settings.report === 'no-report' ? 'We watch carefully without asking.' : 'We ask what they saw and how sure they are.')
              : (settings.report === 'no-report' ? 'Use an indirect, independently validated proxy.' : 'Collect accuracy, confidence, and direct report.')))
          ),
          h('div', { className: 'cns-experiment-controls' },
            h('label', { className: 'cns-delay-control', htmlFor: 'cns-mask-delay' },
              h('strong', null, profile.id === 'early' ? 'How soon does the jumble appear?' : 'Target-mask delay'),
              h('span', null, settings.maskDelay + ' ms'),
              h('input', { id: 'cns-mask-delay', type: 'range', min: 20, max: 180, step: 20, value: settings.maskDelay, onChange: function (event) { updateSetting('maskDelay', event.target.value); }, 'aria-valuetext': settings.maskDelay + ' milliseconds after the target' }),
              h('small', null, profile.id === 'early' ? 'Left: the jumble comes very fast \u00B7 Right: the picture gets more time' : '20 ms: rapid interruption \u00B7 180 ms: more target-processing time')
            ),
            h('fieldset', null, h('legend', null, profile.id === 'early' ? 'Is the person paying attention?' : 'Attention condition'), h('div', { className: 'cns-toggle-group' },
              (profile.id === 'early' ? [['focused', 'Looking right at it'], ['divided', 'Looking around']] : [['focused', 'Focused'], ['divided', 'Divided']]).map(function (item) { var active = settings.attention === item[0]; return h('button', { key: item[0], type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { updateSetting('attention', item[0]); }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } }, item[1]); })
            )),
            h('fieldset', null, h('legend', null, profile.id === 'early' ? 'Do we ask what they saw?' : 'Response condition'), h('div', { className: 'cns-toggle-group' },
              (profile.id === 'early' ? [['direct-report', 'We ask'], ['no-report', 'We do not ask']] : [['direct-report', 'Direct report'], ['no-report', 'No direct report']]).map(function (item) { var active = settings.report === item[0]; return h('button', { key: item[0], type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { updateSetting('report', item[0]); }, style: { background: active ? C.accent : C.panel, color: active ? C.accentText : C.text, borderColor: active ? C.accent : C.border } }, item[1]); })
            ))
          )
        ),
        h('section', { className: 'cns-preregister', 'aria-labelledby': 'cns-preregister-title', style: { borderColor: C.border } },
          h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'STEP 2'), h('h3', { id: 'cns-preregister-title' }, profile.id === 'early' ? 'Make your guess first' : 'Preregister a qualitative prediction')), h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, Math.min(minimum, preregistered.trim().length) + '/' + minimum + ' characters')),
          h('label', null, h('span', null, profile.id === 'early' ? 'Idea you are using' : 'Theory whose prediction you will commit to'), h('select', { value: chosenTheoryId, onChange: function (event) { updateExperiment({ theoryId: event.target.value, revealed: false }, 'Prediction theory changed'); }, style: { background: C.panel, color: C.text, borderColor: C.border } }, simulatorTheories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theoryTitle(theory, profile)); }))),
          h('label', null, h('span', null, profile.id === 'early' ? 'What do you think this idea expects?' : 'State the expected outcome, relevant mechanism, and one possible limit.'), h('textarea', { rows: 4, value: preregistered, onChange: function (event) { updateExperiment({ preregistered: event.target.value, revealed: false }); }, placeholder: chosenTheory.short + ' predicts... because... This would not yet prove...' })),
          h('button', { type: 'button', className: 'cns-reveal', disabled: !preregReady, onClick: revealPredictions, style: { background: preregReady ? C.accent : C.raised, color: preregReady ? C.accentText : C.muted, borderColor: preregReady ? C.accent : C.border } }, run.revealed && preregReady ? 'Forecasts revealed \u2713' : 'Reveal theory forecasts')
        ),
        run.revealed && preregReady && h('section', { className: 'cns-forecast-section', 'aria-labelledby': 'cns-forecast-title' },
          h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'STEP 3'), h('h3', { id: 'cns-forecast-title' }, 'Compare the forecasts')), h('span', { className: 'cns-score' }, simulatorTheories.length + ' scientific theory lenses')),
          h('p', { className: 'cns-forecast-warning', role: 'note' }, 'THEORY-DERIVED PREDICTIONS \u00B7 NOT OBSERVED DATA'),
          h('div', { className: 'cns-forecast-grid' }, simulatorTheories.map(function (theory) {
            var forecast = experimentPredictionFor(theory.id, profile, settings);
            return h('article', { key: theory.id, className: 'cns-forecast-card', style: { background: C.raised, borderColor: theory.id === chosenTheoryId ? C.accent : C.border } },
              h('div', null, h('span', { className: 'cns-pill', style: { color: C.science, borderColor: C.science } }, forecast.marker), h('h4', null, theoryTitle(theory, profile))),
              h('p', null, forecast.prediction),
              h('p', { className: 'cns-forecast-limit' }, h('strong', null, 'Inference limit: '), forecast.limit)
            );
          })),
          // The explain step. A predict-observe cycle without it leaves the
          // learner's own forecast unexamined; this does not gate anything.
          h('label', { className: 'cns-experiment-reflect' },
            h('strong', null, profile.id === 'early' ? 'Did your guess match?' : 'Compare your prediction with the forecasts'),
            h('span', null, profile.id === 'early' ? 'Say what was the same and what was different.' : 'Where did your preregistered prediction agree or differ, and which forecast would need a different experiment to test?'),
            h('textarea', { rows: 3, value: String(run.reflection || ''), onChange: function (event) { updateExperiment({ reflection: event.target.value }); }, placeholder: profile.id === 'early' ? 'My guess was... The cards said...' : 'My prediction matched on... It differed on... A test that would separate them is...' })
          ),
          h('p', { className: 'cns-scope-note' }, 'Shared predictions are weaker tests: compatibility is not discrimination. Prefer a controlled result for which the theories forecast different outcomes.'),
          epistemicBox('question', 'Discrimination question', profile.id === 'early'
            ? 'If several ideas expect the same answer, that answer does not tell us which idea is best.'
            : profile.id === 'elementary'
              ? 'Which result would one theory expect but another would not? Shared predictions are weaker tests.'
              : profile.id === 'middle'
                ? 'Which manipulation separates local recurrence, global access, and higher-order representation while keeping performance comparable?'
                : 'Specify a divergent prediction, validated measurement model, auxiliary assumptions, and the outcome that would trigger theory revision.')
        )
      ));
    }
    function renderPortfolio() {
      var synthesisByProfile = d.portfolioSynthesis || {};
      var synthesis = synthesisByProfile[profile.id] || {};
      var minimum = portfolioMinimumForProfile(profile);
      var fieldsReady = PORTFOLIO_FIELDS.filter(function (field) { return String(synthesis[field] || '').trim().length >= minimum; }).length;
      // One derivation, shared with the path strip under the tabs.
      var artifacts = learningArtifactsFor(d, profile);
      var artifactsDone = artifacts.filter(function (artifact) { return artifact.done; }).length;
      var summaryText = portfolioSummaryText(d, profile);
      var canCopy = typeof navigator !== 'undefined' && !!(navigator.clipboard && navigator.clipboard.writeText);

      function updateSynthesis(field, value) {
        patchState(function (current) {
          var allSynthesis = Object.assign({}, current.portfolioSynthesis || {});
          var nextSynthesis = Object.assign({}, allSynthesis[profile.id] || {});
          nextSynthesis[field] = value;
          allSynthesis[profile.id] = nextSynthesis;
          return { portfolioSynthesis: allSynthesis, summaryCopied: false };
        });
        var candidate = Object.assign({}, synthesis);
        candidate[field] = value;
        if (PORTFOLIO_FIELDS.every(function (item) { return String(candidate[item] || '').trim().length >= minimum; })) awardOnce('portfolio-' + profile.id, 10, 'Completed a claim-evidence-uncertainty consciousness portfolio');
      }

      var prompts = profile.id === 'early' ? {
        claim: ['What I think now', 'Tell one idea that seems helpful and what it tries to explain.'],
        evidence: ['The clues I used', 'Name a clue and say what it can show.'],
        uncertainty: ['What I still wonder', 'Say what nobody knows yet or what could change your mind.']
      } : profile.id === 'elementary' ? {
        claim: ['My current explanation', 'State which idea or combination seems most useful for a specific question.'],
        evidence: ['Evidence and its limit', 'Name an observation, connect it carefully, and state what it cannot prove.'],
        uncertainty: ['Open question', 'Name what remains unresolved and a result that could change your comparison.']
      } : {
        claim: [profile.id === 'graduate' ? 'Current model-relative position' : 'Current best-supported position', profile.id === 'graduate' ? 'Specify the explanandum, theoretical commitment, and auxiliaries you are provisionally endorsing.' : 'State a precise, provisional claim and the explanatory target it addresses.'],
        evidence: [profile.id === 'graduate' ? 'Evidential chain and identification limits' : 'Evidence, inference, and limit', profile.id === 'graduate' ? 'Trace construct, operationalization, result, bridge principle, alternative model, and identification threat.' : 'Separate the empirical result from the theory-dependent inference and strongest alternative.'],
        uncertainty: [profile.id === 'graduate' ? 'Revision condition' : 'Uncertainty and revision condition', profile.id === 'graduate' ? 'Give a preregistered outcome or principled theoretical result that would revise a core or auxiliary commitment.' : 'Name what remains unresolved and a discriminating result that would change your view.']
      };

      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' },
          h('div', null, h('span', { className: 'cns-step' }, 'LEARNER SYNTHESIS'), h('h2', null, profile.id === 'early' ? 'My consciousness learning folder' : 'Consciousness Learning Portfolio')),
          h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, artifactsDone + '/' + artifacts.length + ' artifacts ready')
        ),
        h('p', { className: 'cns-lead' }, profile.id === 'early' ? 'This folder gathers your clues, ideas, and questions in one place.' : 'Review evidence-calibration work across the lab, then state a provisional position that remains open to revision.'),
        epistemicBox('caution', 'Learner-authored, not scientific consensus', profile.id === 'early' ? 'Your folder shows your thinking today. It does not turn an idea into a fact.' : 'Portfolio reflections document the learner\'s reasoning. They are not endorsements by the tool, direct evidence, grades assigned by an instructor, or claims that a scientific dispute is settled.'),
        h('section', { className: 'cns-portfolio-overview', 'aria-labelledby': 'cns-portfolio-overview-title' },
          h('h3', { id: 'cns-portfolio-overview-title' }, 'Collected learning artifacts'),
          h('div', { className: 'cns-portfolio-grid' }, artifacts.map(function (artifact) {
            return h('article', { key: artifact.id, className: artifact.done ? 'is-ready' : '', style: { background: C.raised, borderColor: artifact.done ? C.good : C.border } },
              h('div', null, h('span', { 'aria-hidden': 'true' }, artifact.done ? '\u2713' : '\u2022'), h('strong', null, profile.id === 'early' && artifact.plainLabel ? artifact.plainLabel : artifact.label)),
              h('p', null, artifact.detail)
            );
          }))
        ),
        renderMisconceptionSummary(),
        h('section', { className: 'cns-portfolio-synthesis', 'aria-labelledby': 'cns-portfolio-synthesis-title', style: { background: C.raised, borderColor: C.border } },
          h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'FINAL REFLECTION'), h('h3', { id: 'cns-portfolio-synthesis-title' }, 'Claim, evidence, and uncertainty')), h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, fieldsReady + '/' + PORTFOLIO_FIELDS.length + ' fields ready')),
          h('div', { className: 'cns-portfolio-fields' }, PORTFOLIO_FIELDS.map(function (field) {
            return h('label', { key: field }, h('strong', null, prompts[field][0]), h('span', null, prompts[field][1]), h('textarea', { rows: 4, value: synthesis[field] || '', onChange: function (event) { updateSynthesis(field, event.target.value); }, placeholder: profile.id === 'early'
              ? (field === 'claim' ? 'I think... because...' : field === 'evidence' ? 'I saw... It shows... It cannot show...' : 'I still wonder...')
              : profile.id === 'elementary'
                ? (field === 'claim' ? 'The idea that helps most is... It explains...' : field === 'evidence' ? 'We observed... This shows... It cannot prove...' : 'We still do not know... My view could change if...')
                : (field === 'claim' ? 'My current, provisional claim is...' : field === 'evidence' ? 'The evidence shows... The inference requires... A limit is...' : 'I am still uncertain about... I would revise if...') }));
          })),
          h('p', { className: 'cns-debate-requirement' }, 'Each reflection needs at least ' + minimum + ' characters for this reading path.'),
          portfolioCompleteForProfile(d, profile) && h('div', { className: 'cns-portfolio-complete', role: 'status', style: { borderColor: C.good } }, h('strong', null, 'Portfolio synthesis complete \u2713'), h('p', null, 'Your position is recorded as provisional and evidence-calibrated. Revisit it when evidence or your reasoning changes.'))
        ),
        h('section', { className: 'cns-portfolio-share', 'aria-labelledby': 'cns-portfolio-share-title', style: { background: C.raised, borderColor: C.border } },
          h('div', { className: 'cns-section-heading' },
            h('div', null, h('span', { className: 'cns-step' }, 'HAND IT IN'), h('h3', { id: 'cns-portfolio-share-title' }, profile.id === 'early' ? 'Share my folder' : 'Summary to share')),
            canCopy && h('button', {
              type: 'button', className: 'cns-reset',
              onClick: function () {
                navigator.clipboard.writeText(summaryText).then(
                  function () { patchState({ summaryCopied: true }, 'Summary copied to the clipboard'); },
                  function () { patchState({ summaryCopied: false }, 'Copy failed. Select the text and copy it by hand.'); }
                );
              },
              style: { borderColor: C.border, color: C.text, background: C.panel }
            }, d.summaryCopied ? 'Copied \u2713' : 'Copy summary')
          ),
          h('p', { className: 'cns-sim-hint' }, profile.id === 'early' ? 'Everything in your folder as plain words, ready to give to a teacher.' : 'Plain text of everything above, ready to paste into a document or hand to a teacher.'),
          h('textarea', { className: 'cns-summary-text', readOnly: true, rows: 12, value: summaryText, 'aria-label': 'Plain-text portfolio summary' })
        )
      ));
    }

    function renderSources() {
      var visibleSources = SOURCES.filter(function (source) { return levelAtLeast(profile.id, source.min); });
      return panel(h(React.Fragment, null,
        h('div', { className: 'cns-section-heading' }, h('div', null, h('span', { className: 'cns-step' }, 'TRANSPARENCY'), h('h2', null, 'Sources, boundaries, and honest uncertainty'))),
        h('div', { className: 'cns-boundaries' },
          epistemicBox('evidence', 'Evidence', profile.id === 'early' ? 'A clue someone observed or measured. One clue can fit several ideas.' : 'An observation or measurement. Its relevance depends on method and may be shared by several theories.'),
          epistemicBox('claim', 'Theory claim', profile.id === 'early' ? 'An idea used to explain clues. It can be tested but is not a measured fact.' : 'A proposed mechanism, identity, sufficiency condition, or interpretation. It is not converted into fact by matching one result.'),
          epistemicBox('question', 'Open question', profile.id === 'early' ? 'A question people have not solved yet.' : 'A question without scientific or philosophical consensus, sometimes because no agreed operational test exists.'),
          epistemicBox('thought', 'Thought experiment', profile.id === 'early' ? 'A pretend story used to think carefully, not a measurement.' : 'A reasoning tool that tests implications or concepts; it is not empirical evidence that the imagined case exists.')
        ),
        h('section', { className: 'cns-limit-list', 'aria-labelledby': 'cns-limits-title' },
          h('h3', { id: 'cns-limits-title' }, 'What this lab does not claim'),
          h('ul', null,
            h('li', null, 'No current scientific theory has been established as the complete explanation of consciousness.'),
            h('li', null, 'Theories may overlap because they target different phenomena or explanatory levels.'),
            h('li', null, 'Report is useful evidence, but producing a report recruits additional processes.'),
            h('li', null, 'Responsiveness, speech, intelligence, and disability status are not consciousness meters.'),
            h('li', null, 'Current AI can emulate emotional language and some emotion-like functions; those abilities do not establish subjective experience.'),
            h('li', null, 'The selected views are influential academic examples, not every scientific, cultural, religious, or philosophical account.'),
            h('li', null, 'The Workspace Bench is arithmetic written to make one debate legible. Nothing it shows is evidence about brains, models, or experience.')
          )
        ),
        h('section', { className: 'cns-facilitator', 'aria-labelledby': 'cns-facilitator-title' },
          h('h3', { id: 'cns-facilitator-title' }, 'For facilitators: the suggested sequence'),
          h('p', null, 'Ten steps, about ' + PATH_STEPS.reduce(function (sum, step) { return sum + step.minutes; }, 0) + ' minutes in total, in the order the learning path suggests. Each step carries one discussion prompt that keeps evidence, theory, and open questions separate. Every section stays open; the order is a suggestion.'),
          h('ol', { className: 'cns-facilitator-steps' }, PATH_STEPS.map(function (step) {
            return h('li', { key: step.id },
              h('strong', null, (profile.id === 'early' && step.plainLabel ? step.plainLabel : step.label) + ' (' + viewLabel(step.view) + ', about ' + step.minutes + ' min)'),
              h('span', null, step.discuss));
          }))
        ),
        h('section', { 'aria-labelledby': 'cns-sources-title' },
          h('h3', { id: 'cns-sources-title' }, profile.id === 'early' ? 'Sources for teachers and curious learners' : 'Primary and peer-reviewed starting points'),
          h('ul', { className: 'cns-sources' }, visibleSources.map(function (source) {
            return h('li', { key: source.url, style: { borderColor: C.border, background: C.raised } },
              h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer' }, source.label, h('span', { className: 'sr-only' }, ' (opens in a new tab)')),
              h('p', null, source.note)
            );
          }))
        ),
        levelAtLeast(profile.id, 'high') && h('div', { className: 'cns-frontier-note', style: { background: C.raised, borderColor: C.border } },
          h('h3', null, 'Frontier evidence changes faster than textbook definitions'),
          h('p', null, 'The J-space case is dated 2026 and labeled as a new vendor-authored preprint. Its access-like results are included because they sharpen a comparison, not because they settle AI consciousness. Re-check the primary source when using this lab in a future course.')
        )
      ));
    }

    var body;
    if (activeView === 'compare') body = renderCompare();
    else if (activeView === 'evidence') body = renderEvidence();
    else if (activeView === 'cases') body = renderCases();
    else if (activeView === 'bench') body = renderBench();
    else if (activeView === 'check') body = renderCheck();
    else if (activeView === 'map') body = renderTheoryMap();
    else if (activeView === 'experiment') body = renderExperiment();
    else if (activeView === 'portfolio') body = renderPortfolio();
    else if (activeView === 'sources') body = renderSources();
    else body = renderLearn();

    return h('main', {
      id: 'cns-main', className: 'consciousness-lab', 'data-grade-profile': profile.id,
      'data-reading-path': profile.shortLabel, 'aria-label': 'Consciousness Theory Lab for ' + profile.shortLabel,
      style: {
        background: C.bg, color: C.text, '--cns-focus': C.focus, '--cns-border': C.border,
        '--cns-panel': C.panel, '--cns-text': C.text, '--cns-muted': C.muted,
        '--cns-link': C.link, '--cns-step': C.step, '--cns-alert-bg': C.alertBg, '--cns-alert-text': C.alertText
      }
    }, renderHeader(), renderLearningPath(), body, h('p', { className: 'cns-footer-note' }, 'Consciousness Theory Lab \u00B7 Compare claims with care \u00B7 Keep evidence and experience distinct'));
  }

  function injectConsciousnessStyles() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('consciousness-lab-styles')) return;
    var style = document.createElement('style');
    style.id = 'consciousness-lab-styles';
    style.textContent = [
      '.consciousness-lab{min-height:100%;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}',
      '.consciousness-lab *{box-sizing:border-box}',
      '.consciousness-lab button,.consciousness-lab select,.consciousness-lab textarea{font:inherit}',
      '.consciousness-lab button,.consciousness-lab select{min-height:44px}',
      '.consciousness-lab button{cursor:pointer}',
      '.consciousness-lab button:focus-visible,.consciousness-lab select:focus-visible,.consciousness-lab textarea:focus-visible,.consciousness-lab a:focus-visible{outline:3px solid var(--cns-focus);outline-offset:3px}',
      '.cns-skip{position:absolute;left:-9999px;top:8px;z-index:20;padding:10px 14px;border-radius:8px;background:#fff;color:#111;font-weight:800}',
      '.cns-skip:focus{left:12px}',
      '.cns-hero{display:flex;gap:16px;align-items:center;padding:22px;border:1px solid;border-radius:18px;background:linear-gradient(135deg,#1e1b4b,#4c1d95 55%,#0e7490);color:#fff;box-shadow:0 16px 35px rgba(30,27,75,.22)}',
      '.cns-hero-icon{display:grid;place-items:center;width:68px;height:68px;flex:0 0 68px;border:1px solid rgba(255,255,255,.45);border-radius:18px;background:rgba(255,255,255,.14);font-size:38px}',
      '.cns-hero-copy{min-width:0}.cns-kicker{font-size:11px;font-weight:900;letter-spacing:.14em;opacity:.88}.cns-hero h1{margin:2px 0 4px;font-size:clamp(26px,4vw,42px);line-height:1.1}.cns-hero p{margin:0;max-width:780px;font-size:15px;opacity:.92}',
      '.cns-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cns-grade-badge,.cns-neutral-badge{display:inline-flex;align-items:center;min-height:28px;padding:4px 10px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(255,255,255,.14);font-size:11px;font-weight:800}',
      '.cns-grade-note{margin-top:12px;padding:10px 14px;border:1px solid;border-radius:11px;font-size:12px}',
      '.cns-tabs{display:flex;gap:8px;overflow-x:auto;padding:14px 2px 10px;scrollbar-width:thin}.cns-tabs button{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:0 0 auto;padding:8px 13px;border:1px solid;border-radius:10px;font-size:12px;font-weight:850}',
      '.cns-view{padding:clamp(16px,3vw,28px);border:1px solid;border-radius:16px;box-shadow:0 8px 26px rgba(15,23,42,.08)}',
      '.cns-view h2{margin:2px 0 0;font-size:clamp(20px,3vw,28px);line-height:1.2}.cns-view h3{line-height:1.3}.cns-lead{max-width:900px;margin:10px 0 18px;color:var(--cns-muted);font-size:15px}.cns-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.cns-step{font-size:10px;font-weight:950;letter-spacing:.14em;color:var(--cns-step)}.cns-count,.cns-score{font-size:12px;font-weight:850;color:var(--cns-muted)}',
      '.cns-pill{display:inline-flex;align-items:center;width:max-content;padding:3px 8px;border:1px solid;border-radius:999px;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.cns-target-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cns-target{position:relative;padding:14px 14px 14px 48px;border:1px solid;border-radius:12px}.cns-target h3{margin:0 0 3px;font-size:14px}.cns-target p{margin:0;color:var(--cns-muted);font-size:12px}.cns-target-number{position:absolute;left:13px;top:14px;display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#7c3aed;color:#fff;font-size:11px;font-weight:900}',
      '.cns-vocab{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:12px 0;font-size:12px}.cns-vocab>span{padding:3px 8px;border:1px solid;border-radius:999px}.cns-vocab button{padding:5px 9px;border:1px solid;border-radius:999px;font-size:11px;font-weight:800;cursor:pointer}.cns-epistemic{padding:11px 13px;border-left:4px solid;border-radius:8px}.cns-epistemic-label{font-size:9px;font-weight:950;letter-spacing:.13em}.cns-epistemic strong{display:block;margin:1px 0 3px;font-size:13px}.cns-epistemic p{margin:0;font-size:12px;line-height:1.5}.cns-epistemic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.cns-view hr{margin:26px 0;border:0;border-top:1px solid}.cns-scope-note{margin:8px 0 14px;padding:10px 12px;border-left:3px solid #7c3aed;color:var(--cns-muted);font-size:12px}.cns-theory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.cns-theory-card{display:flex;align-items:flex-start;gap:6px;flex-direction:column;padding:14px;border:1px solid;border-radius:12px;text-align:left;transition:transform .15s ease,box-shadow .15s ease}.cns-theory-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.12)}.cns-theory-icon{font-size:24px}.cns-theory-name{font-size:13px;font-weight:900}.cns-theory-summary{font-size:11px;line-height:1.45;color:var(--cns-muted)}',
      '.cns-detail{margin-top:14px;padding:18px;border:2px solid;border-radius:14px}.cns-detail-title{display:flex;align-items:center;gap:12px}.cns-detail-title>span{font-size:32px}.cns-detail-title h3{margin:2px 0;font-size:20px}.cns-detail-summary{font-size:15px;font-weight:650}.cns-misconception{margin:12px 0 0;padding:8px 10px;border-radius:8px;background:rgba(217,119,6,.1);font-size:12px}',
      '.cns-journey{display:grid;grid-template-columns:repeat(6,minmax(125px,1fr));gap:8px;margin:0;padding:0;list-style:none}.cns-journey li{position:relative;padding:12px;border:1px solid;border-radius:10px}.cns-journey li:not(:last-child):after{content:"\u2192";position:absolute;right:-9px;top:50%;z-index:2;font-weight:900}.cns-journey strong,.cns-journey span{display:block}.cns-journey strong{font-size:11px}.cns-journey-plain{margin-top:3px;color:var(--cns-muted);font-size:10px}.cns-focus-tag{margin-top:8px;padding:3px 6px;border-radius:5px;font-size:10px;font-weight:850}.cns-journey-note{margin:12px 0 0;padding:10px 12px;border:1px solid;border-left-width:4px;border-radius:9px;font-size:12px}',
      '.cns-compare-pickers{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:12px;align-items:end;margin:12px 0}.cns-compare-pickers label span{display:block;margin-bottom:4px;font-size:11px;font-weight:850}.cns-compare-pickers select{width:100%;padding:8px;border:1px solid var(--cns-border);border-radius:9px;background:var(--cns-panel);color:var(--cns-text)}.cns-vs{padding-bottom:12px;font-size:11px;font-weight:950}.cns-alert{padding:8px 10px;border:1px solid currentColor;border-radius:8px;background:var(--cns-alert-bg);color:var(--cns-alert-text);font-size:12px}.cns-table-wrap{overflow-x:auto}.cns-compare-table{width:100%;border-collapse:collapse;font-size:12px}.cns-compare-table caption{padding:8px;text-align:left;font-weight:850}.cns-compare-table th,.cns-compare-table td{min-width:170px;padding:10px;border:1px solid var(--cns-border);vertical-align:top;text-align:left}.cns-compare-table thead th{background:#312e81;color:#fff}.cns-compare-table tbody th{min-width:130px;background:rgba(124,58,237,.09)}.cns-compare-challenge{margin-top:14px;padding:14px;border:1px solid;border-radius:11px}.cns-compare-challenge h3{margin:0}.cns-compare-challenge p{font-size:12px;color:var(--cns-muted)}',
      '.consciousness-lab textarea{width:100%;padding:10px;border:1px solid var(--cns-border);border-radius:9px;background:var(--cns-panel);color:var(--cns-text);resize:vertical}.cns-legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.cns-legend>div{padding:10px;border:1px dashed var(--cns-border);border-radius:9px}.cns-legend strong,.cns-legend span{display:block}.cns-legend strong{font-size:11px}.cns-legend span{font-size:10px;color:var(--cns-muted)}.cns-evidence-list{display:grid;gap:10px}.cns-sort-card{position:relative;padding:14px 14px 14px 48px;border:1px solid;border-radius:11px}.cns-sort-card p{margin:0 0 10px;font-weight:650}.cns-sort-number{position:absolute;left:14px;top:14px;display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:#312e81;color:#fff;font-size:11px;font-weight:900}.cns-sort-actions{display:flex;gap:7px;flex-wrap:wrap}.cns-sort-actions button{padding:7px 10px;border:1px solid;border-radius:8px;font-size:11px;font-weight:800}.cns-feedback{margin:9px 0 0!important;font-size:11px;font-weight:500!important}.cns-reset{margin-top:14px;padding:8px 12px;border:1px solid;border-radius:8px;font-size:11px;font-weight:800}',
      '.cns-ladder{margin:0 0 18px;padding:16px;border:1px solid;border-radius:13px}.cns-ladder h3{margin:2px 0 0;font-size:19px}.cns-ladder-intro{margin:8px 0 12px;color:var(--cns-muted);font-size:12px}.cns-ladder-key{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 12px;padding:0;list-style:none}.cns-ladder-key li{display:flex;align-items:center;gap:7px;padding:8px;border:1px solid var(--cns-border);border-radius:8px}.cns-ladder-key li>span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#312e81;color:#fff;font-size:10px;font-weight:900}.cns-ladder-key strong{font-size:11px}.cns-ladder-items{display:grid;gap:9px}.cns-ladder-item{padding:12px;border:1px solid;border-radius:9px}.cns-ladder-item>p{margin:0 0 8px;font-size:12px;font-weight:700}.cns-ladder-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.cns-ladder-actions button{padding:7px;border:1px solid;border-radius:7px;font-size:10px;font-weight:850}',
      '.cns-case-tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:12px}.cns-case-tabs button{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;padding:8px 11px;border:1px solid;border-radius:9px;font-size:11px;font-weight:850}.cns-case{padding:18px;border:1px solid;border-radius:13px}.cns-case-heading h3{margin:5px 0;font-size:20px}.cns-case-setup{font-size:14px}.cns-lens-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}.cns-lens-pair>div{padding:12px;border:1px solid;border-radius:9px}.cns-lens-pair p{margin:4px 0 0;color:var(--cns-muted);font-size:12px}.cns-source-inline{font-size:11px}.cns-source-inline a,.cns-sources a{color:var(--cns-link);font-weight:800}.cns-sources a{display:inline-block;padding:3px 0;min-height:24px}.cns-reflection{margin-top:14px}.cns-reflection label span{display:block;margin:3px 0 7px;color:var(--cns-muted);font-size:11px}.cns-objective-anchor{margin-top:9px;padding:9px;border:1px solid;border-radius:8px;font-size:12px}',
      '.cns-case-theories{margin:13px 0;padding:14px;border:1px solid;border-radius:11px}.cns-case-theories h4{margin:2px 0 0;font-size:18px}.cns-case-theories-intro{margin:7px 0 11px;color:var(--cns-muted);font-size:11px}.cns-case-theory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.cns-case-interpretation{padding:11px;border-left:4px solid;border-radius:8px}.cns-case-interpretation h5{margin:5px 0 2px;font-size:13px}.cns-case-interpretation p{margin:4px 0;color:var(--cns-muted);font-size:11px}.cns-guided-debate{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-guided-debate>p{color:var(--cns-muted);font-size:12px}.cns-debate-pickers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0}.cns-debate-pickers label>span{display:block;margin-bottom:4px;font-size:10px;font-weight:850}.cns-debate-pickers select{width:100%;padding:8px;border:1px solid;border-radius:8px}.cns-debate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cns-debate-grid label{display:block}.cns-debate-grid label>strong,.cns-debate-grid label>span{display:block}.cns-debate-grid label>span{min-height:30px;margin:2px 0 5px;color:var(--cns-muted);font-size:10px}.cns-debate-requirement{margin:8px 0 0;font-size:10px!important}.cns-debate-finish{margin-top:12px;padding:8px 13px;border:1px solid;border-radius:8px;font-size:11px;font-weight:900}.cns-debate-finish:disabled{cursor:not-allowed;opacity:.7}.cns-debate-complete{margin:8px 0 0;font-size:11px;font-weight:750}',
      '.cns-sim-substrates{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}.cns-sim-substrates button{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border:1px solid;border-radius:10px;font-size:12px;font-weight:850}.cns-sim-substrates button>span:first-child{font-size:19px}.cns-sim-blurb{margin:0 0 14px;color:var(--cns-muted);font-size:12px}',
      '.cns-case-bench{margin:12px 0 0;padding:13px;border:1px solid;border-left-width:4px;border-radius:10px}.cns-case-bench h4{margin:0 0 5px;font-size:14px}.cns-case-bench p{margin:0 0 9px;font-size:12px;line-height:1.5}.cns-case-bench-go{padding:9px 14px;border:1px solid;border-radius:9px;font-size:12px;font-weight:850}.cns-case-bench-guard{margin:9px 0 0!important;font-size:11px!important}',
      '.cns-net{margin:14px 0 0;padding:13px;border:1px solid;border-radius:11px}.cns-net h4{margin:2px 0 0;font-size:16px}.cns-net-stage{position:relative;width:100%;height:300px;margin:10px 0;border:1px solid var(--cns-border);border-radius:10px;overflow:hidden;background:var(--cns-panel)}.cns-net-controls label{display:block;margin-bottom:4px;font-size:11px;font-weight:850}.cns-net-controls input[type=range]{width:100%;min-height:32px;accent-color:var(--cns-step)}.cns-net-readout{margin:6px 0 0;color:var(--cns-muted);font-size:11px;line-height:1.5}.cns-net-key{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 0;padding:0;list-style:none}.cns-net-key li{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700}.cns-net-swatch{display:inline-block;width:11px;height:11px;border-radius:50%;border:1px solid var(--cns-border)}',
      '.cns-sim-presets{margin:0 0 16px;padding:13px;border:1px solid;border-radius:11px}.cns-sim-presets h3{margin:0 0 5px;font-size:15px}.cns-sim-preset-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.cns-sim-preset-row button{padding:7px 12px;border:1px solid;border-radius:999px;font-size:11px;font-weight:850}.cns-sim-preset-detail{margin-top:10px;padding:10px 12px;border:1px solid;border-left-width:4px;border-radius:9px}.cns-sim-preset-detail p{margin:0 0 5px;font-size:12px;line-height:1.5}.cns-sim-preset-detail p:last-child{margin-bottom:0}',
      '.cns-sim-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:14px}.cns-sim-control label{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:5px;font-size:12px}.cns-sim-value{font-variant-numeric:tabular-nums;font-weight:850;color:var(--cns-muted)}.cns-sim-control input[type=range]{width:100%;min-height:32px;accent-color:var(--cns-step)}.cns-sim-hint{display:block;margin-top:4px;color:var(--cns-muted);font-size:11px;line-height:1.45}',
      '.cns-sim-toggles{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px}.cns-sim-toggle button{width:100%;padding:9px 12px;border:1px solid;border-radius:9px;text-align:left;font-size:12px;font-weight:850}',
      '.cns-sim-readout{padding:15px;border:1px solid;border-radius:12px}.cns-sim-readout h3{margin:0 0 8px;font-size:17px}.cns-sim-status{margin:0 0 12px;font-size:13px;font-weight:700}.cns-sim-table{width:100%;border-collapse:collapse;font-size:12px}.cns-sim-table caption{padding:0 0 8px;text-align:left;font-size:11px;font-weight:850;color:var(--cns-muted)}.cns-sim-table th,.cns-sim-table td{padding:8px;border-bottom:1px solid var(--cns-border);vertical-align:middle;text-align:left}.cns-sim-table tbody th{font-size:12px;font-weight:800}.cns-sim-table td:nth-child(2){width:64px;font-variant-numeric:tabular-nums;font-weight:850}.cns-sim-table td:nth-child(3){width:45%}.cns-sim-stage-note{display:block;margin-top:2px;color:var(--cns-muted);font-size:10px;font-weight:500}.cns-sim-bar{display:block;width:100%;height:11px;border:1px solid var(--cns-border);border-radius:999px;overflow:hidden}.cns-sim-bar>span{display:block;height:100%}.cns-sim-confound{margin:12px 0 0;font-size:12px;line-height:1.5}',
      '.cns-sim-compare{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-sim-compare h3{margin:0 0 6px;font-size:17px}.cns-sim-phenomenal-row th,.cns-sim-phenomenal-row td{font-weight:900}.cns-sim-verdict{margin:12px 0 0;padding:11px 13px;border:1px solid;border-left-width:5px;border-radius:9px;font-size:12px;line-height:1.55}',
      '.cns-sim-theories{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-sim-theories h3{margin:2px 0 0;font-size:17px}.cns-sim-theory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin-top:12px}.cns-sim-theory{padding:12px;border:1px solid;border-left-width:4px;border-radius:9px}.cns-sim-theory-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.cns-sim-theory-head>span:first-child{font-size:18px}.cns-sim-theory h4{margin:0;font-size:13px}.cns-sim-verdict-tag{flex:0 0 100%;width:max-content;margin-top:2px;padding:2px 7px;border:1px solid;border-radius:999px;font-size:9px;font-weight:950;letter-spacing:.05em;text-transform:uppercase}.cns-sim-theory p{margin:7px 0 0;color:var(--cns-muted);font-size:11px;line-height:1.5}',
      '.cns-sim-limits{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-sim-limits h3{margin:0}.cns-sim-limits li{margin:6px 0;font-size:12px;line-height:1.5}',
      '.cns-quiz{display:grid;gap:12px;margin:0;padding:0;list-style:none}.cns-quiz>li{padding:14px;border:1px solid;border-radius:11px}.cns-quiz fieldset{margin:0;padding:0;border:0}.cns-quiz legend{margin-bottom:9px;font-size:13px;font-weight:850}.cns-answer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.cns-answer-grid button{padding:8px 10px;border:1px solid;border-radius:8px;text-align:left;font-size:11px}.cns-complete{margin-top:14px;padding:13px;border:2px solid;border-radius:10px}.cns-complete p{margin:3px 0 0;color:var(--cns-muted);font-size:12px}',
      '.cns-boundaries{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cns-limit-list{margin:18px 0;padding:14px;border:1px solid var(--cns-border);border-radius:11px}.cns-limit-list h3{margin:0}.cns-limit-list li{margin:5px 0;font-size:12px}.cns-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0;padding:0;list-style:none}.cns-sources li{padding:12px;border:1px solid;border-radius:9px}.cns-sources p{margin:5px 0 0;color:var(--cns-muted);font-size:10px}.cns-frontier-note{margin-top:14px;padding:13px;border:1px solid;border-radius:10px}.cns-frontier-note h3{margin:0}.cns-frontier-note p{margin:5px 0 0;color:var(--cns-muted);font-size:12px}.cns-footer-note{margin:14px 0 0;text-align:center;color:var(--cns-muted);font-size:10px}',
      '@media(max-width:900px){.cns-journey{grid-template-columns:repeat(3,minmax(130px,1fr))}.cns-journey li:after{display:none}.cns-epistemic-grid{grid-template-columns:1fr}.cns-target-grid{grid-template-columns:1fr}.cns-sources{grid-template-columns:1fr}}',
      '@media(max-width:620px){.consciousness-lab{padding:10px}.cns-hero{align-items:flex-start;padding:16px}.cns-hero-icon{width:48px;height:48px;flex-basis:48px;font-size:27px}.cns-view{padding:14px}.cns-compare-pickers,.cns-debate-pickers,.cns-debate-grid{grid-template-columns:1fr}.cns-vs{display:none}.cns-legend,.cns-lens-pair,.cns-answer-grid,.cns-boundaries,.cns-ladder-key,.cns-ladder-actions,.cns-sim-controls,.cns-sim-toggles,.cns-sim-theory-grid{grid-template-columns:1fr}.cns-sim-substrates button{width:100%}.cns-journey{grid-template-columns:1fr}.cns-case-audit-grid,.cns-portfolio-fields,.cns-experiment-flow,.cns-experiment-controls,.cns-next-step{grid-template-columns:1fr}.cns-next-actions{justify-items:start}.cns-sort-card{padding-left:42px}.cns-tabs button{padding:7px 10px}}',
      '@media(prefers-reduced-motion:reduce){.cns-theory-card{transition:none}.cns-theory-card:hover{transform:none}}',
      '@media(forced-colors:active){.consciousness-lab *{forced-color-adjust:auto}.cns-hero{background:Canvas}.cns-target-number,.cns-sort-number,.cns-compare-table thead th{background:Highlight;color:HighlightText}}',
      // ── Layout for the grafted Theory Map / Prediction Simulator / Portfolio views ──
      // Rule-level extracts: these sat in strings that also restyle existing selectors.
      '.cns-glossary-detail{margin:-2px 0 13px;padding:12px 14px;border:1px solid;border-left-width:4px;border-radius:9px}',
      '.cns-glossary-detail h3{margin:2px 0 4px;font-size:16px;text-transform:none}',
      '.cns-glossary-detail p{margin:0;color:var(--cns-muted);font-size:12px;line-height:1.5}',
      '.cns-glossary-detail .cns-glossary-example{margin-top:5px}',
      '.cns-feedback-explanation{font-weight:600}',
      '.cns-audit-theory{display:block;margin:9px 0}',
      '.cns-audit-theory>span{display:block;margin-bottom:4px;font-size:10px;font-weight:850}',
      '.cns-audit-theory select{width:100%;padding:8px;border:1px solid;border-radius:8px}',
      '.cns-case-audit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}',
      '.cns-case-audit-grid label>strong,.cns-case-audit-grid label>span{display:block}',
      '.cns-case-audit-grid label>span{min-height:30px;margin:2px 0 5px;color:var(--cns-muted);font-size:10px}',
      '.cns-audit-summary{margin-top:10px;padding:10px;border:1px solid;border-radius:8px}',
      '.cns-audit-summary p{margin:5px 0;color:var(--cns-muted);font-size:11px}',
      '.cns-misconception-summary{margin-top:12px;padding:13px;border:1px solid;border-radius:10px}',
      '.cns-misconception-summary h3{margin:0;font-size:15px}',
      '.cns-misconception-summary>p{margin:4px 0 8px;color:var(--cns-muted);font-size:11px}',
      '.cns-misconception-summary ul{display:grid;gap:6px;margin:0;padding:0;list-style:none}',
      '.cns-misconception-summary li{display:flex;justify-content:space-between;gap:10px;padding:7px 9px;border:1px solid var(--cns-border);border-radius:7px;font-size:10px}',
      '.cns-misconception-summary li span{color:var(--cns-muted)}',
      '.cns-progress{margin-top:10px;padding:11px 13px;border:1px solid;border-radius:11px}.cns-progress-heading{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:11px}.cns-progress-heading span{color:var(--cns-muted);font-weight:800}.cns-progress ol{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:7px;margin:9px 0 0;padding:0;list-style:none}.cns-progress li{min-height:34px;border:1px solid var(--cns-border);border-radius:8px;color:var(--cns-muted);font-size:10px;font-weight:800;overflow:hidden}.cns-progress li.is-complete{border-color:#10b981;background:rgba(16,185,129,.1);color:var(--cns-text)}.cns-progress li.is-next{border-color:var(--cns-step);box-shadow:inset 0 0 0 1px var(--cns-step);color:var(--cns-text)}.cns-progress li button{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;min-height:34px;padding:6px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.cns-progress li button:hover{background:rgba(124,58,237,.08)}.cns-progress li button>span:first-child{font-size:13px}.cns-next-step{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;margin:10px 0 0;padding:14px 15px;border:1px solid;border-left:4px solid #7c3aed;border-radius:11px}.cns-next-kicker{color:var(--cns-step);font-size:9px;font-weight:950;letter-spacing:.14em}.cns-next-step h2{margin:2px 0 4px;font-size:17px;line-height:1.25}.cns-next-step p{max-width:760px;margin:0;color:var(--cns-muted);font-size:11px;line-height:1.5}.cns-next-detail{display:inline-block;margin-top:6px;color:var(--cns-muted);font-size:10px;font-weight:850}.cns-next-why{margin-top:7px}.cns-next-why summary{width:max-content;color:var(--cns-step);font-size:10px;font-weight:900;cursor:pointer}.cns-next-why p{margin-top:5px;padding-left:10px;border-left:2px solid #a78bfa}.cns-next-actions{display:grid;justify-items:end;gap:6px}.cns-next-time{color:var(--cns-muted);font-size:10px;font-weight:800}.cns-next-action{min-width:132px;padding:8px 12px;border:1px solid;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer}',
      '.cns-map-toolbar{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin:14px 0}.cns-map-toolbar fieldset{margin:0;padding:9px;border:1px solid var(--cns-border);border-radius:9px}.cns-map-toolbar legend{padding:0 5px;font-size:10px;font-weight:900}.cns-map-axis-buttons{display:flex;gap:6px;flex-wrap:wrap}.cns-map-axis-buttons button{padding:7px 9px;border:1px solid;border-radius:7px;font-size:10px;font-weight:850}.cns-map-axis-title{display:flex;justify-content:space-between;gap:10px;margin:9px 0 7px}.cns-map-axis-title strong{font-size:14px}.cns-map-axis-title span{color:var(--cns-muted);font-size:10px}.cns-landscape{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px}.cns-map-lane{padding:12px;border:1px solid;border-top-width:4px;border-radius:10px}.cns-map-lane-heading{display:flex;justify-content:space-between;gap:8px}.cns-map-lane-heading h3{margin:0;font-size:14px}.cns-map-lane-heading span{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#312e81;color:#fff;font-size:10px;font-weight:900}.cns-map-lane>p{min-height:34px;margin:4px 0 9px;color:var(--cns-muted);font-size:10px}.cns-map-theories{display:grid;gap:7px}.cns-map-theories button{display:block;width:100%;padding:9px;border:1px solid;border-radius:8px;text-align:left}.cns-map-theory-name,.cns-map-reason{display:block}.cns-map-theory-name{font-size:11px;font-weight:900}.cns-map-reason{margin-top:3px;font-size:9px;line-height:1.4;opacity:.9}.cns-map-detail{margin-top:13px;padding:14px;border:1px solid;border-left-width:4px;border-radius:10px}.cns-map-detail h3{margin:4px 0;font-size:17px}.cns-map-detail p{margin:5px 0;color:var(--cns-muted);font-size:11px}.cns-map-detail-limit{padding-top:6px;border-top:1px dashed var(--cns-border)}.cns-map-reflection{margin-top:13px;padding:14px;border:1px solid;border-radius:10px}.cns-map-reflection h3{margin:2px 0}.cns-map-reflection>p{color:var(--cns-muted);font-size:11px}',
      '.cns-experiment-design{margin:16px 0;padding:15px;border:1px solid;border-radius:13px}.cns-experiment-design h3,.cns-preregister h3,.cns-forecast-section h3{margin:2px 0 0}.cns-experiment-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0;padding:0;list-style:none}.cns-experiment-flow li{padding:10px;border:1px solid var(--cns-border);border-radius:9px;background:var(--cns-panel)}.cns-experiment-flow strong,.cns-experiment-flow span{display:block}.cns-experiment-flow strong{font-size:11px}.cns-experiment-flow span{margin-top:3px;color:var(--cns-muted);font-size:10px}.cns-experiment-controls{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;align-items:start}.cns-experiment-controls fieldset{margin:0;padding:10px;border:1px solid var(--cns-border);border-radius:9px}.cns-experiment-controls legend{padding:0 5px;font-size:10px;font-weight:900}.cns-delay-control{display:grid;grid-template-columns:1fr auto;gap:3px 8px;padding:10px;border:1px solid var(--cns-border);border-radius:9px}.cns-delay-control>strong,.cns-delay-control>span{font-size:11px}.cns-delay-control>span{font-weight:900}.cns-delay-control input,.cns-delay-control small{grid-column:1/-1}.cns-delay-control input{width:100%;accent-color:#7c3aed}.cns-delay-control small{color:var(--cns-muted);font-size:9px}.cns-toggle-group{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.cns-toggle-group button{padding:7px;border:1px solid;border-radius:7px;font-size:10px;font-weight:850}.cns-preregister{margin:16px 0;padding:15px;border:1px solid;border-radius:13px}.cns-preregister label{display:block;margin-top:10px}.cns-preregister label>span{display:block;margin-bottom:5px;color:var(--cns-muted);font-size:11px}.cns-preregister select{width:100%;padding:8px;border:1px solid;border-radius:8px}.cns-reveal{margin-top:11px;padding:8px 13px;border:1px solid;border-radius:8px;font-size:11px;font-weight:900}.cns-reveal:disabled{cursor:not-allowed;opacity:.7}.cns-forecast-warning{padding:8px 10px;border:1px solid #d97706;border-radius:8px;background:rgba(217,119,6,.1);font-size:10px;font-weight:950;letter-spacing:.08em}.cns-forecast-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:10px}.cns-forecast-card{padding:13px;border:1px solid;border-top-width:4px;border-radius:10px}.cns-forecast-card h4{margin:6px 0 4px;font-size:14px}.cns-forecast-card p{margin:6px 0;color:var(--cns-muted);font-size:11px}.cns-forecast-limit{padding-top:7px;border-top:1px dashed var(--cns-border)}',
      '.cns-debate-selfcheck{display:grid;gap:7px;margin:11px 0 0;padding:11px;border:1px solid var(--cns-border);border-radius:9px}.cns-debate-selfcheck legend{padding:0 6px;font-size:11px;font-weight:900}.cns-debate-selfcheck label{display:flex;align-items:flex-start;gap:8px;color:var(--cns-muted);font-size:11px}.cns-debate-selfcheck input{width:18px;height:18px;flex:0 0 18px;margin:0;accent-color:#7c3aed}',
      '.cns-case-audit{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-case-audit h3{margin:2px 0 0;font-size:17px}.cns-case-audit>p{color:var(--cns-muted);font-size:12px}.cns-audit-summary p{color:var(--cns-text)!important}',
      '.cns-theory-group{margin-top:12px}.cns-theory-group:first-of-type{margin-top:0}.cns-theory-group-title{margin:0 0 7px;font-size:12px;font-weight:900;letter-spacing:.04em;color:var(--cns-muted)}.cns-analysis-move{margin:11px 0 0;padding:10px 12px;border-left:4px solid;border-radius:8px;background:var(--cns-panel);font-size:12px;line-height:1.5}.cns-compare-relation{margin:10px 0 12px;padding:11px 13px;border:1px solid;border-left-width:4px;border-radius:9px}.cns-compare-relation strong{font-size:12px}.cns-compare-relation p{margin:4px 0 0;color:var(--cns-muted);font-size:12px;line-height:1.5}',
      '.cns-theory-formal{display:block;margin-top:2px;font-size:10px;font-weight:600;color:var(--cns-muted)}.cns-ladder-key li>div{display:flex;flex-direction:column}.cns-ladder-gloss{font-size:10px;font-style:normal;color:var(--cns-muted)}.cns-note-example{margin:8px 0 10px;padding:8px 12px;border:1px dashed var(--cns-border);border-radius:9px}.cns-note-example summary{cursor:pointer;font-size:11px;font-weight:900;color:var(--cns-step)}.cns-note-example p{margin:6px 0 0;font-size:11px;color:var(--cns-muted)}.cns-note-example-guard{font-style:italic}.cns-experiment-reflect{display:block;margin:12px 0 0}.cns-experiment-reflect>strong,.cns-experiment-reflect>span{display:block}.cns-experiment-reflect>span{margin:3px 0 6px;color:var(--cns-muted);font-size:11px}.cns-next-here{color:var(--cns-muted);font-size:11px;font-weight:800}.cns-facilitator{margin:18px 0;padding:14px;border:1px solid var(--cns-border);border-radius:11px}.cns-facilitator h3{margin:0}.cns-facilitator>p{margin:6px 0 10px;color:var(--cns-muted);font-size:12px}.cns-facilitator-steps{display:grid;gap:7px;margin:0;padding-left:20px}.cns-facilitator-steps li{font-size:12px}.cns-facilitator-steps strong,.cns-facilitator-steps span{display:block}.cns-facilitator-steps span{color:var(--cns-muted);font-size:11px}.cns-portfolio-share{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-portfolio-share h3{margin:2px 0}.cns-portfolio-share .cns-reset{margin-top:0}.cns-summary-text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5}',
      '.cns-portfolio-overview{margin-top:16px}.cns-portfolio-overview>h3{margin:0 0 8px}.cns-portfolio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:9px}.cns-portfolio-grid article{padding:11px;border:1px solid;border-radius:9px}.cns-portfolio-grid article>div{display:flex;align-items:center;gap:7px}.cns-portfolio-grid article>div>span{font-size:14px}.cns-portfolio-grid article strong{font-size:11px}.cns-portfolio-grid article p{margin:5px 0 0;color:var(--cns-muted);font-size:10px;line-height:1.45}.cns-portfolio-grid article.is-ready{border-left-width:4px}.cns-portfolio-synthesis{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-portfolio-synthesis h3{margin:2px 0}.cns-portfolio-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:11px}.cns-portfolio-fields label>strong,.cns-portfolio-fields label>span{display:block}.cns-portfolio-fields label>span{min-height:47px;margin:3px 0 5px;color:var(--cns-muted);font-size:10px}.cns-portfolio-complete{margin-top:11px;padding:10px;border:1px solid;border-radius:8px}.cns-portfolio-complete p{margin:4px 0 0;color:var(--cns-muted);font-size:11px}',
    ].join('\n');
    document.head.appendChild(style);
  }
})();
