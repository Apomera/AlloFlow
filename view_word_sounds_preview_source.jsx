
function _wsIsGlobalMuted() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__alloGlobalMuted === true || window._alloGlobalMute === true) return true;
    if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted() === true) return true;
  } catch (_) {}
  return false;
}

function _wsHardAiBlocked(t) {
  if (typeof window === 'undefined') return true;
  try {
    if (window.__alloStudentAiDisabled === true) return true;
    if (window.__alloAiSecretsLocked === true) return true;
    if (window.__alloQrStudentMode === true) return true;
    if (window.__alloOfflineOnly === true) return true;
    var mp = window.ALLOFLOW_MANAGED_AI_POLICY;
    if (mp && typeof mp === 'object') {
      if (mp.disabled === true || mp.allowAi === false) return true;
      if (Array.isArray(mp.allowedBackends) && mp.allowedBackends.length === 0) return true;
    }
    var sp = window.AlloModules && window.AlloModules.StudentPolicy;
    if (sp && typeof sp === 'object') {
      if (sp.disabled === true || sp.allowAi === false || sp.aiEnabled === false) return true;
      if (typeof sp.isAiBlocked === 'function' && sp.isAiBlocked()) return true;
    }
    if (typeof window.__alloAiSetupDoorway === 'function') {
      var door = window.__alloAiSetupDoorway('tts', t);
      if (door && door.disabled) return true;
    }
  } catch (_) {
    return true;
  }
  return false;
}

