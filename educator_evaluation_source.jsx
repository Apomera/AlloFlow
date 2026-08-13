/**
 * AlloFlow Educator Growth & Evaluation — Pennsylvania Act 13 workflow MVP.
 *
 * One React surface is used by the Leadership Hub modal, the standalone
 * principal-facing shell, and the authenticated district portal. Without an
 * injected repository it stores only on the current device and remains a
 * workflow prototype, not a personnel-record system or PDE-approved form.
 *
 * The component names below follow Pennsylvania's June 2021 classroom-teacher
 * framework. Full Danielson rubric descriptors are intentionally not embedded;
 * they require separate licensing/permission for use in a digital product.
 */

const AE_STORAGE_KEY = 'allo_educator_evaluation_workspace_v1';
const AE_EXPORT_KIND = 'alloflow-educator-evaluation-workspace';
const AE_FRAMEWORK = 'pa-act13-classroom-2021';

const AE_DOMAINS = [
  {
    id: 'd1', code: '1', label: 'Planning and Preparation', weight: 20, color: '#2563eb',
    components: [
      ['1A', 'Knowledge of Content and Pedagogy'],
      ['1B', 'Demonstrating Knowledge of Students'],
      ['1C', 'Setting Instructional Outcomes'],
      ['1D', 'Demonstrating Knowledge of Resources'],
      ['1E', 'Designing Coherent Instruction'],
      ['1F', 'Designing Student Assessment'],
    ],
  },
  {
    id: 'd2', code: '2', label: 'Classroom Environment', weight: 30, color: '#0f766e',
    components: [
      ['2A', 'Creating an Environment of Respect and Rapport'],
      ['2B', 'Establishing a Culture for Learning'],
      ['2C', 'Managing Classroom Procedures'],
      ['2D', 'Managing Student Behavior Expectations'],
      ['2E', 'Organizing Physical and Digital Space'],
    ],
  },
  {
    id: 'd3', code: '3', label: 'Instruction', weight: 30, color: '#7c3aed',
    components: [
      ['3A', 'Communicating with Students'],
      ['3B', 'Questioning and Discussion Techniques'],
      ['3C', 'Engaging Students in Learning Activities and Assignments'],
      ['3D', 'Using Assessment in Instruction'],
      ['3E', 'Demonstrating Flexibility and Responsiveness'],
    ],
  },
  {
    id: 'd4', code: '4', label: 'Professional Responsibilities', weight: 20, color: '#b45309',
    components: [
      ['4A', 'Reflecting on Teaching'],
      ['4B', 'Maintaining Accurate Records'],
      ['4C', 'Communicating with Families'],
      ['4D', 'Participating in a Professional Community'],
      ['4E', 'Growing and Developing Professionally'],
      ['4F', 'Showing Professionalism'],
    ],
  },
];

const AE_COMPONENTS = AE_DOMAINS.flatMap((domain) => domain.components.map(([code, label]) => ({
  code, label, domainId: domain.id, domainLabel: domain.label,
})));

const AE_RATINGS = [
  { value: 0, label: 'Failing' },
  { value: 1, label: 'Needs Improvement' },
  { value: 2, label: 'Proficient' },
  { value: 3, label: 'Distinguished' },
];

function aeRatingLabel(value) {
  const rating = AE_RATINGS.find((item) => item.value === value);
  return rating ? rating.label : 'Unrecognized rating value';
}

const AE_STATUS_META = {
  finalized: { label: 'Finalized', tone: 'good' },
  awaiting_teacher: { label: 'Awaiting teacher', tone: 'purple' },
  awaiting_evaluator: { label: 'Awaiting evaluator', tone: 'blue' },
  in_progress: { label: 'In progress', tone: 'amber' },
  overdue: { label: 'Overdue', tone: 'bad' },
  not_started: { label: 'Not started', tone: 'neutral' },
};

function aeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function aeNow() { return new Date().toISOString(); }

function aeToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function aeSchoolYear() {
  const d = new Date();
  const start = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return start + '–' + String(start + 1).slice(-2);
}

function aeDateTime(value) {
  if (!value) return 'Not yet';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function aeDate(value) {
  if (!value) return 'Not set';
  const d = new Date(value + (String(value).length === 10 ? 'T12:00:00' : ''));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString([], { dateStyle: 'medium' });
}

function aeLoad() {
  try {
    const raw = localStorage.getItem(AE_STORAGE_KEY);
    if (!raw) return null;
    return aeNormalizeWorkspace(JSON.parse(raw));
  } catch (_) { return null; }
}

function aeStore(workspace) {
  try { localStorage.setItem(AE_STORAGE_KEY, JSON.stringify(workspace)); return true; }
  catch (_) { return false; }
}

function aeClone(value) { return JSON.parse(JSON.stringify(value)); }

function aePlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function aeString(value, maxLength, fallback) {
  const limit = Number(maxLength) > 0 ? Number(maxLength) : 10000;
  return typeof value === 'string' ? value.slice(0, limit) : (fallback == null ? '' : String(fallback).slice(0, limit));
}

function aeSafeId(value, fallback) {
  const clean = aeString(value, 100, '').replace(/[^a-zA-Z0-9._:-]/g, '');
  return clean || fallback;
}

function aeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : !!fallback;
}

function aeDateValue(value) {
  const text = aeString(value, 10, '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(new Date(text + 'T12:00:00').getTime()) ? text : '';
}

function aeTimestamp(value) {
  const text = aeString(value, 40, '');
  return text && !Number.isNaN(new Date(text).getTime()) ? new Date(text).toISOString() : null;
}

function aeRatingValue(value) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 3 ? number : null;
}

function aeDomainRatings(value) {
  const source = aePlainObject(value) ? value : {};
  return { d1: aeRatingValue(source.d1), d2: aeRatingValue(source.d2), d3: aeRatingValue(source.d3), d4: aeRatingValue(source.d4) };
}

function aeComponentTags(value) {
  const allowed = new Set(AE_COMPONENTS.map((component) => component.code));
  return Array.isArray(value) ? Array.from(new Set(value.map((item) => aeString(item, 3, '')).filter((item) => allowed.has(item)))).slice(0, 22) : [];
}

function aeSafeWeightSnapshot(value) {
  if (!Array.isArray(value)) return null;
  const meta = {
    observation: { label: 'Observation & Practice', short: 'O&P', color: '#1d4ed8' },
    building: { label: 'Building Level Data', short: 'BLD', color: '#0f766e' },
    teacher: { label: 'Teacher-Specific Data', short: 'TSD', color: '#7c3aed' },
    lea: { label: 'LEA Selected Measure / SPM', short: 'SPM', color: '#b45309' },
  };
  const seen = new Set();
  const parts = value.map((part) => {
    if (!aePlainObject(part) || !meta[part.id] || seen.has(part.id)) return null;
    const weight = Number(part.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return null;
    seen.add(part.id);
    return { id: part.id, label: meta[part.id].label, short: meta[part.id].short, weight, color: meta[part.id].color };
  }).filter(Boolean);
  return parts.length && Math.abs(parts.reduce((sum, part) => sum + part.weight, 0) - 100) < 0.001 ? parts : null;
}

function aeNormalizeWorkspace(value) {
  if (!aePlainObject(value)) return null;
  const rawConfig = aePlainObject(value.config) ? value.config : {};
  const config = {
    organization: aeString(rawConfig.organization, 160, 'Sample School'),
    building: aeString(rawConfig.building, 160, 'Main Building'),
    academicYear: aeString(rawConfig.academicYear, 20, aeSchoolYear()),
    evaluatorName: aeString(rawConfig.evaluatorName, 160, 'Principal'),
    evaluatorInitials: aeString(rawConfig.evaluatorInitials, 12, 'AP'),
    frameworkVersion: AE_FRAMEWORK,
    sampleMode: aeBoolean(rawConfig.sampleMode, false),
  };
  const usedTeacherIds = new Set();
  const teachers = (Array.isArray(value.teachers) ? value.teachers : []).filter(aePlainObject).slice(0, 1000).map((raw, index) => {
    let id = aeSafeId(raw.id, 'teacher-' + (index + 1));
    while (usedTeacherIds.has(id)) id += '-' + (index + 1);
    usedTeacherIds.add(id);
    const ratings = aePlainObject(raw.ratings) ? raw.ratings : {};
    const status = aeString(raw.cycleStatus, 30, 'not_started');
    return {
      id,
      code: aeString(raw.code, 40, 'T-' + String(index + 1).padStart(2, '0')),
      name: aeString(raw.name, 160, 'Teacher ' + String(index + 1).padStart(2, '0')),
      building: aeString(raw.building, 160, config.building),
      assignment: aeString(raw.assignment, 240, ''),
      employeeType: raw.employeeType === 'temporary' ? 'temporary' : 'professional',
      buildingData: aeBoolean(raw.buildingData, true),
      teacherSpecificData: aeBoolean(raw.teacherSpecificData, true),
      active: aeBoolean(raw.active, true),
      evaluator: aeString(raw.evaluator, 160, config.evaluatorName),
      dueDate: aeDateValue(raw.dueDate),
      cycleStatus: AE_STATUS_META[status] ? status : 'not_started',
      lastActivityAt: aeTimestamp(raw.lastActivityAt),
      finalizedAt: aeTimestamp(raw.finalizedAt),
      cycleLockedAt: aeTimestamp(raw.cycleLockedAt),
      frameworkVersion: aeString(raw.frameworkVersion, 80, AE_FRAMEWORK),
      weightSnapshot: aeSafeWeightSnapshot(raw.weightSnapshot),
      finalScore: aeRatingValue(raw.finalScore),
      ratings: {
        domains: aeDomainRatings(ratings.domains),
        building: aeRatingValue(ratings.building),
        teacher: aeRatingValue(ratings.teacher),
        lea: aeRatingValue(ratings.lea),
      },
    };
  });
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));
  const teacherRef = (value) => teacherIds.has(aeString(value, 100, '')) ? aeString(value, 100, '') : '';
  const records = (value, max) => (Array.isArray(value) ? value : []).filter(aePlainObject).slice(0, max);

  const walkthroughs = records(value.walkthroughs, 5000).map((raw, index) => ({
    id: aeSafeId(raw.id, 'walk-' + (index + 1)),
    teacherId: teacherRef(raw.teacherId),
    createdAt: aeTimestamp(raw.createdAt) || aeNow(),
    updatedAt: aeTimestamp(raw.updatedAt),
    date: aeDateValue(raw.date) || aeToday(),
    startedAt: aeTimestamp(raw.startedAt) || aeTimestamp(raw.createdAt) || aeNow(),
    durationMin: String(Math.min(180, Math.max(1, Number.parseInt(raw.durationMin, 10) || 8))),
    announced: raw.announced === 'announced' ? 'announced' : 'unannounced',
    lessonPhase: ['opening', 'middle', 'guided_practice', 'independent_practice', 'closure'].includes(raw.lessonPhase) ? raw.lessonPhase : 'middle',
    subject: aeString(raw.subject, 240, ''),
    evidence: aeString(raw.evidence, 30000, ''),
    interpretation: aeString(raw.interpretation, 15000, ''),
    componentTags: aeComponentTags(raw.componentTags),
    privacyChecked: aeBoolean(raw.privacyChecked, false),
    observer: aeString(raw.observer, 160, config.evaluatorName),
    publishedAt: aeTimestamp(raw.publishedAt),
    teacherAcknowledgedAt: aeTimestamp(raw.teacherAcknowledgedAt),
    version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
  }));

  const observations = records(value.observations, 5000).map((raw, index) => {
    const prework = aePlainObject(raw.prework) ? raw.prework : {};
    const rationales = aePlainObject(raw.rationales) ? raw.rationales : {};
    const item = {
      id: aeSafeId(raw.id, 'formal-' + (index + 1)), teacherId: teacherRef(raw.teacherId),
      createdAt: aeTimestamp(raw.createdAt) || aeNow(), updatedAt: aeTimestamp(raw.updatedAt),
      frameworkVersion: aeString(raw.frameworkVersion, 80, AE_FRAMEWORK),
      version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
      prework: {
        plan: aeString(prework.plan, 30000, ''), outcomes: aeString(prework.outcomes, 20000, ''),
        resources: aeString(prework.resources, 20000, ''), assessment: aeString(prework.assessment, 20000, ''),
        artifactReferences: aeString(prework.artifactReferences, 10000, ''),
      },
      preConferenceNotes: aeString(raw.preConferenceNotes, 20000, ''), observedLocal: aeString(raw.observedLocal, 30, ''),
      evidence: aeString(raw.evidence, 50000, ''), reflection: aeString(raw.reflection, 30000, ''),
      postConferenceNotes: aeString(raw.postConferenceNotes, 30000, ''), ratings: aeDomainRatings(raw.ratings),
      rationales: { d1: aeString(rationales.d1, 15000, ''), d2: aeString(rationales.d2, 15000, ''), d3: aeString(rationales.d3, 15000, ''), d4: aeString(rationales.d4, 15000, '') },
      componentTags: aeComponentTags(raw.componentTags), privacyChecked: aeBoolean(raw.privacyChecked, false), ackChecked: aeBoolean(raw.ackChecked, false),
    };
    ['preworkSubmittedAt', 'preConferenceAt', 'observedAt', 'evidencePublishedAt', 'reflectionSubmittedAt', 'postConferenceAt', 'evaluatorSignedAt', 'teacherAcknowledgedAt', 'finalizedAt'].forEach((field) => { item[field] = aeTimestamp(raw[field]); });
    return item;
  });

  const statuses = new Set(['draft', 'submitted', 'returned', 'approved', 'results_submitted', 'locked']);
  const spms = records(value.spms, 1000).map((raw, index) => {
    const item = {
      id: aeSafeId(raw.id, 'spm-' + (index + 1)), teacherId: teacherRef(raw.teacherId),
      createdAt: aeTimestamp(raw.createdAt) || aeNow(), updatedAt: aeTimestamp(raw.updatedAt),
      status: statuses.has(raw.status) ? raw.status : 'draft',
      version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
      context: aeString(raw.context, 20000, ''), baseline: aeString(raw.baseline, 20000, ''), goal: aeString(raw.goal, 20000, ''),
      measures: aeString(raw.measures, 20000, ''), actionPlan: aeString(raw.actionPlan, 20000, ''),
      returnReason: aeString(raw.returnReason, 10000, ''), pendingReturnReason: aeString(raw.pendingReturnReason, 10000, ''),
      results: aeString(raw.results, 30000, ''), reflection: aeString(raw.reflection, 30000, ''),
      rating: aeRatingValue(raw.rating), ratingRationale: aeString(raw.ratingRationale, 15000, ''),
      approvedBy: aeString(raw.approvedBy, 160, ''),
      revisions: records(raw.revisions, 20).map((revision) => ({
        version: Math.min(1000, Math.max(1, Number.parseInt(revision.version, 10) || 1)),
        submittedAt: aeTimestamp(revision.submittedAt), context: aeString(revision.context, 20000, ''),
        baseline: aeString(revision.baseline, 20000, ''), goal: aeString(revision.goal, 20000, ''),
        measures: aeString(revision.measures, 20000, ''), actionPlan: aeString(revision.actionPlan, 20000, ''),
      })),
    };
    ['submittedAt', 'firstOpenedAt', 'returnedAt', 'approvedAt', 'resultsSubmittedAt', 'lockedAt'].forEach((field) => { item[field] = aeTimestamp(raw[field]); });
    return item;
  });

  const comments = records(value.comments, 5000).map((raw, index) => ({
    id: aeSafeId(raw.id, 'comment-' + (index + 1)), teacherId: teacherRef(raw.teacherId),
    recordType: ['walkthrough', 'formal_observation', 'spm'].includes(raw.recordType) ? raw.recordType : 'formal_observation',
    recordId: aeSafeId(raw.recordId, ''), text: aeString(raw.text, 3000, ''),
    role: raw.role === 'Teacher' ? 'Teacher' : 'Evaluator',
    author: aeString(raw.author, 160, raw.role === 'Teacher' ? 'Teacher' : config.evaluatorName),
    at: aeTimestamp(raw.at) || aeNow(), version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
  }));

  const audit = records(value.audit, 5000).map((raw, index) => ({
    id: aeSafeId(raw.id, 'audit-' + (index + 1)),
    event: aeString(raw.event, 60, 'UPDATED').replace(/[^A-Z0-9_]/g, '') || 'UPDATED',
    summary: aeString(raw.summary, 500, 'Record updated'), actor: aeString(raw.actor, 160, 'Unknown actor'),
    role: raw.role === 'Teacher' ? 'Teacher' : 'Evaluator', at: aeTimestamp(raw.at) || aeNow(),
    entityType: aeString(raw.entityType, 80, 'workspace').replace(/[^a-zA-Z0-9_:-]/g, '') || 'workspace',
    entityId: aeSafeId(raw.entityId, ''), teacherId: teacherRef(raw.teacherId),
    version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
  }));

  const cycleSnapshots = records(value.cycleSnapshots, AE_MAX_CYCLE_SNAPSHOTS).map((raw, index) => ({
    id: aeSafeId(raw.id, 'cycle-' + (index + 1)),
    teacherId: teacherRef(raw.teacherId),
    staffCodeSnapshot: aeString(raw.staffCodeSnapshot, 40, ''),
    academicYear: aeString(raw.academicYear, 20, ''),
    buildingSnapshot: aeString(raw.buildingSnapshot, 160, ''),
    employeeTypeSnapshot: raw.employeeTypeSnapshot === 'temporary' ? 'temporary' : 'professional',
    finalizedAt: aeTimestamp(raw.finalizedAt),
    finalScore: aeRatingValue(raw.finalScore),
    domainRatings: aeDomainRatings(raw.domainRatings),
    weightSnapshot: aeSafeWeightSnapshot(raw.weightSnapshot),
    frameworkVersion: aeString(raw.frameworkVersion, 80, AE_FRAMEWORK),
  })).filter((snapshot) => snapshot.teacherId && snapshot.finalizedAt);

  return { kind: AE_EXPORT_KIND, version: 1, config, teachers, walkthroughs, observations, spms, comments, audit, cycleSnapshots };
}
function aeSampleWorkspace() {
  const now = Date.now();
  const day = 86400000;
  const mkTeacher = (n, status, extra) => Object.assign({
    id: 'sample-t' + n, code: 'T-' + String(n).padStart(2, '0'), name: 'Teacher ' + String(n).padStart(2, '0'),
    building: n > 6 ? 'North Campus' : 'Main Building', assignment: n % 3 === 0 ? 'Mathematics' : (n % 2 === 0 ? 'ELA' : 'Elementary'),
    employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true,
    evaluator: n > 5 ? 'J. Rivera' : 'A. Principal', dueDate: '2027-05-' + String(10 + n).padStart(2, '0'),
    cycleStatus: status, lastActivityAt: new Date(now - n * day).toISOString(),
    ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null },
  }, extra || {});
  const teachers = [
    mkTeacher(1, 'finalized', { finalizedAt: new Date(now - 28 * day).toISOString(), ratings: { domains: { d1: 2, d2: 3, d3: 2, d4: 2 }, building: 2.4, teacher: 2.3, lea: 2.5 } }),
    mkTeacher(2, 'finalized', { finalizedAt: new Date(now - 18 * day).toISOString(), ratings: { domains: { d1: 3, d2: 3, d3: 3, d4: 2 }, building: 2.6, teacher: 2.7, lea: 2.8 } }),
    mkTeacher(3, 'awaiting_teacher', { ratings: { domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2.2, teacher: 2.1, lea: null } }),
    mkTeacher(4, 'awaiting_evaluator'),
    mkTeacher(5, 'in_progress'),
    mkTeacher(6, 'overdue', { dueDate: '2026-08-01' }),
    mkTeacher(7, 'not_started', { employeeType: 'temporary', buildingData: false, teacherSpecificData: false }),
    mkTeacher(8, 'not_started', { buildingData: false }),
  ];
  const workspace = aeNormalizeWorkspace({
    config: { organization: 'Sample School District', building: 'Main Building', academicYear: '2026–27', evaluatorName: 'A. Principal', evaluatorInitials: 'AP', frameworkVersion: AE_FRAMEWORK, sampleMode: true },
    teachers, walkthroughs: [], observations: [], spms: [], comments: [],
    cycleSnapshots: [
      { id: 'sample-cycle-1a', teacherId: teachers[0].id, staffCodeSnapshot: teachers[0].code, academicYear: '2024–25', buildingSnapshot: teachers[0].building, employeeTypeSnapshot: 'professional', finalizedAt: new Date(now - 730 * day).toISOString(), finalScore: 2.08, domainRatings: { d1: 2, d2: 2, d3: 2, d4: 2 }, frameworkVersion: AE_FRAMEWORK },
      { id: 'sample-cycle-1b', teacherId: teachers[0].id, staffCodeSnapshot: teachers[0].code, academicYear: '2025–26', buildingSnapshot: teachers[0].building, employeeTypeSnapshot: 'professional', finalizedAt: new Date(now - 365 * day).toISOString(), finalScore: 2.22, domainRatings: { d1: 2, d2: 2, d3: 2.5, d4: 2 }, frameworkVersion: AE_FRAMEWORK },
    ],
    audit: [
      { id: 'sample-a1', teacherId: teachers[0].id, event: 'RELEASED', summary: 'Final evaluation released', actor: 'A. Principal', role: 'Evaluator', at: teachers[0].finalizedAt, entityType: 'evaluation', entityId: teachers[0].id, version: 1 },
      { id: 'sample-a2', teacherId: teachers[1].id, event: 'RELEASED', summary: 'Final evaluation released', actor: 'A. Principal', role: 'Evaluator', at: teachers[1].finalizedAt, entityType: 'evaluation', entityId: teachers[1].id, version: 1 },
    ],
  });
  return workspace;
}

