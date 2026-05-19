// view_pdf_audit_source.jsx — PDF Accessibility Audit modal CDN module
// Extracted from AlloFlowANTI.txt L30982-L38171 (May 2026, Round 4 Tier A).
//
// This is the single largest extraction in the project — 148 props
// flow in from AlloFlowContent. The auto-generated destructure list and the
// host's shorthand-prop call site must stay in sync; they were both produced
// by c:/tmp/generate_pdf_audit_extraction.js.
//
// Risk surface: any rename or addition of a referenced identifier inside the
// modal subtree requires regenerating both this file and the host call site.
// Run `node _verify_view_props.cjs AlloFlowANTI.txt PdfAuditView` after any
// edit to confirm the host still supplies every prop.

function PdfAuditView(props) {
  const {
    STYLE_SEEDS, _buildMissingList, _closePdfAuditModal, _discardAndCloseAudit,
    _docPipeline, _ensureDiffLib, _ensurePdfLib, _saveAndCloseAudit,
    addToast, agentActivityLog, agentLogFullView, applyWordRestorationInPlace,
    auditOutputAccessibility, autoFixAxeViolations, autoRestoreSummary, boringPalettePrompt,
    callGemini, callGeminiImageEdit, callGeminiVision, callImagen,
    callTTS, chunkResumePrompt, chunkSaveFlash, commitOrRevertPdfFix, t, updatePdfPreview,
    createTaggedPdf, diffLibReady, downloadAccessiblePdf, downloadBatchResults,
    ensurePdfBase64, expertCommandInput, exportPreviewRef, extractedImagesList,
    extractionData, fidelityResult, fixAndVerifyPdf, fixContrastViolations,
    fixIssuesList, generateAuditReportHtml, getChunkState, getPdfPreviewHtml,
    imageReinsertionReport, insertBlockFilter, insertBlockOpenCats, insertBlockPickerRef,
    insertBlockRecent, isAgentRunning, isGeneratingStyle, liveChunkExpanded,
    liveChunkRejected, liveChunkSessionActive, liveChunkStream, pdfAuditLoading,
    pdfAuditResult, pdfAuditTab, pdfAuditorCount, pdfAutoContinue,
    pdfAutoContinueAbortCtrlRef, pdfAutoContinueAbortRef, pdfAutoContinueRunning, pdfAutoFixPasses,
    pdfAutoSaveProject, pdfBatchCurrentIndex, pdfBatchMode, pdfBatchProcessing,
    pdfBatchQueue, pdfBatchStep, pdfBatchSummary, pdfFixLoading,
    pdfFixMode, pdfFixModeRef, pdfFixResult, pdfFixResultRef,
    pdfFixStep, pdfMultiSession, pdfPageRange, pdfPolishPasses,
    pdfPreviewA11yInspect, pdfPreviewFontSize, pdfPreviewOpen, pdfPreviewRef,
    pdfPreviewTheme, pdfTargetScore, pdfWebMode, pendingPdfBase64,
    pendingPdfFile, proceedWithPdfTransform, processExpertCommand, refixChunk,
    remediateSurgicallyThenAI, runAutoFixLoop, runAxeAudit, runPdfAccessibilityAudit,
    runPdfBatchRemediation, runTier2SurgicalFixes, runTier2_5SectionScopedFixes, safeCloneAudit,
    safeCloseAudit, safeDownloadBlob, sanitizeStyleForWCAG, saveProjectToFile,
    selectedPreviewImgRef, selectedVoice, setAgentActivityLog, setAgentLogFullView,
    setAutoRestoreSummary, setBoringPalettePrompt, setChunkResumePrompt, setDiffViewOpen,
    setExpertCommandInput, setExtractionData, setFidelityResult, setImageReinsertionReport,
    setInputText, setInsertBlockFilter, setInsertBlockOpenCats, setInsertBlockRecent,
    setIsAgentRunning, setIsGeneratingStyle, setLiveChunkExpanded, setLiveChunkRejected,
    setLiveChunkStream, setPdfAuditResult, setPdfAuditTab, setPdfAuditorCount,
    setPdfAutoContinue, setPdfAutoFixPasses, setPdfAutoSaveProject, setPdfBatchMode,
    setPdfBatchQueue, setPdfBatchSummary, setPdfFixLoading, setPdfFixMode,
    setPdfFixResult, setPdfFixStep, setPdfMultiSession, setPdfPageRange,
    setPdfPolishPasses, setPdfPreviewA11yInspect, setPdfPreviewFontSize, setPdfPreviewOpen,
    setPdfPreviewTheme, setPdfTargetScore, setPdfWebMode, setPendingPdfBase64,
    setPendingPdfFile, setShowCloseConfirm, showCloseConfirm, startNewPdfAudit
  } = props;

  if (!pdfAuditResult && !pdfAuditLoading) return null;

  return (
        <div
          data-help-key="pdf_audit_view_panel"
          className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label={t('pdf_audit.modal_aria') || 'PDF Accessibility Audit'}
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget && !pdfFixLoading && !pdfAutoContinueRunning) {
              safeCloseAudit();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !pdfFixLoading && !pdfAutoContinueRunning) {
              safeCloseAudit();
            }
          }}
          ref={(el) => { if (el && !el.contains(document.activeElement)) { try { el.focus({ preventScroll: true }); } catch(_){ el.focus(); } } }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border-2 border-indigo-200">
            {/* Persistent close button — sticky so it stays visible when the modal content scrolls.
                Disabled while remediation is mid-flight so users don't kill a running pipeline by accident. */}
            <div className="sticky top-0 z-20 flex justify-end p-2 bg-gradient-to-b from-white via-white/95 to-transparent pointer-events-none">
              <button
                data-help-key="pdf_audit_view_close_btn"
                type="button"
                onClick={() => { safeCloseAudit(); }}
                disabled={pdfFixLoading || pdfAutoContinueRunning}
                aria-label={t('pdf_audit.close_modal_aria') || 'Close audit modal'}
                title={(pdfFixLoading || pdfAutoContinueRunning) ? (t('pdf_audit.close_wait_title') || 'Wait for remediation to finish or click Stop first') : (t('pdf_audit.close_esc_title') || 'Close (Esc)')}
                className="pointer-events-auto w-9 h-9 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-full shadow-md border border-slate-400 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600"
              >
                <X size={18} aria-hidden="true"/>
              </button>
            </div>
            {pdfAuditResult?._choosing ? (
              <div className="p-8 text-center">
                {/* ── Batch Mode Toggle ── */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
                    <button data-help-key="pdf_audit_view_mode_single_btn" onClick={() => { setPdfBatchMode(false); setPdfWebMode && setPdfWebMode(false); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!pdfBatchMode && !pdfWebMode ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-700'}`}>📄 Single PDF</button>
                    <button data-help-key="pdf_audit_view_mode_batch_btn" onClick={() => { setPdfBatchMode(true); setPdfWebMode && setPdfWebMode(false); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pdfBatchMode ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-700'}`}>📂 Batch</button>
                    <button data-help-key="pdf_audit_view_mode_web_btn" onClick={() => { setPdfBatchMode(false); setPdfWebMode && setPdfWebMode(true); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pdfWebMode ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-700'}`}>🌐 Website / HTML</button>
                  </div>
                </div>
                {pdfWebMode ? (
                  <div className="text-left space-y-4">
                    <h3 className="text-lg font-black text-slate-800 mb-1 text-center">{t('pdf_audit.web.heading') || '🌐 Website & HTML Accessibility'}</h3>
                    <p className="text-xs text-slate-600 text-center">{t('pdf_audit.web.subheading') || 'Audit a website URL or paste HTML for full WCAG 2.1 AA audit + remediation'}</p>

                    {/* URL Input */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase" htmlFor="web-audit-url">{t('pdf_audit.web.url_label') || 'Website URL'}</label>
                      <div className="flex gap-2 mt-1">
                        <input type="url" id="web-audit-url" placeholder="https://example.com" autoComplete="url" aria-label={t('pdf_audit.web.url_aria') || 'Website URL to audit'}
                          className="flex-1 text-sm border border-slate-400 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
                        <button onClick={async () => {
                          const url = document.getElementById('web-audit-url')?.value?.trim();
                          if (!url) { addToast('Enter a URL', 'info'); return; }
                          addToast('Fetching website...', 'info');
                          try {
                            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
                            const resp = await fetch(proxyUrl);
                            if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
                            let html = await resp.text();
                            if (!html.includes('<base')) {
                              const baseTag = '<base href="' + url.replace(/\/[^/]*$/, '/') + '">';
                              html = html.replace(/<head([^>]*)>/i, '<head$1>' + baseTag);
                            }
                            document.getElementById('web-audit-html').value = html;
                            addToast('Website fetched! (' + html.length.toLocaleString() + ' chars) — click Audit to analyze', 'success');
                          } catch (e) {
                            addToast('Could not fetch URL — try pasting the HTML source instead. Error: ' + e.message, 'error');
                          }
                        }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors" aria-label={t('pdf_audit.web.fetch_aria') || 'Fetch website HTML'}>
                          🔍 Fetch
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{t('pdf_audit.web.or_paste_hint') || 'Or paste HTML source code directly below'}</p>
                    </div>

                    {/* HTML Input */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase" htmlFor="web-audit-html">{t('pdf_audit.web.html_label') || 'HTML Source'}</label>
                      <textarea id="web-audit-html" rows={8} placeholder={t('pdf_audit.web.html_placeholder') || 'Paste HTML source code here, or use Fetch above...'}
                        className="w-full text-xs border border-slate-400 rounded-lg px-3 py-2 mt-1 font-mono focus:ring-2 focus:ring-indigo-300 outline-none resize-y"
                        aria-label={t('pdf_audit.web.html_aria') || 'HTML source code to audit'} />
                    </div>

                    {/* Audit + Remediate buttons */}
                    <div className="flex gap-3 justify-center">
                      <button onClick={async () => {
                        const html = document.getElementById('web-audit-html')?.value?.trim();
                        if (!html || html.length < 20) { addToast('Paste or fetch HTML first', 'info'); return; }
                        addToast('Running accessibility audit...', 'info');
                        const [aiResult, axeResult] = await Promise.all([
                          auditOutputAccessibility(html),
                          runAxeAudit(html)
                        ]);
                        const aiScore = aiResult?.score ?? null;
                        const axeScore = axeResult?.score ?? null;
                        const blended = (aiScore !== null && axeScore !== null) ? Math.round((aiScore + axeScore) / 2) : (axeScore ?? aiScore ?? 0);
                        setPdfAuditResult({
                          score: blended,
                          _aiOnlyScore: aiScore,
                          _baselineAxeScore: axeScore,
                          summary: (aiResult?.summary || 'Website audit complete') + (axeResult ? ` | axe-core: ${axeResult.totalViolations} violations` : ''),
                          critical: aiResult?.issues?.filter(i => i.severity === 'critical') || [],
                          major: aiResult?.issues?.filter(i => i.severity === 'serious' || i.severity === 'major') || [],
                          minor: aiResult?.issues?.filter(i => i.severity === 'moderate' || i.severity === 'minor') || [],
                          passes: aiResult?.passes || [],
                          axeAudit: axeResult,
                          _isWebAudit: true,
                          scores: [blended],
                          scoreSD: 0,
                          scoreRange: 0,
                          auditorCount: 1,
                        });
                        setPendingPdfBase64(null);
                        setPendingPdfFile({ name: (document.getElementById('web-audit-url')?.value || 'website') + '.html' });
                        window.__pendingWebHtml = html;
                      }} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2">
                        ♿ Audit (AI + axe-core)
                      </button>
                      <button onClick={async () => {
                        const html = document.getElementById('web-audit-html')?.value?.trim();
                        if (!html || html.length < 20) { addToast('Paste or fetch HTML first', 'info'); return; }
                        addToast('Auditing & remediating HTML...', 'info');
                        setPdfFixLoading(true);
                        setPdfFixStep('Applying deterministic fixes...');
                        try {
                          let fixed = html;
                          const cf = fixContrastViolations(fixed);
                          if (cf.fixCount > 0) fixed = cf.html;
                          if (!fixed.includes('lang=')) fixed = fixed.replace(/<html/, '<html lang="en"');
                          if (!fixed.includes('<main')) { fixed = fixed.replace(/<body[^>]*>/, (m) => m + '\n<main id="main-content" role="main">'); fixed = fixed.replace('</body>', '</main>\n</body>'); }
                          if (!fixed.includes('Skip to') && !fixed.includes('skip-nav')) fixed = fixed.replace(/<body[^>]*>/, (m) => m + '\n<a href="#main-content" class="sr-only" style="position:absolute;left:-9999px">Skip to main content</a>');
                          const autoFix = await autoFixAxeViolations(fixed, await runAxeAudit(fixed), pdfAutoFixPasses);
                          if (autoFix?.html) fixed = autoFix.html;
                          const [finalAi, finalAxe] = await Promise.all([auditOutputAccessibility(fixed), runAxeAudit(fixed)]);
                          const finalScore = (finalAi && finalAxe) ? Math.round(((finalAi.score || 0) + (finalAxe.score || 0)) / 2) : (finalAi?.score || 0);
                          setPdfFixResult({
                            accessibleHtml: fixed,
                            beforeScore: 0,
                            afterScore: finalScore,
                            verificationAudit: finalAi,
                            axeAudit: finalAxe,
                            autoFixPasses: autoFix?.passes || 0,
                            needsExpertReview: finalScore < 70,
                            htmlChars: fixed.length,
                            chunkState: autoFix?.chunkState || null,
                            chunkWeightedScore: autoFix?.chunkWeightedScore || null,
                          });
                          setPendingPdfFile({ name: (document.getElementById('web-audit-url')?.value || 'website') + '-remediated.html' });
                          addToast(`Remediation complete! Score: ${finalScore}/100`, 'success');
                        } catch (e) { addToast('Remediation failed: ' + e.message, 'error'); }
                        setPdfFixLoading(false);
                        setPdfFixStep('');
                      }} className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2">
                        🔧 Audit & Remediate
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 text-center">"Audit" scores without changing. "Audit & Remediate" fixes the HTML and produces a downloadable accessible version.</p>
                  </div>
                ) : pdfBatchMode ? (
                  <div className="text-left">
                    <h3 className="text-lg font-black text-slate-800 mb-3 text-center">📂 Batch PDF Remediation</h3>

                    {/* Drag & Drop Zone */}
                    {!pdfBatchProcessing && !pdfBatchSummary && (
                      <div
                        className="border-2 border-dashed border-indigo-300 rounded-xl p-6 mb-4 text-center hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer"
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50'); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
                          const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
                          if (files.length === 0) { addToast('Please drop PDF files only', 'error'); return; }
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result.split(',')[1];
                              setPdfBatchQueue(prev => [...prev, { id: Date.now() + Math.random(), fileName: file.name, fileSize: file.size, base64, status: 'pending', result: null }]);
                            };
                            reader.readAsDataURL(file);
                          });
                          addToast(`Added ${files.length} PDF(s) to batch queue`, 'success');
                        }}
                      >
                        <div className="text-4xl mb-2">📥</div>
                        <p className="text-sm font-bold text-indigo-600">{t('pdf_audit.batch.drop_text') || 'Drag & drop PDFs here'}</p>
                        <p className="text-xs text-slate-600 mt-1">or click to browse</p>
                        <input type="file" accept=".pdf" multiple className="hidden" id="batch-pdf-input" onChange={(e) => {
                          const files = [...(e.target.files || [])].filter(f => f.type === 'application/pdf');
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result.split(',')[1];
                              setPdfBatchQueue(prev => [...prev, { id: Date.now() + Math.random(), fileName: file.name, fileSize: file.size, base64, status: 'pending', result: null }]);
                            };
                            reader.readAsDataURL(file);
                          });
                          if (files.length > 0) addToast(`Added ${files.length} PDF(s)`, 'success');
                          e.target.value = '';
                        }} />
                        <label htmlFor="batch-pdf-input" className="inline-block mt-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-200 transition-colors">{t('pdf_audit.batch.browse_files') || 'Browse Files'}</label>
                      </div>
                    )}

                    {/* File Queue */}
                    {pdfBatchQueue.length > 0 && !pdfBatchSummary && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-600">{pdfBatchQueue.length} file{pdfBatchQueue.length !== 1 ? 's' : ''} queued</span>
                          {!pdfBatchProcessing && <button onClick={() => setPdfBatchQueue([])} className="text-xs text-red-600 hover:text-red-600 font-bold">{t('pdf_audit.batch.clear_all') || 'Clear All'}</button>}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {pdfBatchQueue.map((item, idx) => (
                            <div key={item.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${item.status === 'done' ? 'bg-green-50' : item.status === 'failed' ? 'bg-red-50' : item.status === 'processing' ? 'bg-indigo-50 animate-pulse' : 'bg-slate-50'}`}>
                              <span>{item.status === 'done' ? '\u2705' : item.status === 'failed' ? '\u274c' : item.status === 'processing' ? '\u23f3' : '\u23f8\ufe0f'}</span>
                              <span className="flex-1 truncate font-medium">{item.fileName}</span>
                              <span className="text-slate-600">{(item.fileSize / (1024*1024)).toFixed(1)}MB</span>
                              {item.result && <span className={`font-bold ${(item.result.afterScore || 0) >= 90 ? 'text-green-600' : (item.result.afterScore || 0) >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{item.result.beforeScore}{'\u2192'}{item.result.afterScore}</span>}
                              {item.error && <span className="text-red-500 truncate max-w-[100px]" title={item.error}>{'\u274c'}</span>}
                              {!pdfBatchProcessing && item.status === 'pending' && <button onClick={() => setPdfBatchQueue(prev => prev.filter(q => q.id !== item.id))} className="text-slate-600 hover:text-red-400">{'\u2715'}</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch Progress */}
                    {pdfBatchProcessing && (
                      <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="animate-spin">{'\u23f3'}</span>
                          <span className="text-sm font-bold text-indigo-700">Processing {pdfBatchCurrentIndex + 1}/{pdfBatchQueue.length}</span>
                        </div>
                        <div className="w-full bg-indigo-200 rounded-full h-2 mb-2" role="progressbar" aria-label={t('pdf_audit.batch.progress_aria') || 'Batch remediation progress'} aria-valuenow={pdfBatchCurrentIndex + 1} aria-valuemin={0} aria-valuemax={pdfBatchQueue.length}>
                          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{width: `${((pdfBatchCurrentIndex + 1) / pdfBatchQueue.length * 100)}%`}}></div>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs text-indigo-600 flex-1" role="status" aria-live="polite">{pdfBatchStep}</p>
                          <button
                            onClick={() => {
                              try {
                                if (typeof window !== 'undefined' && window.__alloPdfBatchAbortCtrl) {
                                  window.__alloPdfBatchAbortCtrl.abort();
                                }
                              } catch (_) { /* noop */ }
                              addToast('Stopping batch — finishing current file then halting…', 'info');
                            }}
                            className="shrink-0 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[11px] font-bold"
                            aria-label={t('pdf_audit.batch.stop_aria') || 'Stop batch remediation'}
                          >
                            ⏸ Stop
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Batch Summary */}
                    {pdfBatchSummary && (
                      <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                        <h4 className="text-sm font-black text-green-800 mb-2">{'\u2705'} Batch Complete</h4>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-white rounded-lg p-2 text-center"><div className="text-lg font-black text-green-600">{pdfBatchSummary.succeeded}/{pdfBatchSummary.total}</div><div className="text-[11px] text-slate-600">Succeeded</div></div>
                          <div className="bg-white rounded-lg p-2 text-center"><div className="text-lg font-black text-indigo-600">+{pdfBatchSummary.avgImprovement}</div><div className="text-[11px] text-slate-600">{t('pdf_audit.batch.avg_improvement') || 'Avg Improvement'}</div></div>
                          <div className="bg-white rounded-lg p-2 text-center"><div className="text-lg font-black text-emerald-600">{pdfBatchSummary.above90}</div><div className="text-[11px] text-slate-600">{t('pdf_audit.batch.scored_90_plus') || 'Scored 90+'}</div></div>
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5">
                          <p>{'\ud83d\udcc8'} Average: {pdfBatchSummary.avgBefore} {'\u2192'} {pdfBatchSummary.avgAfter}</p>
                          {pdfBatchSummary.failed > 0 && <p>{'\u274c'} {pdfBatchSummary.failed} failed</p>}
                          {pdfBatchSummary.needsExpert > 0 && <p>{'\ud83e\uddd1\u200d\ud83d\udd2c'} {pdfBatchSummary.needsExpert} need expert review</p>}
                          <p>{'\u23f1\ufe0f'} Total time: {Math.floor(pdfBatchSummary.totalElapsed / 60)}m {pdfBatchSummary.totalElapsed % 60}s</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-center">
                      {!pdfBatchProcessing && !pdfBatchSummary && pdfBatchQueue.length > 0 && (
                        <button onClick={() => runPdfBatchRemediation()} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2">
                          {'\u267f'} Start Batch ({pdfBatchQueue.length} files)
                        </button>
                      )}
                      {pdfBatchSummary && (
                        <>
                          <button onClick={() => downloadBatchResults()} className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2">
                            {'\ud83d\udce5'} Download All (ZIP)
                          </button>
                          <button onClick={() => { setPdfBatchQueue([]); setPdfBatchSummary(null); }} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">{t('pdf_audit.batch.new_batch') || 'New Batch'}</button>
                          <button onClick={() => {
                            const queue = pdfBatchQueue;
                            const summary = pdfBatchSummary;
                            const done = queue.filter(f => f.status === 'done');
                            const failed = queue.filter(f => f.status === 'failed');
                            const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

                            const excellent = done.filter(f => (f.result?.afterScore || 0) >= 90);
                            const good = done.filter(f => (f.result?.afterScore || 0) >= 70 && (f.result?.afterScore || 0) < 90);
                            const needsWork = done.filter(f => (f.result?.afterScore || 0) < 70);

                            const allViolations = {};
                            done.forEach(f => {
                              const issues = f.result?.verificationAudit?.issues || [];
                              issues.forEach(i => {
                                const key = (i.wcag || 'unknown') + ': ' + (i.issue || '').substring(0, 60);
                                allViolations[key] = (allViolations[key] || 0) + 1;
                              });
                            });
                            const topViolations = Object.entries(allViolations).sort((a, b) => b[1] - a[1]).slice(0, 10);

                            const win = window.open('', '_blank');
                            if (!win) { addToast('Pop-up blocked', 'error'); return; }
                            win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Accessibility Compliance Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.header{background:linear-gradient(135deg,#1e1b4b,#312e81);padding:24px 32px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;font-weight:800;color:#fff}
.header .date{font-size:12px;color:#a5b4fc}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:24px 32px}
.card{background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155}
.card-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin-bottom:8px}
.card-value{font-size:36px;font-weight:900}
.card-sub{font-size:11px;color:#94a3b8;margin-top:4px}
.section{padding:0 32px 24px}
.section h2{font-size:14px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
table{width:100%;border-collapse:collapse}
th{background:#1e293b;padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;border-bottom:2px solid #334155}
td{padding:10px 12px;border-bottom:1px solid #1e293b;font-size:13px}
tr:hover{background:#1e293b50}
.score-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-weight:800;font-size:12px}
.excellent{background:#16a34a20;color:#4ade80}
.good{background:#d9770620;color:#fbbf24}
.needs-work{background:#dc262620;color:#f87171}
.bar{height:8px;border-radius:4px;transition:width 0.5s}
.chart{display:flex;gap:4px;height:40px;align-items:end}
.chart-bar{flex:1;border-radius:3px 3px 0 0;min-width:8px;transition:height 0.5s}
.violation-row{display:flex;justify-content:space-between;padding:8px 12px;background:#1e293b;border-radius:8px;margin-bottom:4px;font-size:12px}
.footer{padding:24px 32px;text-align:center;font-size:11px;color:#475569;border-top:1px solid #1e293b}
@media print{body{background:white;color:#1e293b}.header{background:#4f46e5;-webkit-print-color-adjust:exact;print-color-adjust:exact}.card{border:1px solid #e2e8f0}th{background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}.violation-row{background:#f8fafc}}
</style></head><body>
<div class="header">
  <div><h1>♿ Accessibility Compliance Dashboard</h1><div class="date">${date} · ${queue.length} documents analyzed · AlloFlow Pipeline</div></div>
  <button onclick="window.print()" style="background:white;color:#4f46e5;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer">🖨️ Print</button>
</div>

<div class="grid">
  <div class="card"><div class="card-title">Documents Processed</div><div class="card-value" style="color:#a5b4fc">${queue.length}</div><div class="card-sub">${done.length} succeeded · ${failed.length} failed</div></div>
  <div class="card"><div class="card-title">Average Score</div><div class="card-value" style="color:${(summary?.avgAfter||0) >= 80 ? '#4ade80' : (summary?.avgAfter||0) >= 50 ? '#fbbf24' : '#f87171'}">${summary?.avgAfter || 0}</div><div class="card-sub">Before: ${summary?.avgBefore || 0} · Improvement: +${summary?.avgImprovement || 0}</div></div>
  <div class="card"><div class="card-title">Compliance Rate</div><div class="card-value" style="color:${excellent.length === done.length ? '#4ade80' : '#fbbf24'}">${done.length > 0 ? Math.round(excellent.length / done.length * 100) : 0}%</div><div class="card-sub">${excellent.length} of ${done.length} scored 90+</div></div>
  <div class="card"><div class="card-title">Need Expert Review</div><div class="card-value" style="color:${(summary?.needsExpert||0) > 0 ? '#f87171' : '#4ade80'}">${summary?.needsExpert || 0}</div><div class="card-sub">${needsWork.length} below 70 · ${good.length} between 70-89</div></div>
</div>

<div class="section">
  <h2>Score Distribution</h2>
  <div style="display:flex;gap:24px;margin-bottom:16px">
    <div style="flex:1;background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155">
      <div class="chart">${done.map(f => {
        const s = f.result?.afterScore || 0;
        const color = s >= 90 ? '#4ade80' : s >= 70 ? '#fbbf24' : '#f87171';
        return '<div class="chart-bar" style="height:' + Math.max(4, s) + '%;background:' + color + '" title="' + f.fileName + ': ' + s + '/100"></div>';
      }).join('')}</div>
      <div style="font-size:10px;color:#64748b;margin-top:8px;text-align:center">Each bar = one document (height = score)</div>
    </div>
    <div style="width:200px;display:flex;flex-direction:column;gap:8px">
      <div style="background:#16a34a20;border:1px solid #16a34a40;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#4ade80">${excellent.length}</div>
        <div style="font-size:10px;color:#4ade80;font-weight:700">EXCELLENT (90+)</div>
      </div>
      <div style="background:#d9770620;border:1px solid #d9770640;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#fbbf24">${good.length}</div>
        <div style="font-size:10px;color:#fbbf24;font-weight:700">GOOD (70-89)</div>
      </div>
      <div style="background:#dc262620;border:1px solid #dc262640;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#f87171">${needsWork.length}</div>
        <div style="font-size:10px;color:#f87171;font-weight:700">NEEDS WORK (<70)</div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Document Details</h2>
  <table><thead><tr><th>#</th><th>Document</th><th>Before</th><th>After</th><th>Gain</th><th>Fix Passes</th><th>Status</th></tr></thead><tbody>
  ${queue.map((f, i) => {
    const r = f.result;
    const after = r?.afterScore || 0;
    const cls = after >= 90 ? 'excellent' : after >= 70 ? 'good' : 'needs-work';
    return '<tr><td>' + (i+1) + '</td><td>' + f.fileName + '</td><td>' + (r?.beforeScore ?? '—') + '</td><td><span class="score-badge ' + cls + '">' + (r?.afterScore ?? '—') + '</span></td><td>+' + (r ? (r.afterScore - r.beforeScore) : '—') + '</td><td>' + (r?.autoFixPasses ?? '—') + '</td><td>' + (f.status === 'done' ? '✅' : '❌ ' + (f.error || '')) + '</td></tr>';
  }).join('')}
  </tbody></table>
</div>

${topViolations.length > 0 ? '<div class="section"><h2>Most Common Violations (Training Priorities)</h2>' +
  topViolations.map(([v, count]) => '<div class="violation-row"><span>' + v + '</span><span style="font-weight:800;color:#f87171">' + count + ' docs</span></div>').join('') +
  '<p style="font-size:11px;color:#64748b;margin-top:12px">These violations appeared across multiple documents — addressing them through faculty training would have the highest impact.</p></div>' : ''}

<div class="section">
  <h2>Compliance Summary</h2>
  <div style="background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155">
    <p style="font-size:13px;line-height:1.8;color:#cbd5e1">
      Of <strong>${queue.length}</strong> documents analyzed, <strong>${excellent.length}</strong> (${done.length > 0 ? Math.round(excellent.length/done.length*100) : 0}%) meet WCAG 2.1 Level AA compliance (score ≥ 90).
      ${good.length > 0 ? '<strong>' + good.length + '</strong> document' + (good.length > 1 ? 's are' : ' is') + ' partially compliant (70-89) and may meet requirements with minor additional remediation.' : ''}
      ${needsWork.length > 0 ? '<strong>' + needsWork.length + '</strong> document' + (needsWork.length > 1 ? 's require' : ' requires') + ' significant remediation or expert review to meet compliance standards.' : ''}
    </p>
    <p style="font-size:11px;color:#64748b;margin-top:12px">Standards: WCAG 2.1 Level AA · ADA Title II (28 CFR Part 35 Subpart H) · Section 508 · EN 301 549</p>
    <p style="font-size:11px;color:#64748b">Methodology: AI multi-auditor triangulation + axe-core (Deque) automated verification · 39 deterministic fixes + 17 surgical AI-diagnosed fixes + iterative AI remediation loop</p>
  </div>
</div>

<div class="footer">
  Generated by AlloFlow Accessibility Pipeline · ${date} · <a href="https://github.com/Apomera/AlloFlow" style="color:#6366f1">AlloFlow</a>
</div>
</body></html>`);
                            win.document.close();
                            addToast('📊 Dashboard opened', 'success');
                          }} className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2">
                            📊 Dashboard
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                <div className="text-5xl mb-4">📄</div>
                <h3 className="text-lg font-black text-slate-800 mb-2">PDF Uploaded: {pdfAuditResult.fileName}</h3>
                <p className="text-sm text-slate-600 mb-1">{(pdfAuditResult.fileSize / (1024*1024)).toFixed(1)} MB</p>
                <p className="text-sm text-slate-600 mb-4">{t('pdf_audit.choose_how') || 'Choose how to process this PDF:'}</p>

                <details open className="text-left mb-4 bg-slate-50 rounded-xl p-3 border border-slate-400">
                  <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600">⚙️ Pipeline Settings</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-600">Audit Passes: {pdfAuditorCount}</span>
                        <span className="text-slate-600">{pdfAuditorCount <= 2 ? 'Fast' : pdfAuditorCount <= 5 ? 'Balanced' : pdfAuditorCount <= 7 ? 'Thorough' : 'Research-grade'}</span>
                      </div>
                      <input type="range" min="1" max="10" value={pdfAuditorCount} onChange={(e) => setPdfAuditorCount(parseInt(e.target.value))} className="w-full" aria-label={t('pdf_audit.settings.audit_passes_aria') || 'Number of audit passes'} />
                      <div className="flex justify-between text-[11px] text-slate-600"><span>1 (quick)</span><span>5 (default)</span><span>10 (max)</span></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-600">Target Score: {pdfTargetScore}</span>
                        <span className="text-slate-600">{pdfTargetScore >= 95 ? 'Near-perfect' : pdfTargetScore >= 90 ? 'Excellent' : pdfTargetScore >= 80 ? 'Good' : 'Minimum'}</span>
                      </div>
                      <input type="range" min="60" max="100" step="5" value={pdfTargetScore} onChange={(e) => setPdfTargetScore(parseInt(e.target.value))} className="w-full" aria-label={t('pdf_audit.settings.target_score_aria') || 'Target accessibility score'} />
                      <div className="flex justify-between text-[11px] text-slate-600"><span>60 (min)</span><span>90 (default)</span><span>100</span></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-600">Max Fix Passes: {pdfAutoFixPasses}</span>
                        <span className="text-slate-600">{pdfAutoFixPasses === 0 ? 'Disabled' : pdfAutoFixPasses <= 3 ? 'Quick' : pdfAutoFixPasses <= 5 ? 'Standard' : pdfAutoFixPasses <= 8 ? 'Thorough' : 'Maximum'}</span>
                      </div>
                      <input type="range" min="0" max="15" value={pdfAutoFixPasses} onChange={(e) => setPdfAutoFixPasses(parseInt(e.target.value))} className="w-full" aria-label={t('pdf_audit.settings.max_fix_passes_aria') || 'Max fix pass count'} />
                      <div className="flex justify-between text-[11px] text-slate-600"><span>0 (off)</span><span>8 (default)</span><span>15 (max)</span></div>
                    </div>
                    <label className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                      <input type="checkbox" checked={pdfAutoContinue} onChange={(e) => setPdfAutoContinue(e.target.checked)} className="mt-0.5 rounded" aria-label={t('pdf_audit.settings.auto_continue_aria') || 'Auto-continue remediation until target score'} />
                      <span>🔁 <b>Auto-continue</b> until score ≥ <b>{pdfTargetScore}</b> — runs up to 3 extra rounds of fixes automatically, stopping early when no more progress is possible.</span>
                    </label>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-600">Polish Passes: {pdfPolishPasses}</span>
                        <span className="text-slate-600">{pdfPolishPasses === 0 ? 'None' : pdfPolishPasses === 1 ? 'Standard' : 'Extra polish'}</span>
                      </div>
                      <input type="range" min="0" max="3" value={pdfPolishPasses} onChange={(e) => setPdfPolishPasses(parseInt(e.target.value))} className="w-full" aria-label={t('pdf_audit.settings.polish_passes_aria') || 'Polish pass count'} />
                      <div className="flex justify-between text-[11px] text-slate-600"><span>0</span><span>2 (default)</span><span>3</span></div>
                    </div>
                  </div>
                </details>
                {/* Style & Branding for remediation output */}
                <details className="bg-slate-50 rounded-lg border border-slate-400 overflow-hidden mb-3">
                  <summary className="px-3 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                    ✨ Output Style & Branding (optional)
                  </summary>
                  <div className="px-3 pb-3 pt-1 space-y-3">
                    {/* Branding source */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 uppercase mb-0.5">{t('pdf_audit.brand.heading') || 'Brand Colors'}</div>
                      <p className="text-[11px] text-slate-600 mb-1">{t('pdf_audit.brand.where_from') || 'Where do the colors come from?'}</p>
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => { window.__pdfBrandMode = 'auto'; document.querySelectorAll('[data-brand-mode]').forEach(b => b.classList.remove('ring-2','ring-indigo-400','bg-indigo-50')); document.querySelector('[data-brand-mode="auto"]')?.classList.add('ring-2','ring-indigo-400','bg-indigo-50'); }}
                          data-brand-mode="auto"
                          className="px-2 py-1.5 rounded-lg border text-left transition-all ring-2 ring-indigo-400 bg-indigo-50 border-indigo-600">
                          <div className="text-[11px] font-bold text-slate-700">{t('pdf_audit.brand.match_original') || '🎨 Match Original'}</div>
                          <div className="text-[11px] text-slate-600">{t('pdf_audit.brand.match_original_desc') || 'Extract colors from this PDF'}</div>
                        </button>
                        <label data-brand-mode="upload"
                          className="px-2 py-1.5 rounded-lg border text-left transition-all border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer">
                          <div className="text-[11px] font-bold text-slate-700">{t('pdf_audit.brand.upload_guide') || '📎 Upload Brand Guide'}</div>
                          <div className="text-[11px] text-slate-600">{t('pdf_audit.brand.upload_guide_desc') || 'Use a different doc/logo'}</div>
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file || !callGeminiVision) return;
                            addToast('🎨 Extracting brand colors...', 'info');
                            const reader = new FileReader();
                            reader.onload = async (ev) => {
                              try {
                                const base64 = ev.target.result.split(',')[1];
                                const mime = file.type.includes('pdf') ? 'application/pdf' : file.type || 'image/png';
                                const result = await callGeminiVision(
                                  `Analyze this document/image and extract the brand color scheme and typography.\n\nReturn ONLY JSON:\n{"headingColor":"hex","accentColor":"hex","bgColor":"hex","headerBg":"hex","headerText":"hex","tableBg":"hex","tableBorder":"hex","bodyFont":"CSS font-family","headingFont":"CSS font-family"}`,
                                  base64, mime
                                );
                                let cleaned = result.trim();
                                if (cleaned.indexOf('```') !== -1) { const ps = cleaned.split('```'); cleaned = ps[1] || ps[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
                                window.__pdfBrandOverride = JSON.parse(cleaned);
                                window.__pdfBrandMode = 'upload';
                                document.querySelectorAll('[data-brand-mode]').forEach(b => b.classList.remove('ring-2','ring-indigo-400','bg-indigo-50'));
                                document.querySelector('[data-brand-mode="upload"]')?.classList.add('ring-2','ring-indigo-400','bg-indigo-50');
                                addToast('🎨 Brand colors extracted from ' + file.name, 'success');
                              } catch(err) { addToast('Could not extract brand colors', 'error'); }
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }} />
                        </label>
                        <button onClick={() => { window.__pdfBrandMode = 'none'; window.__pdfBrandOverride = null; document.querySelectorAll('[data-brand-mode]').forEach(b => b.classList.remove('ring-2','ring-indigo-400','bg-indigo-50')); document.querySelector('[data-brand-mode="none"]')?.classList.add('ring-2','ring-indigo-400','bg-indigo-50'); }}
                          data-brand-mode="none"
                          className="px-2 py-1.5 rounded-lg border text-left transition-all border-slate-200 hover:border-indigo-600 hover:bg-indigo-50">
                          <div className="text-[11px] font-bold text-slate-700">{t('pdf_audit.brand.no_branding') || '⬜ No Branding'}</div>
                          <div className="text-[11px] text-slate-600">{t('pdf_audit.brand.no_branding_desc') || 'Use default palette'}</div>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-600 italic mt-1.5 leading-snug">{t('pdf_audit.brand.tip') || 'Tip: If you pick a specific Style Seed below (not "Match Original"), that seed\'s colors override your branding choice. To use your brand colors, pair them with the Match Original seed.'}</p>
                    </div>
                    {/* Style Seeds — unified pre-remediation style selection */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 uppercase mb-0.5">{t('pdf_audit.style.heading') || 'Style Seed'}</div>
                      <p className="text-[11px] text-slate-600 mb-1.5">{t('pdf_audit.style.subtext') || 'What design style should the AI apply? WCAG compliance guaranteed by deterministic sanitizer.'}</p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'professional', label: '💼 Professional', desc: 'Clean, corporate' },
                          { id: 'academic', label: '📚 Academic', desc: 'Serif, navy/gold' },
                          { id: 'elementary', label: '🌈 Kid-Friendly', desc: 'Bright, playful' },
                          { id: 'minimal', label: '✨ Minimalist', desc: 'Clean whitespace' },
                          { id: 'highContrast', label: '◼️ High Contrast', desc: 'WCAG AAA, bold' },
                          { id: 'nature', label: '🌿 Nature', desc: 'Calm, green tones' },
                          { id: 'print', label: '🖨️ Print', desc: 'Optimized for paper' },
                          { id: 'dark', label: '🌙 Dark Mode', desc: 'Dark, easy on eyes' },
                          { id: 'magazine', label: '📰 Magazine', desc: 'Editorial layout' },
                          { id: 'matchOriginal', label: '📎 Match Original', desc: 'Extract from PDF' },
                        ].map(s => (
                          <button key={s.id} onClick={() => { window.__pdfStyleSeed = s.id; window.__pdfStylePreference = s.id; document.querySelectorAll('[data-style-pref]').forEach(b => b.classList.remove('ring-2','ring-indigo-400','bg-indigo-50')); document.querySelector(`[data-style-pref="${s.id}"]`)?.classList.add('ring-2','ring-indigo-400','bg-indigo-50'); }}
                            data-style-pref={s.id}
                            className={`px-2 py-1.5 rounded-lg border text-left transition-all ${s.id === 'professional' ? 'ring-2 ring-indigo-400 bg-indigo-50 border-indigo-600' : 'border-slate-200 hover:border-indigo-600 hover:bg-indigo-50'}`}>
                            <div className="text-[11px] font-bold text-slate-700">{s.label}</div>
                            <div className="text-[11px] text-slate-600">{s.desc}</div>
                          </button>
                        ))}
                      </div>
                      {/* Custom style presets (user-created, saved to localStorage) */}
                      {(() => {
                        var saved = {};
                        try { saved = JSON.parse(localStorage.getItem('alloflow_custom_styles') || '{}'); } catch(e) {}
                        var savedKeys = Object.keys(saved);
                        return (
                          <>
                            {savedKeys.length > 0 && (
                              <div className="mt-2">
                                <div className="text-[11px] text-slate-600 font-bold mb-1">{t('pdf_audit.style.your_custom') || 'Your Custom Styles'}</div>
                                <div className="flex flex-wrap gap-1">
                                  {savedKeys.map(k => {
                                    var s = saved[k];
                                    return (
                                      <div key={k} className="flex items-center gap-0">
                                        <button onClick={() => {
                                          window.__pdfStyleSeed = 'custom';
                                          window.__pdfStylePreference = 'custom';
                                          window.__pdfCustomStyle = s;
                                          document.querySelectorAll('[data-style-pref]').forEach(b => b.classList.remove('ring-2','ring-indigo-400','bg-indigo-50'));
                                          addToast && addToast('Custom style "' + s.name + '" applied!', 'success');
                                        }}
                                          className="px-2 py-1.5 rounded-l-lg border text-left transition-all border-slate-200 hover:border-indigo-600 hover:bg-indigo-50">
                                          <div className="text-[11px] font-bold text-slate-700" style={{color: s.headingColor}}>🎨 {s.name}</div>
                                          <div className="text-[11px] text-slate-600">{s.font || 'Custom'}</div>
                                        </button>
                                        <button onClick={() => {
                                          var updated = {...saved}; delete updated[k];
                                          try { localStorage.setItem('alloflow_custom_styles', JSON.stringify(updated)); } catch(e) {}
                                          addToast && addToast('Deleted "' + s.name + '"', 'info');
                                        }} className="px-1 py-1.5 border border-l-0 border-slate-200 rounded-r-lg text-[11px] text-red-600 hover:text-red-600 hover:bg-red-50">✕</button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <details className="mt-2">
                              <summary className="text-[11px] font-bold text-indigo-500 cursor-pointer hover:text-indigo-700">+ Create Custom Style</summary>
                              <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-400 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label htmlFor="custom-style-name" className="text-[11px] text-slate-600 font-bold">{t('pdf_audit.style.name_label') || 'Style Name'}</label>
                                    <input id="custom-style-name" type="text" placeholder={t('pdf_audit.style.name_placeholder') || 'My Style'} aria-label={t('pdf_audit.style.name_aria') || 'Custom style name'} className="w-full px-2 py-1 text-[11px] border border-slate-400 rounded" />
                                  </div>
                                  <div>
                                    <label htmlFor="custom-style-font" className="text-[11px] text-slate-600 font-bold">Font</label>
                                    <select id="custom-style-font" aria-label={t('pdf_audit.style.font_aria') || 'Font family'} className="w-full px-2 py-1 text-[11px] border border-slate-400 rounded">
                                      <option value="'Inter', system-ui, sans-serif">{t('pdf_audit.style.font_inter') || 'Inter (Clean)'}</option>
                                      <option value="'Georgia', serif">{t('pdf_audit.style.font_georgia') || 'Georgia (Serif)'}</option>
                                      <option value="'Atkinson Hyperlegible', sans-serif">{t('pdf_audit.style.font_atkinson') || 'Atkinson (A11y)'}</option>
                                      <option value="'Lexend', sans-serif">{t('pdf_audit.style.font_lexend') || 'Lexend (Readable)'}</option>
                                      <option value="'Comic Sans MS', cursive">{t('pdf_audit.style.font_comic') || 'Comic Sans (Fun)'}</option>
                                      <option value="'Times New Roman', serif">{t('pdf_audit.style.font_times') || 'Times (Classic)'}</option>
                                      <option value="'OpenDyslexic', sans-serif">OpenDyslexic</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label htmlFor="custom-style-heading" className="text-[11px] text-slate-600 font-bold">{t('pdf_audit.style.heading_color_label') || 'Heading Color'}</label>
                                    <input id="custom-style-heading" type="color" defaultValue="#1e3a5f" aria-label={t('pdf_audit.style.heading_color_aria') || 'Heading color'} className="w-full h-6 rounded border border-slate-400 cursor-pointer" />
                                  </div>
                                  <div>
                                    <label htmlFor="custom-style-accent" className="text-[11px] text-slate-600 font-bold">{t('pdf_audit.style.accent_color_label') || 'Accent Color'}</label>
                                    <input id="custom-style-accent" type="color" defaultValue="#2563eb" aria-label={t('pdf_audit.style.accent_color_aria') || 'Accent color'} className="w-full h-6 rounded border border-slate-400 cursor-pointer" />
                                  </div>
                                  <div>
                                    <label htmlFor="custom-style-bg" className="text-[11px] text-slate-600 font-bold">Background</label>
                                    <input id="custom-style-bg" type="color" defaultValue="#ffffff" aria-label={t('pdf_audit.style.bg_color_aria') || 'Background color'} className="w-full h-6 rounded border border-slate-400 cursor-pointer" />
                                  </div>
                                </div>
                                <button onClick={() => {
                                  var name = document.getElementById('custom-style-name')?.value?.trim();
                                  if (!name) { addToast && addToast('Please enter a style name', 'warning'); return; }
                                  var style = {
                                    name: name,
                                    font: document.getElementById('custom-style-font')?.value || "'Inter', sans-serif",
                                    headingColor: document.getElementById('custom-style-heading')?.value || '#1e3a5f',
                                    accentColor: document.getElementById('custom-style-accent')?.value || '#2563eb',
                                    bgColor: document.getElementById('custom-style-bg')?.value || '#ffffff',
                                    promptInstructions: 'STYLE PREFERENCE: Custom style "' + name + '" — use ' + (document.getElementById('custom-style-font')?.value || 'Inter') + ' font, heading color ' + (document.getElementById('custom-style-heading')?.value || '#1e3a5f') + ', accent ' + (document.getElementById('custom-style-accent')?.value || '#2563eb') + ', background ' + (document.getElementById('custom-style-bg')?.value || '#ffffff') + '.'
                                  };
                                  var existing = {};
                                  try { existing = JSON.parse(localStorage.getItem('alloflow_custom_styles') || '{}'); } catch(e) {}
                                  var key = name.toLowerCase().replace(/\s+/g, '_');
                                  existing[key] = style;
                                  try { localStorage.setItem('alloflow_custom_styles', JSON.stringify(existing)); } catch(e) {}
                                  window.__pdfStyleSeed = 'custom';
                                  window.__pdfCustomStyle = style;
                                  addToast && addToast('🎨 Custom style "' + name + '" saved & applied!', 'success');
                                }} className="w-full py-1.5 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 transition-colors">
                                  Save & Apply Style
                                </button>
                              </div>
                            </details>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </details>
                <div className="flex gap-3 justify-center">
                  <button data-help-key="pdf_audit_view_start_btn" onClick={async () => { setPdfAuditResult(null); addToast('Auditing & remediating PDF...', 'info'); await runPdfAccessibilityAudit(pendingPdfBase64); setTimeout(() => { const r = pdfFixResultRef.current; const needsLoop = pdfAutoContinue && r && r.axeAudit && r.axeAudit.totalViolations > 0 && (r.afterScore || 0) < pdfTargetScore; if (needsLoop) { runAutoFixLoop(3); } else if (pdfAutoSaveProject) { saveProjectToFile(true); } }, 150); }} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2">
                    ♿ Audit & Remediate
                  </button>
                  <button data-help-key="pdf_audit_view_skip_to_extract_btn" onClick={() => { setPdfAuditResult(null); proceedWithPdfTransform(); }} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all shadow-sm flex items-center gap-2 border border-slate-400">
                    <Sparkles size={16} /> Skip to Text Extraction
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 text-center mt-2">"Audit & Remediate" analyzes accessibility, fixes issues, and verifies with axe-core. "Text Extraction" extracts raw text for content generation.</p>
                {/* Pre-flight triage panel — replaces the bare "estimated time"
                    line. Uses data already in pdfAuditResult (pageCount,
                    hasImages, hasTables, hasSearchableText, critical/serious/
                    minor issue counts) to show the teacher what the pipeline
                    will need to do, how long it's likely to take, and which
                    post-fix mode they want. No extra API calls — pure derivation
                    from existing audit data. Only renders when no fix has run
                    yet (to avoid visual clutter on the results view). */}
                {pdfAuditResult?.pageCount > 0 && !pdfFixResult && (() => {
                  const pc = pdfAuditResult.pageCount;
                  const isScanned = pdfAuditResult.hasSearchableText === false;
                  const hasImg = !!pdfAuditResult.hasImages;
                  const hasTbl = !!pdfAuditResult.hasTables;
                  const critCount = (pdfAuditResult.critical?.length || 0);
                  const seriousCount = ((pdfAuditResult.serious || pdfAuditResult.major || []).length);
                  const minorCount = ((pdfAuditResult.minor || []).length);
                  const moderateCount = ((pdfAuditResult.moderate || []).length);
                  const baseSec = 30;
                  const perPage = isScanned ? 28 : 12;
                  const imgAdd = hasImg ? 15 : 0;
                  const tblAdd = hasTbl ? 10 : 0;
                  const estLow = Math.round((baseSec + pc * perPage + imgAdd + tblAdd) * 0.7);
                  const estHigh = Math.round((baseSec + pc * perPage + imgAdd + tblAdd) * 1.3);
                  const fmt = (sec) => sec < 90 ? `${sec}s` : `${Math.round(sec / 60 * 10) / 10} min`;
                  return (
                    <div className="mt-2 bg-gradient-to-br from-slate-50 to-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">📋 Pre-flight triage</span>
                        <span className="text-[10px] text-slate-500">based on the audit above, no extra API calls</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2.5">
                        <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pages</div>
                          <div className="text-sm font-black text-slate-800">{pc}</div>
                        </div>
                        <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('pdf_audit.triage.source_type') || 'Source type'}</div>
                          <div className={`text-sm font-black ${isScanned ? 'text-amber-700' : 'text-emerald-700'}`}>{isScanned ? 'Scanned' : 'Text layer'}</div>
                        </div>
                        <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Images</div>
                          <div className="text-sm font-black text-slate-800">{hasImg ? 'Yes' : '—'}</div>
                        </div>
                        <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tables</div>
                          <div className="text-sm font-black text-slate-800">{hasTbl ? 'Yes' : '—'}</div>
                        </div>
                      </div>
                      {(critCount + seriousCount + moderateCount + minorCount) > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2">
                          <span className="text-slate-600 font-bold">{t('pdf_audit.triage.issues_to_fix') || 'Issues to fix:'}</span>
                          {critCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">{critCount} critical</span>}
                          {seriousCount > 0 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">{seriousCount} serious</span>}
                          {moderateCount > 0 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-bold">{moderateCount} moderate</span>}
                          {minorCount > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">{minorCount} minor</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2.5">
                        <span className="text-slate-600 font-bold">{t('pdf_audit.triage.estimated_time') || 'Estimated remediation time:'}</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black">{fmt(estLow)}–{fmt(estHigh)}</span>
                        {isScanned && <span className="text-amber-700 text-[10px]">↑ scanned PDFs take longer (OCR required)</span>}
                      </div>
                      <div className="pt-2 border-t border-indigo-200">
                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5">{t('pdf_audit.post_fix.label') || 'Post-fix mode'}</div>
                        <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label={t('pdf_audit.post_fix.aria') || 'Post-fix mode'}>
                          {[
                            { id: 'auto', label: '⚡ Auto', tip: 'Commit result immediately. Default.' },
                            { id: 'review', label: '📝 Review', tip: 'Open Diff view after fix — inspect source ↔ final fidelity before treating as final.' },
                            { id: 'expert', label: '🛠️ Expert', tip: 'Open Document Builder after fix — edit markup directly.' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              role="radio"
                              aria-checked={pdfFixMode === m.id}
                              onClick={() => setPdfFixMode(m.id)}
                              title={m.tip}
                              className={'text-[11px] font-bold px-2.5 py-1 rounded border transition-all ' + (pdfFixMode === m.id ? 'bg-indigo-600 border-indigo-700 text-white shadow' : 'bg-white border-slate-300 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300')}
                            >{m.label}</button>
                          ))}
                          <span className="text-[10px] text-slate-500 self-center italic">
                            {pdfFixMode === 'auto' ? 'Fix & Verify runs, result commits.' : pdfFixMode === 'review' ? 'Fix & Verify runs, then opens Diff view.' : 'Fix & Verify runs, then opens Document Builder.'}
                          </span>
                        </div>
                      </div>
                      {/* ── Quick downloads (pre-remediation) ──
                          Tagged PDF should be available BEFORE Fix & Verify so a
                          teacher can grab a baseline tagged copy immediately —
                          useful when the document already has decent structure
                          and they just want page-level + metadata tagging. The
                          full structural tagging from semantic remediation
                          (headings, scoped tables, alt text) only happens after
                          Fix & Verify runs and is offered by the post-remediation
                          button at line ~35191. The toast surfaces the tag
                          counts so the user can see real proof of tagging,
                          not just a filename change. */}
                      <div className="pt-2 mt-2 border-t border-indigo-200">
                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5">{t('pdf_audit.quick_downloads.heading') || 'Quick downloads (no remediation needed)'}</div>
                        <button
                          onClick={async () => {
                            try {
                              const freshBase64 = await ensurePdfBase64();
                              if (!freshBase64) return;
                              const ok = await _ensurePdfLib();
                              if (!ok) { addToast("Couldn't load PDF tagging library (network?). Try again.", 'error'); return; }
                              addToast('Tagging original PDF (baseline)…', 'info');
                              const binStr = atob(freshBase64);
                              const bytes = new Uint8Array(binStr.length);
                              for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
                              const baseTitle = (pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '');
                              // Minimal fixResult shim so createTaggedPdf has
                              // something to walk. The audit result doesn't
                              // store HTML; per-page tagging in Stage 2 still
                              // applies regardless of what's in accessibleHtml.
                              const shim = {
                                accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>' + baseTitle.replace(/[<>&]/g, '') + '</title></head><body></body></html>',
                                pageCount: pdfAuditResult.pageCount,
                              };
                              const _result = await createTaggedPdf(bytes, shim, { title: baseTitle, lang: 'en', subject: 'Tagged baseline by AlloFlow (pre-remediation)' });
                              const taggedBytes = _result && _result.bytes ? _result.bytes : _result;
                              const summary = (_result && _result.summary) || null;
                              if (!taggedBytes) { addToast('Tagged PDF generation returned no bytes.', 'error'); return; }
                              const blob = new Blob([taggedBytes], { type: 'application/pdf' });
                              safeDownloadBlob(blob, baseTitle + '-tagged-baseline.pdf');
                              if (summary) {
                                  const parts = [];
                                  if (summary.headings) parts.push(summary.headings + (summary.headings === 1 ? ' heading' : ' headings'));
                                  if (summary.paragraphs) parts.push(summary.paragraphs + (summary.paragraphs === 1 ? ' paragraph' : ' paragraphs'));
                                  if (summary.tables) parts.push(summary.tables + (summary.tables === 1 ? ' table' : ' tables'));
                                  if (summary.images) parts.push(summary.images + (summary.images === 1 ? ' image' : ' images'));
                                  if (summary.links) parts.push(summary.links + (summary.links === 1 ? ' link' : ' links'));
                                  if (summary.fields) parts.push(summary.fields + (summary.fields === 1 ? ' form field' : ' form fields'));
                                  if (summary.pages) parts.push(summary.pages + (summary.pages === 1 ? ' page' : ' pages'));
                                  const detail = parts.length ? parts.join(' · ') + ' tagged.' : 'Per-page tagging applied.';
                                  const extras = [];
                                  if (summary.bookmarks) {
                                      const _mapped = summary.bookmarksMappedToPages || 0;
                                      const _fallback = summary.bookmarks - _mapped;
                                      const _bmDetail = (_mapped > 0 || _fallback > 0)
                                          ? ' (' + _mapped + ' mapped to pages' + (_fallback > 0 ? ', ' + _fallback + ' fell back to page 1' : '') + ')'
                                          : '';
                                      extras.push('Bookmarks: ' + summary.bookmarks + ' headings' + _bmDetail + '.');
                                  }
                                  if (summary.pdfUaDeclared) extras.push('PDF/UA-1 declared.');
                                  const extrasStr = extras.length ? ' ' + extras.join(' ') : '';
                                  addToast('Baseline Tagged PDF downloaded — ' + detail + extrasStr + ' Run Fix & Verify for richer tagging.', 'success');
                              } else {
                                  addToast('Baseline Tagged PDF downloaded — original PDF with per-page structure tags. Run Fix & Verify for richer tagging.', 'success');
                              }
                            } catch (err) {
                              warnLog('[TaggedPDF baseline] failed:', err);
                              addToast('Baseline Tagged PDF failed: ' + (err?.message || 'unknown error') + '.', 'error');
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-100 hover:border-slate-400 transition-colors flex items-center gap-1.5"
                          title={t('pdf_audit.quick_downloads.tagged_pdf_title') || 'Download a Tagged PDF based on the original. For richer tagging — extracted headings, properly scoped tables, alt text — run Fix & Verify first and download the tagged version after.'}
                        >
                          📄 Tagged PDF (baseline)
                        </button>
                      </div>
                    </div>
                  );
                })()}
                  </>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <label className="flex-1 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-200">
                    📂 Load Previous Project
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const project = JSON.parse(ev.target.result);
                          if (!project.accessibleHtml || !project.version) { addToast('Not a valid AlloFlow project file', 'error'); return; }
                          setPdfAuditResult({
                            score: project.beforeScore || 0, scores: [], critical: [], major: [], minor: [],
                            passes: [], summary: 'Loaded from saved project', pageCount: project.pageCount,
                            hasSearchableText: true, hasImages: project.imageCount > 0,
                          });
                          setPdfFixResult({
                            accessibleHtml: project.accessibleHtml,
                            beforeScore: project.beforeScore,
                            afterScore: project.afterScore,
                            axeAudit: project.axeAudit || null,
                            verificationAudit: project.verificationAudit || null,
                            docStyle: project.docStyle || null,
                            pageCount: project.pageCount,
                            imageCount: project.imageCount || 0,
                            needsExpertReview: project.needsExpertReview || false,
                            htmlChars: project.accessibleHtml.length,
                            extractedChars: 0, issuesFixed: 0, remainingIssues: 0, autoFixPasses: 0,
                          });
                          setPendingPdfFile({ name: project.fileName || 'loaded-project.pdf' });
                          addToast('📂 Loaded: ' + (project.fileName || 'project') + ' — continue editing!', 'success');
                        } catch(err) { addToast('Failed to load: ' + err.message, 'error'); }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }} />
                  </label>
                  <button onClick={() => { _closePdfAuditModal(); }} className="text-xs text-slate-600 hover:text-slate-600 font-bold">Cancel</button>
                </div>
              </div>
            ) : pdfAuditLoading ? (
              <div className="p-12 text-center" role="status" aria-live="polite">
                <div className="text-5xl mb-4 animate-pulse" aria-hidden="true">♿</div>
                <h3 className="text-lg font-black text-slate-800 mb-2">{t('pdf_audit.loading.title') || 'Auditing PDF Accessibility...'}</h3>
                <p className="text-sm text-slate-600">{t('pdf_audit.loading.subtitle') || 'Running 5 parallel WCAG 2.1 AA audits with triangulation. This may take 15-30 seconds.'}</p>
                <div className="mt-4 w-56 h-2.5 bg-slate-200 rounded-full mx-auto overflow-hidden" role="progressbar" aria-label={t('pdf_audit.loading.progress_aria') || 'Audit in progress'} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 rounded-full" style={{animation: 'auditProgress 25s ease-out forwards'}}></div>
                </div>
                <style>{`@keyframes auditProgress { 0% { width: 5%; } 20% { width: 30%; } 50% { width: 55%; } 75% { width: 75%; } 90% { width: 85%; } 100% { width: 92%; } } @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

                {/* ── Knowbility Partner Introduction — shown during audit wait ── */}
                <div className="mt-6 text-left bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/40 border border-indigo-200/70 rounded-2xl p-5 space-y-3 mx-auto max-w-lg" style={{ animation: 'fadeInUp 0.9s ease-out 3s both' }}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-200">
                      <span className="text-white font-black text-base">K</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">Knowbility</span>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{t('pdf_audit.knowbility.partner_badge') || 'Accessibility Partner'}</span>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">501(c)(3) Nonprofit</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5">
                        <strong className="text-slate-700">{t('pdf_audit.knowbility.mission_lead') || 'Creating an inclusive digital world for people with disabilities'}</strong> — Knowbility is
                        a nonprofit organization based in Austin, TX, and an award-winning leader in accessible information technology since 1999.
                      </p>
                    </div>
                  </div>

                  {/* ── Why Accessibility Matters ── */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 space-y-2" style={{ animation: 'fadeInUp 0.7s ease-out 5s both' }}>
                    <div className="text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">⚖️ Why Digital Accessibility Matters</div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      <strong className="text-amber-900">{t('pdf_audit.knowbility.ada_title') || 'The Americans with Disabilities Act (ADA) Title II'}</strong> requires state and local governments to make their digital services accessible to people with disabilities. In April 2024, the Department of Justice published <strong>final regulations</strong> mandating <strong>{t('pdf_audit.knowbility.wcag_label') || 'WCAG 2.1 Level AA'}</strong> compliance for all web content and mobile applications, with compliance deadlines ranging from <strong>{t('pdf_audit.knowbility.deadline_range') || 'April 2026 to April 2027'}</strong> depending on population size.
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      But compliance is just the baseline. Accessible documents benefit <strong>everyone</strong> — not just the 1 in 4 Americans living with a disability:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white/90 rounded-lg p-2 border border-amber-100">
                        <div className="text-[11px] font-black text-emerald-700">🌍 Broader Reach</div>
                        <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.broader_reach_desc') || 'Accessible content works on any device, any bandwidth, any assistive technology — reaching more users'}</div>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2 border border-amber-100">
                        <div className="text-[11px] font-black text-blue-700">🔍 Better SEO & Findability</div>
                        <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.seo_desc') || 'Structured headings, alt text, and semantic HTML improve search ranking and content discovery'}</div>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2 border border-amber-100">
                        <div className="text-[11px] font-black text-violet-700">🧠 Cognitive Clarity</div>
                        <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.cognitive_desc') || 'Clear navigation, consistent layouts, and plain language help all users — especially in high-cognitive-load contexts'}</div>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2 border border-amber-100">
                        <div className="text-[11px] font-black text-rose-700">⚡ Future-Proofing</div>
                        <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.future_desc') || 'WCAG-compliant content adapts to new devices, AI readers, and emerging assistive technologies'}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-700 italic leading-relaxed">{t('pdf_audit.knowbility.italic_callout') || "WCAG 2.1 AA isn't just about avoiding litigation — it's about building documents that are perceivable, operable, understandable, and robust for every human being."}</p>
                  </div>

                  {/* Services Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5 space-y-0.5">
                      <div className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">🔍 Auditing & Testing</div>
                      <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.audit_service_desc') || 'Expert WCAG audits and document remediation by certified professionals'}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5 space-y-0.5">
                      <div className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">♿ AccessWorks</div>
                      <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.usability_service_desc') || 'Real-world usability testing by people who use assistive technology daily'}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5 space-y-0.5">
                      <div className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">📄 Document Remediation</div>
                      <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.docrem_service_desc') || 'Specialist team for PDF and MS Office docs — full usability with assistive technology'}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5 space-y-0.5">
                      <div className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">🎓 Training & AccessU</div>
                      <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.training_service_desc') || 'Annual conference and on-demand courses — beginner to advanced accessibility skills'}</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-white/70 rounded-lg border border-indigo-100 p-2.5">
                    <div className="flex gap-4 justify-center text-center">
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase">Web</div>
                        <a href="https://knowbility.org?utm_source=alloflow&utm_medium=referral&utm_campaign=expert_remediation" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300">knowbility.org</a>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase">Email</div>
                        <a href="mailto:knowbility@knowbility.org" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300">knowbility@knowbility.org</a>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase">Phone</div>
                        <a href="tel:+15125273138" className="text-[11px] font-bold text-slate-700 hover:text-indigo-700">512-527-3138</a>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-indigo-100 text-center">
                      <a href="https://knowbility.org/services/project-inquiry" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-[11px] font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-200">
                        Request a Project Inquiry →
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-indigo-100"></div>
                    <span className="text-[11px] text-indigo-600 font-medium uppercase tracking-wider">W3C/WAI · IAAP-Certified · Clinton White House Recognized · FCC Innovation Award</span>
                    <div className="flex-1 border-t border-indigo-100"></div>
                  </div>
                </div>
              </div>
            ) : pdfAuditResult && pdfAuditResult.score < 0 ? (
              <div role="alert" className="rounded-2xl overflow-hidden border border-slate-400 shadow-lg">
                <div className="p-6 text-center bg-gradient-to-r from-slate-600 to-slate-700 text-white">
                  <div className="text-4xl mb-2">⚠️</div>
                  <h3 className="text-lg font-bold">{t('pdf_audit.unavailable.title') || 'Audit Unavailable'}</h3>
                  <p className="text-sm opacity-80 mt-1">{t('pdf_audit.unavailable.body') || 'The AI accessibility audit could not complete. This is usually caused by a temporary API issue, rate limiting, or a very large/complex PDF.'}</p>
                </div>
                <div className="p-4 bg-white space-y-3">
                  <p className="text-xs text-slate-600 text-center">{t('pdf_audit.unavailable.proceed_hint') || 'You can still proceed — Fix & Verify will transform the document and run a full audit afterward.'}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={async () => { setPdfAuditResult(null); addToast('Retrying audit...', 'info'); await runPdfAccessibilityAudit(pendingPdfBase64); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">🔄 Retry Audit</button>
                    <button onClick={() => { _closePdfAuditModal(); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            ) : pdfAuditResult && (
              <div role="status" aria-live="polite" aria-label={`PDF accessibility audit complete. Score: ${pdfAuditResult.score} out of 100.`}>
                {pdfFixResult && (
                  <div role="tablist" aria-label={t('pdf_audit.tabs.aria') || 'Audit view'} className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-xl w-fit">
                    <button role="tab" aria-selected={pdfAuditTab === 'results'} onClick={() => setPdfAuditTab('results')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${pdfAuditTab === 'results' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>{t('pdf_audit.tabs.remediation_results') || 'Remediation Results'}</button>
                    <button role="tab" aria-selected={pdfAuditTab === 'original'} onClick={() => setPdfAuditTab('original')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${pdfAuditTab === 'original' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>{t('pdf_audit.tabs.original_audit') || 'Original Audit'}</button>
                  </div>
                )}
                {(!pdfFixResult || pdfAuditTab === 'original') && (
                <div className={`p-6 text-center ${pdfAuditResult.score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : pdfAuditResult.score >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-rose-600'} text-white rounded-t-2xl`}>
                  <div className="text-5xl font-black mb-1" aria-label={`Score: ${pdfAuditResult.score >= 0 ? pdfAuditResult.score : 'unknown'} out of 100`}>{pdfAuditResult.score >= 0 ? pdfAuditResult.score : '?'}<span className="text-2xl opacity-80" aria-hidden="true">/100</span></div>
                  <h3 className="text-lg font-bold" id="pdf-audit-title">PDF Accessibility Score {pdfAuditResult._scoreIsBlended ? <span className="text-xs font-normal opacity-70">(AI + axe-core blend)</span> : <span className="text-xs font-normal opacity-70">(AI Rubric)</span>}</h3>
                  {pdfAuditResult.scores && <p className="text-xs opacity-70 mt-0.5">Triangulated from {pdfAuditResult.auditorCount || pdfAuditResult.scores.length} independent AI audits (scores: {pdfAuditResult.scores.join(', ')}) · SD: {pdfAuditResult.scoreSD ?? '?'}</p>}
                  {pdfAuditResult._scoreIsBlended ? (
                    <p className="text-[11px] opacity-70 mt-0.5">AI Rubric: {pdfAuditResult._aiOnlyScore} | axe-core: {pdfAuditResult._baselineAxeScore} | Blended: {pdfAuditResult.score} (50/50)</p>
                  ) : (
                    <p className="text-[11px] opacity-60 mt-0.5">axe-core automated verification will be added after Fix & Verify (50/50 blend)</p>
                  )}
                  {pdfAuditResult.scoreRange > 25 && <p className="text-xs mt-1 bg-white/20 inline-block px-3 py-1 rounded-full font-bold">Note: Score variance is high (range: {pdfAuditResult.scoreRange}) — this is normal for documents with low accessibility scores</p>}
                  <p className="text-sm opacity-90 mt-1">{pdfAuditResult.summary}</p>
                </div>
                )}

                <div className="p-5 space-y-4" aria-labelledby="pdf-audit-title">
                  {(!pdfFixResult || pdfAuditTab === 'original') && (<>
                  {/* Document info */}
                  <div className="flex gap-2 flex-wrap" role="list" aria-label={t('pdf_audit.doc_props.aria') || 'Document properties'}>
                    {pdfAuditResult.hasSearchableText !== undefined && <span role="listitem" className={`px-2 py-1 rounded-full text-[11px] font-bold ${pdfAuditResult.hasSearchableText ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{pdfAuditResult.hasSearchableText ? '✓ Searchable Text' : '✗ No Text Layer'}</span>}
                    {pdfAuditResult.hasImages && <span role="listitem" className="px-2 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">{t('pdf_audit.doc_props.contains_images') || 'Contains Images'}</span>}
                    {pdfAuditResult.hasTables && <span role="listitem" className="px-2 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">{t('pdf_audit.doc_props.contains_tables') || 'Contains Tables'}</span>}
                    {pdfAuditResult.hasForms && <span role="listitem" className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">{t('pdf_audit.doc_props.contains_forms') || 'Contains Forms'}</span>}
                    {pdfAuditResult.pageCount && <span role="listitem" className="px-2 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">{pdfAuditResult.pageCount} pages</span>}
                  </div>

                  {/* Reliability Statistics */}
                  {pdfAuditResult.scores?.length > 1 && (
                    <details className="bg-indigo-50 rounded-lg border border-indigo-200 overflow-hidden">
                      <summary className="px-3 py-2 text-[11px] font-bold text-indigo-700 uppercase tracking-widest cursor-pointer hover:bg-indigo-100 transition-colors">
                        📊 Reliability Metrics ({pdfAuditResult.reliability || 'N/A'} agreement)
                      </summary>
                      <div className="px-3 pb-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                            <div className="text-lg font-black text-indigo-700">{pdfAuditResult.ci95?.[0]}–{pdfAuditResult.ci95?.[1]}</div>
                            <div className="text-[11px] text-slate-600 font-bold uppercase">95% Confidence Interval</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                            <div className="text-lg font-black text-indigo-700">{pdfAuditResult.scoreSD}</div>
                            <div className="text-[11px] text-slate-600 font-bold uppercase">{t('pdf_audit.reliability.std_dev') || 'Standard Deviation'}</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                            <div className={`text-lg font-black ${pdfAuditResult.icc >= 0.75 ? 'text-green-700' : pdfAuditResult.icc >= 0.5 ? 'text-amber-700' : 'text-red-700'}`}>{pdfAuditResult.icc}</div>
                            <div className="text-[11px] text-slate-600 font-bold uppercase" title={t('pdf_audit.reliability.icc_title') || 'Custom 1−(SD/50) index; not textbook ICC'}>{t('pdf_audit.reliability.icc_label') || 'Auditor Consistency (ICC-like)'}</div>
                          </div>
                          {pdfAuditResult.cronbachAlpha !== null && (
                            <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                              <div className={`text-lg font-black ${pdfAuditResult.cronbachAlpha >= 0.7 ? 'text-green-700' : 'text-amber-700'}`}>{pdfAuditResult.cronbachAlpha}</div>
                              <div className="text-[11px] text-slate-600 font-bold uppercase">{t('pdf_audit.reliability.cronbach') || "Cronbach's α"}</div>
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-indigo-600 space-y-0.5">
                          <div>SEM: ±{pdfAuditResult.scoreSEM} | Range: {pdfAuditResult.scoreRange} | Auditors: {pdfAuditResult.auditorCount}/{pdfAuditResult.requestedAuditors}</div>
                          <div>Individual scores: {pdfAuditResult.scores.join(', ')}</div>
                          <div>{pdfAuditResult.icc >= 0.9 ? '✅ Excellent agreement — auditors highly consistent' : pdfAuditResult.icc >= 0.75 ? '✅ Good agreement — scores clustered tightly' : pdfAuditResult.icc >= 0.5 ? '⚠️ Moderate agreement — some variation between auditors' : '⚠️ Variable agreement — consider increasing auditor count'}</div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Scoring Breakdown — transparent methodology with live calculation */}
                  {(() => {
                    const critCount = (pdfAuditResult.critical || []).length;
                    const seriousCount = (pdfAuditResult.serious || pdfAuditResult.major || []).length;
                    const modCount = (pdfAuditResult.moderate || []).length;
                    const minCount = (pdfAuditResult.minor || []).length;
                    const passCount = (pdfAuditResult.passes || []).length;
                    const totalIssues = critCount + seriousCount + modCount + minCount;
                    const totalChecks = totalIssues + passCount;
                    const passRate = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;
                    const aiScore = pdfAuditResult._aiOnlyScore ?? pdfAuditResult.score;
                    const axeScore = pdfAuditResult._baselineAxeScore;
                    const axeAudit = pdfAuditResult._baselineAxeAudit;
                    const isBlended = pdfAuditResult._scoreIsBlended && axeScore !== undefined;
                    const displayedScore = pdfAuditResult.score;
                    const rawDed = critCount * 15 + seriousCount * 10 + modCount * 5 + minCount * 2;
                    const scoreWithoutPasses = Math.max(0, 100 - rawDed);
                    const passBenefit = Math.max(0, aiScore - scoreWithoutPasses);
                    return (
                  <details className="bg-slate-50 rounded-lg border border-slate-400 overflow-hidden" open>
                    <summary className="px-3 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                      Score Breakdown
                    </summary>
                    <div className="px-3 pb-3 text-[11px] text-slate-700 space-y-2 mt-1">
                      {/* Overview */}
                      <div className="bg-white rounded-lg border border-slate-400 p-2.5 space-y-1">
                        <div className="flex justify-between"><span>{t('pdf_audit.score.total_checks') || 'Total checks performed'}</span><span className="font-bold">{totalChecks}</span></div>
                        <div className="flex justify-between text-green-700 font-bold"><span>Passed</span><span>{passCount} ({passRate}%)</span></div>
                        <div className="flex justify-between text-red-700 font-bold"><span>{t('pdf_audit.score.issues_found') || 'Issues found'}</span><span>{totalIssues}</span></div>
                        {totalIssues > 0 && (
                          <div className="text-[11px] text-slate-600 pl-2">{[critCount > 0 && `${critCount} critical`, seriousCount > 0 && `${seriousCount} serious`, modCount > 0 && `${modCount} moderate`, minCount > 0 && `${minCount} minor`].filter(Boolean).join(', ')}</div>
                        )}
                      </div>
                      {/* Two-engine scores side by side */}
                      <div className={`grid ${isBlended ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                        {/* AI Rubric */}
                        <div className="bg-purple-100 rounded-lg border-2 border-purple-300 p-2.5">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-black text-purple-900 text-sm">{aiScore}<span className="text-[11px] font-bold text-purple-500">/100</span></span>
                            <span className="text-[11px] font-black text-purple-600 uppercase">{t('pdf_audit.score.ai_rubric_label') || 'AI Rubric'}</span>
                          </div>
                          <div className="text-[11px] text-purple-800 space-y-0.5">
                            <div>{t('pdf_audit.score.starts_at_100') || 'Starts at 100, deducts per issue type'}</div>
                            {totalIssues > 0 && <div>{totalIssues} issues found</div>}
                            {passBenefit > 0 && <div className="text-green-700 font-bold">{passCount} passes recovered +{passBenefit} pts</div>}
                          </div>
                          <details className="mt-1 text-[11px]">
                            <summary className="cursor-pointer text-purple-500 hover:text-purple-800 font-bold">{t('pdf_audit.score.how_ai_scores') || 'How AI scores'}</summary>
                            <div className="mt-1 space-y-0.5 text-purple-700">
                              <div>{t('pdf_audit.score.ai_critical_rule') || 'Critical: -15 each (lang, title, alt, landmark, contrast)'}</div>
                              <div>{t('pdf_audit.score.ai_major_rule') || 'Major: -10 each (headings, tables, forms)'}</div>
                              <div>{t('pdf_audit.score.ai_minor_rule') || 'Minor: -5 each (skip-nav, landmarks, links, lists)'}</div>
                              <div>{t('pdf_audit.score.ai_passes_rule') || 'Passes reduce total deductions proportionally'}</div>
                            </div>
                          </details>
                        </div>
                        {/* axe-core */}
                        {isBlended && axeAudit && (
                        <div className="bg-blue-100 rounded-lg border-2 border-blue-300 p-2.5">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-black text-blue-900 text-sm">{axeScore}<span className="text-[11px] font-bold text-blue-500">/100</span></span>
                            <span className="text-[11px] font-black text-blue-600 uppercase">axe-core</span>
                          </div>
                          <div className="text-[11px] text-blue-800 space-y-0.5">
                            <div>{t('pdf_audit.score.axe_desc') || 'Deque automated WCAG 2.1 AA checker'}</div>
                            <div>{axeAudit.totalViolations} violation{axeAudit.totalViolations !== 1 ? 's' : ''}, {axeAudit.totalPasses} passed</div>
                          </div>
                          <details className="mt-1 text-[11px]">
                            <summary className="cursor-pointer text-blue-500 hover:text-blue-800 font-bold">{t('pdf_audit.score.how_axe_scores') || 'How axe-core scores'}</summary>
                            <div className="mt-1 space-y-0.5 text-blue-700">
                              <div>100 - (critical x15) - (serious x10) - (moderate x5) - (minor x2)</div>
                              {(axeAudit.critical || []).length > 0 && <div className="text-red-600">{axeAudit.critical.length} critical: {axeAudit.critical.map(v => v.id).join(', ')}</div>}
                              {(axeAudit.serious || []).length > 0 && <div className="text-amber-600">{axeAudit.serious.length} serious: {axeAudit.serious.map(v => v.id).join(', ')}</div>}
                              {(axeAudit.moderate || []).length > 0 && <div>{axeAudit.moderate.length} moderate: {axeAudit.moderate.map(v => v.id).join(', ')}</div>}
                              {(axeAudit.minor || []).length > 0 && <div>{axeAudit.minor.length} minor: {axeAudit.minor.map(v => v.id).join(', ')}</div>}
                              {axeAudit.totalViolations === 0 && <div className="text-green-700 font-bold">{t('pdf_audit.score.no_violations') || 'No violations detected'}</div>}
                            </div>
                          </details>
                        </div>
                        )}
                      </div>
                      {/* Blend formula with /2 */}
                      {isBlended && (
                        <div className="bg-white rounded-lg border-2 border-slate-300 p-2.5 text-center">
                          <div className="text-sm">
                            <span className="text-slate-600">(</span>
                            <span className="text-purple-800 font-black">{aiScore}</span>
                            <span className="text-slate-600 mx-1">+</span>
                            <span className="text-blue-800 font-black">{axeScore}</span>
                            <span className="text-slate-600">)</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-slate-600 font-bold">2</span>
                            <span className="text-slate-600 mx-2">=</span>
                            <span className="font-black text-slate-900 text-lg">{displayedScore}</span>
                            <span className="text-slate-600 text-xs">/100</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{t('pdf_audit.score.average_both') || 'Average of both engines (equal weight)'}</div>
                        </div>
                      )}
                    </div>
                  </details>
                    );
                  })()}

                  {/* Issues */}
                  {pdfAuditResult.critical?.length > 0 && (
                    <section aria-label={`${pdfAuditResult.critical.length} critical accessibility issues`}>
                      <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">Critical Issues ({pdfAuditResult.critical.length})</h4>
                      <ul className="list-none space-y-1.5">
                      {pdfAuditResult.critical.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-red-50 p-2 rounded-lg border border-red-100">
                          <span className="text-red-500 shrink-0 mt-0.5" aria-hidden="true">●</span>
                          <div><strong>{issue.issue}</strong>{issue.wcag && <span className="text-red-500 ml-1">(WCAG {issue.wcag})</span>}{issue.count > 1 && <span className="text-slate-600 ml-1">×{issue.count}</span>}</div>
                        </li>
                      ))}
                      </ul>
                    </section>
                  )}
                  {(pdfAuditResult.serious || pdfAuditResult.major || []).length > 0 && (
                    <section aria-label={`${(pdfAuditResult.serious || pdfAuditResult.major).length} serious accessibility issues`}>
                      <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Serious Issues ({(pdfAuditResult.serious || pdfAuditResult.major).length})</h4>
                      <ul className="list-none space-y-1.5">
                      {(pdfAuditResult.serious || pdfAuditResult.major).map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-amber-50 p-2 rounded-lg border border-amber-100">
                          <span className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true">●</span>
                          <div><strong>{issue.issue}</strong>{issue.wcag && <span className="text-amber-500 ml-1">(WCAG {issue.wcag})</span>}{issue.count > 1 && <span className="text-slate-600 ml-1">×{issue.count}</span>}</div>
                        </li>
                      ))}
                      </ul>
                    </section>
                  )}
                  {(pdfAuditResult.moderate || []).length > 0 && (
                    <section aria-label={`${pdfAuditResult.moderate.length} moderate accessibility issues`}>
                      <h4 className="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-2">Moderate Issues ({pdfAuditResult.moderate.length})</h4>
                      <ul className="list-none space-y-1.5">
                      {pdfAuditResult.moderate.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                          <span className="text-yellow-500 shrink-0 mt-0.5" aria-hidden="true">●</span>
                          <div><strong>{issue.issue}</strong>{issue.wcag && <span className="text-yellow-600 ml-1">(WCAG {issue.wcag})</span>}{issue.count > 1 && <span className="text-slate-600 ml-1">×{issue.count}</span>}</div>
                        </li>
                      ))}
                      </ul>
                    </section>
                  )}
                  {pdfAuditResult.minor?.length > 0 && (
                    <section aria-label={`${pdfAuditResult.minor.length} minor accessibility issues`}>
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Minor Issues ({pdfAuditResult.minor.length})</h4>
                      <ul className="list-none space-y-1">
                      {pdfAuditResult.minor.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">{issue.issue}{issue.count > 1 && ` (×${issue.count})`}</li>
                      ))}
                      </ul>
                    </section>
                  )}
                  {pdfAuditResult.passes?.length > 0 && (() => {
                    const pc = pdfAuditResult.passes.length;
                    const critC = (pdfAuditResult.critical || []).length;
                    const serC = (pdfAuditResult.serious || pdfAuditResult.major || []).length;
                    const modC = (pdfAuditResult.moderate || []).length;
                    const minC = (pdfAuditResult.minor || []).length;
                    const rawDed = critC * 15 + serC * 10 + modC * 5 + minC * 2;
                    const ic = critC + serC + modC + minC;
                    const passRatio = pc > 0 ? pc / (pc + ic) : 0;
                    const pf = 1 - (passRatio * 0.4);
                    const saved = rawDed - Math.round(rawDed * pf);
                    return (
                    <section aria-label={`${pc} accessibility checks passed`}>
                      <h4 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">
                        Passed Checks ({pc}){saved > 0 && <span className="ml-2 text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold normal-case">+{saved} points recovered</span>}
                      </h4>
                      <ul className="list-none space-y-1">
                      {pdfAuditResult.passes.map((pass, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-green-700"><span aria-hidden="true">✓</span> {pass}</li>
                      ))}
                      </ul>
                    </section>
                    );
                  })()}
                  </>)}

                  {/* ── Multi-session page-range remediation panel ────────
                      Lets users tackle long PDFs over multiple days without
                      burning their daily Gemini quota. Shown only before the
                      first remediation completes (after that, the user can
                      use the existing fix-remaining controls). */}
                  {!pdfFixResult && pdfAuditResult && pdfAuditResult.pageCount > 10 && (
                    <div className="mt-3 mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      {pdfMultiSession && pdfMultiSession.ranges && pdfMultiSession.ranges.length > 0 && (
                        <div className="mb-3 pb-3 border-b border-indigo-200">
                          <div className="text-xs font-bold text-indigo-900 mb-1">📚 Prior remediated ranges (saved in your browser):</div>
                          <ul className="text-xs text-indigo-800 space-y-0.5">
                            {pdfMultiSession.ranges.slice().sort((a, b) => (a.pages[0] || 0) - (b.pages[0] || 0)).map((r, idx) => (
                              <li key={idx}>
                                ✓ Pages {r.pages[0]}–{r.pages[1]}
                                {r.completedAt && <span className="text-indigo-600"> · {new Date(r.completedAt).toLocaleDateString()}</span>}
                                {typeof r.finalScore === 'number' && <span className="text-indigo-600"> · score {r.finalScore}/100</span>}
                              </li>
                            ))}
                          </ul>
                          {(() => {
                            const completed = pdfMultiSession.ranges.reduce((acc, r) => acc + Math.max(0, r.pages[1] - r.pages[0] + 1), 0);
                            const remaining = Math.max(0, (pdfAuditResult.pageCount || 0) - completed);
                            return (
                              <div className="text-xs text-indigo-700 mt-1.5 font-bold">
                                {remaining > 0 ? `${remaining} pages remaining of ${pdfAuditResult.pageCount}` : `✓ All ${pdfAuditResult.pageCount} pages complete`}
                              </div>
                            );
                          })()}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={async () => {
                                if (!_docPipeline || !_docPipeline.mergeRangesToFullHtml) return;
                                const merged = _docPipeline.mergeRangesToFullHtml(pdfMultiSession.ranges, pdfAuditResult.pageCount || pdfMultiSession.pageCount || 1);
                                const blob = new Blob([merged], { type: 'text/html;charset=utf-8' });
                                safeDownloadBlob(blob, (pendingPdfFile?.name?.replace(/\.pdf$/i, '') || 'document') + '_multi-session.html');
                                addToast('Downloaded merged HTML for completed ranges.', 'success');
                              }}
                              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                            >
                              ⬇ Download progress so far
                            </button>
                            <button
                              onClick={async () => {
                                if (!_docPipeline || !_docPipeline.clearMultiSession || !pdfMultiSession.sessionId) return;
                                if (!window.confirm('Clear saved progress for this PDF? This cannot be undone.')) return;
                                await _docPipeline.clearMultiSession(pdfMultiSession.sessionId);
                                setPdfMultiSession(null);
                                setPdfPageRange(null);
                                addToast('Cleared saved progress for this PDF.', 'info');
                              }}
                              className="text-xs px-2 py-1 bg-white border border-red-300 text-red-700 rounded font-bold hover:bg-red-50"
                            >
                              🗑️ Clear saved progress
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-indigo-900 mb-2">
                        <span className="font-bold">📖 Multi-session remediation</span> — for long PDFs you can tackle a page range now and finish later. The remediated HTML grows incrementally across sessions.
                      </div>
                      {pendingPdfFile && !pendingPdfBase64 && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2 flex items-start gap-1.5" role="status">
                          <span aria-hidden="true">📎</span>
                          <span>{t('pdf_audit.multi_session.no_pdf_attached') || "Original PDF isn't attached to this session — you'll be prompted to re-select it from disk when you start the fix. (Project files don't include the PDF bytes to stay small.)"}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-xs text-indigo-900 font-bold">Pages:</label>
                        <input
                          type="number"
                          min={1}
                          max={pdfAuditResult.pageCount}
                          value={pdfPageRange ? pdfPageRange.start : ''}
                          placeholder={pdfMultiSession ? '' : '1'}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (isNaN(v)) { setPdfPageRange(null); return; }
                            const end = pdfPageRange?.end || Math.min(v + 29, pdfAuditResult.pageCount);
                            setPdfPageRange({ start: Math.max(1, Math.min(v, pdfAuditResult.pageCount)), end });
                          }}
                          aria-label={t('pdf_audit.page_range.start_aria') || 'Start page'}
                          className="w-16 text-xs px-2 py-1 border border-indigo-300 rounded"
                        />
                        <span className="text-xs text-indigo-900">to</span>
                        <input
                          type="number"
                          min={1}
                          max={pdfAuditResult.pageCount}
                          value={pdfPageRange ? pdfPageRange.end : ''}
                          placeholder={pdfMultiSession ? '' : String(pdfAuditResult.pageCount)}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (isNaN(v)) { setPdfPageRange(null); return; }
                            const start = pdfPageRange?.start || 1;
                            setPdfPageRange({ start, end: Math.max(start, Math.min(v, pdfAuditResult.pageCount)) });
                          }}
                          aria-label={t('pdf_audit.page_range.end_aria') || 'End page'}
                          className="w-16 text-xs px-2 py-1 border border-indigo-300 rounded"
                        />
                        <span className="text-xs text-indigo-700">of {pdfAuditResult.pageCount}</span>
                        {pdfPageRange && (
                          <button
                            onClick={() => setPdfPageRange(null)}
                            className="text-xs text-indigo-600 underline hover:text-indigo-900"
                            aria-label={t('pdf_audit.page_range.clear_aria') || 'Clear page range and remediate whole document'}
                          >
                            (clear — do all)
                          </button>
                        )}
                      </div>
                      {pdfPageRange && (
                        <div className="text-xs text-indigo-700 mt-1.5">
                          ⏱ Estimated quota: ~{Math.max(1, Math.ceil((pdfPageRange.end - pdfPageRange.start + 1) / 2))} Gemini Vision calls + extraction passes for this range.
                        </div>
                      )}
                      {/* Auto-save toggle — critical for Canvas where IndexedDB
                          is wiped per session. ON by default. When ON, after
                          each completed range a project file auto-downloads to
                          the user's Downloads folder (overwriting the prior
                          auto-save) so they always have a portable artifact. */}
                      <label className="flex items-start gap-2 mt-2 text-xs text-indigo-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdfAutoSaveProject}
                          onChange={(e) => setPdfAutoSaveProject(e.target.checked)}
                          className="mt-0.5 accent-indigo-600"
                          aria-label={t('pdf_audit.multi_session.autosave_aria') || 'Auto-save project file after each completed range'}
                        />
                        <span>
                          <span className="font-bold">{t('pdf_audit.multi_session.autosave_label') || 'Auto-save project file after each range'}</span>
                          <span className="block text-indigo-700">
                            {pdfAutoSaveProject
                              ? 'A .alloflow.json file will download after each completed range so you can resume across sessions or browsers.'
                              : 'Off — your progress is saved only in this browser. Use the Save Project button manually to keep a portable file.'}
                          </span>
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Action buttons — transforms after pipeline has run */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {pdfFixResult ? (<>
                      <button onClick={async () => {
                        if (!pdfFixResult.accessibleHtml) return;
                        setPdfFixLoading(true); pdfFixModeRef.current = 'sweep'; setPdfFixStep('Scanning for new issues...');
                        const prevSnapshot = {
                          html: pdfFixResult.accessibleHtml,
                          afterScore: pdfFixResult.afterScore,
                          ai: safeCloneAudit(pdfFixResult.verificationAudit),
                          axe: safeCloneAudit(pdfFixResult.axeAudit),
                          chars: pdfFixResult.htmlChars,
                        };
                        try {
                          let html = pdfFixResult.accessibleHtml;
                          const cf = fixContrastViolations(html); if (cf.fixCount > 0) html = cf.html;
                          setPdfFixStep('Running audit...');
                          const [rv, ra] = await Promise.all([auditOutputAccessibility(html, true), runAxeAudit(html)]);
                          let committed = false;
                          if (ra && ra.totalViolations > 0) {
                            setPdfFixStep('Fixing ' + ra.totalViolations + ' violations...');
                            const fr = await autoFixAxeViolations(html, ra, pdfAutoFixPasses);
                            html = fr.html;
                            const [fv, fa] = await Promise.all([auditOutputAccessibility(html, true), runAxeAudit(html)]);
                            const candAi = fv || rv;
                            const candAxe = fa || ra;
                            const perfect = (candAi?.issues?.length === 0 && candAxe?.totalViolations === 0);
                            committed = commitOrRevertPdfFix(
                              prevSnapshot,
                              { html, ai: candAi, axe: candAxe, chars: html.length, perfect },
                              { commit: { autoFixPasses: (pdfFixResult.autoFixPasses || 0) + fr.passes, chunkState: fr.chunkState || pdfFixResult.chunkState, chunkWeightedScore: fr.chunkWeightedScore || pdfFixResult.chunkWeightedScore } },
                              'Additional Sweep'
                            );
                          } else {
                            const candAi = rv || pdfFixResult.verificationAudit;
                            const candAxe = ra || pdfFixResult.axeAudit;
                            const perfect = (candAi?.issues?.length === 0 && candAxe?.totalViolations === 0);
                            committed = commitOrRevertPdfFix(
                              prevSnapshot,
                              { html, ai: candAi, axe: candAxe, chars: html.length, perfect },
                              {},
                              'Additional Sweep'
                            );
                          }
                          if (committed) addToast('Sweep complete!', 'success');
                        } catch(e) { addToast('Sweep failed: ' + (e?.message || ''), 'error'); }
                        finally { setPdfFixLoading(false); setPdfFixStep(''); pdfFixModeRef.current = ''; }
                      }} disabled={pdfFixLoading} className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40">
                        {pdfFixLoading && pdfFixModeRef.current === 'sweep' ? <><span className="animate-spin">&#9203;</span> {pdfFixStep || 'Sweeping...'}</> : <><Sparkles size={16} /> {t('pdf_audit.fix_pass.additional_sweep') || 'Additional Sweep'}</>}
                      </button>
                      {/* Fix Remaining — always visible after first remediation so user can continue fixing */}
                      <button onClick={async () => {
                          if (!pdfFixResult.accessibleHtml) return;
                          setPdfFixLoading(true); pdfFixModeRef.current = 'fix';
                          const MAX_INTERNAL_PASSES = 3;
                          let html = pdfFixResult.accessibleHtml;
                          let bestHtml = html;
                          let bestIssueCount = (pdfFixResult.verificationAudit?.issues?.length || 0) + (pdfFixResult.axeAudit?.totalViolations || 0);
                          let bestAi = safeCloneAudit(pdfFixResult.verificationAudit);
                          let bestAxe = safeCloneAudit(pdfFixResult.axeAudit);
                          let totalPasses = 0;
                          const prevSnapshot = {
                            html: pdfFixResult.accessibleHtml,
                            afterScore: pdfFixResult.afterScore,
                            ai: safeCloneAudit(pdfFixResult.verificationAudit),
                            axe: safeCloneAudit(pdfFixResult.axeAudit),
                            chars: pdfFixResult.htmlChars,
                          };
                          try {
                            for (let pass = 0; pass < MAX_INTERNAL_PASSES; pass++) {
                              setPdfFixStep(`Pass ${pass + 1}/${MAX_INTERNAL_PASSES}: gathering issues...`);
                              const aiIssues = (bestAi?.issues || []).map(i => `AI: ${i.issue} (WCAG ${i.wcag || 'N/A'})`);
                              const axeIssues = [
                                ...(bestAxe?.critical || []).map(v => `AXE CRITICAL: ${v.description} (${v.id}) — ${v.wcag}`),
                                ...(bestAxe?.serious || []).map(v => `AXE SERIOUS: ${v.description} (${v.id}) — ${v.wcag}`),
                                ...(bestAxe?.moderate || []).map(v => `AXE MODERATE: ${v.description} (${v.id})`),
                                ...(bestAxe?.minor || []).map(v => `AXE MINOR: ${v.description} (${v.id})`)
                              ];
                              const allIssues = [...aiIssues, ...axeIssues];
                              if (allIssues.length === 0) break;
                              setPdfFixStep(`Pass ${pass + 1}: deterministic fixes...`);
                              let cf = fixContrastViolations(html); if (cf.fixCount > 0) html = cf.html;
                              if (/<html(?:\s[^>]*)?>/.test(html) && !/ lang=/.test(html.match(/<html[^>]*>/)?.[0] || '')) html = html.replace(/<html/, '<html lang="en"');
                              if (/<title>\s*<\/title>/.test(html) || (/<head[^>]*>/.test(html) && !/<title[^>]*>[^<]+<\/title>/.test(html))) {
                                const tm = html.match(/<h1[^>]*>([^<]+)<\/h1>/i); const tt = tm ? tm[1].trim() : 'Accessible Document';
                                html = html.includes('<title>') ? html.replace(/<title>[^<]*<\/title>/, `<title>${tt}</title>`) : html.replace(/<head([^>]*)>/, `<head$1><title>${tt}</title>`);
                              }
                              if (pass === 0) {
                                html = html.replace(/<div([^>]*style="[^"]*(?:font-size:\s*(?:1[8-9]|[2-9]\d)\s*px|font-weight:\s*(?:bold|[6-9]\d{2}))[^"]*"[^>]*)>([\s\S]*?)<\/div>/gi, (m, a, c) => { const t = c.replace(/<[^>]+>/g,'').trim(); return (t.length > 0 && t.length < 200 && !/<h\d/.test(c)) ? (/<h1[\s>]/i.test(html) ? `<h2${a}>${c}</h2>` : `<h1${a}>${c}</h1>`) : m; });
                              }
                              if (!/<header[\s>]/i.test(html)) html = html.replace(/(<body[^>]*>)([\s\S]*?)(<main[\s>]|<h1[\s>])/i, (m, b, p, n) => p.trim().length > 10 ? `${b}<header role="banner">${p}</header>${n}` : m);
                              if (!/<main[\s>]/i.test(html)) { html = html.replace(/<body([^>]*)>/, '<body$1>\n<main id="main-content" role="main">'); html = html.replace('</body>', '</main>\n</body>'); }
                              if (!/skip.to/i.test(html) && !/skip-nav/i.test(html)) html = html.replace(/<body([^>]*)>/, '<body$1>\n<a href="#main-content" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">Skip to main content</a>');
                              html = html.replace(/<img([^>]*)>/gi, (m, a) => /alt\s*=/.test(a) ? m : `<img alt="Document image"${a}>`);
                              html = html.replace(/<th(?![^>]*scope)/gi, '<th scope="col"');
                              html = html.replace(/<a([^>]*)>\s*<\/a>/gi, (m, a) => { const h = a.match(/href="([^"]*)"/); return `<a${a}>${h ? h[1].replace(/https?:\/\//, '').substring(0, 40) : 'Link'}</a>`; });
                              try {
                                if (bestAxe && bestAxe.totalViolations > 0) {
                                  setPdfFixStep(`Pass ${pass + 1}: Tier 2 surgical fixes...`);
                                  const t2 = await runTier2SurgicalFixes(html, bestAxe);
                                  if (t2 && t2.stats && t2.stats.accepted > 0) {
                                    html = t2.html;
                                    bestAxe = await runAxeAudit(html);
                                    warnLog(`[Fix Remaining] Pass ${pass + 1}: Tier 2 fixed ${t2.stats.violationsFixed} violation(s) in ${t2.stats.accepted} cluster(s)`);
                                  }
                                }
                                if (bestAxe && bestAxe.totalViolations > 0) {
                                  setPdfFixStep(`Pass ${pass + 1}: Tier 2.5 section-scoped fixes...`);
                                  const t25 = await runTier2_5SectionScopedFixes(html, bestAxe);
                                  if (t25 && t25.stats && t25.stats.accepted > 0) {
                                    html = t25.html;
                                    bestAxe = await runAxeAudit(html);
                                    warnLog(`[Fix Remaining] Pass ${pass + 1}: Tier 2.5 fixed ${t25.stats.violationsFixed} violation(s) in ${t25.stats.accepted} section(s)`);
                                  }
                                }
                                const _afterCount = (bestAi?.issues?.length || 0) + (bestAxe?.totalViolations || 0);
                                if (_afterCount > 0) {
                                  setPdfFixStep(`Pass ${pass + 1}: Tier 3 chunked fix (${_afterCount} remaining)...`);
                                  const remResult = await remediateSurgicallyThenAI(html, {
                                    aiIssues: (bestAi?.issues || []),
                                    axeResult: bestAxe,
                                    enableGeminiPass: true,
                                    onProgress: (msg) => setPdfFixStep(`Pass ${pass + 1}: ${msg}`),
                                  });
                                  if (remResult && remResult.html) {
                                    html = remResult.html;
                                    warnLog(`[Fix Remaining] Pass ${pass + 1}: Tier 3 ${remResult.surgicalFixCount} surgical fixes, ${remResult.geminiPassCount} Gemini passes, ${remResult.rejectedChunks} rejected chunks`);
                                  }
                                } else {
                                  warnLog(`[Fix Remaining] Pass ${pass + 1}: Tier 3 skipped — no violations remaining after Tier 2/2.5`);
                                }
                              } catch(remErr) {
                                warnLog(`[Fix Remaining] Pass ${pass + 1}: tiered cascade failed, continuing with deterministic-only fixes: ${remErr?.message}`);
                              }
                              cf = fixContrastViolations(html); if (cf.fixCount > 0) html = cf.html;
                              setPdfFixStep(`Pass ${pass + 1}: verifying (2 audits)...`);
                              const [rv1, rv2, ra] = await Promise.all([auditOutputAccessibility(html, true), auditOutputAccessibility(html, true), runAxeAudit(html)]);
                              if (ra && ra.totalViolations > 0) {
                                const fr = await autoFixAxeViolations(html, ra, 1);
                                html = fr.html;
                              }
                              const [fv1, fv2, fa] = await Promise.all([auditOutputAccessibility(html, true), auditOutputAccessibility(html, true), runAxeAudit(html)]);
                              const bestAiScores = [fv1, fv2, rv1, rv2].filter(Boolean).map(a => a?.score).filter(s => typeof s === 'number');
                              const finalAi = fv1 || fv2 || rv1 || rv2;
                              if (finalAi && bestAiScores.length > 0) finalAi.score = Math.round(bestAiScores.reduce((a,b) => a+b, 0) / bestAiScores.length);
                              const finalAxe = fa || ra;
                              const newCount = (finalAi?.issues?.length || 0) + (finalAxe?.totalViolations || 0);
                              totalPasses++;
                              warnLog(`[Fix Remaining] Pass ${pass + 1}: ${bestIssueCount} → ${newCount} issues`);
                              if (newCount < bestIssueCount) {
                                bestHtml = html; bestIssueCount = newCount; bestAi = finalAi; bestAxe = finalAxe;
                                if (newCount === 0) break; // perfect — stop
                              } else {
                                html = bestHtml; // revert to best, try again with different Gemini output
                                if (pass > 0) break; // two consecutive non-improvements — stop
                              }
                            }
                            setPdfFixStep('Final verification (averaging 3 audits)...');
                            const [endAi1, endAi2, endAi3, endAxe] = await Promise.all([
                              auditOutputAccessibility(bestHtml),
                              auditOutputAccessibility(bestHtml),
                              auditOutputAccessibility(bestHtml),
                              runAxeAudit(bestHtml)
                            ]);
                            const endScores = [endAi1, endAi2, endAi3].map(a => a?.score).filter(s => typeof s === 'number');
                            let avgScore;
                            avgScore = endScores.length > 0 ? Math.round(endScores.reduce((a,b) => a+b, 0) / endScores.length) : bestAi?.score;
                            warnLog('[Fix Remaining] Final scores: ' + endScores.join(', ') + ' → avg ' + avgScore);
                            const finalAxeResult = endAxe || bestAxe;
                            const finalAiResult = endAi1 || bestAi;
                            if (finalAiResult) finalAiResult.score = avgScore;
                            const perfect = ((finalAiResult?.issues?.length || 0) === 0 && (finalAxeResult?.totalViolations || 0) === 0);
                            const startCount = (pdfFixResult.verificationAudit?.issues?.length || 0) + (pdfFixResult.axeAudit?.totalViolations || 0);
                            const committed = commitOrRevertPdfFix(
                              prevSnapshot,
                              { html: bestHtml, ai: finalAiResult, axe: finalAxeResult, chars: bestHtml.length, perfect },
                              {
                                commit: { autoFixPasses: (pdfFixResult.autoFixPasses || 0) + totalPasses },
                                preserveOnRevert: { autoFixPasses: (pdfFixResult.autoFixPasses || 0) + totalPasses },
                              },
                              'Fix Remaining'
                            );
                            if (committed) {
                              addToast(bestIssueCount < startCount ? `Fixed! ${startCount} → ${bestIssueCount} issues (${totalPasses} passes).` : `${totalPasses} passes completed. ${bestIssueCount} issues may need manual remediation.`, bestIssueCount < startCount ? 'success' : 'info');
                            }
                          } catch(e) { warnLog('Fix remaining failed:', e); addToast('Fix remaining failed: ' + (e?.message || 'unknown error'), 'error'); }
                          finally { setPdfFixLoading(false); setPdfFixStep(''); pdfFixModeRef.current = ''; }
                        }} disabled={pdfFixLoading} className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40">
                          {pdfFixLoading && pdfFixModeRef.current === 'fix' ? <><span className="animate-spin">&#9203;</span> {pdfFixStep || 'Fixing...'}</> : <><Wrench size={16} /> {((pdfFixResult.verificationAudit?.issues?.length || 0) + (pdfFixResult.axeAudit?.totalViolations || 0)) > 0 ? `Fix ${(pdfFixResult.verificationAudit?.issues?.length || 0) + (pdfFixResult.axeAudit?.totalViolations || 0)} Remaining` : 'Run Additional Fix Pass'}</>}
                        </button>
                    </>) : (
                      <button onClick={async () => {
                        console.warn('[Fix&Verify btn] clicked — pendingPdfBase64:', !!pendingPdfBase64, 'pdfAuditResult:', !!pdfAuditResult, 'pageRange:', pdfPageRange);
                        const freshBase64 = await ensurePdfBase64();
                        if (!freshBase64) return; // user cancelled re-attach
                        if (pdfPageRange && pdfPageRange.start && pdfPageRange.end) {
                          fixAndVerifyPdf({ pageRange: [pdfPageRange.start, pdfPageRange.end], base64: freshBase64, fileName: pendingPdfFile?.name });
                        } else {
                          fixAndVerifyPdf({ base64: freshBase64, fileName: pendingPdfFile?.name });
                        }
                      }} disabled={pdfFixLoading} className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40">
                        {pdfFixLoading ? <span className="animate-spin">⏳</span> : <Sparkles size={16} />}
                        {pdfFixLoading ? (pdfFixStep || 'Fixing...') : (pdfPageRange ? `♿ Fix Pages ${pdfPageRange.start}–${pdfPageRange.end}` : `♿ Fix & Verify${pdfAuditResult.pageCount > 1 ? ` (${pdfAuditResult.pageCount} pages)` : ''}`)}
                      </button>
                    )}
                    {pdfFixLoading && (
                      <div className="basis-full mt-1" role="status" aria-live="polite">
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-label={t('pdf_audit.fix_pass.progress_aria') || 'Fix and verify progress'} aria-valuenow={pdfFixStep.includes('Step 1') ? 15 : pdfFixStep.includes('Step 2') ? 50 : pdfFixStep.includes('Step 3') ? 80 : pdfFixStep.includes('Step 4') ? 92 : pdfFixStep.includes('Auto-fix') ? 96 : 5} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 rounded-full" style={{ width: pdfFixStep.includes('Step 1') ? '15%' : pdfFixStep.includes('Step 2') ? '50%' : pdfFixStep.includes('Step 3') ? '80%' : pdfFixStep.includes('Step 4') ? '92%' : pdfFixStep.includes('Auto-fix') ? '96%' : '5%' }}></div>
                        </div>
                        <div className="text-xs text-slate-700 mt-0.5 text-center" role="status" aria-live="polite">{pdfFixStep}</div>

                        {/* ── Pipeline Step Tracker — always visible during processing ── */}
                        {/* ── Pipeline Step Tracker with contextual explanation ── */}
                        {(() => {
                          const steps = [
                            { step: 1, label: 'Extract', icon: '📄' },
                            { step: 2, label: 'Build HTML', icon: '🏗️' },
                            { step: 3, label: 'Audit', icon: '🔍' },
                            { step: 4, label: 'Fix & Verify', icon: '🔧' },
                          ];
                          const getContextNote = (stepText) => {
                            if (!stepText) return null;
                            if (/Step 1/i.test(stepText)) {
                              if (/image/i.test(stepText)) return { what: 'Finding every image in your document and preparing to write descriptions for each one.', why: 'When a student who is blind opens your document with a screen reader (like JAWS or NVDA), the software reads the page aloud. If an image has no description — called "alt text" — the screen reader either skips it entirely or reads the filename ("IMG_3847.jpg"), which tells the student nothing. We\'re identifying each image so it can receive a meaningful description like "Bar chart showing enrollment trends from 2020-2024."' };
                              if (/Vision|OCR|scanned/i.test(stepText)) return { what: 'Your PDF appears to be a scanned document — using AI to read the text from the page images.', why: 'When a paper document is scanned to PDF, it becomes a photograph of text — not actual text. A sighted person can read it fine, but a screen reader sees only a blank image. A student who is blind would hear nothing at all. This step uses AI vision to "read" the photograph and recover the actual words, handling tables, columns, and unusual layouts.' };
                              if (/batch/i.test(stepText)) return { what: 'Reading your document in sections to handle its length without losing any content.', why: 'Longer documents need to be read in chunks to ensure every page is captured accurately. Each section is processed carefully so that content spanning page breaks — like a paragraph that starts on page 3 and ends on page 4, or a table that continues across pages — isn\'t accidentally cut in half.' };
                              if (/Extract|text layer|deterministic/i.test(stepText)) return { what: 'Reading all the text, headings, tables, and lists directly from your document\'s digital structure.', why: 'Your PDF was created digitally (not scanned), which means the text is already stored as real characters. We\'re extracting everything including details like which text is a heading vs. body text, which content is in a table, and how lists are organized. Preserving this structure is critical because assistive technology uses it to help students navigate — a screen reader user can press "H" to jump between headings, just like a sighted student skims by scanning bold titles.' };
                              return { what: 'Carefully reading every element of your document — text, images, tables, lists, and formatting.', why: 'Every heading, every table cell, every image, every list item matters. If we miss a table header, a screen reader user won\'t know what column they\'re reading. If we miss a heading, they can\'t navigate by section. Accurate extraction is the foundation everything else builds on.' };
                            }
                            if (/Step 2/i.test(stepText)) {
                              if (/style|color/i.test(stepText)) return { what: 'Analyzing your document\'s visual design — colors, fonts, spacing, and layout — to preserve its appearance.', why: 'A common misconception is that accessible documents have to look plain or institutional. That\'s not true. We extract your original color palette, heading styles, and layout so the accessible version looks just as professional. Students with and without disabilities should see the same polished document — teachers shouldn\'t have to choose between accessibility and aesthetics.' };
                              if (/structure|JSON|block/i.test(stepText)) return { what: 'Converting your document into properly structured content — marking which text is a heading, which is a paragraph, which is a table, and which is a list.', why: 'A PDF tells a computer "put this text at position X, Y on the page" — it describes appearance, not meaning. But a screen reader needs meaning: "this is a chapter heading," "this is a data table with 4 columns," "this is a numbered list." Without this structure, a blind student experiences your textbook chapter as one continuous stream of text with no way to skip to the section they need, no way to understand table data, and no way to distinguish a heading from body text.' };
                              if (/[Pp]olish|table.*unif|style.*unif/i.test(stepText)) return { what: 'Smoothing out the seams between sections — merging split tables, unifying heading styles, and removing duplicated content at section boundaries.', why: 'Because long documents are processed in sections, sometimes a data table gets split in half at a boundary, or a heading style changes between sections. A student navigating with a screen reader might encounter the same heading twice, or find a table that suddenly "ends" and "restarts" mid-data. This step stitches everything together so the document reads as one coherent piece from start to finish.' };
                              if (/spell|grammar/i.test(stepText)) return { what: 'Scanning for garbled text, broken words, and conversion artifacts that could confuse readers and screen readers.', why: 'PDF conversion sometimes introduces subtle errors: "rn" instead of "m" (the letters look similar in some fonts), words split by hyphens that didn\'t rejoin, or extra spaces mid-word. These might be barely noticeable visually, but when a text-to-speech tool tries to pronounce "governrnent" or "stu dent," the result is confusing and disruptive — especially for students who rely on audio to access content.' };
                              return { what: 'Rebuilding your document with proper semantic structure that assistive technology can interpret and navigate.', why: 'Think of a PDF as a printed page photographed — it looks right, but a computer doesn\'t understand what anything means. This step transforms it into structured content where every element is labeled: headings have levels (H1 for chapter, H2 for section, H3 for subsection), tables have headers explaining each column, images have descriptions, and the reading order follows the visual layout. This is the core of what makes a document accessible — giving it meaning, not just appearance.' };
                            }
                            if (/Step 3/i.test(stepText)) {
                              if (/axe/i.test(stepText)) return { what: 'Running the axe-core accessibility checker — the same professional tool used by accessibility auditors at schools, universities, and government agencies.', why: 'axe-core (by Deque Systems) checks your document against WCAG 2.1 Level AA — the international accessibility standard referenced by the ADA. It catches concrete issues like: images with no alt text (blind students miss the content), text with insufficient color contrast (hard to read for the 1 in 12 males with color vision differences), tables missing header cells (a screen reader user can\'t tell which column they\'re in), form fields with no labels (quiz answers can\'t be entered), and elements unreachable by keyboard (essential for students who can\'t use a mouse).' };
                              if (/verif/i.test(stepText)) return { what: 'An AI accessibility reviewer is examining your document for problems that automated tools can\'t detect.', why: 'Automated checkers are excellent at finding technical violations, but some accessibility problems require understanding the content. For example: an image might have alt text that says "chart" — technically present, but useless to a blind student who needs "Bar chart showing 73% of students improved reading scores." The AI evaluates whether descriptions are meaningful, whether heading levels make logical sense for the content, and whether the document\'s structure matches how someone would actually read and navigate it.' };
                              return { what: 'Measuring your document\'s current accessibility level against the WCAG 2.1 AA standard before making any fixes.', why: 'This baseline score tells you where your document stands. The score reflects how well a student using a screen reader, screen magnifier, voice control, switch device, or other assistive technology could independently read and navigate it. It also establishes a "before" measurement so you can see exactly how much the remediation improves the document — both the numeric score and the specific barriers that were removed.' };
                            }
                            if (/Step 4|Auto-fix|Improv|pass \d/i.test(stepText)) {
                              if (/Verif|check/i.test(stepText)) return { what: 'Verifying that each round of fixes actually improved accessibility without introducing new problems.', why: 'After fixing issues, we re-check the entire document. For example, fixing one heading level might affect the navigation hierarchy elsewhere, or adding alt text to one image might create a duplicate ID. If any fix accidentally made the document less accessible, it\'s automatically rolled back. This verify-then-accept approach ensures the document only gets better, never worse — because an accessibility regression could leave a student more confused than before.' };
                              if (/surg|micro/i.test(stepText)) return { what: 'Applying targeted accessibility fixes — each one addresses a single specific barrier in your document.', why: 'These are precise repairs: adding a meaningful description to a specific image (so a blind student knows what it shows instead of hearing silence), correcting a heading that jumped from "Chapter" to "Subsection" with no "Section" in between (so keyboard navigation makes logical sense), adding a label to a form field (so a screen reader announces "Student Name" instead of just "edit text"), and adding scope attributes to table headers (so a screen reader can say "Column: Grade, Row: Student A, Value: 92" instead of just "92" with no context).' };
                              if (/zero issue|clean|0 issue/i.test(stepText)) return { what: 'Your document passed! No remaining accessibility barriers were detected by either the automated checker or AI reviewer.', why: 'Your document now meets WCAG 2.1 Level AA — the standard required by the ADA for all public educational institutions as of April 2026. This means: a student using a screen reader can navigate by headings and read all content including image descriptions; a student with low vision can zoom to 200% without losing content; a student who can\'t use a mouse can reach every element by keyboard; data tables announce their headers so values have context; and the document has proper reading order, sufficient color contrast, and labeled form fields.' };
                              if (/\d+ issue|\d+ axe.*\d+ AI/i.test(stepText)) {
                                const m = stepText.match(/(\d+)\s*issue/); const count = m ? m[1] : 'several';
                                if (fixIssuesList && fixIssuesList.issues && fixIssuesList.issues.length > 0) {
                                  const issueLines = fixIssuesList.issues.slice(0, 8).map(function(iss) { return '• ' + iss; }).join('\n');
                                  const issueText = fixIssuesList.issues.join(' ').toLowerCase();
                                  const whyParts = [];
                                  if (/alt|image|img/i.test(issueText)) whyParts.push('Images without descriptions mean a blind student hears silence where sighted students see diagrams, charts, or photographs — they miss educational content entirely.');
                                  if (/heading|h1|h2|h3|hierarchy/i.test(issueText)) whyParts.push('Broken heading hierarchy means a screen reader user can\'t navigate by section — they have to listen to the entire document linearly instead of jumping to the chapter they need.');
                                  if (/contrast|color/i.test(issueText)) whyParts.push('Low contrast text is unreadable for students with low vision, color vision differences, or anyone viewing on a screen in bright light.');
                                  if (/table|scope|header/i.test(issueText)) whyParts.push('Tables without header markup mean a screen reader announces cell values with no context — "92" instead of "Math Score for Student A: 92."');
                                  if (/label|input|form/i.test(issueText)) whyParts.push('Unlabeled form fields make worksheets and quizzes impossible to complete with a screen reader — the student hears "edit text" with no idea what to type.');
                                  if (/lang|language/i.test(issueText)) whyParts.push('Missing language attributes mean screen readers pronounce text with the wrong accent and phonetics, making content incomprehensible.');
                                  if (/link|anchor/i.test(issueText)) whyParts.push('Non-descriptive links ("click here") give screen reader users no idea where the link goes — they hear a list of identical "click here" links with no context.');
                                  if (/landmark|main|nav|region/i.test(issueText)) whyParts.push('Missing landmarks mean screen reader users can\'t quickly jump to the main content, navigation, or footer — they have to tab through everything sequentially.');
                                  if (whyParts.length === 0) whyParts.push('Each of these barriers prevents a student with a disability from accessing content that sighted, hearing, and motor-able students take for granted.');
                                  return { what: 'Fixing ' + count + ' specific accessibility barriers found in your document:\n' + issueLines, why: whyParts.join(' ') };
                                }
                                return { what: 'Fixing ' + count + ' remaining accessibility barriers found in your document.', why: 'Common fixes include: adding alt text to images, repairing heading hierarchy, increasing color contrast, adding labels to form inputs, and adding table header markup — each removes a barrier for students using assistive technology.' };
                              }
                              return { what: 'Making accessibility fixes — repairing headings, adding image descriptions, improving contrast, and labeling interactive elements.', why: 'The most common barriers in educational documents are: images without descriptions (affects blind and low-vision students), missing heading structure (makes navigation impossible for screen reader users), insufficient color contrast (affects students with low vision), unlabeled data tables (numbers without context), and missing form labels (makes worksheets unusable with assistive technology).' };
                            }
                            return null;
                          };
                          const context = getContextNote(pdfFixStep);
                          return (
                            <div className="mt-3 bg-white rounded-xl border border-slate-400 p-3 space-y-2" role="region" aria-label={t('pdf_audit.pipeline.tracker_aria') || 'Pipeline progress tracker'}>
                              <div className="flex items-center gap-1.5 text-[11px]">
                                {steps.map((s, i) => {
                                  const currentStep = pdfFixStep.includes('Step ' + s.step) || pdfFixStep.includes('step ' + s.step);
                                  const completedStep = steps.some(later => later.step > s.step && (pdfFixStep.includes('Step ' + later.step) || pdfFixStep.includes('step ' + later.step)));
                                  return (
                                    <React.Fragment key={s.step}>
                                      {i > 0 && <div className={`flex-1 h-0.5 rounded ${completedStep ? 'bg-green-400' : currentStep ? 'bg-indigo-300' : 'bg-slate-200'}`}></div>}
                                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold whitespace-nowrap ${completedStep ? 'bg-green-50 text-green-700 border border-green-200' : currentStep ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 animate-pulse' : 'text-slate-600'}`}>
                                        <span>{completedStep ? '✅' : s.icon}</span>
                                        <span>{s.label}</span>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                              {context && (
                                <div className="text-[11px] bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl px-4 py-3 border border-slate-400 space-y-1.5">
                                  <div className="text-slate-800 font-semibold leading-relaxed whitespace-pre-line">🔄 {context.what}</div>
                                  <div className="text-slate-600 leading-relaxed border-t border-slate-200 pt-1.5">💡 <span className="font-medium">{t('pdf_audit.pipeline.why_matters') || 'Why this matters:'}</span> {context.why}</div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* ── Boring Palette Theme Suggestion ── */}
                        {boringPalettePrompt && (
                          <div className="mt-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-3 animate-in fade-in duration-300">
                            <div className="text-xs font-bold text-amber-800 mb-1.5">🎨 The original document has minimal styling</div>
                            <div className="text-[10px] text-amber-700 mb-2">{t('pdf_audit.boring_palette.prompt') || 'Would you like to keep the original look or apply a theme?'}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: null, label: 'Keep Original', icon: '📎' },
                                { id: 'professional', label: 'Professional', icon: '💼' },
                                { id: 'academic', label: 'Academic', icon: '📚' },
                                { id: 'highContrast', label: 'High Contrast', icon: '◼️' },
                              ].map(opt => (
                                <button key={opt.id || 'keep'} onClick={() => {
                                  setBoringPalettePrompt(false);
                                  window.dispatchEvent(new CustomEvent('alloflow:boring-palette-choice', { detail: { seedId: opt.id } }));
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${opt.id === null ? 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50' : 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'}`}>
                                  {opt.icon} {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── Live Chunk Review — inline during processing so user sees it immediately ── */}
                        {(liveChunkSessionActive || liveChunkStream.length > 0) && (
                          <div id="live-remediation-panel" className="mt-3 bg-gradient-to-b from-white to-indigo-50 rounded-2xl border-2 border-indigo-300 p-4 space-y-2" role="region" aria-label={t('pdf_audit.live_chunk.review_aria') || 'Live chunk remediation review'}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg" aria-hidden="true">🔬</span>
                              <h4 className="text-sm font-bold text-indigo-800">{t('pdf_audit.live_chunk.heading_short') || 'Live Remediation'}</h4>
                              <span className="text-xs text-slate-600 ml-auto">{liveChunkStream.filter(c => c.status === 'complete').length}/{liveChunkStream.length} sections</span>
                            </div>
                            <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: liveChunkStream.length > 0 ? `${(liveChunkStream.filter(c => c.status === 'complete').length / liveChunkStream.length) * 100}%` : '0%' }}></div>
                            </div>
                            {chunkSaveFlash && <div className="text-[11px] text-emerald-600 font-bold text-center animate-in fade-in duration-200">💾 Progress auto-saved</div>}
                            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                              {liveChunkStream.map((chunk, ci) => {
                                const isWorking = chunk.status === 'working';
                                const totalFixes = (chunk.deterministicFixCount || 0) + (chunk.surgicalFixCount || 0);
                                const scoreColor = chunk.score >= 80 ? 'text-green-700' : chunk.score >= 60 ? 'text-amber-700' : 'text-red-700';
                                return (
                                  <div key={ci} className={`flex items-center gap-x-2 gap-y-1 px-3 py-2 rounded-lg border text-xs flex-wrap ${isWorking ? 'bg-indigo-50 border-indigo-200 animate-pulse' : chunk.score >= 80 ? 'bg-green-50 border-green-200' : chunk.score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                    <span>{isWorking ? '⏳' : chunk.score >= 80 ? '✅' : chunk.score >= 60 ? '🟡' : '🔴'}</span>
                                    <span className="font-bold text-slate-800">§{(chunk.index || ci) + 1}</span>
                                    {!isWorking && <>
                                      <span className="text-slate-600" aria-hidden="true">·</span>
                                      <span className="text-slate-700">WCAG</span>
                                      <span className={`font-black ${scoreColor}`}>{chunk.score}/100</span>
                                      {totalFixes > 0 && <>
                                        <span className="text-slate-600" aria-hidden="true">·</span>
                                        <span
                                          className="text-slate-700"
                                          title={`🔧 ${chunk.deterministicFixCount || 0} rule-based (deterministic) · 🎯 ${chunk.surgicalFixCount || 0} AI-targeted`}
                                        >
                                          {totalFixes} fix{totalFixes !== 1 ? 'es' : ''} applied
                                        </span>
                                      </>}
                                      {totalFixes === 0 && !chunk.usedOriginal && <>
                                        <span className="text-slate-600" aria-hidden="true">·</span>
                                        {chunk.score >= 80
                                          ? <span className="text-emerald-700 italic" title={t('pdf_audit.live_chunk.no_fixes_title') || 'This section already meets WCAG accessibility standards — the pipeline made no changes because none were needed.'}>✓ no fixes needed</span>
                                          : chunk.score >= 60
                                            ? <span className="text-amber-700 italic" title={`Score ${chunk.score}/100 — this pipeline run made 0 changes to this section. Re-running with different prompts, more fix passes, or a manual review may improve the score. The label is not a verdict that the section is unfixable.`}>0 changes this run · re-run or review may help</span>
                                            : <span className="text-amber-800 italic" title={`Score ${chunk.score}/100 — this pipeline run made 0 changes to this section. The remaining WCAG issues weren't ones the deterministic + surgical-AI + full-rewrite passes targeted on this run. Try re-running, increasing fix passes, or reviewing manually.`}>0 changes this run · low score · re-run or review</span>}
                                      </>}
                                      {chunk.wasRetried && <span className="text-amber-700 font-bold" title={t('pdf_audit.live_chunk.retried_title') || 'AI had to retry this section once after the first attempt failed integrity or token-preservation checks.'}>↻ retried</span>}
                                      {chunk.aiVerified && !chunk.usedOriginal && <span className="text-emerald-700" title={t('pdf_audit.live_chunk.content_verified_title') || "AI content-preservation check passed — the section's text content was preserved through the rewrite."}>✓ content verified</span>}
                                      {chunk.usedOriginal && <span className="text-red-700 font-bold" title={t('pdf_audit.live_chunk.ai_skipped_long_title') || 'AI rewrite failed or was rejected for this section — only deterministic (rule-based) fixes were applied. The section is still more accessible than the original, just less so than successfully AI-fixed sections.'}>{t('pdf_audit.live_chunk.ai_skipped_rule_only') || 'AI skipped · rule-based only'}</span>}
                                    </>}
                                    {isWorking && <span className="ml-auto text-indigo-600 font-bold">Fixing...</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── Why Accessibility Matters — educational content during wait ── */}
                        <div className="mt-4 bg-gradient-to-br from-sky-50 via-blue-50/40 to-indigo-50/30 border border-sky-200/60 rounded-2xl p-5 space-y-3" style={{ animation: 'fadeInUp 0.9s ease-out 1.5s both' }}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-200">
                              <span className="text-white text-lg" aria-hidden="true">♿</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-800">{t('pdf_audit.why_matters.heading') || 'Why Accessible Documents Matter'}</h4>
                              <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                                Over <strong className="text-slate-700">1 billion people worldwide</strong> live with some form of disability.
                                When digital documents lack proper structure, alt text, or sufficient contrast, they become invisible walls
                                that exclude students, employees, and community members from information everyone else takes for granted.
                                Accessibility isn't just about compliance — it's about ensuring <strong className="text-slate-700">equal participation in education, employment, and civic life</strong>.
                              </p>
                            </div>
                          </div>

                          {/* Benefits grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/80 rounded-lg border border-sky-100 p-2.5">
                              <div className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-0.5">🎓 Equitable Education</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.why_matters.udl_part1') || 'Accessible materials support Universal Design for Learning (UDL) — benefiting'} <em>{t('pdf_audit.why_matters.all') || 'all'}</em> {t('pdf_audit.why_matters.udl_part2') || 'learners regardless of ability, language, or learning style'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-sky-100 p-2.5">
                              <div className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-0.5">👥 Better User Experience (UX) for Everyone</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.why_matters.ux_part1') || 'Clear headings, logical structure, and sufficient contrast make documents easier to read for'} <em>{t('pdf_audit.why_matters.all') || 'all'}</em> {t('pdf_audit.why_matters.ux_part2') || 'users — including on mobile and in bright sunlight'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-sky-100 p-2.5">
                              <div className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-0.5">🔍 Improved SEO & Findability</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.why_matters.seo_desc') || 'Semantic HTML, alt text, and proper headings help search engines index content — boosting discoverability and organic reach'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-sky-100 p-2.5">
                              <div className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-0.5">💡 Innovation Driver</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.why_matters.innovation_desc') || 'Voice recognition, closed captioning, and screen readers all began as accessibility features — then became essential tools used by millions'}</div>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 text-center leading-relaxed italic">
                            Accessibility is the digital expression of equity. When we design for the margins, we create better experiences for the center.
                          </p>
                        </div>

                        {/* ── ADA Title II Legal Context — timed to appear after benefits section ── */}
                        <div className="mt-3 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-rose-50/30 border border-amber-200/60 rounded-2xl p-5 space-y-3" style={{ animation: 'fadeInUp 0.9s ease-out 4s both' }}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200">
                              <span className="text-white text-lg" aria-hidden="true">⚖️</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-800">{t('pdf_audit.ada.heading') || 'ADA Title II & WCAG 2.1 AA'}</h4>
                                <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">{t('pdf_audit.ada.deadline_badge') || 'Deadline: April 24, 2026'}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                                The U.S. Department of Justice finalized a rule under <strong className="text-slate-700">{t('pdf_audit.ada.title_strong') || 'Title II of the Americans with Disabilities Act (ADA)'}</strong> requiring
                                all state and local government entities to make their web content and digital documents conform to <strong className="text-slate-700">{t('pdf_audit.ada.wcag_strong') || 'WCAG 2.1 Level AA'}</strong>.
                                This applies to websites, mobile apps, PDFs, Word documents, and social media content.
                              </p>
                            </div>
                          </div>

                          {/* Timeline and scope */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/80 rounded-lg border border-amber-100 p-2.5">
                              <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-0.5">📅 Compliance Deadlines</div>
                              <div className="text-[11px] text-slate-600 leading-snug">
                                <strong className="text-rose-700">{t('pdf_audit.ada.deadline_50k') || 'April 24, 2026'}</strong> — entities serving 50,000+ people<br/>
                                <strong className="text-amber-700">{t('pdf_audit.ada.deadline_small') || 'April 26, 2027'}</strong> — entities serving fewer than 50,000 and special districts
                              </div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-amber-100 p-2.5">
                              <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-0.5">📋 What's Covered</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.ada.covered_desc') || 'Public-facing websites, mobile apps, digital documents (PDFs, Word, Excel, PowerPoint), and social media published by government entities'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-amber-100 p-2.5">
                              <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-0.5">🏛️ Who Must Comply</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.ada.who_desc') || 'All state and local government entities — including public schools, universities, courts, libraries, transit agencies, and municipal services'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-amber-100 p-2.5">
                              <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-0.5">🎯 Why It Matters</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.ada.matters_desc') || 'Beyond legal compliance: accessible documents ensure people with disabilities can equally access education, public services, employment, and civic participation'}</div>
                            </div>
                          </div>

                          <div className="bg-white/80 rounded-lg border border-amber-100 p-2.5 text-center">
                            <p className="text-[11px] text-slate-600 leading-snug">
                              <strong className="text-amber-800">{t('pdf_audit.ada.standard_callout') || 'The standard AlloFlow targets — WCAG 2.1 Level AA — is the exact standard required by this federal rule.'}</strong>{' '}
                              This remediation pipeline helps ensure your documents meet the technical requirements set by the DOJ.
                            </p>
                            <a href="https://www.ada.gov/resources/web-guidance/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-amber-700 hover:text-amber-900 underline decoration-amber-300">
                              Read the official guidance on ADA.gov →
                            </a>
                          </div>
                        </div>

                        {/* ── Image Review + Metadata Panel — shown during processing wait ── */}
                        {extractionData && (extractionData.images.length > 0 || extractionData.metadata) && (
                          <div className="mt-4 bg-gradient-to-b from-white to-slate-50 rounded-2xl border-2 border-slate-200 p-5 space-y-4" style={{ animation: 'fadeInUp 0.5s ease' }}>
                            {/* Document Info */}
                            {extractionData.metadata && (
                              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <span className="text-2xl">📋</span>
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-slate-800">{t('pdf_audit.doc_details.heading') || 'Document Details'}</h4>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-600">
                                    <span>📄 {extractionData.metadata.pageCount} pages</span>
                                    <span>📝 {Math.round(extractionData.metadata.extractedChars / 1000)}K characters</span>
                                    {extractionData.metadata.hasImages && <span>🖼️ {extractionData.images.length} images</span>}
                                    {extractionData.metadata.hasTables && <span>📊 Contains tables</span>}
                                    <span>🌐 Language: {extractionData.metadata.language === 'en' ? 'English' : extractionData.metadata.language === 'ar' ? 'Arabic' : extractionData.metadata.language === 'zh' ? 'Chinese' : extractionData.metadata.language === 'ru' ? 'Russian' : extractionData.metadata.language}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Image Review */}
                            {extractionData.images.length > 0 && (() => {
                              const _extFromSrc = (src) => {
                                const m = /^data:image\/([a-zA-Z0-9+.-]+)/.exec(src || '');
                                return m ? m[1].replace('jpeg', 'jpg').toLowerCase() : 'png';
                              };
                              const _downloadOne = (src, idx) => {
                                if (!src) return;
                                const a = document.createElement('a');
                                a.href = src;
                                a.download = 'image-' + (idx + 1) + '.' + _extFromSrc(src);
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              };
                              const _downloadAll = () => {
                                extractionData.images.forEach((im, i) => {
                                  if (!im.src) return;
                                  setTimeout(() => _downloadOne(im.src, i), i * 300);
                                });
                              };
                              const _downloadableCount = extractionData.images.filter(im => im.src).length;
                              return (
                              <div>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-lg">🖼️</span>
                                  <h4 className="text-sm font-bold text-slate-800">{t('pdf_audit.images.review_heading') || 'Review Image Descriptions'}</h4>
                                  <button
                                    onClick={_downloadAll}
                                    disabled={_downloadableCount === 0}
                                    className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 font-bold inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={t('pdf_audit.images.download_all_title') || 'Download every extracted image — useful as a manual fallback if AI reinsertion misplaces or skips one.'}
                                    aria-label={`Download all ${_downloadableCount} extracted images`}
                                  >
                                    ⬇ Download all
                                  </button>
                                  <span className="text-[10px] text-slate-500 ml-auto">{t('pdf_audit.images.edit_alt_hint') || 'Edit alt text below — changes apply to the final document'}</span>
                                </div>
                                <div className="space-y-3">
                                  {extractionData.images.map((img, imgIdx) => (
                                    <div key={imgIdx} className="flex gap-3 bg-white rounded-xl border border-slate-400 p-3">
                                      {img.src && (
                                        <div className="shrink-0 flex flex-col items-center gap-1">
                                          <img src={img.src} alt={img.description || 'Extracted image'} className="w-24 h-20 object-cover rounded-lg border border-slate-400" />
                                          <a
                                            href={img.src}
                                            download={'image-' + (imgIdx + 1) + '.' + _extFromSrc(img.src)}
                                            className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-medium inline-flex items-center gap-0.5"
                                            title={t('pdf_audit.images.download_one_title') || 'Download this image'}
                                            aria-label={`Download image ${imgIdx + 1}`}
                                          >
                                            ⬇ Download
                                          </a>
                                        </div>
                                      )}
                                      <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">Image {imgIdx + 1}</span>
                                          {img.isRegenerated && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{t('pdf_audit.images.ai_generated_badge') || 'AI Generated'}</span>}
                                          {img.type === 'decorative' && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">Decorative</span>}
                                        </div>
                                        <textarea
                                          defaultValue={img.description || ''}
                                          onChange={(e) => {
                                            window.dispatchEvent(new CustomEvent('alloflow:alt-text-edited', { detail: { index: imgIdx, altText: e.target.value } }));
                                            setExtractionData(prev => {
                                              if (!prev) return prev;
                                              const updated = { ...prev, images: prev.images.map((im, i) => i === imgIdx ? { ...im, description: e.target.value } : im) };
                                              return updated;
                                            });
                                          }}
                                          placeholder={t('pdf_audit.images.alt_placeholder') || 'Describe this image for screen reader users...'}
                                          rows={2}
                                          className="w-full text-[11px] p-2 border border-slate-400 rounded-lg resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                                          aria-label={`Alt text for image ${imgIdx + 1}`}
                                        />
                                        {img.educationalPurpose && (
                                          <div className="text-[10px] text-slate-500 italic">Purpose: {img.educationalPurpose}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              );
                            })()}

                            {/* ── Fidelity verification panel ──
                                Compares the source OCR text (pdf.js, or reconciled Tesseract+Vision
                                for scanned PDFs) against the current remediated HTML. Since the PDF
                                remediation pipeline is meant to preserve every word verbatim, any
                                missing word indicates a pipeline issue worth investigating. Ignore
                                if Simplify or Translate was explicitly toggled on. */}
                            {extractionData.fullText && (() => {
                              const _runCheck = () => {
                                const sourceText = extractionData.fullText || '';
                                let remediatedText = '';
                                try {
                                  const html = (typeof getPdfPreviewHtml === 'function') ? getPdfPreviewHtml() : '';
                                  const tmp = document.createElement('div');
                                  tmp.innerHTML = html || '';
                                  remediatedText = tmp.textContent || tmp.innerText || '';
                                } catch (e) { remediatedText = ''; }
                                if (!remediatedText || remediatedText.trim().length < 50) {
                                  setFidelityResult({ missing: [], totalSrc: 0, totalRem: 0, totalMissing: 0, fidelity: null, notReady: true });
                                  if (addToast) addToast('No remediated content to verify yet — run remediation first, then re-check fidelity.', 'info');
                                  return;
                                }
                                setFidelityResult(_buildMissingList(sourceText, remediatedText));
                              };
                              const disagreements = (extractionData.ocr && extractionData.ocr.disagreements) || [];
                              const method = (extractionData.metadata && extractionData.metadata.extractionMethod) || 'pdfjs';
                              const _manualRestore = () => {
                                if (!fidelityResult || !fidelityResult.missing || fidelityResult.missing.length === 0) return;
                                const beforeFidelity = fidelityResult.fidelity;
                                let result;
                                try { result = applyWordRestorationInPlace(fidelityResult.missing, extractionData.fullText); }
                                catch (e) { result = { restored: [], unplaceable: [] }; }
                                setTimeout(() => {
                                  _runCheck();
                                  setAutoRestoreSummary({
                                    restored: (result && result.restored) || [],
                                    unplaceable: (result && result.unplaceable) || [],
                                    beforeFidelity,
                                    afterFidelity: null,
                                  });
                                  if (typeof addToast === 'function') {
                                    const rCount = ((result && result.restored) || []).length;
                                    const uCount = ((result && result.unplaceable) || []).length;
                                    addToast(rCount + ' word' + (rCount === 1 ? '' : 's') + ' restored' + (uCount > 0 ? ' · ' + uCount + ' in recovery appendix' : ''), 'success');
                                  }
                                }, 500);
                              };
                              const imgReport = imageReinsertionReport;
                              const imgFailCount = imgReport ? ((imgReport.missingSrc || []).length + (imgReport.droppedByAi || []).length) : 0;
                              const _regenerateImage = async (imgIdx, description) => {
                                if (typeof callImagen !== 'function') { if (addToast) addToast('Image regeneration unavailable', 'error'); return; }
                                if (addToast) addToast(`Regenerating image #${imgIdx}…`, 'info');
                                const _buildImagePrompt = () => {
                                  const desc = (description || '').trim();
                                  if (desc.length >= 5) {
                                    return `${desc}. Clean, professional style. No text overlays.`;
                                  }
                                  try {
                                    const html = (pdfFixResultRef && pdfFixResultRef.current && pdfFixResultRef.current.accessibleHtml)
                                      || (pdfFixResult && pdfFixResult.accessibleHtml)
                                      || '';
                                    if (html) {
                                      const figRe = new RegExp('<figure[^>]*id=["\\\']pdf-img-' + imgIdx + '[^"\\\']*["\\\'][^>]*>', 'i');
                                      const m = html.match(figRe);
                                      if (m && typeof m.index === 'number') {
                                        const before = html.slice(Math.max(0, m.index - 2000), m.index);
                                        const headings = [...before.matchAll(/<h[1-6][^>]*>([^<]{3,200})<\/h[1-6]>/gi)];
                                        const paras = [...before.matchAll(/<p[^>]*>([^<]{20,400})<\/p>/gi)];
                                        const lastHeading = headings.length ? headings[headings.length - 1][1].trim() : '';
                                        const lastPara = paras.length ? paras[paras.length - 1][1].trim() : '';
                                        const ctx = [lastHeading, lastPara].filter(Boolean).join(' — ');
                                        if (ctx) {
                                          return `Illustration for the topic "${ctx}". Clean, professional educational style. No text overlays, letters, or labels.`;
                                        }
                                      }
                                    }
                                  } catch (e) { /* non-blocking — fall through to generic */ }
                                  return `Educational illustration for image #${imgIdx}. Clean, professional style. No text overlays.`;
                                };
                                try {
                                  const prompt = _buildImagePrompt();
                                  const dataUrl = await callImagen(prompt, 400, 0.85);
                                  if (!dataUrl) { if (addToast) addToast(`Regeneration failed for image #${imgIdx}`, 'error'); return; }
                                  try {
                                    const iframes = document.querySelectorAll('iframe');
                                    for (const iframe of iframes) {
                                      const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                      if (!doc) continue;
                                      const fig = doc.getElementById(`pdf-img-${imgIdx}-figure`);
                                      if (!fig) continue;
                                      const container = fig.querySelector('[id$="-container"]');
                                      if (!container) continue;
                                      let img = container.querySelector('img');
                                      if (img) {
                                        img.src = dataUrl;
                                      } else {
                                        const svg = container.querySelector('svg');
                                        if (svg) svg.remove();
                                        container.querySelectorAll('span').forEach(s => { if (!s.closest('button') && !s.closest('label')) s.remove(); });
                                        container.style.background = 'none';
                                        container.style.border = 'none';
                                        container.style.minHeight = '0';
                                        const newImg = doc.createElement('img');
                                        newImg.src = dataUrl;
                                        newImg.alt = description || '';
                                        newImg.style.cssText = 'max-width:100%;border-radius:8px;border:1px solid #e2e8f0';
                                        container.insertBefore(newImg, container.firstChild);
                                      }
                                      break;
                                    }
                                  } catch(patchErr) { /* preview patch is best-effort */ }
                                  setExtractionData(prev => {
                                    if (!prev || !prev.images) return prev;
                                    return { ...prev, images: prev.images.map((im, i) => i === imgIdx - 1 ? { ...im, generatedSrc: dataUrl, isRegenerated: true } : im) };
                                  });
                                  setImageReinsertionReport(prev => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      missingSrc: (prev.missingSrc || []).filter(n => n !== imgIdx),
                                      missingSrcDetails: (prev.missingSrcDetails || []).filter(d => d.idx !== imgIdx),
                                      droppedByAi: (prev.droppedByAi || []).filter(n => n !== imgIdx),
                                    };
                                  });
                                  if (addToast) addToast(`Image #${imgIdx} regenerated ✓`, 'success');
                                } catch (e) {
                                  if (addToast) addToast(`Regeneration failed: ${(e && e.message) || 'unknown error'}`, 'error');
                                }
                              };
                              return (
                              <div className="mt-3">
                                {/* Persistent Content-Integrity banner — uses pdfFixResult.integrityFinal
                                    (written by the auto-fidelity ladder) so the user sees a stable
                                    verdict AFTER remediation completes, not just while it's running.
                                    Stays visible until remediation is re-run. Color-coded by coverage. */}
                                {pdfFixResult && (() => {
                                  const _integ = pdfFixResult.integrityFinal;
                                  const _verifying = !!pdfFixResult.integrityVerifying;
                                  const _pct = (_integ && typeof _integ.coverage === 'number')
                                    ? _integ.coverage
                                    : (typeof pdfFixResult.integrityCoverage === 'number' ? pdfFixResult.integrityCoverage : null);
                                  // Hoisted above the _verifying branch so the diff button stays
                                  // visible while integrity verification is running. Previously the
                                  // verifying banner replaced the entire banner row, hiding the diff
                                  // button until verification finished — which made the diff button
                                  // appear broken after the 1st remediation pass (verification was
                                  // running in the background) and only "work" after the 2nd pass
                                  // (which doesn't auto-verify, so the banner never gets hidden).
                                  const _hasDiffInputs = !!(pdfFixResult.sourceText && pdfFixResult.finalText);
                                  if (_verifying) {
                                    return (
                                      <div className="mb-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-xs text-sky-900 flex items-center gap-2 flex-wrap">
                                        <RefreshCw size={14} className="animate-spin text-sky-600 shrink-0" />
                                        <span className="font-bold">{t('pdf_audit.integrity.verifying') || 'Verifying content integrity…'}</span>
                                        <span className="text-sky-700 text-[11px]">pdf.js source comparison in progress — banner will update when recovery finishes.</span>
                                        {_hasDiffInputs && (
                                          <button
                                            onClick={async () => {
                                              console.debug('[Diff] Button clicked (during verification) — diffLibReady=' + diffLibReady + ', window.Diff=' + !!window.Diff);
                                              setDiffViewOpen(true);
                                              const ok = await _ensureDiffLib();
                                              if (!ok) {
                                                console.warn('[Diff] _ensureDiffLib returned false — script load failed');
                                                if (typeof addToast === 'function') addToast('Diff engine failed to load (network blocked?). Check your connection and try again.', 'error');
                                              }
                                            }}
                                            className="ml-auto text-[10px] px-2 py-1 bg-white border border-sky-300 text-sky-700 rounded-md hover:bg-sky-50 font-bold inline-flex items-center gap-1 shrink-0"
                                            aria-label={t('pdf_audit.integrity.diff_open_verifying_aria') || 'Open diff view (verification still running in background)'}
                                            title={t('pdf_audit.integrity.diff_open_verifying_title') || 'Open the word-level diff view. The integrity verification is still running in the background, but the diff itself is ready now.'}
                                          >
                                            📝 Diff view
                                          </button>
                                        )}
                                      </div>
                                    );
                                  }
                                  if (_pct == null) {
                                    if (!_hasDiffInputs) return null;
                                    return (
                                      <div className="mb-2 bg-slate-50 border border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-500">ℹ</span>
                                        <span className="font-bold">{t('pdf_audit.integrity.unverified') || 'Content integrity unverified'}</span>
                                        <span className="text-slate-500 text-[11px]">(ground-truth extraction unavailable — use Diff view to inspect source ↔ HTML manually, or Re-check to retry)</span>
                                        <div className="ml-auto inline-flex items-center gap-1 shrink-0">
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
                                            className="text-[10px] px-2 py-1 bg-white border border-slate-400 text-slate-700 rounded-md hover:bg-slate-50 font-bold inline-flex items-center gap-1"
                                            aria-label={t('pdf_audit.integrity.diff_open_aria') || 'Open diff view of source PDF text vs. final HTML'}
                                            title={t('pdf_audit.integrity.diff_open_title') || 'Side-by-side word-level diff: see every insertion, deletion, and paraphrase between the source PDF and the remediated HTML.'}
                                          >
                                            📝 Diff view
                                          </button>
                                          <button
                                            onClick={_runCheck}
                                            className="text-[10px] px-2 py-1 bg-white border border-slate-400 text-slate-700 rounded-md hover:bg-slate-50 font-bold inline-flex items-center gap-1"
                                            aria-label={t('pdf_audit.integrity.recheck_aria') || 'Re-run pdf.js content integrity check'}
                                            title={t('pdf_audit.integrity.recheck_title') || 'Re-run the fidelity recovery ladder (Stages A-D) against the current remediated HTML.'}
                                          >
                                            🔍 Re-check
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                  const _reRun = (
                                    <div className="ml-auto inline-flex items-center gap-1 shrink-0">
                                      {_hasDiffInputs && (
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
                                          className="text-[10px] px-2 py-1 bg-white border border-slate-400 text-slate-700 rounded-md hover:bg-slate-50 font-bold inline-flex items-center gap-1"
                                          aria-label={t('pdf_audit.integrity.diff_open_aria') || 'Open diff view of source PDF text vs. final HTML'}
                                          title={t('pdf_audit.integrity.diff_open_title') || 'Side-by-side word-level diff: see every insertion, deletion, and paraphrase between the source PDF and the remediated HTML.'}
                                        >
                                          📝 Diff view
                                        </button>
                                      )}
                                      <button
                                        onClick={_runCheck}
                                        className="text-[10px] px-2 py-1 bg-white border border-slate-400 text-slate-700 rounded-md hover:bg-slate-50 font-bold inline-flex items-center gap-1"
                                        aria-label={t('pdf_audit.integrity.recheck_aria') || 'Re-run pdf.js content integrity check'}
                                        title={t('pdf_audit.integrity.recheck_title') || 'Re-run the fidelity recovery ladder (Stages A-D) against the current remediated HTML.'}
                                      >
                                        🔍 Re-check
                                      </button>
                                    </div>
                                  );
                                  const _metaDetail = _integ && _integ.stagesRan ? (
                                    <span className="text-[10px] opacity-75">
                                      {_integ.stagesRan.retry > 0 && ` · ${_integ.stagesRan.retry} AI`}
                                      {_integ.stagesRan.sentence > 0 && ` · ${_integ.stagesRan.sentence} sentence`}
                                      {_integ.stagesRan.fuzzy > 0 && ` · ${_integ.stagesRan.fuzzy} fuzzy`}
                                      {_integ.stagesRan.dedup > 0 && ` · ${_integ.stagesRan.dedup} dedup'd`}
                                    </span>
                                  ) : null;
                                  if (_pct >= 98) {
                                    return (
                                      <div className="mb-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-900 flex items-center gap-2 flex-wrap">
                                        <span className="text-emerald-600 font-bold">✓</span>
                                        <span className="font-bold">Content integrity: {_pct}%</span>
                                        <span className="text-emerald-700 text-[11px]">pdf.js verified</span>
                                        {_metaDetail}
                                        {_reRun}
                                      </div>
                                    );
                                  }
                                  if (_pct >= 95) {
                                    return (
                                      <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900 flex items-center gap-2 flex-wrap">
                                        <span className="text-amber-600 font-bold">⚠</span>
                                        <span className="font-bold">Content integrity: {_pct}%</span>
                                        <span className="text-amber-700 text-[11px]">
                                          small amount of source text may be paraphrased or missing
                                          {_integ && typeof _integ.totalMissing === 'number' && _integ.totalMissing > 0 ? ` · ${_integ.totalMissing} word${_integ.totalMissing === 1 ? '' : 's'}` : ''}
                                        </span>
                                        {_metaDetail}
                                        {_reRun}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="mb-2 bg-rose-50 border border-rose-300 rounded-xl px-3 py-2 text-xs text-rose-900 flex items-center gap-2 flex-wrap">
                                      <span className="text-rose-600 font-bold">⚠</span>
                                      <span className="font-bold">Content integrity: {_pct}%</span>
                                      <span className="text-rose-700 text-[11px]">
                                        significant content may be missing
                                        {_integ && typeof _integ.totalMissing === 'number' && _integ.totalMissing > 0 ? ` · ${_integ.totalMissing.toLocaleString()} word${_integ.totalMissing === 1 ? '' : 's'} unmatched` : ''}
                                         — review missing words below or re-run recovery.
                                      </span>
                                      {_metaDetail}
                                      {_reRun}
                                    </div>
                                  );
                                })()}
                                {/* Verification Details accordion — the toast ("X% coverage verified")
                                    is transient, so this persistent panel lets the user actually review
                                    the numbers after the fact. Includes char/word coverage, stage
                                    counts, ground-truth method, and the verified-at timestamp. */}
                                {pdfFixResult && (pdfFixResult.integrityFinal || typeof pdfFixResult.integrityCoverage === 'number') && (() => {
                                  const _integ = pdfFixResult.integrityFinal;
                                  const _stagesRan = (_integ && _integ.stagesRan) || {};
                                  const _verifiedAt = _integ && _integ.verifiedAt ? new Date(_integ.verifiedAt) : null;
                                  const _charPct = (_integ && typeof _integ.charCoverage === 'number')
                                    ? _integ.charCoverage
                                    : (typeof pdfFixResult.integrityCoverage === 'number' ? pdfFixResult.integrityCoverage : null);
                                  const _wordPct = _integ && typeof _integ.coverage === 'number' ? _integ.coverage : null;
                                  const _totalSrc = _integ && typeof _integ.totalSrc === 'number' ? _integ.totalSrc : null;
                                  const _totalMissing = _integ && typeof _integ.totalMissing === 'number' ? _integ.totalMissing : null;
                                  const _method = pdfFixResult.groundTruthMethod || 'unknown';
                                  return (
                                    <details open className="mb-2 bg-slate-50 border border-slate-400 rounded-xl text-[11px]">
                                      <summary className="cursor-pointer font-bold text-slate-700 select-none px-3 py-1.5 hover:bg-slate-100 rounded-xl inline-flex items-center gap-2">
                                        <span>📋</span>
                                        <span>{t('pdf_audit.verification.details_heading') || 'Verification details'}</span>
                                        <span className="text-slate-500 font-normal text-[10px]">— char + word coverage, recovery stages, source method</span>
                                      </summary>
                                      <div className="px-3 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                                        {_charPct != null && (
                                          <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('pdf_audit.verification.char_coverage') || 'Char coverage'}</div>
                                            <div className={`text-sm font-black ${_charPct >= 98 ? 'text-emerald-600' : _charPct >= 95 ? 'text-amber-600' : 'text-rose-600'}`}>{_charPct}%</div>
                                          </div>
                                        )}
                                        {_wordPct != null && (
                                          <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('pdf_audit.verification.word_coverage') || 'Word coverage'}</div>
                                            <div className={`text-sm font-black ${_wordPct >= 98 ? 'text-emerald-600' : _wordPct >= 95 ? 'text-amber-600' : 'text-rose-600'}`}>{_wordPct}%</div>
                                          </div>
                                        )}
                                        {_totalSrc != null && (
                                          <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('pdf_audit.verification.source_words') || 'Source words'}</div>
                                            <div className="text-sm font-black text-slate-700">{_totalSrc.toLocaleString()}</div>
                                          </div>
                                        )}
                                        {_totalMissing != null && (
                                          <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unmatched</div>
                                            <div className={`text-sm font-black ${_totalMissing === 0 ? 'text-emerald-600' : _totalMissing < 10 ? 'text-amber-600' : 'text-rose-600'}`}>{_totalMissing.toLocaleString()}</div>
                                          </div>
                                        )}
                                        <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5 col-span-2 sm:col-span-4">
                                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t('pdf_audit.verification.recovery_stages') || 'Recovery stages applied'}</div>
                                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                                            <span><span className="font-bold text-indigo-700">{_stagesRan.retry || 0}</span> {t('pdf_audit.verification.ai_retry') || 'AI retry'}</span>
                                            <span><span className="font-bold text-indigo-700">{_stagesRan.sentence || 0}</span> deterministic sentence</span>
                                            <span><span className="font-bold text-indigo-700">{_stagesRan.fuzzy || 0}</span> fuzzy anchor</span>
                                            <span><span className="font-bold text-indigo-700">{_stagesRan.dedup || 0}</span> duplicate collapsed</span>
                                          </div>
                                        </div>
                                        <div className="bg-white border border-slate-400 rounded-lg px-2 py-1.5 col-span-2 sm:col-span-4 flex items-center gap-3 flex-wrap">
                                          <div>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">{t('pdf_audit.verification.ground_truth') || 'Ground truth:'}</span>
                                            <span className="text-[11px] font-mono text-slate-700">{_method}</span>
                                          </div>
                                          {_verifiedAt && (
                                            <div>
                                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Verified:</span>
                                              <span className="text-[11px] text-slate-700">{_verifiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                          )}
                                          {pdfFixResult.sourceText && pdfFixResult.finalText && (
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
                                              className="ml-auto text-[10px] px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold inline-flex items-center gap-1"
                                              title={t('pdf_audit.verification.open_diff_title') || 'Open the word-level diff view'}
                                            >
                                              📝 Open diff view
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </details>
                                  );
                                })()}
                                {/* Image reinsertion failures row — surfaces silently-dropped images so the user sees them. */}
                                {imgFailCount > 0 && (
                                  <details className="mb-2 bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px]" open>
                                    <summary className="cursor-pointer font-bold text-amber-800 select-none">
                                      ⚠️ {imgFailCount} image{imgFailCount === 1 ? '' : 's'} failed to reinsert — click to review
                                    </summary>
                                    <div className="mt-2 space-y-1">
                                      {(imgReport.missingSrcDetails || []).map((m, i) => (
                                        <div key={`src-${i}`} className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0">#{m.idx}</span>
                                          <span className="text-[10px] text-slate-700 shrink-0">{m.page ? `Page ${m.page}` : 'Unknown page'} — extraction failed</span>
                                          <span className="text-[10px] text-slate-500 italic truncate flex-1">{(m.description || '').substring(0, 80)}</span>
                                          <button
                                            onClick={() => _regenerateImage(m.idx, m.description)}
                                            className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shrink-0"
                                            title={t('pdf_audit.images.regen_title') || 'Regenerate this image via AI using the stored description'}
                                            aria-label={`Regenerate image ${m.idx} via AI`}
                                          >🪄 Regenerate</button>
                                        </div>
                                      ))}
                                      {(imgReport.droppedByAi || []).map((idx, i) => {
                                        const srcImg = extractionData.images && extractionData.images[idx - 1];
                                        const desc = srcImg ? srcImg.description : '';
                                        return (
                                        <div key={`ai-${i}`} className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded shrink-0">#{idx}</span>
                                          <span className="text-[10px] text-slate-700 shrink-0">{t('pdf_audit.images.dropped_by_ai') || 'Dropped by AI pass'}</span>
                                          <span className="text-[10px] text-slate-500 italic truncate flex-1">{(desc || '').substring(0, 80)}</span>
                                          <button
                                            onClick={() => _regenerateImage(idx, desc)}
                                            className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shrink-0"
                                            title={t('pdf_audit.images.regen_title') || 'Regenerate this image via AI using the stored description'}
                                            aria-label={`Regenerate image ${idx} via AI`}
                                          >🪄 Regenerate</button>
                                        </div>);
                                      })}
                                      <p className="text-[10px] text-slate-500 italic mt-2">{t('pdf_audit.images.regen_hint') || 'Click Regenerate to recreate an image via AI using its stored description, or use Upload/Replace inside the figure in the preview.'}</p>
                                    </div>
                                  </details>
                                )}
                                {/* Auto-restore summary — shown after the auto-flow or a manual restore run. */}
                                {autoRestoreSummary && (
                                  <div className="mb-2 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-900 flex items-center gap-2 flex-wrap">
                                    <span className="font-bold">✨ Restore applied:</span>
                                    <span>{autoRestoreSummary.restored.length} word{autoRestoreSummary.restored.length === 1 ? '' : 's'} spliced back{autoRestoreSummary.unplaceable.length > 0 ? ` · ${autoRestoreSummary.unplaceable.length} in Content Recovery appendix` : ''}</span>
                                    {autoRestoreSummary.beforeFidelity != null && fidelityResult && (
                                      <span className="text-[10px] text-emerald-700 ml-auto">{autoRestoreSummary.beforeFidelity}% → {fidelityResult.fidelity}%</span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-lg">🔍</span>
                                  <h4 className="text-sm font-bold text-slate-800">{t('pdf_audit.fidelity.heading') || 'Verify Text Fidelity'}</h4>
                                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                    via {String(method).replace('+', ' + ')}
                                  </span>
                                  <button
                                    onClick={_runCheck}
                                    className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 font-bold inline-flex items-center gap-1"
                                    title={t('pdf_audit.fidelity.run_title') || 'Compare the remediated document against the source text — flags any words that appear in the source but not in the current remediated output.'}
                                    aria-label={t('pdf_audit.fidelity.run_aria') || 'Run text fidelity check against source OCR'}
                                  >
                                    🔍 Run fidelity check
                                  </button>
                                  {fidelityResult && fidelityResult.missing && fidelityResult.missing.length > 0 && (
                                    <button
                                      onClick={_manualRestore}
                                      className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 font-bold inline-flex items-center gap-1"
                                      title={t('pdf_audit.fidelity.restore_title') || 'Splice missing words back into the remediated document using fuzzy context-anchor matching. Unplaceable words go to a Content Recovery appendix so nothing is lost.'}
                                      aria-label={t('pdf_audit.fidelity.restore_aria') || 'Restore missing words into the remediated document'}
                                    >
                                      🔧 Restore missing words
                                    </button>
                                  )}
                                  {fidelityResult && !fidelityResult.notReady && (
                                    <span className="text-[10px] text-slate-500 ml-auto">
                                      {fidelityResult.fidelity}% · {fidelityResult.totalMissing === 0 ? 'no missing words ✓' : `${fidelityResult.totalMissing} potentially missing`}
                                    </span>
                                  )}
                                </div>
                                {fidelityResult && fidelityResult.notReady && (
                                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-xs text-amber-900">
                                    <strong>{t('pdf_audit.fidelity.not_ready') || 'Remediation not ready.'}</strong> The fidelity check compares source text to the remediated preview, but the preview is empty. Finish (or start) remediation, then click Run fidelity check again.
                                  </div>
                                )}
                                {fidelityResult && !fidelityResult.notReady && (
                                  <div className="bg-white rounded-xl border border-slate-400 p-3 space-y-2">
                                    <div className="flex items-baseline gap-3 text-xs flex-wrap">
                                      <span className={`font-bold ${fidelityResult.fidelity >= 99 ? 'text-emerald-700' : fidelityResult.fidelity >= 95 ? 'text-amber-700' : 'text-red-700'}`}>
                                        {fidelityResult.fidelity}% fidelity
                                      </span>
                                      <span className="text-slate-600">
                                        {fidelityResult.totalMissing === 0 ? 'No words missing ✓' : `${fidelityResult.totalMissing} word${fidelityResult.totalMissing === 1 ? '' : 's'} potentially missing`}
                                      </span>
                                      <span className="text-[10px] text-slate-600 ml-auto">
                                        source: {fidelityResult.totalSrc.toLocaleString()} tokens · remediated: {fidelityResult.totalRem.toLocaleString()} tokens
                                      </span>
                                    </div>
                                    {fidelityResult.missing.length > 0 && (
                                      <details className="text-[11px]">
                                        <summary className="cursor-pointer font-bold text-slate-600 hover:text-slate-800 select-none">
                                          Show missing words ({Math.min(50, fidelityResult.missing.length)} of {fidelityResult.missing.length})
                                        </summary>
                                        <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                                          {fidelityResult.missing.slice(0, 50).map((m, i) => (
                                            <li key={i} className="flex items-baseline gap-2">
                                              <code className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono text-[10px]">{m.word}</code>
                                              <span className="text-slate-500 text-[10px]">{m.missingCount === 1 ? 'missing once' : `${m.missingCount}× missing`}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </details>
                                    )}
                                    <p className="text-[10px] text-slate-500 italic">
                                      The remediation pipeline should preserve every word. A non-zero missing count indicates a drop worth investigating — unless Simplify or Translate was toggled, in which case some word changes are expected.
                                    </p>
                                  </div>
                                )}
                                {disagreements.length > 0 && (
                                  <details className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px]">
                                    <summary className="cursor-pointer font-bold text-amber-800 select-none">
                                      ⚠️ Tesseract & Vision disagreed on {disagreements.length} page{disagreements.length === 1 ? '' : 's'} — click to review
                                    </summary>
                                    <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                                      {disagreements.map((d, i) => (
                                        <div key={i} className="bg-white rounded-lg border border-amber-100 p-2">
                                          <div className="font-bold text-[10px] text-amber-700 mb-1">
                                            Page {d.pageNum} — Tesseract: {d.tesseractChars} chars · Vision: {d.visionChars} chars
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div>
                                              <div className="font-bold text-slate-600">Tesseract</div>
                                              <div className="bg-slate-50 p-1 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                                                {d.tesseractText.substring(0, 500)}{d.tesseractText.length > 500 ? '…' : ''}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="font-bold text-slate-600">Vision</div>
                                              <div className="bg-slate-50 p-1 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                                                {d.visionText.substring(0, 500)}{d.visionText.length > 500 ? '…' : ''}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}
                              </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* ── Knowbility Partner Panel — shown during processing wait time ── */}
                        <div className="mt-3 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/30 border border-indigo-200/60 rounded-2xl p-5 space-y-3" style={{ animation: 'fadeInUp 0.9s ease-out 7s both' }}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-200">
                              <span className="text-white font-black text-base">K</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800">Knowbility</span>
                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{t('pdf_audit.knowbility.partner_badge') || 'Accessibility Partner'}</span>
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">501(c)(3) Nonprofit</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                                <strong className="text-slate-700">{t('pdf_audit.knowbility.mission_strong') || 'Mission: Create an inclusive digital world for people with disabilities.'}</strong>{' '}
                                Founded in 1999 in Austin, TX, Knowbility is an award-winning nonprofit that helps organizations ensure
                                their technology meets the highest accessibility benchmarks through expert testing, training, and remediation.
                              </p>
                            </div>
                          </div>

                          {/* Services grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5">
                              <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-0.5">🔍 Testing & Auditing</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.testing_desc') || 'Manual WCAG audits producing actionable reports and remediation paths for websites, apps, and documents'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5">
                              <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-0.5">📄 Document Remediation</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.docrem_full_desc') || 'Specialist team for PDF and MS Office documents — ensuring full usability with assistive technology'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5">
                              <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-0.5">♿ AccessWorks</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.accessworks_desc') || 'Real-world usability testing by people with disabilities who use assistive technology daily'}</div>
                            </div>
                            <div className="bg-white/80 rounded-lg border border-indigo-100 p-2.5">
                              <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-0.5">🎓 Training & AccessU</div>
                              <div className="text-[11px] text-slate-600 leading-snug">{t('pdf_audit.knowbility.training_full_desc') || 'Annual conference and on-demand courses — from beginner to advanced accessibility skills'}</div>
                            </div>
                          </div>

                          {/* Contact info */}
                          <div className="bg-white/80 rounded-lg border border-indigo-100 p-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Web</div>
                                <a href="https://knowbility.org?utm_source=alloflow&utm_medium=referral&utm_campaign=expert_remediation" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300">knowbility.org</a>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email</div>
                                <a href="mailto:knowbility@knowbility.org" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300">knowbility@knowbility.org</a>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Phone</div>
                                <a href="tel:+15125273138" className="text-[11px] font-bold text-slate-700 hover:text-indigo-700">512-527-3138</a>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-indigo-100 text-center">
                              <a href="https://knowbility.org/services/project-inquiry" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-[11px] font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-200">
                                Request a Project Inquiry →
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 border-t border-indigo-100"></div>
                            <span className="text-[11px] text-indigo-600 font-medium uppercase tracking-wider">W3C/WAI · IAAP-Certified · Clinton White House Recognized · FCC Innovation Award</span>
                            <div className="flex-1 border-t border-indigo-100"></div>
                          </div>

                          <p className="text-[11px] text-slate-600 text-center leading-relaxed italic">
                            While AlloFlow handles automated fixes, Knowbility's team ensures documents are
                            fully usable by people with disabilities — not just technically compliant. Serving
                            corporations, government agencies, educational institutions, and nonprofits since 1999.
                          </p>
                        </div>
                        <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                      </div>
                    )}
                    <div className="relative group">
                      <button className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-1.5" title={t('pdf_audit.report.download_title') || 'Download audit report'}>
                        <FileDown size={14} /> Report ▾
                      </button>
                      <div className="hidden group-hover:block group-focus-within:block absolute top-full left-0 mt-1 bg-white border border-indigo-200 rounded-xl shadow-xl z-10 min-w-[180px] overflow-hidden">
                        <button onClick={() => {
                          const html = generateAuditReportHtml(pdfAuditResult, pendingPdfFile?.name || 'document.pdf');
                          const w = window.open('', '_blank');
                          if (w) {
                            w.document.write(html);
                            w.document.close();
                            const banner = w.document.createElement('div');
                            banner.id = 'print-banner';
                            banner.innerHTML = `<div style="background:#4f46e5;color:white;padding:12px 20px;font-family:system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:9999"><span style="font-weight:bold">📊 Accessibility Audit Report</span><span style="font-size:13px;opacity:0.9">Click <strong>Save as PDF</strong> or use <strong>Ctrl+P</strong></span><button onclick="document.getElementById('print-banner').remove();window.print()" style="margin-left:auto;background:white;color:#4f46e5;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px">📥 Save as PDF</button><button onclick="document.getElementById('print-banner').remove()" style="background:transparent;color:white;border:1px solid rgba(255,255,255,0.3);padding:8px 12px;border-radius:6px;cursor:pointer;font-size:13px">✕</button></div>`;
                            w.document.body.insertBefore(banner, w.document.body.firstChild);
                            const ps = w.document.createElement('style'); ps.textContent = '@media print{#print-banner{display:none!important}}'; w.document.head.appendChild(ps);
                          }
                          if (addToast) addToast('Report opened with Save as PDF button', 'success');
                        }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2">
                          📄 Formatted Report (PDF)
                        </button>
                        <button onClick={() => {
                          const html = generateAuditReportHtml(pdfAuditResult, pendingPdfFile?.name || 'document.pdf');
                          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                          safeDownloadBlob(blob, `a11y-audit-${(pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '')}-${new Date().toISOString().split('T')[0]}.html`);
                          if (addToast) addToast('HTML report downloaded', 'success');
                        }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                          🌐 HTML Report
                        </button>
                        <button onClick={() => {
                          const reportData = { ...pdfAuditResult, fileName: pendingPdfFile?.name || 'document.pdf', auditDate: new Date().toISOString(), tool: 'AlloFlow PDF Accessibility Auditor', standard: 'WCAG 2.1 AA' };
                          const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url;
                          a.download = `a11y-audit-${(pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '')}-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                          if (addToast) addToast('JSON data exported', 'success');
                        }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 border-t border-slate-100">
                          📊 JSON Data (research)
                        </button>
                      </div>
                    </div>
                    <button onClick={() => { setPdfAuditResult(null); proceedWithPdfTransform(); }} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors" title={t('pdf_audit.report.text_extract_title') || 'Extract text for content generation'}>
                      Text Extract
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 text-center">"Fix & Verify" transforms to accessible HTML with axe-core verification. "Text Extract" pulls raw text for differentiated material generation.</p>

                  {/* ── Resume Remediation Prompt ── */}
                  {chunkResumePrompt && (
                    <div className="mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border-2 border-amber-300 p-5 animate-in fade-in duration-300">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">💾</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-amber-800">{t('pdf_audit.resume.heading') || 'Saved Progress Found'}</h4>
                          <p className="text-xs text-amber-700 mt-1">
                            {chunkResumePrompt.completedChunks} of {chunkResumePrompt.totalChunks} sections were completed
                            {chunkResumePrompt.savedAt && <span> ({Math.round((Date.now() - chunkResumePrompt.savedAt) / 60000)} min ago)</span>}.
                            Resume where you left off or start fresh?
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { setChunkResumePrompt(null); window.dispatchEvent(new CustomEvent('alloflow:chunk-resume-accept')); }}
                              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">
                              ▶ Resume ({chunkResumePrompt.completedChunks}/{chunkResumePrompt.totalChunks})
                            </button>
                            <button onClick={() => { setChunkResumePrompt(null); window.dispatchEvent(new CustomEvent('alloflow:chunk-resume-decline')); }}
                              className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors">
                              Start Fresh
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Live Chunk Review Panel ── */}
                  {/* Shows each chunk's fix as it happens in real time, with Accept/Reject/Re-fix per chunk */}
                  {(liveChunkSessionActive || liveChunkStream.length > 0) && (
                    <div id="live-remediation-panel" className="mt-4 bg-gradient-to-b from-white to-indigo-50 rounded-2xl border-2 border-indigo-300 p-5 space-y-3 animate-in slide-in-from-bottom duration-300" role="region" aria-label={t('pdf_audit.live_chunk.review_aria') || 'Live chunk remediation review'}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" aria-hidden="true">🔬</span>
                          <div>
                            <h4 className="text-sm font-bold text-indigo-800">{t('pdf_audit.live_chunk.review_heading') || 'Live Remediation Review'}</h4>
                            <div className="text-xs text-indigo-700">{t('pdf_audit.live_chunk.review_subhead') || 'Watch each section get fixed in real time — reject or re-fix anything that looks wrong'}</div>
                          </div>
                        </div>
                        <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold" role="status" aria-live="polite" aria-atomic="true">
                          {liveChunkStream.filter(c => c.status === 'complete').length}/{liveChunkStream.length} complete
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-label={t('pdf_audit.live_chunk.progress_aria') || 'Live remediation progress'} aria-valuenow={liveChunkStream.filter(c => c.status === 'complete').length} aria-valuemin={0} aria-valuemax={liveChunkStream.length || 1}>
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: liveChunkStream.length > 0 ? `${(liveChunkStream.filter(c => c.status === 'complete').length / liveChunkStream.length) * 100}%` : '0%' }}></div>
                      </div>

                      {/* Chunk cards stream */}
                      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {liveChunkStream.map((chunk, ci) => {
                          const isWorking = chunk.status === 'working';
                          const isRejected = !!liveChunkRejected[chunk.index];
                          const isExpanded = !!liveChunkExpanded[chunk.index];
                          const scoreColor = chunk.score >= 80 ? 'green' : chunk.score >= 60 ? 'amber' : 'red';
                          const scoreBg = scoreColor === 'green' ? 'bg-green-50 border-green-200' : scoreColor === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
                          const scoreText = scoreColor === 'green' ? 'text-green-600' : scoreColor === 'amber' ? 'text-amber-600' : 'text-red-600';
                          const scoreDot = scoreColor === 'green' ? 'bg-green-500' : scoreColor === 'amber' ? 'bg-amber-500' : 'bg-red-500';

                          return (
                            <div key={chunk.index} className={`border-2 rounded-xl transition-all duration-300 ${isRejected ? 'bg-slate-50 border-slate-300 opacity-60' : isWorking ? 'bg-indigo-50 border-indigo-200' : scoreBg}`}>
                              <div className="flex items-center gap-2 p-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 ${isWorking ? 'bg-indigo-500 animate-pulse' : scoreDot}`}>
                                  {isWorking ? <span className="animate-spin" aria-hidden="true">⏳</span> : chunk.index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-bold text-slate-700">Section {chunk.index + 1}</span>
                                    <span className="text-[11px] text-slate-600">{chunk.sizeKB || '?'}KB</span>
                                    {isWorking && <span className="text-[11px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold animate-pulse">Fixing...</span>}
                                    {!isWorking && (chunk.deterministicFixCount > 0) && <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold" title={t('pdf_audit.live_chunk.rule_based_title') || 'Rule-based (deterministic) regex fixes applied — always safe, no AI involved'}>{chunk.deterministicFixCount} rule-based</span>}
                                    {!isWorking && (chunk.surgicalFixCount > 0) && <span className="text-[11px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold" title={t('pdf_audit.live_chunk.targeted_title') || 'AI-diagnosed targeted micro-fixes applied via deterministic tools (content-preserving)'}>{chunk.surgicalFixCount} targeted</span>}
                                    {!isWorking && chunk.usedOriginal && <span className="text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold" title={t('pdf_audit.live_chunk.ai_skipped_short_title') || 'AI rewrite failed or was rejected for this section — only rule-based fixes were applied. Still more accessible than the original.'}>{t('pdf_audit.live_chunk.ai_skipped_short') || 'AI skipped'}</span>}
                                    {!isWorking && chunk.wasRetried && !chunk.usedOriginal && <span className="text-[11px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">retried</span>}
                                    {!isWorking && chunk.aiVerified && <span className="text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold" title={t('pdf_audit.live_chunk.verified_title') || 'AI verified content preserved'}>✓ verified</span>}
                                    {!isWorking && chunk.integrityPassed && <span className="text-[11px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold" title={t('pdf_audit.live_chunk.integrity_title') || 'Word overlap integrity check passed'}>integrity ✓</span>}
                                    {isRejected && <span className="text-[11px] bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-bold">rejected</span>}
                                  </div>
                                </div>
                                {!isWorking && (
                                  <div className={`text-base font-black shrink-0 ${scoreText}`}>
                                    {chunk.score}<span className="text-[11px] opacity-60">/100</span>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons — only shown after chunk is complete */}
                              {!isWorking && (
                                <div className="flex items-center gap-1 px-2 pb-2 flex-wrap">
                                  <button
                                    onClick={() => setLiveChunkExpanded(prev => ({ ...prev, [chunk.index]: !prev[chunk.index] }))}
                                    className="text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-bold hover:bg-slate-200 transition-colors focus:ring-2 focus:ring-slate-400"
                                    aria-expanded={isExpanded}
                                    aria-label={`${isExpanded ? 'Hide' : 'View'} diff for section ${chunk.index + 1}`}
                                  >
                                    {isExpanded ? '▼ Hide Diff' : '▶ View Diff'}
                                  </button>
                                  {!isRejected && !pdfFixLoading && (
                                    <button
                                      onClick={async () => {
                                        setPdfFixLoading(true);
                                        setPdfFixStep(`Re-fixing section ${chunk.index + 1}...`);
                                        try {
                                          const result = await refixChunk(chunk.index, { onProgress: setPdfFixStep });
                                          if (result?.html) {
                                            const [reAi, reAxe] = await Promise.all([auditOutputAccessibility(result.html), runAxeAudit(result.html)]);
                                            if (!reAi) {
                                              warnLog('[Re-fix] AI re-verification returned null for section ' + (chunk.index + 1) + '; not committing new HTML.');
                                              addToast('⚠ Re-fix verification unavailable — kept previous version. Try again later.', 'warning');
                                            } else {
                                              const newScore = reAxe ? Math.round(((reAi.score || 0) + (reAxe.score || 0)) / 2) : reAi.score;
                                              setPdfFixResult(prev => ({
                                                ...prev,
                                                accessibleHtml: result.html,
                                                verificationAudit: reAi,
                                                axeAudit: reAxe || prev?.axeAudit,
                                                afterScore: newScore ?? prev?.afterScore,
                                                htmlChars: result.html.length,
                                                chunkState: result.chunkState,
                                                chunkWeightedScore: result.chunkWeightedScore,
                                              }));
                                              addToast(`Section ${chunk.index + 1} re-fixed: ${result.chunkResult.score}/100`, 'success');
                                            }
                                          }
                                        } catch(e) { addToast(`Re-fix failed: ${e?.message}`, 'error'); }
                                        finally { setPdfFixLoading(false); setPdfFixStep(''); }
                                      }}
                                      className="text-[11px] bg-indigo-600 text-white px-2 py-1 rounded-full font-bold hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-400"
                                      aria-label={`Re-fix section ${chunk.index + 1}`}
                                    >
                                      🔄 Re-fix
                                    </button>
                                  )}
                                  {!isRejected && !pdfFixLoading && (
                                    <button
                                      onClick={() => {
                                        setLiveChunkRejected(prev => ({ ...prev, [chunk.index]: true }));
                                        try {
                                          const cs = getChunkState?.();
                                          if (cs && cs.fixedChunks && cs.originalChunks && cs.fixedChunks[chunk.index] !== undefined) {
                                            cs.fixedChunks[chunk.index] = cs.originalChunks[chunk.index];
                                            const revertedHtml = cs.preamble + '\n' + cs.fixedChunks.join('\n') + '\n' + cs.postamble;
                                            setPdfFixResult(prev => prev ? { ...prev, accessibleHtml: revertedHtml, htmlChars: revertedHtml.length } : prev);
                                            addToast(`Section ${chunk.index + 1} reverted to original`, 'info');
                                          }
                                        } catch(e) { addToast(`Revert failed: ${e?.message}`, 'error'); }
                                      }}
                                      className="text-[11px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold hover:bg-red-200 transition-colors focus:ring-2 focus:ring-red-400"
                                      aria-label={`Reject fix for section ${chunk.index + 1}, revert to original`}
                                    >
                                      ✕ Reject
                                    </button>
                                  )}
                                  {isRejected && !pdfFixLoading && (
                                    <button
                                      onClick={() => {
                                        setLiveChunkRejected(prev => { const next = { ...prev }; delete next[chunk.index]; return next; });
                                        try {
                                          const cs = getChunkState?.();
                                          if (cs && cs.fixedChunks) {
                                            const fixedHtml = cs.chunkResults?.[chunk.index]?.html;
                                            if (fixedHtml !== undefined) {
                                              cs.fixedChunks[chunk.index] = fixedHtml;
                                              const restoredHtml = cs.preamble + '\n' + cs.fixedChunks.join('\n') + '\n' + cs.postamble;
                                              setPdfFixResult(prev => prev ? { ...prev, accessibleHtml: restoredHtml, htmlChars: restoredHtml.length } : prev);
                                              addToast(`Section ${chunk.index + 1} restored`, 'success');
                                            }
                                          }
                                        } catch(e) { /* non-blocking */ }
                                      }}
                                      className="text-[11px] bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-bold hover:bg-slate-300 transition-colors"
                                      aria-label={`Restore fixed section ${chunk.index + 1}`}
                                    >
                                      ↶ Restore
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Diff view — shown when expanded */}
                              {!isWorking && isExpanded && (
                                <div className="px-2 pb-2 space-y-2">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                    <div className="bg-white rounded-lg border border-slate-400 p-2">
                                      <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">{t('pdf_audit.live_chunk.before') || 'Before (original)'}</div>
                                      <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto font-mono">{(chunk.originalHtml || '').substring(0, 2000)}{(chunk.originalHtml || '').length > 2000 ? '\n... (truncated)' : ''}</pre>
                                    </div>
                                    <div className="bg-white rounded-lg border border-emerald-200 p-2">
                                      <div className="text-[11px] font-bold text-emerald-600 uppercase mb-1">{t('pdf_audit.live_chunk.after') || 'After (fixed)'}</div>
                                      <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto font-mono">{(chunk.fixedHtml || '').substring(0, 2000)}{(chunk.fixedHtml || '').length > 2000 ? '\n... (truncated)' : ''}</pre>
                                    </div>
                                  </div>
                                  {chunk.integrityReason && chunk.integrityReason !== 'ok' && (
                                    <div className="text-[11px] bg-amber-50 border border-amber-200 rounded p-1.5 text-amber-800">
                                      <span className="font-bold">{t('pdf_audit.live_chunk.integrity_note') || 'Integrity note:'}</span> {chunk.integrityReason}
                                    </div>
                                  )}
                                  {chunk.violationInstructions && (
                                    <details className="bg-slate-50 border border-slate-400 rounded p-1.5">
                                      <summary className="text-[11px] font-bold text-slate-600 cursor-pointer">{t('pdf_audit.live_chunk.violations_targeted') || 'Violations targeted in this pass'}</summary>
                                      <pre className="text-[11px] text-slate-600 whitespace-pre-wrap mt-1">{chunk.violationInstructions}</pre>
                                    </details>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {!liveChunkSessionActive && liveChunkStream.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-indigo-200">
                          <span>✓ Review complete — {Object.keys(liveChunkRejected).length} section(s) rejected</span>
                          <button
                            onClick={() => { setLiveChunkStream([]); setLiveChunkRejected({}); setLiveChunkExpanded({}); }}
                            className="text-[11px] text-slate-600 hover:text-slate-700 font-bold underline"
                            aria-label={t('pdf_audit.live_chunk.clear_history_aria') || 'Clear live review history'}
                          >
                            Clear history
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Fix & Verify Results Panel ── */}
                  {pdfFixResult && (
                    <div className="mt-4 bg-gradient-to-b from-white to-emerald-50 rounded-2xl border-2 border-emerald-300 p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 flex-1">♿ Remediation Complete</h4>
                        <button
                          onClick={() => {
                            if (window.confirm(t('pdf_audit.start_new_confirm') || 'Start a new audit? Your current audit will be cleared — make sure you have downloaded the remediated HTML if you need it.')) {
                              startNewPdfAudit();
                            }
                          }}
                          className="text-[11px] px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-400 rounded-md font-bold inline-flex items-center gap-1"
                          title={t('pdf_audit.start_new_title') || 'Clear this audit result and start fresh with a new PDF'}
                        >
                          🗑️ {t('pdf_audit.start_new_audit') || 'Start New Audit'}
                        </button>
                      </div>
                      {pdfFixResult.pageCount && (
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">📄 {pdfFixResult.pageCount} pages processed</span>
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">📝 {(pdfFixResult.extractedChars || 0).toLocaleString()} chars extracted</span>
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">🌐 {(pdfFixResult.htmlChars || 0).toLocaleString()} chars HTML</span>
                          {pdfFixResult.imageCount > 0 && <span className="text-[11px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">🖼️ {pdfFixResult.imageCount} images identified</span>}
                        </div>
                      )}

                      {/* Before → After Score */}
                      {(() => {
                        const afterAi = pdfFixResult.afterScore;
                        const afterAxe = pdfFixResult.axeAudit?.score ?? null;
                        const blendedAfter = (afterAi !== null && afterAxe !== null)
                          ? Math.round((afterAxe + afterAi) / 2)
                          : (afterAxe ?? afterAi ?? null);
                        const initialBlended = pdfAuditResult?.score ?? null;
                        const initialAi = pdfAuditResult?._aiOnlyScore ?? pdfFixResult.beforeScore;
                        const initialAxe = pdfAuditResult?._baselineAxeScore ?? pdfFixResult.beforeAxeScore ?? null;
                        const blendedBefore = initialBlended ?? ((initialAi !== null && initialAxe !== null) ? Math.round((initialAxe + initialAi) / 2) : (initialAi ?? null));
                        const beforeDisplay = blendedBefore ?? '?';
                        const afterDisplay = blendedAfter !== null ? blendedAfter : '?';
                        const gain = (blendedAfter !== null && blendedBefore !== null) ? blendedAfter - blendedBefore : 0;
                        return (<>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <div className={`text-3xl font-black ${(blendedBefore || 0) < 50 ? 'text-red-600' : (blendedBefore || 0) < 80 ? 'text-amber-600' : 'text-green-600'}`}>
                            {beforeDisplay}<span className="text-sm opacity-60">/100</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-600 uppercase">Before</div>
                        </div>
                        <div className="text-2xl text-slate-600">{'\u2192'}</div>
                        <div className="text-center">
                          <div className={`text-3xl font-black ${(blendedAfter || 0) < 50 ? 'text-red-600' : (blendedAfter || 0) < 80 ? 'text-amber-600' : 'text-green-600'}`}>
                            {afterDisplay}<span className="text-sm opacity-60">/100</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-600 uppercase">After</div>
                        </div>
                        {gain > 0 && (
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                            +{gain}
                          </div>
                        )}
                      </div>
                      {/* Individual engine scores with /2 formula */}
                      <div className="text-center mt-1 text-[11px]">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-slate-600">(</span>
                          <span className="text-purple-700 font-bold" title={t('pdf_audit.score.ai_rubric_label') || 'AI Rubric'}>AI: {initialAi ?? '?'}{'\u2192'}{afterAi ?? '?'}</span>
                          <span className="text-slate-600">+</span>
                          <span className="text-blue-700 font-bold" title="axe-core">axe: {initialAxe ?? '?'}{'\u2192'}{afterAxe ?? '?'}</span>
                          <span className="text-slate-600">) / 2</span>
                        </div>
                      </div>
                      </>);
                      })()}

                      {/* Verification details */}
                      {pdfFixResult.verificationAudit && (
                        <div className="space-y-2">
                          <div className="text-xs text-emerald-700 font-medium">{pdfFixResult.verificationAudit.summary}</div>
                          {(pdfFixResult.verificationAudit.issues || []).length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                              <div className="text-[11px] font-bold text-amber-600 uppercase mb-1">Remaining Issues ({pdfFixResult.verificationAudit.issues.length})</div>
                              {pdfFixResult.verificationAudit.issues.map((issue, i) => (
                                <div key={i} className="text-[11px] text-amber-800 mb-0.5">• {issue.issue} <span className="text-amber-500">({issue.wcag})</span></div>
                              ))}
                            </div>
                          )}
                          {(pdfFixResult.verificationAudit.passes || []).length > 0 && (
                            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                              <div className="text-[11px] font-bold text-green-600 uppercase mb-1">{t('pdf_audit.results.verified_accessible') || 'Verified Accessible'}</div>
                              {pdfFixResult.verificationAudit.passes.map((pass, i) => (
                                <div key={i} className="text-[11px] text-green-700 mb-0.5">✓ {pass}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* axe-core Automated Results */}
                      {pdfFixResult.axeAudit && (
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🔬</span>
                              <div>
                                <div className="text-xs font-bold text-indigo-800">axe-core Automated WCAG Checker</div>
                                <div className="text-[11px] text-indigo-500">Industry-standard engine (Deque) v{pdfFixResult.axeAudit.version} — WCAG 2.1 AA</div>
                              </div>
                            </div>
                            <div className={`text-2xl font-black ${pdfFixResult.axeAudit.totalViolations === 0 ? 'text-green-600' : pdfFixResult.axeAudit.totalViolations <= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pdfFixResult.axeAudit.totalViolations === 0 ? '✅' : pdfFixResult.axeAudit.totalViolations} {pdfFixResult.axeAudit.totalViolations === 0 ? '' : 'violations'}
                            </div>
                          </div>

                          {pdfFixResult.axeAudit.totalViolations === 0 && (
                            <div className="bg-green-100 rounded-lg p-2 border border-green-300 text-center">
                              <div className="text-sm font-bold text-green-800">{t('pdf_audit.results.zero_violations') || 'Zero WCAG violations detected'}</div>
                              <div className="text-[11px] text-green-600">{pdfFixResult.axeAudit.totalPasses} accessibility checks passed</div>
                            </div>
                          )}

                          {pdfFixResult.axeAudit.critical.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                              <div className="text-[11px] font-bold text-red-600 uppercase mb-1">Critical ({pdfFixResult.axeAudit.critical.length})</div>
                              {pdfFixResult.axeAudit.critical.map((v, i) => (
                                <div key={i} className="text-[11px] text-red-800 mb-0.5">🔴 {v.description} <span className="text-red-600">({v.id}, {v.nodes} element{v.nodes > 1 ? 's' : ''})</span></div>
                              ))}
                            </div>
                          )}
                          {pdfFixResult.axeAudit.serious.length > 0 && (
                            <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                              <div className="text-[11px] font-bold text-orange-600 uppercase mb-1">Serious ({pdfFixResult.axeAudit.serious.length})</div>
                              {pdfFixResult.axeAudit.serious.map((v, i) => (
                                <div key={i} className="text-[11px] text-orange-800 mb-0.5">🟠 {v.description} <span className="text-orange-700">({v.id}, {v.nodes} element{v.nodes > 1 ? 's' : ''})</span></div>
                              ))}
                            </div>
                          )}
                          {pdfFixResult.axeAudit.moderate.length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                              <div className="text-[11px] font-bold text-amber-600 uppercase mb-1">Moderate ({pdfFixResult.axeAudit.moderate.length})</div>
                              {pdfFixResult.axeAudit.moderate.map((v, i) => (
                                <div key={i} className="text-[11px] text-amber-800 mb-0.5">🟡 {v.description} <span className="text-amber-700">({v.id})</span></div>
                              ))}
                            </div>
                          )}
                          {pdfFixResult.axeAudit.minor.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-400">
                              <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">Minor ({pdfFixResult.axeAudit.minor.length})</div>
                              {pdfFixResult.axeAudit.minor.map((v, i) => (
                                <div key={i} className="text-[11px] text-slate-600 mb-0.5">⚪ {v.description}</div>
                              ))}
                            </div>
                          )}

                          {/* Expandable passes detail */}
                          {pdfFixResult.axeAudit.passes && pdfFixResult.axeAudit.passes.length > 0 && (
                            <details className="w-full">
                              <summary className="text-[11px] font-bold text-green-600 cursor-pointer hover:text-green-800 transition-colors">
                                ✅ {pdfFixResult.axeAudit.totalPasses} accessibility checks passed (click to view)
                              </summary>
                              <div className="mt-1 max-h-40 overflow-y-auto bg-green-50 rounded-lg p-2 border border-green-200 space-y-0.5">
                                {pdfFixResult.axeAudit.passes.map((p, pi) => (
                                  <div key={pi} className="text-[11px] text-green-800 flex items-start gap-1">
                                    <span className="text-green-500 shrink-0">✓</span>
                                    <span className="font-medium">{typeof p === 'string' ? p : p.description}</span>
                                    {p.id && <span className="text-green-700 shrink-0 font-mono">({p.id})</span>}
                                    {p.wcag && <span className="text-green-700 shrink-0">[{p.wcag}]</span>}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {(() => {
                            const WCAG_LABELS = {
                              '1.1.1': 'Non-text Content (alt text)',
                              '1.3.1': 'Info and Relationships (structure)',
                              '1.3.2': 'Meaningful Sequence',
                              '1.4.1': 'Use of Color',
                              '1.4.3': 'Contrast (Minimum)',
                              '1.4.4': 'Resize Text',
                              '1.4.5': 'Images of Text',
                              '1.4.10': 'Reflow',
                              '1.4.11': 'Non-text Contrast',
                              '1.4.12': 'Text Spacing',
                              '2.1.1': 'Keyboard',
                              '2.4.1': 'Bypass Blocks (skip links)',
                              '2.4.2': 'Page Titled',
                              '2.4.4': 'Link Purpose',
                              '2.4.6': 'Headings and Labels',
                              '2.4.7': 'Focus Visible',
                              '3.1.1': 'Language of Page',
                              '3.1.2': 'Language of Parts',
                              '3.1.4': 'Abbreviations',
                              '3.3.2': 'Labels or Instructions',
                              '4.1.1': 'Parsing (duplicate IDs)',
                              '4.1.2': 'Name, Role, Value'
                            };
                            const scMap = {};
                            const addToSc = (sc, bucket) => {
                              if (!scMap[sc]) scMap[sc] = { passes: 0, violations: 0, incomplete: 0 };
                              scMap[sc][bucket]++;
                            };
                            const extractSc = (w) => {
                              if (!w) return null;
                              const m = String(w).match(/(\d+\.\d+(?:\.\d+)?)/);
                              return m ? m[1] : null;
                            };
                            (pdfFixResult.axeAudit.passes || []).forEach(p => {
                              const sc = extractSc(p.wcag); if (sc) addToSc(sc, 'passes');
                            });
                            ['critical','serious','moderate','minor'].forEach(sev => {
                              (pdfFixResult.axeAudit[sev] || []).forEach(v => {
                                const sc = extractSc(v.wcag); if (sc) addToSc(sc, 'violations');
                              });
                            });
                            (pdfFixResult.axeAudit.incomplete || []).forEach(i => {
                              const sc = extractSc(i.wcag); if (sc) addToSc(sc, 'incomplete');
                            });
                            const scEntries = Object.entries(scMap).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
                            if (scEntries.length === 0) return null;
                            const counts = scEntries.reduce((acc, [, v]) => {
                              if (v.violations > 0) acc.fail++;
                              else if (v.incomplete > 0) acc.warn++;
                              else if (v.passes > 0) acc.pass++;
                              return acc;
                            }, { pass: 0, warn: 0, fail: 0 });
                            return (
                              <details className="bg-slate-50 border border-slate-400 rounded-lg p-3">
                                <summary className="cursor-pointer text-xs font-bold text-slate-700 flex flex-wrap items-center gap-2">
                                  📋 WCAG Success Criteria Report
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px]">✓ {counts.pass} pass</span>
                                  {counts.warn > 0 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px]">⚠ {counts.warn} needs review</span>}
                                  {counts.fail > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[11px]">✗ {counts.fail} fail</span>}
                                </summary>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {scEntries.map(([sc, v]) => {
                                    const status = v.violations > 0 ? 'fail' : v.incomplete > 0 ? 'warn' : v.passes > 0 ? 'pass' : 'none';
                                    const color = status === 'pass' ? 'bg-green-50 border-green-200 text-green-800' :
                                                  status === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                                  status === 'fail' ? 'bg-red-50 border-red-200 text-red-800' :
                                                  'bg-slate-50 border-slate-200 text-slate-600';
                                    const icon = status === 'pass' ? '✓' : status === 'warn' ? '⚠' : status === 'fail' ? '✗' : '○';
                                    const label = WCAG_LABELS[sc] || '';
                                    return (
                                      <div key={sc} className={`flex items-start gap-2 px-2 py-1 rounded border text-[11px] ${color}`}>
                                        <span className="font-bold shrink-0">{icon}</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-bold font-mono">{sc}</span>
                                          {label && <span className="ml-1 opacity-80">— {label}</span>}
                                          <div className="opacity-70 mt-0.5">
                                            {v.passes > 0 && <span>{v.passes} pass</span>}
                                            {v.violations > 0 && <span className="ml-2">{v.violations} fail</span>}
                                            {v.incomplete > 0 && <span className="ml-2">{v.incomplete} review</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="mt-2 text-[10px] text-slate-500 italic">{t('pdf_audit.wcag_report.coverage_note') || 'Coverage may be incomplete — this view aggregates axe-core rules by WCAG SC. Manual review still required for some criteria (e.g. semantic meaning, reading order, complex forms).'}</p>
                              </details>
                            );
                          })()}

                          <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✅ {pdfFixResult.axeAudit.totalPasses} passed</span>
                            {pdfFixResult.axeAudit.totalIncomplete > 0 && <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">⏳ {pdfFixResult.axeAudit.totalIncomplete} need manual review</span>}
                            {pdfFixResult.autoFixPasses > 0 && <span className="text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">🔧 {pdfFixResult.autoFixPasses} auto-fix pass{pdfFixResult.autoFixPasses > 1 ? 'es' : ''} applied</span>}
                            {pdfFixResult.axeAudit.totalViolations > 0 && !pdfFixLoading && (
                              <button onClick={() => runAutoFixLoop(pdfAutoContinue ? 3 : 1)} className="text-[11px] bg-indigo-600 text-white px-2.5 py-1 rounded-full font-bold hover:bg-indigo-700 transition-colors cursor-pointer focus:ring-2 focus:ring-indigo-400" aria-label={`Auto-fix ${pdfFixResult.axeAudit.totalViolations} accessibility violations`}>
                                🔧 Auto-fix {pdfFixResult.axeAudit.totalViolations} violation{pdfFixResult.axeAudit.totalViolations !== 1 ? 's' : ''}{pdfAutoContinue ? ' (auto-continue on)' : ''}
                              </button>
                            )}
                            {pdfFixResult.axeAudit.totalViolations > 0 && !pdfFixLoading && (
                              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full hover:bg-indigo-100 transition-colors" title={`Auto-continue until score ≥ ${pdfTargetScore}`}>
                                <input type="checkbox" checked={pdfAutoContinue} onChange={(e) => setPdfAutoContinue(e.target.checked)} className="rounded" aria-label={t('pdf_audit.settings.auto_continue_aria') || 'Auto-continue remediation until target score'} />
                                <span>🔁 Auto-continue</span>
                              </label>
                            )}
                            {pdfAutoContinueRunning && (
                              <button onClick={() => { pdfAutoContinueAbortRef.current = true; try { pdfAutoContinueAbortCtrlRef.current?.abort(); } catch(_) {} addToast('Stopping — aborting in-flight Gemini call…', 'info'); }} className="text-[11px] bg-red-100 text-red-700 border border-red-300 px-2.5 py-1 rounded-full font-bold hover:bg-red-200 transition-colors" aria-label={t('pdf_audit.auto_fix.stop_aria') || 'Stop auto-continue remediation'}>
                                ⏸ Stop auto-continue
                              </button>
                            )}
                            {pdfFixLoading && pdfFixStep.includes('Auto-fix') && (
                              <div className="basis-full mt-2" role="status" aria-live="polite">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="animate-spin text-sm" aria-hidden="true">⏳</span>
                                  <span className="text-[11px] font-bold text-indigo-700">{pdfFixStep}</span>
                                </div>
                                <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden" role="progressbar" aria-label={t('pdf_audit.auto_fix.progress_aria') || 'Auto-fix progress'} aria-valuenow={pdfFixStep.includes('pass 2') ? 70 : pdfFixStep.includes('Re-check') || pdfFixStep.includes('Re-verif') ? 85 : 40} aria-valuemin={0} aria-valuemax={100}>
                                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: pdfFixStep.includes('pass 2') ? '70%' : pdfFixStep.includes('Re-check') || pdfFixStep.includes('Re-verif') ? '85%' : '40%' }}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {!pdfFixResult.axeAudit && (
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-400 text-center">
                          <div className="text-[11px] text-slate-600">axe-core automated check could not run (CDN may be blocked). AI verification above is still valid.</div>
                        </div>
                      )}

                      {/* ── Chunk Map: Per-section scores with selective re-fix ── */}
                      {pdfFixResult.chunkState && pdfFixResult.chunkState.chunkResults && pdfFixResult.chunkState.chunkResults.length > 1 && (
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border-2 border-slate-200 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🧩</span>
                              <div>
                                <div className="text-xs font-bold text-slate-800">{t('pdf_audit.section_map.heading') || 'Document Section Map'}</div>
                                <div className="text-[11px] text-slate-600">{pdfFixResult.chunkState.chunkResults.length} sections — re-fix individual sections without affecting others</div>
                              </div>
                            </div>
                            {pdfFixResult.chunkWeightedScore != null && (
                              <div className={`text-sm font-black ${pdfFixResult.chunkWeightedScore >= 80 ? 'text-green-600' : pdfFixResult.chunkWeightedScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {pdfFixResult.chunkWeightedScore}<span className="text-[11px] opacity-60">/100 avg</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            {pdfFixResult.chunkState.chunkResults.map((cr, ci) => (
                              <div key={ci} className={`flex items-center gap-2 p-1.5 rounded-lg border ${cr.score >= 80 ? 'bg-green-50 border-green-200' : cr.score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} transition-all`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 ${cr.score >= 80 ? 'bg-green-500' : cr.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}>
                                  {ci + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-700">Section {ci + 1}</span>
                                    <span className="text-[11px] text-slate-600">{cr.sizeKB || '?'}KB</span>
                                    {cr.deterministicFixes > 0 && <span className="text-[11px] bg-blue-100 text-blue-600 px-1 rounded font-bold" title={t('pdf_audit.section_map.rule_based_title') || 'Rule-based (deterministic) fixes applied'}>{cr.deterministicFixes} rule-based</span>}
                                    {cr.surgicalFixes > 0 && <span className="text-[11px] bg-purple-100 text-purple-600 px-1 rounded font-bold" title={t('pdf_audit.section_map.targeted_title') || 'AI-diagnosed targeted micro-fixes'}>{cr.surgicalFixes} targeted</span>}
                                    {cr.usedOriginal && <span className="text-[11px] bg-amber-100 text-amber-700 px-1 rounded font-bold" title={t('pdf_audit.section_map.ai_skipped_title') || 'AI rewrite was rejected — only rule-based fixes applied'}>{t('pdf_audit.section_map.ai_skipped') || 'AI skipped'}</span>}
                                    {cr.wasRetried && !cr.usedOriginal && <span className="text-[11px] bg-slate-100 text-slate-600 px-1 rounded font-bold">retried</span>}
                                  </div>
                                  {/* Score bar */}
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-0.5" role="progressbar" aria-label={`Section ${ci + 1} score: ${cr.score}/100`} aria-valuenow={cr.score} aria-valuemin={0} aria-valuemax={100}>
                                    <div className={`h-full rounded-full transition-all duration-500 ${cr.score >= 80 ? 'bg-green-500' : cr.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${cr.score}%` }}></div>
                                  </div>
                                </div>
                                <div className={`text-sm font-black shrink-0 ${cr.score >= 80 ? 'text-green-600' : cr.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {cr.score}
                                </div>
                                {cr.score < 80 && !pdfFixLoading && (
                                  <button
                                    onClick={async () => {
                                      setPdfFixLoading(true);
                                      setPdfFixStep(`Re-fixing section ${ci + 1}...`);
                                      try {
                                        const result = await refixChunk(ci, { onProgress: setPdfFixStep });
                                        if (result?.html) {
                                          const [reAi, reAxe] = await Promise.all([auditOutputAccessibility(result.html), runAxeAudit(result.html)]);
                                          if (!reAi) {
                                            warnLog('[Re-fix] AI re-verification returned null for section ' + (ci + 1) + '; not committing new HTML.');
                                            addToast('⚠ Re-fix verification unavailable — kept previous version. Try again later.', 'warning');
                                          } else {
                                            const newScore = reAxe ? Math.round(((reAi.score || 0) + (reAxe.score || 0)) / 2) : reAi.score;
                                            setPdfFixResult(prev => ({
                                              ...prev,
                                              accessibleHtml: result.html,
                                              verificationAudit: reAi,
                                              axeAudit: reAxe || prev.axeAudit,
                                              afterScore: newScore ?? prev.afterScore,
                                              htmlChars: result.html.length,
                                              chunkState: result.chunkState,
                                              chunkWeightedScore: result.chunkWeightedScore,
                                            }));
                                            addToast(`Section ${ci + 1} re-fixed: ${result.chunkResult.score}/100`, 'success');
                                          }
                                        }
                                      } catch(e) { addToast(`Re-fix failed: ${e?.message}`, 'error'); }
                                      finally { setPdfFixLoading(false); setPdfFixStep(''); }
                                    }}
                                    className="text-[11px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold hover:bg-indigo-700 transition-colors cursor-pointer shrink-0 focus:ring-2 focus:ring-indigo-400"
                                    aria-label={`Re-fix section ${ci + 1} (score ${cr.score}/100)`}
                                  >
                                    Re-fix
                                  </button>
                                )}
                                {cr.score >= 80 && (
                                  <span className="text-[11px] text-green-600 font-bold shrink-0">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expert Referral Panel - shows when document needs human remediation */}
                      {pdfFixResult.needsExpertReview && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 space-y-2">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl shrink-0">🔍</span>
                            <div>
                              <h4 className="text-sm font-bold text-amber-900">{t('pdf_audit.expert_referral.heading') || 'This Document Needs Expert Accessibility Remediation'}</h4>
                              <p className="text-xs text-amber-800 leading-relaxed mt-1">
                                AlloFlow's automated pipeline improved this document but could not resolve all accessibility barriers.
                                Complex elements (forms, multi-column layouts, interactive content, or deeply nested structures) require
                                manual evaluation by certified accessibility professionals using screen readers and assistive technology.
                              </p>
                              <p className="text-xs text-amber-700 mt-2 font-medium">
                                We recommend contacting an expert accessibility service provider:
                              </p>
                              <div className="mt-2 bg-white rounded-lg border border-amber-200 p-3 flex items-center gap-3">
                                <div className="shrink-0 text-center">
                                  <div className="text-lg font-black text-amber-800">K</div>
                                  <div className="text-[11px] text-amber-600 font-bold">EST. 1999</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-slate-800">Knowbility</div>
                                  <div className="text-[11px] text-slate-600">W3C/WAI accredited, IAAP-certified testers, 25+ years of digital accessibility leadership</div>
                                  <div className="flex gap-2 mt-1.5 flex-wrap">
                                    <a href="https://knowbility.org?utm_source=alloflow&utm_medium=referral&utm_campaign=expert_remediation" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline">knowbility.org</a>
                                    <a href="mailto:knowbility@knowbility.org" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline">knowbility@knowbility.org</a>
                                    <span className="text-[11px] text-slate-600">512-527-3138</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[11px] text-amber-600 mt-2 italic">
                                AlloFlow handled the automated remediation. For the remaining barriers, expert human evaluation ensures
                                the document is fully usable by people with disabilities, not just technically compliant.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setPdfPreviewOpen(true); setTimeout(updatePdfPreview, 200); }}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">
                          ✏️ Preview & Edit
                        </button>
                        <button onClick={() => {
                          if (!pendingPdfBase64 || !pdfFixResult?.accessibleHtml) { addToast('Need both original PDF and remediated version', 'info'); return; }
                          const win = window.open('', '_blank');
                          if (!win) { addToast('Pop-up blocked', 'error'); return; }
                          const beforeScore = pdfAuditResult?.score ?? pdfFixResult.beforeScore ?? '?';
                          const afterAi = pdfFixResult.afterScore;
                          const afterAxe = pdfFixResult.axeAudit?.score ?? null;
                          const afterScore = (afterAi !== null && afterAxe !== null) ? Math.round((afterAxe + afterAi) / 2) : (afterAxe ?? afterAi ?? '?');
                          const scoreColor = (s) => typeof s === 'number' ? (s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626') : '#64748b';
                          win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Before / After Comparison</title>
                          <style>
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
                            .header { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
                            .header h1 { font-size: 16px; font-weight: 800; color: #fff; }
                            .scores { display: flex; gap: 12px; align-items: center; }
                            .score-badge { padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 14px; }
                            .arrow { color: #94a3b8; font-size: 18px; }
                            .compare { display: flex; height: calc(100vh - 56px); overflow: hidden; }
                            .pane { flex: 1; display: flex; flex-direction: column; min-height: 0; min-width: 0; overflow: hidden; }
                            .pane-header { padding: 8px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: center; }
                            .pane-left .pane-header { background: #7f1d1d; color: #fca5a5; }
                            .pane-right .pane-header { background: #14532d; color: #86efac; }
                            .divider { width: 3px; background: #334155; cursor: col-resize; }
                            iframe, embed { flex: 1; width: 100%; min-height: 0; border: none; background: white; }
                            @media (max-width: 768px) { .compare { flex-direction: column; } .pane { height: 50vh; } .divider { height: 3px; width: 100%; } }
                          </style></head><body>
                          <div class="header">
                            <h1>📄 Before / After Comparison</h1>
                            <div class="scores">
                              <span class="score-badge" style="background:${scoreColor(beforeScore)}20;color:${scoreColor(beforeScore)}">${beforeScore}/100</span>
                              <span class="arrow">→</span>
                              <span class="score-badge" style="background:${scoreColor(afterScore)}20;color:${scoreColor(afterScore)}">${afterScore}/100</span>
                              ${typeof afterScore === 'number' && typeof beforeScore === 'number' && afterScore > beforeScore ? '<span class="score-badge" style="background:#16a34a20;color:#16a34a">+' + (afterScore - beforeScore) + '</span>' : ''}
                            </div>
                          </div>
                          <div class="compare">
                            <div class="pane pane-left">
                              <div class="pane-header">Original PDF (Before)</div>
                              <embed src="data:application/pdf;base64,${pendingPdfBase64.includes(',') ? pendingPdfBase64.split(',')[1] : pendingPdfBase64}" type="application/pdf" />
                            </div>
                            <div class="divider"></div>
                            <div class="pane pane-right">
                              <div class="pane-header" style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px">
                                <span>Accessible HTML (After)</span>
                                <div style="display:flex;gap:4px;align-items:center">
                                  <button onclick="toggleBionic()" id="btn-bionic" style="padding:3px 8px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:10px;font-weight:700;cursor:pointer" title="Toggle Bionic Reading">Bi onic</button>
                                  <button onclick="toggleLineGuide()" id="btn-lineguide" style="padding:3px 8px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:10px;font-weight:700;cursor:pointer" title="Toggle Line Guide">Line Guide</button>
                                  <button onclick="toggleDarkMode()" id="btn-dark" style="padding:3px 8px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:10px;font-weight:700;cursor:pointer" title="Toggle Dark Mode">🌙</button>
                                  <button onclick="zoomIn()" style="padding:3px 6px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:12px;font-weight:700;cursor:pointer" title="Zoom In">+</button>
                                  <button onclick="zoomOut()" style="padding:3px 6px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:12px;font-weight:700;cursor:pointer" title="Zoom Out">−</button>
                                  <span id="zoom-level" style="color:#86efac;font-size:10px;min-width:30px;text-align:center">100%</span>
                                  <button onclick="downloadHtml()" style="padding:3px 8px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:10px;font-weight:700;cursor:pointer" title="Download HTML">📥</button>
                                  <button onclick="printHtml()" style="padding:3px 8px;border-radius:6px;border:1px solid #86efac;background:transparent;color:#86efac;font-size:10px;font-weight:700;cursor:pointer" title="Print">🖨️</button>
                                </div>
                              </div>
                              <iframe id="after-frame"></iframe>
                            </div>
                          </div>
                          <script>
                            var _b64 = "${(() => {
                              try {
                                return btoa(unescape(encodeURIComponent(pdfFixResult.accessibleHtml || '')));
                              } catch (_) { return ''; }
                            })()}";
                            var html = '';
                            try { html = decodeURIComponent(escape(atob(_b64))); }
                            catch (e) { html = '<p style="color:#f87171;padding:20px">Failed to decode remediated HTML: ' + (e && e.message ? e.message : 'unknown') + '</p>'; }
                            var iframe = document.getElementById('after-frame');
                            var doc = iframe.contentDocument || iframe.contentWindow.document;
                            doc.open();
                            doc.write(html);
                            doc.close();

                            var _bionicOn = false;
                            function toggleBionic() {
                              _bionicOn = !_bionicOn;
                              var d = iframe.contentDocument;
                              if (!d) return;
                              var btn = document.getElementById('btn-bionic');
                              if (_bionicOn) {
                                btn.style.background = '#16a34a'; btn.style.color = '#fff';
                                var walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT, null, false);
                                var textNodes = [];
                                while(walker.nextNode()) textNodes.push(walker.currentNode);
                                textNodes.forEach(function(node) {
                                  if (!node.textContent.trim() || node.parentElement.closest('script,style,code,pre')) return;
                                  var words = node.textContent.split(/(\s+)/);
                                  var span = d.createElement('span');
                                  span.className = 'bionic-wrap';
                                  span.innerHTML = words.map(function(w) {
                                    if (/^\s+$/.test(w)) return w;
                                    var half = Math.ceil(w.length * 0.5);
                                    return '<strong>' + w.substring(0, half) + '</strong>' + w.substring(half);
                                  }).join('');
                                  node.parentNode.replaceChild(span, node);
                                });
                              } else {
                                btn.style.background = 'transparent'; btn.style.color = '#86efac';
                                d.querySelectorAll('.bionic-wrap').forEach(function(el) {
                                  el.outerHTML = el.textContent;
                                });
                              }
                            }

                            var _lineGuideOn = false;
                            function toggleLineGuide() {
                              _lineGuideOn = !_lineGuideOn;
                              var d = iframe.contentDocument;
                              if (!d) return;
                              var btn = document.getElementById('btn-lineguide');
                              var existing = d.getElementById('allo-lineguide');
                              if (_lineGuideOn) {
                                btn.style.background = '#16a34a'; btn.style.color = '#fff';
                                if (!existing) {
                                  var guide = d.createElement('div');
                                  guide.id = 'allo-lineguide';
                                  guide.style.cssText = 'position:fixed;left:0;right:0;height:32px;background:rgba(250,204,21,0.15);border-top:2px solid rgba(250,204,21,0.4);border-bottom:2px solid rgba(250,204,21,0.4);pointer-events:none;z-index:99999;top:40%;transition:top 0.05s';
                                  d.body.appendChild(guide);
                                  d.addEventListener('mousemove', function(e) {
                                    var g = d.getElementById('allo-lineguide');
                                    if (g) g.style.top = (e.clientY - 16) + 'px';
                                  });
                                }
                              } else {
                                btn.style.background = 'transparent'; btn.style.color = '#86efac';
                                if (existing) existing.remove();
                              }
                            }

                            var _darkOn = false;
                            function toggleDarkMode() {
                              _darkOn = !_darkOn;
                              var d = iframe.contentDocument;
                              if (!d) return;
                              var btn = document.getElementById('btn-dark');
                              var s = d.getElementById('allo-darkmode');
                              if (_darkOn) {
                                btn.style.background = '#16a34a'; btn.style.color = '#fff';
                                if (!s) {
                                  s = d.createElement('style');
                                  s.id = 'allo-darkmode';
                                  s.textContent = 'body{background:#1a1a2e!important;color:#e2e8f0!important;} a{color:#818cf8!important;} h1,h2,h3,h4,h5,h6{color:#e2e8f0!important;} table,th,td{border-color:#4a5568!important;color:#e2e8f0!important;} th{background:#2d3748!important;}';
                                  d.head.appendChild(s);
                                }
                              } else {
                                btn.style.background = 'transparent'; btn.style.color = '#86efac';
                                if (s) s.remove();
                              }
                            }

                            var _zoomLevel = 100;
                            function zoomIn() {
                              _zoomLevel = Math.min(200, _zoomLevel + 10);
                              var d = iframe.contentDocument;
                              if (d) d.body.style.zoom = (_zoomLevel / 100);
                              document.getElementById('zoom-level').textContent = _zoomLevel + '%';
                            }
                            function zoomOut() {
                              _zoomLevel = Math.max(50, _zoomLevel - 10);
                              var d = iframe.contentDocument;
                              if (d) d.body.style.zoom = (_zoomLevel / 100);
                              document.getElementById('zoom-level').textContent = _zoomLevel + '%';
                            }
                            function downloadHtml() {
                              var d = iframe.contentDocument;
                              if (!d) return;
                              var html = '<!DOCTYPE html>\\n' + d.documentElement.outerHTML;
                              var blob = new Blob([html], {type: 'text/html'});
                              var a = document.createElement('a');
                              a.href = URL.createObjectURL(blob);
                              a.download = 'remediated-document.html';
                              a.click();
                              URL.revokeObjectURL(a.href);
                            }
                            function printHtml() {
                              iframe.contentWindow.print();
                            }
                          </script>
                          </body></html>`);
                          win.document.close();
                          addToast('📄 Before/After comparison opened', 'success');
                        }} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                          🔀 Compare
                        </button>
                        {/* Third Diff-view entry point, always visible in the action row
                            when both sourceText + finalText are present (which is the
                            normal state post-remediation). The other two entry points
                            (integrity banner + Verification details accordion) can be
                            buried by doc-specific state — this one is discoverable. */}
                        {pdfFixResult.sourceText && pdfFixResult.finalText && (
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
                            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                            aria-label={t('pdf_audit.diff.button_aria') || 'Open word-level diff view between source PDF and remediated HTML'}
                            title={t('pdf_audit.diff.button_title') || 'Open the word-level diff modal — see every insertion, deletion, and paraphrase between the source PDF text and the remediated HTML, with click-to-reject and Apply & Export.'}
                          >
                            📝 Diff
                          </button>
                        )}
                        <button onClick={() => downloadAccessiblePdf(pdfFixResult.accessibleHtml, (pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '') + '-accessible')}
                          className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                          title={t('pdf_audit.pdf_from_html.title') || 'Regenerate a PDF from the remediated HTML. Layout reflows — page breaks, fonts, and pagination may differ from the original. Works well for simple prose documents.'}>
                          📥 PDF (from HTML)
                        </button>
                        {/* Tagged PDF (original + structure tags). Preserves the
                            source PDF's visual layer byte-identical and injects a
                            StructTreeRoot derived from the accessibleHtml outline.
                            Best for complex documents (textbooks, multi-column,
                            branded) where HTML→PDF reflow would break pagination
                            or visual references. Requires pendingPdfBase64 (the
                            original bytes); if missing, prompts re-attach via
                            ensurePdfBase64. */}
                        <button
                          onClick={async () => {
                            try {
                              const freshBase64 = await ensurePdfBase64();
                              if (!freshBase64) return;
                              const ok = await _ensurePdfLib();
                              if (!ok) { addToast("Couldn't load PDF tagging library (network?). Try again or use PDF (from HTML).", 'error'); return; }
                              addToast('Tagging original PDF…', 'info');
                              const binStr = atob(freshBase64);
                              const bytes = new Uint8Array(binStr.length);
                              for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
                              let title = '', lang = 'en';
                              try {
                                const tmp = new DOMParser().parseFromString(pdfFixResult.accessibleHtml || '', 'text/html');
                                title = (tmp.querySelector('title')?.textContent || tmp.querySelector('h1')?.textContent || '').trim().substring(0, 200);
                                const htmlLang = tmp.documentElement?.getAttribute('lang');
                                if (htmlLang) lang = htmlLang.substring(0, 10);
                              } catch(_) {}
                              if (!title) title = (pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '');
                              const _result = await createTaggedPdf(bytes, pdfFixResult, { title, lang, subject: 'Remediated for accessibility by AlloFlow' });
                              // createTaggedPdf returns { bytes, summary } as of the
                              // tag-summary refactor. Tolerate the legacy raw-bytes
                              // shape too in case a stale CDN-cached version of the
                              // module is still loaded for this user.
                              const taggedBytes = _result && _result.bytes ? _result.bytes : _result;
                              const summary = (_result && _result.summary) || null;
                              if (!taggedBytes) { addToast('Tagged PDF generation returned no bytes.', 'error'); return; }
                              const blob = new Blob([taggedBytes], { type: 'application/pdf' });
                              safeDownloadBlob(blob, (pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '') + '-tagged.pdf');
                              // Build a concrete proof-of-tagging string. Most PDF
                              // readers don't surface tag info, so the toast is the
                              // user's main signal that real tagging happened —
                              // and lets them compare the post-remediation tag
                              // counts against the pre-remediation baseline.
                              if (summary) {
                                  const parts = [];
                                  if (summary.headings) parts.push(summary.headings + (summary.headings === 1 ? ' heading' : ' headings'));
                                  if (summary.paragraphs) parts.push(summary.paragraphs + (summary.paragraphs === 1 ? ' paragraph' : ' paragraphs'));
                                  if (summary.tables) parts.push(summary.tables + (summary.tables === 1 ? ' table' : ' tables'));
                                  if (summary.lists) parts.push(summary.lists + (summary.lists === 1 ? ' list' : ' lists'));
                                  if (summary.images) parts.push(summary.images + (summary.images === 1 ? ' image' : ' images'));
                                  if (summary.links) parts.push(summary.links + (summary.links === 1 ? ' link' : ' links'));
                                  if (summary.fields) parts.push(summary.fields + (summary.fields === 1 ? ' form field' : ' form fields'));
                                  if (summary.pages) parts.push(summary.pages + (summary.pages === 1 ? ' page' : ' pages'));
                                  const detail = parts.length ? parts.join(' · ') + ' tagged.' : 'Per-page tagging applied.';
                                  const extras = [];
                                  if (summary.bookmarks) {
                                      const _mapped = summary.bookmarksMappedToPages || 0;
                                      const _fallback = summary.bookmarks - _mapped;
                                      // Surface the per-heading page-mapping accuracy. 8/8
                                      // mapped means bookmarks fully navigate; 0/8 mapped
                                      // signals pdfjs failed to load or remediation rewrote
                                      // the heading text past the substring matcher.
                                      const _bmDetail = (_mapped > 0 || _fallback > 0)
                                          ? ' (' + _mapped + ' mapped to pages' + (_fallback > 0 ? ', ' + _fallback + ' fell back to page 1' : '') + ')'
                                          : '';
                                      extras.push('Bookmarks: ' + summary.bookmarks + ' headings' + _bmDetail + '.');
                                  }
                                  if (summary.pdfUaDeclared) extras.push('PDF/UA-1 declared.');
                                  const extrasStr = extras.length ? ' ' + extras.join(' ') : '';
                                  addToast('Tagged PDF downloaded — ' + detail + extrasStr + ' Verify in PAC 3 or a screen reader.', 'success');
                                  // Heading hierarchy linter: surface as a separate
                                  // gentler 'info' toast so the user notices but
                                  // doesn't conflate it with the success message.
                                  // PDF/UA doesn't strictly require sequential
                                  // levels, but skipped headings are a real
                                  // navigation pain for SR users.
                                  if (summary.headingHierarchyIssues > 0) {
                                      const path = (summary.headingHierarchyPath || []).slice(0, 3).join(', ');
                                      addToast('Note: ' + summary.headingHierarchyIssues + ' heading-level skip' + (summary.headingHierarchyIssues === 1 ? '' : 's') + ' detected (' + path + '). Skipped levels are valid HTML but hurt screen-reader navigation — consider editing the source to use sequential h-tags.', 'info');
                                  }
                                  // ── Quality lints: surface a single rolled-up info toast
                                  // listing the structural issues that the tagging pass can't
                                  // fix on its own (because they're content-quality issues,
                                  // not structural ones). Edit the source HTML, click Fix &
                                  // Verify, re-export to address.
                                  const _qualityIssues = [];
                                  if (summary.imagesMissingAlt > 0) {
                                      _qualityIssues.push(summary.imagesMissingAlt + ' image' + (summary.imagesMissingAlt === 1 ? '' : 's') + ' missing alt text');
                                  }
                                  if (summary.imagesTrivialAlt > 0) {
                                      _qualityIssues.push(summary.imagesTrivialAlt + ' image' + (summary.imagesTrivialAlt === 1 ? '' : 's') + ' with trivial alt (filename or "image1"-style)');
                                  }
                                  if (summary.thWithoutScope > 0) {
                                      _qualityIssues.push(summary.thWithoutScope + ' table header cell' + (summary.thWithoutScope === 1 ? '' : 's') + ' missing scope');
                                  }
                                  if (summary.linksGenericText > 0) {
                                      _qualityIssues.push(summary.linksGenericText + ' link' + (summary.linksGenericText === 1 ? '' : 's') + ' with generic text ("click here", "read more")');
                                  }
                                  if (_qualityIssues.length > 0) {
                                      addToast('Quality flags: ' + _qualityIssues.join(', ') + '. Edit the source HTML and re-tag to address.', 'info');
                                  }
                              } else {
                                  addToast('Tagged PDF downloaded — original visual layer preserved with accessibility tag tree added.', 'success');
                              }
                            } catch (err) {
                              warnLog('[TaggedPDF] failed:', err);
                              addToast('Tagged PDF failed: ' + (err?.message || 'unknown error') + '. Try PDF (from HTML) as a fallback.', 'error');
                            }
                          }}
                          className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                          title={t('pdf_audit.tagged_pdf.title') || "Preserve the original PDF's visual layout byte-identical and inject accessibility tags into its structure tree. Best for textbooks, multi-column documents, and branded PDFs where visual fidelity matters."}
                        >
                          📄 Tagged PDF
                        </button>
                        <button onClick={() => {
                          const blob = new Blob([pdfFixResult.accessibleHtml], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `${(pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '')}-accessible.html`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                          addToast('Accessible HTML downloaded', 'success');
                        }} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                          📄 HTML
                        </button>
                        <div className="relative group">
                          <button className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                            📊 Report ▾
                          </button>
                          <div className="hidden group-hover:block group-focus-within:block absolute bottom-full left-0 mb-1 bg-white border border-slate-400 rounded-xl shadow-xl z-10 min-w-[180px] overflow-hidden">
                            <button onClick={() => {
                              const _rptAi = pdfFixResult.afterScore; const _rptAxe = pdfFixResult.axeAudit?.score ?? null; const _rptBlended = (_rptAi !== null && _rptAxe !== null) ? Math.round((_rptAxe + _rptAi) / 2) : (_rptAxe ?? _rptAi);
                              const full = { before: { score: pdfAuditResult?.score ?? pdfFixResult.beforeScore, audit: pdfAuditResult }, after: { score: _rptBlended, aiAudit: pdfFixResult.verificationAudit, axeCoreAudit: pdfFixResult.axeAudit || null }, beforeScore: pdfAuditResult?.score ?? pdfFixResult.beforeScore, afterScore: _rptBlended, summary: pdfAuditResult?.summary || '' };
                              const html = generateAuditReportHtml(full, pendingPdfFile?.name || 'document.pdf', true);
                              const w = window.open('', '_blank');
                              if (w) {
                                w.document.write(html); w.document.close();
                                const banner = w.document.createElement('div'); banner.id = 'print-banner';
                                banner.innerHTML = `<div style="background:#4f46e5;color:white;padding:12px 20px;font-family:system-ui;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:9999"><span style="font-weight:bold">📊 Before/After Audit Report</span><button onclick="document.getElementById('print-banner').remove();window.print()" style="margin-left:auto;background:white;color:#4f46e5;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer">📥 Save as PDF</button><button onclick="document.getElementById('print-banner').remove()" style="background:transparent;color:white;border:1px solid rgba(255,255,255,0.3);padding:8px 12px;border-radius:6px;cursor:pointer">✕</button></div>`;
                                w.document.body.insertBefore(banner, w.document.body.firstChild);
                                const ps = w.document.createElement('style'); ps.textContent = '@media print{#print-banner{display:none!important}}'; w.document.head.appendChild(ps);
                              }
                              addToast('Report opened with Save as PDF button', 'success');
                            }} className="w-full px-4 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors">
                              📄 Formatted Report (PDF)
                            </button>
                            <button onClick={() => {
                              const _dlAi = pdfFixResult.afterScore; const _dlAxe = pdfFixResult.axeAudit?.score ?? null; const _dlBlended = (_dlAi !== null && _dlAxe !== null) ? Math.round((_dlAxe + _dlAi) / 2) : (_dlAxe ?? _dlAi);
                              const full = { before: { score: pdfAuditResult?.score ?? pdfFixResult.beforeScore, audit: pdfAuditResult }, after: { score: _dlBlended, aiAudit: pdfFixResult.verificationAudit, axeCoreAudit: pdfFixResult.axeAudit || null }, beforeScore: pdfAuditResult?.score ?? pdfFixResult.beforeScore, afterScore: _dlBlended, summary: pdfAuditResult?.summary || '' };
                              const html = generateAuditReportHtml(full, pendingPdfFile?.name || 'document.pdf', true);
                              const blob = new Blob([html], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a'); a.href = url; a.download = `a11y-before-after-${(pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '')}-${new Date().toISOString().split('T')[0]}.html`;
                              document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                              addToast('HTML report downloaded', 'success');
                            }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors border-t border-slate-100">
                              🌐 HTML Report
                            </button>
                            <button onClick={() => {
                              const _jsonAi = pdfFixResult.afterScore; const _jsonAxe = pdfFixResult.axeAudit?.score ?? null; const _jsonBlended = (_jsonAi !== null && _jsonAxe !== null) ? Math.round((_jsonAxe + _jsonAi) / 2) : (_jsonAxe ?? _jsonAi);
                              const full = { before: { score: pdfAuditResult?.score ?? pdfFixResult.beforeScore, audit: pdfAuditResult }, after: { score: _jsonBlended, aiAudit: pdfFixResult.verificationAudit, axeCoreAudit: pdfFixResult.axeAudit || null }, beforeScore: pdfAuditResult?.score ?? pdfFixResult.beforeScore, afterScore: _jsonBlended, fileName: pendingPdfFile?.name, date: new Date().toISOString(), tool: 'AlloFlow', standard: 'WCAG 2.1 AA', engines: ['AI (Gemini 5-auditor triangulation)', 'axe-core (Deque WCAG 2.1 AA)'] };
                              const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a'); a.href = url; a.download = `a11y-before-after-${new Date().toISOString().split('T')[0]}.json`;
                              document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                              addToast('JSON data exported', 'success');
                            }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors border-t border-slate-100">
                              📊 JSON Data (research)
                            </button>
                            {/* Signed audit trail — richer JSON payload +
                                SHA-256 hash embedded in a self-verifying HTML
                                artifact. One file: opens in any browser to
                                show the report, contains a "Verify integrity"
                                button that recomputes the hash and confirms
                                the payload is unaltered. Useful for legal /
                                compliance evidence. Client-side hashing is
                                called out as "browser-trust" in the footer so
                                we don't overclaim legal defensibility. */}
                            <button onClick={async () => {
                              try {
                                const teacherName = (localStorage.getItem('alloflow_teacher_name') || '').trim();
                                const promptedName = (window.prompt('Sign this audit trail as (teacher name / institution). Leave blank to sign as Unknown. Saved for next time.', teacherName) || '').trim();
                                if (promptedName) { try { localStorage.setItem('alloflow_teacher_name', promptedName); } catch (_) {} }
                                const signer = promptedName || 'Unknown';
                                const _aiS = pdfFixResult.afterScore; const _axS = pdfFixResult.axeAudit?.score ?? null;
                                const blended = (_aiS !== null && _axS !== null) ? Math.round((_axS + _aiS) / 2) : (_axS ?? _aiS);
                                let docFingerprint = null;
                                if (pendingPdfBase64) {
                                  try {
                                    const encB = new TextEncoder().encode(pendingPdfBase64);
                                    const dfBuf = await crypto.subtle.digest('SHA-256', encB);
                                    docFingerprint = Array.from(new Uint8Array(dfBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
                                  } catch (_) { docFingerprint = null; }
                                }
                                let pipelineHash = 'unknown';
                                try {
                                  const scripts = Array.from(document.querySelectorAll('script[src*="Apomera/AlloFlow@"]'));
                                  if (scripts.length) {
                                    const m = (scripts[0].getAttribute('src') || '').match(/@([a-f0-9]{7,40})\//);
                                    if (m && m[1]) pipelineHash = m[1];
                                  }
                                } catch (_) {}
                                const nowISO = new Date().toISOString();
                                const payloadCore = {
                                  version: 1,
                                  generatedAt: nowISO,
                                  generatedBy: { app: 'AlloFlow', pipelineHash: pipelineHash, signer: signer },
                                  document: {
                                    fileName: pendingPdfFile?.name || 'document.pdf',
                                    fileSize: pendingPdfFile?.size || 0,
                                    pageCount: pdfFixResult.pageCount || pdfAuditResult?.pageCount || null,
                                    imageCount: pdfFixResult.imageCount || 0,
                                    fingerprint: docFingerprint ? { algo: 'SHA-256', hash: docFingerprint } : null,
                                  },
                                  remediation: {
                                    standard: 'WCAG 2.1 AA',
                                    engines: ['AI (Gemini 5-auditor triangulation)', 'axe-core (Deque WCAG 2.1 AA)'],
                                    beforeScore: pdfAuditResult?.score ?? pdfFixResult.beforeScore,
                                    afterScore: blended,
                                    aiAudit: pdfFixResult.verificationAudit || null,
                                    axeAudit: pdfFixResult.axeAudit || null,
                                    autoFixPasses: pdfFixResult.autoFixPasses || 0,
                                    integrityCoverage: pdfFixResult.integrityCoverage ?? null,
                                    userEdits: {
                                      rejectedHunkCount: pdfFixResult._rejectedHunkCount || 0,
                                      userEditedAt: pdfFixResult._userEditedAt || null,
                                      lastApplyPath: pdfFixResult._lastApplyPath || null,
                                    },
                                  },
                                  summary: pdfAuditResult?.summary || '',
                                };
                                const payloadJson = JSON.stringify(payloadCore, null, 2);
                                const enc = new TextEncoder().encode(payloadJson);
                                const hashBuf = await crypto.subtle.digest('SHA-256', enc);
                                const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
                                const baseReport = generateAuditReportHtml(
                                  { before: { score: pdfAuditResult?.score ?? pdfFixResult.beforeScore, audit: pdfAuditResult }, after: { score: blended, aiAudit: pdfFixResult.verificationAudit, axeCoreAudit: pdfFixResult.axeAudit || null }, beforeScore: pdfAuditResult?.score ?? pdfFixResult.beforeScore, afterScore: blended, summary: pdfAuditResult?.summary || '' },
                                  pendingPdfFile?.name || 'document.pdf',
                                  true
                                );
                                const trailFooter = `
<section id="alloflow-audit-trail" style="margin-top:40px;padding:20px;background:#f1f5f9;border-radius:12px;border:2px solid #6366f1;font-family:system-ui,sans-serif">
  <h2 style="color:#4f46e5;font-size:18px;margin:0 0 8px">🔒 Audit Trail — Signed Integrity Envelope</h2>
  <p style="color:#475569;font-size:13px;margin:0 0 12px">This report is signed with a SHA-256 hash of its embedded audit payload. The hash is computed client-side in the browser that generated this file — sufficient to detect alteration of the JSON payload below, not a legal-grade cryptographic signature. For a tamper-evident server-signed audit, an institutional reviewer should record this hash at generation time.</p>
  <dl style="display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:12px;color:#334155;margin:0 0 12px">
    <dt style="font-weight:bold">Signer</dt><dd>${signer.replace(/</g, '&lt;')}</dd>
    <dt style="font-weight:bold">Generated</dt><dd>${nowISO}</dd>
    <dt style="font-weight:bold">Pipeline</dt><dd>AlloFlow @ ${pipelineHash}</dd>
    <dt style="font-weight:bold">Document fingerprint</dt><dd style="font-family:ui-monospace,monospace;word-break:break-all">${docFingerprint || '(PDF not attached at sign time)'}</dd>
    <dt style="font-weight:bold">Payload hash (SHA-256)</dt><dd style="font-family:ui-monospace,monospace;word-break:break-all" id="aat-stored-hash">${hashHex}</dd>
  </dl>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <button id="aat-verify-btn" style="background:#4f46e5;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px">🔍 Verify integrity</button>
    <span id="aat-verify-result" style="font-size:12px;color:#64748b">Click to recompute the hash and confirm the payload is unaltered.</span>
  </div>
  <details style="margin-top:16px">
    <summary style="cursor:pointer;font-weight:bold;color:#475569;font-size:12px">View raw audit payload (JSON)</summary>
    <pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;font-size:11px;overflow-x:auto;margin-top:8px"><code id="aat-payload-display"></code></pre>
  </details>
</section>
<script type="application/json" id="aat-payload">${payloadJson.replace(/<\\//g, '<\\\\/')}</script>
<script>
  (function(){
    var storedHash = ${JSON.stringify(hashHex)};
    var payloadEl = document.getElementById('aat-payload');
    var payload = payloadEl ? payloadEl.textContent : '';
    var disp = document.getElementById('aat-payload-display');
    if (disp) disp.textContent = payload;
    var btn = document.getElementById('aat-verify-btn');
    var res = document.getElementById('aat-verify-result');
    if (btn && res) {
      btn.addEventListener('click', async function(){
        res.style.color = '#475569'; res.textContent = 'Computing hash...';
        try {
          var enc = new TextEncoder().encode(payload);
          var buf = await crypto.subtle.digest('SHA-256', enc);
          var hex = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
          if (hex === storedHash) {
            res.style.color = '#16a34a';
            res.innerHTML = '\u2705 <strong>Verified.</strong> Payload matches the signed hash — this audit trail has not been altered since generation.';
          } else {
            res.style.color = '#dc2626';
            res.innerHTML = '\u274C <strong>Integrity FAILED.</strong> Computed hash does not match the stored hash. This audit trail has been tampered with or corrupted.<br><span style="font-family:ui-monospace,monospace;font-size:10px">expected ' + storedHash + '</span><br><span style="font-family:ui-monospace,monospace;font-size:10px">got ' + hex + '</span>';
          }
        } catch(e) {
          res.style.color = '#dc2626';
          res.textContent = 'Verification failed: ' + (e && e.message ? e.message : 'unknown error');
        }
      });
    }
  })();
</script>`;
                                const withTrail = baseReport.replace(/<\/body>/i, trailFooter + '</body>');
                                const blob = new Blob([withTrail], { type: 'text/html' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `a11y-audit-trail-${(pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '')}-${new Date().toISOString().split('T')[0]}.html`;
                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                addToast('Audit trail downloaded — open in any browser to verify integrity.', 'success');
                              } catch (err) {
                                addToast('Audit trail generation failed: ' + (err?.message || 'unknown'), 'error');
                              }
                            }} className="w-full px-4 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors border-t border-slate-100">
                              📎 Audit Trail (signed)
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Save / Load Project — manual button now delegates to the shared saveProjectToFile helper,
                          which also powers auto-save after the initial remediation + auto-continue loop. */}
                      <div className="flex gap-2">
                        <button onClick={() => { saveProjectToFile(false); }} className="flex-1 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5">
                          💾 Save Project
                        </button>
                        <label className="flex-1 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                          📂 Load Project
                          <input type="file" accept=".json,.alloflow.json" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              try {
                                const project = JSON.parse(ev.target.result);
                                if (!project.accessibleHtml || !project.version) { addToast('Invalid project file', 'error'); return; }
                                setPdfFixResult({
                                  accessibleHtml: project.accessibleHtml,
                                  beforeScore: project.beforeScore,
                                  afterScore: project.afterScore,
                                  axeAudit: project.axeAudit || null,
                                  verificationAudit: project.verificationAudit || null,
                                  docStyle: project.docStyle || null,
                                  pageCount: project.pageCount,
                                  imageCount: project.imageCount || 0,
                                  needsExpertReview: project.needsExpertReview || false,
                                  htmlChars: project.accessibleHtml.length,
                                  extractedChars: 0,
                                  issuesFixed: 0,
                                  remainingIssues: 0,
                                  autoFixPasses: 0,
                                });
                                setPendingPdfFile({ name: project.fileName || 'loaded-project.pdf', size: project.multiSession?.fileSize || 0 });
                                if (project.multiSession && Array.isArray(project.multiSession.ranges) && project.multiSession.ranges.length > 0) {
                                  setPdfMultiSession(project.multiSession);
                                  const sortedR = project.multiSession.ranges.slice().sort((a, b) => (a.pages[0] || 0) - (b.pages[0] || 0));
                                  const lastEnd = sortedR[sortedR.length - 1].pages[1];
                                  const total = project.pageCount || project.multiSession.pageCount || 1;
                                  if (lastEnd < total) {
                                    const nextStart = lastEnd + 1;
                                    const nextEnd = Math.min(nextStart + 29, total);
                                    setPdfPageRange({ start: nextStart, end: nextEnd });
                                  }
                                  if (_docPipeline && _docPipeline.multiSessionId && pendingPdfFile) {
                                    try {
                                    } catch {}
                                  }
                                  addToast('📂 Project loaded: ' + (project.fileName || 'document') + ' — ' + project.multiSession.ranges.length + ' prior range' + (project.multiSession.ranges.length === 1 ? '' : 's') + ' restored', 'success');
                                } else {
                                  setPdfMultiSession(null);
                                  setPdfPageRange(null);
                                  addToast('📂 Project loaded: ' + (project.fileName || 'document') + ' — continue editing!', 'success');
                                }
                              } catch(err) { addToast('Failed to load project: ' + err.message, 'error'); }
                            };
                            reader.readAsText(file);
                            e.target.value = '';
                          }} />
                        </label>
                      </div>

                      {/* Save Structure as Accessible Template */}
                      <button onClick={() => {
                        const html = pdfFixResult?.accessibleHtml;
                        if (!html) return;
                        const structure = [];
                        const headings = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
                        headings.forEach(m => {
                          structure.push({ type: 'heading', level: parseInt(m[1]), text: m[2].replace(/<[^>]*>/g, '').trim().substring(0, 80) });
                        });
                        const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
                        tables.forEach((t, i) => {
                          const headers = [...t[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(h => h[1].replace(/<[^>]*>/g, '').trim());
                          const caption = (t[1].match(/<caption[^>]*>([\s\S]*?)<\/caption>/i) || [])[1] || '';
                          structure.push({ type: 'table', index: i, headers, caption: caption.replace(/<[^>]*>/g, '').trim(), rowCount: (t[1].match(/<tr/gi) || []).length });
                        });
                        const lists = [...html.matchAll(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi)];
                        lists.forEach((l, i) => {
                          const items = (l[2].match(/<li/gi) || []).length;
                          structure.push({ type: 'list', ordered: l[1] === 'ol', itemCount: items, index: i });
                        });
                        const landmarks = [];
                        if (html.includes('<main')) landmarks.push('main');
                        if (html.includes('<nav')) landmarks.push('nav');
                        if (html.includes('<header')) landmarks.push('header');
                        if (html.includes('<footer')) landmarks.push('footer');
                        if (html.includes('<aside')) landmarks.push('aside');
                        const images = [...html.matchAll(/<img[^>]*alt="([^"]*)"[^>]*>/gi)].map(m => m[1]);
                        const templateName = prompt('Template name (e.g., "IEP Document", "Course Syllabus"):');
                        if (!templateName) return;
                        const template = {
                          version: 1,
                          type: 'alloflow-template',
                          name: templateName,
                          createdAt: new Date().toISOString(),
                          sourceFile: pendingPdfFile?.name || 'document',
                          structure,
                          landmarks,
                          imageCount: images.length,
                          imageAlts: images.slice(0, 5),
                          hasSkipNav: html.includes('Skip to'),
                          hasLangAttr: /lang="[^"]*"/.test(html),
                          lang: (html.match(/lang="([^"]*)"/) || [])[1] || 'en',
                          styles: {
                            headingColor: (html.match(/h1[^{]*\{[^}]*color:\s*([^;"]+)/i) || [])[1] || '#1e293b',
                            fontFamily: (html.match(/font-family:\s*([^;"]+)/i) || [])[1] || 'system-ui, sans-serif',
                          },
                        };
                        try {
                          const saved = JSON.parse(localStorage.getItem('alloflow_templates') || '[]');
                          saved.push(template);
                          localStorage.setItem('alloflow_templates', JSON.stringify(saved));
                        } catch(e) {}
                        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = templateName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '.alloflow-template.json';
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                        addToast('📐 Template "' + templateName + '" saved! Use it in Document Builder to create pre-structured accessible documents.', 'success');
                      }} className="w-full px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-600 rounded-xl text-xs font-bold text-amber-700 hover:from-amber-100 hover:to-orange-100 transition-all flex items-center justify-center gap-2">
                        📐 Save Structure as Template (for future documents)
                      </button>

                      {/* Alternative Formats (matching Anthology Ally feature set) */}
                      <details className="group">
                        <summary className="text-[11px] font-bold text-teal-600 uppercase tracking-widest cursor-pointer hover:text-teal-800 transition-colors flex items-center gap-1">
                          📑 Alternative Formats <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                        </summary>
                        <div className="mt-2 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-600 rounded-xl p-3 space-y-1.5">
                          <p className="text-[11px] text-slate-600">{t('pdf_audit.alt_formats.intro') || 'Download the remediated document in accessible alternative formats'}</p>

                          {/* ePub */}
                          <button onClick={() => {
                            const html = pdfFixResult?.accessibleHtml;
                            if (!html) return;
                            const title = (pendingPdfFile?.name || 'document').replace(/\.\w+$/, '');
                            const textContent = html.replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
                            const xmlTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                            if (!window.JSZip) { addToast('ZIP library loading...', 'info'); return; }
                            const zip = new window.JSZip();
                            zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
                            zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
                            const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">alloflow-${Date.now()}</dc:identifier>
    <dc:title>${xmlTitle}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>AlloFlow Document Pipeline</dc:creator>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine><itemref idref="content"/></spine>
</package>`;
                            zip.file('OEBPS/content.opf', opf);
                            let xhtml = html.replace(/<br>/g, '<br/>').replace(/<hr>/g, '<hr/>').replace(/<img([^>]*[^/])>/g, '<img$1/>').replace(/&nbsp;/g, '&#160;');
                            if (!xhtml.includes('xmlns')) xhtml = xhtml.replace('<html', '<html xmlns="http://www.w3.org/1999/xhtml"');
                            zip.file('OEBPS/content.xhtml', xhtml);
                            const headings = [...html.matchAll(/<h([1-3])[^>]*id="([^"]*)"[^>]*>([^<]+)/gi)];
                            const navItems = headings.length > 0
                              ? headings.map(m => `<li><a href="content.xhtml#${m[2]}">${m[3].trim()}</a></li>`).join('\n')
                              : '<li><a href="content.xhtml">Document</a></li>';
                            zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body><nav epub:type="toc"><h1>Table of Contents</h1><ol>${navItems}</ol></nav></body>
</html>`);
                            zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' }).then(blob => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a'); a.href = url; a.download = title + '.epub';
                              document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                              addToast('📚 ePub downloaded — open in any e-reader', 'success');
                            });
                          }} className="w-full px-3 py-2 bg-white border border-teal-600 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-2">
                            📚 ePub (e-readers, mobile, Kindle)
                          </button>

                          {/* Braille BRF */}
                          <button onClick={() => {
                            const html = pdfFixResult?.accessibleHtml;
                            if (!html) return;
                            const text = html.replace(/<[^>]*>/g, '\n').replace(/&[^;]+;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
                            const brailleMap = {'a':'1','b':'12','c':'14','d':'145','e':'15','f':'124','g':'1245','h':'125','i':'24','j':'245','k':'13','l':'123','m':'134','n':'1345','o':'135','p':'1234','q':'12345','r':'1235','s':'234','t':'2345','u':'136','v':'1236','w':'2456','x':'1346','y':'13456','z':'1356',' ':' ','1':'1','2':'12','3':'14','4':'145','5':'15','6':'124','7':'1245','8':'125','9':'24','0':'245','.':'256',',':'2','?':'236','!':'235',':':'25',';':'23','-':'36',"'":"3"};
                            const dotToAscii = (dots) => {
                              const val = dots.split('').reduce((s, d) => s + (1 << (parseInt(d) - 1)), 0);
                              return String.fromCharCode(0x2800 + val);
                            };
                            let brf = '';
                            const lines = text.split('\n');
                            for (const line of lines) {
                              let brailleLine = '';
                              const lower = line.toLowerCase();
                              for (let i = 0; i < lower.length; i++) {
                                const ch = lower[i];
                                if (brailleMap[ch]) {
                                  if (line[i] !== lower[i]) brailleLine += dotToAscii('6');
                                  if (/[0-9]/.test(ch) && (i === 0 || !/[0-9]/.test(lower[i-1]))) brailleLine += dotToAscii('3456');
                                  brailleLine += dotToAscii(brailleMap[ch]);
                                } else {
                                  brailleLine += ch;
                                }
                              }
                              brf += brailleLine + '\n';
                            }
                            const blob = new Blob([brf], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url;
                            a.download = (pendingPdfFile?.name || 'document').replace(/\.\w+$/, '') + '.brf';
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                            addToast('⠃⠗⠇ Braille file downloaded (Grade 1 BRF)', 'success');
                          }} className="w-full px-3 py-2 bg-white border border-teal-600 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-2">
                            ⠃⠗⠇ Electronic Braille (BRF)
                          </button>

                          {/* Plain text */}
                          <button onClick={() => {
                            const html = pdfFixResult?.accessibleHtml;
                            if (!html) return;
                            const text = html.replace(/<h([1-6])[^>]*>/gi, (m, l) => '\n' + '#'.repeat(parseInt(l)) + ' ')
                              .replace(/<\/h[1-6]>/gi, '\n').replace(/<li[^>]*>/gi, '  • ').replace(/<\/li>/gi, '\n')
                              .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>/g, '')
                              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
                              .replace(/&#160;/g, ' ').replace(/\n{4,}/g, '\n\n\n').trim();
                            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url;
                            a.download = (pendingPdfFile?.name || 'document').replace(/\.\w+$/, '') + '.txt';
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                            addToast('📝 Plain text downloaded', 'success');
                          }} className="w-full px-3 py-2 bg-white border border-teal-600 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-2">
                            📝 Plain Text (screen readers, large print)
                          </button>

                          {/* Markdown */}
                          <button onClick={() => {
                            const html = pdfFixResult?.accessibleHtml;
                            if (!html) return;
                            let md = html.replace(/<h1[^>]*>/gi, '# ').replace(/<\/h1>/gi, '\n\n')
                              .replace(/<h2[^>]*>/gi, '## ').replace(/<\/h2>/gi, '\n\n')
                              .replace(/<h3[^>]*>/gi, '### ').replace(/<\/h3>/gi, '\n\n')
                              .replace(/<h4[^>]*>/gi, '#### ').replace(/<\/h4>/gi, '\n\n')
                              .replace(/<strong[^>]*>/gi, '**').replace(/<\/strong>/gi, '**')
                              .replace(/<em[^>]*>/gi, '*').replace(/<\/em>/gi, '*')
                              .replace(/<a[^>]*href="([^"]*)"[^>]*>/gi, '[').replace(/<\/a>/gi, (m, o, s) => { const href = s.substring(0, o).match(/href="([^"]*)"/); return '](' + (href ? href[1] : '') + ')'; })
                              .replace(/<li[^>]*>/gi, '- ').replace(/<\/li>/gi, '\n')
                              .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
                              .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '![$1](image)')
                              .replace(/<[^>]*>/g, '').replace(/\n{4,}/g, '\n\n\n').trim();
                            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url;
                            a.download = (pendingPdfFile?.name || 'document').replace(/\.\w+$/, '') + '.md';
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                            addToast('📋 Markdown downloaded', 'success');
                          }} className="w-full px-3 py-2 bg-white border border-teal-600 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-2">
                            📋 Markdown (LMS, wiki, docs)
                          </button>
                        </div>
                      </details>

                      {/* Expert Workbench — Advanced Remediation Command Bar (collapsible) */}
                      <details open className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600 rounded-xl group">
                        <summary className="cursor-pointer p-3 text-[11px] font-bold text-purple-700 uppercase tracking-widest flex items-center gap-2 list-none select-none hover:bg-slate-800/50 rounded-xl">
                          <span className="inline-block transition-transform group-open:rotate-90 text-slate-600">▸</span>
                          🤖 Expert Workbench
                          {isAgentRunning && <span className="text-[11px] text-amber-700 animate-pulse ml-1">Running...</span>}
                          <span className="ml-auto text-[10px] text-slate-500 font-normal normal-case tracking-normal">{agentActivityLog.length > 0 ? `${agentActivityLog.length} event${agentActivityLog.length === 1 ? '' : 's'}` : 'idle'}</span>
                        </summary>
                        <div className="px-3 pb-3 space-y-2">
                        <form className="flex gap-1" onSubmit={async (e) => {
                          e.preventDefault();
                          if (!expertCommandInput.trim() || isAgentRunning || !pdfFixResult?.accessibleHtml) return;
                          const cmd = expertCommandInput.trim();
                          setExpertCommandInput('');
                          setIsAgentRunning(true);
                          console.info('[ExpertWorkbench] start command=' + JSON.stringify(cmd));
                          addToast(`🤖 Workbench running: ${cmd}`, 'info');
                          setAgentActivityLog(prev => [...prev, { text: '▶ ' + cmd, type: 'command', time: new Date().toLocaleTimeString() }]);
                          try {
                            const result = await processExpertCommand(cmd, pdfFixResult.accessibleHtml, {
                              onProgress: () => {},
                              onActivity: (entry) => {
                                console.info('[ExpertWorkbench] activity type=' + entry.type + ' text=' + entry.text);
                                setAgentActivityLog(prev => [...prev, entry]);
                              }
                            });
                            if (result && result.html && result.html !== pdfFixResult.accessibleHtml) {
                              setPdfFixResult(prev => ({ ...prev, accessibleHtml: result.html }));
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
                            placeholder={isAgentRunning ? 'Agent working...' : 'audit, auto, or describe what to fix...'}
                            disabled={isAgentRunning}
                            aria-label={t('pdf_audit.expert.command_aria') || 'Expert remediation command'}
                            className="flex-1 px-2 py-1.5 bg-slate-700 text-white text-[11px] rounded border border-slate-600 placeholder-slate-500 focus:ring-1 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
                          />
                          <button type="submit" disabled={isAgentRunning || !expertCommandInput.trim()}
                            className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-30 transition-colors"
                          >{isAgentRunning ? '⏳' : '▶'}</button>
                        </form>
                        {agentActivityLog.length > 0 && (
                          <div>
                            <div className={(agentLogFullView ? 'max-h-64' : 'max-h-20') + ' overflow-y-auto bg-slate-900 rounded-lg px-2 py-1 space-y-0.5 text-[11px] font-mono'} aria-live="polite" aria-label={t('pdf_audit.expert.log_aria') || 'Agent activity log'}>
                              {(agentLogFullView ? agentActivityLog : agentActivityLog.slice(-6)).map((entry, i) => (
                                <div key={i} className={'flex items-start gap-1 ' + (entry.type === 'error' ? 'text-red-400' : entry.type === 'score' ? 'text-cyan-300' : entry.type === 'success' || entry.type === 'complete' ? 'text-green-400' : entry.type === 'tool' ? 'text-amber-300' : entry.type === 'command' ? 'text-purple-300' : 'text-slate-400')}>
                                  <span className="text-slate-600 shrink-0">{entry.time}</span>
                                  <span>{entry.text}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <button type="button" onClick={() => setAgentLogFullView(v => !v)} className="text-[10px] text-purple-700 hover:text-purple-200 underline">
                                {agentLogFullView ? 'Show recent only' : `Show full log (${agentActivityLog.length})`}
                              </button>
                              <button type="button" onClick={() => { setAgentActivityLog([]); console.info('[ExpertWorkbench] log cleared'); }} className="text-[10px] text-slate-500 hover:text-slate-300 underline ml-auto">Clear</button>
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600">Commands: <span className="text-slate-600">audit</span> · <span className="text-slate-600">auto</span> · <span className="text-slate-600">contrast</span> · or describe what to fix in plain language</p>
                        </div>
                      </details>

                      {/* Differentiation Tools */}
                      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-600 rounded-xl p-3 space-y-2">
                        <div className="text-[11px] font-bold text-violet-600 uppercase tracking-widest">📚 Differentiate This Document</div>

                        {/* Bionic Reading - toggle on/off */}
                        <button onClick={() => {
                          if (pdfFixResult._preBionicHtml) {
                            setPdfFixResult(prev => ({ ...prev, accessibleHtml: prev._preBionicHtml, _preBionicHtml: null }));
                            addToast('📖 Bionic reading removed', 'info');
                          } else {
                            let html = pdfFixResult.accessibleHtml;
                            const snapshot = html;
                            html = html.replace(/>([^<]+)</g, (match, text) => {
                              const bionic = text.replace(/\b([a-zA-Z\u00C0-\u024F]+)\b/g, (word) => {
                                if (word.length <= 1) return word;
                                const boldLen = word.length <= 3 ? word.length : Math.ceil(word.length / 2);
                                return '<b>' + word.slice(0, boldLen) + '</b>' + word.slice(boldLen);
                              });
                              return '>' + bionic + '<';
                            });
                            setPdfFixResult(prev => ({ ...prev, accessibleHtml: html, _preBionicHtml: snapshot }));
                            addToast('📖 Bionic reading applied — click again to remove', 'success');
                          }
                        }} className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${pdfFixResult._preBionicHtml ? 'bg-violet-100 border-violet-400 text-violet-800' : 'bg-white border-violet-600 text-violet-700 hover:bg-violet-100'}`}>
                          <b>Bi</b>onic {pdfFixResult._preBionicHtml ? '✓ ON (click to remove)' : 'Reading'}
                        </button>

                        {/* Line Guide — alternating background stripes for reading tracking */}
                        <button onClick={() => {
                          const html = pdfFixResult.accessibleHtml;
                          if (pdfFixResult._preLineGuideHtml) {
                            setPdfFixResult(prev => ({ ...prev, accessibleHtml: prev._preLineGuideHtml, _preLineGuideHtml: null }));
                            addToast('Line guide removed', 'info');
                          } else {
                            const snapshot = html;
                            const guideCSS = `<style id="alloflow-line-guide">
                              p, li, dd, td, blockquote, .section, article > div {
                                background-image: repeating-linear-gradient(
                                  to bottom,
                                  transparent 0,
                                  transparent 1.6em,
                                  rgba(99, 102, 241, 0.06) 1.6em,
                                  rgba(99, 102, 241, 0.06) 3.2em
                                );
                                background-size: 100% 3.2em;
                                line-height: 1.6em;
                              }
                              @media (prefers-color-scheme: dark) {
                                p, li, dd, td { background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 1.6em, rgba(165,180,252,0.08) 1.6em, rgba(165,180,252,0.08) 3.2em); }
                              }
                            </style>`;
                            let fixed = html;
                            if (fixed.includes('</head>')) { fixed = fixed.replace('</head>', guideCSS + '</head>'); }
                            else { fixed = guideCSS + fixed; }
                            setPdfFixResult(prev => ({ ...prev, accessibleHtml: fixed, _preLineGuideHtml: snapshot }));
                            addToast('📏 Line guide applied — alternating stripes help eye tracking', 'success');
                          }
                        }} className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${pdfFixResult._preLineGuideHtml ? 'bg-violet-100 border-violet-400 text-violet-800' : 'bg-white border-violet-600 text-violet-700 hover:bg-violet-100'}`}>
                          📏 Line Guide {pdfFixResult._preLineGuideHtml ? '✓ ON (click to remove)' : '(reading tracker)'}
                        </button>

                        {/* Translate with free-text input + datalist suggestions */}
                        <div className="flex gap-1.5">
                          <input id="pdf-translate-lang" list="pdf-translate-suggestions" className="flex-1 text-[11px] border border-violet-600 rounded-lg px-2 py-2 bg-white text-slate-700" aria-label={t('pdf_audit.translate.lang_aria') || 'Translation language — type any language or pick from suggestions'} placeholder={t('pdf_audit.translate.lang_placeholder') || '🌐 Type language (e.g. Spanish, Tagalog, Dari...)'} />
                          <datalist id="pdf-translate-suggestions">
                            <option value="Spanish" /><option value="French" /><option value="Arabic" />
                            <option value="Somali" /><option value="Vietnamese" /><option value="Portuguese" />
                            <option value="Mandarin Chinese" /><option value="Korean" /><option value="Japanese" />
                            <option value="Russian" /><option value="Tagalog" /><option value="Haitian Creole" />
                            <option value="German" /><option value="Italian" /><option value="Hindi" />
                            <option value="Urdu" /><option value="Swahili" /><option value="Ukrainian" />
                            <option value="Polish" /><option value="Thai" /><option value="Nepali" />
                            <option value="Dari" /><option value="Pashto" /><option value="Burmese" />
                            <option value="Amharic" /><option value="Tigrinya" /><option value="Marshallese" />
                            <option value="Chuukese" /><option value="Karen" /><option value="Khmer" />
                          </datalist>
                          <button onClick={async () => {
                            const lang = document.getElementById('pdf-translate-lang')?.value?.trim();
                            if (!lang || !callGemini) { addToast('Enter a language first', 'info'); return; }
                            addToast('🌐 Translating to ' + lang + '...', 'info');
                            try {
                              const temp = document.createElement('div'); temp.innerHTML = pdfFixResult.accessibleHtml;
                              const textContent = temp.textContent || '';
                              const chunks = textContent.match(/[\s\S]{1,4000}/g) || [textContent];
                              let translatedParts = [];
                              for (let ci = 0; ci < chunks.length; ci++) {
                                addToast('🌐 ' + (ci+1) + '/' + chunks.length + '...', 'info');
                                const translated = await callGemini(`Translate to ${lang}. Preserve formatting and structure. Return ONLY the translated text.\n\n"""\n${chunks[ci]}\n"""`, false);
                                translatedParts.push(translated);
                              }
                              const isRtl = ['Arabic', 'Hebrew', 'Farsi', 'Urdu', 'Persian', 'Hindi'].some(l => lang.toLowerCase().includes(l.toLowerCase()));
                              const mdToHtml = (md) => {
                                let html = '';
                                const lines = md.split('\n');
                                let inTable = false;
                                let tableRows = [];
                                const flushTable = () => {
                                  if (tableRows.length === 0) return;
                                  html += '<table style="width:100%;border-collapse:collapse;margin:1em 0;font-size:inherit">';
                                  tableRows.forEach((row, ri) => {
                                    if (row.replace(/[|\-:\s]/g, '') === '') return; // skip separator row
                                    const cells = row.split('|').filter(c => c.trim() !== '');
                                    const tag = ri === 0 ? 'th' : 'td';
                                    const style = ri === 0 ? 'padding:8px 12px;border:1px solid #c4b5fd;background:#ede9fe;font-weight:bold;text-align:left' : 'padding:8px 12px;border:1px solid #e2e8f0';
                                    html += '<tr>' + cells.map(c => `<${tag} style="${style}">${c.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</${tag}>`).join('') + '</tr>';
                                  });
                                  html += '</table>';
                                  tableRows = [];
                                  inTable = false;
                                };
                                lines.forEach(line => {
                                  const trimmed = line.trim();
                                  if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                                    inTable = true;
                                    tableRows.push(trimmed);
                                    return;
                                  }
                                  if (inTable) flushTable();
                                  if (trimmed.startsWith('# ')) { html += `<h1 style="font-size:1.4em;font-weight:900;margin:1em 0 0.5em">${trimmed.slice(2)}</h1>`; }
                                  else if (trimmed.startsWith('## ')) { html += `<h2 style="font-size:1.2em;font-weight:800;margin:1em 0 0.4em">${trimmed.slice(3)}</h2>`; }
                                  else if (trimmed.startsWith('### ')) { html += `<h3 style="font-size:1.1em;font-weight:700;margin:0.8em 0 0.3em">${trimmed.slice(4)}</h3>`; }
                                  else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) { html += `<li style="margin:0.3em 0;margin-left:1.5em">${trimmed.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`; }
                                  else if (/^\d+\.\s/.test(trimmed)) { html += `<li style="margin:0.3em 0;margin-left:1.5em;list-style-type:decimal">${trimmed.replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`; }
                                  else if (trimmed === '---' || trimmed === '***') { html += '<hr style="border:none;border-top:1px solid #c4b5fd;margin:1em 0">'; }
                                  else if (trimmed) { html += `<p style="margin:0.6em 0;line-height:1.7">${trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`; }
                                });
                                if (inTable) flushTable();
                                return html;
                              };
                              const translatedHtml = mdToHtml(translatedParts.join('\n\n'));
                              const section = `<hr style="border:none;border-top:3px solid #7c3aed;margin:3rem 0">
                                <div style="background:#f5f3ff;padding:24px;border-radius:12px;border:2px solid #c4b5fd;${isRtl ? 'direction:rtl;text-align:right;' : ''}">
                                <h2 style="color:#7c3aed;margin-bottom:1rem">${'\uD83C\uDF10'} ${lang} Translation</h2>
                                ${translatedHtml}
                                </div>`;
                              setPdfFixResult(prev => ({ ...prev, accessibleHtml: prev.accessibleHtml.replace('</main>', section + '</main>') }));
                              addToast('🌐 ' + lang + ' translation added!', 'success');
                            } catch(e) { addToast('Translation failed: ' + e.message, 'error'); }
                          }} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-[11px] font-bold hover:bg-violet-700 transition-colors shrink-0">
                            Translate
                          </button>
                        </div>

                        {/* Simplify with grade level dropdown */}
                        <div className="flex gap-1.5">
                          <select id="pdf-simplify-level" className="flex-1 text-[11px] border border-violet-600 rounded-lg px-2 py-2 bg-white text-slate-700" aria-label={t('pdf_audit.simplify.level_aria') || 'Simplification grade level'} defaultValue="5th">
                            <option value="K">📖 Kindergarten</option>
                            <option value="1st">📖 1st Grade</option>
                            <option value="2nd">📖 2nd Grade</option>
                            <option value="3rd">📖 3rd Grade</option>
                            <option value="4th">📖 4th Grade</option>
                            <option value="5th">📖 5th Grade</option>
                            <option value="6th">📖 6th Grade</option>
                            <option value="7th">📖 7th Grade</option>
                            <option value="8th">📖 8th Grade</option>
                            <option value="9th">📖 9th Grade</option>
                            <option value="10th">📖 10th Grade</option>
                          </select>
                          <button onClick={async () => {
                            const level = document.getElementById('pdf-simplify-level')?.value || '5th';
                            if (!callGemini) return;
                            addToast('📖 Simplifying to ' + level + ' grade...', 'info');
                            try {
                              const temp = document.createElement('div'); temp.innerHTML = pdfFixResult.accessibleHtml;
                              const textContent = (temp.textContent || '').substring(0, 8000);
                              const simplified = await callGemini(`Simplify to ${level} grade reading level. Keep ALL important information. Use simpler words, shorter sentences. Preserve headings.\n\n"""\n${textContent}\n"""\n\nReturn simplified text with # for headings, - for lists.`, false);
                              const section = `<hr style="border:none;border-top:3px solid #16a34a;margin:3rem 0">
                                <div style="background:#f0fdf4;padding:24px;border-radius:12px;border:2px solid #86efac;">
                                <h2 style="color:#16a34a;margin-bottom:1rem">📖 Simplified (${level} Grade)</h2>
                                ${simplified.split('\n').map(line => {
                                  line = line.trim();
                                  var processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
                                  if (processed.startsWith('# ')) return '<h3 style="color:#166534;margin:1em 0 0.5em">' + processed.substring(2) + '</h3>';
                                  if (processed.startsWith('## ')) return '<h4 style="color:#166534;margin:0.8em 0 0.4em">' + processed.substring(3) + '</h4>';
                                  if (processed.startsWith('### ')) return '<h5 style="color:#166534;margin:0.6em 0 0.3em;font-weight:bold">' + processed.substring(4) + '</h5>';
                                  if (processed.startsWith('- ') || processed.startsWith('* ')) return '<li style="margin:0.3em 0;margin-left:1.5em">' + processed.substring(2) + '</li>';
                                  if (processed) return '<p style="margin:0.6em 0;line-height:1.8">' + processed + '</p>';
                                  return '';
                                }).join('\n')}
                                </div>`;
                              setPdfFixResult(prev => ({ ...prev, accessibleHtml: prev.accessibleHtml.replace('</main>', section + '</main>') }));
                              addToast('📖 Simplified version added!', 'success');
                            } catch(e) { addToast('Simplification failed: ' + e.message, 'error'); }
                          }} className="px-3 py-2 bg-green-700 text-white rounded-lg text-[11px] font-bold hover:bg-green-700 transition-colors shrink-0">
                            Simplify
                          </button>
                        </div>

                        {/* Full Pipeline */}
                        <button onClick={() => {
                          const temp = document.createElement('div'); temp.innerHTML = pdfFixResult.accessibleHtml;
                          setInputText(temp.textContent || temp.innerText || '');
                          _closePdfAuditModal();
                          addToast('Content loaded — generate leveled text, glossary, quiz, and more', 'success');
                        }} className="w-full px-3 py-2 bg-white border border-violet-600 rounded-xl text-xs font-bold text-violet-700 hover:bg-violet-100 transition-all flex items-center gap-2 justify-center">
                          ✨ Full Differentiation Pipeline
                        </button>

                        <p className="text-[11px] text-violet-500">Translations and simplifications stack — add French, then Spanish, then a 3rd grade version, all in one document. Each appears as a new section. Use "Full Pipeline" to feed into AlloFlow's complete differentiation system.</p>
                      </div>
                      <div className="flex gap-2">
                        {callTTS && <button id="pdf-audio-dl-btn" onClick={async () => {
                          const btn = document.getElementById('pdf-audio-dl-btn');
                          const temp = document.createElement('div'); temp.innerHTML = pdfFixResult.accessibleHtml;
                          const fullText = (temp.textContent || '').trim();
                          if (!fullText) { addToast('No text content to convert', 'error'); return; }
                          const segments = [];
                          let remaining = fullText;
                          while (remaining.length > 0) {
                            if (remaining.length <= 600) { segments.push(remaining); break; }
                            let splitAt = remaining.lastIndexOf('. ', 600);
                            if (splitAt < 200) splitAt = remaining.indexOf('. ', 400);
                            if (splitAt < 0 || splitAt > 800) splitAt = 500; else splitAt += 2;
                            segments.push(remaining.substring(0, splitAt));
                            remaining = remaining.substring(splitAt).trim();
                          }
                          if (btn) btn.textContent = '⏳ 0/' + segments.length + '...';
                          if (btn) btn.disabled = true;
                          addToast('🎧 Generating ' + segments.length + ' audio segments...', 'info');
                          const audioBlobs = [];
                          let failed = 0;
                          for (let si = 0; si < segments.length; si++) {
                            if (btn) btn.textContent = '⏳ ' + (si + 1) + '/' + segments.length + '...';
                            try {
                              const url = await callTTS(segments[si], selectedVoice || 'Puck', 1, 1);
                              if (url) {
                                if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) {
                                  const resp = await fetch(url);
                                  audioBlobs.push(await resp.blob());
                                } else {
                                  warnLog('[Audio DL] Unexpected TTS return type:', typeof url);
                                  failed++;
                                }
                              } else { failed++; }
                            } catch(e) {
                              warnLog('[Audio DL] Segment ' + (si+1) + ' failed:', e?.message || e);
                              failed++;
                              if (e?.message?.includes('429') || e?.message?.includes('Rate')) {
                                addToast('⚠️ Rate limited — got ' + audioBlobs.length + ' of ' + segments.length + ' segments', 'info');
                                break;
                              }
                            }
                          }
                          if (btn) { btn.textContent = '🎧 Download Audio'; btn.disabled = false; }
                          if (audioBlobs.length === 0) { addToast('Audio generation failed — TTS may not be available. Try with a Gemini API key.', 'error'); return; }
                          const combined = new Blob(audioBlobs, { type: audioBlobs[0].type || 'audio/wav' });
                          const dlUrl = URL.createObjectURL(combined);
                          const a = document.createElement('a');
                          a.href = dlUrl;
                          a.download = (pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '') + '-audio.' + (audioBlobs[0].type?.includes('mp3') ? 'mp3' : 'wav');
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          URL.revokeObjectURL(dlUrl);
                          addToast('🎧 Audio downloaded! ' + audioBlobs.length + '/' + segments.length + ' sections' + (failed > 0 ? ' (' + failed + ' failed)' : ''), 'success');
                        }} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors disabled:opacity-50">
                          🎧 Download Audio
                        </button>}
                      </div>

                      {/* ── Remediation Changelog ── */}
                      <details className="group">
                        <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">
                          📋 What Changed <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                        </summary>
                        <div className="mt-2 bg-white rounded-lg border border-slate-400 p-3 space-y-1.5 text-xs text-slate-600">
                          {(() => {
                            const changes = [];
                            if (pdfFixResult.autoFixPasses > 0) changes.push(`🔧 ${pdfFixResult.autoFixPasses} automated fix pass${pdfFixResult.autoFixPasses > 1 ? 'es' : ''} applied`);
                            const html = pdfFixResult.accessibleHtml || '';
                            if (html.includes('lang="en"') || html.includes("lang='en'")) changes.push('🌐 Document language tag added (lang="en")');
                            if (html.includes('<main')) changes.push('🏛️ Main content landmark added');
                            if (html.includes('skip-nav') || html.includes('Skip to')) changes.push('⏭️ Skip-to-content navigation link added');
                            const h1s = (html.match(/<h1[\s>]/g) || []).length;
                            const h2s = (html.match(/<h2[\s>]/g) || []).length;
                            if (h1s > 0) changes.push(`📑 Heading hierarchy: ${h1s} h1, ${h2s} h2${html.match(/<h3[\s>]/g) ? ', ' + (html.match(/<h3[\s>]/g) || []).length + ' h3' : ''}`);
                            const alts = (html.match(/alt="[^"]+"/g) || []).length;
                            if (alts > 0) changes.push(`🖼️ ${alts} image${alts > 1 ? 's' : ''} with alt text`);
                            const ths = (html.match(/<th[\s>]/g) || []).length;
                            if (ths > 0) changes.push(`📊 ${ths} table header cell${ths > 1 ? 's' : ''} with scope attributes`);
                            if (html.includes('<caption')) changes.push('📊 Table caption(s) added');
                            if (html.includes('viewport')) changes.push('📱 Viewport meta tag for responsive design');
                            if (html.includes('forced-colors')) changes.push('🔲 Windows High Contrast Mode support');
                            if (html.includes('prefers-reduced-motion')) changes.push('♿ Reduced motion support');
                            const axeFixed = pdfFixResult.axeAudit ? `${pdfFixResult.axeAudit.totalViolations} axe violation${pdfFixResult.axeAudit.totalViolations !== 1 ? 's' : ''} remaining` : 'axe-core not available';
                            changes.push(`🔬 ${axeFixed}`);
                            const gain = (pdfFixResult.afterScore || 0) - (pdfFixResult.beforeScore || 0);
                            if (gain > 0) changes.push(`📈 Score improved by +${gain} points`);
                            return changes.map((c, i) => <div key={i} className="flex items-start gap-2"><span className="text-green-500 shrink-0">✓</span><span>{c}</span></div>);
                          })()}
                        </div>
                      </details>

                      {/* ── Plain Language Summary Generator ── */}
                      <details className="group">
                        <summary className="text-[11px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-800 transition-colors flex items-center gap-1">
                          📖 Plain Language Summary <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                        </summary>
                        <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-600 rounded-xl p-3 space-y-2">
                          <p className="text-[11px] text-slate-600">{t('pdf_audit.plain_summary.intro') || 'Generate an easy-to-read version for parents, guardians, or community members.'}</p>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] font-bold text-slate-600 uppercase">Language</label>
                              <input id="summary-lang" aria-label={t('pdf_audit.plain_summary.lang_aria') || 'Translation language'} list="summary-lang-list" className="w-full text-[11px] border border-blue-600 rounded-lg px-2 py-1.5 bg-white" placeholder="English" defaultValue="English" />
                              <datalist id="summary-lang-list">
                                <option value="English" /><option value="Spanish" /><option value="French" /><option value="Arabic" /><option value="Somali" /><option value="Vietnamese" /><option value="Portuguese" /><option value="Mandarin Chinese" /><option value="Haitian Creole" /><option value="Russian" />
                              </datalist>
                            </div>
                            <div className="w-20">
                              <label className="text-[11px] font-bold text-slate-600 uppercase">Level</label>
                              <select id="summary-level" className="w-full text-[11px] border border-blue-600 rounded-lg px-1 py-1.5 bg-white" defaultValue="5">
                                <option value="3">3rd</option><option value="5">5th</option><option value="8">8th</option><option value="adult">Adult</option>
                              </select>
                            </div>
                            <div className="w-20">
                              <label className="text-[11px] font-bold text-slate-600 uppercase">Length</label>
                              <select id="summary-length" className="w-full text-[11px] border border-blue-600 rounded-lg px-1 py-1.5 bg-white" defaultValue="medium">
                                <option value="brief">Brief</option><option value="medium">Medium</option><option value="detailed">Detailed</option>
                              </select>
                            </div>
                          </div>
                          <button onClick={async () => {
                            if (!callGemini || !pdfFixResult?.accessibleHtml) return;
                            const lang = document.getElementById('summary-lang')?.value || 'English';
                            const level = document.getElementById('summary-level')?.value || '5';
                            const length = document.getElementById('summary-length')?.value || 'medium';
                            const gradeLabel = level === 'adult' ? 'plain adult language' : `${level}th-grade reading level`;
                            const wordLimit = length === 'brief' ? 150 : length === 'detailed' ? 500 : 300;
                            addToast(`Generating ${lang} summary (${gradeLabel})...`, 'info');
                            try {
                              const text = pdfFixResult.accessibleHtml.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim().substring(0, 10000);
                              const summary = await callGemini(`You are a communication specialist who makes complex documents understandable for everyone.

Take this document content and create a PLAIN LANGUAGE SUMMARY.

OUTPUT LANGUAGE: ${lang}
READING LEVEL: ${gradeLabel} (Flesch-Kincaid Grade ${level === 'adult' ? '8-10' : level})
LENGTH: approximately ${wordLimit} words

RULES:
- Write entirely in ${lang}
- Use short sentences appropriate for ${gradeLabel}
- Replace jargon and technical terms with everyday words
- Use bullet points for key information
- Start with the equivalent of "This document is about..." in ${lang}
- Include a "What You Need to Know" section
- Include a "What You Can Do" section if applicable
- Be warm, respectful, and culturally sensitive — this is for real families
${lang !== 'English' ? '- Include a brief note at the bottom in English: "This summary was translated to ' + lang + ' from the original document."' : ''}

DOCUMENT CONTENT:
"""
${text}
"""

Return ONLY the plain language summary in ${lang}.`, false);
                              if (summary) {
                                const summaryHtml = summary.replace(/\n\n/g, '</p><p>').replace(/\n- /g, '</p><li>').replace(/\n/g, '<br>');
                                const dir = ['Arabic', 'Hebrew', 'Farsi', 'Persian', 'Urdu', 'Dari'].some(l => lang.includes(l)) ? 'rtl' : 'ltr';
                                const win = window.open('', '_blank');
                                if (win) {
                                  win.document.write(`<!DOCTYPE html><html lang="${lang === 'English' ? 'en' : lang.substring(0,2).toLowerCase()}" dir="${dir}"><head><meta charset="UTF-8"><title>Plain Language Summary — ${lang}</title><style>body{font-family:'Lexend',system-ui,sans-serif;max-width:600px;margin:2rem auto;padding:0 1.5rem;line-height:1.8;color:#1e293b;font-size:${level === '3' ? '18' : '16'}px;direction:${dir}}h1{color:#4f46e5;font-size:1.4rem;border-bottom:3px solid #6366f1;padding-bottom:0.5rem}h2{color:#4f46e5;font-size:1.1rem;margin-top:1.5rem}li{margin-bottom:0.5rem}p{margin-bottom:1rem}.badge{display:inline-flex;gap:6px;align-items:center;background:#e0e7ff;color:#4338ca;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:1rem}.footer{margin-top:2rem;padding-top:1rem;border-top:2px solid #e2e8f0;font-size:11px;color:#94a3b8}@media print{body{font-size:14px;max-width:100%}}</style></head><body><div class="badge">📖 ${lang} · ${gradeLabel}</div><h1>${lang === 'English' ? 'Easy-to-Read Summary' : 'Summary'}</h1><p>${summaryHtml}</p><div class="footer"><p>Source: ${pendingPdfFile?.name || 'document'} · Generated ${new Date().toLocaleDateString()} by AlloFlow</p><button onclick="window.print()" style="margin-top:8px;padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer">🖨️ Print</button></div></body></html>`);
                                  win.document.close();
                                  addToast(`📖 ${lang} summary generated!`, 'success');
                                }
                              }
                            } catch (e) { addToast('Summary generation failed', 'error'); }
                          }} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                            📖 Generate Summary
                          </button>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            )}

      {/* ── Close-audit confirm dialog ── */}
      {/* Three-way Save / Discard / Cancel prompt that fires from safeCloseAudit
          when the user clicks X, the backdrop, or Esc with audit work that
          hasn't been saved as a Project. Rendered as a top-level sibling so it
          layers above the audit modal (z-[210] vs z-[200]) without nesting. */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-labelledby="pdf-close-confirm-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCloseConfirm(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setShowCloseConfirm(false); } }}
          tabIndex={-1}
          ref={(el) => { if (el && !el.contains(document.activeElement)) { try { el.focus({ preventScroll: true }); } catch(_){ el.focus(); } } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-amber-300">
            <h3 id="pdf-close-confirm-title" className="text-lg font-bold text-slate-800 mb-2">{t('pdf_audit.close_confirm.title') || 'Close without saving?'}</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              This audit hasn't been saved as a <strong>Project</strong> file. If you close,
              your remediated HTML and audit results won't survive a browser reload.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={_discardAndCloseAudit}
                className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={_saveAndCloseAudit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                autoFocus
              >
                💾 {t('pdf_audit.close_confirm.save_close') || 'Save & close'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-4">
              Tip: <strong>Save & close</strong> downloads a <code className="px-1 bg-slate-100 rounded">.alloflow.json</code> project file
              that you can re-open later via the sidebar's <strong>Load Project</strong> button.
            </p>
          </div>
        </div>
      )}

      {/* ═══ PDF Preview & Edit Modal ═══ */}
      {pdfPreviewOpen && pdfFixResult && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-stretch" role="dialog" aria-modal="true" aria-label={t('pdf_audit.preview.modal_aria') || 'Accessible document preview and editor'}>
          <div className="flex flex-1 m-4 gap-0 animate-in fade-in duration-200">
            {/* Left panel: controls */}
            <div className="w-72 bg-white rounded-l-2xl border-2 border-r-0 border-indigo-600 p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-indigo-800">♿ Preview & Edit</h3>
                <button onClick={() => setPdfPreviewOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors" aria-label={t('pdf_audit.preview.close_aria') || 'Close preview'}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-[11px] text-slate-600">{t('pdf_audit.preview.edit_hint') || 'Click anywhere in the preview to edit text directly. Use the controls below to customize appearance.'}</p>

              {/* Style Seed picker — WCAG-validated styling */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">Style</div>
                <p className="text-[11px] text-slate-600 mb-1">{t('pdf_audit.preview.wcag_guaranteed') || 'WCAG compliance guaranteed — sanitizer runs on every style change.'}</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(STYLE_SEEDS).filter(([, s]) => s.cssVars || s.name === 'Match Original').map(([key, s]) => (
                    <button key={key} onClick={() => { setPdfPreviewTheme(key); setTimeout(() => updatePdfPreview(key), 50); }}
                      className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border transition-all text-left ${pdfPreviewTheme === key ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300' : 'border-slate-200 text-slate-600 hover:border-indigo-600'}`}>
                      {s.emoji} {s.name}{s.wcagLevel === 'AAA' ? ' ♿' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Style Studio — quick presets for remediation preview */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">✨ AI Restyle</div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {[
                    { label: '🎨 Beautify', prompt: 'Make this document visually stunning with a modern color scheme, elegant typography, subtle gradients, rounded section cards, and a cohesive design. Use a sophisticated palette.' },
                    { label: '🏫 Academic', prompt: 'Professional academic style: serif headings, navy/gold scheme, formal tables, proper margins, scholarly appearance for university submissions.' },
                    { label: '🌈 Kid-Friendly', prompt: 'Bright, playful style for elementary students. Rounded corners, fun colors (teal, coral, purple), larger friendly fonts, card-based layout with soft shadows.' },
                    { label: '🌙 Dark', prompt: 'Elegant dark mode: dark charcoal background, soft white text, indigo accents, subtle borders, beautiful contrast for screen reading.' },
                    { label: '🧊 Minimal', prompt: 'Ultra-minimal: whitespace, thin sans-serif, muted grays, one accent color, hairline borders, understated elegance.' },
                  ].map(preset => (
                    <button key={preset.label} disabled={isGeneratingStyle} onClick={async () => {
                      if (!callGemini) return;
                      setIsGeneratingStyle(true);
                      addToast('✨ Generating ' + preset.label.replace(/[^\w\s]/g, '').trim() + ' style...', 'info');
                      try {
                        const css = await callGemini(`You are a CSS expert. Create a beautiful, accessible stylesheet.\n\nThe user wants: "${preset.prompt}"\n\nTarget these elements: body, h1, h2, h3, h4, p, main, section, table, th, td, a, blockquote, figure, figcaption, header, footer, nav, ul, ol, li, img, code, pre.\n\nRequirements:\n- WCAG AA contrast (4.5:1 for text)\n- Min 12px font size\n- Include @import for Google Fonts if used\n- Include print styles (@media print)\n\nReturn ONLY CSS — no explanation, no markdown fences.`, true);
                        if (css && pdfPreviewRef.current?.contentDocument) {
                          const doc = pdfPreviewRef.current.contentDocument;
                          const old = doc.getElementById('ai-restyle'); if (old) old.remove();
                          const style = doc.createElement('style');
                          style.id = 'ai-restyle';
                          style.textContent = css.replace(/```[\s\S]*?```/g, '').replace(/^```\w*\n?/gm, '').replace(/\n?```$/gm, '').trim();
                          doc.head.appendChild(style);
                          try {
                            const fullHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
                            const sanitized = sanitizeStyleForWCAG(fullHtml);
                            if (sanitized.fixCount > 0) {
                              doc.documentElement.innerHTML = sanitized.html.replace(/^<!DOCTYPE html>\s*<html[^>]*>/i, '').replace(/<\/html>\s*$/i, '');
                              addToast(`✨ Style applied! (${sanitized.fixCount} contrast fixes auto-applied for WCAG AA)`, 'success');
                            } else {
                              addToast('✨ Style applied!', 'success');
                            }
                          } catch(sanitizeErr) {
                            addToast('✨ Style applied!', 'success');
                          }
                        }
                      } catch(err) { addToast('Style failed — try again', 'error'); }
                      setIsGeneratingStyle(false);
                    }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${isGeneratingStyle ? 'bg-indigo-100 text-indigo-400 animate-pulse' : 'bg-slate-50 border border-slate-400 text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700'}`}
                    >{isGeneratingStyle ? '⏳ Styling...' : preset.label}</button>
                  ))}
                  {pdfPreviewRef.current?.contentDocument?.getElementById('ai-restyle') && (
                    <button onClick={() => {
                      const old = pdfPreviewRef.current?.contentDocument?.getElementById('ai-restyle');
                      if (old) { old.remove(); addToast('AI style removed', 'info'); }
                    }} className="px-2 py-1 bg-red-50 border border-red-600 rounded-md text-[11px] font-bold text-red-500 hover:bg-red-100 transition-colors">✕ Reset</button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mb-2">{t('pdf_audit.preview.ai_restyle_hint') || 'One-click AI restyling. These override the theme above.'}</p>
              </div>

              {/* Reference document theme extraction */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">📎 Brand Match</div>
                <label className="w-full flex items-center gap-2 px-2 py-1.5 bg-white border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors">
                  📎 Upload brand reference (PDF, image, or logo)
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file || !callGeminiVision) return;
                    addToast('🎨 Extracting brand colors...', 'info');
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      try {
                        const base64 = ev.target.result.split(',')[1];
                        const mime = file.type.includes('pdf') ? 'application/pdf' : file.type || 'image/png';
                        const result = await callGeminiVision(
                          `Analyze this document/image and extract the brand color scheme and typography.\n\nReturn ONLY JSON:\n{"headingColor":"hex","accentColor":"hex","bgColor":"hex","textColor":"hex","headerBg":"hex or CSS gradient","headerText":"hex","tableBg":"hex","tableBorder":"hex","bodyFont":"CSS font-family string","headingFont":"CSS font-family string","extraCSS":"any additional CSS rules to match the brand style"}`,
                          base64, mime
                        );
                        let cleaned = result.trim();
                        if (cleaned.indexOf('```') !== -1) { const ps = cleaned.split('```'); cleaned = ps[1] || ps[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
                        const brand = JSON.parse(cleaned);
                        const doc = pdfPreviewRef.current?.contentDocument;
                        if (doc) {
                          const style = doc.createElement('style');
                          style.id = 'brand-theme';
                          const old = doc.getElementById('brand-theme'); if (old) old.remove();
                          style.textContent = `
                            body { font-family: ${brand.bodyFont || 'system-ui'}; color: ${brand.textColor || '#1e293b'}; background: ${brand.bgColor || '#fff'}; }
                            h1,h2,h3,h4 { font-family: ${brand.headingFont || brand.bodyFont || 'system-ui'}; color: ${brand.headingColor || '#1e3a5f'}; }
                            a { color: ${brand.accentColor || '#2563eb'}; }
                            th { background: ${brand.tableBg || brand.headerBg || '#f1f5f9'}; border-color: ${brand.tableBorder || '#cbd5e1'}; }
                            table { border-color: ${brand.tableBorder || '#cbd5e1'}; }
                            ${brand.extraCSS || ''}
                          `;
                          doc.head.appendChild(style);
                          addToast('🎨 Brand theme applied!', 'success');
                        }
                      } catch(err) { warnLog('[Brand] Extract failed:', err); addToast('Could not extract brand colors', 'error'); }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                </label>
              </div>

              {/* Manual color/font editor */}
              <details className="group">
                <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">
                  🎨 Custom Colors & Fonts <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                </summary>
                <div className="mt-1.5 space-y-1.5 bg-slate-50 rounded-lg p-2 border border-slate-400">
                  {[
                    { label: 'Heading Color', prop: 'headingColor', sel: 'h1,h2,h3,h4', css: 'color', def: '#1e3a5f', isText: true },
                    { label: 'Accent / Link', prop: 'accentColor', sel: 'a', css: 'color', def: '#2563eb', isText: true },
                    { label: 'Background', prop: 'bgColor', sel: 'body', css: 'backgroundColor', def: '#ffffff', isText: false },
                    { label: 'Table Header', prop: 'thBg', sel: 'th', css: 'backgroundColor', def: '#f1f5f9', isText: false },
                  ].map(item => (
                    <div key={item.prop} className="flex items-center gap-2">
                      <input type="color" defaultValue={item.def} aria-label={item.label}
                        onChange={(e) => {
                          const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                          doc.querySelectorAll(item.sel).forEach(el => { el.style[item.css] = e.target.value; });
                          if (item.isText) {
                            const hex = e.target.value.replace('#', '');
                            const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
                            const lum = 0.2126 * (r/255 <= 0.03928 ? r/255/12.92 : Math.pow((r/255+0.055)/1.055, 2.4)) + 0.7152 * (g/255 <= 0.03928 ? g/255/12.92 : Math.pow((g/255+0.055)/1.055, 2.4)) + 0.0722 * (b/255 <= 0.03928 ? b/255/12.92 : Math.pow((b/255+0.055)/1.055, 2.4));
                            const ratio = (1.05) / (lum + 0.05); // contrast vs white
                            const badge = e.target.parentElement?.querySelector('.contrast-badge');
                            if (badge) {
                              badge.textContent = ratio >= 4.5 ? '✅ ' + ratio.toFixed(1) + ':1' : '⚠️ ' + ratio.toFixed(1) + ':1';
                              badge.style.color = ratio >= 4.5 ? '#16a34a' : '#dc2626';
                            }
                          }
                        }}
                        className="w-6 h-6 rounded border border-slate-400 cursor-pointer p-0" />
                      <span className="text-[11px] text-slate-600">{item.label}</span>
                      {item.isText && <span className="contrast-badge text-[11px] font-bold" style={{color: '#16a34a'}}>✅ 4.5+:1</span>}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <select aria-label={t('pdf_audit.preview.body_font_aria') || 'Body font'} defaultValue="system-ui"
                      onChange={(e) => {
                        const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                        doc.body.style.fontFamily = e.target.value;
                        const fontMap = {
                          "'Inter', sans-serif": 'Inter:wght@400;600;700',
                          "'Atkinson Hyperlegible', sans-serif": 'Atkinson+Hyperlegible:wght@400;700',
                          "'Lexend', sans-serif": 'Lexend:wght@400;500;700',
                        };
                        const gFont = fontMap[e.target.value];
                        if (gFont) {
                          const existing = doc.getElementById('preview-google-font');
                          if (existing) existing.remove();
                          const link = doc.createElement('link');
                          link.id = 'preview-google-font';
                          link.rel = 'stylesheet';
                          link.href = `https://fonts.googleapis.com/css2?family=${gFont}&display=swap`;
                          doc.head.appendChild(link);
                        }
                        if (e.target.value.includes('OpenDyslexic')) {
                          const existing = doc.getElementById('preview-opendyslexic');
                          if (!existing) {
                            const style = doc.createElement('style');
                            style.id = 'preview-opendyslexic';
                            style.textContent = `@font-face { font-family: 'OpenDyslexic'; src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff'); font-weight: normal; } @font-face { font-family: 'OpenDyslexic'; src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff'); font-weight: bold; }`;
                            doc.head.appendChild(style);
                          }
                        }
                      }}
                      className="flex-1 text-[11px] border border-slate-400 rounded px-1 py-1 bg-white">
                      <option value="system-ui, sans-serif">{t('pdf_audit.preview.font_system') || 'System (Default)'}</option>
                      <option value="'Inter', sans-serif">Inter</option>
                      <option value="'Georgia', serif">{t('pdf_audit.preview.font_georgia') || 'Georgia (Serif)'}</option>
                      <option value="'Times New Roman', serif">{t('pdf_audit.preview.font_times_new') || 'Times New Roman'}</option>
                      <option value="'Atkinson Hyperlegible', sans-serif">{t('pdf_audit.preview.font_atkinson_hyper') || 'Atkinson Hyperlegible'}</option>
                      <option value="'OpenDyslexic', sans-serif">OpenDyslexic</option>
                      <option value="'Lexend', sans-serif">Lexend</option>
                      <option value="'Comic Sans MS', cursive">{t('pdf_audit.preview.font_comic_short') || 'Comic Sans'}</option>
                      <option value="'Courier New', monospace">{t('pdf_audit.preview.font_courier') || 'Courier (Mono)'}</option>
                    </select>
                    <span className="text-[11px] text-slate-600 shrink-0">Font</span>
                  </div>
                </div>
              </details>

              {/* Font size */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">Font Size: {pdfPreviewFontSize}px</div>
                <input type="range" min="12" max="28" value={pdfPreviewFontSize}
                  onChange={(e) => { const v = parseInt(e.target.value); setPdfPreviewFontSize(v); setTimeout(() => updatePdfPreview(undefined, v), 50); }}
                  className="w-full" aria-label={t('pdf_audit.preview.font_size_aria') || 'Font size'} />
                <div className="flex justify-between text-[11px] text-slate-600"><span>12px</span><span>28px</span></div>
              </div>

              {/* Word Art — ported from the export-preview builder. Same UI, but inserts
                  into the remediation preview iframe (pdfPreviewRef) instead of the export
                  iframe (exportPreviewRef). The renderer still comes from window.AlloWordArt
                  so the output markup is byte-identical across both builders. */}
              <details className="group">
                <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1 cursor-pointer hover:text-indigo-600 transition-colors list-none flex items-center justify-between">
                  <span>✨ Word Art</span>
                  <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                  <span className="text-[11px] text-slate-600 hidden group-open:inline">▾</span>
                </summary>
                <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg border border-amber-600 p-2 space-y-2 mt-2">
                  <input type="text" id="pdf-wordart-text-input" placeholder={t('pdf_audit.wordart.text_placeholder') || 'Your word art text...'} defaultValue="" className="w-full text-xs border border-amber-300 rounded px-2 py-1.5 bg-white focus:border-amber-500 outline-none" aria-label={t('pdf_audit.wordart.text_aria') || 'Word art text'} />
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Style</div>
                    <div className="grid grid-cols-3 gap-1" role="radiogroup">
                      {[['goldFoil','✨','Gold'],['neonGlow','💡','Neon'],['retroArcade','🕹️','Retro'],['chalkboard','🖍️','Chalk'],['embossed','🏛️','3D'],['rainbow','🌈','Rainbow']].map(([key, emoji, label], i) => (
                        <button key={key} data-preset={key} aria-checked={i === 0 ? 'true' : 'false'} role="radio" aria-label={label + ' style'}
                          style={i === 0 ? { background: '#fde68a', color: '#78350f', borderColor: '#f59e0b' } : { background: 'white', borderColor: '#fcd34d' }}
                          className="pdf-wordart-preset-btn text-[10px] font-bold py-1.5 px-1 rounded-md border text-slate-700 transition-all"
                          onClick={(e) => {
                            const btn = e.currentTarget;
                            const parent = btn.parentElement;
                            parent.querySelectorAll('.pdf-wordart-preset-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.style.background = 'white'; b.style.color = ''; b.style.borderColor = '#fcd34d'; });
                            btn.setAttribute('aria-checked', 'true');
                            btn.style.background = '#fde68a'; btn.style.color = '#78350f'; btn.style.borderColor = '#f59e0b';
                          }}
                        >{emoji} {label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Size</div>
                      <div className="flex gap-0.5" role="radiogroup">
                        {[['S','S'],['M','M'],['L','L'],['XL','XL']].map(([key, label], i) => (
                          <button key={key} data-size={key} aria-checked={i === 2 ? 'true' : 'false'} role="radio" aria-label={label + ' size'}
                            style={i === 2 ? { background: '#6366f1', color: 'white', borderColor: '#4f46e5' } : { background: 'white', color: '#475569', borderColor: '#e2e8f0' }}
                            className="pdf-wordart-size-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all"
                            onClick={(e) => {
                              const btn = e.currentTarget;
                              const parent = btn.parentElement;
                              parent.querySelectorAll('.pdf-wordart-size-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0'; });
                              btn.setAttribute('aria-checked', 'true');
                              btn.style.background = '#6366f1'; btn.style.color = 'white'; btn.style.borderColor = '#4f46e5';
                            }}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Align</div>
                      <div className="flex gap-0.5" role="radiogroup">
                        {[['left','⇤','Left'],['center','⇔','Center'],['right','⇥','Right']].map(([key, icon, label], i) => (
                          <button key={key} data-align={key} aria-checked={i === 1 ? 'true' : 'false'} role="radio" aria-label={label + ' alignment'}
                            style={i === 1 ? { background: '#6366f1', color: 'white', borderColor: '#4f46e5' } : { background: 'white', color: '#475569', borderColor: '#e2e8f0' }}
                            className="pdf-wordart-align-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all"
                            onClick={(e) => {
                              const btn = e.currentTarget;
                              const parent = btn.parentElement;
                              parent.querySelectorAll('.pdf-wordart-align-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0'; });
                              btn.setAttribute('aria-checked', 'true');
                              btn.style.background = '#6366f1'; btn.style.color = 'white'; btn.style.borderColor = '#4f46e5';
                            }}
                          >{icon}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const iframe = pdfPreviewRef.current;
                      const doc = iframe?.contentDocument;
                      if (!doc) { addToast('Preview not ready yet', 'error'); return; }
                      const textInput = document.getElementById('pdf-wordart-text-input');
                      const text = textInput?.value?.trim();
                      if (!text) { addToast('Please enter word art text first', 'info'); return; }
                      const presetBtn = document.querySelector('.pdf-wordart-preset-btn[aria-checked="true"]');
                      const sizeBtn = document.querySelector('.pdf-wordart-size-btn[aria-checked="true"]');
                      const alignBtn = document.querySelector('.pdf-wordart-align-btn[aria-checked="true"]');
                      const preset = presetBtn?.getAttribute('data-preset') || 'goldFoil';
                      const size = sizeBtn?.getAttribute('data-size') || 'L';
                      const align = alignBtn?.getAttribute('data-align') || 'center';
                      let html;
                      if (window.AlloWordArt && typeof window.AlloWordArt.render === 'function') {
                        html = window.AlloWordArt.render(text, preset, size, align);
                      } else {
                        const P = {
                          goldFoil: 'background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;text-shadow:2px 2px 0 rgba(120,53,15,0.15);',
                          neonGlow: 'color:#e879f9;font-weight:900;text-shadow:0 0 8px #d946ef,0 0 16px #c026d3,0 0 24px #a21caf;',
                          retroArcade: 'color:#fbbf24;font-weight:900;text-shadow:3px 3px 0 #ef4444,6px 6px 0 #a16207;letter-spacing:0.05em;',
                          chalkboard: 'color:#fef3c7;font-weight:900;font-family:\'Comic Sans MS\',cursive;text-shadow:2px 2px 4px rgba(0,0,0,0.3);',
                          embossed: 'color:#475569;font-weight:900;text-shadow:1px 1px 0 #94a3b8,2px 2px 0 #64748b,3px 3px 6px rgba(0,0,0,0.3);',
                          rainbow: 'background:linear-gradient(90deg,#dc2626 0%,#ea580c 17%,#ca8a04 33%,#16a34a 50%,#0891b2 67%,#4f46e5 83%,#9333ea 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;'
                        };
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
              </details>

              {/* A11y Inspect toggle */}
              <button onClick={() => { const next = !pdfPreviewA11yInspect; setPdfPreviewA11yInspect(next); setTimeout(() => updatePdfPreview(undefined, undefined, next), 50); }}
                className={`w-full px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${pdfPreviewA11yInspect ? 'bg-violet-100 border-violet-400 text-violet-800' : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                🔍 A11y Inspect {pdfPreviewA11yInspect ? 'ON' : 'OFF'}
              </button>
              {pdfPreviewA11yInspect && (
                <div className="text-[11px] text-slate-600 space-y-0.5 bg-slate-50 rounded-lg p-2">
                  <div><span className="inline-block w-3 h-2 bg-violet-600 rounded mr-1"></span> {t('pdf_audit.a11y_inspect.headings') || 'Headings (H1-H6)'}</div>
                  <div><span className="inline-block w-3 h-2 bg-blue-600 rounded mr-1"></span> {t('pdf_audit.a11y_inspect.images') || 'Images + alt text'}</div>
                  <div><span className="inline-block w-3 h-2 bg-emerald-600 rounded mr-1"></span> {t('pdf_audit.a11y_inspect.tables') || 'Tables + headers'}</div>
                  <div><span className="inline-block w-3 h-2 bg-cyan-600 rounded mr-1"></span> {t('pdf_audit.a11y_inspect.figures') || 'Figures + captions'}</div>
                  <div><span className="inline-block w-3 h-2 bg-green-600 rounded mr-1"></span> {t('pdf_audit.a11y_inspect.main_landmark') || 'Main landmark'}</div>
                  <div><span className="inline-block w-3 h-2 bg-orange-600 rounded mr-1"></span> {t('pdf_audit.a11y_inspect.aria_roles') || 'ARIA roles'}</div>
                </div>
              )}

              {/* Screen Reader Simulator */}
              <button onClick={() => {
                const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                const existing = doc.getElementById('sr-simulator-panel');
                if (existing) { existing.remove(); return; }
                const announcements = [];
                const walk = (el) => {
                  if (!el || el.nodeType !== 1) return;
                  const tag = el.tagName?.toLowerCase();
                  const role = el.getAttribute('role');
                  const ariaLabel = el.getAttribute('aria-label');
                  if (el.getAttribute('aria-hidden') === 'true') return;
                  if (tag === 'main') announcements.push({ type: 'landmark', text: '📍 Main content landmark' });
                  if (tag === 'nav') announcements.push({ type: 'landmark', text: '📍 Navigation: ' + (ariaLabel || 'navigation') });
                  if (tag === 'header') announcements.push({ type: 'landmark', text: '📍 Header landmark' + (ariaLabel ? ': ' + ariaLabel : '') });
                  if (tag === 'footer') announcements.push({ type: 'landmark', text: '📍 Footer landmark' + (ariaLabel ? ': ' + ariaLabel : '') });
                  if (tag === 'aside') announcements.push({ type: 'landmark', text: '📍 Complementary (aside)' + (ariaLabel ? ': ' + ariaLabel : '') });
                  if (tag === 'form') announcements.push({ type: 'landmark', text: '📍 Form landmark' + (ariaLabel ? ': ' + ariaLabel : '') });
                  if (tag === 'section' && ariaLabel) announcements.push({ type: 'landmark', text: '📍 Region: ' + ariaLabel });
                  if (tag === 'h1') announcements.push({ type: 'heading', text: '📢 Heading level 1: ' + el.textContent.trim() });
                  if (tag === 'h2') announcements.push({ type: 'heading', text: '📢 Heading level 2: ' + el.textContent.trim() });
                  if (tag === 'h3') announcements.push({ type: 'heading', text: '📢 Heading level 3: ' + el.textContent.trim() });
                  if (tag === 'h4') announcements.push({ type: 'heading', text: '📢 Heading level 4: ' + el.textContent.trim() });
                  if (tag === 'h5') announcements.push({ type: 'heading', text: '📢 Heading level 5: ' + el.textContent.trim() });
                  if (tag === 'h6') announcements.push({ type: 'heading', text: '📢 Heading level 6: ' + el.textContent.trim() });
                  if (tag === 'p' && el.textContent.trim()) announcements.push({ type: 'text', text: el.textContent.trim().substring(0, 200) + (el.textContent.length > 200 ? '...' : '') });
                  if (tag === 'img') announcements.push({ type: 'image', text: '🖼️ Image: ' + (el.getAttribute('alt') || 'no alt text ⚠️') });
                  if (tag === 'figure') { const cap = el.querySelector('figcaption'); if (cap) announcements.push({ type: 'figure', text: '🖼️ Figure: ' + cap.textContent.trim().substring(0, 150) }); return; }
                  if (tag === 'table') { const cap = el.querySelector('caption'); announcements.push({ type: 'table', text: '📊 Table' + (cap ? ': ' + cap.textContent.trim() : '') + ' — ' + el.querySelectorAll('tr').length + ' rows' }); return; }
                  if (tag === 'a') { announcements.push({ type: 'link', text: '🔗 Link: ' + el.textContent.trim() + (el.href ? ' → ' + el.href.substring(0, 50) : '') }); return; }
                  if (tag === 'ul' || tag === 'ol') { announcements.push({ type: 'list', text: '📋 ' + (tag === 'ol' ? 'Numbered' : 'Bulleted') + ' list: ' + el.querySelectorAll('li').length + ' items' }); el.querySelectorAll('li').forEach(li => { announcements.push({ type: 'listitem', text: '  • ' + li.textContent.trim().substring(0, 100) }); }); return; }
                  if (tag === 'dl') {
                    announcements.push({ type: 'list', text: '📋 Definition list: ' + el.querySelectorAll('dt').length + ' term(s)' });
                    const pairs = [];
                    let curTerm = null;
                    for (const child of el.children) {
                      if (child.tagName === 'DT') curTerm = child.textContent.trim();
                      else if (child.tagName === 'DD' && curTerm) { pairs.push({ term: curTerm, def: child.textContent.trim() }); curTerm = null; }
                    }
                    pairs.forEach(p => announcements.push({ type: 'listitem', text: '  • Term: ' + p.term.substring(0, 60) + ' — ' + p.def.substring(0, 80) }));
                    return;
                  }
                  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
                    const id = el.getAttribute('id');
                    let label = ariaLabel || '';
                    if (!label && id) {
                      const lab = doc.querySelector('label[for="' + (id || '').replace(/"/g, '\\"') + '"]');
                      if (lab) label = lab.textContent.trim();
                    }
                    if (!label) {
                      const wrap = el.closest('label');
                      if (wrap) label = wrap.textContent.trim();
                    }
                    const typeLabel = tag === 'input' ? ('Input ' + (el.getAttribute('type') || 'text')) : (tag === 'select' ? 'Dropdown' : 'Text area');
                    announcements.push({ type: 'interactive', text: '✍️ ' + typeLabel + ': ' + (label || 'unlabeled ⚠️') });
                  }
                  if (tag === 'button') announcements.push({ type: 'interactive', text: '🔘 Button: ' + (ariaLabel || el.textContent.trim()) });
                  Array.from(el.children).forEach(walk);
                };
                walk(doc.querySelector('main') || doc.body);
                const panel = doc.createElement('div');
                panel.id = 'sr-simulator-panel';
                panel.style.cssText = 'position:fixed;top:0;right:0;width:350px;height:100vh;background:rgba(15,23,42,0.97);color:#e2e8f0;overflow-y:auto;z-index:99999;padding:16px;font-family:monospace;font-size:12px;line-height:1.6;border-left:3px solid #7c3aed;';
                window._srAnnouncements = announcements;
                panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #334155"><strong style="color:#a78bfa;font-size:14px">🔊 Screen Reader View</strong><div><button id="sr-read-all" style="background:#7c3aed;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;margin-right:4px">▶ Read All</button><button id="sr-stop" style="background:#334155;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;margin-right:4px">⏹ Stop</button><button onclick="this.closest(\'#sr-simulator-panel\').remove()" style="background:#334155;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">✕</button></div></div>'
                  + '<div style="font-size:10px;color:#94a3b8;margin-bottom:8px">Click any item to hear it. "Read All" reads the entire document as a screen reader would.</div>'
                  + announcements.map((a, idx) => {
                    const colors = { landmark: '#a78bfa', heading: '#f59e0b', text: '#94a3b8', image: '#38bdf8', figure: '#38bdf8', table: '#34d399', link: '#60a5fa', list: '#fb923c', listitem: '#94a3b8', interactive: '#f472b6' };
                    return '<div data-sr-idx="' + idx + '" style="padding:4px 6px;border-bottom:1px solid #1e293b;color:' + (colors[a.type] || '#e2e8f0') + ';cursor:pointer;border-radius:4px" onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\'none\'">' + a.text + '</div>';
                  }).join('')
                  + '<div style="margin-top:12px;padding:8px;background:#1e293b;border-radius:6px;font-size:10px;color:#64748b">Total: ' + announcements.length + ' announcements | ' + announcements.filter(a => a.type === 'heading').length + ' headings | ' + announcements.filter(a => a.type === 'image' || a.type === 'figure').length + ' images | ' + announcements.filter(a => a.type === 'table').length + ' tables | ' + announcements.filter(a => a.type === 'link').length + ' links | ' + announcements.filter(a => a.type === 'landmark').length + ' landmarks | ' + announcements.filter(a => a.type === 'interactive').length + ' interactive</div>';
                doc.body.appendChild(panel);
                panel.addEventListener('click', (e) => {
                  const idx = e.target.closest('[data-sr-idx]')?.getAttribute('data-sr-idx');
                  if (idx !== null && idx !== undefined && callTTS && window._srAnnouncements) {
                    const a = window._srAnnouncements[parseInt(idx)];
                    if (a) {
                      // callTTS resolves to a blob URL; the audio only plays if we
                      // wrap it in <audio> and call .play(). Returning the URL alone
                      // (the prior code) silently discards it.
                      Promise.resolve(callTTS(a.text)).then(url => {
                        if (!url) return;
                        const audio = new Audio(url);
                        const revoke = () => { try { URL.revokeObjectURL(url); } catch(_) {} };
                        audio.addEventListener('ended', revoke);
                        audio.addEventListener('error', revoke);
                        audio.play().catch(() => {});
                      }).catch(() => {});
                    }
                  }
                });
                const readAllBtn = doc.getElementById('sr-read-all');
                const stopBtn = doc.getElementById('sr-stop');
                if (readAllBtn && callTTS) {
                  let reading = false;
                  let stopRequested = false;
                  let currentAudio = null;
                  readAllBtn.onclick = async () => {
                    if (reading) return;
                    reading = true; stopRequested = false;
                    readAllBtn.textContent = '▶ Reading...';
                    readAllBtn.style.background = '#16a34a';
                    for (let i = 0; i < announcements.length; i++) {
                      if (stopRequested) break;
                      const items = panel.querySelectorAll('[data-sr-idx]');
                      items.forEach(el => el.style.background = 'none');
                      if (items[i]) { items[i].style.background = '#7c3aed33'; items[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                      // callTTS returns a blob URL; wrap in <audio> + await ended.
                      // Without this the URL is discarded and the sim runs silent.
                      let url = null;
                      try { url = await callTTS(announcements[i].text); } catch(e) { warnLog && warnLog('[pdf-audit announcement] callTTS failed for item ' + i + ':', e); }
                      if (stopRequested) { if (url) { try { URL.revokeObjectURL(url); } catch(_) {} } break; }
                      if (url) {
                        await new Promise(resolve => {
                          const audio = new Audio(url);
                          currentAudio = audio;
                          const done = () => { try { URL.revokeObjectURL(url); } catch(_) {} currentAudio = null; resolve(); };
                          audio.addEventListener('ended', done);
                          audio.addEventListener('error', done);
                          audio.play().catch(done);
                        });
                      }
                      if (!stopRequested) await new Promise(r => setTimeout(r, 300));
                    }
                    reading = false;
                    readAllBtn.textContent = '▶ Read All';
                    readAllBtn.style.background = '#7c3aed';
                    panel.querySelectorAll('[data-sr-idx]').forEach(el => el.style.background = 'none');
                  };
                  if (stopBtn) stopBtn.onclick = () => {
                    stopRequested = true;
                    if (currentAudio) { try { currentAudio.pause(); } catch(_) {} }
                  };
                }
                addToast('Screen reader view opened — shows what assistive technology announces', 'info');
              }} className={`w-full px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700`}>
                🔊 Screen Reader Simulator
              </button>

              {/* Image generation tools */}
              {callImagen && (
                <details className="group">
                  <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">
                    🖼️ AI Image Tools <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                  </summary>
                  <div className="mt-1.5 space-y-2 bg-slate-50 rounded-lg p-2 border border-slate-400">
                    <div>
                      <input type="text" id="pdf-preview-img-prompt" placeholder={t('pdf_audit.ai_image.prompt_placeholder') || 'Describe an image to generate...'}
                        aria-label={t('pdf_audit.ai_image.prompt_aria') || 'Image generation prompt'}
                        className="w-full text-[11px] p-1.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
                        onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('pdf-preview-gen-img-btn')?.click(); }} />
                      <button id="pdf-preview-gen-img-btn" onClick={async () => {
                        const prompt = document.getElementById('pdf-preview-img-prompt')?.value;
                        if (!prompt?.trim()) return;
                        addToast('🎨 Generating image...', 'info');
                        try {
                          const imgUrl = await callImagen(prompt + ' Professional, clean, educational illustration. No text.', 400, 0.85);
                          if (imgUrl) {
                            const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                            const figure = doc.createElement('figure');
                            figure.style.cssText = 'margin:1em 0;text-align:center;';
                            const img = doc.createElement('img');
                            img.src = imgUrl; img.alt = prompt; img.style.cssText = 'max-width:100%;border-radius:8px;';
                            const cap = doc.createElement('figcaption');
                            cap.textContent = prompt; cap.style.cssText = 'font-size:0.85em;color:#64748b;font-style:italic;margin-top:0.25rem;';
                            figure.appendChild(img); figure.appendChild(cap);
                            const sel = doc.getSelection();
                            if (sel && sel.rangeCount > 0) {
                              const range = sel.getRangeAt(0); range.collapse(false); range.insertNode(figure);
                            } else {
                              (doc.querySelector('main') || doc.body).appendChild(figure);
                            }
                            addToast('🎨 Image inserted!', 'success');
                            document.getElementById('pdf-preview-img-prompt').value = '';
                          }
                        } catch(e) { addToast('Image generation failed', 'error'); }
                      }} className="w-full mt-1 px-2 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold hover:bg-indigo-200 transition-colors">
                        ✨ Generate & Insert
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">{t('pdf_audit.ai_image.select_hint') || 'Click an image in the preview to select it, then:'}</p>
                    <button onClick={async () => {
                      const img = selectedPreviewImgRef.current;
                      if (!img || !img.src) { addToast('Click an image in the preview to select it first', 'info'); return; }
                      if (!callGeminiImageEdit) { addToast('Image editing not available in this build', 'error'); return; }
                      const editPrompt = window.prompt('Describe how to edit this image:');
                      if (!editPrompt?.trim()) return;
                      addToast('🎨 Editing image...', 'info');
                      try {
                        let base64 = null;
                        if (img.src.startsWith('data:')) {
                          base64 = img.src.split(',')[1];
                        } else {
                          try {
                            const resp = await fetch(img.src);
                            const blob = await resp.blob();
                            base64 = await new Promise((resolve, reject) => {
                              const fr = new FileReader();
                              fr.onload = () => { const s = String(fr.result || ''); resolve(s.includes(',') ? s.split(',')[1] : null); };
                              fr.onerror = () => reject(fr.error);
                              fr.readAsDataURL(blob);
                            });
                          } catch(fetchErr) { addToast('Cannot read this image (likely CORS-blocked). Try an AI-generated image.', 'error'); return; }
                        }
                        if (!base64) { addToast('Cannot extract image data', 'error'); return; }
                        const edited = await callGeminiImageEdit(editPrompt + ' No text.', base64, 400, 0.85);
                        if (edited) { img.src = edited; addToast('🎨 Image updated!', 'success'); }
                        else { addToast('Image edit returned no result', 'error'); }
                      } catch(e) { warnLog('[Image Edit] failed:', e); addToast('Image edit failed: ' + (e?.message || 'unknown error'), 'error'); }
                    }} className="w-full px-2 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-[11px] font-bold hover:bg-violet-200 transition-colors">
                      ✏️ Edit Selected Image (AI)
                    </button>
                  </div>
                </details>
              )}

              {/* Layout & Design Tools */}
              <details className="group">
                <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">
                  📐 Layout & Design <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                </summary>
                <div className="mt-1.5 space-y-1.5 bg-slate-50 rounded-lg p-2 border border-slate-400">
                  <div className="text-[11px] font-bold text-slate-600 uppercase">{t('pdf_audit.layout.insert_blocks') || 'Insert Blocks'}</div>
                  {(() => {
                    // ── Stylesheet injected once into the iframe doc ──
                    // Class-based (no inline color) so accessibility templates can override.
                    const _ALLO_BLOCKS_CSS = `
                      .allo-block { position: relative; margin: 12px 0; border-radius: 8px; }
                      .allo-block:focus, .allo-block:focus-within { outline: 2px solid #6366f1; outline-offset: 2px; }
                      .allo-callout { padding: 12px 16px; border-left: 4px solid; }
                      .allo-callout-info { background: #eff6ff; border-color: #3b82f6; }
                      .allo-callout-info > strong { color: #1e40af; }
                      .allo-callout-warning { background: #fef3c7; border-color: #f59e0b; }
                      .allo-callout-warning > strong { color: #92400e; }
                      .allo-callout-success { background: #f0fdf4; border-color: #22c55e; }
                      .allo-callout-success > strong { color: #166534; }
                      .allo-callout-note { background: #faf5ff; border-color: #a855f7; }
                      .allo-callout-note > strong { color: #6b21a8; }
                      .allo-callout-danger { background: #fef2f2; border-color: #dc2626; }
                      .allo-callout-danger > strong { color: #991b1b; }
                      .allo-block-quote { border-left: 4px solid #a78bfa; padding: 12px 16px; background: #f5f3ff; border-radius: 0 8px 8px 0; font-style: italic; color: #4c1d95; }
                      .allo-block-quote cite { font-size: 0.85em; color: #6d28d9; font-style: normal; display: block; margin-top: 6px; }
                      .allo-block-columns { display: grid; gap: 16px; }
                      .allo-block-columns > .allo-col { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; min-width: 0; }
                      .allo-block-divider hr { border: none; border-top: 2px solid #e2e8f0; margin: 0; }
                      .allo-block-pagebreak { page-break-before: always; border-top: 2px dashed #cbd5e1; padding-top: 8px; text-align: center; }
                      .allo-block-pagebreak .allo-pb-label { font-size: 10px; color: #475569; background: white; padding: 0 8px; }
                      .allo-block-checklist { list-style: none; padding: 0; margin: 0; }
                      .allo-block-checklist li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
                      .allo-block-checklist input[type='checkbox'] { width: 18px; height: 18px; accent-color: #6366f1; flex-shrink: 0; }
                      .allo-block-checklist label { flex: 1; cursor: pointer; }
                      .allo-block-checklist[data-list-style='ordered'] { list-style: decimal inside; padding-left: 8px; }
                      .allo-block-checklist[data-list-style='ordered'] li { display: list-item; border-bottom: 1px solid #f1f5f9; padding: 6px 0 6px 4px; }
                      .allo-block-checklist[data-list-style='ordered'] input { display: none; }
                      .allo-block-checklist[data-list-style='bullet'] { list-style: disc inside; padding-left: 8px; }
                      .allo-block-checklist[data-list-style='bullet'] li { display: list-item; border-bottom: 1px solid #f1f5f9; padding: 6px 0 6px 4px; }
                      .allo-block-checklist[data-list-style='bullet'] input { display: none; }
                      .allo-block-table table, .allo-block-rubric table { width: 100%; border-collapse: collapse; font-size: 14px; }
                      .allo-block-table caption, .allo-block-rubric caption { font-weight: 700; font-size: 13px; text-align: left; padding: 8px 0; color: #1e293b; }
                      .allo-block-table th { padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; background: #f1f5f9; color: #1e293b; }
                      .allo-block-table[data-header-style='dark'] th { background: #1e293b; color: white; }
                      .allo-block-table[data-header-style='accent'] th { background: #4338ca; color: white; }
                      .allo-block-table[data-header-style='minimal'] th { background: transparent; border-bottom: 2px solid #1e293b; }
                      .allo-block-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
                      .allo-block-table[data-zebra='on'] tbody tr:nth-child(even) td { background: #f9fafb; }
                      .allo-block-table[data-zebra='off'] tbody tr:nth-child(even) td { background: transparent; }
                      .allo-block-image { margin: 16px 0; text-align: center; }
                      .allo-block-image .allo-img-placeholder { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 28px 20px; color: #475569; font-size: 13px; }
                      .allo-block-image .allo-img-controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; justify-content: center; margin-top: 8px; }
                      .allo-block-image .allo-img-controls input[type='url'] { padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; min-width: 200px; }
                      .allo-block-image .allo-img-controls label.allo-file-btn { display: inline-block; padding: 4px 10px; font-size: 12px; background: #6366f1; color: white; border-radius: 4px; cursor: pointer; font-weight: 600; }
                      .allo-block-image figcaption { font-size: 12px; color: #475569; margin-top: 8px; font-style: italic; }
                      .allo-block-image img { max-width: 100%; border-radius: 8px; }
                      .allo-block-definition { padding: 16px; background: #faf5ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; }
                      .allo-block-definition dt { font-weight: 800; color: #5b21b6; font-size: 15px; margin-bottom: 4px; }
                      .allo-block-definition .allo-def-pron { font-size: 12px; color: #7c3aed; font-style: italic; font-weight: 500; margin-left: 8px; }
                      .allo-block-definition dd { color: #1f2937; font-size: 14px; margin: 0; line-height: 1.6; }
                      .allo-block-definition .allo-def-audio { margin-top: 8px; }
                      .allo-block-definition .allo-def-audio audio { width: 100%; max-width: 280px; height: 32px; }
                      .allo-block-steps { padding-left: 0; list-style: none; margin: 0; }
                      .allo-block-steps li { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
                      .allo-block-steps .allo-step-num { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
                      .allo-block-steps[data-num-style='alpha'] .allo-step-num { font-size: 14px; }
                      .allo-block-steps[data-num-style='roman'] .allo-step-num { font-size: 12px; letter-spacing: -0.05em; }
                      .allo-block-steps .allo-step-body { flex: 1; padding-top: 3px; }
                      .allo-block-accordion { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; padding: 0; }
                      .allo-block-accordion summary { padding: 12px 16px; font-weight: 700; cursor: pointer; background: #f8fafc; color: #1e293b; font-size: 14px; user-select: none; }
                      .allo-block-accordion .allo-accordion-body { padding: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; }
                      .allo-block-frame { padding: 14px 18px; background: #fefce8; border-left: 4px solid #ca8a04; border-radius: 0 8px 8px 0; font-size: 15px; line-height: 1.9; color: #422006; }
                      .allo-block-frame .allo-frame-blank { display: inline-block; min-width: 90px; border-bottom: 2px solid #78350f; padding: 0 6px; color: #713f12; font-style: italic; }
                      .allo-block-frame .allo-frame-template-picker { margin-top: 8px; padding: 6px; background: rgba(202,138,4,0.08); border-radius: 6px; }
                      .allo-block-frame .allo-frame-template-picker select { font-size: 12px; padding: 3px 6px; border: 1px solid #ca8a04; border-radius: 4px; font-family: inherit; }
                      .allo-block-objective { background: linear-gradient(135deg, #ecfeff, #cffafe); border-left: 4px solid #0e7490; padding: 14px 18px; border-radius: 0 8px 8px 0; }
                      .allo-block-objective .allo-obj-label { font-size: 11px; font-weight: 800; color: #155e75; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
                      .allo-block-objective .allo-obj-text { color: #164e63; font-size: 15px; line-height: 1.6; }
                      .allo-block-objective .allo-obj-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: #155e75; }
                      .allo-block-objective .allo-obj-meta span { background: rgba(8,145,178,0.12); padding: 2px 8px; border-radius: 10px; }
                      .allo-block-vocab { display: grid; grid-template-columns: 100px 1fr; gap: 14px; padding: 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; }
                      .allo-block-vocab .allo-vocab-img { background: #fef3c7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #78350f; min-height: 100px; overflow: hidden; }
                      .allo-block-vocab .allo-vocab-img img { width: 100%; height: 100%; object-fit: cover; }
                      .allo-block-vocab .allo-vocab-word { font-size: 18px; font-weight: 800; color: #78350f; margin: 0; }
                      .allo-block-vocab .allo-vocab-pos { font-size: 11px; color: #a16207; font-style: italic; margin-left: 6px; font-weight: 600; }
                      .allo-block-vocab .allo-vocab-pron { font-size: 12px; color: #92400e; font-style: italic; }
                      .allo-block-vocab .allo-vocab-def { font-size: 13px; color: #422006; margin: 4px 0; line-height: 1.5; }
                      .allo-block-vocab .allo-vocab-example { font-size: 12px; color: #713f12; font-style: italic; margin: 2px 0; }
                      .allo-block-vocab .allo-vocab-audio audio { width: 100%; max-width: 240px; height: 32px; }
                      .allo-block-math { padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; font-size: 18px; color: #1e293b; }
                      .allo-block-math .allo-math-output { font-family: 'Cambria Math', 'Latin Modern Math', Georgia, serif; min-height: 40px; padding: 8px 0; }
                      .allo-block-math .allo-math-input-wrap { display: flex; gap: 6px; align-items: center; padding-top: 8px; border-top: 1px dashed #cbd5e1; margin-top: 8px; }
                      .allo-block-math .allo-math-input-wrap label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
                      .allo-block-math .allo-math-input { flex: 1; font-family: ui-monospace, monospace; font-size: 12px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #1e293b; }
                      .allo-block-math .allo-math-status { font-size: 10px; color: #6366f1; font-weight: 600; }
                      .allo-block-reflection { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 14px 18px; }
                      .allo-block-reflection .allo-refl-prompt { font-weight: 700; color: #14532d; font-size: 14px; margin-bottom: 6px; }
                      .allo-block-reflection .allo-refl-stems { font-size: 12px; color: #166534; font-style: italic; margin-bottom: 8px; }
                      .allo-block-reflection .allo-refl-area { width: 100%; padding: 10px; border: 1px solid #86efac; border-radius: 8px; font-size: 14px; line-height: 1.6; background: white; resize: vertical; font-family: inherit; box-sizing: border-box; color: #1f2937; }
                      .allo-block-reflection[data-length='short'] .allo-refl-area { min-height: 60px; }
                      .allo-block-reflection[data-length='medium'] .allo-refl-area { min-height: 120px; }
                      .allo-block-reflection[data-length='long'] .allo-refl-area { min-height: 200px; }
                      .allo-block-lesson { padding: 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; }
                      .allo-block-lesson h2.allo-lesson-title { margin: 0 0 6px; color: #1e3a5f; font-size: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; }
                      .allo-block-lesson .allo-lesson-meta { font-size: 12px; color: #475569; margin-bottom: 14px; }
                      .allo-block-lesson .allo-lesson-section { background: white; border-left: 4px solid #6366f1; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 10px 0; }
                      .allo-block-lesson .allo-lesson-section h3 { margin: 0 0 6px; color: #4338ca; font-size: 14px; font-weight: 700; }
                      .allo-block-lesson .allo-lesson-section p { margin: 0 0 4px; font-size: 13px; line-height: 1.6; color: #1f2937; }
                      .allo-block-lesson .allo-lesson-section ul { margin: 4px 0 0 18px; padding: 0; font-size: 13px; line-height: 1.6; color: #1f2937; }
                      .allo-block-lesson .allo-lesson-time { font-size: 11px; color: #6366f1; font-weight: 500; margin-left: 4px; }
                      .allo-block-lesson .allo-lesson-udl { border-left-color: #ec4899; }
                      .allo-block-lesson .allo-lesson-udl h3 { color: #be185d; }
                      .allo-block-qa { padding: 14px 18px; background: #ecfeff; border-left: 4px solid #0e7490; border-radius: 0 8px 8px 0; }
                      .allo-block-qa .allo-qa-question { font-weight: 600; color: #155e75; margin-bottom: 8px; line-height: 1.5; font-size: 15px; }
                      .allo-block-qa .allo-qa-answer { color: #1e293b; padding-left: 18px; line-height: 1.6; font-size: 14px; }
                      .allo-block-qa .allo-qa-question::before, .allo-block-qa .allo-qa-answer::before { font-weight: 800; margin-right: 6px; }
                      .allo-block-rubric { overflow-x: auto; }
                      .allo-block-rubric table { font-size: 13px; }
                      .allo-block-rubric thead th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 12px; }
                      .allo-block-rubric tbody th { background: #f1f5f9; color: #1e293b; vertical-align: top; padding: 10px; text-align: left; font-weight: 700; border: 1px solid #e2e8f0; }
                      .allo-block-rubric tbody td { padding: 10px; border: 1px solid #e2e8f0; vertical-align: top; min-width: 120px; color: #1f2937; }
                      .allo-block-video { padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; }
                      .allo-block-video .allo-video-frame { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #1f2937; }
                      .allo-block-video .allo-video-frame iframe, .allo-block-video .allo-video-frame .allo-video-placeholder { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
                      .allo-block-video .allo-video-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #cbd5e1; background: #1f2937; padding: 20px; text-align: center; font-size: 14px; }
                      .allo-block-video .allo-video-controls { background: rgba(220,38,38,0.06); }
                      .allo-block-video .allo-video-transcript { margin-top: 8px; padding: 10px; background: white; border-radius: 8px; font-size: 13px; color: #1f2937; line-height: 1.6; max-height: 200px; overflow-y: auto; }
                      .allo-block-audio { padding: 12px; background: #f5f3ff; border-radius: 12px; border: 1px solid #ddd6fe; }
                      .allo-block-audio audio { width: 100%; }
                      .allo-block-audio .allo-audio-label { font-size: 11px; font-weight: 700; color: #5b21b6; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.05em; }
                      .allo-block-audio .allo-audio-controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
                      .allo-block-audio .allo-audio-controls input[type='url'] { padding: 4px 8px; font-size: 12px; border: 1px solid #c4b5fd; border-radius: 4px; min-width: 220px; flex: 1; }
                      .allo-block-audio .allo-audio-controls label.allo-file-btn { display: inline-block; padding: 4px 10px; font-size: 12px; background: #7c3aed; color: white; border-radius: 4px; cursor: pointer; font-weight: 600; }
                      .allo-block-audio .allo-audio-transcript { margin-top: 8px; padding: 10px; background: white; border-radius: 8px; font-size: 13px; color: #1f2937; line-height: 1.6; max-height: 200px; overflow-y: auto; }
                      .allo-block-code-wrap { background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 8px; font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Consolas, monospace; font-size: 13px; line-height: 1.6; overflow-x: auto; }
                      .allo-block-code-wrap pre { margin: 0; background: transparent; padding: 0; }
                      .allo-block-code-wrap code { background: transparent; color: inherit; }
                      .allo-block-code-wrap .allo-code-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
                      .allo-block-code-wrap .allo-code-lang-select { font-size: 11px; background: #334155; color: #cbd5e1; border: 1px solid #475569; border-radius: 4px; padding: 2px 6px; font-family: inherit; }
                      .allo-block-remove { position: absolute; top: 4px; right: 4px; width: 28px; height: 28px; background: rgba(15, 23, 42, 0.78); color: white; border: none; border-radius: 50%; cursor: pointer; opacity: 0; transition: opacity 0.15s; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; z-index: 5; padding: 0; }
                      .allo-block:hover > .allo-block-remove, .allo-block:focus-within > .allo-block-remove, .allo-block-remove:focus { opacity: 1; }
                      .allo-block-remove:hover { background: #dc2626; }
                      .allo-block-remove:focus { outline: 2px solid #6366f1; outline-offset: 2px; }
                      .allo-block-move-up, .allo-block-move-down { position: absolute; top: 4px; width: 24px; height: 28px; background: rgba(15, 23, 42, 0.6); color: white; border: none; border-radius: 4px; cursor: pointer; opacity: 0; transition: opacity 0.15s; font-size: 13px; line-height: 1; display: flex; align-items: center; justify-content: center; z-index: 5; padding: 0; font-weight: 700; }
                      .allo-block-move-down { right: 38px; }
                      .allo-block-move-up { right: 66px; }
                      .allo-block:hover > .allo-block-move-up, .allo-block:hover > .allo-block-move-down, .allo-block:focus-within > .allo-block-move-up, .allo-block:focus-within > .allo-block-move-down, .allo-block-move-up:focus, .allo-block-move-down:focus { opacity: 1; }
                      .allo-block-move-up:hover, .allo-block-move-down:hover { background: #6366f1; }
                      .allo-block-move-up:focus, .allo-block-move-down:focus { outline: 2px solid #6366f1; outline-offset: 2px; }
                      .allo-block-move-up:disabled, .allo-block-move-down:disabled { opacity: 0 !important; cursor: not-allowed; }
                      .allo-block-controls { display: flex; gap: 4px; margin-top: 8px; padding: 6px; background: rgba(99, 102, 241, 0.08); border-radius: 6px; flex-wrap: wrap; align-items: center; }
                      .allo-block-controls button { font-size: 11px; padding: 4px 9px; min-height: 28px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-weight: 600; color: #334155; font-family: inherit; }
                      .allo-block-controls button:hover { background: #6366f1; color: white; border-color: #6366f1; }
                      .allo-block-controls button:focus { outline: 2px solid #6366f1; outline-offset: 1px; }
                      .allo-block-controls button[aria-pressed='true'] { background: #6366f1; color: white; border-color: #4f46e5; }
                      .allo-block-controls .allo-control-label { font-size: 10px; font-weight: 700; color: #4338ca; text-transform: uppercase; padding: 0 4px; letter-spacing: 0.05em; }
                      .allo-block-controls select { font-size: 11px; padding: 4px 6px; min-height: 28px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; font-family: inherit; }
                      .allo-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
                      @media print {
                        .allo-block-remove, .allo-block-move-up, .allo-block-move-down, .allo-block-controls, .allo-img-controls, .allo-audio-controls, .allo-video-controls, .allo-frame-template-picker, .allo-math-input-wrap, .allo-code-header { display: none !important; }
                        .allo-block { break-inside: avoid; }
                        .allo-block-math .allo-math-output { font-size: 16pt; }
                      }
                      @media (prefers-reduced-motion: reduce) {
                        .allo-block-remove { transition: none; }
                      }
                    `;

                    // ── Lazy CDN loaders for KaTeX (math) and Prism (code) ──
                    const _ensureKatex = (doc) => {
                      if (doc.getElementById('allo-katex-css')) return;
                      const link = doc.createElement('link');
                      link.id = 'allo-katex-css';
                      link.rel = 'stylesheet';
                      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                      doc.head.appendChild(link);
                      const script = doc.createElement('script');
                      script.id = 'allo-katex-js';
                      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
                      script.onload = () => {
                        try {
                          doc.querySelectorAll('.allo-block-math').forEach((el) => {
                            const inp = el.querySelector('.allo-math-input');
                            const out = el.querySelector('.allo-math-output');
                            if (inp && out && doc.defaultView.katex) {
                              try { doc.defaultView.katex.render(inp.value, out, { throwOnError: false, displayMode: true }); }
                              catch (e) { out.textContent = inp.value; }
                            }
                          });
                        } catch (_) {}
                      };
                      doc.head.appendChild(script);
                    };
                    const _markPrismFailure = (doc, msg) => {
                      doc.querySelectorAll('.allo-block-code-wrap').forEach((b) => {
                        if (b.querySelector('.allo-prism-status')) return;
                        const header = b.querySelector('.allo-code-header');
                        if (!header) return;
                        const s = doc.createElement('span');
                        s.className = 'allo-prism-status';
                        s.setAttribute('contenteditable', 'false');
                        s.style.cssText = 'color:#fca5a5;font-size:10px;margin-left:8px;';
                        s.textContent = '⚠ ' + msg;
                        header.appendChild(s);
                      });
                    };
                    // _ensurePrism / _loadPrismLang accept an optional `targetEl` so
                    // a single language change only highlights that one block, not all.
                    const _ensurePrism = (doc, language, targetEl) => {
                      if (!doc.getElementById('allo-prism-css')) {
                        const link = doc.createElement('link');
                        link.id = 'allo-prism-css';
                        link.rel = 'stylesheet';
                        link.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css';
                        doc.head.appendChild(link);
                      }
                      if (!doc.getElementById('allo-prism-js')) {
                        const script = doc.createElement('script');
                        script.id = 'allo-prism-js';
                        script.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
                        script.onload = () => { _loadPrismLang(doc, language || 'python', targetEl); };
                        script.onerror = () => { _markPrismFailure(doc, 'Highlighting offline'); };
                        doc.head.appendChild(script);
                      } else {
                        _loadPrismLang(doc, language || 'python', targetEl);
                      }
                    };
                    const _loadPrismLang = (doc, language, targetEl) => {
                      const win = doc.defaultView;
                      const highlight = () => {
                        try {
                          if (!win || !win.Prism) return;
                          if (targetEl && win.Prism.highlightElement) win.Prism.highlightElement(targetEl);
                          else win.Prism.highlightAll();
                        } catch (_) {}
                      };
                      if (!language || language === 'plaintext') { highlight(); return; }
                      const id = 'allo-prism-lang-' + language;
                      if (doc.getElementById(id)) { highlight(); return; }
                      const script = doc.createElement('script');
                      script.id = id;
                      script.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-' + language + '.min.js';
                      script.onload = highlight;
                      script.onerror = () => { _markPrismFailure(doc, 'Language ' + language + ' unavailable'); };
                      doc.head.appendChild(script);
                    };

                    // ── Sentence Frame template library ──
                    const _SENTENCE_FRAMES = {
                      'notice-because': 'I noticed <span class="allo-frame-blank">_______________</span> because <span class="allo-frame-blank">_______________</span>.',
                      'cer': '<strong>Claim:</strong> <span class="allo-frame-blank">_______________</span><br/><strong>Evidence:</strong> <span class="allo-frame-blank">_______________</span><br/><strong>Reasoning:</strong> <span class="allo-frame-blank">_______________</span>',
                      'agree-disagree': 'I <span class="allo-frame-blank">agree / disagree</span> with <span class="allo-frame-blank">_______________</span> because <span class="allo-frame-blank">_______________</span>.',
                      'compare': '<span class="allo-frame-blank">_______________</span> and <span class="allo-frame-blank">_______________</span> are similar because <span class="allo-frame-blank">_______________</span>, but they differ in <span class="allo-frame-blank">_______________</span>.',
                      'cause-effect': 'When <span class="allo-frame-blank">_______________</span> happens, then <span class="allo-frame-blank">_______________</span> because <span class="allo-frame-blank">_______________</span>.',
                      'wonder': 'I wonder why <span class="allo-frame-blank">_______________</span>. I think it might be because <span class="allo-frame-blank">_______________</span>.',
                      'sel-feeling': 'I feel <span class="allo-frame-blank">_______________</span> when <span class="allo-frame-blank">_______________</span> because <span class="allo-frame-blank">_______________</span>.',
                      'add-on': 'I want to add to what <span class="allo-frame-blank">_______________</span> said. I think <span class="allo-frame-blank">_______________</span>.',
                    };

                    // ── Math formula library (K-12 grouped) ──
                    const _MATH_FORMULAS = {
                      'pythagoras': { label: 'Pythagorean theorem', latex: 'a^2 + b^2 = c^2', group: 'Geometry' },
                      'quadratic': { label: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', group: 'Algebra' },
                      'slope': { label: 'Slope', latex: 'm = \\frac{y_2 - y_1}{x_2 - x_1}', group: 'Algebra' },
                      'distance': { label: 'Distance formula', latex: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', group: 'Geometry' },
                      'linear': { label: 'Slope-intercept form', latex: 'y = mx + b', group: 'Algebra' },
                      'point-slope': { label: 'Point-slope form', latex: 'y - y_1 = m(x - x_1)', group: 'Algebra' },
                      'area-circle': { label: 'Area of circle', latex: 'A = \\pi r^2', group: 'Geometry' },
                      'circumference': { label: 'Circumference', latex: 'C = 2\\pi r', group: 'Geometry' },
                      'area-triangle': { label: 'Area of triangle', latex: 'A = \\tfrac{1}{2} b h', group: 'Geometry' },
                      'area-rect': { label: 'Area of rectangle', latex: 'A = l \\cdot w', group: 'Geometry' },
                      'area-trap': { label: 'Area of trapezoid', latex: 'A = \\tfrac{1}{2}(b_1 + b_2)h', group: 'Geometry' },
                      'volume-sphere': { label: 'Volume of sphere', latex: 'V = \\tfrac{4}{3}\\pi r^3', group: 'Geometry' },
                      'volume-cylinder': { label: 'Volume of cylinder', latex: 'V = \\pi r^2 h', group: 'Geometry' },
                      'volume-cone': { label: 'Volume of cone', latex: 'V = \\tfrac{1}{3}\\pi r^2 h', group: 'Geometry' },
                      'sa-sphere': { label: 'Surface area of sphere', latex: 'SA = 4\\pi r^2', group: 'Geometry' },
                      'mean': { label: 'Mean (average)', latex: '\\bar{x} = \\frac{\\sum_{i=1}^{n} x_i}{n}', group: 'Statistics' },
                      'std-dev': { label: 'Standard deviation', latex: '\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}', group: 'Statistics' },
                      'sum-series': { label: 'Sum of 1 to n', latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', group: 'Algebra' },
                      'exponential': { label: 'Exponential function', latex: 'y = a \\cdot b^x', group: 'Algebra' },
                      'log-base': { label: 'Change of base', latex: '\\log_b a = \\frac{\\ln a}{\\ln b}', group: 'Algebra' },
                      'sin-cos-tan': { label: 'SOH CAH TOA', latex: '\\sin\\theta = \\tfrac{\\text{opp}}{\\text{hyp}},\\; \\cos\\theta = \\tfrac{\\text{adj}}{\\text{hyp}},\\; \\tan\\theta = \\tfrac{\\text{opp}}{\\text{adj}}', group: 'Trigonometry' },
                      'pythag-trig': { label: 'Pythagorean identity', latex: '\\sin^2\\theta + \\cos^2\\theta = 1', group: 'Trigonometry' },
                      'newton-2': { label: "Newton's second law", latex: 'F = ma', group: 'Physics' },
                      'kinetic': { label: 'Kinetic energy', latex: 'KE = \\tfrac{1}{2}mv^2', group: 'Physics' },
                      'potential': { label: 'Potential energy', latex: 'PE = mgh', group: 'Physics' },
                      'ohms': { label: "Ohm's law", latex: 'V = IR', group: 'Physics' },
                      'energy-mass': { label: 'Mass-energy equivalence', latex: 'E = mc^2', group: 'Physics' },
                      'free-fall': { label: 'Free fall (no air)', latex: 'd = \\tfrac{1}{2}gt^2', group: 'Physics' },
                    };

                    // ── Rubric scale presets ──
                    const _RUBRIC_SCALES = {
                      '4pt': ['4 — Exemplary', '3 — Proficient', '2 — Developing', '1 — Beginning'],
                      '3pt': ['3 — Above Standard', '2 — At Standard', '1 — Approaching'],
                      '5pt': ['5 — Outstanding', '4 — Proficient', '3 — Developing', '2 — Emerging', '1 — Not Yet'],
                      'standards': ['Mastered', 'Proficient', 'Approaching', 'Beginning'],
                      'ungraded': ['Glow', 'Grow'],
                    };

                    // ── One-time per-iframe setup: inject stylesheet + click delegation ──
                    const _ensureAlloBlocksReady = (doc) => {
                      if (!doc.getElementById('allo-blocks-css')) {
                        const s = doc.createElement('style');
                        s.id = 'allo-blocks-css';
                        s.textContent = _ALLO_BLOCKS_CSS;
                        doc.head.appendChild(s);
                      }
                      if (!doc.getElementById('allo-blocks-live')) {
                        const live = doc.createElement('div');
                        live.id = 'allo-blocks-live';
                        live.className = 'allo-sr-only';
                        live.setAttribute('aria-live', 'polite');
                        live.setAttribute('aria-atomic', 'true');
                        live.setAttribute('contenteditable', 'false');
                        doc.body && doc.body.appendChild(live);
                      }
                      // Inject Move Up / Move Down buttons next to remove on every block.
                      // Runs once for existing blocks, then via MutationObserver for new ones.
                      const _ensureMoveButtons = (block) => {
                        if (!block || block.querySelector(':scope > .allo-block-move-up')) return;
                        const remove = block.querySelector(':scope > .allo-block-remove');
                        if (!remove) return;
                        const up = doc.createElement('button');
                        up.type = 'button';
                        up.className = 'allo-block-move-up';
                        up.setAttribute('contenteditable', 'false');
                        up.setAttribute('aria-label', 'Move block up');
                        up.title = 'Move up';
                        up.textContent = '↑';
                        const down = doc.createElement('button');
                        down.type = 'button';
                        down.className = 'allo-block-move-down';
                        down.setAttribute('contenteditable', 'false');
                        down.setAttribute('aria-label', 'Move block down');
                        down.title = 'Move down';
                        down.textContent = '↓';
                        block.insertBefore(up, remove);
                        block.insertBefore(down, remove);
                      };
                      try { doc.querySelectorAll('[data-allo-block]').forEach(_ensureMoveButtons); } catch (_) {}
                      if (!doc.__alloBlocksObserver) {
                        try {
                          const obs = new (doc.defaultView.MutationObserver || MutationObserver)((muts) => {
                            muts.forEach((m) => {
                              m.addedNodes.forEach((n) => {
                                if (!n || n.nodeType !== 1) return;
                                if (n.matches && n.matches('[data-allo-block]')) _ensureMoveButtons(n);
                                if (n.querySelectorAll) n.querySelectorAll('[data-allo-block]').forEach(_ensureMoveButtons);
                              });
                            });
                          });
                          obs.observe(doc.body, { childList: true, subtree: true });
                          doc.__alloBlocksObserver = obs;
                        } catch (_) {}
                      }
                      if (doc.__alloBlocksDelegated) return;
                      doc.__alloBlocksDelegated = true;
                      const announce = (msg) => {
                        try {
                          const lr = doc.getElementById('allo-blocks-live');
                          if (lr) { lr.textContent = ''; setTimeout(() => { lr.textContent = msg; }, 30); }
                          if (typeof window.parent.addToast === 'function') window.parent.addToast(msg, 'info');
                        } catch (_) {}
                      };
                      const persist = () => {
                        try { if (typeof window.parent.__alloflowOnPdfPreviewMutated === 'function') window.parent.__alloflowOnPdfPreviewMutated(); } catch (_) {}
                      };
                      // ── FOCUS DELEGATION (snapshot select values for revert-on-cancel) ──
                      doc.addEventListener('focusin', (ev) => {
                        const t = ev.target;
                        if (t && t.tagName === 'SELECT' && t.classList && t.classList.contains('allo-frame-template-select')) {
                          t.dataset.prevValue = t.value;
                        }
                      }, true);
                      // ── CLICK DELEGATION (covers remove + structural controls + style controls) ──
                      doc.addEventListener('click', (ev) => {
                        const t = ev.target;
                        if (!t || !t.closest) return;
                        const removeBtn = t.closest('.allo-block-remove');
                        if (removeBtn) {
                          ev.preventDefault();
                          const block = removeBtn.closest('[data-allo-block]');
                          if (block) {
                            const type = block.getAttribute('data-allo-block') || 'block';
                            block.remove();
                            announce('Removed ' + type + ' block');
                            persist();
                          }
                          return;
                        }
                        // Move Up / Move Down — accessible block reordering
                        const moveUpBtn = t.closest('.allo-block-move-up');
                        if (moveUpBtn) {
                          ev.preventDefault();
                          const block = moveUpBtn.closest('[data-allo-block]');
                          if (!block) return;
                          // Find the previous sibling that is a block-level node (skip text nodes)
                          let prev = block.previousElementSibling;
                          while (prev && (prev.tagName === 'SPAN' || prev.id === 'allo-blocks-live')) prev = prev.previousElementSibling;
                          if (prev && block.parentNode) {
                            block.parentNode.insertBefore(block, prev);
                            announce('Moved up');
                            setTimeout(() => { try { block.focus(); } catch (_) {} }, 30);
                            persist();
                          } else {
                            announce('Already at top');
                          }
                          return;
                        }
                        const moveDownBtn = t.closest('.allo-block-move-down');
                        if (moveDownBtn) {
                          ev.preventDefault();
                          const block = moveDownBtn.closest('[data-allo-block]');
                          if (!block) return;
                          let next = block.nextElementSibling;
                          while (next && (next.tagName === 'SPAN' || next.id === 'allo-blocks-live')) next = next.nextElementSibling;
                          if (next && block.parentNode) {
                            block.parentNode.insertBefore(next, block);
                            announce('Moved down');
                            setTimeout(() => { try { block.focus(); } catch (_) {} }, 30);
                            persist();
                          } else {
                            announce('Already at bottom');
                          }
                          return;
                        }
                        // Vocab Card TTS-from-word
                        const vocabTtsBtn = t.closest('.allo-vocab-tts-btn');
                        if (vocabTtsBtn) {
                          ev.preventDefault();
                          const block = vocabTtsBtn.closest('.allo-block-vocab'); if (!block) return;
                          const wordEl = block.querySelector('.allo-vocab-word');
                          // Strip any nested .allo-vocab-pos text from the spoken word
                          let wordText = '';
                          if (wordEl) {
                            const clone = wordEl.cloneNode(true);
                            clone.querySelectorAll('.allo-vocab-pos').forEach((n) => n.remove());
                            wordText = (clone.textContent || '').trim();
                          }
                          if (!wordText) { announce('Edit the word first, then click TTS'); return; }
                          const win = doc.defaultView;
                          const parentCallTTS = (win && win.parent && win.parent.callTTS) ? win.parent.callTTS : null;
                          if (typeof parentCallTTS !== 'function') { announce('TTS unavailable in this build'); return; }
                          const orig = vocabTtsBtn.textContent;
                          vocabTtsBtn.textContent = '⏳'; vocabTtsBtn.disabled = true;
                          announce('Generating pronunciation for ' + wordText);
                          Promise.resolve(parentCallTTS(wordText)).then((url) => {
                            const audio = block.querySelector('.allo-vocab-audio audio');
                            if (audio && url) { audio.src = url; announce('Pronunciation generated for ' + wordText); persist(); }
                            else announce('TTS returned no audio');
                          }).catch((err) => announce('TTS failed: ' + (err && err.message || 'unknown')))
                            .finally(() => { try { vocabTtsBtn.textContent = orig; vocabTtsBtn.disabled = false; } catch (_) {} });
                          return;
                        }
                        // Definition TTS-from-term
                        const defTtsBtn = t.closest('.allo-def-tts-btn');
                        if (defTtsBtn) {
                          ev.preventDefault();
                          const block = defTtsBtn.closest('.allo-block-definition'); if (!block) return;
                          const termEl = block.querySelector('dt > span[lang]');
                          const termText = (termEl && termEl.textContent || '').trim();
                          if (!termText) { announce('Edit the term first, then click TTS'); return; }
                          const win = doc.defaultView;
                          const parentCallTTS = (win && win.parent && win.parent.callTTS) ? win.parent.callTTS : null;
                          if (typeof parentCallTTS !== 'function') { announce('TTS unavailable in this build'); return; }
                          const orig = defTtsBtn.textContent;
                          defTtsBtn.textContent = '⏳'; defTtsBtn.disabled = true;
                          announce('Generating pronunciation for ' + termText);
                          Promise.resolve(parentCallTTS(termText)).then((url) => {
                            const audio = block.querySelector('.allo-def-audio audio');
                            if (audio && url) { audio.src = url; announce('Pronunciation generated for ' + termText); persist(); }
                            else announce('TTS returned no audio');
                          }).catch((err) => announce('TTS failed: ' + (err && err.message || 'unknown')))
                            .finally(() => { try { defTtsBtn.textContent = orig; defTtsBtn.disabled = false; } catch (_) {} });
                          return;
                        }
                        // Audio TTS-from-transcript
                        const ttsBtn = t.closest('.allo-audio-tts-btn');
                        if (ttsBtn) {
                          ev.preventDefault();
                          const block = ttsBtn.closest('.allo-block-audio'); if (!block) return;
                          const transcriptEl = block.querySelector('.allo-audio-transcript');
                          if (!transcriptEl) return;
                          // Strip the leading "Transcript:" label heuristically
                          let txt = (transcriptEl.textContent || '').trim();
                          if (txt.toLowerCase().startsWith('transcript:')) txt = txt.substring(11).trim();
                          if (!txt || txt.length < 3) {
                            announce('Add transcript text first, then click TTS');
                            return;
                          }
                          const win = doc.defaultView;
                          const parentCallTTS = (win && win.parent && win.parent.callTTS) ? win.parent.callTTS : null;
                          if (typeof parentCallTTS !== 'function') {
                            announce('TTS unavailable in this build');
                            return;
                          }
                          const origLabel = ttsBtn.textContent;
                          ttsBtn.textContent = '⏳ Generating…';
                          ttsBtn.disabled = true;
                          announce('Generating audio from transcript');
                          Promise.resolve(parentCallTTS(txt)).then((url) => {
                            const audioEl = block.querySelector('audio');
                            if (audioEl && url) {
                              audioEl.src = url;
                              announce('Audio generated from transcript');
                              persist();
                            } else {
                              announce('TTS returned no audio');
                            }
                          }).catch((err) => {
                            announce('TTS failed: ' + (err && err.message || 'unknown error'));
                          }).finally(() => {
                            try { ttsBtn.textContent = origLabel; ttsBtn.disabled = false; } catch (_) {}
                          });
                          return;
                        }
                        // Code copy button
                        const copyBtn = t.closest('.allo-code-copy-btn');
                        if (copyBtn) {
                          ev.preventDefault();
                          const block = copyBtn.closest('.allo-block-code-wrap');
                          const codeEl = block && block.querySelector('code');
                          if (!codeEl) return;
                          const txt = codeEl.textContent || '';
                          let copied = false;
                          try {
                            const win = doc.defaultView;
                            if (win && win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
                              win.navigator.clipboard.writeText(txt);
                              copied = true;
                            }
                          } catch (_) {}
                          if (!copied) {
                            // Fallback: select-and-execCommand
                            try {
                              const range = doc.createRange();
                              range.selectNodeContents(codeEl);
                              const sel = doc.getSelection();
                              sel.removeAllRanges(); sel.addRange(range);
                              copied = doc.execCommand('copy');
                              sel.removeAllRanges();
                            } catch (_) {}
                          }
                          announce(copied ? 'Code copied to clipboard' : 'Copy failed');
                          // Brief visual feedback
                          const orig = copyBtn.textContent;
                          copyBtn.textContent = copied ? '✓ Copied' : '✗ Failed';
                          setTimeout(() => { try { copyBtn.textContent = orig; } catch (_) {} }, 1500);
                          return;
                        }
                        const ctrlBtn = t.closest('.allo-block-controls button[data-action]');
                        if (!ctrlBtn) return;
                        ev.preventDefault();
                        const action = ctrlBtn.getAttribute('data-action');
                        const block = ctrlBtn.closest('[data-allo-block]');
                        if (!block) return;
                        const isRubric = block.classList.contains('allo-block-rubric');
                        // ── Structural: rows / cols / items / steps ──
                        if (action === 'add-row') {
                          const tbody = block.querySelector('tbody');
                          const headerRow = block.querySelector('thead tr');
                          if (tbody && headerRow) {
                            const cols = headerRow.children.length;
                            const tr = doc.createElement('tr');
                            for (let i = 0; i < cols; i++) {
                              if (isRubric && i === 0) {
                                const th = doc.createElement('th');
                                th.setAttribute('scope', 'row');
                                th.textContent = 'New criterion';
                                tr.appendChild(th);
                              } else {
                                const td = doc.createElement('td');
                                td.textContent = isRubric ? 'Description' : 'Data';
                                tr.appendChild(td);
                              }
                            }
                            tbody.appendChild(tr);
                            announce('Row added');
                          }
                        } else if (action === 'remove-row') {
                          const tbody = block.querySelector('tbody');
                          if (tbody && tbody.children.length > 1) { tbody.lastElementChild.remove(); announce('Row removed'); }
                        } else if (action === 'add-col') {
                          const headerRow = block.querySelector('thead tr');
                          const bodyRows = block.querySelectorAll('tbody tr');
                          if (headerRow) {
                            const newTh = doc.createElement('th');
                            newTh.setAttribute('scope', 'col');
                            newTh.textContent = isRubric ? 'New level' : 'New header';
                            headerRow.appendChild(newTh);
                          }
                          bodyRows.forEach((row) => { const td = doc.createElement('td'); td.textContent = isRubric ? 'Description' : 'Data'; row.appendChild(td); });
                          announce('Column added');
                        } else if (action === 'remove-col') {
                          const headerRow = block.querySelector('thead tr');
                          const bodyRows = block.querySelectorAll('tbody tr');
                          const minCols = isRubric ? 2 : 1;
                          if (headerRow && headerRow.children.length > minCols) {
                            headerRow.lastElementChild.remove();
                            bodyRows.forEach((row) => { if (row.lastElementChild) row.lastElementChild.remove(); });
                            announce('Column removed');
                          }
                        } else if (action === 'add-column-card') {
                          const newCol = doc.createElement('div');
                          newCol.className = 'allo-col';
                          newCol.textContent = 'New column content';
                          const ctrls = block.querySelector('.allo-block-controls');
                          if (ctrls) block.insertBefore(newCol, ctrls); else block.appendChild(newCol);
                          const count = block.querySelectorAll('.allo-col').length;
                          block.style.gridTemplateColumns = 'repeat(' + count + ', minmax(0, 1fr))';
                          announce('Column added');
                        } else if (action === 'remove-column-card') {
                          const cols = block.querySelectorAll('.allo-col');
                          if (cols.length > 1) {
                            cols[cols.length - 1].remove();
                            const count = cols.length - 1;
                            block.style.gridTemplateColumns = 'repeat(' + count + ', minmax(0, 1fr))';
                            announce('Column removed');
                          }
                        } else if (action === 'add-checklist-item') {
                          const list = block.querySelector('ul');
                          if (list) {
                            const id = 'cl-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                            const li = doc.createElement('li');
                            const cb = doc.createElement('input'); cb.type = 'checkbox'; cb.id = id;
                            const lbl = doc.createElement('label'); lbl.setAttribute('for', id); lbl.textContent = 'New task';
                            li.appendChild(cb); li.appendChild(lbl);
                            list.appendChild(li);
                            announce('Checklist item added');
                          }
                        } else if (action === 'remove-checklist-item') {
                          const list = block.querySelector('ul');
                          if (list && list.children.length > 1) { list.lastElementChild.remove(); announce('Checklist item removed'); }
                        } else if (action === 'add-step') {
                          const ol = block.querySelector('ol');
                          if (ol) {
                            const num = ol.children.length + 1;
                            const li = doc.createElement('li');
                            const span = doc.createElement('span'); span.className = 'allo-step-num'; span.setAttribute('aria-hidden', 'true'); span.textContent = String(num);
                            const body = doc.createElement('div'); body.className = 'allo-step-body'; body.textContent = 'New step description';
                            li.appendChild(span); li.appendChild(body); ol.appendChild(li);
                            announce('Step ' + num + ' added');
                          }
                        } else if (action === 'remove-step') {
                          const ol = block.querySelector('ol');
                          if (ol && ol.children.length > 1) {
                            ol.lastElementChild.remove();
                            Array.from(ol.querySelectorAll('.allo-step-num')).forEach((s, i) => { s.textContent = String(i + 1); });
                            announce('Step removed');
                          }
                        } else if (action === 'add-vocab-example') {
                          const examplesContainer = block.querySelector('.allo-vocab-examples');
                          if (examplesContainer) {
                            const p = doc.createElement('p'); p.className = 'allo-vocab-example'; p.textContent = 'Example: "Another sentence using the word."';
                            examplesContainer.appendChild(p);
                            announce('Example added');
                          }
                        } else if (action === 'remove-vocab-example') {
                          const examples = block.querySelectorAll('.allo-vocab-example');
                          if (examples.length > 1) { examples[examples.length - 1].remove(); announce('Example removed'); }
                        }
                        // ── Style: callout style swap ──
                        else if (action && action.indexOf('callout-style-') === 0) {
                          const style = action.substring('callout-style-'.length);
                          ['info', 'warning', 'success', 'note', 'danger'].forEach((s) => block.classList.remove('allo-callout-' + s));
                          block.classList.add('allo-callout-' + style);
                          block.setAttribute('data-allo-style', style);
                          // Also update the strong label heuristically
                          const strong = block.querySelector(':scope > strong');
                          const labels = { info: 'Note:', warning: 'Important:', success: 'Tip:', note: 'Notice:', danger: 'Caution:' };
                          if (strong && labels[style]) strong.textContent = labels[style];
                          // Update the pressed state
                          ctrlBtn.parentElement.querySelectorAll('button[data-action^="callout-style-"]').forEach((b) => b.setAttribute('aria-pressed', String(b === ctrlBtn)));
                          announce('Callout style: ' + style);
                        }
                        // ── Style: columns ratio + gap ──
                        else if (action && action.indexOf('cols-ratio-') === 0) {
                          const cols = block.querySelectorAll('.allo-col').length;
                          const ratio = action.substring('cols-ratio-'.length);
                          const ratioMap = { equal: 'repeat(' + cols + ', minmax(0, 1fr))', '2-1': '2fr 1fr', '1-2': '1fr 2fr', 'narrow-wide': '1fr 3fr', 'wide-narrow': '3fr 1fr' };
                          if (ratioMap[ratio]) {
                            block.style.gridTemplateColumns = ratioMap[ratio];
                            announce('Column ratio: ' + ratio);
                          }
                        } else if (action && action.indexOf('cols-gap-') === 0) {
                          const gap = action.substring('cols-gap-'.length);
                          const gapMap = { tight: '6px', normal: '16px', wide: '32px' };
                          if (gapMap[gap]) { block.style.gap = gapMap[gap]; announce('Gap: ' + gap); }
                        }
                        // ── Style: list-style for checklist ──
                        else if (action && action.indexOf('list-style-') === 0) {
                          const style = action.substring('list-style-'.length);
                          const list = block.querySelector('ul');
                          if (list) {
                            list.setAttribute('data-list-style', style);
                            ctrlBtn.parentElement.querySelectorAll('button[data-action^="list-style-"]').forEach((b) => b.setAttribute('aria-pressed', String(b === ctrlBtn)));
                            announce('List style: ' + style);
                          }
                        }
                        // ── Style: numbering style for steps ──
                        else if (action && action.indexOf('num-style-') === 0) {
                          const style = action.substring('num-style-'.length);
                          const ol = block.querySelector('ol');
                          if (ol) {
                            ol.setAttribute('data-num-style', style);
                            const labels = ol.querySelectorAll('.allo-step-num');
                            labels.forEach((s, i) => {
                              if (style === 'numeric') s.textContent = String(i + 1);
                              else if (style === 'alpha') s.textContent = String.fromCharCode(97 + i).toUpperCase();
                              else if (style === 'roman') {
                                const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][i] || String(i+1);
                                s.textContent = r;
                              }
                            });
                            ctrlBtn.parentElement.querySelectorAll('button[data-action^="num-style-"]').forEach((b) => b.setAttribute('aria-pressed', String(b === ctrlBtn)));
                            announce('Numbering: ' + style);
                          }
                        }
                        // ── Style: accordion default-open toggle ──
                        else if (action === 'accordion-default-open') {
                          const isOpen = block.hasAttribute('open');
                          if (isOpen) { block.removeAttribute('open'); ctrlBtn.setAttribute('aria-pressed', 'false'); announce('Accordion default: closed'); }
                          else { block.setAttribute('open', ''); ctrlBtn.setAttribute('aria-pressed', 'true'); announce('Accordion default: open'); }
                        }
                        // ── Style: data table header style ──
                        else if (action && action.indexOf('table-header-') === 0) {
                          const style = action.substring('table-header-'.length);
                          block.setAttribute('data-header-style', style);
                          ctrlBtn.parentElement.querySelectorAll('button[data-action^="table-header-"]').forEach((b) => b.setAttribute('aria-pressed', String(b === ctrlBtn)));
                          announce('Header style: ' + style);
                        } else if (action === 'table-zebra-toggle') {
                          const cur = block.getAttribute('data-zebra') || 'on';
                          const next = cur === 'on' ? 'off' : 'on';
                          block.setAttribute('data-zebra', next);
                          ctrlBtn.setAttribute('aria-pressed', String(next === 'on'));
                          announce('Zebra stripes: ' + next);
                        }
                        // ── Style: rubric scale ──
                        else if (action && action.indexOf('rubric-scale-') === 0) {
                          const scale = action.substring('rubric-scale-'.length);
                          const labels = _RUBRIC_SCALES[scale];
                          if (!labels) return;
                          const headerRow = block.querySelector('thead tr');
                          const tbody = block.querySelector('tbody');
                          if (!headerRow || !tbody) return;
                          // Rebuild header row keeping first cell ("Criterion")
                          const firstHeader = headerRow.firstElementChild;
                          headerRow.innerHTML = '';
                          headerRow.appendChild(firstHeader);
                          labels.forEach((label) => { const th = doc.createElement('th'); th.setAttribute('scope', 'col'); th.textContent = label; headerRow.appendChild(th); });
                          // Adjust each tbody row to match column count
                          const targetCols = labels.length + 1; // +1 for criterion
                          Array.from(tbody.querySelectorAll('tr')).forEach((row) => {
                            while (row.children.length < targetCols) {
                              const td = doc.createElement('td'); td.textContent = 'Description'; row.appendChild(td);
                            }
                            while (row.children.length > targetCols) { row.lastElementChild.remove(); }
                          });
                          ctrlBtn.parentElement.querySelectorAll('button[data-action^="rubric-scale-"]').forEach((b) => b.setAttribute('aria-pressed', String(b === ctrlBtn)));
                          announce('Rubric scale: ' + scale);
                        }
                        // ── Style: reflection length ──
                        else if (action && action.indexOf('refl-length-') === 0) {
                          const len = action.substring('refl-length-'.length);
                          block.setAttribute('data-length', len);
                          ctrlBtn.parentElement.querySelectorAll('button[data-action^="refl-length-"]').forEach((b) => b.setAttribute('aria-pressed', String(b === ctrlBtn)));
                          announce('Reflection length: ' + len);
                        }
                        persist();
                      }, true);
                      // ── INPUT/CHANGE delegation (Math LaTeX, Code language, Image/Audio URL) ──
                      doc.addEventListener('input', (ev) => {
                        const t = ev.target;
                        if (!t) return;
                        // Math LaTeX live-render
                        if (t.classList && t.classList.contains('allo-math-input')) {
                          const block = t.closest('.allo-block-math');
                          if (!block) return;
                          const out = block.querySelector('.allo-math-output');
                          const status = block.querySelector('.allo-math-status');
                          const win = doc.defaultView;
                          if (win && win.katex && out) {
                            try { win.katex.render(t.value || '', out, { throwOnError: false, displayMode: true }); if (status) status.textContent = 'Rendered'; }
                            catch (e) { if (out) out.textContent = t.value; if (status) status.textContent = 'Plain'; }
                          } else {
                            if (out) out.textContent = t.value || '';
                            if (status) status.textContent = win && win.katex ? 'Loading…' : 'KaTeX loading…';
                          }
                          persist();
                        }
                        // Image URL paste
                        if (t.classList && t.classList.contains('allo-img-url-input')) {
                          const block = t.closest('.allo-block-image');
                          if (!block) return;
                          const url = t.value.trim();
                          if (!url) return;
                          const placeholder = block.querySelector('.allo-img-placeholder');
                          let img = block.querySelector('img.allo-img-real');
                          if (!img) {
                            img = doc.createElement('img');
                            img.className = 'allo-img-real';
                            img.alt = '';
                            if (placeholder) placeholder.replaceWith(img); else block.insertBefore(img, block.firstChild);
                          }
                          img.src = url;
                          announce('Image URL set');
                          persist();
                        }
                        // Audio URL paste
                        if (t.classList && t.classList.contains('allo-audio-url-input')) {
                          const block = t.closest('.allo-block-audio');
                          if (!block) return;
                          const url = t.value.trim();
                          const audio = block.querySelector('audio');
                          if (audio && url) {
                            audio.src = url;
                            announce('Audio URL set');
                            persist();
                          }
                        }
                        // Video URL paste — auto-detects YouTube / Vimeo and embeds
                        if (t.classList && t.classList.contains('allo-video-url-input')) {
                          const block = t.closest('.allo-block-video');
                          if (!block) return;
                          const url = (t.value || '').trim();
                          if (!url) return;
                          let embedUrl = '';
                          let kind = '';
                          // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
                          const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/);
                          if (ytMatch) {
                            embedUrl = 'https://www.youtube.com/embed/' + ytMatch[1] + '?rel=0';
                            kind = 'YouTube';
                          } else {
                            // Vimeo: vimeo.com/ID, vimeo.com/channels/X/ID, vimeo.com/groups/X/videos/ID
                            const vmMatch = url.match(/vimeo\.com\/(?:[\w]+\/)*(\d+)/);
                            if (vmMatch) {
                              embedUrl = 'https://player.vimeo.com/video/' + vmMatch[1];
                              kind = 'Vimeo';
                            }
                          }
                          if (!embedUrl) {
                            // Don't blow away on every keystroke — only show error if URL looks complete
                            if (/^https?:\/\//.test(url) && url.length > 25) {
                              const placeholder = block.querySelector('.allo-video-placeholder');
                              if (placeholder) placeholder.innerHTML = '<span aria-hidden="true">⚠️</span><br/>URL not recognized as YouTube or Vimeo.<br/><em style="font-size:11px;">Supported: youtube.com / youtu.be / vimeo.com</em>';
                            }
                            return;
                          }
                          const titleInput = block.querySelector('.allo-video-title-input');
                          const title = (titleInput && titleInput.value) || (kind + ' video');
                          const frame = block.querySelector('.allo-video-frame');
                          if (!frame) return;
                          let iframe = frame.querySelector('iframe');
                          if (!iframe) {
                            const placeholder = frame.querySelector('.allo-video-placeholder');
                            if (placeholder) placeholder.remove();
                            iframe = doc.createElement('iframe');
                            iframe.setAttribute('frameborder', '0');
                            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                            iframe.setAttribute('allowfullscreen', '');
                            frame.appendChild(iframe);
                          }
                          iframe.src = embedUrl;
                          iframe.setAttribute('title', title);
                          announce(kind + ' video embedded');
                          persist();
                        }
                        // Video title (updates iframe title for SR)
                        if (t.classList && t.classList.contains('allo-video-title-input')) {
                          const block = t.closest('.allo-block-video');
                          if (!block) return;
                          const iframe = block.querySelector('iframe');
                          if (iframe && t.value) {
                            iframe.setAttribute('title', t.value);
                            persist();
                          }
                        }
                      }, true);
                      // ── CHANGE (file uploads, language picker, sentence-frame select, definition lang) ──
                      doc.addEventListener('change', (ev) => {
                        const t = ev.target;
                        if (!t) return;
                        // Image file upload
                        if (t.classList && t.classList.contains('allo-img-file-input')) {
                          const file = t.files && t.files[0]; if (!file) return;
                          const block = t.closest('.allo-block-image'); if (!block) return;
                          // Warn for large uploads (>1MB embedded as data URL = ~33% bloat)
                          const sizeMB = file.size / (1024 * 1024);
                          if (sizeMB > 1) {
                            const win = doc.defaultView;
                            const msg = 'This image is ' + sizeMB.toFixed(1) + ' MB. Embedding it inline will add about ' + (sizeMB * 1.33).toFixed(1) + ' MB to your document. Continue, or cancel and paste a URL instead?';
                            const proceed = (win && typeof win.confirm === 'function') ? win.confirm(msg) : true;
                            if (!proceed) {
                              t.value = '';  // clear file input so re-pick of same file fires change again
                              announce('Image upload cancelled');
                              return;
                            }
                          }
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const placeholder = block.querySelector('.allo-img-placeholder');
                            let img = block.querySelector('img.allo-img-real');
                            if (!img) {
                              img = doc.createElement('img');
                              img.className = 'allo-img-real';
                              img.alt = file.name.replace(/\.[^.]+$/, '');
                              if (placeholder) placeholder.replaceWith(img); else block.insertBefore(img, block.firstChild);
                            }
                            img.src = String(e.target.result || '');
                            announce('Image uploaded: ' + file.name);
                            persist();
                          };
                          reader.readAsDataURL(file);
                        }
                        // Audio file upload
                        if (t.classList && t.classList.contains('allo-audio-file-input')) {
                          const file = t.files && t.files[0]; if (!file) return;
                          const block = t.closest('.allo-block-audio'); if (!block) return;
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const audio = block.querySelector('audio');
                            if (audio) { audio.src = String(e.target.result || ''); announce('Audio uploaded: ' + file.name); persist(); }
                          };
                          reader.readAsDataURL(file);
                        }
                        // Vocab card audio upload
                        if (t.classList && t.classList.contains('allo-vocab-audio-input')) {
                          const file = t.files && t.files[0]; if (!file) return;
                          const block = t.closest('.allo-block-vocab'); if (!block) return;
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const audio = block.querySelector('.allo-vocab-audio audio');
                            if (audio) { audio.src = String(e.target.result || ''); announce('Pronunciation audio uploaded'); persist(); }
                          };
                          reader.readAsDataURL(file);
                        }
                        // Definition audio upload
                        if (t.classList && t.classList.contains('allo-def-audio-input')) {
                          const file = t.files && t.files[0]; if (!file) return;
                          const block = t.closest('.allo-block-definition'); if (!block) return;
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const audio = block.querySelector('.allo-def-audio audio');
                            if (audio) { audio.src = String(e.target.result || ''); announce('Pronunciation audio uploaded'); persist(); }
                          };
                          reader.readAsDataURL(file);
                        }
                        // Vocab card image upload
                        if (t.classList && t.classList.contains('allo-vocab-img-input')) {
                          const file = t.files && t.files[0]; if (!file) return;
                          const block = t.closest('.allo-block-vocab'); if (!block) return;
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const slot = block.querySelector('.allo-vocab-img');
                            if (slot) {
                              slot.innerHTML = '';
                              const img = doc.createElement('img'); img.src = String(e.target.result || ''); img.alt = file.name.replace(/\.[^.]+$/, '');
                              slot.appendChild(img);
                              announce('Vocab image uploaded'); persist();
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                        // Code language change — highlight ONLY this block, not all blocks
                        if (t.classList && t.classList.contains('allo-code-lang-select')) {
                          const block = t.closest('.allo-block-code-wrap'); if (!block) return;
                          const codeEl = block.querySelector('code');
                          if (codeEl) {
                            const newLang = t.value || 'plaintext';
                            // Strip Prism's per-token classes so re-highlighting works cleanly
                            const txt = codeEl.textContent || '';
                            codeEl.innerHTML = '';
                            codeEl.textContent = txt;
                            codeEl.className = 'language-' + newLang;
                            _ensurePrism(doc, newLang, codeEl);
                            announce('Code language: ' + newLang);
                            persist();
                          }
                        }
                        // Sentence Frame template change
                        if (t.classList && t.classList.contains('allo-frame-template-select')) {
                          const block = t.closest('.allo-block-frame'); if (!block) return;
                          const tpl = _SENTENCE_FRAMES[t.value];
                          if (!tpl) return;
                          // Heuristic: detect if user has typed substantive text into any blank.
                          // Skip pure underscores/whitespace; flag blanks with 4+ "real" chars.
                          const blanks = block.querySelectorAll('.allo-frame-blank');
                          let hasEdits = false;
                          blanks.forEach((b) => {
                            const stripped = (b.textContent || '').replace(/[_\s\/]/g, '');
                            if (stripped.length >= 4 && stripped !== 'agreedisagree') hasEdits = true;
                          });
                          if (hasEdits) {
                            const win = doc.defaultView;
                            const proceed = (win && typeof win.confirm === 'function')
                              ? win.confirm('Switch sentence frame template? Your edits to the blanks will be replaced.')
                              : true;
                            if (!proceed) {
                              // Restore the dropdown to the previously-selected template (snapshotted on focus)
                              const prev = t.dataset.prevValue;
                              if (prev) t.value = prev;
                              announce('Template change cancelled');
                              return;
                            }
                          }
                          const removeBtn = block.querySelector(':scope > .allo-block-remove');
                          const picker = block.querySelector(':scope > .allo-frame-template-picker');
                          block.innerHTML = (removeBtn ? removeBtn.outerHTML : '') + tpl + (picker ? picker.outerHTML : '');
                          // Snapshot the new value as the new "previous" so the next change-and-cancel reverts to this one
                          const newSelect = block.querySelector('.allo-frame-template-select');
                          if (newSelect) { newSelect.value = t.value; newSelect.dataset.prevValue = t.value; }
                          announce('Sentence frame: ' + t.value);
                          persist();
                        }
                        // Definition language change
                        if (t.classList && t.classList.contains('allo-def-lang-select')) {
                          const block = t.closest('.allo-block-definition'); if (!block) return;
                          const span = block.querySelector('dt > span');
                          if (span) { span.setAttribute('lang', t.value); announce('Term language: ' + t.value); persist(); }
                        }
                        // Math formula library pick
                        if (t.classList && t.classList.contains('allo-math-formula-select')) {
                          const key = t.value;
                          if (!key) return;
                          const formula = _MATH_FORMULAS[key];
                          if (!formula) return;
                          const block = t.closest('.allo-block-math'); if (!block) return;
                          const inp = block.querySelector('.allo-math-input');
                          const out = block.querySelector('.allo-math-output');
                          const status = block.querySelector('.allo-math-status');
                          if (inp) inp.value = formula.latex;
                          const win = doc.defaultView;
                          if (win && win.katex && out) {
                            try { win.katex.render(formula.latex, out, { throwOnError: false, displayMode: true }); if (status) status.textContent = 'Rendered'; }
                            catch (e) { if (out) out.textContent = formula.latex; }
                          } else if (out) {
                            out.textContent = formula.latex;
                          }
                          announce('Inserted ' + formula.label);
                          persist();
                          // Reset select to placeholder for repeat use
                          t.value = '';
                        }
                      }, true);
                    };

                    const _uid = (p) => p + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

                    // ── Block library (21 blocks) — each tagged with category + keywords ──
                    const blocks = [
                      // ── Layout ──
                      { label: 'Columns', icon: '⬛⬛', category: 'layout', keywords: 'columns grid layout split',
                        html: '<div class="allo-block allo-block-columns" data-allo-block="columns" tabindex="0" style="grid-template-columns: repeat(2, minmax(0, 1fr));"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove columns" title="Remove">×</button><div class="allo-col">Column 1 content</div><div class="allo-col">Column 2 content</div><div class="allo-block-controls" contenteditable="false" style="grid-column: 1 / -1;"><span class="allo-control-label">Cols</span><button type="button" data-action="add-column-card" aria-label="Add column">+ Col</button><button type="button" data-action="remove-column-card" aria-label="Remove column">− Col</button><span class="allo-control-label">Ratio</span><button type="button" data-action="cols-ratio-equal" aria-pressed="true">Equal</button><button type="button" data-action="cols-ratio-2-1" aria-pressed="false">2:1</button><button type="button" data-action="cols-ratio-1-2" aria-pressed="false">1:2</button><span class="allo-control-label">Gap</span><button type="button" data-action="cols-gap-tight">Tight</button><button type="button" data-action="cols-gap-normal" aria-pressed="true">Normal</button><button type="button" data-action="cols-gap-wide">Wide</button></div></div>' },
                      { label: 'Divider', icon: '➖', category: 'layout', keywords: 'divider hr separator line',
                        html: '<div class="allo-block allo-block-divider" data-allo-block="divider" tabindex="0" role="separator" aria-label="Section divider"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove divider" title="Remove">×</button><hr /></div>' },
                      { label: 'Page Break', icon: '📄', category: 'layout', keywords: 'page break print pagination',
                        html: '<div class="allo-block allo-block-pagebreak" data-allo-block="pagebreak" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove page break" title="Remove">×</button><span class="allo-pb-label" aria-hidden="true">— Page Break —</span><span class="allo-sr-only">Page break</span></div>' },

                      // ── Content ──
                      { label: 'Callout', icon: 'ℹ️', category: 'content', keywords: 'info note warning success callout alert tip',
                        html: '<div class="allo-block allo-callout allo-callout-info" data-allo-block="info" data-allo-style="info" tabindex="0" role="note" aria-label="Callout"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove callout" title="Remove">×</button><strong>Note:</strong> <span>Enter info here</span><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Style</span><button type="button" data-action="callout-style-info" aria-pressed="true">Info</button><button type="button" data-action="callout-style-warning" aria-pressed="false">Warning</button><button type="button" data-action="callout-style-success" aria-pressed="false">Tip</button><button type="button" data-action="callout-style-note" aria-pressed="false">Note</button><button type="button" data-action="callout-style-danger" aria-pressed="false">Danger</button></div></div>' },
                      { label: 'Quote', icon: '💬', category: 'content', keywords: 'quote blockquote cite',
                        html: '<blockquote class="allo-block allo-block-quote" data-allo-block="quote" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove quote" title="Remove">×</button>"Enter quote here"<cite>— Source</cite></blockquote>' },
                      { label: 'Checklist', icon: '☑️', category: 'content', keywords: 'checklist list tasks todo',
                        html: (() => { const a = _uid('cl'), b = _uid('cl'), c = _uid('cl'); return '<div class="allo-block" data-allo-block="checklist" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove checklist" title="Remove">×</button><ul class="allo-block-checklist" data-list-style="checkbox" aria-label="Checklist"><li><input type="checkbox" id="' + a + '" /><label for="' + a + '">Task item 1</label></li><li><input type="checkbox" id="' + b + '" /><label for="' + b + '">Task item 2</label></li><li><input type="checkbox" id="' + c + '" /><label for="' + c + '">Task item 3</label></li></ul><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Items</span><button type="button" data-action="add-checklist-item">+ Item</button><button type="button" data-action="remove-checklist-item">− Item</button><span class="allo-control-label">Style</span><button type="button" data-action="list-style-checkbox" aria-pressed="true">☑ Check</button><button type="button" data-action="list-style-bullet" aria-pressed="false">• Bullet</button><button type="button" data-action="list-style-ordered" aria-pressed="false">1. Number</button></div></div>'; }) },
                      { label: 'Numbered Steps', icon: '1️⃣', category: 'content', keywords: 'steps numbered ordered procedure how-to',
                        html: '<div class="allo-block" data-allo-block="steps" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove steps" title="Remove">×</button><ol class="allo-block-steps" data-num-style="numeric" aria-label="Step-by-step instructions"><li><span class="allo-step-num" aria-hidden="true">1</span><div class="allo-step-body">First step description</div></li><li><span class="allo-step-num" aria-hidden="true">2</span><div class="allo-step-body">Second step description</div></li><li><span class="allo-step-num" aria-hidden="true">3</span><div class="allo-step-body">Third step description</div></li></ol><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Steps</span><button type="button" data-action="add-step">+ Step</button><button type="button" data-action="remove-step">− Step</button><span class="allo-control-label">Numbering</span><button type="button" data-action="num-style-numeric" aria-pressed="true">1, 2, 3</button><button type="button" data-action="num-style-alpha" aria-pressed="false">A, B, C</button><button type="button" data-action="num-style-roman" aria-pressed="false">I, II, III</button></div></div>' },
                      { label: 'Accordion', icon: '📂', category: 'content', keywords: 'accordion collapsible expand toggle disclosure',
                        html: '<details class="allo-block allo-block-accordion" data-allo-block="accordion" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove accordion" title="Remove">×</button><summary>Click to expand section title</summary><div class="allo-accordion-body">Hidden content goes here. Great for differentiation. <em>Note: collapsed content does not appear in printed/exported PDFs unless expanded.</em><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Default</span><button type="button" data-action="accordion-default-open" aria-pressed="false">Open by default</button></div></div></details>' },
                      { label: 'Q & A', icon: '❓', category: 'content', keywords: 'qa question answer faq study',
                        html: '<div class="allo-block allo-block-qa" data-allo-block="qa" tabindex="0" role="group" aria-label="Question and answer pair"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove Q and A" title="Remove">×</button><div class="allo-qa-question"><strong>Q:</strong> Type the question here.</div><div class="allo-qa-answer"><strong>A:</strong> Type the answer here.</div></div>' },
                      { label: 'Definition', icon: '📖', category: 'content', keywords: 'definition term vocabulary glossary',
                        html: '<dl class="allo-block allo-block-definition" data-allo-block="definition" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove definition" title="Remove">×</button><dt><span lang="en">Term</span><span class="allo-def-pron">/prə-nun-see-AY-shun/</span></dt><dd>Definition goes here. Students can reference this for key vocabulary.</dd><div class="allo-def-audio"><audio controls aria-label="Pronunciation audio"></audio></div><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Term Lang</span><select class="allo-def-lang-select" aria-label="Term language"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="zh">中文</option><option value="ar">العربية</option><option value="la">Latin</option><option value="grc">Greek</option></select><span class="allo-control-label">Audio</span><label class="allo-file-btn">Upload<input type="file" accept="audio/*" class="allo-def-audio-input" style="display:none" /></label><button type="button" class="allo-def-tts-btn" aria-label="Generate pronunciation audio from the term using AI text-to-speech" title="Generate pronunciation from the term">🎤 TTS</button></div></dl>' },

                      // ── Educational ──
                      { label: 'Sentence Frame', icon: '🪧', category: 'educational', keywords: 'sentence frame stem scaffold ell esl',
                        html: '<div class="allo-block allo-block-frame" data-allo-block="sentence-frame" tabindex="0" role="note" aria-label="Sentence frame"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove sentence frame" title="Remove">×</button>I noticed <span class="allo-frame-blank">_______________</span> because <span class="allo-frame-blank">_______________</span>.<div class="allo-block-controls allo-frame-template-picker" contenteditable="false"><span class="allo-control-label">Template</span><select class="allo-frame-template-select" aria-label="Sentence frame template"><option value="notice-because">I noticed ___ because ___</option><option value="cer">Claim / Evidence / Reasoning</option><option value="agree-disagree">I agree/disagree because ___</option><option value="compare">Compare and contrast</option><option value="cause-effect">When ___, then ___</option><option value="wonder">I wonder why ___</option><option value="sel-feeling">I feel ___ when ___</option><option value="add-on">Adding to what ___ said</option></select></div></div>' },
                      { label: 'Objective', icon: '🎯', category: 'educational', keywords: 'learning objective goal standard outcome',
                        html: '<div class="allo-block allo-block-objective" data-allo-block="learning-objective" tabindex="0" role="note" aria-label="Learning objective"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove learning objective" title="Remove">×</button><span class="allo-obj-label">Learning Objective</span><div class="allo-obj-text">By the end of this lesson, students will be able to <em>explain the main idea</em>.</div><div class="allo-obj-meta"><span>Standard: <em>edit me</em></span><span>Bloom\'s: <em>Apply</em></span></div></div>' },
                      { label: 'Vocab Card', icon: '🃏', category: 'educational', keywords: 'vocabulary card word term definition',
                        html: '<div class="allo-block allo-block-vocab" data-allo-block="vocab-card" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove vocabulary card" title="Remove">×</button><div class="allo-vocab-img" aria-hidden="true">📖</div><div><p class="allo-vocab-word">Word<span class="allo-vocab-pos">noun</span></p><p class="allo-vocab-pron">/wərd/</p><div class="allo-vocab-examples"><p class="allo-vocab-def">Definition of the word in student-friendly language.</p><p class="allo-vocab-example">Example: "The word in a sentence."</p></div><div class="allo-vocab-audio"><audio controls aria-label="Pronunciation audio"></audio></div></div><div class="allo-block-controls" contenteditable="false" style="grid-column: 1 / -1;"><span class="allo-control-label">Image</span><label class="allo-file-btn">Upload<input type="file" accept="image/*" class="allo-vocab-img-input" style="display:none" /></label><span class="allo-control-label">Audio</span><label class="allo-file-btn">Upload<input type="file" accept="audio/*" class="allo-vocab-audio-input" style="display:none" /></label><button type="button" class="allo-vocab-tts-btn" aria-label="Generate pronunciation audio from the word using AI text-to-speech" title="Generate pronunciation from the word">🎤 TTS</button><span class="allo-control-label">Examples</span><button type="button" data-action="add-vocab-example">+ Example</button><button type="button" data-action="remove-vocab-example">− Example</button></div></div>' },
                      { label: 'Reflection', icon: '✏️', category: 'educational', keywords: 'reflection journal response writing prompt',
                        html: '<div class="allo-block allo-block-reflection" data-allo-block="reflection" data-length="medium" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove reflection" title="Remove">×</button><div class="allo-refl-prompt">Reflect: What did you learn? What questions do you still have?</div><div class="allo-refl-stems">Try starting with: "I learned..." • "I\'m wondering..." • "This connects to..."</div><textarea class="allo-refl-area" aria-label="Reflection response" placeholder="Write your reflection here..."></textarea><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Length</span><button type="button" data-action="refl-length-short" aria-pressed="false">Short</button><button type="button" data-action="refl-length-medium" aria-pressed="true">Medium</button><button type="button" data-action="refl-length-long" aria-pressed="false">Long</button></div></div>' },
                      { label: 'Rubric', icon: '📋', category: 'educational', keywords: 'rubric grading criteria scoring assessment',
                        html: '<div class="allo-block allo-block-rubric" data-allo-block="rubric" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove rubric" title="Remove">×</button><table aria-label="Scoring rubric"><caption>Rubric Title — Edit Me</caption><thead><tr><th scope="col">Criterion</th><th scope="col">4 — Exemplary</th><th scope="col">3 — Proficient</th><th scope="col">2 — Developing</th><th scope="col">1 — Beginning</th></tr></thead><tbody><tr><th scope="row">Criterion 1</th><td>Description</td><td>Description</td><td>Description</td><td>Description</td></tr><tr><th scope="row">Criterion 2</th><td>Description</td><td>Description</td><td>Description</td><td>Description</td></tr><tr><th scope="row">Criterion 3</th><td>Description</td><td>Description</td><td>Description</td><td>Description</td></tr><tr><th scope="row">Criterion 4</th><td>Description</td><td>Description</td><td>Description</td><td>Description</td></tr></tbody></table><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Scale</span><button type="button" data-action="rubric-scale-3pt">3-pt</button><button type="button" data-action="rubric-scale-4pt" aria-pressed="true">4-pt</button><button type="button" data-action="rubric-scale-5pt">5-pt</button><button type="button" data-action="rubric-scale-standards">Standards</button><button type="button" data-action="rubric-scale-ungraded">Glow/Grow</button><span class="allo-control-label">Rows</span><button type="button" data-action="add-row">+ Criterion</button><button type="button" data-action="remove-row">− Criterion</button><span class="allo-control-label">Cols</span><button type="button" data-action="add-col">+ Level</button><button type="button" data-action="remove-col">− Level</button></div></div>' },
                      { label: 'Lesson Plan', icon: '📘', category: 'educational', keywords: 'lesson plan template udl objective standards materials assessment',
                        html: '<section class="allo-block allo-block-lesson" data-allo-block="lesson-plan" tabindex="0" aria-label="Lesson plan template"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove lesson plan" title="Remove">×</button><h2 class="allo-lesson-title">Lesson Plan: <em>Click to edit title</em></h2><div class="allo-lesson-meta">Grade: <em>3</em> · Subject: <em>Math</em> · Duration: <em>50 min</em> · Date: <em>edit</em></div><div class="allo-lesson-section"><h3>🎯 Learning Objective</h3><p>By the end of this lesson, students will be able to <em>(use measurable verb: explain, identify, solve, create…)</em>.</p></div><div class="allo-lesson-section"><h3>📚 Standards</h3><ul><li>CCSS / NGSS / state standard reference here</li></ul></div><div class="allo-lesson-section"><h3>📦 Materials</h3><ul><li>Material 1</li><li>Material 2</li></ul></div><div class="allo-lesson-section"><h3>📖 Direct Instruction <em class="allo-lesson-time">(10 min)</em></h3><p>Teacher modeling, key vocabulary introduction, anchor chart…</p></div><div class="allo-lesson-section"><h3>👥 Guided Practice <em class="allo-lesson-time">(15 min)</em></h3><p>Partner or small-group work with teacher checking in…</p></div><div class="allo-lesson-section"><h3>✏️ Independent Practice <em class="allo-lesson-time">(15 min)</em></h3><p>Individual application of the skill…</p></div><div class="allo-lesson-section"><h3>📊 Assessment</h3><p>How will you know students met the objective? (exit ticket, rubric, observation…)</p></div><div class="allo-lesson-section"><h3>💭 Closure / Reflection <em class="allo-lesson-time">(5 min)</em></h3><p>Quick reflection prompt or share-out…</p></div><div class="allo-lesson-section allo-lesson-udl"><h3>🌈 UDL Considerations</h3><ul><li><strong>Multiple means of representation:</strong> visual + verbal + hands-on</li><li><strong>Multiple means of action / expression:</strong> students can show learning by writing, speaking, drawing, or building</li><li><strong>Multiple means of engagement:</strong> choice in topic / partner / format</li></ul></div></section>' },

                      // ── Interactive ──
                      { label: 'Data Table', icon: '📊', category: 'interactive', keywords: 'table data grid spreadsheet',
                        html: '<div class="allo-block allo-block-table" data-allo-block="table" data-header-style="default" data-zebra="on" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove table" title="Remove">×</button><figure><table aria-label="Data table"><caption>Table Title — Edit Me</caption><thead><tr><th scope="col">Header 1</th><th scope="col">Header 2</th><th scope="col">Header 3</th></tr></thead><tbody><tr><td>Data</td><td>Data</td><td>Data</td></tr><tr><td>Data</td><td>Data</td><td>Data</td></tr></tbody></table></figure><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Rows</span><button type="button" data-action="add-row">+ Row</button><button type="button" data-action="remove-row">− Row</button><span class="allo-control-label">Cols</span><button type="button" data-action="add-col">+ Col</button><button type="button" data-action="remove-col">− Col</button><span class="allo-control-label">Header</span><button type="button" data-action="table-header-default" aria-pressed="true">Light</button><button type="button" data-action="table-header-dark">Dark</button><button type="button" data-action="table-header-accent">Accent</button><button type="button" data-action="table-header-minimal">Minimal</button><span class="allo-control-label">Stripes</span><button type="button" data-action="table-zebra-toggle" aria-pressed="true">Zebra</button></div></div>' },

                      // ── Media ──
                      { label: 'Image', icon: '🖼️', category: 'media', keywords: 'image picture photo media',
                        html: '<figure class="allo-block allo-block-image" data-allo-block="image" tabindex="0" role="figure" aria-label="Image with description"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove image" title="Remove">×</button><div class="allo-img-placeholder"><span aria-hidden="true">🖼️</span><br/>Upload a file or paste an image URL below.</div><div class="allo-img-controls" contenteditable="false"><label class="allo-file-btn">Upload<input type="file" accept="image/*" class="allo-img-file-input" style="display:none" /></label><input type="url" class="allo-img-url-input" placeholder="https://image.url" autocomplete="url" aria-label="Image URL" /></div><figcaption>Image description for screen readers — edit this caption</figcaption></figure>' },
                      { label: 'Audio', icon: '🔊', category: 'media', keywords: 'audio sound music podcast pronunciation',
                        html: '<div class="allo-block allo-block-audio" data-allo-block="audio" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove audio" title="Remove">×</button><div class="allo-audio-label">Audio</div><audio controls aria-label="Audio recording"></audio><div class="allo-audio-controls" contenteditable="false"><label class="allo-file-btn">Upload<input type="file" accept="audio/*" class="allo-audio-file-input" style="display:none" /></label><input type="url" class="allo-audio-url-input" placeholder="https://audio.url" autocomplete="url" aria-label="Audio URL" /><button type="button" class="allo-audio-tts-btn" aria-label="Generate audio from transcript using AI text-to-speech" title="Generate audio from the transcript text" style="font-size:11px;background:#7c3aed;color:white;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-family:inherit;font-weight:600;">🎤 TTS from transcript</button></div><div class="allo-audio-transcript"><strong>Transcript:</strong> Edit this transcript to match the audio. Always provide a transcript for accessibility.</div></div>' },
                      { label: 'Video', icon: '📹', category: 'media', keywords: 'video youtube vimeo embed media',
                        html: '<div class="allo-block allo-block-video" data-allo-block="video" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove video" title="Remove">×</button><div class="allo-video-frame"><div class="allo-video-placeholder"><span aria-hidden="true">📹</span><br/>Paste a YouTube or Vimeo URL below.<br/><em style="font-size:11px;color:#475569;">Captions and transcript are required for accessibility.</em></div></div><div class="allo-video-controls allo-block-controls" contenteditable="false"><span class="allo-control-label">URL</span><input type="url" class="allo-video-url-input" placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…" autocomplete="url" aria-label="Video URL" style="flex:1;min-width:200px;font-size:12px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;" /><span class="allo-control-label">Title</span><input type="text" class="allo-video-title-input" placeholder="Short title for screen readers" aria-label="Video title for screen readers" style="flex:1;min-width:160px;font-size:12px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;" /></div><div class="allo-video-transcript"><strong>Transcript:</strong> Edit this transcript to match the video. Required for accessibility — students who can\'t hear the audio depend on this.</div></div>' },
                      { label: 'Math', icon: '➗', category: 'media', keywords: 'math equation latex formula katex',
                        html: (() => {
                          // Build optgroup'd formula library select
                          const groups = {};
                          Object.entries(_MATH_FORMULAS).forEach(([k, v]) => {
                            if (!groups[v.group]) groups[v.group] = [];
                            groups[v.group].push('<option value="' + k + '">' + v.label + '</option>');
                          });
                          const optgroups = Object.entries(groups)
                            .map(([g, opts]) => '<optgroup label="' + g + '">' + opts.join('') + '</optgroup>')
                            .join('');
                          return '<div class="allo-block allo-block-math" data-allo-block="math" tabindex="0" role="math" aria-label="Mathematical equation"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove equation" title="Remove">×</button><div class="allo-math-output">a² + b² = c²</div><div class="allo-math-input-wrap" contenteditable="false"><label>LaTeX</label><input type="text" class="allo-math-input" value="a^2 + b^2 = c^2" placeholder="e.g. \\frac{a}{b} or \\int_0^1 x^2 dx" /><span class="allo-math-status">Loading…</span></div><div class="allo-block-controls" contenteditable="false"><span class="allo-control-label">Library</span><select class="allo-math-formula-select" aria-label="Insert formula from library"><option value="">— Pick a formula —</option>' + optgroups + '</select></div></div>';
                        }) },
                      { label: 'Code', icon: '💻', category: 'media', keywords: 'code syntax programming snippet',
                        html: '<div class="allo-block allo-block-code-wrap" data-allo-block="code" tabindex="0"><button type="button" class="allo-block-remove" contenteditable="false" aria-label="Remove code" title="Remove">×</button><div class="allo-code-header" contenteditable="false"><label style="font-size:11px;color:#94a3b8;">Lang:</label><select class="allo-code-lang-select" aria-label="Programming language"><option value="python" selected>Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="html">HTML</option><option value="css">CSS</option><option value="java">Java</option><option value="csharp">C#</option><option value="cpp">C++</option><option value="c">C</option><option value="ruby">Ruby</option><option value="go">Go</option><option value="rust">Rust</option><option value="sql">SQL</option><option value="bash">Bash</option><option value="json">JSON</option><option value="markdown">Markdown</option><option value="plaintext">Plain text</option></select><button type="button" class="allo-code-copy-btn" aria-label="Copy code to clipboard" title="Copy code" style="font-size:11px;background:#475569;color:white;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-weight:600;margin-left:auto;">📋 Copy</button></div><pre><code class="language-python" aria-label="Code example"># Example code\nprint("Hello, world!")</code></pre></div>' },
                    ];

                    const _CAT_LABELS = { layout: '🎨 Layout', content: '📝 Content', educational: '🎓 Educational', interactive: '🖱️ Interactive', media: '📷 Media' };
                    const _CAT_ORDER = ['layout', 'content', 'educational', 'interactive', 'media'];

                    const _insertBlock = (block) => {
                      const iframe = pdfPreviewRef.current; if (!iframe) return;
                      const doc = iframe.contentDocument; if (!doc) return;
                      try { iframe.contentWindow.focus(); } catch (e) {}
                      try { doc.designMode = 'on'; } catch (e) {}
                      _ensureAlloBlocksReady(doc);
                      const sel = doc.getSelection();
                      if (!sel || sel.rangeCount === 0) {
                        const main = doc.querySelector('main') || doc.body;
                        const range = doc.createRange();
                        range.selectNodeContents(main); range.collapse(false);
                        sel.removeAllRanges(); sel.addRange(range);
                      }
                      const sentinelId = '__allo_ins_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                      const sentinel = '<span id="' + sentinelId + '" data-allo-sentinel="1">​</span>';
                      const html = (typeof block.html === 'function') ? block.html() : block.html;
                      doc.execCommand('insertHTML', false, sentinel + html);
                      const sent = doc.getElementById(sentinelId);
                      const newBlock = sent && sent.nextElementSibling;
                      if (sent) sent.remove();
                      if (newBlock) {
                        try { newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
                        if (newBlock.matches && newBlock.matches('[data-allo-block]')) {
                          if (!newBlock.hasAttribute('tabindex')) newBlock.setAttribute('tabindex', '-1');
                          setTimeout(() => { try { newBlock.focus({ preventScroll: false }); } catch (e) {} }, 60);
                        }
                        // Block-specific lazy-load triggers
                        const blockType = newBlock.getAttribute && newBlock.getAttribute('data-allo-block');
                        if (blockType === 'math') {
                          _ensureKatex(doc);
                          // Poll for window.katex availability (max 5s) then render.
                          // Slow connections may take >400ms to load KaTeX from CDN.
                          const inp = newBlock.querySelector('.allo-math-input');
                          const out = newBlock.querySelector('.allo-math-output');
                          const status = newBlock.querySelector('.allo-math-status');
                          let _kxAttempts = 0;
                          const _kxTry = () => {
                            try {
                              if (doc.defaultView && doc.defaultView.katex && inp && out) {
                                doc.defaultView.katex.render(inp.value, out, { throwOnError: false, displayMode: true });
                                if (status) status.textContent = 'Rendered';
                                return;
                              }
                            } catch (_) {}
                            if (++_kxAttempts < 25) {
                              setTimeout(_kxTry, 200);
                            } else if (status) {
                              status.textContent = 'KaTeX failed to load';
                            }
                          };
                          setTimeout(_kxTry, 100);
                        } else if (blockType === 'code') {
                          const codeEl = newBlock.querySelector('code');
                          _ensurePrism(doc, 'python', codeEl || undefined);
                        }
                      }
                      try {
                        const lr = doc.getElementById('allo-blocks-live');
                        if (lr) { lr.textContent = ''; setTimeout(() => { lr.textContent = 'Inserted ' + block.label; }, 30); }
                      } catch (_) {}
                      try { if (typeof addToast === 'function') addToast('Inserted: ' + block.label, 'success'); } catch (_) {}
                      try { if (typeof window.__alloflowOnPdfPreviewMutated === 'function') window.__alloflowOnPdfPreviewMutated(); } catch (_) {}
                      // Track recently used (session-only; max 5; dedup; most-recent-first)
                      try { setInsertBlockRecent(prev => [block.label, ...prev.filter(l => l !== block.label)].slice(0, 5)); } catch (_) {}
                    };

                    // ── Filter logic ──
                    const f = (insertBlockFilter || '').toLowerCase().trim();
                    const visible = f ? blocks.filter(b => b.label.toLowerCase().includes(f) || (b.keywords && b.keywords.toLowerCase().includes(f))) : blocks;

                    // Translation helper — uses LanguageContext t() with English fallback.
                    // Block label key: lowercased, '_' for spaces and '&'.
                    const _bt = (label) => {
                      const key = 'docbuilder.block.' + String(label).toLowerCase().replace(/[\s&]+/g, '_');
                      const out = (typeof t === 'function') ? t(key) : null;
                      return (out && out !== key) ? out : label;
                    };
                    const _ct = (cat) => {
                      const key = 'docbuilder.cat.' + cat;
                      const out = (typeof t === 'function') ? t(key) : null;
                      return (out && out !== key) ? out : _CAT_LABELS[cat];
                    };

                    // Roving keyboard navigation across all picker buttons (works across categories + Recent).
                    const _onPickerKey = (e) => {
                      if (!insertBlockPickerRef.current) return;
                      const buttons = Array.from(insertBlockPickerRef.current.querySelectorAll('button[data-allo-pick]'));
                      if (buttons.length === 0) return;
                      const idx = buttons.indexOf(document.activeElement);
                      if (idx === -1) return;
                      let next = -1;
                      if (e.key === 'ArrowRight') next = (idx + 1) % buttons.length;
                      else if (e.key === 'ArrowLeft') next = (idx - 1 + buttons.length) % buttons.length;
                      else if (e.key === 'ArrowDown') next = Math.min(idx + 2, buttons.length - 1);
                      else if (e.key === 'ArrowUp') next = Math.max(idx - 2, 0);
                      else if (e.key === 'Home') next = 0;
                      else if (e.key === 'End') next = buttons.length - 1;
                      else return;
                      e.preventDefault();
                      buttons[next] && buttons[next].focus();
                    };

                    return (
                      <div ref={insertBlockPickerRef} className="space-y-1.5" onKeyDown={_onPickerKey}>
                        <input type="search" value={insertBlockFilter} onChange={e => setInsertBlockFilter(e.target.value)}
                          placeholder={(typeof t === 'function' && t('docbuilder.search_placeholder') !== 'docbuilder.search_placeholder' && t('docbuilder.search_placeholder')) || (`Search ${blocks.length} blocks…`)}
                          aria-label={(typeof t === 'function' && t('docbuilder.search_aria') !== 'docbuilder.search_aria' && t('docbuilder.search_aria')) || 'Search blocks'}
                          className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-400 rounded-lg text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none" />
                        {f && visible.length === 0 && (
                          <div className="text-[11px] text-slate-500 italic px-2 py-1">No blocks match "{insertBlockFilter}"</div>
                        )}
                        {/* Recent row — only when no active filter and at least 1 recent */}
                        {!f && insertBlockRecent.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold text-indigo-700 px-1 py-0.5 uppercase tracking-wider">⏱ {_ct('recent')}</div>
                            <div className="grid grid-cols-2 gap-1 mt-0.5">
                              {insertBlockRecent.map(label => {
                                const block = blocks.find(b => b.label === label);
                                if (!block) return null;
                                const dispLabel = _bt(block.label);
                                return (
                                  <button key={'recent-' + label} type="button" data-allo-pick="1" onClick={() => _insertBlock(block)}
                                    className="text-[11px] font-bold text-indigo-700 px-1.5 py-2 bg-indigo-50 border border-indigo-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-100 transition-colors text-left min-h-[36px]"
                                    aria-label={`Insert ${dispLabel}`} title={`Insert ${dispLabel}`}>
                                    {block.icon} {dispLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {_CAT_ORDER.map(cat => {
                          const catBlocks = visible.filter(b => b.category === cat);
                          if (catBlocks.length === 0) return null;
                          const isOpen = !!insertBlockOpenCats[cat];
                          return (
                            <div key={cat}>
                              <button type="button" onClick={() => setInsertBlockOpenCats(p => ({ ...p, [cat]: !p[cat] }))}
                                aria-expanded={isOpen} aria-controls={`allo-cat-${cat}`}
                                className="w-full flex items-center justify-between text-[10px] font-bold text-slate-600 px-1 py-0.5 hover:text-indigo-700 transition-colors uppercase tracking-wider">
                                <span>{_ct(cat)} <span className="text-slate-600 font-normal">({catBlocks.length})</span></span>
                                <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                              </button>
                              {isOpen && (
                                <div id={`allo-cat-${cat}`} className="grid grid-cols-2 gap-1 mt-0.5">
                                  {catBlocks.map(block => {
                                    const dispLabel = _bt(block.label);
                                    return (
                                      <button key={block.label} type="button" data-allo-pick="1" onClick={() => _insertBlock(block)}
                                        className="text-[11px] font-bold text-slate-600 px-1.5 py-2 bg-white border border-slate-400 rounded-lg hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-colors text-left min-h-[36px]"
                                        aria-label={`Insert ${dispLabel}`} title={`Insert ${dispLabel}`}>
                                        {block.icon} {dispLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="text-[9px] text-slate-600 italic px-1 pt-0.5" aria-hidden="true">↑↓←→ Home End to navigate · Enter to insert</div>
                      </div>
                    );
                  })()}

                  <div className="text-[11px] font-bold text-slate-600 uppercase mt-2">Spacing</div>
                  <div className="flex gap-1">
                    {[
                      { label: 'Compact', val: '0.25rem' },
                      { label: 'Normal', val: '0.75rem' },
                      { label: 'Relaxed', val: '1.5rem' },
                      { label: 'Spacious', val: '2.5rem' },
                    ].map(sp => (
                      <button key={sp.label} onClick={() => {
                        const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                        doc.querySelectorAll('p, li, h2, h3, h4, table, figure, blockquote, div').forEach(el => {
                          el.style.marginBottom = sp.val;
                        });
                      }} className="flex-1 text-[11px] font-bold text-slate-600 py-1 bg-white border border-slate-400 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        title={sp.label}>{sp.label}</button>
                    ))}
                  </div>

                  <div className="text-[11px] font-bold text-slate-600 uppercase mt-2">{t('pdf_audit.layout.header_branding') || 'Header / Branding'}</div>
                  <button onClick={() => {
                    const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                    const existing = doc.getElementById('doc-header-brand');
                    if (existing) { existing.remove(); return; }
                    const header = doc.createElement('div');
                    header.id = 'doc-header-brand';
                    header.contentEditable = 'true';
                    header.style.cssText = 'background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:20px 24px;border-radius:12px;margin-bottom:24px;display:flex;align-items:center;gap:16px;';
                    header.innerHTML = '<div style="font-size:28px">🏛️</div><div><div style="font-size:18px;font-weight:bold">Institution Name</div><div style="font-size:12px;opacity:0.8">Department · Document Title · Date</div></div>';
                    const main = doc.querySelector('main') || doc.body;
                    main.insertBefore(header, main.firstChild);
                    addToast('Header added — click to edit text, click again to remove', 'info');
                  }} className="w-full text-[11px] font-bold text-slate-600 py-1.5 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                    🏛️ Toggle Document Header
                  </button>

                  <button onClick={() => {
                    const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                    const existing = doc.getElementById('doc-footer-brand');
                    if (existing) { existing.remove(); return; }
                    const footer = doc.createElement('div');
                    footer.id = 'doc-footer-brand';
                    footer.contentEditable = 'true';
                    footer.style.cssText = 'border-top:2px solid #e2e8f0;padding:12px 0;margin-top:32px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;';
                    footer.innerHTML = '<span>Institution Name · Confidential</span><span>Page __</span>';
                    (doc.querySelector('main') || doc.body).appendChild(footer);
                    addToast('Footer added — click to edit', 'info');
                  }} className="w-full text-[11px] font-bold text-slate-600 py-1.5 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                    📋 Toggle Document Footer
                  </button>

                  <div className="text-[11px] font-bold text-slate-600 uppercase mt-2">Templates</div>
                  <select onChange={(e) => {
                    if (!e.target.value) return;
                    const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                    const templates = {
                      'syllabus': 'body{font-family:Georgia,serif;max-width:750px} h1{border-bottom:3px solid #1e3a5f;padding-bottom:8px;color:#1e3a5f} h2{color:#1e3a5f;margin-top:2em;border-left:4px solid #2563eb;padding-left:12px} table{width:100%} th{background:#1e3a5f;color:white}',
                      'handout': 'body{font-family:system-ui;max-width:700px} h1{text-align:center;color:#7c3aed;font-size:1.8em} h2{color:#7c3aed;background:#f5f3ff;padding:8px 12px;border-radius:6px} ul{list-style-type:disc}',
                      'worksheet': 'body{font-family:system-ui;max-width:700px} h1{text-align:center;border:2px solid #0891b2;padding:12px;border-radius:8px;color:#0891b2;background:#ecfeff} h2{color:#0891b2} p{line-height:2.2}',
                      'newsletter': 'body{font-family:Georgia,serif;max-width:800px;columns:2;column-gap:24px} h1{column-span:all;text-align:center;color:#dc2626;border-bottom:3px double #dc2626;padding-bottom:8px} h2{color:#dc2626;break-after:avoid} p{text-align:justify}',
                      'report': 'body{font-family:"Times New Roman",serif;max-width:700px;font-size:12pt} h1{text-align:center;font-size:14pt;text-transform:uppercase} h2{font-size:12pt;font-weight:bold;text-decoration:underline} p{text-indent:0.5in;text-align:justify;line-height:2}',
                      'accessible': 'body{font-family:"Atkinson Hyperlegible",system-ui;max-width:700px;font-size:1.1rem;line-height:1.8;letter-spacing:0.02em} h1{color:#000;font-size:1.75rem} h2{color:#000;font-size:1.3rem} a{color:#0000ff;text-decoration:underline} th{background:#000;color:#fff}',
                      'iep': 'body{font-family:"Inter",system-ui;max-width:750px;font-size:13px;line-height:1.6} h1{font-size:16px;text-align:center;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:4px} h2{font-size:13px;font-weight:bold;background:#f1f5f9;padding:6px 10px;border-left:3px solid #1e3a5f;margin-top:1.5em} table{width:100%;font-size:12px} th{background:#1e3a5f;color:white;padding:6px 8px;text-align:left} td{padding:6px 8px;border-bottom:1px solid #e5e7eb} .section{page-break-inside:avoid;margin-bottom:1em} @media print{body{font-size:11px;max-width:100%}}',
                      'intervention': 'body{font-family:system-ui;max-width:700px;font-size:14px} h1{color:#7c3aed;text-align:center;font-size:1.4em;border:2px solid #7c3aed;padding:12px;border-radius:10px;background:#faf5ff} h2{color:#7c3aed;font-size:1.1em;margin-top:1.5em;border-bottom:2px solid #e9d5ff;padding-bottom:4px} table{width:100%} th{background:#7c3aed;color:white} ul{list-style:none;padding-left:0} li:before{content:"✓ ";color:#7c3aed;font-weight:bold}',
                      'parentletter': 'body{font-family:Georgia,serif;max-width:650px;font-size:14px;line-height:1.8} h1{font-size:1.3em;color:#1e3a5f;margin-bottom:0.25em} h2{font-size:1.1em;color:#1e3a5f;margin-top:1.5em} p{margin-bottom:1em} .section{background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:12px 0} @media print{body{font-size:12pt}}',
                    };
                    const css = templates[e.target.value];
                    if (css) {
                      const existing = doc.getElementById('template-style'); if (existing) existing.remove();
                      const style = doc.createElement('style');
                      style.id = 'template-style';
                      style.textContent = css;
                      doc.head.appendChild(style);
                      addToast('Template applied: ' + e.target.value, 'success');
                    }
                    e.target.value = '';
                  }} className="w-full text-[11px] border border-slate-400 rounded-lg px-2 py-1.5 bg-white text-slate-600" aria-label={t('pdf_audit.templates.aria') || 'Document template'} defaultValue="">
                    <option value="" disabled>{t('pdf_audit.templates.apply_placeholder') || 'Apply template...'}</option>
                    <option value="syllabus">📚 Syllabus</option>
                    <option value="handout">📝 Handout</option>
                    <option value="worksheet">✏️ Worksheet</option>
                    <option value="newsletter">📰 Newsletter</option>
                    <option value="report">📋 Formal Report</option>
                    <option value="accessible">♿ Maximum Accessibility</option>
                    <option value="iep">📋 IEP / Progress Report</option>
                    <option value="intervention">🎯 Intervention Plan</option>
                    <option value="parentletter">👪 Parent Communication</option>
                  </select>

                  {/* Load saved accessibility templates */}
                  {(() => {
                    let savedTemplates = [];
                    try { savedTemplates = JSON.parse(localStorage.getItem('alloflow_templates') || '[]'); } catch(e) {}
                    return savedTemplates.length > 0 ? (
                      <div className="mt-1.5">
                        <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">{t('pdf_audit.templates.saved_heading') || 'Saved Accessible Templates'}</div>
                        <div className="space-y-1">
                          {savedTemplates.map((tmpl, i) => (
                            <button key={i} onClick={() => {
                              const doc = (exportPreviewRef.current || pdfPreviewRef.current)?.contentDocument;
                              if (!doc) return;
                              let html = `<!DOCTYPE html><html lang="${tmpl.lang || 'en'}"><head><meta charset="UTF-8"><title>${tmpl.name}</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:${tmpl.styles?.fontFamily || 'system-ui, sans-serif'};max-width:800px;margin:0 auto;padding:2rem;line-height:1.7;color:#1e293b}h1,h2,h3{color:${tmpl.styles?.headingColor || '#1e293b'}}table{width:100%;border-collapse:collapse;margin:1rem 0}th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:700;border:1px solid #e2e8f0}td{padding:8px 12px;border:1px solid #e2e8f0}@media print{body{max-width:100%}}</style></head><body>`;
                              html += '<a href="#main-content" class="sr-only" style="position:absolute;left:-9999px">Skip to main content</a>';
                              html += '<main id="main-content" role="main">';
                              tmpl.structure.forEach(s => {
                                if (s.type === 'heading') {
                                  html += `<h${s.level}>${s.text || '[Section Title]'}</h${s.level}>\n<p>[Content for this section]</p>\n`;
                                } else if (s.type === 'table') {
                                  html += `<table role="table"><caption>${s.caption || '[Table Description]'}</caption><thead><tr>`;
                                  (s.headers || ['Column 1', 'Column 2', 'Column 3']).forEach(h => { html += `<th scope="col">${h}</th>`; });
                                  html += '</tr></thead><tbody>';
                                  for (let r = 0; r < Math.min(s.rowCount || 3, 5); r++) {
                                    html += '<tr>' + (s.headers || ['','','']).map(() => '<td>[Data]</td>').join('') + '</tr>';
                                  }
                                  html += '</tbody></table>\n';
                                } else if (s.type === 'list') {
                                  const tag = s.ordered ? 'ol' : 'ul';
                                  html += `<${tag} role="list">`;
                                  for (let li = 0; li < Math.min(s.itemCount || 3, 8); li++) { html += '<li>[List item]</li>'; }
                                  html += `</${tag}>\n`;
                                }
                              });
                              html += '</main></body></html>';
                              doc.open(); doc.write(html); doc.close();
                              try { doc.designMode = 'on'; } catch(e) {}
                              addToast('📐 Template "' + tmpl.name + '" applied — click any text to edit', 'success');
                            }} className="w-full text-[11px] font-bold text-amber-700 py-1.5 bg-amber-50 border border-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-left px-2 flex items-center justify-between">
                              <span>📐 {tmpl.name}</span>
                              <span className="text-[11px] text-amber-700">{tmpl.structure?.filter(s => s.type === 'heading').length || 0} sections</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Upload template JSON file */}
                  <label className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed border-amber-300 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors">
                    📂 Load Template File (.json)
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const tmpl = JSON.parse(ev.target.result);
                          if (tmpl.type !== 'alloflow-template' || !tmpl.structure) { addToast('Invalid template file', 'error'); return; }
                          try {
                            const saved = JSON.parse(localStorage.getItem('alloflow_templates') || '[]');
                            if (!saved.some(s => s.name === tmpl.name)) { saved.push(tmpl); localStorage.setItem('alloflow_templates', JSON.stringify(saved)); }
                          } catch(e) {}
                          addToast('📐 Template "' + tmpl.name + '" loaded! It now appears in Saved Templates above.', 'success');
                        } catch(err) { addToast('Failed to load template: ' + err.message, 'error'); }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </details>

              {/* Document Stats & Readability */}
              <details className="group">
                <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">
                  📊 Stats & Readability <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                </summary>
                <div className="mt-1.5 bg-slate-50 rounded-lg p-2 border border-slate-400 space-y-2">
                  <button onClick={() => {
                    const doc = pdfPreviewRef.current?.contentDocument;
                    const text = doc?.body?.textContent || '';
                    if (!text.trim()) { addToast('No content to analyze', 'info'); return; }
                    const words = text.split(/\s+/).filter(w => w.length > 0);
                    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
                    const syllables = words.reduce((sum, w) => {
                      const s = w.toLowerCase().replace(/[^a-z]/g, '');
                      if (s.length <= 3) return sum + 1;
                      let c = s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
                      return sum + (c ? c.length : 1);
                    }, 0);
                    const avgWords = sentences.length > 0 ? words.length / sentences.length : 0;
                    const avgSyllables = words.length > 0 ? syllables / words.length : 0;
                    const fkGrade = Math.max(0, Math.round((0.39 * avgWords + 11.8 * avgSyllables - 15.59) * 10) / 10);
                    const fkEase = Math.max(0, Math.round((206.835 - 1.015 * avgWords - 84.6 * avgSyllables) * 10) / 10);
                    const chars = text.replace(/\s/g, '').length;
                    const headings = doc?.querySelectorAll('h1,h2,h3,h4,h5,h6')?.length || 0;
                    const images = doc?.querySelectorAll('img')?.length || 0;
                    const tables = doc?.querySelectorAll('table')?.length || 0;
                    const links = doc?.querySelectorAll('a[href]')?.length || 0;
                    const easeLabel = fkEase >= 80 ? '🟢 Easy' : fkEase >= 60 ? '🟡 Standard' : fkEase >= 40 ? '🟠 Difficult' : '🔴 Very Difficult';
                    const statsEl = doc.getElementById('alloflow-stats-overlay');
                    if (statsEl) { statsEl.remove(); return; }
                    const overlay = doc.createElement('div');
                    overlay.id = 'alloflow-stats-overlay';
                    overlay.style.cssText = 'position:fixed;bottom:16px;right:16px;background:white;border:2px solid #6366f1;border-radius:12px;padding:16px;font-family:system-ui;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:99999;max-width:280px;';
                    overlay.innerHTML = `<div style="font-weight:800;font-size:14px;color:#1e293b;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">📊 Document Stats <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer;color:#94a3b8;font-size:18px">&times;</span></div>` +
                      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">` +
                      `<div style="background:#f1f5f9;padding:8px;border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:#1e293b">${words.length.toLocaleString()}</div><div style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase">Words</div></div>` +
                      `<div style="background:#f1f5f9;padding:8px;border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:#1e293b">${sentences.length}</div><div style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase">Sentences</div></div>` +
                      `<div style="background:#f1f5f9;padding:8px;border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:#1e293b">${chars.toLocaleString()}</div><div style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase">Characters</div></div>` +
                      `<div style="background:#f1f5f9;padding:8px;border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:#1e293b">${Math.ceil(words.length / 250)}</div><div style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase">~Pages</div></div>` +
                      `</div>` +
                      `<div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);padding:10px;border-radius:8px;margin-bottom:8px">` +
                      `<div style="font-weight:800;color:#4338ca;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Reading Level</div>` +
                      `<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:22px;font-weight:900;color:#1e293b">Grade ${fkGrade}</span><span style="font-size:11px;font-weight:600;color:#64748b">${easeLabel}</span></div>` +
                      `<div style="font-size:10px;color:#6366f1;margin-top:2px">Flesch-Kincaid | Ease: ${fkEase}/100</div>` +
                      `</div>` +
                      `<div style="font-size:10px;color:#64748b;display:flex;flex-wrap:wrap;gap:6px">` +
                      `<span>📑 ${headings} headings</span><span>🖼️ ${images} images</span><span>📊 ${tables} tables</span><span>🔗 ${links} links</span>` +
                      `</div>`;
                    doc.body.appendChild(overlay);
                  }} className="w-full text-[11px] font-bold text-slate-600 py-1.5 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                    📊 Toggle Reading Level & Stats
                  </button>
                  <button onClick={async () => {
                    const doc = pdfPreviewRef.current?.contentDocument;
                    if (!doc) return;
                    const issues = [];
                    doc.querySelectorAll('img').forEach((img, i) => { if (!img.alt || img.alt.trim() === '') issues.push('🖼️ Image ' + (i+1) + ': missing alt text'); });
                    const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));
                    let prevLevel = 0;
                    headings.forEach(h => { const level = parseInt(h.tagName[1]); if (level > prevLevel + 1 && prevLevel > 0) issues.push('📑 Heading skip: h' + prevLevel + ' → h' + level + ' ("' + h.textContent.substring(0,30) + '...")'); prevLevel = level; });
                    doc.querySelectorAll('table').forEach((tbl, i) => { if (!tbl.querySelector('th') && !tbl.querySelector('thead')) issues.push('📊 Table ' + (i+1) + ': no header cells (th)'); if (!tbl.querySelector('caption') && !tbl.getAttribute('aria-label')) issues.push('📊 Table ' + (i+1) + ': no caption or aria-label'); });
                    doc.querySelectorAll('a[href]').forEach((a, i) => { const txt = a.textContent.trim().toLowerCase(); if (['click here','here','link','read more','more'].includes(txt)) issues.push('🔗 Link ' + (i+1) + ': vague text "' + txt + '"'); });
                    if (issues.length === 0) { addToast('✅ No common accessibility issues found!', 'success'); return; }
                    const fixable = issues.length;
                    addToast('⚠️ Found ' + fixable + ' accessibility issue' + (fixable !== 1 ? 's' : ''), 'info');
                    const overlay = doc.getElementById('a11y-quick-report') || doc.createElement('div');
                    overlay.id = 'a11y-quick-report';
                    overlay.style.cssText = 'position:fixed;top:16px;right:16px;background:white;border:2px solid #f59e0b;border-radius:12px;padding:16px;font-family:system-ui;font-size:11px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:99999;max-width:320px;max-height:60vh;overflow-y:auto;';
                    overlay.innerHTML = '<div style="font-weight:800;font-size:13px;color:#92400e;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">⚠️ A11y Quick Check (' + fixable + ') <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer;color:#94a3b8;font-size:18px">&times;</span></div>' +
                      issues.map(i => '<div style="padding:4px 0;border-bottom:1px solid #fef3c7;line-height:1.4">' + i + '</div>').join('');
                    doc.body.appendChild(overlay);
                  }} className="w-full text-[11px] font-bold text-slate-600 py-1.5 bg-white border border-slate-400 rounded-lg hover:bg-amber-50 hover:text-amber-700 transition-colors">
                    ♿ Quick A11y Check
                  </button>
                  <button onClick={async () => {
                    const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                    const images = Array.from(doc.querySelectorAll('img'));
                    const needsAlt = images.filter(img => !img.alt || img.alt.trim() === '' || img.alt === 'undefined');
                    if (images.length === 0) { addToast('No images found in document', 'info'); return; }
                    if (needsAlt.length === 0) { addToast('✅ All ' + images.length + ' images already have alt text!', 'success'); return; }
                    addToast('🔍 Generating alt text for ' + needsAlt.length + ' image(s)...', 'info');
                    let fixed = 0;
                    for (const img of needsAlt) {
                      try {
                        if (!img.src || (!img.src.startsWith('data:') && !img.src.startsWith('blob:'))) {
                          img.alt = 'Decorative image';
                          fixed++;
                          continue;
                        }
                        const base64 = img.src.split(',')[1];
                        if (!base64 || !callGeminiVision) {
                          img.alt = 'Image — description pending';
                          fixed++;
                          continue;
                        }
                        const mimeType = img.src.match(/data:([^;]+)/)?.[1] || 'image/png';
                        const description = await callGeminiVision(
                          'Describe this image in one concise sentence for a screen reader alt text attribute. Be specific and descriptive. Do not start with "Image of" or "Picture of". Just describe what is shown. Max 120 characters.',
                          base64, mimeType
                        );
                        if (description) {
                          img.alt = description.replace(/^["']|["']$/g, '').trim().substring(0, 150);
                          const figcap = img.closest('figure')?.querySelector('figcaption');
                          if (figcap && (!figcap.textContent || figcap.textContent.trim() === '' || figcap.textContent.includes('description'))) {
                            figcap.textContent = img.alt;
                          }
                          fixed++;
                        }
                      } catch(e) { warnLog('[Alt Gen] Failed for image:', e); img.alt = 'Image'; fixed++; }
                    }
                    addToast('✅ Generated alt text for ' + fixed + '/' + needsAlt.length + ' images', 'success');
                  }} className="w-full text-[11px] font-bold text-slate-600 py-1.5 bg-white border border-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    🖼️ Auto-Generate Alt Text (AI)
                  </button>
                </div>
              </details>

              {/* Accessibility Compliance Statement */}
              <button onClick={() => {
                const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                const existing = doc.getElementById('a11y-compliance-statement');
                if (existing) { existing.remove(); addToast('Compliance statement removed', 'info'); return; }
                const imgs = doc.querySelectorAll('img');
                const imgsWithAlt = Array.from(imgs).filter(i => i.alt && i.alt.trim()).length;
                const headings = doc.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
                const tables = doc.querySelectorAll('table').length;
                const tablesWithHeaders = Array.from(doc.querySelectorAll('table')).filter(t => t.querySelector('th')).length;
                const links = doc.querySelectorAll('a[href]').length;
                const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const stmt = doc.createElement('div');
                stmt.id = 'a11y-compliance-statement';
                stmt.style.cssText = 'margin-top:40px;padding:20px 24px;border:2px solid #6366f1;border-radius:12px;background:linear-gradient(135deg,#eef2ff,#f5f3ff);font-family:system-ui;page-break-inside:avoid;';
                stmt.innerHTML = `
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                    <span style="font-size:24px">♿</span>
                    <div>
                      <div style="font-weight:800;font-size:14px;color:#312e81">Accessibility Compliance Statement</div>
                      <div style="font-size:11px;color:#6366f1">WCAG 2.1 Level AA · ADA Title II · Section 508</div>
                    </div>
                  </div>
                  <p style="font-size:12px;color:#374151;line-height:1.6;margin-bottom:12px">
                    This document was created with accessibility as a core design principle using AlloFlow's
                    WCAG-compliant document pipeline. The following accessibility measures have been applied:
                  </p>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
                    <div style="background:white;padding:8px 12px;border-radius:6px;border:1px solid #e0e7ff;font-size:11px">
                      <strong style="color:#4338ca">Images:</strong> <span style="color:#374151">${imgsWithAlt}/${imgs.length} with alt text</span>
                    </div>
                    <div style="background:white;padding:8px 12px;border-radius:6px;border:1px solid #e0e7ff;font-size:11px">
                      <strong style="color:#4338ca">Headings:</strong> <span style="color:#374151">${headings} semantic headings</span>
                    </div>
                    <div style="background:white;padding:8px 12px;border-radius:6px;border:1px solid #e0e7ff;font-size:11px">
                      <strong style="color:#4338ca">Tables:</strong> <span style="color:#374151">${tablesWithHeaders}/${tables} with headers</span>
                    </div>
                    <div style="background:white;padding:8px 12px;border-radius:6px;border:1px solid #e0e7ff;font-size:11px">
                      <strong style="color:#4338ca">Links:</strong> <span style="color:#374151">${links} hyperlinks</span>
                    </div>
                  </div>
                  <ul style="font-size:11px;color:#374151;line-height:1.8;padding-left:20px;margin:0 0 12px">
                    <li>Semantic HTML structure with proper heading hierarchy</li>
                    <li>Color contrast ratios meeting WCAG 2.1 AA (4.5:1 minimum)</li>
                    <li>Screen reader compatible with ARIA landmarks where appropriate</li>
                    <li>Keyboard navigable content structure</li>
                    <li>Print-optimized layout preserving reading order</li>
                  </ul>
                  <div style="font-size:10px;color:#6366f1;border-top:1px solid #c7d2fe;padding-top:8px;display:flex;justify-content:space-between">
                    <span>Generated: ${date}</span>
                    <span>AlloFlow Document Pipeline v2.0</span>
                  </div>
                `;
                (doc.querySelector('main') || doc.body).appendChild(stmt);
                addToast('♿ Accessibility compliance statement added', 'success');
              }} className="w-full text-[11px] font-bold text-slate-600 py-2 bg-white border border-slate-400 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center justify-center gap-1.5">
                ♿ Insert Compliance Statement
              </button>

              {/* Auto Table of Contents */}
              <button onClick={() => {
                const doc = pdfPreviewRef.current?.contentDocument;
                if (!doc) return;
                const existing = doc.getElementById('alloflow-toc');
                if (existing) { existing.remove(); addToast('Table of contents removed', 'info'); return; }
                const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4'));
                if (headings.length < 2) { addToast('Need at least 2 headings to generate a TOC', 'info'); return; }
                headings.forEach((h, i) => { if (!h.id) h.id = 'toc-heading-' + i; });
                const tocItems = headings.map((h, i) => {
                  const level = parseInt(h.tagName[1]);
                  const indent = (level - 1) * 16;
                  const num = (() => {
                    const counts = [0,0,0,0];
                    for (let j = 0; j <= i; j++) {
                      const l = parseInt(headings[j].tagName[1]) - 1;
                      counts[l]++;
                      for (let k = l + 1; k < 4; k++) counts[k] = 0;
                    }
                    return counts.slice(0, level).filter(c => c > 0).join('.');
                  })();
                  const text = h.textContent.trim().substring(0, 60) + (h.textContent.length > 60 ? '...' : '');
                  return '<a href="#' + h.id + '" style="display:flex;align-items:baseline;gap:6px;padding:4px 0 4px ' + indent + 'px;color:#1e293b;text-decoration:none;font-size:' + (level === 1 ? '13px' : '12px') + ';font-weight:' + (level === 1 ? '700' : '400') + ';border-bottom:1px dotted #e2e8f0;transition:background 0.15s" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'transparent\'"><span style="color:#6366f1;font-weight:600;font-size:11px;min-width:20px">' + num + '</span><span>' + text + '</span></a>';
                }).join('');
                const toc = doc.createElement('nav');
                toc.id = 'alloflow-toc';
                toc.setAttribute('role', 'navigation');
                toc.setAttribute('aria-label', 'Table of Contents');
                toc.style.cssText = 'background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #c7d2fe;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;page-break-after:always;';
                toc.innerHTML = '<div style="font-weight:800;font-size:14px;color:#4338ca;margin-bottom:8px;display:flex;align-items:center;gap:6px">📑 Table of Contents</div>' + tocItems +
                  '<div style="font-size:9px;color:#94a3b8;margin-top:8px;text-align:right">Auto-generated · Click headings to navigate</div>';
                const main = doc.querySelector('main') || doc.body;
                main.insertBefore(toc, main.firstChild);
                addToast('📑 Table of contents added — click to remove', 'success');
              }} className="w-full text-[11px] font-bold text-slate-600 py-2 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1.5">
                📑 Toggle Table of Contents
              </button>

              {/* Watermark / Draft Stamp */}
              <details className="group">
                <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">
                  🔒 Watermark & Stamps <span className="text-[11px] text-slate-600 group-open:hidden">▸</span>
                </summary>
                <div className="mt-1.5 bg-slate-50 rounded-lg p-2 border border-slate-400 space-y-1">
                  {[
                    { label: 'DRAFT', color: '#ef4444', opacity: 0.08 },
                    { label: 'CONFIDENTIAL', color: '#7c3aed', opacity: 0.07 },
                    { label: 'FINAL', color: '#16a34a', opacity: 0.08 },
                    { label: 'SAMPLE', color: '#2563eb', opacity: 0.08 },
                    { label: 'DO NOT DISTRIBUTE', color: '#dc2626', opacity: 0.06 },
                  ].map(wm => (
                    <button key={wm.label} onClick={() => {
                      const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                      const existing = doc.getElementById('alloflow-watermark');
                      if (existing && existing.dataset.label === wm.label) { existing.remove(); addToast('Watermark removed', 'info'); return; }
                      if (existing) existing.remove();
                      const el = doc.createElement('div');
                      el.id = 'alloflow-watermark';
                      el.dataset.label = wm.label;
                      el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:120px;font-weight:900;color:' + wm.color + ';opacity:' + wm.opacity + ';pointer-events:none;z-index:9998;white-space:nowrap;letter-spacing:8px;font-family:system-ui;user-select:none;';
                      el.textContent = wm.label;
                      doc.body.appendChild(el);
                      addToast('Watermark "' + wm.label + '" added — click again to remove', 'success');
                    }} className="w-full text-[11px] font-bold text-slate-600 py-1.5 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left px-2"
                      aria-label={`Toggle ${wm.label} watermark`}>
                      🔒 {wm.label}
                    </button>
                  ))}
                  <div className="border-t border-slate-200 pt-1.5 mt-1">
                    <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">{t('pdf_audit.version_stamp.heading') || 'Version Stamp'}</div>
                    {[
                      { label: 'Version 1.0', icon: '📌' },
                      { label: 'Revised ' + new Date().toLocaleDateString(), icon: '📝' },
                      { label: 'Approved ' + new Date().toLocaleDateString(), icon: '✅' },
                    ].map(stamp => (
                      <button key={stamp.label} onClick={() => {
                        const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                        const existing = doc.getElementById('alloflow-version-stamp');
                        if (existing) existing.remove();
                        const el = doc.createElement('div');
                        el.id = 'alloflow-version-stamp';
                        el.style.cssText = 'position:fixed;top:12px;right:12px;background:white;border:2px solid #6366f1;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;color:#4338ca;font-family:system-ui;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.1);';
                        el.textContent = stamp.icon + ' ' + stamp.label;
                        doc.body.appendChild(el);
                        addToast('Version stamp added', 'success');
                      }} className="w-full text-[11px] font-bold text-slate-600 py-1 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left px-2 mb-0.5">
                        {stamp.icon} {stamp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </details>

              {/* Bilingual Side-by-Side Layout */}
              <button onClick={() => {
                const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                const existing = doc.getElementById('bilingual-style');
                if (existing) { existing.remove(); addToast('Bilingual layout removed — content restored to single column', 'info'); return; }
                const main = doc.querySelector('main') || doc.body;
                const sections = Array.from(main.querySelectorAll('.section, section, article, [class*="resource"]'));
                if (sections.length === 0) { addToast('No content sections found to arrange', 'info'); return; }
                const style = doc.createElement('style');
                style.id = 'bilingual-style';
                style.textContent = `
                  .bilingual-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafafa; page-break-inside: avoid; }
                  .bilingual-col { padding: 0; }
                  .bilingual-col-header { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #e0e7ff; }
                  .bilingual-divider { width: 1px; background: #cbd5e1; margin: 0 -10px; }
                  @media print { .bilingual-row { border: 1px solid #ddd; } }
                `;
                doc.head.appendChild(style);
                sections.forEach(section => {
                  const wrapper = doc.createElement('div');
                  wrapper.className = 'bilingual-row';
                  const leftCol = doc.createElement('div');
                  leftCol.className = 'bilingual-col';
                  const leftHeader = doc.createElement('div');
                  leftHeader.className = 'bilingual-col-header';
                  leftHeader.textContent = '🇺🇸 English';
                  leftCol.appendChild(leftHeader);
                  const clone = section.cloneNode(true);
                  leftCol.appendChild(clone);
                  const rightCol = doc.createElement('div');
                  rightCol.className = 'bilingual-col';
                  const rightHeader = doc.createElement('div');
                  rightHeader.className = 'bilingual-col-header';
                  rightHeader.textContent = '🌐 Translation';
                  rightCol.appendChild(rightHeader);
                  const placeholder = doc.createElement('div');
                  placeholder.contentEditable = 'true';
                  placeholder.style.cssText = 'min-height:60px;padding:12px;background:#f0f9ff;border:1px dashed #93c5fd;border-radius:6px;color:#64748b;font-style:italic;font-size:13px;line-height:1.6;';
                  placeholder.textContent = 'Paste or type translation here...';
                  placeholder.onfocus = function() { if (this.textContent === 'Paste or type translation here...') this.textContent = ''; this.style.color = '#1e293b'; this.style.fontStyle = 'normal'; };
                  rightCol.appendChild(placeholder);
                  wrapper.appendChild(leftCol);
                  wrapper.appendChild(rightCol);
                  section.parentNode.insertBefore(wrapper, section);
                  section.style.display = 'none';
                });
                addToast('📐 Bilingual layout applied — paste translations in the right column. Click again to remove.', 'success');
              }} className="w-full text-[11px] font-bold text-slate-600 py-2 bg-white border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1.5">
                🌐 Toggle Bilingual Side-by-Side
              </button>

              {/* Download audio */}
              {callTTS && (
                <button id="preview-audio-dl-btn" onClick={async () => {
                  const btn = document.getElementById('preview-audio-dl-btn');
                  const doc = pdfPreviewRef.current?.contentDocument;
                  const fullText = (doc?.body?.textContent || '').trim();
                  if (!fullText) { addToast('No text to convert', 'error'); return; }
                  const segments = [];
                  let rem = fullText;
                  while (rem.length > 0) {
                    if (rem.length <= 600) { segments.push(rem); break; }
                    let sp = rem.lastIndexOf('. ', 600);
                    if (sp < 200) sp = rem.indexOf('. ', 400);
                    if (sp < 0 || sp > 800) sp = 500; else sp += 2;
                    segments.push(rem.substring(0, sp));
                    rem = rem.substring(sp).trim();
                  }
                  if (btn) { btn.textContent = '⏳ 0/' + segments.length; btn.disabled = true; }
                  const blobs = [];
                  let failed = 0;
                  for (let si = 0; si < segments.length; si++) {
                    if (btn) btn.textContent = '⏳ ' + (si + 1) + '/' + segments.length;
                    try {
                      const url = await callTTS(segments[si], selectedVoice || 'Puck', 1, 1);
                      if (url && (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http'))) {
                        const r = await fetch(url); blobs.push(await r.blob());
                      } else { failed++; }
                    } catch(e) {
                      warnLog('[Audio] Seg ' + si + ' failed:', e?.message);
                      failed++;
                      if (e?.message?.includes('429') || e?.message?.includes('Rate')) {
                        addToast('⚠️ Rate limited — got ' + blobs.length + '/' + segments.length, 'info'); break;
                      }
                    }
                  }
                  if (btn) { btn.textContent = '🎧 Download Audio'; btn.disabled = false; }
                  if (blobs.length === 0) { addToast('Audio generation failed — check TTS/API key', 'error'); return; }
                  const combined = new Blob(blobs, { type: blobs[0].type || 'audio/wav' });
                  const dlUrl = URL.createObjectURL(combined);
                  const a = document.createElement('a');
                  a.href = dlUrl; a.download = 'document-audio.' + (blobs[0].type?.includes('mp3') ? 'mp3' : 'wav');
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(dlUrl);
                  addToast('🎧 Downloaded! ' + blobs.length + '/' + segments.length + (failed > 0 ? ' (' + failed + ' failed)' : ''), 'success');
                }} className="w-full px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-600 hover:bg-amber-100 transition-colors flex items-center gap-2 disabled:opacity-50">
                  🎧 Download Audio
                </button>
              )}

              {/* Re-run axe-core on edited content */}
              <button onClick={async () => {
                const html = getPdfPreviewHtml();
                addToast('Running axe-core on edited content...', 'info');
                const axe = await runAxeAudit(html);
                if (axe) {
                  setPdfFixResult(prev => ({ ...prev, axeAudit: axe, axeScore: axe.score, accessibleHtml: html }));
                  addToast(axe.totalViolations === 0 ? '✅ Zero violations!' : `⚠️ ${axe.totalViolations} violation(s) found`, axe.totalViolations === 0 ? 'success' : 'info');
                }
              }} className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                🔬 Re-audit (axe-core)
              </button>
              <button onClick={async () => {
                const html = getPdfPreviewHtml();
                if (!html) { addToast('No preview content to audit', 'error'); return; }
                addToast('Running full AI re-audit...', 'info');
                try {
                  const [aiResult, axeResult] = await Promise.all([
                    auditOutputAccessibility(html),
                    runAxeAudit(html).catch(() => null)
                  ]);
                  if (aiResult) {
                    setPdfFixResult(prev => ({
                      ...prev,
                      verificationAudit: aiResult,
                      accessibleHtml: html,
                      afterScore: aiResult.score,
                      ...(axeResult ? { axeAudit: axeResult, axeScore: axeResult.score } : {})
                    }));
                    const totalIssues = (aiResult.issues || []).length;
                    const totalPasses = (aiResult.passes || []).length;
                    addToast(totalIssues === 0
                      ? `✅ Full re-audit complete! ${totalPasses} checks passing, 0 issues.`
                      : `⚠️ Re-audit: ${totalIssues} issue(s), ${totalPasses} passing`, totalIssues === 0 ? 'success' : 'info');
                  }
                } catch(e) { addToast('Re-audit failed: ' + e.message, 'error'); }
              }} className="w-full px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-600 hover:bg-purple-100 transition-colors flex items-center gap-2">
                🤖 Full Re-audit (AI + axe-core)
              </button>

              {/* Extracted images — collapsible gallery, draggable into iframe placeholders */}
              {extractedImagesList.length > 0 && (
                <details className="bg-white border border-indigo-600 rounded-lg p-2" open>
                  <summary className="cursor-pointer text-[11px] font-bold text-slate-600 uppercase tracking-widest select-none">
                    🖼 Extracted Images ({extractedImagesList.length})
                  </summary>
                  <p className="text-[10px] text-slate-500 mt-1 mb-2">{t('pdf_audit.extracted_images.drag_hint') || 'Drag a thumbnail onto any image placeholder in the preview to insert it, or click "📷 Upload" inside a placeholder and choose "Use extracted image".'}</p>
                  <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                    {extractedImagesList.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.src}
                          alt={img.description || ('Extracted image ' + (i + 1))}
                          draggable="true"
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setData('text/x-alloflow-image', JSON.stringify({ src: img.src, alt: img.description || '' }));
                              e.dataTransfer.setData('text/plain', img.src);
                              e.dataTransfer.effectAllowed = 'copy';
                            } catch (_) {}
                          }}
                          loading="lazy"
                          className="w-full h-16 object-cover rounded border border-slate-400 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all"
                          title={img.description || ('Image ' + (i + 1))}
                        />
                        {img.isRegenerated && (
                          <span className="absolute top-0 right-0 text-[8px] bg-violet-600 text-white px-1 rounded-bl">AI</span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Export from preview */}
              <div className="mt-auto space-y-2 pt-3 border-t border-slate-200">
                <button onClick={() => {
                  const html = getPdfPreviewHtml();
                  setPdfFixResult(prev => ({ ...prev, accessibleHtml: html }));
                  downloadAccessiblePdf(html, (pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '') + '-accessible');
                }} className="w-full px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center justify-center gap-2">
                  📥 Save as PDF
                </button>
                <button onClick={() => {
                  const html = getPdfPreviewHtml();
                  setPdfFixResult(prev => ({ ...prev, accessibleHtml: html }));
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${(pendingPdfFile?.name || 'document').replace(/\.pdf$/i, '')}-accessible.html`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                  addToast('Saved edited HTML', 'success');
                }} className="w-full px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-600 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                  📄 Save as HTML
                </button>
                <button onClick={() => { setPdfPreviewOpen(false); }} className="w-full text-[11px] text-slate-600 hover:text-slate-600 font-bold text-center py-1">
                  Close Preview
                </button>
              </div>
            </div>

            {/* Right panel: live preview iframe */}
            <div className="flex-1 bg-white rounded-r-2xl border-2 border-l border-indigo-600 overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-[11px] text-slate-600 shrink-0">
                <span className="font-bold text-slate-700">{t('pdf_audit.preview.live_preview') || 'Live Preview'}</span>
                <span>— select text, then use the toolbar to format</span>
                <span className="ml-auto font-mono">{(pendingPdfFile?.name || 'document.pdf')}</span>
              </div>
              {/* Formatting toolbar */}
              <div className="px-2 py-1.5 bg-white border-b border-slate-200 flex items-center gap-0.5 flex-wrap shrink-0" role="toolbar" aria-label={t('pdf_audit.toolbar.aria') || 'Text formatting'}>
                {[
                  { cmd: 'bold', icon: 'B', label: 'Bold', style: 'font-bold' },
                  { cmd: 'italic', icon: 'I', label: 'Italic', style: 'italic' },
                  { cmd: 'underline', icon: 'U', label: 'Underline', style: 'underline' },
                  { cmd: 'strikeThrough', icon: 'S', label: 'Strikethrough', style: 'line-through' },
                ].map(btn => (
                  <button key={btn.cmd} onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand(btn.cmd, false, null); }}
                    className={`w-7 h-7 rounded text-xs ${btn.style} text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600`}
                    aria-label={btn.label} title={btn.label}>{btn.icon}</button>
                ))}
                <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true"></span>
                {[
                  { cmd: 'formatBlock', val: '<h1>', icon: 'H1', label: 'Heading 1' },
                  { cmd: 'formatBlock', val: '<h2>', icon: 'H2', label: 'Heading 2' },
                  { cmd: 'formatBlock', val: '<h3>', icon: 'H3', label: 'Heading 3' },
                  { cmd: 'formatBlock', val: '<p>', icon: '¶', label: 'Paragraph' },
                ].map(btn => (
                  <button key={btn.icon} onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand(btn.cmd, false, btn.val); }}
                    className="px-1.5 h-7 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600"
                    aria-label={btn.label} title={btn.label}>{btn.icon}</button>
                ))}
                <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true"></span>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('insertUnorderedList', false, null); }}
                  className="w-7 h-7 rounded text-xs text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.bullet_list') || 'Bullet list'} title={t('pdf_audit.toolbar.bullet_list') || 'Bullet list'}>•</button>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('insertOrderedList', false, null); }}
                  className="w-7 h-7 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.numbered_list') || 'Numbered list'} title={t('pdf_audit.toolbar.numbered_list') || 'Numbered list'}>1.</button>
                <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true"></span>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('justifyLeft', false, null); }}
                  className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.align_left') || 'Align left'} title={t('pdf_audit.toolbar.align_left') || 'Align left'}>≡</button>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('justifyCenter', false, null); }}
                  className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.align_center') || 'Align center'} title={t('pdf_audit.toolbar.align_center_title') || 'Center'}>≡</button>
                <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true"></span>
                <button onClick={() => {
                  const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                  const url = prompt('Enter link URL:');
                  if (url) doc.execCommand('createLink', false, url);
                }} className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.insert_link') || 'Insert link'} title={t('pdf_audit.toolbar.insert_link') || 'Insert link'}>🔗</button>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('unlink', false, null); }}
                  className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.remove_link') || 'Remove link'} title={t('pdf_audit.toolbar.remove_link') || 'Remove link'}>🚫</button>
                <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true"></span>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('removeFormat', false, null); }}
                  className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.clear_formatting') || 'Clear formatting'} title={t('pdf_audit.toolbar.clear_formatting') || 'Clear formatting'}>✕</button>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('undo', false, null); }}
                  className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.undo') || 'Undo'} title={t('pdf_audit.toolbar.undo') || 'Undo'}>↩</button>
                <button onClick={() => { const doc = pdfPreviewRef.current?.contentDocument; if (doc) doc.execCommand('redo', false, null); }}
                  className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.redo') || 'Redo'} title={t('pdf_audit.toolbar.redo') || 'Redo'}>↪</button>
                <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true"></span>
                <select onChange={(e) => { const doc = pdfPreviewRef.current?.contentDocument; if (doc && e.target.value) doc.execCommand('foreColor', false, e.target.value); e.target.value = ''; }}
                  className="h-7 text-[11px] border border-slate-400 rounded px-1 text-slate-600" aria-label={t('pdf_audit.toolbar.text_color') || 'Text color'} defaultValue="">
                  <option value="" disabled>Color</option>
                  <option value="#000000">⬛ Black</option>
                  <option value="#1e3a5f">🟦 Navy</option>
                  <option value="#991b1b">🟥 Dark Red</option>
                  <option value="#166534">🟩 Dark Green</option>
                  <option value="#7c3aed">🟪 Purple</option>
                  <option value="#92400e">🟫 Brown</option>
                </select>
                <select onChange={(e) => { const doc = pdfPreviewRef.current?.contentDocument; if (doc && e.target.value) doc.execCommand('hiliteColor', false, e.target.value); e.target.value = ''; }}
                  className="h-7 text-[11px] border border-slate-400 rounded px-1 text-slate-600" aria-label={t('pdf_audit.toolbar.highlight_color') || 'Highlight color'} defaultValue="">
                  <option value="" disabled>Highlight</option>
                  <option value="#fef08a">🟡 Yellow</option>
                  <option value="#bbf7d0">🟢 Green</option>
                  <option value="#bfdbfe">🔵 Blue</option>
                  <option value="#fecaca">🔴 Pink</option>
                  <option value="#e9d5ff">🟣 Purple</option>
                  <option value="transparent">✕ Remove</option>
                </select>
                <button onClick={() => {
                  const doc = pdfPreviewRef.current?.contentDocument; if (!doc) return;
                  doc.execCommand('insertHTML', false, '<table style="width:100%;border-collapse:collapse;margin:12px 0"><caption style="font-weight:bold;margin-bottom:4px">Table Title</caption><thead><tr><th scope="col" style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:left;font-weight:bold">Header 1</th><th scope="col" style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:left;font-weight:bold">Header 2</th><th scope="col" style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:left;font-weight:bold">Header 3</th></tr></thead><tbody><tr><td style="border:1px solid #cbd5e1;padding:8px">Data</td><td style="border:1px solid #cbd5e1;padding:8px">Data</td><td style="border:1px solid #cbd5e1;padding:8px">Data</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px">Data</td><td style="border:1px solid #cbd5e1;padding:8px">Data</td><td style="border:1px solid #cbd5e1;padding:8px">Data</td></tr></tbody></table>');
                }} className="w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-600"
                  aria-label={t('pdf_audit.toolbar.insert_table_aria') || 'Insert table'} title={t('pdf_audit.toolbar.insert_table_title') || 'Insert accessible table'}>📊</button>
              </div>
              <iframe ref={pdfPreviewRef} title={t('pdf_audit.preview.iframe_title') || 'Accessible document preview'} className="flex-1 w-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-modals"
                onLoad={() => {
                  const iframe = pdfPreviewRef.current;
                  const doc = iframe?.contentDocument;
                  const cw = iframe?.contentWindow;
                  if (doc) {
                    doc.body.spellcheck = true;
                    try {
                      if (cw) cw.__alloflowExtractedImages = extractedImagesList || [];
                      console.info('[AlloFlow] Pushed ' + (extractedImagesList || []).length + ' extracted images into preview iframe');
                    } catch(_) {}
                    doc.addEventListener('click', function(e) {
                      const target = e.target;
                      if (target && target.tagName === 'IMG') {
                        selectedPreviewImgRef.current = target;
                        doc.querySelectorAll('img[data-alloflow-selected]').forEach(function(i) {
                          if (i !== target) { i.removeAttribute('data-alloflow-selected'); i.style.outline = ''; }
                        });
                        target.setAttribute('data-alloflow-selected', 'true');
                        target.style.outline = '3px solid #6366f1';
                        target.style.outlineOffset = '2px';
                      }
                    });
                    doc.addEventListener('keydown', function(e) {
                      if (e.ctrlKey || e.metaKey) {
                        if (e.key === '1') { e.preventDefault(); doc.execCommand('formatBlock', false, '<h1>'); }
                        else if (e.key === '2') { e.preventDefault(); doc.execCommand('formatBlock', false, '<h2>'); }
                        else if (e.key === '3') { e.preventDefault(); doc.execCommand('formatBlock', false, '<h3>'); }
                        else if (e.key === '0') { e.preventDefault(); doc.execCommand('formatBlock', false, '<p>'); }
                        else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); var url = prompt('Enter link URL:'); if (url) doc.execCommand('createLink', false, url); }
                        else if (e.shiftKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); doc.execCommand('insertUnorderedList', false, null); }
                        else if (e.shiftKey && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); doc.execCommand('insertOrderedList', false, null); }
                      }
                    });
                  }
                }} />
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
  );
}