function WordSoundsPreviewView(props) {
  props = props && typeof props === 'object' ? props : {};
  function label(key, fallback, values) {
    var fullKey = 'word_sounds.' + key;
    var translated = typeof props.t === 'function' ? props.t(fullKey, values || {}) : '';
    var text = typeof translated === 'string' && translated && translated !== fullKey ? translated : fallback;
    return text.replace(/\{(\w+)\}/g, function(match, name) { return values && Object.prototype.hasOwnProperty.call(values, name) && values[name] != null ? String(values[name]) : match; });
  }
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
  var prepareWordSoundsSession = props.prepareWordSoundsSession;
  var wordSoundsAudioCoverage = props.wordSoundsAudioCoverage;
  var requestIncompleteAudioConfirmation = props.requestIncompleteAudioConfirmation;
  var missingAudioLabels = wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingLabels)
    ? wordSoundsAudioCoverage.missingLabels
    : ((wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingWords)) ? wordSoundsAudioCoverage.missingWords : []);
  // Treat an omitted role as the educator view so older call sites retain the
  // review path. Learner call sites pass false explicitly.
  var isTeacherMode = props.isTeacherMode !== false;
  var readinessApi = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.WordSoundsReadiness;
  var readinessResource = React.useMemo(function () {
    return generatedContent && Object.assign({}, generatedContent, {
      lessonPlanSequence: Array.isArray(wsActivitySequence) && wsActivitySequence.length ? wsActivitySequence : generatedContent.lessonPlanSequence,
    });
  }, [generatedContent, wsActivitySequence]);
  var readinessBinding = readinessApi ? readinessApi.identity(readinessResource, { route: 'student-pack' }) : null;
  var readinessRunRef = React.useRef({ binding: readinessBinding, controller: null, mounted: true, epoch: 0 });
  var readinessCheckButtonRef = React.useRef(null);
  var readinessCancelButtonRef = React.useRef(null);
  var readinessPanelRef = React.useRef(null);
  var readinessState = React.useState({ busy: false, notice: '' });
  var readinessStateValue = readinessState[0], setReadinessState = readinessState[1];
  var readinessMatches = readinessRunRef.current.binding === readinessBinding;
  var readinessBusy = readinessMatches && readinessStateValue.busy;
  var readinessNotice = readinessMatches ? readinessStateValue.notice : '';
  React.useEffect(function () {
    var current = readinessRunRef.current;
    if (current.controller) current.controller.abort();
    current.binding = readinessBinding; current.controller = null; current.mounted = true; current.epoch += 1;
    setReadinessState({ busy: false, notice: '' });
    return function () { current.mounted = false; current.epoch += 1; if (current.controller) current.controller.abort(); };
  }, [readinessBinding]);
  React.useEffect(function () {
    if (typeof document === 'undefined') return;
    var active = document.activeElement;
    if (active && active !== document.body && !(readinessPanelRef.current && readinessPanelRef.current.contains(active))) return;
    var target = readinessBusy ? readinessCancelButtonRef.current : readinessNotice && readinessCheckButtonRef.current;
    if (target && target.isConnected && typeof target.focus === 'function') target.focus();
  }, [readinessBusy, readinessNotice]);
  var inspectedAudioCoverage = readinessApi ? readinessApi.inspect(readinessResource, { route: 'student-pack' }) : null;
  wordSoundsAudioCoverage = inspectedAudioCoverage || Object.assign({
    ready: 0, total: 0,
    missing: 0, embedded: 0, online: 0, deviceOnly: 0, unverified: 1, dependencies: [], missingLabels: [],
  }, wordSoundsAudioCoverage && typeof wordSoundsAudioCoverage === 'object' ? wordSoundsAudioCoverage : {}, { complete: false, teacherLedReady: false });
  var requiresTeacherSpeech = Boolean(wordSoundsAudioCoverage && wordSoundsAudioCoverage.requiresTeacher);
  missingAudioLabels = wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingLabels)
    ? wordSoundsAudioCoverage.missingLabels
    : ((wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingWords)) ? wordSoundsAudioCoverage.missingWords : []);
  var readinessCategoryNames = {
    "speech": label('readiness_category_speech', 'Words and text'),
    "phoneme": label('readiness_category_phoneme', 'Speech sounds'),
    "instruction": label('readiness_category_instruction', 'Instructions'),
    "feedback": label('readiness_category_feedback', 'Feedback'),
    "isolation": label('readiness_category_isolation', 'Sound position prompts'),
    "letter-name": label('readiness_category_letter_name', 'Letter names'),
  };
  var readableAudioLabel = function (value) {
    var parts = String(value || '').split(': '), category = parts.shift(), name = parts.join(': ');
    if (category === 'instruction' || category === 'feedback') name = name.replace(/^(inst_|fb_)/, '').replace(/_/g, ' ');
    var catLabel = Object.prototype.hasOwnProperty.call(readinessCategoryNames, category) ? readinessCategoryNames[category] : category;
    return catLabel + ': ' + name;
  };
  var checkReadiness = function () {
    var current = readinessRunRef.current;
    if (!readinessApi || !readinessResource || current.controller || !current.mounted) return;
    var controller = new AbortController(), epoch = ++current.epoch, binding = readinessBinding;
    current.controller = controller;
    setReadinessState({ busy: true, notice: '' });
    readinessApi.check(readinessResource, { route: 'student-pack', signal: controller.signal }).then(function (report) {
      if (!current.mounted || current.epoch !== epoch || current.binding !== binding) return;
      current.controller = null;
      setReadinessState({ busy: false, notice: report && !report.cancelled && !report.stale ? 'checked' : 'cancelled' });
    }).catch(function () {
      if (!current.mounted || current.epoch !== epoch || current.binding !== binding) return;
      current.controller = null;
      setReadinessState({ busy: false, notice: 'failed' });
    });
  };
  var cancelReadiness = function () {
    var current = readinessRunRef.current;
    current.epoch += 1;
    if (current.controller) current.controller.abort();
    current.controller = null;
    setReadinessState({ busy: false, notice: 'cancelled' });
  };
  // A missing-audio confirmation can outlive the resource that opened it.
  // Keep its callback tied to the exact prepared lesson, guard rapid double-clicks,
  // and allow launching again if the preview stays mounted after returning.
  var launchContext = React.useMemo(function () {
    try {
      var dataWords = Array.isArray(generatedContent && generatedContent.data) ? generatedContent.data.length : 0;
      var preloadedWords = Array.isArray(generatedContent && generatedContent.wsPreloadedWords) ? generatedContent.wsPreloadedWords.length : 0;
      return JSON.stringify([
        generatedContent && generatedContent.id || '',
        generatedContent && generatedContent.sessionConfig ? (generatedContent.sessionConfig.language || '') + ':' + (generatedContent.sessionConfig.voice || '') + ':' + (generatedContent.sessionConfig.fixedForm ? '1' : '0') : '',
        dataWords,
        preloadedWords,
        Array.isArray(wsActivitySequence) ? wsActivitySequence.join(',') : '',
        Boolean(isTeacherMode),
      ]);
    } catch (_) {
      return String((generatedContent && generatedContent.id) || '') + ':' + String(Boolean(isTeacherMode));
    }
  }, [generatedContent, wsActivitySequence, isTeacherMode]);
  var launchRef = React.useRef({ context: launchContext, launchingUntil: 0, mounted: true });
  if (launchRef.current.context !== launchContext) launchRef.current = { context: launchContext, launchingUntil: 0, mounted: true };
  React.useEffect(function () {
    launchRef.current.mounted = true;
    launchRef.current.launchingUntil = 0;
    return function () { launchRef.current.mounted = false; };
  }, []);
  var claimLaunch = function () {
    var current = launchRef.current;
    var now = Date.now();
    if (!current.mounted || current.context !== launchContext || now < current.launchingUntil) return false;
    current.launchingUntil = now + 600;
    return true;
  };
  var launchErrorState = React.useState('');
  var launchError = launchErrorState[0], setLaunchError = launchErrorState[1];
  var practiceState = React.useState({ busy: false, notice: '' });
  var practiceStatus = practiceState[0], setPracticeStatus = practiceState[1];
  var practiceControllerRef = React.useRef(null);
  var worksheetState = React.useState({ busy: false, notice: '' });
  var worksheetStatus = worksheetState[0], setWorksheetStatus = worksheetState[1];
  var worksheetBusyRef = React.useRef(false);
  var packetState = React.useState({ busy: false, notice: '' });
  var packetStatus = packetState[0], setPacketStatus = packetState[1];
  var packetBusyRef = React.useRef(false);
  var canPresentPractice = isTeacherMode && !generatedContent?.sessionConfig?.fixedForm && !generatedContent?.sessionConfig?.studentLocked;
  var isAssessmentLocked = !!(generatedContent?.sessionConfig?.fixedForm || generatedContent?.sessionConfig?.studentLocked);
  var rawPreviewWords = Array.isArray(generatedContent?.wsPreloadedWords) && generatedContent.wsPreloadedWords.length
    ? generatedContent.wsPreloadedWords
    : (Array.isArray(generatedContent?.data) ? generatedContent.data : []);
  var previewWords = !isAssessmentLocked
    ? rawPreviewWords.map(function (entry) {
        if (typeof entry === 'string') return entry.trim();
        if (entry && typeof entry === 'object') return String(entry.targetWord || entry.word || '').trim();
        return '';
      }).filter(Boolean)
    : [];
  var plannedSequence = Array.isArray(wsActivitySequence) && wsActivitySequence.length
    ? wsActivitySequence
    : (Array.isArray(generatedContent?.lessonPlanSequence) ? generatedContent.lessonPlanSequence : []);
  var formatActivityStep = function (actId) {
    var clean = String(actId || '').trim();
    if (!clean) return '';
    var fallback = clean.replace(/_/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); });
    return label('activity_' + clean, fallback);
  };
  var speakingWordState = React.useState(null);
  var speakingWordIdx = speakingWordState[0], setSpeakingWordIdx = speakingWordState[1];
  var previewSpeechTokenRef = React.useRef(0);
  var previewSpeechTimerRef = React.useRef(null);
  var previewMountedRef = React.useRef(true);
  var hasPreviewSpeech = typeof window !== 'undefined' && (
    (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function')
    || (typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function')
  );
  var stopPreviewWordSpeech = React.useCallback(function () {
    previewSpeechTokenRef.current += 1;
    if (previewSpeechTimerRef.current) {
      clearTimeout(previewSpeechTimerRef.current);
      previewSpeechTimerRef.current = null;
    }
    try {
      if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') {
        window.AlloSpeechPlayer.stop();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
    if (previewMountedRef.current) setSpeakingWordIdx(null);
  }, []);
  React.useEffect(function () {
    previewMountedRef.current = true;
    var onSpeechState = function (event) {
      var detail = (event && event.detail) || {};
      var st = detail.state;
      if (detail.isPlaying === false || st === 'idle' || st === 'stopped' || st === 'ended' || st === 'error') {
        if (previewMountedRef.current) setSpeakingWordIdx(null);
      }
    };
    var onMuteChanged = function (event) {
      var muted = (event && event.detail && event.detail.muted === true) || _wsIsGlobalMuted();
      if (muted) stopPreviewWordSpeech();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('allo-speech-state', onSpeechState);
      window.addEventListener('alloflow-mute-changed', onMuteChanged);
    }
    return function () {
      previewMountedRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('allo-speech-state', onSpeechState);
        window.removeEventListener('alloflow-mute-changed', onMuteChanged);
      }
      stopPreviewWordSpeech();
    };
  }, [stopPreviewWordSpeech]);
  var speakPreviewWord = function (wordText, idx) {
    if (!wordText || requiresTeacherSpeech) return;
    if (_wsIsGlobalMuted()) { stopPreviewWordSpeech(); return; }
    if (speakingWordIdx === idx) { stopPreviewWordSpeech(); return; }
    if (previewSpeechTimerRef.current) { clearTimeout(previewSpeechTimerRef.current); previewSpeechTimerRef.current = null; }
    var token = ++previewSpeechTokenRef.current;
    var lang = generatedContent?.sessionConfig?.language || props.wordSoundsLanguage || undefined;
    try {
      if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
        window.AlloSpeechPlayer.stop && window.AlloSpeechPlayer.stop();
        setSpeakingWordIdx(idx);
        var res = window.AlloSpeechPlayer.speak(wordText, lang ? { language: lang } : undefined);
        if (res && typeof res.then === 'function') {
          res.catch(function () {}).finally(function () {
            if (previewMountedRef.current && previewSpeechTokenRef.current === token) setSpeakingWordIdx(null);
          });
        }
      } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        window.speechSynthesis.cancel();
        var utter = new window.SpeechSynthesisUtterance(wordText);
        if (typeof lang === 'string' && lang.trim()) utter.lang = lang.trim();
        var rawSpeed = Number(props.ttsSpeed);
        if (Number.isFinite(rawSpeed) && rawSpeed > 0) utter.rate = Math.max(0.5, Math.min(2, rawSpeed));
        utter.volume = 1;
        var clearSpeech = function () {
          if (previewSpeechTimerRef.current) { clearTimeout(previewSpeechTimerRef.current); previewSpeechTimerRef.current = null; }
          if (previewMountedRef.current && previewSpeechTokenRef.current === token) setSpeakingWordIdx(null);
        };
        utter.onend = clearSpeech;
        utter.onerror = clearSpeech;
        previewSpeechTimerRef.current = setTimeout(clearSpeech, 12000);
        setSpeakingWordIdx(idx);
        window.speechSynthesis.speak(utter);
      }
    } catch (_) {
      if (previewSpeechTimerRef.current) { clearTimeout(previewSpeechTimerRef.current); previewSpeechTimerRef.current = null; }
      if (previewMountedRef.current) setSpeakingWordIdx(null);
    }
  };
  React.useEffect(function () {
    setPracticeStatus({ busy: false, notice: '' });
    setWorksheetStatus({ busy: false, notice: '' });
    setPacketStatus({ busy: false, notice: '' });
    worksheetBusyRef.current = false;
    packetBusyRef.current = false;
    stopPreviewWordSpeech();
    return function () {
      if (practiceControllerRef.current) practiceControllerRef.current.abort();
      practiceControllerRef.current = null;
      worksheetBusyRef.current = false;
      packetBusyRef.current = false;
    };
  }, [launchContext, stopPreviewWordSpeech]);
  var sendToWordSoundsPacket = async function () {
    if (!canPresentPractice || packetBusyRef.current) return;
    var sendFn = (typeof props.onSendToWordSoundsPacket === 'function')
      ? props.onSendToWordSoundsPacket
      : (typeof window !== 'undefined' && typeof window.__alloSendToWordSoundsPacket === 'function' ? window.__alloSendToWordSoundsPacket : null);
    if (typeof sendFn !== 'function') {
      setPacketStatus({ busy: false, notice: 'Word Sounds Packet handoff is unavailable in this view.' });
      return;
    }
    var wsWords = Array.isArray(generatedContent?.wsPreloadedWords) && generatedContent.wsPreloadedWords.length
      ? generatedContent.wsPreloadedWords : (Array.isArray(generatedContent?.data) ? generatedContent.data : []);
    var words = [];
    var seen = new Set();
    var pictures = {};
    wsWords.forEach(function (entry) {
      var w = typeof entry === 'string'
        ? entry.trim()
        : (entry && typeof entry === 'object' ? String(entry.targetWord || entry.word || entry.term || '').trim() : '');
      if (!w) return;
      var k = w.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        words.push(w);
      }
      if (entry && typeof entry === 'object' && k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
        var rawImg = String(entry.imgUri || entry.image || entry.imageUrl || entry.pictureUri || '').trim();
        if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml)/i.test(rawImg) && !Object.prototype.hasOwnProperty.call(pictures, k)) {
          pictures[k] = rawImg;
        }
      }
    });
    if (!words.length) {
      setPacketStatus({ busy: false, notice: 'No words are available to send.' });
      return;
    }
    packetBusyRef.current = true;
    setPacketStatus({ busy: true, notice: '' });
    try {
      var ok = await sendFn({
        title: generatedContent?.title || label('modal_title', 'Word Sounds'),
        lang: generatedContent?.sessionConfig?.language || props.wordSoundsLanguage || 'English',
        words: words,
        pattern: String(generatedContent?.sessionConfig?.pattern || generatedContent?.sessionConfig?.phonicsPattern || generatedContent?.sessionConfig?.focusPattern || '').trim(),
        activities: plannedSequence.slice(),
        pictures: pictures
      });
      if (previewMountedRef.current) {
        setPacketStatus({ busy: false, notice: ok === false ? 'Could not hand off draft to Word Sounds Packet.' : 'Sent word list to Word Sounds Packet in a new tab.' });
      }
    } catch (_) {
      if (previewMountedRef.current) {
        setPacketStatus({ busy: false, notice: 'Could not hand off draft to Word Sounds Packet.' });
      }
    } finally {
      packetBusyRef.current = false;
    }
  };
  var downloadActivityWorksheet = async function () {
    if (!canPresentPractice || worksheetBusyRef.current) return;
    worksheetBusyRef.current = true;
    setWorksheetStatus({ busy: true, notice: '' });
    try {
      var resolveBuilder = function () {
        if (typeof window === 'undefined') return null;
        if (window.AlloWordPracticeMedia && typeof window.AlloWordPracticeMedia.buildWordSoundsWorksheetHtml === 'function') {
          return window.AlloWordPracticeMedia.buildWordSoundsWorksheetHtml;
        }
        if (window.AlloModules && window.AlloModules.WordPractice && typeof window.AlloModules.WordPractice.buildWordSoundsWorksheetHtml === 'function') {
          return window.AlloModules.WordPractice.buildWordSoundsWorksheetHtml;
        }
        if (window.AlloPacketPrintCards && typeof window.AlloPacketPrintCards.buildWordSoundsWorksheetHtml === 'function') {
          return window.AlloPacketPrintCards.buildWordSoundsWorksheetHtml;
        }
        return null;
      };
      var buildFn = resolveBuilder();
      if (!buildFn && typeof window !== 'undefined' && typeof window.__alloLoadPlugin === 'function') {
        await window.__alloLoadPlugin('word_practice_module.js');
        buildFn = resolveBuilder();
      }
      if (!buildFn) throw new Error('Worksheet builder unavailable');
      var wsWords = Array.isArray(generatedContent?.wsPreloadedWords) && generatedContent.wsPreloadedWords.length
        ? generatedContent.wsPreloadedWords : (generatedContent?.data || []);
      var wsTitle = generatedContent?.title || label('modal_title', 'Word Sounds');
      var wsInput = {
        title: wsTitle,
        words: wsWords,
        activities: plannedSequence.length ? plannedSequence : undefined,
        tracing: generatedContent?.sessionConfig?.tracingCases || 'both',
        symbols: (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.WordSoundsSymbols) || null,
        matcher: (typeof window !== 'undefined' && (window.AlloWordPictureMatcher || (window.AlloModules && window.AlloModules.WordPictureMatcher))) || null,
      };
      var html = buildFn(wsInput, { pictures: true, answerKey: true, hints: true });
      if (!html || typeof html !== 'string') throw new Error('Empty worksheet');
      var slug = String(wsTitle || 'word-sounds').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'word-sounds';
      var fname = slug + '-activity-worksheet.html';
      if (typeof window !== 'undefined' && typeof window.Blob === 'function' && window.URL && typeof window.URL.createObjectURL === 'function' && typeof document !== 'undefined' && document.body) {
        var blob = new window.Blob([html], { type: 'text/html;charset=utf-8' });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = fname;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { try { window.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      }
      if (previewMountedRef.current) {
        setWorksheetStatus({ busy: false, notice: label('worksheet_downloaded', 'Downloaded {file}. Open it in any browser to print.', { file: fname }) });
      }
    } catch (_) {
      if (previewMountedRef.current) {
        setWorksheetStatus({ busy: false, notice: label('worksheet_failed', 'The activity worksheet could not be prepared. Please try again.') });
      }
    } finally {
      worksheetBusyRef.current = false;
    }
  };
  var openWordPractice = async function () {
    if (!canPresentPractice || practiceControllerRef.current) return;
    var controller = new AbortController();
    practiceControllerRef.current = controller;
    setPracticeStatus({ busy: true, notice: '' });
    try {
      if (typeof window.__alloOpenWordPractice !== 'function') throw new Error('Presentation tools unavailable');
      var words = Array.isArray(generatedContent?.wsPreloadedWords) && generatedContent.wsPreloadedWords.length
        ? generatedContent.wsPreloadedWords : (generatedContent?.data || []);
      await window.__alloOpenWordPractice({
        words: words,
        title: generatedContent?.title || label('practice_title', 'Word Fluency Pop-Up'),
        language: generatedContent?.sessionConfig?.language || props.wordSoundsLanguage || 'English',
        source: 'word-sounds', callTTS: _wsHardAiBlocked(props.t) ? undefined : props.callTTS, selectedVoice: props.selectedVoice,
        ttsSpeed: props.ttsSpeed, t: props.t, currentUiLanguage: props.currentUiLanguage, signal: controller.signal,
      });
      if (!controller.signal.aborted) setPracticeStatus({ busy: false, notice: '' });
    } catch (_) {
      if (!controller.signal.aborted) setPracticeStatus({ busy: false, notice: label('practice_open_failed', 'Presentation tools could not open. Please try again.') });
    } finally {
      if (practiceControllerRef.current === controller) practiceControllerRef.current = null;
    }
  };
  var launchPreparedActivity = function() {
    if (!claimLaunch()) return;
    setLaunchError('');
    try {
    var initialActivity = (wsActivitySequence && wsActivitySequence.length > 0) ? wsActivitySequence[0] : 'counting';
    if (typeof prepareWordSoundsSession === 'function') {
      prepareWordSoundsSession({
        ...(generatedContent?.sessionConfig || {}),
        resourceId: generatedContent?.id || null,
        initialActivity,
      });
    }
    setWordSoundsActivity(initialActivity);
    setWordSoundsAutoReview(false);
    setIsWordSoundsMode(true);
    } catch (_) {
      launchRef.current.launchingUntil = 0;
      setLaunchError(label('preview_launch_failed', 'The activity could not open. Please try again.'));
    }
  };
  return (
                  <div className="space-y-6">{launchError && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{launchError}</p>}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center">
                      <div className="text-4xl mb-3" aria-hidden="true">🎵</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{generatedContent?.title || label('modal_title', 'Word Sounds')}</h3>
                      <p className="text-sm text-slate-600 mb-1">{generatedContent?.configSummary || label('preview_ready', 'Ready to practice')}</p>
                      {Array.isArray(generatedContent?.data) && <p className="text-xs text-violet-700 font-medium">{label('preview_word_count', '{count} words loaded', { count: generatedContent.data.length })}</p>}
                      {!isAssessmentLocked && plannedSequence.length > 0 && (
                        <div data-ws-preview-sequence="true" role="group" className="mt-3 flex flex-wrap items-center justify-center gap-1.5" aria-label={label('preview_activity_plan', 'Planned activities')}>
                          {plannedSequence.map(function (actId, actIdx) {
                            return (
                              <span key={String(actId) + '-' + actIdx} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-semibold text-violet-900">
                                <span className="text-violet-700 font-bold">{actIdx + 1}.</span>
                                <span>{formatActivityStep(actId)}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {previewWords.length > 0 && (
                        <details data-ws-preview-words="true" className="mt-4 rounded-xl border border-violet-200 bg-white p-3 text-start">
                          <summary className="min-h-11 flex items-center justify-between gap-2 cursor-pointer text-sm font-bold text-violet-900 focus-visible:ring-2 focus-visible:ring-violet-600 rounded-lg px-1">
                            <span>{label('preview_words_heading', 'Preview words ({count})', { count: previewWords.length })}</span>
                            <span className="text-xs font-medium text-slate-600">
                              {(!requiresTeacherSpeech && hasPreviewSpeech)
                                ? label('preview_words_tap_listen', 'Select a word to hear it')
                                : label('preview_words_list_hint', 'Practice word list')}
                            </span>
                          </summary>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {previewWords.slice(0, 30).map(function (wordText, wIdx) {
                              var canListenWord = !requiresTeacherSpeech && hasPreviewSpeech;
                              var isSpeakingWord = speakingWordIdx === wIdx;
                              return canListenWord ? (
                                <button
                                  key={wordText + '-' + wIdx}
                                  type="button"
                                  data-ws-preview-word={wIdx}
                                  aria-pressed={isSpeakingWord}
                                  aria-label={label('preview_listen_word', 'Hear word: {word}', { word: wordText })}
                                  onClick={function () { speakPreviewWord(wordText, wIdx); }}
                                  className={'min-h-11 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-600 ' + (isSpeakingWord ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100')}
                                >
                                  <span aria-hidden="true">{isSpeakingWord ? '⏹ ' : '🔊 '}</span>
                                  {wordText}
                                </button>
                              ) : (
                                <span
                                  key={wordText + '-' + wIdx}
                                  data-ws-preview-word={wIdx}
                                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800"
                                >
                                  {wordText}
                                </span>
                              );
                            })}
                            {previewWords.length > 30 && (
                              <span className="inline-flex min-h-11 items-center px-2 text-xs font-medium text-slate-600">
                                {label('preview_words_more', '+{count} more', { count: previewWords.length - 30 })}
                              </span>
                            )}
                          </div>
                        </details>
                      )}
                      {canPresentPractice && <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={openWordPractice} disabled={practiceStatus.busy} aria-busy={practiceStatus.busy} aria-describedby="word-sounds-preview-presentation-help" className="min-h-11 rounded-lg border border-violet-300 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{practiceStatus.busy ? label('practice_opening', 'Opening presentation tools…') : label('practice_present_export', 'Present & Export')}</button>
                          <button type="button" data-ws-worksheet-btn="true" onClick={downloadActivityWorksheet} disabled={worksheetStatus.busy} aria-busy={worksheetStatus.busy} aria-describedby="word-sounds-preview-presentation-help" className="min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-100 disabled:opacity-60 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{worksheetStatus.busy ? label('worksheet_building', 'Preparing worksheet…') : label('practice_activity_worksheet', 'Print / Download Activity Worksheet')}</button>
                          <button type="button" data-testid="word-sounds-send-packet" onClick={sendToWordSoundsPacket} disabled={packetStatus.busy || !previewWords.length} aria-busy={packetStatus.busy} aria-describedby="word-sounds-preview-presentation-help" className="min-h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">{packetStatus.busy ? 'Sending to Packet…' : 'Send to Word Sounds Packet'}</button>
                        </div>
                        <p id="word-sounds-preview-presentation-help" className="mt-2 text-sm text-slate-600">{label('practice_export_help', 'Project these words or download HTML and PowerPoint with optional audio and prepared activities.')}</p>
                        {practiceStatus.notice && <p role="status" aria-live="polite" aria-atomic="true" className="mt-1 text-sm text-amber-900">{practiceStatus.notice}</p>}
                        {worksheetStatus.notice && <p role="status" aria-live="polite" aria-atomic="true" className="mt-1 text-sm text-indigo-900">{worksheetStatus.notice}</p>}
                        {packetStatus.notice && <p role="status" aria-live="polite" aria-atomic="true" className="mt-1 text-sm text-emerald-900">{packetStatus.notice}</p>}
                      </div>}
                      {isTeacherMode && wordSoundsAudioCoverage && (
                        <section ref={readinessPanelRef} className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-start" aria-label={label('readiness_panel', 'Ready for students: audio check')} aria-busy={readinessBusy} onKeyDown={event => { if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return; if (event.key === 'Escape' && readinessBusy) { event.preventDefault(); cancelReadiness(); } }}>
                          <h4 className="font-bold text-slate-800">{label('readiness_heading', 'Ready for students')} <span className="text-sm font-medium">{label('readiness_audio_qualifier', 'Audio check')}</span></h4>
                          <p role="status" aria-live="polite" aria-atomic="true" className={`mt-2 text-sm font-bold ${wordSoundsAudioCoverage.complete ? 'text-emerald-700' : 'text-amber-800'}`}>
                            {readinessBusy ? label('readiness_checking', 'Checking local clips. This may take up to 30 seconds.') : (wordSoundsAudioCoverage.teacherLedReady ? label('readiness_teacher_led_ready', 'Ready with a teacher present') : wordSoundsAudioCoverage.complete ? label('readiness_ready', 'Audio verified for this student pack') : label('readiness_review', 'Audio needs checking or review'))}
                            {!readinessBusy && readinessNotice === 'cancelled' && <span className="block">{label('readiness_cancelled', 'Audio check cancelled. Readiness is unconfirmed.')}</span>}
                            {!readinessBusy && readinessNotice === 'failed' && <span className="block">{label('readiness_failed', 'Audio could not be checked. Review the lesson and try again.')}</span>}
                          </p>
                          {wordSoundsAudioCoverage.requiresTeacher && <p className="mt-2 text-sm text-violet-900">{label('readiness_teacher_led_words', 'A teacher must say these words aloud: {words}. This lesson needs teacher support.', { words: Array.isArray(wordSoundsAudioCoverage.teacherLedWords) ? wordSoundsAudioCoverage.teacherLedWords.join(', ') : '' })}</p>}
                          <p className="mt-2 text-sm text-slate-700">{label('readiness_counts', '{ready}/{total} required clips verified; {embedded} embedded, {online} online dependencies, {deviceOnly} available only on this device.', wordSoundsAudioCoverage)}</p>
                          <p className="mt-2 text-xs text-slate-600">{label('readiness_limits', 'This checks prepared audio and syllable counts. Review the lesson content before sharing. Online app banks and device cache are not embedded in the student pack; this check cannot confirm them on another device.')}</p>
                          {missingAudioLabels.length > 0 && <p className="mt-2 text-sm text-amber-900">{label('preview_missing', 'Missing: {labels}', { labels: missingAudioLabels.slice(0, 5).map(readableAudioLabel).join(', ') })}{missingAudioLabels.length > 5 && label('preview_more', ', plus {count} more', { count: missingAudioLabels.length - 5 })}</p>}
                          {wordSoundsAudioCoverage.dependencies && wordSoundsAudioCoverage.dependencies.length > 0 && <p className="mt-2 text-sm text-slate-700">{label('readiness_dependencies', 'App or device audio to review: {labels}', { labels: wordSoundsAudioCoverage.dependencies.slice(0, 5).map(readableAudioLabel).join(', ') })}{wordSoundsAudioCoverage.dependencies.length > 5 && label('preview_more', ', plus {count} more', { count: wordSoundsAudioCoverage.dependencies.length - 5 })}</p>}
                          {wordSoundsAudioCoverage.omittedLabels && wordSoundsAudioCoverage.omittedLabels.length > 0 && <p className="mt-2 text-sm text-amber-900">{label('readiness_omitted', 'Prepared clips omitted from delivery: {labels}', { labels: wordSoundsAudioCoverage.omittedLabels.slice(0, 5).join(', ') })}{wordSoundsAudioCoverage.omittedLabels.length > 5 && label('preview_more', ', plus {count} more', { count: wordSoundsAudioCoverage.omittedLabels.length - 5 })}</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button ref={readinessCheckButtonRef} type="button" onClick={checkReadiness} disabled={readinessBusy || !readinessApi} className="min-h-11 rounded-lg border border-violet-300 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{label('readiness_check', 'Check prepared audio')}</button>
                            {readinessBusy && <button ref={readinessCancelButtonRef} type="button" onClick={cancelReadiness} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{label('readiness_cancel', 'Cancel check')}</button>}
                          </div>
                          <p className="mt-2 text-xs text-slate-600">{label('readiness_recovery', 'For missing speech clips or older syllable boards, open Teacher: Review Words & Audio and choose Repair prepared lesson. Review any flagged items, then save the updated lesson before sharing.')}</p>
                        </section>
                      )}
                      {!isTeacherMode && wordSoundsAudioCoverage && wordSoundsAudioCoverage.requiresTeacher && (
                        <p role="status" className="mt-4 rounded-xl border border-violet-200 bg-white p-3 text-sm font-medium text-violet-900">
                          {label('preview_student_teacher_required_note', 'Your teacher needs to say marked words aloud for this lesson. Ask your teacher to begin.')}
                        </p>
                      )}
                      <div className={`grid grid-cols-1 ${isTeacherMode ? 'sm:grid-cols-2' : ''} gap-3 mt-5`}>
                        {isTeacherMode && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!claimLaunch()) return;
                              setLaunchError('');
                              try {
                                const initialActivity = (wsActivitySequence && wsActivitySequence.length > 0) ? wsActivitySequence[0] : 'counting';
                                if (typeof prepareWordSoundsSession === 'function') {
                                  prepareWordSoundsSession({
                                    ...(generatedContent?.sessionConfig || {}),
                                    resourceId: generatedContent?.id || null,
                                    initialActivity,
                                  });
                                }
                                setWordSoundsActivity(initialActivity);
                                setIsWordSoundsMode(true);
                                setWordSoundsAutoReview(true);
                              } catch (_) {
                                launchRef.current.launchingUntil = 0;
                                setLaunchError(label('preview_launch_failed', 'The activity could not open. Please try again.'));
                              }
                            }}
                            className="min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-white text-violet-800 font-bold rounded-xl border-2 border-violet-300 hover:bg-violet-100 hover:border-violet-500 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
                          >
                            <BookOpen size={20} aria-hidden="true" />
                            <span className="text-start">
                              <span className="block">{label('preview_teacher_review', 'Teacher: Review Words & Audio')}</span>
                              <span className="block text-xs font-medium text-violet-600">{label('preview_teacher_hint', 'Check or edit the lesson before students begin')}</span>
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!isTeacherMode && requiresTeacherSpeech}
                          onClick={() => {
                            if (isTeacherMode
                                && wordSoundsAudioCoverage
                                && !wordSoundsAudioCoverage.complete
                                && !wordSoundsAudioCoverage.teacherLedReady
                                && typeof requestIncompleteAudioConfirmation === 'function') {
                              requestIncompleteAudioConfirmation(wordSoundsAudioCoverage, launchPreparedActivity);
                              return;
                            }
                            // Honor the lesson-plan sequence exactly like the
                            // Review button above — 'counting' is only the
                            // no-sequence fallback.
                            launchPreparedActivity();
                          }}
                          className="min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all motion-reduce:transition-none motion-safe:hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
                        >
                          <Play size={20} aria-hidden="true" />
                          <span className="text-start">
                            <span className="block">{requiresTeacherSpeech ? (isTeacherMode ? label('preview_teacher_led_start', 'Start teacher-led practice') : label('preview_teacher_required', 'Ask your teacher to begin')) : isTeacherMode ? label('preview_student_practice', 'Student: Start Practice') : label('preview_start', 'Start Activity')}</span>
                            <span className="block text-xs font-medium text-indigo-100">{requiresTeacherSpeech ? label('preview_teacher_led_hint', 'The teacher says each marked word aloud') : label('preview_start_hint', 'Begin the prepared activities now')}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
  );
}
