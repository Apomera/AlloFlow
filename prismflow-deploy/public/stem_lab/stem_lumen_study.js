/* Lumen Study Sources UI. Depends on window.LumenEvidence at render time. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LumenStudy = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  function evidenceApi() {
    return root && root.LumenEvidence;
  }

  function storageApi(ctx) {
    if (ctx && ctx.storageDB) return ctx.storageDB;
    try { return root.AlloModules && root.AlloModules.UtilsPure && root.AlloModules.UtilsPure.storageDB; } catch (_) { return null; }
  }

  function localStorageApi() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }

  function sourceTextFrom(ctx) {
    return String((ctx && (ctx.sourceText || ctx.inputText)) || '').trim();
  }

  function sourceProvenanceFor(ctx, content) {
    var E = evidenceApi();
    var provenance = ctx && ctx.sourceProvenance;
    if (!E || !provenance || provenance.signature !== E.sourceContentSignature(content)) return null;
    return provenance;
  }

  function sourceDescriptor(ctx, content) {
    var provenance = sourceProvenanceFor(ctx, content) || {};
    return {
      title: provenance.title || (ctx && ctx.sourceTopic) || 'Current AlloFlow source',
      locator: provenance.locator || (ctx && ctx.sourceLocator) || '',
      type: provenance.type || (ctx && ctx.sourceType) || 'alloflow-source',
      importMethod: provenance.importMethod || 'alloflow-current-source'
    };
  }

  function initialProjectFromContext(ctx) {
    var E = evidenceApi();
    if (!E) return null;
    var content = sourceTextFrom(ctx);
    var descriptor = sourceDescriptor(ctx, content);
    var title = descriptor.title === 'Current AlloFlow source' ? 'Lumen study project' : descriptor.title;
    var project = E.makeProject({ title: title, activeMode: 'study' });
    if (!content) return project;
    try {
      return E.upsertSource(project, {
        id: 'source-current',
        stableKey: 'alloflow-current-source',
        title: descriptor.title,
        locator: descriptor.locator,
        type: descriptor.type,
        content: content,
        importMethod: descriptor.importMethod
      });
    } catch (_) {
      return project;
    }
  }

  function normalizeProviderResult(value) {
    var E = evidenceApi();
    return E ? E.unwrapAIText(value) : String(value || '');
  }

  var SESSION_CALL_LIMIT = 8;
  var SESSION_COOLDOWN_MS = 1500;

  function hasProvider(ctx) {
    return !!(ctx && (typeof ctx.generateText === 'function'
      || (ctx.ai && typeof ctx.ai.generateText === 'function')
      || typeof ctx.callGemini === 'function'));
  }

  function checkSessionAllowance(state, now) {
    state = state || {};
    var count = Math.max(0, Number(state.count) || 0);
    var current = Number(now == null ? Date.now() : now);
    var lastAt = Number(state.lastAt) || 0;
    if (count >= SESSION_CALL_LIMIT) return { ok: false, reason: 'session-limit', retryAfterMs: null };
    var remaining = Math.max(0, SESSION_COOLDOWN_MS - (current - lastAt));
    if (lastAt && remaining > 0) return { ok: false, reason: 'cooldown', retryAfterMs: remaining };
    return { ok: true, reason: '', retryAfterMs: 0 };
  }

  async function callProvider(ctx, prompt) {
    if (ctx && typeof ctx.generateText === 'function') return normalizeProviderResult(await ctx.generateText(prompt, { jsonMode: true, task: 'lumen-grounded-study' }));
    if (ctx && ctx.ai && typeof ctx.ai.generateText === 'function') return normalizeProviderResult(await ctx.ai.generateText(prompt, { jsonMode: true }));
    if (ctx && typeof ctx.callGemini === 'function') return normalizeProviderResult(await ctx.callGemini(prompt, true));
    throw new Error('No text AI is configured. You can still inspect the retrieved evidence passages.');
  }

  function StudyComponent(props) {
    var ctx = props && props.ctx;
    var React = ctx && ctx.React;
    var h = React && React.createElement;
    var E = evidenceApi();
    if (!h) return null;
    if (!E) {
      return h('div', { role: 'status', className: 'p-5 rounded-xl border border-amber-300 bg-amber-50 text-slate-800' },
        h('p', { className: 'font-bold m-0' }, 'Study Sources is still loading.'),
        h('p', { className: 'text-sm mt-1 mb-0' }, 'The evidence engine loads separately so the data-analysis workspace stays small and reliable.'));
    }

    var initialRef = React.useRef(null);
    if (!initialRef.current) initialRef.current = initialProjectFromContext(ctx);
    var _project = React.useState(initialRef.current), project = _project[0], setProject = _project[1];
    var _hydrated = React.useState(false), hydrated = _hydrated[0], setHydrated = _hydrated[1];
    var _storageStatus = React.useState('loading'), storageStatus = _storageStatus[0], setStorageStatus = _storageStatus[1];
    var _question = React.useState(''), question = _question[0], setQuestion = _question[1];
    var _retrieved = React.useState([]), retrieved = _retrieved[0], setRetrieved = _retrieved[1];
    var _answer = React.useState(null), answer = _answer[0], setAnswer = _answer[1];
    var _busy = React.useState(false), busy = _busy[0], setBusy = _busy[1];
    var _error = React.useState(''), error = _error[0], setError = _error[1];
    var _activeEvidence = React.useState(''), activeEvidence = _activeEvidence[0], setActiveEvidence = _activeEvidence[1];
    var _draftTitle = React.useState('Additional source'), draftTitle = _draftTitle[0], setDraftTitle = _draftTitle[1];
    var _draftLocator = React.useState(''), draftLocator = _draftLocator[0], setDraftLocator = _draftLocator[1];
    var _draftText = React.useState(''), draftText = _draftText[0], setDraftText = _draftText[1];
    var _showAdd = React.useState(false), showAdd = _showAdd[0], setShowAdd = _showAdd[1];
    var _callCount = React.useState(0), callCount = _callCount[0], setCallCount = _callCount[1];
    var sessionRef = React.useRef({ count: 0, lastAt: 0 });

    var role = ctx && ctx.isTeacherMode === false ? 'learner' : 'teacher';
    var scope = role + '|' + String((ctx && ctx.studentNickname) || 'default');
    var storeRef = React.useRef(null);
    if (!storeRef.current) storeRef.current = E.createProjectStore({ storageDB: storageApi(ctx), localStorage: localStorageApi(), scope: scope });

    React.useEffect(function () {
      var cancelled = false;
      storeRef.current.load().then(function (saved) {
        if (cancelled) return;
        if (saved && saved.sources && saved.sources.length) setProject(saved);
        setHydrated(true);
        setStorageStatus(saved ? 'restored' : 'ready');
      }).catch(function () {
        if (!cancelled) { setHydrated(true); setStorageStatus('unavailable'); }
      });
      return function () { cancelled = true; };
    }, []);

    React.useEffect(function () {
      if (!hydrated || !project) return undefined;
      var cancelled = false;
      var timer = setTimeout(function () {
        storeRef.current.save(project).then(function (result) {
          if (!cancelled) setStorageStatus(result.ok ? 'saved' : 'unavailable');
        });
      }, 450);
      return function () { cancelled = true; clearTimeout(timer); };
    }, [hydrated, project]);

    var currentText = sourceTextFrom(ctx);
    var currentHash = currentText ? E.hashString(E.cleanText(currentText)) : '';
    var currentSource = project.sources.find(function (source) { return source.id === 'source-current'; });
    var currentChanged = !!(currentText && currentSource && currentSource.contentHash !== currentHash);
    var currentAvailable = !!currentText;
    var nodeById = {};
    project.evidenceNodes.forEach(function (node) { nodeById[node.id] = node; });
    var sourceById = {};
    project.sources.forEach(function (source) { sourceById[source.id] = source; });

    function announce(message) {
      try { if (ctx.announceToSR) ctx.announceToSR(message); } catch (_) {}
    }

    function importCurrent() {
      setError('');
      try {
        var descriptor = sourceDescriptor(ctx, currentText);
        var next = E.upsertSource(project, {
          id: 'source-current',
          stableKey: 'alloflow-current-source',
          title: descriptor.title,
          locator: descriptor.locator,
          type: descriptor.type,
          content: currentText,
          importMethod: descriptor.importMethod
        });
        setProject(next);
        setAnswer(null);
        setRetrieved([]);
        announce(currentSource ? 'Current source updated. Dependent notes were marked stale.' : 'Current AlloFlow source added to Lumen.');
      } catch (err) { setError(err.message || 'Could not import the current source.'); }
    }

    function addDraftSource(event) {
      if (event && event.preventDefault) event.preventDefault();
      setError('');
      try {
        var next = E.upsertSource(project, {
          title: draftTitle,
          stableKey: draftLocator || ('manual|' + draftTitle),
          locator: draftLocator,
          content: draftText,
          type: draftLocator ? 'url' : 'text',
          importMethod: 'paste'
        });
        setProject(next);
        setDraftText('');
        setDraftLocator('');
        setShowAdd(false);
        announce('Source added to the evidence project.');
      } catch (err) { setError(err.message || 'Could not add this source.'); }
    }

    function removeSource(sourceId) {
      setProject(E.removeSource(project, sourceId));
      setRetrieved(function (rows) { return rows.filter(function (row) { return row.node.sourceId !== sourceId; }); });
      setAnswer(null);
      announce('Source removed. Dependent notes were marked stale.');
    }

    async function ask(event) {
      if (event && event.preventDefault) event.preventDefault();
      var q = String(question || '').trim();
      if (!q) { setError('Ask a question about your sources first.'); return; }
      var hits = E.retrieve(project, q, { limit: 6 });
      setRetrieved(hits);
      setAnswer(null);
      setError('');
      if (!hits.length) {
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'study-retrieval', outcome: 'refused', reasonCode: 'no-relevant-evidence', questionHash: E.hashString(q), evidenceIds: [] }); });
        setError('Lumen could not find relevant support in the imported sources. Try a more specific question or add another source.');
        announce('No relevant evidence found.');
        return;
      }
      setActiveEvidence(hits[0].node.id);
      if (!hasProvider(ctx)) {
        setError('No text AI is configured. You can still inspect the retrieved evidence passages.');
        return;
      }
      var gate = checkSessionAllowance(sessionRef.current, Date.now());
      if (!gate.ok) {
        setError(gate.reason === 'session-limit'
          ? 'This Study Sources session has reached its 8-call AI limit. Retrieved evidence remains available.'
          : 'Please wait a moment before asking again. Retrieved evidence remains available.');
        return;
      }
      sessionRef.current = { count: sessionRef.current.count + 1, lastAt: Date.now() };
      setCallCount(sessionRef.current.count);
      setBusy(true);
      try {
        var prompt = E.buildGroundedPrompt(project, q, hits, { gradeLevel: ctx && ctx.gradeLevel });
        var raw = await callProvider(ctx, prompt);
        var checked = E.validateGroundedResponse(raw, hits);
        if (!checked.ok) {
          var invalid = new Error('Lumen rejected the answer because its citations or supporting excerpts could not be verified: ' + checked.errors.join(' '));
          invalid.code = 'grounding-validation';
          throw invalid;
        }
        setAnswer(checked);
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'study-answer', outcome: checked.insufficientEvidence ? 'refused' : 'validated', reasonCode: checked.insufficientEvidence ? 'insufficient-evidence' : '', questionHash: E.hashString(q), evidenceIds: hits.map(function (row) { return row.node.id; }) }); });
        announce(checked.insufficientEvidence ? 'The selected passages do not contain enough evidence to answer.' : 'Grounded answer ready with ' + checked.claims.length + ' cited claims.');
      } catch (err) {
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'study-answer', outcome: 'rejected', reasonCode: err && err.code === 'grounding-validation' ? 'grounding-validation' : 'provider-error', questionHash: E.hashString(q), evidenceIds: hits.map(function (row) { return row.node.id; }) }); });
        setError(err.message || 'The grounded answer could not be generated. The retrieved passages remain available.');
      } finally {
        setBusy(false);
      }
    }

    function saveNote() {
      if (!answer || !answer.ok || answer.insufficientEvidence) return;
      setProject(E.saveNote(project, answer, question));
      setStorageStatus('saving');
      announce('Grounded answer saved as a study note.');
    }

    function newProject() {
      var fresh = initialProjectFromContext(ctx) || E.makeProject({ title: 'Lumen study project' });
      setProject(fresh);
      setQuestion(''); setRetrieved([]); setAnswer(null); setError('');
      storeRef.current.clear();
      announce('New evidence project started.');
    }

    var storageLabel = storageStatus === 'saved' ? 'Saved on this device'
      : storageStatus === 'restored' ? 'Restored from this device'
      : storageStatus === 'unavailable' ? 'Storage unavailable — keep this window open'
      : storageStatus === 'saving' ? 'Saving…' : 'Preparing storage…';

    var sourceCards = project.sources.map(function (source) {
      var count = project.evidenceNodes.filter(function (node) { return node.sourceId === source.id; }).length;
      return h('li', { key: source.id, className: 'p-3 rounded-xl border border-slate-200 bg-white' },
        h('div', { className: 'flex items-start gap-2' },
          h('div', { className: 'min-w-0 flex-1' },
            h('p', { className: 'font-bold text-sm text-slate-800 m-0 break-words' }, source.title),
            h('p', { className: 'text-[11px] text-slate-500 mt-1 mb-0' }, count + ' evidence passage' + (count === 1 ? '' : 's') + ' · version ' + source.version),
            source.locator ? h('p', { className: 'text-[11px] text-slate-500 mt-1 mb-0 break-all' }, source.locator) : null),
          h('button', { type: 'button', className: 'text-xs text-rose-700 underline p-1', onClick: function () { removeSource(source.id); }, 'aria-label': 'Remove source ' + source.title }, 'Remove')));
    });

    var evidenceCards = retrieved.map(function (row, index) {
      var node = row.node;
      var source = sourceById[node.sourceId] || {};
      var active = activeEvidence === node.id;
      return h('article', {
        key: node.id,
        id: 'lumen-evidence-' + node.id,
        tabIndex: -1,
        className: 'p-3 rounded-xl border ' + (active ? 'border-amber-600 bg-amber-50' : 'border-slate-200 bg-white')
      },
        h('div', { className: 'flex items-center gap-2 text-[11px] font-bold text-slate-600' },
          h('span', { className: 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-100 text-cyan-800' }, String(index + 1)),
          h('span', null, source.title || 'Source'),
          h('span', { className: 'font-normal text-slate-400' }, node.locatorLabel)),
        h('p', { className: 'text-sm leading-6 text-slate-800 mt-2 mb-0 whitespace-pre-wrap' }, node.content));
    });

    var answerView = null;
    if (answer && answer.insufficientEvidence) {
      answerView = h('div', { role: 'status', className: 'p-4 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-700' }, 'The retrieved passages do not contain enough evidence for a defensible answer.');
    } else if (answer && answer.ok) {
      answerView = h('section', { 'aria-labelledby': 'lumen-grounded-answer-title', className: 'p-4 rounded-2xl border border-emerald-300 bg-emerald-50/50' },
        h('div', { className: 'flex items-start gap-3 flex-wrap' },
          h('div', { className: 'flex-1 min-w-[220px]' },
            h('h3', { id: 'lumen-grounded-answer-title', className: 'font-extrabold text-emerald-900 m-0' }, 'Grounded answer'),
            h('p', { className: 'text-xs text-emerald-800 mt-1 mb-0' }, 'Every displayed statement below passed Lumen’s evidence-ID validation.')),
          h('button', { type: 'button', onClick: saveNote, className: 'px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800' }, 'Save as study note')),
        h('ol', { className: 'mt-3 mb-0 space-y-3 pl-5' }, answer.claims.map(function (claim) {
          return h('li', { key: claim.id, className: 'text-sm text-slate-800' },
            h('p', { className: 'm-0 leading-6' }, claim.text),
            h('blockquote', { className: 'mt-2 mb-0 pl-3 border-l-2 border-emerald-500 text-xs italic text-slate-700' }, '“' + claim.quote + '”'),
            h('div', { className: 'mt-2 flex gap-1 flex-wrap', 'aria-label': 'Supporting citations' }, claim.evidenceIds.map(function (id) {
              var node = nodeById[id];
              return h('button', {
                key: id, type: 'button',
                className: 'px-2 py-1 rounded-full bg-cyan-100 text-cyan-900 text-[11px] font-bold hover:bg-cyan-200',
                onClick: function () {
                  setActiveEvidence(id);
                  try { var el = document.getElementById('lumen-evidence-' + id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); } } catch (_) {}
                }
              }, (sourceById[node && node.sourceId] || {}).title || 'Evidence', ' · ', (node && node.locatorLabel) || id);
            })));
        })));
    }

    return h('div', { className: 'p-4 rounded-xl bg-amber-50 border border-amber-200 text-slate-800' },
      h('div', { className: 'flex items-center gap-2 flex-wrap pb-3 border-b border-amber-200' },
        h('button', { type: 'button', onClick: function () { ctx.update('lumen', 'mode', 'home'); }, className: 'px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50' }, '← Lumen home'),
        h('div', { className: 'min-w-0' },
          h('h2', { className: 'font-extrabold text-lg text-slate-900 m-0' }, 'Study Sources'),
          h('p', { className: 'text-xs text-slate-600 m-0' }, 'Ask, inspect and save only what your evidence supports.')),
        h('span', { role: 'status', 'aria-live': 'polite', className: 'ml-auto text-[11px] text-slate-500' }, storageLabel),
        h('button', { type: 'button', onClick: newProject, className: 'text-xs underline text-slate-600' }, 'New project')),

      currentAvailable ? h('div', { className: 'mt-3 p-3 rounded-xl border ' + (currentChanged ? 'border-orange-400 bg-orange-50' : 'border-blue-200 bg-blue-50') },
        h('div', { className: 'flex items-center gap-3 flex-wrap' },
          h('div', { className: 'flex-1 min-w-[220px]' },
            h('p', { className: 'font-bold text-sm m-0' }, currentSource ? (currentChanged ? 'AlloFlow’s current source has changed' : 'Current AlloFlow source is connected') : 'Use the source already loaded in AlloFlow'),
            h('p', { className: 'text-xs mt-1 mb-0 text-slate-600' }, currentChanged ? 'Updating it will mark dependent notes stale instead of silently reusing old evidence.' : 'Lumen keeps its passages and citations inside this evidence project.')),
          (!currentSource || currentChanged) ? h('button', { type: 'button', onClick: importCurrent, className: 'px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800' }, currentSource ? 'Update source' : 'Use current source') : null)) : null,

      error ? h('div', { role: 'alert', className: 'mt-3 p-3 rounded-lg border border-rose-300 bg-rose-50 text-sm text-rose-900' }, error) : null,

      h('div', { className: 'mt-4 grid gap-4', style: { gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' } },
        h('aside', { 'aria-labelledby': 'lumen-sources-title' },
          h('div', { className: 'flex items-center gap-2' },
            h('h3', { id: 'lumen-sources-title', className: 'font-extrabold text-sm text-slate-800 m-0' }, 'Project sources (' + project.sources.length + ')'),
            h('button', { type: 'button', onClick: function () { setShowAdd(!showAdd); }, className: 'ml-auto text-xs font-bold text-amber-800 underline', 'aria-expanded': showAdd }, showAdd ? 'Close' : 'Add source')),
          sourceCards.length ? h('ul', { className: 'mt-2 space-y-2 list-none p-0 m-0' }, sourceCards) : h('p', { className: 'mt-2 text-sm text-slate-500' }, 'Add a source to begin.'),
          showAdd ? h('form', { onSubmit: addDraftSource, className: 'mt-3 p-3 rounded-xl border border-amber-300 bg-white' },
            h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Source title', h('input', { value: draftTitle, onChange: function (e) { setDraftTitle(e.target.value); }, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm', maxLength: 240 })),
            h('label', { className: 'block mt-2 text-xs font-bold text-slate-700' }, 'Source URL or locator (optional)', h('input', { value: draftLocator, onChange: function (e) { setDraftLocator(e.target.value); }, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm', maxLength: 1000, placeholder: 'https://… or chapter/page label' })),
            h('label', { className: 'block mt-2 text-xs font-bold text-slate-700' }, 'Source text', h('textarea', { value: draftText, onChange: function (e) { setDraftText(e.target.value); }, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm min-h-[150px]', placeholder: 'Paste an article, transcript, notes or document text…' })),
            h('button', { type: 'submit', className: 'mt-2 w-full px-3 py-2 rounded-lg bg-amber-700 text-white text-xs font-bold hover:bg-amber-800' }, 'Add to evidence project')) : null,
          project.artifacts.length ? h('div', { className: 'mt-4' },
            h('h3', { className: 'font-extrabold text-sm text-slate-800 m-0' }, 'Saved notes (' + project.artifacts.length + ')'),
            h('ul', { className: 'mt-2 space-y-2 pl-5 text-xs text-slate-700' }, project.artifacts.slice().reverse().map(function (artifact) {
              return h('li', { key: artifact.id, className: artifact.stale ? 'text-orange-800' : '' }, artifact.title, artifact.stale ? ' — source changed' : '');
            }))) : null),

        h('main', null,
          h('form', { onSubmit: ask, className: 'p-4 rounded-2xl border border-amber-300 bg-white shadow-sm' },
            h('label', { htmlFor: 'lumen-study-question', className: 'block font-extrabold text-sm text-slate-800' }, 'What do you want to understand?'),
            h('div', { className: 'mt-2 flex flex-col sm:flex-row gap-2 items-stretch' },
              h('textarea', { id: 'lumen-study-question', value: question, onChange: function (e) { setQuestion(e.target.value); }, disabled: busy, rows: 2, maxLength: 2000, className: 'flex-1 rounded-xl border border-slate-300 p-3 text-sm', placeholder: 'For example: What evidence explains why the policy changed?' }),
              h('button', { type: 'submit', disabled: busy || !project.evidenceNodes.length, className: 'px-4 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white text-sm font-extrabold disabled:opacity-50' }, busy ? 'Checking…' : 'Find grounded answer')),
            h('p', { className: 'text-[11px] text-slate-500 mt-2 mb-0' }, 'Lumen retrieves passages locally, sends only the selected passages to your configured AI, and requires an exact verified support excerpt for every claim.'),
            h('p', { className: 'text-[11px] text-slate-500 mt-1 mb-0' }, callCount + '/' + SESSION_CALL_LIMIT + ' AI study calls used this session. A short cooldown prevents accidental repeat requests.')),
          answerView ? h('div', { className: 'mt-4' }, answerView) : null,
          retrieved.length ? h('section', { 'aria-labelledby': 'lumen-retrieved-title', className: 'mt-4' },
            h('div', { className: 'flex items-end gap-2' },
              h('h3', { id: 'lumen-retrieved-title', className: 'font-extrabold text-sm text-slate-800 m-0' }, 'Retrieved evidence'),
              h('p', { className: 'text-[11px] text-slate-500 m-0' }, retrieved.length + ' locally ranked passage' + (retrieved.length === 1 ? '' : 's'))),
            h('div', { className: 'mt-2 space-y-2' }, evidenceCards)) : null)));
  }

  function render(ctx) {
    var React = ctx && ctx.React;
    return React && React.createElement ? React.createElement(StudyComponent, { ctx: ctx }) : null;
  }

  return Object.freeze({
    render: render,
    Component: StudyComponent,
    initialProjectFromContext: initialProjectFromContext,
    sourceProvenanceFor: sourceProvenanceFor,
    sourceDescriptor: sourceDescriptor,
    normalizeProviderResult: normalizeProviderResult,
    hasProvider: hasProvider,
    checkSessionAllowance: checkSessionAllowance,
    SESSION_CALL_LIMIT: SESSION_CALL_LIMIT,
    SESSION_COOLDOWN_MS: SESSION_COOLDOWN_MS,
    callProvider: callProvider
  });
});
