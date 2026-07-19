'use strict';

const MALFORMED_LITERAL_PATTERNS = [
  { label: 'incorrect article before early', pattern: /\b(?:a|A) early\b/ },
  { label: 'incorrect plural young childs', pattern: /\byoung childs\b/i },
  { label: 'incorrect article before inclusive', pattern: /\b(?:a|A) inclusive\b/ },
  { label: 'mechanical program replacement', pattern: /\bearly intervention or school program\b/i },
  { label: 'contradictory separate-inclusive setting', pattern: /\bsame separate inclusive\b/i },
  { label: 'mechanical school-age replacement', pattern: /\bschool program-age\b/i },
  { label: 'developmentally inappropriate copier routine', pattern: /\bschool program copier\b/i },
  { label: 'unresolved Part C/Part B plan conflation', pattern: /\bIFSP or IEP\b/i },
  { label: 'adolescent transition content', pattern: /\b(?:postsecondary|job-shadow|culinary certificate|adult-service agency|outside employment provider|turns? 16|after graduation|final semester of high school)\b/i },
  { label: 'developmentally inappropriate instructional setting', pattern: /\b(?:fast-paced seminar|long lecture)\b/i },
];

const SOURCE_CASES = {
  25: {
    label: 'Part B individualized placement and LRE',
    required: [/\bPart B\b/i, /\bIEP team\b/i, /\bLRE\b|least restrictive environment/i],
    prohibited: [],
  },
  35: {
    label: 'Part C transition before age three',
    required: [/\bPart C\b/i, /\b(?:age|turns?) three\b/i, /\btransition\b/i],
    prohibited: [/\bpostsecondary\b/i, /\bage 16\b/i],
  },
  36: {
    label: 'routine-based IFSP outcome',
    required: [/\bIFSP\b/i, /\bfamily\b/i, /\broutine\b/i],
    prohibited: [/\bpostsecondary\b/i, /\bjob-shadow\b/i],
  },
  37: {
    label: 'explicit Part C IFSP versus Part B IEP distinction',
    required: [/\bPart C\b/i, /\bPart B\b/i, /\bIFSP\b/i, /\bIEP\b/i, /\bnatural environments?\b/i],
    prohibited: [],
  },
  39: {
    label: 'developmentally appropriate task-analysis routines',
    required: [/\btask analysis\b/i, /\b(?:hand-washing|arrival|materials)\b/i],
    prohibited: [/\bcopier\b/i],
  },
  85: {
    label: 'Part B FAPE boundary',
    required: [/\bPart B\b/i, /\bFAPE\b/i, /\bIEP\b/i, /\bPart C\b/i],
    prohibited: [],
  },
  86: {
    label: 'age-appropriate Child Find duty',
    required: [/\bChild Find\b/i, /\bPart C\b/i, /\bPart B\b/i],
    prohibited: [/\bpassing classes\b/i, /\bfails? a course\b/i],
  },
  99: {
    label: 'Part C transition participation safeguards',
    required: [/\bPart C\b/i, /\bpreschool\b/i, /\b(?:family|consent|approval)\b/i],
    prohibited: [/\badult-service\b/i, /\bemployment provider\b/i],
  },
};

function questionText(question) {
  return [question?.promptA, question?.promptB, question?.correct,
    ...(question?.distractors || []), question?.rationale].filter(Boolean).join('\n');
}

function itemText(item) {
  return [item?.prompt, ...(item?.choices || []), item?.rationale,
    ...(item?.choiceRationales || [])].filter(Boolean).join('\n');
}

function libraryActivityText(activity) {
  return [activity?.prompt, activity?.front, activity?.back,
    ...(activity?.choices || []), activity?.rationale, activity?.content]
    .filter(Boolean).join('\n');
}

function sourceQuestions(banks) {
  return (banks || []).flatMap((bank) => bank.questions || []);
}

function malformedFindings(text, scope, id) {
  return MALFORMED_LITERAL_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => ({ check: 'ec5692-content-integrity', id, message: `${scope} contains ${label}.` }));
}

function semanticFindings(text, config, scope, id) {
  const findings = [];
  for (const pattern of config.required) {
    if (!pattern.test(text)) findings.push({
      check: 'ec5692-semantic-boundary', id,
      message: `${scope} does not establish ${config.label}; missing ${pattern}.`,
    });
  }
  for (const pattern of config.prohibited) {
    if (pattern.test(text)) findings.push({
      check: 'ec5692-semantic-boundary', id,
      message: `${scope} violates ${config.label}; prohibited ${pattern}.`,
    });
  }
  return findings;
}

