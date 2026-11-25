/**
 * AlloFlow View - Spotlight Tour Overlay
 * Extracted from AlloFlowANTI.txt isSpotlightMode block (111 lines body).
 * Renders the contextual help spotlight: backdrop dismiss, message panel
 * with markdown formatting, glow ring around the highlighted element.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SpotlightTourView) {
    console.log('[CDN] ViewSpotlightTourModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSpotlightTourModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Sparkles = _lazyIcon('Sparkles');
  var X = _lazyIcon('X');

  const SPOTLIGHT_TOUR_ANIMATION_CSS = `
@keyframes spotlight-tour-glow-ring {
  0%, 100% { box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.9), 0 0 40px rgba(139, 92, 246, 0.5), inset 0 0 20px rgba(139, 92, 246, 0.1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-spotlight-glow-ring="true"] { animation: none !important; }
}
`;

// Device-voice fallback whenever cloud TTS is unavailable, offline, or disabled for students.
function spotlightStudentDeviceVoice(text, onEnd) {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.__alloIsGlobalMuted === 'function' ? window.__alloIsGlobalMuted() : window._alloGlobalMute) return false;
  } catch (e) {}
  try {
    if (JSON.parse(window.localStorage.getItem('alloflow_ai_config') || '{}').ttsProvider === 'off') return false;
  } catch (e) {}
  var synth = window.speechSynthesis;
  var phrase = String(text == null ? '' : text).trim();
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined' || !phrase) return false;
  try {
    var u = new SpeechSynthesisUtterance(phrase);
    u.rate = Math.max(0.5, Math.min(2, Number(window.__alloPlaybackRate) || 1));
    if (typeof window.__alloVoiceVolume === 'number' && isFinite(window.__alloVoiceVolume)) u.volume = Math.max(0, Math.min(1, window.__alloVoiceVolume));
    try {
      var langTag = String(typeof document !== 'undefined' && document.documentElement && document.documentElement.lang || typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase();
      var baseLang = langTag.split('-')[0];
      var voices = typeof synth.getVoices === 'function' ? synth.getVoices() || [] : [];
      var localMatch = voices.find(function (v) {
        return v && v.localService === true && String(v.lang || '').toLowerCase() === langTag;
      }) || voices.find(function (v) {
        return v && v.localService === true && String(v.lang || '').toLowerCase().split('-')[0] === baseLang;
      });
      if (localMatch) u.voice = localMatch;
    } catch (_) {}
    if (typeof onEnd === 'function') {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    synth.cancel();
    synth.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}
function SpotlightTourView(props) {
  var t = props.t;
  var debugLog = props.debugLog;
  var tourRect = props.tourRect;
  var spotlightMessage = props.spotlightMessage;
  var spotlightOpenTimeRef = props.spotlightOpenTimeRef;
  var setIsSpotlightMode = props.setIsSpotlightMode;
  var setSpotlightMessage = props.setSpotlightMessage;
  var onOpenInTour = props.onOpenInTour;
  var isBotVisible = props.isBotVisible;
  var themeProp = props.theme;
  var resolvedTheme = function () {
    if (themeProp === 'contrast' || themeProp === 'dark' || themeProp === 'light') return themeProp;
    try {
      var root = typeof document !== 'undefined' ? document.documentElement : null;
      var body = typeof document !== 'undefined' ? document.body : null;
      if (root && root.classList && root.classList.contains('theme-contrast') || body && body.classList && body.classList.contains('theme-contrast')) return 'contrast';
      if (root && root.classList && root.classList.contains('theme-dark') || body && body.classList && body.classList.contains('theme-dark')) return 'dark';
    } catch (_) {}
    return 'light';
  }();
  var isContrast = resolvedTheme === 'contrast';
  var isDark = resolvedTheme === 'dark';
  var isLight = !isContrast && !isDark;
  var canReadAloud = typeof window !== 'undefined' && (typeof window.callTTS === 'function' || typeof window.speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance === 'function');
  var dismissSpotlight = React.useCallback(function () {
    if (typeof setIsSpotlightMode === 'function') setIsSpotlightMode(false);
    if (typeof setSpotlightMessage === 'function') setSpotlightMessage('');
  }, [setIsSpotlightMode, setSpotlightMessage]);
  // Move focus to the popup's Close action so keyboard users land on a visible focus target.
  // The popup intentionally remains non-modal so the highlighted control is still operable.
  // On close, return focus to the control that opened it. Escape is handled by the host.
  var panelRef = React.useRef(null);
  var closeButtonRef = React.useRef(null);
  var playAloudRef = React.useRef(null);
  React.useEffect(function () {
    if (typeof document === 'undefined') return undefined;
    var onDocumentKeyDown = function (e) {
      if (e.defaultPrevented || e.nativeEvent && e.nativeEvent.isComposing || e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismissSpotlight();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'r' || e.key === 'R')) {
        var target = e.target;
        if (target && typeof target.closest === 'function' && target.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (typeof playAloudRef.current === 'function') {
          e.preventDefault();
          e.stopPropagation();
          playAloudRef.current();
        }
      }
    };
    var onDocumentPointerDown = function (e) {
      if (spotlightOpenTimeRef && spotlightOpenTimeRef.current && Date.now() - spotlightOpenTimeRef.current < 500) return;
      var target = e.target;
      if (panelRef.current && target && panelRef.current.contains(target)) return;
      if (target && typeof target.closest === 'function' && target.closest('[data-help-ignore="true"]')) return;
      // Keep the highlighted target control directly operable without dismissing first.
      if (tourRect && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        var pad = 8;
        if (e.clientX >= tourRect.left - pad && e.clientX <= tourRect.right + pad && e.clientY >= tourRect.top - pad && e.clientY <= tourRect.bottom + pad) {
          return;
        }
      }
      if (typeof debugLog === 'function') debugLog('Backdrop Dismiss');
      dismissSpotlight();
    };
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return function () {
      document.removeEventListener('keydown', onDocumentKeyDown);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
    };
  }, [dismissSpotlight, debugLog, spotlightOpenTimeRef, tourRect]);
  React.useEffect(function () {
    var prevFocus = typeof document !== 'undefined' ? document.activeElement : null;
    try {
      if (closeButtonRef.current) closeButtonRef.current.focus();
    } catch (e) {}
    return function () {
      try {
        if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') prevFocus.focus();
      } catch (e) {}
    };
  }, []);
  // Read-aloud: reuse the app TTS (window.callTTS, the teacher's selected voice/rate) so help & tour-step
  // text can be HEARD, not just read — this popup was previously silent except for a screen-reader announce.
  // Mirrors the Guided banner's playAbout: leak-safe (blob URL revoked on end/close/unmount/message change),
  // with a generation token that cleanly cancels an in-flight synth if the teacher stops or navigates. (2026-06-30)
  var _ttsPair = React.useState('idle'); // 'idle' | 'loading' | 'playing'
  var ttsState = _ttsPair[0],
    setTtsState = _ttsPair[1];
  var _ttsAudioRef = React.useRef(null);
  var _ttsUrlRef = React.useRef(null);
  var _ttsGenRef = React.useRef(0);
  var _readingLinePair = React.useState(-1); // -2 = title, -1 = off, 0+ = help body line
  var readingLineIndex = _readingLinePair[0],
    setReadingLineIndex = _readingLinePair[1];
  var _readingTimerRef = React.useRef(null);
  var _clearReadingHighlight = React.useCallback(function () {
    if (_readingTimerRef.current) {
      try {
        clearTimeout(_readingTimerRef.current);
      } catch (e) {}
    }
    _readingTimerRef.current = null;
    setReadingLineIndex(-1);
  }, []);
  var _stopTts = React.useCallback(function () {
    _ttsGenRef.current++;
    _clearReadingHighlight();
    var a = _ttsAudioRef.current;
    _ttsAudioRef.current = null;
    if (a === 'device-voice') {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    } else if (a) {
      try {
        a.pause();
        a.src = '';
      } catch (e) {}
    }
    var u = _ttsUrlRef.current;
    _ttsUrlRef.current = null;
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    }
    setTtsState('idle');
  }, [_clearReadingHighlight]);
  React.useEffect(function () {
    return _stopTts;
  }, [_stopTts]); // stop on unmount
  var _msgTitle = spotlightMessage && spotlightMessage.title || '';
  var _msgText = spotlightMessage && spotlightMessage.text || '';
  var _readableLines = String(_msgText || '').split(/\r?\n/).map(function (line) {
    return line.trim();
  }).filter(Boolean);
  var _estimateReadMs = function (text) {
    var words = String(text || '').replace(/[#*`_>]/g, '').split(/\s+/).filter(Boolean).length || 1;
    var rate = 1;
    try {
      rate = Math.max(0.5, Number(window.__alloPlaybackRate || 1) || 1);
    } catch (e) {}
    return Math.max(900, Math.min(6500, Math.round(words / (2.4 * rate) * 1000)));
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
  React.useEffect(function () {
    _stopTts();
  }, [_msgTitle, _msgText, _stopTts]); // stop when the message changes
  var _isReadingTitle = ttsState === 'playing' && readingLineIndex === -2;
  var _readableLineCounter = -1;
  var playAloud = function () {
    if (ttsState !== 'idle') {
      _stopTts();
      return;
    } // toggle: a second click stops
    if (typeof window === 'undefined') return;
    var plain = String((_msgTitle ? _msgTitle + '. ' : '') + _msgText).replace(/[#*`_>]/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) return;
    var myGen = ++_ttsGenRef.current;
    var tryDeviceVoice = function () {
      if (spotlightStudentDeviceVoice(plain, function () {
        if (myGen === _ttsGenRef.current) _stopTts();
      })) {
        _ttsAudioRef.current = 'device-voice';
        setTtsState('playing');
        _startReadingHighlight(myGen);
        return true;
      }
      setTtsState('idle');
      return false;
    };
    if (typeof window.callTTS !== 'function') {
      tryDeviceVoice();
      return;
    }
    setTtsState('loading');
    Promise.resolve(window.callTTS(plain, window.__alloSelectedVoice || 'Puck', window.__alloPlaybackRate || 1, {
      maxRetries: 2
    })).catch(function () {
      return null;
    }).then(function (url) {
      if (myGen !== _ttsGenRef.current) {
        if (url) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {}
        }
        return;
      } // superseded
      if (!url) {
        tryDeviceVoice();
        return;
      }
      _ttsUrlRef.current = url;
      var audio = new Audio(url);
      _ttsAudioRef.current = audio;
      audio.onended = _stopTts;
      audio.onerror = function () {
        if (myGen === _ttsGenRef.current) {
          _ttsAudioRef.current = null;
          tryDeviceVoice();
        }
      };
      Promise.resolve(audio.play()).then(function () {
        if (myGen === _ttsGenRef.current) {
          setTtsState('playing');
          _startReadingHighlight(myGen);
        } else _stopTts();
      }).catch(function () {
        if (myGen === _ttsGenRef.current) tryDeviceVoice();else _stopTts();
      });
    });
  };
  playAloudRef.current = canReadAloud ? playAloud : null;
  var _viewportState = React.useState(function () {
    return {
      width: typeof window !== 'undefined' && window.innerWidth || 1024,
      height: typeof window !== 'undefined' && window.innerHeight || 768
    };
  });
  var viewport = _viewportState[0],
    setViewport = _viewportState[1];
  React.useEffect(function () {
    if (typeof window === 'undefined') return;
    var updateViewport = function () {
      var width = window.innerWidth || 1024,
        height = window.innerHeight || 768;
      setViewport(function (previous) {
        return previous.width === width && previous.height === height ? previous : {
          width: width,
          height: height
        };
      });
    };
    window.addEventListener('resize', updateViewport);
    updateViewport();
    return function () {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);
  var _rect = tourRect || {
    top: 48,
    left: 48,
    right: 96,
    bottom: 96,
    width: 48,
    height: 48
  };
  var viewportWidth = viewport.width;
  var viewportHeight = viewport.height;
  var popupWidth = Math.max(0, Math.min(380, viewportWidth - 32));
  var estimatedHeight = Math.min(380, Math.max(200, viewportHeight - 104));
  var leftClearance = Math.max(0, _rect.left);
  var rightClearance = Math.max(0, viewportWidth - _rect.right);
  var canDockSide = viewportWidth >= 640 && (leftClearance >= popupWidth + 36 || rightClearance >= popupWidth + 36);
  var spotlightDock = 'right';
  var popupLeft = 16;
  var popupTop = 72;
  if (canDockSide) {
    var placeLeft = leftClearance > rightClearance;
    spotlightDock = placeLeft ? 'left' : 'right';
    var preferredLeft = placeLeft ? _rect.left - popupWidth - 24 : _rect.right + 24;
    popupLeft = Math.max(16, Math.min(Math.max(16, viewportWidth - popupWidth - 16), preferredLeft));
    popupTop = Math.max(72, Math.min(Math.max(72, viewportHeight - estimatedHeight - 16), _rect.top));
  } else {
    var spaceBelow = Math.max(0, viewportHeight - _rect.bottom);
    var spaceAbove = Math.max(0, _rect.top - 72);
    var placeBelow = spaceBelow >= spaceAbove;
    spotlightDock = placeBelow ? 'below' : 'above';
    var centeredLeft = _rect.left + (_rect.width || 0) / 2 - popupWidth / 2;
    popupLeft = Math.max(16, Math.min(Math.max(16, viewportWidth - popupWidth - 16), centeredLeft));
    popupTop = placeBelow ? Math.max(72, Math.min(Math.max(72, viewportHeight - estimatedHeight - 16), _rect.bottom + 18)) : Math.max(72, Math.min(Math.max(72, viewportHeight - estimatedHeight - 16), _rect.top - estimatedHeight - 18));
  }
  var _muzzleState = React.useState(null);
  var liveMuzzle = _muzzleState[0],
    setLiveMuzzle = _muzzleState[1];
  React.useEffect(function () {
    if (isBotVisible === false || isContrast) {
      setLiveMuzzle(null);
      return undefined;
    }
    var timer = null;
    var stopped = false;
    var tick = function () {
      if (stopped) return;
      try {
        var m = typeof window !== 'undefined' ? window.__alloBotMuzzle : null;
        if (m && m.asleep) {
          setLiveMuzzle(function (prev) {
            return prev && prev.asleep ? prev : {
              asleep: true
            };
          });
        } else if (m && typeof m.x === 'number' && typeof m.y === 'number') {
          setLiveMuzzle(function (prev) {
            return !prev || prev.asleep || Math.abs(prev.x - m.x) > 0.75 || Math.abs(prev.y - m.y) > 0.75 ? {
              x: m.x,
              y: m.y
            } : prev;
          });
        } else {
          setLiveMuzzle(function (prev) {
            return prev ? null : prev;
          });
        }
      } catch (e) {}
      timer = setTimeout(tick, 60);
    };
    tick();
    return function () {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [isBotVisible, isContrast]);
  var _helpBeam = function () {
    if (isBotVisible === false || isContrast || !_rect.width || !_rect.height) return null;
    var m = typeof window !== 'undefined' && window.__alloBotMuzzle ? window.__alloBotMuzzle : liveMuzzle;
    if (!m || m.asleep || typeof m.x !== 'number' || typeof m.y !== 'number') return null;
    var ax = m.x,
      ay = m.y;
    var left = Math.max(0, Math.min(viewportWidth, _rect.left));
    var top = Math.max(0, Math.min(viewportHeight, _rect.top));
    var right = Math.max(left, Math.min(viewportWidth, _rect.right));
    var bottom = Math.max(top, Math.min(viewportHeight, _rect.bottom));
    if (right <= left || bottom <= top) return null;
    if (ax >= left && ax <= right && ay >= top && ay <= bottom) return null;
    var cx = (left + right) / 2,
      cy = (top + bottom) / 2;
    var corners = [{
      x: left,
      y: top
    }, {
      x: right,
      y: top
    }, {
      x: right,
      y: bottom
    }, {
      x: left,
      y: bottom
    }];
    var toCentre = Math.atan2(cy - ay, cx - ax);
    var far = Math.max.apply(null, corners.map(function (c) {
      return Math.hypot(c.x - ax, c.y - ay);
    }));
    var APERTURE = 4.5;
    var px = -Math.sin(toCentre) * APERTURE;
    var py = Math.cos(toCentre) * APERTURE;
    var cross = function (o, a, b) {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };
    var src = corners.concat([{
      x: ax + px,
      y: ay + py
    }, {
      x: ax - px,
      y: ay - py
    }]).sort(function (a, b) {
      return a.x - b.x || a.y - b.y;
    });
    var lower = [];
    for (var i = 0; i < src.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], src[i]) <= 0) lower.pop();
      lower.push(src[i]);
    }
    var upper = [];
    for (var j = src.length - 1; j >= 0; j--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], src[j]) <= 0) upper.pop();
      upper.push(src[j]);
    }
    var ring = lower.slice(0, -1).concat(upper.slice(0, -1));
    return {
      ax: ax,
      ay: ay,
      far: far,
      path: 'M ' + ring.map(function (p) {
        return p.x + ' ' + p.y;
      }).join(' L ') + ' Z'
    };
  }();
  var _label = function (key, fallback) {
    var val = typeof t === 'function' ? t(key, {
      defaultValue: fallback
    }) : '';
    return val && val !== key ? val : fallback;
  };
  var _helpTitleFallback = _label('common.help', 'Help');
  var _ttsStatusText = ttsState === 'loading' ? _label('common.loading_voice', 'Loading voice…') : ttsState === 'playing' ? readingLineIndex >= 0 && _readableLines.length > 0 ? 'Reading line ' + (readingLineIndex + 1) + ' of ' + _readableLines.length : _label('common.reading_aloud', 'Reading aloud…') : '';
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, SPOTLIGHT_TOUR_ANIMATION_CSS), /*#__PURE__*/React.createElement("div", {
    "data-help-ignore": "true",
    className: "fixed inset-0 z-[10998] pointer-events-none bg-black/5",
    role: "presentation",
    "aria-hidden": "true",
    onPointerDown: e => e.stopPropagation(),
    onMouseDown: e => e.stopPropagation(),
    onClick: e => {
      e.preventDefault();
      e.stopPropagation();
      if (spotlightOpenTimeRef && spotlightOpenTimeRef.current && Date.now() - spotlightOpenTimeRef.current < 500) return;
      if (typeof debugLog === 'function') debugLog("Backdrop Dismiss");
      dismissSpotlight();
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none",
    style: {
      top: popupTop + 'px',
      left: popupLeft + 'px',
      right: 'auto',
      width: popupWidth + 'px',
      zIndex: 11060
    }
  }, /*#__PURE__*/React.createElement("div", {
    id: "spotlight-message-panel",
    ref: panelRef,
    "data-spotlight-theme": resolvedTheme,
    "data-spotlight-dock": spotlightDock,
    role: "dialog",
    "aria-modal": "false",
    "aria-labelledby": "spotlight-message-title",
    "aria-describedby": "spotlight-message-body",
    onKeyDown: function (e) {
      if (e.defaultPrevented || e.nativeEvent && e.nativeEvent.isComposing || e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismissSpotlight();
      }
    },
    className: `p-6 rounded-2xl relative overflow-visible group transition-all duration-300 motion-reduce:transition-none ${isContrast ? 'bg-black border-4 border-yellow-400 text-yellow-300' : isDark ? 'bg-slate-900/95 backdrop-blur-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] border border-white/10 ring-1 ring-white/20 text-slate-100' : 'bg-white backdrop-blur-xl shadow-2xl border-2 border-indigo-200 text-slate-900'}`,
    style: {
      backgroundColor: isContrast ? '#000000' : isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
      color: isContrast ? '#fde047' : isDark ? '#f8fafc' : '#0f172a'
    }
  }, isDark && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden rounded-2xl pointer-events-none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-20 -right-20 w-40 h-40 bg-violet-600/30 rounded-full blur-[80px] pointer-events-none animate-pulse motion-reduce:animate-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-600/30 rounded-full blur-[80px] pointer-events-none animate-pulse motion-reduce:animate-none",
    style: {
      animationDelay: '1s'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between mb-4 relative z-10"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "spotlight-message-title",
    className: `font-bold flex items-center gap-3 text-lg tracking-tight rounded-xl transition-colors duration-300 motion-reduce:transition-none ${isContrast ? 'text-yellow-400' : isDark ? 'text-white' : 'text-indigo-950'} ${_isReadingTitle ? isLight ? 'bg-amber-100 ring-1 ring-amber-400 px-2 py-1 -mx-2' : 'bg-amber-300/15 ring-1 ring-amber-300/30 px-2 py-1 -mx-2' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `p-2 rounded-lg shadow-sm ${isContrast ? 'bg-yellow-400 text-black' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-violet-500/20'}`
  }, /*#__PURE__*/React.createElement(Sparkles, {
    "aria-hidden": "true",
    size: 18,
    className: isContrast ? 'text-black' : 'text-white fill-white/20'
  })), _msgTitle || _helpTitleFallback), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 shrink-0"
  }, canReadAloud && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.preventDefault();
      e.stopPropagation();
      playAloud();
    },
    disabled: ttsState === 'loading',
    "aria-busy": ttsState === 'loading',
    "aria-pressed": ttsState === 'playing',
    "data-help-ignore": "true",
    "aria-label": ttsState === 'playing' ? _label('common.stop_reading', 'Stop reading aloud') : _label('common.read_aloud', 'Read this aloud'),
    title: ttsState === 'playing' ? _label('common.stop_reading', 'Stop reading aloud') : _label('common.read_aloud', 'Read this aloud'),
    className: `min-w-11 min-h-11 inline-flex items-center justify-center rounded-full border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${isContrast ? ttsState === 'playing' ? 'border-yellow-400 bg-yellow-400 text-black focus-visible:ring-yellow-300' : 'border-yellow-400 bg-black text-yellow-400 hover:bg-yellow-400 hover:text-black focus-visible:ring-yellow-300' : isDark ? ttsState === 'playing' ? 'border-violet-400 text-white bg-violet-600/70 hover:bg-violet-600 focus-visible:ring-white' : 'border-white/15 text-slate-100 bg-white/10 hover:text-white hover:bg-white/20 focus-visible:ring-white' : ttsState === 'playing' ? 'border-indigo-700 bg-indigo-700 text-white focus-visible:ring-indigo-700' : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 focus-visible:ring-indigo-700'} ${ttsState === 'loading' ? 'cursor-wait opacity-70' : ''}`,
    style: {
      color: isContrast ? ttsState === 'playing' ? '#000000' : '#facc15' : isDark ? '#f8fafc' : ttsState === 'playing' ? '#ffffff' : '#1e293b'
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: '17px',
      lineHeight: 1,
      display: 'block',
      width: 20,
      height: 20
    }
  }, ttsState === 'loading' ? '⏳' : ttsState === 'playing' ? '⏹' : '🔊')), /*#__PURE__*/React.createElement("button", {
    ref: closeButtonRef,
    type: "button",
    "aria-label": _label('common.close', 'Close'),
    onClick: e => {
      e.stopPropagation();
      dismissSpotlight();
    },
    "data-help-ignore": "true",
    className: `min-w-11 min-h-11 inline-flex items-center justify-center rounded-full border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${isContrast ? 'border-yellow-400 bg-black text-yellow-400 hover:bg-yellow-400 hover:text-black focus-visible:ring-yellow-300' : isDark ? 'border-white/15 text-slate-100 bg-white/10 hover:text-white hover:bg-white/20 focus-visible:ring-white' : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950 focus-visible:ring-indigo-700'}`,
    style: {
      color: isContrast ? '#facc15' : isDark ? '#f8fafc' : '#1e293b'
    }
  }, /*#__PURE__*/React.createElement(X, {
    "aria-hidden": "true",
    size: 20
  })))), /*#__PURE__*/React.createElement("div", {
    id: "spotlight-message-body",
    className: `text-sm leading-relaxed space-y-3 relative z-10 max-h-[60vh] overflow-y-auto pr-2 ${isDark ? 'text-slate-200 custom-scrollbar-dark' : isContrast ? 'text-yellow-200' : 'text-slate-700'}`
  }, _msgText.split(/\r?\n/).map((line, i) => {
    const cleanLine = line.trim();
    if (!cleanLine) return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "h-2"
    });
    const lineReadIndex = ++_readableLineCounter;
    const isActiveReadLine = ttsState === 'playing' && readingLineIndex === lineReadIndex;
    const readLineClass = isActiveReadLine ? isContrast ? 'bg-yellow-400/20 text-yellow-200 ring-1 ring-yellow-400' : isLight ? 'bg-amber-100 text-slate-950 ring-1 ring-amber-400' : 'bg-amber-300/15 text-white ring-1 ring-amber-300/30 shadow-[0_0_18px_rgba(252,211,77,0.18)]' : '';
    const formatText = text => {
      if (!text) return null;
      return text.split('**').map((part, bIdx) => {
        if (bIdx % 2 === 1) {
          return /*#__PURE__*/React.createElement("strong", {
            key: `b-${bIdx}`,
            className: isContrast ? 'font-bold text-black bg-yellow-400 px-1 rounded box-decoration-clone' : isDark ? 'font-bold text-white bg-violet-700/25 px-1.5 py-0.5 rounded border border-violet-500/30 box-decoration-clone' : 'font-bold text-slate-900 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200 box-decoration-clone'
          }, part);
        }
        return part.split('*').map((sub, iIdx) => {
          if (iIdx % 2 === 1) {
            return /*#__PURE__*/React.createElement("em", {
              key: `i-${bIdx}-${iIdx}`,
              className: isContrast ? 'italic text-yellow-300 font-serif' : isDark ? 'italic text-indigo-200 font-serif' : 'italic text-slate-600 font-serif'
            }, sub);
          }
          return sub;
        });
      });
    };
    if (cleanLine.startsWith('###')) {
      const headerText = cleanLine.replace(/^###\s*/, '').trim();
      return /*#__PURE__*/React.createElement("h5", {
        key: i,
        className: `font-bold uppercase text-xs mt-4 mb-2 tracking-widest flex items-center gap-2 border-b pb-1 rounded-lg px-2 py-1 -mx-2 transition-colors duration-300 motion-reduce:transition-none ${isContrast ? 'text-yellow-400 border-yellow-400/60' : isDark ? 'text-violet-200 border-white/10' : 'text-indigo-700 border-indigo-100'} ${readLineClass}`
      }, formatText(headerText));
    }
    const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
    if (isBullet) {
      const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
      const bulletText = cleanLine.substring(bulletMarker.length).trim();
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: `grid grid-cols-[16px_1fr] gap-2 mb-1.5 items-start rounded-lg px-2 py-1 -mx-2 transition-colors duration-300 motion-reduce:transition-none ${readLineClass}`
      }, /*#__PURE__*/React.createElement("div", {
        "aria-hidden": "true",
        className: `mt-2 h-1.5 w-1.5 rounded-full mx-auto shrink-0 ${isContrast ? 'bg-yellow-400' : isDark ? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]' : 'bg-indigo-500'}`
      }), /*#__PURE__*/React.createElement("span", {
        className: `text-sm font-medium ${isContrast ? 'text-yellow-200' : isDark ? 'text-slate-200' : 'text-slate-800'}`
      }, formatText(bulletText)));
    }
    return /*#__PURE__*/React.createElement("p", {
      key: i,
      className: `text-sm leading-relaxed rounded-lg px-2 py-1 -mx-2 transition-colors duration-300 motion-reduce:transition-none ${isContrast ? 'text-yellow-200' : isDark ? 'text-slate-200' : 'text-slate-700'} ${readLineClass}`
    }, formatText(cleanLine));
  })), /*#__PURE__*/React.createElement("div", {
    className: `mt-4 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs relative z-10 ${isContrast ? 'border-yellow-400/60 text-yellow-300' : isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'}`
  }, typeof onOpenInTour === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-ignore": "true",
    "data-spotlight-open-tour": "true",
    onClick: e => {
      e.preventDefault();
      e.stopPropagation();
      _stopTts();
      onOpenInTour();
    },
    className: `min-h-9 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${isContrast ? 'border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300 focus-visible:ring-yellow-300' : isDark ? 'border-indigo-400/60 bg-indigo-950/80 text-indigo-200 hover:bg-indigo-900 hover:text-white focus-visible:ring-white' : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-950 focus-visible:ring-indigo-700'}`
  }, /*#__PURE__*/React.createElement("span", null, "View in Guided Tour"), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "→")), /*#__PURE__*/React.createElement("span", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    "data-spotlight-tts-status": ttsState,
    className: `inline-flex items-center gap-1.5 font-medium min-h-[1rem] ${isContrast ? 'text-yellow-300' : isDark ? 'text-slate-200' : 'text-slate-700'}`
  }, _ttsStatusText ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: `w-1.5 h-1.5 rounded-full ${ttsState === 'playing' ? 'bg-amber-400 animate-pulse motion-reduce:animate-none' : 'bg-indigo-400'}`
  }), /*#__PURE__*/React.createElement("span", null, _ttsStatusText)) : null), /*#__PURE__*/React.createElement("span", {
    className: `ml-auto inline-flex items-center gap-1.5 shrink-0 ${isContrast ? 'text-yellow-300' : isDark ? 'text-slate-300' : 'text-slate-600'}`
  }, canReadAloud && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("kbd", {
    className: `px-1.5 py-0.5 rounded border text-[11px] font-mono ${isContrast ? 'bg-black border-yellow-400 text-yellow-300' : isDark ? 'bg-white/10 border-white/20 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-800'}`
  }, "R"), /*#__PURE__*/React.createElement("span", null, "read ·")), /*#__PURE__*/React.createElement("kbd", {
    className: `px-1.5 py-0.5 rounded border text-[11px] font-mono ${isContrast ? 'bg-black border-yellow-400 text-yellow-300' : isDark ? 'bg-white/10 border-white/20 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-800'}`
  }, "Esc"), /*#__PURE__*/React.createElement("span", null, "close"))), /*#__PURE__*/React.createElement("svg", {
    className: "absolute w-8 h-8 pointer-events-none filter drop-shadow opacity-95",
    "aria-hidden": "true",
    style: spotlightDock === 'below' ? {
      top: '-22px',
      left: Math.max(20, Math.min(popupWidth - 52, Math.round(_rect.left + (_rect.width || 0) / 2 - popupLeft - 16))) + 'px',
      color: isContrast ? '#facc15' : isDark ? 'rgba(15, 23, 42, 0.96)' : '#ffffff',
      transform: 'rotate(180deg)'
    } : spotlightDock === 'above' ? {
      bottom: '-22px',
      left: Math.max(20, Math.min(popupWidth - 52, Math.round(_rect.left + (_rect.width || 0) / 2 - popupLeft - 16))) + 'px',
      color: isContrast ? '#facc15' : isDark ? 'rgba(15, 23, 42, 0.96)' : '#ffffff',
      transform: 'rotate(0deg)'
    } : {
      top: Math.max(18, Math.min(240, Math.round(_rect.top + (_rect.height || 0) / 2 - popupTop - 16))) + 'px',
      color: isContrast ? '#facc15' : isDark ? 'rgba(15, 23, 42, 0.96)' : '#ffffff',
      [spotlightDock === 'left' ? 'right' : 'left']: '-24px',
      transform: spotlightDock === 'left' ? 'rotate(-90deg)' : 'rotate(90deg)'
    },
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21l-12-18h24z"
  })))), _helpBeam && /*#__PURE__*/React.createElement("svg", {
    "data-spotlight-help-beam": "true",
    className: "fixed inset-0 pointer-events-none",
    style: {
      overflow: 'visible',
      zIndex: 11050
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "helpBeamGradient",
    gradientUnits: "userSpaceOnUse",
    cx: _helpBeam.ax,
    cy: _helpBeam.ay,
    r: _helpBeam.far * 1.05
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(254, 240, 138, 0.48)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "35%",
    stopColor: "rgba(250, 204, 21, 0.22)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "75%",
    stopColor: "rgba(167, 139, 250, 0.10)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(167, 139, 250, 0)"
  }))), /*#__PURE__*/React.createElement("path", {
    d: _helpBeam.path,
    fill: "url(#helpBeamGradient)",
    style: {
      mixBlendMode: isDark ? 'screen' : 'normal'
    }
  })), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    "data-spotlight-glow-ring": "true",
    className: "fixed pointer-events-none motion-reduce:!animate-none",
    style: {
      top: Math.max(2, _rect.top - 6),
      left: Math.max(2, _rect.left - 6),
      width: Math.max(12, Math.min(viewportWidth - Math.max(2, _rect.left - 6) - 2, _rect.width + 12)),
      height: Math.max(12, Math.min(viewportHeight - Math.max(2, _rect.top - 6) - 2, _rect.height + 12)),
      zIndex: 11051,
      borderRadius: '12px',
      animation: 'spotlight-tour-glow-ring 2s ease-in-out infinite',
      boxShadow: isContrast ? '0 0 0 3px #facc15' : '0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.1)'
    }
  }));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SpotlightTourView = SpotlightTourView;
  window.AlloModules.ViewSpotlightTourModule = true;
})();
