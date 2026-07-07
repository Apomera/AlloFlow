/* eslint-disable */
// stem_tool_accesslens.js — Access Lens (learner accessibility camera kit)
// ---------------------------------------------------------------------------
// A student points their camera at the world and gets four kinds of access:
//   • Describe   — factual scene description for students who are blind or
//                  have low vision, with read-aloud.
//   • Read       — OCR of any text in the photo, re-rendered in a large-print,
//                  spacing-adjustable reader panel, with read-aloud.
//   • Translate  — text in the photo transcribed and translated into the
//                  student's chosen language.
//   • Investigate— Socratic mode: the AI states only what it can SEE, asks
//                  noticing/testing questions, and offers its identification
//                  strictly labeled as a guess with a confidence level. It
//                  never appraises value and never presents guesses as fact.
//
// Capture paths (in order of preference):
//   1. <input type="file" accept="image/*" capture="environment"> — works in
//      the Gemini Canvas iframe with zero camera permissions (Story Forge
//      "Snap Your Writing" precedent); on phones this opens the rear camera.
//   2. In-app getUserMedia live preview when the embedding context allows it.
//   3. Pop-out companion window (same escape-hatch pattern as Video Studio:
//      a real top-level browsing context where camera permission prompts
//      work even when the Canvas iframe denies them). Photo returns via
//      postMessage with an ack handshake; only the chosen JPEG crosses.
//
// Privacy invariants (FERPA):
//   - The photo lives ONLY in component state (in-memory object URL/data URL).
//     It is NEVER written to ctx.toolData / saved projects / exports.
//   - Quest slice '_accessLens' persists booleans and counters only.
//   - Zero AI traffic when ctx.aiHintsEnabled is off (house AI-gating rule);
//     every analysis is user-initiated, nothing auto-fires.
//   - UI reminds students to photograph things, not people.
//
// Architecture matches the STEM Lab plugin contract (see stem_tool_cellular.js):
// registerTool + render(ctx) + hooks-only state + SSR-safe first render (no
// effects, no navigator/document access during render).
(function () {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_accesslens.js loaded before StemLab registry — bailing');
    return;
  }

  if (typeof document !== 'undefined' && !document.getElementById('accesslens-css')) {
    var _st = document.createElement('style');
    _st.id = 'accesslens-css';
    _st.textContent = [
      '.accesslens-tab:focus-visible, .accesslens-btn:focus-visible { outline: 3px solid #0ea5e9; outline-offset: 2px; }',
      '@keyframes accesslens-pulse { 0% { opacity: 0.55; } 50% { opacity: 1; } 100% { opacity: 0.55; } }',
      '.accesslens-busy { animation: accesslens-pulse 1.2s ease-in-out infinite; }',
      '@media (max-width: 720px) { [data-accesslens-columns] { grid-template-columns: 1fr !important; } }'
    ].join('\n');
    if (document.head) document.head.appendChild(_st);
  }

  // Companion window (camera fallback outside the Canvas iframe). Same CDN
  // hosting pattern as video_studio/video_studio.html.
  var LENS_URL = 'https://alloflow-cdn.pages.dev/access_lens/access_lens.html?v=1';

  var TARGET_LANGS = [
    'Spanish', 'French', 'Portuguese', 'Arabic', 'Somali', 'Vietnamese',
    'Chinese (Simplified)', 'Haitian Creole', 'Russian', 'Ukrainian',
    'Swahili', 'Farsi', 'Pashto', 'Khmer', 'Tagalog', 'English'
  ];

  // ═══════════════════════════════════════════════════════════════════════
  //  PURE HELPERS (no React, no DOM) — prompt builders + parsers
  // ═══════════════════════════════════════════════════════════════════════
  function bandPhrase(band) {
    if (band === 'k2') return 'a young student in kindergarten to grade 2; use very simple words and short sentences';
    if (band === 'g35') return 'a student in grades 3 to 5; use clear, friendly language';
    if (band === 'g912') return 'a high school student; normal vocabulary is fine';
    return 'a middle school student; keep language clear and concrete';
  }

  function describePrompt(band) {
    return 'You are describing a photo for a student who is blind or has low vision. The student took this photo themselves and cannot see it. Audience: ' + bandPhrase(band) + '.\n' +
      'Describe only what is actually visible:\n' +
      '1. One short overview sentence first.\n' +
      '2. Then the layout: what is on the left, center, right, near, and far.\n' +
      '3. Objects with their colors, rough sizes, and textures.\n' +
      '4. Read out any text you can see, word for word.\n' +
      '5. If a person appears, say only "a person" plus clothing color and where they are. Never guess identity, age, gender, or feelings.\n' +
      'Never guess brands, prices, or value. If you are not sure about something, say you are not sure. ' +
      'Plain sentences only, no markdown, no headings.';
  }

  function readPrompt() {
    return 'Transcribe ALL text visible in this photo, exactly as written, in natural reading order (top to bottom, left to right, or right to left if the language reads that way). Keep line breaks. ' +
      'If a word is too blurry to read, write [unclear] in its place. ' +
      'Output ONLY the transcribed text with no commentary. ' +
      'If there is no readable text at all, output exactly: NO_TEXT_FOUND';
  }

  function translatePrompt(lang) {
    return 'This photo contains text. Do two things:\n' +
      '1. Transcribe the text exactly as written, in reading order. Use [unclear] for unreadable words.\n' +
      '2. Translate that text into ' + lang + '. Keep the meaning natural, not word for word.\n' +
      'Format your answer EXACTLY like this, with these two markers on their own lines:\n' +
      'ORIGINAL:\n(the transcribed text)\n' +
      'TRANSLATION:\n(the translation into ' + lang + ')\n' +
      'If there is no readable text, output exactly: NO_TEXT_FOUND';
  }

  function inquirePrompt(band) {
    return 'You are a Socratic science guide looking at a photo a student just took of an object they are curious about. Audience: ' + bandPhrase(band) + '.\n' +
      'Your job is NOT to lecture or identify with false confidence. Respond with STRICT JSON only (no markdown fences, no extra text):\n' +
      '{"observations":["2 or 3 things you can literally SEE in the photo (colors, shapes, textures, markings)"],' +
      '"questions":["3 short questions that push the student to notice, compare, or test something about the object; each answerable by looking, touching safely, measuring, or trying something, never by memorized trivia"],' +
      '"guess":{"what":"your best guess at what the object is","confidence":"low|medium|high","why":"the visible evidence for the guess and what evidence would change your mind"},' +
      '"tryThis":"one safe, concrete way the student could test whether the guess is right"}\n' +
      'Rules: observations must be visible facts only. Never state a price or value. Never present the guess as certain. If the photo is too unclear, use low confidence and say why in the why field.';
  }

  // Robust JSON extraction: strips code fences, grabs first {...last}.
  function parseInquire(text) {
    if (!text || typeof text !== 'string') return null;
    var s = text.replace(/```json/gi, '```').split('```').join('');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a === -1 || b === -1 || b <= a) return null;
    var obj;
    try { obj = JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
    if (!obj || !obj.guess || !Array.isArray(obj.questions) || !Array.isArray(obj.observations)) return null;
    obj.questions = obj.questions.slice(0, 4).map(String);
    obj.observations = obj.observations.slice(0, 4).map(String);
    obj.tryThis = obj.tryThis ? String(obj.tryThis) : '';
    obj.guess = {
      what: String(obj.guess.what || ''),
      confidence: /^(low|medium|high)$/i.test(String(obj.guess.confidence)) ? String(obj.guess.confidence).toLowerCase() : 'low',
      why: String(obj.guess.why || '')
    };
    return obj;
  }

  function parseTranslation(text) {
    if (!text || typeof text !== 'string') return null;
    if (text.indexOf('NO_TEXT_FOUND') !== -1) return { none: true };
    var oi = text.indexOf('ORIGINAL:'), ti = text.indexOf('TRANSLATION:');
    if (oi === -1 || ti === -1 || ti <= oi) return { original: '', translated: text.trim() };
    return {
      original: text.slice(oi + 9, ti).trim(),
      translated: text.slice(ti + 12).trim()
    };
  }

  function splitDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string') return null;
    var m = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!m) return null;
    return { mime: m[1], base64: m[2] };
  }

  function confidenceLabel(c) {
    if (c === 'high') return 'fairly confident, but still a guess';
    if (c === 'medium') return 'somewhat confident guess';
    return 'low-confidence guess';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPONENT
  // ═══════════════════════════════════════════════════════════════════════
  function AccessLens(props) {
    var ctx = props.ctx;
    var React = ctx.React;
    var h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;
    var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
    var _t = function (k, fb) { var v = __alloT(k, fb); return (v == null || v === k) ? fb : v; };

    var ctxRef = useRef(ctx); ctxRef.current = ctx;
    var aiOn = !!ctx.aiHintsEnabled;
    var vision = (typeof ctx.callGeminiVision === 'function') ? ctx.callGeminiVision : null;
    var canAnalyze = aiOn && !!vision;

    // ── theme ──
    var dark = !!ctx.isDark, contrast = !!ctx.isContrast;
    var C = {
      bg: dark ? '#0b1220' : '#f8fafc',
      panel: dark ? '#0f172a' : '#ffffff',
      border: dark ? '#1e293b' : '#e2e8f0',
      soft: dark ? '#111827' : '#f1f5f9',
      text: dark ? '#e2e8f0' : '#1e293b',
      sub: dark ? '#94a3b8' : '#64748b',
      accent: contrast ? (dark ? '#7dd3fc' : '#075985') : (dark ? '#38bdf8' : '#0284c7'),
      // Filled (primary/pressed) buttons use a fixed sky-700 so white text
      // clears 4.5:1 in BOTH themes (the lighter dark-mode accent is 2.1:1).
      btnBg: contrast ? (dark ? '#075985' : '#0c4a6e') : '#0369a1',
      accentBg: dark ? '#082f49' : '#e0f2fe',
      warnBg: dark ? '#422006' : '#fef3c7',
      warnBorder: dark ? '#a16207' : '#f59e0b',
      okBg: dark ? '#052e16' : '#dcfce7'
    };

    // ── state (photo is in-memory ONLY; never persisted) ──
    var sMode = useState('describe'); var mode = sMode[0], setMode = sMode[1];
    var sPhoto = useState(null); var photo = sPhoto[0], setPhoto = sPhoto[1]; // {dataUrl}
    var sBusy = useState(''); var busy = sBusy[0], setBusy = sBusy[1];        // '' | mode id
    var sErr = useState(''); var err = sErr[0], setErr = sErr[1];
    var sResults = useState({}); var results = sResults[0], setResults = sResults[1];
    var sCam = useState('idle'); var camState = sCam[0], setCamState = sCam[1]; // idle|starting|live|denied
    var sLang = useState('Spanish'); var targetLang = sLang[0], setTargetLang = sLang[1];
    var sReaderPx = useState(24); var readerPx = sReaderPx[0], setReaderPx = sReaderPx[1];
    var sAnswers = useState({}); var answers = sAnswers[0], setAnswers = sAnswers[1];
    var sSpeaking = useState(false); var speaking = sSpeaking[0], setSpeaking = sSpeaking[1];
    var sLive = useState(''); var liveMsg = sLive[0], setLiveMsg = sLive[1];

    var fileRef = useRef(null);
    var videoRef = useRef(null);
    var streamRef = useRef(null);
    var lensWinRef = useRef(null);
    var busyRef = useRef(''); busyRef.current = busy;

    var announce = useCallback(function (m) {
      setLiveMsg(String(m || ''));
      var cx = ctxRef.current;
      if (cx && typeof cx.announceToSR === 'function') { try { cx.announceToSR(m); } catch (_) {} }
    }, []);

    // ── quest persistence: booleans/counters only, NEVER the photo ──
    var markQuest = useCallback(function (flag) {
      var cx = ctxRef.current;
      if (!cx || typeof cx.setToolData !== 'function') return;
      cx.setToolData(function (prev) {
        var cur = Object.assign({}, (prev && prev._accessLens) || {});
        if (cur[flag]) return prev;
        cur[flag] = true;
        var n = Object.assign({}, prev); n._accessLens = cur; return n;
      });
    }, []);

    // ── live camera stream attach/detach ──
    useEffect(function () {
      if (camState === 'live' && videoRef.current && streamRef.current) {
        try {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(function () {});
        } catch (_) {}
      }
      return function () {};
    }, [camState]);

    // stop stream + speech on unmount
    useEffect(function () {
      return function () {
        stopStream();
        stopSpeech();
        try { if (lensWinRef.current && !lensWinRef.current.closed) lensWinRef.current.close(); } catch (_) {}
      };
    }, []);

    // ── companion-window handshake (Video Studio pattern: trust only our
    //    own window reference, ack every photo) ──
    useEffect(function () {
      if (typeof window === 'undefined') return undefined;
      function onMsg(ev) {
        if (!lensWinRef.current || ev.source !== lensWinRef.current) return;
        var d = ev.data || {};
        if (d.type === 'allolens-photo' && d.payload && typeof d.payload.dataUrl === 'string') {
          acceptPhoto(d.payload.dataUrl, 'companion window');
          try { lensWinRef.current.postMessage({ type: 'allolens-photo-ack' }, '*'); } catch (_) {}
        } else if (d.type === 'allolens-closed') {
          lensWinRef.current = null;
        }
      }
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    function stopStream() {
      var s = streamRef.current;
      if (s && s.getTracks) { try { s.getTracks().forEach(function (tr) { tr.stop(); }); } catch (_) {} }
      streamRef.current = null;
    }

    function stopSpeech() {
      try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
      setSpeaking(false);
    }

    // ── photo intake: everything funnels through here; downscale to <=1024px
    //    JPEG so the AI payload stays small ──
    function acceptPhoto(dataUrl, sourceLabel) {
      var img = new Image();
      img.onload = function () {
        try {
          var maxDim = 1024;
          var w = img.width, hgt = img.height;
          var scale = Math.min(1, maxDim / Math.max(w, hgt));
          var cw = Math.max(1, Math.round(w * scale)), chg = Math.max(1, Math.round(hgt * scale));
          var cv = document.createElement('canvas');
          cv.width = cw; cv.height = chg;
          cv.getContext('2d').drawImage(img, 0, 0, cw, chg);
          var out = cv.toDataURL('image/jpeg', 0.85);
          setPhoto({ dataUrl: out });
          setResults({}); setAnswers({}); setErr('');
          stopSpeech();
          markQuest('captured');
          announce(_t('stem.accessLens.sr_photo_ready', 'Photo ready. Choose a lens mode and press Analyze.'));
        } catch (e) {
          setErr(_t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.'));
        }
      };
      img.onerror = function () {
        setErr(_t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.'));
      };
      img.src = dataUrl;
    }

    function onFileChosen(e) {
      var f = e.target && e.target.files && e.target.files[0];
      if (e.target) e.target.value = '';
      if (!f) return;
      if (f.type && f.type.indexOf('image/') !== 0) {
        setErr(_t('stem.accessLens.err_not_image', 'Please choose a photo (image file).'));
        return;
      }
      var fr = new FileReader();
      fr.onload = function () { acceptPhoto(String(fr.result), 'file'); };
      fr.onerror = function () { setErr(_t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.')); };
      fr.readAsDataURL(f);
    }

    function startLiveCamera() {
      setErr('');
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamState('denied');
        return;
      }
      setCamState('starting');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
        .then(function (stream) {
          streamRef.current = stream;
          setCamState('live');
          announce(_t('stem.accessLens.sr_cam_live', 'Live camera started. Press Snap photo when ready.'));
        })
        .catch(function () {
          // NotAllowedError in the Canvas iframe lands here → offer the
          // companion-window escape hatch (and the file picker always works).
          setCamState('denied');
        });
    }

    function snapFromLive() {
      var v = videoRef.current;
      if (!v || !v.videoWidth) return;
      var cv = document.createElement('canvas');
      cv.width = v.videoWidth; cv.height = v.videoHeight;
      cv.getContext('2d').drawImage(v, 0, 0);
      var url = cv.toDataURL('image/jpeg', 0.9);
      stopStream();
      setCamState('idle');
      acceptPhoto(url, 'live camera');
    }

    function cancelLive() { stopStream(); setCamState('idle'); }

    function openLensWindow() {
      setErr('');
      var w = null;
      try { w = window.open(LENS_URL, 'alloflow-access-lens', 'width=980,height=760'); } catch (_) { w = null; }
      if (!w) {
        setErr(_t('stem.accessLens.err_popup', 'The camera window was blocked. Allow pop-ups for this page, or use Take or choose a photo instead.'));
        return;
      }
      lensWinRef.current = w;
      announce(_t('stem.accessLens.sr_popup', 'Camera window opened. Take a photo there and it will appear here.'));
    }

    function clearPhoto() {
      setPhoto(null); setResults({}); setAnswers({}); setErr('');
      stopSpeech();
      announce(_t('stem.accessLens.sr_cleared', 'Photo cleared. Nothing was saved.'));
    }

    // ── analysis (all user-initiated; hard-gated on aiHintsEnabled) ──
    function analyze(m) {
      if (!photo || !canAnalyze || busyRef.current) return;
      var parts = splitDataUrl(photo.dataUrl);
      if (!parts) { setErr(_t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.')); return; }
      var band = ctx.gradeBand || 'g68';
      var prompt =
        m === 'describe' ? describePrompt(band) :
        m === 'read' ? readPrompt() :
        m === 'translate' ? translatePrompt(targetLang || 'Spanish') :
        inquirePrompt(band);
      setBusy(m); setErr('');
      announce(_t('stem.accessLens.sr_analyzing', 'Analyzing your photo.'));
      vision(prompt, parts.base64, parts.mime).then(function (text) {
        setBusy('');
        if (!text) {
          setErr(_t('stem.accessLens.err_ai', 'The AI could not answer right now. Please try again.'));
          return;
        }
        setResults(function (r) {
          var n = Object.assign({}, r);
          if (m === 'translate') n.translate = parseTranslation(text);
          else if (m === 'inquire') n.inquire = parseInquire(text) || { raw: String(text) };
          else n[m] = String(text).trim();
          return n;
        });
        if (m === 'describe') markQuest('described');
        else if (m === 'read') markQuest('readText');
        else if (m === 'translate') markQuest('translated');
        else markQuest('inquired');
        announce(_t('stem.accessLens.sr_done', 'Analysis ready.'));
      }).catch(function () {
        setBusy('');
        setErr(_t('stem.accessLens.err_ai', 'The AI could not answer right now. Please try again.'));
      });
    }

    // ── read-aloud: prefer the app TTS (user-initiated, so force:true past the
    //    header mute), fall back to the browser's built-in voice ──
    function speak(text) {
      if (!text) return;
      stopSpeech();
      var cx = ctxRef.current;
      if (cx && typeof cx.callTTS === 'function') {
        setSpeaking(true);
        cx.callTTS(text, null, null, { force: true }).then(function (url) {
          if (url) { setSpeaking(false); return; }
          browserSpeak(text);
        }).catch(function () { browserSpeak(text); });
        return;
      }
      browserSpeak(text);
    }
    function browserSpeak(text) {
      if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        setSpeaking(false); return;
      }
      try {
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95;
        u.onend = function () { setSpeaking(false); };
        u.onerror = function () { setSpeaking(false); };
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      } catch (_) { setSpeaking(false); }
    }

    // ════════════════════ UI helpers ════════════════════
    function btn(label, onClick, opts) {
      opts = opts || {};
      return h('button', {
        key: opts.key, type: 'button', className: 'accesslens-btn', onClick: onClick,
        disabled: !!opts.disabled,
        'aria-pressed': opts.pressed === undefined ? undefined : !!opts.pressed,
        title: opts.title || undefined,
        style: {
          padding: '8px 14px', borderRadius: '10px', cursor: opts.disabled ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
          border: '1px solid ' + (opts.primary ? C.btnBg : C.border),
          background: opts.pressed ? C.btnBg : (opts.primary ? C.btnBg : C.panel),
          color: (opts.pressed || opts.primary) ? '#ffffff' : C.text,
          opacity: opts.disabled ? 0.55 : 1
        }
      }, label);
    }

    function card(children, style) {
      return h('div', { style: Object.assign({ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px 14px' }, style || {}) }, children);
    }

    function aiDisclaimer() {
      return h('div', { role: 'note', style: { fontSize: '11px', color: C.sub, marginTop: '8px', lineHeight: 1.5 } },
        _t('stem.accessLens.disclaimer', 'AI answer; it can be wrong. Check it against what you can observe yourself.'));
    }

    function speakBtn(text) {
      return btn(speaking ? '⏹ ' + _t('stem.accessLens.stop_audio', 'Stop') : '🔊 ' + _t('stem.accessLens.read_aloud', 'Read aloud'),
        function () { if (speaking) stopSpeech(); else { speak(text); markQuest('listened'); } },
        { title: _t('stem.accessLens.read_aloud_title', 'Hear this text spoken out loud') });
    }

    // ════════════════════ capture panel ════════════════════
    function renderCapture() {
      var kids = [];
      kids.push(h('div', { key: 'privacy', style: { display: 'flex', gap: '8px', alignItems: 'flex-start', background: C.accentBg, border: '1px solid ' + C.accent, borderRadius: '10px', padding: '8px 10px' } },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '15px' } }, '🔒'),
        h('div', { style: { fontSize: '11.5px', color: C.text, lineHeight: 1.5 } },
          h('strong', null, _t('stem.accessLens.privacy_title', 'Your photo stays yours.')), ' ',
          _t('stem.accessLens.privacy_body', 'Photos are never saved by AlloFlow and are only sent to the AI when you press an Analyze button. Please point your camera at things, not at people.'))));

      if (camState === 'live' || camState === 'starting') {
        kids.push(h('div', { key: 'live', style: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' } },
          h('video', {
            ref: videoRef, muted: true, playsInline: true, autoPlay: true,
            'aria-label': _t('stem.accessLens.live_preview', 'Live camera preview'),
            style: { width: '100%', maxWidth: '440px', borderRadius: '10px', border: '1px solid ' + C.border, background: '#000', minHeight: '120px' }
          }),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            btn('📸 ' + _t('stem.accessLens.snap', 'Snap photo'), snapFromLive, { primary: true, disabled: camState !== 'live' }),
            btn(_t('stem.accessLens.cancel', 'Cancel'), cancelLive))));
      } else {
        var row = [
          h('button', {
            key: 'file', type: 'button', className: 'accesslens-btn',
            onClick: function () { if (fileRef.current) fileRef.current.click(); },
            style: { padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 800, border: '1px solid ' + C.btnBg, background: C.btnBg, color: '#ffffff' }
          }, '📷 ' + _t('stem.accessLens.take_photo', 'Take or choose a photo')),
          btn('🎥 ' + _t('stem.accessLens.live_camera', 'Live camera'), startLiveCamera, { key: 'livecam', title: _t('stem.accessLens.live_camera_title', 'Show a live preview and snap from it') })
        ];
        if (camState === 'denied') {
          row.push(btn('🪟 ' + _t('stem.accessLens.popout', 'Open camera window'), openLensWindow, { key: 'popout', title: _t('stem.accessLens.popout_title', 'Opens a separate window where the camera is allowed') }));
        }
        kids.push(h('div', { key: 'row', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, row));
        if (camState === 'denied') {
          kids.push(h('div', { key: 'denied', style: { fontSize: '11.5px', color: C.sub, lineHeight: 1.5 } },
            _t('stem.accessLens.denied_note', 'The live camera is blocked inside this app view. The photo button above still works everywhere, or use the camera window.')));
        }
      }

      kids.push(h('input', {
        key: 'input', ref: fileRef, type: 'file', accept: 'image/*', capture: 'environment',
        onChange: onFileChosen, 'aria-label': _t('stem.accessLens.take_photo', 'Take or choose a photo'), tabIndex: -1,
        style: { position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)' }
      }));

      if (photo) {
        kids.push(h('div', { key: 'preview', style: { display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' } },
          h('img', {
            src: photo.dataUrl,
            alt: results.describe ? results.describe.slice(0, 300) : _t('stem.accessLens.photo_alt', 'The photo you captured. It is not saved anywhere.'),
            style: { width: '160px', height: 'auto', borderRadius: '10px', border: '1px solid ' + C.border }
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            h('div', { style: { fontSize: '12px', color: C.sub } }, _t('stem.accessLens.photo_ready', 'Photo ready. Pick a mode below, then press Analyze.')),
            btn('🗑 ' + _t('stem.accessLens.clear_photo', 'Clear photo'), clearPhoto))));
      }

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, kids);
    }

    // ════════════════════ mode panels ════════════════════
    function analyzeButton(m, label) {
      var offMsg = !aiOn
        ? _t('stem.accessLens.ai_off', 'AI is turned off. Ask your teacher to switch on AI features in the STEM Lab header.')
        : (!vision ? _t('stem.accessLens.ai_unavailable', 'AI vision is not available in this setup.') : '');
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          btn(busy === m ? '⏳ ' + _t('stem.accessLens.analyzing', 'Analyzing…') : '✨ ' + label,
            function () { analyze(m); },
            { primary: true, disabled: !photo || !canAnalyze || !!busy }),
          !photo ? h('span', { style: { fontSize: '11.5px', color: C.sub } }, _t('stem.accessLens.need_photo', 'Capture a photo first.')) : null),
        offMsg ? h('div', { role: 'note', style: { fontSize: '11.5px', color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '6px 9px', lineHeight: 1.5 } }, offMsg) : null);
    }

    function renderDescribe() {
      var out = results.describe;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.describe_intro', 'Get a spoken picture of what is in front of you: layout, objects, colors, and any text. Made for students who are blind or have low vision, useful for everyone.')),
        analyzeButton('describe', _t('stem.accessLens.describe_cta', 'Describe my photo')),
        out ? card([
          h('div', { key: 'txt', style: { fontSize: '15px', lineHeight: 1.7, color: C.text, whiteSpace: 'pre-wrap' } }, out),
          h('div', { key: 'act', style: { marginTop: '10px', display: 'flex', gap: '8px' } }, speakBtn(out)),
          h('div', { key: 'disc' }, aiDisclaimer())
        ]) : null);
    }

    function renderRead() {
      var out = results.read;
      var noText = out === 'NO_TEXT_FOUND';
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.read_intro', 'Point at a worksheet, a whiteboard, a sign, or a label. The text is re-typed here in large print you can resize and listen to.')),
        analyzeButton('read', _t('stem.accessLens.read_cta', 'Read the text')),
        out ? (noText
          ? card(h('div', { style: { fontSize: '13px', color: C.sub } }, _t('stem.accessLens.no_text', 'No readable text was found in this photo. Try getting closer or adding more light.')))
          : card([
            h('div', { key: 'ctrl', style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' } },
              h('label', { style: { fontSize: '12px', color: C.sub, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' } },
                _t('stem.accessLens.text_size', 'Text size'),
                h('input', {
                  type: 'range', min: 16, max: 44, step: 2, value: readerPx,
                  'aria-label': _t('stem.accessLens.text_size', 'Text size'),
                  'aria-valuetext': readerPx + ' pixels',
                  onChange: function (e) { setReaderPx(parseInt(e.target.value, 10) || 24); },
                  style: { width: '130px' }
                })),
              speakBtn(out)),
            h('div', {
              key: 'reader',
              style: {
                fontSize: readerPx + 'px', lineHeight: 1.8, letterSpacing: '0.02em', wordSpacing: '0.12em',
                color: C.text, background: C.soft, borderRadius: '10px', padding: '14px 16px',
                whiteSpace: 'pre-wrap', maxWidth: '46ch'
              }
            }, out),
            h('div', { key: 'disc' }, aiDisclaimer())
          ])) : null);
    }

    function renderTranslate() {
      var out = results.translate;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.translate_intro', 'Photograph text in one language and read it in yours. Great for signs, notes home, and classroom handouts.')),
        h('label', { style: { fontSize: '12.5px', color: C.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          _t('stem.accessLens.translate_into', 'Translate into'),
          h('select', {
            value: TARGET_LANGS.indexOf(targetLang) === -1 ? '_custom' : targetLang,
            onChange: function (e) { if (e.target.value !== '_custom') setTargetLang(e.target.value); },
            'aria-label': _t('stem.accessLens.translate_into', 'Translate into'),
            style: { padding: '7px 9px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '13px', fontWeight: 700 }
          },
            TARGET_LANGS.map(function (l) { return h('option', { key: l, value: l }, l); }),
            h('option', { value: '_custom' }, _t('stem.accessLens.other_language', 'Other…'))),
          h('input', {
            type: 'text', value: targetLang,
            'aria-label': _t('stem.accessLens.language_name', 'Language name'),
            onChange: function (e) { setTargetLang(e.target.value); },
            style: { padding: '7px 9px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '13px', width: '150px' }
          })),
        analyzeButton('translate', _t('stem.accessLens.translate_cta', 'Translate the text')),
        out ? (out.none
          ? card(h('div', { style: { fontSize: '13px', color: C.sub } }, _t('stem.accessLens.no_text', 'No readable text was found in this photo. Try getting closer or adding more light.')))
          : card([
            out.original ? h('div', { key: 'orig', style: { marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, _t('stem.accessLens.original', 'Original')),
              h('div', { style: { fontSize: '13.5px', lineHeight: 1.6, color: C.sub, whiteSpace: 'pre-wrap' } }, out.original)) : null,
            h('div', { key: 'trans' },
              h('div', { style: { fontSize: '10px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, _t('stem.accessLens.translation', 'Translation')),
              h('div', { style: { fontSize: '16px', lineHeight: 1.7, color: C.text, whiteSpace: 'pre-wrap' } }, out.translated)),
            h('div', { key: 'act', style: { marginTop: '10px', display: 'flex', gap: '8px' } }, speakBtn(out.translated)),
            h('div', { key: 'disc' }, aiDisclaimer())
          ])) : null);
    }

    function renderInquire() {
      var out = results.inquire;
      var body = null;
      if (out && out.raw) {
        body = card([
          h('div', { key: 'raw', style: { fontSize: '13px', lineHeight: 1.6, color: C.text, whiteSpace: 'pre-wrap' } }, out.raw),
          h('div', { key: 'disc' }, aiDisclaimer())
        ]);
      } else if (out) {
        body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          card([
            h('div', { key: 'hd', style: { fontSize: '11px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, '👀 ' + _t('stem.accessLens.observations', 'What the AI can see')),
            h('ul', { key: 'ls', style: { margin: 0, paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.7, color: C.text } },
              out.observations.map(function (o, i) { return h('li', { key: i }, o); }))
          ]),
          card([
            h('div', { key: 'hd', style: { fontSize: '11px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, '🤔 ' + _t('stem.accessLens.questions', 'Your investigation questions')),
            h('div', { key: 'qs', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              out.questions.map(function (q, i) {
                return h('div', { key: i },
                  h('label', { htmlFor: 'accesslens-q' + i, style: { display: 'block', fontSize: '13.5px', fontWeight: 700, color: C.text, marginBottom: '4px', lineHeight: 1.5 } }, (i + 1) + '. ' + q),
                  h('textarea', {
                    id: 'accesslens-q' + i, rows: 2, value: answers[i] || '',
                    placeholder: _t('stem.accessLens.answer_placeholder', 'Look closely, then type what you notice…'),
                    onChange: function (e) {
                      var v = e.target.value;
                      setAnswers(function (a) { var n = Object.assign({}, a); n[i] = v; return n; });
                      if (v && v.length > 3) markQuest('answered');
                    },
                    style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.soft, color: C.text, fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }
                  }));
              }))
          ]),
          card([
            h('div', { key: 'hd', style: { fontSize: '11px', fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, '🧪 ' + _t('stem.accessLens.guess_title', 'The AI\'s guess (not a fact)')),
            h('div', { key: 'what', style: { fontSize: '14px', fontWeight: 800, color: C.text } }, out.guess.what),
            h('div', { key: 'conf', style: { display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '999px', background: C.warnBg, border: '1px solid ' + C.warnBorder, color: C.text } },
              confidenceLabel(out.guess.confidence)),
            out.guess.why ? h('div', { key: 'why', style: { marginTop: '6px', fontSize: '12.5px', lineHeight: 1.6, color: C.sub } }, out.guess.why) : null,
            out.tryThis ? h('div', { key: 'try', style: { marginTop: '8px', fontSize: '13px', lineHeight: 1.6, color: C.text, background: C.okBg, borderRadius: '8px', padding: '8px 10px' } },
              h('strong', null, _t('stem.accessLens.try_this', 'Test it: ')), out.tryThis) : null,
            h('div', { key: 'disc' }, aiDisclaimer())
          ]));
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.inquire_intro', 'Curious what something is? The AI will tell you what it can see, ask YOU the next questions, and share its best guess clearly labeled as a guess. Real scientists check; they do not just believe.')),
        analyzeButton('inquire', _t('stem.accessLens.inquire_cta', 'Investigate this object')),
        body);
    }

    // ════════════════════ shell ════════════════════
    var MODES = [
      { id: 'describe', icon: '👁️', label: _t('stem.accessLens.tab_describe', 'Describe') },
      { id: 'read', icon: '📖', label: _t('stem.accessLens.tab_read', 'Read') },
      { id: 'translate', icon: '🌍', label: _t('stem.accessLens.tab_translate', 'Translate') },
      { id: 'inquire', icon: '🔬', label: _t('stem.accessLens.tab_inquire', 'Investigate') }
    ];
    var panel = mode === 'describe' ? renderDescribe()
      : mode === 'read' ? renderRead()
      : mode === 'translate' ? renderTranslate()
      : renderInquire();

    return h('div', { 'data-accesslens-tool': 'true', style: { display: 'flex', flexDirection: 'column', gap: '14px', color: C.text, fontFamily: 'inherit' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
        (ctx.setStemLabTool ? h('button', {
          type: 'button', onClick: function () { ctx.setStemLabTool(''); },
          'aria-label': _t('stem.accessLens.back', 'Back to STEM Lab'),
          style: { padding: '6px 10px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, cursor: 'pointer', fontSize: '12px', fontWeight: 700 }
        }, '← ' + _t('stem.accessLens.back_short', 'Back')) : null),
        h('div', { style: { fontSize: '22px' }, 'aria-hidden': 'true' }, '📷'),
        h('div', null,
          h('h2', { style: { margin: 0, fontSize: '17px', fontWeight: 800 } }, _t('stem.accessLens.title', 'Access Lens')),
          h('div', { style: { fontSize: '11px', color: C.sub } }, _t('stem.accessLens.subtitle', 'Point, snap, and understand: describe, read, translate, investigate')))),
      card(renderCapture(), { background: C.bg }),
      h('div', { role: 'tablist', 'aria-label': _t('stem.accessLens.tabs_label', 'Access Lens modes'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid ' + C.border, paddingBottom: '8px' } },
        MODES.map(function (m) {
          var active = mode === m.id;
          return h('button', {
            key: m.id, type: 'button', className: 'accesslens-tab', role: 'tab',
            id: 'accesslens-tab-' + m.id, 'aria-controls': 'accesslens-panel', 'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onClick: function () { setMode(m.id); stopSpeech(); announce(m.label); },
            style: {
              padding: '7px 13px', borderRadius: '9px 9px 0 0', cursor: 'pointer', fontSize: '13px', fontWeight: 800,
              border: '1px solid ' + (active ? C.accent : 'transparent'), borderBottom: 'none',
              background: active ? C.accentBg : 'transparent', color: active ? C.accent : C.sub
            }
          }, h('span', { 'aria-hidden': 'true' }, m.icon + ' '), m.label);
        })),
      h('div', { id: 'accesslens-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'accesslens-tab-' + mode, 'aria-busy': busy ? 'true' : 'false', className: busy ? 'accesslens-busy' : undefined }, panel),
      err ? h('div', { role: 'alert', style: { fontSize: '12.5px', color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '10px', padding: '9px 12px', lineHeight: 1.5 } }, err) : null,
      h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } }, liveMsg)
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  window.StemLab.registerTool('accessLens', {
    icon: '📷',
    label: 'Access Lens',
    desc: 'Point your camera at the world: get a scene description read aloud (built for students who are blind or have low vision), re-read any text in large print, translate signs and handouts into your language, or investigate an object Socratic-style with an AI that asks questions instead of pronouncing answers.',
    color: 'sky',
    category: 'general',
    questHooks: [
      { id: 'lens_photo', label: 'Capture or choose a photo', icon: '📷',
        check: function (d) { return !!(d && d.captured); },
        progress: function (d) { return (d && d.captured) ? '✓' : 'pending'; } },
      { id: 'lens_describe', label: 'Get a scene description', icon: '👁️',
        check: function (d) { return !!(d && d.described); },
        progress: function (d) { return (d && d.described) ? '✓' : 'pending'; } },
      { id: 'lens_read', label: 'Read text from the world', icon: '📖',
        check: function (d) { return !!(d && d.readText); },
        progress: function (d) { return (d && d.readText) ? '✓' : 'pending'; } },
      { id: 'lens_translate', label: 'Translate something you found', icon: '🌍',
        check: function (d) { return !!(d && d.translated); },
        progress: function (d) { return (d && d.translated) ? '✓' : 'pending'; } },
      { id: 'lens_inquire', label: 'Investigate an object like a scientist', icon: '🔬',
        check: function (d) { return !!(d && d.inquired); },
        progress: function (d) { return (d && d.inquired) ? '✓' : 'pending'; } },
      { id: 'lens_answer', label: 'Answer an investigation question yourself', icon: '✍️',
        check: function (d) { return !!(d && d.answered); },
        progress: function (d) { return (d && d.answered) ? '✓' : 'pending'; } }
    ],
    render: function (ctx) {
      return ctx.React.createElement(AccessLens, { ctx: ctx });
    }
  });
})();
