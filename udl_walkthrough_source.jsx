/**
 * AlloFlow — UDL Walkthrough (admin/coach observation tool) — MVP.
 *
 * Growth-framed classroom walkthroughs built on the CAST UDL Guidelines 3.0
 * structure: 27 doorway-observable look-fors (3 per guideline) plus 8
 * learner-side "student moment" indicators. Everything stays on the device
 * (localStorage + manual JSON export/import); no AI in the loop.
 *
 * Instrument wording drafted 2026-08-03 (WALKTHROUGH_LOOKFORS_DRAFT.md is the
 * reviewed source of truth for prompts). These are UDL-aligned look-fors, NOT
 * a validated fidelity instrument — the UI says so explicitly.
 *
 * Sandbox constraints honored: no window.confirm (two-tap delete instead),
 * no popups (feedback card copies as text instead of printing).
 */

const UDLWALK_CONFIG_KEY = 'allo_udlwalk_config_v1';
const UDLWALK_ROSTER_KEY = 'allo_udlwalk_roster_v1';
const UDLWALK_SESSIONS_KEY = 'allo_udlwalk_sessions_v1';
const UDLWALK_DRAFT_KEY = 'allo_udlwalk_draft_v1';
const UDLWALK_FRAMEWORK = 'udl-3.0';

const UDLWALK_PRINCIPLES = [
  { id: 'engagement', label: 'Engagement', hint: 'the "why" of learning', color: 'amber' },
  { id: 'representation', label: 'Representation', hint: 'the "what" of learning', color: 'sky' },
  { id: 'action_expression', label: 'Action & Expression', hint: 'the "how" of learning', color: 'violet' },
];

// Rating cycle for a look-for card. `null` = unrated.
const UDLWALK_RATINGS = ['observed', 'partial', 'not'];
const UDLWALK_RATING_META = {
  observed: { label: 'Observed', short: '✓', chip: 'bg-green-100 text-green-800 border-green-600' },
  partial: { label: 'Partial', short: '◐', chip: 'bg-amber-100 text-amber-800 border-amber-600' },
  not: { label: 'Not observed', short: '✗', chip: 'bg-rose-100 text-rose-800 border-rose-600' },
  no_opp: { label: 'No opportunity', short: '—', chip: 'bg-slate-100 text-slate-600 border-slate-400' },
};

const UDLWALK_LOOK_FORS = [
  // ── Engagement · Guideline 7: Welcoming Interests & Identities ──
  { id: 'eng_7_1', principle: 'engagement', guideline: 'Welcoming Interests & Identities',
    prompt: 'The task or examples connect to students’ lives, interests, cultures, or current events — and the connection is made explicit.',
    examples: ['word problems use local or familiar contexts', 'text choices reflect the classroom’s identities', 'teacher links content to something students raised'] },
  { id: 'eng_7_2', principle: 'engagement', guideline: 'Welcoming Interests & Identities',
    prompt: 'Students are given a genuine choice about some element of the work (topic, order, materials, partner, workspace) and the choices differ in more than name.',
    examples: ['choice board', 'pick-your-own text at a station', 'choose desk, floor spot, or standing counter'] },
  { id: 'eng_7_3', principle: 'engagement', guideline: 'Welcoming Interests & Identities',
    prompt: 'Deliberate supports for predictability and safety are visible: agenda/schedule, advance warning of transitions, a way to ask for help without exposure.',
    examples: ['posted visual schedule that matches what’s happening', 'timer displayed before a transition', 'help-signal cards in use'] },
  // ── Engagement · Guideline 8: Sustaining Effort & Persistence ──
  { id: 'eng_8_1', principle: 'engagement', guideline: 'Sustaining Effort & Persistence',
    prompt: 'The learning goal or success criteria are posted or restated in student-friendly language — and match what students are actually doing.',
    examples: ['"We will..." statement referenced mid-lesson', 'rubric or exemplar visible at the work area', 'teacher redirects a group by pointing back to the criteria'] },
  { id: 'eng_8_2', principle: 'engagement', guideline: 'Sustaining Effort & Persistence',
    prompt: 'Teacher feedback heard during the visit names strategies, effort, or progress toward criteria rather than general praise or ability labels.',
    examples: ['"Your second draft added evidence — that’s what moved it"', 'feedback references the rubric', 'error treated as information, not verdict'] },
  { id: 'eng_8_3', principle: 'engagement', guideline: 'Sustaining Effort & Persistence',
    prompt: 'When students work together, roles, protocols, or accountability structures are visible — group work is engineered, not just assigned.',
    examples: ['role cards', 'talk protocol (turn-and-talk stems, numbered heads)', 'teacher coaches the collaboration itself'] },
  // ── Engagement · Guideline 9: Emotional Capacity ──
  { id: 'eng_9_1', principle: 'engagement', guideline: 'Emotional Capacity',
    prompt: 'Self-regulation tools or routines exist and students can access them without teacher permission or public negotiation.',
    examples: ['break cards', 'fidgets or noise-reducing headphones accessible', 'movement break built into the lesson'] },
  { id: 'eng_9_2', principle: 'engagement', guideline: 'Emotional Capacity',
    prompt: 'Teacher models or prompts emotional awareness connected to learning (frustration, confusion, excitement) rather than treating affect as off-task.',
    examples: ['"It’s normal for this step to feel confusing"', 'brief check-in tied to the task', 'teacher narrates own strategy for frustration'] },
  { id: 'eng_9_3', principle: 'engagement', guideline: 'Emotional Capacity',
    prompt: 'Students are prompted at some point to assess their own effort, strategy, or progress — even briefly.',
    examples: ['exit slip asks "what strategy worked?"', 'mid-task self-check against criteria', 'brief partner debrief on process, not just answers'] },
  // ── Representation · Guideline 1: Perception ──
  { id: 'rep_1_1', principle: 'representation', guideline: 'Perception',
    prompt: 'The same core content is presented in at least two modalities during the visit (spoken + visual, text + model, captioned video).',
    examples: ['verbal instruction with anchor chart', 'demonstration alongside written steps', 'tactile or manipulative model of the concept'] },
  { id: 'rep_1_2', principle: 'representation', guideline: 'Perception',
    prompt: 'Visual and audio materials are perceivable from where students sit, and students can adjust or approach them without needing permission.',
    examples: ['board readable from the back', 'student moves closer or uses a personal copy freely', 'digital text students can resize'] },
  { id: 'rep_1_3', principle: 'representation', guideline: 'Perception',
    prompt: 'Alternative formats exist as a standing offer to everyone, not a retrofit for one student.',
    examples: ['audio version of the reading at the station', 'large-print copies in the handout stack', 'teacher mentions the options when launching the task'] },
  // ── Representation · Guideline 2: Language & Symbols ──
  { id: 'rep_2_1', principle: 'representation', guideline: 'Language & Symbols',
    prompt: 'Key terms, symbols, or notation are explicitly defined with student-accessible supports present during work time.',
    examples: ['word wall in active use', 'glossary or vocab card on the desk', 'teacher stops to unpack a term before using it'] },
  { id: 'rep_2_2', principle: 'representation', guideline: 'Language & Symbols',
    prompt: 'Supports for students’ home languages or language development are visible where relevant to the class roster.',
    examples: ['cognate callouts', 'translated key-word list', 'sentence frames that scaffold academic language'] },
  { id: 'rep_2_3', principle: 'representation', guideline: 'Language & Symbols',
    prompt: 'The organization of the idea — not just the idea — is shown: how parts relate, what the pattern is.',
    examples: ['graphic organizer models the text structure', 'worked example annotated to show why each step', 'teacher thinks aloud about how parts connect'] },
  // ── Representation · Guideline 3: Building Knowledge ──
  { id: 'rep_3_1', principle: 'representation', guideline: 'Building Knowledge',
    prompt: 'The lesson visibly connects new content to something students already know or experienced.',
    examples: ['KWL or anticipation guide', '"remember when we..." bridge', 'quick-write on what they already know'] },
  { id: 'rep_3_2', principle: 'representation', guideline: 'Building Knowledge',
    prompt: 'Teacher explicitly marks what matters most — the essential pattern or principle — versus supporting detail.',
    examples: ['"the one thing to remember is..."', 'essential question referenced', 'key idea boxed on the board'] },
  { id: 'rep_3_3', principle: 'representation', guideline: 'Building Knowledge',
    prompt: 'Steps, directions, or content chunks stay externally available so students don’t have to hold them mentally.',
    examples: ['numbered steps posted or on-desk', 'directions repeated in written form', 'chunked text with stopping points'] },
  // ── Action & Expression · Guideline 4: Interaction ──
  { id: 'act_4_1', principle: 'action_expression', guideline: 'Interaction',
    prompt: 'Students can interact with the task through more than one physical means, and the alternatives are equally legitimate.',
    examples: ['manipulatives alongside worksheet', 'digital and paper versions both live', 'whiteboard response instead of raised hand'] },
  { id: 'act_4_2', principle: 'action_expression', guideline: 'Interaction',
    prompt: 'Assistive tech and tools in the room are set up, working, and used without ceremony — students who need them aren’t waiting or negotiating.',
    examples: ['student’s device charged and configured', 'text-to-speech in use without teacher setup mid-task', 'calculator policy clear and posted'] },
  { id: 'act_4_3', principle: 'action_expression', guideline: 'Interaction',
    prompt: 'The physical or digital environment lets all students get what they need without bottlenecks or dependence on the teacher.',
    examples: ['materials stations students access independently', 'room navigable for mobility devices', 'supplies at every table rather than one queue'] },
  // ── Action & Expression · Guideline 5: Expression & Communication ──
  { id: 'act_5_1', principle: 'action_expression', guideline: 'Expression & Communication',
    prompt: 'Students can show what they know in more than one format for the same criteria — and the options carry equal status.',
    examples: ['write, record, diagram, or build for the same understanding', 'oral response accepted where writing isn’t the construct', 'menu of products tied to one rubric'] },
  { id: 'act_5_2', principle: 'action_expression', guideline: 'Expression & Communication',
    prompt: 'Supports for producing work — sentence starters, frames, exemplars, drafting tools — are present and students use them without penalty.',
    examples: ['sentence stems on the table', 'annotated exemplar posted', 'word prediction allowed during drafting'] },
  { id: 'act_5_3', principle: 'action_expression', guideline: 'Expression & Communication',
    prompt: 'Practice during the visit shows a visible ramp — modeled, guided, then independent — rather than a jump to independence.',
    examples: ['I-do/we-do/you-do actually observed', 'guided practice with immediate feedback before solo work', 're-teach loop for a small group while others practice'] },
  // ── Action & Expression · Guideline 6: Strategy Development ──
  { id: 'act_6_1', principle: 'action_expression', guideline: 'Strategy Development',
    prompt: 'Students are prompted to set a goal or make a plan before diving in — even a 30-second one.',
    examples: ['"What’s your first step?" required before starting', 'planning box on the task sheet', 'strategy pick before a problem set'] },
  { id: 'act_6_2', principle: 'action_expression', guideline: 'Strategy Development',
    prompt: 'Teacher explicitly names, models, or references a strategy students can reuse — the how-to-think, not just the answer.',
    examples: ['think-aloud of a comprehension strategy', 'strategy anchor chart referenced', '"which strategy did you use?" in feedback'] },
  { id: 'act_6_3', principle: 'action_expression', guideline: 'Strategy Development',
    prompt: 'Students track their own progress with a visible mechanism during the work.',
    examples: ['self-check against criteria mid-task', 'progress tracker sheet', 'answer key station for self-correction'] },
];

