/**
 * AlloFlow — Visual Supports Modal Module
 *
 * Saved symbol boards + visual schedules modal. Pulls from localStorage at
 * render time; no external data source needed.
 *
 * Extracted from AlloFlowANTI.txt lines 23080-23147 (May 2026).
 * Animation-pause controls added 2026-06-01 (WCAG 2.2.2 Pause/Stop/Hide):
 *   - PausableImage helper: per-image ⏸/▶ overlay on animated GIFs
 *   - Modal-level "Pause animations" toggle in the header
 *   - Auto-respects prefers-reduced-motion (paused-by-default if the OS
 *     reports the user prefers reduced motion)
 *   - State persisted to localStorage.alloVsPauseAnim
 */

// PausableImage — drop-in <img> replacement that supports per-image and
// global pause for animated GIFs. Non-GIFs render exactly like a plain <img>.
// To "pause" a GIF we draw the first frame to an offscreen canvas (captured
// on load) and swap that PNG dataURL in as the src; nothing else exists in
// the browser as a reliable way to halt GIF playback.
function PausableImage(props) {
  const { src, alt, style, globalPaused } = props;
  const isAnimated = React.useMemo(function () {
    if (!src) return false;
    if (/^data:image\/gif/i.test(src)) return true;
    if (/\.gif(\?|#|$)/i.test(src)) return true;
    return false;
  }, [src]);
  const [localPaused, setLocalPaused] = React.useState(false);
  const [frozenFrame, setFrozenFrame] = React.useState(null);
  const imgRef = React.useRef(null);
  const captureRef = React.useRef(false);
  const paused = isAnimated && (globalPaused || localPaused);
  const hiddenWhilePaused = paused && !frozenFrame;

  React.useEffect(function () {
    setLocalPaused(false);
    setFrozenFrame(null);
    captureRef.current = false;
  }, [src]);

  // On image load, capture first frame to a canvas so we can pause later.
  // Wrapped in try/catch — canvas drawImage on cross-origin images without
  // CORS headers throws SecurityError; if that happens we silently fall
  // back to "pause button is hidden, GIF keeps playing" rather than crash.
  const handleLoad = React.useCallback(function () {
    if (!isAnimated || captureRef.current || !imgRef.current) return;
    try {
      const img = imgRef.current;
      const w = img.naturalWidth || img.width || 100;
      const h = img.naturalHeight || img.height || 100;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0);
      setFrozenFrame(canvas.toDataURL('image/png'));
      captureRef.current = true;
    } catch (e) { /* CORS or other — leave frozenFrame null */ }
  }, [isAnimated]);

  // Non-GIF: plain <img>, zero overhead, zero overlay.
  if (!isAnimated) {
    return <img src={src} alt={alt} style={style} loading="lazy" decoding="async" />;
  }

  const wrapperStyle = Object.assign(
    { position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    style || {}
  );
  const imgInlineStyle = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };

  return (
    <div style={wrapperStyle}>
      <img
        ref={imgRef}
        src={paused && frozenFrame ? frozenFrame : src}
        alt={alt}
        onLoad={handleLoad}
        crossOrigin={src && src.startsWith('data:') ? undefined : 'anonymous'}
        loading="lazy"
        decoding="async"
        style={Object.assign({}, imgInlineStyle, { visibility: hiddenWhilePaused ? 'hidden' : 'visible' })}
      />
      {hiddenWhilePaused && (
        <span
          role="img"
          aria-label={`Paused animation: ${alt || 'image'}`}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#475569', fontSize: 20 }}
        >⏸</span>
      )}
      {isAnimated && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setLocalPaused(p => !p); }}
          disabled={!!globalPaused}
          aria-pressed={paused}
          aria-label={globalPaused ? `Animation paused by the global setting: ${alt || 'image'}` : (paused ? `Play animation: ${alt || 'image'}` : `Pause animation: ${alt || 'image'}`)}
          title={globalPaused ? 'Animation paused by the global setting' : (paused ? 'Resume animation' : 'Pause animation')}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            position: 'absolute', top: 2, right: 2,
            width: 24, height: 24, padding: 0,
            border: 'none', borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: 11, lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        >{paused ? '▶' : '⏸'}</button>
      )}
    </div>
  );
}


