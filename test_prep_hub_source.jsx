/* AlloFlow Test Prep Hub - reusable exam-pack workspace */

const TEST_PREP_SCHEMA_VERSION = 1;
const TEST_PREP_STORAGE_KEY = 'alloflow_test_prep_progress_v1';
const TEST_PREP_ITEM_TYPES = ['single-choice'];
const TEST_PREP_PACK_STATUSES = ['ready', 'planned', 'research'];

const WORKPLACE_SAFETY_DEMO = {
  schemaVersion: TEST_PREP_SCHEMA_VERSION,
  id: 'workplace-safety-foundations-demo',
  title: 'Workplace Safety Foundations',
  shortTitle: 'Safety Foundations',
  description: 'A five-question demonstration of the reusable practice flow. It is not preparation for a credential or a substitute for workplace training.',
  credentialOwner: '',
  version: '1.0.0',
  status: 'ready',
  accent: 'teal',
  disclaimer: 'General learning demonstration only. Follow your employer, instructor, equipment manufacturer, and applicable safety authority.',
  domains: [
    { id: 'hazard-awareness', label: 'Hazard awareness', weight: 0.4 },
    { id: 'safe-response', label: 'Safe response', weight: 0.6 },
  ],
  sections: [{ id: 'foundations', label: 'Foundations', timeMinutes: null }],
  items: [
    {
      id: 'safety-demo-1',
      type: 'single-choice',
      domainId: 'hazard-awareness',
      difficulty: 'foundation',
      prompt: 'You are asked to use unfamiliar equipment. What is the best first step?',
      choices: [
        'Try it briefly to learn how it responds',
        'Ask another learner to operate it for you',
        'Complete the required training and review the approved operating procedure',
        'Use it only when a supervisor is nearby',
      ],
      answerIndex: 2,
      rationale: 'Training and the approved procedure establish the hazards, controls, and limits before operation begins.',
    },
    {
      id: 'safety-demo-2',
      type: 'single-choice',
      domainId: 'safe-response',
      difficulty: 'foundation',
      prompt: 'A ladder has a cracked rung. What is the safest response?',
      choices: [
        'Mark the rung and continue carefully',
        'Remove the ladder from service and report the damage',
        'Use it only for a short task',
        'Ask a coworker to steady it',
      ],
      answerIndex: 1,
      rationale: 'Damaged equipment should be removed from service through the workplace reporting process rather than used with an improvised workaround.',
    },
    {
      id: 'safety-demo-3',
      type: 'single-choice',
      domainId: 'hazard-awareness',
      difficulty: 'foundation',
      prompt: 'What is the main purpose of a Safety Data Sheet (SDS)?',
      choices: [
        'To record employee attendance',
        'To list a product price and supplier discount',
        'To communicate chemical hazards, handling, storage, and emergency information',
        'To replace all workplace-specific training',
      ],
      answerIndex: 2,
      rationale: 'An SDS communicates standardized information about a chemical product. It supports, but does not replace, training and workplace procedures.',
    },
    {
      id: 'safety-demo-4',
      type: 'single-choice',
      domainId: 'safe-response',
      difficulty: 'foundation',
      prompt: 'A task exposes workers to a hazard that cannot be eliminated immediately. What should guide the next action?',
      choices: [
        'The fastest available workaround',
        'The applicable hazard-control plan and authorized procedure',
        'Whatever another worksite usually does',
        'Whether the task can be finished before a break',
      ],
      answerIndex: 1,
      rationale: 'The applicable plan and authorized procedure identify the controls, responsibilities, and escalation path for the specific worksite and task.',
    },
    {
      id: 'safety-demo-5',
      type: 'single-choice',
      domainId: 'safe-response',
      difficulty: 'foundation',
      prompt: 'You do not understand a safety instruction. What is the best response?',
      choices: [
        'Continue and copy the person beside you',
        'Skip the instruction if the task seems familiar',
        'Pause and ask the responsible instructor or supervisor for clarification',
        'Search for a shorter instruction after the task',
      ],
      answerIndex: 2,
      rationale: 'Clarification should happen before exposure to the hazard. A learner should not have to guess about a safety-critical instruction.',
    },
  ],
};

