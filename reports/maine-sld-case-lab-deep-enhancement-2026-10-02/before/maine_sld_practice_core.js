(function (root, factory) {
  var core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.AlloSldPracticeCore = core;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var SESSION_KEY = 'alloflow_sld_case_lab_session_v1';
  var STEPS = ['case', 'scores', 'evidence', 'reasoning', 'debrief'];
  var PURPOSES = ['supporting', 'complicating', 'review'];
  var REFLECTIONS = ['caution', 'access', 'sdi', 'summary', 'gap', 'family', 'multilingual'];
  var owns = function (o, k) { return Object.prototype.hasOwnProperty.call(o || {}, k); };
  function object(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  function text(v, max) { return typeof v === 'string' ? v.replace(/\u0000/g, '').slice(0, max || 4000) : ''; }
  function blankCase() {
    var responses = {}; var reflections = {};
    for (var i = 1; i <= 9; i++) responses['Q' + i] = { answer: '', note: '' };
    REFLECTIONS.forEach(function (k) { reflections[k] = ''; });
    return { findings: {}, responses: responses, reflections: reflections, debriefRevealed: false, checkAnswers: {}, checkSubmitted: false };
  }
  function createState(data) {
    var byCase = {};
    data.cases.forEach(function (c) { byCase[c.id] = blankCase(); });
    return { version: 1, activeCase: data.cases[0].id, activeStep: 'case', byCase: byCase };
  }
  function caseRows(data, id) {
    var c = data.cases.find(function (v) { return v.id === id; });
    if (!c) return [];
    return data.scoreRows.filter(function (r) { return (c.scoreRowIds || []).indexOf(r.id) !== -1; }).concat(c.extraScoreRows || c.inlineScores || []).map(function (r) {
      var group = (data.scoreGroups || []).find(function (g) { return g.id === r.groupId; });
      return Object.assign({}, r, { test: r.test || 'Unspecified assessment', groupLabel: group ? group.label : '' });
    });
  }
  function contextRows(c) {
    return (c.narrative || []).map(function (v, i) { return { id: 'context-' + i, label: typeof v === 'string' ? v : v.body || v.text || '', test: 'Case record', value: '', scaleId: 'context' }; });
  }
  function sanitizeState(raw, data) {
    raw = object(raw); var clean = createState(data); var old = object(raw.byCase);
    if (owns(clean.byCase, raw.activeCase)) clean.activeCase = raw.activeCase;
    if (STEPS.indexOf(raw.activeStep) !== -1) clean.activeStep = raw.activeStep;
    data.cases.forEach(function (c) {
      var from = object(old[c.id]), to = clean.byCase[c.id];
      var allowed = caseRows(data, c.id).concat(contextRows(c)).map(function (r) { return r.id; });
      Object.keys(object(from.findings)).slice(0, 80).forEach(function (id) {
        var f = object(from.findings[id]);
        if (allowed.indexOf(id) !== -1 && PURPOSES.indexOf(f.purpose) !== -1) to.findings[id] = { purpose: f.purpose, note: text(f.note) };
      });
      Object.keys(to.responses).forEach(function (q) {
        var f = object(object(from.responses)[q]);
        var choices = q === 'Q9' ? ['sdi', 'general-ed', 'more'] : ['Q1', 'Q2', 'Q3', 'Q4', 'Q7', 'Q8'].indexOf(q) !== -1 ? ['yes', 'no', 'more'] : [];
        to.responses[q] = { answer: choices.indexOf(f.answer) !== -1 ? f.answer : '', note: text(f.note) };
      });
      REFLECTIONS.forEach(function (k) { to.reflections[k] = text(object(from.reflections)[k]); });
      to.debriefRevealed = from.debriefRevealed === true;
      (data.knowledgeCheck || []).forEach(function (q) {
        var index = object(from.checkAnswers)[q.id];
        if (Number.isInteger(index) && index >= 0 && index < q.options.length) to.checkAnswers[q.id] = index;
      });
      to.checkSubmitted = from.checkSubmitted === true && (data.knowledgeCheck || []).every(function (q) { return owns(to.checkAnswers, q.id); });
    });
    return clean;
  }
  function filterScores(rows, filters) {
    filters = filters || {}; var term = String(filters.search || '').trim().toLowerCase();
    return rows.filter(function (r) {
      return (!filters.test || filters.test === 'all' || r.test === filters.test) && (!term || [r.label, r.test, r.group, r.value, r.scaleId].join(' ').toLowerCase().indexOf(term) !== -1);
    });
  }
  function progress(work) {
    var f = Object.values(object(work.findings));
    return { supporting: f.filter(function (v) { return v.purpose === 'supporting'; }).length, complicating: f.filter(function (v) { return v.purpose === 'complicating'; }).length, findings: f.length, reasoning: Object.values(object(work.responses)).filter(function (v) { return !!String(v.note || '').trim(); }).length };
  }
  function exportWorksheet(state, data) {
    var clean = sanitizeState(state, data);
    return { format: 'alloflow-maine-sld-practice', schemaVersion: 1, moduleVersion: data.metadata.version, reviewed: data.metadata.reviewDate || data.metadata.reviewed, exportedAt: new Date().toISOString(), activeCase: clean.activeCase, caseWork: clean.byCase };
  }
  function importWorksheet(value, data) {
    if (typeof value === 'string') {
      if (value.length > 1000000) throw new Error('The worksheet is too large. Choose a Case Lab worksheet under 1 MB.');
      try { value = JSON.parse(value); } catch (_) { throw new Error('This file is not a readable JSON worksheet.'); }
    }
    value = object(value);
    if (value.format !== 'alloflow-maine-sld-practice' || value.schemaVersion !== 1) throw new Error('Choose a worksheet downloaded from the Maine SLD Case Lab.');
    if (value.moduleVersion !== data.metadata.version) throw new Error('This worksheet uses a different case version. Keep it for reference and start a new worksheet for this version.');
    return sanitizeState({ activeCase: value.activeCase, byCase: value.caseWork }, data);
  }
  function saveSession(storage, state, data) {
    try { storage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now(), moduleVersion: data.metadata.version, state: sanitizeState(state, data) })); return true; } catch (_) { return false; }
  }
  function loadSession(storage, data) {
    try {
      var saved = JSON.parse(storage.getItem(SESSION_KEY) || 'null');
      if (!saved) return createState(data);
      if (saved.moduleVersion !== data.metadata.version || !Number.isFinite(saved.at) || Date.now() - saved.at > 43200000 || saved.at > Date.now() + 60000) {
        storage.removeItem(SESSION_KEY); return createState(data);
      }
      return sanitizeState(saved.state, data);
    } catch (_) { return createState(data); }
  }
  function shareUrl(baseUrl, caseId, data) {
    var url = new URL(baseUrl);
    if (['http:', 'https:'].indexOf(url.protocol) === -1) throw new Error('The activity link must use HTTP or HTTPS.');
    var tool = url.searchParams.get('tool');
    url.username = ''; url.password = '';
    url.search = ''; url.hash = '';
    url.searchParams.set('tool', tool === 'maineSldPractice' ? tool : 'maine-sld-practice');
    if (data.cases.some(function (c) { return c.id === caseId; })) url.searchParams.set('case', caseId);
    return url.toString();
  }
  return { SESSION_KEY: SESSION_KEY, STEPS: STEPS, PURPOSES: PURPOSES, REFLECTIONS: REFLECTIONS, createState: createState, blankCase: blankCase, sanitizeState: sanitizeState, caseRows: caseRows, contextRows: contextRows, filterScores: filterScores, progress: progress, exportWorksheet: exportWorksheet, importWorksheet: importWorksheet, saveSession: saveSession, loadSession: loadSession, shareUrl: shareUrl };
});