function aeBlankWorkspace() {
  return aeNormalizeWorkspace({
    config: { organization: 'My School District', building: 'My School', academicYear: aeSchoolYear(), evaluatorName: 'Principal', evaluatorInitials: '', frameworkVersion: AE_FRAMEWORK, sampleMode: false },
    teachers: [], walkthroughs: [], observations: [], spms: [], comments: [], audit: [], cycleSnapshots: [],
  });
}

function aeWeightProfile(teacher) {
  const snapshot = teacher && aeSafeWeightSnapshot(teacher.weightSnapshot);
  if (snapshot) return snapshot;
  const temporary = teacher && teacher.employeeType === 'temporary';
  if (temporary) return [
    { id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: 100, color: '#1d4ed8' },
  ];
  const hasBuilding = !teacher || teacher.buildingData !== false;
  const hasTeacher = !teacher || teacher.teacherSpecificData !== false;
  const observation = hasBuilding ? 70 : 80;
  const lea = hasTeacher ? 10 : 20;
  return [
    { id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: observation, color: '#1d4ed8' },
    { id: 'building', label: 'Building Level Data', short: 'BLD', weight: hasBuilding ? 10 : 0, color: '#0f766e' },
    { id: 'teacher', label: 'Teacher-Specific Data', short: 'TSD', weight: hasTeacher ? 10 : 0, color: '#7c3aed' },
    { id: 'lea', label: 'LEA Selected Measure / SPM', short: 'SPM', weight: lea, color: '#b45309' },
  ].filter((item) => item.weight > 0);
}

function aeFreezeTeacherCycle(teacher) {
  if (!teacher || teacher.cycleLockedAt) return;
  teacher.weightSnapshot = aeWeightProfile(teacher).map((part) => ({
    id: part.id, label: part.label, short: part.short, weight: part.weight, color: part.color,
  }));
  teacher.frameworkVersion = AE_FRAMEWORK;
  teacher.cycleLockedAt = aeNow();
}

function aeNumberOrNull(value) {
  return aeRatingValue(value);
}
function aeObservationScore(ratings) {
  const domains = (ratings && ratings.domains) || {};
  if (AE_DOMAINS.some((domain) => aeNumberOrNull(domains[domain.id]) === null)) return null;
  const scaled = AE_DOMAINS.reduce((sum, domain) => sum + Math.round(aeNumberOrNull(domains[domain.id]) * domain.weight * 100), 0);
  return scaled / 10000;
}

function aeOverallScore(teacher) {
  if (!teacher) return null;
  const ratings = teacher.ratings || {};
  const observation = aeObservationScore(ratings);
  if (observation === null) return null;
  const factors = { observation, building: aeNumberOrNull(ratings.building), teacher: aeNumberOrNull(ratings.teacher), lea: aeNumberOrNull(ratings.lea) };
  const profile = aeWeightProfile(teacher);
  if (profile.some((part) => factors[part.id] === null)) return null;
  const scaled = profile.reduce((sum, part) => sum + Math.round(factors[part.id] * part.weight * 100), 0);
  return scaled / 10000;
}

function aeRoundedScore(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return null;
  const value = Number(score);
  if (value < 0 || value > 3) return null;
  const truncatedToThree = Math.trunc((value + Number.EPSILON) * 1000) / 1000;
  return Math.round((truncatedToThree + Number.EPSILON) * 100) / 100;
}
function aeBand(score) {
  const n = aeRoundedScore(score);
  if (n === null) return null;
  if (n >= 2.5) return 'Distinguished';
  if (n >= 1.5) return 'Proficient';
  if (n >= 0.5) return 'Needs Improvement';
  return 'Failing';
}

function aeTeacherStatus(teacher) {
  if (!teacher) return 'not_started';
  if (teacher.finalizedAt || teacher.cycleStatus === 'finalized') return 'finalized';
  if (teacher.dueDate && teacher.dueDate < aeToday()) return 'overdue';
  if (teacher.cycleStatus && AE_STATUS_META[teacher.cycleStatus]) return teacher.cycleStatus;
  return 'not_started';
}
function aeCompletionSummary(teachers) {
  const eligible = (Array.isArray(teachers) ? teachers : []).filter((teacher) => teacher && teacher.active !== false);
  const statuses = { finalized: 0, awaiting_teacher: 0, awaiting_evaluator: 0, in_progress: 0, overdue: 0, not_started: 0 };
  eligible.forEach((teacher) => { const key = aeTeacherStatus(teacher); statuses[key] = (statuses[key] || 0) + 1; });
  return { total: eligible.length, finalized: statuses.finalized, open: eligible.length - statuses.finalized, statuses };
}

function aeStepOfObservation(observation) {
  if (!observation) return 0;
  if (observation.finalizedAt) return 9;
  if (observation.teacherAcknowledgedAt) return 8;
  if (observation.evaluatorSignedAt) return 7;
  if (observation.postConferenceAt) return 6;
  if (observation.reflectionSubmittedAt) return 5;
  if (observation.evidencePublishedAt) return 4;
  if (observation.observedAt) return 3;
  if (observation.preConferenceAt) return 2;
  if (observation.preworkSubmittedAt) return 1;
  return 0;
}

function aeRecalculateCycleStatus(workspace, teacherId) {
  const teacher = workspace && workspace.teachers.find((item) => item.id === teacherId);
  if (!teacher || teacher.finalizedAt) return;
  const allObservations = workspace.observations.filter((item) => item.teacherId === teacherId);
  const observations = allObservations.filter((item) => !item.finalizedAt);
  const walkthroughs = workspace.walkthroughs.filter((item) => item.teacherId === teacherId);
  const allSpms = workspace.spms.filter((item) => item.teacherId === teacherId);
  const spms = allSpms.filter((item) => item.status !== 'locked');
  const evaluatorAction = observations.some((item) => [1, 2, 3, 5, 6, 8].includes(aeStepOfObservation(item)))
    || walkthroughs.some((item) => !item.publishedAt)
    || spms.some((item) => ['submitted', 'results_submitted'].includes(item.status));
  const teacherAction = observations.some((item) => [0, 4, 7].includes(aeStepOfObservation(item)))
    || walkthroughs.some((item) => item.publishedAt && !item.teacherAcknowledgedAt)
    || spms.some((item) => ['draft', 'returned', 'approved'].includes(item.status));
  const hasActivity = allObservations.length || walkthroughs.length || allSpms.length;
  teacher.cycleStatus = evaluatorAction ? 'awaiting_evaluator' : (teacherAction ? 'awaiting_teacher' : (hasActivity ? 'in_progress' : 'not_started'));
}
const AE_MIN_TREND_COHORT = 10;
const AE_MAX_CYCLE_SNAPSHOTS = 5000;

