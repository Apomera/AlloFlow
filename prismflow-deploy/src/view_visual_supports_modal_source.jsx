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
    return <img src={src} alt={alt} style={style} />;
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
        style={imgInlineStyle}
      />
      {frozenFrame && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setLocalPaused(p => !p); }}
          aria-label={paused ? `Play animation: ${alt || 'image'}` : `Pause animation: ${alt || 'image'}`}
          title={paused ? 'Resume animation' : 'Pause animation'}
          style={{
            position: 'absolute', top: 2, right: 2,
            width: 18, height: 18, padding: 0,
            border: 'none', borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: 9, lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        >{paused ? '▶' : '⏸'}</button>
      )}
    </div>
  );
}

function VisualSupportsModal(props) {
  const { setShowVisualSupports, setVsTab, showVisualSupports, vsTab } = props;
  const vsBoards = (() => { try { return JSON.parse(localStorage.getItem('alloSymbolBoards') || '[]'); } catch(e) { return []; } })();
  const vsSchedules = (() => { try { return JSON.parse(localStorage.getItem('alloSchedules') || '[]'); } catch(e) { return []; } })();
  const CAT_BG = { noun: '#fef9c3', verb: '#dcfce7', adjective: '#dbeafe', other: '#f3f4f6' };

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
            <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div style={{background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)'}} className="p-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-white font-bold text-lg">🖼️ Visual Supports</h2>
                  <p className="text-purple-200 text-xs mt-0.5">Your saved boards &amp; schedules</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPauseAnim(p => !p)}
                    aria-pressed={pauseAnim}
                    title={pauseAnim ? 'Resume all animated images' : 'Pause all animated images'}
                    className="text-white/90 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1"
                  >
                    <span aria-hidden="true">{pauseAnim ? '▶' : '⏸'}</span>
                    <span>{pauseAnim ? 'Resume' : 'Pause'} animations</span>
                  </button>
                  <button onClick={() => setShowVisualSupports(false)} className="text-white/70 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center">×</button>
                </div>
              </div>
              <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <button onClick={() => setVsTab('boards')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${vsTab === 'boards' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-slate-600 hover:text-slate-700'}`}>
                  📋 Boards ({vsBoards.length})
                </button>
                <button onClick={() => setVsTab('schedules')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${vsTab === 'schedules' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-slate-600 hover:text-slate-700'}`}>
                  📅 Schedules ({vsSchedules.length})
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {vsTab === 'boards' && (vsBoards.length === 0
                  ? <div className="text-center py-16 text-slate-600"><div className="text-5xl mb-3">📋</div><p className="font-semibold">No saved boards yet</p><p className="text-sm mt-1">Save boards in Symbol Studio to see them here</p></div>
                  : vsBoards.map(board => (
                    <div key={board.id} className="border border-slate-400 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 font-semibold text-slate-700 text-sm border-b border-slate-200">{board.title || 'Untitled Board'}</div>
                      <div className="p-3" style={{display:'grid', gridTemplateColumns:`repeat(${Math.min(board.cols||4,6)},1fr)`, gap:6}}>
                        {(board.words||[]).map((word,i) => (
                          <div key={i} style={{background: CAT_BG[word.category]||'#f3f4f6', borderRadius:8, padding:6, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                            {word.image
                              ? <PausableImage src={word.image} alt={word.label} globalPaused={pauseAnim} style={{width:56,height:56}}/>
                              : <div style={{width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'#d1d5db'}}>?</div>}
                            <span style={{fontSize:11,fontWeight:600,textAlign:'center',color:'#1f2937',lineHeight:1.2}}>{word.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                {vsTab === 'schedules' && (vsSchedules.length === 0
                  ? <div className="text-center py-16 text-slate-600"><div className="text-5xl mb-3">📅</div><p className="font-semibold">No saved schedules yet</p><p className="text-sm mt-1">Save schedules in Symbol Studio to see them here</p></div>
                  : vsSchedules.map(sched => (
                    <div key={sched.id} className="border border-slate-400 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 font-semibold text-slate-700 text-sm border-b border-slate-200">{sched.title || 'Untitled Schedule'}</div>
                      <div className="p-3 overflow-x-auto">
                        <div style={{display:'flex',gap:8,minWidth:'max-content'}}>
                          {(sched.items||[]).map((item,i) => (
                            <div key={item.id||i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,width:72}}>
                              <div style={{width:72,height:72,border:'2px solid #e5e7eb',borderRadius:10,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#fafafa'}}>
                                {item.image
                                  ? <PausableImage src={item.image} alt={item.label} globalPaused={pauseAnim} style={{width:'100%',height:'100%'}}/>
                                  : <span style={{fontSize:28,color:'#d1d5db'}}>?</span>}
                              </div>
                              <span style={{fontSize:10,fontWeight:600,textAlign:'center',color:'#374151',lineHeight:1.2}}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
  );
}
