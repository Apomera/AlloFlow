// Saved directions and actions remain in the host. Unsubmitted goal-entry state
// stays local so keystrokes do not rerender the full workspace.
function DirectionsComposerView({
  ArrowRight = () => null,
  ClipboardList = () => null,
  Sparkles = () => null,
  X = () => null,
  _alloDirectionsGoalResources = [],
  _alloGoalOptionsForResource = () => [],
  _alloStationStyle = () => ({ icon: '•', label: '' }),
  _mbDirectionsChoiceDraftChoices = [],
  _mbDirectionsChoicePreviewItems = [],
  _mbDirectionsChoiceReady,
  _mbDirectionsChoiceStaleCount,
  addDirectionsToPack = () => {},
  deriveDirectionsDraft = () => {},
  directionsDeriving,
  generateUUID = () => 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
  mbDirectionsDraft,
  directionsPreviewHtml = '',
  directionsGoalEditorState,
  mbDirectionsGoalRes: legacyGoalRes,
  mbDirectionsGoalText: legacyGoalText,
  setMbDirectionsDraft = () => {},
  setMbDirectionsGoalRes: legacySetGoalRes,
  setMbDirectionsGoalText: legacySetGoalText,
  setShowDirectionsChoicePreview = () => {},
  setShowDirectionsComposer = () => {},
  showDirectionsChoicePreview,
  t: rawT
}) {
  const t = typeof rawT === 'function' ? rawT : () => '';
  const safeGoalResources = Array.isArray(_alloDirectionsGoalResources) ? _alloDirectionsGoalResources.filter(Boolean) : [];
  const safeChoicePreviewItems = Array.isArray(_mbDirectionsChoicePreviewItems) ? _mbDirectionsChoicePreviewItems.filter(item => item && item.choice && item.resource) : [];
  // The host ref retains unfinished input across close/reopen without root state
  // updates. Legacy props keep already-open older shells compatible with this module.
  const fallbackGoalState = React.useRef({ resource: legacyGoalRes || '', text: legacyGoalText || '' });
  const goalState = directionsGoalEditorState || fallbackGoalState;
  const previewLabel = t('common.preview');
  const tr = (key, fallback, vars) => {
    const value = typeof t === 'function' ? t(key) : '';
    let text = typeof value === 'string' && value.trim() && value !== key ? value : fallback;
    Object.keys(vars || {}).forEach(name => { text = text.split('{' + name + '}').join(String(vars[name])); });
    return text;
  };
  let draftAiDoor = null;
  try {
    if (typeof window !== 'undefined') {
      const hardBlocked = window._alloQrBlocked === true || window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true;
      if (hardBlocked || (typeof window.__alloAiUsable === 'function' && !window.__alloAiUsable('text'))) {
        draftAiDoor = { disabled: true, title: tr('directions.ai_unavailable', 'AI setup required') };
      } else if (typeof window.__alloAiSetupDoorway === 'function') {
        draftAiDoor = window.__alloAiSetupDoorway('text', t);
      }
    }
  } catch (_) {}
  const boardTitleDefault = tr('directions.choice_board_title', 'Choose an activity');
  const boardPromptDefault = tr('directions.choice_board_prompt', 'Pick one activity to work on first. You can return here and choose another later.');
  const composerDialogRef = React.useRef(null);
  const previewDialogRef = React.useRef(null);
  const previewBackdropDownRef = React.useRef(null);
  const snippetTimerRef = React.useRef(null);
  const previewOpenRef = React.useRef(!!showDirectionsChoicePreview);
  previewOpenRef.current = !!showDirectionsChoicePreview;
  React.useEffect(() => () => {
    if (snippetTimerRef.current !== null) {
      clearTimeout(snippetTimerRef.current);
      snippetTimerRef.current = null;
    }
  }, []);
  const getFocusableIn = container => {
    if (!container || typeof container.querySelectorAll !== 'function') return [];
    return Array.from(container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])')).filter(el => {
      if (el.hidden || el.getAttribute('aria-hidden') === 'true' || (typeof el.closest === 'function' && el.closest('[hidden], [inert], [aria-hidden="true"]'))) return false;
      const closedDetails = typeof el.closest === 'function' ? el.closest('details:not([open])') : null;
      if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false;
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        for (let cur = el; cur && cur !== container; cur = cur.parentElement) {
          const st = window.getComputedStyle(cur);
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
        }
      }
      return true;
    });
  };
  const isTrapActive = (stack, trap, dialog) => {
    if (!stack.length) return true;
    const top = stack[stack.length - 1];
    return top === trap || Boolean(top && top.root && typeof top.root.contains === 'function' && top.root.contains(dialog));
  };
  React.useEffect(() => {
    const doc = typeof window !== 'undefined' ? window.document : null;
    const prevFocus = doc && doc.activeElement;
    const dialog = composerDialogRef.current;
    if (!dialog) return () => {
      if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
    const backgroundState = [];
    const seenNodes = new Set();
    if (doc && doc.body) {
      for (let branch = dialog; branch && branch !== doc.body && branch.parentElement; branch = branch.parentElement) {
        Array.from(branch.parentElement.children).forEach(node => {
          if (node === branch || seenNodes.has(node) || /^(?:SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(node.tagName) || (typeof node.matches === 'function' && node.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]'))) return;
          seenNodes.add(node);
          backgroundState.push({
            node,
            hadInert: Boolean(node.inert || node.hasAttribute('inert')),
            ariaHidden: node.getAttribute('aria-hidden')
          });
          try { node.inert = true; } catch (_) {}
          try { node.setAttribute('inert', ''); } catch (_) {}
          try { node.setAttribute('aria-hidden', 'true'); } catch (_) {}
        });
      }
    }
    const alloScrollLock = typeof window !== 'undefined' ? (window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' })) : null;
    const alloScrollLocked = !!(alloScrollLock && doc && doc.body);
    if (alloScrollLocked && ++alloScrollLock.count === 1) {
      alloScrollLock.prev = doc.body.style.overflow;
      doc.body.style.overflow = 'hidden';
    }
    const stack = typeof window !== 'undefined' ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || []) : [];
    _ensureDirectionsComposerA11yCss();
    const trap = { root: dialog };
    stack.push(trap);
    const onKeyDown = e => {
      if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!isTrapActive(stack, trap, dialog)) return;
      if (previewOpenRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowDirectionsComposer(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusableIn(dialog);
      if (!focusable.length) {
        e.preventDefault();
        if (typeof dialog.focus === 'function') dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = doc && doc.activeElement;
      if (e.shiftKey && (!doc || active === dialog || active === first || (typeof dialog.contains === 'function' && !dialog.contains(active)))) {
        e.preventDefault();
        if (typeof last.focus === 'function') last.focus();
      } else if (!e.shiftKey && (!doc || active === dialog || active === last || (typeof dialog.contains === 'function' && !dialog.contains(active)))) {
        e.preventDefault();
        if (typeof first.focus === 'function') first.focus();
      }
    };
    if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('keydown', onKeyDown);
    return () => {
      const wasTop = isTrapActive(stack, trap, dialog);
      const idx = stack.lastIndexOf(trap);
      if (idx !== -1) stack.splice(idx, 1);
      if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('keydown', onKeyDown);
      if (alloScrollLocked) {
        alloScrollLock.count = Math.max(0, alloScrollLock.count - 1);
        if (alloScrollLock.count === 0 && doc && doc.body) doc.body.style.overflow = alloScrollLock.prev;
      }
      backgroundState.forEach(({ node, hadInert, ariaHidden }) => {
        if (!node || !node.isConnected) return;
        if (!hadInert) {
          try { node.inert = false; } catch (_) {}
          try { node.removeAttribute('inert'); } catch (_) {}
        }
        if (ariaHidden == null) { try { node.removeAttribute('aria-hidden'); } catch (_) {} }
        else if (ariaHidden !== 'true') { try { node.setAttribute('aria-hidden', ariaHidden); } catch (_) {} }
      });
      if (wasTop && prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, [setShowDirectionsComposer]);
  React.useEffect(() => {
    if (!showDirectionsChoicePreview) return undefined;
    const doc = typeof window !== 'undefined' ? window.document : null;
    const openerFocus = doc && doc.activeElement;
    const dialog = previewDialogRef.current;
    if (!dialog) return undefined;
    const stack = typeof window !== 'undefined' ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || []) : [];
    const trap = { root: dialog };
    stack.push(trap);
    const focusable = getFocusableIn(dialog);
    const initial = focusable[0] || dialog;
    if (initial && typeof initial.focus === 'function') initial.focus();
    const onKeyDown = e => {
      if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!isTrapActive(stack, trap, dialog)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowDirectionsChoicePreview(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusableIn(dialog);
      if (!items.length) {
        e.preventDefault();
        if (typeof dialog.focus === 'function') dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = doc && doc.activeElement;
      if (e.shiftKey && (!doc || active === dialog || active === first || (typeof dialog.contains === 'function' && !dialog.contains(active)))) {
        e.preventDefault();
        if (typeof last.focus === 'function') last.focus();
      } else if (!e.shiftKey && (!doc || active === dialog || active === last || (typeof dialog.contains === 'function' && !dialog.contains(active)))) {
        e.preventDefault();
        if (typeof first.focus === 'function') first.focus();
      }
    };
    if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('keydown', onKeyDown);
    return () => {
      const wasTop = isTrapActive(stack, trap, dialog);
      const idx = stack.lastIndexOf(trap);
      if (idx !== -1) stack.splice(idx, 1);
      if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('keydown', onKeyDown);
      if (wasTop && openerFocus && openerFocus.isConnected && typeof openerFocus.focus === 'function') openerFocus.focus();
    };
  }, [showDirectionsChoicePreview, setShowDirectionsChoicePreview]);
  const [numDrafts, setNumDrafts] = React.useState({});
  const [mbDirectionsGoalRes, updateGoalRes] = React.useState(() => goalState.current.resource);
  const [mbDirectionsGoalText, updateGoalText] = React.useState(() => goalState.current.text);
  const setMbDirectionsGoalRes = value => {
    goalState.current.resource = value;
    updateGoalRes(value);
    if (legacySetGoalRes) legacySetGoalRes(value);
  };
  const setMbDirectionsGoalText = value => {
    goalState.current.text = value;
    updateGoalText(value);
    if (legacySetGoalText) legacySetGoalText(value);
  };
  const bodyText = String(mbDirectionsDraft?.body || '');
  const bodyWordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
  const bodyStepCount = bodyText
    .split(/\r?\n/)
    .filter(line => /^\s*(?:\d+[.)]|[-*•])\s+\S/.test(line))
    .length;
  const insertDirectionsSnippet = mode => {
    setMbDirectionsDraft(prev => {
      const current = String(prev?.body || '');
      if (mode === 'starter') {
        const template = tr(
          'directions.starter_template',
          '1. Read the passage or review the key vocabulary first.\n2. Complete the main activity and check your work.\n3. Share one takeaway or question before finishing.'
        );
        return { ...(prev || {}), body: current.trim() ? current.trimEnd() + '\n' + template : template };
      }
      if (mode === 'step') {
        const nums = Array.from(current.matchAll(/^\s*(\d+)[.)]\s+/gm)).map(m => Number(m[1])).filter(Number.isFinite);
        const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
        const line = nextNum + '. ';
        return { ...(prev || {}), body: current.trim() ? current.trimEnd() + '\n' + line : line };
      }
      const bullet = '- ';
      return { ...(prev || {}), body: current.trim() ? current.trimEnd() + '\n' + bullet : bullet };
    });
    if (snippetTimerRef.current !== null) clearTimeout(snippetTimerRef.current);
    snippetTimerRef.current = setTimeout(() => {
      snippetTimerRef.current = null;
      try { composerDialogRef.current?.querySelector('textarea[data-help-key="directions_body"]')?.focus(); } catch (_) {}
    }, 0);
  };
  return (
<div role="presentation" className="fixed inset-0 z-[395] bg-black/40 flex items-center justify-center p-4" onKeyDown={e => { if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return; const stack = typeof window !== 'undefined' ? window.__alloFocusTrapStack : null; const expectedRoot = showDirectionsChoicePreview ? previewDialogRef.current : composerDialogRef.current; if (Array.isArray(stack) && stack.length > 0 && expectedRoot && stack[stack.length - 1]?.root !== expectedRoot) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (showDirectionsChoicePreview) { setShowDirectionsChoicePreview(false); } else { setShowDirectionsComposer(false); } } }}>
          <div ref={composerDialogRef} tabIndex={-1} data-directions-composer="true" data-help-key="directions_composer" role="dialog" aria-modal="true" aria-label={t('directions.title') || 'Lesson Directions'} className="allo-docsuite bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-4 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100dvh - 2rem)' }}>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={18} className="text-amber-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-800 flex-1">{t('directions.title') || 'Lesson Directions'}</h2>
              <button type="button" onClick={() => setShowDirectionsComposer(false)} aria-label={t('common.close') || 'Close'} className="min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 p-1 rounded-lg transition-all motion-reduce:transition-none"><X size={16} aria-hidden="true" /></button>
            </div>
            <p className="text-xs text-slate-600 mb-2">{t('directions.subtitle') || 'Student-facing. Students see this first — in class, on homework QRs, and on the take-home shelf.'}</p>
            <div className="space-y-2 min-h-0 flex-1 overflow-y-auto pr-1" data-directions-scroll>
              <input data-help-key="directions_title" autoFocus value={mbDirectionsDraft?.title || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), title: e.target.value }))} placeholder={t('directions.title_placeholder') || "Title (e.g. Tonight's homework)"} aria-label={t('directions.title_aria') || 'Directions title'} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" />
              <textarea data-help-key="directions_body" value={mbDirectionsDraft?.body || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), body: e.target.value }))} placeholder={t('directions.body_placeholder') || 'Directions for students: the steps, and what finished work looks like.'} aria-label={t('directions.body_aria') || 'Directions for students'} rows={6} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" />
              <div data-directions-format-bar="true" className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('directions.format_tools_aria', 'Quick formatting helpers')}>
                  <button
                    type="button"
                    data-directions-insert="step"
                    onClick={() => insertDirectionsSnippet('step')}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    + 1. {tr('directions.insert_step', 'Step')}
                  </button>
                  <button
                    type="button"
                    data-directions-insert="bullet"
                    onClick={() => insertDirectionsSnippet('bullet')}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    + • {tr('directions.insert_bullet', 'Bullet')}
                  </button>
                  {!bodyText.trim() && (
                    <button
                      type="button"
                      data-directions-insert="starter"
                      onClick={() => insertDirectionsSnippet('starter')}
                      className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
                    >
                      ✨ {tr('directions.insert_starter', '3-Step Starter')}
                    </button>
                  )}
                </div>
                {bodyWordCount > 0 && (
                  <span data-directions-body-stats="true" className="text-[11px] font-semibold text-slate-600">
                    {bodyStepCount > 0
                      ? tr('directions.body_stats_steps', '{words} words · {steps} steps', { words: bodyWordCount, steps: bodyStepCount })
                      : tr('directions.body_stats_words', '{words} words', { words: bodyWordCount })}
                  </span>
                )}
              </div>
              <input data-help-key="directions_due" value={mbDirectionsDraft?.due || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), due: e.target.value }))} placeholder={t('directions.due_placeholder') || 'Due (optional, e.g. Friday)'} aria-label={t('directions.due_aria') || 'Due date'} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" />
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-2" data-directions-preview>
                <summary className="cursor-pointer text-xs font-bold text-indigo-800">{previewLabel && previewLabel !== 'common.preview' ? previewLabel : 'Preview'}</summary>
                {directionsPreviewHtml
                  ? <div className="mt-3 text-sm text-slate-800 break-words" dangerouslySetInnerHTML={{ __html: (typeof window !== 'undefined' && typeof window.sanitizeHtml === 'function') ? window.sanitizeHtml(directionsPreviewHtml) : '' }} />
                  : <p className="mt-2 text-xs text-slate-600">{t('directions.body_placeholder') || 'Write directions to preview them here.'}</p>}
              </details>
              <div className="border-t border-indigo-100 pt-2">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mbDirectionsDraft?.choiceBoard?.enabled === true}
                    onChange={e => setMbDirectionsDraft(p => {
                      const next = { ...(p || {}) };
                      if (!e.target.checked) {
                        delete next.choiceBoard;
                        return next;
                      }
                      next.choiceBoard = {
                        enabled: true,
                        title: next.choiceBoard?.title || boardTitleDefault,
                        prompt: next.choiceBoard?.prompt || boardPromptDefault,
                        choices: Array.isArray(next.choiceBoard?.choices) ? next.choiceBoard.choices : []
                      };
                      return next;
                    })}
                    aria-label={tr('directions.choice_board_enable', 'Offer an activity choice board')}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
                  />
                  <span className="text-xs font-bold text-indigo-900">{tr('directions.choice_board_enable', 'Offer an activity choice board')}</span>
                </label>
                <p className="text-xs text-slate-600 mt-1 ml-6">{tr('directions.choice_board_hint', 'Students will see these pack activities as large, selectable cards on the directions page.')}</p>
                {mbDirectionsDraft?.choiceBoard?.enabled === true && (
                  <div className="mt-2 ml-6 space-y-2">
                    <input
                      value={mbDirectionsDraft.choiceBoard.title || ''}
                      onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), choiceBoard: { ...(p?.choiceBoard || {}), enabled: true, title: e.target.value } }))}
                      aria-label={tr('directions.choice_board_title_aria', 'Activity choice board title')}
                      placeholder={boardTitleDefault}
                      className="w-full text-xs border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
                    />
                    <textarea
                      value={mbDirectionsDraft.choiceBoard.prompt || ''}
                      onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), choiceBoard: { ...(p?.choiceBoard || {}), enabled: true, prompt: e.target.value } }))}
                      aria-label={tr('directions.choice_board_prompt_aria', 'Activity choice board instructions')}
                      placeholder={boardPromptDefault}
                      rows={2}
                      className="w-full text-xs border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
                    />
                    <div role="group" aria-label={tr('directions.choice_board_activities_group', 'Activities to include in the choice board')} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {_alloDirectionsGoalResources.map(it => {
                        const choices = Array.isArray(mbDirectionsDraft.choiceBoard.choices) ? mbDirectionsDraft.choiceBoard.choices : [];
                        const included = choices.some(choice => choice.resourceRef === it.id);
                        const full = choices.length >= 6 && !included;
                        const station = _alloStationStyle(it.type);
                        return (
                          <label key={it.id} className={'flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors ' + (included ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300')}>
                            <input
                              type="checkbox"
                              checked={included}
                              disabled={full}
                              onChange={() => setMbDirectionsDraft(p => {
                                const next = { ...(p || {}) };
                                const board = { ...(next.choiceBoard || {}), enabled: true };
                                const current = Array.isArray(board.choices) ? board.choices : [];
                                board.choices = current.some(choice => choice.resourceRef === it.id)
                                  ? current.filter(choice => choice.resourceRef !== it.id)
                                  : current.length >= 6
                                    ? current
                                    : [...current, { resourceRef: it.id, label: it.title || station.label, icon: station.icon || '', description: '' }];
                                next.choiceBoard = board;
                                return next;
                              })}
                              aria-label={tr('directions.choice_board_include_aria', 'Include {title} in activity choice board', { title: it.title || station.label })}
                              className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 truncate">{station.icon || '•'} {it.title || station.label}</span>
                              <span className="block text-xs text-slate-600">{station.label}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-xs text-slate-600">{tr('directions.choice_board_range_hint', 'Choose 2–6 activities. Students can return to the directions page and choose another card later.')}</p>
                      <button
                        type="button"
                        onClick={() => setShowDirectionsChoicePreview(true)}
                        disabled={!_mbDirectionsChoiceReady}
                        aria-label={tr('directions.choice_board_preview_aria', 'Preview student choice board')}
                        className={'min-h-11 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors motion-reduce:transition-none ' + (_mbDirectionsChoiceReady ? 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600')}
                      >
                        {tr('directions.choice_board_preview_btn', 'Preview student board')}
                      </button>
                    </div>
                    {_mbDirectionsChoiceStaleCount > 0 && (() => {
                      const availableChoiceIds = new Set(_alloDirectionsGoalResources.map(it => it.id));
                      const staleChoices = (Array.isArray(mbDirectionsDraft?.choiceBoard?.choices) ? mbDirectionsDraft.choiceBoard.choices : [])
                        .filter(choice => !availableChoiceIds.has(choice.resourceRef));
                      const removeStaleChoice = (refId) => setMbDirectionsDraft(p => ({
                        ...(p || {}),
                        choiceBoard: {
                          ...(p?.choiceBoard || {}),
                          enabled: true,
                          choices: (Array.isArray(p?.choiceBoard?.choices) ? p.choiceBoard.choices : []).filter(item => item.resourceRef !== refId)
                        }
                      }));
                      const removeAllStaleChoices = () => setMbDirectionsDraft(p => ({
                        ...(p || {}),
                        choiceBoard: {
                          ...(p?.choiceBoard || {}),
                          enabled: true,
                          choices: (Array.isArray(p?.choiceBoard?.choices) ? p.choiceBoard.choices : []).filter(item => availableChoiceIds.has(item.resourceRef))
                        }
                      }));
                      return (
                        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-2 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold text-rose-800">{_mbDirectionsChoiceStaleCount === 1
                              ? tr('directions.choice_board_stale_one', '1 selected activity is no longer available in this pack. Remove it before saving.')
                              : tr('directions.choice_board_stale_many', '{n} selected activities are no longer available in this pack. Remove them before saving.', { n: _mbDirectionsChoiceStaleCount })}</p>
                            <button
                              type="button"
                              data-remove-all-stale-choices
                              onClick={removeAllStaleChoices}
                              className="min-h-11 rounded-lg border border-rose-400 bg-white px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                            >
                              {tr('directions.choice_board_remove_all_stale', 'Remove unavailable')}
                            </button>
                          </div>
                          {staleChoices.length > 0 && (
                            <ul className="space-y-1">
                              {staleChoices.map(choice => (
                                <li key={'stale-' + choice.resourceRef} className="flex items-center justify-between gap-2 rounded border border-rose-200 bg-white px-2 py-1 text-xs text-rose-900">
                                  <span className="truncate font-semibold">{choice.label || choice.resourceRef}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeStaleChoice(choice.resourceRef)}
                                    aria-label={tr('directions.choice_board_remove_stale_aria', 'Remove unavailable activity {label}', { label: choice.label || choice.resourceRef })}
                                    className="min-h-11 shrink-0 rounded border border-rose-300 px-2 py-0.5 font-bold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                                  >
                                    {tr('common.remove', 'Remove')}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                    {_mbDirectionsChoiceDraftChoices.length === 1 && _mbDirectionsChoiceStaleCount === 0 && (
                      <p role="alert" className="text-xs font-bold text-amber-700">{tr('directions.choice_board_need_one_more', 'Select one more activity to enable the choice board.')}</p>
                    )}
                    {_mbDirectionsChoiceDraftChoices.length === 0 && _alloDirectionsGoalResources.length > 0 && (
                      <p role="status" className="text-xs text-slate-600">{tr('directions.choice_board_need_two', 'Select at least two activities to preview or save this board.')}</p>
                    )}
                    {_mbDirectionsChoiceDraftChoices.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-bold text-slate-700">{tr('directions.choice_board_descriptions', 'Optional card descriptions')}</p>
                        {_mbDirectionsChoiceDraftChoices.map(choice => (
                          <input
                            key={'description-' + choice.resourceRef}
                            value={choice.description || ''}
                            onChange={e => setMbDirectionsDraft(p => ({
                              ...(p || {}),
                              choiceBoard: {
                                ...(p?.choiceBoard || {}),
                                enabled: true,
                                choices: (Array.isArray(p?.choiceBoard?.choices) ? p.choiceBoard.choices : []).map(item => item.resourceRef === choice.resourceRef ? { ...item, description: e.target.value } : item)
                              }
                            }))}
                            aria-label={tr('directions.choice_board_desc_aria', 'Description for {label}', { label: choice.label })}
                            placeholder={tr('directions.choice_board_desc_placeholder', 'Optional: what students will do here')}
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800"
                          />
                        ))}
                      </div>
                    )}
                    {showDirectionsChoicePreview && (
                      <div role="presentation" className="fixed inset-0 z-[410] flex items-center justify-center bg-black/50 p-4"
                        onMouseDown={e => { previewBackdropDownRef.current = (e.target === e.currentTarget); }}
                        onClick={e => { const allow = previewBackdropDownRef.current !== false; previewBackdropDownRef.current = null; if (e.target === e.currentTarget && allow) setShowDirectionsChoicePreview(false); }}
                        onKeyDown={e => { if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return; const stack = typeof window !== 'undefined' ? window.__alloFocusTrapStack : null; if (Array.isArray(stack) && stack.length > 0 && previewDialogRef.current && stack[stack.length - 1]?.root !== previewDialogRef.current) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowDirectionsChoicePreview(false); } }}>
                        <div ref={previewDialogRef} tabIndex={-1} data-directions-composer="true" role="dialog" aria-modal="true" aria-labelledby="directions-choice-preview-title" className="allo-docsuite max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                          <div className="mb-3 flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{tr('directions.student_preview_badge', 'Student preview')}</p>
                              <h3 id="directions-choice-preview-title" className="text-base font-black text-slate-900">{mbDirectionsDraft.choiceBoard.title || boardTitleDefault}</h3>
                              <p className="mt-1 text-xs text-slate-600">{mbDirectionsDraft.choiceBoard.prompt || boardPromptDefault}</p>
                            </div>
                            <button type="button" onClick={() => setShowDirectionsChoicePreview(false)} aria-label={tr('directions.close_preview_aria', 'Close student choice board preview')} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100"><X size={16} aria-hidden="true" /></button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {safeChoicePreviewItems.map(({ choice, resource }) => {
                              const station = _alloStationStyle(resource.type) || { icon: '•', label: '' };
                              return (
                                <article key={'preview-' + choice.resourceRef} className="flex min-h-24 items-start gap-3 rounded-xl border-2 border-indigo-100 bg-white p-3 shadow-sm">
                                  <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm">{choice.icon || station.icon || '•'}</span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-black text-slate-800">{choice.label}</span>
                                    <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-indigo-700">{station.label}</span>
                                    {choice.description && <span className="mt-1 block text-xs leading-5 text-slate-600">{choice.description}</span>}
                                    <span className="mt-2 block text-xs font-bold text-indigo-700">{tr('directions.open_activity', 'Open activity')} <ArrowRight size={12} className="inline" aria-hidden="true" /></span>
                                  </span>
                                </article>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-xs text-slate-600">{tr('directions.preview_footer_note', 'This preview shows the cards students will see on the directions page.')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 pt-2">
                <p className="text-xs font-bold text-slate-600 mb-1">{t('directions.objectives') || 'Goals (auto-check where possible)'}</p>
                {(mbDirectionsDraft?.objectives || []).map((o, oi) => {
                  if (!o || typeof o !== 'object') return null;
                  const xpRaw = Object.prototype.hasOwnProperty.call(numDrafts, o.id + ':xp') ? numDrafts[o.id + ':xp'] : null;
                  const xpNum = xpRaw === null ? null : Number(xpRaw);
                  const xpInvalid = o.kind === 'xp' && xpRaw !== null && xpRaw !== '' && (!Number.isFinite(xpNum) || xpNum < 1 || xpNum > 1000);
                  const timeRaw = Object.prototype.hasOwnProperty.call(numDrafts, o.id + ':time') ? numDrafts[o.id + ':time'] : null;
                  const timeNum = timeRaw === null ? null : Number(timeRaw);
                  const timeInvalid = o.kind === 'time' && timeRaw !== null && timeRaw !== '' && (!Number.isFinite(timeNum) || timeNum < 1 || timeNum > 240);
                  return (
                  <div key={o.id} className="mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={'text-xs font-bold uppercase rounded px-1 py-0.5 flex-shrink-0 ' + (o.kind === 'xp' ? 'bg-indigo-50 text-indigo-700' : (o.kind === 'game' ? 'bg-emerald-50 text-emerald-700' : (o.kind === 'manual' ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-700')))}>{o.kind === 'manual' ? (t('directions.kind_manual') || 'self-check') : (o.kind === 'visited' ? (t('directions.kind_visited') || 'opened') : (o.kind === 'responded' ? (t('directions.kind_responded') || 'answered') : (o.kind === 'completed' ? (t('directions.kind_completed') || 'finished') : (o.kind === 'time' ? (t('directions.kind_time') || 'time') : o.kind))))}</span>
                    <input value={o.label} onChange={e => setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; list[oi] = { ...list[oi], label: e.target.value }; return { ...(p || {}), objectives: list }; })} aria-label={t('directions.objective_label') || 'Goal label'} className="flex-1 min-w-0 min-h-6 text-xs border border-slate-300 rounded p-1 bg-white text-slate-800" />
                    {o.kind === 'xp' && <input type="number" min="1" max="1000" aria-invalid={xpInvalid ? 'true' : undefined} aria-describedby={xpInvalid ? `dir-xp-err-${o.id}` : undefined} value={xpRaw !== null ? xpRaw : (o.amount ?? 25)} onChange={e => {
                      const raw = e.target.value;
                      const key = o.id + ':xp';
                      setNumDrafts(prev => ({ ...prev, [key]: raw }));
                      const parsed = Number(raw);
                      if (raw !== '' && Number.isFinite(parsed) && parsed >= 1 && parsed <= 1000) {
                        setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; if (list[oi]) list[oi] = { ...list[oi], amount: Math.round(parsed) }; return { ...(p || {}), objectives: list }; });
                      }
                    }} onBlur={e => {
                      const raw = e.target.value;
                      const key = o.id + ':xp';
                      const parsed = Number(raw);
                      const amt = raw === '' ? (o.amount || 25) : Math.max(1, Math.min(1000, Number.isFinite(parsed) ? Math.round(parsed) : 1));
                      setNumDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
                      setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; if (list[oi]) list[oi] = { ...list[oi], amount: amt }; return { ...(p || {}), objectives: list }; });
                    }} aria-label={t('directions.xp_amount') || 'XP amount'} className={'w-16 min-h-6 text-xs border rounded p-1 bg-white text-slate-800 flex-shrink-0 ' + (xpInvalid ? 'border-rose-600' : 'border-slate-300')} />}
                    {o.kind === 'time' && <input type="number" min="1" max="240" aria-invalid={timeInvalid ? 'true' : undefined} aria-describedby={timeInvalid ? `dir-time-err-${o.id}` : undefined} value={timeRaw !== null ? timeRaw : (o.minutes ?? 10)} onChange={e => {
                      const raw = e.target.value;
                      const key = o.id + ':time';
                      setNumDrafts(prev => ({ ...prev, [key]: raw }));
                      const parsed = Number(raw);
                      if (raw !== '' && Number.isFinite(parsed) && parsed >= 1 && parsed <= 240) {
                        setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; if (list[oi]) list[oi] = { ...list[oi], minutes: Math.round(parsed) }; return { ...(p || {}), objectives: list }; });
                      }
                    }} onBlur={e => {
                      const raw = e.target.value;
                      const key = o.id + ':time';
                      const parsed = Number(raw);
                      const mins = raw === '' ? (o.minutes || 10) : Math.max(1, Math.min(240, Number.isFinite(parsed) ? Math.round(parsed) : 1));
                      setNumDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
                      setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; if (list[oi]) list[oi] = { ...list[oi], minutes: mins }; return { ...(p || {}), objectives: list }; });
                    }} aria-label={t('directions.time_minutes') || 'Minutes'} className={'w-16 min-h-6 text-xs border rounded p-1 bg-white text-slate-800 flex-shrink-0 ' + (timeInvalid ? 'border-rose-600' : 'border-slate-300')} />}
                    <button type="button" onClick={() => setMbDirectionsDraft(p => ({ ...(p || {}), objectives: ((p && p.objectives) || []).filter(x => x.id !== o.id) }))} aria-label={t('directions.remove_objective') || 'Remove goal'} className="min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-rose-600 p-0.5 flex-shrink-0"><X size={12} aria-hidden="true" /></button>
                  </div>
                  {xpInvalid && <p id={`dir-xp-err-${o.id}`} role="alert" className="mt-0.5 text-xs font-bold text-rose-700">{t('directions.xp_range_error') || 'Enter XP between 1 and 1000.'}</p>}
                  {timeInvalid && <p id={`dir-time-err-${o.id}`} role="alert" className="mt-0.5 text-xs font-bold text-rose-700">{t('directions.time_range_error') || 'Enter minutes between 1 and 240.'}</p>}
                  </div>
                  );
                })}
                {/* Write-your-own comes FIRST: most goals a teacher actually wants
                    ("explain it in your own words") can never be auto-checked, and
                    burying that behind a row of game chips taught the opposite. */}
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    value={mbDirectionsGoalText}
                    onChange={e => setMbDirectionsGoalText(e.target.value)}
                    onKeyDown={e => {
                      if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229 || e.altKey || e.ctrlKey || e.metaKey) return;
                      if (e.key !== 'Enter' || !mbDirectionsGoalText.trim()) return;
                      e.preventDefault();
                      setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), { id: generateUUID(), kind: 'manual', label: mbDirectionsGoalText.trim() }] }));
                      setMbDirectionsGoalText('');
                    }}
                    placeholder={t('directions.goal_write_placeholder') || 'Write a goal in your own words…'}
                    aria-label={t('directions.goal_write_label') || 'Write a goal'}
                    className="flex-1 min-w-0 text-xs border border-slate-300 rounded p-1.5 bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!mbDirectionsGoalText.trim()) return;
                      setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), { id: generateUUID(), kind: 'manual', label: mbDirectionsGoalText.trim() }] }));
                      setMbDirectionsGoalText('');
                    }}
                    disabled={!mbDirectionsGoalText.trim()}
                    className="min-h-11 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:border-slate-400 rounded px-2 py-1 transition-all motion-reduce:transition-none disabled:opacity-40 flex-shrink-0"
                  >+ {t('directions.goal_add') || 'Add'}</button>
                </div>
                {/* Auto-checking goals are DERIVED from the resource, never a fixed
                    chip row. A fixed row is how "+ Word Scramble" survived for weeks
                    pointing at a game that never reported a completion. */}
                <div className="mt-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="dir-goal-res">{t('directions.goal_attach') || 'Auto-check against a resource'}</label>
                  <select
                    id="dir-goal-res"
                    value={mbDirectionsGoalRes}
                    onChange={e => setMbDirectionsGoalRes(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white text-slate-800"
                  >
                    <option value="">{safeGoalResources.length ? (t('directions.goal_pick_resource') || 'Pick something in this pack…') : (t('directions.goal_no_resources') || 'No pack resources yet')}</option>
                    {safeGoalResources.map(it => (
                      <option key={it.id} value={it.id}>{((_alloStationStyle(it.type) || {}).icon || '') + ' ' + (it.title || it.type)}</option>
                    ))}
                  </select>
                  {mbDirectionsGoalRes && (() => {
                    const _res = safeGoalResources.find(it => it.id === mbDirectionsGoalRes);
                    const _opts = Array.isArray(_alloGoalOptionsForResource(_res)) ? _alloGoalOptionsForResource(_res) : [];
                    if (!_opts.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {_opts.map(opt => (
                          <button
                            type="button"
                            key={opt.kind + ':' + (opt.gameType || '')}
                            onClick={() => setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), {
                              id: generateUUID(),
                              kind: opt.kind,
                              label: (() => { const localized = typeof t === 'function' ? t(opt.labelKey, { title: (_res && _res.title) || '' }) : ''; return localized && localized !== opt.labelKey ? localized : opt.label; })(),
                              ...(opt.gameType ? { gameType: opt.gameType } : {}),
                              ...(opt.minutes ? { minutes: opt.minutes } : {}),
                              ...(opt.kind === 'manual' ? {} : { resourceRef: mbDirectionsGoalRes })
                            }] }))}
                            className={'min-h-11 inline-flex items-center text-xs font-bold rounded-full px-2 py-0.5 border transition-all motion-reduce:transition-none ' + (opt.kind === 'game' ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400' : (opt.kind === 'manual' ? 'text-slate-600 bg-slate-50 border-slate-200 hover:border-slate-400' : 'text-sky-700 bg-sky-50 border-sky-200 hover:border-sky-400'))}
                          >+ {opt.label}</button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button type="button" onClick={() => setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), { id: generateUUID(), kind: 'xp', amount: 25, label: tr('directions.earn_xp_default', 'Earn {n} XP', { n: 25 }) }] }))} className="min-h-11 inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-full px-2 py-0.5 transition-all motion-reduce:transition-none">{tr('directions.add_xp_btn', '+ XP')}</button>
                </div>
                <p className="text-xs text-slate-600 mt-1">{t('directions.objectives_note') || "Goals check off on the student's device — a formative guide, not a grade, and nothing is ever locked."}</p>
                {(mbDirectionsDraft?.objectives || []).length > 0 && (
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer select-none">
                    <input type="checkbox" checked={mbDirectionsDraft?.softGate === true} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), softGate: e.target.checked }))} className="w-3.5 h-3.5 accent-amber-600" />
                    <span className="text-xs text-slate-600">{t('directions.soft_gate_label') || 'Gently suggest finishing goals before the rest of the pack (a friendly tip — never a lock)'}</span>
                  </label>
                )}
              </div>
              <button type="button" data-help-key="directions_draft" onClick={deriveDirectionsDraft} disabled={directionsDeriving || !!draftAiDoor?.disabled} title={draftAiDoor?.title || undefined} className="min-h-11 w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-2 transition-all motion-reduce:transition-none disabled:opacity-60">
                <Sparkles size={13} /> {directionsDeriving ? (t('directions.drafting') || 'Drafting…') : (t('directions.draft_for_me') || 'Draft for me (from lesson plan + pack)')}
              </button>
            </div>
            <div className="pt-3 shrink-0 bg-white">
              <div className="flex gap-2">
                <button type="button" data-help-key="directions_add_pack" onClick={addDirectionsToPack} className="min-h-11 flex-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all motion-reduce:transition-none">{t('directions.add') || 'Add to pack'}</button>
                <button type="button" onClick={() => setShowDirectionsComposer(false)} className="min-h-11 text-xs text-slate-600 hover:text-slate-700 border border-slate-200 rounded-lg px-3 transition-all motion-reduce:transition-none">{t('common.cancel') || 'Cancel'}</button>
              </div>
              <p className="text-xs text-slate-600 text-center">{t('directions.review_note') || 'AI drafts are a starting point — review before adding. You know your students; the AI does not.'}</p>
            </div>
          </div>
        </div>
  );
}