const EPPP_PART_ONE_SCAFFOLD = {
  schemaVersion: TEST_PREP_SCHEMA_VERSION,
  id: 'eppp-part-one',
  title: 'EPPP Part 1 — Source-Reviewed Pilot',
  shortTitle: 'EPPP Part 1 pilot',
  description: 'Thirty-two source-reviewed foundation items—four per Part 1 domain—including traced, re-authored migration batches from the Pass the EPPP legacy workspace.',
  credentialOwner: 'Association of State and Provincial Psychology Boards',
  version: '0.7.0',
  status: 'ready',
  accent: 'violet',
  contentReview: '80/80 native items passed content QA; independent expert validation pending',
  legacyUrl: './test_prep/eppp_legacy/index.html?embedded=1',
  legacyAuditUrl: './test_prep/eppp_legacy/content_audit.json',
  legacyInventoryUrl: './test_prep/eppp_legacy/content_inventory.json',
  legacyReviewLedgerUrl: './test_prep/eppp_legacy/review_ledger.json',
  curation500Url: './test_prep/eppp_legacy/curation_500.json',
  nativeQaUrl: './test_prep/eppp_native_qa.json',
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ASPPB. Practice results are not official scores or pass predictions.',
  domains: [
    { id: 'biological', label: 'Biological bases of behavior', weight: 0.10 },
    { id: 'cognitive-affective', label: 'Cognitive-affective bases of behavior', weight: 0.13 },
    { id: 'social-cultural', label: 'Social and cultural bases of behavior', weight: 0.11 },
    { id: 'lifespan', label: 'Growth and lifespan development', weight: 0.12 },
    { id: 'assessment', label: 'Assessment and diagnosis', weight: 0.16 },
    { id: 'intervention', label: 'Treatment, intervention, prevention and supervision', weight: 0.15 },
    { id: 'research', label: 'Research methods and statistics', weight: 0.07 },
    { id: 'professional', label: 'Ethical, legal, and professional issues', weight: 0.16 },
  ],
  sections: [{ id: 'knowledge', label: 'Part 1 — Knowledge', timeMinutes: 255 }],
  items: EPPP_NATIVE_ITEMS,
};

const TEST_PREP_RESEARCH_LANES = [
  {
    id: 'code-inspection',
    icon: '\uD83C\uDFD7\uFE0F',
    title: 'Code and inspection credentials',
    examples: 'Electrician licensing, ICC inspection, contractor business and law',
    opportunity: 'High prep costs and a strong need for timed reference-navigation practice.',
    guardrail: 'Requires edition- and jurisdiction-specific packs plus licensed or user-owned reference books.',
  },
  {
    id: 'technical-safety',
    icon: '\uD83E\uDDF0',
    title: 'Technical safety credentials',
    examples: 'Welding inspection, fire systems, crane written examinations',
    opportunity: 'Preparation can cost hundreds or thousands of dollars.',
    guardrail: 'Safety-critical content requires qualified trade reviewers and must never imply practical certification.',
  },
  {
    id: 'language-access',
    icon: '\uD83C\uDF10',
    title: 'Language-access credentials',
    examples: 'Court and healthcare interpreter knowledge and performance exams',
    opportunity: 'AlloFlow already has multilingual, speech, replay, and accessible practice infrastructure.',
    guardrail: 'Oral-performance practice needs human-calibrated rubrics; transcript similarity is not interpreting quality.',
  },
];

const _testPrepPackRegistry = {};

function testPrepSlug(value, fallback) {
  const clean = String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return clean || fallback;
}

function testPrepFinite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeTestPrepDomain(domain, index) {
  const input = domain && typeof domain === 'object' && !Array.isArray(domain) ? domain : {};
  return {
    id: testPrepSlug(input.id || input.label, 'domain-' + (index + 1)),
    label: String(input.label || input.name || 'Domain ' + (index + 1)).trim().slice(0, 140),
    weight: Math.max(0, testPrepFinite(input.weight, 0)),
  };
}

function normalizeTestPrepItem(item, index, domainIds) {
  const input = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
  const choices = (Array.isArray(input.choices) ? input.choices : input.options)
    ?.slice(0, 8).map((choice) => String(choice || '').trim().slice(0, 600)).filter(Boolean) || [];
  const answerIndex = Math.floor(testPrepFinite(input.answerIndex, input.answer));
  const requestedDomain = testPrepSlug(input.domainId, '');
  return {
    id: testPrepSlug(input.id, 'item-' + (index + 1)),
    type: TEST_PREP_ITEM_TYPES.includes(input.type) ? input.type : 'single-choice',
    domainId: domainIds.includes(requestedDomain) ? requestedDomain : (domainIds[0] || 'general'),
    difficulty: String(input.difficulty || 'unrated').trim().slice(0, 40),
    prompt: String(input.prompt || input.q || '').trim().slice(0, 3000),
    choices,
    answerIndex,
    rationale: String(input.rationale || '').trim().slice(0, 4000),
    references: (Array.isArray(input.references) ? input.references : [])
      .slice(0, 8).map((reference) => String(reference || '').trim().slice(0, 500)).filter(Boolean),
    reviewStatus: String(input.reviewStatus || 'unreviewed').trim().slice(0, 40),
    legacySourceId: /^legacy-[a-f0-9]{16}$/.test(String(input.legacySourceId || '').trim()) ? String(input.legacySourceId).trim() : '',
    legacySourceFile: /^js\/[a-zA-Z0-9_.-]+\.js$/.test(String(input.legacySourceFile || '').trim()) ? String(input.legacySourceFile).trim() : '',
    migrationStatus: String(input.migrationStatus || '').trim().slice(0, 60),
    qaStatus: input.qaStatus === 'qa-passed' ? 'qa-passed' : 'review-required',
    qaReviewedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(input.qaReviewedAt || '').trim()) ? String(input.qaReviewedAt).trim() : '',
  };
}