function auditSourceContentIntegrity(banks) {
  const questions = sourceQuestions(banks);
  const findings = [];
  questions.forEach((question, index) => {
    const position = index + 1;
    const id = `source-${String(position).padStart(3, '0')}`;
    const text = questionText(question);
    findings.push(...malformedFindings(text, 'source question', id));
    if (SOURCE_CASES[position]) {
      findings.push(...semanticFindings(text, SOURCE_CASES[position], 'source question', id));
    }
  });
  if (questions.length !== 100) findings.push({
    check: 'ec5692-content-integrity', id: '',
    message: `Expected 100 source questions, found ${questions.length}.`,
  });
  return findings;
}

function releasedItem(pack, batch, position) {
  const id = `se5692-b${batch}-${String(position).padStart(3, '0')}`;
  return (pack?.items || []).find((item) => item.id === id);
}

function auditPackContentIntegrity(pack) {
  const findings = [];
  for (const item of pack?.items || []) {
    findings.push(...malformedFindings(itemText(item), 'released item', item.id || ''));
  }
  for (const [positionText, config] of Object.entries(SOURCE_CASES)) {
    const position = Number(positionText);
    for (const batch of [1, 2]) {
      const item = releasedItem(pack, batch, position);
      const id = `se5692-b${batch}-${String(position).padStart(3, '0')}`;
      if (!item) {
        findings.push({ check: 'ec5692-semantic-boundary', id, message: 'Required released semantic case is missing.' });
      } else {
        findings.push(...semanticFindings(itemText(item), config, 'released item', id));
      }
    }
  }
  return findings;
}

const LIBRARY_CASES = [
  { id: 'se5692-ch-03-check-04', config: SOURCE_CASES[25] },
  { id: 'se5692-card-016', config: SOURCE_CASES[25] },
  { id: 'se5692-card-073', config: SOURCE_CASES[37] },
  { id: 'se5692-ch-05-check-02', config: SOURCE_CASES[39] },
  { id: 'se5692-card-026', config: SOURCE_CASES[39] },
  { id: 'se5692-ch-11-check-01', config: SOURCE_CASES[85] },
  { id: 'se5692-card-061', config: { label: 'Part B FAPE boundary card', required: [/\bPart B\b/i, /\bFAPE\b/i, /\bIEP\b/i], prohibited: [] } },
  { id: 'se5692-ch-11-check-02', config: SOURCE_CASES[86] },
  { id: 'se5692-card-062', config: SOURCE_CASES[86] },
];

function libraryActivities(library) {
  return [
    ...(library?.chapters || []).flatMap((chapter) => [
      ...(chapter.sections || []), ...(chapter.knowledgeChecks || []),
    ]),
    ...(library?.flashcards || []),
    ...(library?.memoryAids || []),
  ];
}

function auditLibraryContentIntegrity(library) {
  const activities = libraryActivities(library);
  const findings = [];
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  for (const activity of activities) {
    findings.push(...malformedFindings(libraryActivityText(activity), 'learning-library activity', activity.id || ''));
  }
  for (const { id, config } of LIBRARY_CASES) {
    const activity = byId.get(id);
    if (!activity) {
      findings.push({ check: 'ec5692-semantic-boundary', id, message: 'Required learning-library semantic case is missing.' });
    } else {
      findings.push(...semanticFindings(libraryActivityText(activity), config, 'learning-library activity', id));
    }
  }
  return findings;
}

function throwOnFindings(findings, scope) {
  if (!findings.length) return;
  const first = findings[0];
  throw new Error(`${scope} failed: ${first.id ? `${first.id}: ` : ''}${first.message}`);
}

function assertSourceContentIntegrity(banks) {
  throwOnFindings(auditSourceContentIntegrity(banks), 'EC5692 source integrity');
}

function assertPackContentIntegrity(pack) {
  throwOnFindings(auditPackContentIntegrity(pack), 'EC5692 pack integrity');
}

function assertLibraryContentIntegrity(library) {
  throwOnFindings(auditLibraryContentIntegrity(library), 'EC5692 library integrity');
}

module.exports = {
  MALFORMED_LITERAL_PATTERNS,
  SOURCE_CASES,
  LIBRARY_CASES,
  auditSourceContentIntegrity,
  auditPackContentIntegrity,
  auditLibraryContentIntegrity,
  assertSourceContentIntegrity,
  assertPackContentIntegrity,
  assertLibraryContentIntegrity,
};
