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
  const {
    InteractiveBlueprintCard, activeBlueprint, addToast,
    aiStandardQuery, aiStandardRegion, autoSendVoice, chatStyles,
    handleAutoFillToggle, handleBlueprintUIUpdate, handleExecuteBlueprint, handleFindStandards,
    handleSendUDLMessage, handleSetShowUDLGuideToFalse, handleToggleAutoSendVoice, handleToggleIsShowMeMode,
    handleToggleIsUDLGuideExpanded, hasUsedAutoFill, isAutoFillMode, isChatProcessing,
    isConversationMode, isFindingStandards, isHelpMode, isIndependentMode,
    isSavingAdvice, isShowMeMode, isSpotlightMode, isUDLGuideExpanded,
    renderFormattedText, saveFullChat, saveUDLAdvice, setActiveBlueprint,
    setAiStandardQuery, setAiStandardRegion, setIsBotVisible, setIsConversationMode,
    setIsDictationMode, setStandardsInput, setUdlInput, setUdlMessages,
    setUdlStandardFramework, setUdlStandardGrade, showUDLGuide, suggestedStandards,
    t, theme, udlInput, udlInputRef,
    udlMessages, udlScrollRef, udlStandardFramework, udlStandardGrade
  } = props;
  if (!(showUDLGuide)) return null;
  return (
        <div className={`fixed z-[100] rounded-2xl flex flex-col animate-in fade-in slide-in-from-right-5 duration-300 overflow-hidden transition-all ${isUDLGuideExpanded ? 'inset-4 top-24' : 'top-24 right-4 bottom-4 w-96'} ${isSpotlightMode ? 'opacity-20 hover:opacity-100 pointer-events-none hover:pointer-events-auto' : 'opacity-100'} ${chatStyles.container}`}>
          <div className={`p-4 flex justify-between items-center shrink-0 ${chatStyles.header}`}>
            <div className="flex items-center gap-2 font-bold">
               <HelpCircle size={18} /> {t('chat_guide.header')}
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    data-help-key="chat_voice_mode"
                    onClick={(e) => {
                        if (isHelpMode) return;
                        e.preventDefault();
                        const newState = !isConversationMode;
                        setIsConversationMode(newState);
                        if (newState) {
                            setIsDictationMode(true);
                            setIsBotVisible(true);
                        }
                    }}
                    className={`hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${isConversationMode ? 'bg-green-700 text-white border-green-400' : 'border-transparent'}`}
                    title={isConversationMode ? t('chat_guide.voice_disable') : t('chat_guide.voice_enable')}
                >
                    <Headphones size={12}/> {isConversationMode ? t('chat_guide.voice_on') : t('chat_guide.voice_mode')}
                </button>
                {isConversationMode && (
                    <button
                        data-help-key="chat_auto_send"
                        onClick={handleToggleAutoSendVoice}
                        className={`hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${autoSendVoice ? 'bg-teal-700 text-white border-teal-400' : 'border-transparent opacity-80'}`}
                        title={t('chat_guide.auto_send_tooltip')}
                        aria-label={t('chat_guide.auto_send_tooltip')}
                    >
                        {autoSendVoice ? <Zap size={12} className="fill-current"/> : <Zap size={12}/>}
                        {autoSendVoice ? t('chat_guide.auto_send_on') : t('chat_guide.auto_send_off')}
                    </button>
                )}
                <button
                    data-help-key="chat_save"
                    onClick={() => saveFullChat()}
                    className="hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border-transparent"
                    title={t('common.save_conversation_to_history')}
                    aria-label={t('common.save_conversation_to_history')}
                >
                    <Save size={12}/> {t('chat_guide.save_chat')}
                </button>
                <button
                    aria-label={t('common.show')}
                    data-help-key="chat_show_me"
                    onClick={handleToggleIsShowMeMode}
                    className={`hover:bg-white/20 p-1.5 rounded transition-colors mr-1 flex items-center gap-1 text-[11px] font-bold border ${isShowMeMode ? 'bg-yellow-400 text-indigo-900 border-yellow-500' : 'border-transparent'}`}
                    title={isShowMeMode ? t('chat_guide.show_me_disable_tooltip') : t('chat_guide.show_me_enable_tooltip')}
                >
                    <Eye size={12}/> {isShowMeMode ? t('chat_guide.show_me_on') : t('chat_guide.show_me')}
                </button>
                <button
                    aria-label={t('common.minimize')}
                    data-help-key="chat_expand"
                    onClick={handleToggleIsUDLGuideExpanded}
                    className="hover:bg-white/20 p-1 rounded transition-colors"
                    title={isUDLGuideExpanded ? t('common.minimize') : t('common.maximize')}
                >
                    {isUDLGuideExpanded ? <Minimize size={18}/> : <Maximize size={18}/>}
                </button>
                <button data-help-key="chat_close" onClick={handleSetShowUDLGuideToFalse} className="hover:bg-white/20 p-1 rounded" aria-label={t('common.close')}><X size={18}/></button>
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
                  <div className="w-full max-w-[95%]">
                      <InteractiveBlueprintCard
                          config={activeBlueprint}
                          onUpdate={handleBlueprintUIUpdate}
                          onConfirm={handleExecuteBlueprint}
                          onCancel={() => {
                              setUdlMessages(prev => [...prev, { role: 'model', text: t('blueprint.cancel_msg') }]);
                              setActiveBlueprint(null);
                          }}
                      />
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
          {isChatProcessing && (
            <div className="flex items-start">
               <div className={`p-3 rounded-xl rounded-bl-none flex items-center gap-2 text-sm ${chatStyles.modelBubble}`}>
                  <RefreshCw size={14} className="animate-spin" /> {t('bot.mood_thinking')}
               </div>
            </div>
          )}
        </div>
        <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} ${chatStyles.inputArea}`}>
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

// ── AIBackendModal (AI Backend Modal) — gate: showAIBackendModal && !_isCanvasEnv ──
function AIBackendModal(props) {
  const {
    _isCanvasEnv, ai,
    setShowAIBackendModal, showAIBackendModal, t
  } = props;
  if (!(showAIBackendModal && !_isCanvasEnv)) return null;
  return (
        <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowAIBackendModal(false)}>
          <div data-help-key="ai_backend_modal_panel" className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAIBackendModal(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10" aria-label={t('common.close') || "Close"}><X size={20}/></button>
            <div className="flex items-center gap-2 mb-6 text-violet-900">
                <div className="bg-violet-100 p-2 rounded-full"><Unplug size={20} className="text-violet-600"/></div>
                <h3 className="font-black text-lg">{t('ai_backend.title') || 'AI Backend Settings'}</h3>
            </div>
            <div className="space-y-4">
                {/* ─── Section 1: Provider & Connection ─── */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.provider_label') || 'Provider'}</label>
                    <select
                        data-help-key="ai_backend_provider_select"
                        aria-label={t('ai_backend.provider_aria') || 'AI Backend Provider'}
                        id="ai-backend-provider"
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').backend || 'gemini'; } catch { return 'gemini'; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            const defaults = { gemini: '', localai: 'http://localhost:8080', ollama: 'http://localhost:11434', openai: 'https://api.openai.com', claude: 'https://api.anthropic.com', 'onnx-npu': 'http://localhost:11435', custom: 'http://localhost:8080' };
                            const updated = { ...current, backend: e.target.value, baseUrl: defaults[e.target.value] || '' };
                            localStorage.setItem('alloflow_ai_config', JSON.stringify(updated));
                            const urlEl = document.getElementById('ai-backend-url');
                            if (urlEl) urlEl.value = updated.baseUrl || '';
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-bold text-slate-700 bg-white cursor-pointer"
                    >
                        <option value="gemini">✨ Gemini (Google) — Default</option>
                        <option value="localai">🖥️ LocalAI (Self-Hosted GPU)</option>
                        <option value="ollama">🦙 Ollama (Local)</option>
                        <option value="openai">🤖 OpenAI</option>
                        <option value="claude">🧠 Claude (Anthropic)</option>
                        <option value="onnx-npu">🧠 On-Device NPU (Snapdragon)</option>
                        <option value="custom">⚙️ Custom Endpoint</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.server_url_label') || 'Server URL'}</label>
                    <input
                        data-help-key="ai_backend_custom_url_input"
                        id="ai-backend-url" aria-label={t('ai_backend.server_url_aria') || 'Custom AI backend URL'}
                        type="text"
                        placeholder="http://localhost:8080"
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').baseUrl || ''; } catch { return ''; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, baseUrl: e.target.value }));
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.api_key_label') || 'API Key'} <span className="normal-case font-normal text-slate-600">{t('ai_backend.api_key_hint') || '(cloud providers only)'}</span></label>
                    <input
                        data-help-key="ai_backend_api_key_input"
                        id="ai-backend-apikey" aria-label={t('ai_backend.api_key_aria') || 'Custom AI backend API key'}
                        type="password"
                        autoComplete="off"
                        placeholder={t('ai_backend.api_key_placeholder') || 'Your API key...'}
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').apiKey || ''; } catch { return ''; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, apiKey: e.target.value }));
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('ai_backend.wolfram_label') || 'Wolfram Alpha App ID'} <span className="normal-case font-normal text-slate-600">{t('ai_backend.wolfram_hint') || '(optional — enhances math)'}</span></label>
                    <input
                        data-help-key="ai_backend_wolfram_input"
                        id="ai-backend-wolfram" aria-label={t('ai_backend.wolfram_aria') || 'Custom backend Wolfram App ID'}
                        type="text"
                        placeholder={t('ai_backend.wolfram_placeholder') || 'XXXXX-XXXXXXXXXX (from developer.wolframalpha.com)'}
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').wolframAppId || ''; } catch { return ''; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, wolframAppId: e.target.value }));
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
                    />
                    <p className="text-[11px] text-slate-600 mt-1">{t('ai_backend.wolfram_free_note') || 'Free: 2,000 queries/month • Adds exact math solving & step-by-step verification'}</p>
                </div>
                <div className="flex gap-2 pt-1">
                    <button
                        data-help-key="ai_backend_test_connection_btn"
                        id="ai-backend-test"
                        onClick={async () => {
                            const btn = document.getElementById('ai-backend-test');
                            const status = document.getElementById('ai-backend-status');
                            btn.disabled = true;
                            btn.textContent = '⏳ Testing...';
                            if (status) { status.textContent = ''; status.className = ''; }
                            try {
                                const result = await ai.testConnection();
                                if (result.success) {
                                    if (status) { status.textContent = '✅ Connected! ' + result.modelCount + ' model(s) available'; status.className = 'text-xs font-bold mt-2 text-green-800 bg-green-50 p-2.5 rounded-xl border border-green-100'; }
                                    const modelSelect = document.getElementById('ai-backend-model-default');
                                    const fallbackSelect = document.getElementById('ai-backend-model-fallback');
                                    if (modelSelect && result.models?.length > 0) {
                                        modelSelect.innerHTML = '<option value="">Auto (server default)</option>' + result.models.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
                                        const cfg = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                                        if (cfg.models?.default) modelSelect.value = cfg.models.default;
                                    }
                                    if (fallbackSelect && result.models?.length > 0) {
                                        fallbackSelect.innerHTML = '<option value="">Same as default</option>' + result.models.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
                                        const cfg = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                                        if (cfg.models?.fallback) fallbackSelect.value = cfg.models.fallback;
                                    }
                                } else {
                                    if (status) { status.textContent = '❌ Failed: ' + result.error; status.className = 'text-xs font-bold mt-2 text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100'; }
                                }
                            } catch (err) {
                                if (status) { status.textContent = '❌ Error: ' + err.message; status.className = 'text-xs font-bold mt-2 text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100'; }
                            }
                            btn.disabled = false;
                            btn.textContent = '🔌 Test Connection';
                        }}
                        className="flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95"
                    >
                        🔌 Test Connection
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem('alloflow_ai_config');
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
                            if (s) { s.textContent = '🔄 Reset to defaults — reload page to apply'; s.className = 'text-xs font-bold mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100'; }
                        }}
                        className="bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all active:scale-95"
                    >
                        ↩ Reset
                    </button>
                </div>
                <div id="ai-backend-status"></div>

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
                                defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').models?.default || ''; } catch { return ''; } })()}
                                onChange={(e) => {
                                    const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                                    const models = { ...(current.models || {}), default: e.target.value || undefined };
                                    if (!e.target.value) delete models.default;
                                    localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, models }));
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
                                defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').models?.fallback || ''; } catch { return ''; } })()}
                                onChange={(e) => {
                                    const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                                    const models = { ...(current.models || {}), fallback: e.target.value || undefined };
                                    if (!e.target.value) delete models.fallback;
                                    localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, models }));
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
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').ttsProvider || 'auto'; } catch { return 'auto'; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, ttsProvider: e.target.value }));
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
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').imageProvider || 'auto'; } catch { return 'auto'; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, imageProvider: e.target.value }));
                        }}
                        className="w-full p-2 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
                    >
                        <option value="auto">🔄 Auto (match backend)</option>
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

                {/* ─── Active Config Summary ─── */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        <strong className="text-slate-600">Active:</strong>{' '}
                        {(() => { try { const c = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}'); return c.backend ? (c.backend.charAt(0).toUpperCase() + c.backend.slice(1)) + (c.baseUrl ? ' → ' + c.baseUrl : '') : 'Gemini (default)'; } catch { return 'Gemini (default)'; } })()}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium mt-1">⚡ Reload page after changing backend to apply.</p>
                </div>
            </div>
          </div>
        </div>
  );
}