const UDLWALK_STUDENT_INDICATORS = [
  { id: 'stu_1', label: 'Used a support unprompted', detail: 'Accessed a scaffold, tool, or format option without being told to.' },
  { id: 'stu_2', label: 'Exercised real choice', detail: 'Different students visibly doing different legitimate versions of the task.' },
  { id: 'stu_3', label: 'Explained their strategy', detail: 'Articulated how they were approaching the task, not just the answer.' },
  { id: 'stu_4', label: 'Persisted through difficulty', detail: 'Hit an obstacle and used a strategy or support to continue.' },
  { id: 'stu_5', label: 'Self-monitored or self-corrected', detail: 'Checked own work against criteria and revised without teacher direction.' },
  { id: 'stu_6', label: 'Peer support observed', detail: 'Students helped each other via a structure (protocol, roles, norms), not ad hoc copying.' },
  { id: 'stu_7', label: 'All students had access', detail: 'Everyone in view could enter the task — nobody waiting, excluded by format, or on a lesser parallel task.' },
  { id: 'stu_8', label: 'Regulated and re-engaged', detail: 'Used a regulation support (break, movement, calm corner) and returned to learning.' },
];

// Feedback-card "consider" suggestions: per principle, a concrete next step
// plus the AlloFlow tools that address it. Static text by design — the MVP
// panel doesn't navigate, it points.
const UDLWALK_SUGGESTIONS = {
  engagement: 'Consider adding one structured choice point or a visible self-regulation support. In AlloFlow: the SEL Hub has ready-made regulation routines, and Class Goals supports effort-framed recognition.',
  representation: 'Consider pairing the main content with a second modality (visual, audio, or model) or an accessible format offered to everyone. In AlloFlow: the Document Hub and PDF Accessibility pipeline produce born-accessible versions, and Visual Supports builds picture-based scaffolds.',
  action_expression: 'Consider accepting one additional response format against the same rubric, or naming the strategy students should reuse. In AlloFlow: the Whiteboard and Symbol Studio widen expression options, and Dynamic Assessment scaffolds graduated prompts.',
};

const UDLWALK_GROUPINGS = [
  { id: 'whole', label: 'Whole group' },
  { id: 'small', label: 'Small groups' },
  { id: 'stations', label: 'Stations' },
  { id: 'independent', label: 'Independent' },
];

const UDLWALK_PHASES = [
  { id: 'opening', label: 'Opening' },
  { id: 'instruction', label: 'Instruction' },
  { id: 'practice', label: 'Practice' },
  { id: 'closing', label: 'Closing' },
];

function udlwalkLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_) { return fallback; }
}

function udlwalkStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function udlwalkNextId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function udlwalkNextTeacherCode(roster) {
  const used = new Set(roster.map((r) => r.code));
  for (let i = 1; i < 1000; i += 1) {
    const code = 'T-' + String(i).padStart(2, '0');
    if (!used.has(code)) return code;
  }
  return 'T-' + Date.now().toString(36);
}

function udlwalkTeacherDisplay(teacher, anonymize) {
  if (!teacher) return 'Unknown';
  if (anonymize) return teacher.code;
  return teacher.name ? teacher.name : teacher.code;
}

function udlwalkAnnounce(message) {
  try {
    const region = document.getElementById('allo-live-udlwalk');
    if (region) { region.textContent = ''; region.textContent = message; }
  } catch (_) {}
}

// Pure seam: pick feedback-card content from one session's evidence.
// strengths = up to 3 'observed' items spread across principles;
// consider = highest-leverage gap ('not' beats 'partial'; never 'no_opp').
function udlwalkFeedbackFromSession(session) {
  const evidence = (session && session.evidence) || {};
  const rated = UDLWALK_LOOK_FORS
    .map((lf) => ({ lf, entry: evidence[lf.id] }))
    .filter((x) => x.entry && x.entry.rating);
  const observed = rated.filter((x) => x.entry.rating === 'observed');
  const strengths = [];
  const seenPrinciples = new Set();
  observed.forEach((x) => {
    if (strengths.length < 3 && !seenPrinciples.has(x.lf.principle)) {
      strengths.push(x.lf); seenPrinciples.add(x.lf.principle);
    }
  });
  observed.forEach((x) => {
    if (strengths.length < 3 && strengths.indexOf(x.lf) === -1) strengths.push(x.lf);
  });
  // Prefer a gap the observer annotated (they clearly cared about it), then
  // fall back to instrument order — otherwise "consider" systematically
  // biases toward whatever guideline happens to come first (Engagement 7).
  const nots = rated.filter((x) => x.entry.rating === 'not');
  const partials = rated.filter((x) => x.entry.rating === 'partial');
  const gap = nots.find((x) => x.entry.note) || nots[0] || partials.find((x) => x.entry.note) || partials[0] || null;
  return {
    strengths,
    consider: gap ? gap.lf : null,
    considerRating: gap ? gap.entry.rating : null,
    suggestion: gap ? UDLWALK_SUGGESTIONS[gap.lf.principle] : null,
  };
}

function udlwalkFeedbackText(session, teacher, anonymize) {
  const fb = udlwalkFeedbackFromSession(session);
  const lines = [];
  lines.push('UDL Walkthrough feedback — ' + udlwalkTeacherDisplay(teacher, anonymize));
  lines.push('Date: ' + (session.date || '') + ' · ' + (session.durationMin != null ? session.durationMin + ' min' : '') + ((session.observer && session.observer.initials) ? (' · Observer: ' + session.observer.initials) : ''));
  lines.push('');
  if (fb.strengths.length) {
    lines.push('Strengths observed:');
    fb.strengths.forEach((lf) => { lines.push('  + ' + lf.guideline + ': ' + lf.prompt); });
  } else {
    lines.push('Strengths observed: (none rated "observed" this visit)');
  }
  lines.push('');
  if (fb.consider) {
    lines.push('One thing to consider (' + (UDLWALK_RATING_META[fb.considerRating] || {}).label + '):');
    lines.push('  > ' + fb.consider.guideline + ': ' + fb.consider.prompt);
    if (fb.suggestion) lines.push('  ' + fb.suggestion);
  }
  const moments = (session.studentIndicators || []);
  if (moments.length) {
    lines.push('');
    lines.push('Student moments (' + moments.length + '):');
    moments.forEach((m) => {
      const ind = UDLWALK_STUDENT_INDICATORS.find((s) => s.id === m.id);
      lines.push('  * ' + (ind ? ind.label : m.id));
    });
  }
  if (session.summaryNote) {
    lines.push('');
    lines.push('Note: ' + session.summaryNote);
  }
  lines.push('');
  lines.push('Framework: CAST UDL Guidelines 3.0 structure (UDL-aligned look-fors; not a validated fidelity instrument). Data stays on the observer’s device.');
  return lines.join('\n');
}

function udlwalkCopyText(text, addToast) {
  const done = () => addToast('Feedback copied to the clipboard.', 'success');
  const fail = () => addToast('Could not copy — select and copy the text manually.', 'warning');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        if (udlwalkExecCopy(text)) done(); else fail();
      });
      return;
    }
  } catch (_) {}
  if (udlwalkExecCopy(text)) done(); else fail();
}

function udlwalkExecCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.setAttribute('aria-label', 'Clipboard fallback text');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

// ── Building-level aggregation (pure seams — dashboard + research export) ──

// Guideline id = look-for id minus the item index ('eng_7_1' -> 'eng_7').
function udlwalkGuidelineOf(lookForId) {
  const parts = String(lookForId).split('_');
  return parts.slice(0, 2).join('_');
}

// Ordered guideline list derived from the instrument (9 entries).
const UDLWALK_GUIDELINES = (function () {
  const seen = new Set();
  const out = [];
  UDLWALK_LOOK_FORS.forEach((lf) => {
    const gid = udlwalkGuidelineOf(lf.id);
    if (!seen.has(gid)) { seen.add(gid); out.push({ id: gid, principle: lf.principle, label: lf.guideline }); }
  });
  return out;
})();

const UDLWALK_UNGRADED = '—';

