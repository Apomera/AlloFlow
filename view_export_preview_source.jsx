// view_export_preview_source.jsx — Export Preview & Customization Modal (Round 5 Tier A)
//
// Extracted from AlloFlowANTI.txt L31652-L32469 (817 lines, ~50 props).
//
// Closure deps generated via the SCOPE-AWARE dep enumerator at
// c:/tmp/enumerate_block_scope_aware.js — flat-scope enumerators silently
// drop closure refs shadowed by inner-scope param names (see PdfAuditView's
// missed `t` prop incident, May 2026).

// ── Writing check (Harper) ──
// Open-source grammar checking that runs ENTIRELY in the browser (Rust→WASM,
// Apache-2.0, by Automattic). Chosen over LanguageTool's public API because
// no document text ever leaves the device (FERPA posture), and over
// write-good/retext because Harper does real grammar (subject–verb
// agreement, homophones, repeated words) rather than style lint. English-
// only; the first run downloads the ~10 MB WASM (browser-cached after) —
// both disclosed in the UI. Spelling itself stays with the browser's native
// checker (spellcheck=true is already on in the editor). Function-wrapped
// dynamic import so esbuild doesn't try to resolve the remote URL at build.
let _harperPromise = null;
function _ensureHarper() {
  if (_harperPromise) return _harperPromise;
  _harperPromise = (async () => {
    const _imp = new Function('u', 'return import(u)');
    const mod = await _imp('https://cdn.jsdelivr.net/npm/harper.js@2.4.0/+esm');
    const binary = await mod.createBinaryModuleFromUrl('https://cdn.jsdelivr.net/npm/harper.js@2.4.0/dist/harper_wasm_bg.wasm');
    const linter = new mod.LocalLinter({ binary });
    if (linter.setup) await linter.setup();
    return linter;
  })();
  _harperPromise.catch(() => { _harperPromise = null; }); // failed load → allow retry
  return _harperPromise;
}
// end _ensureHarper

