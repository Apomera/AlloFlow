var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
    };
  };
  var Search = _lazyIcon('Search');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var AlertCircle = _lazyIcon('AlertCircle');
  var Wrench = _lazyIcon('Wrench');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Wand2 = _lazyIcon('Wand2');
  var Pencil = _lazyIcon('Pencil');
  var Sparkles = _lazyIcon('Sparkles');
  var Send = _lazyIcon('Send');
  var Bold = _lazyIcon('Bold');
  var Italic = _lazyIcon('Italic');
  var Highlighter = _lazyIcon('Highlighter');
  var List = _lazyIcon('List');
  var FileText = _lazyIcon('FileText');
  function AnalysisView(props) {
    // State reads
    var t = props.t;
    var generatedContent = props.generatedContent;
    var selectedDiscrepancies = props.selectedDiscrepancies;
    var selectedGrammarErrors = props.selectedGrammarErrors;
    var isTeacherMode = props.isTeacherMode;
    var isProcessing = props.isProcessing;
    var isEditingAnalysis = props.isEditingAnalysis;
    var sourceRefineInstruction = props.sourceRefineInstruction;
    // Refs
    var analysisEditorRef = props.analysisEditorRef;
    // Setters
    var setIsProcessing = props.setIsProcessing;
    var setGenerationStep = props.setGenerationStep;
    var setGeneratedContent = props.setGeneratedContent;
    var setInputText = props.setInputText;
    var setSelectedGrammarErrors = props.setSelectedGrammarErrors;
    var setSourceRefineInstruction = props.setSourceRefineInstruction;
    // Handlers
    var toggleDiscrepancySelection = props.toggleDiscrepancySelection;
    var handleAutoCorrectSource = props.handleAutoCorrectSource;
    var toggleGrammarErrorSelection = props.toggleGrammarErrorSelection;
    var handleToggleIsEditingAnalysis = props.handleToggleIsEditingAnalysis;
    var handleAiRefineSource = props.handleAiRefineSource;
    var handleFormatText = props.handleFormatText;
    var handleAnalysisTextChange = props.handleAnalysisTextChange;
    // API
    var callGemini = props.callGemini;
    // Pure helpers
    var formatInlineText = props.formatInlineText;
    var renderFormattedText = props.renderFormattedText;
    var splitReferencesFromBody = props.splitReferencesFromBody;
    var addToast = props.addToast;
    var warnLog = props.warnLog;
    // Components
    var BilingualFieldRenderer = props.BilingualFieldRenderer;
    var SourceReferencesPanel = props.SourceReferencesPanel;
    return <div className="space-y-6"><div className="bg-slate-50 p-4 rounded-lg border border-slate-400 mb-6"><p className="text-sm text-slate-800" dangerouslySetInnerHTML={{
          __html: t('analysis.header_description')
        }} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"><div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm flex flex-col"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('output.analysis_complexity')}</h4>{typeof generatedContent?.data.readingLevel === 'object' ? <><div className="text-2xl font-bold text-indigo-600 mb-2">{generatedContent?.data.readingLevel.range}</div><div className="text-sm text-slate-600 leading-relaxed">{formatInlineText(generatedContent?.data.readingLevel.explanation, false)}</div></> : <div className="text-2xl font-bold text-indigo-600">{generatedContent?.data.readingLevel}</div>}{generatedContent?.data.localStats && <div className="mt-auto pt-4 border-t border-slate-100"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-600">{t('analysis.readability.fk_score')}</span><span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded cursor-help border border-indigo-100" title={`${t('analysis.readability.formula')}: (0.39 × ASL) + (11.8 × ASW) - 15.59\n\n${t('analysis.readability.words')}: ${generatedContent?.data.localStats.words}\n${t('analysis.readability.sentences')}: ${generatedContent?.data.localStats.sentences}\n${t('analysis.readability.syllables')}: ${generatedContent?.data.localStats.syllables}\n\nASL (${t('analysis.readability.asl')}): ${(generatedContent?.data.localStats.words / generatedContent?.data.localStats.sentences).toFixed(2)}\nASW (${t('analysis.readability.asw')}): ${(generatedContent?.data.localStats.syllables / generatedContent?.data.localStats.words).toFixed(2)}`}>{generatedContent?.data.localStats.score}</span></div><div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 text-center"><div className="bg-slate-50 rounded p-1 border border-slate-100"><span className="block font-bold text-slate-700 text-xs">{generatedContent?.data.localStats.words}</span> {t('analysis.readability.label_words')}</div><div className="bg-slate-50 rounded p-1 border border-slate-100"><span className="block font-bold text-slate-700 text-xs">{generatedContent?.data.localStats.sentences}</span> {t('analysis.readability.label_sent')}</div><div className="bg-slate-50 rounded p-1 border border-slate-100"><span className="block font-bold text-slate-700 text-xs">{generatedContent?.data.localStats.syllables}</span> {t('analysis.readability.label_syll')}</div></div></div>}</div><div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm flex flex-col"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('output.analysis_concepts')}</h4><div className="flex flex-wrap gap-2 content-start">{generatedContent?.data.concepts.map((concept, idx) => <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium border border-indigo-100">{formatInlineText(concept, false)}</span>)}</div></div></div><div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6"><div className="flex items-center gap-3 mb-3"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('output.analysis_verification')}</h4><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${generatedContent?.data.accuracy.rating.toLowerCase().includes('high') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>{generatedContent?.data.accuracy.rating}</span></div><p className="text-sm text-slate-600 leading-relaxed">{formatInlineText(generatedContent?.data.accuracy.reason, false)}</p>{generatedContent?.data.accuracy.verificationDetails && <div className="mt-4 pt-4 border-t border-slate-100"><h5 className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Search size={10} /> {t('analysis.verification_details')}</h5><div className="text-xs text-slate-600 bg-blue-50 p-3 rounded border border-blue-100 leading-relaxed">{renderFormattedText(generatedContent?.data.accuracy.verificationDetails, false)}</div></div>}{(() => {
          const rawDiscrepancies = generatedContent?.data.accuracy.discrepancies || [];
          const isInvalidDiscrepancy = d => {
            if (!d || typeof d !== 'string') return true;
            const clean = d.trim().toLowerCase().replace(/[.,;!]+$/, '');
            if (['none', 'n/a', 'no errors', 'no issues', 'no discrepancies'].includes(clean)) return true;
            if (/^(none|no errors|no discrepancies|no factual errors|none detected|no inaccuracies)/i.test(clean)) return true;
            if (clean.includes('no discrepancies found') || clean.includes('no factual errors found') || clean.includes('no significant errors')) return true;
            return false;
          };
          const realDiscrepancies = rawDiscrepancies.filter(d => !isInvalidDiscrepancy(d));
          const hasDiscrepancies = realDiscrepancies.length > 0;
          const hasVerifiedFacts = generatedContent?.data.accuracy.verifiedFacts?.length > 0;
          if (!hasDiscrepancies && !hasVerifiedFacts) return null;
          return <div className={`mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 ${hasDiscrepancies ? 'md:grid-cols-2' : ''} gap-4`}>{hasVerifiedFacts && <div className="bg-green-50 p-3 rounded border border-green-100"><h5 className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle2 size={10} /> {t('analysis.verified_facts')}</h5><div className="text-xs text-slate-700 leading-relaxed space-y-1">{generatedContent?.data.accuracy.verifiedFacts.map((f, i) => <div key={i} className="flex items-start gap-2"><span className="font-bold text-green-800 min-w-[2em] text-right shrink-0">{i + 1}.</span><div className="flex-1"><BilingualFieldRenderer text={f} /></div></div>)}</div></div>}{hasDiscrepancies && <div className="bg-red-50 p-3 rounded border border-red-100 relative"><h5 className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle size={10} /> {t('analysis.discrepancies')}</h5><div className="space-y-2 mb-3">{rawDiscrepancies.map((d, i) => {
                  if (isInvalidDiscrepancy(d)) return null;
                  const isSelected = selectedDiscrepancies.has(i);
                  return <div key={i} className={`flex items-start gap-2 p-1.5 rounded transition-colors ${isSelected ? 'bg-white/50' : 'opacity-60'}`}>{isTeacherMode && <input aria-label={t('common.toggle_is_selected')} type="checkbox" checked={isSelected} onChange={() => toggleDiscrepancySelection(i)} className="mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer shrink-0" title={isSelected ? "Include in correction" : "Ignore this error"} />}<div className={`text-xs text-slate-700 leading-relaxed ${!isSelected ? 'line-through text-slate-600' : ''} w-full`}><BilingualFieldRenderer text={d} /></div></div>;
                })}</div>{isTeacherMode && <button aria-label={t('common.auto_correct_selected_errors')} onClick={handleAutoCorrectSource} disabled={isProcessing || selectedDiscrepancies.size === 0} aria-busy={isProcessing} className="w-full flex items-center justify-center gap-2 bg-white border border-red-600 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <RefreshCw size={12} className="animate-spin" /> : <Wrench size={12} />}{t('analysis.fix_button')} ({selectedDiscrepancies.size})</button>}</div>}</div>;
        })()}{generatedContent?.data.accuracy.citations && <div className="mt-4 pt-4 border-t border-slate-100"><div className="text-xs text-slate-600 leading-relaxed">{renderFormattedText(generatedContent?.data.accuracy.citations, false)}</div></div>}</div>{(() => {
        const rawGrammarNotes = generatedContent?.data.grammar || [];
        const isInvalidGrammarNote = g => {
          if (!g || typeof g !== 'string') return true;
          const clean = g.trim().toLowerCase().replace(/[.,;!]+$/, '');
          if (['none', 'n/a', 'no errors', 'no issues', 'none detected', 'no grammar errors', 'no spelling errors'].includes(clean)) return true;
          if (/^(none|no errors|no issues|no grammar|no spelling|none detected|no significant)/i.test(clean)) return true;
          if (clean.includes('no grammar errors') || clean.includes('no spelling errors') || clean.includes('no significant errors')) return true;
          return false;
        };
        const realGrammarErrors = rawGrammarNotes.filter(g => !isInvalidGrammarNote(g));
        const hasGrammarErrors = realGrammarErrors.length > 0;
        const handleFixGrammarErrors = async () => {
          if (!generatedContent?.data?.originalText || selectedGrammarErrors.size === 0) return;
          setIsProcessing(true);
          setGenerationStep(t('process.fixing_grammar') || 'Fixing grammar errors...');
          try {
            const isFixable = g => typeof g === 'string' && !isInvalidGrammarNote(g) && !g.startsWith('✓ FIXED:');
            const errorsToFix = rawGrammarNotes.filter((g, i) => selectedGrammarErrors.has(i) && isFixable(g));
            const originalText = generatedContent?.data.originalText;
            if (errorsToFix.length === 0) {
              addToast(t('process.grammar_fix_failed') || 'No errors selected to fix.', 'warning');
              return;
            }
            // Single-pass fix: send the whole text + the whole error list, ask
            // for the corrected text back. Avoids the per-error keyword-matching
            // trap (smart quotes, ellipsis-in-quotes) that silently no-op'd.
            const errorList = errorsToFix.map((e, i) => `${i + 1}. ${e}`).join('\n');
            const fixPrompt = `You are a careful copy editor. Apply the listed grammar/spelling/punctuation corrections to the SOURCE TEXT below. Make ONLY these specific changes. Do not paraphrase, do not rewrite, do not change anything else, do not add or remove sentences.

ERRORS TO FIX:
${errorList}

SOURCE TEXT:
${originalText}

Return ONLY the corrected text. No preamble, no explanation, no quote marks around the result, no markdown fences.`;
            let raw = '';
            try {
              if (window.ai && window.ai.languageModel && typeof window.ai.languageModel.create === 'function') {
                const session = await window.ai.languageModel.create();
                raw = await session.prompt(fixPrompt);
                try {
                  session.destroy();
                } catch (_) {}
              }
            } catch (e) {
              warnLog('Built-in AI failed, falling back to Gemini:', e);
              raw = '';
            }
            if (!raw) {
              raw = await callGemini(fixPrompt, false, false, null);
            }
            const cleaned = (typeof raw === 'string' ? raw : raw && raw.text || '').trim().replace(/^```(?:[a-z]+)?\s*/i, '').replace(/\s*```$/, '').replace(/^["']|["']$/g, '').trim();
            if (!cleaned) {
              addToast(t('process.grammar_fix_failed') || 'Failed to fix grammar errors.', 'error');
              return;
            }
            const lengthChange = Math.abs(cleaned.length - originalText.length) / Math.max(1, originalText.length);
            if (lengthChange > 0.15) {
              warnLog(`Grammar fix length change too large: ${(lengthChange * 100).toFixed(1)}%`);
              addToast(t('process.grammar_fix_truncation') || 'Text changed significantly. Please try again with fewer errors selected.', 'warning');
              return;
            }
            if (cleaned === originalText) {
              addToast(t('process.grammar_fix_failed') || 'No changes applied.', 'warning');
              return;
            }
            setGeneratedContent(prev => ({
              ...prev,
              data: {
                ...prev.data,
                originalText: cleaned,
                grammar: prev.data.grammar.map((g, i) => selectedGrammarErrors.has(i) && isFixable(g) ? `✓ FIXED: ${g}` : g)
              }
            }));
            setInputText(cleaned);
            addToast(t('process.grammar_fixed') || 'Grammar errors fixed!', 'success');
            setSelectedGrammarErrors(new Set());
          } catch (err) {
            warnLog('Grammar fix error:', err);
            addToast(t('process.grammar_fix_failed') || 'Failed to fix grammar errors.', 'error');
          } finally {
            setIsProcessing(false);
            setGenerationStep('');
          }
        };
        return <div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6"><div className="flex items-center gap-3 mb-3"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('output.analysis_grammar')}</h4>{hasGrammarErrors && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-amber-100 text-amber-700 border-amber-200">{realGrammarErrors.length} {realGrammarErrors.length === 1 ? 'Issue' : 'Issues'}</span>}</div>{hasGrammarErrors ? <><div className="space-y-2 mb-3">{rawGrammarNotes.map((note, idx) => {
                if (isInvalidGrammarNote(note)) return null;
                const isSelected = selectedGrammarErrors.has(idx);
                const isFixed = note.startsWith('✓ FIXED:');
                return <div key={idx} className={`flex items-start gap-2 p-2 rounded transition-colors ${isFixed ? 'bg-green-50 border border-green-100' : isSelected ? 'bg-amber-50' : 'opacity-60'}`}>{isTeacherMode && !isFixed && <input aria-label={t('common.toggle_is_selected')} type="checkbox" checked={isSelected} onChange={() => toggleGrammarErrorSelection(idx)} className="mt-1 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer shrink-0" title={isSelected ? "Include in correction" : "Ignore this error"} />}{isFixed && <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />}<div className={`text-sm text-slate-700 leading-relaxed ${!isSelected && !isFixed ? 'line-through text-slate-600' : ''}`}>{formatInlineText(isFixed ? note.replace('✓ FIXED: ', '') : note, false)}</div></div>;
              })}</div>{isTeacherMode && realGrammarErrors.some(g => !g.startsWith('✓ FIXED:')) && <button aria-label={t('common.fix_grammar_errors')} onClick={handleFixGrammarErrors} disabled={isProcessing || selectedGrammarErrors.size === 0} aria-busy={isProcessing} className="w-full flex items-center justify-center gap-2 bg-white border border-amber-600 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}{t('analysis.fix_grammar_button') || 'Fix Grammar Errors'} ({selectedGrammarErrors.size})</button>}{isTeacherMode && realGrammarErrors.length > 0 && realGrammarErrors.every(g => g.startsWith('✓ FIXED:')) && <button aria-label={t('common.check')} onClick={() => {
              setGeneratedContent(prev => ({
                ...prev,
                data: {
                  ...prev.data,
                  grammar: []
                }
              }));
              addToast(t('analysis.grammar_dismissed') || 'Grammar notices cleared.', 'success');
            }} className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm"><CheckCircle2 size={12} />{t('analysis.dismiss_fixed') || 'Dismiss Fixed Notices'}</button>}</> : <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 size={16} /><span>{t('analysis.no_grammar_errors') || 'No grammar or spelling issues detected.'}</span></div>}</div>;
      })()}<div className="bg-slate-50 p-6 rounded-xl border border-slate-400 relative group"><div className="flex justify-between items-center mb-3"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('output.common_original')}</h4>{isTeacherMode && <button aria-label={t('common.toggle_edit_analysis')} onClick={handleToggleIsEditingAnalysis} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${isEditingAnalysis ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'}`}>{isEditingAnalysis ? <CheckCircle2 size={14} /> : <Pencil size={14} />}{isEditingAnalysis ? t('common.done') : t('common.edit')}</button>}</div>{isTeacherMode && <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-1"><div className="relative flex-grow"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-600"><Sparkles size={14} /></div><input aria-label={t('common.enter_source_refine_instruction')} type="text" value={sourceRefineInstruction} onChange={e => setSourceRefineInstruction(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiRefineSource()} placeholder={t('analysis.refine_placeholder')} className="w-full pl-9 pr-3 py-2 text-xs border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all shadow-sm bg-white" disabled={isProcessing} aria-busy={isProcessing} /></div><button aria-label={t('common.ai_refine_source')} onClick={handleAiRefineSource} disabled={!sourceRefineInstruction.trim() || isProcessing} aria-busy={isProcessing} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}</button></div>}{isEditingAnalysis ? <div className="w-full bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm"><div className="flex items-center gap-1 p-2 bg-indigo-50 border-b border-indigo-100"><button onClick={() => handleFormatText('bold', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.bold')}><Bold size={16} strokeWidth={3} /></button><button onClick={() => handleFormatText('italic', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.italic')}><Italic size={16} /></button><button onClick={() => handleFormatText('highlight', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.highlight')}><Highlighter size={16} /></button><div className="w-px h-4 bg-indigo-200 mx-1" /><button onClick={() => handleFormatText('h1', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs" title={t('formatting.h1')}>H1</button><button onClick={() => handleFormatText('h2', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs" title={t('formatting.h2')}>H2</button><div className="w-px h-4 bg-indigo-200 mx-1" /><button onClick={() => handleFormatText('list', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.list')}><List size={16} /></button></div><textarea aria-label={t('common.edit_source_text') || 'Edit source text'} ref={analysisEditorRef} value={generatedContent?.data.originalText} onChange={e => handleAnalysisTextChange(e.target.value)} className="w-full min-h-[300px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-sm text-slate-700 font-serif leading-relaxed resize-y" placeholder={t('common.edit_source_text')} spellCheck="false" /></div> : <div className="text-sm text-slate-700 font-serif leading-relaxed max-w-none">{(() => {
            const _fullOrig = generatedContent?.data?.originalText || '';
            const {
              body: _bodyNoRefs,
              references: _refs
            } = splitReferencesFromBody(_fullOrig);
            return <>{renderFormattedText(_bodyNoRefs, false)}{generatedContent?.data.rawEnglishText && generatedContent?.data.translatedText && <div className="mt-8 pt-8 border-t border-slate-200 opacity-80"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2"><FileText size={14} /> {t('output.original_source_label')}</h4>{renderFormattedText(generatedContent?.data.rawEnglishText, false)}</div>}{_refs && <SourceReferencesPanel referencesText={_refs} />}</>;
          })()}</div>}</div></div>;
  }
