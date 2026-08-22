// view_misc_modals_source.jsx — 4-modal cluster (Round 5 Tier B)
//
// Bundles four small modals into a single CDN module:
//   - GroupSessionModal   (showGroupModal && activeSessionCode && sessionData)
//   - PdfDiffViewer       (diffViewOpen && pdfFixResult)
//   - UDLGuideModal       (showUDLGuide)
//   - AIBackendModal      (showAIBackendModal && !_isCanvasEnv)
//
// Total ~527 lines extracted from AlloFlowANTI.txt.
// Closure deps generated via SCOPE-AWARE enumerator (handles param shadowing).

// ── UDLGuideModal (UDL Guide Modal) — gate: showUDLGuide ──
function UDLGuideModal(props) {
  // The Talk control reflects the live voice-loop state.
  const [chatMenuOpen, setChatMenuOpen] = React.useState(false);
  const [voicePaused, setVoicePaused] = React.useState(false);
  // Escape and any outside click close the overflow menu — a menu that can
  // only be dismissed by re-clicking its own trigger is a keyboard trap.
  React.useEffect(() => {
    if (!chatMenuOpen) return undefined;
    const onKey = (ev) => { if (ev.key === 'Escape') setChatMenuOpen(false); };
    const onDown = () => setChatMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [chatMenuOpen]);
  const {
    InteractiveBlueprintCard, activeBlueprint, addToast, blueprintExecutionResult, setBlueprintExecutionResult,
    isExecutingBlueprint, handleStopBlueprintRun, archiveLivePlan, archivedPlans, handleRestoreArchivedPlan, handleDeleteArchivedPlan,
    handleRebuildBlueprintStep, handleOpenGenerationErrorLog, handleCopyBlueprintDiagnostics, handleDownloadBlueprintDiagnostics, getSafeGenerationFailureReason,
    lessonTemplates, handleSaveLessonTemplate, handleApplyLessonTemplate, handleDeleteLessonTemplate,
    handlePreviewBlueprintStep, blueprintPreview, closeBlueprintPreview,
    aiStandardQuery, aiStandardRegion, autoSendVoice, chatStyles,
    handleAutoFillToggle, handleBlueprintUIUpdate, handleExecuteBlueprint, handleFindStandards,
    handleSendUDLMessage, handleSetShowUDLGuideToFalse, handleToggleAutoSendVoice, handleToggleIsShowMeMode,
    handleToggleIsUDLGuideExpanded, hasUsedAutoFill, isAutoFillMode, isChatProcessing,
    isConversationMode, isFindingStandards, isHelpMode, isIndependentMode,
    isSavingAdvice, isShowMeMode, isSpotlightMode, isUDLGuideExpanded,
    renderFormattedText, saveFullChat, saveUDLAdvice, setActiveBlueprint,
    setAiStandardQuery, setAiStandardRegion, setIsBotVisible, setIsConversationMode,
    setIsDictationMode, setStandardsInput, setUdlInput, setUdlMessages,
    setUdlStandardFramework, setUdlStandardGrade, showStemLab, showUDLGuide, suggestedStandards,
    alloVoiceActive, voiceAvailable, onToggleVoiceAgent,
    t, theme, udlInput, udlInputRef,
    udlMessages, udlScrollRef, udlStandardFramework, udlStandardGrade
  } = props;
  // The global command listener and legacy free-form dictation are separate
  // microphone owners. Talk is command mode only: always tear down dictation
  // before starting, pausing, stopping, or hiding the Talk surface. The shared
  // controller abort is synchronous, while the state update also covers the
  // host's older Web Speech fallback on the next render.
  const stopLegacyDictation = React.useCallback(() => {
      try {
          const voice = window.AlloFlowVoice;
          if (voice && typeof voice.stopActiveDictation === 'function') voice.stopActiveDictation(true);
      } catch (_) {}
      setIsDictationMode(false);
  }, [setIsDictationMode]);
  const closeGuide = React.useCallback(() => {
      stopLegacyDictation();
      setIsConversationMode(false);
      handleSetShowUDLGuideToFalse();
  }, [handleSetShowUDLGuideToFalse, setIsConversationMode, stopLegacyDictation]);
  React.useEffect(() => {
      if (alloVoiceActive || voicePaused || !showUDLGuide) stopLegacyDictation();
      if (!alloVoiceActive || !showUDLGuide) setIsConversationMode(false);
      if (!alloVoiceActive) setVoicePaused(false);
  }, [alloVoiceActive, setIsConversationMode, showUDLGuide, stopLegacyDictation, voicePaused]);
  // The standards finder + framework consult are power-user tools that were
  // pinned open above the input box, leaving the transcript ~40% of a 24rem
  // panel — cramped enough that a guided-flow question and its answer pills
  // couldn't be on screen together. They collapse now; the choice is sticky.
  // NOTE: hooks must stay above the showUDLGuide early-return.
  const [standardToolsOpen, setStandardToolsOpen] = useState(() => {
      try { return localStorage.getItem('allo_udl_standard_tools_open') === '1'; } catch (_) { return false; }
  });
  const toggleStandardTools = () => setStandardToolsOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('allo_udl_standard_tools_open', next ? '1' : '0'); } catch (_) {}
      return next;
  });
  // Executing a blueprint no longer closes the panel, so it needs a way to get
  // out of the way WITHOUT unmounting — closing would throw away the thread the
  // plan came out of. Collapsed = header bar only, pinned bottom-right, so the
  // resources land in full view while the conversation stays alive. Local state
  // on purpose: the component stays mounted for the whole session.
  const [isCollapsed, setIsCollapsed] = useState(false);
  if (!(showUDLGuide)) return null;
  if (isCollapsed) {
      return (
        <div style={{ zIndex: showStemLab ? 10490 : undefined }} className={`allo-docsuite fixed z-[100] bottom-4 right-4 rounded-2xl shadow-lg overflow-hidden ${chatStyles.container}`}>
          <div className={`px-3 py-2 flex items-center gap-2 ${chatStyles.header}`}>
              <HelpCircle size={16} />
              <span className="font-bold text-sm">{t('chat_guide.header')}</span>
              {isChatProcessing && <RefreshCw size={12} className="animate-spin" />}
              <button
                  type="button"
                  onClick={() => setIsCollapsed(false)}
                  className="hover:bg-white/20 p-1 rounded transition-colors ml-1"
                  title={t('chat_guide.restore') || 'Restore chat'}
                  aria-label={t('chat_guide.restore') || 'Restore chat'}
              >
                  <Maximize size={16} />
              </button>
              <button
                  type="button"
                  onClick={closeGuide}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                  aria-label={t('common.close')}
              >
                  <X size={16} />
              </button>
          </div>
        </div>
      );
  }
  return (
        <div style={{ zIndex: showStemLab ? 10490 : undefined }} className={`allo-docsuite fixed z-[100] rounded-2xl flex flex-col animate-in fade-in slide-in-from-right-5 duration-300 overflow-hidden transition-all ${isUDLGuideExpanded ? 'inset-4 top-24' : 'top-24 right-4 bottom-4 w-96'} ${isSpotlightMode ? 'opacity-20 hover:opacity-100 pointer-events-none hover:pointer-events-auto' : 'opacity-100'} ${chatStyles.container}`}>
          <div className={`p-4 flex justify-between items-center shrink-0 ${chatStyles.header}`}>
            <div className="flex items-center gap-2 font-bold">
               <HelpCircle size={18} /> {t('chat_guide.header')}
            </div>
            <div className="flex items-center gap-1">
                {/* ONE Talk control owns global app commands. Free-form
                    dictation is a separate semantic action; starting both
                    recognizers here would make microphone state unreliable.
                    Labelled, not icon-only — a tooltip is unreachable on touch. */}
                <button
                    type="button"
                    data-help-key="chat_talk"
                    aria-pressed={alloVoiceActive ? 'true' : 'false'}
                    onClick={(e) => {
                        if (isHelpMode) return;
                        e.preventDefault();
                        const next = !alloVoiceActive;
                        stopLegacyDictation();
                        if (typeof onToggleVoiceAgent === 'function') onToggleVoiceAgent();
                        setVoicePaused(false);
                        // Command listening does not imply free-form dictation.
                        // A future semantic dictation action must opt in
                        // explicitly and coordinate ownership through one service.
                        setIsConversationMode(false);
                        if (next) setIsBotVisible(true);
                        let seenHint = false;
                        try { seenHint = !!localStorage.getItem('allo_agent_voice_hint_v1'); } catch (_) {}
                        if (next && !seenHint) {
                            try { localStorage.setItem('allo_agent_voice_hint_v1', '1'); } catch (_) {}
                            setUdlMessages(prev => [...prev, { role: 'model', text: t('chat_guide.talk_hint') || 'Listening for app commands. You can also ask a question or describe a multi-step request; proposed actions appear in a plan card you review before anything runs. Try “open the learning hub”, “read this page”, or “where is the export button?” Say “pause listening” to pause or “stop listening” to finish. Privacy note: this uses your selected recognition engine. On-device Whisper keeps recognition audio on this device; a browser speech service may send command audio to its provider; Gemini cloud transcription sends each completed spoken turn to Gemini only when you explicitly select it.' }]);
                        }
                    }}
                    className={`hover:bg-white/20 px-2 py-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${alloVoiceActive ? (voicePaused ? 'bg-amber-400 text-indigo-900 border-amber-500' : 'bg-red-600 text-white border-red-400 animate-pulse') : 'border-white/40'}`}
                    title={alloVoiceActive ? (voicePaused ? t('chat_guide.talk_stop_paused_tooltip', 'Stop the paused AlloBot voice session') : t('chat_guide.talk_stop_tooltip', 'Stop AlloBot command listening')) : t('chat_guide.talk_start_tooltip', 'Start AlloBot command listening')}
                >
                    <Headphones size={12}/> {alloVoiceActive ? (voicePaused ? t('chat_guide.talk_paused', 'Paused') : (t('chat_guide.talk_on') || 'Listening')) : (t('chat_guide.talk') || 'Talk')}
                </button>
                {/* Momentary pause stops AlloBot's command listener and any
                    legacy dictation session. It deliberately does not claim
                    that unrelated recording tools elsewhere in the app stop. */}
                {alloVoiceActive && (
                <button
                    type="button"
                    data-help-key="chat_talk_pause"
                    aria-pressed={voicePaused ? 'true' : 'false'}
                    onClick={() => {
                        stopLegacyDictation();
                        const loop = window.__alloVoiceLoop;
                        if (!loop) return;
                        if (voicePaused) { Promise.resolve(loop.resume()).then((ok) => setVoicePaused(!ok)); }
                        else { loop.pause(); setVoicePaused(true); }
                    }}
                    className={`hover:bg-white/20 px-2 py-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${voicePaused ? 'bg-amber-400 text-indigo-900 border-amber-500' : 'border-white/40'}`}
                    title={voicePaused ? t('chat_guide.resume_tooltip', 'Resume AlloBot command listening') : t('chat_guide.pause_tooltip', 'Pause AlloBot command listening and release its microphone session')}
                >
                    {voicePaused ? (t('chat_guide.resume', 'Resume')) : (t('chat_guide.pause', 'Pause'))}
                </button>
                )}
                {/* Everything secondary lives behind one menu so the header
                    carries a single primary action plus window controls. */}
                <div className="relative">
                    <button
                        type="button"
                        data-help-key="chat_more"
                        aria-haspopup="true"
                        aria-expanded={chatMenuOpen ? 'true' : 'false'}
                        aria-label={t('chat_guide.more_actions', 'More chat options')}
                        onClick={() => setChatMenuOpen(v => !v)}
                        className="hover:bg-white/20 p-1 rounded transition-colors mr-1"
                        title={t('chat_guide.more_actions', 'More chat options')}
                    >
                        <ChevronDown size={18}/>
                    </button>
                    {chatMenuOpen && (
                        <div role="menu" className="absolute right-0 z-50 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-1 text-slate-800 shadow-xl">
                            <button role="menuitemcheckbox" aria-checked={isShowMeMode ? 'true' : 'false'} type="button"
                                onClick={() => { handleToggleIsShowMeMode(); setChatMenuOpen(false); }}
                                className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100">
                                <Eye size={14} className="mt-0.5 shrink-0"/>
                                <span>
                                    <span className="font-bold">{t('chat_guide.show_me', 'Point things out on screen')}</span>
                                    <span className="block text-[11px] text-slate-500">{isShowMeMode ? t('common.on', 'On') : t('common.off', 'Off')} — {t('chat_guide.show_me_desc', 'Asking “where is…” always points, with or without this.')}</span>
                                </span>
                            </button>
                            <button role="menuitem" type="button"
                                onClick={() => { saveFullChat(); setChatMenuOpen(false); }}
                                className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100">
                                <Save size={14} className="mt-0.5 shrink-0"/>
                                <span className="font-bold">{t('chat_guide.save_chat', 'Save this chat')}</span>
                            </button>
                        </div>
                    )}
                </div>
                <button
                    aria-label={t('common.minimize')}
                    data-help-key="chat_expand"
                    onClick={handleToggleIsUDLGuideExpanded}
                    className="hover:bg-white/20 p-1 rounded transition-colors"
                    title={isUDLGuideExpanded ? t('common.minimize') : t('common.maximize')}
                >
                    {isUDLGuideExpanded ? <Minimize size={18}/> : <Maximize size={18}/>}
                </button>
                <button
                    type="button"
                    data-help-key="chat_collapse"
                    onClick={() => setIsCollapsed(true)}
                    className="hover:bg-white/20 p-1 rounded transition-colors"
                    title={t('chat_guide.collapse') || 'Collapse to a bar (keeps the conversation)'}
                    aria-label={t('chat_guide.collapse') || 'Collapse to a bar (keeps the conversation)'}
                >
                    <ChevronDown size={18}/>
                </button>
                <button data-help-key="chat_close" onClick={closeGuide} className="hover:bg-white/20 p-1 rounded" aria-label={t('common.close')}><X size={18}/></button>
          </div>
        </div>
        <div className={`flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar ${chatStyles.body}`} ref={udlScrollRef}>
          {udlMessages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {!msg.type && (
                <div className={`max-w-[85%] p-3 rounded-xl text-sm shadow-sm ${msg.role === 'user' ? `${chatStyles.userBubble} rounded-br-none` : `${chatStyles.modelBubble} rounded-bl-none`}`}>
                   {renderFormattedText(msg.text)}
                </div>
              )}
              {msg.type === 'blueprint' && activeBlueprint && (
                  <div className="w-full">
                      <InteractiveBlueprintCard
                          config={activeBlueprint}
                          run={blueprintExecutionResult}
                          isRunning={!!isExecutingBlueprint}
                          onStopRun={handleStopBlueprintRun}
                          onRebuildStep={handleRebuildBlueprintStep}
                          onOpenErrorLog={handleOpenGenerationErrorLog}
                          onCopyDiagnostics={handleCopyBlueprintDiagnostics}
                          onDownloadDiagnostics={handleDownloadBlueprintDiagnostics}
                          summarizeFailureReason={getSafeGenerationFailureReason}
                          onSaveTemplate={handleSaveLessonTemplate}
                          onPreviewStep={handlePreviewBlueprintStep}
                          onUpdate={handleBlueprintUIUpdate}
                          onConfirm={handleExecuteBlueprint}
                          onCancel={() => {
                              // isExecutingBlueprint had NO reader anywhere in the app
                              // until this line, so Cancel stayed live mid-run: it nulled
                              // the plan while the executor was still emitting steps.
                              if (isExecutingBlueprint) { addToast(t('blueprint.cancel_while_running') || 'This plan is still generating. Wait for it to finish.', 'info'); return; }
                              // Cancel discards the PLAN, not its history: if it ever ran,
                              // it is filed to the archive first (guarded for stale hosts).
                              if (typeof archiveLivePlan === 'function') archiveLivePlan();
                              setUdlMessages(prev => [...prev, { role: 'model', text: t('blueprint.cancel_msg') }]);
                              setActiveBlueprint(null);
                              // Clear the record too: a run persisted without its plan
                              // rehydrates as an orphan board with nothing to describe.
                              if (typeof setBlueprintExecutionResult === 'function') setBlueprintExecutionResult(null);
                          }}
                      />
                  </div>
              )}
              {msg.type === 'choices' && (
                  <div className={`max-w-[92%] p-3 rounded-xl text-sm shadow-sm ${chatStyles.modelBubble} rounded-bl-none`}>
                      {renderFormattedText(msg.text)}
                      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label={t('chat_guide.header')}>
                          {(msg.choices || []).map((choice, cIdx) => (
                              <button
                                  key={cIdx}
                                  type="button"
                                  disabled={isChatProcessing || idx !== udlMessages.length - 1}
                                  title={choice.hint || undefined}
                                  aria-label={choice.hint ? `${choice.label} — ${choice.hint}` : undefined}
                                  onClick={() => {
                                      // Answers that are a free value (a count, a
                                      // language, a student interest) can't be a fixed
                                      // pill — this one parks the cursor in the box
                                      // instead of sending a placeholder word.
                                      if (choice.action === 'focus-input') {
                                          setUdlInput('');
                                          if (udlInputRef && udlInputRef.current) udlInputRef.current.focus();
                                          return;
                                      }
                                      handleSendUDLMessage(choice.value);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${choice.tone === 'secondary' ? chatStyles.secondaryButton : chatStyles.button}`}
                              >
                                  {choice.label}
                              </button>
                          ))}
                      </div>
                      {idx === udlMessages.length - 1 && (
                          <p className={`mt-2 text-[11px] italic ${chatStyles.subText}`}>
                              {t('chat_guide.chips.or_type') || '…or just type your answer below.'}
                          </p>
                      )}
                  </div>
              )}
              {!msg.type && msg.role === 'model' && msg.isActionable && idx > 0 && (
                <button
                    aria-label={t('common.refresh')}
                  data-help-key="chat_save_advice_btn" onClick={() => saveUDLAdvice(msg.text, udlMessages[idx-1]?.role === 'user' ? udlMessages[idx-1].text : 'Teacher Inquiry')}
                  disabled={isSavingAdvice}
                  className={`mt-1 text-[11px] flex items-center gap-1 font-medium px-2 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${chatStyles.secondaryButton}`}
                >
                  {isSavingAdvice ? <RefreshCw size={10} className="animate-spin" /> : <Save size={10} />}
                  {isSavingAdvice ? t('chat_guide.save_actionable_loading') : t('chat_guide.save_actionable_btn')}
                </button>
              )}
            </div>
          ))}
          {/* Start from a saved template. Shown ONLY when no plan is active:
              templates are starting points, not a competing surface, and
              offering them beside a live plan would invite the teacher to
              throw away work they are in the middle of. */}
          {!activeBlueprint && Array.isArray(lessonTemplates) && lessonTemplates.length > 0 && (
            <div className="w-full" data-testid="bp-template-picker">
              <p className={`text-[11px] mb-1 ${chatStyles.subText}`}>
                {t('blueprint.template_picker_title') || 'Start from one of your templates:'}
              </p>
              <ul className="space-y-1">
                {lessonTemplates.slice(0, 8).map((tpl) => (
                  <li key={tpl.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="bp-template-apply"
                      data-help-key="blueprint_template_apply_btn"
                      onClick={() => handleApplyLessonTemplate(tpl.id)}
                      className={`flex-grow text-left text-xs px-2 py-1.5 rounded border transition-colors ${chatStyles.secondaryButton}`}
                    >
                      <span className="font-bold">{tpl.name}</span>
                      {/* Rendered "1 steps". Separate singular key rather than a
                          suffix rule: many languages do not pluralise by adding a
                          letter, so a hand-rolled `+ 's'` would be wrong in most
                          of the 63 packs. Both keys fall back to English. */}
                      <span className="opacity-70 ml-2">
                        {(() => {
                          const _n = Array.isArray(tpl.resourcePlan) ? tpl.resourcePlan.length : 0;
                          const _word = _n === 1
                            ? (t('blueprint.template_step_count_one') || 'step')
                            : (t('blueprint.template_step_count') || 'steps');
                          return _n + ' ' + _word;
                        })()}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-testid="bp-template-delete"
                      onClick={() => handleDeleteLessonTemplate(tpl.id)}
                      aria-label={`${t('blueprint.template_delete') || 'Delete template'}: ${tpl.name}`}
                      title={t('blueprint.template_delete') || 'Delete template'}
                      className="text-xs px-2 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Previous plans — the archive. Restoring brings back the plan AND
              its run record: status badges, audit coverage, rebuild targets.
              Stateless ON PURPOSE: this sits below the component's early
              return, where a hook would be a conditional-hook crash (this
              file warns about that class twice). Real <button>s, so the rows
              are keyboard-operable, not announce-only. */}
          {!activeBlueprint && Array.isArray(archivedPlans) && archivedPlans.length > 0 && (
            <div className="w-full" data-testid="bp-archive-picker">
              <p className={`text-[11px] mb-1 ${chatStyles.subText}`}>
                {t('blueprint.archive_title') || 'Previous plans:'}
              </p>
              <ul className="space-y-1">
                {archivedPlans.slice(0, 8).map((rec) => (
                  <li key={rec.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="bp-archive-restore"
                      data-help-key="blueprint_archive_restore_btn"
                      onClick={() => handleRestoreArchivedPlan(rec.id)}
                      className={`flex-grow text-left text-xs px-2 py-1.5 rounded border transition-colors ${chatStyles.secondaryButton}`}
                    >
                      <span className="font-bold">{rec.name}</span>
                      <span className="opacity-70 ml-2">
                        {rec.stats ? `${rec.stats.landed}/${rec.stats.total} ${t('blueprint.archive_landed') || 'landed'}` : ''}
                        {rec.savedAt ? ` · ${String(rec.savedAt).slice(0, 10)}` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-testid="bp-archive-delete"
                      data-help-key="blueprint_archive_delete_btn"
                      onClick={() => handleDeleteArchivedPlan(rec.id)}
                      aria-label={`${t('blueprint.archive_delete') || 'Delete archived plan'}: ${rec.name}`}
                      title={t('blueprint.archive_delete') || 'Delete archived plan'}
                      className="text-xs px-2 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Restored-plan mount (Stage 4). The card normally renders from a
              `type:'blueprint'` chat message — but udlMessages is ephemeral
              useState in no save path, so after a reload a perfectly persisted
              plan would have nowhere to appear. Mount it from STATE whenever a
              plan exists and no blueprint message is carrying it. */}
          {activeBlueprint && !(udlMessages || []).some(m => m && m.type === 'blueprint') && (
            <div className="w-full">
              <p className={`text-[11px] mb-1 ${chatStyles.subText}`}>
                {t('blueprint.restored_notice') || 'Your saved lesson plan:'}
              </p>
              <InteractiveBlueprintCard
                  config={activeBlueprint}
                  run={blueprintExecutionResult}
                  isRunning={!!isExecutingBlueprint}
                  onStopRun={handleStopBlueprintRun}
                  onRebuildStep={handleRebuildBlueprintStep}
                  onOpenErrorLog={handleOpenGenerationErrorLog}
                  onCopyDiagnostics={handleCopyBlueprintDiagnostics}
                  onDownloadDiagnostics={handleDownloadBlueprintDiagnostics}
                  summarizeFailureReason={getSafeGenerationFailureReason}
                  onSaveTemplate={handleSaveLessonTemplate}
                  onPreviewStep={handlePreviewBlueprintStep}
                  onUpdate={handleBlueprintUIUpdate}
                  onConfirm={handleExecuteBlueprint}
                  onCancel={() => {
                      if (isExecutingBlueprint) { addToast(t('blueprint.cancel_while_running') || 'This plan is still generating. Wait for it to finish.', 'info'); return; }
                      if (typeof archiveLivePlan === 'function') archiveLivePlan();
                      setActiveBlueprint(null);
                      if (typeof setBlueprintExecutionResult === 'function') setBlueprintExecutionResult(null);
                  }}
              />
            </div>
          )}
          {isChatProcessing && (
            <div className="flex items-start">
               <div className={`p-3 rounded-xl rounded-bl-none flex items-center gap-2 text-sm ${chatStyles.modelBubble}`}>
                  <RefreshCw size={14} className="animate-spin" /> {t('bot.mood_thinking')}
               </div>
            </div>
          )}
        </div>
        {/* Stage 6 preview overlay. Scoped INSIDE the panel (absolute, not
            fixed) so it covers the transcript without becoming a page-level
            modal — activeView and generatedContent are never touched, so it
            cannot hijack the main view. */}
        {blueprintPreview && (
          <div
            className={`absolute inset-0 z-20 flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
            role="dialog"
            aria-modal="true"
            aria-label={t('blueprint.preview_step') || 'Preview this resource'}
            data-testid="bp-preview-overlay"
          >
            <div className={`p-3 flex items-center justify-between shrink-0 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`text-sm font-bold ${chatStyles.text}`}>
                {blueprintPreview.itemTitle || blueprintPreview.title}
              </span>
              <button
                type="button"
                data-testid="bp-preview-close"
                onClick={closeBlueprintPreview}
                aria-label={t('common.close')}
                className="hover:bg-slate-500/20 p-1 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {blueprintPreview.missing ? (
                <p className={`text-sm ${chatStyles.subText}`} data-testid="bp-preview-missing">
                  {t('blueprint.preview_missing') || 'That resource is no longer in this workspace. Rebuild the step to make it again.'}
                </p>
              ) : blueprintPreview.unsupported ? (
                // generateResourceHTML has no branch for some types and returns
                // '' — say so rather than showing an empty white box.
                <p className={`text-sm ${chatStyles.subText}`} data-testid="bp-preview-unsupported">
                  {t('blueprint.preview_unsupported') || 'This resource type opens in its own view rather than a preview.'}
                </p>
              ) : (
                <div
                  className="allo-preview-body text-sm"
                  data-testid="bp-preview-body"
                  dangerouslySetInnerHTML={{ __html: blueprintPreview.html }}
                />
              )}
            </div>
          </div>
        )}
        <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} ${chatStyles.inputArea}`}>
          <button
              type="button"
              onClick={toggleStandardTools}
              aria-expanded={standardToolsOpen}
              aria-controls="udl-standard-tools"
              data-help-key="chat_standard_tools_toggle"
              className={`w-full mb-2 flex items-center gap-1.5 px-1 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${chatStyles.subText} hover:opacity-100 opacity-80`}
          >
              {standardToolsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <ShieldCheck size={11} />
              {t('standards.tools_disclosure') || 'Standards tools'}
              {!standardToolsOpen && (
                  <span className="font-normal normal-case ml-auto opacity-80">
                      {t('standards.tools_disclosure_hint') || 'find / consult'}
                  </span>
              )}
          </button>
          <div id="udl-standard-tools" hidden={!standardToolsOpen}>
          <div className={`mb-3 p-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : theme === 'contrast' ? 'bg-black border-white' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                  <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${chatStyles.subText}`}>
                      <Search size={10} /> {t('standards.finder_header')}
                  </label>
              </div>
              <div className="flex gap-2 mb-2">
                  <input aria-label={t('common.standards_region_framework_placeholder')}
                      type="text"
                      value={aiStandardRegion}
                      onChange={(e) => setAiStandardRegion(e.target.value)}
                      data-help-key="standards_region_input" placeholder={t('standards.region_framework_placeholder')}
                      className={`w-1/3 text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 ${chatStyles.input}`}
                  />
                  <input aria-label={t('common.text_field')}
                      type="text"
                      value={aiStandardQuery}
                      onChange={(e) => setAiStandardQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFindStandards()}
                      placeholder={isIndependentMode ? t('wizard.independent_learning_goal') : t('wizard.skill_search_placeholder')}
                      className={`flex-grow text-xs rounded p-1.5 focus:ring-1 outline-none ${chatStyles.input}`}
                  />
                  <button
                      onClick={handleFindStandards}
                      disabled={isFindingStandards || !aiStandardQuery.trim()}
                      className={`p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm ${chatStyles.button}`}
                      title={t('standards.search_button_title')}
                      aria-label={t('standards.search_button_title')}
                  >
                      {isFindingStandards ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
                  </button>
              </div>
              {suggestedStandards.length > 0 && (
                  <div className={`max-h-32 overflow-y-auto custom-scrollbar border rounded divide-y ${theme === 'dark' ? 'bg-slate-900 border-slate-700 divide-slate-700' : theme === 'contrast' ? 'bg-black border-white divide-white' : 'bg-white border-slate-200 divide-slate-100'}`}>
                      {suggestedStandards.map((std, idx) => (
                          <button
                              key={idx}
                              onClick={() => {
                                  setStandardsInput(`${std.code}: ${std.description}`);
                                  addToast(t('toasts.applied_standard', {code: std.code}), "success");
                              }}
                              className={`w-full text-left p-2 transition-colors group flex flex-col gap-1 ${theme === 'dark' ? 'hover:bg-indigo-900/50' : theme === 'contrast' ? 'hover:bg-yellow-900' : 'hover:bg-green-50'}`}
                          >
                              <div className="flex justify-between items-start gap-1">
                                  <span className={`text-[11px] font-bold px-1 rounded border ${theme === 'dark' ? 'bg-indigo-900 text-indigo-200 border-indigo-700' : theme === 'contrast' ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{std.code}</span>
                                  <span className={`text-[11px] uppercase ml-auto ${chatStyles.subText}`}>{std.framework}</span>
                              </div>
                              <p className={`text-[11px] leading-snug line-clamp-2 ${chatStyles.text}`}>
                                  {std.description}
                              </p>
                          </button>
                      ))}
                  </div>
              )}
          </div>
          <div className={`mb-3 p-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : theme === 'contrast' ? 'bg-black border-white' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${chatStyles.subText}`}>
                      <ShieldCheck size={10} /> {t('standards.consult_header')}
                  </label>
              </div>
              <div className="flex gap-2">
                  <select
                      data-help-key="chat_framework_select"
                      value={udlStandardFramework}
                      onChange={(e) => setUdlStandardFramework(e.target.value)}
                      className={`flex-1 text-xs rounded p-1.5 focus:ring-1 outline-none ${chatStyles.input}`}
                      aria-label={t('standards.consult_header')}
                  >
                      <option value="Common Core ELA">{t('standards.frameworks.ccss_ela')}</option>
                      <option value="Common Core Math">{t('standards.frameworks.ccss_math')}</option>
                      <option value="Next Generation Science Standards (NGSS)">{t('standards.frameworks.ngss')}</option>
                      <option value="C3 Framework (Social Studies)">{t('standards.frameworks.c3')}</option>
                      <option value="ISTE Standards">{t('standards.frameworks.iste')}</option>
                      <option value="CASEL Competencies">{t('standards.frameworks.casel')}</option>
                      <option value="Texas Essential Knowledge and Skills (TEKS)">{t('standards.frameworks.teks')}</option>
                  </select>
                  <select aria-label={t('common.selection')}
                      data-help-key="chat_grade_select"
                      value={udlStandardGrade}
                      onChange={(e) => setUdlStandardGrade(e.target.value)}
                      className={`w-28 text-xs rounded p-1.5 focus:ring-1 outline-none ${chatStyles.input}`}
                  >
                      <option value="Kindergarten">{t('standards.grades.k')}</option>
                      <option value="1st Grade">{t('standards.grades.1')}</option>
                      <option value="2nd Grade">{t('standards.grades.2')}</option>
                      <option value="3rd Grade">{t('standards.grades.3')}</option>
                      <option value="4th Grade">{t('standards.grades.4')}</option>
                      <option value="5th Grade">{t('standards.grades.5')}</option>
                      <option value="6th Grade">{t('standards.grades.6')}</option>
                      <option value="7th Grade">{t('standards.grades.7')}</option>
                      <option value="8th Grade">{t('standards.grades.8')}</option>
                      <option value="9th Grade">{t('standards.grades.9')}</option>
                      <option value="10th Grade">{t('standards.grades.10')}</option>
                      <option value="11th Grade">{t('standards.grades.11')}</option>
                      <option value="12th Grade">{t('standards.grades.12')}</option>
                  </select>
                  <button
                      aria-label={t('common.continue')}
                      data-help-key="chat_consult_btn"
                      onClick={() => handleSendUDLMessage(t('standards.prompts.identify_key_standards', { framework: udlStandardFramework, grade: udlStandardGrade }))}
                      className={`p-1.5 rounded transition-colors border ${theme === 'dark' ? 'bg-indigo-900 border-indigo-700 text-indigo-300 hover:bg-indigo-800' : theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-900' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200'}`}
                      title={t('standards.consult_btn_title')}
                  >
                      <ArrowRight size={14} />
                  </button>
              </div>
          </div>
          </div>
          <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg transition-all duration-500 select-none ${
             !isAutoFillMode && !hasUsedAutoFill
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 shadow-sm animate-pulse'
                : `border border-transparent px-1 ${chatStyles.subText}`
          }`}>
             <input aria-label={t('common.toggle_is_auto_fill_mode')}
                type="checkbox"
                checked={isAutoFillMode}
                onChange={handleAutoFillToggle}
                className={`rounded h-3.5 w-3.5 cursor-pointer ${theme === 'contrast' ? 'bg-black border-yellow-400 checked:bg-yellow-400' : 'border-slate-300 text-indigo-600 focus:ring-indigo-500'}`}
                id="udl-autofill-check"
                data-help-key="chat_autofill"
             />
             <label htmlFor="udl-autofill-check" className={`flex items-center gap-1 cursor-pointer text-xs ${!isAutoFillMode && !hasUsedAutoFill ? 'font-bold text-orange-900' : 'font-medium'}`}>
                <Sparkles size={12} className={theme === 'contrast' ? "text-yellow-400" : "text-yellow-500 fill-current"} />
                {t('chat_guide.autofill_label')}
                {!isAutoFillMode && !hasUsedAutoFill && <span className="text-[11px] text-orange-600 font-normal ml-1 hidden sm:inline">{t('common.recommended')}</span>}
             </label>
          </div>
          <div className="flex gap-2">
             <input aria-label={t('common.enter_udl_input')}
                ref={udlInputRef}
                type="text"
                value={udlInput}
                onChange={(e) => setUdlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendUDLMessage()}
                placeholder={isShowMeMode ? t('chat_guide.input_placeholder_showme') : t('chat_guide.input_placeholder_default')}
                className={`flex-grow text-sm p-2 border rounded-lg focus:ring-2 outline-none ${chatStyles.input}`}
                data-help-key="chat_input"
             />
             <button
                 aria-label={t('common.show')}
                onClick={() => handleSendUDLMessage()}
                disabled={!udlInput.trim() || isChatProcessing}
                className={`p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${chatStyles.button}`}
                data-help-key="chat_send"
             >
                {isShowMeMode ? <Eye size={18}/> : <Send size={18} />}
             </button>
          </div>
        </div>
      </div>
  );
}

// ── PlatformDiagnosticsSection ───────────────────────────────────────────
// Shared diagnostics for the Canvas and deployed AI settings modals. The
// probe belongs with AI/runtime troubleshooting, rather than the educator
// tool directory, because it tests browser capabilities that affect AI,
// files, storage, and pop-up workflows.
function PlatformDiagnosticsSection(props) {
  const { t } = props;
  const [platProbe, setPlatProbe] = React.useState(null);
  const [probeRunning, setProbeRunning] = React.useState(false);

  const runPlatformProbe = async () => {
    const rows = [];
    const add = (name, status, detail) => rows.push({ name, status, detail: String(detail || '') });
    setProbeRunning(true);
    try {
      try {
        let origin = 'unknown';
        try { origin = window.location.origin; } catch (_) {}
        let inFrame = 'unknown';
        try { inFrame = window.top === window ? 'no (top window)' : 'yes'; } catch (_) { inFrame = 'yes (cross-origin parent)'; }
        add('Context', 'info', 'origin: ' + origin + ' · in iframe: ' + inFrame + ' · secure: ' + (typeof isSecureContext !== 'undefined' ? isSecureContext : '?'));
      } catch (e) { add('Context', 'info', 'unreadable: ' + e.message); }

      // STEAM Lab plugin loading. Inside Canvas the console is unreachable, so a tool
      // stuck on its skeleton loader is otherwise undiagnosable: the host shows that
      // skeleton whenever a plugin has not registered AND its load state is neither
      // 'loaded' nor 'error', and the "never requested" case has no state and no
      // timeout, so it waits forever with nothing on screen to say why.
      try {
        const ensureFn = typeof window.__alloEnsureStemPluginLoaded === 'function';
        const stateFn = typeof window.__alloGetStemPluginState === 'function';
        add('STEM plugin loader', ensureFn && stateFn ? 'pass' : 'fail',
          ensureFn && stateFn
            ? 'loader hooks present'
            : 'missing hook(s) — ensure:' + ensureFn + ' getState:' + stateFn +
              '. Tools cannot be requested at all; every tool will sit on its loading skeleton.');

        const reg = window.StemLab && window.StemLab._registry;
        const registered = reg ? Object.keys(reg) : [];
        add('STEM tools registered', registered.length ? 'pass' : 'warn',
          registered.length
            ? registered.length + ' registered'
            : 'none registered yet — open a tool first, or the plugins are not executing');

        // Per-module load state. This is the row that separates the three causes:
        // absent = never requested, error = download blocked, loaded-but-unregistered
        // = the file ran without calling registerTool.
        const seen = window.__alloStemPluginStates || null;
        const names = seen ? Object.keys(seen) : [];
        if (stateFn && names.length) {
          const summary = names.map((mod) => {
            const st = seen[mod] || {};
            const short = String(mod).replace(/^.*stem_tool_/, '').replace(/\.js$/, '');
            const ms = st.finishedAt && st.startedAt ? ' ' + (st.finishedAt - st.startedAt) + 'ms' : '';
            return short + '=' + (st.status || '?') + (st.attempt > 1 ? ' (try ' + st.attempt + ')' : '') + ms +
              (st.error ? ' — ' + st.error : '');
          });
          const anyError = names.some((mod) => (seen[mod] || {}).status === 'error');
          add('STEM plugin states', anyError ? 'fail' : 'info', summary.join(' · '));
        } else {
          add('STEM plugin states', 'warn',
            'no plugin has been requested this session. If a tool is showing its loading skeleton right now, ' +
            'the request was never made — the fault is upstream of the download, not the network.');
        }
      } catch (e) { add('STEM plugin loader', 'info', 'unreadable: ' + e.message); }

      // The first uncaught error usually explains dead buttons AND stuck loaders at
      // once, because an exception thrown during render leaves handlers unattached.
      try {
        const first = window.__alloFirstError;
        add('First page error', first ? 'fail' : 'pass',
          first
            ? new Date(first.at).toLocaleTimeString() + ' — ' + first.msg +
              (first.src ? ' (' + first.src + (first.line ? ':' + first.line : '') + ')' : '')
            : 'no uncaught error captured this session');
      } catch (e) { add('First page error', 'info', 'unreadable: ' + e.message); }

      try {
        const w = window.open('', '_blank', 'width=80,height=60');
        if (w) { try { w.close(); } catch (_) {} add('Pop-up windows', 'pass', 'window.open works — compare view + Save-as-PDF can open'); }
        else add('Pop-up windows', 'fail', 'window.open returned null — the compare view and print flow cannot open here');
      } catch (e) { add('Pop-up windows', 'fail', 'window.open threw: ' + e.message); }

      try {
        new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
        add('WebAssembly', 'pass', 'compiles — Writing Check + OCR can run');
      } catch (e) { add('WebAssembly', 'fail', 'cannot compile: ' + e.message); }

      try {
        const prior = localStorage.getItem('allo_platform_probe_marker');
        localStorage.setItem('allo_platform_probe_marker', new Date().toISOString());
        if (localStorage.getItem('allo_platform_probe_marker')) {
          add('localStorage (this session)', 'pass', 'write + read OK');
          add('localStorage (across sessions)', prior ? 'pass' : 'warn', prior
            ? ('marker from a previous run found (' + prior.slice(0, 19) + ') — storage persisted')
            : 'no marker from a previous run — first probe here, or storage was wiped between sessions. Run again in a new session to confirm.');
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
                  tx.oncomplete = () => {
                    clearTimeout(to);
                    try { db.close(); } catch (_) {}
                    resolve({
                      status: 'pass',
                      detail: prior
                        ? ('works; marker from a previous run found (' + String(prior).slice(0, 19) + ') — persisted')
                        : 'works this session; no prior marker — first probe here, or wiped between sessions. Re-run in a new session to confirm.'
                    });
                  };
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
        const r = await fetch(u);
        const txt = await r.text();
        URL.revokeObjectURL(u);
        add('Blob URLs (same window)', txt === 'probe' ? 'pass' : 'warn', txt === 'probe' ? 'create + fetch back OK' : 'fetched but content mismatched');
      } catch (e) { add('Blob URLs (same window)', 'fail', e.message); }

      try {
        const u = URL.createObjectURL(new Blob(['AlloFlow probe OK'], { type: 'text/plain' }));
        const a = document.createElement('a');
        a.href = u;
        a.download = 'alloflow-platform-probe.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(u), 4000);
        add('File downloads', 'info', 'a tiny test file was triggered — if alloflow-platform-probe.txt appears in Downloads, downloads work end-to-end');
      } catch (e) { add('File downloads', 'fail', e.message); }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText('AlloFlow platform probe');
          add('Clipboard (API)', 'pass', 'writeText OK');
        } else add('Clipboard (API)', 'warn', 'navigator.clipboard unavailable');
      } catch (e) { add('Clipboard (API)', 'warn', 'writeText rejected: ' + String(e && e.message).slice(0, 120)); }

      try {
        const ta = document.createElement('textarea');
        ta.setAttribute('aria-label', 'Clipboard fallback text');
        ta.value = 'AlloFlow platform probe';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        add('Clipboard (fallback)', ok ? 'pass' : 'warn', ok ? 'execCommand copy works — copy buttons function even where the API is blocked' : 'execCommand returned false');
      } catch (e) { add('Clipboard (fallback)', 'fail', String(e && e.message).slice(0, 120)); }

      add('Dialogs (confirm/prompt)', 'info', 'typeof confirm = ' + (typeof window.confirm) + ' — use “Test dialog” for the real answer (a sandbox can define it but silently return false)');

      const cdns = [
        ['jsDelivr', 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/package.json'],
        ['unpkg', 'https://unpkg.com/pdf-lib@1.17.1/package.json'],
        ['cdnjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
        ['Google Fonts', 'https://fonts.googleapis.com/css2?family=Lexend&display=swap']
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
        if (r.ok) {
          await r.arrayBuffer();
          add('Writing-Check cache (10 MB WASM)', 'info', 'fetched in ' + (Date.now() - t0) + 'ms — under ~500ms means the HTTP cache held it; re-run in a fresh session to test cross-session caching');
        } else add('Writing-Check cache (10 MB WASM)', 'warn', 'HTTP ' + r.status);
      } catch (e) { add('Writing-Check cache (10 MB WASM)', 'warn', e.message); }
    } finally {
      setPlatProbe({ when: new Date().toLocaleString(), rows });
      setProbeRunning(false);
    }
  };

  const runDialogProbe = () => {
    let value = null;
    try { value = window.confirm(t('platform_diag.dialog_question') || 'Dialog test: click OK.'); }
    catch (e) { value = 'threw: ' + e.message; }
    setPlatProbe((previous) => ({
      when: (previous && previous.when) || new Date().toLocaleString(),
      rows: [
        ...((previous && previous.rows) || []).filter((row) => row.name !== 'Dialogs (live test)'),
        {
          name: 'Dialogs (live test)',
          status: value === true ? 'pass' : (value === false ? 'warn' : 'fail'),
          detail: value === true
            ? 'confirm() returned true after OK — dialogs work'
            : (value === false
              ? 'confirm() returned FALSE — either Cancel was clicked or the sandbox suppressed the dialog'
              : String(value))
        }
      ]
    }));
  };

  const probeReportText = () => !platProbe ? '' : (
    'AlloFlow Platform Check — ' + platProbe.when + '\n' +
    (typeof navigator !== 'undefined' ? navigator.userAgent : '') + '\n\n' +
    platProbe.rows.map((row) => '[' + row.status.toUpperCase() + '] ' + row.name + ' — ' + row.detail).join('\n')
  );

  const copyProbeReport = async () => {
    const text = probeReportText();
    try {
      if (typeof window.alloCopyText === 'function' && await window.alloCopyText(text)) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.setAttribute('aria-label', 'Clipboard fallback text');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (_) {}
  };

  return (
    <section id="ai-platform-diagnostics-section" data-help-key="ai_platform_diagnostics" className="pt-3 border-t-2 border-violet-50">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-violet-100 p-1.5 rounded-lg"><Cpu size={14} className="text-violet-600"/></div>
        <div>
          <h4 id="ai-platform-diagnostics-title" className="text-xs font-black text-slate-700 uppercase tracking-wider">{t('platform_diag.header') || 'Platform & Browser Diagnostics'}</h4>
          <p className="text-[11px] text-slate-600 mt-0.5">Check capabilities that affect AI, files, storage, and pop-up workflows.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={runPlatformProbe} disabled={probeRunning} className="bg-violet-600 text-white border-2 border-violet-600 px-3 py-2 rounded-xl font-bold text-xs hover:bg-violet-700 disabled:opacity-60">
          🔬 {probeRunning ? 'Running platform check…' : (t('platform_diag.run') || 'Run platform check')}
        </button>
        <button type="button" data-help-ignore="true" data-a11y-ignore="diagnostic-confirm" onClick={runDialogProbe} className="bg-white text-violet-700 border-2 border-violet-200 px-3 py-2 rounded-xl font-bold text-xs hover:bg-violet-50">
          🧪 {t('platform_diag.dialog') || 'Test dialog'}
        </button>
        {/* N5 (2026-08-16): the device-storage PROBE lives here now, with the other
            diagnostics, instead of behind a Settings button labelled "Manage local
            storage". It answers "does this browser keep what we write", which was
            answered long ago; it is not a manager and never showed saved work.
            Folding it in rather than deleting it keeps the one thing it is good for
            (Canvas storage-persistence bug reports) without a second door wearing
            the storage manager's label. Ctrl+Alt+Shift+D still opens it too. */}
        <button type="button" data-help-ignore="true" onClick={() => { if (typeof window.__alloOpenDeviceStorageProbe === 'function') window.__alloOpenDeviceStorageProbe(); }} className="bg-white text-violet-700 border-2 border-violet-200 px-3 py-2 rounded-xl font-bold text-xs hover:bg-violet-50">
          💾 {t('platform_diag.storage_probe') || 'Test device storage'}
        </button>
      </div>
      <p className="text-[10px] text-slate-500 mt-2">Use this when a feature behaves differently across environments. Copy the report and include it when asking for help.</p>
      <p className="text-[10px] text-slate-500 mt-1">{t('platform_diag.storage_probe_hint') || 'Test device storage only checks whether this browser can keep data. To see, restore, or erase your saved resource packs, use Local storage and downloads above.'}</p>
      {platProbe && (
        <>
          <div className="mt-3 bg-white border border-slate-300 rounded-lg p-2 text-[11px]" role="region" aria-labelledby="ai-platform-results-title">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span id="ai-platform-results-title" className="font-bold text-slate-700">{t('platform_diag.results') || 'Results'} — {platProbe.when}</span>
              <button type="button" onClick={copyProbeReport} aria-label={t('platform_diag.copy') || 'Copy report'} className="min-h-11 shrink-0 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold hover:bg-slate-200">
                📋 {t('platform_diag.copy') || 'Copy report'}
              </button>
            </div>
            <ul className="space-y-0.5">
              {platProbe.rows.map((row, index) => (
                <li key={index} className="flex gap-1.5">
                  <span className={'shrink-0 font-bold ' + (row.status === 'pass' ? 'text-green-700' : row.status === 'fail' ? 'text-red-700' : row.status === 'warn' ? 'text-amber-700' : 'text-slate-500')}>
                    {row.status === 'pass' ? '✓' : row.status === 'fail' ? '✗' : row.status === 'warn' ? '⚠' : 'ℹ'}
                  </span>
                  <span className="min-w-0"><span className="font-bold">{row.name}:</span> {row.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">Platform check complete. {platProbe.rows.length} results available.</div>
        </>
      )}
    </section>
  );
}
// ── ModelDiagnosticsSection ─────────────────────────────────────────────
// Shared sub-section for both the deploy AIBackendModal and the inline
// Canvas Advanced Settings modal. Three things:
//   1. Requested → Served ledger — reads `window.__alloGeminiModelUsage`,
//      populated by every successful Gemini call in gemini_api_source.jsx.
//      The "Served" column is data.modelVersion from Google's response,
//      which can differ from what the app asked for if Canvas / Google
//      routes an alias to a different backbone.
//   2. Available-models catalog — on demand, hits ListModels via the
//      window.listAvailableGeminiModels function exposed by the host on
//      _upgradeGeminiAPI. In Canvas, that catalog is Canvas's provisioned
//      set (often narrower / has preview names absent from public GA).
//   3. Current GEMINI_MODELS map + per-slot override dropdowns. Dropdown
//      options are POPULATED from #2 — so users can only ever pick a model
//      that's actually in their catalog (no fat-fingered 404s). Overrides
//      persist to localStorage.alloflow_ai_config.models and the app
//      applies them on next page load.
function ModelDiagnosticsSection(props) {
  const { t, _isCanvasEnv, GEMINI_MODELS } = props;
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogFetched, setCatalogFetched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const usage = (typeof window !== 'undefined' && window.__alloGeminiModelUsage) || {};
  const usageEntries = Object.values(usage).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  // ── Session usage meter (2026-06-12, maintainer ask) ──
  // Google exposes NO remaining-quota API to key-based callers (and Canvas's
  // injected key is even more opaque), so the honest meter is: (a) count the
  // app's OWN calls per served model this session, (b) treat an actual 429 as
  // the definitive signal and show it with the reset convention. No invented
  // cap numbers — limits vary by account/plan and would be fabrication risk.
  const _sessionTotals = (() => {
    const by = {};
    for (const e of usageEntries) { const m = e.served || e.requested || '(unknown)'; by[m] = (by[m] || 0) + (e.count || 0); }
    return Object.entries(by).sort((a, b) => b[1] - a[1]);
  })();
  const _sessionCallTotal = _sessionTotals.reduce((s, pair) => s + pair[1], 0);
  const _quotaHits = (typeof window !== 'undefined' && window.__alloGeminiQuotaHits) || [];

  // Slots that map to the GEMINI_MODELS map. Listed in the order users care
  // about most. 'safety' is a dedicated low-cost model used for content
  // moderation; we expose it because it's a real slot, but it's rarely worth
  // overriding so it sits at the end.
  const slots = ['default', 'fallback', 'flash', 'image', 'vision', 'tts', 'quality', 'safety'];

  const storedOverrides = (() => {
    try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').models || {}; }
    catch (_) { return {}; }
  })();

  const refreshCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const fn = (typeof window !== 'undefined') ? window.listAvailableGeminiModels : null;
      if (typeof fn !== 'function') {
        setCatalogError(t('model_diag.list_unavailable') || 'Model catalog API not yet loaded. Try again in a moment.');
        setCatalogLoading(false);
        return;
      }
      const result = await fn();
      if (result.error) {
        setCatalogError(result.error);
        setCatalog([]);
      } else {
        setCatalog(result.models || []);
        setCatalogError(null);
      }
      setCatalogFetched(true);
    } catch (e) {
      setCatalogError((e && e.message) || 'Unknown error');
      setCatalog([]);
    }
    setCatalogLoading(false);
  };

  const saveOverride = (slot, value) => {
    try {
      const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
      const models = { ...(current.models || {}) };
      if (value) models[slot] = value;
      else delete models[slot];
      const next = { ...current, models };
      // If no overrides remain, drop the whole `models` key so the stored
      // config stays tidy.
      if (Object.keys(models).length === 0) delete next.models;
      localStorage.setItem('alloflow_ai_config', JSON.stringify(next));
      setRefreshKey(k => k + 1);
    } catch (_) { /* localStorage may be disabled */ }
  };

  const clearAllOverrides = () => {
    try {
      const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
      delete current.models;
      localStorage.setItem('alloflow_ai_config', JSON.stringify(current));
      setRefreshKey(k => k + 1);
    } catch (_) {}
  };

  const formatRelativeTime = (ts) => {
    if (!ts) return '—';
    const now = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
    const ago = now - ts;
    if (ago < 60_000) return Math.max(1, Math.floor(ago / 1000)) + 's ago';
    if (ago < 3_600_000) return Math.floor(ago / 60_000) + 'm ago';
    return Math.floor(ago / 3_600_000) + 'h ago';
  };

  return (
    <div className="pt-3 border-t-2 border-violet-50">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-indigo-100 p-1.5 rounded-lg"><Cpu size={14} className="text-indigo-600"/></div>
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">{t('model_diag.header') || 'AI Model Diagnostics'}</h4>
      </div>

      {/* ── 0. Session usage meter + quota status ── */}
      <div className="mb-3 bg-violet-50/60 border border-violet-200 rounded-lg p-2.5">
        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">⛽ {t('model_diag.usage_header') || 'Your Gemini usage (this session)'}</p>
        {_sessionCallTotal === 0 ? (
          <p className="text-[11px] text-slate-600">{t('model_diag.usage_none') || 'No AI calls yet this session.'}</p>
        ) : (
          <p className="text-[11px] text-slate-700">
            <span className="font-bold">{_sessionCallTotal}</span> {t('model_diag.usage_calls') || 'AI call(s):'}{' '}
            {_sessionTotals.map((pair, i) => <span key={i} className="font-mono">{pair[0]} ×{pair[1]}{i < _sessionTotals.length - 1 ? ' · ' : ''}</span>)}
          </p>
        )}
        {_quotaHits.length > 0 ? (
          <p className="text-[11px] text-red-700 font-bold mt-1">🛑 {t('model_diag.quota_hit') || 'Quota limit (HTTP 429) hit this session'} — {new Date(_quotaHits[_quotaHits.length - 1].at).toLocaleTimeString()} ({_quotaHits[_quotaHits.length - 1].model}). {t('model_diag.quota_hit_advice') || 'If retries keep failing, the daily quota is spent — free-tier quotas reset around midnight Pacific.'}</p>
        ) : (
          <p className="text-[11px] text-green-700 mt-1">✓ {t('model_diag.quota_ok') || 'No quota errors this session.'}</p>
        )}
        <p className="text-[10px] text-slate-500 mt-1">{t('model_diag.usage_caveat') || 'Honest limits of this meter: Google does not let apps see your remaining balance, so this counts AlloFlow’s own calls and resets when the page reloads. A 429 error is the only definitive “quota reached” signal — when one happens, a red banner appears at the top of the app (dismissable) and it’s recorded here.'}</p>
      </div>

      {/* ── 1. Requested → Served ledger ── */}
      <div className="mb-3">
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('model_diag.served_header') || 'Models actually used this session'}</p>
        {usageEntries.length === 0 ? (
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <p className="text-[11px] text-slate-600 italic">{t('model_diag.no_calls_yet') || 'No AI calls completed yet this session. Run an audit, generate text, or use any AI feature to populate.'}</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-x-auto">
            <table className="text-[11px] w-full">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="text-left p-1.5 font-bold">{t('model_diag.col_requested') || 'Requested'}</th>
                  <th className="text-left p-1.5 font-bold">{t('model_diag.col_served') || 'Served by Google'}</th>
                  <th className="text-right p-1.5 font-bold">{t('model_diag.col_count') || 'Calls'}</th>
                  <th className="text-right p-1.5 font-bold">{t('model_diag.col_last') || 'Last'}</th>
                </tr>
              </thead>
              <tbody>
                {usageEntries.map((entry, i) => (
                  <tr key={i} className={entry.divergent ? 'bg-amber-50 border-t border-amber-200' : 'border-t border-slate-200'}>
                    <td className="p-1.5 font-mono text-slate-700">{entry.requested}</td>
                    <td className="p-1.5 font-mono text-slate-700">
                      {entry.served || <span className="italic text-slate-400">{t('model_diag.unreported') || '(unreported)'}</span>}
                      {entry.divergent && <span className="ml-1 text-amber-700 font-bold" title={t('model_diag.divergent_tooltip') || 'Google routed this request to a different model'}>⇄</span>}
                    </td>
                    <td className="p-1.5 text-right text-slate-700 font-bold">{entry.count}</td>
                    <td className="p-1.5 text-right text-slate-600">{formatRelativeTime(entry.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-slate-500 mt-1 italic">{t('model_diag.served_hint') || '⇄ marks a row where Google served a different model than the one requested (silent reroute by the API).'}</p>
      </div>

      {/* ── 2. Catalog ── */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('model_diag.catalog_header') || 'Available models for your API key'}</p>
          <button
            type="button"
            onClick={refreshCatalog}
            disabled={catalogLoading}
            className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded hover:bg-indigo-200 disabled:opacity-50 active:scale-95"
          >
            {catalogLoading ? (t('model_diag.loading') || '⏳ Loading...') : ((catalogFetched ? '↻ ' : '↓ ') + (t('model_diag.refresh') || 'Fetch catalog'))}
          </button>
        </div>
        {catalogError && (
          <div className="bg-red-50 p-2 rounded-lg border border-red-100 mb-2">
            <p className="text-[11px] text-red-700 font-medium">⚠ {catalogError}</p>
          </div>
        )}
        {catalog.length > 0 && (
          <div className="bg-slate-50 rounded-lg border border-slate-100 max-h-40 overflow-y-auto">
            <table className="text-[10px] w-full">
              <thead className="sticky top-0 bg-slate-100">
                <tr className="text-slate-700">
                  <th className="text-left p-1 font-bold">{t('model_diag.col_id') || 'Model'}</th>
                  <th className="text-left p-1 font-bold">{t('model_diag.col_display') || 'Name'}</th>
                  <th className="text-right p-1 font-bold" title={t('model_diag.col_in_tt') || 'Input token limit'}>{t('model_diag.col_in') || 'In tok'}</th>
                  <th className="text-right p-1 font-bold" title={t('model_diag.col_out_tt') || 'Output token limit'}>{t('model_diag.col_out') || 'Out tok'}</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((m, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="p-1 font-mono text-slate-700">{m.id}</td>
                    <td className="p-1 text-slate-700">{m.displayName}</td>
                    <td className="p-1 text-right text-slate-600">{m.inputTokenLimit ? m.inputTokenLimit.toLocaleString() : '—'}</td>
                    <td className="p-1 text-right text-slate-600">{m.outputTokenLimit ? m.outputTokenLimit.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!catalogFetched && !catalogError && (
          <p className="text-[10px] text-slate-500 italic">{t('model_diag.click_to_load') || 'Click "Fetch catalog" to query Google for the list of models your key can access.'}</p>
        )}
      </div>

      {/* ── 3. Current model map + per-slot overrides ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('model_diag.map_header') || 'Current model map (what the app requests)'}</p>
          {Object.keys(storedOverrides).length > 0 && (
            <button
              type="button"
              onClick={clearAllOverrides}
              className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 active:scale-95"
              title={t('model_diag.clear_all_tt') || 'Remove every per-slot override and revert to app defaults'}
            >
              {t('model_diag.clear_all') || '↩ Clear overrides'}
            </button>
          )}
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-100 p-2 space-y-1.5">
          {slots.map((slot) => {
            const current = (GEMINI_MODELS && GEMINI_MODELS[slot]) || '(not set)';
            const overridden = !!storedOverrides[slot];
            const inCatalog = (catalog.length === 0) || catalog.some(m => m.id === current);
            return (
              <div key={slot + ':' + refreshKey} className="flex items-center gap-1.5 text-[11px]">
                <span className="font-bold text-slate-700 uppercase tracking-wider w-14 shrink-0">{slot}</span>
                {catalog.length > 0 ? (
                  <select
                    defaultValue={storedOverrides[slot] || ''}
                    onChange={(e) => saveOverride(slot, e.target.value)}
                    className="flex-1 p-1 text-[11px] border border-slate-200 rounded bg-white font-mono text-slate-700"
                    aria-label={(t('model_diag.slot_aria') || 'Model override for slot') + ': ' + slot}
                  >
                    <option value="">{(t('model_diag.use_default_prefix') || 'Use app default') + ' (' + current + ')'}</option>
                    {catalog.map((m, i) => <option key={i} value={m.id}>{m.id}</option>)}
                  </select>
                ) : (
                  <span className="flex-1 font-mono text-slate-700">{current}</span>
                )}
                {overridden && !inCatalog && catalog.length > 0 && (
                  <span className="text-[10px] text-amber-700 font-bold whitespace-nowrap" title={t('model_diag.not_in_catalog_tt') || 'This override is not in your current model catalog — may 404 at request time'}>⚠ {t('model_diag.not_in_catalog') || 'not in catalog'}</span>
                )}
                {overridden && (inCatalog || catalog.length === 0) && (
                  <span className="text-[10px] text-indigo-700 font-bold" title={t('model_diag.overridden_tt') || 'You have overridden this slot'}>✎</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 italic">⚡ {t('model_diag.reload_hint') || 'Reload the page after changing a model override for it to take effect.'}</p>
        {_isCanvasEnv && (
          <p className="text-[10px] text-slate-500 mt-0.5 italic">{t('model_diag.canvas_hint') || 'In Gemini Canvas, available models are determined by Google and may be a narrower set than public GA.'}</p>
        )}
      </div>
    </div>
  );
}

// ── AIBackendModal (AI Backend Modal) — gate: showAIBackendModal && !_isCanvasEnv ──
// Outer gate stays hookless (the registered export and its early return are
// the long-standing contract); the body below mounts only while the modal is
// open, so hooks are legal there and hook order is stable for its lifetime.
function AIBackendModal(props) {
  if (!(props.showAIBackendModal && !props._isCanvasEnv)) return null;
  return <AIBackendModalBody {...props} />;
}
function AIBackendModalBody(props) {
  const {
    _isCanvasEnv, ai,
    setShowAIBackendModal, showAIBackendModal, t,
    GEMINI_MODELS
  } = props;
  const isStudentAiSetup = Boolean(typeof window !== 'undefined' && window.__alloStudentAiSetupAllowed && window.__alloQrStudentMode);
  const requestedSettingsSection = (() => {
    try { return String(window.__alloAISettingsRequestedSection || ''); }
    catch (_) { return ''; }
  })();
  // ── Guided setup state ("hand-hold unless they ask for advanced", 2026-08) ──
  // The guided default shows three choice cards and only the fields that
  // choice needs; the full legacy surface lives behind the Advanced
  // disclosure. Students always get the legacy (trimmed) layout — their flow
  // is already minimal and carries its own consent copy.
  const [guidedView, setGuidedView] = React.useState('choose');
  const [advancedOpen, setAdvancedOpen] = React.useState(isStudentAiSetup || requestedSettingsSection === 'gemini-audio');
  const [configRevision, setConfigRevision] = React.useState(0);
  const [guidedReady, setGuidedReady] = React.useState(false);
  const guidedHeadingRef = React.useRef(null);
  const prevGuidedViewRef = React.useRef('choose');
  React.useEffect(() => {
    // Focus the step heading only on real view TRANSITIONS — never on plain
    // re-renders (that pattern caused the remediation focus war, fixed
    // 2026-08-10; do not regress it).
    if (prevGuidedViewRef.current === guidedView) return;
    prevGuidedViewRef.current = guidedView;
    try { if (guidedHeadingRef.current) guidedHeadingRef.current.focus(); } catch (_) {}
  }, [guidedView]);
  const configStorage = isStudentAiSetup ? window.sessionStorage : window.localStorage;
  const configStorageKey = isStudentAiSetup ? 'alloflow_qr_student_ai_config' : 'alloflow_ai_config';
  const aiBackendDefaults = {
    gemini: '',
    'alloflow-local': 'http://localhost:32173',
    lmstudio: 'http://localhost:1234',
    localai: 'http://localhost:8080',
    ollama: 'http://localhost:11434',
    openai: 'https://api.openai.com',
    claude: 'https://api.anthropic.com',
    'onnx-npu': 'http://localhost:11435',
    custom: 'http://localhost:8080'
  };
  const readAIBackendConfig = () => {
    try { return JSON.parse(configStorage.getItem(configStorageKey) || '{}'); }
    catch { return {}; }
  };
  React.useEffect(() => {
    if (requestedSettingsSection !== 'gemini-audio') return undefined;
    const timer = setTimeout(() => {
      const cfg = readAIBackendConfig();
      const targetId = isStudentAiSetup && String(cfg.backend || 'gemini') !== 'gemini'
        ? 'ai-backend-provider'
        : (String(cfg.backend || 'gemini') === 'gemini'
          ? 'ai-backend-apikey'
          : 'ai-backend-gemini-services-key');
      const target = document.getElementById(targetId);
      try { if (target && target.focus) target.focus({ preventScroll: true }); } catch (_) {}
      try { if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center' }); } catch (_) {}
      try { delete window.__alloAISettingsRequestedSection; } catch (_) {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const fingerprintAIBackendConfig = (config) => {
    try {
      return typeof window.__alloStudentAiConfigFingerprint === 'function'
        ? window.__alloStudentAiConfigFingerprint(config)
        : '';
    } catch (_) {
      return '';
    }
  };
  const writeAIBackendConfig = (config, options = {}) => {
    try {
      const next = { ...(config || {}) };
      if (options.preserveValidation !== true) delete next.validation;
      configStorage.setItem(configStorageKey, JSON.stringify(next));
      if (isStudentAiSetup) window.dispatchEvent(new CustomEvent('alloflow:student-ai-config-changed'));
      // W7: capability-gated UI (STEM "AI extras" pill, disabled generate
      // surfaces) re-derives on this. Same-tab only; other tabs get 'storage'.
      try { window.dispatchEvent(new CustomEvent('alloflow:ai-config-changed')); } catch (_) {}
    }
    catch (_) {}
  };
  const clearAIBackendConfig = () => {
    try {
      if (isStudentAiSetup && typeof window.__alloDisconnectStudentAi === 'function') {
        window.__alloDisconnectStudentAi();
      } else {
        configStorage.removeItem(configStorageKey);
        if (isStudentAiSetup) window.dispatchEvent(new CustomEvent('alloflow:student-ai-config-changed'));
      }
    } catch (_) {}
  };
  const populateModelSelect = (select, emptyLabel, models, selectedValue = '') => {
    if (!select) return;
    select.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = emptyLabel;
    select.appendChild(emptyOption);
    (models || []).forEach((model) => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.id;
      select.appendChild(option);
    });
    select.value = selectedValue || '';
  };
  // ─── Built-in Engine strip (desktop) ───────────────────────────────────
  // This modal is hookless by design (early return above), so the strip uses
  // the file's DOM idiom. On desktop the app is served BY the runtime, so the
  // engine API is same-origin; elsewhere the strip explains where to get it.
  const stopEngineStripPoll = () => {
    if (window.__alloEngineStripPoll) { clearInterval(window.__alloEngineStripPoll); window.__alloEngineStripPoll = null; }
  };
  const startEngineStripPoll = () => {
    if (window.__alloEngineStripPoll) return;
    window.__alloEngineStripPoll = setInterval(() => {
      if (!document.getElementById('ai-backend-engine-strip')) { stopEngineStripPoll(); return; }
      refreshEngineStrip();
    }, 2000);
  };
  // ── SD-Turbo strip (2026-07-06): proactive, honest control for local image
  // generation. Before this, SD-Turbo was invisible — only a reactive offer
  // modal after a failed keyless image attempt, gated on navigator.gpu (which
  // EXISTS even when requestAdapter() is null, e.g. Electron without the
  // enable switch). Same hookless DOM idiom as the engine strip: the modal
  // early-returns before hooks, so no useState/useEffect allowed here. ──
  const refreshSdTurboStrip = async () => {
    const strip = document.getElementById('ai-backend-sdturbo-strip');
    if (!strip) return;
    let text = strip.querySelector('[data-sd-strip-text]');
    let btn = strip.querySelector('[data-sd-strip-btn]');
    if (!text) {
      text = document.createElement('span');
      text.setAttribute('data-sd-strip-text', '1');
      strip.appendChild(text);
      btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-sd-strip-btn', '1');
      btn.className = 'ml-2 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700';
      btn.hidden = true;
      strip.appendChild(btn);
    }
    const TITLE = (t('ai_backend.sd_title') || 'Local images (SD-Turbo)') + ': ';
    const setLine = (line, cls) => {
      const full = TITLE + line;
      if (text.textContent !== full) text.textContent = full;
      if (strip.className !== cls) strip.className = cls;
    };
    const SD_SLATE = 'text-xs font-bold mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200';
    const SD_GREEN = 'text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100';
    const SD_AMBER = 'text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100';
    strip.style.display = '';
    if (window._sdTurbo?.ready) {
      setLine(t('ai_backend.sd_ready') || 'Ready. Images generate on this computer when cloud image AI is unavailable.', SD_GREEN);
      btn.hidden = true;
      return;
    }
    let adapterOk = false;
    try {
      adapterOk = window.__alloWebGpuAdapterCheck
        ? await window.__alloWebGpuAdapterCheck()
        : !!(typeof navigator !== 'undefined' && navigator.gpu && await navigator.gpu.requestAdapter());
    } catch (_) { adapterOk = false; }
    if (!adapterOk) {
      setLine(t('ai_backend.sd_no_gpu') || 'Not available on this computer (no WebGPU graphics adapter). Cloud image AI needs Gemini Canvas or a billing-enabled key; the free API tier does not generate images.', SD_SLATE);
      btn.hidden = true;
      return;
    }
    const DOWNLOADING = t('ai_backend.sd_downloading') || 'Downloading the model... about 2GB, one time only.';
    if (window.__sdTurboDownloading) { setLine(DOWNLOADING, SD_AMBER); btn.hidden = true; return; }
    setLine(t('ai_backend.sd_available') || 'Available. Downloads a ~2GB model once, then images generate on this computer at no cost.', SD_SLATE);
    btn.textContent = t('ai_backend.sd_download_btn') || 'Download & enable';
    btn.hidden = false;
    btn.disabled = false;
    btn.onclick = async () => {
      btn.disabled = true;
      btn.hidden = true;
      window.__sdTurboDownloading = true;
      setLine(DOWNLOADING + ' 0%', SD_AMBER);
      try {
        const ok = await (window.__loadSdTurbo ? window.__loadSdTurbo((p) => {
          const pct = p && p.pct != null ? Math.round(p.pct * 100) + '%' : '';
          setLine(DOWNLOADING + ' ' + pct, SD_AMBER);
        }) : Promise.resolve(false));
        window.__sdTurboDownloading = false;
        if (ok) {
          setLine(t('ai_backend.sd_ready') || 'Ready. Images generate on this computer when cloud image AI is unavailable.', SD_GREEN);
        } else {
          setLine(t('ai_backend.sd_failed') || 'Download failed. Check the connection and try again.', SD_AMBER);
          btn.hidden = false;
          btn.disabled = false;
        }
      } catch (e) {
        window.__sdTurboDownloading = false;
        setLine((t('ai_backend.sd_failed') || 'Download failed. Check the connection and try again.') + (e && e.message ? ' (' + e.message + ')' : ''), SD_AMBER);
        btn.hidden = false;
        btn.disabled = false;
      }
    };
  };
  const refreshEngineStrip = async () => {
    const strip = document.getElementById('ai-backend-engine-strip');
    if (!strip) return;
    let backend = readAIBackendConfig().backend || 'gemini';
    const providerSelect = document.getElementById('ai-backend-provider');
    if (providerSelect && providerSelect.value) backend = providerSelect.value;
    if (backend !== 'alloflow-local') { strip.style.display = 'none'; stopEngineStripPoll(); return; }
    strip.style.display = '';
    // Persistent children: this is an aria-live region, so we only touch
    // textContent when the message actually changes — and the Start button is
    // created ONCE (rebuilding it every poll destroyed the element mid-click
    // and re-announced unchanged status to screen readers every 2 seconds).
    let stripText = strip.querySelector('[data-engine-strip-text]');
    let startBtn = strip.querySelector('[data-engine-strip-start]');
    if (!stripText) {
      stripText = document.createElement('span');
      stripText.setAttribute('data-engine-strip-text', '1');
      strip.appendChild(stripText);
      startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.setAttribute('data-engine-strip-start', '1');
      startBtn.textContent = t('ai_backend.engine_start_btn') || 'Start engine';
      startBtn.className = 'ml-2 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700';
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        // /api/engine/start persists localEngine.enabled=true itself — the
        // endpoint is the single writer of the autostart choice.
        try { await fetch('/api/engine/start', { method: 'POST' }); } catch (_) {}
        startEngineStripPoll();
      };
      strip.appendChild(startBtn);
    }
    const setLine = (line, cls) => {
      if (stripText.textContent !== line) stripText.textContent = line;
      if (strip.className !== cls) strip.className = cls;
    };
    const AMBER = 'text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100';
    if (!(typeof window !== 'undefined' && window._isDesktopBundledApp)) {
      setLine(t('ai_backend.engine_desktop_only') || 'The Built-in Engine runs inside AlloFlow Desktop. Install the desktop app to use local AI on this computer — no account or key needed.',
        'text-xs font-bold mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200');
      startBtn.hidden = true;
      stopEngineStripPoll();
      return;
    }
    try {
      const engineStatus = await fetch('/api/engine/status').then((response) => response.json());
      if (engineStatus.running) {
        // Tell the truth about CONNECTION, not just process state: the bridge
        // stamps window.__alloActiveAIBackend when this app's callGemini is
        // actually routed to the local engine. Before this, the strip said
        // "Reload the app to start using it" forever — even when the app WAS
        // using it — which read as a failure during field testing.
        const _bridgeActive = typeof window !== 'undefined' && window.__alloActiveAIBackend && window.__alloActiveAIBackend.backend === 'alloflow-local';
        const _tail = _bridgeActive
          ? (t('ai_backend.engine_connected') || 'Connected — this app is using it right now.')
          : (t('ai_backend.engine_reload_note') || 'Reload the app to start using it.');
        setLine('✓ ' + (t('ai_backend.engine_running') || 'Engine running') + (engineStatus.model && engineStatus.model.name ? ' — ' + engineStatus.model.name : '') + '. ' + _tail,
          'text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100');
        startBtn.hidden = true;
        stopEngineStripPoll();
        return;
      }
      let line = t('ai_backend.engine_stopped') || 'Engine is not running.';
      const busy = Boolean(engineStatus.download && engineStatus.download.totalBytes) || engineStatus.phase === 'starting' || engineStatus.phase === 'downloading-binary' || engineStatus.phase === 'downloading-model';
      if (engineStatus.download && engineStatus.download.totalBytes) {
        line = (t('ai_backend.engine_downloading') || 'Downloading') + ' ' + engineStatus.download.file + ' — ' + Math.round((engineStatus.download.receivedBytes / engineStatus.download.totalBytes) * 100) + '%';
      } else if (engineStatus.phase === 'starting') {
        line = t('ai_backend.engine_starting') || 'Starting the engine…';
      } else if (engineStatus.lastError) {
        line = engineStatus.lastError;
      }
      if (engineStatus.model && !engineStatus.model.present && !busy) {
        line += ' ' + (t('ai_backend.engine_first_run') || '(first start downloads the AI model — about 2 GB, one time)');
      }
      setLine(line, AMBER);
      startBtn.hidden = busy;
      if (!busy) startBtn.disabled = false;
      if (busy) startEngineStripPoll(); else stopEngineStripPoll();
    } catch (_) {
      setLine(t('ai_backend.engine_unreachable') || 'Could not reach the desktop runtime from this page.', AMBER);
      startBtn.hidden = true;
      stopEngineStripPoll();
    }
  };
  const createAIProviderFromSettings = (configOverride = null) => {
    const cfg = configOverride || readAIBackendConfig();
    const backend = cfg.backend || 'gemini';
    const Provider = (typeof window !== 'undefined' && window.AIProvider) || (ai && ai.constructor);
    if (!Provider) return ai;
    const canInheritActiveProvider = !isStudentAiSetup && (backend === 'gemini' || backend === (ai && ai.backend));
    const inheritedApiKey = canInheritActiveProvider ? (ai && ai.apiKey) : '';
    const inheritedModels = canInheritActiveProvider ? (ai && ai.models) : {};
    return new Provider({
      backend,
      apiKey: cfg.apiKey ?? inheritedApiKey ?? '',
      baseUrl: cfg.baseUrl || aiBackendDefaults[backend] || '',
      models: cfg.models || inheritedModels || {},
      ttsProvider: cfg.ttsProvider || 'auto',
      imageProvider: cfg.imageProvider || 'auto',
      isCanvasEnv: false
    });
  };
  // ─── Guided setup helpers ────────────────────────────────────────────────
  // One backend-switch path shared by the guided cards AND the Advanced
  // provider select (factored from the old select onChange so the two can
  // never drift). Guided path suppresses the "Preset applied…" status line in
  // favor of the step copy.
  const applyBackendChoice = (backend, { showStatus = false } = {}) => {
    const current = readAIBackendConfig();
    const updated = { ...current, backend, baseUrl: aiBackendDefaults[backend] || '' };
    if (String(current.backend || 'gemini') === 'gemini' && current.apiKey && !updated.geminiApiKey) {
      updated.geminiApiKey = current.apiKey;
    }
    if (backend === 'gemini' && updated.geminiApiKey) updated.apiKey = updated.geminiApiKey;
    if (backend !== current.backend) delete updated.models;
    writeAIBackendConfig(updated);
    const urlEl = document.getElementById('ai-backend-url');
    if (urlEl) urlEl.value = updated.baseUrl || '';
    populateModelSelect(document.getElementById('ai-backend-model-default'), t('ai_backend.auto_server_default') || 'Auto (server default)', [], '');
    populateModelSelect(document.getElementById('ai-backend-model-fallback'), t('ai_backend.same_as_default') || 'Same as default', [], '');
    if (showStatus) {
      const status = document.getElementById('ai-backend-status');
      if (status) { status.textContent = t('ai_backend.preset_applied') || 'Preset applied. Test connection to discover models, then reload to apply.'; status.className = 'text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100'; }
    }
    setConfigRevision((revision) => revision + 1);
    setTimeout(refreshEngineStrip, 0);
  };
  const GUIDED_BACKEND_LABELS = {
    gemini: 'Google Gemini', 'alloflow-local': t('ai_backend.guided_backend_private_label') || 'the built-in private AI',
    lmstudio: 'LM Studio', ollama: 'Ollama', localai: 'LocalAI', custom: t('ai_backend.guided_backend_custom_label') || 'your custom endpoint'
  };
  const GUIDED_CONNECT_APPS = [
    { id: 'lmstudio', title: 'LM Studio', body: t('ai_backend.guided_connect_lmstudio_body') || 'Desktop app with a friendly model browser.', keyProps: { 'data-help-key': 'ai_backend_guided_connect_lmstudio' }, link: 'https://lmstudio.ai', steps: [t('ai_backend.guided_connect_lmstudio_step1') || 'Install LM Studio from lmstudio.ai (free).', t('ai_backend.guided_connect_lmstudio_step2') || 'Use its search to download a model — "Qwen 2.5 7B Instruct" is a good start.', t('ai_backend.guided_connect_lmstudio_step3') || 'Open the Developer / Local Server tab and press Start.', t('ai_backend.guided_connect_lmstudio_step4') || 'Press Test Connection below.'] },
    { id: 'ollama', title: 'Ollama', body: t('ai_backend.guided_connect_ollama_body') || 'Lightweight command-line runner.', keyProps: { 'data-help-key': 'ai_backend_guided_connect_ollama' }, link: 'https://ollama.com', steps: [t('ai_backend.guided_connect_ollama_step1') || 'Install Ollama from ollama.com (free).', t('ai_backend.guided_connect_ollama_step2') || 'In a terminal, run: ollama run llama3.2', t('ai_backend.guided_connect_ollama_step3') || 'Leave it running.', t('ai_backend.guided_connect_ollama_step4') || 'Press Test Connection below.'] },
    { id: 'localai', title: 'LocalAI', body: t('ai_backend.guided_connect_localai_body') || 'Self-hosted server (advanced).', keyProps: { 'data-help-key': 'ai_backend_guided_connect_localai' }, link: 'https://localai.io', steps: [t('ai_backend.guided_connect_localai_step1') || 'Follow the LocalAI install guide at localai.io.', t('ai_backend.guided_connect_localai_step2') || 'Start the server with at least one text model.', t('ai_backend.guided_connect_localai_step3') || 'Press Test Connection below.'] },
    { id: 'custom', title: t('ai_backend.guided_connect_custom_title') || 'Custom endpoint', body: t('ai_backend.guided_connect_custom_body') || 'Any OpenAI-compatible server.', keyProps: { 'data-help-key': 'ai_backend_guided_connect_custom' }, link: '', steps: [t('ai_backend.guided_connect_custom_step1') || 'Enter your server address below.', t('ai_backend.guided_connect_custom_step2') || 'Add an API key only if your server requires one.', t('ai_backend.guided_connect_custom_step3') || 'Press Test Connection below.'] },
  ];
  // Canonical fields, rendered by exactly one layout at a time (guided step or
  // Advanced) — same ids, same help keys, same config writes, so external
  // lookups and the help overlay keep working and values survive layout moves
  // (every keystroke persists; defaultValue re-reads config on remount).
  const forgetGeminiCloudServicesKey = () => {
    const current = readAIBackendConfig();
    const geminiIsPrimary = String(current.backend || 'gemini') === 'gemini';
    const next = { ...current };
    delete next.geminiApiKey;
    // Gemini's primary credential is mirrored in apiKey for the legacy text
    // path. A local/other primary provider owns apiKey, so never erase it when
    // forgetting only the independent Gemini cloud-services credential.
    if (geminiIsPrimary) delete next.apiKey;
    writeAIBackendConfig(next, { preserveValidation: !geminiIsPrimary });
    setConfigRevision((revision) => revision + 1);
    const status = document.getElementById('ai-backend-status');
    if (status) {
      status.textContent = 'Gemini cloud-services key forgotten on this device.';
      status.className = 'text-xs font-bold mt-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100';
    }
  };
  const renderUrlField = () => (
    <div>
        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.server_url_label') || 'Server URL'}</label>
        <input
            data-help-key="ai_backend_custom_url_input"
            id="ai-backend-url" aria-label={t('ai_backend.server_url_aria') || 'Custom AI backend URL'}
            type="text"
            placeholder="http://localhost:8080"
            defaultValue={readAIBackendConfig().baseUrl || ''}
            onChange={(e) => {
                const current = readAIBackendConfig();
                writeAIBackendConfig({ ...current, baseUrl: e.target.value });
            }}
            className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
        />
    </div>
  );
  const renderApiKeyField = (labelText, hintText) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{labelText || t('ai_backend.api_key_label') || 'API Key'} <span className="normal-case font-normal text-slate-600">{hintText || t('ai_backend.api_key_hint') || '(cloud providers only)'}</span></label>
        <input
            data-help-key="ai_backend_api_key_input"
            id="ai-backend-apikey" aria-label={t('ai_backend.api_key_aria') || 'Custom AI backend API key'}
            type="password"
            autoComplete="off"
            placeholder={t('ai_backend.api_key_placeholder') || 'Your API key...'}
            key={'primary-api-key-' + String(readAIBackendConfig().backend || 'gemini') + '-' + configRevision}
            defaultValue={String(readAIBackendConfig().backend || 'gemini') === 'gemini'
              ? (readAIBackendConfig().geminiApiKey || readAIBackendConfig().apiKey || '')
              : (readAIBackendConfig().apiKey || '')}
            onChange={(e) => {
                const current = readAIBackendConfig();
                const next = { ...current, apiKey: e.target.value };
                if (String(current.backend || 'gemini') === 'gemini') next.geminiApiKey = e.target.value;
                writeAIBackendConfig(next);
            }}
            className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
        />
        {!isStudentAiSetup && String(readAIBackendConfig().backend || 'gemini') === 'gemini' && (
          <button
            type="button"
            data-help-key="ai_backend_forget_gemini_key"
            onClick={forgetGeminiCloudServicesKey}
            className="mt-2 min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
          >
            Forget saved Gemini key
          </button>
        )}
    </div>
  );
  const renderGeminiCloudServicesField = () => {
    const cfg = readAIBackendConfig();
    if (isStudentAiSetup || String(cfg.backend || 'gemini') === 'gemini') return null;
    return (
      <div id="ai-backend-gemini-services-section" tabIndex={-1} className="rounded-xl border-2 border-sky-100 bg-sky-50/70 p-3">
        <label htmlFor="ai-backend-gemini-services-key" className="block text-[11px] font-bold text-sky-900 uppercase tracking-wider mb-1.5">
          Gemini cloud-services key <span className="normal-case font-normal text-sky-800">(optional)</span>
        </label>
        <input
          data-help-key="ai_backend_gemini_services_key_input"
          id="ai-backend-gemini-services-key"
          aria-describedby="ai-backend-gemini-services-help"
          type="password"
          autoComplete="off"
          placeholder="Gemini API key..."
          key={'gemini-cloud-services-key-' + configRevision}
          defaultValue={cfg.geminiApiKey || ''}
          onChange={(event) => {
            const current = readAIBackendConfig();
            // This credential does not alter or invalidate the selected text
            // backend. Student BYOK never renders this secondary-key field.
            writeAIBackendConfig({ ...current, geminiApiKey: event.target.value }, { preserveValidation: true });
          }}
          className="w-full p-2.5 border-2 border-sky-200 rounded-xl focus:border-sky-600 focus:ring-4 focus:ring-sky-500/20 outline-none text-sm font-medium text-slate-700 bg-white"
        />
        <button
          type="button"
          data-help-key="ai_backend_forget_gemini_services_key"
          onClick={forgetGeminiCloudServicesKey}
          className="mt-2 min-h-11 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
        >
          Forget saved Gemini key
        </button>
        <p id="ai-backend-gemini-services-help" className="mt-1 text-[11px] leading-relaxed text-sky-900">
          Used only for Gemini cloud features you explicitly select, including Gemini voice transcription. Your primary text AI remains {GUIDED_BACKEND_LABELS[String(cfg.backend || '')] || String(cfg.backend || 'the selected backend')}.
        </p>
      </div>
    );
  };
  const renderEngineStrip = () => (
    <div id="ai-backend-engine-strip" style={{ display: 'none' }} aria-live="polite" ref={(node) => { if (node && !node.dataset.engineInit) { node.dataset.engineInit = '1'; setTimeout(refreshEngineStrip, 0); } }}></div>
  );
  const guidedStepHeading = (text) => (
    <p ref={guidedHeadingRef} tabIndex={-1} role="status" aria-live="polite" className="text-[11px] font-black text-violet-700 uppercase tracking-wider outline-none">{text}</p>
  );
  const guidedBackBtn = (target) => (
    <button data-help-key="ai_backend_guided_back_btn" onClick={() => { setGuidedReady(false); setGuidedView(target); }} className="text-xs font-bold text-slate-600 hover:text-violet-700 transition-colors">◀ {t('ai_backend.guided_back') || 'Back'}</button>
  );
  const guidedCard = (keyProps, onClick, emoji, title, badge, body, req) => (
    <button {...keyProps} type="button" onClick={onClick}
        className="w-full text-left border-2 border-slate-200 rounded-2xl p-4 hover:border-violet-400 hover:bg-violet-50/40 transition-all active:scale-[0.99]">
        <div className="flex items-center gap-2">
            <span aria-hidden="true">{emoji}</span>
            <span className="font-black text-sm text-slate-800">{title}</span>
            {badge && <span className="ml-auto text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</p>
        {req && <p className="text-[11px] text-slate-500 mt-1">{req}</p>}
    </button>
  );
  const renderGuidedStep = () => {
    const cfg = readAIBackendConfig();
    if (guidedView === 'gemini') return (
      <div className="space-y-3">
        {guidedStepHeading(t('ai_backend.guided_gemini_kicker') || 'Step 2 of 2 · Google Gemini')}
        <ol className="list-decimal ml-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
            <li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-bold text-violet-700 underline">{t('ai_backend.guided_gemini_step1') || 'Open Google AI Studio ↗'}</a></li>
            <li>{t('ai_backend.guided_gemini_step2') || 'Sign in with any Google account (a free one is fine).'}</li>
            <li>{t('ai_backend.guided_gemini_step3') || 'Press "Create API key" and copy it.'}</li>
            <li>{t('ai_backend.guided_gemini_step4') || 'Paste the key below.'}</li>
        </ol>
        {/* What a free key does NOT do. resolveAiCapability() reports images:true for
            ANY api-key backend because it cannot tell a free key from a billed one,
            so the picture tools appear available and then fail at generation time.
            Saying it here is the only honest place: before the teacher commits to
            this route and builds a lesson around an image tool. */}
        <div className="mt-3 rounded-xl border-2 border-amber-200 bg-amber-50/70 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                {t('ai_backend.gemini_images_kicker') || 'Text yes, pictures no'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
                {t('ai_backend.gemini_images_note')
                    || 'The free Google API tier does not include image generation. Every text tool works: lessons, questions, translation, levelling, glossaries. The tools that DRAW something will not, on a free key.'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-900">
                {t('ai_backend.gemini_images_fix')
                    || 'For pictures, run AlloFlow in Gemini Canvas instead, or enable billing on this key. Neither is needed for anything else.'}
            </p>
        </div>
        {renderApiKeyField(t('ai_backend.guided_gemini_key_label') || 'Your Gemini API key', ' ')}
        {/* The Gemini API is a developer product. A teacher using a developer key is
            stepping into that role, so this is where we ask for something back. It is
            a pledge, not a licence condition: it does not gate the key, because a
            classroom that cannot generate a lesson is a worse outcome than a pledge
            nobody honours. */}
        <label className="mt-3 flex items-start gap-2.5 rounded-xl border-2 border-violet-200 bg-violet-50/60 p-3 cursor-pointer">
            <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
                defaultChecked={!!readAIBackendConfig().contributePledge}
                onChange={(e) => {
                    const current = readAIBackendConfig();
                    writeAIBackendConfig({ ...current, contributePledge: e.target.checked });
                }}
            />
            <span className="text-xs leading-relaxed text-violet-900">
                <span className="font-black">
                    {t('ai_backend.pledge_title') || 'I will help make AlloFlow better.'}
                </span>{' '}
                {t('ai_backend.pledge_body')
                    || 'A developer key is a developer tool. If something breaks I will report it, and if I build a lesson or tool worth sharing I will send it to the Community Catalog from my history so other teachers get it too.'}{' '}
                <a href="https://github.com/Apomera/AlloFlow/issues/new" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                    {t('ai_backend.pledge_report') || 'Report something ↗'}
                </a>
                {' · '}
                <a href="https://apomera.github.io/AlloFlow/feedback.html" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                    {t('ai_backend.pledge_share') || 'Share what you made ↗'}
                </a>
            </span>
        </label>
        <p className="text-[11px] text-slate-500">{t('ai_backend.guided_gemini_key_note') || 'Stored only on this device. The free tier covers everyday classroom use.'}</p>
        {guidedBackBtn('choose')}
      </div>
    );
    if (guidedView === 'private') return (
      <div className="space-y-3">
        {guidedStepHeading(t('ai_backend.guided_private_kicker') || 'Step 2 of 2 · Private AI on this computer')}
        <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
            <li>✅ <strong>{t('ai_backend.guided_private_b1a') || 'Private:'}</strong> {t('ai_backend.guided_private_b1b') || 'lessons and student text never leave this computer.'}</li>
            <li>📥 <strong>{t('ai_backend.guided_private_b2a') || 'One-time download:'}</strong> {t('ai_backend.guided_private_b2b') || 'a starter AI model (about 2 GB). Keep the app open until it finishes.'}</li>
            <li>🖥️ <strong>{t('ai_backend.guided_private_b3a') || 'Hardware:'}</strong> {t('ai_backend.guided_private_b3b') || 'works best with 8 GB+ memory and ~2.5 GB free disk.'}</li>
            <li>⏱️ <strong>{t('ai_backend.guided_private_b4a') || 'Speed:'}</strong> {t('ai_backend.guided_private_b4b') || "answers take a bit longer than cloud AI — that's the privacy trade."}</li>
        </ul>
        {renderEngineStrip()}
        {guidedBackBtn('choose')}
      </div>
    );
    if (guidedView === 'connect') return (
      <div className="space-y-3">
        {guidedStepHeading(t('ai_backend.guided_connect_kicker') || 'Step 2 of 3 · Which app do you run?')}
        <div className="grid grid-cols-2 gap-2">
            {GUIDED_CONNECT_APPS.map((app) => (
              <button key={app.id} {...app.keyProps} type="button"
                  onClick={() => { applyBackendChoice(app.id); setGuidedReady(false); setGuidedView('connect-detail:' + app.id); }}
                  className="text-left border-2 border-slate-200 rounded-xl p-3 hover:border-violet-400 hover:bg-violet-50/40 transition-all active:scale-[0.99]">
                  <span className="font-black text-xs text-slate-800">{app.title}</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">{app.body}</p>
              </button>
            ))}
        </div>
        {guidedBackBtn('choose')}
      </div>
    );
    if (guidedView.startsWith('connect-detail:')) {
      const app = GUIDED_CONNECT_APPS.find((a) => a.id === guidedView.slice('connect-detail:'.length)) || GUIDED_CONNECT_APPS[3];
      return (
        <div className="space-y-3">
          {guidedStepHeading((t('ai_backend.guided_connect_detail_kicker') || 'Step 3 of 3 · Connect') + ' ' + app.title)}
          <ol className="list-decimal ml-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
              {app.steps.map((step, i) => <li key={i}>{app.link && i === 0 ? <a href={app.link} target="_blank" rel="noopener noreferrer" className="font-bold text-violet-700 underline">{step} ↗</a> : step}</li>)}
          </ol>
          {renderUrlField()}
          {renderApiKeyField(t('ai_backend.guided_connect_key_label') || 'API key', t('ai_backend.guided_connect_key_hint') || '(only if your server needs one)')}
          {guidedBackBtn('connect')}
        </div>
      );
    }
    // default: 'choose'
    const currentBackend = cfg.backend || 'gemini';
    const connected = Boolean(cfg.validation && cfg.validation.ok);
    const badgeFor = (backend) => (currentBackend === backend && cfg.backend ? (t('ai_backend.guided_current_badge') || 'Current') : '');
    return (
      <div className="space-y-3">
        {guidedStepHeading(t('ai_backend.guided_choose_kicker') || 'First-time setup · Choose your AI')}
        <p className="text-xs text-slate-600 leading-relaxed">{t('ai_backend.guided_intro') || "AlloFlow uses an AI engine to create lessons, read aloud, and answer questions. Pick how you'd like it to work — you can change this any time."}</p>
        {connected && <p className="text-[11px] font-bold text-green-800 bg-green-50 border border-green-100 rounded-xl p-2">✅ {(t('ai_backend.guided_connected_chip') || 'Connected —') + ' ' + (GUIDED_BACKEND_LABELS[currentBackend] || currentBackend)}</p>}
        {/* Canvas-first card (W7, 2026-08-16): the zero-setup path. A visitor who
            arrived keyless (deep link, shared shell) is one click from the full
            free experience instead of a key hunt. The share URL is the same one
            launch.html carries; keep the two in sync when it is restamped.
            No quota numbers or plan pricing here on purpose — they rot into
            false claims; "your plan's daily quota" plus Google's own page. */}
        {!connected && guidedCard({ 'data-help-key': 'ai_backend_guided_card_canvas' },
          () => { try { window.open('https://share.gemini.google/gKRsMKVR6MO4', '_blank', 'noopener'); } catch (e) {} },
          '🚀', t('ai_backend.guided_card_canvas_title') || 'Use AlloFlow inside Gemini Canvas',
          t('ai_backend.guided_card_canvas_badge') || 'No setup',
          t('ai_backend.guided_card_canvas_body') || 'The easiest way to get AI: open AlloFlow inside Google Gemini. Free with a Google account, using your Gemini plan’s daily quota (personal, Education, or paid plans all work). Nothing to install and no key to manage.',
          t('ai_backend.guided_card_canvas_req') || 'Opens gemini.google.com in a new tab · plan details at google.com/gemini')}
        {guidedCard({ 'data-help-key': 'ai_backend_guided_card_gemini' },
          () => { applyBackendChoice('gemini'); setGuidedReady(false); setGuidedView('gemini'); },
          '✨', t('ai_backend.guided_card_gemini_title') || 'Google Gemini',
          badgeFor('gemini') || (t('ai_backend.guided_card_gemini_badge') || 'Recommended'),
          t('ai_backend.guided_card_gemini_body') || "Best quality and speed. Runs in Google's cloud with a free key — we'll walk you through getting one (about 2 minutes).",
          t('ai_backend.guided_card_gemini_req') || 'Works anywhere · needs internet')}
        {guidedCard({ 'data-help-key': 'ai_backend_guided_card_private' },
          () => { applyBackendChoice('alloflow-local'); setGuidedReady(false); setGuidedView('private'); },
          '🔒', t('ai_backend.guided_card_private_title') || 'Private AI on this computer',
          badgeFor('alloflow-local') || (t('ai_backend.guided_card_private_badge') || 'Most private'),
          t('ai_backend.guided_card_private_body') || 'Everything stays on this computer — no account, no internet needed after setup. One click downloads a starter AI model.',
          t('ai_backend.guided_card_private_req') || '8 GB+ memory recommended · ~2.5 GB one-time download')}
        {guidedCard({ 'data-help-key': 'ai_backend_guided_card_connect' },
          () => { setGuidedReady(false); setGuidedView('connect'); },
          '🔌', t('ai_backend.guided_card_connect_title') || 'An AI app I already run',
          badgeFor('lmstudio') || badgeFor('ollama') || badgeFor('localai') || badgeFor('custom'),
          t('ai_backend.guided_card_connect_body') || 'Already use LM Studio, Ollama, or LocalAI on this computer? Connect it.',
          '')}
      </div>
    );
  };
  const guidedTestVisible = advancedOpen
    || guidedView === 'gemini' || guidedView === 'private' || guidedView.startsWith('connect-detail:');
  // "Manage device storage" must open the Storage and recovery manager - the real
  // surface showing durable usage, retention policy and recoverable work. It used
  // to call __alloOpenDeviceStorageProbe unconditionally, which is the DEVELOPMENT
  // probe (Run probe / Open review page / View app data) built to test whether
  // Canvas storage survives a reload. That is a diagnostic harness, not a manager,
  // so the button never reached the screen its label promises.
  const openDeviceStorageManager = () => {
    if (typeof window.__alloOpenStorageRecoveryManager === 'function') {
      window.__alloOpenStorageRecoveryManager();
      return;
    }
    // No bridge means the HOST is older than this panel, which is a legitimate
    // state: modules load live from the CDN on every boot, while the host ships
    // inside the app build (or a Canvas copy) and only changes when that is
    // reloaded or re-published. So a deploy can fix the module half hours before
    // the host half arrives.
    //
    // Falling through to the development probe here is the ORIGINAL bug wearing
    // a version-skew hat: the teacher still gets a diagnostic harness under a
    // button labelled "Manage device storage", now with no hint as to why. Say
    // what is actually true instead. __alloAddToast has been on the host since
    // 2026-05-27, so any host old enough to lack the bridge still has the toast.
    const _skewNotice = t('canvas_settings.device_storage_needs_reload')
      || 'Reload AlloFlow to open the Storage and recovery manager — this app build is older than this settings panel.';
    if (typeof window.__alloAddToast === 'function') {
      window.__alloAddToast(_skewNotice, 'info');
      return;
    }
    // N5 (2026-08-16): the last-resort fall-through to __alloOpenDeviceStorageProbe is
    // gone. It was the last remaining path where one label ("Manage local storage")
    // could open two different things, and the thing it opened was the diagnostic
    // harness. On a host too old for both bridges, saying nothing beats opening the
    // wrong screen; the probe now has its own labelled button in Platform Diagnostics.
    try { console.warn('[Storage] Storage and recovery manager bridge unavailable on this host build.'); } catch (_) {}
  };
  return (
        <div
          /* z raise while the STEAM Lab is open (lab overlay = INLINE zIndex 10020,
             stem_lab_module.js — its class says 9999 but the style wins). Without
             this, the keyless deep-link visitor clicks the "AI extras: off" pill
             and the doorway opens UNDERNEATH the lab: visible to no one, pointer
             events intercepted (caught by 43-keyless-ai-honesty.spec.ts,
             2026-08-17). Same pattern as the AlloBot chat containers above. */
          style={{ zIndex: props.showStemLab ? 10490 : undefined }}
          className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowAIBackendModal(false)}>
          <div data-help-key="ai_backend_modal_panel" data-student-ai-setup={isStudentAiSetup ? 'true' : 'false'} className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="ai-backend-title" tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') setShowAIBackendModal(false); }} onClick={e => e.stopPropagation()}>
            {isStudentAiSetup && <style>{`
              [data-student-ai-setup="true"] #ai-backend-engine-strip,
              [data-student-ai-setup="true"] #ai-backend-sdturbo-strip,
              [data-student-ai-setup="true"] div:has(> #ai-backend-wolfram),
              [data-student-ai-setup="true"] div.pt-3:has(#ai-backend-model-default),
              [data-student-ai-setup="true"] div.pt-3:has(#ai-backend-tts-provider),
              [data-student-ai-setup="true"] div.pt-3:has(#ai-backend-image-provider),
              [data-student-ai-setup="true"] #ai-backend-device-storage-section {
                display: none !important;
              }
            `}</style>}
            <button onClick={() => setShowAIBackendModal(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10" aria-label={t('common.close') || "Close"}><X size={20}/></button>
            <div className="flex items-center gap-2 mb-6 text-violet-900">
                <div className="bg-violet-100 p-2 rounded-full"><Unplug size={20} className="text-violet-600"/></div>
                <h3 id="ai-backend-title" className="font-black text-lg">{isStudentAiSetup ? (t('ai_backend.personal_title') || 'Connect Personal AI') : (t('ai_backend.title') || 'AI Backend Settings')}</h3>
            </div>
            <div className="space-y-4">
                {/* ─── Section 1: Provider & Connection ─── */}
                {isStudentAiSetup && (
                  <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950'>
                    <p className='font-black'>{t('ai_backend.personal_session_title') || 'Personal AI for this session'}</p>
                    <p className='mt-1'>{t('ai_backend.personal_storage_notice') || 'Use only your own provider account. Your credential is stored only in this browser tab and transmitted only to the provider you choose; it is never placed in the QR, Class Mailbox, or student submission.'}</p>
                    <p className='mt-1'>{t('ai_backend.personal_privacy_notice') || 'Your prompts and activity content are sent directly to the provider you choose and may create charges. Follow your school or district rules, do not include private student information, and use a restricted, low-budget key. Avoid shared devices.'}</p>
                  </div>
                )}
                {/* ─── Guided setup (default) — three cards, then only the fields
                     that choice needs. The full surface lives behind Advanced;
                     students always get the trimmed legacy layout instead. ─── */}
                {!advancedOpen && !isStudentAiSetup && renderGuidedStep()}
                {!advancedOpen && !isStudentAiSetup && (
                  <section id="ai-backend-guided-storage-shortcut" className="rounded-xl border border-cyan-200 bg-cyan-50 p-3" aria-labelledby="ai-backend-guided-storage-title">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 id="ai-backend-guided-storage-title" className="text-xs font-black text-cyan-950">{t('canvas_settings.local_storage_title') || 'Saved work on this device'}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-cyan-900">{t('canvas_settings.local_storage_hint') || 'Open your saved resource packs to restore, pin, export, or erase them. Also shows space used and the offline voice models such as Whisper and Kokoro.'}</p>
                      </div>
                      <button type="button" data-help-key="ai_backend_guided_storage_btn" onClick={openDeviceStorageManager} className="min-h-11 shrink-0 rounded-xl border-2 border-cyan-600 bg-white px-4 py-2 text-sm font-black text-cyan-900 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2">
                        {t('canvas_settings.local_storage_btn') || 'Open saved work'}
                      </button>
                    </div>
                  </section>
                )}
                {advancedOpen && (<>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.provider_label') || 'Provider'}</label>
                    <select
                        data-help-key="ai_backend_provider_select"
                        aria-label={t('ai_backend.provider_aria') || 'AI Backend Provider'}
                        id="ai-backend-provider"
                        defaultValue={readAIBackendConfig().backend || 'gemini'}
                        onChange={(e) => applyBackendChoice(e.target.value, { showStatus: true })}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-bold text-slate-700 bg-white cursor-pointer"
                    >
                        <option value="gemini">✨ Gemini (Google) — Default</option>
                        {!isStudentAiSetup && <>
                        <option value="alloflow-local">🏫 AlloFlow Built-in Engine (this computer — no account)</option>
                        <option value="lmstudio">LM Studio (Local)</option>
                        <option value="localai">🖥️ LocalAI (Self-Hosted GPU)</option>
                        <option value="ollama">🦙 Ollama (Local)</option>
                        </>}
                        <option value="openai">🤖 OpenAI</option>
                        {!isStudentAiSetup && <>
                        <option value="claude">🧠 Claude (Anthropic)</option>
                        <option value="onnx-npu">🧠 On-Device NPU (Snapdragon)</option>
                        </>}
                        <option value="custom">⚙️ Custom Endpoint</option>
                    </select>
                </div>
                {renderUrlField()}
                {renderEngineStrip()}
                <div id="ai-backend-sdturbo-strip" style={{ display: 'none' }} aria-live="polite" ref={(node) => { if (node && !node.dataset.sdInit) { node.dataset.sdInit = '1'; setTimeout(refreshSdTurboStrip, 0); } }}></div>
                {renderApiKeyField()}
                {renderGeminiCloudServicesField()}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.wolfram_label') || 'Wolfram Alpha App ID'} <span className="normal-case font-normal text-slate-600">{t('ai_backend.wolfram_hint') || '(optional — enhances math)'}</span></label>
                    <input
                        data-help-key="ai_backend_wolfram_input"
                        id="ai-backend-wolfram" aria-label={t('ai_backend.wolfram_aria') || 'Custom backend Wolfram App ID'}
                        type="text"
                        placeholder={t('ai_backend.wolfram_placeholder') || 'XXXXX-XXXXXXXXXX (from developer.wolframalpha.com)'}
                        defaultValue={readAIBackendConfig().wolframAppId || ''}
                        onChange={(e) => {
                            const current = readAIBackendConfig();
                            writeAIBackendConfig({ ...current, wolframAppId: e.target.value });
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
                    />
                    <p className="text-[11px] text-slate-600 mt-1">{t('ai_backend.wolfram_free_note') || 'Free: 2,000 queries/month • Adds exact math solving & step-by-step verification'}</p>
                </div>
                </>)}
                {/* ─── Ready banner (guided path, after a successful test) ─── */}
                {!advancedOpen && guidedReady && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="text-xs font-black text-green-900">✅ {(t('ai_backend.guided_ready') || "You're ready — AlloFlow is using") + ' ' + (GUIDED_BACKEND_LABELS[readAIBackendConfig().backend || 'gemini'] || readAIBackendConfig().backend) + '.'}</p>
                    <p className="text-[11px] text-green-800 mt-1">{t('ai_backend.guided_ready_note') || 'Your choice is active now — close this window and start working.'}</p>
                    <button data-help-key="ai_backend_guided_done_btn" onClick={() => setShowAIBackendModal(false)} className="mt-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition-all active:scale-95">{t('ai_backend.guided_done') || 'Done'}</button>
                  </div>
                )}
                {guidedTestVisible && (<>
                <div className="flex gap-2 pt-1">
                    <button
                        data-help-key="ai_backend_test_connection_btn"
                        id="ai-backend-test"
                        onClick={async () => {
                            const btn = document.getElementById('ai-backend-test');
                            const status = document.getElementById('ai-backend-status');
                            const panel = btn && btn.closest('[data-help-key="ai_backend_modal_panel"]');
                            const lockedControls = panel
                              ? Array.from(panel.querySelectorAll('input, select, button')).filter(control => control !== btn)
                              : [];
                            btn.disabled = true;
                            lockedControls.forEach(control => { control.disabled = true; });
                            btn.textContent = '⏳ Testing...';
                            if (status) { status.textContent = ''; status.className = ''; }
                            try {
                                const testedConfig = readAIBackendConfig();
                                const testedFingerprint = fingerprintAIBackendConfig(testedConfig);
                                writeAIBackendConfig(testedConfig);
                                const result = await createAIProviderFromSettings(testedConfig).testConnection();
                                if (result.success) {
                                    if (!testedFingerprint || fingerprintAIBackendConfig(readAIBackendConfig()) !== testedFingerprint) {
                                        throw new Error('Settings changed while the connection was being tested. Please test again.');
                                    }
                                    const modelSelect = document.getElementById('ai-backend-model-default');
                                    const fallbackSelect = document.getElementById('ai-backend-model-fallback');
                                    const cfg = readAIBackendConfig();
                                    const firstModel = result.selectedModel || result.models?.[0]?.id || '';
                                    if (firstModel && cfg.models?.default !== firstModel) {
                                        const models = { ...(cfg.models || {}), default: firstModel };
                                        writeAIBackendConfig({ ...cfg, models });
                                    }
                                    const refreshedCfg = readAIBackendConfig();
                                    writeAIBackendConfig({
                                        ...refreshedCfg,
                                        validation: {
                                            ok: true,
                                            backend: refreshedCfg.backend || 'gemini',
                                            text: true,
                                            fingerprint: fingerprintAIBackendConfig(refreshedCfg),
                                            capabilities: {
                                                text: true,
                                                vision: false,
                                                image: false,
                                                imageEdit: false,
                                                audio: false,
                                                ...(result.capabilities || {})
                                            },
                                            testedAt: new Date().toISOString(),
                                            expiresAt: new Date(Date.now() + (6 * 60 * 60 * 1000)).toISOString(),
                                            modelCount: Number(result.modelCount || 0)
                                        }
                                    }, { preserveValidation: true });
                                    if (isStudentAiSetup && typeof window.__alloSyncQrStudentAiAccess === 'function') window.__alloSyncQrStudentAiAccess();
                                    // Activate the verified settings NOW — the Gemini factory
                                    // captures its config at boot, so without this a freshly
                                    // verified key stayed invisible until a manual reload and
                                    // the next audit failed with "No AI API key is configured".
                                    try { if (!isStudentAiSetup && typeof window._upgradeGeminiAPI === 'function') window._upgradeGeminiAPI(); } catch (_) {}
                                    setGuidedReady(true);
                                    if (status) { status.textContent = 'Connected! ' + result.modelCount + ' model(s) available' + (firstModel && cfg.models?.default !== firstModel ? '. Verified model selected.' : ''); status.className = 'text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100'; }
                                    if (modelSelect && result.models?.length > 0) {
                                        populateModelSelect(modelSelect, 'Auto (server default)', result.models, refreshedCfg.models?.default || '');
                                    }
                                    if (fallbackSelect && result.models?.length > 0) {
                                        populateModelSelect(fallbackSelect, 'Same as default', result.models, refreshedCfg.models?.fallback || '');
                                    }
                                } else {
                                    if (status) { status.textContent = '❌ Failed: ' + result.error; status.className = 'text-xs font-bold mt-2 text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100'; }
                                }
                            } catch (err) {
                                if (status) { status.textContent = '❌ Error: ' + err.message; status.className = 'text-xs font-bold mt-2 text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100'; }
                            }
                            lockedControls.forEach(control => { control.disabled = false; });
                            btn.disabled = false;
                            btn.textContent = '🔌 Test Connection';
                        }}
                        className="flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95"
                    >
                        🔌 Test Connection
                    </button>
                    {advancedOpen && <button
                        onClick={() => {
                            clearAIBackendConfig();
                            const p = document.getElementById('ai-backend-provider');
                            const u = document.getElementById('ai-backend-url');
                            const k = document.getElementById('ai-backend-apikey');
                            const s = document.getElementById('ai-backend-status');
                            if (p) p.value = 'gemini';
                            if (u) u.value = '';
                            if (k) k.value = '';
                            const w = document.getElementById('ai-backend-wolfram');
                            if (w) w.value = '';
                            const md = document.getElementById('ai-backend-model-default');
                            const mf = document.getElementById('ai-backend-model-fallback');
                            const tt = document.getElementById('ai-backend-tts-provider');
                            const ig = document.getElementById('ai-backend-image-provider');
                            if (md) md.value = '';
                            if (mf) mf.value = '';
                            if (tt) tt.value = 'auto';
                            if (ig) ig.value = 'auto';
                            if (s) { s.textContent = isStudentAiSetup ? 'Disconnected. The session key was erased.' : '🔄 Reset to defaults — reload page to apply'; s.className = 'text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100'; }
                        }}
                        className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all active:scale-95"
                    >
                        {isStudentAiSetup ? 'Disconnect & erase key' : '↩ Reset'}
                    </button>}
                </div>
                <div id="ai-backend-status"></div>
                </>)}

                {advancedOpen && (<>
                {/* ─── Section 2: Model Selection ─── */}
                <div className="pt-3 border-t-2 border-violet-50">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-blue-100 p-1.5 rounded-lg"><Cpu size={14} className="text-blue-600"/></div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">{t('ai_backend.model_selection_header') || 'Model Selection'}</h4>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{t('ai_backend.default_model_label') || 'Default Model'} <span className="normal-case font-normal text-slate-600">{t('ai_backend.default_model_hint') || '(text generation)'}</span></label>
                            <select
                                data-help-key="ai_backend_model_select"
                                aria-label={t('ai_backend.default_model_aria') || 'Default AI model'}
                                id="ai-backend-model-default"
                                defaultValue={readAIBackendConfig().models?.default || ''}
                                onChange={(e) => {
                                    const current = readAIBackendConfig();
                                    const models = { ...(current.models || {}), default: e.target.value || undefined };
                                    if (!e.target.value) delete models.default;
                                    writeAIBackendConfig({ ...current, models });
                                }}
                                className="w-full p-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
                            >
                                <option value="">{t('ai_backend.auto_server_default') || 'Auto (server default)'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{t('ai_backend.fallback_model_label') || 'Fallback Model'} <span className="normal-case font-normal text-slate-600">{t('ai_backend.fallback_model_hint') || '(rate-limit cascade)'}</span></label>
                            <select
                                aria-label={t('ai_backend.fallback_model_aria') || 'Fallback AI model'}
                                id="ai-backend-model-fallback"
                                defaultValue={readAIBackendConfig().models?.fallback || ''}
                                onChange={(e) => {
                                    const current = readAIBackendConfig();
                                    const models = { ...(current.models || {}), fallback: e.target.value || undefined };
                                    if (!e.target.value) delete models.fallback;
                                    writeAIBackendConfig({ ...current, models });
                                }}
                                className="w-full p-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
                            >
                                <option value="">{t('ai_backend.same_as_default') || 'Same as default'}</option>
                            </select>
                        </div>
                        <p className="text-[11px] text-slate-600 italic">💡 Click "Test Connection" above to auto-populate available models from your backend.</p>
                    </div>
                </div>

                {/* ─── Section 3: TTS Provider ─── */}
                <div className="pt-3 border-t-2 border-violet-50">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-emerald-100 p-1.5 rounded-lg"><Headphones size={14} className="text-emerald-600"/></div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Text-to-Speech</h4>
                    </div>
                    <select
                        data-help-key="ai_backend_tts_provider_select"
                        aria-label={t('ai_backend.tts_provider_aria') || 'Text-to-speech provider'}
                        id="ai-backend-tts-provider"
                        defaultValue={readAIBackendConfig().ttsProvider || 'auto'}
                        onChange={(e) => {
                            const current = readAIBackendConfig();
                            writeAIBackendConfig({ ...current, ttsProvider: e.target.value });
                        }}
                        className="w-full p-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
                    >
                        <option value="auto">🔄 Auto (match backend)</option>
                        <option value="gemini">✨ Gemini Cloud TTS</option>
                        <option value="local">🖥️ Local TTS (Kokoro → Edge TTS cascade)</option>
                        <option value="browser">🌐 Browser Built-in (speechSynthesis)</option>
                        <option value="off">🔇 Off (disable narration)</option>
                    </select>
                    <div className="mt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                            <strong>Auto:</strong> Gemini voices for cloud backends, Edge TTS voices for local backends.
                            Narrator voice selection is in the header bar (🎧 button).
                        </p>
                        <p className="text-[11px] text-emerald-600 mt-1">
                            <strong>{t('ai_backend.local_cascade_label') || 'Local cascade:'}</strong> Kokoro (:8880, 8 langs) → Edge TTS (:5500, 40+ langs) → Browser fallback
                        </p>
                    </div>
                </div>

                {/* ─── Section 4: Image Generation ─── */}
                <div className="pt-3 border-t-2 border-violet-50">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-amber-100 p-1.5 rounded-lg"><ImageIcon size={14} className="text-amber-600"/></div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">{t('ai_backend.image_generation_header') || 'Image Generation'}</h4>
                    </div>
                    <select
                        aria-label={t('ai_backend.image_provider_aria') || 'Image generation provider'}
                        id="ai-backend-image-provider"
                        defaultValue={readAIBackendConfig().imageProvider || 'auto'}
                        onChange={(e) => {
                            const current = readAIBackendConfig();
                            writeAIBackendConfig({ ...current, imageProvider: e.target.value });
                        }}
                        className="w-full p-2 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
                    >
                        <option value="auto">🔄 Auto (match backend)</option>
                        <option value="sd-local">🏫 SD-Turbo (this computer — no account)</option>
                        <option value="imagen">🎨 Imagen 4.0 (Google Cloud)</option>
                        <option value="flux">🖼️ FLUX (Local — port 7860)</option>
                        <option value="off">🚫 Off (disable image generation)</option>
                    </select>
                    <div className="mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                            <strong>Imagen:</strong> Google Cloud (requires Blaze plan). High quality, fast.
                        </p>
                        <p className="text-[11px] text-amber-600 mt-1">
                            <strong>FLUX:</strong> Self-hosted at localhost:7860. Supports generation + editing via FLUX Kontext. No cloud dependency.
                        </p>
                    </div>
                </div>

                {/* ─── Section 5: AI Model Diagnostics (shared with Canvas modal) ─── */}
                {!isStudentAiSetup && <ModelDiagnosticsSection t={t} _isCanvasEnv={_isCanvasEnv} GEMINI_MODELS={GEMINI_MODELS} />}
                {!isStudentAiSetup && <PlatformDiagnosticsSection t={t} />}

                {/* ─── Section 6: Device Storage (parity with the Canvas Advanced
                     Settings modal, 2026-07-14) — opens the on-device storage
                     manager (review/export/erase). On this deployed surface the
                     backend is the app origin's own IndexedDB; same panel. */}
                <div id="ai-backend-device-storage-section" className="border-t border-slate-100 pt-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('canvas_settings.device_storage_label') || 'Device Storage'}</label>
                    <p className="text-[11px] text-slate-600 mb-2">{t('canvas_settings.device_storage_hint') || 'Work and settings are saved on this device only — nothing goes to a server. Review, export, or erase what is stored here.'}</p>
                    <button
                        onClick={openDeviceStorageManager}
                        className="bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
                    >
                        🔌 {t('canvas_settings.device_storage_btn') || 'Manage device storage'}
                    </button>
                </div>

                {/* ─── Section 7: Diagnostics & logs (2026-07-20) — always-available
                     entry into the Error Reporter panel. The red badge only appears
                     AFTER an error is captured, but a stuck read-aloud rarely throws;
                     opening from here reaches the errors log AND the read-aloud/TTS
                     trace tab with zero captured errors. */}
                <div id="ai-backend-diagnostics-section" className="border-t border-slate-100 pt-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('canvas_settings.diagnostics_label') || 'Diagnostics & Logs'}</label>
                    <p className="text-[11px] text-slate-600 mb-2">{t('canvas_settings.diagnostics_hint') || 'View captured errors and the read-aloud (text-to-speech) activity trace — useful when audio stalls without a visible error.'}</p>
                    <button
                        onClick={() => {
                            if (typeof window.__alloOpenDiagnosticsLog !== 'function') return;
                            let hasErrors = false;
                            try { hasErrors = (window.AlloModules.ErrorReporter.getBuffer() || []).length > 0; } catch (e) {}
                            window.__alloOpenDiagnosticsLog(hasErrors ? 'errors' : 'tts');
                        }}
                        className="bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
                    >
                        🩺 {t('canvas_settings.diagnostics_btn') || 'Open error & read-aloud log'}
                    </button>
                </div>

                {/* ─── Active Config Summary ─── */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        <strong className="text-slate-600">Active:</strong>{' '}
                        {(() => { try { const c = readAIBackendConfig(); return c.backend ? (c.backend.charAt(0).toUpperCase() + c.backend.slice(1)) + (c.baseUrl ? ' → ' + c.baseUrl : '') : 'Gemini (default)'; } catch { return 'Gemini (default)'; } })()}
                    </p>
                    {!isStudentAiSetup && <p className="text-[11px] text-slate-600 font-medium mt-1">⚡ {t('ai_backend.reload_after_change') || 'Reload page after changing backend to apply.'}</p>}
                    {isStudentAiSetup && <p className="text-[11px] text-slate-600 font-medium mt-1">{t('ai_backend.student_verified_note') || 'Verified connections enable text AI only for this browser tab. Media generation stays off unless separately verified.'}</p>}
                </div>
                </>)}

                {/* ─── Advanced settings disclosure (teachers only; students keep
                     their fixed trimmed layout) ─── */}
                {!isStudentAiSetup && (
                  <button
                      data-help-key="ai_backend_advanced_toggle"
                      type="button"
                      aria-expanded={advancedOpen}
                      onClick={() => { setGuidedReady(false); setAdvancedOpen((v) => !v); }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-violet-700 border-t border-slate-100 pt-3 transition-colors"
                  >
                      <span aria-hidden="true" className={'inline-block transition-transform ' + (advancedOpen ? 'rotate-180' : '')}>▼</span>
                      {advancedOpen ? (t('ai_backend.advanced_toggle_close') || 'Back to guided setup') : (t('ai_backend.advanced_toggle') || 'Advanced settings')}
                  </button>
                )}
            </div>
          </div>
        </div>
  );
}
