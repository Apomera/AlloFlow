'use strict';

// AP Psychology pilot: choice-length parity, extreme-qualifier moderation,
// feedback-detail enrichment, restatement cleanup, and library-check balance.
// Preserves pinned seed items (ap-psych-u1-005, ap-psych-u3-004, and
// ap-psych-u4-001's actor-observer asymmetry choice and rationale).

const SEED_ITEM_OVERRIDES = {
  'ap-psych-u2-005': {
    answer: 'Misinformation effect altering recall after misleading cues',
  },
  'ap-psych-u2-006': {
    choiceRationaleReplacements: {
      'Maintenance rehearsal repeats information but does not describe organizing separate digits into meaningful larger units.':
        'Maintenance rehearsal repeats isolated items by rote in working memory without grouping separate digits into meaningful larger chunks.',
      'Confirmation bias affects how evidence is selected and interpreted, not how a number sequence is organized in memory.':
        'Confirmation bias shapes how people seek and interpret supporting evidence rather than describing how numbers are grouped for recall.',
    },
  },
  'ap-psych-u2-007': {
    answer: 'Reliable scores, but limited evidence of validity.',
  },
  'ap-psych-u2-008': {
    choiceRationaleReplacements: {
      'Correlations describe association; they do not prove that either habit caused the differences in recall.':
        'Correlations measure the strength and direction of an association between variables without proving that either habit caused recall differences.',
      'A group-level correlation does not mean every individual using the habit had a higher recall score.':
        'A group-level correlation summarizes an overall pattern across participants rather than showing that every individual user scored higher.',
    },
  },
  'ap-psych-u3-006': {
    choiceRationaleReplacements: {
      'Object permanence concerns continued existence of objects when hidden, not judgments about equal visible quantities.':
        'Object permanence involves understanding that hidden objects still exist out of sight rather than comparing equal visible button counts.',
      "Attachment concerns caregiver relationships and does not explain the child's reasoning about number and spacing.":
        "Attachment describes emotional bonds with caregivers rather than explaining a child's judgment about equal numbers and spatial layout.",
    },
  },
  'ap-psych-u3-007': {
    answer: 'overregularization applied to an irregular verb',
    choiceRationaleReplacements: {
      "Babbling consists mainly of early repeated sounds and does not describe a preschooler's grammatical error.":
        "Babbling consists of early infant consonant-vowel sounds before word formation and does not explain a preschooler's regular past-tense error.",
      'Telegraphic speech contains short phrases with omitted function words, not an incorrect regular past-tense ending.':
        'Telegraphic speech consists of brief two- or three-word phrases omitting function words rather than applying a regular past-tense ending.',
    },
  },
  'ap-psych-u4-001': {
    choiceRationaleReplacements: {
      'The just-world hypothesis concerns believing that people generally receive deserved outcomes; the judgment here more directly ignores a known situational cause.':
        'Belief in a just world assumes people generally receive deserved outcomes; the judgment here more directly ignores a known situational cause.',
    },
  },
  'ap-psych-u4-005': {
    answer: 'Diffusion of responsibility among the bystanders present',
  },
  'ap-psych-u4-006': {
    answer: 'Humanistic perspective stressing growth and autonomy',
  },
  'ap-psych-u4-007': {
    answer: 'Intrinsic motivation driven by inherent enjoyment',
    choiceRationaleReplacements: {
      'Learned helplessness involves reduced effort after uncontrollable outcomes and does not fit persistent satisfying practice.':
        'Learned helplessness describes giving up after repeated uncontrollable outcomes rather than explaining persistent, self-directed practice driven by enjoyment.',
      'Drive reduction concerns biological needs such as hunger or thirst, not enjoyment of a challenging skill.':
        'Drive reduction addresses physiological needs such as hunger or thirst rather than explaining intrinsic enjoyment of practicing a skill.',
    },
  },
  'ap-psych-u4-008': {
    answer: 'Two-factor theory, where physiological arousal is labeled using context',
    distractorReplacements: {
      'The Cannon-Bard theory, in which arousal and emotion always occur independently':
        'The Cannon-Bard theory, in which arousal and emotion occur independently without cognitive labeling',
      'The opponent-process theory, in which every emotion is immediately replaced by its opposite':
        'The opponent-process theory, in which an emotion is followed rapidly by an opposing aftereffect',
    },
    choiceRationaleReplacements: {
      'Cannon-Bard theory proposes simultaneous arousal and emotional experience, but the contextual labeling detail points elsewhere.':
        'Cannon-Bard theory proposes simultaneous physiological arousal and emotional experience, whereas this scenario hinges on contextual labeling of arousal.',
    },
  },
  'ap-psych-u5-004': {
    choiceRationaleReplacements: {
      'Unconditional positive regard is a person-centered therapeutic stance of acceptance, not the structured behavioral procedure described.':
        'Showing nonjudgmental acceptance (unconditional positive regard) reflects person-centered therapy rather than a structured graded exposure procedure.',
    },
  },
  'ap-psych-u5-005': {
    answer: 'Problem-focused coping directly altering the stressful workload',
    choiceRationaleReplacements: {
      "Emotion-focused coping regulates feelings, but the student's actions directly organize and alter the stressful task.":
        "Emotion-focused coping centers on regulating emotional distress, whereas this student's planning and outreach directly change the stressful workload.",
      "Avoidant coping involves withdrawing or postponing action, which contrasts with the student's planning and communication.":
        "Avoidant coping involves withdrawing from or postponing a stressful demand, which contrasts directly with this student's active planning and communication.",
    },
  },
  'ap-psych-u5-006': {
    distractorReplacements: {
      'Any behavior that differs from a local norm automatically meets diagnostic criteria.':
        'Any behavior that departs from a local norm directly satisfies clinical diagnostic criteria.',
      'A behavior can be classified accurately only when its biological cause is already known.':
        'A behavior can be classified accurately strictly after its biological cause is identified.',
    },
    choiceRationaleReplacements: {
      'Statistical rarity can be relevant, but difference from a local norm alone does not automatically establish a disorder.':
        'Statistical rarity can offer context, yet departing from a local social norm by itself does not establish clinical distress or disorder.',
      "Another person's discomfort is not enough to determine the individual's distress, impairment, or diagnostic status.":
        "An outside observer's discomfort cannot by itself establish clinically significant distress, functional impairment, or a formal diagnosis.",
    },
  },
};

