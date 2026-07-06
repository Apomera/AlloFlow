/* =========================================================================
 * AlloFlow Reading Library (CDN module)
 * =========================================================================
 * Browse + read openly-licensed picture books (StoryWeaver / Pratham Books,
 * CC BY 4.0), mirrored at build time into reading_library/ by
 * reading_library/mirror_books.js. Images and narration audio are hotlinked
 * from StoryWeaver's public bucket; text, cue timings and attribution ship
 * in the mirrored JSON.
 *
 * Contract (mirrors catalog_module.js):
 *   - Loads via loadModule('ReadingLibrary', ...) + <CDNModuleGate>.
 *   - Exports window.AlloModules.ReadingLibrary — React component.
 *   - Props: isOpen, onClose, addToast(msg, type), t (optional),
 *     callGemini(prompt) (optional), handleGenerate(type, lang, keep, text)
 *     (optional), setInputText(text) (optional), isTeacherMode (optional).
 *   - No bare t() calls (free-t crash class): tr() guards window.__alloT and
 *     falls back to English when the key echoes back untranslated.
 *   - Theme: root carries .allo-docsuite so .theme-dark/.theme-contrast CSS
 *     remaps the light Tailwind tokens used here.
 * ========================================================================= */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  window.AlloModules = window.AlloModules || {};
  if (window.AlloModules.ReadingLibrary) return;

  var React = window.React;
  if (!React) { console.error('[ReadingLibrary] window.React missing'); return; }
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var useCallback = React.useCallback;

  // Data bases tried in order; the first index.json that loads wins and its
  // base serves the per-book files too. CDN first (same origin as this
  // script), GitHub raw second (live as soon as main is pushed), relative
  // last (local dev / future School Box vendoring).
  var DATA_BASES = [
    'https://alloflow-cdn.pages.dev/reading_library/',
    'https://raw.githubusercontent.com/Apomera/AlloFlow/main/reading_library/',
    './reading_library/',
  ];

  var LEVEL_LABELS = {
    1: 'Level 1 · First words',
    2: 'Level 2 · First sentences',
    3: 'Level 3 · Reading on my own',
    4: 'Level 4 · Longer stories',
  };

  // --- i18n guard (free-t crash class + raw-key echo both handled) --------
  function tr(key, fallback) {
    try {
      if (typeof window.__alloT === 'function') {
        var r = window.__alloT(key);
        if (r && typeof r === 'string' && r !== key) return r;
      }
    } catch (_) {}
    return fallback || key;
  }

  function speak(text, language) {
    try {
      if (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
        window.AlloSpeechPlayer.speak(text, { language: language });
        return true;
      }
    } catch (_) {}
    return false;
  }

  function stopSpeech() {
    try { if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.stop(); } catch (_) {}
  }

  // Assign narration cue ids to whitespace tokens of the page text by walking
  // both sequences in order (punctuation-insensitive compare). Tokens without
  // a confident match simply get no cue — they still render, just never
  // highlight. Exposed as a static for the harness.
  function assignCues(text, words) {
    var tokens = String(text || '').split(/\n/).map(function (line) {
      return line.split(/\s+/).filter(Boolean);
    });
    if (!words || !words.length) {
      return tokens.map(function (line) {
        return line.map(function (w) { return { w: w, cue: null }; });
      });
    }
    var norm = function (s) {
      return String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    };
    var ptr = 0;
    return tokens.map(function (line) {
      return line.map(function (w) {
        var cue = null;
        if (ptr < words.length) {
          var a = norm(w);
          var b = norm(words[ptr][1]);
          if (a && a === b) { cue = words[ptr][0]; ptr++; }
          else if (ptr + 1 < words.length && a && a === norm(words[ptr + 1][1])) { ptr += 1; cue = words[ptr][0]; ptr++; }
        }
        return { w: w, cue: cue };
      });
    });
  }

  // cues: [[id, startSec, endSec], ...] sorted by start.
  function findActiveCue(cues, tSec) {
    if (!cues || !cues.length) return null;
    var active = null;
    for (var i = 0; i < cues.length; i++) {
      if (cues[i][1] <= tSec) { if (tSec < cues[i][2] + 0.35) active = cues[i][0]; }
      else break;
    }
    return active;
  }

  function pageCueRange(page) {
    if (!page || !page.words || !page.words.length) return null;
    var ids = page.words.map(function (w) { return w[0]; });
    return [Math.min.apply(null, ids), Math.max.apply(null, ids)];
  }

  // Picture-book text layout: short text bursts sit centered under the artwork
  // (the picture-book convention — left-hugging text under a centered image
  // reads as misaligned); longer level-3/4 passages stay start-aligned for
  // readability (also correct for RTL, which 'text-left' would break). Early
  // levels get a larger face.
  function textLayoutClass(level, text) {
    var size = (String(level) === '1' || String(level) === '2') ? 'text-2xl' : 'text-xl';
    var align = String(text || '').replace(/\s+/g, ' ').length <= 220 ? ' text-center' : '';
    return size + align;
  }

  function bookPlainText(book) {
    if (!book) return '';
    var parts = [book.title || ''];
    (book.pages || []).forEach(function (p) { if (p.text) parts.push(p.text); });
    return parts.join('\n\n').trim();
  }

  function attributionLine(book) {
    var bits = [];
    if (book.authors && book.authors.length) bits.push(tr('readinglib_written_by', 'Written by') + ' ' + book.authors.join(', '));
    if (book.illustrators && book.illustrators.length) bits.push(tr('readinglib_illustrated_by', 'Illustrated by') + ' ' + book.illustrators.join(', '));
    if (book.originalAuthors && book.originalAuthors.length && String(book.originalAuthors) !== String(book.authors)) {
      bits.push(tr('readinglib_original_story', 'Original story') + ': ' + book.originalAuthors.join(', '));
    }
    if (book.publisher) bits.push(book.publisher);
    return bits.join(' · ');
  }

  // ------------------------------------------------------------------ fetch
  function fetchIndex(cb) {
    var tryBase = function (i) {
      if (i >= DATA_BASES.length) { cb(new Error(tr('readinglib_err_unreachable', 'Library data not reachable yet')), null, null); return; }
      var bust = DATA_BASES[i].indexOf('http') === 0 ? '?t=' + Date.now() : '';
      fetch(DATA_BASES[i] + 'index.json' + bust)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (!data || !Array.isArray(data.books)) throw new Error('bad index shape');
          cb(null, data, DATA_BASES[i]);
        })
        .catch(function () { tryBase(i + 1); });
    };
    tryBase(0);
  }

  // ------------------------------------------------------------ word popups
  function WordPopup(props) {
    var d = props.data;
    if (!d) return null;
    var style = {
      position: 'fixed',
      left: Math.min(d.x, (window.innerWidth || 800) - 280) + 'px',
      top: (d.y + 12) + 'px',
      zIndex: 90,
      maxWidth: '260px',
    };
    var body;
    if (d.loading) {
      body = e('div', { className: 'text-sm text-slate-500 italic' }, tr('readinglib_thinking', 'Thinking…'));
    } else if (d.type === 'phonics' && d.phonics) {
      body = e('div', { className: 'text-sm text-slate-700 space-y-1' },
        d.phonics.syllables ? e('div', null, e('span', { className: 'font-semibold' }, tr('readinglib_syllables', 'Syllables') + ': '), d.phonics.syllables) : null,
        d.phonics.phoneticSpelling ? e('div', null, e('span', { className: 'font-semibold' }, tr('readinglib_sounds_like', 'Sounds like') + ': '), d.phonics.phoneticSpelling) : null,
        d.phonics.ipa ? e('div', { className: 'text-slate-500' }, 'IPA: ' + d.phonics.ipa) : null
      );
    } else {
      body = e('div', { className: 'text-sm text-slate-700' }, d.text || tr('readinglib_no_definition', 'No definition available.'));
    }
    return e('div', { style: style, className: 'bg-white border border-slate-200 rounded-xl shadow-lg p-3', role: 'status' },
      e('div', { className: 'flex items-center justify-between gap-2 mb-1' },
        e('span', { className: 'font-bold text-indigo-700' }, d.word),
        e('button', {
          className: 'text-slate-400 hover:text-slate-600 text-sm px-1',
          onClick: props.onClose,
          'aria-label': tr('readinglib_close', 'Close'),
        }, '✕')
      ),
      body
    );
  }

  // -------------------------------------------------------- practice panel
  function PracticePanel(props) {
    var book = props.book;
    var _s = useState('idle'); var status = _s[0]; var setStatus = _s[1];
    var _r = useState(null); var result = _r[0]; var setResult = _r[1];
    var _err = useState(null); var error = _err[0]; var setError = _err[1];
    var recRef = useRef(null);
    var chunksRef = useRef([]);
    var startedAtRef = useRef(0);

    useEffect(function () {
      return function () {
        try {
          if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
          if (recRef.current && recRef.current.stream) recRef.current.stream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_) {}
      };
    }, []);

    var start = function () {
      setError(null); setResult(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(tr('readinglib_no_mic_api', 'Microphone recording is not available in this browser.'));
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var rec = new MediaRecorder(stream);
        recRef.current = rec;
        chunksRef.current = [];
        rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          analyze(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
        };
        startedAtRef.current = Date.now();
        rec.start();
        setStatus('recording');
      }).catch(function () {
        setError(tr('readinglib_mic_denied', 'Could not use the microphone. Check permissions and try again.'));
      });
    };

    var stop = function () {
      if (recRef.current && recRef.current.state !== 'inactive') { setStatus('processing'); recRef.current.stop(); }
    };

    var analyze = function (blob) {
      var seconds = Math.max(1, (Date.now() - startedAtRef.current) / 1000);
      var fl = window.AlloModules && window.AlloModules.Fluency;
      if (!fl || typeof fl.analyzeFluencyWithGemini !== 'function') {
        setStatus('idle');
        setError(tr('readinglib_no_fluency', 'The fluency tools have not loaded yet — try again in a moment.'));
        return;
      }
      var reader = new FileReader();
      reader.onloadend = function () {
        var base64 = String(reader.result || '').split(',')[1] || '';
        var refText = bookPlainText(book);
        var refCount = refText.split(/\s+/).filter(Boolean).length;
        fl.analyzeFluencyWithGemini(base64, blob.type || 'audio/webm', refText)
          .then(function (analysis) {
            var metrics = null;
            try {
              if (analysis && analysis.wordData && typeof fl.calculateLocalFluencyMetrics === 'function') {
                metrics = fl.calculateLocalFluencyMetrics(analysis.wordData, seconds, refCount);
              }
            } catch (_) {}
            setResult({ analysis: analysis, metrics: metrics, seconds: Math.round(seconds) });
            setStatus('done');
          })
          .catch(function (err) {
            setStatus('idle');
            setError(tr('readinglib_analyze_failed', 'Could not analyze the recording.') + ' ' + (err && err.message ? err.message : ''));
          });
      };
      reader.readAsDataURL(blob);
    };

    return e('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3' },
      e('div', { className: 'flex items-center justify-between gap-2' },
        e('h4', { className: 'font-bold text-slate-800' }, '🎙️ ' + tr('readinglib_practice_title', 'Practice reading this book')),
        e('button', { className: 'text-slate-500 hover:text-slate-700 text-sm', onClick: props.onClose, 'aria-label': tr('readinglib_close', 'Close') }, '✕')
      ),
      e('p', { className: 'text-xs text-slate-600 mt-1' },
        tr('readinglib_practice_hint', 'Read the whole book out loud, then stop the recording. An AI listens and estimates accuracy — it is practice feedback, not a test score, and nothing is saved.')),
      status === 'idle' ? e('button', {
        className: 'mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700',
        onClick: start,
      }, tr('readinglib_start_recording', 'Start recording')) : null,
      status === 'recording' ? e('button', {
        className: 'mt-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 animate-pulse',
        onClick: stop,
      }, '⏹ ' + tr('readinglib_stop_recording', 'Stop and check')) : null,
      status === 'processing' ? e('div', { className: 'mt-2 text-sm text-slate-600 italic' }, tr('readinglib_listening', 'Listening back…')) : null,
      error ? e('div', { className: 'mt-2 text-sm text-red-700' }, error) : null,
      status === 'done' && result ? e('div', { className: 'mt-2 space-y-1' },
        result.metrics ? e('div', { className: 'flex gap-3 flex-wrap' },
          e('span', { className: 'px-2 py-1 rounded-lg bg-white border border-amber-200 text-sm font-semibold text-slate-800' },
            tr('readinglib_accuracy', 'Accuracy') + ': ' + result.metrics.accuracy + '%'),
          e('span', { className: 'px-2 py-1 rounded-lg bg-white border border-amber-200 text-sm font-semibold text-slate-800' },
            tr('readinglib_wcpm', 'Words correct per minute') + ': ' + result.metrics.wcpm)
        ) : null,
        result.analysis && result.analysis.feedback ? e('p', { className: 'text-sm text-slate-700' }, result.analysis.feedback) : null,
        e('p', { className: 'text-xs text-slate-500 italic' },
          tr('readinglib_practice_caveat', 'AI estimate from one reading — celebrate progress, not the number.'))
      ) : null
    );
  }

  // --------------------------------------------------------------- reader
  function BookReader(props) {
    var book = props.book;
    var _pg = useState(0); var pageIdx = _pg[0]; var setPageIdx = _pg[1];
    var _cue = useState(null); var activeCue = _cue[0]; var setActiveCue = _cue[1];
    var _play = useState(false); var narrating = _play[0]; var setNarrating = _play[1];
    var _mode = useState('read'); var mode = _mode[0]; var setMode = _mode[1];
    var _pop = useState(null); var popup = _pop[0]; var setPopup = _pop[1];
    var _prac = useState(false); var showPractice = _prac[0]; var setShowPractice = _prac[1];
    var _gen = useState(false); var genOpen = _gen[0]; var setGenOpen = _gen[1];
    var audioRef = useRef(null);

    var pages = book.pages || [];
    var page = pages[pageIdx] || null;
    var hasNarration = !!(book.audio && book.audio.src && book.audio.cues && book.audio.cues.length);

    var lines = useMemo(function () {
      return page ? assignCues(page.text, page.words) : [];
    }, [page]);

    var stopAll = useCallback(function () {
      stopSpeech();
      var a = audioRef.current;
      if (a) { try { a.pause(); } catch (_) {} }
      setNarrating(false);
      setActiveCue(null);
    }, []);

    useEffect(function () { return stopAll; }, [stopAll]);
    useEffect(function () { setPopup(null); }, [pageIdx]);

    // Narration: single whole-book mp3; page follows the active cue.
    var onTimeUpdate = function () {
      var a = audioRef.current;
      if (!a || !book.audio || !book.audio.cues) return;
      var cue = findActiveCue(book.audio.cues, a.currentTime);
      setActiveCue(cue);
      if (cue == null) return;
      var range = pageCueRange(pages[pageIdx]);
      if (range && cue > range[1]) {
        for (var i = pageIdx + 1; i < pages.length; i++) {
          var r2 = pageCueRange(pages[i]);
          if (r2 && cue >= r2[0] && cue <= r2[1]) { setPageIdx(i); break; }
        }
      }
    };

    var toggleNarration = function () {
      var a = audioRef.current;
      if (!a) return;
      if (narrating) { a.pause(); setNarrating(false); return; }
      stopSpeech();
      var range = pageCueRange(page);
      if (range && book.audio.cues) {
        for (var i = 0; i < book.audio.cues.length; i++) {
          if (book.audio.cues[i][0] === range[0]) { a.currentTime = Math.max(0, book.audio.cues[i][1] - 0.15); break; }
        }
      }
      a.play().then(function () { setNarrating(true); }).catch(function () {
        props.addToast && props.addToast(tr('readinglib_audio_failed', 'Could not play the narration audio.'), 'error');
      });
    };

    var readPageTts = function () {
      stopAll();
      if (!page || !page.text) return;
      if (!speak(page.text, book.language)) {
        props.addToast && props.addToast(tr('readinglib_tts_unavailable', 'Read-aloud is not available right now.'), 'error');
      }
    };

    var go = useCallback(function (delta) {
      stopAll();
      setPageIdx(function (i) { return Math.min(pages.length - 1, Math.max(0, i + delta)); });
    }, [pages.length, stopAll]);

    useEffect(function () {
      var onKey = function (ev) {
        if (ev.defaultPrevented) return;
        var tag = (ev.target && ev.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var next = book.isRtl ? -1 : 1;
        if (ev.key === 'ArrowRight') { go(next); }
        else if (ev.key === 'ArrowLeft') { go(-next); }
      };
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [go, book.isRtl]);

    var onWordClick = function (word, ev) {
      if (mode === 'read') return;
      var x = ev.clientX || 40; var y = ev.clientY || 40;
      var clean = String(word).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!clean) return;
      if (!props.callGemini) {
        props.addToast && props.addToast(tr('readinglib_ai_unavailable', 'AI help is not available right now.'), 'info');
        return;
      }
      if (mode === 'define') {
        setPopup({ type: 'define', word: clean, x: x, y: y, loading: true });
        var dPrompt = 'A child is reading a level ' + book.level + ' picture book written in ' + book.language + '. ' +
          'In ONE short, friendly sentence written in ' + book.language + ', explain what the word "' + clean + '" means in this story\'s context. Answer with only that sentence.';
        props.callGemini(dPrompt).then(function (res) {
          setPopup(function (p) { return p && p.word === clean ? { type: 'define', word: clean, x: x, y: y, loading: false, text: String(res || '').trim() } : p; });
        }).catch(function () {
          setPopup(function (p) { return p && p.word === clean ? { type: 'define', word: clean, x: x, y: y, loading: false, text: null } : p; });
        });
      } else if (mode === 'phonics') {
        setPopup({ type: 'phonics', word: clean, x: x, y: y, loading: true });
        var pPrompt = 'Return ONLY minified JSON, no markdown: {"ipa":string,"phoneticSpelling":string,"syllables":string} ' +
          'for the ' + book.language + ' word "' + clean + '". phoneticSpelling = kid-friendly respelling; syllables = the word split with middle dots (e.g. "won·der·ful").';
        props.callGemini(pPrompt).then(function (res) {
          var data = null;
          try { data = JSON.parse(String(res || '').replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch (_) {}
          setPopup(function (p) { return p && p.word === clean ? { type: 'phonics', word: clean, x: x, y: y, loading: false, phonics: data } : p; });
          speak(clean, book.language);
        }).catch(function () {
          setPopup(function (p) { return p && p.word === clean ? { type: 'phonics', word: clean, x: x, y: y, loading: false, phonics: null } : p; });
        });
      }
    };

    var generate = function (type, label) {
      setGenOpen(false);
      if (typeof props.handleGenerate !== 'function') {
        props.addToast && props.addToast(tr('readinglib_generate_unavailable', 'Generation is not available right now.'), 'error');
        return;
      }
      var text = bookPlainText(book);
      try {
        props.handleGenerate(type, null, false, text);
        props.addToast && props.addToast(tr('readinglib_generating', 'Creating') + ' ' + label + ' — "' + book.title + '"', 'success');
        props.onExit && props.onExit(true);
      } catch (err) {
        props.addToast && props.addToast(tr('readinglib_generate_failed', 'Could not start generation.'), 'error');
      }
    };

    var openAsDocument = function () {
      setGenOpen(false);
      if (typeof props.setInputText !== 'function') {
        props.addToast && props.addToast(tr('readinglib_generate_unavailable', 'Generation is not available right now.'), 'error');
        return;
      }
      props.setInputText(bookPlainText(book));
      props.addToast && props.addToast('"' + book.title + '" ' + tr('readinglib_loaded_doc', 'is now the working document.'), 'success');
      props.onExit && props.onExit(true);
    };

    // Teacher: pin this book into the lesson history so students who load the
    // lesson (or join the session) can open it from Resources with one click.
    var saveToLesson = function () {
      if (typeof props.onSaveToLesson !== 'function') return;
      props.onSaveToLesson({
        slug: book.slug,
        title: book.title,
        language: book.language,
        langCode: book.langCode,
        level: book.level,
        cover: (book.cover && book.cover.card) || null,
        hasAudio: !!book.audio,
        description: book.description || '',
        attribution: attributionLine(book),
      });
      props.addToast && props.addToast('"' + book.title + '" ' + tr('readinglib_saved_lesson', 'was added to this lesson’s resources.'), 'success');
    };

    var genTypes = [
      { type: 'quiz', label: tr('readinglib_gen_quiz', 'Quiz') },
      { type: 'glossary', label: tr('readinglib_gen_glossary', 'Glossary') },
      { type: 'simplified', label: tr('readinglib_gen_leveled', 'Leveled version') },
      { type: 'sentence-frames', label: tr('readinglib_gen_frames', 'Sentence frames') },
    ];

    var modeBtn = function (m, icon, label) {
      return e('button', {
        className: 'px-2 py-1 rounded-lg text-sm font-semibold border ' +
          (mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
        onClick: function () { setMode(mode === m ? 'read' : m); setPopup(null); },
        'aria-pressed': mode === m,
        title: label,
      }, icon + ' ' + label);
    };

    return e('div', { className: 'flex flex-col h-full min-h-0' },
      // toolbar
      e('div', { className: 'flex items-center gap-2 flex-wrap pb-2 border-b border-slate-200' },
        e('button', {
          className: 'px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold',
          onClick: function () { stopAll(); props.onExit && props.onExit(false); },
        }, '← ' + tr('readinglib_back', 'Library')),
        e('div', { className: 'font-bold text-slate-800 truncate flex-1 min-w-0', dir: 'auto', title: book.title }, book.title),
        hasNarration ? e('button', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold ' + (narrating ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'),
          onClick: toggleNarration,
          'aria-pressed': narrating,
        }, narrating ? '⏸ ' + tr('readinglib_pause', 'Pause') : '🔊 ' + tr('readinglib_read_to_me', 'Read to me')) : e('button', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
          onClick: readPageTts,
        }, '🔊 ' + tr('readinglib_read_page', 'Read this page')),
        modeBtn('define', '📖', tr('readinglib_mode_define', 'Define')),
        modeBtn('phonics', '🔤', tr('readinglib_mode_phonics', 'Sounds')),
        e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
          onClick: function () { setShowPractice(!showPractice); },
          'aria-pressed': showPractice,
        }, '🎙️ ' + tr('readinglib_practice', 'Practice')),
        props.isTeacherMode && typeof props.onSaveToLesson === 'function' ? e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
          onClick: saveToLesson,
          title: tr('readinglib_save_lesson_hint', 'Students who load this lesson can open the book from Resources'),
        }, '📌 ' + tr('readinglib_save_lesson', 'Save to lesson')) : null,
        e('div', { className: 'relative' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
            onClick: function () { setGenOpen(!genOpen); },
            'aria-expanded': genOpen, 'aria-haspopup': 'menu',
          }, '✨ ' + tr('readinglib_create', 'Create') + ' ▾'),
          genOpen ? e('div', { className: 'absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-20 min-w-[180px]', role: 'menu' },
            genTypes.map(function (g) {
              return e('button', {
                key: g.type, role: 'menuitem',
                className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
                onClick: function () { generate(g.type, g.label); },
              }, g.label);
            }),
            e('div', { className: 'border-t border-slate-100 my-1' }),
            e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
              onClick: openAsDocument,
            }, tr('readinglib_open_as_doc', 'Open as document'))
          ) : null
        )
      ),
      hasNarration ? e('audio', {
        ref: audioRef, src: book.audio.src, preload: 'none',
        onTimeUpdate: onTimeUpdate,
        onEnded: function () { setNarrating(false); setActiveCue(null); },
      }) : null,
      showPractice ? e(PracticePanel, { book: book, onClose: function () { setShowPractice(false); } }) : null,
      // page spread
      page ? e('div', { className: 'flex-1 min-h-0 overflow-y-auto py-3' },
        e('div', { className: 'max-w-3xl mx-auto' },
          page.img ? e('img', {
            src: page.img,
            alt: tr('readinglib_page_illustration', 'Illustration from') + ' "' + book.title + '", ' + tr('readinglib_page', 'page') + ' ' + page.n,
            className: 'w-full max-h-[48vh] object-contain rounded-xl bg-slate-100',
            loading: 'lazy',
          }) : null,
          e('div', {
            className: 'mt-4 mx-auto max-w-xl leading-relaxed text-slate-800 ' + textLayoutClass(book.level, page.text) + (mode !== 'read' ? ' cursor-pointer' : ''),
            dir: book.isRtl ? 'rtl' : 'auto',
            lang: book.langCode || undefined,
          }, lines.map(function (line, li) {
            return e('p', { key: li, className: 'mb-2' }, line.map(function (tok, ti) {
              var hot = tok.cue != null && tok.cue === activeCue;
              return e('span', {
                key: ti,
                className: (hot ? 'bg-amber-200 rounded ' : '') + (mode !== 'read' ? 'hover:bg-indigo-100 rounded ' : ''),
                onClick: mode !== 'read' ? function (ev) { onWordClick(tok.w, ev); } : undefined,
              }, tok.w + (ti < line.length - 1 ? ' ' : ''));
            }));
          }))
        )
      ) : null,
      // pager + attribution
      e('div', { className: 'pt-2 border-t border-slate-200' },
        e('div', { className: 'flex items-center justify-center gap-3' },
          e('button', {
            className: 'px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40',
            disabled: pageIdx === 0, onClick: function () { go(-1); },
            'aria-label': tr('readinglib_prev_page', 'Previous page'),
          }, '‹'),
          e('span', { className: 'text-sm text-slate-600 tabular-nums' }, (pageIdx + 1) + ' / ' + pages.length),
          e('button', {
            className: 'px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40',
            disabled: pageIdx >= pages.length - 1, onClick: function () { go(1); },
            'aria-label': tr('readinglib_next_page', 'Next page'),
          }, '›')
        ),
        e('p', { className: 'text-[11px] text-slate-500 text-center mt-1.5' },
          attributionLine(book) + ' · ',
          e('a', { href: book.source && book.source.url, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            tr('readinglib_source_link', 'StoryWeaver, Pratham Books')),
          ' · ',
          e('a', { href: book.licenseUrl || 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            book.license || 'CC BY 4.0')
        )
      ),
      popup ? e(WordPopup, { data: popup, onClose: function () { setPopup(null); } }) : null
    );
  }

  // --------------------------------------------------------------- browse
  function BookCard(props) {
    var b = props.book;
    return e('button', {
      className: 'text-left bg-white border border-slate-200 rounded-2xl p-3 hover:border-indigo-300 hover:shadow-md transition-shadow flex flex-col gap-2',
      onClick: function () { props.onOpen(b); },
    },
      b.cover ? e('img', {
        src: b.cover, alt: '', loading: 'lazy',
        className: 'w-full h-36 object-cover rounded-xl bg-slate-100',
      }) : e('div', { className: 'w-full h-36 rounded-xl bg-indigo-50 flex items-center justify-center text-4xl' }, '📖'),
      e('div', { className: 'font-bold text-slate-800 leading-snug', dir: 'auto' }, b.title),
      e('div', { className: 'flex flex-wrap gap-1' },
        e('span', { className: 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold' },
          tr('readinglib_level', 'Level') + ' ' + b.level),
        e('span', { className: 'px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold' }, b.language),
        b.hasAudio ? e('span', { className: 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold' },
          '🔊 ' + tr('readinglib_narrated', 'Narrated')) : null
      ),
      b.authors && b.authors.length ? e('div', { className: 'text-[11px] text-slate-500' }, b.authors.join(', ')) : null
    );
  }

  function ReadingLibrary(props) {
    if (!props.isOpen) return null;

    var _idx = useState({ status: 'loading', data: null, base: null, error: null });
    var index = _idx[0]; var setIndex = _idx[1];
    var _f = useState({ language: '', level: '', search: '' });
    var filters = _f[0]; var setFilters = _f[1];
    var _open = useState(null); var openBook = _open[0]; var setOpenBook = _open[1];
    var _loadingBook = useState(null); var loadingBook = _loadingBook[0]; var setLoadingBook = _loadingBook[1];
    var containerRef = useRef(null);

    useEffect(function () {
      var alive = true;
      fetchIndex(function (err, data, base) {
        if (!alive) return;
        if (err) setIndex({ status: 'error', data: null, base: null, error: err.message });
        else setIndex({ status: 'ok', data: data, base: base, error: null });
      });
      return function () { alive = false; };
    }, []);

    // Escape closes reader first, then the modal; basic focus trap on Tab.
    useEffect(function () {
      var onKey = function (ev) {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          if (openBook) { stopSpeech(); setOpenBook(null); }
          else if (props.onClose) props.onClose();
        } else if (ev.key === 'Tab' && containerRef.current) {
          var els = containerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (!els.length) return;
          var first = els[0]; var last = els[els.length - 1];
          if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
          else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        }
      };
      window.addEventListener('keydown', onKey, true);
      return function () { window.removeEventListener('keydown', onKey, true); };
    }, [openBook, props.onClose]);

    var books = (index.data && index.data.books) || [];

    var filtered = useMemo(function () {
      var q = filters.search.trim().toLowerCase();
      return books.filter(function (b) {
        if (filters.language && b.language !== filters.language) return false;
        if (filters.level && String(b.level) !== filters.level) return false;
        if (q) {
          var hay = (b.title + ' ' + (b.authors || []).join(' ') + ' ' + (b.description || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    }, [books, filters]);

    var languages = useMemo(function () {
      return (index.data && index.data.languages) || [];
    }, [index.data]);

    var openBookBySlug = function (b) {
      setLoadingBook(b.slug);
      var base = index.base || DATA_BASES[0];
      var bust = base.indexOf('http') === 0 ? '?t=' + Date.now() : '';
      fetch(base + b.file + bust)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (book) { setLoadingBook(null); stopSpeech(); setOpenBook(book); })
        .catch(function () {
          setLoadingBook(null);
          props.addToast && props.addToast(tr('readinglib_book_failed', 'Could not open that book right now.'), 'error');
        });
    };

    var onExitReader = function (closeAll) {
      stopSpeech();
      setOpenBook(null);
      if (closeAll && props.onClose) props.onClose();
    };

    // Deep-open: a lesson's saved-book item restores through here. When the
    // index is ready and the host handed us a slug, open that book directly.
    useEffect(function () {
      if (!props.initialBookSlug || index.status !== 'ok' || openBook || loadingBook) return;
      var entry = books.filter(function (b) { return b.slug === props.initialBookSlug; })[0];
      if (entry) {
        openBookBySlug(entry);
      } else {
        props.addToast && props.addToast(tr('readinglib_assigned_missing', 'That book is no longer in the library.'), 'info');
      }
      if (typeof props.onInitialBookConsumed === 'function') props.onInitialBookConsumed();
    }, [props.initialBookSlug, index.status]);

    var body;
    if (openBook) {
      body = e(BookReader, {
        book: openBook,
        onExit: onExitReader,
        addToast: props.addToast,
        callGemini: props.callGemini,
        handleGenerate: props.handleGenerate,
        setInputText: props.setInputText,
        isTeacherMode: props.isTeacherMode,
        onSaveToLesson: props.onSaveToLesson,
      });
    } else {
      body = e('div', { className: 'flex flex-col h-full min-h-0' },
        // filters
        e('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2 pb-3' },
          e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            value: filters.language,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { language: ev.target.value })); },
            'aria-label': tr('readinglib_filter_language', 'Language'),
          },
            e('option', { value: '' }, tr('readinglib_all_languages', 'All languages')),
            languages.map(function (l) { return e('option', { key: l.name, value: l.name }, l.name + ' (' + l.count + ')'); })
          ),
          e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            value: filters.level,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { level: ev.target.value })); },
            'aria-label': tr('readinglib_filter_level', 'Reading level'),
          },
            e('option', { value: '' }, tr('readinglib_all_levels', 'All levels')),
            ['1', '2', '3', '4'].map(function (lv) { return e('option', { key: lv, value: lv }, LEVEL_LABELS[lv] || ('Level ' + lv)); })
          ),
          e('input', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            placeholder: tr('readinglib_search_ph', 'Search titles and authors…'),
            value: filters.search,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { search: ev.target.value })); },
            'aria-label': tr('readinglib_search', 'Search'),
          })
        ),
        // status
        e('div', { className: 'text-sm text-slate-500 pb-2' },
          index.status === 'loading' ? tr('readinglib_loading', 'Loading the library…') :
          index.status === 'error' ? e('span', { className: 'text-red-600' },
            tr('readinglib_load_error', 'Could not load the library:') + ' ' + index.error) :
          filtered.length === 0 ? tr('readinglib_empty', 'No books match those filters yet.') :
          filtered.length + ' ' + tr('readinglib_of', 'of') + ' ' + books.length + ' ' + tr('readinglib_books', 'books')),
        // grid
        e('div', { className: 'flex-1 min-h-0 overflow-y-auto' },
          e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-2' },
            filtered.map(function (b) {
              return e(BookCard, { key: b.slug, book: b, onOpen: openBookBySlug });
            })
          ),
          loadingBook ? e('div', { className: 'text-sm text-slate-500 italic py-2' }, tr('readinglib_opening', 'Opening book…')) : null
        ),
        index.data && index.data.attribution ? e('p', { className: 'text-[11px] text-slate-500 pt-2 border-t border-slate-200' },
          index.data.attribution.text + ' ',
          e('a', { href: index.data.attribution.url, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            'storyweaver.org.in')
        ) : null
      );
    }

    return e('div', {
      className: 'allo-docsuite fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-6',
      role: 'presentation',
      onMouseDown: function (ev) { if (ev.target === ev.currentTarget && props.onClose) props.onClose(); },
    },
      e('div', {
        ref: containerRef,
        className: 'bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col p-4',
        role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('readinglib_title', 'Reading Library'),
      },
        e('div', { className: 'flex items-center justify-between gap-2 pb-2' },
          e('h2', { className: 'text-xl font-extrabold text-slate-800' }, '📚 ' + tr('readinglib_title', 'Reading Library')),
          e('button', {
            className: 'px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold',
            onClick: props.onClose, 'aria-label': tr('readinglib_close', 'Close'),
          }, '✕')
        ),
        e('div', { className: 'flex-1 min-h-0' }, body)
      )
    );
  }

  // statics for the test harness
  ReadingLibrary._tr = tr;
  ReadingLibrary._assignCues = assignCues;
  ReadingLibrary._findActiveCue = findActiveCue;
  ReadingLibrary._pageCueRange = pageCueRange;
  ReadingLibrary._bookPlainText = bookPlainText;
  ReadingLibrary._textLayoutClass = textLayoutClass;
  ReadingLibrary._attributionLine = attributionLine;
  ReadingLibrary.BookReader = BookReader;
  ReadingLibrary.PracticePanel = PracticePanel;
  ReadingLibrary.BookCard = BookCard;

  window.AlloModules.ReadingLibrary = ReadingLibrary;
  console.log('[CDN] ReadingLibrary loaded');
})();
