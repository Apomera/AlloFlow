var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
    };
  };
  var Filter = _lazyIcon('Filter');
  var Gamepad2 = _lazyIcon('Gamepad2');
  function _conceptSortText(t, key, fallback) {
    const value = typeof t === 'function' ? t(key) : '';
    return typeof value === 'string' && value.trim() && value !== key ? value : fallback;
  }
  // Review thumbnail sits beside the card text: announce only the reviewed description
  // of THIS picture (hash matches AltText.hashImage); decorative/stale/missing -> silent.
  function _conceptSortImageAlt(item) {
    if (!item || item.imageDecorative === true || typeof item.imageAlt !== 'string') return '';
    const image = typeof item.image === 'string' ? item.image : '', alt = item.imageAlt.trim();
    if (item.imageAltHash) {
      let h = 0x811c9dc5;
      const mix = c => { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; };
      String(image.length).split('').forEach(ch => mix(ch.charCodeAt(0)));
      const step = Math.max(1, Math.floor(image.length / 4096));
      for (let i = 0; i < image.length; i += step) mix(image.charCodeAt(i));
      if (item.imageAltHash !== 'img-' + image.length.toString(36) + '-' + h.toString(16).padStart(8, '0')) return '';
    }
    return alt && alt !== String(item.content || '').trim() ? alt : '';
  }
  function ConceptSortTextEditor({ value, label, onChange, onSave, onCancel, t }) {
    const finished = React.useRef(false), composing = React.useRef(false);
    const save = restoreFocus => {
      if (finished.current || composing.current) return;
      finished.current = true;
      onSave(value, restoreFocus);
    };
    const cancel = () => {
      if (finished.current) return;
      finished.current = true;
      onCancel();
    };
    const saveText = _conceptSortText(t, 'common.save', 'Save');
    const cancelText = _conceptSortText(t, 'common.cancel', 'Cancel');
    return <div data-concept-sort-editor style={{flex:'1 1 100%',minWidth:0}} onBlur={event => {
      if (event.currentTarget.isConnected && !event.currentTarget.contains(event.relatedTarget)) save(false);
    }}>
      <input type="text" autoFocus value={value} aria-label={label} aria-keyshortcuts="Enter Escape"
        onChange={event => onChange(event.target.value)}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (composing.current || event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter') { event.preventDefault(); save(true); }
          else if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        }}
        className="w-full min-w-0 rounded border border-amber-400 bg-white px-3 py-2 text-sm text-slate-900" style={{minHeight:44}} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => save(true)} aria-label={saveText + ': ' + label} className="rounded bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800" style={{minHeight:44}}>{saveText}</button>
        <button type="button" onClick={cancel} aria-label={cancelText + ': ' + label} className="rounded border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50" style={{minHeight:44}}>{cancelText}</button>
      </div>
    </div>;
  }
  function ConceptSortView(props) {
    var t = props.t;
    var isTeacherMode = props.isTeacherMode;
    var isIndependentMode = props.isIndependentMode;
    var generatedContent = props.generatedContent;
    var conceptSortImageScale = props.conceptSortImageScale || 2.0;
    var csEdit = props.csEdit;
    var csAddingCatId = props.csAddingCatId;
    var csAddingText = props.csAddingText;
    var csBusyId = props.csBusyId;
    var isConceptSortGame = props.isConceptSortGame;
    var _reasoningOpenState = React.useState(false);
    var reasoningOpen = _reasoningOpenState[0], setReasoningOpen = _reasoningOpenState[1];
    var _localReasoningState = React.useState('');
    var _reviewFilterState = React.useState('');
    var reviewFilter = _reviewFilterState[0], setReviewFilter = _reviewFilterState[1];
    var csResId = generatedContent && generatedContent.id;
    React.useEffect(function () {
      setReviewFilter('');
    }, [csResId]);
    var speakConceptSortText = function (raw) {
      var clean = String(raw || '').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      try {
        if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
          window.AlloSpeechPlayer.speak(clean);
        } else if (typeof window !== 'undefined' && typeof window.callTTS === 'function') {
          window.callTTS(clean);
        } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(clean));
        }
      } catch (_) {}
    };
    var studentReasoning = (props.studentResponses && csResId != null && typeof props.studentResponses[csResId]?.reasoning === 'string')
      ? props.studentResponses[csResId].reasoning
      : _localReasoningState[0];
    var updateStudentReasoning = function (val) {
      var nextVal = String(val || '').slice(0, 2000);
      _localReasoningState[1](nextVal);
      if (typeof props.handleStudentInput === 'function' && csResId != null) {
        props.handleStudentInput(csResId, 'reasoning', nextVal);
      }
    };
    var setConceptSortImageScale = props.setConceptSortImageScale;
    var setCsEdit = props.setCsEdit;
    var setCsAddingCatId = props.setCsAddingCatId;
    var setCsAddingText = props.setCsAddingText;
    var handleSetIsConceptSortGameToTrue = props.handleSetIsConceptSortGameToTrue;
    var csUpdateCategoryLabel = props.csUpdateCategoryLabel;
    var csUpdateItemText = props.csUpdateItemText;
    const editButtons = React.useRef(new Map()), editFocusTicket = React.useRef(0);
    const editKey = (kind, id) => JSON.stringify([generatedContent?.id, kind, id]);
    const editButtonRef = (kind, id) => element => {
      const key = editKey(kind, id);
      if (element) editButtons.current.set(key, element); else editButtons.current.delete(key);
    };
    const beginEdit = (kind, id, text) => {
      editFocusTicket.current++;
      setCsEdit({kind, id, text});
    };
    const returnEditFocus = (kind, id) => {
      const key = editKey(kind, id), ticket = ++editFocusTicket.current;
      requestAnimationFrame(() => {
        const button = editButtons.current.get(key), active = document.activeElement;
        if (ticket === editFocusTicket.current && button?.isConnected && (!active || active === document.body || !active.isConnected)) button.focus();
      });
    };
    const finishEdit = (kind, id, text, save, restore) => {
      if (save) (kind === 'category' ? csUpdateCategoryLabel : csUpdateItemText)(id, text);
      setCsEdit(null);
      if (restore) returnEditFocus(kind, id);
    };
    var csMoveItem = props.csMoveItem;
    var csRegenerateItem = props.csRegenerateItem;
    var csRegenerateItemImage = props.csRegenerateItemImage;
    var csUploadItemImage = props.csUploadItemImage;
    var csClearItemImage = props.csClearItemImage;
    var csDeleteItem = props.csDeleteItem;
    var csAddItem = props.csAddItem;