// Balance length and answer indices (0..3) across AP Psychology's 25 learning
// library knowledge checks (eliminating all 6 severe >=1.25x checks and
// rotating the 15 section retrieval checks away from answerIndex 0).
const LIBRARY_CHECK_OVERRIDES = {
  'ap-psych-ch-01-check-02': {
    answer: 'Both inherited variation and environmental factors matter.',
  },
  'ap-psych-ch-01-section-01-retrieval-check': {
    answer: 'Genetic differences link to much score variation in this group.',
    targetAnswerIndex: 0,
  },
  'ap-psych-ch-01-section-02-retrieval-check': {
    targetAnswerIndex: 2,
  },
  'ap-psych-ch-01-section-03-retrieval-check': {
    targetAnswerIndex: 3,
  },
  'ap-psych-ch-02-check-02': {
    answer: 'Misinformation effect',
  },
  'ap-psych-ch-02-section-01-retrieval-check': {
    targetAnswerIndex: 1,
  },
  'ap-psych-ch-02-section-02-retrieval-check': {
    targetAnswerIndex: 2,
  },
  'ap-psych-ch-02-section-03-retrieval-check': {
    answer: 'Reliable scores with limited validity evidence.',
    targetAnswerIndex: 3,
  },
  'ap-psych-ch-03-check-02': {
    answer: 'Cross-sectional, so age may be confounded with cohort.',
  },
  'ap-psych-ch-03-section-01-retrieval-check': {
    answer: 'Cohort differences may confound age.',
    targetAnswerIndex: 0,
  },
  'ap-psych-ch-03-section-02-retrieval-check': {
    targetAnswerIndex: 2,
  },
  'ap-psych-ch-03-section-03-retrieval-check': {
    targetAnswerIndex: 3,
  },
  'ap-psych-ch-04-check-01': {
    distractorReplacements: {
      'The mere-exposure effect': 'The mere-exposure attitude effect',
    },
  },
  'ap-psych-ch-04-section-01-retrieval-check': {
    distractorReplacements: {
      'The spacing effect': 'The self-serving attribution bias',
    },
    targetAnswerIndex: 1,
  },
  'ap-psych-ch-04-section-02-retrieval-check': {
    answer: 'Reciprocal determinism loop',
    targetAnswerIndex: 2,
  },
  'ap-psych-ch-04-section-03-retrieval-check': {
    targetAnswerIndex: 3,
  },
  'ap-psych-ch-05-check-01': {
    answer: 'Weigh duration, context, impairment, and alternatives before diagnosing.',
  },
  'ap-psych-ch-05-check-02': {
    answer: 'Randomly assigning participants to treatment and comparison groups',
  },
  'ap-psych-ch-05-section-01-retrieval-check': {
    answer: 'Revising the plan to tackle the demand',
    targetAnswerIndex: 0,
  },
  'ap-psych-ch-05-section-02-retrieval-check': {
    answer: 'Weigh context and duration instead of diagnosing briefly.',
    targetAnswerIndex: 1,
  },
  'ap-psych-ch-05-section-03-retrieval-check': {
    answer: 'Effect size and daily functioning at follow-up',
    targetAnswerIndex: 3,
  },
};

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyApPsychSeedOverride(item) {
  const override = SEED_ITEM_OVERRIDES[item.id];
  if (!override) return item;
  const nextChoices = item.choices.slice();
  const nextRationales = item.choiceRationales.slice();
  if (override.answer) {
    nextChoices[item.answerIndex] = override.answer;
  }
  if (override.distractorReplacements) {
    const map = new Map(Object.entries(override.distractorReplacements).map(([k, v]) => [normalizeLookup(k), v]));
    for (let i = 0; i < nextChoices.length; i += 1) {
      if (i === item.answerIndex) continue;
      const key = normalizeLookup(nextChoices[i]);
      if (map.has(key)) nextChoices[i] = map.get(key);
    }
  }
  if (override.choiceRationaleReplacements) {
    const map = new Map(Object.entries(override.choiceRationaleReplacements).map(([k, v]) => [normalizeLookup(k), v]));
    for (let i = 0; i < nextRationales.length; i += 1) {
      if (i === item.answerIndex) continue;
      const key = normalizeLookup(nextRationales[i]);
      if (map.has(key)) nextRationales[i] = map.get(key);
    }
  }
  return { ...item, choices: nextChoices, choiceRationales: nextRationales };
}

