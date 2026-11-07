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
  // Dismiss control on a grammar notice. Must be declared here: icons in this
  // view resolve through _lazyIcon, NOT as bare globals, so using <X/> without
  // this line is an undeclared identifier that ReferenceErrors at render.
  var X = _lazyIcon('X');
  var Pencil = _lazyIcon('Pencil');
  var Sparkles = _lazyIcon('Sparkles');
  var Send = _lazyIcon('Send');
  var Bold = _lazyIcon('Bold');
  var Italic = _lazyIcon('Italic');
  var Highlighter = _lazyIcon('Highlighter');
  var List = _lazyIcon('List');
  var ListOrdered = _lazyIcon('ListOrdered');
  var FileText = _lazyIcon('FileText');
  var Download = _lazyIcon('Download');
  const analysisIdeaDrafts = new Map();
  const analysisIdeaListeners = new Set();
  const analysisIdeaSourceKey = text => { let a = 2166136261, b = 5381; for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); } return text.length + ':' + (a >>> 0).toString(16) + ':' + (b >>> 0).toString(16); };
  function restoreAnalysisIdeaDrafts(saved, id, source) {
    if (saved?.version !== 1 || saved.source !== analysisIdeaSourceKey(source) || !Array.isArray(saved.drafts)) return null;
    const drafts = {};
    saved.drafts.slice(-40).forEach(draft => {
      if (!Number.isInteger(draft?.index) || draft.index < 0 || typeof draft.idea !== 'string' || draft.idea.length > 8000 || !['brainstorm', 'quiz', 'outline', 'sentence-frames'].includes(draft.type) || typeof draft.instructions !== 'string') return;
      drafts[JSON.stringify([draft.index, draft.idea])] = { id, source, index: draft.index, idea: draft.idea, type: draft.type, instructions: draft.instructions.slice(0, 4000), pending: false, failed: !!(draft.failed || draft.pending) };
    });
    return { selected: Object.hasOwn(drafts, saved.selected) ? saved.selected : null, drafts };
  }
  // Host "Needs AI setup" doorway for teacher AI actions; null on old hosts.
  function _analysisAiDoor(t) {
    try { return typeof window.__alloAiSetupDoorway === 'function' ? window.__alloAiSetupDoorway('text', t) : null; } catch (_) { return null; }
  }
  // Georgia (font-serif on Windows) cannot stack two marks on one letter (Vietnamese ấ, ặ); such passages use serif fonts that can.
  const STACKED_MARK_SERIF = 'ui-serif, Cambria, "Times New Roman", "Noto Serif", Tinos, Georgia, serif';
  const needsStackedMarkFont = text => typeof text === 'string' && /[\u1EA0-\u1EF9]|[\u0300-\u036F]{2}/.test(text);
  function AnalysisView(props) {
    // State reads
    var t = props.t;
    var analysisAiDoor = _analysisAiDoor(t), analysisAiOff = !!analysisAiDoor?.disabled;
    var analysisLabel = function (key, fallback) {
      var value = typeof t === 'function' ? t(key) : '';
      return value && value !== key ? value : fallback;
    };
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
    // Bind edits to the resource that created the callback, including async corrections.
    var updateAnalysisResource = function (updater) {
      const id = generatedContent && generatedContent.id;
      if (typeof props.onUpdateResource === 'function') return props.onUpdateResource(id, updater);
      setGeneratedContent(prev => prev && prev.id === id ? updater(prev) : prev);
      if (typeof props.setHistory === 'function') props.setHistory(items => items.map(item => item.id === id ? updater(item) : item));
    };
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
    // Download-as-MP3 for the ORIGINAL source text — same AudioHelpers flow
    // the leveled-text view uses, so audio of the unleveled text is available
    // too (not just the simplified version).
    var handleDownloadAudio = props.handleDownloadAudio;
    var downloadingContentId = props.downloadingContentId;
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
    const readingApi = window.AlloModules && window.AlloModules.InstructionalContext;
    const readingProfile = readingApi?.getInstructionalText?.(generatedContent) || generatedContent?.instructionalText || { role: 'unspecified', form: 'original' };
    const roleMainLabel = analysisLabel('simplified.role_main_reading', 'Main reading');
    const roleSupportingLabel = analysisLabel('simplified.role_supporting_reading', 'Supporting reading');
    const roleNoneLabel = analysisLabel('simplified.role_not_designated', 'Not designated');
    const readingRoleLabel = readingProfile.role === 'primary' ? roleMainLabel : readingProfile.role === 'supplemental' ? roleSupportingLabel : roleNoneLabel;
    const readingFormLabel = readingProfile.form === 'adapted' ? analysisLabel('common.adapted_text', 'Adapted text') : readingProfile.form === 'same-text-supported' ? analysisLabel('analysis.form_supported', 'Original with supports') : analysisLabel('analysis.form_original', 'Original text');
    const mainNeedsReview = readingProfile.form === 'adapted' && readingProfile.role === 'primary' && !(readingProfile.replacementAuthorization?.authorized === true && readingProfile.replacementAuthorization?.source === 'educator');
    const changeReadingRole = (nextRole) => {
      const adaptedPrimary = readingProfile.form === 'adapted' && nextRole === 'primary';
      if (adaptedPrimary && !(readingProfile.role === 'primary' && readingProfile.replacementAuthorization?.authorized === true && readingProfile.replacementAuthorization?.source === 'educator')) {
        if (!window.confirm(analysisLabel('analysis.confirm_adapted_main', 'Use this adapted text as a main reading for this lesson? This records your explicit teacher designation. The original will remain available.'))) return;
      }
      props.onInstructionalRoleChange?.(generatedContent, nextRole, { authorizeReplacement: adaptedPrimary });
    };
    // Model output can be malformed or from an older save: never dereference it blindly.
    const analysisData = generatedContent && generatedContent.data && typeof generatedContent.data === 'object' ? generatedContent.data : {};
    const editedSource = analysisData.analysisNeedsRecheck === true;
    const incomplete = analysisData.analysisIncomplete === true || window.AlloModules?.GenerationMatrix?.isIncompleteSourceAnalysis?.(generatedContent);
    const coverage = window.AlloModules?.GenerationMatrix?.getSourceAnalysisCoverage?.(generatedContent);
    const partial = coverage && !coverage.complete && !editedSource;
    const needsRecheck = editedSource || incomplete || partial;
    const [checkingEditedSource, setCheckingEditedSource] = React.useState(false);
    const recheckInFlight = React.useRef(false);
    async function recheckEditedSource() {
      if (recheckInFlight.current || typeof props.onRecheckAnalysis !== 'function') return;
      recheckInFlight.current = true;
      setCheckingEditedSource(true);
      try { await props.onRecheckAnalysis(generatedContent); }
      catch (_) { addToast?.(analysisLabel('analysis.recheck_failed', 'The check did not finish. You can retry with the edited text.'), 'error'); }
      finally { recheckInFlight.current = false; setCheckingEditedSource(false); }
    }
    const asText = value => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
    const isUnreadableNote = value => !!value && typeof value === 'object';
    const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
    const pipelineApi = window.AlloModules?.TextPipelineHelpers;
    const sameLanguage = (a, b) => typeof pipelineApi?.isSameLanguage === 'function' ? pipelineApi.isSameLanguage(a, b) : asText(a).trim().toLowerCase() === asText(b).trim().toLowerCase();
    // The reader's language on THIS device: the teacher's for the report, a student's for the passage.
    const appLanguage = asText(props.currentUiLanguage).trim() || 'English';
    const baseReportLanguage = asText(analysisData.reportLanguage || generatedContent?.config?.language).trim();
    const reportTranslations = isRecord(analysisData.reportTranslations) ? analysisData.reportTranslations : {};
    const reportLanguages = Object.keys(reportTranslations).filter(language => language.trim() && language !== baseReportLanguage && isRecord(reportTranslations[language]));
    const chosenReportLanguage = analysisData.displayReportLanguage;
    const preferredReportLanguage = chosenReportLanguage && (chosenReportLanguage === baseReportLanguage || reportLanguages.includes(chosenReportLanguage)) ? chosenReportLanguage
      : [baseReportLanguage, ...reportLanguages].find(language => sameLanguage(language, appLanguage)) || baseReportLanguage;
    // Persist only the display preference so reopening and exporting use the chosen report.
    // Functional updates preserve any newer source edits, findings and provenance.
    const reportSelectionKey = JSON.stringify([generatedContent?.id, baseReportLanguage, analysisData.displayReportLanguage]);
    const [reportSelection, setReportSelection] = React.useState(null);
    const selectedReportLanguage = reportSelection?.key === reportSelectionKey && (reportSelection.language === baseReportLanguage || reportLanguages.includes(reportSelection.language)) ? reportSelection.language : preferredReportLanguage;
    const changeReportLanguage = language => {
      if (language !== baseReportLanguage && !reportLanguages.includes(language)) return;
      setReportSelection({ key: reportSelectionKey, language });
      const id = generatedContent?.id;
      const updateDisplayPreference = item => item && item.id === id && item.data && item.data.displayReportLanguage !== language
        ? { ...item, data: { ...item.data, displayReportLanguage: language } } : item;
      updateAnalysisResource(updateDisplayPreference);
    };
    const isTranslatedReport = selectedReportLanguage !== baseReportLanguage && reportLanguages.includes(selectedReportLanguage);
    const reportData = isTranslatedReport ? reportTranslations[selectedReportLanguage] : analysisData;
    const baseAccuracy = isRecord(analysisData.accuracy) ? analysisData.accuracy : {};
    const translatedAccuracy = isRecord(reportData.accuracy) ? reportData.accuracy : {};
    // Only the explanations change language. Ratings, citations and measurements describe the source.
    const accuracy = { ...baseAccuracy, ...translatedAccuracy, rating: baseAccuracy.rating, citations: baseAccuracy.citations };
    const accuracyRating = asText(baseAccuracy.rating).trim() || analysisLabel('analysis.rating_unknown', 'Not rated');
    // Ratings and grade ranges are stored in fixed English so every tool can read them; translate on display.
    const ratingKey = rating => (/^(high|moderate|medium|low)\.?$/i.exec(asText(rating).trim()) || [])[1]?.toLowerCase().replace('medium', 'moderate') || '';
    const ratingText = rating => { const key = ratingKey(rating); return key ? analysisLabel('analysis.rating_' + key, { high: 'High', moderate: 'Moderate', low: 'Low' }[key]) : asText(rating); };
    const accuracyRatingLabel = ratingText(accuracyRating);
    // Uses gradeName (below): the grade picker's translated labels. Called only while rendering.
    const englishGrade = value => /^(k|kindergarten)$/i.test(value) ? 'Kindergarten'
      : Number(value) >= 1 && Number(value) <= 12 ? Number(value) + ({ 1: 'st', 2: 'nd', 3: 'rd' }[Number(value)] || 'th') + ' Grade' : '';
    const rangeText = range => {
      const raw = asText(range).trim();
      if (sameLanguage(appLanguage, 'English')) return raw;
      const span = /^(?:grades?\s*)?(k|kindergarten|\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s*grades?$/i.exec(raw);
      const one = !span && /^(k|kindergarten|\d{1,2})(?:st|nd|rd|th)?\s*grade$/i.exec(raw);
      const ends = span ? [span[1], span[2]] : one ? [one[1]] : [];
      const names = ends.map(englishGrade);
      return names.length && names.every(Boolean) ? names.map(gradeName).join(' – ') : raw;
    };
    const concepts = reportData.concepts ?? analysisData.concepts;
    const conceptList = (Array.isArray(concepts) ? concepts : [concepts]).map(asText).filter(concept => concept.trim());
    const baseReadingLevel = isRecord(analysisData.readingLevel) ? analysisData.readingLevel : null;
    const readingLevel = baseReadingLevel ? { ...baseReadingLevel, explanation: isRecord(reportData.readingLevel) ? reportData.readingLevel.explanation ?? baseReadingLevel.explanation : baseReadingLevel.explanation } : null;
    const factReader = window.AlloModules?.GenDispatcher?.getAnalysisFactRows;
    const factRows = factReader ? factReader(baseAccuracy, translatedAccuracy) : ['verifiedFacts', 'unsourcedFacts'].flatMap(field =>
      (Array.isArray(baseAccuracy[field]) ? baseAccuracy[field] : []).filter(fact => typeof fact === 'string' && fact.trim()).map(text => ({ text, sources: [] })));
    const verifiedFactList = factRows.filter(row => row.sources.length);
    const unsourcedFactList = factRows.filter(row => !row.sources.length);
    // Fit to the lesson's targets. The reading-level gap comes from the local Flesch-Kincaid
    // measurement and the grade calibration table, never from the AI's estimate. Depth of
    // Knowledge is the AI's estimate, shown with its reason.
    const fillLabel = (text, values) => String(text).replace(/\{(\w+)\}/g, (match, key) => values[key] != null ? values[key] : match);
    const savedAnalysisTargets = isRecord(analysisData.analysisTargets) ? analysisData.analysisTargets : {};
    const currentAnalysisTargets = isRecord(props.currentAnalysisTargets) ? props.currentAnalysisTargets : null;
    const targetPair = targets => [asText(targets?.grade).trim(), asText(targets?.dok).trim()];
    const targetsDiffer = !!currentAnalysisTargets && JSON.stringify(targetPair(currentAnalysisTargets)) !== JSON.stringify(targetPair(savedAnalysisTargets));
    const comparisonKey = JSON.stringify([generatedContent?.id, analysisData.originalText, targetPair(savedAnalysisTargets), targetPair(currentAnalysisTargets)]);
    const [selectedComparison, setSelectedComparison] = React.useState(null);
    const comparingTargets = targetsDiffer && selectedComparison === comparisonKey;
    const analysisTargets = comparingTargets ? currentAnalysisTargets : savedAnalysisTargets;
    const measure = props.calculateReadability;
    const savedStats = isRecord(analysisData.localStats) ? analysisData.localStats : null;
    const fitStats = React.useMemo(() => {
      const text = analysisData.originalText;
      if (!savedStats || !measure || typeof text !== 'string') return savedStats;
      // Some older reports measured a language excerpt. Only refresh a score
      // when the current passage matches the words and syllables that were measured.
      const fresh = measure(text);
      return fresh && fresh.words === savedStats.words && fresh.syllables === savedStats.syllables ? fresh : savedStats;
    }, [savedStats, measure, analysisData.originalText]);
    const complexityTarget = analysisTargets.grade && typeof readingApi?.getComplexityTarget === 'function' ? readingApi.getComplexityTarget(analysisTargets.grade) : null;
    const measuredGrade = fitStats && fitStats.score != null && String(fitStats.score).trim() ? Number(fitStats.score) : NaN;
    const englishSource = typeof readingApi?.isEnglishLanguage !== 'function' || readingApi.isEnglishLanguage(asText(analysisData.sourceLanguage) || 'English');
    // The grade picker's own translated labels, keyed like its options.
    const gradeName = label => {
      const key = /^kindergarten$/i.test(label) ? 'k' : /^college$/i.test(label) ? 'college' : /^graduate/i.test(label) ? 'grad' : (String(label).match(/^(\d+)(?:st|nd|rd|th) Grade$/i) || [])[1] ? 'g' + String(label).match(/^(\d+)/)[1] : '';
      return key ? analysisLabel('input.level_options.' + key, label) : label;
    };
    const gradeFit = complexityTarget && Number.isFinite(measuredGrade) ? (() => {
      const status = measuredGrade > complexityTarget.fkRange.max ? 'above' : measuredGrade < complexityTarget.fkRange.min ? 'below' : 'within';
      const asl = fitStats.sentences ? fitStats.words / fitStats.sentences : NaN;
      const asw = fitStats.words ? fitStats.syllables / fitStats.words : NaN;
      return { status, asl, asw, aslMax: complexityTarget.averageSentenceLengthMax, aswMax: complexityTarget.averageSyllablesPerWordMax, range: complexityTarget.fkLabel, grade: gradeName(complexityTarget.label), score: measuredGrade.toFixed(1) };
    })() : null;
    const baseDok = isRecord(analysisData.depthOfKnowledge) && Number(analysisData.depthOfKnowledge.level) >= 1 ? analysisData.depthOfKnowledge : null;
    const dok = baseDok ? { ...baseDok, ...(isRecord(reportData.depthOfKnowledge) ? reportData.depthOfKnowledge : {}), level: Number(baseDok.level) } : null;
    const dokTarget = analysisTargets.dok === 'Mixed' ? 3 : Number((asText(analysisTargets.dok).match(/([1-4])/) || [])[1]) || null;
    // The same level names the Depth of Knowledge setting shows (already translated).
    const dokName = level => analysisLabel('wizard.dok_levels.l' + level, ({ 1: 'Level 1: Recall & Reproduction', 2: 'Level 2: Skill/Concept', 3: 'Level 3: Strategic Thinking', 4: 'Level 4: Extended Thinking' })[level] || '');
    const dokIdeas = dok && Array.isArray(dok.ideas) ? dok.ideas.map(asText).filter(idea => idea.trim()) : [];
    const sourceText = asText(analysisData.originalText);
    const detailed = generatedContent?.levelCheck;
    const checkedLevel = detailed?.contentFingerprint && detailed.contentFingerprint === readingApi?.fingerprintText?.(sourceText)
      && (!analysisTargets.grade || detailed.targetGradeLevel === analysisTargets.grade) ? detailed : null;
    const estimate = asText(checkedLevel?.confirmedLevel || readingLevel?.range || (!readingLevel && analysisData.readingLevel));
    // Compare only explicit school grade ranges, never a year, age or reading age.
    const gradeRange = /^(?:grades?\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?)?(?:\s*grades?)?$/i.exec(estimate.trim());
    const targetNumber = complexityTarget?.numericGrade;
    const qualitativeFit = gradeRange && Number(gradeRange[1]) <= 12 && Number(gradeRange[2] || gradeRange[1]) <= 12 && Number.isFinite(targetNumber)
      ? Number(gradeRange[1]) > targetNumber ? 'above' : Number(gradeRange[2] || gradeRange[1]) < targetNumber ? 'below' : 'within' : null;
    const ideaDraftKey = JSON.stringify([generatedContent?.id, sourceText]);
    if (!analysisIdeaDrafts.has(ideaDraftKey)) {
      const restored = restoreAnalysisIdeaDrafts(analysisData.analysisIdeaDrafts, generatedContent?.id, sourceText);
      if (restored) { analysisIdeaDrafts.set(ideaDraftKey, restored); while (analysisIdeaDrafts.size > 10) analysisIdeaDrafts.delete(analysisIdeaDrafts.keys().next().value); }
    }
    const [ideaState, setIdeaState] = React.useState(() => analysisIdeaDrafts.get(ideaDraftKey) || null);
    const ideaOwnerRef = React.useRef(ideaDraftKey);
    ideaOwnerRef.current = ideaDraftKey;
    React.useEffect(() => { const update = (key, value) => { if (ideaOwnerRef.current === key) setIdeaState(value); }; analysisIdeaListeners.add(update); return () => analysisIdeaListeners.delete(update); }, []);
    React.useEffect(() => { setIdeaState(analysisIdeaDrafts.get(ideaDraftKey) || null); }, [ideaDraftKey]);
    const rememberIdeaState = (key, value) => {
      if (value) { analysisIdeaDrafts.delete(key); analysisIdeaDrafts.set(key, value); while (analysisIdeaDrafts.size > 10) analysisIdeaDrafts.delete(analysisIdeaDrafts.keys().next().value); }
      else analysisIdeaDrafts.delete(key);
      analysisIdeaListeners.forEach(update => update(key, value));
      const saved = value ? { version: 1, source: analysisIdeaSourceKey(sourceText), selected: value.selected, drafts: Object.values(value.drafts).slice(-40).map(({ index, idea, type, instructions, pending, failed }) => ({ index, idea, type, instructions, pending: !!pending, failed: !!failed })) } : null;
      updateAnalysisResource(item => item?.id === generatedContent?.id && item.data?.originalText === sourceText ? { ...item, data: { ...item.data, analysisIdeaDrafts: saved } } : item);
    };
    const selectIdea = (index, idea) => {
      const state = analysisIdeaDrafts.get(ideaDraftKey) || { selected: null, drafts: {} }, key = JSON.stringify([index, idea]);
      rememberIdeaState(ideaDraftKey, { selected: state.selected === key ? null : key, drafts: { ...state.drafts, [key]: state.drafts[key] || { id: generatedContent.id, source: sourceText, index, idea, type: 'brainstorm', instructions: idea } } });
    };
    const setIdeaDraft = value => {
      const state = analysisIdeaDrafts.get(ideaDraftKey);
      if (state?.selected) rememberIdeaState(ideaDraftKey, { ...state, drafts: { ...state.drafts, [state.selected]: value } });
    };
    const submitAnalysisIdea = async event => {
      event.preventDefault();
      const state = analysisIdeaDrafts.get(ideaDraftKey), selected = state?.selected, draft = state?.drafts[selected];
      if (!draft?.instructions.trim() || Object.values(state.drafts).some(value => value.pending) || isProcessing || !ideaTypes.some(([type]) => type === draft.type)) return;
      const key = ideaDraftKey, pending = { ...draft, pending: true, failed: false };
      rememberIdeaState(key, { ...state, drafts: { ...state.drafts, [selected]: pending } });
      const finish = success => {
        const latest = analysisIdeaDrafts.get(key);
        if (latest?.drafts[selected] !== pending) return;
        const drafts = { ...latest.drafts };
        if (success) delete drafts[selected]; else drafts[selected] = { ...pending, pending: false, failed: true };
        rememberIdeaState(key, { selected: success && latest.selected === selected ? null : latest.selected, drafts });
      };
      try { const result = await props.onGenerateFromIdea(pending.type, pending.instructions.trim()); finish(!!result?.id && result.type === pending.type); }
      catch (_) { finish(false); }
    };
    const ideaDraft = ideaState?.drafts[ideaState.selected];
    const activeIdea = ideaDraft?.id === generatedContent?.id && ideaDraft?.source === sourceText && dokIdeas[ideaDraft.index] === ideaDraft.idea ? ideaDraft : null;
    const ideaTypes = [
      ['brainstorm', analysisLabel('sidebar.tool_brainstorm', 'Discussion activity')],
      ['quiz', analysisLabel('sidebar.tool_quiz', 'Quiz')],
      ['outline', analysisLabel('sidebar.tool_outline', 'Graphic organizer')],
      ['sentence-frames', analysisLabel('sidebar.tool_sentence_frames', 'Sentence frames')]
    ];
    const targetFitCard = (targetsDiffer || gradeFit || (complexityTarget && !englishSource) || dok) && <section data-analysis-target-fit className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6 text-sm text-slate-700">
      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{analysisLabel(comparingTargets ? 'analysis.fit_current_title' : 'analysis.fit_saved_title', comparingTargets ? 'Fit to current targets' : 'Fit to saved targets')}</h4>
      {targetsDiffer && <div data-analysis-target-comparison className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <p><strong>{analysisLabel('analysis.saved_targets', 'Saved report targets')}:</strong> {gradeName(savedAnalysisTargets.grade || '') || '—'} · {asText(savedAnalysisTargets.dok) || '—'}</p>
        <p><strong>{analysisLabel('analysis.current_targets', 'Current settings')}:</strong> {gradeName(currentAnalysisTargets.grade || '') || '—'} · {asText(currentAnalysisTargets.dok) || '—'}</p>
        <button type="button" aria-pressed={comparingTargets} className="my-2 min-h-11 rounded border border-indigo-600 bg-white px-3 font-semibold text-indigo-900" onClick={() => setSelectedComparison(comparingTargets ? null : comparisonKey)}>{comparingTargets ? analysisLabel('analysis.show_saved_targets', 'Show saved targets') : analysisLabel('analysis.compare_current_targets', 'Compare with current targets')}</button>
        {comparingTargets && <p role="status">{analysisLabel('analysis.comparison_only', 'This comparison uses the report’s existing estimates. No new analysis is run, and the saved report is unchanged.')}</p>}
      </div>}
      {gradeFit && englishSource && <div data-grade-fit={gradeFit.status} className="mb-3">
        <p className="font-semibold">{analysisLabel('analysis.formula_estimate', 'Sentence and word length')}</p>
        <p className="leading-relaxed">{fillLabel(gradeFit.status === 'within' ? analysisLabel('analysis.fit_within', 'Reads within your target for {grade} (Flesch-Kincaid {range}).')
          : gradeFit.status === 'above' ? analysisLabel('analysis.fit_above', 'Reads above your target for {grade}: Flesch-Kincaid {score}, target {range}.')
          : analysisLabel('analysis.fit_below', 'Flesch-Kincaid {score} is below the reference range for {grade} ({range}).'), gradeFit)}</p>
        {gradeFit.status === 'above' && <ul className="mt-2 list-disc pl-5 space-y-1">
          {gradeFit.asl > gradeFit.aslMax && <li data-fit-tip="sentences">{fillLabel(analysisLabel('analysis.fit_sentences', 'Sentences average {value} words; for this grade aim for about {max} or fewer.'), { value: gradeFit.asl.toFixed(1), max: gradeFit.aslMax })}</li>}
          {gradeFit.asw > gradeFit.aswMax && <li data-fit-tip="syllables">{fillLabel(analysisLabel('analysis.fit_syllables', 'Words average {value} syllables; for this grade aim for about {max} or fewer.'), { value: gradeFit.asw.toFixed(2), max: gradeFit.aswMax.toFixed(2) })}</li>}
        </ul>}
      </div>}
      {complexityTarget && !englishSource && <p className="mb-3 leading-relaxed">{analysisLabel('analysis.fit_not_english', 'Readability formulas measure English text only, so there is no grade comparison for this source.')}</p>}
      {complexityTarget && estimate && <div data-qualitative-fit={qualitativeFit || 'unclassified'} className="mb-3">
        <p><strong>{analysisLabel('analysis.qualitative_estimate', 'AI estimate of reading demands')}</strong> · {gradeName(estimate)}</p>
        {readingLevel?.explanation && !checkedLevel && <p>{formatInlineText(asText(readingLevel.explanation), false)}</p>}
        {gradeFit && englishSource && qualitativeFit && qualitativeFit !== gradeFit.status && <p data-fit-disagreement className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-950">{analysisLabel('analysis.fit_disagreement', 'The estimates differ. Consider the vocabulary, concepts and background knowledge this passage asks of your readers.')}</p>}
      </div>}
      {!comparingTargets && complexityTarget && sourceText && typeof props.onCheckSourceLevel === 'function' && <details className="mb-3 rounded-lg border p-3">
        <summary className="cursor-pointer font-semibold">{analysisLabel('analysis.detailed_level', 'Detailed level check')}</summary>
        {checkedLevel && <div className="mt-2" data-source-level-rubric><p>{asText(checkedLevel.nuanceSummary || checkedLevel.feedback)}</p>
          <dl>{[['vocabulary', 'Vocabulary'], ['sentenceStructure', 'Sentence structure'], ['conceptDensity', 'Concept density']].map(([key, label]) => {
            const row = checkedLevel.rubric?.[key]; return row && <React.Fragment key={key}><dt className="mt-2 font-semibold">{analysisLabel('analysis.rubric_' + key, label)}{Number.isFinite(row.score) ? ' (' + (row.score > 0 ? '+' : '') + row.score + ')' : ''}</dt><dd>{asText(row.reason)}</dd></React.Fragment>;
          })}</dl>{checkedLevel.checkedChars < checkedLevel.totalChars && <p>{fillLabel(analysisLabel('analysis.checked_excerpt', 'Based on the first {count} characters.'), { count: checkedLevel.checkedChars })}</p>}</div>}
        <p className="my-2">{analysisLabel('analysis.level_help', 'Use the same two-pass review as Adapted Text to check vocabulary, sentence structure and concept density against your target grade.')}</p>
        <button type="button" disabled={props.isCheckingLevel === true || isProcessing} onClick={props.onCheckSourceLevel} className="min-h-11 rounded border px-3 font-bold">{props.isCheckingLevel === true ? analysisLabel('simplified.checking', 'Checking…') : analysisLabel('simplified.check_level', 'Check level')}</button>
      </details>}
      {dok && <div data-dok-level={dok.level} data-dok-target={dokTarget || undefined}>
        <p className="leading-relaxed"><strong>{fillLabel(analysisLabel('analysis.dok_supports', 'This text supports up to Depth of Knowledge {name}.'), { name: dokName(dok.level) })}</strong>{asText(dok.reason) ? ' ' : ''}{formatInlineText(asText(dok.reason), false)}</p>
        {dokTarget && <p className="mt-1 leading-relaxed">{fillLabel(dok.level >= dokTarget ? analysisLabel('analysis.dok_target_met', 'Your target is DOK {target}; this text can support it.') : analysisLabel('analysis.dok_target_below', 'Your target is DOK {target}; this text alone reaches DOK {level}.'), { target: dokTarget, level: dok.level })}</p>}
        {dokIdeas.length > 0 && <><h5 className="mt-3 text-xs font-bold text-slate-600">{dokTarget && dok.level < dokTarget ? analysisLabel('analysis.dok_ideas_reach', 'Ideas to reach your target') : analysisLabel('analysis.dok_ideas_beyond', 'Ideas to go further')}</h5>
          <ul className="mt-1 list-disc pl-5 space-y-2">{dokIdeas.map((idea, index) => <li key={index}>{formatInlineText(idea, false)}
            {!comparingTargets && sourceText && typeof props.onGenerateFromIdea === 'function' && <button type="button" className="ms-2 min-h-11 rounded px-2 font-semibold text-indigo-800 underline" disabled={isProcessing || !!activeIdea?.pending} aria-expanded={activeIdea?.index === index} onClick={() => selectIdea(index, idea)}>{analysisLabel('analysis.use_idea', 'Use this idea')}</button>}
            {!comparingTargets && activeIdea?.index === index && <form className="mt-2 grid gap-2 rounded-lg border p-3" onSubmit={submitAnalysisIdea}>
              {activeIdea.failed && <p role="status">{analysisLabel('analysis.idea_retry_kept', 'Generation did not finish. Your resource choice and instructions are still here. Edit them or try again.')}</p>}
              <label>{analysisLabel('analysis.idea_resource', 'Resource to create')} <select disabled={isProcessing || !!activeIdea.pending} value={activeIdea.type} onChange={event => setIdeaDraft({ ...activeIdea, type: event.target.value })}>{ideaTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
              <label>{analysisLabel('analysis.idea_instructions', 'Instructions for this resource')}<textarea className="mt-1 block w-full rounded border p-2" rows={3} maxLength={4000} disabled={isProcessing || !!activeIdea.pending} value={activeIdea.instructions} onChange={event => setIdeaDraft({ ...activeIdea, instructions: event.target.value })} /></label>
              <button type="submit" disabled={isProcessing || !!activeIdea.pending || !activeIdea.instructions.trim()} className="min-h-11 justify-self-start rounded-lg bg-indigo-700 px-3 font-bold text-white">{analysisLabel('analysis.generate_resource', 'Generate resource')}</button>
            </form>}</li>)}</ul></>}
      </div>}
    </section>;
    // Only a web search with attributable sources verifies accuracy. Older reports carry no
    // marker; their citations are the evidence that a search ran.
    const accuracyVerified = verifiedFactList.length > 0 || (factReader && factReader({ ...baseAccuracy,
      verifiedFacts: baseAccuracy.discrepancies, unsourcedFacts: [] }).some(row => row.sources.length));
    const showAiRating = !accuracyVerified && baseAccuracy.verificationNote !== 'search-unavailable' && !/^not (?:web-)?verified$/i.test(accuracyRating);
    const accuracyBadge = accuracyVerified
      ? <span data-accuracy-verification="web-search" className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${ratingKey(accuracyRating) === 'high' || accuracyRating.toLowerCase().includes('high') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>{fillLabel(analysisLabel('analysis.accuracy_ai_rating', 'AI rating: {rating}'), { rating: accuracyRatingLabel })}</span>
      : <span data-accuracy-verification="ai-estimate" className="flex flex-wrap items-center gap-2"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide border bg-slate-100 text-slate-700 border-slate-300">{analysisLabel('analysis.accuracy_ai_estimate', 'AI estimate, not verified')}</span>{showAiRating && <span className="text-xs text-slate-600">{fillLabel(analysisLabel('analysis.accuracy_ai_rating', 'AI rating: {rating}'), { rating: accuracyRatingLabel })}</span>}</span>;
    const DISCREPANCY_FIXED_PREFIX = '✓ FIXED: ';
    const isFixedDiscrepancy = note => typeof note === 'string' && note.startsWith('✓ FIXED:');
    const [factualProposal, setFactualProposal] = React.useState(null);
    const activeFactualProposal = factualProposal && factualProposal.resourceId === generatedContent?.id ? factualProposal : null;
    const barrierSource = isRecord(reportData.learnerBarriers) ? reportData.learnerBarriers : isRecord(analysisData.learnerBarriers) ? analysisData.learnerBarriers : null;
    const barrierGroups = barrierSource ? [
      ['backgroundKnowledge', analysisLabel('analysis.barriers_background', 'Background knowledge')],
      ['figurativeLanguage', analysisLabel('analysis.barriers_figurative', 'Idioms and figurative language')],
      ['textStructure', analysisLabel('analysis.barriers_structure', 'Text structure')],
      ['biasRepresentation', analysisLabel('analysis.barriers_bias', 'Bias and representation')]
    ].map(([key, label]) => ({ key, label, items: (Array.isArray(barrierSource[key]) ? barrierSource[key] : []).map(asText).filter(item => item.trim()) })).filter(group => group.items.length) : [];
    const learnerBarriersCard = barrierGroups.length > 0 && <section data-analysis-learner-barriers className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6 text-sm text-slate-700">
      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{analysisLabel('analysis.barriers_title', 'Possible learner barriers')}</h4>
      <p className="text-xs text-slate-600 mb-3">{analysisLabel('analysis.barriers_note', 'AI suggestions to check against what you know about your students.')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{barrierGroups.map(group => <div key={group.key} data-barrier-group={group.key}><h5 className="text-xs font-bold text-slate-700 mb-1">{group.label}</h5><ul className="list-disc pl-5 space-y-1">{group.items.map((item, index) => <li key={index}>{formatInlineText(item, false)}</li>)}</ul></div>)}</div>
    </section>;
    const isTranslatedDisplay = typeof analysisData.translatedText === 'string' && !!analysisData.translatedText.trim();
    const canChangeReportNotes = isTeacherMode && !isTranslatedReport;
    // Factual notes describe the source; on a translated display the fix would edit the wrong text.
    const canFixFacts = canChangeReportNotes && !isTranslatedDisplay;
    const factualFixMessages = {
      'no-selection': () => t('process.select_error') || 'Select at least one note to fix.',
      length: () => analysisLabel('analysis.factual_fix_too_large', 'The proposed fix changed too much of the text, so it was not offered. Try again with fewer notes selected.'),
      citations: () => analysisLabel('analysis.factual_fix_citations', 'The proposed fix changed a source citation, so it was not offered. Try again or edit the text by hand.'),
      'no-change': () => analysisLabel('analysis.factual_fix_no_change', 'The AI found nothing to change for the selected notes.')
    };
    const handleProposeFactualFix = async () => {
      if (!canFixFacts || isProcessing || typeof handleAutoCorrectSource !== 'function') return;
      setFactualProposal(null);
      let result = null;
      try { result = await handleAutoCorrectSource(); } catch (err) { warnLog('Factual fix failed:', err); }
      if (result && result.ok === true && typeof result.corrected === 'string' && typeof result.original === 'string') {
        setFactualProposal({ ...result, resourceId: result.resourceId || generatedContent?.id });
        return;
      }
      const message = result && factualFixMessages[result.reason];
      addToast(message ? message() : (t('process.correction_error') || 'The correction could not be prepared. Please try again.'), message ? 'warning' : 'error');
    };
    const applyFactualProposal = async () => {
      const proposal = activeFactualProposal;
      if (!proposal) return;
      setFactualProposal(null);
      if (typeof props.onCorrectAnalysisText !== 'function') {
        addToast(t('process.grammar_fix_failed') || 'The source editor is unavailable. Please reload and try again.', 'error');
        return;
      }
      const applied = await props.onCorrectAnalysisText(proposal.resourceId, proposal.original, proposal.corrected, []);
      if (applied === false) {
        addToast(analysisLabel('analysis.factual_fix_source_changed', 'The source changed after this fix was prepared, so it was not applied. Prepare the fix again.'), 'warning');
        return;
      }
      const fixedNotes = new Set(proposal.notes || []);
      updateAnalysisResource(prev => {
        const acc = prev && prev.data && prev.data.accuracy;
        if (!acc || !Array.isArray(acc.discrepancies)) return prev;
        return { ...prev, data: { ...prev.data, accuracy: { ...acc, discrepancies: acc.discrepancies.map(note => typeof note === 'string' && fixedNotes.has(note) ? DISCREPANCY_FIXED_PREFIX + note : note) } } };
      });
      addToast(t('process.correction_success') || 'Correction applied.', 'success');
    };
    const factualChanges = (() => {
      if (!activeFactualProposal) return [];
      const split = text => String(text).split(/\n[ \t]*\n/);
      const before = split(activeFactualProposal.original), after = split(activeFactualProposal.corrected);
      if (before.length !== after.length) return [{ before: activeFactualProposal.original, after: activeFactualProposal.corrected }];
      return before.map((text, index) => ({ before: text, after: after[index] })).filter(pair => pair.before.trim() !== pair.after.trim());
    })();
    const factualPreview = activeFactualProposal && <section data-factual-fix-preview aria-label={analysisLabel('analysis.factual_fix_preview_title', 'Review the proposed fix')} className="mt-3 rounded border border-indigo-300 bg-white p-3 text-xs text-slate-800">
      <h5 className="font-bold text-indigo-900 mb-1">{analysisLabel('analysis.factual_fix_preview_title', 'Review the proposed fix')}</h5>
      <p className="mb-2 text-slate-700">{analysisLabel('analysis.factual_fix_preview_note', 'Nothing has changed yet. Compare the passages, then apply the fix to this source or discard it.')}</p>
      {factualChanges.map((pair, index) => <div key={index} className="mb-2 grid grid-cols-1 md:grid-cols-2 gap-2"><div><div className="font-bold text-slate-700">{analysisLabel('analysis.factual_fix_before', 'Current text')}</div><div data-fix-before className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2">{pair.before}</div></div><div><div className="font-bold text-indigo-900">{analysisLabel('analysis.factual_fix_after', 'Proposed text')}</div><div data-fix-after className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-indigo-200 bg-indigo-50 p-2">{pair.after}</div></div></div>)}
      <div className="flex flex-wrap gap-2"><button type="button" data-fix-apply onClick={applyFactualProposal} disabled={isProcessing} className="min-h-11 rounded bg-indigo-700 px-3 font-bold text-white focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50">{analysisLabel('analysis.factual_fix_apply', 'Apply fix')}</button><button type="button" data-fix-discard onClick={() => setFactualProposal(null)} className="min-h-11 rounded border border-slate-400 bg-white px-3 font-bold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500">{analysisLabel('analysis.factual_fix_discard', 'Discard')}</button></div>
    </section>;
    const normalizedText = text => asText(text).trim().replace(/\s+/g, ' ');
    const sourceTranslationMap = isRecord(analysisData.sourceTranslations) ? analysisData.sourceTranslations : {};
    const sourceTranslations = Object.entries(sourceTranslationMap).filter(([language, text]) => language.trim() && typeof text === 'string' && text.trim() && normalizedText(text) !== normalizedText(analysisData.originalText) && language.trim().toLowerCase() !== asText(analysisData.sourceLanguage).trim().toLowerCase());
    // Passage languages. The original stays first and selected; this device's app language
    // leads the prepared versions. Only teachers add versions (students cannot run AI).
    const passageVersions = sourceTranslations.slice().sort((a, b) => (sameLanguage(b[0], appLanguage) ? 1 : 0) - (sameLanguage(a[0], appLanguage) ? 1 : 0));
    const [passageView, setPassageView] = React.useState({ id: null, language: '' });
    const [passageBusy, setPassageBusy] = React.useState('');
    const shownPassageLanguage = passageView.id === generatedContent?.id && passageVersions.some(([language]) => language === passageView.language) ? passageView.language : '';
    const shownPassage = shownPassageLanguage ? sourceTranslationMap[shownPassageLanguage] : null;
    const passageFontStyle = needsStackedMarkFont(shownPassage) || needsStackedMarkFont(analysisData.originalText) ? { fontFamily: STACKED_MARK_SERIF } : undefined;
    const languageName = value => typeof pipelineApi?.normalizeLanguageName === 'function' ? pipelineApi.normalizeLanguageName(value) : asText(value).trim();
    // Saved names stay English. Show each language by its own name (what a newcomer
    // recognizes) plus its app-language name when that differs.
    const labelsOf = language => typeof pipelineApi?.languageLabels === 'function' ? pipelineApi.languageLabels(language, appLanguage)
      : { name: asText(language).trim(), native: asText(language).trim(), inUi: asText(language).trim(), tag: '' };
    const uiName = language => labelsOf(language).inUi;
    const languageLabel = language => {
      const names = labelsOf(language);
      const inUi = names.inUi.charAt(0).toLocaleUpperCase() + names.inUi.slice(1);
      return <><span lang={names.tag || undefined}>{names.native}</span>{names.native.toLocaleLowerCase() !== inUi.toLocaleLowerCase() ? ' · ' + inUi : ''}</>;
    };
    const languageList = list => typeof pipelineApi?.formatLanguageList === 'function' ? pipelineApi.formatLanguageList(list.map(uiName), appLanguage) : list.join(', ');
    const canTranslatePassage = isTeacherMode && typeof props.onTranslatePassage === 'function' && !!sourceText.trim();
    // An edit removes the passage versions (they no longer match); the host lists their languages here.
    const refreshLanguages = canTranslatePassage && Array.isArray(analysisData.passageVersionsToRefresh)
      ? analysisData.passageVersionsToRefresh.filter((language, index, all) => typeof language === 'string' && language.trim()
        && all.findIndex(other => sameLanguage(other, language)) === index
        && !sameLanguage(language, analysisData.sourceLanguage) && !sourceTranslations.some(([existing]) => sameLanguage(existing, language)))
      : [];
    const passageCandidates = canTranslatePassage && !needsRecheck
      ? [props.outputLanguage, ...(Array.isArray(props.selectedLanguages) ? props.selectedLanguages : []), appLanguage].map(languageName)
        .filter((language, index, all) => language && language !== 'All Selected Languages' && all.findIndex(other => sameLanguage(other, language)) === index
          && !sameLanguage(language, analysisData.sourceLanguage) && !sourceTranslations.some(([existing]) => sameLanguage(existing, language))
          && !refreshLanguages.some(pending => sameLanguage(pending, language)))
      : [];
    // Translate one language; save it only if the passage has not changed meanwhile. Resolves to the saved key, or '' when nothing was needed.
    const translatePassageInto = async (language, id, expectedText) => {
      const result = await props.onTranslatePassage(generatedContent, language);
      const added = isRecord(result?.data?.sourceTranslations) ? Object.entries(result.data.sourceTranslations).find(([key, text]) => sameLanguage(key, language) && typeof text === 'string' && text.trim()) : null;
      if (added || refreshLanguages.some(pending => sameLanguage(pending, language))) updateAnalysisResource(item => {
        if (!item || item.id !== id || !isRecord(item.data) || item.data.originalText !== expectedText) return item;
        const data = { ...item.data };
        if (added) data.sourceTranslations = { ...(isRecord(data.sourceTranslations) ? data.sourceTranslations : {}), [added[0]]: added[1] };
        if (Array.isArray(data.passageVersionsToRefresh)) {
          const left = data.passageVersionsToRefresh.filter(pending => !sameLanguage(pending, language));
          if (left.length) data.passageVersionsToRefresh = left; else delete data.passageVersionsToRefresh;
        }
        return { ...item, data };
      });
      return added ? added[0] : '';
    };
    const addPassageLanguage = async language => {
      if (passageBusy || !generatedContent) return;
      const id = generatedContent.id;
      setPassageBusy(language);
      try {
        const added = await translatePassageInto(language, id, analysisData.originalText);
        if (!added) { addToast?.(fillLabel(analysisLabel('analysis.passage_same_language', 'The passage is already in {language}.'), { language: uiName(language) }), 'info'); return; }
        setPassageView({ id, language: added });
      } catch (error) {
        warnLog?.('Passage translation failed', error);
        addToast?.(fillLabel(analysisLabel('analysis.passage_translation_failed', 'The {language} passage did not finish. Try again.'), { language: uiName(language) }), 'error');
      } finally { setPassageBusy(''); }
    };
    const refreshPassageVersions = async () => {
      if (passageBusy || !generatedContent || !refreshLanguages.length) return;
      const id = generatedContent.id;
      const expectedText = analysisData.originalText;
      setPassageBusy('refresh');
      try {
        for (const language of refreshLanguages) {
          try { await translatePassageInto(language, id, expectedText); } catch (error) {
            warnLog?.('Passage translation failed', error);
            addToast?.(fillLabel(analysisLabel('analysis.passage_translation_failed', 'The {language} passage did not finish. Try again.'), { language: uiName(language) }), 'error');
          }
        }
      } finally { setPassageBusy(''); }
    };
    const dismissPassageRefresh = () => updateAnalysisResource(item => {
      if (!item || item.id !== generatedContent?.id || !isRecord(item.data) || !('passageVersionsToRefresh' in item.data)) return item;
      const { passageVersionsToRefresh, ...data } = item.data;
      return { ...item, data };
    });
    const refreshLanguageList = languageList(refreshLanguages);
    // Read with supports opens the passage version on screen.
    const readWithSupportsButton = props.onReadOriginal && <button type="button" data-read-original data-read-language={shownPassageLanguage || undefined} onClick={() => shownPassageLanguage ? props.onReadOriginal(generatedContent, { language: shownPassageLanguage }) : props.onReadOriginal(generatedContent)} className={'min-h-11 max-w-full rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2' + (isTeacherMode ? ' w-full sm:ml-auto sm:w-auto' : '')}>{analysisLabel('analysis.read_with_supports', 'Read with supports')}{shownPassageLanguage ? <> · {languageLabel(shownPassageLanguage)}</> : null}</button>;
    const readingRoleControl = <section data-source-instructional-role={readingProfile.role} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
      <div className="flex flex-wrap items-center gap-2"><strong>{readingFormLabel}</strong><span aria-hidden="true">·</span><span>{readingRoleLabel}{mainNeedsReview ? ' (' + analysisLabel('analysis.needs_review', 'needs review') + ')' : ''}</span></div>
      {isTeacherMode && <div className="mt-3 flex flex-wrap items-center gap-3"><label className="inline-flex flex-wrap items-center gap-2">{analysisLabel('simplified.role_use_in_this_lesson', 'Use in this lesson')}<select aria-label={analysisLabel('simplified.role_use_in_this_lesson', 'Use in this lesson')} value={readingProfile.role} disabled={isProcessing || !props.onInstructionalRoleChange} onChange={event => changeReadingRole(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-2"><option value="primary">{roleMainLabel}</option><option value="supplemental">{roleSupportingLabel}</option><option value="unspecified">{roleNoneLabel}</option></select></label>{mainNeedsReview && <button type="button" onClick={() => changeReadingRole('primary')} className="min-h-11 rounded-lg border border-amber-400 px-3">{analysisLabel('simplified.role_review_main_reading_choice', 'Review main-reading choice')}</button>}{props.onSelectReadingSource && <button type="button" disabled={isProcessing} onClick={() => props.onSelectReadingSource(generatedContent)} className="min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900">{analysisLabel('simplified.role_use_for_activities', 'Use for activities')}</button>}{readWithSupportsButton}</div>}
    </section>;
    const passageButton = pressed => 'min-h-9 rounded-lg border px-3 text-xs font-bold focus-visible:ring-2 focus-visible:ring-indigo-500 ' + (pressed ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400');
    const passageLanguageBar = (passageVersions.length > 0 || passageCandidates.length > 0 || refreshLanguages.length > 0) && <div data-passage-languages className="mb-4 space-y-2 font-sans">
      {refreshLanguages.length > 0 && <div data-passage-refresh role="status" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
        <p>{fillLabel(analysisLabel('analysis.passage_versions_removed', 'Your edit removed the passage in {languages}. Students see only the original until you update it.'), { languages: refreshLanguageList })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-refresh-passage-versions disabled={!!passageBusy || isProcessing} aria-busy={passageBusy === 'refresh'} onClick={refreshPassageVersions} className="min-h-9 rounded-lg bg-indigo-700 px-3 font-bold text-white focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50">{passageBusy === 'refresh' ? analysisLabel('status.translating', 'Translating…') : fillLabel(analysisLabel('analysis.update_passage_versions', 'Update the passage in {languages}'), { languages: refreshLanguageList })}</button>
          <button type="button" data-dismiss-passage-refresh disabled={!!passageBusy} onClick={dismissPassageRefresh} className="min-h-9 rounded-lg border border-amber-400 bg-white px-3 font-bold text-amber-950 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50">{analysisLabel('analysis.passage_versions_not_needed', 'Not needed')}</button>
        </div>
      </div>}
      {passageVersions.length > 0 && <div role="group" aria-label={analysisLabel('analysis.passage_language', 'Read the passage in')} className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-700">{analysisLabel('analysis.passage_language', 'Read the passage in')}</span>
        <button type="button" aria-pressed={!shownPassageLanguage} data-passage-original onClick={() => setPassageView({ id: generatedContent?.id, language: '' })} className={passageButton(!shownPassageLanguage)}>{analysisLabel('simplified.reader_original', 'Original')}{asText(analysisData.sourceLanguage).trim() ? <> · {languageLabel(asText(analysisData.sourceLanguage).trim())}</> : null}</button>
        {passageVersions.map(([language]) => <button type="button" key={language} aria-pressed={shownPassageLanguage === language} data-passage-language={language} onClick={() => setPassageView({ id: generatedContent?.id, language })} className={passageButton(shownPassageLanguage === language)}>{languageLabel(language)}</button>)}
      </div>}
      {passageCandidates.length > 0 && <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-700">{analysisLabel('analysis.add_passage_translation', 'Add the passage in another language:')}</span>
        {passageCandidates.map(language => <button type="button" key={language} data-add-passage-language={language} disabled={!!passageBusy || isProcessing} aria-busy={passageBusy === language} onClick={() => addPassageLanguage(language)} className="min-h-9 rounded-lg border border-dashed border-indigo-300 bg-white px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">{passageBusy === language ? analysisLabel('status_steps.translating', 'Translating…') : <>+ {languageLabel(language)}</>}</button>)}
      </div>}
      {shownPassage && isTeacherMode && <p className="text-xs text-slate-600">{analysisLabel('analysis.source_translation_note', 'This companion translation does not replace the original source used for activities or reading-level results.')}</p>}
    </div>;
    const reportLanguageControl = reportLanguages.length > 0 && <section data-analysis-report-language className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800"><label className="flex flex-wrap items-center gap-3 font-bold">{analysisLabel('analysis.report_language', 'Report language')}<select aria-label={analysisLabel('analysis.report_language', 'Report language')} value={selectedReportLanguage} onChange={event => changeReportLanguage(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"><option value={baseReportLanguage}>{baseReportLanguage ? uiName(baseReportLanguage) : analysisLabel('analysis.original_report', 'Original report')}</option>{reportLanguages.map(language => <option key={language} value={language}>{uiName(language)}</option>)}</select></label><p className="mt-2 text-xs text-slate-600">{analysisLabel('analysis.report_source_note', 'All report languages describe the original source. Reading-level results apply to that source.')}</p>{isTranslatedReport && <p role="status" className="mt-2 text-xs text-slate-700">{analysisLabel('analysis.report_correction_note', 'Select the original report language to correct or dismiss findings.')}</p>}</section>;
    const includeTitle = analysisLabel('analysis.include_in_correction', 'Include in correction');
    const ignoreTitle = analysisLabel('analysis.ignore_this_error', 'Ignore this error');
    return <div className="space-y-6">{isTeacherMode ? readingRoleControl : readWithSupportsButton}
      {isTeacherMode && needsRecheck && <section data-analysis-needs-recheck className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <h4 className="font-bold">{editedSource ? analysisLabel('analysis.needs_recheck', 'Needs recheck') : partial ? analysisLabel('analysis.partial', 'Partial analysis') : analysisLabel('analysis.incomplete', 'Analysis incomplete')}</h4>
        <p className="mt-1">{editedSource ? analysisLabel('analysis.recheck_reason', 'The source text changed. Run the analysis again to check its concepts, accuracy and reading demands.') : partial ? (coverage.legacy ? analysisLabel('analysis.legacy_excerpt', 'This earlier local check used an excerpt. Check all sections to verify the full passage.') : fillLabel(analysisLabel('analysis.coverage_progress', 'AI checked {through} of {total} characters. The readability estimate uses the full passage.'), coverage)) : analysisLabel('analysis.incomplete_reason', 'The check did not return a usable report. Your source is saved. You can retry the analysis.')}</p>
        {englishSource && Number.isFinite(measuredGrade) && <p className="mt-2" data-current-local-readability>{fillLabel(analysisLabel('analysis.edited_readability', 'Current Flesch–Kincaid estimate: {score}.'), { score: measuredGrade.toFixed(1) })}</p>}
        {typeof props.onRecheckAnalysis === 'function' && <button type="button" disabled={isProcessing || checkingEditedSource || !sourceText.trim()} aria-busy={checkingEditedSource} onClick={recheckEditedSource} className="mt-2 min-h-11 rounded-lg bg-indigo-700 px-3 font-bold text-white disabled:opacity-50">{checkingEditedSource ? analysisLabel('simplified.checking', 'Checking…') : editedSource ? analysisLabel('analysis.recheck_action', 'Recheck edited source') : partial ? (coverage.legacy ? analysisLabel('analysis.check_all_sections', 'Check all sections') : analysisLabel('analysis.check_remaining', 'Check remaining sections')) : analysisLabel('analysis.retry', 'Retry analysis')}</button>}
      </section>}
      {isTeacherMode && coverage?.sections.length > 0 && <section data-analysis-coverage className="rounded-xl border border-slate-300 bg-white p-4 text-sm">
        <h4 className="font-bold">{analysisLabel('analysis.section_findings', 'AI findings by section')}</h4>
        {coverage.complete && <p>{fillLabel(analysisLabel('analysis.coverage_progress', 'AI checked {through} of {total} characters. The readability estimate uses the full passage.'), coverage)}</p>}
        {coverage.sections.map(({ start, end, report }, index) => <details key={start} className="mt-2 rounded-lg border border-slate-200 p-2">
          <summary className="cursor-pointer font-semibold">{fillLabel(analysisLabel('analysis.section_range', 'Section {number} · characters {start}–{end}'), { number: index + 1, start: start + 1, end })}</summary>
          <blockquote className="my-2 border-l-2 pl-2">{sourceText.slice(start, Math.min(end, start + 150))}{end - start > 150 ? '…' : ''}</blockquote>
          <p>{[rangeText(report.readingLevel?.range), report.readingLevel?.explanation].map(asText).filter(Boolean).join(' · ')}</p>
          {Array.isArray(report.concepts) && <p>{report.concepts.map(asText).filter(Boolean).join(', ')}</p>}
          {report.depthOfKnowledge?.level && <p>DOK {asText(report.depthOfKnowledge.level)} · {asText(report.depthOfKnowledge.reason)}</p>}
          <p>{[ratingText(report.accuracy?.rating), report.accuracy?.reason].map(asText).filter(Boolean).join(' · ')}</p>
          {partial && factReader && factReader({ ...report.accuracy, verification: 'ai-estimate' }).map((row, i) =>
            <p key={i}><strong>{analysisLabel('analysis.needs_source', 'Needs a source')}</strong> · {row.text}</p>)}
          {Array.isArray(report.grammar) && report.grammar.map((note, i) => <p key={i}>{asText(note)}</p>)}
        </details>)}
      </section>}
      {isTeacherMode && !needsRecheck && reportLanguageControl}{isTeacherMode && !needsRecheck && <><div className="bg-slate-50 p-4 rounded-lg border border-slate-400 mb-6"><p className="text-sm text-slate-800" dangerouslySetInnerHTML={{
          __html: t('analysis.header_description')
        }} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"><div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm flex flex-col"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('output.analysis_complexity')}</h4>{readingLevel ? <><div className="text-2xl font-bold text-indigo-600 mb-2">{rangeText(readingLevel.range) || analysisLabel('analysis.rating_unknown', 'Not rated')}</div><div className="text-sm text-slate-600 leading-relaxed">{formatInlineText(asText(readingLevel.explanation), false)}</div></> : <div className="text-2xl font-bold text-indigo-600">{asText(analysisData.readingLevel)}</div>}{fitStats && <div className="mt-auto pt-4 border-t border-slate-100"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-600">{t('analysis.readability.fk_score')}</span><span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded cursor-help border border-indigo-100" title={`${t('analysis.readability.formula')}: (0.39 × ASL) + (11.8 × ASW) - 15.59\n\n${t('analysis.readability.words')}: ${fitStats.words}\n${t('analysis.readability.sentences')}: ${fitStats.sentences}\n${t('analysis.readability.syllables')}: ${fitStats.syllables}\n\nASL (${t('analysis.readability.asl')}): ${(fitStats.words / fitStats.sentences).toFixed(2)}\nASW (${t('analysis.readability.asw')}): ${(fitStats.syllables / fitStats.words).toFixed(2)}`}>{fitStats.score}</span></div><div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 text-center"><div className="bg-slate-50 rounded p-1 border border-slate-100"><span className="block font-bold text-slate-700 text-xs">{fitStats.words}</span> {t('analysis.readability.label_words')}</div><div className="bg-slate-50 rounded p-1 border border-slate-100"><span className="block font-bold text-slate-700 text-xs">{fitStats.sentences}</span> {t('analysis.readability.label_sent')}</div><div className="bg-slate-50 rounded p-1 border border-slate-100"><span className="block font-bold text-slate-700 text-xs">{fitStats.syllables}</span> {t('analysis.readability.label_syll')}</div></div></div>}</div><div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm flex flex-col"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('output.analysis_concepts')}</h4><div className="flex flex-wrap gap-2 content-start">{conceptList.map((concept, idx) => <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium border border-indigo-100">{formatInlineText(concept, false)}</span>)}</div></div></div>{targetFitCard}{learnerBarriersCard}<div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6"><div className="flex flex-wrap items-center gap-3 mb-3"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('output.analysis_verification')}</h4>{accuracyBadge}</div><p className="text-sm text-slate-600 leading-relaxed">{formatInlineText(asText(accuracy.reason), false)}</p>{asText(accuracy.verificationDetails) && <div className="mt-4 pt-4 border-t border-slate-100"><h5 className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Search size={10} /> {t('analysis.verification_details')}</h5><div className="text-xs text-slate-600 bg-blue-50 p-3 rounded border border-blue-100 leading-relaxed">{renderFormattedText(asText(accuracy.verificationDetails), false)}</div></div>}{(() => {
          const shownDiscrepancies = Array.isArray(accuracy.discrepancies) ? accuracy.discrepancies : [];
          const baseDiscrepancies = Array.isArray(baseAccuracy.discrepancies) ? baseAccuracy.discrepancies : [];
          // A translated report keeps the fixed status of the source-language note it explains.
          const rawDiscrepancies = isTranslatedReport && shownDiscrepancies.length === baseDiscrepancies.length
            ? shownDiscrepancies.map((note, i) => isFixedDiscrepancy(baseDiscrepancies[i]) && typeof note === 'string' && !isFixedDiscrepancy(note) ? DISCREPANCY_FIXED_PREFIX + note : note)
            : shownDiscrepancies;
          const fixedCount = rawDiscrepancies.filter(isFixedDiscrepancy).length;
          const unreadableDiscrepancies = rawDiscrepancies.filter(isUnreadableNote).length + (Number(accuracy.discrepanciesUnreadable) > 0 ? Number(accuracy.discrepanciesUnreadable) : 0);
          const isInvalidDiscrepancy = d => {
            if (!d || typeof d !== 'string') return true;
            const clean = d.trim().toLowerCase().replace(/[.,;!]+$/, '');
            if (['none', 'n/a', 'no errors', 'no issues', 'no discrepancies'].includes(clean)) return true;
            if (/^(none|no errors|no discrepancies|no factual errors|none detected|no inaccuracies)/i.test(clean)) return true;
            if (clean.includes('no discrepancies found') || clean.includes('no factual errors found') || clean.includes('no significant errors')) return true;
            return false;
          };
          const realDiscrepancies = rawDiscrepancies.filter(d => !isInvalidDiscrepancy(d));
          const hasOpenDiscrepancies = realDiscrepancies.some(note => !isFixedDiscrepancy(note));
          const openSelectedCount = rawDiscrepancies.filter((note, i) => selectedDiscrepancies.has(i) && !isInvalidDiscrepancy(note) && !isFixedDiscrepancy(note)).length;
          const hasDiscrepancies = realDiscrepancies.length > 0;
          const hasVerifiedFacts = verifiedFactList.length > 0;
          const unreadableNotice = unreadableDiscrepancies > 0 && <p role="status" className="mt-4 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{analysisLabel('analysis.accuracy_unreadable', 'Some accuracy notes could not be read. Run the analysis again to review them.')}</p>;
          if (!hasDiscrepancies && !hasVerifiedFacts && !unsourcedFactList.length) return unreadableNotice || null;
          return <>{unreadableNotice}<div className={`mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 ${hasDiscrepancies ? 'md:grid-cols-2' : ''} gap-4`}>{hasVerifiedFacts && <section data-analysis-facts="verified" className="rounded border border-green-100 bg-green-50 p-3">
              <h5 className="mb-2 text-xs font-bold text-green-800">{t('analysis.verified_facts')}</h5>
              <ol className="list-decimal space-y-3 pl-5 text-sm">{verifiedFactList.map((row, i) => <li key={i}>
                <p>{row.text}</p><ul className="mt-1 flex flex-wrap gap-x-3">{row.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-800 underline">{source.title}</a></li>)}</ul>
              </li>)}</ol></section>}
              {unsourcedFactList.length > 0 && <section data-analysis-facts="unsourced" className="rounded border border-amber-200 bg-amber-50 p-3"><h5 className="mb-2 text-xs font-bold text-amber-900">{analysisLabel('analysis.needs_source', 'Needs a source')}</h5>
                <ul className="list-disc space-y-2 pl-5 text-sm">{unsourcedFactList.map((row, i) => <li key={i}>{row.text}</li>)}</ul></section>}{hasDiscrepancies && <div className="bg-red-50 p-3 rounded border border-red-100 relative"><h5 className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle size={10} /> {t('analysis.discrepancies')}</h5><div className="space-y-2 mb-3">{rawDiscrepancies.map((d, i) => {
                  if (isInvalidDiscrepancy(d)) return null;
                  if (isFixedDiscrepancy(d)) return <div key={i} data-discrepancy-fixed className="flex items-start gap-2 p-1.5 rounded bg-green-50 border border-green-100"><CheckCircle2 size={14} className="text-green-700 mt-0.5 shrink-0" aria-hidden="true" /><div className="text-xs text-slate-700 leading-relaxed w-full"><BilingualFieldRenderer text={d.slice(DISCREPANCY_FIXED_PREFIX.length)} /> <span className="inline-block align-middle px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-green-200 text-green-900">{analysisLabel('analysis.factual_fixed_tag', 'Fixed in source')}</span></div></div>;
                  const isSelected = isTranslatedReport || selectedDiscrepancies.has(i);
                  return <div key={i} className={`flex items-start gap-2 p-1.5 rounded transition-colors ${isSelected ? 'bg-white/50' : 'opacity-60'}`}>{canFixFacts && <input aria-label={analysisLabel('analysis.select_factual_note', 'Include factual note in correction') + ' ' + (i + 1) + ': ' + d} type="checkbox" checked={isSelected} onChange={() => toggleDiscrepancySelection(i)} className="mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer shrink-0" title={isSelected ? includeTitle : ignoreTitle} />}<div className={`text-xs text-slate-700 leading-relaxed ${!isSelected ? 'line-through text-slate-600' : ''} w-full`}><BilingualFieldRenderer text={d} /></div></div>;
                })}</div>{fixedCount > 0 && <p role="note" data-factual-fix-stale className="mb-3 text-xs text-slate-700">{analysisLabel('analysis.factual_fix_rerun_note', 'Fixed notes are marked. The rating and the other findings still describe the text before the fix; run the analysis again for a fresh check.')}</p>}{canFixFacts && hasOpenDiscrepancies && <button type="button" data-factual-fix onClick={handleProposeFactualFix} disabled={isProcessing || openSelectedCount === 0 || analysisAiOff} title={analysisAiDoor?.title || undefined} aria-busy={isProcessing} className="w-full flex items-center justify-center gap-2 bg-white border border-red-600 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" /> : <Wrench size={12} />}{t('analysis.fix_button')} ({openSelectedCount})</button>}{isTeacherMode && isTranslatedDisplay && !isTranslatedReport && <p className="mt-2 text-xs text-slate-700">{analysisLabel('analysis.factual_translated_note', 'These notes describe the source text, not the translation shown here, so Fix is off.')}</p>}{factualPreview}</div>}</div></>;
        })()}{asText(accuracy.citations) && <div className="mt-4 pt-4 border-t border-slate-100"><div className="text-xs text-slate-600 leading-relaxed">{renderFormattedText(asText(accuracy.citations), false)}</div></div>}</div>{(() => {
        const baseGrammarNotes = Array.isArray(analysisData.grammar) ? analysisData.grammar : [];
        const translatedGrammarNotes = Array.isArray(reportData.grammar) && reportData.grammar.length === baseGrammarNotes.length ? reportData.grammar : baseGrammarNotes;
        const rawGrammarNotes = isTranslatedReport ? baseGrammarNotes.map((note, index) => {
          const status = typeof note === 'string' && note.match(/^(✓ (?:FIXED|DISMISSED): )/);
          const translated = asText(translatedGrammarNotes[index]).replace(/^✓ (?:FIXED|DISMISSED): /, '');
          return (status ? status[1] : '') + (translated || asText(note));
        }) : baseGrammarNotes;
        const unreadableGrammarNotes = rawGrammarNotes.filter(isUnreadableNote).length + (Number(analysisData.grammarUnreadable) > 0 ? Number(analysisData.grammarUnreadable) : 0);
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
        // ── Resolved states are deliberately DISTINCT ─────────────────────
        // '✓ FIXED:'     the AI rewrote the source text for this note.
        // '✓ DISMISSED:' the teacher judged it a false positive, or corrected
        //                it by hand. The source text was NOT touched.
        // Collapsing these into one marker would claim the document changed
        // when it did not, so they stay separate everywhere — including the
        // "Issues" badge and anything that later reads data.grammar.
        const GRAMMAR_FIXED_PREFIX = '✓ FIXED: ';
        const GRAMMAR_DISMISSED_PREFIX = '✓ DISMISSED: ';
        const isFixedNote = g => typeof g === 'string' && g.startsWith('✓ FIXED:');
        const isDismissedNote = g => typeof g === 'string' && g.startsWith('✓ DISMISSED:');
        const isResolvedNote = g => isFixedNote(g) || isDismissedNote(g);
        // Only UNRESOLVED notes are outstanding work — the badge counted every
        // note forever, so a teacher who had dealt with all of them still saw
        // "3 Issues".
        const openGrammarErrors = realGrammarErrors.filter(g => !isResolvedNote(g));
        // Dismiss / restore are pure list edits: no AI call, no text rewrite.
        // Restore exists because a mis-click would otherwise silently discard a
        // real issue with no way back.
        const setGrammarNoteAt = (idx, next) => {
          updateAnalysisResource(prev => ({
            ...prev,
            data: { ...prev.data, grammar: (prev.data.grammar || []).map((g, i) => (i === idx ? next : g)) }
          }));
        };
        const dismissGrammarNote = (idx) => {
          const note = rawGrammarNotes[idx];
          if (typeof note !== 'string' || isResolvedNote(note)) return;
          setGrammarNoteAt(idx, GRAMMAR_DISMISSED_PREFIX + note);
          // Drop it from the AI selection so the "Fix (N)" count stays truthful.
          if (selectedGrammarErrors.has(idx)) toggleGrammarErrorSelection(idx);
        };
        const restoreGrammarNote = (idx) => {
          const note = rawGrammarNotes[idx];
          if (!isDismissedNote(note)) return;
          setGrammarNoteAt(idx, note.slice(GRAMMAR_DISMISSED_PREFIX.length));
        };
        // Notes describe the source; the displayed text is a translation, so an AI fix would edit the wrong text.
        const canFixGrammar = canChangeReportNotes && !isTranslatedDisplay;
        const handleFixGrammarErrors = async () => {
          if (!canFixGrammar || !generatedContent?.data?.originalText || selectedGrammarErrors.size === 0) return;
          setIsProcessing(true);
          setGenerationStep(t('process.fixing_grammar') || 'Fixing grammar errors...');
          try {
            // A dismissed note must never be sent to the AI — the teacher has
            // already ruled on it, and "fixing" a false positive would edit
            // text that is correct.
            const isFixable = g => typeof g === 'string' && !isInvalidGrammarNote(g) && !isResolvedNote(g);
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
                try {
                  raw = await session.prompt(fixPrompt);
                } finally {
                  try { session.destroy(); } catch (_) {}
                }
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
            if (typeof props.onCorrectAnalysisText !== 'function') {
              addToast(t('process.grammar_fix_failed') || 'The source editor is unavailable. Please reload and try again.', 'error');
              return;
            }
            const applied = await props.onCorrectAnalysisText(generatedContent.id, originalText, cleaned, errorsToFix);
            if (applied === false) {
              addToast(t('analysis.grammar_source_changed') || 'The source changed while the correction was being prepared. Review it and try again.', 'warning');
              return;
            }
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
        return <div className="bg-white p-5 rounded-xl border border-slate-400 shadow-sm mb-6"><div className="flex items-center gap-3 mb-3"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('output.analysis_grammar')}</h4>{hasGrammarErrors && openGrammarErrors.length > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-amber-100 text-amber-700 border-amber-200">{openGrammarErrors.length} {openGrammarErrors.length === 1 ? analysisLabel('analysis.issue_singular', 'Issue') : analysisLabel('analysis.issue_plural', 'Issues')}</span>}{hasGrammarErrors && openGrammarErrors.length === 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-green-100 text-green-700 border-green-200">{t('analysis.grammar_all_resolved') || 'All resolved'}</span>}</div>{hasGrammarErrors ? <><div className="space-y-2 mb-3">{rawGrammarNotes.map((note, idx) => {
                if (isInvalidGrammarNote(note)) return null;
                const isSelected = isTranslatedReport || selectedGrammarErrors.has(idx);
                const isFixed = isFixedNote(note);
                const isDismissed = isDismissedNote(note);
                const bareNote = isFixed ? note.replace(GRAMMAR_FIXED_PREFIX, '')
                  : isDismissed ? note.slice(GRAMMAR_DISMISSED_PREFIX.length)
                  : note;
                return <div key={idx} className={`flex items-start gap-2 p-2 rounded transition-colors ${isFixed ? 'bg-green-50 border border-green-100' : isDismissed ? 'bg-slate-50 border border-slate-200' : isSelected ? 'bg-amber-50' : 'opacity-60'}`}>{canFixGrammar && !isFixed && !isDismissed && <input aria-label={analysisLabel('analysis.select_grammar_note', 'Include grammar note in correction') + ' ' + (idx + 1) + ': ' + bareNote} type="checkbox" checked={isSelected} onChange={() => toggleGrammarErrorSelection(idx)} className="mt-1 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer shrink-0" title={isSelected ? includeTitle : ignoreTitle} />}{isFixed && <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" aria-hidden="true" />}{isDismissed && <CheckCircle2 size={16} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />}<div className={`flex-1 text-sm text-slate-700 leading-relaxed ${(!isSelected && !isFixed && !isDismissed) || isDismissed ? 'line-through text-slate-600' : ''}`}>{formatInlineText(bareNote, false)}{isDismissed && <span className="ml-2 not-italic no-underline inline-block align-middle px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-600">{t('analysis.grammar_dismissed_tag') || 'Dismissed'}</span>}</div>{/* Dismiss = "this one is handled" WITHOUT calling the AI: the teacher
                     fixed it by hand, or the flag was simply wrong. Restore is the
                     undo, so a mis-click never silently buries a real issue. */}
                {canChangeReportNotes && !isFixed && !isDismissed && <button type="button" onClick={() => dismissGrammarNote(idx)} title={t('analysis.grammar_dismiss_hint') || 'Dismiss this notice without using AI (already fixed by hand, or not a real error)'} aria-label={`${t('analysis.grammar_dismiss_one') || 'Dismiss notice'}: ${bareNote.slice(0, 80)}`} className="shrink-0 ml-1 px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"><X size={14} aria-hidden="true" /></button>}
                {canChangeReportNotes && isDismissed && <button type="button" onClick={() => restoreGrammarNote(idx)} aria-label={`${t('analysis.grammar_restore_one') || 'Restore notice'}: ${bareNote.slice(0, 80)}`} className="shrink-0 ml-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors">{t('analysis.grammar_restore_one') || 'Restore'}</button>}</div>;
              })}</div>{isTeacherMode && isTranslatedDisplay && openGrammarErrors.length > 0 && <p className="mb-3 text-xs text-slate-700">{analysisLabel('analysis.grammar_translated_note', 'These notes describe the source text, not the translation shown here, so Fix Grammar is off. Dismiss each note once you have handled it.')}</p>}{canFixGrammar && openGrammarErrors.length > 0 && <button onClick={handleFixGrammarErrors} disabled={isProcessing || selectedGrammarErrors.size === 0 || (analysisAiOff && !window.ai?.languageModel)} title={analysisAiOff && !window.ai?.languageModel ? analysisAiDoor.title : undefined} aria-busy={isProcessing} className="w-full flex items-center justify-center gap-2 bg-white border border-amber-700 text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" /> : <Wand2 size={12} />}{t('analysis.fix_grammar_button') || 'Fix Grammar Errors'} ({selectedGrammarErrors.size})</button>}{/* Clearing the whole panel now unlocks once every note is RESOLVED —
                  fixed by AI or dismissed by hand. It previously required all of
                  them to be AI-fixed, so a teacher who corrected anything manually
                  could never clear the list. */}
              {canChangeReportNotes && realGrammarErrors.length > 0 && openGrammarErrors.length === 0 && <button onClick={() => {
              updateAnalysisResource(prev => ({
                ...prev,
                data: {
                  ...prev.data,
                  grammar: []
                }
              }));
              addToast(t('analysis.grammar_dismissed') || 'Grammar notices cleared.', 'success');
            }} className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-800 hover:bg-green-100 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm"><CheckCircle2 size={12} />{t('analysis.dismiss_fixed') || 'Dismiss Fixed Notices'}</button>}</> : unreadableGrammarNotes > 0 ? null : <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 size={16} /><span>{t('analysis.no_grammar_errors') || 'No grammar or spelling issues detected.'}</span></div>}{unreadableGrammarNotes > 0 && <p role="status" className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{analysisLabel('analysis.grammar_unreadable', 'Some grammar notes could not be read. Run the analysis again to review them.')}</p>}</div>;
      })()}</>}<div className="bg-slate-50 p-6 rounded-xl border border-slate-400 relative group"><div className="flex justify-between items-center mb-3 flex-wrap gap-2"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{shownPassage && !isEditingAnalysis ? <>{analysisLabel('analysis.translated_passage', 'Translated passage')} · {languageLabel(shownPassageLanguage)}</> : t('output.common_original')}</h4>{isTeacherMode && <div className="flex items-center gap-2"><button title={t('common.download_audio')} data-help-key="analysis_download_audio" onClick={() => handleDownloadAudio && (shownPassage && !isEditingAnalysis
                ? handleDownloadAudio(shownPassage, 'passage-' + (shownPassageLanguage.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'translated'), 'dl-analysis-source', shownPassageLanguage)
                : handleDownloadAudio(generatedContent?.data?.originalText, 'original-source-text', 'dl-analysis-source'))} disabled={downloadingContentId === 'dl-analysis-source' || !generatedContent?.data?.originalText} className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed">{downloadingContentId === 'dl-analysis-source' ? <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> : <Download size={14} />}{downloadingContentId === 'dl-analysis-source' ? t('common.downloading') : t('common.download_audio')}</button><button onClick={handleToggleIsEditingAnalysis} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${isEditingAnalysis ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'}`}>{isEditingAnalysis ? <CheckCircle2 size={14} /> : <Pencil size={14} />}{isEditingAnalysis ? t('common.done') : t('common.edit')}</button></div>}</div>{isTeacherMode && analysisAiOff && typeof window.AlloAiSetupNotice === 'function' && <div data-analysis-ai-setup className="mb-2"><window.AlloAiSetupNotice t={t} /></div>}{isTeacherMode && <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-1"><div className="relative flex-grow"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-600"><Sparkles size={14} /></div><input aria-label={t('common.enter_source_refine_instruction')} type="text" value={sourceRefineInstruction} onChange={e => setSourceRefineInstruction(e.target.value)} onKeyDown={e => e.key === 'Enter' && !analysisAiOff && handleAiRefineSource()} placeholder={t('analysis.refine_placeholder')} className="w-full pl-9 pr-3 py-2 text-xs border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all shadow-sm bg-white" disabled={isProcessing} aria-busy={isProcessing} /></div><button aria-label={t('common.ai_refine_source')} onClick={handleAiRefineSource} disabled={!sourceRefineInstruction.trim() || isProcessing || analysisAiOff} title={analysisAiDoor?.title || undefined} aria-busy={isProcessing} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> : <Send size={14} />}</button></div>}{isTeacherMode && isEditingAnalysis ? <div className="w-full bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm"><div className="flex flex-wrap items-center gap-1 p-2 bg-indigo-50 border-b border-indigo-100"><button type="button" aria-label={t('formatting.bold') || 'Bold'} onClick={() => handleFormatText('bold', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.bold')}><Bold size={16} strokeWidth={3} /></button><button type="button" aria-label={t('formatting.italic') || 'Italic'} onClick={() => handleFormatText('italic', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.italic')}><Italic size={16} /></button><button type="button" aria-label={t('formatting.highlight') || 'Highlight'} onClick={() => handleFormatText('highlight', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.highlight')}><Highlighter size={16} /></button><div className="w-px h-4 bg-indigo-200 mx-1" /><button type="button" aria-label={t('formatting.h1') || 'Heading 1'} onClick={() => handleFormatText('h1', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs" title={t('formatting.h1')}>H1</button><button type="button" aria-label={t('formatting.h2') || 'Heading 2'} onClick={() => handleFormatText('h2', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs" title={t('formatting.h2')}>H2</button><button type="button" aria-label={t('formatting.h3') || 'Heading 3'} onClick={() => handleFormatText('h3', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs" title={t('formatting.h3') || 'Heading 3'}>H3</button><div className="w-px h-4 bg-indigo-200 mx-1" /><button type="button" aria-label={t('formatting.list') || 'Bulleted list'} onClick={() => handleFormatText('list', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.list')}><List size={16} /></button><button type="button" aria-label={t('formatting.numlist') || 'Numbered list'} onClick={() => handleFormatText('numlist', analysisEditorRef, generatedContent?.data.originalText, handleAnalysisTextChange)} className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors" title={t('formatting.numlist') || 'Numbered List'}><ListOrdered size={16} /></button>{(() => { const TableChartTools = window.AlloModules && window.AlloModules.ViewRenderers && window.AlloModules.ViewRenderers.TableChartTools; return TableChartTools ? <TableChartTools t={t} textareaRef={analysisEditorRef} getText={() => generatedContent?.data.originalText} onChange={handleAnalysisTextChange} tone="indigo" /> : null; })()}</div><textarea aria-label={t('common.edit_source_text') || 'Edit source text'} data-allo-textundo="analysis" ref={analysisEditorRef} value={generatedContent?.data.originalText} onChange={e => handleAnalysisTextChange(e.target.value)} className="w-full min-h-[300px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-sm text-slate-700 font-serif leading-relaxed resize-y" style={passageFontStyle} placeholder={t('common.edit_source_text')} spellCheck="false" /></div> : <div className="text-sm text-slate-700 font-serif leading-relaxed max-w-none" style={passageFontStyle}>{passageLanguageBar}{shownPassage ? <div data-passage-shown={shownPassageLanguage}>{renderFormattedText(shownPassage, false)}</div> : (() => {
            const _fullOrig = generatedContent?.data?.originalText || '';
            const {
              body: _bodyNoRefs,
              references: _refs
            } = splitReferencesFromBody(_fullOrig);
            return <>{renderFormattedText(_bodyNoRefs, false)}{generatedContent?.data.rawEnglishText && generatedContent?.data.translatedText && normalizedText(generatedContent.data.rawEnglishText) !== normalizedText(_fullOrig) && <div className="mt-8 pt-8 border-t border-slate-200 opacity-80"><h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2"><FileText size={14} /> {t('output.original_source_label')}</h4>{renderFormattedText(generatedContent?.data.rawEnglishText, false)}</div>}{_refs && <SourceReferencesPanel referencesText={_refs} />}</>;
          })()}</div>}</div></div>;
  }
