/**
 * AlloFlow LitLab Module
 *
 * Fiction performance & literary analysis — bring stories to life with character voices,
 * karaoke performance mode, and grade-responsive literary analysis scaffolds.
 *
 * Source: story_stage_module.js
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.LitLab) {
    console.log('[CDN] LitLab already loaded, skipping');
    return;
  }

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-litlab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-litlab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  (function() {
    if (document.getElementById('litlab-a11y-styles')) return;
    var style = document.createElement('style');
    style.id = 'litlab-a11y-styles';
    style.textContent = [
      '.litlab-dialog button,.litlab-dialog input,.litlab-dialog select,.litlab-dialog textarea{min-height:24px}',
      '.litlab-dialog button{min-width:24px}',
      '.litlab-dialog,.litlab-dialog *{box-sizing:border-box}',
      '.litlab-dialog{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1e293b}',
      '.litlab-dialog button,.litlab-dialog select,.litlab-dialog input{min-height:40px}',
      '.litlab-dialog button:disabled{cursor:not-allowed}',
      '.litlab-dialog textarea{background:#fff;color:#1e293b}',
      '.litlab-dialog h3,.litlab-dialog h4{line-height:1.3}',
      '.litlab-header{gap:12px;flex-shrink:0}.litlab-header>div{min-width:0}.litlab-header h2,.litlab-header p{overflow-wrap:anywhere}',
      '.litlab-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));list-style:none;margin:0;padding:16px 24px;border-bottom:1px solid #e8e3f1;background:#fff;gap:12px;flex-shrink:0}',
      '.litlab-step{display:flex;gap:9px;align-items:center;font-size:12px;font-weight:650;color:#64748b;min-width:0}',
      '.litlab-step-number{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;border:1px solid #d7d1e4;border-radius:50%;font-size:12px;background:#faf9fc}',
      '.litlab-step[aria-current="step"]{color:#6d28d9}.litlab-step[aria-current="step"] .litlab-step-number{background:#6d28d9;border-color:#6d28d9;color:#fff}',
      '.litlab-step[data-complete="true"] .litlab-step-number{background:#ede9fe;border-color:#ddd6fe;color:#6d28d9}',
      '.litlab-mode-picker{padding:5px;border:1px solid #ddd6ed;background:#f0edf6;border-radius:14px}.litlab-mode-picker button{flex:1}',
      '.litlab-story-meta{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:#64748b;margin-top:10px;line-height:1.5}',
      '.litlab-options{flex-wrap:wrap}.litlab-options>button{min-width:64px}.litlab-options>label{width:100%}',
      '.litlab-performer{flex-wrap:wrap}.litlab-performer select{max-width:100%}',
      '@media(max-width:600px){.litlab-dialog{max-height:96dvh!important;border-radius:16px!important}.litlab-header{padding:14px!important}.litlab-body{padding:16px!important}.litlab-steps{padding:12px;gap:6px}.litlab-step{flex-direction:column;gap:5px;text-align:center;font-size:11px}.litlab-performer{padding:10px!important;gap:6px!important}.litlab-performer>span{width:100%;text-align:center}.litlab-voice-grid{grid-template-columns:minmax(0,1fr)!important}}',
      '.litlab-dialog :where(button,input,select,textarea,[tabindex],summary):focus-visible{outline:3px solid #0f172a;outline-offset:3px;box-shadow:0 0 0 2px #fff}',
      '@media (forced-colors:active){.litlab-dialog :where(button,input,select,textarea,[tabindex]):focus-visible{outline-color:Highlight;box-shadow:none}}',
      '@media (prefers-reduced-motion:reduce){.litlab-dialog,.litlab-dialog *,.litlab-dialog *::before,.litlab-dialog *::after{animation:none!important;scroll-behavior:auto!important;transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  })();

  // Helper to announce dynamic state changes to SR users.
  function announceLitLab(msg) {
    try {
      var lr = document.getElementById('allo-live-litlab');
      if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 50); }
    } catch (e) {}
  }

  function useLitLabDialogFocus(dialogRef, initialFocusRef, onEscapeRef, returnFocusRef) {
    React.useEffect(function () {
      var dialog = dialogRef.current;
      if (!dialog || typeof document === 'undefined') return undefined;
      var previous = returnFocusRef.current || document.activeElement;
      var stack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
      var trap = { root: dialog };
      stack.push(trap);
      function focusable() {
        return Array.prototype.slice.call(dialog.querySelectorAll(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
        )).filter(function (node) {
          return !node.hidden && node.getAttribute('aria-hidden') !== 'true';
        });
      }
      var initial = initialFocusRef.current || focusable()[0] || dialog;
      if (initial && typeof initial.focus === 'function') initial.focus();
      function onKeyDown(event) {
        if (stack[stack.length - 1] !== trap) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          if (onEscapeRef.current) onEscapeRef.current();
          return;
        }
        if (event.key !== 'Tab') return;
        var items = focusable();
        if (!items.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        var first = items[0];
        var last = items[items.length - 1];
        if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      document.addEventListener('keydown', onKeyDown);
      return function () {
        document.removeEventListener('keydown', onKeyDown);
        var index = stack.indexOf(trap);
        if (index !== -1) stack.splice(index, 1);
        if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
      };
    }, []);
  }

  function LitLabPromptDialog(props) {
    var e = React.createElement;
    var dialogRef = React.useRef(null);
    var inputRef = React.useRef(null);
    var onEscapeRef = React.useRef(props.onCancel);
    var returnFocusRef = React.useRef(props.returnFocus || (typeof document !== 'undefined' ? document.activeElement : null));
    var _value = React.useState(props.initialValue || ''); var value = _value[0]; var setValue = _value[1];
    var _error = React.useState(''); var error = _error[0]; var setError = _error[1];
    onEscapeRef.current = props.onCancel;
    useLitLabDialogFocus(dialogRef, inputRef, onEscapeRef, returnFocusRef);

    var descriptionIds = ['litlab-prompt-description'];
    if (props.examples) descriptionIds.push('litlab-prompt-examples');
    if (error) descriptionIds.push('litlab-prompt-error');

    function submit(event) {
      event.preventDefault();
      var trimmed = value.trim();
      if (!trimmed) {
        setError(props.requiredMessage);
        if (inputRef.current) inputRef.current.focus();
        return;
      }
      setError('');
      props.onSubmit(trimmed);
    }

    return e('div', {
      role: 'presentation',
      style: { position: 'fixed', inset: 0, zIndex: 71, background: 'rgba(15,23,42,0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
      onMouseDown: function (event) { if (event.target === event.currentTarget) props.onCancel(); }
    },
      e('div', {
        ref: dialogRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'litlab-prompt-title',
        'aria-describedby': 'litlab-prompt-description',
        tabIndex: -1,
        className: 'litlab-dialog',
        style: { width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: '#fff', color: '#172033', border: '2px solid #7c3aed', borderRadius: '16px', boxShadow: '0 24px 70px rgba(15,23,42,0.42)', padding: '20px' },
        onMouseDown: function (event) { event.stopPropagation(); }
      },
        e('form', { onSubmit: submit, noValidate: true },
          e('h2', { id: 'litlab-prompt-title', style: { margin: '0 0 8px', fontSize: '20px', lineHeight: 1.3, color: '#581c87' } }, props.title),
          e('p', { id: 'litlab-prompt-description', style: { margin: '0 0 16px', color: '#475569', fontSize: '14px', lineHeight: 1.55 } }, props.description),
          e('label', { htmlFor: 'litlab-prompt-input', style: { display: 'block', marginBottom: '6px', color: '#1e293b', fontSize: '14px', fontWeight: 800 } }, props.label),
          e('input', {
            ref: inputRef,
            id: 'litlab-prompt-input',
            type: props.inputType || 'text',
            inputMode: props.inputType === 'url' ? 'url' : undefined,
            autoComplete: props.inputType === 'url' ? 'url' : 'off',
            required: true,
            'aria-required': 'true',
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': descriptionIds.join(' '),
            value: value,
            placeholder: props.placeholder || '',
            onChange: function (event) { setValue(event.target.value); if (error) setError(''); },
            style: { display: 'block', width: '100%', minHeight: '44px', boxSizing: 'border-box', padding: '10px 12px', color: '#0f172a', background: '#fff', border: '2px solid ' + (error ? '#b91c1c' : '#64748b'), borderRadius: '8px', fontSize: '16px' }
          }),
          props.examples && e('p', { id: 'litlab-prompt-examples', style: { margin: '8px 0 0', whiteSpace: 'pre-line', color: '#475569', fontSize: '13px', lineHeight: 1.5 } }, props.examples),
          error && e('p', { id: 'litlab-prompt-error', role: 'alert', style: { margin: '8px 0 0', color: '#991b1b', fontSize: '14px', fontWeight: 700 } }, error),
          e('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '20px' } },
            e('button', { type: 'button', onClick: props.onCancel, style: { minWidth: '96px', minHeight: '44px', padding: '9px 16px', border: '2px solid #64748b', borderRadius: '9px', background: '#fff', color: '#1e293b', fontWeight: 800, cursor: 'pointer' } }, props.cancelLabel),
            e('button', { type: 'submit', style: { minWidth: '112px', minHeight: '44px', padding: '9px 16px', border: '2px solid #6d28d9', borderRadius: '9px', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' } }, props.submitLabel)
          )
        )
      )
    );
  }

  var warnLog = function () { console.warn.apply(console, ['[LitLab]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Constants ─────────────────────────────────────────────────────────
  var STORAGE_SCRIPTS = 'alloLitLabScripts';
  var STORAGE_PERFORMANCES = 'alloLitLabPerformances';

  var GENRES = [
    { id: 'fairy-tale', label: 'Fairy Tale', icon: '🧚', desc: 'Once upon a time...' },
    { id: 'mystery', label: 'Mystery', icon: '🔍', desc: 'Whodunit suspense' },
    { id: 'adventure', label: 'Adventure', icon: '⚔️', desc: 'Epic quests & journeys' },
    { id: 'sci-fi', label: 'Science Fiction', icon: '🚀', desc: 'Future worlds & technology' },
    { id: 'fantasy', label: 'Fantasy', icon: '🐉', desc: 'Magic & mythical worlds' },
    { id: 'realistic', label: 'Realistic Fiction', icon: '🏠', desc: 'Everyday life & relationships' },
    { id: 'historical', label: 'Historical Fiction', icon: '🏛️', desc: 'Stories set in the past' },
    { id: 'humor', label: 'Comedy', icon: '😂', desc: 'Funny & lighthearted' },
    { id: 'fable', label: 'Fable / Myth', icon: '🦊', desc: 'Lessons through allegory' },
    { id: 'poetry', label: 'Poetry / Spoken Word', icon: '📜', desc: 'Verse & rhythm' },
  ];

  // Default character voice assignments (rotate through distinct voices)
  var VOICE_POOL = ['Kore', 'Charon', 'Puck', 'Aoede', 'Fenrir', 'Leda', 'Orus', 'Zephyr', 'Enceladus', 'Despina', 'Achernar', 'Gacrux'];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
  function load(key, fallback) { try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

  function normalizeLitLabScript(value) {
    if (!value || !Array.isArray(value.characters) || !Array.isArray(value.lines) || !value.lines.length) throw new Error(tr('Invalid script format'));
    var ids = new Set();
    var characters = value.characters.map(function (character, index) {
      if (!character || typeof character.id !== 'string' || !character.id || typeof character.name !== 'string' || !character.name.trim() || ids.has(character.id)) throw new Error(tr('Invalid script format'));
      ids.add(character.id);
      return Object.assign({}, character, { description: typeof character.description === 'string' ? character.description : '', color: /^#[0-9a-f]{6}$/i.test(character.color || '') ? character.color : '#64748b', voice: typeof character.voice === 'string' ? character.voice : VOICE_POOL[index % VOICE_POOL.length], portrait: typeof character.portrait === 'string' ? character.portrait : null });
    });
    if (!ids.has('narrator')) { ids.add('narrator'); characters.unshift({ id: 'narrator', name: 'Narrator', description: 'The storyteller', color: '#64748b', voice: 'Aoede', portrait: null }); }
    var lineIds = new Set();
    var lines = value.lines.map(function (line, index) {
      if (!line || typeof line.text !== 'string' || !line.text.trim()) throw new Error(tr('Invalid script format'));
      var id = typeof line.id === 'string' && line.id ? line.id : 'l' + (index + 1);
      while (lineIds.has(id)) id += '_';
      lineIds.add(id);
      var type = ['dialogue', 'narration', 'stage-direction'].indexOf(line.type) !== -1 ? line.type : 'narration';
      return Object.assign({}, line, { id: id, type: type, speaker: type === 'stage-direction' ? 'stage' : ids.has(line.speaker) ? line.speaker : 'narrator' });
    });
    return Object.assign({}, value, { characters: characters, lines: lines, title: typeof value.title === 'string' ? value.title : '', setting: typeof value.setting === 'string' ? value.setting : '', theme: typeof value.theme === 'string' ? value.theme : '', literaryElements: Array.isArray(value.literaryElements) ? value.literaryElements.filter(function (item) { return typeof item === 'string'; }) : [] });
  }

  function normalizeLitLabFeedback(value) {
    if (!value || ['developing', 'proficient', 'exemplary'].indexOf(value.overallRating) === -1) throw new Error('Incomplete feedback');
    var out = { overallRating: value.overallRating };
    ['strengths', 'nudges'].forEach(function (key) {
      if (value[key] != null && (!Array.isArray(value[key]) || value[key].some(function (item) { return typeof item !== 'string'; }))) throw new Error('Invalid feedback');
      out[key] = (value[key] || []).map(function (item) { return item.trim(); }).filter(Boolean);
    });
    ['characterInsight', 'themeInsight', 'craftInsight'].forEach(function (key) {
      if (value[key] != null && typeof value[key] !== 'string') throw new Error('Invalid feedback');
      out[key] = (value[key] || '').trim();
    });
    if (!out.strengths.length && !out.nudges.length && !out.characterInsight && !out.themeInsight && !out.craftInsight) throw new Error('Empty feedback');
    return out;
  }

  function normalizeLitLabPlan(value) {
    if (!value || !Array.isArray(value.tasks) || value.tasks.length < 3) throw new Error('Incomplete revision plan');
    var tasks = value.tasks.slice(0, 3).map(function (task) {
      if (!task || ['title', 'detail', 'why'].some(function (key) { return typeof task[key] !== 'string' || !task[key].trim(); })) throw new Error('Invalid revision task');
      return { title: task.title.trim(), detail: task.detail.trim(), why: task.why.trim(), source: typeof task.source === 'string' ? task.source : '' };
    });
    return { tasks: tasks, encouragement: typeof value.encouragement === 'string' ? value.encouragement : '' };
  }

  // ── Self-contained UI localization (mirrors Lingua Practice) ───────────────
  // LitLab's chrome is localized into the STUDENT's interface language
  // (currentUiLanguage, read from the app's LanguageContext) via the app's own
  // runtime Gemini (props.onCallGemini — the user's key, never a build key).
  // English strings ARE the keys: wrap each in tr('…'); a registry auto-collects
  // them and batch-translates the ones missing from the per-device cache. Falls
  // back to English, and touches no lang/*.js. Emoji/{tokens} preserved.
  var LL_I18N_KEY = 'allo_litlab_ui_i18n_v1';
  var LANG_CTX = (typeof window !== 'undefined' && window.AlloLanguageContext) || React.createContext(null);
  var STR_REG = {}; // English strings seen via tr(), used as the translate work-list
  var LL_CUR = { lang: 'English', cache: {} }; // per-render snapshot so tr() works in module + handler scope
  function llInterp(s, params) {
    if (s == null || !params) return s;
    Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); });
    return s;
  }
  // English text IS the key. Registers the string, returns its translation for the
  // current UI language (or English). Global so it can wrap strings anywhere.
  function tr(en, params) {
    if (en && typeof en === 'string') STR_REG[en] = true;
    var p = LL_CUR.cache[LL_CUR.lang];
    return llInterp((p && p[en] != null) ? p[en] : en, params);
  }
  function llCleanJson(raw) {
    var s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    var first = s.indexOf('{'), last = s.lastIndexOf('}');
    return first >= 0 && last > first ? s.slice(first, last + 1) : s;
  }
  function llSanitize(obj, wanted) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    var out = {}, n = 0;
    wanted.forEach(function (k) { var v = obj[k]; if (typeof v === 'string') { v = v.trim().slice(0, 400); if (v) { out[k] = v; n++; } } });
    return n ? out : null;
  }
  function llPrompt(langName, list) {
    return [
      'Translate these user-interface labels for a classroom literacy/theatre app into natural, concise ' + langName + ' (buttons, tabs, headings — keep them short).',
      'Keep any {tokens} and any emoji EXACTLY as written. No commentary.',
      'Return ONLY a JSON object mapping each ENGLISH string (used verbatim as the key) to its ' + langName + ' translation.',
      JSON.stringify(list)
    ].join(String.fromCharCode(10));
  }

  // ── Main Component ────────────────────────────────────────────────────
  var LitLab = React.memo(function LitLab(props) {
    var onClose = props.onClose;
    var onCallGemini = props.onCallGemini;
    var onCallTTS = props.onCallTTS;
    var onCallImagen = props.onCallImagen;
    var onCallGeminiImageEdit = props.onCallGeminiImageEdit;
    var selectedVoice = props.selectedVoice;
    var gradeLevel = props.gradeLevel || '5th Grade';
    var addToast = props.addToast;
    var geminiVoices = props.geminiVoices || [];
    var kokoroVoices = props.kokoroVoices || [];
    var studentNickname = props.studentNickname || '';
    var handleScoreUpdate = props.handleScoreUpdate;
    // Resource-history integration (teacher-scaffold path; mirrors StoryForge / PoetTree)
    var initialConfig = props.initialConfig || null;
    var onSaveConfig = props.onSaveConfig || null;        // non-null => teacher mode
    var onSaveSubmission = props.onSaveSubmission || null; // non-null => save to portfolio enabled

    var e = React.createElement;
    var useState = React.useState;
    var useCallback = React.useCallback;
    var useRef = React.useRef;
    var dialogRef = useRef(null);
    var closeButtonRef = useRef(null);
    var onCloseRef = useRef(onClose);
    var returnFocusRef = useRef(typeof document !== 'undefined' ? document.activeElement : null);
    React.useEffect(function () { onCloseRef.current = onClose; }, [onClose]);
    useLitLabDialogFocus(dialogRef, closeButtonRef, onCloseRef, returnFocusRef);

    // ── UI localization (student's interface language, runtime-translated) ──
    var langCtx = React.useContext(LANG_CTX);
    var uiLang = (langCtx && langCtx.currentUiLanguage) || (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
    var llCacheRef = useRef(load(LL_I18N_KEY, {}));
    var llReqRef = useRef(0);
    var llAttemptedRef = useRef({});
    var setLlTick = useState(0)[1];
    var _llTranslating = useState(false); var llTranslating = _llTranslating[0]; var setLlTranslating = _llTranslating[1];
    // Publish this render's language + cache so the module-scope tr() resolves correctly.
    LL_CUR.lang = uiLang; LL_CUR.cache = llCacheRef.current;
    function llTranslateBatch(list) {
      if (typeof onCallGemini !== 'function' || !list.length) return;
      var reqId = ++llReqRef.current, lang = uiLang;
      setLlTranslating(true);
      var att = llAttemptedRef.current[lang] || (llAttemptedRef.current[lang] = {});
      list.forEach(function (k) { att[k] = true; });
      Promise.resolve().then(function () { return onCallGemini(llPrompt(lang, list)); }).then(function (raw) {
        if (reqId !== llReqRef.current) return;
        setLlTranslating(false);
        var pack = null; try { pack = llSanitize(JSON.parse(llCleanJson(raw)), list); } catch (_) {}
        if (pack) {
          var next = Object.assign({}, llCacheRef.current);
          next[lang] = Object.assign({}, next[lang] || {}, pack);
          llCacheRef.current = next; store(LL_I18N_KEY, next);
          setLlTick(function (n) { return n + 1; });
        }
      }).catch(function () { if (reqId === llReqRef.current) setLlTranslating(false); });
    }
    React.useEffect(function () {
      if (uiLang === 'English' || typeof onCallGemini !== 'function') return;
      var cache = llCacheRef.current[uiLang] || {}, attempted = llAttemptedRef.current[uiLang] || {};
      var missing = Object.keys(STR_REG).filter(function (k) { return !cache[k] && !attempted[k]; });
      if (!missing.length) return;
      var t = setTimeout(function () { llTranslateBatch(missing); }, 500);
      return function () { clearTimeout(t); };
    });

    // ── Codename system ──
    var CN_ADJ = ['Alpine','Arctic','Bold','Brave','Bright','Calm','Clever','Cool','Cosmic','Daring','Eager','Epic','Fair','Fast','Fierce','Gentle','Grand','Happy','Heroic','Jolly','Kind','Lively','Lucky','Magic','Mighty','Neon','Noble','Proud','Quick','Rapid','Royal','Silent','Smart','Solar','Sonic','Steady','Super','Swift','Tough','Turbo','Unique','Vivid','Wild','Wise','Zealous'];
    var CN_ANI = ['Badger','Bear','Beaver','Bison','Cat','Cobra','Cougar','Crane','Crow','Deer','Dingo','Dolphin','Dragon','Eagle','Elk','Falcon','Ferret','Fox','Gecko','Hawk','Heron','Horse','Husky','Jaguar','Koala','Lemur','Leopard','Lion','Lynx','Moose','Otter','Owl','Panda','Panther','Parrot','Penguin','Puma','Rabbit','Raven','Seal','Shark','Sloth','Tiger','Turtle','Wolf'];

    var PURPLE = '#7c3aed';
    var LIGHT_PURPLE = '#f5f3ff';

    // ── State ──
    var _phase = useState('input'); var phase = _phase[0]; var setPhase = _phase[1];
    // input → script → assign → perform → analyze

    // Input state
    var _inputMode = useState('paste'); var inputMode = _inputMode[0]; var setInputMode = _inputMode[1];
    var _sourceText = useState(''); var sourceText = _sourceText[0]; var setSourceText = _sourceText[1];
    var _storyTitle = useState(''); var storyTitle = _storyTitle[0]; var setStoryTitle = _storyTitle[1];
    var _isLoading = useState(false); var isLoading = _isLoading[0]; var setIsLoading = _isLoading[1];
    var _generationDraft = useState(''); var generationDraft = _generationDraft[0]; var setGenerationDraft = _generationDraft[1];
    var _generationError = useState(''); var generationError = _generationError[0]; var setGenerationError = _generationError[1];
    var _loadingMsg = useState(''); var loadingMsg = _loadingMsg[0]; var setLoadingMsg = _loadingMsg[1];
    // AI generation
    var _genGenre = useState('fairy-tale'); var genGenre = _genGenre[0]; var setGenGenre = _genGenre[1];
    var _genPrompt = useState(''); var genPrompt = _genPrompt[0]; var setGenPrompt = _genPrompt[1];
    var _genCharCount = useState(3); var genCharCount = _genCharCount[0]; var setGenCharCount = _genCharCount[1];
    var _genGradeLevel = useState(gradeLevel || '5th Grade'); var genGradeLevel = _genGradeLevel[0]; var setGenGradeLevel = _genGradeLevel[1];
    var _genLength = useState('medium'); var genLength = _genLength[0]; var setGenLength = _genLength[1];
    var GRADE_OPTIONS = ['K', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
    var LENGTH_OPTIONS = [
      { id: 'short', label: 'Short', words: '200-400', desc: 'Quick read, 1-2 scenes' },
      { id: 'medium', label: 'Medium', words: '500-800', desc: 'Standard story arc' },
      { id: 'long', label: 'Long', words: '900-1500', desc: 'Detailed with subplots' },
      { id: 'custom', label: 'Custom', words: '', desc: 'Specify exact word count' },
    ];
    var _customWordCount = useState('600'); var customWordCount = _customWordCount[0]; var setCustomWordCount = _customWordCount[1];

    var customWordCountValid = /^\d+$/.test(customWordCount) && Number(customWordCount) >= 50 && Number(customWordCount) <= 5000;

    // Script state
    var _script = useState(null); var script = _script[0]; var setScript = _script[1];

    // Storybook pages (group lines into pages for page-by-page navigation)
    var _currentPage = useState(0); var currentPage = _currentPage[0]; var setCurrentPage = _currentPage[1];
    var _pageImages = useState({}); var pageImages = _pageImages[0]; var setPageImages = _pageImages[1];
    var _pageImgLoading = useState({}); var pageImgLoading = _pageImgLoading[0]; var setPageImgLoading = _pageImgLoading[1];
    var LINES_PER_PAGE = 6;
    // script = { title, characters: [{id, name, voice, color, portrait}], lines: [{id, speaker, text, type:'dialogue'|'narration'|'stage-direction'}] }

    // Voice assignment
    var _previewingVoice = useState(null); var previewingVoice = _previewingVoice[0]; var setPreviewingVoice = _previewingVoice[1];

    // Performance state
    var _currentLine = useState(0); var currentLine = _currentLine[0]; var setCurrentLine = _currentLine[1];
    var _isPlaying = useState(false); var isPlaying = _isPlaying[0]; var setIsPlaying = _isPlaying[1];
    var _isPaused = useState(false); var isPaused = _isPaused[0]; var setIsPaused = _isPaused[1];
    var _playbackSpeed = useState(1); var playbackSpeed = _playbackSpeed[0]; var setPlaybackSpeed = _playbackSpeed[1];
    var _myRole = useState(null); var myRole = _myRole[0]; var setMyRole = _myRole[1]; // character id the student "plays"
    // Reading-friendly text mode (WCAG 1.4.4 / 1.4.12) — persists across sessions
    var _largeText = useState(function () { try { return localStorage.getItem('alloLitLabReadingMode') === '1'; } catch (e) { return false; } });
    var largeText = _largeText[0]; var setLargeText = _largeText[1];
    var audioRef = useRef(null);
    var speechAbortRef = useRef(null);
    var narrationRef = useRef(null);
    var narrationPayloadRef = useRef(null);
    var narrationResourceIdRef = useRef(null);
    var narrationLiveRef = useRef(null);
    var preparationRef = useRef(null);
    var _narrationRevision = useState(0); var refreshNarration = _narrationRevision[1];
    var _narrationDirty = useState(false); var narrationDirty = _narrationDirty[0]; var setNarrationDirty = _narrationDirty[1];
    var _narrationNotice = useState(''); var narrationNotice = _narrationNotice[0]; var setNarrationNotice = _narrationNotice[1];
    var _preparing = useState(false); var preparing = _preparing[0]; var setPreparing = _preparing[1];
    var _storyLanguage = useState(props.storyLanguage || 'English'); var storyLanguage = _storyLanguage[0]; var setStoryLanguage = _storyLanguage[1];
    var speechEpochRef = useRef(0);
    var speechFinishRef = useRef(null);
    var playbackEpochRef = useRef(0);
    var recordingEpochRef = useRef(0);
    var storyEpochRef = useRef(0);
    var recordingStreamRef = useRef(null);
    var recordingUrlRef = useRef(null);
    var playingRef = useRef(false);
    var pausedRef = useRef(false);
    var lineContainerRef = useRef(null);

    // Analysis state
    var _analysisResponses = useState({}); var analysisResponses = _analysisResponses[0]; var setAnalysisResponses = _analysisResponses[1];
    var _analysisFeedback = useState(null); var analysisFeedback = _analysisFeedback[0]; var setAnalysisFeedback = _analysisFeedback[1];
    // ── Pre-feedback Self-Assessment + Revision Plan synthesizer (mirrors StoryForge / PoetTree pattern) ──
    var _selfAssessment = useState({}); var selfAssessment = _selfAssessment[0]; var setSelfAssessment = _selfAssessment[1];
    var _selfAssessmentSubmitted = useState(false); var selfAssessmentSubmitted = _selfAssessmentSubmitted[0]; var setSelfAssessmentSubmitted = _selfAssessmentSubmitted[1];
    var _revisionPlan = useState(null); var revisionPlan = _revisionPlan[0]; var setRevisionPlan = _revisionPlan[1];
    var _revisionPlanLoading = useState(false); var revisionPlanLoading = _revisionPlanLoading[0]; var setRevisionPlanLoading = _revisionPlanLoading[1];

    var activeSavedIdRef = useRef(null);
    var saveInFlightRef = useRef(false);
    var _saving = useState(false); var saving = _saving[0]; var setSaving = _saving[1];
    var _saveMessage = useState(''); var saveMessage = _saveMessage[0]; var setSaveMessage = _saveMessage[1];
    var _saveError = useState(false); var saveError = _saveError[0]; var setSaveError = _saveError[1];
    function reportSave(message, failed) { setSaveMessage(message); setSaveError(!!failed); if (addToast) addToast(message, failed ? 'error' : 'success'); }
    var feedbackEpochRef = useRef(0);
    var planEpochRef = useRef(0);
    var _feedbackNotice = useState(''); var feedbackNotice = _feedbackNotice[0]; var setFeedbackNotice = _feedbackNotice[1];
    var _completedTasks = useState({}); var completedTasks = _completedTasks[0]; var setCompletedTasks = _completedTasks[1];

    function invalidatePlan() {
      planEpochRef.current++; setRevisionPlan(null); setRevisionPlanLoading(false); setCompletedTasks({});
    }
    function invalidateFeedback() {
      feedbackEpochRef.current++;
      if (analysisFeedback) setFeedbackNotice(tr('Your reflection changed. Get feedback again for your updated responses.'));
      setAnalysisFeedback(null); invalidatePlan();
    }

    // Saved scripts
    var _savedScripts = useState(function () {
      var entries = load(STORAGE_SCRIPTS, []);
      return Array.isArray(entries) ? entries.map(function (entry) {
        try { if (!entry) return null; var valid = normalizeLitLabScript(entry.script); return Object.assign({}, entry, { title: typeof entry.title === 'string' ? entry.title : valid.title, script: valid }); } catch (_) { return null; }
      }).filter(Boolean) : [];
    });
    var savedScripts = _savedScripts[0]; var setSavedScripts = _savedScripts[1];

    // Teacher-scaffold field (saved into the resource-history config payload).
    // teacherPrompt: a focus-note / performance instructions the teacher writes for the assignment.
    var _teacherPrompt = useState(''); var teacherPrompt = _teacherPrompt[0]; var setTeacherPrompt = _teacherPrompt[1];

    // Hydrate from a saved teacher assignment (initialConfig) the first time it shows up.
    var _hydratedFromConfig = useRef(false);
    React.useEffect(function () {
      if (_hydratedFromConfig.current) return;
      if (!initialConfig) return;
      _hydratedFromConfig.current = true;
      try {
        if (initialConfig.sourceText) setSourceText(initialConfig.sourceText);
        if (initialConfig.storyTitle) setStoryTitle(initialConfig.storyTitle);
        if (initialConfig.teacherPrompt) setTeacherPrompt(initialConfig.teacherPrompt);
        if (typeof initialConfig.genPrompt === 'string') setGenPrompt(initialConfig.genPrompt);
        if (initialConfig.genCharCount >= 2 && initialConfig.genCharCount <= 6) setGenCharCount(initialConfig.genCharCount);
        if (initialConfig.customWordCount != null) setCustomWordCount(String(initialConfig.customWordCount));
        if (initialConfig.genGenre) setGenGenre(initialConfig.genGenre);
        if (initialConfig.genLength) setGenLength(initialConfig.genLength);
        if (initialConfig.genGradeLevel) setGenGradeLevel(initialConfig.genGradeLevel);
        if (initialConfig.inputMode) setInputMode(initialConfig.inputMode);
        if (addToast) addToast(tr('Assignment loaded!'), 'success');
      } catch (err) { console.warn('[LitLab] initialConfig hydration failed:', err && err.message); }
    }, [initialConfig]);

    // Scene illustration
    var _sceneImage = useState(null); var sceneImage = _sceneImage[0]; var setSceneImage = _sceneImage[1];
    var _sceneImageLoading = useState(false); var sceneImageLoading = _sceneImageLoading[0]; var setSceneImageLoading = _sceneImageLoading[1];
    var _promptRequest = useState(null); var promptRequest = _promptRequest[0]; var setPromptRequest = _promptRequest[1];

    // Emotion tracking (per-line emoji reactions during performance)
    var _emotionLog = useState({}); var emotionLog = _emotionLog[0]; var setEmotionLog = _emotionLog[1];
    var EMOTIONS = ['😊','😢','😠','😨','😂','🤔','😮','❤️'];

    // Recording
    var _isRecording = useState(false); var isRecording = _isRecording[0]; var setIsRecording = _isRecording[1];
    var _recordedChunks = useState([]); var recordedChunks = _recordedChunks[0]; var setRecordedChunks = _recordedChunks[1];
    var _recordingUrl = useState(null); var recordingUrl = _recordingUrl[0]; var setRecordingUrl = _recordingUrl[1];
    var mediaRecorderRef = useRef(null);

    // Codename
    var _performerName = useState(studentNickname || ''); var performerName = _performerName[0]; var setPerformerName = _performerName[1];

    // Standards selection
    var _selectedStandard = useState(''); var selectedStandard = _selectedStandard[0]; var setSelectedStandard = _selectedStandard[1];

    // CCSS ELA Standards for Literature
    var CCSS_STANDARDS = {
      'K-2': [
        'RL.K.1 Ask and answer questions about key details',
        'RL.1.3 Describe characters, settings, and major events',
        'RL.2.3 Describe how characters respond to events',
        'RL.2.6 Acknowledge differences in the points of view of characters',
      ],
      '3-5': [
        'RL.3.3 Describe characters and explain how their actions contribute to events',
        'RL.4.2 Determine a theme from details; summarize the text',
        'RL.4.3 Describe a character, setting, or event, drawing on specific details',
        'RL.5.2 Determine a theme; explain how it is conveyed through details',
        'RL.5.6 Describe how a narrator or speaker\'s point of view influences events',
      ],
      '6-8': [
        'RL.6.3 Describe how a plot unfolds and how characters respond or change',
        'RL.6.6 Explain how an author develops the point of view of the narrator',
        'RL.7.2 Determine a theme; analyze its development over the course of the text',
        'RL.8.3 Analyze how dialogue or incidents propel the action or reveal character',
      ],
      '9-12': [
        'RL.9-10.2 Determine a theme; analyze in detail its development',
        'RL.9-10.3 Analyze how complex characters develop and interact with other elements',
        'RL.9-10.5 Analyze how an author\'s choices concerning structure create effects',
        'RL.11-12.3 Analyze the impact of the author\'s choices regarding development of elements',
        'RL.11-12.6 Analyze a case in which grasping point of view requires distinguishing what is stated from what is meant',
      ],
    };

    // ── Helpers ──
    var allVoices = geminiVoices.concat(kokoroVoices || []);

    function cleanJson(text) {
      if (!text) return text;
      var s = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var first = s.indexOf('{') !== -1 ? s.indexOf('{') : s.indexOf('[');
      var last = s.lastIndexOf('}') !== -1 ? s.lastIndexOf('}') : s.lastIndexOf(']');
      if (first !== -1 && last !== -1 && last >= first) return s.substring(first, last + 1);
      return s;
    }

    // ── Phase 1: Extract characters & build script ──
    var extractScript = useCallback(async function (text) {
      if (!onCallGemini || !text.trim() || isLoading) return;
      var storyEpoch = storyEpochRef.current;
      setIsLoading(true);
      setLoadingMsg(tr('Analyzing text and extracting characters...'));
      try {
        var gl = genGradeLevel || gradeLevel || '5th Grade';
        var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gl);
        var prompt = 'You are an expert drama teacher and literary analyst. Analyze this fiction text and convert it into a performable script.\n\n'
          + 'Text:\n"""\n' + text.substring(0, 12000) + '\n"""\n\n'
          + 'Target audience: ' + gl + ' students.\n\n'
          + 'Extract:\n'
          + '1. TITLE: A title for this story/scene\n'
          + '2. CHARACTERS: Every distinct character who speaks or is referenced. For each character provide:\n'
          + '   - A unique id (lowercase, no spaces)\n'
          + '   - Their name as it appears in the text\n'
          + '   - A brief description (personality, role)\n'
          + '   - A suggested color (hex) for their dialogue highlighting\n'
          + '3. SCRIPT LINES: Convert the entire text into sequential lines. Each line is one of:\n'
          + '   - "dialogue": A character speaking (include the speaker\'s character id)\n'
          + '   - "narration": Narrator description/action (speaker = "narrator")\n'
          + '   - "stage-direction": Brief action/emotion cues in brackets (speaker = "stage")\n'
          + (isElem ? '   Keep narration lines short (1-2 sentences each). Split long passages.\n' : '')
          + '4. SETTING: A brief description of the setting for illustration generation\n'
          + '5. THEME: The central theme or message\n'
          + '6. LITERARY_ELEMENTS: Key literary devices used (foreshadowing, metaphor, etc.)\n\n'
          + 'Return ONLY JSON:\n'
          + '{\n'
          + '  "title": "Story Title",\n'
          + '  "setting": "brief setting description",\n'
          + '  "theme": "central theme",\n'
          + '  "literaryElements": ["element1", "element2"],\n'
          + '  "characters": [\n'
          + '    {"id": "char_id", "name": "Character Name", "description": "brief description", "color": "#hex"}\n'
          + '  ],\n'
          + '  "lines": [\n'
          + '    {"id": "l1", "speaker": "char_id_or_narrator_or_stage", "text": "The line text", "type": "dialogue|narration|stage-direction"}\n'
          + '  ]\n'
          + '}';
        var result = await onCallGemini(prompt, true);
        if (storyEpoch !== storyEpochRef.current) return;
        var parsed = normalizeLitLabScript(JSON.parse(cleanJson(result)));
        parsed.title = storyTitle.trim() || parsed.title || tr('Untitled');
        beginScript(parsed);
        setStoryTitle(parsed.title);
        setPhase('assign');
        addToast && addToast(tr('Script created! ') + parsed.characters.length + ' characters, ' + parsed.lines.length + ' lines.', 'success');
      } catch (err) {
        if (storyEpoch !== storyEpochRef.current) return;
        warnLog('Script extraction failed:', err);
        addToast && addToast('Script extraction failed: ' + err.message, 'error');
      } finally { if (storyEpoch === storyEpochRef.current) { setIsLoading(false); setLoadingMsg(''); } }
    }, [onCallGemini, gradeLevel, genGradeLevel, storyTitle, isLoading, addToast]);

    // ── AI Story Generation ──
    var generateStory = useCallback(async function () {
      if (!onCallGemini || isLoading) return;
      if (genLength === 'custom' && !customWordCountValid) {
        addToast && addToast(tr('Enter a whole number from 50 to 5000 words.'), 'error');
        return;
      }
      var storyEpoch = storyEpochRef.current;
      setGenerationError('');
      setIsLoading(true);
      var genreObj = GENRES.find(function (g) { return g.id === genGenre; }) || GENRES[0];
      setLoadingMsg('Writing a ' + genreObj.label + ' story...');
      try {
        var gl = genGradeLevel || gradeLevel || '5th Grade';
        var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gl);
        var isMid = /6th|7th|8th/i.test(gl);
        var lenObj = LENGTH_OPTIONS.find(function (l) { return l.id === genLength; }) || LENGTH_OPTIONS[1];
        var wordRange = genLength === 'custom' ? (customWordCount || '600') + ' words' : lenObj.words;
        var vocabGuide = isElem
          ? 'Keep vocabulary simple and sentences short (' + gl + ' reading level).'
          : isMid
          ? 'Use grade-appropriate vocabulary for ' + gl + ' students. Include descriptive language and character development.'
          : 'Use rich, literary language appropriate for ' + gl + '. Include at least one literary device (metaphor, foreshadowing, irony).';
        // Determine if we need multi-pass generation
        // Gemini max output ≈ 8000 chars ≈ ~1200 words. Chunk at 800 words for safety.
        var CHUNK_WORDS = 800;
        var targetWords = genLength === 'custom' ? parseInt(customWordCount || '600', 10) : (genLength === 'short' ? 300 : genLength === 'long' ? 1200 : 650);
        var numChunks = Math.ceil(targetWords / CHUNK_WORDS);
        var needsChunking = numChunks > 1;
        var chunkTarget = Math.ceil(targetWords / numChunks);

        var basePrompt = 'You are a talented fiction writer for ' + gl + ' students.\n\n'
          + 'Write a ' + genreObj.label + ' story'
          + (genPrompt.trim() ? ' with these instructions: "' + genPrompt.trim() + '"' : '') + '.\n\n'
          + 'Requirements:\n'
          + '- Include ' + genCharCount + ' distinct characters with dialogue\n'
          + '- ' + vocabGuide + '\n'
          + '- Use dialogue tags ("said", "whispered", "exclaimed") so characters are clearly identified\n'
          + '- Include sensory details and setting description\n';

        var fullStory = '';

        if (needsChunking) {
          // Multi-pass: generate story in chunks of ~800 words each
          // Pass 1: Beginning (do NOT resolve)
          var p1 = basePrompt + '- Target length: approximately ' + chunkTarget + ' words.\n'
            + '- Write the BEGINNING of the story. Introduce characters, setting, and the central conflict.\n'
            + '- End at a compelling moment — do NOT resolve the story yet.\n\n'
            + 'Return ONLY the story text — no title, no commentary.';
          var part1 = await onCallGemini(p1, false);
          if (storyEpoch !== storyEpochRef.current) return;
          if (typeof part1 !== 'string' || part1.trim().length < 50) throw new Error(tr('Story generation failed'));
          fullStory = part1.trim();

          // Middle passes (if 3+ chunks needed)
          for (var ci = 1; ci < numChunks - 1; ci++) {
            setLoadingMsg('Writing part ' + (ci + 1) + ' of ' + numChunks + '...');
            await new Promise(function (r) { setTimeout(r, 1500); });
            if (storyEpoch !== storyEpochRef.current) return;
            var pMid = 'You are continuing a ' + genreObj.label + ' story for ' + gl + ' students.\n\n'
              + 'Story so far (ending):\n"""\n' + fullStory.substring(fullStory.length - 1500) + '\n"""\n\n'
              + 'Requirements:\n'
              + '- Write the next ~' + chunkTarget + ' words, developing the plot further.\n'
              + '- Do NOT end the story yet — more parts are coming.\n'
              + '- Maintain the same characters, tone, and style. ' + vocabGuide + '\n\n'
              + 'Return ONLY the continuation — no headers, no commentary. Start exactly where the previous part left off.';
            var midResult = await onCallGemini(pMid, false);
            if (storyEpoch !== storyEpochRef.current) return;
            if (typeof midResult !== 'string' || midResult.trim().length <= 30) throw new Error(tr('A section of the story could not be completed.'));
            fullStory += '\n\n' + midResult.trim();
          }

          // Final pass: Climax and ending
          setLoadingMsg('Writing the ending...');
          await new Promise(function (r) { setTimeout(r, 1500); });
          if (storyEpoch !== storyEpochRef.current) return;
          var pEnd = 'You are writing the FINAL part of a ' + genreObj.label + ' story for ' + gl + ' students.\n\n'
            + 'Story so far (ending):\n"""\n' + fullStory.substring(fullStory.length - 1500) + '\n"""\n\n'
            + 'Requirements:\n'
            + '- Write approximately ' + chunkTarget + ' more words.\n'
            + '- Bring the story to a satisfying CLIMAX and CONCLUSION. Resolve all plot threads.\n'
            + '- Maintain the same characters, tone, and style. ' + vocabGuide + '\n\n'
            + 'Return ONLY the conclusion — no headers, no commentary.';
          var endResult = await onCallGemini(pEnd, false);
          if (storyEpoch !== storyEpochRef.current) return;
          if (typeof endResult !== 'string' || endResult.trim().length <= 30) throw new Error(tr('The story ending could not be completed.'));
          fullStory += '\n\n' + endResult.trim();
        } else {
          // Single-pass generation for shorter stories
          var prompt = basePrompt + '- Target length: ' + wordRange + ' words.\n'
            + '- Include a clear beginning, middle, and end\n\n'
            + 'Return ONLY the story text — no title header, no commentary.';
          fullStory = await onCallGemini(prompt, false);
          if (storyEpoch !== storyEpochRef.current) return;
        }

        if (typeof fullStory === 'string' && fullStory.trim().length > 50) {
          setGenerationDraft('');
          setSourceText(fullStory.trim());
          setInputMode('paste');
          addToast && addToast(tr('Story generated! ') + fullStory.trim().split(/\s+/).length + ' words. Review it, then click "Create Script".', 'success');
        } else {
          throw new Error(tr('Generation returned too little text. Try again.'));
        }
      } catch (err) {
        if (storyEpoch !== storyEpochRef.current) return;
        setGenerationError(tr('The story could not be completed. Try again or review the draft below, if available.'));
        if (typeof fullStory === 'string' && fullStory.trim().length > 50) setGenerationDraft(fullStory.trim());
        addToast && addToast(tr('Story generation failed: ') + err.message, 'error');
      } finally { if (storyEpoch === storyEpochRef.current) { setIsLoading(false); setLoadingMsg(''); } }
    }, [onCallGemini, gradeLevel, genGradeLevel, genGenre, genPrompt, genCharCount, genLength, customWordCount, customWordCountValid, isLoading, addToast]);

    // Each story owns a private V4 lane. Never borrow the adapted-text current lane.
    narrationLiveRef.current = { script: script, language: storyLanguage.trim() || 'English', callTTS: onCallTTS };
    function isNarrationMuted() {
      return typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted();
    }
    function cancelPreparation() {
      if (preparationRef.current) preparationRef.current.abort();
      preparationRef.current = null;
      setPreparing(false);
    }
    function releaseNarration() {
      if (preparationRef.current) preparationRef.current.abort();
      preparationRef.current = null;
      if (narrationRef.current) narrationRef.current.store.clear();
      narrationRef.current = null;
    }
    function getNarration() {
      if (narrationRef.current) return narrationRef.current.service;
      var modules = window.AlloModules || {};
      if (!narrationLiveRef.current.script || !modules.KaraokeAudioStore || !modules.createReadAloudAudioService) return null;
      var lane = modules.KaraokeAudioStore.createStore();
      if (narrationPayloadRef.current) lane.hydrate(narrationPayloadRef.current);
      var resourceId = narrationResourceIdRef.current || (narrationResourceIdRef.current = uid());
      var profiles = new Map();
      var service = modules.createReadAloudAudioService({
        getStoreModule: function () { return lane; },
        getResource: function () { return narrationLiveRef.current.script; },
        getSynthesisProfile: function (context) {
          var current = narrationLiveRef.current;
          var character = current.script.characters.find(function (item) { return item.id === context.segment.raw.speaker; });
          return { voice: character && character.voice || 'Aoede', language: current.language, speed: 1, synthesisRate: 1, voiceResolverVersion: 2 };
        },
        synthesize: async function (request) {
          var provider = narrationLiveRef.current.callTTS;
          if (!provider || isNarrationMuted()) throw new Error('Narration is unavailable or muted.');
          var provenance = {};
          var url = await provider(request.text, request.profile.voice, 1, { language: request.profile.language, signal: request.signal, maxRetries: 1,
            onResolvedProfile: function (value) { provenance = value || {}; }
          });
          if (url && !(request.signal && request.signal.aborted)) profiles.set(request.segment.segmentId, provenance);
          return { url: url, provenance: provenance };
        },
        encode: async function (audio, context) {
          var response = await fetch(typeof audio === 'string' ? audio : audio.url, { signal: context.signal });
          if (!response.ok) throw new Error('Narration audio could not be copied.');
          var blob = await response.blob();
          // Use the same cooperative compact encoder as adapted-text narration.
          // Retain the original container if the encoder is unavailable.
          try {
            var buffer = await new Promise(function (resolve, reject) {
              var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = reject; reader.readAsArrayBuffer(blob);
            });
            var inspector = modules.inspectReadAloudAudioBytes;
            var container = inspector ? inspector(new Uint8Array(buffer), blob.type) : null;
            if (container && container.pcm) {
              if (!window.lamejs && window.__alloEnsureLameJs) await window.__alloEnsureLameJs();
              var helper = modules.AudioHelpers;
              if (window.lamejs && helper && helper.pcmToMp3Async) {
                var compact = await helper.pcmToMp3Async(container.pcm, container.sampleRate, 64);
                blob = new Blob([compact], { type: 'audio/mpeg' });
              }
            }
          } catch (_) {}
          return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onerror = function () { reject(new Error('Narration audio could not be read.')); };
            reader.onload = function () { resolve({ b64: String(reader.result).split(',')[1], mime: blob.type || 'audio/mpeg' }); };
            reader.readAsDataURL(blob);
          });
        }
      }).forResource({
        resourceId: resourceId, resourceType: 'litlab-script', lane: lane, persistencePolicy: 'none',
        adapter: {
          enumerate: function (value) { return value.lines; },
          spokenText: function (line) { return line.text; },
          fields: function (line) { return { segmentId: line.id, storageKey: {
            identityVersion: 4, adapterId: 'alloflow.litlab.read-aloud', adapterVersion: 1,
            scopeId: resourceId, segmentId: line.id, spokenText: line.text
          } }; }
        }
      });
      narrationRef.current = { service: service, store: lane, profiles: profiles };
      return service;
    }
    function narrationPayload() {
      var service = getNarration();
      return service ? service.serialize() : narrationPayloadRef.current;
    }
    var narrationSummary = { total: script ? script.lines.length : 0, ready: 0, stale: 0 };
    try { var currentNarration = getNarration(); if (currentNarration) narrationSummary = currentNarration.summary(); } catch (_) {}
    React.useEffect(function () {
      return function () { releaseNarration(); };
    }, []);
    React.useEffect(function () {
      cancelPreparation();
      return function () { if (preparationRef.current) preparationRef.current.abort(); };
    }, [script, storyLanguage, phase]);

    // A cancelled request must never start audio after Stop, navigation, or close.
    var cancelSpeech = useCallback(function () {
      speechEpochRef.current++;
      if (speechAbortRef.current) speechAbortRef.current.abort();
      speechAbortRef.current = null;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (speechFinishRef.current) speechFinishRef.current();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []);

    var speakLine = useCallback(function (text, voice, speed, lineId) {
      cancelSpeech();
      var controller = new AbortController();
      speechAbortRef.current = controller;
      var epoch = speechEpochRef.current;
      return new Promise(function (resolve) {
        var done = false;
        function finish() {
          if (done) return;
          done = true;
          if (speechFinishRef.current === finish) speechFinishRef.current = null;
          resolve();
        }
        speechFinishRef.current = finish;
        function active() { return !done && epoch === speechEpochRef.current; }
        function fallback() {
          if (!active()) return;
          if (isNarrationMuted()) { finish(); return; }
          if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { finish(); return; }
          try {
            var utterance = new window.SpeechSynthesisUtterance(text);
            utterance.rate = speed || playbackSpeed;
            var language = narrationLiveRef.current.language;
            utterance.lang = ({ English: 'en', Spanish: 'es', French: 'fr', German: 'de', Portuguese: 'pt', Italian: 'it', Arabic: 'ar', Chinese: 'zh', Japanese: 'ja', Korean: 'ko', Hindi: 'hi' })[language] || language;
            utterance.onend = finish;
            utterance.onerror = finish;
            window.speechSynthesis.speak(utterance);
          } catch (_) { finish(); }
        }
        if (!text || !text.trim() || isNarrationMuted()) { finish(); return; }
        Promise.resolve().then(async function () {
          if (!active()) return null;
          var service = lineId ? getNarration() : null;
          if (service) {
            var inspection = service.inspect(lineId);
            if (inspection.status === 'ready') return inspection.url;
            if (!onCallTTS) return null;
            var profile = inspection.profile;
            var url = await service.resolve(lineId, { signal: controller.signal, profile: profile });
            if (!active()) return null;
            try {
              await service.capturePlayed(lineId, { url: url, provenance: narrationRef.current.profiles.get(lineId) || {} }, { signal: controller.signal, profile: profile });
              if (active()) { setNarrationDirty(true); refreshNarration(function (n) { return n + 1; }); }
            } catch (error) {
              if (active()) setNarrationNotice(tr('This line can play, but its audio could not be retained. Try preparing narration again.'));
            }
            return url;
          }
          if (onCallTTS) return onCallTTS(text, voice || selectedVoice || 'Kore', 1, { language: narrationLiveRef.current.language, signal: controller.signal, maxRetries: 1 });
          return null;
        }).then(function (url) {
          if (!active()) return;
          if (isNarrationMuted()) { finish(); return; }
          if (!url) { fallback(); return; }
          var audio = new Audio(url);
          audioRef.current = audio;
          audio.playbackRate = speed || playbackSpeed;
          function ended() { if (audioRef.current === audio) audioRef.current = null; finish(); }
          audio.onended = ended;
          audio.onerror = ended;
          Promise.resolve(audio.play()).catch(ended);
        }).catch(fallback);
      });
    }, [onCallTTS, selectedVoice, playbackSpeed, cancelSpeech]);

    var stopPlayback = useCallback(function () {
      playbackEpochRef.current++;
      playingRef.current = false;
      pausedRef.current = false;
      cancelSpeech();
      setIsPlaying(false);
      setIsPaused(false);
      announceLitLab(tr('Playback stopped.'));
    }, [cancelSpeech]);

    var playFromLine = useCallback(async function (startIdx) {
      if (isNarrationMuted()) { setNarrationNotice(tr('Unmute audio before playing narration.')); return; }
      if (!script || !script.lines.length) return;
      stopPlayback();
      var epoch = playbackEpochRef.current;
      function active() { return epoch === playbackEpochRef.current && playingRef.current; }
      playingRef.current = true;
      setIsPlaying(true);
      for (var i = startIdx; i < script.lines.length; i++) {
        while (pausedRef.current && active()) await new Promise(function (r) { setTimeout(r, 100); });
        if (!active()) return;
        if (isNarrationMuted()) { stopPlayback(); return; }
        setCurrentLine(i);
        setCurrentPage(Math.floor(i / LINES_PER_PAGE));
        var line = script.lines[i];
        var character = script.characters.find(function (c) { return c.id === line.speaker; });
        if (myRole && line.speaker === myRole) {
          await speakLine('Your turn, ' + (character ? character.name : 'you') + '.', 'Aoede', playbackSpeed);
          if (!active()) return;
          await new Promise(function (r) { setTimeout(r, 3000); });
        } else {
          if (line.type === 'dialogue' && character && character.id !== 'narrator') {
            await speakLine(character.name + ' says:', 'Aoede', playbackSpeed * 1.2);
            if (!active()) return;
            await new Promise(function (r) { setTimeout(r, 150); });
          }
          if (!active()) return;
          await speakLine(line.text, character ? character.voice : 'Aoede', line.type === 'stage-direction' ? playbackSpeed * 0.9 : playbackSpeed, line.id);
        }
        if (!active()) return;
        if (i < script.lines.length - 1) await new Promise(function (r) { setTimeout(r, 300); });
      }
      if (!active()) return;
      if (isNarrationMuted()) { stopPlayback(); return; }
      playingRef.current = false;
      pausedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      announceLitLab(tr('Performance complete.'));
      if (handleScoreUpdate) handleScoreUpdate(20, 'LitLab Performance', 'storystage-perform-' + (script.title || 'untitled'));
    }, [script, speakLine, playbackSpeed, myRole, handleScoreUpdate, stopPlayback]);

    var pausePlayback = useCallback(function () {
      pausedRef.current = true;
      setIsPaused(true);
      announceLitLab(tr('Paused. Will hold after current line finishes.'));
    }, []);
    var resumePlayback = useCallback(function () {
      pausedRef.current = false;
      setIsPaused(false);
      announceLitLab(tr('Resumed.'));
    }, []);

    React.useEffect(function () {
      setIsPlaying(false); setIsPaused(false); setPreviewingVoice(null);
      return function () {
        playbackEpochRef.current++;
        playingRef.current = false; pausedRef.current = false;
        cancelSpeech();
      };
    }, [phase, script, storyLanguage, cancelSpeech]);
    React.useEffect(function () {
      if (!isPlaying || !lineContainerRef.current) return;
      var line = lineContainerRef.current.querySelector('#ss-line-' + currentLine);
      if (line && typeof line.scrollIntoView === 'function') line.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }, [currentLine, currentPage, isPlaying]);

    function beginScript(nextScript) {
      releaseNarration(); setPreparing(false); setNarrationDirty(false); setNarrationNotice('');
      narrationPayloadRef.current = null; narrationResourceIdRef.current = uid();
      activeSavedIdRef.current = null; setSaveMessage(''); setSaveError(false);
      storyEpochRef.current++;
      feedbackEpochRef.current++; planEpochRef.current++;
      setFeedbackNotice(''); setCompletedTasks({}); setGenerationDraft(''); setGenerationError(''); setIsLoading(false);
      stopPlayback();
      // A new text starts a new performance; unrelated responses and images must not carry over.
      setScript(nextScript); setCurrentPage(0); setCurrentLine(0); setMyRole(null);
      setPageImages({}); setPageImgLoading({}); setSceneImage(null); setSceneImageLoading(false);
      setEmotionLog({}); setAnalysisResponses({}); setAnalysisFeedback(null);
      setSelfAssessment({}); setSelfAssessmentSubmitted(false); setRevisionPlan(null); setRevisionPlanLoading(false); setSelectedStandard('');
      recordingEpochRef.current++;
      var recorder = mediaRecorderRef.current;
      if (recorder) { try { if (typeof recorder.cancel === 'function') recorder.cancel(); else if (typeof recorder.stop === 'function' && recorder.state !== 'inactive') recorder.stop(); } catch (_) {} }
      if (recordingStreamRef.current) recordingStreamRef.current.getTracks().forEach(function (track) { track.stop(); });
      recordingStreamRef.current = null; mediaRecorderRef.current = null; setIsRecording(false);
      if (recordingUrlRef.current && recordingUrlRef.current.indexOf('blob:') === 0) URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null; setRecordingUrl(null); setRecordedChunks([]);
    }

    // ── Save/Load Scripts ──
    var saveScript = useCallback(function () {
      if (!script) return;
      var entry = {
        narrationResourceId: narrationResourceIdRef.current, karaokeAudio: narrationPayload(), storyLanguage: storyLanguage,
        id: activeSavedIdRef.current || uid(), title: storyTitle, script: script, sourceText: sourceText, savedAt: new Date().toISOString(),
        progressVersion: 1,
        progress: { playbackSpeed: playbackSpeed, phase: phase, currentLine: currentLine, currentPage: currentPage, myRole: myRole, performerName: performerName,
          analysisResponses: analysisResponses, analysisFeedback: analysisFeedback && typeof analysisFeedback === 'object' && !analysisFeedback.error ? analysisFeedback : null,
          selfAssessment: selfAssessment, selfAssessmentSubmitted: selfAssessmentSubmitted, emotionLog: emotionLog, selectedStandard: selectedStandard,
          revisionPlan: revisionPlan && !revisionPlan.error ? revisionPlan : null, completedTasks: completedTasks, sceneImage: sceneImage, pageImages: pageImages }
      };
      var latest = load(STORAGE_SCRIPTS, savedScripts);
      var updated = [entry].concat((Array.isArray(latest) ? latest : savedScripts).filter(function (item) { return item && item.id !== entry.id; }).slice(0, 19));
      if (!store(STORAGE_SCRIPTS, updated)) {
        reportSave(tr('Could not save this script. Device storage may be full. Your work and narration are still open; your previous save is unchanged.'), true); return false;
      }
      activeSavedIdRef.current = entry.id; setSavedScripts(updated);
      setNarrationDirty(false);
      reportSave(tr('Progress saved on this device.'), false);
      return true;
    }, [script, storyLanguage, playbackSpeed, storyTitle, sourceText, savedScripts, phase, currentLine, currentPage, myRole, performerName, analysisResponses, analysisFeedback, selfAssessment, selfAssessmentSubmitted, emotionLog, selectedStandard, revisionPlan, completedTasks, sceneImage, pageImages, addToast]);

    var loadScript = useCallback(function (entry) {
      try {
        var restored = normalizeLitLabScript(entry.script);
        beginScript(restored);
        narrationPayloadRef.current = entry.karaokeAudio || null;
        narrationResourceIdRef.current = entry.narrationResourceId || entry.id || uid();
        setStoryLanguage(typeof entry.storyLanguage === 'string' && entry.storyLanguage.trim() ? entry.storyLanguage : 'English');
        activeSavedIdRef.current = typeof entry.id === 'string' ? entry.id : null;
        setStoryTitle(typeof entry.title === 'string' ? entry.title : restored.title);
        setSourceText(typeof entry.sourceText === 'string' ? entry.sourceText : '');
        var progress = entry.progressVersion === 1 && entry.progress && typeof entry.progress === 'object' ? entry.progress : null;
        setPlaybackSpeed(progress && [0.75, 1, 1.25, 1.5].indexOf(progress.playbackSpeed) !== -1 ? progress.playbackSpeed : 1);
        if (!progress) { setPhase('assign'); return; }
        function strings(value) {
          var out = Object.create(null);
          if (value && typeof value === 'object' && !Array.isArray(value)) Object.keys(value).forEach(function (key) { if (typeof value[key] === 'string') out[key] = value[key]; });
          return out;
        }
        setAnalysisResponses(strings(progress.analysisResponses));
        var reactions = strings(progress.emotionLog);
        Object.keys(reactions).forEach(function (key) { if (EMOTIONS.indexOf(reactions[key]) === -1 || !restored.lines.some(function (line) { return line.id === key; })) delete reactions[key]; });
        setEmotionLog(reactions);
        var ratings = {};
        LITLAB_RUBRIC.forEach(function (criterion) { var rating = progress.selfAssessment && progress.selfAssessment[criterion.id]; if (Number.isInteger(rating) && rating >= 1 && rating <= 5) ratings[criterion.id] = rating; });
        setSelfAssessment(ratings); setSelfAssessmentSubmitted(progress.selfAssessmentSubmitted === true);
        setSelectedStandard(typeof progress.selectedStandard === 'string' ? progress.selectedStandard : '');
        if (typeof progress.performerName === 'string') setPerformerName(progress.performerName);
        setMyRole(restored.characters.some(function (character) { return character.id === progress.myRole; }) ? progress.myRole : null);
        setCurrentLine(Number.isInteger(progress.currentLine) ? Math.max(0, Math.min(restored.lines.length - 1, progress.currentLine)) : 0);
        setCurrentPage(Number.isInteger(progress.currentPage) ? Math.max(0, Math.min(Math.ceil(restored.lines.length / LINES_PER_PAGE) - 1, progress.currentPage)) : 0);
        if (typeof progress.sceneImage === 'string') setSceneImage(progress.sceneImage);
        setPageImages(strings(progress.pageImages));
        try { if (progress.analysisFeedback) setAnalysisFeedback(normalizeLitLabFeedback(progress.analysisFeedback)); } catch (_) {}
        try {
          if (progress.revisionPlan) {
            var plan = normalizeLitLabPlan(progress.revisionPlan); setRevisionPlan(plan);
            var complete = {}; plan.tasks.forEach(function (_, index) { complete[index] = !!(progress.completedTasks && progress.completedTasks[index] === true); }); setCompletedTasks(complete);
          }
        } catch (_) {}
        setPhase(['assign', 'perform', 'analyze'].indexOf(progress.phase) !== -1 ? progress.phase : 'assign');
        setSaveMessage(tr('Saved progress restored.')); setSaveError(false);
      } catch (_) { reportSave(tr('This saved script could not be opened. Try another script or create it again from your source text.'), true); }
    }, [stopPlayback, addToast]);

    async function prepareNarration() {
      if (preparationRef.current || !script) return;
      stopPlayback();
      var service;
      try { service = getNarration(); } catch (_) {}
      if (!service) { setNarrationNotice(tr('Narration tools are still loading. Try again in a moment.')); return; }
      if (isNarrationMuted()) { setNarrationNotice(tr('Unmute audio before preparing narration.')); return; }
      var controller = new AbortController();
      preparationRef.current = controller; setPreparing(true);
      try {
        var result = await service.prepareAll({ signal: controller.signal, onProgress: function (progress) {
          if (preparationRef.current !== controller || controller.signal.aborted) return;
          setNarrationNotice(tr('Preparing narration: {done} of {total} lines checked.', { done: progress.completed, total: progress.total }));
          if (progress.prepared) setNarrationDirty(true);
          refreshNarration(function (n) { return n + 1; });
        } });
        if (controller.signal.aborted || preparationRef.current !== controller) return;
        var saved = saveScript();
        setNarrationNotice(result.failed
          ? tr('{count} lines could not be prepared. Try again to retry only missing or outdated lines.', { count: result.failed })
          : saved ? tr('Narration saved with this script on this device.') : tr('Narration is ready but could not be saved. Keep this window open and try Save progress again.'));
      } catch (error) {
        if (preparationRef.current === controller) setNarrationNotice(tr('Narration preparation stopped. Save progress to keep completed clips; prepare again to continue.'));
      } finally {
        if (preparationRef.current === controller) { preparationRef.current = null; setPreparing(false); refreshNarration(function (n) { return n + 1; }); }
      }
    }

    // ── Resource-history hooks (mirror StoryForge / PoetTree) ──
    // saveAsAssignment: teacher captures source text + title + focus prompt into a
    // 'litlab-config' resource so students can load it pre-populated.
    var saveAsAssignment = useCallback(async function () {
      if (!onSaveConfig || saveInFlightRef.current) return;
      saveInFlightRef.current = true; setSaving(true); setSaveMessage('');
      var config = {
        storyTitle: storyTitle,
        sourceText: sourceText,
        teacherPrompt: teacherPrompt,
        gradeLevel: gradeLevel,
        inputMode: inputMode,
        genPrompt: genPrompt,
        genCharCount: genCharCount,
        customWordCount: customWordCount,
        genGenre: genGenre,
        genLength: genLength,
        genGradeLevel: genGradeLevel,
        savedAt: new Date().toISOString()
      };
      try {
        var result = await onSaveConfig(config);
        if (result === false || (result && result.ok === false)) throw new Error('Save failed');
        reportSave(tr('LitLab assignment saved!'), false);
      } catch (_) { reportSave(tr('The assignment could not be saved. Your setup is still here; try again.'), true); }
      finally { saveInFlightRef.current = false; setSaving(false); }
    }, [onSaveConfig, storyTitle, sourceText, teacherPrompt, gradeLevel, inputMode, genGenre, genLength, genGradeLevel, genPrompt, genCharCount, customWordCount, addToast]);

    // saveSubmissionToPortfolio: student saves their performed/analyzed work as a
    // 'litlab-submission' resource for portfolio review.
    var saveSubmissionToPortfolio = useCallback(async function () {
      if (!onSaveSubmission || saveInFlightRef.current) return;
      if (!script) { addToast && addToast(tr('Generate or load a script first!'), 'info'); return; }
      saveInFlightRef.current = true; setSaving(true); setSaveMessage('');
      var submission = {
        analysisResponses: Object.assign({}, analysisResponses),
        selfAssessment: Object.assign({}, selfAssessment),
        selectedStandard: selectedStandard,
        revisionPlan: revisionPlan && !revisionPlan.error ? revisionPlan : null,
        completedTasks: Object.assign({}, completedTasks),
        storyTitle: storyTitle || (script && script.title) || 'My Performance',
        scriptTitle: script.title || '',
        characterCount: (script.characters || []).length,
        lineCount: (script.lines || []).length,
        characters: (script.characters || []).map(function (c) { return { name: c.name, voice: c.voice, color: c.color }; }),
        analysisFeedback: analysisFeedback && typeof analysisFeedback === 'object' && !analysisFeedback.error ? analysisFeedback : null,
        myRole: myRole,
        author: performerName || studentNickname || 'Student',
        gradeLevel: gradeLevel,
        savedAt: new Date().toISOString()
      };
      try {
        var submitted = await onSaveSubmission(submission);
        if (submitted === false || (submitted && submitted.ok === false)) throw new Error('Save failed');
      } catch (_) {
        reportSave(tr('Your performance could not be saved. Your work is still here; try again.'), true);
        saveInFlightRef.current = false; setSaving(false); return;
      }
      try {
        var ts = Date.now();
        var createdAt = new Date(ts).toISOString();
        var performanceItems = (script.lines || []).map(function (line, idx) {
          return {
            id: line.id || ('line-' + idx),
            title: (line.character || line.speaker || 'Line') + ' ' + (idx + 1),
            text: line.text || line.line || '',
            toolLabel: 'Story Stage',
            privacy: 'full'
          };
        }).filter(function (item) { return item.text; });
        var artifact = {
          id: 'story-stage-' + ts,
          type: 'story-stage-submission',
          source: 'story-stage',
          sourceLabel: 'Story Stage',
          kindLabel: 'Performance',
          title: submission.storyTitle || 'My Performance',
          summary: 'Student-controlled performance with ' + submission.characterCount + ' characters and ' + submission.lineCount + ' lines',
          privacy: 'student-controlled',
          privacySummary: 'Student-controlled. Performance script text is saved on this device for the AlloHaven Portfolio.',
          sourceSummary: 'Saved from Story Stage',
          lifecycleStatus: 'saved',
          version: 1,
          createdAt: createdAt,
          updatedAt: createdAt,
          itemCount: performanceItems.length,
          items: performanceItems,
          artifact: submission
        };
        var artifactStore = window.AlloModules && window.AlloModules.StudentArtifactStore;
        if (artifactStore && typeof artifactStore.save === 'function') {
          var savedArtifact = await artifactStore.save(artifact, { source: 'story-stage', limit: 80 });
          if (savedArtifact === false || (savedArtifact && savedArtifact.ok === false)) throw new Error('Portfolio save failed');
          // The legacy store returns its in-memory array even when a localStorage write fails.
          if (Array.isArray(savedArtifact)) {
            var persistedArtifacts = load('alloflow_student_artifacts', []);
            if (!Array.isArray(persistedArtifacts) || !persistedArtifacts.some(function (item) { return item && item.id === artifact.id; })) throw new Error('Portfolio copy did not persist');
          }
        } else {
          var existing = [];
          if (Array.isArray(window.__alloflowStudentArtifacts)) existing = window.__alloflowStudentArtifacts;
          else { try { existing = JSON.parse(localStorage.getItem('alloflow_student_artifacts') || '[]'); } catch (e) { existing = []; } }
          var next = [artifact].concat(Array.isArray(existing) ? existing : []).slice(0, 80);
          localStorage.setItem('alloflow_student_artifacts', JSON.stringify(next));
          window.__alloflowStudentArtifacts = next;
          window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', {
            detail: { source: 'story-stage', sourceLabel: 'Story Stage', kindLabel: 'Performance', privacy: 'student-controlled', title: artifact.title, action: 'saved', artifact: artifact, count: next.length }
          }));
        }
        reportSave(tr('Performance and reflections saved to My Resources and AlloHaven Portfolio.'), false);
      } catch (_) { reportSave(tr('Saved to My Resources, but the AlloHaven copy could not be saved on this device.'), true); }
      finally { saveInFlightRef.current = false; setSaving(false); }
    }, [onSaveSubmission, script, storyTitle, analysisResponses, analysisFeedback, selfAssessment, selectedStandard, revisionPlan, completedTasks, myRole, performerName, studentNickname, gradeLevel, addToast]);

    // ── Generate Character Portraits ──
    var generatePortrait = useCallback(async function (charId) {
      var storyEpoch = storyEpochRef.current;
      if (!onCallImagen || !script) return;
      var ch = script.characters.find(function (c) { return c.id === charId; });
      if (!ch) return;
      try {
        var prompt = 'Character portrait illustration: ' + ch.name + ' — ' + ch.description + '. '
          + 'Style: warm, expressive, children\'s book illustration. Circular frame. White background. STRICTLY NO TEXT.';
        var url = await onCallImagen(prompt, 256, 0.85);
        if (storyEpoch !== storyEpochRef.current) return;
        if (url) {
          setScript(function (current) {
            if (!current || storyEpoch !== storyEpochRef.current) return current;
            return Object.assign({}, current, { characters: current.characters.map(function (c) { return c.id === charId ? Object.assign({}, c, { portrait: url }) : c; }) });
          });
        }
      } catch (err) { if (storyEpoch !== storyEpochRef.current) return; warnLog('Portrait gen failed:', err.message); }
    }, [onCallImagen, script]);

    // ── Literary Analysis Feedback ──
    var getAnalysisFeedback = useCallback(async function () {
      var storyEpoch = storyEpochRef.current;
      if (!onCallGemini || !script || analysisFeedback === 'loading' || !Object.values(analysisResponses).some(function (value) { return value.trim(); })) return;
      var feedbackEpoch = ++feedbackEpochRef.current;
      setFeedbackNotice(''); invalidatePlan();
      setAnalysisFeedback('loading');
      try {
        var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
        var isMid = /6th|7th|8th/i.test(gradeLevel);
        var respSummary = Object.entries(analysisResponses).map(function (pair) { return pair[0] + ': "' + pair[1] + '"'; }).join('\n');
        var gradeGuide = isElem
          ? 'Elementary: Praise any character or story observations. Use simple language. "exemplary" = identifies a character trait with a reason from the story.'
          : isMid
          ? 'Middle School: Expect character analysis with text evidence. Push toward theme identification. Use clear academic language.'
          : 'High School: Expect analysis of literary devices, theme development, character arc, and author\'s craft. Push toward sophisticated interpretation.';
        var emotionSummary = Object.keys(emotionLog).length > 0
          ? '\nStudent\'s emotional reactions during performance: ' + Object.entries(emotionLog).filter(function (p) { return p[1]; }).map(function (p) { var line = script.lines.find(function (l) { return l.id === p[0]; }); return p[1] + ' at "' + (line ? line.text.substring(0, 30) : '') + '..."'; }).join(', ')
          : '';
        var standardFocus = selectedStandard ? '\nFocused standard: ' + selectedStandard + '. Evaluate their analysis specifically against this standard.' : '';
        var prompt = 'You are a warm, encouraging ELA teacher providing feedback on a ' + gradeLevel + ' student\'s literary analysis of "' + storyTitle + '".\n\n'
          + 'Story characters: ' + script.characters.filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (c) { return c.name + ' (' + c.description + ')'; }).join(', ') + '\n'
          + 'Theme: ' + (script.theme || 'not specified') + '\n'
          + 'Literary elements: ' + (script.literaryElements || []).join(', ') + '\n'
          + emotionSummary + standardFocus + '\n\n'
          + 'Story script (use this text to check events and quoted evidence):\n' + script.lines.map(function (line, index) { return (index + 1) + '. [' + line.speaker + '] ' + line.text; }).join('\n') + '\n\n'
          + 'Student responses:\n' + respSummary + '\n\n'
          + 'Grade expectations: ' + gradeGuide + '\n\n'
          + 'Return JSON: {"overallRating":"developing|proficient|exemplary","strengths":["1-2 things done well"],"nudges":["1-2 guiding questions"],"characterInsight":"feedback on character understanding","themeInsight":"feedback on theme analysis","craftInsight":"feedback on literary craft awareness"}\n\n'
          + 'Score according to ' + gradeLevel + ' expectations. Match vocabulary to their level.';
        var result = await onCallGemini(prompt, true);
        if (storyEpoch !== storyEpochRef.current || feedbackEpoch !== feedbackEpochRef.current) return;
        var parsed = normalizeLitLabFeedback(JSON.parse(cleanJson(result)));
        setAnalysisFeedback(parsed);
        if (handleScoreUpdate) {
          var xp = parsed.overallRating === 'exemplary' ? 30 : parsed.overallRating === 'proficient' ? 20 : 10;
          handleScoreUpdate(xp, 'LitLab Literary Analysis', 'storystage-analysis-' + (script.title || 'untitled'));
        }
        addToast && addToast(tr('Feedback received!'), 'success');
      } catch (err) { if (storyEpoch !== storyEpochRef.current || feedbackEpoch !== feedbackEpochRef.current) return;
        setAnalysisFeedback({ error: tr('Feedback was incomplete or unavailable. Try again; your responses are still here.') });
        addToast && addToast('Feedback failed: ' + err.message, 'error');
      }
    }, [onCallGemini, script, storyTitle, gradeLevel, analysisResponses, emotionLog, selectedStandard, analysisFeedback, handleScoreUpdate, addToast]);

    // ── LitLab metacognitive rubric (5 criteria, performance + analysis hybrid) ──
    var LITLAB_RUBRIC = [
      { id: 'character',   label: 'Character',       desc: tr('How well I described the characters and supported it with the story') },
      { id: 'theme',       label: 'Theme',           desc: tr('How clearly I named a theme and connected it to events in the story') },
      { id: 'craft',       label: "Author's Craft",  desc: 'How specifically I noticed an author choice (figurative language, pacing, dialogue)' },
      { id: 'performance', label: 'Performance',     desc: tr('How expressively I read aloud — vocal variety, pacing, emotion') },
      { id: 'reflection',  label: 'Connection',      desc: tr('How I connected the story to myself, another book, or the world') }
    ];

    // True when the student has at least 2 helper outputs available to synthesize.
    function _helpersAvailableForLitLabPlan() {
      var n = 0;
      if (analysisFeedback && typeof analysisFeedback === 'object' && !analysisFeedback.error) n++;
      if (selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0) n++;
      if (Object.values(emotionLog || {}).filter(function (v) { return v; }).length >= 3) n++;
      if (selectedStandard) n++;
      return n >= 2;
    }

    // ── Revision Plan synthesizer ──
    // Pulls together analysisFeedback + self-rating + emotion log into one
    // prioritized 3-task plan. Pedagogical aim: synthesis as a meta-skill —
    // the student weaves multiple feedback streams into a coherent next step
    // for re-reading, re-performing, or revising their analysis responses.
    var synthesizeRevisionPlan = useCallback(async function () {
      var storyEpoch = storyEpochRef.current;
      if (!onCallGemini || !script || revisionPlanLoading || !_helpersAvailableForLitLabPlan()) return;
      var planEpoch = ++planEpochRef.current;
      setCompletedTasks({});
      setRevisionPlanLoading(true);
      try {
        var helperContext = [];
        if (analysisFeedback && typeof analysisFeedback === 'object' && !analysisFeedback.error) {
          var fb = '';
          if (analysisFeedback.overallRating) fb += '  rating: ' + analysisFeedback.overallRating + '\n';
          if (analysisFeedback.strengths && analysisFeedback.strengths.length) fb += '  strengths: ' + analysisFeedback.strengths.slice(0, 2).join(' | ') + '\n';
          if (analysisFeedback.nudges && analysisFeedback.nudges.length) fb += '  nudges: ' + analysisFeedback.nudges.slice(0, 2).join(' | ') + '\n';
          if (analysisFeedback.characterInsight) fb += '  character: ' + analysisFeedback.characterInsight + '\n';
          if (analysisFeedback.themeInsight) fb += '  theme: ' + analysisFeedback.themeInsight + '\n';
          if (analysisFeedback.craftInsight) fb += '  craft: ' + analysisFeedback.craftInsight;
          if (fb) helperContext.push('AI ANALYSIS FEEDBACK:\n' + fb);
        }
        if (selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0) {
          var lowest = Object.keys(selfAssessment).map(function (k) { return [k, selfAssessment[k]]; })
            .sort(function (a, b) { return a[1] - b[1]; }).slice(0, 2);
          helperContext.push('STUDENT SELF-ASSESSMENT (lowest ratings):\n' + lowest.map(function (pair) {
            var crit = LITLAB_RUBRIC.find(function (c) { return c.id === pair[0]; });
            return '  - ' + (crit ? crit.label : pair[0]) + ': ' + pair[1] + '/5';
          }).join('\n'));
        }
        var reactedLines = Object.keys(emotionLog || {}).filter(function (k) { return emotionLog[k]; });
        if (reactedLines.length >= 3) {
          var samples = reactedLines.slice(0, 5).map(function (lid) {
            var line = (script.lines || []).find(function (l) { return l.id === lid; });
            return '  - ' + emotionLog[lid] + ' at "' + (line ? line.text.substring(0, 40) : '?') + '..."';
          }).join('\n');
          helperContext.push('EMOTION LOG (' + reactedLines.length + ' reactions during performance):\n' + samples);
        }
        if (selectedStandard) {
          helperContext.push('FOCUS STANDARD: ' + selectedStandard);
        }
        var helpersBlock = helperContext.length > 0
          ? '\n\nWhat the student already has:\n' + helperContext.join('\n\n')
          : '';

        var prompt = 'You are a kind, specific ELA teacher helping a ' + gradeLevel + ' student plan their next pass at "' + (script.title || storyTitle || 'this text') + '".\n\n'
          + 'Story characters: ' + (script.characters || []).filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (c) { return c.name; }).join(', ') + '\n'
          + 'Theme: ' + (script.theme || 'not specified') + '\n'
          + 'Literary elements: ' + ((script.literaryElements || []).join(', ') || 'none flagged') + helpersBlock + '\n\n'
          + 'Build a prioritized revision plan with EXACTLY 3 tasks. Each task should:\n'
          + '- Be small enough to do in a single re-read or re-performance.\n'
          + '- Be specific (name a character, line, scene, or specific analysis question to revisit).\n'
          + '- Pull from the helper outputs above when relevant — synthesize across them, don\'t repeat verbatim.\n'
          + '- Be ranked by impact (most-impactful first).\n'
          + '- Mix performance tasks (re-read this scene with a different voice for X) with analysis tasks (return to the theme question and try again with text evidence).\n'
          + '- Include a one-sentence "why" so the student understands the craft / comprehension reason.\n\n'
          + 'Tone: warm, concrete, never scolding. Treat the student as a capable reader-performer who\'s iterating.\n\n'
          + 'Return ONLY JSON:\n'
          + '{\n'
          + '  "tasks": [\n'
          + '    { "title": "<short imperative title>", "detail": "<one or two specific sentences on what to do>", "why": "<one short sentence on the craft / comprehension reason>", "source": "<which helper this builds on, or \\"overall\\">" }\n'
          + '  ],\n'
          + '  "encouragement": "<one short specific compliment on something the student is already doing well>"\n'
          + '}';
        var result = await onCallGemini(prompt, true);
        if (storyEpoch !== storyEpochRef.current || planEpoch !== planEpochRef.current) return;
        var parsed = normalizeLitLabPlan(JSON.parse(cleanJson(result)));
        setRevisionPlan(parsed);
      } catch (err) { if (storyEpoch !== storyEpochRef.current || planEpoch !== planEpochRef.current) return;
        warnLog('Revision plan synthesis failed:', err && err.message);
        setRevisionPlan({ error: "Couldn't build a revision plan right now. Try again in a moment." });
      } finally {
        if (storyEpoch === storyEpochRef.current && planEpoch === planEpochRef.current) setRevisionPlanLoading(false);
      }
    }, [onCallGemini, script, storyTitle, gradeLevel, analysisFeedback, selfAssessment, selfAssessmentSubmitted, emotionLog, selectedStandard, revisionPlanLoading]);

    // ── Scene Illustration ──
    var generateSceneImage = useCallback(async function () {
      var storyEpoch = storyEpochRef.current;
      if (!onCallImagen || !script) return;
      setSceneImageLoading(true);
      try {
        var prompt = 'Illustration for a story scene: ' + (script.setting || storyTitle || 'a fictional setting') + '. '
          + 'Style: warm, colorful, children\'s book illustration. Wide landscape composition. Rich detail. STRICTLY NO TEXT.';
        var url = await onCallImagen(prompt, 600, 0.85);
        if (storyEpoch !== storyEpochRef.current) return;
        if (url) setSceneImage(url);
      } catch (err) { if (storyEpoch !== storyEpochRef.current) return; warnLog('Scene image failed:', err.message); }
      setSceneImageLoading(false);
    }, [onCallImagen, script, storyTitle]);

    // ── Page helpers ──
    var getPages = function () {
      if (!script || !script.lines) return [];
      var pages = [];
      for (var i = 0; i < script.lines.length; i += LINES_PER_PAGE) {
        pages.push(script.lines.slice(i, i + LINES_PER_PAGE));
      }
      return pages;
    };
    var pages = script ? getPages() : [];
    var totalPages = pages.length;

    // ── Refine an existing image with a user-provided instruction (uses Gemini image-edit) ──
    var refineImage = useCallback(async function (currentSrc, instruction, sizePx) {
      if (!onCallGeminiImageEdit || !currentSrc || !instruction) return null;
      try {
        // Strip data: prefix if present (matches the pattern used across other modules).
        var base64 = String(currentSrc).indexOf(',') !== -1 ? currentSrc.split(',')[1] : currentSrc;
        var prompt = 'Edit this storybook illustration. Instruction: ' + instruction + '. Maintain the original style and composition. STRICTLY NO TEXT or words in the image.';
        var refined = await onCallGeminiImageEdit(prompt, base64, sizePx || 600, 0.85);
        return refined || null;
      } catch (err) { warnLog('Image refine failed:', err && err.message); return null; }
    }, [onCallGeminiImageEdit]);

    var refineSceneImage = useCallback(async function (instruction) {
      var storyEpoch = storyEpochRef.current;
      if (!sceneImage || !instruction || !instruction.trim()) return;
      setSceneImageLoading(true);
      announceLitLab(tr('Refining cover image…'));
      try {
        var refined = await refineImage(sceneImage, instruction.trim(), 600);
        if (storyEpoch !== storyEpochRef.current) return;
        if (refined) { setSceneImage(refined); addToast && addToast(tr('Cover refined.'), 'success'); announceLitLab(tr('Cover image refined.')); }
        else { addToast && addToast(tr('Refine failed.'), 'error'); }
      } finally { if (storyEpoch === storyEpochRef.current) setSceneImageLoading(false); }
    }, [sceneImage, refineImage, addToast]);

    var refinePageImage = useCallback(async function (pageIdx, instruction) {
      var storyEpoch = storyEpochRef.current;
      var current = pageImages[pageIdx];
      if (!current || !instruction || !instruction.trim()) return;
      setPageImgLoading(function (prev) { var n = Object.assign({}, prev); n[pageIdx] = true; return n; });
      announceLitLab(tr('Refining page {page} illustration…', { page: pageIdx + 1 }));
      try {
        var refined = await refineImage(current, instruction.trim(), 600);
        if (storyEpoch !== storyEpochRef.current) return;
        if (refined) {
          setPageImages(function (prev) { var n = Object.assign({}, prev); n[pageIdx] = refined; return n; });
          addToast && addToast(tr('Page ') + (pageIdx + 1) + ' refined.', 'success');
          announceLitLab(tr('Page ') + (pageIdx + 1) + ' illustration refined.');
        } else { addToast && addToast(tr('Refine failed.'), 'error'); }
      } finally { if (storyEpoch === storyEpochRef.current) setPageImgLoading(function (prev) { var n = Object.assign({}, prev); n[pageIdx] = false; return n; }); }
    }, [pageImages, refineImage, addToast]);

    var importStoryUrl = useCallback(async function (url) {
      if (!url || !url.trim()) return;
      setIsLoading(true); setLoadingMsg(tr('Fetching from URL...'));
      try {
        var text = await window.__alloUtils.fetchAndCleanUrl(url.trim(), onCallGemini, addToast);
        if (text) {
          setSourceText(function (prev) { return prev ? prev + '\n\n' + text : text; });
          addToast && addToast(tr('Text imported from URL!'), 'success');
          announceLitLab(tr('Text imported from URL.'));
        }
      } catch (err) {
        addToast && addToast(tr('Import failed: ') + err.message, 'error');
        announceLitLab(tr('URL import failed.'));
      } finally {
        setIsLoading(false); setLoadingMsg('');
      }
    }, [onCallGemini, addToast]);

    function requestSceneImageRefinement(event) {
      setPromptRequest({
        key: uid(),
        kind: 'refine-scene',
        returnFocus: event.currentTarget,
        title: tr('Refine cover image'),
        label: tr('How should the cover image change?'),
        description: tr('Describe the visual changes you want. The existing style and composition will be preserved.'),
        examples: tr('Examples:\n• Make it more colorful\n• Show more detail in the trees\n• Use a moodier palette\n• Add a moon in the sky'),
        placeholder: tr('Example: Add a moon in the sky'),
        submitLabel: tr('Refine cover'),
        requiredMessage: tr('Describe how the cover image should change.')
      });
    }

    function requestPageImageRefinement(pageIdx, event) {
      setPromptRequest({
        key: uid(),
        kind: 'refine-page',
        pageIdx: pageIdx,
        returnFocus: event.currentTarget,
        title: tr('Refine page {page} illustration', { page: pageIdx + 1 }),
        label: tr('How should this page illustration change?'),
        description: tr('Describe the visual changes you want. The existing style and composition will be preserved.'),
        examples: tr('Examples:\n• Make it warmer\n• Show the character’s face\n• Add the sunset\n• Remove any text'),
        placeholder: tr('Example: Add the sunset'),
        submitLabel: tr('Refine illustration'),
        requiredMessage: tr('Describe how the page illustration should change.')
      });
    }

    function requestUrlImport(event) {
      setPromptRequest({
        key: uid(),
        kind: 'import-url',
        returnFocus: event.currentTarget,
        title: tr('Import story from URL'),
        label: tr('Story webpage URL'),
        description: tr('Enter the full web address of a page containing story text.'),
        placeholder: 'https://example.org/story',
        inputType: 'url',
        submitLabel: tr('Import text'),
        requiredMessage: tr('Enter a URL to continue.')
      });
    }

    function submitPrompt(value) {
      var request = promptRequest;
      if (!request) return;
      setPromptRequest(null);
      if (request.kind === 'import-url') { importStoryUrl(value); return; }
      if (request.kind === 'refine-scene') { refineSceneImage(value); return; }
      if (request.kind === 'refine-page') refinePageImage(request.pageIdx, value);
    }

    // ── Generate illustration for a specific page ──
    var generatePageImage = useCallback(async function (pageIdx) {
      var storyEpoch = storyEpochRef.current;
      if (!onCallImagen || !script || !pages[pageIdx]) return;
      setPageImgLoading(function (prev) { var n = Object.assign({}, prev); n[pageIdx] = true; return n; });
      try {
        var pageLines = pages[pageIdx];
        var sceneDesc = pageLines.map(function (l) { return l.text; }).join(' ').substring(0, 300);
        var prompt = 'Illustration for a children\'s storybook page: ' + sceneDesc + '. '
          + 'Style: warm, colorful, detailed storybook illustration. Landscape format. STRICTLY NO TEXT or words in the image.';
        var url = await onCallImagen(prompt, 512, 0.85);
        if (storyEpoch !== storyEpochRef.current) return;
        if (url) setPageImages(function (prev) { var n = Object.assign({}, prev); n[pageIdx] = url; return n; });
      } catch (err) { if (storyEpoch !== storyEpochRef.current) return; warnLog('Page image failed:', err.message); }
      setPageImgLoading(function (prev) { var n = Object.assign({}, prev); delete n[pageIdx]; return n; });
    }, [onCallImagen, script, pages]);

    // ── Generate all page illustrations ──
    var generateAllImages = useCallback(async function () {
      var storyEpoch = storyEpochRef.current;
      if (!onCallImagen || !script) return;
      addToast && addToast('Generating illustrations for all ' + totalPages + ' pages...', 'info');
      for (var i = 0; i < totalPages; i++) {
        if (storyEpoch !== storyEpochRef.current) return;
        if (!pageImages[i]) {
          await generatePageImage(i);
          if (storyEpoch !== storyEpochRef.current) return;
          if (i < totalPages - 1) await new Promise(function (r) { setTimeout(r, 1500); });
        }
      }
      if (storyEpoch !== storyEpochRef.current) return;
      addToast && addToast(tr('All illustrations complete!'), 'success');
    }, [onCallImagen, script, totalPages, pageImages, generatePageImage, addToast]);

    // ── Export as printable storybook ──
    var exportStorybook = useCallback(function () {
      if (!script) return;
      var chars = script.characters.filter(function (c) { return c.id !== 'stage'; });
      // HTML escape helper for user content (titles, names, line text). Prevents broken markup AND XSS.
      var esc = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      var safeTitle = esc(storyTitle || 'Untitled Story');
      var safeAuthor = esc(performerName || '');
      // Document head — lang attribute + charset + structured metadata so the browser's
      // Print → Save as PDF produces a tagged PDF with proper document language and title.
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>' + safeTitle + ' — LitLab Storybook</title>'
        + (safeAuthor ? '<meta name="author" content="' + safeAuthor + '">' : '')
        + '<meta name="description" content="A storybook' + (safeAuthor ? ' performed by ' + safeAuthor : '') + '. Generated with LitLab.">'
        + '<style>'
        + '.skip-link{position:absolute;left:-9999px;top:0;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}'
        + '.skip-link:focus{left:0;top:0;z-index:1000}'
        + 'html,body{margin:0;padding:0}'
        + 'body{font-family:Georgia,serif;color:#1e293b;background:#fff}'
        + 'main{display:block}'
        + 'figure{margin:0}'
        + '.page{page-break-after:always;min-height:100vh;padding:40px 50px;box-sizing:border-box;display:flex;flex-direction:column}'
        + '.page:last-child{page-break-after:auto}'
        + '.page-img{width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,0.1)}'
        + '.narration{font-style:italic;color:#475569;margin:8px 0;line-height:1.8;font-size:16px}'
        + '.dialogue{margin:8px 0;padding-left:24px;line-height:1.8;font-size:16px}'
        + '.dialogue .char-name{font-weight:bold;font-variant:small-caps;margin-right:8px}'
        // Stage directions: bumped #9ca3af (2.85:1, fails AA) → #475569 (7.42:1, AAA pass).
        + '.stage{font-style:italic;color:#475569;font-size:14px;margin:6px 0 6px 20px}'
        // Page numbers: same contrast bump.
        + '.page-num{text-align:center;color:#475569;font-size:12px;margin-top:auto;padding-top:16px}'
        + '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;min-height:100vh}'
        + '.cover h1{font-size:48px;font-weight:900;margin:0 0 12px;line-height:1.1}'
        + '.cover .subtitle{font-size:18px;opacity:0.92}'
        + '.cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:20px 0}'
        + '.cast-card{text-align:center;padding:12px;border-radius:12px;border:2px solid #e5e7eb}'
        + '.cast-card .name{font-weight:bold;font-size:16px}'
        // Cast description: bumped #6b7280 (4.83:1, marginal) → #475569 (7.42:1).
        + '.cast-card .desc{font-size:12px;color:#475569;margin-top:4px}'
        + '.theme-quote{color:#475569;font-style:italic;font-size:18px}'
        + '.colophon{font-size:12px;color:#475569;margin-top:24px}'
        + '@media print{.skip-link{display:none}.page{page-break-after:always}.cover{page-break-after:always}html,body{background:#fff !important}}'
        + '@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}'
        + '</style></head><body>'
        + '<a class="skip-link" href="#story-content">Skip to story</a>'
        // Single <main> wraps the entire storybook for PDF tag-tree clarity.
        + '<main id="story-content" role="main" aria-labelledby="story-title">'
        + '<article aria-labelledby="story-title">';
      // ── Cover page (header landmark) ──
      html += '<header class="page cover">';
      if (sceneImage) {
        html += '<figure><img src="' + esc(sceneImage) + '" alt="' + esc('Cover illustration for ' + safeTitle) + '" style="width:300px;height:300px;border-radius:50%;object-fit:cover;border:6px solid rgba(255,255,255,0.3);margin-bottom:20px" /></figure>';
      }
      html += '<h1 id="story-title">' + safeTitle + '</h1>';
      if (safeAuthor) html += '<p class="subtitle">Performed by ' + safeAuthor + '</p>';
      html += '<p class="subtitle" style="margin-top:12px;opacity:0.7">A LitLab Storybook</p>';
      html += '</header>';
      // ── Cast page ──
      html += '<section class="page" aria-labelledby="cast-heading">';
      html += '<h2 id="cast-heading" style="text-align:center;margin-bottom:20px">Cast of Characters</h2>';
      html += '<ul class="cast-grid" style="list-style:none;padding:0">';
      chars.forEach(function (c) {
        html += '<li class="cast-card" style="border-color:' + esc(c.color) + '">'
          + (c.portrait ? '<img src="' + esc(c.portrait) + '" alt="' + esc('Portrait of ' + c.name) + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:8px" />' : '')
          + '<p class="name" style="color:' + esc(c.color) + '">' + esc(c.name) + '</p>'
          + (c.description ? '<p class="desc">' + esc(c.description) + '</p>' : '')
          + '</li>';
      });
      html += '</ul></section>';
      // ── Story pages (one section per page; numbered headings for navigation) ──
      pages.forEach(function (pageLines, pi) {
        html += '<section class="page" aria-labelledby="page-' + (pi + 1) + '-heading">';
        html += '<h2 id="page-' + (pi + 1) + '-heading" class="visually-hidden" style="position:absolute;left:-9999px">Page ' + (pi + 1) + '</h2>';
        if (pageImages[pi]) {
          // Build descriptive alt from the first non-empty line on the page.
          var firstLine = '';
          for (var fi = 0; fi < pageLines.length; fi++) { if (pageLines[fi].text && pageLines[fi].text.trim()) { firstLine = pageLines[fi].text.trim().slice(0, 80); break; } }
          var altText = 'Illustration for page ' + (pi + 1) + (firstLine ? ': ' + firstLine : '');
          html += '<figure><img class="page-img" src="' + esc(pageImages[pi]) + '" alt="' + esc(altText) + '" /></figure>';
        }
        pageLines.forEach(function (line) {
          var ch = script.characters.find(function (c) { return c.id === line.speaker; });
          if (line.type === 'stage-direction') {
            // role=note marks asides; SR users get spoken context cue.
            html += '<p class="stage" role="note">[' + esc(line.text) + ']</p>';
          } else if (line.type === 'narration') {
            html += '<p class="narration">' + esc(line.text) + '</p>';
          } else {
            html += '<p class="dialogue"><span class="char-name" style="color:' + esc(ch ? ch.color : '#374151') + '">' + esc(ch ? ch.name : '') + ':</span>' + esc(line.text) + '</p>';
          }
        });
        // Decorative page number — aria-hidden so SR users aren't told "page X" twice.
        html += '<p class="page-num" aria-hidden="true">— ' + (pi + 1) + ' —</p>';
        html += '</section>';
      });
      // ── Back cover (footer landmark) ──
      if (script.theme) {
        html += '<footer class="page" role="contentinfo" style="display:flex;align-items:center;justify-content:center;text-align:center"><div>'
          + '<h2>The End</h2>'
          + '<p class="theme-quote">"' + esc(script.theme) + '"</p>'
          + '<p class="colophon">Created with AlloFlow LitLab</p>'
          + '</div></footer>';
      }
      html += '</article></main></body></html>';
      var w = window.open('', '_blank');
      if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    }, [script, storyTitle, performerName, sceneImage, pages, pageImages]);

    // Keep microphone ownership and late permission/results tied to one recording.
    var startRecording = useCallback(async function () {
      if (mediaRecorderRef.current) return;
      var epoch = ++recordingEpochRef.current;
      mediaRecorderRef.current = { pending: true };
      setIsRecording(true);
      function active() { return recordingEpochRef.current === epoch; }
      function releaseStream() {
        if (recordingStreamRef.current) recordingStreamRef.current.getTracks().forEach(function (track) { track.stop(); });
        recordingStreamRef.current = null;
      }
      function failed() {
        if (!active()) return;
        releaseStream(); mediaRecorderRef.current = null; setIsRecording(false);
        addToast && addToast(tr('Recording could not start. Check microphone access and try again.'), 'error');
      }
      function saved(blob, dataUrl) {
        if (!active()) return;
        releaseStream(); mediaRecorderRef.current = null; setIsRecording(false);
        if ((!blob || !blob.size) && !dataUrl) return;
        var url = blob && blob.size ? URL.createObjectURL(blob) : dataUrl;
        if (recordingUrlRef.current && recordingUrlRef.current.indexOf('blob:') === 0) URL.revokeObjectURL(recordingUrlRef.current);
        recordingUrlRef.current = url;
        setRecordingUrl(url); setRecordedChunks(blob ? [blob] : []);
        addToast && addToast(tr('Recording saved!'), 'success');
        if (handleScoreUpdate) handleScoreUpdate(15, 'LitLab Recording', 'storystage-record-' + (storyTitle || 'untitled'));
      }
      try {
        if (window.AlloFlowVoice && typeof window.AlloFlowVoice.recordAudioBlob === 'function') {
          var ctrl = window.AlloFlowVoice.recordAudioBlob({ maxDurationMs: 15 * 60 * 1000, preferredMimeType: 'audio/webm;codecs=opus' });
          mediaRecorderRef.current = ctrl;
          // Always consume result, including unsupported or cancelled controllers.
          var result = await ctrl.result;
          if (!active()) return;
          if (result && result.blob) saved(result.blob);
          else if (result && result.base64) saved(null, result.base64);
          else { mediaRecorderRef.current = null; setIsRecording(false); }
          return;
        }
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active()) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
        recordingStreamRef.current = stream;
        var recorder = new MediaRecorder(stream);
        var chunks = [];
        recorder.ondataavailable = function (event) { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = function () { saved(new Blob(chunks, { type: recorder.mimeType || (chunks[0] && chunks[0].type) || 'audio/webm' })); };
        recorder.onerror = failed;
        mediaRecorderRef.current = recorder;
        recorder.start();
        addToast && addToast(tr('Recording started — read your lines!'), 'info');
      } catch (_) { failed(); }
    }, [storyTitle, handleScoreUpdate, addToast]);

    var stopRecording = useCallback(function () {
      var recorder = mediaRecorderRef.current;
      if (!recorder) return;
      if (recorder.pending) {
        recordingEpochRef.current++; mediaRecorderRef.current = null; setIsRecording(false); return;
      }
      try { if (typeof recorder.isRecording === 'function' || recorder.state !== 'inactive') recorder.stop(); }
      catch (_) { setIsRecording(false); }
    }, []);
    React.useEffect(function () { if (phase !== 'perform') stopRecording(); }, [phase, stopRecording]);
    React.useEffect(function () {
      return function () {
        storyEpochRef.current++;
        recordingEpochRef.current++;
        var recorder = mediaRecorderRef.current;
        if (recorder) {
          try {
            if (typeof recorder.cancel === 'function') recorder.cancel();
            else if (typeof recorder.stop === 'function' && recorder.state !== 'inactive') recorder.stop();
          } catch (_) {}
        }
        if (recordingStreamRef.current) recordingStreamRef.current.getTracks().forEach(function (track) { track.stop(); });
        if (recordingUrlRef.current && recordingUrlRef.current.indexOf('blob:') === 0) URL.revokeObjectURL(recordingUrlRef.current);
      };
    }, []);

    // ── Get grade band for standards ──
    var getGradeBand = function () {
      if (/k|1st|2nd/i.test(gradeLevel)) return 'K-2';
      if (/3rd|4th|5th/i.test(gradeLevel)) return '3-5';
      if (/6th|7th|8th/i.test(gradeLevel)) return '6-8';
      return '9-12';
    };

    // ── Export script as printable HTML ──
    var exportScript = useCallback(function () {
      if (!script) return;
      var esc = function (value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      var color = function (value) { return /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#475569'; };
      var chars = script.characters.filter(function (c) { return c.id !== 'stage'; });
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(storyTitle) + ' — LitLab Script</title>'
        + '<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;color:#1e293b;line-height:1.8}'
        + '.char-name{font-weight:bold;font-variant:small-caps;margin-right:8px}'
        + '.narration{font-style:italic;color:#475569;margin:12px 0}'
        + '.stage{font-style:italic;color:#475569;font-size:0.9em;margin:8px 0 8px 20px}'
        + '.dialogue{margin:8px 0;padding-left:20px}'
        + '.cast{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:20px 0}'
        + '.cast-card{border:2px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}'
        + 'h1{text-align:center;border-bottom:2px solid #7c3aed;padding-bottom:12px}'
        + '@media print{body{margin:20px}}</style></head><body>';
      html += '<h1>🎭 ' + esc(storyTitle) + '</h1>';
      if (performerName) html += '<p style="text-align:center;color:#6b7280">Performer: ' + esc(performerName) + '</p>';
      html += '<h2>Cast of Characters</h2><div class="cast">';
      chars.forEach(function (c) {
        html += '<div class="cast-card" style="border-color:' + color(c.color) + '">'
          + (c.portrait ? '<img src="' + esc(c.portrait) + '" alt="Portrait of ' + esc(c.name || 'character') + '" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-bottom:8px" />' : '')
          + '<div style="font-weight:bold;color:' + color(c.color) + '">' + esc(c.name) + '</div>'
          + '<div style="font-size:0.85em;color:#6b7280">' + esc(c.description || '') + '</div></div>';
      });
      html += '</div><hr><h2>Script</h2>';
      script.lines.forEach(function (line) {
        var ch = script.characters.find(function (c) { return c.id === line.speaker; });
        if (line.type === 'stage-direction') {
          html += '<div class="stage">[' + esc(line.text) + ']</div>';
        } else if (line.type === 'narration') {
          html += '<div class="narration">' + esc(line.text) + '</div>';
        } else {
          html += '<div class="dialogue"><span class="char-name" style="color:' + color(ch && ch.color) + '">' + esc(ch ? ch.name : 'Unknown') + ':</span>' + esc(line.text) + '</div>';
        }
      });
      if (script.theme) html += '<hr><p><strong>Theme:</strong> ' + esc(script.theme) + '</p>';
      html += '<div style="margin-top:30px;text-align:center;font-size:0.8em;color:#475569">Generated with AlloFlow LitLab</div>';
      html += '</body></html>';
      var w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }, [script, storyTitle, performerName]);

    // ── Styles ──
    var S = {
      modal: { position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(25,18,45,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
      container: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '1000px', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' },
      header: { background: 'linear-gradient(115deg, #3b2066, #6d28d9)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', flexShrink: 0 },
      body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px', background: '#faf9fc' },
      btn: function (bg, fg, dis) { return { padding: '8px 16px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; },
      card: { background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e3dfeb', marginBottom: '12px', boxShadow: '0 3px 12px rgba(46,25,77,0.03)' },
      input: { width: '100%', padding: '8px 12px', border: '1px solid #94a3b8', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', color: '#1e293b', background: '#fff' },
    };

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════

    return e('div', {
      role: 'presentation',
      style: S.modal,
      onClick: function (ev) { if (ev.target === ev.currentTarget) onClose(); }
    },
      e('div', {
        ref: dialogRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'litlab-dialog-title',
        'aria-describedby': 'litlab-dialog-description',
        'aria-hidden': promptRequest ? 'true' : undefined,
        inert: promptRequest ? '' : undefined,
        tabIndex: -1,
        className: 'litlab-dialog',
        style: S.container,
        onClick: function (ev) { ev.stopPropagation(); }
      },
        // Header
        e('div', { className: 'litlab-header', style: S.header },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            e('span', { 'aria-hidden': 'true', style: { fontSize: '24px' } }, '🎭'),
            e('div', null,
              e('h2', { id: 'litlab-dialog-title', style: { fontWeight: 900, fontSize: '18px', margin: 0 } }, 'LitLab'),
              e('p', { id: 'litlab-dialog-description', style: { fontSize: '12px', color: '#ede9fe', margin: '3px 0 0' } }, storyTitle || tr('Bring stories to life'))
            )
          ),
          e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            phase !== 'input' && e('button', { onClick: function () {
              if (phase === 'assign') setPhase('input');
              else if (phase === 'perform') { stopPlayback(); setPhase('assign'); }
              else if (phase === 'analyze') setPhase('perform');
            }, style: S.btn('rgba(255,255,255,0.2)', '#fff', false), 'aria-label': tr('Back') }, tr('← Back')),
            e('button', { ref: closeButtonRef, type: 'button', onClick: onClose, style: { color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }, 'aria-label': tr('Close') }, '×')
          )
        ),
        e('ol', { className: 'litlab-steps', 'aria-label': tr('Performance progress') },
          [['input', tr('Choose text')], ['assign', tr('Assign voices')], ['perform', tr('Perform')], ['analyze', tr('Reflect')]].map(function (step, index) {
            var currentIndex = ['input', 'assign', 'perform', 'analyze'].indexOf(phase);
            return e('li', { key: step[0], className: 'litlab-step', 'aria-current': phase === step[0] ? 'step' : undefined, 'data-complete': index < currentIndex ? 'true' : 'false' },
              e('span', { className: 'litlab-step-number', 'aria-hidden': 'true' }, index < currentIndex ? '✓' : index + 1),
              e('span', null, step[1])
            );
          })
        ),
        // Body
        e('div', { className: 'litlab-body', style: S.body },
          saveMessage && e('p', { role: saveError ? 'alert' : 'status', style: { margin: '0 auto 14px', maxWidth: '700px', padding: '10px 14px', borderRadius: '10px', background: saveError ? '#fff7ed' : '#f0fdf4', color: saveError ? '#9a3412' : '#166534', fontSize: '13px', lineHeight: 1.5 } }, saveMessage),
          script && phase !== 'input' && e('div', { role: 'group', 'aria-label': tr('Save your work'), style: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '12px 14px', border: '1px solid #ddd6fe', borderRadius: '12px', background: '#f5f3ff' } },
            e('div', { style: { flex: '1 1 220px' } },
              e('strong', { style: { color: '#5b21b6', fontSize: '13px' } }, tr('Pick up where you left off')),
              e('p', { style: { fontSize: '12px', color: '#475569', margin: '3px 0 0', lineHeight: 1.5 } }, tr('Save your script, retained narration, reflections, artwork, and revision checklist on this device. Save again after changes; download microphone recordings separately.'))
            ),
            e('button', { type: 'button', onClick: saveScript, disabled: preparing, style: S.btn(PURPLE, '#fff', preparing) }, tr('Save progress')),
            onSaveSubmission && e('button', { type: 'button', onClick: saveSubmissionToPortfolio, disabled: saving, 'aria-busy': saving, style: S.btn('#fff', '#5b21b6', saving) }, saving ? tr('Saving…') : tr('Save to Portfolio'))
          ),

          script && phase !== 'input' && e('section', { 'aria-label': tr('Saved narration'), style: { padding: '12px 14px', border: '1px solid #ddd6fe', borderRadius: '12px', marginBottom: '16px' } },
            e('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' } },
              e('strong', { style: { flex: '1 1 190px', fontSize: '13px' } }, tr('{ready} of {total} narration lines ready', { ready: narrationSummary.ready, total: narrationSummary.total })),
              e('label', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '12px' } }, tr('Story language'),
                e('input', { 'aria-label': tr('Story language'), value: storyLanguage, maxLength: 80, disabled: preparing || isPlaying, onChange: function (event) { cancelSpeech(); setStoryLanguage(event.target.value); }, style: { width: '140px', maxWidth: '100%', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '6px 8px' } })),
              e('button', { type: 'button', disabled: preparing || isPlaying, onClick: prepareNarration, style: S.btn(PURPLE, '#fff', preparing || isPlaying) }, tr('Prepare narration')),
              preparing && e('button', { type: 'button', onClick: function () { cancelPreparation(); setNarrationNotice(tr('Preparation cancelled. Save progress to keep completed clips.')); }, style: S.btn('#fff', '#5b21b6', false) }, tr('Cancel preparation'))
            ),
            e('p', { style: { fontSize: '12px', color: '#475569', margin: '8px 0 0', lineHeight: 1.5 } }, narrationDirty ? tr('New audio is ready. Save progress to keep it after closing.') : tr('Prepare narration saves missing or outdated lines with this script. Microphone recordings are downloaded separately.')),
            narrationSummary.stale > 0 && e('p', { style: { fontSize: '12px', color: '#9a3412' } }, tr('{count} lines need updated narration for the current voice or language.', { count: narrationSummary.stale })),
            narrationNotice && e('p', { role: 'status', style: { fontSize: '12px', lineHeight: 1.5, marginBottom: 0 } }, narrationNotice)
          ),

          // ═══ INPUT PHASE ═══
          phase === 'input' && e('div', { style: { maxWidth: '700px', margin: '0 auto' } },
            // Codename bar
            e('div', { className: 'litlab-performer', style: { display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', padding: '8px 16px', background: LIGHT_PURPLE, borderRadius: '12px', border: '1px solid #c4b5fd' } },
              e('span', { style: { fontSize: '11px', fontWeight: 700, color: PURPLE } }, tr('🎭 Performer:')),
              e('select', { value: performerName.split(' ')[0] || '', onChange: function (ev) {
                var animal = performerName.split(' ').slice(1).join(' ') || CN_ANI[0];
                setPerformerName(ev.target.value ? ev.target.value + ' ' + animal : animal);
              }, style: { fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #c4b5fd', color: PURPLE, fontWeight: 600 }, 'aria-label': tr('Codename adjective') },
                e('option', { value: '' }, tr('— Adjective —')),
                CN_ADJ.map(function (a) { return e('option', { key: a, value: a }, a); })
              ),
              e('select', { value: performerName.split(' ').slice(1).join(' ') || '', onChange: function (ev) {
                var adj = performerName.split(' ')[0] || CN_ADJ[0];
                setPerformerName(ev.target.value ? adj + ' ' + ev.target.value : adj);
              }, style: { fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #c4b5fd', color: PURPLE, fontWeight: 600 }, 'aria-label': tr('Codename animal') },
                e('option', { value: '' }, tr('— Animal —')),
                CN_ANI.map(function (a) { return e('option', { key: a, value: a }, a); })
              ),
              e('button', { onClick: function () { setPerformerName(CN_ADJ[Math.floor(Math.random() * CN_ADJ.length)] + ' ' + CN_ANI[Math.floor(Math.random() * CN_ANI.length)]); },
                style: { fontSize: '11px', background: '#fff', border: '1px solid #94a3b8', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }, 'aria-label': tr('Randomize codename') }, '🎲')
            ),
            e('div', { style: { textAlign: 'center', marginBottom: '24px' } },
              e('h3', { style: { fontSize: '22px', fontWeight: 800, color: '#1e293b' } }, tr('🎭 Create Your Performance')),
              e('p', { style: { color: '#475569', fontSize: '14px' } }, tr('Paste a story, import from URL, or let AI write one — then bring it to life with character voices.'))
            ),

            // ── Assignment prompt banner (visible to students when teacher set a prompt) ──
            teacherPrompt && !onSaveConfig && e('div', { role: 'note', 'aria-label': tr('Assignment prompt from teacher'), style: { background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' } }, tr('📋 Assignment')),
              e('p', { style: { fontSize: '13px', color: '#78350f', margin: 0, lineHeight: 1.6 } }, teacherPrompt)
            ),

            // ── Teacher Assignment Builder (visible only when onSaveConfig is provided) ──
            onSaveConfig && e('div', { role: 'region', 'aria-label': tr('Teacher Assignment Builder'), style: { background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '12px', padding: '14px', marginBottom: '16px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' } },
                e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#1e40af', margin: 0 } }, tr('🧑‍🏫 Teacher Assignment Builder')),
                e('span', { style: { fontSize: '10px', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } }, tr('Teacher mode'))
              ),
              e('p', { style: { fontSize: '11px', color: '#1e3a8a', margin: '0 0 10px', lineHeight: 1.5 } },
                tr('Paste or generate the source text below, give it a title, and add a focus prompt. Save it as an assignment so students can load it from My Resources.')
              ),
              e('label', { htmlFor: 'll-teacher-prompt', style: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' } }, tr('Performance focus / instructions for students')),
              e('textarea', {
                id: 'll-teacher-prompt',
                value: teacherPrompt,
                onChange: function (ev) { setTeacherPrompt(ev.target.value); },
                placeholder: tr('e.g. "Read aloud with feeling — vary your voice for each character. Pay attention to where the narrator changes mood."'),
                rows: 3,
                style: { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', background: '#fff', boxSizing: 'border-box' }
              }),
              e('button', {
                onClick: saveAsAssignment,
                disabled: saving || (!sourceText.trim() && !storyTitle.trim() && !teacherPrompt.trim()),
                'aria-busy': saving,
                'aria-label': tr('Save this LitLab setup as an assignment in My Resources'),
                style: { marginTop: '10px', padding: '8px 16px', background: !sourceText.trim() && !storyTitle.trim() && !teacherPrompt.trim() ? '#cbd5e1' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: !sourceText.trim() && !storyTitle.trim() && !teacherPrompt.trim() ? 'not-allowed' : 'pointer' }
              }, saving ? tr('Saving…') : tr('💾 Save as Assignment'))
            ),

            // Mode selector
            e('div', { className: 'litlab-mode-picker', role: 'group', 'aria-label': tr('Story source'), style: { display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' } },
              [['paste', tr('📋 Paste Text')], ['generate', tr('✨ AI Generate')]].map(function (pair) {
                return e('button', { key: pair[0], 'aria-pressed': inputMode === pair[0], disabled: isLoading, onClick: function () { setInputMode(pair[0]); },
                  style: Object.assign({}, S.btn(inputMode === pair[0] ? PURPLE : '#f1f5f9', inputMode === pair[0] ? '#fff' : '#374151', false), { padding: '10px 20px' })
                }, pair[1]);
              })
            ),

            e('div', { style: { marginBottom: '16px' } },
              e('label', { htmlFor: 'litlab-story-title', style: { display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' } }, tr('Story title (optional)')),
              e('input', { id: 'litlab-story-title', value: storyTitle, onChange: function (ev) { setStoryTitle(ev.target.value); }, placeholder: tr('Give your performance a title'), style: S.input })
            ),
            // Paste mode
            inputMode === 'paste' && e('div', { style: S.card },
              generationDraft && sourceText === generationDraft && e('p', { role: 'note', style: { fontSize: '13px', color: '#92400e', background: '#fffbeb', padding: '10px', borderRadius: '8px', lineHeight: 1.5 } }, tr('This is a partial draft. Review it and add any missing scenes or an ending before creating your script.')),
              e('label', { htmlFor: 'litlab-story-text', style: { display: 'block', fontSize: '14px', fontWeight: 750, marginBottom: '10px' } }, tr('Your story or excerpt')),
              e('textarea', { id: 'litlab-story-text', 'aria-describedby': 'litlab-source-help', value: sourceText, onChange: function (ev) { setSourceText(ev.target.value); },
                onPaste: async function (ev) {
                  var items = ev.clipboardData && ev.clipboardData.items;
                  if (!items || !props.onCallGeminiVision) return;
                  for (var ii = 0; ii < items.length; ii++) {
                    if (items[ii].type.startsWith('image/')) {
                      ev.preventDefault();
                      var blob = items[ii].getAsFile();
                      if (!blob) return;
                      setIsLoading(true); setLoadingMsg(tr('Extracting text from image...'));
                      var reader = new FileReader();
                      reader.onload = async function () {
                        try {
                          var base64 = reader.result.split(',')[1];
                          var text = await props.onCallGeminiVision('You are an OCR expert. Extract ALL readable text from this image. Preserve paragraph structure. Return ONLY the extracted text.', base64, items[ii].type);
                          if (text && text.trim().length > 10) { setSourceText(function (prev) { return prev ? prev + '\n\n' + text.trim() : text.trim(); }); addToast && addToast(tr('Text extracted from image!'), 'success'); }
                          else { addToast && addToast(tr('Could not extract text.'), 'error'); }
                        } catch (err) { addToast && addToast(tr('OCR failed.'), 'error'); }
                        setIsLoading(false); setLoadingMsg('');
                      };
                      reader.readAsDataURL(blob);
                      return;
                    }
                  }
                },
                placeholder: 'Paste a story, chapter, poem, or play excerpt here...\n\nYou can also paste an image (screenshot of a book page) — the text will be extracted automatically.',
                rows: 8, style: Object.assign({}, S.input, { resize: 'vertical', fontFamily: 'Georgia, serif', lineHeight: 1.7 }),
                autoFocus: phase === 'input' && inputMode === 'paste',
                'aria-label': tr('Story text input') }),
              e('div', { id: 'litlab-source-help', className: 'litlab-story-meta' },
                e('span', null, sourceText.trim() ? sourceText.trim().split(/\s+/).length + ' ' + tr('words') : tr('Start with a short scene or a favorite passage.')),
                e('span', null, tr('Next: choose a voice for each character.'))
              ),
              sourceText.length > 12000 && e('p', { role: 'note', style: { fontSize: '12px', lineHeight: 1.5, color: '#92400e', background: '#fffbeb', padding: '10px', borderRadius: '8px' } }, tr('Only the first 12,000 characters will be used to create the script. Shorten your excerpt to include the ending.')),
              e('div', { style: { display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' } },
                e('button', { onClick: function () { if (sourceText.trim()) extractScript(sourceText); },
                  disabled: !sourceText.trim() || isLoading,
                  'aria-busy': isLoading ? 'true' : 'false',
                  'aria-label': isLoading ? tr('Creating script, please wait') : tr('Create Script from text'),
                  style: S.btn(PURPLE, '#fff', !sourceText.trim() || isLoading) }, isLoading ? '⏳ ' + loadingMsg : tr('🎭 Create Script')),
                // URL import
                e('button', { type: 'button', onClick: requestUrlImport, style: S.btn('#f1f5f9', '#374151', false) }, tr('🔗 Import URL')),
                // File upload
                e('button', { onClick: function () {
                  var input = document.createElement('input');
                  input.setAttribute('aria-label', tr('Upload story source file'));
                  input.type = 'file';
                  input.accept = 'image/*,.txt,.md,.pdf';
                  input.onchange = async function (ev) {
                    var file = ev.target.files && ev.target.files[0];
                    if (!file) return;
                    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                      var reader = new FileReader();
                      reader.onload = function (e2) { setSourceText(function (prev) { return prev ? prev + '\n\n' + e2.target.result : e2.target.result; }); };
                      reader.readAsText(file);
                    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                      if (!props.onCallGeminiVision) { addToast && addToast(tr('Vision API not available.'), 'error'); return; }
                      setIsLoading(true); setLoadingMsg(tr('Extracting text from file...'));
                      var reader2 = new FileReader();
                      reader2.onload = async function () {
                        try {
                          var base64 = reader2.result.split(',')[1];
                          var text = await props.onCallGeminiVision('Extract all readable text from this document. Preserve paragraph structure. Return ONLY the text.', base64, file.type);
                          if (text) { setSourceText(function (prev) { return prev ? prev + '\n\n' + text.trim() : text.trim(); }); addToast && addToast(tr('Text extracted!'), 'success'); }
                        } catch (err) { addToast && addToast(tr('Extraction failed.'), 'error'); }
                        setIsLoading(false); setLoadingMsg('');
                      };
                      reader2.readAsDataURL(file);
                    }
                  };
                  input.click();
                }, style: S.btn('#f1f5f9', '#374151', false) }, tr('📁 Upload File'))
              )
            ),

            // Generate mode
            inputMode === 'generate' && e('div', { style: S.card },
              e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'block' } }, tr('Genre')),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', marginBottom: '12px' } },
                GENRES.map(function (g) {
                  return e('button', { key: g.id, 'aria-pressed': genGenre === g.id, onClick: function () { setGenGenre(g.id); },
                    style: { padding: '8px', borderRadius: '10px', border: '2px solid ' + (genGenre === g.id ? PURPLE : '#e5e7eb'), background: genGenre === g.id ? LIGHT_PURPLE : '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '11px' }
                  },
                    e('div', { style: { fontWeight: 700, color: genGenre === g.id ? PURPLE : '#374151' } }, g.icon + ' ' + tr(g.label)),
                    e('div', { style: { color: '#64748b', fontSize: '10px' } }, tr(g.desc))
                  );
                })
              ),
              e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', display: 'block' } }, tr('Custom Instructions (optional)')),
              e('textarea', { value: genPrompt, onChange: function (ev) { setGenPrompt(ev.target.value); },
                placeholder: tr('e.g. "A story about a girl who discovers she can talk to animals" or "Set in ancient Egypt with a mystery about a missing artifact"'),
                rows: 3, style: Object.assign({}, S.input, { marginBottom: '12px', resize: 'vertical' }),
                'aria-label': tr('Story generation instructions') }),
              e('div', { className: 'litlab-options', style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151' } }, tr('Characters:')),
                [2, 3, 4, 5, 6].map(function (n) {
                  return e('button', { key: n, 'aria-pressed': genCharCount === n, 'aria-label': n + ' ' + tr('characters'), onClick: function () { setGenCharCount(n); },
                    style: { width: '32px', height: '32px', borderRadius: '50%', border: '2px solid ' + (genCharCount === n ? PURPLE : '#d1d5db'), background: genCharCount === n ? PURPLE : '#fff', color: genCharCount === n ? '#fff' : '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
                  }, n);
                })
              ),
              // Grade level selector
              e('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', flexShrink: 0 } }, tr('Grade Level:')),
                e('select', { value: genGradeLevel, onChange: function (ev) { setGenGradeLevel(ev.target.value); },
                  style: Object.assign({}, S.input, { flex: 1 }),
                  'aria-label': tr('Story grade level')
                },
                  GRADE_OPTIONS.map(function (g) { return e('option', { key: g, value: g }, g); })
                )
              ),
              // Length selector
              e('div', { className: 'litlab-options', style: { display: 'flex', gap: '6px', marginBottom: '12px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', flexShrink: 0, paddingTop: '6px' } }, tr('Length:')),
                LENGTH_OPTIONS.map(function (lo) {
                  return e('button', { key: lo.id, 'aria-pressed': genLength === lo.id, onClick: function () { setGenLength(lo.id); },
                    'aria-label': tr(lo.label) + ' story' + (lo.words ? ': ' + lo.words + ' words' : ''),
                    style: { flex: 1, padding: '6px 10px', borderRadius: '10px', border: '2px solid ' + (genLength === lo.id ? PURPLE : '#e5e7eb'), background: genLength === lo.id ? LIGHT_PURPLE : '#fff', cursor: 'pointer', textAlign: 'center', fontSize: '11px' }
                  },
                    e('div', { style: { fontWeight: 700, color: genLength === lo.id ? PURPLE : '#374151' } }, tr(lo.label)),
                    e('div', { style: { color: '#64748b', fontSize: '9px' } }, lo.words ? lo.words + ' words' : tr('You choose'))
                  );
                })
              ),
              // Custom word count input
              genLength === 'custom' && e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', flexShrink: 0 } }, tr('Word count:')),
                e('input', { type: 'number', min: 50, max: 5000, step: 50, value: customWordCount,
                  onChange: function (ev) { setCustomWordCount(ev.target.value); },
                  style: Object.assign({}, S.input, { width: '120px' }),
                  'aria-label': tr('Custom word count'), 'aria-invalid': !customWordCountValid, 'aria-describedby': 'litlab-word-count-help' }),
                e('span', { id: 'litlab-word-count-help', style: { fontSize: '12px', color: customWordCountValid ? '#64748b' : '#b91c1c' } }, tr('Enter a whole number from 50 to 5000 words.'))
              ),
              e('button', { onClick: generateStory, disabled: isLoading || (genLength === 'custom' && !customWordCountValid),
                'aria-busy': isLoading ? 'true' : 'false',
                'aria-label': isLoading ? tr('Generating story, please wait') : tr('Generate Story with AI'),
                style: S.btn(PURPLE, '#fff', isLoading || (genLength === 'custom' && !customWordCountValid)) }, isLoading ? '⏳ ' + loadingMsg : tr('✨ Generate Story')),
              generationError && e('p', { role: 'alert', style: { fontSize: '13px', color: '#92400e', lineHeight: 1.5 } }, generationError),
              generationDraft && e('button', { type: 'button', disabled: isLoading, onClick: function () { setSourceText(generationDraft); setInputMode('paste'); }, style: Object.assign({}, S.btn('#fef3c7', '#78350f', isLoading), { marginTop: '8px' }) }, tr('Review partial draft'))
            ),

            // Saved scripts
            savedScripts.length > 0 && e('div', { style: Object.assign({}, S.card, { marginTop: '16px' }) },
              e('h4', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, tr('📂 Saved Scripts (') + savedScripts.length + ')'),
              e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' } },
                savedScripts.map(function (s) {
                  return e('button', { key: s.id, onClick: function () { loadScript(s); },
                    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }
                  },
                    e('span', { style: { fontWeight: 600, color: '#1e293b' } }, s.title),
                    e('span', { style: { color: '#64748b', fontSize: '10px' } }, new Date(s.savedAt).toLocaleDateString())
                  );
                })
              )
            )
          ),

          // ═══ VOICE ASSIGNMENT PHASE ═══
          phase === 'assign' && script && e('div', null,
            e('div', { style: { textAlign: 'center', marginBottom: '20px' } },
              e('h3', { style: { fontSize: '20px', fontWeight: 800, color: '#1e293b' } }, tr('🎤 Assign Voices')),
              e('p', { style: { color: '#475569', fontSize: '13px' } }, tr('Choose a distinct voice for each character. Click preview to hear them.'))
            ),
            e('div', { className: 'litlab-voice-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' } },
              script.characters.map(function (ch) {
                return e('div', { key: ch.id, style: { background: '#fff', borderRadius: '14px', padding: '16px', border: '3px solid ' + (ch.color || '#e5e7eb'), boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } },
                  e('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' } },
                    ch.portrait
                      ? e('img', { src: ch.portrait, alt: ch.name, style: { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid ' + ch.color } })
                      : e('div', { style: { width: '48px', height: '48px', borderRadius: '50%', background: ch.color || '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', fontWeight: 800 } }, ch.name.charAt(0)),
                    e('div', { style: { flex: 1 } },
                      e('div', { style: { fontWeight: 800, fontSize: '14px', color: '#1e293b' } }, ch.name),
                      e('div', { style: { fontSize: '11px', color: '#475569' } }, ch.description || '')
                    ),
                    onCallImagen && !ch.portrait && e('button', { onClick: function () { generatePortrait(ch.id); },
                      style: { fontSize: '10px', background: '#f1f5f9', border: '1px solid #94a3b8', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' },
                      'aria-label': tr('Generate portrait') }, '🎨')
                  ),
                  e('select', { value: ch.voice || '',
                    onChange: function (ev) {
                      var updated = script.characters.map(function (c) { return c.id === ch.id ? Object.assign({}, c, { voice: ev.target.value }) : c; });
                      setScript(Object.assign({}, script, { characters: updated }));
                    },
                    style: Object.assign({}, S.input, { marginBottom: '6px' }),
                    'aria-label': 'Voice for ' + ch.name
                  },
                    e('option', { value: '' }, tr('— Select Voice —')),
                    allVoices.map(function (v) { return e('option', { key: v.id, value: v.id }, v.label || v.id); })
                  ),
                  e('button', { disabled: preparing, onClick: function () {
                    setPreviewingVoice(ch.id);
                    speakLine('Hello, I am ' + ch.name + '.', ch.voice).then(function () { setPreviewingVoice(null); });
                  }, disabled: previewingVoice === ch.id,
                    style: S.btn('#f1f5f9', '#374151', previewingVoice === ch.id)
                  }, previewingVoice === ch.id ? '🔊 Playing...' : tr('▶ Preview Voice'))
                );
              })
            ),
            e('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },

              e('button', { onClick: function () { setPhase('perform'); setCurrentLine(0); setCurrentPage(0); }, style: S.btn(PURPLE, '#fff', false) }, tr('🎭 Start Performance →'))
            )
          ),

          // ═══ PERFORMANCE PHASE ═══
          phase === 'perform' && script && e('div', null,
            // Controls bar
            e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' } },
              !isPlaying
                ? e('button', { onClick: function () { playFromLine(currentLine); }, disabled: preparing, autoFocus: true, style: S.btn('#15803d', '#fff', false) }, tr('▶ Play'))
                : null,
              isPlaying && (isPaused
                ? e('button', { onClick: resumePlayback, style: S.btn('#15803d', '#fff', false) }, tr('▶ Resume'))
                : e('button', { onClick: pausePlayback, style: S.btn('#92400e', '#fff', false) }, tr('⏸ Pause'))),
              isPlaying && e('button', { onClick: stopPlayback, 'aria-label': tr('Stop playback'), style: S.btn('#b91c1c', '#fff', false) }, tr('⏹ Stop')),
              e('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569' } },
                e('span', null, tr('Speed:')),
                [0.75, 1, 1.25, 1.5].map(function (spd) {
                  return e('button', { key: spd, disabled: isPlaying, onClick: function () { setPlaybackSpeed(spd); },
                    'aria-pressed': playbackSpeed === spd ? 'true' : 'false',
                    'aria-label': 'Playback speed ' + spd + ' times',
                    style: { padding: '3px 8px', borderRadius: '6px', border: '1px solid ' + (playbackSpeed === spd ? PURPLE : '#d1d5db'), background: playbackSpeed === spd ? LIGHT_PURPLE : '#fff', color: playbackSpeed === spd ? PURPLE : '#475569', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }
                  }, spd + 'x');
                })
              ),
              // Reading-friendly text toggle (WCAG 1.4.4 / 1.4.12)
              e('button', {
                onClick: function () {
                  var next = !largeText;
                  setLargeText(next);
                  try { localStorage.setItem('alloLitLabReadingMode', next ? '1' : '0'); } catch (e) {}
                  announceLitLab(next ? tr('Reading-friendly text on.') : tr('Reading-friendly text off.'));
                },
                'aria-pressed': largeText ? 'true' : 'false',
                'aria-label': largeText ? tr('Turn off reading-friendly text') : tr('Turn on reading-friendly text (larger, sans-serif, more spacing)'),
                style: { padding: '4px 10px', borderRadius: '6px', border: '1px solid ' + (largeText ? PURPLE : '#d1d5db'), background: largeText ? LIGHT_PURPLE : '#fff', color: largeText ? PURPLE : '#475569', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }
              }, '🔠 ' + (largeText ? 'Reading mode on' : tr('Reading mode'))),
              e('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' } },
                e('span', { style: { fontSize: '11px', color: '#475569' } }, tr('My Role:')),
                e('select', { disabled: isPlaying, value: myRole || '', onChange: function (ev) { setMyRole(ev.target.value || null); },
                  style: { fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #94a3b8' },
                  'aria-label': tr('Select your character role')
                },
                  e('option', { value: '' }, tr('Audience (listen only)')),
                  script.characters.filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (c) {
                    return e('option', { key: c.id, value: c.id }, '🎤 ' + c.name);
                  })
                )
              ),
              !isRecording
                ? e('button', { onClick: startRecording, style: S.btn('#dc2626', '#fff', false) }, tr('⏺ Record'))
                : e('button', { onClick: stopRecording, style: S.btn('#dc2626', '#fff', false) }, tr('⏹ Stop Recording')),
              recordingUrl && e('a', { href: recordingUrl, download: (storyTitle || 'LitLab').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 80) + '-recording.' + ((recordedChunks[0] && recordedChunks[0].type || recordingUrl).indexOf('mp4') !== -1 ? 'm4a' : (recordedChunks[0] && recordedChunks[0].type || recordingUrl).indexOf('ogg') !== -1 ? 'ogg' : 'webm'), style: Object.assign({}, S.btn('#f1f5f9', '#374151', false), { display: 'inline-flex', alignItems: 'center', minHeight: '40px', textDecoration: 'none' }) }, tr('Download recording')),
              recordingUrl && e('audio', { controls: true, src: recordingUrl, style: { height: '28px', maxWidth: '150px' }, 'aria-label': tr('Your recording') }),
              e('button', { onClick: exportScript, style: S.btn('#f1f5f9', '#374151', false) }, tr('🖨️ Script')),
              e('button', { onClick: exportStorybook, style: S.btn('#f1f5f9', '#374151', false) }, tr('📖 Storybook')),
              onCallImagen && !sceneImage && e('button', { onClick: generateSceneImage, disabled: sceneImageLoading,
                'aria-busy': sceneImageLoading ? 'true' : 'false',
                'aria-label': sceneImageLoading ? 'Generating cover, please wait' : tr('Generate cover image with AI'),
                style: S.btn('#f1f5f9', '#374151', sceneImageLoading) }, sceneImageLoading ? '⏳ Cover…' : tr('🎨 Cover')),
              onCallImagen && e('button', { onClick: generateAllImages, style: S.btn('#f1f5f9', '#374151', false) }, tr('🎨 All Art')),
              e('button', { onClick: function () { setPhase('analyze'); }, style: S.btn('#f1f5f9', '#374151', false) }, tr('📝 Analyze →'))
            ),
            // Page navigation bar
            totalPages > 1 && e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', justifyContent: 'center' } },
              e('button', { onClick: function () { cancelSpeech(); setCurrentPage(Math.max(0, currentPage - 1)); setCurrentLine(Math.max(0, currentPage - 1) * LINES_PER_PAGE); }, disabled: isPlaying || currentPage === 0,
                style: S.btn('#f1f5f9', '#374151', currentPage === 0), 'aria-label': tr('Previous page') }, '◀'),
              e('span', { style: { fontSize: '12px', fontWeight: 700, color: '#475569' } }, tr('Page ') + (currentPage + 1) + ' of ' + totalPages),
              e('button', { onClick: function () { cancelSpeech(); setCurrentPage(Math.min(totalPages - 1, currentPage + 1)); setCurrentLine(Math.min(totalPages - 1, currentPage + 1) * LINES_PER_PAGE); }, disabled: isPlaying || currentPage >= totalPages - 1,
                style: S.btn('#f1f5f9', '#374151', currentPage >= totalPages - 1), 'aria-label': tr('Next page') }, '▶')
            ),
            // Cover image (for storybook export header)
            sceneImage && e('div', { style: { marginBottom: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' } },
              e('div', { style: { borderRadius: '50%', overflow: 'hidden', border: '3px solid #e5e7eb', width: '120px', height: '120px' } },
                e('img', { src: sceneImage, alt: 'Story cover illustration', style: { width: '100%', height: '100%', objectFit: 'cover' } })
              ),
              onCallGeminiImageEdit && e('button', { onClick: requestSceneImageRefinement, disabled: sceneImageLoading,
                'aria-busy': sceneImageLoading ? 'true' : 'false',
                'aria-label': sceneImageLoading ? 'Refining cover, please wait' : tr('Refine cover image with a custom instruction'),
                style: { fontSize: '11px', color: '#475569', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '4px 10px', cursor: sceneImageLoading ? 'wait' : 'pointer' }
              }, sceneImageLoading ? '⏳ Refining…' : tr('✨ Refine Cover'))
            ),
            // Page illustration
            pageImages[currentPage] && e('div', { style: { marginBottom: '10px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' } },
              e('img', { src: pageImages[currentPage], alt: 'Illustration for page ' + (currentPage + 1), style: { width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' } }),
              onCallGeminiImageEdit && e('button', { onClick: function (event) { requestPageImageRefinement(currentPage, event); }, disabled: pageImgLoading[currentPage],
                'aria-busy': pageImgLoading[currentPage] ? 'true' : 'false',
                'aria-label': pageImgLoading[currentPage] ? 'Refining illustration, please wait' : tr('Refine this page illustration with a custom instruction'),
                style: { position: 'absolute', top: '6px', right: '6px', fontSize: '11px', color: '#374151', background: 'rgba(255,255,255,0.92)', border: '1px solid #94a3b8', borderRadius: '8px', padding: '4px 10px', cursor: pageImgLoading[currentPage] ? 'wait' : 'pointer', fontWeight: 700 }
              }, pageImgLoading[currentPage] ? '⏳' : '✨ Refine')
            ),
            !pageImages[currentPage] && onCallImagen && e('button', { onClick: function () { generatePageImage(currentPage); }, disabled: pageImgLoading[currentPage],
              'aria-busy': pageImgLoading[currentPage] ? 'true' : 'false',
              'aria-label': pageImgLoading[currentPage] ? 'Generating illustration, please wait' : tr('Illustrate this page with AI'),
              style: { fontSize: '11px', color: '#475569', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '6px 12px', cursor: pageImgLoading[currentPage] ? 'wait' : 'pointer', marginBottom: '10px', display: 'block', margin: '0 auto 10px' }
            }, pageImgLoading[currentPage] ? '⏳ Generating...' : tr('🎨 Illustrate This Page')),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' } },
              e('span', { style: { fontSize: '13px', fontWeight: 700, color: '#475569' } }, tr('Line {current} of {total}', { current: currentLine + 1, total: script.lines.length })),
              e('button', { type: 'button', onClick: function () { stopPlayback(); setCurrentLine(0); setCurrentPage(0); }, style: S.btn('#f1f5f9', '#374151', false) }, tr('Restart from beginning'))
            ),
            // Progress bar
            e('div', { style: { height: '4px', background: '#e5e7eb', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' } },
              e('div', { style: { height: '100%', width: (script.lines.length > 0 ? Math.round(((currentLine + 1) / script.lines.length) * 100) : 0) + '%', background: 'linear-gradient(90deg, ' + PURPLE + ', #a855f7)', borderRadius: '2px', transition: 'width 0.3s' } })
            ),
            // Script lines — show current page only (or all if single page)
            e('div', { ref: lineContainerRef, style: Object.assign({ maxHeight: '55vh', overflowY: 'auto', padding: '8px' }, largeText ? { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '0.02em' } : {}) },
              (totalPages > 1 ? (pages[currentPage] || []) : script.lines).map(function (line) {
                var idx = script.lines.indexOf(line);
                var isCurrent = idx === currentLine;
                var character = script.characters.find(function (c) { return c.id === line.speaker; });
                var isMyLine = myRole && line.speaker === myRole;
                var bgColor = isCurrent ? (isMyLine ? '#fef3c7' : character ? character.color + '15' : '#f0fdf4') : 'transparent';
                var borderColor = isCurrent ? (isMyLine ? '#f59e0b' : character ? character.color : '#22c55e') : 'transparent';
                return e('div', { key: line.id, id: 'ss-line-' + idx,

                  style: { padding: line.type === 'stage-direction' ? '4px 16px' : '10px 16px', borderLeft: '4px solid ' + borderColor, background: bgColor, borderRadius: '0 8px 8px 0', marginBottom: '4px', transition: 'background 0.2s' }
                },
                  e('button', { type: 'button', disabled: isPlaying || preparing, 'aria-label': tr('Read line {number} aloud', { number: idx + 1 }), onClick: function () { setCurrentLine(idx); speakLine(line.text, character ? character.voice : 'Aoede', playbackSpeed, line.id); }, style: { float: 'right', margin: '0 0 4px 8px', border: '1px solid #c4b5fd', borderRadius: '8px', background: '#f5f3ff', color: '#5b21b6', padding: '4px 8px', cursor: 'pointer' } }, '▶'),
                  line.type === 'stage-direction'
                    ? e('p', { style: { fontSize: largeText ? '13px' : '11px', color: '#475569', fontStyle: 'italic', margin: 0, lineHeight: largeText ? 1.85 : 1.4 } }, '[' + line.text + ']')
                    : e('div', null,
                        e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' } },
                          character && character.portrait && e('img', { src: character.portrait, alt: '', style: { width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' } }),
                          e('span', { style: { fontSize: largeText ? '13px' : '11px', fontWeight: 800, color: '#334155' } },
                            character ? character.name : 'Unknown'),
                          isMyLine && e('span', { style: { fontSize: '9px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 } }, tr('🎤 YOUR LINE'))
                        ),
                        e('p', { style: { fontSize: largeText ? (line.type === 'narration' ? '16px' : '17px') : (line.type === 'narration' ? '13px' : '14px'), color: '#1e293b', margin: 0, fontStyle: line.type === 'narration' ? 'italic' : 'normal', lineHeight: largeText ? 1.85 : 1.6 } }, line.text),
                        // Emotion reaction buttons (visible on current/past lines)
                        (isCurrent || idx < currentLine) && e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px' } },
                          EMOTIONS.map(function (em) {
                            var isSelected = emotionLog[line.id] === em;
                            return e('button', { key: em, onClick: function (ev) { ev.stopPropagation(); invalidateFeedback(); setEmotionLog(function (prev) { var n = Object.assign({}, prev); n[line.id] = isSelected ? null : em; return n; }); },
                              style: { fontSize: '14px', padding: '1px 3px', borderRadius: '4px', border: 'none', background: isSelected ? '#fef3c7' : 'transparent', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: 'all 0.1s' },
                              'aria-pressed': isSelected, 'aria-label': 'React with ' + em, title: tr('How does this line make you feel?') }, em);
                          })
                        )
                      )
                );
              })
            )
          ),

          // ═══ ANALYSIS PHASE ═══
          phase === 'analyze' && script && e('div', { style: { maxWidth: '700px', margin: '0 auto' } },
            e('div', { style: { textAlign: 'center', marginBottom: '20px' } },
              e('h3', { style: { fontSize: '20px', fontWeight: 800, color: '#1e293b' } }, tr('📝 Literary Analysis')),
              e('p', { style: { color: '#475569', fontSize: '13px' } }, 'Reflect on the story, its characters, and the author\'s craft.')
            ),
            e('details', { style: Object.assign({}, S.card, { marginBottom: '16px' }) },
              e('summary', { style: { cursor: 'pointer', fontSize: '14px', fontWeight: 750, color: '#5b21b6' } }, tr('Review story evidence')),
              e('p', { style: { fontSize: '12px', color: '#475569', lineHeight: 1.6 } }, tr('Find a line that supports your idea. Quote it or explain it in your own words.')),
              e('ol', { 'aria-label': tr('Story lines for reference'), style: { maxHeight: '260px', overflowY: 'auto', paddingLeft: '28px', fontSize: '14px', lineHeight: 1.8 } },
                script.lines.map(function (line) { var speaker = script.characters.find(function (character) { return character.id === line.speaker; }); return e('li', { key: line.id, style: { marginBottom: '8px', paddingLeft: '4px' } }, e('strong', null, (speaker ? speaker.name : tr('Stage direction')) + ': '), line.text); })
              )
            ),
            // Standards alignment
            e('div', { style: { marginBottom: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '6px' } }, '📐 CCSS ELA Standards — Literature (' + getGradeBand() + ')'),
              e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                (CCSS_STANDARDS[getGradeBand()] || []).map(function (std, i) {
                  return e('button', { type: 'button', key: i, 'aria-pressed': selectedStandard === std, style: { textAlign: 'left', fontSize: '12px', background: selectedStandard === std ? '#1d4ed8' : '#dbeafe', color: selectedStandard === std ? '#fff' : '#1e40af', padding: '3px 8px', borderRadius: '8px', cursor: 'pointer', border: '1px solid ' + (selectedStandard === std ? '#2563eb' : '#93c5fd'), fontWeight: selectedStandard === std ? 700 : 500 },
                    onClick: function () { invalidateFeedback(); setSelectedStandard(selectedStandard === std ? '' : std); } }, std);
                })
              ),
              selectedStandard && e('p', { style: { fontSize: '10px', color: '#1e40af', marginTop: '6px', fontStyle: 'italic' } }, 'Focus your analysis on this standard: ' + selectedStandard)
            ),
            // Emotion summary from performance
            Object.keys(emotionLog).length > 0 && e('div', { style: { marginBottom: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px' } }, tr('🎭 Your Emotional Journey')),
              e('div', { style: { display: 'flex', gap: '3px', flexWrap: 'wrap', fontSize: '18px' } },
                script.lines.map(function (line, i) {
                  var em = emotionLog[line.id];
                  return em ? e('span', { key: i, title: (script.characters.find(function (c) { return c.id === line.speaker; }) || {}).name + ': "' + line.text.substring(0, 40) + '..."', style: { cursor: 'help' } }, em) : null;
                }).filter(Boolean)
              ),
              e('p', { style: { fontSize: '10px', color: '#92400e', marginTop: '6px' } }, 'You reacted to ' + Object.keys(emotionLog).filter(function (k) { return emotionLog[k]; }).length + ' moments in the story. Consider how these emotions connect to the theme.')
            ),
            // Character analysis
            e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: PURPLE, marginBottom: '10px' } }, tr('👥 Character Analysis')),
              script.characters.filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (ch) {
                var key = 'char_' + ch.id;
                return e('div', { key: ch.id, style: { marginBottom: '12px' } },
                  e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                    e('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: ch.color, display: 'inline-block' } }),
                    e('span', { style: { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }, ch.name)
                  ),
                  e('textarea', { value: analysisResponses[key] || '', onChange: function (ev) { invalidateFeedback(); setAnalysisResponses(function (prev) { var n = Object.assign({}, prev); n[key] = ev.target.value; return n; }); },
                    placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? 'What is ' + ch.name + ' like? How do you know?' : /6th|7th|8th/i.test(gradeLevel) ? 'Describe ' + ch.name + '\'s personality and motivations. Use evidence from the text.' : 'Analyze ' + ch.name + '\'s character arc, motivations, and how they contribute to the theme. Cite specific dialogue or actions.',
                    rows: 2, style: Object.assign({}, S.input, { resize: 'vertical' }),
                    'aria-label': 'Analysis of ' + ch.name })
                );
              })
            ),
            // Theme
            e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: '#047857', marginBottom: '6px' } }, tr('💡 Theme & Message')),
              e('textarea', { value: analysisResponses.theme || '', onChange: function (ev) { invalidateFeedback(); setAnalysisResponses(function (prev) { return Object.assign({}, prev, { theme: ev.target.value }); }); },
                placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? tr('What is the lesson or big idea of this story?') : /6th|7th|8th/i.test(gradeLevel) ? 'What is the theme of this story? How do the characters and events develop this theme?' : 'Identify the central theme(s). How does the author develop the theme through character, conflict, setting, and symbolism?',
                rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }),
                'aria-label': 'Theme analysis' })
            ),
            // Literary craft
            script.literaryElements && script.literaryElements.length > 0 && e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: '#92400e', marginBottom: '6px' } }, '✍️ Author\'s Craft'),
              e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' } },
                script.literaryElements.map(function (el, i) { return e('span', { key: i, style: { fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '8px', border: '1px solid #fde68a' } }, el); })
              ),
              e('textarea', { value: analysisResponses.craft || '', onChange: function (ev) { invalidateFeedback(); setAnalysisResponses(function (prev) { return Object.assign({}, prev, { craft: ev.target.value }); }); },
                placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? tr('What did the author do to make the story interesting or exciting?') : /6th|7th|8th/i.test(gradeLevel) ? 'Choose one literary element from above. Find an example in the story and explain how it affects the reader.' : 'Analyze the author\'s use of the literary elements listed above. How do these choices contribute to meaning, mood, or reader experience? Cite specific passages.',
                rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }),
                'aria-label': 'Literary craft analysis' })
            ),
            // Personal response
            e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: '#2563eb', marginBottom: '6px' } }, tr('💬 Personal Response')),
              e('textarea', { value: analysisResponses.personal || '', onChange: function (ev) { invalidateFeedback(); setAnalysisResponses(function (prev) { return Object.assign({}, prev, { personal: ev.target.value }); }); },
                placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? tr('What was your favorite part? How did the story make you feel?') : 'What is your personal response to this text? How does it connect to your own experience, other texts, or the world?',
                rows: 2, style: Object.assign({}, S.input, { resize: 'vertical' }),
                'aria-label': 'Personal response' })
            ),
            // ── Pre-feedback Self-Assessment ──
            // Optional but encouraged: rate your own work on 5 craft criteria
            // before the AI weighs in. Builds metacognition + gives the Revision
            // Plan synthesizer something to triangulate against.
            !selfAssessmentSubmitted && e('div', { role: 'region', 'aria-label': tr('Self-Assessment'), style: { background: 'linear-gradient(135deg, #faf5ff, #eef2ff)', border: '2px solid #d8b4fe', borderRadius: '12px', padding: '14px', marginTop: '16px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' } },
                e('div', null,
                  e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#7c3aed', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' } },
                    e('span', { 'aria-hidden': 'true' }, '⭐'), tr('Rate yourself first')
                  ),
                  e('p', { style: { fontSize: '11px', color: '#6b21a8', margin: '2px 0 0' } }, 'Score your own performance + analysis on 5 criteria before the AI does. Builds reflection.')
                ),
                e('button', {
                  onClick: function () { invalidatePlan(); setSelfAssessmentSubmitted(true); announceLitLab(tr('Self-assessment skipped.')); },
                  'aria-label': tr('Skip self-assessment'),
                  style: { fontSize: '10px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }
                }, tr('Skip'))
              ),
              e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' } },
                LITLAB_RUBRIC.map(function (c) {
                  var val = selfAssessment[c.id] || 3;
                  return e('div', { key: c.id, style: { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '6px 10px', flexWrap: 'wrap' } },
                    e('div', { style: { flex: 1, minWidth: 0 } },
                      e('label', { htmlFor: 'll-self-' + c.id, style: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#581c87' } }, c.label),
                      e('p', { style: { fontSize: '10px', color: '#6b21a8', margin: '1px 0 0', fontStyle: 'italic' } }, c.desc)
                    ),
                    e('input', {
                      id: 'll-self-' + c.id, type: 'range', min: '1', max: '5', step: '1', value: val,
                      onChange: function (ev) {
                        var v = parseInt(ev.target.value, 10);
                        invalidatePlan();
                        setSelfAssessment(function (prev) { var n = Object.assign({}, prev); n[c.id] = v; return n; });
                      },
                      'aria-label': 'Self-rating for ' + c.label + ': ' + val + ' out of 5',
                      style: { width: '110px', accentColor: '#7c3aed' }
                    }),
                    e('div', { style: { background: '#ede9fe', color: '#6b21a8', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', minWidth: '36px', textAlign: 'center' } }, val + '/5')
                  );
                })
              ),
              e('button', {
                onClick: function () {
                  var filled = {};
                  LITLAB_RUBRIC.forEach(function (c) { filled[c.id] = selfAssessment[c.id] || 3; });
                  invalidatePlan();
                  setSelfAssessment(filled);
                  setSelfAssessmentSubmitted(true);
                  announceLitLab(tr('Self-assessment submitted.'));
                  if (typeof addToast === 'function') addToast(tr('Self-assessment saved!'), 'success');
                },
                'aria-label': tr('Submit self-assessment'),
                style: { marginTop: '8px', padding: '7px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }
              }, tr('✓ Submit Self-Assessment'))
            ),
            selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0 && e('div', { style: { background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '8px 12px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
              e('div', { style: { fontSize: '11px', color: '#6b21a8' } },
                e('strong', null, '⭐ Your self-rating: '),
                LITLAB_RUBRIC.map(function (c, i) {
                  return c.label.split(' ')[0] + ' ' + (selfAssessment[c.id] || 3) + (i < LITLAB_RUBRIC.length - 1 ? ' · ' : '');
                }).join('')
              ),
              e('button', {
                onClick: function () { invalidatePlan(); setSelfAssessmentSubmitted(false); },
                'aria-label': tr('Edit self-assessment'),
                style: { fontSize: '10px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }
              }, 'Edit')
            ),
            feedbackNotice && e('p', { role: 'status', style: { fontSize: '13px', color: '#92400e', lineHeight: 1.5, padding: '12px', background: '#fffbeb', borderRadius: '10px' } }, feedbackNotice),
            // Submit for feedback
            e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' } },
              e('button', { onClick: getAnalysisFeedback, disabled: analysisFeedback === 'loading' || !Object.values(analysisResponses).some(function (v) { return v && v.trim(); }),
                'aria-busy': analysisFeedback === 'loading' ? 'true' : 'false',
                'aria-label': analysisFeedback === 'loading' ? 'Analyzing your responses, please wait' : tr('Get AI feedback on your analysis'),
                style: S.btn('#047857', '#fff', analysisFeedback === 'loading' || !Object.values(analysisResponses).some(function (v) { return v && v.trim(); }))
              }, analysisFeedback === 'loading' ? '⏳ Analyzing...' : tr('✨ Get Feedback')),
              e('button', { onClick: function () { setPhase('perform'); }, style: S.btn('#f1f5f9', '#374151', false) }, tr('← Back to Performance'))
            ),
            // Feedback display
            analysisFeedback && typeof analysisFeedback === 'object' && !analysisFeedback.error && e('div', { style: { marginTop: '16px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '2px solid #86efac', borderRadius: '14px', padding: '20px' } },
              e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                e('h4', { style: { fontSize: '15px', fontWeight: 800, color: '#166534' } }, tr('📝 Literary Analysis Feedback')),
                e('span', { style: { fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', background: analysisFeedback.overallRating === 'exemplary' ? '#dcfce7' : analysisFeedback.overallRating === 'proficient' ? '#dbeafe' : '#fef3c7', color: analysisFeedback.overallRating === 'exemplary' ? '#166534' : analysisFeedback.overallRating === 'proficient' ? '#1e40af' : '#92400e', border: '1px solid ' + (analysisFeedback.overallRating === 'exemplary' ? '#86efac' : analysisFeedback.overallRating === 'proficient' ? '#93c5fd' : '#fde68a') } },
                  analysisFeedback.overallRating === 'exemplary' ? tr('⭐ Exemplary') : analysisFeedback.overallRating === 'proficient' ? tr('✅ Proficient') : tr('📈 Developing'))
              ),
              analysisFeedback.characterInsight && e('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: '1px solid #bbf7d0' } }, e('div', { style: { fontSize: '10px', fontWeight: 700, color: PURPLE, marginBottom: '2px' } }, 'CHARACTERS'), e('p', { style: { fontSize: '13px', color: '#374151', margin: 0 } }, analysisFeedback.characterInsight)),
              analysisFeedback.themeInsight && e('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: '1px solid #bbf7d0' } }, e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#047857', marginBottom: '2px' } }, 'THEME'), e('p', { style: { fontSize: '13px', color: '#374151', margin: 0 } }, analysisFeedback.themeInsight)),
              analysisFeedback.craftInsight && e('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: '1px solid #bbf7d0' } }, e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#92400e', marginBottom: '2px' } }, 'CRAFT'), e('p', { style: { fontSize: '13px', color: '#374151', margin: 0 } }, analysisFeedback.craftInsight)),
              analysisFeedback.strengths && analysisFeedback.strengths.length > 0 && e('div', { style: { marginBottom: '8px' } }, e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#15803d', marginBottom: '4px' } }, tr('💪 Strengths')), e('ul', { style: { margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#166534' } }, analysisFeedback.strengths.map(function (s, i) { return e('li', { key: i }, s); }))),
              analysisFeedback.nudges && analysisFeedback.nudges.length > 0 && e('div', null, e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' } }, tr('🤔 Think Deeper')), e('ul', { style: { margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#92400e' } }, analysisFeedback.nudges.map(function (s, i) { return e('li', { key: i }, s); })))
            ),
            analysisFeedback && analysisFeedback.error && e('p', { role: 'alert', style: { color: '#dc2626', fontSize: '13px', marginTop: '12px' } }, analysisFeedback.error),

            // ── Revision Plan Capstone (gated on ≥2 helper outputs) ──
            // Pulls together AI feedback + self-assessment + emotion log + standard
            // focus into ONE prioritized 3-task plan. Mixes performance tasks
            // (re-read with different vocal expression) with analysis tasks
            // (return to a question with text evidence).
            _helpersAvailableForLitLabPlan() && e('div', { role: 'region', 'aria-label': 'Revision Plan synthesis', style: { marginTop: '16px', background: 'linear-gradient(135deg, #faf5ff, #fff7ed)', border: '2px solid #c4b5fd', borderRadius: '12px', padding: '14px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } },
                e('div', null,
                  e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#6d28d9', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' } },
                    e('span', { 'aria-hidden': 'true' }, '🗺️'), tr('Revision Plan')
                  ),
                  e('p', { style: { fontSize: '11px', color: '#5b21b6', margin: '2px 0 0' } }, tr('Try these three steps, then mark each one complete as you practice.'))
                ),
                e('button', {
                  onClick: synthesizeRevisionPlan, disabled: revisionPlanLoading,
                  'aria-busy': revisionPlanLoading ? 'true' : 'false',
                  'aria-label': revisionPlanLoading ? 'Synthesizing revision plan' : (revisionPlan && !revisionPlan.error ? tr('Re-synthesize revision plan') : tr('Build a revision plan')),
                  style: { padding: '7px 14px', background: revisionPlanLoading ? '#cbd5e1' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: revisionPlanLoading ? 'wait' : 'pointer' }
                }, revisionPlanLoading ? '⏳ Synthesizing…' : (revisionPlan && !revisionPlan.error ? tr('🔄 Rebuild') : tr('🗺️ Build plan')))
              ),
              revisionPlan && revisionPlan.error && e('p', { role: 'alert', style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '6px 0 0' } }, revisionPlan.error),
              revisionPlan && !revisionPlan.error && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' } },
                revisionPlan.encouragement && e('div', { style: { background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px' } },
                  e('p', { style: { fontSize: '11px', color: '#166534', margin: 0, lineHeight: 1.6 } }, '✨ ' + revisionPlan.encouragement)
                ),
                e('p', { role: 'status', style: { fontSize: '13px', fontWeight: 700, color: '#5b21b6', margin: '4px 0' } }, tr('{done} of {total} steps complete', { done: Object.values(completedTasks).filter(Boolean).length, total: revisionPlan.tasks.length })),
                e('ol', { 'aria-label': tr('Prioritized revision tasks'), style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' } },
                  (revisionPlan.tasks || []).map(function (t, ti) {
                    return e('li', { key: ti, style: { background: '#fff', border: '2px solid #d8b4fe', borderRadius: '10px', padding: '10px 12px' } },
                      e('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' } },
                        e('div', { 'aria-hidden': 'true', style: { background: '#7c3aed', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 } }, ti + 1),
                        e('div', { style: { minWidth: 0, flex: 1 } },
                          e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' } },
                            e('h5', { style: { fontSize: '12px', fontWeight: 800, color: '#581c87', margin: 0 } }, t.title || 'Task ' + (ti + 1)),
                            t.source && e('span', { style: { fontSize: '9px', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '2px 6px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, t.source)
                          ),
                          e('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', fontSize: '12px', color: '#5b21b6', cursor: 'pointer' } },
                            e('input', { type: 'checkbox', checked: !!completedTasks[ti], 'aria-label': tr('Mark step {number} complete: {title}', { number: ti + 1, title: t.title }), onChange: function (event) { var checked = event.target.checked; setCompletedTasks(function (previous) { return Object.assign({}, previous, { [ti]: checked }); }); }, style: { accentColor: PURPLE, width: '18px', minHeight: '18px' } }), tr('Completed')
                          ),
                          t.detail && e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.55 } }, t.detail),
                          t.why && e('p', { style: { fontSize: '11px', color: '#6b21a8', margin: '4px 0 0', fontStyle: 'italic' } }, t.why)
                        )
                      )
                    );
                  })
                )
              ),
              !revisionPlan && e('p', { style: { fontSize: '11px', color: '#5b21b6', fontStyle: 'italic', margin: '6px 0 0' } }, tr('Click "Build plan" to weave your inputs into one prioritized next step.'))
            )
          )
        )
      ),
      promptRequest && e(LitLabPromptDialog, {
        key: promptRequest.key,
        title: promptRequest.title,
        label: promptRequest.label,
        description: promptRequest.description,
        examples: promptRequest.examples,
        placeholder: promptRequest.placeholder,
        inputType: promptRequest.inputType,
        submitLabel: promptRequest.submitLabel,
        cancelLabel: tr('Cancel'),
        requiredMessage: promptRequest.requiredMessage,
        returnFocus: promptRequest.returnFocus,
        onCancel: function () { setPromptRequest(null); },
        onSubmit: submitPrompt
      })
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LitLab = LitLab;
  console.log('[CDN] LitLab module loaded');
})();
