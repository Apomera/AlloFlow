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
    style.textContent = '@media print{body *{visibility:hidden}#ss-pb,#ss-pb *,#ss-ps,#ss-ps *,#ss-py,#ss-py *,#ss-pq,#ss-pq *,#ss-pq-calming,#ss-pq-calming *,#ss-pq-sensory,#ss-pq-sensory *{visibility:visible}#ss-pb,#ss-ps,#ss-py,#ss-pq,#ss-pq-calming,#ss-pq-sensory{position:absolute;left:0;top:0;width:100%}.ss-no-print{display:none!important}}';
    document.head.appendChild(style);
  })();

  // ── Constants ─────────────────────────────────────────────────────────────
  var STORAGE_GALLERY = 'alloSymbolGallery';
  var STORAGE_AVATAR = 'alloStudentAvatar';
  var STORAGE_BOARDS = 'alloSymbolBoards';
  var STORAGE_SCHEDULES = 'alloSchedules';
  var STORAGE_PROFILES = 'alloStudentProfiles';
  var STORAGE_ACTIVE_PROFILE = 'alloActiveProfileId';
  var STORAGE_BOOKS = 'alloActivitySets';
  var MAX_PROFILES = 8;
  var BATCH_SIZE = 4;
  var BATCH_DELAY = 700;
  var MAX_RETRIES = 3;

  var STYLE_OPTIONS = [
    { value: '', label: 'Flat Vector (default)' },
    { value: 'simple line art, bold outlines', label: 'Line Art' },
    { value: 'friendly cartoon, vibrant colors', label: 'Cartoon' },
    { value: 'soft watercolor, gentle washes', label: 'Watercolor' },
    { value: 'bold comic book, thick outlines', label: 'Bold Comic' },
    { value: 'high contrast black and white, bold thick outlines, no color fill, simple silhouette', label: 'High Contrast (B&W Print)' },
  ];

  var CAT_COLORS = { noun: '#fef9c3', verb: '#dcfce7', adjective: '#dbeafe', other: '#f3f4f6' };
  var CAT_BORDER = { noun: '#ca8a04', verb: '#16a34a', adjective: '#1d4ed8', other: '#9ca3af' };

  var TABS = [
    { id: 'symbols', icon: '🎨', label: 'Symbols' },
    { id: 'board', icon: '📋', label: 'Board Builder' },
    { id: 'schedule', icon: '📅', label: 'Visual Schedule' },
    { id: 'stories', icon: '📖', label: 'Social Stories' },
    { id: 'quickboards', icon: '⚡', label: 'Quick Boards' },
    { id: 'books', icon: '📚', label: 'Activity Sets' },
  ];

  var BOARD_TEMPLATES = [
    { id: 'core', label: 'Core Vocab', icon: '💬', words: [
      { label: 'more', category: 'other', description: 'wanting more of something' },
      { label: 'stop', category: 'verb', description: 'ceasing an action' },
      { label: 'go', category: 'verb', description: 'moving or starting' },
      { label: 'want', category: 'verb', description: 'expressing desire' },
      { label: 'help', category: 'verb', description: 'requesting assistance' },
      { label: 'like', category: 'verb', description: 'expressing preference' },
      { label: 'no', category: 'other', description: 'refusal or disagreement' },
      { label: 'yes', category: 'other', description: 'agreement or confirmation' },
      { label: 'all done', category: 'other', description: 'finished with activity' },
      { label: 'come here', category: 'verb', description: 'requesting someone approach' },
      { label: 'look', category: 'verb', description: 'directing attention' },
      { label: 'wait', category: 'verb', description: 'pausing for a turn' },
    ] },
    { id: 'feelings', label: 'Feelings', icon: '😊', words: [
      { label: 'happy', category: 'adjective', description: 'feeling joyful' },
      { label: 'sad', category: 'adjective', description: 'feeling unhappy' },
      { label: 'angry', category: 'adjective', description: 'feeling mad or upset' },
      { label: 'scared', category: 'adjective', description: 'feeling afraid' },
      { label: 'surprised', category: 'adjective', description: 'feeling shocked' },
      { label: 'tired', category: 'adjective', description: 'feeling exhausted' },
      { label: 'frustrated', category: 'adjective', description: 'feeling stuck or annoyed' },
      { label: 'excited', category: 'adjective', description: 'feeling enthusiastic' },
      { label: 'worried', category: 'adjective', description: 'feeling anxious' },
      { label: 'bored', category: 'adjective', description: 'feeling uninterested' },
      { label: 'proud', category: 'adjective', description: 'feeling good about an accomplishment' },
      { label: 'silly', category: 'adjective', description: 'feeling playful and funny' },
    ] },
    { id: 'classroom', label: 'Classroom', icon: '🏫', words: [
      { label: 'help me', category: 'verb', description: 'requesting teacher assistance' },
      { label: 'bathroom', category: 'noun', description: 'needing to use the restroom' },
      { label: 'water', category: 'noun', description: 'requesting a drink' },
      { label: 'finished', category: 'other', description: 'completed an assignment' },
      { label: 'break', category: 'noun', description: 'needing a sensory break' },
      { label: 'sit down', category: 'verb', description: 'finding a seat' },
      { label: 'listen', category: 'verb', description: 'paying attention' },
      { label: 'quiet', category: 'adjective', description: 'being silent' },
      { label: 'raise hand', category: 'verb', description: 'waiting to be called on' },
      { label: 'line up', category: 'verb', description: 'forming a line' },
      { label: 'good job', category: 'other', description: 'praise for effort' },
      { label: 'try again', category: 'verb', description: 'making another attempt' },
    ] },
    { id: 'mealtime', label: 'Mealtime', icon: '🍽️', words: [
      { label: 'eat', category: 'verb', description: 'consuming food' },
      { label: 'drink', category: 'verb', description: 'consuming liquid' },
      { label: 'hungry', category: 'adjective', description: 'needing food' },
      { label: 'thirsty', category: 'adjective', description: 'needing water' },
      { label: 'more food', category: 'noun', description: 'requesting additional food' },
      { label: 'all done', category: 'other', description: 'finished eating' },
      { label: 'spoon', category: 'noun', description: 'eating utensil' },
      { label: 'fork', category: 'noun', description: 'eating utensil' },
      { label: 'cup', category: 'noun', description: 'drinking vessel' },
      { label: 'plate', category: 'noun', description: 'dish for food' },
      { label: 'yummy', category: 'adjective', description: 'food tastes good' },
      { label: 'yucky', category: 'adjective', description: 'food is disliked' },
    ] },
    { id: 'playground', label: 'Playground', icon: '🛝', words: [
      { label: 'play', category: 'verb', description: 'engaging in play' },
      { label: 'swing', category: 'noun', description: 'playground swing set' },
      { label: 'slide', category: 'noun', description: 'playground slide' },
      { label: 'run', category: 'verb', description: 'moving fast on feet' },
      { label: 'jump', category: 'verb', description: 'leaping off the ground' },
      { label: 'friend', category: 'noun', description: 'a person to play with' },
      { label: 'my turn', category: 'other', description: 'taking a turn' },
      { label: 'share', category: 'verb', description: 'letting others use something' },
      { label: 'climb', category: 'verb', description: 'going up on equipment' },
      { label: 'ball', category: 'noun', description: 'round toy for games' },
      { label: 'tag', category: 'noun', description: 'chasing game' },
      { label: 'fun', category: 'adjective', description: 'something enjoyable' },
    ] },
    { id: 'morning', label: 'Morning Routine', icon: '🌅', words: [
      { label: 'wake up', category: 'verb', description: 'getting out of bed' },
      { label: 'brush teeth', category: 'verb', description: 'dental hygiene' },
      { label: 'get dressed', category: 'verb', description: 'putting on clothes' },
      { label: 'eat breakfast', category: 'verb', description: 'morning meal' },
      { label: 'backpack', category: 'noun', description: 'school bag' },
      { label: 'school bus', category: 'noun', description: 'transportation to school' },
      { label: 'wash face', category: 'verb', description: 'cleaning face' },
      { label: 'comb hair', category: 'verb', description: 'styling hair' },
      { label: 'shoes', category: 'noun', description: 'footwear' },
      { label: 'coat', category: 'noun', description: 'outer garment' },
      { label: 'goodbye', category: 'other', description: 'farewell' },
      { label: 'ready', category: 'adjective', description: 'prepared to go' },
    ] },
    { id: 'hygiene', label: 'Hygiene', icon: '🪥', words: [
      { label: 'wash hands', category: 'verb', description: 'cleaning hands with soap and water' },
      { label: 'soap', category: 'noun', description: 'cleaning product used on hands' },
      { label: 'brush teeth', category: 'verb', description: 'cleaning teeth with a toothbrush' },
      { label: 'toothbrush', category: 'noun', description: 'tool for brushing teeth' },
      { label: 'toothpaste', category: 'noun', description: 'paste used to clean teeth' },
      { label: 'towel', category: 'noun', description: 'cloth for drying hands or body' },
      { label: 'comb hair', category: 'verb', description: 'styling and tidying hair' },
      { label: 'shower', category: 'verb', description: 'washing the whole body with water' },
      { label: 'flush', category: 'verb', description: 'flushing the toilet after use' },
      { label: 'deodorant', category: 'noun', description: 'product to prevent body odor' },
      { label: 'clean', category: 'adjective', description: 'free from dirt or germs' },
      { label: 'germs', category: 'noun', description: 'tiny organisms that cause illness' },
    ] },
    { id: 'community', label: 'Community', icon: '🏘️', words: [
      { label: 'grocery store', category: 'noun', description: 'place to buy food and supplies' },
      { label: 'library', category: 'noun', description: 'place to borrow books for free' },
      { label: 'doctor', category: 'noun', description: 'person who helps when you are sick' },
      { label: 'fire station', category: 'noun', description: 'where firefighters and trucks are kept' },
      { label: 'park', category: 'noun', description: 'outdoor area for recreation and play' },
      { label: 'restaurant', category: 'noun', description: 'place to order and eat a meal' },
      { label: 'pharmacy', category: 'noun', description: 'place to pick up medicine' },
      { label: 'crosswalk', category: 'noun', description: 'safe place to cross the street' },
      { label: 'wait in line', category: 'verb', description: 'standing in a queue for your turn' },
      { label: 'quiet voice', category: 'adjective', description: 'speaking softly in public spaces' },
      { label: 'inside voice', category: 'adjective', description: 'calm, moderate volume for indoors' },
      { label: 'excuse me', category: 'other', description: 'polite phrase to get past someone' },
    ] },
    { id: 'medical', label: 'Medical / Health', icon: '🏥', words: [
      { label: 'hurt', category: 'adjective', description: 'feeling physical pain' },
      { label: 'head', category: 'noun', description: 'top part of the body where the brain is' },
      { label: 'stomach', category: 'noun', description: 'belly area, can hurt when sick' },
      { label: 'medicine', category: 'noun', description: 'substance taken to feel better when sick' },
      { label: 'bandage', category: 'noun', description: 'covering applied to a wound or cut' },
      { label: 'ice pack', category: 'noun', description: 'cold pack applied to reduce swelling' },
      { label: 'rest', category: 'verb', description: 'lying down quietly to feel better' },
      { label: 'drink water', category: 'verb', description: 'staying hydrated when sick or hurt' },
      { label: 'sick', category: 'adjective', description: 'feeling unwell or ill' },
      { label: 'better', category: 'adjective', description: 'feeling improved after being sick' },
      { label: 'deep breath', category: 'verb', description: 'taking a slow, calming breath' },
      { label: 'thermometer', category: 'noun', description: 'tool to measure body temperature' },
    ] },
    { id: 'bedtime', label: 'Bedtime', icon: '🌙', words: [
      { label: 'bath time', category: 'noun', description: 'washing in the bathtub before bed' },
      { label: 'pajamas', category: 'noun', description: 'comfortable clothes worn to sleep' },
      { label: 'brush teeth', category: 'verb', description: 'cleaning teeth before bed' },
      { label: 'read book', category: 'verb', description: 'nighttime reading routine before sleep' },
      { label: 'lights out', category: 'verb', description: 'turning off the bedroom light' },
      { label: 'blanket', category: 'noun', description: 'warm soft covering for sleeping' },
      { label: 'pillow', category: 'noun', description: 'soft cushion for the head during sleep' },
      { label: 'quiet time', category: 'noun', description: 'calm, peaceful time before sleep' },
      { label: 'goodnight', category: 'other', description: 'farewell said at bedtime' },
      { label: 'sleep', category: 'verb', description: 'resting through the night' },
      { label: 'dream', category: 'noun', description: 'images and stories that happen during sleep' },
      { label: 'tomorrow', category: 'other', description: 'the next day, when we wake up' },
    ] },
  ];

  var STORY_TEMPLATES = [
    { label: 'Waiting My Turn', situation: 'waiting for a turn during group activities at school', details: 'Sometimes it can be hard to wait. This story helps practice patience.' },
    { label: 'Feeling Angry', situation: 'feeling angry and learning safe ways to calm down', details: 'When we feel angry our body might feel hot or tight. There are safe ways to feel better.' },
    { label: 'Making Friends', situation: 'how to make a new friend on the playground', details: 'Meeting new people can feel exciting and a little scary at the same time.' },
    { label: 'Doctor Visit', situation: 'going to the doctor for a checkup', details: 'The doctor helps us stay healthy. Some parts might feel a little uncomfortable but it will be over soon.' },
    { label: 'Haircut', situation: 'getting a haircut at the salon or barbershop', details: 'The sound of scissors and clippers can be loud. The hairdresser will be gentle and quick.' },
    { label: 'Schedule Changes', situation: 'when the daily schedule changes unexpectedly', details: 'Sometimes plans change and that is okay. Change can feel hard at first but things will be alright.' },
    { label: 'Lunchtime', situation: 'eating lunch in the school cafeteria with other students', details: 'The cafeteria can be busy and noisy. There are good steps to follow at lunchtime.' },
    { label: 'Asking for Help', situation: 'asking a teacher or adult for help when something feels hard', details: 'Everyone needs help sometimes. Asking for help is a smart and brave thing to do.' },
    { label: 'Sharing & Turns', situation: 'sharing toys and taking turns with classmates during play', details: 'Sharing can feel hard when we really like something. Taking turns is a way to be a good friend.' },
    { label: 'New School', situation: 'starting at a new school for the very first time', details: 'A new school means new friends, new teachers, and a new building to explore.' },
    { label: 'Losing the Game', situation: 'learning to handle losing a game or contest with good sportsmanship', details: 'Losing can feel disappointing or frustrating. This story helps practice staying calm and being a good sport.' },
    { label: 'Fire Drill', situation: 'what happens during a fire drill at school and why we practice it', details: 'A fire drill is practice for keeping everyone safe. The alarm is loud but it will stop soon.' },
    { label: 'Grocery Store', situation: 'going to the grocery store with a family member and following the rules', details: 'The grocery store can be busy and crowded. Walking calmly and staying close makes the trip go smoothly.' },
    { label: 'Substitute Teacher', situation: 'having a substitute teacher instead of the regular teacher for the day', details: 'Sometimes the regular teacher cannot come to school. A substitute teacher will be in charge for the day and things will still be okay.' },
    { label: 'Getting a Shot', situation: 'getting a vaccination or flu shot at the doctor or clinic', details: 'Shots help keep our bodies healthy and protect others too. It might sting for a moment, but it will be over very quickly.' },
  ];

  var QUICK_SETS = [
    { label: 'Emotions', icon: '😊', items: ['happy', 'sad', 'angry', 'scared', 'surprised', 'tired', 'frustrated', 'excited', 'worried', 'proud'] },
    { label: 'Classroom', icon: '🏫', items: ['help', 'bathroom', 'water', 'finished', 'break', 'sit down', 'quiet', 'listen', 'raise hand', 'line up'] },
    { label: 'Daily Living', icon: '🏠', items: ['eat', 'drink', 'sleep', 'wash hands', 'brush teeth', 'get dressed', 'go outside', 'take a bath', 'comb hair', 'put on shoes'] },
    { label: 'AAC Core', icon: '💬', items: ['more', 'stop', 'go', 'yes', 'no', 'want', 'like', 'all done', 'come here', 'look', 'help', 'wait'] },
    { label: 'Colors', icon: '🎨', items: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'brown', 'black', 'white'] },
    { label: 'Numbers', icon: '🔢', items: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] },
    { label: 'Animals', icon: '🐾', items: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'bear', 'horse', 'cow', 'sheep', 'duck'] },
    { label: 'Weather', icon: '☀️', items: ['sunny', 'cloudy', 'rainy', 'windy', 'snowy', 'foggy', 'hot', 'cold', 'stormy', 'rainbow'] },
  ];

  // ── Storage helpers ───────────────────────────────────────────────────────
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key, def) { try { return JSON.parse(localStorage.getItem(key) || 'null') || def; } catch (e) { return def; } }
  function uid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2)); }

  // Load profiles with migration from legacy single-avatar format
  function loadProfiles() {
    var saved = load(STORAGE_PROFILES, null);
    if (saved && saved.length) return saved;
    var legacy = load(STORAGE_AVATAR, null);
    var profs;
    if (legacy && (legacy.name || legacy.image)) {
      profs = [{ id: uid(), name: legacy.name || 'Student 1', description: legacy.description || '', image: legacy.image || null }];
    } else {
      profs = [{ id: uid(), name: 'Student 1', description: '', image: null }];
    }
    store(STORAGE_PROFILES, profs); // persist so activeProfileId init can read it
    return profs;
  }

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
    var results = []; var failed = [];
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
          failed.push(item.label || '?');
          return Object.assign({}, item, { image: null });
        }
      }));
      results = results.concat(batchResults);
      if (i + BATCH_SIZE < items.length) await new Promise(function (r) { setTimeout(r, BATCH_DELAY); });
    }
    return { results: results, failed: failed };
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
    var cloudSync = props.cloudSync || null; // { save: async(data)=>void, load: async()=>data|null }
    var liveSession = props.liveSession || null; // { active, sessionCode, push: async(payload)=>void, clear: async()=>void }

    var e = React.createElement;
    var useState = React.useState;
    var useCallback = React.useCallback;
    var useEffect = React.useEffect;
    var useRef = React.useRef;

    // Shared state
    var _tab = useState('symbols'); var tab = _tab[0]; var setTab = _tab[1];
    var _profiles = useState(function () { return loadProfiles(); });
    var profiles = _profiles[0]; var setProfiles = _profiles[1];
    var _activeProfileId = useState(function () {
      var profs = load(STORAGE_PROFILES, null) || [];
      var saved = load(STORAGE_ACTIVE_PROFILE, null);
      if (saved && profs.find(function (p) { return p.id === saved; })) return saved;
      return profs[0] ? profs[0].id : null;
    });
    var activeProfileId = _activeProfileId[0]; var setActiveProfileId = _activeProfileId[1];
    var activeProfile = profiles.find(function (p) { return p.id === activeProfileId; }) || profiles[0] || { id: null, image: null, name: '', description: '' };
    var _showAvatar = useState(false); var showAvatar = _showAvatar[0]; var setShowAvatar = _showAvatar[1];
    var _avatarGenerating = useState(false); var avatarGenerating = _avatarGenerating[0]; var setAvatarGenerating = _avatarGenerating[1];
    var _avatarDesc = useState(activeProfile.description || ''); var avatarDesc = _avatarDesc[0]; var setAvatarDesc = _avatarDesc[1];
    var _avatarName = useState(activeProfile.name || ''); var avatarName = _avatarName[0]; var setAvatarName = _avatarName[1];
    var _globalStyle = useState(''); var globalStyle = _globalStyle[0]; var setGlobalStyle = _globalStyle[1];
    var _autoClean = useState(true); var autoClean = _autoClean[0]; var setAutoClean = _autoClean[1];
    var fileInputRef = useRef(null);
    var scheduleFileRef = useRef(null);
    var importFileRef = useRef(null);
    var importBoardRef = useRef(null);
    var qbUploadRef = useRef(null);

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
    var _symCategory = useState(''); var symCategory = _symCategory[0]; var setSymCategory = _symCategory[1];
    var _symShowFavs = useState(false); var symShowFavs = _symShowFavs[0]; var setSymShowFavs = _symShowFavs[1];

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
    var _boardProfileFilter = useState(''); var boardProfileFilter = _boardProfileFilter[0]; var setBoardProfileFilter = _boardProfileFilter[1];
    // Board drag-to-reorder
    var _dragBoardId = useState(null); var dragBoardId = _dragBoardId[0]; var setDragBoardId = _dragBoardId[1];
    var _dragOverBoardId = useState(null); var dragOverBoardId = _dragOverBoardId[0]; var setDragOverBoardId = _dragOverBoardId[1];
    // Board display options
    var _boardTextPos = useState('below'); var boardTextPos = _boardTextPos[0]; var setBoardTextPos = _boardTextPos[1];
    var _boardTextSize = useState(11); var boardTextSize = _boardTextSize[0]; var setBoardTextSize = _boardTextSize[1];
    var _boardCellSz = useState('medium'); var boardCellSz = _boardCellSz[0]; var setBoardCellSz = _boardCellSz[1];
    var _showPrintSettings = useState(false); var showPrintSettings = _showPrintSettings[0]; var setShowPrintSettings = _showPrintSettings[1];
    // Gallery picker (add symbol to board)
    var _showGalleryPicker = useState(false); var showGalleryPicker = _showGalleryPicker[0]; var setShowGalleryPicker = _showGalleryPicker[1];
    var _gpFilter = useState(''); var gpFilter = _gpFilter[0]; var setGpFilter = _gpFilter[1];
    // Activity Sets (multi-board books)
    var _books = useState(function () { return load(STORAGE_BOOKS, []); });
    var books = _books[0]; var setBooks = _books[1];
    var _activeBookId = useState(null); var activeBookId = _activeBookId[0]; var setActiveBookId = _activeBookId[1];
    var _newBookTitle = useState(''); var newBookTitle = _newBookTitle[0]; var setNewBookTitle = _newBookTitle[1];

    // Schedule state
    var _schedItems = useState([]); var schedItems = _schedItems[0]; var setSchedItems = _schedItems[1];
    var _schedInput = useState(''); var schedInput = _schedInput[0]; var setSchedInput = _schedInput[1];
    var _schedGenerating = useState(false); var schedGenerating = _schedGenerating[0]; var setSchedGenerating = _schedGenerating[1];
    var _schedOrientation = useState('horizontal'); var schedOrientation = _schedOrientation[0]; var setSchedOrientation = _schedOrientation[1];
    var _schedTitle = useState(''); var schedTitle = _schedTitle[0]; var setSchedTitle = _schedTitle[1];
    var _schedNowId = useState(null); var schedNowId = _schedNowId[0]; var setSchedNowId = _schedNowId[1];
    var _savedSchedules = useState(function () { return load(STORAGE_SCHEDULES, []); });
    var savedSchedules = _savedSchedules[0]; var setSavedSchedules = _savedSchedules[1];
    var _showSchedGallery = useState(false); var showSchedGallery = _showSchedGallery[0]; var setShowSchedGallery = _showSchedGallery[1];

    // Social Stories state
    var _storySituation = useState(''); var storySituation = _storySituation[0]; var setStorySituation = _storySituation[1];
    var _storyStudentName = useState(activeProfile.name || ''); var storyStudentName = _storyStudentName[0]; var setStoryStudentName = _storyStudentName[1];
    var _storyDetails = useState(''); var storyDetails = _storyDetails[0]; var setStoryDetails = _storyDetails[1];
    var _storyPages = useState([]); var storyPages = _storyPages[0]; var setStoryPages = _storyPages[1];
    var _storyCurrent = useState(0); var storyCurrent = _storyCurrent[0]; var setStoryCurrent = _storyCurrent[1];
    var _storyGenerating = useState(false); var storyGenerating = _storyGenerating[0]; var setStoryGenerating = _storyGenerating[1];
    var _storyIllustrating = useState({}); var storyIllustrating = _storyIllustrating[0]; var setStoryIllustrating = _storyIllustrating[1];
    var _storySpeaking = useState(false); var storySpeaking = _storySpeaking[0]; var setStorySpeaking = _storySpeaking[1];

    // Cloud sync state
    var _syncStatus = useState('idle'); var syncStatus = _syncStatus[0]; var setSyncStatus = _syncStatus[1];
    var _lastSynced = useState(null); var lastSynced = _lastSynced[0]; var setLastSynced = _lastSynced[1];

    // Quick Boards state
    var _qbMode = useState('firstthen'); var qbMode = _qbMode[0]; var setQbMode = _qbMode[1];
    // First-Then
    var _ftFirstLabel = useState(''); var ftFirstLabel = _ftFirstLabel[0]; var setFtFirstLabel = _ftFirstLabel[1];
    var _ftFirstImage = useState(null); var ftFirstImage = _ftFirstImage[0]; var setFtFirstImage = _ftFirstImage[1];
    var _ftFirstLoading = useState(false); var ftFirstLoading = _ftFirstLoading[0]; var setFtFirstLoading = _ftFirstLoading[1];
    var _ftThenLabel = useState(''); var ftThenLabel = _ftThenLabel[0]; var setFtThenLabel = _ftThenLabel[1];
    var _ftThenImage = useState(null); var ftThenImage = _ftThenImage[0]; var setFtThenImage = _ftThenImage[1];
    var _ftThenLoading = useState(false); var ftThenLoading = _ftThenLoading[0]; var setFtThenLoading = _ftThenLoading[1];
    // Choice Board
    var _cbCount = useState(2); var cbCount = _cbCount[0]; var setCbCount = _cbCount[1];
    var _cbItems = useState(function () { return [{ id: 'c1', label: '', image: null }, { id: 'c2', label: '', image: null }, { id: 'c3', label: '', image: null }, { id: 'c4', label: '', image: null }]; });
    var cbItems = _cbItems[0]; var setCbItems = _cbItems[1];
    var _cbSelected = useState(null); var cbSelected = _cbSelected[0]; var setCbSelected = _cbSelected[1];
    var _cbLoading = useState({}); var cbLoading = _cbLoading[0]; var setCbLoading = _cbLoading[1];
    // Token Economy
    var _tokenTotal = useState(5); var tokenTotal = _tokenTotal[0]; var setTokenTotal = _tokenTotal[1];
    var _tokenEarned = useState(0); var tokenEarned = _tokenEarned[0]; var setTokenEarned = _tokenEarned[1];
    var _tokenLabel = useState(''); var tokenLabel = _tokenLabel[0]; var setTokenLabel = _tokenLabel[1];
    var _tokenRewardLabel = useState(''); var tokenRewardLabel = _tokenRewardLabel[0]; var setTokenRewardLabel = _tokenRewardLabel[1];
    var _tokenRewardImage = useState(null); var tokenRewardImage = _tokenRewardImage[0]; var setTokenRewardImage = _tokenRewardImage[1];
    var _tokenRewardLoading = useState(false); var tokenRewardLoading = _tokenRewardLoading[0]; var setTokenRewardLoading = _tokenRewardLoading[1];
    var _qbUploadTarget = useState(null); var qbUploadTarget = _qbUploadTarget[0]; var setQbUploadTarget = _qbUploadTarget[1];
    // Calming Corner state
    var _cmItems = useState(function () {
      return [
        { id: 'cm1', label: 'Take deep breaths', image: null },
        { id: 'cm2', label: 'Count to 10', image: null },
        { id: 'cm3', label: 'Take a walk', image: null },
        { id: 'cm4', label: 'Squeeze a stress ball', image: null },
        { id: 'cm5', label: 'Ask for help', image: null },
        { id: 'cm6', label: 'Drink some water', image: null },
        { id: 'cm7', label: 'Listen to music', image: null },
        { id: 'cm8', label: 'Draw or color', image: null },
      ];
    });
    var cmItems = _cmItems[0]; var setCmItems = _cmItems[1];
    var _cmLoading = useState({}); var cmLoading = _cmLoading[0]; var setCmLoading = _cmLoading[1];

    var _snItems = useState(function () {
      return [
        { id: 'sn1', label: 'Too loud', image: null },
        { id: 'sn2', label: 'Too bright', image: null },
        { id: 'sn3', label: 'Too crowded', image: null },
        { id: 'sn4', label: 'Need headphones', image: null },
        { id: 'sn5', label: 'Need sunglasses', image: null },
        { id: 'sn6', label: 'Need fidget', image: null },
        { id: 'sn7', label: 'Need to move', image: null },
        { id: 'sn8', label: 'Need a break', image: null },
        { id: 'sn9', label: 'Feel overwhelmed', image: null },
        { id: 'sn10', label: 'Need quiet', image: null },
      ];
    });
    var snItems = _snItems[0]; var setSnItems = _snItems[1];
    var _snLoading = useState({}); var snLoading = _snLoading[0]; var setSnLoading = _snLoading[1];

    // Partner-assisted scanning state
    var _scanBoardId = useState(null); var scanBoardId = _scanBoardId[0]; var setScanBoardId = _scanBoardId[1];
    var _scanIndex = useState(0); var scanIndex = _scanIndex[0]; var setScanIndex = _scanIndex[1];
    var _scanPaused = useState(false); var scanPaused = _scanPaused[0]; var setScanPaused = _scanPaused[1];
    var _scanSpeed = useState(2000); var scanSpeed = _scanSpeed[0]; var setScanSpeed = _scanSpeed[1];
    var scanIntervalRef = useRef(null);
    var autoLoadedRef = useRef(false);

    // Sync story student name when avatar name changes
    useEffect(function () { if (avatarName) setStoryStudentName(avatarName); }, [avatarName]);

    // Auto-load from cloud on mount (once, when cloudSync becomes available)
    useEffect(function () {
      if (cloudSync && !autoLoadedRef.current) {
        autoLoadedRef.current = true;
        loadFromCloud();
      }
    }, [cloudSync]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-save to cloud 5 s after any data change (debounced via syncToCloud identity)
    useEffect(function () {
      if (!cloudSync) return;
      var t = setTimeout(syncToCloud, 5000);
      return function () { clearTimeout(t); };
    }, [syncToCloud]); // syncToCloud ref changes whenever profiles/boards/schedules/gallery change

    // Scanning interval — auto-advance highlighted cell
    useEffect(function () {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (!scanBoardId || scanPaused) return;
      var board = savedBoards.find(function (b) { return b.id === scanBoardId; });
      if (!board) return;
      var cells = (board.words || []).filter(function (w) { return w.image; });
      if (!cells.length) return;
      scanIntervalRef.current = setInterval(function () {
        setScanIndex(function (prev) { return (prev + 1) % cells.length; });
      }, scanSpeed);
      return function () { clearInterval(scanIntervalRef.current); };
    }, [scanBoardId, scanPaused, scanSpeed, savedBoards]);

    if (!isOpen) return null;

    var avatarRef = activeProfile.image ? activeProfile.image.split(',')[1] : null;

    // ── Avatar / profile actions ──────────────────────────────────────────
    var generateAvatar = useCallback(async function () {
      if (!onCallImagen || !avatarDesc.trim() || !activeProfileId) return;
      setAvatarGenerating(true);
      try {
        var prompt = 'Friendly stylized portrait of a child: ' + avatarDesc.trim() + '. Soft cartoon style, centered head and shoulders, warm expression, white background. STRICTLY NO TEXT.';
        var img = await onCallImagen(prompt, 300, 0.9);
        if (onCallGeminiImageEdit && img) {
          var raw = img.split(',')[1];
          img = await onCallGeminiImageEdit('Refine this child portrait. Make it warm, friendly, and consistent with the description: "' + avatarDesc.trim() + '". Clean white background. Remove any text.', raw, 300, 0.9) || img;
        }
        var patchedProfiles = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { image: img, name: avatarName, description: avatarDesc }) : p; });
        setProfiles(patchedProfiles); store(STORAGE_PROFILES, patchedProfiles);
        setStoryStudentName(avatarName);
        addToast && addToast('Avatar created for ' + (avatarName || 'student') + '!', 'success');
      } catch (e) {
        warnLog("Avatar generation failed:", e);
        addToast && addToast('Avatar generation failed', 'error');
      } finally { setAvatarGenerating(false); }
    }, [avatarDesc, avatarName, activeProfileId, profiles, onCallImagen, onCallGeminiImageEdit, addToast]);

    var uploadAvatarFile = useCallback(function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e2) {
        var img = e2.target.result;
        var patchedProfiles = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { image: img }) : p; });
        setProfiles(patchedProfiles); store(STORAGE_PROFILES, patchedProfiles);
        addToast && addToast('Avatar photo uploaded!', 'success');
      };
      reader.readAsDataURL(file);
    }, [activeProfileId, profiles, addToast]);

    var clearAvatar = useCallback(function () {
      var patchedProfiles = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { image: null }) : p; });
      setProfiles(patchedProfiles); store(STORAGE_PROFILES, patchedProfiles);
    }, [activeProfileId, profiles]);

    var addProfile = useCallback(function () {
      if (profiles.length >= MAX_PROFILES) return;
      var newProf = { id: uid(), name: 'Student ' + (profiles.length + 1), description: '', image: null };
      var updated = profiles.concat([newProf]);
      setProfiles(updated); store(STORAGE_PROFILES, updated);
      setActiveProfileId(newProf.id); store(STORAGE_ACTIVE_PROFILE, newProf.id);
      setAvatarName(newProf.name); setAvatarDesc('');
      setShowAvatar(true);
    }, [profiles]);

    var switchProfile = useCallback(function (id) {
      var prof = profiles.find(function (p) { return p.id === id; });
      if (!prof) return;
      setActiveProfileId(id); store(STORAGE_ACTIVE_PROFILE, id);
      setAvatarName(prof.name || ''); setAvatarDesc(prof.description || '');
    }, [profiles]);

    var deleteProfile = useCallback(function (id) {
      if (profiles.length <= 1) return;
      var updated = profiles.filter(function (p) { return p.id !== id; });
      setProfiles(updated); store(STORAGE_PROFILES, updated);
      if (activeProfileId === id) {
        var first = updated[0];
        setActiveProfileId(first.id); store(STORAGE_ACTIVE_PROFILE, first.id);
        setAvatarName(first.name || ''); setAvatarDesc(first.description || '');
      }
    }, [profiles, activeProfileId]);

    // ── Symbol actions ────────────────────────────────────────────────────
    var genSingle = useCallback(async function () {
      if (!symLabel.trim() || !onCallImagen) return;
      var tid = 'pend-' + Date.now();
      setSymLoading(function (p) { var n = Object.assign({}, p); n[tid] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(symLabel, symDesc, globalStyle, avatarRef ? avatarDesc : '');
        var imageUrl = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 400);
        var entry = { id: uid(), label: symLabel.trim(), description: symDesc.trim(), image: imageUrl, style: globalStyle || 'flat vector', category: symCategory || 'other', isFavorite: false, createdAt: Date.now() };
        var updated = [entry].concat(gallery);
        setGallery(updated); store(STORAGE_GALLERY, updated);
        setSelectedId(entry.id);
        addToast && addToast('Symbol created!', 'success');
      } catch (e) {
        addToast && addToast('Generation failed: ' + e.message, 'error');
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
      var batchOut = await batchGenerate(
        items, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, globalStyle,
        function (id) { setSymLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
      );
      var valid = batchOut.results.filter(function (r) { return r.image; });
      if (valid.length > 0) {
        var updated = valid.concat(gallery);
        setGallery(updated); store(STORAGE_GALLERY, updated);
        setSelectedId(valid[0].id);
        addToast && addToast(valid.length + ' symbol(s) created!', 'success');
      }
      if (batchOut.failed.length > 0) {
        addToast && addToast('Failed to generate: ' + batchOut.failed.join(', '), 'error');
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
        addToast && addToast('Regen failed', 'error');
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
        addToast && addToast('Refinement failed', 'error');
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

    var toggleFavorite = useCallback(function (id) {
      var updated = gallery.map(function (i) { return i.id === id ? Object.assign({}, i, { isFavorite: !i.isFavorite }) : i; });
      setGallery(updated); store(STORAGE_GALLERY, updated);
    }, [gallery]);

    var clearGallery = useCallback(function () {
      if (!window.confirm('Clear all ' + gallery.length + ' symbols from the gallery? This cannot be undone.')) return;
      setGallery([]); store(STORAGE_GALLERY, []);
      setSelectedId(null);
      addToast && addToast('Gallery cleared', 'info');
    }, [gallery, addToast]);

    var exportData = useCallback(function () {
      var data = {
        version: 5,
        exportDate: new Date().toISOString(),
        gallery: gallery,
        boards: savedBoards,
        schedules: savedSchedules,
        profiles: profiles,
        books: books,
      };
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'symbol_studio_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      addToast && addToast('Backup downloaded!', 'success');
    }, [gallery, savedBoards, savedSchedules, profiles, books, addToast]);

    var importData = useCallback(function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e2) {
        try {
          var data = JSON.parse(e2.target.result);
          var summary = [];
          if (Array.isArray(data.gallery) && data.gallery.length) {
            // Merge: keep existing items not already in the imported set (match by id)
            var importedIds = {};
            data.gallery.forEach(function (g) { importedIds[g.id] = true; });
            var merged = data.gallery.concat(gallery.filter(function (g) { return !importedIds[g.id]; }));
            setGallery(merged); store(STORAGE_GALLERY, merged);
            summary.push(data.gallery.length + ' symbol(s)');
          }
          if (Array.isArray(data.boards) && data.boards.length) {
            var importedBoardIds = {};
            data.boards.forEach(function (b) { importedBoardIds[b.id] = true; });
            var mergedBoards = data.boards.concat(savedBoards.filter(function (b) { return !importedBoardIds[b.id]; }));
            setSavedBoards(mergedBoards); store(STORAGE_BOARDS, mergedBoards);
            summary.push(data.boards.length + ' board(s)');
          }
          if (Array.isArray(data.schedules) && data.schedules.length) {
            var importedSchedIds = {};
            data.schedules.forEach(function (s) { importedSchedIds[s.id] = true; });
            var mergedScheds = data.schedules.concat(savedSchedules.filter(function (s) { return !importedSchedIds[s.id]; }));
            setSavedSchedules(mergedScheds); store(STORAGE_SCHEDULES, mergedScheds);
            summary.push(data.schedules.length + ' schedule(s)');
          }
          // New format: profiles array
          if (Array.isArray(data.profiles) && data.profiles.length) {
            var impProfIds = {};
            data.profiles.forEach(function (p) { impProfIds[p.id] = true; });
            var mergedProfs = data.profiles.concat(profiles.filter(function (p) { return !impProfIds[p.id]; }));
            if (mergedProfs.length > MAX_PROFILES) mergedProfs = mergedProfs.slice(0, MAX_PROFILES);
            setProfiles(mergedProfs); store(STORAGE_PROFILES, mergedProfs);
            summary.push(data.profiles.length + ' profile(s)');
          }
          // Legacy format: single avatar object
          else if (data.avatar && (data.avatar.image || data.avatar.name)) {
            var legacyProf = { id: uid(), name: data.avatar.name || 'Imported', description: data.avatar.description || '', image: data.avatar.image || null };
            var withLegacy = profiles.concat([legacyProf]).slice(0, MAX_PROFILES);
            setProfiles(withLegacy); store(STORAGE_PROFILES, withLegacy);
            setAvatarName(legacyProf.name); setAvatarDesc(legacyProf.description);
            summary.push('student profile');
          }
          if (Array.isArray(data.books) && data.books.length) {
            var impBookIds = {};
            data.books.forEach(function (b) { impBookIds[b.id] = true; });
            var mergedBooks = data.books.concat(books.filter(function (b) { return !impBookIds[b.id]; }));
            setBooks(mergedBooks); store(STORAGE_BOOKS, mergedBooks);
            summary.push(data.books.length + ' activity set(s)');
          }
          addToast && addToast(summary.length ? 'Imported: ' + summary.join(', ') : 'Nothing found to import', summary.length ? 'success' : 'info');
        } catch (err) {
          warnLog('Import failed:', err);
          addToast && addToast('Import failed — check that this is a valid Symbol Studio backup file', 'error');
        }
      };
      reader.readAsText(file);
      ev.target.value = '';
    }, [gallery, savedBoards, savedSchedules, profiles, books, addToast]);

    // ── Cloud sync actions ────────────────────────────────────────────────
    var syncToCloud = useCallback(async function () {
      if (!cloudSync) return;
      setSyncStatus('syncing');
      try {
        var data = {
          profiles: profiles.map(function (p) { return { id: p.id, name: p.name, description: p.description }; }),
          boards: savedBoards.map(function (b) {
            return { id: b.id, title: b.title, createdAt: b.createdAt, cols: b.cols || 4,
              words: (b.words || []).map(function (w) { return { label: w.label, category: w.category || 'other', description: w.description || '' }; }) };
          }),
          schedules: savedSchedules.map(function (s) {
            return { id: s.id, title: s.title, createdAt: s.createdAt, orientation: s.orientation || 'horizontal',
              items: (s.items || []).map(function (it) { return { id: it.id, label: it.label }; }) };
          }),
          galleryMeta: gallery.map(function (g) {
            return { id: g.id, label: g.label, category: g.category || 'other', style: g.style || '', isFavorite: g.isFavorite || false, createdAt: g.createdAt };
          }),
          lastSynced: new Date().toISOString(),
        };
        await cloudSync.save(data);
        setLastSynced(data.lastSynced); setSyncStatus('synced');
        addToast && addToast('☁️ Synced to cloud!', 'success');
      } catch (e) {
        warnLog('Cloud sync failed:', e);
        setSyncStatus('error');
        addToast && addToast('Cloud sync failed: ' + e.message, 'error');
      }
    }, [cloudSync, profiles, savedBoards, savedSchedules, gallery, addToast]);

    var loadFromCloud = useCallback(async function () {
      if (!cloudSync) return;
      setSyncStatus('syncing');
      try {
        var data = await cloudSync.load();
        if (!data) {
          setSyncStatus('idle');
          addToast && addToast('No cloud backup found', 'info'); return;
        }
        var summary = [];
        // Profiles: merge cloud metadata with local images
        if (Array.isArray(data.profiles) && data.profiles.length) {
          var localProfMap = {};
          profiles.forEach(function (p) { localProfMap[p.id] = p; });
          var mergedProfs = data.profiles.map(function (cp) {
            var lp = localProfMap[cp.id];
            return { id: cp.id, name: cp.name, description: cp.description, image: lp ? lp.image : null };
          });
          var cloudProfIds = {};
          data.profiles.forEach(function (p) { cloudProfIds[p.id] = true; });
          profiles.forEach(function (lp) { if (!cloudProfIds[lp.id]) mergedProfs.push(lp); });
          mergedProfs = mergedProfs.slice(0, MAX_PROFILES);
          setProfiles(mergedProfs); store(STORAGE_PROFILES, mergedProfs);
          summary.push(data.profiles.length + ' profile(s)');
        }
        // Boards: merge cloud structure with local images
        if (Array.isArray(data.boards) && data.boards.length) {
          var localBoardMap = {};
          savedBoards.forEach(function (b) { localBoardMap[b.id] = b; });
          var mergedBoards = data.boards.map(function (cb) {
            var lb = localBoardMap[cb.id];
            return { id: cb.id, title: cb.title, createdAt: cb.createdAt, cols: cb.cols || 4,
              words: (cb.words || []).map(function (cw, idx) {
                var lw = lb && lb.words && lb.words[idx] && lb.words[idx].label === cw.label ? lb.words[idx] : null;
                return Object.assign({}, cw, { id: uid(), image: lw ? lw.image : null });
              })};
          });
          var cloudBoardIds = {};
          data.boards.forEach(function (b) { cloudBoardIds[b.id] = true; });
          savedBoards.forEach(function (lb) { if (!cloudBoardIds[lb.id]) mergedBoards.push(lb); });
          setSavedBoards(mergedBoards); store(STORAGE_BOARDS, mergedBoards);
          summary.push(data.boards.length + ' board(s)');
        }
        // Schedules: same pattern
        if (Array.isArray(data.schedules) && data.schedules.length) {
          var localSchedMap = {};
          savedSchedules.forEach(function (s) { localSchedMap[s.id] = s; });
          var mergedScheds = data.schedules.map(function (cs) {
            var ls = localSchedMap[cs.id];
            return { id: cs.id, title: cs.title, createdAt: cs.createdAt, orientation: cs.orientation || 'horizontal',
              items: (cs.items || []).map(function (ci) {
                var li = ls && ls.items && ls.items.find(function (i) { return i.id === ci.id; });
                return Object.assign({}, ci, { image: li ? li.image : null });
              })};
          });
          var cloudSchedIds = {};
          data.schedules.forEach(function (s) { cloudSchedIds[s.id] = true; });
          savedSchedules.forEach(function (ls) { if (!cloudSchedIds[ls.id]) mergedScheds.push(ls); });
          setSavedSchedules(mergedScheds); store(STORAGE_SCHEDULES, mergedScheds);
          summary.push(data.schedules.length + ' schedule(s)');
        }
        if (data.lastSynced) setLastSynced(data.lastSynced);
        setSyncStatus('synced');
        addToast && addToast('☁️ Loaded from cloud: ' + (summary.length ? summary.join(', ') : 'up to date'), 'success');
      } catch (e) {
        warnLog('Cloud load failed:', e);
        setSyncStatus('error');
        addToast && addToast('Cloud load failed: ' + e.message, 'error');
      }
    }, [cloudSync, profiles, savedBoards, savedSchedules, addToast]);

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
        addToast && addToast(parsed.length + ' words ready — click Generate Images!', 'success');
      } catch (e) {
        warnLog("Board word gen failed:", e);
        addToast && addToast('Word list generation failed: ' + e.message, 'error');
      } finally { setBoardGenerating(false); }
    }, [boardTopic, onCallGemini, addToast]);

    var generateBoardImages = useCallback(async function () {
      if (!boardWords.length || !onCallImagen) return;
      var items = boardWords.filter(function (w) { return !w.image; });
      if (!items.length) { addToast && addToast('All images already generated', 'info'); return; }
      // ── Symbol reuse: check gallery before calling Imagen ──────────────
      var galleryMap = {};
      gallery.forEach(function (g) { if (g.image) galleryMap[g.label.toLowerCase().trim()] = g.image; });
      var preMatched = []; var toGenerate = [];
      items.forEach(function (item) {
        var cached = galleryMap[item.label.toLowerCase().trim()];
        if (cached) preMatched.push({ id: item.id, image: cached });
        else toGenerate.push(item);
      });
      if (preMatched.length) {
        setBoardWords(function (prev) {
          var map = {}; preMatched.forEach(function (r) { map[r.id] = r.image; });
          return prev.map(function (w) { return map[w.id] ? Object.assign({}, w, { image: map[w.id] }) : w; });
        });
        addToast && addToast(preMatched.length + ' symbol(s) reused from gallery \u2013 saving API calls!', 'info');
      }
      if (!toGenerate.length) { addToast && addToast('All images ready!', 'success'); return; }
      var loadMap = {};
      toGenerate.forEach(function (i) { loadMap[i.id] = true; });
      setBoardLoading(function (p) { return Object.assign({}, p, loadMap); });
      var batchOut = await batchGenerate(
        toGenerate, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, globalStyle,
        function (id) { setBoardLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
      );
      setBoardWords(function (prev) {
        var map = {};
        batchOut.results.forEach(function (r) { map[r.id] = r; });
        return prev.map(function (w) { return map[w.id] ? Object.assign({}, w, { image: map[w.id].image }) : w; });
      });
      setBoardLoading({});
      addToast && addToast('Board images generated!', 'success');
      if (batchOut.failed.length > 0) {
        addToast && addToast('Failed: ' + batchOut.failed.join(', '), 'error');
      }
    }, [boardWords, gallery, autoClean, avatarRef, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

    var regenBoardCell = useCallback(async function (id) {
      var word = boardWords.find(function (w) { return w.id === id; });
      if (!word || !onCallImagen) return;
      setBoardLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(word.label, word.description, globalStyle, avatarRef ? avatarDesc : '');
        var imageUrl = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 300);
        setBoardWords(function (prev) { return prev.map(function (w) { return w.id === id ? Object.assign({}, w, { image: imageUrl }) : w; }); });
      } catch (e) {
        addToast && addToast('Image failed for ' + (word.label || ''), 'error');
      } finally { setBoardLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [boardWords, globalStyle, autoClean, avatarRef, avatarDesc, onCallImagen, onCallGeminiImageEdit, addToast]);

    var saveBoard = useCallback(function () {
      if (!boardWords.length) return;
      var saved = { id: uid(), title: boardTitle || boardTopic, words: boardWords, cols: boardCols, profileId: activeProfileId || null, createdAt: Date.now() };
      var updated = [saved].concat(savedBoards);
      setSavedBoards(updated); store(STORAGE_BOARDS, updated);
      addToast && addToast('Board saved!', 'success');
      if (cloudSync) setTimeout(function () { syncToCloud(); }, 300);
    }, [boardWords, boardTitle, boardTopic, boardCols, activeProfileId, savedBoards, cloudSync, syncToCloud, addToast]);

    var applyBoardTemplate = useCallback(function (template) {
      var words = template.words.map(function (w) { return Object.assign({}, w, { id: uid(), image: null }); });
      setBoardWords(words);
      setBoardTitle(template.label);
      setBoardTopic(template.label);
      addToast && addToast(template.label + ' template loaded — click ✨ Generate Images to start!', 'success');
    }, [addToast]);

    var loadBoard = useCallback(function (board) {
      setBoardWords(board.words.map(function (w) { return Object.assign({}, w); }));
      setBoardTitle(board.title || '');
      setBoardCols(board.cols || 4);
      setShowBoardGallery(false);
      addToast && addToast('Board loaded!', 'success');
    }, [addToast]);

    var deleteSavedBoard = useCallback(function (id) {
      var updated = savedBoards.filter(function (b) { return b.id !== id; });
      setSavedBoards(updated); store(STORAGE_BOARDS, updated);
    }, [savedBoards]);

    var exportBoard = useCallback(function (board) {
      var data = { version: 1, type: 'alloBoard', board: board };
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var safeName = (board.title || 'board').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = 'alloboard_' + safeName + '.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      addToast && addToast('"' + (board.title || 'Board') + '" exported!', 'success');
    }, [addToast]);

    var importSingleBoard = useCallback(function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e2) {
        try {
          var data = JSON.parse(e2.target.result);
          // Support both wrapped { type:'alloBoard', board:{...} } and raw board objects
          var board = (data.type === 'alloBoard' && data.board) ? data.board : data;
          if (!board || !Array.isArray(board.words)) throw new Error('Not a valid board file');
          var imported = Object.assign({}, board, { id: uid(), importedAt: Date.now() });
          var updated = [imported].concat(savedBoards);
          setSavedBoards(updated); store(STORAGE_BOARDS, updated);
          setShowBoardGallery(true);
          addToast && addToast('Board imported: "' + (imported.title || 'Untitled') + '"', 'success');
        } catch (err) {
          addToast && addToast('Import failed — not a valid board file', 'error');
        }
      };
      reader.readAsText(file);
      ev.target.value = '';
    }, [savedBoards, addToast]);

    var tagBoardProfile = useCallback(function (boardId, profileId) {
      var updated = savedBoards.map(function (b) { return b.id === boardId ? Object.assign({}, b, { profileId: profileId || null }) : b; });
      setSavedBoards(updated); store(STORAGE_BOARDS, updated);
    }, [savedBoards]);

    var addFromGallery = useCallback(function (item) {
      var newWord = { id: uid(), label: item.label, description: item.label, category: 'other', image: item.image };
      setBoardWords(function (prev) { return prev.concat([newWord]); });
      addToast && addToast('\u201c' + item.label + '\u201d added to board', 'success');
    }, [addToast]);

    // Sized print: injects a temporary @media print rule then calls window.print()
    var CELL_SIZES = { small: 144, medium: 192, large: 240 }; // px at 96dpi = 1.5", 2", 2.5"
    var printBoardSized = useCallback(function () {
      var sz = CELL_SIZES[boardCellSz] || 192;
      var imgSz = sz - 28;
      var styleId = 'ss-print-sz-override';
      var prev = document.getElementById(styleId); if (prev) prev.parentNode.removeChild(prev);
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = '@media print { .ss-board-cell { width: ' + sz + 'px !important; height: ' + sz + 'px !important; min-height: unset !important; box-sizing: border-box !important; } .ss-board-cell img { width: ' + imgSz + 'px !important; height: ' + imgSz + 'px !important; } }';
      document.head.appendChild(style);
      window.print();
      setTimeout(function () { var el = document.getElementById(styleId); if (el) el.parentNode.removeChild(el); }, 2000);
    }, [boardCellSz]);

    // ── Activity Sets (multi-board books) ─────────────────────────────────
    var createBook = useCallback(function () {
      if (!newBookTitle.trim()) return;
      var book = { id: uid(), title: newBookTitle.trim(), profileId: activeProfileId || null, boardIds: [], createdAt: Date.now() };
      var updated = [book].concat(books);
      setBooks(updated); store(STORAGE_BOOKS, updated);
      setNewBookTitle(''); setActiveBookId(book.id);
      addToast && addToast('Activity Set \u201c' + book.title + '\u201d created!', 'success');
    }, [newBookTitle, activeProfileId, books, addToast]);

    var deleteBook = useCallback(function (bookId) {
      var updated = books.filter(function (b) { return b.id !== bookId; });
      setBooks(updated); store(STORAGE_BOOKS, updated);
      if (activeBookId === bookId) setActiveBookId(null);
    }, [books, activeBookId]);

    var toggleBoardInBook = useCallback(function (bookId, boardId) {
      var updated = books.map(function (book) {
        if (book.id !== bookId) return book;
        var ids = book.boardIds.includes(boardId)
          ? book.boardIds.filter(function (id) { return id !== boardId; })
          : book.boardIds.concat([boardId]);
        return Object.assign({}, book, { boardIds: ids });
      });
      setBooks(updated); store(STORAGE_BOOKS, updated);
    }, [books]);

    var tagBookProfile = useCallback(function (bookId, profileId) {
      var updated = books.map(function (b) { return b.id === bookId ? Object.assign({}, b, { profileId: profileId || null }) : b; });
      setBooks(updated); store(STORAGE_BOOKS, updated);
    }, [books]);

    var printBook = useCallback(function (book) {
      var boardsInSet = book.boardIds.map(function (id) { return savedBoards.find(function (b) { return b.id === id; }); }).filter(Boolean);
      if (!boardsInSet.length) { addToast && addToast('No boards in this set yet', 'error'); return; }
      var sz = CELL_SIZES[boardCellSz] || 192;
      var imgSz = sz - 28;
      var styleId = 'ss-print-sz-override';
      var prev = document.getElementById(styleId); if (prev) prev.parentNode.removeChild(prev);
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = '@media print { .ss-board-cell { width: ' + sz + 'px !important; height: ' + sz + 'px !important; min-height: unset !important; box-sizing: border-box !important; } .ss-board-cell img { width: ' + imgSz + 'px !important; height: ' + imgSz + 'px !important; } }';
      document.head.appendChild(style);
      // Build a temporary print iframe with all boards in sequence
      var html = '<!DOCTYPE html><html><head><style>body{font-family:sans-serif;margin:20px}.board-section{page-break-after:always}.board-title{font-size:18px;font-weight:800;margin-bottom:12px}.board-grid{display:grid;grid-template-columns:repeat(' + (boardsInSet[0].cols || 4) + ',1fr);gap:8px}.ss-board-cell{border:2px solid #e5e7eb;border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:5px;width:' + sz + 'px;height:' + sz + 'px;box-sizing:border-box}.ss-board-cell img{width:' + imgSz + 'px;height:' + imgSz + 'px;object-fit:contain}.cell-label{font-size:11px;font-weight:700;text-align:center;line-height:1.3}</style></head><body>';
      boardsInSet.forEach(function (board, idx) {
        html += '<div class="board-section"><div class="board-title">' + (board.title || 'Board ' + (idx + 1)) + '</div><div class="board-grid">';
        board.words.forEach(function (w) {
          html += '<div class="ss-board-cell">';
          if (w.image) html += '<img src="' + w.image + '" alt="' + w.label + '">';
          html += '<span class="cell-label">' + w.label + '</span></div>';
        });
        html += '</div></div>';
      });
      html += '</body></html>';
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px';
      document.body.appendChild(iframe);
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      setTimeout(function () { iframe.contentWindow.print(); setTimeout(function () { document.body.removeChild(iframe); var el = document.getElementById(styleId); if (el) el.parentNode.removeChild(el); }, 1500); }, 500);
    }, [books, savedBoards, boardCellSz, addToast]);

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
        var batchOut = await batchGenerate(
          items, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, globalStyle,
          null
        );
        setSchedItems(batchOut.results);
        setSchedNowId(batchOut.results[0] ? batchOut.results[0].id : null);
        addToast && addToast('Schedule generated!', 'success');
        if (batchOut.failed.length > 0) {
          addToast && addToast('Failed: ' + batchOut.failed.join(', '), 'error');
        }
      } catch (e) {
        addToast && addToast('Schedule generation failed', 'error');
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
      addToast && addToast('Schedule saved!', 'success');
      if (cloudSync) setTimeout(function () { syncToCloud(); }, 300);
    }, [schedItems, schedTitle, schedOrientation, savedSchedules, cloudSync, syncToCloud, addToast]);

    var resetSchedule = useCallback(function () {
      setSchedItems(function (prev) { return prev.map(function (i) { return Object.assign({}, i, { complete: false }); }); });
      setSchedNowId(schedItems.length ? schedItems[0].id : null);
    }, [schedItems]);

    var loadSchedule = useCallback(function (sched) {
      setSchedItems(sched.items.map(function (i) { return Object.assign({}, i); }));
      setSchedTitle(sched.title || '');
      setSchedOrientation(sched.orientation || 'horizontal');
      setSchedNowId(sched.items.length ? sched.items[0].id : null);
      setShowSchedGallery(false);
      addToast && addToast('Schedule loaded!', 'success');
    }, [addToast]);

    var deleteSavedSchedule = useCallback(function (id) {
      var updated = savedSchedules.filter(function (s) { return s.id !== id; });
      setSavedSchedules(updated); store(STORAGE_SCHEDULES, updated);
    }, [savedSchedules]);

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
        addToast && addToast('Story written! Generating illustrations...', 'success');
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
        addToast && addToast('Story generation failed: ' + e.message, 'error');
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
        addToast && addToast('Illustration failed', 'error');
      } finally { setStoryIllustrating(function (p) { var n = Object.assign({}, p); delete n[pageId]; return n; }); }
    }, [storyPages, avatarRef, onCallImagen, onCallGeminiImageEdit, addToast]);

    // ── Quick Boards actions ───────────────────────────────────────────────
    var genFtCell = useCallback(async function (which) {
      var label = which === 'first' ? ftFirstLabel : ftThenLabel;
      if (!label.trim() || !onCallImagen) return;
      which === 'first' ? setFtFirstLoading(true) : setFtThenLoading(true);
      try {
        var prompt = buildSymbolPrompt(label, '', globalStyle, avatarRef ? avatarDesc : '');
        var img = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 400);
        which === 'first' ? setFtFirstImage(img) : setFtThenImage(img);
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { which === 'first' ? setFtFirstLoading(false) : setFtThenLoading(false); }
    }, [ftFirstLabel, ftThenLabel, globalStyle, avatarRef, avatarDesc, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genChoiceItem = useCallback(async function (id) {
      var item = cbItems.find(function (it) { return it.id === id; });
      if (!item || !item.label.trim() || !onCallImagen) return;
      setCbLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(item.label, '', globalStyle, avatarRef ? avatarDesc : '');
        var img = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarRef, 400);
        setCbItems(function (prev) { return prev.map(function (it) { return it.id === id ? Object.assign({}, it, { image: img }) : it; }); });
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setCbLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [cbItems, globalStyle, avatarRef, avatarDesc, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genTokenReward = useCallback(async function () {
      if (!tokenRewardLabel.trim() || !onCallImagen) return;
      setTokenRewardLoading(true);
      try {
        var prompt = buildSymbolPrompt(tokenRewardLabel, 'a reward or prize', globalStyle, '');
        var img = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, null, 400);
        setTokenRewardImage(img);
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setTokenRewardLoading(false); }
    }, [tokenRewardLabel, globalStyle, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var selectChoice = useCallback(function (id) {
      setCbSelected(id);
      var item = cbItems.find(function (it) { return it.id === id; });
      if (item && item.label && onCallTTS) onCallTTS(item.label, selectedVoice || 'Kore', 1);
    }, [cbItems, onCallTTS, selectedVoice]);

    var handleQbUpload = useCallback(function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file || !qbUploadTarget) return;
      var reader = new FileReader();
      reader.onload = function (e2) {
        var img = e2.target.result;
        if (qbUploadTarget.type === 'ft') {
          qbUploadTarget.which === 'first' ? setFtFirstImage(img) : setFtThenImage(img);
        } else if (qbUploadTarget.type === 'cb') {
          setCbItems(function (prev) { return prev.map(function (it) { return it.id === qbUploadTarget.id ? Object.assign({}, it, { image: img }) : it; }); });
        } else if (qbUploadTarget.type === 'token') {
          setTokenRewardImage(img);
        } else if (qbUploadTarget.type === 'cm') {
          setCmItems(function (prev) { return prev.map(function (it) { return it.id === qbUploadTarget.id ? Object.assign({}, it, { image: img }) : it; }); });
        } else if (qbUploadTarget.type === 'sn') {
          setSnItems(function (prev) { return prev.map(function (it) { return it.id === qbUploadTarget.id ? Object.assign({}, it, { image: img }) : it; }); });
        }
      };
      reader.readAsDataURL(file);
      ev.target.value = ''; setQbUploadTarget(null);
    }, [qbUploadTarget]);

    // ── Calming Corner actions ─────────────────────────────────────────────
    var genCmItem = useCallback(async function (id) {
      var item = cmItems.find(function (it) { return it.id === id; });
      if (!item || !onCallImagen) return;
      setCmLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(item.label, 'a calming self-regulation strategy for children, peaceful and soothing scene', globalStyle, '');
        var img = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, null, 400);
        setCmItems(function (prev) { return prev.map(function (it) { return it.id === id ? Object.assign({}, it, { image: img }) : it; }); });
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setCmLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [cmItems, globalStyle, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genAllCmItems = useCallback(async function () {
      var items = cmItems.filter(function (it) { return !it.image; });
      if (!items.length || !onCallImagen) return;
      var loadMap = {};
      items.forEach(function (i) { loadMap[i.id] = true; });
      setCmLoading(function (p) { return Object.assign({}, p, loadMap); });
      var batchOut = await batchGenerate(
        items, onCallImagen, onCallGeminiImageEdit, autoClean, null, globalStyle,
        function (id) { setCmLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
      );
      setCmItems(function (prev) {
        var map = {};
        batchOut.results.forEach(function (r) { map[r.id] = r; });
        return prev.map(function (it) { return map[it.id] ? Object.assign({}, it, { image: map[it.id].image }) : it; });
      });
      setCmLoading({});
      addToast && addToast('Calming Corner images ready!', 'success');
    }, [cmItems, autoClean, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

    // ── Sensory Needs actions ──────────────────────────────────────────────
    var genSnItem = useCallback(async function (id) {
      var item = snItems.find(function (it) { return it.id === id; });
      if (!item || !onCallImagen) return;
      setSnLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var prompt = buildSymbolPrompt(item.label, 'a sensory regulation need for a child with sensory sensitivities, clear and simple AAC-style symbol', globalStyle, '');
        var img = await genWithRetry(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, null, 400);
        setSnItems(function (prev) { return prev.map(function (it) { return it.id === id ? Object.assign({}, it, { image: img }) : it; }); });
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setSnLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [snItems, globalStyle, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genAllSnItems = useCallback(async function () {
      var items = snItems.filter(function (it) { return !it.image; });
      if (!items.length || !onCallImagen) return;
      var loadMap = {};
      items.forEach(function (i) { loadMap[i.id] = true; });
      setSnLoading(function (p) { return Object.assign({}, p, loadMap); });
      var batchOut = await batchGenerate(
        items, onCallImagen, onCallGeminiImageEdit, autoClean, null, globalStyle,
        function (id) { setSnLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
      );
      setSnItems(function (prev) {
        var map = {};
        batchOut.results.forEach(function (r) { map[r.id] = r; });
        return prev.map(function (it) { return map[it.id] ? Object.assign({}, it, { image: map[it.id].image }) : it; });
      });
      setSnLoading({});
      addToast && addToast('Sensory Needs images ready!', 'success');
    }, [snItems, autoClean, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

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

    // ── Quick Boards tab ───────────────────────────────────────────────────
    function renderQuickBoardsTab() {
      var ORANGE = '#f97316'; var GREEN = '#22c55e'; var BLUE = '#3b82f6';
      var subModes = [
        { id: 'firstthen', icon: '➡️', label: 'First-Then' },
        { id: 'choice', icon: '🔵', label: 'Choice Board' },
        { id: 'token', icon: '⭐', label: 'Token Economy' },
        { id: 'calming', icon: '🌿', label: 'Calming Corner' },
        { id: 'sensory', icon: '🎧', label: 'Sensory Needs' },
      ];

      function qbUploadBtn(target) {
        return e('button', {
          onClick: function () { setQbUploadTarget(target); qbUploadRef.current && qbUploadRef.current.click(); },
          style: S.btn('#f3f4f6', '#374151', false)
        }, '📷');
      }

      function cellImage(img, loading, size) {
        var sz = size || 160;
        if (loading) return e('div', { style: { width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, spinner(32));
        if (img) return e('img', { src: img, style: { width: sz, height: sz, objectFit: 'contain', padding: '6px' } });
        return e('div', { style: { width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#d1d5db' } }, '?');
      }

      // ── First-Then Board ──
      function renderFirstThen() {
        function ftSide(which) {
          var label = which === 'first' ? ftFirstLabel : ftThenLabel;
          var setLabel = which === 'first' ? setFtFirstLabel : setFtThenLabel;
          var img = which === 'first' ? ftFirstImage : ftThenImage;
          var loading = which === 'first' ? ftFirstLoading : ftThenLoading;
          var color = which === 'first' ? ORANGE : GREEN;
          var titleText = which === 'first' ? 'FIRST' : 'THEN';
          return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 210 } },
            e('div', { style: { background: color, borderRadius: '8px 8px 0 0', padding: '10px', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '0.06em' } }, titleText),
            e('div', { style: { border: '3px solid ' + color, borderTop: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', minHeight: 170 } },
              cellImage(img, loading, 160)
            ),
            e('div', { style: { border: '3px solid ' + color, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '8px', background: '#fff' } },
              e('div', { style: { textAlign: 'center', fontWeight: 700, fontSize: '16px', color: '#1f2937', minHeight: '22px' } }, label || '\u00a0'),
              e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '4px', marginTop: '6px' } },
                e('input', { type: 'text', value: label, onChange: function (ev) { setLabel(ev.target.value); }, placeholder: which === 'first' ? 'e.g. homework' : 'e.g. iPad time', style: Object.assign({}, S.input, { fontSize: '11px' }) }),
                e('button', { onClick: function () { genFtCell(which); }, disabled: loading || !label.trim() || !onCallImagen, style: S.btn(PURPLE, '#fff', loading || !label.trim() || !onCallImagen) }, '✨'),
                qbUploadBtn({ type: 'ft', which: which })
              )
            )
          );
        }
        return e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', flex: 1 } },
          ftSide('first'),
          e('div', { style: { fontSize: '52px', color: '#9ca3af', flexShrink: 0, userSelect: 'none' } }, '→'),
          ftSide('then')
        );
      }

      // ── Choice Board ──
      function renderChoiceBoard() {
        var visibleItems = cbItems.slice(0, cbCount);
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flex: 1 } },
          e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '6px', alignItems: 'center' } },
            e('span', { style: { fontSize: '12px', fontWeight: 600, color: '#374151' } }, 'Choices:'),
            [2, 3, 4].map(function (n) {
              return e('button', { key: n, onClick: function () { setCbCount(n); setCbSelected(null); }, style: { padding: '4px 12px', borderRadius: '6px', border: '2px solid ' + (cbCount === n ? PURPLE : '#d1d5db'), background: cbCount === n ? LIGHT_PURPLE : '#fff', color: cbCount === n ? PURPLE : '#374151', fontWeight: cbCount === n ? 700 : 400, fontSize: '12px', cursor: 'pointer' } }, n);
            }),
            cbSelected && e('button', { onClick: function () { setCbSelected(null); }, className: 'ss-no-print', style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { marginLeft: 'auto' }) }, '↺ Reset')
          ),
          e('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', flex: 1, alignItems: 'center' } },
            visibleItems.map(function (item, idx) {
              var isSelected = cbSelected === item.id;
              var isLoading = !!cbLoading[item.id];
              return e('div', {
                key: item.id,
                onClick: function () { if (item.image || item.label) selectChoice(item.id); },
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', border: '3px solid ' + (isSelected ? BLUE : '#e5e7eb'), borderRadius: '12px', background: isSelected ? '#eff6ff' : '#fff', cursor: (item.image || item.label) ? 'pointer' : 'default', transition: 'all 0.15s', boxShadow: isSelected ? '0 0 0 3px #bfdbfe' : 'none', padding: '4px', minWidth: 130 }
              },
                e('div', { style: { width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, cellImage(item.image, isLoading, 120)),
                e('div', { style: { fontWeight: 700, fontSize: '14px', color: '#1f2937', padding: '6px 4px 2px', textAlign: 'center', minHeight: '20px' } }, item.label || '\u00a0'),
                e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '3px', padding: '4px', width: '100%' } },
                  e('input', { type: 'text', value: item.label, onChange: function (ev) { var v = ev.target.value; setCbItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); }, placeholder: 'Option ' + (idx + 1), style: Object.assign({}, S.input, { fontSize: '11px' }), onClick: function (ev) { ev.stopPropagation(); } }),
                  e('button', { onClick: function (ev) { ev.stopPropagation(); genChoiceItem(item.id); }, disabled: isLoading || !item.label.trim() || !onCallImagen, style: S.btn(PURPLE, '#fff', isLoading || !item.label.trim() || !onCallImagen) }, '✨'),
                  qbUploadBtn({ type: 'cb', id: item.id })
                )
              );
            })
          )
        );
      }

      // ── Token Economy ──
      function renderTokenEconomy() {
        var tokens = [];
        for (var i = 0; i < tokenTotal; i++) { tokens.push(i); }
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '14px', flex: 1 } },
          // Controls
          e('div', { className: 'ss-no-print', style: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' } },
            e('div', null,
              e('label', { style: S.lbl }, 'Working for...'),
              e('input', { type: 'text', value: tokenLabel, onChange: function (ev) { setTokenLabel(ev.target.value); }, placeholder: 'e.g. Stay in seat', style: Object.assign({}, S.input, { width: 140 }) })
            ),
            e('div', null,
              e('label', { style: S.lbl }, 'Tokens needed'),
              e('select', { value: tokenTotal, onChange: function (ev) { setTokenTotal(Number(ev.target.value)); setTokenEarned(0); }, style: Object.assign({}, S.input, { width: 70 }) },
                [2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return e('option', { key: n, value: n }, n); })
              )
            ),
            e('button', { onClick: function () { setTokenEarned(0); }, style: S.btn('#f3f4f6', '#374151', false) }, '↺ Reset')
          ),
          // Board content
          e('div', { style: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', flex: 1 } },
            // Token row
            e('div', { style: { flex: 1 } },
              tokenLabel && e('div', { style: { fontWeight: 700, fontSize: '14px', color: '#374151', marginBottom: '10px', textAlign: 'center' } }, 'Working for: ' + tokenLabel),
              e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '12px' } },
                tokens.map(function (idx) {
                  var earned = idx < tokenEarned;
                  return e('div', {
                    key: idx,
                    onClick: function () { setTokenEarned(function (prev) { return prev === idx + 1 ? idx : idx + 1; }); },
                    style: { width: 52, height: 52, borderRadius: '50%', border: '3px solid ' + (earned ? '#f59e0b' : '#d1d5db'), background: earned ? '#fef3c7' : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: earned ? '0 2px 6px rgba(245,158,11,0.4)' : 'none' }
                  }, earned ? '⭐' : e('span', { style: { color: '#d1d5db', fontSize: '20px' } }, '○'));
                })
              ),
              // Progress bar
              e('div', { style: { background: '#f3f4f6', borderRadius: '20px', height: 14, overflow: 'hidden', margin: '0 auto', maxWidth: 280 } },
                e('div', { style: { height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '20px', width: (tokenTotal > 0 ? (tokenEarned / tokenTotal * 100) : 0) + '%', transition: 'width 0.3s' } })
              ),
              e('div', { style: { textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '4px' } }, tokenEarned + ' / ' + tokenTotal + ' tokens earned'),
              tokenEarned >= tokenTotal && e('div', { style: { textAlign: 'center', fontSize: '18px', fontWeight: 800, color: '#16a34a', marginTop: '8px' } }, '🎉 Great job! Time for your reward!')
            ),
            // Reward panel
            e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: 130 } },
              e('div', { style: { fontWeight: 700, fontSize: '12px', color: '#374151' } }, 'REWARD'),
              e('div', { style: { width: 120, height: 120, border: '3px solid #16a34a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' } },
                cellImage(tokenRewardImage, tokenRewardLoading, 110)
              ),
              e('div', { style: { fontWeight: 700, fontSize: '14px', color: '#16a34a', textAlign: 'center' } }, tokenRewardLabel || '\u00a0'),
              e('div', { className: 'ss-no-print', style: { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' } },
                e('input', { type: 'text', value: tokenRewardLabel, onChange: function (ev) { setTokenRewardLabel(ev.target.value); }, placeholder: 'e.g. iPad time', style: Object.assign({}, S.input, { fontSize: '11px' }) }),
                e('div', { style: { display: 'flex', gap: '4px' } },
                  e('button', { onClick: genTokenReward, disabled: tokenRewardLoading || !tokenRewardLabel.trim() || !onCallImagen, style: S.btn(PURPLE, '#fff', tokenRewardLoading || !tokenRewardLabel.trim() || !onCallImagen) }, '✨'),
                  qbUploadBtn({ type: 'token' })
                )
              )
            )
          )
        );
      }

      // ── Calming Corner ──
      function renderCalmingCorner() {
        var TEAL = '#0d9488'; var TEAL_LIGHT = '#f0fdfa'; var TEAL_BORDER = '#99f6e4';
        var cmLoadingAny = Object.keys(cmLoading).length > 0;
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flex: 1, overflow: 'hidden' } },
          // Controls bar
          e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 } },
            e('p', { style: { fontSize: '12px', color: '#6b7280', margin: 0 } }, 'Tap any card to speak the strategy aloud • Edit labels directly on each card'),
            e('button', {
              onClick: genAllCmItems,
              disabled: !onCallImagen || cmLoadingAny,
              style: Object.assign({}, S.btn(TEAL, '#fff', !onCallImagen || cmLoadingAny), { marginLeft: 'auto' })
            }, cmLoadingAny ? '⏳ Generating...' : '✨ Generate All Images')
          ),
          // Strategy grid
          e('div', { id: 'ss-pq-calming', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', overflowY: 'auto', flex: 1 } },
            cmItems.map(function (item) {
              var isLoading = !!cmLoading[item.id];
              return e('div', {
                key: item.id,
                onClick: function () { if (onCallTTS) onCallTTS(item.label, selectedVoice || 'Kore', 1); },
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 10px 10px', border: '2px solid ' + TEAL_BORDER, borderRadius: '14px', background: TEAL_LIGHT, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', position: 'relative' },
                onMouseOver: function (ev) { ev.currentTarget.style.boxShadow = '0 4px 14px rgba(13,148,136,0.2)'; ev.currentTarget.style.transform = 'translateY(-2px)'; },
                onMouseOut: function (ev) { ev.currentTarget.style.boxShadow = 'none'; ev.currentTarget.style.transform = 'none'; }
              },
                // Image area
                e('div', { style: { width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: '#fff', border: '1px solid ' + TEAL_BORDER, overflow: 'hidden', flexShrink: 0 } },
                  isLoading ? spinner(28) :
                  item.image ? e('img', { src: item.image, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '6px' } }) :
                  e('div', { style: { fontSize: '38px' } }, '🌿')
                ),
                // Label (editable)
                e('input', {
                  type: 'text', value: item.label,
                  onClick: function (ev) { ev.stopPropagation(); },
                  onChange: function (ev) { var v = ev.target.value; setCmItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); },
                  style: { border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12px', color: '#064e3b', textAlign: 'center', width: '100%', outline: 'none', cursor: 'text', lineHeight: 1.4 }
                }),
                // Action buttons
                e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '4px' } },
                  e('button', { title: 'Generate image', onClick: function (ev) { ev.stopPropagation(); genCmItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '✨'),
                  e('button', { title: 'Upload image', onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'cm', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '📷')
                )
              );
            })
          ),
          // Tip
          e('p', { className: 'ss-no-print', style: { fontSize: '11px', color: '#6b7280', margin: 0, flexShrink: 0 } }, 'Print as a laminated "Calming Menu" poster for the calming corner, breakroom, or student desk strip.')
        );
      }

      function renderSensoryNeeds() {
        var AMBER = '#d97706'; var AMBER_LIGHT = '#fffbeb'; var AMBER_BORDER = '#fcd34d';
        var snLoadingAny = Object.keys(snLoading).length > 0;
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flex: 1, overflow: 'hidden' } },
          // Controls bar
          e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 } },
            e('p', { style: { fontSize: '12px', color: '#6b7280', margin: 0 } }, 'Tap any card to say the need aloud • Helps non-verbal students communicate sensory overload'),
            e('button', {
              onClick: genAllSnItems,
              disabled: !onCallImagen || snLoadingAny,
              style: Object.assign({}, S.btn(AMBER, '#fff', !onCallImagen || snLoadingAny), { marginLeft: 'auto' })
            }, snLoadingAny ? '⏳ Generating...' : '✨ Generate All Images')
          ),
          // Sensory grid
          e('div', { id: 'ss-pq-sensory', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', overflowY: 'auto', flex: 1 } },
            snItems.map(function (item) {
              var isLoading = !!snLoading[item.id];
              return e('div', {
                key: item.id,
                onClick: function () { if (onCallTTS) onCallTTS(item.label, selectedVoice || 'Kore', 1); },
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 10px 10px', border: '2px solid ' + AMBER_BORDER, borderRadius: '14px', background: AMBER_LIGHT, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', position: 'relative' },
                onMouseOver: function (ev) { ev.currentTarget.style.boxShadow = '0 4px 14px rgba(217,119,6,0.2)'; ev.currentTarget.style.transform = 'translateY(-2px)'; },
                onMouseOut: function (ev) { ev.currentTarget.style.boxShadow = 'none'; ev.currentTarget.style.transform = 'none'; }
              },
                // Image area
                e('div', { style: { width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: '#fff', border: '1px solid ' + AMBER_BORDER, overflow: 'hidden', flexShrink: 0 } },
                  isLoading ? spinner(28) :
                  item.image ? e('img', { src: item.image, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '6px' } }) :
                  e('div', { style: { fontSize: '34px' } }, '🎧')
                ),
                // Label (editable)
                e('input', {
                  type: 'text', value: item.label,
                  onClick: function (ev) { ev.stopPropagation(); },
                  onChange: function (ev) { var v = ev.target.value; setSnItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); },
                  style: { border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12px', color: '#78350f', textAlign: 'center', width: '100%', outline: 'none', cursor: 'text', lineHeight: 1.4 }
                }),
                // Action buttons
                e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '4px' } },
                  e('button', { title: 'Generate image', onClick: function (ev) { ev.stopPropagation(); genSnItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '✨'),
                  e('button', { title: 'Upload image', onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'sn', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '📷')
                )
              );
            })
          ),
          // Tip
          e('p', { className: 'ss-no-print', style: { fontSize: '11px', color: '#6b7280', margin: 0, flexShrink: 0 } }, 'Print as a personal "How I Feel" card or laminated desk reference for students who struggle to verbalize sensory needs.')
        );
      }

      return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } },
        // Sub-mode switcher
        e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '4px', padding: '10px 12px 0', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' } },
          subModes.map(function (sm) {
            var active = qbMode === sm.id;
            return e('button', { key: sm.id, onClick: function () { setQbMode(sm.id); }, style: { padding: '7px 14px', borderRadius: '8px 8px 0 0', border: active ? '2px solid #e5e7eb' : '2px solid transparent', borderBottom: active ? '2px solid #fff' : '2px solid transparent', background: active ? '#fff' : 'transparent', color: active ? PURPLE : '#6b7280', fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: active ? '-2px' : '0', position: 'relative', whiteSpace: 'nowrap', flexShrink: 0 } },
              e('span', null, sm.icon), sm.label);
          })
        ),
        // Board content (print area)
        e('div', { id: 'ss-pq', style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
          qbMode === 'firstthen' && renderFirstThen(),
          qbMode === 'choice' && renderChoiceBoard(),
          qbMode === 'token' && renderTokenEconomy(),
          qbMode === 'calming' && renderCalmingCorner(),
          qbMode === 'sensory' && renderSensoryNeeds()
        ),
        // Print bar
        e('div', { className: 'ss-no-print', style: { padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
          e('button', { onClick: function () { window.print(); }, style: S.btn('#f3f4f6', '#374151', false) }, '🖨️ Print Board')
        ),
        e('input', { type: 'file', accept: 'image/*', ref: qbUploadRef, style: { display: 'none' }, onChange: handleQbUpload })
      );
    }

    // ── Shared left column ─────────────────────────────────────────────────
    function renderSharedLeft() {
      return e('div', { style: S.leftCol },
        // Student Profiles panel
        e('div', { style: S.card },
          e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
            sectionLabel('Student Profiles'),
            profiles.length < MAX_PROFILES && e('button', {
              onClick: addProfile,
              style: { padding: '2px 8px', border: '1px dashed #9ca3af', borderRadius: '12px', background: 'transparent', color: '#9ca3af', fontSize: '11px', cursor: 'pointer', lineHeight: 1.4 }
            }, '+ Add')
          ),
          // Profile chips row
          e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' } },
            profiles.map(function (prof) {
              var isActive = prof.id === activeProfileId;
              return e('button', {
                key: prof.id,
                onClick: function () { if (isActive) { setShowAvatar(!showAvatar); } else { switchProfile(prof.id); setShowAvatar(true); } },
                style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', border: '2px solid ' + (isActive ? PURPLE : '#d1d5db'), background: isActive ? LIGHT_PURPLE : '#f9fafb', color: isActive ? PURPLE : '#374151', fontWeight: isActive ? 700 : 500, fontSize: '11px', cursor: 'pointer' }
              },
                prof.image
                  ? e('img', { src: prof.image, style: { width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' } })
                  : e('span', { style: { fontSize: '11px' } }, '👤'),
                prof.name || 'Student'
              );
            })
          ),
          // Edit panel for active profile
          showAvatar && e('div', { style: { borderTop: '1px solid #f3f4f6', paddingTop: '10px' } },
            activeProfile.image && e('img', { src: activeProfile.image, style: { width: '100%', maxHeight: '70px', objectFit: 'cover', borderRadius: '7px', marginBottom: '8px' } }),
            e('label', { style: S.lbl }, 'Name'),
            e('input', { type: 'text', value: avatarName, onChange: function (ev) {
              var val = ev.target.value; setAvatarName(val);
              var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { name: val }) : p; });
              setProfiles(upd); store(STORAGE_PROFILES, upd);
            }, placeholder: 'e.g. Marcus', style: Object.assign({}, S.input, { marginBottom: '6px' }) }),
            e('label', { style: S.lbl }, 'Appearance'),
            e('input', { type: 'text', value: avatarDesc, onChange: function (ev) {
              var val = ev.target.value; setAvatarDesc(val);
              var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { description: val }) : p; });
              setProfiles(upd); store(STORAGE_PROFILES, upd);
            }, placeholder: 'e.g. 8-year-old boy with curly hair', style: Object.assign({}, S.input, { marginBottom: '8px' }) }),
            e('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } },
              e('button', { onClick: generateAvatar, disabled: avatarGenerating || !avatarDesc.trim(), style: S.btn(PURPLE, '#fff', avatarGenerating || !avatarDesc.trim()) }, avatarGenerating ? '⏳' : '✨ Generate'),
              e('button', { onClick: function () { fileInputRef.current && fileInputRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '📷 Upload'),
              activeProfile.image && e('button', { onClick: clearAvatar, title: 'Clear avatar image', style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️'),
              profiles.length > 1 && e('button', { onClick: function () { deleteProfile(activeProfileId); }, title: 'Delete this profile', style: S.btn('#fee2e2', '#dc2626', false) }, '✕')
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
        ),
        // Backup & Restore
        e('div', { style: S.card },
          sectionLabel('Backup & Restore'),
          e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '0 0 8px' } },
            gallery.length + ' symbol' + (gallery.length !== 1 ? 's' : '') + ' · ' +
            savedBoards.length + ' board' + (savedBoards.length !== 1 ? 's' : '') + ' · ' +
            savedSchedules.length + ' schedule' + (savedSchedules.length !== 1 ? 's' : '')
          ),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
            e('button', { onClick: exportData, style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { textAlign: 'left' }) }, '⬇️ Export Backup'),
            e('button', { onClick: function () { importFileRef.current && importFileRef.current.click(); }, style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { textAlign: 'left' }) }, '📂 Import Backup')
          ),
          e('input', { type: 'file', accept: '.json', ref: importFileRef, style: { display: 'none' }, onChange: importData }),
          cloudSync && e('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' } },
              e('span', { style: { fontSize: '10px', color: syncStatus === 'synced' ? '#16a34a' : syncStatus === 'error' ? '#dc2626' : '#9ca3af' } },
                syncStatus === 'syncing' ? '⏳ Syncing...' : syncStatus === 'synced' ? '✓ Cloud synced' : syncStatus === 'error' ? '✗ Sync error' : '☁️ Cloud backup'
              ),
              lastSynced && e('span', { style: { fontSize: '9px', color: '#9ca3af', marginLeft: 'auto' } }, new Date(lastSynced).toLocaleDateString())
            ),
            e('div', { style: { display: 'flex', gap: '4px' } },
              e('button', { onClick: syncToCloud, disabled: syncStatus === 'syncing', style: Object.assign({}, S.btn(PURPLE, '#fff', syncStatus === 'syncing'), { flex: 1, fontSize: '11px' }) }, '☁️ Sync Now'),
              e('button', { onClick: loadFromCloud, disabled: syncStatus === 'syncing', style: Object.assign({}, S.btn('#f3f4f6', '#374151', syncStatus === 'syncing'), { flex: 1, fontSize: '11px' }) }, '📥 Load')
            )
          )
        )
      );
    }

    // ── Symbol Gallery tab ─────────────────────────────────────────────────
    function renderSymbolsTab() {
      var selectedItem = gallery.find(function (i) { return i.id === selectedId; }) || null;
      var filtered = gallery.filter(function (i) {
        if (symShowFavs && !i.isFavorite) return false;
        if (symFilter.trim() && !i.label.toLowerCase().includes(symFilter.toLowerCase())) return false;
        return true;
      });
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
                e('div', null, e('label', { style: S.lbl }, 'Context (optional)'), e('input', { type: 'text', value: symDesc, onChange: function (ev) { setSymDesc(ev.target.value); }, placeholder: 'e.g. hygiene routine', style: S.input })),
                e('div', null,
                  e('label', { style: S.lbl }, 'Category'),
                  e('select', { value: symCategory, onChange: function (ev) { setSymCategory(ev.target.value); }, style: S.input },
                    e('option', { value: '' }, 'other'),
                    ['emotions', 'classroom', 'daily living', 'food', 'social', 'actions', 'places', 'objects'].map(function (c) { return e('option', { key: c, value: c }, c); })
                  )
                )
              )
            : e('div', null,
                e('label', { style: S.lbl }, 'One label per line'),
                e('textarea', { value: symBatch, onChange: function (ev) { setSymBatch(ev.target.value); }, placeholder: 'brush teeth\nget dressed\neat breakfast', style: Object.assign({}, S.textarea, { height: '70px' }) }),
                e('p', { style: { fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' } }, symBatch.split('\n').filter(function (l) { return l.trim(); }).length + ' queued'),
                e('div', { style: { marginTop: '6px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, 'Quick Sets'),
                  e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                    QUICK_SETS.map(function (qs) {
                      return e('button', { key: qs.label, onClick: function () { setSymBatch(qs.items.join('\n')); }, style: { padding: '3px 7px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '3px' } },
                        e('span', null, qs.icon), qs.label
                      );
                    })
                  )
                )
              ),
          e('button', { onClick: symMode === 'single' ? genSingle : genBatch, disabled: isLoading || (symMode === 'single' ? !symLabel.trim() : !symBatch.trim()), style: S.btn(PURPLE, '#fff', isLoading || (symMode === 'single' ? !symLabel.trim() : !symBatch.trim())) },
            isLoading ? '⏳ Generating...' : '✨ Generate' + (symMode === 'batch' ? ' Batch' : '')
          ),
          gallery.length > 0 && e('button', { onClick: downloadAll, style: S.btn('#f3f4f6', '#374151', false) }, '⬇️ Download All (' + gallery.length + ')'),
          gallery.length > 0 && e('button', { onClick: clearGallery, style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️ Clear All')
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
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' } },
              e('span', { style: { fontWeight: 600, fontSize: '12px', color: '#374151' } }, 'Gallery (' + gallery.length + ')'),
              e('button', { onClick: function () { setSymShowFavs(!symShowFavs); }, style: { padding: '3px 8px', border: '1px solid ' + (symShowFavs ? PURPLE : '#e5e7eb'), borderRadius: '12px', background: symShowFavs ? LIGHT_PURPLE : '#fff', color: symShowFavs ? PURPLE : '#6b7280', fontSize: '11px', cursor: 'pointer', fontWeight: symShowFavs ? 700 : 400 } }, '⭐ Favs'),
              e('input', { type: 'text', value: symFilter, onChange: function (ev) { setSymFilter(ev.target.value); }, placeholder: 'Search...', style: { border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', outline: 'none', marginLeft: 'auto', width: '90px' } })
            ),
            filtered.length > 0
              ? e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '7px' } },
                  filtered.map(function (item) {
                    return e('div', { key: item.id, onClick: function () { setSelectedId(item.id); }, style: { cursor: 'pointer', borderRadius: '8px', border: item.id === selectedId ? '2px solid ' + PURPLE : '2px solid #e5e7eb', background: item.id === selectedId ? LIGHT_PURPLE : '#fafafa', padding: '7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'border-color 0.15s', position: 'relative' } },
                      symLoading[item.id]
                        ? e('div', { style: { width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '6px' } }, spinner(20))
                        : e('img', { src: item.image, alt: item.label, style: { width: 72, height: 72, objectFit: 'contain', borderRadius: '6px', background: '#fff' } }),
                      e('span', { style: { fontSize: '10px', color: '#4b5563', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3 } }, item.label),
                      e('button', { onClick: function (ev) { ev.stopPropagation(); toggleFavorite(item.id); }, style: { position: 'absolute', top: 3, right: 3, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: item.isFavorite ? 1 : 0.3, padding: '1px' }, title: item.isFavorite ? 'Remove from favorites' : 'Add to favorites' }, '⭐')
                    );
                  })
                )
              : e('div', { style: { textAlign: 'center', color: '#9ca3af', padding: '30px 0', fontSize: '13px' } }, gallery.length === 0 ? 'Generate your first symbol using the panel on the left.' : (symShowFavs ? 'No favorite symbols yet — click ⭐ on any card.' : 'No symbols match "' + symFilter + '"'))
          )
        )
      );
    }

    // ── Board Builder tab ──────────────────────────────────────────────────
    function renderBoardTab() {
      var hasImages = boardWords.some(function (w) { return w.image; });
      var isLoading = Object.keys(boardLoading).length > 0 || boardGenerating;
      return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px', gap: '12px' } },
        // Template picker row
        e('div', { style: { flexShrink: 0 } },
          e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, 'Quick Templates'),
          e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            BOARD_TEMPLATES.map(function (t) {
              return e('button', {
                key: t.id,
                onClick: function () { applyBoardTemplate(t); },
                style: { padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: '20px', background: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', transition: 'background 0.1s' },
                onMouseOver: function (ev) { ev.currentTarget.style.background = LIGHT_PURPLE; ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.color = PURPLE; },
                onMouseOut: function (ev) { ev.currentTarget.style.background = '#fff'; ev.currentTarget.style.borderColor = '#e5e7eb'; ev.currentTarget.style.color = '#374151'; }
              }, e('span', null, t.icon), t.label);
            })
          )
        ),
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
          e('button', { onClick: function () { setShowGalleryPicker(!showGalleryPicker); }, style: S.btn(showGalleryPicker ? LIGHT_PURPLE : '#f3f4f6', showGalleryPicker ? PURPLE : '#374151', false), title: 'Add a symbol from your gallery directly to the board' }, '🖼️ From Gallery'),
          hasImages && e('div', { style: { display: 'flex', gap: '6px' } },
            e('button', { onClick: saveBoard, style: S.btn('#f3f4f6', '#374151', false) }, '💾 Save'),
            e('button', { onClick: function () { setShowPrintSettings(!showPrintSettings); }, style: S.btn('#dbeafe', '#1e40af', false) }, '🖨️ Print\u2026')
          ),
          savedBoards.length > 0 && e('button', { onClick: function () { setShowBoardGallery(!showBoardGallery); }, style: S.btn(showBoardGallery ? LIGHT_PURPLE : '#f3f4f6', showBoardGallery ? PURPLE : '#374151', false) }, '📂 Saved (' + savedBoards.length + ')'),
          e('button', { onClick: function () { importBoardRef.current && importBoardRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false), title: 'Import a board from a .json file' }, '📥 Import Board'),
          e('input', { type: 'file', accept: '.json', ref: importBoardRef, style: { display: 'none' }, onChange: importSingleBoard })
        ),
        // Saved boards panel
        showBoardGallery && e('div', { style: { flexShrink: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', paddingTop: '6px' } },
          // Profile filter chips
          profiles.length > 1 && e('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', padding: '0 0 8px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px' } },
            e('button', {
              onClick: function () { setBoardProfileFilter(''); },
              style: Object.assign({}, S.chip(boardProfileFilter === '' ? PURPLE : '#f3f4f6', boardProfileFilter === '' ? '#fff' : '#6b7280'), { border: 'none' })
            }, 'All students'),
            profiles.map(function (prof) {
              var active = boardProfileFilter === prof.id;
              return e('button', {
                key: prof.id,
                onClick: function () { setBoardProfileFilter(active ? '' : prof.id); },
                style: Object.assign({}, S.chip(active ? PURPLE : '#ede9fe', active ? '#fff' : PURPLE), { border: 'none', display: 'flex', alignItems: 'center', gap: '3px' })
              },
                prof.image ? e('img', { src: prof.image, style: { width: 12, height: 12, borderRadius: '50%', objectFit: 'cover' } }) : '👤',
                prof.name || 'Student'
              );
            })
          ),
          e('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' } },
            savedBoards
              .filter(function (b) { return !boardProfileFilter || b.profileId === boardProfileFilter; })
              .map(function (b) {
                var taggedProf = profiles.find(function (p) { return p.id === b.profileId; }) || null;
                return e('div', { key: b.id, style: { flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px', maxWidth: '220px' } },
                  // Title + word count
                  e('div', null,
                    e('div', { style: { fontWeight: 600, fontSize: '12px', color: '#1f2937', marginBottom: '2px' } }, b.title || 'Untitled Board'),
                    e('div', { style: { fontSize: '10px', color: '#9ca3af' } }, b.words.length + ' words')
                  ),
                  // Profile tag selector
                  e('select', {
                    value: b.profileId || '',
                    onChange: function (ev) { tagBoardProfile(b.id, ev.target.value || null); },
                    style: { fontSize: '10px', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '2px 4px', color: b.profileId ? PURPLE : '#9ca3af', background: b.profileId ? LIGHT_PURPLE : '#f9fafb', cursor: 'pointer', width: '100%' },
                    title: 'Assign board to a student'
                  },
                    e('option', { value: '' }, '— No student —'),
                    profiles.map(function (p) { return e('option', { key: p.id, value: p.id }, (p.name || 'Student')); })
                  ),
                  // Action buttons row
                  e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                    e('button', { onClick: function () { loadBoard(b); }, style: S.btn(LIGHT_PURPLE, PURPLE, false) }, 'Load'),
                    b.words && b.words.some(function (w) { return w.image; }) && e('button', {
                      onClick: function () { setScanBoardId(b.id); setScanIndex(0); setScanPaused(false); },
                      title: 'Partner-assisted scanning mode',
                      style: S.btn('#ecfdf5', '#065f46', false)
                    }, '♿ Use'),
                    e('button', { onClick: function () { exportBoard(b); }, title: 'Export this board as a .json file', style: S.btn('#f3f4f6', '#374151', false) }, '⬇️'),
                    liveSession && liveSession.active && e('button', {
                      title: 'Push to student screens',
                      onClick: function () {
                        var stripped = b.words.map(function (w) { return { word: w.word, wordType: w.wordType }; });
                        liveSession.push({ type: 'board', title: b.title, words: stripped, cols: b.cols || 4 })
                          .then(function () { addToast('Board pushed to students!', 'success'); })
                          .catch(function () { addToast('Push failed — check session connection', 'error'); });
                      },
                      style: S.btn('#ecfdf5', '#065f46', false)
                    }, '📡'),
                    e('button', { onClick: function () { deleteSavedBoard(b.id); }, style: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', padding: '2px 4px' } }, '🗑️')
                  )
                );
              })
          )
        ),
        // Gallery picker panel
        showGalleryPicker && gallery.length > 0 && e('div', { style: { flexShrink: 0, background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: '10px', padding: '10px', maxHeight: '160px', overflowY: 'auto' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
            e('span', { style: { fontSize: '11px', fontWeight: 600, color: PURPLE } }, 'Gallery \u2014 click any symbol to add it to the board'),
            e('input', { type: 'text', value: gpFilter, onChange: function (ev) { setGpFilter(ev.target.value); }, placeholder: 'Filter\u2026', style: { border: '1px solid #d8b4fe', borderRadius: '5px', padding: '3px 7px', fontSize: '11px', outline: 'none', marginLeft: 'auto', width: '80px' } })
          ),
          e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '6px' } },
            gallery
              .filter(function (g) { return !gpFilter || g.label.toLowerCase().includes(gpFilter.toLowerCase()); })
              .map(function (item) {
                return e('div', { key: item.id, onClick: function () { addFromGallery(item); }, style: { cursor: 'pointer', border: '1px solid #d8b4fe', borderRadius: '7px', padding: '5px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'background 0.1s' }, title: 'Add \u201c' + item.label + '\u201d to board',
                  onMouseOver: function (ev) { ev.currentTarget.style.background = LIGHT_PURPLE; },
                  onMouseOut: function (ev) { ev.currentTarget.style.background = '#fff'; }
                },
                  e('img', { src: item.image, alt: item.label, style: { width: 44, height: 44, objectFit: 'contain', borderRadius: '5px' } }),
                  e('span', { style: { fontSize: '9px', color: '#374151', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' } }, item.label)
                );
              })
          )
        ),
        showGalleryPicker && gallery.length === 0 && e('div', { style: { flexShrink: 0, background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '12px', color: '#7c3aed' } }, 'Your symbol gallery is empty. Generate symbols in the Symbols tab first, then add them here.'),
        // Print settings panel
        showPrintSettings && e('div', { style: { flexShrink: 0, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
          e('span', { style: { fontSize: '12px', fontWeight: 600, color: '#1e40af' } }, 'Print Settings'),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Cell size:'),
            e('select', { value: boardCellSz, onChange: function (ev) { setBoardCellSz(ev.target.value); }, style: { border: '1px solid #93c5fd', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', outline: 'none' } },
              e('option', { value: 'small' }, 'Small (1.5\u2033)'),
              e('option', { value: 'medium' }, 'Medium (2\u2033)'),
              e('option', { value: 'large' }, 'Large (2.5\u2033)')
            )
          ),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Label:'),
            e('select', { value: boardTextPos, onChange: function (ev) { setBoardTextPos(ev.target.value); }, style: { border: '1px solid #93c5fd', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', outline: 'none' } },
              e('option', { value: 'below' }, 'Below image'),
              e('option', { value: 'above' }, 'Above image'),
              e('option', { value: 'none' }, 'Hidden (image only)')
            )
          ),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Text size:'),
            e('input', { type: 'number', min: 8, max: 18, value: boardTextSize, onChange: function (ev) { setBoardTextSize(Number(ev.target.value)); }, style: { width: '50px', border: '1px solid #93c5fd', borderRadius: '5px', padding: '4px 7px', fontSize: '12px', outline: 'none' } })
          ),
          e('button', { onClick: printBoardSized, style: S.btn('#1e40af', '#fff', false) }, '\uD83D\uDDB6 Print Now')
        ),
        // Board title
        boardWords.length > 0 && e('input', { type: 'text', value: boardTitle, onChange: function (ev) { setBoardTitle(ev.target.value); }, placeholder: 'Board title (optional)', style: Object.assign({}, S.input, { fontWeight: 700, fontSize: '15px', maxWidth: '400px' }) }),
        // Board grid (also serves as print area)
        boardWords.length > 0
          ? e('div', { id: 'ss-pb', style: { flex: 1, overflowY: 'auto' } },
              boardTitle && e('h2', { style: { fontWeight: 800, fontSize: '18px', color: '#1f2937', margin: '0 0 10px' } }, boardTitle),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + boardCols + ', 1fr)', gap: '8px' } },
                boardWords.map(function (word) {
                  var bg = boardColor ? (CAT_COLORS[word.category] || '#f9fafb') : '#fff';
                  var isDragTarget = dragOverBoardId === word.id && dragBoardId !== word.id;
                  var border = isDragTarget ? '2px dashed ' + PURPLE : (boardColor ? ('2px solid ' + (CAT_BORDER[word.category] || '#e5e7eb')) : '2px solid #e5e7eb');
                  var imgSz = 64;
                  return e('div', {
                    key: word.id,
                    className: 'ss-board-cell',
                    draggable: true,
                    onDragStart: function (ev) { ev.dataTransfer.effectAllowed = 'move'; setDragBoardId(word.id); },
                    onDragOver: function (ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; setDragOverBoardId(word.id); },
                    onDrop: function (ev) {
                      ev.preventDefault();
                      if (!dragBoardId || dragBoardId === word.id) return;
                      setBoardWords(function (prev) {
                        var from = prev.findIndex(function (w) { return w.id === dragBoardId; });
                        var to = prev.findIndex(function (w) { return w.id === word.id; });
                        var next = prev.slice(); next.splice(to, 0, next.splice(from, 1)[0]); return next;
                      });
                      setDragBoardId(null); setDragOverBoardId(null);
                    },
                    onDragEnd: function () { setDragBoardId(null); setDragOverBoardId(null); },
                    onClick: function () { speakCell(word.label); },
                    style: { background: bg, border: border, borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'grab', minHeight: '100px', transition: 'border-color 0.1s, opacity 0.1s', position: 'relative', opacity: dragBoardId === word.id ? 0.45 : 1 }
                  },
                    // Drag handle indicator
                    e('div', { className: 'ss-no-print', style: { position: 'absolute', top: 3, left: 4, fontSize: '10px', color: '#d1d5db', lineHeight: 1, userSelect: 'none' } }, '\u28FF'),
                    // Label above image
                    boardTextPos === 'above' && e('span', { style: { fontSize: boardTextSize + 'px', fontWeight: 700, color: '#1f2937', textAlign: 'center', lineHeight: 1.3 } }, word.label),
                    // Image
                    boardLoading[word.id]
                      ? e('div', { style: { width: imgSz, height: imgSz, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, spinner(24))
                      : word.image
                        ? e('img', { src: word.image, alt: word.label, style: { width: imgSz, height: imgSz, objectFit: 'contain', borderRadius: '6px', background: '#fff' } })
                        : e('div', { style: { width: imgSz, height: imgSz, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '6px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '4px' } }, 'Click \u2728'),
                    // Label below image (default)
                    boardTextPos === 'below' && e('span', { style: { fontSize: boardTextSize + 'px', fontWeight: 700, color: '#1f2937', textAlign: 'center', lineHeight: 1.3 } }, word.label),
                    // Regen button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); regenBoardCell(word.id); }, style: { position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px' } }, '\uD83D\uDD04'),
                    // Remove button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); setBoardWords(function (prev) { return prev.filter(function (w) { return w.id !== word.id; }); }); }, style: { position: 'absolute', bottom: 4, right: 4, background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px', color: '#dc2626' } }, '\u00d7')
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
              e('p', { style: { fontSize: '12px', maxWidth: '380px', textAlign: 'center' } }, 'AI writes the word list, you generate symbols, and export a print-ready board. Drag cells to reorder. Color coding follows AAC conventions.')
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
          ),
          savedSchedules.length > 0 && e('button', { onClick: function () { setShowSchedGallery(!showSchedGallery); }, style: S.btn(showSchedGallery ? LIGHT_PURPLE : '#f3f4f6', showSchedGallery ? PURPLE : '#374151', false) }, '📂 Saved (' + savedSchedules.length + ')')
        ),
        // Saved schedules panel
        showSchedGallery && e('div', { style: { flexShrink: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' } },
          e('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' } },
            savedSchedules.map(function (s) {
              return e('div', { key: s.id, style: { flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' } },
                e('div', null,
                  e('div', { style: { fontWeight: 600, fontSize: '12px', color: '#1f2937' } }, s.title || 'Untitled Schedule'),
                  e('div', { style: { fontSize: '10px', color: '#9ca3af' } }, s.items.length + ' activities')
                ),
                e('button', { onClick: function () { loadSchedule(s); }, style: S.btn(LIGHT_PURPLE, PURPLE, false) }, 'Load'),
                liveSession && liveSession.active && e('button', {
                  title: 'Push to student screens (images excluded)',
                  onClick: function () {
                    var stripped = s.items.map(function (item) { return { label: item.label }; });
                    liveSession.push({ type: 'schedule', title: s.title, items: stripped, nowIndex: 0 })
                      .then(function () { addToast('Schedule pushed to students!', 'success'); })
                      .catch(function () { addToast('Push failed — check session connection', 'error'); });
                  },
                  style: S.btn('#ecfdf5', '#065f46', false)
                }, '📡'),
                e('button', { onClick: function () { deleteSavedSchedule(s.id); }, style: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', padding: '2px 4px' } }, '🗑️')
              );
            })
          )
        ),
        // Schedule title
        schedItems.length > 0 && e('input', { type: 'text', value: schedTitle, onChange: function (ev) { setSchedTitle(ev.target.value); }, placeholder: 'Schedule title, e.g. Marcus\'s Morning Routine', style: Object.assign({}, S.input, { fontWeight: 700, fontSize: '14px', maxWidth: '400px' }) }),
        // Schedule strip
        schedItems.length > 0
          ? e('div', { id: 'ss-ps', style: { flex: 1, overflowY: 'auto', overflowX: schedOrientation === 'horizontal' ? 'auto' : 'hidden' } },
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
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' } },
              e('label', { style: S.lbl }, 'Situation / Goal'),
              e('span', { style: { fontSize: '10px', color: '#9ca3af' } }, 'or pick a template ↓')
            ),
            e('textarea', { value: storySituation, onChange: function (ev) { setStorySituation(ev.target.value); }, placeholder: 'e.g. Marcus is learning to wait his turn during group time', style: Object.assign({}, S.textarea, { height: '65px' }) }),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' } },
              STORY_TEMPLATES.map(function (t) {
                return e('button', {
                  key: t.label,
                  onClick: function () { setStorySituation(t.situation); setStoryDetails(t.details); },
                  style: { padding: '3px 8px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap', transition: 'background 0.1s' },
                  onMouseOver: function (ev) { ev.currentTarget.style.background = LIGHT_PURPLE; ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.color = PURPLE; },
                  onMouseOut: function (ev) { ev.currentTarget.style.background = '#f3f4f6'; ev.currentTarget.style.borderColor = '#e5e7eb'; ev.currentTarget.style.color = '#374151'; }
                }, t.label);
              })
            )
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
          ? e('div', { id: 'ss-py', style: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' } },
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

    // ── Activity Sets tab ──────────────────────────────────────────────────
    function renderBooksTab() {
      var activeBook = books.find(function (b) { return b.id === activeBookId; }) || null;
      return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px', gap: '14px' } },
        // Create new set row
        e('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0, flexWrap: 'wrap' } },
          e('div', { style: { flex: 1, minWidth: '200px' } },
            e('label', { style: S.lbl }, 'New Activity Set Name'),
            e('input', { type: 'text', value: newBookTitle, onChange: function (ev) { setNewBookTitle(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') createBook(); }, placeholder: 'e.g. Marcus \u2014 School Day Boards', style: S.input })
          ),
          e('button', { onClick: createBook, disabled: !newBookTitle.trim(), style: S.btn(PURPLE, '#fff', !newBookTitle.trim()) }, '+ Create Set')
        ),
        // Body: left = set list, right = set contents
        e('div', { style: { display: 'flex', gap: '14px', flex: 1, overflow: 'hidden' } },
          // Left: list of books
          e('div', { style: { width: '220px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' } },
            books.length === 0
              ? e('div', { style: { color: '#9ca3af', fontSize: '13px', padding: '20px 0', textAlign: 'center' } }, 'No activity sets yet.\nCreate one above and add your saved boards.')
              : books.map(function (book) {
                  var isActive = book.id === activeBookId;
                  var taggedProf = profiles.find(function (p) { return p.id === book.profileId; }) || null;
                  return e('div', {
                    key: book.id,
                    onClick: function () { setActiveBookId(isActive ? null : book.id); },
                    style: { border: '2px solid ' + (isActive ? PURPLE : '#e5e7eb'), borderRadius: '10px', padding: '10px', background: isActive ? LIGHT_PURPLE : '#fff', cursor: 'pointer', transition: 'border-color 0.1s' }
                  },
                    e('div', { style: { fontWeight: 700, fontSize: '13px', color: isActive ? PURPLE : '#1f2937', marginBottom: '3px' } }, book.title),
                    e('div', { style: { fontSize: '10px', color: '#6b7280' } }, book.boardIds.length + ' board' + (book.boardIds.length !== 1 ? 's' : '') + (taggedProf ? ' \u00b7 ' + (taggedProf.name || 'Student') : ''))
                  );
                })
          ),
          // Right: active book detail
          activeBook
            ? e('div', { style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
                // Book header
                e('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 } },
                  e('div', { style: { flex: 1 } },
                    e('h3', { style: { fontWeight: 800, fontSize: '16px', color: '#1f2937', margin: '0 0 6px' } }, activeBook.title),
                    e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                      e('span', { style: { fontSize: '11px', color: '#6b7280' } }, 'Student:'),
                      e('select', {
                        value: activeBook.profileId || '',
                        onChange: function (ev) { tagBookProfile(activeBook.id, ev.target.value || null); },
                        style: { fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '2px 5px', color: activeBook.profileId ? PURPLE : '#9ca3af', background: activeBook.profileId ? LIGHT_PURPLE : '#f9fafb' }
                      },
                        e('option', { value: '' }, '— None —'),
                        profiles.map(function (p) { return e('option', { key: p.id, value: p.id }, p.name || 'Student'); })
                      )
                    )
                  ),
                  e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                    e('button', { onClick: function () { printBook(activeBook); }, disabled: activeBook.boardIds.length === 0, style: S.btn('#dbeafe', '#1e40af', activeBook.boardIds.length === 0) }, '\uD83D\uDDB6 Print All (' + activeBook.boardIds.length + ')'),
                    e('button', { onClick: function () { deleteBook(activeBook.id); }, style: S.btn('#fee2e2', '#dc2626', false) }, '\uD83D\uDDD1\uFE0F Delete Set')
                  )
                ),
                // Board list within this set
                e('div', { style: { flexShrink: 0 } },
                  e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'Boards in this set \u2014 drag to reorder, click + to add'),
                  activeBook.boardIds.length === 0
                    ? e('div', { style: { color: '#9ca3af', fontSize: '12px', padding: '12px 0' } }, 'No boards added yet. Pick boards from your saved library below.')
                    : e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                        activeBook.boardIds.map(function (boardId, idx) {
                          var board = savedBoards.find(function (b) { return b.id === boardId; });
                          if (!board) return null;
                          var preview = board.words.slice(0, 4);
                          return e('div', { key: boardId, style: { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px', background: '#fff', width: '140px', flexShrink: 0 } },
                            // Mini thumbnail grid
                            e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginBottom: '7px' } },
                              preview.map(function (w) {
                                return e('div', { key: w.id, style: { width: '100%', aspectRatio: '1', background: '#f9fafb', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                                  w.image ? e('img', { src: w.image, alt: w.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '2px' } }) : e('span', { style: { fontSize: '8px', color: '#9ca3af' } }, w.label)
                                );
                              })
                            ),
                            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#1f2937', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, board.title || 'Untitled'),
                            e('div', { style: { display: 'flex', gap: '4px' } },
                              e('button', { onClick: function () { loadBoard(board); setTab('board'); }, style: Object.assign({}, S.btn(LIGHT_PURPLE, PURPLE, false), { flex: 1, fontSize: '10px', padding: '4px' }) }, 'Open'),
                              e('button', { onClick: function () { toggleBoardInBook(activeBook.id, boardId); }, style: Object.assign({}, S.btn('#fee2e2', '#dc2626', false), { padding: '4px 8px', fontSize: '10px' }) }, '\u00d7')
                            )
                          );
                        })
                      )
                ),
                // Add boards from saved library
                savedBoards.length > 0 && e('div', { style: { flexShrink: 0 } },
                  e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'Add from saved boards'),
                  e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                    savedBoards
                      .filter(function (b) { return !activeBook.boardIds.includes(b.id); })
                      .map(function (b) {
                        return e('button', {
                          key: b.id,
                          onClick: function () { toggleBoardInBook(activeBook.id, b.id); },
                          style: { padding: '5px 10px', border: '1px dashed #d1d5db', borderRadius: '20px', background: '#f9fafb', fontSize: '11px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' },
                          onMouseOver: function (ev) { ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.color = PURPLE; ev.currentTarget.style.background = LIGHT_PURPLE; },
                          onMouseOut: function (ev) { ev.currentTarget.style.borderColor = '#d1d5db'; ev.currentTarget.style.color = '#374151'; ev.currentTarget.style.background = '#f9fafb'; }
                        }, '+ ', b.title || 'Untitled');
                      })
                  )
                )
              )
            : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '10px' } },
                e('div', { style: { fontSize: '52px' } }, '📚'),
                e('p', { style: { fontWeight: 600 } }, 'Activity Sets bundle your boards into student-specific sets'),
                e('div', { style: { maxWidth: '400px', fontSize: '13px', lineHeight: 1.7, textAlign: 'center' } },
                  e('p', null, 'Create a set for each student, add their boards, and print the whole set in one click \u2014 all boards in the correct order with consistent cell sizing.')
                )
              )
        )
      );
    }

    // ── Main render ────────────────────────────────────────────────────────
    // ── Partner-assisted scanning overlay ────────────────────────────────
    if (scanBoardId) {
      var scanBoard = savedBoards.find(function (b) { return b.id === scanBoardId; });
      var scanCells = scanBoard ? (scanBoard.words || []).filter(function (w) { return w.image; }) : [];
      var safeIdx = scanCells.length ? scanIndex % scanCells.length : 0;
      var exitScan = function () { setScanBoardId(null); setScanIndex(0); setScanPaused(false); };
      var activateCell = function () {
        var cell = scanCells[safeIdx];
        if (!cell) return;
        if (onCallTTS && selectedVoice) {
          onCallTTS(cell.label, selectedVoice).catch(function () {});
        } else if (window.speechSynthesis) {
          var utt = new window.SpeechSynthesisUtterance(cell.label);
          window.speechSynthesis.speak(utt);
        }
      };
      var handleScanKeyDown = function (ev) {
        if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); activateCell(); }
        if (ev.code === 'Escape') exitScan();
      };
      return e('div', {
        style: { position: 'fixed', inset: 0, zIndex: 9999, background: '#0f172a', display: 'flex', flexDirection: 'column', outline: 'none' },
        tabIndex: 0,
        ref: function (el) { if (el) el.focus(); },
        onKeyDown: handleScanKeyDown
      },
        // Scanning header bar
        e('div', { style: { background: '#1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 } },
          e('span', { style: { color: '#fff', fontWeight: 800, fontSize: '15px' } }, '♿ ' + (scanBoard ? scanBoard.title || 'Board' : 'Board')),
          e('span', { style: { color: '#94a3b8', fontSize: '12px', marginRight: 'auto' } }, 'Space or tap to speak highlighted cell'),
          e('label', { style: { color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' } },
            'Speed:',
            e('select', {
              value: scanSpeed,
              onChange: function (ev) { setScanSpeed(Number(ev.target.value)); setScanIndex(0); },
              style: { fontSize: '12px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '5px', padding: '2px 6px', cursor: 'pointer' }
            },
              e('option', { value: 1000 }, '1 s'),
              e('option', { value: 2000 }, '2 s'),
              e('option', { value: 3000 }, '3 s'),
              e('option', { value: 4000 }, '4 s')
            )
          ),
          e('button', {
            onClick: function () { setScanPaused(function (p) { return !p; }); },
            style: { background: scanPaused ? '#22c55e' : '#f59e0b', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
          }, scanPaused ? '▶ Resume' : '⏸ Pause'),
          e('button', {
            onClick: exitScan,
            style: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
          }, '✕ Exit')
        ),
        // Cell grid
        e('div', {
          style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(' + Math.min(scanBoard ? (scanBoard.cols || 4) : 4, scanCells.length) + ', 1fr)', gap: '16px', padding: '20px', overflowY: 'auto', alignContent: 'start' }
        },
          scanCells.map(function (cell, idx) {
            var isHighlighted = idx === safeIdx;
            return e('div', {
              key: cell.id || idx,
              onClick: function () { setScanIndex(idx); activateCell(); },
              style: {
                border: isHighlighted ? '5px solid #facc15' : '3px solid #334155',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                background: isHighlighted ? '#1c1917' : '#1e293b',
                cursor: 'pointer',
                transform: isHighlighted ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 0.15s ease',
                boxShadow: isHighlighted ? '0 0 0 4px rgba(250,204,21,0.3)' : 'none',
              }
            },
              e('img', { src: cell.image, alt: cell.label, style: { width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px' } }),
              e('span', { style: { color: isHighlighted ? '#facc15' : '#cbd5e1', fontWeight: 700, fontSize: '14px', textAlign: 'center' } }, cell.label)
            );
          })
        )
      );
    }

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
            tab === 'stories' && renderStoriesTab(),
            tab === 'quickboards' && renderQuickBoardsTab(),
            tab === 'books' && renderBooksTab()
          )
        )
      )
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SymbolStudio = SymbolStudio;
  console.log("[CDN] Visual Supports Studio (SymbolStudio v2) loaded");
})();