function _ensureDirectionsComposerA11yCss() {
  if (typeof document === 'undefined' || !document.head || typeof document.getElementById !== 'function' || typeof document.createElement !== 'function') return;
  if (document.getElementById('allo-directions-composer-a11y-css')) return;
  const st = document.createElement('style');
  st.id = 'allo-directions-composer-a11y-css';
  st.textContent =
    '[data-directions-composer="true"] button,[data-directions-composer="true"] a,[data-directions-composer="true"] input,[data-directions-composer="true"] select,[data-directions-composer="true"] textarea,[data-directions-composer="true"] summary{touch-action:manipulation;}' +
    '[data-directions-composer="true"] button:focus-visible,[data-directions-composer="true"] a:focus-visible,[data-directions-composer="true"] input:focus-visible,[data-directions-composer="true"] select:focus-visible,[data-directions-composer="true"] textarea:focus-visible,[data-directions-composer="true"] summary:focus-visible{outline:2px solid #4f46e5;outline-offset:2px;}' +
    '@media (forced-colors: active){[data-directions-composer="true"] button:focus-visible,[data-directions-composer="true"] a:focus-visible,[data-directions-composer="true"] input:focus-visible,[data-directions-composer="true"] select:focus-visible,[data-directions-composer="true"] textarea:focus-visible,[data-directions-composer="true"] summary:focus-visible{outline:2px solid Highlight;outline-offset:2px;}}' +
    '@media (prefers-reduced-motion: reduce){[data-directions-composer="true"],[data-directions-composer="true"] *,[data-directions-composer="true"] *::before,[data-directions-composer="true"] *::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;scroll-behavior:auto !important;}}';
  document.head.appendChild(st);
}
