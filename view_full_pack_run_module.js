/** Auto-generated first-wave cold-path CDN module. */
(function() {
'use strict';
var React = window.React;
if (!React) { console.error('[FullPackRunView] React not found on window'); return; }
window.AlloModules = window.AlloModules || {};
if (window.AlloModules.FullPackRunView) return;
// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (full-pack-run).
function FullPackRunView(props) {
  const {
    AlertTriangle,
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ChevronDown,
    Clock,
    Copy,
    Cpu,
    Download,
    Eye,
    EyeOff,
    GUIDED_DELIVERY_GROUPS,
    ImageIcon,
    Plus,
    RefreshCw,
    Sparkles,
    StopCircle,
    Trash2,
    _alloDiagnosticReason,
    _alloGenerationHelpersDeps,
    aiCapability,
    createGuidedHomeworkShare,
    currentUiLanguage,
    differentiationCustomGrades,
    differentiationRange,
    differentiationTypes,
    dokLevel,
    fullPackAddType,
    fullPackRun,
    fullPackTargetGroup,
    getDefaultTitle,
    gradeLevel,
    guidedActiveSteps,
    guidedMode,
    guidedStep,
    handleAddFullPackPlanResource,
    handleApproveFullPack,
    handleChangeFullPackPlanResourceType,
    handleCopyFullPackDiagnostics,
    handleDismissFullPackRun,
    handleDownloadFullPackDiagnostics,
    handleEditFullPackPlanResourceDirective,
    handleMoveFullPackPlanResource,
    handleOpenGenerationErrorLog,
    handlePlanFullPack,
    handleRemoveFullPackPlanResource,
    handleRetryFailedFullPack,
    handleSetFullPackPlanAdaptedTextPolicy,
    handleStopFullPack,
    hasSourceOrAnalysis,
    history,
    imageAspectRatio,
    imageGenerationStyle,
    inputText,
    isAutoConfigEnabled,
    isIndependentMode,
    isParentMode,
    isProcessing,
    isTeacherMode,
    leveledTextLanguage,
    openExportPreview,
    openStudentQrPreview,
    qrShareModal,
    recentQrShares,
    resourceCount,
    rosterKey,
    selectToolFromCatalog,
    selectedLanguages,
    setFullPackAddType,
    setFullPackTargetGroup,
    setIsAutoConfigEnabled,
    setResourceCount,
    setShowAIBackendModal,
    setShowCompletedFullPackRows,
    setShowSessionStartOptions,
    showCompletedFullPackRows,
    studentInterests,
    t,
    targetStandards,
    textFormat,
    translationMode,
    universalImageStyle,
    useEmojis
  } = props;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: !guidedMode || guidedActiveSteps[guidedStep]?.id === 'package-deliver' || guidedActiveSteps[guidedStep]?.id === '_final' ? undefined : 'none'
    },
    id: "tour-tool-fullpack",
    "data-help-key": "tool_fullpack",
    className: "relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 p-1 rounded-3xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all group"
  }, guidedMode && guidedActiveSteps[guidedStep]?.id === 'package-deliver' && /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-labelledby": "guided-delivery-panel-title",
    className: "m-1 mb-2 rounded-2xl bg-white p-3 text-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    id: "guided-delivery-panel-title",
    className: "text-sm font-black text-indigo-900"
  }, "Preview, Package & Deliver"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] leading-relaxed text-slate-600"
  }, "Choose formats by purpose. You can use more than one route, for example an accessible Word handout plus a Homework QR."), /*#__PURE__*/React.createElement("div", {
    role: "list",
    "aria-label": t('a11y.export_families') || 'Available export and delivery families',
    className: "mt-2 grid gap-2"
  }, GUIDED_DELIVERY_GROUPS.map(group => /*#__PURE__*/React.createElement("div", {
    role: "listitem",
    key: group.id,
    className: "rounded-xl border border-indigo-100 bg-indigo-50/60 p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-black text-indigo-900"
  }, group.label), /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5 text-[10px] leading-relaxed text-slate-600"
  }, group.options.join(' · '))))), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[10px] leading-relaxed text-slate-500"
  }, "QTI requires a quiz. H5P appears for compatible quiz or study-card content and needs matching H5P libraries at the destination. Storybook and Persona exports live inside those resource views. Homework sharing method and expiry depend on deployment."), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => openExportPreview('print'),
    className: "min-h-10 rounded-lg bg-indigo-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-indigo-600"
  }, "Open Document Builder"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: createGuidedHomeworkShare,
    className: "min-h-10 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-[11px] font-bold text-indigo-800 hover:bg-indigo-50"
  }, "Create Homework QR"), !isIndependentMode && !isParentMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowSessionStartOptions(true),
    className: "min-h-10 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
  }, "Teach live"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: !(qrShareModal && qrShareModal.url || Array.isArray(recentQrShares) && recentQrShares.some(share => share && share.url)),
    onClick: () => {
      const share = qrShareModal && qrShareModal.url ? qrShareModal : Array.isArray(recentQrShares) && recentQrShares.find(item => item && item.url) || null;
      if (share?.url) openStudentQrPreview(share.url, 'homework link as a student');
    },
    className: "min-h-10 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
  }, "Test latest student link"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1 px-3 pt-2 text-white/90"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_is_auto_config_enabled'),
    "data-help-key": "fullpack_auto_config",
    type: "checkbox",
    id: "autoConfigToggle",
    checked: isAutoConfigEnabled,
    onChange: e => setIsAutoConfigEnabled(e.target.checked),
    className: "w-3.5 h-3.5 text-purple-600 rounded cursor-pointer border-transparent focus:ring-offset-transparent focus:ring-white/50"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "autoConfigToggle",
    className: "text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 10,
    className: "text-yellow-700 fill-current"
  }), " ", t('fullpack.auto_configure'))), isAutoConfigEnabled && /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    "data-help-key": "fullpack_resource_count",
    value: resourceCount,
    onChange: e => setResourceCount(e.target.value),
    className: "text-[11px] font-bold text-indigo-800 bg-white/90 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-white border-transparent cursor-pointer shadow-sm",
    title: t('fullpack.limit_tooltip')
  }, /*#__PURE__*/React.createElement("option", {
    value: "Auto"
  }, t('fullpack.option_auto')), /*#__PURE__*/React.createElement("option", {
    value: "5"
  }, t('fullpack.option_short')), /*#__PURE__*/React.createElement("option", {
    value: "8"
  }, t('fullpack.option_standard')), /*#__PURE__*/React.createElement("option", {
    value: "12"
  }, t('fullpack.option_deep')), /*#__PURE__*/React.createElement("option", {
    value: "All"
  }, t('fullpack.option_all'))), isTeacherMode && !isParentMode && rosterKey?.groups && Object.keys(rosterKey.groups).length > 0 && /*#__PURE__*/React.createElement("select", {
    value: fullPackTargetGroup,
    onChange: e => setFullPackTargetGroup(e.target.value),
    "aria-label": t('fullpack.group_tooltip') || 'Target group for generation',
    className: "text-[11px] font-bold text-purple-800 bg-white/90 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-purple-300 border-transparent cursor-pointer shadow-sm ms-1",
    title: t('fullpack.group_tooltip') || 'Generate for a specific group or all groups'
  }, /*#__PURE__*/React.createElement("option", {
    value: "none"
  }, t('fullpack.group_current') || 'Current Settings'), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, t('fullpack.group_all') || '\u{1F3AF} All Groups'), Object.entries(rosterKey.groups).map(([gid, g]) => /*#__PURE__*/React.createElement("option", {
    key: gid,
    value: gid
  }, g.name)))), !aiCapability.text && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "sidebar_ai_setup_notice",
    onClick: () => {
      try {
        setShowAIBackendModal(true);
      } catch (_) {}
    },
    className: "w-full flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-left text-xs font-semibold text-amber-900 hover:bg-amber-100"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, '✨'), /*#__PURE__*/React.createElement("span", null, t('sidebar.needs_ai_setup') || 'Needs AI setup', ' · ', t('sidebar.needs_ai_setup_cta') || 'Tap to connect an AI, or use AlloFlow inside Gemini Canvas')), /*#__PURE__*/React.createElement("button", {
    "aria-label": fullPackRun?.status === 'ready' ? t('fullpack.action_generate_pack_aria') || 'Generate full pack from the reviewed plan' : t('fullpack.action_plan_aria') || 'Plan Full Pack',
    "data-help-key": "fullpack_generate",
    "data-testid": "full-pack-primary-action",
    onClick: () => {
      selectToolFromCatalog('package-deliver');
      return fullPackRun?.status === 'ready' ? handleApproveFullPack() : handlePlanFullPack();
    },
    disabled: !hasSourceOrAnalysis || isProcessing || !aiCapability.text,
    "aria-busy": isProcessing,
    className: `group w-full p-3 bg-white rounded-2xl text-start flex justify-between items-center disabled:opacity-80 disabled:cursor-not-allowed transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${fullPackRun?.status === 'ready' ? 'ring-2 ring-indigo-300/80 shadow-md shadow-indigo-200/70' : ''}`
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 group-hover:from-indigo-600 group-hover:to-purple-600 flex items-center gap-2"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    className: "animate-spin text-indigo-600",
    size: 18
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 18,
    className: "text-yellow-600 fill-yellow-600"
  }), fullPackRun?.status === 'ready' ? t('fullpack.action_generate_pack') || 'Generate full pack' : t('fullpack.action_plan') || 'Plan full pack'), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600 block mt-0.5"
  }, fullPackRun?.status === 'ready' ? t('fullpack.action_generate_pack_help') || 'Plan reviewed? Generate the full pack with these exact resources.' : t('fullpack.action_plan_help') || 'Review resources, settings, and estimated generations before creating them.')), /*#__PURE__*/React.createElement("span", {
    "data-testid": "full-pack-next-step-arrow",
    "aria-hidden": "true",
    className: `shrink-0 rounded-full transition-all duration-200 motion-reduce:transition-none group-hover:translate-x-1 ${fullPackRun?.status === 'ready' ? 'bg-indigo-100 p-1 ring-4 ring-indigo-300/60 shadow-[0_0_18px_rgba(79,70,229,0.8)] motion-safe:animate-pulse' : ''}`
  }, /*#__PURE__*/React.createElement(ArrowRight, {
    size: 18,
    className: fullPackRun?.status === 'ready' ? 'text-indigo-800 drop-shadow-sm' : 'text-indigo-300 group-hover:text-indigo-600'
  }))), ['running', 'retrying', 'planning'].includes(fullPackRun?.status) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "full-pack-stop",
    onClick: handleStopFullPack,
    className: "mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-2",
    title: t('fullpack.stop_generation') || 'Stop generation'
  }, /*#__PURE__*/React.createElement(StopCircle, {
    size: 15
  }), t('fullpack.stop_generation') || 'Stop generation'), fullPackRun && (() => {
    const statusLabels = {
      planning: t('fullpack.status_planning') || 'Planning',
      ready: t('fullpack.status_ready') || 'Ready for review',
      queued: t('fullpack.status_queued') || 'Queued',
      reuse: t('fullpack.status_reuse') || 'Reuse · no AI call',
      running: t('fullpack.status_running') || 'Generating',
      retrying: t('fullpack.status_retrying') || 'Retrying',
      landed: t('fullpack.status_complete') || 'Complete',
      completed: t('fullpack.status_complete') || 'Complete',
      partial: t('fullpack.status_partial') || 'Partially complete',
      failed: t('fullpack.status_failed') || 'Needs attention',
      interrupted: t('fullpack.status_interrupted') || 'Interrupted',
      stopped: t('fullpack.status_stopped') || 'Stopped'
    };
    const statusStyles = {
      planning: 'border-blue-200 bg-blue-50 text-blue-800',
      ready: 'border-indigo-200 bg-indigo-50 text-indigo-800',
      queued: 'border-slate-200 bg-slate-50 text-slate-600',
      reuse: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      running: 'border-blue-200 bg-blue-50 text-blue-800',
      retrying: 'border-violet-200 bg-violet-50 text-violet-800',
      landed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      partial: 'border-amber-200 bg-amber-50 text-amber-900',
      failed: 'border-rose-200 bg-rose-50 text-rose-800',
      interrupted: 'border-amber-200 bg-amber-50 text-amber-900',
      stopped: 'border-slate-300 bg-slate-100 text-slate-700'
    };
    const _generationHelpersModule = window.AlloModules && window.AlloModules.GenerationHelpers;
    const fullPackEditableTypes = (() => {
      const fallback = ['analysis', 'simplified', 'glossary', 'image', 'outline', 'sentence-frames', 'faq', 'timeline', 'persona', 'concept-sort', 'brainstorm', 'quiz', 'lesson-plan', 'adventure', 'dbq', 'note-taking', 'anchor-chart', 'alignment-report', 'math', 'gemini-bridge'];
      const supplied = _generationHelpersModule && typeof _generationHelpersModule.getFullPackEditableResourceTypes === 'function' ? _generationHelpersModule.getFullPackEditableResourceTypes() : fallback;
      const cleaned = Array.isArray(supplied) ? supplied.map(type => String(type || '').trim()).filter(Boolean) : fallback;
      return Array.from(new Set(cleaned.length ? cleaned : fallback));
    })();
    const buildRows = run => {
      const resources = run && run.resources || {};
      const actual = Object.values(resources);
      const selected = run && run.preflight && Array.isArray(run.preflight.selected) ? run.preflight.selected : [];
      const used = new Set();
      const planned = selected.map((item, index) => {
        const stableKey = item && item.uiId ? String(item.uiId) : '';
        const match = (stableKey ? actual.find(resource => resource && String(resource.key || '') === stableKey) : null) || actual.find(resource => resource && resource.type === item.type && Number(resource.index) === Number(item.index == null ? index : item.index));
        if (match && match.key) used.add(match.key);
        // Keep the reviewed matrix cells attached to the row. Runtime status may
        // override display fields, but it must not erase the approved plan.
        const reviewedVariants = Array.isArray(item && item.generationVariants) ? item.generationVariants.filter(Boolean) : [];
        const reviewedStatus = reviewedVariants.length && reviewedVariants.every(variant => variant.action === 'reuse') ? 'reuse' : 'queued';
        return Object.assign({}, item, {
          key: item.uiId || item.type + '-' + index,
          uiId: item.uiId || null,
          type: item.type,
          index,
          directive: item.directive || '',
          status: reviewedStatus
        }, match || {});
      });
      actual.forEach(resource => {
        if (resource && !used.has(resource.key)) planned.push(resource);
      });
      return planned;
    };
    const groupRuns = Object.values(fullPackRun.groups || {}).filter(Boolean);
    const sections = groupRuns.length ? groupRuns : [fullPackRun];
    const planSummaries = sections.map(section => section && section.preflight).filter(Boolean);
    const planSelected = planSummaries.reduce((sum, plan) => sum + (plan.selected?.length || 0), 0);
    const planSkipped = planSummaries.reduce((sum, plan) => sum + (plan.skipped?.length || 0), 0);
    const planGenerations = planSummaries.reduce((sum, plan) => sum + (plan.estimatedResourceGenerations || 0), 0);
    const planProviderCalls = planSummaries.reduce((sum, plan) => sum + (plan.capacity?.aiCalls || plan.estimatedProviderCalls || plan.estimatedResourceGenerations || 0), 0);
    const planReused = planSummaries.reduce((sum, plan) => sum + Math.max(0, Number(plan.generationMatrix?.summary?.actions?.reuse) || 0), 0);
    const planImageCalls = planSummaries.reduce((sum, plan) => sum + (plan.capacity?.imageCalls || 0), 0);
    const planMinutes = planSummaries.reduce((sum, plan) => sum + (plan.capacity?.estimatedMinutes || 0), 0);
    const capacityWarnings = Array.from(new Set(planSummaries.flatMap(plan => plan.capacity?.warnings || [])));
    const capacityWarningCodes = Array.from(new Set(planSummaries.flatMap(plan => plan.capacity?.warningCodes || [])));
    const capacityProfiles = planSummaries.map(plan => plan.capacity).filter(Boolean);
    const providerSummary = Array.from(new Set(capacityProfiles.map(capacity => [capacity.provider, capacity.model].filter(Boolean).join(' · ')).filter(Boolean))).join(', ');
    const usesObservedEstimate = capacityProfiles.some(capacity => capacity.estimateBasis === 'observed-device-history');
    const localizedCapacityWarnings = capacityWarningCodes.length ? capacityWarningCodes.map(code => ({
      'local-serial': t('fullpack.warning_local_serial') || 'Local models run this pack sequentially; keep the app open and consider a smaller pack for faster completion.',
      'large-pack': t('fullpack.warning_large_pack') || 'Large pack: provider rate limits are more likely. Consider fewer resources or groups.',
      'image-quota': t('fullpack.warning_image_quota') || 'Image generation may extend the run and consume additional provider quota.'
    })[code]).filter(Boolean) : capacityWarnings;
    const allRows = sections.flatMap(buildRows);
    const settled = allRows.filter(row => row && !['queued', 'running', 'retrying'].includes(row.status)).length;
    const total = allRows.length;
    const retryable = allRows.some(row => row && ['partial', 'failed', 'interrupted', 'stopped'].includes(row.status) && row.retryable !== false);
    const hasFailureDiagnostics = Boolean(fullPackRun.reason) || allRows.some(row => row && (row.reason || ['partial', 'failed', 'interrupted', 'stopped'].includes(row.status)));
    const completedRows = allRows.filter(row => row && ['landed', 'completed'].includes(row.status)).length;
    const progress = total ? Math.round(settled / total * 100) : 0;
    const elapsedSeconds = Math.max(0, Math.round(Number(fullPackRun.elapsedMs || 0) / 1000));
    const currentRosterSignature = JSON.stringify(Object.entries(rosterKey?.groups || {}).sort(([a], [b]) => String(a).localeCompare(String(b))).map(([id, group]) => {
      const profile = group?.profile || {};
      return {
        id,
        name: group?.name || id,
        gradeLevel: profile.gradeLevel || '',
        leveledTextLanguage: profile.leveledTextLanguage || '',
        translationMode: profile.translationMode || '',
        currentUiLanguage: profile.currentUiLanguage || '',
        studentInterests: Array.isArray(profile.studentInterests) ? profile.studentInterests : String(profile.studentInterests || ''),
        dokLevel: profile.dokLevel || '',
        selectedLanguages: Array.isArray(profile.selectedLanguages) ? profile.selectedLanguages : [],
        targetStandards: Array.isArray(profile.targetStandards) ? profile.targetStandards : [],
        useEmojis: profile.useEmojis,
        textFormat: profile.textFormat || '',
        differentiationRange: profile.differentiationRange || 'None',
        differentiationTypes: Array.isArray(profile.differentiationTypes) ? profile.differentiationTypes : [],
        differentiationCustomGrades: Array.isArray(profile.differentiationCustomGrades) ? profile.differentiationCustomGrades : [],
        imageGenerationStyle: profile.imageGenerationStyle || profile.universalImageStyle || '',
        imageAspectRatio: profile.imageAspectRatio || ''
      };
    }));
    const reviewedGenerationConfig = fullPackRun?.settingsSnapshot?.fullPackGenerationConfig || null;
    const currentGenerationConfig = _generationHelpersModule && typeof _generationHelpersModule.getFullPackGenerationConfigSnapshot === 'function' ? _generationHelpersModule.getFullPackGenerationConfigSnapshot(_alloGenerationHelpersDeps()) : null;
    const comparableGenerationConfig = Boolean(reviewedGenerationConfig?.fingerprint && currentGenerationConfig?.fingerprint);
    const currentPlanSettings = {
      gradeLevel,
      leveledTextLanguage,
      translationMode,
      currentUiLanguage,
      studentInterests,
      dokLevel,
      selectedLanguages,
      targetStandards,
      useEmojis,
      textFormat,
      imageGenerationStyle: universalImageStyle || imageGenerationStyle || '',
      imageAspectRatio,
      differentiationRange,
      differentiationTypes,
      differentiationCustomGrades,
      resourceCount,
      isAutoConfigEnabled,
      fullPackTargetGroup,
      rosterSignature: currentRosterSignature,
      fullPackGenerationConfigFingerprint: comparableGenerationConfig ? currentGenerationConfig.fingerprint : null
    };
    const changeLabels = {
      gradeLevel: t('fullpack.setting_grade') || 'grade',
      leveledTextLanguage: t('fullpack.setting_language') || 'language',
      translationMode: t('fullpack.setting_translation_mode') || 'translation mode',
      currentUiLanguage: t('fullpack.setting_ui_language') || 'interface language',
      studentInterests: t('fullpack.setting_interests') || 'interests',
      dokLevel: t('fullpack.setting_dok') || 'depth of knowledge',
      selectedLanguages: t('fullpack.setting_translation_languages') || 'translation languages',
      targetStandards: t('fullpack.setting_standards') || 'standards',
      useEmojis: t('fullpack.setting_emoji') || 'emoji preference',
      textFormat: t('fullpack.setting_text_format') || 'text format',
      imageGenerationStyle: t('fullpack.setting_image_style') || 'image style',
      imageAspectRatio: t('fullpack.setting_image_aspect') || 'image aspect ratio',
      differentiationRange: t('fullpack.setting_diff_range') || 'differentiation range',
      differentiationTypes: t('fullpack.setting_diff_resources') || 'differentiated resources',
      differentiationCustomGrades: t('fullpack.setting_custom_grades') || 'custom grade levels',
      resourceCount: t('fullpack.setting_pack_size') || 'pack size',
      isAutoConfigEnabled: t('fullpack.setting_auto_configure') || 'auto-configure',
      fullPackTargetGroup: t('fullpack.setting_target_group') || 'target group',
      rosterSignature: t('fullpack.setting_roster_groups') || 'roster groups',
      fullPackGenerationConfigFingerprint: t('fullpack.setting_generation_configuration') || 'resource generation configuration'
    };
    const originalPlanSettings = Object.assign({}, fullPackRun.settingsSnapshot || {}, {
      fullPackGenerationConfigFingerprint: comparableGenerationConfig ? reviewedGenerationConfig.fingerprint : null
    });
    const planChanges = fullPackRun.status === 'ready' ? Object.keys(changeLabels).filter(key => JSON.stringify(originalPlanSettings[key] ?? null) !== JSON.stringify(currentPlanSettings[key] ?? null)) : [];
    const formatPlanValue = (value, key) => {
      if (key === 'fullPackGenerationConfigFingerprint') return t('fullpack.configuration_snapshot') || 'Reviewed configuration snapshot';
      if (value === undefined || value === null || value === '') return t('fullpack.not_set') || 'Not set';
      if (typeof value === 'boolean') return value ? t('fullpack.on') || 'On' : t('fullpack.off') || 'Off';
      if (Array.isArray(value)) return value.length ? value.join(', ') : t('fullpack.none') || 'None';
      const rendered = String(value);
      return rendered.length > 120 ? rendered.slice(0, 117) + '...' : rendered;
    };
    return /*#__PURE__*/React.createElement("div", {
      "data-testid": "full-pack-review-panel",
      className: "mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sr-only",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true"
    }, fullPackRun.status === 'ready' ? `${t('fullpack.panel_plan') || 'Full Pack plan'}. ${total} ${t('fullpack.selected') || 'selected'}.` : `${t('fullpack.panel_progress') || 'Full Pack progress'}. ${settled} of ${total} ${t('fullpack.finished') || 'finished'}.`), /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-black uppercase tracking-wide text-slate-800"
    }, fullPackRun.status === 'ready' ? t('fullpack.panel_plan') || 'Full Pack plan' : t('fullpack.panel_progress') || 'Full Pack progress'), /*#__PURE__*/React.createElement("div", {
      className: "mt-0.5 text-[10px] text-slate-600"
    }, planSummaries.length ? `${planSelected} ${t('fullpack.selected') || 'selected'} · ${planSkipped} ${t('fullpack.skipped') || 'skipped'} · ~${planGenerations} ${t('fullpack.resource_generations') || 'new generations'} · ${planReused} ${t('fullpack.reused_outputs') || 'existing outputs reused'}` : t('fullpack.preparing_plan') || 'Preparing generation plan…')), /*#__PURE__*/React.createElement("span", {
      className: `shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${statusStyles[fullPackRun.status] || statusStyles.queued}`
    }, statusLabels[fullPackRun.status] || fullPackRun.status)), fullPackRun.persistenceWarning && /*#__PURE__*/React.createElement("div", {
      "data-testid": "full-pack-storage-warning",
      role: "status",
      className: "mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-950"
    }, /*#__PURE__*/React.createElement(AlertTriangle, {
      size: 14,
      "aria-hidden": "true",
      className: "mt-0.5 shrink-0"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black"
    }, t('blueprint.saved_run_warning') || 'Saved-run warning', ":"), " ", fullPackRun.persistenceWarning)), fullPackRun.status === 'ready' && planChanges.length > 0 && /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      className: "mx-3 mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-950"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-black"
    }, t('fullpack.settings_changed') || 'Settings changed after this plan was created'), /*#__PURE__*/React.createElement("div", {
      className: "mt-0.5 break-words"
    }, planChanges.map(key => changeLabels[key]).join(', '), "."), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 font-semibold"
    }, t('fullpack.original_plan_help') || 'Generate original plan uses the reviewed settings. Choose Refresh plan to use the current settings.'), /*#__PURE__*/React.createElement("details", {
      className: "mt-2 rounded-lg border border-amber-300 bg-white/70"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer px-2 py-1 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
    }, t('fullpack.review_values') || 'Review original and current values'), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1 border-t border-amber-200 px-2 py-1.5"
    }, planChanges.map(key => /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 break-words"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, changeLabels[key], ":"), " ", formatPlanValue(originalPlanSettings[key], key)), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u2192"), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 break-words"
    }, formatPlanValue(currentPlanSettings[key], key))))))), fullPackRun.status === 'ready' && planSummaries.length > 0 && /*#__PURE__*/React.createElement("div", {
      "data-testid": "full-pack-capacity",
      className: 'mx-3 mt-2 rounded-xl border px-3 py-2 text-[10px] leading-relaxed ' + (localizedCapacityWarnings.length ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-sky-200 bg-sky-50 text-sky-900')
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-black"
    }, t('fullpack.capacity_preview') || 'Capacity preview'), providerSummary && /*#__PURE__*/React.createElement("div", {
      className: "flex min-w-0 items-center gap-1 text-[9px] font-semibold"
    }, /*#__PURE__*/React.createElement(Cpu, {
      size: 11,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      className: "truncate"
    }, t('fullpack.provider') || 'Provider', ": ", providerSummary))), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 grid grid-cols-3 gap-1.5",
      "aria-label": t('fullpack.capacity_preview') || 'Capacity preview'
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex min-w-0 items-center gap-1 rounded-lg border border-current/15 bg-white/70 px-2 py-1.5"
    }, /*#__PURE__*/React.createElement(Cpu, {
      size: 12,
      "aria-hidden": "true",
      className: "shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "font-black"
    }, "~", planProviderCalls), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 truncate"
    }, t('fullpack.provider_calls') || 'provider calls')), /*#__PURE__*/React.createElement("div", {
      className: "flex min-w-0 items-center gap-1 rounded-lg border border-current/15 bg-white/70 px-2 py-1.5"
    }, /*#__PURE__*/React.createElement(ImageIcon, {
      size: 12,
      "aria-hidden": "true",
      className: "shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "font-black"
    }, planImageCalls), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 truncate"
    }, t('fullpack.image_calls') || 'image calls')), /*#__PURE__*/React.createElement("div", {
      className: "flex min-w-0 items-center gap-1 rounded-lg border border-current/15 bg-white/70 px-2 py-1.5"
    }, /*#__PURE__*/React.createElement(Clock, {
      size: 12,
      "aria-hidden": "true",
      className: "shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "font-black"
    }, "~", Math.max(1, planMinutes)), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 truncate"
    }, t('fullpack.minutes') || 'minutes'))), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[9px] opacity-80"
    }, usesObservedEstimate ? t('fullpack.estimate_observed') || 'Estimate uses recent timings from this device' : t('fullpack.estimate_defaults') || 'Estimate uses provider defaults'), localizedCapacityWarnings.map((warning, index) => /*#__PURE__*/React.createElement("div", {
      key: index,
      className: "mt-1 font-semibold"
    }, warning))), fullPackRun.status !== 'ready' && total > 0 && /*#__PURE__*/React.createElement("div", {
      className: "px-3 pt-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-1 flex justify-between text-[10px] font-bold text-slate-600"
    }, /*#__PURE__*/React.createElement("span", null, settled, " of ", total, " ", t('fullpack.finished') || 'finished'), /*#__PURE__*/React.createElement("span", null, progress, "%")), /*#__PURE__*/React.createElement("div", {
      className: "h-2 overflow-hidden rounded-full bg-slate-200",
      role: "progressbar",
      "aria-label": t('fullpack.progress_aria') || 'Full Pack generation progress',
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": progress
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full rounded-full bg-indigo-600 transition-[width] motion-reduce:transition-none",
      style: {
        width: `${progress}%`
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "max-h-64 space-y-3 overflow-y-auto px-3 py-2.5"
    }, sections.map((section, sectionIndex) => {
      const rows = buildRows(section);
      const visibleRows = showCompletedFullPackRows ? rows : rows.filter(row => row && !['landed', 'completed'].includes(row.status));
      const sectionGroupId = groupRuns.length > 0 ? section.groupId : null;
      const sectionInstructionalContext = section?.planPayload?.instructionalContext || section?.settingsSnapshot?.instructionalContext || {};
      const sectionAdaptedCount = rows.filter(row => row && row.type === 'simplified').length;
      const sectionAdaptedTextPolicy = ['include', 'omit', 'prohibited'].includes(sectionInstructionalContext.adaptedTextPolicy) ? sectionInstructionalContext.adaptedTextPolicy : sectionAdaptedCount > 0 ? 'include' : 'omit';
      const sectionPrimaryTextAccess = sectionInstructionalContext.primaryTextAccess === 'required' ? 'required' : 'available';
      const sectionHasPrimary = rows.some(row => row && (row.type === 'analysis' || row.instructionalText?.role === 'primary')) || history.some(item => item && (item.type === 'analysis' || item.instructionalText?.role === 'primary')) || Boolean(String(inputText || '').trim())
      // A reviewed source fingerprint/length means this plan is anchored
      // to source text even when Analyze Source is not itself a plan row.
      || Number(section?.preflight?.sourceTextChars || 0) > 0 || Boolean(String(section?.preflight?.sourceFingerprint || '').trim());
      const sectionHasStandards = Boolean(Array.isArray(sectionInstructionalContext?.standardsContext?.standards) && sectionInstructionalContext.standardsContext.standards.length || Array.isArray(targetStandards) && targetStandards.length || String(sectionInstructionalContext?.standardsContext?.promptText || '').trim());
      const sectionStandardsFrozen = Boolean(section?.preflight?.standardsFingerprint || sectionInstructionalContext.standardsFingerprint);
      return /*#__PURE__*/React.createElement("div", {
        key: section.groupId || section.runId || sectionIndex
      }, groupRuns.length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "mb-1.5 text-[10px] font-black uppercase tracking-wide text-indigo-800"
      }, section.groupName || `Group ${sectionIndex + 1}`), fullPackRun.status === 'ready' && /*#__PURE__*/React.createElement("div", {
        "data-testid": "full-pack-text-access-summary",
        "data-group-id": sectionGroupId || '',
        role: "status",
        "aria-live": "polite",
        className: "mb-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-2.5 py-2 text-[10px] leading-relaxed text-indigo-950"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-start justify-between gap-2"
      }, /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("div", {
        className: "font-black"
      }, t('fullpack.text_access_summary') || 'Text access summary'), /*#__PURE__*/React.createElement("div", {
        className: "mt-0.5"
      }, sectionHasPrimary ? sectionPrimaryTextAccess === 'required' ? t('fullpack.primary_required') || 'The source text is the required primary text for standards alignment and assessment evidence.' : t('fullpack.primary_available') || 'The source text remains available as the primary reference for this pack.' : t('fullpack.primary_missing') || 'No primary/source text is identified in this plan.'), /*#__PURE__*/React.createElement("div", {
        className: "mt-0.5"
      }, sectionAdaptedCount > 0 ? `${sectionAdaptedCount} ${sectionAdaptedCount === 1 ? t('fullpack.adapted_companion_one') || 'supplemental Adapted Text companion' : t('fullpack.adapted_companion_many') || 'supplemental Adapted Text companions'}.` : t('fullpack.no_adapted_companion') || 'No Adapted Text companion is included.', ' ', t('fullpack.no_inferred_replacement') || 'No primary-text replacement or IEP modification is inferred.'), sectionStandardsFrozen && /*#__PURE__*/React.createElement("div", {
        className: "mt-0.5 font-semibold"
      }, t('fullpack.standards_frozen') || 'The standards context is frozen to this reviewed plan.')), /*#__PURE__*/React.createElement("label", {
        className: "min-w-[12rem] text-[9px] font-bold uppercase tracking-wide text-indigo-900"
      }, /*#__PURE__*/React.createElement("span", {
        className: "block mb-1"
      }, t('fullpack.adapted_policy') || 'Adapted-text plan policy'), /*#__PURE__*/React.createElement("select", {
        "data-testid": "full-pack-adapted-policy",
        "data-group-id": sectionGroupId || '',
        value: sectionAdaptedTextPolicy,
        onChange: event => handleSetFullPackPlanAdaptedTextPolicy(event.target.value, sectionGroupId),
        disabled: sectionAdaptedTextPolicy === 'prohibited',
        className: "w-full rounded-lg border border-indigo-300 bg-white px-2 py-1.5 text-[10px] font-bold normal-case tracking-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        "aria-label": (t('fullpack.adapted_policy') || 'Adapted-text plan policy') + (section.groupName ? `: ${section.groupName}` : '')
      }, /*#__PURE__*/React.createElement("option", {
        value: "include"
      }, t('fullpack.policy_include_adapted') || 'Include supplemental Adapted Text (recommended)'), /*#__PURE__*/React.createElement("option", {
        value: "omit",
        disabled: rows.length > 0 && sectionAdaptedCount === rows.length
      }, t('fullpack.policy_omit_adapted') || 'Omit Adapted Text'), sectionAdaptedTextPolicy === 'prohibited' && /*#__PURE__*/React.createElement("option", {
        value: "prohibited"
      }, t('fullpack.policy_adapted_prohibited') || 'Adaptation prohibited by sourced standard')), rows.length > 0 && sectionAdaptedCount === rows.length && /*#__PURE__*/React.createElement("span", {
        className: "mt-1 block normal-case font-medium tracking-normal"
      }, t('fullpack.keep_non_adapted_first') || 'Add a non-adapted resource before turning this off.')))), fullPackRun.status === 'ready' && /*#__PURE__*/React.createElement("div", {
        className: "mb-2 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
      }, /*#__PURE__*/React.createElement("label", {
        className: "min-w-0 flex-1 text-[9px] font-bold uppercase tracking-wide text-slate-700"
      }, /*#__PURE__*/React.createElement("span", {
        className: "mb-1 block"
      }, t('fullpack.add_resource') || 'Add resource'), /*#__PURE__*/React.createElement("select", {
        "data-testid": "full-pack-add-resource-select",
        "data-group-id": sectionGroupId || '',
        value: fullPackAddType,
        onChange: event => setFullPackAddType(event.target.value),
        className: "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      }, fullPackEditableTypes.map(type => {
        const disabled = type === 'alignment-report' && !sectionHasStandards || type === 'simplified' && sectionAdaptedTextPolicy === 'prohibited';
        const label = type === 'simplified' ? t('common.adapted_text') || 'Adapted text' : getDefaultTitle(type) || String(type).replace(/-/g, ' ');
        return /*#__PURE__*/React.createElement("option", {
          key: type,
          value: type,
          disabled: disabled
        }, label, disabled ? ` (${t('fullpack.requires_standards') || 'requires standards'})` : '');
      }))), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-testid": "full-pack-add-resource",
        "data-group-id": sectionGroupId || '',
        onClick: () => handleAddFullPackPlanResource({
          type: fullPackAddType,
          directive: ''
        }, sectionGroupId),
        disabled: !fullPackAddType || fullPackAddType === 'alignment-report' && !sectionHasStandards,
        className: "inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      }, /*#__PURE__*/React.createElement(Plus, {
        size: 12,
        "aria-hidden": "true"
      }), t('fullpack.add_resource_action') || 'Add to plan')), /*#__PURE__*/React.createElement("div", {
        className: "space-y-1.5"
      }, rows.length === 0 && /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-[10px] text-slate-500"
      }, t('fullpack.waiting_group') || 'Waiting to plan this group…'), rows.length > 0 && visibleRows.length === 0 && /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 px-2.5 py-2 text-[10px] text-emerald-800"
      }, t('fullpack.completed_hidden') || 'Completed resources are hidden.'), visibleRows.map((row, index) => {
        const rowKey = row.key || `${row.type}-${index}`;
        // Plan rows used to print the raw internal resource id, so the pack
        // plan told teachers it was going to build "Simplified" (and "dbq",
        // "sentence frames"). Use the app's own resource names instead.
        // getDefaultTitle collapses anything it does not know to a generic
        // "Resource", which would lose more than it gains, so an unknown type
        // still falls back to its prettified id. row.type ids are ASCII, so
        // the \b in the title-casing is safe here.
        const _rowGenericTitle = t('common.resource') || 'Resource';
        const _rowNamedTitle = getDefaultTitle(row.type);
        const rowTitle = row.type === 'simplified' ? t('common.adapted_text') || 'Adapted text' : _rowNamedTitle && _rowNamedTitle !== _rowGenericTitle ? _rowNamedTitle : String(row.type || 'resource').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const safeRowReason = row.reason ? _alloDiagnosticReason(row.reason) : null;
        const rowGenerationVariants = Array.isArray(row.generationVariants) ? row.generationVariants : [];
        const rowNewVariantCount = rowGenerationVariants.filter(variant => variant && variant.action !== 'reuse').length;
        const rowReuseVariantCount = rowGenerationVariants.filter(variant => variant && variant.action === 'reuse').length;
        const rowVariantGrades = Array.from(new Set(rowGenerationVariants.map(variant => variant && variant.grade).filter(Boolean)));
        const rowVariantLanguages = Array.from(new Set(rowGenerationVariants.map(variant => variant && variant.language).filter(Boolean)));
        const rowStatus = /*#__PURE__*/React.createElement("span", {
          className: `shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusStyles[row.status] || statusStyles.queued}`
        }, statusLabels[row.status] || row.status || t('fullpack.status_queued') || 'Queued', row.elapsedMs ? ` · ${Math.max(1, Math.round(row.elapsedMs / 1000))}s` : '');
        if (fullPackRun.status === 'ready') {
          const snapshot = section.settingsSnapshot || originalPlanSettings;
          const differentiation = section.preflight?.differentiation;
          const isDifferentiated = Array.isArray(differentiation?.types) && differentiation.types.includes(row.type);
          const planResourceKey = row.uiId || rowKey;
          const rowTypeOptions = fullPackEditableTypes.includes(row.type) ? fullPackEditableTypes : [row.type, ...fullPackEditableTypes];
          return /*#__PURE__*/React.createElement("details", {
            key: rowKey,
            className: "group/plan overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70"
          }, /*#__PURE__*/React.createElement("summary", {
            className: "flex min-w-0 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden"
          }, /*#__PURE__*/React.createElement("span", {
            className: "min-w-0 truncate text-[11px] font-bold text-slate-800"
          }, rowTitle), /*#__PURE__*/React.createElement("span", {
            className: "flex shrink-0 items-center gap-1.5"
          }, rowStatus, /*#__PURE__*/React.createElement(ChevronDown, {
            size: 13,
            "aria-hidden": "true",
            className: "text-slate-500 transition-transform motion-reduce:transition-none group-open/plan:rotate-180"
          }))), /*#__PURE__*/React.createElement("div", {
            className: "space-y-2 border-t border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-relaxed text-slate-700"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block font-bold text-slate-900"
          }, /*#__PURE__*/React.createElement("span", {
            className: "mb-1 block"
          }, t('fullpack.resource_type') || 'Resource type'), /*#__PURE__*/React.createElement("select", {
            "data-testid": "full-pack-resource-type",
            "data-resource-key": planResourceKey,
            "data-group-id": sectionGroupId || '',
            value: row.type,
            onChange: event => handleChangeFullPackPlanResourceType(planResourceKey, event.target.value, sectionGroupId),
            className: "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            "aria-label": (t('fullpack.resource_type') || 'Resource type') + ': ' + rowTitle
          }, rowTypeOptions.map(type => {
            const disabled = type === 'alignment-report' && !sectionHasStandards && type !== row.type;
            const label = type === 'simplified' ? t('common.adapted_text') || 'Adapted text' : getDefaultTitle(type) || String(type).replace(/-/g, ' ');
            return /*#__PURE__*/React.createElement("option", {
              key: type,
              value: type,
              disabled: disabled
            }, label, disabled ? ` (${t('fullpack.requires_standards') || 'requires standards'})` : '');
          }))), /*#__PURE__*/React.createElement("label", {
            className: "block font-bold text-slate-900"
          }, /*#__PURE__*/React.createElement("span", {
            className: "mb-1 block"
          }, t('fullpack.instruction') || 'Instruction'), /*#__PURE__*/React.createElement("textarea", {
            "data-testid": "full-pack-resource-directive",
            "data-resource-key": planResourceKey,
            "data-group-id": sectionGroupId || '',
            rows: 2,
            maxLength: 4000,
            value: row.directive || '',
            onChange: event => handleEditFullPackPlanResourceDirective(planResourceKey, event.target.value, sectionGroupId),
            placeholder: t('fullpack.standard_guidance') || 'Standard generation guidance',
            className: "w-full resize-y rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-medium leading-relaxed text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            "aria-label": (t('fullpack.instruction') || 'Instruction') + ': ' + rowTitle
          })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
            className: "font-bold text-slate-900"
          }, t('fullpack.audience') || 'Audience', ":"), " ", snapshot.gradeLevel || t('fullpack.current_grade') || 'Current grade', " \xB7 ", snapshot.leveledTextLanguage || t('fullpack.default_language') || 'Default language'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
            className: "font-bold text-slate-900"
          }, t('fullpack.differentiation') || 'Differentiation', ":"), " ", isDifferentiated ? `${Math.max(1, differentiation.levelCount || 1)} ${t('fullpack.levels') || 'levels'}` : t('fullpack.single_version') || 'Single version'), /*#__PURE__*/React.createElement("div", {
            "data-testid": "full-pack-row-generation-impact",
            className: "rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-sky-950"
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-bold"
          }, t('fullpack.generation_impact') || 'Generation impact', ":"), ' ', rowGenerationVariants.length ? rowReuseVariantCount === rowGenerationVariants.length ? t('fullpack.reuse_no_call') || 'Reuse existing output · no AI call' : `${rowNewVariantCount} ${t('fullpack.new_versions') || 'new'} / ${rowReuseVariantCount} ${t('fullpack.reused_versions') || 'reused'}` : t('fullpack.matrix_refresh_pending') || 'This row will be recalculated before approval.', rowGenerationVariants.length > 0 && /*#__PURE__*/React.createElement("ul", {
            "data-testid": "full-pack-generation-cells",
            className: "mt-1 space-y-0.5 border-t border-sky-200 pt-1",
            "aria-label": t('fullpack.generation_cells') || 'Exact generation versions'
          }, rowGenerationVariants.map((variant, variantIndex) => {
            const action = variant.action === 'reuse' ? t('fullpack.action_reuse') || 'Reuse' : variant.action === 'refresh' ? t('fullpack.action_refresh') || 'Refresh' : variant.action === 'variant' ? t('fullpack.action_variant') || 'New variant' : t('fullpack.action_generate') || 'Generate';
            const coordinates = [variant.grade, variant.language].filter(Boolean).join(' · ') || t('fullpack.source_wide') || 'Source-wide';
            return /*#__PURE__*/React.createElement("li", {
              key: variant.generationIdentity || `${variantIndex}-${coordinates}`,
              className: "flex min-w-0 items-start justify-between gap-2"
            }, /*#__PURE__*/React.createElement("span", {
              className: "min-w-0 break-words"
            }, coordinates), /*#__PURE__*/React.createElement("span", {
              className: "shrink-0 font-bold"
            }, action, variant.status ? ` · ${variant.status}` : ''));
          }), row.type === 'glossary' && Array.isArray(snapshot.selectedLanguages) && snapshot.selectedLanguages.length > 0 && /*#__PURE__*/React.createElement("li", {
            className: "text-sky-800"
          }, t('fullpack.embedded_translations') || 'Embedded translations', ": ", snapshot.selectedLanguages.join(', ')), row.type === 'glossary' && Number(row.providerWorkEstimate?.glossaryImageCalls) > 0 && /*#__PURE__*/React.createElement("li", {
            "data-testid": "full-pack-glossary-image-impact",
            className: "text-sky-800"
          }, t('fullpack.glossary_visuals') || 'Glossary visuals', ": ~", row.providerWorkEstimate.glossaryImageCalls, " ", t('fullpack.term_images') || 'term images', Number(row.providerWorkEstimate?.glossaryImageEditCalls) > 0 ? ` + ${row.providerWorkEstimate.glossaryImageEditCalls} ${t('fullpack.image_cleanup_calls') || 'image cleanup calls'}` : ''))), row.type === 'analysis' && index > 0 && /*#__PURE__*/React.createElement("div", {
            className: "rounded-lg bg-amber-50 px-2 py-1 text-amber-900"
          }, t('fullpack.analysis_first_hint') || 'Analyze Source works best before resources that depend on the source analysis.'), row.type === 'lesson-plan' && index < rows.length - 1 && /*#__PURE__*/React.createElement("div", {
            className: "rounded-lg bg-amber-50 px-2 py-1 text-amber-900"
          }, t('fullpack.lesson_last_hint') || 'Lesson Plan works best last so it can incorporate earlier resources.'), /*#__PURE__*/React.createElement("div", {
            className: "flex flex-wrap justify-end gap-1.5 pt-1"
          }, /*#__PURE__*/React.createElement("button", {
            type: "button",
            "data-testid": "full-pack-move-up",
            "data-resource-key": planResourceKey,
            "data-group-id": sectionGroupId || '',
            disabled: index <= 0,
            onClick: () => handleMoveFullPackPlanResource(planResourceKey, index - 1, sectionGroupId),
            className: "inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            "aria-label": (t('fullpack.move_up') || 'Move up') + ': ' + rowTitle
          }, /*#__PURE__*/React.createElement(ArrowUp, {
            size: 11,
            "aria-hidden": "true"
          }), t('fullpack.move_up') || 'Move up'), /*#__PURE__*/React.createElement("button", {
            type: "button",
            "data-testid": "full-pack-move-down",
            "data-resource-key": planResourceKey,
            "data-group-id": sectionGroupId || '',
            disabled: index >= rows.length - 1,
            onClick: () => handleMoveFullPackPlanResource(planResourceKey, index + 1, sectionGroupId),
            className: "inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            "aria-label": (t('fullpack.move_down') || 'Move down') + ': ' + rowTitle
          }, /*#__PURE__*/React.createElement(ArrowDown, {
            size: 11,
            "aria-hidden": "true"
          }), t('fullpack.move_down') || 'Move down'), /*#__PURE__*/React.createElement("button", {
            type: "button",
            "data-testid": "full-pack-remove-plan-row",
            "data-resource-key": planResourceKey,
            "data-group-id": sectionGroupId || '',
            disabled: rows.length <= 1,
            onClick: () => handleRemoveFullPackPlanResource(planResourceKey, sectionGroupId),
            className: "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[9px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
            "aria-label": (t('fullpack.remove_resource_aria') || 'Remove resource from plan') + ': ' + rowTitle,
            title: rows.length <= 1 ? t('fullpack.keep_one_resource') || 'Keep at least one resource in the plan' : t('fullpack.remove_resource') || 'Remove from plan'
          }, /*#__PURE__*/React.createElement(Trash2, {
            size: 11,
            "aria-hidden": "true"
          }), t('fullpack.remove_resource') || 'Remove from plan'))));
        }
        return /*#__PURE__*/React.createElement("div", {
          key: rowKey,
          className: "flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2"
        }, /*#__PURE__*/React.createElement("div", {
          className: "min-w-0"
        }, /*#__PURE__*/React.createElement("div", {
          className: "truncate text-[11px] font-bold text-slate-800"
        }, rowTitle), safeRowReason && /*#__PURE__*/React.createElement("div", {
          "data-testid": "full-pack-failure-reason",
          "data-failure-code": safeRowReason.code,
          className: "mt-0.5 break-words text-[10px] leading-snug text-rose-700"
        }, safeRowReason.summary)), rowStatus);
      })));
    })), /*#__PURE__*/React.createElement("div", {
      "data-testid": "full-pack-sticky-actions",
      className: "sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur motion-reduce:backdrop-blur-none"
    }, elapsedSeconds > 0 && /*#__PURE__*/React.createElement("span", {
      className: "me-auto text-[9px] font-semibold text-slate-500"
    }, t('fullpack.run') || 'Run', " ", fullPackRun.runId?.slice(-8), " \xB7 ", elapsedSeconds, "s"), completedRows > 0 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "full-pack-toggle-completed",
      "aria-pressed": !showCompletedFullPackRows,
      onClick: () => setShowCompletedFullPackRows(value => !value),
      className: "inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    }, showCompletedFullPackRows ? /*#__PURE__*/React.createElement(EyeOff, {
      size: 12,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Eye, {
      size: 12,
      "aria-hidden": "true"
    }), showCompletedFullPackRows ? t('fullpack.hide_completed') || 'Hide completed' : t('fullpack.show_completed') || 'Show completed'), fullPackRun.status === 'ready' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "full-pack-refresh-plan",
      onClick: handlePlanFullPack,
      className: "inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      "aria-hidden": "true"
    }), t('fullpack.refresh_plan') || 'Refresh plan'), retryable && !['running', 'retrying', 'planning'].includes(fullPackRun.status) && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "full-pack-retry",
      onClick: handleRetryFailedFullPack,
      className: "inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      "aria-hidden": "true"
    }), t('fullpack.retry_failures') || 'Retry failures'), hasFailureDiagnostics && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "full-pack-open-error-log",
      onClick: handleOpenGenerationErrorLog,
      className: "inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
    }, /*#__PURE__*/React.createElement(AlertTriangle, {
      size: 12,
      "aria-hidden": "true"
    }), t('fullpack.open_error_log') || 'Open error log'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "full-pack-copy-diagnostics",
      onClick: handleCopyFullPackDiagnostics,
      className: "inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    }, /*#__PURE__*/React.createElement(Copy, {
      size: 12,
      "aria-hidden": "true"
    }), t('fullpack.copy_diagnostics') || 'Copy diagnostics'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "full-pack-download-diagnostics",
      onClick: handleDownloadFullPackDiagnostics,
      className: "inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    }, /*#__PURE__*/React.createElement(Download, {
      size: 12,
      "aria-hidden": "true"
    }), t('fullpack.download_report') || 'Download report'), !['running', 'retrying', 'planning'].includes(fullPackRun.status) && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleDismissFullPackRun,
      className: "rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    }, t('fullpack.dismiss') || 'Dismiss')));
  })());
}
window.AlloModules.FullPackRunView = FullPackRunView;
window.AlloModules.FullPackRunView = window.AlloModules.FullPackRunView;
console.log('[CDN] FullPackRunView loaded');
})();