// Rollup for the Building dashboard. Validity rules baked in here, not in the
// render: 'no_opp' is excluded from every denominator, and pdSignals only
// consider guidelines with at least MIN_N rated observations building-wide.
function udlwalkAggregate(sessions, roster) {
  const MIN_N = 3;
  const gradeOf = {};
  (roster || []).forEach((r) => { gradeOf[r.id] = (r.grade && String(r.grade).trim()) || UDLWALK_UNGRADED; });
  const gradeSet = new Set();
  const blank = () => ({ observed: 0, partial: 0, not: 0, rated: 0, noOpp: 0 });
  const cells = {};
  const totals = {};
  UDLWALK_GUIDELINES.forEach((g) => { cells[g.id] = {}; totals[g.id] = blank(); });
  const coverageMap = {};
  (sessions || []).forEach((s) => {
    const grade = gradeOf[s.teacherId] || UDLWALK_UNGRADED;
    const cov = coverageMap[s.teacherId] || (coverageMap[s.teacherId] = { visits: 0, lastDate: '' });
    cov.visits += 1;
    if (String(s.date || '') > cov.lastDate) cov.lastDate = String(s.date || '');
    Object.keys(s.evidence || {}).forEach((lookForId) => {
      const entry = s.evidence[lookForId];
      const rating = entry && entry.rating;
      if (!rating) return;
      const gid = udlwalkGuidelineOf(lookForId);
      if (!totals[gid]) return; // unknown id (future instrument version) — skip, don't throw
      gradeSet.add(grade);
      const cell = cells[gid][grade] || (cells[gid][grade] = blank());
      if (rating === 'no_opp') { cell.noOpp += 1; totals[gid].noOpp += 1; return; }
      cell[rating] += 1; cell.rated += 1;
      totals[gid][rating] += 1; totals[gid].rated += 1;
    });
  });
  const grades = Array.from(gradeSet).sort((a, b) => {
    if (a === UDLWALK_UNGRADED) return 1;
    if (b === UDLWALK_UNGRADED) return -1;
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b));
  });
  // Archived classrooms drop out of coverage (they'd read as "never visited"
  // forever) but their historical sessions still count in the heatmap.
  const coverage = (roster || []).filter((r) => !r.archived).map((r) => ({
    teacherId: r.id,
    visits: (coverageMap[r.id] || {}).visits || 0,
    lastDate: (coverageMap[r.id] || {}).lastDate || '',
  }));
  const pdSignals = UDLWALK_GUIDELINES
    .filter((g) => totals[g.id].rated >= MIN_N)
    .map((g) => ({ id: g.id, rate: totals[g.id].observed / totals[g.id].rated, n: totals[g.id].rated }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  return { grades, cells, totals, coverage, pdSignals, minN: MIN_N };
}

// Month-bucketed observed-rate per principle, for the Building trend chart.
// Same validity rule as the heatmap: no_opp never enters a denominator; a
// month with no rated items for a principle is null (a gap, not a zero).
function udlwalkTrend(sessions) {
  const bucketSet = new Set();
  const acc = {}; // principle -> bucket -> {observed, rated}
  UDLWALK_PRINCIPLES.forEach((p) => { acc[p.id] = {}; });
  (sessions || []).forEach((s) => {
    const bucket = String(s.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(bucket)) return;
    Object.keys(s.evidence || {}).forEach((lookForId) => {
      const entry = s.evidence[lookForId];
      const rating = entry && entry.rating;
      if (!rating || rating === 'no_opp') return;
      const lf = UDLWALK_LOOK_FORS.find((x) => x.id === lookForId);
      if (!lf) return;
      bucketSet.add(bucket);
      const cell = acc[lf.principle][bucket] || (acc[lf.principle][bucket] = { observed: 0, rated: 0 });
      cell.rated += 1;
      if (rating === 'observed') cell.observed += 1;
    });
  });
  const buckets = Array.from(bucketSet).sort();
  const series = {};
  UDLWALK_PRINCIPLES.forEach((p) => {
    series[p.id] = buckets.map((b) => {
      const cell = acc[p.id][b];
      return cell ? { rate: cell.observed / cell.rated, n: cell.rated } : null;
    });
  });
  return { buckets, series };
}

// Inter-rater agreement between two sessions of the SAME lesson recorded by
// two observers. Exact-match on items BOTH observers rated (no_opp counts as
// a rating — "nothing to see" is itself a judgment they can disagree on).
function udlwalkAgreement(sessionA, sessionB) {
  const evA = (sessionA && sessionA.evidence) || {};
  const evB = (sessionB && sessionB.evidence) || {};
  let bothRated = 0, agree = 0, onlyOne = 0;
  const disagreements = [];
  const marginA = {}, marginB = {};
  UDLWALK_LOOK_FORS.forEach((lf) => {
    const a = evA[lf.id] && evA[lf.id].rating;
    const b = evB[lf.id] && evB[lf.id].rating;
    if (a && b) {
      bothRated += 1;
      marginA[a] = (marginA[a] || 0) + 1;
      marginB[b] = (marginB[b] || 0) + 1;
      if (a === b) agree += 1;
      else disagreements.push({ id: lf.id, guideline: lf.guideline, a, b });
    } else if (a || b) {
      onlyOne += 1;
    }
  });
  // Cohen's kappa (unweighted): raw percent agreement overstates reliability
  // when ratings are skewed, so report the chance-corrected statistic too.
  // null when undefined (no overlap, or expected agreement is exactly 1).
  let kappa = null;
  if (bothRated > 0) {
    const po = agree / bothRated;
    let pe = 0;
    const cats = ['observed', 'partial', 'not', 'no_opp'];
    cats.forEach((c) => { pe += ((marginA[c] || 0) / bothRated) * ((marginB[c] || 0) / bothRated); });
    if (pe < 1) kappa = (po - pe) / (1 - pe);
  }
  return { bothRated, agree, onlyOne, pct: bothRated ? agree / bothRated : null, kappa, disagreements };
}

// De-identified long-format rows for research export: one row per rated
// look-for. Teacher CODE only (never the name), and NO free text — evidence
// notes and observer notes can contain names, so only their presence is
// exported. Building name is deliberately omitted too.
function udlwalkResearchRows(sessions, roster) {
  const byId = {};
  (roster || []).forEach((r) => { byId[r.id] = r; });
  const rows = [];
  (sessions || []).forEach((s) => {
    const teacher = byId[s.teacherId];
    const momentCount = (s.studentIndicators || []).length;
    Object.keys(s.evidence || {}).forEach((lookForId) => {
      const entry = s.evidence[lookForId];
      if (!entry || !entry.rating) return;
      const lf = UDLWALK_LOOK_FORS.find((x) => x.id === lookForId);
      rows.push({
        session_id: s.id,
        observer: (s.observer && s.observer.initials) || '',
        teacher_code: teacher ? teacher.code : 'unknown',
        grade: teacher ? ((teacher.grade && String(teacher.grade).trim()) || '') : '',
        date: s.date || '',
        duration_min: s.durationMin != null ? s.durationMin : '',
        grouping: (s.context && s.context.grouping) || '',
        lesson_phase: (s.context && s.context.lessonPhase) || '',
        framework: s.frameworkVersion || UDLWALK_FRAMEWORK,
        look_for_id: lookForId,
        guideline_id: udlwalkGuidelineOf(lookForId),
        principle: lf ? lf.principle : '',
        rating: entry.rating,
        note_present: entry.note ? 1 : 0,
        student_moment_count: momentCount,
      });
    });
  });
  return rows;
}

function udlwalkCsv(rows) {
  if (!rows || !rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}

function udlwalkDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function udlwalkEscHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Standalone accessible HTML document of one visit's feedback card — the
// thing an admin actually hands (or emails) a teacher. Semantic headings,
// print CSS, self-contained; deliberately NOT wired into the heavyweight
// PDF pipeline — any browser's print dialog turns this into a PDF.
function udlwalkFeedbackHtml(session, teacher, anonymize) {
  const fb = udlwalkFeedbackFromSession(session);
  const esc = udlwalkEscHtml;
  const who = esc(udlwalkTeacherDisplay(teacher, anonymize));
  const meta = [
    esc(session.date || ''),
    session.durationMin != null ? esc(session.durationMin + ' min') : '',
    (session.observer && session.observer.initials) ? ('Observer: ' + esc(session.observer.initials)) : '',
  ].filter(Boolean).join(' · ');
  const strengths = fb.strengths.map((lf) =>
    '<li><strong>' + esc(lf.guideline) + ':</strong> ' + esc(lf.prompt) + '</li>').join('\n');
  const moments = (session.studentIndicators || []).map((m) => {
    const ind = UDLWALK_STUDENT_INDICATORS.find((s) => s.id === m.id);
    return '<li>' + esc(ind ? ind.label : m.id) + '</li>';
  }).join('\n');
  const consider = fb.consider
    ? '<h2>One thing to consider</h2>\n<p><strong>' + esc(fb.consider.guideline) + ':</strong> ' + esc(fb.consider.prompt) + '</p>'
      + (fb.suggestion ? ('\n<p>' + esc(fb.suggestion) + '</p>') : '')
    : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>UDL Walkthrough feedback — ' + who + ' — ' + esc(session.date || '') + '</title>\n'
    + '<style>\n'
    + 'body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:44rem;margin:2rem auto;padding:0 1rem;color:#1e293b;line-height:1.5}\n'
    + 'h1{font-size:1.35rem;border-bottom:2px solid #4f46e5;padding-bottom:.4rem}\n'
    + 'h2{font-size:1.05rem;margin-top:1.4rem}\n'
    + '.meta{color:#475569;font-size:.9rem}\n'
    + 'ul{padding-left:1.2rem}\n'
    + 'li{margin:.35rem 0}\n'
    + '.note{white-space:pre-wrap}\n'
    + 'footer{margin-top:2rem;border-top:1px solid #cbd5e1;padding-top:.6rem;font-size:.75rem;color:#64748b}\n'
    + '@media print{body{margin:.5rem auto}}\n'
    + '</style>\n</head>\n<body>\n'
    + '<h1>UDL Walkthrough feedback — ' + who + '</h1>\n'
    + '<p class="meta">' + meta + '</p>\n'
    + '<h2>Strengths observed</h2>\n'
    + (strengths ? ('<ul>\n' + strengths + '\n</ul>') : '<p>Nothing was rated "observed" on this visit.</p>') + '\n'
    + consider + '\n'
    + (moments ? ('<h2>Student moments</h2>\n<ul>\n' + moments + '\n</ul>\n') : '')
    + (session.summaryNote ? ('<h2>Observer note</h2>\n<p class="note">' + esc(session.summaryNote) + '</p>\n') : '')
    + '<footer>UDL-aligned look-fors based on the CAST UDL Guidelines 3.0 structure — not a validated fidelity instrument. Growth-framed: instructional-practice feedback, not evaluation. Recorded locally on the observer’s device.</footer>\n'
    + '</body>\n</html>\n';
}

function udlwalkDownload(filename, mime, content, addToast, okMsg, failMsg) {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    addToast(okMsg, 'info');
  } catch (e) {
    addToast(failMsg + String(e && e.message), 'error');
  }
}

// ── Look-for card (module scope; no hooks beyond local UI state) ──
function UdlWalkLookForCard({ lookFor, entry, onCycle, onNoOpp, onNote, tt }) {
  const [showNote, setShowNote] = React.useState(false);
  const [showExamples, setShowExamples] = React.useState(false);
  const rating = entry && entry.rating;
  const meta = rating ? UDLWALK_RATING_META[rating] : null;
  const stateLabel = meta ? meta.label : tt('udlwalk.unrated', 'Not yet rated');
  return (
    <div className={'rounded-xl border p-3 ' + (meta ? meta.chip.replace(/text-[a-z]+-\d+/, '') : 'bg-white border-slate-300')}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onCycle}
          aria-label={lookFor.guideline + '. ' + lookFor.prompt + ' Current: ' + stateLabel + '. Activate to cycle observed, partial, not observed, unrated.'}
          className={'shrink-0 min-w-11 min-h-11 rounded-lg border-2 font-bold text-lg inline-flex items-center justify-center ' + (meta ? meta.chip : 'bg-slate-50 text-slate-500 border-slate-300')}
        >
          <span aria-hidden="true">{meta ? meta.short : '·'}</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-800 leading-snug">{lookFor.prompt}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {meta && <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded border ' + meta.chip}>{tt('udlwalk.rating_' + rating, meta.label)}</span>}
            <button type="button" onClick={onNoOpp}
              aria-pressed={rating === 'no_opp'}
              className={'min-h-8 px-2 py-0.5 rounded border text-[10px] font-bold ' + (rating === 'no_opp' ? UDLWALK_RATING_META.no_opp.chip : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50')}
            >{tt('udlwalk.no_opp', 'No opportunity')}</button>
            <button type="button" onClick={() => setShowExamples((v) => !v)} aria-expanded={showExamples}
              className="min-h-8 px-2 py-0.5 rounded text-[10px] text-slate-600 underline decoration-dotted hover:text-slate-800"
            >{tt('udlwalk.examples', 'Examples')}</button>
            <button type="button" onClick={() => setShowNote((v) => !v)} aria-expanded={showNote}
              className="min-h-8 px-2 py-0.5 rounded text-[10px] text-slate-600 underline decoration-dotted hover:text-slate-800"
            >{(entry && entry.note) ? tt('udlwalk.edit_note', 'Edit note') : tt('udlwalk.add_note', 'Add note')}</button>
          </div>
          {showExamples && (
            <ul className="mt-1.5 text-xs text-slate-600 list-disc pl-4 space-y-0.5">
              {lookFor.examples.map((ex, i) => <li key={i}>{ex}</li>)}
            </ul>
          )}
          {showNote && (
            <textarea
              value={(entry && entry.note) || ''}
              onChange={(e) => onNote(e.target.value)}
              rows={2}
              aria-label={tt('udlwalk.note_aria', 'Evidence note for this look-for')}
              placeholder={tt('udlwalk.note_placeholder', 'What did you actually see or hear?')}
              className="mt-1.5 w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Building trend chart (module scope, stateless) ──
// Literal hex only — SVG presentation attributes can't take CSS var().
// Slots 1–3 of the validated categorical palette (all-pairs CVD-safe on
// white); the aqua slot is sub-3:1 on white, so the relief rule applies:
// direct end-labels + the data table below carry identity and values.
const UDLWALK_TREND_COLORS = {
  engagement: '#2a78d6',
  representation: '#eb6834',
  action_expression: '#1baf7a',
};

function udlwalkMonthLabel(bucket) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = /^(\d{4})-(\d{2})$/.exec(String(bucket));
  if (!m) return String(bucket);
  return (names[parseInt(m[2], 10) - 1] || m[2]) + ' ’' + m[1].slice(2);
}

function UdlWalkTrendChart({ trend, tt }) {
  const W = 630, H = 200, ML = 34, MR = 158, MT = 10, MB = 24;
  const PW = W - ML - MR, PH = H - MT - MB;
  const n = trend.buckets.length;
  const px = (i) => ML + (n === 1 ? PW / 2 : (i * PW) / (n - 1));
  const py = (rate) => MT + PH - rate * PH;
  const tickEvery = Math.max(1, Math.ceil(n / 8));
  // Direct end-labels: nudge apart if the last points sit too close.
  const ends = UDLWALK_PRINCIPLES.map((p) => {
    const arr = trend.series[p.id];
    let last = -1;
    for (let i = arr.length - 1; i >= 0; i -= 1) if (arr[i]) { last = i; break; }
    return last === -1 ? null : { p, i: last, y: py(arr[last].rate), rate: arr[last].rate };
  }).filter(Boolean).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) {
    if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  }
  return (
    <div className="mt-3 bg-white border border-slate-300 rounded-xl p-3">
      <h4 className="text-sm font-bold text-slate-700">{tt('udlwalk.trend_title', 'Trend by principle')}</h4>
      <div className="flex flex-wrap gap-3 mt-1" aria-hidden="true">
        {UDLWALK_PRINCIPLES.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: UDLWALK_TREND_COLORS[p.id] }} />
            {tt('udlwalk.principle_' + p.id, p.label)}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ minWidth: '480px', maxWidth: '640px' }} role="img"
          aria-label={tt('udlwalk.trend_aria', 'Line chart of the share of look-fors rated observed, per UDL principle, by month. The full values are in the data table below.')}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={ML} x2={ML + PW} y1={py(v)} y2={py(v)} stroke={v === 0 ? '#c3c2b7' : '#e1e0d9'} strokeWidth="1" />
              <text x={ML - 5} y={py(v) + 3.5} textAnchor="end" fontSize="10" fill="#898781">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {trend.buckets.map((b, i) => (i % tickEvery === 0 || i === n - 1) ? (
            <text key={b} x={px(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#898781">{udlwalkMonthLabel(b)}</text>
          ) : null)}
          {UDLWALK_PRINCIPLES.map((p) => {
            const arr = trend.series[p.id];
            const color = UDLWALK_TREND_COLORS[p.id];
            const segments = [];
            let current = [];
            arr.forEach((cell, i) => {
              if (cell) current.push([px(i), py(cell.rate)]);
              else if (current.length) { segments.push(current); current = []; }
            });
            if (current.length) segments.push(current);
            return (
              <g key={p.id}>
                {segments.map((seg, si) => seg.length > 1 ? (
                  <polyline key={si} points={seg.map((pt) => pt[0] + ',' + pt[1]).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : null)}
                {arr.map((cell, i) => cell ? (
                  <circle key={i} cx={px(i)} cy={py(cell.rate)} r="4" fill={color} stroke="#ffffff" strokeWidth="2">
                    <title>{p.label + ' · ' + udlwalkMonthLabel(trend.buckets[i]) + ' · ' + Math.round(cell.rate * 100) + '% (n=' + cell.n + ')'}</title>
                  </circle>
                ) : null)}
              </g>
            );
          })}
          {ends.map((e) => (
            <text key={e.p.id} x={ML + PW + 8} y={e.y + 3.5} fontSize="11" fontWeight="600" fill="#52514e">
              {tt('udlwalk.principle_' + e.p.id, e.p.label)} {Math.round(e.rate * 100)}%
            </text>
          ))}
        </svg>
      </div>
      <details className="mt-1">
        <summary className="text-[11px] text-slate-600 underline decoration-dotted cursor-pointer min-h-8 inline-flex items-center">{tt('udlwalk.trend_table', 'Data table')}</summary>
        <table className="mt-1 text-[11px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className="text-left p-1 text-slate-600">{tt('udlwalk.trend_month', 'Month')}</th>
              {UDLWALK_PRINCIPLES.map((p) => <th key={p.id} scope="col" className="text-left p-1 text-slate-600">{tt('udlwalk.principle_' + p.id, p.label)}</th>)}
            </tr>
          </thead>
          <tbody>
            {trend.buckets.map((b, i) => (
              <tr key={b} className="border-t border-slate-200">
                <th scope="row" className="text-left p-1 font-normal text-slate-700">{udlwalkMonthLabel(b)}</th>
                {UDLWALK_PRINCIPLES.map((p) => {
                  const cell = trend.series[p.id][i];
                  return <td key={p.id} className="p-1 text-slate-700">{cell ? (Math.round(cell.rate * 100) + '% (n=' + cell.n + ')') : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="text-[10px] text-slate-500 mt-1">{tt('udlwalk.trend_note', 'Share of look-fors rated "observed" per month; "no opportunity" is excluded. Months with no rated items for a principle are gaps, not zeros.')}</p>
    </div>
  );
}

// ── Feedback card view for one saved session ──
function UdlWalkFeedbackCard({ session, teacher, anonymize, addToast, tt, onBack, onDelete, onEdit, onToggleShared }) {
  const [armDelete, setArmDelete] = React.useState(false);
  const fb = udlwalkFeedbackFromSession(session);
  const text = udlwalkFeedbackText(session, teacher, anonymize);
  const downloadHtml = () => {
    const html = udlwalkFeedbackHtml(session, teacher, anonymize);
    const name = 'udl-feedback-' + (teacher ? teacher.code : 'visit') + '-' + (session.date || udlwalkDateStamp()) + '.html';
    udlwalkDownload(name, 'text/html', html, addToast, tt('udlwalk.export_toast', 'Export started — check your downloads.'), tt('udlwalk.export_failed', 'Export failed: '));
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" onClick={onBack} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50">
          <span aria-hidden="true">←</span> {tt('udlwalk.back_sessions', 'All visits')}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => udlwalkCopyText(text, addToast)} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
            <span aria-hidden="true">📋</span> {tt('udlwalk.copy_feedback', 'Copy feedback')}
          </button>
          <button type="button" onClick={downloadHtml} className="min-h-11 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50">
            <span aria-hidden="true">⬇️</span> {tt('udlwalk.download_feedback', 'Download')}
          </button>
          <button type="button" onClick={onEdit} className="min-h-11 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50">
            <span aria-hidden="true">✏️</span> {tt('udlwalk.edit_visit', 'Edit')}
          </button>
          <button type="button" onClick={onToggleShared} aria-pressed={!!session.sharedWithTeacher}
            className={'min-h-11 px-3 py-2 rounded-lg border text-sm font-bold ' + (session.sharedWithTeacher ? 'bg-green-600 text-white border-green-700' : 'bg-white text-green-700 border-green-300 hover:bg-green-50')}
          >{session.sharedWithTeacher ? tt('udlwalk.shared_yes', '✓ Shared') : tt('udlwalk.mark_shared', 'Mark shared')}</button>
          <button type="button"
            onClick={() => { if (armDelete) { onDelete(); } else { setArmDelete(true); udlwalkAnnounce(tt('udlwalk.delete_arm_announce', 'Activate delete again to permanently remove this visit.')); } }}
            className={'min-h-11 px-3 py-2 rounded-lg border text-sm font-bold ' + (armDelete ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')}
          >{armDelete ? tt('udlwalk.delete_confirm', 'Tap again to delete') : tt('udlwalk.delete', 'Delete')}</button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <h4 className="font-bold text-slate-800">{udlwalkTeacherDisplay(teacher, anonymize)}</h4>
        <p className="text-xs text-slate-600 mt-0.5">
          {session.date} · {session.durationMin != null ? (session.durationMin + ' ' + tt('udlwalk.minutes', 'min')) : ''} ·{' '}
          {(session.observer && session.observer.initials) ? (tt('udlwalk.observer_short', 'obs.') + ' ' + session.observer.initials + ' · ') : ''}
          {(UDLWALK_GROUPINGS.find((g) => g.id === (session.context && session.context.grouping)) || {}).label || ''} ·{' '}
          {(UDLWALK_PHASES.find((p) => p.id === (session.context && session.context.lessonPhase)) || {}).label || ''}
        </p>
        <div className="mt-3">
          <h5 className="text-sm font-bold text-green-800">{tt('udlwalk.strengths', 'Strengths observed')}</h5>
          {fb.strengths.length === 0 && <p className="text-xs text-slate-600 mt-1">{tt('udlwalk.no_strengths', 'Nothing was rated "observed" on this visit.')}</p>}
          <ul className="mt-1 space-y-1.5">
            {fb.strengths.map((lf) => (
              <li key={lf.id} className="text-xs text-slate-700 bg-green-50 border border-green-200 rounded-lg p-2">
                <span className="font-bold">{lf.guideline}:</span> {lf.prompt}
              </li>
            ))}
          </ul>
        </div>
        {fb.consider && (
          <div className="mt-3">
            <h5 className="text-sm font-bold text-amber-800">{tt('udlwalk.consider', 'One thing to consider')}</h5>
            <div className="mt-1 text-xs text-slate-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p><span className="font-bold">{fb.consider.guideline}:</span> {fb.consider.prompt}</p>
              {fb.suggestion && <p className="mt-1.5 text-slate-600">{fb.suggestion}</p>}
            </div>
          </div>
        )}
        {(session.studentIndicators || []).length > 0 && (
          <div className="mt-3">
            <h5 className="text-sm font-bold text-sky-800">{tt('udlwalk.student_moments', 'Student moments')}</h5>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {(session.studentIndicators || []).map((m, i) => {
                const ind = UDLWALK_STUDENT_INDICATORS.find((s) => s.id === m.id);
                return <li key={i} className="text-[10px] font-bold px-2 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300">{ind ? ind.label : m.id}</li>;
              })}
            </ul>
          </div>
        )}
        {session.summaryNote && (
          <div className="mt-3">
            <h5 className="text-sm font-bold text-slate-700">{tt('udlwalk.summary_note', 'Observer note')}</h5>
            <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{session.summaryNote}</p>
          </div>
        )}
        <p className="mt-4 text-[10px] text-slate-500 border-t border-slate-200 pt-2">
          {tt('udlwalk.integrity_note', 'UDL-aligned look-fors based on the CAST UDL Guidelines 3.0 structure — not a validated fidelity instrument. Growth-framed: instructional-practice data, not teacher evaluation. All data stays on this device.')}
        </p>
      </div>
    </div>
  );
}

function UdlWalkthroughPanel(props) {
  const { onClose, t, addToast = (() => {}) } = props;
  // Host ctx.t is SINGLE-ARG and can miss — always go through tt(key, fallback).
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);

  const [config, setConfig] = React.useState(() => {
    const c = udlwalkLoad(UDLWALK_CONFIG_KEY, {});
    return { buildingName: '', anonymizeTeachers: false, frameworkVersion: UDLWALK_FRAMEWORK, observerInitials: '', observerRole: 'admin', ...(c && typeof c === 'object' ? c : {}) };
  });
  const [roster, setRoster] = React.useState(() => { const r = udlwalkLoad(UDLWALK_ROSTER_KEY, []); return Array.isArray(r) ? r : []; });
  const [sessions, setSessions] = React.useState(() => { const s = udlwalkLoad(UDLWALK_SESSIONS_KEY, []); return Array.isArray(s) ? s : []; });
  const [tab, setTab] = React.useState('observe');
  // A dropped tablet or an accidental Escape must not eat a half-done visit:
  // the draft persists to localStorage and is resumed on reopen.
  const [draft, setDraft] = React.useState(() => {
    const d = udlwalkLoad(UDLWALK_DRAFT_KEY, null);
    return (d && typeof d === 'object' && d.teacherId && d.evidence && typeof d.evidence === 'object') ? d : null;
  });
  const [openPrinciple, setOpenPrinciple] = React.useState('engagement');
  const [momentPickerOpen, setMomentPickerOpen] = React.useState(false);
  const [viewSessionId, setViewSessionId] = React.useState(null);
  const [newTeacherName, setNewTeacherName] = React.useState('');
  const [newTeacherGrade, setNewTeacherGrade] = React.useState('');
  const [elapsedMin, setElapsedMin] = React.useState(0);
  const [irA, setIrA] = React.useState('');
  const [irB, setIrB] = React.useState('');
  const dialogRef = React.useRef(null);
  const importInputRef = React.useRef(null);

  React.useEffect(() => { udlwalkStore(UDLWALK_CONFIG_KEY, config); }, [config]);
  React.useEffect(() => { udlwalkStore(UDLWALK_ROSTER_KEY, roster); }, [roster]);
  React.useEffect(() => { udlwalkStore(UDLWALK_SESSIONS_KEY, sessions); }, [sessions]);
  React.useEffect(() => {
    if (draft) udlwalkStore(UDLWALK_DRAFT_KEY, draft);
    else { try { localStorage.removeItem(UDLWALK_DRAFT_KEY); } catch (_) {} }
  }, [draft]);

  // Elapsed-time readout: a 30s interval, not RAF — coarse is fine for minutes.
  // Editing a saved visit keeps its original duration; no live timer.
  React.useEffect(() => {
    if (!draft || !draft.startedAt || draft.editingId) { setElapsedMin(0); return undefined; }
    const update = () => setElapsedMin(Math.max(0, Math.round((Date.now() - draft.startedAt) / 60000)));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [draft && draft.startedAt]);

  // Focus trap + Escape, mirroring the Educator Hub pattern.
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.closest('[hidden], [inert], [aria-hidden="true"]'));
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const wasTop = isTopTrap();
      const idx = trapStack.indexOf(trap);
      if (idx !== -1) trapStack.splice(idx, 1);
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);

  const startDraft = (teacherId) => {
    setDraft({
      teacherId,
      startedAt: Date.now(),
      context: { grouping: 'whole', lessonPhase: 'instruction' },
      evidence: {},
      studentIndicators: [],
      summaryNote: '',
    });
    setOpenPrinciple('engagement');
    udlwalkAnnounce(tt('udlwalk.started_announce', 'Walkthrough started. Timer running.'));
  };

  const cycleRating = (lookForId) => {
    setDraft((d) => {
      if (!d) return d;
      const entry = d.evidence[lookForId] || {};
      const current = entry.rating && entry.rating !== 'no_opp' ? UDLWALK_RATINGS.indexOf(entry.rating) : -1;
      const nextRating = current === UDLWALK_RATINGS.length - 1 ? null : UDLWALK_RATINGS[current + 1];
      const evidence = { ...d.evidence, [lookForId]: { ...entry, rating: nextRating } };
      if (!nextRating && !entry.note) delete evidence[lookForId];
      return { ...d, evidence };
    });
  };

  const setNoOpp = (lookForId) => {
    setDraft((d) => {
      if (!d) return d;
      const entry = d.evidence[lookForId] || {};
      const nextRating = entry.rating === 'no_opp' ? null : 'no_opp';
      const evidence = { ...d.evidence, [lookForId]: { ...entry, rating: nextRating } };
      if (!nextRating && !entry.note) delete evidence[lookForId];
      return { ...d, evidence };
    });
  };

  const setNote = (lookForId, note) => {
    setDraft((d) => {
      if (!d) return d;
      const entry = d.evidence[lookForId] || {};
      return { ...d, evidence: { ...d.evidence, [lookForId]: { ...entry, note } } };
    });
  };

  const logMoment = (indicatorId) => {
    setDraft((d) => d ? { ...d, studentIndicators: [...d.studentIndicators, { id: indicatorId, at: Date.now() }] } : d);
    setMomentPickerOpen(false);
    const ind = UDLWALK_STUDENT_INDICATORS.find((s) => s.id === indicatorId);
    udlwalkAnnounce((ind ? ind.label : 'Student moment') + ' ' + tt('udlwalk.logged_announce', 'logged.'));
  };

  const saveDraft = () => {
    if (!draft) return;
    if (draft.editingId) {
      // Editing a saved visit: update content, keep identity fields (id,
      // date, duration, original observer stamp) exactly as recorded.
      setSessions((s) => s.map((x) => x.id === draft.editingId ? {
        ...x,
        context: draft.context,
        evidence: draft.evidence,
        studentIndicators: draft.studentIndicators,
        summaryNote: draft.summaryNote,
      } : x));
      setDraft(null);
      setTab('sessions');
      setViewSessionId(draft.editingId);
      addToast(tt('udlwalk.updated_toast', 'Visit updated.'), 'success');
      return;
    }
    const now = new Date();
    const session = {
      id: udlwalkNextId('wt'),
      teacherId: draft.teacherId,
      date: now.toISOString().slice(0, 10),
      startedAt: draft.startedAt,
      durationMin: Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000)),
      context: draft.context,
      evidence: draft.evidence,
      studentIndicators: draft.studentIndicators,
      summaryNote: draft.summaryNote,
      frameworkVersion: config.frameworkVersion || UDLWALK_FRAMEWORK,
      observer: { initials: (config.observerInitials || '').trim(), role: config.observerRole || '' },
      sharedWithTeacher: false,
    };
    setSessions((s) => [session, ...s]);
    setDraft(null);
    setTab('sessions');
    setViewSessionId(session.id);
    addToast(tt('udlwalk.saved_toast', 'Walkthrough saved.'), 'success');
  };

  const editSession = (session) => {
    setDraft({
      teacherId: session.teacherId,
      startedAt: session.startedAt,
      editingId: session.id,
      context: { grouping: 'whole', lessonPhase: 'instruction', ...(session.context || {}) },
      evidence: { ...(session.evidence || {}) },
      studentIndicators: [...(session.studentIndicators || [])],
      summaryNote: session.summaryNote || '',
    });
    setOpenPrinciple('engagement');
    setTab('observe');
    udlwalkAnnounce(tt('udlwalk.editing_announce', 'Editing a saved visit. Save to apply changes.'));
  };

  const discardDraft = () => { setDraft(null); udlwalkAnnounce(tt('udlwalk.discarded_announce', 'Walkthrough discarded.')); };

  const addTeacher = () => {
    const name = newTeacherName.trim();
    const entry = { id: udlwalkNextId('tch'), code: udlwalkNextTeacherCode(roster), name, grade: newTeacherGrade.trim(), subject: '', notes: '' };
    setRoster((r) => [...r, entry]);
    setNewTeacherName('');
    setNewTeacherGrade('');
    addToast(tt('udlwalk.teacher_added', 'Added') + ' ' + (name || entry.code), 'success');
  };

  const exportJson = () => {
    try {
      const payload = { kind: 'alloflow-udl-walkthrough', version: 1, exportedAt: new Date().toISOString(), config, roster, sessions };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'udl-walkthrough-export-' + udlwalkDateStamp() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      addToast(tt('udlwalk.export_toast', 'Export started — check your downloads.'), 'info');
    } catch (e) {
      addToast(tt('udlwalk.export_failed', 'Export failed: ') + String(e && e.message), 'error');
    }
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || data.kind !== 'alloflow-udl-walkthrough') { addToast(tt('udlwalk.import_bad', 'That file is not a UDL Walkthrough export.'), 'error'); return; }
        // Merge, don't replace: existing ids win so an old export can't clobber newer local work.
        setRoster((r) => {
          const have = new Set(r.map((x) => x.id));
          return [...r, ...((data.roster || []).filter((x) => x && x.id && !have.has(x.id)))];
        });
        setSessions((s) => {
          const have = new Set(s.map((x) => x.id));
          const merged = [...s, ...((data.sessions || []).filter((x) => x && x.id && !have.has(x.id)))];
          merged.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
          return merged;
        });
        if (data.config && !config.buildingName && data.config.buildingName) {
          setConfig((c) => ({ ...c, buildingName: data.config.buildingName }));
        }
        addToast(tt('udlwalk.import_toast', 'Import merged.'), 'success');
      } catch (e) {
        addToast(tt('udlwalk.import_failed', 'Import failed: ') + String(e && e.message), 'error');
      }
    };
    reader.onerror = () => addToast(tt('udlwalk.import_failed', 'Import failed: ') + 'read error', 'error');
    reader.readAsText(file);
  };

  const teacherById = (id) => roster.find((r) => r.id === id) || null;
  const viewSession = viewSessionId ? sessions.find((s) => s.id === viewSessionId) : null;

  const ratedCount = draft ? Object.values(draft.evidence).filter((e) => e && e.rating).length : 0;

  const tabs = [
    { id: 'observe', label: tt('udlwalk.tab_observe', 'Observe'), icon: '🚪' },
    { id: 'sessions', label: tt('udlwalk.tab_sessions', 'Visits'), icon: '🗂️' },
    { id: 'building', label: tt('udlwalk.tab_building', 'Building'), icon: '🏫' },
    { id: 'setup', label: tt('udlwalk.tab_setup', 'Roster & setup'), icon: '⚙️' },
  ];

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-2 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} data-help-key="udlwalk_panel" className="allo-docsuite bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true" aria-labelledby="udlwalk-title" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 px-4 pt-4 pb-2 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 id="udlwalk-title" className="text-lg font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">🚪</span> {tt('udlwalk.title', 'UDL Walkthrough')}</h2>
              <p className="text-xs text-slate-600">{tt('udlwalk.subtitle', 'Growth-framed classroom visits through a UDL lens — data stays on this device.')}</p>
            </div>
            <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xl" aria-label={tt('udlwalk.close_aria', 'Close UDL Walkthrough')}>✕</button>
          </div>
          <div role="tablist" aria-label={tt('udlwalk.tabs_aria', 'Walkthrough sections')} className="flex gap-1 mt-2">
            {tabs.map((tb, tbIdx) => (
              <button key={tb.id} type="button" role="tab" id={'udlwalk-tab-' + tb.id} aria-selected={tab === tb.id}
                aria-controls="udlwalk-tabpanel" tabIndex={tab === tb.id ? 0 : -1} data-help-key={'udlwalk_tab_' + tb.id}
                onClick={() => { setTab(tb.id); if (tb.id !== 'sessions') setViewSessionId(null); }}
                onKeyDown={(e) => {
                  // Full ARIA tabs contract: role="tab" without arrow keys is
                  // announced-but-dead for screen-reader users.
                  let next = null;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (tbIdx + 1) % tabs.length;
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (tbIdx - 1 + tabs.length) % tabs.length;
                  else if (e.key === 'Home') next = 0;
                  else if (e.key === 'End') next = tabs.length - 1;
                  if (next == null) return;
                  e.preventDefault();
                  const id = tabs[next].id;
                  setTab(id);
                  if (id !== 'sessions') setViewSessionId(null);
                  const el = document.getElementById('udlwalk-tab-' + id);
                  if (el) el.focus();
                }}
                className={'min-h-11 px-3 py-1.5 rounded-t-lg text-sm font-bold border-b-2 ' + (tab === tb.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100')}
              ><span aria-hidden="true">{tb.icon}</span> {tb.label}</button>
            ))}
          </div>
        </div>

        <div className="p-4" role="tabpanel" id="udlwalk-tabpanel" aria-labelledby={'udlwalk-tab-' + tab} tabIndex={-1}>
          {tab === 'observe' && !draft && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('udlwalk.pick_teacher', 'Who are you visiting?')}</h3>
              {roster.length === 0 && (
                <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3 mb-3">
                  {tt('udlwalk.empty_roster', 'No classrooms yet — add them under "Roster & setup", or quick-add one below.')}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {roster.filter((r) => !r.archived).map((r) => (
                  <button key={r.id} type="button" onClick={() => startDraft(r.id)}
                    className="min-h-11 p-3 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 text-left"
                  >
                    <span className="block font-bold text-sm text-indigo-800">{udlwalkTeacherDisplay(r, config.anonymizeTeachers)}</span>
                    <span className="block text-[10px] text-slate-500">{[r.grade, r.subject].filter(Boolean).join(' · ') || r.code}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end bg-white border border-slate-300 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor="udlwalk-quick-name" className="block text-[10px] font-bold text-slate-600 mb-0.5">{tt('udlwalk.quick_add_name', 'Teacher name (optional — a code is assigned either way)')}</label>
                  <input id="udlwalk-quick-name" type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-24">
                  <label htmlFor="udlwalk-quick-grade" className="block text-[10px] font-bold text-slate-600 mb-0.5">{tt('udlwalk.quick_add_grade', 'Grade')}</label>
                  <input id="udlwalk-quick-grade" type="text" value={newTeacherGrade} onChange={(e) => setNewTeacherGrade(e.target.value)} className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="button" onClick={addTeacher} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">{tt('udlwalk.quick_add', 'Add')}</button>
              </div>
            </div>
          )}

          {tab === 'observe' && draft && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{udlwalkTeacherDisplay(teacherById(draft.teacherId), config.anonymizeTeachers)}</p>
                  <p className="text-xs text-slate-600" aria-live="off">
                    {draft.editingId
                      ? (tt('udlwalk.editing_saved', 'Editing saved visit') + ' · ' + (((sessions.find((s) => s.id === draft.editingId)) || {}).date || ''))
                      : (elapsedMin + ' ' + tt('udlwalk.minutes_elapsed', 'min elapsed'))}
                    {' · '}{ratedCount}/{UDLWALK_LOOK_FORS.length} {tt('udlwalk.rated', 'rated')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={discardDraft} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100">{draft.editingId ? tt('udlwalk.discard_edits', 'Discard edits') : tt('udlwalk.discard', 'Discard')}</button>
                  <button type="button" onClick={saveDraft} className="min-h-11 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700">{draft.editingId ? tt('udlwalk.save_edits', 'Save changes') : tt('udlwalk.save', 'Save visit')}</button>
                </div>
              </div>

              <fieldset className="flex flex-wrap gap-1.5 mb-1.5">
                <legend className="sr-only">{tt('udlwalk.grouping_legend', 'Grouping during this visit')}</legend>
                {UDLWALK_GROUPINGS.map((g) => (
                  <button key={g.id} type="button" aria-pressed={draft.context.grouping === g.id}
                    onClick={() => setDraft((d) => ({ ...d, context: { ...d.context, grouping: g.id } }))}
                    className={'min-h-9 px-2.5 py-1 rounded-full border text-xs font-bold ' + (draft.context.grouping === g.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100')}
                  >{tt('udlwalk.grouping_' + g.id, g.label)}</button>
                ))}
              </fieldset>
              <fieldset className="flex flex-wrap gap-1.5 mb-3">
                <legend className="sr-only">{tt('udlwalk.phase_legend', 'Lesson phase during this visit')}</legend>
                {UDLWALK_PHASES.map((p) => (
                  <button key={p.id} type="button" aria-pressed={draft.context.lessonPhase === p.id}
                    onClick={() => setDraft((d) => ({ ...d, context: { ...d.context, lessonPhase: p.id } }))}
                    className={'min-h-9 px-2.5 py-1 rounded-full border text-xs font-bold ' + (draft.context.lessonPhase === p.id ? 'bg-sky-600 text-white border-sky-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100')}
                  >{tt('udlwalk.phase_' + p.id, p.label)}</button>
                ))}
              </fieldset>

              {UDLWALK_PRINCIPLES.map((pr) => {
                const items = UDLWALK_LOOK_FORS.filter((lf) => lf.principle === pr.id);
                const done = items.filter((lf) => draft.evidence[lf.id] && draft.evidence[lf.id].rating).length;
                const open = openPrinciple === pr.id;
                return (
                  <div key={pr.id} className="mb-2">
                    <button type="button" aria-expanded={open}
                      onClick={() => setOpenPrinciple(open ? null : pr.id)}
                      className="w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100"
                    >
                      <span className="font-bold text-sm text-slate-800">{tt('udlwalk.principle_' + pr.id, pr.label)} <span className="font-normal text-xs text-slate-500">({pr.hint})</span></span>
                      <span className="text-xs text-slate-600">{done}/{items.length} <span aria-hidden="true">{open ? '▾' : '▸'}</span></span>
                    </button>
                    {open && (
                      <div className="mt-1.5 space-y-1.5">
                        {items.map((lf) => (
                          <UdlWalkLookForCard key={lf.id} lookFor={lf} entry={draft.evidence[lf.id]}
                            onCycle={() => cycleRating(lf.id)}
                            onNoOpp={() => setNoOpp(lf.id)}
                            onNote={(note) => setNote(lf.id, note)}
                            tt={tt} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-3">
                <button type="button" aria-expanded={momentPickerOpen} onClick={() => setMomentPickerOpen((v) => !v)}
                  className="min-h-11 w-full px-3 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700"
                ><span aria-hidden="true">✨</span> {tt('udlwalk.student_moment', 'Student moment')} {draft.studentIndicators.length > 0 ? ('(' + draft.studentIndicators.length + ')') : ''}</button>
                {momentPickerOpen && (
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {UDLWALK_STUDENT_INDICATORS.map((ind) => (
                      <button key={ind.id} type="button" onClick={() => logMoment(ind.id)}
                        className="min-h-11 p-2 rounded-lg border border-sky-300 bg-white hover:bg-sky-50 text-left"
                      >
                        <span className="block text-xs font-bold text-sky-800">{tt('udlwalk.' + ind.id, ind.label)}</span>
                        <span className="block text-[10px] text-slate-500">{ind.detail}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <label htmlFor="udlwalk-summary" className="block text-xs font-bold text-slate-600 mb-1">{tt('udlwalk.summary_label', 'Observer note (optional)')}</label>
                <textarea id="udlwalk-summary" rows={2} value={draft.summaryNote}
                  onChange={(e) => setDraft((d) => ({ ...d, summaryNote: e.target.value }))}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {tab === 'sessions' && viewSession && (
            <UdlWalkFeedbackCard session={viewSession} teacher={teacherById(viewSession.teacherId)}
              anonymize={config.anonymizeTeachers} addToast={addToast} tt={tt}
              onBack={() => setViewSessionId(null)}
              onEdit={() => {
                if (draft && !draft.editingId) { addToast(tt('udlwalk.edit_blocked', 'Finish or discard the walkthrough in progress first.'), 'warning'); return; }
                editSession(viewSession);
              }}
              onToggleShared={() => setSessions((s) => s.map((x) => x.id === viewSession.id ? { ...x, sharedWithTeacher: !x.sharedWithTeacher } : x))}
              onDelete={() => { setSessions((s) => s.filter((x) => x.id !== viewSession.id)); setViewSessionId(null); addToast(tt('udlwalk.deleted_toast', 'Visit deleted.'), 'info'); }} />
          )}

          {tab === 'sessions' && !viewSession && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('udlwalk.sessions_title', 'Saved visits')}</h3>
              {sessions.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('udlwalk.no_sessions', 'No visits saved yet. Start one from the Observe tab.')}</p>}
              <ul className="space-y-1.5">
                {sessions.map((s) => {
                  const teacher = teacherById(s.teacherId);
                  const rated = Object.values(s.evidence || {}).filter((e) => e && e.rating && e.rating !== 'no_opp');
                  const obs = rated.filter((e) => e.rating === 'observed').length;
                  return (
                    <li key={s.id}>
                      <button type="button" onClick={() => setViewSessionId(s.id)}
                        className="w-full min-h-11 flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-300 bg-white hover:bg-indigo-50 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-sm text-slate-800">{udlwalkTeacherDisplay(teacher, config.anonymizeTeachers)}</span>
                          <span className="block text-[10px] text-slate-500">{s.date} · {s.durationMin} {tt('udlwalk.minutes', 'min')}{(s.observer && s.observer.initials) ? (' · ' + tt('udlwalk.observer_short', 'obs.') + ' ' + s.observer.initials) : ''} · {(s.studentIndicators || []).length} {tt('udlwalk.moments_short', 'moments')}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-xs font-bold text-green-700">{obs}/{rated.length} <span className="font-normal text-slate-500">{tt('udlwalk.observed_short', 'observed')}</span></span>
                          {s.sharedWithTeacher && <span className="block text-[10px] font-bold text-green-700">{tt('udlwalk.shared_badge', '✓ shared')}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === 'building' && (() => {
            const agg = udlwalkAggregate(sessions, roster);
            const sessionLabel = (s) => udlwalkTeacherDisplay(teacherById(s.teacherId), config.anonymizeTeachers) + ' · ' + s.date + ' · ' + s.durationMin + ' ' + tt('udlwalk.minutes', 'min') + ((s.observer && s.observer.initials) ? (' · ' + s.observer.initials) : '');
            const sessA = sessions.find((s) => s.id === irA) || null;
            const sessB = sessions.find((s) => s.id === irB) || null;
            const agreement = (sessA && sessB && sessA.id !== sessB.id) ? udlwalkAgreement(sessA, sessB) : null;
            const cellView = (c) => {
              if (!c || !c.rated) return { text: '—', cls: 'bg-slate-50 text-slate-400' };
              const rate = c.observed / c.rated;
              const cls = rate >= 0.7 ? 'bg-green-100 text-green-900' : rate >= 0.4 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900';
              return { text: Math.round(rate * 100) + '%', n: c.rated, cls };
            };
            return (
              <div>
                {sessions.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('udlwalk.building_empty', 'The building view fills in as visits are saved. Start on the Observe tab.')}</p>}
                {sessions.length > 0 && (
                  <div>
                    <div className="overflow-x-auto bg-white border border-slate-300 rounded-xl p-2">
                      <table className="w-full text-xs border-collapse">
                        <caption className="text-left text-sm font-bold text-slate-700 p-1">{tt('udlwalk.heatmap_caption', 'Share of ratings marked "observed", by guideline')}</caption>
                        <thead>
                          <tr>
                            <th scope="col" className="text-left p-1.5 text-slate-600">{tt('udlwalk.heatmap_guideline', 'Guideline')}</th>
                            {agg.grades.map((g) => <th key={g} scope="col" className="p-1.5 text-slate-600">{g === UDLWALK_UNGRADED ? tt('udlwalk.ungraded', 'No grade') : g}</th>)}
                            <th scope="col" className="p-1.5 text-slate-700 font-bold">{tt('udlwalk.heatmap_all', 'All')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {UDLWALK_GUIDELINES.map((g) => {
                            const total = cellView(agg.totals[g.id]);
                            return (
                              <tr key={g.id} className="border-t border-slate-200">
                                <th scope="row" className="text-left p-1.5 font-normal text-slate-700">
                                  <span className="font-bold">{g.label}</span>{' '}
                                  <span className="text-[10px] text-slate-500">({(UDLWALK_PRINCIPLES.find((p) => p.id === g.principle) || {}).label})</span>
                                </th>
                                {agg.grades.map((grade) => {
                                  const v = cellView(agg.cells[g.id][grade]);
                                  {/* No opacity on the n-counts: axe flagged 75% opacity as
                                      sub-AA contrast on the tinted cell backgrounds. */}
                                  return <td key={grade} className={'p-1.5 text-center rounded ' + v.cls}>{v.text}{v.n ? <span className="text-[9px]"> (n={v.n})</span> : null}</td>;
                                })}
                                <td className={'p-1.5 text-center font-bold rounded ' + total.cls}>{total.text}{total.n ? <span className="text-[9px]"> (n={total.n})</span> : null}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">{tt('udlwalk.heatmap_note', '"No opportunity" ratings are excluded from every denominator. A small n is thin evidence, not a verdict.')}</p>

                    {(() => {
                      const trend = udlwalkTrend(sessions);
                      if (trend.buckets.length < 2) {
                        return <p className="text-[10px] text-slate-500 mt-1">{tt('udlwalk.trend_pending', 'Trend lines appear once visits span two or more months.')}</p>;
                      }
                      return <UdlWalkTrendChart trend={trend} tt={tt} />;
                    })()}

                    {agg.pdSignals.length > 0 && (
                      <div className="mt-3 bg-white border border-indigo-300 rounded-xl p-3">
                        <h4 className="text-sm font-bold text-indigo-800">{tt('udlwalk.pd_title', 'PD signals')}</h4>
                        <p className="text-[10px] text-slate-500">{tt('udlwalk.pd_note', 'Lowest observed-rates with at least ' + agg.minN + ' rated observations building-wide — framed as PD topics, not verdicts.')}</p>
                        <ul className="mt-1.5 space-y-1">
                          {agg.pdSignals.map((sig) => {
                            const g = UDLWALK_GUIDELINES.find((x) => x.id === sig.id);
                            return (
                              <li key={sig.id} className="text-xs text-slate-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                                <span className="font-bold">{g ? g.label : sig.id}</span> — {Math.round(sig.rate * 100)}% {tt('udlwalk.observed_short', 'observed')} (n={sig.n}). {UDLWALK_SUGGESTIONS[g ? g.principle : ''] || ''}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 bg-white border border-slate-300 rounded-xl p-3">
                      <h4 className="text-sm font-bold text-slate-700">{tt('udlwalk.coverage_title', 'Coverage')}</h4>
                      <p className="text-[10px] text-slate-500">{tt('udlwalk.coverage_note', 'Walkthrough initiatives die from uneven coverage — who has not had a visit lately?')}</p>
                      <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {agg.coverage.map((c) => {
                          const teacher = teacherById(c.teacherId);
                          return (
                            <li key={c.teacherId} className={'text-xs p-2 rounded-lg border ' + (c.visits === 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700')}>
                              <span className="font-bold">{udlwalkTeacherDisplay(teacher, config.anonymizeTeachers)}</span>{' — '}
                              {c.visits === 0 ? tt('udlwalk.coverage_never', 'no visits yet') : (c.visits + ' ' + tt('udlwalk.coverage_visits', 'visit(s), last') + ' ' + c.lastDate)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="mt-3 bg-white border border-slate-300 rounded-xl p-3">
                      <h4 className="text-sm font-bold text-slate-700">{tt('udlwalk.research_title', 'Research export (de-identified)')}</h4>
                      <p className="text-[10px] text-slate-500">{tt('udlwalk.research_note', 'Teacher codes only — never names. Free-text notes are excluded (they can contain names); only their presence is exported. Building name is omitted.')}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <button type="button" onClick={() => {
                          const rows = udlwalkResearchRows(sessions, roster);
                          if (!rows.length) { addToast(tt('udlwalk.research_empty', 'No rated evidence to export yet.'), 'warning'); return; }
                          // UTF-8 BOM: without it Excel decodes the CSV as ANSI and mangles non-ASCII.
                          udlwalkDownload('udl-walkthrough-research-' + udlwalkDateStamp() + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + udlwalkCsv(rows), addToast, tt('udlwalk.export_toast', 'Export started — check your downloads.'), tt('udlwalk.export_failed', 'Export failed: '));
                        }} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('udlwalk.research_csv', 'Research CSV')}</button>
                        <button type="button" onClick={() => {
                          const rows = udlwalkResearchRows(sessions, roster);
                          if (!rows.length) { addToast(tt('udlwalk.research_empty', 'No rated evidence to export yet.'), 'warning'); return; }
                          const payload = { kind: 'alloflow-udl-walkthrough-research', version: 1, exportedAt: new Date().toISOString(), framework: config.frameworkVersion || UDLWALK_FRAMEWORK, rows };
                          udlwalkDownload('udl-walkthrough-research-' + udlwalkDateStamp() + '.json', 'application/json', JSON.stringify(payload, null, 2), addToast, tt('udlwalk.export_toast', 'Export started — check your downloads.'), tt('udlwalk.export_failed', 'Export failed: '));
                        }} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('udlwalk.research_json', 'Research JSON')}</button>
                      </div>
                    </div>

                    <div className="mt-3 bg-white border border-slate-300 rounded-xl p-3">
                      <h4 className="text-sm font-bold text-slate-700">{tt('udlwalk.ir_title', 'Inter-rater check')}</h4>
                      <p className="text-[10px] text-slate-500">{tt('udlwalk.ir_note', 'Two observers record the same lesson on their own devices, one imports the other’s export (Roster & setup tab), then compare the two visits here. Exact-match agreement on items both observers rated; "no opportunity" counts as a rating.')}</p>
                      <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="udlwalk-ir-a" className="block text-[10px] font-bold text-slate-600 mb-0.5">{tt('udlwalk.ir_a', 'Observer A visit')}</label>
                          <select id="udlwalk-ir-a" value={irA} onChange={(e) => setIrA(e.target.value)} className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">{tt('udlwalk.ir_pick', 'Choose a visit…')}</option>
                            {sessions.map((s) => <option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="udlwalk-ir-b" className="block text-[10px] font-bold text-slate-600 mb-0.5">{tt('udlwalk.ir_b', 'Observer B visit')}</label>
                          <select id="udlwalk-ir-b" value={irB} onChange={(e) => setIrB(e.target.value)} className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">{tt('udlwalk.ir_pick', 'Choose a visit…')}</option>
                            {sessions.map((s) => <option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}
                          </select>
                        </div>
                      </div>
                      {irA && irB && irA === irB && <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{tt('udlwalk.ir_same', 'Choose two different visits.')}</p>}
                      {agreement && (
                        <div className="mt-2 text-xs text-slate-700">
                          {agreement.bothRated === 0 ? (
                            <p className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-900">{tt('udlwalk.ir_none', 'These two visits have no look-fors that both observers rated.')}</p>
                          ) : (
                            <div>
                              <p className="font-bold text-slate-800">{Math.round(agreement.pct * 100)}% {tt('udlwalk.ir_agree', 'agreement')} ({agreement.agree}/{agreement.bothRated} {tt('udlwalk.ir_both', 'items both rated')}{agreement.onlyOne ? ('; ' + agreement.onlyOne + ' ' + tt('udlwalk.ir_only_one', 'rated by only one observer')) : ''}){agreement.kappa != null ? (' · κ = ' + agreement.kappa.toFixed(2)) : ''}</p>
                              {agreement.kappa != null && <p className="text-[10px] text-slate-500 mt-0.5">{tt('udlwalk.ir_kappa_note', 'κ is Cohen’s kappa — agreement corrected for chance. Raw percent agreement overstates reliability when most ratings fall in one category; report κ for research use.')}</p>}
                              {agreement.disagreements.length > 0 && (
                                <ul className="mt-1.5 space-y-1">
                                  {agreement.disagreements.map((d) => (
                                    <li key={d.id} className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                                      <span className="font-bold">{d.guideline}</span> ({d.id}): A = {(UDLWALK_RATING_META[d.a] || {}).label}, B = {(UDLWALK_RATING_META[d.b] || {}).label}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {tab === 'setup' && (
            <div>
              <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <div className="flex gap-2 items-end mb-2">
                  <div className="w-28">
                    <label htmlFor="udlwalk-observer" className="block text-xs font-bold text-slate-600 mb-1">{tt('udlwalk.observer_label', 'Your initials')}</label>
                    <input id="udlwalk-observer" type="text" maxLength={6} value={config.observerInitials || ''}
                      onChange={(e) => setConfig((c) => ({ ...c, observerInitials: e.target.value }))}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label htmlFor="udlwalk-observer-role" className="block text-xs font-bold text-slate-600 mb-1">{tt('udlwalk.observer_role_label', 'Role')}</label>
                    <select id="udlwalk-observer-role" value={config.observerRole || 'admin'}
                      onChange={(e) => setConfig((c) => ({ ...c, observerRole: e.target.value }))}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="admin">{tt('udlwalk.role_admin', 'Administrator')}</option>
                      <option value="coach">{tt('udlwalk.role_coach', 'Instructional coach')}</option>
                      <option value="specialist">{tt('udlwalk.role_specialist', 'Specialist / clinician')}</option>
                      <option value="other">{tt('udlwalk.role_other', 'Other')}</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">{tt('udlwalk.observer_note', 'Stamped on each saved visit so merged data from two observers stays attributable — required for the inter-rater check.')}</p>
                <label htmlFor="udlwalk-building" className="block text-xs font-bold text-slate-600 mb-1">{tt('udlwalk.building_label', 'Building name (appears on exports only)')}</label>
                <input id="udlwalk-building" type="text" value={config.buildingName}
                  onChange={(e) => setConfig((c) => ({ ...c, buildingName: e.target.value }))}
                  className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button type="button" aria-pressed={!!config.anonymizeTeachers}
                  onClick={() => setConfig((c) => ({ ...c, anonymizeTeachers: !c.anonymizeTeachers }))}
                  className={'mt-2 min-h-11 px-3 py-2 rounded-lg border text-sm font-bold ' + (config.anonymizeTeachers ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')}
                >{config.anonymizeTeachers ? tt('udlwalk.anon_on', 'Anonymized: codes shown instead of names') : tt('udlwalk.anon_off', 'Show teacher names (activate to anonymize)')}</button>
              </div>

              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('udlwalk.roster_title', 'Classrooms')}</h3>
              <ul className="space-y-1.5 mb-3">
                {[...roster].sort((a, b) => (a.archived ? 1 : 0) - (b.archived ? 1 : 0)).map((r) => (
                  <li key={r.id} className={'flex items-center gap-2 border rounded-xl p-2 ' + (r.archived ? 'bg-slate-100 border-slate-200 opacity-70' : 'bg-white border-slate-300')}>
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">{r.code}</span>
                    <input type="text" value={r.name} aria-label={tt('udlwalk.roster_name_aria', 'Teacher name') + ' ' + r.code}
                      onChange={(e) => setRoster((list) => list.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))}
                      placeholder={tt('udlwalk.name_placeholder', 'Name (optional)')}
                      className="flex-1 min-w-0 min-h-9 border border-slate-200 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="text" value={r.grade} aria-label={tt('udlwalk.roster_grade_aria', 'Grade for') + ' ' + r.code}
                      onChange={(e) => setRoster((list) => list.map((x) => x.id === r.id ? { ...x, grade: e.target.value } : x))}
                      placeholder={tt('udlwalk.grade_placeholder', 'Grade')}
                      className="w-16 min-h-9 border border-slate-200 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="text" value={r.subject} aria-label={tt('udlwalk.roster_subject_aria', 'Subject for') + ' ' + r.code}
                      onChange={(e) => setRoster((list) => list.map((x) => x.id === r.id ? { ...x, subject: e.target.value } : x))}
                      placeholder={tt('udlwalk.subject_placeholder', 'Subject')}
                      className="w-20 min-h-9 border border-slate-200 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button type="button" aria-pressed={!!r.archived}
                      onClick={() => setRoster((list) => list.map((x) => x.id === r.id ? { ...x, archived: !x.archived } : x))}
                      aria-label={(r.archived ? tt('udlwalk.restore_aria', 'Restore') : tt('udlwalk.archive_aria', 'Archive')) + ' ' + (r.name || r.code)}
                      className={'shrink-0 min-h-9 px-2 py-1 rounded border text-[10px] font-bold ' + (r.archived ? 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100')}
                    >{r.archived ? tt('udlwalk.restore', 'Restore') : tt('udlwalk.archive', 'Archive')}</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 items-end bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor="udlwalk-new-name" className="block text-[10px] font-bold text-slate-600 mb-0.5">{tt('udlwalk.quick_add_name', 'Teacher name (optional — a code is assigned either way)')}</label>
                  <input id="udlwalk-new-name" type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-24">
                  <label htmlFor="udlwalk-new-grade" className="block text-[10px] font-bold text-slate-600 mb-0.5">{tt('udlwalk.quick_add_grade', 'Grade')}</label>
                  <input id="udlwalk-new-grade" type="text" value={newTeacherGrade} onChange={(e) => setNewTeacherGrade(e.target.value)} className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="button" onClick={addTeacher} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">{tt('udlwalk.quick_add', 'Add')}</button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportJson} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('udlwalk.export', 'Export data (JSON)')}</button>
                <button type="button" onClick={() => { if (importInputRef.current) importInputRef.current.click(); }} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬆️</span> {tt('udlwalk.import', 'Import export file')}</button>
                <input ref={importInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label={tt('udlwalk.import_aria', 'Choose a UDL Walkthrough export file')}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; try { e.target.value = ''; } catch (_) {} if (f) importJson(f); }} />
              </div>
              <p className="mt-3 text-[10px] text-slate-500">
                {tt('udlwalk.setup_note', 'Gemini Canvas may not persist browser storage between sessions — export after observing if you need the data to survive. Imports merge; they never overwrite newer local work.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