function applyApPsychLibraryCheckOverride(check) {
  const override = LIBRARY_CHECK_OVERRIDES[check.id];
  if (!override) return check;
  const nextChoices = check.choices.slice();
  if (override.answer) nextChoices[check.answerIndex] = override.answer;
  if (override.distractorReplacements) {
    const map = new Map(Object.entries(override.distractorReplacements).map(([k, v]) => [normalizeLookup(k), v]));
    for (let i = 0; i < nextChoices.length; i += 1) {
      if (i === check.answerIndex) continue;
      const key = normalizeLookup(nextChoices[i]);
      if (map.has(key)) nextChoices[i] = map.get(key);
    }
  }
  let answerIndex = check.answerIndex;
  if (Number.isInteger(override.targetAnswerIndex) && override.targetAnswerIndex !== answerIndex) {
    const keyText = nextChoices[answerIndex];
    const distractors = nextChoices.filter((_, i) => i !== answerIndex);
    const rotated = [];
    let d = 0;
    for (let i = 0; i < 4; i += 1) {
      rotated.push(i === override.targetAnswerIndex ? keyText : distractors[d++]);
    }
    return { ...check, choices: rotated, answerIndex: override.targetAnswerIndex };
  }
  return { ...check, choices: nextChoices, answerIndex };
}

