(function() {
'use strict';
  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById("immersive-reader-module-a11y")) { var _s = document.createElement("style"); _s.id = "immersive-reader-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-400 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.ImmersiveReaderModule) { console.log('[CDN] ImmersiveReaderModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// immersive_reader_source.jsx — SpeedReaderOverlay, ImmersiveToolbar
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var ArrowLeft = _lazyIcon('ArrowLeft');
var ArrowRight = _lazyIcon('ArrowRight');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var List = _lazyIcon('List');
var Pause = _lazyIcon('Pause');
var Play = _lazyIcon('Play');
var Settings2 = _lazyIcon('Settings2');
var Zap = _lazyIcon('Zap');
const SpeedReaderOverlay = React.memo(({
  text,
  onClose,
  isOpen
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const [words, setWords] = React.useState([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [wpm, setWpm] = React.useState(300);
  const [showControls, setShowControls] = React.useState(true);
  const [focusColor, setFocusColor] = React.useState('#dc2626');
  const colorOptions = [{
    name: 'Red',
    value: '#dc2626'
  }, {
    name: 'Blue',
    value: '#2563eb'
  }, {
    name: 'Green',
    value: '#16a34a'
  }, {
    name: 'Purple',
    value: '#9333ea'
  }, {
    name: 'Orange',
    value: '#ea580c'
  }, {
    name: 'Pink',
    value: '#db2777'
  }, {
    name: 'Teal',
    value: '#0d9488'
  }];
  React.useEffect(() => {
    if (text) {
      const cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const w = cleaned.split(' ').filter(word => word.length > 0);
      setWords(w);
      setCurrentIndex(0);
    }
  }, [text]);
  React.useEffect(() => {
    let interval;
    if (isPlaying && currentIndex < words.length) {
      const delay = 60000 / wpm;
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, wpm, words.length, currentIndex]);
  React.useEffect(() => {
    const handleKeyDown = e => {
      if (!isOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setCurrentIndex(p => Math.max(0, p - 1));
      } else if (e.code === 'ArrowRight') {
        setCurrentIndex(p => Math.min(words.length - 1, p + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, words.length]);
  if (!isOpen) return null;
  const currentWord = words[currentIndex] || "";
  const centerIdx = Math.floor(currentWord.length / 2);
  const pre = currentWord.slice(0, centerIdx);
  const mid = currentWord.charAt(centerIdx);
  const post = currentWord.slice(centerIdx + 1);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[300] bg-white text-slate-900 flex flex-col animate-in fade-in duration-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: `p-4 flex justify-between items-center transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-2 hover:bg-slate-100 rounded-full text-slate-500"
  }, /*#__PURE__*/React.createElement(ArrowLeft, {
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg"
  }, t('adventure.focus_reader')), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, currentIndex + 1, " / ", words.length))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, "COLOR"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, colorOptions.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.value,
    onClick: () => setFocusColor(c.value),
    className: `w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${focusColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent'}`,
    style: {
      backgroundColor: c.value
    },
    title: c.name
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, "SPEED"), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.speed'),
    type: "range",
    min: "100",
    max: "800",
    step: "50",
    value: wpm,
    onChange: e => setWpm(Number(e.target.value)),
    className: "w-32 accent-indigo-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-mono font-bold w-12 text-right"
  }, wpm)))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col items-center justify-center cursor-pointer",
    onClick: () => setIsPlaying(p => !p)
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative text-7xl md:text-9xl font-mono font-bold tracking-wide select-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-800"
  }, pre), /*#__PURE__*/React.createElement("span", {
    style: {
      color: focusColor
    }
  }, mid), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-800"
  }, post)), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-100 -translate-x-1/2 -z-10 h-full"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -translate-y-1/2 -z-10 w-full"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-12 text-slate-500 animate-pulse text-sm"
  }, isPlaying ? /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Pause, {
    size: 16
  }), " Tap to Pause") : /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Play, {
    size: 16
  }), " Tap or Space to Play"))), /*#__PURE__*/React.createElement("div", {
    className: "h-2 bg-slate-100 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-indigo-600 transition-all duration-100 ease-linear",
    style: {
      width: `${(currentIndex + 1) / words.length * 100}%`
    }
  })));
});
const ImmersiveToolbar = React.memo(({
  settings,
  setSettings,
  onClose,
  playbackRate,
  setPlaybackRate,
  lineHeight,
  setLineHeight,
  letterSpacing,
  setLetterSpacing,
  isSpeedReaderActive,
  onToggleSpeedReader,
  isChunkReaderActive,
  onToggleChunkReader,
  chunkReaderIdx,
  setChunkReaderIdx,
  chunkReaderAutoPlay,
  setChunkReaderAutoPlay,
  chunkReaderSpeed,
  setChunkReaderSpeed,
  totalSentences
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const toggleSetting = useCallback(key => setSettings(prev => ({
    ...prev,
    [key]: !prev[key]
  })), [setSettings]);
  const ToggleButton = React.memo(({
    active,
    onClick,
    settingKey,
    title,
    children,
    activeColor = "bg-indigo-600 text-white",
    ...props
  }) => /*#__PURE__*/React.createElement("button", _extends({
    onClick: settingKey ? () => toggleSetting(settingKey) : onClick,
    title: title,
    className: `px-2.5 py-1 text-xs font-bold rounded-full transition-all ${active ? activeColor : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`
  }, props), children));
  return /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 z-[60] p-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex justify-between items-center shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 overflow-x-auto no-scrollbar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement(Settings2, {
    size: 14
  }), " ", t('immersive.title')), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, t('immersive.text_size')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-600"
  }, "A"), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.adjust_settings'),
    type: "range",
    min: "12",
    max: "48",
    value: settings.textSize,
    onChange: e => setSettings(prev => ({
      ...prev,
      textSize: parseInt(e.target.value)
    })),
    className: "w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600",
    title: t('immersive.text_size')
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-slate-700"
  }, "A"))), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.wideText,
    settingKey: "wideText",
    title: t('immersive.toggle_spacing'),
    "data-help-key": "immersive_wide_text"
  }, t('immersive.wide_text')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.showSyllables,
    settingKey: "showSyllables",
    title: t('immersive.toggle_syllables'),
    "data-help-key": "immersive_syllables"
  }, t('immersive.syllables')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.lineFocus,
    settingKey: "lineFocus",
    title: t('immersive.toggle_line_focus'),
    "data-help-key": "immersive_line_focus"
  }, t('immersive.line_focus')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: isSpeedReaderActive,
    onClick: onToggleSpeedReader,
    title: t('common.lightning_speed_read_rsvp'),
    activeColor: "bg-sky-500 text-white"
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 14,
    className: "mr-1 inline"
  }), " Speed Read"), /*#__PURE__*/React.createElement(ToggleButton, {
    active: isChunkReaderActive,
    onClick: onToggleChunkReader,
    title: t('immersive.chunk_read') || 'Chunk Read',
    activeColor: "bg-emerald-700 text-white",
    "data-help-key": "immersive_chunk_reader"
  }, /*#__PURE__*/React.createElement(List, {
    size: 14,
    className: "mr-1 inline"
  }), " ", t('immersive.chunk_read') || 'Chunk Read')), isChunkReaderActive && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setChunkReaderIdx(Math.max(0, chunkReaderIdx - 1)),
    disabled: chunkReaderIdx <= 0,
    className: "p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all",
    title: t('common.previous')
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 tabular-nums min-w-[3rem] text-center"
  }, chunkReaderIdx + 1, " / ", totalSentences), /*#__PURE__*/React.createElement("button", {
    onClick: () => setChunkReaderIdx(Math.min(totalSentences - 1, chunkReaderIdx + 1)),
    disabled: chunkReaderIdx >= totalSentences - 1,
    className: "p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all",
    title: t('common.next')
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-200"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setChunkReaderAutoPlay(!chunkReaderAutoPlay),
    className: `px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderAutoPlay ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`,
    title: chunkReaderAutoPlay ? t('common.pause') : t('common.auto_play') || 'Auto'
  }, chunkReaderAutoPlay ? /*#__PURE__*/React.createElement(Pause, {
    size: 12,
    className: "inline"
  }) : /*#__PURE__*/React.createElement(Play, {
    size: 12,
    className: "inline"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-600"
  }, "1s"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "1000",
    max: "8000",
    step: "500",
    value: chunkReaderSpeed,
    onChange: e => setChunkReaderSpeed(parseInt(e.target.value)),
    className: "w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500",
    title: `${(chunkReaderSpeed / 1000).toFixed(1)}s`,
    "aria-label": t('immersive.speed')
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-600 tabular-nums"
  }, (chunkReaderSpeed / 1000).toFixed(1), "s")))), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, t('immersive.grammar_label')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.showNouns,
    settingKey: "showNouns",
    title: t('immersive.highlight_nouns'),
    activeColor: "bg-blue-700 text-white"
  }, t('immersive.nouns')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.showVerbs,
    settingKey: "showVerbs",
    title: t('immersive.highlight_verbs'),
    activeColor: "bg-red-500 text-white"
  }, t('immersive.verbs')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.showAdjectives,
    settingKey: "showAdjectives",
    title: t('immersive.highlight_adjectives'),
    activeColor: "bg-green-700 text-white"
  }, t('immersive.adjectives')), /*#__PURE__*/React.createElement(ToggleButton, {
    active: settings.showAdverbs,
    settingKey: "showAdverbs",
    title: t('immersive.highlight_adverbs'),
    activeColor: "bg-purple-500 text-white"
  }, t('immersive.adverbs'))), /*#__PURE__*/React.createElement("div", {
    className: "h-4 w-px bg-slate-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0 relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, t('immersive.colors') || 'Colors'), /*#__PURE__*/React.createElement("select", {
    "aria-label": t('immersive.color_preset') || 'Color preset',
    value: "",
    onChange: e => {
      const presets = {
        'warm': {
          bgColor: '#fdfbf7',
          fontColor: '#1e293b'
        },
        'dark': {
          bgColor: '#1a1a2e',
          fontColor: '#e2e8f0'
        },
        'high-contrast': {
          bgColor: '#000000',
          fontColor: '#ffff00'
        },
        'sepia': {
          bgColor: '#f4ecd8',
          fontColor: '#5c4033'
        },
        'blue-wash': {
          bgColor: '#d6eaf8',
          fontColor: '#1b2631'
        },
        'green-tint': {
          bgColor: '#e8f5e9',
          fontColor: '#1b5e20'
        },
        'rose': {
          bgColor: '#fce4ec',
          fontColor: '#880e4f'
        }
      };
      if (presets[e.target.value]) {
        setSettings(prev => ({
          ...prev,
          ...presets[e.target.value]
        }));
      }
    },
    className: "text-xs bg-slate-100 border border-slate-200 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-600"
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, t('immersive.presets') || 'Presets'), /*#__PURE__*/React.createElement("option", {
    value: "warm"
  }, "\u2600\uFE0F Warm"), /*#__PURE__*/React.createElement("option", {
    value: "dark"
  }, "\uD83C\uDF19 Dark"), /*#__PURE__*/React.createElement("option", {
    value: "high-contrast"
  }, "\u25FC\uFE0F High Contrast"), /*#__PURE__*/React.createElement("option", {
    value: "sepia"
  }, "\uD83D\uDCDC Sepia"), /*#__PURE__*/React.createElement("option", {
    value: "blue-wash"
  }, "\uD83D\uDCA7 Blue Wash"), /*#__PURE__*/React.createElement("option", {
    value: "green-tint"
  }, "\uD83C\uDF3F Green Tint"), /*#__PURE__*/React.createElement("option", {
    value: "rose"
  }, "\uD83C\uDF38 Rose")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-600"
  }, t('immersive.bg') || 'Bg'), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: settings.bgColor || '#fdfbf7',
    onChange: e => setSettings(prev => ({
      ...prev,
      bgColor: e.target.value
    })),
    className: "w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none",
    style: {
      backgroundColor: settings.bgColor
    },
    "aria-label": t('immersive.bg_color') || 'Background color'
  }), /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-600"
  }, t('immersive.text') || 'Text'), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: settings.fontColor || '#1e293b',
    onChange: e => setSettings(prev => ({
      ...prev,
      fontColor: e.target.value
    })),
    className: "w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none",
    style: {
      backgroundColor: settings.fontColor
    },
    "aria-label": t('immersive.text_color') || 'Text color'
  })))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close_word_wall'),
    onClick: onClose,
    title: t('immersive.close'),
    className: "ml-4 shrink-0 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  })));
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.SpeedReaderOverlay = SpeedReaderOverlay;
window.AlloModules.ImmersiveToolbar = ImmersiveToolbar;
window.AlloModules.ImmersiveReaderModule = true;
console.log('[ImmersiveReaderModule] 2 components registered');
})();
