// @mode react
/*
    AlloFlow - Adaptive Levels, Layers, & Outputs
    Copyright (C) 2026 Aaron Pomeranz, PsyD
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, version 3
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// ── Agentic AlloBot, Stage S0: command registry + ⌘K palette ──
// (docs/allobot_agentic_design.md). ONE registry feeds three mouths —
// this palette (keyboard), the bot chat router (S1), and the voice loop
// (S2). Guardrails by construction: every run NARRATES (alloAnnounce +
// toast), destructive commands confirm first, student/parent modes see
// the accessibility-only registry. No AI anywhere in S0: matching is
// deterministic substring/word-prefix scoring.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Registry factory — ctx is a capability object the host assembles from
// the SAME named handlers it already passes to HeaderBar/FabStack/views.
// Each command: id, icon, label (primary, shown), aliases (matched),
// hint (one-liner), roles ('all' | 'teacher'), destructive?, run(ctx).
// run returns the narration string (spoken to SRs + toasted) — returning
// it (rather than fire-and-forget) is what enforces narrate-everything.
const _mkT = (rawT) => (k, f) => { let r = null; try { r = rawT ? rawT(k) : null; } catch (_) {} return (r && r !== k) ? r : (f || k); };

const READING_STOPWORDS = new Set('a an and are as at be book books by can for from get give help i in into is it me my of on or read reading readings recommend right show some source sources story stories suggest text texts the to want what with learn about please'.split(' '));
const READING_LANGUAGE_HINTS = {
  english: 'English', spanish: 'Spanish', french: 'French', hindi: 'Hindi', arabic: 'Arabic',
  portuguese: 'Portuguese', vietnamese: 'Vietnamese', urdu: 'Urdu', kiswahili: 'Kiswahili',
  swahili: 'Kiswahili', chinese: 'Chinese (Simplified)', mandarin: 'Chinese (Simplified)',
  bengali: 'Bengali', farsi: 'Farsi', persian: 'Farsi', nepali: 'Nepali', turkish: 'Turkish'
};
const READING_SOURCE_HINTS = {
  storyweaver: 'storyweaver', 'story weave': 'storyweaver', pratham: 'storyweaver',
  gutenberg: 'gutenberg', 'project gutenberg': 'gutenberg',
  frontiers: 'frontiers', 'frontiers for young minds': 'frontiers',
  nasa: 'nasa', noaa: 'noaa', usgs: 'usgs',
  wikisource: 'wikisource', 'wiki source': 'wikisource',
  'library of congress': 'loc', loc: 'loc',
  openstax: 'openstax', 'open stax': 'openstax'
};

function _compactReadingText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function _escapeReadingRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _stripReadingPhrase(text, phrase) {
  if (!phrase) return text;
  try {
    const re = new RegExp('\\b' + _escapeReadingRegex(phrase).replace(/\s+/g, '\\s+') + '\\b', 'ig');
    return _compactReadingText(String(text || '').replace(re, ' '));
  } catch (_) { return text; }
}

function _readingWords(value) {
  return _compactReadingText(value).toLowerCase()
    .replace(/['"]/g, '')
    .split(/[^a-z0-9\u00c0-\u024f]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !READING_STOPWORDS.has(w));
}

function _readingStem(word) {
  const w = String(word || '').toLowerCase();
  if (w.length > 5 && /(ing|ers|ies|ied)$/.test(w)) return w.replace(/(ing|ers|ies|ied)$/, '');
  if (w.length > 4 && /(ed|es|s)$/.test(w)) return w.replace(/(ed|es|s)$/, '');
  return w;
}

function _readingFieldText(book, fields) {
  return fields.map((f) => {
    const v = book && book[f];
    if (Array.isArray(v)) return v.join(' ');
    if (v && typeof v === 'object') return Object.values(v).join(' ');
    return v || '';
  }).join(' ').toLowerCase();
}

function normalizeReadingRequest(params) {
  const p = (params && typeof params === 'object') ? params : { topic: params };
  let topic = _compactReadingText(p.topic || p.query || p.text || p.rawText || '');
  const raw = topic;
  let grade = p.grade ? String(p.grade).match(/\d{1,2}/) : null;
  grade = grade ? grade[0] : null;
  let language = p.language ? _compactReadingText(p.language) : null;
  let source = p.source ? _compactReadingText(p.source).toLowerCase() : null;
  let format = p.format || p.kind || null;
  let audience = p.audience || null;

  if (!grade) {
    const gm = topic.match(/\b(?:for\s+)?(?:grade|gr\.?)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i) || topic.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+grade\b/i);
    if (gm) { grade = gm[1]; topic = _compactReadingText(topic.replace(gm[0], ' ')); }
  }

  const rawLower = raw.toLowerCase();
  const languageKeys = Object.keys(READING_LANGUAGE_HINTS).sort((a, b) => b.length - a.length);
  for (const key of languageKeys) {
    if (!language && new RegExp('\\b' + _escapeReadingRegex(key).replace(/\s+/g, '\\s+') + '\\b', 'i').test(rawLower)) language = READING_LANGUAGE_HINTS[key];
    if (language && READING_LANGUAGE_HINTS[key].toLowerCase() === String(language).toLowerCase()) topic = _stripReadingPhrase(topic, key);
  }

  const sourceKeys = Object.keys(READING_SOURCE_HINTS).sort((a, b) => b.length - a.length);
  for (const key of sourceKeys) {
    if (!source && new RegExp('\\b' + _escapeReadingRegex(key).replace(/\s+/g, '\\s+') + '\\b', 'i').test(rawLower)) source = READING_SOURCE_HINTS[key];
    if (source && READING_SOURCE_HINTS[key] === source) topic = _stripReadingPhrase(topic, key);
  }

  if (!format) {
    if (/\b(primary source|primary sources|historical document|historical documents)\b/i.test(raw)) format = 'primary_source';
    else if (/\b(nonfiction|non-fiction|informational|informative)\b/i.test(raw)) format = 'nonfiction';
    else if (/\b(article|articles|science article|science articles)\b/i.test(raw)) format = 'article';
    else if (/\b(story|stories|picture book|picture books|read aloud|read-aloud)\b/i.test(raw)) format = 'story';
  }
  if (!audience) {
    if (/\b(older students?|middle school|high school|teen|teens|challenging|chapter book)\b/i.test(raw)) audience = 'older';
    else if (/\b(younger students?|young students?|little kids?|early reader|beginner|primary grades?|picture book|read aloud|read-aloud)\b/i.test(raw)) audience = 'younger';
  }
  if (!grade && /\bmiddle school\b/i.test(raw)) grade = '6';
  if (!grade && /\bhigh school\b/i.test(raw)) grade = '9';
  if (!grade && /\belementary\b/i.test(raw)) grade = '3';

  topic = _compactReadingText(topic
    .replace(/(?:\s+\b(?:in|from|for)\b)+\s*$/i, ' ')
    .replace(/\b(?:nonfiction|non-fiction|informational|informative|article|articles|primary source|primary sources|picture book|picture books|read aloud|read-aloud|older students?|younger students?|middle school|high school|elementary)\b/ig, ' ')
    .replace(/\b(?:book|books|reading|readings|story|stories|source|sources|text|texts|about|on|for|please|some|me|right)\b/ig, ' '));

  return { topic, grade, language: language || null, source: source || null, format: format || null, audience: audience || null, raw };
}

function _readingParams(rawTopic, rawGrade) {
  return normalizeReadingRequest({ topic: rawTopic, grade: rawGrade });
}

function _readingLevelForGrade(grade) {
  const g = Number(String(grade || '').match(/\d{1,2}/)?.[0] || 0);
  if (!g) return null;
  if (g <= 1) return 1;
  if (g <= 2) return 2;
  if (g <= 4) return 3;
  if (g <= 5) return 4;
  if (g <= 8) return 5;
  return 6;
}

function _bookReadingLevel(book) {
  const raw = Number(String(book && book.level || '').match(/\d+/)?.[0] || 0);
  if (raw) return raw;
  const wc = Number(book && book.wordCount || 0);
  if (wc > 12000) return 6;
  if (wc > 3500) return 5;
  if (wc > 1200) return 4;
  if (wc > 500) return 3;
  if (wc > 180) return 2;
  return 1;
}

function _readingSourceLabel(book) {
  if (book && book.source && book.source.name) return String(book.source.name);
  const id = String(book && book.sourceId || '').toLowerCase();
  const labels = {
    storyweaver: 'StoryWeaver',
    frontiers: 'Frontiers for Young Minds',
    gutenberg: 'Project Gutenberg',
    nasa: 'NASA',
    noaa: 'NOAA',
    usgs: 'USGS',
    wikisource: 'Wikisource',
    loc: 'Library of Congress',
    openstax: 'OpenStax'
  };
  return labels[id] || id || '';
}

function _pushUniqueReadingReason(out, text) {
  const s = _compactReadingText(text);
  if (s && out.indexOf(s) < 0) out.push(s);
}

function readingMatchReasons(matchOrBook, params = null) {
  const match = matchOrBook && matchOrBook.book ? matchOrBook : { book: matchOrBook || {}, reasons: {} };
  const book = match.book || {};
  const meta = match.reasons || {};
  const req = normalizeReadingRequest(params || meta.request || {});
  const out = [];
  const level = meta.level || _bookReadingLevel(book);
  const desiredLevel = meta.desiredLevel || _readingLevelForGrade(req.grade);
  const sourceId = String(book.sourceId || '').toLowerCase();
  const contentType = String(book.contentType || '').toLowerCase();
  const sourceLabel = _readingSourceLabel(book);

  if (req.topic && (meta.hits || match.score)) _pushUniqueReadingReason(out, 'matches "' + req.topic + '"');
  if (req.grade) {
    const grade = String(req.grade).match(/\d{1,2}/)?.[0] || String(req.grade);
    if (desiredLevel && level && Math.abs(level - desiredLevel) <= 1) _pushUniqueReadingReason(out, 'near grade ' + grade);
    else if (level) _pushUniqueReadingReason(out, 'reading level ' + level);
  } else if (req.audience === 'older') {
    _pushUniqueReadingReason(out, level >= 5 ? 'good for older students' : 'shorter bridge text');
  } else if (req.audience === 'younger') {
    _pushUniqueReadingReason(out, level <= 3 ? 'good for younger readers' : 'supported reading practice');
  }

  if (req.language && book.language) _pushUniqueReadingReason(out, book.language);
  else if (book.language && String(book.language).toLowerCase() !== 'english') _pushUniqueReadingReason(out, book.language);

  if (req.source && sourceLabel) _pushUniqueReadingReason(out, sourceLabel);
  if (req.format === 'primary_source' || meta.isPrimary) _pushUniqueReadingReason(out, 'primary source');
  else if (req.format === 'article' || contentType === 'article') _pushUniqueReadingReason(out, sourceId === 'frontiers' ? 'student science article' : 'article format');
  else if (req.format === 'nonfiction' || meta.isNonfiction) _pushUniqueReadingReason(out, 'nonfiction');
  else if (req.format === 'story' || contentType === 'story') _pushUniqueReadingReason(out, 'story format');

  if (!out.length && sourceLabel) _pushUniqueReadingReason(out, sourceLabel);
  return out.slice(0, 4);
}

function readingMatchWhyText(matchOrBook, params = null) {
  return readingMatchReasons(matchOrBook, params).join(', ');
}

function findReadingMatches(catalog, params = {}, opts = {}) {
  const books = Array.isArray(catalog) ? catalog : (catalog && Array.isArray(catalog.books) ? catalog.books : []);
  const req = normalizeReadingRequest(params);
  const phrase = _compactReadingText(req.topic).toLowerCase();
  const terms = _readingWords(req.topic);
  const stems = terms.map(_readingStem);
  const desiredLevel = _readingLevelForGrade(req.grade);
  const hasConstraint = !!(terms.length || phrase || req.language || req.source || req.format || req.audience || desiredLevel);
  if (!books.length || !hasConstraint) return [];
  const limit = Math.max(1, Number(opts.limit || 5));
  const out = [];

  for (const book of books) {
    if (!book || !book.title) continue;
    const title = _readingFieldText(book, ['title']);
    const desc = _readingFieldText(book, ['description']);
    const subjects = _readingFieldText(book, ['subjects']);
    const meta = _readingFieldText(book, ['authors', 'illustrators', 'publisher', 'source', 'sourceId', 'contentType', 'language']);
    const all = title + ' ' + desc + ' ' + subjects + ' ' + meta;
    const allWords = _readingWords(all);
    const allStems = new Set(allWords.map(_readingStem));
    let score = 0, hits = 0;

    if (phrase && title.includes(phrase)) { score += 42; hits++; }
    if (phrase && subjects.includes(phrase)) { score += 34; hits++; }
    if (phrase && desc.includes(phrase)) { score += 24; hits++; }
    if (phrase && meta.includes(phrase)) { score += 8; hits++; }

    stems.forEach((stem, i) => {
      const term = terms[i];
      if (!term) return;
      if (title.includes(term) || allStems.has(stem)) {
        if (title.includes(term)) score += 14;
        if (subjects.includes(term)) score += 12;
        if (desc.includes(term)) score += 7;
        if (meta.includes(term)) score += 3;
        hits++;
      }
    });

    if (req.language) {
      const wanted = String(req.language).toLowerCase();
      const got = String(book.language || book.langCode || '').toLowerCase();
      if (got === wanted || got.includes(wanted) || wanted.includes(got)) score += 22;
      else continue;
    } else if (String(book.langCode || '').toLowerCase() === 'en') score += 1;

    if (req.source) {
      if (String(book.sourceId || '').toLowerCase() === req.source) score += 20;
      else continue;
    }

    const sourceId = String(book.sourceId || '').toLowerCase();
    const contentType = String(book.contentType || '').toLowerCase();
    const isStory = sourceId === 'storyweaver' || contentType === 'story';
    const isScience = ['frontiers', 'nasa', 'noaa', 'usgs', 'openstax'].indexOf(sourceId) >= 0 || /\b(science|scientific|biology|earth|space|climate|weather|ocean|animal|energy|ecosystem)\b/.test(all);
    const isPrimary = ['wikisource', 'loc'].indexOf(sourceId) >= 0 || /primary source|document|speech|letter|archive/.test(all);
    const isNonfiction = !isStory || isScience || isPrimary;

    if (req.format === 'story') score += isStory ? 18 : -12;
    if (req.format === 'article') score += isScience ? 18 : -8;
    if (req.format === 'nonfiction') score += isNonfiction ? 16 : -12;
    if (req.format === 'primary_source') score += isPrimary ? 22 : -10;

    const level = _bookReadingLevel(book);
    if (desiredLevel) score += Math.max(0, 16 - Math.abs(level - desiredLevel) * 5);
    if (req.audience === 'older') score += level >= 5 ? 12 : -8;
    if (req.audience === 'younger') score += level <= 3 ? 12 : -8;
    if (book.file) score += 3;
    if (book.cover) score += 1;
    if (contentType === 'source-card' && req.format !== 'primary_source') score -= 2;

    if (terms.length && hits === 0) continue;
    if (score > 0) {
      const reasons = { hits, level, desiredLevel, request: req, isStory, isScience, isPrimary, isNonfiction };
      out.push({ book, score, reasons, why: readingMatchReasons({ book, score, reasons }, req) });
    }
  }

  out.sort((a, b) => (b.score - a.score) || String(a.book.title || '').localeCompare(String(b.book.title || '')));
  return out.slice(0, limit);
}

function readingRecommendationText(matches, params, t) {
  const req = normalizeReadingRequest(params);
  const topicText = req.topic ? (' about ' + req.topic) : '';
  if (!matches || !matches.length) {
    return t('cmd.find_reading_none', 'I opened the Reading Library, but I could not find a strong match yet') + topicText + '.';
  }
  const top = matches[0].book;
  const bits = [String(top.title || 'this book')];
  if (top.language) bits.push(top.language);
  if (top.source && top.source.name) bits.push(top.source.name);
  else if (top.sourceId) bits.push(top.sourceId);
  if (top.level) bits.push('level ' + top.level);
  let msg = (t('cmd.find_reading_done', 'I found a good match and opened it') + ': "' + bits[0] + '".');
  const detail = bits.slice(1).join(', ');
  if (detail) msg += ' ' + detail + '.';
  const why = readingMatchWhyText(matches[0], req);
  if (why) msg += ' Why this fits: ' + why + '.';
  const alts = matches.slice(1, 4).map((x) => x.book && x.book.title).filter(Boolean);
  if (alts.length) msg += ' Other good fits: ' + alts.join('; ') + '.';
  return msg;
}

function runFindReadingCommand(c, params, t) {
  if (c && typeof c.findReadingBooks === 'function') return c.findReadingBooks(params || {});
  const catalog = (c && (c.readingLibraryIndex || c.readingBooks || c.catalog)) || [];
  const matches = findReadingMatches(catalog, params || {}, { limit: 4 });
  if (matches.length && c && typeof c.openReadingBook === 'function') c.openReadingBook(matches[0].book.slug);
  else if (c && typeof c.openReadingLibrary === 'function') c.openReadingLibrary();
  return readingRecommendationText(matches, params || {}, t);
}

// Command contracts are shared by AlloBot plans and Demo Autopilot. They make
// planning constraints explicit instead of asking the model to infer whether a
// command is automatic, privacy-sensitive, terminal, or dependent on state.
const PLAN_CONTRACTS = Object.freeze({
  create_lesson: {
    demoSafe: false,
    interaction: 'guided',
    terminal: true,
    params: ['topic', 'grade'],
    reason: 'Starts an interactive lesson wizard; it does not finish lesson content automatically.'
  },
  open_video_studio: {
    demoSafe: false,
    reason: 'Opens the recorder/editor itself; compose and run automatic demos from Video Studio instead.'
  },
  generate_quiz: { requires: ['source'], produces: ['quiz'] },
  generate_glossary: { requires: ['source'], produces: ['glossary'] },
  generate_simplified: { requires: ['source'], produces: ['source'], params: ['grade'] },
  generate_sentence_frames: { requires: ['source'], produces: ['sentence-frames'] },
  generate_analysis: { requires: ['source'], produces: ['analysis'] },
  generate_outline: { requires: ['source'], produces: ['outline'] },
  find_reading: { params: ['topic', 'grade', 'language', 'source', 'format', 'raw'] },
  send_teacher_signal: {
    demoSafe: false,
    interaction: 'external',
    params: ['signal'],
    reason: 'Sends one fixed-vocabulary signal to the teacher in an active live session.'
  },
  create_activity_rubric: { demoSafe: false, interaction: 'guided', reason: 'Runs rubric generation for the current activity.' },
  share_assignment: { demoSafe: false, interaction: 'external', reason: 'Creates a student-facing assignment link after confirmation.' },
  preview_assignment_as_student: { demoSafe: false, interaction: 'external', reason: 'Opens an already-shared student assignment in a new tab.' },
  launch_flashcards: { requires: ['glossary'] },
  export_pack: {
    demoSafe: false,
    requires: ['source'],
    interaction: 'external',
    reason: 'Starts a file download outside the recorded workflow.'
  },
  set_grade_level: { params: ['grade'] },
  set_source_tone: { params: ['tone'] },
  set_source_length: { params: ['length'] },
  set_output_language: { params: ['language'] },
  set_font_size: { params: ['size'] },
  translate_document: {
    demoSafe: false,
    requires: ['pipeline'],
    interaction: 'interactive',
    params: ['language'],
    reason: 'Prepares translation controls but still requires a teacher click and AI quota.'
  },
  pipeline_score: { requires: ['pipeline'] },
  pipeline_issues: { requires: ['pipeline'] },
  pipeline_downloads: { requires: ['pipeline'] },
  pipeline_verification: { requires: ['pipeline'] },
  pipeline_tour: { requires: ['pipeline'] },
  pipeline_fix_again: {
    demoSafe: false,
    requires: ['pipeline'],
    reason: 'Starts a real remediation pass.'
  },
  pipeline_stop: {
    demoSafe: false,
    requires: ['pipeline'],
    reason: 'Stops an active remediation pass.'
  }
});

const DEMO_BLOCKED_COMMANDS = new Set([
  'open_notebook',
  'open_history',
  'open_class_session',
  'open_live_session_center',
  'open_live_poll',
  'open_quick_check',
  'open_pictionary_host',
  'open_group_tools',
  'open_student_signal',
  'send_teacher_signal',
  'share_assignment',
  'preview_assignment_as_student',
  'review_teacher_feedback',
  'open_class_analytics',
  'open_ai_settings',
  'open_roster',
  'open_project_settings',
  'open_behavior_lens',
  'open_report_writer',
  'open_dynamic_assessment',
  'open_submission_inbox',
  'submit_work',
  'toggle_dictation',
  'voice_start',
  'voice_stop',
  'toggle_cloud_sync',
  'report_problem',
  'clear_my_answers'
]);

function getCommandContract(commandOrId) {
  const cmd = commandOrId && typeof commandOrId === 'object' ? commandOrId : null;
  const id = String(cmd ? cmd.id : (commandOrId || ''));
  const declared = PLAN_CONTRACTS[id] || {};
  return {
    demoSafe: declared.demoSafe !== false && !DEMO_BLOCKED_COMMANDS.has(id) && !(cmd && cmd.destructive),
    interaction: declared.interaction || 'automatic',
    terminal: !!declared.terminal,
    requires: Array.isArray(declared.requires) ? declared.requires.slice() : [],
    produces: Array.isArray(declared.produces) ? declared.produces.slice() : [],
    params: Array.isArray(declared.params) ? declared.params.slice() : [],
    reason: declared.reason || ''
  };
}

function _planCapabilities(ctx) {
  const out = new Set();
  if (ctx && ctx.hasSourceOrAnalysis) out.add('source');
  if (ctx && ctx.contentIsGlossary) out.add('glossary');
  if (ctx && ctx.contentLoaded) out.add('content');
  if (ctx && ctx.pipelineOpen) out.add('pipeline');
  return out;
}

function _contractPlanParams(p, contract) {
  const clean = _cleanPlanParams(p);
  const allowed = contract && Array.isArray(contract.params) ? contract.params : [];
  if (!allowed.length) return {};
  const out = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(clean, k)) out[k] = clean[k];
  }
  return out;
}

function sanitizeCommandParams(commandOrId, params) {
  return _contractPlanParams(params, getCommandContract(commandOrId));
}

// Resolve the command audience once from the host's role state. `isTeacherMode`
// is the presentation boundary used by the ordinary Teacher/Student view toggle,
// while the explicit link/independent/parent flags identify specialized paths.
// One resolver keeps palette, chat, voice, plans, and direct execution aligned.
function getCommandAudience(ctx) {
  const explicit = ctx && ctx.commandAudience;
  if (['teacher', 'student', 'independent', 'parent'].includes(explicit)) return explicit;
  if (ctx && (ctx.isStudentLinkMode || ctx.isTeacherMode === false)) return 'student';
  if (ctx && ctx.isIndependentMode) return 'independent';
  if (ctx && ctx.isParentMode) return 'parent';
  return 'teacher';
}

function _commandAllowsAudience(command, audience) {
  const roles = command && command.roles;
  if (roles === 'all') return true;
  if (Array.isArray(roles)) return roles.includes(audience) || roles.includes('all');
  return roles === audience;
}

// Pure, non-mutating plan preflight. It simulates declared produces/requires
// contracts while still checking today's live command guards. Both AlloBot and
// Video Studio use the same result, so readiness logic cannot drift.
function validatePlan(ctx, rawSteps, opts = {}) {
  const list = (Array.isArray(rawSteps) ? rawSteps : []).slice(0, 8);
  const all = buildAlloCommands(ctx || {}, { includeGated: true });
  const liveIds = new Set(buildAlloCommands(ctx || {}).map((c) => c.id));
  const initial = _planCapabilities(ctx || {});
  const capabilities = new Set(initial);
  const items = [];
  for (let i = 0; i < list.length; i++) {
    const step = list[i] || {};
    const cmd = all.find((c) => c.id === step.commandId);
    const contract = getCommandContract(cmd || step.commandId);
    let status = 'ready';
    let detail = '';
    if (!cmd) {
      status = 'block';
      detail = 'This command is not available for the current role.';
    } else if (opts.demoSafeOnly && !contract.demoSafe) {
      status = 'block';
      detail = contract.reason || 'This command is not allowed in automatic demo recording.';
    } else {
      const missing = contract.requires.filter((name) => !capabilities.has(name));
      if (missing.length) {
        status = 'block';
        detail = 'Needs ' + missing.join(', ') + ' before this step.';
      } else if (contract.terminal && i < list.length - 1) {
        status = 'block';
        detail = contract.reason || 'This interactive command must be the final step.';
      } else if (contract.interaction !== 'automatic' && !opts.allowInteractive) {
        status = 'block';
        detail = contract.reason || 'This step requires teacher interaction.';
      } else if (!liveIds.has(cmd.id)) {
        const unlockedByPlan = contract.requires.length > 0 &&
          contract.requires.every((name) => capabilities.has(name)) &&
          contract.requires.some((name) => !initial.has(name));
        if (!unlockedByPlan) {
          status = 'block';
          detail = 'This command is not available in the current app state.';
        }
      }
    }
    if (status !== 'block') contract.produces.forEach((name) => capabilities.add(name));
    items.push({
      index: i,
      commandId: step.commandId || '',
      label: (cmd && cmd.label) || step.commandId || 'Unknown command',
      params: _contractPlanParams(step.params, contract),
      why: typeof step.why === 'string' ? step.why.slice(0, 120) : '',
      status,
      detail,
      contract
    });
  }
  const blockingCount = items.filter((item) => item.status === 'block').length;
  return {
    ok: list.length > 0 && blockingCount === 0,
    items,
    blockingCount,
    warningCount: items.filter((item) => item.status === 'warn').length
  };
}

function buildAlloCommands(ctx, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const audience = getCommandAudience(ctx || {});
  const cmds = [
    // ── Navigate ──
    { id: 'open_educator_hub', opensPanel: 'educatorHub', icon: '🏫', roles: 'teacher', label: t('cmd.open_educator_hub', 'Open the Educator Hub'), aliases: ['educator hub', 'teacher hub', 'hub', 'document pipeline', 'remediation pipeline', 'make a document accessible', 'fix a pdf'], hint: t('cmd.open_educator_hub_hint', 'Lesson tools + the Document Pipeline card'), run: (c) => { c.setShowEducatorHub(true); return t('cmd.open_educator_hub_done', 'Educator Hub opened — the Document Pipeline card is near the top.'); } },
    { id: 'open_learning_hub', opensPanel: 'learningHub', icon: '🎓', roles: 'all', label: t('cmd.open_learning_hub', 'Open the Learning Hub'), aliases: ['learning hub', 'student hub', 'games'], hint: t('cmd.open_learning_hub_hint', 'Games, practice, and study tools'), run: (c) => { c.setShowLearningHub(true); return t('cmd.open_learning_hub_done', 'Learning Hub opened.'); } },
    { id: 'open_source_input', icon: '📝', roles: ['teacher', 'independent', 'parent'], label: t('cmd.open_source_input', 'Open source input'), aliases: ['source input', 'source material', 'input panel', 'paste text', 'write text', 'add source', 'new source'], hint: t('cmd.open_source_input_hint', 'Paste, write, search, or generate source material'), run: (c) => { c.openSourceInput(); return t('cmd.open_source_input_done', 'Source input opened.'); } },
    { id: 'open_source_url', icon: '🔎', roles: ['teacher', 'independent', 'parent'], label: t('cmd.open_source_url', 'Find a resource online'), aliases: ['find a resource online', 'resource online', 'paste a link', 'add a link', 'url input', 'import from url', 'web source', 'source link'], hint: t('cmd.open_source_url_hint', 'Paste a URL or search for a source'), run: (c) => { c.openSourceUrl(); return t('cmd.open_source_url_done', 'Resource finder opened.'); } },
    { id: 'open_source_generator', icon: '✨', roles: ['teacher', 'independent', 'parent'], label: t('cmd.open_source_generator', 'Generate source from a topic'), aliases: ['generate source', 'generate from a topic', 'source generator', 'write source text', 'make source text', 'generate reading passage', 'ai writes it'], hint: t('cmd.open_source_generator_hint', 'Open the topic-to-source generator'), run: (c) => { c.openSourceGenerator(); return t('cmd.open_source_generator_done', 'Source generator opened.'); } },
    { id: 'open_history', icon: '🕘', roles: 'all', label: t('cmd.open_history', 'Open history'), aliases: ['history', 'my history', 'saved work', 'previous work', 'recent lessons', 'projects'], hint: t('cmd.open_history_hint', 'Browse saved lessons and projects'), run: (c) => { c.openHistory(); return t('cmd.open_history_done', 'History opened.'); } },
    { id: 'open_document_builder', opensPanel: 'exportPreview', icon: '📝', roles: 'teacher', label: t('cmd.open_document_builder', 'Open the Document Builder'), aliases: ['document builder', 'builder', 'export preview', 'differentiate'], hint: t('cmd.open_document_builder_hint', 'Build and export differentiated documents'), run: (c) => { c.openExportPreview(); return t('cmd.open_document_builder_done', 'Document Builder opened.'); } },
    { id: 'open_wizard', icon: '🪄', roles: 'teacher', label: t('cmd.open_wizard', 'Start the lesson wizard'), aliases: ['wizard', 'new lesson', 'create lesson', 'guided setup'], hint: t('cmd.open_wizard_hint', 'Step-by-step lesson creation'), run: (c) => { c.setShowWizard(true); return t('cmd.open_wizard_done', 'Lesson wizard started.'); } },
    { id: 'open_notebook', opensPanel: 'notebook', icon: '📓', roles: 'all', label: t('cmd.open_notebook', 'Open my notebook'), aliases: ['notebook', 'notes'], hint: t('cmd.open_notebook_hint', 'Saved notes and entries'), run: (c) => { c.setShowNotebook(true); return t('cmd.open_notebook_done', 'Notebook opened.'); } },
    { id: 'open_translate', icon: '🌐', roles: 'teacher', label: t('cmd.open_translate', 'Open translation'), aliases: ['translate', 'translation', 'language', 'translate to', 'translate into'], hint: t('cmd.open_translate_hint', 'Translate the current content'), run: (c) => { c.openTranslateModal(); return t('cmd.open_translate_done', 'Translation dialog opened.'); } },
    { id: 'open_class_session', opensPanel: 'sessionModal', icon: '👥', roles: 'teacher', label: t('cmd.open_class_session', 'Open class session'), aliases: ['class session', 'session', 'live class', 'class code'], hint: t('cmd.open_class_session_hint', 'Start or join a live class session'), run: (c) => { c.setShowSessionModal(true); return t('cmd.open_class_session_done', 'Class session dialog opened.'); } },
    { id: 'open_live_session_center', icon: '🎛️', roles: 'teacher', when: (c) => !!c.activeSessionCode && !!c.openLiveSessionCenter, label: t('cmd.open_live_session_center', 'Open Live Session Center'), aliases: ['live session center', 'live session', 'session center', 'classroom controls', 'live dock'], hint: t('cmd.open_live_session_center_hint', 'Polls, groups, Pictionary, and session controls'), run: (c) => { c.openLiveSessionCenter(); return t('cmd.open_live_session_center_done', 'Live Session Center opened.'); } },
    { id: 'open_live_poll', icon: '📊', roles: 'teacher', when: (c) => !!c.activeSessionCode && !!c.openLivePoll, label: t('cmd.open_live_poll', 'Start a live poll'), aliases: ['live poll', 'poll the class', 'class poll', 'ask a poll', 'student poll'], hint: t('cmd.open_live_poll_hint', 'Compose a live poll for the active session'), run: (c) => { c.openLivePoll(); return t('cmd.open_live_poll_done', 'Live poll composer opened. Review it, then broadcast from there.'); } },
    { id: 'open_quick_check', icon: '⚡', roles: 'teacher', when: (c) => !!c.activeSessionCode && !!c.openQuickCheck, label: t('cmd.open_quick_check', 'Run a quick check'), aliases: ['quick check', 'check understanding', 'confused ready', 'how is this landing', 'ready check'], hint: t('cmd.open_quick_check_hint', 'Prepare a 1-3 confused-to-ready check-in'), run: (c) => { c.openQuickCheck(); return t('cmd.open_quick_check_done', 'Quick Check opened. Review it, then broadcast from there.'); } },
    { id: 'open_pictionary_host', icon: '🎨', roles: 'teacher', when: (c) => !!c.activeSessionCode && !!c.openPictionaryHost, label: t('cmd.open_pictionary_host', 'Start Concept Pictionary'), aliases: ['concept pictionary', 'pictionary', 'drawing game', 'draw a concept', 'class drawing game'], hint: t('cmd.open_pictionary_host_hint', 'Open the teacher host for Concept Pictionary'), run: (c) => { c.openPictionaryHost(); return t('cmd.open_pictionary_host_done', 'Concept Pictionary opened. Choose a concept and start the round from there.'); } },
    { id: 'open_group_tools', icon: '👥', roles: 'teacher', when: (c) => !!c.activeSessionCode && !!c.openGroupTools, label: t('cmd.open_group_tools', 'Open group tools'), aliases: ['group tools', 'groups', 'manage groups', 'student groups', 'make groups'], hint: t('cmd.open_group_tools_hint', 'Manage live-session groups'), run: (c) => { c.openGroupTools(); return t('cmd.open_group_tools_done', 'Group tools opened.'); } },
    { id: 'open_student_signal', icon: '✋', roles: 'student', when: (c) => !!c.activeSessionCode && !c.isTeacherMode && !!c.openStudentSignals, label: t('cmd.open_student_signal', 'Send a teacher signal'), aliases: ['signal teacher', 'help signal', 'quick signal', 'i need help', 'i am confused', 'send signal'], hint: t('cmd.open_student_signal_hint', 'Tell the teacher you need help, more time, or are ready'), run: (c) => { c.openStudentSignals(); return t('cmd.open_student_signal_done', 'Teacher signal panel opened. Pick one option to send.'); } },
    { id: 'open_class_analytics', opensPanel: 'classAnalytics', icon: '📈', roles: 'teacher', label: t('cmd.open_class_analytics', 'Open class analytics'), aliases: ['analytics', 'class data', 'progress data'], hint: t('cmd.open_class_analytics_hint', 'Whole-class progress'), run: (c) => { c.setShowClassAnalytics(true); return t('cmd.open_class_analytics_done', 'Class analytics opened.'); } },
    { id: 'open_export_menu', opensPanel: 'exportMenu', icon: '📤', roles: 'teacher', label: t('cmd.open_export_menu', 'Open the export menu'), aliases: ['export', 'download menu', 'share'], hint: t('cmd.open_export_menu_hint', 'Export the current content'), run: (c) => { c.setShowExportMenu(true); return t('cmd.open_export_menu_done', 'Export menu opened.'); } },
    { id: 'open_ai_settings', icon: '🤖', roles: 'teacher', label: t('cmd.open_ai_settings', 'Open AI settings'), aliases: ['ai settings', 'ai backend', 'api key', 'model settings'], hint: t('cmd.open_ai_settings_hint', 'Configure the AI backend'), run: (c) => { c.setShowAIBackendModal(true); return t('cmd.open_ai_settings_done', 'AI settings opened.'); } },

    // ── Navigate (added 2026-06-13: dashboard + roster + project-settings parity) ──
    { id: 'go_dashboard', opensPanel: 'dashboard', icon: '🏠', roles: 'all', label: t('cmd.go_dashboard', 'Go to the dashboard'), aliases: ['dashboard', 'home', 'go home', 'main view', 'overview'], hint: t('cmd.go_dashboard_hint', 'Back to the main lesson view'), run: (c) => { c.goToDashboard(); return t('cmd.go_dashboard_done', 'Dashboard.'); } },
    { id: 'open_roster', icon: '🧑‍🤝‍🧑', roles: 'teacher', label: t('cmd.open_roster', 'Open the class roster'), aliases: ['roster', 'manage roster', 'class roster', 'roster key'], hint: t('cmd.open_roster_hint', 'Manage your class groups'), run: (c) => { c.openRoster(); return t('cmd.open_roster_done', 'Class roster opened.'); } },
    { id: 'open_project_settings', icon: '⚙️', roles: 'teacher', label: t('cmd.open_project_settings', 'Open project settings'), aliases: ['project settings', 'student settings', 'lesson settings', 'permissions', 'allow ai'], hint: t('cmd.open_project_settings_hint', 'Per-project AI, dictation, and Socratic gating'), run: (c) => { c.openProjectSettings(); return t('cmd.open_project_settings_done', 'Project settings opened.'); } },
    { id: 'edit_assignment_directions', icon: '\u{1F4CB}', roles: 'teacher', when: (c) => !!c.canEditAssignmentDirections && !!c.editAssignmentDirections, label: t('cmd.edit_assignment_directions', 'Edit assignment directions'), aliases: ['edit directions', 'assignment directions editor', 'write directions', 'change assignment directions'], hint: t('cmd.edit_assignment_directions_hint', 'Open the directions and goals composer'), run: (c) => { c.editAssignmentDirections(); return t('cmd.edit_assignment_directions_done', 'Assignment directions editor opened.'); } },
    { id: 'open_assessment_builder', icon: '\u{1F9ED}', roles: 'teacher', when: (c) => !!c.openAssessmentBuilder, label: t('cmd.open_assessment_builder', 'Open Assessment Builder'), aliases: ['assessment builder', 'build assessment', 'make an assessment', 'assessment tools'], hint: t('cmd.open_assessment_builder_hint', 'Design an assessment and supporting activities'), run: (c) => { c.openAssessmentBuilder(); return t('cmd.open_assessment_builder_done', 'Assessment Builder opened.'); } },
    { id: 'open_udl_guide', icon: '\u267F', roles: 'teacher', when: (c) => !!c.openUdlGuide, label: t('cmd.open_udl_guide', 'Open the UDL Guide'), aliases: ['udl guide', 'universal design guide', 'udl help', 'accessibility guide'], hint: t('cmd.open_udl_guide_hint', 'Review UDL supports for the current lesson'), run: (c) => { c.openUdlGuide(); return t('cmd.open_udl_guide_done', 'UDL Guide opened.'); } },
    { id: 'create_activity_rubric', icon: '\u{1F4D0}', roles: 'teacher', when: (c) => !!c.canGenerateCurrentRubric && !!c.generateCurrentRubric, label: t('cmd.create_activity_rubric', 'Create a rubric for this activity'), aliases: ['create rubric', 'make a rubric', 'generate rubric', 'rubric for this activity'], hint: t('cmd.create_activity_rubric_hint', 'Generate observable, student-friendly success criteria'), run: (c) => { c.generateCurrentRubric(); return t('cmd.create_activity_rubric_working', 'Generating an activity rubric...'); }, pendingNarration: t('cmd.create_activity_rubric_working', 'Generating an activity rubric...'), runAsync: async (c) => { const ok = await c.generateCurrentRubric(); if (ok === false) throw new Error(t('cmd.create_activity_rubric_failed', 'The activity rubric could not be created.')); return t('cmd.create_activity_rubric_done', 'Activity rubric created.'); } },
    { id: 'share_assignment', icon: '\u{1F517}', roles: 'teacher', destructive: true, when: (c) => !!c.canShareAssignment && !!c.shareAssignment, label: t('cmd.share_assignment', 'Share this assignment'), aliases: ['share assignment', 'publish assignment', 'make homework link', 'create student link', 'assign this'], hint: t('cmd.share_assignment_hint', 'Create a student-facing homework link after confirmation'), confirmMessage: (c) => { const count = Math.max(1, Number(c.shareResourceCount) || 1); const days = Math.max(1, Number(c.shareExpiryDays) || 1); const ai = c.shareStudentAiPolicy === 'student-byok' ? t('cmd.share_assignment_confirm_ai_byok', 'Students may connect their own AI provider.') : t('cmd.share_assignment_confirm_ai_off', 'Student AI will stay off.'); return t('cmd.share_assignment_confirm', 'Create a student link containing {count} resource(s), expiring in {days} day(s). {ai} Press Enter again to confirm.').replace('{count}', count).replace('{days}', days).replace('{ai}', ai); }, run: (c) => { c.shareAssignment(); return t('cmd.share_assignment_working', 'Creating the student assignment link...'); }, pendingNarration: t('cmd.share_assignment_working', 'Creating the student assignment link...'), runAsync: async (c) => { const url = await c.shareAssignment(); if (!url) throw new Error(t('cmd.share_assignment_failed', 'The student assignment link was not created.')); return t('cmd.share_assignment_done', 'Student assignment link created.'); } },
    { id: 'preview_assignment_as_student', icon: '\u{1F440}', roles: 'teacher', when: (c) => !!c.canPreviewStudentAssignment && !!c.previewStudentAssignment, label: t('cmd.preview_assignment_as_student', 'Preview the shared assignment as a student'), aliases: ['preview as student', 'student preview', 'test student link', 'view assignment as student'], hint: t('cmd.preview_assignment_as_student_hint', 'Open the latest shared link in a separate student tab'), run: (c) => { c.previewStudentAssignment(); return t('cmd.preview_assignment_as_student_done', 'Student preview opened in a new tab.'); } },
    { id: 'resume_latest_work', icon: '\u21A9\uFE0F', roles: 'all', when: (c) => !!c.hasResumableWork && !!c.resumeLatestWork, label: t('cmd.resume_latest_work', 'Resume my latest work'), aliases: ['resume my work', 'continue my work', 'open latest work', 'pick up where i left off'], hint: t('cmd.resume_latest_work_hint', 'Open the most recent saved item directly'), run: (c) => { const item = c.resumeLatestWork(); return item ? (t('cmd.resume_latest_work_done', 'Resumed ') + (item.title || item.type || 'your latest work') + '.') : t('cmd.resume_latest_work_none', 'No saved work is available yet.'); } },

    // ── Open a tool (added 2026-06-13) — quick-launch the workspaces that normally live behind a
    //    hub card. Each is opensPanel-tagged so launching it CLOSES any open hub / other tool (the
    //    panel-stacking fix) instead of stacking. The ctx open-closures mirror the hub cards. ──
    { id: 'open_stem_lab', opensPanel: 'stemLab', icon: '🔬', roles: 'all', label: t('cmd.open_stem_lab', 'Open the STEM Lab'), aliases: ['stem lab', 'stem', 'science lab', 'math lab', 'simulations', 'labs'], hint: t('cmd.open_stem_lab_hint', 'Interactive science & math tools'), run: (c) => { c.openStemLab(); return t('cmd.open_stem_lab_done', 'STEM Lab opened.'); } },
    { id: 'open_storyforge', opensPanel: 'storyForge', icon: '✍️', roles: 'all', label: t('cmd.open_storyforge', 'Open StoryForge'), aliases: ['storyforge', 'story forge', 'creative writing', 'write a story'], hint: t('cmd.open_storyforge_hint', 'Guided creative writing'), run: (c) => { c.openStoryForge(); return t('cmd.open_storyforge_done', 'StoryForge opened.'); } },
    { id: 'open_allohaven', opensPanel: 'alloHaven', icon: '🏝️', roles: 'all', label: t('cmd.open_allohaven', 'Open AlloHaven'), aliases: ['allohaven', 'allo haven', 'haven', 'calm space', 'regulation space', 'break space'], hint: t('cmd.open_allohaven_hint', 'A calm, regulating space'), run: (c) => { c.openAlloHaven(); return t('cmd.open_allohaven_done', 'AlloHaven opened.'); } },
    { id: 'open_behavior_lens', opensPanel: 'behaviorLens', icon: '🔎', roles: 'teacher', label: t('cmd.open_behavior_lens', 'Open the Behavior Lens'), aliases: ['behavior lens', 'behaviour lens', 'abc data', 'behavior data', 'fba', 'observation'], hint: t('cmd.open_behavior_lens_hint', 'Behavior observation & analysis'), run: (c) => { c.openBehaviorLens(); return t('cmd.open_behavior_lens_done', 'Behavior Lens opened.'); } },
    { id: 'open_report_writer', opensPanel: 'reportWriter', icon: '📄', roles: 'teacher', label: t('cmd.open_report_writer', 'Open the Report Writer'), aliases: ['report writer', 'write a report', 'evaluation report', 'psych report', 'reports'], hint: t('cmd.open_report_writer_hint', 'Draft evaluation reports'), run: (c) => { c.openReportWriter(); return t('cmd.open_report_writer_done', 'Report Writer opened.'); } },
    { id: 'open_symbol_studio', opensPanel: 'symbolStudio', icon: '🔣', roles: 'teacher', label: t('cmd.open_symbol_studio', 'Open Symbol Studio'), aliases: ['symbol studio', 'aac', 'communication board', 'picture symbols', 'symbols', 'visual schedule'], hint: t('cmd.open_symbol_studio_hint', 'AAC boards & visual supports'), run: (c) => { c.openSymbolStudio(); return t('cmd.open_symbol_studio_done', 'Symbol Studio opened.'); } },
    { id: 'open_video_studio', opensPanel: 'videoStudio', icon: '🎥', roles: 'teacher', label: t('cmd.open_video_studio', 'Open Video Studio'), aliases: ['video studio', 'screen recorder', 'record a demo', 'demo recorder', 'tutorial recorder'], hint: t('cmd.open_video_studio_hint', 'Record, caption, and edit walkthroughs'), run: (c) => { c.openVideoStudio(); return t('cmd.open_video_studio_done', 'Video Studio opened.'); } },
    { id: 'open_cinematic_studio', opensPanel: 'cinematicStudio', icon: '🎬', roles: 'teacher', label: t('cmd.open_cinematic_studio', 'Open Cinematic Studio'), aliases: ['cinematic studio', 'cinematic crawl', 'title crawl', 'intro video', 'video opener'], hint: t('cmd.open_cinematic_studio_hint', 'Create cinematic intros and explainers'), run: (c) => { c.openCinematicStudio(); return t('cmd.open_cinematic_studio_done', 'Cinematic Studio opened.'); } },
    { id: 'open_allo_studio', opensPanel: 'alloStudio', icon: '🖼️', roles: 'teacher', label: t('cmd.open_allo_studio', 'Open AlloStudio'), aliases: ['allostudio', 'allo studio', 'design studio', 'poster editor', 'worksheet editor', 'flyer studio'], hint: t('cmd.open_allo_studio_hint', 'Design accessible posters, flyers, and worksheets'), run: (c) => { c.openAlloStudio(); return t('cmd.open_allo_studio_done', 'AlloStudio opened.'); } },
    { id: 'open_accessibility_lab', opensPanel: 'accessibilityLab', icon: '♿', roles: 'teacher', label: t('cmd.open_accessibility_lab', 'Open the Accessibility Lab'), aliases: ['accessibility lab', 'a11y lab', 'accessibility checker', 'wcag', 'contrast checker'], hint: t('cmd.open_accessibility_lab_hint', 'Check & improve accessibility'), run: (c) => { c.openAccessibilityLab(); return t('cmd.open_accessibility_lab_done', 'Accessibility Lab opened.'); } },
    { id: 'open_lumen', opensPanel: 'stemLab', icon: '💡', roles: 'teacher', label: t('cmd.open_lumen', 'Open Lumen (data canvas)'), aliases: ['lumen', 'data canvas', 'chart data', 'graph data', 'progress charts', 'visualize data'], hint: t('cmd.open_lumen_hint', 'Turn assessment data into charts'), run: (c) => { c.openLumen(); return t('cmd.open_lumen_done', 'Lumen opened in the STEM Lab.'); } },
    { id: 'open_free_forms', opensPanel: 'stemLab', icon: '🏛️', roles: 'all', label: t('cmd.open_free_forms', 'Open Free Forms'), aliases: ['free forms', 'world of forms', 'forms', 'build a venn', 'story mountain', '3d organizer', 'build my own organizer'], hint: t('cmd.open_free_forms_hint', 'Build your own 3D World of Forms'), run: (c) => { c.openFreeForms(); return t('cmd.open_free_forms_done', 'Free Forms opened.'); } },
    { id: 'open_community_catalog', opensPanel: 'communityCatalog', icon: '🗂️', roles: 'teacher', label: t('cmd.open_community_catalog', 'Open the Community Catalog'), aliases: ['community catalog', 'catalog', 'shared lessons', 'browse lessons', 'community'], hint: t('cmd.open_community_catalog_hint', 'Browse shared community lessons'), run: (c) => { c.openCommunityCatalog(); return t('cmd.open_community_catalog_done', 'Community Catalog opened.'); } },
    { id: 'open_dynamic_assessment', opensPanel: 'dynamicAssessment', icon: '📊', roles: 'teacher', label: t('cmd.open_dynamic_assessment', 'Open Dynamic Assessment'), aliases: ['dynamic assessment', 'progress monitoring', 'probe', 'cbm', 'assessment'], hint: t('cmd.open_dynamic_assessment_hint', 'Run a dynamic assessment'), run: (c) => { c.openDynamicAssessment(); return t('cmd.open_dynamic_assessment_done', 'Dynamic Assessment opened.'); } },
    { id: 'open_reading_library', opensPanel: 'readingLibrary', icon: '📚', roles: 'all', label: t('cmd.open_reading_library', 'Open the Reading Library'), aliases: ['reading library', 'library', 'books', 'picture books', 'storyweaver', 'read a book'], hint: t('cmd.open_reading_library_hint', 'Browse open picture books in 10 languages'), run: (c) => { c.openReadingLibrary(); return t('cmd.open_reading_library_done', 'Reading Library opened.'); } },
    { id: 'open_open_groove', opensPanel: 'openGroove', icon: '🎛️', roles: 'all', label: t('cmd.open_open_groove', 'Open Open Groove Studio'), aliases: ['open groove', 'groove studio', 'music studio', 'beat maker', 'beats', 'synth', 'composer'], hint: t('cmd.open_open_groove_hint', 'Make beats, synth patterns, and notation-aware music'), run: (c) => { c.openOpenGroove(); return t('cmd.open_open_groove_done', 'Open Groove Studio opened.'); } },
    { id: 'open_timeline_studio', opensPanel: 'timelineStudio', icon: '🕰️', roles: 'all', label: t('cmd.open_timeline_studio', 'Open Timeline Studio'), aliases: ['timeline studio', 'timeline maker', 'sequence builder', 'chronology', 'history timeline'], hint: t('cmd.open_timeline_studio_hint', 'Build and verify accessible timelines'), run: (c) => { c.openTimelineStudio(); return t('cmd.open_timeline_studio_done', 'Timeline Studio opened.'); } },
    { id: 'open_lingua_practice', opensPanel: 'linguaPractice', icon: 'A/文', roles: 'all', label: t('cmd.open_lingua_practice', 'Open Lingua Practice'), aliases: ['lingua practice', 'language practice', 'practice language', 'vocabulary practice', 'multilingual practice'], hint: t('cmd.open_lingua_practice_hint', 'Practice vocabulary and language from the current source'), run: (c) => { c.openLinguaPractice(); return t('cmd.open_lingua_practice_done', 'Lingua Practice opened.'); } },
    { id: 'open_test_prep_hub', opensPanel: 'testPrepHub', icon: '🧭', roles: 'all', label: t('cmd.open_test_prep_hub', 'Open Test Prep Hub'), aliases: ['test prep', 'test prep hub', 'exam prep', 'practice questions', 'study exams'], hint: t('cmd.open_test_prep_hub_hint', 'Open free practice sets and study tools'), run: (c) => { c.openTestPrepHub(); return t('cmd.open_test_prep_hub_done', 'Test Prep Hub opened.'); } },
    { id: 'open_research_hub', opensPanel: 'researchHub', icon: '🔍', roles: 'all', label: t('cmd.open_research_hub', 'Open Research Hub'), aliases: ['research hub', 'research', 'credible sources', 'source finder', 'find sources', 'research tool'], hint: t('cmd.open_research_hub_hint', 'Find and organize credible research sources'), run: (c) => { c.openResearchHub(); return t('cmd.open_research_hub_done', 'Research Hub opened.'); } },
    { id: 'open_lit_lab', opensPanel: 'litLab', icon: '📚', roles: 'all', label: t('cmd.open_lit_lab', 'Open Lit Lab'), aliases: ['lit lab', 'literature lab', 'reading lab', 'story lab', 'literature tools'], hint: t('cmd.open_lit_lab_hint', 'Explore literature and reading activities'), run: (c) => { c.openLitLab(); return t('cmd.open_lit_lab_done', 'Lit Lab opened.'); } },
    { id: 'open_mind_map', opensPanel: 'mindMap', icon: '🧭', roles: 'all', label: t('cmd.open_mind_map', 'Open Throughline'), aliases: ['throughline', 'mind map', 'unit map', 'lesson map', 'concept map', 'visual map'], hint: t('cmd.open_mind_map_hint', 'Map concepts, lessons, and unit connections'), run: (c) => { c.openMindMap(); return t('cmd.open_mind_map_done', 'Throughline opened.'); } },
    { id: 'open_poet_tree', opensPanel: 'poetTree', icon: '🌳', roles: 'all', label: t('cmd.open_poet_tree', 'Open Poet Tree'), aliases: ['poet tree', 'poetry tree', 'poem builder', 'poetry lab', 'write poetry'], hint: t('cmd.open_poet_tree_hint', 'Build poems with guided branches'), run: (c) => { c.openPoetTree(); return t('cmd.open_poet_tree_done', 'Poet Tree opened.'); } },
    { id: 'find_reading', opensPanel: 'readingLibrary', icon: '📚', roles: 'all', label: t('cmd.find_reading', 'Find the right book'), aliases: ['find a book', 'find books about', 'recommend a book', 'suggest a book', 'book about', 'books about', 'reading about', 'learn about', 'science article about', 'primary source about'], hint: t('cmd.find_reading_hint', 'Ask by topic, grade, language, source, or type'), run: (c, params) => runFindReadingCommand(c, params || {}, t) },

    // ── Create from this content (teacher) + submit (student) — added 2026-06-13 (Slice 2) ──
    { id: 'generate_quiz', icon: '📝', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.generate_quiz', 'Make a quiz from this'), aliases: ['make a quiz', 'quiz me on this', 'create a quiz', 'comprehension questions', 'generate quiz'], hint: t('cmd.generate_quiz_hint', 'Generate a quiz from the current content'), run: (c) => { c.generateQuiz(); return t('cmd.generate_quiz_done', 'Generating a quiz from this content…'); }, runAsync: (c) => Promise.resolve(c.generateQuiz()).then(() => t('cmd.generate_quiz_ready', 'Quiz ready — it’s in the output panel.')) },
    { id: 'generate_glossary', icon: '📖', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.generate_glossary', 'Make a vocabulary glossary'), aliases: ['glossary', 'vocabulary', 'vocab', 'key terms', 'word list'], hint: t('cmd.generate_glossary_hint', 'Generate a glossary from the current content'), run: (c) => { c.generateGlossary(); return t('cmd.generate_glossary_done', 'Generating a glossary…'); }, runAsync: (c) => Promise.resolve(c.generateGlossary()).then(() => t('cmd.generate_glossary_ready', 'Glossary ready.')) },
    { id: 'generate_simplified', icon: '📉', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.generate_simplified', 'Simplify this text'), aliases: ['simplify', 'simplify this', 'make it easier', 'lower the reading level', 'leveled text', 'easier version'], hint: t('cmd.generate_simplified_hint', 'Generate a simpler reading level — say “to grade N” for a target'), run: (c, params) => { c.generateSimplified(params && params.grade ? { grade: params.grade } : {}); return t('cmd.generate_simplified_done', 'Generating a simpler version…'); }, runAsync: (c, params) => Promise.resolve(c.generateSimplified(params && params.grade ? { grade: params.grade } : {})).then(() => t('cmd.generate_simplified_ready', 'Simpler version ready.')) },
    { id: 'generate_sentence_frames', icon: '🧩', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.generate_sentence_frames', 'Make sentence frames'), aliases: ['sentence frames', 'sentence starters', 'scaffolds', 'language support'], hint: t('cmd.generate_sentence_frames_hint', 'Generate sentence frames from the current content'), run: (c) => { c.generateSentenceFrames(); return t('cmd.generate_sentence_frames_done', 'Generating sentence frames…'); }, runAsync: (c) => Promise.resolve(c.generateSentenceFrames()).then(() => t('cmd.generate_sentence_frames_ready', 'Sentence frames ready.')) },
    { id: 'generate_analysis', icon: '🔬', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.generate_analysis', 'Analyze this source'), aliases: ['analyze', 'analysis', 'source analysis', 'analyze this'], hint: t('cmd.generate_analysis_hint', 'Run a source analysis on the current content'), run: (c) => { c.generateAnalysis(); return t('cmd.generate_analysis_done', 'Analyzing this source…'); }, runAsync: (c) => Promise.resolve(c.generateAnalysis()).then(() => t('cmd.generate_analysis_ready', 'Source analysis ready.')) },
    { id: 'submit_work', icon: '📨', roles: 'student', when: (c) => !c.isTeacherMode, label: t('cmd.submit_work', 'Submit my work'), aliases: ['submit', 'submit my work', 'hand it in', 'turn in'], hint: t('cmd.submit_work_hint', 'Send your work to your teacher'), run: (c) => { c.submitWork(); return t('cmd.submit_work_done', 'Opening the submit dialog…'); } },
    { id: 'open_assignment_directions', icon: '📋', roles: 'student', when: (c) => !!c.hasAssignmentDirections && !!c.openAssignmentDirections, label: t('directions.title', 'Open assignment directions'), aliases: ['assignment directions', 'read directions', 'show directions', 'what do i do', 'what am i supposed to do'], hint: t('directions.subtitle', 'Open the directions and goals for this assignment'), run: (c) => { c.openAssignmentDirections(); return 'Assignment directions opened.'; } },
    { id: 'check_assignment_progress', icon: '🎯', roles: 'student', when: (c) => !!c.getAssignmentProgress && !!c.getAssignmentProgress(), label: t('directions.your_goals', 'Check assignment progress'), aliases: ['check my progress', 'my progress', 'how am i doing', 'what is left', 'goals left'], hint: t('directions.signals_note', 'Hear how many assignment goals are complete'), run: (c) => { const p = c.getAssignmentProgress(); return p ? ((p.title ? p.title + ': ' : '') + p.done + ' of ' + p.total + ' goals complete.') : 'No assignment progress is available yet.'; } },
    { id: 'save_my_work', icon: '💾', roles: 'student', when: (c) => !!c.canSaveStudentWork && !!c.saveStudentWork, label: t('modals.save_project.title', 'Save my work'), aliases: ['save my work', 'download my work', 'save project', 'keep my work'], hint: t('modals.save_project.filename_label', 'Save a student work file on this device'), run: (c) => { c.saveStudentWork(); return 'Save my work dialog opened.'; } },
    { id: 'next_assignment_step', icon: '\u27A1\uFE0F', roles: 'student', when: (c) => !!c.getNextAssignmentStep && !!c.getNextAssignmentStep() && !!c.openNextAssignmentStep, label: t('cmd.next_assignment_step', 'What should I do next?'), aliases: ['what should i do next', 'next step', 'where do i go next', 'next activity', 'continue assignment'], hint: t('cmd.next_assignment_step_hint', 'Open the recommended next activity or goal'), run: (c) => { const step = c.openNextAssignmentStep(); return step ? ((step.goalLabel ? step.goalLabel + ': ' : '') + 'Opening ' + (step.title || 'your next activity') + '.') : t('directions.all_done', 'Every assignment goal is complete.'); } },
    { id: 'read_assignment_directions', icon: '\u{1F50A}', roles: 'student', when: (c) => !!c.hasAssignmentDirections && !!c.readAssignmentDirections, label: t('cmd.read_assignment_directions', 'Read my directions aloud'), aliases: ['read directions aloud', 'read my directions', 'say the directions', 'listen to directions'], hint: t('cmd.read_assignment_directions_hint', 'Open the directions and start read-aloud'), run: (c) => { c.readAssignmentDirections(); return t('cmd.read_assignment_directions_done', 'Assignment directions opened for read-aloud.'); } },
    { id: 'show_success_criteria', icon: '\u{1F3C1}', roles: 'student', when: (c) => !!c.getSuccessCriteria && !!c.getSuccessCriteria(), label: t('cmd.show_success_criteria', 'Show the success criteria'), aliases: ['show rubric', 'what does success look like', 'success criteria', 'grading rubric', 'how will this be graded'], hint: t('cmd.show_success_criteria_hint', 'Hear the assignment goals or current rubric criteria'), run: (c) => { const r = c.getSuccessCriteria(); return r && r.criteria && r.criteria.length ? ((r.title ? r.title + ': ' : '') + r.criteria.slice(0, 6).join('; ') + '.') : t('cmd.show_success_criteria_none', 'No success criteria are available yet.'); } },
    { id: 'send_teacher_signal', icon: '\u270B', roles: 'student', when: (c) => !!c.activeSessionCode && !c.isTeacherMode && !!c.sendTeacherSignal, label: t('cmd.send_teacher_signal', 'Ask my teacher for help'), aliases: ['tell teacher i am stuck', 'ask teacher to slow down', 'ask teacher to repeat', 'tell teacher i am ready'], hint: t('cmd.send_teacher_signal_hint', 'Send one private, fixed-choice signal in the live session'), run: (c, p) => { const raw = String((p && p.signal) || '').toLowerCase(); const signal = /slow/.test(raw) ? 'slow' : /repeat|again/.test(raw) ? 'repeat' : /ready|done/.test(raw) ? 'ready' : /stuck|help|confus/.test(raw) ? 'stuck' : ''; if (!signal) { if (c.openStudentSignals) c.openStudentSignals(); return t('cmd.open_student_signal_done', 'Teacher signal panel opened. Pick one option to send.'); } const sent = c.sendTeacherSignal(signal); return sent === false ? t('cmd.send_teacher_signal_failed', 'The signal could not be sent. Check the live session and try again.') : t('live_signals.sent', 'Signal sent to your teacher.'); } },
    { id: 'review_teacher_feedback', icon: '\u{1F4AC}', roles: 'student', when: (c) => !!c.getTeacherFeedback && !!c.getTeacherFeedback(), label: t('cmd.review_teacher_feedback', 'Review teacher feedback'), aliases: ['teacher feedback', 'review feedback', 'what did my teacher say', 'returned feedback', 'comments from teacher'], hint: t('cmd.review_teacher_feedback_hint', 'Hear returned feedback when it is available'), run: (c) => { const f = c.getTeacherFeedback(); return f ? ((f.title ? f.title + ': ' : '') + f.text) : t('cmd.review_teacher_feedback_none', 'No returned teacher feedback is available yet.'); } },

    // ── Accessibility self-service (available in every mode) ──
    { id: 'font_bigger', icon: '🔍', roles: 'all', label: t('cmd.font_bigger', 'Make the text bigger'), aliases: ['bigger text', 'larger text', 'increase font', 'increase text size', 'make text bigger', 'zoom in text'], hint: t('cmd.font_bigger_hint', '+2 to the reading font size'), run: (c) => { const v = c.fontBigger(); return t('cmd.font_bigger_done', 'Text size increased to ') + v + '.'; } },
    { id: 'font_smaller', icon: '🔎', roles: 'all', label: t('cmd.font_smaller', 'Make the text smaller'), aliases: ['smaller text', 'decrease font', 'reduce text', 'make text smaller'], hint: t('cmd.font_smaller_hint', '−2 to the reading font size'), run: (c) => { const v = c.fontSmaller(); return t('cmd.font_smaller_done', 'Text size decreased to ') + v + '.'; } },
    { id: 'font_reset', icon: '↩️', roles: 'all', label: t('cmd.font_reset', 'Reset the text size'), aliases: ['reset font', 'normal text size', 'default font'], hint: t('cmd.font_reset_hint', 'Back to the default size'), run: (c) => { c.resetFontSize(); return t('cmd.font_reset_done', 'Text size reset to default.'); } },
    { id: 'open_text_settings', icon: '🔤', roles: 'all', label: t('cmd.open_text_settings', 'Open text settings'), aliases: ['text settings', 'font settings', 'dyslexia font', 'spacing'], hint: t('cmd.open_text_settings_hint', 'Font, spacing, and color options'), run: (c) => { c.setShowTextSettings(true); return t('cmd.open_text_settings_done', 'Text settings opened.'); } },
    { id: 'open_voice_settings', icon: '🗣️', roles: 'all', label: t('cmd.open_voice_settings', 'Open voice settings'), aliases: ['voice settings', 'speech settings', 'tts settings', 'speaking voice', 'volume', 'louder', 'quieter'], hint: t('cmd.open_voice_settings_hint', 'Voice, speed, and volume'), run: (c) => { c.setShowVoiceSettings(true); return t('cmd.open_voice_settings_done', 'Voice settings opened.'); } },
    { id: 'read_this_page', opensPanel: 'readThisPage', icon: '📖', roles: 'all', label: t('cmd.read_this_page', 'Read this page to me'), aliases: ['read aloud', 'read page', 'read it', 'listen'], hint: t('cmd.read_this_page_hint', 'Opens the page reader'), run: (c) => { c.setShowReadThisPage(true); return t('cmd.read_this_page_done', 'Page reader opened — choose where to start.'); } },
    { id: 'toggle_focus_mode', icon: '🎯', roles: 'all', label: t('cmd.toggle_focus_mode', 'Toggle focus mode'), aliases: ['focus mode', 'concentrate', 'distraction free'], hint: t('cmd.toggle_focus_mode_hint', 'Dim everything but the content'), run: (c) => { c.handleToggleFocusMode(); return t('cmd.toggle_focus_mode_done', 'Focus mode toggled.'); } },
    { id: 'toggle_reading_ruler', icon: '📏', roles: 'all', label: t('cmd.toggle_reading_ruler', 'Toggle the reading ruler'), aliases: ['reading ruler', 'line guide', 'ruler'], hint: t('cmd.toggle_reading_ruler_hint', 'A movable line guide for tracking'), run: (c) => { c.handleToggleReadingRuler(); return t('cmd.toggle_reading_ruler_done', 'Reading ruler toggled.'); } },
    { id: 'toggle_help_mode', icon: '❓', roles: 'all', label: t('cmd.toggle_help_mode', 'Toggle help mode'), aliases: ['help mode', 'what does this do', 'explain buttons'], hint: t('cmd.toggle_help_mode_hint', 'Click anything to learn what it does'), run: (c) => { c.handleToggleIsHelpMode(); return t('cmd.toggle_help_mode_done', 'Help mode toggled — click any control to learn about it.'); } },
    { id: 'toggle_bot', icon: '🤖', roles: 'all', chatSkip: true, label: t('cmd.toggle_bot', 'Show or hide AlloBot'), aliases: ['allobot', 'bot', 'assistant', 'hide bot', 'show bot'], hint: t('cmd.toggle_bot_hint', 'The assistant character'), run: (c) => { c.handleToggleIsBotVisible(); return t('cmd.toggle_bot_done', 'AlloBot visibility toggled.'); } },
    { id: 'toggle_line_focus', icon: '🔦', roles: 'all', label: t('cmd.toggle_line_focus', 'Toggle line focus'), aliases: ['line focus', 'focus line', 'one line'], hint: t('cmd.toggle_line_focus_hint', 'Highlight one line at a time'), run: (c) => { c.toggleLineFocus(); return t('cmd.toggle_line_focus_done', 'Line focus toggled.'); } },
    { id: 'toggle_visual_supports', icon: '🖼️', roles: 'all', label: t('cmd.toggle_visual_supports', 'Toggle visual supports'), aliases: ['visual supports', 'picture supports', 'visuals'], hint: t('cmd.toggle_visual_supports_hint', 'Picture cues alongside the text'), run: (c) => { c.handleToggleVisualSupports(); return t('cmd.toggle_visual_supports_done', 'Visual supports toggled.'); } },
    { id: 'toggle_dictation', icon: '🎤', roles: 'all', when: (c) => getCommandAudience(c) !== 'student' || c.allowStudentDictation !== false, label: t('cmd.toggle_dictation', 'Toggle dictation'), aliases: ['dictation', 'speech to text', 'type by voice'], hint: t('cmd.toggle_dictation_hint', 'Speak instead of typing'), run: (c) => { c.toggleDictation(); return t('cmd.toggle_dictation_done', 'Dictation toggled.'); } },
    { id: 'toggle_socratic', icon: '💬', roles: 'student', when: (c) => c.allowStudentSocratic !== false && !c.studentAiFeaturesHidden, label: t('cmd.toggle_socratic', 'Toggle the Socratic chat'), aliases: ['socratic', 'study chat', 'thinking partner'], hint: t('cmd.toggle_socratic_hint', 'A question-first study companion'), run: (c) => { c.handleToggleShowSocraticChat(); return t('cmd.toggle_socratic_done', 'Socratic chat toggled.'); } },
    { id: 'zen_on', icon: '🧘', roles: 'all', when: (c) => !c.zenActive, label: t('cmd.zen_on', 'Enter zen mode'), aliases: ['zen', 'zen mode', 'quiet mode', 'minimal'], hint: t('cmd.zen_on_hint', 'Hide everything but the content'), run: (c) => { c.zenOn(); return t('cmd.zen_on_done', 'Zen mode on — press Ctrl+K and run “exit zen” to come back.'); } },
    { id: 'zen_off', icon: '🔙', roles: 'all', when: (c) => !!c.zenActive, label: t('cmd.zen_off', 'Exit zen mode'), aliases: ['exit zen', 'leave zen', 'show interface'], hint: t('cmd.zen_off_hint', 'Bring the interface back'), run: (c) => { c.zenOff(); return t('cmd.zen_off_done', 'Zen mode off.'); } },

    // ── Display & motion + report-a-problem (added 2026-06-13: palette parity) ──
    { id: 'switch_theme', icon: '🎨', roles: 'all', label: t('cmd.switch_theme', 'Switch the theme (light / dark / high contrast)'), aliases: ['theme', 'dark mode', 'light mode', 'high contrast', 'contrast mode', 'night mode'], hint: t('cmd.switch_theme_hint', 'Cycle light → dark → high contrast'), run: (c) => { c.toggleTheme(); return t('cmd.switch_theme_done', 'Theme switched — cycling light, then dark, then high contrast.'); } },
    { id: 'toggle_color_overlay', icon: '🌈', roles: 'all', label: t('cmd.toggle_color_overlay', 'Toggle the color overlay'), aliases: ['color overlay', 'overlay', 'tint', 'color filter', 'irlen', 'screen tint'], hint: t('cmd.toggle_color_overlay_hint', 'Cycle a soft colored tint over the page'), run: (c) => { c.toggleOverlay(); return t('cmd.toggle_color_overlay_done', 'Color overlay changed.'); } },
    { id: 'toggle_animations', icon: '🌀', roles: 'all', label: t('cmd.toggle_animations', 'Turn animations off (reduced motion)'), aliases: ['disable animations', 'reduce motion', 'stop animations', 'no motion', 'calm motion'], hint: t('cmd.toggle_animations_hint', 'Reduce on-screen motion'), run: (c) => { c.toggleAnimations(); return t('cmd.toggle_animations_done', 'Animations toggled.'); } },
    { id: 'report_problem', icon: '🐞', roles: 'all', label: t('cmd.report_problem', 'Report a problem'), aliases: ['report a problem', 'feedback', 'bug report', 'something is broken', 'contact support'], hint: t('cmd.report_problem_hint', 'Open the problem reporter'), run: (c) => { c.openErrorReporter(); return t('cmd.report_problem_done', 'Problem reporter opened.'); } },

    // ── Pipeline (only offered while remediation results are open) ──
    { id: 'pipeline_score', icon: '🎯', roles: 'teacher', when: (c) => !!c.getPipelineScore && !!c.getPipelineScore(), label: t('cmd.pipeline_score', 'What’s my accessibility score?'), aliases: ['score', 'my score', 'accessibility score', 'how accessible'], hint: t('cmd.pipeline_score_hint', 'Speaks the current before → after'), run: (c) => { const s = c.getPipelineScore(); return s ? (t('cmd.pipeline_score_done', 'Score: ') + (s.before != null ? (s.before + ' before, ') : '') + s.after + ' of 100 now, target ' + s.target + '.') : t('cmd.pipeline_score_none', 'No remediation run is open.'); } },
    { id: 'pipeline_issues', icon: '📋', roles: 'teacher', when: (c) => !!c.getRemainingIssues && c.getRemainingIssues().length > 0, label: t('cmd.pipeline_issues', 'Read the remaining issues'), aliases: ['remaining issues', 'issues left', 'what is left', 'problems'], hint: t('cmd.pipeline_issues_hint', 'Speaks the top remaining issues'), run: (c) => { const iss = c.getRemainingIssues(); const top = iss.slice(0, 3).map((x, i) => (i + 1) + '. ' + (typeof x === 'string' ? x : (x.issue || x.description || ''))).join(' '); return t('cmd.pipeline_issues_done', 'Remaining issues: ') + iss.length + '. ' + top + (iss.length > 3 ? (' …' + t('cmd.pipeline_issues_more', 'and ') + (iss.length - 3) + t('cmd.pipeline_issues_more2', ' more in the Issues panel.')) : ''); } },
    { id: 'pipeline_downloads', icon: '📥', roles: 'teacher', when: (c) => !!c.pipelineOpen, label: t('cmd.pipeline_downloads', 'Go to pipeline downloads'), aliases: ['downloads', 'get my files', 'tagged pdf'], hint: t('cmd.pipeline_downloads_hint', 'Scrolls to the Downloads section'), run: (c) => { return c.jumpToPipelineSection('allo-sec-downloads') ? t('cmd.pipeline_downloads_done', 'Downloads section — the tagged PDF is the share-ready copy.') : t('cmd.pipeline_jump_miss', 'That section isn’t on screen right now.'); } },
    { id: 'pipeline_verification', icon: '✅', roles: 'teacher', when: (c) => !!c.pipelineOpen, label: t('cmd.pipeline_verification', 'Go to pipeline verification'), aliases: ['verification', 'verify section', 'evidence'], hint: t('cmd.pipeline_verification_hint', 'Scrolls to the Verification section'), run: (c) => { return c.jumpToPipelineSection('allo-sec-verify') ? t('cmd.pipeline_verification_done', 'Verification section.') : t('cmd.pipeline_jump_miss', 'That section isn’t on screen right now.'); } },

    // ── Show me how (tours by command) ──
    { id: 'app_tour', icon: '✨', roles: 'all', when: (c) => !!c.startAppTour, label: t('cmd.app_tour', 'Show me around the app'), aliases: ['tour', 'app tour', 'show me around', 'how does this work', 'walkthrough'], hint: t('cmd.app_tour_hint', 'A guided tour of the main features'), run: (c) => { c.startAppTour(); return t('cmd.app_tour_done', 'Starting the tour — use Next to walk through.'); } },
    { id: 'pipeline_tour', icon: '🧭', roles: 'teacher', when: (c) => !!c.pipelineOpen && !!c.startPipelineTour, label: t('cmd.pipeline_tour', 'Show me around these results'), aliases: ['pipeline tour', 'explain this screen', 'walk me through the results'], hint: t('cmd.pipeline_tour_hint', 'A 60-second tour of the remediation results'), run: (c) => { c.startPipelineTour('results'); return t('cmd.pipeline_tour_done', 'Starting the results tour.'); } },

    // ── Parameter-carrying commands (S3) ──
    { id: 'create_lesson', icon: '🧑‍🏫', roles: 'teacher', when: (c) => !!c.startLessonFlow, label: t('cmd.create_lesson', 'Create a lesson (tell me the topic)'), aliases: ['create a lesson', 'make a lesson', 'new lesson about', 'plan a lesson', 'lesson about'], hint: t('cmd.create_lesson_hint', 'Starts the guided flow — say a topic and grade'), run: (c, p) => { c.startLessonFlow(p || {}); return (p && p.topic) ? (t('cmd.create_lesson_done', 'Starting a lesson flow about “') + p.topic + '”' + (p.grade ? (t('cmd.create_lesson_done2', ' for grade ') + p.grade) : '') + t('cmd.create_lesson_done3', ' — AlloBot will guide the next steps.')) : t('cmd.create_lesson_done_blank', 'Starting the guided lesson flow — AlloBot will ask for your topic.'); } },
    { id: 'set_grade_level', icon: '🎚️', roles: ['teacher', 'independent', 'parent'], when: (c) => !!c.setSetupGradeLevel, label: t('cmd.set_grade_level', 'Set the grade level'), aliases: ['set grade level', 'grade level', 'target grade', 'reading level', 'set target level'], hint: t('cmd.set_grade_level_hint', 'e.g. set grade level to 5'), run: (c, p) => { const v = c.setSetupGradeLevel(p && p.grade); return v ? (t('cmd.set_grade_level_done', 'Grade level set to ') + v + '.') : t('cmd.set_grade_level_pick', 'Say a grade like grade 5.'); } },
    { id: 'set_source_tone', icon: '🎙️', roles: ['teacher', 'independent', 'parent'], when: (c) => !!c.setSetupSourceTone, label: t('cmd.set_source_tone', 'Set source tone'), aliases: ['set source tone', 'source tone', 'change tone', 'tone to', 'make the tone'], hint: t('cmd.set_source_tone_hint', 'Informative, narrative, dialogue, persuasive, humorous, or step-by-step'), run: (c, p) => { const v = c.setSetupSourceTone(p && p.tone); return v ? (t('cmd.set_source_tone_done', 'Source tone set to ') + v + '.') : t('cmd.set_source_tone_pick', 'Say a tone like narrative.'); } },
    { id: 'set_source_length', icon: '📏', roles: ['teacher', 'independent', 'parent'], when: (c) => !!c.setSetupSourceLength, label: t('cmd.set_source_length', 'Set source length'), aliases: ['set source length', 'source length', 'text length', 'reading length', 'word count'], hint: t('cmd.set_source_length_hint', 'Short, medium, long, or a word count'), run: (c, p) => { const v = c.setSetupSourceLength(p && p.length); return v ? (t('cmd.set_source_length_done', 'Source length set to about ') + v + t('cmd.set_source_length_done2', ' words.')) : t('cmd.set_source_length_pick', 'Say a length like 500 words.'); } },
    { id: 'set_output_language', icon: '🌐', roles: ['teacher', 'independent', 'parent'], when: (c) => !!c.setSetupLanguage, label: t('cmd.set_output_language', 'Set output language'), aliases: ['set output language', 'output language', 'text language', 'reading language', 'lesson language', 'write in'], hint: t('cmd.set_output_language_hint', 'Set the language used for generated resources'), run: (c, p) => { const v = c.setSetupLanguage(p && p.language); return v ? (t('cmd.set_output_language_done', 'Output language set to ') + v + '.') : t('cmd.set_output_language_pick', 'Say a language like Spanish.'); } },
    { id: 'set_font_size', icon: '🔠', roles: 'all', when: (c) => !!c.setFontSizeTo, label: t('cmd.set_font_size', 'Set the text size (say a number)'), aliases: ['set text size', 'text size to', 'font size to'], hint: t('cmd.set_font_size_hint', 'e.g. “set text size to 20” (10–32)'), run: (c, p) => { const v = c.setFontSizeTo(p && p.size); return t('cmd.set_font_size_done', 'Text size set to ') + v + '.'; } },
    { id: 'translate_document', icon: '🌐', roles: 'teacher', when: (c) => !!c.pipelineOpen && !!c.prefillTranslateLang, label: t('cmd.translate_document', 'Translate this document (say a language)'), aliases: ['translate this document', 'translate document to', 'translate to', 'translate it into'], hint: t('cmd.translate_document_hint', 'Pre-fills the language and points at the button'), run: (c, p) => { const lang = (p && p.language) ? String(p.language).trim() : ''; if (lang) c.prefillTranslateLang(lang); try { if (c.whereIs) c.whereIs('translate document'); } catch (_) {} return lang ? (t('cmd.translate_document_done', 'Set the translation language to ') + lang + t('cmd.translate_document_done2', ' and spotlighted the button — press Translate to run it. (Translations use AI quota, so the click stays yours.)')) : t('cmd.translate_document_pick', 'Spotlighted the translation controls — pick a language and press Translate.'); } },

    // ── Voice control (S2) ──
    { id: 'voice_start', icon: '🎙️', roles: 'all', when: (c) => !c.voiceActive && c.voiceAvailable, label: t('cmd.voice_start', 'Start voice control'), aliases: ['voice control', 'start listening', 'voice mode', 'hands free'], hint: t('cmd.voice_start_hint', 'AlloBot listens for commands until you stop it'), run: (c) => { c.startVoiceLoop(); return getCommandAudience(c) === 'student' ? (t('student.voice_control_on', 'Voice control on. Say a command like “bigger text” or “read directions”. Say “stop listening” to finish.') || 'Voice control on.') : t('cmd.voice_start_done', 'Voice control on. Say a command like “bigger text” or “open the educator hub”. Say “stop listening” to finish.'); } },
    { id: 'voice_stop', icon: '🛑', roles: 'all', when: (c) => !!c.voiceActive, label: t('cmd.voice_stop', 'Stop voice control'), aliases: ['stop listening', 'stop voice', 'voice off'], hint: t('cmd.voice_stop_hint', 'Stops the microphone'), run: (c) => { c.stopVoiceLoop(); return t('cmd.voice_stop_done', 'Voice control off — the microphone is released.'); } },

    // ── More coverage (2026-06-13, discovery w59vf8skj) — each maps to ONE existing host handler
    //    (verified by symbol in AlloFlowANTI.txt). Grouped via CMD_GROUP / CMD_CONTEXT above. ──
    { id: 'stop_reading', icon: '⏹️', roles: 'all', label: t('cmd.stop_reading', 'Stop reading aloud'), aliases: ['stop reading', 'stop talking', 'be quiet', 'silence', 'stop speech', 'stop the voice'], hint: t('cmd.stop_reading_hint', 'Interrupt the current text-to-speech'), run: (c) => { c.stopReading(); return t('cmd.stop_reading_done', 'Stopped reading aloud.'); } },
    { id: 'toggle_mute', icon: '🔇', roles: 'all', label: t('cmd.toggle_mute', 'Mute or unmute all audio'), aliases: ['mute', 'unmute', 'mute audio', 'sound off', 'sound on', 'silence audio'], hint: t('cmd.toggle_mute_hint', 'Toggle all app audio'), run: (c) => { const m = c.toggleMute(); return m ? t('cmd.toggle_mute_on', 'Audio muted.') : t('cmd.toggle_mute_off', 'Audio unmuted.'); } },
    { id: 'cycle_reading_theme', icon: '🎨', roles: 'all', label: t('cmd.cycle_reading_theme', 'Change the reading theme'), aliases: ['reading theme', 'next reading theme', 'sepia', 'dyslexia theme', 'reading color', 'paper color'], hint: t('cmd.cycle_reading_theme_hint', 'Cycle warm, sepia, dark, dyslexia-friendly, and more'), run: (c) => { const th = c.cycleReadingTheme(); return t('cmd.cycle_reading_theme_done', 'Reading theme: ') + th + '.'; } },
    { id: 'line_spacing_more', icon: '↕️', roles: 'all', label: t('cmd.line_spacing_more', 'Increase line spacing'), aliases: ['more line spacing', 'increase spacing', 'wider lines', 'space out lines'], hint: t('cmd.line_spacing_more_hint', '+0.1 to the line height'), run: (c) => { const v = c.lineSpacingMore(); return t('cmd.line_spacing_more_done', 'Line spacing set to ') + v + '.'; } },
    { id: 'line_spacing_less', icon: '🤏', roles: 'all', label: t('cmd.line_spacing_less', 'Decrease line spacing'), aliases: ['less line spacing', 'decrease spacing', 'tighter lines'], hint: t('cmd.line_spacing_less_hint', '−0.1 to the line height'), run: (c) => { const v = c.lineSpacingLess(); return t('cmd.line_spacing_less_done', 'Line spacing set to ') + v + '.'; } },
    { id: 'open_study_timer', icon: '⏲️', roles: 'all', label: t('cmd.open_study_timer', 'Start a study timer'), aliases: ['study timer', 'timer', 'pomodoro', 'focus timer', 'countdown'], hint: t('cmd.open_study_timer_hint', 'A focus / break timer'), run: (c) => { c.openStudyTimer(); return t('cmd.open_study_timer_done', 'Study timer opened.'); } },
    { id: 'open_sel_hub', opensPanel: 'selHub', icon: '💚', roles: 'all', label: t('cmd.open_sel_hub', 'Open the SEL Hub'), aliases: ['sel hub', 'social emotional', 'feelings', 'check in', 'emotions', 'calm corner'], hint: t('cmd.open_sel_hub_hint', 'Social-emotional learning tools'), run: (c) => { c.openSelHub(); return t('cmd.open_sel_hub_done', 'SEL Hub opened.'); } },
    { id: 'open_submission_inbox', icon: '📥', roles: 'teacher', label: t('cmd.open_submission_inbox', 'Open the submission inbox'), aliases: ['submission inbox', 'submissions', 'student work', 'turned in', 'inbox'], hint: t('cmd.open_submission_inbox_hint', 'Review work students have submitted'), run: (c) => { c.openSubmissionInbox(); return t('cmd.open_submission_inbox_done', 'Submission inbox opened.'); } },
    { id: 'toggle_cloud_sync', icon: '☁️', roles: 'teacher', label: t('cmd.toggle_cloud_sync', 'Turn cloud sync on or off'), aliases: ['cloud sync', 'sync', 'cloud save', 'backup', 'enable sync'], hint: t('cmd.toggle_cloud_sync_hint', 'Sync your work to the cloud (asks consent the first time)'), run: (c) => { const r = c.toggleCloudSync(); return r === 'off' ? t('cmd.toggle_cloud_sync_off', 'Cloud sync turned off.') : t('cmd.toggle_cloud_sync_consent', 'Opening the cloud-sync consent dialog — confirm there to turn it on.'); } },
    { id: 'generate_outline', icon: '🗂️', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.generate_outline', 'Make a concept outline'), aliases: ['outline', 'concept outline', 'make an outline', 'structure', 'summary outline'], hint: t('cmd.generate_outline_hint', 'Generate an outline from the current content'), run: (c) => { c.generateOutline(); return t('cmd.generate_outline_done', 'Generating an outline…'); } },
    { id: 'export_pack', icon: '📦', roles: 'teacher', when: (c) => !!c.hasSourceOrAnalysis, label: t('cmd.export_pack', 'Download the lesson pack'), aliases: ['export pack', 'download pack', 'download lesson', 'save lesson', 'export html'], hint: t('cmd.export_pack_hint', 'Download the lesson as a self-contained file'), run: (c) => { c.exportPack(); return t('cmd.export_pack_done', 'Preparing the lesson pack download…'); } },

    // ── Round-2 coverage (2026-06-14, discovery wfi4bz28q) — each maps to ONE App-scope handler
    //    (verified by symbol). pipeline_* gate on pipelineOpen / pipelineFixRunning. ──
    { id: 'launch_flashcards', icon: '🃏', roles: 'all', when: (c) => !!c.contentIsGlossary, label: t('cmd.launch_flashcards', 'Study with flashcards'), aliases: ['flashcards', 'flash cards', 'study cards', 'review cards', 'study mode'], hint: t('cmd.launch_flashcards_hint', 'Study this glossary as a flashcard deck'), run: (c) => { c.launchFlashcards(); return t('cmd.launch_flashcards_done', 'Flashcards ready.'); } },
    { id: 'open_persona_chat', icon: '🎭', roles: 'all', label: t('cmd.open_persona_chat', 'Open Persona interview'), aliases: ['persona', 'interview', 'interview mode', 'talk to a character', 'role play', 'historical figure'], hint: t('cmd.open_persona_chat_hint', 'Interview an AI persona about this topic'), run: (c) => { c.openPersona(); return t('cmd.open_persona_chat_done', 'Persona interview opened.'); } },
    { id: 'clear_my_answers', icon: '🧹', roles: 'all', when: (c) => !!c.contentLoaded, label: t('cmd.clear_my_answers', 'Clear my answers (start over)'), aliases: ['clear answers', 'reset answers', 'start over', 'erase my answers', 'redo activity'], hint: t('cmd.clear_my_answers_hint', 'Reset your responses on this activity'), run: (c) => { c.resetScaffolds(); return t('cmd.clear_my_answers_done', 'Confirm in the dialog to clear your answers.'); } },
    { id: 'clear_workspace', icon: '🗑️', roles: 'teacher', destructive: true, label: t('cmd.clear_workspace', 'Clear everything and start fresh'), aliases: ['clear workspace', 'clear all', 'start fresh', 'clear history', 'reset everything', 'blank slate'], hint: t('cmd.clear_workspace_hint', 'Removes the current content and history — asks first'), run: (c) => { c.clearWorkspace(); return t('cmd.clear_workspace_done', 'Workspace cleared.'); } },
    { id: 'undo_settings', icon: '⏪', roles: 'teacher', label: t('cmd.undo_settings', 'Undo my last settings change'), aliases: ['undo settings', 'restore settings', 'revert settings', 'undo that change'], hint: t('cmd.undo_settings_hint', 'Restore the previous lesson settings (not generated content)'), run: (c) => { c.restoreLastSettings(); return t('cmd.undo_settings_done', 'Restored your previous settings (if there was a change to undo).'); } },
    { id: 'pipeline_fix_again', icon: '🔁', roles: 'teacher', when: (c) => !!c.pipelineOpen && !c.pipelineFixRunning, label: t('cmd.pipeline_fix_again', 'Run the accessibility fix again'), aliases: ['fix again', 'run again', 'keep fixing', 'improve the score', 'another round'], hint: t('cmd.pipeline_fix_again_hint', 'Another remediation pass to push the score higher'), run: (c) => { c.rerunPipelineFix(); return t('cmd.pipeline_fix_again_done', 'Running another remediation pass…'); } },
    { id: 'pipeline_stop', icon: '🛑', roles: 'teacher', when: (c) => !!c.pipelineFixRunning, label: t('cmd.pipeline_stop', 'Stop the running fix'), aliases: ['stop fixing', 'stop the fix', 'halt remediation', 'cancel fix'], hint: t('cmd.pipeline_stop_hint', 'Stop after the current round — keeps what’s done'), run: (c) => { c.stopPipelineFix(); return t('cmd.pipeline_stop_done', 'Stopping after the current round.'); } },
    { id: 'set_ui_language', icon: '🌐', roles: 'all', label: t('cmd.set_ui_language', 'Change the interface language'), aliases: ['interface language', 'app language', 'ui language', 'menu language', 'change interface language', 'language of the app', 'change language', 'switch language', 'my language'], hint: t('cmd.set_ui_language_hint', 'Jump to the language picker in the header'), run: (c) => { return c.spotlightUiLanguage() ? t('cmd.set_ui_language_done', 'Pointed you to the language picker in the header — choose your language there.') : t('cmd.set_ui_language_miss', 'The interface-language picker is in the top menu bar.'); } },
    { id: 'pipeline_new_doc', icon: '🆕', roles: 'teacher', destructive: true, when: (c) => !!c.pipelineOpen, label: t('cmd.pipeline_new_doc', 'Start over with a new document'), aliases: ['new document', 'new pdf', 'another document', 'clear pipeline', 'upload new'], hint: t('cmd.pipeline_new_doc_hint', 'Clear this result and upload a new file'), run: (c) => { c.startNewPdfAudit(); return t('cmd.pipeline_new_doc_done', 'Cleared — upload a new document to begin.'); } },
  ];
  // opts.includeGated (agentic plans): keep when-gated commands in the list —
  // the PLANNER must see commands an earlier step will unlock (create lesson →
  // generate quiz), while every EXECUTION surface keeps the default filter and
  // runPlan re-checks availability at run time. Role filtering always applies.
  return cmds.filter((c) => _commandAllowsAudience(c, audience) && (opts.includeGated || !c.when || (() => { try { return !!c.when(ctx); } catch (_) { return false; } })()));
}

// ── S1: the hybrid utterance router (bot chat + voice share it) ──
// Deterministic first (zero AI): a strong scorer hit runs immediately.
// Otherwise, with allowAi, ONE Gemini call maps the utterance to a
// command id with a confidence — below threshold we DON'T act (the
// caller falls through to normal chat, or voice says it didn't catch
// a command). Returns {handled, narration, commandId, via} or null.
function _throwIfCommandPlanningAborted(signal) {
  if (!signal || !signal.aborted) return;
  const error = new Error('Command planning cancelled.');
  error.name = 'AbortError';
  throw error;
}

async function routeUtterance(ctx, rawText, opts = {}) {
  const text = String(rawText || '').trim();
  if (!text || text.length > 200) return null;
  const t = _mkT(ctx && ctx.t);
  // "Where is X?" — answered by POINTING (spotlight on the live control)
  // rather than describing. Deterministic prefix grammar; the host's
  // whereIs scans the on-screen [data-help-key] vocabulary.
  const _looksLikeReadingFind = /^(?:find|recommend|suggest|show|get|help me find)\s+(?:me\s+)?(?:a\s+|some\s+|the\s+)?(?:books|book|readings|reading|stories|story|articles|article|sources|source|texts|text)\b/i.test(text);
  const _whereM = text.match(/^(?:where(?:'s| is| are)?|find|locate|show me where)\s+(?:the\s+|my\s+|is\s+|are\s+)?(.{2,60}?)\??$/i);
  if (_whereM && !_looksLikeReadingFind && !opts.preview && typeof ctx.whereIs === 'function') {
    const narration = ctx.whereIs(_whereM[1].trim());
    if (narration) return { handled: true, narration, commandId: 'where_is', via: 'where-is' };
  }
  // S3 param grammars — deterministic, zero AI. Each maps to a command
  // WITH extracted params; runs only if that command is available (mode/
  // when guards already applied by buildAlloCommands).
  const _grammars = [
    { id: 'find_reading', re: /^(?:find|recommend|suggest|show|get|help me find)\s+(?:me\s+)?(?:a\s+|some\s+|the\s+)?(?:books|book|readings|reading|stories|story|articles|article|sources|source|texts|text)\s*(?:about|on|for)?\s*(.*?)\??$/i, params: (m) => _readingParams(m[1], null) },
    { id: 'find_reading', re: /^(?:i\s+want\s+to\s+(?:learn|read)\s+about|i'?m\s+looking\s+for\s+(?:a\s+)?(?:book|source|reading|article|text)\s+about|something\s+about|what\s+can\s+i\s+read\s+about)\s+(.+?)\??$/i, params: (m) => _readingParams(m[1], null) },
    { id: 'create_lesson', re: /^(?:create|make|start|build|plan)\s+(?:a\s+|new\s+)?lesson\s*(?:about|on)?\s*(.*?)(?:\s+for\s+(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade(?:rs)?)?)?\s*\??$/i, params: (m) => ({ topic: (m[1] || '').trim() || null, grade: m[2] || null }) },
    { id: 'set_grade_level', re: /^(?:set|change|make)\s+(?:the\s+)?(?:grade|grade level|target grade|reading level|level)\s*(?:to|for)?\s*(kindergarten|k|pre[-\s]?k|college|graduate(?: level)?|\d{1,2}(?:st|nd|rd|th)?(?:\s*grade)?)\s*\??$/i, params: (m) => ({ grade: m[1] || null }) },
    { id: 'set_source_tone', re: /^(?:set|change|make)\s+(?:the\s+)?(?:source\s+)?tone\s*(?:to)?\s*([a-z -]{3,40})\s*\??$/i, params: (m) => ({ tone: m[1].trim() }) },
    { id: 'set_source_length', re: /^(?:set|change|make)\s+(?:the\s+)?(?:source|text|reading|passage)?\s*(?:length|word count)\s*(?:to)?\s*([a-z]+|\d{1,4})(?:\s*words?)?\s*\??$/i, params: (m) => ({ length: m[1] || null }) },
    { id: 'set_output_language', re: /^(?:set|change)\s+(?:the\s+)?(?:output|text|reading|lesson|response)\s+language\s*(?:to)?\s+([^?]{2,40})\s*\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: 'set_output_language', re: /^write\s+(?:this|it|the\s+text|the\s+lesson|resources)?\s*(?:in|into)\s+([^?]{2,40})\s*\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: 'set_font_size', re: /^(?:set\s+)?(?:the\s+)?(?:text|font)\s*(?:size)?\s*(?:to)?\s*(\d{1,2})\s*\.?$/i, params: (m) => ({ size: m[1] }) },
    { id: 'translate_document', re: /^translate\s+(?:this|the\s+document|document|it)?\s*(?:to|into)\s+([a-z\u00C0-\u024F\s()-]{2,40})\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: 'generate_simplified', re: /^(?:simplify|make (?:this|it) (?:easier|simpler)|lower the (?:reading )?level)(?:\s+(?:this|it))?(?:\s+(?:to|for)?\s*(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?)?\s*\??$/i, params: (m) => ({ grade: m[1] || null }) },
    { id: 'send_teacher_signal', re: /^(?:tell|signal|let)\s+(?:my\s+)?teacher\s+(?:that\s+)?(?:i(?:'m| am)\s+)?(stuck|confused|ready|done)\s*\??$/i, params: (m) => ({ signal: m[1] }) },
    { id: 'send_teacher_signal', re: /^(?:ask|tell)\s+(?:my\s+)?teacher\s+to\s+(slow down|repeat(?: that)?|say that again)\s*\??$/i, params: (m) => ({ signal: m[1] }) },
  ];
  let commands = buildAlloCommands(ctx);
  // The bot chat (preview) must not PROPOSE chatSkip commands (e.g. toggle_bot:
  // the chat already has an X). They stay available via Ctrl+K / voice.
  if (opts.preview) commands = commands.filter((c) => !c.chatSkip);
  // _runCmd MUST be declared before the grammar loop below — the loop calls it on a match, and a
  // `const` referenced before its declaration is a temporal-dead-zone ReferenceError. That throw
  // was swallowed by the caller's try-catch as a silent non-match, which killed EVERY natural-
  // language param grammar (create_lesson / set_font_size / translate_document / generate_simplified)
  // on both the bot router and the voice loop. (Audit wmb2t8o20, fix 2026-06-15.)
  const _runCmd = (cmd, via, params) => {
    const safeParams = sanitizeCommandParams(cmd, params || {});
    // Preview reports the match without running it; the chat asks first.
    if (opts.preview) return { handled: false, preview: true, commandId: cmd.id, label: cmd.label, params: safeParams, via, destructive: !!cmd.destructive, confirmation: cmd.destructive ? _commandConfirmationText(cmd, ctx, t) : '' };
    return executeCommand(ctx, cmd, safeParams, { confirmed: !!opts.confirmed, via });
  };
  for (const g of _grammars) {
    const m = text.match(g.re);
    if (m) {
      const cmd = commands.find((c) => c.id === g.id);
      if (cmd) return _runCmd(cmd, 'grammar', g.params(m));
    }
  }
  let best = null, bestScore = 0;
  for (const c of commands) { const s = scoreCommand(c, text); if (s > bestScore) { bestScore = s; best = c; } }
  // Palette/voice accept 60+; the bot CHAT (preview) demands 80+ on a >=3 char
  // utterance so a stray short opener can't be read as a command.
  if (bestScore >= 60 && (!opts.preview || (bestScore >= 80 && text.length >= 3))) return _runCmd(best, 'deterministic');
  if (!opts.allowAi || typeof ctx.callGemini !== 'function') return null;
  // Cheap heuristic gate: don't burn a call on clearly-conversational
  // input (questions about content, long sentences with no verbs we know).
  if (text.split(/\s+/).length > 14) return null;
  try {
    _throwIfCommandPlanningAborted(opts.signal);
    const menu = commands.map((c) => {
      const contract = getCommandContract(c);
      const notes = contract.params.length ? (' [params ' + contract.params.join(', ') + ']') : '';
      return c.id + ': ' + c.label + (c.aliases && c.aliases.length ? (' (' + c.aliases.slice(0, 3).join(', ') + ')') : '') + notes;
    }).join('\n');
    const out = await ctx.callGemini('A user typed a request to an education app\'s assistant. If it clearly maps to ONE of these app commands, return it; otherwise commandId must be null. Commands:\n' + menu + '\n\nUser: "' + text.replace(/"/g, '\'') + '"\n\nReturn ONLY JSON: {"commandId": string | null, "params": object, "confidence": number between 0 and 1}. params carries values the user stated (e.g. {"topic": "photosynthesis", "grade": "5"} or {"size": "20"} or {"language": "Vietnamese"}) — empty object if none. Use null commandId unless you are confident they want the APP ACTION (not a content question).', false, false, null, null, opts.signal || null);
    _throwIfCommandPlanningAborted(opts.signal);
    const m = String(out || '').match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : String(out));
    if (j && j.commandId && typeof j.confidence === 'number' && j.confidence >= 0.7) {
      const cmd = commands.find((c) => c.id === j.commandId);
      if (cmd) return _runCmd(cmd, 'ai', j.params || {});
    }
  } catch (error) { if (error && error.name === 'AbortError') throw error; }
  return null;
}

// Run a specific command by id (used by the bot chat AFTER the user confirms a
// previewed match). Mirrors routeUtterance's _runCmd side-effect handling.
function _commandConfirmationText(command, ctx, t) {
  if (command && typeof command.confirmMessage === 'function') {
    try { const message = command.confirmMessage(ctx || {}); if (message) return String(message); } catch (_) {}
  }
  if (command && command.confirmMessage) return String(command.confirmMessage);
  return t('palette.confirm', 'Press Enter again to confirm.');
}

function _emitCommandLifecycle(ctx, command, status, narration, via, notifyUser) {
  const detail = { commandId: command && command.id, label: command && command.label, status, narration: narration || '', via: via || 'confirm', at: Date.now() };
  try { if (ctx && typeof ctx.onCommandState === 'function') ctx.onCommandState(detail); } catch (_) {}
  try { if (typeof window !== 'undefined' && window.dispatchEvent && window.CustomEvent) window.dispatchEvent(new window.CustomEvent('alloflow:command-state', { detail })); } catch (_) {}
  if (!notifyUser || !narration || status === 'pending') return detail;
  try { if (typeof window !== 'undefined' && window.alloAnnounce) window.alloAnnounce(narration, status === 'error' ? 'assertive' : 'polite'); } catch (_) {}
  if (status === 'error') { try { if (ctx && ctx.addToast) ctx.addToast(narration, 'error'); } catch (_) {} }
  return detail;
}

// Run a specific command by id (used by the bot chat AFTER the user confirms a
// previewed match). Re-resolves permissions, emits a shared async lifecycle,
// and never invokes run + runAsync for the same execution.
function executeCommand(ctx, commandOrId, params, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const id = String(commandOrId && typeof commandOrId === 'object' ? commandOrId.id : (commandOrId || ''));
  const commands = buildAlloCommands(ctx);
  const cmd = commands.find((c) => c.id === id);
  if (!cmd) return null;
  if (cmd.destructive && !opts.confirmed) return { handled: true, narration: _commandConfirmationText(cmd, ctx, t), commandId: cmd.id, via: 'confirm', confirmationRequired: true };
  const safeParams = sanitizeCommandParams(cmd, params || {});
  const via = opts.via || 'confirm';
  if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === 'function') { try { ctx.closeOtherPanels(cmd.opensPanel); } catch (_) {} }

  if (typeof cmd.runAsync === 'function') {
    let action;
    try { action = Promise.resolve(cmd.runAsync(ctx, safeParams)); }
    catch (error) {
      const narration = t('router.failed', 'That did not work: ') + ((error && error.message) || 'unknown');
      _emitCommandLifecycle(ctx, cmd, 'error', narration, via, !opts.awaitCompletion);
      const failed = { handled: true, ok: false, narration, commandId: cmd.id, via };
      return opts.awaitCompletion ? Promise.resolve(failed) : failed;
    }
    const pendingNarration = cmd.pendingNarration || t('cmd.working', 'Working...');
    _emitCommandLifecycle(ctx, cmd, 'pending', pendingNarration, via, false);
    const completion = action.then((message) => {
      const narration = message || t('router.done', 'Done.');
      _emitCommandLifecycle(ctx, cmd, 'success', narration, via, !opts.awaitCompletion);
      return { handled: true, ok: true, narration, commandId: cmd.id, via };
    }).catch((error) => {
      const narration = t('router.failed', 'That did not work: ') + ((error && error.message) || 'unknown');
      _emitCommandLifecycle(ctx, cmd, 'error', narration, via, !opts.awaitCompletion);
      return { handled: true, ok: false, narration, commandId: cmd.id, via };
    });

    if (!opts.awaitCompletion) return { handled: true, ok: true, pending: true, narration: pendingNarration, commandId: cmd.id, via, completion };

    const timeoutMs = opts.timeoutMs || 180000;
    let timerId = null;
    const timer = new Promise((resolve) => { timerId = setTimeout(() => resolve({ __alloTimeout: true }), timeoutMs); });
    const clearTimer = () => { if (timerId != null) { clearTimeout(timerId); timerId = null; } };
    return Promise.race([completion, timer]).then((result) => {
      clearTimer();
      if (result && result.__alloTimeout) return { handled: true, ok: true, timedOut: true, narration: t('router.still_working', 'Still working - it will finish in the background.'), commandId: cmd.id, via };
      return result;
    });
  }

  try {
    const message = cmd.run(ctx, safeParams);
    return { handled: true, narration: message || t('router.done', 'Done.'), commandId: cmd.id, via };
  } catch (error) {
    return { handled: true, ok: false, narration: t('router.failed', 'That did not work: ') + ((error && error.message) || 'unknown'), commandId: cmd.id, via };
  }
}

// ── Agentic plans (Phase B/C, 2026-07-07 — docs/AGENTIC_ALLOBOT_DESIGN.md) ──
// looksMultiStep: cheap deterministic smell test so the planner's Gemini
// call only fires on utterances that read as a SEQUENCE. Conservative on
// purpose — a miss just means the bot chats normally.
function runCommandById(ctx, id, params, opts = {}) {
  return executeCommand(ctx, id, params, opts);
}

function looksMultiStep(rawText) {
  const text = String(rawText || '').trim();
  if (text.length < 12) return false;
  if (/\b(then|after that|and then|followed by|once (?:that|it)'?s? done|next,)\b/i.test(text)) return true;
  if (/^\s*1[.)]/.test(text) && /\n\s*2[.)]/.test(text)) return true; // pasted numbered list
  // and-chains without "then": a conjunction plus ≥2 command-ish verbs
  // ("simplify this and make a quiz"). A false positive only costs one
  // planner call that the confidence gate then rejects.
  if (/\b(and|,)\s/i.test(text)) {
    const verbs = text.match(/\b(make|create|generate|build|simplify|translate|open|start|export|download|analyz[es]|read|quiz|glossary|summari[sz]e)\b/gi);
    if (verbs && verbs.length >= 2) return true;
  }
  return false;
}

// Plan params come back from the model — keep only flat primitives with
// bounded size so no handler ever sees a nested object, huge string, or
// oddball key blob it didn't expect.
function _cleanPlanParams(p) {
  const out = {};
  if (!p || typeof p !== 'object' || Array.isArray(p)) return out;
  for (const k of Object.keys(p).slice(0, 8)) {
    const v = p[k];
    if (typeof v === 'string') { const s = v.trim().slice(0, 200); if (s) out[k] = s; }
    else if (typeof v === 'number' && isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

// planUtterance: ONE Gemini call mapping a multi-step request to an
// ordered list of registry commands. Returns [{commandId, params, why}]
// (2–6 steps, every id validated against the CURRENT role-filtered menu)
// or null. Nothing here executes — the caller must confirm + runPlan.
async function planUtterance(ctx, rawText, opts = {}) {
  const text = String(rawText || '').trim();
  if (!text || text.length > 400) return null;
  if (!ctx || typeof ctx.callGemini !== 'function') return null;
  // Include gated commands so the model may propose a real producer before a
  // dependent command. The contract validator below proves that dependency;
  // it never assumes a wizard or navigation command produced app content.
  const commands = buildAlloCommands(ctx, { includeGated: true }).filter((c) => {
    if (c.chatSkip || c.destructive) return false;
    return !opts.demoSafeOnly || getCommandContract(c).demoSafe;
  });
  if (!commands.length) return null;
  const _gatedNow = (c) => { if (!c.when) return false; try { return !c.when(ctx); } catch (_) { return true; } };
  const menu = commands.map((c) => {
    const contract = getCommandContract(c);
    const notes = [];
    if (_gatedNow(c)) notes.push('not available in the live state');
    if (contract.requires.length) notes.push('requires ' + contract.requires.join(', '));
    if (contract.produces.length) notes.push('produces ' + contract.produces.join(', '));
    if (contract.params.length) notes.push('params ' + contract.params.join(', '));
    if (contract.interaction !== 'automatic') notes.push(contract.interaction);
    if (contract.terminal) notes.push('must be final');
    return c.id + ': ' + c.label + (notes.length ? ' [' + notes.join('; ') + ']' : '');
  }).join('\n');
  try {
    _throwIfCommandPlanningAborted(opts.signal);
    const out = await ctx.callGemini('A teacher asked an education app\'s assistant to do a multi-step task. Break it into an ORDERED list of app commands chosen ONLY from this menu:\n' + menu + '\n\nTask: "' + text.replace(/"/g, '\'') + '"\n\nReturn ONLY JSON: {"steps": [{"commandId": string, "params": object, "why": string}], "confidence": number between 0 and 1}. Use 2 to 6 steps. A command with requirements may appear only when the current app state already satisfies them or an EARLIER command explicitly says it produces them. Navigation and guided wizards do not produce content unless their contract says so. A command marked [must be final] cannot have later steps. params carries only values the user stated, using the named params in the menu; use {} if none. "why" is a short phrase. Return {"steps": [], "confidence": 0} unless the task CLEARLY maps to a sequence of these app actions (not a content question).', false, false, null, null, opts.signal || null);
    _throwIfCommandPlanningAborted(opts.signal);
    const m = String(out || '').match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : String(out));
    if (!j || !Array.isArray(j.steps) || typeof j.confidence !== 'number' || j.confidence < 0.7) return null;
    const known = new Set(commands.map((c) => c.id));
    const steps = j.steps.filter((s) => s && typeof s.commandId === 'string').slice(0, 6);
    if (steps.length < 2) return null; // single-step asks stay on routeUtterance
    if (steps.some((s) => !known.has(s.commandId))) return null;
    const cleanSteps = steps.map((s) => ({
      commandId: s.commandId,
      params: _cleanPlanParams(s.params),
      why: typeof s.why === 'string' ? s.why.slice(0, 120) : ''
    }));
    const report = validatePlan(ctx, cleanSteps, {
      demoSafeOnly: !!opts.demoSafeOnly,
      allowInteractive: !!opts.allowInteractive
    });
    return report.ok ? report.items.map((item) => ({ commandId: item.commandId, params: item.params, why: item.why })) : null;
  } catch (error) { if (error && error.name === 'AbortError') throw error; return null; }
}

// runPlan: sequential executor. Fresh ctx per step (state mirrors like
// hasSourceOrAnalysis change as steps land), `when:` availability is
// re-checked at RUN time via the rebuilt menu, destructive steps never
// auto-run (opts.confirmDestructive may allow one explicitly), and each
// step is awaited through runCommandById's awaitCompletion path. Stops
// on the first failure and reports which step, keeping prior results.
async function runPlan(ctxOrGet, steps, opts = {}) {
  const getCtx = (typeof ctxOrGet === 'function') ? ctxOrGet : () => ctxOrGet;
  const t = _mkT((getCtx() || {}).t);
  const list = (Array.isArray(steps) ? steps : []).slice(0, 6);
  const results = [];
  if (!list.length) return { ok: false, failedStep: 0, results, remainingSteps: [], reason: t('plan.empty', 'There were no steps to run.') };
  for (let i = 0; i < list.length; i++) {
    if (opts.shouldStop && opts.shouldStop()) return { ok: false, stopped: true, failedStep: i, results, remainingSteps: list.slice(i), reason: t('plan.stopped', 'Stopped before step ') + (i + 1) + '.' };
    const s = list[i] || {};
    const ctx = getCtx();
    const cmd = buildAlloCommands(ctx).find((c) => c.id === s.commandId);
    if (!cmd) return { ok: false, failedStep: i, results, remainingSteps: list.slice(i), reason: t('plan.unavailable', 'Step ') + (i + 1) + ' (' + (s.commandId || '?') + ')' + t('plan.unavailable2', ' isn’t available right now — it may need something an earlier step didn’t produce.') };
    if (cmd.destructive) {
      let allowed = false;
      if (typeof opts.confirmDestructive === 'function') { try { allowed = !!(await opts.confirmDestructive(cmd, s, i)); } catch (_) { allowed = false; } }
      if (!allowed) return { ok: false, failedStep: i, results, remainingSteps: list.slice(i), reason: (cmd.label || s.commandId) + t('plan.needs_confirm', ' needs its own confirmation — run it from the Ctrl+K menu.') };
    }
    if (typeof opts.onStep === 'function') { try { opts.onStep(i, 'start', cmd, null); } catch (_) {} }
    let r = null;
    try { r = await runCommandById(ctx, s.commandId, s.params || {}, { confirmed: true, awaitCompletion: true, via: 'plan', timeoutMs: opts.timeoutMs }); }
    catch (e) { r = { handled: false, narration: (e && e.message) || 'unknown' }; }
    results.push(r);
    if (!r || !r.handled || r.ok === false) return { ok: false, failedStep: i, results, remainingSteps: list.slice(i), reason: (r && r.narration) || t('plan.step_failed', 'That step didn’t work.') };
    // A timed-out step is still RUNNING in the background — starting the next
    // step now would race it (two concurrent generations fighting over shared
    // state). Hold the remainder instead; nothing failed, so say so honestly.
    if (r.timedOut) return { ok: false, timedOut: true, failedStep: i, results, remainingSteps: list.slice(i + 1), reason: (cmd.label || s.commandId) + t('plan.step_timeout', ' is taking a while and is still working in the background. I’ve held the remaining steps — once it finishes, ask me again for the rest.') };
    if (typeof opts.onStep === 'function') { try { opts.onStep(i, 'done', cmd, r.narration); } catch (_) {} }
  }
  return { ok: true, results, remainingSteps: [] };
}
// ── S2: the opt-in voice loop ──
// One singleton SpeechRecognition session; every FINAL transcript routes
// through routeUtterance (deterministic-first). Unmatched utterances are
// announced, never guessed. Stops on explicit command, Escape-equivalent
// (stop phrase), page hide, or three consecutive errors. Never restarts
// itself across sessions — opt-in only, every state change narrated.
function createVoiceLoop(getCtx) {
  let rec = null, active = false, errStreak = 0, routeController = null, routeSerial = 0, pageHideHandler = null;
  const cancelRoute = () => {
    routeSerial++;
    const controller = routeController;
    routeController = null;
    if (controller) { try { controller.abort(); } catch (_) {} }
  };
  const announce = (msg) => { const c = getCtx(); try { if (window.alloAnnounce) window.alloAnnounce(msg); } catch (_) {} try { if (c && c.addToast) c.addToast(msg, 'info'); } catch (_) {} };
  const stop = (reason) => {
    cancelRoute();
    if (pageHideHandler) {
      try { window.removeEventListener('pagehide', pageHideHandler); } catch (_) {}
      pageHideHandler = null;
    }
    if (!active) return;
    active = false;
    try { if (rec) { rec.onend = null; rec.stop(); } } catch (_) {}
    rec = null;
    const c = getCtx();
    try { if (c && c.setVoiceActive) c.setVoiceActive(false); } catch (_) {}
    if (reason) announce(reason);
  };
  const start = () => {
    const c = getCtx();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { announce('Voice control isn’t available in this browser.'); return false; }
    if (active) return true;
    try {
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = (c && c.voiceLang) || 'en-US';
      rec.onresult = async (ev) => {
        errStreak = 0;
        const last = ev.results[ev.results.length - 1];
        if (!last || !last.isFinal) return;
        const text = String(last[0] && last[0].transcript || '').trim();
        if (!text) return;
        const cc = getCtx();
        if (/^(stop listening|stop voice|voice off)\b/i.test(text)) { stop('Voice control off — the microphone is released.'); return; }
        if (routeController) { try { routeController.abort(); } catch (_) {} }
        const currentRouteSerial = ++routeSerial;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        routeController = controller;
        const signal = controller ? controller.signal : null;
        try {
          const r = await routeUtterance(cc, text, { allowAi: true, signal });
          if (!active || currentRouteSerial !== routeSerial || (signal && signal.aborted)) return;
          if (r && r.handled) announce(r.narration);
          else announce('Didn\u2019t catch a command in \u201c' + text.slice(0, 60) + '\u201d \u2014 try \u201cbigger text\u201d or ' + (getCommandAudience(cc) === 'student' ? '\u201cread directions\u201d.' : '\u201copen the educator hub\u201d.'));
        } catch (error) {
          if (!active || currentRouteSerial !== routeSerial || (error && error.name === 'AbortError')) return;
          announce('Didn\u2019t catch a command in \u201c' + text.slice(0, 60) + '\u201d \u2014 try \u201cbigger text\u201d or ' + (getCommandAudience(cc) === 'student' ? '\u201cread directions\u201d.' : '\u201copen the educator hub\u201d.'));
        } finally {
          if (currentRouteSerial === routeSerial) routeController = null;
        }
      };
      rec.onerror = (ev) => {
        errStreak++;
        if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) { stop('Microphone permission was denied — voice control stopped.'); return; }
        if (errStreak >= 3) stop('Voice control stopped after repeated microphone errors.');
      };
      rec.onend = () => {
        // Auto-resume within an active session (continuous SR sessions
        // time out); NEVER across an explicit stop.
        if (active) { try { rec.start(); } catch (_) { stop('Voice control stopped.'); } }
      };
      rec.start();
      active = true;
      errStreak = 0;
      try { if (c && c.setVoiceActive) c.setVoiceActive(true); } catch (_) {}
      pageHideHandler = () => stop();
      try { window.addEventListener('pagehide', pageHideHandler, { once: true }); } catch (_) { pageHideHandler = null; }
      return true;
    } catch (e) { announce('Voice control could not start: ' + ((e && e.message) || 'unknown')); return false; }
  };
  return { start, stop: () => stop('Voice control off — the microphone is released.'), isActive: () => active };
}

// Deterministic scorer: label/alias startsWith > word-prefix > includes.
function scoreCommand(cmd, q) {
  if (!q) return 1;
  const needle = q.toLowerCase().trim();
  let best = 0;
  const texts = [cmd.label].concat(cmd.aliases || []);
  for (const raw of texts) {
    const s = String(raw || '').toLowerCase();
    if (s === needle) best = Math.max(best, 100);
    else if (s.startsWith(needle)) best = Math.max(best, 80);
    else if (s.split(/\s+/).some((w) => w.startsWith(needle))) best = Math.max(best, 60);
    else if (s.includes(needle)) best = Math.max(best, 40);
  }
  // The hint is t()-localized in every pack, but aliases are static English — so in non-English
  // packs keyword/synonym search was dead (label-substring only). Score the hint as a LOW-weight
  // fallback (max 30): enough to surface a command in the palette's search list, but below the
  // 60 bot/voice auto-run threshold so a loose hint-substring can never auto-execute a command.
  if (best < 30 && cmd.hint) {
    const h = String(cmd.hint).toLowerCase();
    if (h.includes(needle) || h.split(/\s+/).some((w) => w.startsWith(needle))) best = 30;
  }
  return best;
}

// ── Context-aware grouping (Slice 3, 2026-06-13) ──
// `group` (no-query section) and `context` (states a command FLOATS for) live as id→meta
// maps — NOT fields on each registry entry — so the registry stays untouched and these are
// pure renderer metadata layered ON TOP of `when`/`roles` (the only hard-availability gate).
// Unmapped commands default to group 'navigate' and no context (never floated), so an
// un-mapped/new command still renders correctly. Tests still require every registry
// command to be explicitly grouped so browse metadata cannot silently drift.
const CMD_GROUP = {
  open_educator_hub:'navigate', open_learning_hub:'navigate', open_source_input:'navigate', open_source_url:'navigate', open_source_generator:'navigate', open_history:'navigate', open_document_builder:'navigate', open_wizard:'navigate',
  open_notebook:'navigate', open_translate:'navigate', open_class_session:'navigate', open_class_analytics:'navigate',
  open_live_session_center:'live', open_live_poll:'live', open_quick_check:'live', open_pictionary_host:'live', open_group_tools:'live', open_student_signal:'live',
  open_export_menu:'navigate', open_ai_settings:'navigate', go_dashboard:'navigate', open_roster:'navigate', open_project_settings:'navigate',
  generate_quiz:'create', generate_glossary:'create', generate_simplified:'create', generate_sentence_frames:'create',
  generate_analysis:'create', create_lesson:'create', set_grade_level:'create', set_source_tone:'create', set_source_length:'create', set_output_language:'create', submit_work:'create', open_assignment_directions:'navigate', check_assignment_progress:'navigate', save_my_work:'navigate',
  font_bigger:'accessibility', font_smaller:'accessibility', font_reset:'accessibility', set_font_size:'accessibility', open_text_settings:'accessibility',
  open_voice_settings:'accessibility', read_this_page:'accessibility', toggle_focus_mode:'accessibility', toggle_reading_ruler:'accessibility',
  toggle_help_mode:'accessibility', toggle_bot:'accessibility', toggle_line_focus:'accessibility', toggle_visual_supports:'accessibility',
  toggle_dictation:'accessibility', toggle_socratic:'accessibility', zen_on:'accessibility', zen_off:'accessibility',
  switch_theme:'display', toggle_color_overlay:'display', toggle_animations:'display',
  pipeline_score:'pipeline', pipeline_issues:'pipeline', pipeline_downloads:'pipeline', pipeline_verification:'pipeline', translate_document:'pipeline',
  app_tour:'help', pipeline_tour:'help', report_problem:'help',
  voice_start:'voice', voice_stop:'voice',
  open_stem_lab:'tools', open_storyforge:'tools', open_allohaven:'tools', open_behavior_lens:'tools', open_report_writer:'tools',
  open_symbol_studio:'tools', open_video_studio:'tools', open_cinematic_studio:'tools', open_allo_studio:'tools',
  open_accessibility_lab:'tools', open_lumen:'tools', open_free_forms:'tools', open_community_catalog:'tools', open_dynamic_assessment:'tools', open_reading_library:'tools',
  open_open_groove:'tools', open_timeline_studio:'tools', open_lingua_practice:'tools', open_test_prep_hub:'tools', open_research_hub:'tools', open_lit_lab:'tools', open_mind_map:'tools', open_poet_tree:'tools', find_reading:'tools',
  stop_reading:'accessibility', toggle_mute:'accessibility', line_spacing_more:'accessibility', line_spacing_less:'accessibility', open_study_timer:'accessibility',
  cycle_reading_theme:'display', set_ui_language:'display', open_sel_hub:'tools', open_submission_inbox:'navigate', toggle_cloud_sync:'navigate', generate_outline:'create', export_pack:'create',
  launch_flashcards:'create', clear_my_answers:'create', clear_workspace:'create', undo_settings:'create', open_persona_chat:'navigate',
  pipeline_fix_again:'pipeline', pipeline_stop:'pipeline', pipeline_new_doc:'pipeline',
  edit_assignment_directions:'create', open_assessment_builder:'create', open_udl_guide:'help', create_activity_rubric:'create', share_assignment:'create', preview_assignment_as_student:'navigate', resume_latest_work:'navigate',
  next_assignment_step:'navigate', read_assignment_directions:'accessibility', show_success_criteria:'navigate', send_teacher_signal:'live', review_teacher_feedback:'navigate',
};
const CMD_CONTEXT = {
  pipeline_score:['pipeline'], pipeline_issues:['pipeline'], pipeline_downloads:['pipeline'], pipeline_verification:['pipeline'], pipeline_tour:['pipeline'], translate_document:['pipeline'],
  open_document_builder:['educatorHub','content'], open_source_input:['sourceSetup'], open_source_url:['sourceSetup'], open_source_generator:['sourceSetup'], open_history:['content'], open_wizard:['educatorHub'], create_lesson:['educatorHub'], open_translate:['educatorHub','content'],
  open_class_session:['educatorHub','liveSession'], open_class_analytics:['educatorHub','behaviorLens'],
  open_live_session_center:['liveSession'], open_live_poll:['liveSession'], open_quick_check:['liveSession'], open_pictionary_host:['liveSession'], open_group_tools:['liveSession'], open_student_signal:['liveSession'], open_roster:['educatorHub'], open_project_settings:['educatorHub'],
  open_notebook:['learningHub'], toggle_socratic:['learningHub'],
  open_video_studio:['educatorHub','videoStudio'], open_cinematic_studio:['educatorHub','videoStudio','cinematicStudio'], open_allo_studio:['educatorHub','alloStudio'],
  open_open_groove:['learningHub','openGroove'], open_timeline_studio:['learningHub','timelineStudio'], open_lingua_practice:['learningHub','content','linguaPractice'], open_test_prep_hub:['learningHub','testPrepHub'], open_research_hub:['learningHub','content','researchHub'], open_lit_lab:['learningHub','litLab'], open_mind_map:['learningHub','content','mindMap'], open_poet_tree:['learningHub','poetTree'],
  set_grade_level:['sourceSetup'], set_source_tone:['sourceSetup'], set_source_length:['sourceSetup'], set_output_language:['sourceSetup'], open_assignment_directions:['content'], check_assignment_progress:['content'], save_my_work:['content'], generate_quiz:['content'], generate_glossary:['content'], generate_simplified:['content','reading'], generate_sentence_frames:['content'], generate_analysis:['content'], open_export_menu:['content'], find_reading:['content','learningHub','reading'],
  read_this_page:['learningHub','symbolStudio','stemLab','content','reading'],
  font_bigger:['reading'], font_smaller:['reading'], toggle_reading_ruler:['reading'], toggle_line_focus:['reading'], toggle_color_overlay:['reading'], zen_off:['reading'],
  toggle_visual_supports:['symbolStudio'], open_voice_settings:['symbolStudio'],
  toggle_focus_mode:['stemLab'], zen_on:['stemLab'],
  stop_reading:['reading'], line_spacing_more:['reading'], line_spacing_less:['reading'], open_submission_inbox:['educatorHub'], generate_outline:['content'], export_pack:['content'],
  launch_flashcards:['content','learningHub'], clear_my_answers:['content'], clear_workspace:['content'], open_persona_chat:['content'],
  pipeline_fix_again:['pipeline'], pipeline_stop:['pipeline'], pipeline_new_doc:['pipeline'],
  edit_assignment_directions:['content'], open_assessment_builder:['educatorHub','content'], open_udl_guide:['educatorHub','content'], create_activity_rubric:['content'], share_assignment:['content'], preview_assignment_as_student:['content'], resume_latest_work:['content'],
  next_assignment_step:['content'], read_assignment_directions:['content','reading'], show_success_criteria:['content'], send_teacher_signal:['liveSession'], review_teacher_feedback:['content'],
};
const GROUP_ORDER = ['navigate','live','create','tools','accessibility','display','pipeline','help','voice'];
const GROUP_LABEL_FALLBACK = { navigate:'Navigate', live:'Live class', create:'Create from this content', tools:'Open a tool', accessibility:'Reading & access', display:'Display & motion', pipeline:'Pipeline results', help:'Help', voice:'Voice' };
const COMMAND_RECENTS_KEY = 'allo_command_recents_v1';
const COMMAND_RECENTS_LIMIT = 5;
const ALLO_COMMAND_PALETTE_OPEN_EVENT = 'alloflow:open-command-palette';
// context → ctx signal (string boolean-key, OR a function for derived ones like reading).
const CTX_FLAG = { liveSession:'liveSessionActive', pipeline:'pipelineOpen', educatorHub:'educatorHubOpen', learningHub:'learningHubOpen', sourceSetup:'sourceSetupOpen', symbolStudio:'symbolStudioOpen', videoStudio:'videoStudioOpen', alloStudio:'alloStudioOpen', cinematicStudio:'cinematicStudioOpen', stemLab:'stemLabOpen', openGroove:'openGrooveOpen', timelineStudio:'timelineStudioOpen', linguaPractice:'linguaPracticeOpen', testPrepHub:'testPrepHubOpen', researchHub:'researchHubOpen', litLab:'litLabOpen', mindMap:'mindMapOpen', poetTree:'poetTreeOpen', behaviorLens:'behaviorLensOpen', content:'contentLoaded', reading:(c)=>!!(c.zenActive||c.focusActive) };
// Priority when several contexts are active (tool > pipeline > hub > content > reading).
const CTX_PRIORITY = ['sourceSetup','liveSession','videoStudio','alloStudio','cinematicStudio','symbolStudio','stemLab','openGroove','timelineStudio','linguaPractice','testPrepHub','researchHub','litLab','mindMap','poetTree','behaviorLens','pipeline','educatorHub','learningHub','content','reading'];
const CONTEXT_LABEL_FALLBACK = { sourceSetup:'Here — Source setup', liveSession:'Here — Live session', pipeline:'Here — Pipeline results', educatorHub:'Here — Educator Hub', learningHub:'Here — Learning Hub', symbolStudio:'Here — Symbol Studio', videoStudio:'Here — Video Studio', alloStudio:'Here — AlloStudio', cinematicStudio:'Here — Cinematic Studio', stemLab:'Here — STEM Lab', openGroove:'Here — Open Groove Studio', timelineStudio:'Here — Timeline Studio', linguaPractice:'Here — Lingua Practice', testPrepHub:'Here — Test Prep Hub', researchHub:'Here — Research Hub', litLab:'Here — Lit Lab', mindMap:'Here — Throughline', poetTree:'Here — Poet Tree', behaviorLens:'Here — Behavior Lens', content:'Here — this content', reading:'Here — Reading mode' };
function _activeContexts(ctx) {
  if (!ctx) return [];
  return CTX_PRIORITY.filter((k) => { const f = CTX_FLAG[k]; return typeof f === 'function' ? f(ctx) : !!ctx[f]; });
}

// ── The palette ──
// Ctrl/Cmd+K (plus Ctrl+Shift+P alias). role=dialog, focus-managed,
// listbox semantics, Escape closes, destructive commands get an inline
// confirm step. z-[12000] sits above every modal so navigation works
// from anywhere.
const AlloCommandPalette = ({ ctx }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [recentCommandIds, setRecentCommandIds] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(COMMAND_RECENTS_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string').slice(0, COMMAND_RECENTS_LIMIT) : [];
    } catch (_) { return []; }
  });
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const prevFocusRef = useRef(null);
  const t = _mkT(ctx && ctx.t);

  const commands = useMemo(() => (ctx ? buildAlloCommands(ctx) : []), [ctx]);
  // Slice 3: rows = a FLAT array of {kind:'header'|'cmd'} so `sel` stays one integer index and
  // arrow-nav keeps working; selection skips headers. Search view = scored + context-tie-broken
  // flat cmds; browse view = a promoted "Here —" block (<=6, context-relevant) + grouped sections.
  const rows = useMemo(() => {
    const out = [];
    if (query) {
      const acts = _activeContexts(ctx);
      const ctxRank = (c) => ((CMD_CONTEXT[c.id] || []).some((x) => acts.indexOf(x) >= 0) ? 0 : 1);
      const scored = commands.map((c) => ({ c, s: scoreCommand(c, query) })).filter((x) => x.s > 0);
      scored.sort((a, b) => (b.s - a.s) || (ctxRank(a.c) - ctxRank(b.c)));
      scored.slice(0, 12).forEach((x) => out.push({ kind: 'cmd', c: x.c }));
      return out;
    }
    const acts = _activeContexts(ctx);
    const promotedIds = new Set();
    if (getCommandAudience(ctx) === 'student') {
      const studentActions = commands.filter((command) => command.roles === 'student').slice(0, 6);
      if (studentActions.length) {
        out.push({ kind: 'header', label: t('student.actions', 'Student actions') });
        studentActions.forEach((command) => { promotedIds.add(command.id); out.push({ kind: 'cmd', c: command }); });
      }
    }
    if (acts.length) {
      const promoted = [];
      for (const c of commands) {
        if (!promotedIds.has(c.id) && (CMD_CONTEXT[c.id] || []).some((x) => acts.indexOf(x) >= 0)) { promoted.push(c); promotedIds.add(c.id); if (promoted.length >= 6) break; }
      }
      if (promoted.length) {
        const top = acts[0];
        out.push({ kind: 'header', label: t('palette.ctx.' + top, CONTEXT_LABEL_FALLBACK[top] || 'Here') });
        promoted.forEach((c) => out.push({ kind: 'cmd', c }));
      }
    }
    const recent = recentCommandIds.map((id) => commands.find((c) => c.id === id)).filter((c) => c && !promotedIds.has(c.id)).slice(0, COMMAND_RECENTS_LIMIT);
    if (recent.length) {
      out.push({ kind: 'header', label: t('palette.group.recent', 'Recent') });
      recent.forEach((c) => { promotedIds.add(c.id); out.push({ kind: 'cmd', c }); });
    }
    // Browse view: show EVERY group (breadth) with a per-group cap, so a newly added command
    // family (e.g. the tool launchers) stays discoverable instead of being squeezed out of the
    // list by a global cap. "Type to search" reveals the rest of any group. MAX_ROWS is a final
    // safety ceiling on the whole no-query list.
    const PER_GROUP = 6, MAX_ROWS = 40;
    let cmdCount = promotedIds.size;
    for (const g of GROUP_ORDER) {
      if (cmdCount >= MAX_ROWS) break;
      const inGroup = commands.filter((c) => (CMD_GROUP[c.id] || 'navigate') === g && !promotedIds.has(c.id));
      const take = inGroup.slice(0, Math.min(PER_GROUP, MAX_ROWS - cmdCount));
      if (!take.length) continue;
      out.push({ kind: 'header', label: t('palette.group.' + g, GROUP_LABEL_FALLBACK[g]) });
      take.forEach((c) => out.push({ kind: 'cmd', c }));
      cmdCount += take.length;
    }
    return out;
  }, [commands, query, ctx, t, recentCommandIds]);
  const selectable = useMemo(() => { const a = []; rows.forEach((r, i) => { if (r.kind === 'cmd') a.push(i); }); return a; }, [rows]);
  const selectedCommand = rows[sel] && rows[sel].kind === 'cmd' ? rows[sel].c : null;
  const selectedCommandId = selectedCommand ? selectedCommand.id : '';
  const paletteStatus = (() => {
    if (confirming && selectedCommand && confirming === selectedCommand.id) return _commandConfirmationText(selectedCommand, ctx, t);
    const count = selectable.length;
    if (!count) return query.trim() ? 'No matching commands.' : 'No commands are available here.';
    const resultText = query.trim()
      ? count + ' matching command' + (count === 1 ? '.' : 's.')
      : count + ' command' + (count === 1 ? ' shown.' : 's shown.');
    return resultText + (selectedCommand ? ' ' + selectedCommand.label + ' selected.' : '');
  })();

  useEffect(() => {
    const rememberCurrentFocus = () => {
      try { prevFocusRef.current = document.activeElement; } catch (_) {}
    };
    const onKey = (e) => {
      const k = (e.key || '').toLowerCase();
      if (((e.ctrlKey || e.metaKey) && !e.shiftKey && k === 'k') || ((e.ctrlKey || e.metaKey) && e.shiftKey && k === 'p')) {
        e.preventDefault();
        setOpen((v) => {
          if (!v) rememberCurrentFocus();
          return !v;
        });
        setQuery(''); setConfirming(null);
      }
    };
    const onOpenRequest = (event) => {
      const requested = event && event.detail ? event.detail.query : '';
      const initialQuery = typeof requested === 'string' ? requested.trim().slice(0, 160) : '';
      setOpen((wasOpen) => {
        if (!wasOpen) rememberCurrentFocus();
        return true;
      });
      setQuery(initialQuery);
      setSel(0);
      setConfirming(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(ALLO_COMMAND_PALETTE_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(ALLO_COMMAND_PALETTE_OPEN_EVENT, onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open && prevFocusRef.current) {
      const previous = prevFocusRef.current;
      prevFocusRef.current = null;
      try { if (previous.isConnected && typeof previous.focus === 'function') previous.focus(); } catch (_) {}
    }
  }, [open]);
  // Keep the modal keyboard-contained even if focus moves away from the
  // combobox. Options use aria-activedescendant, so only the search and close
  // controls participate in Tab order; Arrow keys continue to move selection.
  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const input = inputRef.current;
    if (!dialog || !input) return undefined;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )).filter((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
    const onDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (confirming) {
          setConfirming(null);
          input.focus();
        } else {
          setOpen(false);
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onDocumentFocusIn = (event) => {
      if (!dialog.contains(event.target)) input.focus();
    };
    document.addEventListener('keydown', onDocumentKeyDown, true);
    document.addEventListener('focusin', onDocumentFocusIn);
    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown, true);
      document.removeEventListener('focusin', onDocumentFocusIn);
    };
  }, [open, confirming]);
  // Highlight the first selectable (cmd) row on open or query change — sel skips headers.
  // Deps are [open, query] ONLY: `selectable` is a fresh ref every render (ctx is a new
  // object each parent render), so depending on it would re-fire every render and clobber
  // arrow-key navigation. It reads the current `selectable` at run time, which is what we want.
  useEffect(() => { if (open) setSel(selectable.length ? selectable[0] : 0); }, [open, query]);
  // Re-home sel if the list shrinks under it (e.g. a context change closes rows while open).
  // No-op while sel is a valid cmd row, so it NEVER clobbers arrow nav — it only fires when
  // sel is genuinely orphaned (out of range / on a header after rows changed).
  useEffect(() => {
    if (!open) return;
    if (!selectable.length) { if (sel !== 0) setSel(0); return; }
    if (selectable.indexOf(sel) === -1) setSel(selectable[0]);
  }, [open, selectable, sel]);
  // The combobox keeps DOM focus in the search input, so make its active
  // descendant visible as arrow navigation moves through a long result list.
  useEffect(() => {
    if (!open || !selectedCommandId) return;
    try {
      const option = document.getElementById('allo-cmd-' + selectedCommandId);
      if (option && option.scrollIntoView) option.scrollIntoView({ block: 'nearest' });
    } catch (_) {}
  }, [open, sel, selectedCommandId]);

  const announce = useCallback((msg, type = 'success') => {
    try { if (window.alloAnnounce) window.alloAnnounce(msg); } catch (_) {}
    try { if (ctx && ctx.addToast) ctx.addToast(msg, type); } catch (_) {}
  }, [ctx]);
  const rememberCommand = useCallback((id) => {
    if (!id) return;
    setRecentCommandIds((previous) => {
      const next = [id].concat((Array.isArray(previous) ? previous : []).filter((savedId) => savedId !== id)).slice(0, COMMAND_RECENTS_LIMIT);
      try { sessionStorage.setItem(COMMAND_RECENTS_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  const runCmd = useCallback((cmd) => {
    if (!cmd) return;
    if (cmd.destructive && (!confirming || confirming !== cmd.id)) { setConfirming(cmd.id); return; }
    setConfirming(null);
    const result = executeCommand(ctx, cmd, {}, { confirmed: true, via: 'palette' });
    if (!result || !result.handled || result.ok === false) {
      const failure = (result && result.narration) || t('cmd.failed', 'That command is no longer available here.');
      try { if (ctx && ctx.addToast) ctx.addToast(failure, 'error'); } catch (_) {}
      setOpen(false);
      return;
    }
    rememberCommand(cmd.id);
    setOpen(false);
    if (result.narration) announce(result.narration, result.pending ? 'info' : 'success');
  }, [ctx, confirming, announce, rememberCommand, t]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[12000] flex items-start justify-center pt-[14vh] px-4" role="presentation" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true"></div>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="allo-palette-title" tabIndex={-1} data-help-ignore="true"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
          <h2 id="allo-palette-title" className="sr-only">{t('palette.aria', 'AlloFlow command palette')}</h2>
          <span aria-hidden="true">⚡</span>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => { for (const idx of selectable) if (idx > s) return idx; return selectable.length ? selectable[selectable.length - 1] : s; }); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => { for (let j = selectable.length - 1; j >= 0; j--) if (selectable[j] < s) return selectable[j]; return selectable.length ? selectable[0] : s; }); }
              else if (e.key === 'Enter') { e.preventDefault(); const row = rows[sel]; if (row && row.kind === 'cmd') runCmd(row.c); }
            }}
            placeholder={getCommandAudience(ctx) === 'student' ? (t('student.actions_search') || 'Try “read directions”, “check my progress”, or “save my work”…') : t('palette.placeholder', 'Type a command — “bigger text”, “educator hub”, “read this page”…')}
            aria-label={t('palette.input_aria', 'Search commands')} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="allo-palette-list" aria-describedby="allo-palette-status" aria-activedescendant={selectedCommandId ? ('allo-cmd-' + selectedCommandId) : undefined}
            className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-500" />
          <kbd className="text-[10px] text-slate-500 border border-slate-300 rounded px-1.5 py-0.5">Esc</kbd>
          <button type="button" onClick={() => setOpen(false)} aria-label={t('palette.close', 'Close command palette')}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xl leading-none text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div id="allo-palette-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only">{paletteStatus}</div>
        <ul id="allo-palette-list" role="listbox" aria-label={t('palette.list_aria', 'Matching commands')} className="max-h-[46vh] overflow-y-auto py-1">
          {selectable.length === 0 && (
            <li role="presentation" className="px-4 py-6 text-center text-xs text-slate-600">{t('palette.no_match', 'No matching command. The bot chat (and soon voice) understands free-form requests.')}</li>
          )}
          {rows.map((row, i) => (
            row.kind === 'header' ? (
              <li key={'h-' + i} role="presentation" className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 select-none">{row.label}</li>
            ) : (
              <li key={row.c.id} id={'allo-cmd-' + row.c.id} role="option" aria-selected={i === sel}
                onClick={() => runCmd(row.c)} onMouseEnter={() => setSel(i)}
                className={`min-h-11 w-full cursor-pointer px-4 py-2.5 text-left flex items-center gap-3 ${i === sel ? 'bg-indigo-50' : ''}`}>
                  <span className="text-lg shrink-0" aria-hidden="true">{row.c.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-bold ${i === sel ? 'text-indigo-900' : 'text-slate-800'}`}>{row.c.label}</span>
                    <span className="block text-[11px] text-slate-600 truncate">{confirming === row.c.id ? _commandConfirmationText(row.c, ctx, t) : row.c.hint}</span>
                  </span>
                  {i === sel && <kbd className="text-[10px] text-indigo-600 border border-indigo-300 rounded px-1.5 py-0.5 shrink-0">↵</kbd>}
              </li>
            )
          ))}
        </ul>
        <div className="px-4 py-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center gap-3">
          <span><kbd className="border border-slate-300 rounded px-1">↑↓</kbd> {t('palette.nav', 'navigate')}</span>
          <span><kbd className="border border-slate-300 rounded px-1">↵</kbd> {t('palette.run', 'run')}</span>
          <span className="ml-auto">{t('palette.footer', 'Every action is announced. Ctrl+K toggles.')}</span>
        </div>
      </div>
    </div>
  );
};