// Eliminates remaining key-stem lexical leakage across seed and generated items
// without altering bare-term keys, distractors, or pinned items.
const ITEM_LEAKAGE_OVERRIDES = {
  'ap-psych-u1-002': {
    answer: 'Sleep regularity and attention were associated, but directionality and possible third variables prevent a causal claim.',
  },
  'ap-psych-u2-003': {
    answer: 'Proofreading accuracy is the count of inserted typos flagged during the test.',
  },
  'ap-psych-u4-003': {
    answer: 'Wording-induced response bias because the wording labels the rule and presumes harm',
  },
  'ap-psych-u4-002': {
    prompt: 'A student privately opposes a school policy but voluntarily records a video defending it in exchange for a very small amount of service credit. Later, the student reports viewing the policy somewhat more favorably. Which process best explains this shift in viewpoint?',
  },
  'ap-psych-u5-001': {
    answer: 'The mean difference was statistically significant but small; neither result shows that every student benefited.',
  },
  'ap-psych-u1-007': {
    answer: 'The assigned pretest condition of napping or resting awake',
  },
  'ap-psych-u2-005': {
    answer: 'Misinformation effect altering recall via misleading cues',
  },
  'ap-psych-u2-006': {
    answer: 'Chunking that combines smaller units into coherent blocks',
  },
  'ap-psych-u2-008': {
    answer: 'Retrieval practice shows the stronger positive link with later recall.',
  },
  'ap-psych-u3-005': {
    answer: 'teratogen that can disrupt fetal development',
  },
  'ap-psych-u3-008': {
    answer: 'A longitudinal design tracking one cohort of participants across time',
  },
  'ap-psych-u5-005': {
    answer: 'Problem-focused coping actively altering the stressful workload',
  },
  'ap-psych-u5-006': {
    answer: 'Statistical rarity alone is not enough; context, suffering, dysfunction, and risk matter.',
  },
  'ap-psych-u5-007': {
    answer: 'Incidence, because it counts newly diagnosed occurrences in an at-risk group',
  },
  'ap-psych-u2-014': {
    prompt: 'In an ambiguous picture, attention shifts between seeing a vase and seeing two faces as the central foreground shape. Which psychological concept would a researcher use to describe this result?',
  },
  'ap-psych-u3-022': {
    prompt: 'A harmful exposure during a stage of rapid organ formation creates a particularly important developmental concern. Which psychological concept would a researcher use to describe this result?',
  },
  'ap-psych-u3-030': {
    prompt: 'A developmental interview asks how a person self-identifies rather than inferring self-concept from clothing or activities. Which concept best explains this pattern?',
  },
  'ap-psych-u3-035': {
    prompt: 'A researcher measures enduring patterns of romantic attraction rather than treating attraction as a voluntary daily choice. Which concept best explains this pattern?',
  },
  'ap-psych-u5-035': {
    prompt: 'After making a mistake, a person acknowledges the error while offering the same kindness inward that they would give a friend. Which concept is illustrated by the situation?',
  },
  'ap-psych-u4-043': {
    prompt: 'A group member is less likely to intervene because the duty to act appears shared across many observers. Which concept best explains this pattern?',
  },
  'ap-psych-u5-054': {
    prompt: 'Assessment considers language, community traditions, and access to resources rather than applying one society’s norms automatically. Which explanation is most consistent with the observation?',
  },
  'ap-psych-u2-062': {
    prompt: 'A learner navigates a new spatial layout and later recalls the locations after activity in a temporal-lobe consolidation structure. Which concept best explains this pattern?',
  },
  'ap-psych-u4-063': {
    prompt: 'Researchers summarize individual differences using a quintet of broad dimensions rather than a single type category. Which concept best explains this pattern?',
  },
  'ap-psych-u4-068': {
    prompt: 'A normally talkative individual becomes quiet during a formal interview but lively with close friends. Which concept best explains this pattern?',
  },
  'ap-psych-u4-069': {
    prompt: 'A trait predicts behavior more accurately when the surrounding context provides an opportunity to express that trait. Which term most directly applies to the example?',
  },
  'ap-psych-u5-070': {
    prompt: 'After a harrowing event, a person has intrusive memories, avoids reminders, and remains unusually alert for an extended period. Which concept is illustrated by the situation?',
  },
  'ap-psych-u1-079': {
    prompt: 'A dream combines unrelated images after random brainstem firing during sleep, and the sleeper experiences a coherent story. Which concept best explains this pattern?',
  },
  'ap-psych-u4-082': {
    prompt: 'After basic survival requirements are relatively secure, a person devotes more attention to belonging, esteem, and personal growth. Which concept is illustrated by the situation?',
  },
  'ap-psych-u5-084': {
    prompt: 'Treatment includes thought records, action-based practice exercises, and planned homework between sessions. Which explanation is most consistent with the observation?',
  },
  'ap-psych-u5-089': {
    prompt: 'A prescriber chooses a medication that increases mood-linked neurotransmitter availability by reducing its reabsorption at synapses. Which explanation is most consistent with the observation?',
  },
  'ap-psych-u1-094': {
    prompt: 'A tired security officer misses a faint target cue that an alert officer detects even though the physical stimulus is identical. Which concept best explains this pattern?',
  },
};

function applyApPsychItemOverride(item) {
  const override = ITEM_LEAKAGE_OVERRIDES[item.id];
  if (!override) return item;
  const next = { ...item };
  if (override.prompt) next.prompt = override.prompt;
  if (override.answer) {
    const nextChoices = item.choices.slice();
    nextChoices[item.answerIndex] = override.answer;
    next.choices = nextChoices;
  }
  return next;
}

module.exports = {
  SEED_ITEM_OVERRIDES,
  ITEM_LEAKAGE_OVERRIDES,
  LIBRARY_CHECK_OVERRIDES,
  applyApPsychSeedOverride,
  applyApPsychItemOverride,
  applyApPsychLibraryCheckOverride,
};
