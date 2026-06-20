/**
 * AlloFlow — Educator Hub Modal Module
 *
 * Professional tools modal for educators/clinicians. Entry points for
 * AccessibilityLab, CommunityCatalog, SymbolStudio, BehaviorLens,
 * ReportWriter, PDF audit/batch flow.
 *
 * Extracted from AlloFlowANTI.txt lines 23679-23791 (May 2026).
 * ~113 lines, 17 deps.
 */
function EducatorHubModal(props) {
  const {
    handleFileUpload, openExportPreview, pdfAuditResult, pdfFixLoading, pdfFixResult,
    setIsAccessibilityLabOpen, setIsCommunityCatalogOpen, setIsSymbolStudioOpen,
    setPdfAuditResult, setPdfBatchMode, setPendingPdfBase64, setPendingPdfFile,
    setShowBehaviorLens, setShowEducatorHub, setShowReportWriter, setShowCinematicStudio = (() => {}), showEducatorHub, t,
    // Phase A.3 polish (May 12 2026): renamed from setPdfBatchFiles (which was
    // never defined in host scope). The real host setter is setPdfBatchQueue,
    // matching the batch-files array shape stored in `pdfBatchQueue` state.
    setPdfBatchQueue = (() => {}),
    // Dynamic Assessment Studio entry — added May 2026. Optional so legacy
    // hosts that haven't wired the setter still render the rest of the hub.
    setIsDynamicAssessmentOpen = (() => {}),
    // Lumen launcher — opens the STEM Lab on the Lumen tool (Lumen is plugin-only,
    // so this card is its primary UI entry point). Optional defaults so a host that
    // hasn't wired the STEM-Lab setters still renders the rest of the hub.
    setShowStemLab = (() => {}),
    setStemLabTool = (() => {}),
    // Lesson-builder card (2026-06-13): opens the AlloBot guided lesson flow. The host
    // passes a closure mirroring startLessonFlow({}) (show bot + trigger Auto-Fill).
    // Optional default so legacy hosts that don't pass it still render the hub.
    startLessonFlow = (() => {}),
  } = props;

  // ── Platform Check (2026-06-12) ──
  // The app's primary surface is the Gemini Canvas sandboxed iframe, where
  // platform capabilities differ from a normal browser in ways our test
  // gates can't see (IndexedDB/localStorage don't persist across sessions —
  // maintainer-verified; popups, WASM, dialogs, downloads are all sandbox-
  // sensitive). This one-click probe turns those unknowns into a copyable
  // PASS/FAIL report, so feature decisions rest on platform FACTS.
  const [platProbe, setPlatProbe] = React.useState(null);
  const _runPlatformProbe = async () => {
    const rows = [];
    const add = (name, status, detail) => rows.push({ name, status, detail: String(detail || '') });
    try {
      let origin = 'unknown'; try { origin = window.location.origin; } catch (_) {}
      let inFrame = 'unknown'; try { inFrame = window.top === window ? 'no (top window)' : 'yes'; } catch (_) { inFrame = 'yes (cross-origin parent)'; }
      add('Context', 'info', 'origin: ' + origin + ' · in iframe: ' + inFrame + ' · secure: ' + (typeof isSecureContext !== 'undefined' ? isSecureContext : '?'));
    } catch (e) { add('Context', 'info', 'unreadable: ' + e.message); }
    try {
      const w = window.open('', '_blank', 'width=80,height=60');
      if (w) { try { w.close(); } catch (_) {} add('Pop-up windows', 'pass', 'window.open works — compare view + Save-as-PDF can open'); }
      else add('Pop-up windows', 'fail', 'window.open returned null — the compare view and the print flow CANNOT open here');
    } catch (e) { add('Pop-up windows', 'fail', 'window.open threw: ' + e.message); }
    try {
      new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
      add('WebAssembly', 'pass', 'compiles — Writing Check + OCR can run');
    } catch (e) { add('WebAssembly', 'fail', 'cannot compile: ' + e.message); }
    // Marker trick: each run looks for the PREVIOUS run's marker, which
    // empirically answers cross-session persistence over time.
    try {
      const prior = localStorage.getItem('allo_platform_probe_marker');
      localStorage.setItem('allo_platform_probe_marker', new Date().toISOString());
      if (localStorage.getItem('allo_platform_probe_marker')) {
        add('localStorage (this session)', 'pass', 'write + read OK');
        add('localStorage (across sessions)', prior ? 'pass' : 'warn', prior ? ('marker from a previous run found (' + prior.slice(0, 19) + ') — storage persisted') : 'no marker from a previous run — first probe here, or storage was wiped between sessions. Run again in a NEW session to confirm.');
      } else add('localStorage (this session)', 'fail', 'wrote but could not read back');
    } catch (e) { add('localStorage (this session)', 'fail', e.message); }
    try {
      const idb = await new Promise((resolve) => {
        const to = setTimeout(() => resolve({ status: 'fail', detail: 'open timed out (3s)' }), 3000);
        try {
          const req = indexedDB.open('allo_platform_probe', 1);
          req.onupgradeneeded = () => { try { req.result.createObjectStore('kv'); } catch (_) {} };
          req.onerror = () => { clearTimeout(to); resolve({ status: 'fail', detail: 'open error: ' + (req.error && req.error.message) }); };
          req.onsuccess = () => {
            try {
              const db = req.result;
              const tx = db.transaction('kv', 'readwrite');
              const st = tx.objectStore('kv');
              const get = st.get('marker');
              get.onsuccess = () => {
                const prior = get.result;
                st.put(new Date().toISOString(), 'marker');
                tx.oncomplete = () => { clearTimeout(to); try { db.close(); } catch (_) {} resolve({ status: 'pass', detail: prior ? ('works; marker from a previous run found (' + String(prior).slice(0, 19) + ') — persisted') : 'works this session; no prior marker — first probe here, or wiped between sessions. Re-run in a NEW session to confirm.' }); };
              };
              get.onerror = () => { clearTimeout(to); resolve({ status: 'fail', detail: 'read failed' }); };
            } catch (e) { clearTimeout(to); resolve({ status: 'fail', detail: e.message }); }
          };
        } catch (e) { clearTimeout(to); resolve({ status: 'fail', detail: e.message }); }
      });
      add('IndexedDB', idb.status, idb.detail);
    } catch (e) { add('IndexedDB', 'fail', e.message); }
    try {
      const u = URL.createObjectURL(new Blob(['probe'], { type: 'text/plain' }));
      const r = await fetch(u); const txt = await r.text(); URL.revokeObjectURL(u);
      add('Blob URLs (same window)', txt === 'probe' ? 'pass' : 'warn', txt === 'probe' ? 'create + fetch back OK' : 'fetched but content mismatched');
    } catch (e) { add('Blob URLs (same window)', 'fail', e.message); }
    try {
      const u = URL.createObjectURL(new Blob(['AlloFlow probe OK'], { type: 'text/plain' }));
      const a = document.createElement('a'); a.href = u; a.download = 'alloflow-platform-probe.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      add('File downloads', 'info', 'a tiny test file was triggered — if alloflow-platform-probe.txt appears in your Downloads, downloads work end-to-end');
    } catch (e) { add('File downloads', 'fail', e.message); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText('AlloFlow platform probe'); add('Clipboard (API)', 'pass', 'writeText OK'); }
      else add('Clipboard (API)', 'warn', 'navigator.clipboard unavailable');
    } catch (e) { add('Clipboard (API)', 'warn', 'writeText rejected: ' + String(e && e.message).slice(0, 120)); }
    // The execCommand fallback — what every copy button actually uses when
    // the API is policy-blocked (the Canvas case, probe-verified 2026-06-10).
    try {
      const ta = document.createElement('textarea');
      ta.value = 'AlloFlow probe'; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      add('Clipboard (fallback)', ok ? 'pass' : 'warn', ok ? 'execCommand copy works — copy buttons function even where the API is blocked' : 'execCommand returned false');
    } catch (e) { add('Clipboard (fallback)', 'fail', String(e && e.message).slice(0, 120)); }
    add('Dialogs (confirm/prompt)', 'info', 'typeof confirm = ' + (typeof window.confirm) + ' — use the "Test dialog" button for the real answer (a sandbox can define it but silently return false)');
    const cdns = [
      ['jsDelivr', 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/package.json'],
      ['unpkg', 'https://unpkg.com/pdf-lib@1.17.1/package.json'],
      ['cdnjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
      ['Google Fonts', 'https://fonts.googleapis.com/css2?family=Lexend&display=swap'],
    ];
    for (const pair of cdns) {
      try {
        const t0 = Date.now();
        const ac = typeof AbortController === 'function' ? new AbortController() : null;
        const tid = ac ? setTimeout(() => { try { ac.abort(); } catch (_) {} }, 6000) : null;
        const r = await fetch(pair[1], ac ? { signal: ac.signal } : undefined);
        if (tid) clearTimeout(tid);
        add('CDN: ' + pair[0], r.ok ? 'pass' : 'warn', 'HTTP ' + r.status + ' in ' + (Date.now() - t0) + 'ms');
      } catch (e) { add('CDN: ' + pair[0], 'fail', 'unreachable: ' + (e && e.message)); }
    }
    try {
      const t0 = Date.now();
      const r = await fetch('https://cdn.jsdelivr.net/npm/harper.js@2.4.0/dist/harper_wasm_bg.wasm', { cache: 'force-cache' });
      if (r.ok) { await r.arrayBuffer(); const total = Date.now() - t0; add('Writing-Check cache (10 MB WASM)', 'info', 'fetched in ' + total + 'ms — under ~500ms means the HTTP cache held it; re-run in a fresh session to test cross-session caching'); }
      else add('Writing-Check cache (10 MB WASM)', 'warn', 'HTTP ' + r.status);
    } catch (e) { add('Writing-Check cache (10 MB WASM)', 'warn', e.message); }
    setPlatProbe({ when: new Date().toLocaleString(), rows });
  };
  const _probeReportText = () => !platProbe ? '' : ('AlloFlow Platform Check — ' + platProbe.when + '\n' + (typeof navigator !== 'undefined' ? navigator.userAgent : '') + '\n\n' + platProbe.rows.map((r) => '[' + r.status.toUpperCase() + '] ' + r.name + ' — ' + r.detail).join('\n'));

  return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowEducatorHub(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') setShowEducatorHub(false); }}>
          <div data-help-key="educator_hub_modal_panel" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('educator_hub.dialog_aria') || 'Educator Tools'} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">🛠️ {t('educator_hub.title') || 'Educator Tools'}</h2>
                <p className="text-sm text-slate-600 mt-1">{t('educator_hub.subtitle') || 'Professional tools for educators and clinicians'}</p>
              </div>
              <button onClick={() => setShowEducatorHub(false)} className="p-2 -m-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl" aria-label={t('educator_hub.close_aria') || 'Close educator tools'}>✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button data-help-key="educator_hub_behavior_lens_card" onClick={() => { setShowEducatorHub(false); setShowBehaviorLens(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">🧠</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('educator_hub.behavior_lens_title') || 'BehaviorLens'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('educator_hub.behavior_lens_desc') || 'FBA/BIP behavioral observation, ABC data collection, and 60+ clinical tools'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_report_writer_card" onClick={() => { setShowEducatorHub(false); setShowReportWriter(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">📝</span>
                <div>
                  <h3 className="font-bold text-violet-800">{t('educator_hub.report_writer_title') || 'Report Writer'}</h3>
                  <p className="text-xs text-violet-600 mt-1">{t('educator_hub.report_writer_desc') || 'AI-powered clinical report generation with fact-chunks, accuracy audit, and developmental norms'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_cinematic_studio_card" onClick={() => { setShowEducatorHub(false); setShowCinematicStudio(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">🎬</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('educator_hub.cinematic_studio_title') || 'Cinematic Studio'}</h3>
                  <p className="text-xs text-rose-600 mt-1">{t('educator_hub.cinematic_studio_desc') || 'Craft strong NotebookLM video prompts, then diagnose and re-prompt weak results'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_symbol_studio_card" onClick={() => { setShowEducatorHub(false); setIsSymbolStudioOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">🎨</span>
                <div>
                  <h3 className="font-bold text-purple-800">{t('educator_hub.symbol_studio_title') || 'Symbol Studio'}</h3>
                  <p className="text-xs text-purple-600 mt-1">{t('educator_hub.symbol_studio_desc') || 'AI-generated PCS-style icons for visual supports, AAC boards, and schedules — powered by image-to-image editing'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_dynamic_assessment_card" onClick={() => { setShowEducatorHub(false); setIsDynamicAssessmentOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">🔬</span>
                <div>
                  <h3 className="font-bold text-blue-800">{t('educator_hub.dynamic_assessment_title') || 'Dynamic Assessment'}</h3>
                  <p className="text-xs text-blue-600 mt-1">{t('educator_hub.dynamic_assessment_desc') || 'Vygotsky/Feuerstein/Lidz test-teach-retest probes with graduated prompt ladders, modifiability scoring, IEP goals, accommodations, and family/teacher handoffs'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_lesson_builder_card" onClick={() => { setShowEducatorHub(false); startLessonFlow(); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">🪄</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('educator_hub.lesson_builder_title') || 'Help me build a lesson'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('educator_hub.lesson_builder_desc') || "I'll ask you a few questions and build a differentiated lesson with you, step by step."}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_lumen_card" onClick={() => { setShowEducatorHub(false); setStemLabTool('lumen'); setShowStemLab(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">💡</span>
                <div>
                  <h3 className="font-bold text-amber-800">{t('educator_hub.lumen_title') || 'Lumen'}</h3>
                  <p className="text-xs text-amber-600 mt-1">{t('educator_hub.lumen_desc') || 'Turn any dataset — research, classroom, or your own — into a defensible, honestly-marked finding: the chart and the claim are one object, uncertainty is kept, and any AI involvement is labeled. The honest way to present and argue from data.'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_document_hub_card" onClick={() => { setShowEducatorHub(false); openExportPreview('print'); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">📄</span>
                <div>
                  <h3 className="font-bold text-emerald-800">{t('educator_hub.document_hub_title') || 'Document Hub'}</h3>
                  <p className="text-xs text-emerald-600 mt-1">{t('educator_hub.document_hub_desc') || 'Document builder with themes, WYSIWYG editing, accessibility audit, and multi-format export (PDF, HTML, worksheet, slides)'}</p>
                </div>
              </button>
              <button data-help-key="educator_hub_pdf_accessibility_card" onClick={() => {
                  setShowEducatorHub(false);
                  const input = document.createElement('input');
                  input.type = 'file';
                  // PDF / DOCX / PPTX only. image/* was previously offered here but a lone image
                  // fell through to handleFileUpload's image branch — which OCRs into the
                  // lesson-generator text box, NOT the remediation pipeline (this card promises
                  // "audit & remediation"). The pipeline has no client-side image->document
                  // remediation path, so don't advertise it. (To remediate a photo of a document,
                  // save it into a PDF first — scanned PDFs get the full OCR + tag treatment.)
                  input.accept = 'application/pdf,.pdf,.docx,.pptx';
                  input.multiple = true;
                  input.onchange = (e) => {
                      const files = [...e.target.files];
                      if (files.length === 0) return;
                      const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
                      if (pdfFiles.length === 1 && files.length === 1) {
                          const file = pdfFiles[0];
                          const reader = new FileReader();
                          reader.onloadend = () => {
                              const base64 = reader.result.split(',')[1];
                              setPendingPdfBase64(base64);
                              setPendingPdfFile(file);
                              setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size });
                          };
                          reader.readAsDataURL(file);
                      } else if (pdfFiles.length > 1) {
                          const batchFiles = [];
                          let loaded = 0;
                          pdfFiles.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                  batchFiles.push({ name: file.name, base64: reader.result.split(',')[1], size: file.size });
                                  loaded++;
                                  if (loaded === pdfFiles.length) {
                                      setPdfBatchQueue(batchFiles);
                                      setPdfBatchMode(true);
                                      setPdfAuditResult({ _choosing: true, fileName: pdfFiles.length + ' files', fileSize: pdfFiles.reduce((s, f) => s + f.size, 0) });
                                  }
                              };
                              reader.readAsDataURL(file);
                          });
                      } else {
                          handleFileUpload(e);
                      }
                  };
                  input.click();
              }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1">♿</span>
                <div>
                  <h3 className="font-bold text-teal-800">{t('educator_hub.pdf_accessibility_title') || 'PDF Accessibility'}</h3>
                  <p className="text-xs text-teal-600 mt-1">{t('educator_hub.pdf_accessibility_desc') || 'Upload PDFs for WCAG accessibility audit & remediation with axe-core verification'}</p>
                </div>
              </button>
              {pdfFixResult && !pdfFixLoading && !pdfAuditResult && (
                <button
                  onClick={() => { setPdfAuditResult({ _restored: true }); }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all col-span-full md:col-span-2"
                  title={t('educator_hub.view_last_audit_tooltip') || 'Re-open the last PDF audit — view the diff, verification, and remediated HTML without re-running the pipeline'}
                >
                  📊 {t('pdf_audit.view_last_audit') || 'View Last Audit'}
                  {pdfFixResult._userEditedAt && <span className="opacity-70 text-[10px]">· edited</span>}
                </button>
              )}
              <button data-help-key="educator_hub_community_catalog_card" onClick={() => { setShowEducatorHub(false); setIsCommunityCatalogOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1" role="img" aria-label={t('educator_hub.books_emoji_aria') || 'books'}>📚</span>
                <div>
                  <h3 className="font-bold text-amber-800">{t('educator_hub.community_catalog_title') || 'Community Catalog'}</h3>
                  <p className="text-xs text-amber-700 mt-1">{t('educator_hub.community_catalog_desc') || 'Browse open-licensed lessons from the AlloFlow community, or submit your own for review'}</p>
                </div>
              </button>
              {/* Professional Development (2026-06-19): opens the Community Catalog modal straight to
                  its PD tab via a one-shot intent flag the catalog module reads itself — so this reuses
                  the existing setIsCommunityCatalogOpen prop and needs no new host wiring. */}
              <button data-help-key="educator_hub_professional_dev_card" onClick={() => { setShowEducatorHub(false); try { window.__alloPdIntent = true; localStorage.setItem('alloflow_pd_intent', '1'); } catch (_) {} setIsCommunityCatalogOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1" role="img" aria-label={t('educator_hub.graduation_emoji_aria') || 'graduation cap'}>🎓</span>
                <div>
                  <h3 className="font-bold text-sky-800">{t('educator_hub.professional_dev_title') || 'Professional Development'}</h3>
                  <p className="text-xs text-sky-700 mt-1">{t('educator_hub.professional_dev_desc') || 'Short, self-paced PD modules — learn, take a knowledge check, and download a completion record'}</p>
                </div>
              </button>
              {/* Demoted to a quiet footer row (maintainer feedback 2026-06-10:
                  it's developer-focused — keep it findable, not billboard-sized). */}
              <div data-help-key="educator_hub_platform_check_card" className="col-span-full flex flex-col gap-2">
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={_runPlatformProbe} className="text-[11px] text-slate-500 hover:text-slate-700 underline decoration-dotted" title={t('educator_hub.platform_check_desc') || 'Tests what this environment can do — pop-ups, downloads, storage, WebAssembly, clipboard, CDN reach. For troubleshooting; copy the report when something seems broken.'}>🔬 {t('educator_hub.platform_check_title') || 'Platform check (diagnostics)'}</button>
                  <button data-help-ignore="true" onClick={() => { let v = null; try { v = window.confirm(t('educator_hub.dialog_probe_q') || 'Dialog test: click OK.'); } catch (e) { v = 'threw: ' + e.message; }
                    setPlatProbe((p) => ({ when: (p && p.when) || new Date().toLocaleString(), rows: [...((p && p.rows) || []).filter((r) => r.name !== 'Dialogs (live test)'), { name: 'Dialogs (live test)', status: v === true ? 'pass' : (v === false ? 'warn' : 'fail'), detail: v === true ? 'confirm() returned true after OK — dialogs work' : (v === false ? 'confirm() returned FALSE — either you clicked Cancel, or the sandbox suppressed the dialog (if you never saw one, it is suppressed and confirm-gated flows auto-decline here)' : String(v)) }] })); }} className="text-[11px] text-slate-500 hover:text-slate-700 underline decoration-dotted">🧪 {t('educator_hub.platform_check_dialog') || 'dialog test'}</button>
                </div>
                {platProbe && (
                  <div className="bg-white border border-slate-300 rounded-lg p-2 text-[11px]" role="status">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-700">{t('educator_hub.platform_check_results') || 'Results'} — {platProbe.when}</span>
                      <button onClick={async () => { const txt = _probeReportText(); try { await navigator.clipboard.writeText(txt); } catch (_) { try { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (_) {} } }} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold hover:bg-slate-200">📋 {t('educator_hub.platform_check_copy') || 'Copy report'}</button>
                    </div>
                    <ul className="space-y-0.5">
                      {platProbe.rows.map((r, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className={'shrink-0 font-bold ' + (r.status === 'pass' ? 'text-green-700' : r.status === 'fail' ? 'text-red-700' : r.status === 'warn' ? 'text-amber-700' : 'text-slate-500')}>{r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : r.status === 'warn' ? '⚠' : 'ℹ'}</span>
                          <span className="min-w-0"><span className="font-bold">{r.name}:</span> {r.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button data-help-key="educator_hub_accessibility_lab_card" onClick={() => { setShowEducatorHub(false); setIsAccessibilityLabOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left">
                <span className="text-3xl mt-1" role="img" aria-label={t('educator_hub.magnifying_glass_emoji_aria') || 'magnifying glass'}>🔍</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('educator_hub.accessibility_lab_title') || 'Accessibility Lab'}</h3>
                  <p className="text-xs text-rose-700 mt-1">{t('educator_hub.accessibility_lab_desc') || 'Verify the student experience: preview as student, keyboard-only tour, live WCAG audit (axe-core) with violations framed by student impact, screen-reader announcement preview, and disability simulators (low-vision, color-blindness, dyslexia, motor delay).'}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
  );
}
