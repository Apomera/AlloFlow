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
    style.textContent = '@media print{body *{visibility:hidden}#ss-pb,#ss-pb *,#ss-ps,#ss-ps *,#ss-py,#ss-py *,#ss-pq,#ss-pq *,#ss-pq-calming,#ss-pq-calming *,#ss-pq-sensory,#ss-pq-sensory *,#ss-pq-askme,#ss-pq-askme *,#ss-pq-bodycheck,#ss-pq-bodycheck *,#ss-pq-transition,#ss-pq-transition *{visibility:visible}#ss-pb,#ss-ps,#ss-py,#ss-pq,#ss-pq-calming,#ss-pq-sensory,#ss-pq-askme,#ss-pq-bodycheck,#ss-pq-transition{position:absolute;left:0;top:0;width:100%}.ss-no-print{display:none!important}}'
    + ' .ss-focus-visible *:focus-visible{outline:2px solid #7c3aed!important;outline-offset:2px!important;border-radius:4px!important}'
    + ' .ss-focus-visible *:focus:not(:focus-visible){outline:none!important}';
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
  var STORAGE_USAGE = 'alloAACUsage';
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
    { value: '__custom__', label: '✏️ Custom Style...' },
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
    { id: 'quest', icon: '🎮', label: 'Symbol Quest' },
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
    { label: 'Birthday Party', situation: 'going to a birthday party with singing, cake, and presents', details: 'Birthday parties can be noisy and exciting. There will be cake and games. It is okay to take a break if it feels like too much.' },
    { label: 'Riding the Bus', situation: 'riding the school bus to and from school safely', details: 'The bus can be bumpy and loud. Staying seated with the seatbelt on keeps everyone safe.' },
    { label: 'Playground Rules', situation: 'following safety rules on the playground during recess', details: 'The playground is a fun place to play. Taking turns on the slide and swings helps everyone have a good time.' },
    { label: 'Using the Toilet', situation: 'going to the bathroom and following the hygiene routine independently', details: 'Everyone uses the bathroom. Washing hands with soap and water afterward helps keep our bodies clean and healthy.' },
    { label: 'Wearing a Mask', situation: 'wearing a face mask at school or the doctor when needed', details: 'Sometimes we need to wear a mask to stay safe. It might feel a little strange on our face, but we can practice wearing it.' },
    { label: 'Saying Goodbye', situation: 'saying goodbye to a parent or caregiver at school drop-off', details: 'Saying goodbye can feel sad, but the grown-up always comes back. School will be fun and the day will go fast.' },
    { label: 'Loud Noises', situation: 'hearing unexpected loud noises like fire alarms, thunder, or sirens', details: 'Loud noises can be startling and scary. It helps to cover our ears or use headphones. The noise will stop soon.' },
    { label: 'Going Swimming', situation: 'visiting a swimming pool and following water safety rules', details: 'The pool can feel cold at first but our body gets used to it. We always stay near an adult and follow the pool rules.' },
    { label: 'Sleepover', situation: 'spending the night at a friend or relative house', details: 'Sleeping in a different place can feel different. Bringing a favorite toy or blanket from home can help feel more comfortable.' },
    { label: 'Getting Dressed', situation: 'picking clothes and getting dressed independently for the day', details: 'Getting dressed is something we do every day. Checking the weather helps us pick the right clothes.' },
    { label: 'Assembly Time', situation: 'sitting in the school auditorium for an assembly or performance', details: 'Assemblies can be long and noisy. Sitting still and listening quietly shows respect. There will be time to move afterward.' },
    { label: 'Visiting Dentist', situation: 'going to the dentist for a cleaning and checkup', details: 'The dentist looks at our teeth to make sure they are healthy. The tools might make buzzing sounds but the dentist is very careful.' },
    { label: 'Using an iPad', situation: 'following rules for using a tablet or device at school or home', details: 'Devices are fun tools for learning. Setting a timer helps us know when it is time to stop and do other activities.' },
    { label: 'Personal Space', situation: 'understanding personal space and respecting others boundaries', details: 'Everyone has an invisible bubble around them. Standing too close can make people feel uncomfortable. Arm length distance is a good rule.' },
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

  // ── ensureBase64: convert blob/object URLs to raw base64 for image editing ──
  async function ensureBase64(imageData) {
    if (!imageData) return null;
    // Already a data URL — extract the base64 portion
    if (imageData.startsWith('data:')) {
      var parts = imageData.split(',');
      return parts.length > 1 ? parts[1] : null;
    }
    // Blob or object URL — fetch and convert to base64
    if (imageData.startsWith('blob:') || imageData.startsWith('http')) {
      try {
        var resp = await fetch(imageData);
        var blob = await resp.blob();
        return await new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            var result = reader.result;
            resolve(result ? result.split(',')[1] : null);
          };
          reader.onerror = function () { resolve(null); };
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        warnLog('ensureBase64 fetch failed:', e);
        return null;
      }
    }
    // Assume it's already raw base64
    return imageData;
  }

  async function genImage(prompt, onCallImagen, onCallGeminiImageEdit, autoClean, avatarBase64, width) {
    var imageUrl = await onCallImagen(prompt, width || 400, 0.85);
    // Pass 2: auto-clean text
    if (autoClean && imageUrl) {
      try {
        var raw = await ensureBase64(imageUrl);
        if (raw) {
          var cleaned = await onCallGeminiImageEdit("Remove all text, labels, letters, and numbers from the image. Keep the illustration clean and simple.", raw, width || 400, 0.85);
          if (cleaned) imageUrl = cleaned;
        }
      } catch (e) { warnLog("Auto-clean failed:", e.message); }
    }
    // Pass 3: character consistency (if avatar provided)
    if (avatarBase64 && imageUrl) {
      try {
        var raw2 = await ensureBase64(imageUrl);
        if (raw2) {
          var consistent = await onCallGeminiImageEdit(
            "Make the child or person in this illustration visually consistent with the reference portrait. Maintain the same flat icon art style. White background. STRICTLY NO TEXT.",
            raw2, width || 400, 0.85, avatarBase64
          );
          if (consistent) imageUrl = consistent;
        }
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
    var onSetVoice = props.onSetVoice || null; // callback to update app-wide voice
    var geminiVoices = props.geminiVoices || []; // Gemini TTS voice list from main app
    var kokoroVoices = props.kokoroVoices || []; // Kokoro TTS voice list from main app
    var isCanvasEnv = props.isCanvasEnv || false;
    var addToast = props.addToast;
    var onClose = props.onClose;
    var isOpen = props.isOpen;
    var cloudSync = props.cloudSync || null; // { save: async(data)=>void, load: async()=>data|null }
    var liveSession = props.liveSession || null; // { active, sessionCode, push: async(payload)=>void, clear: async()=>void }
    var dashboardData = props.dashboardData || null; // teacher dashboard student array
    var setDashboardData = props.setDashboardData || null;
    var selectedStudentId = props.selectedStudentId || null;

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
    var _globalStyleSel = useState(''); var globalStyleSel = _globalStyleSel[0]; var setGlobalStyleSel = _globalStyleSel[1];
    var _customStyle = useState(''); var customStyle = _customStyle[0]; var setCustomStyle = _customStyle[1];
    var globalStyle = globalStyleSel === '__custom__' ? customStyle : globalStyleSel;
    var setGlobalStyle = function(v) { if (v === '__custom__') { setGlobalStyleSel('__custom__'); } else { setGlobalStyleSel(v); } };
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
    var _symCatFilter = useState(''); var symCatFilter = _symCatFilter[0]; var setSymCatFilter = _symCatFilter[1];
    var _symCategory = useState(''); var symCategory = _symCategory[0]; var setSymCategory = _symCategory[1];
    var _symShowFavs = useState(false); var symShowFavs = _symShowFavs[0]; var setSymShowFavs = _symShowFavs[1];

    // Board Builder state
    var _boardTopic = useState(''); var boardTopic = _boardTopic[0]; var setBoardTopic = _boardTopic[1];
    var _boardWords = useState([]); var boardWords = _boardWords[0]; var setBoardWords = _boardWords[1];
    // Multi-page boards — activePage = index of the page currently being edited
    var _activePageIdx = useState(0); var activePageIdx = _activePageIdx[0]; var setActivePageIdx = _activePageIdx[1];
    var _boardPages = useState(null); var boardPages = _boardPages[0]; var setBoardPages = _boardPages[1];
    // Use-mode page navigation
    var _usePageIdx = useState(0); var usePageIdx = _usePageIdx[0]; var setUsePageIdx = _usePageIdx[1];
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

    // Custom story templates
    var STORAGE_CUSTOM_TEMPLATES = 'alloCustomStoryTemplates';
    var _customTemplates = useState(function () { return load(STORAGE_CUSTOM_TEMPLATES, []); });
    var customTemplates = _customTemplates[0]; var setCustomTemplates = _customTemplates[1];

    // Voice — uses app-wide selectedVoice prop (synced with main AlloFlow header)
    // No separate voice state needed; quick-access panel calls onSetVoice to update app-wide
    var currentVoice = selectedVoice || 'Kore';

    // ── Multilingual board labels ──
    var STORAGE_BOARD_LANG = 'alloSymbolBoardLang';
    var LANG_OPTIONS = [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' },
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' },
      { code: 'pt', label: 'Português' },
      { code: 'zh', label: '中文' },
      { code: 'ar', label: 'العربية' },
      { code: 'hi', label: 'हिन्दी' },
      { code: 'ja', label: '日本語' },
      { code: 'ko', label: '한국어' },
      { code: 'vi', label: 'Tiếng Việt' },
      { code: 'tl', label: 'Tagalog' },
      { code: 'ru', label: 'Русский' },
      { code: 'sw', label: 'Kiswahili' },
    ];
    var _boardLang = useState(function () { return load(STORAGE_BOARD_LANG, 'en'); });
    var boardLang = _boardLang[0]; var setBoardLang = _boardLang[1];
    var _translating = useState(false); var translating = _translating[0]; var setTranslating = _translating[1];

    // ── IEP Goal Tracking ──
    var STORAGE_GOALS = 'alloSymbolIEPGoals';
    var _iepGoals = useState(function () { return load(STORAGE_GOALS, []); });
    var iepGoals = _iepGoals[0]; var setIepGoals = _iepGoals[1];

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

    // Ask Me Board state
    var _amItems = useState(function () { return [
      { id: 'am1', label: 'Can I have...?', image: null },
      { id: 'am2', label: 'Where is...?', image: null },
      { id: 'am3', label: 'What is...?', image: null },
      { id: 'am4', label: 'I want to...', image: null },
      { id: 'am5', label: 'Can you help me?', image: null },
      { id: 'am6', label: 'I need...', image: null },
      { id: 'am7', label: 'When is...?', image: null },
      { id: 'am8', label: 'I don\'t know', image: null },
      { id: 'am9', label: 'I don\'t understand', image: null },
      { id: 'am10', label: 'Can I go?', image: null },
    ]; });
    var amItems = _amItems[0]; var setAmItems = _amItems[1];
    var _amLoading = useState({}); var amLoading = _amLoading[0]; var setAmLoading = _amLoading[1];

    // Body Check state
    var _bcItems = useState(function () { return [
      { id: 'bc1', label: 'Head', image: null },
      { id: 'bc2', label: 'Eyes', image: null },
      { id: 'bc3', label: 'Ears', image: null },
      { id: 'bc4', label: 'Throat', image: null },
      { id: 'bc5', label: 'Stomach', image: null },
      { id: 'bc6', label: 'Arm', image: null },
      { id: 'bc7', label: 'Back', image: null },
      { id: 'bc8', label: 'Leg', image: null },
    ]; });
    var bcItems = _bcItems[0]; var setBcItems = _bcItems[1];
    var _bcLoading = useState({}); var bcLoading = _bcLoading[0]; var setBcLoading = _bcLoading[1];
    var _bcPainLevel = useState(null); var bcPainLevel = _bcPainLevel[0]; var setBcPainLevel = _bcPainLevel[1];

    // Transition Warning state
    var _twItems = useState(function () { return [
      { id: 'tw1', label: '5 minutes left', image: null },
      { id: 'tw2', label: '3 minutes left', image: null },
      { id: 'tw3', label: '1 minute left', image: null },
      { id: 'tw4', label: 'Almost time!', image: null },
      { id: 'tw5', label: 'Time to stop', image: null },
      { id: 'tw6', label: 'Clean up', image: null },
      { id: 'tw7', label: 'Line up', image: null },
      { id: 'tw8', label: 'New activity starts', image: null },
    ]; });
    var twItems = _twItems[0]; var setTwItems = _twItems[1];
    var _twLoading = useState({}); var twLoading = _twLoading[0]; var setTwLoading = _twLoading[1];
    var _twStep = useState(0); var twStep = _twStep[0]; var setTwStep = _twStep[1];

    // Customizable category colors
    var STORAGE_CAT_COLORS = 'alloSymbolCatColors';
    var STORAGE_BOARD_THEME = 'alloSymbolTheme';
    var _catFill = useState(function () { return load(STORAGE_CAT_COLORS + '_fill', null) || CAT_COLORS; });
    var catFill = _catFill[0]; var setCatFill = _catFill[1];
    var _catBorder = useState(function () { return load(STORAGE_CAT_COLORS + '_border', null) || CAT_BORDER; });
    var catBorder = _catBorder[0]; var setCatBorder = _catBorder[1];
    var _boardTheme = useState(function () { return load(STORAGE_BOARD_THEME, 'default'); });
    var boardTheme = _boardTheme[0]; var setBoardTheme = _boardTheme[1];

    // Partner-assisted scanning state
    var _scanBoardId = useState(null); var scanBoardId = _scanBoardId[0]; var setScanBoardId = _scanBoardId[1];
    var _scanIndex = useState(0); var scanIndex = _scanIndex[0]; var setScanIndex = _scanIndex[1];
    var _scanPaused = useState(false); var scanPaused = _scanPaused[0]; var setScanPaused = _scanPaused[1];
    var _scanSpeed = useState(2000); var scanSpeed = _scanSpeed[0]; var setScanSpeed = _scanSpeed[1];
    var scanIntervalRef = useRef(null);
    var autoLoadedRef = useRef(false);

    // Direct-use AAC mode state
    var _useBoardId = useState(null); var useBoardId = _useBoardId[0]; var setUseBoardId = _useBoardId[1];
    var _strip = useState([]); var strip = _strip[0]; var setStrip = _strip[1];
    var _stripSpeaking = useState(false); var stripSpeaking = _stripSpeaking[0]; var setStripSpeaking = _stripSpeaking[1];
    var _commLog = useState([]); var commLog = _commLog[0]; var setCommLog = _commLog[1];
    var _showCommLog = useState(false); var showCommLog = _showCommLog[0]; var setShowCommLog = _showCommLog[1];
    var _usageLog = useState(function () { return load(STORAGE_USAGE, {}); }); var usageLog = _usageLog[0]; var setUsageLog = _usageLog[1];
    var _showAnalytics = useState(false); var showAnalytics = _showAnalytics[0]; var setShowAnalytics = _showAnalytics[1];

    // Word prediction state (Use mode)
    var _predictions = useState([]); var predictions = _predictions[0]; var setPredictions = _predictions[1];
    var _predLoading = useState(false); var predLoading = _predLoading[0]; var setPredLoading = _predLoading[1];
    var predTimerRef = useRef(null);

    // Text-to-symbols state (Board Builder)
    var _sentenceInput = useState(''); var sentenceInput = _sentenceInput[0]; var setSentenceInput = _sentenceInput[1];
    var _sentenceMapping = useState([]); var sentenceMapping = _sentenceMapping[0]; var setSentenceMapping = _sentenceMapping[1];
    var _sentenceParsing = useState(false); var sentenceParsing = _sentenceParsing[0]; var setSentenceParsing = _sentenceParsing[1];
    var _showSentencePanel = useState(false); var showSentencePanel = _showSentencePanel[0]; var setShowSentencePanel = _showSentencePanel[1];

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

    // Keyboard handler for use mode (Escape = exit, Backspace = delete last word)
    useEffect(function () {
      if (!useBoardId) return;
      var handler = function (ev) {
        if (ev.code === 'Escape') { setUseBoardId(null); setStrip([]); setShowCommLog(false); }
        else if (ev.code === 'Backspace') { setStrip(function (s) { return s.slice(0, -1); }); }
      };
      window.addEventListener('keydown', handler);
      return function () { window.removeEventListener('keydown', handler); };
    }, [useBoardId]);

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
          var raw = await ensureBase64(img);
          if (raw) img = await onCallGeminiImageEdit('Refine this child portrait. Make it warm, friendly, and consistent with the description: "' + avatarDesc.trim() + '". Clean white background. Remove any text.', raw, 300, 0.9) || img;
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
      if (!item || !instruction.trim()) { addToast && addToast('Please enter an edit instruction', 'error'); return; }
      if (!onCallGeminiImageEdit) { addToast && addToast('Image editing is not available', 'error'); return; }
      if (!item.image) { addToast && addToast('No image to refine — generate one first', 'error'); return; }
      setSymLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      addToast && addToast('Refining icon…', 'info');
      try {
        var raw = await ensureBase64(item.image);
        if (!raw) throw new Error('Could not extract image data');
        var refinementPrompt = 'Edit this educational icon. Instruction: ' + instruction + '. Maintain the simple, flat vector art style. White background. STRICTLY NO TEXT.';
        var refined = await onCallGeminiImageEdit(refinementPrompt, raw, 400, 0.85);
        if (refined) {
          var updated = gallery.map(function (i) { return i.id === id ? Object.assign({}, i, { image: refined }) : i; });
          setGallery(updated); store(STORAGE_GALLERY, updated);
          setSymRefine(function (p) { var n = Object.assign({}, p); n[id] = ''; return n; });
          addToast && addToast('Icon refined!', 'success');
        } else {
          addToast && addToast('Refinement returned no image', 'error');
        }
      } catch (e) {
        warnLog('Symbol refinement failed:', e);
        addToast && addToast('Refinement failed: ' + (e.message || 'Unknown error'), 'error');
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

    // ── Per-cell audio recording ──
    var _cellRecording = useState(null); var cellRecording = _cellRecording[0]; var setCellRecording = _cellRecording[1];
    var cellMediaRef = useRef(null);
    var recordCellAudio = useCallback(function (id) {
      if (cellRecording === id) {
        // Stop recording
        if (cellMediaRef.current) { cellMediaRef.current.stop(); cellMediaRef.current = null; }
        setCellRecording(null);
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        setCellRecording(id);
        var chunks = [];
        var mr = new MediaRecorder(stream);
        cellMediaRef.current = mr;
        mr.ondataavailable = function (ev) { if (ev.data.size > 0) chunks.push(ev.data); };
        mr.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var blob = new Blob(chunks, { type: 'audio/webm' });
          var reader = new FileReader();
          reader.onloadend = function () {
            var b64 = reader.result;
            setBoardWords(function (prev) { return prev.map(function (w) { return w.id === id ? Object.assign({}, w, { audioData: b64 }) : w; }); });
            if (addToast) addToast('🎙️ Audio recorded for cell!', 'success');
          };
          reader.readAsDataURL(blob);
          setCellRecording(null);
        };
        mr.start();
        setTimeout(function () { if (mr.state === 'recording') mr.stop(); }, 10000);
      }).catch(function () {
        if (addToast) addToast('Microphone access denied', 'error');
      });
    }, [cellRecording, addToast]);

    var playCellAudio = useCallback(function (audioData) {
      var audio = new Audio(audioData);
      audio.play().catch(function () {});
    }, []);

    // ── Multi-page board helpers ───────────────────────────────────────────
    // boardPages = null (single page) or array of { id, title, words, cols }
    // activePageIdx = which page is currently loaded into boardWords/boardCols

    var commitCurrentPage = useCallback(function (pages, idx, words, cols, pageTitle) {
      // Returns a new pages array with the current editor state flushed to pages[idx]
      if (!pages) return pages;
      return pages.map(function (p, i) {
        return i === idx ? Object.assign({}, p, { words: words, cols: cols, title: pageTitle || p.title }) : p;
      });
    }, []);

    var switchPage = useCallback(function (idx) {
      setBoardPages(function (prev) {
        var flushed = commitCurrentPage(prev, activePageIdx, boardWords, boardCols, null);
        if (flushed && flushed[idx]) {
          setBoardWords(flushed[idx].words || []);
          setBoardCols(flushed[idx].cols || 4);
        }
        setActivePageIdx(idx);
        return flushed;
      });
    }, [activePageIdx, boardWords, boardCols, commitCurrentPage]);

    var addPage = useCallback(function () {
      setBoardPages(function (prev) {
        var flushed = commitCurrentPage(prev || [], activePageIdx, boardWords, boardCols, null) || [];
        var newPage = { id: uid(), title: 'Page ' + (flushed.length + 1), words: [], cols: boardCols };
        var updated = flushed.concat([newPage]);
        setBoardWords([]);
        setBoardCols(boardCols);
        setActivePageIdx(updated.length - 1);
        return updated;
      });
    }, [activePageIdx, boardWords, boardCols, commitCurrentPage]);

    var deletePage = useCallback(function (idx) {
      setBoardPages(function (prev) {
        if (!prev || prev.length <= 1) return prev;
        var updated = prev.filter(function (_, i) { return i !== idx; });
        var newIdx = Math.min(idx, updated.length - 1);
        setBoardWords(updated[newIdx].words || []);
        setBoardCols(updated[newIdx].cols || 4);
        setActivePageIdx(newIdx);
        return updated;
      });
    }, []);

    var enablePages = useCallback(function () {
      // Convert current single-page state to multi-page
      var page1 = { id: uid(), title: boardTitle || boardTopic || 'Page 1', words: boardWords, cols: boardCols };
      setBoardPages([page1]);
      setActivePageIdx(0);
      addToast && addToast('Multi-page mode enabled — add more pages below', 'info');
    }, [boardWords, boardCols, boardTitle, boardTopic, addToast]);

    var saveBoard = useCallback(function () {
      if (!boardWords.length && (!boardPages || boardPages.every(function (p) { return !p.words.length; }))) return;
      var finalPages = boardPages ? commitCurrentPage(boardPages, activePageIdx, boardWords, boardCols, null) : null;
      var saved = {
        id: uid(), title: boardTitle || boardTopic, profileId: activeProfileId || null, createdAt: Date.now(),
        words: boardWords, cols: boardCols,
        pages: finalPages || null
      };
      var updated = [saved].concat(savedBoards);
      setSavedBoards(updated); store(STORAGE_BOARDS, updated);
      addToast && addToast('Board saved!' + (finalPages && finalPages.length > 1 ? ' (' + finalPages.length + ' pages)' : ''), 'success');
      if (cloudSync) setTimeout(function () { syncToCloud(); }, 300);
    }, [boardWords, boardPages, activePageIdx, boardTitle, boardTopic, boardCols, activeProfileId, savedBoards, cloudSync, syncToCloud, commitCurrentPage, addToast]);

    var applyBoardTemplate = useCallback(function (template) {
      var words = template.words.map(function (w) { return Object.assign({}, w, { id: uid(), image: null }); });
      setBoardWords(words);
      setBoardTitle(template.label);
      setBoardTopic(template.label);
      addToast && addToast(template.label + ' template loaded — click ✨ Generate Images to start!', 'success');
    }, [addToast]);

    var loadBoard = useCallback(function (board) {
      var pages = board.pages && board.pages.length > 0 ? board.pages : null;
      var firstPage = pages ? pages[0] : board;
      setBoardWords((firstPage.words || []).map(function (w) { return Object.assign({}, w); }));
      setBoardTitle(board.title || '');
      setBoardCols(firstPage.cols || board.cols || 4);
      setBoardPages(pages);
      setActivePageIdx(0);
      setShowBoardGallery(false);
      addToast && addToast('Board loaded!' + (pages && pages.length > 1 ? ' (' + pages.length + ' pages)' : ''), 'success');
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

    // ── HTML board export ─────────────────────────────────────────────────
    var exportBoardHTML = useCallback(function (board) {
      var cells = (board.words || []).filter(function (w) { return w.image; });
      var cols = board.cols || 4;
      var cellsHTML = cells.map(function (w) {
        var bg = CAT_COLORS[w.category] || '#f9fafb';
        var border = CAT_BORDER[w.category] || '#e5e7eb';
        return '<div class="cell" onclick="tap(this)" data-label="' + w.label.replace(/"/g, '&quot;') + '" style="background:' + bg + ';border:2px solid ' + border + '">'
          + '<img src="' + w.image + '" alt="' + w.label.replace(/"/g, '&quot;') + '">'
          + '<span>' + w.label + '</span></div>';
      }).join('');
      var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>' + (board.title || 'AAC Board') + '</title>'
        + '<style>'
        + 'body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;user-select:none;-webkit-tap-highlight-color:transparent}'
        + 'header{background:linear-gradient(135deg,#7c3aed,#4338ca);color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}'
        + 'header h1{margin:0;font-size:18px;font-weight:800}'
        + '#strip{background:#1a1a2e;min-height:54px;padding:10px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
        + '#strip .word{background:#312e81;color:#e0e7ff;font-weight:700;font-size:13px;padding:5px 10px;border-radius:8px;display:flex;align-items:center;gap:4px}'
        + '#strip .word img{width:24px;height:24px;object-fit:contain;border-radius:3px}'
        + '#strip .placeholder{color:#475569;font-style:italic;font-size:13px}'
        + '#strip-btns{display:flex;gap:8px;margin-left:auto;flex-shrink:0}'
        + '#strip-btns button{border:none;border-radius:7px;padding:6px 12px;font-weight:700;font-size:13px;cursor:pointer}'
        + '#speak-btn{background:#4f46e5;color:#fff}'
        + '#del-btn{background:#374151;color:#fff}'
        + '#clear-btn{background:#374151;color:#cbd5e1}'
        + '.grid{display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:12px;padding:16px}'
        + '.cell{border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}'
        + '.cell:active{transform:scale(0.93)}'
        + '.cell img{width:72px;height:72px;object-fit:contain;border-radius:6px}'
        + '.cell span{font-weight:700;font-size:13px;text-align:center;line-height:1.3;color:#1f2937}'
        + '.cell.flash{box-shadow:0 0 0 4px #fbbf24;transform:scale(1.06)}'
        + 'footer{text-align:center;padding:12px;color:#94a3b8;font-size:11px}'
        + '</style></head><body>'
        + '<header><span style="font-size:22px">▶</span><h1>' + (board.title || 'AAC Board') + '</h1></header>'
        + '<div id="strip"><span class="placeholder" id="placeholder">Tap symbols to build a message\u2026</span><div id="strip-btns">'
        + '<button id="speak-btn" onclick="speakStrip()" style="display:none">🔊 Speak</button>'
        + '<button id="del-btn" onclick="delLast()" style="display:none">\u2190 Del</button>'
        + '<button id="clear-btn" onclick="clearStrip()" style="display:none">🗑</button></div></div>'
        + '<div class="grid">' + cellsHTML + '</div>'
        + '<footer>AlloFlow Symbol Studio \u2022 Standalone AAC Board \u2022 Generated ' + new Date().toLocaleDateString() + '</footer>'
        + '<script>'
        + 'var words=[];'
        + 'function tap(el){'
        + '  var lbl=el.dataset.label;var img=el.querySelector("img");var src=img?img.src:"";'
        + '  words.push({label:lbl,src:src});render();'
        + '  el.classList.add("flash");setTimeout(function(){el.classList.remove("flash")},300);'
        + '  speak(lbl);'
        + '}'
        + 'function speak(t){if(window.speechSynthesis){window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);window.speechSynthesis.speak(u);}}'
        + 'function speakStrip(){speak(words.map(function(w){return w.label;}).join(" "));}'
        + 'function delLast(){words.pop();render();}'
        + 'function clearStrip(){words=[];render();}'
        + 'function render(){'
        + '  var strip=document.getElementById("strip");'
        + '  var chips=strip.querySelectorAll(".word");chips.forEach(function(c){c.remove();});'
        + '  var ph=document.getElementById("placeholder");'
        + '  ph.style.display=words.length?"none":"";'
        + '  var btns=document.getElementById("strip-btns");'
        + '  btns.querySelectorAll("button").forEach(function(b){b.style.display=words.length?"":"none";});'
        + '  var ref=document.getElementById("strip-btns");'
        + '  words.forEach(function(w){'
        + '    var d=document.createElement("div");d.className="word";'
        + '    if(w.src){var i=document.createElement("img");i.src=w.src;d.appendChild(i);}'
        + '    d.appendChild(document.createTextNode(w.label));'
        + '    strip.insertBefore(d,ref);'
        + '  });'
        + '}'
        + '<\/script></body></html>';
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var safeName = (board.title || 'board').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = 'aacboard_' + safeName + '.html';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      addToast && addToast('"' + (board.title || 'Board') + '" saved as standalone HTML — open in any browser!', 'success');
    }, [addToast]);

    // ── Text-to-symbols ───────────────────────────────────────────────────
    var parseTextToSymbols = useCallback(async function () {
      if (!sentenceInput.trim() || !onCallGemini) return;
      setSentenceParsing(true);
      setSentenceMapping([]);
      try {
        var galleryMap = {};
        gallery.forEach(function (g) { if (g.image) galleryMap[g.label.toLowerCase().trim()] = g; });
        var prompt = 'You are an AAC (Augmentative and Alternative Communication) symbol mapper.\n'
          + 'Sentence: "' + sentenceInput.trim() + '"\n'
          + 'Task: Map this sentence to AAC symbols. For each meaningful word or concept:\n'
          + '- If it is a function word (the, a, an, is, are, was, to, of, in, on, at, etc.) that is rarely symbolized in AAC, set skip:true\n'
          + '- Otherwise create a clear AAC symbol entry\n'
          + 'Return ONLY a valid JSON array, no markdown, like:\n'
          + '[{"word":"I","label":"I","category":"other","description":"first person pronoun","skip":false},'
          + '{"word":"want","label":"want","category":"verb","description":"expressing desire","skip":false},'
          + '{"word":"the","label":"the","category":"other","description":"article","skip":true}]\n'
          + 'Categories must be: noun, verb, adjective, or other.';
        var raw = await onCallGemini(prompt, false, null, 800);
        var clean = raw.replace(/```json|```/g, '').trim();
        var items = JSON.parse(clean);
        var mapped = items.map(function (item) {
          var key = (item.label || item.word || '').toLowerCase().trim();
          var galleryMatch = galleryMap[key] || null;
          return Object.assign({}, item, { id: uid(), selected: !item.skip, galleryMatch: galleryMatch });
        });
        setSentenceMapping(mapped);
      } catch (err) {
        warnLog('Text-to-symbols failed:', err);
        addToast && addToast('Mapping failed — try rephrasing the sentence', 'error');
      } finally { setSentenceParsing(false); }
    }, [sentenceInput, gallery, onCallGemini, addToast]);

    var applySentenceMapping = useCallback(function () {
      var selected = sentenceMapping.filter(function (m) { return m.selected && !m.skip; });
      if (!selected.length) return;
      var newWords = selected.map(function (m) {
        var img = m.galleryMatch ? m.galleryMatch.image : null;
        return { id: uid(), label: m.label || m.word, category: m.category || 'other', description: m.description || '', image: img };
      });
      setBoardWords(function (prev) { return prev.concat(newWords); });
      setShowSentencePanel(false);
      setSentenceInput('');
      setSentenceMapping([]);
      var needsGen = newWords.filter(function (w) { return !w.image; }).length;
      addToast && addToast('Added ' + newWords.length + ' symbol' + (newWords.length !== 1 ? 's' : '') + (needsGen ? ' (' + needsGen + ' need images — click ✨)' : ' from gallery!'), 'success');
    }, [sentenceMapping, addToast]);

    // ── Word prediction ────────────────────────────────────────────────────
    var fetchPredictions = useCallback(async function (currentStrip, availableLabels) {
      if (!onCallGemini || currentStrip.length === 0) { setPredictions([]); return; }
      setPredLoading(true);
      try {
        var context = currentStrip.map(function (w) { return w.label; }).join(' ');
        var prompt = 'AAC word prediction task.\n'
          + 'Student has tapped these symbols: "' + context + '"\n'
          + 'Available symbols on the board: ' + availableLabels.join(', ') + '\n'
          + 'Predict the 4 most likely NEXT words/symbols this student wants to communicate.\n'
          + 'Prefer words from the available symbols list when relevant.\n'
          + 'Return ONLY a JSON array of 4 short strings, e.g. ["more","please","go","help"].\n'
          + 'No markdown, no explanation.';
        var raw = await onCallGemini(prompt, false, null, 200);
        var clean = raw.replace(/```json|```/g, '').trim();
        var preds = JSON.parse(clean);
        setPredictions(Array.isArray(preds) ? preds.slice(0, 4) : []);
      } catch (e) {
        setPredictions([]);
      } finally { setPredLoading(false); }
    }, [onCallGemini]);

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
      if (!onCallTTS) return;
      var voice = selectedVoice || 'Kore';
      onCallTTS(label, voice, 1).then(function (url) {
        if (url) { var a = new Audio(url); a.play().catch(function () {}); }
      }).catch(function () {});
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

    // Helper: set browser TTS voice fallback
    var applyVoice = function (utt) {
      if (window.speechSynthesis) {
        var voices = window.speechSynthesis.getVoices();
        var match = voices.find(function (v) { return v.name === (selectedVoice || 'Kore'); });
        if (match) utt.voice = match;
      }
      return utt;
    };

    // ── Multilingual board translation ──
    var translateBoardLabels = useCallback(async function (words, targetLang) {
      if (!onCallGemini || targetLang === 'en') return words;
      setTranslating(true);
      try {
        var labels = words.map(function (w) { return w.label; });
        var langName = (LANG_OPTIONS.find(function (l) { return l.code === targetLang; }) || {}).label || targetLang;
        var prompt = 'Translate these AAC communication board labels to ' + langName + '. Return ONLY a JSON array of translated strings in the same order, no explanation.\n\n' + JSON.stringify(labels);
        var result = await onCallGemini(prompt);
        var text = typeof result === 'string' ? result : (result && result.text ? result.text : '');
        var cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        var translated = JSON.parse(cleaned);
        if (!Array.isArray(translated) || translated.length !== words.length) return words;
        return words.map(function (w, i) {
          return Object.assign({}, w, {
            translatedLabel: translated[i],
            originalLabel: w.originalLabel || w.label
          });
        });
      } catch (err) {
        warnLog('Translation failed:', err);
        addToast && addToast('Translation failed: ' + err.message, 'error');
        return words;
      } finally { setTranslating(false); }
    }, [onCallGemini, addToast]);

    // ── IEP Goal Tracking helpers ──
    var addIepGoal = useCallback(function (goal) {
      var g = {
        id: Date.now().toString(36),
        text: goal.text || '',
        type: goal.type || 'expressive',  // expressive | receptive | social
        targetCount: goal.targetCount || 20,
        currentCount: 0,
        trials: [],
        createdAt: new Date().toISOString(),
        profileId: activeProfileId || 'default'
      };
      setIepGoals(function (prev) { var updated = prev.concat([g]); store(STORAGE_GOALS, updated); return updated; });
      return g;
    }, [activeProfileId]);

    var recordIepTrial = useCallback(function (goalId, success, context) {
      setIepGoals(function (prev) {
        var updated = prev.map(function (g) {
          if (g.id !== goalId) return g;
          var trial = { ts: new Date().toISOString(), success: success, context: context || '' };
          var newCount = g.currentCount + (success ? 1 : 0);
          return Object.assign({}, g, { currentCount: newCount, trials: g.trials.concat([trial]) });
        });
        store(STORAGE_GOALS, updated);

        // Push to RTI dashboard if available
        if (setDashboardData && selectedStudentId) {
          setDashboardData(function (dd) {
            return dd.map(function (s) {
              if (s.id !== selectedStudentId) return s;
              var probe = { date: new Date().toISOString(), type: 'aac', goalId: goalId, success: success, context: context || '' };
              var hist = (s.probeHistory || []).concat([probe]);
              return Object.assign({}, s, { probeHistory: hist });
            });
          });
        }
        return updated;
      });
    }, [setDashboardData, selectedStudentId]);

    var removeIepGoal = useCallback(function (goalId) {
      setIepGoals(function (prev) {
        var updated = prev.filter(function (g) { return g.id !== goalId; });
        store(STORAGE_GOALS, updated);
        return updated;
      });
    }, []);

    var activeGoals = iepGoals.filter(function (g) { return g.profileId === (activeProfileId || 'default'); });

    var speakPage = useCallback(function (text) {
      if (!onCallTTS) return;
      setStorySpeaking(true);
      var voice = selectedVoice || 'Kore';
      onCallTTS(text, voice, 1).then(function (url) {
        if (url) {
          var a = new Audio(url);
          a.onended = function () { setStorySpeaking(false); };
          a.play().catch(function () { setStorySpeaking(false); });
        } else { setStorySpeaking(false); }
      }).catch(function () { setStorySpeaking(false); });
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
      if (item && item.label) speakCell(item.label);
    }, [cbItems, speakCell]);

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
        } else if (qbUploadTarget.type === 'am') {
          setAmItems(function (prev) { return prev.map(function (it) { return it.id === qbUploadTarget.id ? Object.assign({}, it, { image: img }) : it; }); });
        } else if (qbUploadTarget.type === 'bc') {
          setBcItems(function (prev) { return prev.map(function (it) { return it.id === qbUploadTarget.id ? Object.assign({}, it, { image: img }) : it; }); });
        } else if (qbUploadTarget.type === 'tw') {
          setTwItems(function (prev) { return prev.map(function (it) { return it.id === qbUploadTarget.id ? Object.assign({}, it, { image: img }) : it; }); });
        }
      };
      reader.readAsDataURL(file);
      ev.target.value = ''; setQbUploadTarget(null);
    }, [qbUploadTarget]);

    // ── Ask Me Board actions ───────────────────────────────────────────────
    var genAmItem = useCallback(async function (id) {
      var item = amItems.find(function (it) { return it.id === id; });
      if (!item || !onCallImagen) return;
      setAmLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var img = await genWithRetry(buildSymbolPrompt(item.label, 'a child asking a question, speech bubble, communication initiation, simple AAC-style symbol', globalStyle, ''), onCallImagen, onCallGeminiImageEdit, autoClean, null, 400);
        setAmItems(function (prev) { return prev.map(function (it) { return it.id === id ? Object.assign({}, it, { image: img }) : it; }); });
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setAmLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [amItems, globalStyle, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genAllAmItems = useCallback(async function () {
      var items = amItems.filter(function (it) { return !it.image; });
      if (!items.length || !onCallImagen) return;
      var loadMap = {}; items.forEach(function (i) { loadMap[i.id] = true; });
      setAmLoading(function (p) { return Object.assign({}, p, loadMap); });
      var batchOut = await batchGenerate(items, onCallImagen, onCallGeminiImageEdit, autoClean, null, globalStyle, function (id) { setAmLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); });
      setAmItems(function (prev) { var map = {}; batchOut.results.forEach(function (r) { map[r.id] = r; }); return prev.map(function (it) { return map[it.id] ? Object.assign({}, it, { image: map[it.id].image }) : it; }); });
      setAmLoading({});
      addToast && addToast('Ask Me Board images ready!', 'success');
    }, [amItems, autoClean, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

    // ── Body Check actions ─────────────────────────────────────────────────
    var genBcItem = useCallback(async function (id) {
      var item = bcItems.find(function (it) { return it.id === id; });
      if (!item || !onCallImagen) return;
      setBcLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var img = await genWithRetry(buildSymbolPrompt(item.label, 'body part for medical communication with a child, simple clear anatomy AAC-style symbol, white background', globalStyle, ''), onCallImagen, onCallGeminiImageEdit, autoClean, null, 400);
        setBcItems(function (prev) { return prev.map(function (it) { return it.id === id ? Object.assign({}, it, { image: img }) : it; }); });
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setBcLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [bcItems, globalStyle, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genAllBcItems = useCallback(async function () {
      var items = bcItems.filter(function (it) { return !it.image; });
      if (!items.length || !onCallImagen) return;
      var loadMap = {}; items.forEach(function (i) { loadMap[i.id] = true; });
      setBcLoading(function (p) { return Object.assign({}, p, loadMap); });
      var batchOut = await batchGenerate(items, onCallImagen, onCallGeminiImageEdit, autoClean, null, globalStyle, function (id) { setBcLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); });
      setBcItems(function (prev) { var map = {}; batchOut.results.forEach(function (r) { map[r.id] = r; }); return prev.map(function (it) { return map[it.id] ? Object.assign({}, it, { image: map[it.id].image }) : it; }); });
      setBcLoading({});
      addToast && addToast('Body Check images ready!', 'success');
    }, [bcItems, autoClean, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

    // ── Transition Warning actions ─────────────────────────────────────────
    var genTwItem = useCallback(async function (id) {
      var item = twItems.find(function (it) { return it.id === id; });
      if (!item || !onCallImagen) return;
      setTwLoading(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var img = await genWithRetry(buildSymbolPrompt(item.label, 'visual schedule transition warning for children, timer or activity change concept, simple AAC-style symbol', globalStyle, ''), onCallImagen, onCallGeminiImageEdit, autoClean, null, 400);
        setTwItems(function (prev) { return prev.map(function (it) { return it.id === id ? Object.assign({}, it, { image: img }) : it; }); });
      } catch (e) { addToast && addToast('Generation failed', 'error'); }
      finally { setTwLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); }
    }, [twItems, globalStyle, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var genAllTwItems = useCallback(async function () {
      var items = twItems.filter(function (it) { return !it.image; });
      if (!items.length || !onCallImagen) return;
      var loadMap = {}; items.forEach(function (i) { loadMap[i.id] = true; });
      setTwLoading(function (p) { return Object.assign({}, p, loadMap); });
      var batchOut = await batchGenerate(items, onCallImagen, onCallGeminiImageEdit, autoClean, null, globalStyle, function (id) { setTwLoading(function (p) { var n = Object.assign({}, p); delete n[id]; return n; }); });
      setTwItems(function (prev) { var map = {}; batchOut.results.forEach(function (r) { map[r.id] = r; }); return prev.map(function (it) { return map[it.id] ? Object.assign({}, it, { image: map[it.id].image }) : it; }); });
      setTwLoading({});
      addToast && addToast('Transition Warning images ready!', 'success');
    }, [twItems, autoClean, globalStyle, onCallImagen, onCallGeminiImageEdit, addToast]);

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
      input: { width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 9px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' },
      textarea: { width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 9px', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
      btn: function (bg, color, disabled) { return { padding: '8px 14px', background: disabled ? '#d1d5db' : (bg || PURPLE), color: disabled ? '#9ca3af' : (color || '#fff'), border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }; },
      chip: function (bg, color) { return { padding: '3px 8px', background: bg, color: color, border: '1px solid ' + color, borderRadius: '20px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }; },
      card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    };

    // ── Sub-render helpers ─────────────────────────────────────────────────
    function tabBtn(t) {
      var active = tab === t.id;
      return e('button', {
        key: t.id, onClick: function () { setTab(t.id); },
        role: 'tab',
        'aria-selected': active ? 'true' : 'false',
        'aria-label': t.label + ' tab',
        tabIndex: active ? 0 : -1,
        onKeyDown: function (ev) {
          var idx = TABS.findIndex(function (x) { return x.id === t.id; });
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); var next = TABS[(idx + 1) % TABS.length]; setTab(next.id); }
          if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); var prev = TABS[(idx - 1 + TABS.length) % TABS.length]; setTab(prev.id); }
        },
        style: { flex: 1, padding: '6px 4px', borderRadius: '7px', border: 'none', background: active ? '#fff' : 'transparent', color: active ? PURPLE : '#fff', fontWeight: active ? 700 : 500, fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15)' : 'none', transition: 'all 0.15s' }
      }, e('span', { style: { fontSize: '14px' }, 'aria-hidden': 'true' }, t.icon), t.label);
    }

    function spinner(size) {
      return e('div', { style: { width: size, height: size, border: '3px solid #e5e7eb', borderTop: '3px solid ' + PURPLE, borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' } });
    }

    function sectionLabel(text) {
      return e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, text);
    }

    var BOARD_THEMES = {
      default:       { id: 'default',       label: 'Default',       gridBg: '#ffffff', cellBg: null,      textColor: '#1f2937', borderOverride: null },
      pastel:        { id: 'pastel',        label: 'Pastel',        gridBg: '#faf5ff', cellBg: '#f3e8ff', textColor: '#3b0764', borderOverride: '#e9d5ff' },
      dark:          { id: 'dark',          label: 'Dark',          gridBg: '#1e293b', cellBg: '#334155', textColor: '#f1f5f9', borderOverride: '#475569' },
      highcontrast:  { id: 'highcontrast',  label: 'High Contrast', gridBg: '#000000', cellBg: '#000000', textColor: '#ffffff', borderOverride: '#ffffff' },
      warm:          { id: 'warm',          label: 'Warm',          gridBg: '#fffbeb', cellBg: null,      textColor: '#78350f', borderOverride: '#fde68a' },
      cool:          { id: 'cool',          label: 'Cool',          gridBg: '#eff6ff', cellBg: null,      textColor: '#1e3a5f', borderOverride: '#bfdbfe' },
      nature:        { id: 'nature',        label: 'Nature',        gridBg: '#f0fdf4', cellBg: '#ecfccb', textColor: '#14532d', borderOverride: '#86efac' },
      ocean:         { id: 'ocean',         label: 'Ocean',         gridBg: '#ecfeff', cellBg: '#cffafe', textColor: '#164e63', borderOverride: '#67e8f9' },
      sunset:        { id: 'sunset',        label: 'Sunset',        gridBg: '#fff7ed', cellBg: '#ffedd5', textColor: '#7c2d12', borderOverride: '#fdba74' },
      lavender:      { id: 'lavender',      label: 'Lavender',      gridBg: '#faf5ff', cellBg: '#f5f3ff', textColor: '#4c1d95', borderOverride: '#c4b5fd' },
      candy:         { id: 'candy',         label: 'Candy',         gridBg: '#fdf2f8', cellBg: '#fce7f3', textColor: '#831843', borderOverride: '#f9a8d4' },
      earth:         { id: 'earth',         label: 'Earth',         gridBg: '#fefce8', cellBg: '#fef9c3', textColor: '#713f12', borderOverride: '#d9b563' },
    };
    var theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.default;

    // ── Symbol Quest game tab ─────────────────────────────────────────────
    var _questMode = useState('menu'); var questMode = _questMode[0]; var setQuestMode = _questMode[1];
    var _questScore = useState(0); var questScore = _questScore[0]; var setQuestScore = _questScore[1];
    var _questRound = useState(0); var questRound = _questRound[0]; var setQuestRound = _questRound[1];
    var _questTarget = useState(null); var questTarget = _questTarget[0]; var setQuestTarget = _questTarget[1];
    var _questOptions = useState([]); var questOptions = _questOptions[0]; var setQuestOptions = _questOptions[1];
    var _questFeedback = useState(null); var questFeedback = _questFeedback[0]; var setQuestFeedback = _questFeedback[1];
    var _questStreak = useState(0); var questStreak = _questStreak[0]; var setQuestStreak = _questStreak[1];
    var _questBest = useState(0); var questBest = _questBest[0]; var setQuestBest = _questBest[1];
    var _questTotal = useState(0); var questTotal = _questTotal[0]; var setQuestTotal = _questTotal[1];
    var _questCorrectCount = useState(0); var questCorrectCount = _questCorrectCount[0]; var setQuestCorrectCount = _questCorrectCount[1];
    var _questInput = useState(''); var questInput = _questInput[0]; var setQuestInput = _questInput[1];
    var _questBoardPos = useState(0); var questBoardPos = _questBoardPos[0]; var setQuestBoardPos = _questBoardPos[1];

    function questPickRound(mode, pool) {
      if (pool.length < 2) return;
      var target = pool[Math.floor(Math.random() * pool.length)];
      var opts = [target];
      while (opts.length < Math.min(4, pool.length)) {
        var r = pool[Math.floor(Math.random() * pool.length)];
        if (!opts.find(function (o) { return o.id === r.id; })) opts.push(r);
      }
      for (var i = opts.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
      }
      setQuestTarget(target);
      setQuestOptions(opts);
      setQuestFeedback(null);
      setQuestInput('');
      setQuestRound(function (r) { return r + 1; });
    }

    function questCheckAnswer(picked) {
      if (!questTarget) return;
      var correct = picked.id === questTarget.id;
      setQuestTotal(function (t) { return t + 1; });
      // Record IEP trial if receptive goals exist
      var receptiveGoal = activeGoals.find(function (g) { return g.type === 'receptive' && g.currentCount < g.targetCount; });
      if (receptiveGoal) recordIepTrial(receptiveGoal.id, correct, 'quest:' + questMode + ':' + questTarget.label);
      if (correct) {
        var ns = questStreak + 1;
        setQuestStreak(ns);
        if (ns > questBest) setQuestBest(ns);
        var pts = 10 + (ns >= 5 ? 10 : ns >= 3 ? 5 : 0);
        setQuestScore(function (s) { return s + pts; });
        setQuestCorrectCount(function (c) { return c + 1; });
        setQuestBoardPos(function (p) { return p + 1; });
        setQuestFeedback({ ok: true, msg: '✅ Correct! +' + pts + (ns >= 3 ? ' 🔥x' + ns : '') });
        setTimeout(function () { questPickRound(questMode, gallery.filter(function (g) { return g.image; })); }, 1200);
      } else {
        setQuestStreak(0);
        setQuestFeedback({ ok: false, msg: '❌ That was "' + picked.label + '". The answer is "' + questTarget.label + '".' });
        setTimeout(function () { questPickRound(questMode, gallery.filter(function (g) { return g.image; })); }, 2500);
      }
    }

    function renderQuestTab() {
      var pool = gallery.filter(function (g) { return g.image; });
      var GAME_MODES = [
        { id: 'imgToLabel', icon: '🖼️', label: 'See Image → Pick Label', desc: 'See the symbol image and choose the correct label' },
        { id: 'labelToImg', icon: '🏷️', label: 'See Label → Pick Image', desc: 'Read the label and find the matching symbol' },
        { id: 'spelling', icon: '✏️', label: 'Spell It', desc: 'See the image and type the correct label' },
        { id: 'memory', icon: '🧠', label: 'Symbol Memory', desc: 'Match symbol images with their labels' },
      ];
      // Board game path length
      var pathLen = 20;
      var pctDone = Math.min(100, Math.round((questBoardPos / pathLen) * 100));

      if (pool.length < 3) {
        return e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#6b7280', padding: '40px' } },
          e('div', { style: { fontSize: '48px' } }, '🎮'),
          e('h3', { style: { fontWeight: 700, color: '#374151' } }, 'Symbol Quest'),
          e('p', { style: { fontSize: '13px', textAlign: 'center', maxWidth: '360px' } }, 'Generate at least 3 symbols in the Symbols tab first, then come back to play games that teach you the symbols!')
        );
      }

      // Menu screen
      if (questMode === 'menu') {
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '16px', overflowY: 'auto' } },
          e('div', { style: { fontSize: '48px' } }, '🎮'),
          e('h3', { style: { fontWeight: 800, fontSize: '22px', color: '#374151', margin: 0 } }, 'Symbol Quest'),
          e('p', { style: { fontSize: '13px', color: '#6b7280', textAlign: 'center', maxWidth: '400px', margin: 0 } }, 'Learn your symbols through fun mini-games! Each correct answer moves you along the board path.'),
          // Board path progress
          e('div', { style: { width: '100%', maxWidth: '400px', background: '#f3f4f6', borderRadius: '10px', padding: '10px', textAlign: 'center' } },
            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' } }, '🏁 Board Progress: ' + questBoardPos + '/' + pathLen + ' spaces'),
            e('div', { style: { height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' } },
              e('div', { style: { height: '100%', width: pctDone + '%', background: 'linear-gradient(90deg, ' + PURPLE + ', #a78bfa)', borderRadius: '6px', transition: 'width 0.5s' } })
            ),
            questBoardPos >= pathLen && e('div', { style: { marginTop: '8px', fontSize: '14px', fontWeight: 700, color: '#059669' } }, '🏆 Quest Complete! You mastered all symbols!')
          ),
          // Stats
          questTotal > 0 && e('div', { style: { display: 'flex', gap: '8px', width: '100%', maxWidth: '400px' } },
            e('div', { style: { flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '8px', textAlign: 'center' } },
              e('div', { style: { fontSize: '18px', fontWeight: 800, color: '#059669' } }, questCorrectCount),
              e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'correct')
            ),
            e('div', { style: { flex: 1, background: '#faf5ff', borderRadius: '8px', padding: '8px', textAlign: 'center' } },
              e('div', { style: { fontSize: '18px', fontWeight: 800, color: PURPLE } }, questScore),
              e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'points')
            ),
            e('div', { style: { flex: 1, background: '#fef3c7', borderRadius: '8px', padding: '8px', textAlign: 'center' } },
              e('div', { style: { fontSize: '18px', fontWeight: 800, color: '#d97706' } }, questBest + 'x'),
              e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'best streak')
            )
          ),
          // Game mode buttons
          e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '400px' } },
            GAME_MODES.map(function (gm) {
              return e('button', {
                key: gm.id,
                onClick: function () {
                  setQuestMode(gm.id);
                  setQuestRound(0); setQuestStreak(0);
                  questPickRound(gm.id, pool);
                },
                style: { padding: '16px 12px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s, box-shadow 0.15s' },
                onMouseOver: function (ev) { ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.15)'; },
                onMouseOut: function (ev) { ev.currentTarget.style.borderColor = '#e5e7eb'; ev.currentTarget.style.boxShadow = 'none'; }
              },
                e('div', { style: { fontSize: '28px', marginBottom: '6px' } }, gm.icon),
                e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151' } }, gm.label),
                e('div', { style: { fontSize: '10px', color: '#9ca3af', marginTop: '3px' } }, gm.desc)
              );
            })
          ),
          // Reset progress
          questTotal > 0 && e('button', {
            onClick: function () { setQuestScore(0); setQuestBoardPos(0); setQuestTotal(0); setQuestCorrectCount(0); setQuestBest(0); },
            style: { fontSize: '10px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }
          }, '↻ Reset progress')
        );
      }

      // Active game screen
      var backBtn = e('button', { onClick: function () { setQuestMode('menu'); }, style: S.btn('#f3f4f6', '#374151', false) }, '← Back');
      var scoreBar = e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: '#6b7280' } },
        e('span', { style: { fontWeight: 700, color: PURPLE } }, '⭐ ' + questScore),
        e('span', null, '🎯 Round ' + questRound),
        questStreak >= 2 && e('span', { style: { color: '#f97316', fontWeight: 700, animation: 'pulse 1s infinite' } }, '🔥 x' + questStreak),
        e('span', null, '🏁 ' + questBoardPos + '/' + pathLen)
      );
      var feedbackBar = questFeedback && e('div', { style: { padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', background: questFeedback.ok ? '#dcfce7' : '#fee2e2', color: questFeedback.ok ? '#166534' : '#991b1b', border: '1px solid ' + (questFeedback.ok ? '#86efac' : '#fca5a5') } }, questFeedback.msg);

      // ── Image → Label mode ──
      if (questMode === 'imgToLabel') {
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', alignItems: 'center' } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } }, backBtn, scoreBar),
          e('h4', { style: { fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 } }, '🖼️ What symbol is this?'),
          questTarget && e('div', { style: { width: '140px', height: '140px', borderRadius: '16px', overflow: 'hidden', border: '3px solid ' + PURPLE, boxShadow: '0 4px 20px rgba(124,58,237,0.2)' } },
            e('img', { src: questTarget.image, alt: 'symbol', style: { width: '100%', height: '100%', objectFit: 'contain', background: '#fff' } })
          ),
          feedbackBar,
          e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '340px' } },
            questOptions.map(function (opt) {
              return e('button', {
                key: opt.id, onClick: function () { if (!questFeedback) questCheckAnswer(opt); },
                style: { padding: '12px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#374151', cursor: questFeedback ? 'default' : 'pointer', opacity: questFeedback ? 0.6 : 1, transition: 'all 0.15s' },
                onMouseOver: function (ev) { if (!questFeedback) ev.currentTarget.style.borderColor = PURPLE; },
                onMouseOut: function (ev) { ev.currentTarget.style.borderColor = '#e5e7eb'; }
              }, opt.label);
            })
          )
        );
      }

      // ── Label → Image mode ──
      if (questMode === 'labelToImg') {
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', alignItems: 'center' } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } }, backBtn, scoreBar),
          e('h4', { style: { fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 } }, '🏷️ Find the symbol for:'),
          questTarget && e('div', { style: { padding: '10px 24px', background: LIGHT_PURPLE, borderRadius: '12px', border: '2px solid ' + PURPLE } },
            e('span', { style: { fontSize: '20px', fontWeight: 800, color: PURPLE } }, questTarget.label)
          ),
          feedbackBar,
          e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + Math.min(questOptions.length, 4) + ', 1fr)', gap: '10px', width: '100%', maxWidth: '400px' } },
            questOptions.map(function (opt) {
              return e('button', {
                key: opt.id, onClick: function () { if (!questFeedback) questCheckAnswer(opt); },
                style: { padding: '8px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: questFeedback ? 'default' : 'pointer', opacity: questFeedback ? 0.6 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s' },
                onMouseOver: function (ev) { if (!questFeedback) ev.currentTarget.style.borderColor = PURPLE; },
                onMouseOut: function (ev) { ev.currentTarget.style.borderColor = '#e5e7eb'; }
              },
                e('img', { src: opt.image, alt: 'option', style: { width: '70px', height: '70px', objectFit: 'contain', borderRadius: '8px' } })
              );
            })
          )
        );
      }

      // ── Spelling mode ──
      if (questMode === 'spelling') {
        var checkSpelling = function () {
          if (!questTarget) return;
          var correct = questInput.trim().toLowerCase() === questTarget.label.trim().toLowerCase();
          setQuestTotal(function (t) { return t + 1; });
          if (correct) {
            var ns = questStreak + 1;
            setQuestStreak(ns);
            if (ns > questBest) setQuestBest(ns);
            setQuestScore(function (s) { return s + 15; });
            setQuestCorrectCount(function (c) { return c + 1; });
            setQuestBoardPos(function (p) { return p + 1; });
            setQuestFeedback({ ok: true, msg: '✅ Perfect spelling! +15' });
            setTimeout(function () { questPickRound('spelling', pool); }, 1200);
          } else {
            setQuestStreak(0);
            setQuestFeedback({ ok: false, msg: '❌ It\'s spelled "' + questTarget.label + '"' });
            setTimeout(function () { questPickRound('spelling', pool); }, 2500);
          }
        };
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', alignItems: 'center' } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } }, backBtn, scoreBar),
          e('h4', { style: { fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 } }, '✏️ Spell this symbol:'),
          questTarget && e('div', { style: { width: '120px', height: '120px', borderRadius: '14px', overflow: 'hidden', border: '3px solid ' + PURPLE } },
            e('img', { src: questTarget.image, alt: 'symbol', style: { width: '100%', height: '100%', objectFit: 'contain', background: '#fff' } })
          ),
          questTarget && e('div', { style: { fontSize: '11px', color: '#9ca3af' } }, questTarget.label.length + ' letters'),
          feedbackBar,
          e('div', { style: { display: 'flex', gap: '8px', width: '100%', maxWidth: '300px' } },
            e('input', {
              type: 'text', value: questInput, autoFocus: true,
              onChange: function (ev) { setQuestInput(ev.target.value); },
              onKeyDown: function (ev) { if (ev.key === 'Enter') checkSpelling(); },
              placeholder: 'Type the label...',
              'aria-label': 'Spell the symbol label',
              disabled: !!questFeedback,
              style: Object.assign({}, S.input, { flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 700, textTransform: 'lowercase' })
            }),
            e('button', { onClick: checkSpelling, disabled: !!questFeedback || !questInput.trim(), style: S.btn(PURPLE, '#fff', !!questFeedback || !questInput.trim()) }, 'Check')
          )
        );
      }

      // ── Memory match mode ──
      if (questMode === 'memory') {
        var memPool = pool.slice(0, 6);
        var _memCards = useState([]); var memCards = _memCards[0]; var setMemCards = _memCards[1];
        var _memFlipped = useState([]); var memFlipped = _memFlipped[0]; var setMemFlipped = _memFlipped[1];
        var _memMatched = useState([]); var memMatched = _memMatched[0]; var setMemMatched = _memMatched[1];
        var _memMoves = useState(0); var memMoves = _memMoves[0]; var setMemMoves = _memMoves[1];

        var initMemory = function () {
          var cards = [];
          memPool.forEach(function (sym, i) {
            cards.push({ id: 'img-' + i, pairId: i, type: 'image', content: sym.image, label: sym.label });
            cards.push({ id: 'txt-' + i, pairId: i, type: 'text', content: sym.label, label: sym.label });
          });
          for (var i = cards.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
          }
          setMemCards(cards); setMemFlipped([]); setMemMatched([]); setMemMoves(0);
        };
        if (memCards.length === 0 && memPool.length >= 2) initMemory();

        var flipCard = function (idx) {
          if (memFlipped.length >= 2 || memFlipped.includes(idx) || memMatched.includes(memCards[idx].pairId)) return;
          var nf = memFlipped.concat([idx]);
          setMemFlipped(nf);
          if (nf.length === 2) {
            setMemMoves(function (m) { return m + 1; });
            if (memCards[nf[0]].pairId === memCards[nf[1]].pairId) {
              setMemMatched(function (prev) { return prev.concat([memCards[nf[0]].pairId]); });
              setQuestScore(function (s) { return s + 20; });
              setQuestBoardPos(function (p) { return p + 1; });
              setTimeout(function () { setMemFlipped([]); }, 400);
            } else {
              setTimeout(function () { setMemFlipped([]); }, 1200);
            }
          }
        };
        var memWon = memMatched.length === memPool.length && memPool.length > 0;

        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', alignItems: 'center' } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } }, backBtn, scoreBar),
          e('h4', { style: { fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 } }, '🧠 Match symbols with labels'),
          e('div', { style: { fontSize: '11px', color: '#6b7280' } }, 'Moves: ' + memMoves + ' · Matched: ' + memMatched.length + '/' + memPool.length),
          memWon
            ? e('div', { style: { textAlign: 'center', padding: '20px' } },
                e('div', { style: { fontSize: '48px', marginBottom: '10px' } }, '🏆'),
                e('div', { style: { fontSize: '16px', fontWeight: 700, color: '#059669' } }, 'All matched in ' + memMoves + ' moves!'),
                e('button', { onClick: function () { initMemory(); }, style: Object.assign({}, S.btn(PURPLE, '#fff', false), { marginTop: '12px' }) }, '🔄 Play Again')
              )
            : e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%', maxWidth: '400px' } },
                memCards.map(function (card, idx) {
                  var isUp = memFlipped.includes(idx) || memMatched.includes(card.pairId);
                  return e('button', {
                    key: card.id, onClick: function () { flipCard(idx); },
                    style: { aspectRatio: '1', border: '2px solid ' + (isUp ? PURPLE : '#e5e7eb'), borderRadius: '10px', background: isUp ? '#fff' : LIGHT_PURPLE, cursor: isUp ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'all 0.2s', opacity: memMatched.includes(card.pairId) ? 0.5 : 1 }
                  },
                    isUp
                      ? (card.type === 'image'
                        ? e('img', { src: card.content, alt: '', style: { width: '90%', height: '90%', objectFit: 'contain', borderRadius: '6px' } })
                        : e('span', { style: { fontSize: '11px', fontWeight: 700, color: '#374151', textAlign: 'center', wordBreak: 'break-word' } }, card.content)
                      )
                      : e('span', { style: { fontSize: '24px' } }, '❓')
                  );
                })
              )
        );
      }

      // Fallback
      return e('div', null, 'Unknown mode');
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
        { id: 'askme', icon: '🙋', label: 'Ask Me' },
        { id: 'bodycheck', icon: '🩺', label: 'Body Check' },
        { id: 'transition', icon: '⏰', label: 'Transition' },
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
                e('input', { type: 'text', value: label, onChange: function (ev) { setLabel(ev.target.value); }, placeholder: which === 'first' ? 'e.g. homework' : 'e.g. iPad time', 'aria-label': which === 'first' ? 'First activity' : 'Reward activity', style: Object.assign({}, S.input, { fontSize: '11px' }) }),
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
                  e('input', { type: 'text', value: item.label, onChange: function (ev) { var v = ev.target.value; setCbItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); }, placeholder: 'Option ' + (idx + 1), 'aria-label': 'Choice board option ' + (idx + 1), style: Object.assign({}, S.input, { fontSize: '11px' }), onClick: function (ev) { ev.stopPropagation(); } }),
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
              e('input', { type: 'text', value: tokenLabel, onChange: function (ev) { setTokenLabel(ev.target.value); }, placeholder: 'e.g. Stay in seat', 'aria-label': 'Token board behavior label', style: Object.assign({}, S.input, { width: 140 }) })
            ),
            e('div', null,
              e('label', { style: S.lbl }, 'Tokens needed'),
              e('select', { value: tokenTotal, onChange: function (ev) { setTokenTotal(Number(ev.target.value)); setTokenEarned(0); }, 'aria-label': 'Number of tokens required', style: Object.assign({}, S.input, { width: 70 }) },
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
                e('input', { type: 'text', value: tokenRewardLabel, onChange: function (ev) { setTokenRewardLabel(ev.target.value); }, placeholder: 'e.g. iPad time', 'aria-label': 'Token board reward', style: Object.assign({}, S.input, { fontSize: '11px' }) }),
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
                onClick: function () { speakCell(item.label); },
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
                  style: { border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12px', color: '#064e3b', textAlign: 'center', width: '100%', cursor: 'text', lineHeight: 1.4 }, 'aria-label': 'Calming item label'
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
                onClick: function () { speakCell(item.label); },
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
                  style: { border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12px', color: '#78350f', textAlign: 'center', width: '100%', cursor: 'text', lineHeight: 1.4 }, 'aria-label': 'Sensory item label'
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

      // ── Ask Me Board ──
      function renderAskMe() {
        var BLUE = '#2563eb'; var BLUE_LIGHT = '#eff6ff'; var BLUE_BORDER = '#bfdbfe';
        var amLoadingAny = Object.keys(amLoading).length > 0;
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flex: 1, overflow: 'hidden' } },
          e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 } },
            e('p', { style: { fontSize: '12px', color: '#6b7280', margin: 0 } }, 'Questions a student can initiate \u2014 tap any card to speak it aloud'),
            e('button', { onClick: genAllAmItems, disabled: !onCallImagen || amLoadingAny, style: Object.assign({}, S.btn(BLUE, '#fff', !onCallImagen || amLoadingAny), { marginLeft: 'auto' }) }, amLoadingAny ? '\u29d7 Generating...' : '\u2728 Generate All Images')
          ),
          e('div', { id: 'ss-pq-askme', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '12px', overflowY: 'auto', flex: 1 } },
            amItems.map(function (item) {
              var isLoading = !!amLoading[item.id];
              return e('div', {
                key: item.id,
                onClick: function () { speakCell(item.label); },
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 10px 10px', border: '2px solid ' + BLUE_BORDER, borderRadius: '14px', background: BLUE_LIGHT, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', position: 'relative' },
                onMouseOver: function (ev) { ev.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.18)'; ev.currentTarget.style.transform = 'translateY(-2px)'; },
                onMouseOut: function (ev) { ev.currentTarget.style.boxShadow = 'none'; ev.currentTarget.style.transform = 'none'; }
              },
                e('div', { style: { width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: '#fff', border: '1px solid ' + BLUE_BORDER, overflow: 'hidden', flexShrink: 0 } },
                  isLoading ? spinner(28) : item.image ? e('img', { src: item.image, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '6px' } }) : e('div', { style: { fontSize: '34px' } }, '\uD83D\uDE4B')
                ),
                e('input', { type: 'text', value: item.label, onClick: function (ev) { ev.stopPropagation(); }, onChange: function (ev) { var v = ev.target.value; setAmItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); }, 'aria-label': 'Activity label', style: { border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12px', color: '#1e3a8a', textAlign: 'center', width: '100%', cursor: 'text', lineHeight: 1.4 } }),
                e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '4px' } },
                  e('button', { title: 'Generate image', onClick: function (ev) { ev.stopPropagation(); genAmItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '\u2728'),
                  e('button', { title: 'Upload image', onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'am', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDCF7')
                )
              );
            })
          ),
          e('p', { className: 'ss-no-print', style: { fontSize: '11px', color: '#6b7280', margin: 0, flexShrink: 0 } }, 'Print as a laminated card in a communication binder, or display on a tablet for students to initiate questions independently.')
        );
      }

      // ── Body Check / Pain Scale ──
      function renderBodyCheck() {
        var ROSE = '#e11d48'; var ROSE_LIGHT = '#fff1f2'; var ROSE_BORDER = '#fecdd3';
        var bcLoadingAny = Object.keys(bcLoading).length > 0;
        var PAIN_COLORS = ['#22c55e','#4ade80','#86efac','#fde047','#fb923c','#f87171','#ef4444','#dc2626','#b91c1c','#7f1d1d'];
        var PAIN_LABELS = ['1\nNo pain','2\nA little','3\nSome','4\nMild','5\nModerate','6\nMore','7\nStrong','8\nVery bad','9\nSevere','10\nWorst'];
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flex: 1, overflow: 'hidden' } },
          e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 } },
            e('p', { style: { fontSize: '12px', color: '#6b7280', margin: 0 } }, 'Help students communicate pain level and location without words'),
            e('button', { onClick: genAllBcItems, disabled: !onCallImagen || bcLoadingAny, style: Object.assign({}, S.btn(ROSE, '#fff', !onCallImagen || bcLoadingAny), { marginLeft: 'auto' }) }, bcLoadingAny ? '\u29d7 Generating...' : '\u2728 Generate Body Parts')
          ),
          // Pain scale
          e('div', { id: 'ss-pq-bodycheck', style: { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' } },
            e('div', null,
              e('div', { style: { fontWeight: 700, fontSize: '12px', color: '#374151', marginBottom: '8px' } }, 'Pain Scale \u2014 tap to select'),
              e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                PAIN_LABELS.map(function (lbl, i) {
                  var level = i + 1;
                  var isSelected = bcPainLevel === level;
                  return e('div', {
                    key: level,
                    onClick: function () { setBcPainLevel(isSelected ? null : level); speakCell(lbl.replace('\n', ', ')); },
                    style: { width: 52, padding: '8px 4px', borderRadius: '10px', background: PAIN_COLORS[i], border: isSelected ? '3px solid #1e293b' : '3px solid transparent', cursor: 'pointer', textAlign: 'center', boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,0.2)' : 'none', transition: 'transform 0.1s', transform: isSelected ? 'scale(1.12)' : 'scale(1)' }
                  },
                    e('div', { style: { fontWeight: 800, fontSize: '16px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' } }, level),
                    e('div', { style: { fontSize: '9px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)', lineHeight: 1.3, whiteSpace: 'pre-line' } }, lbl.split('\n')[1])
                  );
                })
              ),
              bcPainLevel && e('p', { style: { marginTop: '8px', fontSize: '13px', fontWeight: 700, color: ROSE } }, 'Selected: Pain level ' + bcPainLevel + ' \u2014 ' + PAIN_LABELS[bcPainLevel - 1].split('\n')[1])
            ),
            // Body parts grid
            e('div', null,
              e('div', { style: { fontWeight: 700, fontSize: '12px', color: '#374151', marginBottom: '8px' } }, 'Where does it hurt? \u2014 tap to speak'),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' } },
                bcItems.map(function (item) {
                  var isLoading = !!bcLoading[item.id];
                  return e('div', {
                    key: item.id,
                    onClick: function () { speakCell(item.label); },
                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px 8px', border: '2px solid ' + ROSE_BORDER, borderRadius: '12px', background: ROSE_LIGHT, cursor: 'pointer', transition: 'transform 0.1s' },
                    onMouseOver: function (ev) { ev.currentTarget.style.transform = 'translateY(-2px)'; },
                    onMouseOut: function (ev) { ev.currentTarget.style.transform = 'none'; }
                  },
                    e('div', { style: { width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: '#fff', border: '1px solid ' + ROSE_BORDER, overflow: 'hidden' } },
                      isLoading ? spinner(24) : item.image ? e('img', { src: item.image, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '5px' } }) : e('div', { style: { fontSize: '30px' } }, '\uD83E\uDDB4')
                    ),
                    e('input', { type: 'text', value: item.label, onClick: function (ev) { ev.stopPropagation(); }, onChange: function (ev) { var v = ev.target.value; setBcItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); }, 'aria-label': 'Behavior chart item label', style: { border: 'none', background: 'transparent', fontWeight: 700, fontSize: '11px', color: '#9f1239', textAlign: 'center', width: '100%', cursor: 'text' } }),
                    e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '3px' } },
                      e('button', { onClick: function (ev) { ev.stopPropagation(); genBcItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '\u2728'),
                      e('button', { onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'bc', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDCF7')
                    )
                  );
                })
              )
            )
          )
        );
      }

      // ── Transition Warning ──
      function renderTransitionWarning() {
        var INDIGO = '#4338ca'; var INDIGO_LIGHT = '#eef2ff'; var INDIGO_BORDER = '#c7d2fe';
        var twLoadingAny = Object.keys(twLoading).length > 0;
        var currentItem = twItems[twStep] || null;
        return e('div', { style: { display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', flex: 1, overflow: 'hidden' } },
          e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 } },
            e('p', { style: { fontSize: '12px', color: '#6b7280', margin: 0 } }, 'Show one step at a time \u2014 use arrows to advance through the transition sequence'),
            e('button', { onClick: genAllTwItems, disabled: !onCallImagen || twLoadingAny, style: Object.assign({}, S.btn(INDIGO, '#fff', !onCallImagen || twLoadingAny), { marginLeft: 'auto' }) }, twLoadingAny ? '\u29d7 Generating...' : '\u2728 Generate All Images')
          ),
          // Live presentation step
          e('div', { id: 'ss-pq-transition', style: { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' } },
            // Big current step display
            currentItem && e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: INDIGO_LIGHT, border: '3px solid ' + INDIGO_BORDER, borderRadius: '16px', padding: '24px', flexShrink: 0 } },
              e('div', { style: { fontSize: '11px', fontWeight: 700, color: INDIGO, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Current Step ' + (twStep + 1) + ' of ' + twItems.length),
              e('div', { style: { width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', background: '#fff', border: '2px solid ' + INDIGO_BORDER, overflow: 'hidden' } },
                twLoading[currentItem.id] ? spinner(32) : currentItem.image ? e('img', { src: currentItem.image, alt: currentItem.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '8px' } }) : e('div', { style: { fontSize: '48px' } }, '\u23F0')
              ),
              e('div', { style: { fontWeight: 800, fontSize: '20px', color: '#312e81', textAlign: 'center' } }, currentItem.label),
              e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '10px', marginTop: '4px' } },
                e('button', { onClick: function () { setTwStep(function (s) { return Math.max(0, s - 1); }); }, disabled: twStep === 0, style: S.btn('#e0e7ff', INDIGO, twStep === 0) }, '\u2190 Prev'),
                e('button', { onClick: function () { speakCell(currentItem.label); }, style: S.btn(INDIGO, '#fff', false) }, '\uD83D\uDD0A Speak'),
                e('button', { onClick: function () { setTwStep(function (s) { return Math.min(twItems.length - 1, s + 1); }); }, disabled: twStep === twItems.length - 1, style: S.btn('#e0e7ff', INDIGO, twStep === twItems.length - 1) }, 'Next \u2192')
              )
            ),
            // All steps grid
            e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' } },
              twItems.map(function (item, idx) {
                var isLoading = !!twLoading[item.id];
                var isCurrent = idx === twStep;
                return e('div', {
                  key: item.id,
                  onClick: function () { setTwStep(idx); speakCell(item.label); },
                  style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 8px 8px', border: '2px solid ' + (isCurrent ? INDIGO : INDIGO_BORDER), borderRadius: '12px', background: isCurrent ? INDIGO_LIGHT : '#fff', cursor: 'pointer', outline: isCurrent ? '2px solid ' + INDIGO : '2px solid transparent', transition: 'all 0.1s' }
                },
                  e('div', { style: { fontSize: '9px', fontWeight: 700, color: isCurrent ? INDIGO : '#9ca3af', marginBottom: '2px' } }, 'STEP ' + (idx + 1)),
                  e('div', { style: { width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', overflow: 'hidden' } },
                    isLoading ? spinner(20) : item.image ? e('img', { src: item.image, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '4px' } }) : e('div', { style: { fontSize: '24px' } }, '\u23F0')
                  ),
                  e('input', { type: 'text', value: item.label, onClick: function (ev) { ev.stopPropagation(); }, onChange: function (ev) { var v = ev.target.value; setTwItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); }, style: { border: 'none', background: 'transparent', fontWeight: 600, fontSize: '10px', color: isCurrent ? '#312e81' : '#374151', textAlign: 'center', width: '100%', cursor: 'text', lineHeight: 1.4 }, 'aria-label': 'Task walk step label' }),
                  e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '3px' } },
                    e('button', { onClick: function (ev) { ev.stopPropagation(); genTwItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '\u2728'),
                    e('button', { onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'tw', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDCF7')
                  )
                );
              })
            )
          )
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
          qbMode === 'sensory' && renderSensoryNeeds(),
          qbMode === 'askme' && renderAskMe(),
          qbMode === 'bodycheck' && renderBodyCheck(),
          qbMode === 'transition' && renderTransitionWarning()
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
            }, placeholder: 'e.g. Marcus', 'aria-label': 'Avatar name', style: Object.assign({}, S.input, { marginBottom: '6px' }) }),
            e('label', { style: S.lbl }, 'Appearance'),
            e('input', { type: 'text', value: avatarDesc, onChange: function (ev) {
              var val = ev.target.value; setAvatarDesc(val);
              var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { description: val }) : p; });
              setProfiles(upd); store(STORAGE_PROFILES, upd);
            }, placeholder: 'e.g. 8-year-old boy with curly hair', 'aria-label': 'Avatar appearance description', style: Object.assign({}, S.input, { marginBottom: '8px' }) }),
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
          e('select', { value: globalStyleSel, onChange: function (ev) { setGlobalStyle(ev.target.value); }, 'aria-label': 'Art style', style: Object.assign({}, S.input, { marginBottom: globalStyleSel === '__custom__' ? '4px' : '8px' }) },
            STYLE_OPTIONS.map(function (o) { return e('option', { key: o.value, value: o.value }, o.label); })
          ),
          globalStyleSel === '__custom__' && e('input', {
            type: 'text', value: customStyle,
            onChange: function (ev) { setCustomStyle(ev.target.value); },
            placeholder: 'e.g. pastel crayon, realistic pencil sketch, pixel art...',
            'aria-label': 'Custom art style description',
            style: Object.assign({}, S.input, { marginBottom: '8px', fontSize: '11px' })
          }),
          e('label', { style: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: '#374151' } },
            e('input', { type: 'checkbox', checked: autoClean, onChange: function (ev) { setAutoClean(ev.target.checked); }, 'aria-label': 'Auto-clean text from images' }),
            e('span', null, 'Auto-clean text from images')
          ),
          e('p', { style: { fontSize: '10px', color: '#9ca3af', margin: '3px 0 0' } }, 'Runs a second AI pass to strip any embedded labels'),
          e('label', { style: Object.assign({}, S.lbl, { marginTop: '10px' }) }, 'Category Colors (AAC)'),
          e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '4px' } },
            [['noun', 'Noun'], ['verb', 'Verb'], ['adjective', 'Adj'], ['other', 'Other']].map(function (pair) {
              return e('label', { key: pair[0], style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#374151', cursor: 'pointer' } },
                e('input', {
                  type: 'color', value: catFill[pair[0]] || '#f9fafb',
                  onChange: function (ev) { var v = ev.target.value; setCatFill(function (prev) { var n = Object.assign({}, prev); n[pair[0]] = v; store(STORAGE_CAT_COLORS + '_fill', n); return n; }); },
                  style: { width: 18, height: 18, padding: 0, border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }
                }),
                pair[1]
              );
            }),
            e('button', {
              onClick: function () { setCatFill(CAT_COLORS); setCatBorder(CAT_BORDER); store(STORAGE_CAT_COLORS + '_fill', CAT_COLORS); store(STORAGE_CAT_COLORS + '_border', CAT_BORDER); },
              style: { fontSize: '10px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }
            }, 'Reset')
          ),
          e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '0' } }, 'Colors apply to boards and symbol cards'),
          e('label', { style: Object.assign({}, S.lbl, { marginTop: '10px' }) }, '🔊 Quick Voice Settings'),
          e('select', {
              value: currentVoice,
              onChange: function (ev) { if (onSetVoice) onSetVoice(ev.target.value); },
              'aria-label': 'Text-to-speech voice selection',
              style: Object.assign({}, S.input, { marginBottom: '4px' })
            },
            isCanvasEnv ? [
              e('optgroup', { key: 'gemini', label: '✨ Gemini TTS (Cloud)' },
                geminiVoices.slice(0, 15).map(function (v) {
                  return e('option', { key: v.id, value: v.id }, v.label || v.id);
                })
              ),
              e('optgroup', { key: 'kokoro', label: '🎤 Kokoro (Offline Fallback)' },
                kokoroVoices.map(function (v) {
                  return e('option', { key: v.id, value: v.id }, v.label);
                })
              )
            ] : geminiVoices.map(function (v) {
              return e('option', { key: v.id, value: v.id }, v.label || v.id);
            })
          ),
          e('button', {
            onClick: function () {
              if (!onCallTTS) return;
              onCallTTS('Hello! This is how I sound.', currentVoice, 1).then(function (url) {
                if (url) { var a = new Audio(url); a.play().catch(function () {}); }
              }).catch(function () {});
            },
            'aria-label': 'Preview selected voice',
            style: Object.assign({}, { fontSize: '10px', color: PURPLE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: '4px' })
          }, '🔊 Preview voice'),
          e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '0' } },
            onSetVoice ? 'Synced with app-wide voice settings' : 'Used for read-aloud in stories, boards, and AAC mode'
          )
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
          // ── Analytics card (inside Backup panel) ──
          (function () {
            var pid = activeProfileId || '__global__';
            var profLog = usageLog[pid] || { sessions: [] };
            var allSessions = profLog.sessions || [];
            var now = Date.now();
            var weekMs = 7 * 24 * 3600 * 1000;
            var thisWeekEntries = 0; var lastWeekEntries = 0;
            var wordCount = {};
            allSessions.forEach(function (s) {
              var st = new Date(s.date).getTime();
              (s.entries || []).forEach(function (en) {
                var lbl = en.label;
                wordCount[lbl] = (wordCount[lbl] || 0) + 1;
                if (now - st < weekMs) thisWeekEntries++;
                else if (now - st < 2 * weekMs) lastWeekEntries++;
              });
            });
            var totalUtterances = Object.values(wordCount).reduce(function (a, b) { return a + b; }, 0);
            var topWords = Object.keys(wordCount).sort(function (a, b) { return wordCount[b] - wordCount[a]; }).slice(0, 8);
            return e('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' } },
              e('button', {
                onClick: function () { setShowAnalytics(function (v) { return !v; }); },
                style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: showAnalytics ? '8px' : 0 }
              }, '📊 AAC Usage Analytics ', e('span', { style: { color: '#9ca3af', fontWeight: 400, marginLeft: 'auto', fontSize: '10px' } }, showAnalytics ? '▲ hide' : '▼ show')),
              showAnalytics && allSessions.length === 0 && e('p', { style: { fontSize: '10px', color: '#9ca3af', margin: 0 } }, 'No sessions recorded yet. Use a board in Use mode to start tracking.'),
              showAnalytics && allSessions.length > 0 && e('div', null,
                // Summary row
                e('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
                  e('div', { style: { flex: 1, background: '#f0fdf4', borderRadius: '7px', padding: '6px', textAlign: 'center' } },
                    e('div', { style: { fontSize: '16px', fontWeight: 800, color: '#059669' } }, totalUtterances),
                    e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'total')
                  ),
                  e('div', { style: { flex: 1, background: '#eff6ff', borderRadius: '7px', padding: '6px', textAlign: 'center' } },
                    e('div', { style: { fontSize: '16px', fontWeight: 800, color: '#2563eb' } }, allSessions.length),
                    e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'sessions')
                  ),
                  e('div', { style: { flex: 1, background: '#faf5ff', borderRadius: '7px', padding: '6px', textAlign: 'center' } },
                    e('div', { style: { fontSize: '16px', fontWeight: 800, color: PURPLE } }, thisWeekEntries),
                    e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'this week' + (lastWeekEntries > 0 ? (thisWeekEntries >= lastWeekEntries ? ' ▲' : ' ▼') : '')))

                ),
                // Top words
                topWords.length > 0 && e('div', { style: { marginBottom: '8px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 600, color: '#374151', marginBottom: '5px' } }, 'Top words:'),
                  e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                    topWords.map(function (w) {
                      var pct = Math.round((wordCount[w] / totalUtterances) * 100);
                      return e('div', { key: w, style: { background: LIGHT_PURPLE, borderRadius: '5px', padding: '2px 7px', fontSize: '10px', color: PURPLE, fontWeight: 600 } },
                        w, e('span', { style: { fontWeight: 400, color: '#6b7280', marginLeft: '3px' } }, wordCount[w])
                      );
                    })
                  )
                ),
                // 7-day activity bar chart
                (function () {
                  var days = []; var dayLabels = [];
                  for (var di = 6; di >= 0; di--) {
                    var d = new Date(now - di * 24 * 3600 * 1000);
                    var key = d.toISOString().slice(0, 10);
                    dayLabels.push(d.toLocaleDateString([], { weekday: 'short' }).slice(0, 2));
                    var count = 0;
                    allSessions.forEach(function (s) {
                      if ((s.date || '').slice(0, 10) === key) count += (s.entries || []).length;
                    });
                    days.push(count);
                  }
                  var maxD = Math.max.apply(null, days.concat([1]));
                  return e('div', { style: { marginBottom: '8px' } },
                    e('div', { style: { fontSize: '10px', fontWeight: 600, color: '#374151', marginBottom: '5px' } }, '7-Day Activity:'),
                    e('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '48px' } },
                      days.map(function (c, i) {
                        var h = Math.max(3, Math.round((c / maxD) * 44));
                        return e('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' } },
                          c > 0 && e('span', { style: { fontSize: '8px', color: '#6b7280' } }, c),
                          e('div', { style: { width: '100%', height: h + 'px', background: c > 0 ? PURPLE : '#e5e7eb', borderRadius: '2px', transition: 'height 0.3s' } })
                        );
                      })
                    ),
                    e('div', { style: { display: 'flex', gap: '3px', marginTop: '2px' } },
                      dayLabels.map(function (l, i) { return e('div', { key: i, style: { flex: 1, textAlign: 'center', fontSize: '8px', color: '#9ca3af' } }, l); })
                    )
                  );
                })(),
                // Vocabulary diversity score
                (function () {
                  var uniqueWords = Object.keys(wordCount).length;
                  var diversityPct = totalUtterances > 0 ? Math.round((uniqueWords / totalUtterances) * 100) : 0;
                  return e('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
                    e('div', { style: { flex: 1, background: '#fef3c7', borderRadius: '7px', padding: '6px', textAlign: 'center' } },
                      e('div', { style: { fontSize: '16px', fontWeight: 800, color: '#d97706' } }, uniqueWords),
                      e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'unique words')
                    ),
                    e('div', { style: { flex: 1, background: '#f0fdf4', borderRadius: '7px', padding: '6px', textAlign: 'center' } },
                      e('div', { style: { fontSize: '16px', fontWeight: 800, color: '#059669' } }, diversityPct + '%'),
                      e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'diversity')
                    )
                  );
                })(),
                // Recent sessions
                e('div', { style: { fontSize: '10px', fontWeight: 600, color: '#374151', marginBottom: '4px' } }, 'Recent sessions:'),
                allSessions.slice(-5).reverse().map(function (s, i) {
                  return e('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', padding: '2px 0', borderBottom: '1px solid #f3f4f6' } },
                    e('span', null, s.boardTitle || 'Board'),
                    e('span', null, (s.entries || []).length + ' words · ' + new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }))
                  );
                }),
                // Clear button
                e('button', {
                  onClick: function () {
                    var updated = Object.assign({}, usageLog);
                    delete updated[pid];
                    store(STORAGE_USAGE, updated);
                    setUsageLog(updated);
                  },
                  style: Object.assign({}, S.btn('#fee2e2', '#dc2626', false), { fontSize: '10px', padding: '3px 8px', marginTop: '6px' })
                }, '🗑️ Clear Analytics')
              )
            );
          })(),
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
        ),
        // ── IEP Communication Goals ──
        e('div', { style: S.card },
          sectionLabel('IEP Communication Goals'),
          e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '0 0 8px' } }, 'Track AAC & communication goals. Progress syncs with Teacher Dashboard RTI data.'),
          // Active goals list
          activeGoals.length > 0 && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' } },
            activeGoals.map(function (g) {
              var pct = g.targetCount > 0 ? Math.round((g.currentCount / g.targetCount) * 100) : 0;
              var recentTrials = (g.trials || []).slice(-10);
              var recentAcc = recentTrials.length > 0 ? Math.round((recentTrials.filter(function (t) { return t.success; }).length / recentTrials.length) * 100) : 0;
              var goalTypeColors = { expressive: '#7c3aed', receptive: '#2563eb', social: '#059669' };
              var typeColor = goalTypeColors[g.type] || '#6b7280';
              return e('div', { key: g.id, style: { background: '#f9fafb', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e5e7eb' } },
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' } },
                  e('span', { style: { fontSize: '9px', background: typeColor, color: '#fff', borderRadius: '4px', padding: '1px 6px', fontWeight: 700, textTransform: 'uppercase' } }, g.type),
                  e('span', { style: { fontSize: '11px', fontWeight: 700, color: '#374151', flex: 1 } }, g.text),
                  e('button', { onClick: function () { removeIepGoal(g.id); }, style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#dc2626', padding: '0 3px' } }, '✕')
                ),
                // Progress bar
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                  e('div', { style: { flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' } },
                    e('div', { style: { height: '100%', width: Math.min(100, pct) + '%', background: pct >= 100 ? '#16a34a' : typeColor, borderRadius: '4px', transition: 'width 0.3s' } })
                  ),
                  e('span', { style: { fontSize: '10px', fontWeight: 700, color: pct >= 100 ? '#16a34a' : '#374151', minWidth: '36px', textAlign: 'right' } }, g.currentCount + '/' + g.targetCount)
                ),
                // Recent accuracy
                recentTrials.length > 0 && e('div', { style: { display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' } },
                  e('span', { style: { fontSize: '9px', color: '#9ca3af' } }, 'Last 10:'),
                  recentTrials.map(function (t, ti) {
                    return e('span', { key: ti, style: { width: '8px', height: '8px', borderRadius: '50%', background: t.success ? '#16a34a' : '#dc2626', display: 'inline-block' } });
                  }),
                  e('span', { style: { fontSize: '9px', fontWeight: 700, color: recentAcc >= 80 ? '#16a34a' : recentAcc >= 60 ? '#d97706' : '#dc2626', marginLeft: '4px' } }, recentAcc + '% acc')
                ),
                // Manual trial buttons
                e('div', { style: { display: 'flex', gap: '4px', marginTop: '6px' } },
                  e('button', {
                    onClick: function () { recordIepTrial(g.id, true, 'manual'); },
                    style: { fontSize: '10px', background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }
                  }, '✓ Success'),
                  e('button', {
                    onClick: function () { recordIepTrial(g.id, false, 'manual'); },
                    style: { fontSize: '10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }
                  }, '✗ No response')
                )
              );
            })
          ),
          activeGoals.length === 0 && e('p', { style: { fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', margin: '0 0 8px' } }, 'No goals set for this profile yet.'),
          // Add goal form
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            e('div', { style: { display: 'flex', gap: '6px' } },
              e('select', {
                id: 'iep-goal-type',
                'aria-label': 'IEP goal type',
                style: { fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', background: '#fff' }
              },
                e('option', { value: 'expressive' }, 'Expressive'),
                e('option', { value: 'receptive' }, 'Receptive'),
                e('option', { value: 'social' }, 'Social')
              ),
              e('input', {
                id: 'iep-goal-text',
                type: 'text',
                placeholder: 'e.g. Request items using 2-word phrases',
                'aria-label': 'IEP goal description',
                style: Object.assign({}, S.input, { flex: 1, margin: 0, fontSize: '11px' })
              }),
              e('input', {
                id: 'iep-goal-target',
                type: 'number', min: 1, max: 200,
                placeholder: '# target',
                'aria-label': 'IEP goal target count',
                style: { width: '60px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', textAlign: 'center' }
              })
            ),
            e('button', {
              onClick: function () {
                var text = document.getElementById('iep-goal-text');
                var type = document.getElementById('iep-goal-type');
                var target = document.getElementById('iep-goal-target');
                if (!text || !text.value.trim()) return;
                addIepGoal({ text: text.value.trim(), type: type ? type.value : 'expressive', targetCount: target ? (parseInt(target.value, 10) || 20) : 20 });
                text.value = '';
                if (target) target.value = '';
              },
              style: S.btn(PURPLE, '#fff', false)
            }, '+ Add Goal')
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
        if (symCatFilter && i.category !== symCatFilter) return false;
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
          // Context-aware suggestions
          (function () {
            var hour = new Date().getHours();
            var timeSuggestions = hour < 9 ? ['good morning', 'breakfast', 'get dressed', 'brush teeth', 'backpack']
              : hour < 12 ? ['help', 'bathroom', 'water', 'finished', 'listen', 'read']
              : hour < 14 ? ['lunch', 'hungry', 'drink', 'napkin', 'more', 'all done']
              : hour < 16 ? ['play', 'share', 'my turn', 'friend', 'outside', 'art']
              : ['home', 'snack', 'tired', 'bath', 'dinner', 'goodnight'];
            var existing = gallery.map(function (g) { return g.label.toLowerCase(); });
            var filtered = timeSuggestions.filter(function (s) { return existing.indexOf(s) === -1; });
            if (filtered.length === 0) return null;
            return e('div', { style: { marginBottom: '4px' } },
              e('div', { style: { fontSize: '9px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '💡 Suggested (' + (hour < 9 ? 'Morning' : hour < 12 ? 'School' : hour < 14 ? 'Lunch' : hour < 16 ? 'Afternoon' : 'Evening') + ')'),
              e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px' } },
                filtered.map(function (s) {
                  return e('button', { key: s, onClick: function () { setSymLabel(s); }, style: { padding: '2px 7px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '10px', fontSize: '9px', cursor: 'pointer', color: '#92400e', fontWeight: 500 } }, s);
                })
              )
            );
          })(),
          symMode === 'single'
            ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: '7px' } },
                e('div', null, e('label', { style: S.lbl }, 'Label'), e('input', { type: 'text', value: symLabel, onChange: function (ev) { setSymLabel(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') genSingle(); }, placeholder: 'e.g. wash hands', 'aria-label': 'Symbol label', style: S.input, autoFocus: true })),
                e('div', null, e('label', { style: S.lbl }, 'Context (optional)'), e('input', { type: 'text', value: symDesc, onChange: function (ev) { setSymDesc(ev.target.value); }, placeholder: 'e.g. hygiene routine', 'aria-label': 'Symbol context', style: S.input })),
                e('div', null,
                  e('label', { style: S.lbl }, 'Category'),
                  e('select', { value: symCategory, onChange: function (ev) { setSymCategory(ev.target.value); }, 'aria-label': 'Symbol category', style: S.input },
                    e('option', { value: '' }, 'other'),
                    ['emotions', 'classroom', 'daily living', 'food', 'social', 'actions', 'places', 'objects'].map(function (c) { return e('option', { key: c, value: c }, c); })
                  )
                )
              )
            : e('div', null,
                e('label', { style: S.lbl }, 'One label per line'),
                e('textarea', { value: symBatch, onChange: function (ev) { setSymBatch(ev.target.value); }, placeholder: 'brush teeth\nget dressed\neat breakfast', 'aria-label': 'Batch symbol labels, one per line', style: Object.assign({}, S.textarea, { height: '70px' }) }),
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
          e('button', { onClick: symMode === 'single' ? genSingle : genBatch, disabled: isLoading || (symMode === 'single' ? !symLabel.trim() : !symBatch.trim()), 'aria-label': isLoading ? 'Generating symbols' : 'Generate symbol' + (symMode === 'batch' ? ' batch' : ''), style: S.btn(PURPLE, '#fff', isLoading || (symMode === 'single' ? !symLabel.trim() : !symBatch.trim())) },
            isLoading ? '⏳ Generating...' : '✨ Generate' + (symMode === 'batch' ? ' Batch' : '')
          ),
          gallery.length > 0 && e('button', { onClick: downloadAll, 'aria-label': 'Download all ' + gallery.length + ' symbols', style: S.btn('#f3f4f6', '#374151', false) }, '⬇️ Download All (' + gallery.length + ')'),
          gallery.length > 0 && e('button', { onClick: clearGallery, 'aria-label': 'Clear all symbols from gallery', style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️ Clear All')
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
                e('button', { onClick: function () { regenSymbol(selectedItem.id); }, disabled: !!symLoading[selectedItem.id], 'aria-label': 'Regenerate symbol for ' + selectedItem.label, style: S.btn(LIGHT_PURPLE, PURPLE, !!symLoading[selectedItem.id]) }, '🔄 Regen'),
                e('button', { onClick: function () { refineSymbol(selectedItem.id, 'Remove all text, labels, letters, and words from the image. Keep the illustration clean.'); }, disabled: !!symLoading[selectedItem.id], 'aria-label': 'Remove text from ' + selectedItem.label + ' symbol', style: S.btn('#fee2e2', '#b91c1c', !!symLoading[selectedItem.id]) }, '🚫 Remove Text'),
                e('button', { onClick: function () { speakCell(selectedItem.label); }, 'aria-label': 'Speak ' + selectedItem.label, style: S.btn('#dcfce7', '#166534', false) }, '🔊 Speak'),
                e('button', { onClick: function () { downloadSym(selectedItem); }, 'aria-label': 'Download ' + selectedItem.label + ' as PNG', style: S.btn('#dbeafe', '#1e40af', false) }, '⬇️ PNG'),
                e('button', { onClick: function () { deleteSymbol(selectedItem.id); }, 'aria-label': 'Delete ' + selectedItem.label + ' symbol', style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️')
              ),
              e('div', { style: { display: 'flex', gap: '6px' } },
                e('input', { type: 'text', value: symRefine[selectedItem.id] || '', onChange: function (ev) { var v = ev.target.value; setSymRefine(function (p) { var n = Object.assign({}, p); n[selectedItem.id] = v; return n; }); }, onKeyDown: function (ev) { if (ev.key === 'Enter' && symRefine[selectedItem.id]) refineSymbol(selectedItem.id, symRefine[selectedItem.id]); }, placeholder: 'Edit: make it a girl, add red X, change background...', 'aria-label': 'Refinement instruction for ' + selectedItem.label, style: Object.assign({}, S.input, { border: '1px solid #fbbf24' }) }),
                e('button', { onClick: function () { if (symRefine[selectedItem.id]) refineSymbol(selectedItem.id, symRefine[selectedItem.id]); }, disabled: !symRefine[selectedItem.id] || !!symLoading[selectedItem.id], 'aria-label': 'Apply refinement to ' + selectedItem.label, style: S.btn('#fef3c7', '#92400e', !symRefine[selectedItem.id] || !!symLoading[selectedItem.id]) }, '✏️')
              )
            )
          ),
          // Gallery grid
          e('div', { style: { flex: 1, overflowY: 'auto' } },
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                e('span', { style: { fontWeight: 600, fontSize: '12px', color: '#374151' } }, 'Gallery (' + filtered.length + (filtered.length !== gallery.length ? '/' + gallery.length : '') + ')'),
                e('input', { type: 'text', value: symFilter, onChange: function (ev) { setSymFilter(ev.target.value); }, placeholder: '🔍 Search symbols…', 'aria-label': 'Search symbols in gallery', style: { border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', flex: 1 } }),
                e('button', { onClick: function () { setSymShowFavs(!symShowFavs); }, 'aria-label': symShowFavs ? 'Show all symbols' : 'Show favorite symbols only', style: { padding: '3px 8px', border: '1px solid ' + (symShowFavs ? PURPLE : '#e5e7eb'), borderRadius: '12px', background: symShowFavs ? LIGHT_PURPLE : '#fff', color: symShowFavs ? PURPLE : '#6b7280', fontSize: '11px', cursor: 'pointer', fontWeight: symShowFavs ? 700 : 400, flexShrink: 0 } }, '⭐')
              ),
              e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                [['', 'All'], ['noun', 'Nouns'], ['verb', 'Verbs'], ['adjective', 'Adjectives'], ['other', 'Other']].map(function (pair) {
                  var cat = pair[0]; var lbl = pair[1];
                  var active = symCatFilter === cat;
                  return e('button', {
                    key: cat,
                    onClick: function () { setSymCatFilter(cat); },
                    style: { padding: '2px 8px', border: '1px solid ' + (active ? PURPLE : '#e5e7eb'), borderRadius: '10px', background: active ? LIGHT_PURPLE : '#f9fafb', color: active ? PURPLE : '#6b7280', fontSize: '10px', cursor: 'pointer', fontWeight: active ? 700 : 400 }
                  }, lbl);
                })
              )
            ),
            filtered.length > 0
              ? e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '7px' } },
                  filtered.map(function (item) {
                    return e('div', {
                      key: item.id,
                      onClick: function () { setSelectedId(item.id); },
                      onKeyDown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelectedId(item.id); } },
                      tabIndex: 0,
                      role: 'button',
                      'aria-label': 'Select symbol: ' + item.label + (item.isFavorite ? ' (favorite)' : ''),
                      'aria-pressed': item.id === selectedId ? 'true' : 'false',
                      style: { cursor: 'pointer', borderRadius: '8px', border: item.id === selectedId ? '2px solid ' + PURPLE : '2px solid #e5e7eb', background: item.id === selectedId ? LIGHT_PURPLE : '#fafafa', padding: '7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'border-color 0.15s', position: 'relative' } },
                      symLoading[item.id]
                        ? e('div', { style: { width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '6px' } }, spinner(20))
                        : e('img', { src: item.image, alt: item.label, style: { width: 72, height: 72, objectFit: 'contain', borderRadius: '6px', background: '#fff' } }),
                      e('span', { style: { fontSize: '10px', color: '#4b5563', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3 } }, item.label),
                      e('button', { onClick: function (ev) { ev.stopPropagation(); toggleFavorite(item.id); }, 'aria-label': (item.isFavorite ? 'Remove ' : 'Add ') + item.label + (item.isFavorite ? ' from favorites' : ' to favorites'), style: { position: 'absolute', top: 3, right: 3, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: item.isFavorite ? 1 : 0.3, padding: '1px' }, title: item.isFavorite ? 'Remove from favorites' : 'Add to favorites' }, '⭐')
                    );
                  })
                )
              : e('div', { style: { textAlign: 'center', color: '#6b7280', padding: '30px 0', fontSize: '13px' } }, gallery.length === 0 ? 'Generate your first symbol using the panel on the left.' : (symShowFavs ? 'No favorite symbols yet — click ⭐ on any card.' : 'No symbols match "' + symFilter + '"'))
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
            e('input', { type: 'text', value: boardTopic, onChange: function (ev) { setBoardTopic(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') generateBoardFromTopic(); }, placeholder: 'e.g. morning routine, feelings, playground', 'aria-label': 'Board topic', style: S.input, autoFocus: true })
          ),
          e('button', { onClick: generateBoardFromTopic, disabled: !boardTopic.trim() || boardGenerating, style: S.btn(PURPLE, '#fff', !boardTopic.trim() || boardGenerating) }, boardGenerating ? '⏳ Writing...' : '📝 Generate Word List'),
          boardWords.length > 0 && e('button', { onClick: generateBoardImages, disabled: isLoading, style: S.btn('#059669', '#fff', isLoading) }, isLoading ? '⏳ Generating...' : '✨ Generate Images'),
          boardWords.length > 0 && e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Cols:'),
            e('input', { type: 'number', min: 2, max: 8, value: boardCols, onChange: function (ev) { setBoardCols(Number(ev.target.value)); }, 'aria-label': 'Board columns', style: { width: '52px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '13px' } })
          ),
          boardWords.length > 0 && e('label', { style: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: '#374151' } },
            e('input', { type: 'checkbox', checked: boardColor, onChange: function (ev) { setBoardColor(ev.target.checked); }, 'aria-label': 'Enable color coding' }),
            'Color coding'
          ),
          // Theme selector
          e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' } },
            e('span', { style: { fontSize: '10px', color: '#9ca3af', fontWeight: 600 } }, 'Theme:'),
            Object.values(BOARD_THEMES).map(function (t) {
              var active = boardTheme === t.id;
              return e('button', {
                key: t.id,
                onClick: function () { setBoardTheme(t.id); store(STORAGE_BOARD_THEME, t.id); },
                style: { fontSize: '10px', padding: '3px 8px', borderRadius: '5px', border: active ? '2px solid ' + PURPLE : '1px solid #d1d5db', background: active ? LIGHT_PURPLE : '#f9fafb', color: active ? PURPLE : '#374151', fontWeight: active ? 700 : 400, cursor: 'pointer' }
              }, t.label);
            })
          ),
          // Language selector for multilingual boards
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
            e('span', { style: { fontSize: '10px', color: '#9ca3af', fontWeight: 600 } }, '🌐'),
            e('select', {
              value: boardLang,
              onChange: function (ev) {
                var lang = ev.target.value;
                setBoardLang(lang); store(STORAGE_BOARD_LANG, lang);
                if (lang !== 'en' && boardWords.length > 0) {
                  translateBoardLabels(boardWords, lang).then(function (translated) { setBoardWords(translated); });
                } else if (lang === 'en' && boardWords.length > 0) {
                  setBoardWords(function (prev) { return prev.map(function (w) { return w.originalLabel ? Object.assign({}, w, { label: w.originalLabel, translatedLabel: undefined, originalLabel: undefined }) : w; }); });
                }
              },
              'aria-label': 'Board language',
              style: { fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 6px', background: '#fff', cursor: 'pointer' }
            },
              LANG_OPTIONS.map(function (l) { return e('option', { key: l.code, value: l.code }, l.label); })
            ),
            translating && e('span', { style: { fontSize: '10px', color: PURPLE } }, '⏳')
          ),
          e('button', { onClick: function () { setShowSentencePanel(!showSentencePanel); if (!showSentencePanel) { setSentenceMapping([]); setSentenceInput(''); } }, style: S.btn(showSentencePanel ? LIGHT_PURPLE : '#f3f4f6', showSentencePanel ? PURPLE : '#374151', false), title: 'Type a sentence and let AI map each word to an AAC symbol' }, '🔤 From Sentence'),
          e('button', { onClick: function () { setShowGalleryPicker(!showGalleryPicker); }, style: S.btn(showGalleryPicker ? LIGHT_PURPLE : '#f3f4f6', showGalleryPicker ? PURPLE : '#374151', false), title: 'Add a symbol from your gallery directly to the board' }, '🖼️ From Gallery'),
          boardWords.length > 0 && !boardPages && e('button', {
            onClick: enablePages,
            title: 'Enable multi-page mode — add linked pages to this board',
            style: S.btn('#fef9c3', '#92400e', false)
          }, '📄 + Pages'),
          boardPages && e('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', padding: '3px 8px' } },
            e('span', { style: { fontSize: '11px', color: '#92400e', fontWeight: 700 } }, '📄 Pages:'),
            boardPages.map(function (pg, pi) {
              var active = pi === activePageIdx;
              return e('button', {
                key: pg.id,
                draggable: true,
                onDragStart: function (ev) { ev.dataTransfer.setData('text/plain', String(pi)); ev.dataTransfer.effectAllowed = 'move'; },
                onDragOver: function (ev) { ev.preventDefault(); ev.currentTarget.style.borderColor = PURPLE; },
                onDragLeave: function (ev) { ev.currentTarget.style.borderColor = active ? '#92400e' : '#fde68a'; },
                onDrop: function (ev) {
                  ev.preventDefault();
                  ev.currentTarget.style.borderColor = active ? '#92400e' : '#fde68a';
                  var fromIdx = parseInt(ev.dataTransfer.getData('text/plain'), 10);
                  if (isNaN(fromIdx) || fromIdx === pi) return;
                  setBoardPages(function (prev) {
                    var flushed = commitCurrentPage(prev, activePageIdx, boardWords, boardCols, null);
                    var arr = flushed.slice();
                    var moved = arr.splice(fromIdx, 1)[0];
                    arr.splice(pi, 0, moved);
                    // Update activePageIdx to follow the current page
                    var newActive = activePageIdx === fromIdx ? pi : (activePageIdx > fromIdx && activePageIdx <= pi ? activePageIdx - 1 : (activePageIdx < fromIdx && activePageIdx >= pi ? activePageIdx + 1 : activePageIdx));
                    setActivePageIdx(newActive);
                    return arr;
                  });
                },
                onClick: function () { if (!active) switchPage(pi); },
                style: { padding: '2px 8px', border: '2px solid ' + (active ? '#92400e' : '#fde68a'), borderRadius: '6px', background: active ? '#92400e' : 'transparent', color: active ? '#fff' : '#92400e', fontSize: '10px', fontWeight: active ? 700 : 400, cursor: 'grab', transition: 'border-color 0.15s' },
                title: 'Drag to reorder pages'
              }, pg.title || ('Page ' + (pi + 1)));
            }),
            e('button', { onClick: addPage, title: 'Add a new page', style: { background: 'none', border: '1px dashed #92400e', borderRadius: '6px', padding: '2px 7px', color: '#92400e', fontSize: '11px', cursor: 'pointer' } }, '+'),
            boardPages.length > 1 && e('button', { onClick: function () { deletePage(activePageIdx); }, title: 'Delete current page', style: { background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', cursor: 'pointer', padding: '0 2px' } }, '✕')
          ),
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
                      onClick: function () { setUseBoardId(b.id); setStrip([]); setShowCommLog(false); setUsePageIdx(0); setPredictions([]); },
                      title: 'Use this board — tap symbols to speak and build messages',
                      style: S.btn('#eff6ff', '#1d4ed8', false)
                    }, '\u25b6 Use'),
                    b.words && b.words.some(function (w) { return w.image; }) && e('button', {
                      onClick: function () { setScanBoardId(b.id); setScanIndex(0); setScanPaused(false); },
                      title: 'Partner-assisted single-switch scanning mode',
                      style: S.btn('#ecfdf5', '#065f46', false)
                    }, '\u267f Scan'),
                    e('button', { onClick: function () { exportBoard(b); }, title: 'Export this board as a .json file', style: S.btn('#f3f4f6', '#374151', false) }, '⬇️'),
                    b.words && b.words.some(function (w) { return w.image; }) && e('button', { onClick: function () { exportBoardHTML(b); }, title: 'Export standalone HTML board — opens in any browser without AlloFlow', style: S.btn('#fef9c3', '#92400e', false) }, '🌐'),
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
            e('input', { type: 'text', value: gpFilter, onChange: function (ev) { setGpFilter(ev.target.value); }, placeholder: 'Filter\u2026', 'aria-label': 'Filter gallery symbols', style: { border: '1px solid #d8b4fe', borderRadius: '5px', padding: '3px 7px', fontSize: '11px', marginLeft: 'auto', width: '80px' } })
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
        // ── Sentence-to-symbols panel ──
        showSentencePanel && e('div', { style: { flexShrink: 0, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            e('span', { style: { fontSize: '12px', fontWeight: 700, color: '#065f46' } }, '🔤 Text → Symbols'),
            e('span', { style: { fontSize: '11px', color: '#6b7280' } }, 'Type a sentence and AI will map each word to an AAC symbol')
          ),
          e('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-end' } },
            e('input', {
              type: 'text',
              value: sentenceInput,
              onChange: function (ev) { setSentenceInput(ev.target.value); },
              onKeyDown: function (ev) { if (ev.key === 'Enter') parseTextToSymbols(); },
              placeholder: 'e.g. I want to go to the park today',
              'aria-label': 'Sentence to map to symbols',
              style: Object.assign({}, S.input, { flex: 1, borderColor: '#86efac' })
            }),
            e('button', { onClick: parseTextToSymbols, disabled: !sentenceInput.trim() || sentenceParsing || !onCallGemini, style: S.btn('#059669', '#fff', !sentenceInput.trim() || sentenceParsing || !onCallGemini) },
              sentenceParsing ? '⏳ Mapping…' : '🤖 Map Symbols'
            )
          ),
          sentenceMapping.length > 0 && e('div', null,
            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#065f46', marginBottom: '6px' } },
              'Review mapping — uncheck words to skip, then click Add to Board:'
            ),
            e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' } },
              sentenceMapping.map(function (m, mi) {
                var bg = m.skip ? '#f9fafb' : (m.galleryMatch ? '#dcfce7' : '#fef9c3');
                var border = m.skip ? '#e5e7eb' : (m.galleryMatch ? '#86efac' : '#fde68a');
                return e('div', {
                  key: m.id,
                  style: { border: '1px solid ' + border, borderRadius: '8px', padding: '6px 10px', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px', opacity: m.skip ? 0.45 : 1 }
                },
                  m.galleryMatch && m.galleryMatch.image && e('img', { src: m.galleryMatch.image, style: { width: 36, height: 36, objectFit: 'contain', borderRadius: '5px' } }),
                  !m.galleryMatch && !m.skip && e('div', { style: { width: 36, height: 36, borderRadius: '5px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' } }, '✨'),
                  e('span', { style: { fontSize: '11px', fontWeight: 700, color: '#1f2937', textAlign: 'center' } }, m.label || m.word),
                  e('span', { style: { fontSize: '9px', color: '#6b7280' } }, m.galleryMatch ? '✓ gallery' : (m.skip ? 'skipped' : 'needs gen')),
                  !m.skip && e('label', { style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', color: '#374151' } },
                    e('input', {
                      type: 'checkbox',
                      checked: !!m.selected,
                      onChange: function (ev) {
                        setSentenceMapping(function (prev) {
                          return prev.map(function (item, ii) { return ii === mi ? Object.assign({}, item, { selected: ev.target.checked }) : item; });
                        });
                      }
                    }),
                    'include'
                  )
                );
              })
            ),
            e('div', { style: { display: 'flex', gap: '8px' } },
              e('button', {
                onClick: applySentenceMapping,
                disabled: !sentenceMapping.some(function (m) { return m.selected && !m.skip; }),
                style: S.btn('#059669', '#fff', !sentenceMapping.some(function (m) { return m.selected && !m.skip; }))
              }, '✅ Add to Board (' + sentenceMapping.filter(function (m) { return m.selected && !m.skip; }).length + ')'),
              e('button', { onClick: function () { setSentenceMapping([]); setSentenceInput(''); }, style: S.btn('#f3f4f6', '#374151', false) }, '↩ Reset')
            )
          )
        ),
        // Print settings panel
        showPrintSettings && e('div', { style: { flexShrink: 0, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
          e('span', { style: { fontSize: '12px', fontWeight: 600, color: '#1e40af' } }, 'Print Settings'),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Cell size:'),
            e('select', { value: boardCellSz, onChange: function (ev) { setBoardCellSz(ev.target.value); }, 'aria-label': 'Cell size', style: { border: '1px solid #93c5fd', borderRadius: '5px', padding: '4px 8px', fontSize: '12px' } },
              e('option', { value: 'small' }, 'Small (1.5\u2033)'),
              e('option', { value: 'medium' }, 'Medium (2\u2033)'),
              e('option', { value: 'large' }, 'Large (2.5\u2033)')
            )
          ),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Label:'),
            e('select', { value: boardTextPos, onChange: function (ev) { setBoardTextPos(ev.target.value); }, 'aria-label': 'Label position', style: { border: '1px solid #93c5fd', borderRadius: '5px', padding: '4px 8px', fontSize: '12px' } },
              e('option', { value: 'below' }, 'Below image'),
              e('option', { value: 'above' }, 'Above image'),
              e('option', { value: 'none' }, 'Hidden (image only)')
            )
          ),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            e('label', { style: Object.assign({}, S.lbl, { margin: 0 }) }, 'Text size:'),
            e('input', { type: 'number', min: 8, max: 18, value: boardTextSize, onChange: function (ev) { setBoardTextSize(Number(ev.target.value)); }, 'aria-label': 'Text size', style: { width: '50px', border: '1px solid #93c5fd', borderRadius: '5px', padding: '4px 7px', fontSize: '12px' } })
          ),
          e('button', { onClick: printBoardSized, style: S.btn('#1e40af', '#fff', false) }, '\uD83D\uDDB6 Print Now')
        ),
        // Board title
        boardWords.length > 0 && e('input', { type: 'text', value: boardTitle, onChange: function (ev) { setBoardTitle(ev.target.value); }, placeholder: 'Board title (optional)', 'aria-label': 'Board title', style: Object.assign({}, S.input, { fontWeight: 700, fontSize: '15px', maxWidth: '400px' }) }),
        // Board grid (also serves as print area)
        boardWords.length > 0
          ? e('div', { id: 'ss-pb', style: { flex: 1, overflowY: 'auto', background: theme.gridBg, padding: '8px', borderRadius: '8px', transition: 'background 0.2s' } },
              boardTitle && e('h2', { style: { fontWeight: 800, fontSize: '18px', color: theme.textColor, margin: '0 0 10px' } }, boardTitle),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + boardCols + ', 1fr)', gap: '8px' } },
                boardWords.map(function (word) {
                  var bg = theme.cellBg || (boardColor ? (catFill[word.category] || '#f9fafb') : '#fff');
                  var isDragTarget = dragOverBoardId === word.id && dragBoardId !== word.id;
                  var baseBorder = theme.borderOverride || (boardColor ? (catBorder[word.category] || '#e5e7eb') : '#e5e7eb');
                  var border = isDragTarget ? '2px dashed ' + PURPLE : '2px solid ' + baseBorder;
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
                    boardTextPos === 'above' && e('span', { style: { fontSize: boardTextSize + 'px', fontWeight: 700, color: theme.textColor, textAlign: 'center', lineHeight: 1.3 } },
                      word.translatedLabel || word.label,
                      word.translatedLabel && word.originalLabel && e('span', { style: { display: 'block', fontSize: Math.max(9, boardTextSize - 3) + 'px', fontWeight: 400, color: '#9ca3af' } }, word.originalLabel)
                    ),
                    // Image
                    boardLoading[word.id]
                      ? e('div', { style: { width: imgSz, height: imgSz, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, spinner(24))
                      : word.image
                        ? e('img', { src: word.image, alt: word.label, style: { width: imgSz, height: imgSz, objectFit: 'contain', borderRadius: '6px', background: '#fff' } })
                        : e('div', { style: { width: imgSz, height: imgSz, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '6px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '4px' } }, 'Click \u2728'),
                    // Label below image (default)
                    boardTextPos === 'below' && e('span', { style: { fontSize: boardTextSize + 'px', fontWeight: 700, color: theme.textColor, textAlign: 'center', lineHeight: 1.3 } },
                      word.translatedLabel || word.label,
                      word.translatedLabel && word.originalLabel && e('span', { style: { display: 'block', fontSize: Math.max(9, boardTextSize - 3) + 'px', fontWeight: 400, color: '#9ca3af' } }, word.originalLabel)
                    ),
                    // Regen button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); regenBoardCell(word.id); }, style: { position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px' } }, '\uD83D\uDD04'),
                    // Record audio button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); recordCellAudio(word.id); }, style: { position: 'absolute', top: 4, left: 4, background: cellRecording === word.id ? 'rgba(220,38,38,0.8)' : (word.audioData ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.1)'), border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px', color: cellRecording === word.id ? '#fff' : undefined } }, cellRecording === word.id ? '⏹' : (word.audioData ? '🎙️' : '🎤')),
                    // Play custom audio button
                    word.audioData && e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); playCellAudio(word.audioData); }, style: { position: 'absolute', bottom: 4, left: 4, background: 'rgba(37,99,235,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px' } }, '🔊'),
                    // Remove button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); setBoardWords(function (prev) { return prev.filter(function (w) { return w.id !== word.id; }); }); }, style: { position: 'absolute', bottom: 4, right: 4, background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px', color: '#dc2626' } }, '\u00d7')
                  );
                })
              ),
              boardColor && e('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' } },
                e('span', { style: { fontSize: '10px', color: '#9ca3af', fontWeight: 600 } }, 'Colors:'),
                [['noun', 'Noun'], ['verb', 'Verb'], ['adjective', 'Adj'], ['other', 'Other']].map(function (pair) {
                  return e('label', { key: pair[0], style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#374151', cursor: 'pointer', userSelect: 'none' } },
                    e('input', {
                      type: 'color', value: catFill[pair[0]] || '#f9fafb',
                      onChange: function (ev) { var v = ev.target.value; setCatFill(function (prev) { var n = Object.assign({}, prev); n[pair[0]] = v; store(STORAGE_CAT_COLORS + '_fill', n); return n; }); },
                      title: 'Click to change ' + pair[1] + ' fill color',
                      style: { width: 18, height: 18, padding: 0, border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }
                    }),
                    pair[1]
                  );
                }),
                e('button', {
                  onClick: function () { setCatFill(CAT_COLORS); setCatBorder(CAT_BORDER); store(STORAGE_CAT_COLORS + '_fill', CAT_COLORS); store(STORAGE_CAT_COLORS + '_border', CAT_BORDER); },
                  style: { fontSize: '10px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }
                }, 'Reset')
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
            e('textarea', { value: schedInput, onChange: function (ev) { setSchedInput(ev.target.value); }, placeholder: 'brush teeth\nget dressed\neat breakfast\nboard the bus\narrive at school', 'aria-label': 'Schedule activities, one per line', style: Object.assign({}, S.textarea, { height: '70px' }) })
          ),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            e('div', null,
              e('label', { style: S.lbl }, 'Layout'),
              e('select', { value: schedOrientation, onChange: function (ev) { setSchedOrientation(ev.target.value); }, 'aria-label': 'Schedule layout', style: Object.assign({}, S.input, { width: 'auto' }) },
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
        schedItems.length > 0 && e('input', { type: 'text', value: schedTitle, onChange: function (ev) { setSchedTitle(ev.target.value); }, placeholder: 'Schedule title, e.g. Marcus\'s Morning Routine', 'aria-label': 'Schedule title', style: Object.assign({}, S.input, { fontWeight: 700, fontSize: '14px', maxWidth: '400px' }) }),
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
            e('input', { type: 'text', value: storyStudentName, onChange: function (ev) { setStoryStudentName(ev.target.value); }, placeholder: 'e.g. Marcus', 'aria-label': 'Student name for social story', style: S.input })
          ),
          e('div', null,
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' } },
              e('label', { style: S.lbl }, 'Situation / Goal'),
              e('span', { style: { fontSize: '10px', color: '#9ca3af' } }, 'or pick a template ↓')
            ),
            e('textarea', { value: storySituation, onChange: function (ev) { setStorySituation(ev.target.value); }, placeholder: 'e.g. Marcus is learning to wait his turn during group time', 'aria-label': 'Social story situation or goal', style: Object.assign({}, S.textarea, { height: '65px' }) }),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' } },
              STORY_TEMPLATES.concat(customTemplates).map(function (t, i) {
                var isCustom = i >= STORY_TEMPLATES.length;
                return e('button', {
                  key: t.label + i,
                  onClick: function () { setStorySituation(t.situation); setStoryDetails(t.details); },
                  style: { padding: '3px 8px', background: isCustom ? '#fef3c7' : '#f3f4f6', border: '1px solid ' + (isCustom ? '#f59e0b' : '#e5e7eb'), borderRadius: '12px', fontSize: '10px', cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap', transition: 'background 0.1s', position: 'relative' },
                  onMouseOver: function (ev) { ev.currentTarget.style.background = LIGHT_PURPLE; ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.color = PURPLE; },
                  onMouseOut: function (ev) { ev.currentTarget.style.background = isCustom ? '#fef3c7' : '#f3f4f6'; ev.currentTarget.style.borderColor = isCustom ? '#f59e0b' : '#e5e7eb'; ev.currentTarget.style.color = '#374151'; }
                }, (isCustom ? '⭐ ' : '') + t.label);
              }),
              storySituation.trim() && e('button', {
                onClick: function () {
                  var lbl = window.prompt('Template name:', storySituation.slice(0, 40));
                  if (!lbl) return;
                  var tmpl = { label: lbl, situation: storySituation, details: storyDetails };
                  var updated = customTemplates.concat([tmpl]);
                  setCustomTemplates(updated); store(STORAGE_CUSTOM_TEMPLATES, updated);
                  if (addToast) addToast('⭐ Template "' + lbl + '" saved!', 'success');
                },
                style: { padding: '3px 8px', background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', color: '#166534', whiteSpace: 'nowrap', fontWeight: 700 }
              }, '💾 Save as Template')
            )
          ),
          e('div', null,
            e('label', { style: S.lbl }, 'Additional context (optional)'),
            e('textarea', { value: storyDetails, onChange: function (ev) { setStoryDetails(ev.target.value); }, placeholder: 'e.g. Marcus is 7, has autism, loves trains', 'aria-label': 'Additional context for social story', style: Object.assign({}, S.textarea, { height: '55px' }) })
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
            e('input', { type: 'text', value: newBookTitle, onChange: function (ev) { setNewBookTitle(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') createBook(); }, placeholder: 'e.g. Marcus \u2014 School Day Boards', 'aria-label': 'New activity set name', style: S.input })
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
                        'aria-label': 'Assign student profile to activity set',
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

    // ── Direct-use AAC overlay ────────────────────────────────────────────
    if (useBoardId) {
      var useBoard = savedBoards.find(function (b) { return b.id === useBoardId; });
      var usePages = useBoard && useBoard.pages && useBoard.pages.length > 1 ? useBoard.pages : null;
      var safeUsePageIdx = usePages ? Math.min(usePageIdx, usePages.length - 1) : 0;
      var usePageData = usePages ? usePages[safeUsePageIdx] : useBoard;
      var useCells = usePageData ? (usePageData.words || []).filter(function (w) { return w.image; }) : [];
      var exitUse = function () {
        // Persist session to usage log before clearing
        if (commLog.length > 0) {
          var pid = activeProfileId || '__global__';
          var session = {
            date: new Date().toISOString(),
            boardId: useBoardId,
            boardTitle: useBoard ? (useBoard.title || 'Board') : 'Board',
            entries: commLog.map(function (e) { return { label: e.label, ts: e.ts }; })
          };
          setUsageLog(function (prev) {
            var profLog = prev[pid] || { sessions: [] };
            var updated = Object.assign({}, prev, {
              [pid]: { sessions: profLog.sessions.concat([session]) }
            });
            store(STORAGE_USAGE, updated);
            return updated;
          });
        }
        setUseBoardId(null); setStrip([]); setShowCommLog(false); setPredictions([]);
      };
      var speakWordFn = function (label, audioData) {
        // Play custom recorded audio if available
        if (audioData) { var a = new Audio(audioData); a.play().catch(function () {}); return; }
        if (onCallTTS) {
          var voice = selectedVoice || 'Kore';
          onCallTTS(label, voice).then(function (url) {
            if (url) { var a = new Audio(url); a.play().catch(function () {}); }
            else if (window.speechSynthesis) { var u = new window.SpeechSynthesisUtterance(label); applyVoice(u); window.speechSynthesis.speak(u); }
          }).catch(function () {
            if (window.speechSynthesis) { var u = new window.SpeechSynthesisUtterance(label); applyVoice(u); window.speechSynthesis.speak(u); }
          });
        } else if (window.speechSynthesis) {
          var u = new window.SpeechSynthesisUtterance(label); applyVoice(u); window.speechSynthesis.speak(u);
        }
      };
      var speakPhraseFn = function (words) {
        var phrase = words.map(function (w) { return w.label; }).join(' ');
        if (!phrase) return;
        setStripSpeaking(true);
        var done = function () { setStripSpeaking(false); };
        if (onCallTTS) {
          var voice = selectedVoice || 'Kore';
          onCallTTS(phrase, voice).then(function (url) {
            if (url) { var a = new Audio(url); a.onended = done; a.play().catch(done); }
            else { done(); }
          }).catch(done);
        } else if (window.speechSynthesis) {
          var utt = new window.SpeechSynthesisUtterance(phrase);
          applyVoice(utt);
          utt.onend = done; utt.onerror = done;
          window.speechSynthesis.speak(utt);
        } else { done(); }
      };
      var tapCell = function (cell) {
        var boardTitle = useBoard ? (useBoard.title || 'Board') : 'Board';
        var newStrip = strip.concat([{ label: cell.label, image: cell.image }]);
        setStrip(newStrip);
        setCommLog(function (log) { return log.concat([{ label: cell.label, image: cell.image, boardTitle: boardTitle, ts: new Date().toISOString() }]); });
        speakWordFn(cell.label, cell.audioData);
        // IEP: record expressive communication trial
        var expressiveGoal = activeGoals.find(function (g) { return g.type === 'expressive' && g.currentCount < g.targetCount; });
        if (expressiveGoal) recordIepTrial(expressiveGoal.id, true, 'aac:' + cell.label);
        // Debounced word prediction
        if (predTimerRef.current) clearTimeout(predTimerRef.current);
        predTimerRef.current = setTimeout(function () {
          var availableLabels = useCells.map(function (c) { return c.label; });
          fetchPredictions(newStrip, availableLabels);
        }, 700);
      };
      var exportLog = function () {
        var rows = ['Time,Word,Board'];
        commLog.forEach(function (en) {
          var t = new Date(en.ts);
          rows.push('"' + t.toLocaleTimeString() + '","' + en.label.replace(/"/g, '""') + '","' + (en.boardTitle || '').replace(/"/g, '""') + '"');
        });
        var blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'comm_log_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      };
      var useCols = Math.min(usePageData ? (usePageData.cols || useBoard.cols || 4) : 4, useCells.length || 1);
      return e('div', { style: { position: 'fixed', inset: 0, zIndex: 9999, background: '#0f172a', display: 'flex', flexDirection: 'column' } },
        // ── Header ──
        e('div', { style: { background: '#1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 } },
          e('span', { style: { color: '#a78bfa', fontSize: '18px' } }, '▶'),
          e('span', { style: { color: '#fff', fontWeight: 800, fontSize: '15px', marginRight: 'auto' } }, useBoard ? (useBoard.title || 'Communication Board') : 'Communication Board'),
          e('button', {
            onClick: function () { setShowCommLog(function (v) { return !v; }); },
            style: { background: showCommLog ? '#7c3aed' : '#334155', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
          }, '📋 Log (' + commLog.length + ')'),
          e('button', { onClick: exitUse, style: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' } }, '✕ Exit')
        ),
        // ── Page tabs (multi-page boards) ──
        usePages && e('div', { style: { background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '6px 16px', display: 'flex', gap: '6px', flexShrink: 0, overflowX: 'auto' } },
          usePages.map(function (pg, pi) {
            var active = pi === safeUsePageIdx;
            return e('button', {
              key: pg.id,
              onClick: function () { setUsePageIdx(pi); setPredictions([]); },
              style: { padding: '5px 14px', border: 'none', borderRadius: '7px', background: active ? '#4f46e5' : '#1e293b', color: active ? '#fff' : '#94a3b8', fontWeight: active ? 700 : 400, fontSize: '12px', cursor: active ? 'default' : 'pointer', flexShrink: 0 }
            }, pg.title || ('Page ' + (pi + 1)));
          })
        ),
        // ── Sentence strip ──
        e('div', { style: { background: '#1a1a2e', borderBottom: '2px solid #312e81', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, minHeight: '58px', flexWrap: 'wrap' } },
          strip.length === 0
            ? e('span', { style: { color: '#475569', fontSize: '14px', fontStyle: 'italic' } }, 'Tap symbols below to build a message\u2026')
            : strip.map(function (w, i) {
                return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '4px', background: '#312e81', borderRadius: '8px', padding: '4px 10px' } },
                  w.image && e('img', { src: w.image, style: { width: '26px', height: '26px', objectFit: 'contain', borderRadius: '4px' } }),
                  e('span', { style: { color: '#e0e7ff', fontWeight: 700, fontSize: '13px' } }, w.label)
                );
              }),
          e('div', { style: { marginLeft: 'auto', display: 'flex', gap: '6px', flexShrink: 0 } },
            strip.length > 0 && e('button', {
              onClick: function () { speakPhraseFn(strip); },
              disabled: stripSpeaking,
              style: { background: stripSpeaking ? '#6b7280' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
            }, stripSpeaking ? '\u2026' : '\uD83D\uDD0A Speak'),
            strip.length > 0 && e('button', {
              onClick: function () { setStrip(function (s) { return s.slice(0, -1); }); },
              style: { background: '#374151', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
            }, '\u2190 Del'),
            strip.length > 0 && e('button', {
              onClick: function () { setStrip([]); },
              style: { background: '#374151', color: '#cbd5e1', border: 'none', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }
            }, '\uD83D\uDDD1')
          )
        ),
        // ── Word prediction chips ──
        (predictions.length > 0 || predLoading) && e('div', { style: { background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
          e('span', { style: { color: '#64748b', fontSize: '11px', fontWeight: 600, flexShrink: 0 } }, predLoading ? '🤖 Predicting…' : '💡 Next:'),
          predictions.map(function (pred, pi) {
            var matchCell = useCells.find(function (c) { return c.label.toLowerCase() === pred.toLowerCase(); });
            return e('button', {
              key: pi,
              onClick: function () { if (matchCell) tapCell(matchCell); else tapCell({ label: pred, image: null }); },
              style: { display: 'flex', alignItems: 'center', gap: '5px', background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', padding: '4px 10px', cursor: 'pointer', color: '#e2e8f0', fontSize: '12px', fontWeight: 600, transition: 'background 0.1s' },
              onMouseOver: function (ev) { ev.currentTarget.style.background = '#312e81'; ev.currentTarget.style.borderColor = '#4f46e5'; },
              onMouseOut: function (ev) { ev.currentTarget.style.background = '#1e293b'; ev.currentTarget.style.borderColor = '#334155'; }
            },
              matchCell && matchCell.image && e('img', { src: matchCell.image, style: { width: '20px', height: '20px', objectFit: 'contain', borderRadius: '3px' } }),
              pred
            );
          })
        ),
        // ── Body: cells + optional log panel ──
        e('div', { style: { flex: 1, display: 'flex', overflow: 'hidden' } },
          // Cell grid
          e('div', { style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(' + useCols + ', 1fr)', gap: '14px', padding: '18px', overflowY: 'auto', alignContent: 'start' } },
            useCells.length === 0
              ? e('p', { style: { color: '#475569', gridColumn: '1/-1', textAlign: 'center', paddingTop: '40px' } }, 'No generated symbols yet — go to Board Builder and generate images first.')
              : useCells.map(function (cell, idx) {
                  return e('div', {
                    key: cell.id || idx,
                    onClick: function () { tapCell(cell); },
                    style: { border: '3px solid #334155', borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#1e293b', cursor: 'pointer', transition: 'transform 0.1s, background 0.1s', userSelect: 'none' },
                    onMouseDown: function (ev) { ev.currentTarget.style.transform = 'scale(0.93)'; ev.currentTarget.style.background = '#293548'; },
                    onMouseUp: function (ev) { ev.currentTarget.style.transform = 'scale(1)'; ev.currentTarget.style.background = '#1e293b'; },
                    onMouseLeave: function (ev) { ev.currentTarget.style.transform = 'scale(1)'; ev.currentTarget.style.background = '#1e293b'; },
                    onTouchStart: function (ev) { ev.currentTarget.style.transform = 'scale(0.93)'; ev.currentTarget.style.background = '#293548'; },
                    onTouchEnd: function (ev) { ev.currentTarget.style.transform = 'scale(1)'; ev.currentTarget.style.background = '#1e293b'; tapCell(cell); ev.preventDefault(); },
                  },
                    e('img', { src: cell.image, alt: cell.label, style: { width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', pointerEvents: 'none' } }),
                    e('span', { style: { color: '#e2e8f0', fontWeight: 700, fontSize: '14px', textAlign: 'center', lineHeight: 1.3, pointerEvents: 'none' } },
                      cell.translatedLabel || cell.label,
                      cell.translatedLabel && cell.originalLabel && e('span', { style: { display: 'block', fontSize: '11px', fontWeight: 400, color: '#94a3b8' } }, cell.originalLabel)
                    )
                  );
                })
          ),
          // Comm log side panel
          showCommLog && e('div', { style: { width: '280px', background: '#0a0f1e', borderLeft: '2px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 } },
            e('div', { style: { padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
              e('span', { style: { color: '#a78bfa', fontWeight: 800, fontSize: '13px' } }, '\uD83D\uDCCB Session Log'),
              e('div', { style: { display: 'flex', gap: '6px' } },
                commLog.length > 0 && e('button', { onClick: exportLog, style: { background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' } }, '\uD83D\uDCBE CSV'),
                commLog.length > 0 && e('button', { onClick: function () { setCommLog([]); }, style: { background: '#1e293b', color: '#ef4444', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' } }, '\uD83D\uDDD1 Clear')
              )
            ),
            e('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
              commLog.length === 0
                ? e('p', { style: { color: '#475569', fontSize: '12px', textAlign: 'center', padding: '20px 0' } }, 'No communication yet')
                : commLog.slice().reverse().map(function (en, i) {
                    var t = new Date(en.ts);
                    return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', marginBottom: '4px', background: i === 0 ? '#1e293b' : 'transparent' } },
                      en.image && e('img', { src: en.image, style: { width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 } }),
                      e('div', null,
                        e('div', { style: { color: '#e2e8f0', fontWeight: 700, fontSize: '13px' } }, en.label),
                        e('div', { style: { color: '#475569', fontSize: '10px' } }, t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' \u00b7 ' + (en.boardTitle || ''))
                      )
                    );
                  })
            )
          )
        )
      );
    }

    // ── Partner-assisted scanning overlay ────────────────────────────────
    if (scanBoardId) {
      var scanBoard = savedBoards.find(function (b) { return b.id === scanBoardId; });
      var scanCells = scanBoard ? (scanBoard.words || []).filter(function (w) { return w.image; }) : [];
      var safeIdx = scanCells.length ? scanIndex % scanCells.length : 0;
      var exitScan = function () { setScanBoardId(null); setScanIndex(0); setScanPaused(false); };
      var activateCell = function () {
        var cell = scanCells[safeIdx];
        if (!cell) return;
        if (onCallTTS) {
          var voice = selectedVoice || 'Kore';
          onCallTTS(cell.label, voice).then(function (url) {
            if (url) { var a = new Audio(url); a.play().catch(function () {}); }
            else if (window.speechSynthesis) { var utt2 = new window.SpeechSynthesisUtterance(cell.label); applyVoice(utt2); window.speechSynthesis.speak(utt2); }
          }).catch(function () {});
        } else if (window.speechSynthesis) {
          var utt = new window.SpeechSynthesisUtterance(cell.label);
          applyVoice(utt);
          window.speechSynthesis.speak(utt);
        }
        // IEP: record expressive communication trial from scanning mode
        var expressiveGoal = activeGoals.find(function (g) { return g.type === 'expressive' && g.currentCount < g.targetCount; });
        if (expressiveGoal) recordIepTrial(expressiveGoal.id, true, 'scan:' + cell.label);
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
              'aria-label': 'Scanning speed',
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

    // Focus trap handler for modal — keep Tab within the dialog
    var modalRef = useRef(null);
    var handleModalKeyDown = function (ev) {
      if (ev.key === 'Escape') { onClose && onClose(); return; }
      if (ev.key !== 'Tab') return;
      var modal = modalRef.current;
      if (!modal) return;
      var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (ev.shiftKey) {
        if (document.activeElement === first) { ev.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    };

    return e('div', {
      style: S.overlay,
      onClick: function (ev) { if (ev.target === ev.currentTarget) onClose && onClose(); },
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Visual Supports Studio',
      className: 'ss-focus-visible',
      onKeyDown: handleModalKeyDown
    },
      // Spinner keyframes
      e('style', null, '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}'),
      e('div', { style: S.modal, onClick: function (ev) { ev.stopPropagation(); }, ref: modalRef },
        // Header
        e('div', { style: S.header },
          e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              e('span', { style: { fontSize: '22px' }, 'aria-hidden': 'true' }, '🎨'),
              e('div', null,
                e('h2', { id: 'ss-dialog-title', style: { color: '#fff', fontWeight: 800, fontSize: '17px', margin: 0 } }, 'Visual Supports Studio'),
                e('p', { style: { color: 'rgba(255,255,255,0.9)', fontSize: '11px', margin: '2px 0 0' } }, 'AI-powered symbols • boards • schedules • social stories')
              )
            ),
            e('button', { onClick: onClose, style: { color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }, 'aria-label': 'Close Visual Supports Studio' }, '×')
          ),
          // Tab bar
          e('div', { style: S.tabBar, role: 'tablist', 'aria-label': 'Studio sections' }, TABS.map(tabBtn))
        ),
        // Body
        e('div', { style: S.body, role: 'tabpanel', 'aria-label': tab + ' panel' },
          renderSharedLeft(),
          e('div', { style: S.rightCol },
            tab === 'symbols' && renderSymbolsTab(),
            tab === 'board' && renderBoardTab(),
            tab === 'schedule' && renderScheduleTab(),
            tab === 'stories' && renderStoriesTab(),
            tab === 'quickboards' && renderQuickBoardsTab(),
            tab === 'books' && renderBooksTab(),
            tab === 'quest' && renderQuestTab()
          )
        )
      )
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SymbolStudio = SymbolStudio;
  console.log("[CDN] Visual Supports Studio (SymbolStudio v2) loaded");
})();