function ExportPreviewView(props) {
  const {
    BUILT_IN_PRESETS, FONT_OPTIONS, STYLE_SEEDS, _ensureDiffLib,
    a11yInspectMode, addToast, agentActivityLog, agentLogFullView,
    applyExportPreset, auditOutputAccessibility, customExportCSS, deleteExportPreset,
    diffLibReady, executeExportFromPreview, expertCommandInput, exportAuditLoading,
    exportAuditResult, exportConfig, exportPresets, exportPreviewMode,
    exportPreviewRef, exportStylePrompt, exportTheme, generateCustomExportStyle,
    getExportPreviewHTML, getSkippedResources, history, isAgentRunning, isGeneratingStyle,
    pdfFixResult, pptxLoaded, processExpertCommand, runAxeAudit,
    saveExportPreset, selectedFont, setAgentActivityLog, setAgentLogFullView,
    setCustomExportCSS, setDiffViewOpen, setExpertCommandInput, setExportAuditLoading,
    setExportAuditResult, setExportConfigAndRefresh, setExportPreviewMode, setExportStylePrompt,
    setExportTheme, setIsAgentRunning, setShowBrandProfileEditor, setShowExportPreview, showExportPreview,
    t,
    toggleA11yInspect, updateExportPreview,
    exportPreviewSource,
  } = props;
  // BrandProfile inline integration — replaces the standalone Educator Hub tool.
  // Read the user's saved brand profiles so they can be picked as export themes
  // alongside the built-in STYLE_SEEDS, and surface a "Manage" button + first-
  // time banner so brand setup happens in the context where brands get used.
  // Writing-check panel state: null | {status:'loading'} | {status:'error',error}
  // | {status:'done', items:[{blockIndex,message,start,end,bad,snippet,suggestions}], capped}
  const [writingCheck, setWritingCheck] = React.useState(null);
  const brandProfiles = React.useMemo(() => {
    try {
      const bp = window.AlloModules && window.AlloModules.BrandProfile;
      return bp && typeof bp.listBrandProfiles === 'function' ? (bp.listBrandProfiles() || []) : [];
    } catch (e) { return []; }
  }, [showExportPreview]);
  const noBrandsYet = brandProfiles.length === 0;
  const openBrandEditor = React.useCallback(() => {
    if (typeof setShowBrandProfileEditor === 'function') setShowBrandProfileEditor(true);
  }, [setShowBrandProfileEditor]);

  const hasGlossary = (history || []).some(h => h && h.type === 'glossary');
  const hasTimeline = (history || []).some(h => h && h.type === 'timeline');
  const hasBrainstorm = (history || []).some(h => h && h.type === 'brainstorm');
  const hasConceptSort = (history || []).some(h => h && h.type === 'concept-sort');
  const showDisplayModes = hasGlossary || hasTimeline || hasBrainstorm || hasConceptSort;

  if (!showExportPreview) return null;

  return (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-stretch justify-center p-4" role="dialog" aria-modal="true" aria-label={t("a11y.doc_builder")}
            onClick={(e) => { if (e.target === e.currentTarget) setShowExportPreview(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowExportPreview(false); }}
            ref={(el) => {
              if (!el) return;
              // iframe included: the WYSIWYG editing surface was previously
              // unreachable by Tab inside the trap — a WCAG 2.1.1 failure on
              // the builder's main feature.
              const focusables = el.querySelectorAll('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])');
              if (focusables.length > 0 && !el.contains(document.activeElement)) focusables[0].focus();
              el.__focusTrap = el.__focusTrap || ((ev) => {
                if (ev.key !== 'Tab') return;
                const fl = el.querySelectorAll('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])');
                if (fl.length === 0) return;
                const first = fl[0], last = fl[fl.length - 1];
                if (ev.shiftKey) { if (document.activeElement === first) { ev.preventDefault(); last.focus(); } }
                else { if (document.activeElement === last) { ev.preventDefault(); first.focus(); } }
              });
              el.removeEventListener('keydown', el.__focusTrap);
              el.addEventListener('keydown', el.__focusTrap);
            }}>
            <div className="bg-white rounded-2xl shadow-2xl flex w-full max-w-[95vw] max-h-[95vh] overflow-hidden">
              {/* Left Panel — Settings */}
              <div className="w-72 shrink-0 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">🛠️ Document Builder</h2>
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">{exportPreviewMode === 'worksheet' ? 'Worksheet' : exportPreviewMode === 'html' ? 'HTML' : exportPreviewMode === 'slides' ? 'Slides' : 'PDF'}</span>
                    <button onClick={() => setShowExportPreview(false)} className="p-2 ml-1 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" data-help-key="doc_builder_close_btn" aria-label={t("a11y.close_doc_builder")}><X size={20} /></button>
                  </div>
                </div>
                {exportPreviewSource === 'remediation' && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-800" role="status">
                    <span className="font-bold">♿ {t('export_preview.remediation_banner_title') || 'Editing the remediated document.'}</span>{' '}
                    {t('export_preview.remediation_banner_body') || 'Your edits here are saved back into it when you close the builder, so the Tagged PDF / Word / PowerPoint downloads include them.'}
                  </div>
                )}

                {/* ── SECTION: Quick Start ── */}
                <div className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1"><span className="flex-1 h-px bg-indigo-100"></span>Quick Start<span className="flex-1 h-px bg-indigo-100"></span></div>

                {/* Presets */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Presets</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(BUILT_IN_PRESETS).map(([key, preset]) => (
                      <button key={key} onClick={() => applyExportPreset(preset)}
                        className="px-2 py-1 bg-white border border-slate-400 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 transition-all"
                        title={`Apply "${preset.name}" preset`}
                      >{preset.emoji} {preset.name}</button>
                    ))}
                    {Object.entries(exportPresets).map(([key, preset]) => (
                      <div key={key} className="flex items-center gap-0.5">
                        <button onClick={() => applyExportPreset(preset)}
                          className="px-2 py-1 bg-white border border-violet-600 rounded-l-lg text-[11px] font-bold text-violet-600 hover:bg-violet-50 transition-all"
                          title={`Apply "${preset.name}" preset`}
                        >{preset.emoji} {preset.name}</button>
                        <button onClick={() => deleteExportPreset(key)}
                          className="px-1 py-1 bg-white border border-violet-600 border-l-0 rounded-r-lg text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
                          title={`Delete "${preset.name}" preset`}
                        ><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    const name = prompt('Preset name:');
                    if (name && name.trim()) saveExportPreset(name.trim());
                  }} className="mt-1.5 w-full px-2 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all">
                    + Save Current as Preset
                  </button>
                </div>

                {/* Export Mode */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Format</div>
                  <div className="flex gap-1">
                    {[['print', '📄 PDF'], ['worksheet', '📝 Worksheet'], ['html', '💻 HTML'], ['slides', '📊 Slides']].map(([m, label]) => (
                      <button key={m} onClick={() => setExportPreviewMode(m)} className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${exportPreviewMode === m ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* ── SECTION: Appearance ── */}
                <div className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2"><span className="flex-1 h-px bg-indigo-100"></span>Appearance<span className="flex-1 h-px bg-indigo-100"></span></div>

                {/* Style */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                    <span>Style</span>
                    {setShowBrandProfileEditor && (
                      <button
                        type="button"
                        onClick={openBrandEditor}
                        className="text-[10px] font-semibold text-rose-700 hover:text-rose-800 underline-offset-2 hover:underline normal-case"
                        title="Create, edit, or delete school brand profiles"
                      >🏷️ Manage brand profiles</button>
                    )}
                  </div>
                  {/* First-time banner: brand setup is most discoverable HERE because this is
                      where brands actually get applied. Shown only when no profiles exist. */}
                  {noBrandsYet && setShowBrandProfileEditor && (
                    <button
                      type="button"
                      onClick={openBrandEditor}
                      className="w-full mb-1.5 text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-300 text-rose-800 hover:border-rose-400 hover:from-rose-100 hover:to-orange-100 transition-colors"
                    >🏷️ <strong>First time?</strong> Set up your school brand → colors, fonts, logo for branded exports</button>
                  )}
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(STYLE_SEEDS).filter(([, s]) => s.cssVars).map(([key, s]) => (
                      <button key={key} onClick={() => { setExportTheme(key); setTimeout(updateExportPreview, 50); }}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === key ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-100'}`}
                      >{s.emoji} {s.name}</button>
                    ))}
                    {/* User brand profiles as selectable themes — clicking one applies its
                        CSS vars via doc_pipeline_source.jsx:16325 BrandProfile fallback. */}
                    {brandProfiles.map(p => (
                      <button key={p.id} onClick={() => { setExportTheme(p.id); setTimeout(updateExportPreview, 50); }}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === p.id ? 'bg-rose-600 text-white ring-2 ring-rose-300' : 'bg-white border border-rose-400 text-rose-700 hover:bg-rose-50'}`}
                        title="School brand profile"
                      >🏷️ {p.name || 'Brand'}</button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Typography</div>
                  {/* Font dropdown (2026-06-11): the builder previously had NO
                      font picker — only the use-app-font checkbox. Values:
                      'theme' = the theme's own font, 'app' = follow the app
                      reading-support font, or an explicit FONT_OPTIONS id
                      (incl. OpenDyslexic/Lexend/Atkinson — the @font-face
                      plumbing ships with the export). Rides exportConfig so
                      presets save/restore it. */}
                  <label className="flex items-center gap-2 text-xs text-slate-700 mb-2">
                    <span className="text-[11px] text-slate-600 shrink-0">Font:</span>
                    <select
                      value={exportConfig.fontId || (exportConfig.useAppFont ? 'app' : 'theme')}
                      onChange={(e) => { const v = e.target.value; setExportConfigAndRefresh(p => ({ ...p, fontId: v, useAppFont: v === 'app' })); }}
                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      data-help-key="doc_builder_font_select" aria-label={t('a11y.export_font') || 'Export font family'}
                    >
                      <option value="theme">Theme font (default)</option>
                      <option value="app">My app font ({FONT_OPTIONS.find(f => f.id === selectedFont)?.label || 'Default'})</option>
                      {FONT_OPTIONS.filter(f => f.id !== 'default').map(f => (
                        <option key={f.id} value={f.id}>{f.label}{f.category === 'accessibility' ? ' ♿' : ''}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 shrink-0">Size:</span>
                    <input type="range" min={12} max={24} value={exportConfig.fontSize} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
                      className="flex-1 accent-indigo-600" data-help-key="doc_builder_font_size_slider" aria-label={t("a11y.font_size")} />
                    <span className="text-xs font-mono text-slate-600 w-8">{exportConfig.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-600 shrink-0">Margins:</span>
                    <div className="flex gap-1 flex-1">
                      {[
                        { label: 'Narrow', val: '0.5in' },
                        { label: 'Normal', val: '1in' },
                        { label: 'Wide', val: '1.5in' },
                      ].map(m => (
                        <button key={m.label} onClick={() => {
                          const iframe = exportPreviewRef.current;
                          const doc = iframe?.contentDocument;
                          if (doc) {
                            let ms = doc.getElementById('allo-margin-style');
                            if (!ms) { ms = doc.createElement('style'); ms.id = 'allo-margin-style'; doc.head.appendChild(ms); }
                            ms.textContent = `@media print { @page { margin: ${m.val}; } } body { padding-left: ${m.val}; padding-right: ${m.val}; }`;
                          }
                        }}
                          className="flex-1 text-[11px] font-bold text-slate-600 py-1 bg-white border border-slate-400 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          title={`${m.label} margins (${m.val})`} aria-label={`Set ${m.label} page margins`}>{m.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Word count + goal */}
                <div className="bg-slate-50 rounded-lg border border-slate-400 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Word Count</span>
                    <span className="text-[11px] font-mono text-slate-600" aria-live="polite">
                      {(() => {
                        const iframe = exportPreviewRef.current;
                        const text = iframe?.contentDocument?.body?.textContent || '';
                        return text.split(/\s+/).filter(w => w.length > 0).length.toLocaleString();
                      })()} words
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-600 shrink-0" htmlFor="word-goal-input">Goal:</label>
                    <input type="number" id="word-goal-input" min="0" step="50" placeholder="e.g. 500" defaultValue=""
                      className="flex-1 text-[11px] border border-slate-400 rounded px-2 py-1 bg-white"
                      aria-label={t("a11y.target_word_count")}
                      onChange={(e) => {
                        const goal = parseInt(e.target.value);
                        const iframe = exportPreviewRef.current;
                        const text = iframe?.contentDocument?.body?.textContent || '';
                        const count = text.split(/\s+/).filter(w => w.length > 0).length;
                        const bar = document.getElementById('word-goal-bar');
                        const lbl = document.getElementById('word-goal-label');
                        if (bar && goal > 0) {
                          const pct = Math.min(100, Math.round((count / goal) * 100));
                          bar.style.width = pct + '%';
                          bar.style.background = pct >= 100 ? '#16a34a' : pct >= 75 ? '#2563eb' : '#d97706';
                          if (lbl) lbl.textContent = count + ' / ' + goal + ' (' + pct + '%)';
                        }
                      }} />
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden" role="progressbar" aria-label={t("a11y.word_count_progress")}>
                    <div id="word-goal-bar" className="h-full rounded-full transition-all duration-300" style={{ width: '0%', background: '#d97706' }}></div>
                  </div>
                  <div id="word-goal-label" className="text-[11px] text-slate-600 mt-0.5"></div>
                  <div className="text-[11px] text-slate-600 mt-1">⌨ Ctrl+1/2/3 = headings · Ctrl+K = link · Ctrl+Shift+L = list</div>
                </div>

                {/* ── SECTION: Word Art ── */}
                <div className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1"><span className="flex-1 h-px bg-indigo-100"></span>Word Art<span className="flex-1 h-px bg-indigo-100"></span></div>
                <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg border border-amber-200 p-2 space-y-2">
                  <input type="text" id="wordart-text-input" placeholder={t("placeholders.word_art_text_input")} defaultValue="" className="w-full text-xs border border-amber-300 rounded px-2 py-1.5 bg-white focus:border-amber-500 outline-none" aria-label={t("a11y.word_art_text")} />
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Style</div>
                    <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={t("a11y.word_art_style")}>
                      {[['goldFoil','✨','Gold'],['neonGlow','💡','Neon'],['retroArcade','🕹️','Retro'],['chalkboard','🖍️','Chalk'],['embossed','🏛️','3D'],['rainbow','🌈','Rainbow']].map(([key, emoji, label], i) => (
                        <button key={key} type="button" role="radio" aria-checked={i === 0} data-wa-preset={key}
                          className="wordart-preset-btn text-[10px] font-bold py-1.5 px-1 rounded-md border text-slate-700 transition-all"
                          style={i === 0 ? { background: '#f59e0b', color: 'white', borderColor: '#f59e0b' } : { background: 'white', borderColor: '#fcd34d' }}
                          onClick={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            parent.querySelectorAll('.wordart-preset-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.style.background = 'white'; b.style.color = ''; b.style.borderColor = '#fcd34d'; });
                            e.currentTarget.setAttribute('aria-checked', 'true');
                            e.currentTarget.style.background = '#f59e0b';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = '#f59e0b';
                          }}
                        >{emoji} {label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Size</div>
                      <div className="flex gap-0.5" role="radiogroup" aria-label={t("a11y.word_art_size")}>
                        {['S','M','L','XL'].map((s) => (
                          <button key={s} type="button" role="radio" aria-checked={s === 'L'} data-wa-size={s}
                            className="wordart-size-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all"
                            style={s === 'L' ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' } : { background: 'white', color: '#475569' }}
                            onClick={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (!parent) return;
                              parent.querySelectorAll('.wordart-size-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0'; });
                              e.currentTarget.setAttribute('aria-checked', 'true');
                              e.currentTarget.style.background = '#4f46e5';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.borderColor = '#4f46e5';
                            }}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Align</div>
                      <div className="flex gap-0.5" role="radiogroup" aria-label={t("a11y.word_art_alignment")}>
                        {[['left','⇤'],['center','⇔'],['right','⇥']].map(([a, icon]) => (
                          <button key={a} type="button" role="radio" aria-checked={a === 'center'} data-wa-align={a}
                            className="wordart-align-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all"
                            style={a === 'center' ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' } : { background: 'white', color: '#475569' }}
                            onClick={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (!parent) return;
                              parent.querySelectorAll('.wordart-align-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0'; });
                              e.currentTarget.setAttribute('aria-checked', 'true');
                              e.currentTarget.style.background = '#4f46e5';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.borderColor = '#4f46e5';
                            }}
                          >{icon}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => {
                      const textInput = document.getElementById('wordart-text-input');
                      const text = textInput && textInput.value ? textInput.value.trim() : '';
                      if (!text) { addToast('Please enter word art text first', 'info'); return; }
                      const presetBtn = document.querySelector('.wordart-preset-btn[aria-checked="true"]');
                      const sizeBtn = document.querySelector('.wordart-size-btn[aria-checked="true"]');
                      const alignBtn = document.querySelector('.wordart-align-btn[aria-checked="true"]');
                      const preset = presetBtn ? presetBtn.getAttribute('data-wa-preset') : 'goldFoil';
                      const size = sizeBtn ? sizeBtn.getAttribute('data-wa-size') : 'L';
                      const align = alignBtn ? alignBtn.getAttribute('data-wa-align') : 'center';
                      const iframe = exportPreviewRef.current;
                      const doc = iframe && iframe.contentDocument;
                      if (!doc || !doc.body) { addToast('Preview not ready yet', 'error'); return; }
                      let html = '';
                      if (window.AlloWordArt && typeof window.AlloWordArt.render === 'function') {
                        html = window.AlloWordArt.render(text, preset, size, align);
                      } else {
                        const P = { goldFoil: 'background:linear-gradient(135deg,#b45309 0%,#f59e0b 30%,#fde68a 50%,#f59e0b 70%,#92400e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;', neonGlow: 'color:#0891b2;text-shadow:0 0 4px #06b6d4,0 0 8px #06b6d4,0 0 15px #0e7490;font-weight:900;', retroArcade: "color:#fef2f2;text-shadow:3px 3px 0 #dc2626,6px 6px 0 #1e3a8a;font-weight:900;font-family:Impact,'Arial Black',sans-serif;letter-spacing:0.03em;", chalkboard: "color:#fef3c7;text-shadow:0 0 2px #fbbf24,2px 2px 0 rgba(0,0,0,0.2);font-family:'Caveat','Comic Sans MS',cursive;font-weight:700;letter-spacing:0.05em;", embossed: 'color:#475569;text-shadow:-1px -1px 0 rgba(255,255,255,0.8),1px 1px 0 rgba(0,0,0,0.35),2px 2px 4px rgba(0,0,0,0.2);font-weight:900;', rainbow: 'background:linear-gradient(90deg,#dc2626,#ea580c,#ca8a04,#16a34a,#0891b2,#4f46e5,#9333ea);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;' };
                        const sz = { S: '1.5rem', M: '2.5rem', L: '4rem', XL: '6rem' };
                        const safe = String(text).replace(/[<>&]/g, (c) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;');
                        const inner = '<span style="display:inline-block;font-size:' + (sz[size] || sz.L) + ';line-height:1.1;' + (P[preset] || P.goldFoil) + '">' + safe + '</span>';
                        const wrapped = preset === 'chalkboard' ? '<span style="display:inline-block;background:#14532d;padding:1rem 1.5rem;border-radius:8px;border:3px solid #78350f;">' + inner + '</span>' : inner;
                        html = '<div class="alloflow-wordart" data-wa-preset="' + preset + '" data-wa-size="' + size + '" data-wa-align="' + align + '" role="heading" aria-level="2" style="margin:1.5em 0;text-align:' + align + '">' + wrapped + '</div>';
                      }
                      if (!html) { addToast('Could not render word art', 'error'); return; }
                      iframe.contentWindow.focus();
                      try { doc.designMode = 'on'; } catch (e) {}
                      const sel = doc.getSelection();
                      const bodyEl = doc.body;
                      const anchor = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).commonAncestorContainer : null;
                      const cursorInsideBody = anchor && (anchor === bodyEl || (bodyEl.contains && bodyEl.contains(anchor.nodeType === 1 ? anchor : anchor.parentNode)));
                      if (!cursorInsideBody) {
                        const main = doc.querySelector('main') || bodyEl;
                        const range = doc.createRange();
                        range.selectNodeContents(main);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                      }
                      let inserted = false;
                      try { inserted = doc.execCommand('insertHTML', false, html); } catch (e) {}
                      if (!inserted) {
                        const wrap = doc.createElement('div');
                        wrap.innerHTML = html;
                        const node = wrap.firstChild;
                        if (node) doc.body.appendChild(node);
                      }
                      if (textInput) textInput.value = '';
                      addToast('✨ Word art inserted', 'success');
                    }}
                    className="w-full px-3 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm hover:shadow-md"
                  >✨ Insert Word Art</button>
                </div>

                {/* ── SECTION: Content ── */}
                <div className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2"><span className="flex-1 h-px bg-indigo-100"></span>Content<span className="flex-1 h-px bg-indigo-100"></span></div>

                {/* Resource Toggles */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-bold text-slate-600 uppercase">Include Resources</div>
                    {(() => {
                      const resourceKeys = ['includeAnalysis','includeSimplified','includeGlossary','includeQuiz','includeOutline','includeFaq','includeSentenceFrames','includeImage','includeMath','includeDbq','includeLessonPlan','includeUdlAdvice','includeBrainstorm'];
                      const allOn = resourceKeys.every(k => exportConfig[k]);
                      return history.some(h => h) && (
                        <button onClick={() => {
                          const update = {};
                          resourceKeys.forEach(k => { update[k] = !allOn; });
                          setExportConfigAndRefresh(p => ({ ...p, ...update }));
                        }} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                          {allOn ? 'Deselect All' : 'Select All'}
                        </button>
                      );
                    })()}
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const teacherOnlyDefault = new Set(['includeAnalysis', 'includeUdlAdvice', 'includeBrainstorm']);
                      const available = [
                        ['includeAnalysis', '📊 Source Analysis', 'analysis'],
                        ['includeSimplified', '📖 Leveled Text', 'simplified'],
                        ['includeGlossary', '📚 Glossary', 'glossary'],
                        ['includeQuiz', '❓ Quiz', 'quiz'],
                        ['includeOutline', '🗂️ Graphic Organizer', 'outline'],
                        ['includeFaq', '💬 FAQ', 'faq'],
                        ['includeSentenceFrames', '✍️ Sentence Frames', 'sentence-frames'],
                        ['includeImage', '🎨 Visual Support', 'image'],
                        ['includeMath', '🔢 Math', 'math'],
                        ['includeDbq', '📜 DBQ', 'dbq'],
                        ['includeLessonPlan', '📋 Lesson Plan', 'lesson-plan'],
                        ['includeUdlAdvice', '🧩 UDL Advice', 'udl-advice'],
                        ['includeBrainstorm', '💡 Brainstorm', 'brainstorm'],
                      ].filter(([,, type]) => history.some(h => h && h.type === type));
                      if (available.length === 0) return (
                        <p className="text-[11px] text-slate-600 italic px-1 py-2">No resources generated yet. Generate resources first, then choose which to include in your document.</p>
                      );
                      return available.map(([key, label]) => {
                        const isTeacherOnly = teacherOnlyDefault.has(key);
                        const tooltip = isTeacherOnly
                          ? 'Always included in teacher copy. Toggle to also include in student copy.'
                          : '';
                        return (
                          <label key={key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" title={tooltip}>
                            <input type="checkbox" checked={exportConfig[key]} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, [key]: e.target.checked }))} className="rounded" />
                            <span>{label}{isTeacherOnly && <span className="ml-1 text-[11px] text-indigo-400 font-bold">(also in student copy)</span>}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Skipped interactive resources notice */}
                {(() => {
                  const skipped = getSkippedResources();
                  if (skipped.length === 0) return null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <p className="text-[11px] font-bold text-amber-700 mb-1">Interactive resources not included:</p>
                      <p className="text-[11px] text-amber-600">{skipped.join(', ')}</p>
                      <p className="text-[11px] text-amber-500 mt-1 italic">These are interactive tools that can't be rendered as static documents.</p>
                    </div>
                  );
                })()}

                {/* ── SECTION: Export ── */}
                <div className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2"><span className="flex-1 h-px bg-indigo-100"></span>Export<span className="flex-1 h-px bg-indigo-100"></span></div>

                {/* Additional Options */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Options</div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input type="checkbox" checked={exportConfig.includeTeacherKey} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, includeTeacherKey: e.target.checked }))} className="rounded" />
                      📎 Teacher Answer Key
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input type="checkbox" checked={exportConfig.includeStudentResponses} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, includeStudentResponses: e.target.checked }))} className="rounded" />
                      📝 Student Responses
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input type="checkbox" checked={exportConfig.singleFileHtml} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, singleFileHtml: e.target.checked }))} className="rounded" />
                      📄 Single file (.html, no zip)
                    </label>
                  </div>
                </div>

                {/* Display Modes — switches the rendered layout for specific resource types */}
                {showDisplayModes && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Display modes</div>

                    {/* Glossary display: table / flash cards / language cards */}
                    {hasGlossary && (
                      <div className={`mb-2 ${exportConfig.includeGlossary ? '' : 'opacity-50'}`}>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1 px-1">Glossary</div>
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="glossaryDisplayMode" checked={(exportConfig.glossaryDisplayMode || 'table') === 'table'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, glossaryDisplayMode: 'table' }))} disabled={!exportConfig.includeGlossary} />
                            Table (default)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="glossaryDisplayMode" checked={exportConfig.glossaryDisplayMode === 'flash-cards'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, glossaryDisplayMode: 'flash-cards' }))} disabled={!exportConfig.includeGlossary} />
                            🃏 Flash cards (fold-and-cut for paper, flip for digital)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="glossaryDisplayMode" checked={exportConfig.glossaryDisplayMode === 'language-cards'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, glossaryDisplayMode: 'language-cards' }))} disabled={!exportConfig.includeGlossary} />
                            🌐 Language cards (emphasizes translations)
                          </label>
                        </div>
                        {/* Image size — only relevant for table mode (cards have their own sizing). */}
                        {(exportConfig.glossaryDisplayMode || 'table') === 'table' && (
                          <div className="mt-2 pl-1">
                            <div className="text-[10px] font-semibold text-slate-500 mb-1">Image size</div>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { v: 'small',  label: 'S',  px: 40 },
                                { v: 'medium', label: 'M',  px: 64 },
                                { v: 'large',  label: 'L',  px: 96 },
                                { v: 'xl',     label: 'XL', px: 140 },
                              ].map(opt => {
                                const cur = exportConfig.glossaryImageSize || 'medium';
                                const isActive = cur === opt.v;
                                return (
                                  <button
                                    key={opt.v}
                                    type="button"
                                    disabled={!exportConfig.includeGlossary}
                                    onClick={() => setExportConfigAndRefresh(p => ({ ...p, glossaryImageSize: opt.v }))}
                                    title={opt.label + ' (' + opt.px + ' px)'}
                                    aria-label={'Glossary image size ' + opt.label + ' ' + opt.px + ' pixels'}
                                    aria-pressed={isActive}
                                    className={'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ' + (isActive
                                      ? 'bg-emerald-600 text-white border-emerald-700'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50')}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline display: list / cuttable strips */}
                    {hasTimeline && (
                      <div className="mb-2">
                        <div className="text-[11px] font-semibold text-slate-700 mb-1 px-1">Timeline</div>
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="timelineDisplayMode" checked={(exportConfig.timelineDisplayMode || 'list') === 'list'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, timelineDisplayMode: 'list' }))} />
                            List (default)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="timelineDisplayMode" checked={exportConfig.timelineDisplayMode === 'cuttable-strips'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, timelineDisplayMode: 'cuttable-strips' }))} />
                            ✂ Cuttable chronology strips
                          </label>
                        </div>
                        {/* Image size — same SMLXL pattern as glossary. Affects both list + strips modes. */}
                        <div className="mt-2 pl-1">
                          <div className="text-[10px] font-semibold text-slate-500 mb-1">Image size</div>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { v: 'small',  label: 'S',  px: 48 },
                              { v: 'medium', label: 'M',  px: 64 },
                              { v: 'large',  label: 'L',  px: 96 },
                              { v: 'xl',     label: 'XL', px: 140 },
                            ].map(opt => {
                              const cur = exportConfig.timelineImageSize || 'medium';
                              const isActive = cur === opt.v;
                              return (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => setExportConfigAndRefresh(p => ({ ...p, timelineImageSize: opt.v }))}
                                  title={opt.label + ' (' + opt.px + ' px)'}
                                  aria-label={'Timeline image size ' + opt.label + ' ' + opt.px + ' pixels'}
                                  aria-pressed={isActive}
                                  className={'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ' + (isActive
                                    ? 'bg-indigo-600 text-white border-indigo-700'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-indigo-50')}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Brainstorm display: grid / mind-map */}
                    {hasBrainstorm && (
                      <div className={`mb-2 ${exportConfig.includeBrainstorm ? '' : 'opacity-50'}`}>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1 px-1">Brainstorm</div>
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="brainstormDisplayMode" checked={(exportConfig.brainstormDisplayMode || 'grid') === 'grid'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, brainstormDisplayMode: 'grid' }))} disabled={!exportConfig.includeBrainstorm} />
                            Card grid (default)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="brainstormDisplayMode" checked={exportConfig.brainstormDisplayMode === 'mindmap'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, brainstormDisplayMode: 'mindmap' }))} disabled={!exportConfig.includeBrainstorm} />
                            🌟 Mind-map graphic organizer
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Concept-sort interactive + image size */}
                    {hasConceptSort && (
                      <div>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                          <input type="checkbox" checked={exportConfig.conceptSortInteractive !== false} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, conceptSortInteractive: e.target.checked }))} className="rounded" />
                          🧩 Concept sort: drag-to-sort on digital
                        </label>
                        <div className="mt-1 pl-1">
                          <div className="text-[10px] font-semibold text-slate-500 mb-1">Sort strip image size</div>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { v: 'small',  label: 'S',  px: 56 },
                              { v: 'medium', label: 'M',  px: 80 },
                              { v: 'large',  label: 'L',  px: 110 },
                              { v: 'xl',     label: 'XL', px: 150 },
                            ].map(opt => {
                              const cur = exportConfig.conceptSortImageSize || 'medium';
                              const isActive = cur === opt.v;
                              return (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => setExportConfigAndRefresh(p => ({ ...p, conceptSortImageSize: opt.v }))}
                                  title={opt.label + ' (' + opt.px + ' px)'}
                                  aria-label={'Concept sort image size ' + opt.label + ' ' + opt.px + ' pixels'}
                                  aria-pressed={isActive}
                                  className={'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ' + (isActive
                                    ? 'bg-rose-600 text-white border-rose-700'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-rose-50')}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio embedding moved to the read-aloud modal shown on Download HTML */}

                {/* AI Custom Style */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">✨ AI Style Studio</div>
                  {/* Quick restyle presets */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {[
                      { label: '🎨 Auto-Beautify', prompt: 'Make this document visually stunning and professional with a modern color scheme, elegant typography, subtle gradients, well-spaced sections with rounded cards, and a cohesive design system. Use a sophisticated palette.' },
                      { label: '🏫 Academic', prompt: 'Professional academic style with serif headings (Georgia or similar), clean layout, navy/gold color scheme, formal table styling, proper margins, and a scholarly appearance suitable for university submissions.' },
                      { label: '🌈 Elementary', prompt: 'Bright, playful, and colorful style for elementary students. Use rounded corners, fun colors (teal, coral, purple), larger friendly fonts, emoji-friendly, card-based layout with soft shadows.' },
                      { label: '🌙 Dark Mode', prompt: 'Elegant dark mode with dark slate/charcoal background, soft white text, indigo/purple accents, subtle borders, and beautiful contrast. Easy on the eyes for screen reading.' },
                      { label: '📰 Magazine', prompt: 'Clean editorial magazine layout with large hero headings, pull quotes with colored left borders, two-column text sections where appropriate, serif body text, and professional photo-story feel.' },
                      { label: '🧊 Minimalist', prompt: 'Ultra-minimal Scandinavian design. Lots of whitespace, thin sans-serif font, muted grays and one accent color, hairline borders, understated elegance.' },
                    ].map(preset => (
                      <button key={preset.label} onClick={() => { setExportStylePrompt(preset.prompt); setTimeout(() => generateCustomExportStyle(), 50); }}
                        disabled={isGeneratingStyle}
                        className="px-2 py-1 bg-slate-50 border border-slate-400 rounded-md text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 disabled:opacity-40 transition-colors"
                      >{preset.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input type="text" value={exportStylePrompt} onChange={(e) => setExportStylePrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && exportStylePrompt.trim()) generateCustomExportStyle(); }}
                      placeholder={t("placeholders.describe_style_preset")}
                      className="flex-1 text-[11px] p-1.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
                      aria-label={t("a11y.custom_export_style")} />
                    <button onClick={generateCustomExportStyle}
                      disabled={!exportStylePrompt.trim() || isGeneratingStyle}
                      className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold hover:bg-indigo-200 disabled:opacity-40"
                    >{isGeneratingStyle ? '...' : '✨'}</button>
                  </div>
                  {customExportCSS && <div className="flex items-center gap-2 mt-1">
                    <div className="text-[11px] text-green-600 font-medium">✓ Custom style active</div>
                    <button onClick={() => { setCustomExportCSS(''); setTimeout(() => { if (typeof updateExportPreview === 'function') updateExportPreview(); }, 50); }} className="text-[11px] text-slate-600 hover:text-red-500 font-bold">Reset</button>
                  </div>}
                </div>

                {/* ── Writing check (Harper — local, suggestions-only) ── */}
                {(() => {
                  const wc = writingCheck;
                  const _leafBlocks = () => {
                    const doc = exportPreviewRef.current && exportPreviewRef.current.contentDocument;
                    if (!doc || !doc.body) return null;
                    return Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,figcaption,blockquote'))
                      .filter((el) => !el.closest('section[data-content-recovery="true"]'))
                      .filter((el) => !el.querySelector('p,li,td,th,blockquote'))
                      .filter((el) => (el.textContent || '').trim().length >= 3);
                  };
                  const runWritingCheck = async () => {
                    setWritingCheck({ status: 'loading' });
                    try {
                      const linter = await _ensureHarper();
                      const blocks = _leafBlocks();
                      if (!blocks) { setWritingCheck({ status: 'error', error: t('export_preview.writing.no_preview') || 'Preview not ready — wait for it to render.' }); return; }
                      const items = [];
                      let capped = false;
                      for (let bi = 0; bi < blocks.length; bi++) {
                        if (items.length >= 150) { capped = true; break; }
                        const text = blocks[bi].textContent || '';
                        let lints = [];
                        try { lints = await linter.lint(text); } catch (_) { continue; }
                        for (const l of lints) {
                          try {
                            const span = l.span();
                            const sugg = (l.suggestions ? l.suggestions() : []).map((s) => (s.get_replacement_text ? s.get_replacement_text() : '')).filter(Boolean).slice(0, 3);
                            items.push({ blockIndex: bi, message: l.message ? l.message() : 'Possible issue', start: span.start, end: span.end, bad: text.slice(span.start, span.end), snippet: (span.start > 20 ? '…' : '') + text.slice(Math.max(0, span.start - 20), Math.min(text.length, span.end + 24)) + (span.end + 24 < text.length ? '…' : ''), suggestions: sugg });
                          } catch (_) {}
                          if (items.length >= 150) { capped = true; break; }
                        }
                      }
                      setWritingCheck({ status: 'done', items, capped });
                    } catch (e) { setWritingCheck({ status: 'error', error: ((e && e.message) || 'The checker failed to load — check the network and try again.').slice(0, 180) }); }
                  };
                  const _locate = (item, outline) => {
                    const blocks = _leafBlocks();
                    const el = blocks && blocks[item.blockIndex];
                    if (!el) return null;
                    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (outline) { el.style.outline = '3px solid #f59e0b'; el.style.outlineOffset = '2px'; setTimeout(() => { try { el.style.outline = ''; el.style.outlineOffset = ''; } catch (_) {} }, 2200); } } catch (_) {}
                    return el;
                  };
                  const _apply = (item, replacement) => {
                    try {
                      const el = _locate(item, false);
                      const doc = exportPreviewRef.current && exportPreviewRef.current.contentDocument;
                      if (!el || !doc) { addToast(t('toasts.writing_block_gone') || 'That block is no longer in the preview — re-run the check.', 'info'); return; }
                      // Verify the text hasn't shifted since the check ran.
                      const cur = el.textContent || '';
                      if (cur.slice(item.start, item.end) !== item.bad) { addToast(t('toasts.writing_text_shifted') || 'The text changed since this check ran — re-run the check to apply safely.', 'info'); return; }
                      // Apply only when the span sits inside ONE text node, so
                      // inline markup (links, bold) can never be destroyed.
                      const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
                      let node, off = 0, hit = null;
                      while ((node = walker.nextNode())) {
                        const len = node.textContent.length;
                        if (item.start >= off && item.end <= off + len) { hit = { node, local: item.start - off }; break; }
                        off += len;
                      }
                      if (!hit) { _locate(item, true); addToast(t('toasts.writing_spans_markup') || 'This suggestion spans formatting (a link or bold text) — fix it by hand at the highlighted spot.', 'info'); return; }
                      const _badLen = item.end - item.start;
                      // Apply via the editable doc's insertText so the browser's NATIVE undo stack (and
                      // the toolbar Undo) can reverse it — a raw textContent assignment is not recorded,
                      // which is why Undo didn't work. Fall back to a direct write if execCommand can't run.
                      let _ok = false;
                      try {
                        const _range = doc.createRange();
                        _range.setStart(hit.node, hit.local);
                        _range.setEnd(hit.node, hit.local + _badLen);
                        const _sel = (doc.defaultView || window).getSelection();
                        _sel.removeAllRanges(); _sel.addRange(_range);
                        _ok = doc.execCommand('insertText', false, replacement);
                      } catch (_) { _ok = false; }
                      if (!_ok) { const raw = hit.node.textContent; hit.node.textContent = raw.slice(0, hit.local) + replacement + raw.slice(hit.local + _badLen); }
                      try { if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1'); } catch (_) {}
                      // Drop the applied card AND keep the OTHER suggestions valid: the edit shifts later
                      // offsets in the SAME block by (replacement − bad) length and invalidates overlaps —
                      // without this, sibling cards' frozen offsets drifted and every later Apply false-
                      // tripped the "text changed" guard (the reported bug).
                      const _delta = replacement.length - _badLen;
                      setWritingCheck((p) => {
                        if (!p || !p.items) return p;
                        const items = p.items.filter((x) => x !== item).map((x) => {
                          if (x.blockIndex !== item.blockIndex || x.end <= item.start) return x;
                          if (x.start >= item.end) return { ...x, start: x.start + _delta, end: x.end + _delta };
                          return null; // overlaps the edit → offsets no longer valid
                        }).filter(Boolean);
                        return { ...p, items };
                      });
                      addToast('✓ "' + item.bad + '" → "' + replacement + '"', 'success');
                    } catch (e) { addToast('Apply failed: ' + ((e && e.message) || 'error'), 'error'); }
                  };
                  const _dismiss = (item) => { setWritingCheck((p) => p && p.items ? { ...p, items: p.items.filter((x) => x !== item) } : p); };
                  return (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">📝 {t('export_preview.writing.heading') || 'Writing Check'}</div>
                  <button onClick={runWritingCheck} data-help-key="doc_builder_writing_check_btn" disabled={wc && wc.status === 'loading'} aria-busy={!!(wc && wc.status === 'loading')} className="w-full px-3 py-2 bg-teal-100 text-teal-800 rounded-lg text-xs font-bold hover:bg-teal-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                    {wc && wc.status === 'loading' ? (t('export_preview.writing.checking') || '⏳ Checking… (first run downloads the checker)') : (t('export_preview.writing.run') || '📝 Check grammar (English)')}
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">{t('export_preview.writing.disclosure') || 'Runs entirely on this device — no text leaves the browser. English only; the checker is a ~10 MB download on first use (checks are instant once loaded; the download may repeat in a fresh session). Spelling is underlined by your browser as you type.'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{t('export_preview.writing.spell_hint') || '💡 To fix a spelling underline, right-click the word in the preview — your browser lists corrections.'}</p>
                  {exportPreviewSource === 'remediation' && wc && (
                    <p className="text-[10px] text-amber-700 mt-1">{t('export_preview.writing.remediation_caution') || '⚠ This is a remediated document — its wording comes from the source PDF. Apply grammar changes thoughtfully; the original author’s phrasing may be intentional.'}</p>
                  )}
                  {wc && wc.status === 'error' && <div className="mt-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5">{wc.error}</div>}
                  {wc && wc.status === 'done' && wc.items.length === 0 && <div className="mt-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded p-1.5">✓ {t('export_preview.writing.clean') || 'No grammar suggestions found.'}</div>}
                  {wc && wc.status === 'done' && wc.items.length > 0 && (
                    <div className="mt-1.5 space-y-1.5 max-h-64 overflow-y-auto">
                      <div className="text-[10px] font-bold text-slate-600">{wc.items.length} {t('export_preview.writing.suggestions') || 'suggestion(s)'}{wc.capped ? ' (first 150 shown)' : ''} — {t('export_preview.writing.suggestions_note') || 'nothing is changed unless you Apply it'}:</div>
                      {wc.items.map((item, ii) => (
                        <div key={ii} className="bg-white border border-slate-200 rounded-lg p-1.5 text-[11px]">
                          <button onClick={() => _locate(item, true)} className="text-left w-full hover:underline" title={t('export_preview.writing.locate_title') || 'Scroll the preview to this spot'}>
                            <span className="text-slate-700">{item.message}</span>
                            <span className="block text-slate-500 italic mt-0.5">{item.snippet}</span>
                          </button>
                          <div className="flex gap-1 mt-1 flex-wrap items-center">
                            {item.suggestions.map((s, si) => (
                              <button key={si} onClick={() => _apply(item, s)} className="px-1.5 py-0.5 bg-teal-50 border border-teal-300 text-teal-800 rounded text-[10px] font-bold hover:bg-teal-100" title={(t('export_preview.writing.apply_title') || 'Replace') + ' "' + item.bad + '"'}>→ {s || '(remove)'}</button>
                            ))}
                            <button onClick={() => _dismiss(item)} className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-100 ml-auto" title={t('export_preview.writing.keep_title') || 'Keep the original wording and dismiss this suggestion'}>✓ {t('export_preview.writing.keep') || 'Keep as-is'}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  );
                })()}

                {/* ── Accessibility Audit ── */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">♿ Accessibility Audit</div>
                  <button
                    onClick={async () => {
                      setExportAuditLoading(true); setExportAuditResult(null);
                      try {
                        const iframe = exportPreviewRef.current;
                        const doc = iframe?.contentDocument;
                        const html = doc ? doc.documentElement.outerHTML : getExportPreviewHTML();
                        // IBM Equal Access — the SECOND deterministic engine, so the export audit gets the
                        // same two-engine consensus the PDF-remediation pipeline uses (axe-core + IBM ace).
                        // The audit engines only touch window/document/fetch (not the AI deps), so borrow
                        // runEqualAccessAudit from the doc-pipeline factory with stub deps and cache the
                        // instance. Fail-soft: if the engine can't load, the report degrades to axe-only.
                        let _runEA = null;
                        try {
                          const _mk = window.AlloModules && window.AlloModules.createDocPipeline;
                          if (_mk) {
                            const _inst = window.__alloAuditPipeline || (window.__alloAuditPipeline = _mk({
                              callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
                              addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => '',
                            }));
                            if (_inst && typeof _inst.runEqualAccessAudit === 'function') _runEA = _inst.runEqualAccessAudit;
                          }
                        } catch (_) { /* no second engine available — axe + AI still run */ }
                        const [aiResult, axeResult, eaResult] = await Promise.all([
                          auditOutputAccessibility(html),
                          runAxeAudit(html).catch(() => null),
                          _runEA ? _runEA(html).catch(() => null) : Promise.resolve(null)
                        ]);
                        const combined = aiResult || { score: 0, summary: '', issues: [], passes: [] };
                        if (axeResult) {
                          combined.axeViolations = axeResult.totalViolations;
                          combined.axePasses = axeResult.totalPasses;
                          combined.axeDetails = axeResult.critical.concat(axeResult.serious).concat(axeResult.moderate);
                          combined.summary = (combined.summary || '') + ` | axe-core: ${axeResult.totalViolations} violations, ${axeResult.totalPasses} passed`;
                        }
                        if (eaResult) {
                          combined.eaViolations = eaResult.failViolations;
                          combined.eaPotential = eaResult.potentialViolations;
                          combined.summary = (combined.summary || '') + ` | IBM Equal Access: ${eaResult.failViolations} violations`;
                        }
                        // Two-engine deterministic consensus: both rule engines ran AND both found zero.
                        if (axeResult && eaResult) {
                          combined.deterministicConsensus = (axeResult.totalViolations === 0 && eaResult.failViolations === 0) ? 'clean' : 'issues';
                        }
                        setExportAuditResult(combined);
                      } catch (e) { setExportAuditResult({ score: -1, summary: 'Audit failed', issues: [], passes: [] }); }
                      setExportAuditLoading(false);
                    }}
                    disabled={exportAuditLoading}
                    data-help-key="doc_builder_wcag_audit_btn"
                    aria-busy={exportAuditLoading}
                    className="w-full px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {exportAuditLoading ? <><RefreshCw size={12} className="animate-spin" aria-hidden="true" /> Auditing...</> : <><span aria-hidden="true">♿</span> Run WCAG Audit</>}
                  </button>
                  {exportAuditResult && exportAuditResult.score >= 0 && (
                    <div className="mt-2 space-y-2">
                      <div className={`text-center p-3 rounded-xl ${exportAuditResult.score >= 80 ? 'bg-green-50 border border-green-200' : exportAuditResult.score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className={`text-2xl font-black ${exportAuditResult.score >= 80 ? 'text-green-700' : exportAuditResult.score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{exportAuditResult.score}/100</div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase">WCAG 2.1 AA Score</div>
                      </div>
                      <p className="text-[11px] text-slate-600">{exportAuditResult.summary}</p>
                      {(exportAuditResult.axeViolations != null && exportAuditResult.eaViolations != null) && (
                        <div className={`rounded-lg border p-2 text-[11px] ${exportAuditResult.deterministicConsensus === 'clean' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                          {exportAuditResult.deterministicConsensus === 'clean'
                            ? '✓ Two independent rule engines agree (axe-core + IBM Equal Access): 0 violations.'
                            : `Rule engines — axe-core: ${exportAuditResult.axeViolations}, IBM Equal Access: ${exportAuditResult.eaViolations} violation(s).`}
                          {exportAuditResult.eaPotential > 0 && <span className="block mt-1 text-slate-500">IBM Equal Access also flags {exportAuditResult.eaPotential} item(s) for human review.</span>}
                        </div>
                      )}
                      {(exportAuditResult.eaViolations == null && exportAuditResult.axeViolations != null) && (
                        <div className="text-[10px] text-slate-500 italic">Second deterministic engine (IBM Equal Access) unavailable — showing axe-core only.</div>
                      )}
                      {exportAuditResult.issues?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-red-600 uppercase mb-1">Issues ({exportAuditResult.issues.length})</div>
                          {exportAuditResult.issues.slice(0, 5).map((issue, i) => (
                            <div key={i} className="text-[11px] text-slate-600 mb-1 flex items-start gap-1">
                              <span className="text-red-600 shrink-0">●</span>
                              <span>{typeof issue === 'string' ? issue : issue.issue}{issue.wcag ? ` (${issue.wcag})` : ''}</span>
                            </div>
                          ))}
                          {exportAuditResult.issues.length > 5 && <div className="text-[11px] text-slate-600 italic">+{exportAuditResult.issues.length - 5} more</div>}
                        </div>
                      )}
                      {exportAuditResult.passes?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-green-600 uppercase mb-1">Passes ({exportAuditResult.passes.length})</div>
                          {exportAuditResult.passes.slice(0, 3).map((pass, i) => (
                            <div key={i} className="text-[11px] text-green-700 mb-0.5 flex items-start gap-1"><span className="text-green-500">✓</span> {pass}</div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-indigo-500 italic">Use the A11y Inspect toggle above to see and fix issues visually, then re-audit.</p>
                      <p className="text-[11px] text-slate-500 italic">Automated checks (axe-core + IBM Equal Access) find many problems but can’t confirm full WCAG 2.1 AA conformance — a manual screen-reader + keyboard pass is still needed. The score above includes an AI review and is a guide, not a certification.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Panel — Live Preview with Editing */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-700">Live Preview</h3>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">{exportPreviewMode === 'worksheet' ? 'Worksheet' : exportPreviewMode === 'html' ? 'HTML' : exportPreviewMode === 'slides' ? 'Slides' : 'PDF'}</span>
                    <span className="text-[11px] text-indigo-500 font-medium">Click text to edit directly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Editing toolbar */}
                    <button onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file'; input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const iframe = exportPreviewRef.current;
                          const doc = iframe?.contentDocument;
                          if (!doc) return;
                          const img = doc.createElement('img');
                          img.src = ev.target.result;
                          img.style.cssText = 'max-width:100%;height:auto;border-radius:8px;margin:12px 0;cursor:move;';
                          img.alt = 'User-inserted image';
                          const sel = doc.getSelection();
                          if (sel && sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            range.collapse(false);
                            range.insertNode(img);
                          } else {
                            const main = doc.querySelector('main') || doc.body;
                            main.appendChild(img);
                          }
                          addToast && addToast('Image inserted! Drag to reposition.');
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }} className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100" title="Insert image into document">
                      <ImageIcon size={12} /> Add Image
                    </button>
                    <div className="w-px h-5 bg-slate-200"></div>
                    <button onClick={toggleA11yInspect}
                      className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${a11yInspectMode ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'text-slate-600 hover:text-violet-600 hover:bg-slate-100'}`}
                      title="Toggle accessibility inspector — shows heading hierarchy, alt text, ARIA labels, table structure, and input labels. Click any badge to edit.">
                      ♿ A11y Inspect
                    </button>
                    {/* Diff view entry point for the remediated-PDF pathway of Document Builder.
                        Only shown when a PDF remediation result is loaded (pdfFixResult.sourceText
                        + finalText present). The AlloFlow-generated pathway has no source PDF to
                        compare against, so the button stays hidden in that mode. */}
                    {pdfFixResult && pdfFixResult.sourceText && pdfFixResult.finalText && (
                      <button
                        onClick={async () => {
                                            try { if (typeof window !== 'undefined') { window._diffDiagnostic = window._diffDiagnostic || []; window._diffDiagnostic.push({ ts: new Date().toISOString(), msg: 'button clicked', source: 'click', diffLibReady, hasWindowDiff: !!window.Diff, hasResult: !!pdfFixResult, srcLen: pdfFixResult && pdfFixResult.sourceText ? pdfFixResult.sourceText.length : null, finLen: pdfFixResult && pdfFixResult.finalText ? pdfFixResult.finalText.length : null }); console.warn('[Diff] button clicked — diffLibReady=' + diffLibReady + ', window.Diff=' + !!window.Diff); } } catch (_) {}
                                            setDiffViewOpen(true);
                                            const ok = await _ensureDiffLib();
                                            if (!ok) {
                                              console.warn('[Diff] _ensureDiffLib returned false — script load failed');
                                              if (typeof addToast === 'function') addToast('Diff engine failed to load (network blocked?). Check your connection and try again.', 'error');
                                            }
                                          }}
                        className="text-xs font-bold flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all"
                        title="Open the word-level diff view comparing the source PDF text to the remediated HTML — see every insertion, deletion, and paraphrase with click-to-reject."
                        aria-label="Open word-level diff view between source PDF and remediated HTML"
                      >
                        📝 Diff
                      </button>
                    )}
                    <div className="w-px h-5 bg-slate-200"></div>
                                        {exportAuditResult && exportAuditResult.score >= 0 && <span className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${exportAuditResult.score >= 90 ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : exportAuditResult.score >= 70 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-red-100 text-red-700 ring-1 ring-red-300'}`} title={exportAuditResult.summary || ''}>{"♿"} {exportAuditResult.score}/100</span>}
<button onClick={updateExportPreview} className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"><RefreshCw size={12} /> Regenerate</button>
                    <button onClick={executeExportFromPreview}
                      disabled={exportPreviewMode === 'slides' && !pptxLoaded}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={exportPreviewMode === 'slides' && !pptxLoaded ? 'Slides library still loading...' : ''}
                    ><Download size={14} /> {exportPreviewMode === 'worksheet' ? 'Print Worksheet' : exportPreviewMode === 'html' ? 'Download HTML' : exportPreviewMode === 'slides' ? (pptxLoaded ? 'Export Slides' : 'Loading...') : 'Download PDF'}</button>
                    {/* Alternative format exports */}
                    <details className="relative">
                      <summary className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-colors list-none">
                        ♿ Alt Formats <span className="text-[11px] text-slate-600">▾</span>
                      </summary>
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-400 rounded-xl shadow-xl p-2 z-50 w-48 space-y-1">
                        <button onClick={() => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          const html = doc.documentElement.outerHTML;
                          const text = html.replace(/<[^>]*>/g, '\n').replace(/&[^;]+;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
                          const blob = new Blob([text], { type: 'text/plain' });
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.txt'; a.click(); URL.revokeObjectURL(a.href);
                          addToast('Plain text downloaded', 'success');
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg">📄 Plain Text (.txt)</button>
                        <button onClick={() => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          const html = doc.documentElement.outerHTML;
                          let md = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n').replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n').replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n').replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                            .replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
                          const blob = new Blob([md], { type: 'text/markdown' });
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.md'; a.click(); URL.revokeObjectURL(a.href);
                          addToast('Markdown downloaded', 'success');
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg">📝 Markdown (.md)</button>
                        <button onClick={async () => {
                          // Send to NotebookLM: build a NotebookLM-tuned Markdown source from the
                          // structured lesson `history` (front matter + one ## section per resource,
                          // quiz answer keys, glossary/outline/timeline), falling back to converting
                          // the rendered preview HTML when no structured lesson is loaded. Copy to
                          // clipboard (NotebookLM's lowest-friction "paste a source" path) AND download
                          // a .md (for the "upload a source" path) — whichever the user prefers.
                          try {
                            const doc = exportPreviewRef.current?.contentDocument;
                            const items = Array.isArray(history) ? history.filter(h => h && h.data != null) : [];
                            const today = new Date().toISOString().split('T')[0];
                            const title = (exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle)) || (doc && doc.title) || (items[0] && items[0].title) || 'AlloFlow Lesson';
                            const esc = (v) => (v == null ? '' : String(v));
                            const out = ['---', 'title: ' + esc(title), 'source: AlloFlow (Universal Design for Learning toolkit)', 'date_exported: ' + today, '---', '', '# ' + esc(title), ''];
                            if (items.length) {
                              items.forEach(it => {
                                const ty = it.type, d = it.data;
                                out.push('## ' + esc(it.title || (ty ? ty.charAt(0).toUpperCase() + ty.slice(1).replace(/[-_]/g, ' ') : 'Resource')), '');
                                if (typeof d === 'string') { out.push(d.trim(), ''); }
                                else if (ty === 'glossary' && Array.isArray(d)) {
                                  d.forEach(g => { if (!g) return; out.push('- **' + esc(g.term) + '** — ' + esc(g.def));
                                    if (g.translations && Object.keys(g.translations).length) out.push('  - _Translations:_ ' + Object.values(g.translations).map(t => esc(t)).join(' / '));
                                    if (g.etymology) out.push('  - _Etymology:_ ' + esc(g.etymology)); });
                                  out.push('');
                                }
                                else if (ty === 'quiz' && d && Array.isArray(d.questions)) {
                                  d.questions.forEach((q, i) => { out.push('**Q' + (i + 1) + '. ' + esc(q.question) + '**', '');
                                    (q.options || []).forEach((o, k) => out.push(String.fromCharCode(65 + k) + '. ' + esc(o))); out.push(''); });
                                  out.push('### Answer Key', '');
                                  d.questions.forEach((q, i) => { const li = Array.isArray(q.options) ? q.options.indexOf(q.correctAnswer) : -1;
                                    out.push('- **Q' + (i + 1) + ':** ' + (li >= 0 ? String.fromCharCode(65 + li) + '. ' : '') + esc(q.correctAnswer));
                                    if (q.factCheck) out.push('  - ' + esc(q.factCheck)); });
                                  out.push('');
                                }
                                else if (ty === 'outline' && d && Array.isArray(d.branches)) {
                                  if (d.main) out.push('**' + esc(d.main) + '**', '');
                                  d.branches.forEach(b => { if (!b) return; out.push('- ' + esc(b.title));
                                    if (Array.isArray(b.items)) b.items.forEach(s => out.push('  - ' + esc(s))); });
                                  out.push('');
                                }
                                else if (ty === 'timeline' && Array.isArray(d)) {
                                  d.forEach(e => { if (e) out.push('- **' + esc(e.date) + ':** ' + esc(e.event)); }); out.push('');
                                }
                                else if (ty === 'concept-sort' && d && Array.isArray(d.categories)) {
                                  const its = Array.isArray(d.items) ? d.items : [];
                                  d.categories.forEach(c => { if (!c) return; out.push('### ' + esc(c.label));
                                    its.filter(x => x && x.categoryId === c.id).forEach(x => out.push('- ' + esc(x.content))); out.push(''); });
                                }
                                else if (ty === 'image' && d && d.prompt) { out.push('_Image: ' + esc(d.prompt) + '_', ''); }
                                else { const tx = (d && (d.text || d.content || d.summary)) || ''; if (tx) out.push(esc(tx).trim(), ''); }
                              });
                            } else if (doc) {
                              const html = doc.documentElement.outerHTML;
                              const body = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n').replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n').replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n').replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n').replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n').replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*').replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
                              out.push(body);
                            } else { addToast('Nothing to export yet — generate a lesson first', 'error'); return; }
                            const md = out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
                            let copied = false;
                            try { copied = window.alloCopyText ? await window.alloCopyText(md) : false; } catch (_) {}
                            const blob = new Blob([md], { type: 'text/markdown' });
                            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                            const safe = esc(title).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').substring(0, 40) || 'lesson';
                            a.download = safe + '-notebooklm.md'; a.click(); URL.revokeObjectURL(a.href);
                            addToast(copied ? 'Copied to clipboard + downloaded .md — paste or upload into NotebookLM as a source' : 'Downloaded .md — upload it into NotebookLM as a source', 'success');
                          } catch (e) { if (addToast) addToast('NotebookLM export failed', 'error'); }
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg">📓 Send to NotebookLM (.md)</button>
                        <button onClick={() => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc || !window.JSZip) { addToast('ePub library loading...', 'info'); return; }
                          const html = doc.documentElement.outerHTML;
                          const title = 'AlloFlow Document';
                          const xmlTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                          const zip = new window.JSZip();
                          zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
                          zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
                          zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">alloflow-${Date.now()}</dc:identifier><dc:title>${xmlTitle}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="content"/></spine></package>`);
                          let xhtml = html.replace(/<br>/g, '<br/>').replace(/<hr>/g, '<hr/>').replace(/<img([^>]*[^/])>/g, '<img$1/>').replace(/&nbsp;/g, '&#160;');
                          if (!xhtml.includes('xmlns')) xhtml = xhtml.replace('<html', '<html xmlns="http://www.w3.org/1999/xhtml"');
                          zip.file('OEBPS/content.xhtml', xhtml);
                          zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Navigation</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="content.xhtml">Document</a></li></ol></nav></body></html>`);
                          zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' }).then(blob => {
                            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = title + '.epub'; a.click(); URL.revokeObjectURL(a.href);
                            addToast('ePub downloaded', 'success');
                          });
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg">📚 ePub (e-readers)</button>
                        <button onClick={() => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          const text = doc.body.innerText || doc.body.textContent || '';
                          // Real ASCII Braille (BRF), Grade 1 / uncontracted (audit 2026-06-13):
                          // a .brf must be ASCII braille (the 0x20–0x5F North-American Braille
                          // Computer Code), NOT Unicode braille patterns — embossers and braille
                          // displays read the ASCII bytes. Capital sign (,) before each capital;
                          // number sign (#) before a digit run with 1-0 → A-J; standard BRF
                          // punctuation. Pages separated by form feed.
                          const _brfDigit = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J' };
                          const _brfPunct = { ',': '1', ';': '2', ':': '3', '.': '4', '!': '6', '?': '8', '(': '7', ')': '7', '"': '7', "'": "'", '-': '-', '/': '/', '*': '9', '&': '&', '@': '@', '#': '#' };
                          const _toBRF = (src) => {
                            const lines = src.replace(/\r\n?/g, '\n').split('\n');
                            const out = [];
                            for (const line of lines) {
                              let bl = ''; let numMode = false;
                              for (let i = 0; i < line.length; i++) {
                                const ch = line[i];
                                if (ch >= '0' && ch <= '9') { if (!numMode) { bl += '#'; numMode = true; } bl += _brfDigit[ch]; continue; }
                                numMode = false;
                                if (ch >= 'a' && ch <= 'z') { bl += ch.toUpperCase(); continue; }
                                if (ch >= 'A' && ch <= 'Z') { bl += ',' + ch; continue; }
                                if (ch === ' ' || ch === '\t') { bl += ' '; continue; }
                                bl += (_brfPunct[ch] !== undefined ? _brfPunct[ch] : (ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7e ? ch.toUpperCase() : ''));
                              }
                              out.push(bl.slice(0, 40)); // 40-cell line wrap (embosser default); long lines truncate-wrap below
                              if (bl.length > 40) { let rest = bl.slice(40); while (rest.length) { out.push(rest.slice(0, 40)); rest = rest.slice(40); } }
                            }
                            return out.join('\r\n');
                          };
                          const brf = _toBRF(text);
                          const blob = new Blob([brf], { type: 'application/x-brf' });
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.brf'; a.click(); URL.revokeObjectURL(a.href);
                          addToast('Electronic Braille (BRF) downloaded', 'success');
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg">⠿ Electronic Braille (.brf)</button>
                      </div>
                    </details>
                  </div>
                </div>
                {/* Formatting toolbar */}
                <div className="px-2 py-1 bg-white border-b border-slate-200 flex items-center gap-0.5 flex-wrap shrink-0" role="toolbar" aria-label={t("a11y.text_formatting")}>
                  {[
                    { cmd: 'bold', icon: 'B', label: 'Bold', style: 'font-bold' },
                    { cmd: 'italic', icon: 'I', label: 'Italic', style: 'italic' },
                    { cmd: 'underline', icon: 'U', label: 'Underline', style: 'underline' },
                  ].map(btn => (
                    <button key={btn.cmd} onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand(btn.cmd, false, null); }}
                      className={`w-7 h-7 rounded text-xs ${btn.style} text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600`}
                      aria-label={btn.label} title={btn.label}>{btn.icon}</button>
                  ))}
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  {[
                    { cmd: 'formatBlock', val: '<h2>', icon: 'H2', label: 'Heading 2' },
                    { cmd: 'formatBlock', val: '<h3>', icon: 'H3', label: 'Heading 3' },
                    { cmd: 'formatBlock', val: '<p>', icon: '¶', label: 'Paragraph' },
                  ].map(btn => (
                    <button key={btn.icon} onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand(btn.cmd, false, btn.val); }}
                      className="px-1.5 h-7 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600"
                      aria-label={btn.label} title={btn.label}>{btn.icon}</button>
                  ))}
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('insertUnorderedList', false, null); }}
                    className="w-7 h-7 rounded text-xs text-slate-600 hover:bg-indigo-100 transition-colors" aria-label={t("a11y.bullet_list")} title="Bullet list">•</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('insertOrderedList', false, null); }}
                    className="w-7 h-7 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Numbered list" title="Numbered list">1.</button>
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (!doc) return; const url = prompt('Link URL:'); if (!url) return;
                    // Scheme allowlist (builder-review A4, 2026-07-01): createLink accepted ANY URI —
                    // "javascript:alert(1)" became a live link inside the allow-scripts editor iframe
                    // AND survived into the exported/distributed HTML. Allow web/mail/tel/anchor/
                    // relative links only; anything else is refused with a message, never inserted.
                    const _u = url.trim();
                    const _schemeMatch = _u.match(/^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/);
                    const _okScheme = !_schemeMatch || ['http', 'https', 'mailto', 'tel'].includes(_schemeMatch[1].toLowerCase());
                    if (!_okScheme) { alert('Only web (http/https), mailto:, tel:, and internal links are allowed.'); return; }
                    doc.execCommand('createLink', false, _u); }}
                    className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Insert link" title="Insert link">🔗</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('removeFormat', false, null); }}
                    className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Clear formatting" title="Clear formatting">✕</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('undo', false, null); }}
                    className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Undo" title="Undo">↩</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('redo', false, null); }}
                    className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Redo" title="Redo">↪</button>
                  <select onChange={(e) => { const doc = exportPreviewRef.current?.contentDocument; if (doc && e.target.value) doc.execCommand('foreColor', false, e.target.value); e.target.value = ''; }}
                    className="h-7 text-[11px] border border-slate-400 rounded px-1 text-slate-600 ml-0.5" aria-label="Text color" defaultValue="">
                    <option value="" disabled>Color</option>
                    <option value="#000000">⬛ Black</option>
                    <option value="#1e3a5f">🟦 Navy</option>
                    <option value="#991b1b">🟥 Red</option>
                    <option value="#166534">🟩 Green</option>
                    <option value="#7c3aed">🟪 Purple</option>
                  </select>
                </div>
                {/* ── Expert Workbench: Command Bar + Agent Activity (collapsible) ── */}
                <details open className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-600 group">
                  <summary className="cursor-pointer px-2 py-1.5 flex items-center gap-2 list-none select-none hover:bg-slate-800/50">
                    <span className="inline-block transition-transform group-open:rotate-90 text-slate-600 text-[10px]">▸</span>
                    <span className="text-[11px] text-purple-700 font-bold shrink-0">{isAgentRunning ? '🤖 Agent' : '⌨️ Expert'}</span>
                    {isAgentRunning && <span className="text-[11px] text-amber-700 animate-pulse">Running...</span>}
                    <span className="ml-auto text-[10px] text-slate-500">{agentActivityLog.length > 0 ? `${agentActivityLog.length} event${agentActivityLog.length === 1 ? '' : 's'}` : 'idle'}</span>
                  </summary>
                  <div className="px-2 pb-1.5">
                  <form className="flex-1 flex gap-1" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!expertCommandInput.trim() || isAgentRunning) return;
                    const cmd = expertCommandInput.trim();
                    setExpertCommandInput('');
                    setIsAgentRunning(true);
                    console.info('[ExpertWorkbench] start command=' + JSON.stringify(cmd) + ' context=export-preview');
                    addToast(`🤖 Workbench running: ${cmd}`, 'info');
                    setAgentActivityLog(prev => [...prev, { text: '▶ ' + cmd, type: 'command', time: new Date().toLocaleTimeString() }]);
                    try {
                      const iframe = exportPreviewRef.current;
                      const doc = iframe?.contentDocument;
                      const currentHtml = doc ? ('<!DOCTYPE html>\n' + doc.documentElement.outerHTML) : getExportPreviewHTML();
                      const result = await processExpertCommand(cmd, currentHtml, {
                        onProgress: (msg) => { /* could update UI */ },
                        onActivity: (entry) => {
                          console.info('[ExpertWorkbench] activity type=' + entry.type + ' text=' + entry.text);
                          setAgentActivityLog(prev => [...prev, entry]);
                        }
                      });
                      if (result && result.html && result.html !== currentHtml && doc) {
                        doc.open(); doc.write(result.html); doc.close();
                        doc.designMode = 'on';
                        if (result.score !== undefined) {
                          setAgentActivityLog(prev => [...prev, { text: '📊 Score: ' + result.score + '/100', type: 'score', time: new Date().toLocaleTimeString() }]);
                        }
                        console.info('[ExpertWorkbench] complete command=' + JSON.stringify(cmd) + ' score=' + (result.score !== undefined ? result.score : 'n/a'));
                        addToast('✅ Command applied!', 'success');
                      } else {
                        console.warn('[ExpertWorkbench] noop command=' + JSON.stringify(cmd) + ' — no HTML changes');
                        setAgentActivityLog(prev => [...prev, { text: 'ℹ No changes applied', type: 'info', time: new Date().toLocaleTimeString() }]);
                        addToast('ℹ️ No changes applied', 'info');
                      }
                    } catch (err) {
                      console.error('[ExpertWorkbench] error command=' + JSON.stringify(cmd), err);
                      setAgentActivityLog(prev => [...prev, { text: '❌ ' + (err && (err.message || err)), type: 'error', time: new Date().toLocaleTimeString() }]);
                      addToast('❌ Workbench failed: ' + (err && (err.message || err) || 'unknown error'), 'error');
                    }
                    setIsAgentRunning(false);
                  }}>
                    <input
                      type="text"
                      value={expertCommandInput}
                      onChange={(e) => setExpertCommandInput(e.target.value)}
                      placeholder={isAgentRunning ? 'Agent working...' : 'Type command: audit, auto, or natural language...'}
                      disabled={isAgentRunning}
                      aria-label="Expert remediation command"
                      className="flex-1 px-2 py-1 bg-slate-700 text-white text-[11px] rounded border border-slate-600 placeholder-slate-500 focus:ring-1 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
                    />
                    <button type="submit" disabled={isAgentRunning || !expertCommandInput.trim()}
                      className="px-2 py-1 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-30 transition-colors"
                      aria-label="Execute command"
                    >{isAgentRunning ? '⏳' : '▶'}</button>
                  </form>
                  </div>
                </details>
                {/* Agent Activity Feed */}
                {agentActivityLog.length > 0 && (
                  <div className="bg-slate-900 border-b border-slate-700">
                    <div className={(agentLogFullView ? 'max-h-64' : 'max-h-24') + ' overflow-y-auto px-2 py-1 space-y-0.5 text-[11px] font-mono'} aria-live="polite" aria-label="Agent activity log">
                      {(agentLogFullView ? agentActivityLog : agentActivityLog.slice(-8)).map((entry, i) => (
                        <div key={i} className={'flex items-start gap-1 ' + (entry.type === 'error' ? 'text-red-400' : entry.type === 'score' ? 'text-cyan-300' : entry.type === 'success' || entry.type === 'complete' ? 'text-green-400' : entry.type === 'tool' ? 'text-amber-300' : entry.type === 'command' ? 'text-purple-300' : 'text-slate-400')}>
                          <span className="text-slate-600 shrink-0">{entry.time}</span>
                          <span>{entry.text}</span>
                        </div>
                      ))}
                      {isAgentRunning && <div className="text-purple-400 animate-pulse">⏳ Processing...</div>}
                    </div>
                    <div className="flex items-center gap-3 px-2 py-1 border-t border-slate-800">
                      <button type="button" onClick={() => setAgentLogFullView(v => !v)} className="text-[10px] text-purple-300 hover:text-purple-200 underline">
                        {agentLogFullView ? 'Show recent only' : `Show full log (${agentActivityLog.length})`}
                      </button>
                      <button type="button" onClick={async () => {
                        const text = agentActivityLog.map(e => ((e && e.time ? e.time + ' ' : '') + ((e && e.text) || ''))).join('\n');
                        let ok = false;
                        try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch (_) { ok = false; }
                        if (!ok) { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.focus(); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta); } catch (_) { ok = false; } }
                        addToast(ok ? ('📋 Log copied (' + agentActivityLog.length + ' events)') : 'Could not copy — select the log text manually.', ok ? 'success' : 'error');
                      }} className="text-[10px] text-cyan-300 hover:text-cyan-200 underline" title="Copy the full agent/pipeline log to the clipboard">📋 Copy log</button>
                      <button type="button" onClick={() => { setAgentActivityLog([]); console.info('[ExpertWorkbench] log cleared'); }} className="text-[10px] text-slate-500 hover:text-slate-300 underline ml-auto">Clear</button>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                  <iframe
                    ref={exportPreviewRef}
                    title="Export Preview — click any text to edit"
                    className="w-full h-full bg-white rounded-lg shadow-inner border border-slate-400"
                    sandbox="allow-same-origin allow-scripts allow-forms"
                    onLoad={() => {
                      console.info('[ExportPreview] iframe loaded');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
  );
}
