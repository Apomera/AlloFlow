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

  return (
    <div
      ref={socraticChatRef}
      className={`fixed z-[110] bg-white rounded-2xl shadow-2xl border-2 border-teal-500 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ${isSocraticExpanded ? 'w-[48rem] h-[44rem]' : 'w-80 h-[28rem]'}`}
      style={{
        right: socraticPosition.x !== null ? 'auto' : '6rem',
        bottom: socraticPosition.y !== null ? 'auto' : '6rem',
        left: socraticPosition.x !== null ? `${socraticPosition.x}px` : 'auto',
        top: socraticPosition.y !== null ? `${socraticPosition.y}px` : 'auto',
        cursor: isSocraticDragging ? 'grabbing' : 'auto',
        willChange: isSocraticDragging ? 'left, top' : 'auto',
      }}
    >
      <div
        className="bg-teal-600 p-3 text-white flex justify-between items-center shrink-0 cursor-grab active:cursor-grabbing select-none"
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
        <h3 className="font-bold text-sm flex items-center gap-2">
          <MessageCircleQuestion size={18} className="text-teal-100"/> {t('socratic.title')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleSocraticAutoRead}
            data-help-key="socratic_auto_read"
            className={`p-1.5 rounded transition-colors ${socraticAutoRead ? 'bg-teal-400 text-white' : 'hover:bg-teal-700 text-teal-100'}`}
            title={t('socratic.auto_read')}
            aria-label={t('socratic.auto_read')}
          >
            <Volume2 size={14}/>
          </button>
          <button
            onClick={handleToggleSocraticAutoSend}
            data-help-key="socratic_auto_send"
            className={`p-1.5 rounded transition-colors ${socraticAutoSend ? 'bg-teal-400 text-white' : 'hover:bg-teal-700 text-teal-100'}`}
            title={t('socratic.auto_send')}
            aria-label={t('socratic.auto_send')}
          >
            <Mic size={14}/>
          </button>
          <button
            onClick={handleToggleIsSocraticExpanded}
            data-help-key="socratic_expand"
            className="p-1.5 rounded hover:bg-teal-700 text-teal-100 hover:text-white transition-colors"
            title={isSocraticExpanded ? t('socratic.collapse_tooltip') : t('socratic.expand_tooltip')}
            aria-label={isSocraticExpanded ? t('socratic.collapse_tooltip') : t('socratic.expand_tooltip')}
          >
            {isSocraticExpanded ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </button>
          <button data-help-key="socratic_close" data-help-ignore onClick={handleSetShowSocraticChatToFalse} className="hover:bg-teal-700 p-1.5 rounded text-teal-100 hover:text-white transition-colors" aria-label={t('common.close')}>
            <X size={14}/>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 custom-scrollbar" ref={socraticScrollRef}>
        {socraticMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-2.5 rounded-xl text-xs shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-teal-700 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-400 rounded-bl-none'}`}>
              {msg.role === 'user' ? msg.text : renderFormattedText(msg.text)}
            </div>
          </div>
        ))}
        {isSocraticThinking && (
          <div className="flex items-start">
            <div className="bg-white p-2 rounded-xl border border-slate-400 rounded-bl-none text-xs text-slate-600 italic flex items-center gap-1 shadow-sm">
              <RefreshCw size={10} className="animate-spin"/> {t('socratic.thinking')}
            </div>
          </div>
        )}
      </div>
      <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
        <button
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
          className={`p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center ${isSocraticDictating ? 'bg-red-700 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          title={t('socratic.mic_tooltip')}
          aria-label={t('socratic.mic_tooltip')}
        >
          <Mic size={16}/>
        </button>
        <input aria-label={t('common.enter_socratic_input')}
          data-help-key="socratic_input"
          type="text"
          value={socraticInput}
          onChange={(e) => setSocraticInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSocraticSubmit()}
          placeholder={isSocraticDictating ? t('socratic.listening') : t('socratic.placeholder')}
          className="flex-grow text-xs p-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none transition-all"
          autoFocus
          disabled={isSocraticThinking}
        />
        <button aria-label={t('common.socratic_submit')}
          onClick={() => handleSocraticSubmit()}
          disabled={!socraticInput.trim() || isSocraticThinking}
          className="bg-teal-700 text-white p-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
        >
          {isSocraticThinking ? <RefreshCw size={16} className="animate-spin"/> : <Send size={16}/>}
        </button>
      </div>
    </div>
  );
}
