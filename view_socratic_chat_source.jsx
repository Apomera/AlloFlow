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

  // Theme-aware classes: fall back to the original teal-on-white styling when
  // chatStyles is empty (e.g., before the host wires it through), so the
  // component still renders in any state. When chatStyles is provided, the
  // container / body / bubbles / input area follow the active theme +
  // colorOverlay. Teal accent on header buttons, send button, and user
  // bubble is preserved for Socratic's brand identity in light mode; for
  // dark / contrast themes we hand off to chatStyles since the teal would
  // be illegible against those backgrounds.
  const _container = chatStyles.container || 'bg-white border-2 border-teal-500 shadow-2xl';
  const _header = chatStyles.header || 'bg-teal-600 text-white';
  const _body = chatStyles.body || 'bg-slate-50';
  const _modelBubble = chatStyles.modelBubble || 'bg-white text-slate-700 border border-slate-400';
  const _userBubble = chatStyles.userBubble || 'bg-teal-700 text-white';
  const _inputArea = chatStyles.inputArea || 'bg-white border-t border-slate-100';
  const _input = chatStyles.input || 'bg-white border-slate-400 text-slate-800 focus:ring-teal-200 focus:border-teal-400';
  const _thinkingBubble = chatStyles.modelBubble || 'bg-white border border-slate-400 text-slate-600';
  const _button = chatStyles.button || 'bg-teal-700 text-white hover:bg-teal-800';
  const _secondaryButton = chatStyles.secondaryButton || 'hover:bg-teal-700 text-teal-100 hover:text-white';
  const titleId = 'socratic-chat-title';
  const descId = 'socratic-chat-desc';
  const logId = 'socratic-chat-log';
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!socraticInput.trim() || isSocraticThinking) return;
    handleSocraticSubmit();
  };

  return (
    <div
      ref={socraticChatRef}
      className={`fixed z-[110] ${_container} rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ${isSocraticExpanded ? 'w-[48rem] h-[44rem]' : 'w-80 h-[28rem]'}`}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      style={{
        right: socraticPosition.x !== null ? 'auto' : '6rem',
        bottom: socraticPosition.y !== null ? 'auto' : '6rem',
        left: socraticPosition.x !== null ? `${socraticPosition.x}px` : 'auto',
        top: socraticPosition.y !== null ? `${socraticPosition.y}px` : 'auto',
        cursor: isSocraticDragging ? 'grabbing' : 'auto',
        willChange: isSocraticDragging ? 'left, top' : 'auto',
      }}
    >
      <p id={descId} className="sr-only">{t('socratic.placeholder')}</p>
      <div
        className={`p-3 flex justify-between items-center shrink-0 cursor-grab active:cursor-grabbing select-none ${_header}`}
        onMouseDown={(e) => {
          if (e.target.closest('button')) return;
          e.preventDefault();
          setIsSocraticDragging(true);
          const rect = e.currentTarget.parentElement.getBoundingClientRect();
          socraticDragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          socraticLivePos.current = { x: rect.left, y: rect.top };
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
            className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${socraticAutoRead ? _button : _secondaryButton}`}
            title={t('socratic.auto_read')}
            aria-label={t('socratic.auto_read')}
            aria-pressed={socraticAutoRead}
          >
            <Volume2 size={14} aria-hidden="true"/>
          </button>
          <button
            type="button"
            onClick={handleToggleSocraticAutoSend}
            data-help-key="socratic_auto_send"
            className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${socraticAutoSend ? _button : _secondaryButton}`}
            title={t('socratic.auto_send')}
            aria-label={t('socratic.auto_send')}
            aria-pressed={socraticAutoSend}
          >
            <Mic size={14} aria-hidden="true"/>
          </button>
          <button
            type="button"
            onClick={handleToggleIsSocraticExpanded}
            data-help-key="socratic_expand"
            className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${_secondaryButton}`}
            title={isSocraticExpanded ? t('socratic.collapse_tooltip') : t('socratic.expand_tooltip')}
            aria-label={isSocraticExpanded ? t('socratic.collapse_tooltip') : t('socratic.expand_tooltip')}
            aria-expanded={isSocraticExpanded}
          >
            {isSocraticExpanded ? <Minimize2 size={14} aria-hidden="true"/> : <Maximize2 size={14} aria-hidden="true"/>}
          </button>
          <button type="button" data-help-key="socratic_close" data-help-ignore onClick={handleSetShowSocraticChatToFalse} className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${_secondaryButton}`} aria-label={t('common.close')}>
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
        {socraticMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-2.5 rounded-xl text-xs shadow-sm leading-relaxed ${msg.role === 'user' ? `${_userBubble} rounded-br-none` : `${_modelBubble} rounded-bl-none`}`}>
              {msg.role === 'user' ? msg.text : renderFormattedText(msg.text)}
            </div>
          </div>
        ))}
        {isSocraticThinking && (
          <div className="flex items-start" role="status" aria-live="polite">
            <div className={`${_thinkingBubble} p-2 rounded-xl rounded-bl-none text-xs italic flex items-center gap-1 shadow-sm`}>
              <RefreshCw size={10} className="animate-spin" aria-hidden="true"/> {t('socratic.thinking')}
            </div>
          </div>
        )}
      </div>
      <form className={`p-3 ${_inputArea} flex gap-2 shrink-0`} onSubmit={handleSubmitForm}>
        <button
          type="button"
          onClick={() => {
            if (isSocraticDictating) {
              setIsSocraticDictating(false);
              if (recognitionRef.current) recognitionRef.current.stop();
            } else {
              setIsSocraticDictating(true);
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch(e) { warnLog('Caught error:', e?.message || e); }
              }
            }
          }}
          disabled={isSocraticThinking}
          className={`p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${isSocraticDictating ? 'bg-red-700 text-white animate-pulse' : _secondaryButton}`}
          title={t('socratic.mic_tooltip')}
          aria-label={t('socratic.mic_tooltip')}
          aria-pressed={isSocraticDictating}
        >
          <Mic size={16} aria-hidden="true"/>
        </button>
        <input aria-label={t('common.enter_socratic_input')}
          data-help-key="socratic_input"
          type="text"
          value={socraticInput}
          onChange={(e) => setSocraticInput(e.target.value)}
          placeholder={isSocraticDictating ? t('socratic.listening') : t('socratic.placeholder')}
          className={`flex-grow text-xs p-2 border ${_input} rounded-lg focus-visible:ring-2 focus-visible:outline-none transition-all`}
          autoFocus
          disabled={isSocraticThinking}
          aria-controls={logId}
        />
        <button
          type="submit"
          aria-label={t('common.socratic_submit')}
          disabled={!socraticInput.trim() || isSocraticThinking}
          className={`p-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${_button}`}
        >
          {isSocraticThinking ? <RefreshCw size={16} className="animate-spin" aria-hidden="true"/> : <Send size={16} aria-hidden="true"/>}
        </button>
      </form>
    </div>
  );
}
