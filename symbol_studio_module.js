(function () {
  if (window.AlloModules && window.AlloModules.SymbolStudio) {
    console.log("[CDN] SymbolStudio already loaded, skipping duplicate");
    return;
  }

  // symbol_studio_module.js — AlloFlow Visual Supports Studio
  // AI-powered visual communication toolkit: symbols, boards, schedules, social stories
  // Leverages Imagen + image-to-image editing for unlimited personalized PCS-style content
  // Version: 2.0.0 (Mar 2026)

  var warnLog = function () { console.warn.apply(console, ["[SymStudio]"].concat(Array.prototype.slice.call(arguments))); };

  // ── Print CSS injection ───────────────────────────────────────────────────
  (function injectPrintStyles() {
    var style = document.createElement('style');
    style.textContent = '@media print{body *{visibility:hidden}#ss-print-area,#ss-print-area *{visibility:visible}#ss-print-area{position:absolute;left:0;top:0;width:100%}.ss-no-print{display:none!important}}';
    document.head.appendChild(style);
  })();

  // ── Constants ─────────────────────────────────────────────────────────────
  var STORAGE_GALLERY = 'alloSymbolGallery';
  var STORAGE_AVATAR = 'alloStudentAvatar';
  var STORAGE_BOARDS = 'alloSymbolBoards';
  var STORAGE_SCHEDULES = 'alloSchedules';
  var BATCH_SIZE = 4;
  var BATCH_DELAY = 700;
  var MAX_RETRIES = 3;

  var STYLE_OPTIONS = [
    { value: '', label: 'Flat Vector (default)' },
    { value: 'simple line art, bold outlines', label: 'Line Art' },
    { value: 'friendly cartoon, vibrant colors', label: 'Cartoon' },
    { value: 'soft watercolor, gentle washes', label: 'Watercolor' },
    { value: 'bold comic book, thick outlines', label: 'Bold Comic' },
  ];

  var CAT_COLORS = { noun: '#fef9c3', verb: '#dcfce7', adjective: '#dbeafe', other: '#f3f4f6' };
  var CAT_BORDER = { noun: '#ca8a04', verb: '#16a34a', adjective: '#1d4ed8', other: '#9ca3af' };

  var TABS = [
    { id: 'symbols', icon: '🎨', label: 'Symbols' },
    { id: 'board', icon: '📋', label: 'Board Builder' },
    { id: 'schedule', icon: '📅', label: 'Visual Schedule' },
    { id: 'stories', icon: '📖', label: 'Social Stories' },
  ];

  // ── Storage helpers ───────────────────────────────────────────────────────
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key, def) { try { return JSON.parse(localStorage.getItem(key) || 'null') || def; } catch (e) { return def; } }
  function uid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2)); }

  // ── JSON helper (mirrors cleanJson from main app) ─────────────────────────
  function cleanJson(text) {
    if (!text) return '[]';
    var t = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    var fi = t.indexOf('['), fb = t.indexOf('{');
    var start = -1, end = -1;
    if (fi === -1 && fb === -1) return '[]';
    if (fi !== -1 && (fb === -1 || fi < fb)) { start = fi; end = t.lastIndexOf(']'); }
    else { start = fb; end = t.lastIndexOf('}'); }
    if (start < 0 || end <= start) return '[]';
    t = t.substring(start, end + 1);
    t = t.replace(/,\s*([}\]])/g, '$1').replace(/([}\]])\s*([{\[])/g, '$1,$2');
    return t;
  }

  function parseJson(text) {
    try { return JSON.parse(cleanJson(text)); } catch (e) {
      try { var m = text.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; }
    }
  }

  // ── Image generation core ─────────────────────────────────────────────────
  function buildSymbolPrompt(label, description, style, avatarDesc) {
    var styleStr = (style && style.trim()) ? ('Style: ' + style + '.') : 'Simple, clear, flat vector art style.';
    var ctx = (description && description.trim()) ? (' (Context: ' + description.trim() + ')') : '';
    var charCtx = (avatarDesc && avatarDesc.trim())
      ? (' Feature a child matching this description: ' + avatarDesc.trim() + '.')
      : '';
    return 'Icon style illustration of "' + label.trim() + '"' + ctx + '.' + charCtx + ' ' + styleStr + ' White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.';
  }

  async function genImage(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarBase64, width) {
    var imageUrl = await onCallImagen(prompt, width || 400, 0.85);
    // Pass 2: auto-clean text
    if (autoClean && imageUrl) {
      try {
        var raw = imageUrl.split(',')[1];
        var cleaned = await onCallGeminiImageEdit("Remove all text, labels, letters, and numbers from the image. Keep the illustration clean and simple.", raw, width || 400, 0.85);
        if (cleaned) imageUrl = cleaned;
      } catch (e) { warnLog("Auto-clean failed:", e.message); }
    }
    // Pass 3: character consistency (if avatar provided)
    if (avatarBase64 && imageUrl) {
      try {
        var raw2 = imageUrl.split(',')[1];
        var consistent = await onCallGeminiImageEdit(
          "Make the child or person in this illustration visually consistent with the reference portrait. Maintain the same flat icon art style. White background. STRICTLY NO TEXT.",
          raw2, width || 400, 0.85, avatarBase64
        );
        if (consistent) imageUrl = consistent;
      } catch (e) { warnLog("Character consistency pass failed:", e.message); }
    }
    return imageUrl;
  }

  async function genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarBase64, width) {
    for (var attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) await new Promise(function (r) { setTimeout(r, 1000 * Math.pow(2, attempt)); });
        return await genImage(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarBase64, width);
      } catch (e) {
        if (attempt === MAX_RETRIES - 1) throw e;
      }
    }
  }

  async function batchGenerate(items, onCallImagen, onCallGeminiImageEdit, autoClean, avatarBase64, style, onProgress) {
    var results = [];
    for (var i = 0; i < items.length; i += BATCH_SIZE) {
      var batch = items.slice(i, i + BATCH_SIZE);
      var batchResults = await Promise.all(batch.map(async function (item) {
        try {
          var prompt = buildSymbolPrompt(item.label, item.description || '', style || '', avatarBase64 ? '' : '');
          var imageUrl = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarBase64);
          if (onProgress) onProgress(item.id || item.label);
          return Object.assign({}, item, { image: imageUrl });
        } catch (e) {
          warnLog('Failed for "' + (item.label || '') + '":', e.message);
          return Object.assign({}, item, { image: null });
        }
      }));
      results = results.concat(batchResults);
      if (i + BATCH_SIZE < items.length) await new Promise(function (r) { setTimeout(r, BATCH_DELAY); });
    }
    return results;
  }

  // ── Main component ────────────────────────────────────────────────────────
  var SymbolStudio = React.memo(function SymbolStudio(props) {
    var onCallImagen = props.onCallImagen;
    var onCallGeminiImageEdit = props.onCallGeminiImageEdit;
    var onCallGemini = props.onCallGemini;
    var onCallTTS = props.onCallTTS;
    var selectedVoice = props.selectedVoice;
    var addToast = props.addToast;
    var onClose = props.onClose;
    var isOpen = props.isOpen;

    var e = React.createElement;
    var useState = React.useState;
    var useCallback = React.useCallback;
    var useRef = React.useRef;

    // Shared state
    var _tab = useState('symbols'); var tab = _tab[0]; var setTab = _tab[1];
    var _studentAvatar = useState(function () { return load(STORAGE_AVATAR, { image: null, name: '', description: '' }); });
    var studentAvatar = _studentAvatar[0]; var setStudentAvatar = _studentAvatar[1];
    var _showAvatar = useState(false); var showAvatar = _showAvatar[0]; var setShowAvatar = _showAvatar[1];
    var _avatarGenerating = useState(false); var avatarGenerating = _avatarGenerating[0]; var setAvatarGenerating = _avatarGenerating[1];
    var _avatarDesc = useState(studentAvatar.description || ''); var avatarDesc = _avatarDesc[0]; var setAvatarDesc = _avatarDesc[1];
    var _avatarName = useState(studentAvatar.name || ''); var avatarName = _avatarName[0]; var setAvatarName = _avatarName[1];
    var _globalStyle = useState(''); var globalStyle = _globalStyle[0]; var setGlobalStyle = _globalStyle[1];
    var _autoClean = useState(true); var autoClean = _autoClean[0]; var setAutoClean = _autoClean[1];
    var fileInputRef = useRef(null);
    var scheduleFileRef = useRef(null);

    // Symbols tab state
    var _gallery = useState(function () { return load(STORAGE_GALLERY, []); });
    var gallery = _gallery[0]; var setGallery = _gallery[1];
    var _selectedId = useState(null); var selectedId = _selectedId[0]; var setSelectedId = _selectedId[1];
    var _symLabel = useState(''); var symLabel = _symLabel[0]; var setSymLabel = _symLabel[1];
    var _symDesc = useState(''); var symDesc = _symDesc[0]; var setSymDesc = _symDesc[1];
    var _symBatch = useState(''); var symBatch = _symBatch[0]; var setSymBatch = _symBatch[1];
    var _symMode = useState('single'); var symMode = _symMode[0]; var setSymMode = _symMode[1];
    var _symLoading = useState({}); var symLoading = _symLoading[0]; var setSymLoading = _symLoading[1];
    var _symRefine = useState({}); var symRefine = _symRefine[0]; var setSymRefine = _symRefine[1];
    var _symFilter = useState(''); var symFilter = _symFilter[0]; var setSymFilter = _symFilter[1];

    // Board Builder state
    var _boardTopic = useState(''); var boardTopic = _boardTopic[0]; var setBoardTopic = _boardTopic[1];
    var _boardWords = useState([]); var boardWords = _boardWords[0]; var setBoardWords = _boardWords[1];
    var _boardCols = useState(4); var boardCols = _boardCols[0]; var setBoardCols = _boardCols[1];
    var _boardLoading = useState({}); var boardLoading = _boardLoading[0]; var setBoardLoading = _boardLoading[1];
    var _boardGenerating = useState(false); var boardGenerating = _boardGenerating[0]; var setBoardGenerating = _boardGenerating[1];
    var _boardTitle = useState(''); var boardTitle = _boardTitle[0]; var setBoardTitle = _boardTitle[1];
    var _boardColor = useState(true); var boardColor = _boardColor[0]; var setBoardColor = _boardColor[1];
    var _savedBoards = useState(function () { return load(STORAGE_BOARDS, []); });
    var savedBoards = _savedBoards[0]; var setSavedBoards = _savedBoards[1];
    var _showBoardGallery = useState(false); var showBoardGallery = _showBoardGallery[0]; var setShowBoardGallery = _showBoardGallery[1];

    // Schedule state
    var _schedItems = useState([]); var schedItems = _schedItems[0]; var setSchedItems = _schedItems[1];
    var _schedInput = useState(''); var schedInput = _schedInput[0]; var setSchedInput = _schedInput[1];
    var _schedGenerating = useState(false); var schedGenerating = _schedGenerating[0]; var setSchedGenerating = _schedGenerating[1];
    var _schedOrientation = useState('horizontal'); var schedOrientation = _schedOrientation[0]; var setSchedOrientation = _schedOrientation[1];
    var _schedTitle = useState(''); var schedTitle = _schedTitle[0]; var setSchedTitle = _schedTitle[1];
    var _schedNowId = useState(null); var schedNowId = _schedNowId[0]; var setSchedNowId = _schedNowId[1];
    var _savedSchedules = useState(function () { return load(STORAGE_SCHEDULES, []); });
    var savedSchedules = _savedSchedules[0]; var setSavedSchedules = _savedSchedules[1];

    // Social Stories state
    var _storySituation = useState(''); var storySituation = _storySituation[0]; var setStorySituation = _storySituation[1];
    var _storyStudentName = useState(studentAvatar.name || ''); var storyStudentName = _storyStudentName[0]; var setStoryStudentName = _storyStudentName[1];
    var _storyDetails = useState(''); var storyDetails = _storyDetails[0]; var setStoryDetails = _storyDetails[1];
    var _storyPages = useState([]); var storyPages = _storyPages[0]; var setStoryPages = _storyPages[1];
    var _storyCurrent = useState(0); var storyCurrent = _storyCurrent[0]; var setStoryCurrent = _storyCurrent[1];
    var _storyGenerating = useState(false); var storyGenerating = _storyGenerating[0]; var setStoryGenerating = _storyGenerating[1];
    var _storyIllustrating = useState({}); var storyIllustrating = _storyIllustrating[0]; var setStoryIllustrating = _storyIllustrating[1];
    var _storySpeaking = useState(false); var storySpeaking = _storySpeaking[0]; var setStorySpeaking = _storySpeaking[1];

    if (!isOpen) return null;

    var avatarRef = studentAvatar.image ? studentAvatar.image.split(',')[1] : null;

    // ── Avatar actions ────────────────────────────────────────────────────
    var generateAvatar = useCallback(async function () {
      if (!onCallImagen || !avatarDesc.trim()) return;
      setAvatarGenerating(true);
      try {
        var prompt = 'Friendly stylized portrait of a child: ' + avatarDesc.trim() + '. Soft cartoon style, centered head and shoulders, warm expression, white background. STRICTLY NO TEXT.';
        var img = await onCallImagen(prompt, 300, 0.9);
        if (onCallGeminiImageEdit && img) {
          var raw = img.split(',')[1];
          img = await onCallGeminiImageEdit('Refine this child portrait. Make it warm, friendly, and consistent with the description: "' + avatarDesc.trim() + '". Clean white background. Remove any text.', raw, 300, 0.9) || img;
        }
        var updated = { image: img, name: avatarName, description: avatarDesc };
        setStudentAvatar(updated);
        store(STORAGE_AVATAR, updated);
        setStoryStudentName(avatarName);
        addToast && addToast({ message: 'Student avatar created!', type: 'success' });
      } catch (e) {
        warnLog("Avatar generation failed:", e);
        addToast && addToast({ message: 'Avatar generation failed', type: 'error' });
      } finally { setAvatarGenerating(false); }
    }, [avatarDesc, avatarName, onCallImagen, onCallGeminiImageEdit, addToast]);

    var uploadAvatarFile = useCallback(function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = ev.target.result;
        var updated = { image: img, name: avatarName, description: avatarDesc };
        setStudentAvatar(updated);
        store(STORAGE_AVATAR, updated);
        addToast && addToast({ message: 'Avatar photo uploaded!', type: 'success' });
      };
      reader.readAsDataURL(file);
    }, [avatarName, avatarDesc, addToast]);

    var clearAvatar = useCallback(function () {
      var updated = { image: null, name: '', description: '' };
      setStudentAvatar(updated);
      store(STORAGE_AVATAR, updated);
      setAvatarDesc(''); setAvatarName('');
    }, []);

    // ── Symbol actions ────────────────────────────────────────────────────
    var genSingle = useCallback(async function () {
      if (!symLabel.trim() || !onCallImagen) return;
      var tid = 'pend-' + Date.now();
      setSymLoading(function (p) { var n = Object.assign({}, p); n[tid] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(symLabel, symDesc, globalStyle, avatarRef ? avatarDesc : '');
        var imageUrl = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 400);
        var entry = { id: uid(), label: symLabel.trim(), description: symDesc.trim(), image: imageUrl, style: globalStyle || 'flat vector', createdAt: Date.now() };
        var updated = [entry].concat(gallery);
        setGallery(updated); store(STORAGE_GALLERY, updated);
        setSelectedId(entry.id);
        addToast && addToast({ message: 'Symbol created!', type: 'success' });
      } catch (e) {
        addToast && addToast({ message: 'Generation failed: ' + e.message, type: 'error' });
      } finally { setSymLoading(function (p) { var n = Object.assign({}, p); delete n[tid]; return n; }); }
    }, [symLabel, symDesc, globalStyle, gallery, autoClean, avatarRef, avatarDesc, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genBatch = useCallback(async function () {
      if (!onCallImagen) return;
      var lines = symBatch.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;
      var items = lines.map(function (l) { return { id: uid(), label: l, description: '', style: globalStyle || 'flat vector', createdAt: Date.now() }; });
      var loadMap = {};
      items.forEach(function (i) { loadMap[i.id] = true; });
      setSymLoading(function (p) { return Object.assign({}, p, loadMap); });
      var results = await batchGenerate(
        items, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, globalStyle,
        function (id) { setSymLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
      );
      var valid = results.filter(function (r) { return r.image; });
      if (valid.length > 0) {
        var updated = valid.concat(gallery);
        setGallery(updated); store(STORAGE_GALLERY, updated);
        setSelectedId(valid[0].id);
        addToast && addToast({ message: valid.length + ' symbol(s) created!', type: 'success' });
      }
      setSymLoading({});
    }, [symBatch, globalStyle, gallery, autoClean, avatarRef, onCallImagen, onCallGeminiImageEdit, addToast]);

    var regenSymbol = useCallback(async function (id) {
      var item = gallery.find(function (i) { return i.id === id; });
      if (!item || !onCallImagen) return;
      setSymLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(item.label, item.description, item.style, avatarRef ? avatarDesc : '');
        var imageUrl = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 400);
        var updated = gallery.map(function (i) { return i.id === id ? Object.assign({}, i, { image: imageUrl }) : i; });
        setGallery(updated); store(STORAGE_GALLERY, updated);
      } catch (e) {
        addToast && addToast({ message: 'Regen failed', type: 'error' });
      } finally { setSymLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [gallery, autoClean, avatarRef, avatarDesc, onCallImagen, onCallGeminiImageEdit, addToast]);

    var refineSymbol = useCallback(async function (id, instruction) {
      var item = gallery.find(function (i) { return i.id === id; });
      if (!item || !instruction.trim() || !onCallGeminiImageEdit) return;
      setSymLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var raw = item.image.split(',')[1];
        var refined = await onCallGeminiImageEdit('Edit this educational icon. ' + instruction + ' Maintain simple, flat vector art style. White background. STRICTLY NO TEXT.', raw, 400, 0.85);
        if (refined) {
          var updated = gallery.map(function (i) { return i.id === id ? Object.assign({}, i, { image: refined }) : i; });
          setGallery(updated); store(STORAGE_GALLERY, updated);
          setSymRefine(function (p) { var n = Object.assign({}, p); n[id] = ''; return n; });
        }
      } catch (e) {
        addToast && addToast({ message: 'Refinement failed', type: 'error' });
      } finally { setSymLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [gallery, onCallGeminiImageEdit, addToast]);

    var deleteSymbol = useCallback(function (id) {
      var updated = gallery.filter(function (i) { return i.id !== id; });
      setGallery(updated); store(STORAGE_GALLERY, updated);
      if (selectedId === id) setSelectedId(updated.length ? updated[0].id : null);
    }, [gallery, selectedId]);

    var downloadSym = useCallback(function (item) {
      var a = document.createElement('a');
      a.href = item.image; a.download = item.label.replace(/\s+/g, '_') + '.png'; a.click();
    }, []);

    var downloadAll = useCallback(function () {
      gallery.forEach(function (item, i) { setTimeout(function () { var a = document.createElement('a'); a.href = item.image; a.download = (i + 1) + '_' + item.label.replace(/\s+/g, '_') + '.png'; a.click(); }, i * 250); });
    }, [gallery]);

    // ── Board Builder actions ─────────────────────────────────────────────
    var generateBoardFromTopic = useCallback(async function () {
      if (!boardTopic.trim() || !onCallGemini) return;
      setBoardGenerating(true);
      try {
        var prompt = 'Create a communication board for the topic: "' + boardTopic.trim() + '".\n'
          + 'Generate 8-16 items most useful for communication about this topic.\n'
          + 'Return ONLY a JSON array:\n'
          + '[{ "label": "word or short phrase", "description": "one-sentence context for icon generation", "category": "noun" | "verb" | "adjective" | "other" }]\n'
          + 'Include a natural mix of nouns, verbs, and adjectives. Focus on functional vocabulary.';
        var result = await onCallGemini(prompt, true);
        var parsed = parseJson(result);
        if (!Array.isArray(parsed) || !parsed.length) throw new Error('Could not parse word list');
        setBoardTitle(boardTopic.trim());
        setBoardWords(parsed.map(function (w) { return Object.assign({ id: uid(), image: null }, w); }));
        addToast && addToast({ message: parsed.length + ' words ready — click Generate Images!', type: 'success' });
      } catch (e) {
        warnLog("Board word gen failed:", e);
        addToast && addToast({ message: 'Word list generation failed: ' + e.message, type: 'error' });
      } finally { setBoardGenerating(false); }
    }, [boardTopic, onCallGemini, addToast]);

    var generateBoardImages = useCallback(async function () {
      if (!boardWords.length || !onCallImagen) return;
      var items = boardWords.filter(function (w) { return !w.image; });
      if (!items.length) { addToast && addToast({ message: 'All images already generated', type: 'info' }); return; }
      var loadMap = {};
      items.forEach(function (i) { loadMap[i.id] = true; });
      setBoardLoading(function (p) { return Object.assign({}, p, loadMap); });
      var results = await batchGenerate(
        items, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, globalStyle,
        function (id) { setBoardLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
      );
      setBoardWords(function (prev) {
        var map = {};
        results.forEach(function (r) { map[r.id] = r; });
        return prev.map(function (w) { return map[w.id] ? Object.assign({}, w, { image: map[w.id].image }) : w; });
      });
      setBoardLoading({});
      addToast && addToast({ message: 'Board images generated!', type: 'success' });
    }, [boardWords, autoClean, avatarRef, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

    var regenBoardCell = useCallback(async function (id) {
      var word = boardWords.find(function (w) { return w.id === id; });
      if (!word || !onCallImagen) return;
      setBoardLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(word.label, word.description, globalStyle, avatarRef ? avatarDesc : '');
        var imageUrl = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 300);
        setBoardWords(function (prev) { return prev.map(function (w) { return w.id === id ? Object.assign({}, w, { image: imageUrl }) : w; }); });
      } catch (e) {
        addToast && addToast({ message: 'Image failed for ' + (word.label || ''), type: 'error' });
      } finally { setBoardLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [boardWords, globalStyle, autoClean, avatarRef, avatarDesc, onCallImagen, onCallGeminiImageEdit, addToast]);

    var saveBoard = useCallback(function () {
      if (!boardWords.length) return;
      var saved = { id: uid(), title: boardTitle || boardTopic, words: boardWords, cols: boardCols, createdAt: Date.now() };
      var updated = [saved].concat(savedBoards);
      setSavedBoards(updated); store(STORAGE_BOARDS, updated);
      addToast && addToast({ message: 'Board saved!', type: 'success' });
    }, [boardWords, boardTitle, boardTopic, boardCols, savedBoards, addToast]);

    var printBoard = useCallback(function () {
      window.print();
    }, []);

    var speakCell = useCallback(function (label) {
      if (onCallTTS) onCallTTS(label, selectedVoice || 'Kore', 1);
    }, [onCallTTS, selectedVoice]);

    // ── Schedule actions ──────────────────────────────────────────────────
    var generateSchedule = useCallback(async function () {
      var lines = schedInput.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length || !onCallImagen) return;
      setSchedGenerating(true);
      var items = lines.map(function (l) { return { id: uid(), label: l, image: null, complete: false }; });
      setSchedItems(items);
      setSchedNowId(items[0].id);
      var loadMap = {};
      items.forEach(function (i) { loadMap[i.id] = true; });
      try {
        var results = await batchGenerate(
          items, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, globalStyle,
          null
        );
        setSchedItems(results);
        setSchedNowId(results[0] ? results[0].id : null);
        addToast && addToast({ message: 'Schedule generated!', type: 'success' });
      } catch (e) {
        addToast && addToast({ message: 'Schedule generation failed', type: 'error' });
      } finally { setSchedGenerating(false); }
    }, [schedInput, autoClean, avatarRef, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

    var toggleComplete = useCallback(function (id) {
      setSchedItems(function (prev) { return prev.map(function (i) { return i.id === id ? Object.assign({}, i, { complete: !i.complete }) : i; }); });
      // Auto-advance Now indicator
      setSchedNowId(function (nowId) {
        if (nowId !== id) return nowId;
        var idx = schedItems.findIndex(function (i) { return i.id === id; });
        var next = schedItems.find(function (i, j) { return j > idx && !i.complete; });
        return next ? next.id : nowId;
      });
    }, [schedItems]);

    var saveSchedule = useCallback(function () {
      if (!schedItems.length) return;
      var saved = { id: uid(), title: schedTitle || 'Schedule', items: schedItems, orientation: schedOrientation, createdAt: Date.now() };
      var updated = [saved].concat(savedSchedules);
      setSavedSchedules(updated); store(STORAGE_SCHEDULES, updated);
      addToast && addToast({ message: 'Schedule saved!', type: 'success' });
    }, [schedItems, schedTitle, schedOrientation, savedSchedules, addToast]);

    var resetSchedule = useCallback(function () {
      setSchedItems(function (prev) { return prev.map(function (i) { return Object.assign({}, i, { complete: false }); }); });
      setSchedNowId(schedItems.length ? schedItems[0].id : null);
    }, [schedItems]);

    // ── Social Story actions ──────────────────────────────────────────────
    var generateStory = useCallback(async function () {
      if (!storySituation.trim() || !onCallGemini) return;
      setStoryGenerating(true);
      setStoryPages([]);
      setStoryCurrent(0);
      try {
        var name = storyStudentName.trim() || 'the student';
        var prompt = 'Write a social story in Carol Gray format for ' + name + ' about: "' + storySituation.trim() + '".\n'
          + (storyDetails.trim() ? 'Additional details: ' + storyDetails.trim() + '\n' : '')
          + '\nCarol Gray rules:\n'
          + '- Descriptive sentences: factual, 3rd-person descriptions (majority of text)\n'
          + '- Perspective sentences: describe others\' thoughts and feelings\n'
          + '- Directive sentences: gentle, positive guidance starting with "I can..." or "I will try to..."\n'
          + '- Use calm, warm, encouraging language. Never threatening or frightening.\n'
          + '- Use the student\'s name (' + name + ') throughout.\n'
          + '\nFormat as 5-7 short pages. Each page = 2-3 sentences.\n'
          + '\nReturn ONLY a JSON array:\n'
          + '[{ "text": "page text here", "imagePrompt": "brief scene description for illustration, e.g. \'A child sitting with friends at a lunch table, smiling\'" }]';
        var result = await onCallGemini(prompt, true);
        var parsed = parseJson(result);
        if (!Array.isArray(parsed) || !parsed.length) throw new Error('Could not parse story');
        var pages = parsed.map(function (p) { return { id: uid(), text: p.text || '', imagePrompt: p.imagePrompt || '', image: null }; });
        setStoryPages(pages);
        addToast && addToast({ message: 'Story written! Generating illustrations...', type: 'success' });
        // Auto-generate illustrations
        if (onCallImagen) {
          var illMap = {};
          pages.forEach(function (p) { illMap[p.id] = true; });
          setStoryIllustrating(illMap);
          for (var i = 0; i < pages.length; i++) {
            (function (page) {
              var fullPrompt = page.imagePrompt
                ? ('Illustration for a children\'s social story: ' + page.imagePrompt + '. Warm, friendly, child-appropriate watercolor style. Simple composition. White or soft background. STRICTLY NO TEXT.')
                : ('Warm illustration of a child in a social situation, friendly, simple, child-appropriate. NO TEXT.');
              genWithRetry(fullPrompt, onCallImagen, onCallGeminiImageEdit, false, avatarRef, 600)
                .then(function (img) {
                  setStoryPages(function (prev) { return prev.map(function (pp) { return pp.id === page.id ? Object.assign({}, pp, { image: img }) : pp; }); });
                  setStoryIllustrating(function (p) { var n = Object.assign({}, p); delete n[page.id]; return n; });
                })
                .catch(function (e) {
                  warnLog("Illustration failed:", e.message);
                  setStoryIllustrating(function (p) { var n = Object.assign({}, p); delete n[page.id]; return n; });
                });
            })(pages[i]);
            if (i < pages.length - 1) await new Promise(function (r) { setTimeout(r, BATCH_DELAY); });
          }
        }
      } catch (e) {
        warnLog("Story generation failed:", e);
        addToast && addToast({ message: 'Story generation failed: ' + e.message, type: 'error' });
      } finally { setStoryGenerating(false); }
    }, [storySituation, storyStudentName, storyDetails, avatarRef, onCallGemini, onCallImagen, onCallGeminiImageEdit, addToast]);

    var speakPage = useCallback(function (text) {
      if (onCallTTS) { setStorySpeaking(true); onCallTTS(text, selectedVoice || 'Kore', 1); setTimeout(function () { setStorySpeaking(false); }, 3000); }
    }, [onCallTTS, selectedVoice]);

    var regenPageIllustration = useCallback(async function (pageId) {
      var page = storyPages.find(function (p) { return p.id === pageId; });
      if (!page || !onCallImagen) return;
      setStoryIllustrating(function (p) { var n = Object.assign({}, p); n[pageId] = true; return n; });
      try {
        var prompt = page.imagePrompt
          ? ('Illustration for a children\'s social story: ' + page.imagePrompt + '. Warm, friendly watercolor style. NO TEXT.')
          : ('Warm illustration of a child in a social situation, friendly, simple. NO TEXT.');
        var img = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, false, avatarRef, 600);
        setStoryPages(function (prev) { return prev.map(function (pp) { return pp.id === pageId ? Object.assign({}, pp, { image: img }) : pp; }); });
      } catch (e) {
        addToast && addToast({ message: 'Illustration failed', type: 'error' });
      } finally { setStoryIllustrating(function (p) { var n = Object.assign({}, p); delete n[pageId]; return n; }); }
    }, [storyPages, avatarRef, onCallImagen, onCallGeminiImageEdit, addToast]);

    // ── Styles ─────────────────────────────────────────────────────────────
    var PURPLE = '#7c3aed'; var DARK_PURPLE = '#5b21b6'; var LIGHT_PURPLE = '#ede9fe';
    var S = {
      overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '12px', boxSizing: 'border-box' },
      modal: { background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' },
      header: { background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', padding: '12px 18px', flexShrink: 0 },
      tabBar: { display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '3px', marginTop: '10px' },
      body: { display: 'flex', flex: 1, overflow: 'hidden' },
      leftCol: { width: '250px', flexShrink: 0, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
      rightCol: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
      lbl: { fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' },
      input: { width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
      textarea: { width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 9px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
      btn: function (bg, color, disabled) { return { padding: '8px 14px', background: disabled ? '#d1d5db' : (bg || PURPLE), color: disabled ? '#9ca3af' : (color || '#fff'), border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }; },
      chip: function (bg, color) { return { padding: '3px 8px', background: bg, color: color, border: '1px solid ' + color, borderRadius: '20px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }; },
      card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    };

    // ── Sub-render helpers ─────────────────────────────────────────────────
    function tabBtn(t) {
      var active = tab === t.id;
      return e('button', {
        key: t.id, onClick: function () { setTab(t.id); },
        style: { flex: 1, padding: '6px 4px', borderRadius: '7px', border: 'none', background: active ? '#fff' : 'transparent', color: active ? PURPLE : 'rgba(255,255,255,0.8)', fontWeight: active ? 700 : 500, fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15)' : 'none', transition: 'all 0.15s' }
      }, e('span', { style: { fontSize: '14px' } }, t.icon), t.label);
    }

    function spinner(size) {
      return e('div', { style: { width: size, height: size, border: '3px solid #e5e7eb', borderTop: '3px solid ' + PURPLE, borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' } });
    }

    function sectionLabel(text) {
      return e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, text);
    }

    // ── Shared left column ─────────────────────────────────────────────────
    function renderSharedLeft() {
      return e('div', { style: S.leftCol },
        // Avatar panel
        e('div', { style: Object.assign({}, S.card, { cursor: 'pointer' }), onClick: function () { setShowAvatar(!showAvatar); } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            studentAvatar.image
              ? e('img', { src: studentAvatar.image, style: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid ' + PURPLE } })
              : e('div', { style: { width: 36, height: 36, borderRadius: '50%', background: LIGHT_PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 } }, '👤'),
            e('div', null,
              e('div', { style: { fontWeight: 700, fontSize: '12px', color: '#1f2937' } }, studentAvatar.name || 'Student Avatar'),
              e('div', { style: { fontSize: '10px', color: studentAvatar.image ? '#16a34a' : '#9ca3af' } }, studentAvatar.image ? '✓ Active — symbols personalized' : 'Add to personalize symbols'),
            ),
            e('span', { style: { marginLeft: 'auto', color: '#9ca3af', fontSize: '12px' } }, showAvatar ? '▲' : '▼')
          ),
          showAvatar && e('div', { style: { marginTop: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }, onClick: function (ev) { ev.stopPropagation(); } },
            e('label', { style: S.lbl }, 'Student Name'),
            e('input', { type: 'text', value: avatarName, onChange: function (ev) { setAvatarName(ev.target.value); }, placeholder: 'e.g. Marcus', style: Object.assign({}, S.input, { marginBottom: '6px' }) }),
            e('label', { style: S.lbl }, 'Describe appearance'),
            e('input', { type: 'text', value: avatarDesc, onChange: function (ev) { setAvatarDesc(ev.target.value); }, placeholder: 'e.g. 8-year-old boy with curly brown hair', style: Object.assign({}, S.input, { marginBottom: '8px' }) }),
            e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              e('button', { onClick: generateAvatar, disabled: avatarGenerating || !avatarDesc.trim(), style: S.btn(PURPLE, '#fff', avatarGenerating || !avatarDesc.trim()) }, avatarGenerating ? '⏳' : '✨ Generate'),
              e('button', { onClick: function () { fileInputRef.current && fileInputRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '📷 Upload'),
              studentAvatar.image && e('button', { onClick: clearAvatar, style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️')
            ),
            e('input', { type: 'file', accept: 'image/*', ref: fileInputRef, style: { display: 'none' }, onChange: uploadAvatarFile })
          )
        ),
        // Global settings
        e('div', { style: S.card },
          sectionLabel('Global Settings'),
          e('label', { style: S.lbl }, 'Art Style'),
          e('select', { value: globalStyle, onChange: function (ev) { setGlobalStyle(ev.target.value); }, style: Object.assign({}, S.input, { marginBottom: '8px' }) },
            STYLE_OPTIONS.map(function (o) { return e('option', { key: o.value, value: o.value }, o.label); })
          ),
          e('label', { style: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: '#374151' } },
            e('input', { type: 'checkbox', checked: autoClean, onChange: function (ev) { setAutoClean(ev.target.checked); } }),
            e('span', null, 'Auto-clean text from images')
          ),
          e('p', { style: { fontSize: '10px', color: '#9ca3af', margin: '3px 0 0' } }, 'Runs a second AI pass to strip any embedded labels')
        )
      );
    }

    // ── Symbol Gallery tab ─────────────────────────────────────────────────
    function renderSymbolsTab() {
      var selectedItem = gallery.find(function (i) { return i.id === selectedId; }) || null;
      var filtered = symFilter.trim() ? gallery.filter(function (i) { return i.label.toLowerCase().includes(symFilter.toLowerCase()); }) : gallery;
      var isLoading = Object.keys(symLoading).length > 0;
      return e('div', { style: { display: 'flex', gap: '14px', padding: '16px', flex: 1, overflow: 'hidden' } },
        // Input panel
        e('div', { style: { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' } },
          // Mode toggle
          e('div', { style: { display: 'flex', gap: '3px', background: '#f3f4f6', borderRadius: '8px', padding: '3px' } },
            ['single', 'batch'].map(function (m) {
              return e('button', { key: m, onClick: function () { setSymMode(m); }, style: { flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: symMode === m ? '#fff' : 'transparent', fontWeight: symMode === m ? 700 : 400, fontSize: '11px', cursor: 'pointer', color: symMode === m ? PURPLE : '#6b7280', boxShadow: symMode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' } }, m === 'single' ? '✏️ Single' : '📋 Batch');
            })
          ),
          symMode === 'single'
            ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: '7px' } },
                e('div', null, e('label', { style: S.lbl }, 'Label'), e('input', { type: 'text', value: symLabel, onChange: function (ev) { setSymLabel(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') genSingle(); }, placeholder: 'e.g. wash hands', style: S.input, autoFocus: true })),
                e('div', null, e('label', { style: S.lbl }, 'Context (optional)'), e('input', { type: 'text', value: symDesc, onChange: function (ev) { setSymDesc(ev.target.value); }, placeholder: 'e.g. hygiene routine', style: S.input }))
              )
            : e('div', null,
                e('label', { style: S.lbl }, 'One label per line'),
                e('textarea', { value: symBatch, onChange: function (ev) { setSymBatch(ev.target.value); }, placeholder: 'brush teeth\nget dressed\neat breakfast', style: Object.assign({}, S.textarea, { height: '90px' }) }),
                e('p', { style: { fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' } }, symBatch.split('\n').filter(function (l) { return l.trim(); }).length + ' queued')
              ),
          e('button', { onClick: symMode === 'single' ? genSingle : genBatch, disabled: isLoading || (symMode === 'single' ? !symLabel.trim() : !symBatch.trim()), style: S.btn(PURPLE, '#fff', isLoading || (symMode === 'single' ? !symLabel.trim() : !symBatch.trim())) },
            isLoading ? '⏳ Generating...' : '✨ Generate' + (symMode === 'batch' ? ' Batch' : '')
          ),
          gallery.length > 0 && e('button', { onClick: downloadAll, style: S.btn('#f3f4f6', '#374151', false) }, '⬇️ Download All (' + gallery.length + ')')
        ),
        // Preview + gallery
        e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '10px' } },
          // Selected preview
          selectedItem && e('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', display: 'flex', gap: '14px', flexShrink: 0 } },
            symLoading[selectedItem.id]
              ? e('div', { style: { width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', flexShrink: 0 } }, spinner(32))
              : e('img', { src: selectedItem.image, alt: selectedItem.label, style: { width: 120, height: 120, objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', padding: '4px', flexShrink: 0 } }),
            e('div', { style: { flex: 1 } },
              e('h3', { style: { fontWeight: 700, fontSize: '16px', color: '#111827', margin: '0 0 6px' } }, selectedItem.label),
              e('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' } },
                e('button', { onClick: function () { regenSymbol(selectedItem.id); }, disabled: !!symLoading[selectedItem.id], style: S.btn(LIGHT_PURPLE, PURPLE, !!symLoading[selectedItem.id]) }, '🔄 Regen'),
                e('button', { onClick: function () { refineSymbol(selectedItem.id, 'Remove all text, labels, letters, and words from the image. Keep the illustration clean.'); }, disabled: !!symLoading[selectedItem.id], style: S.btn('#fee2e2', '#b91c1c', !!symLoading[selectedItem.id]) }, '🚫 Remove Text'),
                e('button', { onClick: function () { speakCell(selectedItem.label); }, style: S.btn('#dcfce7', '#166534', false) }, '🔊 Speak'),
                e('button', { onClick: function () { downloadSym(selectedItem); }, style: S.btn('#dbeafe', '#1e40af', false) }, '⬇️ PNG'),
                e('button', { onClick: function () { deleteSymbol(selectedItem.id); }, style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️')
              ),
              e('div', { style: { display: 'flex', gap: '6px' } },
                e('input', { type: 'text', value: symRefine[selectedItem.id] || '', onChange: function (ev) { var v = ev.target.value; setSymRefine(function (p) { var n = Object.assign({}, p); n[selectedItem.id] = v; return n; }); }, onKeyDown: function (ev) { if (ev.key === 'Enter' && symRefine[selectedItem.id]) refineSymbol(selectedItem.id, symRefine[selectedItem.id]); }, placeholder: 'Edit: make it a girl, add red X, change background...', style: Object.assign({}, S.input, { border: '1px solid #fbbf24' }) }),
                e('button', { onClick: function () { if (symRefine[selectedItem.id]) refineSymbol(selectedItem.id, symRefine[selectedItem.id]); }, disabled: !symRefine[selectedItem.id] || !!symLoading[selectedItem.id], style: S.btn('#fef3c7', '#92400e', !symRefine[selectedItem.id] || !!symLoading[selectedItem.id]) }, '✏️')
              )
            )
          ),
          // Gallery grid
          e('div', { style: { flex: 1, overflowY: 'auto' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
              e('span', { style: { fontWeight: 600, fontSize: '12px', color: '#374151' } }, 'Gallery (' + gallery.length + ')'),
              e('input', { type: 'text', value: symFilter, onChange: function (ev) { setSymFilter(ev.target.value); }, placeholder: 'Filter...', style: { border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', outline: 'none', marginLeft: 'auto', width: '100px' } })
            ),
            filtered.length > 0
              ? e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: '7px' } },
                  filtered.map(function (item) {
                    return e('div', { key: item.id, onClick: function () { setSelectedId(item.id); }, style: { cursor: 'pointer', borderRadius: '8px', border: item.id === selectedId ? '2px solid ' + PURPLE : '2px solid #e5e7eb', background: item.id === selectedId ? LIGHT_PURPLE : '#fafafa', padding: '7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'border-color 0.15s' } },
                      symLoading[item.id]
                        ? e('div', { style: { width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '6px' } }, spinner(20))
                        : e('img', { src: item.image, alt: item.label, style: { width: 56, height: 56, objectFit: 'contain', borderRadius: '6px', background: '#fff' } }),
                      e('span', { style: { fontSize: '10px', color: '#4b5563', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3 } }, item.label)
                    );
                  })
                )
              : e('div', { style: { textAlign: 'center', color: '#9ca3af', padding: '30px 0', fontSize: '13px' } }, gallery.length === 0 ? 'Generate your first symbol using the panel on the left.' : 'No symbols match "' + symFilter + '"')
          )
        )
      );
    }

    // ── Board Builder tab ──────────────────────────────────────────────────
    function renderBoardTab() {
      var hasImages = boardWords.some(function (w) { return w.image; });
      var isLoading = Object.keys(boardLoading).length > 0 || boardGenerating;
      return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px', gap: '12px' } },
        // Controls row
        e('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 } },
          e('div', { style: { flex: 1, minWidth: '200px' } },
            e('label', { style: S.lbl }, 'Topic'),
            e('input', { type: 'text', value: boardTopic, onChange: function (ev) { setBoardTopic(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') generateBoardFromTopic(); }, placeholder: 'e.g. morning routine, feelings, playground', style: S.input, autoFocus: true })
          ),
          e('button', { onClick: generateBoardFromTopic, disabled: !boardTopic.trim() || boardGenerating, style: S.btn(PURPLE, '#fff', !boardTopic.trim() || boardGenerating) }, boardGenerating ? '⏳ Writing...' : '📝 Generate Word List'),
          boardWords.length > 0 && e('button', { onClick: generateBoardImages, disabled: isLoading, style: S.btn('#059669', '#fff', isLoading) }, isLoading ? '⏳ Generating...' : '✨ Generate Images'),
          boardWords.length > 0 && e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Cols:'),
            e('input', { type: 'number', min: 2, max: 8, value: boardCols, onChange: function (ev) { setBoardCols(Number(ev.target.value)); }, style: { width: '52px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', outline: 'none' } })
          ),
          boardWords.length > 0 && e('label', { style: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: '#374151' } },
            e('input', { type: 'checkbox', checked: boardColor, onChange: function (ev) { setBoardColor(ev.target.checked); } }),
            'Color coding'
          ),
          hasImages && e('div', { style: { display: 'flex', gap: '6px' } },
            e('button', { onClick: saveBoard, style: S.btn('#f3f4f6', '#374151', false) }, '💾 Save'),
            e('button', { onClick: printBoard, style: S.btn('#dbeafe', '#1e40af', false) }, '🖨️ Print')
          )
        ),
        // Board title
        boardWords.length > 0 && e('input', { type: 'text', value: boardTitle, onChange: function (ev) { setBoardTitle(ev.target.value); }, placeholder: 'Board title (optional)', style: Object.assign({}, S.input, { fontWeight: 700, fontSize: '15px', maxWidth: '400px' }) }),
        // Board grid (also serves as print area)
        boardWords.length > 0
          ? e('div', { id: 'ss-print-area', style: { flex: 1, overflowY: 'auto' } },
              boardTitle && e('h2', { style: { fontWeight: 800, fontSize: '18px', color: '#1f2937', margin: '0 0 10px' } }, boardTitle),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + boardCols + ', 1fr)', gap: '8px' } },
                boardWords.map(function (word) {
                  var bg = boardColor ? (CAT_COLORS[word.category] || '#f9fafb') : '#fff';
                  var border = boardColor ? ('2px solid ' + (CAT_BORDER[word.category] || '#e5e7eb')) : '2px solid #e5e7eb';
                  return e('div', { key: word.id, onClick: function () { speakCell(word.label); }, style: { background: bg, border: border, borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', minHeight: '100px', transition: 'transform 0.1s', position: 'relative' } },
                    boardLoading[word.id]
                      ? e('div', { style: { width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, spinner(24))
                      : word.image
                        ? e('img', { src: word.image, alt: word.label, style: { width: 64, height: 64, objectFit: 'contain', borderRadius: '6px', background: '#fff' } })
                        : e('div', { style: { width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '6px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '4px' } }, 'Click ✨'),
                    e('span', { style: { fontSize: '11px', fontWeight: 700, color: '#1f2937', textAlign: 'center', lineHeight: 1.3 } }, word.label),
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); regenBoardCell(word.id); }, style: { position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px' } }, '🔄')
                  );
                })
              ),
              boardColor && e('div', { style: { display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' } },
                [['noun', 'Noun'], ['verb', 'Verb'], ['adjective', 'Adjective'], ['other', 'Other']].map(function (pair) {
                  return e('div', { key: pair[0], style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#374151' } },
                    e('div', { style: { width: 12, height: 12, borderRadius: '2px', background: CAT_COLORS[pair[0]], border: '1px solid ' + CAT_BORDER[pair[0]] } }),
                    pair[1]
                  );
                })
              )
            )
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '10px' } },
              e('div', { style: { fontSize: '48px' } }, '📋'),
              e('p', { style: { fontWeight: 600 } }, 'Enter a topic and generate a complete communication board'),
              e('p', { style: { fontSize: '12px', maxWidth: '380px', textAlign: 'center' } }, 'AI writes the word list, you generate symbols, and export a print-ready board. Click any cell to hear TTS. Color coding follows AAC conventions.')
            )
      );
    }

    // ── Visual Schedule tab ────────────────────────────────────────────────
    function renderScheduleTab() {
      return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px', gap: '12px' } },
        // Controls
        e('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 } },
          e('div', { style: { flex: 1 } },
            e('label', { style: S.lbl }, 'Activities (one per line)'),
            e('textarea', { value: schedInput, onChange: function (ev) { setSchedInput(ev.target.value); }, placeholder: 'brush teeth\nget dressed\neat breakfast\nboard the bus\narrive at school', style: Object.assign({}, S.textarea, { height: '70px' }) })
          ),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            e('div', null,
              e('label', { style: S.lbl }, 'Layout'),
              e('select', { value: schedOrientation, onChange: function (ev) { setSchedOrientation(ev.target.value); }, style: Object.assign({}, S.input, { width: 'auto' }) },
                e('option', { value: 'horizontal' }, 'Horizontal Strip'),
                e('option', { value: 'vertical' }, 'Vertical List')
              )
            ),
            e('button', { onClick: generateSchedule, disabled: !schedInput.trim() || schedGenerating, style: S.btn(PURPLE, '#fff', !schedInput.trim() || schedGenerating) }, schedGenerating ? '⏳ Generating...' : '✨ Generate Schedule')
          ),
          schedItems.length > 0 && e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            e('button', { onClick: resetSchedule, style: S.btn('#f3f4f6', '#374151', false) }, '🔄 Reset'),
            e('button', { onClick: saveSchedule, style: S.btn('#f3f4f6', '#374151', false) }, '💾 Save'),
            e('button', { onClick: function () { window.print(); }, style: S.btn('#dbeafe', '#1e40af', false) }, '🖨️ Print')
          )
        ),
        // Schedule title
        schedItems.length > 0 && e('input', { type: 'text', value: schedTitle, onChange: function (ev) { setSchedTitle(ev.target.value); }, placeholder: 'Schedule title, e.g. Marcus\'s Morning Routine', style: Object.assign({}, S.input, { fontWeight: 700, fontSize: '14px', maxWidth: '400px' }) }),
        // Schedule strip
        schedItems.length > 0
          ? e('div', { id: 'ss-print-area', style: { flex: 1, overflowY: 'auto', overflowX: schedOrientation === 'horizontal' ? 'auto' : 'hidden' } },
              schedTitle && e('h2', { style: { fontWeight: 800, fontSize: '16px', color: '#1f2937', margin: '0 0 12px' } }, schedTitle),
              e('div', { style: {
                display: 'flex',
                flexDirection: schedOrientation === 'horizontal' ? 'row' : 'column',
                gap: '8px',
                flexWrap: schedOrientation === 'horizontal' ? 'wrap' : 'nowrap',
                padding: '4px'
              } },
                schedItems.map(function (item, idx) {
                  var isNow = item.id === schedNowId;
                  var isDone = item.complete;
                  return e('div', {
                    key: item.id,
                    onClick: function () { toggleComplete(item.id); },
                    style: {
                      display: 'flex',
                      flexDirection: schedOrientation === 'horizontal' ? 'column' : 'row',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '12px',
                      border: isNow ? '3px solid #7c3aed' : '2px solid #e5e7eb',
                      background: isDone ? '#f1f5f9' : (isNow ? LIGHT_PURPLE : '#fff'),
                      cursor: 'pointer',
                      opacity: isDone ? 0.5 : 1,
                      transition: 'all 0.2s',
                      minWidth: schedOrientation === 'horizontal' ? '100px' : 'auto',
                      maxWidth: schedOrientation === 'horizontal' ? '110px' : 'none',
                      boxShadow: isNow ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
                      position: 'relative'
                    }
                  },
                    isNow && e('div', { className: 'ss-no-print', style: { position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: PURPLE, color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' } }, '▶ NOW'),
                    item.image
                      ? e('img', { src: item.image, alt: item.label, style: { width: 70, height: 70, objectFit: 'contain', borderRadius: '8px', background: '#fff', border: '1px solid #f3f4f6', flexShrink: 0, filter: isDone ? 'grayscale(100%)' : 'none' } })
                      : e('div', { style: { width: 70, height: 70, background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, schedGenerating ? spinner(24) : '⏳'),
                    e('span', { style: { fontSize: '12px', fontWeight: isDone ? 400 : 600, color: isDone ? '#9ca3af' : '#1f2937', textAlign: 'center', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 } }, item.label),
                    isDone && e('div', { style: { fontSize: '22px', flexShrink: 0 } }, '✅'),
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); setSchedNowId(item.id); }, style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: isNow ? 1 : 0.4, flexShrink: 0, padding: '2px' } }, '▶')
                  );
                })
              ),
              e('p', { className: 'ss-no-print', style: { fontSize: '11px', color: '#9ca3af', marginTop: '10px' } }, 'Tap any activity to mark complete • ▶ to set current activity')
            )
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '10px' } },
              e('div', { style: { fontSize: '48px' } }, '📅'),
              e('p', { style: { fontWeight: 600 } }, 'Build a personalized visual schedule'),
              e('p', { style: { fontSize: '12px', maxWidth: '360px', textAlign: 'center' } }, 'Enter activities, generate AI symbols, then tap to mark each as complete. Print as a laminated strip for the classroom or home.')
            )
      );
    }

    // ── Social Stories tab ─────────────────────────────────────────────────
    function renderStoriesTab() {
      var currentPage = storyPages[storyCurrent] || null;
      var hasStory = storyPages.length > 0;
      var isIllustrating = Object.keys(storyIllustrating).length > 0;
      return e('div', { style: { display: 'flex', flex: 1, overflow: 'hidden', gap: '0' } },
        // Left: inputs
        e('div', { style: { width: '240px', flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '16px', overflowY: 'auto', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '10px' } },
          e('div', null,
            e('label', { style: S.lbl }, 'Student Name'),
            e('input', { type: 'text', value: storyStudentName, onChange: function (ev) { setStoryStudentName(ev.target.value); }, placeholder: 'e.g. Marcus', style: S.input })
          ),
          e('div', null,
            e('label', { style: S.lbl }, 'Situation / Goal'),
            e('textarea', { value: storySituation, onChange: function (ev) { setStorySituation(ev.target.value); }, placeholder: 'e.g. Marcus is learning to wait his turn during group time\ne.g. Jaylen feels frustrated when the schedule changes', style: Object.assign({}, S.textarea, { height: '80px' }) })
          ),
          e('div', null,
            e('label', { style: S.lbl }, 'Additional context (optional)'),
            e('textarea', { value: storyDetails, onChange: function (ev) { setStoryDetails(ev.target.value); }, placeholder: 'e.g. Marcus is 7, has autism, loves trains', style: Object.assign({}, S.textarea, { height: '55px' }) })
          ),
          e('button', { onClick: generateStory, disabled: !storySituation.trim() || storyGenerating || isIllustrating, style: S.btn(PURPLE, '#fff', !storySituation.trim() || storyGenerating || isIllustrating) }, storyGenerating ? '⏳ Writing story...' : (isIllustrating ? '🎨 Illustrating...' : '✨ Create Social Story')),
          e('p', { style: { fontSize: '10px', color: '#9ca3af' } }, 'Uses Carol Gray format — descriptive, perspective, and directive sentences. Illustrations auto-generate for each page.'),
          hasStory && e('div', { style: { borderTop: '1px solid #e5e7eb', paddingTop: '10px' } },
            e('button', { onClick: function () { window.print(); }, style: Object.assign({}, S.btn('#dbeafe', '#1e40af', false), { width: '100%' }) }, '🖨️ Print Story')
          )
        ),
        // Right: story viewer
        hasStory
          ? e('div', { id: 'ss-print-area', style: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' } },
              // Page navigation
              e('div', { className: 'ss-no-print', style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' } },
                e('button', { onClick: function () { setStoryCurrent(function (p) { return Math.max(0, p - 1); }); }, disabled: storyCurrent === 0, style: S.btn('#f3f4f6', '#374151', storyCurrent === 0) }, '← Prev'),
                e('span', { style: { fontWeight: 600, fontSize: '13px', color: '#374151' } }, 'Page ' + (storyCurrent + 1) + ' of ' + storyPages.length),
                e('button', { onClick: function () { setStoryCurrent(function (p) { return Math.min(storyPages.length - 1, p + 1); }); }, disabled: storyCurrent === storyPages.length - 1, style: S.btn('#f3f4f6', '#374151', storyCurrent === storyPages.length - 1) }, 'Next →'),
                currentPage && e('button', { onClick: function () { speakPage(currentPage.text); }, style: S.btn('#dcfce7', '#166534', false) }, storySpeaking ? '⏹ Stop' : '🔊 Read Aloud'),
                currentPage && e('button', { onClick: function () { regenPageIllustration(currentPage.id); }, disabled: !!storyIllustrating[currentPage.id], style: S.btn(LIGHT_PURPLE, PURPLE, !!storyIllustrating[currentPage.id]) }, storyIllustrating[currentPage.id] ? '⏳' : '🔄 Regen Image'),
              ),
              // All pages for print, single page for screen
              e('div', { className: 'ss-no-print' },
                currentPage && e('div', { style: { display: 'flex', gap: '24px', alignItems: 'flex-start', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } },
                  storyIllustrating[currentPage.id]
                    ? e('div', { style: { width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '10px', border: '1px dashed #d1d5db', flexShrink: 0 } }, spinner(40))
                    : currentPage.image
                      ? e('img', { src: currentPage.image, alt: 'Page ' + (storyCurrent + 1), style: { width: 240, height: 240, objectFit: 'contain', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0 } })
                      : e('div', { style: { width: 240, height: 240, background: '#f9fafb', borderRadius: '10px', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, '🖼️'),
                  e('div', { style: { flex: 1 } },
                    e('p', { style: { fontSize: '18px', lineHeight: 1.7, color: '#1f2937', fontFamily: 'Georgia, serif', margin: 0 } }, currentPage.text)
                  )
                )
              ),
              // Print view — all pages
              e('div', { style: { display: 'none' } },
                storyPages.map(function (page, idx) {
                  return e('div', { key: page.id, style: { pageBreakAfter: idx < storyPages.length - 1 ? 'always' : 'auto', padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', minHeight: '180px' } },
                    page.image && e('img', { src: page.image, alt: '', style: { width: 160, height: 160, objectFit: 'contain', borderRadius: '8px', flexShrink: 0, border: '1px solid #e5e7eb' } }),
                    e('div', { style: { flex: 1, display: 'flex', alignItems: 'center' } },
                      e('p', { style: { fontSize: '16px', lineHeight: 1.8, fontFamily: 'Georgia, serif', color: '#111', margin: 0 } }, page.text)
                    )
                  );
                })
              ),
              // Page thumbnails
              e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' } },
                storyPages.map(function (page, idx) {
                  return e('div', { key: page.id, onClick: function () { setStoryCurrent(idx); }, style: { cursor: 'pointer', borderRadius: '8px', border: idx === storyCurrent ? '2px solid ' + PURPLE : '2px solid #e5e7eb', padding: '6px', background: idx === storyCurrent ? LIGHT_PURPLE : '#fff', width: '70px', textAlign: 'center' } },
                    page.image
                      ? e('img', { src: page.image, alt: '', style: { width: '58px', height: '58px', objectFit: 'contain', borderRadius: '5px', background: '#fafafa' } })
                      : e('div', { style: { width: '58px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: '#f9fafb', borderRadius: '5px' } }, storyIllustrating[page.id] ? spinner(20) : '📄'),
                    e('div', { style: { fontSize: '10px', color: '#6b7280', marginTop: '3px' } }, 'p.' + (idx + 1))
                  );
                })
              )
            )
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '10px', padding: '20px' } },
              e('div', { style: { fontSize: '52px' } }, '📖'),
              e('p', { style: { fontWeight: 600 } }, 'Create an AI-illustrated Social Story'),
              e('div', { style: { maxWidth: '420px', fontSize: '13px', lineHeight: 1.7, textAlign: 'center' } },
                e('p', null, 'Describe a social situation and AlloFlow writes a Carol Gray-format story, then generates a custom illustration for every page.'),
                e('p', null, 'Add a Student Avatar to make every illustration feature your specific student — no other tool does this.')
              )
            )
      );
    }

    // ── Main render ────────────────────────────────────────────────────────
    return e('div', { style: S.overlay, onClick: function (ev) { if (ev.target === ev.currentTarget) onClose && onClose(); } },
      // Spinner keyframes
      e('style', null, '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}'),
      e('div', { style: S.modal, onClick: function (ev) { ev.stopPropagation(); } },
        // Header
        e('div', { style: S.header },
          e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              e('span', { style: { fontSize: '22px' } }, '🎨'),
              e('div', null,
                e('h2', { style: { color: '#fff', fontWeight: 800, fontSize: '17px', margin: 0 } }, 'Visual Supports Studio'),
                e('p', { style: { color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: '2px 0 0' } }, 'AI-powered symbols • boards • schedules • social stories')
              )
            ),
            e('button', { onClick: onClose, style: { color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }, 'aria-label': 'Close' }, '×')
          ),
          // Tab bar
          e('div', { style: S.tabBar }, TABS.map(tabBtn))
        ),
        // Body
        e('div', { style: S.body },
          renderSharedLeft(),
          e('div', { style: S.rightCol },
            tab === 'symbols' && renderSymbolsTab(),
            tab === 'board' && renderBoardTab(),
            tab === 'schedule' && renderScheduleTab(),
            tab === 'stories' && renderStoriesTab()
          )
        )
      )
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SymbolStudio = SymbolStudio;
  console.log("[CDN] Visual Supports Studio (SymbolStudio v2) loaded");
})();
