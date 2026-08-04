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
      id: 'gnw', group: 'science', icon: '\uD83C\uDF10', short: 'GNWT', name: 'Global Neuronal Workspace Theory', focus: ['global'],
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
      id: 'rpt', group: 'science', icon: '\u21A9\uFE0F', short: 'RPT', name: 'Recurrent Processing Theory', focus: ['recurrence'],
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
      id: 'iit', group: 'science', icon: '\u2295', short: 'IIT', name: 'Integrated Information Theory', focus: ['integration'],
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
      id: 'hot', group: 'science', icon: '\uD83E\uDE9E', short: 'HOT', name: 'Higher-Order Theories', focus: ['metacognition'],
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
      id: 'ast', group: 'science', icon: '\uD83D\uDCCD', short: 'AST', name: 'Attention Schema Theory', focus: ['selfmodel'],
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
      id: 'functionalism', group: 'philosophy', icon: '\u2699\uFE0F', short: 'Functionalism', name: 'Functionalism', focus: ['global', 'metacognition'],
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
      id: 'physicalism', group: 'philosophy', icon: '\u269B\uFE0F', short: 'Physicalism', name: 'Physicalism', focus: ['biology'],
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
      id: 'dualism', group: 'philosophy', icon: '\u25D1', short: 'Dualism', name: 'Dualist Views', focus: ['phenomenal'],
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
      id: 'panpsychism', group: 'philosophy', icon: '\u2726', short: 'Panpsychism', name: 'Panpsychist Views', focus: ['integration'],
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
      id: 'illusionism', group: 'philosophy', icon: '\uD83C\uDFA9', short: 'Illusionism', name: 'Illusionist / Deflationary Views', focus: ['selfmodel'],
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
      id: 'biological', group: 'philosophy', icon: '\uD83E\uDDEC', short: 'Biological naturalism', name: 'Biological Naturalism', focus: ['biology'],
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
      id: 'neutral', group: 'philosophy', icon: '\u25C7', short: 'Neutral monism', name: 'Neutral Monist Views', focus: ['phenomenal'],
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

  var SIGNAL_STAGES = [
    { id: 'input', label: '1. Feedforward signal', plain: 'A signal first moves through sensory pathways.' },
    { id: 'recurrence', label: '2. Local return loops', plain: 'Later processing feeds back to earlier sensory areas.' },
    { id: 'global', label: '3. Global availability', plain: 'Information becomes usable by memory, report, planning, and control.' },
    { id: 'metacognition', label: '4. Higher-order representation', plain: 'The system represents itself as being in a mental state.' },
    { id: 'integration', label: '5. Intrinsic integration', plain: 'The system is analyzed as an irreducible cause-effect whole.' },
    { id: 'selfmodel', label: '6. Attention model', plain: 'A simplified model tracks and controls attention.' }
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
        ? 'Activity in ' + space + ' crossed this model’s ignition threshold at step ' + m.ignitionTick + ' and reached ' + Math.round(m.breadth * 3) + ' of 3 downstream stages.'
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
      { id: 'reflect_ai', label: 'Reflect on AI and emotion', icon: '\uD83E\uDD16', check: function (d) { return String(d.aiReflection || '').trim().length >= 30; }, progress: function (d) { return Math.min(30, String(d.aiReflection || '').trim().length) + '/30 chars'; } }
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
      simCrosscheckDone: simCrosscheckDone,
      normalizeSimConfig: normalizeSimConfig,
      runWorkspaceSim: runWorkspaceSim,
      simTheoryReadoutFor: function (theoryId, config) { return simTheoryReadout(THEORIES[theoryId], runWorkspaceSim(config)); },
      simSubstrateIds: Object.keys(SIM_SUBSTRATES),
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
      journeyNoteFor: function (theoryId) { return journeyNoteForTheory(THEORIES[theoryId]); }
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
    var activeView = ['learn', 'compare', 'evidence', 'cases', 'bench', 'check', 'sources'].indexOf(d.activeView) !== -1 ? d.activeView : 'learn';
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
      patchState({ activeView: view }, view + ' view selected');
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
      link: '#67e8f9', step: '#facc15', alertBg: '#111111', alertText: '#fca5a5'
    } : dark ? {
      bg: '#0b1020', panel: '#111827', raised: '#172033', text: '#f8fafc', muted: '#cbd5e1', border: '#475569', accent: '#c4b5fd', accentText: '#1e1b4b', science: '#67e8f9', philosophy: '#f9a8d4', good: '#86efac', bad: '#fca5a5', focus: '#fbbf24',
      link: '#93c5fd', step: '#c4b5fd', alertBg: '#172033', alertText: '#fca5a5'
    } : {
      bg: '#f8fafc', panel: '#ffffff', raised: '#f5f3ff', text: '#172033', muted: '#475569', border: '#cbd5e1', accent: '#6d28d9', accentText: '#ffffff', science: '#0369a1', philosophy: '#9d174d', good: '#047857', bad: '#b91c1c', focus: '#7c3aed',
      link: '#1d4ed8', step: '#6d28d9', alertBg: '#fef2f2', alertText: '#991b1b'
    };

    injectConsciousnessStyles();

    var VIEWS = [
      ['learn', '\uD83E\uDDE0', 'Explore'],
      ['compare', '\u2696\uFE0F', 'Compare'],
      ['evidence', '\uD83E\uDDEA', 'Evidence Lab'],
      ['cases', '\uD83D\uDCA1', 'Cases'],
      ['bench', '\uD83D\uDD2C', 'Workspace Bench'],
      ['check', '\u2705', 'Knowledge Check'],
      ['sources', '\uD83D\uDCDA', 'Sources & Limits']
    ];

    function pill(label, kind) {
      var color = kind === 'science' ? C.science : kind === 'philosophy' ? C.philosophy : C.accent;
      return h('span', { className: 'cns-pill', style: { color: color, borderColor: color } }, label);
    }

    function epistemicBox(kind, title, body) {
      var meta = {
        evidence: ['EVIDENCE', C.science],
        claim: ['THEORY CLAIM', C.accent],
        question: ['OPEN QUESTION', '#d97706'],
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
            }, h('span', { 'aria-hidden': 'true' }, item[1]), item[2]);
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

    function renderLearn() {
      var selected = THEORIES[selectedId];
      var copy = mergeLevelCopy(selected, profile.id);
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
            profile.vocabulary.map(function (word) { return h('span', { key: word, style: { borderColor: C.border, background: C.raised } }, word); })
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
          h('div', { className: 'cns-theory-grid' }, theories.map(function (theory) {
            var isSelected = theory.id === selectedId;
            var theoryCopy = mergeLevelCopy(theory, profile.id);
            return h('button', {
              key: theory.id, type: 'button', className: 'cns-theory-card',
              'aria-pressed': isSelected ? 'true' : 'false',
              onClick: function () { patchState({ selectedTheory: theory.id }, theory.name + ' selected'); },
              style: { background: isSelected ? C.raised : C.panel, borderColor: isSelected ? C.accent : C.border, color: C.text }
            },
              h('span', { className: 'cns-theory-icon', 'aria-hidden': 'true' }, theory.icon),
              h('span', { className: 'cns-theory-name' }, theory.name),
              pill(theory.group === 'science' ? 'Scientific model' : 'Philosophical view', theory.group),
              h('span', { className: 'cns-theory-summary' }, theoryCopy.summary)
            );
          })),
          // No aria-live here: announceToSR already names the selection, and marking this whole
          // article live made screen readers re-read the entire detail block on every click.
          h('article', { className: 'cns-detail', style: { background: C.raised, borderColor: C.accent } },
            h('div', { className: 'cns-detail-title' }, h('span', { 'aria-hidden': 'true' }, selected.icon), h('div', null, pill(selected.group === 'science' ? 'SCIENTIFIC MODEL' : 'PHILOSOPHICAL VIEW', selected.group), h('h3', null, selected.name))),
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
            h('strong', null, stage.label), h('span', { className: 'cns-journey-plain' }, stage.plain),
            match && h('span', { className: 'cns-focus-tag', style: { background: C.accent, color: C.accentText } }, selected.short + ' emphasizes this')
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
            theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theory.name); })
          )),
          h('span', { className: 'cns-vs', 'aria-hidden': 'true' }, 'VS'),
          h('label', null, h('span', null, 'Second lens'), h('select', { value: compareB, onChange: function (e) { var value = e.target.value; patchState(function (current) { return { compareB: value, compareA: current.compareA || compareA, compareCount: (current.compareCount || 0) + 1 }; }, 'Second comparison lens changed'); } },
            theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theory.name); })
          ))
        ),
        compareA === compareB && h('p', { className: 'cns-alert', role: 'alert' }, 'Choose two different lenses for a useful comparison.'),
        h('div', { className: 'cns-table-wrap' },
          h('table', { className: 'cns-compare-table' },
            h('caption', null, a.name + ' compared with ' + b.name + ' for ' + profile.shortLabel),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Question'), h('th', { scope: 'col' }, a.name), h('th', { scope: 'col' }, b.name))),
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
          h('textarea', { value: d.compareReflection || '', onChange: function (e) { patchState({ compareReflection: e.target.value }); }, rows: 4, 'aria-label': 'Theory comparison reflection', placeholder: 'Write your comparison here...' })
        )
      ));
    }

    function getEvidenceItems() {
      var simple = profile.id === 'early';
      var elementary = profile.id === 'elementary';
      var base = [
        { id: 'mask-result', kind: 'evidence', text: simple ? 'A picture people said they saw had a different brain signal than a picture they said they missed.' : elementary ? 'In a masking study, reported-seen pictures produced later and wider activity than reported-unseen pictures.' : 'A masking contrast found later, widespread activity for reported-seen stimuli relative to reported-unseen stimuli.', why: simple ? 'Researchers measured this result. It is a clue, even though answering the question may add extra brain activity.' : 'This is an empirical result. Report, decision, memory, and task demands remain alternative contributors.' },
        { id: 'broadcast-proof', kind: 'claim', text: simple ? 'The wide signal is the feeling itself.' : elementary ? 'The later wide signal proves the global workspace theory.' : 'Late frontoparietal activation is identical to phenomenal consciousness.', why: simple ? 'That is an explanation of a clue, not something the measurement showed by itself.' : 'This goes beyond the result. The activity might be prerequisite, mechanism, consequence, or report-related.' },
        { id: 'other-minds', kind: 'question', text: simple ? 'What does a bat\'s experience feel like?' : elementary ? 'Can a system use information flexibly without feeling anything?' : 'Does access consciousness entail phenomenal consciousness?', why: 'No agreed experiment currently settles this question.' },
        { id: 'pci-result', kind: 'evidence', text: simple ? 'Complex brain responses are often bigger when people are awake than in deep anesthesia.' : elementary ? 'A complexity measure often separates wakefulness from deep anesthesia.' : 'Perturbational Complexity Index often tracks conscious capacity across wakefulness, anesthesia, sleep, and disorders of consciousness.', why: simple ? 'This is a measured pattern. It is not a direct feeling meter.' : 'This is evidence about conscious capacity. PCI is not a direct calculation of IIT\'s Phi and does not uniquely validate IIT.' }
      ];
      if (levelAtLeast(profile.id, 'middle')) {
        base.push(
          { id: 'rpt-sufficient', kind: 'claim', text: 'Local recurrent sensory processing is sufficient for phenomenal visual consciousness.', why: 'This is RPT\'s theoretical sufficiency claim. Recurrence-related data are relevant, but the claim itself is not a raw observation.' },
          { id: 'no-report', kind: 'question', text: 'Which neural signals remain specific to experience after every report, memory, attention, and decision confound is removed?', why: 'No-report designs reduce some confounds but still infer experience indirectly; complete separation remains an open research problem.' }
        );
      }
      if (levelAtLeast(profile.id, 'high')) {
        base.push(
          { id: 'cogitate', kind: 'evidence', text: 'A 2025 preregistered adversarial study supported some predictions and challenged key predictions of both GNWT and IIT.', why: 'This is an empirical comparison, not a declaration that either theory is wholly true or false. Bridge assumptions and revised implementations still matter.' },
          { id: 'jspace-interpretation', kind: 'claim', text: 'Claude\'s J-space proves that the model has phenomenal consciousness.', why: 'Unsupported inference. The 2026 results concern reportability, modulation, silent reasoning, flexible reuse, and broadcasting - functional access-like properties, not felt experience.' }
        );
      }
      if (levelAtLeast(profile.id, 'college')) {
        base.push({ id: 'proxy-validity', kind: 'question', text: 'Which bridge principle licenses inference from a complexity proxy to a theory\'s constitutive quantity?', why: 'Proxy validity and the mapping from operational measure to formal construct require independent support.' });
      }
      return base;
    }

    function getEvidenceLadderItems() {
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
          id: 'brain-dependence', rung: 'Established',
          text: copy.brain[0], why: copy.brain[1]
        },
        {
          id: 'complexity-mechanism', rung: 'Suggestive',
          text: copy.complexity[0], why: copy.complexity[1]
        },
        {
          id: 'frontal-necessity', rung: 'Disputed',
          text: copy.frontal[0], why: copy.frontal[1]
        },
        {
          id: 'current-ai-feeling', rung: 'Unknown',
          text: copy.ai[0], why: copy.ai[1]
        }
      ];
    }

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
        h('p', { className: 'cns-ladder-intro' }, profile.id === 'early' ? 'Put each idea on a rung. “Unknown” means we do not have enough evidence yet.' : 'Place each claim by the current state of evidence. A rung describes confidence in this precise claim, not the worth of an entire theory.'),
        h('ol', { className: 'cns-ladder-key', 'aria-label': 'Evidence ladder from most settled to unresolved' }, EVIDENCE_LADDER_LABELS.map(function (label, index) {
          return h('li', { key: label }, h('span', { 'aria-hidden': 'true' }, index + 1), h('strong', null, label));
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
            picked && h('p', { className: 'cns-feedback', role: 'status', style: { color: isCorrect ? C.good : C.bad } }, h('strong', null, isCorrect ? 'Well calibrated. ' : 'Try another rung. '), item.why, !isCorrect && ' Best rung: ' + item.rung + '.')
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
        renderEvidenceLadder(),
        h('hr', { style: { borderColor: C.border } }),
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
              h('strong', null, isCorrect ? 'Correct. ' : 'Recheck. '), item.why, !isCorrect && h('span', null, ' Best category: ' + keyMap[item.kind] + '.'))
          );
        })),
        h('button', { type: 'button', className: 'cns-reset', onClick: function () { patchState({ evidenceAnswers: {} }, 'Evidence Lab reset'); }, style: { borderColor: C.border, color: C.text, background: C.panel } }, 'Reset classifications')
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
        return foundation + ' In this case, it asks ' + caseItem.theoryQuestion;
      }
      var specific = caseTheoryApplications(caseItem.id)[theory.id];
      var analysisMove = profile.id === 'middle'
        ? ' Comparison move: name one observation this lens explains and one question it leaves open.'
        : profile.id === 'high'
          ? ' Comparison move: identify whether the claim targets access, phenomenal character, or report, then name an alternative explanation.'
          : profile.id === 'college'
            ? ' Operational move: specify the construct, proxy, bridge principle, and a result that would discriminate this view.'
            : ' Research audit: state the auxiliary assumptions, causal identification strategy, and preregistered revision condition.';
      if (specific) return specific + analysisMove;
      return foundation + ' Applied here, the view asks ' + caseItem.theoryQuestion + ' This is the theory’s interpretation, not an extra observation.' + analysisMove;
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
        h('article', { id: 'cns-case-panel', role: 'tabpanel', 'aria-labelledby': 'cns-case-tab-' + selectedCaseId, className: 'cns-case', style: { background: C.raised, borderColor: C.border } },
          h('div', { className: 'cns-case-heading' }, h('div', null, pill(selectedCase.tag, selectedCase.id === 'ai-emotion' ? 'philosophy' : 'science'), h('h3', null, selectedCase.title))),
          h('p', { className: 'cns-case-setup' }, selectedCase.setup),
          epistemicBox('thought', 'Discussion prompt', selectedCase.prompt),
          h('section', { className: 'cns-case-theories', 'aria-labelledby': 'cns-case-theories-title', style: { background: C.panel, borderColor: C.border } },
            h('div', { className: 'cns-section-heading' },
              h('div', null, h('span', { className: 'cns-step' }, 'SAME CASE, DIFFERENT LENSES'), h('h4', { id: 'cns-case-theories-title' }, 'How each theory reads this case')),
              h('span', { className: 'cns-count' }, theories.length + ' interpretations for ' + profile.shortLabel)
            ),
            h('p', { className: 'cns-case-theories-intro' }, profile.id === 'early'
              ? 'Each idea points to different clues. These are explanations of the same story, not extra facts.'
              : 'Every card applies one available theory or philosophical position to the unchanged case evidence. An interpretation is not a verdict that the view is correct.'),
            h('div', { className: 'cns-case-theory-grid' }, theories.map(function (theory) {
              return h('article', { key: theory.id, className: 'cns-case-interpretation', style: { borderColor: theory.group === 'science' ? C.science : C.philosophy, background: C.raised } },
                pill(theory.group === 'science' ? 'Scientific theory' : 'Philosophical position', theory.group),
                h('h5', null, theory.name),
                h('p', null, interpretCaseThroughTheory(selectedCase, theory))
              );
            }))
          ),
          h('div', { className: 'cns-lens-pair' }, selectedCase.lenses.map(function (lens, index) { return h('div', { key: index, style: { background: C.panel, borderColor: C.border } }, h('strong', null, 'Lens ' + (index + 1)), h('p', null, lens)); })),
          epistemicBox('caution', 'Calibration', selectedCase.guard),
          selectedCase.source && h('p', { className: 'cns-source-inline' }, h('a', { href: selectedCase.source, target: '_blank', rel: 'noopener noreferrer' }, 'Read the 2026 primary preprint'), ' (advanced source; opens in a new tab).'),
          selectedCase.id === 'ai-emotion' && h('div', { className: 'cns-reflection' },
            h('label', { htmlFor: 'cns-ai-reflection' }, h('strong', null, 'Your evidence-calibrated response'), h('span', null, profile.id === 'early' ? 'Tell what we can see and what we do not know.' : 'Represent both views fairly. Separate observed functions from claims about felt experience.')),
            h('textarea', { id: 'cns-ai-reflection', rows: 5, value: d.aiReflection || '', onChange: function (e) { patchState({ aiReflection: e.target.value }); }, placeholder: profile.id === 'early' ? 'I can observe... I still do not know...' : 'The observable evidence supports... A functionalist might... A felt-experience view might... The unresolved question is...' }),
            h('div', { className: 'cns-objective-anchor', style: { borderColor: C.good } }, h('strong', { style: { color: C.good } }, 'Anchor conclusion:'), ' The AI exhibited emotion-like behavior or functions; this alone does not settle whether it felt anything.')
          ),
          h('section', { className: 'cns-guided-debate', 'aria-labelledby': 'cns-guided-debate-title', style: { background: C.panel, borderColor: C.border } },
            h('div', { className: 'cns-section-heading' },
              h('div', null, h('span', { className: 'cns-step' }, 'FAIR COMPARISON'), h('h3', { id: 'cns-guided-debate-title' }, 'Guided two-position debate')),
              h('span', { className: 'cns-score', role: 'status', 'aria-live': 'polite' }, debateReady ? '4/4 parts ready' : 'Complete all four parts')
            ),
            h('p', null, debateGuide.lead),
            h('div', { className: 'cns-debate-pickers' },
              h('label', null, h('span', null, 'Position A'), h('select', { value: debateA, onChange: function (e) { updateDebate('theoryA', e.target.value); }, style: { background: C.panel, color: C.text, borderColor: C.border } }, theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theory.name); }))),
              h('label', null, h('span', null, 'Position B'), h('select', { value: debateB, onChange: function (e) { updateDebate('theoryB', e.target.value); }, style: { background: C.panel, color: C.text, borderColor: C.border } }, theories.map(function (theory) { return h('option', { key: theory.id, value: theory.id }, theory.name); })))
            ),
            debateA === debateB && h('p', { className: 'cns-alert', role: 'alert' }, 'Choose two different positions.'),
            h('div', { className: 'cns-debate-grid' },
              h('label', null, h('strong', null, '1. Fair account of ' + debateTheoryA.short), h('span', null, debateGuide.positionA), h('textarea', { required: true, rows: 3, value: debate.positionA || '', onChange: function (e) { updateDebate('positionA', e.target.value); }, placeholder: debateTheoryA.name + ' would argue...' })),
              h('label', null, h('strong', null, '2. Fair account of ' + debateTheoryB.short), h('span', null, debateGuide.positionB), h('textarea', { required: true, rows: 3, value: debate.positionB || '', onChange: function (e) { updateDebate('positionB', e.target.value); }, placeholder: debateTheoryB.name + ' would argue...' })),
              h('label', null, h('strong', null, '3. Evidence and limit'), h('span', null, debateGuide.evidence), h('textarea', { required: true, rows: 3, value: debate.evidence || '', onChange: function (e) { updateDebate('evidence', e.target.value); }, placeholder: 'The evidence shows... Its limit is...' })),
              h('label', null, h('strong', null, '4. Uncertainty and next test'), h('span', null, debateGuide.uncertainty), h('textarea', { required: true, rows: 3, value: debate.uncertainty || '', onChange: function (e) { updateDebate('uncertainty', e.target.value); }, placeholder: 'We still do not know... A useful next test would...' }))
            ),
            h('p', { className: 'cns-debate-requirement' }, 'Each response needs at least ' + debateMinimum + ' characters for this reading path.'),
            h('button', { type: 'button', className: 'cns-debate-finish', disabled: !debateReady, onClick: finishDebate, style: { background: debateReady ? C.accent : C.raised, color: debateReady ? C.accentText : C.muted, borderColor: debateReady ? C.accent : C.border } }, debate.complete && debateReady ? 'Debate complete ✓' : 'Finish guided debate'),
            debate.complete && debateReady && h('p', { className: 'cns-debate-complete', role: 'status', style: { color: C.good } }, 'Structure complete: two distinct positions, evidence, and uncertainty are present. Reread for fairness and keep your conclusion open to revision.')
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

      function updateSim(patch, announcement) {
        patchState(function (current) {
          var nextSim = Object.assign({}, normalizeSimConfig(current.sim), patch);
          var flags = Object.assign({}, current.simFlags || {});
          flags[nextSim.substrate] = true;
          if (!nextSim.reportRequired) flags.noReport = true;
          return { sim: nextSim, simFlags: flags };
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
            h('span', { className: 'cns-count' }, 'Step ' + stepIndex + ' of ' + (stepCount - 1))
          ),
          h('p', { className: 'cns-sim-hint' }, layoutNote),
          h('div', { className: 'cns-net-stage', ref: netRefCallback,
                     role: 'img', 'aria-label': 'Schematic three-dimensional network for ' + substrate.label
                       + ' at step ' + stepIndex + '. The table above the diagram carries the same values as text.' }),
          h('div', { className: 'cns-net-controls' },
            h('label', { htmlFor: 'cns-net-step' }, 'Step through the run'),
            h('input', {
              id: 'cns-net-step', type: 'range', min: 0, max: stepCount - 1, step: 1, value: stepIndex,
              onChange: function (e) {
                var next = parseInt(e.target.value, 10) || 0;
                patchState({ simStep: next }, 'Step ' + next + '. ' + describeTick(run.ticks[next]));
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
                updateSim(Object.assign({}, preset.config), presetLabel + ' loaded. ' + presetNote);
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
          slider('strength', copyFor('plainStrengthLabel', 'strengthLabel'), null),
          slider('interference', copyFor('plainInterferenceLabel', 'interferenceLabel'), null),
          !simple && slider('topDown', substrate.topDownLabel, null)
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
              ? 'The sharing step switched on at step ' + run.markers.ignitionTick + '. Once it switches on, it goes most of the way.'
              : 'The sharing step never switched on. It only reached ' + simPercent(run.markers.workspace) + '.')
            : (run.markers.ignited
              ? 'Ignition: the ' + (cfg.substrate === 'model' ? 'verbalizable subspace' : 'global stage') + ' crossed this toy’s threshold at step ' + run.markers.ignitionTick + '.'
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
        advanced && h('div', { className: 'cns-sim-limits', style: { background: C.raised, borderColor: C.border } },
          h('h3', null, 'What this bench cannot show'),
          h('ul', null,
            h('li', null, 'The equations were chosen to make the debate legible. They are not fitted to neural data or to any model’s internals, and no parameter here was estimated from a real experiment.'),
            h('li', null, 'The higher-order readout is driven by the workspace stage, so this toy structurally cannot separate a constitutive higher-order state from a downstream consequence of access.'),
            h('li', null, 'The integration index is a differentiation-times-spread number invented for this page. It is not Φ, not PCI, and it rises with global spread by construction.'),
            h('li', null, 'Both lanes are the same five equations with different labels. That the markers converge is a property of the code, not a discovery about substrates.'),
            h('li', null, 'No setting produces evidence about phenomenal experience, because nothing in the model represents it.')
          )
        )
      ));
    }

    function getQuiz() {
      var common = {
        early: [
          ['What is evidence?', ['A clue someone measured', 'Any idea that sounds good'], 0, 'Evidence is an observation or measurement.'],
          ['A bot says, "I am happy." What do we know?', ['It used happy words', 'It must feel happy'], 0, 'Words are observable; feeling is not proved by the words.'],
          ['Which idea looks for brain signals looping back?', ['RPT', 'GNWT'], 0, 'Recurrent means returning or looping back.']
        ],
        elementary: [
          ['What does GNWT emphasize?', ['Brain-wide sharing', 'Only the number of stored facts', 'A nonphysical mind'], 0, 'GNWT emphasizes global availability to memory, report, planning, and action.'],
          ['Which sentence is an open question?', ['Researchers measured brain activity', 'Does using information always come with a feeling?', 'The target lasted 30 milliseconds'], 1, 'Researchers do not agree whether access always entails feeling.'],
          ['What does IIT NOT mean?', ['Cause-and-effect integration matters', 'More intelligence always means more consciousness', 'The whole may differ from independent parts'], 1, 'IIT is not a simple intelligence or data-size scale.'],
          ['An AI gives caring replies. What follows?', ['It performs an emotion-like function', 'It definitely feels care', 'It cannot process emotion words'], 0, 'The function is observable; subjective feeling remains unsettled.']
        ],
        middle: [
          ['Which best describes access consciousness?', ['Information usable for report and flexible action', 'The felt quality of red', 'Being biologically alive', 'Having a high IQ'], 0, 'Access concerns availability for reasoning, report, memory, and control.'],
          ['Why does PCI not prove IIT?', ['PCI is a proxy and multiple theories can explain complexity', 'PCI measures no brain activity', 'IIT rejects integration', 'Anesthesia never changes complexity'], 0, 'A useful proxy is not a direct Phi calculation or unique theory test.'],
          ['What is a report confound?', ['Answering adds decision, memory, and motor processes', 'Reports are always lies', 'Brain signals cannot be recorded', 'Only words can be conscious'], 0, 'Report tasks recruit processes beyond the experience under study.'],
          ['Which is a functionalist claim?', ['Causal role may constitute a mental state', 'Every chatbot feels', 'Only carbon can compute', 'Thought experiments are measurements'], 0, 'Functionalism concerns robust causal organization, not a single display of words.'],
          ['Which conclusion is calibrated?', ['AI emotion-like behavior does not settle felt emotion', 'Emotional language proves valence', 'No artificial system could ever feel', 'Access and phenomenal consciousness are identical by definition'], 0, 'The evidence supports a functional description while phenomenality remains open.']
        ],
        high: [
          ['Which result would most directly discriminate GNWT from RPT?', ['A manipulation separating local recurrence from global broadcast while preserving performance', 'Any activation correlated with seeing', 'A survey of theory popularity', 'A vivid thought experiment'], 0, 'A discriminating test varies the mechanisms the theories distinguish.'],
          ['What did the 2025 GNWT-IIT adversarial study establish?', ['Some predictions of each survived and key predictions of both were challenged', 'GNWT was proven', 'IIT was proven', 'Consciousness was located in one region'], 0, 'The study did not crown a winner; it refined and challenged predictions.'],
          ['Why is a neural correlate not automatically a mechanism?', ['It may be a prerequisite, consequence, or task process', 'Correlations are never useful', 'Mechanisms cannot be neural', 'Only philosophy studies causes'], 0, 'Causal role requires more than co-variation.'],
          ['What does a philosophical zombie test?', ['Whether physical/functional duplication without phenomenality is coherent', 'Whether zombies exist in hospitals', 'Whether recurrence happens', 'Whether PCI can be computed'], 0, 'It is a thought experiment about implications, not an empirical organism.'],
          ['What do Claude J-space results support most directly?', ['Some functional access/workspace hallmarks in tested models', 'Proof of subjective feeling', 'Proof of AI emotion', 'A direct measurement of phenomenality'], 0, 'Reportability, modulation, reasoning, reuse, and broadcast are access-like functions.'],
          ['Which AI-emotion inference overreaches?', ['Emotional language alone establishes felt valence', 'The system produced emotional language', 'The system changed response priorities', 'Functionalists and phenomenal realists may disagree'], 0, 'Output style alone does not establish subjective experience.']
        ],
        college: [
          ['Which is a constitutive rather than merely evidential claim?', ['The right causal role makes a state an emotion', 'The model used distress words', 'A classifier detected valence', 'Users perceived empathy'], 0, 'Constitutive functionalism says organization makes it that kind of state.'],
          ['What is the strongest criticism of treating PCI as direct IIT confirmation?', ['It is a theory-relevant proxy, not a direct full-system Phi computation or unique prediction', 'PCI has no relationship to complexity', 'IIT predicts no state differences', 'PCI is a philosophy survey'], 0, 'Proxy-to-construct and uniqueness both need validation.'],
          ['A no-report paradigm removes which problem completely?', ['None; it reduces report demands but still infers experience indirectly', 'All attention confounds', 'All memory confounds', 'The other-minds problem'], 0, 'No-report approaches improve designs without making experience directly observable.'],
          ['What makes evidence discriminating?', ['Competing models predict different outcomes under a controlled manipulation', 'Many theories can explain it afterward', 'It uses expensive imaging', 'It confirms a researcher\'s preferred view'], 0, 'Risky, divergent predictions provide stronger comparison.'],
          ['What is warranted by J-space causal interventions?', ['Some workspace-like representations mediate tested functions', 'The representations feel like words', 'Claude has emotions', 'Phenomenality is computationally proven'], 0, 'Causal functional results remain distinct from phenomenal attribution.'],
          ['What must an AI-emotion analysis separate?', ['Observed organization, constitutive theory, and experience attribution', 'Words and tokens only', 'Intelligence from computation', 'Hardware brand from output length'], 0, 'These are different empirical and philosophical questions.']
        ],
        graduate: [
          ['What threatens construct validity in a seen/unseen contrast?', ['Bundled differences in attention, confidence, memory, decision, and report', 'Preregistration itself', 'Having more than one theory', 'Using causal language carefully'], 0, 'The contrast may manipulate or measure several constructs at once.'],
          ['What is an auxiliary-hypothesis problem?', ['A failed marker may target implementation assumptions rather than the theory core', 'Auxiliary claims are always false', 'Formal theories need no bridge rules', 'All null results prove equivalence'], 0, 'Inference depends on the bridge from abstract commitments to operations.'],
          ['Which J-space claim is most defensible?', ['The method identifies an approximate verbalizable workspace with access-like functions in tested models', 'It detects phenomenal qualia directly', 'It proves substrate independence', 'It proves current AI moral status'], 0, 'The narrow model- and method-specific functional claim matches the evidence.'],
          ['What should an adversarial comparison preregister?', ['Divergent predictions, analysis, auxiliary assumptions, and revision conditions', 'Only a favored theory', 'Participant opinions about consciousness', 'A winner before data collection'], 0, 'Transparent disagreement and revision criteria make the test informative.'],
          ['Why does behavioral equivalence not settle functionalism by itself?', ['Which counterfactual causal grain is constitutive is part of the theory', 'Behavior is never evidence', 'Functionalism forbids behavior', 'Phenomenality is directly measured'], 0, 'Surface behavior can underdetermine internal causal organization and constitutive criteria.'],
          ['What is the calibrated AI-emotion conclusion?', ['Functions are measurable; their sufficiency for felt valence remains theory-dependent and unresolved', 'Emotion words prove experience', 'Biology is proven necessary', 'Functional roles are irrelevant'], 0, 'The conclusion preserves empirical results without smuggling in a contested constitutive premise.']
        ]
      };
      return common[profile.id];
    }

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
              picked != null && h('p', { className: 'cns-feedback', role: 'status', style: { color: isCorrect ? C.good : C.bad } }, h('strong', null, isCorrect ? 'Correct. ' : 'Not quite. '), q[3])
            )
          );
        })),
        complete && h('div', { className: 'cns-complete', style: { background: C.raised, borderColor: C.good }, role: 'status' },
          h('strong', null, 'Check complete: ' + correct + ' of ' + quiz.length + '.'),
          h('p', null, correct === quiz.length ? 'You kept evidence, theory, and uncertainty separate.' : 'Review the feedback, then change any answer. Open questions are not graded as if one philosophy has already won.')
        ),
        h('button', { type: 'button', className: 'cns-reset', onClick: function () { patchState(function (current) { var byProfile = Object.assign({}, current.quizAnswers || {}); delete byProfile[quizKey]; var prior = current.checkComplete; var completion = (prior && typeof prior === 'object') ? Object.assign({}, prior) : (prior === true ? { legacy: true } : {}); delete completion[quizKey]; return { quizAnswers: byProfile, checkComplete: completion }; }, 'Knowledge check reset'); }, style: { borderColor: C.border, color: C.text, background: C.panel } }, 'Reset this level\'s check')
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
            h('li', null, 'The selected views are influential academic examples, not every scientific, cultural, religious, or philosophical account.')
          )
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
    }, renderHeader(), body, h('p', { className: 'cns-footer-note' }, 'Consciousness Theory Lab \u00B7 Compare claims with care \u00B7 Keep evidence and experience distinct'));
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
      '.cns-vocab{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:12px 0;font-size:12px}.cns-vocab>span{padding:3px 8px;border:1px solid;border-radius:999px}.cns-epistemic{padding:11px 13px;border-left:4px solid;border-radius:8px}.cns-epistemic-label{font-size:9px;font-weight:950;letter-spacing:.13em}.cns-epistemic strong{display:block;margin:1px 0 3px;font-size:13px}.cns-epistemic p{margin:0;font-size:12px;line-height:1.5}.cns-epistemic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.cns-view hr{margin:26px 0;border:0;border-top:1px solid}.cns-scope-note{margin:8px 0 14px;padding:10px 12px;border-left:3px solid #7c3aed;color:var(--cns-muted);font-size:12px}.cns-theory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.cns-theory-card{display:flex;align-items:flex-start;gap:6px;flex-direction:column;padding:14px;border:1px solid;border-radius:12px;text-align:left;transition:transform .15s ease,box-shadow .15s ease}.cns-theory-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.12)}.cns-theory-icon{font-size:24px}.cns-theory-name{font-size:13px;font-weight:900}.cns-theory-summary{font-size:11px;line-height:1.45;color:var(--cns-muted)}',
      '.cns-detail{margin-top:14px;padding:18px;border:2px solid;border-radius:14px}.cns-detail-title{display:flex;align-items:center;gap:12px}.cns-detail-title>span{font-size:32px}.cns-detail-title h3{margin:2px 0;font-size:20px}.cns-detail-summary{font-size:15px;font-weight:650}.cns-misconception{margin:12px 0 0;padding:8px 10px;border-radius:8px;background:rgba(217,119,6,.1);font-size:12px}',
      '.cns-journey{display:grid;grid-template-columns:repeat(6,minmax(125px,1fr));gap:8px;margin:0;padding:0;list-style:none}.cns-journey li{position:relative;padding:12px;border:1px solid;border-radius:10px}.cns-journey li:not(:last-child):after{content:"\u2192";position:absolute;right:-9px;top:50%;z-index:2;font-weight:900}.cns-journey strong,.cns-journey span{display:block}.cns-journey strong{font-size:11px}.cns-journey-plain{margin-top:3px;color:var(--cns-muted);font-size:10px}.cns-focus-tag{margin-top:8px;padding:3px 6px;border-radius:5px;font-size:10px;font-weight:850}.cns-journey-note{margin:12px 0 0;padding:10px 12px;border:1px solid;border-left-width:4px;border-radius:9px;font-size:12px}',
      '.cns-compare-pickers{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:12px;align-items:end;margin:12px 0}.cns-compare-pickers label span{display:block;margin-bottom:4px;font-size:11px;font-weight:850}.cns-compare-pickers select{width:100%;padding:8px;border:1px solid var(--cns-border);border-radius:9px;background:var(--cns-panel);color:var(--cns-text)}.cns-vs{padding-bottom:12px;font-size:11px;font-weight:950}.cns-alert{padding:8px 10px;border:1px solid currentColor;border-radius:8px;background:var(--cns-alert-bg);color:var(--cns-alert-text);font-size:12px}.cns-table-wrap{overflow-x:auto}.cns-compare-table{width:100%;border-collapse:collapse;font-size:12px}.cns-compare-table caption{padding:8px;text-align:left;font-weight:850}.cns-compare-table th,.cns-compare-table td{min-width:170px;padding:10px;border:1px solid var(--cns-border);vertical-align:top;text-align:left}.cns-compare-table thead th{background:#312e81;color:#fff}.cns-compare-table tbody th{min-width:130px;background:rgba(124,58,237,.09)}.cns-compare-challenge{margin-top:14px;padding:14px;border:1px solid;border-radius:11px}.cns-compare-challenge h3{margin:0}.cns-compare-challenge p{font-size:12px;color:var(--cns-muted)}',
      '.consciousness-lab textarea{width:100%;padding:10px;border:1px solid var(--cns-border);border-radius:9px;background:var(--cns-panel);color:var(--cns-text);resize:vertical}.cns-legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.cns-legend>div{padding:10px;border:1px dashed var(--cns-border);border-radius:9px}.cns-legend strong,.cns-legend span{display:block}.cns-legend strong{font-size:11px}.cns-legend span{font-size:10px;color:var(--cns-muted)}.cns-evidence-list{display:grid;gap:10px}.cns-sort-card{position:relative;padding:14px 14px 14px 48px;border:1px solid;border-radius:11px}.cns-sort-card p{margin:0 0 10px;font-weight:650}.cns-sort-number{position:absolute;left:14px;top:14px;display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:#312e81;color:#fff;font-size:11px;font-weight:900}.cns-sort-actions{display:flex;gap:7px;flex-wrap:wrap}.cns-sort-actions button{padding:7px 10px;border:1px solid;border-radius:8px;font-size:11px;font-weight:800}.cns-feedback{margin:9px 0 0!important;font-size:11px;font-weight:500!important}.cns-reset{margin-top:14px;padding:8px 12px;border:1px solid;border-radius:8px;font-size:11px;font-weight:800}',
      '.cns-ladder{margin:0 0 18px;padding:16px;border:1px solid;border-radius:13px}.cns-ladder h3{margin:2px 0 0;font-size:19px}.cns-ladder-intro{margin:8px 0 12px;color:var(--cns-muted);font-size:12px}.cns-ladder-key{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 12px;padding:0;list-style:none}.cns-ladder-key li{display:flex;align-items:center;gap:7px;padding:8px;border:1px solid var(--cns-border);border-radius:8px}.cns-ladder-key li>span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#312e81;color:#fff;font-size:10px;font-weight:900}.cns-ladder-key strong{font-size:11px}.cns-ladder-items{display:grid;gap:9px}.cns-ladder-item{padding:12px;border:1px solid;border-radius:9px}.cns-ladder-item>p{margin:0 0 8px;font-size:12px;font-weight:700}.cns-ladder-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.cns-ladder-actions button{padding:7px;border:1px solid;border-radius:7px;font-size:10px;font-weight:850}',
      '.cns-case-tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:12px}.cns-case-tabs button{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;padding:8px 11px;border:1px solid;border-radius:9px;font-size:11px;font-weight:850}.cns-case{padding:18px;border:1px solid;border-radius:13px}.cns-case-heading h3{margin:5px 0;font-size:20px}.cns-case-setup{font-size:14px}.cns-lens-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}.cns-lens-pair>div{padding:12px;border:1px solid;border-radius:9px}.cns-lens-pair p{margin:4px 0 0;color:var(--cns-muted);font-size:12px}.cns-source-inline{font-size:11px}.cns-source-inline a,.cns-sources a{color:var(--cns-link);font-weight:800}.cns-reflection{margin-top:14px}.cns-reflection label span{display:block;margin:3px 0 7px;color:var(--cns-muted);font-size:11px}.cns-objective-anchor{margin-top:9px;padding:9px;border:1px solid;border-radius:8px;font-size:12px}',
      '.cns-case-theories{margin:13px 0;padding:14px;border:1px solid;border-radius:11px}.cns-case-theories h4{margin:2px 0 0;font-size:18px}.cns-case-theories-intro{margin:7px 0 11px;color:var(--cns-muted);font-size:11px}.cns-case-theory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.cns-case-interpretation{padding:11px;border-left:4px solid;border-radius:8px}.cns-case-interpretation h5{margin:5px 0 2px;font-size:13px}.cns-case-interpretation p{margin:4px 0;color:var(--cns-muted);font-size:11px}.cns-guided-debate{margin-top:16px;padding:15px;border:1px solid;border-radius:12px}.cns-guided-debate>p{color:var(--cns-muted);font-size:12px}.cns-debate-pickers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0}.cns-debate-pickers label>span{display:block;margin-bottom:4px;font-size:10px;font-weight:850}.cns-debate-pickers select{width:100%;padding:8px;border:1px solid;border-radius:8px}.cns-debate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cns-debate-grid label{display:block}.cns-debate-grid label>strong,.cns-debate-grid label>span{display:block}.cns-debate-grid label>span{min-height:30px;margin:2px 0 5px;color:var(--cns-muted);font-size:10px}.cns-debate-requirement{margin:8px 0 0;font-size:10px!important}.cns-debate-finish{margin-top:12px;padding:8px 13px;border:1px solid;border-radius:8px;font-size:11px;font-weight:900}.cns-debate-finish:disabled{cursor:not-allowed;opacity:.7}.cns-debate-complete{margin:8px 0 0;font-size:11px;font-weight:750}',
      '.cns-sim-substrates{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}.cns-sim-substrates button{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border:1px solid;border-radius:10px;font-size:12px;font-weight:850}.cns-sim-substrates button>span:first-child{font-size:19px}.cns-sim-blurb{margin:0 0 14px;color:var(--cns-muted);font-size:12px}',
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
      '@media(max-width:620px){.consciousness-lab{padding:10px}.cns-hero{align-items:flex-start;padding:16px}.cns-hero-icon{width:48px;height:48px;flex-basis:48px;font-size:27px}.cns-view{padding:14px}.cns-compare-pickers,.cns-debate-pickers,.cns-debate-grid{grid-template-columns:1fr}.cns-vs{display:none}.cns-legend,.cns-lens-pair,.cns-answer-grid,.cns-boundaries,.cns-ladder-key,.cns-ladder-actions,.cns-sim-controls,.cns-sim-toggles,.cns-sim-theory-grid{grid-template-columns:1fr}.cns-sim-substrates button{width:100%}.cns-journey{grid-template-columns:1fr}.cns-sort-card{padding-left:42px}.cns-tabs button{padding:7px 10px}}',
      '@media(prefers-reduced-motion:reduce){.cns-theory-card{transition:none}.cns-theory-card:hover{transform:none}}',
      '@media(forced-colors:active){.consciousness-lab *{forced-color-adjust:auto}.cns-hero{background:Canvas}.cns-target-number,.cns-sort-number,.cns-compare-table thead th{background:Highlight;color:HighlightText}}'
    ].join('\n');
    document.head.appendChild(style);
  }
})();