var csAddCategory = props.csAddCategory;
var csDeleteCategory = props.csDeleteCategory;
var csAddItemManual = props.csAddItemManual;
// With no AI connected, a typed card is added exactly as written instead of through the AI.
var csAiTextOn = function () { try { var resolve = window.__alloResolveAiCapability; return typeof resolve === 'function' ? !!resolve().text : true; } catch (_) { return true; } };
var csAddTyped = function (catId, text, categories) {
  if (!csAiTextOn() && typeof csAddItemManual === 'function') {
    csAddItemManual(catId, text);
    props.setCsAddingCatId(null);
    props.setCsAddingText('');
    return;
  }
  csAddItem(catId, text, categories);
};
    // Image refinement (image-to-image edit) — mirrors glossary refine pattern.
    var csRefineItemImage = props.csRefineItemImage;
    var csRefinementInputs = props.csRefinementInputs || {};
    var setCsRefinementInputs = props.setCsRefinementInputs || function () {};
    var conceptSortAutoRemoveWords = props.conceptSortAutoRemoveWords;
    var setConceptSortAutoRemoveWords = props.setConceptSortAutoRemoveWords || function () {};
    var closeConceptSort = props.closeConceptSort;
    var handleGenerateConceptItem = props.handleGenerateConceptItem;
    var handleGameScoreUpdate = props.handleGameScoreUpdate;
    var handleGameCompletion = props.handleGameCompletion;
    var handleExplainConceptSortItem = props.handleExplainConceptSortItem;
    var playSound = props.playSound;
    var ErrorBoundary = props.ErrorBoundary;
    var ConceptSortGame = props.ConceptSortGame;
    // Cards whose categoryId names no category are invisible in the category
    // lists and left out of play; list them in their own group to be assigned.
    var reviewCategories = (generatedContent && generatedContent.data && generatedContent.data.categories) || [];
    var reviewItems = (generatedContent && generatedContent.data && generatedContent.data.items) || [];
    var orphanItems = reviewItems.filter(function (it) { return it && !reviewCategories.some(function (c) { return String(c.id) === String(it.categoryId); }); });
    var reviewGroups = orphanItems.length ? reviewCategories.concat([{ id: '__uncategorized', label: t('concept_sort.uncategorized_group') || 'Uncategorized: fix before students play', __orphans: true }]) : reviewCategories;
    var csAiDoor = function (kind) { try { return typeof window !== 'undefined' && typeof window.__alloAiSetupDoorway === 'function' ? window.__alloAiSetupDoorway(kind, t) : null; } catch (_) { return null; } };
    var csTextDoor = csAiDoor('text');
    var csImgDoor = csAiDoor('images');
    var csEditDoor = csAiDoor('imageEdit');
    var csAnyAiDoorDisabled = !!(csTextDoor?.disabled || csImgDoor?.disabled || csEditDoor?.disabled);
    var bionicOn = (typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function') ? window.__alloUseBionic() : false;
    var bt = function (s) { return (bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function') ? window.__alloBionicReact(s) : s; };
    var playableConceptSortData = React.useMemo(function () {
      var raw = generatedContent && generatedContent.data;
      if (!raw || typeof raw !== 'object') return raw;
      if (isTeacherMode && !isIndependentMode) return raw;
      var cats = Array.isArray(raw.categories)
        ? raw.categories.filter(function (c) { return c && c.isSelected !== false && c.selected !== false; })
        : raw.categories;
      var allowedCatIds = Array.isArray(cats) ? new Set(cats.map(function (c) { return String(c.id); })) : null;
      var items = Array.isArray(raw.items)
        ? raw.items.filter(function (it) {
            if (!it || it.isSelected === false || it.selected === false) return false;
            return !allowedCatIds || allowedCatIds.has(String(it.categoryId));
          })
        : raw.items;
      return (cats === raw.categories && items === raw.items) ? raw : Object.assign({}, raw, { categories: cats, items: items });
    }, [generatedContent && generatedContent.data, isTeacherMode, isIndependentMode]);
    var playableCats = Array.isArray(playableConceptSortData?.categories) ? playableConceptSortData.categories : [];
    var playableItems = Array.isArray(playableConceptSortData?.items) ? playableConceptSortData.items : [];
    var reviewQuery = String(reviewFilter || '').trim().toLowerCase();
    var filteredReviewItemCount = reviewQuery ? reviewItems.filter(function (it) {
      if (!it) return false;
      var cat = reviewCategories.find(function (c) { return String(c.id) === String(it.categoryId); });
      return (String(it.content || '') + ' ' + String(cat?.label || '')).toLowerCase().indexOf(reviewQuery) !== -1;
    }).length : reviewItems.length;
    return<div className="space-y-6 h-full flex flex-col" data-help-key="concept_sort_panel"><style>{'[data-concept-sort-editor] :focus-visible,[data-concept-sort-action]:focus-visible,[data-concept-sort-edit]:focus-visible{outline:3px solid #4338ca;outline-offset:2px}@media(forced-colors:active){[data-concept-sort-editor] :focus-visible,[data-concept-sort-action]:focus-visible,[data-concept-sort-edit]:focus-visible{outline-color:Highlight}}'}</style>{isTeacherMode && !isIndependentMode && <div data-concept-sort-teacher-bar className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6 flex justify-between items-center flex-wrap gap-4"><div className="text-sm text-indigo-800"><strong>{t('simplified.udl_goal').split(':')[0]}:</strong> {t('concept_sort.udl_goal_desc')}</div><button type="button" onClick={handleSetIsConceptSortGameToTrue} data-help-key="concept_sort_start_button" className="min-h-11 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all motion-reduce:transition-none shadow-sm"><Filter size={14} /> {isTeacherMode && !isIndependentMode ? t('concept_sort.preview') : t('concept_sort.start')}</button>{csAnyAiDoorDisabled && typeof window !== 'undefined' && typeof window.AlloAiSetupNotice === 'function' && <div className="w-full"><window.AlloAiSetupNotice t={t} kind={csImgDoor?.disabled ? 'images' : csEditDoor?.disabled ? 'imageEdit' : 'text'} /></div>}</div>}{!isTeacherMode || isIndependentMode ? <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center animate-in motion-reduce:animate-none fade-in zoom-in duration-300 my-auto space-y-5"><div className="bg-indigo-100 p-4 rounded-full"><Filter size={48} className="text-indigo-500" /></div><h3 className="text-xl font-black text-slate-700">{t('concept_sort.ready_title')}</h3><p className="text-slate-600 max-w-md">{bt(t('concept_sort.ready_desc'))}</p>{playableCats.length > 0 && <div data-concept-sort-snapshot className="flex flex-col items-center gap-2 max-w-xl"><span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">{_conceptSortText(t, 'concept_sort.snapshot_counts', '{categories} categories · {items} cards').replace('{categories}', String(playableCats.length)).replace('{items}', String(playableItems.length))}</span><div className="flex flex-wrap items-center justify-center gap-1.5">{playableCats.map(function (c) { return <span key={c.id} className="rounded-full bg-white border border-slate-300 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{bt(c.label)}</span>; })}</div></div>}<div className="flex flex-wrap items-center justify-center gap-3 motion-reduce:animate-none"><button type="button" onClick={handleSetIsConceptSortGameToTrue} data-help-key="concept_sort_start_button" className="min-h-11 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 motion-reduce:hover:scale-100 transition-all motion-reduce:transition-none flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"><Gamepad2 size={24} aria-hidden="true" className="fill-current text-yellow-300" /> {t('concept_sort.start_action')}</button><button type="button" data-concept-sort-listen onClick={function () { var catNames = playableCats.map(function (c) { return c.label; }).filter(Boolean).join(', '); speakConceptSortText([_conceptSortText(t, 'concept_sort.ready_title', 'Ready to sort'), _conceptSortText(t, 'concept_sort.ready_desc', ''), catNames ? _conceptSortText(t, 'concept_sort.categories_prefix', 'Categories') + ': ' + catNames : ''].filter(Boolean).join('. ')); }} className="min-h-11 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-bold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"><span aria-hidden="true">🔊 </span>{_conceptSortText(t, 'concept_sort.listen_instructions', 'Listen')}</button><button type="button" data-concept-sort-reasoning-toggle aria-expanded={reasoningOpen} onClick={() => setReasoningOpen(v => !v)} className="min-h-11 px-4 py-2 rounded-xl border border-indigo-300 bg-white text-indigo-800 text-sm font-bold hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{reasoningOpen ? _conceptSortText(t, 'concept_sort.hide_reasoning', 'Hide reasoning notes') : _conceptSortText(t, 'concept_sort.explain_reasoning', 'Explain your sorting')}</button></div>{reasoningOpen && <div data-concept-sort-reasoning className="w-full max-w-xl text-left bg-white rounded-xl border border-indigo-200 p-4 shadow-sm space-y-2"><label htmlFor="concept-sort-reasoning-input" className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">{_conceptSortText(t, 'concept_sort.reasoning_label', 'Why did you group the cards this way?')}</label><textarea id="concept-sort-reasoning-input" rows={3} maxLength={2000} value={studentReasoning} onChange={e => updateStudentReasoning(e.target.value)} placeholder={_conceptSortText(t, 'concept_sort.reasoning_placeholder', 'Explain a pattern or rule you used to sort the concepts...')} className="w-full text-sm border border-slate-300 rounded-lg p-2.5 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" />{typeof window !== 'undefined' && typeof window.AlloDictationButton === 'function' && React.createElement(window.AlloDictationButton, { t, language: generatedContent?.config?.language, onTranscript: spoken => { var sep = studentReasoning && !/\s$/.test(studentReasoning) ? ' ' : ''; updateStudentReasoning(studentReasoning + sep + spoken); } })}</div>}</div> : generatedContent?.data && generatedContent?.data.categories && <div className="space-y-4 overflow-y-auto pr-2"><div className="flex items-center justify-between flex-wrap gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"><div className="min-w-0"><div className="text-sm font-black text-amber-800">📝 {t('concept_sort.review_title') || 'Pre-Activity Review'}</div><div className="text-xs text-amber-800">{t('concept_sort.pre_activity_help') || 'Edit categories and items before students play. AI outputs sometimes need tweaks.'}</div></div><div className="flex items-center gap-3 flex-wrap">{(generatedContent?.data.items || []).some(it => it && it.image) && <div className="flex items-center gap-2 bg-white/80 border border-amber-200 rounded-full px-2 py-1 min-h-11" data-help-key="concept_sort_image_scale"><label htmlFor="concept-sort-image-scale-rv" className="text-xs font-bold text-amber-800 uppercase tracking-wider">{t('concept_sort.image_size_word') || 'Size'}</label><input id="concept-sort-image-scale-rv" type="range" min="0.5" max="3.0" step="0.05" value={conceptSortImageScale} onChange={e => setConceptSortImageScale(parseFloat(e.target.value) || 2.0)} aria-label={(t('concept_sort.image_scale_label') || 'Card image size') + ', ' + conceptSortImageScale.toFixed(2) + ' times'} title={t('concept_sort.image_scale_hint') || 'Scales card visuals in the review panel and during play.'} className="min-h-11 w-24 sm:w-32 accent-amber-600" /><span className="text-xs font-mono text-amber-800 min-w-[2.5em] text-right">{conceptSortImageScale.toFixed(2)}×</span><button type="button" onClick={() => setConceptSortImageScale(2.0)} className="min-h-11 min-w-11 px-2 text-xs text-amber-700 hover:text-amber-900 hover:underline" title={t('concept_sort.image_size_reset_aria') || 'Reset image size to default'} aria-label={t('concept_sort.image_size_reset_aria') || 'Reset image size to default'}>{t('common.reset') || 'Reset'}</button></div>}{typeof setConceptSortAutoRemoveWords === 'function' && <label className="min-h-11 flex items-center gap-1.5 bg-white/80 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer text-xs font-bold text-amber-800 uppercase tracking-wider" title={t('concept_sort.auto_remove_tooltip') || 'Run an image-to-image edit after each generation to remove leftover text/labels'}><input type="checkbox" checked={!!conceptSortAutoRemoveWords} onChange={e => setConceptSortAutoRemoveWords(!!e.target.checked)} className="h-4 w-4 accent-amber-600" aria-label={t('concept_sort.auto_remove_aria') || 'Auto-remove text from generated images'} />{t('concept_sort.auto_remove_label') || 'Auto-remove text'}</label>}<span className="text-xs font-bold text-amber-800 bg-white/80 border border-amber-200 rounded-full px-2 py-0.5">{t('concept_sort.review_counts', { categories: reviewCategories.length, items: reviewItems.length }) || `${reviewCategories.length} categories · ${reviewItems.length} items`}</span></div></div>{reviewItems.length >= 6 && <div className="flex flex-wrap items-center gap-2"><div className="relative flex-1 min-w-[12rem] max-w-sm"><input type="search" data-concept-sort-filter value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} placeholder={_conceptSortText(t, 'concept_sort.filter_placeholder', 'Filter cards or categories...')} aria-label={_conceptSortText(t, 'concept_sort.filter_aria', 'Filter concept sort cards and categories')} className="w-full min-h-11 rounded-full border border-slate-300 bg-white pl-3.5 pr-9 py-1.5 text-xs text-slate-800 placeholder:text-slate-500 focus:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" />{reviewFilter && <button type="button" data-concept-sort-filter-clear onClick={() => setReviewFilter('')} aria-label={_conceptSortText(t, 'common.clear', 'Clear filter')} className="absolute right-1 top-1/2 -translate-y-1/2 min-h-9 min-w-9 inline-flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">✕</button>}</div>{reviewQuery && <span role="status" aria-live="polite" className="text-xs font-semibold text-indigo-800">{_conceptSortText(t, 'concept_sort.filter_count', 'Showing {shown} of {total} cards').replace('{shown}', String(filteredReviewItemCount)).replace('{total}', String(reviewItems.length))}</span>}</div>}{reviewGroups.map(cat => {
          const allCatItems = cat.__orphans ? orphanItems : reviewItems.filter(item => item && String(item.categoryId) === String(cat.id));
          const catMatchesQuery = !reviewQuery || String(cat.label || '').toLowerCase().indexOf(reviewQuery) !== -1;
          const catItems = (reviewQuery && !catMatchesQuery) ? allCatItems.filter(item => String(item.content || '').toLowerCase().indexOf(reviewQuery) !== -1) : allCatItems;
          if (reviewQuery && !catMatchesQuery && catItems.length === 0) return null;
          const isEditingLabel = csEdit && csEdit.kind === 'category' && csEdit.id === cat.id;
          const isAddingHere = csAddingCatId === cat.id;
          const _csToneMap = {
            'bg-indigo-500': 'text-indigo-800 bg-indigo-50',
            'bg-blue-500': 'text-blue-800 bg-blue-50',
            'bg-sky-500': 'text-sky-800 bg-sky-50',
            'bg-cyan-500': 'text-cyan-800 bg-cyan-50',
            'bg-teal-500': 'text-teal-800 bg-teal-50',
            'bg-emerald-500': 'text-emerald-800 bg-emerald-50',
            'bg-green-500': 'text-green-800 bg-green-50',
            'bg-amber-500': 'text-amber-800 bg-amber-50',
            'bg-orange-500': 'text-orange-800 bg-orange-50',
            'bg-rose-500': 'text-rose-800 bg-rose-50',
            'bg-red-500': 'text-red-800 bg-red-50',
            'bg-pink-500': 'text-pink-800 bg-pink-50',
            'bg-purple-500': 'text-purple-800 bg-purple-50',
            'bg-violet-500': 'text-violet-800 bg-violet-50',
            'bg-fuchsia-500': 'text-fuchsia-800 bg-fuchsia-50',
          };
          const colorClass = cat.__orphans ? 'text-rose-800 bg-rose-50' : (_csToneMap[cat.color] || 'text-slate-800 bg-slate-50');
          return <div key={cat.id} data-help-key="concept_sort_category" data-concept-sort-uncategorized={cat.__orphans ? 'true' : undefined} className={`bg-white rounded-xl border-2 ${cat.__orphans ? 'border-rose-300' : 'border-slate-200'} shadow-sm overflow-hidden`}><div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-100 ${colorClass}`}>{cat.__orphans ? <h4 className="flex-1 font-bold text-sm">⚠ {cat.label}</h4> : isEditingLabel ? <ConceptSortTextEditor key={editKey('category', cat.id)} value={csEdit.text} label={_conceptSortText(t, 'a11y.edit_category_name', 'Edit category name') + ': ' + cat.label} t={t} onChange={text => setCsEdit({kind:'category',id:cat.id,text})} onSave={(text, restore) => finishEdit('category',cat.id,text,true,restore)} onCancel={() => finishEdit('category',cat.id,csEdit.text,false,true)} /> : <button type="button" data-concept-sort-edit="category" data-concept-sort-edit-id={cat.id} ref={editButtonRef('category',cat.id)} onClick={() => beginEdit('category',cat.id,cat.label)} className="flex-1 text-left font-bold text-sm hover:underline truncate" style={{minHeight:44,minWidth:0}} title={t('concept_sort.rename_category') || 'Rename category'} aria-label={`${t('concept_sort.rename_category') || 'Rename category'} ${cat.label}`}>{bt(cat.label)}</button>}<span className="text-xs font-bold whitespace-nowrap">{t('concept_sort.item_count', { count: catItems.length }) || `${catItems.length} item(s)`}</span>{!cat.__orphans && <button type="button" onClick={() => {
                setCsAddingCatId(cat.id);
                setCsAddingText('');
              }} className="min-h-11 px-3 py-1 rounded-full bg-white/70 text-xs font-bold hover:bg-white border border-current/20" title={t('concept_sort.add_item_to_category') || 'Add item to this category'} aria-label={`${t('concept_sort.add_item_to') || 'Add item to'} ${cat.label}`} disabled={csBusyId === '__adding__'}>＋ {t('common.add') || 'Add'}</button>}{!cat.__orphans && typeof csDeleteCategory === 'function' && <button type="button" data-help-key="concept_sort_delete_category" onClick={() => csDeleteCategory(cat.id)} className="min-h-11 px-3 py-1 rounded-full bg-white/70 text-xs font-bold hover:bg-white border border-current/20" title={t('concept_sort.delete_category_hint') || 'Delete this category. Its cards move to Uncategorized.'} aria-label={`${t('concept_sort.delete_category') || 'Delete category'} ${cat.label}`}>{t('common.delete') || 'Delete'}</button>}</div><div className="p-2 space-y-1.5 bg-slate-50/50">{cat.__orphans && <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2">{t('concept_sort.uncategorized_help') || 'These cards match no category, so students will not see them. Choose a category for each card.'}</p>}{catItems.length === 0 && !isAddingHere && <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2 text-center">⚠ {t('concept_sort.empty_category_warning') || 'No items in this category. Students will see an empty column.'}</div>}{catItems.map(item => {
                const isEditingItem = csEdit && csEdit.kind === 'item' && csEdit.id === item.id;
                const isBusy = csBusyId === item.id;
                const refineInput = csRefinementInputs[item.id] || '';
                return <div key={item.id} data-help-key="concept_sort_item" className="flex flex-col gap-1 bg-white p-2 rounded-lg border border-slate-400 hover:border-slate-300 transition-colors motion-reduce:transition-none"><div className="flex flex-wrap items-center gap-2">{item.image ? <img src={item.image} alt={_conceptSortImageAlt(item)} className="object-contain rounded shrink-0 bg-white border border-slate-100" loading="lazy" style={{
                      width: Math.round(48 * conceptSortImageScale) + 'px',
                      height: Math.round(48 * conceptSortImageScale) + 'px'
                    }} /> : <div className="rounded bg-slate-100 border border-slate-400 shrink-0 flex items-center justify-center text-slate-600 text-xs" title={t('concept_sort.no_image') || 'No image'} style={{
                      width: Math.round(48 * conceptSortImageScale) + 'px',
                      height: Math.round(48 * conceptSortImageScale) + 'px'
                    }}>—</div>}{isEditingItem ? <ConceptSortTextEditor key={editKey('item', item.id)} value={csEdit.text} label={_conceptSortText(t, 'a11y.edit_item_text', 'Edit item text') + ': ' + item.content} t={t} onChange={text => setCsEdit({kind:'item',id:item.id,text})} onSave={(text, restore) => finishEdit('item',item.id,text,true,restore)} onCancel={() => finishEdit('item',item.id,csEdit.text,false,true)} /> : <button type="button" data-concept-sort-edit="item" data-concept-sort-edit-id={item.id} ref={editButtonRef('item',item.id)} onClick={() => beginEdit('item',item.id,item.content)} className="flex-1 min-w-[120px] min-h-11 break-words text-left text-sm text-slate-700 hover:text-slate-900" title={t('concept_sort.edit_item') || 'Edit item'} aria-label={`${t('concept_sort.edit_item') || 'Edit item'} ${item.content}`}>{bt(item.content)}</button>}<select value={cat.__orphans ? '' : item.categoryId} onChange={e => { if (e.target.value) csMoveItem(item.id, e.target.value); }} data-concept-sort-action style={{minHeight:44}} className={`text-sm bg-white border rounded px-2 py-1 text-slate-700 hover:border-slate-300 max-w-[140px] ${cat.__orphans ? 'border-rose-400' : 'border-slate-400'}`} title={t("a11y.move_item_category")} aria-label={_conceptSortText(t, "a11y.move_item_category", "Move item to a different category") + ": " + item.content} disabled={isBusy}>{cat.__orphans && <option value="" disabled>{t('concept_sort.choose_category') || 'Choose a category'}</option>}{reviewCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><button type="button" onClick={() => csRegenerateItem(item, generatedContent?.data.categories || [])} disabled={isBusy || csBusyId === '__adding__' || !!csTextDoor?.disabled} data-concept-sort-action style={{width:44,height:44,flexShrink:0}} className="rounded text-sm hover:bg-indigo-50 text-indigo-600 disabled:opacity-30 flex items-center justify-center" title={csTextDoor?.title || t("a11y.regenerate_item")} aria-label={_conceptSortText(t, "a11y.regenerate_item", "Regenerate this item — text and image") + ": " + item.content}>{isBusy ? '⏳' : '🔄'}</button><button type="button" onClick={() => csRegenerateItemImage(item)} disabled={isBusy || csBusyId === '__adding__' || !!csImgDoor?.disabled} data-concept-sort-action style={{width:44,height:44,flexShrink:0}} className="rounded text-sm hover:bg-purple-50 text-purple-600 disabled:opacity-30 flex items-center justify-center" title={csImgDoor?.title || t("a11y.regenerate_image")} aria-label={_conceptSortText(t, "a11y.regenerate_image", "Regenerate image only") + ": " + item.content}>{isBusy ? '⏳' : '🖼️'}</button><button type="button" data-concept-sort-upload={item.id} onClick={e => { const input = e.currentTarget.nextElementSibling; if (input && typeof input.click === 'function') input.click(); }} disabled={isBusy || csBusyId === '__adding__'} data-concept-sort-action style={{width:44,height:44,flexShrink:0}} className="rounded text-sm hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 flex items-center justify-center" title={t('concept_sort.upload_image_hint') || 'Upload your own image (max 5 MB)'} aria-label={`${t("a11y.upload_custom_image") || 'Upload custom image'}: ${item.content}`}><span aria-hidden="true">📤</span></button><input type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => {
                        const f = e.target.files && e.target.files[0];
                        if (f) csUploadItemImage(item.id, f);
                        e.target.value = '';
                      }} />{item.image && <button type="button" onClick={() => csClearItemImage(item.id)} disabled={isBusy} data-concept-sort-action style={{width:44,height:44,flexShrink:0}} className="rounded text-sm hover:bg-amber-50 text-amber-600 disabled:opacity-30 flex items-center justify-center" title={t("a11y.clear_image")} aria-label={_conceptSortText(t, "a11y.clear_image", "Clear image") + ": " + item.content}>🚫</button>}{item.image && csRefineItemImage && <button type="button" onClick={() => csRefineItemImage(item.id, "Remove all text, labels, letters, and words from the image. Keep the illustration clean.")} disabled={isBusy || !!csEditDoor?.disabled} data-concept-sort-action style={{width:44,height:44,flexShrink:0}} className="rounded text-sm hover:bg-red-50 text-red-600 disabled:opacity-30 flex items-center justify-center" title={csEditDoor?.title || t("a11y.auto_remove_text")} aria-label={_conceptSortText(t, "a11y.auto_remove_text", "Auto-remove text from image") + ": " + item.content}>🔤⃠</button>}<button type="button" onClick={() => csDeleteItem(item.id)} disabled={isBusy} data-concept-sort-action style={{width:44,height:44,flexShrink:0}} className="rounded text-sm hover:bg-rose-50 text-rose-700 disabled:opacity-30 flex items-center justify-center" title={t("a11y.delete_item")} aria-label={_conceptSortText(t, "a11y.delete_item", "Delete this item") + ": " + item.content}>🗑</button></div>{item.image && csRefineItemImage && <div className="flex items-center gap-1 pl-1 pr-1"><input type="text" value={refineInput} onChange={e => setCsRefinementInputs(prev => Object.assign({}, prev, {
                      [item.id]: e.target.value
                    }))} onKeyDown={e => {
                      if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
                      if (!csEditDoor?.disabled && e.key === 'Enter' && refineInput.trim()) {
                        csRefineItemImage(item.id);
                      }
                    }} placeholder={t("placeholders.edit_image_prompt")} disabled={isBusy || !!csEditDoor?.disabled} title={csEditDoor?.title || undefined} className="min-h-11 flex-1 text-xs bg-white border border-amber-300 rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 focus:ring-2 focus:ring-amber-400 placeholder:text-slate-500" aria-label={`${t('concept_sort.refine_prompt_for') || 'Image edit prompt for'} ${item.content}`} /><button type="button" onClick={() => csRefineItemImage(item.id)} disabled={isBusy || !refineInput.trim() || !!csEditDoor?.disabled} className="min-h-11 px-2 py-1 rounded text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-30" aria-label={`${t('common.send') || 'Send'} — ${_conceptSortText(t, "a11y.apply_edit_prompt", "Apply edit prompt")}: ${item.content}`} data-concept-sort-action style={{minHeight:44}} title={csEditDoor?.title || t("a11y.apply_edit_prompt")}>✏️ {t('common.send') || 'Send'}</button></div>}</div>;
              })}{isAddingHere && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2"><input type="text" autoFocus={true} placeholder={t("placeholders.new_item_example")} value={csAddingText} onChange={e => setCsAddingText(e.target.value)} onKeyDown={e => {
                  if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
                  if (e.key === 'Enter' && csAddingText.trim()) {
                    csAddTyped(cat.id, csAddingText, generatedContent?.data.categories || []);
                  } else if (e.key === 'Escape') {
                    setCsAddingCatId(null);
                    setCsAddingText('');
                  }
                }} className="min-h-11 flex-1 text-xs bg-white border border-emerald-300 rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 focus:ring-2 focus:ring-emerald-400" aria-label={t("a11y.new_item_text")} disabled={csBusyId === '__adding__'} /><button type="button" onClick={() => csAddTyped(cat.id, csAddingText, generatedContent?.data.categories || [])} disabled={!csAddingText.trim() || csBusyId === '__adding__'} className="min-h-11 px-3 py-1 bg-emerald-700 text-white rounded text-xs font-bold disabled:opacity-40 hover:bg-emerald-800">{csBusyId === '__adding__' ? '⏳' : (t('common.add') || 'Add')}</button><button type="button" onClick={() => {
                  setCsAddingCatId(null);
                  setCsAddingText('');
                }} className="min-h-11 px-3 py-1 bg-white text-slate-600 rounded text-xs font-bold border border-slate-400 hover:bg-slate-50">{t('common.cancel') || 'Cancel'}</button></div>}</div></div>;
        })}{typeof csAddCategory === 'function' && (csAddingCatId === '__new_category__' ? <div data-help-key="concept_sort_add_category_row" className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2"><input type="text" autoFocus={true} value={csAddingText} onChange={e => setCsAddingText(e.target.value)} onKeyDown={e => { if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && csAddingText.trim()) { csAddCategory(csAddingText); setCsAddingCatId(null); setCsAddingText(''); } else if (e.key === 'Escape') { setCsAddingCatId(null); setCsAddingText(''); } }} placeholder={t('concept_sort.new_category_placeholder') || 'Category name'} aria-label={t('concept_sort.new_category_label') || 'New category name'} className="min-h-11 flex-1 text-xs bg-white border border-emerald-300 rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 focus:ring-2 focus:ring-emerald-400" /><button type="button" onClick={() => { csAddCategory(csAddingText); setCsAddingCatId(null); setCsAddingText(''); }} disabled={!csAddingText.trim()} className="min-h-11 px-3 py-1 bg-emerald-700 text-white rounded text-xs font-bold disabled:opacity-40 hover:bg-emerald-800">{t('common.add') || 'Add'}</button><button type="button" onClick={() => { setCsAddingCatId(null); setCsAddingText(''); }} className="min-h-11 px-3 py-1 bg-white text-slate-600 rounded text-xs font-bold border border-slate-400 hover:bg-slate-50">{t('common.cancel') || 'Cancel'}</button></div> : <button type="button" data-help-key="concept_sort_add_category" onClick={() => { setCsAddingCatId('__new_category__'); setCsAddingText(''); }} className="w-full min-h-11 rounded-xl border-2 border-dashed border-slate-400 bg-white text-sm font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50">＋ {t('concept_sort.add_category') || 'Add category'}</button>)}</div>}{isConceptSortGame && <ErrorBoundary fallbackMessage={_conceptSortText(t, 'concept_sort.game_error', 'Concept Sort Game encountered an error.')}><ConceptSortGame data={playableConceptSortData} onClose={closeConceptSort} playSound={playSound} onGenerateItem={handleGenerateConceptItem} onScoreUpdate={handleGameScoreUpdate} onGameComplete={handleGameCompletion} onExplainIncorrect={handleExplainConceptSortItem} imageScale={conceptSortImageScale} onImageScaleChange={setConceptSortImageScale} allowAddItems={Boolean(isTeacherMode)} /></ErrorBoundary>}</div>;
  }