function normalizeTestPrepPack(pack) {
  const input = pack && typeof pack === 'object' && !Array.isArray(pack) ? pack : {};
  const domains = (Array.isArray(input.domains) ? input.domains : []).slice(0, 80).map(normalizeTestPrepDomain);
  if (!domains.length) domains.push({ id: 'general', label: 'General', weight: 1 });
  const domainIds = domains.map((domain) => domain.id);
  const sections = (Array.isArray(input.sections) ? input.sections : []).slice(0, 20).map((section, index) => ({
    id: testPrepSlug(section && (section.id || section.label), 'section-' + (index + 1)),
    label: String(section && (section.label || section.name) || 'Section ' + (index + 1)).trim().slice(0, 140),
    timeMinutes: section && section.timeMinutes != null ? Math.max(1, Math.round(testPrepFinite(section.timeMinutes, 1))) : null,
  }));
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 10000)
    .map((item, index) => normalizeTestPrepItem(item, index, domainIds));
  return {
    schemaVersion: Math.floor(testPrepFinite(input.schemaVersion, TEST_PREP_SCHEMA_VERSION)),
    id: testPrepSlug(input.id || input.title, 'exam-pack'),
    title: String(input.title || '').trim().slice(0, 180),
    shortTitle: String(input.shortTitle || input.title || '').trim().slice(0, 100),
    description: String(input.description || '').trim().slice(0, 800),
    credentialOwner: String(input.credentialOwner || '').trim().slice(0, 180),
    version: String(input.version || '0.1.0').trim().slice(0, 40),
    status: TEST_PREP_PACK_STATUSES.includes(input.status) ? input.status : 'research',
    accent: String(input.accent || 'indigo').trim().slice(0, 30),
    disclaimer: String(input.disclaimer || 'Independent practice material. Not an official score or credential.').trim().slice(0, 800),
    contentReview: String(input.contentReview || '').trim().slice(0, 160),
    legacyUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyUrl || '').trim()) && !String(input.legacyUrl || '').includes('..') ? String(input.legacyUrl).trim() : '',
    legacyAuditUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyAuditUrl || '').trim()) && !String(input.legacyAuditUrl || '').includes('..') ? String(input.legacyAuditUrl).trim() : '',
    legacyInventoryUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyInventoryUrl || '').trim()) && !String(input.legacyInventoryUrl || '').includes('..') ? String(input.legacyInventoryUrl).trim() : '',
    legacyReviewLedgerUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyReviewLedgerUrl || '').trim()) && !String(input.legacyReviewLedgerUrl || '').includes('..') ? String(input.legacyReviewLedgerUrl).trim() : '',
    curation500Url: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.curation500Url || '').trim()) && !String(input.curation500Url || '').includes('..') ? String(input.curation500Url).trim() : '',
    nativeQaUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.nativeQaUrl || '').trim()) && !String(input.nativeQaUrl || '').includes('..') ? String(input.nativeQaUrl).trim() : '',
    domains,
    sections,
    items,
  };
}

function validateTestPrepPack(pack) {
  const normalized = normalizeTestPrepPack(pack);
  const errors = [];
  if (normalized.schemaVersion !== TEST_PREP_SCHEMA_VERSION) errors.push('Unsupported schema version.');
  if (!normalized.title) errors.push('Pack title is required.');
  if (!normalized.id) errors.push('Pack id is required.');
  const seen = new Set();
  normalized.items.forEach((item, index) => {
    if (!item.prompt) errors.push('Item ' + (index + 1) + ' is missing a prompt.');
    if (item.choices.length < 2) errors.push('Item ' + (index + 1) + ' needs at least two choices.');
    if (item.answerIndex < 0 || item.answerIndex >= item.choices.length) errors.push('Item ' + (index + 1) + ' has an invalid answer index.');
    if (seen.has(item.id)) errors.push('Duplicate item id: ' + item.id + '.');
    seen.add(item.id);
  });
  if (normalized.status === 'ready' && !normalized.items.length) errors.push('A ready pack must contain at least one item.');
  return { valid: errors.length === 0, errors, pack: normalized };
}

function registerTestPrepPack(pack) {
  const result = validateTestPrepPack(pack);
  if (!result.valid) throw new Error('Invalid test prep pack: ' + result.errors.join(' '));
  _testPrepPackRegistry[result.pack.id] = result.pack;
  return result.pack;
}

function listTestPrepPacks() {
  return Object.keys(_testPrepPackRegistry).map((id) => _testPrepPackRegistry[id]);
}

function normalizeTestPrepProgress(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const attempts = (Array.isArray(input.attempts) ? input.attempts : []).slice(-100).map((attempt) => ({
    id: String(attempt && attempt.id || '').slice(0, 100),
    packId: testPrepSlug(attempt && attempt.packId, ''),
    completedAt: Math.max(0, testPrepFinite(attempt && attempt.completedAt, 0)),
    correct: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.correct, 0))),
    total: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.total, 0))),
    percent: Math.max(0, Math.min(100, Math.round(testPrepFinite(attempt && attempt.percent, 0)))),
    confidence: attempt && attempt.confidence && typeof attempt.confidence === 'object' && !Array.isArray(attempt.confidence) ? attempt.confidence : {},
  })).filter((attempt) => attempt.packId && attempt.total > 0 && attempt.correct <= attempt.total);
  return { attempts };
}