function visualSupportText(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function readVisualSupportSnapshot() {
  try {
    let profiles = [];
    try {
      const parsedProfiles = JSON.parse(localStorage.getItem('alloStudentProfiles') || '[]');
      profiles = Array.isArray(parsedProfiles) ? parsedProfiles : [];
    } catch (e) {}
    let savedProfileId = null;
    try { savedProfileId = JSON.parse(localStorage.getItem('alloActiveProfileId') || 'null'); } catch (e) {}
    const profileId = (savedProfileId && profiles.some((profile) => profile && profile.id === savedProfileId))
      ? savedProfileId
      : (profiles[0] && profiles[0].id ? profiles[0].id : 'default');
    const readCollection = function (base) {
      try {
        const scoped = localStorage.getItem(base + '__' + profileId);
        const parsed = JSON.parse((scoped != null ? scoped : localStorage.getItem(base)) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
    };
    const boards = readCollection('alloSymbolBoards').map(function (board, boardIndex) {
      const safeBoard = board && typeof board === 'object' ? board : {};
      const words = Array.isArray(safeBoard.words) ? safeBoard.words : [];
      const colsValue = Number.parseInt(safeBoard.cols, 10);
      return {
        id: visualSupportText(safeBoard.id, 'board-' + boardIndex),
        title: visualSupportText(safeBoard.title, 'Untitled Board'),
        cols: Number.isFinite(colsValue) ? Math.max(1, Math.min(colsValue, 6)) : 4,
        words: words.map(function (word, wordIndex) {
          const safeWord = word && typeof word === 'object' ? word : {};
          return {
            id: visualSupportText(safeWord.id, 'word-' + wordIndex),
            label: visualSupportText(safeWord.label, 'Unlabeled symbol'),
            category: ['noun', 'verb', 'adjective', 'other'].includes(safeWord.category) ? safeWord.category : 'other',
            image: typeof safeWord.image === 'string' ? safeWord.image : '',
          };
        }),
      };
    });
    const schedules = readCollection('alloSchedules').map(function (schedule, scheduleIndex) {
      const safeSchedule = schedule && typeof schedule === 'object' ? schedule : {};
      const items = Array.isArray(safeSchedule.items) ? safeSchedule.items : [];
      return {
        id: visualSupportText(safeSchedule.id, 'schedule-' + scheduleIndex),
        title: visualSupportText(safeSchedule.title, 'Untitled Schedule'),
        nowId: typeof safeSchedule.nowId === 'string' ? safeSchedule.nowId : '',
        items: items.map(function (item, itemIndex) {
          const safeItem = item && typeof item === 'object' ? item : {};
          return {
            id: visualSupportText(safeItem.id, 'step-' + itemIndex),
            label: visualSupportText(safeItem.label, 'Unlabeled step'),
            image: typeof safeItem.image === 'string' ? safeItem.image : '',
            complete: !!safeItem.complete,
          };
        }),
      };
    });
    return { profileId, boards, schedules };
  } catch (e) {
    return { profileId: 'default', boards: [], schedules: [] };
  }
}


function VisualSupportBoardCard(props) {
  const { board, cardIndex, categoryBackgrounds, pauseAnimations, onSpeak } = props;
  return (
    <section className="border border-slate-400 rounded-xl overflow-hidden" aria-labelledby={'visual-support-board-' + cardIndex}>
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-3">
        <h3 id={'visual-support-board-' + cardIndex} className="font-semibold text-slate-700 text-sm">{board.title}</h3>
        <span className="text-xs font-medium text-slate-600">{board.words.length} {board.words.length === 1 ? 'symbol' : 'symbols'}</span>
      </div>
      {board.words.length === 0
        ? <p className="p-4 text-sm text-slate-600" role="status">This board has no symbols yet.</p>
        : <div className="p-3" role="list" aria-label={board.title + ' symbols'} style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(88px, 1fr))', gap:8}}>
            {board.words.map((word, wordIndex) => (
              <div key={word.id + '-' + wordIndex} role="listitem" style={{background: categoryBackgrounds[word.category] || categoryBackgrounds.other, borderRadius:8, padding:8, minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', gap:5}}>
                {word.image
                  ? <PausableImage src={word.image} alt={word.label} globalPaused={pauseAnimations} style={{width:64,height:64}}/>
                  : <div aria-hidden="true" style={{width:64,height:64,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'#94a3b8'}}>?</div>}
                <span style={{fontSize:12,fontWeight:700,textAlign:'center',color:'#1f2937',lineHeight:1.25,overflowWrap:'anywhere'}}>{word.label}</span>
                <button type="button" onClick={() => onSpeak(word.label, word.label)} aria-label={'Read symbol aloud: ' + word.label} className="min-h-11 min-w-11 rounded-lg text-slate-700 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700" title="Read symbol aloud">Read</button>
              </div>
            ))}
          </div>}
    </section>
  );
}

function getInitialScheduleProgress(schedule) {
  const items = schedule && Array.isArray(schedule.items) ? schedule.items : [];
  const completed = {};
  items.forEach(function (item, index) { if (item.complete) completed[index] = true; });
  let current = items.findIndex(function (item) { return item.id === schedule.nowId && !item.complete; });
  if (current < 0) current = items.findIndex(function (item) { return !item.complete; });
  if (current < 0) current = 0;
  return { current, completed };
}

function VisualSupportScheduleCard(props) {
  const { schedule, cardIndex, progress, pauseAnimations, onSpeak, onSetCurrent, onToggleComplete } = props;
  const initialProgress = getInitialScheduleProgress(schedule);
  const safeProgress = progress || initialProgress;
  const currentStep = Math.max(0, Math.min(Number.isInteger(safeProgress.current) ? safeProgress.current : initialProgress.current, Math.max(0, schedule.items.length - 1)));
  const completed = safeProgress.completed || initialProgress.completed;
  return (
    <section className="border border-slate-400 rounded-xl overflow-hidden" aria-labelledby={'visual-support-schedule-' + cardIndex}>
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id={'visual-support-schedule-' + cardIndex} className="font-semibold text-slate-700 text-sm">{schedule.title}</h3>
          <p className="text-xs text-slate-600 mt-0.5">{schedule.items.length === 0 ? 'No steps' : 'Now: step ' + (currentStep + 1) + ' of ' + schedule.items.length}</p>
        </div>
        {schedule.items.length > 0 && (
          <button type="button" onClick={() => onSpeak(schedule.items.map((item, index) => 'Step ' + (index + 1) + ': ' + item.label).join('. '), schedule.title)} className="min-h-11 px-3 rounded-lg border border-purple-300 bg-white text-xs font-semibold text-purple-800 hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700" aria-label={'Read all steps in ' + schedule.title}>Read all</button>
        )}
      </div>
      {schedule.items.length === 0
        ? <p className="p-4 text-sm text-slate-600" role="status">This schedule has no steps yet.</p>
        : <ol role="list" aria-label={schedule.title + ' ordered steps'} className="p-3" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(138px, 1fr))', gap:10}}>
            {schedule.items.map((item, itemIndex) => {
              const isCurrent = itemIndex === currentStep;
              const isComplete = !!completed[itemIndex];
              return (
                <li key={item.id + '-' + itemIndex} aria-current={isCurrent ? 'step' : undefined} style={{border:isCurrent ? '3px solid #7c3aed' : '2px solid #cbd5e1', borderRadius:12, padding:8, minWidth:0, background:isComplete ? '#f0fdf4' : (isCurrent ? '#faf5ff' : '#fff'), display:'flex', flexDirection:'column', alignItems:'stretch', gap:7}}>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{fontSize:11,fontWeight:800,color:isCurrent ? '#6d28d9' : '#475569'}}>STEP {itemIndex + 1}</span>
                    <span style={{fontSize:11,fontWeight:800,color:isComplete ? '#166534' : (isCurrent ? '#6d28d9' : '#64748b')}}>{isComplete ? 'DONE' : (isCurrent ? 'NOW' : 'NEXT')}</span>
                  </div>
                  <div style={{width:'100%',height:96,border:'1px solid #cbd5e1',borderRadius:9,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc'}}>
                    {item.image
                      ? <PausableImage src={item.image} alt={item.label} globalPaused={pauseAnimations} style={{width:'100%',height:'100%'}}/>
                      : <span aria-hidden="true" style={{fontSize:28,color:'#94a3b8'}}>?</span>}
                  </div>
                  <span style={{fontSize:13,fontWeight:700,textAlign:'center',color:'#1f2937',lineHeight:1.25,overflowWrap:'anywhere'}}>{item.label}</span>
                  <div className="flex flex-col gap-1 mt-auto">
                    <button type="button" onClick={() => onSetCurrent(schedule, itemIndex)} disabled={isCurrent} className="min-h-11 rounded-lg border border-purple-300 bg-white px-2 text-xs font-semibold text-purple-800 disabled:bg-purple-100 disabled:text-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700" aria-label={isCurrent ? item.label + ' is the current step' : 'Make ' + item.label + ' the current step'}>{isCurrent ? 'Current step' : 'Set as now'}</button>
                    <button type="button" onClick={() => onToggleComplete(schedule, itemIndex)} aria-pressed={isComplete} className="min-h-11 rounded-lg border border-emerald-300 bg-white px-2 text-xs font-semibold text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">{isComplete ? 'Mark not done' : 'Mark done'}</button>
                  </div>
                </li>
              );
            })}
          </ol>}
    </section>
  );
}

function VisualSupportsModal(props) {
  const { setShowVisualSupports, setVsTab, showVisualSupports, vsTab } = props;
  // Roving-tabindex arrow-key handler for the Boards/Schedules tablist. Must
  // live HERE (vsTab/setVsTab scope) — it was accidentally defined inside
  // PausableImage, leaving the JSX reference below a free variable that
  // crashed this modal on render (caught by check_render_refs).
  const handleTabKeyDown = function (event) {
    const tabs = ['boards', 'schedules'];
    const current = tabs.indexOf(vsTab);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    setVsTab(tabs[next]);
    window.setTimeout(function () {
      const tab = document.getElementById('visual-supports-tab-' + tabs[next]);
      if (tab) tab.focus();
    }, 0);
  };
  const dialogRef = React.useRef(null);
  React.useEffect(function () {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const getFocusable = function () {
      return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    };
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowVisualSupports(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return function () {
      dialog.removeEventListener('keydown', onKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [setShowVisualSupports]);

  // Keep storage reads out of render. Re-read when the viewer opens, when
  // another tab changes storage, or when Symbol Studio emits its local update event.
  const [supportData, setSupportData] = React.useState(readVisualSupportSnapshot);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [scheduleProgress, setScheduleProgress] = React.useState({});
  const [statusMessage, setStatusMessage] = React.useState('');
  const refreshSupports = React.useCallback(function () {
    setSupportData(readVisualSupportSnapshot());
  }, []);
  React.useEffect(function () {
    if (showVisualSupports !== false) refreshSupports();
    const handleStorage = function (event) {
      if (!event || !event.key || /^(alloSymbolBoards|alloSchedules|alloStudentProfiles|alloActiveProfileId)/.test(event.key)) {
        refreshSupports();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('allo-visual-supports-updated', refreshSupports);
    return function () {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('allo-visual-supports-updated', refreshSupports);
    };
  }, [showVisualSupports, refreshSupports]);

  const vsBoards = supportData.boards;
  const vsSchedules = supportData.schedules;
  const CAT_BG = { noun: '#fef9c3', verb: '#dcfce7', adjective: '#dbeafe', other: '#f3f4f6' };
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleBoards = React.useMemo(function () {
    if (!normalizedQuery) return vsBoards;
    return vsBoards.filter(function (board) {
      return board.title.toLocaleLowerCase().includes(normalizedQuery)
        || board.words.some((word) => word.label.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [vsBoards, normalizedQuery]);
  const visibleSchedules = React.useMemo(function () {
    if (!normalizedQuery) return vsSchedules;
    return vsSchedules.filter(function (schedule) {
      return schedule.title.toLocaleLowerCase().includes(normalizedQuery)
        || schedule.items.some((item) => item.label.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [vsSchedules, normalizedQuery]);

  const speakSupportText = React.useCallback(function (text, description) {
    const cleanText = visualSupportText(text, '');
    if (!cleanText) return;
    setStatusMessage('Reading ' + (description || cleanText));
    try {
      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
        setStatusMessage('Read aloud is not available in this browser.');
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(cleanText);
      utterance.onend = function () { setStatusMessage('Finished reading ' + (description || cleanText)); };
      utterance.onerror = function () { setStatusMessage('Could not read that support aloud.'); };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setStatusMessage('Could not read that support aloud.');
    }
  }, []);

  const setCurrentScheduleStep = function (schedule, stepIndex) {
    setScheduleProgress(function (previous) {
      return Object.assign({}, previous, {
        [schedule.id]: Object.assign({}, previous[schedule.id] || getInitialScheduleProgress(schedule), { current: stepIndex }),
      });
    });
    setStatusMessage((schedule.items[stepIndex] ? schedule.items[stepIndex].label : 'Step ' + (stepIndex + 1)) + ' is now the current step.');
  };
  const toggleScheduleStepComplete = function (schedule, stepIndex) {
    setScheduleProgress(function (previous) {
      const currentProgress = previous[schedule.id] || getInitialScheduleProgress(schedule);
      const completed = Object.assign({}, currentProgress.completed || {});
      completed[stepIndex] = !completed[stepIndex];
      let current = Number.isInteger(currentProgress.current) ? currentProgress.current : 0;
      if (completed[stepIndex] && current === stepIndex) {
        const nextIncomplete = schedule.items.findIndex(function (_, index) { return index > stepIndex && !completed[index]; });
        if (nextIncomplete >= 0) current = nextIncomplete;
      }
      return Object.assign({}, previous, {
        [schedule.id]: { current, completed },
      });
    });
    setStatusMessage((schedule.items[stepIndex] ? schedule.items[stepIndex].label : 'Step ' + (stepIndex + 1)) + ' completion updated.');
  };

  // WCAG 2.2.2: default to paused if the OS reports reduced-motion preference,
  // otherwise honor whatever the user picked last time. Persisted across sessions.
  const [pauseAnim, setPauseAnim] = React.useState(function () {
    try {
      const stored = localStorage.getItem('alloVsPauseAnim');
      if (stored === '1') return true;
      if (stored === '0') return false;
      // No stored choice — fall back to OS preference
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  });
  React.useEffect(function () {
    try { localStorage.setItem('alloVsPauseAnim', pauseAnim ? '1' : '0'); } catch (e) {}
  }, [pauseAnim]);

  return (
          <div className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-stretch justify-center p-3" onClick={() => setShowVisualSupports(false)}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="visual-supports-title" tabIndex={-1} className="bg-white rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl focus:outline-none" onClick={e => e.stopPropagation()}>
              <div style={{background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)'}} className="p-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 id="visual-supports-title" className="text-white font-bold text-lg">🖼️ Visual Supports</h2>
                  <p className="text-purple-200 text-xs mt-0.5">Your saved boards &amp; schedules</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPauseAnim(p => !p)}
                    aria-pressed={pauseAnim}
                    title={pauseAnim ? 'Resume all animated images' : 'Pause all animated images'}
                    className="min-h-11 text-white/90 hover:text-white text-[11px] font-semibold px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span aria-hidden="true">{pauseAnim ? '▶' : '⏸'}</span>
                    <span>{pauseAnim ? 'Resume' : 'Pause'} animations</span>
                  </button>
                  <button type="button" onClick={() => setShowVisualSupports(false)} aria-label="Close Visual Supports" className="min-h-11 min-w-11 text-white/80 hover:text-white text-2xl font-bold flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">×</button>
                </div>
              </div>
              <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0" role="tablist" aria-label="Visual support type">
                <button type="button" id="visual-supports-tab-boards" role="tab" aria-selected={vsTab === 'boards'} aria-controls="visual-supports-panel-boards" tabIndex={vsTab === 'boards' ? 0 : -1} onKeyDown={handleTabKeyDown} onClick={() => setVsTab('boards')} className={`flex-1 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-700 ${vsTab === 'boards' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-slate-600 hover:text-slate-700'}`}>
                  📋 Boards ({vsBoards.length})
                </button>
                <button type="button" id="visual-supports-tab-schedules" role="tab" aria-selected={vsTab === 'schedules'} aria-controls="visual-supports-panel-schedules" tabIndex={vsTab === 'schedules' ? 0 : -1} onKeyDown={handleTabKeyDown} onClick={() => setVsTab('schedules')} className={`flex-1 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-700 ${vsTab === 'schedules' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-slate-600 hover:text-slate-700'}`}>
                  📅 Schedules ({vsSchedules.length})
                </button>
              </div>
              <div className="p-3 border-b border-slate-200 bg-white flex-shrink-0">
                <label htmlFor="visual-supports-search" className="sr-only">Search saved visual supports</label>
                <div className="flex items-center gap-2">
                  <input id="visual-supports-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={vsTab === 'boards' ? 'Search boards or symbols' : 'Search schedules or steps'} className="w-full min-h-11 rounded-lg border border-slate-400 px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700" />
                  {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="min-h-11 px-3 rounded-lg border border-slate-400 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700" aria-label="Clear visual supports search">Clear</button>}
                </div>
                <p role="status" className="text-xs text-slate-600 mt-1">{vsTab === 'boards' ? visibleBoards.length + ' of ' + vsBoards.length + ' boards shown' : visibleSchedules.length + ' of ' + vsSchedules.length + ' schedules shown'}</p>
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{statusMessage}</div>
              </div>
              <div id={`visual-supports-panel-${vsTab}`} role="tabpanel" aria-labelledby={`visual-supports-tab-${vsTab}`} tabIndex={0} className="flex-1 overflow-y-auto p-4 space-y-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-700">
                {vsTab === 'boards' && (visibleBoards.length === 0
                  ? <div className="text-center py-16 text-slate-600"><div className="text-5xl mb-3" aria-hidden="true">📋</div><p className="font-semibold">{vsBoards.length === 0 ? 'No saved boards yet' : 'No boards match your search'}</p><p className="text-sm mt-1">{vsBoards.length === 0 ? 'Save boards in Symbol Studio to see them here' : 'Try a board title or symbol name'}</p></div>
                  : visibleBoards.map((board, boardIndex) => (
                    <VisualSupportBoardCard key={board.id + '-' + boardIndex} board={board} cardIndex={boardIndex} categoryBackgrounds={CAT_BG} pauseAnimations={pauseAnim} onSpeak={speakSupportText} />
                  ))
                )}
                {vsTab === 'schedules' && (visibleSchedules.length === 0
                  ? <div className="text-center py-16 text-slate-600"><div className="text-5xl mb-3" aria-hidden="true">📅</div><p className="font-semibold">{vsSchedules.length === 0 ? 'No saved schedules yet' : 'No schedules match your search'}</p><p className="text-sm mt-1">{vsSchedules.length === 0 ? 'Save schedules in Symbol Studio to see them here' : 'Try a schedule title or step name'}</p></div>
                  : visibleSchedules.map((schedule, scheduleIndex) => (
                    <VisualSupportScheduleCard key={schedule.id + '-' + scheduleIndex} schedule={schedule} cardIndex={scheduleIndex} progress={scheduleProgress[schedule.id]} pauseAnimations={pauseAnim} onSpeak={speakSupportText} onSetCurrent={setCurrentScheduleStep} onToggleComplete={toggleScheduleStepComplete} />
                  ))
                )}
              </div>
            </div>
          </div>
  );
}
