/**
 * AlloFlow — Socratic Chat Module
 *
 * Draggable, expandable Socratic-tutor chat panel that lives in the
 * bottom-right of the student view. Includes mic dictation, auto-read TTS
 * toggle, auto-send-on-pause toggle, expand/collapse, and a scrolling
 * message history with markdown rendering.
 *
 * Extracted from AlloFlowANTI.txt lines 24201-24320 (May 2026).
 *
 * Required props (28):
 *   handleSetShowSocraticChatToFalse, handleSocraticSubmit,
 *   handleToggleIsSocraticExpanded, handleToggleSocraticAutoRead,
 *   handleToggleSocraticAutoSend, isSocraticDictating, isSocraticDragging,
 *   isSocraticExpanded, isSocraticThinking, isTeacherMode, recognitionRef,
 *   renderFormattedText, setIsSocraticDictating, setIsSocraticDragging,
 *   setSocraticInput, showSocraticChat, socraticAutoRead, socraticAutoSend,
 *   socraticChatRef, socraticDragOffset, socraticInput, socraticLivePos,
 *   socraticMessages, socraticPosition, socraticScrollRef,
 *   studentProjectSettings, t, warnLog
 *
 * Icons (from window globals): MessageCircleQuestion, Volume2, Mic,
 * Maximize2, Minimize2, X, RefreshCw, Send
 */
