/**
 * AlloFlow - Speech setup panel.
 * Choose how speech becomes text, download the on-device model, test the microphone.
 * Source: speech_setup_source.jsx. Build: node _build_speech_setup_module.js
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SpeechSetup) {
    console.log('[CDN] SpeechSetup already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[SpeechSetup] React not found'); return; }

  // Speech setup: one place to choose how speech becomes text, download the on-device
// model, and test the microphone. Opened by 'alloflow:open-speech-setup' or
// 'alloflow:speech-setup-needed'; the host owns the open state and focus trap.
var TIER_SIZES_MB = {
  tiny: 39,
  base: 73,
  small: 238
};
var TIERS = ['tiny', 'base', 'small'];
var TEST_SECONDS = 8;
var MB = 1024 * 1024;
function fillText(text, params) {
  var out = String(text == null ? '' : text);
  Object.keys(params || {}).forEach(function (name) {
    out = out.split('{' + name + '}').join(String(params[name]));
  });
  return out;
}
function say(translated, fallback, params) {
  var usable = translated && !/^speech_setup\./.test(String(translated));
  return fillText(usable ? translated : fallback, params);
}
// Files report separately and appear one at a time, so measure against the known
// download size. Otherwise the bar jumps backwards as each new file starts.
function downloadSummary(files, expectedMb) {
  var loaded = Object.keys(files || {}).reduce(function (sum, name) {
    return sum + (Number(files[name] && files[name].loaded) || 0);
  }, 0);
  var loadedMb = Math.round(loaded / MB);
  var cap = Math.max(1, Number(expectedMb) || 1);
  return {
    loadedMb: Math.min(loadedMb, cap),
    percent: Math.min(99, Math.floor(loaded / MB / cap * 100))
  };
}
function classifyDownloadError(error) {
  var text = String(error && error.name + ' ' + error.message || '');
  if (/abort|superseded/i.test(text)) return 'ignore';
  if (/quota|storage|disk/i.test(text)) return 'storage';
  return 'network';
}
function classifyMicError(error) {
  var name = String(error && error.name || '');
  if (name === 'AbortError') return 'ignore';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
  if (name === 'NotReadableError') return 'busy';
  return 'failed';
}
function summaryKind(choice, modelReady) {
  if (!choice) return 'loading';
  if (choice.requested === 'off') return 'off';
  if (choice.resolved === 'desktop-whisper') return 'desktop';
  if (choice.resolved === 'whisper' && choice.supported && modelReady) return 'ready';
  if (choice.resolved === 'whisper' && !choice.capabilities.getUserMedia) return 'unavailable';
  if (choice.resolved === 'whisper') return 'needs-model';
  if (choice.resolved === 'webspeech' && choice.supported) return 'browser';
  if (choice.resolved === 'gemini' && choice.supported) return 'gemini';
  return 'unavailable';
}
var SPEECH_SETUP_CSS = ['.allo-ss-backdrop{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.72)}', '.allo-ss{--ss-bg:#fff;--ss-text:#0f172a;--ss-soft:#475569;--ss-line:#cbd5e1;--ss-tint:#f1f5f9;--ss-accent:#3730a3;--ss-on-accent:#fff;--ss-good:#166534;--ss-warn:#92400e;box-sizing:border-box;width:100%;max-width:560px;max-height:100%;overflow-y:auto;border-radius:14px;padding:20px;background:var(--ss-bg);color:var(--ss-text);font-size:14px;line-height:1.5;box-shadow:0 20px 50px rgba(0,0,0,.4)}', '.allo-ss--dark{--ss-bg:#0f172a;--ss-text:#f1f5f9;--ss-soft:#cbd5e1;--ss-line:#475569;--ss-tint:#1e293b;--ss-accent:#a5b4fc;--ss-on-accent:#0f172a;--ss-good:#86efac;--ss-warn:#fcd34d}', '.allo-ss--contrast{--ss-bg:#000;--ss-text:#fff;--ss-soft:#fff;--ss-line:#fff;--ss-tint:#000;--ss-accent:#fde047;--ss-on-accent:#000;--ss-good:#fde047;--ss-warn:#fde047;border:2px solid #fff}', '.allo-ss *{box-sizing:border-box}', '.allo-ss:focus{outline:none}', '.allo-ss h2{margin:0;font-size:20px;font-weight:800;color:inherit}', '.allo-ss h3{margin:0 0 8px;font-size:15px;font-weight:800;color:inherit}', '.allo-ss p{margin:0;color:inherit}', '.allo-ss-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}', '.allo-ss-section{border:0;border-top:1px solid var(--ss-line);margin:16px 0 0;padding:14px 0 0;min-width:0}', '.allo-ss-section legend{float:left;width:100%;padding:0;margin:0 0 8px;font-size:15px;font-weight:800}', '.allo-ss-section legend + *{clear:both}', '.allo-ss-soft{color:var(--ss-soft);font-size:13px}', '.allo-ss-banner{border:1px solid var(--ss-line);border-left:5px solid var(--ss-accent);border-radius:8px;padding:10px 12px;background:var(--ss-tint);font-weight:650}', '.allo-ss-banner[data-kind="ready"],.allo-ss-banner[data-kind="desktop"]{border-left-color:var(--ss-good)}', '.allo-ss-banner[data-kind="browser"],.allo-ss-banner[data-kind="needs-model"],.allo-ss-banner[data-kind="unavailable"]{border-left-color:var(--ss-warn)}', '.allo-ss-note{margin-top:8px;border-radius:8px;padding:8px 10px;background:var(--ss-tint);font-size:13px}', '.allo-ss-error{margin-top:8px;font-size:13px;font-weight:650;color:var(--ss-warn)}', '.allo-ss-option{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;margin-top:6px;border:1px solid var(--ss-line);border-radius:8px;cursor:pointer}', '.allo-ss-option[data-selected="true"]{border-color:var(--ss-accent);box-shadow:inset 0 0 0 1px var(--ss-accent)}', '.allo-ss-option[data-disabled="true"]{cursor:not-allowed}', '.allo-ss-option input{margin:3px 0 0;flex:none;width:16px;height:16px;accent-color:var(--ss-accent)}', '.allo-ss-option strong{display:block;font-weight:750}', '.allo-ss-option span{display:block;color:var(--ss-soft);font-size:13px}', '.allo-ss-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--ss-line)}', '.allo-ss-row:last-of-type{border-bottom:0}', '.allo-ss-ok{font-weight:750;color:var(--ss-good)}', '.allo-ss-tag{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid var(--ss-line);border-radius:999px;font-size:12px;font-weight:650}', '.allo-ss-button{min-height:36px;padding:6px 14px;border:1px solid var(--ss-accent);border-radius:8px;background:var(--ss-accent);color:var(--ss-on-accent);font:inherit;font-weight:750;cursor:pointer}', '.allo-ss-button[data-quiet="true"]{background:transparent;color:var(--ss-text);border-color:var(--ss-line)}', '.allo-ss-button:disabled{cursor:not-allowed;opacity:.65}', '.allo-ss-close{min-width:36px;min-height:36px;border:1px solid var(--ss-line);border-radius:8px;background:transparent;color:var(--ss-text);font-size:20px;line-height:1;cursor:pointer}', '.allo-ss button:focus-visible,.allo-ss input:focus-visible{outline:3px solid var(--ss-accent);outline-offset:2px}', '.allo-ss-track{height:10px;margin-top:6px;border:1px solid var(--ss-line);border-radius:999px;background:var(--ss-tint);overflow:hidden}', '.allo-ss-fill{height:100%;background:var(--ss-accent)}', '.allo-ss-quote{margin:8px 0;padding:8px 10px;border-left:3px solid var(--ss-line);font-style:italic}', '.allo-ss-heard{margin-top:8px;padding:8px 10px;border:1px solid var(--ss-line);border-radius:8px;background:var(--ss-tint)}', '.allo-ss-foot{display:flex;justify-content:flex-end;margin-top:16px}', '@media (forced-colors: active){.allo-ss-fill{background:Highlight}.allo-ss-button{border:1px solid ButtonText}}'].join('');
function SpeechSetupPanel(props) {
  var t = props.t || function () {
    return '';
  };
  var onClose = props.onClose || function () {};
  var theme = props.theme === 'dark' || props.theme === 'contrast' ? props.theme : 'light';
  var voiceNow = function () {
    return window.AlloFlowVoice || null;
  };
  var V = voiceNow();
  var languageContext = React.useContext(window.AlloLanguageContext || React.createContext(null)) || {};
  var uiLanguageTag = '';
  try {
    if (languageContext.currentUiLanguage && window.AlloFlowLang && typeof window.AlloFlowLang.bcp47Full === 'function') {
      uiLanguageTag = window.AlloFlowLang.bcp47Full(languageContext.currentUiLanguage) || '';
    }
  } catch (_) {}
  var lang = props.lang || uiLanguageTag || V && V.loadPreference().lang || 'en-US';
  var dialogRef = React.useRef(null);
  var checkRef = React.useRef(null);
  var filesRef = React.useRef({});
  var checkPhaseRef = React.useRef('idle');
  var mountedRef = React.useRef(true);
  var _engine = React.useState(function () {
    return V ? V.loadPreference().engine : 'auto';
  });
  var engine = _engine[0];
  var setEngine = _engine[1];
  var _tier = React.useState(function () {
    return V ? V.loadPreference().whisperTier : 'tiny';
  });
  var tier = _tier[0];
  var setTier = _tier[1];
  var _status = React.useState(null);
  var modelStatus = _status[0];
  var setModelStatus = _status[1];
  var _download = React.useState(null);
  var download = _download[0];
  var setDownload = _download[1];
  var _downloadError = React.useState('');
  var downloadError = _downloadError[0];
  var setDownloadError = _downloadError[1];
  var _freeMb = React.useState(null);
  var freeMb = _freeMb[0];
  var setFreeMb = _freeMb[1];
  var _note = React.useState('');
  var engineNote = _note[0];
  var setEngineNote = _note[1];
  var _check = React.useState({
    phase: 'idle',
    level: 0,
    report: null,
    error: '',
    stoppedOther: false
  });
  var check = _check[0];
  var setCheck = _check[1];
  var _revision = React.useState(0);
  var bump = _revision[1];
  function refreshModelStatus() {
    var voice = voiceNow();
    if (!voice || typeof voice.getWhisperModelStatus !== 'function') return Promise.resolve();
    return voice.getWhisperModelStatus().then(function (status) {
      if (mountedRef.current) {
        setModelStatus(status);
        bump(function (n) {
          return n + 1;
        });
      }
    }).catch(function () {});
  }
  React.useEffect(function () {
    mountedRef.current = true;
    if (dialogRef.current) {
      try {
        dialogRef.current.focus();
      } catch (_) {}
    }
    refreshModelStatus();
    try {
      if (navigator.storage && typeof navigator.storage.estimate === 'function') {
        navigator.storage.estimate().then(function (estimate) {
          if (mountedRef.current && estimate && estimate.quota) setFreeMb(Math.round((estimate.quota - (estimate.usage || 0)) / MB));
        }).catch(function () {});
      }
    } catch (_) {}
    var syncEngine = function (event) {
      var next = event && event.detail && event.detail.engine;
      if (next) setEngine(next);
    };
    var onModules = function () {
      bump(function (n) {
        return n + 1;
      });
    };
    window.addEventListener('alloflow:voice-engine-changed', syncEngine);
    window.addEventListener('alloflow:module-registry-changed', onModules);
    var voice = voiceNow();
    var unsubscribe = voice && typeof voice.subscribeToVoiceProgress === 'function' ? voice.subscribeToVoiceProgress(function (progress) {
      if (!progress || !mountedRef.current || checkPhaseRef.current !== 'idle') return;
      if (progress.phase === 'model-fetch-progress') {
        if (progress.file && typeof progress.loaded === 'number') filesRef.current[progress.file] = {
          loaded: progress.loaded
        };
        var summary = downloadSummary(filesRef.current, TIER_SIZES_MB[progress.tier]);
        setDownload({
          tier: progress.tier,
          key: progress.profile,
          percent: summary.percent,
          loadedMb: summary.loadedMb
        });
      } else if (progress.phase === 'model-loaded') {
        filesRef.current = {};
        setDownload(null);
        setDownloadError('');
        refreshModelStatus();
      } else if (progress.phase === 'model-error') {
        filesRef.current = {};
        setDownload(null);
        var kind = classifyDownloadError(progress.error);
        if (kind !== 'ignore') setDownloadError(kind);
        refreshModelStatus();
      }
    }) : function () {};
    return function () {
      mountedRef.current = false;
      window.removeEventListener('alloflow:voice-engine-changed', syncEngine);
      window.removeEventListener('alloflow:module-registry-changed', onModules);
      try {
        unsubscribe();
      } catch (_) {}
      // Closing stops the microphone. A download keeps going, and reopening shows it.
      if (checkRef.current) {
        try {
          checkRef.current.cancel();
        } catch (_) {}
        checkRef.current = null;
      }
    };
  }, []);
  if (!V) {
    return /*#__PURE__*/React.createElement("div", {
      className: "allo-ss-backdrop"
    }, /*#__PURE__*/React.createElement("style", null, SPEECH_SETUP_CSS), /*#__PURE__*/React.createElement("div", {
      className: 'allo-ss allo-ss--' + theme,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "allo-ss-title",
      tabIndex: -1,
      ref: dialogRef
    }, /*#__PURE__*/React.createElement("div", {
      className: "allo-ss-head"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "allo-ss-title"
    }, say(t('speech_setup.title'), 'Speech setup')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "allo-ss-close",
      onClick: onClose,
      "aria-label": say(t('speech_setup.close'), 'Close speech setup')
    }, "×")), /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, say(t('speech_setup.still_loading'), 'Voice tools are still loading. Try again in a moment.'))));
  }
  var caps = V.getCapabilities();
  var localOnly = typeof V.isLocalSpeechOnly === 'function' && V.isLocalSpeechOnly();
  var iosCanvas = typeof V.isIosCanvasVoiceSurface === 'function' && V.isIosCanvasVoiceSurface();
  var profile = V.resolveWhisperProfile(lang, tier);
  var languageKey = profile.supported ? profile.key : null;
  var shownEngine = engine === 'webspeech' && localOnly ? 'auto' : engine;
  var geminiCapability = V.getGeminiAudioCapability({
    callGeminiAudio: window.callGeminiAudio
  });
  var choice = V.resolveHandsFreeEngine({
    engine: shownEngine,
    lang: lang,
    callGeminiAudio: window.callGeminiAudio
  });
  var testTier = typeof V.preparedWhisperTier === 'function' ? V.preparedWhisperTier(tier, lang) : null;
  var canUseOnDevice = !iosCanvas && !caps.desktopWhisper && caps.getUserMedia && caps.audioContext && caps.dynamicImport;
  var kind = summaryKind(choice, !!testTier);
  var tierLabels = {
    tiny: say(t('speech_setup.tier_tiny'), 'Tiny'),
    base: say(t('speech_setup.tier_base'), 'Base'),
    small: say(t('speech_setup.tier_small'), 'Small')
  };
  var summaryText = {
    loading: say(t('speech_setup.summary_loading'), 'Checking this device.'),
    off: say(t('speech_setup.summary_off'), 'Voice input is off.'),
    desktop: say(t('speech_setup.summary_desktop'), 'Ready. The desktop app turns speech into text on this device.'),
    ready: say(t('speech_setup.summary_ready'), 'Ready. Your voice stays on this device.'),
    'needs-model': say(t('speech_setup.summary_needs_model'), 'Not ready yet. Download a speech model below.'),
    browser: say(t('speech_setup.summary_browser'), 'Using your browser\'s speech service. Your voice may leave this device.'),
    gemini: say(t('speech_setup.summary_gemini'), 'Using Gemini. Each spoken turn is sent to Gemini.'),
    unavailable: choice.reason || say(t('speech_setup.summary_unavailable'), 'Voice input is not available on this device.')
  }[kind];
  var engineOptions = [{
    id: 'auto',
    label: say(t('speech_setup.engine_auto'), 'Automatic'),
    help: localOnly ? say(t('speech_setup.engine_auto_local_help'), 'Uses the on-device model after you download it. Your voice stays on this device.') : say(t('speech_setup.engine_auto_help'), 'Uses the on-device model if it is downloaded. If not, it uses your browser\'s speech service, which may send your voice off this device.')
  }, {
    id: 'whisper',
    label: say(t('speech_setup.engine_whisper'), 'On this device'),
    help: say(t('speech_setup.engine_whisper_help'), 'Your voice stays on this device. Needs a one-time download.')
  }, {
    id: 'webspeech',
    hidden: localOnly,
    label: say(t('speech_setup.engine_browser'), 'Browser speech service'),
    help: say(t('speech_setup.engine_browser_help'), 'Your browser may send your voice to its maker. In Chrome, that is Google\'s speech service, which a school\'s Google agreement may not cover.')
  }, {
    id: 'gemini',
    disabled: !geminiCapability.available && engine !== 'gemini',
    label: say(t('speech_setup.engine_gemini'), 'Gemini'),
    help: geminiCapability.available ? say(t('speech_setup.engine_gemini_help'), 'Each spoken turn is sent to Gemini to turn into text.') : say(t('speech_setup.engine_gemini_off_help'), 'Not available here. It needs a Gemini key in AI settings.')
  }, {
    id: 'off',
    label: say(t('speech_setup.engine_off'), 'Off'),
    help: say(t('speech_setup.engine_off_help'), 'The microphone stays off. Typing still works.')
  }].filter(function (option) {
    return !option.hidden;
  });
  function chooseEngine(next) {
    V.setVoiceEngine(next);
    setEngine(next);
    var loop = window.__alloVoiceLoop;
    var listening = !!(loop && loop.isActive && loop.isActive());
    if (next === 'off') {
      if (typeof V.stopActiveVoiceSession === 'function') V.stopActiveVoiceSession('voice-input-off');
      setEngineNote('');
    } else {
      setEngineNote(listening ? say(t('speech_setup.applies_next_start'), 'This change applies the next time listening starts.') : '');
    }
  }
  function chooseTier(next) {
    setTier(next);
    setDownloadError('');
    if (V.isWhisperPrepared(next, {
      lang: lang
    })) V.savePreference({
      whisperTier: next
    });
    bump(function (n) {
      return n + 1;
    });
  }
  function startDownload(key) {
    setDownloadError('');
    filesRef.current = {};
    setDownload({
      tier: tier,
      key: key,
      percent: 0,
      loadedMb: 0
    });
    var targetLang = key === 'english' ? 'en-US' : languageKey === 'multilingual' ? lang : 'es';
    V.preloadWhisper(tier, {
      lang: targetLang
    }).catch(function () {});
  }
  function startCheck() {
    if (check.phase === 'listening' || check.phase === 'transcribing' || typeof V.startMicrophoneCheck !== 'function') return;
    var status = typeof V.getActiveVoiceSessionStatus === 'function' ? V.getActiveVoiceSessionStatus() : null;
    var stoppedOther = !!(status && status.state && status.state !== 'idle' && status.owner);
    checkPhaseRef.current = 'starting';
    setCheck({
      phase: 'starting',
      level: 0,
      report: null,
      error: '',
      stoppedOther: stoppedOther
    });
    var run = V.startMicrophoneCheck({
      seconds: TEST_SECONDS,
      lang: lang,
      tier: canUseOnDevice && profile.supported ? testTier : null,
      onLevel: function (level) {
        if (mountedRef.current) setCheck(function (previous) {
          return Object.assign({}, previous, {
            level: level
          });
        });
      },
      onPhase: function (phase) {
        checkPhaseRef.current = phase;
        if (mountedRef.current) setCheck(function (previous) {
          return Object.assign({}, previous, {
            phase: phase,
            level: phase === 'listening' ? previous.level : 0
          });
        });
      }
    });
    checkRef.current = run;
    run.promise.then(function (report) {
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      if (!mountedRef.current) return;
      setCheck({
        phase: 'done',
        level: 0,
        report: report,
        error: '',
        stoppedOther: stoppedOther
      });
      bump(function (n) {
        return n + 1;
      });
    }, function (error) {
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      if (!mountedRef.current) return;
      var errorKind = classifyMicError(error);
      setCheck({
        phase: 'idle',
        level: 0,
        report: null,
        error: errorKind === 'ignore' ? '' : errorKind,
        stoppedOther: false
      });
    });
  }
  function stopCheck() {
    if (checkRef.current) {
      try {
        checkRef.current.cancel();
      } catch (_) {}
    }
  }
  var testBusy = check.phase === 'starting' || check.phase === 'listening' || check.phase === 'transcribing';
  var report = check.report;
  var assessment = report && report.assessment;
  var speeds = V.loadPreference().whisperSpeedByModel || {};
  var downloading = !!download;
  var tierSize = TIER_SIZES_MB[tier];
  var lowStorage = freeMb != null && freeMb < tierSize * 1.5;
  function renderModelRow(key, label) {
    var ready = !!(modelStatus && modelStatus[tier] && modelStatus[tier][key]);
    var active = download && download.tier === tier && download.key === key;
    return /*#__PURE__*/React.createElement("div", {
      className: "allo-ss-row",
      key: key
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, label), languageKey === key && /*#__PURE__*/React.createElement("span", {
      className: "allo-ss-tag"
    }, say(t('speech_setup.your_language'), 'Your language'))), ready ? /*#__PURE__*/React.createElement("span", {
      className: "allo-ss-ok"
    }, say(t('speech_setup.downloaded'), '✓ Downloaded')) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "allo-ss-button",
      disabled: downloading,
      "aria-busy": active ? 'true' : undefined,
      onClick: function () {
        startDownload(key);
      }
    }, active ? say(t('speech_setup.downloading'), 'Downloading…') : say(t('speech_setup.download_size'), 'Download ({size} MB)', {
      size: tierSize
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-backdrop"
  }, /*#__PURE__*/React.createElement("style", null, SPEECH_SETUP_CSS), /*#__PURE__*/React.createElement("div", {
    className: 'allo-ss allo-ss--' + theme,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "allo-ss-title",
    "aria-describedby": "allo-ss-summary",
    tabIndex: -1,
    ref: dialogRef,
    "data-testid": "speech-setup-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-head"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "allo-ss-title"
  }, say(t('speech_setup.title'), 'Speech setup')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "allo-ss-close",
    onClick: onClose,
    "aria-label": say(t('speech_setup.close'), 'Close speech setup')
  }, "×")), /*#__PURE__*/React.createElement("p", {
    id: "allo-ss-summary",
    className: "allo-ss-banner",
    "data-kind": kind,
    role: "status"
  }, summaryText), props.automatic && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-note"
  }, say(t('speech_setup.opened_from_mic'), 'The microphone button needs this setup first. After the download, press it again.')), kind === 'needs-model' && canUseOnDevice && profile.supported && !downloading && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "allo-ss-button",
    "data-testid": "speech-setup-quick-download",
    onClick: function () {
      startDownload(languageKey);
    }
  }, say(t('speech_setup.quick_download'), 'Download the {name} model ({size} MB)', {
    name: tierLabels[tier],
    size: tierSize
  })), /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft",
    style: {
      marginTop: '4px'
    }
  }, say(t('speech_setup.quick_download_note'), 'It only downloads once on this device. You can change the size below.'))), download && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft",
    role: "status"
  }, say(t('speech_setup.download_progress'), 'Downloaded {loaded} of {total} MB. You can keep working while this finishes.', {
    loaded: download.loadedMb,
    total: TIER_SIZES_MB[download.tier]
  })), /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-track",
    role: "progressbar",
    "aria-label": say(t('speech_setup.download_label'), 'Speech model download'),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": download.percent
  }, /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-fill",
    style: {
      width: download.percent + '%'
    }
  }))), downloadError === 'network' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error",
    role: "alert"
  }, say(t('speech_setup.download_failed_network'), 'The download did not finish. Check the connection. If this is a school network, ask IT to allow huggingface.co, hf.co, and cdn.jsdelivr.net.')), downloadError === 'storage' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error",
    role: "alert"
  }, say(t('speech_setup.download_failed_storage'), 'This device ran out of storage for the download. Free some space or choose a smaller size.')), !profile.supported && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-note"
  }, say(t('speech_setup.language_not_supported'), 'The on-device model does not support this language ({language}). Choose another way to enter text.', {
    language: profile.requestedLanguage
  })), /*#__PURE__*/React.createElement("fieldset", {
    className: "allo-ss-section"
  }, /*#__PURE__*/React.createElement("legend", null, say(t('speech_setup.how_heading'), 'How your voice becomes text')), /*#__PURE__*/React.createElement("div", null, engineOptions.map(function (option) {
    return /*#__PURE__*/React.createElement("label", {
      className: "allo-ss-option",
      key: option.id,
      "data-selected": shownEngine === option.id ? 'true' : 'false',
      "data-disabled": option.disabled ? 'true' : 'false'
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "allo-ss-engine",
      value: option.id,
      checked: shownEngine === option.id,
      disabled: !!option.disabled,
      "data-autofocus": shownEngine === option.id ? 'true' : undefined,
      onChange: function () {
        chooseEngine(option.id);
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, option.label), /*#__PURE__*/React.createElement("span", null, option.help)));
  })), engineNote && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-note",
    role: "status"
  }, engineNote)), caps.desktopWhisper ? /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-section"
  }, /*#__PURE__*/React.createElement("h3", null, say(t('speech_setup.model_heading'), 'On-device speech model')), /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft"
  }, say(t('speech_setup.desktop_model_note'), 'The desktop app includes its own speech model, so there is nothing to download here.'))) : iosCanvas ? /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-section"
  }, /*#__PURE__*/React.createElement("h3", null, say(t('speech_setup.model_heading'), 'On-device speech model')), /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft"
  }, say(t('speech_setup.ios_canvas_note'), 'On an iPhone or iPad inside Gemini Canvas, the on-device model is paused because it can restart the page.'))) : !canUseOnDevice ? /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-section"
  }, /*#__PURE__*/React.createElement("h3", null, say(t('speech_setup.model_heading'), 'On-device speech model')), /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft"
  }, say(t('speech_setup.browser_too_old'), 'This browser cannot run the on-device model. It needs microphone access, Web Audio, and modern module support.'))) : /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-section"
  }, /*#__PURE__*/React.createElement("fieldset", {
    className: "allo-ss-section",
    style: {
      borderTop: 0,
      margin: 0,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("legend", null, say(t('speech_setup.model_heading'), 'On-device speech model')), /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft"
  }, say(t('speech_setup.size_intro'), 'Bigger models make fewer mistakes but need a faster computer. Start with Tiny, then test below.')), TIERS.map(function (id) {
    var speed = speeds[V.resolveWhisperProfile(lang, id).modelId];
    var help = {
      tiny: say(t('speech_setup.tier_tiny_help'), 'Fastest. A good place to start.'),
      base: say(t('speech_setup.tier_base_help'), 'Fewer mistakes. Works best on newer computers.'),
      small: say(t('speech_setup.tier_small_help'), 'Fewest mistakes. A large download that can run slowly.')
    }[id];
    return /*#__PURE__*/React.createElement("label", {
      className: "allo-ss-option",
      key: id,
      "data-selected": tier === id ? 'true' : 'false',
      "data-disabled": "false"
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "allo-ss-tier",
      value: id,
      checked: tier === id,
      disabled: downloading,
      onChange: function () {
        chooseTier(id);
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, say(t('speech_setup.tier_line'), '{name} ({size} MB)', {
      name: tierLabels[id],
      size: TIER_SIZES_MB[id]
    })), /*#__PURE__*/React.createElement("span", null, help, speed ? ' ' + (speed >= 1.1 ? say(t('speech_setup.tier_last_speed'), 'Last test on this device: {speed} times faster than speech.', {
      speed: speed
    }) : say(t('speech_setup.tier_last_speed_slower'), 'Last test on this device: no faster than speech.')) : '')));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px'
    }
  }, renderModelRow('english', say(t('speech_setup.model_english'), 'English')), renderModelRow('multilingual', say(t('speech_setup.model_other'), 'All other languages'))), download && /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-track",
    "aria-hidden": "true",
    style: {
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-fill",
    style: {
      width: download.percent + '%'
    }
  })), !download && lowStorage && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error"
  }, say(t('speech_setup.low_storage'), 'This device may not have room for this download ({free} MB free).', {
    free: freeMb
  }))), /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-section"
  }, /*#__PURE__*/React.createElement("h3", null, say(t('speech_setup.test_heading'), 'Test your microphone')), /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft"
  }, testTier && canUseOnDevice && profile.supported ? say(t('speech_setup.test_intro_model'), 'Speak for {seconds} seconds to see what the on-device model hears. This also measures how fast this device is. The test stays on this device and nothing is saved.', {
    seconds: TEST_SECONDS
  }) : say(t('speech_setup.test_intro_level'), 'Speak for {seconds} seconds to check that the microphone picks you up. The test stays on this device and nothing is saved. To see your words too, download a speech model.', {
    seconds: TEST_SECONDS
  })), testTier && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-quote"
  }, say(t('speech_setup.test_sentence'), 'You could read this: Plants make their own food through photosynthesis. They use sunlight, water, and carbon dioxide.')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      marginTop: '8px'
    }
  }, check.phase === 'listening' || check.phase === 'starting' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "allo-ss-button",
    "data-quiet": "true",
    onClick: stopCheck
  }, say(t('speech_setup.test_stop'), 'Stop test')) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "allo-ss-button",
    disabled: testBusy || downloading,
    onClick: startCheck
  }, report ? say(t('speech_setup.test_again'), 'Test again') : say(t('speech_setup.test_start'), 'Start test'))), check.phase === 'starting' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft",
    role: "status",
    style: {
      marginTop: '8px'
    }
  }, say(t('speech_setup.test_starting'), 'Opening the microphone. If your browser asks, choose Allow.')), check.phase === 'listening' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft",
    role: "status"
  }, say(t('speech_setup.test_listening'), 'Listening. Speak now.')), /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-track",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-fill",
    "data-testid": "speech-setup-level",
    style: {
      width: Math.round(check.level * 100) + '%'
    }
  }))), check.phase === 'transcribing' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-soft",
    role: "status",
    style: {
      marginTop: '8px'
    }
  }, say(t('speech_setup.test_transcribing'), 'Turning your speech into text on this device…')), check.stoppedOther && check.phase === 'done' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-note"
  }, say(t('speech_setup.test_stopped_other'), 'Other listening stopped for this test. Turn it back on when you are ready.')), report && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "data-testid": "speech-setup-result"
  }, !report.heardSound && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error"
  }, say(t('speech_setup.result_silent'), 'No sound reached the microphone. Check that it is plugged in, not muted, and selected in your device settings.')), report.heardSound && !report.heardSpeech && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error"
  }, say(t('speech_setup.result_quiet'), 'The microphone works, but it did not pick up clear speech. Try again and speak a little louder or closer.')), report.heardSpeech && report.tier == null && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-note"
  }, /*#__PURE__*/React.createElement("span", {
    className: "allo-ss-ok"
  }, say(t('speech_setup.result_level_ok'), 'Your microphone works.'))), report.heardSpeech && report.tier != null && /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-heard"
  }, /*#__PURE__*/React.createElement("strong", null, say(t('speech_setup.result_heard'), 'What it heard:')), ' ', /*#__PURE__*/React.createElement("span", {
    "data-testid": "speech-setup-transcript"
  }, report.transcript || say(t('speech_setup.result_no_words'), 'No words came through. Try again.'))), assessment && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-note",
    "data-testid": "speech-setup-speed",
    "data-verdict": assessment.verdict
  }, assessment.speed >= 1.1 ? say(t('speech_setup.result_speed'), 'This device worked {speed} times faster than speech.', {
    speed: assessment.speed
  }) : assessment.verdict === 'slow' ? say(t('speech_setup.result_speed_slower'), 'This device took longer than the speech itself.') : say(t('speech_setup.result_speed_even'), 'This device took about as long as the speech itself.'), ' ', assessment.verdict === 'lesson' && say(t('speech_setup.result_lesson'), 'That is fast enough for long dictation or a whole lesson.'), assessment.verdict === 'short' && say(t('speech_setup.result_short'), 'That is fine for short answers, but it may fall behind during a whole lesson.'), assessment.verdict === 'slow' && (tier === 'tiny' ? say(t('speech_setup.result_slow'), 'Expect pauses after you speak, even on short answers.') : say(t('speech_setup.result_slow_smaller'), 'Expect pauses after you speak. A smaller size would run faster.')), assessment.biggerTier && /*#__PURE__*/React.createElement("span", null, ' ', say(t('speech_setup.result_try_bigger'), 'This device may handle the {name} size too, which makes fewer mistakes. Download it and test again to be sure.', {
    name: tierLabels[assessment.biggerTier]
  })))), check.error === 'blocked' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error",
    role: "alert"
  }, say(t('speech_setup.mic_blocked'), 'The browser is blocking the microphone. Allow it from the icon beside the web address, then test again.')), check.error === 'missing' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error",
    role: "alert"
  }, say(t('speech_setup.mic_missing'), 'No microphone was found on this device.')), check.error === 'busy' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error",
    role: "alert"
  }, say(t('speech_setup.mic_busy'), 'Another app may be using the microphone. Close it and test again.')), check.error === 'failed' && /*#__PURE__*/React.createElement("p", {
    className: "allo-ss-error",
    role: "alert"
  }, say(t('speech_setup.mic_failed'), 'The test did not finish. Try again.'))), /*#__PURE__*/React.createElement("div", {
    className: "allo-ss-foot"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "allo-ss-button",
    onClick: onClose
  }, say(t('speech_setup.done'), 'Done')))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SpeechSetup = {
    SpeechSetupPanel: SpeechSetupPanel,
    _pure: { downloadSummary: downloadSummary, classifyDownloadError: classifyDownloadError, classifyMicError: classifyMicError, summaryKind: summaryKind, fillText: fillText, say: say }
  };
})();
