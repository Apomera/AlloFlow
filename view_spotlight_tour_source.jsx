
function SpotlightTourView(props) {
  var t = props.t;
  var debugLog = props.debugLog;
  var tourRect = props.tourRect;
  var spotlightMessage = props.spotlightMessage;
  var spotlightOpenTimeRef = props.spotlightOpenTimeRef;
  var setIsSpotlightMode = props.setIsSpotlightMode;
  // Move focus to the popup's Close action so keyboard users land on a visible focus target.
  // The popup intentionally remains non-modal so the highlighted control is still operable.
  // On close, return focus to the control that opened it. Escape is handled by the host.
  var panelRef = React.useRef(null);
  var closeButtonRef = React.useRef(null);
  React.useEffect(function () {
    var prevFocus = (typeof document !== 'undefined') ? document.activeElement : null;
    try { if (closeButtonRef.current) closeButtonRef.current.focus(); } catch (e) {}
    return function () {
      try { if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') prevFocus.focus(); } catch (e) {}
    };
  }, []);
  // Read-aloud: reuse the app TTS (window.callTTS, the teacher's selected voice/rate) so help & tour-step
  // text can be HEARD, not just read — this popup was previously silent except for a screen-reader announce.
  // Mirrors the Guided banner's playAbout: leak-safe (blob URL revoked on end/close/unmount/message change),
  // with a generation token that cleanly cancels an in-flight synth if the teacher stops or navigates. (2026-06-30)
  var _ttsPair = React.useState('idle'); // 'idle' | 'loading' | 'playing'
  var ttsState = _ttsPair[0], setTtsState = _ttsPair[1];
  var _ttsAudioRef = React.useRef(null);
  var _ttsUrlRef = React.useRef(null);
  var _ttsGenRef = React.useRef(0);
  var _readingLinePair = React.useState(-1); // -2 = title, -1 = off, 0+ = help body line
  var readingLineIndex = _readingLinePair[0], setReadingLineIndex = _readingLinePair[1];
  var _readingTimerRef = React.useRef(null);
  var _clearReadingHighlight = React.useCallback(function () {
    if (_readingTimerRef.current) { try { clearTimeout(_readingTimerRef.current); } catch (e) {} }
    _readingTimerRef.current = null;
    setReadingLineIndex(-1);
  }, []);
  var _stopTts = React.useCallback(function () {
    _ttsGenRef.current++;
    _clearReadingHighlight();
    var a = _ttsAudioRef.current; _ttsAudioRef.current = null;
    if (a) { try { a.pause(); a.src = ''; } catch (e) {} }
    var u = _ttsUrlRef.current; _ttsUrlRef.current = null;
    if (u) { try { URL.revokeObjectURL(u); } catch (e) {} }
    setTtsState('idle');
  }, [_clearReadingHighlight]);
  React.useEffect(function () { return _stopTts; }, [_stopTts]); // stop on unmount
  var _msgTitle = (spotlightMessage && spotlightMessage.title) || '';
  var _msgText = (spotlightMessage && spotlightMessage.text) || '';
  var _readableLines = String(_msgText || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  var _estimateReadMs = function (text) {
    var words = String(text || '').replace(/[#*`_>]/g, '').split(/\s+/).filter(Boolean).length || 1;
    var rate = 1;
    try { rate = Math.max(0.5, Number(window.__alloPlaybackRate || 1) || 1); } catch (e) {}
    return Math.max(900, Math.min(6500, Math.round((words / (2.4 * rate)) * 1000)));
  };
  var _startReadingHighlight = function (myGen) {
    _clearReadingHighlight();
    if (!_msgTitle && !_readableLines.length) return;
    var idx = 0;
    var advance = function () {
      if (myGen !== _ttsGenRef.current) return;
      if (idx >= _readableLines.length) return;
      var currentLine = _readableLines[idx];
      setReadingLineIndex(idx);
      idx += 1;
      _readingTimerRef.current = setTimeout(advance, _estimateReadMs(currentLine));
    };
    if (_msgTitle) {
      setReadingLineIndex(-2);
      _readingTimerRef.current = setTimeout(advance, _estimateReadMs(_msgTitle));
    } else {
      advance();
    }
  };
  React.useEffect(function () { _stopTts(); }, [_msgTitle, _msgText, _stopTts]); // stop when the message changes
  var _isReadingTitle = ttsState === 'playing' && readingLineIndex === -2;
  var _readableLineCounter = -1;
  var playAloud = function () {
    if (ttsState !== 'idle') { _stopTts(); return; } // toggle: a second click stops
    if (typeof window === 'undefined' || typeof window.callTTS !== 'function') return;
    var plain = String((_msgTitle ? _msgTitle + '. ' : '') + _msgText).replace(/[#*`_>]/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) return;
    var myGen = ++_ttsGenRef.current;
    setTtsState('loading');
    Promise.resolve(window.callTTS(plain, (window.__alloSelectedVoice || 'Puck'), (window.__alloPlaybackRate || 1), { maxRetries: 2 }))
      .catch(function () { return null; })
      .then(function (url) {
        if (myGen !== _ttsGenRef.current) { if (url) { try { URL.revokeObjectURL(url); } catch (e) {} } return; } // superseded
        if (!url) { setTtsState('idle'); return; }
        _ttsUrlRef.current = url;
        var audio = new Audio(url); _ttsAudioRef.current = audio;
        audio.onended = _stopTts; audio.onerror = _stopTts;
        Promise.resolve(audio.play())
          .then(function () { if (myGen === _ttsGenRef.current) { setTtsState('playing'); _startReadingHighlight(myGen); } else _stopTts(); })
          .catch(function () { _stopTts(); });
      });
  };
  var viewportWidth = (typeof window !== 'undefined' && window.innerWidth) || 1024;
  var viewportHeight = (typeof window !== 'undefined' && window.innerHeight) || 768;
  var popupWidth = Math.max(0, Math.min(380, viewportWidth - 32));
  var preferredLeft = tourRect.left > viewportWidth / 2
    ? tourRect.left - popupWidth - 24
    : tourRect.right + 24;
  var popupLeft = Math.max(16, Math.min(Math.max(16, viewportWidth - popupWidth - 16), preferredLeft));
  var estimatedHeight = Math.min(400, Math.max(0, viewportHeight - 32));
  var popupTop = Math.max(16, Math.min(Math.max(16, viewportHeight - estimatedHeight - 16), tourRect.top));
  return (
        <>
            <div
                role="presentation" aria-hidden="true"
                data-help-ignore="true" className="fixed inset-0 z-[10998] pointer-events-none bg-black/5"
                onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (spotlightOpenTimeRef.current && (Date.now() - spotlightOpenTimeRef.current < 500)) return;
                    debugLog("Backdrop Dismiss");
                    setIsSpotlightMode(false);
                }}
            />
            <div
                 className="fixed z-[11000] animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
                 style={{
                     top: popupTop + 'px',
                     left: popupLeft + 'px',
                     right: 'auto',
                     width: popupWidth + 'px',
                 }}
            >
                <div id="spotlight-message-panel" ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="spotlight-message-title" aria-describedby="spotlight-message-body" className="bg-slate-900/95 backdrop-blur-2xl p-6 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] border border-white/10 ring-1 ring-white/20 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] motion-reduce:transition-none">
                     <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/30 rounded-full blur-[80px] pointer-events-none animate-pulse motion-reduce:animate-none"></div>
                     <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-600/30 rounded-full blur-[80px] pointer-events-none animate-pulse motion-reduce:animate-none" style={{animationDelay: '1s'}}></div>
                     <div className="flex items-start justify-between mb-4 relative z-10">
                         <h3 id="spotlight-message-title" className={`font-bold text-white flex items-center gap-3 text-lg tracking-tight rounded-xl transition-colors duration-300 motion-reduce:transition-none ${_isReadingTitle ? 'bg-amber-300/15 ring-1 ring-amber-300/30 px-2 py-1 -mx-2' : ''}`}>
                            <div aria-hidden="true" className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20">
                                 <Sparkles aria-hidden="true" size={18} className="text-white fill-white/20"/>
                            </div>
                            {spotlightMessage.title || 'Help'}
                         </h3>
                         <div className="flex items-center gap-1 shrink-0">
                           {typeof window !== 'undefined' && typeof window.callTTS === 'function' && (
                             <button
                                 type="button"
                                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); playAloud(); }}
                                 disabled={ttsState === 'loading'}
                                 aria-busy={ttsState === 'loading'}
                                 data-help-ignore="true"
                                 aria-label={ttsState === 'playing' ? t('common.stop_reading', { defaultValue: 'Stop reading aloud' }) : t('common.read_aloud', { defaultValue: 'Read this aloud' })}
                                 title={ttsState === 'playing' ? t('common.stop_reading', { defaultValue: 'Stop reading aloud' }) : t('common.read_aloud', { defaultValue: 'Read this aloud' })}
                                 className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded-full transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${ttsState === 'playing' ? 'text-white bg-violet-600/40 hover:bg-violet-600/60' : 'text-white/60 hover:text-white hover:bg-white/10'} ${ttsState === 'loading' ? 'cursor-wait opacity-70' : ''}`}
                             >
                                <span aria-hidden="true" style={{ fontSize: '17px', lineHeight: 1, display: 'block', width: 20, height: 20 }}>{ttsState === 'loading' ? '⏳' : ttsState === 'playing' ? '⏹' : '🔊'}</span>
                             </button>
                           )}
                           <button
                               ref={closeButtonRef}
                               type="button"
                               aria-label={t('common.close')}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSpotlightMode(false);
                              }}
                              data-help-ignore="true" className="text-white/60 hover:text-white hover:bg-white/10 min-w-11 min-h-11 inline-flex items-center justify-center rounded-full transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                           >
                              <X aria-hidden="true" size={20} />
                           </button>
                         </div>
                     </div>
                     <div id="spotlight-message-body" className="text-slate-200 text-sm leading-relaxed space-y-3 relative z-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar-dark">
                          {(spotlightMessage.text || '').split(/\r?\n/).map((line, i) => {
                                    const cleanLine = line.trim();
                                    if (!cleanLine) return <div key={i} className="h-2" />;
                                    const lineReadIndex = ++_readableLineCounter;
                                    const isActiveReadLine = ttsState === 'playing' && readingLineIndex === lineReadIndex;
                                    const readLineClass = isActiveReadLine ? 'bg-amber-300/15 text-white ring-1 ring-amber-300/30 shadow-[0_0_18px_rgba(252,211,77,0.18)]' : '';
                                    const formatText = (text) => {
                                        if (!text) return null;
                                        return text.split('**').map((part, bIdx) => {
                                            if (bIdx % 2 === 1) {
                                                return <strong key={`b-${bIdx}`} className="font-bold text-white bg-violet-700/20 px-1.5 py-0.5 rounded border border-violet-500/30 box-decoration-clone shadow-[0_0_10px_rgba(139,92,246,0.2)]">{part}</strong>;
                                            }
                                            return part.split('*').map((sub, iIdx) => {
                                                if (iIdx % 2 === 1) {
                                                     return <em key={`i-${bIdx}-${iIdx}`} className="italic text-indigo-200 font-serif">{sub}</em>;
                                                }
                                                return sub;
                                            });
                                        });
                                    };
                                    if (cleanLine.startsWith('###')) {
                                        const headerText = cleanLine.replace(/^###\s*/, '').trim();
                                        return (
                                            <h5 key={i} className={`text-violet-200 font-bold uppercase text-xs mt-4 mb-2 tracking-widest flex items-center gap-2 border-b border-white/10 pb-1 rounded-lg px-2 py-1 -mx-2 transition-colors duration-300 motion-reduce:transition-none ${readLineClass}`}>
                                                {formatText(headerText)}
                                            </h5>
                                        );
                                    }
                                    const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
                                    if (isBullet) {
                                        const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
                                        const bulletText = cleanLine.substring(bulletMarker.length).trim();
                                        return (
                                            <div key={i} className={`grid grid-cols-[16px_1fr] gap-2 mb-1.5 items-start rounded-lg px-2 py-1 -mx-2 transition-colors duration-300 motion-reduce:transition-none ${readLineClass}`}>
                                                <div className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)] mx-auto shrink-0" />
                                                <span className="text-slate-200 text-sm font-medium">{formatText(bulletText)}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <p key={i} className={`text-slate-200 text-sm leading-relaxed rounded-lg px-2 py-1 -mx-2 transition-colors duration-300 motion-reduce:transition-none ${readLineClass}`}>
                                            {formatText(cleanLine)}
                                        </p>
                                    );
                                })}
                     </div>
                     <svg className="absolute w-8 h-8 pointer-events-none text-slate-900/95 filter drop-shadow opacity-95" aria-hidden="true"
                          style={{
                              top: '24px',
                              [tourRect.left > window.innerWidth / 2 ? 'right' : 'left']: '-24px',
                              transform: tourRect.left > window.innerWidth / 2 ? 'rotate(-90deg)' : 'rotate(90deg)',
                          }}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                     >
                          <path d="M12 21l-12-18h24z" />
                     </svg>
                </div>
                 <div aria-hidden="true" className="fixed pointer-events-none z-[10999] motion-reduce:!animate-none"
                      style={{
                          top: tourRect.top - 6,
                          left: tourRect.left - 6,
                          width: tourRect.width + 12,
                          height: tourRect.height + 12,
                          borderRadius: '12px',
                          animation: 'spotlightGlowRing 2s ease-in-out infinite',
                          boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.1)',
                      }}
                 ></div>
            </div>
        </>
  );
}