function readTestPrepProgress() {
  try { return normalizeTestPrepProgress(JSON.parse(localStorage.getItem(TEST_PREP_STORAGE_KEY) || '{}')); }
  catch (_) { return { attempts: [] }; }
}

function writeTestPrepProgress(progress) {
  const normalized = normalizeTestPrepProgress(progress);
  try { localStorage.setItem(TEST_PREP_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
  return normalized;
}

function scoreTestPrepAttempt(pack, answers) {
  const normalized = normalizeTestPrepPack(pack);
  const responseMap = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  let correct = 0;
  const byDomain = {};
  normalized.items.forEach((item) => {
    const domain = item.domainId || 'general';
    if (!byDomain[domain]) byDomain[domain] = { correct: 0, total: 0 };
    byDomain[domain].total += 1;
    if (Number(responseMap[item.id]) === item.answerIndex) {
      correct += 1;
      byDomain[domain].correct += 1;
    }
  });
  const total = normalized.items.length;
  return { correct, total, percent: total ? Math.round(correct / total * 100) : 0, byDomain };
}

function recordTestPrepAttempt(progress, pack, answers, confidence, now) {
  const score = scoreTestPrepAttempt(pack, answers);
  const next = normalizeTestPrepProgress(progress);
  if (!score.total) return next;
  next.attempts.push({
    id: 'attempt-' + Math.round(testPrepFinite(now, Date.now())) + '-' + Math.random().toString(36).slice(2, 8),
    packId: normalizeTestPrepPack(pack).id,
    completedAt: Math.max(0, testPrepFinite(now, Date.now())),
    correct: score.correct,
    total: score.total,
    percent: score.percent,
    confidence: confidence && typeof confidence === 'object' && !Array.isArray(confidence) ? confidence : {},
  });
  return writeTestPrepProgress(next);
}

registerTestPrepPack(WORKPLACE_SAFETY_DEMO);
registerTestPrepPack(EPPP_PART_ONE_SCAFFOLD);

function TestPrepStatusBadge({ status }) {
  const styles = status === 'ready'
    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : status === 'planned'
      ? 'bg-violet-100 text-violet-900 border-violet-300'
      : 'bg-amber-100 text-amber-900 border-amber-300';
  const label = status === 'ready' ? 'Practice ready' : status === 'planned' ? 'Migration planned' : 'Researching';
  return <span className={'inline-flex rounded-full border px-2 py-1 text-xs font-bold ' + styles}>{label}</span>;
}

function TestPrepHub(props) {
  const { isOpen = true, onClose = (() => {}), callTTS, addToast } = props || {};
  const packs = listTestPrepPacks();
  const readyPack = packs.find((pack) => pack.status === 'ready') || packs[0];
  const [tab, setTab] = React.useState('explore');
  const [selectedPackId, setSelectedPackId] = React.useState(readyPack ? readyPack.id : '');
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedChoice, setSelectedChoice] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const [confidence, setConfidence] = React.useState({});
  const [result, setResult] = React.useState(null);
  const [progress, setProgress] = React.useState(readTestPrepProgress);
  const [largeText, setLargeText] = React.useState(false);
  const [legacyOpen, setLegacyOpen] = React.useState(false);
  const [legacyAudit, setLegacyAudit] = React.useState(null);
  const [legacyAuditStatus, setLegacyAuditStatus] = React.useState('idle');
  const [legacyInventory, setLegacyInventory] = React.useState(null);
  const [legacyInventoryStatus, setLegacyInventoryStatus] = React.useState('idle');
  const dialogRef = React.useRef(null);
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) || readyPack;
  const currentItem = selectedPack && selectedPack.items[questionIndex];

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const prior = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialogRef.current) dialogRef.current.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
      if (prior && typeof prior.focus === 'function') prior.focus();
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    let cancelled = false;
    const auditUrl = selectedPack && selectedPack.legacyAuditUrl;
    setLegacyAudit(null);
    if (!auditUrl || typeof fetch !== 'function') { setLegacyAuditStatus('idle'); return undefined; }
    setLegacyAuditStatus('loading');
    fetch(auditUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response || !response.ok) throw new Error('Audit report unavailable.');
        return response.json();
      })
      .then((report) => {
        if (cancelled || !report || report.schemaVersion !== 1 || !report.summary) return;
        setLegacyAudit(report);
        setLegacyAuditStatus('ready');
      })
      .catch(() => { if (!cancelled) setLegacyAuditStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [selectedPack && selectedPack.legacyAuditUrl]);

  React.useEffect(() => {
    let cancelled = false;
    const inventoryUrl = selectedPack && selectedPack.legacyInventoryUrl;
    setLegacyInventory(null);
    if (!inventoryUrl || typeof fetch !== 'function') { setLegacyInventoryStatus('idle'); return undefined; }
    setLegacyInventoryStatus('loading');
    fetch(inventoryUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response || !response.ok) throw new Error('Content inventory unavailable.');
        return response.json();
      })
      .then((report) => {
        if (cancelled || !report || report.schemaVersion !== 1 || !report.summary) return;
        setLegacyInventory(report);
        setLegacyInventoryStatus('ready');
      })
      .catch(() => { if (!cancelled) setLegacyInventoryStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [selectedPack && selectedPack.legacyInventoryUrl]);

  if (!isOpen) return null;

  function announce(message, type) {
    try { if (typeof addToast === 'function') addToast(message, type || 'info'); } catch (_) {}
  }

  function openPack(pack, nextTab) {
    setSelectedPackId(pack.id);
    setQuestionIndex(0);
    setSelectedChoice(null);
    setChecked(false);
    setAnswers({});
    setConfidence({});
    setResult(null);
    setLegacyOpen(false);
    setTab(nextTab || 'practice');
  }

  function readQuestion() {
    if (!currentItem) return;
    const text = currentItem.prompt + '. ' + currentItem.choices.map((choice, index) => String.fromCharCode(65 + index) + ', ' + choice).join('. ');
    try {
      if (typeof callTTS === 'function') { callTTS(text); return; }
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(text));
        return;
      }
    } catch (_) {}
    announce('Read-aloud is unavailable in this environment.', 'info');
  }

  function checkAnswer() {
    if (!currentItem || selectedChoice == null) return;
    setAnswers((previous) => Object.assign({}, previous, { [currentItem.id]: selectedChoice }));
    setChecked(true);
  }

  function advance() {
    if (!currentItem || !checked) return;
    const finalAnswers = Object.assign({}, answers, { [currentItem.id]: selectedChoice });
    if (questionIndex >= selectedPack.items.length - 1) {
      const score = scoreTestPrepAttempt(selectedPack, finalAnswers);
      const nextProgress = recordTestPrepAttempt(progress, selectedPack, finalAnswers, confidence, Date.now());
      setProgress(nextProgress);
      setResult(score);
      announce('Practice set complete. This result is for learning, not an official score.', 'success');
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedChoice(null);
    setChecked(false);
  }

  function setItemConfidence(value) {
    if (!currentItem) return;
    setConfidence((previous) => Object.assign({}, previous, { [currentItem.id]: value }));
  }

  const totalAttempts = progress.attempts.length;
  const latestAttempt = totalAttempts ? progress.attempts[totalAttempts - 1] : null;

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="test-prep-title" className={'allo-docsuite flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-4 ring-indigo-300 ' + (largeText ? 'text-lg' : '')}>
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{'\uD83E\uDDED'}</span>
              <div>
                <h2 id="test-prep-title" className="text-xl font-black sm:text-2xl">Test Prep Hub</h2>
                <p className="text-sm text-indigo-100">Accessible practice, transparent evidence, no pretend official scores.</p>
              </div>
            </div>
          </div>
          <button type="button" aria-pressed={largeText} onClick={() => setLargeText((value) => !value)} className="rounded-lg border border-indigo-200 bg-indigo-800 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-white">
            {largeText ? 'Standard text' : 'Larger text'}
          </button>
          <button type="button" onClick={onClose} aria-label="Close Test Prep Hub" className="rounded-lg border border-indigo-200 bg-indigo-800 px-3 py-2 text-lg font-black text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-white">{'\u2715'}</button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 pt-2" role="tablist" aria-label="Test Prep Hub sections">
          {[
            ['explore', 'Explore packs'],
            ['practice', 'Practice'],
            ['progress', 'Progress'],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={'whitespace-nowrap rounded-t-lg border-x border-t px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 ' + (tab === id ? 'border-indigo-300 bg-white text-indigo-900' : 'border-transparent text-slate-700 hover:bg-slate-100')}>
              {label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {tab === 'explore' && (
            <div className="mx-auto max-w-5xl space-y-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Exam packs</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-700">A pack supplies the blueprint, domains, timing, original questions, rationales, references, and scoring rules. The hub supplies the accessible study experience.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {packs.map((pack) => (
                  <article key={pack.id} className="flex flex-col rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Schema v{pack.schemaVersion} {'\u00B7'} pack v{pack.version}</p>
                        <h4 className="mt-1 text-lg font-black text-slate-900">{pack.title}</h4>
                      </div>
                      <TestPrepStatusBadge status={pack.status} />
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{pack.description}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-slate-100 p-2"><dt className="font-bold text-slate-700">Domains</dt><dd className="text-slate-900">{pack.domains.length}</dd></div>
                      <div className="rounded-lg bg-slate-100 p-2"><dt className="font-bold text-slate-700">Practice items</dt><dd className="text-slate-900">{pack.items.length}</dd></div>
                    </dl>
                    <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-950">{pack.disclaimer}</p>
                    <button type="button" onClick={() => openPack(pack, 'practice')} className="mt-4 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">
                      {pack.status === 'ready' ? 'Open practice pack' : 'View migration plan'}
                    </button>
                  </article>
                ))}
              </div>

              <section aria-labelledby="research-lanes-title">
                <h3 id="research-lanes-title" className="text-xl font-black text-slate-900">Vocational research lanes</h3>
                <p className="mt-1 text-sm text-slate-700">These are discovery lanes, not announced products. Each needs a public blueprint, clean content rights, and qualified reviewers.</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {TEST_PREP_RESEARCH_LANES.map((lane) => (
                    <article key={lane.id} className="rounded-2xl border border-slate-300 bg-white p-4">
                      <span className="text-3xl" aria-hidden="true">{lane.icon}</span>
                      <h4 className="mt-2 font-black text-slate-900">{lane.title}</h4>
                      <p className="mt-1 text-sm font-semibold text-indigo-800">{lane.examples}</p>
                      <p className="mt-3 text-sm text-slate-700">{lane.opportunity}</p>
                      <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs leading-relaxed text-rose-950"><strong>Guardrail:</strong> {lane.guardrail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'practice' && selectedPack && (
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Selected pack</p>
                  <h3 className="text-xl font-black text-slate-900">{selectedPack.title}</h3>
                </div>
                <button type="button" onClick={() => { setLegacyOpen(false); setTab('explore'); }} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">Change pack</button>
              </div>

              {selectedPack.contentReview && (
                <section className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-3 py-3 text-violet-950" aria-labelledby="content-review-title">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p id="content-review-title" className="text-sm font-bold">Review status: {selectedPack.contentReview}</p>
                    {selectedPack.nativeQaUrl && <a href={selectedPack.nativeQaUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open native QA report</a>}
                  </div>
                  {selectedPack.legacyUrl && (
                    <div className="mt-3 grid gap-2 border-t border-violet-200 pt-3 text-xs leading-relaxed sm:grid-cols-3">
                      <p><strong>Legacy source item</strong><br />A topic lead from the old app. Its original wording and key are not automatically accepted.</p>
                      <p><strong>QA passed</strong><br />The native item has cited answer support, one best answer, reviewed distractors, clue checks, a rationale, and traceable provenance.</p>
                      <p><strong>Expert validated</strong><br />A separate future review by an independent qualified psychology and assessment professional. QA does not claim this yet.</p>
                    </div>
                  )}
                </section>
              )}

              {selectedPack.legacyUrl && (
                <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3" aria-labelledby="legacy-audit-title">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-3xl text-sm text-amber-950"><strong>Complete legacy workspace:</strong> includes the existing lessons, quizzes, flashcards, games, and practice tools. Its item bank and score/adaptive heuristics still await expert validation.</p>
                    <button type="button" onClick={() => setLegacyOpen((value) => !value)} className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-black text-white hover:bg-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{legacyOpen ? 'Return to native pilot' : 'Open complete legacy workspace'}</button>
                  </div>
                  <div className="mt-3 border-t border-amber-300 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 id="legacy-audit-title" className="font-black text-amber-950">Legacy-bank migration audit</h4>
                      {selectedPack.legacyAuditUrl && <a href={selectedPack.legacyAuditUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open full audit report</a>}
                    </div>
                    {legacyAudit && legacyAudit.summary ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyAudit.summary.totalItems || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">learner-visible questions</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyAudit.summary.referenceCoveragePercent || 0)}%</p><p className="text-xs font-bold text-slate-700">with attached references</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyAudit.summary.duplicateGroups || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">duplicate prompt groups</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{legacyAudit.summary.dominantAnswerIndex == null ? '—' : String.fromCharCode(65 + Number(legacyAudit.summary.dominantAnswerIndex)) + ' · ' + Number(legacyAudit.summary.dominantAnswerPercent || 0) + '%'}</p><p className="text-xs font-bold text-slate-700">dominant answer position</p></div>
                        <p className="sm:col-span-2 lg:col-span-4 text-xs leading-relaxed text-amber-950"><strong>Automated triage:</strong> {Number(legacyAudit.summary.blocker || 0)} structural blockers, {Number(legacyAudit.summary.high || 0).toLocaleString()} high-priority reviews, {Number(legacyAudit.summary.medium || 0).toLocaleString()} medium-priority reviews, and {Number(legacyAudit.summary.routine || 0).toLocaleString()} routine reviews. Flags identify review work; they do not establish that an answer is factually wrong.</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-900" aria-live="polite">{legacyAuditStatus === 'loading' ? 'Loading the latest audit snapshot…' : legacyAuditStatus === 'unavailable' ? 'The audit snapshot is unavailable in this preview; the legacy review warning still applies.' : 'Audit snapshot will appear when the report is available.'}</p>
                    )}
                  </div>
                  <div className="mt-3 border-t border-amber-300 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-black text-amber-950">Legacy learning-library inventory</h4>
                      <div className="flex flex-wrap gap-3">{selectedPack.legacyInventoryUrl && <a href={selectedPack.legacyInventoryUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open content inventory</a>}{selectedPack.legacyReviewLedgerUrl && <a href={selectedPack.legacyReviewLedgerUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open full review ledger</a>}{selectedPack.curation500Url && <a href={selectedPack.curation500Url.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open 500-question curation plan</a>}</div>
                    </div>
                    {legacyInventory && legacyInventory.summary ? (
                      <div className="mt-3" aria-live="polite">
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.textbookChapters || 0)}</p><p className="text-xs font-bold text-slate-700">chapters</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.diagramTemplates || 0)}</p><p className="text-xs font-bold text-slate-700">diagram templates</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.flashcards || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">flashcards</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.memoryAids || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">memory aids</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.termDefinitions || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">term definitions</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.knowledgeChecks || 0)}</p><p className="text-xs font-bold text-slate-700">knowledge checks</p></div>
                        </div>
                        <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-800">
                          <div className="flex items-center justify-between gap-2"><strong>Full-bank deep-QA program</strong><span>{Number(legacyInventory.summary.legacyReviewPassedQuestions || 0).toLocaleString()} / {Number(legacyInventory.summary.nativeTargetQuestions || 2933).toLocaleString()} legacy items</span></div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full bg-violet-700" style={{ width: Math.min(100, Math.round(Number(legacyInventory.summary.legacyReviewPassedQuestions || 0) / Math.max(1, Number(legacyInventory.summary.nativeTargetQuestions || 2933)) * 1000) / 10) + '%' }} /></div>
                          <p className="mt-2">{Number(legacyInventory.summary.legacyReviewPassedQuestions || 0).toLocaleString()} legacy-source items have passed native content QA so far; {Number(legacyInventory.summary.nativeOriginalQaQuestions || 0).toLocaleString()} additional questions were authored natively. All 2,933 legacy questions are in the review universe, not automatically approved. Items enter the native bank only after source, accuracy, ambiguity, distractor, clue, duplication, cultural/accessibility, rationale, and provenance review; production validation remains a separate independent-expert step. Practice sets should follow blueprint weights rather than the uneven legacy distribution.</p>
                        </div>
                      </div>
                    ) : <p className="mt-2 text-xs text-amber-900" aria-live="polite">{legacyInventoryStatus === 'loading' ? 'Loading the learning-library inventory…' : 'The inventory report is unavailable in this preview.'}</p>}
                  </div>
                </section>
              )}

              {legacyOpen && selectedPack.legacyUrl && (
                <section className="overflow-hidden rounded-2xl border border-violet-300 bg-white shadow-sm">
                  <h4 className="sr-only">Pass the EPPP legacy workspace</h4>
                  <iframe title="Pass the EPPP legacy workspace" src={selectedPack.legacyUrl} className="h-[68vh] min-h-[560px] w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads" />
                </section>
              )}

              {!legacyOpen && !selectedPack.items.length && (
                <section className="rounded-2xl border border-violet-300 bg-white p-6 shadow-sm">
                  <TestPrepStatusBadge status={selectedPack.status} />
                  <h4 className="mt-4 text-lg font-black text-slate-900">Content migration has not started</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">The pack blueprint is present, but the existing question bank will not be imported until every item can carry provenance, review status, stable identifiers, and clue-quality checks.</p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-800">
                    <li>Inventory and deduplicate source questions.</li>
                    <li>Separate official blueprint metadata from independently authored content.</li>
                    <li>Run answer-length, ambiguity, citation, and outdated-guidance checks.</li>
                    <li>Require qualified human review before a pack is marked ready.</li>
                  </ol>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {selectedPack.domains.map((domain) => <div key={domain.id} className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950">{domain.label} {domain.weight ? '(' + Math.round(domain.weight * 100) + '%)' : ''}</div>)}
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && result && (
                <section className="rounded-2xl border border-emerald-300 bg-white p-6 text-center shadow-sm" aria-live="polite">
                  <p className="text-sm font-black uppercase tracking-wider text-emerald-800">Practice complete</p>
                  <p className="mt-2 text-5xl font-black text-slate-900">{result.correct}/{result.total}</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{result.percent}% correct in this practice set</p>
                  <p className="mx-auto mt-3 max-w-xl rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This is a learning result, not an official score, pass prediction, certification, or evidence of workplace competence.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={() => openPack(selectedPack, 'practice')} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Practice again</button>
                    <button type="button" onClick={() => setTab('progress')} className="rounded-xl border border-slate-400 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">View progress</button>
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && !result && currentItem && (
                <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-indigo-800">Question {questionIndex + 1} of {selectedPack.items.length}</p>
                    <button type="button" onClick={readQuestion} className="rounded-lg border border-indigo-400 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">{'\uD83D\uDD0A'} Read question</button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full bg-indigo-700" style={{ width: Math.round((questionIndex + 1) / selectedPack.items.length * 100) + '%' }} /></div>
                  <fieldset className="mt-6" disabled={checked}>
                    <legend className="text-lg font-black leading-relaxed text-slate-900">{currentItem.prompt}</legend>
                    <div className="mt-4 space-y-3">
                      {currentItem.choices.map((choice, index) => {
                        const inputId = 'test-prep-choice-' + currentItem.id + '-' + index;
                        const correctChoice = checked && index === currentItem.answerIndex;
                        const incorrectChoice = checked && index === selectedChoice && index !== currentItem.answerIndex;
                        return (
                          <label key={inputId} htmlFor={inputId} className={'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-sm font-semibold focus-within:ring-2 focus-within:ring-indigo-600 ' + (correctChoice ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : incorrectChoice ? 'border-rose-600 bg-rose-50 text-rose-950' : selectedChoice === index ? 'border-indigo-600 bg-indigo-50 text-indigo-950' : 'border-slate-300 bg-white text-slate-900 hover:border-indigo-400')}>
                            <input id={inputId} type="radio" name={'answer-' + currentItem.id} checked={selectedChoice === index} onChange={() => setSelectedChoice(index)} className="mt-0.5 h-4 w-4 accent-indigo-700" />
                            <span><span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{choice}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {checked && (
                    <div className={'mt-5 rounded-xl border p-4 ' + (selectedChoice === currentItem.answerIndex ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50')} role="status" aria-live="polite">
                      <p className="font-black text-slate-900">{selectedChoice === currentItem.answerIndex ? 'Correct' : 'Not yet - review the reasoning'}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-800">{currentItem.rationale}</p>
                      {!!currentItem.references.length && (
                        <div className="mt-3 rounded-lg border border-slate-300 bg-white/70 p-3 text-xs text-slate-700">
                          <p className="font-black uppercase tracking-wide text-slate-800">Answer sources</p>
                          <ul className="mt-1 space-y-1">
                            {currentItem.references.map((reference, index) => <li key={reference}><a href={reference} target="_blank" rel="noreferrer" className="break-all font-semibold text-indigo-800 underline">Source {index + 1}</a></li>)}
                          </ul>
                          <p className="mt-2"><strong>{currentItem.qaStatus === 'qa-passed' ? 'Content QA passed.' : 'Review required.'}</strong> QA covers source support, one-best-answer structure, distractors, clue resistance, rationale, and provenance. It is not psychometric calibration or independent expert validation.</p>
                        </div>
                      )}
                      {currentItem.legacySourceId && (
                        <p className="mt-3 rounded-lg border border-violet-300 bg-violet-50 p-3 text-xs text-violet-950"><strong>Migration provenance:</strong> this native question was re-authored and QA-checked using legacy source item <code>{currentItem.legacySourceId}</code> in <code>{currentItem.legacySourceFile}</code>. The original wording was not promoted automatically.</p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">How certain were you?</span>
                        {['sure', 'unsure', 'guess'].map((value) => (
                          <button key={value} type="button" aria-pressed={confidence[currentItem.id] === value} onClick={() => setItemConfidence(value)} className={'rounded-full border px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 ' + (confidence[currentItem.id] === value ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100')}>{value === 'sure' ? 'I knew it' : value === 'unsure' ? 'I was unsure' : 'I guessed'}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    {!checked ? (
                      <button type="button" disabled={selectedChoice == null} onClick={checkAnswer} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Check answer</button>
                    ) : (
                      <button type="button" onClick={advance} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{questionIndex >= selectedPack.items.length - 1 ? 'Finish practice' : 'Next question'}</button>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'progress' && (
            <div className="mx-auto max-w-4xl space-y-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">Practice progress</h3>
                <p className="mt-1 text-sm text-slate-700">Stored only in this browser for now. Results describe practice activity, not credential readiness.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{totalAttempts}</p><p className="text-sm font-bold text-slate-700">Completed sets</p></div>
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{latestAttempt ? latestAttempt.percent + '%' : '\u2014'}</p><p className="text-sm font-bold text-slate-700">Most recent practice</p></div>
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{packs.filter((pack) => pack.status === 'ready').length}</p><p className="text-sm font-bold text-slate-700">Ready packs</p></div>
              </div>
              {!totalAttempts ? (
                <div className="rounded-2xl border border-dashed border-slate-400 bg-white p-8 text-center">
                  <p className="font-black text-slate-900">No practice history yet</p>
                  <p className="mt-2 text-sm text-slate-700">Complete the demonstration pack to see how progress will work.</p>
                  <button type="button" onClick={() => readyPack && openPack(readyPack, 'practice')} className="mt-4 rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Start the demo</button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <h4 className="border-b border-slate-200 px-5 py-3 font-black text-slate-900">Recent practice</h4>
                  <ul className="divide-y divide-slate-200">
                    {progress.attempts.slice().reverse().slice(0, 10).map((attempt) => {
                      const pack = packs.find((candidate) => candidate.id === attempt.packId);
                      return <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-bold text-slate-900">{pack ? pack.shortTitle : attempt.packId}</p><p className="text-xs text-slate-600">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'Date unavailable'}</p></div><p className="font-black text-indigo-900">{attempt.correct}/{attempt.total} {'\u00B7'} {attempt.percent}%</p></li>;
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

