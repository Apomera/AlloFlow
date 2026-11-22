// view_submission_inbox_source.jsx — teacher batch upload + decrypt for offline HTML submissions.
// Phase 2 of the offline-HTML worksheet submission system (May 11 2026).
//
// Workflow:
//   1. Teacher opens this modal from the Roster panel.
//   2. Loads class-key.alloflow (the file downloaded at class setup).
//   3. Selects one or more <nickname>-<doc>-<date>.alloflow.html files
//      students submitted (typically pulled from their class Drive folder).
//   4. Clicks "Decrypt all" — each row's encrypted blob is unwrapped with
//      the loaded private key and the payload appears in the queue.
//   5. Roster cross-check badges known nicknames green, unknown yellow.
//   6. Grade with the class rubric (teacher-invoked AI, anchorable with
//      teacher scores), save to the local gradebook, export CSV, or open the
//      AlloSheet aggregate review.
//
// HISTORY NOTE (2026-08-23): this header once called "Send to gradebook" a
// placeholder awaiting "studentResponses IndexedDB writes". Phase 3 (v2.3,
// May 12 2026) shipped with a DIFFERENT design on purpose: raw multi-student
// responses stay inside the gradebook silo, and only assignment-level
// aggregates cross to AlloSheet (see the privacy boundary block below,
// SI_ALLOSHEET_MIN_SCORE_GROUP). Do NOT "finish" the old plan by writing
// submissions into studentResponses - that store is the student device's OWN
// work file and the boundary exists to keep identified responses out of
// shared stores.
//
// Dependencies: window.AlloModules.SubmissionCrypto.decryptSubmission
// (registered by submission_crypto_module.js).

// ── UI localization (runtime-AI, self-contained; NEVER touches lang/*.js) ──
// English text IS the key; tr() collects display strings and a per-render effect
// batch-translates the missing ones into the teacher's interface language via
// the app global window.callGemini, keyed by currentUiLanguage, cached
// per-device. Student nicknames, document titles, decrypted response text, and
// teacher-authored rubric/anchor text are DATA and are never sent. English
// fallback. (This module is build-generated — edit THIS .jsx, then run
// node _build_view_submission_inbox_module.js.)
var SI_I18N_KEY = 'allo_submissioninbox_ui_i18n_v1';
var LANG_CTX = (typeof window !== 'undefined' && window.AlloLanguageContext) || (typeof window !== 'undefined' && window.React ? window.React.createContext(null) : null);
var STR_REG = {};
var LL_CUR = { lang: 'English', cache: {} };
function llLoad() { try { return JSON.parse(localStorage.getItem(SI_I18N_KEY)) || {}; } catch (e) { return {}; } }
function llStore(v) { try { localStorage.setItem(SI_I18N_KEY, JSON.stringify(v)); } catch (e) {} }
function llInterp(s, params) { if (s == null || !params) return s; Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); }); return s; }
function tr(en, params) { if (en && typeof en === 'string') STR_REG[en] = true; var p = LL_CUR.cache[LL_CUR.lang]; return llInterp((p && p[en] != null) ? p[en] : en, params); }
function llCleanJson(raw) { var s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''); var f = s.indexOf('{'), l = s.lastIndexOf('}'); return f >= 0 && l > f ? s.slice(f, l + 1) : s; }
function llSanitize(obj, wanted) { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null; var out = {}, n = 0; wanted.forEach(function (k) { var v = obj[k]; if (typeof v === 'string') { v = v.slice(0, 400); if (v) { out[k] = v; n++; } } }); return n ? out : null; }
function llPrompt(langName, list) { return ['Translate these user-interface labels for a teacher tool that imports and grades student worksheet submissions into natural, concise ' + langName + ' (buttons, headings, toasts — keep them short and professional).', 'Keep any {tokens}, numbers, and any emoji EXACTLY as written. Do NOT translate the acronyms AI, JSON, or the file extension .alloflow. No commentary.', 'Return ONLY a JSON object mapping each ENGLISH string (used verbatim as the key) to its ' + langName + ' translation.', JSON.stringify(list)].join(String.fromCharCode(10)); }

// ── Word Sounds take-home results (2026-11-07) ───────────────────────────────
// A take-home file saves a results file, or sends the same result through the
// Class Mailbox as a submission-*.json. Both are read by the take-home loader's
// own parser (one reader for the dialog and the inbox), loaded on demand.
async function siTakeHomeLib() {
  if (window.AlloWordSoundsTakeHome) return window.AlloWordSoundsTakeHome;
  if (typeof window.__alloLoadPlugin === 'function') {
    try { await window.__alloLoadPlugin('word_sounds_take_home_loader.js'); } catch (_) {}
  }
  return window.AlloWordSoundsTakeHome || null;
}
async function siTakeHomeResultsReader() {
  if (window.AlloPacketResultsReader && typeof window.AlloPacketResultsReader.read === 'function') return window.AlloPacketResultsReader;
  if (typeof window.__alloLoadPlugin === 'function') {
    try { await window.__alloLoadPlugin('packets_results_reader.js'); } catch (_) {}
  }
  return (window.AlloPacketResultsReader && typeof window.AlloPacketResultsReader.read === 'function') ? window.AlloPacketResultsReader : null;
}
function siSessionToTakeHomeResult(s) {
  var byActivity = {}, activityTitles = {}, summary = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 };
  var items = (s.items || []).map(function (it) {
    var act = it.activity || 'unknown';
    if (!activityTitles[act]) activityTitles[act] = it.activityTitle || act;
    var a = byActivity[act] || (byActivity[act] = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 });
    var done = !!it.attempted;
    var practice = it.practice ? (act === 'letter_tracing' ? 'traced' : 'practice') : null;
    if (practice) { if (done) { summary.practised++; a.practised++; } }
    else {
      summary.items++; a.items++;
      if (done) {
        summary.done++; a.done++;
        if (it.firstTry) { summary.firstTry++; a.firstTry++; }
        else if (it.correct) { summary.afterRetry++; a.afterRetry++; }
        else { summary.missed++; a.missed++; }
      }
    }
    return { activity: act, word: it.word || '', target: it.target || '', responses: Array.isArray(it.responses) ? it.responses : [],
      attempts: Number(it.tries) || 0, firstTry: !!it.firstTry, correct: !!it.correct, done: done, ms: Number(it.timeMs) || 0, practice: practice, flag: it.flag || '' };
  });
  return {
    lessonId: s.packetId || '', revision: s.packetVersion || '', lessonTitle: s.title || s.packetId || '',
    learnerName: s.learner || '', finishedAt: s.finishedLocal || s.startedLocal || s.date || '', sessionId: s.sessionId || '',
    items: items, summary: summary, byActivity: byActivity, activityTitles: activityTitles, integrity: s.integrity || 'absent'
  };
}
function siParseTakeHomeCsvFallback(text, lib) {
  var src = String(text || '').replace(/^\uFEFF/, '');
  if (src.indexOf('alloflow-packet-result/1') < 0) return { ok: false };
  var firstLine = src.split(/\r?\n/)[0] || '';
  var sep = /^sep=(.)/i.test(firstLine) ? firstLine.charAt(4) : (firstLine.split('\t').length > firstLine.split(',').length ? '\t' : firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
  var rows = [], row = [], cell = '', inQ = false;
  for (var i = /^sep=./i.test(firstLine) ? src.indexOf('\n') + 1 : 0; i < src.length; i++) {
    var ch = src[i];
    if (inQ) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\r' || ch === '\n') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); if (row.some(function (c) { return c !== ''; })) rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some(function (c) { return c !== ''; })) rows.push(row); }
  var unguard = function (v) { return String(v == null ? '' : v).replace(/^'(?=[=+\-@\t\r])/, ''); };
  var hdr = -1, idx = {};
  for (var r = 0; r < rows.length && r < 5 && hdr < 0; r++) {
    var names = rows[r].map(function (c) { return unguard(c).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); });
    if (names.indexOf('format') >= 0 && names.indexOf('session_id') >= 0 && names.indexOf('activity') >= 0) {
      names.forEach(function (n, k) { if (n && !(n in idx)) idx[n] = k; });
      hdr = r;
    }
  }
  if (hdr < 0) return { ok: false };
  var get = function (rw, k) { return (k in idx && rw[idx[k]] != null) ? unguard(rw[idx[k]]) : ''; };
  var title = '', integrity = null, items = [], titles = {}, meta = null;
  rows.slice(hdr + 1).forEach(function (rw) {
    var first = unguard(rw[0]).trim();
    if (first.charAt(0) === '#') {
      if (first.toLowerCase() === '#integrity' && rw[1] && rw[2]) integrity = { method: unguard(rw[1]).trim().toLowerCase(), value: unguard(rw[2]).trim().toLowerCase() };
      if (first.toLowerCase() === '#summary') rw.slice(2).forEach(function (c) { var m = /^title=(.*)$/i.exec(unguard(c)); if (m && !title) title = m[1].trim(); });
      return;
    }
    if (get(rw, 'format') !== 'alloflow-packet-result/1') return;
    if (!meta) meta = { sessionId: get(rw, 'session_id'), packetId: get(rw, 'packet_id'), version: get(rw, 'packet_version'), form: get(rw, 'form'), mode: get(rw, 'mode'), learner: get(rw, 'learner'), startedLocal: get(rw, 'started_local'), finishedLocal: get(rw, 'finished_local'), durationS: Number(get(rw, 'duration_s')) || 0 };
    var act = get(rw, 'activity'), actTitle = get(rw, 'activity_title');
    if (act && actTitle && !titles[act]) titles[act] = actTitle;
    var respRaw = get(rw, 'responses'), responses = respRaw ? respRaw.split(' | ') : [], tries = Number(get(rw, 'tries')) || 0;
    var scored = get(rw, 'scored'), isPractice = scored === '0' || scored.toLowerCase() === 'false' || act === 'letter_tracing';
    items.push({ n: Number(get(rw, 'item_n')) || items.length + 1, itemId: get(rw, 'item_id'), activity: act, word: get(rw, 'word'), target: get(rw, 'target'),
      responses: responses, attempts: tries, firstTry: get(rw, 'first_try') === '1' || get(rw, 'first_try').toLowerCase() === 'true',
      correct: get(rw, 'correct') === '1' || get(rw, 'correct').toLowerCase() === 'true', done: tries > 0 || responses.length > 0 || isPractice,
      ms: Number(get(rw, 'time_ms')) || 0, practice: isPractice ? (act === 'letter_tracing' ? 'traced' : 'practice') : null, flag: get(rw, 'flag') });
  });
  if (!meta || !items.length || !lib) return { ok: false };
  var payload = { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: meta.sessionId,
    packet: { id: meta.packetId, version: meta.version, form: meta.form, mode: meta.mode || 'practice' },
    lessonId: meta.packetId, revision: meta.version, lessonTitle: title || meta.packetId, activityTitles: titles,
    learner: meta.learner, learnerName: meta.learner, startedLocal: meta.startedLocal, finishedLocal: meta.finishedLocal,
    finishedAt: meta.finishedLocal || meta.startedLocal || '', durationMs: meta.durationS * 1000, items: items };
  if (integrity) payload.integrity = integrity;
  return lib.parseResult(payload);
}
function siTakeHomeMark(item) { return !item.done ? '–' : item.firstTry ? '✓' : item.correct ? '↻' : '✗'; }
function siTakeHomeResult(result) {
  var h = React.createElement;
  var s = result.summary;
  var cell = { padding: '4px 8px', borderTop: '1px solid #e2e8f0', textAlign: 'left', verticalAlign: 'top' };
  return h('section', { 'data-si-take-home': 'true', 'aria-label': tr('Take-home practice results'), style: { margin: '0 0 12px', padding: 12, border: '1px solid #c7d2fe', borderRadius: 8, background: '#fff' } },
    h('div', { style: { fontWeight: 700, color: '#312e81' } }, tr('{title}: {first} of {total} right on the first try', { title: result.lessonTitle || tr('Take-home practice'), first: s.firstTry, total: s.items })),
    h('div', { style: { fontSize: '0.8rem', color: '#475569', marginTop: 2 } },
      tr('{retry} right after a retry, {missed} missed, {left} not done. The name is what the student typed.', { retry: s.afterRetry, missed: s.missed, left: s.items - s.done })),
    h('table', { style: { width: '100%', marginTop: 8, borderCollapse: 'collapse', fontSize: '0.85rem' } },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col', style: cell }, tr('Activity')),
        h('th', { scope: 'col', style: cell }, tr('First try')),
        h('th', { scope: 'col', style: cell }, tr('Words')))),
      h('tbody', null, Object.keys(result.byActivity).map(function (id) {
        var a = result.byActivity[id];
        var words = result.items.filter(function (item) { return item.activity === id; });
        return h('tr', { key: id },
          h('th', { scope: 'row', style: cell }, result.activityTitles[id] || id),
          h('td', { style: cell }, a.firstTry + ' / ' + a.items),
          h('td', { style: cell }, words.map(function (item) {
            var tries = item.responses.length > 1 ? ' (' + item.responses.join(', ') + ')' : '';
            return item.word + ' ' + siTakeHomeMark(item) + tries;
          }).join('; ')));
      }))),
    h('div', { style: { fontSize: '0.75rem', color: '#475569', marginTop: 6 } },
      tr('✓ right first time, ↻ right after a retry, ✗ missed, – not done. Practice results, not a test score.')));
}

// ── Work evidence (2026-07-27) ───────────────────────────────────────────────
// A submission has always carried far more than its free-text responses:
// `content` is the sanitized set of resources the student actually engaged with,
// `gameCompletions` records finished practice games, and `stats` rolls up XP,
// quizzes and notebook use. All three have ridden in the file since schema v1
// and none of them were ever rendered, so a teacher reviewing mailbox homework
// saw only the typed answers and had no way to tell "did nothing" apart from
// "did the concept sort, the timeline and two games, and typed little".
//
// Everything here is defensive: the payload is a JSON file that arrived from a
// student device, so no shape is assumed and every string is bounded.
// NOTE: `stats.summary` is deliberately NOT rendered. It is an OBJECT of counts
// ({quizzes, adventures, readings, scaffolds}) built by the student Submit
// modal, and it is a strictly poorer version of `content`, which lists the
// actual titles. Stringifying it is how you ship "[object Object]".
function siWorkEvidence(payload, teacherHistory) {
  var p = (payload && typeof payload === 'object') ? payload : {};
  var roleSwaps = siRoleSwapItems(p, teacherHistory);
  var roleSwapIndexes = roleSwaps.map(function (model) { return model.contentIndex; });
  var num = function (v) { return (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.floor(v) : null; };

  var activities = (Array.isArray(p.content) ? p.content : [])
    .filter(function (item) { return item && typeof item === 'object' && typeof item.type === 'string' && item.type; })
    .map(function (item) {
      return {
        type: String(item.type).slice(0, 40),
        title: String(item.title || item.type || 'Untitled').slice(0, 80),
      };
    });

  var rawGames = (p.gameCompletions && typeof p.gameCompletions === 'object' && !Array.isArray(p.gameCompletions))
    ? p.gameCompletions : {};
  var games = Object.keys(rawGames)
    .map(function (gameType) {
      return {
        gameType: String(gameType).slice(0, 40),
        plays: Array.isArray(rawGames[gameType]) ? rawGames[gameType].length : 0,
      };
    })
    .filter(function (entry) { return entry.plays > 0; })
    .sort(function (a, b) { return (b.plays - a.plays) || a.gameType.localeCompare(b.gameType); });

  var stats = (p.stats && typeof p.stats === 'object' && !Array.isArray(p.stats)) ? p.stats : {};
  var notebook = (stats.notebook && typeof stats.notebook === 'object' && !Array.isArray(stats.notebook))
    ? stats.notebook : {};

  // Interview Mode reflections/summaries carry the learner's own words; show them as text.
  // Role Swap records render as structured, scoreable rows (evidence.roleSwaps), not as text.
  var interviews = (Array.isArray(p.content) ? p.content : [])
    .filter(function (item, index) { return item && (item.type === 'persona-reflection' || item.type === 'persona-summary') && roleSwapIndexes.indexOf(index) < 0; })
    .slice(0, 10)
    .map(function (item) {
      var d = item.data;
      var body = typeof d === 'string' ? d : (d && typeof d === 'object' ? [d.overview].concat((Array.isArray(d.keyInsights) ? d.keyInsights : []).map(function (k) { return k && (k.insight || k); })).filter(function (s) { return typeof s === 'string' && s; }).join('\n\n') : '');
      body = String(body || '').replace(/\*\*/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').slice(0, 20000);
      return { type: item.type, title: String(item.title || item.type).slice(0, 120), body: body };
    })
    .filter(function (entry) { return entry.body.trim(); });

  var evidence = {
    activities: activities,
    interviews: interviews,
    roleSwaps: roleSwaps,
    stories: siStudentStoryItems(p),
    reflections: siAdventureReflectionItems(p),
    games: games,
    totalXP: num(stats.totalXP),
    quizzesTaken: num(stats.quizzesTaken),
    notebookEntries: num(notebook.total),
    annotations: siStudentAnnotations(p),
    // Not a verdict, and labelled as such in the UI. The student device counts
    // pastes that landed in a writable answer field; a pasted research citation
    // and a pasted answer are indistinguishable here.
    pastesIntoAnswers: num(stats.pasteEventResponseCount),
  };
  evidence.isEmpty = activities.length === 0 && games.length === 0
    && evidence.annotations.length === 0
    && evidence.totalXP === null && evidence.quizzesTaken === null
    && evidence.notebookEntries === null;
  return evidence;
}

function siStudentAnnotations(payload) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var list = Array.isArray(p.annotations) ? p.annotations : [];
  var DRAW_HEX = {
    red: '#dc2626', blue: '#2563eb', green: '#16a34a',
    yellow: '#ca8a04', black: '#111827'
  };
  return list.slice(0, 200).map(function (a) {
    if (!a || typeof a !== 'object' || Array.isArray(a) || a.pending === true) return null;
    var rawKind = String(a.kind || a.type || '').trim().toLowerCase();
    var isBareHighlight = rawKind === 'highlight' && typeof a.text === 'string'
      && !a.anchorText && !a.quote && !a.note && !a.content && !a.comment;
    var quote = siResponseText(a.quote || a.anchorText || (isBareHighlight ? a.text : '') || '', 600);
    var note = isBareHighlight ? '' : siResponseText(a.note || a.text || a.content || a.comment || a.transcript || '', 2000);
    var base = {
      id: siResponseText(typeof a.id === 'number' ? String(a.id) : (a.id || ''), 80),
      color: siResponseText(a.color || 'yellow', 24) || 'yellow',
      quote: quote,
      note: note,
      blockIdx: Number.isInteger(a.blockIdx) ? a.blockIdx : null,
      createdAt: siResponseText(a.createdAt || '', 60)
    };
    if (rawKind === 'draw' || rawKind === 'drawing' || rawKind === 'ink') {
      var rawPts = Array.isArray(a.points) ? a.points : (Array.isArray(a.strokes) && Array.isArray(a.strokes[0]) ? a.strokes[0] : null);
      var pts = Array.isArray(rawPts)
        ? rawPts.slice(0, 800).map(function (pt) {
            if (!pt || typeof pt !== 'object') return null;
            var px = Number(pt.x), py = Number(pt.y);
            return (Number.isFinite(px) && Number.isFinite(py)) ? { x: Math.round(px * 100) / 100, y: Math.round(py * 100) / 100 } : null;
          }).filter(Boolean)
        : [];
      var rawDataUrl = typeof a.dataUrl === 'string' ? a.dataUrl.trim() : '';
      var safeDataUrl = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(rawDataUrl) && rawDataUrl.length <= 2000000 ? rawDataUrl : '';
      if (pts.length < 2 && !safeDataUrl) return null;
      var col = siResponseText(a.color || 'red', 24) || 'red';
      base.type = 'draw';
      base.color = col;
      base.strokeHex = DRAW_HEX[col.toLowerCase()] || (/^#[0-9a-f]{3,8}$/i.test(col) ? col : '#dc2626');
      base.strokeWidth = Math.max(1, Math.min(16, Number(a.width || a.strokeWidth) || 4));
      if (pts.length >= 2) base.points = pts;
      if (safeDataUrl) base.dataUrl = safeDataUrl;
      return base;
    }
    if (rawKind === 'voice' || rawKind === 'audio') {
      var rawB64Str = typeof a.audioBase64 === 'string'
        ? a.audioBase64
        : ((typeof a.audio === 'string' && !/^data:/i.test(a.audio.trim())) ? a.audio : '');
      var rawB64 = rawB64Str.replace(/\s+/g, '');
      var rawAudioSrc = typeof a.audioSrc === 'string' ? a.audioSrc.trim()
        : ((typeof a.dataUrl === 'string' && /^data:audio\//i.test(a.dataUrl.trim())) ? a.dataUrl.trim()
        : ((typeof a.audio === 'string' && /^data:audio\//i.test(a.audio.trim())) ? a.audio.trim() : ''));
      var rawMime = String(a.mimeType || a.mime || '').trim().toLowerCase();
      var mime = /^audio\/[a-z0-9.+-]+(?:;[a-z0-9.+-]+=[^;,]+)*$/i.test(rawMime) ? rawMime : 'audio/webm';
      var audioSrc = '';
      if (rawB64 && rawB64.length <= 2000000 && /^[A-Za-z0-9+/=]+$/.test(rawB64)) {
        audioSrc = 'data:' + mime + ';base64,' + rawB64;
      } else if (/^data:audio\/[a-z0-9.+-]+(?:;[a-z0-9.+-]+=[^;,]+)*;base64,[A-Za-z0-9+/=]+$/i.test(rawAudioSrc) && rawAudioSrc.length <= 2000000) {
        audioSrc = rawAudioSrc;
      }
      if (!audioSrc && !note) return null;
      base.type = 'voice';
      base.color = 'purple';
      if (audioSrc) base.audioSrc = audioSrc;
      var rawDur = (typeof a.durationSec === 'number' && Number.isFinite(a.durationSec) && a.durationSec >= 0) ? a.durationSec
        : ((typeof a.duration === 'number' && Number.isFinite(a.duration) && a.duration >= 0) ? a.duration : null);
      if (rawDur !== null) base.durationSec = Math.round(rawDur * 100) / 100;
      return base;
    }
    if (!quote && !note) return null;
    base.type = rawKind === 'highlight' ? 'highlight' : 'note';
    return base;
  }).filter(Boolean);
}

function siFnv1aHash(value) {
  var h = 2166136261;
  var text = String(value == null ? '' : value);
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function siResolveVennBranches(branches) {
  var list = Array.isArray(branches) ? branches : [];
  if (list.length === 3) {
    var overlapIdx = list.findIndex(function (b) {
      return /both|overlap|shared|common|similar|middle|center/i.test(String((b && b.title) || ''));
    });
    if (overlapIdx !== -1) {
      var sideIndices = [0, 1, 2].filter(function (i) { return i !== overlapIdx; });
      return {
        setA: list[sideIndices[0]] || {},
        setB: list[sideIndices[1]] || {},
        shared: list[overlapIdx] || {}
      };
    }
  }
  return {
    setA: list[0] || {},
    setB: list[1] || {},
    shared: list[2] || {}
  };
}

function siResolveVennConfig(vennData) {
  var data = vennData && typeof vennData === 'object' ? vennData : null;
  var normalizeZone = function (rawZone, allowThree) {
    var compact = String(rawZone == null ? '' : rawZone).trim().toLowerCase().replace(/[^a-z0-9&+]/g, '');
    if (!compact) return '';
    if (compact === 'seta' || compact === 'a' || compact === 'onlya' || compact === 'circlea') return 'setA';
    if (compact === 'setb' || compact === 'b' || compact === 'onlyb' || compact === 'circleb') return 'setB';
    if (compact === 'setc' || compact === 'c' || compact === 'onlyc' || compact === 'circlec') return 'setC';
    if (compact === 'overlapab' || compact === 'ab' || compact === 'bothab' || compact === 'a&b' || compact === 'a+b' || compact === 'aandb') return 'overlapAB';
    if (compact === 'overlapbc' || compact === 'bc' || compact === 'bothbc' || compact === 'b&c' || compact === 'b+c' || compact === 'bandc') return 'overlapBC';
    if (compact === 'overlapac' || compact === 'ac' || compact === 'bothac' || compact === 'a&c' || compact === 'a+c' || compact === 'aandc' || compact === 'ca') return 'overlapAC';
    if (compact === 'shared' || compact === 'allthree' || compact === 'all3' || compact === 'sharedall' || compact === 'overlapabc' || compact === 'abc' || compact === 'center' || compact === 'middle' || compact === 'common' || compact === 'overlap') return 'shared';
    if (compact === 'both') return allowThree ? 'shared' : 'shared';
    return '';
  };
  var isExplicitThreeTag = function (rawZone) {
    var compact = String(rawZone == null ? '' : rawZone).trim().toLowerCase().replace(/[^a-z0-9&+]/g, '');
    return compact === 'setc' || compact === 'c' || compact === 'onlyc' || compact === 'circlec'
      || compact === 'overlapab' || compact === 'ab' || compact === 'bothab' || compact === 'a&b' || compact === 'a+b' || compact === 'aandb'
      || compact === 'overlapbc' || compact === 'bc' || compact === 'bothbc' || compact === 'b&c' || compact === 'b+c' || compact === 'bandc'
      || compact === 'overlapac' || compact === 'ac' || compact === 'bothac' || compact === 'a&c' || compact === 'a+c' || compact === 'aandc' || compact === 'ca'
      || compact === 'allthree' || compact === 'all3' || compact === 'sharedall' || compact === 'overlapabc' || compact === 'abc';
  };
  if (!data) {
    return {
      isThreeCircle: false,
      items: [],
      zones: [],
      zoneOrder: ['setA', 'setB', 'shared'],
      zoneLabelMap: { setA: 'Set A', setB: 'Set B', shared: 'Shared' },
      normalizeZone: function (z) { return normalizeZone(z, false); }
    };
  }
  var branches = Array.isArray(data.branches) ? data.branches : [];
  var flatItems = Array.isArray(data.vennItems) ? data.vennItems : (Array.isArray(data.items) ? data.items : []);
  var circleCount = Number(data.vennCircles || data.circleCount || data.setsCount);
  var hasFlatThree = flatItems.some(function (it) {
    return it && typeof it === 'object' && isExplicitThreeTag(it.zone || it.set || it.branch || it.category);
  });
  var isThreeCircle = circleCount === 3
    || Boolean(data.setC || data.overlapAB || data.overlapBC || data.overlapAC || data.allThree || data.sharedAll || data.overlapABC || data.ab || data.bc || data.ac)
    || branches.length >= 4
    || hasFlatThree;
  var zoneOrder = isThreeCircle
    ? ['setA', 'setB', 'setC', 'overlapAB', 'overlapBC', 'overlapAC', 'shared']
    : ['setA', 'setB', 'shared'];
  var branchMap = Object.create(null);
  if (isThreeCircle) {
    branchMap.setA = data.setA || null;
    branchMap.setB = data.setB || null;
    branchMap.setC = data.setC || null;
    branchMap.overlapAB = data.overlapAB || data.ab || null;
    branchMap.overlapBC = data.overlapBC || data.bc || null;
    branchMap.overlapAC = data.overlapAC || data.ac || null;
    branchMap.shared = data.allThree || data.sharedAll || data.overlapABC || data.shared || null;
    var usedBranchIdx = {};
    branches.forEach(function (b, bIdx) {
      if (!b || typeof b !== 'object') return;
      var explicit = normalizeZone(b.zone || b.key || b.id, true);
      if (explicit && !branchMap[explicit]) {
        branchMap[explicit] = b;
        usedBranchIdx[bIdx] = true;
        return;
      }
      var title = String(b.title || '');
      var guessed = '';
      if (/all\s*three|all\s*3|shared\s*all|center|middle|all\s*sets/i.test(title)) guessed = 'shared';
      else if (/a\s*(?:&|and|\+|\/)\s*b/i.test(title)) guessed = 'overlapAB';
      else if (/b\s*(?:&|and|\+|\/)\s*c/i.test(title)) guessed = 'overlapBC';
      else if (/(?:a\s*(?:&|and|\+|\/)\s*c|c\s*(?:&|and|\+|\/)\s*a)/i.test(title)) guessed = 'overlapAC';
      else if (/both|overlap|shared|common/i.test(title) && branches.length <= 4) guessed = 'shared';
      if (guessed && !branchMap[guessed]) {
        branchMap[guessed] = b;
        usedBranchIdx[bIdx] = true;
      }
    });
    var unassignedBranches = branches.filter(function (_, bIdx) { return !usedBranchIdx[bIdx]; });
    var cursor = 0;
    zoneOrder.forEach(function (z) {
      if (!branchMap[z] && cursor < unassignedBranches.length) {
        branchMap[z] = unassignedBranches[cursor++] || {};
      }
      if (!branchMap[z]) branchMap[z] = {};
    });
  } else {
    var resolved2 = branches.length ? siResolveVennBranches(branches) : null;
    branchMap.setA = resolved2 ? resolved2.setA : (data.setA || {});
    branchMap.setB = resolved2 ? resolved2.setB : (data.setB || {});
    branchMap.shared = resolved2 ? resolved2.shared : (data.shared || {});
  }
  var defaultLabels = {
    setA: 'Set A',
    setB: 'Set B',
    setC: 'Set C',
    overlapAB: 'A & B',
    overlapBC: 'B & C',
    overlapAC: 'A & C',
    shared: isThreeCircle ? 'All Three' : 'Shared'
  };
  var zoneLabelMap = {};
  zoneOrder.forEach(function (z) {
    var b = branchMap[z];
    zoneLabelMap[z] = (b && b.title) ? String(b.title) : defaultLabels[z];
  });
  var items = [];
  var zones = [];
  zoneOrder.forEach(function (z) {
    var list = branchMap[z] && Array.isArray(branchMap[z].items) ? branchMap[z].items : [];
    list.forEach(function (entry) {
      var txt = (entry && typeof entry === 'object')
        ? String(entry.text || entry.label || entry.content || entry.name || entry.item || '').trim()
        : String(entry == null ? '' : entry).trim();
      if (txt) {
        items.push(txt);
        zones.push(z);
      }
    });
  });
  if (items.length === 0 && flatItems.length > 0) {
    flatItems.forEach(function (entry) {
      var isObj = entry && typeof entry === 'object';
      var txt = isObj
        ? String(entry.text || entry.label || entry.content || entry.name || entry.item || '').trim()
        : String(entry == null ? '' : entry).trim();
      if (!txt) return;
      items.push(txt);
      var z = isObj ? normalizeZone(entry.zone || entry.set || entry.branch || entry.category, isThreeCircle) : '';
      if (z) zones.push(z);
      else zones.push('');
    });
  }
  return {
    isThreeCircle: isThreeCircle,
    items: items,
    zones: zones,
    zoneOrder: zoneOrder,
    zoneLabelMap: zoneLabelMap,
    normalizeZone: function (z) { return normalizeZone(z, isThreeCircle); }
  };
}

function siExtractGlossaryPairs(item) {
  var rawData = item && item.data;
  var list = Array.isArray(rawData)
    ? rawData
    : (rawData && typeof rawData === 'object'
      ? (rawData.terms || rawData.items || rawData.entries || rawData.words || rawData.cards || rawData.glossary || [])
      : []);
  if (!Array.isArray(list)) return [];
  return list.filter(function (gEntry) {
    if (!gEntry || typeof gEntry !== 'object') return false;
    if (gEntry.isSelected === false || gEntry.selected === false) return false;
    var term = String(gEntry.term != null ? gEntry.term : (gEntry.word || gEntry.name || '')).trim();
    var def = String(gEntry.def || gEntry.definition || gEntry.meaning || '').trim();
    return Boolean(term && def);
  });
}

function siParseNumericInput(rawVal) {
  if (typeof rawVal === 'number') {
    return Number.isFinite(rawVal) ? { num: rawVal, inlineUnit: '' } : { num: NaN, inlineUnit: '' };
  }
  var s = String(rawVal == null ? '' : rawVal).replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u2044/g, '/').trim();
  if (!s) return { num: NaN, inlineUnit: '' };
  var stripThousands = function (t) {
    var str = String(t).replace(/\s+/g, '');
    if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(str)) return str.replace(/,/g, '');
    if (/^[+-]?\d+,\d+$/.test(str)) return str.replace(',', '.');
    return str;
  };
  var validTrailingUnit = function (rem) {
    var u = String(rem || '').trim();
    if (!u) return '';
    if (/^[0-9.,/+\-]/.test(u)) return null;
    // Text after the number is its unit, unless it is a second number or a
    // hedge ("3 or 4", "3 to 5", "3 and up") or a letter written straight on
    // ("3x", an algebra term). Those are not one number: left for the teacher.
    if (/\d/.test(u)) return null;
    if (/^(?:or|to|and|through|thru|till|until|between|plus|minus|times)\b/i.test(u)) return null;
    if (/^[xyzn]$/i.test(String(rem || ''))) return null;
    return u.slice(0, 80);
  };
  var mixedMatch = s.match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+))\s+(\d+)\s*\/\s*(\d+)(.*)$/);
  if (mixedMatch) {
    var uMixed = validTrailingUnit(mixedMatch[4]);
    if (uMixed !== null) {
      var wholeNum = Number(stripThousands(mixedMatch[1]));
      var mNumer = Number(mixedMatch[2]);
      var mDenom = Number(mixedMatch[3]);
      if (Number.isFinite(wholeNum) && Number.isFinite(mNumer) && Number.isFinite(mDenom) && mDenom !== 0) {
        var sign = mixedMatch[1].trim().charAt(0) === '-' ? -1 : 1;
        return { num: sign * (Math.abs(wholeNum) + (mNumer / mDenom)), inlineUnit: uMixed };
      }
    }
    return { num: NaN, inlineUnit: '' };
  }
  var fracMatch = s.match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:[.,]\d+)?)\s*\/\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:[.,]\d+)?)(.*)$/);
  if (fracMatch) {
    var uFrac = validTrailingUnit(fracMatch[3]);
    if (uFrac !== null) {
      var numer = Number(stripThousands(fracMatch[1]));
      var denom = Number(stripThousands(fracMatch[2]));
      if (Number.isFinite(numer) && Number.isFinite(denom) && denom !== 0) {
        return { num: numer / denom, inlineUnit: uFrac };
      }
    }
    return { num: NaN, inlineUnit: '' };
  }
  var decMatch = s.match(/^([+-]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?|\.\d+)(?:[eE][+-]?\d+)?)(.*)$/);
  if (decMatch) {
    var uDec = validTrailingUnit(decMatch[2]);
    if (uDec !== null) {
      var val = Number(stripThousands(decMatch[1]));
      if (Number.isFinite(val)) {
        return { num: val, inlineUnit: uDec };
      }
    }
  }
  return { num: NaN, inlineUnit: '' };
}

function siAutoGradesFromKeys(payload, history, useStudentCopy) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var responses = p.responses && typeof p.responses === 'object' && !Array.isArray(p.responses) ? p.responses : {};
  var manifest = siResponseManifestMap(p);
  var quizMap = Object.create(null);
  var resourceMap = Object.create(null);
  var defaultTypeMap = Object.create(null);
  // A pack names an activity's answers by the activity's id, and by its type
  // ("quiz", "math") only when the activity has no id. So an answer saved under
  // a type name can only belong to an activity with no id, and only when there
  // is exactly one such activity of that type. Resolving it to the first quiz
  // in the project scored one quiz's answers against another quiz's key.
  var idlessByType = Object.create(null);
  function registerQuizzes(arr) {
    (Array.isArray(arr) ? arr : []).forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var itemWithheld = item.data && item.data.answerKeysWithheld === true;
      if (itemWithheld) return;
      var idKey = item.id != null ? String(item.id) : null;
      if (idKey === '__proto__' || idKey === 'constructor' || idKey === 'prototype') idKey = null;
      if (item.type === 'quiz' && idKey != null && !quizMap[idKey] && item.data && Array.isArray(item.data.questions)) {
        quizMap[idKey] = item;
      }
      if (idKey != null && !resourceMap[idKey] && item.data != null) {
        resourceMap[idKey] = item;
      }
      var typeKey = item.type ? String(item.type) : '';
      if (idKey == null && typeKey && typeKey !== '__proto__' && typeKey !== 'constructor' && typeKey !== 'prototype' && item.data != null) {
        (idlessByType[typeKey] = idlessByType[typeKey] || []).push(item);
      }
    });
  }
  function settleTypeNamedDefaults() {
    Object.keys(idlessByType).forEach(function (typeKey) {
      if (idlessByType[typeKey].length === 1) defaultTypeMap[typeKey] = idlessByType[typeKey][0];
    });
    var onlyQuiz = defaultTypeMap.quiz;
    if (!quizMap.quiz && onlyQuiz && onlyQuiz.data && Array.isArray(onlyQuiz.data.questions)) quizMap.quiz = onlyQuiz;
  }
  // Authoritative teacher history registers first so untrusted student payload content
  // cannot overwrite quiz answer keys or resource definitions.
  registerQuizzes(history);
  if (useStudentCopy) registerQuizzes(p.content);
  settleTypeNamedDefaults();
  var SI_SHORT_TYPE_IDS = { ac: 'anchor-chart', sf: 'sentence-frames', nt: 'note-taking', quiz: 'quiz', math: 'math' };
  function findTypedResource(resId, expectedType) {
    var direct = resourceMap[resId];
    if (direct && direct.type === expectedType) return direct;
    if (resId === expectedType || SI_SHORT_TYPE_IDS[resId] === expectedType) {
      return defaultTypeMap[expectedType] || null;
    }
    return null;
  }
  var fnv1aHash = siFnv1aHash;
  function seedShuffleOrder(len, seedStr) {
    var order = [];
    for (var i = 0; i < len; i++) order.push(i);
    if (len <= 1) return order;
    var h = 0x811c9dc5;
    for (var ch of String(seedStr || '')) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    for (var j = order.length - 1; j > 0; j--) {
      h = Math.imul(h ^ (h >>> 15), 1 | h);
      h = (h + 0x6D2B79F5) | 0;
      var k = ((h ^ (h >>> 14)) >>> 0) % (j + 1);
      var tmp = order[j];
      order[j] = order[k];
      order[k] = tmp;
    }
    if (order.every(function (v, idx) { return v === idx; })) order.push(order.shift());
    return order;
  }
  function normFillText(val, exact) {
    var s = String(val == null ? '' : val).trim();
    if (exact) return s;
    return s.toLowerCase().replace(/\s+/g, ' ').replace(/^[.,!?;:'"()]+|[.,!?;:'"()]+$/g, '').trim();
  }
  // Resolves an ANSWER KEY value to an option index, in the same order the pack
  // generator uses (doc_pipeline _resolveCorrectIdx): a real number is an index;
  // a string is option text first, then a letter, and only last a digit index.
  // A key of '2' among options 1,2,3,4 therefore means the option "2".
  function resolveListAnswerIdx(list, target) {
    if (!Array.isArray(list) || !list.length) return -1;
    if (typeof target === 'number') return (Number.isInteger(target) && target >= 0 && target < list.length) ? target : -1;
    if (target == null) return -1;
    if (typeof target === 'boolean') {
      var boolText = target ? 'true' : 'false';
      return list.findIndex(function (opt) { return String(opt == null ? '' : opt).trim().toLowerCase() === boolText; });
    }
    var st = String(target).trim();
    if (!st) return -1;
    var exactIdx = list.findIndex(function (opt) { return String(opt == null ? '' : opt).trim() === st; });
    if (exactIdx >= 0) return exactIdx;
    var lowerTarget = st.toLowerCase();
    var lowerIdx = list.findIndex(function (opt) { return String(opt == null ? '' : opt).trim().toLowerCase() === lowerTarget; });
    if (lowerIdx >= 0) return lowerIdx;
    var normTarget = normFillText(st, false);
    if (normTarget) {
      var textMatchIdx = list.findIndex(function (opt) { return normFillText(opt, false) === normTarget; });
      if (textMatchIdx >= 0) return textMatchIdx;
    }
    if (/^[A-Za-z]$/.test(st) && list.length <= 26) {
      var letterIdx = st.toUpperCase().charCodeAt(0) - 65;
      if (letterIdx >= 0 && letterIdx < list.length) return letterIdx;
    }
    if (/^\d+$/.test(st)) {
      var n = Number(st);
      if (n >= 0 && n < list.length) return n;
    }
    return -1;
  }
  function scoreListSelection(rawVal, opts, expectedIdx, partName) {
    if (!Array.isArray(opts) || expectedIdx < 0 || expectedIdx >= opts.length) return null;
    var pickedIdx = -1;
    if (/^\d+$/.test(rawVal)) pickedIdx = Number(rawVal);
    else if (/^[A-Za-z]$/.test(rawVal) && opts.length <= 26) pickedIdx = rawVal.toUpperCase().charCodeAt(0) - 65;
    else {
      var normR = normFillText(rawVal, false);
      pickedIdx = opts.findIndex(function (o) { return normFillText(o, false) === normR; });
    }
    var ok = pickedIdx === expectedIdx;
    return {
      score: ok ? 100 : 0,
      status: ok ? 'correct' : 'incorrect',
      feedback: ok
        ? ('Auto-scored against ' + partName + ' key (correct).')
        : ('Auto-scored against ' + partName + ' key (expected ' + String.fromCharCode(65 + expectedIdx) + ').'),
      origin: 'answer-key'
    };
  }
  function normMathAnswer(val) {
    var s = String(val == null ? '' : val).trim();
    s = s.replace(/^\$+|\$+$/g, '').replace(/^\\\(|\\\)$/g, '').trim();
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
    return s.toLowerCase().replace(/\s+/g, '');
  }
  var out = Object.create(null);
  Object.keys(responses).slice(0, SI_RESPONSE_ENTRY_LIMIT).forEach(function (key) {
    var raw = siResponseText(responses[key], 4000);
    if (!raw) return;
    var bare = String(key).replace(/^allo-response:/, '');

    if (siAssessmentSnapshot(responses[key])) {
      var snapReport = siAssessmentReport(responses[key], bare, history, p.content);
      if (snapReport && snapReport.copyStatus === 'found' && snapReport.possible > 0 && snapReport.needsReview === 0 && typeof snapReport.percent === 'number') {
        out[key] = {
          score: snapReport.percent,
          status: snapReport.percent === 100 ? 'correct' : (snapReport.percent >= 40 ? 'partially-correct' : 'incorrect'),
          feedback: 'Auto-scored assessment snapshot (' + snapReport.points + ' / ' + snapReport.possible + ').',
          origin: 'answer-key'
        };
      }
      return;
    }

    // 1. Concept Sort: <resId>:concept-sort:<origIdx>:category
    var csMatch = bare.match(/^(.+):concept-sort:(\d+):category$/);
    if (csMatch) {
      var csItem = findTypedResource(csMatch[1], 'concept-sort');
      var csIdx = Number(csMatch[2]);
      var csData = csItem && csItem.data && typeof csItem.data === 'object' ? csItem.data : null;
      var csItems = csData && Array.isArray(csData.items) ? csData.items : [];
      var csCats = csData && Array.isArray(csData.categories) ? csData.categories : [];
      var targetItem = csItems[csIdx];
      if (!targetItem || targetItem.categoryId === '__uncategorized') {
        var activeCsItems = csItems.filter(function (ci) { return !ci || ci.categoryId !== '__uncategorized'; });
        targetItem = activeCsItems[csIdx];
      }
      if (!targetItem || targetItem.categoryId == null || targetItem.categoryId === '__uncategorized') return;
      var expectedCatId = String(targetItem.categoryId).trim();
      var catObj = csCats.find(function (c) { return c && String(c.id || '').trim() === expectedCatId; });
      var expectedCatLabel = catObj && catObj.label ? String(catObj.label).trim() : expectedCatId;
      var rawTrim = raw.trim();
      var csOk = rawTrim === expectedCatId || (expectedCatLabel && normFillText(rawTrim, false) === normFillText(expectedCatLabel, false));
      out[key] = {
        score: csOk ? 100 : 0,
        status: csOk ? 'correct' : 'incorrect',
        feedback: csOk
          ? ('Auto-scored against concept sort key (' + expectedCatLabel + ').')
          : ('Auto-scored against concept sort key (expected ' + expectedCatLabel + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 1b. Interactive Cloze: <resId>:cloze:<blankIdx>:cloze-blank
    var clozeMatch = bare.match(/^(.+):cloze:(\d+):cloze-blank$/);
    if (clozeMatch) {
      var clozeResId = clozeMatch[1];
      var clozeIdx = Number(clozeMatch[2]);
      var simpItem = findTypedResource(clozeResId, 'simplified');
      if (!simpItem && (clozeResId === 'simplified' || clozeResId === 'adapted')) simpItem = defaultTypeMap['simplified'] || null;
      var clozeUnitOf = function (it) {
        var u = it && (it.unitId || (it.config && it.config.unitId));
        return u && u !== 'all' && u !== 'uncategorized' ? String(u) : null;
      };
      var clozeFamilyOf = function (it) {
        var f = it && (it.sourceFamilyId || (it.config && it.config.sourceFamilyId));
        return f ? String(f) : null;
      };
      var simpUnit = clozeUnitOf(simpItem);
      var simpFamily = clozeFamilyOf(simpItem);
      var glossaryCands = [];
      Object.keys(resourceMap).forEach(function (rid) {
        var candG = resourceMap[rid];
        if (candG && candG.type === 'glossary' && Array.isArray(candG.data) && candG.data.length) glossaryCands.push(candG);
      });
      var glossItem = null;
      if (glossaryCands.length && (simpUnit || simpFamily)) {
        glossItem = (simpFamily && (
          glossaryCands.find(function (g) { return clozeFamilyOf(g) === simpFamily && (!simpUnit || clozeUnitOf(g) === simpUnit); })
          || glossaryCands.find(function (g) { return clozeFamilyOf(g) === simpFamily; })
        )) || (simpUnit && glossaryCands.find(function (g) { return clozeUnitOf(g) === simpUnit; })) || null;
        if (!glossItem && !glossaryCands.some(function (g) { return !!(clozeUnitOf(g) || clozeFamilyOf(g)); })) {
          glossItem = defaultTypeMap['glossary'] || glossaryCands[0] || null;
        }
      } else {
        glossItem = defaultTypeMap['glossary'] || glossaryCands[0] || null;
      }
      if (!simpItem || typeof simpItem.data !== 'string' || !glossItem || !Array.isArray(glossItem.data) || !glossItem.data.length) return;
      var computeClozeAnswers = function (passageRaw, simpTitle, simpLang, glossaryList, maxPerTerm) {
        var text = String(passageRaw || '');
        text = text.replace(/^\s*#{1,6}[ \t]+(?:Your Document References|Research Review|Source Excerpts)\b[\s\S]*$/mi, '');
        var firstH = text.match(/^\s*#{1,3}[ \t]+([^\n]+)(?:\r?\n|$)/);
        if (firstH && simpTitle) {
          var normTitle = function (v) { return String(v || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim(); };
          var hNorm = normTitle(firstH[1]), sNorm = normTitle(simpTitle);
          if (hNorm && sNorm && (hNorm === sNorm || sNorm.indexOf(hNorm) >= 0 || hNorm.indexOf(sNorm) >= 0)) {
            text = text.slice(firstH[0].length);
          }
        }
        var splitIdx = text.search(/\r?\n---\s*ENGLISH TRANSLATION\s*---\r?\n/i);
        if (splitIdx !== -1) text = text.slice(0, splitIdx);
        text = text.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
        text = text.replace(/\[\[CHART:\s*\{[\s\S]*?\}\s*\]\]/gi, '');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
        text = text.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '$1').replace(/\*(\S(?:.*?\S)?)\*/g, '$1');
        var termMap = Object.create(null);
        glossaryList.forEach(function (gEntry) {
          if (!gEntry || gEntry.isSelected === false) return;
          if (gEntry.term) termMap[String(gEntry.term).toLowerCase()] = gEntry;
          if (simpLang && simpLang !== 'English' && gEntry.translations && gEntry.translations[simpLang]) {
            var trStr = String(gEntry.translations[simpLang]);
            var possible = (trStr.indexOf(':') >= 0 ? trStr.split(':')[0] : trStr).trim();
            if (possible.length > 1) termMap[possible.toLowerCase()] = gEntry;
          }
        });
        var sortedTerms = Object.keys(termMap).sort(function (a, b) { return b.length - a.length; });
        if (!sortedTerms.length) return [];
        var escRe = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
        var noBreakRe = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0e7f]/;
        var boundaried = [], substringy = [];
        sortedTerms.forEach(function (term) { (noBreakRe.test(term) ? substringy : boundaried).push(escRe(term)); });
        var pattern;
        try {
          var branches = [];
          if (boundaried.length) branches.push('(?<![\\p{L}\\p{M}\\p{N}])(?:' + boundaried.join('|') + ')(?![\\p{L}\\p{M}\\p{N}])');
          if (substringy.length) branches.push('(?:' + substringy.join('|') + ')');
          pattern = new RegExp('(' + branches.join('|') + ')', 'giu');
        } catch (reErr) {
          pattern = new RegExp('\\b(' + sortedTerms.map(escRe).join('|') + ')\\b', 'gi');
        }
        var termCounts = Object.create(null);
        var built = [];
        String(text).split(/(<[^>]*>)/).forEach(function (seg) {
          if (!seg || seg.charAt(0) === '<') return;
          seg.replace(pattern, function (full, matched) {
            var entry = termMap[String(matched).toLowerCase()] || null;
            var countKey = (entry && entry.term) ? String(entry.term).toLowerCase() : String(matched).toLowerCase();
            var seenCount = termCounts[countKey] || 0;
            if (maxPerTerm > 0 && seenCount >= maxPerTerm) return full;
            termCounts[countKey] = seenCount + 1;
            built.push({ text: matched, term: (entry && entry.term) ? String(entry.term) : matched });
            return full;
          });
        });
        return built;
      };
      var simpLang = (simpItem.language || (simpItem.config && simpItem.config.language) || p.language || 'English');
      var clozeAnswersAll = computeClozeAnswers(simpItem.data, simpItem.title, simpLang, glossItem.data, 0);
      var observedMax = -1, observedCount = 0;
      var seenClozeKeys = Object.create(null);
      Object.keys(responses).concat(Object.keys(manifest)).forEach(function (k) {
        if (seenClozeKeys[k]) return;
        seenClozeKeys[k] = true;
        var km = String(k).replace(/^allo-response:/, '').match(/^(.+):cloze:(\d+):cloze-blank$/);
        if (km && km[1] === clozeResId) {
          observedCount++;
          var kn = Number(km[2]);
          if (kn > observedMax) observedMax = kn;
        }
      });
      var clozeAnswers = clozeAnswersAll;
      if (observedMax >= 0 && clozeAnswersAll.length > observedMax + 1) {
        var clozeAnswersOne = computeClozeAnswers(simpItem.data, simpItem.title, simpLang, glossItem.data, 1);
        if (clozeAnswersOne.length >= observedMax + 1 && clozeAnswersOne.length < clozeAnswersAll.length && (clozeAnswersOne.length === observedCount || clozeAnswersOne.length === observedMax + 1)) {
          clozeAnswers = clozeAnswersOne;
        }
      }
      var expectedCloze = clozeAnswers[clozeIdx];
      if (!expectedCloze || !expectedCloze.text) return;
      var stuCloze = normFillText(raw, false);
      var clozeOk = stuCloze === normFillText(expectedCloze.text, false)
        || (expectedCloze.term && stuCloze === normFillText(expectedCloze.term, false));
      out[key] = {
        score: clozeOk ? 100 : 0,
        status: clozeOk ? 'correct' : 'incorrect',
        feedback: clozeOk
          ? ('Auto-scored against cloze key (' + expectedCloze.text + ').')
          : ('Auto-scored against cloze key (expected ' + expectedCloze.text + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 2. Venn placement: <resId>:venn:<itemIndex>:placement (supports both 'venn' and canonical 'outline' Venn Diagram)
    var vennMatch = bare.match(/^(.+):venn:(\d+):placement$/);
    if (vennMatch) {
      var vennResId = vennMatch[1];
      var vennItem = resourceMap[vennResId];
      var isVennResource = function (it) {
        return it && ((it.type === 'venn' && it.data) || (it.type === 'outline' && it.data && it.data.structureType === 'Venn Diagram'));
      };
      if (!isVennResource(vennItem)) {
        if (vennResId === 'venn' || vennResId === 'outline') {
          var idlessVenns = (idlessByType['venn'] || []).concat(idlessByType['outline'] || []).filter(isVennResource);
          vennItem = idlessVenns.length === 1 ? idlessVenns[0] : null;
        } else {
          vennItem = null;
        }
      }
      var vennIdx = Number(vennMatch[2]);
      var vennData = vennItem && vennItem.data && typeof vennItem.data === 'object' ? vennItem.data : null;
      if (!vennData) return;
      var vCfg = siResolveVennConfig(vennData);
      var expectedZone = vCfg.zones[vennIdx];
      if (!expectedZone) return;
      var zoneLabelMap = vCfg.zoneLabelMap;
      var rawZone = raw.trim();
      var normalizedSubmittedZone = vCfg.normalizeZone(rawZone);
      var vennOk = rawZone === expectedZone
        || (normalizedSubmittedZone && normalizedSubmittedZone === expectedZone)
        || normFillText(rawZone, false) === normFillText(zoneLabelMap[expectedZone] || expectedZone, false);
      out[key] = {
        score: vennOk ? 100 : 0,
        status: vennOk ? 'correct' : 'incorrect',
        feedback: vennOk
          ? ('Auto-scored against Venn key (' + (zoneLabelMap[expectedZone] || expectedZone) + ').')
          : ('Auto-scored against Venn key (expected ' + (zoneLabelMap[expectedZone] || expectedZone) + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 2b. Glossary matching worksheet: glossary-worksheet:<sid>:match:<i>
    var gwMatch = bare.match(/^glossary-worksheet:(.+):match:(\d+)$/);
    if (gwMatch) {
      var gwSid = gwMatch[1];
      var gwIdx = Number(gwMatch[2]);
      var gwItem = null;
      var gwIds = Object.keys(resourceMap);
      for (var gwi = 0; gwi < gwIds.length; gwi++) {
        var candGw = resourceMap[gwIds[gwi]];
        if (candGw && candGw.type === 'glossary' && siExtractGlossaryPairs(candGw).length > 0) {
          var candSid = String(candGw.id || 'glossary').replace(/[^A-Za-z0-9_-]+/g, '-');
          if (candSid === gwSid) { gwItem = candGw; break; }
        }
      }
      if (!gwItem && gwSid === 'glossary' && defaultTypeMap['glossary'] && siExtractGlossaryPairs(defaultTypeMap['glossary']).length > 0) {
        gwItem = defaultTypeMap['glossary'];
      }
      var gwPairs = gwItem ? siExtractGlossaryPairs(gwItem) : [];
      if (!gwPairs.length || gwIdx < 0 || gwIdx >= gwPairs.length) return;
      var gwSeedStr = (gwItem.glossaryWorksheetSeed != null ? String(gwItem.glossaryWorksheetSeed) : ((gwItem.id || '') + '|' + gwPairs.map(function (gEntry) { return gEntry.term != null ? gEntry.term : (gEntry.word || gEntry.name || ''); }).join('|')));
      var gwH = 0x811c9dc5;
      for (var gwCh of gwSeedStr) {
        gwH ^= gwCh.codePointAt(0);
        gwH = Math.imul(gwH, 0x01000193) >>> 0;
      }
      var gwRandom = function () {
        gwH = (gwH + 0x6D2B79F5) | 0;
        var x = Math.imul(gwH ^ (gwH >>> 15), 1 | gwH);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
      var gwOrder = gwPairs.map(function (_, i) { return i; });
      for (var oi = gwOrder.length - 1; oi > 0; oi--) {
        var oj = Math.floor(gwRandom() * (oi + 1));
        var otmp = gwOrder[oi]; gwOrder[oi] = gwOrder[oj]; gwOrder[oj] = otmp;
      }
      if (gwOrder.length > 1 && gwOrder.every(function (v, i) { return v === i; })) gwOrder.push(gwOrder.shift());
      var letterIndex = gwOrder.indexOf(gwIdx);
      if (letterIndex < 0) return;
      var expectedLetterGw = '';
      var ln = letterIndex + 1;
      while (ln > 0) {
        expectedLetterGw = String.fromCharCode(65 + (ln - 1) % 26) + expectedLetterGw;
        ln = Math.floor((ln - 1) / 26);
      }
      var stuLetter = raw.trim().toUpperCase().replace(/\.$/, '');
      var gwOk = stuLetter === expectedLetterGw;
      out[key] = {
        score: gwOk ? 100 : 0,
        status: gwOk ? 'correct' : 'incorrect',
        feedback: gwOk
          ? ('Auto-scored against glossary matching key (' + expectedLetterGw + ').')
          : ('Auto-scored against glossary matching key (expected ' + expectedLetterGw + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 3b. Timeline strip date: <resId>:timeline:<origIdx>:date OR <resId>:timeline-date:<hash>(:free-response)
    var tlDateMatch = bare.match(/^(.+):timeline:(\d+):date$/);
    var tlDateHashMatch = !tlDateMatch ? bare.match(/^(.+):timeline-date:([a-z0-9]+)(?::free-response)?$/) : null;
    if (tlDateMatch || tlDateHashMatch) {
      var tldItem = findTypedResource((tlDateMatch || tlDateHashMatch)[1], 'timeline');
      var tldRawItems = !tldItem ? [] : (Array.isArray(tldItem.data) ? tldItem.data : (tldItem.data && Array.isArray(tldItem.data.items) ? tldItem.data.items : (tldItem.data && Array.isArray(tldItem.data.events) ? tldItem.data.events : [])));
      var tldEntry = null;
      if (tlDateMatch) {
        tldEntry = tldRawItems[Number(tlDateMatch[2])];
      } else if (tldItem) {
        for (var tldi = 0; tldi < tldRawItems.length; tldi++) {
          var tldCand = tldRawItems[tldi];
          var tldHash = siFnv1aHash((tldItem.id || 'timeline') + ':' + tldi + ':' + String((tldCand && (tldCand.event || tldCand.title || tldCand.description)) || '')).toString(36);
          if (tldHash === tlDateHashMatch[2]) { tldEntry = tldCand; break; }
        }
      }
      var rawExpectedDate = tldEntry ? (tldEntry.date ?? tldEntry.time ?? tldEntry.year ?? tldEntry.period) : null;
      var expectedDate = rawExpectedDate != null ? String(rawExpectedDate).trim() : '';
      if (!expectedDate) return;
      var dateOk = normFillText(raw, false) === normFillText(expectedDate, false);
      out[key] = {
        score: dateOk ? 100 : 0,
        status: dateOk ? 'correct' : 'incorrect',
        feedback: dateOk
          ? ('Auto-scored against timeline date key (' + expectedDate + ').')
          : ('Auto-scored against timeline date key (expected ' + expectedDate + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 3. Timeline order: <resId>:timeline-order
    var tlMatch = bare.match(/^(.+):timeline-order$/);
    if (tlMatch) {
      var tlItem = findTypedResource(tlMatch[1], 'timeline');
      var tlRawItems = !tlItem ? [] : (Array.isArray(tlItem.data) ? tlItem.data : (tlItem.data && Array.isArray(tlItem.data.items) ? tlItem.data.items : (tlItem.data && Array.isArray(tlItem.data.events) ? tlItem.data.events : [])));
      if (!Array.isArray(tlRawItems) || tlRawItems.length < 2) return;
      var canonicalIds = tlRawItems.map(function (te, originalIndex) {
        return fnv1aHash((tlItem.id || 'timeline') + ':' + originalIndex + ':' + String((te && (te.event || te.title || te.description)) || '')).toString(36);
      });
      var submittedIds = null;
      if (/^\s*\[/.test(raw)) { try { submittedIds = JSON.parse(raw); } catch (e) { submittedIds = null; } }
      if (!Array.isArray(submittedIds) || !submittedIds.length) return;
      var exactPositions = 0;
      for (var ti = 0; ti < canonicalIds.length; ti++) {
        if (submittedIds[ti] === canonicalIds[ti]) exactPositions++;
      }
      var tlScore = Math.round((exactPositions / canonicalIds.length) * 100);
      var tlStatus = exactPositions === canonicalIds.length ? 'correct' : (exactPositions > 0 ? 'partially-correct' : 'incorrect');
      out[key] = {
        score: tlScore,
        status: tlStatus,
        feedback: 'Auto-scored against timeline sequence (' + exactPositions + ' of ' + canonicalIds.length + ' positions exact).',
        origin: 'answer-key'
      };
      return;
    }

    // 4. Verified Math concise answer: <resId>:math:<i>:answer
    var mathMatch = bare.match(/^(.+):math:(\d+):answer$/);
    if (mathMatch) {
      var mathItem = findTypedResource(mathMatch[1], 'math');
      var mIdx = Number(mathMatch[2]);
      var mData = mathItem && mathItem.data && typeof mathItem.data === 'object' ? mathItem.data : null;
      var probs = mData ? (Array.isArray(mData.problems) ? mData.problems : [mData]) : [];
      var prob = probs[mIdx];
      if (!prob || typeof prob !== 'object') return;
      if (prob._verification && prob._verification.reviewRequired === true && !prob._verification.teacherReviewed && prob._verification.verified !== true) return;
      var rawKeyAns = prob.verifiedAnswer != null ? prob.verifiedAnswer : (prob.finalAnswer != null ? prob.finalAnswer : prob.answer);
      if (rawKeyAns == null) return;
      var keyAnsStr = String(rawKeyAns).trim();
      if (!keyAnsStr || keyAnsStr.length > 80 || /\n/.test(keyAnsStr)) return;
      var normStuMath = normMathAnswer(raw);
      var normKeyMath = normMathAnswer(keyAnsStr);
      if (!normKeyMath) return;
      var mathNumStu = Number(normStuMath);
      var mathNumKey = Number(normKeyMath);
      var mathOk = normStuMath === normKeyMath || (normStuMath !== '' && Number.isFinite(mathNumStu) && Number.isFinite(mathNumKey) && Math.abs(mathNumStu - mathNumKey) <= 1e-6);
      out[key] = {
        score: mathOk ? 100 : 0,
        status: mathOk ? 'correct' : 'incorrect',
        feedback: mathOk
          ? ('Auto-scored against math answer key (' + keyAnsStr + ').')
          : ('Auto-scored against math answer key (expected ' + keyAnsStr + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 4b. Guided-notes blank: <resId>:note:blank:<i>
    var gnBlankMatch = bare.match(/^(.+):note:blank:(\d+)$/);
    if (gnBlankMatch) {
      var gnItem = findTypedResource(gnBlankMatch[1], 'note-taking');
      var gnBlanks = gnItem && gnItem.data && Array.isArray(gnItem.data.blanks) ? gnItem.data.blanks : null;
      var gnBlank = gnBlanks ? gnBlanks[Number(gnBlankMatch[2])] : null;
      var gnExpected = gnBlank ? String(gnBlank.answer || gnBlank.expected || '').trim() : '';
      if (!gnExpected) return;
      var gnOk = normFillText(raw, false) === normFillText(gnExpected, false);
      out[key] = {
        score: gnOk ? 100 : 0,
        status: gnOk ? 'correct' : 'incorrect',
        feedback: gnOk
          ? ('Auto-scored against guided-notes key (' + gnExpected + ').')
          : ('Auto-scored against guided-notes key (expected ' + gnExpected + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 4c. Interactive Anchor Chart blank: <resId>:ac:<secId>:<bIdx>(:free-response)
    var acBlankMatch = bare.match(/^(.+):ac:([^:]+):(\d+)(?::free-response)?$/);
    if (acBlankMatch) {
      var acItem = findTypedResource(acBlankMatch[1], 'anchor-chart');
      var acSections = acItem && acItem.data && Array.isArray(acItem.data.sections) ? acItem.data.sections : [];
      var acSec = acSections.find(function (s) { return s && String(s.id) === acBlankMatch[2]; })
        || (/^\d+$/.test(acBlankMatch[2]) ? acSections[Number(acBlankMatch[2])] : null);
      if (!acSec || typeof acSec !== 'object') return;
      var acBIdx = Number(acBlankMatch[3]);
      var acBullets = Array.isArray(acSec.bullets) ? acSec.bullets : (Array.isArray(acSec.points) ? acSec.points : []);
      var acKeyRaw = Array.isArray(acSec.answerKey)
        ? acSec.answerKey[acBIdx]
        : (typeof acSec.answerKey === 'string' && acBullets.length <= 1 ? acSec.answerKey : null);
      var acBulletRaw = acBullets[acBIdx];
      var acBulletTxt = acBulletRaw && typeof acBulletRaw === 'object'
        ? (acBulletRaw.answer || acBulletRaw.expected || acBulletRaw.text || acBulletRaw.label || '')
        : (acBulletRaw || '');
      var acExpected = String(acKeyRaw != null && String(acKeyRaw).trim() ? acKeyRaw : acBulletTxt).trim();
      if (!acExpected || acExpected.length > 160 || /[\r\n]/.test(acExpected)) return;
      var acOk = normFillText(raw, false) === normFillText(acExpected, false);
      out[key] = {
        score: acOk ? 100 : 0,
        status: acOk ? 'correct' : 'incorrect',
        feedback: acOk
          ? ('Auto-scored against anchor chart key (' + acExpected + ').')
          : ('Auto-scored against anchor chart key (expected ' + acExpected + ').'),
        origin: 'answer-key'
      };
      return;
    }

    // 5. Quiz controls: <quizId>:q<idx>:<part>(:subIdx)
    var m = bare.match(/^(.+):q(\d+):(mcq|multi|fill|number|unit|match|order|answer|evidence|wrong-pair|partner|sequence-verdict|sequence-item|sequence-order|sequence-principle)(?::(\d+))?$/);
    if (!m) return;
    var quizId = m[1];
    var qIdx = Number(m[2]);
    var part = m[3];
    var subIdx = m[4] != null ? Number(m[4]) : null;
    var quiz = quizMap[quizId] || (quizId === 'quiz' ? defaultTypeMap.quiz : null);
    var q = quiz && quiz.data && Array.isArray(quiz.data.questions) ? quiz.data.questions[qIdx] : null;
    if (!q || typeof q !== 'object') return;
    if (part === 'mcq') {
      // Same option list and key order as the pack generator, so the inbox agrees with
      // the student's own "Check my answers" and with the printed teacher key.
      var mcqIsTf = /^(?:true[-_]?false|truefalse|tf)$/i.test(String(q.type || '').trim());
      var opts = Array.isArray(q.options) && q.options.length ? q.options : (mcqIsTf ? ['True', 'False'] : []);
      var resolveMcqKey = function (cand) {
        if (cand == null) return -1;
        var keyIdx = resolveListAnswerIdx(opts, cand);
        if (keyIdx < 0 && typeof cand === 'boolean' && mcqIsTf && opts.length === 2) return cand ? 0 : 1;
        return keyIdx;
      };
      var correctIdx = resolveMcqKey(q.correctIndex);
      if (correctIdx < 0) correctIdx = resolveMcqKey(q.correct);
      if (correctIdx < 0) correctIdx = resolveMcqKey(q.correctAnswer);
      if (correctIdx < 0) correctIdx = resolveMcqKey(q.answer);
      if (correctIdx < 0) correctIdx = resolveMcqKey(q.correctOption);
      if (correctIdx < 0) correctIdx = resolveMcqKey(q.answerIndex);
      var mcqGrade = scoreListSelection(raw, opts, correctIdx, 'quiz');
      if (mcqGrade) out[key] = mcqGrade;
      return;
    }
    if (part === 'answer' || part === 'evidence') {
      var aeOpts = part === 'answer'
        ? (Array.isArray(q.answerOptions) ? q.answerOptions : [])
        : (Array.isArray(q.evidenceOptions) ? q.evidenceOptions : []);
      var aeTarget = part === 'answer'
        ? (q.correctAnswerIndex != null ? q.correctAnswerIndex
          : (q.answerIndex != null ? q.answerIndex
          : (q.correctAnswer != null ? q.correctAnswer : q.expectedAnswer)))
        : (q.correctEvidenceIndex != null ? q.correctEvidenceIndex
          : (q.evidenceIndex != null ? q.evidenceIndex
          : (q.correctEvidence != null ? q.correctEvidence : q.expectedEvidence)));
      var aeIdx = resolveListAnswerIdx(aeOpts, aeTarget);
      var aeGrade = scoreListSelection(raw, aeOpts, aeIdx, 'answer-evidence ' + part);
      if (aeGrade) out[key] = aeGrade;
      return;
    }
    if (part === 'multi') {
      var optsM = Array.isArray(q.options) ? q.options : [];
      var rawCorr = (Array.isArray(q.correctAnswers) && q.correctAnswers.length)
        ? q.correctAnswers
        : (Array.isArray(q.correctIndices) ? q.correctIndices : []);
      if (!rawCorr.length) return;
      var toOptIdx = function (entry) {
        if (Number.isInteger(entry)) return (entry >= 0 && entry < optsM.length) ? entry : -1;
        var st = String(entry == null ? '' : entry).trim();
        if (/^\d+$/.test(st)) {
          var numIdx = Number(st);
          return (numIdx >= 0 && numIdx < optsM.length) ? numIdx : -1;
        }
        var normSt = normFillText(st, false);
        var textIdx = normSt ? optsM.findIndex(function (o) { return normFillText(o, false) === normSt; }) : -1;
        if (textIdx >= 0) return textIdx;
        if (/^[A-Za-z]$/.test(st) && optsM.length <= 26) {
          var letterIdx = st.toUpperCase().charCodeAt(0) - 65;
          return (letterIdx >= 0 && letterIdx < optsM.length) ? letterIdx : -1;
        }
        return -1;
      };
      // The key is option text (or a real index); the student's saved value is always an
      // index. Resolve each with its own rule: toOptIdx read a key of '2' as index 2.
      var expectedSet = Array.from(new Set(rawCorr.map(function (entry) { return resolveListAnswerIdx(optsM, entry); }).filter(function (n) { return n >= 0 && n < optsM.length; })));
      if (!expectedSet.length) return;
      var parsed = null;
      if (/^\s*\[/.test(raw)) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }
      var pickedArr = Array.isArray(parsed) ? parsed : raw.split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var pickedSet = Array.from(new Set(pickedArr.map(toOptIdx).filter(function (n) { return n >= 0; })));
      var allSelectedCorrect = pickedSet.length > 0 && pickedSet.every(function (idx) { return expectedSet.indexOf(idx) >= 0; });
      var exactMulti = allSelectedCorrect && pickedSet.length === expectedSet.length;
      var scoreM = exactMulti ? 100 : (allSelectedCorrect ? 50 : 0);
      out[key] = {
        score: scoreM,
        status: exactMulti ? 'correct' : (allSelectedCorrect ? 'partially-correct' : 'incorrect'),
        feedback: exactMulti ? 'Auto-scored against quiz key (all correct selections matched).' : (allSelectedCorrect ? 'Auto-scored against quiz key (partially correct).' : 'Auto-scored against quiz key (selection mismatch).'),
        origin: 'answer-key'
      };
      return;
    }
    if (part === 'fill') {
      var policy = q.fillBlankPolicy || (q.spellingPolicy === 'exact' ? 'exact' : 'normalized');
      if (policy === 'review-variants') return;
      var accepted = [q.expectedFill]
        .concat(Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])
        .concat(Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : [])
        .filter(function (v) { return typeof v === 'string' && v.trim(); });
      if (!accepted.length) return;
      var isExact = policy === 'exact';
      var stuFill = normFillText(raw, isExact);
      var fillOk = accepted.some(function (ans) { return normFillText(ans, isExact) === stuFill; });
      out[key] = {
        score: fillOk ? 100 : 0,
        status: fillOk ? 'correct' : 'incorrect',
        feedback: fillOk ? 'Auto-scored against quiz key (correct).' : ('Auto-scored against quiz key (expected ' + accepted[0].trim() + ').'),
        origin: 'answer-key'
      };
      return;
    }
    if (part === 'unit') {
      var unitList = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).filter(function (u) { return typeof u === 'string' && u.trim(); });
      if (!unitList.length) return;
      var stuUnit = normFillText(raw, false);
      var unitOk = unitList.some(function (u) { return normFillText(u, false) === stuUnit; });
      out[key] = {
        score: unitOk ? 100 : 0,
        status: unitOk ? 'correct' : 'incorrect',
        feedback: unitOk ? 'Auto-scored against unit key (correct).' : ('Auto-scored against unit key (expected ' + unitList[0].trim() + ').'),
        origin: 'answer-key'
      };
      return;
    }
    if (part === 'number') {
      if (q.correctValue == null || Number.isNaN(Number(q.correctValue))) return;
      var parsedNum = siParseNumericInput(raw);
      var numAns = parsedNum.num;
      if (Number.isNaN(numAns)) return;
      var targetNum = Number(q.correctValue);
      var tol = Math.abs(Number(q.tolerance) || 0);
      var numOk = Math.abs(numAns - targetNum) <= (tol > 0 ? tol + 1e-9 : 1e-9);
      var expectedUnits = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).filter(function (u) { return typeof u === 'string' && u.trim(); });
      var unitKey = key.replace(/:number$/, ':unit');
      var pairedUnit = Object.prototype.hasOwnProperty.call(responses, unitKey) ? siResponseText(responses[unitKey], 120) : '';
      var effectiveUnit = pairedUnit || parsedNum.inlineUnit;
      var normUnitVal = function (u) { return normFillText(u, false).replace(/\./g, '').replace(/\s+/g, ''); };
      var unitWrong = numOk && expectedUnits.length > 0 && effectiveUnit !== '' && !expectedUnits.some(function (u) { return normUnitVal(u) === normUnitVal(effectiveUnit); });
      // A required unit left blank costs the unit's half, as a wrong unit does
      // (and as the live grader does); the pack's own check marks it wrong.
      var unitMissing = numOk && expectedUnits.length > 0 && effectiveUnit === '' && q.requireUnit === true;
      out[key] = {
        score: numOk ? (unitWrong || unitMissing ? 50 : 100) : 0,
        status: numOk ? (unitWrong || unitMissing ? 'partially-correct' : 'correct') : 'incorrect',
        feedback: unitMissing
          ? ('Value matches numeric key, but the required unit (' + expectedUnits[0].trim() + ') is missing.')
          : unitWrong
          ? ('Value matches numeric key, but expected unit ' + expectedUnits[0].trim() + '.')
          : (numOk ? 'Auto-scored against numeric key (within tolerance).' : ('Auto-scored against numeric key (expected ' + targetNum + ').')),
        origin: 'answer-key'
      };
      return;
    }
    if (part === 'match' && subIdx !== null) {
      var pairs = Array.isArray(q.pairs) ? q.pairs : [];
      if (subIdx < 0 || subIdx >= pairs.length || pairs.length < 2) return;
      var rightOrder = seedShuffleOrder(pairs.length, quizId + ':' + qIdx + '|' + pairs.map(function (pair) { return (pair && (pair.left || pair.prompt)) || ''; }).join('|'));
      var expectedLetter = String.fromCharCode(65 + rightOrder.indexOf(subIdx));
      var expectedRight = String((pairs[subIdx] && (pairs[subIdx].right || pairs[subIdx].match || pairs[subIdx].answer)) || '');
      var manifestLabels = manifest[key] && manifest[key].valueLabels ? manifest[key].valueLabels : {};
      var labelForRaw = manifestLabels[raw] ? String(manifestLabels[raw]) : '';
      var matchOk = raw.trim().toUpperCase() === expectedLetter
        || (expectedRight && normFillText(labelForRaw || raw, false) === normFillText(expectedRight, false));
      out[key] = {
        score: matchOk ? 100 : 0,
        status: matchOk ? 'correct' : 'incorrect',
        feedback: matchOk ? 'Auto-scored against matching key (correct).' : ('Auto-scored against matching key (expected ' + expectedLetter + ').'),
        origin: 'answer-key'
      };
      return;
    }
    if (part === 'order' && subIdx !== null) {
      var rawItems = Array.isArray(q.items) ? q.items : [];
      var canonical = Array.isArray(q.correctOrder) && q.correctOrder.length === rawItems.length ? q.correctOrder : rawItems;
      if (subIdx < 0 || subIdx >= canonical.length || canonical.length < 2) return;
      var dispOrder = Array.isArray(q.presentedOrder) && q.presentedOrder.length === canonical.length
        ? q.presentedOrder.slice()
        : seedShuffleOrder(canonical.length, quizId + ':' + qIdx + '|' + canonical.join('|'));
      var expectedPos = String(dispOrder[subIdx] + 1);
      var orderOk = raw.trim() === expectedPos;
      out[key] = {
        score: orderOk ? 100 : 0,
        status: orderOk ? 'correct' : 'incorrect',
        feedback: orderOk ? 'Auto-scored against ordering key (correct).' : ('Auto-scored against ordering key (expected position ' + expectedPos + ').'),
        origin: 'answer-key'
      };
      return;
    }
    if (part === 'wrong-pair') {
      var rmPairs = Array.isArray(q.pairs) ? q.pairs : [];
      if (rmPairs.length < 2) return;
      var rmWrongTarget = q.wrongPairIndex != null ? q.wrongPairIndex : q.wrongPair;
      var rmPairLabels = rmPairs.map(function (_, idx) { return 'Pair #' + (idx + 1); });
      var rmWrongIdx = resolveListAnswerIdx(rmPairLabels, rmWrongTarget);
      if (rmWrongIdx < 0 && typeof rmWrongTarget === 'string') {
        rmWrongIdx = rmPairs.findIndex(function (pr) {
          if (!pr || typeof pr !== 'object') return false;
          var desc = [pr.left, pr.right, pr.prompt, pr.match, pr.answer].filter(Boolean).join(' ');
          return desc && normFillText(desc, false) === normFillText(rmWrongTarget, false);
        });
      }
      if (rmWrongIdx < 0 || rmWrongIdx >= rmPairs.length) return;
      var rmWpGrade = scoreListSelection(raw, rmPairLabels, rmWrongIdx, 'relation-mismatch wrong pair');
      if (rmWpGrade) out[key] = rmWpGrade;
      return;
    }
    if (part === 'partner') {
      var rmCands = Array.isArray(q.candidatePartners) ? q.candidatePartners : [];
      var rmPartnerTarget = q.correctPartnerIndex != null ? q.correctPartnerIndex
        : (q.correctPartnerForWrong != null ? q.correctPartnerForWrong : q.correctPartner);
      var rmPartnerIdx = resolveListAnswerIdx(rmCands, rmPartnerTarget);
      var rmPartnerGrade = scoreListSelection(raw, rmCands, rmPartnerIdx, 'relation-mismatch partner');
      if (rmPartnerGrade) out[key] = rmPartnerGrade;
      return;
    }
    if (part === 'sequence-verdict' || part === 'sequence-item' || part === 'sequence-order' || part === 'sequence-principle') {
      var ssItems = Array.isArray(q.items) ? q.items : [];
      if (ssItems.length < 2) return;
      var ssPresented = Array.isArray(q.presentedOrder) && q.presentedOrder.length === ssItems.length
        ? q.presentedOrder
        : ssItems.map(function (_, idx) { return idx; });
      var ssMisplaced = (function () {
        if (ssPresented.every(function (v, idx) { return v === idx; })) return [];
        var found = [];
        ssPresented.forEach(function (_, skip) {
          var prev = -1;
          var sorted = ssPresented.every(function (val, idx) {
            if (idx === skip) return true;
            var ok = val >= prev;
            prev = val;
            return ok;
          });
          if (sorted) found.push(skip);
        });
        if (found.length) return found;
        var authored = q.intentionallyWrongIndex;
        return Number.isInteger(authored) && authored >= 0 && authored < ssItems.length ? [authored] : ssPresented.map(function (_, idx) { return idx; });
      })();
      if (part === 'sequence-verdict') {
        var expectedVerdict = ssMisplaced.length === 0 ? 'yes' : 'no';
        var stuVerdict = normFillText(raw, false);
        if (stuVerdict !== 'yes' && stuVerdict !== 'no') return;
        var svOk = stuVerdict === expectedVerdict;
        out[key] = {
          score: svOk ? 100 : 0,
          status: svOk ? 'correct' : 'incorrect',
          feedback: svOk
            ? 'Auto-scored against sequence-sense verdict key (correct).'
            : ('Auto-scored against sequence-sense verdict key (expected ' + expectedVerdict + ').'),
          origin: 'answer-key'
        };
        return;
      }
      if (part === 'sequence-item') {
        if (!ssMisplaced.length) return;
        var stuItemNum = Number(raw.trim());
        if (!Number.isInteger(stuItemNum) || stuItemNum < 1) return;
        var siOk = ssMisplaced.indexOf(stuItemNum - 1) >= 0;
        out[key] = {
          score: siOk ? 100 : 0,
          status: siOk ? 'correct' : 'incorrect',
          feedback: siOk
            ? 'Auto-scored against sequence-sense misplaced-item key (correct).'
            : ('Auto-scored against sequence-sense misplaced-item key (expected #' + ssMisplaced.map(function (p) { return p + 1; }).join(' or #') + ').'),
          origin: 'answer-key'
        };
        return;
      }
      if (part === 'sequence-order') {
        var canonNums = ssItems.map(function (_, canonIdx) { return ssPresented.indexOf(canonIdx) + 1; });
        if (canonNums.some(function (n) { return n < 1; })) return;
        var stuNums = (raw.match(/\d+/g) || []).map(Number);
        if (!stuNums.length) return;
        var exactSeq = 0;
        for (var sqi = 0; sqi < canonNums.length; sqi++) {
          if (stuNums[sqi] === canonNums[sqi]) exactSeq++;
        }
        var fullSeq = stuNums.length === canonNums.length && exactSeq === canonNums.length;
        var partSeq = !fullSeq && stuNums.length === canonNums.length && exactSeq > 0;
        out[key] = {
          score: fullSeq ? 100 : (partSeq ? Math.round((exactSeq / canonNums.length) * 100) : 0),
          status: fullSeq ? 'correct' : (partSeq ? 'partially-correct' : 'incorrect'),
          feedback: fullSeq
            ? 'Auto-scored against sequence-sense order key (correct).'
            : ('Auto-scored against sequence-sense order key (expected ' + canonNums.join(', ') + ').'),
          origin: 'answer-key'
        };
        return;
      }
      if (part === 'sequence-principle') {
        var ssPList = Array.isArray(q.principleOptions) && q.principleOptions.length
          ? q.principleOptions
          : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
        var ssPIdx = resolveListAnswerIdx(ssPList, q.orderingPrinciple);
        var ssPGrade = scoreListSelection(raw, ssPList, ssPIdx, 'sequence-sense principle');
        if (ssPGrade) out[key] = ssPGrade;
      }
    }
  });
  return out;
}

// An automatic score is not a score the teacher typed, so it carries its own
// origin. It is checked against the teacher's copy in the open project, and
// only that. The copy inside the student's file can be out of date or altered,
// so it is used only when the teacher asks for it, and the score is marked.
var SI_ANSWER_KEY_ORIGIN = 'answer-key';
var SI_STUDENT_FILE_KEY_ORIGIN = 'answer-key-student-file';
function siIsAnswerKeyOrigin(origin) {
  return origin === SI_ANSWER_KEY_ORIGIN || origin === SI_STUDENT_FILE_KEY_ORIGIN;
}
function siExportedQuizAutoGrades(payload, history) {
  return siAutoGradesFromKeys(payload, history, false);
}
// The scores only the student's own copy could give: what the teacher is
// offered, never applied without being asked for.
function siStudentCopyOnlyGrades(payload, history) {
  var out = Object.create(null);
  var content = payload && typeof payload === 'object' ? payload.content : null;
  if (!Array.isArray(content) || !content.length) return out;
  var fromProject = siAutoGradesFromKeys(payload, history, false);
  var withStudentCopy = siAutoGradesFromKeys(payload, history, true);
  Object.keys(withStudentCopy).forEach(function (key) {
    if (fromProject[key]) return;
    out[key] = Object.assign({}, withStudentCopy[key], { origin: SI_STUDENT_FILE_KEY_ORIGIN, keySource: 'student-file' });
  });
  return out;
}

function siAnnotationDrawSvgHtml(anno) {
  if (!anno || !Array.isArray(anno.points) || anno.points.length < 2) return '';
  var pts = anno.points.filter(function (pt) {
    return pt && typeof pt === 'object' && typeof pt.x === 'number' && typeof pt.y === 'number' && Number.isFinite(pt.x) && Number.isFinite(pt.y);
  });
  if (pts.length < 2) return '';
  var minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
  for (var i = 1; i < pts.length; i++) {
    if (pts[i].x < minX) minX = pts[i].x;
    if (pts[i].x > maxX) maxX = pts[i].x;
    if (pts[i].y < minY) minY = pts[i].y;
    if (pts[i].y > maxY) maxY = pts[i].y;
  }
  var sw = Math.max(1, Math.min(16, Number(anno.strokeWidth) || 4));
  var pad = sw + 4;
  var bx = minX - pad, by = minY - pad;
  var bw = Math.max(20, (maxX - minX) + pad * 2);
  var bh = Math.max(20, (maxY - minY) + pad * 2);
  var d = pts.map(function (pt, idx) {
    return (idx === 0 ? 'M' : 'L') + (Math.round((pt.x - bx) * 10) / 10) + ' ' + (Math.round((pt.y - by) * 10) / 10);
  }).join(' ');
  var stroke = /^#[0-9a-f]{3,8}$/i.test(String(anno.strokeHex || '')) ? anno.strokeHex : '#dc2626';
  return '<svg role="img" aria-label="Student drawing" viewBox="0 0 ' + bw + ' ' + bh + '" style="display:block;max-width:100%;max-height:160px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;margin-top:4px;"><path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function siResolveFeedbackLocale(row, payload) {
  var p = (payload && typeof payload === 'object') ? payload : {};
  var rawLang = siResponseText((row && (row.lang || row.language)) || p.lang || p.language || '', 40);
  var rawDir = siResponseText((row && row.dir) || p.dir || '', 12).toLowerCase();
  var lower = rawLang.trim().toLowerCase();
  var NAME_TO_BCP = {
    english: 'en', spanish: 'es', french: 'fr', arabic: 'ar', hebrew: 'he',
    farsi: 'fa', persian: 'fa', urdu: 'ur', pashto: 'ps', uyghur: 'ug', yiddish: 'yi',
    chinese: 'zh', japanese: 'ja', korean: 'ko', vietnamese: 'vi', portuguese: 'pt',
    'haitian creole': 'ht', russian: 'ru', german: 'de', italian: 'it'
  };
  var normCode = rawLang.trim().replace(/_/g, '-');
  var lang = NAME_TO_BCP[lower] || (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(normCode) ? normCode : 'en');
  var isRtl = rawDir === 'rtl'
    || /^(?:ar|fa|he|iw|ps|sd|ug|ur|yi)(?:-|$)/i.test(lang)
    || /\b(?:arabic|hebrew|farsi|persian|urdu|pashto|yiddish|uyghur)\b/i.test(lower);
  return { lang: lang, dir: isRtl ? 'rtl' : '' };
}

function siBuildStudentFeedbackBody(row, rowGrades, summary, escHtml, wrapMain, teacherHistory) {
  var p = (row && row.payload && typeof row.payload === 'object') ? row.payload : (row && typeof row === 'object' ? row : {});
  var locale = siResolveFeedbackLocale(row, p);
  var nickname = siResponseText((row && row.nickname) || p.nickname || p.studentName || 'Student', 120) || 'Student';
  var docTitle = siResponseText((row && row.docTitle) || p.docTitle || 'Worksheet', 200) || 'Worksheet';
  var timestamp = siResponseText((row && row.timestamp) || p.timestamp || p.exportedAt || '', 80);
  var gradesMap = rowGrades && typeof rowGrades === 'object' ? rowGrades : {};
  var sumObj = summary && typeof summary === 'object' ? summary : {};
  var resolvedHistory = Array.isArray(teacherHistory) ? teacherHistory
    : (teacherHistory && Array.isArray(teacherHistory.teacherHistory) ? teacherHistory.teacherHistory
    : (Array.isArray(sumObj.teacherHistory) ? sumObj.teacherHistory : []));
  var entries = siResponseEntryModels(p);
  var roleSwaps = siRoleSwapItems(p, resolvedHistory);
  var stories = siStudentStoryItems(p);
  var annos = siStudentAnnotations(p);
  var numericScores = Object.keys(gradesMap)
    .map(function (k) { return gradesMap[k]; })
    .filter(function (g) { return g && g.status !== 'error' && typeof g.score === 'number' && Number.isFinite(g.score); })
    .map(function (g) { return g.score; });
  var gradableEntries = entries.filter(function (entry) {
    return !entry.isSelfCheck || Object.prototype.hasOwnProperty.call(gradesMap, entry.key);
  });
  var scoredCount = typeof sumObj.scored === 'number' ? sumObj.scored : numericScores.length;
  var totalCount = typeof sumObj.total === 'number' ? sumObj.total : (gradableEntries.length + roleSwaps.length + stories.length);
  var fallbackAvg = numericScores.length
    ? Math.round(numericScores.reduce(function (acc, n) { return acc + n; }, 0) / numericScores.length)
    : null;
  var avgVal = (typeof sumObj.average === 'number' && Number.isFinite(sumObj.average)) ? sumObj.average : fallbackAvg;
  var avgText = avgVal !== null ? (avgVal + '/100') : '—';
  var renderScoreBadge = function (g, isSelfCheck) {
    if (g && g.status === 'error') {
      return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:700;font-size:12px;">Grading error</span>';
    }
    if (g && typeof g.score === 'number' && Number.isFinite(g.score)) {
      var badgeBg = g.score >= 85 ? '#dcfce7' : (g.score >= 60 ? '#fef3c7' : '#ffe4e6');
      var badgeFg = g.score >= 85 ? '#14532d' : (g.score >= 60 ? '#92400e' : '#9f1239');
      return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:' + badgeBg + ';color:' + badgeFg + ';font-weight:700;font-size:12px;">' + escHtml(g.score + '/100') + (g.status ? ' · ' + escHtml(g.status) : '') + '</span>';
    }
    if (isSelfCheck) {
      return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:600;font-size:12px;">Self-check (ungraded)</span>';
    }
    return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-weight:600;font-size:12px;">Not scored</span>';
  };
  var responseCards = entries.map(function (entry) {
    var g = gradesMap[entry.key];
    var scoreBadge = renderScoreBadge(g, entry.isSelfCheck);
    return '<article class="card" style="border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#ffffff;break-inside:avoid;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">'
      + '<div style="font-weight:700;color:#0f172a;">' + escHtml(entry.question) + (entry.partLabel ? ' <span style="color:#475569;font-weight:600;font-size:0.9em;">(' + escHtml(entry.partLabel) + ')</span>' : '') + '</div>'
      + scoreBadge
      + '</div>'
      + '<div style="background:#f8fafc;border-left:3px solid #94a3b8;padding:8px 10px;border-radius:4px;color:#1e293b;white-space:pre-wrap;overflow-wrap:anywhere;">'
      + (entry.answered ? escHtml(entry.displayValue) : '<em>No answer submitted</em>')
      + '</div>'
      + (g && g.feedback ? '<p style="margin:8px 0 0;color:#334155;font-size:0.92em;"><strong>Feedback:</strong> ' + escHtml(g.feedback) + '</p>' : '')
      + '</article>';
  }).join('');
  var extraCards = roleSwaps.map(function (rs) {
    var g = gradesMap[rs.key];
    var bodyHtml = rs.entries.map(function (e) {
      return '<div style="margin-top:6px;">'
        + '<strong>' + escHtml(e.question) + '</strong>'
        + (e.speaker ? ' <span style="color:#475569;font-size:0.88em;">(' + escHtml(e.speaker) + ')</span>' : '')
        + '<div style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:2px;">' + escHtml(e.answer) + '</div>'
        + (e.evidence ? '<blockquote style="margin:4px 0 0;padding:2px 8px;border-left:3px solid #a5b4fc;color:#334155;font-style:italic;">' + escHtml(e.evidence) + (e.evidenceInSource ? ' &#10003; Found in source' : '') + '</blockquote>' : '')
        + '</div>';
    }).join('');
    return '<article class="card" style="border:1px solid #c7d2fe;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#ffffff;break-inside:avoid;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">'
      + '<div style="font-weight:700;color:#312e81;">' + escHtml(rs.title) + ' <span style="color:#475569;font-weight:600;font-size:0.9em;">(Role Swap)</span></div>'
      + renderScoreBadge(g, false)
      + '</div>'
      + bodyHtml
      + (g && g.feedback ? '<p style="margin:8px 0 0;color:#334155;font-size:0.92em;"><strong>Feedback:</strong> ' + escHtml(g.feedback) + '</p>' : '')
      + '</article>';
  }).concat(stories.map(function (st) {
    var g = gradesMap[st.key];
    return '<article class="card" style="border:1px solid #c7d2fe;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#ffffff;break-inside:avoid;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">'
      + '<div style="font-weight:700;color:#312e81;">' + escHtml(st.title) + ' <span style="color:#475569;font-weight:600;font-size:0.9em;">(' + escHtml(st.scenes.length + ' scenes · ' + st.endings + ' endings') + ')</span></div>'
      + renderScoreBadge(g, false)
      + '</div>'
      + '<div style="background:#f8fafc;border-left:3px solid #94a3b8;padding:8px 10px;border-radius:4px;color:#1e293b;white-space:pre-wrap;overflow-wrap:anywhere;">'
      + escHtml(st.text)
      + '</div>'
      + (g && g.feedback ? '<p style="margin:8px 0 0;color:#334155;font-size:0.92em;"><strong>Feedback:</strong> ' + escHtml(g.feedback) + '</p>' : '')
      + '</article>';
  })).join('');
  var annoSection = annos.length ? (
    '<section style="margin-top:20px;">'
    + '<h2 style="font-size:1.05rem;color:#0f172a;margin:0 0 10px;">Highlights &amp; Notes (' + escHtml(annos.length) + ')</h2>'
    + annos.map(function (a) {
        var drawSvg = a.type === 'draw' ? siAnnotationDrawSvgHtml(a) : '';
        var safeDrawUrl = (a.type === 'draw' && !drawSvg && typeof a.dataUrl === 'string' && /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(a.dataUrl.trim())) ? a.dataUrl.trim() : '';
        var safeAudioUrl = (a.type === 'voice' && typeof a.audioSrc === 'string' && /^data:audio\/[a-z0-9.+-]+(?:;[a-z0-9.+-]+=[^;,]+)*;base64,[A-Za-z0-9+/=\s]+$/i.test(a.audioSrc.trim())) ? a.audioSrc.trim().replace(/\s+/g, '') : '';
        var extra = a.type === 'draw'
          ? (drawSvg || (safeDrawUrl ? '<img src="' + escHtml(safeDrawUrl) + '" alt="Student drawing" style="display:block;max-width:100%;max-height:160px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;margin-top:4px;"/>' : '<div style="font-size:0.85em;color:#475569;">[Student drawing attached]</div>'))
          : (a.type === 'voice'
            ? (safeAudioUrl
              ? '<div style="font-size:0.85em;color:#475569;">[Voice note attached]<audio controls preload="metadata" src="' + escHtml(safeAudioUrl) + '" style="display:block;width:100%;max-width:320px;height:32px;margin-top:4px;"></audio></div>'
              : '<div style="font-size:0.85em;color:#475569;">[Voice note attached]</div>')
            : '');
        return '<div class="card" style="border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fffbeb;break-inside:avoid;">'
          + (a.quote ? '<div style="font-size:0.9em;color:#475569;margin-bottom:4px;">&ldquo;' + escHtml(a.quote) + '&rdquo;</div>' : '')
          + (a.note ? '<div style="color:#0f172a;white-space:pre-wrap;">' + escHtml(a.note) + '</div>' : '')
          + extra
          + '</div>';
      }).join('')
    + '</section>'
  ) : '';
  var takeHomeSection = (p.takeHome && typeof p.takeHome === 'object') ? (function () {
    var th = p.takeHome;
    var items = Array.isArray(th.items) ? th.items : [];
    var doneCount = items.filter(function (it) { return it && it.done; }).length;
    var firstTryCount = items.filter(function (it) { return it && it.firstTry; }).length;
    var itemHtml = items.slice(0, 60).map(function (it) {
      if (!it || typeof it !== 'object') return '';
      var label = siResponseText(it.word || it.label || it.prompt || it.item || '', 120);
      if (!label) return '';
      return '<span style="display:inline-block;padding:2px 8px;margin:2px 4px 2px 0;border-radius:999px;border:1px solid #cbd5e1;background:#f8fafc;font-size:0.85em;">'
        + escHtml(siTakeHomeMark(it) + ' ' + label) + '</span>';
    }).join('');
    return '<article class="card" style="border:1px solid #bae6fd;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#f0f9ff;break-inside:avoid;">'
      + '<div style="font-weight:700;color:#075985;margin-bottom:6px;">' + escHtml(siResponseText(th.lessonTitle || docTitle || 'Take-home practice', 180)) + ' <span style="font-weight:600;color:#475569;font-size:0.9em;">(Practice Packet)</span></div>'
      + '<div style="font-size:0.9em;color:#334155;margin-bottom:6px;"><strong>Completed:</strong> ' + escHtml(doneCount + ' / ' + items.length) + ' &nbsp;|&nbsp; <strong>First try:</strong> ' + escHtml(String(firstTryCount)) + '</div>'
      + (itemHtml ? '<div>' + itemHtml + '</div>' : '')
      + '</article>';
  })() : '';
  var contentTag = wrapMain === false ? 'div' : 'main';
  return {
    title: docTitle + ' - ' + nickname + ' Feedback',
    lang: locale.lang,
    dir: locale.dir,
    html: '<header style="background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:16px 18px;margin-bottom:18px;">'
      + '<h1 style="margin:0 0 6px;font-size:1.35rem;color:#0f172a;">' + escHtml(docTitle) + '</h1>'
      + '<div style="color:#334155;font-size:0.95rem;"><strong>Student:</strong> ' + escHtml(nickname)
      + (timestamp ? ' &nbsp;|&nbsp; <strong>Submitted:</strong> ' + escHtml(timestamp) : '')
      + ' &nbsp;|&nbsp; <strong>Average:</strong> ' + escHtml(avgText)
      + ' &nbsp;|&nbsp; <strong>Scored:</strong> ' + escHtml(scoredCount + ' / ' + totalCount) + '</div>'
      + '</header>'
      + '<' + contentTag + '>' + ((responseCards + extraCards + takeHomeSection) || '<p style="color:#475569;">No captured responses in this submission.</p>') + annoSection + '</' + contentTag + '>'
  };
}

function siBuildStudentFeedbackHtml(row, rowGrades, summary, teacherHistory) {
  function escHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  var resolvedHistory = Array.isArray(teacherHistory) ? teacherHistory
    : (teacherHistory && Array.isArray(teacherHistory.teacherHistory) ? teacherHistory.teacherHistory : undefined);
  var body = siBuildStudentFeedbackBody(row, rowGrades, summary, escHtml, true, resolvedHistory);
  return '<!DOCTYPE html><html lang="' + escHtml(body.lang || 'en') + '"' + (body.dir === 'rtl' ? ' dir="rtl"' : '') + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; media-src data:; base-uri \'none\'; form-action \'none\';">'
    + '<meta name="referrer" content="no-referrer">'
    + '<title>' + escHtml(body.title) + '</title>'
    + '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;max-width:820px;margin:0 auto;padding:24px;}@media print{body{background:#fff;padding:12px;}.card{break-inside:avoid;}.no-print{display:none !important;}}</style>'
    + '</head><body>'
    + '<div class="no-print" style="display:flex;justify-content:flex-end;margin-bottom:12px;">'
    + '<button type="button" onclick="window.print()" style="padding:6px 14px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Print / Save PDF</button>'
    + '</div>'
    + body.html + '</body></html>';
}

function siBuildBatchFeedbackHtml(items, docLabel, teacherHistory) {
  function escHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  var labelArg = (docLabel && typeof docLabel === 'object') ? (docLabel.docLabel || docLabel.title) : docLabel;
  var resolvedHistory = Array.isArray(teacherHistory) ? teacherHistory
    : (teacherHistory && Array.isArray(teacherHistory.teacherHistory) ? teacherHistory.teacherHistory
    : (docLabel && typeof docLabel === 'object' && Array.isArray(docLabel.teacherHistory) ? docLabel.teacherHistory : undefined));
  var safeItems = Array.isArray(items) ? items : [];
  var batchLang = 'en';
  var batchDir = '';
  var sheets = safeItems.map(function (entry, idx) {
    var r = entry && entry.row ? entry.row : {};
    var body = siBuildStudentFeedbackBody(r, entry && entry.rowGrades, entry && entry.summary, escHtml, false, resolvedHistory);
    if (idx === 0) {
      batchLang = body.lang || 'en';
      batchDir = body.dir || '';
    }
    return '<section class="student-feedback-sheet" lang="' + escHtml(body.lang || 'en') + '"' + (body.dir === 'rtl' ? ' dir="rtl"' : '') + ' style="' + (idx < safeItems.length - 1 ? 'margin-bottom:28px;padding-bottom:20px;border-bottom:2px dashed #cbd5e1;' : '') + '">'
      + body.html
      + '</section>'
      + (idx < safeItems.length - 1 ? '<div class="student-page-break"></div>' : '');
  }).join('');
  var title = siResponseText(labelArg || 'Class Feedback Packet', 200) || 'Class Feedback Packet';
  return '<!DOCTYPE html><html lang="' + escHtml(batchLang) + '"' + (batchDir === 'rtl' ? ' dir="rtl"' : '') + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; media-src data:; base-uri \'none\'; form-action \'none\';">'
    + '<meta name="referrer" content="no-referrer">'
    + '<title>' + escHtml(title) + '</title>'
    + '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;max-width:820px;margin:0 auto;padding:24px;}@media print{body{background:#fff;padding:12px;}.card{break-inside:avoid;}.student-page-break{page-break-after:always;break-after:page;}.student-feedback-sheet{border-bottom:none !important;margin-bottom:0 !important;padding-bottom:0 !important;}.no-print{display:none !important;}}</style>'
    + '</head><body>'
    + '<div class="no-print" style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:10px 14px;margin-bottom:18px;">'
    + '<span style="font-weight:700;color:#312e81;">' + escHtml(title) + ' (' + escHtml(String(safeItems.length)) + ')</span>'
    + '<button type="button" onclick="window.print()" style="padding:6px 14px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Print / Save PDF</button>'
    + '</div>'
    + '<main>' + (sheets || '<p style="color:#475569;">No graded student feedback sheets yet.</p>') + '</main>'
    + '</body></html>';
}

function siLookupTrustedHistoryPrompt(responseKey, history) {
  if (!responseKey || !Array.isArray(history) || !history.length) return '';
  var bare = String(responseKey).replace(/^allo-response:/, '');
  var qMatch = bare.match(/^(.+):q(\d+):/);
  if (qMatch) {
    var quiz = history.find(function (item) { return item && item.type === 'quiz' && String(item.id) === qMatch[1]; })
      || (qMatch[1] === 'quiz' ? history.find(function (item) { return item && item.type === 'quiz'; }) : null);
    var qIdx = Number(qMatch[2]);
    var q = quiz && quiz.data && Array.isArray(quiz.data.questions) ? quiz.data.questions[qIdx] : null;
    if (q && typeof q === 'object') {
      var parts = [];
      if (q.question) parts.push('Question prompt: ' + siResponseText(q.question, 600));
      if (q.rubric) parts.push('Item rubric: ' + siResponseText(q.rubric, 600));
      if (q.sampleAnswer || q.explanation) parts.push('Reference note: ' + siResponseText(q.sampleAnswer || q.explanation, 500));
      if (parts.length) return parts.join(' | ');
    }
  }
  var dbqAny = bare.match(/^(.+):dbq:(.+)$/);
  if (dbqAny) {
    var dbq = history.find(function (item) { return item && item.type === 'dbq' && String(item.id) === dbqAny[1]; })
      || (dbqAny[1] === 'dbq' ? history.find(function (item) { return item && item.type === 'dbq'; }) : null);
    var dData = dbq && dbq.data && typeof dbq.data === 'object' ? dbq.data : null;
    if (dData) {
      var dbqSub = dbqAny[2].replace(/:free-response$/, '');
      if (dbqSub === 'essay' || dbqSub.indexOf('essay') === 0) {
        var essayQ = dData.synthesisPrompt || dData.synthesisQuestion || dData.essayPrompt;
        if (essayQ) return 'DBQ essay prompt: ' + siResponseText(essayQ, 700);
      }
      if (dbqSub === 'perspective') {
        var pSummary = Array.isArray(dData.perspectives) && dData.perspectives.length
          ? dData.perspectives.map(function (pr) { return typeof pr === 'string' ? pr : ((pr && (pr.label || pr.view || pr.stance || pr.summary)) || ''); }).filter(Boolean).join(' vs. ')
          : '';
        return 'DBQ competing perspectives prompt' + (pSummary ? ': ' + siResponseText(pSummary, 600) : '');
      }
      var corrobClaimMatch = dbqSub.match(/^corrob:(\d+)$/);
      if (corrobClaimMatch && Array.isArray(dData.corroborationClaims)) {
        var cClaim = dData.corroborationClaims[Number(corrobClaimMatch[1])];
        var cClaimTxt = cClaim && typeof cClaim === 'object' ? (cClaim.claim || cClaim.prompt || cClaim.text || '') : (cClaim || '');
        if (cClaimTxt) return 'DBQ corroboration prompt: ' + siResponseText(cClaimTxt, 600);
      }
      var corrobPromptMatch = dbqSub.match(/^corrob-prompt:(\d+)$/);
      if (corrobPromptMatch && Array.isArray(dData.corroborationPrompts)) {
        var cPrompt = dData.corroborationPrompts[Number(corrobPromptMatch[1])];
        var cPromptTxt = cPrompt && typeof cPrompt === 'object' ? (cPrompt.prompt || cPrompt.question || cPrompt.text || '') : (cPrompt || '');
        if (cPromptTxt) return 'DBQ corroboration prompt: ' + siResponseText(cPromptTxt, 600);
      }
      var happMatch = dbqSub.match(/^(\d+):happ:([A-Za-z]+)$/);
      if (happMatch && Array.isArray(dData.documents)) {
        var happDoc = dData.documents[Number(happMatch[1])];
        var happLabel = happDoc ? (happDoc.title || happDoc.source || '') : '';
        return 'DBQ HAPP (' + siResponseText(happMatch[2], 40) + ') prompt' + (happLabel ? ' for ' + siResponseText(happLabel, 300) : '');
      }
      var dbqDocMatch = dbqSub.match(/^(\d+):(sourcing|analysis):(\d+)$/);
      if (dbqDocMatch && Array.isArray(dData.documents)) {
        var docItem = dData.documents[Number(dbqDocMatch[1])];
        var qList = docItem ? (dbqDocMatch[2] === 'sourcing' ? docItem.sourcingQuestions : docItem.analysisQuestions) : null;
        var qItem = Array.isArray(qList) ? qList[Number(dbqDocMatch[3])] : null;
        if (qItem) return 'DBQ prompt: ' + siResponseText(qItem, 600);
      }
    }
  }
  var mMatch = bare.match(/^(.+):math:(\d+):/);
  if (mMatch) {
    var mathRes = history.find(function (item) { return item && item.type === 'math' && String(item.id) === mMatch[1]; })
      || (mMatch[1] === 'math' ? history.find(function (item) { return item && item.type === 'math'; }) : null);
    var mProbs = mathRes && mathRes.data ? (Array.isArray(mathRes.data.problems) ? mathRes.data.problems : [mathRes.data]) : [];
    var mp = mProbs[Number(mMatch[2])];
    if (mp && mp.question) return 'Math prompt: ' + siResponseText(mp.question, 600);
  }
  var gwMatch = bare.match(/^glossary-worksheet:(.+):def:(\d+)(?::free-response)?$/);
  if (gwMatch) {
    var gwSid = gwMatch[1];
    var gwIdx = Number(gwMatch[2]);
    var glossItems = history.filter(function (item) { return item && item.type === 'glossary'; });
    var gwRes = glossItems.find(function (item) {
      var rawId = String(item.id == null ? 'glossary' : item.id);
      var sanId = rawId.replace(/[^A-Za-z0-9_-]+/g, '-');
      return rawId === gwSid || sanId === gwSid;
    }) || (glossItems.length === 1 ? glossItems[0] : null);
    var gwArr = gwRes && gwRes.data ? (Array.isArray(gwRes.data) ? gwRes.data : (gwRes.data.terms || gwRes.data.items || gwRes.data.entries || gwRes.data.glossary || [])) : [];
    var gwEntry = Array.isArray(gwArr) ? gwArr[gwIdx] : null;
    var gwTerm = gwEntry ? (typeof gwEntry === 'string' ? gwEntry : (gwEntry.term || gwEntry.word || gwEntry.name || (Array.isArray(gwEntry) ? gwEntry[0] : '') || '')) : '';
    var gwPos = gwEntry && gwEntry.partOfSpeech ? ' (' + String(gwEntry.partOfSpeech).trim() + ')' : '';
    if (gwTerm) return 'Glossary definition prompt for: ' + siResponseText(gwTerm, 200) + gwPos;
  }
  var tlMatch = bare.match(/^(.+):timeline:(\d+):date$/);
  var tlHashMatch = !tlMatch ? bare.match(/^(.+):timeline-date:([a-z0-9]+)(?::free-response)?$/) : null;
  if (tlMatch || tlHashMatch) {
    var tlId = (tlMatch || tlHashMatch)[1];
    var tlRes = history.find(function (item) { return item && item.type === 'timeline' && String(item.id) === tlId; })
      || (tlId === 'timeline' ? history.find(function (item) { return item && item.type === 'timeline'; }) : null);
    var tlEvents = tlRes && tlRes.data ? (Array.isArray(tlRes.data) ? tlRes.data : (tlRes.data.events || tlRes.data.items || [])) : [];
    var tlEv = null;
    if (tlMatch) {
      tlEv = Array.isArray(tlEvents) ? tlEvents[Number(tlMatch[2])] : null;
    } else if (tlRes && Array.isArray(tlEvents)) {
      for (var tli = 0; tli < tlEvents.length; tli++) {
        var tlCand = tlEvents[tli];
        if (siFnv1aHash((tlRes.id || 'timeline') + ':' + tli + ':' + String((tlCand && (tlCand.event || tlCand.title || tlCand.description)) || '')).toString(36) === tlHashMatch[2]) {
          tlEv = tlCand;
          break;
        }
      }
    }
    if (tlEv) {
      var tlLabel = tlEv.title || tlEv.event || tlEv.label || tlEv.heading || tlEv.description || tlEv.summary || '';
      if (tlLabel) return 'Timeline date prompt for: ' + siResponseText(tlLabel, 500);
    }
  }
  var ntMatch = bare.match(/^(.+):note:(.+)$/);
  if (ntMatch) {
    var ntRes = history.find(function (item) { return item && item.type === 'note-taking' && String(item.id) === ntMatch[1]; })
      || (ntMatch[1] === 'note-taking' ? history.find(function (item) { return item && item.type === 'note-taking'; }) : null);
    var ntData = ntRes && ntRes.data && typeof ntRes.data === 'object' ? ntRes.data : null;
    var ntKey = ntMatch[2].replace(/:free-response$/, '');
    if (ntData) {
      if (ntKey === 'summary') return 'Note-taking summary prompt';
      var ntBlankMatch = ntKey.match(/^blank:(\d+)$/);
      if (ntBlankMatch && Array.isArray(ntData.blanks)) {
        var nb = ntData.blanks[Number(ntBlankMatch[1])];
        if (nb) {
          var nbTxt = ((nb.before || nb.prefix || '') + ' ___ ' + (nb.after || nb.suffix || '')).replace(/\s+/g, ' ').trim();
          if (nbTxt) return 'Note-taking guided blank prompt: ' + siResponseText(nbTxt, 500);
        }
      }
      var ntEntryMatch = ntKey.match(/^(?:response|quote):(\d+)$/);
      if (ntEntryMatch && Array.isArray(ntData.entries)) {
        var ne = ntData.entries[Number(ntEntryMatch[1])];
        var neTxt = ne && typeof ne === 'object' ? (ne.quote || ne.prompt || ne.left || ne.text || '') : (ne || '');
        if (neTxt) return 'Note-taking entry prompt: ' + siResponseText(neTxt, 500);
      }
      var ntPairMatch = ntKey.match(/^answer:(\d+)$/);
      if (ntPairMatch && Array.isArray(ntData.pairs)) {
        var np = ntData.pairs[Number(ntPairMatch[1])];
        var npTxt = np && typeof np === 'object' ? (np.question || np.prompt || '') : '';
        if (npTxt) return 'Note-taking question prompt: ' + siResponseText(npTxt, 500);
      }
      var ntSubIdxMatch = ntKey.match(/^(?:notes|q|qa|answer|blank|guided|prompt|row|section)[:\-_](\d+)/);
      if (ntSubIdxMatch) {
        var nIdx = Number(ntSubIdxMatch[1]);
        var nList = ntData.cues || ntData.rows || ntData.questions || ntData.qa || ntData.items || ntData.sections || ntData.prompts || ntData.lines || ntData.notes || [];
        var nItem = Array.isArray(nList) ? nList[nIdx] : null;
        if (nItem) {
          var nText = typeof nItem === 'string' ? nItem : (nItem.cue || nItem.question || nItem.prompt || nItem.topic || nItem.heading || nItem.title || nItem.text || nItem.line || '');
          if (nText) return 'Note-taking prompt: ' + siResponseText(nText, 500);
        }
      }
      var ntTitle = ntRes.title || ntData.title || '';
      return 'Note-taking prompt (' + siResponseText(ntKey, 80) + ')' + (ntTitle ? ' — ' + siResponseText(ntTitle, 120) : '');
    }
  }
  var sfMatch = bare.match(/^(.+):(?:(\d+)|paragraph-(\d+)):sentence-frame$/);
  if (sfMatch) {
    var sfRes = history.find(function (item) { return item && item.type === 'sentence-frames' && String(item.id) === sfMatch[1]; })
      || (sfMatch[1] === 'sf' ? history.find(function (item) { return item && item.type === 'sentence-frames'; }) : null);
    var sfData = sfRes && sfRes.data && typeof sfRes.data === 'object' ? sfRes.data : null;
    if (sfData) {
      if (sfMatch[2] != null && Array.isArray(sfData.items)) {
        var sfEntry = sfData.items[Number(sfMatch[2])];
        var sfTxt = sfEntry && typeof sfEntry === 'object' ? (sfEntry.frame || sfEntry.stem || sfEntry.text || sfEntry.prompt || '') : (sfEntry || '');
        if (sfTxt) return 'Sentence frame prompt: ' + siResponseText(sfTxt, 500);
      } else if (sfMatch[3] != null && typeof sfData.text === 'string') {
        var sfBlankRe = /(\[(?!\s*\d+(?:\s*[,;-]\s*\d+)*\s*\])[^\]\n]*\](?!\()|_{3,})/g;
        var sfParts = sfData.text.split(sfBlankRe);
        var pIdx = Number(sfMatch[3]);
        var cue = sfParts[pIdx] && sfParts[pIdx].charAt(0) === '[' ? sfParts[pIdx].slice(1, -1).trim() : '';
        var around = ((sfParts[pIdx - 1] || '').slice(-120) + ' ___ ' + (sfParts[pIdx + 1] || '').slice(0, 120)).replace(/\s+/g, ' ').trim();
        var sfParagraphTxt = around || cue;
        if (sfParagraphTxt) return 'Sentence frame prompt: ' + siResponseText(sfParagraphTxt, 500);
      }
    }
  }
  var outMatch = bare.match(/^(.+):(kwl|outline):(\d+)(?::free-response)?$/);
  if (outMatch) {
    var outRes = history.find(function (item) { return item && item.type === 'outline' && String(item.id) === outMatch[1]; })
      || (outMatch[1] === 'outline' ? history.find(function (item) { return item && item.type === 'outline'; }) : null);
    var branches = outRes && outRes.data && Array.isArray(outRes.data.branches) ? outRes.data.branches : [];
    var ob = branches[Number(outMatch[3])];
    if (ob) {
      var oTxt = outMatch[2] === 'kwl'
        ? (ob.kwlNote || ob.title || ob.label || '')
        : ([ob.label || ob.title || '', ob.scaffoldPrompt || ob.prompt || ''].filter(Boolean).join(' — '));
      if (oTxt) return 'Organizer prompt: ' + siResponseText(oTxt, 500);
    }
  }
  var acMatch = bare.match(/^(.+):ac:([^:]+):(\d+)(?::free-response)?$/);
  if (acMatch) {
    var acRes = history.find(function (item) { return item && item.type === 'anchor-chart' && String(item.id) === acMatch[1]; })
      || (acMatch[1] === 'ac' ? history.find(function (item) { return item && item.type === 'anchor-chart'; }) : null);
    var sections = acRes && acRes.data && Array.isArray(acRes.data.sections) ? acRes.data.sections : [];
    var sec = sections.find(function (s) { return s && String(s.id) === acMatch[2]; }) || (/^\d+$/.test(acMatch[2]) ? sections[Number(acMatch[2])] : null);
    if (sec) {
      var bIdx = Number(acMatch[3]);
      var acList = Array.isArray(sec.bullets) ? sec.bullets : (Array.isArray(sec.points) ? sec.points : []);
      var rawBullet = acList[bIdx];
      var secBullet = rawBullet && typeof rawBullet === 'object' ? (rawBullet.text || rawBullet.label || '') : (rawBullet || '');
      var acTxt = [sec.label || sec.title || '', secBullet || ('Item #' + (bIdx + 1))].filter(Boolean).join(': ');
      if (acTxt) return 'Anchor chart prompt: ' + siResponseText(acTxt, 500);
    }
  }
  var clozePromptMatch = bare.match(/^(.+):cloze:(\d+):cloze-blank$/);
  if (clozePromptMatch) {
    var clzRes = history.find(function (item) { return item && item.type === 'simplified' && String(item.id) === clozePromptMatch[1]; })
      || ((clozePromptMatch[1] === 'simplified' || clozePromptMatch[1] === 'adapted') ? history.find(function (item) { return item && item.type === 'simplified'; }) : null);
    var clzTitle = (clzRes && clzRes.title) || '';
    if (clzRes || clozePromptMatch[1] === 'simplified' || clozePromptMatch[1] === 'adapted') {
      return 'Cloze blank #' + (Number(clozePromptMatch[2]) + 1) + (clzTitle ? ' in ' + siResponseText(clzTitle, 240) : '');
    }
  }
  var reflMatch = bare.match(/^(.+):reflection:(\d+)(?::(?:free-response|reflection))?$/);
  if (reflMatch) {
    var rqRes = history.find(function (item) { return item && item.type === 'quiz' && String(item.id) === reflMatch[1]; })
      || (reflMatch[1] === 'quiz' ? history.find(function (item) { return item && item.type === 'quiz'; }) : null);
    var reflList = rqRes && rqRes.data && Array.isArray(rqRes.data.reflections) ? rqRes.data.reflections : [];
    var reflEntry = reflList[Number(reflMatch[2])];
    var reflTxt = reflEntry && typeof reflEntry === 'object' ? (reflEntry.prompt || reflEntry.question || reflEntry.text || '') : (reflEntry || '');
    if (reflTxt) return 'Reflection prompt: ' + siResponseText(reflTxt, 600);
  }
  var gmMatch = bare.match(/^glossary-worksheet:(.+):match:(\d+)$/);
  if (gmMatch) {
    var gmSid = gmMatch[1];
    var gmIdx = Number(gmMatch[2]);
    var gmItems = history.filter(function (item) { return item && item.type === 'glossary'; });
    var gmRes = gmItems.find(function (item) {
      var rawId = String(item.id == null ? 'glossary' : item.id);
      var sanId = rawId.replace(/[^A-Za-z0-9_-]+/g, '-');
      return rawId === gmSid || sanId === gmSid;
    }) || (gmItems.length === 1 ? gmItems[0] : null);
    var gmArr = gmRes ? siExtractGlossaryPairs(gmRes) : [];
    var gmEntry = gmArr[gmIdx];
    var gmTerm = gmEntry ? (typeof gmEntry === 'string' ? gmEntry : (gmEntry.term || gmEntry.word || gmEntry.name || (Array.isArray(gmEntry) ? gmEntry[0] : '') || '')) : '';
    var gmPos = gmEntry && gmEntry.partOfSpeech ? ' (' + String(gmEntry.partOfSpeech).trim() + ')' : '';
    if (gmTerm) return 'Glossary matching prompt for: ' + siResponseText(gmTerm, 200) + gmPos;
  }
  var vennMatch = bare.match(/^(.+):venn:(\d+):placement$/);
  if (vennMatch) {
    var isVnItem = function (item) {
      return item && (item.type === 'outline' || item.type === 'venn-diagram' || item.type === 'venn');
    };
    var vnRes = history.find(function (item) { return isVnItem(item) && String(item.id) === vennMatch[1]; })
      || ((vennMatch[1] === 'venn' || vennMatch[1] === 'outline' || vennMatch[1] === 'venn-diagram') ? history.find(isVnItem) : null);
    var vnData = vnRes && vnRes.data && typeof vnRes.data === 'object' ? vnRes.data : null;
    var vnCfg = siResolveVennConfig(vnData);
    var vnList = vnCfg.items;
    var vnItem = vnList[Number(vennMatch[2])];
    var vnTxt = vnItem && typeof vnItem === 'object' ? (vnItem.text || vnItem.label || vnItem.name || vnItem.content || vnItem.item || '') : (vnItem || '');
    if (vnTxt) return 'Venn diagram placement for: ' + siResponseText(vnTxt, 300);
  }
  var csPromptMatch = bare.match(/^(.+):concept-sort:(\d+):category$/);
  if (csPromptMatch) {
    var csRes = history.find(function (item) { return item && item.type === 'concept-sort' && String(item.id) === csPromptMatch[1]; })
      || (csPromptMatch[1] === 'concept-sort' ? history.find(function (item) { return item && item.type === 'concept-sort'; }) : null);
    var csData = csRes && csRes.data && typeof csRes.data === 'object' ? csRes.data : null;
    var csList = csData ? (Array.isArray(csData.items) ? csData.items : (Array.isArray(csData.cards) ? csData.cards : [])) : [];
    var csPromptIdx = Number(csPromptMatch[2]);
    var csEntry = csList[csPromptIdx];
    if (!csEntry || csEntry.categoryId === '__uncategorized') {
      var csActive = csList.filter(function (ci) { return !ci || ci.categoryId !== '__uncategorized'; });
      csEntry = csActive[csPromptIdx];
    }
    var csTxt = csEntry && typeof csEntry === 'object' ? (csEntry.content || csEntry.text || csEntry.label || csEntry.name || csEntry.term || '') : (csEntry || '');
    if (csTxt) return 'Concept sort item: ' + siResponseText(csTxt, 300);
  }
  var maMatch = bare.match(/^(.+):card(\d+):(draft|reasoning)$/);
  if (maMatch) {
    var maRes = history.find(function (item) {
      if (!item || item.type !== 'memory-aid') return false;
      var normId = String(item.id == null ? 'memory-aid' : item.id).replace(/[^A-Za-z0-9_:-]/g, '-').slice(0, 120);
      return String(item.id) === maMatch[1] || normId === maMatch[1];
    }) || (maMatch[1] === 'memory-aid' ? history.find(function (item) { return item && item.type === 'memory-aid'; }) : null);
    var maData = maRes && maRes.data && typeof maRes.data === 'object' ? maRes.data : null;
    var maCards = maData ? (Array.isArray(maData.cards) ? maData.cards : (Array.isArray(maData.targets) ? maData.targets : [])) : [];
    var maCard = maCards[Number(maMatch[2])];
    if (maCard && typeof maCard === 'object') {
      var maTarget = maCard.target || maCard.term || '';
      var maSub = maMatch[3] === 'draft' ? (maCard.studentPrompt || '') : (maCard.reasoningPrompt || '');
      if (maTarget || maSub) {
        return 'Memory aid ' + maMatch[3] + ' prompt' + (maTarget ? ' (' + siResponseText(maTarget, 200) + ')' : '') + (maSub ? ': ' + siResponseText(maSub, 400) : '');
      }
    }
  }
  var maLiveMatch = bare.match(/^(.+):memory:(.+)$/);
  if (maLiveMatch) {
    var maLiveRes = history.find(function (item) { return item && item.type === 'memory-aid' && String(item.id) === maLiveMatch[1]; })
      || (maLiveMatch[1] === 'memory-aid' ? history.find(function (item) { return item && item.type === 'memory-aid'; }) : null);
    var maLiveData = maLiveRes && maLiveRes.data && typeof maLiveRes.data === 'object' ? maLiveRes.data : null;
    var maLiveCards = maLiveData ? (Array.isArray(maLiveData.cards) ? maLiveData.cards : (Array.isArray(maLiveData.targets) ? maLiveData.targets : [])) : [];
    var maField = maLiveMatch[2].replace(/:free-response$/, '');
    var maLiveCard = maLiveCards.find(function (c) { return c && c.id && maField.indexOf(String(c.id) + '-') === 0; });
    if (maLiveCard) {
      var maRest = maField.slice(String(maLiveCard.id).length + 1);
      var maLiveTarget = maLiveCard.target || maLiveCard.term || '';
      var maKindLabel = maRest === 'draft' ? 'draft' : maRest === 'reasoning' ? 'reasoning' : maRest === 'visual-description' ? 'visual description' : maRest.replace(/-/g, ' ');
      var maPromptTxt = maRest === 'draft' ? (maLiveCard.studentPrompt || '') : maRest === 'reasoning' ? (maLiveCard.reasoningPrompt || '') : '';
      return 'Memory aid ' + maKindLabel + (maLiveTarget ? ' (' + siResponseText(maLiveTarget, 200) + ')' : '') + (maPromptTxt ? ': ' + siResponseText(maPromptTxt, 400) : '');
    }
  }
  var appliedMatch = bare.match(/^(.+):applied:(.+)$/);
  if (appliedMatch) {
    var apRes = history.find(function (item) { return item && item.type === 'applied-challenge' && String(item.id) === appliedMatch[1]; })
      || (appliedMatch[1] === 'applied-challenge' ? history.find(function (item) { return item && item.type === 'applied-challenge'; }) : null);
    var apData = apRes && apRes.data && typeof apRes.data === 'object' ? apRes.data : null;
    if (apData) {
      var apSub = appliedMatch[2].replace(/:free-response$/, '');
      var AP_PHASE_LABELS = {
        workingQuestion: '1. Frame the challenge',
        stakeholders: '2. Map people, systems, and constraints',
        possibilities: '3. Generate possibilities',
        evidence: '4. Connect evidence and lesson ideas',
        assumptions: '5. Name assumptions and uncertainties',
        tradeoffs: '6. Weigh tradeoffs and alternatives',
        response: '7. Build the deliverable',
        testReflection: '8. Test or challenge the draft',
        revision: '9. Keep or revise after checking',
        transferReflection: '10. Explain the transfer'
      };
      if (Object.prototype.hasOwnProperty.call(AP_PHASE_LABELS, apSub)) {
        var apPhasePrompts = apData.supports && apData.supports.phasePrompts && typeof apData.supports.phasePrompts === 'object' ? apData.supports.phasePrompts : {};
        var apBrief = apData.brief && typeof apData.brief === 'object' ? apData.brief : {};
        var apPromptTxt = apPhasePrompts[apSub] || (apSub === 'workingQuestion' ? (apBrief.drivingQuestion || apBrief.question || '') : '');
        return 'Applied challenge (' + AP_PHASE_LABELS[apSub] + ')' + (apPromptTxt ? ': ' + siResponseText(apPromptTxt, 500) : '');
      }
      var apLedgerMatch = apSub.match(/^ledger-(\d+)-(claim|evidence|tradeoff)$/);
      if (apLedgerMatch) {
        return 'Applied challenge evidence ledger row ' + apLedgerMatch[1] + ' (' + apLedgerMatch[2] + ')';
      }
      var apSelfMatch = apSub.match(/^selfcheck-(.+?)(?::rating)?$/);
      if (apSelfMatch) {
        var apScKey = apSelfMatch[1];
        var apBriefSc = apData.brief && typeof apData.brief === 'object' ? apData.brief : {};
        var apScText = '';
        var cIdxM = apScKey.match(/^criterion-(\d+)$/);
        var kIdxM = apScKey.match(/^constraint-(\d+)$/);
        if (cIdxM && Array.isArray(apBriefSc.criteria)) apScText = apBriefSc.criteria[Number(cIdxM[1])] || '';
        else if (kIdxM && Array.isArray(apBriefSc.constraints)) apScText = apBriefSc.constraints[Number(kIdxM[1])] || '';
        if (!apScText && Array.isArray(apBriefSc.criteriaItems)) {
          var foundCrit = apBriefSc.criteriaItems.find(function (r) { return r && String(r.id) === apScKey; });
          if (foundCrit && foundCrit.text) apScText = foundCrit.text;
        }
        if (!apScText && Array.isArray(apBriefSc.constraintItems)) {
          var foundCons = apBriefSc.constraintItems.find(function (r) { return r && String(r.id) === apScKey; });
          if (foundCons && foundCons.text) apScText = foundCons.text;
        }
        return 'Applied challenge self-check: ' + siResponseText(apScText || apScKey, 400);
      }
      return 'Applied challenge (' + siResponseText(apSub, 100) + ')';
    }
  }
  var dirMatch = bare.match(/^(.+):directions:(goals|goal:(\d+)|choice)$/);
  if (dirMatch) {
    var dirRes = history.find(function (item) { return item && item.type === 'directions' && String(item.id) === dirMatch[1]; })
      || (dirMatch[1] === 'directions' ? history.find(function (item) { return item && item.type === 'directions'; }) : null);
    var dirData = dirRes && dirRes.data && typeof dirRes.data === 'object' ? dirRes.data : null;
    if (dirData) {
      var dirGoals = (Array.isArray(dirData.objectives) ? dirData.objectives : []).filter(function (g) { return g && typeof g.label === 'string' && g.label.trim() && g.kind !== 'game' && g.kind !== 'xp'; });
      if (dirMatch[2] === 'goals') {
        var gLabels = dirGoals.map(function (g) { return g.label.trim(); });
        return gLabels.length ? ('Directions goals: ' + siResponseText(gLabels.join('; '), 500)) : 'Directions goals checklist';
      }
      if (dirMatch[3] != null) {
        var oneGoal = dirGoals[Number(dirMatch[3])];
        if (oneGoal && oneGoal.label) return 'Directions goal: ' + siResponseText(oneGoal.label, 400);
      }
      if (dirMatch[2] === 'choice') {
        var dirBoard = dirData.choiceBoard && typeof dirData.choiceBoard === 'object' ? dirData.choiceBoard : {};
        var dirChoicePrompt = dirBoard.prompt || dirBoard.title || dirRes.title || '';
        return 'Directions activity choice' + (dirChoicePrompt ? ': ' + siResponseText(dirChoicePrompt, 400) : '');
      }
    }
  }
  return '';
}

function siResponseResourcePrefix(key) {
  var bare = String(key || '').replace(/^allo-response:/, '');
  if (!bare) return '';
  var gw = bare.match(/^(glossary-worksheet:[^:]+):/);
  if (gw && gw[1]) return gw[1];
  var m = bare.match(/^(.+?):(?:q\d+:|dbq:|math:\d+:|timeline(?:-date)?:|note:|(?:\d+|paragraph-\d+):sentence-frame$|(?:kwl|outline):|ac:|cloze:|reflection:|venn:|concept-sort:|card\d+:|applied:|directions:|match:|matching:|order:|ordering:)/);
  if (m && m[1]) return m[1];
  var colon = bare.indexOf(':');
  return colon > 0 ? bare.slice(0, colon) : bare;
}

function siCalibrationSamplesForKey(anchors, responseKey, exemplar, scope) {
  var list = Array.isArray(anchors) ? anchors : [];
  var sc = scope && typeof scope === 'object' ? scope : null;
  var scopeDocId = sc && sc.docId ? String(sc.docId).trim() : '';
  var scopeAssignId = sc && sc.assignmentId ? String(sc.assignmentId).trim() : '';
  var scopeFormId = sc && sc.formId ? String(sc.formId).trim() : '';
  var scopeDocTitle = sc && sc.docTitle ? String(sc.docTitle).trim() : '';
  var scopedList = list.filter(function (a) {
    if (!a) return false;
    if (a.docId && scopeDocId && String(a.docId).trim() !== scopeDocId) return false;
    if (a.assignmentId && scopeAssignId && String(a.assignmentId).trim() !== scopeAssignId) return false;
    if (a.formId && scopeFormId && String(a.formId).trim() !== scopeFormId) return false;
    if (a.docTitle && scopeDocTitle && String(a.docTitle).trim() !== scopeDocTitle) return false;
    return true;
  });
  var targetPrefix = siResponseResourcePrefix(responseKey);
  var specific = scopedList.filter(function (a) { return a.fromResponseKey && a.fromResponseKey === responseKey; });
  var unkeyed = scopedList.filter(function (a) { return !a.fromResponseKey; });
  var sameResourceFallback = scopedList.filter(function (a) {
    if (!a.fromResponseKey || a.fromResponseKey === responseKey) return false;
    var anchorPrefix = siResponseResourcePrefix(a.fromResponseKey);
    return !!(targetPrefix && anchorPrefix && anchorPrefix === targetPrefix);
  });
  var ordered = specific.length > 0
    ? specific.concat(unkeyed)
    : unkeyed.concat(sameResourceFallback);
  var samples = ordered.slice(0, 5).map(function (a) {
    return {
      studentResponse: a.studentResponse,
      teacherScore: a.teacherScore,
      teacherFeedback: a.teacherFeedback || ''
    };
  });
  var ex = typeof exemplar === 'string' ? exemplar.trim() : '';
  if (ex && samples.length < 5) {
    samples.push({
      studentResponse: ex,
      teacherScore: 95,
      teacherFeedback: 'Teacher-provided exemplar — full credit anchor.'
    });
  }
  return samples.slice(0, 5);
}

// ── Role Swap (2026-11-04) ──────────────────────────────────────────────────
// A persona-reflection with config.kind 'role-swap' is AI-free learner work:
// answers in a historical figure's voice, each with quoted evidence. The teacher
// scores it by hand; its grade key ('role-swap:<roleSwapKey>') rides grades[idx]
// beside response keys, so Save to gradebook, CSV and AlloSheet carry it
// unchanged. The file is untrusted: every field is bounded, and "found in
// source" is re-checked against the teacher's own persona copy when one exists.
function siRoleSwapNorm(value) {
  return String(value || '').toLocaleLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim().replace(/^["'….\s]+|["'….\s]+$/g, '');
}

function siRoleSwapTeacherExcerpt(resourceId, teacherHistory) {
  var id = siResponseText(resourceId, 240);
  if (!id || !Array.isArray(teacherHistory)) return null;
  var matches = teacherHistory.filter(function (h) { return h && h.type === 'persona' && String(h.id) === id; });
  var src = matches.length === 1 && matches[0].config && typeof matches[0].config === 'object' ? matches[0].config.personaSource : null;
  return src && typeof src.excerpt === 'string' && src.excerpt.trim() ? siRoleSwapNorm(src.excerpt) : null;
}

function siRoleSwapModel(item, teacherHistory) {
  var cfg = item && typeof item === 'object' && item.type === 'persona-reflection' && item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config : null;
  var rs = cfg && cfg.kind === 'role-swap' && cfg.roleSwap && typeof cfg.roleSwap === 'object' ? cfg.roleSwap : null;
  if (!rs || !Array.isArray(rs.entries)) return null;
  var excerpt = siRoleSwapTeacherExcerpt(cfg.personaResourceId, teacherHistory);
  var entries = rs.entries.slice(0, 14).map(function (e) {
    if (!e || typeof e !== 'object') return null;
    var evidence = siResponseText(e.evidence, 1000);
    var evidenceKey = siRoleSwapNorm(evidence);
    var found = excerpt !== null ? (evidenceKey.length >= 12 && excerpt.indexOf(evidenceKey) >= 0) : e.evidenceInSource === true;
    return { speaker: siResponseText(e.speaker, 160), question: siResponseText(e.question, 500), answer: siResponseText(e.answer, 4000), evidence: evidence, evidenceInSource: !!evidence && found };
  }).filter(function (e) { return e && e.question && e.answer; });
  if (!entries.length) return null;
  var sc = rs.selfCheck && typeof rs.selfCheck === 'object' ? rs.selfCheck : {};
  var participants = (Array.isArray(rs.participants) ? rs.participants : []).slice(0, 6).map(function (n) { return siResponseText(n, 160); }).filter(Boolean);
  var text = entries.map(function (e) {
    return e.question + '\n' + e.answer + (e.evidence ? '\nEvidence: ' + e.evidence + (e.evidenceInSource ? ' (found in source)' : '') : '');
  }).join('\n\n');
  return {
    key: 'role-swap:' + (siResponseText(cfg.roleSwapKey || item.id, 200) || 'item'),
    title: siResponseText(item.title, 120) || 'Role Swap',
    subject: participants.join(' & '),
    entries: entries,
    selfCheck: { inCharacter: sc.inCharacter === true, usesEvidence: sc.usesEvidence === true, accurate: sc.accurate === true },
    checkedAgainstTeacherCopy: excerpt !== null,
    text: text.slice(0, 12000)
  };
}

function siRoleSwapItems(payload, teacherHistory) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var out = [];
  var seen = Object.create(null);
  (Array.isArray(p.content) ? p.content : []).forEach(function (item, index) {
    if (out.length >= 10) return;
    var model = siRoleSwapModel(item, teacherHistory);
    if (!model) return;
    var key = model.key;
    for (var n = 2; seen[key]; n++) key = model.key + '#' + n;
    seen[key] = true;
    model.key = key;
    model.contentIndex = index;
    out.push(model);
  });
  return out;
}

// Saved gradebook responses gain the readable text of each SCORED Role Swap so
// the CSV StudentResponse column is not blank; untouched otherwise.
function siResponsesWithRoleSwaps(payload, rowGrades, teacherHistory) {
  var responses = payload && payload.responses;
  var scored = siRoleSwapItems(payload, teacherHistory).concat(siStudentStoryItems(payload)).filter(function (rs) { return rowGrades && rowGrades[rs.key]; });
  if (!scored.length) return responses;
  var out = Object.assign({}, responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {});
  scored.forEach(function (rs) { out[rs.key] = rs.text; });
  return out;
}

// ── Student-written adventure (2026-11-04) ─────────────────────────────────
// An 'adventure' item with data.kind 'student-story' is a branching story the
// learner wrote with no AI (adventure_offline_source.jsx, student author mode).
// Shown as a readable outline with a Play preview (AdventureOffline.Player when
// the adventure module is loaded) and scored by hand like Role Swap: grade key
// 'student-story:<id>' rides grades[idx]. Untrusted file: every field is bounded,
// pictures are dropped, and "ready" is recomputed here, never read from the file.
var SI_STORY_CHECKS = [['clearProblem', 'My story has a clear problem'], ['choicesMatter', 'Every choice matters'], ['twoEndings', 'It has at least two endings']];

function siStudentStoryModel(item) {
  var d = item && typeof item === 'object' && item.type === 'adventure' && item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : null;
  var raw = d && d.kind === 'student-story' && d.studentStory && typeof d.studentStory === 'object' && !Array.isArray(d.studentStory) ? d.studentStory : null;
  if (!raw || !Array.isArray(raw.scenes)) return null;
  var seen = Object.create(null);
  var scenes = raw.scenes.slice(0, 60).map(function (sc) {
    if (!sc || typeof sc !== 'object') return null;
    var id = siResponseText(sc.id, 40);
    if (!id || seen[id]) return null;
    seen[id] = true;
    var ending = sc.ending === true;
    var choices = ending ? [] : (Array.isArray(sc.choices) ? sc.choices : []).slice(0, 4).map(function (c) {
      return c && typeof c === 'object' ? { label: siResponseText(c.label, 200), to: siResponseText(c.to, 40) } : null;
    }).filter(Boolean);
    return { id: id, text: siResponseText(sc.text, 2000), ending: ending, choices: choices };
  }).filter(Boolean);
  if (!scenes.length) return null;
  var number = Object.create(null);
  scenes.forEach(function (sc, i) { number[sc.id] = i + 1; });
  var start = siResponseText(raw.start, 40);
  if (!number[start]) start = scenes[0].id;
  var sc0 = d.selfCheck && typeof d.selfCheck === 'object' ? d.selfCheck : {};
  var selfCheck = {};
  SI_STORY_CHECKS.forEach(function (pair) { selfCheck[pair[0]] = sc0[pair[0]] === true; });
  var title = siResponseText(raw.title || item.title, 120) || 'Adventure';
  var text = [title].concat(scenes.map(function (sc) {
    return 'Scene ' + number[sc.id] + (sc.id === start ? ' (start)' : '') + (sc.ending ? ' (ending)' : '') + ': ' + sc.text
      + sc.choices.map(function (c) { return '\n  -> ' + c.label + ' (Scene ' + (number[c.to] || '?') + ')'; }).join('');
  })).join('\n\n');
  return {
    key: 'student-story:' + (siResponseText(item.id, 200) || 'item'),
    title: title,
    start: start,
    scenes: scenes,
    number: number,
    endings: scenes.filter(function (sc) { return sc.ending; }).length,
    selfCheck: selfCheck,
    story: { version: 1, title: title, start: start, scenes: scenes },
    text: text.slice(0, 12000)
  };
}

function siStudentStoryItems(payload) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var out = [];
  var seen = Object.create(null);
  (Array.isArray(p.content) ? p.content : []).forEach(function (item, index) {
    if (out.length >= 10) return;
    var model = siStudentStoryModel(item);
    if (!model) return;
    var key = model.key;
    for (var n = 2; seen[key]; n++) key = model.key + '#' + n;
    seen[key] = true;
    model.key = key;
    model.contentIndex = index;
    out.push(model);
  });
  return out;
}

// Ending reflections a learner wrote after playing the teacher's offline adventure
// (adventure_offline_source.jsx, data.kind 'offline-reflection'). Read-only text, not scored.
function siAdventureReflectionItems(payload) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var out = [];
  (Array.isArray(p.content) ? p.content : []).forEach(function (item) {
    if (out.length >= 10) return;
    var d = item && typeof item === 'object' && item.type === 'adventure' && item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : null;
    if (!d || d.kind !== 'offline-reflection' || !Array.isArray(d.reflections)) return;
    var entries = d.reflections.slice(0, 60).map(function (e) {
      return e && typeof e === 'object' ? { ending: siResponseText(e.ending, 300), text: siResponseText(e.text, 1000) } : null;
    }).filter(function (e) { return e && e.text; });
    if (entries.length) out.push({ title: siResponseText(d.storyTitle || item.title, 120) || 'Adventure', entries: entries });
  });
  return out;
}

// Playable story for the preview, or null (module not loaded, or the story still has problems).
function siStudentStoryPlayable(model) {
  var api = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AdventureOffline;
  if (!api || typeof api.normalize !== 'function' || typeof api.validate !== 'function' || typeof api.Player !== 'function') return null;
  try {
    var story = api.normalize(model.story);
    return api.validate(story).ok ? story : null;
  } catch (e) { return null; }
}

// Human-readable response manifest (submission schema v3). Student files are
// untrusted input: normalize every field, cap sizes, and independently decide
// which response types may enter the free-response AI grader.
var SI_RESPONSE_MANIFEST_SCHEMA_VERSION = 1;
var SI_RESPONSE_ENTRY_LIMIT = 500;
var SI_AI_FREEFORM_RESPONSE_TYPES = ['short-answer', 'self-explanation', 'reflection', 'free-response', 'sentence-frame', 'reasoning'];
var SI_AI_FREEFORM_RESPONSE_SUFFIXES = ['short', 'explanation', 'reflection', 'free-response', 'short-answer', 'self-explanation', 'sentence-frame', 'reasoning'];
var SI_STRUCTURED_RESPONSE_SUFFIXES = [
  'mcq', 'multi', 'fill', 'sequence-verdict', 'sequence-item', 'sequence-principle',
  'wrong-pair', 'partner', 'answer', 'evidence', 'number', 'unit',
  'cloze-blank', 'match', 'order', 'goals', 'choice', 'placement', 'category'
];

function siResponseText(value, max) {
  var text = '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') text = String(value);
  else if (value != null) {
    try { text = JSON.stringify(value); } catch (e) { text = ''; }
  }
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').trim().slice(0, max || 4000);
}

function siIsSelfCheckResponse(key, responseType, questionType) {
  var rt = siResponseText(responseType, 60).toLowerCase();
  var qt = siResponseText(questionType, 60).toLowerCase();
  if (rt === 'self-check' || qt === 'self-check') return true;
  var k = siResponseText(key, 240).toLowerCase();
  return /:applied:selfcheck-[^:]+:rating(?::|$)/i.test(k);
}

function siResponseManifestMap(payload) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var raw = p.responseManifest;
  var out = Object.create(null);
  // Only the documented neutral-manifest shape is accepted. A future or
  // malformed version must fail closed instead of changing grader routing.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
      || Number(raw.schemaVersion) !== SI_RESPONSE_MANIFEST_SCHEMA_VERSION
      || !Array.isArray(raw.entries)) return out;
  var list = raw.entries;
  list.slice(0, SI_RESPONSE_ENTRY_LIMIT).forEach(function(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    var key = siResponseText(entry.key, 240);
    if (!key || Object.prototype.hasOwnProperty.call(out, key)) return;
    var labels = Object.create(null);
    var rawLabels = entry.valueLabels && typeof entry.valueLabels === 'object' && !Array.isArray(entry.valueLabels)
      ? entry.valueLabels : {};
    Object.keys(rawLabels).slice(0, 60).forEach(function(value) {
      var safeValue = siResponseText(value, 120);
      var safeLabel = siResponseText(rawLabels[value], 240);
      if (safeValue && safeLabel) labels[safeValue] = safeLabel;
    });
    var qType = siResponseText(entry.questionType, 60).toLowerCase();
    var isSelfCheck = siIsSelfCheckResponse(key, entry.responseType, qType);
    out[key] = {
      key: key,
      question: siResponseText(entry.question, 500),
      partLabel: siResponseText(entry.partLabel, 120),
      responseType: siResponseText(entry.responseType, 60).toLowerCase(),
      questionType: qType,
      isSelfCheck: isSelfCheck,
      valueLabels: labels,
      manualReview: entry.manualReview === true
    };
  });
  return out;
}

function siIsKnownFreeformKey(key, suffix) {
  if (SI_AI_FREEFORM_RESPONSE_SUFFIXES.indexOf(suffix) >= 0) return true;
  if (/:reflection:\d+$/.test(key)) return true;
  if (/:kwl:\d+$/.test(key)) return true;
  if (/:math:\d+:work$/.test(key)) return true;
  if (/:card\d+:draft$/.test(key)) return true;
  if (/:memory:[^:]+$/.test(key)) return true;
  if (/:note:(?:summary|hypothesis|data|analysis|conclusion|favorite-?line|thinkings|connection|question|(?:notes|response|answer|cue):\d+)$/.test(key)) return true;
  if (/:applied:(?!selfcheck-[^:]+:rating$)[^:]+$/.test(key)) return true;
  return false;
}

function siResponseRequiresManualReview(entry) {
  if (!entry) return true;
  if (entry.isSelfCheck === true || siIsSelfCheckResponse(entry.key, entry.responseType, entry.questionType)) return false;
  var key = siResponseText(entry.key, 240).toLowerCase();
  var type = siResponseText(entry.responseType, 60).toLowerCase();
  var keyParts = key.split(':');
  var suffix = keyParts.pop();
  var prevPart = keyParts.length ? keyParts[keyParts.length - 1] : '';
  var isAppliedField = /:applied:(?!selfcheck-[^:]+:rating$)[^:]+$/.test(key);
  var isNoteFreeform = /:note:(?:summary|hypothesis|data|analysis|conclusion|favorite-?line|thinkings|connection|question|(?:notes|response|answer|cue):\d+)$/.test(key);
  if (key.indexOf('allo-mcq:') === 0) return true;
  if (!isAppliedField && !isNoteFreeform && SI_STRUCTURED_RESPONSE_SUFFIXES.indexOf(suffix) >= 0) return true;
  if (/^\d+$/.test(suffix) && (prevPart === 'match' || prevPart === 'order')) return true;
  // Legacy textareas are free response. Legacy interactive blanks are cloze /
  // fill-in fields and need teacher review without a trusted answer adapter.
  if (key.indexOf('allo-ta:') === 0) return false;
  if (key.indexOf('allo-bx:') === 0) return true;
  // New payloads promise a complete, versioned manifest. Missing rows and
  // unsupported versions are review-only rather than silently AI-gradable.
  if (entry.payloadSchemaVersion >= 3 || entry.manifestDeclared === true) {
    if (entry.manifestSupported !== true || entry.hasManifest !== true) return true;
  }
  // Named responses are AI-gradable only when both their stable key pattern
  // and neutral type identify a free-form field. Neither alone is trusted.
  if (entry.hasManifest === true) {
    if (entry.manualReview === true) return true;
    return SI_AI_FREEFORM_RESPONSE_TYPES.indexOf(type) < 0
      || !siIsKnownFreeformKey(key, suffix);
  }
  // Backward compatibility for schema-v2 named text responses.
  if (siIsKnownFreeformKey(key, suffix)) return false;
  if (entry.manualReview === true) return true;
  return true;
}

function siDisplayResponseValue(rawText, valueLabels) {
  var raw = siResponseText(rawText, 12000);
  var labels = valueLabels && typeof valueLabels === 'object' ? valueLabels : {};
  var selected = null;
  if (/^\s*\[/.test(raw)) {
    try { selected = JSON.parse(raw); } catch (e) { selected = null; }
  }
  if (Array.isArray(selected)) {
    return selected.map(function(value) {
      var key = siResponseText(value, 120);
      return Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : key;
    }).filter(Boolean).join(', ');
  }
  return Object.prototype.hasOwnProperty.call(labels, raw) ? labels[raw] : raw;
}

function siResponseEntryModels(payload) {
  var p = payload && typeof payload === 'object' ? payload : {};
  var responses = p.responses && typeof p.responses === 'object' && !Array.isArray(p.responses) ? p.responses : {};
  var contentList = Array.isArray(p.content) ? p.content : [];
  var rawManifest = p.responseManifest;
  var manifestDeclared = rawManifest != null;
  var manifestSupported = !!(rawManifest && typeof rawManifest === 'object' && !Array.isArray(rawManifest)
    && Number(rawManifest.schemaVersion) === SI_RESPONSE_MANIFEST_SCHEMA_VERSION
    && Array.isArray(rawManifest.entries));
  var payloadSchemaVersion = Math.max(0, Number(p.schemaVersion) || 0);
  var manifest = siResponseManifestMap(p);
  function hydrateDirectionsLabels(key, existingLabels) {
    var bareKey = String(key || '').replace(/^allo-response:/, '');
    var dm = bareKey.match(/^(.+):directions:(goals|goal:(\d+)|choice)$/);
    if (!dm) return existingLabels;
    var dirId = dm[1];
    var dirItem = contentList.find(function (it) { return it && it.type === 'directions' && String(it.id || '') === dirId; })
      || (dirId === 'directions' ? contentList.find(function (it) { return it && it.type === 'directions'; }) : null);
    var dirData = dirItem && dirItem.data && typeof dirItem.data === 'object' ? dirItem.data : null;
    if (!dirData) return existingLabels;
    var merged = Object.create(null);
    if (existingLabels && typeof existingLabels === 'object') {
      Object.keys(existingLabels).forEach(function (lk) { merged[lk] = existingLabels[lk]; });
    }
    var appOnly = function (g) { return g && (g.kind === 'game' || g.kind === 'xp'); };
    var goals = (Array.isArray(dirData.objectives) ? dirData.objectives : []).filter(function (g) {
      return g && typeof g.label === 'string' && g.label.trim() && !appOnly(g);
    });
    if (dm[2] === 'goals') {
      goals.forEach(function (g, gi) {
        var lbl = g.label.trim();
        if (!Object.prototype.hasOwnProperty.call(merged, String(gi))) merged[String(gi)] = lbl;
        if (g.id != null && !Object.prototype.hasOwnProperty.call(merged, String(g.id))) merged[String(g.id)] = lbl;
      });
    } else if (dm[3] != null) {
      var oneG = goals[Number(dm[3])];
      if (oneG && typeof oneG.label === 'string' && oneG.label.trim()) {
        var gLbl = oneG.label.trim();
        if (!Object.prototype.hasOwnProperty.call(merged, 'true')) merged['true'] = gLbl;
        if (!Object.prototype.hasOwnProperty.call(merged, 'on')) merged['on'] = gLbl;
        if (!Object.prototype.hasOwnProperty.call(merged, 'checked')) merged['checked'] = gLbl;
      }
    } else if (dm[2] === 'choice') {
      var board = dirData.choiceBoard && typeof dirData.choiceBoard === 'object' ? dirData.choiceBoard : {};
      var rawChoices = Array.isArray(board.choices) ? board.choices : (Array.isArray(board.options) ? board.options : []);
      rawChoices.forEach(function (ch, ci) {
        var cLbl = typeof ch === 'string' ? ch.trim() : (ch && typeof ch === 'object' ? String(ch.label || ch.title || '').trim() : '');
        if (!cLbl) return;
        if (!Object.prototype.hasOwnProperty.call(merged, String(ci))) merged[String(ci)] = cLbl;
        if (ch && typeof ch === 'object' && ch.id != null && !Object.prototype.hasOwnProperty.call(merged, String(ch.id))) {
          merged[String(ch.id)] = cLbl;
        }
      });
    }
    return merged;
  }
  var keys = [];
  var isEmptyPlainObj = function (v) {
    return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;
  };
  Object.keys(responses).forEach(function(key) {
    if (isEmptyPlainObj(responses[key]) && !Object.prototype.hasOwnProperty.call(manifest, key)) return;
    if (keys.indexOf(key) < 0) keys.push(key);
  });
  if (manifestSupported) Object.keys(manifest).forEach(function(key) { if (keys.indexOf(key) < 0) keys.push(key); });
  return keys.slice(0, SI_RESPONSE_ENTRY_LIMIT).map(function(key, index) {
    var meta = Object.prototype.hasOwnProperty.call(manifest, key) ? manifest[key] : null;
    var hasStoredResponse = Object.prototype.hasOwnProperty.call(responses, key);
    var rawText = hasStoredResponse ? siResponseText(responses[key], 12000) : '';
    var answered = hasStoredResponse && rawText !== '';
    var isSelfCheck = !!((meta && meta.isSelfCheck) || siIsSelfCheckResponse(key, meta && meta.responseType, meta && meta.questionType));
    var effectiveLabels = hydrateDirectionsLabels(key, (meta && meta.valueLabels) || Object.create(null));
    var formattedSnap = (hasStoredResponse && siAssessmentSnapshot(responses[key])) ? siFormatAssessmentSnapshotText(responses[key]) : '';
    var displayVal = formattedSnap || siDisplayResponseValue(rawText, effectiveLabels);
    var model = {
      key: key,
      rawText: rawText,
      displayValue: displayVal,
      question: (meta && meta.question) || ('Response ' + (index + 1)),
      partLabel: (meta && meta.partLabel) || '',
      responseType: (meta && meta.responseType) || 'legacy-response',
      questionType: (meta && meta.questionType) || '',
      isSelfCheck: isSelfCheck,
      valueLabels: effectiveLabels,
      manualReview: !!(meta && meta.manualReview),
      hasManifest: !!meta,
      answered: answered,
      expectedFromManifest: !!meta && manifestSupported,
      expectedCountKnown: manifestSupported,
      metadataUnverified: !!meta,
      manifestDeclared: manifestDeclared,
      manifestSupported: manifestSupported,
      payloadSchemaVersion: payloadSchemaVersion
    };
    model.requiresManualReview = isSelfCheck ? false : (!answered || siResponseRequiresManualReview(model));
    model.aiGradable = answered && !isSelfCheck && !model.requiresManualReview;
    return model;
  });
}

// ── Quiz responses scored against the teacher's own copy (2026-09-28) ──────
// The student quiz view records answers for Submit Work as an
// "alloflow-assessment-responses" snapshot under the quiz's resource id. A
// graded quiz reaches students without its key, so the only place to check it
// is here: match the resource id to this project's quiz and score each answer
// with the live-quiz grader. The snapshot is untrusted input; every field is
// bounded, and a missing or ambiguous teacher copy is said plainly.
var SI_ASSESSMENT_KIND = 'alloflow-assessment-responses';
var SI_ASSESSMENT_REVIEW_TYPES = ['short-answer', 'self-explanation'];

function siAssessmentSnapshot(value) {
  var v = value;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return null; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (v.kind === SI_ASSESSMENT_KIND) return v;
  var submitted = v.assessmentSubmitted && typeof v.assessmentSubmitted === 'object' && v.assessmentSubmitted.kind === SI_ASSESSMENT_KIND ? v.assessmentSubmitted : null;
  var draft = v.assessmentDraft && typeof v.assessmentDraft === 'object' && v.assessmentDraft.kind === SI_ASSESSMENT_KIND ? v.assessmentDraft : null;
  return submitted || draft;
}

function siFormatAssessmentSnapshotText(value) {
  var snap = siAssessmentSnapshot(value);
  if (!snap) return '';
  var list = Array.isArray(snap.items) ? snap.items : (Array.isArray(snap.responses) ? snap.responses : []);
  var lines = [];
  list.slice(0, 300).forEach(function (raw, idx) {
    if (!raw || typeof raw !== 'object') return;
    var num = Number.isInteger(raw.number) && raw.number > 0 ? raw.number
      : (typeof raw.index === 'number' && Number.isFinite(raw.index) ? raw.index + 1 : idx + 1);
    var qTxt = siResponseText(raw.question, 300);
    var isIdk = !!(raw.idk || (raw.answer && raw.answer.idk === true));
    var respVal = raw.response !== undefined && raw.response !== null && String(raw.response).trim() !== ''
      ? raw.response
      : (raw.answer && typeof raw.answer === 'object'
        ? (raw.answer.optionText || raw.answer.text || (Array.isArray(raw.answer.selectedOptions) ? raw.answer.selectedOptions.join(', ') : ''))
        : '');
    var ansTxt = isIdk
      ? "I don't know yet"
      : (Array.isArray(respVal)
        ? respVal.map(function (x) { return siResponseText(x, 200); }).filter(Boolean).join(', ')
        : (respVal !== undefined && respVal !== null && String(respVal).trim() !== '' ? siResponseText(respVal, 1000) : 'No answer'));
    var reasoningTxt = siResponseText(raw.reasoning || (raw.answer && raw.answer.reasoning) || '', 500);
    lines.push('Q' + num + (qTxt ? '. ' + qTxt : '') + ': ' + ansTxt + (reasoningTxt ? ' (Reasoning: ' + reasoningTxt + ')' : ''));
  });
  var refls = Array.isArray(snap.reflections) ? snap.reflections : [];
  refls.slice(0, 20).forEach(function (rf) {
    if (!rf || typeof rf !== 'object') return;
    var pTxt = siResponseText(rf.prompt, 300);
    var rTxt = siResponseText(rf.response, 1000);
    if (!pTxt && !rTxt) return;
    lines.push('Reflection: ' + (pTxt ? pTxt + ' — ' : '') + (rTxt || 'No answer'));
  });
  return lines.join('\n');
}

function siAssessmentComparable(value) {
  return siResponseText(value, 500).replace(/\s+/g, ' ').trim().toLowerCase();
}

function siIsTfType(raw) {
  var k = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
  return k === 'true-false' || k === 'truefalse' || k === 'tf';
}

function siNormQuizType(raw) {
  var k = String(raw == null ? 'mcq' : raw).trim().toLowerCase().replace(/_/g, '-');
  if (!k || k === 'multiple-choice' || k === 'multiple-choice-question' || k === 'single-select' || siIsTfType(k)) return 'mcq';
  if (k === 'shortanswer' || k === 'short-answer') return 'short-answer';
  if (k === 'order' || k === 'ordering' || k === 'sequence') return 'ordering';
  if (k === 'multiselect' || k === 'multi-select') return 'multi-select';
  if (k === 'fillblank' || k === 'fill-blank' || k === 'fill-in-blank') return 'fill-blank';
  if (k === 'numeric') return 'numeric-response';
  if (k === 'match') return 'matching';
  return k;
}

// Only the learner's own choice travels to the grader: option TEXT for choice
// items (robust to a reordered copy), indices only where the item has no text.
function siAssessmentAnswerForGrading(rawType, row) {
  var type = siNormQuizType(rawType);
  var a = row && row.answer && typeof row.answer === 'object' && !Array.isArray(row.answer) ? row.answer : null;
  var response = siResponseText(row && row.response, 4000);
  if (a && a.idk === true) return { idk: true };
  if (type === 'mcq') {
    var optionText = a && typeof a.optionText === 'string' && a.optionText ? a.optionText : response;
    if (optionText) return { optionText: optionText };
    if (a && Number.isInteger(a.optionIdx)) return { optionIdx: a.optionIdx };
    return null;
  }
  if (type === 'multi-select') {
    var picked = a && Array.isArray(a.selectedOptions) ? a.selectedOptions : response ? response.split('; ') : [];
    picked = picked.map(function (entry) { return siResponseText(entry, 500); }).filter(Boolean);
    if (picked.length) return { selectedTexts: picked };
    if (a && Array.isArray(a.selectedIndices) && a.selectedIndices.length) return { selectedIndices: a.selectedIndices };
    return null;
  }
  if (type === 'answer-evidence') {
    return a && (a.answerText || a.evidenceText) ? { answerText: siResponseText(a.answerText, 500), evidenceText: siResponseText(a.evidenceText, 500) } : null;
  }
  if (type === 'numeric-response') {
    if (a && (a.numericValue != null || a.text)) return { text: siResponseText(a.text, 200), numericValue: typeof a.numericValue === 'number' ? a.numericValue : null, unit: siResponseText(a.unit, 80) };
    return response ? { text: response } : null;
  }
  if (type === 'fill-blank') {
    var fill = a && typeof a.text === 'string' ? a.text : response;
    // The AI verdict the learner saw lets the grader send a near-miss to review.
    return fill ? (a && typeof a.aiVerdict === 'string' ? { text: fill, aiVerdict: a.aiVerdict } : { text: fill }) : null;
  }
  if (type === 'sequence-sense' || type === 'relation-mismatch') return a;
  if (type === 'matching' || type === 'ordering') return a || (response ? { text: response } : null);
  return null;
}

function siPureObjectiveAssessmentGrade(question, row, policy, submitted) {
  var q = question && typeof question === 'object' ? question : null;
  if (!q) return { verdict: 'review', scorable: false };
  var rawType = q.itemType || q.type || 'mcq';
  if (/^(?:likert|opinion-mcq)$/i.test(String(rawType))) return { verdict: 'review', scorable: false };
  var revStatus = q.keyCheck && typeof q.keyCheck === 'object' ? q.keyCheck.status : '';
  if (revStatus === 'disputed' || /\[\[\s*KEY\s*:\s*DISPUTED\b/i.test(String(q.factCheck || ''))) {
    return { verdict: 'review', scorable: false };
  }
  var type = siNormQuizType(rawType);
  var partialCredit = !(policy && (policy.partialCredit === false || (policy.liveScoring && policy.liveScoring.partialCredit === false)));
  var resolveOptIdx = function (opts, cand) {
    if (!Array.isArray(opts) || !opts.length || cand == null) return -1;
    if (typeof cand === 'boolean') {
      var bText = cand ? 'true' : 'false';
      var bIdx = opts.findIndex(function (o) { return siAssessmentComparable(o) === bText; });
      if (bIdx >= 0) return bIdx;
      return cand ? 0 : (opts.length > 1 ? 1 : -1);
    }
    if (Number.isInteger(cand)) return (cand >= 0 && cand < opts.length) ? cand : -1;
    var s = String(cand).trim();
    if (!s) return -1;
    var low = siAssessmentComparable(s);
    var tIdx = opts.findIndex(function (o) { return siAssessmentComparable(o) === low; });
    if (tIdx >= 0) return tIdx;
    if (/^[A-Za-z]$/.test(s) && opts.length <= 26) {
      var lIdx = s.toUpperCase().charCodeAt(0) - 65;
      if (lIdx >= 0 && lIdx < opts.length) return lIdx;
    }
    if (/^\d+$/.test(s)) {
      var n = Number(s);
      if (n >= 0 && n < opts.length) return n;
    }
    return -1;
  };
  var lookupPureUnitDef = function (raw) {
    var u = String(raw || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    if (!u) return null;
    var tbl = [
      ['length', 0.001, ['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres']],
      ['length', 0.01, ['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres']],
      ['length', 1, ['m', 'meter', 'meters', 'metre', 'metres']],
      ['length', 1000, ['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres']],
      ['length', 0.0254, ['in', 'inch', 'inches']],
      ['length', 0.3048, ['ft', 'foot', 'feet']],
      ['length', 0.9144, ['yd', 'yard', 'yards']],
      ['length', 1609.344, ['mi', 'mile', 'miles']],
      ['mass', 0.001, ['mg', 'milligram', 'milligrams']],
      ['mass', 1, ['g', 'gram', 'grams']],
      ['mass', 1000, ['kg', 'kilogram', 'kilograms']],
      ['mass', 453.59237, ['lb', 'lbs', 'pound', 'pounds']],
      ['mass', 28.349523125, ['oz', 'ounce', 'ounces']],
      ['volume', 0.001, ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']],
      ['volume', 1, ['l', 'liter', 'liters', 'litre', 'litres']],
      ['time', 1, ['s', 'sec', 'second', 'seconds']],
      ['time', 60, ['min', 'minute', 'minutes']],
      ['time', 3600, ['h', 'hr', 'hour', 'hours']],
      ['time', 86400, ['d', 'day', 'days']]
    ];
    for (var ti = 0; ti < tbl.length; ti++) {
      if (tbl[ti][2].indexOf(u) >= 0) return { dimension: tbl[ti][0], factor: tbl[ti][1] };
    }
    return null;
  };
  var isScorable = false;
  var correctMcqIdx = -1;
  var mcqOpts = [];
  var multiCorrect = [];
  var multiOpts = [];
  var fillTargets = [];
  var numericTargetVal = NaN;
  var aeCorrAns = -1, aeCorrEv = -1, aeAnsOpts = [], aeEvOpts = [];
  var expectedOrder = [];
  var matchPairs = [];
  var seqItems = [], seqPresented = null;
  var rmPairs = [];
  if (type === 'mcq' || type === 'true-false') {
    mcqOpts = Array.isArray(q.options) && q.options.length ? q.options : (siIsTfType(rawType) ? ['True', 'False'] : []);
    var cands = [q.correct, q.correctIndex, q.correctAnswer, q.answer, q.correctOption, q.answerIndex];
    for (var ci = 0; ci < cands.length; ci++) {
      correctMcqIdx = resolveOptIdx(mcqOpts, cands[ci]);
      if (correctMcqIdx >= 0) break;
    }
    isScorable = correctMcqIdx >= 0;
  } else if (type === 'multi-select') {
    multiOpts = Array.isArray(q.options) ? q.options : [];
    var rawMulti = (Array.isArray(q.correctAnswers) && q.correctAnswers.length) ? q.correctAnswers : (Array.isArray(q.correctIndices) ? q.correctIndices : []);
    multiCorrect = Array.from(new Set(rawMulti.map(function (c) { return resolveOptIdx(multiOpts, c); }).filter(function (n) { return n >= 0; }))).sort(function (a, b) { return a - b; });
    isScorable = multiOpts.length > 0 && multiCorrect.length > 0;
  } else if (type === 'fill-blank') {
    fillTargets = [q.expectedFill].concat(Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : []).concat(Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : []).filter(function (v) { return typeof v === 'string' && v.trim(); });
    isScorable = fillTargets.length > 0;
  } else if (type === 'numeric-response') {
    numericTargetVal = siParseNumericInput(q.correctValue).num;
    isScorable = q.correctValue != null && String(q.correctValue).trim() !== '' && Number.isFinite(numericTargetVal);
  } else if (type === 'answer-evidence') {
    aeAnsOpts = Array.isArray(q.answerOptions) ? q.answerOptions : [];
    aeEvOpts = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
    aeCorrAns = resolveOptIdx(aeAnsOpts, q.correctAnswerIndex != null ? q.correctAnswerIndex : (q.answerIndex != null ? q.answerIndex : (q.correctAnswer != null ? q.correctAnswer : q.expectedAnswer)));
    aeCorrEv = resolveOptIdx(aeEvOpts, q.correctEvidenceIndex != null ? q.correctEvidenceIndex : (q.evidenceIndex != null ? q.evidenceIndex : (q.correctEvidence != null ? q.correctEvidence : q.expectedEvidence)));
    isScorable = aeCorrAns >= 0 && aeCorrEv >= 0;
  } else if (type === 'ordering') {
    var ordItems = Array.isArray(q.items) ? q.items : [];
    var explicitOrd = Array.isArray(q.correctOrder) ? q.correctOrder : (Array.isArray(q.correctSequence) ? q.correctSequence : null);
    expectedOrder = explicitOrd ? explicitOrd.slice(0, 100) : ordItems.map(function (_, idx) { return idx; });
    isScorable = expectedOrder.length >= 2
      && (ordItems.length === 0 || expectedOrder.length === ordItems.length)
      && !expectedOrder.some(function (v) { return v == null || (typeof v !== 'string' && typeof v !== 'number'); })
      && new Set(expectedOrder.map(function (v) { return typeof v + ':' + String(v); })).size === expectedOrder.length;
  } else if (type === 'matching') {
    matchPairs = Array.isArray(q.pairs) ? q.pairs : [];
    isScorable = matchPairs.length >= 2 && matchPairs.every(function (pr) {
      return pr && String(pr.left || pr.prompt || '').trim() && String(pr.right || pr.match || pr.answer || '').trim();
    });
  } else if (type === 'sequence-sense') {
    seqItems = Array.isArray(q.items) ? q.items : [];
    var seqWrong = q.intentionallyWrongIndex;
    var seqWrongOk = seqWrong == null || (Number.isInteger(seqWrong) && seqWrong >= 0 && seqWrong < seqItems.length);
    var seqPresentedValid = Array.isArray(q.presentedOrder)
      && q.presentedOrder.length === seqItems.length
      && q.presentedOrder.every(function (v) { return Number.isInteger(v) && v >= 0 && v < seqItems.length; })
      && new Set(q.presentedOrder).size === seqItems.length;
    seqPresented = seqPresentedValid ? q.presentedOrder : null;
    var seqOrderOk = !Array.isArray(q.presentedOrder) || !!seqPresented;
    isScorable = seqItems.length >= 3 && seqWrongOk && seqOrderOk && !!String(q.orderingPrinciple || '').trim();
  } else if (type === 'relation-mismatch') {
    rmPairs = Array.isArray(q.pairs) ? q.pairs : [];
    isScorable = rmPairs.length >= 2
      && rmPairs.every(function (pr) { return pr && String(pr.left || '').trim() && String(pr.right || '').trim(); })
      && Number.isInteger(q.wrongPairIndex) && q.wrongPairIndex >= 0 && q.wrongPairIndex < rmPairs.length
      && !!String(q.correctPartnerForWrong || '').trim();
  }
  if (!row.answered) {
    return row.hasResponse ? { verdict: 'incomplete', scorable: false, fraction: null } : { verdict: 'unanswered', scorable: !!(submitted && isScorable), fraction: (submitted && isScorable) ? 0 : null };
  }
  if (!isScorable) return { verdict: 'review', scorable: false };
  var a = row.answer && typeof row.answer === 'object' && !Array.isArray(row.answer) ? row.answer : {};
  var respText = siResponseText(row.response, 4000);
  if (q.requireReasoning === true && !String(a.explanation || a.reasoning || row.reasoning || '').trim()) {
    return { verdict: 'review', scorable: false };
  }
  if (type === 'mcq' || type === 'true-false') {
    var stuMcq = resolveOptIdx(mcqOpts, a.optionText != null ? a.optionText : (Number.isInteger(a.optionIdx) ? a.optionIdx : respText));
    if (stuMcq < 0) return { verdict: 'review', scorable: false };
    var mcqOk = stuMcq === correctMcqIdx;
    return { verdict: mcqOk ? 'correct' : 'incorrect', scorable: true, fraction: mcqOk ? 1 : 0 };
  }
  if (type === 'multi-select') {
    var pickedSrc = Array.isArray(a.selectedOptions) && a.selectedOptions.length ? a.selectedOptions
      : (Array.isArray(a.selectedIndices) && a.selectedIndices.length ? a.selectedIndices
      : (respText ? respText.split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean) : []));
    var pickedIdx = Array.from(new Set(pickedSrc.map(function (v) { return resolveOptIdx(multiOpts, v); }).filter(function (n) { return n >= 0; })));
    if (!pickedIdx.length) return { verdict: 'review', scorable: false };
    var hitCnt = pickedIdx.filter(function (i) { return multiCorrect.indexOf(i) >= 0; }).length;
    var wrongCnt = pickedIdx.length - hitCnt;
    var exactM = wrongCnt === 0 && hitCnt === multiCorrect.length;
    var fracM = partialCredit ? Math.max(0, Math.min(1, (hitCnt - wrongCnt) / Math.max(1, multiCorrect.length))) : (exactM ? 1 : 0);
    return { verdict: exactM ? 'correct' : (fracM > 0 ? 'partial' : 'incorrect'), scorable: true, fraction: Math.round(fracM * 100) / 100 };
  }
  if (type === 'fill-blank') {
    var fPolicy = q.fillBlankPolicy || (q.spellingPolicy === 'exact' ? 'exact' : 'normalized');
    var stuRaw = typeof a.text === 'string' && a.text ? a.text : respText;
    var normFn = fPolicy === 'exact'
      ? function (s) { return String(s == null ? '' : s).trim(); }
      : function (s) { return siAssessmentComparable(s).replace(/^["'`‘’“”([{]+|["'`‘’“”)\]}.,;:!?…]+$/g, '').trim(); };
    var stuNorm = normFn(stuRaw);
    if (!stuNorm) return { verdict: 'review', scorable: false };
    if (fillTargets.some(function (t) { return normFn(t) === stuNorm; })) return { verdict: 'correct', scorable: true, fraction: 1 };
    if (fPolicy === 'review-variants' || (fPolicy !== 'exact' && String(a.aiVerdict || '').trim().toLowerCase() === 'correct')) {
      return { verdict: 'review', scorable: false };
    }
    return { verdict: 'incorrect', scorable: true, fraction: 0 };
  }
  if (type === 'numeric-response') {
    var parsedStu = siParseNumericInput(typeof a.text === 'string' && a.text ? a.text : respText);
    var stuVal = (typeof a.numericValue === 'number' && Number.isFinite(a.numericValue)) ? a.numericValue : parsedStu.num;
    if (!Number.isFinite(stuVal)) return { verdict: 'review', scorable: false };
    var tolVal = Math.max(0, Number(q.tolerance) || 0);
    var expUnits = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).filter(function (u) { return typeof u === 'string' && u.trim(); });
    var stuUnit = String(a.unit || parsedStu.inlineUnit || '').trim();
    var normU = function (u) { return String(u || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ''); };
    var stuUnitDef = lookupPureUnitDef(stuUnit);
    var unitOk = expUnits.length === 0 || expUnits.some(function (u) {
      if (normU(u) === normU(stuUnit)) return true;
      var expDef = lookupPureUnitDef(u);
      return !!(stuUnitDef && expDef && stuUnitDef.dimension === expDef.dimension && stuUnitDef.factor === expDef.factor);
    });
    var comparableStuVal = stuVal;
    var settingsN = q.numericSettings && typeof q.numericSettings === 'object' ? q.numericSettings : {};
    if (settingsN.allowEquivalentUnits === true && expUnits.length && stuUnit) {
      var targetDef = lookupPureUnitDef(q.unit || expUnits[0]);
      if (stuUnitDef && targetDef && stuUnitDef.dimension === targetDef.dimension) {
        comparableStuVal = stuVal * stuUnitDef.factor / targetDef.factor;
        unitOk = true;
      }
    }
    var valOk = Math.abs(comparableStuVal - numericTargetVal) <= tolVal + 1e-9;
    var configuredVw = settingsN.valueWeight == null ? q.valueWeight : settingsN.valueWeight;
    var vw = expUnits.length === 0 ? 1 : (typeof configuredVw === 'number' && Number.isFinite(configuredVw) ? Math.max(0, Math.min(1, configuredVw)) : 0.5);
    var exactN = (vw === 0 || valOk) && (vw === 1 || unitOk);
    var fracN = partialCredit ? ((valOk ? vw : 0) + (unitOk ? (1 - vw) : 0)) : (exactN ? 1 : 0);
    return { verdict: exactN ? 'correct' : (fracN > 0 ? 'partial' : 'incorrect'), scorable: true, fraction: Math.round(fracN * 100) / 100 };
  }
  if (type === 'answer-evidence') {
    var stuAns = resolveOptIdx(aeAnsOpts, a.answerText != null ? a.answerText : (Number.isInteger(a.answerIdx) ? a.answerIdx : null));
    var stuEv = resolveOptIdx(aeEvOpts, a.evidenceText != null ? a.evidenceText : (Number.isInteger(a.evidenceIdx) ? a.evidenceIdx : null));
    if (stuAns < 0 && stuEv < 0) return { verdict: 'review', scorable: false };
    var hitsAE = (stuAns === aeCorrAns ? 1 : 0) + (stuEv === aeCorrEv ? 1 : 0);
    if (hitsAE === 2) return { verdict: 'correct', scorable: true, fraction: 1 };
    if (hitsAE === 1 && partialCredit) return { verdict: 'partial', scorable: true, fraction: 0.5 };
    return { verdict: 'incorrect', scorable: true, fraction: 0 };
  }
  if (type === 'ordering') {
    var stuOrd = Array.isArray(row.answer) ? row.answer : (a.order || a.orderedIndices || a.selectedOrder || a.sequence);
    if (!Array.isArray(stuOrd) || stuOrd.length !== expectedOrder.length) {
      return { verdict: 'review', scorable: false };
    }
    var ordExact = expectedOrder.every(function (v, idx) { return String(stuOrd[idx]) === String(v); });
    return { verdict: ordExact ? 'correct' : 'incorrect', scorable: true, fraction: ordExact ? 1 : 0 };
  }
  if (type === 'matching') {
    var stuMatchRaw = (a.matches && typeof a.matches === 'object') ? a.matches : ((a.pairs && typeof a.pairs === 'object') ? a.pairs : null);
    if (!stuMatchRaw) return { verdict: 'review', scorable: false };
    var mHits = 0;
    var mAnswered = 0;
    if (Array.isArray(stuMatchRaw)) {
      if (stuMatchRaw.length !== matchPairs.length) return { verdict: 'review', scorable: false };
      for (var mi = 0; mi < matchPairs.length; mi++) {
        var expR = siAssessmentComparable(matchPairs[mi].right || matchPairs[mi].match || matchPairs[mi].answer);
        var expL = siAssessmentComparable(matchPairs[mi].left || matchPairs[mi].prompt);
        var ent = stuMatchRaw[mi];
        var chosenVal = '';
        if (ent && typeof ent === 'object') {
          if (ent.left && siAssessmentComparable(ent.left) !== expL) {
            var foundByL = stuMatchRaw.find(function (x) { return x && typeof x === 'object' && siAssessmentComparable(x.left || x.prompt) === expL; });
            chosenVal = foundByL ? (foundByL.right || foundByL.match || foundByL.answer || '') : '';
          } else {
            chosenVal = ent.right || ent.match || ent.answer || '';
          }
        } else {
          chosenVal = ent;
        }
        var cmpChosen = siAssessmentComparable(chosenVal);
        if (!cmpChosen) continue;
        mAnswered++;
        if (cmpChosen === expR) mHits++;
      }
    } else {
      var rawByNormKey = {};
      Object.keys(stuMatchRaw).forEach(function (k) { rawByNormKey[siAssessmentComparable(k)] = stuMatchRaw[k]; });
      for (var mj = 0; mj < matchPairs.length; mj++) {
        var leftK = siAssessmentComparable(matchPairs[mj].left || matchPairs[mj].prompt);
        var rightExp = siAssessmentComparable(matchPairs[mj].right || matchPairs[mj].match || matchPairs[mj].answer);
        var pick = Object.prototype.hasOwnProperty.call(stuMatchRaw, String(mj))
          ? stuMatchRaw[String(mj)]
          : (Object.prototype.hasOwnProperty.call(rawByNormKey, leftK) ? rawByNormKey[leftK] : '');
        var cmpPick = siAssessmentComparable(pick);
        if (!cmpPick) continue;
        mAnswered++;
        if (cmpPick === rightExp) mHits++;
      }
    }
    if (mAnswered === 0) return { verdict: 'review', scorable: false };
    var mExact = mHits === matchPairs.length;
    var mFrac = partialCredit ? Math.round((mHits / matchPairs.length) * 100) / 100 : (mExact ? 1 : 0);
    return { verdict: mExact ? 'correct' : (mFrac > 0 ? 'partial' : 'incorrect'), scorable: true, fraction: mFrac };
  }
  if (type === 'sequence-sense') {
    var ssCompact = q.sequenceMode === 'arrange-explain';
    var ssVerify = siAssessmentComparable(a.verifyAnswer);
    var ssPrinciple = siAssessmentComparable(a.principleAnswer);
    if ((!ssCompact && ssVerify !== 'yes' && ssVerify !== 'no') || !ssPrinciple) {
      return { verdict: 'review', scorable: false };
    }
    var ssN = seqItems.length;
    var ssTruth = (function () {
      if (!seqPresented || seqPresented.every(function (v, idx) { return v === idx; })) {
        return { orderIsCorrect: true, misplaced: [] };
      }
      var misplaced = [];
      for (var skip = 0; skip < seqPresented.length; skip++) {
        var prev = -1;
        var sorted = true;
        for (var j = 0; j < seqPresented.length; j++) {
          if (j === skip) continue;
          if (seqPresented[j] < prev) { sorted = false; break; }
          prev = seqPresented[j];
        }
        if (sorted) misplaced.push(skip);
      }
      if (misplaced.length) return { orderIsCorrect: false, misplaced: misplaced };
      if (Number.isInteger(q.intentionallyWrongIndex) && q.intentionallyWrongIndex >= 0 && q.intentionallyWrongIndex < ssN) {
        return { orderIsCorrect: false, misplaced: [q.intentionallyWrongIndex] };
      }
      return { orderIsCorrect: false, misplaced: seqPresented.map(function (_, idx) { return idx; }) };
    })();
    var ssStep1 = ssVerify === 'yes' ? ssTruth.orderIsCorrect : !ssTruth.orderIsCorrect;
    var ssStep2 = ssVerify === 'yes' ? ssStep1 : ssTruth.misplaced.indexOf(a.clickedIdx) >= 0;
    var rawOrdAns = Array.isArray(a.orderAnswer) ? a.orderAnswer : null;
    var ssOrderAns = (rawOrdAns && a.orderBasis === 'displayed' && seqPresented)
      ? rawOrdAns.map(function (v) { return Number.isInteger(v) && v >= 0 && v < seqPresented.length ? seqPresented[v] : v; })
      : rawOrdAns;
    var ssArrange = ssOrderAns
      ? ssOrderAns.length === ssN && ssOrderAns.every(function (v, idx) { return v === idx; })
      : null;
    if (ssCompact && (!ssOrderAns || ssOrderAns.length !== ssN || new Set(ssOrderAns).size !== ssN
        || ssOrderAns.some(function (v) { return !Number.isInteger(v) || v < 0 || v >= ssN; }))) {
      return { verdict: 'review', scorable: false };
    }
    var ssStep3 = ssPrinciple === siAssessmentComparable(q.orderingPrinciple);
    var ssMax = ssCompact ? 2 : ssOrderAns ? 4 : 3;
    var ssRawScore = (ssCompact ? 0 : (ssStep1 ? 1 : 0) + (ssStep2 ? 1 : 0)) + (ssArrange ? 1 : 0) + (ssStep3 ? 1 : 0);
    var ssScore = partialCredit ? ssRawScore : (ssRawScore === ssMax ? ssMax : 0);
    var ssFrac = Math.round((ssScore / ssMax) * 100) / 100;
    return { verdict: ssScore === ssMax ? 'correct' : (ssScore > 0 ? 'partial' : 'incorrect'), scorable: true, fraction: ssFrac };
  }
  if (type === 'relation-mismatch') {
    if (!Number.isInteger(a.clickedPairIdx) || !siAssessmentComparable(a.partnerAnswer)) {
      return { verdict: 'review', scorable: false };
    }
    var rmPairOk = a.clickedPairIdx === q.wrongPairIndex;
    var rmPartnerOk = siAssessmentComparable(a.partnerAnswer) === siAssessmentComparable(q.correctPartnerForWrong);
    var rmRaw = (rmPairOk ? 1 : 0) + (rmPartnerOk ? 1 : 0);
    var rmScore = partialCredit ? rmRaw : (rmRaw === 2 ? 2 : 0);
    return { verdict: rmScore === 2 ? 'correct' : (rmScore > 0 ? 'partial' : 'incorrect'), scorable: true, fraction: rmScore / 2 };
  }
  return { verdict: 'review', scorable: false };
}

function siAssessmentGrade(question, row, policy, submitted) {
  var rawType = question && (question.itemType || question.type) || 'mcq';
  var type = siNormQuizType(rawType);
  if (row.answer && row.answer.idk === true) return { verdict: 'skipped', scorable: false, fraction: null };
  var grader = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
  if (!grader || typeof grader.gradePresentationResponse !== 'function') {
    return siPureObjectiveAssessmentGrade(question, row, policy, submitted);
  }
  var qForGrader = question;
  if (question && siIsTfType(rawType)) {
    var tfOpts = Array.isArray(question.options) && question.options.length ? question.options : ['True', 'False'];
    var tfCorr = typeof question.correctAnswer === 'boolean' ? (question.correctAnswer ? 'True' : 'False') : question.correctAnswer;
    qForGrader = Object.assign({}, question, { type: 'mcq', options: tfOpts, correctAnswer: tfCorr });
  } else if (question && String(rawType).trim().toLowerCase() !== type && SI_ASSESSMENT_REVIEW_TYPES.indexOf(type) < 0) {
    var mappedType = type === 'ordering' ? 'order' : type;
    qForGrader = Object.assign({}, question, { type: mappedType });
  }
  var scorable = SI_ASSESSMENT_REVIEW_TYPES.indexOf(type) < 0
    && (typeof grader.presentationQuestionIsGameScorable !== 'function' || grader.presentationQuestionIsGameScorable(qForGrader) === true);
  if (!row.answered) return row.hasResponse ? { verdict: 'incomplete', scorable: false, fraction: null } : { verdict: 'unanswered', scorable: submitted && scorable, fraction: submitted && scorable ? 0 : null };
  if (!scorable) return { verdict: 'review', scorable: false };
  var answer = siAssessmentAnswerForGrading(type, row);
  if (!answer) return { verdict: 'review', scorable: false };
  var grade = null;
  try { grade = grader.gradePresentationResponse({ answer: answer }, qForGrader, policy); } catch (e) { grade = null; }
  if (!grade || grade.evaluable !== true) return { verdict: 'review', scorable: false };
  var fraction = typeof grade.scoreFraction === 'number' && isFinite(grade.scoreFraction)
    ? Math.max(0, Math.min(1, grade.scoreFraction)) : grade.status === 'correct' ? 1 : 0;
  return { verdict: grade.status === 'correct' ? 'correct' : grade.status === 'partially-correct' ? 'partial' : 'incorrect', scorable: true, fraction: fraction };
}

function siAssessmentReport(value, resourceId, history, content) {
  var snap = siAssessmentSnapshot(value);
  if (!snap) return null;
  var id = String(resourceId == null ? '' : resourceId);
  var matches = (Array.isArray(history) ? history : []).filter(function (item) { return item && item.type === 'quiz' && String(item.id) === id; });
  var teacherQuiz = matches.length === 1 ? matches[0] : null;
  var data = teacherQuiz && teacherQuiz.data && typeof teacherQuiz.data === 'object' ? teacherQuiz.data : null;
  var questions = data && Array.isArray(data.questions) && data.answerKeysWithheld !== true ? data.questions : null;
  var grader = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
  var signatureFor = grader && typeof grader.assessmentItemSignature === 'function' ? grader.assessmentItemSignature : null;
  // Rows saved before Sequence Sense signatures used display order still match.
  var legacySignatureFor = grader && typeof grader.legacyAssessmentItemSignature === 'function' ? grader.legacyAssessmentItemSignature : null;
  var signs = function (candidate, signature) { return !!candidate && (signatureFor(candidate) === signature || !!legacySignatureFor && legacySignatureFor(candidate) === signature); };
  var copyStatus = questions ? 'found' : matches.length > 1 ? 'ambiguous' : teacherQuiz ? 'no-key' : 'missing';
  var studentCopy = (Array.isArray(content) ? content : []).find(function (item) { return item && String(item.id) === id; });
  var title = siResponseText((teacherQuiz && teacherQuiz.title) || (studentCopy && studentCopy.title) || '', 160);
  var items = (Array.isArray(snap.items) ? snap.items : []).slice(0, 300).map(function (raw, index) {
    var row = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var number = Number.isInteger(row.number) && row.number > 0 ? row.number : index + 1;
    var questionText = siResponseText(row.question, 500);
    var answered = row.answered === true;
    var hasResponse = answered || row.hasResponse === true || !!siResponseText(row.response, 4000);
    var question = questions ? questions[number - 1] : null;
    var changed = false, versionUnverified = false;
    var signature = typeof row.questionSignature === 'string' ? row.questionSignature : '';
    if (questions && signature && signatureFor) {
      if (!signs(question, signature)) {
        var bySignature = questions.filter(function (candidate) { return signs(candidate, signature); });
        question = bySignature.length === 1 ? bySignature[0] : null;
        changed = !question;
      }
    } else if (questions && (!question || siAssessmentComparable(question.question || question.contextSentence) !== siAssessmentComparable(questionText))) {
      var byText = questions.filter(function (candidate) { return candidate && siAssessmentComparable(candidate.question || candidate.contextSentence) === siAssessmentComparable(questionText); });
      question = byText.length === 1 ? byText[0] : null;
      changed = !question;
    }
    if (question && (!signature || !signatureFor) && ['sequence-sense', 'relation-mismatch'].indexOf(question.type || row.type) >= 0) {
      // Legacy positional answers cannot be remapped safely from prompt text.
      // Keep the learner's description available for human review instead.
      question = null;
      versionUnverified = true;
    }
    var type = siResponseText(siNormQuizType((question && question.type) || row.type || 'mcq'), 60);
    var result = question ? siAssessmentGrade(question, { answered: answered, hasResponse: hasResponse, answer: row.answer, response: row.response }, data.scoringPolicy, snap.status === 'submitted') : { verdict: row.answer && row.answer.idk === true ? 'skipped' : answered ? 'review' : hasResponse ? 'incomplete' : 'unanswered', scorable: false };
    var reference = question && SI_ASSESSMENT_REVIEW_TYPES.indexOf(type) >= 0
      ? siResponseText(question.expectedAnswer || question.rubric || question.sampleAnswer || '', 800) : '';
    return {
      number: number, question: questionText, type: type, answered: answered, hasResponse: hasResponse,
      response: hasResponse ? siResponseText(row.response, 4000) : '',
      confidence: ['knew', 'guessed', 'no-idea'].indexOf(row.confidence) >= 0 ? row.confidence : null,
      verdict: result.verdict, scorable: result.scorable === true, fraction: typeof result.fraction === 'number' ? result.fraction : null,
      reference: reference, changed: changed, versionUnverified: versionUnverified
    };
  });
  var scoredItems = items.filter(function (item) { return item.scorable; });
  var points = scoredItems.reduce(function (sum, item) { return sum + (item.fraction || 0); }, 0);
  var reflections = (Array.isArray(snap.reflections) ? snap.reflections : []).slice(0, 20).map(function (entry) {
    return { prompt: siResponseText(entry && entry.prompt, 500), response: siResponseText(entry && entry.response, 4000) };
  }).filter(function (entry) { return entry.prompt || entry.response; });
  return {
    resourceId: id, title: title, status: snap.status === 'submitted' ? 'submitted' : 'in-progress', copyStatus: copyStatus,
    items: items, reflections: reflections,
    points: Math.round(points * 100) / 100, possible: scoredItems.length,
    percent: scoredItems.length ? Math.round((points / scoredItems.length) * 100) : null,
    needsReview: items.filter(function (item) { return item.verdict === 'review' || item.verdict === 'incomplete'; }).length,
    answered: items.filter(function (item) { return item.answered; }).length, total: items.length
  };
}

var SI_ASSESSMENT_VERDICT_STYLE = {
  correct: { label: 'Correct', bg: '#dcfce7', color: '#14532d', border: '#86efac' },
  incorrect: { label: 'Incorrect', bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5' },
  partial: { label: 'Partly correct', bg: '#fef3c7', color: '#78350f', border: '#fcd34d' },
  review: { label: 'Needs your review', bg: '#e0f2fe', color: '#0c4a6e', border: '#7dd3fc' },
  incomplete: { label: 'Partly answered', bg: '#fff7ed', color: '#9a3412', border: '#fdba74' },
  skipped: { label: 'I don’t know yet', bg: '#e0f2fe', color: '#0c4a6e', border: '#7dd3fc' },
  unanswered: { label: 'No answer', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' }
};

function SiAssessmentReport(p) {
  var report = p.report;
  var h = React.createElement;
  var copyNote = report.copyStatus === 'missing'
    ? tr('Your copy of this quiz is not in this project, so answers cannot be checked here. Responses are shown as the student submitted them.')
    : report.copyStatus === 'ambiguous'
      ? tr('More than one quiz in this project has this id, so answers cannot be checked here. Responses are shown as the student submitted them.')
      : report.copyStatus === 'no-key'
        ? tr('The quiz with this id in this project has no answer key, so answers cannot be checked here.')
        : '';
  var summary = report.possible > 0
    ? tr('Score: {points} of {possible} automatically checked ({percent}%)', { points: report.points, possible: report.possible, percent: report.percent })
    : tr('No automatically checked questions');
  return h('section', { 'data-assessment-report': report.resourceId, 'aria-label': tr('Quiz responses') + (report.title ? ': ' + report.title : ''), style: { marginTop: 4, padding: '8px 10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8 } },
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' } },
      h('strong', { style: { color: '#0f172a' } }, report.title || tr('Quiz')),
      h('span', { style: { color: '#334155', fontSize: '0.78rem' } }, report.status === 'submitted' ? tr('Submitted attempt') : tr('In progress (not yet submitted)')),
      h('span', { 'data-assessment-score': true, style: { color: '#0f172a', fontWeight: 700, fontSize: '0.82rem' } }, summary),
      report.needsReview > 0 && h('span', { style: { color: '#0c4a6e', fontSize: '0.78rem' } }, tr('{n} need your review', { n: report.needsReview }))
    ),
    copyNote && h('p', { role: 'note', 'data-assessment-copy-status': report.copyStatus, style: { margin: '6px 0 0', color: '#7c2d12', fontSize: '0.8rem' } }, copyNote),
    h('ol', { style: { margin: '8px 0 0', paddingLeft: 22 } },
      report.items.map(function (item) {
        var style = SI_ASSESSMENT_VERDICT_STYLE[item.verdict] || SI_ASSESSMENT_VERDICT_STYLE.review;
        return h('li', { key: 'q-' + item.number, value: item.number, 'data-assessment-item': item.verdict, style: { marginBottom: 6, fontSize: '0.82rem', color: '#1e293b' } },
          h('div', { style: { fontWeight: 600 } }, item.question ? (window.AlloModules && window.AlloModules.QuizView && window.AlloModules.QuizView.markdown ? window.AlloModules.QuizView.markdown.inline(item.question) : item.question) : tr('Question {n}', { n: item.number })),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'baseline', marginTop: 2 } },
            h('span', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, item.hasResponse ? item.response : tr('No answer submitted')),
            h('span', { style: { padding: '1px 7px', borderRadius: 999, background: style.bg, color: style.color, border: '1px solid ' + style.border, fontWeight: 700, fontSize: '0.7rem' } }, tr(style.label))
          ),
          item.confidence && h('p', { style: { margin: '6px 0 0', fontSize: '0.78rem', color: '#475569' } }, tr('Confidence') + ': ' + tr({ knew: 'I know this', guessed: 'I am unsure', 'no-idea': 'I need support' }[item.confidence])),
          item.reference && h('div', { style: { marginTop: 2, color: '#475569', fontSize: '0.76rem' } }, tr('Reference from your copy:') + ' ' + item.reference),
          item.changed && h('div', { style: { marginTop: 2, color: '#7c2d12', fontSize: '0.74rem' } }, tr('This question no longer matches your copy, so it was not checked.')),
          item.versionUnverified && h('div', { style: { marginTop: 2, color: '#7c2d12', fontSize: '0.74rem' } }, tr('This earlier response has no question-version record. Review it manually because the item order may have changed.'))
        );
      })
    ),
    report.reflections.length > 0 && h('div', { style: { marginTop: 6, fontSize: '0.8rem', color: '#1e293b' } },
      h('div', { style: { fontWeight: 700, color: '#475569' } }, tr('Reflections')),
      report.reflections.map(function (entry, index) {
        return h('div', { key: 'r-' + index, style: { marginTop: 3 } }, h('span', { style: { fontWeight: 600 } }, entry.prompt), entry.prompt ? ' ' : '', h('span', { style: { whiteSpace: 'pre-wrap' } }, entry.response || tr('No answer submitted')));
      })
    )
  );
}


// ── Submission Inbox -> AlloSheet aggregate privacy boundary ──────────────
// The saved gradebook contains raw student responses, feedback, rubric prose,
// names, document titles, and storage keys. This boundary copies none of those
// fields. It works only from entries the educator explicitly saved to the
// local gradebook and emits assignment-level aggregates under transfer-local
// order codes. "Saved" is not represented as "human verified": review state is
// explicit and due-date metadata is validated before late status is derived.
// Missing work remains unavailable without a roster denominator.
var SI_ALLOSHEET_MIN_SCORE_GROUP = 5;
var SI_ALLOSHEET_MAX_ASSIGNMENTS = 50;
var SI_ALLOSHEET_MAX_SOURCE_ENTRIES = 2000;
var SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY = 200;
var SI_ALLOSHEET_DUE_DATE_SCHEMA_VERSION = 1;

function siAlloSheetPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function siAlloSheetAdapter() {
  var adapter = window.AlloSheetTransferAdapter
    || (window.AlloModules && window.AlloModules.AlloSheetTransferAdapter);
  if (!adapter
    || typeof adapter.column !== 'function'
    || typeof adapter.table !== 'function'
    || typeof adapter.envelope !== 'function'
    || typeof adapter.withinDateRange !== 'function') {
    throw new Error('The secure AlloSheet transfer adapter is still loading. Try again in a moment.');
  }
  return adapter;
}

function siAlloSheetTitle(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function siAlloSheetTime(value) {
  if (value instanceof Date) {
    var dateTime = value.getTime();
    return Number.isFinite(dateTime) ? dateTime : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  var text = String(value == null ? '' : value).trim();
  var match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(text);
  if (!match) return null;
  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day) return null;
  var parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function siAlloSheetDueAt(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  var text = String(value == null ? '' : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return null;
  var parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function siAlloSheetDueTimeZone(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text || text.length > 80 || /[\u0000-\u001f\u007f]/.test(text)) return '';
  if (text !== 'UTC' && !/^[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)+$/.test(text)) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: text }).resolvedOptions().timeZone ? text : '';
  } catch (e) { return ''; }
}

function siAlloSheetDueDate(value) {
  if (!siAlloSheetPlainObject(value)) return null;
  var dueAt = siAlloSheetDueAt(value.dueAt);
  if (dueAt === null) return null;
  var timeZone = siAlloSheetDueTimeZone(value.timeZone || value.dueTimeZone);
  var source = String(value.source == null ? '' : value.source).trim().toLowerCase();
  return {
    schemaVersion: SI_ALLOSHEET_DUE_DATE_SCHEMA_VERSION,
    dueAt: new Date(dueAt).toISOString(),
    ...(timeZone ? { timeZone: timeZone } : {}),
    source: source === 'teacher-export' || source === 'teacher-review' ? source : 'legacy'
  };
}

function siAlloSheetLateStatus(submittedTime, dueAtTime) {
  if (!Number.isFinite(submittedTime) || !Number.isFinite(dueAtTime)) return 'unknown_due_date';
  return submittedTime > dueAtTime ? 'late' : 'on_time';
}

function siAlloSheetScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= 0 && value <= 100 ? value : null;
}

function siAlloSheetStatus(value) {
  var status = String(value == null ? '' : value).trim().toLowerCase();
  if (status === 'partially-correct' || status === 'partial') return 'partial';
  if (status === 'correct' || status === 'incorrect' || status === 'unclear' || status === 'error') {
    return status;
  }
  return 'other';
}

function siStableIdentityValue(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text || text.length > 160 || /[\u0000-\u001f\u007f]/.test(text)) return '';
  return text;
}

function siSavedReviewState(value) {
  var state = String(value == null ? '' : value).trim().toLowerCase();
  return state === 'reviewed' ? 'reviewed' : 'not_reviewed';
}

function siGradeOrigin(value) {
  var origin = String(value == null ? '' : value).trim().toLowerCase();
  return origin === 'ai' || origin === 'teacher-anchor' || origin === 'teacher-edit' || siIsAnswerKeyOrigin(origin) ? origin : 'legacy';
}

function siGradeReviewSignature(rowGrades) {
  var source = siAlloSheetPlainObject(rowGrades) ? rowGrades : {};
  return Object.keys(source).sort().map(function(key) {
    var result = siAlloSheetPlainObject(source[key]) ? source[key] : {};
    return JSON.stringify([key, siAlloSheetScore(result.score), siAlloSheetStatus(result.status), String(result.feedback || ''), siGradeOrigin(result.origin)]);
  }).join('|');
}

function siLocalRecordId(prefix) {
  var value = '';
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') value = crypto.randomUUID();
  } catch (e) {}
  if (!value) value = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
  return prefix + '-' + value;
}

function siPrepareAlloSheetSavedSource(input) {
  if (input && input.kind === 'submission-inbox-allosheet-source-v1' && Array.isArray(input.entries)) {
    var preparedInvalid = 0;
    var preparedTruncated = Math.max(
      Math.max(0, input.entries.length - SI_ALLOSHEET_MAX_SOURCE_ENTRIES),
      Math.max(0, Number(input.truncatedEntryCount) || 0)
    );
    var preparedTruncatedResults = Math.max(0, Number(input.truncatedGradeResultCount) || 0);
    var copiedEntries = input.entries.slice(0, SI_ALLOSHEET_MAX_SOURCE_ENTRIES).map(function(entry, index) {
      if (!siAlloSheetPlainObject(entry)) {
        preparedInvalid += 1;
        return null;
      }
      var assignmentKey = String(entry.assignmentKey || '');
      var assignmentLabel = siAlloSheetTitle(entry.assignmentLabel);
      var learnerToken = String(entry.learnerToken || '');
      if (!/^S\d{1,6}$/.test(assignmentKey)
        || !assignmentLabel
        || !/^L\d{1,6}$/.test(learnerToken)) {
        preparedInvalid += 1;
        return null;
      }
      var sourceResults = Array.isArray(entry.gradeResults) ? entry.gradeResults : [];
      preparedTruncatedResults += Math.max(0, sourceResults.length - SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY);
      var results = sourceResults.slice(0, SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY).map(function(result) {
        if (!siAlloSheetPlainObject(result)) return null;
        return {
          score: siAlloSheetScore(result.score),
          status: siAlloSheetStatus(result.status)
        };
      }).filter(Boolean);
      return {
        index: index,
        assignmentKey: assignmentKey,
        assignmentLabel: assignmentLabel,
        learnerToken: learnerToken,
        submittedTime: typeof entry.submittedTime === 'number' && Number.isFinite(entry.submittedTime)
          ? entry.submittedTime : null,
        dueAtTime: siAlloSheetDueAt(entry.dueAtTime || (entry.dueDate && entry.dueDate.dueAt)),
        gradedTime: typeof entry.gradedTime === 'number' && Number.isFinite(entry.gradedTime)
          ? entry.gradedTime : null,
        hasSavedRubric: entry.hasSavedRubric === true,
        stableAssignmentIdentity: entry.stableAssignmentIdentity === true,
        stableLearnerIdentity: entry.stableLearnerIdentity === true,
        reviewState: siSavedReviewState(entry.reviewState),
        gradeResults: results
      };
    }).filter(Boolean);
    return {
      kind: 'submission-inbox-allosheet-source-v1',
      sourceEntryCount: Math.max(copiedEntries.length, Number(input.sourceEntryCount) || 0),
      excludedEntryCount: Math.max(0, Number(input.excludedEntryCount) || 0) + preparedInvalid,
      truncatedEntryCount: preparedTruncated,
      truncatedGradeResultCount: preparedTruncatedResults,
      entries: copiedEntries
    };
  }

  var rawEntries = input && Array.isArray(input.gradebookEntries)
    ? input.gradebookEntries : Array.isArray(input) ? input : [];
  var assignmentTokens = new Map();
  var nextAssignment = 1;
  var learnerTokens = new Map();
  var nextLearner = 1;
  var excluded = 0;
  var truncated = Math.max(0, rawEntries.length - SI_ALLOSHEET_MAX_SOURCE_ENTRIES);
  var truncatedResults = 0;
  var entries = rawEntries.slice(0, SI_ALLOSHEET_MAX_SOURCE_ENTRIES).map(function(entry, index) {
    if (!siAlloSheetPlainObject(entry) || String(entry.source || '') !== 'offline-html') {
      excluded += 1;
      return null;
    }
    var documentTitle = siAlloSheetTitle(entry.docTitle);
    var classTitle = siAlloSheetTitle(entry.className);
    var assignmentLabel = siAlloSheetTitle(classTitle
      ? documentTitle + ' - ' + classTitle : documentTitle);
    var identity = siAlloSheetPlainObject(entry.identity) ? entry.identity : {};
    var stableClassId = siStableIdentityValue(identity.classId || entry.classId);
    var stableAssignmentId = siStableIdentityValue(identity.assignmentId || entry.assignmentId);
    var stableLearnerId = siStableIdentityValue(identity.learnerId || entry.learnerId);
    var hasStableAssignment = !!(stableClassId && stableAssignmentId);
    var hasStableLearner = !!(stableClassId && stableLearnerId);
    var privateAssignmentKey = hasStableAssignment
      ? 'stable\u0000' + stableClassId + '\u0000' + stableAssignmentId
      : 'legacy\u0000' + classTitle.toLocaleLowerCase() + '\u0000' + documentTitle.toLocaleLowerCase();
    var nickname = String(entry.nickname == null ? '' : entry.nickname).trim().toLocaleLowerCase();
    var nicknameKey = hasStableLearner
      ? 'stable\u0000' + stableClassId + '\u0000' + stableLearnerId
      : 'legacy\u0000' + classTitle.toLocaleLowerCase() + '\u0000' + nickname;
    if (!assignmentLabel || !nickname) {
      excluded += 1;
      return null;
    }
    if (!assignmentTokens.has(privateAssignmentKey)) {
      assignmentTokens.set(privateAssignmentKey, 'S' + String(nextAssignment++));
    }
    if (!learnerTokens.has(nicknameKey)) {
      learnerTokens.set(nicknameKey, 'L' + String(nextLearner++));
    }
    var gradeResults = [];
    if (siAlloSheetPlainObject(entry.grades)) {
      var gradeKeys = Object.keys(entry.grades);
      truncatedResults += Math.max(0, gradeKeys.length - SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY);
      gradeKeys.slice(0, SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY).forEach(function(key) {
        var result = entry.grades[key];
        if (!siAlloSheetPlainObject(result)) return;
        gradeResults.push({
          score: siAlloSheetScore(result.score),
          status: siAlloSheetStatus(result.status)
        });
      });
    }
    return {
      index: index,
      assignmentKey: assignmentTokens.get(privateAssignmentKey),
      assignmentLabel: assignmentLabel,
      learnerToken: learnerTokens.get(nicknameKey),
      submittedTime: siAlloSheetTime(entry.submittedAt),
      dueAtTime: siAlloSheetDueAt(entry.dueAt || (entry.dueDate && entry.dueDate.dueAt)),
      gradedTime: siAlloSheetTime(entry.gradedAt),
      hasSavedRubric: typeof entry.rubric === 'string' && entry.rubric.trim() !== '',
      stableAssignmentIdentity: hasStableAssignment,
      stableLearnerIdentity: hasStableLearner,
      reviewState: siSavedReviewState(entry.review && entry.review.state),
      gradeResults: gradeResults
    };
  }).filter(Boolean);

  return {
    kind: 'submission-inbox-allosheet-source-v1',
    sourceEntryCount: rawEntries.length,
    excludedEntryCount: excluded,
    truncatedEntryCount: truncated,
    truncatedGradeResultCount: truncatedResults,
    entries: entries
  };
}

function siAlloSheetWindow(range) {
  return range === '30d' || range === 'all' ? range : '90d';
}

function siAlloSheetAttemptPolicy(value) {
  return value === 'all-saved' ? 'all-saved' : 'latest-per-class-nickname';
}

function siAlloSheetDatedEntries(source, options, adapter, createdTime) {
  var range = siAlloSheetWindow(options.dateRange);
  var eligible = source.entries.filter(function(entry) {
    return Number.isFinite(entry.gradedTime)
      && adapter.withinDateRange(entry.gradedTime, range, createdTime);
  });
  if (siAlloSheetAttemptPolicy(options.attemptPolicy) === 'all-saved') {
    return eligible.slice().sort(function(a, b) {
      return a.assignmentLabel.localeCompare(b.assignmentLabel, undefined, { numeric: true, sensitivity: 'base' })
        || a.assignmentKey.localeCompare(b.assignmentKey)
        || a.gradedTime - b.gradedTime
        || a.index - b.index;
    });
  }
  var latest = new Map();
  eligible.forEach(function(entry) {
    var key = entry.assignmentKey + '\u0000' + entry.learnerToken;
    var current = latest.get(key);
    if (!current
      || entry.gradedTime > current.gradedTime
      || (entry.gradedTime === current.gradedTime && entry.index > current.index)) {
      latest.set(key, entry);
    }
  });
  return Array.from(latest.values()).sort(function(a, b) {
    return a.assignmentLabel.localeCompare(b.assignmentLabel, undefined, { numeric: true, sensitivity: 'base' })
      || a.assignmentKey.localeCompare(b.assignmentKey)
      || a.gradedTime - b.gradedTime
      || a.index - b.index;
  });
}

function siSubmissionInboxAlloSheetOptions(input, options) {
  var adapter = siAlloSheetAdapter();
  var source = siPrepareAlloSheetSavedSource(input);
  var opts = siAlloSheetPlainObject(options) ? options : {};
  var createdTime = siAlloSheetTime(opts.createdAt);
  if (createdTime === null) createdTime = Date.now();
  var entries = siAlloSheetDatedEntries(source, opts, adapter, createdTime);
  var assignmentMap = new Map();
  entries.forEach(function(entry) {
    if (!assignmentMap.has(entry.assignmentKey)) {
      assignmentMap.set(entry.assignmentKey, {
        key: entry.assignmentKey,
        label: entry.assignmentLabel,
        savedEntryCount: 0
      });
    }
    assignmentMap.get(entry.assignmentKey).savedEntryCount += 1;
  });
  var assignments = Array.from(assignmentMap.values()).sort(function(a, b) {
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      || a.key.localeCompare(b.key);
  });
  var visible = assignments.slice(0, SI_ALLOSHEET_MAX_ASSIGNMENTS);
  return {
    source: source,
    createdAt: new Date(createdTime).toISOString(),
    dateRange: siAlloSheetWindow(opts.dateRange),
    attemptPolicy: siAlloSheetAttemptPolicy(opts.attemptPolicy),
    eligibleEntryCount: entries.length,
    assignmentCount: assignments.length,
    omittedAssignmentCount: Math.max(0, assignments.length - visible.length),
    assignments: visible.map(function(item) {
      return {
        key: item.key,
        label: item.label,
        savedEntryCount: item.savedEntryCount
      };
    })
  };
}

function siAlloSheetColumn(adapter, key, label, type) {
  return adapter.column(key, label, type);
}

function siRoundScore(value) {
  return Math.round(value * 100) / 100;
}

function siBuildSubmissionInboxAlloSheetEnvelope(input, options) {
  var adapter = siAlloSheetAdapter();
  var opts = siAlloSheetPlainObject(options) ? options : {};
  var review = siSubmissionInboxAlloSheetOptions(input, opts);
  var selectedKeys = Array.isArray(opts.assignmentKeys)
    ? opts.assignmentKeys.map(function(key) { return String(key || ''); })
        .filter(function(key) { return /^S\d{1,6}$/.test(key); })
    : review.assignments.map(function(item) { return item.key; });
  var available = new Set(review.assignments.map(function(item) { return item.key; }));
  var selected = new Set(selectedKeys.filter(function(key) { return available.has(key); }));
  if (selected.size === 0) throw new Error('Choose at least one saved assignment summary.');
  var datasets = siAlloSheetPlainObject(opts.datasets) ? opts.datasets : {};
  if (datasets.submissionSummary === false && datasets.scoreSummary === false) {
    throw new Error('Choose at least one summary table.');
  }

  var createdTime = Date.parse(review.createdAt);
  var datedEntries = siAlloSheetDatedEntries(review.source, {
    dateRange: review.dateRange,
    attemptPolicy: review.attemptPolicy
  }, adapter, createdTime).filter(function(entry) {
    return selected.has(entry.assignmentKey);
  });
  var selectedSorted = review.assignments.filter(function(item) {
    return selected.has(item.key);
  });
  var assignmentCodes = new Map();
  selectedSorted.forEach(function(item, index) {
    assignmentCodes.set(item.key, 'A' + String(index + 1).padStart(3, '0'));
  });
  var grouped = new Map();
  selectedSorted.forEach(function(item) { grouped.set(item.key, []); });
  datedEntries.forEach(function(entry) {
    if (grouped.has(entry.assignmentKey)) grouped.get(entry.assignmentKey).push(entry);
  });

  var tables = [];
  var suppressedScoreSummaries = 0;
  var suppressedReviewSummaries = 0;
  var suppressedDueDateSummaries = 0;
  var stableAssignmentEntryCount = datedEntries.filter(function(entry) { return entry.stableAssignmentIdentity; }).length;
  var stableLearnerEntryCount = datedEntries.filter(function(entry) { return entry.stableLearnerIdentity; }).length;
  var humanReviewedEntryCount = datedEntries.filter(function(entry) { return entry.reviewState === 'reviewed'; }).length;
  var dueDateEntryCount = datedEntries.filter(function(entry) { return Number.isFinite(entry.dueAtTime); }).length;
  var lateEntryCount = datedEntries.filter(function(entry) { return siAlloSheetLateStatus(entry.submittedTime, entry.dueAtTime) === 'late'; }).length;
  var onTimeEntryCount = datedEntries.filter(function(entry) { return siAlloSheetLateStatus(entry.submittedTime, entry.dueAtTime) === 'on_time'; }).length;
  var unknownDueDateEntryCount = Math.max(0, datedEntries.length - lateEntryCount - onTimeEntryCount);
  if (datasets.submissionSummary !== false) {
    var submissionRows = selectedSorted.map(function(item, index) {
      var entries = grouped.get(item.key) || [];
      var learners = new Set(entries.map(function(entry) { return entry.learnerToken; }));
      var submittedTimes = entries.map(function(entry) { return entry.submittedTime; })
        .filter(function(time) {
          return Number.isFinite(time) && adapter.withinDateRange(time, 'all', createdTime);
        }).sort(function(a, b) { return a - b; });
      var gradedTimes = entries.map(function(entry) { return entry.gradedTime; })
        .filter(Number.isFinite).sort(function(a, b) { return a - b; });
      var withRubric = entries.filter(function(entry) { return entry.hasSavedRubric; }).length;
      var stableAssignmentCount = entries.filter(function(entry) { return entry.stableAssignmentIdentity; }).length;
      var stableLearnerCount = entries.filter(function(entry) { return entry.stableLearnerIdentity; }).length;
      var reviewedCount = entries.filter(function(entry) { return entry.reviewState === 'reviewed'; }).length;
      var pendingReviewCount = Math.max(0, entries.length - reviewedCount);
      var reviewCells = [reviewedCount, pendingReviewCount];
      var dueCounts = { on_time: 0, late: 0, unknown_due_date: 0 };
      entries.forEach(function(entry) { dueCounts[siAlloSheetLateStatus(entry.submittedTime, entry.dueAtTime)] += 1; });
      var dueDateAvailable = entries.some(function(entry) { return Number.isFinite(entry.dueAtTime); });
      var dueDateCells = [dueCounts.on_time, dueCounts.late, dueCounts.unknown_due_date];
      var dueDateReportable = dueDateAvailable
        && entries.length >= SI_ALLOSHEET_MIN_SCORE_GROUP
        && !dueDateCells.some(function(count) { return count > 0 && count < SI_ALLOSHEET_MIN_SCORE_GROUP; });
      if (dueDateAvailable && entries.length > 0 && !dueDateReportable) suppressedDueDateSummaries += 1;
      var reviewReportable = entries.length >= SI_ALLOSHEET_MIN_SCORE_GROUP
        && !reviewCells.some(function(count) { return count > 0 && count < SI_ALLOSHEET_MIN_SCORE_GROUP; });
      if (entries.length > 0 && !reviewReportable) suppressedReviewSummaries += 1;
      return {
        id: 'saved-assignment-' + String(index + 1),
        values: {
          assignment_code: assignmentCodes.get(item.key),
          teacher_saved_submission_count: entries.length,
          unique_class_nickname_count: learners.size,
          stable_assignment_identity_submission_count: stableAssignmentCount,
          legacy_assignment_identity_submission_count: Math.max(0, entries.length - stableAssignmentCount),
          stable_learner_identity_submission_count: stableLearnerCount,
          unresolved_or_legacy_learner_submission_count: Math.max(0, entries.length - stableLearnerCount),
          human_reviewed_submission_count: reviewReportable ? reviewedCount : null,
          pending_review_submission_count: reviewReportable ? pendingReviewCount : null,
          review_sample_status: entries.length === 0 ? 'no_saved_records' : reviewReportable ? 'available' : 'suppressed_small_groups',
          due_date_status: entries.length === 0 ? 'no_saved_records' : !dueDateAvailable ? 'not_provided' : dueDateReportable ? 'available' : 'suppressed_small_groups',
          on_time_submission_count: dueDateReportable ? dueCounts.on_time : null,
          late_submission_count: dueDateReportable ? dueCounts.late : null,
          unknown_due_date_submission_count: dueDateReportable ? dueCounts.unknown_due_date : null,
          submissions_with_saved_rubric: withRubric,
          submissions_without_saved_rubric: Math.max(0, entries.length - withRubric),
          first_submitted_date: submittedTimes.length ? adapter.toIsoDate(submittedTimes[0]) : '',
          last_submitted_date: submittedTimes.length ? adapter.toIsoDate(submittedTimes[submittedTimes.length - 1]) : '',
          last_saved_date: gradedTimes.length ? adapter.toIsoDate(gradedTimes[gradedTimes.length - 1]) : '',
          saved_record_status: !reviewReportable ? 'review_state_suppressed' : reviewedCount === entries.length && entries.length > 0 ? 'all_human_review_attested' : reviewedCount > 0 ? 'mixed_review_state' : 'not_review_attested'
        }
      };
    });
    tables.push(adapter.table({
      id: 'saved_submission_summary',
      title: 'Saved submission summary',
      columns: [
        siAlloSheetColumn(adapter, 'assignment_code', 'Assignment code', 'category'),
        siAlloSheetColumn(adapter, 'teacher_saved_submission_count', 'Teacher-saved submissions', 'number'),
        siAlloSheetColumn(adapter, 'unique_class_nickname_count', 'Unique saved learner groups', 'number'),
        siAlloSheetColumn(adapter, 'stable_assignment_identity_submission_count', 'Submissions with stable assignment identity', 'number'),
        siAlloSheetColumn(adapter, 'legacy_assignment_identity_submission_count', 'Submissions using legacy assignment grouping', 'number'),
        siAlloSheetColumn(adapter, 'stable_learner_identity_submission_count', 'Submissions with stable learner identity', 'number'),
        siAlloSheetColumn(adapter, 'unresolved_or_legacy_learner_submission_count', 'Submissions with unresolved or legacy learner identity', 'number'),
        siAlloSheetColumn(adapter, 'human_reviewed_submission_count', 'Human-reviewed submissions', 'number'),
        siAlloSheetColumn(adapter, 'pending_review_submission_count', 'Submissions pending human review', 'number'),
        siAlloSheetColumn(adapter, 'review_sample_status', 'Review sample status', 'category'),
        siAlloSheetColumn(adapter, 'due_date_status', 'Due-date status', 'category'),
        siAlloSheetColumn(adapter, 'on_time_submission_count', 'On-time submissions', 'number'),
        siAlloSheetColumn(adapter, 'late_submission_count', 'Late submissions', 'number'),
        siAlloSheetColumn(adapter, 'unknown_due_date_submission_count', 'Submissions with unknown due date', 'number'),
        siAlloSheetColumn(adapter, 'submissions_with_saved_rubric', 'Submissions with a saved rubric', 'number'),
        siAlloSheetColumn(adapter, 'submissions_without_saved_rubric', 'Submissions without a saved rubric', 'number'),
        siAlloSheetColumn(adapter, 'first_submitted_date', 'First submitted date', 'date'),
        siAlloSheetColumn(adapter, 'last_submitted_date', 'Last submitted date', 'date'),
        siAlloSheetColumn(adapter, 'last_saved_date', 'Last saved date', 'date'),
        siAlloSheetColumn(adapter, 'saved_record_status', 'Saved record status', 'category')
      ],
      rows: submissionRows,
      sourceRowCount: submissionRows.length
    }));
  }

  if (datasets.scoreSummary !== false) {
    var scoreRows = selectedSorted.map(function(item, index) {
      var entries = grouped.get(item.key) || [];
      var scores = [];
      var errorCount = 0;
      var invalidCount = 0;
      var statuses = { correct: 0, partial: 0, incorrect: 0, unclear: 0, other: 0 };
      entries.forEach(function(entry) {
        entry.gradeResults.forEach(function(result) {
          if (result.status === 'error') {
            errorCount += 1;
            return;
          }
          if (result.score === null) {
            invalidCount += 1;
            return;
          }
          scores.push(result.score);
          statuses[result.status] = (statuses[result.status] || 0) + 1;
        });
      });
      var bands = [
        scores.filter(function(score) { return score < 40; }).length,
        scores.filter(function(score) { return score >= 40 && score < 65; }).length,
        scores.filter(function(score) { return score >= 65 && score < 85; }).length,
        scores.filter(function(score) { return score >= 85; }).length
      ];
      var distributionCounts = bands.concat(Object.keys(statuses).map(function(key) { return statuses[key]; }));
      var reportable = scores.length >= SI_ALLOSHEET_MIN_SCORE_GROUP
        && !distributionCounts.some(function(count) {
          return count > 0 && count < SI_ALLOSHEET_MIN_SCORE_GROUP;
        });
      if (scores.length > 0 && !reportable) suppressedScoreSummaries += 1;
      var average = reportable
        ? siRoundScore(scores.reduce(function(sum, score) { return sum + score; }, 0) / scores.length)
        : null;
      return {
        id: 'saved-score-' + String(index + 1),
        values: {
          assignment_code: assignmentCodes.get(item.key),
          teacher_saved_submission_count: entries.length,
          scored_response_count: scores.length,
          grading_error_count: errorCount,
          invalid_score_result_count: invalidCount,
          average_score_percent: average,
          minimum_score_percent: reportable
            ? scores.reduce(function(minimum, score) { return score < minimum ? score : minimum; }, scores[0])
            : null,
          maximum_score_percent: reportable
            ? scores.reduce(function(maximum, score) { return score > maximum ? score : maximum; }, scores[0])
            : null,
          score_band_below_40_count: reportable ? bands[0] : null,
          score_band_40_64_count: reportable ? bands[1] : null,
          score_band_65_84_count: reportable ? bands[2] : null,
          score_band_85_100_count: reportable ? bands[3] : null,
          correct_status_count: reportable ? statuses.correct : null,
          partial_status_count: reportable ? statuses.partial : null,
          incorrect_status_count: reportable ? statuses.incorrect : null,
          unclear_status_count: reportable ? statuses.unclear : null,
          other_status_count: reportable ? statuses.other : null,
          score_sample_status: scores.length === 0
            ? 'no_valid_scores'
            : reportable ? 'available' : 'suppressed_small_groups',
          minimum_reportable_score_count: SI_ALLOSHEET_MIN_SCORE_GROUP
        }
      };
    });
    tables.push(adapter.table({
      id: 'saved_score_summary',
      title: 'Saved score summary',
      columns: [
        siAlloSheetColumn(adapter, 'assignment_code', 'Assignment code', 'category'),
        siAlloSheetColumn(adapter, 'teacher_saved_submission_count', 'Teacher-saved submissions', 'number'),
        siAlloSheetColumn(adapter, 'scored_response_count', 'Scored responses', 'number'),
        siAlloSheetColumn(adapter, 'grading_error_count', 'Grading errors', 'number'),
        siAlloSheetColumn(adapter, 'invalid_score_result_count', 'Invalid score results', 'number'),
        siAlloSheetColumn(adapter, 'average_score_percent', 'Average score (percent)', 'number'),
        siAlloSheetColumn(adapter, 'minimum_score_percent', 'Minimum score (percent)', 'number'),
        siAlloSheetColumn(adapter, 'maximum_score_percent', 'Maximum score (percent)', 'number'),
        siAlloSheetColumn(adapter, 'score_band_below_40_count', 'Scores below 40', 'number'),
        siAlloSheetColumn(adapter, 'score_band_40_64_count', 'Scores from 40 to 64', 'number'),
        siAlloSheetColumn(adapter, 'score_band_65_84_count', 'Scores from 65 to 84', 'number'),
        siAlloSheetColumn(adapter, 'score_band_85_100_count', 'Scores from 85 to 100', 'number'),
        siAlloSheetColumn(adapter, 'correct_status_count', 'Correct status count', 'number'),
        siAlloSheetColumn(adapter, 'partial_status_count', 'Partial status count', 'number'),
        siAlloSheetColumn(adapter, 'incorrect_status_count', 'Incorrect status count', 'number'),
        siAlloSheetColumn(adapter, 'unclear_status_count', 'Unclear status count', 'number'),
        siAlloSheetColumn(adapter, 'other_status_count', 'Other status count', 'number'),
        siAlloSheetColumn(adapter, 'score_sample_status', 'Score sample status', 'category'),
        siAlloSheetColumn(adapter, 'minimum_reportable_score_count', 'Minimum reportable score count', 'number')
      ],
      rows: scoreRows,
      sourceRowCount: scoreRows.length
    }));
  }

  var includedEntries = datedEntries.length;
  return adapter.envelope({
    source: {
      tool: 'submission-inbox',
      label: 'Submission Inbox saved gradebook',
      version: '2'
    },
    title: 'Submission Inbox saved-grade summaries',
    createdAt: review.createdAt,
    classification: {
      level: 'aggregate-education-data',
      studentIdentifierIncluded: false,
      freeTextNotesIncluded: false
    },
    privacy: {
      scope: 'aggregate-saved-gradebook-summary',
      identifierIncluded: false,
      notesIncluded: false,
      reducedData: true,
      transferEnablesAI: false
    },
    tables: tables,
    provenance: {
      measurementWindow: review.dateRange,
      attemptPolicy: review.attemptPolicy,
      assignmentCodeType: 'transfer-local-order-code',
      sourceSavedEntryCount: review.source.sourceEntryCount,
      eligibleSavedEntryCount: review.eligibleEntryCount,
      includedSavedEntryCount: includedEntries,
      excludedMalformedEntryCount: review.source.excludedEntryCount,
      truncatedSourceEntryCount: review.source.truncatedEntryCount || 0,
      truncatedGradeResultCount: review.source.truncatedGradeResultCount || 0,
      maximumGradeResultsPerSavedEntry: SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY,
      selectedAssignmentCount: selected.size,
      omittedAssignmentOptionCount: review.omittedAssignmentCount,
      minimumReportableScoreCount: SI_ALLOSHEET_MIN_SCORE_GROUP,
      suppressedScoreSummaryCount: suppressedScoreSummaries,
      scoreSuppressionRule: 'all-derived-score-statistics-if-any-nonzero-band-or-status-is-below-five',
      dueDateSupport: dueDateEntryCount > 0,
      humanReviewAttestation: includedEntries > 0 && humanReviewedEntryCount === includedEntries,
      reviewSemantics: {
        humanReviewAttestationSupport: true,
        humanReviewedSavedEntryCount: humanReviewedEntryCount,
        suppressedReviewSummaryCount: suppressedReviewSummaries,
        suppressionRule: 'all-review-state-counts-if-total-or-any-nonzero-review-state-is-below-five'
      },
      dueDateSemantics: {
        schemaVersion: SI_ALLOSHEET_DUE_DATE_SCHEMA_VERSION,
        validDueDateEntryCount: dueDateEntryCount,
        lateSubmissionCount: lateEntryCount,
        onTimeSubmissionCount: onTimeEntryCount,
        unknownDueDateEntryCount: unknownDueDateEntryCount,
        suppressedDueDateSummaryCount: suppressedDueDateSummaries,
        lateRule: 'late only when submitted timestamp is strictly after the validated due instant',
        missingWorkSupport: false,
        suppressionRule: 'all-on-time-late-unknown-due-date-counts-if-any-nonzero-bucket-is-below-five'
      },
      savedRecordsMayContainAIAssistedScores: true,
      resubmissionPolicy: review.attemptPolicy,
      identitySemantics: {
        stableLearnerIdentitySupport: stableLearnerEntryCount > 0,
        stableLearnerIdentityEntryCount: stableLearnerEntryCount,
        learnerGrouping: stableLearnerEntryCount === includedEntries && includedEntries > 0
          ? 'stable-class-and-learner-id' : stableLearnerEntryCount > 0 ? 'mixed-stable-and-legacy-fallback' : 'normalized-class-name-plus-nickname',
        stableAssignmentIdentitySupport: stableAssignmentEntryCount > 0,
        stableAssignmentIdentityEntryCount: stableAssignmentEntryCount,
        assignmentGrouping: stableAssignmentEntryCount === includedEntries && includedEntries > 0
          ? 'stable-class-and-assignment-id' : stableAssignmentEntryCount > 0 ? 'mixed-stable-and-legacy-fallback' : 'normalized-class-name-plus-document-title'
      },
      excludedFields: [
        'student-and-class-identifiers',
        'assignment-titles-and-response-keys',
        'raw-responses-and-feedback',
        'rubric-context-exemplars-and-anchors',
        'files-cryptographic-material-and-work-evidence'
      ]
    },
    capabilities: { writeBack: false, aiEnabled: false }
  });
}

function siIsolateAlloSheetReview(dialog) {
  var snapshots = [];
  if (!dialog || typeof document === 'undefined') return function() {};
  var current = dialog;
  while (current && current.parentElement) {
    var parent = current.parentElement;
    Array.prototype.forEach.call(parent.children, function(sibling) {
      if (sibling === current) return;
      snapshots.push({
        element: sibling,
        inert: sibling.inert === true,
        ariaHidden: sibling.getAttribute('aria-hidden')
      });
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    });
    current = parent;
    if (current === document.body) break;
  }
  return function() {
    snapshots.forEach(function(snapshot) {
      snapshot.element.inert = snapshot.inert;
      if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
      else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
    });
  };
}

function siTrapAlloSheetReviewFocus(event, container) {
  if (event.key !== 'Tab' || !container) return;
  var focusable = Array.from(container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter(function(node) {
    if (node.hidden || node.getAttribute('aria-hidden') === 'true' || node.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      for (var cur = node; cur && cur !== container; cur = cur.parentElement) {
        var st = window.getComputedStyle(cur);
        if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
      }
    }
    return true;
  });
  if (!focusable.length) {
    event.preventDefault();
    container.focus();
    return;
  }
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (!container.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Derived display data only; saved entries remain unchanged.
function siBuildGradebookSummary(entries, groupByStudent) {
  const averages = new Map();
  const byStudent = new Map();
  entries.forEach(entry => {
    const scores = Object.values(entry.grades || {})
      .filter(g => g && g.status !== 'error' && typeof g.score === 'number' && Number.isFinite(g.score))
      .map(g => g.score);
    averages.set(entry, scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null);
    if (groupByStudent) {
      const key = (entry.nickname || 'unknown').toLowerCase();
      if (!byStudent.has(key)) byStudent.set(key, { nickname: entry.nickname, className: entry.className, entries: [] });
      byStudent.get(key).entries.push(entry);
    }
  });
  const students = Array.from(byStudent.values()).sort((a, b) => (a.nickname || '').localeCompare(b.nickname || ''));
  students.forEach(student => {
    const avgs = student.entries.map(entry => averages.get(entry)).filter(avg => typeof avg === 'number');
    student.avgOfAvgs = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
    student.lastGraded = student.entries.map(entry => entry.gradedAt).filter(Boolean).sort().pop();
  });
  return { averages, students };
}

function siCsvCell(s) {
  const raw = s == null ? '' : String(s);
  const trimmed = raw.replace(/[\r\n]+/g, ' ').trim();
  let v = trimmed;
  if (typeof s !== 'number' && !/^-?\d+(?:\.\d+)?$/.test(trimmed) && (/^[=+\-@\t\r|]/.test(raw) || /^[=+\-@\t\r|]/.test(trimmed))) {
    v = "'" + trimmed;
  }
  return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function siBuildLmsGradebookCsv(entries, preset) {
  const list = Array.isArray(entries) ? entries : [];
  const rawPreset = String(preset || 'alloflow').toLowerCase().trim();
  const mode = (rawPreset === 'canvas' || rawPreset === 'google-classroom' || rawPreset === 'schoology') ? rawPreset : 'alloflow';
  const esc = siCsvCell;
  const avgFor = (entry) => {
    const gMap = (entry && entry.grades) || {};
    const scores = Object.keys(gMap)
      .map(k => gMap[k])
      .filter(g => g && g.status !== 'error' && typeof g.score === 'number' && Number.isFinite(g.score))
      .map(g => g.score);
    return {
      gMap,
      scores,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '',
    };
  };
  const getStudentKey = (e) => {
    if (!e || typeof e !== 'object') return '';
    const ident = e.identity && typeof e.identity === 'object' ? e.identity : {};
    const sid = String(ident.learnerId || e.learnerId || e.studentId || '').trim();
    if (sid) return 'id:' + sid.toLowerCase();
    const nick = String(e.nickname || e.studentName || '').trim().replace(/\s+/g, ' ').toLowerCase();
    return nick ? 'nick:' + nick : '';
  };
  const getStudentDisplay = (e) => String((e && (e.nickname || e.studentName)) || '').trim();
  const getClassName = (e) => String((e && e.className) || '').trim();
  const getDocTitle = (e) => String((e && e.docTitle) || '').trim();
  const getEntryTime = (e) => {
    if (!e || typeof e !== 'object') return NaN;
    const rawT = e.gradedAt || e.submittedAt || e.timestamp || '';
    const parsed = rawT ? Date.parse(String(rawT)) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const chosenByAttempt = new Map();
  list.forEach((entry, idx) => {
    const sk = getStudentKey(entry);
    const dt = getDocTitle(entry);
    if (!sk || !dt) return;
    const attemptKey = sk + '\u0000' + getClassName(entry).toLowerCase() + '\u0000' + dt.toLowerCase();
    const ts = getEntryTime(entry);
    const prev = chosenByAttempt.get(attemptKey);
    if (!prev) {
      chosenByAttempt.set(attemptKey, { idx, ts });
    } else {
      const prevValid = Number.isFinite(prev.ts);
      const curValid = Number.isFinite(ts);
      const curWins = (curValid && prevValid) ? (ts >= prev.ts) : ((curValid && !prevValid) || (!curValid && !prevValid));
      if (curWins) chosenByAttempt.set(attemptKey, { idx, ts });
    }
  });
  const dedupedList = list.filter((entry, idx) => {
    const sk = getStudentKey(entry);
    const dt = getDocTitle(entry);
    if (!sk || !dt) return true;
    const attemptKey = sk + '\u0000' + getClassName(entry).toLowerCase() + '\u0000' + dt.toLowerCase();
    const chosen = chosenByAttempt.get(attemptKey);
    return chosen && chosen.idx === idx;
  });
  const docTitles = Array.from(new Set(dedupedList.map(getDocTitle).filter(Boolean)));
  let headers;
  const rows = [];
  if (mode === 'canvas') {
    if (docTitles.length > 1) {
      headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section'].concat(docTitles.map(d => d + ' (100)'));
      rows.push(headers.map(esc).join(','));
      const studentBuckets = [];
      const byStudentSection = new Map();
      for (const entry of dedupedList) {
        const sk = getStudentKey(entry);
        const cn = getClassName(entry);
        const bucketKey = sk ? (sk + '\u0000' + cn.toLowerCase()) : ('__anon_' + studentBuckets.length);
        let bucket = byStudentSection.get(bucketKey);
        if (!bucket) {
          const disp = getStudentDisplay(entry);
          const sid = String((entry.identity && entry.identity.learnerId) || entry.learnerId || entry.studentId || '').trim();
          bucket = {
            display: disp,
            sisUserId: disp || sid,
            section: cn,
            scoresByDoc: Object.create(null),
          };
          byStudentSection.set(bucketKey, bucket);
          studentBuckets.push(bucket);
        }
        const dt = getDocTitle(entry);
        const { avg } = avgFor(entry);
        if (dt && avg !== '') bucket.scoresByDoc[dt] = avg;
      }
      for (const b of studentBuckets) {
        const scoreCols = docTitles.map(dt => Object.prototype.hasOwnProperty.call(b.scoresByDoc, dt) ? b.scoresByDoc[dt] : '');
        rows.push([b.display, '', b.sisUserId, '', b.section].concat(scoreCols).map(esc).join(','));
      }
    } else {
      const assignHeader = (docTitles.length === 1 ? docTitles[0] : 'AlloFlow Gradebook Score') + ' (100)';
      headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', assignHeader];
      rows.push(headers.map(esc).join(','));
      for (const entry of dedupedList) {
        const { avg } = avgFor(entry);
        rows.push([getStudentDisplay(entry), '', getStudentDisplay(entry), '', entry.className || '', avg].map(esc).join(','));
      }
    }
  } else if (mode === 'google-classroom') {
    headers = ['Student Name', 'Class', 'Assignment', 'Grade', 'Max Points', 'Submitted At', 'Graded At', 'Review State'];
    rows.push(headers.map(esc).join(','));
    for (const entry of dedupedList) {
      const { avg } = avgFor(entry);
      rows.push([
        getStudentDisplay(entry), entry.className || '', entry.docTitle || '', avg, 100,
        entry.submittedAt || '', entry.gradedAt || '', (entry.review && entry.review.state) || 'legacy-unreviewed'
      ].map(esc).join(','));
    }
  } else if (mode === 'schoology') {
    headers = ['First Name', 'Last Name', 'Unique User ID', 'Section', 'Assignment', 'Score', 'Max Points', 'Review State'];
    rows.push(headers.map(esc).join(','));
    for (const entry of dedupedList) {
      const { avg } = avgFor(entry);
      const nick = getStudentDisplay(entry);
      const parts = nick ? nick.split(/\s+/) : [''];
      const first = parts[0] || '';
      const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
      rows.push([
        first, last, nick, entry.className || '', entry.docTitle || '', avg, 100,
        (entry.review && entry.review.state) || 'legacy-unreviewed'
      ].map(esc).join(','));
    }
  } else {
    const itemKeys = [];
    dedupedList.forEach(entry => {
      Object.keys((entry && entry.grades) || {}).forEach(k => {
        if (itemKeys.indexOf(k) < 0) itemKeys.push(k);
      });
    });
    headers = ['Nickname', 'Class', 'Document', 'SubmittedAt', 'GradedAt', 'AverageScore', 'ScoredCount', 'ExpectedCount', 'ReviewState'].concat(itemKeys.map(k => 'Item: ' + k));
    rows.push(headers.map(esc).join(','));
    for (const entry of dedupedList) {
      const { gMap, scores, avg } = avgFor(entry);
      const respSrc = entry.responses || gMap;
      const expectedCount = entry.review && typeof entry.review.expectedResponseCount === 'number'
        ? entry.review.expectedResponseCount
        : Object.keys(respSrc).filter(k => {
            if (Object.prototype.hasOwnProperty.call(gMap, k)) return true;
            const rawResp = entry.responses && entry.responses[k];
            const rt = rawResp && typeof rawResp === 'object' ? (rawResp.responseType || rawResp.type || '') : '';
            const qt = rawResp && typeof rawResp === 'object' ? (rawResp.questionType || '') : '';
            return !siIsSelfCheckResponse(k, rt, qt);
          }).length;
      const baseCols = [
        getStudentDisplay(entry), entry.className, entry.docTitle, entry.submittedAt, entry.gradedAt,
        avg, scores.length, expectedCount, (entry.review && entry.review.state) || 'legacy-unreviewed'
      ];
      const itemCols = itemKeys.map(k => (gMap[k] && gMap[k].status !== 'error' && typeof gMap[k].score === 'number' && Number.isFinite(gMap[k].score)) ? gMap[k].score : '');
      rows.push(baseCols.concat(itemCols).map(esc).join(','));
    }
  }
  return { csv: rows.join('\n'), rowCount: Math.max(0, rows.length - 1), preset: mode, headers };
}

// Keep edits cheap: retain the latest references and serialize only when saving.
function siCreateSessionAutosave() {
  let pending = null;
  let delayTimer = null;
  let limitTimer = null;
  const cancel = () => {
    clearTimeout(delayTimer);
    clearTimeout(limitTimer);
    delayTimer = limitTimer = null;
    pending = null;
  };
  const flush = () => {
    const state = pending;
    cancel();
    if (!state) return;
    try {
      const { globalRubric, anchors } = state;
      if ((globalRubric.rubric || '').trim() || (globalRubric.context || '').trim() || anchors.length > 0) {
        localStorage.setItem('alloflow_inbox_session', JSON.stringify({ globalRubric, anchors, savedAt: new Date().toISOString() }));
      } else {
        localStorage.removeItem('alloflow_inbox_session');
      }
    } catch (e) { /* private mode / quota */ }
  };
  const schedule = (state) => {
    pending = state;
    clearTimeout(delayTimer);
    delayTimer = setTimeout(flush, 300);
    // Continuous typing still gets a periodic checkpoint.
    if (limitTimer === null) limitTimer = setTimeout(flush, 2000);
  };
  return { schedule, flush, cancel };
}

function SubmissionInbox(props) {
  return props.isOpen ? React.createElement(SubmissionInboxOpen, props) : null;
}

function SubmissionInboxOpen({ isOpen, onClose, rosterKey, t, addToast, onOpenAlloSheet, onOpenInStudio, history }) {

  // ── UI localization state (drives tr() above) ──
  var _llCtx = React.useContext(LANG_CTX);
  var uiLang = (_llCtx && _llCtx.currentUiLanguage) || (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
  var _llCacheRef = React.useRef(null);
  // Read and parse the persisted cache only when this panel mounts.
  if (_llCacheRef.current === null) _llCacheRef.current = llLoad();
  var _llAttemptedRef = React.useRef({});
  var _setLlTick = React.useState(0)[1];
  // Student-written adventure preview: '<row idx>|<grade key>' of the story being played.
  const [playingStoryKey, setPlayingStoryKey] = React.useState(null);
  const aiTextAvailable = typeof window !== 'undefined'
    && typeof window.callGemini === 'function'
    && (typeof window.__alloAiAvailable !== 'function' || window.__alloAiAvailable('text') !== false);
  LL_CUR.lang = uiLang; LL_CUR.cache = _llCacheRef.current; // publish snapshot for tr()
  React.useEffect(function () {
    if (uiLang === 'English' || !aiTextAvailable) return undefined;
    var cache = _llCacheRef.current[uiLang] || {}, attempted = _llAttemptedRef.current[uiLang] || {};
    var missing = Object.keys(STR_REG).filter(function (k) { return !cache[k] && !attempted[k]; });
    if (!missing.length) return undefined;
    var att = _llAttemptedRef.current[uiLang] || (_llAttemptedRef.current[uiLang] = {});
    var to = setTimeout(function () {
      var list = missing.slice(0, 200); list.forEach(function (k) { att[k] = true; });
      Promise.resolve().then(function () { return window.callGemini(llPrompt(uiLang, list)); }).then(function (raw) {
        var pack = null; try { pack = llSanitize(JSON.parse(llCleanJson(raw)), list); } catch (_) {}
        if (pack) { var next = Object.assign({}, _llCacheRef.current); next[uiLang] = Object.assign({}, next[uiLang] || {}, pack); _llCacheRef.current = next; llStore(next); _setLlTick(function (n) { return n + 1; }); }
      }).catch(function () {});
    }, 500);
    return function () { clearTimeout(to); };
  });

  const [privateJwk, setPrivateJwk] = useState(null);
  const [classKeyMeta, setClassKeyMeta] = useState(null);
  const [queue, setQueue] = useState([]);
  const [decryptingAll, setDecryptingAll] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [queueViewMode, setQueueViewMode] = useState('student');  // 'student' | 'question'
  // Work Story view-models, built asynchronously (chain verification is async)
  // and keyed by row index. Only rows whose student consented carry one.
  const [workStoryModels, setWorkStoryModels] = useState({});
  // React.useEffect, not bare: the builder injects only useState and useRef.
  React.useEffect(() => {
    const P = window.AlloModules && window.AlloModules.Provenance;
    if (!P || typeof P.buildProcessPanelModel !== 'function') return;
    let cancelled = false;
    const pending = (queue || []).map((row, idx) =>
      (row && row.payload && row.payload.provenance)
        ? Promise.resolve(P.buildProcessPanelModel(row.payload)).then((m) => [idx, m]).catch(() => null)
        : null
    ).filter(Boolean);
    if (!pending.length) return;
    Promise.all(pending).then((pairs) => {
      if (cancelled) return;
      const next = {};
      pairs.forEach((pair) => { if (pair && pair[1] && pair[1].present) next[pair[0]] = pair[1]; });
      setWorkStoryModels(next);
    });
    return () => { cancelled = true; };
  }, [queue]);
  // Phase 3 (May 11 2026): per-row rubric state + AI grading results.
  // rubrics[idx] = { rubric: string, context: string, exemplar: string }
  // grades[idx]  = { [responseKey]: { score, status, feedback } }
  const [rubrics, setRubrics] = useState({});
  const [grades, setGrades] = useState({});
  const [reviewedRows, setReviewedRows] = useState({});
  const [confirmedLearnerMatches, setConfirmedLearnerMatches] = useState({});
  const [gradingRow, setGradingRow] = useState(null);
  // Multi-anchor few-shot calibration (May 11 2026, Phase 3 v2):
  // Each anchor is a teacher-scored exemplar of a student response that
  // the AI uses as a calibration sample when grading every other response.
  // Anchors are global across the inbox session (not per-row) so
  // teachers can build up a calibration set by anchoring real student
  // responses they've graded, then have the AI extend the scoring to
  // everything else.
  // shape: [{ studentResponse, teacherScore (0-100), teacherFeedback?, fromSubmissionIdx?, fromResponseKey? }]
  const [anchors, setAnchors] = useState([]);
  const [anchorsPanelOpen, setAnchorsPanelOpen] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState(null);  // {submissionIdx, responseKey, responseText}
  const [confirmation, setConfirmation] = useState(null);
  // Phase 3 v2.1 (May 12 2026): one global rubric the teacher sets at the
  // top of the inbox, used by both the per-row Grade button (as default)
  // and the new "Grade entire queue" bulk action.
  const [globalRubric, setGlobalRubric] = useState({ rubric: '', context: '' });
  const [globalRubricOpen, setGlobalRubricOpen] = useState(false);
  const [bulkGrading, setBulkGrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [gradebookClassFilter, setGradebookClassFilter] = useState('all');
  const bulkCancelRef = useRef(false);
  React.useEffect(() => () => { bulkCancelRef.current = true; }, []);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const queueLocked = Boolean(decryptingAll || bulkGrading || gradingRow !== null);
  // Gradebook viewer (Phase 3 v2.2, May 12 2026)
  // Reads from localStorage 'alloflow_offline_grades' written by
  // saveRowToGradebook. Refresh tick bumps when we save so the panel
  // re-reads without needing a full remount.
  const [gradebookOpen, setGradebookOpen] = useState(false);
  const [gradebookRefresh, setGradebookRefresh] = useState(0);
  const [showAlloSheetReview, setShowAlloSheetReview] = useState(false);
  const [alloSheetSourceSnapshot, setAlloSheetSourceSnapshot] = useState(null);
  const [alloSheetAsOf, setAlloSheetAsOf] = useState('');
  const [alloSheetDateRange, setAlloSheetDateRange] = useState('90d');
  const [alloSheetAttemptPolicy, setAlloSheetAttemptPolicy] = useState('latest-per-class-nickname');
  const [alloSheetAssignments, setAlloSheetAssignments] = useState([]);
  const [alloSheetDatasets, setAlloSheetDatasets] = useState({ submissionSummary: true, scoreSummary: true });
  const [alloSheetBusy, setAlloSheetBusy] = useState(false);
  const [alloSheetFeedback, setAlloSheetFeedback] = useState({ kind: '', text: '' });
  // Phase 3 v2.3 (May 12 2026): group-by pivot for the gradebook table.
  const [gradebookGroupBy, setGradebookGroupBy] = useState('submission');  // 'submission' | 'student'
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [lmsCsvPreset, setLmsCsvPreset] = useState('alloflow');  // 'alloflow' | 'canvas' | 'google-classroom' | 'schoology'
  // Session persistence: auto-save globalRubric + anchors to localStorage
  // so the teacher doesn't lose their setup across browser refreshes / tabs.
  // sessionLoadedRef prevents the first auto-save from overwriting state
  // before the restore effect has run.
  const sessionLoadedRef = useRef(false);
  const sessionAutosaveRef = useRef(null);
  if (!sessionAutosaveRef.current) sessionAutosaveRef.current = siCreateSessionAutosave();
  // Skip the initial empty render, including StrictMode effect replay, until
  // restored data or an edit supplies new state references.
  const sessionAutosaveStateRef = useRef({ globalRubric, anchors });
  const [savedSessionMeta, setSavedSessionMeta] = useState(null);  // { savedAt } if restored from localStorage
  // Phase 3 v2.4 (May 12 2026): named rubric presets ("Reading Response",
  // "Math Word Problem", etc.). Stored in localStorage under
  // 'alloflow_rubric_presets'. Each preset captures rubric + context +
  // anchors so the teacher can re-apply a full calibration in one click.
  const [rubricPresets, setRubricPresets] = useState({});
  const [presetsMenuOpen, setPresetsMenuOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const presetsLoadedRef = useRef(false);
  const gradebookEntries = React.useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
      return Object.entries(raw).map(([key, entry]) => ({ key: key, ...entry }));
    } catch (e) { return []; }
  }, [gradebookRefresh, isOpen]);
  const keyInputRef = useRef(null);
  const subInputRef = useRef(null);
  const presetImportRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const anchorDialogRef = useRef(null);
  const anchorCancelRef = useRef(null);
  const confirmationDialogRef = useRef(null);
  const confirmationCancelRef = useRef(null);
  const confirmationResolveRef = useRef(null);
  const alloSheetReviewDialogRef = useRef(null);
  const alloSheetReturnFocusRef = useRef(null);
  const alloSheetBusyRef = useRef(false);
  const bulkGradingRef = useRef(false);

  const containDialogFocus = (event, container) => {
    if (event.key === 'Escape') {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !container) return;
    const focusable = Array.from(container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )).filter(node => {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true' || node.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        for (let cur = node; cur && cur !== container; cur = cur.parentElement) {
          const st = window.getComputedStyle(cur);
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
        }
      }
      return true;
    });
    if (!focusable.length) { event.preventDefault(); container.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => { clearTimeout(timer); if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus(); };
  }, [isOpen]);

  React.useEffect(() => {
    if (!pendingAnchor) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => anchorCancelRef.current?.focus(), 0);
    return () => { clearTimeout(timer); if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus(); };
  }, [!!pendingAnchor]);

  const requestConfirmation = (options) => new Promise(resolve => {
    confirmationResolveRef.current = resolve;
    setConfirmation(options);
  });
  const finishConfirmation = (accepted) => {
    const resolve = confirmationResolveRef.current;
    confirmationResolveRef.current = null;
    setConfirmation(null);
    if (resolve) resolve(accepted);
  };

  React.useEffect(() => {
    if (!confirmation) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => confirmationCancelRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!confirmation]);

  React.useEffect(() => {
    if (!showAlloSheetReview) return undefined;
    const restoreIsolation = siIsolateAlloSheetReview(alloSheetReviewDialogRef.current);
    const timer = setTimeout(() => alloSheetReviewDialogRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      restoreIsolation();
      const opener = alloSheetReturnFocusRef.current;
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
  }, [showAlloSheetReview]);

  const tx = t || ((k, fallback) => fallback || k);

  // Restore last saved session on first open (Phase 3 v2.3, May 12 2026).
  // Pulls globalRubric + anchors back from localStorage. Class key + queue
  // are intentionally NOT persisted — those are per-batch and shouldn't
  // surprise the teacher by sticking around.
  React.useEffect(() => {
    if (!isOpen || sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    try {
      const raw = localStorage.getItem('alloflow_inbox_session');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (saved.globalRubric && (saved.globalRubric.rubric || saved.globalRubric.context)) {
          setGlobalRubric({
            rubric: saved.globalRubric.rubric || '',
            context: saved.globalRubric.context || '',
          });
          setGlobalRubricOpen(true);
        }
        if (Array.isArray(saved.anchors) && saved.anchors.length > 0) {
          setAnchors(saved.anchors);
        }
        if (saved.savedAt) setSavedSessionMeta({ savedAt: saved.savedAt });
      }
    } catch (e) { /* ignore corrupt storage */ }
  }, [isOpen]);

  React.useEffect(() => {
    const autosave = sessionAutosaveRef.current;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') autosave.flush();
    };
    window.addEventListener('pagehide', autosave.flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', autosave.flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      autosave.flush();
    };
  }, []);

  React.useEffect(() => {
    if (!sessionLoadedRef.current) return;
    const previous = sessionAutosaveStateRef.current;
    if (previous.globalRubric === globalRubric && previous.anchors === anchors) return;
    const state = { globalRubric, anchors };
    sessionAutosaveStateRef.current = state;
    sessionAutosaveRef.current.schedule(state);
    // An update arriving after the tab becomes hidden should also be durable.
    if (document.visibilityState === 'hidden') sessionAutosaveRef.current.flush();
  }, [globalRubric, anchors]);

  // Load saved presets once when the modal first opens.
  React.useEffect(() => {
    if (!isOpen || presetsLoadedRef.current) return;
    presetsLoadedRef.current = true;
    try {
      const raw = localStorage.getItem('alloflow_rubric_presets');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') setRubricPresets(parsed);
    } catch (e) { /* ignore corrupt storage */ }
  }, [isOpen]);

  const writePresets = (next) => {
    try {
      localStorage.setItem('alloflow_rubric_presets', JSON.stringify(next));
    } catch (e) { /* private mode / quota */ }
    setRubricPresets(next);
  };
  const savePreset = () => {
    const name = (presetNameInput || '').trim();
    if (!name) {
      addToast && addToast(tr('Give the preset a short name (e.g. "Reading response Ch.3").'), 'warn');
      return;
    }
    if (!(globalRubric.rubric || '').trim() && anchors.length === 0) {
      addToast && addToast(tr('Nothing to save yet — add a rubric or anchors first.'), 'warn');
      return;
    }
    const key = String(name || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || ('preset_' + Date.now());
    const now = new Date().toISOString();
    const existing = rubricPresets[key];
    const preset = {
      name: name,
      rubric: globalRubric.rubric || '',
      context: globalRubric.context || '',
      anchors: anchors.map(a => {
        const copy = Object.assign({}, a);
        delete copy.fromSubmissionIdx;
        return copy;
      }),
      createdAt: existing ? existing.createdAt : now,
      lastUsed: now,
    };
    const next = { ...rubricPresets, [key]: preset };
    writePresets(next);
    setPresetNameInput('');
    addToast && addToast(existing ? 'Updated preset "' + name + '".' : 'Saved preset "' + name + '".', 'success');
  };
  const loadPreset = (key) => {
    const p = rubricPresets[key];
    if (!p) return;
    setGlobalRubric({ rubric: p.rubric || '', context: p.context || '' });
    setAnchors(Array.isArray(p.anchors) ? p.anchors.slice() : []);
    const next = { ...rubricPresets, [key]: { ...p, lastUsed: new Date().toISOString() } };
    writePresets(next);
    setPresetsMenuOpen(false);
    addToast && addToast('Loaded preset "' + p.name + '" (' + (p.anchors ? p.anchors.length : 0) + ' anchor' + ((p.anchors && p.anchors.length === 1) ? '' : 's') + ').', 'success');
  };
  const deletePreset = (key) => {
    if (!rubricPresets[key]) return;
    const name = rubricPresets[key].name;
    const next = { ...rubricPresets };
    delete next[key];
    writePresets(next);
    addToast && addToast('Deleted preset "' + name + '".', 'info');
  };
  // Export ALL presets as a JSON file teachers can share or back up.
  const exportPresets = () => {
    const presetCount = Object.keys(rubricPresets).length;
    if (presetCount === 0) {
      addToast && addToast(tr('No presets to export yet.'), 'warn');
      return;
    }
    const payload = {
      kind: 'alloflow-rubric-presets',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      presets: rubricPresets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'alloflow_rubric_presets_' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast('Exported ' + presetCount + ' preset' + (presetCount === 1 ? '' : 's') + '.', 'success');
  };
  // Import presets from a JSON file. Merges into the existing library;
  // duplicates (same slug key) prompt the teacher to confirm overwrite.
  const importPresets = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const MAX_PRESETS_BYTES = 5 * 1024 * 1024;
    const safeJsonReviver = (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    try {
      if (typeof file.size === 'number' && file.size > MAX_PRESETS_BYTES) {
        addToast && addToast(tr('Preset file is too large to import.'), 'error');
        return;
      }
      const text = await file.text();
      if (text.length > MAX_PRESETS_BYTES) {
        addToast && addToast(tr('Preset file is too large to import.'), 'error');
        return;
      }
      const parsed = JSON.parse(text, safeJsonReviver);
      if (!parsed || parsed.kind !== 'alloflow-rubric-presets' || !parsed.presets || typeof parsed.presets !== 'object' || Array.isArray(parsed.presets)) {
        addToast && addToast(tr('Not a valid AlloFlow presets file.'), 'error');
        return;
      }
      const incoming = parsed.presets;
      const isSafePresetKey = (k) => k && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
      const conflicts = Object.keys(incoming).filter(k => isSafePresetKey(k) && Object.prototype.hasOwnProperty.call(rubricPresets, k));
      let overwriteAll = false;
      if (conflicts.length > 0) {
        overwriteAll = await requestConfirmation({
          title: tr('Overwrite existing presets?'),
          message: conflicts.length + ' preset' + (conflicts.length === 1 ? '' : 's') + ' already exist with the same name: ' +
            conflicts.slice(0, 5).map(k => '"' + incoming[k].name + '"').join(', ') +
            (conflicts.length > 5 ? ', …' : '') + '. Choose overwrite to replace them, or skip to keep the existing presets.',
          confirmLabel: tr('Overwrite existing'),
          cancelLabel: tr('Skip existing')
        });
      }
      const next = { ...rubricPresets };
      let added = 0, skipped = 0, overwritten = 0;
      Object.entries(incoming).forEach(([k, p]) => {
        if (!isSafePresetKey(k) || !p || typeof p !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(next, k)) {
          if (overwriteAll) {
            next[k] = { ...p, lastUsed: new Date().toISOString() };
            overwritten++;
          } else {
            skipped++;
          }
        } else {
          next[k] = { ...p, lastUsed: p.lastUsed || new Date().toISOString() };
          added++;
        }
      });
      writePresets(next);
      addToast && addToast(
        added + ' added' +
        (overwritten > 0 ? ', ' + overwritten + ' overwritten' : '') +
        (skipped > 0 ? ', ' + skipped + ' skipped' : ''),
        'success'
      );
    } catch (err) {
      addToast && addToast('Could not import: ' + err.message, 'error');
    }
    if (e.target) e.target.value = '';
  };

  const clearSavedSession = () => {
    sessionAutosaveRef.current.cancel();
    try { localStorage.removeItem('alloflow_inbox_session'); } catch (e) {}
    setGlobalRubric({ rubric: '', context: '' });
    setAnchors([]);
    setSavedSessionMeta(null);
    addToast && addToast(tr('Cleared saved class rubric and anchors.'), 'info');
  };

  const handleKeyFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      if (typeof file.size === 'number' && file.size > 1024 * 1024) {
        addToast && addToast(tr('Not a valid AlloFlow class key file.'), 'error');
        return;
      }
      const text = await file.text();
      const data = JSON.parse(text, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
      if (data.kind !== 'alloflow-class-key' || !data.privateJwk) {
        addToast && addToast(tr('Not a valid AlloFlow class key file.'), 'error');
        return;
      }
      setPrivateJwk(data.privateJwk);
      setClassKeyMeta({
        className: data.className || '',
        classId: data.classId,
        keyId: data.keyId,
        createdAt: data.createdAt
      });
      addToast && addToast(tr('Class key loaded.'), 'success');
    } catch (err) {
      addToast && addToast('Could not read key file: ' + err.message, 'error');
    }
    if (e.target) e.target.value = '';
  };

  const handleSubmissionFiles = async (e) => {
    const files = Array.prototype.slice.call(e.target?.files || []);
    if (e.target) e.target.value = '';
    if (files.length === 0) return;
    await importSubmissionFiles(files, null);
  };

  const SI_MAX_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024;
  const siSafeJsonParse = (rawText) => JSON.parse(rawText, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);

  // Shared by the file picker and the Class Mailbox pickup. Mailbox rows keep
  // their Drive file name so a second pickup skips them. Returns the mailbox
  // files that imported cleanly, which the mailbox then marks as collected.
  const importSubmissionFiles = async (files, source) => {
    const newRows = [];
    const okNames = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const rowsBefore = newRows.length;
      try {
      try {
        if (typeof f.size === 'number' && f.size > SI_MAX_SUBMISSION_FILE_BYTES) {
          newRows.push({
            fileName: f.name, nickname: '?', status: 'error',
            error: tr('Submission file is too large (max 25 MB).')
          });
          continue;
        }
        const text = await f.text();
        // CSV results file saved by an AlloFlow Packet (default student download format).
        const looksCsv = /\.csv$/i.test(f.name || '') || text.slice(0, 500).indexOf('alloflow-packet-result/1') >= 0;
        if (looksCsv) {
          const reader = await siTakeHomeResultsReader();
          let csvResults = [];
          if (reader) {
            const got = await reader.read(text, { name: f.name, lastModified: f.lastModified });
            if (got && got.ok && Array.isArray(got.sessions) && got.sessions.length) {
              csvResults = got.sessions.map(siSessionToTakeHomeResult);
            }
          } else {
            const lib = await siTakeHomeLib();
            const parsed = siParseTakeHomeCsvFallback(text, lib);
            if (parsed && parsed.ok && parsed.result) csvResults = [parsed.result];
          }
          if (!csvResults.length) {
            newRows.push({ fileName: f.name, nickname: '?', status: 'error', error: tr('This take-home results file could not be read.') });
            continue;
          }
          for (const r of csvResults) {
            const takeHomeKey = ['take-home', r.lessonId, r.learnerName, r.finishedAt].join('|');
            const already = queue.concat(newRows).some(row => row && row.payload && row.payload.takeHomeKey === takeHomeKey);
            if (already) continue;
            const nickname = siStableIdentityValue(r.learnerName || '') || '?';
            const title = r.lessonTitle || 'Take-home practice';
            newRows.push({
              fileName: f.name,
              nickname,
              docTitle: title,
              timestamp: r.finishedAt || null,
              encryptedBlob: null,
              payload: { kind: 'alloflow-take-home', nickname, docTitle: title, timestamp: r.finishedAt || null, responses: {}, takeHome: r, takeHomeKey },
              status: 'decrypted',
              error: null,
              mailboxReceipt: null
            });
          }
          continue;
        }
        // Plain-JSON submission (student saved offline with no class key) — the file
        // content IS the decrypted payload, so add it as already-decrypted (no key needed).
        const looksJson = /\.json$/i.test(f.name || '') || text.trim().charAt(0) === '{';
        if (looksJson) {
          try {
            const p = siSafeJsonParse(text);
            // Take-home packet results: a saved results file, or the same result
            // delivered by the Class Mailbox. A second copy of the same attempt
            // (saved AND sent, or imported twice) is not added again.
            if (p && (p.kind === 'alloflow-take-home-result' || p.kind === 'alloflow-take-home-submission')) {
              const lib = await siTakeHomeLib();
              const parsed = lib ? lib.parseResult(p) : { ok: false };
              if (!parsed.ok) {
                newRows.push({ fileName: f.name, nickname: '?', status: 'error', error: tr('This Word Sounds results file could not be read.') });
                continue;
              }
              const r = parsed.result;
              const takeHomeKey = ['take-home', r.lessonId, r.learnerName, r.finishedAt].join('|');
              const already = queue.concat(newRows).some(row => row && row.payload && row.payload.takeHomeKey === takeHomeKey);
              if (already) continue;
              const nickname = siStableIdentityValue(r.learnerName || (typeof p.studentName === 'string' ? p.studentName : '')) || '?';
              const title = r.lessonTitle || 'Take-home practice';
              newRows.push({
                fileName: f.name,
                nickname,
                docTitle: title,
                timestamp: r.finishedAt || null,
                encryptedBlob: null,
                payload: { kind: 'alloflow-take-home', nickname, docTitle: title, timestamp: r.finishedAt || null, responses: {}, takeHome: r, takeHomeKey },
                status: 'decrypted',
                error: null,
                mailboxReceipt: (p.mailboxReceipt && typeof p.mailboxReceipt === 'object') ? p.mailboxReceipt : null
              });
              continue;
            }
            // A submission that declares its own kind is accepted on that alone.
            // The response-shaped heuristic below stays for other producers, but
            // on its own it rejected a real submission from a student who worked
            // entirely in activities and games and typed nothing — the file had
            // no `responses` key to recognise, and the evidence of the work they
            // DID do is exactly what the queue now renders.
            const declaresSubmission = p && p.kind === 'alloflow-student-submission';
            const looksResponseShaped = p && ((p.responses && typeof p.responses === 'object') || (p.answers && typeof p.answers === 'object'));
            const declaresAnnotations = p && (p.kind === 'alloflow-annotations' || (Array.isArray(p.annotations) && !p.ciphertext));
            if (p && (declaresSubmission || looksResponseShaped || declaresAnnotations) && !p.ciphertext) {
              const importedNickname = ['nickname', 'studentName', 'studentNickname'].map(key => Object.prototype.hasOwnProperty.call(p, key) && typeof p[key] === 'string' ? siStableIdentityValue(p[key]) : '').find(Boolean) || '?';
              const normalizedPayload = p.responses ? { ...p, nickname: importedNickname } : {
                ...p,
                nickname: importedNickname,
                timestamp: p.timestamp || p.submissionDate || p.exportedAt || null,
                docTitle: p.docTitle || 'AlloFlow assignment',
                responses: p.answers || {},
              };
              newRows.push({
                fileName: f.name,
                nickname: normalizedPayload.nickname || '?',
                docTitle: normalizedPayload.docTitle || '',
                timestamp: normalizedPayload.timestamp || null,
                encryptedBlob: null,
                payload: normalizedPayload,
                status: 'decrypted',
                error: null
              });
              continue;
            }
            // Mailbox-delivered encrypted worksheet (2026-08-23): putsubmission
            // stores the page's envelope as submission-*.json in the teacher's
            // Drive folder. Same blob the .alloflow.html file embeds, so it
            // joins the queue as an ordinary pending row for Decrypt all.
            if (p && p.kind === 'encrypted-worksheet' && p.ciphertext && p.wrappedKey && p.iv) {
              newRows.push({
                fileName: f.name,
                nickname: p.nickname || p.studentName || '?',
                docTitle: p.docTitle || '',
                timestamp: p.timestamp || null,
                encryptedBlob: p,
                payload: null,
                status: 'pending',
                error: null,
                mailboxReceipt: (p.mailboxReceipt && typeof p.mailboxReceipt === 'object') ? p.mailboxReceipt : null
              });
              continue;
            }
          } catch (e) { /* not plain JSON — fall through to encrypted-HTML parsing */ }
        }
        const match = text.match(/<script type="application\/json" id="alloflow-submission">([\s\S]*?)<\/script>/);
        if (!match) {
          newRows.push({
            fileName: f.name, nickname: '?', status: 'error',
            error: tr('Not an AlloFlow submission file (no embedded blob).')
          });
          continue;
        }
        // JSON.parse natively decodes \u003c escapes inside strings; never string-replace
        // before parsing (that corrupts literal backslashes before u003c sequences).
        const blob = siSafeJsonParse(match[1]);
        newRows.push({
          fileName: f.name,
          nickname: blob.nickname || '?',
          docTitle: blob.docTitle || '',
          timestamp: blob.timestamp || null,
          encryptedBlob: blob,
          payload: null,
          status: 'pending',
          error: null
        });
      } catch (err) {
        newRows.push({ fileName: f.name, nickname: '?', status: 'error', error: err.message });
      }
      } finally {
        if (source === 'mailbox') {
          const added = newRows.slice(rowsBefore);
          added.forEach(row => { row.mailboxFile = f.name; });
          if (!added.some(row => row.status === 'error')) okNames.push(f.name);
        }
      }
    }
    setQueue(prev => [...prev, ...newRows]);
    return { added: newRows.filter(row => row.status !== 'error').length, errors: newRows.filter(row => row.status === 'error').length, okNames };
  };

  const [mbPull, setMbPull] = useState({ busy: false, msg: '', needsUpdate: false, all: false });
  const pullFromMailbox = async () => {
    const api = typeof window !== 'undefined' ? window.__alloMailboxSubmissions : null;
    if (!api || !api.connected) { if (api && api.openSetup) api.openSetup(); return; }
    if (mbPull.busy) return;
    const all = mbPull.all;
    setMbPull(s => ({ ...s, busy: true, needsUpdate: false, msg: tr('Checking the Class Mailbox…') }));
    try {
      const skip = queue.map(row => row && row.mailboxFile).filter(Boolean);
      const res = await api.pull({ all, rescan: all, skip, onProgress: (i, n) => setMbPull(s => ({ ...s, msg: tr('Getting submission {n} of {total}…', { n: i + 1, total: n }) })) });
      if (!res.ok) {
        const needsUpdate = res.e === 'update-needed';
        setMbPull(s => ({ ...s, busy: false, needsUpdate, msg: needsUpdate
          ? tr('Your Class Mailbox script is version {v}. To collect submissions here, update it to version 29: open the Class Mailbox setup, copy the new script, and deploy a new version.', { v: res.v || '?' })
          : tr('Could not reach the Class Mailbox.') }));
        return;
      }
      const result = await importSubmissionFiles(res.files.map(file => ({ name: file.name, text: async () => file.text })), 'mailbox');
      if (result.okNames.length) { try { await api.mark(result.okNames); } catch (_) { /* collected again next time; dedupe keeps the queue clean */ } }
      const parts = [];
      parts.push(res.files.length === 0
        ? tr('No new submissions in the Class Mailbox.')
        : tr('Added {n} submission(s) from the Class Mailbox.', { n: result.added }));
      if (result.errors) parts.push(tr('{n} file(s) could not be read.', { n: result.errors }));
      if (res.failed && res.failed.length) parts.push(tr('{n} file(s) did not download; try again.', { n: res.failed.length }));
      if (res.more) parts.push(tr('{n} more are waiting; get submissions again.', { n: res.more }));
      if (res.complete === false) parts.push(tr('The mailbox is still checking older files; get submissions again in a minute.'));
      setMbPull(s => ({ ...s, busy: false, msg: parts.join(' ') }));
    } catch (err) {
      setMbPull(s => ({ ...s, busy: false, msg: tr('Could not reach the Class Mailbox.') + ' ' + String((err && err.message) || '') }));
    }
  };

  const handleDecryptAll = async () => {
    if (!privateJwk) {
      addToast && addToast(tr('Load the class key file first.'), 'warn');
      return;
    }
    const SC = window.AlloModules && window.AlloModules.SubmissionCrypto;
    if (!SC || typeof SC.decryptSubmission !== 'function') {
      addToast && addToast(tr('SubmissionCrypto module not loaded yet. Try again in a moment.'), 'error');
      return;
    }
    setDecryptingAll(true);
    let ok = 0, fail = 0;
    // Iterate by index so each row gets its own state update
    for (let i = 0; i < queue.length; i++) {
      const row = queue[i];
      if (row.status !== 'pending') continue;
      try {
        const payload = await SC.decryptSubmission(row.encryptedBlob, privateJwk);
        const innerNick = (payload && typeof payload === 'object')
          ? siStableIdentityValue(payload.nickname || payload.studentName || payload.studentNickname || '')
          : '';
        const innerTitle = (payload && typeof payload === 'object' && typeof payload.docTitle === 'string')
          ? payload.docTitle.trim()
          : '';
        setQueue(prev => prev.map((r, idx) => (idx === i && r && r.fileName === row.fileName && r.timestamp === row.timestamp) ? {
          ...r,
          nickname: innerNick || r.nickname,
          docTitle: innerTitle || r.docTitle,
          outerNicknameMismatch: Boolean(innerNick && r.nickname && r.nickname !== '?' && r.nickname !== innerNick),
          payload,
          status: 'decrypted'
        } : r));
        ok++;
      } catch (err) {
        setQueue(prev => prev.map((r, idx) => (idx === i && r && r.fileName === row.fileName && r.timestamp === row.timestamp) ? { ...r, status: 'error', error: err.message } : r));
        fail++;
      }
    }
    setDecryptingAll(false);
    addToast && addToast(
      ok + ' decrypted' + (fail > 0 ? ', ' + fail + ' failed (wrong key?)' : ''),
      fail > 0 ? 'warn' : 'success'
    );
  };

  const remapRowIndexState = (source, removedIdx) => {
    const next = {};
    Object.keys(source || {}).forEach((key) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index === removedIdx) return;
      next[index > removedIdx ? index - 1 : index] = source[key];
    });
    return next;
  };
  const removeRow = (idx) => {
    if (queueLocked || bulkGradingRef.current) {
      addToast && addToast(tr('Wait for decrypting or grading to finish before removing rows.'), 'info');
      return;
    }
    setQueue(prev => prev.filter((_, i) => i !== idx));
    setRubrics(prev => remapRowIndexState(prev, idx));
    setGrades(prev => remapRowIndexState(prev, idx));
    setReviewedRows(prev => remapRowIndexState(prev, idx));
    setConfirmedLearnerMatches(prev => remapRowIndexState(prev, idx));
    setWorkStoryModels(prev => remapRowIndexState(prev, idx));
    setAnchors(prev => prev.filter(anchor => anchor.fromSubmissionIdx !== idx).map(anchor => (
      Number.isInteger(anchor.fromSubmissionIdx) && anchor.fromSubmissionIdx > idx
        ? { ...anchor, fromSubmissionIdx: anchor.fromSubmissionIdx - 1 }
        : anchor
    )));
    setExpandedRow(prev => prev === idx ? null : (Number.isInteger(prev) && prev > idx ? prev - 1 : prev));
    setGradingRow(prev => prev === idx ? null : (Number.isInteger(prev) && prev > idx ? prev - 1 : prev));
    setPendingAnchor(prev => {
      if (!prev || !Number.isInteger(prev.submissionIdx)) return prev;
      if (prev.submissionIdx === idx) return null;
      return prev.submissionIdx > idx ? { ...prev, submissionIdx: prev.submissionIdx - 1 } : prev;
    });
  };
  const clearQueue = () => {
    if (queueLocked || bulkGradingRef.current) {
      addToast && addToast(tr('Wait for decrypting or grading to finish before clearing the queue.'), 'info');
      return;
    }
    setQueue([]); setExpandedRow(null); setGradingRow(null); setPendingAnchor(null);
    setRubrics({}); setGrades({}); setReviewedRows({}); setConfirmedLearnerMatches({}); setWorkStoryModels({});
    setAnchors(prev => prev.filter(anchor => !Number.isInteger(anchor.fromSubmissionIdx)));
  };

  const rosterStudents = (rosterKey && rosterKey.students) || {};

  // Normalize a name for fuzzy comparison: lowercase, strip punctuation
  // + collapse internal whitespace. Handles capitalization, "Test Kid"
  // vs "TestKid", "test-kid", trailing whitespace, etc.
  const _normalizeNickname = (s) => String(s || '').normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  // Returns one of:
  //   { kind: 'exact', name }       — exact match in roster
  //   { kind: 'fuzzy', name }       — normalized match (e.g. "TestKid" ↔ "Test Kid")
  //   { kind: 'unknown' }           — no match found
  // Roster matching is intentionally narrow — fuzzy only matches when the
  // normalized forms are identical. Levenshtein/typo tolerance is out of
  // scope for v1 (too easy to silently mis-attribute).
  const rosterMatch = React.useMemo(() => {
    const rosterStudentNames = Object.keys(rosterStudents);
    const caseInsensitiveRoster = new Map();
    const normalizedRoster = {};
    rosterStudentNames.forEach(n => {
      const lowerName = n.toLowerCase();
      // Preserve the first case-insensitive match in roster enumeration order.
      if (!caseInsensitiveRoster.has(lowerName)) caseInsensitiveRoster.set(lowerName, n);
      const normalized = _normalizeNickname(n);
      if (!normalized) return;
      if (Object.prototype.hasOwnProperty.call(normalizedRoster, normalized) && normalizedRoster[normalized] !== n) normalizedRoster[normalized] = null;
      else normalizedRoster[normalized] = n;
    });
    return (nickname) => {
      if (!nickname || nickname === '?') return { kind: 'unknown' };
      const raw = String(nickname);
      if (rosterStudents[raw]) return { kind: 'exact', name: raw };
      const exactCi = caseInsensitiveRoster.get(raw.toLowerCase());
      if (exactCi) return { kind: 'exact', name: exactCi };
      const norm = _normalizeNickname(raw);
      if (norm && normalizedRoster[norm]) return { kind: 'fuzzy', name: normalizedRoster[norm] };
      return { kind: 'unknown' };
    };
  }, [rosterKey]);
  const savedIdentityForRow = (idx, row) => {
    const payload = row && row.payload && typeof row.payload === 'object' ? row.payload : {};
    const match = rosterMatch(payload.nickname || row?.nickname);
    const confirmedName = confirmedLearnerMatches[idx];
    const resolvedName = match.kind === 'exact' ? match.name
      : match.kind === 'fuzzy' && confirmedName === match.name ? match.name : '';
    const learnerIds = rosterKey && rosterKey.learnerIds && typeof rosterKey.learnerIds === 'object' ? rosterKey.learnerIds : {};
    const keyClassId = siStableIdentityValue(classKeyMeta?.classId);
    const rosterClassId = siStableIdentityValue(rosterKey?.classId);
    const payloadClassId = siStableIdentityValue(payload.classId);
    const classId = keyClassId || payloadClassId || rosterClassId;
    const classMatchesRoster = !rosterClassId || !classId || rosterClassId === classId;
    const assignmentId = siStableIdentityValue(payload.assignmentId);
    const learnerId = resolvedName && classMatchesRoster ? siStableIdentityValue(learnerIds[resolvedName]) : '';
    return {
      ...(classId ? { classId } : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(learnerId ? { learnerId } : {}),
      resolution: learnerId ? (match.kind === 'exact' ? 'exact' : 'confirmed-normalized') : 'unresolved'
    };
  };
  // Back-compat shim so existing callers still get 'known' | 'unknown'.
  const rosterStatus = (nickname) => {
    const m = rosterMatch(nickname);
    return (m.kind === 'exact' || m.kind === 'fuzzy') ? 'known' : 'unknown';
  };
  // Re-grade detection (Phase 3 v2.5, May 12 2026): when a decrypted row's
  // nickname+docTitle already has an entry in the gradebook, surface a
  // badge so the teacher knows this submission was already graded
  // (typically a student resubmitting). The gradebook key encodes
  // timestamp, so distinct submissions stay separate — this just informs
  // the teacher.
  const previousGradesFor = React.useMemo(() => {
    const byKey = {};
    gradebookEntries.forEach(e => {
      const k = (e.nickname || '').toLowerCase() + '|' + (e.docTitle || '').toLowerCase();
      if (!byKey[k]) byKey[k] = [];
      byKey[k].push(e);
    });
    return (nickname, docTitle) => {
      if (!nickname || !docTitle) return [];
      return byKey[(nickname || '').toLowerCase() + '|' + (docTitle || '').toLowerCase()] || [];
    };
  }, [gradebookEntries]);

  const counts = queue.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const statusBadge = (status) => {
    const styles = {
      pending: { bg: '#f1f5f9', color: '#475569', label: tr('Pending') },
      decrypted: { bg: '#dcfce7', color: '#166534', label: tr('✓ Decrypted') },
      error: { bg: '#fee2e2', color: '#991b1b', label: tr('✗ Error') }
    };
    const s = styles[status] || styles.pending;
    return /*#__PURE__*/React.createElement('span', {
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700
      }
    }, s.label);
  };

  // ── Phase 3: AI grading helpers ───────────────────────────
  const updateRubric = (idx, patch) => {
    setRubrics(prev => ({ ...prev, [idx]: { ...(prev[idx] || { rubric: '', context: '', exemplar: '' }), ...patch } }));
  };
  const gradeRow = async (idx, opts) => {
    opts = opts || {};
    const row = queue[idx];
    if (!row || row.status !== 'decrypted' || !row.payload) return;
    const r = rubrics[idx] || {};
    // Per-row rubric wins; fall back to the global rubric so a bulk run
    // or a row that hasn't been customized still has something to grade by.
    const rubricText = ((r.rubric || '').trim() || (globalRubric.rubric || '').trim());
    const contextText = ((r.context || '').trim() || (globalRubric.context || '').trim());
    if (!rubricText) {
      if (!opts.silent) addToast && addToast(tr('Add a class rubric at the top, or a per-submission rubric, before grading.'), 'warn');
      return { ok: 0, fail: 0, skipped: true };
    }
    const QH = window.AlloModules && window.AlloModules.QuizAIHelpers;
    if (!QH || typeof QH.gradeFreeformAnswerWithCalibration !== 'function') {
      addToast && addToast(tr('Grader module not loaded yet. Try again in a moment.'), 'error');
      return;
    }
    const callGemini = window.callGemini;
    if (!aiTextAvailable || typeof callGemini !== 'function') {
      if (!opts.silent) addToast && addToast(tr('AI grading requires an active AI setup. You can still score responses manually below.'), 'warn');
      return { ok: 0, fail: 0, skipped: true, aiUnavailable: true };
    }
    // Calibration samples are resolved per response key in the loop below
    // via siCalibrationSamplesForKey(anchors, key, r.exemplar) so question-specific
    // anchors take priority without cross-contaminating other questions.

    // Skip responses that are already anchored — they have teacher scores
    // already, no need to ask AI.
    const allResponseEntries = siResponseEntryModels(row.payload);
    const entryByKey = new Map(allResponseEntries.map(entry => [entry.key, entry]));
    const anchoredKeys = new Set();
    const matchedAnchors = [];
    anchors.forEach(a => {
      if (a.fromSubmissionIdx !== idx || !a.fromResponseKey) return;
      const entry = entryByKey.get(a.fromResponseKey);
      if (!entry || !entry.answered || !entry.aiGradable) return;
      if (a.studentResponse && String(a.studentResponse) !== String(entry.rawText)) return;
      anchoredKeys.add(a.fromResponseKey);
      matchedAnchors.push(a);
    });
    if (matchedAnchors.length > 0) {
      setReviewedRows(previous => {
        if (!previous[idx]) return previous;
        const next = { ...previous };
        delete next[idx];
        return next;
      });
      setGrades(prev => {
        const rowGrades = { ...(prev[idx] || {}) };
        matchedAnchors.forEach(a => {
          const anchorNum = Number(a.teacherScore);
          const anchorStatus = anchorNum >= 85 ? 'correct' : (anchorNum >= 40 ? 'partially-correct' : 'incorrect');
          rowGrades[a.fromResponseKey] = {
            score: a.teacherScore,
            status: anchorStatus,
            feedback: '📌 Teacher-anchored: ' + (a.teacherFeedback || tr('(no note)')),
            origin: 'teacher-anchor'
          };
        });
        return { ...prev, [idx]: rowGrades };
      });
    }
    const structuredResponseCount = allResponseEntries.filter(entry => entry.requiresManualReview).length;
    const responseEntries = allResponseEntries
      .filter(entry => entry.rawText && entry.aiGradable && !anchoredKeys.has(entry.key));
    if (responseEntries.length === 0) {
      if (!opts.silent) addToast && addToast(
        anchoredKeys.size > 0
          ? tr('All responses on this submission are already anchored.')
          : structuredResponseCount > 0
            ? tr('No written responses need AI grading. Structured responses are ready for your manual review.')
            : tr('No responses to grade in this submission.'),
        'warn'
      );
      return { ok: 0, fail: 0, skipped: true };
    }
    setGradingRow(idx);
    setReviewedRows(previous => {
      if (!previous[idx]) return previous;
      const next = { ...previous };
      delete next[idx];
      return next;
    });
    let ok = 0, fail = 0;
    const rowScope = {
      docId: (row.payload && row.payload.docId) || '',
      assignmentId: (row.payload && row.payload.assignmentId) || '',
      formId: (row.payload && row.payload.formId) || '',
      docTitle: row.docTitle || (row.payload && row.payload.docTitle) || ''
    };
    for (let i = 0; i < responseEntries.length; i++) {
      const entry = responseEntries[i];
      const key = entry.key;
      const value = entry.rawText;
      try {
        // Prompt/part labels come from the student submission and are useful
        // for display only. Never place that untrusted metadata into AI context.
        const itemContext = contextText;
        const trustedPrompt = siLookupTrustedHistoryPrompt(key, history);
        const fullItemContext = trustedPrompt ? (itemContext ? itemContext + '\n' + trustedPrompt : trustedPrompt) : itemContext;
        const cappedSamples = siCalibrationSamplesForKey(anchors, key, r.exemplar, rowScope);
        const result = await QH.gradeFreeformAnswerWithCalibration({
          rubric: rubricText,
          context: fullItemContext,
          studentResponse: String(value),
          calibrationSamples: cappedSamples,
          callGemini: callGemini,
        });
        const liveRow = queueRef.current && queueRef.current[idx];
        if (!liveRow || liveRow.fileName !== row.fileName || liveRow.timestamp !== row.timestamp) break;
        setGrades(prev => ({
          ...prev,
          [idx]: { ...(prev[idx] || {}), [key]: { ...result, origin: 'ai' } }
        }));
        if (result.status !== 'error') ok++; else fail++;
      } catch (err) {
        const liveRow = queueRef.current && queueRef.current[idx];
        if (!liveRow || liveRow.fileName !== row.fileName || liveRow.timestamp !== row.timestamp) break;
        setGrades(prev => ({
          ...prev,
          [idx]: { ...(prev[idx] || {}), [key]: { status: 'error', feedback: err.message || tr('Grader failed'), score: 0, origin: 'ai' } }
        }));
        fail++;
      }
    }
    setGradingRow(null);
    if (!opts.silent) addToast && addToast(
      'Graded ' + ok + ' response' + (ok === 1 ? '' : 's') + (fail > 0 ? ', ' + fail + ' failed' : ''),
      fail > 0 ? 'warn' : 'success'
    );
    return { ok, fail };
  };
  // Phase 3 v2.1: bulk-grade every decrypted submission using the global
  // rubric (and per-row override if one exists). Runs sequentially so the
  // Gemini API isn't hammered + so the teacher can see progress.
  const gradeAllDecrypted = async () => {
    if (bulkGradingRef.current) return;
    if (!aiTextAvailable) {
      addToast && addToast(tr('AI grading requires an active AI setup. Score responses manually or configure AI first.'), 'warn');
      return;
    }
    if (!(globalRubric.rubric || '').trim()) {
      addToast && addToast(tr('Add a class rubric at the top before bulk grading.'), 'warn');
      setGlobalRubricOpen(true);
      return;
    }
    const decryptedIdxs = queue
      .map((r, i) => ({ r, i }))
      .filter(x => x.r.status === 'decrypted')
      .map(x => x.i);
    if (decryptedIdxs.length === 0) {
      addToast && addToast(tr('No decrypted submissions to grade.'), 'warn');
      return;
    }
    bulkCancelRef.current = false;
    bulkGradingRef.current = true;
    setBulkGrading(true);
    setBulkProgress({ current: 0, total: decryptedIdxs.length });
    let totalOk = 0, totalFail = 0, totalSkipped = 0, cancelled = false;
    for (let i = 0; i < decryptedIdxs.length; i++) {
      if (bulkCancelRef.current) { cancelled = true; break; }
      const idx = decryptedIdxs[i];
      setBulkProgress({ current: i + 1, total: decryptedIdxs.length });
      const result = await gradeRow(idx, { silent: true });
      if (result) {
        totalOk += result.ok || 0;
        totalFail += result.fail || 0;
        if (result.skipped) totalSkipped += 1;
      }
      if (bulkCancelRef.current) { cancelled = true; break; }
    }
    bulkGradingRef.current = false;
    setBulkGrading(false);
    setBulkProgress({ current: 0, total: 0 });
    addToast && addToast(
      (cancelled ? 'Bulk grade cancelled: ' : 'Bulk grade done: ') + totalOk + ' response' + (totalOk === 1 ? '' : 's') + ' graded across ' +
        (decryptedIdxs.length - totalSkipped) + ' submission' + (decryptedIdxs.length - totalSkipped === 1 ? '' : 's') +
        (totalFail > 0 ? ', ' + totalFail + ' failed' : '') +
        (totalSkipped > 0 ? ', ' + totalSkipped + ' skipped (already fully anchored or no responses)' : ''),
      cancelled ? 'info' : ((totalFail > 0 && totalOk === 0) ? 'error' : (totalFail > 0 ? 'warn' : (totalOk === 0 ? 'info' : 'success')))
    );
  };
  // ── Anchor management (Phase 3 v2: multi-anchor few-shot) ──────
  const openAnchorForm = (submissionIdx, responseKey, responseText) => {
    setPendingAnchor({ mode: 'anchor', submissionIdx, responseKey, responseText, score: 95, scoreTouched: true, feedback: '' });
  };
  const openManualScoreForm = (submissionIdx, entry) => {
    const existing = (grades[submissionIdx] || {})[entry.key];
    const hasExistingScore = !!(existing && typeof existing.score === 'number' && Number.isFinite(existing.score));
    setPendingAnchor({
      mode: 'manual',
      submissionIdx: submissionIdx,
      responseKey: entry.key,
      responseText: entry.rawText,
      score: hasExistingScore ? existing.score : 0,
      scoreTouched: hasExistingScore,
      feedback: hasExistingScore ? String(existing.feedback || '').slice(0, 2000) : ''
    });
  };
  const cancelPendingAnchor = () => setPendingAnchor(null);
  const confirmPendingAnchor = () => {
    if (!pendingAnchor) return;
    const scoreText = String(pendingAnchor.score == null ? '' : pendingAnchor.score).trim();
    const score = Number(scoreText);
    if (!scoreText || !Number.isFinite(score) || score < 0 || score > 100 || (pendingAnchor.mode === 'manual' && !pendingAnchor.scoreTouched)) {
      addToast && addToast(tr('Enter a score from 0 to 100.'), 'warn');
      return;
    }
    const feedback = String(pendingAnchor.feedback || '').trim().slice(0, 2000);
    if (pendingAnchor.mode === 'manual') {
      const status = score >= 85 ? 'correct' : (score >= 40 ? 'partially-correct' : 'incorrect');
      setGrades(previous => ({
        ...previous,
        [pendingAnchor.submissionIdx]: {
          ...(previous[pendingAnchor.submissionIdx] || {}),
          [pendingAnchor.responseKey]: { score: score, status: status, feedback: feedback, origin: 'teacher-edit' }
        }
      }));
      setReviewedRows(previous => {
        if (!previous[pendingAnchor.submissionIdx]) return previous;
        const next = { ...previous };
        delete next[pendingAnchor.submissionIdx];
        return next;
      });
      setPendingAnchor(null);
      addToast && addToast(tr('Manual score saved.'), 'success');
      return;
    }
    const anchorRow = queue[pendingAnchor.submissionIdx];
    const anchorPayload = anchorRow && anchorRow.payload && typeof anchorRow.payload === 'object' ? anchorRow.payload : {};
    const anchorStatus = score >= 85 ? 'correct' : (score >= 40 ? 'partially-correct' : 'incorrect');
    setGrades(previous => ({
      ...previous,
      [pendingAnchor.submissionIdx]: {
        ...(previous[pendingAnchor.submissionIdx] || {}),
        [pendingAnchor.responseKey]: {
          score: score,
          status: anchorStatus,
          feedback: feedback || ('Teacher calibration anchor (' + score + '/100)'),
          origin: 'teacher-anchor'
        }
      }
    }));
    setReviewedRows(previous => {
      if (!previous[pendingAnchor.submissionIdx]) return previous;
      const next = { ...previous };
      delete next[pendingAnchor.submissionIdx];
      return next;
    });
    setAnchors(prev => [...prev, {
      studentResponse: pendingAnchor.responseText,
      teacherScore: score,
      teacherFeedback: feedback,
      fromSubmissionIdx: pendingAnchor.submissionIdx,
      fromResponseKey: pendingAnchor.responseKey,
      docId: anchorPayload.docId || '',
      assignmentId: anchorPayload.assignmentId || '',
      formId: anchorPayload.formId || '',
      docTitle: (anchorRow && anchorRow.docTitle) || anchorPayload.docTitle || '',
    }]);
    setPendingAnchor(null);
    addToast && addToast('Anchor added (' + score + '/100). It will calibrate every future grading run.', 'success');
  };
  const pendingScoreValid = !!(pendingAnchor
    && String(pendingAnchor.score == null ? '' : pendingAnchor.score).trim()
    && Number.isFinite(Number(pendingAnchor.score))
    && Number(pendingAnchor.score) >= 0 && Number(pendingAnchor.score) <= 100
    && (pendingAnchor.mode !== 'manual' || pendingAnchor.scoreTouched));
  const removeAnchor = (i) => {
    setAnchors(prev => prev.filter((_, idx) => idx !== i));
  };
  const unanchorEntry = (submissionIdx, responseKey, responseText) => {
    setAnchors(prev => prev.filter(a => !anchorMatchesEntry(a, submissionIdx, responseKey, responseText)));
    addToast && addToast(tr('Calibration anchor removed.'), 'info');
  };
  const clearAnchors = () => {
    if (anchors.length === 0) return;
    setAnchors([]);
    addToast && addToast('Cleared ' + anchors.length + ' calibration anchor' + (anchors.length === 1 ? '' : 's') + '.', 'info');
  };
  const anchorMatchesEntry = (a, submissionIdx, responseKey, responseText) => {
    if (!a || a.fromResponseKey !== responseKey) return false;
    const sameResp = responseText === undefined || !a.studentResponse || String(a.studentResponse).trim() === String(responseText).trim();
    if (a.fromSubmissionIdx === submissionIdx) return sameResp;
    if (a.fromSubmissionIdx === undefined || a.fromSubmissionIdx === null) {
      return responseText !== undefined && String(a.studentResponse || '').trim() !== ''
        && String(a.studentResponse).trim() === String(responseText).trim();
    }
    return false;
  };
  const isResponseAnchored = (submissionIdx, responseKey, responseText) => {
    return anchors.some(a => anchorMatchesEntry(a, submissionIdx, responseKey, responseText));
  };
  const getAnchorScore = (submissionIdx, responseKey, responseText) => {
    const a = anchors.find(a2 => anchorMatchesEntry(a2, submissionIdx, responseKey, responseText));
    return a ? a.teacherScore : null;
  };
  const isRowReviewCurrent = (idx) => {
    const snapshot = reviewedRows[idx];
    return !!(snapshot && snapshot.signature === siGradeReviewSignature(grades[idx] || {}));
  };
  const rowGradeSummary = (idx) => {
    const row = queue[idx];
    const rowGrades = grades[idx] || {};
    // Role Swap records are teacher-scored items, counted like manual-review responses.
    const rawEntries = row && row.payload ? siResponseEntryModels(row.payload).concat(siRoleSwapItems(row.payload, history).concat(siStudentStoryItems(row.payload)).map(rs => ({ key: rs.key, requiresManualReview: true, expectedCountKnown: true }))) : [];
    const entries = rawEntries.filter(entry => !entry.isSelfCheck || Object.prototype.hasOwnProperty.call(rowGrades, entry.key));
    const valid = entries.map(entry => ({ entry: entry, grade: rowGrades[entry.key] })).filter(item => {
      const grade = item.grade;
      if (!grade || grade.status === 'error' || typeof grade.score !== 'number'
          || !Number.isFinite(grade.score) || grade.score < 0 || grade.score > 100) return false;
      return !item.entry.requiresManualReview || grade.origin === 'teacher-edit' || grade.origin === 'teacher-anchor' || siIsAnswerKeyOrigin(grade.origin);
    }).map(item => item.grade);
    return {
      total: entries.length,
      scored: valid.length,
      complete: entries.length > 0 && valid.length === entries.length,
      expectedCountKnown: entries.length > 0 && entries.every(entry => entry.expectedCountKnown === true),
      average: valid.length ? Math.round(valid.reduce((sum, grade) => sum + grade.score, 0) / valid.length) : null
    };
  };
  const markRowReviewed = (idx) => {
    const rowGrades = grades[idx] || {};
    if (Object.keys(rowGrades).length === 0) return;
    const summary = rowGradeSummary(idx);
    if (!summary.complete) {
      addToast && addToast('Score all ' + (summary.expectedCountKnown ? 'expected' : 'captured') + ' responses before marking human reviewed (' + summary.scored + ' of ' + summary.total + ' scored).', 'warn');
      return;
    }
    const reviewedAt = new Date().toISOString();
    setReviewedRows(previous => ({ ...previous, [idx]: { reviewedAt, signature: siGradeReviewSignature(rowGrades) } }));
    addToast && addToast(tr('Marked these saved results as human reviewed.'), 'success');
  };

  const _writeRowToGradebook = (idx) => {
    const row = queue[idx];
    if (!row || row.status !== 'decrypted' || !row.payload) return { ok: false, reason: tr('not decrypted') };
    const rowGrades = grades[idx] || {};
    if (Object.keys(rowGrades).length === 0) return { ok: false, reason: tr('no grades') };
    let existing = {};
    try {
      const parsed = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) existing = parsed;
    } catch (_) { existing = {}; }
    const nickname = row.payload.nickname || 'unknown';
    const docTitle = row.payload.docTitle || 'untitled';
    const className = (classKeyMeta && classKeyMeta.className) || (rosterKey && rosterKey.className) || '';
    const legacyKey = nickname + '|' + docTitle + '|' + (row.payload.timestamp || '');
    const submissionKey = className ? (className + '|' + legacyKey) : legacyKey;
    const priorRecord = siAlloSheetPlainObject(existing[submissionKey])
      ? existing[submissionKey]
      : (siAlloSheetPlainObject(existing[legacyKey]) && (!existing[legacyKey].className || existing[legacyKey].className === className) ? existing[legacyKey] : {});
    const reviewSnapshot = reviewedRows[idx];
    const reviewCurrent = isRowReviewCurrent(idx);
    const savedGrades = Object.create(null);
    Object.keys(rowGrades).forEach(key => {
      const grade = siAlloSheetPlainObject(rowGrades[key]) ? rowGrades[key] : {};
      savedGrades[key] = { ...grade, origin: siGradeOrigin(grade.origin), reviewState: reviewCurrent ? 'reviewed' : 'pending' };
    });
    existing[submissionKey] = {
      schemaVersion: 2,
      recordId: siStableIdentityValue(priorRecord.recordId) || siLocalRecordId('GBR'),
      nickname: nickname,
      docTitle: docTitle,
      className: className,
      submittedAt: row.payload.timestamp,
      gradedAt: new Date().toISOString(),
      ...(siAlloSheetDueDate(row.payload.dueDate) ? { dueDate: siAlloSheetDueDate(row.payload.dueDate) } : {}),
      source: 'offline-html',
      identity: savedIdentityForRow(idx, row),
      responses: siResponsesWithRoleSwaps(row.payload, rowGrades, history),
      grades: savedGrades,
      review: {
        state: reviewCurrent ? 'reviewed' : 'pending',
        coverageScope: rowGradeSummary(idx).expectedCountKnown ? 'manifest-expected' : 'captured-only',
        expectedResponseCount: rowGradeSummary(idx).total,
        scoredResponseCount: rowGradeSummary(idx).scored,
        scoreRevision: 1,
        reviewedRevision: reviewCurrent ? 1 : null,
        reviewedAt: reviewCurrent && reviewSnapshot ? reviewSnapshot.reviewedAt : null,
        attestedBy: reviewCurrent ? 'local-educator' : null
      },
      rubric: ((rubrics[idx] && rubrics[idx].rubric) || globalRubric.rubric || '').trim(),
    };
    localStorage.setItem('alloflow_offline_grades', JSON.stringify(existing));
    return { ok: true, key: submissionKey, nickname };
  };
  const saveRowToGradebook = (idx) => {
    const rowGrades = grades[idx] || {};
    if (Object.keys(rowGrades).length === 0) {
      addToast && addToast(tr('Grade the responses first.'), 'warn');
      return;
    }
    try {
      const result = _writeRowToGradebook(idx);
      if (result.ok) {
        addToast && addToast('Saved ' + result.nickname + '\'s submission to local gradebook.', 'success');
        setGradebookRefresh(t => t + 1);
      }
    } catch (err) {
      addToast && addToast('Could not save: ' + err.message, 'error');
    }
  };
  const autoScoreRowObjectiveItems = (idx) => {
    const row = queue[idx];
    if (!row || !row.payload) return;
    const auto = siExportedQuizAutoGrades(row.payload, history);
    const autoKeys = Object.keys(auto);
    if (!autoKeys.length) {
      addToast && addToast(tr('No objective quiz answers matched project quiz answer keys.'), 'info');
      return;
    }
    const existingRow = grades[idx] || {};
    const toApply = {};
    let added = 0;
    autoKeys.forEach((k) => {
      if (!existingRow[k]) {
        toApply[k] = auto[k];
        added++;
      }
    });
    if (!added) {
      addToast && addToast(tr('All matched objective quiz responses are already scored.'), 'info');
      return;
    }
    setGrades(previous => ({
      ...previous,
      [idx]: { ...(previous[idx] || {}), ...toApply }
    }));
    setReviewedRows(previous => {
      if (!previous[idx]) return previous;
      const next = { ...previous };
      delete next[idx];
      return next;
    });
    const notChecked = Object.keys(siStudentCopyOnlyGrades(row.payload, history)).filter(k => !existingRow[k]).length;
    addToast && addToast(tr('Auto-scored {n} objective quiz response(s).', { n: added })
      + (notChecked ? ' ' + tr('{m} more could not be checked, because this project has no copy of that activity.', { m: notChecked }) : ''),
      'success');
  };
  // Only when the teacher asks: score what the project cannot, with the copy
  // of the activity inside the student's own file.
  const scoreRowWithStudentCopy = (idx) => {
    const row = queue[idx];
    if (!row || !row.payload) return;
    const offered = siStudentCopyOnlyGrades(row.payload, history);
    const existingRow = grades[idx] || {};
    const toApply = {};
    Object.keys(offered).forEach((k) => { if (!existingRow[k]) toApply[k] = offered[k]; });
    const added = Object.keys(toApply).length;
    if (!added) return;
    setGrades(previous => ({ ...previous, [idx]: { ...(previous[idx] || {}), ...toApply } }));
    setReviewedRows(previous => {
      if (!previous[idx]) return previous;
      const next = { ...previous };
      delete next[idx];
      return next;
    });
    addToast && addToast(tr('Scored {n} response(s) with the answer key inside the student\'s file. That copy can be out of date or changed, so check those scores.', { n: added }), 'warn');
  };
  const autoScoreAllObjective = () => {
    const nextByRow = {};
    let totalAdded = 0;
    let rowsTouched = 0;
    queue.forEach((row, idx) => {
      if (!row || row.status !== 'decrypted' || !row.payload) return;
      const auto = siExportedQuizAutoGrades(row.payload, history);
      const existingRow = grades[idx] || {};
      const patch = {};
      Object.keys(auto).forEach((k) => {
        if (!existingRow[k]) {
          patch[k] = auto[k];
          totalAdded++;
        }
      });
      if (Object.keys(patch).length > 0) {
        nextByRow[idx] = patch;
        rowsTouched++;
      }
    });
    if (!totalAdded) {
      addToast && addToast(tr('No new objective responses matched project answer keys across decrypted rows.'), 'info');
      return;
    }
    setGrades(previous => {
      const updated = { ...previous };
      Object.keys(nextByRow).forEach((idxKey) => {
        updated[idxKey] = { ...(updated[idxKey] || {}), ...nextByRow[idxKey] };
      });
      return updated;
    });
    setReviewedRows(previous => {
      const next = { ...previous };
      Object.keys(nextByRow).forEach((idxKey) => { delete next[idxKey]; });
      return next;
    });
    addToast && addToast(tr('Auto-scored {n} objective response(s) across {rows} submission(s).', { n: totalAdded, rows: rowsTouched }), 'success');
  };
  const downloadBatchFeedbackPacket = () => {
    const items = queue
      .map((row, idx) => ({ row, idx, rowGrades: grades[idx] || {} }))
      .filter(entry => entry.row && entry.row.status === 'decrypted' && entry.row.payload && Object.keys(entry.rowGrades).length > 0)
      .map(entry => ({ row: entry.row, rowGrades: entry.rowGrades, summary: rowGradeSummary(entry.idx) }));
    if (!items.length) {
      addToast && addToast(tr('Grade or score at least one submission before creating a batch feedback packet.'), 'warn');
      return;
    }
    const html = siBuildBatchFeedbackHtml(items, items[0].row.docTitle || items[0].row.payload.docTitle || 'Class Feedback Packet', history);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alloflow_batch_feedback_' + new Date().toISOString().slice(0, 10) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast(tr('Downloaded batch feedback packet ({n} students).', { n: items.length }), 'success');
  };
  const downloadStudentFeedbackSheet = (idx) => {
    const row = queue[idx];
    if (!row || !row.payload) return;
    const html = siBuildStudentFeedbackHtml(row, grades[idx] || {}, rowGradeSummary(idx), history);
    const safeDoc = String(row.docTitle || row.payload.docTitle || 'worksheet').normalize('NFC').replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'worksheet';
    const safeNick = String(row.nickname || row.payload.nickname || 'student').normalize('NFC').replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'student';
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeDoc + '_' + safeNick + '_feedback.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast(tr('Downloaded feedback sheet for {student}.', { student: row.nickname || row.payload.nickname || tr('Student') }), 'success');
  };
  // Bulk save every row that has grades to the local gradebook.
  const saveAllGradedToGradebook = () => {
    const candidates = queue.map((r, i) => i).filter(i => Object.keys(grades[i] || {}).length > 0);
    if (candidates.length === 0) {
      addToast && addToast(tr('No graded submissions to save yet.'), 'warn');
      return;
    }
    let saved = 0, fail = 0;
    for (const idx of candidates) {
      try {
        const result = _writeRowToGradebook(idx);
        if (result.ok) saved++;
        else fail++;
      } catch (e) { fail++; }
    }
    setGradebookRefresh(t => t + 1);
    addToast && addToast(
      'Saved ' + saved + ' submission' + (saved === 1 ? '' : 's') + ' to local gradebook' + (fail > 0 ? ' (' + fail + ' failed)' : ''),
      fail > 0 ? 'warn' : 'success'
    );
  };
  // Delete a gradebook entry by storage key.
  const deleteGradebookEntry = (storageKey) => {
    try {
      let existing = {};
    try {
      const parsed = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) existing = parsed;
    } catch (_) { existing = {}; }
      delete existing[storageKey];
      localStorage.setItem('alloflow_offline_grades', JSON.stringify(existing));
      setGradebookRefresh(t => t + 1);
      addToast && addToast(tr('Removed from gradebook.'), 'info');
    } catch (e) {
      addToast && addToast('Could not delete: ' + e.message, 'error');
    }
  };
  // CSV export: one row per (submission × response) for spreadsheet pivots.
  const exportGradebookCsv = () => {
    if (gradebookEntries.length === 0) {
      addToast && addToast(tr('Gradebook is empty.'), 'warn');
      return;
    }
    const esc = siCsvCell;
    const headers = ['Nickname', 'Class', 'Document', 'SubmittedAt', 'GradedAt', 'Source', 'ResponseKey', 'StudentResponse', 'Score', 'Status', 'AIFeedback', 'ReviewState', 'Rubric'];
    const rows = [headers.map(esc).join(',')];
    for (const entry of gradebookEntries) {
      const respKeys = Object.keys(entry.grades || {});
      if (respKeys.length === 0) {
        rows.push([entry.nickname, entry.className, entry.docTitle, entry.submittedAt, entry.gradedAt, entry.source, '', '', '', '', '', entry.review?.state || 'legacy-unreviewed', entry.rubric].map(esc).join(','));
        continue;
      }
      for (const k of respKeys) {
        const g = entry.grades[k] || {};
        const rawResp = entry.responses && entry.responses[k];
        const respText = rawResp == null
          ? ''
          : (siAssessmentSnapshot(rawResp) ? siFormatAssessmentSnapshotText(rawResp) : siResponseText(rawResp, 12000));
        rows.push([entry.nickname, entry.className, entry.docTitle, entry.submittedAt, entry.gradedAt, entry.source, k, respText, g.score, g.status, g.feedback, entry.review?.state || 'legacy-unreviewed', entry.rubric].map(esc).join(','));
      }
    }
    const csv = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'alloflow_gradebook_' + dateStr + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast('Downloaded gradebook CSV (' + (rows.length - 1) + ' row' + (rows.length - 1 === 1 ? '' : 's') + ').', 'success');
  };
  const gradebookClasses = React.useMemo(() => {
    const names = Array.from(new Set(gradebookEntries.map(e => String((e && e.className) || '').trim()).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [gradebookEntries]);
  const filteredGradebookEntries = React.useMemo(() => {
    if (gradebookClassFilter === 'all') return gradebookEntries;
    return gradebookEntries.filter(e => String((e && e.className) || '').trim() === gradebookClassFilter);
  }, [gradebookEntries, gradebookClassFilter]);
  // 1-row-per-student LMS summary CSV with dynamic per-item score columns, preset support & UTF-8 BOM.
  const exportGradebookSummaryCsv = () => {
    if (filteredGradebookEntries.length === 0) {
      addToast && addToast(tr('Gradebook is empty.'), 'warn');
      return;
    }
    const built = siBuildLmsGradebookCsv(filteredGradebookEntries, lmsCsvPreset);
    const blob = new Blob(['\uFEFF' + built.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    const classSlug = gradebookClassFilter !== 'all'
      ? ('_' + gradebookClassFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32))
      : '';
    a.href = url;
    a.download = 'alloflow_gradebook_summary_' + built.preset + classSlug + '_' + dateStr + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast(tr('Downloaded {preset} summary CSV ({n} submissions).', { preset: built.preset, n: built.rowCount }), 'success');
  };
  const gradebookSummary = React.useMemo(
    () => gradebookOpen ? siBuildGradebookSummary(filteredGradebookEntries, gradebookGroupBy === 'student') : null,
    [filteredGradebookEntries, gradebookOpen, gradebookGroupBy]
  );
  const gradebookAvg = entry => gradebookSummary.averages.get(entry);
  const scoreColor = (score) => {
    if (typeof score !== 'number') return { bg: '#f1f5f9', color: '#475569' };
    if (score >= 85) return { bg: '#dcfce7', color: '#166534' };
    if (score >= 65) return { bg: '#fef3c7', color: '#92400e' };
    if (score >= 40) return { bg: '#fed7aa', color: '#9a3412' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };
  // Review / save / status controls for one row; shared by the rubric section and response-free rows.
  const renderRowGradeActions = (idx) => Object.keys(grades[idx] || {}).length === 0 ? [] : [
    /*#__PURE__*/React.createElement('button', {
      key: 'review',
      type: 'button',
      'aria-pressed': isRowReviewCurrent(idx),
      onClick: () => markRowReviewed(idx),
      style: { padding: '8px 16px', background: isRowReviewCurrent(idx) ? '#065f46' : '#fff7ed', color: isRowReviewCurrent(idx) ? 'white' : '#9a3412', border: '1px solid #fdba74', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
    }, isRowReviewCurrent(idx) ? tr('✓ Human reviewed') : tr('Mark human reviewed')),
    /*#__PURE__*/React.createElement('button', {
      key: 'save',
      type: 'button',
      onClick: () => saveRowToGradebook(idx),
      style: { padding: '8px 16px', background: '#15803d', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
    }, tr('💾 Save to gradebook')),
    /*#__PURE__*/React.createElement('button', {
      key: 'feedback-sheet',
      type: 'button',
      title: tr('Download a printable HTML feedback sheet for this student'),
      onClick: () => downloadStudentFeedbackSheet(idx),
      style: { padding: '8px 14px', background: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
    }, tr('📄 Download feedback sheet')),
    /*#__PURE__*/React.createElement('span', { key: 'status', role: 'status', 'aria-live': 'polite', style: { fontSize: '0.78rem', color: '#64748b' } },
      (() => { const summary = rowGradeSummary(idx); return 'Avg: ' + (summary.average == null ? '—' : summary.average + '/100') + ' · ' + summary.scored + ' of ' + summary.total + (summary.expectedCountKnown ? ' expected' : ' captured') + ' responses scored'; })()
    )
  ];



  const alloSheetReviewOptions = React.useMemo(() => {
    if (!showAlloSheetReview || !alloSheetSourceSnapshot || !alloSheetAsOf) {
      return {
        review: null,
        error: ''
      };
    }
    try {
      return {
        review: siSubmissionInboxAlloSheetOptions(alloSheetSourceSnapshot, {
          dateRange: alloSheetDateRange,
          attemptPolicy: alloSheetAttemptPolicy,
          createdAt: alloSheetAsOf
        }),
        error: ''
      };
    } catch (error) {
      return {
        review: null,
        error: error && error.message
          ? error.message
          : 'Submission Inbox could not prepare the saved-grade review.'
      };
    }
  }, [
    showAlloSheetReview,
    alloSheetSourceSnapshot,
    alloSheetAsOf,
    alloSheetDateRange,
    alloSheetAttemptPolicy
  ]);

  const alloSheetPreview = React.useMemo(() => {
    if (!showAlloSheetReview || !alloSheetSourceSnapshot || !alloSheetAsOf) {
      return {
        artifact: null,
        error: ''
      };
    }
    try {
      return {
        artifact: siBuildSubmissionInboxAlloSheetEnvelope(alloSheetSourceSnapshot, {
          dateRange: alloSheetDateRange,
          attemptPolicy: alloSheetAttemptPolicy,
          assignmentKeys: alloSheetAssignments,
          datasets: alloSheetDatasets,
          createdAt: alloSheetAsOf
        }),
        error: ''
      };
    } catch (error) {
      return {
        artifact: null,
        error: error && error.message
          ? error.message
          : 'Submission Inbox could not prepare a bounded AlloSheet preview.'
      };
    }
  }, [
    showAlloSheetReview,
    alloSheetSourceSnapshot,
    alloSheetAsOf,
    alloSheetDateRange,
    alloSheetAttemptPolicy,
    alloSheetAssignments,
    alloSheetDatasets
  ]);

  const openAlloSheetReview = (event) => {
    if (gradebookEntries.length === 0) {
      addToast && addToast(tr('Gradebook is empty.'), 'warn');
      return;
    }
    if (typeof onOpenAlloSheet !== 'function') {
      addToast && addToast(tr('AlloSheet is still loading. Try again in a moment.'), 'error');
      return;
    }
    try {
      const snapshot = siPrepareAlloSheetSavedSource({ gradebookEntries: gradebookEntries });
      const asOf = new Date().toISOString();
      const review = siSubmissionInboxAlloSheetOptions(snapshot, {
        dateRange: '90d',
        attemptPolicy: 'latest-per-class-nickname',
        createdAt: asOf
      });
      alloSheetReturnFocusRef.current = event && event.currentTarget
        ? event.currentTarget : document.activeElement;
      alloSheetBusyRef.current = false;
      setAlloSheetSourceSnapshot(snapshot);
      setAlloSheetAsOf(asOf);
      setAlloSheetDateRange('90d');
      setAlloSheetAttemptPolicy('latest-per-class-nickname');
      setAlloSheetAssignments(review.assignments.map(item => item.key));
      setAlloSheetDatasets({ submissionSummary: true, scoreSummary: true });
      setAlloSheetBusy(false);
      setAlloSheetFeedback(review.assignments.length > 0
        ? { kind: '', text: '' }
        : {
            kind: 'status',
            text: 'No teacher-saved records have a valid saved date in the last 90 days. Choose another date window.'
          });
      setShowAlloSheetReview(true);
    } catch (error) {
      addToast && addToast(
        error && error.message
          ? error.message
          : tr('Submission Inbox could not prepare the AlloSheet review.'),
        'error'
      );
    }
  };

  const updateAlloSheetWindow = (dateRange, attemptPolicy) => {
    setAlloSheetDateRange(dateRange);
    setAlloSheetAttemptPolicy(attemptPolicy);
    setAlloSheetFeedback({ kind: '', text: '' });
    if (!alloSheetSourceSnapshot || !alloSheetAsOf) return;
    try {
      const review = siSubmissionInboxAlloSheetOptions(alloSheetSourceSnapshot, {
        dateRange: dateRange,
        attemptPolicy: attemptPolicy,
        createdAt: alloSheetAsOf
      });
      setAlloSheetAssignments(review.assignments.map(item => item.key));
      if (review.assignments.length === 0) {
        setAlloSheetFeedback({
          kind: 'status',
          text: 'No teacher-saved records match this date window and attempt policy.'
        });
      }
    } catch (error) {
      setAlloSheetAssignments([]);
      setAlloSheetFeedback({
        kind: 'error',
        text: error && error.message
          ? error.message
          : 'Submission Inbox could not update the saved-grade review.'
      });
    }
  };

  const closeAlloSheetReview = () => {
    if (alloSheetBusyRef.current) return;
    setShowAlloSheetReview(false);
    setAlloSheetFeedback({ kind: '', text: '' });
  };

  const confirmAlloSheetReview = async () => {
    if (alloSheetBusyRef.current || typeof onOpenAlloSheet !== 'function') return;
    const artifact = alloSheetPreview.artifact;
    if (!artifact || alloSheetPreview.error) {
      setAlloSheetFeedback({
        kind: 'error',
        text: alloSheetPreview.error || 'No reviewed Submission Inbox table is ready to transfer.'
      });
      return;
    }
    if (!artifact.tables.some(table => table.rowCount > 0)) {
      setAlloSheetFeedback({
        kind: 'error',
        text: 'No reviewed Submission Inbox rows match these choices.'
      });
      return;
    }
    alloSheetBusyRef.current = true;
    setAlloSheetBusy(true);
    setAlloSheetFeedback({
      kind: 'status',
      text: 'Opening AlloSheet and waiting for secure receipt...'
    });
    try {
      const pending = onOpenAlloSheet(artifact);
      const opened = pending && typeof pending.then === 'function'
        ? await pending : pending;
      if (opened === false || opened == null) throw new Error('AlloSheet did not open.');
      setAlloSheetFeedback({ kind: '', text: '' });
      setShowAlloSheetReview(false);
      addToast && addToast(
        tr('Reviewed Submission Inbox summaries were received for destination review in AlloSheet.'),
        'success'
      );
    } catch (error) {
      setAlloSheetFeedback({
        kind: 'error',
        text: error && error.message
          ? error.message
          : 'AlloSheet could not receive the reviewed Submission Inbox summaries.'
      });
    } finally {
      alloSheetBusyRef.current = false;
      setAlloSheetBusy(false);
    }
  };

  const renderAlloSheetReview = () => {
    if (!showAlloSheetReview || !window.ReactDOM || typeof window.ReactDOM.createPortal !== 'function') {
      return null;
    }
    const e = React.createElement;
    const review = alloSheetReviewOptions.review;
    const artifact = alloSheetPreview.artifact;
    const tables = artifact && Array.isArray(artifact.tables) ? artifact.tables : [];
    const assignments = review && Array.isArray(review.assignments) ? review.assignments : [];
    const assignmentReviewCodes = new Map();
    assignments.filter(assignment => alloSheetAssignments.includes(assignment.key))
      .forEach((assignment, index) => {
        assignmentReviewCodes.set(assignment.key, 'A' + String(index + 1).padStart(3, '0'));
      });
    const datasetOptions = [
      {
        key: 'submissionSummary',
        table: 'saved_submission_summary',
        label: 'Saved submission summary',
        description: 'Saved-record counts, identity coverage, privacy-suppressed review coverage, rubric-presence counts, due-date coverage, and assignment-group date bounds.'
      },
      {
        key: 'scoreSummary',
        table: 'saved_score_summary',
        label: 'Saved score summary',
        description: 'Score counts and privacy-suppressed score statistics from saved grade results.'
      }
    ];
    const hasRows = tables.some(table => table.rowCount > 0);
    const controlStyle = {
      minHeight: 44,
      width: '100%',
      border: '2px solid #94a3b8',
      borderRadius: 8,
      background: 'white',
      color: '#0f172a',
      padding: '8px 10px',
      fontSize: '0.9rem'
    };
    return window.ReactDOM.createPortal(e('div', {
      role: 'presentation',
      onClick: event => {
        if (event.target === event.currentTarget && !alloSheetBusy) closeAlloSheetReview();
      },
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 295,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,23,42,0.82)'
      }
    }, e('div', {
      ref: alloSheetReviewDialogRef,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-busy': alloSheetBusy ? 'true' : 'false',
      'aria-labelledby': 'submission-inbox-allosheet-review-title',
      'aria-describedby': 'submission-inbox-allosheet-review-description submission-inbox-allosheet-review-privacy',
      tabIndex: -1,
      onKeyDown: event => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!alloSheetBusyRef.current) closeAlloSheetReview();
          return;
        }
        siTrapAlloSheetReviewFocus(event, alloSheetReviewDialogRef.current);
      },
      style: {
        width: '100%',
        maxWidth: 820,
        maxHeight: '92vh',
        overflowY: 'auto',
        borderRadius: 16,
        border: '3px solid #a5b4fc',
        background: 'white',
        color: '#0f172a',
        boxShadow: '0 24px 70px rgba(0,0,0,0.38)'
      }
    },
      e('div', {
        style: {
          padding: '18px 20px',
          borderBottom: '1px solid #cbd5e1',
          background: '#eef2ff'
        }
      },
        e('h2', {
          id: 'submission-inbox-allosheet-review-title',
          style: { margin: 0, color: '#312e81', fontSize: '1.25rem', fontWeight: 900 }
        }, tr('Review Submission Inbox data for AlloSheet')),
        e('p', {
          id: 'submission-inbox-allosheet-review-description',
          style: { margin: '7px 0 0', color: '#334155', fontSize: '0.88rem', lineHeight: 1.5 }
        }, tr('Choose the saved assignment/class groups, date window, grouping policy, and exact summary tables. Submission Inbox remains authoritative and AlloSheet cannot write back.'))
      ),
      e('div', {
        style: { display: 'grid', gap: 16, padding: 20, fontSize: '0.9rem' }
      },
        e('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12
          }
        },
          e('div', null,
            e('label', {
              htmlFor: 'submission-inbox-allosheet-date-range',
              style: { display: 'block', marginBottom: 5, fontWeight: 800 }
            }, tr('Saved-date window')),
            e('select', {
              id: 'submission-inbox-allosheet-date-range',
              value: alloSheetDateRange,
              disabled: alloSheetBusy,
              onChange: event => updateAlloSheetWindow(event.target.value, alloSheetAttemptPolicy),
              style: controlStyle
            },
              e('option', { value: '30d' }, tr('Last 30 days')),
              e('option', { value: '90d' }, tr('Last 90 days (recommended)')),
              e('option', { value: 'all' }, tr('All available saved dates'))
            )
          ),
          e('div', null,
            e('label', {
              htmlFor: 'submission-inbox-allosheet-attempt-policy',
              style: { display: 'block', marginBottom: 5, fontWeight: 800 }
            }, tr('Saved-attempt policy')),
            e('select', {
              id: 'submission-inbox-allosheet-attempt-policy',
              value: alloSheetAttemptPolicy,
              disabled: alloSheetBusy,
              onChange: event => updateAlloSheetWindow(alloSheetDateRange, event.target.value),
              style: controlStyle
            },
              e('option', { value: 'latest-per-class-nickname' }, tr('Latest saved record per class nickname and assignment/class group (recommended)')),
              e('option', { value: 'all-saved' }, tr('All saved records, including resubmissions'))
            )
          )
        ),
        e('fieldset', {
          disabled: alloSheetBusy,
          style: {
            margin: 0,
            border: '2px solid #cbd5e1',
            borderRadius: 12,
            padding: 12
          }
        },
          e('legend', {
            style: { padding: '0 6px', fontWeight: 900, color: '#1e293b' }
          }, tr('Saved assignment/class groups')),
          e('p', {
            style: { margin: '0 0 10px', color: '#475569', fontSize: '0.8rem' }
          }, tr('Assignment and class labels are shown only for this source review. They are replaced by transfer-local codes before transfer.')),
          assignments.length === 0
            ? e('p', {
                role: 'status',
                style: { margin: 0, color: '#92400e', fontWeight: 700 }
              }, tr('No saved assignment/class groups match these choices.'))
            : e('div', {
                style: {
                  display: 'grid',
                  gap: 7,
                  maxHeight: 190,
                  overflowY: 'auto',
                  paddingRight: 4
                }
              }, assignments.map(assignment => e('label', {
                key: assignment.key,
                style: {
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 9,
                  minHeight: 44,
                  padding: '9px 10px',
                  border: '1px solid #94a3b8',
                  borderRadius: 8,
                  background: alloSheetAssignments.includes(assignment.key) ? '#eef2ff' : 'white',
                  cursor: alloSheetBusy ? 'not-allowed' : 'pointer'
                }
              },
                e('input', {
                  type: 'checkbox',
                  checked: alloSheetAssignments.includes(assignment.key),
                  disabled: alloSheetBusy,
                  onChange: event => {
                    const checked = event.target.checked;
                    setAlloSheetAssignments(previous => checked
                      ? previous.concat([assignment.key]).filter((title, index, list) => list.indexOf(title) === index)
                      : previous.filter(title => title !== assignment.key));
                    setAlloSheetFeedback({ kind: '', text: '' });
                  },
                  style: { width: 20, height: 20, marginTop: 1, flexShrink: 0 }
                }),
                e('span', { style: { minWidth: 0 } },
                  e('span', {
                    style: { display: 'block', fontWeight: 800, overflowWrap: 'anywhere' }
                  }, (assignmentReviewCodes.get(assignment.key)
                    ? assignmentReviewCodes.get(assignment.key) + ' - ' : '') + assignment.label),
                  e('span', {
                    style: { display: 'block', marginTop: 2, color: '#475569', fontSize: '0.76rem' }
                  }, assignment.savedEntryCount + ' saved record' + (assignment.savedEntryCount === 1 ? '' : 's'))
                )
              ))),
          review && review.omittedAssignmentCount > 0 && e('p', {
            role: 'status',
            style: { margin: '9px 0 0', color: '#92400e', fontWeight: 700, fontSize: '0.8rem' }
          }, review.omittedAssignmentCount + ' additional assignment option'
            + (review.omittedAssignmentCount === 1 ? ' is' : 's are')
            + ' omitted by the 50-assignment review limit.')
        ),
        e('fieldset', {
          disabled: alloSheetBusy,
          style: {
            margin: 0,
            border: '2px solid #cbd5e1',
            borderRadius: 12,
            padding: 12
          }
        },
          e('legend', {
            style: { padding: '0 6px', fontWeight: 900, color: '#1e293b' }
          }, tr('Summary tables')),
          e('div', { style: { display: 'grid', gap: 8 } }, datasetOptions.map(dataset => {
            const table = tables.find(candidate => candidate.id === dataset.table);
            return e('label', {
              key: dataset.key,
              style: {
                display: 'grid',
                gridTemplateColumns: '22px minmax(0, 1fr) auto',
                alignItems: 'start',
                gap: 8,
                minHeight: 44,
                padding: '9px 10px',
                border: '1px solid #94a3b8',
                borderRadius: 8
              }
            },
              e('input', {
                type: 'checkbox',
                checked: alloSheetDatasets[dataset.key] !== false,
                disabled: alloSheetBusy,
                onChange: event => {
                  const checked = event.target.checked;
                  setAlloSheetDatasets(previous => ({
                    ...previous,
                    [dataset.key]: checked
                  }));
                  setAlloSheetFeedback({ kind: '', text: '' });
                },
                style: { width: 20, height: 20, marginTop: 1 }
              }),
              e('span', null,
                e('span', { style: { display: 'block', fontWeight: 800 } }, tr(dataset.label)),
                e('span', {
                  style: { display: 'block', marginTop: 2, color: '#475569', fontSize: '0.76rem' }
                }, tr(dataset.description))
              ),
              e('span', {
                style: { color: '#475569', fontSize: '0.76rem', whiteSpace: 'nowrap' }
              }, table ? table.rowCount + ' rows' : 'not selected')
            );
          }))
        ),
        artifact && artifact.provenance && artifact.provenance.dueDateSemantics && e('p', {
          role: 'status',
          'aria-live': 'polite',
          id: 'submission-inbox-allosheet-review-due-status',
          style: {
            margin: 0,
            padding: 12,
            border: '2px solid #93c5fd',
            borderRadius: 10,
            background: '#eff6ff',
            color: '#1e3a8a',
            lineHeight: 1.5
          }
        },
          e('strong', null, tr('Due-date reporting: ')),
          artifact.provenance.dueDateSupport === true
            ? (artifact.provenance.dueDateSemantics.suppressedDueDateSummaryCount > 0
              ? tr('Validated due dates are present. On-time/late/unknown counts are suppressed for small groups. Missing work is not calculated.')
              : tr('Validated due dates are present. Late means the submission timestamp is after the due instant. Missing work is not calculated.'))
            : tr('No validated due dates were supplied. Late status and missing work are not calculated.')
        ),
        e('p', {
          id: 'submission-inbox-allosheet-review-privacy',
          style: {
            margin: 0,
            padding: 12,
            border: '2px solid #f59e0b',
            borderRadius: 10,
            background: '#fffbeb',
            color: '#78350f',
            lineHeight: 1.5
          }
        },
          e('strong', null, tr('Privacy boundary: ')),
          tr('The transfer uses aggregate assignment codes. Learner, class, and assignment names; response text and keys; AI feedback; rubric prose; files; storage keys; and work-evidence details are always excluded. Derived score statistics and on-time/late counts are blank when the applicable total is below five or any nonzero bucket would expose a small group. Missing work is never inferred.')
        ),
        e('section', {
          'aria-labelledby': 'submission-inbox-allosheet-preview-heading',
          style: {
            padding: 13,
            border: '2px solid #94a3b8',
            borderRadius: 10,
            background: '#f8fafc'
          }
        },
          e('h3', {
            id: 'submission-inbox-allosheet-preview-heading',
            style: { margin: 0, fontSize: '1rem', fontWeight: 900 }
          }, tr('Exact transfer preview')),
          (alloSheetReviewOptions.error || alloSheetPreview.error) && e('p', {
            role: 'alert',
            style: {
              margin: '9px 0 0',
              padding: 10,
              border: '1px solid #fca5a5',
              borderRadius: 8,
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 700
            }
          }, alloSheetReviewOptions.error || alloSheetPreview.error),
          !alloSheetReviewOptions.error && !alloSheetPreview.error && e('ul', {
            style: { display: 'grid', gap: 9, margin: '10px 0 0', padding: 0, listStyle: 'none' }
          }, tables.map(table => e('li', {
            key: table.id,
            style: {
              padding: 10,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: 'white'
            }
          },
            e('div', { style: { fontWeight: 800 } }, tr(table.title)),
            e('div', {
              style: { marginTop: 3, color: '#475569', fontSize: '0.76rem' }
            }, table.rowCount + ' rows and ' + table.columns.length + ' fixed fields'),
            e('ul', {
              'aria-label': table.title + ' fields',
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                margin: '8px 0 0',
                padding: 0,
                listStyle: 'none'
              }
            }, table.columns.map(column => e('li', {
              key: column.key,
              style: {
                padding: '3px 6px',
                border: '1px solid #94a3b8',
                borderRadius: 5,
                background: '#f8fafc',
                fontSize: '0.7rem'
              }
            }, tr(column.label) + ' (' + column.type + ')')))
          ))),
          artifact && artifact.provenance
            && artifact.provenance.truncatedSourceEntryCount > 0
            && e('p', {
              role: 'status',
              style: {
                margin: '9px 0 0',
                padding: 8,
                border: '1px solid #fbbf24',
                borderRadius: 7,
                background: '#fffbeb',
                color: '#78350f',
                fontWeight: 700
              }
            }, artifact.provenance.truncatedSourceEntryCount
              + ' saved gradebook record'
              + (artifact.provenance.truncatedSourceEntryCount === 1 ? ' was' : 's were')
              + ' omitted by the 2,000-record source-review safety limit.'),
          artifact && artifact.provenance
            && artifact.provenance.truncatedGradeResultCount > 0
            && e('p', {
              role: 'status',
              style: {
                margin: '9px 0 0',
                padding: 8,
                border: '1px solid #fbbf24',
                borderRadius: 7,
                background: '#fffbeb',
                color: '#78350f',
                fontWeight: 700
              }
            }, artifact.provenance.truncatedGradeResultCount
              + ' grade result'
              + (artifact.provenance.truncatedGradeResultCount === 1 ? ' was' : 's were')
              + ' omitted by the 200-results-per-saved-record safety limit.'),
          artifact && artifact.provenance
            && artifact.provenance.suppressedScoreSummaryCount > 0
            && e('p', {
              role: 'status',
              style: {
                margin: '9px 0 0',
                padding: 8,
                border: '1px solid #fbbf24',
                borderRadius: 7,
                background: '#fffbeb',
                color: '#78350f',
                fontWeight: 700
              }
            }, artifact.provenance.suppressedScoreSummaryCount
              + ' score summary '
              + (artifact.provenance.suppressedScoreSummaryCount === 1 ? 'is' : 'rows are')
              + ' privacy-suppressed.')
        ),
        e('div', {
          style: {
            padding: 12,
            border: '1px solid #fda4af',
            borderRadius: 10,
            background: '#fff1f2',
            color: '#881337',
            lineHeight: 1.5
          }
        },
          e('p', { style: { margin: 0, fontWeight: 900 } }, tr('Saved-record integrity limits')),
          e('p', { style: { margin: '5px 0 0', fontSize: '0.8rem' } },
            tr('New Submission Inbox records can store stable class, assignment, and confirmed roster-learner identity plus an explicit human-review attestation. Legacy or unresolved records still fall back to normalized class name plus nickname and normalized class name plus document title, and the preview reports that coverage. Saving alone never establishes human review. Review-state and late-status counts are privacy-suppressed for small groups. Late means the saved submission timestamp is strictly after a validated assignment due instant; missing work still is not calculated because this transfer has no roster denominator.')
          )
        ),
        e('div', {
          style: {
            padding: 12,
            border: '1px solid #6ee7b7',
            borderRadius: 10,
            background: '#ecfdf5',
            color: '#064e3b',
            lineHeight: 1.5
          }
        },
          e('p', { style: { margin: 0, fontWeight: 900 } }, tr('One-way reviewed copy')),
          e('p', { style: { margin: '5px 0 0', fontSize: '0.8rem' } },
            tr('This transfer does not enable AI, send data to an AI service, change Submission Inbox, or allow AlloSheet to write back.')
          )
        ),
        alloSheetFeedback.text && e('p', {
          role: alloSheetFeedback.kind === 'error' ? 'alert' : 'status',
          'aria-live': alloSheetFeedback.kind === 'error' ? 'assertive' : 'polite',
          style: {
            margin: 0,
            padding: 11,
            border: alloSheetFeedback.kind === 'error' ? '1px solid #fca5a5' : '1px solid #a5b4fc',
            borderRadius: 8,
            background: alloSheetFeedback.kind === 'error' ? '#fef2f2' : '#eef2ff',
            color: alloSheetFeedback.kind === 'error' ? '#991b1b' : '#312e81',
            fontWeight: 700
          }
        }, alloSheetFeedback.text)
      ),
      e('div', {
        style: {
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 9,
          padding: '14px 20px',
          borderTop: '1px solid #cbd5e1',
          background: 'white'
        }
      },
        e('button', {
          type: 'button',
          onClick: closeAlloSheetReview,
          disabled: alloSheetBusy,
          style: {
            minHeight: 44,
            padding: '8px 15px',
            border: '2px solid #64748b',
            borderRadius: 8,
            background: 'white',
            color: '#0f172a',
            fontWeight: 800,
            cursor: alloSheetBusy ? 'not-allowed' : 'pointer',
            opacity: alloSheetBusy ? 0.55 : 1
          }
        }, tr('Cancel')),
        e('button', {
          type: 'button',
          onClick: confirmAlloSheetReview,
          disabled: alloSheetBusy
            || !!alloSheetReviewOptions.error
            || !!alloSheetPreview.error
            || !hasRows,
          style: {
            minHeight: 44,
            padding: '8px 17px',
            border: '2px solid #3730a3',
            borderRadius: 8,
            background: '#4338ca',
            color: 'white',
            fontWeight: 900,
            cursor: alloSheetBusy ? 'not-allowed' : 'pointer',
            opacity: alloSheetBusy
              || !!alloSheetReviewOptions.error
              || !!alloSheetPreview.error
              || !hasRows ? 0.55 : 1
          }
        }, alloSheetBusy ? tr('Waiting for AlloSheet...') : tr('Confirm and open AlloSheet'))
      )
    )), document.body);
  };

  // rosterBadge accepts either a legacy 'known'|'unknown' string OR the
  // {kind, name} object returned by rosterMatch — fuzzy matches surface
  // the real roster name so a "TestKid" submission shows "✓ Test Kid".
  const rosterBadge = (input) => {
    let kind, name;
    if (typeof input === 'string') {
      kind = input;
      name = null;
    } else if (input && typeof input === 'object') {
      kind = input.kind === 'exact' || input.kind === 'fuzzy' ? input.kind : 'unknown';
      name = input.name;
    } else {
      kind = 'unknown';
    }
    let bg, color, label, title;
    if (kind === 'exact') {
      bg = '#dcfce7'; color = '#166534'; label = tr('✓ Roster match'); title = tr('Exact roster match');
    } else if (kind === 'fuzzy') {
      bg = '#dcfce7'; color = '#166534'; label = '✓ ' + name; title = 'Matched roster student "' + name + '" by normalized name (capitalization/punctuation ignored)';
    } else {
      bg = '#fef3c7'; color = '#92400e'; label = tr('⚠ Unknown name'); title = tr('No roster student matched this nickname');
    }
    return /*#__PURE__*/React.createElement('span', {
      title: title,
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: bg, color: color, fontSize: '0.7rem', fontWeight: 600
      }
    }, label);
  };

  // ── Render ──────────────────────────────────────────────────
  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 270,
      background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }
  },
    /*#__PURE__*/React.createElement('div', {
      ref: dialogRef, 'data-si-dialog': 'true', role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': 'submission-inbox-title', 'aria-describedby': 'submission-inbox-description',
      tabIndex: -1, onKeyDown: event => containDialogFocus(event, dialogRef.current),
      style: {
        background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 980, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '2px solid #c7d2fe', overflow: 'hidden', position: 'relative'
      }
    },
      /*#__PURE__*/React.createElement('style', null,
        '[data-si-dialog] :is(button,input,select,textarea,summary,[tabindex="0"]):focus-visible{outline:2px solid #4338ca;outline-offset:2px}' +
        '@media (prefers-reduced-motion:reduce){[data-si-dialog] *{transition-duration:0.01ms !important;animation-duration:0.01ms !important}}'
      ),
      // Header
      /*#__PURE__*/React.createElement('div', { style: { padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
        /*#__PURE__*/React.createElement('div', null,
          /*#__PURE__*/React.createElement('h2', { id: 'submission-inbox-title', style: { margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 } },
            tr('📥 Import student submissions')
          ),
          /*#__PURE__*/React.createElement('p', { id: 'submission-inbox-description', style: { margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569' } },
            tr('Add student submission files or collect them from Class Mailbox. Load a class key only if decrypting .alloflow.html files.')
          )
        ),
        /*#__PURE__*/React.createElement('button', {
          ref: closeButtonRef, type: 'button', onClick: onClose,
          style: { minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', border: 'none', background: 'transparent', color: '#334155', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, borderRadius: 8 },
          'aria-label': tr('Close')
        }, /*#__PURE__*/React.createElement('span', { 'aria-hidden': 'true' }, '×'))
      ),

      // Body
      /*#__PURE__*/React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '18px 22px' } },
        // Primary action: student submission files + Class Mailbox pickup
        /*#__PURE__*/React.createElement('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('div', null,
              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#166534', marginBottom: 2 } }, tr('Student submission files')),
              /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: '0.85rem', color: '#475569' } },
                queue.length === 0
                  ? tr('Select the files students saved — plain .json (no key needed) or encrypted .alloflow.html (uses your class key below).')
                  : (queue.length + ' file' + (queue.length === 1 ? '' : 's') + ' loaded · ' +
                     (counts.decrypted || 0) + ' decrypted · ' +
                     (counts.pending || 0) + ' pending · ' +
                     (counts.error || 0) + ' error')
              )
            ),
            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8 } },
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: () => subInputRef.current?.click(), disabled: queueLocked,
                style: { minHeight: 44, padding: '8px 16px', background: '#15803d', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: queueLocked ? 'not-allowed' : 'pointer', opacity: queueLocked ? 0.55 : 1, fontSize: '0.88rem' }
              }, tr('＋ Add submissions')),
              queue.length > 0 && /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: clearQueue, disabled: queueLocked,
                style: { minHeight: 44, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: queueLocked ? 'not-allowed' : 'pointer', opacity: queueLocked ? 0.55 : 1, fontSize: '0.82rem' }
              }, tr('Clear'))
            )
          ),
          /*#__PURE__*/React.createElement('input', {
            ref: subInputRef, type: 'file', accept: '.html,.alloflow.html,text/html,.json,application/json,.csv,text/csv', multiple: true,
            onChange: handleSubmissionFiles, style: { display: 'none' }, 'aria-label': tr('Submission files')
          }),
          /*#__PURE__*/React.createElement('div', { 'data-si-mailbox-pull': 'true', style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #bbf7d0' } },
            (typeof window !== 'undefined' && window.__alloMailboxSubmissions && window.__alloMailboxSubmissions.connected)
              ? /*#__PURE__*/React.createElement(React.Fragment, null,
                  /*#__PURE__*/React.createElement('button', {
                    type: 'button', onClick: pullFromMailbox, disabled: mbPull.busy, 'aria-busy': mbPull.busy ? 'true' : 'false',
                    style: { minHeight: 44, padding: '8px 14px', background: 'white', color: '#166534', border: '1px solid #15803d', borderRadius: 8, fontWeight: 700, cursor: mbPull.busy ? 'wait' : 'pointer', fontSize: '0.85rem' }
                  }, mbPull.busy ? tr('Getting submissions…') : tr('📬 Get submissions from Class Mailbox')),
                  /*#__PURE__*/React.createElement('label', { style: { minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' } },
                    /*#__PURE__*/React.createElement('input', { type: 'checkbox', checked: mbPull.all, disabled: mbPull.busy, onChange: ev => { const checked = ev.target.checked; setMbPull(s => ({ ...s, all: checked })); } }),
                    tr('Include ones already collected')
                  ),
                  mbPull.needsUpdate && /*#__PURE__*/React.createElement('button', {
                    type: 'button', onClick: () => { const api = window.__alloMailboxSubmissions; if (api && api.openSetup) api.openSetup(); },
                    style: { minHeight: 44, padding: '8px 12px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }
                  }, tr('Open Class Mailbox setup'))
                )
              : /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.8rem', color: '#334155', display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  tr('Using a Class Mailbox? Connect it and submissions can be collected here without downloading them from Drive.'),
                  (typeof window !== 'undefined' && window.__alloMailboxSubmissions) && /*#__PURE__*/React.createElement('button', {
                    type: 'button', onClick: () => window.__alloMailboxSubmissions.openSetup(),
                    style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#166534', border: '1px solid #15803d', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }
                  }, tr('Connect Class Mailbox'))
                ),
            /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', 'data-si-mailbox-status': 'true', style: { flexBasis: '100%', fontSize: '0.8rem', color: mbPull.needsUpdate ? '#92400e' : '#334155' } }, mbPull.msg)
          )
        ),

        // Optional class key — collapsed unless needed for encrypted .alloflow.html files or already loaded
        /*#__PURE__*/React.createElement('details', {
          open: (privateJwk || (counts.pending || 0) > 0) ? true : undefined,
          style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 14 }
        },
          /*#__PURE__*/React.createElement('summary', {
            style: { minHeight: 44, cursor: 'pointer', fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
          },
            /*#__PURE__*/React.createElement('span', null,
              tr('🔑 Class key file (only for encrypted .alloflow.html files)'),
              privateJwk ? ' · ' + tr('✓ Loaded') : ((counts.pending || 0) > 0 ? ' · ' + (counts.pending + ' ' + tr('waiting for key')) : '')
            )
          ),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid #bfdbfe' } },
            /*#__PURE__*/React.createElement('div', null,
              privateJwk
                ? /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: '0.85rem', color: '#1e40af' } },
                    tr('✓ Loaded'),
                    classKeyMeta?.className ? ' for "' + classKeyMeta.className + '"' : '',
                    classKeyMeta?.createdAt ? ' (created ' + classKeyMeta.createdAt.slice(0, 10) + ')' : ''
                  )
                : /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: '0.85rem', color: '#334155' } },
                    tr('Pick the class-key_*.alloflow file you saved when setting up offline submissions.')
                  )
            ),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: () => keyInputRef.current?.click(),
              style: { minHeight: 44, padding: '8px 16px', background: privateJwk ? '#f1f5f9' : '#2563eb', color: privateJwk ? '#334155' : 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }
            }, privateJwk ? tr('🔁 Load different key') : tr('🔑 Load class key'))
          ),
          /*#__PURE__*/React.createElement('input', {
            ref: keyInputRef, type: 'file', accept: '.alloflow,application/json',
            onChange: handleKeyFile, style: { display: 'none' }, 'aria-label': tr('Class key file')
          })
        ),

        // Class rubric panel — shown whenever ≥1 row is decrypted. Optional
        // global rubric that fills in the per-row rubric when grading.
        (counts.decrypted || 0) > 0 && /*#__PURE__*/React.createElement('div', { style: { background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: globalRubricOpen ? '14px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setGlobalRubricOpen(!globalRubricOpen),
              'aria-expanded': globalRubricOpen,
              'aria-controls': 'submission-inbox-class-rubric-panel',
              style: { minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 700, color: '#3730a3', fontSize: '0.9rem' }
            },
              tr('🎯 Class rubric'),
              (globalRubric.rubric || '').trim() && /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '1px 8px', borderRadius: 999, background: '#c7d2fe', color: '#3730a3', fontSize: '0.7rem', fontWeight: 700 } }, tr('✓ set')),
              /*#__PURE__*/React.createElement('span', { 'aria-hidden': 'true', style: { fontSize: '0.75rem', fontWeight: 600, color: '#4338ca' } }, globalRubricOpen ? '▾' : '▸')
            ),
            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              /*#__PURE__*/React.createElement('button', {
                type: 'button',
                onClick: () => { if (!bulkGrading) gradeAllDecrypted(); },
                disabled: !bulkGrading && (!aiTextAvailable || (counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim()),
                'aria-disabled': bulkGrading ? 'true' : undefined,
                'aria-busy': bulkGrading ? 'true' : undefined,
                'aria-describedby': bulkGrading ? 'submission-inbox-bulk-progress-label' : undefined,
                title: !aiTextAvailable
                  ? tr('AI setup required for automatic grading. Score responses manually below.')
                  : ((globalRubric.rubric || '').trim()
                    ? tr('Grade every decrypted submission in the queue with this rubric')
                    : tr('Set a class rubric first')),
                style: {
                  minHeight: 44,
                  padding: '8px 16px',
                  background: (!bulkGrading && (!aiTextAvailable || (counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim())) ? '#cbd5e1' : '#4f46e5',
                  color: (!bulkGrading && (!aiTextAvailable || (counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim())) ? '#334155' : 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                  cursor: bulkGrading ? 'wait' : ((!aiTextAvailable || (counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim()) ? 'not-allowed' : 'pointer')
                }
              }, '🎯 Grade entire queue (' + (counts.decrypted || 0) + ')'),
              !bulkGrading && (() => {
                const unscoredAutoCount = queue.reduce((acc, row, i) => {
                  if (!row || row.status !== 'decrypted' || !row.payload) return acc;
                  const auto = siExportedQuizAutoGrades(row.payload, history);
                  const rowGrades = grades[i] || {};
                  return acc + Object.keys(auto).filter(k => !rowGrades[k]).length;
                }, 0);
                return unscoredAutoCount > 0 && /*#__PURE__*/React.createElement('button', {
                  type: 'button',
                  onClick: autoScoreAllObjective,
                  title: tr('Auto-score objective quiz, Venn, concept-sort, timeline, and math items across all decrypted submissions'),
                  style: { minHeight: 44, padding: '8px 14px', background: '#0369a1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
                }, '⚡ Auto-score objective (' + unscoredAutoCount + ')');
              })(),
              !bulkGrading && (() => {
                const gradedCount = queue.filter((_, i) => Object.keys(grades[i] || {}).length > 0).length;
                return gradedCount > 0 && /*#__PURE__*/React.createElement('button', {
                  type: 'button',
                  onClick: saveAllGradedToGradebook,
                  title: tr('Write every graded submission to the local gradebook'),
                  style: { minHeight: 44, padding: '8px 16px', background: '#15803d', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
                }, '💾 Save all graded (' + gradedCount + ')');
              })(),
              bulkGrading && /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.85rem', color: '#3730a3', fontWeight: 700 } },
                /*#__PURE__*/React.createElement('span', { id: 'submission-inbox-bulk-progress-label' }, 'Grading ' + bulkProgress.current + ' / ' + bulkProgress.total + '…'),
                /*#__PURE__*/React.createElement('div', {
                  role: 'progressbar',
                  'aria-labelledby': 'submission-inbox-bulk-progress-label',
                  'aria-valuemin': 0,
                  'aria-valuemax': bulkProgress.total,
                  'aria-valuenow': bulkProgress.current,
                  'aria-valuetext': bulkProgress.current + ' of ' + bulkProgress.total + ' submissions',
                  style: { width: 120, maxWidth: '100%', height: 8, background: '#c7d2fe', borderRadius: 999, overflow: 'hidden' }
                },
                  /*#__PURE__*/React.createElement('div', { style: { width: (bulkProgress.total ? (bulkProgress.current / bulkProgress.total * 100) : 0) + '%', height: '100%', background: '#4f46e5', transition: 'width 0.3s' } })
                ),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button',
                  'data-si-cancel-bulk-grade': 'true',
                  onClick: () => { bulkCancelRef.current = true; },
                  style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }
                }, tr('Cancel'))
              )
            )
          ),
          globalRubricOpen && /*#__PURE__*/React.createElement('div', { id: 'submission-inbox-class-rubric-panel', style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #c7d2fe' } },
            /*#__PURE__*/React.createElement('label', { htmlFor: 'submission-inbox-class-rubric', style: { display: 'block', fontSize: '0.78rem', color: '#3730a3', fontWeight: 600, marginBottom: 4 } }, tr('Rubric for this batch — what does full credit look like?')),
            /*#__PURE__*/React.createElement('textarea', {
              id: 'submission-inbox-class-rubric',
              value: globalRubric.rubric,
              onChange: e => setGlobalRubric(prev => ({ ...prev, rubric: e.target.value })),
              placeholder: tr('e.g., "Each response should name the main idea, cite at least one specific detail from the text, and explain reasoning in 2-3 complete sentences."'),
              rows: 3,
              style: { width: '100%', padding: 8, border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 10 }
            }),
            /*#__PURE__*/React.createElement('label', { htmlFor: 'submission-inbox-class-context', style: { display: 'block', fontSize: '0.78rem', color: '#3730a3', fontWeight: 600, marginBottom: 4 } }, tr('Assignment context (optional)')),
            /*#__PURE__*/React.createElement('input', {
              id: 'submission-inbox-class-context',
              type: 'text',
              value: globalRubric.context,
              onChange: e => setGlobalRubric(prev => ({ ...prev, context: e.target.value })),
              placeholder: tr('e.g., "Reading response to chapter 3"'),
              style: { width: '100%', padding: '6px 8px', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.85rem', marginBottom: 8 }
            }),
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#475569' } },
              tr('This rubric is used by "Grade entire queue" and as the default for each per-submission Grade button. Per-submission rubrics still override the global one when set.')
            ),
            // Named preset library — save/load named rubric+anchor sets across sessions
            /*#__PURE__*/React.createElement('div', { style: { marginTop: 12, paddingTop: 10, borderTop: '1px dashed #c7d2fe' } },
              /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.78rem', fontWeight: 700, color: '#3730a3', marginRight: 4 } }, tr('📋 Presets:')),
                /*#__PURE__*/React.createElement('input', {
                  type: 'text', 'aria-label': tr('Preset name'),
                  value: presetNameInput,
                  onChange: e => setPresetNameInput(e.target.value),
                  onKeyDown: e => { if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') { e.preventDefault(); savePreset(); } },
                  placeholder: tr('Name this preset (e.g. "Reading response Ch.3")'),
                  style: { flex: 1, minWidth: 180, minHeight: 44, padding: '8px 10px', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.82rem' }
                }),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: savePreset,
                  disabled: !presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0),
                  title: tr('Save the current rubric + context + anchors as a named preset.'),
                  style: {
                    minHeight: 44,
                    padding: '6px 12px',
                    background: (!presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0)) ? '#cbd5e1' : '#4f46e5',
                    color: (!presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0)) ? '#334155' : 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem',
                    cursor: (!presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0)) ? 'not-allowed' : 'pointer'
                  }
                }, tr('💾 Save')),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: () => presetImportRef.current?.click(),
                  title: tr('Import presets from a JSON file (e.g. shared by another teacher).'),
                  style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }
                }, tr('⬆ Import')),
                /*#__PURE__*/React.createElement('input', {
                  ref: presetImportRef, type: 'file', accept: '.json,application/json',
                  onChange: importPresets, style: { display: 'none' }, 'aria-label': tr('Import presets JSON')
                }),
                Object.keys(rubricPresets).length > 0 && /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: exportPresets,
                  title: tr('Export all your presets as a JSON file you can share or back up.'),
                  style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }
                }, tr('⬇ Export')),
                Object.keys(rubricPresets).length > 0 && /*#__PURE__*/React.createElement('div', { style: { position: 'relative' } },
                  /*#__PURE__*/React.createElement('button', {
                    type: 'button', onClick: () => setPresetsMenuOpen(!presetsMenuOpen),
                    'aria-expanded': presetsMenuOpen,
                    'aria-controls': 'submission-inbox-presets-panel',
                    title: tr('Load a saved preset'),
                    style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }
                  }, '📂 Load (' + Object.keys(rubricPresets).length + ') ' + (presetsMenuOpen ? '▴' : '▾')),
                  presetsMenuOpen && /*#__PURE__*/React.createElement('div', {
                    id: 'submission-inbox-presets-panel',
                    role: 'region',
                    'aria-label': tr('Saved rubric presets'),
                    style: { position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'white', border: '1px solid #c7d2fe', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 'min(280px, calc(100vw - 96px))', maxWidth: 'calc(100vw - 96px)', minWidth: 0, maxHeight: 320, overflowY: 'auto', overflowX: 'hidden', zIndex: 5 }
                  },
                    Object.entries(rubricPresets)
                      .sort(([, a], [, b]) => (b.lastUsed || '').localeCompare(a.lastUsed || ''))
                      .map(([key, p]) => /*#__PURE__*/React.createElement('div', {
                        key: key,
                        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', gap: 6 }
                      },
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => loadPreset(key),
                          style: { flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }
                        },
                          /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', overflowWrap: 'anywhere' } }, p.name),
                          /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569' } },
                            (p.anchors ? p.anchors.length : 0) + ' anchor' + (p.anchors && p.anchors.length === 1 ? '' : 's'),
                            ' · last used ',
                            p.lastUsed ? new Date(p.lastUsed).toLocaleDateString() : '—'
                          )
                        ),
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: async (e) => {
                            e.stopPropagation();
                            const accepted = await requestConfirmation({
                              title: tr('Delete preset?'),
                              message: 'Delete preset "' + p.name + '"? This cannot be undone.',
                              confirmLabel: tr('Delete preset'),
                              cancelLabel: tr('Keep preset')
                            });
                            if (accepted) deletePreset(key);
                          },
                          'aria-label': tr('Delete preset') + ': ' + p.name,
                          title: tr('Delete this preset'),
                          style: { padding: '2px 8px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer' }
                        }, '✗')
                      ))
                  )
                )
              ),
              /*#__PURE__*/React.createElement('div', { style: { marginTop: 6, fontSize: '0.74rem', color: '#334155' } },
                tr('Presets save the rubric + context + every calibration anchor as a named set. Pick a name like "Reading response", "Math word problem", "Lab report" so you can load the right calibration when the same assignment comes back.')
              )
            ),
            (savedSessionMeta || (globalRubric.rubric || '').trim() || anchors.length > 0) && /*#__PURE__*/React.createElement('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.78rem', color: '#3730a3' } },
              /*#__PURE__*/React.createElement('span', null,
                savedSessionMeta
                  ? '💾 Restored from saved session (' + new Date(savedSessionMeta.savedAt).toLocaleString() + '). Auto-saves on every change.'
                  : tr('💾 Auto-saves your rubric + anchors so they persist across browser refreshes.')
              ),
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: clearSavedSession,
                title: tr('Clear the auto-saved rubric and anchors'),
                style: { minHeight: 44, padding: '6px 12px', background: 'transparent', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }
              }, tr('Clear saved session'))
            )
          )
        ),

        // Gradebook viewer panel — always visible, shows accumulated saved grades
        // across all inbox sessions. Reads from localStorage 'alloflow_offline_grades'.
        /*#__PURE__*/React.createElement('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: gradebookOpen ? '14px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setGradebookOpen(!gradebookOpen),
              'aria-expanded': gradebookOpen,
              'aria-controls': 'submission-inbox-gradebook-panel',
              style: { minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 700, color: '#166534', fontSize: '0.9rem' }
            },
              tr('📊 Gradebook'),
              /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '1px 8px', borderRadius: 999, background: '#bbf7d0', color: '#166534', fontSize: '0.7rem', fontWeight: 700 } }, gradebookEntries.length + ' saved'),
              /*#__PURE__*/React.createElement('span', { 'aria-hidden': 'true', style: { fontSize: '0.75rem', fontWeight: 600, color: '#15803d' } }, gradebookOpen ? '▾' : '▸')
            ),
            gradebookEntries.length > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '100%' } },
              /*#__PURE__*/React.createElement('div', { role: 'group', 'aria-label': tr('Group gradebook by'), style: { display: 'inline-flex', background: 'white', border: '1px solid #86efac', borderRadius: 6, padding: 2, fontSize: '0.76rem', fontWeight: 600 } },
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: () => setGradebookGroupBy('submission'),
                  'aria-pressed': gradebookGroupBy === 'submission',
                  style: { minHeight: 44, padding: '6px 12px', background: gradebookGroupBy === 'submission' ? '#15803d' : 'transparent', color: gradebookGroupBy === 'submission' ? 'white' : '#166534', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }
                }, tr('Submissions')),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: () => setGradebookGroupBy('student'),
                  'aria-pressed': gradebookGroupBy === 'student',
                  style: { minHeight: 44, padding: '6px 12px', background: gradebookGroupBy === 'student' ? '#15803d' : 'transparent', color: gradebookGroupBy === 'student' ? 'white' : '#166534', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }
                }, tr('By student'))
              ),
              typeof onOpenAlloSheet === 'function' && /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: openAlloSheetReview,
                'aria-haspopup': 'dialog',
                title: tr('Review privacy-bounded saved-grade summaries before opening AlloSheet'),
                style: { minHeight: 44, padding: '6px 12px', background: '#4338ca', color: 'white', border: '1px solid #3730a3', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }
              }, tr('Open in AlloSheet')),
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: exportGradebookCsv,
                title: tr('Download all saved grades as a CSV spreadsheet'),
                style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#166534', border: '1px solid #86efac', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              }, tr('⬇ Export CSV')),
              gradebookClasses.length > 0 && /*#__PURE__*/React.createElement('select', {
                'aria-label': tr('Filter gradebook by class'),
                'data-si-gradebook-class-filter': 'true',
                value: gradebookClassFilter,
                onChange: (e) => setGradebookClassFilter(e.target.value),
                style: { minHeight: 44, padding: '6px 10px', background: 'white', color: '#166534', border: '1px solid #86efac', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              },
                /*#__PURE__*/React.createElement('option', { value: 'all' }, tr('All classes')),
                ...gradebookClasses.map(cls => /*#__PURE__*/React.createElement('option', { key: cls, value: cls }, cls))
              ),
              /*#__PURE__*/React.createElement('select', {
                'aria-label': tr('Summary CSV LMS format'),
                'data-lms-csv-preset': lmsCsvPreset,
                value: lmsCsvPreset,
                onChange: (e) => setLmsCsvPreset(e.target.value),
                style: { minHeight: 44, padding: '6px 10px', background: 'white', color: '#166534', border: '1px solid #86efac', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              },
                /*#__PURE__*/React.createElement('option', { value: 'alloflow' }, tr('AlloFlow')),
                /*#__PURE__*/React.createElement('option', { value: 'canvas' }, tr('Canvas')),
                /*#__PURE__*/React.createElement('option', { value: 'google-classroom' }, tr('Google Classroom')),
                /*#__PURE__*/React.createElement('option', { value: 'schoology' }, tr('Schoology'))
              ),
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: exportGradebookSummaryCsv,
                title: tr('Download a 1-row-per-student LMS summary CSV with item score columns'),
                style: { minHeight: 44, padding: '6px 12px', background: 'white', color: '#166534', border: '1px solid #86efac', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              }, tr('⬇ Summary CSV'))
            )
          ),
          gradebookOpen && /*#__PURE__*/React.createElement('div', { id: 'submission-inbox-gradebook-panel', style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #bbf7d0' } },
            gradebookEntries.length === 0
              ? /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', style: { fontSize: '0.85rem', color: '#166534', fontStyle: 'italic' } },
                  tr('No saved grades yet. Grade some submissions and click "💾 Save all graded" or the per-row "Save to gradebook" button to populate this list.')
                )
              : /*#__PURE__*/React.createElement('div', null,
                  /*#__PURE__*/React.createElement('div', {
                    role: 'region',
                    'aria-label': tr('Saved gradebook table'),
                    tabIndex: 0,
                    style: { border: '1px solid #bbf7d0', borderRadius: 8, overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', background: 'white' }
                  },
                    /*#__PURE__*/React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' } },
                      /*#__PURE__*/React.createElement('thead', null,
                        /*#__PURE__*/React.createElement('tr', { style: { background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' } },
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? 'Student' : 'Nickname'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? 'Submissions' : 'Document'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? tr('Avg of avgs') : 'Avg'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? tr('Last graded') : 'Graded'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', 'aria-label': tr('Actions'), style: { textAlign: 'right', padding: '8px 12px' } }, '')
                        )
                      ),
                      /*#__PURE__*/React.createElement('tbody', null,
                        gradebookGroupBy === 'student'
                          ? (() => {
                              return gradebookSummary.students.map((s, i) => {
                                const { avgOfAvgs, lastGraded } = s;
                                const sc = typeof avgOfAvgs === 'number' ? scoreColor(avgOfAvgs) : { bg: '#f1f5f9', color: '#475569' };
                                const studentKey = s.nickname + '|' + (s.className || '');
                                const isExpanded = expandedStudent === studentKey;
                                return /*#__PURE__*/React.createElement(React.Fragment, { key: i },
                                  /*#__PURE__*/React.createElement('tr', { style: { borderBottom: '1px solid #f1f5f9' } },
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontWeight: 700, color: '#1e293b' } },
                                      /*#__PURE__*/React.createElement('button', {
                                        type: 'button',
                                        onClick: () => setExpandedStudent(isExpanded ? null : studentKey),
                                        'aria-expanded': isExpanded,
                                        style: { display: 'inline-flex', alignItems: 'flex-start', gap: 6, maxWidth: '100%', padding: 0, border: 'none', background: 'transparent', color: '#1e293b', font: 'inherit', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }
                                      },
                                        /*#__PURE__*/React.createElement('span', { 'aria-hidden': 'true', style: { display: 'inline-block', fontSize: '0.7rem', color: '#475569', flexShrink: 0 } }, isExpanded ? '▾' : '▸'),
                                        /*#__PURE__*/React.createElement('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } },
                                          /*#__PURE__*/React.createElement('span', { style: { display: 'block' } }, s.nickname),
                                          s.className && /*#__PURE__*/React.createElement('span', { style: { display: 'block', fontSize: '0.72rem', color: '#475569', fontWeight: 400 } }, s.className)
                                        )
                                      )
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', color: '#475569' } },
                                      s.entries.length + ' submission' + (s.entries.length === 1 ? '' : 's')
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px' } },
                                      avgOfAvgs !== null
                                        ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.78rem' } }, avgOfAvgs + '/100')
                                        : /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontSize: '0.8rem' } }, '—')
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontSize: '0.78rem', color: '#64748b' } },
                                      lastGraded ? new Date(lastGraded).toLocaleDateString() : '—'
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', textAlign: 'right', fontSize: '0.72rem', color: '#475569' } },
                                      isExpanded ? tr('use the learner button to collapse') : tr('use the learner button for detail')
                                    )
                                  ),
                                  isExpanded && s.entries.map((entry, j) => {
                                    const eAvg = gradebookAvg(entry);
                                    const eSc = typeof eAvg === 'number' ? scoreColor(eAvg) : { bg: '#f1f5f9', color: '#475569' };
                                    const respCount = Object.keys(entry.grades || {}).length;
                                    return /*#__PURE__*/React.createElement('tr', { key: 'e' + j, style: { borderBottom: '1px solid #f1f5f9', background: '#fafaf9' } },
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px 6px 36px', fontSize: '0.78rem', color: '#475569', fontWeight: 400 } }, '↳ entry ' + (j + 1)),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px', color: '#475569', fontSize: '0.82rem' } },
                                        entry.docTitle,
                                        /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.7rem', color: '#475569' } }, respCount + ' response' + (respCount === 1 ? '' : 's'))
                                      ),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px' } },
                                        eAvg !== null
                                          ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '1px 7px', borderRadius: 999, background: eSc.bg, color: eSc.color, fontWeight: 700, fontSize: '0.72rem' } }, eAvg + '/100')
                                          : /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontSize: '0.8rem' } }, '—')
                                      ),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px', fontSize: '0.72rem', color: '#64748b' } },
                                        entry.gradedAt ? new Date(entry.gradedAt).toLocaleDateString() : '—'
                                      ),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px', textAlign: 'right' } },
                                        /*#__PURE__*/React.createElement('button', {
                                          type: 'button', onClick: (e) => { e.stopPropagation(); deleteGradebookEntry(entry.key); },
                                          'aria-label': tr('Remove from local gradebook') + ': ' + (entry.nickname || '') + (entry.docTitle ? ' — ' + entry.docTitle : ''),
                                          title: tr('Remove from local gradebook'),
                                          style: { padding: '2px 8px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer' }
                                        }, '✗')
                                      )
                                    );
                                  })
                                );
                              });
                            })()
                          : filteredGradebookEntries.map((entry, i) => {
                              const avg = gradebookAvg(entry);
                              const sc = typeof avg === 'number' ? scoreColor(avg) : { bg: '#f1f5f9', color: '#475569' };
                              const respCount = Object.keys(entry.grades || {}).length;
                              return /*#__PURE__*/React.createElement('tr', { key: i, style: { borderBottom: '1px solid #f1f5f9' } },
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontWeight: 700, color: '#1e293b' } },
                                  entry.nickname,
                                  entry.className && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569', fontWeight: 400 } }, entry.className)
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', color: '#475569' } },
                                  entry.docTitle,
                                  /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569' } }, respCount + ' response' + (respCount === 1 ? '' : 's'))
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px' } },
                                  avg !== null
                                    ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.78rem' } }, avg + '/100')
                                    : /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontSize: '0.8rem' } }, '—')
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontSize: '0.78rem', color: '#64748b' } },
                                  entry.gradedAt ? new Date(entry.gradedAt).toLocaleDateString() : '—'
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', textAlign: 'right' } },
                                  /*#__PURE__*/React.createElement('button', {
                                    type: 'button', onClick: () => deleteGradebookEntry(entry.key),
                                    'aria-label': tr('Remove from local gradebook') + ': ' + (entry.nickname || '') + (entry.docTitle ? ' — ' + entry.docTitle : ''),
                                    title: tr('Remove from local gradebook'),
                                    style: { padding: '4px 10px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.74rem', cursor: 'pointer' }
                                  }, '✗')
                                )
                              );
                            })
                      )
                    )
                  ),
                  /*#__PURE__*/React.createElement('div', { style: { marginTop: 8, fontSize: '0.78rem', color: '#166534' } },
                    tr('Saved locally in your browser. Export CSV to push to Sheets / your grade system. AlloFlow does not upload these grades anywhere.')
                  )
                )
          )
        ),

        // Calibration anchors panel — visible whenever the queue has decrypted rows
        (counts.decrypted || 0) > 0 && /*#__PURE__*/React.createElement('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: anchorsPanelOpen ? '12px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setAnchorsPanelOpen(!anchorsPanelOpen),
              'aria-expanded': anchorsPanelOpen,
              'aria-controls': 'submission-inbox-anchors-panel',
              style: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }
            },
              '📌 Calibration anchors (' + anchors.length + ')',
              /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: '#b45309' } }, anchorsPanelOpen ? '▾' : '▸')
            ),
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#92400e' } },
              anchors.length === 0
                ? tr('Tap 📌 on any decrypted response to teach the AI your scoring direction.')
                : 'Each AI grading run will use these ' + anchors.length + ' anchor' + (anchors.length === 1 ? '' : 's') + ' as few-shot examples.'
            )
          ),
          anchorsPanelOpen && /*#__PURE__*/React.createElement('div', { id: 'submission-inbox-anchors-panel', style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde68a' } },
            anchors.length === 0
              ? /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#92400e', fontStyle: 'italic' } },
                  tr('No anchors yet. Anchors are individual student responses you score by hand; the AI uses them as calibration examples when grading every other response. 3-5 anchors that span the score range usually gives the best results.')
                )
              : /*#__PURE__*/React.createElement('div', null,
                  anchors.map((a, i) => /*#__PURE__*/React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'white', borderRadius: 6, marginBottom: 6, border: '1px solid #fde68a' } },
                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', minWidth: 48, padding: '2px 8px', borderRadius: 999, background: scoreColor(a.teacherScore).bg, color: scoreColor(a.teacherScore).color, fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', flexShrink: 0 } }, a.teacherScore + '/100'),
                    /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#1e293b' } }, String(a.studentResponse).slice(0, 180) + (a.studentResponse.length > 180 ? '…' : '')),
                      a.teacherFeedback && /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' } }, '"' + a.teacherFeedback + '"')
                    ),
                    /*#__PURE__*/React.createElement('button', {
                      type: 'button',
                      onClick: () => removeAnchor(i),
                      'aria-label': tr('Remove calibration anchor') + ' ' + (i + 1),
                      title: tr('Remove this anchor'),
                      style: { padding: '2px 8px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }
                    }, '✗')
                  )),
                  /*#__PURE__*/React.createElement('div', { style: { marginTop: 8, fontSize: '0.78rem', color: '#92400e' } },
                    /*#__PURE__*/React.createElement('button', {
                      type: 'button',
                      onClick: clearAnchors,
                      style: { padding: '4px 10px', background: 'transparent', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginRight: 8 }
                    }, tr('Clear all')),
                    /*#__PURE__*/React.createElement('span', { style: { color: '#b45309' } },
                      tr('Tip: anchor responses spanning the full score range (e.g. one 95, one 70, one 40) for the most accurate AI calibration.')
                    )
                  )
                )
          )
        ),

        // Step 3: decrypt action
        privateJwk && queue.length > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('button', {
            type: 'button', onClick: handleDecryptAll, disabled: decryptingAll || (counts.pending || 0) === 0,
            style: {
              padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: '0.95rem',
              cursor: (decryptingAll || (counts.pending || 0) === 0) ? 'not-allowed' : 'pointer',
              opacity: (decryptingAll || (counts.pending || 0) === 0) ? 0.6 : 1
            }
          }, decryptingAll ? 'Decrypting…' : '🔓 Decrypt all ' + (counts.pending ? '(' + counts.pending + ')' : '')),
          /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.85rem', color: '#64748b' } },
            tr('Each submission is decrypted in your browser. Nothing leaves this device.')
          )
        ),

        // Queue view-mode toggle + Batch feedback packet action
        queue.length > 0 && (counts.decrypted || 0) > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
          /*#__PURE__*/React.createElement('div', { role: 'group', 'aria-label': tr('Submission review layout'), style: { display: 'inline-flex', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 2, gap: 2 } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              'data-si-view-mode': 'student',
              'aria-pressed': queueViewMode === 'student',
              onClick: () => setQueueViewMode('student'),
              style: { padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: queueViewMode === 'student' ? '#4f46e5' : 'transparent', color: queueViewMode === 'student' ? 'white' : '#334155' }
            }, tr('By Student')),
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              'data-si-view-mode': 'question',
              'aria-pressed': queueViewMode === 'question',
              onClick: () => setQueueViewMode('question'),
              style: { padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: queueViewMode === 'question' ? '#4f46e5' : 'transparent', color: queueViewMode === 'question' ? 'white' : '#334155' }
            }, tr('By Question'))
          ),
          queue.some((_, i) => Object.keys(grades[i] || {}).length > 0) && /*#__PURE__*/React.createElement('button', {
            type: 'button',
            'data-si-batch-feedback': 'true',
            onClick: downloadBatchFeedbackPacket,
            title: tr('Download one printable HTML packet combining every graded student feedback sheet'),
            style: { padding: '6px 12px', background: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }
          }, tr('🖨 Batch feedback packet'))
        ),

        // Queue table / By-Question view
        queue.length === 0
          ? /*#__PURE__*/React.createElement('div', { role: 'status', 'aria-live': 'polite', style: { padding: '40px 20px', textAlign: 'center', color: '#475569', fontSize: '0.95rem', border: '2px dashed #e2e8f0', borderRadius: 12 } },
              tr('No submissions loaded yet. Load your class key, then add files.')
            )
          : queueViewMode === 'question' && (counts.decrypted || 0) > 0
          ? (() => {
              const groupsMap = Object.create(null);
              const groupOrder = [];
              queue.forEach((row, rowIdx) => {
                if (!row || row.status !== 'decrypted' || !row.payload) return;
                const seenKeys = new Set();
                siResponseEntryModels(row.payload).forEach(entry => {
                  seenKeys.add(entry.key);
                  if (!Object.prototype.hasOwnProperty.call(groupsMap, entry.key)) {
                    groupsMap[entry.key] = {
                      key: entry.key,
                      question: entry.question,
                      partLabel: entry.partLabel,
                      responseType: entry.responseType,
                      items: []
                    };
                    groupOrder.push(groupsMap[entry.key]);
                  }
                  groupsMap[entry.key].items.push({ rowIdx, row, entry, grade: (grades[rowIdx] || {})[entry.key] });
                });
                const ev = typeof siWorkEvidence === 'function' ? siWorkEvidence(row.payload, history) : null;
                if (ev) {
                  (Array.isArray(ev.roleSwaps) ? ev.roleSwaps : []).forEach(rs => {
                    if (!rs || !rs.key || seenKeys.has(rs.key)) return;
                    seenKeys.add(rs.key);
                    const rsEntry = {
                      key: rs.key,
                      rawText: rs.text || '',
                      displayValue: rs.text || '',
                      question: rs.title || tr('Role Swap'),
                      partLabel: tr('Role Swap'),
                      responseType: 'role-swap',
                      answered: Boolean(String(rs.text || '').trim()),
                      requiresManualReview: true,
                      isSelfCheck: false
                    };
                    if (!Object.prototype.hasOwnProperty.call(groupsMap, rsEntry.key)) {
                      groupsMap[rsEntry.key] = {
                        key: rsEntry.key,
                        question: rsEntry.question,
                        partLabel: rsEntry.partLabel,
                        responseType: rsEntry.responseType,
                        items: []
                      };
                      groupOrder.push(groupsMap[rsEntry.key]);
                    }
                    groupsMap[rsEntry.key].items.push({ rowIdx, row, entry: rsEntry, grade: (grades[rowIdx] || {})[rsEntry.key] });
                  });
                  (Array.isArray(ev.stories) ? ev.stories : []).forEach(story => {
                    if (!story || !story.key || seenKeys.has(story.key)) return;
                    seenKeys.add(story.key);
                    const storyEntry = {
                      key: story.key,
                      rawText: story.text || '',
                      displayValue: story.text || '',
                      question: story.title || tr('Student Story'),
                      partLabel: tr('Student-written adventure'),
                      responseType: 'student-story',
                      answered: Boolean(String(story.text || '').trim()),
                      requiresManualReview: true,
                      isSelfCheck: false
                    };
                    if (!Object.prototype.hasOwnProperty.call(groupsMap, storyEntry.key)) {
                      groupsMap[storyEntry.key] = {
                        key: storyEntry.key,
                        question: storyEntry.question,
                        partLabel: storyEntry.partLabel,
                        responseType: storyEntry.responseType,
                        items: []
                      };
                      groupOrder.push(groupsMap[storyEntry.key]);
                    }
                    groupsMap[storyEntry.key].items.push({ rowIdx, row, entry: storyEntry, grade: (grades[rowIdx] || {})[storyEntry.key] });
                  });
                }
              });
              return /*#__PURE__*/React.createElement('div', { 'data-si-by-question-view': 'true', role: 'region', 'aria-label': tr('Responses grouped by question'), style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                groupOrder.length === 0
                  ? /*#__PURE__*/React.createElement('div', { style: { padding: 20, textAlign: 'center', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10 } }, tr('No responses captured across decrypted submissions.'))
                  : groupOrder.map((grp, gIdx) => /*#__PURE__*/React.createElement('section', { key: grp.key || gIdx, style: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px', background: 'white' } },
                      /*#__PURE__*/React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', paddingBottom: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 8 } },
                        /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' } }, grp.question),
                        /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.75rem', color: '#475569', fontWeight: 600 } },
                          (grp.partLabel ? grp.partLabel + ' · ' : '') + grp.items.filter(it => it.grade && typeof it.grade.score === 'number').length + ' / ' + grp.items.length + ' ' + tr('scored')
                        )
                      ),
                      /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                        grp.items.map((item, sIdx) => {
                          const sc = item.grade ? scoreColor(item.grade.score) : null;
                          const anchored = isResponseAnchored(item.rowIdx, grp.key, item.entry.rawText);
                          return /*#__PURE__*/React.createElement('div', { key: sIdx, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' } },
                            /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#1e293b', fontSize: '0.8rem', marginBottom: 3 } }, item.row.nickname),
                              /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.84rem', color: '#0f172a', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
                                item.entry.answered ? item.entry.displayValue : /*#__PURE__*/React.createElement('em', { style: { color: '#9a3412' } }, tr('No answer submitted'))
                              ),
                              item.grade && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.76rem' } },
                                /*#__PURE__*/React.createElement('span', { style: { padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700 } }, (typeof item.grade.score === 'number' ? item.grade.score : '–') + '/100'),
                                item.grade.feedback && /*#__PURE__*/React.createElement('span', { style: { color: '#475569' } }, item.grade.feedback),
                                item.grade.keySource === 'student-file' && /*#__PURE__*/React.createElement('span', { 'data-si-key-source': 'student-file', style: { color: '#7c2d12', fontWeight: 700 } }, tr('Checked with the answer key inside the student\'s file. This project has no copy of the activity.'))
                              )
                            ),
                            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' } },
                              /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                onClick: () => openManualScoreForm(item.rowIdx, item.entry),
                                style: { padding: '3px 9px', borderRadius: 999, background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }
                              }, item.grade ? tr('Edit score') : tr('Score')),
                              !item.entry.requiresManualReview && !item.entry.isSelfCheck && item.entry.answered && (anchored
                                ? /*#__PURE__*/React.createElement(React.Fragment, null,
                                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#fde68a', color: '#92400e', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 } },
                                      '📌 Anchor ' + getAnchorScore(item.rowIdx, grp.key, item.entry.rawText) + '/100'
                                    ),
                                    /*#__PURE__*/React.createElement('button', {
                                      type: 'button',
                                      'data-si-unanchor': 'true',
                                      onClick: () => unanchorEntry(item.rowIdx, grp.key, String(item.entry.rawText)),
                                      style: { padding: '2px 8px', background: 'white', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }
                                    }, tr('Un-anchor'))
                                  )
                                : /*#__PURE__*/React.createElement('button', {
                                    type: 'button',
                                    onClick: () => openAnchorForm(item.rowIdx, grp.key, String(item.entry.rawText)),
                                    style: { padding: '3px 9px', borderRadius: 999, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer' }
                                  }, tr('📌 Anchor'))
                              )
                            )
                          );
                        })
                      )
                    ))
              );
            })()
          : (() => {
              const filteredQueue = queue.map((row, idx) => ({ row, idx })).filter(({ row }) => {
                if (queueStatusFilter !== 'all' && row.status !== queueStatusFilter) return false;
                const qText = String(queueSearch || '').trim().toLowerCase();
                if (!qText) return true;
                const hay = [row.nickname, row.docTitle, row.fileName].map(v => String(v || '').toLowerCase()).join(' ');
                return hay.indexOf(qText) !== -1;
              });
              const queueFiltered = Boolean(String(queueSearch || '').trim()) || queueStatusFilter !== 'all';
              return /*#__PURE__*/React.createElement('div', null,
              /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 } },
                /*#__PURE__*/React.createElement('input', {
                  type: 'search',
                  'data-si-queue-search': 'true',
                  'aria-label': tr('Search submissions by student, document, or filename'),
                  value: queueSearch,
                  onChange: e => setQueueSearch(e.target.value),
                  onKeyDown: e => {
                    if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return;
                    if (e.key === 'Escape' && queueSearch) {
                      e.preventDefault();
                      e.stopPropagation();
                      setQueueSearch('');
                    }
                  },
                  placeholder: tr('Search student or document…'),
                  style: { flex: '1 1 200px', minHeight: 44, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem' }
                }),
                /*#__PURE__*/React.createElement('select', {
                  'data-si-queue-status-filter': 'true',
                  'aria-label': tr('Filter submissions by status'),
                  value: queueStatusFilter,
                  onChange: e => setQueueStatusFilter(e.target.value),
                  style: { minHeight: 44, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', background: 'white', color: '#334155', fontWeight: 600 }
                },
                  /*#__PURE__*/React.createElement('option', { value: 'all' }, tr('All statuses')),
                  /*#__PURE__*/React.createElement('option', { value: 'decrypted' }, tr('Decrypted')),
                  /*#__PURE__*/React.createElement('option', { value: 'pending' }, tr('Pending')),
                  /*#__PURE__*/React.createElement('option', { value: 'error' }, tr('Error'))
                ),
                queueFiltered && /*#__PURE__*/React.createElement('button', {
                  type: 'button',
                  'data-si-queue-reset-filters': 'true',
                  onClick: () => { setQueueSearch(''); setQueueStatusFilter('all'); },
                  style: { minHeight: 44, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#334155', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }
                }, tr('Reset filters'))
              ),
              queueFiltered && /*#__PURE__*/React.createElement('div', {
                role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
                'data-si-queue-filter-count': 'true',
                style: { marginBottom: 8, fontSize: '0.8rem', fontWeight: 600, color: '#3730a3' }
              }, 'Showing ' + filteredQueue.length + ' of ' + queue.length + ' submissions'),
              /*#__PURE__*/React.createElement('div', {
              role: 'region',
              'aria-label': tr('Imported submission queue table'),
              tabIndex: 0,
              style: { border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%' }
            },
              /*#__PURE__*/React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' } },
                /*#__PURE__*/React.createElement('thead', null,
                  /*#__PURE__*/React.createElement('tr', { style: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' } },
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Nickname')),
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Document')),
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Status')),
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Actions'))
                  )
                ),
                /*#__PURE__*/React.createElement('tbody', null,
                  filteredQueue.length === 0
                    ? /*#__PURE__*/React.createElement('tr', null,
                        /*#__PURE__*/React.createElement('td', { colSpan: 4, style: { padding: '20px 14px', textAlign: 'center', color: '#475569', fontSize: '0.86rem' } },
                          /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } }, tr('No submissions match the current filter.')),
                          /*#__PURE__*/React.createElement('button', {
                            type: 'button',
                            onClick: () => { setQueueSearch(''); setQueueStatusFilter('all'); },
                            style: { minHeight: 44, padding: '8px 16px', background: '#4338ca', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }
                          }, tr('Reset filters'))
                        )
                      )
                    : filteredQueue.map(({ row, idx }) => /*#__PURE__*/React.createElement(React.Fragment, { key: idx },
                    /*#__PURE__*/React.createElement('tr', { style: { borderBottom: '1px solid #f1f5f9' } },
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px' } },
                        /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#1e293b' } }, row.nickname),
                        row.outerNicknameMismatch && /*#__PURE__*/React.createElement('span', {
                          role: 'status',
                          'data-si-name-mismatch': 'true',
                          title: tr('The name on the outer file envelope did not match the encrypted student name inside.'),
                          style: { display: 'inline-block', marginTop: 3, padding: '2px 7px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: '0.7rem', fontWeight: 700 }
                        }, '⚠ ' + tr('Name mismatch')),
                        row.nickname !== '?' && rosterBadge(rosterMatch(row.nickname)),
                        row.nickname !== '?' && (() => {
                          const match = rosterMatch(row.nickname);
                          if (match.kind !== 'fuzzy') return null;
                          const confirmed = confirmedLearnerMatches[idx] === match.name;
                          return /*#__PURE__*/React.createElement('button', {
                            type: 'button',
                            'aria-pressed': confirmed,
                            onClick: () => setConfirmedLearnerMatches(previous => ({ ...previous, [idx]: confirmed ? '' : match.name })),
                            style: { display: 'block', marginTop: 4, padding: '4px 8px', minHeight: 32, borderRadius: 6, border: '1px solid #d97706', background: confirmed ? '#dcfce7' : '#fffbeb', color: confirmed ? '#166534' : '#92400e', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }
                          }, confirmed ? tr('Identity confirmed') : tr('Confirm normalized roster match'));
                        })()
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px', color: '#475569' } },
                        /*#__PURE__*/React.createElement('div', null, row.docTitle || row.fileName),
                        row.timestamp && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.75rem', color: '#475569' } }, new Date(row.timestamp).toLocaleString())
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px' } },
                        statusBadge(row.status),
                        row.status === 'error' && /*#__PURE__*/React.createElement('div', { role: 'alert', style: { marginTop: 4, fontSize: '0.75rem', color: '#991b1b' } }, row.error),
                        row.status === 'decrypted' && row.payload && (() => {
                          const prior = previousGradesFor(row.payload.nickname, row.payload.docTitle);
                          // Filter out matches whose timestamp is the same as this submission
                          // (that's just our own save, not a re-submit).
                          const others = prior.filter(p => p.submittedAt !== row.payload.timestamp);
                          if (others.length === 0) return null;
                          const sortedPrior = others.slice().sort((a, b) => String(a.gradedAt || a.submittedAt || '').localeCompare(String(b.gradedAt || b.submittedAt || '')));
                          const latestPrior = sortedPrior[sortedPrior.length - 1];
                          const lastDate = latestPrior && latestPrior.gradedAt ? latestPrior.gradedAt : '';
                          const priorScores = latestPrior && latestPrior.grades ? Object.values(latestPrior.grades).map(g => g && g.score).filter(s => typeof s === 'number' && Number.isFinite(s)) : [];
                          const priorAvg = priorScores.length ? Math.round(priorScores.reduce((a, b) => a + b, 0) / priorScores.length) : null;
                          const currAvg = rowGradeSummary(idx).average;
                          const delta = (currAvg !== null && priorAvg !== null) ? (currAvg - priorAvg) : null;
                          const currResps = row.payload.responses && typeof row.payload.responses === 'object' ? row.payload.responses : {};
                          const priorResps = latestPrior && latestPrior.responses && typeof latestPrior.responses === 'object' ? latestPrior.responses : {};
                          const changedCount = Object.keys(currResps).filter(k => siResponseText(currResps[k], 12000) !== siResponseText(priorResps[k], 12000)).length;
                          return /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' } },
                            /*#__PURE__*/React.createElement('span', {
                              style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 600 },
                              title: tr('This student already has ') + others.length + ' graded submission' + (others.length === 1 ? '' : 's') + ' for this document in the gradebook. Most recent: ' + (lastDate ? new Date(lastDate).toLocaleString() : 'unknown')
                            }, '🔁 Previously graded' + (others.length > 1 ? ' (' + others.length + 'x)' : '') + (lastDate ? ' ' + new Date(lastDate).toLocaleDateString() : '')),
                            delta !== null && /*#__PURE__*/React.createElement('span', {
                              'data-si-growth-delta': String(delta),
                              style: { display: 'inline-block', padding: '2px 7px', borderRadius: 999, background: delta > 0 ? '#dcfce7' : (delta < 0 ? '#fee2e2' : '#f1f5f9'), color: delta > 0 ? '#166534' : (delta < 0 ? '#991b1b' : '#475569'), fontSize: '0.68rem', fontWeight: 700 }
                            }, (delta > 0 ? '+' : '') + delta + ' pts vs prior'),
                            changedCount > 0 && /*#__PURE__*/React.createElement('span', {
                              'data-si-changed-responses': String(changedCount),
                              style: { display: 'inline-block', padding: '2px 7px', borderRadius: 999, background: '#e0f2fe', color: '#075985', fontSize: '0.68rem', fontWeight: 600 }
                            }, changedCount + ' updated')
                          );
                        })()
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' } },
                        row.status === 'decrypted' && /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => setExpandedRow(expandedRow === idx ? null : idx),
                          'aria-expanded': expandedRow === idx,
                          'aria-controls': 'submission-inbox-row-details-' + idx,
                          style: { minHeight: 44, marginRight: 6, padding: '6px 12px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }
                        }, expandedRow === idx ? 'Hide' : 'View'),
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => removeRow(idx), disabled: queueLocked,
                          style: { minHeight: 44, padding: '6px 12px', background: 'transparent', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.8rem', cursor: queueLocked ? 'not-allowed' : 'pointer', opacity: queueLocked ? 0.45 : 1 }
                        }, tr('Remove'))
                      )
                    ),
                    expandedRow === idx && row.payload && /*#__PURE__*/React.createElement('tr', { id: 'submission-inbox-row-details-' + idx },
                      /*#__PURE__*/React.createElement('td', { colSpan: 4, style: { padding: 0 } },
                        /*#__PURE__*/React.createElement('div', { style: { background: '#fafafa', padding: '12px 16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' } },
                          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 } },
                            /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' } },
                              'Decrypted responses (' + siResponseEntryModels(row.payload).length + ')'
                            ),
                            Object.keys(siExportedQuizAutoGrades(row.payload, history)).length > 0 && /*#__PURE__*/React.createElement('button', {
                              type: 'button',
                              title: tr('Score objective quiz answers in this worksheet against your project quiz answer keys'),
                              onClick: () => autoScoreRowObjectiveItems(idx),
                              style: { padding: '4px 10px', background: '#eef2ff', color: '#3730a3', border: '1px solid #a5b4fc', borderRadius: 6, fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }
                            }, tr('⚡ Auto-score objective items'))
                          ),
                          (() => {
                            const rowGradesNow = grades[idx] || {};
                            const notChecked = Object.keys(siStudentCopyOnlyGrades(row.payload, history)).filter(k => !rowGradesNow[k]).length;
                            if (!notChecked) return null;
                            return /*#__PURE__*/React.createElement('div', { 'data-si-student-copy-offer': notChecked, role: 'note', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, color: '#7c2d12', fontSize: '0.8rem' } },
                              /*#__PURE__*/React.createElement('span', { style: { flex: '1 1 260px' } }, tr('{n} answer(s) here could not be checked, because this project has no copy of that activity. Open the project it came from to check them against your own answer key, or score them by hand.', { n: notChecked })),
                              /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                title: tr('Uses the answer key stored inside this student\'s file. That copy can be out of date or changed. Each score is marked so you can tell.'),
                                onClick: () => scoreRowWithStudentCopy(idx),
                                style: { padding: '4px 10px', background: 'white', color: '#7c2d12', border: '1px solid #f59e0b', borderRadius: 6, fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }
                              }, tr('Score with the copy in the student\'s file'))
                            );
                          })(),
                          row.payload.takeHome && siTakeHomeResult(row.payload.takeHome),
                          /* Applied Challenge Studio export: the response keys carry
                             "<resourceId>:applied:<field>", so the host can rebuild a
                             real studio workspace from this student's typing. */
                          (function () {
                            var studio = window.AlloModules && window.AlloModules.AppliedChallenge;
                            var resp = row.payload && row.payload.responses && typeof row.payload.responses === 'object' && !Array.isArray(row.payload.responses) ? row.payload.responses : {};
                            // content carries the typed studio work (sources, checks, links, ratings).
                            var content = row.payload && Array.isArray(row.payload.content) ? row.payload.content : [];
                            var resourceIds = !studio ? [] : typeof studio.submissionResourceIds === 'function' ? studio.submissionResourceIds(resp, content)
                              : (typeof studio.submissionResourceId === 'function' && studio.submissionResourceId(resp) ? [studio.submissionResourceId(resp)] : []);
                            if (!resourceIds.length || typeof onOpenInStudio !== 'function') return null;
                            return resourceIds.map(function (resourceId, index) {
                              var entry = content.find(function (item) { return item && item.id === resourceId && item.type === 'applied-challenge'; });
                              var title = entry && typeof entry.title === 'string' ? entry.title.trim().slice(0, 120) : '';
                              var label = tr('Open in Applied Challenge Studio');
                              return /*#__PURE__*/React.createElement('button', {
                                key: 'open-studio-' + resourceId,
                                type: 'button',
                                onClick: function () { onOpenInStudio({ resourceId: resourceId, responses: resp, content: content, nickname: row.payload.nickname || row.payload.studentName || '' }); },
                                title: tr('Rebuild this student\'s typed workspace inside Applied Challenge Studio so you can coach, comment, and export it'),
                                style: { marginBottom: 10, marginRight: 6, padding: '6px 12px', background: '#c2410c', color: 'white', border: '1px solid #9a3412', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }
                              }, resourceIds.length > 1 ? label + ': ' + (title || String(index + 1)) : label);
                            });
                          })(),
                          /* Work Story (process provenance). Renders only when the
                             student chose to include it; absence is never surfaced
                             as a fact — no "declined" state exists here. */
                          workStoryModels[idx] && window.AlloModules && window.AlloModules.ProcessPanel
                            ? /*#__PURE__*/React.createElement(window.AlloModules.ProcessPanel, { model: workStoryModels[idx] })
                            : null,
                          siResponseEntryModels(row.payload).length === 0
                            ? /*#__PURE__*/React.createElement('div', { style: { fontStyle: 'italic', color: '#475569', fontSize: '0.85rem' } }, tr('No responses captured.'))
                            : siResponseEntryModels(row.payload).map((entry, i) => {
                                const k = entry.key;
                                const v = entry.rawText;
                                const assessmentReport = siAssessmentReport(row.payload.responses && typeof row.payload.responses === 'object' ? row.payload.responses[k] : null, k, history, row.payload.content);
                                const g = (grades[idx] || {})[k];
                                const sc = g ? scoreColor(g.score) : null;
                                const isAnchored = isResponseAnchored(idx, k, v);
                                const anchorScore = getAnchorScore(idx, k, v);
                                return /*#__PURE__*/React.createElement('div', { key: i, style: { marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: isAnchored ? '#fef3c7' : (g ? 'white' : 'transparent'), border: isAnchored ? '1.5px solid #f59e0b' : (g ? '1px solid #e2e8f0' : 'none') } },
                                  /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', marginBottom: g || isAnchored ? 4 : 0 } },
                                    /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                                      /*#__PURE__*/React.createElement('div', { style: { color: '#0f172a', fontWeight: 700, lineHeight: 1.35 } }, assessmentReport ? tr('Quiz responses') : (window.AlloModules && window.AlloModules.QuizView && window.AlloModules.QuizView.markdown ? window.AlloModules.QuizView.markdown.inline(entry.question) : entry.question)),
                                      entry.partLabel && /*#__PURE__*/React.createElement('div', { style: { color: '#475569', fontSize: '0.74rem', fontWeight: 600, marginTop: 2 } },
                                        entry.partLabel + (entry.responseType ? ' · ' + entry.responseType.replace(/-/g, ' ') : '')
                                      ),
                                      entry.metadataUnverified && /*#__PURE__*/React.createElement('span', { title: tr('This descriptive label came from the student file. Verify it against the original resource when needed.'), style: { display: 'inline-block', marginTop: 3, padding: '1px 5px', borderRadius: 999, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.64rem', fontWeight: 600 } }, tr('student-file label')),
                                      /*#__PURE__*/React.createElement('div', { style: { color: '#1e293b', marginTop: 4, whiteSpace: assessmentReport ? 'normal' : 'pre-wrap', overflowWrap: 'anywhere' } },
                                        assessmentReport
                                          ? /*#__PURE__*/React.createElement(SiAssessmentReport, { report: assessmentReport })
                                          : entry.answered
                                          ? String(entry.displayValue).slice(0, 12000)
                                          : /*#__PURE__*/React.createElement('em', { style: { color: '#9a3412', fontWeight: 700 } }, tr('No answer submitted'))
                                      ),
                                      !assessmentReport && entry.answered && String(entry.displayValue) !== String(entry.rawText) && /*#__PURE__*/React.createElement('div', { style: { color: '#64748b', marginTop: 3, fontSize: '0.7rem', overflowWrap: 'anywhere' } },
                                        tr('Stored value:') + ' ', /*#__PURE__*/React.createElement('code', null, String(entry.rawText).slice(0, 12000))
                                      ),
                                      /*#__PURE__*/React.createElement('details', { style: { marginTop: 4, color: '#64748b', fontSize: '0.7rem' } },
                                        /*#__PURE__*/React.createElement('summary', { style: { cursor: 'pointer', width: 'fit-content' } }, tr('Technical details')),
                                        /*#__PURE__*/React.createElement('div', { style: { marginTop: 3 } }, tr('Response key:')),
                                        /*#__PURE__*/React.createElement('code', { style: { display: 'block', overflowWrap: 'anywhere' } }, k),
                                        /*#__PURE__*/React.createElement('div', { style: { marginTop: 5 } }, tr('Stored value:')),
                                        /*#__PURE__*/React.createElement('code', { style: { display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, String(entry.rawText).slice(0, 12000))
                                      )
                                    ),
                                    /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' } },
                                      /*#__PURE__*/React.createElement('button', {
                                        type: 'button',
                                        onClick: () => openManualScoreForm(idx, entry),
                                        title: entry.requiresManualReview ? tr('Score this response yourself. It is not sent to the free-response AI grader.') : tr('Manually override or enter a teacher score for this response.'),
                                        style: { display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer' }
                                      }, g && (g.origin === 'teacher-edit' || g.origin === 'teacher-anchor' || siIsAnswerKeyOrigin(g.origin)) ? tr('Edit score') : (entry.requiresManualReview ? tr('Score manually') : tr('Score'))),
                                      !entry.requiresManualReview && !entry.isSelfCheck && entry.answered && (isAnchored
                                        ? /*#__PURE__*/React.createElement(React.Fragment, null,
                                            /*#__PURE__*/React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#fde68a', color: '#92400e', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 } },
                                              '📌 Anchor ' + anchorScore + '/100'
                                            ),
                                            /*#__PURE__*/React.createElement('button', {
                                              type: 'button',
                                              'data-si-unanchor': 'true',
                                              onClick: () => unanchorEntry(idx, k, String(v)),
                                              style: { padding: '2px 8px', background: 'white', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }
                                            }, tr('Un-anchor'))
                                          )
                                        : /*#__PURE__*/React.createElement('button', {
                                            type: 'button',
                                            onClick: () => openAnchorForm(idx, k, String(v)),
                                            title: tr('Mark this response as a calibration anchor. The AI will use it as an example to match your scoring.'),
                                            style: { padding: '2px 8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }
                                          }, tr('📌 Anchor'))
                                      )
                                    )
                                  ),
                                  g && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.78rem' } },
                                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700 } }, (typeof g.score === 'number' ? g.score : '–') + '/100'),
                                    /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontStyle: 'italic' } }, g.feedback || ''),
                                    g.keySource === 'student-file' && /*#__PURE__*/React.createElement('span', { 'data-si-key-source': 'student-file', style: { color: '#7c2d12', fontWeight: 700 } }, tr('Checked with the answer key inside the student\'s file. This project has no copy of the activity.'))
                                  )
                                );
                              }),
                          // Work evidence — what the student actually did, beyond what they typed.
                          (function () {
                            const ev = siWorkEvidence(row.payload, history);
                            if (ev.isEmpty) return null;
                            const shownActivities = ev.activities.slice(0, 12);
                            const moreActivities = ev.activities.length - shownActivities.length;
                            const chip = { display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'white', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#1e293b' };
                            const dim = { color: '#64748b', fontSize: '0.68rem' };
                            const subheading = { fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 };
                            const statBits = [];
                            if (ev.totalXP !== null) statBits.push(tr('{n} XP', { n: ev.totalXP }));
                            if (ev.quizzesTaken) statBits.push(tr('{n} quizzes taken', { n: ev.quizzesTaken }));
                            if (ev.notebookEntries) statBits.push(tr('{n} notebook entries', { n: ev.notebookEntries }));
                            return /*#__PURE__*/React.createElement('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' } },
                              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                                tr('🧾 Work in this submission')
                              ),
                              ev.activities.length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Activities included ({n})', { n: ev.activities.length })),
                                /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                                  shownActivities.map(function (activity, i) {
                                    return /*#__PURE__*/React.createElement('span', { key: 'act-' + i, style: chip },
                                      /*#__PURE__*/React.createElement('span', null, activity.title),
                                      /*#__PURE__*/React.createElement('span', { style: dim }, activity.type)
                                    );
                                  }),
                                  moreActivities > 0 && /*#__PURE__*/React.createElement('span', { key: 'act-more', style: Object.assign({}, chip, { color: '#64748b' }) }, tr('+{n} more', { n: moreActivities }))
                                )
                              ),
                              ev.annotations && ev.annotations.length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Highlights & notes ({n})', { n: ev.annotations.length })),
                                ev.annotations.slice(0, 50).map(function (anno, i) {
                                  const annoLabel = anno.type === 'highlight' ? tr('Highlight') : (anno.type === 'draw' ? tr('Drawing') : (anno.type === 'voice' ? tr('Voice note') : tr('Note')));
                                  const drawSvgSpec = (() => {
                                    if (anno.type !== 'draw' || !Array.isArray(anno.points) || anno.points.length < 2) return null;
                                    let minX = anno.points[0].x, maxX = anno.points[0].x, minY = anno.points[0].y, maxY = anno.points[0].y;
                                    for (let pi = 1; pi < anno.points.length; pi++) {
                                      if (anno.points[pi].x < minX) minX = anno.points[pi].x;
                                      if (anno.points[pi].x > maxX) maxX = anno.points[pi].x;
                                      if (anno.points[pi].y < minY) minY = anno.points[pi].y;
                                      if (anno.points[pi].y > maxY) maxY = anno.points[pi].y;
                                    }
                                    const pad = (anno.strokeWidth || 4) + 4;
                                    const bx = minX - pad, by = minY - pad;
                                    const bw = Math.max(20, (maxX - minX) + pad * 2), bh = Math.max(20, (maxY - minY) + pad * 2);
                                    const d = anno.points.map((pt, idx2) => (idx2 === 0 ? 'M' : 'L') + (Math.round((pt.x - bx) * 10) / 10) + ' ' + (Math.round((pt.y - by) * 10) / 10)).join(' ');
                                    return { bw, bh, d };
                                  })();
                                  return /*#__PURE__*/React.createElement('div', { key: 'anno-' + i, style: { marginBottom: 5, background: 'white', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 6, padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b' } },
                                    /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.68rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 2 } }, annoLabel),
                                    anno.quote && /*#__PURE__*/React.createElement('div', { style: { fontStyle: 'italic', color: '#475569', marginBottom: anno.note ? 3 : 0 } }, '“' + anno.quote + '”'),
                                    anno.note && /*#__PURE__*/React.createElement('div', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, anno.note),
                                    drawSvgSpec && /*#__PURE__*/React.createElement('svg', { role: 'img', 'aria-label': tr('Student drawing'), viewBox: '0 0 ' + drawSvgSpec.bw + ' ' + drawSvgSpec.bh, style: { display: 'block', maxWidth: '100%', maxHeight: 160, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4 } },
                                      /*#__PURE__*/React.createElement('path', { d: drawSvgSpec.d, fill: 'none', stroke: anno.strokeHex || '#dc2626', strokeWidth: anno.strokeWidth || 4, strokeLinecap: 'round', strokeLinejoin: 'round' })
                                    ),
                                    anno.type === 'draw' && anno.dataUrl && !drawSvgSpec && /*#__PURE__*/React.createElement('img', { src: anno.dataUrl, alt: tr('Student drawing'), style: { display: 'block', maxWidth: '100%', maxHeight: 160, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4 } }),
                                    anno.type === 'voice' && anno.audioSrc && /*#__PURE__*/React.createElement('audio', { controls: true, preload: 'metadata', src: anno.audioSrc, style: { width: '100%', maxWidth: 320, height: 32, marginTop: 4 } })
                                  );
                                })
                              ),
                              (ev.interviews.length > 0 || ev.roleSwaps.length > 0) && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Interview reflections ({n})', { n: ev.interviews.length + ev.roleSwaps.length })),
                                ev.interviews.map(function (entry, i) {
                                  return /*#__PURE__*/React.createElement('details', { key: 'interview-' + i, style: { marginBottom: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px' } },
                                    /*#__PURE__*/React.createElement('summary', { style: { cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' } }, entry.title),
                                    /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 360, overflowY: 'auto' } }, entry.body)
                                  );
                                }),
                                // Role Swap: readable answers + the same manual score form and grade row as responses.
                                ev.roleSwaps.map(function (rs, i) {
                                  const g = (grades[idx] || {})[rs.key];
                                  const sc = g ? scoreColor(g.score) : null;
                                  const small = { fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginTop: 4 };
                                  return /*#__PURE__*/React.createElement('div', { key: 'role-swap-' + i, 'data-role-swap-key': rs.key, style: { marginBottom: 6, background: 'white', border: '1px solid #c7d2fe', borderRadius: 6, padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b' } },
                                    /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
                                      /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0, fontWeight: 700, color: '#312e81' } }, rs.title),
                                      /*#__PURE__*/React.createElement('button', { type: 'button', onClick: () => openManualScoreForm(idx, { key: rs.key, rawText: rs.text }), title: tr('Score this response yourself. It is not sent to the free-response AI grader.'), style: { display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer' } }, g && g.origin === 'teacher-edit' ? tr('Edit score') : tr('Score manually'))
                                    ),
                                    rs.entries.map(function (e, j) {
                                      return /*#__PURE__*/React.createElement('div', { key: 'rs-entry-' + j, 'data-role-swap-entry': j, style: { marginTop: 6, paddingTop: 6, borderTop: j ? '1px solid #eef2ff' : 'none', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
                                        /*#__PURE__*/React.createElement('div', { style: small }, tr('Question')),
                                        /*#__PURE__*/React.createElement('div', { style: { fontWeight: 600 } }, e.question),
                                        /*#__PURE__*/React.createElement('div', { style: small }, tr('Answer as {name}', { name: e.speaker || rs.subject || 'Role Swap' })),
                                        /*#__PURE__*/React.createElement('div', null, e.answer),
                                        e.evidence && /*#__PURE__*/React.createElement('div', { style: small }, tr('Evidence from the source'),
                                          e.evidenceInSource && /*#__PURE__*/React.createElement('span', { 'data-role-swap-evidence-found': '', style: { marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: '0.66rem' } }, '✓ ' + tr('Found in source'))
                                        ),
                                        e.evidence && /*#__PURE__*/React.createElement('blockquote', { style: { margin: '2px 0 0 0', padding: '2px 8px', borderLeft: '3px solid #a5b4fc', color: '#334155', fontStyle: 'italic' } }, e.evidence)
                                      );
                                    }),
                                    /*#__PURE__*/React.createElement('div', { style: Object.assign({}, small, { marginTop: 8 }) }, tr('Student self-check')),
                                    /*#__PURE__*/React.createElement('ul', { style: { listStyle: 'none', margin: '2px 0 0 0', padding: 0 } },
                                      [['inCharacter', tr('Stayed in character')], ['usesEvidence', tr('Used evidence from the source')], ['accurate', tr('Historically accurate to the source')]].map(function (pair) {
                                        return /*#__PURE__*/React.createElement('li', { key: pair[0] },
                                          /*#__PURE__*/React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                                            /*#__PURE__*/React.createElement('input', { type: 'checkbox', checked: rs.selfCheck[pair[0]], disabled: true, readOnly: true }),
                                            pair[1]
                                          )
                                        );
                                      })
                                    ),
                                    g && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.78rem' } },
                                      /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700 } }, (typeof g.score === 'number' ? g.score : '–') + '/100'),
                                      /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontStyle: 'italic' } }, g.feedback || '')
                                    )
                                  );
                                })
                              ),
                              // Student-written adventures: outline, Play preview, self-check, manual score.
                              ev.stories.length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Student-written adventures ({n})', { n: ev.stories.length })),
                                ev.stories.map(function (story, i) {
                                  const g = (grades[idx] || {})[story.key];
                                  const sc = g ? scoreColor(g.score) : null;
                                  const small = { fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginTop: 4 };
                                  const playKey = idx + '|' + story.key;
                                  const playable = siStudentStoryPlayable(story);
                                  const playing = playable && playingStoryKey === playKey;
                                  const Player = playable ? window.AlloModules.AdventureOffline.Player : null;
                                  const storyT = function (key, params) { var v = null; try { v = typeof t === 'function' ? t(key, params) : null; } catch (e) { v = null; } return typeof v === 'string' ? v : key; };
                                  const pill = { display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, fontWeight: 700, fontSize: '0.72rem', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer' };
                                  return /*#__PURE__*/React.createElement('div', { key: 'student-story-' + i, 'data-student-story-key': story.key, style: { marginBottom: 6, background: 'white', border: '1px solid #c7d2fe', borderRadius: 6, padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b' } },
                                    /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
                                      /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0, fontWeight: 700, color: '#312e81' } }, story.title,
                                        /*#__PURE__*/React.createElement('span', { style: { marginLeft: 6, fontWeight: 400, color: '#64748b', fontSize: '0.72rem' } }, tr('{scenes} scenes · {endings} endings', { scenes: story.scenes.length, endings: story.endings }))
                                      ),
                                      /*#__PURE__*/React.createElement('button', { type: 'button', 'data-student-story-play': '', 'aria-pressed': !!playing, disabled: !playable, onClick: () => setPlayingStoryKey(playing ? null : playKey), title: playable ? undefined : tr('This story is unfinished, so it cannot be played yet.'), style: Object.assign({}, pill, { background: playing ? '#312e81' : '#eef2ff', color: playing ? 'white' : '#312e81', border: '1px solid #a5b4fc', opacity: playable ? 1 : 0.6, cursor: playable ? 'pointer' : 'not-allowed' }) }, playing ? tr('Close player') : tr('▶ Play')),
                                      /*#__PURE__*/React.createElement('button', { type: 'button', onClick: () => openManualScoreForm(idx, { key: story.key, rawText: story.text }), title: tr('Score this response yourself. It is not sent to the free-response AI grader.'), style: Object.assign({}, pill, { background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc' }) }, g && g.origin === 'teacher-edit' ? tr('Edit score') : tr('Score manually'))
                                    ),
                                    playing && Player && /*#__PURE__*/React.createElement('div', { 'data-student-story-player': '', style: { marginTop: 8 } }, /*#__PURE__*/React.createElement(Player, { story: playable, t: storyT, theme: 'light' })),
                                    /*#__PURE__*/React.createElement('ol', { 'data-student-story-outline': '', style: { listStyle: 'none', margin: '6px 0 0 0', padding: 0 } },
                                      story.scenes.map(function (scene, j) {
                                        return /*#__PURE__*/React.createElement('li', { key: 'scene-' + j, 'data-student-story-scene': scene.id, style: { marginTop: 6, paddingTop: 6, borderTop: j ? '1px solid #eef2ff' : 'none', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
                                          /*#__PURE__*/React.createElement('div', { style: small }, tr('Scene {n}', { n: j + 1 }) + (scene.id === story.start ? ' · ' + tr('Start') : '') + (scene.ending ? ' · ' + tr('Ending') : '')),
                                          /*#__PURE__*/React.createElement('div', null, scene.text || '—'),
                                          scene.choices.length > 0 && /*#__PURE__*/React.createElement('ul', { style: { margin: '2px 0 0 0', paddingLeft: 18 } },
                                            scene.choices.map(function (c, k) {
                                              return /*#__PURE__*/React.createElement('li', { key: 'choice-' + k }, (c.label || '—') + ' → ' + tr('Scene {n}', { n: story.number[c.to] || '?' }));
                                            })
                                          )
                                        );
                                      })
                                    ),
                                    /*#__PURE__*/React.createElement('div', { style: Object.assign({}, small, { marginTop: 8 }) }, tr('Student self-check')),
                                    /*#__PURE__*/React.createElement('ul', { style: { listStyle: 'none', margin: '2px 0 0 0', padding: 0 } },
                                      SI_STORY_CHECKS.map(function (pair) {
                                        return /*#__PURE__*/React.createElement('li', { key: pair[0] },
                                          /*#__PURE__*/React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                                            /*#__PURE__*/React.createElement('input', { type: 'checkbox', checked: story.selfCheck[pair[0]], disabled: true, readOnly: true }),
                                            tr(pair[1])
                                          )
                                        );
                                      })
                                    ),
                                    g && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.78rem' } },
                                      /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700 } }, (typeof g.score === 'number' ? g.score : '–') + '/100'),
                                      /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontStyle: 'italic' } }, g.feedback || '')
                                    )
                                  );
                                })
                              ),
                              ev.reflections.length > 0 && /*#__PURE__*/React.createElement('div', { 'data-adventure-reflections': '', style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Adventure reflections ({n})', { n: ev.reflections.reduce(function (n, r) { return n + r.entries.length; }, 0) })),
                                ev.reflections.map(function (r, i) {
                                  return /*#__PURE__*/React.createElement('div', { key: 'adv-reflect-' + i, style: { marginBottom: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b' } },
                                    /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#312e81' } }, r.title),
                                    r.entries.map(function (e, j) {
                                      return /*#__PURE__*/React.createElement('div', { key: 'entry-' + j, 'data-adventure-reflection': '', style: { marginTop: 6, paddingTop: j ? 6 : 0, borderTop: j ? '1px solid #eef2ff' : 'none', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
                                        e.ending && /*#__PURE__*/React.createElement('blockquote', { style: { margin: '0 0 2px 0', padding: '2px 8px', borderLeft: '3px solid #a5b4fc', color: '#475569', fontStyle: 'italic' } }, tr('Ending') + ': ' + e.ending),
                                        /*#__PURE__*/React.createElement('div', null, e.text)
                                      );
                                    })
                                  );
                                })
                              ),
                              ev.games.length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Practice games completed')),
                                /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                                  ev.games.map(function (game, i) {
                                    return /*#__PURE__*/React.createElement('span', { key: 'game-' + i, style: chip },
                                      /*#__PURE__*/React.createElement('span', null, game.gameType),
                                      /*#__PURE__*/React.createElement('span', { style: dim }, '×' + game.plays)
                                    );
                                  })
                                )
                              ),
                              statBits.length > 0 && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#475569' } }, statBits.join(' · ')),
                              // Deliberately phrased as a prompt for conversation. The device counts
                              // pastes into writable answer fields; a pasted citation and a pasted
                              // answer are indistinguishable from here, so this must not read as a finding.
                              ev.pastesIntoAnswers ? /*#__PURE__*/React.createElement('div', { style: { marginTop: 6, fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px' } },
                                ev.pastesIntoAnswers === 1
                                  ? tr('1 paste landed in an answer field. Worth asking about, not a conclusion.')
                                  : tr('{n} pastes landed in answer fields. Worth asking about, not a conclusion.', { n: ev.pastesIntoAnswers })
                              ) : null
                            );
                          })(),
                          // Rubric / Grade-with-AI section
                          Object.keys(row.payload.responses || {}).length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' } },
                            /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                              tr('🎯 AI Grade with rubric')
                            ),
                            /*#__PURE__*/React.createElement('label', { htmlFor: 'submission-inbox-row-rubric-' + idx, style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } },
                              tr('Rubric (what full credit looks like)'),
                              (globalRubric.rubric || '').trim() && !((rubrics[idx] && rubrics[idx].rubric) || '').trim()
                                ? /*#__PURE__*/React.createElement('span', { style: { fontWeight: 400, color: '#475569', marginLeft: 6, fontSize: '0.72rem' } }, tr('— using class rubric above (override here for this submission only)'))
                                : null
                            ),
                            /*#__PURE__*/React.createElement('textarea', {
                              id: 'submission-inbox-row-rubric-' + idx,
                              value: (rubrics[idx] && rubrics[idx].rubric) || '',
                              onChange: e => updateRubric(idx, { rubric: e.target.value }),
                              placeholder: (globalRubric.rubric || '').trim() ? globalRubric.rubric : tr('e.g., "Explains the main idea in their own words, cites at least one detail from the text, uses complete sentences."'),
                              rows: 3,
                              style: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('label', { htmlFor: 'submission-inbox-row-context-' + idx, style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } }, tr('Assignment context (optional)')),
                            /*#__PURE__*/React.createElement('input', {
                              id: 'submission-inbox-row-context-' + idx,
                              type: 'text',
                              value: (rubrics[idx] && rubrics[idx].context) || '',
                              onChange: e => updateRubric(idx, { context: e.target.value }),
                              placeholder: tr('e.g., "Reading response to chapter 3"'),
                              style: { width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('label', { htmlFor: 'submission-inbox-row-exemplar-' + idx, style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } },
                              tr('Quick exemplar (optional) '),
                              /*#__PURE__*/React.createElement('span', { style: { fontWeight: 400, color: '#475569', fontSize: '0.75rem' } },
                                anchors.length > 0
                                  ? '— ' + anchors.length + ' calibration anchor' + (anchors.length === 1 ? '' : 's') + ' active (📌 panel above). Anchors apply across all submissions; this exemplar adds one more locally.'
                                  : tr('— or tap 📌 on a real student response above to anchor it (multi-anchor calibration).')
                              )
                            ),
                            /*#__PURE__*/React.createElement('textarea', {
                              id: 'submission-inbox-row-exemplar-' + idx,
                              value: (rubrics[idx] && rubrics[idx].exemplar) || '',
                              onChange: e => updateRubric(idx, { exemplar: e.target.value }),
                              placeholder: tr('Paste an example of a 95/100 response so the AI matches your scoring.'),
                              rows: 2,
                              style: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                              /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                onClick: () => gradeRow(idx),
                                disabled: gradingRow === idx || !aiTextAvailable,
                                title: !aiTextAvailable ? tr('AI setup required for automatic grading. Score responses manually above.') : undefined,
                                style: { minHeight: 44, padding: '8px 16px', background: !aiTextAvailable ? '#cbd5e1' : '#7c3aed', color: !aiTextAvailable ? '#334155' : 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: gradingRow === idx ? 'wait' : (!aiTextAvailable ? 'not-allowed' : 'pointer'), opacity: gradingRow === idx ? 0.6 : 1 }
                              }, gradingRow === idx ? 'Grading…' : tr('🎯 Grade responses')),
                              ...renderRowGradeActions(idx)
                            )
                          ),
                          // A row with no typed responses (e.g. only a Role Swap) still needs review + save.
                          Object.keys(row.payload.responses || {}).length === 0 && Object.keys(grades[idx] || {}).length > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' } },
                            ...renderRowGradeActions(idx)
                          )
                        )
                      )
                    )
                  ))
                )
              )
            )
            );
            })()
      ),

      // Footer
      /*#__PURE__*/React.createElement('div', { style: { padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
        /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.8rem', color: '#475569' } },
          (counts.decrypted || 0) > 0
            ? tr('Click "View" on a row to grade it with an AI rubric and save the result to your local gradebook.')
            : tr('Decrypt the queue to see student responses.')
        ),
        /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8 } },
          /*#__PURE__*/React.createElement('button', {
            type: 'button', onClick: onClose,
            style: { minHeight: 44, padding: '8px 18px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }
          }, tr('Close'))
        )
      ),

      // Shared accessible score form: calibration anchor or teacher-only manual score.
      pendingAnchor && /*#__PURE__*/React.createElement('div', {
        role: 'presentation',
        style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10 }
      },
        /*#__PURE__*/React.createElement('div', { ref: anchorDialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'anchor-dialog-title', 'aria-describedby': 'anchor-dialog-description', tabIndex: -1, onKeyDown: event => { event.stopPropagation(); if (event.key === 'Escape') { if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return; event.preventDefault(); cancelPendingAnchor(); return; } containDialogFocus(event, anchorDialogRef.current); }, style: { background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', maxWidth: 540, width: '100%', padding: '20px 24px', border: pendingAnchor.mode === 'manual' ? '2px solid #7dd3fc' : '2px solid #fde68a' } },
          /*#__PURE__*/React.createElement('h3', { id: 'anchor-dialog-title', style: { margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: pendingAnchor.mode === 'manual' ? '#075985' : '#92400e' } }, tr(pendingAnchor.mode === 'manual' ? 'Score this response' : '📌 Anchor this response')),
          /*#__PURE__*/React.createElement('p', { id: 'anchor-dialog-description', style: { margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' } },
            tr(pendingAnchor.mode === 'manual'
              ? 'Enter your score for this structured response. It will be saved as a teacher edit.'
              : 'Give this response a score. The AI will use it as a calibration example when grading every other response.')
          ),
          /*#__PURE__*/React.createElement('div', { style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: '0.85rem', color: '#1e293b', maxHeight: 120, overflowY: 'auto' } },
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 700, marginBottom: 4 } }, tr('Student response')),
            pendingAnchor.responseText
          ),
          /*#__PURE__*/React.createElement('label', { htmlFor: 'si-pending-anchor-score', style: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 } }, tr('Score (0-100)')),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
            /*#__PURE__*/React.createElement('input', {
              type: 'range', min: 0, max: 100, step: 5, 'aria-label': tr(pendingAnchor.mode === 'manual' ? 'Manual score slider' : 'Anchor score slider'),
              value: pendingAnchor.score,
              onChange: e => setPendingAnchor({ ...pendingAnchor, score: e.target.value, scoreTouched: true }),
              style: { flex: 1 }
            }),
            /*#__PURE__*/React.createElement('input', {
              id: 'si-pending-anchor-score',
              type: 'number', min: 0, max: 100, 'aria-label': tr(pendingAnchor.mode === 'manual' ? 'Manual score' : 'Anchor score'),
              value: pendingAnchor.score,
              onChange: e => setPendingAnchor({ ...pendingAnchor, score: e.target.value, scoreTouched: true }),
              style: { width: 70, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', textAlign: 'center' }
            })
          ),
          /*#__PURE__*/React.createElement('label', { htmlFor: 'si-pending-anchor-note', style: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 } }, tr(pendingAnchor.mode === 'manual' ? 'Feedback (optional)' : 'Note (optional — tells the AI why this got that score)')),
          /*#__PURE__*/React.createElement('textarea', {
            id: 'si-pending-anchor-note',
            'aria-label': tr(pendingAnchor.mode === 'manual' ? 'Teacher feedback' : 'Anchor note'),
            value: pendingAnchor.feedback,
            onChange: e => setPendingAnchor({ ...pendingAnchor, feedback: e.target.value }),
            placeholder: tr(pendingAnchor.mode === 'manual' ? 'Optional feedback for this score.' : 'e.g., "Clear evidence + reasoning, but missed the counter-argument."'),
            rows: 2,
            style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }
          }),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            /*#__PURE__*/React.createElement('button', {
              ref: anchorCancelRef, type: 'button', onClick: cancelPendingAnchor,
              style: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }
            }, tr('Cancel')),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: confirmPendingAnchor,
              disabled: !pendingScoreValid,
              style: { padding: '8px 16px', background: pendingAnchor.mode === 'manual' ? '#0369a1' : '#b45309', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: !pendingScoreValid ? 'not-allowed' : 'pointer', opacity: !pendingScoreValid ? 0.55 : 1, fontSize: '0.88rem' }
            }, tr(pendingAnchor.mode === 'manual' ? 'Save score' : '📌 Add anchor'))
          )
        )
      ),
      confirmation && /*#__PURE__*/React.createElement('div', {
        role: 'presentation',
        style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 }
      },
        /*#__PURE__*/React.createElement('div', {
          ref: confirmationDialogRef,
          role: 'alertdialog', 'aria-modal': 'true',
          'aria-labelledby': 'submission-confirm-title', 'aria-describedby': 'submission-confirm-message',
          tabIndex: -1,
          onKeyDown: event => {
            event.stopPropagation();
            if (event.key === 'Escape') { if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return; event.preventDefault(); finishConfirmation(false); return; }
            containDialogFocus(event, confirmationDialogRef.current);
          },
          style: { background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', maxWidth: 480, width: '100%', padding: '22px 24px', border: '2px solid #fecaca' }
        },
          /*#__PURE__*/React.createElement('h3', { id: 'submission-confirm-title', style: { margin: '0 0 8px', color: '#991b1b', fontSize: '1.05rem' } }, confirmation.title),
          /*#__PURE__*/React.createElement('p', { id: 'submission-confirm-message', style: { margin: '0 0 18px', color: '#334155', lineHeight: 1.5 } }, confirmation.message),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              ref: confirmationCancelRef, type: 'button', onClick: () => finishConfirmation(false),
              style: { padding: '8px 14px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
            }, confirmation.cancelLabel || tr('Cancel')),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: () => finishConfirmation(true),
              style: { padding: '8px 14px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
            }, confirmation.confirmLabel || tr('Confirm'))
          )
        )
      )
    )
  ),
  showAlloSheetReview && renderAlloSheetReview()
);
}