function aeMedian(values) {
  const sorted = (Array.isArray(values) ? values : []).map(aeRatingValue).filter((value) => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : aeRoundedScore((sorted[middle - 1] + sorted[middle]) / 2);
}

function aeTrendPointMetric(point, metric) {
  if (!point) return null;
  return aeRatingValue(metric === 'overall' ? point.overall : point[metric]);
}

function aeTeacherTrendPoints(workspace, teacherId, filters) {
  if (!workspace || !teacherId) return [];
  const options = filters || {};
  const from = aeDateValue(options.from);
  const to = aeDateValue(options.to);
  const sourceFilter = ['cycle_snapshot', 'formal_observation'].includes(options.source) ? options.source : '';
  const withinRange = (date) => !!date && (!from || date >= from) && (!to || date <= to);
  const points = [];
  (workspace.cycleSnapshots || []).filter((snapshot) => snapshot.teacherId === teacherId && snapshot.finalizedAt).forEach((snapshot) => {
    const domains = snapshot.domainRatings || {};
    const date = aeString(snapshot.finalizedAt, 10, '').slice(0, 10);
    points.push({
      teacherId, source: 'cycle_snapshot', recordId: snapshot.id, date,
      academicYear: snapshot.academicYear || '', overall: aeObservationScore({ domains }),
      d1: aeRatingValue(domains.d1), d2: aeRatingValue(domains.d2), d3: aeRatingValue(domains.d3), d4: aeRatingValue(domains.d4),
    });
  });
  (workspace.observations || []).filter((observation) => observation.teacherId === teacherId && observation.finalizedAt).forEach((observation) => {
    const domains = observation.ratings || {};
    const date = aeString(observation.observedAt || observation.finalizedAt, 10, '').slice(0, 10);
    const overall = aeObservationScore({ domains });
    if (overall === null) return;
    points.push({
      teacherId, source: 'formal_observation', recordId: observation.id, date,
      academicYear: workspace.config && workspace.config.academicYear || '',
      overall: overall === null ? null : aeRoundedScore(overall),
      d1: aeRatingValue(domains.d1), d2: aeRatingValue(domains.d2), d3: aeRatingValue(domains.d3), d4: aeRatingValue(domains.d4),
    });
  });
  return points.filter((point) => (!sourceFilter || point.source === sourceFilter) && withinRange(point.date) && ['overall', 'd1', 'd2', 'd3', 'd4'].some((metric) => point[metric] !== null)).sort((a, b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId));
}

function aeDistinctTeacherMedian(points, metric) {
  const byTeacher = {};
  (Array.isArray(points) ? points : []).forEach((point) => {
    const teacherId = aeString(point && point.teacherId, 100, '');
    const value = aeTrendPointMetric(point, metric);
    if (!teacherId || value === null) return;
    byTeacher[teacherId] = byTeacher[teacherId] || [];
    byTeacher[teacherId].push(value);
  });
  const means = Object.values(byTeacher).map((values) => aeRoundedScore(values.reduce((sum, value) => sum + value, 0) / values.length));
  return { value: aeMedian(means), contributorCount: means.length };
}

function aeCohortMetric(points, selectedTeacherId, metric, minimum) {
  const threshold = Math.max(1, Number.parseInt(minimum, 10) || AE_MIN_TREND_COHORT);
  const peers = (Array.isArray(points) ? points : []).filter((point) => point && point.teacherId !== selectedTeacherId);
  const result = aeDistinctTeacherMedian(peers, metric);
  if (result.contributorCount < threshold) return { suppressed: true, value: null, contributorCount: null, minimum: threshold };
  return { suppressed: false, value: result.value, contributorCount: result.contributorCount, minimum: threshold };
}

function aeWorkspaceCohortMetric(workspace, selectedTeacherId, metric, filters) {
  const selected = (workspace && workspace.teachers || []).find((teacher) => teacher.id === selectedTeacherId);
  const selectedValues = aeTeacherTrendPoints(workspace, selectedTeacherId, filters).map((point) => aeTrendPointMetric(point, metric)).filter((value) => value !== null);
  const selectedMean = selectedValues.length ? aeRoundedScore(selectedValues.reduce((sum, value) => sum + value, 0) / selectedValues.length) : null;
  if (!selected) return Object.assign(aeCohortMetric([], selectedTeacherId, metric, AE_MIN_TREND_COHORT), { selectedMean });
  const peerIds = new Set((workspace.teachers || []).filter((teacher) => (
    teacher.id !== selectedTeacherId && teacher.active !== false
    && teacher.building === selected.building && teacher.employeeType === selected.employeeType
  )).map((teacher) => teacher.id));
  const peerPoints = [];
  peerIds.forEach((teacherId) => peerPoints.push(...aeTeacherTrendPoints(workspace, teacherId, filters)));
  const result = aeCohortMetric(peerPoints, selectedTeacherId, metric, AE_MIN_TREND_COHORT);
  return Object.assign(result, { selectedMean, median: result.value, peerCount: result.contributorCount });
}
function aeEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function aeCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = (value) => {
    let s = String(value == null ? '' : value);
    if (/^[\t ]*[=+\-@]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.map(cell).join(','), ...rows.map((row) => headers.map((header) => cell(row[header])).join(','))].join('\r\n');
}
function aeDownload(name, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function aeAuditEvent(workspace, data, actor, role) {
  workspace.audit.unshift(Object.assign({
    id: aeId('audit'), event: 'UPDATED', summary: 'Record updated', actor, role,
    at: aeNow(), entityType: 'workspace', entityId: '', teacherId: '', version: 1,
  }, data || {}));
  workspace.audit = workspace.audit.slice(0, 5000);
}

const AE_STYLES = `
.ae-shell{--ae-navy:#10233f;--ae-blue:#1d4ed8;--ae-ink:#172033;--ae-muted:#5b667a;--ae-line:#d8deea;--ae-bg:#f4f7fb;--ae-white:#fff;color:var(--ae-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;line-height:1.45}
.ae-shell *{box-sizing:border-box}.ae-overlay{position:fixed;inset:0;z-index:270;background:rgba(7,18,38,.62);display:flex;align-items:center;justify-content:center;padding:12px}.ae-workspace{width:min(1480px,100%);height:min(94vh,980px);background:var(--ae-bg);border-radius:22px;box-shadow:0 30px 80px rgba(7,18,38,.35);overflow:hidden;display:flex;flex-direction:column}.ae-standalone{min-height:100vh;background:var(--ae-bg)}.ae-standalone .ae-workspace{width:100%;height:100vh;min-height:100vh;border-radius:0;box-shadow:none}
.ae-top{background:linear-gradient(120deg,#10233f,#173e70);color:#fff;padding:14px 20px;display:flex;gap:16px;align-items:center;justify-content:space-between}.ae-brand{display:flex;gap:12px;align-items:center;min-width:0}.ae-mark{width:42px;height:42px;border-radius:13px;background:#fff;color:#173e70;display:grid;place-items:center;font-size:22px;font-weight:900;flex:0 0 auto}.ae-brand h1{font-size:19px;line-height:1.2;margin:0}.ae-brand p{margin:2px 0 0;color:#d9e8ff;font-size:12px}.ae-top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.ae-role{display:flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);padding:3px;border-radius:11px}.ae-role button{border:0;background:transparent;color:#e7f0ff;padding:7px 10px;min-height:38px;border-radius:8px;font-weight:700}.ae-role button[aria-pressed=true]{background:#fff;color:#173e70}.ae-close{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:10px;min-width:44px;min-height:44px;font-size:20px}.ae-top button:focus-visible,.ae-shell button:focus-visible,.ae-shell input:focus-visible,.ae-shell select:focus-visible,.ae-shell textarea:focus-visible,.ae-shell a:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
.ae-local-banner{background:#fff7d6;border-bottom:1px solid #e3ca69;padding:8px 20px;font-size:12px;color:#60480a;display:flex;gap:8px;align-items:flex-start}.ae-local-banner strong{white-space:nowrap}.ae-sample{background:#ecfeff;border-bottom-color:#67e8f9;color:#164e63}.ae-remote-banner{background:#ecfdf5;border-bottom-color:#86efac;color:#14532d;align-items:center}.ae-remote-banner.ae-sync-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-remote-banner .ae-btn{min-height:32px;padding:4px 9px;margin-left:auto;font-size:11px}.ae-tabs{background:#fff;border-bottom:1px solid var(--ae-line);display:flex;gap:2px;padding:0 14px;overflow-x:auto}.ae-tab{border:0;background:transparent;color:#4b5870;padding:12px 13px;min-height:48px;white-space:nowrap;font-weight:750;border-bottom:3px solid transparent}.ae-tab[aria-selected=true]{color:#173e70;border-bottom-color:#2563eb;background:#f8fbff}.ae-main{padding:20px;overflow:auto;flex:1}.ae-page{max-width:1320px;margin:0 auto}.ae-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.ae-heading h2{font-size:22px;margin:0 0 4px}.ae-heading p{margin:0;color:var(--ae-muted);font-size:13px}.ae-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ae-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.ae-span-4{grid-column:span 4}.ae-span-5{grid-column:span 5}.ae-span-6{grid-column:span 6}.ae-span-7{grid-column:span 7}.ae-span-8{grid-column:span 8}.ae-span-12{grid-column:span 12}.ae-card{background:#fff;border:1px solid var(--ae-line);border-radius:16px;padding:16px;box-shadow:0 3px 12px rgba(19,41,75,.05)}.ae-card h3{font-size:16px;margin:0 0 5px}.ae-card h4{font-size:14px;margin:14px 0 6px}.ae-sub{color:var(--ae-muted);font-size:12px;margin:0}.ae-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;padding:10px 12px;border-radius:11px;font-size:12px}.ae-warn{background:#fff8e8;border-color:#f2cc72;color:#624409}.ae-danger{background:#fff1f2;border-color:#fda4af;color:#881337}.ae-ok{background:#ecfdf5;border-color:#86efac;color:#14532d}.ae-btn{border:1px solid #b8c2d2;background:#fff;color:#24324a;border-radius:10px;padding:8px 12px;min-height:44px;font-weight:750;cursor:pointer}.ae-btn:hover{background:#f4f7fb}.ae-btn-primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.ae-btn-primary:hover{background:#1e40af}.ae-btn-danger{background:#be123c;border-color:#be123c;color:#fff}.ae-btn-quiet{border-color:transparent;background:transparent}.ae-btn:disabled{opacity:.5;cursor:not-allowed}.ae-link{color:#1d4ed8;font-weight:700}.ae-field{display:block;margin-bottom:12px}.ae-field>span,.ae-legend-label{display:block;font-size:12px;font-weight:800;color:#38465e;margin-bottom:5px}.ae-input,.ae-select,.ae-textarea{width:100%;border:1px solid #aeb9ca;background:#fff;color:#172033;border-radius:10px;min-height:44px;padding:9px 10px;font:inherit}.ae-textarea{min-height:100px;resize:vertical}.ae-help{font-size:11px;color:#69758a;margin-top:4px}.ae-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.ae-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:8px 0}.ae-check input{width:20px;height:20px;flex:0 0 auto;margin-top:1px}.ae-chips{display:flex;gap:6px;flex-wrap:wrap}.ae-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;border:1px solid #c7d0de;background:#f6f8fb}.ae-chip-good{background:#dcfce7;border-color:#86efac;color:#166534}.ae-chip-bad{background:#ffe4e6;border-color:#fda4af;color:#9f1239}.ae-chip-amber{background:#fef3c7;border-color:#facc15;color:#713f12}.ae-chip-blue{background:#dbeafe;border-color:#93c5fd;color:#1e3a8a}.ae-chip-purple{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}.ae-chip-neutral{background:#f1f5f9;color:#475569}.ae-stat{border-left:4px solid #2563eb;padding:6px 10px}.ae-stat strong{display:block;font-size:20px}.ae-stat span{font-size:11px;color:var(--ae-muted)}
.ae-donut-wrap{display:flex;gap:18px;align-items:center;margin-top:12px}.ae-donut{width:178px;height:178px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;position:relative}.ae-donut:after{content:"";width:108px;height:108px;border-radius:50%;background:#fff;position:absolute;box-shadow:inset 0 0 0 1px #e2e8f0}.ae-donut-center{position:relative;z-index:1;text-align:center;line-height:1.15}.ae-donut-center strong{font-size:24px;display:block}.ae-donut-center span{font-size:11px;color:var(--ae-muted);display:block;max-width:86px}.ae-legend{display:grid;gap:7px;min-width:0}.ae-legend-row{display:grid;grid-template-columns:12px 1fr auto;gap:7px;align-items:center;font-size:12px}.ae-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.15)}
.ae-table-wrap{width:100%;overflow:auto;border:1px solid var(--ae-line);border-radius:12px}.ae-table{border-collapse:collapse;width:100%;font-size:12px;background:#fff}.ae-table th,.ae-table td{padding:10px 11px;text-align:left;border-bottom:1px solid #e4e9f1;vertical-align:top}.ae-table th{background:#f2f5f9;color:#36445b;font-weight:850;white-space:nowrap}.ae-table tr:last-child td{border-bottom:0}.ae-table tbody tr:hover{background:#f8fbff}.ae-row-btn{border:0;background:transparent;color:#1d4ed8;text-align:left;font-weight:800;padding:2px 0;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}.ae-empty{text-align:center;padding:34px 16px;color:var(--ae-muted)}
.ae-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.ae-toolbar .ae-input,.ae-toolbar .ae-select{width:auto;min-width:170px}.ae-record{border:1px solid var(--ae-line);border-radius:13px;background:#fff;padding:13px;margin-bottom:10px}.ae-record-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ae-record h4{margin:0 0 3px}.ae-meta{font-size:11px;color:var(--ae-muted);display:flex;gap:8px;flex-wrap:wrap}.ae-evidence{white-space:pre-wrap;background:#f8fafc;border-left:4px solid #64748b;padding:10px 12px;margin:10px 0;border-radius:0 9px 9px 0}.ae-interpretation{border-left-color:#2563eb;background:#eff6ff}.ae-thread{border-top:1px solid var(--ae-line);margin-top:14px;padding-top:12px}.ae-comment{padding:9px 11px;border-radius:10px;background:#f3f6fa;margin:7px 0}.ae-comment-teacher{background:#f3e8ff}.ae-comment strong{font-size:12px}.ae-comment p{margin:3px 0;white-space:pre-wrap}.ae-comment time{font-size:10px;color:var(--ae-muted)}
.ae-stepper{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin:12px 0 18px;list-style:none;padding:0}.ae-step{font-size:9px;text-align:center;color:#69758a;position:relative;padding-top:24px}.ae-step:before{content:"";width:18px;height:18px;border-radius:50%;background:#d9e0ea;border:2px solid #fff;box-shadow:0 0 0 1px #aeb9ca;position:absolute;top:0;left:50%;transform:translateX(-50%)}.ae-step:after{content:"";height:2px;background:#ccd5e2;position:absolute;top:9px;left:calc(50% + 10px);right:calc(-50% + 10px)}.ae-step:last-child:after{display:none}.ae-step-done{color:#154e39;font-weight:750}.ae-step-done:before{background:#16a34a;box-shadow:0 0 0 1px #15803d}.ae-step-done:after{background:#16a34a}.ae-step-current:before{background:#2563eb;box-shadow:0 0 0 3px #bfdbfe}.ae-domain{border:1px solid var(--ae-line);border-radius:12px;margin:8px 0;overflow:hidden}.ae-domain summary{cursor:pointer;padding:11px 12px;font-weight:800;background:#f8fafc}.ae-domain-body{padding:8px 12px 12px}.ae-domain-component{display:flex;gap:7px;align-items:flex-start;padding:5px 0;font-size:12px}.ae-domain-component strong{min-width:26px}.ae-rating-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ae-rating-card{border:1px solid var(--ae-line);border-radius:12px;padding:10px}.ae-rating-card h4{min-height:40px;margin:0 0 8px}.ae-score{font-size:28px;font-weight:900;color:#173e70}.ae-timeline{border-left:2px solid #c8d2e1;margin:10px 0 0 8px;padding-left:18px}.ae-event{position:relative;padding:0 0 16px}.ae-event:before{content:"";position:absolute;width:11px;height:11px;border-radius:50%;background:#2563eb;left:-24.5px;top:4px;border:2px solid #fff;box-shadow:0 0 0 1px #2563eb}.ae-event h4{margin:0;font-size:12px}.ae-event p{margin:2px 0;font-size:11px;color:var(--ae-muted)}.ae-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.ae-footer{padding:10px 20px;border-top:1px solid var(--ae-line);background:#fff;color:#667085;font-size:10px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.ae-footer a{color:#1d4ed8}
@media(max-width:1000px){.ae-span-4,.ae-span-5,.ae-span-6,.ae-span-7,.ae-span-8{grid-column:span 12}.ae-rating-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ae-workspace{height:97vh}.ae-main{padding:14px}.ae-stepper{grid-template-columns:repeat(10,minmax(72px,1fr));overflow-x:auto;padding-bottom:8px}.ae-step{font-size:9px;min-width:72px}.ae-step:before{width:16px;height:16px}.ae-step:after{top:8px}.ae-donut-wrap{justify-content:center}.ae-top{align-items:flex-start}.ae-brand p{display:none}}
@media(max-width:640px){.ae-overlay{padding:0}.ae-workspace{height:100vh;border-radius:0}.ae-top{padding:11px 12px}.ae-brand h1{font-size:15px}.ae-mark{width:36px;height:36px}.ae-local-banner{padding:8px 12px;display:block}.ae-tabs{padding:0 5px}.ae-tab{padding:10px 9px;font-size:12px}.ae-main{padding:10px}.ae-heading{display:block}.ae-heading .ae-actions{margin-top:10px}.ae-form-grid,.ae-rating-grid{grid-template-columns:1fr}.ae-donut-wrap{display:block}.ae-donut{margin:12px auto}.ae-legend{margin-top:12px}.ae-toolbar .ae-input,.ae-toolbar .ae-select{width:100%}.ae-top-actions{gap:4px}.ae-role button{padding:6px 7px;font-size:11px}.ae-brand p{display:none}.ae-footer{padding:8px 12px}}
@media(prefers-reduced-motion:reduce){.ae-shell *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

function AeStyles() { return <style>{AE_STYLES}</style>; }

function AeStatus({ status }) {
  const meta = AE_STATUS_META[status] || AE_STATUS_META.not_started;
  return <span className={'ae-chip ae-chip-' + meta.tone}>{meta.label}</span>;
}

function AeDonut({ segments, centerTop, centerBottom, label }) {
  const safe = (segments || []).filter((segment) => Number(segment.value) > 0);
  const total = safe.reduce((sum, segment) => sum + Number(segment.value), 0);
  let running = 0;
  const stops = safe.map((segment) => {
    const start = total ? (running / total) * 100 : 0;
    running += Number(segment.value);
    const end = total ? (running / total) * 100 : 0;
    return segment.color + ' ' + start.toFixed(2) + '% ' + end.toFixed(2) + '%';
  });
  const background = total ? 'conic-gradient(' + stops.join(',') + ')' : '#dbe2ec';
  return (
    <div className="ae-donut-wrap">
      <div className="ae-donut" role="img" aria-label={label} style={{ background }}>
        <div className="ae-donut-center"><strong>{centerTop}</strong><span>{centerBottom}</span></div>
      </div>
      <div className="ae-legend" aria-hidden="true">
        {safe.map((segment) => <div className="ae-legend-row" key={segment.id || segment.label}>
          <span className="ae-swatch" style={{ background: segment.color }} />
          <span>{segment.label}</span><strong>{segment.display == null ? segment.value : segment.display}</strong>
        </div>)}
      </div>
    </div>
  );
}

function AeThread({ workspace, recordType, recordId, teacherId, role, onAdd }) {
  const [text, setText] = React.useState('');
  const comments = workspace.comments.filter((comment) => comment.recordType === recordType && comment.recordId === recordId);
  return <div className="ae-thread">
    <h4>Conversation <span className="ae-chip ae-chip-neutral">{comments.length}</span></h4>
    <p className="ae-sub">Published comments are appended to this record and cannot alter the original evidence.</p>
    {comments.map((comment) => <div key={comment.id} className={'ae-comment ' + (comment.role === 'Teacher' ? 'ae-comment-teacher' : '')}>
      <strong>{comment.author} · {comment.role}</strong><p>{comment.text}</p><time>{aeDateTime(comment.at)}</time>
    </div>)}
    <label className="ae-field"><span>Add a shared comment</span>
      <textarea className="ae-textarea" value={text} maxLength={3000} onChange={(event) => setText(event.target.value)} placeholder={role === 'teacher' ? 'Add context or ask a question…' : 'Add feedback or answer a question…'} />
    </label>
    <button type="button" className="ae-btn" disabled={!text.trim()} onClick={() => { onAdd({ recordType, recordId, teacherId, text: text.trim() }); setText(''); }}>Post comment</button>
  </div>;
}

function AeFrameworkReference() {
  return <div className="ae-card">
    <h3>Evidence map · Pennsylvania classroom-teacher framework</h3>
    <p className="ae-sub">Component names organize evidence. Rubric-level performance descriptors are not reproduced in this prototype.</p>
    {AE_DOMAINS.map((domain) => <details className="ae-domain" key={domain.id}>
      <summary>Domain {domain.code} · {domain.label} <span className="ae-chip ae-chip-neutral">{domain.weight}% of O&amp;P</span></summary>
      <div className="ae-domain-body">{domain.components.map(([code, label]) => <div className="ae-domain-component" key={code}><strong>{code}</strong><span>{label}</span></div>)}</div>
    </details>)}
  </div>;
}

function AeRatingComposer({ teacher, role, updateTeacher }) {
  const [releaseChecked, setReleaseChecked] = React.useState(false);
  React.useEffect(() => { setReleaseChecked(false); }, [teacher.id]);
  const profile = aeWeightProfile(teacher);
  const obs = aeObservationScore(teacher.ratings);
  const overall = aeOverallScore(teacher);
  const missing = [];
  if (obs === null) missing.push('all four O&P domain ratings');
  profile.forEach((part) => {
    if (part.id !== 'observation' && aeNumberOrNull(teacher.ratings[part.id]) === null) missing.push(part.label);
  });
  const setRating = (key, value) => {
    const rating = aeRatingValue(value);
    if (value !== '' && rating === null) return;
    updateTeacher(teacher.id, (draft) => {
      aeFreezeTeacherCycle(draft);
      if (key.startsWith('d')) draft.ratings.domains[key] = rating;
      else draft.ratings[key] = rating;
    }, 'RATING_UPDATED', 'Rating input updated');
  };
  const recordFinalRelease = () => updateTeacher(teacher.id, (draft) => {
    draft.finalizedAt = aeNow();
    draft.cycleStatus = 'finalized';
    draft.finalScore = aeRoundedScore(overall);
    draft.weightSnapshot = profile.map((part) => ({ id: part.id, label: part.label, weight: part.weight }));
    draft.frameworkVersion = AE_FRAMEWORK;
  }, 'RELEASED', 'Final rating release recorded');
  return <div className="ae-card">
    <div className="ae-record-head"><div><h3>Annual summative calculation preview</h3><p className="ae-sub">Enter cycle-level domain judgments after reviewing all relevant observations, walkthroughs, artifacts, and professional-practice evidence. Observation-specific ratings stay separate; the system performs arithmetic only.</p></div>
      <div>{overall === null ? <span className="ae-chip ae-chip-amber">Draft · {missing.length} input{missing.length === 1 ? '' : 's'} missing</span> : <span className="ae-chip ae-chip-blue">{aeRoundedScore(overall).toFixed(2)} · {aeBand(overall)}</span>}</div>
    </div>
    <div className="ae-rating-grid" style={{ marginTop: 12 }}>
      {AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id} style={{ borderTop: '4px solid ' + domain.color }}>
        <h4>{domain.code}. {domain.label} <span className="ae-chip ae-chip-neutral">{domain.weight}% of O&amp;P</span></h4>
        <label className="ae-field"><span>Human-selected rating</span><select className="ae-select" value={teacher.ratings.domains[domain.id] == null ? '' : teacher.ratings.domains[domain.id]} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setRating(domain.id, event.target.value)}>
          <option value="">Not rated</option>{AE_RATINGS.map((rating) => <option key={rating.value} value={rating.value}>{rating.value} · {rating.label}</option>)}
        </select></label>
      </div>)}
    </div>
    <div className="ae-form-grid" style={{ marginTop: 12 }}>
      {profile.filter((part) => part.id !== 'observation').map((part) => <label className="ae-field" key={part.id}><span>{part.label} · {part.weight}%</span>
        <input className="ae-input" type="number" min="0" max="3" step="0.01" value={teacher.ratings[part.id] == null ? '' : teacher.ratings[part.id]} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setRating(part.id, event.target.value)} placeholder="0.00–3.00" />
      </label>)}
    </div>
    <div className="ae-note ae-warn">This is a planning preview, not an official PDE 13-1 form. Follow your LEA’s approved process and enter/release the official summative form in PEERS or the district’s authorized record system.</div>
    {teacher.finalizedAt && <div className="ae-note ae-ok" style={{ marginTop: 10 }}><strong>Final release recorded · {Number(teacher.finalScore == null ? aeRoundedScore(overall) : teacher.finalScore).toFixed(2)}</strong><br/>Released {aeDateTime(teacher.finalizedAt)}. This local receipt does not replace the official record.</div>}
    {!teacher.finalizedAt && role === 'evaluator' && overall !== null && <div style={{ marginTop: 12 }}><label className="ae-check"><input type="checkbox" checked={releaseChecked} onChange={(event) => setReleaseChecked(event.target.checked)}/><span>I confirm the official final rating form has already been released in PEERS or the LEA-authorized record system.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!releaseChecked} onClick={recordFinalRelease}>Record final release</button><p className="ae-help">This locks the local cycle and advances the “teachers evaluated” completion pie.</p></div>}
  </div>;
}

function AeOverview({ workspace, selectedTeacher, setSelectedTeacherId, role, updateTeacher, setTab }) {
  const isEvaluator = role === 'evaluator';
  const visibleTeachers = isEvaluator ? workspace.teachers : (selectedTeacher ? [selectedTeacher] : []);
  const summary = aeCompletionSummary(visibleTeachers);
  const completionSegments = summary.total ? [
    { id: 'finalized', label: 'Finalized', value: summary.finalized, display: summary.finalized, color: '#16815d' },
    { id: 'open', label: 'Not finalized', value: summary.open, display: summary.open, color: '#d6a321' },
  ] : [];
  const profile = selectedTeacher ? aeWeightProfile(selectedTeacher) : [];
  const profileLabel = selectedTeacher ? profile.map((part) => part.label + ' ' + part.weight + '%').join(', ') : '';
  const activeTeachers = visibleTeachers.filter((teacher) => teacher.active !== false);
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? 'Evaluation overview' : 'My evaluation'}</h2><p>Completion means the final rating record has been finalized—not that a walkthrough occurred.</p></div>
      {isEvaluator && <label className="ae-field" style={{ minWidth: 230, margin: 0 }}><span>Selected educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => setSelectedTeacherId(event.target.value)}>
        <option value="">Choose an educator</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}
      </select></label>}
    </div>
    <div className="ae-grid">
      {isEvaluator && <section className="ae-card ae-span-5" aria-labelledby="ae-completion-title"><h3 id="ae-completion-title">Teachers evaluated</h3><p className="ae-sub">Active educators due in {workspace.config.academicYear}</p>
        <AeDonut segments={completionSegments} centerTop={summary.finalized + ' / ' + summary.total} centerBottom="finalized" label={summary.finalized + ' of ' + summary.total + ' eligible teachers finalized; ' + summary.open + ' not finalized'} />
        <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">Evaluation status counts</caption><thead><tr><th>Status</th><th>Teachers</th></tr></thead><tbody>
          {Object.keys(AE_STATUS_META).map((status) => <tr key={status}><td><AeStatus status={status} /></td><td>{summary.statuses[status] || 0}</td></tr>)}
        </tbody></table></div>
      </section>}
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-7' : 'ae-span-12')} aria-labelledby="ae-composition-title"><h3 id="ae-composition-title">Weight in final evaluation</h3>
        {!selectedTeacher ? <div className="ae-empty"><strong>Choose an educator</strong><p>The pie recalculates by employee category and data availability.</p></div> : <>
          <div className="ae-record-head"><p className="ae-sub">{selectedTeacher.name} · {selectedTeacher.employeeType === 'temporary' ? 'Temporary professional employee' : 'Professional classroom teacher'}</p><AeStatus status={aeTeacherStatus(selectedTeacher)} /></div>
          <AeDonut segments={profile.map((part) => ({ id: part.id, label: part.label, value: part.weight, display: part.weight + '%', color: part.color }))} centerTop={profile[0] ? profile[0].weight + '%' : '—'} centerBottom="Observation & Practice" label={'Weight in final evaluation: ' + profileLabel} />
          <div className="ae-note" style={{ marginTop: 10 }}>Within Observation &amp; Practice: Planning &amp; Preparation 20%, Classroom Environment 30%, Instruction 30%, Professional Responsibilities 20%.</div>
          {selectedTeacher.employeeType === 'temporary' && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>Temporary professional employee: this cycle uses 100% Observation &amp; Practice.</div>}
          {selectedTeacher.employeeType !== 'temporary' && selectedTeacher.buildingData === false && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>No Building Level Data: its 10% is reallocated to Observation &amp; Practice.</div>}
          {selectedTeacher.employeeType !== 'temporary' && selectedTeacher.teacherSpecificData === false && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>No attributable Teacher-Specific Data: its 10% is reallocated to the LEA Selected Measure.</div>}
        </>}
      </section>
      {isEvaluator && <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>Roster status</h3><p className="ae-sub">Select a row to open the educator’s working record.</p></div><button type="button" className="ae-btn" onClick={() => setTab('staff')}>Manage staff</button></div>
        {activeTeachers.length === 0 ? <div className="ae-empty">No educators yet. Add your roster in Staff.</div> : <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><thead><tr><th>Educator</th><th>Assignment</th><th>Evaluator</th><th>Formal observation</th><th>Walkthroughs</th><th>SPM / SLO</th><th>Final record</th><th>Next due</th></tr></thead><tbody>
          {activeTeachers.map((teacher) => {
            const obs = workspace.observations.filter((item) => item.teacherId === teacher.id);
            const walks = workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt);
            const spm = workspace.spms.find((item) => item.teacherId === teacher.id);
            return <tr key={teacher.id}><td><button className="ae-row-btn" type="button" onClick={() => setSelectedTeacherId(teacher.id)}>{teacher.name}</button><br/><span className="ae-sub">{teacher.code} · {teacher.building}</span></td><td>{teacher.assignment || '—'}</td><td>{teacher.evaluator || '—'}</td><td>{obs.length ? (obs.some((item) => item.finalizedAt) ? 'Finalized' : 'In progress') : 'Not started'}</td><td>{walks.length}</td><td>{spm ? spm.status.replace(/_/g, ' ') : 'Not started'}</td><td><AeStatus status={aeTeacherStatus(teacher)} /></td><td>{aeDate(teacher.dueDate)}</td></tr>;
          })}
        </tbody></table></div>}
      </section>}
      {selectedTeacher && <section className="ae-span-12"><AeRatingComposer teacher={selectedTeacher} role={role} updateTeacher={updateTeacher} /></section>}
    </div>
  </div>;
}

function AeTrendChart({ points, metric, label }) {
  const values = points.map((point) => ({ point, value: aeTrendPointMetric(point, metric) })).filter((item) => item.value !== null);
  if (!values.length) return <div className="ae-empty">No finalized {label.toLowerCase()} points in this date range.</div>;
  const width = 720, height = 230, left = 44, right = 18, top = 22, bottom = 44;
  const x = (index) => values.length === 1 ? (left + width - right) / 2 : left + (index / (values.length - 1)) * (width - left - right);
  const y = (value) => top + ((3 - value) / 3) * (height - top - bottom);
  const polyline = values.map((item, index) => x(index) + ',' + y(item.value)).join(' ');
  return <div>
    <p className="ae-sub">{values.length} finalized point{values.length === 1 ? '' : 's'} · fixed 0–3 scale. Missing ratings are not connected.</p>
    <svg viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', minHeight: 220, display: 'block' }} aria-hidden="true">
      {[0, 1, 2, 3].map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#d8deea"/><text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#5b667a">{tick}</text></g>)}
      {values.length > 1 && <polyline points={polyline} fill="none" stroke="#1d4ed8" strokeWidth="3"/>}
      {values.map((item, index) => <g key={item.point.recordId}><circle cx={x(index)} cy={y(item.value)} r="6" fill="#fff" stroke="#1d4ed8" strokeWidth="3"/><text x={x(index)} y={y(item.value) - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#172033">{item.value.toFixed(2)}</text><text x={x(index)} y={height - 17} textAnchor="middle" fontSize="10" fill="#5b667a">{item.point.source === 'cycle_snapshot' ? (item.point.academicYear || aeString(item.point.date, 10, '')).slice(0, 10) : aeString(item.point.date, 10, '')}</text></g>)}
    </svg>
    <div className="ae-table-wrap"><table className="ae-table"><caption className="ae-live">{label} trend data</caption><thead><tr><th scope="col">Date / cycle</th><th scope="col">Record</th><th scope="col">{label}</th></tr></thead><tbody>{values.map((item) => <tr key={item.point.recordId}><td><time dateTime={item.point.date}>{item.point.source === 'cycle_snapshot' ? (item.point.academicYear || aeDate(item.point.date)) : aeDate(item.point.date)}</time></td><td>{item.point.source === 'cycle_snapshot' ? 'Final cycle release' : 'Finalized formal observation'}</td><td>{item.value.toFixed(2)}</td></tr>)}</tbody></table></div>
  </div>;
}

function AeTrends({ workspace, selectedTeacher, setSelectedTeacherId, role, isRemote = false }) {
  const isEvaluator = role === 'evaluator';
  const [metric, setMetric] = React.useState('overall');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const metricLabels = { overall: 'Overall O&P', d1: 'Planning & Preparation', d2: 'Classroom Environment', d3: 'Instruction', d4: 'Professional Responsibilities' };
  const filters = { from, to, source: 'formal_observation' };
  const points = selectedTeacher ? aeTeacherTrendPoints(workspace, selectedTeacher.id, filters) : [];
  const inRange = (value) => {
    const date = aeString(value, 10, '').slice(0, 10);
    return date && (!from || date >= from) && (!to || date <= to);
  };
  const walkthroughs = selectedTeacher ? workspace.walkthroughs.filter((item) => item.teacherId === selectedTeacher.id && item.publishedAt && inRange(item.publishedAt)) : [];
  const observations = selectedTeacher ? workspace.observations.filter((item) => item.teacherId === selectedTeacher.id && item.finalizedAt && inRange(item.finalizedAt)) : [];
  const snapshots = selectedTeacher ? (workspace.cycleSnapshots || []).filter((item) => item.teacherId === selectedTeacher.id && inRange(item.finalizedAt)) : [];
  const ackHours = walkthroughs.filter((item) => item.teacherAcknowledgedAt).map((item) => (new Date(item.teacherAcknowledgedAt).getTime() - new Date(item.publishedAt).getTime()) / 3600000).filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  const medianAck = ackHours.length ? (ackHours.length % 2 ? ackHours[Math.floor(ackHours.length / 2)] : (ackHours[ackHours.length / 2 - 1] + ackHours[ackHours.length / 2]) / 2) : null;
  const cohort = selectedTeacher ? aeWorkspaceCohortMetric(workspace, selectedTeacher.id, metric, filters) : { suppressed: true, minimum: AE_MIN_TREND_COHORT, median: null, selectedMean: null };
  const activity = {};
  walkthroughs.forEach((item) => { const month = item.publishedAt.slice(0, 7); activity[month] = activity[month] || { walkthroughs: 0, formals: 0 }; activity[month].walkthroughs += 1; });
  observations.forEach((item) => { const month = item.finalizedAt.slice(0, 7); activity[month] = activity[month] || { walkthroughs: 0, formals: 0 }; activity[month].formals += 1; });
  const months = Object.keys(activity).sort();
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? 'Teacher trends and cohort context' : 'My trends'}</h2><p>Finalized formal-observation ratings and workflow activity over time. Annual cycle releases are reported separately. Evidence text, comments, and rationales are never aggregated.</p></div></div>
    <div className="ae-note ae-warn" style={{ marginBottom: 16 }}><strong>Privacy-aware aggregate—not FERPA certification.</strong> Formal-observation cohort values appear only when at least {AE_MIN_TREND_COHORT} eligible peers contribute; small groups are suppressed. Results are descriptive and must not be the sole basis for personnel decisions. {isRemote ? 'District authorization, retention, and employment-policy requirements still apply.' : 'This local prototype has no authentication—do not enter real personnel or student information.'}</div>
    <section className="ae-card" style={{ marginBottom: 16 }}><fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontWeight: 850, marginBottom: 10 }}>Trend filters</legend><div className="ae-form-grid">
      {isEvaluator && <label className="ae-field"><span>Educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => setSelectedTeacherId(event.target.value)}><option value="">Choose an educator</option>{workspace.teachers.filter((teacher) => teacher.active !== false).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}
      <label className="ae-field"><span>Metric</span><select className="ae-select" value={metric} onChange={(event) => setMetric(event.target.value)}>{Object.keys(metricLabels).map((key) => <option key={key} value={key}>{metricLabels[key]}</option>)}</select></label>
      <label className="ae-field"><span>From</span><input className="ae-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label>
      <label className="ae-field"><span>To</span><input className="ae-input" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)}/></label>
    </div></fieldset></section>
    {!selectedTeacher ? <div className="ae-card ae-empty">Choose an educator to view trends.</div> : <div className="ae-grid">
      <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>{selectedTeacher.name} · longitudinal snapshot</h3><p className="ae-sub">{workspace.config.academicYear} current workflow plus separately reported immutable prior-cycle releases.</p></div><AeStatus status={aeTeacherStatus(selectedTeacher)}/></div><div className="ae-grid" style={{ marginTop: 12 }}><div className="ae-span-4 ae-stat"><strong>{walkthroughs.length}</strong><span>published walkthroughs</span></div><div className="ae-span-4 ae-stat"><strong>{observations.length}</strong><span>finalized formal observations</span></div><div className="ae-span-4 ae-stat"><strong>{snapshots.length}</strong><span>released cycle snapshots in range</span></div></div>{medianAck !== null && <p className="ae-sub" style={{ marginTop: 10 }}>Median walkthrough acknowledgment: {medianAck < 48 ? medianAck.toFixed(1) + ' hours' : (medianAck / 24).toFixed(1) + ' days'} (n={ackHours.length}).</p>}</section>
      <section className="ae-card ae-span-12"><h3>Annual cycle releases</h3><p className="ae-sub">All-factor final evaluation scores are listed separately and are not mixed into formal-observation O&amp;P trajectories or peer comparisons.</p>{snapshots.length ? <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">Annual cycle release scores</caption><thead><tr><th scope="col">Academic year</th><th scope="col">Released</th><th scope="col">Final evaluation score</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}><td>{snapshot.academicYear || 'Unspecified year'}</td><td>{aeDate(snapshot.finalizedAt)}</td><td>{snapshot.finalScore == null ? '—' : Number(snapshot.finalScore).toFixed(2)}</td></tr>)}</tbody></table></div> : <div className="ae-empty">No released annual cycle snapshots in this date range.</div>}</section>
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-8' : 'ae-span-12')}><h3>Formal-observation {metricLabels[metric]} over time</h3><AeTrendChart points={points} metric={metric} label={metricLabels[metric]}/></section>
      {isEvaluator && <section className="ae-card ae-span-4"><h3>De-identified peer context</h3><p className="ae-sub">Same building and employee type; selected educator excluded. Each peer contributes one mean across finalized formal observations before the cohort median.</p>{cohort.suppressed ? <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>Suppressed.</strong><br/>Fewer than {AE_MIN_TREND_COHORT} eligible peers contributed to this metric and date range. The exact small-group count is not exposed.</div> : <div style={{ marginTop: 14 }}><div className="ae-stat"><strong>{cohort.selectedMean == null ? '—' : cohort.selectedMean.toFixed(2)}</strong><span>selected educator mean</span></div><div className="ae-stat" style={{ marginTop: 10, borderLeftColor: '#0f766e' }}><strong>{cohort.median.toFixed(2)}</strong><span>peer cohort median · n={cohort.peerCount}</span></div></div>}<div className="ae-note" style={{ marginTop: 14 }}>No ranking, percentile, peer names, automated judgment, or personnel recommendation is produced.</div></section>}
      <section className="ae-card ae-span-12"><h3>Observation activity by month</h3><p className="ae-sub">Volume indicates documentation activity, not teaching quality.</p>{months.length ? <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">Monthly observation activity</caption><thead><tr><th scope="col">Month</th><th scope="col">Published walkthroughs</th><th scope="col">Finalized formal observations</th></tr></thead><tbody>{months.map((month) => <tr key={month}><th scope="row">{month}</th><td>{activity[month].walkthroughs}</td><td>{activity[month].formals}</td></tr>)}</tbody></table></div> : <div className="ae-empty">No published/finalized observation activity in this date range.</div>}</section>
    </div>}
  </div>;
}
function AeStaff({ workspace, selectedTeacher, setSelectedTeacherId, role, updateTeacher, addTeacher, isRemote = false, canAddStaff = true }) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const matches = workspace.teachers.filter((teacher) => {
    const hay = (teacher.name + ' ' + teacher.code + ' ' + teacher.assignment + ' ' + teacher.building).toLowerCase();
    return hay.includes(search.toLowerCase()) && (statusFilter === 'all' || aeTeacherStatus(teacher) === statusFilter);
  });
  const set = (field, value) => updateTeacher(selectedTeacher.id, (draft) => { draft[field] = value; }, 'PROFILE_UPDATED', 'Educator assignment updated');
  return <div className="ae-page"><div className="ae-heading"><div><h2>{isRemote ? 'Staff and cycle profiles' : 'Staff and evaluation assignments'}</h2><p>Configure the employee category and data availability that drive each educator’s Act 13 pie.</p></div>{role === 'evaluator' && canAddStaff && <button type="button" className="ae-btn ae-btn-primary" onClick={addTeacher}>+ Add educator</button>}</div>
    <div className="ae-grid"><section className="ae-card ae-span-7"><div className="ae-toolbar"><input className="ae-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff" aria-label="Search staff"/><select className="ae-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by evaluation status"><option value="all">All statuses</option>{Object.keys(AE_STATUS_META).map((key) => <option key={key} value={key}>{AE_STATUS_META[key].label}</option>)}</select></div>
      <div className="ae-table-wrap"><table className="ae-table"><thead><tr><th>Educator</th><th>Employee type</th><th>Status</th><th>Due</th></tr></thead><tbody>{matches.map((teacher) => <tr key={teacher.id}><td><button type="button" className="ae-row-btn" onClick={() => setSelectedTeacherId(teacher.id)}>{teacher.name}</button><br/><span className="ae-sub">{teacher.code} · {teacher.assignment || 'No assignment'}</span></td><td>{teacher.employeeType === 'temporary' ? 'Temporary' : 'Professional'}</td><td><AeStatus status={aeTeacherStatus(teacher)} /></td><td>{aeDate(teacher.dueDate)}</td></tr>)}</tbody></table></div>
    </section><section className="ae-card ae-span-5"><h3>Selected educator</h3>{selectedTeacher && selectedTeacher.cycleLockedAt && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}>Employee category, data availability, and framework weights were frozen when cycle work began ({aeDateTime(selectedTeacher.cycleLockedAt)}).</div>}{!selectedTeacher ? <div className="ae-empty">Select an educator to review the assignment.</div> : <fieldset disabled={role !== 'evaluator' || !!selectedTeacher.finalizedAt || !!selectedTeacher.cycleLockedAt} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="ae-form-grid"><label className="ae-field"><span>Name</span><input className="ae-input" value={selectedTeacher.name} onChange={(event) => set('name', event.target.value)} /></label><label className="ae-field"><span>Staff code</span><input className="ae-input" value={selectedTeacher.code} onChange={(event) => set('code', event.target.value)} /></label></div>
      <label className="ae-field"><span>Assignment</span><input className="ae-input" value={selectedTeacher.assignment || ''} onChange={(event) => set('assignment', event.target.value)} placeholder="Grade / subject / role" /></label>
      <div className="ae-form-grid"><label className="ae-field"><span>Building</span><input className="ae-input" value={selectedTeacher.building || ''} onChange={(event) => set('building', event.target.value)} /></label><label className="ae-field"><span>{isRemote ? 'Lead evaluator display label' : 'Lead evaluator'}</span><input className="ae-input" value={selectedTeacher.evaluator || ''} readOnly={isRemote} onChange={isRemote ? undefined : (event) => set('evaluator', event.target.value)} /></label></div>{isRemote && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}><strong>Portal access is separate from this profile.</strong><br/>Evaluator assignments are managed by an authorized district administrator or IT. This display label does not grant or revoke access.</div>}
      <div className="ae-form-grid"><label className="ae-field"><span>Employee type</span><select className="ae-select" value={selectedTeacher.employeeType} onChange={(event) => set('employeeType', event.target.value)}><option value="professional">Professional classroom teacher</option><option value="temporary">Temporary professional employee</option></select></label><label className="ae-field"><span>Cycle due date</span><input className="ae-input" type="date" value={selectedTeacher.dueDate || ''} onChange={(event) => set('dueDate', event.target.value)} /></label></div>
      <label className="ae-check"><input type="checkbox" checked={selectedTeacher.buildingData !== false} onChange={(event) => set('buildingData', event.target.checked)} /><span>Building Level Data is available for this assignment.</span></label>
      <label className="ae-check"><input type="checkbox" checked={selectedTeacher.teacherSpecificData !== false} onChange={(event) => set('teacherSpecificData', event.target.checked)} /><span>Teacher-Specific Data is attributable to this educator.</span></label>
      <label className="ae-check"><input type="checkbox" checked={selectedTeacher.active !== false} onChange={(event) => set('active', event.target.checked)} /><span>Include in the current cycle denominator.</span></label>
      <div className="ae-note">Current pie: {aeWeightProfile(selectedTeacher).map((part) => part.short + ' ' + part.weight + '%').join(' · ')}</div>
    </fieldset>}</section></div>
  </div>;
}

function AeComponentChecks({ selected, onChange, disabled }) {
  const values = Array.isArray(selected) ? selected : [];
  return <div><span className="ae-legend-label">Evidence tags</span>{AE_DOMAINS.map((domain) => <details className="ae-domain" key={domain.id}><summary>{domain.code}. {domain.label}</summary><div className="ae-domain-body">{domain.components.map(([code, label]) => <label className="ae-check" key={code}><input disabled={disabled} type="checkbox" checked={values.includes(code)} onChange={(event) => onChange(event.target.checked ? values.concat(code) : values.filter((item) => item !== code))}/><span><strong>{code}</strong> · {label}</span></label>)}</div></details>)}</div>;
}

function AeWalkthroughs({ workspace, selectedTeacher, setSelectedTeacherId, role, createWalkthrough, publishWalkthrough, addComment, acknowledgeWalkthrough, isRemote = false }) {
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const [showForm, setShowForm] = React.useState(false);
  const [openId, setOpenId] = React.useState('');
  const blank = () => ({ teacherId: selectedTeacher ? selectedTeacher.id : (teachers[0] && teachers[0].id) || '', date: aeToday(), startedAt: '', durationMin: '8', announced: 'unannounced', lessonPhase: 'middle', subject: '', evidence: '', interpretation: '', componentTags: [], privacyChecked: false });
  const [draft, setDraft] = React.useState(blank);
  const [draftReleaseChecked, setDraftReleaseChecked] = React.useState(false);
  React.useEffect(() => { if (!draft.teacherId && selectedTeacher) setDraft((value) => Object.assign({}, value, { teacherId: selectedTeacher.id })); }, [selectedTeacher && selectedTeacher.id]);
  const records = workspace.walkthroughs.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id && !!record.publishedAt)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const submit = (published) => {
    if (!draft.teacherId || !draft.evidence.trim()) return;
    if (published && !draft.privacyChecked) return;
    const id = createWalkthrough(Object.assign({}, draft, { published })); setOpenId(id); setShowForm(false); setDraft(blank());
  };
  const startOrClose = () => {
    if (showForm) { setShowForm(false); return; }
    if (!draft.startedAt) setDraft(Object.assign({}, draft, { startedAt: aeNow() }));
    setShowForm(true);
  };
  return <div className="ae-page"><div className="ae-heading"><div><h2>Walkthrough observations</h2><p>A middle-of-lesson visit captures factual evidence. It does not replace a comprehensive observation or auto-score a rubric.</p></div>{role === 'evaluator' && <button type="button" className="ae-btn ae-btn-primary" onClick={startOrClose}>{showForm ? 'Close draft' : (draft.startedAt ? 'Resume walkthrough draft' : '+ Start walkthrough')}</button>}</div>
    {role === 'teacher' && <div className="ae-note"><strong>{selectedTeacher ? selectedTeacher.name : 'Educator record'}</strong> · {isRemote ? 'Only records assigned to this district account are shown; private evaluator drafts remain hidden.' : 'Teacher view shows only the selected educator’s published records. Role switching is a same-device demonstration.'}</div>}
    {showForm && role === 'evaluator' && <section className="ae-card" style={{ marginBottom: 16 }}><h3>New walkthrough evidence</h3><p className="ae-sub">Keep witnessed evidence separate from interpretation or feedback.</p><div className="ae-form-grid" style={{ marginTop: 12 }}>
      <label className="ae-field"><span>Educator</span><select className="ae-select" value={draft.teacherId} onChange={(event) => setDraft(Object.assign({}, draft, { teacherId: event.target.value }))}><option value="">Choose</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>
      <label className="ae-field"><span>Date</span><input className="ae-input" type="date" value={draft.date} onChange={(event) => setDraft(Object.assign({}, draft, { date: event.target.value }))}/></label>
      <label className="ae-field"><span>Announced?</span><select className="ae-select" value={draft.announced} onChange={(event) => setDraft(Object.assign({}, draft, { announced: event.target.value }))}><option value="unannounced">Unannounced</option><option value="announced">Announced</option></select></label>
      <label className="ae-field"><span>Duration (minutes)</span><input className="ae-input" type="number" min="1" max="180" value={draft.durationMin} onChange={(event) => setDraft(Object.assign({}, draft, { durationMin: event.target.value }))}/></label>
      <label className="ae-field"><span>Lesson phase</span><select className="ae-select" value={draft.lessonPhase} onChange={(event) => setDraft(Object.assign({}, draft, { lessonPhase: event.target.value }))}><option value="opening">Opening</option><option value="middle">Middle of lesson</option><option value="guided_practice">Guided practice</option><option value="independent_practice">Independent practice</option><option value="closure">Closure</option></select></label>
      <label className="ae-field"><span>Course / subject</span><input className="ae-input" value={draft.subject} onChange={(event) => setDraft(Object.assign({}, draft, { subject: event.target.value }))}/></label>
    </div><label className="ae-field"><span>Directly witnessed evidence</span><textarea className="ae-textarea" value={draft.evidence} onChange={(event) => setDraft(Object.assign({}, draft, { evidence: event.target.value }))} placeholder="At 10:14, the teacher asked… Six students… The posted objective read…"/><span className="ae-help">Record observable words, actions, artifacts, and student responses. Avoid student names.</span></label>
    <label className="ae-field"><span>Interpretation / feedback (separate)</span><textarea className="ae-textarea" value={draft.interpretation} onChange={(event) => setDraft(Object.assign({}, draft, { interpretation: event.target.value }))} placeholder="Possible strength, question, or area for discussion…"/></label>
    <AeComponentChecks selected={draft.componentTags} onChange={(componentTags) => setDraft(Object.assign({}, draft, { componentTags }))}/>
    <label className="ae-check"><input type="checkbox" checked={draft.privacyChecked} onChange={(event) => setDraft(Object.assign({}, draft, { privacyChecked: event.target.checked }))}/><span>I reviewed these notes and removed student-identifying information.</span></label>
    <div className="ae-actions"><button type="button" className="ae-btn" disabled={!draft.teacherId || !draft.evidence.trim()} onClick={() => submit(false)}>Save private draft</button><button type="button" className="ae-btn ae-btn-primary" disabled={!draft.teacherId || !draft.evidence.trim() || !draft.privacyChecked} onClick={() => submit(true)}>Publish to teacher</button></div>
    </section>}
    <div className="ae-grid"><section className="ae-card ae-span-5"><h3>Visit records</h3>{records.length === 0 ? <div className="ae-empty">No walkthroughs yet.</div> : records.map((record) => { const teacher = workspace.teachers.find((item) => item.id === record.teacherId); return <button type="button" key={record.id} className="ae-record" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setOpenId(record.id); setSelectedTeacherId(record.teacherId); }}><div className="ae-record-head"><div><h4>{teacher ? teacher.name : 'Unknown educator'}</h4><div className="ae-meta"><span>{aeDate(record.date)}</span><span>{record.durationMin} min</span><span>{record.announced}</span></div></div><span className={'ae-chip ' + (record.publishedAt ? 'ae-chip-good' : 'ae-chip-neutral')}>{record.publishedAt ? 'Published' : 'Private draft'}</span></div><p className="ae-sub" style={{ marginTop: 8 }}>{record.evidence.slice(0, 120)}{record.evidence.length > 120 ? '…' : ''}</p></button>; })}</section>
      <section className="ae-card ae-span-7"><h3>Walkthrough detail</h3>{!openId ? <div className="ae-empty">Choose a visit to review evidence and conversation.</div> : (() => { const record = records.find((item) => item.id === openId); if (!record) return <div className="ae-empty">Record not found.</div>; const teacher = workspace.teachers.find((item) => item.id === record.teacherId); return <><div className="ae-record-head"><div><h4>{teacher ? teacher.name : 'Unknown educator'} · {aeDate(record.date)}</h4><div className="ae-meta"><span>Started {aeDateTime(record.startedAt)}</span><span>{record.durationMin} minutes</span><span>{record.lessonPhase.replace(/_/g, ' ')}</span></div></div><span className={'ae-chip ' + (record.publishedAt ? 'ae-chip-good' : 'ae-chip-neutral')}>{record.publishedAt ? 'Published snapshot' : 'Private evaluator draft'}</span></div><h4>Directly witnessed evidence</h4><div className="ae-evidence">{record.evidence}</div>{record.interpretation && <><h4>Interpretation / feedback</h4><div className="ae-evidence ae-interpretation">{record.interpretation}</div></>}<div className="ae-chips">{record.componentTags.map((code) => <span className="ae-chip ae-chip-blue" key={code}>{code}</span>)}</div>{!record.publishedAt && role === 'evaluator' && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><label className="ae-check"><input type="checkbox" checked={draftReleaseChecked} onChange={(event) => setDraftReleaseChecked(event.target.checked)}/><span>I reviewed this saved draft and removed student-identifying information.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!draftReleaseChecked} onClick={() => { publishWalkthrough(record.id); setDraftReleaseChecked(false); }}>Publish saved draft to teacher</button></div>}{record.publishedAt && role === 'teacher' && !record.teacherAcknowledgedAt && <div style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-primary" onClick={() => acknowledgeWalkthrough(record.id)}>Acknowledge receipt</button><p className="ae-help">Acknowledgment records receipt, not agreement.</p></div>}{record.teacherAcknowledgedAt && <div className="ae-note ae-ok" style={{ marginTop: 12 }}>Teacher acknowledged receipt {aeDateTime(record.teacherAcknowledgedAt)}.</div>}{record.publishedAt && <AeThread workspace={workspace} recordType="walkthrough" recordId={record.id} teacherId={record.teacherId} role={role} onAdd={addComment}/>}</>; })()}</section>
    </div>
  </div>;
}

const AE_OBS_STEPS = ['Assigned', 'Prework', 'Pre-conference', 'Observation', 'Evidence review', 'Reflection', 'Post-conference', 'Ratings', 'Acknowledged', 'Finalized'];

function AeObservationStepper({ observation }) {
  const step = aeStepOfObservation(observation);
  return <ol className="ae-stepper" aria-label={'Formal observation progress: step ' + (step + 1) + ' of 10, ' + AE_OBS_STEPS[step]}>{AE_OBS_STEPS.map((label, index) => <li key={label} className={'ae-step ' + (index < step ? 'ae-step-done' : '') + (index === step ? ' ae-step-current' : '')} aria-current={index === step ? 'step' : undefined}>{label}</li>)}</ol>;
}

function AeFormalRecordSummary({ observation, role }) {
  const prework = observation.prework || {};
  const Item = ({ label, value }) => value ? <div style={{ marginTop: 10 }}><strong>{label}</strong><div className="ae-evidence">{value}</div></div> : null;
  const canSeePrework = role === 'teacher' || !!observation.preworkSubmittedAt;
  const canSeeEvidence = role === 'evaluator' || !!observation.evidencePublishedAt;
  const canSeeReflection = role === 'teacher' || !!observation.reflectionSubmittedAt;
  const canSeeConference = role === 'evaluator' || !!observation.postConferenceAt;
  return <div className="ae-card" style={{ marginTop: 16 }}><h3>Persistent record summary</h3><p className="ae-sub">Submitted material remains visible after the workflow advances; unsubmitted teacher drafts stay private.</p>
    {canSeePrework ? <details className="ae-domain" open><summary>Pre-observation materials</summary><div className="ae-domain-body"><Item label="Lesson / unit plan" value={prework.plan}/><Item label="Expected outcomes" value={prework.outcomes}/><Item label="Resources and planned supports" value={prework.resources}/><Item label="Assessment / evidence of learning" value={prework.assessment}/><Item label="Secure artifact references" value={prework.artifactReferences}/></div></details> : <div className="ae-note">Pre-observation materials have not been submitted.</div>}
    {canSeeEvidence && <Item label="Published observation evidence" value={observation.evidence}/>}
    {canSeeReflection && <Item label="Teacher reflection" value={observation.reflection}/>}
    {canSeeConference && <Item label="Post-conference discussion and follow-up" value={observation.postConferenceNotes}/>}
    <div className="ae-note ae-warn" style={{ marginTop: 12 }}>This local MVP stores text and district-authorized document references only. Secure file upload, malware scanning, versioning, and retention require the production backend.</div>
  </div>;
}
function AeFormalObservations({ workspace, selectedTeacher, setSelectedTeacherId, role, createObservation, updateObservation, updateTeacher, addComment }) {
  const [openId, setOpenId] = React.useState('');
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const records = workspace.observations.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id));
  const active = (selectedTeacher && records.find((record) => record.id === openId && record.teacherId === selectedTeacher.id)) || (selectedTeacher && records.find((record) => record.teacherId === selectedTeacher.id)) || null;
  React.useEffect(() => { if (active && !openId) setOpenId(active.id); }, [active && active.id]);
  const patch = (changes, event, summary) => updateObservation(active.id, changes, event, summary);
  return <div className="ae-page"><div className="ae-heading"><div><h2>Formal comprehensive observations</h2><p>Prework, conferences, observed evidence, reflection, human ratings, acknowledgment, and finalization remain distinct.</p></div>{role === 'evaluator' && <button type="button" className="ae-btn ae-btn-primary" disabled={!selectedTeacher || records.some((record) => record.teacherId === selectedTeacher.id && !record.finalizedAt)} onClick={() => setOpenId(createObservation(selectedTeacher.id))}>+ Assign formal observation</button>}</div>
    {role === 'evaluator' ? <div className="ae-toolbar"><label className="ae-field" style={{ minWidth: 260, margin: 0 }}><span>Educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => { setSelectedTeacherId(event.target.value); const found = records.find((record) => record.teacherId === event.target.value); setOpenId(found ? found.id : ''); }}><option value="">Choose an educator</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label></div> : selectedTeacher && <div className="ae-note">Viewing records for {selectedTeacher.name} · {selectedTeacher.code}</div>}
    {!active ? <div className="ae-card ae-empty">{selectedTeacher ? 'No formal observation has been assigned for this educator.' : 'Choose an educator to begin.'}</div> : (() => {
      const teacher = workspace.teachers.find((item) => item.id === active.teacherId);
      const step = aeStepOfObservation(active);
      return <><section className="ae-card"><div className="ae-record-head"><div><h3>{teacher ? teacher.name : 'Educator'} · Formal observation</h3><p className="ae-sub">Assigned {aeDateTime(active.createdAt)} · Framework snapshot {active.frameworkVersion}</p></div><span className="ae-chip ae-chip-blue">Step {step + 1} of 10</span></div><AeObservationStepper observation={active}/></section>
      <div className="ae-grid" style={{ marginTop: 16 }}>
        <section className="ae-card ae-span-7"><h3>Current workflow step</h3>
          {step === 0 && role === 'teacher' && <div><div className="ae-note">Submit your lesson or unit plan and expected learning outcomes before the pre-conference.</div><label className="ae-field"><span>Lesson / unit plan summary</span><textarea className="ae-textarea" value={(active.prework && active.prework.plan) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { plan: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Expected student learning outcomes</span><textarea className="ae-textarea" value={(active.prework && active.prework.outcomes) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { outcomes: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Resources and planned supports</span><textarea className="ae-textarea" value={(active.prework && active.prework.resources) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { resources: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Assessment / evidence of learning</span><textarea className="ae-textarea" value={(active.prework && active.prework.assessment) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { assessment: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Secure artifact references / links</span><textarea className="ae-textarea" value={(active.prework && active.prework.artifactReferences) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { artifactReferences: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')} placeholder="District Drive document ID or approved secure link — no student names"/><span className="ae-help">File uploads are intentionally unavailable in this workspace; use only district-approved secure references.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.prework || !active.prework.plan || !active.prework.outcomes} onClick={() => patch({ preworkSubmittedAt: aeNow() }, 'SUBMITTED', 'Pre-observation materials submitted')}>Submit pre-observation materials</button></div>}
          {step === 0 && role === 'evaluator' && <div className="ae-empty">Waiting for the teacher’s pre-observation materials. Switch to Teacher view to demonstrate submission.</div>}
          {step === 1 && <div><h4>Teacher submission</h4><div className="ae-evidence">{active.prework && active.prework.plan}</div><h4>Expected outcomes</h4><div className="ae-evidence">{active.prework && active.prework.outcomes}</div>{role === 'evaluator' ? <><label className="ae-field"><span>Pre-conference notes</span><textarea className="ae-textarea" value={active.preConferenceNotes || ''} onChange={(event) => patch({ preConferenceNotes: event.target.value }, 'DRAFT_SAVED', 'Pre-conference notes updated')}/></label><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ preConferenceAt: aeNow() }, 'CONFERENCED', 'Pre-conference completed')}>Mark pre-conference complete</button></> : <div className="ae-note">Submitted {aeDateTime(active.preworkSubmittedAt)}. Awaiting evaluator pre-conference.</div>}</div>}
          {step === 2 && role === 'evaluator' && <div><label className="ae-field"><span>Observation date and time</span><input className="ae-input" type="datetime-local" value={active.observedLocal || ''} onChange={(event) => patch({ observedLocal: event.target.value }, 'DRAFT_SAVED', 'Observation schedule updated')}/></label><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ observedAt: active.observedLocal ? new Date(active.observedLocal).toISOString() : aeNow() }, 'OBSERVATION_STARTED', 'Formal observation started')}>Start observation</button></div>}
          {step === 2 && role === 'teacher' && <div className="ae-note">Pre-conference completed {aeDateTime(active.preConferenceAt)}. The evaluator will record observed evidence.</div>}
          {step === 3 && role === 'evaluator' && <div><label className="ae-field"><span>Time-stamped factual evidence</span><textarea className="ae-textarea" style={{ minHeight: 180 }} value={active.evidence || ''} onChange={(event) => patch({ evidence: event.target.value }, 'DRAFT_SAVED', 'Observation evidence draft saved')} placeholder="10:04 — Posted learning outcome…\n10:11 — Students discussed…"/></label><AeComponentChecks selected={active.componentTags || []} onChange={(componentTags) => patch({ componentTags }, 'DRAFT_SAVED', 'Evidence tags updated')}/><label className="ae-check"><input type="checkbox" checked={!!active.privacyChecked} onChange={(event) => patch({ privacyChecked: event.target.checked }, 'DRAFT_SAVED', 'Privacy review updated')}/><span>I reviewed the evidence and removed student-identifying information.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.evidence || !active.privacyChecked} onClick={() => patch({ evidencePublishedAt: aeNow() }, 'EVIDENCE_PUBLISHED', 'Formal observation evidence published')}>Publish evidence to teacher</button></div>}
          {step === 3 && role === 'teacher' && <div className="ae-note">Formal observation is in progress. Evidence remains private until the evaluator publishes it.</div>}
          {step === 4 && <div><h4>Published evidence</h4><div className="ae-evidence">{active.evidence}</div><div className="ae-chips">{(active.componentTags || []).map((code) => <span className="ae-chip ae-chip-blue" key={code}>{code}</span>)}</div>{role === 'teacher' ? <><label className="ae-field"><span>Reflection / self-assessment</span><textarea className="ae-textarea" value={active.reflection || ''} onChange={(event) => patch({ reflection: event.target.value }, 'DRAFT_SAVED', 'Teacher reflection draft saved')} placeholder="What worked, what evidence supports that, and what would you change?"/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.reflection} onClick={() => patch({ reflectionSubmittedAt: aeNow() }, 'SUBMITTED', 'Teacher reflection submitted')}>Submit reflection</button></> : <div className="ae-note">Awaiting teacher reflection. The evidence snapshot remains immutable; clarification belongs in the conversation.</div>}</div>}
          {step === 5 && role === 'evaluator' && <div><h4>Teacher reflection</h4><div className="ae-evidence">{active.reflection}</div><label className="ae-field"><span>Post-conference discussion and follow-up</span><textarea className="ae-textarea" value={active.postConferenceNotes || ''} onChange={(event) => patch({ postConferenceNotes: event.target.value }, 'DRAFT_SAVED', 'Post-conference notes updated')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.postConferenceNotes} onClick={() => patch({ postConferenceAt: aeNow() }, 'CONFERENCED', 'Post-conference completed')}>Mark post-conference complete</button></div>}
          {step === 5 && role === 'teacher' && <div className="ae-note">Reflection submitted {aeDateTime(active.reflectionSubmittedAt)}. Awaiting the post-conference.</div>}
          {step === 6 && role === 'evaluator' && <div><div className="ae-note ae-warn">Assign each rating yourself and enter an evidence-linked rationale. The software performs arithmetic only.</div><div className="ae-rating-grid" style={{ marginTop: 12 }}>{AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id}><h4>{domain.code}. {domain.label}</h4><label className="ae-field"><span>Rating</span><select className="ae-select" value={(active.ratings && active.ratings[domain.id]) == null ? '' : active.ratings[domain.id]} onChange={(event) => patch({ ratings: Object.assign({}, active.ratings, { [domain.id]: event.target.value === '' ? null : Number(event.target.value) }) }, 'RATING_UPDATED', 'Formal observation rating updated')}><option value="">Not rated</option>{AE_RATINGS.map((rating) => <option key={rating.value} value={rating.value}>{rating.value} · {rating.label}</option>)}</select></label><label className="ae-field"><span>Rationale</span><textarea className="ae-textarea" style={{ minHeight: 82 }} value={(active.rationales && active.rationales[domain.id]) || ''} onChange={(event) => patch({ rationales: Object.assign({}, active.rationales, { [domain.id]: event.target.value }) }, 'DRAFT_SAVED', 'Rating rationale updated')}/></label></div>)}</div><button type="button" className="ae-btn ae-btn-primary" disabled={AE_DOMAINS.some((domain) => !active.ratings || active.ratings[domain.id] == null || !active.rationales || !active.rationales[domain.id])} onClick={() => patch({ evaluatorSignedAt: aeNow() }, 'SIGNED', 'Evaluator signed formal observation')}>Sign evaluator assessment</button></div>}
          {step === 6 && role === 'teacher' && <div className="ae-note">Post-conference completed {aeDateTime(active.postConferenceAt)}. Awaiting evaluator ratings and rationale.</div>}
          {step === 7 && role === 'teacher' && <div><h4>Evaluator assessment</h4><div className="ae-rating-grid">{AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id}><h4>{domain.label}</h4><div className="ae-score">{active.ratings[domain.id]}</div><p className="ae-sub">{aeRatingLabel(active.ratings[domain.id])}</p><p>{active.rationales[domain.id]}</p></div>)}</div><label className="ae-check"><input type="checkbox" checked={!!active.ackChecked} onChange={(event) => patch({ ackChecked: event.target.checked }, 'DRAFT_SAVED', 'Acknowledgment confirmation updated')}/><span>I received this record and had an opportunity to discuss it. I understand acknowledgment does not mean agreement.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.ackChecked} onClick={() => patch({ teacherAcknowledgedAt: aeNow() }, 'ACKNOWLEDGED', 'Teacher acknowledged formal observation')}>Acknowledge receipt</button></div>}
          {step === 7 && role === 'evaluator' && <div className="ae-note">Evaluator signed {aeDateTime(active.evaluatorSignedAt)}. Awaiting teacher acknowledgment; acknowledgment does not indicate agreement.</div>}
          {step === 8 && role === 'evaluator' && <div><div className="ae-note ae-ok">Teacher acknowledged receipt {aeDateTime(active.teacherAcknowledgedAt)}.</div><p>This finalizes this observation snapshot. Annual O&amp;P domain ratings remain a separate, explicit judgment informed by all cycle evidence; this observation does not overwrite them.</p><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ finalizedAt: aeNow() }, 'FINALIZED', 'Formal observation finalized')}>Finalize formal observation</button></div>}
          {step === 8 && role === 'teacher' && <div className="ae-note">Acknowledgment recorded. Awaiting evaluator finalization.</div>}
          {step === 9 && <div className="ae-note ae-ok"><strong>Formal observation finalized.</strong><br/>Finalized {aeDateTime(active.finalizedAt)}. Published versions remain locked; later context appears as appended comments.</div>}
        </section>
        <aside className="ae-span-5"><AeFrameworkReference/><AeFormalRecordSummary observation={active} role={role}/><div className="ae-card" style={{ marginTop: 16 }}><AeThread workspace={workspace} recordType="formal_observation" recordId={active.id} teacherId={active.teacherId} role={role} onAdd={addComment}/></div></aside>
      </div></>;
    })()}
  </div>;
}

function AeSpm({ workspace, selectedTeacher, setSelectedTeacherId, role, createSpm, updateSpm, updateTeacher, addComment }) {
  const [openId, setOpenId] = React.useState('');
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const records = workspace.spms.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id));
  const active = (selectedTeacher && records.find((record) => record.id === openId && record.teacherId === selectedTeacher.id)) || (selectedTeacher && records.find((record) => record.teacherId === selectedTeacher.id)) || null;
  React.useEffect(() => { if (active && !openId) setOpenId(active.id); }, [active && active.id]);
  React.useEffect(() => {
    if (active && role === 'evaluator' && active.status === 'submitted' && !active.firstOpenedAt) updateSpm(active.id, { firstOpenedAt: aeNow() }, 'OPENED', 'SPM plan first opened by evaluator');
  }, [active && active.id, active && active.status, role]);
  const patch = (changes, event, summary) => updateSpm(active.id, changes, event, summary);
  const canEditPlan = active && role === 'teacher' && ['draft', 'returned'].includes(active.status);
  return <div className="ae-page"><div className="ae-heading"><div><h2>SPM / SLO</h2><p>Current Act 13 terminology is LEA Selected Measure · Student Performance Measure (SPM); SLO remains a familiar local alias.</p></div>{role === 'teacher' && selectedTeacher && !records.some((record) => record.teacherId === selectedTeacher.id) && <button type="button" className="ae-btn ae-btn-primary" onClick={() => setOpenId(createSpm(selectedTeacher.id))}>+ Start SPM proposal</button>}</div>
    {role === 'evaluator' ? <div className="ae-toolbar"><label className="ae-field" style={{ minWidth: 260, margin: 0 }}><span>Educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => { setSelectedTeacherId(event.target.value); const found = workspace.spms.find((record) => record.teacherId === event.target.value); setOpenId(found ? found.id : ''); }}><option value="">Choose an educator</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label></div> : selectedTeacher && <div className="ae-note">Viewing records for {selectedTeacher.name} · {selectedTeacher.code}</div>}
    {!active ? <div className="ae-card ae-empty">{selectedTeacher ? (role === 'teacher' ? 'Start a proposal for the selected educator.' : 'No SPM has been submitted for this educator.') : 'Choose an educator.'}</div> : (() => { const teacher = workspace.teachers.find((item) => item.id === active.teacherId); return <div className="ae-grid"><section className="ae-card ae-span-7"><div className="ae-record-head"><div><h3>{teacher ? teacher.name : 'Educator'} · SPM plan</h3><p className="ae-sub">Version {active.version || 1} · created {aeDateTime(active.createdAt)}</p></div><span className="ae-chip ae-chip-blue">{active.status.replace(/_/g, ' ')}</span></div>
      {active.returnReason && <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>Returned for revision:</strong> {active.returnReason}</div>}
      <fieldset disabled={!canEditPlan} style={{ border: 0, padding: 0, margin: '14px 0 0' }}><label className="ae-field"><span>Classroom context and priority learning need</span><textarea className="ae-textarea" value={active.context || ''} onChange={(event) => patch({ context: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Baseline</span><textarea className="ae-textarea" value={active.baseline || ''} onChange={(event) => patch({ baseline: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Unit / goal statement and expected outcomes</span><textarea className="ae-textarea" value={active.goal || ''} onChange={(event) => patch({ goal: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Performance measures and indicators</span><textarea className="ae-textarea" value={active.measures || ''} onChange={(event) => patch({ measures: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Action plan, supports, and evidence sources</span><textarea className="ae-textarea" value={active.actionPlan || ''} onChange={(event) => patch({ actionPlan: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label></fieldset>
      {canEditPlan && <button type="button" className="ae-btn ae-btn-primary" disabled={!active.context || !active.baseline || !active.goal || !active.measures || !active.actionPlan} onClick={() => patch({ status: 'submitted', submittedAt: aeNow(), version: (active.version || 1) + (active.status === 'returned' ? 1 : 0), returnReason: '' }, 'SUBMITTED', 'SPM plan submitted')}>Submit plan for approval</button>}
      {active.status === 'submitted' && role === 'evaluator' && <div style={{ marginTop: 14 }}><div className="ae-note">Submitted by teacher {aeDateTime(active.submittedAt)}. Approval locks this version; a material revision will require renewed approval.</div><label className="ae-field"><span>Reason if returning</span><textarea className="ae-textarea" value={active.pendingReturnReason || ''} onChange={(event) => patch({ pendingReturnReason: event.target.value }, 'DRAFT_SAVED', 'Return reason drafted')}/></label><div className="ae-actions"><button type="button" className="ae-btn" disabled={!active.pendingReturnReason} onClick={() => patch({ status: 'returned', returnedAt: aeNow(), returnReason: active.pendingReturnReason, pendingReturnReason: '' }, 'RETURNED', 'SPM plan returned for revision')}>Return for revision</button><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ status: 'approved', firstOpenedAt: active.firstOpenedAt || aeNow(), approvedAt: aeNow(), approvedBy: workspace.config.evaluatorName }, 'APPROVED', 'SPM plan approved')}>Approve plan</button></div></div>}
      {active.status === 'submitted' && role === 'teacher' && <div className="ae-note" style={{ marginTop: 12 }}>Submitted {aeDateTime(active.submittedAt)}. Awaiting evaluator action.</div>}
      {active.status === 'approved' && role === 'teacher' && <div style={{ marginTop: 14 }}><div className="ae-note ae-ok">Plan approved by {active.approvedBy} {aeDateTime(active.approvedAt)}.</div><label className="ae-field"><span>Year-end results</span><textarea className="ae-textarea" value={active.results || ''} onChange={(event) => patch({ results: event.target.value }, 'DRAFT_SAVED', 'SPM results draft saved')}/></label><label className="ae-field"><span>Teacher reflection</span><textarea className="ae-textarea" value={active.reflection || ''} onChange={(event) => patch({ reflection: event.target.value }, 'DRAFT_SAVED', 'SPM reflection draft saved')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.results || !active.reflection} onClick={() => patch({ status: 'results_submitted', resultsSubmittedAt: aeNow() }, 'SUBMITTED', 'SPM results submitted')}>Submit results and reflection</button></div>}
      {active.status === 'approved' && role === 'evaluator' && <div className="ae-note ae-ok" style={{ marginTop: 12 }}>Plan approved. Awaiting year-end results from the teacher.</div>}
      {active.status === 'results_submitted' && role === 'evaluator' && <div style={{ marginTop: 14 }}><h4>Year-end results</h4><div className="ae-evidence">{active.results}</div><h4>Teacher reflection</h4><div className="ae-evidence">{active.reflection}</div><label className="ae-field"><span>Human-selected SPM rating</span><select className="ae-select" value={active.rating == null ? '' : active.rating} onChange={(event) => patch({ rating: event.target.value === '' ? null : Number(event.target.value) }, 'RATING_UPDATED', 'SPM rating updated')}><option value="">Not rated</option>{AE_RATINGS.map((rating) => <option value={rating.value} key={rating.value}>{rating.value} · {rating.label}</option>)}</select></label><label className="ae-field"><span>Rating rationale</span><textarea className="ae-textarea" value={active.ratingRationale || ''} onChange={(event) => patch({ ratingRationale: event.target.value }, 'DRAFT_SAVED', 'SPM rating rationale updated')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={active.rating == null || !active.ratingRationale} onClick={() => { updateTeacher(active.teacherId, (draft) => { draft.ratings.lea = active.rating; }, 'RATING_UPDATED', 'LEA Selected Measure rating recorded'); patch({ status: 'locked', lockedAt: aeNow() }, 'FINALIZED', 'SPM record rated and locked'); }}>Rate and lock record</button></div>}
      {active.status === 'results_submitted' && role === 'teacher' && <div className="ae-note" style={{ marginTop: 12 }}>Results submitted {aeDateTime(active.resultsSubmittedAt)}. Awaiting evaluator rating.</div>}
      {active.status === 'locked' && <div className="ae-note ae-ok" style={{ marginTop: 12 }}><strong>Rated and locked · {active.rating} ({aeBand(active.rating)})</strong><br/>Locked {aeDateTime(active.lockedAt)}. Plan approval and final result rating remain separate audit events.</div>}
      <AeThread workspace={workspace} recordType="spm" recordId={active.id} teacherId={active.teacherId} role={role} onAdd={addComment}/>
    </section><aside className="ae-card ae-span-5"><h3>Submission receipts</h3><div className="ae-timeline"><div className="ae-event"><h4>Created</h4><p>{aeDateTime(active.createdAt)}</p></div>{active.submittedAt && <div className="ae-event"><h4>Submitted</h4><p>{aeDateTime(active.submittedAt)}</p></div>}{active.firstOpenedAt && <div className="ae-event"><h4>First opened by evaluator</h4><p>{aeDateTime(active.firstOpenedAt)}</p></div>}{active.approvedAt && <div className="ae-event"><h4>Approved by {active.approvedBy}</h4><p>{aeDateTime(active.approvedAt)}</p></div>}{active.resultsSubmittedAt && <div className="ae-event"><h4>Results submitted</h4><p>{aeDateTime(active.resultsSubmittedAt)}</p></div>}{active.lockedAt && <div className="ae-event"><h4>Rated and locked</h4><p>{aeDateTime(active.lockedAt)}</p></div>}</div><div className="ae-note ae-warn">“Opened” is an automatic access receipt. It does not claim the person read or agreed with the contents; approval and acknowledgment are explicit actions.</div></aside></div>; })()}
  </div>;
}

function AeAuditExport({ workspace, selectedTeacher, exportWorkspace, exportCsv, exportSummary, importWorkspace, resetWorkspace, role, isRemote = false }) {
  const [filter, setFilter] = React.useState('selected');
  const [clearStep, setClearStep] = React.useState(false);
  const fileRef = React.useRef(null);
  const isEvaluator = role === 'evaluator';
  const events = workspace.audit.filter((event) => isEvaluator && filter === 'all' ? true : (selectedTeacher && event.teacherId === selectedTeacher.id));
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? 'Audit, reports, and handoff' : 'My evaluation timeline'}</h2><p>Submission, approval, acknowledgment, comment, and finalization events are distinct.</p></div></div>
    <div className="ae-grid">
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-7' : 'ae-span-12')}>
        <div className="ae-record-head"><div><h3>Audit timeline</h3><p className="ae-sub">{isRemote ? 'This permission-filtered timeline is loaded from the district repository; the server owns the authoritative audit history.' : 'Local prototype events; production requires server-side tamper-evident logs.'}</p></div>{isEvaluator && <select className="ae-select" style={{ width: 'auto' }} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter audit timeline"><option value="selected">Selected educator</option><option value="all">All educators</option></select>}</div>
        {events.length === 0 ? <div className="ae-empty">No matching audit events.</div> : <div className="ae-timeline">{events.slice(0, 150).map((event) => <div className="ae-event" key={event.id}><h4>{event.event.replace(/_/g, ' ')} · {event.summary}</h4><p>{event.actor} · {event.role} · {aeDateTime(event.at)}</p><p>{event.entityType} · version {event.version || 1}</p></div>)}</div>}
      </section>
      {isRemote ? <section className="ae-card ae-span-12"><h3>District exports unavailable</h3><div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>District export policy not configured.</strong><br/>Downloads, imports, and reset are disabled for every portal role until the LEA approves an export policy and an audited server export workflow is implemented.</div></section> : isEvaluator ? <section className="ae-card ae-span-5">
        <h3>Export and transfer</h3>
        <p className="ae-sub">Exports can contain confidential personnel information. Store and transmit them only through district-authorized systems.</p>
        <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn" onClick={exportWorkspace}>Export workspace JSON</button><button type="button" className="ae-btn" onClick={exportCsv}>Export status CSV</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportSummary}>Workflow summary HTML</button></div>
        <hr style={{ border: 0, borderTop: '1px solid #d8deea', margin: '18px 0' }}/>
        <h4>Import another device export</h4>
        <p className="ae-sub">Import replaces this local prototype workspace after validation. Export first if you need a backup.</p>
        <button type="button" className="ae-btn" onClick={() => fileRef.current && fileRef.current.click()}>Choose JSON export</button>
        <input ref={fileRef} hidden tabIndex={-1} aria-label="Import evaluation workspace JSON" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files && event.target.files[0]; if (file) importWorkspace(file); event.target.value = ''; }}/>
        <div className="ae-note ae-warn" style={{ marginTop: 16 }}>This export assists front-end supervision work. PEERS or your LEA-authorized system remains the official summative rating record for this MVP.</div>
        {workspace.config.sampleMode && <div style={{ marginTop: 18 }}><h4>Sample workspace</h4>{!clearStep ? <button type="button" className="ae-btn ae-btn-danger" onClick={() => setClearStep(true)}>Replace sample with blank workspace</button> : <div className="ae-note ae-danger"><strong>This removes all current local prototype records.</strong><div className="ae-actions" style={{ marginTop: 8 }}><button className="ae-btn" type="button" onClick={() => setClearStep(false)}>Cancel</button><button className="ae-btn ae-btn-danger" type="button" onClick={() => { setClearStep(false); resetWorkspace(); }}>Confirm and start blank</button></div></div>}</div>}
      </section> : <section className="ae-card ae-span-12"><h3>My copy</h3><p className="ae-sub">Download only the selected educator’s workflow summary.</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportSummary}>Download my summary HTML</button><div className="ae-note" style={{ marginTop: 12 }}>Teacher view cannot export or import the full workspace or view organization-wide audit events.</div></section>}
    </div>
  </div>;
}

function AeAbout({ workspace, updateConfig, role, isRemote = false, currentUser = null }) {
  const set = (field, value) => updateConfig(field, value);
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>Setup, sources, and {isRemote ? 'district boundary' : 'production boundary'}</h2><p>{isRemote ? 'Review the authenticated repository boundary and the approvals that still belong to your district.' : 'Configure this prototype and review what is required before a school adopts it.'}</p></div></div>
    <div className="ae-grid">
      <section className="ae-card ae-span-6"><h3>Workspace setup</h3><fieldset disabled={isRemote || role !== 'evaluator'} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-field"><span>Organization / LEA</span><input className="ae-input" value={workspace.config.organization} onChange={(event) => set('organization', event.target.value)}/></label><div className="ae-form-grid"><label className="ae-field"><span>Building</span><input className="ae-input" value={workspace.config.building} onChange={(event) => set('building', event.target.value)}/></label><label className="ae-field"><span>Academic year</span><input className="ae-input" value={workspace.config.academicYear} onChange={(event) => set('academicYear', event.target.value)}/></label><label className="ae-field"><span>Evaluator name</span><input className="ae-input" value={workspace.config.evaluatorName} onChange={(event) => set('evaluatorName', event.target.value)}/></label><label className="ae-field"><span>Evaluator initials</span><input className="ae-input" value={workspace.config.evaluatorInitials} onChange={(event) => set('evaluatorInitials', event.target.value)}/></label></div></fieldset>{isRemote && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}>Portal configuration is read-only. An authorized district administrator or IT must use the reviewed setup process to change repository configuration.</div>}<div className="ae-note">Framework snapshot: Pennsylvania Act 13 classroom-teacher framework, June 2021. Full performance-level rubric text is not bundled.</div></section>
      <section className="ae-card ae-span-6"><h3>Official references</h3><ul><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pa.gov/agencies/education/programs-and-services/educators/educator-effectiveness">Pennsylvania Department of Education · Educator Effectiveness</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pacodeandbulletin.gov/secure/pacode/data/022/chapter19/s19.2a.html">22 Pa. Code § 19.2a · Classroom teachers</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pdesas.org/Page/Viewer/ViewPage/75">PDE/SAS Act 13 Toolkit</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://danielsongroup.org/the-framework-for-teaching/">Danielson Group · Framework access and licensing</a></li></ul><div className="ae-note ae-warn">The older 50% observation model is not the default current Act 13 classroom-teacher composition. This workspace uses assignment-aware 70/10/10/10, 80% O&amp;P where Building Level Data is unavailable, and 100% O&amp;P for temporary classroom teachers.</div></section>
      {isRemote ? <section className="ae-card ae-span-12"><h3>District-hosted portal boundary</h3><div className="ae-grid"><div className="ae-span-4"><h4>Verified identity</h4><p className="ae-sub">Signed in as {currentUser && currentUser.email ? currentUser.email : 'a managed district user'}. The server—not an emailed link—determines role and record assignments.</p></div><div className="ae-span-4"><h4>Repository and audit</h4><p className="ae-sub">The district Apps Script repository validates authorized mutations, versions saves, filters reads, and records server-side audit events. Drive is not exposed as an open storage bin.</p></div><div className="ae-span-4"><h4>District responsibilities</h4><p className="ae-sub">The LEA still controls deployment, membership, evaluator assignments, retention, legal hold, incident response, approved forms, and any licensed Danielson content.</p></div></div><div className="ae-note ae-warn"><strong>Google Workspace does not make a custom app automatically FERPA compliant.</strong> Use this portal for real records only after your LEA authorizes the deployment and confirms its privacy, security, records, and employment-policy requirements.</div></section> :
      <section className="ae-card ae-span-12"><h3>What production still requires</h3><div className="ae-grid"><div className="ae-span-4"><h4>Identity and permissions</h4><p className="ae-sub">District SSO/MFA, tenant isolation, assigned-evaluator access, co-evaluator rules, and an educator-only view.</p></div><div className="ae-span-4"><h4>Records and security</h4><p className="ae-sub">Encrypted server datastore and backups, retention/legal hold, malware-scanned attachments with version history, conflict handling, and tamper-evident audit. This MVP accepts text and approved document references only.</p></div><div className="ae-span-4"><h4>Approval and licensing</h4><p className="ae-sub">LEA authorization, FERPA/security review, approved rating forms/process, and permission for any licensed Danielson descriptor content.</p></div></div><div className="ae-note ae-danger"><strong>Do not use this local prototype as a personnel record.</strong> Role switching is only a demonstration; it is not authentication or access control. Do not enter real names, student information, ratings, or confidential evidence until a district-authorized production backend is connected.</div></section>}
    </div>
  </div>;
}
function aeRemoteScopedWorkspace(value, currentUser) {
  const normalized = aeNormalizeWorkspace(value);
  if (!normalized) return null;
  if (!currentUser || currentUser.role !== 'teacher') return normalized;
  const teacherId = aeSafeId(currentUser.teacherId, '');
  if (!teacherId || !normalized.teachers.some((teacher) => teacher.id === teacherId)) return null;
  normalized.teachers = normalized.teachers.filter((teacher) => teacher.id === teacherId);
  normalized.walkthroughs = normalized.walkthroughs.filter((item) => item.teacherId === teacherId && item.publishedAt);
  normalized.observations = normalized.observations.filter((item) => item.teacherId === teacherId);
  normalized.spms = normalized.spms.filter((item) => item.teacherId === teacherId);
  normalized.comments = normalized.comments.filter((item) => item.teacherId === teacherId);
  normalized.audit = normalized.audit.filter((item) => item.teacherId === teacherId);
  normalized.cycleSnapshots = normalized.cycleSnapshots.filter((item) => item.teacherId === teacherId);
  return normalized;
}
function EducatorEvaluationPanel(props) {
  const { onClose = (() => {}), addToast = (() => {}), standalone = false, repository = null, initialRoute = null } = props || {};
  const isRemote = !!repository && typeof repository.bootstrap === 'function' && typeof repository.saveWorkspace === 'function';
  const [workspace, setWorkspace] = React.useState(() => isRemote ? aeBlankWorkspace() : (aeLoad() || aeSampleWorkspace()));
  const [role, setRole] = React.useState('evaluator');
  const [tab, setTab] = React.useState('overview');
  const [selectedTeacherId, setSelectedTeacherId] = React.useState(() => (workspace.teachers[0] && workspace.teachers[0].id) || '');
  const [liveMessage, setLiveMessage] = React.useState({ text: '', id: 0 });
  const [remoteState, setRemoteState] = React.useState(() => ({ status: isRemote ? 'loading' : 'local', error: '', currentUser: null, deployment: null, inFlight: false }));
  const [notificationState, setNotificationState] = React.useState({ status: 'idle', error: '' });
  const dialogRef = React.useRef(null);
  const workspaceRef = React.useRef(workspace);
  const remoteRevisionRef = React.useRef(0);
  const remoteSaveQueueRef = React.useRef(Promise.resolve());
  const remoteSaveGenerationRef = React.useRef(0);
  const remoteDebounceRef = React.useRef(null);
  const remotePendingRef = React.useRef(null);
  const remoteMountedRef = React.useRef(true);
  const remoteUserRef = React.useRef(null);
  const remoteInFlightRef = React.useRef(false);
  const selectedTeacher = workspace.teachers.find((teacher) => teacher.id === selectedTeacherId) || null;

  React.useEffect(() => { workspaceRef.current = workspace; if (!isRemote) aeStore(workspace); }, [workspace, isRemote]);
  React.useEffect(() => {
    if (!selectedTeacher && workspace.teachers[0]) setSelectedTeacherId(workspace.teachers[0].id);
    if (isRemote && role === 'teacher' && remoteState.currentUser && remoteState.currentUser.teacherId && selectedTeacherId !== remoteState.currentUser.teacherId) {
      setSelectedTeacherId(remoteState.currentUser.teacherId);
    }
  }, [workspace.teachers.length, selectedTeacherId, role, isRemote, remoteState.currentUser]);
  const loadRemoteWorkspace = React.useCallback(async () => {
    if (!isRemote) return;
    setRemoteState((current) => ({ ...current, status: 'loading', error: '', inFlight: false }));
    try {
      const payload = await repository.bootstrap();
      if (!payload || payload.ok === false) throw new Error((payload && payload.error) || 'The district portal did not return a workspace.');
      const normalized = aeNormalizeWorkspace(payload.workspace);
      if (!normalized) throw new Error('The district portal returned an invalid workspace.');
      const currentUser = aePlainObject(payload.currentUser) ? payload.currentUser : null;
      const nextRole = currentUser && currentUser.role === 'teacher' ? 'teacher' : 'evaluator';
      if (!currentUser || !aeString(currentUser.email, 320, '')) throw new Error('The district portal could not verify your managed Google account.');
      if (nextRole === 'teacher') {
        const teacherId = aeSafeId(currentUser.teacherId, '');
        if (!teacherId || !normalized.teachers.some((teacher) => teacher.id === teacherId)) throw new Error('No educator evaluation assignment is linked to this account.');
        normalized.teachers = normalized.teachers.filter((teacher) => teacher.id === teacherId);
        normalized.walkthroughs = normalized.walkthroughs.filter((item) => item.teacherId === teacherId && item.publishedAt);
        normalized.observations = normalized.observations.filter((item) => item.teacherId === teacherId);
        normalized.spms = normalized.spms.filter((item) => item.teacherId === teacherId);
        normalized.comments = normalized.comments.filter((item) => item.teacherId === teacherId);
        normalized.audit = normalized.audit.filter((item) => item.teacherId === teacherId);
        normalized.cycleSnapshots = normalized.cycleSnapshots.filter((item) => item.teacherId === teacherId);
      }
      const route = aePlainObject(initialRoute) ? initialRoute : (typeof repository.getInitialRoute === 'function' ? repository.getInitialRoute() : null);
      const requestedTeacherId = aeSafeId(route && route.teacherId, '');
      const nextTeacherId = nextRole === 'teacher'
        ? aeSafeId(currentUser.teacherId, '')
        : (requestedTeacherId && normalized.teachers.some((teacher) => teacher.id === requestedTeacherId)
          ? requestedTeacherId
          : ((normalized.teachers[0] && normalized.teachers[0].id) || ''));
      const allowedViews = nextRole === 'teacher'
        ? ['overview', 'trends', 'walkthroughs', 'formal', 'spm', 'audit', 'about']
        : ['overview', 'trends', 'staff', 'walkthroughs', 'formal', 'spm', 'audit', 'about'];
      const requestedView = aeString(route && route.view, 24, '').toLowerCase();
      const revision = Number(payload.revision);
      remoteRevisionRef.current = Number.isInteger(revision) && revision >= 0 ? revision : 0;
      workspaceRef.current = normalized;
      setWorkspace(normalized);
      setRole(nextRole);
      setSelectedTeacherId(nextTeacherId);
      setTab(allowedViews.includes(requestedView) ? requestedView : 'overview');
      remoteUserRef.current = currentUser;
      setRemoteState({ status: 'saved', error: '', currentUser, deployment: aePlainObject(payload.deployment) ? payload.deployment : null, inFlight: false });
    } catch (error) {
      if (!remoteMountedRef.current) return;
      setRemoteState((current) => ({ ...current, status: 'error', error: String((error && error.message) || error || 'Unable to open the district portal.'), inFlight: false }));
    }
  }, [isRemote, repository, initialRoute]);

  React.useEffect(() => {
    remoteMountedRef.current = true;
    if (isRemote) loadRemoteWorkspace();
    return () => {
      remoteMountedRef.current = false;
      if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
    };
  }, [isRemote, loadRemoteWorkspace]);

  React.useEffect(() => {
    if (!isRemote) return undefined;
    const beforeUnload = (event) => {
      const pending = remoteInFlightRef.current || remoteState.status === 'saving' || !!remoteDebounceRef.current || !!remotePendingRef.current;
      if (!pending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isRemote, remoteState.status]);

  React.useEffect(() => {
    if (standalone) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previous = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const focusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => !el.closest('[hidden],[inert],[aria-hidden="true"]'));
    (focusable()[0] || dialog).focus();
    const keydown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      const wasTop = isTopTrap();
      const index = trapStack.indexOf(trap);
      if (index !== -1) trapStack.splice(index, 1);
      if (wasTop && previous && previous !== document.body && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, [standalone, onClose]);

  const announce = React.useCallback((message) => {
    setLiveMessage((current) => ({ text: '', id: current.id + 1 }));
    setTimeout(() => setLiveMessage((current) => ({ text: message, id: current.id + 1 })), 0);
  }, []);

  const sendPortalNotice = React.useCallback(async () => {
    if (!isRemote || !selectedTeacher || typeof repository.sendNotification !== 'function' || notificationState.status === 'sending') return;
    const target = role === 'teacher' ? 'evaluator' : 'teacher';
    setNotificationState({ status: 'sending', error: '' });
    try {
      const result = await repository.sendNotification({ teacherId: selectedTeacher.id, target });
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || 'The portal notice could not be sent.');
      if (!remoteMountedRef.current) return;
      setNotificationState({ status: 'sent', error: '' });
      const message = role === 'teacher' ? 'A content-free portal notice was emailed to your evaluator.' : 'A content-free portal notice was emailed to the educator.';
      announce(message);
      addToast(message, 'success');
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || 'The portal notice could not be sent.');
      setNotificationState({ status: 'error', error: message });
      addToast(message, 'error');
    }
  }, [isRemote, selectedTeacher, repository, notificationState.status, role, announce, addToast]);

  const enqueueRemoteSave = React.useCallback((job) => {
    if (!isRemote || !job || remoteInFlightRef.current) return;
    remoteInFlightRef.current = true;
    setRemoteState((current) => ({ ...current, status: 'saving', error: '', inFlight: true }));
    remoteSaveQueueRef.current = remoteSaveQueueRef.current.catch(() => undefined).then(async () => {
      const result = await repository.saveWorkspace({
        workspace: job.workspace,
        expectedVersion: remoteRevisionRef.current,
        mutation: job.mutation,
      });
      if (!result || result.ok === false) {
        const error = new Error((result && (result.error || result.message)) || 'The district portal did not save the change.');
        if (result && result.code) error.code = result.code;
        throw error;
      }
      const revision = Number(result.revision);
      if (!Number.isInteger(revision) || revision < 0) throw new Error('The district portal returned an invalid record version.');
      remoteRevisionRef.current = revision;
      if (!remoteMountedRef.current) { remoteInFlightRef.current = false; return; }
      if (job.generation === remoteSaveGenerationRef.current && result.workspace) {
        const canonical = aeRemoteScopedWorkspace(result.workspace, remoteUserRef.current);
        if (!canonical) throw new Error('The district portal returned an invalid saved workspace.');
        workspaceRef.current = canonical;
        setWorkspace(canonical);
      }
      remoteInFlightRef.current = false;
      if (job.generation === remoteSaveGenerationRef.current) {
        setRemoteState((current) => ({ ...current, status: 'saved', error: '', inFlight: false }));
      }
    }).catch((error) => {
      remoteInFlightRef.current = false;
      if (!remoteMountedRef.current || job.generation !== remoteSaveGenerationRef.current) return;
      const message = String((error && error.message) || error || 'The district portal could not save this change.');
      setRemoteState((current) => ({ ...current, status: 'error', error: message, inFlight: false }));
      addToast(message, 'error');
    });
  }, [isRemote, repository, addToast]);

  const queueRemoteSave = React.useCallback((snapshot, audit) => {
    if (!isRemote) return;
    const generation = ++remoteSaveGenerationRef.current;
    const mutation = audit ? {
      teacherId: aeSafeId(audit.teacherId, ''), event: aeString(audit.event, 40, ''),
      summary: aeString(audit.summary, 240, ''), entityType: aeString(audit.entityType, 60, ''),
      entityId: aeSafeId(audit.entityId, ''), version: Math.max(1, parseInt(audit.version, 10) || 1),
    } : null;
    const job = { workspace: aeClone(snapshot), mutation, generation };
    const debounced = mutation && ['DRAFT_SAVED', 'PROFILE_UPDATED', 'CONFIG_UPDATED', 'RATING_UPDATED'].includes(mutation.event);
    if (debounced) {
      remotePendingRef.current = job;
      if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
      setRemoteState((current) => ({ ...current, status: 'saving', error: '' }));
      remoteDebounceRef.current = setTimeout(() => {
        remoteDebounceRef.current = null;
        const pending = remotePendingRef.current;
        remotePendingRef.current = null;
        enqueueRemoteSave(pending);
      }, 700);
      return;
    }
    if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
    remoteDebounceRef.current = null;
    remotePendingRef.current = null;
    enqueueRemoteSave(job);
  }, [isRemote, enqueueRemoteSave]);

  const commit = React.useCallback((mutator, audit, message) => {
    if (isRemote && (remoteInFlightRef.current || remoteState.status === 'error')) {
      const waitMessage = remoteState.status === 'error'
        ? 'Reload the district copy before making another change.'
        : 'Please wait for the current district save to finish before making another change.';
      announce(waitMessage);
      addToast(waitMessage, 'error');
      return;
    }
    const next = aeClone(workspaceRef.current);
    mutator(next);
    const durableAudit = audit && !['DRAFT_SAVED', 'PROFILE_UPDATED', 'CONFIG_UPDATED'].includes(audit.event);
    if (durableAudit && !isRemote) {
      aeAuditEvent(next, audit, role === 'teacher' ? ((next.teachers.find((teacher) => teacher.id === (audit.teacherId || selectedTeacherId)) || {}).name || 'Teacher') : (next.config.evaluatorName || 'Evaluator'), role === 'teacher' ? 'Teacher' : 'Evaluator');
    }
    workspaceRef.current = next;
    setWorkspace(next);
    if (isRemote) queueRemoteSave(next, audit);
    if (message) {
      announce(message);
      addToast(message, 'success');
      if (audit && ['SUBMITTED', 'CONFERENCED', 'EVIDENCE_PUBLISHED', 'SIGNED', 'ACKNOWLEDGED', 'FINALIZED', 'APPROVED', 'RETURNED', 'RELEASED'].includes(audit.event)) {
        requestAnimationFrame(() => { const panel = document.getElementById('ae-panel'); if (panel) panel.focus(); });
      }
    }
  }, [role, selectedTeacherId, addToast, announce, isRemote, queueRemoteSave, remoteState.status]);

  const updateTeacher = (id, mutator, event, summary) => commit((next) => {
    const teacher = next.teachers.find((item) => item.id === id);
    if (!teacher || teacher.finalizedAt) return;
    mutator(teacher);
    teacher.lastActivityAt = aeNow();
    if (event === 'RATING_UPDATED' && teacher.cycleStatus !== 'finalized') teacher.cycleStatus = 'in_progress';
    if (event === 'RELEASED' && teacher.finalizedAt) {
      next.cycleSnapshots = Array.isArray(next.cycleSnapshots) ? next.cycleSnapshots : [];
      const academicYear = next.config.academicYear;
      const existing = next.cycleSnapshots.find((snapshot) => snapshot.teacherId === id && snapshot.academicYear === academicYear);
      const snapshot = {
        id: existing ? existing.id : aeId('cycle'), teacherId: id, staffCodeSnapshot: teacher.code,
        academicYear, buildingSnapshot: teacher.building, employeeTypeSnapshot: teacher.employeeType,
        finalizedAt: teacher.finalizedAt, finalScore: aeRatingValue(teacher.finalScore),
        domainRatings: aeClone(teacher.ratings.domains), weightSnapshot: aeClone(teacher.weightSnapshot || aeWeightProfile(teacher)),
        frameworkVersion: teacher.frameworkVersion || AE_FRAMEWORK,
      };
      if (existing) Object.assign(existing, snapshot); else next.cycleSnapshots.push(snapshot);
    }
  }, { teacherId: id, event, summary, entityType: 'educator_cycle', entityId: id }, null);

  const addTeacher = () => {
    const id = aeId('teacher');
    commit((next) => { next.teachers.push({ id, code: 'T-' + String(next.teachers.length + 1).padStart(2, '0'), name: 'New Educator', building: next.config.building, assignment: '', employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true, evaluator: next.config.evaluatorName, dueDate: '', cycleStatus: 'not_started', ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null } }); }, { teacherId: id, event: 'CREATED', summary: 'Educator evaluation assignment created', entityType: 'educator_cycle', entityId: id }, 'Educator added');
    setSelectedTeacherId(id);
  };

  const createWalkthrough = (data) => {
    const id = aeId('walk'); const now = aeNow();
    commit((next) => {
      next.walkthroughs.unshift(Object.assign({
        id, createdAt: now, observer: next.config.evaluatorName, version: 1, teacherAcknowledgedAt: null,
      }, data, { startedAt: data.startedAt || now, publishedAt: data.published ? now : null }));
      const teacher = next.teachers.find((item) => item.id === data.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, data.teacherId);
    }, { teacherId: data.teacherId, event: data.published ? 'EVIDENCE_PUBLISHED' : 'DRAFT_SAVED', summary: data.published ? 'Walkthrough published to teacher' : 'Private walkthrough draft saved', entityType: 'walkthrough', entityId: id }, data.published ? 'Walkthrough published' : 'Draft saved');
    return id;
  };

  const publishWalkthrough = (id) => {
    const record = workspace.walkthroughs.find((item) => item.id === id);
    if (!record || record.publishedAt) return;
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item || item.publishedAt) return;
      item.privacyChecked = true;
      item.publishedAt = aeNow();
      item.updatedAt = item.publishedAt;
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = item.updatedAt; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'EVIDENCE_PUBLISHED', summary: 'Saved walkthrough draft published to teacher', entityType: 'walkthrough', entityId: id, version: record.version || 1 }, 'Walkthrough published');
  };

  const acknowledgeWalkthrough = (id) => {
    const record = workspace.walkthroughs.find((item) => item.id === id);
    if (!record || !record.publishedAt || record.teacherAcknowledgedAt) return;
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item) return;
      item.teacherAcknowledgedAt = aeNow();
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'ACKNOWLEDGED', summary: 'Teacher acknowledged walkthrough receipt', entityType: 'walkthrough', entityId: id }, 'Receipt acknowledged');
  };

  const createObservation = (teacherId) => {
    const id = aeId('formal'); const now = aeNow();
    commit((next) => {
      next.observations.unshift({ id, teacherId, createdAt: now, frameworkVersion: AE_FRAMEWORK, version: 1, prework: {}, ratings: { d1: null, d2: null, d3: null, d4: null }, rationales: {}, componentTags: [] });
      const teacher = next.teachers.find((item) => item.id === teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, teacherId);
    }, { teacherId, event: 'ASSIGNED', summary: 'Formal observation assigned', entityType: 'formal_observation', entityId: id }, 'Formal observation assigned');
    return id;
  };

  const updateObservation = (id, changes, event, summary) => {
    const record = workspace.observations.find((item) => item.id === id);
    if (!record || record.finalizedAt) return;
    commit((next) => {
      const item = next.observations.find((value) => value.id === id);
      if (!item || item.finalizedAt) return;
      Object.assign(item, changes);
      item.updatedAt = aeNow();
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = item.updatedAt; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event, summary, entityType: 'formal_observation', entityId: id, version: record.version || 1 }, event !== 'DRAFT_SAVED' ? summary : null);
  };

  const createSpm = (teacherId) => {
    const existing = workspace.spms.find((item) => item.teacherId === teacherId);
    if (existing) return existing.id;
    const id = aeId('spm'); const now = aeNow();
    commit((next) => {
      next.spms.unshift({ id, teacherId, createdAt: now, status: 'draft', version: 1, context: '', baseline: '', goal: '', measures: '', actionPlan: '', revisions: [] });
      const teacher = next.teachers.find((item) => item.id === teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, teacherId);
    }, { teacherId, event: 'CREATED', summary: 'SPM proposal created', entityType: 'spm', entityId: id }, 'SPM proposal started');
    return id;
  };

  const updateSpm = (id, changes, event, summary) => {
    const record = workspace.spms.find((item) => item.id === id);
    if (!record || record.status === 'locked') return;
    commit((next) => {
      const item = next.spms.find((value) => value.id === id);
      if (!item || item.status === 'locked') return;
      const now = aeNow();
      if (event === 'SUBMITTED' && changes.status === 'submitted') {
        const revision = {
          version: changes.version || item.version || 1, submittedAt: changes.submittedAt || now,
          context: item.context || '', baseline: item.baseline || '', goal: item.goal || '',
          measures: item.measures || '', actionPlan: item.actionPlan || '',
        };
        item.revisions = (Array.isArray(item.revisions) ? item.revisions : []).concat(revision).slice(-20);
      }
      Object.assign(item, changes);
      item.updatedAt = now;
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event, summary, entityType: 'spm', entityId: id, version: changes.version || record.version || 1 }, event !== 'DRAFT_SAVED' ? summary : null);
  };
  const addComment = ({ recordType, recordId, teacherId, text }) => commit((next) => { next.comments.push({ id: aeId('comment'), recordType, recordId, teacherId, text, role: role === 'teacher' ? 'Teacher' : 'Evaluator', author: role === 'teacher' ? ((next.teachers.find((teacher) => teacher.id === teacherId) || {}).name || 'Teacher') : next.config.evaluatorName, at: aeNow(), version: 1 }); }, { teacherId, event: 'COMMENTED', summary: 'Shared comment posted', entityType: recordType, entityId: recordId }, 'Comment posted');

  const updateConfig = (field, value) => commit((next) => { next.config[field] = value; }, { event: 'CONFIG_UPDATED', summary: 'Workspace configuration updated', entityType: 'workspace', entityId: 'config' }, null);

  const resetWorkspace = () => {
    const blank = aeBlankWorkspace();
    workspaceRef.current = blank;
    setWorkspace(blank);
    setSelectedTeacherId('');
    setTab('overview');
    announce('Blank prototype workspace started');
    addToast('Blank prototype workspace started', 'success');
  };

  const exportWorkspace = () => { const payload = Object.assign({}, workspace, { kind: AE_EXPORT_KIND, exportedAt: aeNow() }); aeDownload('alloflow-evaluation-' + aeToday() + '.json', 'application/json', JSON.stringify(payload, null, 2)); commit(() => {}, { event: 'EXPORTED', summary: 'Workspace JSON exported', entityType: 'workspace', entityId: 'workspace' }, 'Workspace export created'); };
  const exportCsv = () => { const rows = workspace.teachers.map((teacher) => ({ staff_code: teacher.code, educator: teacher.name, building: teacher.building, assignment: teacher.assignment, employee_type: teacher.employeeType, evaluation_status: aeTeacherStatus(teacher), due_date: teacher.dueDate, evaluator: teacher.evaluator, walkthroughs: workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt).length, formal_observation: workspace.observations.some((item) => item.teacherId === teacher.id && item.finalizedAt) ? 'finalized' : (workspace.observations.some((item) => item.teacherId === teacher.id) ? 'in_progress' : 'not_started'), spm_status: (workspace.spms.find((item) => item.teacherId === teacher.id) || {}).status || 'not_started' })); aeDownload('evaluation-status-' + aeToday() + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + aeCsv(rows)); commit(() => {}, { event: 'EXPORTED', summary: 'Evaluation status CSV exported', entityType: 'workspace', entityId: 'workspace' }, 'Status CSV created'); };
  const exportSummary = () => {
    if (!selectedTeacher) return; const score = aeOverallScore(selectedTeacher); const profile = aeWeightProfile(selectedTeacher);
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Evaluation workflow summary</title><style>body{font:14px system-ui;color:#172033;max-width:850px;margin:40px auto;padding:0 24px}h1{color:#173e70}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #ccd5e2;padding:8px;text-align:left}.notice{padding:12px;background:#fff8e8;border:1px solid #e5bd59}</style></head><body><h1>Educator evaluation workflow summary</h1><p><strong>' + aeEsc(workspace.config.organization) + '</strong> · ' + aeEsc(workspace.config.academicYear) + '</p><h2>' + aeEsc(selectedTeacher.name) + ' · ' + aeEsc(selectedTeacher.code) + '</h2><p>' + aeEsc(selectedTeacher.assignment) + ' · evaluator ' + aeEsc(selectedTeacher.evaluator) + '</p><h2>Weighting snapshot</h2><table><thead><tr><th>Factor</th><th>Weight</th></tr></thead><tbody>' + profile.map((part) => '<tr><td>' + aeEsc(part.label) + '</td><td>' + part.weight + '%</td></tr>').join('') + '</tbody></table><h2>Observation &amp; Practice ratings</h2><table><thead><tr><th>Domain</th><th>Weight within O&amp;P</th><th>Rating</th></tr></thead><tbody>' + AE_DOMAINS.map((domain) => '<tr><td>' + aeEsc(domain.label) + '</td><td>' + domain.weight + '%</td><td>' + aeEsc(selectedTeacher.ratings.domains[domain.id] == null ? 'Not rated' : selectedTeacher.ratings.domains[domain.id]) + '</td></tr>').join('') + '</tbody></table><p><strong>Calculation preview:</strong> ' + (score == null ? 'Incomplete' : score.toFixed(2) + ' · ' + aeBand(score)) + '</p><p class="notice"><strong>Workflow aid only.</strong> This is not an official PDE rating form or proof of PEERS release. Verify all inputs and complete the LEA-authorized process.</p><p>Generated ' + aeEsc(aeDateTime(aeNow())) + '</p></body></html>';
    aeDownload('evaluation-summary-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', html); commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: 'Educator workflow summary exported', entityType: 'evaluation', entityId: selectedTeacher.id }, 'Summary export created');
  };
  const importWorkspace = (file) => {
    if (!file || file.size > 5 * 1024 * 1024) { addToast('Import failed: choose a JSON export smaller than 5 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onerror = () => addToast('Import failed: the selected file could not be read.', 'error');
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (parsed.kind !== AE_EXPORT_KIND || Number(parsed.version) !== 1) throw new Error('Not an AlloFlow Educator Evaluation v1 export.');
        const normalized = aeNormalizeWorkspace(parsed);
        if (!normalized) throw new Error('Invalid workspace structure.');
        aeAuditEvent(normalized, { event: 'IMPORTED', summary: 'Validated workspace imported from JSON', entityType: 'workspace', entityId: 'workspace' }, normalized.config.evaluatorName || 'Evaluator', 'Evaluator');
        workspaceRef.current = normalized;
        setWorkspace(normalized);
        setSelectedTeacherId((normalized.teachers[0] && normalized.teachers[0].id) || '');
        setTab('overview');
        addToast('Workspace imported', 'success');
      } catch (error) {
        addToast('Import failed: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  const tabs = role === 'teacher' ? [
    ['overview', 'My evaluation'], ['trends', 'My trends'], ['walkthroughs', 'My evidence'], ['formal', 'Formal observation'], ['spm', 'SPM / SLO'], ['audit', 'Timeline'], ['about', 'About'],
  ] : [
    ['overview', 'Overview'], ['trends', 'Trends'], ['staff', 'Staff'], ['walkthroughs', 'Walkthroughs'], ['formal', 'Formal observations'], ['spm', 'SPM / SLO'], ['audit', 'Reports & audit'], ['about', 'Setup'],
  ];
  React.useEffect(() => { if (!tabs.some((item) => item[0] === tab)) setTab('overview'); }, [role]);
  const blockRemoteMutation = (event) => { if (!isRemote || (!remoteState.inFlight && remoteState.status !== 'error')) return; event.preventDefault(); event.stopPropagation(); };
  const tabKey = (event, index) => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); let next = index; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; setTab(tabs[next][0]); requestAnimationFrame(() => { const el = document.getElementById('ae-tab-' + tabs[next][0]); if (el) el.focus(); }); };

  if (isRemote && (remoteState.status === 'loading' || (remoteState.status === 'error' && !remoteState.currentUser))) {
    const failed = remoteState.status === 'error';
    const gateBody = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-title" aria-busy={failed ? undefined : 'true'}>
      <header className="ae-top"><div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1 id="ae-title">Educator Growth &amp; Evaluation</h1><p>District-authenticated portal</p></div></div>{!standalone && <button type="button" className="ae-close" onClick={onClose} aria-label="Close Educator Growth and Evaluation">×</button>}</header>
      <main className="ae-main"><div className="ae-page"><section className="ae-card" role={failed ? 'alert' : 'status'} aria-live={failed ? 'assertive' : 'polite'}><h2>{failed ? 'The secure workspace could not be opened' : 'Loading your district evaluation workspace'}</h2><p>{failed ? remoteState.error : 'Verifying your managed Google account and assigned records…'}</p>{failed && <div className="ae-actions" style={{ marginTop: 14 }}><button type="button" className="ae-btn ae-btn-primary" onClick={loadRemoteWorkspace}>Try again</button></div>}</section></div></main>
      <footer className="ae-footer"><span>Records remain hidden until identity and assignments are verified.</span><span>District Apps Script repository</span></footer>
    </div>;
    return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'} onClick={standalone ? undefined : (event) => { if (event.target === event.currentTarget) onClose(); }}><AeStyles/>{gateBody}</div>;
  }
  const body = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-title">
    <header className="ae-top">
      <div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1 id="ae-title">Educator Growth &amp; Evaluation</h1><p>{workspace.config.organization} · {workspace.config.academicYear}</p></div></div>
      <div className="ae-top-actions">{!isRemote && <div className="ae-role" aria-label="Prototype role view"><button type="button" aria-pressed={role === 'evaluator'} onClick={() => setRole('evaluator')}>Evaluator</button><button type="button" aria-pressed={role === 'teacher'} onClick={() => setRole('teacher')}>Teacher</button></div>}{!standalone && <button type="button" className="ae-close" onClick={onClose} aria-label="Close Educator Growth and Evaluation">×</button>}</div>
    </header>
    {isRemote ? <div className={'ae-local-banner ae-remote-banner ' + (remoteState.status === 'error' ? 'ae-sync-error' : '')} role={remoteState.status === 'error' ? 'alert' : 'status'} aria-live="polite">
      <strong>District Google account</strong>
      <span>{remoteState.currentUser && remoteState.currentUser.email} · {role === 'teacher' ? 'Educator access' : 'Evaluator access'} · {remoteState.status === 'saving' ? 'Saving to district repository…' : (remoteState.status === 'error' ? 'Last change is not confirmed: ' + remoteState.error : 'Saved to district repository')}</span>
      {remoteState.status === 'saved' && <button type="button" className="ae-btn" onClick={loadRemoteWorkspace}>Refresh</button>}
      {remoteState.status === 'error' && <button type="button" className="ae-btn" onClick={loadRemoteWorkspace}>Reload district copy</button>}
      {typeof repository.sendNotification === 'function' && <button type="button" className="ae-btn" disabled={!selectedTeacher || notificationState.status === 'sending' || remoteState.status === 'saving'} onClick={sendPortalNotice}>{notificationState.status === 'sending' ? 'Sending notice…' : (role === 'teacher' ? 'Email evaluator a portal notice' : 'Email educator a portal notice')}</button>}
    </div> : <div className={'ae-local-banner ' + (workspace.config.sampleMode ? 'ae-sample' : '')}><strong>{workspace.config.sampleMode ? 'Sample workspace' : 'Local prototype'}</strong><span>Data stays in this browser. Role switching is a demonstration, not secure access. Do not enter confidential personnel or student information.</span></div>}
    <nav className="ae-tabs" role="tablist" aria-label="Evaluation workspace sections">{tabs.map(([id, label], index) => <button type="button" role="tab" key={id} id={'ae-tab-' + id} aria-selected={tab === id} aria-controls="ae-panel" tabIndex={tab === id ? 0 : -1} className="ae-tab" onClick={() => setTab(id)} onKeyDown={(event) => tabKey(event, index)}>{label}</button>)}</nav>
    <main className="ae-main" id="ae-panel" role="tabpanel" tabIndex={-1} aria-labelledby={'ae-tab-' + tab} aria-busy={remoteState.inFlight ? 'true' : undefined} aria-disabled={isRemote && remoteState.status === 'error' ? 'true' : undefined} onClickCapture={blockRemoteMutation} onChangeCapture={blockRemoteMutation} onInputCapture={blockRemoteMutation} onSubmitCapture={blockRemoteMutation}>
      {tab === 'overview' && <AeOverview workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} updateTeacher={updateTeacher} setTab={setTab}/>}
      {tab === 'trends' && <AeTrends workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} isRemote={isRemote}/>}
      {tab === 'staff' && <AeStaff workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} updateTeacher={updateTeacher} addTeacher={addTeacher} isRemote={isRemote} canAddStaff={!isRemote || !!(remoteState.currentUser && remoteState.currentUser.role === 'admin')}/>}
      {tab === 'walkthroughs' && <AeWalkthroughs workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createWalkthrough={createWalkthrough} publishWalkthrough={publishWalkthrough} addComment={addComment} acknowledgeWalkthrough={acknowledgeWalkthrough} isRemote={isRemote}/>}
      {tab === 'formal' && <AeFormalObservations workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createObservation={createObservation} updateObservation={updateObservation} updateTeacher={updateTeacher} addComment={addComment}/>}
      {tab === 'spm' && <AeSpm workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createSpm={createSpm} updateSpm={updateSpm} updateTeacher={updateTeacher} addComment={addComment}/>}
      {tab === 'audit' && <AeAuditExport workspace={workspace} selectedTeacher={selectedTeacher} exportWorkspace={exportWorkspace} exportCsv={exportCsv} exportSummary={exportSummary} importWorkspace={importWorkspace} resetWorkspace={resetWorkspace} role={role} isRemote={isRemote}/>}
      {tab === 'about' && <AeAbout workspace={workspace} updateConfig={updateConfig} role={role} isRemote={isRemote} currentUser={remoteState.currentUser}/>}
    </main>
    <footer className="ae-footer"><span>No AI scoring · evidence and judgments stay separate · published records are append-only in the workflow model</span><span><a href="https://www.pa.gov/agencies/education/programs-and-services/educators/educator-effectiveness" target="_blank" rel="noreferrer">PDE Educator Effectiveness</a> · <a href="https://www.pdesas.org/Page/Viewer/ViewPage/75" target="_blank" rel="noreferrer">Act 13 Toolkit</a></span></footer><div className="ae-live" aria-live="polite" aria-atomic="true"><span key={liveMessage.id}>{liveMessage.text}</span></div>
  </div>;
  return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'} onClick={standalone ? undefined : (event) => { if (event.target === event.currentTarget) onClose(); }}><AeStyles/>{body}</div>;
}
