/**
 * AlloFlow View - Analysis Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='analysis' block.
 * Source range (post-Image): 429 lines (largest mini-view).
 * Renders: readability complexity card, concept chips, accuracy/verification
 * panel with discrepancies + verified-facts toggle, grammar/spelling panel
 * with auto-fix flow, original source editor with formatting toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AnalysisView) {
    console.log('[CDN] ViewAnalysisModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAnalysisModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-4 rounded-lg border border-slate-400 mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800",
    dangerouslySetInnerHTML: {
      __html: t('analysis.header_description')
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-400 shadow-sm flex flex-col"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-3"
  }, t('output.analysis_complexity')), typeof generatedContent?.data.readingLevel === 'object' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-indigo-600 mb-2"
  }, generatedContent?.data.readingLevel.range), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-600 leading-relaxed"
  }, formatInlineText(generatedContent?.data.readingLevel.explanation, false))) : /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-indigo-600"
  }, generatedContent?.data.readingLevel), generatedContent?.data.localStats && /*#__PURE__*/React.createElement("div", {
    className: "mt-auto pt-4 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, t('analysis.readability.fk_score')), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded cursor-help border border-indigo-100",
    title: `${t('analysis.readability.formula')}: (0.39 × ASL) + (11.8 × ASW) - 15.59\n\n${t('analysis.readability.words')}: ${generatedContent?.data.localStats.words}\n${t('analysis.readability.sentences')}: ${generatedContent?.data.localStats.sentences}\n${t('analysis.readability.syllables')}: ${generatedContent?.data.localStats.syllables}\n\nASL (${t('analysis.readability.asl')}): ${(generatedContent?.data.localStats.words / generatedContent?.data.localStats.sentences).toFixed(2)}\nASW (${t('analysis.readability.asw')}): ${(generatedContent?.data.localStats.syllables / generatedContent?.data.localStats.words).toFixed(2)}`
  }, generatedContent?.data.localStats.score)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 text-[11px] text-slate-600 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded p-1 border border-slate-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block font-bold text-slate-700 text-xs"
  }, generatedContent?.data.localStats.words), " ", t('analysis.readability.label_words')), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded p-1 border border-slate-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block font-bold text-slate-700 text-xs"
  }, generatedContent?.data.localStats.sentences), " ", t('analysis.readability.label_sent')), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded p-1 border border-slate-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block font-bold text-slate-700 text-xs"
  }, generatedContent?.data.localStats.syllables), " ", t('analysis.readability.label_syll'))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-400 shadow-sm flex flex-col"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-3"
  }, t('output.analysis_concepts')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 content-start"
  }, generatedContent?.data.concepts.map((concept, idx) => /*#__PURE__*/React.createElement("span", {
    key: idx,
    className: "bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium border border-indigo-100"
  }, formatInlineText(concept, false)))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider"
  }, t('output.analysis_verification')), /*#__PURE__*/React.createElement("span", {
    className: `px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${generatedContent?.data.accuracy.rating.toLowerCase().includes('high') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`
  }, generatedContent?.data.accuracy.rating)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 leading-relaxed"
  }, formatInlineText(generatedContent?.data.accuracy.reason, false)), generatedContent?.data.accuracy.verificationDetails && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 10
  }), " ", t('analysis.verification_details')), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 bg-blue-50 p-3 rounded border border-blue-100 leading-relaxed"
  }, renderFormattedText(generatedContent?.data.accuracy.verificationDetails, false))), (() => {
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
    return /*#__PURE__*/React.createElement("div", {
      className: `mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 ${hasDiscrepancies ? 'md:grid-cols-2' : ''} gap-4`
    }, hasVerifiedFacts && /*#__PURE__*/React.createElement("div", {
      className: "bg-green-50 p-3 rounded border border-green-100"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 10
    }), " ", t('analysis.verified_facts')), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-700 leading-relaxed space-y-1"
    }, generatedContent?.data.accuracy.verifiedFacts.map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-start gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-green-800 min-w-[2em] text-right shrink-0"
    }, i + 1, "."), /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
      text: f
    })))))), hasDiscrepancies && /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 p-3 rounded border border-red-100 relative"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 10
    }), " ", t('analysis.discrepancies')), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 mb-3"
    }, rawDiscrepancies.map((d, i) => {
      if (isInvalidDiscrepancy(d)) return null;
      const isSelected = selectedDiscrepancies.has(i);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: `flex items-start gap-2 p-1.5 rounded transition-colors ${isSelected ? 'bg-white/50' : 'opacity-60'}`
      }, isTeacherMode && /*#__PURE__*/React.createElement("input", {
        "aria-label": t('common.toggle_is_selected'),
        type: "checkbox",
        checked: isSelected,
        onChange: () => toggleDiscrepancySelection(i),
        className: "mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer shrink-0",
        title: isSelected ? "Include in correction" : "Ignore this error"
      }), /*#__PURE__*/React.createElement("div", {
        className: `text-xs text-slate-700 leading-relaxed ${!isSelected ? 'line-through text-slate-600' : ''} w-full`
      }, /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
        text: d
      })));
    })), isTeacherMode && /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.auto_correct_selected_errors'),
      onClick: handleAutoCorrectSource,
      disabled: isProcessing || selectedDiscrepancies.size === 0,
      "aria-busy": isProcessing,
      className: "w-full flex items-center justify-center gap-2 bg-white border border-red-600 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Wrench, {
      size: 12
    }), t('analysis.fix_button'), " (", selectedDiscrepancies.size, ")")));
  })(), generatedContent?.data.accuracy.citations && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, renderFormattedText(generatedContent?.data.accuracy.citations, false)))), (() => {
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
        const errorsToFix = rawGrammarNotes.filter((_, i) => selectedGrammarErrors.has(i) && !isInvalidGrammarNote(rawGrammarNotes[i]));
        const originalText = generatedContent?.data.originalText;
        let correctedText = originalText;
        for (const errorDesc of errorsToFix) {
          const errorKeywords = errorDesc.match(/["']([^"']+)["']/g)?.map(s => s.replace(/["']/g, '')) || [];
          let targetSentence = '';
          if (errorKeywords.length > 0) {
            const sentences = correctedText.split(/(?<=[.!?])\s+/);
            for (const sentence of sentences) {
              if (errorKeywords.some(kw => sentence.includes(kw))) {
                targetSentence = sentence;
                break;
              }
            }
          }
          const contextToFix = targetSentence || correctedText.substring(0, 500);
          const fixPrompt = `Fix ONLY this specific grammar/spelling error in the text below. Return ONLY the corrected text segment, nothing else.
ERROR TO FIX: ${errorDesc}
TEXT TO CORRECT:
"${contextToFix}",
Return only the corrected version of this exact text:`;
          const result = (await window.ai?.languageModel?.create().then(async session => {
            const response = await session.prompt(fixPrompt);
            session.destroy();
            return response;
          })) || (await callGemini(fixPrompt, false, false, null));
          if (result && targetSentence) {
            const fixedSegment = typeof result === 'string' ? result.trim() : result;
            const cleanedFix = fixedSegment.replace(/^["']|["']$/g, '');
            correctedText = correctedText.replace(targetSentence, cleanedFix);
          }
        }
        const lengthChange = Math.abs(correctedText.length - originalText.length) / originalText.length;
        if (lengthChange > 0.15) {
          warnLog(`Grammar fix length change too large: ${(lengthChange * 100).toFixed(1)}%`);
          addToast(t('process.grammar_fix_truncation') || 'Text changed significantly. Please try again with fewer errors selected.', 'warning');
          setIsProcessing(false);
          setGenerationStep('');
          return;
        }
        if (correctedText && correctedText.trim()) {
          setGeneratedContent(prev => ({
            ...prev,
            data: {
              ...prev.data,
              originalText: correctedText.trim(),
              grammar: prev.data.grammar.map((g, i) => selectedGrammarErrors.has(i) ? `✓ FIXED: ${g}` : g)
            }
          }));
          setInputText(correctedText.trim());
          addToast(t('process.grammar_fixed') || 'Grammar errors fixed!', 'success');
          setSelectedGrammarErrors(new Set());
        }
      } catch (err) {
        warnLog('Grammar fix error:', err);
        addToast(t('process.grammar_fix_failed') || 'Failed to fix grammar errors.', 'error');
      } finally {
        setIsProcessing(false);
        setGenerationStep('');
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 mb-3"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-bold text-slate-600 uppercase tracking-wider"
    }, t('output.analysis_grammar')), hasGrammarErrors && /*#__PURE__*/React.createElement("span", {
      className: "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-amber-100 text-amber-700 border-amber-200"
    }, realGrammarErrors.length, " ", realGrammarErrors.length === 1 ? 'Issue' : 'Issues')), hasGrammarErrors ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 mb-3"
    }, rawGrammarNotes.map((note, idx) => {
      if (isInvalidGrammarNote(note)) return null;
      const isSelected = selectedGrammarErrors.has(idx);
      const isFixed = note.startsWith('✓ FIXED:');
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: `flex items-start gap-2 p-2 rounded transition-colors ${isFixed ? 'bg-green-50 border border-green-100' : isSelected ? 'bg-amber-50' : 'opacity-60'}`
      }, isTeacherMode && !isFixed && /*#__PURE__*/React.createElement("input", {
        "aria-label": t('common.toggle_is_selected'),
        type: "checkbox",
        checked: isSelected,
        onChange: () => toggleGrammarErrorSelection(idx),
        className: "mt-1 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer shrink-0",
        title: isSelected ? "Include in correction" : "Ignore this error"
      }), isFixed && /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 16,
        className: "text-green-600 mt-0.5 shrink-0"
      }), /*#__PURE__*/React.createElement("div", {
        className: `text-sm text-slate-700 leading-relaxed ${!isSelected && !isFixed ? 'line-through text-slate-600' : ''}`
      }, formatInlineText(isFixed ? note.replace('✓ FIXED: ', '') : note, false)));
    })), isTeacherMode && realGrammarErrors.some(g => !g.startsWith('✓ FIXED:')) && /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.fix_grammar_errors'),
      onClick: handleFixGrammarErrors,
      disabled: isProcessing || selectedGrammarErrors.size === 0,
      "aria-busy": isProcessing,
      className: "w-full flex items-center justify-center gap-2 bg-white border border-amber-600 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      className: "animate-spin"
    }) : /*#__PURE__*/React.createElement(Wand2, {
      size: 12
    }), t('analysis.fix_grammar_button') || 'Fix Grammar Errors', " (", selectedGrammarErrors.size, ")"), isTeacherMode && realGrammarErrors.length > 0 && realGrammarErrors.every(g => g.startsWith('✓ FIXED:')) && /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.check'),
      onClick: () => {
        setGeneratedContent(prev => ({
          ...prev,
          data: {
            ...prev.data,
            grammar: []
          }
        }));
        addToast(t('analysis.grammar_dismissed') || 'Grammar notices cleared.', 'success');
      },
      className: "w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm"
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 12
    }), t('analysis.dismiss_fixed') || 'Dismiss Fixed Notices')) : /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-sm text-green-600"
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 16
    }), /*#__PURE__*/React.createElement("span", null, t('analysis.no_grammar_errors') || 'No grammar or spelling issues detected.')));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-6 rounded-xl border border-slate-400 relative group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider"
  }, t('output.common_original')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_analysis'),
    onClick: handleToggleIsEditingAnalysis,
    className: `flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${isEditingAnalysis ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'}`
  }, isEditingAnalysis ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingAnalysis ? t('common.done') : t('common.edit'))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex gap-2 animate-in fade-in slide-in-from-top-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-600"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14
  })), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_source_refine_instruction'),
    type: "text",
    value: sourceRefineInstruction,
    onChange: e => setSourceRefineInstruction(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleAiRefineSource(),
    placeholder: t('analysis.refine_placeholder'),
    className: "w-full pl-9 pr-3 py-2 text-xs border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all shadow-sm bg-white",
    disabled: isProcessing,
    "aria-busy": isProcessing
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.ai_refine_source'),
    onClick: handleAiRefineSource,
    disabled: !sourceRefineInstruction.trim() || isProcessing,
    "aria-busy": isProcessing,
    className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 14
  }))), isEditingAnalysis ? /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 p-2 bg-indigo-50 border-b border-indigo-100"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('bold', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange),
    className: "p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors",
    title: t('formatting.bold')
  }, /*#__PURE__*/React.createElement(Bold, {
    size: 16,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('italic', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange),
    className: "p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors",
    title: t('formatting.italic')
  }, /*#__PURE__*/React.createElement(Italic, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('highlight', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange),
    className: "p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors",
    title: t('formatting.highlight')
  }, /*#__PURE__*/React.createElement(Highlighter, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-indigo-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('h1', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange),
    className: "p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs",
    title: t('formatting.h1')
  }, "H1"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('h2', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange),
    className: "p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs",
    title: t('formatting.h2')
  }, "H2"), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-indigo-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleFormatText('list', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange),
    className: "p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors",
    title: t('formatting.list')
  }, /*#__PURE__*/React.createElement(List, {
    size: 16
  }))), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('common.edit_source_text') || 'Edit source text',
    ref: analysisEditorRef,
    value: generatedContent?.data.originalText,
    onChange: e => handleAnalysisTextChange(e.target.value),
    className: "w-full min-h-[300px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-sm text-slate-700 font-serif leading-relaxed resize-y",
    placeholder: t('common.edit_source_text'),
    spellCheck: "false"
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-700 font-serif leading-relaxed max-w-none"
  }, (() => {
    const _fullOrig = generatedContent?.data?.originalText || '';
    const {
      body: _bodyNoRefs,
      references: _refs
    } = splitReferencesFromBody(_fullOrig);
    return /*#__PURE__*/React.createElement(React.Fragment, null, renderFormattedText(_bodyNoRefs, false), generatedContent?.data.rawEnglishText && generatedContent?.data.translatedText && /*#__PURE__*/React.createElement("div", {
      className: "mt-8 pt-8 border-t border-slate-200 opacity-80"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(FileText, {
      size: 14
    }), " ", t('output.original_source_label')), renderFormattedText(generatedContent?.data.rawEnglishText, false)), _refs && /*#__PURE__*/React.createElement(SourceReferencesPanel, {
      referencesText: _refs
    }));
  })())));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AnalysisView = AnalysisView;
  window.AlloModules.ViewAnalysisModule = true;
})();