function SocraticChat({
  alloBotRef = null,
  chatStyles = {},
  handleSetShowSocraticChatToFalse,
  handleSocraticSubmit,
  handleToggleIsSocraticExpanded,
  handleToggleSocraticAutoRead,
  handleToggleSocraticAutoSend,
  isSocraticDictating,
  isSocraticDragging,
  isSocraticExpanded,
  isSocraticThinking,
  recognitionRef,
  renderFormattedText,
  setIsSocraticDictating,
  setIsSocraticDragging,
  setSocraticInput,
  socraticAutoRead,
  socraticAutoSend,
  socraticChatRef,
  socraticDragOffset,
  socraticInput,
  socraticLivePos,
  socraticMessages,
  socraticPosition,
  socraticScrollRef,
  t,
  warnLog,
}) {
  const noop = () => null;
  const MessageCircleQuestion = window.MessageCircleQuestion || noop;
  const Volume2 = window.Volume2 || noop;
  const Mic = window.Mic || noop;
  const Maximize2 = window.Maximize2 || noop;
  const Minimize2 = window.Minimize2 || noop;
  const X = window.X || noop;
  const RefreshCw = window.RefreshCw || noop;
  const Send = window.Send || noop;
  const previousFocusRef = React.useRef(typeof document !== 'undefined' ? document.activeElement : null);
  const socraticInputRef = React.useRef(null);
  const isComposingRef = React.useRef(false);
  const isDictatingRef = React.useRef(!!isSocraticDictating);
  isDictatingRef.current = !!isSocraticDictating;
  const bionicOn = (typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function') ? window.__alloUseBionic() : false;
  const bt = s => (bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function') ? window.__alloBionicReact(s) : s;
  React.useEffect(() => () => {
    if (isDictatingRef.current) {
      try { if (typeof setIsSocraticDictating === 'function') setIsSocraticDictating(false); } catch (_) {}
      try { if (recognitionRef && recognitionRef.current && typeof recognitionRef.current.stop === 'function') recognitionRef.current.stop(); } catch (_) {}
    }
    const prev = previousFocusRef.current;
    if (prev && prev.isConnected && typeof prev.focus === 'function') {
      try { prev.focus(); } catch (_) {}
    } else if (typeof document !== 'undefined') {
      try { document.querySelector('[data-help-key="socratic_toggle"]')?.focus(); } catch (_) {}
    }
  }, []);

  // Theme-aware classes: fall back to the original teal-on-white styling when
  // chatStyles is empty (e.g., before the host wires it through), so the
  // component still renders in any state. When chatStyles is provided, the
  // container / body / bubbles / input area follow the active theme +
  // colorOverlay. Teal accent on header buttons, send button, and user
  // bubble is preserved for Socratic's brand identity in light mode; for
  // dark / contrast themes we hand off to chatStyles since the teal would
  // be illegible against those backgrounds.
  const _container = chatStyles.container || 'bg-white border-2 border-teal-500 shadow-2xl';
  const _header = chatStyles.header || 'bg-teal-700 text-white';
  const _body = chatStyles.body || 'bg-slate-50';
  const _modelBubble = chatStyles.modelBubble || 'bg-white text-slate-700 border border-slate-400';
  const _userBubble = chatStyles.userBubble || 'bg-teal-700 text-white';
  const _inputArea = chatStyles.inputArea || 'bg-white border-t border-slate-100';
  const _input = chatStyles.input || 'bg-white border-slate-400 text-slate-800 focus:ring-teal-200 focus:border-teal-400';
  const _thinkingBubble = chatStyles.modelBubble || 'bg-white border border-slate-400 text-slate-600';
  const _button = chatStyles.button || 'bg-teal-700 text-white hover:bg-teal-800';
  const _secondaryButton = chatStyles.secondaryButton || 'hover:bg-teal-700 text-teal-100 hover:text-white';
  const _inputMicButton = chatStyles.secondaryButton || 'text-teal-800 bg-slate-100 hover:bg-teal-100';
  const titleId = 'socratic-chat-title';
  const descId = 'socratic-chat-desc';
  const logId = 'socratic-chat-log';
  const socraticLabel = (key, fallback, vars) => {
    try {
      const translated = typeof t === 'function' ? t(key, vars) : '';
      if (typeof translated === 'string' && translated && translated !== key) return translated;
    } catch (_) {}
    let out = fallback;
    if (vars && typeof vars === 'object') {
      Object.keys(vars).forEach((k) => {
        out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k] == null ? '' : vars[k]));
      });
    }
    return out;
  };
  const readSocraticAiAvailable = () => {
    try {
      if (typeof window === 'undefined') return true;
      if (typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable('text', window.callGemini);
      if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window._alloQrBlocked === true) return false;
      if (typeof window.callGemini === 'function' && window.callGemini._alloQrBlocked === true) return false;
      return true;
    } catch (_) { return true; }
  };
  const [socraticAiAvailable, setSocraticAiAvailable] = React.useState(readSocraticAiAvailable);
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncAi = () => setSocraticAiAvailable(readSocraticAiAvailable());
    syncAi();
    window.addEventListener('alloflow:ai-config-changed', syncAi);
    window.addEventListener('alloflow:student-ai-config-changed', syncAi);
    window.addEventListener('alloflow:ai-key-lock-changed', syncAi);
    return () => {
      window.removeEventListener('alloflow:ai-config-changed', syncAi);
      window.removeEventListener('alloflow:student-ai-config-changed', syncAi);
      window.removeEventListener('alloflow:ai-key-lock-changed', syncAi);
    };
  }, []);
  const canDictate = Boolean(recognitionRef && recognitionRef.current);
  const [viewportSize, setViewportSize] = React.useState(() => ({
    w: typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 768,
  }));
  const hasCustomPos = Boolean(socraticPosition && socraticPosition.x !== null && socraticPosition.y !== null);
  React.useEffect(() => {
    if (!hasCustomPos || typeof window === 'undefined') return undefined;
    const onResize = () => setViewportSize({ w: window.innerWidth || 1024, h: window.innerHeight || 768 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [hasCustomPos]);
  const viewportW = viewportSize.w;
  const viewportH = viewportSize.h;
  const panelW = Math.min(Math.max(200, viewportW - 16), isSocraticExpanded ? 768 : 320);
  const panelH = Math.min(Math.max(220, viewportH - 16), isSocraticExpanded ? 704 : 448);
  const clampedX = hasCustomPos ? Math.min(Math.max(8, viewportW - panelW - 8), Math.max(8, Number(socraticPosition.x) || 8)) : null;
  const clampedY = hasCustomPos ? Math.min(Math.max(8, viewportH - panelH - 8), Math.max(8, Number(socraticPosition.y) || 8)) : null;
  const defaultRight = viewportW < 440 ? '0.5rem' : '6rem';
  const defaultBottom = viewportH < 520 ? '0.5rem' : '6rem';
  const _speakSocraticMessage = (text) => {
    const cleanText = String(text || '')
      .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`~#>]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return;
    if (alloBotRef && alloBotRef.current && typeof alloBotRef.current.speak === 'function') {
      alloBotRef.current.speak(cleanText);
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(cleanText));
      }
    } catch (err) {
      if (typeof warnLog === 'function') warnLog('Socratic TTS replay failed:', err && err.message ? err.message : err);
    }
  };
  const startSocraticDrag = (clientX, clientY, targetEl, currentTargetEl) => {
    if (targetEl && targetEl.closest && targetEl.closest('button')) return false;
    setIsSocraticDragging(true);
    const rect = currentTargetEl.parentElement.getBoundingClientRect();
    if (socraticDragOffset) socraticDragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    if (socraticLivePos) socraticLivePos.current = { x: rect.left, y: rect.top };
    return true;
  };
  const handleSubmitForm = (e) => {
    if (e?.nativeEvent?.isComposing || isComposingRef.current) { e.preventDefault(); return; }
    e.preventDefault();
    if (!socraticAiAvailable || !String(socraticInput || '').trim() || isSocraticThinking) return;
    handleSocraticSubmit();
  };
  const safeMessages = Array.isArray(socraticMessages) ? socraticMessages : [];

  return (
    <div
      ref={socraticChatRef}
      className={`fixed z-[110] ${_container} rounded-2xl flex flex-col overflow-hidden animate-in motion-reduce:animate-none slide-in-from-bottom-10 fade-in duration-300 ${isSocraticExpanded ? 'w-[48rem] h-[44rem]' : 'w-80 h-[28rem]'} max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)]`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !(e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || isComposingRef.current) && typeof handleSetShowSocraticChatToFalse === 'function') {
          e.stopPropagation();
          handleSetShowSocraticChatToFalse();
        }
      }}
      style={{
        right: clampedX !== null ? 'auto' : defaultRight,
        bottom: clampedY !== null ? 'auto' : defaultBottom,
        left: clampedX !== null ? `${clampedX}px` : 'auto',
        top: clampedY !== null ? `${clampedY}px` : 'auto',
        cursor: isSocraticDragging ? 'grabbing' : 'auto',
        willChange: isSocraticDragging ? 'left, top' : 'auto',
      }}
    >
      <p id={descId} className="sr-only">{t('socratic.placeholder')}</p>
      <div
        className={`p-3 flex justify-between items-center shrink-0 cursor-grab active:cursor-grabbing select-none touch-none ${_header}`}
        onMouseDown={(e) => {
          if (startSocraticDrag(e.clientX, e.clientY, e.target, e.currentTarget)) e.preventDefault();
        }}
        onTouchStart={(e) => {
          const touch = e.touches && e.touches[0];
          if (touch) startSocraticDrag(touch.clientX, touch.clientY, e.target, e.currentTarget);
        }}
        title={t('socratic.drag_hint')}
      >
        <h3 id={titleId} className="font-bold text-sm flex items-center gap-2">
          <MessageCircleQuestion size={18} aria-hidden="true"/> {t('socratic.title')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleSocraticAutoRead}
            data-help-key="socratic_auto_read"
            className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${socraticAutoRead ? _button : _secondaryButton}`}
            title={t('socratic.auto_read')}
            aria-label={t('socratic.auto_read')}
            aria-pressed={socraticAutoRead}
          >
            <Volume2 size={14} aria-hidden="true"/>
          </button>
          <button
            type="button"
            onClick={handleToggleSocraticAutoSend}
            disabled={!canDictate}
            data-help-key="socratic_auto_send"
            className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${socraticAutoSend && canDictate ? _button : _secondaryButton}`}
            title={canDictate ? t('socratic.auto_send') : socraticLabel('socratic.mic_unavailable', 'Voice input is not supported in this browser')}
            aria-label={t('socratic.auto_send')}
            aria-pressed={socraticAutoSend && canDictate}
          >
            <Mic size={14} aria-hidden="true"/>
          </button>
          <button
            type="button"
            onClick={handleToggleIsSocraticExpanded}
            data-help-key="socratic_expand"
            className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${_secondaryButton}`}
            title={isSocraticExpanded ? t('socratic.collapse_tooltip') : t('socratic.expand_tooltip')}
            aria-label={isSocraticExpanded ? t('socratic.collapse_tooltip') : t('socratic.expand_tooltip')}
            aria-expanded={isSocraticExpanded}
          >
            {isSocraticExpanded ? <Minimize2 size={14} aria-hidden="true"/> : <Maximize2 size={14} aria-hidden="true"/>}
          </button>
          <button type="button" data-help-key="socratic_close" data-help-ignore onClick={handleSetShowSocraticChatToFalse} className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${_secondaryButton}`} aria-label={t('common.close')}>
            <X size={14} aria-hidden="true"/>
          </button>
        </div>
      </div>
      <div
        id={logId}
        className={`flex-1 overflow-y-auto p-4 ${_body} space-y-3 custom-scrollbar`}
        ref={socraticScrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={t('socratic.title')}
      >
        {!socraticAiAvailable && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
            {socraticLabel('socratic.ai_unavailable', 'AI tutor is currently unavailable (AI is off or locked). Existing messages remain readable below.')}
          </div>
        )}
        {safeMessages.length === 0 && !isSocraticThinking && (
          <div className={`${_modelBubble} p-3 rounded-xl text-xs leading-relaxed opacity-95`}>
            <p>{socraticLabel('socratic.empty_welcome', 'Ask a question about this lesson or share your thinking to get a guiding prompt.')}</p>
            {socraticAiAvailable && typeof setSocraticInput === 'function' && (
              <div data-socratic-starters className="mt-2.5 flex flex-col gap-1.5" role="group" aria-label={socraticLabel('socratic.starters_label', 'Starter prompts')}>
                {[
                  socraticLabel('socratic.starter_simpler', 'Can you explain this part in simpler words?'),
                  socraticLabel('socratic.starter_hint', 'Give me a small hint on where to start.'),
                  socraticLabel('socratic.starter_check', 'Ask me a question to check my understanding.'),
                ].map((starter, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-socratic-starter={idx}
                    onClick={() => {
                      setSocraticInput(starter);
                      try { socraticInputRef.current?.focus(); } catch (_) {}
                    }}
                    className={`min-h-11 w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors motion-reduce:transition-none hover:opacity-100 opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${_modelBubble}`}
                  >
                    {bt(starter)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {safeMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-2.5 rounded-xl text-xs shadow-sm leading-relaxed ${msg.role === 'user' ? `${_userBubble} rounded-br-none` : `${_modelBubble} rounded-bl-none`}`}>
              <div>{msg.role === 'user' ? bt(msg.text) : (typeof renderFormattedText === 'function' ? renderFormattedText(msg.text) : bt(msg.text))}</div>
              {msg.role !== 'user' && msg.text && (
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => _speakSocraticMessage(msg.text)}
                    className="inline-flex items-center gap-1 min-h-11 px-2.5 py-0.5 rounded text-[11px] opacity-80 hover:opacity-100 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    aria-label={socraticLabel('socratic.listen_reply', 'Read tutor reply aloud')}
                    title={socraticLabel('socratic.listen_reply', 'Read tutor reply aloud')}
                  >
                    <Volume2 size={12} aria-hidden="true"/>
                    <span>{socraticLabel('common.listen', 'Listen')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isSocraticThinking && (
          <div className="flex items-start" role="status" aria-live="polite">
            <div className={`${_thinkingBubble} p-2 rounded-xl rounded-bl-none text-xs italic flex items-center gap-1 shadow-sm`}>
              <RefreshCw size={10} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> {t('socratic.thinking')}
            </div>
          </div>
        )}
      </div>
      <form className={`p-3 ${_inputArea} flex gap-2 shrink-0`} onSubmit={handleSubmitForm}>
        <button
          type="button"
          onClick={() => {
            if (!canDictate || !socraticAiAvailable) return;
            if (isSocraticDictating) {
              setIsSocraticDictating(false);
              try { if (recognitionRef && recognitionRef.current) recognitionRef.current.stop(); } catch (_) {}
            } else {
              if (!recognitionRef || !recognitionRef.current) return;
              setIsSocraticDictating(true);
              try {
                recognitionRef.current.start();
              } catch(e) {
                setIsSocraticDictating(false);
                if (typeof warnLog === 'function') warnLog('Caught error:', e?.message || e);
              }
            }
          }}
          disabled={isSocraticThinking || !canDictate || !socraticAiAvailable}
          className={`min-w-11 min-h-11 p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${isSocraticDictating ? 'bg-red-700 text-white animate-pulse motion-reduce:animate-none' : _inputMicButton}`}
          title={canDictate ? t('socratic.mic_tooltip') : socraticLabel('socratic.mic_unavailable', 'Voice input is not supported in this browser')}
          aria-label={canDictate ? t('socratic.mic_tooltip') : socraticLabel('socratic.mic_unavailable', 'Voice input is not supported in this browser')}
          aria-pressed={isSocraticDictating}
        >
          <Mic size={16} aria-hidden="true"/>
        </button>
        <input ref={socraticInputRef} aria-label={t('common.enter_socratic_input')}
          data-help-key="socratic_input"
          type="text"
          maxLength={2000}
          value={socraticInput}
          onChange={(e) => setSocraticInput(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.nativeEvent?.keyCode === 229 || isComposingRef.current)) { e.preventDefault(); } }}
          placeholder={isSocraticDictating ? t('socratic.listening') : t('socratic.placeholder')}
          className={`flex-grow min-h-11 text-xs p-2 border ${_input} rounded-lg focus-visible:ring-2 focus-visible:outline-none transition-all`}
          autoFocus
          disabled={isSocraticThinking || !socraticAiAvailable}
          aria-controls={logId}
        />
        <button
          type="submit"
          aria-label={t('common.socratic_submit')}
          disabled={!socraticAiAvailable || !String(socraticInput || '').trim() || isSocraticThinking}
          className={`min-w-11 min-h-11 p-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${_button}`}
        >
          {isSocraticThinking ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Send size={16} aria-hidden="true"/>}
        </button>
      </form>
    </div>
  );
}
