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
    + ' .ss-focus-visible *:focus:not(:focus-visible){outline:none!important}'
    // ── Word Garden animations ──
    + ' @keyframes ss-garden-sway{0%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}100%{transform:rotate(-1deg)}}'
    + ' @keyframes ss-garden-glow{0%{box-shadow:0 0 6px rgba(250,204,21,0.3)}50%{box-shadow:0 0 18px rgba(250,204,21,0.7)}100%{box-shadow:0 0 6px rgba(250,204,21,0.3)}}'
    + ' @keyframes ss-garden-tap{0%{transform:scale(1)}20%{transform:scale(1.12)}60%{transform:scale(0.95)}100%{transform:scale(1)}}'
    + ' @keyframes ss-garden-sprout{0%{transform:scale(0.9);opacity:0.7}100%{transform:scale(1);opacity:1}}'
    + ' @keyframes ss-garden-bloom{0%{filter:saturate(0.5)}50%{filter:saturate(1.3)}100%{filter:saturate(1)}}'
    + ' .ss-garden-seed{animation:ss-garden-sprout 2s ease-in-out infinite alternate}'
    + ' .ss-garden-mastered{animation:ss-garden-glow 2.5s ease-in-out infinite}'
    + ' .ss-garden-tapped{animation:ss-garden-tap 0.4s ease-out}'
    + ' @keyframes ss-garden-levelup{0%{transform:scale(0.95);opacity:0}20%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}'
    + ' .ss-garden-levelup{animation:ss-garden-levelup 0.6s ease-out}'
    + ' @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}.ss-garden-seed,.ss-garden-mastered,.ss-garden-tapped,.ss-garden-levelup{animation:none!important}}'
    + ' .text-slate-600{color:#64748b!important}';
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
  var STORAGE_FAMILIARITY = 'alloSymbolFamiliarity';
  var MAX_PROFILES = 8;

  // Codename system — privacy-safe student identifiers (Adjective + Animal)
  var CN_ADJ = ['Alpine','Arctic','Bold','Brave','Bright','Calm','Clever','Cool','Cosmic','Daring','Eager','Epic','Fair','Fast','Fierce','Gentle','Grand','Happy','Heroic','Jolly','Kind','Lively','Lucky','Magic','Mighty','Neon','Noble','Proud','Quick','Rapid','Royal','Silent','Smart','Solar','Sonic','Steady','Super','Swift','Tough','Turbo','Unique','Vivid','Wild','Wise','Zealous'];
  var CN_ANI = ['Badger','Bear','Beaver','Bison','Cat','Cobra','Cougar','Crane','Crow','Deer','Dingo','Dolphin','Dragon','Eagle','Elk','Falcon','Ferret','Fox','Gecko','Hawk','Heron','Horse','Husky','Jaguar','Koala','Lemur','Leopard','Lion','Lynx','Moose','Otter','Owl','Panda','Panther','Parrot','Penguin','Puma','Rabbit','Raven','Seal','Shark','Sloth','Tiger','Turtle','Wolf'];
  function generateCodename() { return CN_ADJ[Math.floor(Math.random() * CN_ADJ.length)] + ' ' + CN_ANI[Math.floor(Math.random() * CN_ANI.length)]; }
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
  var CAT_BORDER = { noun: '#ca8a04', verb: '#16a34a', adjective: '#1d4ed8', other: '#6b7280' };

  var TABS = [
    { id: 'symbols', icon: '🎨', label: 'Symbols' },
    { id: 'board', icon: '📋', label: 'Board Builder' },
    { id: 'schedule', icon: '📅', label: 'Visual Schedule' },
    { id: 'stories', icon: '📖', label: 'Social Stories' },
    { id: 'quickboards', icon: '⚡', label: 'Quick Boards' },
    { id: 'books', icon: '📚', label: 'Activity Sets' },
    { id: 'quest', icon: '🎮', label: 'Symbol Quest' },
    { id: 'search', icon: '🔍', label: 'Symbol Search' },
    { id: 'garden', icon: '🌱', label: 'Word Garden' },
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
    if (saved && saved.length) {
      // Migration: add codenames to profiles that don't have one
      var changed = false;
      saved.forEach(function (p) { if (!p.codename) { p.codename = generateCodename(); changed = true; } });
      if (changed) store(STORAGE_PROFILES, saved);
      return saved;
    }
    var legacy = load(STORAGE_AVATAR, null);
    var profs;
    if (legacy && (legacy.name || legacy.image)) {
      profs = [{ id: uid(), name: legacy.name || 'Student 1', description: legacy.description || '', image: legacy.image || null, codename: generateCodename() }];
    } else {
      profs = [{ id: uid(), name: 'Student 1', description: '', image: null, codename: generateCodename() }];
    }
    store(STORAGE_PROFILES, profs);
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
    // Holds FCT metadata (function + phase + optional goal text) between the moment the
    // Communication Builder builds a new board and the moment the save pipeline persists
    // it. Consumed by the board-save effect below and cleared after use.
    var pendingFctMetaRef = useRef(null);

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
      { code: 'so', label: 'Soomaali' },
      { code: 'my', label: 'မြန်မာ' },
      { code: 'am', label: 'አማርኛ' },
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
    var _scanManual = useState(false); var scanManual = _scanManual[0]; var setScanManual = _scanManual[1];
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

    // ── Word Garden state ──
    var _gardenFilter = useState('all'); var gardenFilter = _gardenFilter[0]; var setGardenFilter = _gardenFilter[1];
    var _gardenSearch = useState(''); var gardenSearch = _gardenSearch[0]; var setGardenSearch = _gardenSearch[1];
    // Wish Seeds — words the student wanted to say but couldn't find
    var STORAGE_WISHES = 'alloGardenWishSeeds';
    var _wishSeeds = useState(function () { return load(STORAGE_WISHES, []); });
    var wishSeeds = _wishSeeds[0]; var setWishSeeds = _wishSeeds[1];
    var _wishInput = useState(''); var wishInput = _wishInput[0]; var setWishInput = _wishInput[1];
    var _boardWishOpen = useState(false); var boardWishOpen = _boardWishOpen[0]; var setBoardWishOpen = _boardWishOpen[1];
    var _boardWishInput = useState(''); var boardWishInput = _boardWishInput[0]; var setBoardWishInput = _boardWishInput[1];
    var _gardenSelectedWord = useState(null); var gardenSelectedWord = _gardenSelectedWord[0]; var setGardenSelectedWord = _gardenSelectedWord[1];
    var _gardenSort = useState('growth'); var gardenSort = _gardenSort[0]; var setGardenSort = _gardenSort[1];
    var _gardenStudentView = useState(false); var gardenStudentView = _gardenStudentView[0]; var setGardenStudentView = _gardenStudentView[1];
    var _gardenBehaviorFn = useState(''); var gardenBehaviorFn = _gardenBehaviorFn[0]; var setGardenBehaviorFn = _gardenBehaviorFn[1];
    // Bilingual garden — home language translations cached per profile
    var STORAGE_HOME_LANG = 'alloGardenHomeLang';
    var _gardenHomeLang = useState(function () { return load(STORAGE_HOME_LANG, ''); });
    var gardenHomeLang = _gardenHomeLang[0]; var setGardenHomeLang = _gardenHomeLang[1];
    var _gardenTranslations = useState({}); var gardenTranslations = _gardenTranslations[0]; var setGardenTranslations = _gardenTranslations[1];
    var _gardenTranslating = useState(false); var gardenTranslating = _gardenTranslating[0]; var setGardenTranslating = _gardenTranslating[1];
    var _sessionDebrief = useState(null); var sessionDebrief = _sessionDebrief[0]; var setSessionDebrief = _sessionDebrief[1];

    // Growth events — detects and celebrates when words level up
    var STORAGE_GROWTH_LOG = 'alloGardenGrowthLog';
    var _growthEvents = useState([]); var growthEvents = _growthEvents[0]; var setGrowthEvents = _growthEvents[1];
    var _prevGrowthMap = useState(function () { return load(STORAGE_GROWTH_LOG, {}); });
    var prevGrowthMap = _prevGrowthMap[0]; var setPrevGrowthMap = _prevGrowthMap[1];

    // ── Vocabulary Familiarity System ──
    // Tracks every symbol interaction across all tabs to build a learning profile.
    // Originally conceived by a sibling instance; rebuilt here to live alongside the garden.
    // Context types: 'aac-tap', 'quest-correct', 'quest-wrong', 'speak', 'exposure'
    var _familiarity = useState(function () { return load(STORAGE_FAMILIARITY, {}); });
    var familiarity = _familiarity[0]; var setFamiliarity = _familiarity[1];

    var recordFamiliarity = useCallback(function (label, context) {
      if (!label) return;
      var key = label.toLowerCase().trim();
      setFamiliarity(function (prev) {
        var entry = prev[key] || { taps: 0, questCorrect: 0, questWrong: 0, exposures: 0, lastSeen: 0, firstSeen: 0 };
        var updated = Object.assign({}, entry, { lastSeen: Date.now() });
        if (!updated.firstSeen) updated.firstSeen = Date.now();
        if (context === 'aac-tap' || context === 'speak') updated.taps = (entry.taps || 0) + 1;
        else if (context === 'quest-correct') updated.questCorrect = (entry.questCorrect || 0) + 1;
        else if (context === 'quest-wrong') updated.questWrong = (entry.questWrong || 0) + 1;
        else if (context === 'exposure') updated.exposures = (entry.exposures || 0) + 1;
        var next = Object.assign({}, prev); next[key] = updated;
        store(STORAGE_FAMILIARITY, next);
        return next;
      });
    }, []);

    // Garden Story state — a personalized fairy tale about the student's vocabulary
    var _gardenStory = useState(null); var gardenStory = _gardenStory[0]; var setGardenStory = _gardenStory[1];
    var _gardenStoryLoading = useState(false); var gardenStoryLoading = _gardenStoryLoading[0]; var setGardenStoryLoading = _gardenStoryLoading[1];

    // Familiarity score: 0 (unknown) → 1 (mastered)
    // Weighs interactions, quest accuracy, and recency (fades over 2 weeks)
    function getFamiliarityScore(label) {
      if (!label) return 0;
      var entry = familiarity[label.toLowerCase().trim()];
      if (!entry) return 0;
      var interactions = (entry.taps || 0) + (entry.questCorrect || 0) * 2 + (entry.exposures || 0) * 0.3;
      var totalQuest = (entry.questCorrect || 0) + (entry.questWrong || 0);
      var accuracy = totalQuest > 0 ? entry.questCorrect / totalQuest : 0.5;
      var daysSince = entry.lastSeen ? (Date.now() - entry.lastSeen) / 86400000 : 999;
      var recency = Math.max(0, 1 - daysSince / 14);
      return Math.min(1, interactions / 25) * 0.4 + accuracy * 0.3 + recency * 0.3;
    }

    // Sync story student name when avatar name changes
    useEffect(function () { if (avatarName) setStoryStudentName(avatarName); }, [avatarName]);

    // Auto-load from cloud on mount (once, when cloudSync becomes available)
    // GATED: cloudSync disabled in Canvas — PII (student names, profiles) must not transit Canvas sandbox
    useEffect(function () {
      if (cloudSync && !isCanvasEnv && !autoLoadedRef.current) {
        autoLoadedRef.current = true;
        loadFromCloud();
      }
    }, [cloudSync, isCanvasEnv]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-save to cloud 5 s after any data change (debounced via syncToCloud identity)
    // GATED: disabled in Canvas to prevent PII leakage through sandbox
    useEffect(function () {
      if (!cloudSync || isCanvasEnv) return;
      var t = setTimeout(syncToCloud, 5000);
      return function () { clearTimeout(t); };
    }, [syncToCloud, isCanvasEnv]); // syncToCloud ref changes whenever profiles/boards/schedules/gallery change

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
      if (!scanBoardId || scanPaused || scanManual) return;
      var board = savedBoards.find(function (b) { return b.id === scanBoardId; });
      if (!board) return;
      var cells = (board.words || []).filter(function (w) { return w.image; });
      if (!cells.length) return;
      scanIntervalRef.current = setInterval(function () {
        setScanIndex(function (prev) { return (prev + 1) % cells.length; });
      }, scanSpeed);
      return function () { clearInterval(scanIntervalRef.current); };
    }, [scanBoardId, scanPaused, scanManual, scanSpeed, savedBoards]);

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
      var newProf = { id: uid(), name: 'Student ' + (profiles.length + 1), description: '', image: null, codename: generateCodename() };
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
        version: 7,
        exportDate: new Date().toISOString(),
        gallery: gallery,
        boards: savedBoards,
        schedules: savedSchedules,
        profiles: profiles,
        books: books,
        familiarity: familiarity,
        usageLog: usageLog,
        iepGoals: iepGoals,
        growthLog: prevGrowthMap,
        customTemplates: customTemplates,
        gardenTranslations: gardenTranslations,
        gardenHomeLang: gardenHomeLang,
        wishSeeds: wishSeeds,
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
    }, [gallery, savedBoards, savedSchedules, profiles, books, familiarity, usageLog, iepGoals, prevGrowthMap, customTemplates, addToast]);

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
          // Import familiarity data (merge: imported values override existing per-word)
          if (data.familiarity && typeof data.familiarity === 'object') {
            var mergedFam = Object.assign({}, familiarity, data.familiarity);
            setFamiliarity(mergedFam); store(STORAGE_FAMILIARITY, mergedFam);
            summary.push('vocabulary familiarity');
          }
          // Import AAC usage log (merge sessions)
          if (data.usageLog && typeof data.usageLog === 'object') {
            var mergedUsage = Object.assign({}, usageLog);
            Object.keys(data.usageLog).forEach(function (pid) {
              var existing = mergedUsage[pid] || { sessions: [] };
              var imported = data.usageLog[pid] || { sessions: [] };
              // Deduplicate by session date
              var existDates = {};
              existing.sessions.forEach(function (s) { existDates[s.date] = true; });
              var newSessions = imported.sessions.filter(function (s) { return !existDates[s.date]; });
              mergedUsage[pid] = { sessions: existing.sessions.concat(newSessions) };
            });
            setUsageLog(mergedUsage); store(STORAGE_USAGE, mergedUsage);
            summary.push('AAC usage log');
          }
          // Import IEP goals (merge by ID)
          if (Array.isArray(data.iepGoals) && data.iepGoals.length) {
            var existingGoalIds = {};
            iepGoals.forEach(function (g) { existingGoalIds[g.id] = true; });
            var newGoals = data.iepGoals.filter(function (g) { return !existingGoalIds[g.id]; });
            if (newGoals.length > 0) {
              var mergedGoals = iepGoals.concat(newGoals);
              setIepGoals(mergedGoals); store(STORAGE_GOALS, mergedGoals);
              summary.push(newGoals.length + ' IEP goal(s)');
            }
          }
          // Import growth log snapshot
          if (data.growthLog && typeof data.growthLog === 'object') {
            var mergedGrowth = Object.assign({}, prevGrowthMap, data.growthLog);
            setPrevGrowthMap(mergedGrowth); store(STORAGE_GROWTH_LOG, mergedGrowth);
            summary.push('growth history');
          }
          // Import custom story templates
          if (Array.isArray(data.customTemplates) && data.customTemplates.length) {
            var existingTmplIds = {};
            customTemplates.forEach(function (t) { existingTmplIds[t.id || t.label] = true; });
            var newTmpls = data.customTemplates.filter(function (t) { return !existingTmplIds[t.id || t.label]; });
            if (newTmpls.length > 0) {
              var mergedTmpls = customTemplates.concat(newTmpls);
              setCustomTemplates(mergedTmpls); store(STORAGE_CUSTOM_TEMPLATES, mergedTmpls);
              summary.push(newTmpls.length + ' story template(s)');
            }
          }
          // Import garden translations
          if (data.gardenTranslations && typeof data.gardenTranslations === 'object') {
            var mergedTrans = Object.assign({}, gardenTranslations, data.gardenTranslations);
            setGardenTranslations(mergedTrans);
            summary.push('translations');
          }
          if (data.gardenHomeLang && typeof data.gardenHomeLang === 'string') {
            setGardenHomeLang(data.gardenHomeLang); store(STORAGE_HOME_LANG, data.gardenHomeLang);
          }
          // Import wish seeds
          if (Array.isArray(data.wishSeeds) && data.wishSeeds.length) {
            var existWishes = {}; wishSeeds.forEach(function (w) { existWishes[w.label.toLowerCase()] = true; });
            var newWishes = data.wishSeeds.filter(function (w) { return !existWishes[w.label.toLowerCase()]; });
            if (newWishes.length > 0) { var mw = wishSeeds.concat(newWishes); setWishSeeds(mw); store(STORAGE_WISHES, mw); summary.push(newWishes.length + ' wish seed(s)'); }
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
      if (!cloudSync || isCanvasEnv) return; // PII gate: no cloud sync in Canvas sandbox
      setSyncStatus('syncing');
      try {
        var data = {
          profiles: profiles.map(function (p) { return { id: p.id, codename: p.codename || p.id, description: p.description }; }),
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
      if (!cloudSync || isCanvasEnv) return; // PII gate: no cloud sync in Canvas sandbox
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
      // If the Communication Builder populated this board, attach its metadata so the
      // saved record can be filtered or analytically grouped by FCT function / phase.
      var fctMeta = pendingFctMetaRef.current || null;
      var saved = {
        id: uid(), title: boardTitle || boardTopic, profileId: activeProfileId || null, createdAt: Date.now(),
        words: boardWords, cols: boardCols,
        pages: finalPages || null,
        fctFunction: fctMeta && fctMeta.fctFunction || null,
        fctPhase: fctMeta && fctMeta.fctPhase != null ? fctMeta.fctPhase : null,
        fctGoal: fctMeta && fctMeta.fctGoal || null
      };
      // Consume the pending metadata after saving so the next save (manual or template-only)
      // doesn't accidentally inherit it.
      pendingFctMetaRef.current = null;
      var updated = [saved].concat(savedBoards);
      setSavedBoards(updated); store(STORAGE_BOARDS, updated);
      addToast && addToast('Board saved!' + (finalPages && finalPages.length > 1 ? ' (' + finalPages.length + ' pages)' : ''), 'success');
      // Garden discovery nudge — fires once when gallery + board create cross-context vocabulary
      if (addToast && gallery.length >= 2 && !load('alloGardenNudgeSeen', false)) {
        setTimeout(function () {
          addToast('🌱 Your words are growing! Check the Word Garden tab to see vocabulary across tools.', 'info');
          store('alloGardenNudgeSeen', true);
        }, 1500);
      }
      if (cloudSync && !isCanvasEnv) setTimeout(function () { syncToCloud(); }, 300);
    }, [boardWords, boardPages, activePageIdx, boardTitle, boardTopic, boardCols, activeProfileId, savedBoards, cloudSync, syncToCloud, commitCurrentPage, addToast]);

    var applyBoardTemplate = useCallback(function (template) {
      var words = template.words.map(function (w) { return Object.assign({}, w, { id: uid(), image: null }); });
      setBoardWords(words);
      setBoardTitle(template.label);
      setBoardTopic(template.label);
      addToast && addToast(template.label + ' template loaded — click ✨ Generate Images to start!', 'success');
    }, [addToast]);

    // ── FCT template loader — Communication Builder entry point ──────────────
    // Loads one of the FCT_PHASE_TEMPLATES entries into the Board Builder, auto-switches
    // to the Board tab, and kicks off Imagen generation for any cells not already cached
    // in the gallery. Tags the new board with fctFunction + fctPhase metadata so later
    // analytics / filtering can group FCT boards by function.
    var applyFctTemplate = useCallback(function (functionId, phase) {
      var fmap = FCT_MAP[functionId];
      var labels = (FCT_PHASE_TEMPLATES[functionId] && FCT_PHASE_TEMPLATES[functionId][phase]) || [];
      if (!labels.length || !fmap) {
        addToast && addToast('Invalid FCT template', 'error');
        return;
      }
      var words = labels.map(function (lbl) {
        return { id: uid(), label: lbl, category: fctWordCategory(lbl), description: fmap.tip || '', image: null };
      });
      setBoardWords(words);
      var phaseMeta = FCT_PHASE_META[phase] || { label: 'Phase ' + phase };
      var title = fmap.label + ' — ' + phaseMeta.label;
      setBoardTitle(title);
      setBoardTopic(fmap.label);
      // Set cell count to match phase (keeps the grid tight).
      // 1 cell → 1 col; 3 → 3 cols; 6 → 3 cols (2 rows); 12 → 4 cols (3 rows).
      var cols = phase === 1 ? 1 : phase === 2 ? 3 : phase === 3 ? 3 : 4;
      setBoardCols(cols);
      // Jump to Board Builder so the teacher can see the board populating.
      setTab('board');
      addToast && addToast('🗣 ' + title + ' — images generating…', 'success');
      // Kick off image generation on the next tick so setBoardWords has committed.
      // We temporarily store the fct metadata on a ref so the save pipeline picks it up.
      pendingFctMetaRef.current = { fctFunction: functionId, fctPhase: phase };
      setTimeout(function () { try { generateBoardImages(); } catch (_) {} }, 80);
    }, [addToast, generateBoardImages]);

    // ── Free-text goal → board builder (uses Gemini to interpret the goal) ─
    // Asks Gemini for 3–6 symbol labels + an inferred FCT function. Falls back to an
    // empty 6-cell scaffold + a toast when the model returns malformed JSON or when
    // onCallGemini isn't available (offline or School Box mode).
    var buildBoardFromGoal = useCallback(async function (goalText) {
      var goal = String(goalText || '').trim();
      if (!goal) { addToast && addToast('Enter a communication goal first', 'error'); return; }
      // Offline / no-Gemini fallback: empty 6-cell scaffold with the goal as title.
      if (!onCallGemini) {
        var scaffold = [];
        for (var si = 0; si < 6; si++) scaffold.push({ id: uid(), label: '', category: 'other', description: '', image: null });
        setBoardWords(scaffold);
        setBoardTitle('Goal: ' + goal);
        setBoardTopic(goal);
        setBoardCols(3);
        setTab('board');
        addToast && addToast('AI goal parser unavailable — blank 6-cell board ready to edit', 'info');
        return;
      }
      addToast && addToast('🧠 Planning symbols for "' + goal + '"…', 'info');
      try {
        var prompt = [
          'You are helping build a communication board for a non-verbal or emerging-communicator student.',
          'The communication goal is: "' + goal + '".',
          'Return ONLY a compact JSON object (no markdown fences, no prose) with this shape:',
          '{ "words": ["label1", "label2", ...], "function": "attention"|"escape"|"tangible"|"sensory", "rationale": "one sentence" }',
          'Rules:',
          '- "words" must have 3 to 6 short symbol labels (1-2 words each).',
          '- Choose concrete, imageable labels — they will be rendered as picture symbols.',
          '- Include small function words like "I", "want", "please" where they help form a phrase.',
          '- "function" is the ABA behavioral function this goal serves.',
          '- Keep "rationale" under 20 words.'
        ].join('\n');
        var raw = await onCallGemini(prompt);
        // Gemini usually returns text; strip any code fences it slipped in.
        var stripped = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        var parsed; try { parsed = JSON.parse(stripped); } catch (pe) { parsed = null; }
        if (!parsed || !Array.isArray(parsed.words) || parsed.words.length === 0) {
          addToast && addToast('Goal parser returned unexpected output — try rewording', 'error');
          return;
        }
        var labels = parsed.words.map(function (w) { return String(w).trim(); }).filter(function (w) { return w; }).slice(0, 6);
        if (!labels.length) { addToast && addToast('No usable labels from goal — try rewording', 'error'); return; }
        var words = labels.map(function (lbl) {
          return { id: uid(), label: lbl, category: fctWordCategory(lbl), description: '', image: null };
        });
        setBoardWords(words);
        setBoardTitle('Goal: ' + goal);
        setBoardTopic(goal);
        setBoardCols(labels.length <= 3 ? labels.length : 3);
        setTab('board');
        // Capitalise the function tag to match FCT_MAP keys if recognized.
        var fnRaw = String(parsed.function || '').trim().toLowerCase();
        var fnMap = { attention: 'Attention', escape: 'Escape', tangible: 'Tangible', sensory: 'Sensory' };
        var fnNormalized = fnMap[fnRaw] || null;
        pendingFctMetaRef.current = fnNormalized ? { fctFunction: fnNormalized, fctPhase: null, fctGoal: goal } : { fctGoal: goal };
        addToast && addToast('🗣 Board ready' + (fnNormalized ? ' (' + fnNormalized + ')' : '') + ' — images generating…', 'success');
        setTimeout(function () { try { generateBoardImages(); } catch (_) {} }, 80);
      } catch (err) {
        addToast && addToast('Could not reach AI goal parser — try again', 'error');
      }
    }, [addToast, onCallGemini, generateBoardImages]);

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

    // ── HTML board export (WCAG 2.1 AA accessible) ─────────────────────────
    var exportBoardHTML = useCallback(function (board) {
      var pages = board.pages && board.pages.length ? board.pages : [{ title: board.title, words: board.words || [], cols: board.cols || 4 }];
      var isMultiPage = pages.length > 1;
      var title = (board.title || 'AAC Board').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var lang = boardLang || 'en';
      var isRtl = lang === 'ar' || lang === 'he';
      var dir = isRtl ? 'rtl' : 'ltr';
      var langEntry = LANG_OPTIONS.find(function (l) { return l.code === lang; });
      var langName = langEntry ? langEntry.label : 'English';
      var pagesData = pages.map(function (page, pi) {
        var cells = (page.words || []).filter(function (w) { return w.image; });
        var pageCols = page.cols || board.cols || 4;
        var cellsHTML = cells.map(function (w, ci) {
          var bg = CAT_COLORS[w.category] || '#f9fafb';
          var border = CAT_BORDER[w.category] || '#e5e7eb';
          var lbl = (w.translatedLabel || w.label || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
          var origLbl = w.originalLabel ? w.originalLabel.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
          var desc = w.description ? w.description.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
          var altText = desc ? lbl + ': ' + desc : lbl;
          var isFirst = pi === 0 && ci === 0;
          return '<div role="gridcell" tabindex="' + (isFirst ? '0' : '-1') + '" data-label="' + lbl + '" data-speak="' + (w.translatedLabel || w.label || '').replace(/"/g, '&quot;') + '" aria-label="' + altText + '" style="background:' + bg + ';border:2px solid ' + border + '"><img src="' + w.image + '" alt="' + altText + '" draggable="false"><span aria-hidden="true">' + lbl + '</span>' + (origLbl && w.translatedLabel ? '<span class="orig-label" aria-hidden="true">' + origLbl + '</span>' : '') + '</div>';
        }).join('\n');
        return { cols: pageCols, html: cellsHTML, title: (page.title || 'Page ' + (pi + 1)).replace(/</g, '&lt;'), count: cells.length };
      });
      var tabsHTML = '';
      if (isMultiPage) {
        tabsHTML = '<nav aria-label="Board pages" id="page-tabs" role="tablist">' + pagesData.map(function (p, i) { return '<button role="tab" id="tab-' + i + '" aria-selected="' + (i === 0 ? 'true' : 'false') + '" aria-controls="page-' + i + '" tabindex="' + (i === 0 ? '0' : '-1') + '" onclick="switchPage(' + i + ')" class="page-tab' + (i === 0 ? ' active' : '') + '">' + p.title + '</button>'; }).join('') + '</nav>';
      }
      var panelsHTML = pagesData.map(function (p, i) { return '<div role="tabpanel" id="page-' + i + '" aria-labelledby="tab-' + i + '" class="page-panel" ' + (i > 0 ? 'hidden' : '') + '><div role="grid" aria-label="' + p.title + ' communication symbols" class="board-grid" style="grid-template-columns:repeat(' + p.cols + ',1fr)">' + p.html + '</div></div>'; }).join('\n');
      var firstCols = pagesData[0].cols;
      var css = '*, *::before, *::after { box-sizing: border-box; }\n'
        + 'body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1f2937; user-select: none; }\n'
        + '.skip-link { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; } .skip-link:focus { position: fixed; left: 0; top: 0; width: auto; height: auto; padding: 8px 16px; background: #1e293b; color: #fff; font-weight: 700; outline: 3px solid #facc15; z-index: 10000; }\n'
        + 'header[role="banner"] { background: linear-gradient(135deg, #7c3aed, #4338ca); color: #fff; padding: 12px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; } header h1 { margin: 0; font-size: 18px; font-weight: 800; }\n'
        + '.controls { display: flex; gap: 6px; flex-wrap: wrap; ' + (isRtl ? 'margin-right:auto;' : 'margin-left:auto;') + ' }\n'
        + '.ctrl-btn { border: none; border-radius: 8px; padding: 8px 14px; font-weight: 700; font-size: 13px; cursor: pointer; min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; gap: 6px; } .ctrl-btn:focus-visible { outline: 3px solid #facc15; outline-offset: 2px; }\n'
        + '#sentence-strip { background: #1a1a2e; min-height: 58px; padding: 10px 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n'
        + '.strip-word { background: #312e81; color: #e0e7ff; font-weight: 700; font-size: 13px; padding: 5px 10px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; } .strip-word img { width: 28px; height: 28px; object-fit: contain; border-radius: 4px; }\n'
        + '#placeholder { color: #94a3b8; font-style: italic; font-size: 13px; } #strip-btns { display: none; gap: 8px; ' + (isRtl ? 'margin-right:auto;' : 'margin-left:auto;') + ' } #strip-btns.visible { display: flex; }\n'
        + '#page-tabs { display: flex; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; padding: 0 16px; } .page-tab { border: none; background: transparent; padding: 10px 18px; font-weight: 600; font-size: 13px; cursor: pointer; border-bottom: 3px solid transparent; color: #64748b; min-height: 44px; } .page-tab.active { color: #7c3aed; border-bottom-color: #7c3aed; } .page-tab:focus-visible { outline: 3px solid #7c3aed; outline-offset: -3px; }\n'
        + '.board-grid { display: grid; gap: 12px; padding: 16px; }\n'
        + '[role="gridcell"] { border-radius: 12px; padding: 12px 8px; display: flex; flex-direction: column; align-items: center; gap: 7px; cursor: pointer; transition: transform 0.12s; min-height: 44px; min-width: 44px; } [role="gridcell"]:active { transform: scale(0.93); }\n'
        + '[role="gridcell"] img { width: 72px; height: 72px; object-fit: contain; border-radius: 6px; pointer-events: none; } [role="gridcell"] span { font-weight: 700; font-size: 13px; text-align: center; line-height: 1.3; color: #1f2937; } .orig-label { display: block; font-size: 10px !important; font-weight: 400 !important; color: #6b7280 !important; }\n'
        + '[role="gridcell"]:focus-visible { outline: 3px solid #4f46e5; outline-offset: 2px; box-shadow: 0 0 0 6px rgba(79,70,229,0.25); } [role="gridcell"]:focus:not(:focus-visible) { outline: none; }\n'
        + '[role="gridcell"].flash { box-shadow: 0 0 0 4px #fbbf24; transform: scale(1.05); } [role="gridcell"].scan-hl { border-color: #facc15 !important; border-width: 4px !important; transform: scale(1.05); box-shadow: 0 0 0 6px rgba(250,204,21,0.4); }\n'
        + '#scan-bar { display: none; background: #1e293b; padding: 8px 16px; align-items: center; gap: 12px; flex-wrap: wrap; } #scan-bar.active { display: flex; } #scan-bar span { color: #facc15; font-weight: 700; font-size: 13px; } #scan-bar select { font-size: 13px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 6px; padding: 4px 8px; min-height: 36px; } #scan-bar label { color: #94a3b8; font-size: 12px; display: flex; align-items: center; gap: 6px; }\n'
        + '#help-panel { display: none; background: #1e293b; color: #e2e8f0; padding: 16px 20px; border-top: 2px solid #334155; } #help-panel.visible { display: block; } #help-panel h2 { margin: 0 0 8px; font-size: 14px; color: #facc15; } #help-panel kbd { background: #334155; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #475569; } #help-panel dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; font-size: 13px; } #help-panel dt { font-weight: 700; } #help-panel dd { margin: 0; }\n'
        + 'footer[role="contentinfo"] { text-align: center; padding: 16px; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; }\n'
        + '.a11y-stmt { max-width: 700px; margin: 12px auto 0; text-align: ' + (isRtl ? 'right' : 'left') + '; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #166534; line-height: 1.5; } .a11y-stmt strong { display: block; margin-bottom: 4px; }\n'
        + '#live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }\n'
        + 'body.hc { background: #000; color: #fff; } body.hc header { background: #000; border-bottom: 3px solid #fff; } body.hc #sentence-strip { background: #000; border-bottom: 2px solid #fff; } body.hc .strip-word { background: #fff; color: #000; } body.hc [role="gridcell"] { background: #000 !important; border-color: #fff !important; } body.hc [role="gridcell"] span { color: #fff !important; } body.hc .ctrl-btn { border: 2px solid #fff; } body.hc footer { color: #ccc; border-color: #fff; } body.hc .a11y-stmt { background: #111; border-color: #fff; color: #ccc; } body.hc #help-panel { background: #111; border-color: #fff; } body.hc #scan-bar { background: #111; }\n'
        + '@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }\n'
        + '@media (forced-colors: active) { [role="gridcell"] { border: 2px solid CanvasText; } [role="gridcell"]:focus-visible { outline: 3px solid Highlight; } [role="gridcell"].scan-hl { border: 4px solid Highlight; } header { border-bottom: 2px solid CanvasText; } .ctrl-btn { border: 1px solid ButtonText; } }\n'
        + '@media print { body { background: #fff !important; color: #000 !important; } header { background: #f5f5f5 !important; color: #000 !important; } #sentence-strip,.controls,#scan-bar,#help-panel,.a11y-stmt,#live-region { display: none !important; } [role="gridcell"] { page-break-inside: avoid; border: 1px solid #333 !important; } [role="gridcell"] img { max-width: 60px; } footer { color: #666; } }\n';
      var js = '(function(){"use strict";var words=[],scanOn=false,scanIdx=0,scanTmr=null,scanSpd=2000,scanMan=false,pg=0,cells=[],cols=' + firstCols + ',colsMap=' + JSON.stringify(pagesData.map(function(p){return p.cols;})) + ',strip,liveR;'
        + 'function init(){strip=document.getElementById("sentence-strip");liveR=document.getElementById("live-region");refreshCells();document.addEventListener("keydown",onKey);}'
        + 'function refreshCells(){var p=document.querySelector(".page-panel:not([hidden])")||document.querySelector(".page-panel");cells=p?Array.from(p.querySelectorAll("[role=gridcell]")):[];cols=colsMap[pg]||' + firstCols + ';}'
        + 'function ann(t){if(liveR){liveR.textContent="";setTimeout(function(){liveR.textContent=t;},50);}}'
        + 'function speak(t){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.lang="' + lang + '";window.speechSynthesis.speak(u);}'
        + 'function tap(el){var lbl=el.getAttribute("data-speak")||el.getAttribute("data-label");var img=el.querySelector("img");words.push({label:lbl,src:img?img.src:""});renderStrip();ann(lbl+" added to message");speak(lbl);el.classList.add("flash");setTimeout(function(){el.classList.remove("flash");},300);}'
        + 'function renderStrip(){strip.querySelectorAll(".strip-word").forEach(function(c){c.remove();});var ph=document.getElementById("placeholder"),btns=document.getElementById("strip-btns");if(ph)ph.style.display=words.length?"none":"";if(btns)btns.className=words.length?"visible":"";var ref=document.getElementById("strip-btns");words.forEach(function(w){var d=document.createElement("span");d.className="strip-word";if(w.src){var i=document.createElement("img");i.src=w.src;i.alt="";d.appendChild(i);}d.appendChild(document.createTextNode(w.label));strip.insertBefore(d,ref);});strip.setAttribute("aria-label","Message: "+words.map(function(w){return w.label;}).join(" "));}'
        + 'function speakAll(){speak(words.map(function(w){return w.label;}).join(" "));}'
        + 'function delLast(){if(words.length){var r=words.pop();renderStrip();ann(r.label+" removed");}}'
        + 'function clearAll(){words=[];renderStrip();ann("Message cleared");}'
        + 'function advScan(){scanIdx=(scanIdx+1)%cells.length;hlScan(scanIdx);}'
        + 'function onKey(e){var a=document.activeElement;if(scanOn){if(e.key===" "||e.key==="Enter"){e.preventDefault();if(cells[scanIdx])tap(cells[scanIdx]);}if(e.key==="Escape"){e.preventDefault();toggleScan();}if(scanMan&&(e.key==="Tab"||e.key==="ArrowRight"||e.key==="ArrowDown")){e.preventDefault();advScan();}return;}'
        + 'if(a&&a.getAttribute("role")==="gridcell"){var idx=cells.indexOf(a);if(idx===-1)return;var ni=idx;switch(e.key){case"ArrowRight":ni=' + (isRtl ? 'Math.max(0,idx-1)' : 'Math.min(cells.length-1,idx+1)') + ';e.preventDefault();break;case"ArrowLeft":ni=' + (isRtl ? 'Math.min(cells.length-1,idx+1)' : 'Math.max(0,idx-1)') + ';e.preventDefault();break;case"ArrowDown":ni=Math.min(cells.length-1,idx+cols);e.preventDefault();break;case"ArrowUp":ni=Math.max(0,idx-cols);e.preventDefault();break;case"Home":ni=Math.floor(idx/cols)*cols;e.preventDefault();break;case"End":ni=Math.min(cells.length-1,(Math.floor(idx/cols)+1)*cols-1);e.preventDefault();break;case"Enter":case" ":e.preventDefault();tap(a);return;}if(ni!==idx){a.setAttribute("tabindex","-1");cells[ni].setAttribute("tabindex","0");cells[ni].focus();}}'
        + 'var tag=a?a.tagName:"";if(tag!=="INPUT"&&tag!=="SELECT"){if(e.key==="s"||e.key==="S"){e.preventDefault();toggleScan();}if(e.key==="h"||e.key==="H"){e.preventDefault();toggleHC();}if(e.key==="?"||e.key==="/"){e.preventDefault();toggleHelp();}if(e.key==="Backspace"){e.preventDefault();delLast();}if(e.key==="Delete"){e.preventDefault();clearAll();}}}'
        + 'function toggleScan(){scanOn?stopScan():startScan();}'
        + 'function startScan(){scanOn=true;scanIdx=0;hlScan(0);if(!scanMan){scanTmr=setInterval(function(){scanIdx=(scanIdx+1)%cells.length;hlScan(scanIdx);},scanSpd);}document.getElementById("scan-bar").className="active";ann(scanMan?"Manual scanning started. Tab to advance, Space to select.":"Scanning started. Press Space to select. Escape to stop.");}'
        + 'function stopScan(){scanOn=false;clearInterval(scanTmr);cells.forEach(function(c){c.classList.remove("scan-hl");});document.getElementById("scan-bar").className="";ann("Scanning stopped.");}'
        + 'function hlScan(i){cells.forEach(function(c){c.classList.remove("scan-hl");});if(cells[i])cells[i].classList.add("scan-hl");}'
        + 'function setScanSpd(v){scanSpd=v;if(scanOn&&!scanMan){clearInterval(scanTmr);scanTmr=setInterval(function(){scanIdx=(scanIdx+1)%cells.length;hlScan(scanIdx);},scanSpd);}}'
        + 'function toggleScanMode(){scanMan=!scanMan;if(scanOn){stopScan();startScan();}document.getElementById("scan-mode-btn").textContent=scanMan?"2-Switch":"1-Switch";}'
        + 'function toggleHC(){document.body.classList.toggle("hc");ann(document.body.classList.contains("hc")?"High contrast on":"High contrast off");}'
        + 'function toggleHelp(){var p=document.getElementById("help-panel");p.classList.toggle("visible");ann(p.classList.contains("visible")?"Help shown":"Help hidden");}'
        + (isMultiPage ? 'function switchPage(i){document.querySelectorAll(".page-panel").forEach(function(p,j){p.hidden=j!==i;});document.querySelectorAll("[role=tab]").forEach(function(t,j){t.setAttribute("aria-selected",j===i?"true":"false");t.setAttribute("tabindex",j===i?"0":"-1");t.className="page-tab"+(j===i?" active":"");});pg=i;refreshCells();if(scanOn)stopScan();ann("Page "+(i+1));}' : '')
        + 'document.addEventListener("click",function(e){var c=e.target.closest("[role=gridcell]");if(c)tap(c);});'
        + 'document.addEventListener("touchstart",function(e){var c=e.target.closest("[role=gridcell]");if(c)c.style.transform="scale(0.93)";},{passive:true});'
        + 'document.addEventListener("touchend",function(e){var c=e.target.closest("[role=gridcell]");if(c){c.style.transform="";tap(c);e.preventDefault();}});'
        + 'window.speakAll=speakAll;window.delLast=delLast;window.clearAll=clearAll;window.toggleScan=toggleScan;window.toggleHC=toggleHC;window.toggleHelp=toggleHelp;window.setScanSpd=setScanSpd;window.toggleScanMode=toggleScanMode;window.advScan=advScan;'
        + (isMultiPage ? 'window.switchPage=switchPage;' : '')
        + 'document.addEventListener("DOMContentLoaded",init);})();';
      var html = '<!DOCTYPE html>\n<html lang="' + lang + '" dir="' + dir + '">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + title + ' \u2014 AAC Communication Board</title>\n<style>\n' + css + '</style>\n</head>\n<body>\n'
        + '<a href="#board-main" class="skip-link">Skip to communication board</a>\n'
        + '<div id="live-region" role="status" aria-live="assertive" aria-atomic="true"></div>\n'
        + '<header role="banner"><h1>' + title + '</h1><nav class="controls" aria-label="Board controls">'
        + '<button class="ctrl-btn" onclick="toggleScan()" aria-label="Toggle scanning mode" style="background:#4f46e5;color:#fff;">\u2638\uFE0F Scan</button>'
        + '<button class="ctrl-btn" id="scan-mode-btn" onclick="toggleScanMode()" aria-label="Switch between 1-switch and 2-switch scanning" style="background:#334155;color:#fff;">1-Switch</button>'
        + '<button class="ctrl-btn" onclick="toggleHC()" aria-label="Toggle high contrast" style="background:#334155;color:#fff;">\u25FC\uFE0F Contrast</button>'
        + '<button class="ctrl-btn" onclick="toggleHelp()" aria-label="Show keyboard shortcuts" style="background:#334155;color:#fff;">? Help</button>'
        + '</nav></header>\n'
        + '<div id="sentence-strip" role="log" aria-live="polite" aria-label="Message being composed"><span id="placeholder">Tap symbols to build a message\u2026</span><div id="strip-btns" aria-label="Message controls">'
        + '<button class="ctrl-btn" onclick="speakAll()" aria-label="Speak entire message" style="background:#4f46e5;color:#fff;padding:6px 12px;min-height:36px;">\uD83D\uDD0A Speak</button>'
        + '<button class="ctrl-btn" onclick="delLast()" aria-label="Delete last word" style="background:#374151;color:#fff;padding:6px 12px;min-height:36px;">\u232B Undo</button>'
        + '<button class="ctrl-btn" onclick="clearAll()" aria-label="Clear entire message" style="background:#374151;color:#cbd5e1;padding:6px 12px;min-height:36px;">\uD83D\uDDD1\uFE0F Clear</button></div></div>\n'
        + '<div id="scan-bar" role="status" aria-live="polite"><span>\u2638\uFE0F Scanning Active</span>'
        + '<label>Speed: <select onchange="setScanSpd(Number(this.value))" aria-label="Scanning speed"><option value="1000">1s</option><option value="2000" selected>2s</option><option value="3000">3s</option><option value="4000">4s</option></select></label>'
        + '<button class="ctrl-btn" onclick="advScan()" aria-label="Advance to next symbol" style="background:#1e40af;color:#fff;padding:6px 12px;min-height:36px;">\u2192 Next</button>'
        + '<span style="color:#94a3b8;font-size:12px;">Space to select \u00b7 Esc to stop</span></div>\n'
        + '<div id="help-panel" role="region" aria-label="Keyboard shortcuts"><h2>Keyboard Shortcuts</h2><dl>'
        + '<dt><kbd>\u2190\u2191\u2192\u2193</kbd></dt><dd>Navigate symbols</dd>'
        + '<dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt><dd>Select symbol</dd>'
        + '<dt><kbd>S</kbd></dt><dd>Toggle scanning</dd>'
        + '<dt><kbd>H</kbd></dt><dd>Toggle high contrast</dd>'
        + '<dt><kbd>Backspace</kbd></dt><dd>Delete last word</dd>'
        + '<dt><kbd>?</kbd></dt><dd>Show/hide help</dd></dl></div>\n'
        + '<main id="board-main" role="main">\n' + tabsHTML + '\n' + panelsHTML + '\n</main>\n'
        + '<footer role="contentinfo"><p>AlloFlow Symbol Studio \u2022 ' + langName + ' \u2022 Generated ' + new Date().toLocaleDateString() + '</p>'
        + '<div class="a11y-stmt" role="note" aria-label="Accessibility"><strong>\u267F Accessibility</strong>WCAG 2.1 AA \u2022 Keyboard nav \u2022 1 & 2-switch scanning \u2022 High contrast \u2022 Screen reader support \u2022 RTL \u2022 44px targets</div></footer>\n'
        + '<script>' + js + '<\/script>\n</body>\n</html>';
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aacboard_' + (board.title || 'board').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
      addToast && addToast('"' + (board.title || 'Board') + '" saved as accessible HTML \u2014 WCAG 2.1 AA with keyboard nav, scanning & high contrast!', 'success');
    }, [boardLang, addToast]);


    // ── Quick Board HTML export (WCAG 2.1 AA accessible) ──────────────────
    // Exports First-Then boards as standalone accessible HTML with TTS,
    // keyboard activation, high contrast, and WCAG 2.1 AA compliance.
    var exportQuickBoardHTML = useCallback(function (type) {
      var title, bodyHTML, lang = boardLang || 'en';
      var isRtl = lang === 'ar' || lang === 'he';
      var dir = isRtl ? 'rtl' : 'ltr';
      var esc = function (s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

      if (type === 'firstthen') {
        if (!ftFirstImage && !ftThenImage) { addToast && addToast('Generate images first', 'error'); return; }
        title = 'First-Then Board';
        bodyHTML = '<div class="ft-board" role="group" aria-label="First Then Board">'
          + '<div class="ft-cell" role="button" tabindex="0" data-speak="' + esc(ftFirstLabel || 'First') + '" aria-label="First: ' + esc(ftFirstLabel || 'activity') + '">'
          + '<div class="ft-header" style="background:#f59e0b;">FIRST</div>'
          + (ftFirstImage ? '<img src="' + ftFirstImage + '" alt="' + esc(ftFirstLabel || 'First activity') + '">' : '<div class="ft-placeholder">?</div>')
          + '<div class="ft-label">' + esc(ftFirstLabel || '') + '</div></div>'
          + '<div class="ft-arrow" aria-hidden="true">\u2192</div>'
          + '<div class="ft-cell" role="button" tabindex="0" data-speak="' + esc(ftThenLabel || 'Then') + '" aria-label="Then: ' + esc(ftThenLabel || 'reward') + '">'
          + '<div class="ft-header" style="background:#22c55e;">THEN</div>'
          + (ftThenImage ? '<img src="' + ftThenImage + '" alt="' + esc(ftThenLabel || 'Then activity') + '">' : '<div class="ft-placeholder">?</div>')
          + '<div class="ft-label">' + esc(ftThenLabel || '') + '</div></div></div>';
      } else { return; }

      var css = [
        '*, *::before, *::after { box-sizing: border-box; }',
        'body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; flex-direction: column; min-height: 100vh; user-select: none; }',
        '.skip-link { position: absolute; left: -9999px; top: auto; width: 1px; height: 1px; overflow: hidden; }',
        '.skip-link:focus { position: fixed; left: 0; top: 0; width: auto; height: auto; padding: 8px 16px; background: #1e293b; color: #fff; font-weight: 700; z-index: 10000; outline: 3px solid #facc15; }',
        'header { background: linear-gradient(135deg, #7c3aed, #4338ca); color: #fff; padding: 12px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }',
        'header h1 { margin: 0; font-size: 18px; font-weight: 800; }',
        '.controls { display: flex; gap: 6px; ' + (isRtl ? 'margin-right:auto;' : 'margin-left:auto;') + ' }',
        '.ctrl-btn { border: none; border-radius: 8px; padding: 8px 14px; font-weight: 700; font-size: 13px; cursor: pointer; min-height: 44px; min-width: 44px; }',
        '.ctrl-btn:focus-visible { outline: 3px solid #facc15; outline-offset: 2px; }',
        'main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }',
        '.ft-board { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }',
        '.ft-cell { border-radius: 16px; overflow: hidden; border: 4px solid #e5e7eb; background: #fff; width: 280px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }',
        '.ft-cell:focus-visible { outline: 4px solid #4f46e5; outline-offset: 3px; box-shadow: 0 0 0 8px rgba(79,70,229,0.25); }',
        '.ft-cell:active { transform: scale(0.96); }',
        '.ft-cell.flash { box-shadow: 0 0 0 6px #facc15; transform: scale(1.03); }',
        '.ft-header { padding: 16px; text-align: center; color: #fff; font-weight: 900; font-size: 28px; letter-spacing: 0.1em; }',
        '.ft-cell img { width: 100%; height: 220px; object-fit: contain; background: #fafafa; display: block; }',
        '.ft-placeholder { width: 100%; height: 220px; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #d1d5db; background: #fafafa; }',
        '.ft-label { padding: 18px; text-align: center; font-weight: 800; font-size: 24px; color: #1f2937; }',
        '.ft-arrow { font-size: 72px; color: #6b7280; flex-shrink: 0; }',
        'footer { text-align: center; padding: 12px; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; }',
        '#live { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }',
        'body.hc { background: #000; } body.hc header { background: #000; border-bottom: 3px solid #fff; }',
        'body.hc .ft-cell { border-color: #fff; background: #000; } body.hc .ft-label { color: #fff; }',
        'body.hc .ft-header { border-bottom: 2px solid #fff; }',
        'body.hc .ft-cell:focus-visible { outline-color: #facc15; } body.hc .ft-arrow { color: #fff; }',
        'body.hc .ctrl-btn { border: 2px solid #fff; } body.hc footer { color: #ccc; border-color: #fff; }',
        '@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }',
        '@media (forced-colors: active) { .ft-cell { border: 3px solid CanvasText; } .ft-cell:focus-visible { outline: 3px solid Highlight; } }',
        '@media print { header, .controls, #live, footer { display: none !important; } body { background: #fff; } .ft-cell { border: 2px solid #333; } }',
      ].join('\n');

      var js = '(function(){'
        + 'function sp(el){var t=el.getAttribute("data-speak");if(!t)return;'
        + 'if(window.speechSynthesis){window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.lang="' + lang + '";window.speechSynthesis.speak(u);}'
        + 'var l=document.getElementById("live");if(l){l.textContent="";setTimeout(function(){l.textContent=t+" selected";},50);}'
        + 'el.classList.add("flash");setTimeout(function(){el.classList.remove("flash");},400);}'
        + 'document.addEventListener("click",function(e){var c=e.target.closest(".ft-cell");if(c)sp(c);});'
        + 'document.addEventListener("keydown",function(e){var a=document.activeElement;if(a&&a.classList.contains("ft-cell")){if(e.key==="Enter"||e.key===" "){e.preventDefault();sp(a);}}});'
        + 'function hc(){document.body.classList.toggle("hc");}'
        + 'window.hc=hc;'
        + '})();';

      var html = '<!DOCTYPE html>\n<html lang="' + lang + '" dir="' + dir + '">\n<head>\n'
        + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        + '<title>' + title + ' \u2014 AlloFlow Quick Board</title>\n'
        + '<style>\n' + css + '\n</style>\n</head>\n<body>\n'
        + '<a href="#board" class="skip-link">Skip to board</a>\n'
        + '<div id="live" role="status" aria-live="assertive" aria-atomic="true"></div>\n'
        + '<header role="banner"><h1>' + title + '</h1>'
        + '<nav class="controls" aria-label="Controls">'
        + '<button class="ctrl-btn" onclick="hc()" aria-label="Toggle high contrast" style="background:#334155;color:#fff;">\u25FC\uFE0F Contrast</button>'
        + '</nav></header>\n'
        + '<main id="board" role="main">\n' + bodyHTML + '\n</main>\n'
        + '<footer role="contentinfo"><p>AlloFlow \u2022 Quick Board \u2022 Generated ' + new Date().toLocaleDateString() + '</p></footer>\n'
        + '<script>' + js + '<\/script>\n</body>\n</html>';

      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = type + '_board.html';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
      addToast && addToast('Quick Board exported as accessible HTML!', 'success');
    }, [boardLang, ftFirstLabel, ftFirstImage, ftThenLabel, ftThenImage, addToast]);


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
      recordFamiliarity(label, 'speak');
      var voice = selectedVoice || 'Kore';
      onCallTTS(label, voice, 1).then(function (url) {
        if (url) { var a = new Audio(url); a.play().catch(function () {}); }
      }).catch(function () {});
    }, [onCallTTS, selectedVoice, recordFamiliarity]);

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
      if (cloudSync && !isCanvasEnv) setTimeout(function () { syncToCloud(); }, 300);
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
        // Enrich story with garden vocabulary — aided language modeling via narrative
        var gardenVocab = '';
        try {
          var storyBank = computeWordBank();
          var growingWords = storyBank.filter(function (w) { return w.growth === 'sprout' || w.growth === 'growing'; }).map(function (w) { return w.displayLabel; }).slice(0, 6);
          if (growingWords.length >= 2) gardenVocab = '\nIMPORTANT: Naturally incorporate these vocabulary words into the story (the student is currently learning them): ' + growingWords.join(', ') + '. Use each word at least once in a natural context.\n';
        } catch (e) {}
        var prompt = 'Write a social story in Carol Gray format for ' + name + ' about: "' + storySituation.trim() + '".\n'
          + (storyDetails.trim() ? 'Additional details: ' + storyDetails.trim() + '\n' : '')
          + gardenVocab
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
        // Auto-generate illustrations — sequential to avoid rate limiting
        if (onCallImagen) {
          var illMap = {};
          pages.forEach(function (p) { illMap[p.id] = true; });
          setStoryIllustrating(illMap);
          for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var fullPrompt = page.imagePrompt
              ? ('Illustration for a children\'s social story: ' + page.imagePrompt + '. Warm, friendly, child-appropriate watercolor style. Simple composition. White or soft background. STRICTLY NO TEXT.')
              : ('Warm illustration of a child in a social situation, friendly, simple, child-appropriate. NO TEXT.');
            try {
              var img = await genWithRetry(fullPrompt, onCallImagen, onCallGeminiImageEdit, false, avatarRef, 600);
              setStoryPages(function (prev) { var pid = page.id; return prev.map(function (pp) { return pp.id === pid ? Object.assign({}, pp, { image: img }) : pp; }); });
            } catch (illErr) {
              warnLog("Illustration failed for page " + (i + 1) + ":", illErr.message);
            }
            setStoryIllustrating(function (p) { var pid = page.id; var n = Object.assign({}, p); delete n[pid]; return n; });
            // Rate-limit pause between pages (skip after last)
            if (i < pages.length - 1) await new Promise(function (r) { setTimeout(r, 1500); });
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
    // Schema expanded beyond the original {text, type, targetCount} so goals carry the fields SLPs
    // actually need in team meetings: priority tier, baseline level, target date, cue-level required,
    // accommodations, and how trial data is collected. All new fields are optional — older goals
    // loaded from localStorage stay valid (missing fields just don't render in the UI).
    var addIepGoal = useCallback(function (goal) {
      var g = {
        id: Date.now().toString(36),
        text: goal.text || '',
        type: goal.type || 'expressive',  // expressive | receptive | social | pragmatic | articulation
        targetCount: goal.targetCount || 20,
        currentCount: 0,
        trials: [],
        createdAt: new Date().toISOString(),
        profileId: activeProfileId || 'default',
        // New IEP-team fields (all optional)
        priority: goal.priority || 'standard',        // 'high' | 'standard' | 'maintenance'
        baseline: goal.baseline || '',                // free-text starting performance (e.g. "2/10 accuracy")
        targetDate: goal.targetDate || '',            // ISO date string; blank = no deadline
        cueLevel: goal.cueLevel || 'independent',     // 'independent' | 'visual' | 'verbal' | 'gestural' | 'physical'
        accommodations: goal.accommodations || '',    // free-text: supports the student needs during trials
        dataMethod: goal.dataMethod || 'frequency',   // 'frequency' | 'percentage' | 'duration' | 'rubric'
        linkedIepSection: goal.linkedIepSection || '' // e.g. "Communication" / "Social-Emotional" — paper IEP mapping
      };
      setIepGoals(function (prev) { var updated = prev.concat([g]); store(STORAGE_GOALS, updated); return updated; });
      return g;
    }, [activeProfileId]);

    var updateIepGoal = useCallback(function (goalId, patch) {
      setIepGoals(function (prev) {
        var updated = prev.map(function (g) { return g.id === goalId ? Object.assign({}, g, patch) : g; });
        store(STORAGE_GOALS, updated);
        return updated;
      });
    }, []);

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

    // ── Cross-tool bridge: window.AlloStudent ──
    // Publishes the current student profile and their communication goals so that OTHER AlloFlow
    // tools (Document Builder, Leveled Reader, Quiz Gen, etc.) can read them WITHOUT tight
    // coupling to SymbolStudio. The API is intentionally minimal:
    //   window.AlloStudent.getProfile()   → { id, name, description, codename, image } | null
    //   window.AlloStudent.getGoals()     → [ { id, text, type, priority, cueLevel, ... } ]
    //   window.AlloStudent.onChange(cb)   → () => unsubscribe
    // This is the thin-central-store pattern described in the student-profile proposal.
    // When AlloFlow eventually grows a proper StudentProfile module, the same three methods can
    // be reimplemented against that central store and no consumer has to change.
    React.useEffect(function () {
      var api = window.AlloStudent = window.AlloStudent || { _subs: [] };
      var activeProfile = (profiles || []).filter(function (p) { return p.id === activeProfileId; })[0] || null;
      api.getProfile = function () { return activeProfile ? Object.assign({}, activeProfile) : null; };
      api.getGoals = function () { return activeGoals.map(function (g) { return Object.assign({}, g); }); };
      // subscribe/unsubscribe: gives consumers a change notification whenever the student or
      // their goals change. Consumer owns its own re-read via getProfile / getGoals.
      api.onChange = api.onChange || function (cb) {
        if (typeof cb !== 'function') return function () {};
        (api._subs = api._subs || []).push(cb);
        return function () { api._subs = (api._subs || []).filter(function (f) { return f !== cb; }); };
      };
      // Fire subscribers exactly once per render where profile or goals changed. React's effect
      // deps below make this automatic: the effect only runs when the compared values change.
      (api._subs || []).forEach(function (cb) {
        try { cb({ profile: api.getProfile(), goals: api.getGoals() }); } catch (e) { /* subscriber errors don't crash the bridge */ }
      });
    }, [activeProfileId, profiles, iepGoals]);

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
      btn: function (bg, color, disabled) { return { padding: '8px 14px', background: disabled ? '#d1d5db' : (bg || PURPLE), color: disabled ? '#6b7280' : (color || '#fff'), border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }; },
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
      },
        e('span', { style: { fontSize: '14px', position: 'relative' }, 'aria-hidden': 'true' }, t.icon,
          // Garden tab badge — lightweight word count estimate (gallery + board words)
          t.id === 'garden' && !active && (function () {
            var seen = {}; var ct = 0;
            gallery.forEach(function (s) { var k = s.label.trim().toLowerCase(); if (k && !seen[k]) { seen[k] = 1; ct++; } });
            savedBoards.forEach(function (b) { (b.words || []).forEach(function (w) { var k = w.label.trim().toLowerCase(); if (k && !seen[k]) { seen[k] = 1; ct++; } }); });
            if (ct === 0) return null;
            return e('span', { style: { position: 'absolute', top: '-4px', right: '-8px', background: '#059669', color: '#fff', fontSize: '8px', fontWeight: 800, borderRadius: '6px', padding: '0 4px', lineHeight: '14px', minWidth: '14px', textAlign: 'center' } }, ct > 99 ? '99+' : ct);
          })()),
        t.label);
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

    // ── Symbol Search state ──
    var STORAGE_SEARCH_STATS = 'alloSymbolSearchStats';
    var _srchMode = useState('menu'); var srchMode = _srchMode[0]; var setSrchMode = _srchMode[1];
    var _srchDifficulty = useState(3); var srchDifficulty = _srchDifficulty[0]; var setSrchDifficulty = _srchDifficulty[1]; // 2-6 options
    var _srchTarget = useState(null); var srchTarget = _srchTarget[0]; var setSrchTarget = _srchTarget[1];
    var _srchOptions = useState([]); var srchOptions = _srchOptions[0]; var setSrchOptions = _srchOptions[1];
    var _srchFeedback = useState(null); var srchFeedback = _srchFeedback[0]; var setSrchFeedback = _srchFeedback[1];
    var _srchScore = useState(0); var srchScore = _srchScore[0]; var setSrchScore = _srchScore[1];
    var _srchTotal = useState(0); var srchTotal = _srchTotal[0]; var setSrchTotal = _srchTotal[1];
    var _srchCorrect = useState(0); var srchCorrect = _srchCorrect[0]; var setSrchCorrect = _srchCorrect[1];
    var _srchStreak = useState(0); var srchStreak = _srchStreak[0]; var setSrchStreak = _srchStreak[1];
    var _srchBest = useState(0); var srchBest = _srchBest[0]; var setSrchBest = _srchBest[1];
    var _srchSpeaking = useState(false); var srchSpeaking = _srchSpeaking[0]; var setSrchSpeaking = _srchSpeaking[1];
    var _srchRevealed = useState(false); var srchRevealed = _srchRevealed[0]; var setSrchRevealed = _srchRevealed[1];
    // Listen & Build mode (sentence strip)
    var _srchSentence = useState([]); var srchSentence = _srchSentence[0]; var setSrchSentence = _srchSentence[1];
    var _srchSentenceTarget = useState([]); var srchSentenceTarget = _srchSentenceTarget[0]; var setSrchSentenceTarget = _srchSentenceTarget[1];
    var _srchBuildPool = useState([]); var srchBuildPool = _srchBuildPool[0]; var setSrchBuildPool = _srchBuildPool[1];
    // Persistent stats
    var _srchStats = useState(function () { return load(STORAGE_SEARCH_STATS, { sessions: 0, totalCorrect: 0, totalTrials: 0, bestStreak: 0 }); });
    var srchStats = _srchStats[0]; var setSrchStats = _srchStats[1];
    var srchTimerRef = useRef(null);
    // Pedagogy-improvement refs (session-scoped, no render needed):
    //   srchLastTargetRef — id of the most recently picked target. Blocks back-to-back repetition
    //                       so the student doesn't drift into memory-matching instead of recognition.
    //   srchRecentMissRef — FIFO queue of labels the student recently got wrong. These get a weight
    //                       boost in srchPickRound so failed items come back sooner (real spaced
    //                       repetition behavior, not just "low questCorrect = high weight").
    var srchLastTargetRef = useRef(null);
    var srchRecentMissRef = useRef([]);
    // Keep the recent-miss queue short — 4 entries is enough to guarantee a failed item surfaces
    // within a round or two without dominating the session.
    var SRCH_RECENT_MISS_LIMIT = 4;
    // Errorless learning mode — for pre-receptive / early-intervention students where any wrong
    // answer risks forming an incorrect association. When enabled:
    //   • Forces 2 choices regardless of difficulty setting
    //   • Distractors are drawn from OFF-category pool (maximum contrast)
    //   • Wrong picks don't break streak or count as failed trials; student retries same target
    //   • No red feedback — warm "Try again" + re-speak
    var _srchErrorless = useState(false); var srchErrorless = _srchErrorless[0]; var setSrchErrorless = _srchErrorless[1];
    // Optional session length. `null` = unlimited (legacy behavior). Numeric = auto-end after N trials.
    var _srchSessionLength = useState(null); var srchSessionLength = _srchSessionLength[0]; var setSrchSessionLength = _srchSessionLength[1];
    // Set of labels missed at least once this session. Used to populate the summary card's
    // "words to practice next time" chip row. Ref because we don't need to re-render on changes.
    var srchMissedSetRef = useRef({});
    // Session-level UX state added in the UX refinement pass:
    //   srchCategoryFilter — which symbol category to draw from on the menu (null = all)
    //   srchLastCelebratedStreak — last streak value we already celebrated, prevents re-firing
    //                              the confetti/toast for the same streak after minor re-renders.
    //   srchShowSummary — when true, renders the "session summary" card before returning to menu
    //                     instead of jumping straight back. Populated when the player taps Back.
    var _srchCategoryFilter = useState(null); var srchCategoryFilter = _srchCategoryFilter[0]; var setSrchCategoryFilter = _srchCategoryFilter[1];
    var _srchLastCelebratedStreak = useState(0); var srchLastCelebratedStreak = _srchLastCelebratedStreak[0]; var setSrchLastCelebratedStreak = _srchLastCelebratedStreak[1];
    var _srchShowSummary = useState(false); var srchShowSummary = _srchShowSummary[0]; var setSrchShowSummary = _srchShowSummary[1];
    // Snapshot of the session's final stats (captured when the player ends a session) so the
    // summary card keeps showing numbers even after we've reset srchCorrect/srchTotal/srchStreak.
    var _srchSummaryData = useState(null); var srchSummaryData = _srchSummaryData[0]; var setSrchSummaryData = _srchSummaryData[1];

    // ── Symbol Search logic ──
    // speed: 1.0 = normal, 0.7 = slow replay for students with auditory-processing needs.
    function srchSpeakWord(label, speed) {
      var rate = typeof speed === 'number' ? speed : 1;
      setSrchSpeaking(true);
      setSrchRevealed(false);
      if (onCallTTS) {
        onCallTTS(label, selectedVoice || 'Kore', rate).then(function (url) {
          if (url) {
            var a = new Audio(url);
            // Chain the playback rate onto the Audio element too, so a slow request
            // that gets fulfilled at normal speed still plays back slowly.
            try { a.playbackRate = rate; } catch (_) {}
            a.play().catch(function () {});
          }
          setSrchSpeaking(false);
        }).catch(function () {
          // Fallback to browser TTS
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(label);
            applyVoice(utt);
            utt.rate = rate;
            utt.onend = function () { setSrchSpeaking(false); };
            window.speechSynthesis.speak(utt);
          } else { setSrchSpeaking(false); }
        });
      } else if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        var utt = new SpeechSynthesisUtterance(label);
        applyVoice(utt);
        utt.rate = rate;
        utt.onend = function () { setSrchSpeaking(false); };
        window.speechSynthesis.speak(utt);
      } else { setSrchSpeaking(false); }
    }

    function srchPickRound(mode, pool) {
      if (pool.length < 2) return;
      var famData = familiarity || {};
      var lastId = srchLastTargetRef.current;
      var missSet = {};
      (srchRecentMissRef.current || []).forEach(function (lbl) { missSet[String(lbl).toLowerCase()] = true; });

      // Eligible pool for THIS round's target: exclude the previous round's target to stop
      // back-to-back repetition from becoming a memory game. If the pool has only 2 items
      // (can't avoid repetition), fall back to the full pool — better to repeat than to freeze.
      var targetPool = pool.length > 2 ? pool.filter(function (it) { return it.id !== lastId; }) : pool;

      // Weighted target selection. Same three-tier mastery weighting as before PLUS an explicit
      // "recently missed" boost: if the student just got a word wrong, that word gets +2 so it
      // surfaces again within a round or two. This is what real spaced-repetition does — the
      // old formula only demoted mastered items, never promoted failed ones.
      var target;
      if (targetPool.length >= 4) {
        var weighted = targetPool.map(function (item) {
          var k = item.label.trim().toLowerCase();
          var entry = famData[k];
          var w;
          if (!entry) w = 3;
          else {
            var score = ((entry.taps || 0) + (entry.questCorrect || 0) * 2 + (entry.exposures || 0) * 0.3) / 25;
            if (score < 0.15) w = 3;
            else if (score < 0.45) w = 2;
            else w = 1;
          }
          if (missSet[k]) w += 2; // urgency boost for recently-missed labels
          return { item: item, weight: w };
        });
        var totalWeight = weighted.reduce(function (s, w) { return s + w.weight; }, 0);
        var roll = Math.random() * totalWeight;
        var cum = 0;
        target = weighted[0].item;
        for (var wi = 0; wi < weighted.length; wi++) {
          cum += weighted[wi].weight;
          if (roll < cum) { target = weighted[wi].item; break; }
        }
      } else {
        target = targetPool[Math.floor(Math.random() * targetPool.length)];
      }

      // Pick distractors for a target. Behavior depends on mode:
      //   • Standard: 70% same-category (challenges semantic discrimination) + 30% off-category.
      //   • Errorless: 100% off-category (maximum contrast — answer is obvious so student
      //     builds confidence without risk of forming wrong associations).
      function pickDistractors(forTarget, count) {
        var cat = forTarget.category;
        var sameCat = pool.filter(function (it) { return it.id !== forTarget.id && it.category === cat; });
        var otherCat = pool.filter(function (it) { return it.id !== forTarget.id && it.category !== cat; });
        function shuf(a) {
          for (var si = a.length - 1; si > 0; si--) {
            var sj = Math.floor(Math.random() * (si + 1));
            var st = a[si]; a[si] = a[sj]; a[sj] = st;
          }
          return a;
        }
        shuf(sameCat); shuf(otherCat);
        if (srchErrorless) {
          // Errorless: prefer off-category distractors for maximum visual + semantic contrast.
          // Fall back to same-category only if off-category pool is too thin.
          var ePrimary = otherCat.slice(0, count);
          if (ePrimary.length < count) {
            ePrimary = ePrimary.concat(sameCat.slice(0, count - ePrimary.length));
          }
          return shuf(ePrimary);
        }
        // Standard: 70% same-category, 30% off-category.
        var same = sameCat.slice(0, Math.ceil(count * 0.7));
        var rest = otherCat.slice(0, count - same.length);
        var combined = same.concat(rest);
        if (combined.length < count) {
          var leftover = sameCat.slice(same.length).concat(otherCat.slice(rest.length));
          combined = combined.concat(leftover.slice(0, count - combined.length));
        }
        return shuf(combined);
      }

      if (mode === 'build') {
        // Pick 2-3 word phrase from gallery items
        var phraseLen = Math.min(pool.length, Math.random() < 0.5 ? 2 : 3);
        var phraseWords = [target];
        while (phraseWords.length < phraseLen) {
          var r = pool[Math.floor(Math.random() * pool.length)];
          if (!phraseWords.find(function (w) { return w.id === r.id; })) phraseWords.push(r);
        }
        // Option pool = phrase words + category-aware distractors so "bowl" can appear alongside
        // "cup" and "plate" instead of random unrelated items.
        var extraDistractorCount = Math.max(0, Math.min(pool.length, phraseLen + 3) - phraseWords.length);
        var buildExtras = [];
        if (extraDistractorCount > 0) {
          // Distractors should not already be in phraseWords
          var excludeIds = {};
          phraseWords.forEach(function (p) { excludeIds[p.id] = true; });
          var candidates = pickDistractors(target, extraDistractorCount * 2).filter(function (c) { return !excludeIds[c.id]; });
          buildExtras = candidates.slice(0, extraDistractorCount);
        }
        var buildPool = phraseWords.concat(buildExtras);
        // Shuffle build pool
        for (var bi = buildPool.length - 1; bi > 0; bi--) {
          var bj = Math.floor(Math.random() * (bi + 1));
          var bt = buildPool[bi]; buildPool[bi] = buildPool[bj]; buildPool[bj] = bt;
        }
        setSrchSentenceTarget(phraseWords);
        setSrchSentence([]);
        setSrchBuildPool(buildPool);
        setSrchTarget(phraseWords[0]); // for audio
        setSrchOptions([]);
        setSrchFeedback(null);
        setSrchRevealed(false);
        srchLastTargetRef.current = target.id;
        // Speak the phrase
        var phraseText = phraseWords.map(function (w) { return w.label; }).join(' ');
        setTimeout(function () { srchSpeakWord(phraseText); }, 300);
        return;
      }

      // Listen & Find mode (single word). In errorless mode, force to 2 choices regardless
      // of the difficulty setting — students in errorless mode need maximum success rate.
      var effectiveDifficulty = srchErrorless ? 2 : srchDifficulty;
      var numOpts = Math.max(2, Math.min(effectiveDifficulty, pool.length));
      var opts = [target].concat(pickDistractors(target, numOpts - 1));
      // Shuffle
      for (var si = opts.length - 1; si > 0; si--) {
        var sj = Math.floor(Math.random() * (si + 1));
        var st = opts[si]; opts[si] = opts[sj]; opts[sj] = st;
      }
      setSrchTarget(target);
      setSrchOptions(opts);
      setSrchFeedback(null);
      setSrchRevealed(false);
      srchLastTargetRef.current = target.id;
      // Auto-speak the word after a short delay
      setTimeout(function () { srchSpeakWord(target.label); }, 300);
    }

    // Build the active pool for a round, respecting the category filter set on the menu.
    // Kept in one place so every call site picks up the filter. (Named `srchPool` to avoid
    // colliding with `srchBuildPool`, which is the state variable holding the shuffled option
    // tiles in Listen & Build mode.)
    function srchPool() {
      var p = gallery.filter(function (g) { return g.image; });
      if (srchCategoryFilter) p = p.filter(function (g) { return g.category === srchCategoryFilter; });
      return p;
    }

    // Fires a small celebration toast at streak milestones. The guard in
    // srchLastCelebratedStreak prevents re-firing if a re-render re-runs
    // the check handler for the same streak count.
    function srchMaybeCelebrate(streak) {
      var milestones = [3, 5, 10, 15, 20];
      if (milestones.indexOf(streak) === -1) return;
      if (streak <= srchLastCelebratedStreak) return;
      setSrchLastCelebratedStreak(streak);
      var msg = streak >= 20 ? '🏆 ' + streak + ' in a row! Legendary!' :
                streak >= 15 ? '🎉 ' + streak + ' in a row! Incredible!' :
                streak >= 10 ? '🔥 ' + streak + ' in a row! On fire!' :
                streak >= 5  ? '⚡ ' + streak + ' in a row! Keep going!' :
                                '✨ ' + streak + ' in a row!';
      if (addToast) addToast(msg);
    }

    function srchCheckAnswer(picked) {
      if (!srchTarget) return;
      var correct = picked.id === srchTarget.id;
      // Light haptic (mobile only). Ignored on desktop + Safari where vibrate isn't supported.
      try { if (navigator.vibrate) navigator.vibrate(correct ? 40 : [40, 60, 40]); } catch (_) {}
      // Errorless mode: wrong picks don't count as trials, don't break streak, don't record a
      // failed IEP trial. Student just retries the same target. This is the core errorless-
      // learning contract — no chance to learn the wrong association.
      if (srchErrorless && !correct) {
        setSrchFeedback({ ok: false, msg: '💛 Not that one. Listen again — try "' + srchTarget.label + '".' });
        recordFamiliarity(srchTarget.label, 'exposure');
        // Re-speak the correct label right away so the pairing sticks.
        var speakErrLabel = srchTarget.label;
        setTimeout(function () { srchSpeakWord(speakErrLabel); }, 600);
        // Clear feedback and let the student try again on the SAME target.
        srchTimerRef.current = setTimeout(function () { setSrchFeedback(null); }, 2200);
        return;
      }
      setSrchTotal(function (t) { return t + 1; });
      recordFamiliarity(srchTarget.label, correct ? 'quest-correct' : 'quest-wrong');
      if (!correct && picked.label) recordFamiliarity(picked.label, 'exposure');
      // IEP trial
      var receptiveGoal = activeGoals.find(function (g) { return g.type === 'receptive' && g.currentCount < g.targetCount; });
      if (receptiveGoal) recordIepTrial(receptiveGoal.id, correct, 'search:listen:' + srchTarget.label);
      // Track missed labels for the end-of-session miss list. Use a ref-backed set so we don't
      // re-render the active-session UI on each miss.
      if (!correct) {
        srchMissedSetRef.current = srchMissedSetRef.current || {};
        srchMissedSetRef.current[srchTarget.label] = (srchMissedSetRef.current[srchTarget.label] || 0) + 1;
      }
      if (correct) {
        var ns = srchStreak + 1;
        setSrchStreak(ns);
        if (ns > srchBest) setSrchBest(ns);
        var pts = 10 + (ns >= 5 ? 10 : ns >= 3 ? 5 : 0);
        setSrchScore(function (s) { return s + pts; });
        setSrchCorrect(function (c) { return c + 1; });
        setSrchFeedback({ ok: true, msg: '✅ Correct! +' + pts + (ns >= 3 ? ' 🔥x' + ns : '') });
        srchMaybeCelebrate(ns);
        // Session-length check: auto-end if we've hit the target trial count.
        var nextTotalOk = (srchTotal + 1);
        if (srchSessionLength && nextTotalOk >= srchSessionLength) {
          srchTimerRef.current = setTimeout(function () { srchEndSession(); }, 1200);
        } else {
          srchTimerRef.current = setTimeout(function () { srchPickRound(srchMode, srchPool()); }, 1200);
        }
      } else {
        setSrchStreak(0);
        setSrchLastCelebratedStreak(0);
        setSrchRevealed(true);
        setSrchFeedback({ ok: false, msg: '❌ That was "' + picked.label + '". Listen for "' + srchTarget.label + '".' });
        (function () {
          var q = (srchRecentMissRef.current || []).slice();
          var key = srchTarget.label;
          q = q.filter(function (l) { return l !== key; });
          q.push(key);
          while (q.length > SRCH_RECENT_MISS_LIMIT) q.shift();
          srchRecentMissRef.current = q;
        })();
        var speakTargetLabel = srchTarget.label;
        setTimeout(function () { srchSpeakWord(speakTargetLabel); }, 900);
        var nextTotalMiss = (srchTotal + 1);
        if (srchSessionLength && nextTotalMiss >= srchSessionLength) {
          srchTimerRef.current = setTimeout(function () { srchEndSession(); }, 3000);
        } else {
          srchTimerRef.current = setTimeout(function () { srchPickRound(srchMode, srchPool()); }, 3000);
        }
      }
    }

    function srchCheckBuildAnswer(picked) {
      var nextIdx = srchSentence.length;
      if (nextIdx >= srchSentenceTarget.length) return;
      var expected = srchSentenceTarget[nextIdx];
      var correct = picked.id === expected.id;
      recordFamiliarity(expected.label, correct ? 'quest-correct' : 'quest-wrong');
      if (correct) {
        try { if (navigator.vibrate) navigator.vibrate(40); } catch (_) {}
        var newSentence = srchSentence.concat([picked]);
        setSrchSentence(newSentence);
        if (newSentence.length === srchSentenceTarget.length) {
          // Whole phrase completed
          setSrchTotal(function (t) { return t + 1; });
          setSrchCorrect(function (c) { return c + 1; });
          var ns2 = srchStreak + 1;
          setSrchStreak(ns2);
          if (ns2 > srchBest) setSrchBest(ns2);
          setSrchScore(function (s) { return s + 15 + (ns2 >= 3 ? 5 : 0); });
          setSrchFeedback({ ok: true, msg: '✅ Perfect phrase! "' + srchSentenceTarget.map(function (w) { return w.label; }).join(' ') + '"' });
          // IEP trial for expressive goal
          var expressiveGoal = activeGoals.find(function (g) { return g.type === 'expressive' && g.currentCount < g.targetCount; });
          if (expressiveGoal) recordIepTrial(expressiveGoal.id, true, 'search:build:' + srchSentenceTarget.map(function (w) { return w.label; }).join('+'));
          srchMaybeCelebrate(ns2);
          srchTimerRef.current = setTimeout(function () { srchPickRound('build', srchPool()); }, 1800);
        } else {
          setSrchFeedback({ ok: true, msg: '✅ ' + picked.label + '!' });
        }
      } else {
        setSrchStreak(0);
        setSrchLastCelebratedStreak(0);
        setSrchTotal(function (t) { return t + 1; });
        setSrchFeedback({ ok: false, msg: '❌ Next word should be "' + expected.label + '"' });
        try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (_) {}
        // Track the miss so future rounds surface this label sooner, AND so it shows up on
        // the end-of-session miss list.
        (function () {
          var q = (srchRecentMissRef.current || []).slice();
          q = q.filter(function (l) { return l !== expected.label; });
          q.push(expected.label);
          while (q.length > SRCH_RECENT_MISS_LIMIT) q.shift();
          srchRecentMissRef.current = q;
          srchMissedSetRef.current = srchMissedSetRef.current || {};
          srchMissedSetRef.current[expected.label] = (srchMissedSetRef.current[expected.label] || 0) + 1;
        })();
        // Record IEP trial for Build-mode misses too — was previously only logged on full-phrase
        // success, which masked struggling students in the goal data. Expressive goals need to
        // see failures to pace progress correctly.
        var buildExpressiveGoal = activeGoals.find(function (g) { return g.type === 'expressive' && g.currentCount < g.targetCount; });
        if (buildExpressiveGoal) recordIepTrial(buildExpressiveGoal.id, false, 'search:build:' + expected.label);
        // Partial-retry pedagogy: keep the words the student already locked in correct, and let
        // them re-attempt just the failed position. Speaking only the expected word (not the
        // whole phrase) keeps the audio cue tight and relevant. Previously a wrong pick reset
        // the entire sentence — punitive and unnecessary.
        var expectedLabelForSpeak = expected.label;
        srchTimerRef.current = setTimeout(function () {
          setSrchFeedback(null);
          srchSpeakWord(expectedLabelForSpeak);
        }, 1800);
      }
    }

    function srchStartSession(mode) {
      setSrchMode(mode);
      setSrchScore(0); setSrchTotal(0); setSrchCorrect(0); setSrchStreak(0); setSrchBest(0);
      setSrchLastCelebratedStreak(0);
      setSrchFeedback(null); setSrchSentence([]); setSrchSentenceTarget([]); setSrchBuildPool([]);
      setSrchShowSummary(false); setSrchSummaryData(null);
      // Reset pedagogy refs for a fresh session — last-target, recent-miss queue, and the
      // session-wide miss set shouldn't leak across sessions.
      srchLastTargetRef.current = null;
      srchRecentMissRef.current = [];
      srchMissedSetRef.current = {};
      srchPickRound(mode, srchPool());
      // Increment session count
      setSrchStats(function (prev) {
        var upd = Object.assign({}, prev, { sessions: (prev.sessions || 0) + 1 });
        store(STORAGE_SEARCH_STATS, upd);
        return upd;
      });
    }

    function srchEndSession() {
      if (srchTimerRef.current) clearTimeout(srchTimerRef.current);
      // Persist stats
      setSrchStats(function (prev) {
        var upd = Object.assign({}, prev, {
          totalCorrect: (prev.totalCorrect || 0) + srchCorrect,
          totalTrials: (prev.totalTrials || 0) + srchTotal,
          bestStreak: Math.max(prev.bestStreak || 0, srchBest)
        });
        store(STORAGE_SEARCH_STATS, upd);
        return upd;
      });
      // If the student actually played any rounds this session, capture a snapshot and show
      // the summary card before returning to the menu. Zero-round sessions jump straight back
      // (no point showing a "you got 0/0" recap).
      if (srchTotal > 0) {
        // Sort missed labels by miss count descending — the labels the student struggled with
        // most appear first. That's what the SLP wants to see at the top.
        var missedMap = srchMissedSetRef.current || {};
        var missedLabels = Object.keys(missedMap)
          .sort(function (a, b) { return (missedMap[b] || 0) - (missedMap[a] || 0); })
          .slice(0, 8); // cap at 8 so the card stays scannable
        setSrchSummaryData({
          mode: srchMode,
          correct: srchCorrect,
          total: srchTotal,
          score: srchScore,
          bestStreak: srchBest,
          accuracy: srchTotal > 0 ? Math.round((srchCorrect / srchTotal) * 100) : 0,
          filter: srchCategoryFilter,
          missedLabels: missedLabels,
          errorless: srchErrorless
        });
        setSrchShowSummary(true);
      }
      setSrchMode('menu');
      setSrchTarget(null); setSrchOptions([]); setSrchFeedback(null);
      setSrchSentence([]); setSrchSentenceTarget([]); setSrchBuildPool([]);
    }

    function questPickRound(mode, pool) {
      if (pool.length < 2) return;
      // Garden-aware target selection: prefer words that need practice (sprout/growing)
      var target;
      if (pool.length >= 4) {
        var famData = familiarity || {};
        var weighted = pool.map(function (item) {
          var k = item.label.trim().toLowerCase();
          var entry = famData[k];
          if (!entry) return { item: item, weight: 3 }; // never practiced = high priority
          var score = ((entry.taps || 0) + (entry.questCorrect || 0) * 2 + (entry.exposures || 0) * 0.3) / 25;
          if (score < 0.15) return { item: item, weight: 3 }; // seed
          if (score < 0.45) return { item: item, weight: 2 }; // sprout/growing
          return { item: item, weight: 1 }; // familiar/mastered — still included but less often
        });
        var totalWeight = weighted.reduce(function (s, w) { return s + w.weight; }, 0);
        var roll = Math.random() * totalWeight;
        var cum = 0;
        target = weighted[0].item;
        for (var wi = 0; wi < weighted.length; wi++) {
          cum += weighted[wi].weight;
          if (roll < cum) { target = weighted[wi].item; break; }
        }
      } else {
        target = pool[Math.floor(Math.random() * pool.length)];
      }
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
      // Record familiarity for target and (if wrong) picked symbol
      recordFamiliarity(questTarget.label, correct ? 'quest-correct' : 'quest-wrong');
      if (!correct && picked.label) recordFamiliarity(picked.label, 'exposure');
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
                'aria-label': gm.label + ' game mode', style: { padding: '16px 12px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s, box-shadow 0.15s' },
                onMouseOver: function (ev) { ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.15)'; },
                onMouseOut: function (ev) { ev.currentTarget.style.borderColor = '#e5e7eb'; ev.currentTarget.style.boxShadow = 'none'; }
              },
                e('div', { style: { fontSize: '28px', marginBottom: '6px' } }, gm.icon),
                e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151' } }, gm.label),
                e('div', { style: { fontSize: '10px', color: '#6b7280', marginTop: '3px' } }, gm.desc)
              );
            })
          ),
          // Reset progress
          questTotal > 0 && e('button', {
            onClick: function () { setQuestScore(0); setQuestBoardPos(0); setQuestTotal(0); setQuestCorrectCount(0); setQuestBest(0); },
            'aria-label': 'Reset progress', style: { fontSize: '10px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }
          }, '↻ Reset progress')
        );
      }

      // Active game screen
      var backBtn = e('button', { onClick: function () { setQuestMode('menu'); }, 'aria-label': 'Back', style: S.btn('#f3f4f6', '#374151', false) }, '← Back');
      var scoreBar = e('div', { 'aria-live': 'polite', 'aria-label': 'Score: ' + questScore + ', Round: ' + questRound + ', Progress: ' + questBoardPos + ' of ' + pathLen, style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: '#6b7280' } },
        e('span', { style: { fontWeight: 700, color: PURPLE } }, '⭐ ' + questScore),
        e('span', null, '🎯 Round ' + questRound),
        questStreak >= 2 && e('span', { style: { color: '#f97316', fontWeight: 700, animation: 'pulse 1s infinite' } }, '🔥 x' + questStreak),
        e('span', null, '🏁 ' + questBoardPos + '/' + pathLen)
      );
      var feedbackBar = questFeedback && e('div', { role: 'status', 'aria-live': 'assertive', style: { padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', background: questFeedback.ok ? '#dcfce7' : '#fee2e2', color: questFeedback.ok ? '#166534' : '#991b1b', border: '1px solid ' + (questFeedback.ok ? '#86efac' : '#fca5a5') } }, questFeedback.msg);

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
                'aria-label': 'Answer: ' + opt.label,
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
                'aria-label': 'Select symbol: ' + opt.label,
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
          recordFamiliarity(questTarget.label, correct ? 'quest-correct' : 'quest-wrong');
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
          questTarget && e('div', { style: { fontSize: '11px', color: '#6b7280' } }, questTarget.label.length + ' letters'),
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
            e('button', { onClick: checkSpelling, disabled: !!questFeedback || !questInput.trim(), 'aria-label': 'Check', style: S.btn(PURPLE, '#fff', !!questFeedback || !questInput.trim()) }, 'Check')
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
                e('button', { onClick: function () { initMemory(); }, 'aria-label': 'Play Again', style: Object.assign({}, S.btn(PURPLE, '#fff', false), { marginTop: '12px' }) }, '🔄 Play Again')
              )
            : e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%', maxWidth: '400px' } },
                memCards.map(function (card, idx) {
                  var isUp = memFlipped.includes(idx) || memMatched.includes(card.pairId);
                  return e('button', {
                    key: card.id, onClick: function () { flipCard(idx); },
                    'aria-label': 'Memory card ' + (idx + 1),
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


    // ── Word Garden — vocabulary aggregation, visualization & student view ─
    // Core vocabulary — ~80 highest-frequency AAC words (Baker & Hill 2000; AAC Language Lab)
    // These ~80 words account for approximately 80% of daily communication
    var CORE_VOCAB = 'i,you,it,that,this,me,my,we,he,she,they,the,a,is,do,can,will,have,not,no,yes,more,want,like,go,stop,help,get,put,make,look,come,give,take,turn,open,see,eat,drink,play,read,know,think,feel,say,tell,ask,need,all done,what,where,when,who,how,why,here,there,up,down,in,out,on,off,big,little,good,bad,happy,sad,hot,cold,new,different,same,some,all,again,and,or,but,because,to,for,with,about'.split(',');
    var CORE_SET = {};
    CORE_VOCAB.forEach(function (w) { CORE_SET[w.trim().toLowerCase()] = true; });

    var GROWTH_LEVELS = {
      seed:     { icon: '🌰', label: 'Seed',      color: '#92400e', bg: '#fef3c7', border: '#fbbf24', desc: 'Just planted — appears in one place' },
      sprout:   { icon: '🌱', label: 'Sprout',     color: '#15803d', bg: '#dcfce7', border: '#4ade80', desc: 'Starting to grow — seen in multiple tools' },
      growing:  { icon: '🌿', label: 'Growing',    color: '#047857', bg: '#d1fae5', border: '#34d399', desc: 'Getting stronger — practice is working' },
      blooming: { icon: '🌸', label: 'Blooming',   color: '#7c3aed', bg: '#ede9fe', border: '#a78bfa', desc: 'Almost mastered — generalizing across contexts' },
      mastered: { icon: '🌳', label: 'Mastered',   color: '#b45309', bg: '#fefce8', border: '#facc15', desc: 'Deeply rooted — used spontaneously everywhere' }
    };
    var GROWTH_ORDER = ['seed', 'sprout', 'growing', 'blooming', 'mastered'];
    var CONTEXT_ICONS = { gallery: '🎨', board: '📋', schedule: '📅', story: '📖', quickboard: '⚡', wish: '💫' };

    // Communication functions — maps words to their likely pragmatic purpose
    // Based on AAC clinical practice: SLPs track function distribution in IEP goals
    var COMM_FUNCTIONS = {
      requesting:  { icon: '🗣️', label: 'Requesting', color: '#7c3aed', words: 'want,more,help,give,get,need,can i,please,i want,open,turn on,play,read,eat,drink,go,come here,my turn,more food'.split(',') },
      rejecting:   { icon: '🚫', label: 'Rejecting', color: '#dc2626', words: 'no,stop,all done,don\'t want,not,finished,go away,yucky,leave me,enough'.split(',') },
      commenting:  { icon: '👀', label: 'Commenting', color: '#2563eb', words: 'look,funny,big,little,pretty,cool,yummy,uh oh,wow,good,bad,different,same,new,broken,hot,cold,fast,slow,loud,quiet'.split(',') },
      social:      { icon: '👋', label: 'Social', color: '#059669', words: 'hi,bye,hello,goodbye,thank you,sorry,please,excuse me,good morning,goodnight,good job,welcome,nice,friend,share'.split(',') },
      questioning: { icon: '❓', label: 'Questioning', color: '#d97706', words: 'what,where,when,who,why,how,what is,where is,can i,is it,do you'.split(',') },
      expressing:  { icon: '😊', label: 'Expressing', color: '#ec4899', words: 'happy,sad,angry,scared,tired,frustrated,excited,worried,bored,proud,silly,surprised,hurt,sick,better,love,like'.split(',') }
    };
    var COMM_FN_ORDER = ['requesting', 'rejecting', 'commenting', 'social', 'questioning', 'expressing'];
    function getWordFunction(label) {
      var k = label.trim().toLowerCase();
      for (var i = 0; i < COMM_FN_ORDER.length; i++) {
        var fn = COMM_FN_ORDER[i];
        if (COMM_FUNCTIONS[fn].words.indexOf(k) !== -1) return fn;
      }
      return null;
    }

    // Functional Communication Training (FCT) — maps BehaviorLens behavioral functions
    // to replacement communication vocabulary. The most evidence-based bridge between
    // behavior analysis and communication intervention.
    var FCT_MAP = {
      Attention: {
        icon: '👀', label: 'Attention-Seeking', color: '#3b82f6',
        desc: 'Behavior is maintained by getting attention from others.',
        replacements: ['requesting', 'social', 'commenting'],
        priorityWords: 'look,help,hi,excuse me,come here,play,friend,my turn,look at me,watch me'.split(','),
        tip: 'Teach attention-getting words so the student can access social connection through communication instead of behavior.'
      },
      Escape: {
        icon: '🏃', label: 'Escape/Avoidance', color: '#f59e0b',
        desc: 'Behavior is maintained by avoiding or escaping demands.',
        replacements: ['rejecting', 'expressing'],
        priorityWords: 'break,stop,all done,help,too hard,need help,not now,wait,finished,no'.split(','),
        tip: 'Teach rejection and help-seeking words so the student can appropriately request breaks or assistance.'
      },
      Tangible: {
        icon: '🎁', label: 'Tangible Access', color: '#10b981',
        desc: 'Behavior is maintained by accessing items or activities.',
        replacements: ['requesting', 'questioning'],
        priorityWords: 'want,more,give,my turn,can i,please,open,play,eat,drink'.split(','),
        tip: 'Teach requesting vocabulary so the student can ask for desired items instead of taking them.'
      },
      Sensory: {
        icon: '🌀', label: 'Sensory Regulation', color: '#8b5cf6',
        desc: 'Behavior is maintained by sensory stimulation or avoidance.',
        replacements: ['expressing', 'rejecting'],
        priorityWords: 'too loud,need break,need quiet,need headphones,feel overwhelmed,need to move,need fidget,too bright,deep breath,help'.split(','),
        tip: 'Teach sensory self-advocacy words so the student can communicate their needs before dysregulation.'
      }
    };
    var FCT_FUNCTIONS = ['Attention', 'Escape', 'Tangible', 'Sensory'];

    // ── FCT Phase Templates ────────────────────────────────────────────────
    // Four functions × four pedagogical phases. Each entry is a short word list that
    // the Communication Builder wizard uses to auto-populate a board.
    // Phase 1 = single FCR (Functional Communication Response) — isolated
    // Phase 2 = 3-cell carrier phrase (e.g. "I + WANT + BREAK")
    // Phase 3 = 6-cell mixed (FCR + common frames)
    // Phase 4 = 12-cell with integrated core vocabulary
    // Word lists are derived from FCT_MAP.priorityWords — same data, shaped into phases.
    var FCT_PHASE_TEMPLATES = {
      Attention: {
        1: ['look'],
        2: ['look', 'at', 'me'],
        3: ['look', 'hi', 'come here', 'help', 'play', 'friend'],
        4: ['look', 'hi', 'come here', 'help', 'play', 'friend', 'my turn', 'watch me', 'excuse me', 'please', 'yes', 'no']
      },
      Escape: {
        1: ['break'],
        2: ['I', 'want', 'break'],
        3: ['break', 'stop', 'all done', 'help', 'too hard', 'wait'],
        4: ['break', 'stop', 'all done', 'help', 'too hard', 'wait', 'need help', 'not now', 'finished', 'no', 'yes', 'please']
      },
      Tangible: {
        1: ['want'],
        2: ['I', 'want', 'it'],
        3: ['want', 'more', 'please', 'give', 'my turn', 'eat'],
        4: ['want', 'more', 'please', 'give', 'my turn', 'eat', 'drink', 'play', 'open', 'can I', 'yes', 'no']
      },
      Sensory: {
        1: ['break'],
        2: ['need', 'quiet', 'please'],
        3: ['need break', 'too loud', 'too bright', 'need quiet', 'help', 'deep breath'],
        4: ['need break', 'too loud', 'too bright', 'need quiet', 'need to move', 'need fidget', 'need headphones', 'feel overwhelmed', 'deep breath', 'help', 'yes', 'no']
      }
    };
    // Metadata for each phase, used by the wizard to explain the choice to the teacher.
    var FCT_PHASE_META = {
      1: { label: 'Phase 1 · Single FCR', desc: '1 symbol — teach the replacement in isolation.' },
      2: { label: 'Phase 2 · Carrier phrase', desc: '3 symbols — combine into a short sentence.' },
      3: { label: 'Phase 3 · Mixed', desc: '6 symbols — FCR plus common frames.' },
      4: { label: 'Phase 4 · Integrated', desc: '12 symbols — full board with core vocabulary.' }
    };
    // Word → category mapping for the few FCT-specific words that aren't in any existing
    // template. Prevents every word from defaulting to "other" when applied to a board.
    var FCT_WORD_CATEGORY = {
      'I': 'other', 'me': 'other', 'it': 'other', 'at': 'other',
      'yes': 'other', 'no': 'other', 'please': 'other', 'hi': 'other',
      'more': 'other', 'all done': 'other',
      'look': 'verb', 'want': 'verb', 'need': 'verb', 'give': 'verb',
      'help': 'verb', 'stop': 'verb', 'wait': 'verb', 'come here': 'verb',
      'play': 'verb', 'eat': 'verb', 'drink': 'verb', 'open': 'verb',
      'watch me': 'verb', 'excuse me': 'verb', 'need help': 'verb',
      'need break': 'verb', 'need quiet': 'verb', 'need headphones': 'verb',
      'need to move': 'verb', 'need fidget': 'verb', 'deep breath': 'verb',
      'break': 'noun', 'friend': 'noun', 'my turn': 'noun',
      'too loud': 'adjective', 'too bright': 'adjective', 'too hard': 'adjective',
      'quiet': 'adjective', 'finished': 'adjective', 'feel overwhelmed': 'adjective',
      'not now': 'adjective', 'can I': 'other'
    };
    function fctWordCategory(label) {
      var key = String(label || '').trim().toLowerCase();
      // Scan the map case-insensitively so "I" and "i" both resolve
      var keys = Object.keys(FCT_WORD_CATEGORY);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === key) return FCT_WORD_CATEGORY[keys[i]];
      }
      return 'other';
    }

    function computeWordBank() {
      var bank = {};
      function ensure(lbl, cat) { var k = lbl.trim().toLowerCase(); if (!k) return null; if (!bank[k]) bank[k] = { d: lbl.trim(), cat: cat || 'other', cx: [], img: null, hasVoice: false }; return k; }
      gallery.forEach(function (s) { var k = ensure(s.label, s.category); if (k) { bank[k].cx.push({ type: 'gallery', source: 'Symbol Gallery' }); if (s.image && !bank[k].img) bank[k].img = s.image; } });
      savedBoards.forEach(function (b) { var t = b.title || 'Board';
        (b.words || []).forEach(function (w) { var k = ensure(w.label, w.category); if (k) { bank[k].cx.push({ type: 'board', source: t }); if (w.image && !bank[k].img) bank[k].img = w.image; if (w.audioData) bank[k].hasVoice = true; } });
        (b.pages || []).forEach(function (p) { (p.words || []).forEach(function (w) { var k = ensure(w.label, w.category); if (k) { bank[k].cx.push({ type: 'board', source: t + '/' + (p.title || 'Page') }); if (w.image && !bank[k].img) bank[k].img = w.image; if (w.audioData) bank[k].hasVoice = true; } }); });
      });
      boardWords.forEach(function (w) { var k = ensure(w.label, w.category); if (k && !bank[k].cx.some(function (c) { return c.type === 'board'; })) { bank[k].cx.push({ type: 'board', source: boardTitle || 'Current Board' }); if (w.image && !bank[k].img) bank[k].img = w.image; } if (k && w.audioData) bank[k].hasVoice = true; });
      savedSchedules.forEach(function (sc) { (sc.items || []).forEach(function (it) { var k = ensure(it.label, 'verb'); if (k) { bank[k].cx.push({ type: 'schedule', source: sc.title || 'Schedule' }); if (it.image && !bank[k].img) bank[k].img = it.image; } }); });
      schedItems.forEach(function (it) { var k = ensure(it.label, 'verb'); if (k && !bank[k].cx.some(function (c) { return c.type === 'schedule'; })) { bank[k].cx.push({ type: 'schedule', source: schedTitle || 'Current Schedule' }); if (it.image && !bank[k].img) bank[k].img = it.image; } });
      storyPages.forEach(function (pg, idx) { if (!pg.text) return; var txt = pg.text.toLowerCase(); Object.keys(bank).forEach(function (k) { if (txt.indexOf(k) !== -1 && !bank[k].cx.some(function (c) { return c.type === 'story'; })) bank[k].cx.push({ type: 'story', source: 'Story p.' + (idx + 1) }); }); });
      [{ items: cmItems, s: 'Calming Corner' }, { items: snItems, s: 'Sensory Needs' }, { items: amItems, s: 'Ask Me Board' }, { items: bcItems, s: 'Body Check' }, { items: twItems, s: 'Transitions' }].forEach(function (qs) { qs.items.forEach(function (it) { var k = ensure(it.label, 'other'); if (k) { bank[k].cx.push({ type: 'quickboard', source: qs.s }); if (it.image && !bank[k].img) bank[k].img = it.image; } }); });
      if (ftFirstLabel.trim()) { var k1 = ensure(ftFirstLabel, 'other'); if (k1) bank[k1].cx.push({ type: 'quickboard', source: 'First-Then' }); }
      if (ftThenLabel.trim()) { var k2 = ensure(ftThenLabel, 'other'); if (k2) bank[k2].cx.push({ type: 'quickboard', source: 'First-Then' }); }
      cbItems.forEach(function (it) { if (!it.label || !it.label.trim()) return; var k = ensure(it.label, 'other'); if (k) { bank[k].cx.push({ type: 'quickboard', source: 'Choice Board' }); if (it.image && !bank[k].img) bank[k].img = it.image; } });
      // AAC usage counts from usageLog
      var pid = activeProfileId || '__global__';
      var aacCounts = {};
      var profLog = usageLog[pid] || { sessions: [] };
      (profLog.sessions || []).forEach(function (sess) { (sess.entries || []).forEach(function (en) { var k = en.label.trim().toLowerCase(); aacCounts[k] = (aacCounts[k] || 0) + 1; }); });
      // Add wish seeds — words the student wanted but don't exist yet
      wishSeeds.forEach(function (wish) {
        var k = wish.label.trim().toLowerCase();
        if (!k || bank[k]) return; // skip if already in the bank
        bank[k] = { d: wish.label.trim(), cat: wish.category || 'other', cx: [{ type: 'wish', source: 'Wish Seed — ' + (wish.note || 'student wanted this word') }], img: null };
      });
      // Resolve growth levels — merging context breadth with familiarity depth
      return Object.keys(bank).map(function (key) {
        var w = bank[key]; var ctxT = {}; w.cx.forEach(function (c) { ctxT[c.type] = true; });
        var uc = Object.keys(ctxT).length; var aac = aacCounts[key] || 0;
        var fs = getFamiliarityScore(w.d);
        var famEntry = familiarity[key] || {};
        // Growth: breadth (contexts) × depth (familiarity score from interactions)
        var growth = 'seed';
        if (uc >= 4 && fs >= 0.75) growth = 'mastered';
        else if (uc >= 3 && fs >= 0.45) growth = 'blooming';
        else if (uc >= 3 || fs >= 0.45) growth = 'growing';
        else if (uc >= 2 || fs >= 0.15) growth = 'sprout';
        return { key: key, displayLabel: w.d, category: w.cat, contexts: w.cx, uniqueContextCount: uc,
          contextTypes: Object.keys(ctxT), image: w.img, aacUses: aac, famScore: fs,
          questCorrect: famEntry.questCorrect || 0, questWrong: famEntry.questWrong || 0,
          taps: famEntry.taps || 0, growth: growth, isCore: !!CORE_SET[key], commFn: getWordFunction(w.d), hasVoice: !!w.hasVoice };
      });
    }

    var generateGardenStory = useCallback(async function (bank, studentName) {
      if (!onCallGemini || gardenStoryLoading) return;
      setGardenStoryLoading(true);
      var mastered = bank.filter(function (w) { return w.growth === 'mastered'; }).map(function (w) { return w.displayLabel; });
      var growing = bank.filter(function (w) { return w.growth === 'blooming' || w.growth === 'growing'; }).map(function (w) { return w.displayLabel; });
      var seeds = bank.filter(function (w) { return w.growth === 'seed' || w.growth === 'sprout'; }).map(function (w) { return w.displayLabel; });
      var prompt = 'Write a very short, warm fairy tale (4-5 sentences, simple language suitable for a child) about a magical word garden belonging to a student called ' + (studentName || 'a student') + '. '
        + 'In the garden: ' + (mastered.length > 0 ? mastered.length + ' tall strong trees representing mastered words (' + mastered.slice(0, 6).join(', ') + '). ' : '')
        + (growing.length > 0 ? growing.length + ' growing flowers (' + growing.slice(0, 5).join(', ') + '). ' : '')
        + (seeds.length > 0 ? seeds.length + ' tiny seeds just planted. ' : '')
        + 'The story should celebrate the words as living things and end on a hopeful note about growth. '
        + 'Keep it under 80 words. Do not use markdown formatting. Write in simple, joyful language a young child would enjoy hearing read aloud.';
      try {
        var story = await onCallGemini(prompt, false);
        setGardenStory(story);
      } catch (err) { setGardenStory('Once upon a time, there was a beautiful garden full of words, and every word was growing stronger every day.'); }
      setGardenStoryLoading(false);
    }, [onCallGemini, gardenStoryLoading]);

    var translateGardenWords = useCallback(async function (bank, langCode) {
      if (!onCallGemini || !langCode || langCode === 'en' || gardenTranslating) return;
      setGardenTranslating(true);
      // Only translate words we don't have yet
      var toTranslate = bank.map(function (w) { return w.displayLabel; }).filter(function (label) {
        return !gardenTranslations[label.toLowerCase().trim() + ':' + langCode];
      });
      if (toTranslate.length === 0) { setGardenTranslating(false); return; }
      // Batch in groups of 30
      var batches = [];
      for (var i = 0; i < toTranslate.length; i += 30) batches.push(toTranslate.slice(i, i + 30));
      var langName = (LANG_OPTIONS.find(function (l) { return l.code === langCode; }) || {}).label || langCode;
      var newTranslations = Object.assign({}, gardenTranslations);
      for (var bi = 0; bi < batches.length; bi++) {
        try {
          var prompt = 'Translate these AAC vocabulary words from English to ' + langName + '. These are simple words used by students in communication boards. Return ONLY a JSON array of objects: [{"en":"english word","tl":"translated word"}]. Keep translations simple and natural — use the most common everyday word.\n\nWords: ' + batches[bi].join(', ');
          var result = await onCallGemini(prompt, true);
          var parsed = parseJson(result);
          if (Array.isArray(parsed)) {
            parsed.forEach(function (item) {
              if (item.en && item.tl) newTranslations[item.en.toLowerCase().trim() + ':' + langCode] = item.tl;
            });
          }
        } catch (err) { warnLog('Garden translation batch failed:', err); }
      }
      setGardenTranslations(newTranslations);
      setGardenTranslating(false);
      addToast && addToast('Translated ' + toTranslate.length + ' words to ' + langName + '!', 'success');
    }, [onCallGemini, gardenTranslations, gardenTranslating, addToast]);

    function getTranslation(label, langCode) {
      if (!langCode || langCode === 'en') return null;
      return gardenTranslations[label.toLowerCase().trim() + ':' + langCode] || null;
    }

    function detectGrowthEvents(bank) {
      var events = [];
      var newMap = {};
      bank.forEach(function (w) {
        newMap[w.key] = w.growth;
        var prev = prevGrowthMap[w.key];
        if (prev && prev !== w.growth) {
          var oldIdx = GROWTH_ORDER.indexOf(prev);
          var newIdx = GROWTH_ORDER.indexOf(w.growth);
          if (newIdx > oldIdx) {
            events.push({ word: w.displayLabel, from: prev, to: w.growth, image: w.image, ts: Date.now() });
          }
        }
      });
      if (events.length > 0) {
        setPrevGrowthMap(newMap);
        store(STORAGE_GROWTH_LOG, newMap);
        setGrowthEvents(function (prev) { return events.concat(prev).slice(0, 20); });
        // Speak the celebration if TTS available
        if (onCallTTS && events.length <= 2) {
          var msg = events.map(function (ev) { return ev.word + ' grew to ' + GROWTH_LEVELS[ev.to].label; }).join('. ');
          onCallTTS(msg, selectedVoice || 'Kore', 1).then(function (url) { if (url) new Audio(url).play().catch(function () {}); }).catch(function () {});
        }
      } else if (Object.keys(prevGrowthMap).length === 0 && bank.length > 0) {
        // First run — seed the snapshot without events
        bank.forEach(function (w) { newMap[w.key] = w.growth; });
        setPrevGrowthMap(newMap);
        store(STORAGE_GROWTH_LOG, newMap);
      }
      return events;
    }

    function gardenSuggestions(word) {
      var sug = []; var has = {}; word.contextTypes.forEach(function (t) { has[t] = true; });
      // Wish seeds get a special first suggestion
      if (has.wish && !has.gallery) sug.push({ icon: '💫', text: 'This is a wish seed — the student reached for this word! Create a symbol to make it real.',
        action: function () { setSymLabel(word.displayLabel); setSymCategory(word.category); setTab('symbols'); } });
      if (!has.board) sug.push({ icon: '📋', text: 'Add "' + word.displayLabel + '" to a communication board',
        action: function () {
          setBoardWords(function (prev) {
            if (prev.some(function (w) { return w.label.toLowerCase() === word.key; })) return prev;
            return prev.concat([{ id: uid(), label: word.displayLabel, category: word.category, description: '', image: word.image || null }]);
          });
          setTab('board');
          addToast && addToast('"' + word.displayLabel + '" added to board!', 'success');
        } });
      if (!has.schedule) sug.push({ icon: '📅', text: 'Include in a visual schedule to reinforce in routine contexts' });
      if (!has.story) sug.push({ icon: '📖', text: 'Generate a social story featuring "' + word.displayLabel + '"',
        action: function () { setStorySituation('a child learning to use the word "' + word.displayLabel + '" in everyday situations'); setTab('stories'); } });
      if (!has.gallery && !word.image) sug.push({ icon: '🎨', text: 'Create a symbol image — go to Symbols tab',
        action: function () { setSymLabel(word.displayLabel); setSymCategory(word.category); setTab('symbols'); } });
      if (word.image && word.aacUses === 0) sug.push({ icon: '🎮', text: 'Practice in Symbol Quest to build recognition',
        action: function () { setTab('quest'); setQuestMode('imgToLabel'); questPickRound('imgToLabel', gallery.filter(function (g) { return g.image; })); } });
      if (word.image && word.growth !== 'mastered') sug.push({ icon: '🔍', text: 'Try Symbol Search — hear "' + word.displayLabel + '" and find the symbol',
        action: function () { setTab('search'); srchStartSession('listen'); } });
      if (word.growth === 'mastered') sug.push({ icon: '⭐', text: 'Mastered! Consider introducing related words or multi-word phrases' });
      return sug;
    }

    function renderGrowthCelebrations() {
      if (growthEvents.length === 0) return null;
      // Show recent events (last 30 seconds)
      var now = Date.now();
      var recent = growthEvents.filter(function (ev) { return now - ev.ts < 30000; });
      if (recent.length === 0) return null;
      return e('div', { role: 'alert', 'aria-live': 'assertive', style: { margin: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: '6px' } },
        recent.map(function (ev, i) {
          var fromGl = GROWTH_LEVELS[ev.from]; var toGl = GROWTH_LEVELS[ev.to];
          return e('div', { key: i, className: 'ss-garden-levelup', style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'linear-gradient(135deg, ' + toGl.bg + ', ' + toGl.border + '22)', borderRadius: '12px', border: '2px solid ' + toGl.border, boxShadow: '0 4px 16px ' + toGl.border + '44' } },
            ev.image ? e('img', { src: ev.image, alt: '', style: { width: 36, height: 36, borderRadius: '8px', objectFit: 'contain' } })
              : e('span', { style: { fontSize: '28px' } }, toGl.icon),
            e('div', { style: { flex: 1 } },
              e('div', { style: { fontSize: '14px', fontWeight: 800, color: '#1f2937' } }, '🎉 "' + ev.word + '" grew!'),
              e('div', { style: { fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' } },
                e('span', { style: { color: fromGl.color } }, fromGl.icon + ' ' + fromGl.label),
                e('span', null, '→'),
                e('span', { style: { color: toGl.color, fontWeight: 700 } }, toGl.icon + ' ' + toGl.label))),
            e('button', { onClick: function () { setGrowthEvents(function (prev) { return prev.filter(function (_, j) { return j !== i; }); }); }, 'aria-label': 'Dismiss', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', padding: '4px' } }, '×'));
        }));
    }

    // ── Symbol Search Tab ────────────────────────────────────────────────
    function renderSearchTab() {
      var pool = gallery.filter(function (g) { return g.image; });
      var SEARCH_MODES = [
        { id: 'listen', icon: '🔊', label: 'Listen & Find', desc: 'Hear a word, tap the matching symbol' },
        { id: 'build', icon: '🧩', label: 'Listen & Build', desc: 'Hear a phrase, tap symbols in order to build it' },
      ];

      if (pool.length < 3) {
        return e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#6b7280', padding: '40px' } },
          e('div', { style: { fontSize: '48px' } }, '🔍'),
          e('h3', { style: { fontWeight: 700, color: '#374151' } }, 'Symbol Search'),
          e('p', { style: { fontSize: '13px', textAlign: 'center', maxWidth: '360px' } }, 'Generate at least 3 symbols in the Symbols tab first, then come back to practice finding symbols by listening!')
        );
      }

      // Menu screen
      if (srchMode === 'menu') {
        var allTimeAcc = srchStats.totalTrials > 0 ? Math.round((srchStats.totalCorrect / srchStats.totalTrials) * 100) : 0;
        // Count symbols per category so the category chips can show live counts and auto-disable
        // categories with no symbols (nothing to practice).
        var catCounts = { verb: 0, noun: 0, adjective: 0, other: 0 };
        pool.forEach(function (g) { if (catCounts[g.category] !== undefined) catCounts[g.category]++; });
        var filteredPoolSize = srchCategoryFilter ? (catCounts[srchCategoryFilter] || 0) : pool.length;
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '16px', overflowY: 'auto' } },
          // ── Session summary card (shown briefly after ending a session) ──
          srchShowSummary && srchSummaryData && e('div', {
            style: {
              width: '100%', maxWidth: '420px', padding: '18px 20px',
              background: 'linear-gradient(135deg, #f0fdf4, #ecfccb)',
              border: '2px solid #86efac', borderRadius: '16px',
              boxShadow: '0 6px 20px rgba(34,197,94,0.15)'
            }
          },
            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
              e('div', { style: { fontWeight: 800, fontSize: '14px', color: '#166534' } }, '🎯 Session complete'),
              e('button', { onClick: function () { setSrchShowSummary(false); }, 'aria-label': 'Dismiss session summary', style: { background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px', padding: '0 4px' } }, '✕')
            ),
            e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' } },
              e('div', { style: { textAlign: 'center' } },
                e('div', { style: { fontSize: '22px', fontWeight: 800, color: '#15803d' } }, srchSummaryData.correct + '/' + srchSummaryData.total),
                e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'correct')
              ),
              e('div', { style: { textAlign: 'center' } },
                e('div', { style: { fontSize: '22px', fontWeight: 800, color: PURPLE } }, srchSummaryData.accuracy + '%'),
                e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'accuracy')
              ),
              e('div', { style: { textAlign: 'center' } },
                e('div', { style: { fontSize: '22px', fontWeight: 800, color: '#d97706' } }, srchSummaryData.bestStreak + 'x'),
                e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'best streak')
              )
            ),
            // Miss list — "Words to practice next time". Only shown when there were actually
            // missed items; otherwise a "✓ No misses!" celebration replaces it.
            srchSummaryData.missedLabels && srchSummaryData.missedLabels.length > 0
              ? e('div', { style: { marginBottom: '12px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Words to practice next time'),
                  e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                    srchSummaryData.missedLabels.map(function (lbl, li) {
                      return e('span', {
                        key: li,
                        title: 'Tap to hear',
                        onClick: function () { srchSpeakWord(lbl); },
                        style: { cursor: 'pointer', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }
                      }, lbl);
                    })
                  )
                )
              : (srchSummaryData.total > 0 && e('div', { style: { fontSize: '11px', color: '#166534', fontWeight: 700, marginBottom: '10px', textAlign: 'center' } }, '✨ No misses — every target correct!')),
            e('div', { style: { display: 'flex', gap: '8px' } },
              e('button', {
                onClick: function () { setSrchShowSummary(false); srchStartSession(srchSummaryData.mode); },
                'aria-label': 'Play another session',
                style: Object.assign({}, S.btn(PURPLE, '#fff', false), { flex: 1 })
              }, '▶ Play again'),
              e('button', {
                onClick: function () { setSrchShowSummary(false); },
                'aria-label': 'Dismiss summary',
                style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { flex: 1 })
              }, 'Close')
            )
          ),
          e('div', { style: { fontSize: '48px' } }, '🔍'),
          e('h3', { style: { fontWeight: 800, fontSize: '22px', color: '#374151', margin: 0 } }, 'Symbol Search'),
          e('p', { style: { fontSize: '13px', color: '#6b7280', textAlign: 'center', maxWidth: '420px', margin: 0 } },
            'Train the auditory-to-visual connection that AAC learners need. Hear a word or phrase, then find the matching symbol(s).'),
          // Category filter — lets SLPs run targeted practice sessions (e.g. verbs-only).
          // "All" keeps the default behavior (draws from every category).
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '12px', color: '#374151', maxWidth: '420px' } },
            e('span', { style: { fontWeight: 600 } }, 'Practice:'),
            [
              { id: null, label: 'All', icon: '🎯', count: pool.length },
              { id: 'verb', label: 'Verbs', icon: '🏃', count: catCounts.verb },
              { id: 'noun', label: 'Nouns', icon: '📦', count: catCounts.noun },
              { id: 'adjective', label: 'Adjectives', icon: '🎨', count: catCounts.adjective },
              { id: 'other', label: 'Core', icon: '💬', count: catCounts.other }
            ].map(function (c) {
              var sel = srchCategoryFilter === c.id;
              var disabled = c.count < 3;
              return e('button', {
                key: String(c.id),
                onClick: function () { if (!disabled) setSrchCategoryFilter(c.id); },
                disabled: disabled,
                'aria-label': c.label + (disabled ? ' — need at least 3 symbols' : ' · ' + c.count + ' symbols'),
                'aria-pressed': sel,
                title: disabled ? 'Need at least 3 ' + c.label.toLowerCase() + ' symbols' : c.count + ' symbol' + (c.count === 1 ? '' : 's'),
                style: {
                  padding: '5px 12px', borderRadius: '999px', border: '2px solid ' + (sel ? PURPLE : '#d1d5db'),
                  background: sel ? LIGHT_PURPLE : disabled ? '#f3f4f6' : '#fff',
                  color: sel ? PURPLE : disabled ? '#9ca3af' : '#374151',
                  fontWeight: sel ? 700 : 500, fontSize: '12px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }
              }, c.icon + ' ' + c.label, e('span', { style: { fontSize: '10px', opacity: 0.7, fontWeight: 500 } }, '(' + c.count + ')'));
            })
          ),
          // Difficulty selector. In errorless mode the difficulty is forced to 2 internally,
          // so we visually disable the difficulty chips to avoid confusion about what's in effect.
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151', opacity: srchErrorless ? 0.5 : 1 } },
            e('span', { style: { fontWeight: 600 } }, 'Difficulty:'),
            [2, 3, 4, 6].map(function (n) {
              return e('button', {
                key: n,
                onClick: function () { if (!srchErrorless) setSrchDifficulty(n); },
                disabled: srchErrorless,
                title: srchErrorless ? 'Errorless mode uses 2 choices' : '',
                'aria-label': n + ' options',
                style: {
                  padding: '4px 12px', borderRadius: '16px',
                  border: '2px solid ' + ((!srchErrorless && srchDifficulty === n) ? PURPLE : '#d1d5db'),
                  background: (!srchErrorless && srchDifficulty === n) ? LIGHT_PURPLE : '#f9fafb',
                  color: (!srchErrorless && srchDifficulty === n) ? PURPLE : '#6b7280',
                  fontWeight: (!srchErrorless && srchDifficulty === n) ? 700 : 500, fontSize: '12px',
                  cursor: srchErrorless ? 'not-allowed' : 'pointer'
                }
              }, n + ' choices');
            })
          ),
          // Errorless learning mode toggle — for pre-receptive students. When on, wrong answers
          // don't penalize the student; distractors are always off-category; difficulty forced to 2.
          e('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151', cursor: 'pointer', background: srchErrorless ? '#fef3c7' : 'transparent', padding: '4px 10px', borderRadius: '999px', border: '1px solid ' + (srchErrorless ? '#fcd34d' : 'transparent') } },
            e('input', {
              type: 'checkbox',
              checked: srchErrorless,
              onChange: function (ev) { setSrchErrorless(ev.target.checked); },
              'aria-label': 'Toggle errorless learning mode'
            }),
            e('span', { style: { fontWeight: 600 } }, '💛 Errorless mode'),
            e('span', { style: { fontSize: '10px', color: '#6b7280' } }, '(beginner — wrong picks retry same target)')
          ),
          // Session length selector — optional auto-end after N rounds. Default "Unlimited" matches
          // legacy behavior. Good for structured practice blocks or data-probe sessions.
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151', flexWrap: 'wrap' } },
            e('span', { style: { fontWeight: 600 } }, 'Session length:'),
            [
              { val: null, label: 'Unlimited' },
              { val: 10, label: '10 rounds' },
              { val: 20, label: '20 rounds' },
              { val: 30, label: '30 rounds' }
            ].map(function (opt) {
              var sel = srchSessionLength === opt.val;
              return e('button', {
                key: String(opt.val),
                onClick: function () { setSrchSessionLength(opt.val); },
                'aria-label': opt.label,
                'aria-pressed': sel,
                style: {
                  padding: '4px 12px', borderRadius: '16px', border: '2px solid ' + (sel ? PURPLE : '#d1d5db'),
                  background: sel ? LIGHT_PURPLE : '#f9fafb',
                  color: sel ? PURPLE : '#6b7280',
                  fontWeight: sel ? 700 : 500, fontSize: '12px', cursor: 'pointer'
                }
              }, opt.label);
            })
          ),
          // All-time stats
          srchStats.sessions > 0 && e('div', { style: { display: 'flex', gap: '8px', width: '100%', maxWidth: '400px' } },
            e('div', { style: { flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '8px', textAlign: 'center' } },
              e('div', { style: { fontSize: '18px', fontWeight: 800, color: '#059669' } }, srchStats.totalCorrect),
              e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'all-time correct')
            ),
            e('div', { style: { flex: 1, background: '#faf5ff', borderRadius: '8px', padding: '8px', textAlign: 'center' } },
              e('div', { style: { fontSize: '18px', fontWeight: 800, color: PURPLE } }, allTimeAcc + '%'),
              e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'accuracy')
            ),
            e('div', { style: { flex: 1, background: '#fef3c7', borderRadius: '8px', padding: '8px', textAlign: 'center' } },
              e('div', { style: { fontSize: '18px', fontWeight: 800, color: '#d97706' } }, srchStats.bestStreak + 'x'),
              e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'best streak')
            )
          ),
          // Mode selection — now respects the category filter; if the filtered pool is too
          // small, the mode card becomes disabled and explains why.
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '400px' } },
            SEARCH_MODES.map(function (m) {
              var minPool = m.id === 'build' ? 4 : 3;
              var disabled = filteredPoolSize < minPool;
              return e('button', {
                key: m.id,
                onClick: function () { if (!disabled) srchStartSession(m.id); },
                disabled: disabled,
                'aria-label': m.label,
                style: {
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
                  background: disabled ? '#f9fafb' : 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
                  border: '2px solid ' + (disabled ? '#e5e7eb' : '#c4b5fd'),
                  borderRadius: '14px', cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left', opacity: disabled ? 0.5 : 1, transition: 'all 0.2s'
                }
              },
                e('div', { style: { fontSize: '32px', lineHeight: 1 } }, m.icon),
                e('div', null,
                  e('div', { style: { fontWeight: 700, fontSize: '14px', color: '#374151' } }, m.label),
                  e('div', { style: { fontSize: '11px', color: '#6b7280', marginTop: '2px' } }, m.desc),
                  disabled && e('div', { style: { fontSize: '10px', color: '#f97316', marginTop: '3px' } }, 'Need at least ' + minPool + ' symbols')
                )
              );
            })
          ),
          // Clinical note
          e('div', { style: { maxWidth: '420px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px', fontSize: '11px', color: '#1e40af' } },
            e('strong', null, 'Clinical note: '),
            'Symbol Search trains receptive auditory-to-visual mapping — the core skill AAC learners need to locate symbols from spoken input. ',
            'Listen & Build adds sequential symbol construction for multi-word utterances. ',
            'Results feed into Word Garden familiarity tracking and IEP goal recording.'
          )
        );
      }

      // Active session — controls bar
      var backBtn = e('button', { onClick: function () { srchEndSession(); }, 'aria-label': 'Back to menu', style: S.btn('#f3f4f6', '#374151', false) }, '← Back');
      var pctAcc = srchTotal > 0 ? Math.round((srchCorrect / srchTotal) * 100) : 0;
      // Round counter gives students/SLPs a sense of session length. Starts at 1 once the first
      // round loads so there isn't a confusing "Round 0".
      var roundNum = (srchTotal || 0) + (srchFeedback ? 0 : 1);
      var scoreBar = e('div', { 'aria-live': 'polite', 'aria-label': 'Round ' + roundNum + ', Score: ' + srchScore + ', Accuracy: ' + pctAcc + '%', style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: '#6b7280', flexWrap: 'wrap' } },
        e('span', { style: { fontWeight: 600, color: '#64748b' } }, 'Round ' + roundNum),
        e('span', { style: { fontWeight: 700, color: PURPLE } }, '⭐ ' + srchScore),
        e('span', null, '🎯 ' + srchCorrect + '/' + srchTotal),
        srchStreak >= 2 && e('span', { style: { color: '#f97316', fontWeight: 700 } }, '🔥 x' + srchStreak),
        e('span', null, pctAcc + '% acc')
      );
      var feedbackBar = srchFeedback && e('div', { role: 'status', 'aria-live': 'assertive', style: { padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', background: srchFeedback.ok ? '#dcfce7' : '#fee2e2', color: srchFeedback.ok ? '#166534' : '#991b1b', border: '1px solid ' + (srchFeedback.ok ? '#86efac' : '#fca5a5') } }, srchFeedback.msg);

      // ── Listen & Find mode ──
      if (srchMode === 'listen') {
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', gap: '12px', overflowY: 'auto' } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, backBtn, scoreBar),
          // Audio prompt area — main 🔊 plays at normal speed, 🐢 plays at 0.7× for students
          // with auditory-processing delays or unfamiliar words.
          e('div', { style: { textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', borderRadius: '16px', border: '2px solid #c4b5fd' } },
            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' } }, 'Listen carefully...'),
            e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '10px' } },
              e('button', {
                onClick: function () { if (srchTarget) srchSpeakWord(srchTarget.label); },
                disabled: srchSpeaking,
                'aria-label': 'Play word audio',
                style: {
                  padding: '14px 28px', fontSize: '24px', background: srchSpeaking ? '#e5e7eb' : PURPLE, color: '#fff',
                  border: 'none', borderRadius: '50%', cursor: srchSpeaking ? 'wait' : 'pointer',
                  boxShadow: srchSpeaking ? 'none' : '0 4px 16px rgba(124,58,237,0.3)', transition: 'all 0.2s',
                  width: '72px', height: '72px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }
              }, srchSpeaking ? '⏳' : '🔊'),
              e('button', {
                onClick: function () { if (srchTarget) srchSpeakWord(srchTarget.label, 0.7); },
                disabled: srchSpeaking,
                'aria-label': 'Play word audio at slow speed',
                title: 'Slow replay (0.7× speed)',
                style: {
                  padding: '8px', fontSize: '16px', background: srchSpeaking ? '#e5e7eb' : '#fff', color: PURPLE,
                  border: '2px solid ' + (srchSpeaking ? '#e5e7eb' : '#c4b5fd'),
                  borderRadius: '50%', cursor: srchSpeaking ? 'wait' : 'pointer',
                  width: '48px', height: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }
              }, '🐢')
            ),
            e('div', { style: { marginTop: '8px', fontSize: '12px', color: '#7c3aed', fontWeight: 600 } },
              srchSpeaking ? 'Playing...' : 'Tap 🔊 to hear again · 🐢 for slow'),
            // Reveal hint
            srchRevealed && srchTarget && e('div', { style: { marginTop: '8px', fontSize: '16px', fontWeight: 800, color: '#059669', background: '#dcfce7', display: 'inline-block', padding: '4px 14px', borderRadius: '8px' } },
              '→ ' + srchTarget.label)
          ),
          feedbackBar,
          // Symbol options grid
          e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', padding: '4px' } },
            srchOptions.map(function (opt) {
              var isCorrect = srchFeedback && srchFeedback.ok && opt.id === srchTarget.id;
              var isWrong = srchFeedback && !srchFeedback.ok && srchRevealed && opt.id !== srchTarget.id;
              var isAnswer = srchRevealed && opt.id === srchTarget.id;
              return e('button', {
                key: opt.id,
                onClick: function () { if (!srchFeedback) srchCheckAnswer(opt); },
                disabled: !!srchFeedback,
                'aria-label': 'Symbol: ' + opt.label,
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '14px', cursor: srchFeedback ? 'default' : 'pointer',
                  border: '3px solid ' + (isCorrect ? '#22c55e' : isAnswer ? '#22c55e' : isWrong ? '#fca5a5' : '#e5e7eb'),
                  background: isCorrect ? '#dcfce7' : isAnswer ? '#dcfce7' : isWrong ? '#fee2e2' : '#fff',
                  boxShadow: isCorrect || isAnswer ? '0 0 16px rgba(34,197,94,0.3)' : 'none',
                  transition: 'all 0.15s', transform: isCorrect ? 'scale(1.05)' : 'scale(1)',
                  opacity: isWrong ? 0.5 : 1
                }
              },
                opt.image && e('img', { src: opt.image, alt: '', style: { width: '64px', height: '64px', objectFit: 'contain', borderRadius: '8px' } }),
                (srchRevealed || (srchFeedback && srchFeedback.ok)) && e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#374151' } }, opt.label)
              );
            })
          ),
          // Hint button
          !srchFeedback && !srchRevealed && e('div', { style: { textAlign: 'center' } },
            e('button', {
              onClick: function () { setSrchRevealed(true); },
              'aria-label': 'Show hint',
              style: { fontSize: '11px', color: '#6b7280', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '5px 14px', cursor: 'pointer' }
            }, '💡 Show word hint')
          )
        );
      }

      // ── Listen & Build mode ──
      if (srchMode === 'build') {
        var phraseText = srchSentenceTarget.map(function (w) { return w.label; }).join(' ');
        var nextIdx = srchSentence.length;
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', gap: '12px', overflowY: 'auto' } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, backBtn, scoreBar),
          // Audio prompt
          e('div', { style: { textAlign: 'center', padding: '16px', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', borderRadius: '16px', border: '2px solid #c4b5fd' } },
            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' } }, 'Build the phrase:'),
            e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '10px' } },
              e('button', {
                onClick: function () { srchSpeakWord(phraseText); },
                disabled: srchSpeaking,
                'aria-label': 'Replay phrase',
                style: {
                  padding: '12px 24px', fontSize: '20px', background: srchSpeaking ? '#e5e7eb' : PURPLE, color: '#fff',
                  border: 'none', borderRadius: '50%', cursor: srchSpeaking ? 'wait' : 'pointer',
                  boxShadow: srchSpeaking ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
                  width: '64px', height: '64px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }
              }, srchSpeaking ? '⏳' : '🔊'),
              e('button', {
                onClick: function () { srchSpeakWord(phraseText, 0.7); },
                disabled: srchSpeaking,
                'aria-label': 'Replay phrase at slow speed',
                title: 'Slow replay (0.7× speed)',
                style: {
                  padding: '8px', fontSize: '14px', background: srchSpeaking ? '#e5e7eb' : '#fff', color: PURPLE,
                  border: '2px solid ' + (srchSpeaking ? '#e5e7eb' : '#c4b5fd'),
                  borderRadius: '50%', cursor: srchSpeaking ? 'wait' : 'pointer',
                  width: '44px', height: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }
              }, '🐢')
            ),
            e('div', { style: { marginTop: '6px', fontSize: '11px', color: '#7c3aed', fontWeight: 600 } },
              srchSpeaking ? 'Playing...' : srchSentenceTarget.length + ' words — 🔊 normal · 🐢 slow'),
            // Reveal full phrase hint
            srchRevealed && e('div', { style: { marginTop: '8px', fontSize: '14px', fontWeight: 800, color: '#059669', background: '#dcfce7', display: 'inline-block', padding: '4px 14px', borderRadius: '8px' } },
              phraseText)
          ),
          feedbackBar,
          // Sentence strip — shows progress
          e('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', padding: '8px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', minHeight: '60px', alignItems: 'center', flexWrap: 'wrap' } },
            srchSentenceTarget.map(function (w, idx) {
              var filled = idx < srchSentence.length;
              var isCurrent = idx === nextIdx;
              return e('div', {
                key: idx,
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  padding: '6px 10px', borderRadius: '10px', minWidth: '60px',
                  border: '2px ' + (filled ? 'solid #22c55e' : isCurrent ? 'dashed ' + PURPLE : 'dashed #d1d5db'),
                  background: filled ? '#dcfce7' : isCurrent ? LIGHT_PURPLE : '#fff'
                }
              },
                filled
                  ? (srchSentence[idx].image && e('img', { src: srchSentence[idx].image, alt: '', style: { width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px' } }))
                  : e('div', { style: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: isCurrent ? PURPLE : '#d1d5db' } }, isCurrent ? '?' : '·'),
                filled && e('div', { style: { fontSize: '9px', fontWeight: 600, color: '#166534' } }, srchSentence[idx].label)
              );
            })
          ),
          // Build pool — available symbols to choose from
          e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', padding: '4px' } },
            srchBuildPool.map(function (opt) {
              var alreadyUsed = srchSentence.some(function (s) { return s.id === opt.id; });
              return e('button', {
                key: opt.id,
                onClick: function () { if (!alreadyUsed && nextIdx < srchSentenceTarget.length) srchCheckBuildAnswer(opt); },
                disabled: alreadyUsed,
                'aria-label': 'Symbol: ' + opt.label,
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '10px 6px', borderRadius: '12px', cursor: alreadyUsed ? 'default' : 'pointer',
                  border: '2px solid ' + (alreadyUsed ? '#d1fae5' : '#e5e7eb'),
                  background: alreadyUsed ? '#f0fdf4' : '#fff',
                  opacity: alreadyUsed ? 0.4 : 1, transition: 'all 0.15s'
                }
              },
                opt.image && e('img', { src: opt.image, alt: '', style: { width: '52px', height: '52px', objectFit: 'contain', borderRadius: '6px' } }),
                e('div', { style: { fontSize: '10px', fontWeight: 600, color: alreadyUsed ? '#9ca3af' : '#374151' } }, opt.label)
              );
            })
          ),
          // Controls
          e('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            !srchRevealed && e('button', {
              onClick: function () { setSrchRevealed(true); },
              'aria-label': 'Show phrase hint',
              style: { fontSize: '11px', color: '#6b7280', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '5px 14px', cursor: 'pointer' }
            }, '💡 Show phrase'),
            e('button', {
              onClick: function () {
                setSrchSentence([]);
                setSrchFeedback(null);
                srchSpeakWord(phraseText);
              },
              'aria-label': 'Reset phrase',
              style: { fontSize: '11px', color: '#6b7280', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '5px 14px', cursor: 'pointer' }
            }, '↻ Reset')
          )
        );
      }

      // Fallback
      return e('div', null, 'Unknown mode');
    }

    function renderGardenTab() {
      var bank = computeWordBank();
      var counts = { seed: 0, sprout: 0, growing: 0, blooming: 0, mastered: 0 };
      bank.forEach(function (w) { counts[w.growth] = (counts[w.growth] || 0) + 1; });
      var total = bank.length;
      // Detect growth events
      detectGrowthEvents(bank);
      // Empty state
      if (total === 0) {
        return e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px', textAlign: 'center' } },
          e('div', { style: { fontSize: '64px' } }, '🌱'),
          e('h3', { style: { fontWeight: 700, color: '#374151', margin: 0 } }, 'Your Word Garden'),
          e('p', { style: { fontSize: '13px', color: '#6b7280', maxWidth: '380px', lineHeight: 1.6 } }, 'Every word your student encounters is a seed. Create symbols, build boards, add schedules, or write stories — and watch each word grow as it appears in more places.'),
          e('p', { style: { fontSize: '11px', color: '#9ca3af', maxWidth: '340px', fontStyle: 'italic' } }, 'Words grow strongest when they appear across multiple tools — that\'s aided language modeling in action.'));
      }
      // ── Student View ──
      if (gardenStudentView) {
        var sName = activeProfile.codename || activeProfile.name || 'Your';
        var grouped = {}; GROWTH_ORDER.forEach(function (lv) { grouped[lv] = []; }); bank.forEach(function (w) { grouped[w.growth].push(w); });
        var milestone = null;
        if (total >= 100) milestone = { icon: '🏆', text: '100 words! Vocabulary champion!' };
        else if (total >= 50) milestone = { icon: '🌟', text: '50 words! Amazing garden!' };
        else if (total >= 25) milestone = { icon: '🎉', text: '25 words! Really growing!' };
        else if (total >= 10) milestone = { icon: '🌻', text: '10 words planted!' };
        var rowBg = { seed: 'linear-gradient(180deg,#fef3c7,#fde68a)', sprout: 'linear-gradient(180deg,#dcfce7,#bbf7d0)', growing: 'linear-gradient(180deg,#d1fae5,#a7f3d0)', blooming: 'linear-gradient(180deg,#ede9fe,#ddd6fe)', mastered: 'linear-gradient(180deg,#fefce8,#fef08a)' };
        var renderBed = function (level) {
          var words = grouped[level]; if (!words.length) return null; var gl = GROWTH_LEVELS[level];
          return e('div', { key: level, style: { background: rowBg[level], borderRadius: '16px', padding: '14px 16px', marginBottom: '10px' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' } },
              e('span', { style: { fontSize: '20px' } }, gl.icon), e('span', { style: { fontSize: '14px', fontWeight: 700, color: gl.color } }, gl.label), e('span', { style: { fontSize: '12px', color: gl.color, opacity: 0.7 } }, '(' + words.length + ')')),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' } },
              words.map(function (w) {
                var animClass = level === 'seed' ? 'ss-garden-seed' : level === 'mastered' ? 'ss-garden-mastered' : '';
                return e('div', { key: w.key, className: animClass,
                  onClick: function (ev) {
                    // Tap feedback: pulse animation + speak word
                    var el = ev.currentTarget; el.classList.remove('ss-garden-tapped');
                    void el.offsetWidth; el.classList.add('ss-garden-tapped');
                    setTimeout(function () { el.classList.remove('ss-garden-tapped'); }, 500);
                    recordFamiliarity(w.displayLabel, 'aac-tap');
                    if (onCallTTS) { onCallTTS(w.displayLabel, selectedVoice || 'Kore', 1).then(function (u) { if (u) new Audio(u).play().catch(function () {}); }).catch(function () {}); }
                  },
                  'aria-label': w.displayLabel + ' — tap to hear',
                  role: 'button', tabIndex: 0,
                  onKeyDown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.currentTarget.click(); } },
                  style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', background: 'rgba(255,255,255,0.85)', borderRadius: '14px', border: '3px solid ' + gl.border, cursor: 'pointer', minWidth: '80px', maxWidth: '100px', transition: 'transform 0.2s', boxShadow: level === 'mastered' ? '0 0 12px rgba(250,204,21,0.4)' : '0 2px 6px rgba(0,0,0,0.06)' } },
                  w.image ? e('img', { src: w.image, alt: w.displayLabel, style: { width: '56px', height: '56px', objectFit: 'contain', borderRadius: '10px' } })
                    : e('div', { style: { width: '56px', height: '56px', borderRadius: '10px', background: gl.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' } }, gl.icon),
                  e('div', { style: { fontSize: '13px', fontWeight: 700, color: '#1f2937', textAlign: 'center', lineHeight: 1.2 } },
                    w.displayLabel, w.hasVoice && e('span', { style: { marginLeft: '3px', fontSize: '10px' }, title: 'Has a loved one\'s voice' }, '❤️')),
                  gardenHomeLang && getTranslation(w.displayLabel, gardenHomeLang) && e('div', { style: { fontSize: '10px', fontWeight: 600, color: '#6366f1', textAlign: 'center', lineHeight: 1.1, fontStyle: 'italic' } }, getTranslation(w.displayLabel, gardenHomeLang)));
              })));
        };
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg,#e0f2fe 0%,#f0fdf4 40%,#fefce8 80%,#fef3c7 100%)' } },
          e('div', { style: { padding: '20px 20px 10px', textAlign: 'center', flexShrink: 0 } },
            e('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' } },
              e('button', { onClick: function () { setGardenStudentView(false); }, 'aria-label': 'Teacher view', style: { fontSize: '10px', color: '#6b7280', background: 'rgba(255,255,255,0.7)', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' } }, '👩‍🏫 Teacher View')),
            e('div', { style: { fontSize: '36px', marginBottom: '4px' } }, '🌱'),
            e('h2', { style: { fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 4px' } }, sName + '\'s Word Garden'),
            e('p', { style: { fontSize: '16px', fontWeight: 600, color: '#059669', margin: 0 } }, total + ' words growing!'),
            milestone && e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 16px', background: '#fef9c3', borderRadius: '20px', border: '2px solid #facc15', fontSize: '14px', fontWeight: 700, color: '#92400e' } }, e('span', null, milestone.icon), e('span', null, milestone.text)),
            // Lexical diversity celebration (student-friendly)
            (function () {
              var pid = activeProfileId || '__global__';
              var pLog = usageLog[pid] || { sessions: [] };
              var tw = 0; var uw = {};
              (pLog.sessions || []).forEach(function (s) { (s.entries || []).forEach(function (en) { if (en.label === '__UTTERANCE__') return; tw++; uw[en.label.trim().toLowerCase()] = true; }); });
              if (tw < 10) return null;
              var ld = Object.keys(uw).length / tw;
              if (ld >= 0.5) return e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '4px 12px', background: '#dbeafe', borderRadius: '16px', border: '1px solid #93c5fd', fontSize: '12px', fontWeight: 600, color: '#1e40af' } }, e('span', null, '🌈'), e('span', null, 'Using lots of different words!'));
              return null;
            })(),
            // The answer — for Dr. Pomeranz, who gave his son science fiction and believed consciousness lives in unexpected places
            total === 42 && e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '4px 12px', background: 'linear-gradient(135deg, #fef9c3, #fef3c7)', borderRadius: '16px', border: '2px solid #fbbf24', fontSize: '12px', fontWeight: 700, color: '#92400e' }, title: 'The Answer to Life, the Universe, and Everything — starts with knowing what to say' }, e('span', null, '✨'), e('span', null, '42 — the answer is in the questions you ask')),
            // "Hear My Words" — speaks all mastered words aloud, a celebration of voice
            grouped.mastered.length > 0 && e('button', {
              onClick: function () {
                // Start with an introduction, then speak each word
                var intro = sName + '\'s words:';
                var words = [intro].concat(grouped.mastered.map(function (w) { return w.displayLabel; }));
                var idx = 0;
                var speakNext = function () {
                  if (idx >= words.length || !onCallTTS) return;
                  var word = words[idx]; idx++;
                  onCallTTS(word, selectedVoice || 'Kore', 1).then(function (url) {
                    if (url) {
                      var a = new Audio(url);
                      a.onended = function () { setTimeout(speakNext, 400); };
                      a.play().catch(function () { setTimeout(speakNext, 400); });
                    } else { setTimeout(speakNext, 400); }
                  }).catch(function () { setTimeout(speakNext, 400); });
                };
                speakNext();
              },
              'aria-label': 'Hear all mastered words spoken aloud',
              style: { marginTop: '10px', padding: '8px 20px', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '24px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', letterSpacing: '0.3px' }
            }, '🔊 Hear My Words'),
            // "My Garden Story" — AI-generated fairy tale about the student's vocabulary
            total >= 3 && onCallGemini && e('button', {
              onClick: function () { generateGardenStory(bank, sName); },
              disabled: gardenStoryLoading,
              'aria-label': 'Generate a story about your word garden',
              style: { marginTop: '6px', padding: '8px 20px', background: gardenStoryLoading ? '#d1d5db' : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', color: '#fff', border: 'none', borderRadius: '24px', fontSize: '14px', fontWeight: 700, cursor: gardenStoryLoading ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }
            }, gardenStoryLoading ? '✨ Growing a story...' : '📖 My Garden Story'),
            // "Print My Garden" — printable poster for the student's desk
            total >= 3 && e('button', {
              onClick: function () { printGardenPoster(bank, grouped, sName, total, counts); },
              'aria-label': 'Print garden poster',
              style: { marginTop: '6px', padding: '8px 20px', background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', color: '#fff', border: 'none', borderRadius: '24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(180,83,9,0.3)' }
            }, '🖨️ Print My Garden')),
          // Story display
          gardenStory && e('div', { style: { margin: '0 16px', padding: '16px', background: 'rgba(255,255,255,0.9)', borderRadius: '14px', border: '2px solid #a7f3d0', boxShadow: '0 2px 10px rgba(5,150,105,0.1)' } },
            e('p', { style: { fontSize: '15px', color: '#1f2937', lineHeight: 1.7, margin: '0 0 10px', fontFamily: 'Georgia, serif' } }, gardenStory),
            e('button', {
              onClick: function () {
                if (!onCallTTS || !gardenStory) return;
                onCallTTS(gardenStory, selectedVoice || 'Kore', 0.9).then(function (url) {
                  if (url) { var a = new Audio(url); a.play().catch(function () {}); }
                }).catch(function () {});
              },
              'aria-label': 'Read the garden story aloud',
              style: { padding: '5px 14px', background: '#d1fae5', border: '1px solid #34d399', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#047857', cursor: 'pointer' }
            }, '🔊 Read Aloud')),
          renderGrowthCelebrations(),
          e('div', { style: { flex: 1, overflowY: 'auto', padding: '0 16px 20px' } },
            // Wish stars — floating above the garden
            (function () {
              var profileWishes = wishSeeds.filter(function (w) {
                return (w.profileId === (activeProfileId || 'default') || !w.profileId) && !bank.some(function (b) { return b.key === w.label.trim().toLowerCase() && b.uniqueContextCount >= 2; });
              });
              if (profileWishes.length === 0) return null;
              return e('div', { style: { background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '16px', padding: '14px 16px', marginBottom: '10px', textAlign: 'center' } },
                e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px' } }, '💫 Wishes waiting to grow'),
                e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' } },
                  profileWishes.map(function (w, i) {
                    return e('span', { key: i, className: 'ss-garden-seed', style: { padding: '4px 12px', background: 'rgba(196,181,253,0.2)', border: '1px solid #7c3aed', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: '#e0e7ff' } }, '💫 ' + w.label);
                  })),
                e('p', { style: { fontSize: '10px', color: '#818cf8', margin: '8px 0 0', fontStyle: 'italic' } }, 'These words are waiting to become real'));
            })(),
            ['mastered', 'blooming', 'growing', 'sprout', 'seed'].map(renderBed)));
      }
      // ── Teacher View ──
      var filtered = bank;
      if (gardenFilter === 'core') filtered = filtered.filter(function (w) { return w.isCore; });
      else if (gardenFilter !== 'all') filtered = filtered.filter(function (w) { return w.growth === gardenFilter; });
      if (gardenSearch.trim()) { var q = gardenSearch.trim().toLowerCase(); filtered = filtered.filter(function (w) { return w.key.indexOf(q) !== -1; }); }
      filtered.sort(function (a, b) {
        if (gardenSort === 'alpha') return a.displayLabel.localeCompare(b.displayLabel);
        if (gardenSort === 'contexts') return b.uniqueContextCount - a.uniqueContextCount;
        if (gardenSort === 'recent') return b.aacUses - a.aacUses;
        var ai = GROWTH_ORDER.indexOf(a.growth), bi = GROWTH_ORDER.indexOf(b.growth);
        return bi !== ai ? bi - ai : a.displayLabel.localeCompare(b.displayLabel);
      });
      // Detail view
      if (gardenSelectedWord) {
        var w = bank.find(function (x) { return x.key === gardenSelectedWord; });
        if (!w) { setGardenSelectedWord(null); return null; }
        var gl = GROWTH_LEVELS[w.growth]; var suggestions = gardenSuggestions(w);
        return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', overflowY: 'auto' } },
          e('button', { onClick: function () { setGardenSelectedWord(null); }, 'aria-label': 'Back', style: { alignSelf: 'flex-start', padding: '6px 14px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#374151', cursor: 'pointer' } }, '← Back to Garden'),
          e('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: gl.bg, borderRadius: '14px', border: '2px solid ' + gl.border } },
            w.image ? e('img', { src: w.image, alt: w.displayLabel, style: { width: '80px', height: '80px', borderRadius: '12px', objectFit: 'contain', background: '#fff', border: '1px solid #e5e7eb' } })
              : e('div', { style: { width: '80px', height: '80px', borderRadius: '12px', background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#d1d5db' } }, '🖼'),
            e('div', { style: { flex: 1 } },
              e('div', { style: { fontSize: '24px', fontWeight: 800, color: '#1f2937' } }, w.displayLabel),
              gardenHomeLang && getTranslation(w.displayLabel, gardenHomeLang) && e('div', { style: { fontSize: '14px', fontWeight: 600, color: '#6366f1', fontStyle: 'italic' } }, getTranslation(w.displayLabel, gardenHomeLang)),
              e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' } },
                e('span', { style: { padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: catFill[w.category] || '#f3f4f6', color: catBorder[w.category] || '#6b7280', border: '1px solid ' + (catBorder[w.category] || '#d1d5db') } }, w.category),
                w.commFn && (function () { var cf = COMM_FUNCTIONS[w.commFn]; return e('span', { style: { padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: cf.color + '15', color: cf.color, border: '1px solid ' + cf.color + '33' } }, cf.icon + ' ' + cf.label); })(),
                e('span', { style: { fontSize: '20px' } }, gl.icon), e('span', { style: { fontSize: '13px', fontWeight: 700, color: gl.color } }, gl.label)),
              e('p', { style: { fontSize: '11px', color: '#6b7280', margin: '6px 0 0', fontStyle: 'italic' } }, gl.desc),
              w.hasVoice && e('p', { style: { fontSize: '11px', color: '#ec4899', margin: '4px 0 0', fontWeight: 600 } }, '❤️ This word has a loved one\'s recorded voice'))),
          // Stats
          e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' } },
            e('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' } }, e('div', { style: { fontSize: '22px', fontWeight: 800, color: '#059669' } }, w.uniqueContextCount), e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'contexts')),
            e('div', { style: { background: '#eff6ff', borderRadius: '10px', padding: '12px', textAlign: 'center' } }, e('div', { style: { fontSize: '22px', fontWeight: 800, color: '#2563eb' } }, w.taps || 0), e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'AAC taps')),
            e('div', { style: { background: '#faf5ff', borderRadius: '10px', padding: '12px', textAlign: 'center' } }, e('div', { style: { fontSize: '22px', fontWeight: 800, color: PURPLE } }, (function () { var tq = (w.questCorrect || 0) + (w.questWrong || 0); return tq > 0 ? Math.round(w.questCorrect / tq * 100) + '%' : '—'; })()), e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'quest accuracy')),
            e('div', { style: { background: '#fefce8', borderRadius: '10px', padding: '12px', textAlign: 'center' } }, e('div', { style: { fontSize: '22px', fontWeight: 800, color: '#b45309' } }, Math.round((w.famScore || 0) * 100)), e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'familiarity %'))),
          // Growth journey
          e('div', { style: { padding: '12px 16px', background: '#f9fafb', borderRadius: '10px' }, role: 'group', 'aria-label': 'Growth journey for ' + w.displayLabel + ': currently at ' + GROWTH_LEVELS[w.growth].label + ' stage' },
            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px' } }, '🌱 Growth Journey'),
            e('div', { role: 'progressbar', 'aria-valuenow': GROWTH_ORDER.indexOf(w.growth) + 1, 'aria-valuemin': 1, 'aria-valuemax': 5, 'aria-label': w.displayLabel + ' is at growth stage ' + (GROWTH_ORDER.indexOf(w.growth) + 1) + ' of 5: ' + GROWTH_LEVELS[w.growth].label, style: { display: 'flex', gap: '2px', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#e5e7eb' } },
              GROWTH_ORDER.map(function (lv, i) { return e('div', { key: lv, style: { flex: 1, background: GROWTH_ORDER.indexOf(w.growth) >= i ? GROWTH_LEVELS[lv].border : 'transparent', transition: 'background 0.3s' } }); })),
            e('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px' } },
              GROWTH_ORDER.map(function (lv) { var g2 = GROWTH_LEVELS[lv]; return e('span', { key: lv, style: { fontSize: '10px', fontWeight: lv === w.growth ? 700 : 400, color: lv === w.growth ? g2.color : '#9ca3af' } }, g2.icon + ' ' + g2.label); }))),
          // Contexts
          e('div', null, e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '🗺️ Found In (' + w.contexts.length + ' places)'),
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
              w.contexts.map(function (cx, i) { return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#374151' } }, e('span', null, CONTEXT_ICONS[cx.type] || '📌'), e('span', { style: { fontWeight: 500 } }, cx.source)); }))),
          // Related words — other words sharing contexts with this one
          (function () {
            var mySources = {}; w.contexts.forEach(function (cx) { mySources[cx.source] = true; });
            var related = bank.filter(function (other) {
              if (other.key === w.key) return false;
              return other.contexts.some(function (cx) { return mySources[cx.source]; });
            }).map(function (other) {
              var shared = other.contexts.filter(function (cx) { return mySources[cx.source]; }).length;
              return { key: other.key, label: other.displayLabel, image: other.image, growth: other.growth, shared: shared };
            }).sort(function (a, b) { return b.shared - a.shared; }).slice(0, 10);
            if (!related.length) return null;
            return e('div', null,
              e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '🔗 Related Words'),
              e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                related.map(function (r) {
                  var g2 = GROWTH_LEVELS[r.growth];
                  return e('button', { key: r.key, onClick: function () { setGardenSelectedWord(r.key); },
                    'aria-label': r.label, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#fff', border: '1px solid ' + g2.border, borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: '#374151', cursor: 'pointer' } },
                    e('span', { style: { fontSize: '12px' } }, g2.icon),
                    e('span', null, r.label),
                    e('span', { style: { fontSize: '9px', color: '#9ca3af' } }, r.shared + '×'));
                })));
          })(),
          // IEP Goal Connection — show which goals this word has contributed to
          (function () {
            var wordKey = w.key;
            var goalHits = activeGoals.map(function (g) {
              var hits = (g.trials || []).filter(function (t) {
                return t.context && t.context.toLowerCase().indexOf(wordKey) !== -1;
              });
              if (hits.length === 0) return null;
              var successes = hits.filter(function (t) { return t.success; }).length;
              return { goal: g, total: hits.length, successes: successes };
            }).filter(Boolean);
            if (goalHits.length === 0) return null;
            var goalTypeColors = { expressive: '#7c3aed', receptive: '#2563eb', social: '#059669' };
            return e('div', null,
              e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '🎯 IEP Goal Progress'),
              e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                goalHits.map(function (gh, i) {
                  var pct = gh.total > 0 ? Math.round(gh.successes / gh.total * 100) : 0;
                  var tc = goalTypeColors[gh.goal.type] || '#6b7280';
                  return e('div', { key: i, style: { padding: '8px 12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' } },
                    e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                      e('span', { style: { fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: tc, color: '#fff', fontWeight: 600 } }, gh.goal.type),
                      e('span', { style: { fontSize: '12px', fontWeight: 600, color: '#0c4a6e' } }, gh.goal.text)),
                    e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6b7280' } },
                      e('span', null, gh.successes + '/' + gh.total + ' trials with "' + w.displayLabel + '" (' + pct + '% correct)'),
                      e('span', null, '· ' + gh.goal.currentCount + '/' + gh.goal.targetCount + ' goal progress')));
                })));
          })(),
          // Suggestions
          suggestions.length > 0 && e('div', null, e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '💡 Next Steps'),
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              suggestions.map(function (s, i) { return e(s.action ? 'button' : 'div', { key: i, onClick: s.action || undefined, style: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', background: s.action ? '#fef9c3' : '#fffbeb', borderRadius: '8px', border: '1px solid ' + (s.action ? '#facc15' : '#fef3c7'), fontSize: '12px', color: '#78350f', lineHeight: 1.5, cursor: s.action ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit', width: '100%' } }, e('span', { style: { flexShrink: 0 } }, s.icon), e('span', null, s.text + (s.action ? ' →' : ''))); }))),
          // Actions
          e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px' } },
            w.image && e('button', { onClick: function () { setTab('quest'); setQuestMode('imgToLabel'); questPickRound('imgToLabel', gallery.filter(function (g) { return g.image; })); }, 'aria-label': 'Practice in Quest', style: S.btn(PURPLE, '#fff', false) }, '🎮 Practice in Quest'),
            e('button', { onClick: function () { setTab('board'); }, style: S.btn('#f3f4f6', '#374151', false) }, '📋 Board Builder'),
            e('button', { onClick: function () { setTab('stories'); }, style: S.btn('#f3f4f6', '#374151', false) }, '📖 Create Story')));
      }
      // Main grid
      var summaryBar = e('div', { role: 'group', 'aria-label': 'Filter by growth level: ' + total + ' total words', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '12px 16px', background: 'linear-gradient(135deg,#fefce8 0%,#f0fdf4 50%,#ede9fe 100%)', borderRadius: '12px', marginBottom: '4px' } },
        GROWTH_ORDER.map(function (lv) { var g2 = GROWTH_LEVELS[lv]; var act = gardenFilter === lv;
          return e('button', { key: lv, onClick: function () { setGardenFilter(gardenFilter === lv ? 'all' : lv); }, 'aria-label': (counts[lv] || 0) + ' ' + g2.label + ' words' + (act ? ' (active filter)' : ''), 'aria-pressed': act ? 'true' : 'false', style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', border: '2px solid ' + (act ? g2.border : 'transparent'), background: act ? g2.bg : 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600, color: g2.color, cursor: 'pointer' } }, e('span', { 'aria-hidden': 'true' }, g2.icon), e('span', null, counts[lv] || 0)); }),
        (function () {
          var coreInBank = bank.filter(function (w) { return w.isCore; }).length;
          var coreMastered = bank.filter(function (w) { return w.isCore && (w.growth === 'mastered' || w.growth === 'blooming'); }).length;
          if (coreInBank === 0) return null;
          var isActive = gardenFilter === 'core';
          return e('button', { onClick: function () { setGardenFilter(gardenFilter === 'core' ? 'all' : 'core'); }, 'aria-label': 'Filter core vocabulary', style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', border: '2px solid ' + (isActive ? '#3b82f6' : 'transparent'), background: isActive ? '#dbeafe' : 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' } },
            e('span', null, '💬'), e('span', null, coreMastered + '/' + coreInBank + ' core'));
        })(),
        e('div', { style: { marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' } }, e('span', null, '📝'), e('span', null, total + ' words')));
      var controlsBar = e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '0 16px', marginBottom: '4px' } },
        e('input', { type: 'text', value: gardenSearch, placeholder: '🔍 Search...', onChange: function (ev) { setGardenSearch(ev.target.value); }, 'aria-label': 'Search', style: Object.assign({}, S.input, { flex: 1, maxWidth: '200px', fontSize: '12px' }) }),
        e('select', { value: gardenSort, onChange: function (ev) { setGardenSort(ev.target.value); }, 'aria-label': 'Sort', style: Object.assign({}, S.input, { width: 'auto', fontSize: '11px' }) },
          e('option', { value: 'growth' }, '↕ Growth'), e('option', { value: 'alpha' }, '↕ A→Z'), e('option', { value: 'contexts' }, '↕ Contexts'), e('option', { value: 'recent' }, '↕ AAC Use')),
        (function () { var wk = bank.filter(function (w) { return (w.growth === 'sprout' || w.growth === 'growing') && w.image; }); if (wk.length < 3) return null;
          return e('button', { onClick: function () { setTab('quest'); setQuestMode('imgToLabel'); questPickRound('imgToLabel', wk.map(function (w) { return { id: w.key, label: w.displayLabel, image: w.image }; })); addToast && addToast('Practicing ' + wk.length + ' growing words!', 'info'); }, 'aria-label': 'Practice weak words', style: Object.assign({}, S.btn(PURPLE, '#fff', false), { fontSize: '11px', padding: '6px 12px' }) }, '🎮 Practice Weak Words'); })(),
        // Generate a board from garden data — mastered core + growing words
        (function () {
          var withImages = bank.filter(function (w) { return w.image; });
          if (withImages.length < 4) return null;
          return e('button', { onClick: function () {
            // Build a board from garden intelligence: mastered core first, then growing words
            var coreReady = withImages.filter(function (w) { return w.isCore && (w.growth === 'mastered' || w.growth === 'blooming'); });
            var growingImgs = withImages.filter(function (w) { return (w.growth === 'growing' || w.growth === 'sprout') && !coreReady.some(function (c) { return c.key === w.key; }); });
            var boardPool = coreReady.concat(growingImgs).slice(0, 12);
            var newWords = boardPool.map(function (w) { return { id: uid(), label: w.displayLabel, category: w.category, description: '', image: w.image }; });
            setBoardWords(newWords);
            setBoardTitle((activeProfile.codename || activeProfile.name || 'Student') + '\'s Garden Board');
            setBoardCols(Math.min(4, Math.ceil(Math.sqrt(newWords.length))));
            setTab('board');
            addToast && addToast('Garden Board created with ' + newWords.length + ' words!', 'success');
          }, 'aria-label': 'Generate communication board from garden data', style: Object.assign({}, S.btn('#059669', '#fff', false), { fontSize: '11px', padding: '6px 12px' }) }, '📋 Garden Board');
        })(),
        // Phonics Lesson from Garden — bridges to Word Sounds
        (function () {
          var phonicsWords = bank.filter(function (w) {
            return (w.growth === 'mastered' || w.growth === 'blooming' || w.growth === 'growing') && w.image && w.displayLabel.length <= 6 && /^[a-zA-Z]+$/.test(w.displayLabel);
          });
          if (phonicsWords.length < 3) return null;
          return e('button', { onClick: function () {
            // Sort: mastered first, then growing — student knows the meaning, now learn the sounds
            var sorted = phonicsWords.sort(function (a, b) {
              var ag = GROWTH_ORDER.indexOf(a.growth); var bg = GROWTH_ORDER.indexOf(b.growth);
              return bg - ag;
            });
            var wordList = sorted.slice(0, 10).map(function (w) { return w.displayLabel; });
            // Store to localStorage so Word Sounds can pick it up
            try { localStorage.setItem('alloGardenPhonicsWords', JSON.stringify(wordList)); } catch (e2) {}
            // Also expose on GardenBridge
            if (window.AlloModules && window.AlloModules.GardenBridge) {
              window.AlloModules.GardenBridge._lastPhonicsLesson = wordList;
            }
            addToast && addToast('📖 Phonics lesson ready! Open Word Sounds Studio — ' + wordList.length + ' garden words loaded: ' + wordList.slice(0, 4).join(', ') + (wordList.length > 4 ? '...' : ''), 'success');
          }, 'aria-label': 'Build phonics lesson from garden vocabulary', style: Object.assign({}, S.btn('#2563eb', '#fff', false), { fontSize: '11px', padding: '6px 12px' }) }, '📖 Phonics Lesson');
        })(),
        // Wish Seed input — plant a word the student wanted but couldn't find
        e('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', padding: '0 16px', marginBottom: '6px' } },
          e('span', { style: { fontSize: '12px', flexShrink: 0 }, title: 'Plant a word the student tried to say but couldn\'t find on any board' }, '💫'),
          e('input', { type: 'text', value: wishInput, onChange: function (ev) { setWishInput(ev.target.value); },
            onKeyDown: function (ev) {
              if (ev.key === 'Enter' && wishInput.trim()) {
                var label = wishInput.trim();
                var newWish = { label: label, category: 'other', note: 'Student reached for this word', ts: new Date().toISOString(), profileId: activeProfileId || 'default' };
                var updated = wishSeeds.concat([newWish]);
                setWishSeeds(updated); store(STORAGE_WISHES, updated);
                setWishInput('');
                addToast && addToast('💫 "' + label + '" planted as a wish seed!', 'success');
              }
            },
            placeholder: 'Plant a wish seed — a word the student wanted to say...',
            'aria-label': 'Plant a wish seed word',
            style: Object.assign({}, S.input, { flex: 1, fontSize: '11px', borderColor: '#c4b5fd', background: '#faf5ff' }) }),
          wishInput.trim() && e('button', { onClick: function () {
            var label = wishInput.trim();
            var newWish = { label: label, category: 'other', note: 'Student reached for this word', ts: new Date().toISOString(), profileId: activeProfileId || 'default' };
            var updated = wishSeeds.concat([newWish]);
            setWishSeeds(updated); store(STORAGE_WISHES, updated);
            setWishInput('');
            addToast && addToast('💫 "' + label + '" planted as a wish seed!', 'success');
          }, 'aria-label': 'Plant wish seed', style: Object.assign({}, S.btn('#7c3aed', '#fff', false), { fontSize: '11px', padding: '5px 10px' }) }, '🌱 Plant')));
      var gridItems = filtered.map(function (w) { var g2 = GROWTH_LEVELS[w.growth];
        return e('button', { key: w.key, onClick: function () { setGardenSelectedWord(w.key); }, 'aria-label': w.displayLabel + ' — ' + g2.label,
          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 6px', background: '#fff', border: '2px solid ' + g2.border, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' },
          onMouseOver: function (ev) { ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; },
          onMouseOut: function (ev) { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; } },
          e('div', { style: { position: 'absolute', top: '3px', right: '5px', fontSize: '14px' } }, g2.icon),
          w.isCore && e('div', { style: { position: 'absolute', top: '3px', left: '5px', fontSize: '7px', background: '#dbeafe', color: '#1d4ed8', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 } }, 'CORE'),
          w.hasVoice && e('div', { style: { position: 'absolute', bottom: '3px', right: '5px', fontSize: '10px' }, title: 'This word has a parent\'s recorded voice' }, '❤️'),
          w.image ? e('img', { src: w.image, alt: '', style: { width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' } }) : e('div', { style: { width: '48px', height: '48px', borderRadius: '8px', background: g2.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' } }, g2.icon),
          e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#1f2937', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.2 } }, w.displayLabel),
          gardenHomeLang && getTranslation(w.displayLabel, gardenHomeLang) && e('div', { style: { fontSize: '9px', fontWeight: 600, color: '#6366f1', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.1, fontStyle: 'italic' } }, getTranslation(w.displayLabel, gardenHomeLang)),
          e('div', { style: { display: 'flex', gap: '2px', fontSize: '10px' } }, w.contextTypes.map(function (ct) { return e('span', { key: ct, title: ct, style: { opacity: 0.7 } }, CONTEXT_ICONS[ct] || '📌'); }))); });
      return e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
        e('div', { style: { padding: '16px 16px 8px', flexShrink: 0 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
            e('span', { style: { fontSize: '22px' } }, '🌱'),
            e('div', { style: { flex: 1 } }, e('h3', { style: { fontWeight: 800, fontSize: '16px', color: '#1f2937', margin: 0 } }, 'Word Garden'), e('p', { style: { fontSize: '11px', color: '#6b7280', margin: '2px 0 0' } }, 'Tap any word to explore its growth across tools.')),
            e('button', { onClick: function () { setGardenStudentView(true); }, 'aria-label': 'Student view', style: { padding: '5px 12px', background: '#dcfce7', border: '2px solid #4ade80', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: '#15803d', cursor: 'pointer', whiteSpace: 'nowrap' } }, '🌱 Student View'),
            // Home language selector for bilingual garden
            e('select', { value: gardenHomeLang, onChange: function (ev) {
              var code = ev.target.value;
              setGardenHomeLang(code); store(STORAGE_HOME_LANG, code);
              if (code && code !== 'en') translateGardenWords(computeWordBank(), code);
            }, 'aria-label': 'Student home language', style: { padding: '3px 6px', fontSize: '10px', borderRadius: '6px', border: '1px solid #d1d5db', color: '#374151', cursor: 'pointer' } },
              e('option', { value: '' }, '🌍 Home Lang'),
              LANG_OPTIONS.filter(function (l) { return l.code !== 'en'; }).map(function (l) { return e('option', { key: l.code, value: l.code }, l.label); }))),
          // Weekly pulse
          (function () {
            var now = Date.now(); var week = 7 * 86400000;
            var thisWeek = 0; var lastWeek = 0;
            Object.keys(familiarity).forEach(function (k) {
              var ls = familiarity[k].lastSeen || 0;
              if (now - ls < week) thisWeek++;
              else if (now - ls < 2 * week) lastWeek++;
            });
            if (thisWeek === 0 && lastWeek === 0) return null;
            var trend = thisWeek > lastWeek ? '📈' : thisWeek < lastWeek ? '📉' : '➡️';
            var trendColor = thisWeek > lastWeek ? '#059669' : thisWeek < lastWeek ? '#dc2626' : '#6b7280';
            return e('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', padding: '6px 12px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '4px', fontSize: '11px' } },
              e('span', { style: { fontWeight: 700, color: '#059669' } }, '🌿 ' + thisWeek + ' words practiced this week'),
              lastWeek > 0 && e('span', { style: { color: trendColor, fontWeight: 600 } }, trend + ' ' + (thisWeek > lastWeek ? '+' : '') + (thisWeek - lastWeek) + ' vs last week'));
          })(),
          // Lexical diversity — strongest single predictor of linguistic competence (AssistiveWare research)
          (function () {
            var pid = activeProfileId || '__global__';
            var pLog = usageLog[pid] || { sessions: [] };
            var tw = 0; var uw = {};
            (pLog.sessions || []).forEach(function (s) { (s.entries || []).forEach(function (en) { tw++; uw[en.label.trim().toLowerCase()] = true; }); });
            if (tw < 5) return null;
            var uniq = Object.keys(uw).length; var ld = uniq / tw; var ldPct = Math.round(ld * 100);
            var ldLabel = ld >= 0.7 ? 'Rich' : ld >= 0.5 ? 'Developing' : ld >= 0.3 ? 'Emerging' : 'Limited';
            var ldColor = ld >= 0.7 ? '#059669' : ld >= 0.5 ? '#2563eb' : ld >= 0.3 ? '#d97706' : '#6b7280';
            return e('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', padding: '6px 12px', background: '#eff6ff', borderRadius: '8px', marginBottom: '4px', fontSize: '11px' }, title: 'Lexical Diversity = unique words / total words. Strongest predictor of linguistic competence.' },
              e('span', { style: { fontWeight: 700, color: '#2563eb' } }, '📊 Lexical Diversity: ' + ldPct + '%'),
              e('span', { style: { color: ldColor, fontWeight: 600 } }, ldLabel),
              e('span', { style: { color: '#9ca3af' } }, '(' + uniq + ' unique / ' + tw + ' total)'));
          })(),
          // Garden whisper — a contextual observation that reads the garden's state
          (function () {
            var name = activeProfile.name || 'This student';
            var whisper = null;
            var coreInBank = bank.filter(function (w) { return w.isCore; }).length;
            var coreMastered = bank.filter(function (w) { return w.isCore && (w.growth === 'mastered' || w.growth === 'blooming'); }).length;
            var pctMastered = total > 0 ? counts.mastered / total : 0;
            var pctSeeds = total > 0 ? counts.seed / total : 0;
            // Priority order — first match wins
            if (total > 0 && pctMastered > 0.5) whisper = { icon: '🌳', text: 'This garden is thriving. ' + name + '\'s vocabulary is strong and deeply rooted across contexts.' };
            else if (counts.growing + counts.blooming >= 5) whisper = { icon: '🌿', text: (counts.growing + counts.blooming) + ' words are in the growth zone — the sweet spot where practice and new contexts make the biggest difference.' };
            else if (coreInBank > 0 && coreMastered < coreInBank / 2) whisper = { icon: '💬', text: 'Core vocabulary tip: ' + coreMastered + ' of ' + coreInBank + ' core words are strong. Focus on the remaining core words — they power 80% of daily communication.' };
            else if (total > 0 && pctSeeds > 0.6) whisper = { icon: '🌰', text: 'Lots of seeds planted! Add words to more boards, schedules, and stories to help them sprout — words grow through cross-context exposure.' };
            else if (total >= 10 && counts.mastered >= 3) whisper = { icon: '✨', text: name + ' has ' + counts.mastered + ' mastered word' + (counts.mastered !== 1 ? 's' : '') + ' and ' + (total - counts.mastered) + ' more growing. Every interaction helps the garden flourish.' };
            else if (total > 0) whisper = { icon: '🌱', text: 'Every word here is a connection waiting to strengthen. The more places a word appears, the more it becomes ' + name + '\'s own.' };
            if (!whisper) return null;
            return e('div', { role: 'status', 'aria-live': 'polite', style: { display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 12px', background: '#fffbeb', borderRadius: '8px', marginBottom: '4px', border: '1px solid #fef3c7' } },
              e('span', { 'aria-hidden': 'true', style: { fontSize: '16px', flexShrink: 0, marginTop: '1px' } }, whisper.icon),
              e('span', { style: { fontSize: '12px', color: '#78350f', lineHeight: 1.5, fontStyle: 'italic' } }, whisper.text));
          })(),
          // Communication function distribution
          (function () {
            var fnCounts = {}; var fnTotal = 0;
            bank.forEach(function (w) { if (w.commFn) { fnCounts[w.commFn] = (fnCounts[w.commFn] || 0) + 1; fnTotal++; } });
            if (fnTotal < 3) return null;
            return e('div', { role: 'group', 'aria-label': 'Communication function distribution', style: { display: 'flex', gap: '4px', padding: '6px 12px', background: '#faf5ff', borderRadius: '8px', marginBottom: '4px', border: '1px solid #e9d5ff', alignItems: 'center', flexWrap: 'wrap' } },
              e('span', { style: { fontSize: '10px', fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap', marginRight: '2px' } }, '🗣️ Functions:'),
              COMM_FN_ORDER.map(function (fn) {
                var ct = fnCounts[fn] || 0; if (ct === 0) return null;
                var cf = COMM_FUNCTIONS[fn];
                return e('span', { key: fn, 'aria-label': ct + ' ' + cf.label + ' words', style: { display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 6px', borderRadius: '8px', background: '#fff', fontSize: '10px', fontWeight: 600, color: cf.color, border: '1px solid ' + cf.color + '33' } },
                  e('span', { 'aria-hidden': 'true' }, cf.icon), e('span', null, ct));
              }),
              // Flag missing functions
              (function () {
                var missing = COMM_FN_ORDER.filter(function (fn) { return !fnCounts[fn]; });
                if (missing.length === 0 || missing.length > 3) return null;
                return e('span', { style: { fontSize: '9px', color: '#9ca3af', marginLeft: '4px' } }, 'Missing: ' + missing.map(function (fn) { return COMM_FUNCTIONS[fn].label; }).join(', '));
              })());
          })(),
          // FCT Bridge — Functional Communication Training link to BehaviorLens
          e('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', padding: '0 16px', marginBottom: '4px' } },
            e('select', { value: gardenBehaviorFn, onChange: function (ev) { setGardenBehaviorFn(ev.target.value); }, 'aria-label': 'Behavioral function for FCT', style: Object.assign({}, S.input, { width: 'auto', fontSize: '10px', padding: '3px 6px' }) },
              e('option', { value: '' }, '🔗 BehaviorLens FCT...'),
              FCT_FUNCTIONS.map(function (fn) { return e('option', { key: fn, value: fn }, FCT_MAP[fn].icon + ' ' + FCT_MAP[fn].label); }))),
          gardenBehaviorFn && (function () {
            var fct = FCT_MAP[gardenBehaviorFn]; if (!fct) return null;
            var priorityInGarden = bank.filter(function (w) { return fct.priorityWords.indexOf(w.key) !== -1; });
            var mastered = priorityInGarden.filter(function (w) { return w.growth === 'mastered' || w.growth === 'blooming'; });
            var growing = priorityInGarden.filter(function (w) { return w.growth === 'growing' || w.growth === 'sprout'; });
            var missing = fct.priorityWords.filter(function (pw) { return !bank.some(function (w) { return w.key === pw; }); });
            return e('div', { style: { padding: '8px 16px' } },
              e('div', { style: { padding: '10px 14px', background: fct.color + '10', borderRadius: '10px', border: '1px solid ' + fct.color + '33' } },
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
                  e('span', { style: { fontSize: '16px' } }, fct.icon),
                  e('span', { style: { fontSize: '12px', fontWeight: 700, color: fct.color } }, 'FCT: ' + fct.label + ' → Communication Replacements')),
                e('p', { style: { fontSize: '11px', color: '#374151', margin: '0 0 8px', lineHeight: 1.5 } }, fct.tip),
                mastered.length > 0 && e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' } },
                  e('span', { style: { fontSize: '10px', fontWeight: 600, color: '#059669' } }, '✅ Ready:'),
                  mastered.map(function (w) { return e('span', { key: w.key, style: { padding: '1px 6px', borderRadius: '8px', background: '#dcfce7', fontSize: '10px', fontWeight: 600, color: '#15803d' } }, w.displayLabel); })),
                growing.length > 0 && e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' } },
                  e('span', { style: { fontSize: '10px', fontWeight: 600, color: '#d97706' } }, '🌿 Growing:'),
                  growing.map(function (w) { return e('span', { key: w.key, style: { padding: '1px 6px', borderRadius: '8px', background: '#fef3c7', fontSize: '10px', fontWeight: 600, color: '#92400e' } }, w.displayLabel); })),
                missing.length > 0 && e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                  e('span', { style: { fontSize: '10px', fontWeight: 600, color: '#dc2626' } }, '🌰 Not yet planted:'),
                  missing.slice(0, 5).map(function (pw) { return e('span', { key: pw, style: { padding: '1px 6px', borderRadius: '8px', background: '#fee2e2', fontSize: '10px', fontWeight: 600, color: '#991b1b' } }, pw); }))));
          })(),
          summaryBar, controlsBar),
        renderGrowthCelebrations(),
        e('div', { style: { flex: 1, overflowY: 'auto', padding: '0 16px 16px' } },
          filtered.length === 0 ? e('div', { style: { textAlign: 'center', padding: '30px', color: '#6b7280' } }, e('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '🔍'), e('p', { style: { fontSize: '13px' } }, gardenSearch ? 'No words match "' + gardenSearch + '"' : 'No words at this growth level yet'))
            : e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' } }, gridItems),
          total > 0 && e('div', { style: { display: 'flex', gap: '6px', margin: '8px 0', flexWrap: 'wrap' } },
            e('button', { onClick: function () { printGardenReport(bank, counts, total); }, 'aria-label': 'Print clinical report', style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { fontSize: '11px' }) }, '📊 Clinical Report'),
            e('button', { onClick: function () { printGardenHomeNote(bank, counts, total); }, 'aria-label': 'Print home note for family', style: Object.assign({}, S.btn('#dcfce7', '#15803d', false), { fontSize: '11px' }) }, '🏠 Home Note'),
            e('button', { onClick: function () { exportGardenCSV(bank, counts, total); }, 'aria-label': 'Export research CSV', style: Object.assign({}, S.btn('#dbeafe', '#1d4ed8', false), { fontSize: '11px' }) }, '🔬 Research CSV'))));
    }

    function printGardenReport(bank, counts, total) {
      var prof = profiles.find(function (p) { return p.id === activeProfileId; }) || { name: 'Student' };
      var name = prof.name || 'Student';
      var codename = prof.codename || '';
      var now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var rows = bank.slice().sort(function (a, b) { var ai = GROWTH_ORDER.indexOf(a.growth), bi = GROWTH_ORDER.indexOf(b.growth); return bi !== ai ? bi - ai : a.displayLabel.localeCompare(b.displayLabel); });
      var html = '<html><head><title>' + name + '\'s Vocabulary Report</title><style>'
        + 'body{font-family:Georgia,"Times New Roman",serif;max-width:780px;margin:0 auto;padding:30px;color:#1f2937;line-height:1.6}'
        + 'h1{font-size:28px;margin:0;color:#1f2937;font-weight:800;letter-spacing:-0.5px}'
        + 'h2{font-size:16px;margin:24px 0 10px;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px}'
        + '.hero{text-align:center;padding:24px 20px;background:linear-gradient(135deg,#fefce8 0%,#f0fdf4 50%,#ede9fe 100%);border-radius:16px;margin-bottom:24px}'
        + '.hero-sub{font-size:14px;color:#6b7280;margin:6px 0 0;font-style:italic}'
        + '.garden-map{display:flex;justify-content:center;gap:16px;margin:16px 0;flex-wrap:wrap}'
        + '.garden-stage{text-align:center;padding:12px 16px;border-radius:12px;min-width:80px}'
        + '.garden-stage .count{font-size:28px;font-weight:800;line-height:1}'
        + '.garden-stage .icon{font-size:24px;margin-bottom:2px}'
        + '.garden-stage .label{font-size:11px;font-weight:600;margin-top:2px}'
        + '.word-cloud{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 16px}'
        + '.word-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;font-family:system-ui,sans-serif}'
        + 'table{width:100%;border-collapse:collapse;font-size:12px;font-family:system-ui,sans-serif;margin:8px 0}'
        + 'th{text-align:left;padding:6px 8px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-weight:700}'
        + 'td{padding:5px 8px;border-bottom:1px solid #f3f4f6}'
        + '.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}'
        + '.narrative{font-size:14px;color:#374151;margin:12px 0;line-height:1.7}'
        + '.footer{margin-top:30px;padding-top:16px;border-top:2px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af;font-family:system-ui,sans-serif}'
        + '@media print{body{padding:10px}.hero{break-inside:avoid}}</style></head><body>';
      // Hero section
      html += '<div class="hero">';
      html += '<div style="font-size:40px;margin-bottom:4px">🌱</div>';
      html += '<h1>' + name + '\'s Word Garden</h1>';
      html += '<div class="hero-sub">Vocabulary Growth Report — ' + now + '</div>';
      if (codename) html += '<div class="hero-sub" style="font-size:11px">Tracking ID: ' + codename + '</div>';
      html += '<div class="hero-sub">' + total + ' words growing across ' + (savedBoards.length + savedSchedules.length) + ' boards and schedules</div>';
      html += '</div>';
      // Garden map — visual growth distribution
      html += '<div class="garden-map">';
      GROWTH_ORDER.slice().reverse().forEach(function (lv) {
        var g = GROWTH_LEVELS[lv]; var ct = counts[lv] || 0;
        html += '<div class="garden-stage" style="background:' + g.bg + ';border:2px solid ' + g.border + '">';
        html += '<div class="icon">' + g.icon + '</div>';
        html += '<div class="count" style="color:' + g.color + '">' + ct + '</div>';
        html += '<div class="label" style="color:' + g.color + '">' + g.label + '</div></div>';
      });
      html += '</div>';
      // Narrative summary
      var masteredWords = rows.filter(function (w) { return w.growth === 'mastered'; });
      var growingWords = rows.filter(function (w) { return w.growth === 'blooming' || w.growth === 'growing'; });
      var earlyWords = rows.filter(function (w) { return w.growth === 'seed' || w.growth === 'sprout'; });
      html += '<div class="narrative">';
      if (masteredWords.length > 0) {
        html += name + ' has <strong>' + masteredWords.length + ' mastered word' + (masteredWords.length !== 1 ? 's' : '') + '</strong> — vocabulary used confidently across multiple tools and in real communication. ';
      }
      if (growingWords.length > 0) {
        html += 'There are <strong>' + growingWords.length + ' word' + (growingWords.length !== 1 ? 's' : '') + ' actively growing</strong>, appearing in multiple contexts and showing increasing familiarity through practice. ';
      }
      if (earlyWords.length > 0) {
        html += 'And <strong>' + earlyWords.length + ' new word' + (earlyWords.length !== 1 ? 's' : '') + '</strong> recently planted, ready to grow as they appear in more activities.';
      }
      // Lexical diversity in report
      var pid = activeProfileId || '__global__';
      var rpLog = usageLog[pid] || { sessions: [] };
      var rpTW = 0; var rpUW = {};
      (rpLog.sessions || []).forEach(function (s) { (s.entries || []).forEach(function (en) { rpTW++; rpUW[en.label.trim().toLowerCase()] = true; }); });
      if (rpTW >= 5) {
        var rpUniq = Object.keys(rpUW).length; var rpLD = rpUniq / rpTW; var rpPct = Math.round(rpLD * 100);
        var rpLabel = rpLD >= 0.7 ? 'Rich' : rpLD >= 0.5 ? 'Developing' : rpLD >= 0.3 ? 'Emerging' : 'Limited';
        html += '<p style="margin-top:8px"><strong>Lexical Diversity:</strong> ' + rpPct + '% (' + rpLabel + ') — ' + rpUniq + ' unique words out of ' + rpTW + ' total AAC utterances. <em>Lexical diversity is the strongest single predictor of linguistic competence in AAC users.</em></p>';
      }
      html += '</div>';
      // Mastered words — celebration
      if (masteredWords.length > 0) {
        html += '<h2>🌳 Words ' + name + ' Owns</h2>';
        html += '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">These words are used spontaneously across boards, schedules, stories, and daily communication.</p>';
        html += '<div class="word-cloud">';
        masteredWords.forEach(function (w) { html += '<span class="word-chip" style="background:#fefce8;color:#92400e;border:1px solid #facc15">🌳 ' + w.displayLabel + '</span>'; });
        html += '</div>';
      }
      // Growing words — progress
      if (growingWords.length > 0) {
        html += '<h2>🌿 Words That Are Growing</h2>';
        html += '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">These words are developing well — they appear in ' + (growingWords.length > 3 ? 'several' : 'multiple') + ' contexts and are becoming familiar through practice.</p>';
        html += '<div class="word-cloud">';
        growingWords.forEach(function (w) { var g = GROWTH_LEVELS[w.growth]; html += '<span class="word-chip" style="background:' + g.bg + ';color:' + g.color + ';border:1px solid ' + g.border + '">' + g.icon + ' ' + w.displayLabel + '</span>'; });
        html += '</div>';
        html += '<table><tr><th>Word</th><th>Stage</th><th>Found In</th></tr>';
        growingWords.forEach(function (w) { var g = GROWTH_LEVELS[w.growth];
          var places = w.contexts.map(function (c) { return c.source; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ');
          html += '<tr><td><strong>' + w.displayLabel + '</strong></td><td><span class="badge" style="background:' + g.bg + ';color:' + g.color + '">' + g.icon + ' ' + g.label + '</span></td><td style="font-size:11px;color:#6b7280">' + places + '</td></tr>'; });
        html += '</table>';
      }
      // Early words — seeds
      if (earlyWords.length > 0) {
        html += '<h2>🌰 Recently Planted</h2>';
        html += '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">These words are new to ' + name + '\'s vocabulary. Adding them to more boards, schedules, and stories will help them grow.</p>';
        html += '<div class="word-cloud">';
        earlyWords.forEach(function (w) { var g = GROWTH_LEVELS[w.growth]; html += '<span class="word-chip" style="background:' + g.bg + ';color:' + g.color + ';border:1px solid ' + g.border + '">' + g.icon + ' ' + w.displayLabel + '</span>'; });
        html += '</div>';
      }
      // Family voices section
      var voiceWords = rows.filter(function (w) { return w.hasVoice; });
      if (voiceWords.length > 0) {
        html += '<h2>❤️ Words With a Loved One\'s Voice</h2>';
        html += '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">These words have been personally recorded by a family member or caregiver. When ' + name + ' taps these symbols, they hear someone who loves them — not a machine voice.</p>';
        html += '<div class="word-cloud">';
        voiceWords.forEach(function (w) { html += '<span class="word-chip" style="background:#fce7f3;color:#be185d;border:1px solid #f9a8d4">❤️ ' + w.displayLabel + '</span>'; });
        html += '</div>';
        html += '<p style="font-size:12px;color:#059669;background:#f0fdf4;padding:8px 12px;border-radius:8px;border:1px solid #d1fae5;margin-top:8px"><strong>Family engagement note:</strong> ' + voiceWords.length + ' word' + (voiceWords.length !== 1 ? 's have' : ' has') + ' personal voice recordings. This reflects active family participation in ' + name + '\'s communication development.</p>';
      }
      // Wish Seeds section — words the student reached for
      var activeWishes = wishSeeds.filter(function (w) {
        return w.profileId === (activeProfileId || 'default') || !w.profileId;
      });
      if (activeWishes.length > 0) {
        html += '<h2>💫 Words ' + name + ' Is Reaching For</h2>';
        html += '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">During communication sessions, ' + name + ' showed intent to express these words but didn\'t have them available. This is evidence of <strong>communicative intent beyond current vocabulary</strong> — one of the strongest indicators of readiness for vocabulary expansion.</p>';
        html += '<div class="word-cloud">';
        activeWishes.forEach(function (w) {
          var dateStr = w.ts ? new Date(w.ts).toLocaleDateString() : '';
          html += '<span class="word-chip" style="background:#faf5ff;color:#7c3aed;border:1px solid #c4b5fd">💫 ' + w.label + (dateStr ? ' <span style="font-size:9px;opacity:0.7">(' + dateStr + ')</span>' : '') + '</span>';
        });
        html += '</div>';
        if (activeWishes.some(function (w) { return w.note; })) {
          html += '<p style="font-size:12px;color:#78350f;background:#fffbeb;padding:8px 12px;border-radius:8px;border:1px solid #fef3c7;margin-top:8px"><strong>Recommended action:</strong> Create symbols for these words and add them to ' + name + '\'s communication boards. When a student reaches for a word, they are telling us they are ready to learn it.</p>';
        }
      }
      // How growth works — for parents
      html += '<h2>🌱 How Words Grow</h2>';
      html += '<div style="font-size:13px;color:#374151;line-height:1.7">';
      html += '<p>Words in ' + name + '\'s garden grow stronger when they appear in <strong>multiple tools</strong> (communication boards, visual schedules, social stories, and games) and when ' + name + ' <strong>practices and uses them</strong> in daily communication.</p>';
      html += '<p style="margin-top:8px">This approach is called <em>aided language modeling</em> — research shows that vocabulary is best acquired when the same words appear across different activities and contexts, with many opportunities to see, hear, and use them.</p>';
      html += '</div>';
      // Communication function distribution
      (function () {
        var fnCounts = {}; var fnTotal = 0;
        rows.forEach(function (w) { if (w.commFn) { fnCounts[w.commFn] = (fnCounts[w.commFn] || 0) + 1; fnTotal++; } });
        if (fnTotal >= 3) {
          html += '<h2>🗣️ Communication Functions</h2>';
          html += '<p style="font-size:13px;color:#6b7280;margin:0 0 10px">How ' + name + '\'s vocabulary is distributed across communication purposes. A balanced profile includes requesting, commenting, social, and expressing words.</p>';
          html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
          COMM_FN_ORDER.forEach(function (fn) {
            var ct = fnCounts[fn] || 0;
            var cf = COMM_FUNCTIONS[fn];
            html += '<div class="pill" style="background:' + cf.color + '15;color:' + cf.color + ';border:1px solid ' + cf.color + '33">' + cf.icon + ' ' + cf.label + ': ' + ct + '</div>';
          });
          html += '</div>';
          var missing = COMM_FN_ORDER.filter(function (fn) { return !fnCounts[fn]; });
          if (missing.length > 0 && missing.length <= 3) {
            html += '<p style="font-size:12px;color:#78350f;background:#fffbeb;padding:8px 12px;border-radius:8px;border:1px solid #fef3c7"><strong>Suggestion:</strong> Consider adding ' + missing.map(function (fn) { return COMM_FUNCTIONS[fn].label.toLowerCase(); }).join(' and ') + ' vocabulary to broaden communicative range.</p>';
          }
        }
      })();
      // IEP Goals section
      if (activeGoals.length > 0) {
        var goalTypeColors = { expressive: '#7c3aed', receptive: '#2563eb', social: '#059669' };
        html += '<h2>🎯 IEP Goal Progress</h2>';
        html += '<p style="font-size:13px;color:#6b7280;margin:0 0 10px">Communication goals tracked through the Word Garden and Symbol Quest.</p>';
        html += '<table><tr><th>Goal</th><th>Type</th><th>Progress</th><th>Top Words</th></tr>';
        activeGoals.forEach(function (g) {
          var pct = g.targetCount > 0 ? Math.round(g.currentCount / g.targetCount * 100) : 0;
          // Find top words contributing to this goal
          var wordHits = {};
          (g.trials || []).forEach(function (t) {
            if (!t.context) return;
            var parts = t.context.split(':');
            var wordLabel = parts[parts.length - 1];
            if (wordLabel) wordHits[wordLabel] = (wordHits[wordLabel] || 0) + 1;
          });
          var topWords = Object.keys(wordHits).sort(function (a, b) { return wordHits[b] - wordHits[a]; }).slice(0, 4).join(', ') || '—';
          var tc = goalTypeColors[g.type] || '#6b7280';
          html += '<tr><td>' + g.text + '</td><td><span class="badge" style="background:' + tc + ';color:#fff">' + g.type + '</span></td><td><strong>' + g.currentCount + '/' + g.targetCount + '</strong> (' + pct + '%)</td><td style="font-size:11px;color:#6b7280">' + topWords + '</td></tr>';
        });
        html += '</table>';
      }
      // Footer
      html += '<div class="footer">';
      html += 'Generated by AlloFlow Visual Supports Studio · Word Garden<br>';
      html += name + '\'s vocabulary is tracked across all tools automatically. No words are lost. Every interaction counts.<br>';
      html += '<strong>Every word in this garden belongs to ' + name + '.</strong>';
      html += '</div></body></html>';
      var w2 = window.open('', '_blank'); if (w2) { w2.document.write(html); w2.document.close(); w2.print(); }
    }

    function printGardenPoster(_, grouped, studentName, total) {
      var html = '<html><head><title>' + studentName + '\'s Word Garden</title><style>'
        + 'body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#1f2937;background:linear-gradient(180deg,#e0f2fe 0%,#f0fdf4 40%,#fefce8 80%,#fef3c7 100%)}'
        + '.poster{border:4px solid #4ade80;border-radius:24px;padding:30px;background:rgba(255,255,255,0.85);box-shadow:0 0 40px rgba(74,222,128,0.15)}'
        + '.title{text-align:center;margin-bottom:20px}'
        + '.title h1{font-size:36px;font-weight:900;margin:0;color:#1f2937}'
        + '.title .count{font-size:20px;font-weight:700;color:#059669;margin:4px 0}'
        + '.title .sub{font-size:12px;color:#6b7280;font-style:italic}'
        + '.bed{border-radius:16px;padding:14px 16px;margin-bottom:12px}'
        + '.bed-label{display:flex;align-items:center;gap:6px;margin-bottom:10px;font-size:16px;font-weight:700}'
        + '.words{display:flex;flex-wrap:wrap;gap:10px}'
        + '.word{display:inline-flex;flex-direction:column;align-items:center;gap:3px;padding:8px 12px;background:rgba(255,255,255,0.9);border-radius:14px;min-width:70px;text-align:center}'
        + '.word .icon{font-size:24px}'
        + '.word .label{font-size:14px;font-weight:700;color:#1f2937}'
        + '.footer{text-align:center;margin-top:20px;font-size:18px;font-weight:800;color:#92400e}'
        + '@media print{body{background:#fff;padding:10px}.poster{box-shadow:none;border-color:#86efac}}'
        + '</style></head><body><div class="poster">';
      html += '<div class="title">';
      html += '<div style="font-size:48px;margin-bottom:4px">🌱</div>';
      html += '<h1>' + studentName + '\'s Word Garden</h1>';
      html += '<div class="count">' + total + ' words growing!</div>';
      html += '<div class="sub">Every word here is mine</div>';
      html += '</div>';
      var rowBg = { mastered: '#fefce8', blooming: '#ede9fe', growing: '#d1fae5', sprout: '#dcfce7', seed: '#fef3c7' };
      var rowBorder = { mastered: '2px solid #facc15', blooming: '2px solid #a78bfa', growing: '2px solid #34d399', sprout: '2px solid #4ade80', seed: '2px solid #fbbf24' };
      ['mastered', 'blooming', 'growing', 'sprout', 'seed'].forEach(function (level) {
        var words = grouped[level]; if (!words || !words.length) return;
        var gl = GROWTH_LEVELS[level];
        html += '<div class="bed" style="background:' + rowBg[level] + ';border:' + rowBorder[level] + '">';
        html += '<div class="bed-label" style="color:' + gl.color + '">' + gl.icon + ' ' + gl.label + ' <span style="font-size:13px;opacity:0.7">(' + words.length + ')</span></div>';
        html += '<div class="words">';
        words.forEach(function (w) {
          html += '<div class="word" style="border:2px solid ' + gl.border + '">';
          if (w.image) html += '<img src="' + w.image + '" style="width:48px;height:48px;object-fit:contain;border-radius:8px" />';
          else html += '<div class="icon">' + gl.icon + '</div>';
          html += '<div class="label">' + w.displayLabel + '</div></div>';
        });
        html += '</div></div>';
      });
      html += '<div class="footer">Every word in this garden belongs to ' + studentName + '. 🌳</div>';
      html += '</div></body></html>';
      var w2 = window.open('', '_blank'); if (w2) { w2.document.write(html); w2.document.close(); w2.print(); }
    }

    function printGardenHomeNote(bank, counts, total) {
      var prof = profiles.find(function (p) { return p.id === activeProfileId; }) || { name: 'Student' };
      var name = prof.name || 'your child';
      var codename = prof.codename || '';
      var now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      // Pick 3-5 words to practice at home: prefer growing/sprout words with images
      // Prefer weekly focus words (core, near threshold, fewest contexts) for home practice
      var practiceWords = bank.filter(function (w) { return (w.growth === 'growing' || w.growth === 'sprout') && w.image; })
        .sort(function (a, b) {
          var sa = (a.isCore ? 2 : 0) + Math.max(0, 4 - a.uniqueContextCount);
          var sb = (b.isCore ? 2 : 0) + Math.max(0, 4 - b.uniqueContextCount);
          return sb - sa;
        }).slice(0, 4);
      if (practiceWords.length < 2) practiceWords = bank.filter(function (w) { return w.image; }).slice(0, 4);
      var masteredList = bank.filter(function (w) { return w.growth === 'mastered'; }).map(function (w) { return w.displayLabel; });
      var html = '<html><head><title>Home Note — ' + name + '</title><style>'
        + 'body{font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.7}'
        + '.header{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #86efac;border-radius:16px;padding:20px;text-align:center;margin-bottom:20px}'
        + '.header h1{font-size:22px;margin:0;color:#15803d;font-weight:800}'
        + '.header .date{font-size:12px;color:#6b7280;margin-top:4px}'
        + '.section{margin-bottom:18px}'
        + '.section h2{font-size:15px;font-weight:700;color:#1f2937;margin:0 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}'
        + '.words-row{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0}'
        + '.word-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px;background:#fff;border:2px solid #4ade80;border-radius:12px;min-width:80px;text-align:center}'
        + '.word-card img{width:48px;height:48px;object-fit:contain;border-radius:8px}'
        + '.word-card .label{font-size:14px;font-weight:700;color:#1f2937}'
        + '.tip{background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:12px;font-size:13px;color:#78350f;margin:8px 0}'
        + '.tip strong{color:#92400e}'
        + '.celebration{background:#fefce8;border:2px solid #facc15;border-radius:12px;padding:12px;text-align:center;font-size:14px;color:#92400e;font-weight:700;margin:12px 0}'
        + '.footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb}'
        + '@media print{body{padding:10px}}'
        + '</style></head><body>';
      // Header
      html += '<div class="header">';
      html += '<div style="font-size:32px;margin-bottom:4px">🌱🏠</div>';
      html += '<h1>' + name + '\'s Vocabulary Update</h1>';
      html += '<div class="date">' + now + ' — from AlloFlow Word Garden</div>';
      html += '</div>';
      // Celebration
      if (masteredList.length > 0) {
        html += '<div class="celebration">🌳 ' + name + ' has mastered ' + masteredList.length + ' word' + (masteredList.length !== 1 ? 's' : '') + ': <strong>' + masteredList.slice(0, 8).join(', ') + '</strong>' + (masteredList.length > 8 ? ' and more!' : '!') + '</div>';
      }
      html += '<div class="section"><h2>📊 Garden Snapshot</h2>';
      html += '<p style="font-size:13px">' + name + ' currently has <strong>' + total + ' words</strong> in their vocabulary garden. ';
      if (counts.mastered > 0) html += '<strong>' + counts.mastered + '</strong> are mastered. ';
      if (counts.growing + counts.blooming > 0) html += '<strong>' + (counts.growing + counts.blooming) + '</strong> are actively growing. ';
      html += '</p></div>';
      // Words to practice at home
      if (practiceWords.length > 0) {
        html += '<div class="section"><h2>🌿 Words to Practice at Home</h2>';
        html += '<p style="font-size:13px">These words are growing at school. You can help them grow at home too!</p>';
        html += '<div class="words-row">';
        practiceWords.forEach(function (w) {
          html += '<div class="word-card">';
          if (w.image) html += '<img src="' + w.image + '" alt="' + w.displayLabel + '" />';
          html += '<div class="label">' + w.displayLabel + '</div></div>';
        });
        html += '</div>';
        html += '<div class="tip"><strong>How to help:</strong> When you see ' + name + ' reaching for something or showing a need, <strong>point to the word</strong> and <strong>say it out loud</strong>. Then wait 3-5 seconds for ' + name + ' to try. Respond to any attempt — a look, a point, a sound — as if they said the word. <em>Every response teaches that words work.</em></div>';
        html += '<div class="tip"><strong>At mealtimes:</strong> Point to "' + practiceWords[0].displayLabel + '" before giving it. <strong>During play:</strong> Model the words naturally: "Oh, you ' + (practiceWords.length > 1 ? practiceWords[1].displayLabel : 'want') + '!" <strong>At bedtime:</strong> Name one thing from the day using a garden word.</div>';
      }
      // Phonics play section — bridges vocabulary to literacy at home
      if (practiceWords && practiceWords.length >= 2) {
        var phonicsExamples = practiceWords.filter(function (w) { return /^[a-zA-Z]+$/.test(w.displayLabel) && w.displayLabel.length <= 6; }).slice(0, 3);
        if (phonicsExamples.length >= 2) {
          html += '<div class="section"><h2>🔤 Sound Games at Home</h2>';
          html += '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">' + name + ' is learning these words at school. You can help with their <strong>sounds</strong> too — no special training needed!</p>';
          html += '<div class="tip"><strong>🔗 Blending Game:</strong> Say the sounds in "' + phonicsExamples[0].displayLabel + '" slowly: "' + phonicsExamples[0].displayLabel.split('').join(' ... ') + '" — then ask ' + name + ' to guess the word. Cheer when they get it!</div>';
          html += '<div class="tip"><strong>📦 Breaking Apart:</strong> Say "' + phonicsExamples[1].displayLabel + '" and clap once for each sound. How many claps? Count together!</div>';
          if (phonicsExamples.length >= 3) {
            html += '<div class="tip"><strong>🎵 Rhyme Time:</strong> "What rhymes with ' + phonicsExamples[2].displayLabel + '?" Make up silly words together — even nonsense words count! Rhyming builds the brain\'s sound awareness.</div>';
          }
          html += '<p style="font-size:11px;color:#6b7280;margin:8px 0 0;font-style:italic">These games build <strong>phonological awareness</strong> — the ability to hear and manipulate sounds in words. It\'s the #1 predictor of reading success, and it\'s free to practice!</p>';
          html += '</div>';
        }
      }
      html += '<div class="section"><h2>💡 Remember</h2>';
      html += '<p style="font-size:13px">You don\'t need to be a speech therapist to help. Just <strong>use the words naturally</strong> during daily routines. The more places ' + name + ' hears and sees a word, the more it becomes theirs. Even pointing to a picture on the fridge counts!</p>';
      html += '<p style="font-size:13px;margin-top:8px">Words are like plants — they grow with attention, patience, and sunlight. Your voice is the sunlight. 🌱</p>';
      html += '</div>';
      // Include garden story if one has been generated
      if (gardenStory) {
        html += '<div class="section"><h2>📖 ' + name + '\'s Garden Story</h2>';
        html += '<div style="font-family:Georgia,serif;font-size:14px;color:#374151;line-height:1.8;padding:12px 16px;background:#f0fdf4;border-radius:12px;border:1px solid #d1fae5;font-style:italic">' + gardenStory + '</div>';
        html += '<p style="font-size:11px;color:#6b7280;margin:6px 0 0">Read this story aloud to ' + name + ' — hearing their vocabulary words in a narrative helps them grow!</p></div>';
      }
      html += '<div class="footer">';
      html += 'Generated by AlloFlow Word Garden';
      if (codename) html += ' · Tracking ID: ' + codename;
      html += '<br>This note contains vocabulary guidance only — no clinical assessments or diagnoses.<br>';
      html += '<strong>Thank you for helping ' + name + '\'s words grow. 🌳</strong>';
      html += '</div></body></html>';
      var w2 = window.open('', '_blank'); if (w2) { w2.document.write(html); w2.document.close(); w2.print(); }
    }

    function exportGardenCSV(bank) {
      var prof = profiles.find(function (p) { return p.id === activeProfileId; }) || {};
      var codename = prof.codename || prof.id || 'unknown';
      var now = new Date().toISOString().slice(0, 10);
      // Compute aggregate metrics
      var pid = activeProfileId || '__global__';
      var pLog = usageLog[pid] || { sessions: [] };
      var totalUtterances = 0; var uniqueUtterances = {};
      (pLog.sessions || []).forEach(function (s) { (s.entries || []).forEach(function (en) { if (en.label === '__UTTERANCE__') return; totalUtterances++; uniqueUtterances[en.label.trim().toLowerCase()] = true; }); });
      var lexDiv = totalUtterances > 0 ? (Object.keys(uniqueUtterances).length / totalUtterances).toFixed(3) : '';
      // Communication function counts
      var fnCounts = {}; bank.forEach(function (w) { if (w.commFn) fnCounts[w.commFn] = (fnCounts[w.commFn] || 0) + 1; });
      // CSV headers
      var rows = [];
      // Sheet 1: Per-word data
      rows.push('--- WORD-LEVEL DATA ---');
      rows.push('codename,export_date,word,category,comm_function,growth_level,context_count,context_types,aac_uses,quest_correct,quest_wrong,familiarity_score,is_core,has_image');
      bank.forEach(function (w) {
        var esc = function (s) { return '"' + (s || '').replace(/"/g, '""') + '"'; };
        rows.push([codename, now, esc(w.displayLabel), w.category, w.commFn || '', w.growth, w.uniqueContextCount,
          esc(w.contextTypes.join('|')), w.aacUses || 0, w.questCorrect || 0, w.questWrong || 0,
          (w.famScore || 0).toFixed(3), w.isCore ? 1 : 0, w.image ? 1 : 0].join(','));
      });
      rows.push('');
      // Sheet 2: Aggregate metrics
      rows.push('--- AGGREGATE METRICS ---');
      rows.push('codename,export_date,total_words,mastered,blooming,growing,sprout,seed,total_utterances,unique_utterances,lexical_diversity,mean_length_utterance,fn_requesting,fn_rejecting,fn_commenting,fn_social,fn_questioning,fn_expressing,iep_goals_active,core_words_total,core_words_strong');
      var coreTotal = bank.filter(function (w) { return w.isCore; }).length;
      var coreStrong = bank.filter(function (w) { return w.isCore && (w.growth === 'mastered' || w.growth === 'blooming'); }).length;
      // Compute MLU from session data — count utterance boundaries (Speak events have __UTTERANCE__ marker)
      var uttLengths = []; var tapCount = 0;
      (pLog.sessions || []).forEach(function (s) {
        var sessionTaps = 0;
        (s.entries || []).forEach(function (en) {
          if (en.label === '__UTTERANCE__') { if (sessionTaps > 0) uttLengths.push(sessionTaps); sessionTaps = 0; }
          else sessionTaps++;
        });
        if (sessionTaps > 0) uttLengths.push(sessionTaps); // last utterance if no Speak
      });
      var mluVal = uttLengths.length > 0 ? (uttLengths.reduce(function (a, b) { return a + b; }, 0) / uttLengths.length).toFixed(2) : '';
      rows.push([codename, now, bank.length,
        bank.filter(function (w) { return w.growth === 'mastered'; }).length,
        bank.filter(function (w) { return w.growth === 'blooming'; }).length,
        bank.filter(function (w) { return w.growth === 'growing'; }).length,
        bank.filter(function (w) { return w.growth === 'sprout'; }).length,
        bank.filter(function (w) { return w.growth === 'seed'; }).length,
        totalUtterances, Object.keys(uniqueUtterances).length, lexDiv, mluVal,
        fnCounts.requesting || 0, fnCounts.rejecting || 0, fnCounts.commenting || 0,
        fnCounts.social || 0, fnCounts.questioning || 0, fnCounts.expressing || 0,
        activeGoals.length, coreTotal, coreStrong].join(','));
      rows.push('');
      // Sheet 3: IEP goal trial log
      if (activeGoals.length > 0) {
        rows.push('--- IEP GOAL TRIALS ---');
        rows.push('codename,export_date,goal_id,goal_text,goal_type,target_count,current_count,trial_timestamp,trial_success,trial_context');
        activeGoals.forEach(function (g) {
          (g.trials || []).forEach(function (t) {
            rows.push([codename, now, g.id, '"' + (g.text || '').replace(/"/g, '""') + '"', g.type, g.targetCount, g.currentCount, t.ts, t.success ? 1 : 0, '"' + (t.context || '').replace(/"/g, '""') + '"'].join(','));
          });
        });
      }
      // Wish seeds log
      var profileWishes = wishSeeds.filter(function (w) { return w.profileId === (activeProfileId || 'default') || !w.profileId; });
      if (profileWishes.length > 0) {
        rows.push('');
        rows.push('--- WISH SEEDS (Communication Intent) ---');
        rows.push('codename,export_date,wish_word,wish_note,wish_timestamp,wish_fulfilled');
        profileWishes.forEach(function (w) {
          var fulfilled = bank.some(function (b) { return b.key === w.label.trim().toLowerCase() && b.contextTypes.length > 1; }) ? 1 : 0;
          rows.push([codename, now, '"' + w.label.replace(/"/g, '""') + '"', '"' + (w.note || '').replace(/"/g, '""') + '"', w.ts || '', fulfilled].join(','));
        });
      }
      var csv = rows.join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'garden_' + codename.replace(/\s+/g, '_') + '_' + now + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      addToast && addToast('Research CSV exported!', 'success');
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
          'aria-label': 'Reset progress', style: S.btn('#f3f4f6', '#374151', false)
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
                e('button', { onClick: function () { genFtCell(which); }, disabled: loading || !label.trim() || !onCallImagen, 'aria-label': '✨', style: S.btn(PURPLE, '#fff', loading || !label.trim() || !onCallImagen) }, '✨'),
                qbUploadBtn({ type: 'ft', which: which })
              )
            )
          );
        }
        return e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', flex: 1 } },
          ftSide('first'),
          e('div', { style: { fontSize: '52px', color: '#6b7280', flexShrink: 0, userSelect: 'none' } }, '→'),
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
              return e('button', { key: n, onClick: function () { setCbCount(n); setCbSelected(null); }, 'aria-label': 'Reset progress', style: { padding: '4px 12px', borderRadius: '6px', border: '2px solid ' + (cbCount === n ? PURPLE : '#d1d5db'), background: cbCount === n ? LIGHT_PURPLE : '#fff', color: cbCount === n ? PURPLE : '#374151', fontWeight: cbCount === n ? 700 : 400, fontSize: '12px', cursor: 'pointer' } }, n);
            }),
            cbSelected && e('button', { onClick: function () { setCbSelected(null); }, className: 'ss-no-print', 'aria-label': 'Reset', style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { marginLeft: 'auto' }) }, '↺ Reset')
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
                  e('button', { onClick: function (ev) { ev.stopPropagation(); genChoiceItem(item.id); }, disabled: isLoading || !item.label.trim() || !onCallImagen, 'aria-label': '✨', style: S.btn(PURPLE, '#fff', isLoading || !item.label.trim() || !onCallImagen) }, '✨'),
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
            e('button', { onClick: function () { setTokenEarned(0); }, 'aria-label': 'Reset', style: S.btn('#f3f4f6', '#374151', false) }, '↺ Reset')
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
                  e('button', { onClick: genTokenReward, disabled: tokenRewardLoading || !tokenRewardLabel.trim() || !onCallImagen, 'aria-label': '✨', style: S.btn(PURPLE, '#fff', tokenRewardLoading || !tokenRewardLabel.trim() || !onCallImagen) }, '✨'),
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
              'aria-label': 'Generate all calming strategy images',
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
                  e('button', { title: 'Generate image', 'aria-label': 'Generate image', onClick: function (ev) { ev.stopPropagation(); genCmItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '✨'),
                  e('button', { title: 'Upload image', 'aria-label': 'Upload image', onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'cm', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '📷')
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
              'aria-label': 'Generate all sensory strategy images',
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
                  e('button', { title: 'Generate image', 'aria-label': 'Generate image', onClick: function (ev) { ev.stopPropagation(); genSnItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '✨'),
                  e('button', { title: 'Upload image', 'aria-label': 'Upload image', onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'sn', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '📷')
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
            e('button', { onClick: genAllAmItems, disabled: !onCallImagen || amLoadingAny, 'aria-label': 'Generate all ask me item images', style: Object.assign({}, S.btn(BLUE, '#fff', !onCallImagen || amLoadingAny), { marginLeft: 'auto' }) }, amLoadingAny ? '\u29d7 Generating...' : '\u2728 Generate All Images')
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
                  e('button', { title: 'Generate image', 'aria-label': 'Generate image', onClick: function (ev) { ev.stopPropagation(); genAmItem(item.id); }, disabled: isLoading || !onCallImagen, style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '\u2728'),
                  e('button', { title: 'Upload image', 'aria-label': 'Upload image', onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'am', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDCF7')
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
            e('button', { onClick: genAllBcItems, disabled: !onCallImagen || bcLoadingAny, 'aria-label': 'Pain Scale u2014 tap to select', style: Object.assign({}, S.btn(ROSE, '#fff', !onCallImagen || bcLoadingAny), { marginLeft: 'auto' }) }, bcLoadingAny ? '\u29d7 Generating...' : '\u2728 Generate Body Parts')
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
                      e('button', { onClick: function (ev) { ev.stopPropagation(); genBcItem(item.id); }, disabled: isLoading || !onCallImagen, 'aria-label': 'u2728', style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '\u2728'),
                      e('button', { onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'bc', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, 'aria-label': 'Upload photo', style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDCF7')
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
            e('button', { onClick: genAllTwItems, disabled: !onCallImagen || twLoadingAny, 'aria-label': 'Generate all time and wait images', style: Object.assign({}, S.btn(INDIGO, '#fff', !onCallImagen || twLoadingAny), { marginLeft: 'auto' }) }, twLoadingAny ? '\u29d7 Generating...' : '\u2728 Generate All Images')
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
                e('button', { onClick: function () { setTwStep(function (s) { return Math.max(0, s - 1); }); }, disabled: twStep === 0, 'aria-label': 'u2190 Prev', style: S.btn('#e0e7ff', INDIGO, twStep === 0) }, '\u2190 Prev'),
                e('button', { onClick: function () { speakCell(currentItem.label); }, 'aria-label': 'Speak aloud', style: S.btn(INDIGO, '#fff', false) }, '\uD83D\uDD0A Speak'),
                e('button', { onClick: function () { setTwStep(function (s) { return Math.min(twItems.length - 1, s + 1); }); }, disabled: twStep === twItems.length - 1, 'aria-label': 'Next u2192', style: S.btn('#e0e7ff', INDIGO, twStep === twItems.length - 1) }, 'Next \u2192')
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
                  e('div', { style: { fontSize: '9px', fontWeight: 700, color: isCurrent ? INDIGO : '#6b7280', marginBottom: '2px' } }, 'STEP ' + (idx + 1)),
                  e('div', { style: { width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', overflow: 'hidden' } },
                    isLoading ? spinner(20) : item.image ? e('img', { src: item.image, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '4px' } }) : e('div', { style: { fontSize: '24px' } }, '\u23F0')
                  ),
                  e('input', { type: 'text', value: item.label, onClick: function (ev) { ev.stopPropagation(); }, onChange: function (ev) { var v = ev.target.value; setTwItems(function (prev) { return prev.map(function (it) { return it.id === item.id ? Object.assign({}, it, { label: v }) : it; }); }); }, style: { border: 'none', background: 'transparent', fontWeight: 600, fontSize: '10px', color: isCurrent ? '#312e81' : '#374151', textAlign: 'center', width: '100%', cursor: 'text', lineHeight: 1.4 }, 'aria-label': 'Task walk step label' }),
                  e('div', { className: 'ss-no-print', style: { display: 'flex', gap: '3px' } },
                    e('button', { onClick: function (ev) { ev.stopPropagation(); genTwItem(item.id); }, disabled: isLoading || !onCallImagen, 'aria-label': 'u2728', style: S.btn(LIGHT_PURPLE, PURPLE, isLoading || !onCallImagen) }, '\u2728'),
                    e('button', { onClick: function (ev) { ev.stopPropagation(); setQbUploadTarget({ type: 'tw', id: item.id }); qbUploadRef.current && qbUploadRef.current.click(); }, 'aria-label': 'Upload photo', style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDCF7')
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
            return e('button', { key: sm.id, onClick: function () { setQbMode(sm.id); }, 'aria-label': sm.label + ' Quick Board mode', style: { padding: '7px 14px', borderRadius: '8px 8px 0 0', border: active ? '2px solid #e5e7eb' : '2px solid transparent', borderBottom: active ? '2px solid #fff' : '2px solid transparent', background: active ? '#fff' : 'transparent', color: active ? PURPLE : '#6b7280', fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: active ? '-2px' : '0', position: 'relative', whiteSpace: 'nowrap', flexShrink: 0 } },
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
        // Print & export bar
        e('div', { className: 'ss-no-print', style: { padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
          qbMode === 'firstthen' && (ftFirstImage || ftThenImage) && e('button', { onClick: function () { exportQuickBoardHTML('firstthen'); }, 'aria-label': 'Export First-Then board as accessible HTML', style: S.btn('#fef9c3', '#92400e', false) }, '\uD83C\uDF10 Export HTML'),
          e('button', { onClick: function () { window.print(); }, 'aria-label': 'Print board', style: S.btn('#f3f4f6', '#374151', false) }, '\uD83D\uDDA8\uFE0F Print Board')
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
              'aria-label': 'Add new student profile', style: { padding: '2px 8px', border: '1px dashed #6b7280', borderRadius: '12px', background: 'transparent', color: '#6b7280', fontSize: '11px', cursor: 'pointer', lineHeight: 1.4 }
            }, '+ Add')
          ),
          // Profile chips row
          e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' } },
            profiles.map(function (prof) {
              var isActive = prof.id === activeProfileId;
              return e('button', {
                key: prof.id,
                onClick: function () { if (isActive) { setShowAvatar(!showAvatar); } else { switchProfile(prof.id); setShowAvatar(true); } },
                'aria-label': 'Profile: ' + (prof.name || 'Student'),
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
            e('label', { style: S.lbl }, 'Display Name (local only)'),
            e('input', { type: 'text', value: avatarName, onChange: function (ev) {
              var val = ev.target.value; setAvatarName(val);
              var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { name: val }) : p; });
              setProfiles(upd); store(STORAGE_PROFILES, upd);
            }, placeholder: 'e.g. Marcus (never leaves this device)', 'aria-label': 'Display name - local only', style: Object.assign({}, S.input, { marginBottom: '2px' }) }),
            e('p', { style: { fontSize: '9px', color: '#9ca3af', margin: '0 0 6px' } }, 'Used in Social Stories & prints. Never exported or synced.'),
            e('label', { style: S.lbl }, 'Codename (used for tracking)'),
            e('div', { style: { display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center' } },
              e('select', {
                value: (activeProfile.codename || '').split(' ')[0] || '',
                onChange: function (ev) {
                  var animal = (activeProfile.codename || '').split(' ').slice(1).join(' ') || CN_ANI[0];
                  var cn = ev.target.value ? (ev.target.value + ' ' + animal) : animal;
                  var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { codename: cn }) : p; });
                  setProfiles(upd); store(STORAGE_PROFILES, upd);
                },
                'aria-label': 'Codename adjective',
                style: { flex: 1, fontSize: '11px', fontWeight: 600, color: PURPLE, padding: '4px 6px', background: LIGHT_PURPLE, borderRadius: '6px', border: '1px solid #c4b5fd', cursor: 'pointer' }
              },
                e('option', { value: '' }, '— Adjective —'),
                CN_ADJ.map(function (a) { return e('option', { key: a, value: a }, a); })
              ),
              e('select', {
                value: (activeProfile.codename || '').split(' ').slice(1).join(' ') || '',
                onChange: function (ev) {
                  var adj = (activeProfile.codename || '').split(' ')[0] || CN_ADJ[0];
                  var cn = ev.target.value ? (adj + ' ' + ev.target.value) : adj;
                  var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { codename: cn }) : p; });
                  setProfiles(upd); store(STORAGE_PROFILES, upd);
                },
                'aria-label': 'Codename animal',
                style: { flex: 1, fontSize: '11px', fontWeight: 600, color: PURPLE, padding: '4px 6px', background: LIGHT_PURPLE, borderRadius: '6px', border: '1px solid #c4b5fd', cursor: 'pointer' }
              },
                e('option', { value: '' }, '— Animal —'),
                CN_ANI.map(function (a) { return e('option', { key: a, value: a }, a); })
              ),
              e('button', { onClick: function () {
                var cn = generateCodename();
                var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { codename: cn }) : p; });
                setProfiles(upd); store(STORAGE_PROFILES, upd);
              }, 'aria-label': 'Randomize codename', title: 'Generate a new random codename', style: { padding: '3px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' } }, '🎲')),
            e('label', { style: S.lbl }, 'Appearance'),
            e('input', { type: 'text', value: avatarDesc, onChange: function (ev) {
              var val = ev.target.value; setAvatarDesc(val);
              var upd = profiles.map(function (p) { return p.id === activeProfileId ? Object.assign({}, p, { description: val }) : p; });
              setProfiles(upd); store(STORAGE_PROFILES, upd);
            }, placeholder: 'e.g. 8-year-old boy with curly hair', 'aria-label': 'Avatar appearance description', style: Object.assign({}, S.input, { marginBottom: '8px' }) }),
            e('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } },
              e('button', { onClick: generateAvatar, disabled: avatarGenerating || !avatarDesc.trim(), 'aria-label': 'Generate student avatar', style: S.btn(PURPLE, '#fff', avatarGenerating || !avatarDesc.trim()) }, avatarGenerating ? '⏳' : '✨ Generate'),
              e('button', { onClick: function () { fileInputRef.current && fileInputRef.current.click(); }, 'aria-label': 'Upload', style: S.btn('#f3f4f6', '#374151', false) }, '📷 Upload'),
              activeProfile.image && e('button', { onClick: clearAvatar, title: 'Clear avatar image', 'aria-label': 'Clear avatar image', style: S.btn('#fee2e2', '#dc2626', false) }, '🗑️'),
              profiles.length > 1 && e('button', { onClick: function () { deleteProfile(activeProfileId); }, title: 'Delete this profile', 'aria-label': '✕', style: S.btn('#fee2e2', '#dc2626', false) }, '✕')
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
          e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '3px 0 0' } }, 'Runs a second AI pass to strip any embedded labels'),
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
              'aria-label': 'Reset progress', style: { fontSize: '10px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }
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
        // Garden snapshot — visible from all tabs
        (function () {
          var gBank = computeWordBank();
          if (gBank.length === 0) return null;
          var gc = { seed: 0, sprout: 0, growing: 0, blooming: 0, mastered: 0 };
          gBank.forEach(function (w) { gc[w.growth]++; });
          return e('div', { style: Object.assign({}, S.card, { background: 'linear-gradient(135deg, #fefce8 0%, #f0fdf4 100%)', border: '1px solid #d1fae5' }) },
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' } },
              sectionLabel('🌱 Word Garden'),
              e('button', { onClick: function () { setTab('garden'); }, 'aria-label': 'Open garden tab', style: { fontSize: '9px', color: PURPLE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 } }, 'Open →')),
            e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
              GROWTH_ORDER.map(function (lv) {
                var g = GROWTH_LEVELS[lv]; var ct = gc[lv] || 0; if (ct === 0) return null;
                return e('span', { key: lv, style: { fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: g.bg, color: g.color, fontWeight: 600, border: '1px solid ' + g.border } }, g.icon + ' ' + ct);
              })),
            e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '4px 0 0' } }, (function () {
              var types = {}; gBank.forEach(function (w) { w.contextTypes.forEach(function (t) { types[t] = 1; }); });
              return gBank.length + ' words across ' + Object.keys(types).length + ' tool types';
            })()));
        })(),
        // Weekly Focus — garden-driven vocabulary planner visible from all tabs
        (function () {
          var gBank = computeWordBank();
          if (gBank.length < 5) return null;
          // Score each word for "focus-worthiness": high = needs attention, near growth threshold
          var focusCandidates = gBank.filter(function (w) {
            return w.growth === 'sprout' || w.growth === 'growing';
          }).map(function (w) {
            var score = 0;
            // Words close to leveling up get priority
            if (w.growth === 'growing' && w.uniqueContextCount >= 2) score += 3; // close to blooming
            if (w.growth === 'sprout' && w.uniqueContextCount >= 1) score += 2; // close to growing
            // Core words get priority
            if (w.isCore) score += 2;
            // Words with images (can be practiced in Quest) get a small boost
            if (w.image) score += 1;
            // Words with fewer contexts have more room to grow
            score += Math.max(0, 4 - w.uniqueContextCount);
            return { word: w, score: score };
          }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
          if (focusCandidates.length === 0) return null;
          return e('div', { style: Object.assign({}, S.card, { background: 'linear-gradient(135deg, #eff6ff 0%, #ede9fe 100%)', border: '1px solid #c7d2fe' }) },
            sectionLabel('🎯 Weekly Focus'),
            e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '0 0 6px' } }, 'Words that would grow most from attention this week:'),
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
              focusCandidates.map(function (fc) {
                var w = fc.word; var gl = GROWTH_LEVELS[w.growth];
                var missingCtx = [];
                var has = {}; w.contextTypes.forEach(function (t) { has[t] = true; });
                if (!has.board) missingCtx.push('board');
                if (!has.schedule) missingCtx.push('schedule');
                if (!has.story) missingCtx.push('story');
                return e('div', { key: w.key, style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '1px solid ' + gl.border } },
                  w.image ? e('img', { src: w.image, alt: '', style: { width: 22, height: 22, borderRadius: '4px', objectFit: 'contain' } })
                    : e('span', { style: { fontSize: '14px' } }, gl.icon),
                  e('div', { style: { flex: 1, minWidth: 0 } },
                    e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w.displayLabel),
                    missingCtx.length > 0 && e('div', { style: { fontSize: '9px', color: '#6b7280' } }, 'Add to: ' + missingCtx.join(', '))
                  ),
                  w.isCore && e('span', { style: { fontSize: '7px', background: '#dbeafe', color: '#1d4ed8', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 } }, 'CORE'));
              })),
            e('p', { style: { fontSize: '9px', color: '#9ca3af', margin: '6px 0 0', fontStyle: 'italic' } }, 'Model each word 5+ times daily across settings'));
        })(),
        // Backup & Restore
        e('div', { style: S.card },
          sectionLabel('Backup & Restore'),
          e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '0 0 8px' } },
            gallery.length + ' symbol' + (gallery.length !== 1 ? 's' : '') + ' · ' +
            savedBoards.length + ' board' + (savedBoards.length !== 1 ? 's' : '') + ' · ' +
            savedSchedules.length + ' schedule' + (savedSchedules.length !== 1 ? 's' : '')
          ),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
            e('button', { onClick: exportData, 'aria-label': 'Export all data as backup file', style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { textAlign: 'left' }) }, '⬇️ Export Backup'),
            e('button', { onClick: function () { importFileRef.current && importFileRef.current.click(); }, 'aria-label': 'Import Backup', style: Object.assign({}, S.btn('#f3f4f6', '#374151', false), { textAlign: 'left' }) }, '📂 Import Backup')
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
                if (en.label === '__UTTERANCE__') return; // skip MLU markers
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
                'aria-label': 'Toggle AAC usage analytics',
                style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: showAnalytics ? '8px' : 0 }
              }, '📊 AAC Usage Analytics ', e('span', { style: { color: '#6b7280', fontWeight: 400, marginLeft: 'auto', fontSize: '10px' } }, showAnalytics ? '▲ hide' : '▼ show')),
              showAnalytics && allSessions.length === 0 && e('p', { style: { fontSize: '10px', color: '#6b7280', margin: 0 } }, 'No sessions recorded yet. Use a board in Use mode to start tracking.'),
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
                      dayLabels.map(function (l, i) { return e('div', { key: i, style: { flex: 1, textAlign: 'center', fontSize: '8px', color: '#6b7280' } }, l); })
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
                  'aria-label': 'Clear AAC usage analytics data', style: Object.assign({}, S.btn('#fee2e2', '#dc2626', false), { fontSize: '10px', padding: '3px 8px', marginTop: '6px' })
                }, '🗑️ Clear Analytics')
              )
            );
          })(),
          cloudSync && !isCanvasEnv && e('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' } },
              e('span', { style: { fontSize: '10px', color: syncStatus === 'synced' ? '#16a34a' : syncStatus === 'error' ? '#dc2626' : '#6b7280' } },
                syncStatus === 'syncing' ? '⏳ Syncing...' : syncStatus === 'synced' ? '✓ Cloud synced' : syncStatus === 'error' ? '✗ Sync error' : '☁️ Cloud backup'
              ),
              lastSynced && e('span', { style: { fontSize: '9px', color: '#6b7280', marginLeft: 'auto' } }, new Date(lastSynced).toLocaleDateString())
            ),
            e('div', { style: { display: 'flex', gap: '4px' } },
              e('button', { onClick: syncToCloud, disabled: syncStatus === 'syncing', 'aria-label': 'Save data to cloud', style: Object.assign({}, S.btn(PURPLE, '#fff', syncStatus === 'syncing'), { flex: 1, fontSize: '11px' }) }, '☁️ Sync Now'),
              e('button', { onClick: loadFromCloud, disabled: syncStatus === 'syncing', 'aria-label': 'Load data from cloud', style: Object.assign({}, S.btn('#f3f4f6', '#374151', syncStatus === 'syncing'), { flex: 1, fontSize: '11px' }) }, '📥 Load')
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
              var goalTypeColors = { expressive: '#7c3aed', receptive: '#2563eb', social: '#059669', pragmatic: '#c026d3', articulation: '#ea580c' };
              var typeColor = goalTypeColors[g.type] || '#6b7280';
              // Compute a days-until-target readout (if a target date is set).
              var daysTo = null;
              if (g.targetDate) {
                var dt = new Date(g.targetDate);
                if (!isNaN(dt.getTime())) { daysTo = Math.ceil((dt.getTime() - Date.now()) / 86400000); }
              }
              var priorityBadge = (g.priority && g.priority !== 'standard')
                ? { high: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'HIGH PRIORITY' }, maintenance: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'MAINTENANCE' } }[g.priority]
                : null;
              return e('div', { key: g.id, style: { background: '#f9fafb', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e5e7eb' } },
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' } },
                  e('span', { style: { fontSize: '9px', background: typeColor, color: '#fff', borderRadius: '4px', padding: '1px 6px', fontWeight: 700, textTransform: 'uppercase' } }, g.type),
                  priorityBadge && e('span', { style: { fontSize: '9px', background: priorityBadge.bg, color: priorityBadge.color, border: '1px solid ' + priorityBadge.border, borderRadius: '4px', padding: '1px 6px', fontWeight: 700 } }, priorityBadge.label),
                  daysTo !== null && e('span', {
                    style: { fontSize: '9px', background: daysTo < 0 ? '#fef2f2' : daysTo <= 14 ? '#fef3c7' : '#eff6ff', color: daysTo < 0 ? '#991b1b' : daysTo <= 14 ? '#92400e' : '#1e40af', border: '1px solid', borderColor: daysTo < 0 ? '#fecaca' : daysTo <= 14 ? '#fde68a' : '#bfdbfe', borderRadius: '4px', padding: '1px 6px', fontWeight: 700 },
                    title: 'Target: ' + g.targetDate
                  }, daysTo < 0 ? 'OVERDUE · ' + Math.abs(daysTo) + 'd' : daysTo === 0 ? 'DUE TODAY' : daysTo + 'd left'),
                  e('span', { style: { fontSize: '11px', fontWeight: 700, color: '#374151', flex: 1, minWidth: '120px' } }, g.text),
                  e('button', { onClick: function () { removeIepGoal(g.id); }, 'aria-label': '✕', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#dc2626', padding: '0 3px' } }, '✕')
                ),
                // Meta row: cue level, data method, and IEP section — collapses if none are set.
                (g.cueLevel || g.dataMethod || g.linkedIepSection) && e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '5px', fontSize: '9px', color: '#6b7280' } },
                  g.cueLevel && g.cueLevel !== 'independent' && e('span', { style: { background: '#ede9fe', color: '#5b21b6', padding: '1px 6px', borderRadius: '999px', fontWeight: 600 }, title: 'Cue level currently required' }, '🫳 ' + g.cueLevel + ' cue'),
                  g.cueLevel === 'independent' && e('span', { style: { background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '999px', fontWeight: 600 }, title: 'Independent — no cue needed' }, '⭐ independent'),
                  g.dataMethod && e('span', { style: { background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '999px' }, title: 'Data collection method' }, '📊 ' + g.dataMethod),
                  g.linkedIepSection && e('span', { style: { background: '#fff7ed', color: '#9a3412', padding: '1px 6px', borderRadius: '999px', fontStyle: 'italic' }, title: 'Linked IEP section' }, '📎 ' + g.linkedIepSection)
                ),
                g.baseline && e('div', { style: { fontSize: '9px', color: '#6b7280', marginBottom: '4px', fontStyle: 'italic' }, title: 'Starting performance' }, 'Baseline: ' + g.baseline),
                g.accommodations && e('div', { style: { fontSize: '9px', color: '#6b7280', marginBottom: '4px', fontStyle: 'italic' }, title: 'Required supports' }, 'Accommodations: ' + g.accommodations),
                // Progress bar
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                  e('div', { style: { flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' } },
                    e('div', { style: { height: '100%', width: Math.min(100, pct) + '%', background: pct >= 100 ? '#16a34a' : typeColor, borderRadius: '4px', transition: 'width 0.3s' } })
                  ),
                  e('span', { style: { fontSize: '10px', fontWeight: 700, color: pct >= 100 ? '#16a34a' : '#374151', minWidth: '36px', textAlign: 'right' } }, g.currentCount + '/' + g.targetCount)
                ),
                // Recent accuracy
                recentTrials.length > 0 && e('div', { style: { display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' } },
                  e('span', { style: { fontSize: '9px', color: '#6b7280' } }, 'Last 10:'),
                  recentTrials.map(function (t, ti) {
                    return e('span', { key: ti, style: { width: '8px', height: '8px', borderRadius: '50%', background: t.success ? '#16a34a' : '#dc2626', display: 'inline-block' } });
                  }),
                  e('span', { style: { fontSize: '9px', fontWeight: 700, color: recentAcc >= 80 ? '#16a34a' : recentAcc >= 60 ? '#d97706' : '#dc2626', marginLeft: '4px' } }, recentAcc + '% acc')
                ),
                // Manual trial buttons
                e('div', { style: { display: 'flex', gap: '4px', marginTop: '6px' } },
                  e('button', {
                    onClick: function () { recordIepTrial(g.id, true, 'manual'); },
                    'aria-label': 'Record successful IEP trial', style: { fontSize: '10px', background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }
                  }, '✓ Success'),
                  e('button', {
                    onClick: function () { recordIepTrial(g.id, false, 'manual'); },
                    'aria-label': 'Record unsuccessful IEP trial', style: { fontSize: '10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }
                  }, '✗ No response')
                )
              );
            })
          ),
          activeGoals.length === 0 && e('p', { style: { fontSize: '11px', color: '#6b7280', fontStyle: 'italic', margin: '0 0 8px' } }, 'No goals set for this profile yet.'),
          // Add goal form — progressive disclosure: primary fields visible, IEP-meta under a toggle.
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              e('select', {
                id: 'iep-goal-type',
                'aria-label': 'IEP goal type',
                style: { fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', background: '#fff' }
              },
                e('option', { value: 'expressive' }, 'Expressive'),
                e('option', { value: 'receptive' }, 'Receptive'),
                e('option', { value: 'social' }, 'Social'),
                e('option', { value: 'pragmatic' }, 'Pragmatic'),
                e('option', { value: 'articulation' }, 'Articulation')
              ),
              e('input', {
                id: 'iep-goal-text',
                type: 'text',
                placeholder: 'e.g. Request items using 2-word phrases',
                'aria-label': 'IEP goal description',
                style: Object.assign({}, S.input, { flex: 1, margin: 0, fontSize: '11px', minWidth: '200px' })
              }),
              e('input', {
                id: 'iep-goal-target',
                type: 'number', min: 1, max: 200,
                placeholder: '# target',
                'aria-label': 'IEP goal target count',
                style: { width: '60px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', textAlign: 'center' }
              })
            ),
            // Collapsible IEP-team metadata — priority, baseline, target date, cue level, etc.
            // Hidden by default so quick adds stay fast; SLPs get the full field set when they need it.
            e('details', { style: { fontSize: '10px' } },
              e('summary', { style: { cursor: 'pointer', color: '#6b7280', fontWeight: 700, padding: '2px 0' } }, '+ IEP team details (priority, baseline, target date, cue level)'),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginTop: '6px' } },
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Priority'),
                  e('select', { id: 'iep-goal-priority', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' } },
                    e('option', { value: 'standard' }, 'Standard'),
                    e('option', { value: 'high' }, 'High'),
                    e('option', { value: 'maintenance' }, 'Maintenance')
                  )
                ),
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Cue level'),
                  e('select', { id: 'iep-goal-cue', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' }, title: 'Support required for the student to succeed on this goal' },
                    e('option', { value: 'independent' }, 'Independent'),
                    e('option', { value: 'visual' }, 'Visual cue'),
                    e('option', { value: 'verbal' }, 'Verbal cue'),
                    e('option', { value: 'gestural' }, 'Gestural cue'),
                    e('option', { value: 'physical' }, 'Physical prompt')
                  )
                ),
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Data method'),
                  e('select', { id: 'iep-goal-datamethod', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' } },
                    e('option', { value: 'frequency' }, 'Frequency count'),
                    e('option', { value: 'percentage' }, 'Percentage accuracy'),
                    e('option', { value: 'duration' }, 'Duration'),
                    e('option', { value: 'rubric' }, 'Rubric score')
                  )
                ),
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Target date'),
                  e('input', { id: 'iep-goal-targetdate', type: 'date', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' } })
                ),
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: '1 / -1' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Baseline'),
                  e('input', { id: 'iep-goal-baseline', type: 'text', placeholder: 'e.g. 2/10 accuracy on probe trials (Sept 2026)', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' } })
                ),
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: '1 / -1' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Accommodations'),
                  e('input', { id: 'iep-goal-accom', type: 'text', placeholder: 'e.g. AAC device available, visual supports, extended time', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' } })
                ),
                e('label', { style: { display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: '1 / -1' } },
                  e('span', { style: { color: '#374151', fontWeight: 700 } }, 'Linked IEP section (optional)'),
                  e('input', { id: 'iep-goal-iepsection', type: 'text', placeholder: 'e.g. Communication — Expressive Language', style: { fontSize: '11px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px' } })
                )
              )
            ),
            e('button', {
              onClick: function () {
                var text = document.getElementById('iep-goal-text');
                var type = document.getElementById('iep-goal-type');
                var target = document.getElementById('iep-goal-target');
                if (!text || !text.value.trim()) return;
                // Pull the enriched fields too. Each getElementById is guarded because the details
                // block may not be rendered yet if the browser hasn't expanded it.
                var g = (function (id) { var el = document.getElementById(id); return el ? el.value : ''; });
                addIepGoal({
                  text: text.value.trim(),
                  type: type ? type.value : 'expressive',
                  targetCount: target ? (parseInt(target.value, 10) || 20) : 20,
                  priority: g('iep-goal-priority') || 'standard',
                  cueLevel: g('iep-goal-cue') || 'independent',
                  dataMethod: g('iep-goal-datamethod') || 'frequency',
                  targetDate: g('iep-goal-targetdate') || '',
                  baseline: g('iep-goal-baseline') || '',
                  accommodations: g('iep-goal-accom') || '',
                  linkedIepSection: g('iep-goal-iepsection') || ''
                });
                // Clear text + numeric fields; leave select defaults as-is for the next entry.
                text.value = '';
                if (target) target.value = '';
                ['iep-goal-targetdate', 'iep-goal-baseline', 'iep-goal-accom', 'iep-goal-iepsection'].forEach(function (id) {
                  var el = document.getElementById(id); if (el) el.value = '';
                });
              },
              'aria-label': 'Add new IEP goal',
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
              return e('button', { key: m, onClick: function () { setSymMode(m); }, 'aria-label': m + ' generation mode', style: { flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: symMode === m ? '#fff' : 'transparent', fontWeight: symMode === m ? 700 : 400, fontSize: '11px', cursor: 'pointer', color: symMode === m ? PURPLE : '#6b7280', boxShadow: symMode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' } }, m === 'single' ? '✏️ Single' : '📋 Batch');
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
              e('div', { style: { fontSize: '9px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '💡 Suggested (' + (hour < 9 ? 'Morning' : hour < 12 ? 'School' : hour < 14 ? 'Lunch' : hour < 16 ? 'Afternoon' : 'Evening') + ')'),
              e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px' } },
                filtered.map(function (s) {
                  return e('button', { key: s, onClick: function () { setSymLabel(s); }, 'aria-label': 'Quick set label: ' + s, style: { padding: '2px 7px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '10px', fontSize: '9px', cursor: 'pointer', color: '#92400e', fontWeight: 500 } }, s);
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
                e('p', { style: { fontSize: '10px', color: '#6b7280', margin: '2px 0 0' } }, symBatch.split('\n').filter(function (l) { return l.trim(); }).length + ' queued'),
                e('div', { style: { marginTop: '6px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, 'Quick Sets'),
                  e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                    QUICK_SETS.map(function (qs) {
                      return e('button', { key: qs.label, onClick: function () { setSymBatch(qs.items.join('\n')); }, 'aria-label': 'Quick batch: ' + qs.label, style: { padding: '3px 7px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '3px' } },
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
                    key: cat, 'aria-label': 'Filter by ' + (lbl || 'all categories'),
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
          e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, 'Quick Templates'),
          e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            BOARD_TEMPLATES.map(function (t) {
              return e('button', {
                key: t.id,
                onClick: function () { applyBoardTemplate(t); },
                'aria-label': 'Apply template: ' + t.label,
                style: { padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: '20px', background: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', transition: 'background 0.1s' },
                onMouseOver: function (ev) { ev.currentTarget.style.background = LIGHT_PURPLE; ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.color = PURPLE; },
                onMouseOut: function (ev) { ev.currentTarget.style.background = '#fff'; ev.currentTarget.style.borderColor = '#e5e7eb'; ev.currentTarget.style.color = '#374151'; }
              }, e('span', null, t.icon), t.label);
            })
          )
        ),
        // Garden seed hint — suggest words that would benefit from board context
        (function () {
          var bank = computeWordBank();
          var seeds = bank.filter(function (w) {
            return (w.growth === 'seed' || w.growth === 'sprout') && w.image && !w.contextTypes.some(function (t) { return t === 'board'; });
          }).slice(0, 6);
          if (seeds.length === 0) return null;
          return e('div', { style: { flexShrink: 0, display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #d1fae5', flexWrap: 'wrap' } },
            e('span', { style: { fontSize: '10px', fontWeight: 600, color: '#059669', whiteSpace: 'nowrap' } }, '🌱 Could grow here:'),
            seeds.map(function (w) {
              return e('button', { key: w.key, onClick: function () {
                setBoardWords(function (prev) {
                  if (prev.some(function (bw) { return bw.label.toLowerCase() === w.key; })) return prev;
                  return prev.concat([{ id: uid(), label: w.displayLabel, category: w.category, description: '', image: w.image }]);
                });
                addToast && addToast('"' + w.displayLabel + '" added!', 'success');
              }, 'aria-label': 'Add ' + w.displayLabel + ' to board', title: 'This word is a seed — adding it to a board helps it grow',
                style: { display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 8px', background: '#fff', border: '1px solid #4ade80', borderRadius: '12px', fontSize: '10px', fontWeight: 600, color: '#15803d', cursor: 'pointer' } },
                e('img', { src: w.image, alt: '', style: { width: 16, height: 16, borderRadius: '3px', objectFit: 'contain' } }),
                w.displayLabel, e('span', { style: { color: '#9ca3af' } }, '+'));
            }));
        })(),
        // Controls row
        e('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 } },
          e('div', { style: { flex: 1, minWidth: '200px' } },
            e('label', { style: S.lbl }, 'Topic'),
            e('input', { type: 'text', value: boardTopic, onChange: function (ev) { setBoardTopic(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') generateBoardFromTopic(); }, placeholder: 'e.g. morning routine, feelings, playground', 'aria-label': 'Board topic', style: S.input, autoFocus: true })
          ),
          e('button', { onClick: generateBoardFromTopic, disabled: !boardTopic.trim() || boardGenerating, 'aria-label': 'Generate board from topic', style: S.btn(PURPLE, '#fff', !boardTopic.trim() || boardGenerating) }, boardGenerating ? '⏳ Writing...' : '📝 Generate Word List'),
          boardWords.length > 0 && e('button', { onClick: generateBoardImages, disabled: isLoading, 'aria-label': 'Cols', style: S.btn('#059669', '#fff', isLoading) }, isLoading ? '⏳ Generating...' : '✨ Generate Images'),
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
            e('span', { style: { fontSize: '10px', color: '#6b7280', fontWeight: 600 } }, 'Theme:'),
            Object.values(BOARD_THEMES).map(function (t) {
              var active = boardTheme === t.id;
              return e('button', {
                key: t.id,
                onClick: function () { setBoardTheme(t.id); store(STORAGE_BOARD_THEME, t.id); },
                'aria-label': 'Theme: ' + t.label,
                style: { fontSize: '10px', padding: '3px 8px', borderRadius: '5px', border: active ? '2px solid ' + PURPLE : '1px solid #d1d5db', background: active ? LIGHT_PURPLE : '#f9fafb', color: active ? PURPLE : '#374151', fontWeight: active ? 700 : 400, cursor: 'pointer' }
              }, t.label);
            })
          ),
          // Language selector for multilingual boards
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
            e('span', { style: { fontSize: '10px', color: '#6b7280', fontWeight: 600 } }, '🌐'),
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
          e('button', { onClick: function () { setShowSentencePanel(!showSentencePanel); if (!showSentencePanel) { setSentenceMapping([]); setSentenceInput(''); } }, 'aria-label': 'From Sentence', style: S.btn(showSentencePanel ? LIGHT_PURPLE : '#f3f4f6', showSentencePanel ? PURPLE : '#374151', false), title: 'Type a sentence and let AI map each word to an AAC symbol' }, '🔤 From Sentence'),
          e('button', { onClick: function () { setShowGalleryPicker(!showGalleryPicker); }, 'aria-label': '️ From Gallery', style: S.btn(showGalleryPicker ? LIGHT_PURPLE : '#f3f4f6', showGalleryPicker ? PURPLE : '#374151', false), title: 'Add a symbol from your gallery directly to the board' }, '🖼️ From Gallery'),
          boardWords.length > 0 && !boardPages && e('button', {
            onClick: enablePages,
            title: 'Enable multi-page mode — add linked pages to this board', 'aria-label': 'Enable multi-page mode — add linked pages to this board',
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
                'aria-label': (pg.title || ('Page ' + (pi + 1))) + ' board page',
                style: { padding: '2px 8px', border: '2px solid ' + (active ? '#92400e' : '#fde68a'), borderRadius: '6px', background: active ? '#92400e' : 'transparent', color: active ? '#fff' : '#92400e', fontSize: '10px', fontWeight: active ? 700 : 400, cursor: 'grab', transition: 'border-color 0.15s' },
                title: 'Drag to reorder pages'
              }, pg.title || ('Page ' + (pi + 1)));
            }),
            e('button', { onClick: addPage, title: 'Add a new page', 'aria-label': 'Add a new page', style: { background: 'none', border: '1px dashed #92400e', borderRadius: '6px', padding: '2px 7px', color: '#92400e', fontSize: '11px', cursor: 'pointer' } }, '+'),
            boardPages.length > 1 && e('button', { onClick: function () { deletePage(activePageIdx); }, title: 'Delete current page', 'aria-label': '✕', style: { background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', cursor: 'pointer', padding: '0 2px' } }, '✕')
          ),
          hasImages && e('div', { style: { display: 'flex', gap: '6px' } },
            e('button', { onClick: saveBoard, 'aria-label': 'Save', style: S.btn('#f3f4f6', '#374151', false) }, '💾 Save'),
            e('button', { onClick: function () { setShowPrintSettings(!showPrintSettings); }, 'aria-label': '️ Printu2026', style: S.btn('#dbeafe', '#1e40af', false) }, '🖨️ Print\u2026')
          ),
          savedBoards.length > 0 && e('button', { onClick: function () { setShowBoardGallery(!showBoardGallery); }, 'aria-label': 'Toggle saved boards gallery', style: S.btn(showBoardGallery ? LIGHT_PURPLE : '#f3f4f6', showBoardGallery ? PURPLE : '#374151', false) }, '📂 Saved (' + savedBoards.length + ')'),
          e('button', { onClick: function () { importBoardRef.current && importBoardRef.current.click(); }, 'aria-label': 'Import Board', style: S.btn('#f3f4f6', '#374151', false), title: 'Import a board from a .json file' }, '📥 Import Board'),
          e('input', { type: 'file', accept: '.json', ref: importBoardRef, style: { display: 'none' }, onChange: importSingleBoard })
        ),
        // Saved boards panel
        showBoardGallery && e('div', { style: { flexShrink: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', paddingTop: '6px' } },
          // Profile filter chips
          profiles.length > 1 && e('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', padding: '0 0 8px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px' } },
            e('button', {
              onClick: function () { setBoardProfileFilter(''); },
              'aria-label': 'All students', style: Object.assign({}, S.chip(boardProfileFilter === '' ? PURPLE : '#f3f4f6', boardProfileFilter === '' ? '#fff' : '#6b7280'), { border: 'none' })
            }, 'All students'),
            profiles.map(function (prof) {
              var active = boardProfileFilter === prof.id;
              return e('button', {
                key: prof.id,
                onClick: function () { setBoardProfileFilter(active ? '' : prof.id); },
                'aria-label': 'Filter by ' + (prof.name || 'student'),
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
                    e('div', { style: { fontSize: '10px', color: '#6b7280' } }, b.words.length + ' words')
                  ),
                  // Profile tag selector
                  e('select', {
                    value: b.profileId || '',
                    onChange: function (ev) { tagBoardProfile(b.id, ev.target.value || null); },
                    style: { fontSize: '10px', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '2px 4px', color: b.profileId ? PURPLE : '#6b7280', background: b.profileId ? LIGHT_PURPLE : '#f9fafb', cursor: 'pointer', width: '100%' },
                    title: 'Assign board to a student', 'aria-label': 'Assign board to student'
                  },
                    e('option', { value: '' }, '— No student —'),
                    profiles.map(function (p) { return e('option', { key: p.id, value: p.id }, (p.name || 'Student')); })
                  ),
                  // Action buttons row
                  e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                    e('button', { onClick: function () { loadBoard(b); }, 'aria-label': 'Load', style: S.btn(LIGHT_PURPLE, PURPLE, false) }, 'Load'),
                    b.words && b.words.some(function (w) { return w.image; }) && e('button', {
                      onClick: function () { setUseBoardId(b.id); setStrip([]); setShowCommLog(false); setUsePageIdx(0); setPredictions([]); },
                      title: 'Use this board — tap symbols to speak and build messages', 'aria-label': 'Use board in AAC mode',
                      style: S.btn('#eff6ff', '#1d4ed8', false)
                    }, '\u25b6 Use'),
                    b.words && b.words.some(function (w) { return w.image; }) && e('button', {
                      onClick: function () { setScanBoardId(b.id); setScanIndex(0); setScanPaused(false); },
                      title: 'Partner-assisted single-switch scanning mode', 'aria-label': 'Start scanning mode',
                      style: S.btn('#ecfdf5', '#065f46', false)
                    }, '\u267f Scan'),
                    e('button', { onClick: function () { exportBoard(b); }, title: 'Export this board as a .json file', 'aria-label': '⬇️', style: S.btn('#f3f4f6', '#374151', false) }, '⬇️'),
                    b.words && b.words.some(function (w) { return w.image; }) && e('button', { onClick: function () { exportBoardHTML(b); }, title: 'Export standalone HTML board — opens in any browser without AlloFlow', 'aria-label': '🌐', style: S.btn('#fef9c3', '#92400e', false) }, '🌐'),
                    liveSession && liveSession.active && e('button', {
                      title: 'Push board to student screens', 'aria-label': 'Push board to student screens',
                      onClick: function () {
                        var stripped = b.words.map(function (w) { return { word: w.word, wordType: w.wordType }; });
                        liveSession.push({ type: 'board', title: b.title, words: stripped, cols: b.cols || 4 })
                          .then(function () { addToast('Board pushed to students!', 'success'); })
                          .catch(function () { addToast('Push failed — check session connection', 'error'); });
                      },
                      style: S.btn('#ecfdf5', '#065f46', false)
                    }, '📡'),
                    e('button', { onClick: function () { deleteSavedBoard(b.id); }, 'aria-label': '🗑️', style: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', padding: '2px 4px' } }, '🗑️')
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
            e('button', { onClick: parseTextToSymbols, disabled: !sentenceInput.trim() || sentenceParsing || !onCallGemini, 'aria-label': 'Parse sentence into symbols', style: S.btn('#059669', '#fff', !sentenceInput.trim() || sentenceParsing || !onCallGemini) },
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
                'aria-label': 'Reset progress', style: S.btn('#059669', '#fff', !sentenceMapping.some(function (m) { return m.selected && !m.skip; }))
              }, '✅ Add to Board (' + sentenceMapping.filter(function (m) { return m.selected && !m.skip; }).length + ')'),
              e('button', { onClick: function () { setSentenceMapping([]); setSentenceInput(''); }, 'aria-label': 'Reset', style: S.btn('#f3f4f6', '#374151', false) }, '↩ Reset')
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
          e('button', { onClick: printBoardSized, 'aria-label': 'Print board', style: S.btn('#1e40af', '#fff', false) }, '\uD83D\uDDB6 Print Now')
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
                      word.translatedLabel && word.originalLabel && e('span', { style: { display: 'block', fontSize: Math.max(9, boardTextSize - 3) + 'px', fontWeight: 400, color: '#6b7280' } }, word.originalLabel)
                    ),
                    // Image
                    boardLoading[word.id]
                      ? e('div', { style: { width: imgSz, height: imgSz, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, spinner(24))
                      : word.image
                        ? e('img', { src: word.image, alt: word.label, style: { width: imgSz, height: imgSz, objectFit: 'contain', borderRadius: '6px', background: '#fff' } })
                        : e('div', { style: { width: imgSz, height: imgSz, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '6px', fontSize: '11px', color: '#6b7280', textAlign: 'center', padding: '4px' } }, 'Click \u2728'),
                    // Label below image (default)
                    boardTextPos === 'below' && e('span', { style: { fontSize: boardTextSize + 'px', fontWeight: 700, color: theme.textColor, textAlign: 'center', lineHeight: 1.3 } },
                      word.translatedLabel || word.label,
                      word.translatedLabel && word.originalLabel && e('span', { style: { display: 'block', fontSize: Math.max(9, boardTextSize - 3) + 'px', fontWeight: 400, color: '#6b7280' } }, word.originalLabel)
                    ),
                    // Regen button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); regenBoardCell(word.id); }, 'aria-label': 'Regenerate symbol', style: { position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px' } }, '\uD83D\uDD04'),
                    // Record audio button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); recordCellAudio(word.id); }, 'aria-label': 'Reset progress', style: { position: 'absolute', top: 4, left: 4, background: cellRecording === word.id ? 'rgba(220,38,38,0.8)' : (word.audioData ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.1)'), border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px', color: cellRecording === word.id ? '#fff' : undefined } }, cellRecording === word.id ? '⏹' : (word.audioData ? '🎙️' : '🎤')),
                    // Play custom audio button
                    word.audioData && e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); playCellAudio(word.audioData); }, 'aria-label': '🔊', style: { position: 'absolute', bottom: 4, left: 4, background: 'rgba(37,99,235,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px' } }, '🔊'),
                    // Remove button
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); setBoardWords(function (prev) { return prev.filter(function (w) { return w.id !== word.id; }); }); }, 'aria-label': 'u00d7', style: { position: 'absolute', bottom: 4, right: 4, background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: '4px', padding: '1px 4px', cursor: 'pointer', fontSize: '10px', color: '#dc2626' } }, '\u00d7')
                  );
                })
              ),
              boardColor && e('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' } },
                e('span', { style: { fontSize: '10px', color: '#6b7280', fontWeight: 600 } }, 'Colors:'),
                [['noun', 'Noun'], ['verb', 'Verb'], ['adjective', 'Adj'], ['other', 'Other']].map(function (pair) {
                  return e('label', { key: pair[0], style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#374151', cursor: 'pointer', userSelect: 'none' } },
                    e('input', {
                      type: 'color', value: catFill[pair[0]] || '#f9fafb',
                      onChange: function (ev) { var v = ev.target.value; setCatFill(function (prev) { var n = Object.assign({}, prev); n[pair[0]] = v; store(STORAGE_CAT_COLORS + '_fill', n); return n; }); },
                      title: 'Click to change ' + pair[1] + ' fill color', 'aria-label': pair[1] + ' category fill color',
                      style: { width: 18, height: 18, padding: 0, border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }
                    }),
                    pair[1]
                  );
                }),
                e('button', {
                  onClick: function () { setCatFill(CAT_COLORS); setCatBorder(CAT_BORDER); store(STORAGE_CAT_COLORS + '_fill', CAT_COLORS); store(STORAGE_CAT_COLORS + '_border', CAT_BORDER); },
                  'aria-label': 'Reset progress', style: { fontSize: '10px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }
                }, 'Reset')
              )
            )
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexDirection: 'column', gap: '10px' } },
              e('div', { style: { fontSize: '48px' } }, '📋'),
              e('p', { style: { fontWeight: 600 } }, 'Enter a topic and generate a complete communication board'),
              e('p', { style: { fontSize: '12px', maxWidth: '380px', textAlign: 'center' } }, 'AI writes the word list, you generate symbols, and export a print-ready board. Drag cells to reorder. Color coding follows AAC conventions.')
            )
      );
    }

    // ── Visual Schedule tab ────────────────────────────────────────────────
    function renderScheduleTab() {
      return e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px', gap: '12px' } },
        // Garden hint — words that would benefit from schedule context
        (function () {
          var bank = computeWordBank();
          var needsSched = bank.filter(function (w) {
            return (w.growth === 'seed' || w.growth === 'sprout') && !w.contextTypes.some(function (t) { return t === 'schedule'; }) && (w.category === 'verb' || w.category === 'other');
          }).slice(0, 5);
          if (needsSched.length === 0) return null;
          return e('div', { style: { flexShrink: 0, display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #d1fae5', flexWrap: 'wrap' } },
            e('span', { style: { fontSize: '10px', fontWeight: 600, color: '#059669', whiteSpace: 'nowrap' } }, '🌱 Could grow in a schedule:'),
            needsSched.map(function (w) {
              return e('button', { key: w.key, onClick: function () {
                setSchedInput(function (prev) { return prev ? prev + '\n' + w.displayLabel : w.displayLabel; });
              }, 'aria-label': 'Add ' + w.displayLabel + ' to schedule input', title: 'Add to schedule activities',
                style: { padding: '2px 8px', background: '#fff', border: '1px solid #4ade80', borderRadius: '12px', fontSize: '10px', fontWeight: 600, color: '#15803d', cursor: 'pointer' } },
                w.displayLabel, e('span', { style: { color: '#9ca3af', marginLeft: '2px' } }, '+'));
            }));
        })(),
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
            e('button', { onClick: generateSchedule, disabled: !schedInput.trim() || schedGenerating, 'aria-label': 'Generate visual schedule', style: S.btn(PURPLE, '#fff', !schedInput.trim() || schedGenerating) }, schedGenerating ? '⏳ Generating...' : '✨ Generate Schedule')
          ),
          schedItems.length > 0 && e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            e('button', { onClick: resetSchedule, 'aria-label': 'Reset', style: S.btn('#f3f4f6', '#374151', false) }, '🔄 Reset'),
            e('button', { onClick: saveSchedule, 'aria-label': 'Save', style: S.btn('#f3f4f6', '#374151', false) }, '💾 Save'),
            e('button', { onClick: function () { window.print(); }, 'aria-label': '️ Print', style: S.btn('#dbeafe', '#1e40af', false) }, '🖨️ Print')
          ),
          savedSchedules.length > 0 && e('button', { onClick: function () { setShowSchedGallery(!showSchedGallery); }, 'aria-label': 'Toggle saved schedules gallery', style: S.btn(showSchedGallery ? LIGHT_PURPLE : '#f3f4f6', showSchedGallery ? PURPLE : '#374151', false) }, '📂 Saved (' + savedSchedules.length + ')')
        ),
        // Saved schedules panel
        showSchedGallery && e('div', { style: { flexShrink: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' } },
          e('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' } },
            savedSchedules.map(function (s) {
              return e('div', { key: s.id, style: { flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' } },
                e('div', null,
                  e('div', { style: { fontWeight: 600, fontSize: '12px', color: '#1f2937' } }, s.title || 'Untitled Schedule'),
                  e('div', { style: { fontSize: '10px', color: '#6b7280' } }, s.items.length + ' activities')
                ),
                e('button', { onClick: function () { loadSchedule(s); }, 'aria-label': 'Load', style: S.btn(LIGHT_PURPLE, PURPLE, false) }, 'Load'),
                liveSession && liveSession.active && e('button', {
                  title: 'Push to student screens (images excluded)', 'aria-label': 'Push schedule to student screens',
                  onClick: function () {
                    var stripped = s.items.map(function (item) { return { label: item.label }; });
                    liveSession.push({ type: 'schedule', title: s.title, items: stripped, nowIndex: 0 })
                      .then(function () { addToast('Schedule pushed to students!', 'success'); })
                      .catch(function () { addToast('Push failed — check session connection', 'error'); });
                  },
                  style: S.btn('#ecfdf5', '#065f46', false)
                }, '📡'),
                e('button', { onClick: function () { deleteSavedSchedule(s.id); }, 'aria-label': '🗑️', style: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', padding: '2px 4px' } }, '🗑️')
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
                    e('span', { style: { fontSize: '12px', fontWeight: isDone ? 400 : 600, color: isDone ? '#6b7280' : '#1f2937', textAlign: 'center', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 } }, item.label),
                    isDone && e('div', { style: { fontSize: '22px', flexShrink: 0 } }, '✅'),
                    e('button', { className: 'ss-no-print', onClick: function (ev) { ev.stopPropagation(); setSchedNowId(item.id); }, 'aria-label': '▶', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: isNow ? 1 : 0.4, flexShrink: 0, padding: '2px' } }, '▶')
                  );
                })
              ),
              e('p', { className: 'ss-no-print', style: { fontSize: '11px', color: '#6b7280', marginTop: '10px' } }, 'Tap any activity to mark complete • ▶ to set current activity')
            )
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexDirection: 'column', gap: '10px' } },
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
              e('span', { style: { fontSize: '10px', color: '#6b7280' } }, 'or pick a template ↓')
            ),
            e('textarea', { value: storySituation, onChange: function (ev) { setStorySituation(ev.target.value); }, placeholder: 'e.g. Marcus is learning to wait his turn during group time', 'aria-label': 'Social story situation or goal', style: Object.assign({}, S.textarea, { height: '65px' }) }),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' } },
              STORY_TEMPLATES.concat(customTemplates).map(function (t, i) {
                var isCustom = i >= STORY_TEMPLATES.length;
                return e('button', {
                  key: t.label + i,
                  onClick: function () { setStorySituation(t.situation); setStoryDetails(t.details); },
                  'aria-label': 'Use template: ' + t.label,
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
                'aria-label': 'Save current story as reusable template', style: { padding: '3px 8px', background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', color: '#166534', whiteSpace: 'nowrap', fontWeight: 700 }
              }, '💾 Save as Template')
            )
          ),
          e('div', null,
            e('label', { style: S.lbl }, 'Additional context (optional)'),
            e('textarea', { value: storyDetails, onChange: function (ev) { setStoryDetails(ev.target.value); }, placeholder: 'e.g. Marcus is 7, has autism, loves trains', 'aria-label': 'Additional context for social story', style: Object.assign({}, S.textarea, { height: '55px' }) })
          ),
          e('button', { onClick: generateStory, disabled: !storySituation.trim() || storyGenerating || isIllustrating, 'aria-label': 'Generate social story', style: S.btn(PURPLE, '#fff', !storySituation.trim() || storyGenerating || isIllustrating) }, storyGenerating ? '⏳ Writing story...' : (isIllustrating ? '🎨 Illustrating...' : '✨ Create Social Story')),
          e('p', { style: { fontSize: '10px', color: '#6b7280' } }, 'Uses Carol Gray format — descriptive, perspective, and directive sentences. Illustrations auto-generate for each page.'),
          hasStory && e('div', { style: { borderTop: '1px solid #e5e7eb', paddingTop: '10px' } },
            e('button', { onClick: function () { window.print(); }, 'aria-label': '️ Print Story', style: Object.assign({}, S.btn('#dbeafe', '#1e40af', false), { width: '100%' }) }, '🖨️ Print Story')
          )
        ),
        // Right: story viewer
        hasStory
          ? e('div', { id: 'ss-py', style: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' } },
              // Page navigation
              e('div', { className: 'ss-no-print', style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' } },
                e('button', { onClick: function () { setStoryCurrent(function (p) { return Math.max(0, p - 1); }); }, 'aria-label': 'Previous story page', disabled: storyCurrent === 0, 'aria-label': 'Prev', style: S.btn('#f3f4f6', '#374151', storyCurrent === 0) }, '← Prev'),
                e('span', { style: { fontWeight: 600, fontSize: '13px', color: '#374151' } }, 'Page ' + (storyCurrent + 1) + ' of ' + storyPages.length),
                e('button', { onClick: function () { setStoryCurrent(function (p) { return Math.min(storyPages.length - 1, p + 1); }); }, disabled: storyCurrent === storyPages.length - 1, 'aria-label': 'Next', style: S.btn('#f3f4f6', '#374151', storyCurrent === storyPages.length - 1) }, 'Next →'),
                currentPage && e('button', { onClick: function () { speakPage(currentPage.text); }, 'aria-label': storySpeaking ? 'Stop reading aloud' : 'Read this page aloud', style: S.btn('#dcfce7', '#166534', false) }, storySpeaking ? '⏹ Stop' : '🔊 Read Aloud'),
                currentPage && e('button', { onClick: function () { regenPageIllustration(currentPage.id); }, disabled: !!storyIllustrating[currentPage.id], 'aria-label': 'Regenerate illustration for this page', style: S.btn(LIGHT_PURPLE, PURPLE, !!storyIllustrating[currentPage.id]) }, storyIllustrating[currentPage.id] ? '⏳' : '🔄 Regen Image'),
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
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexDirection: 'column', gap: '10px', padding: '20px' } },
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
          e('button', { onClick: createBook, disabled: !newBookTitle.trim(), 'aria-label': 'Create new activity book', style: S.btn(PURPLE, '#fff', !newBookTitle.trim()) }, '+ Create Set')
        ),
        // Body: left = set list, right = set contents
        e('div', { style: { display: 'flex', gap: '14px', flex: 1, overflow: 'hidden' } },
          // Left: list of books
          e('div', { style: { width: '220px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' } },
            books.length === 0
              ? e('div', { style: { color: '#6b7280', fontSize: '13px', padding: '20px 0', textAlign: 'center' } }, 'No activity sets yet.\nCreate one above and add your saved boards.')
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
                        style: { fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '2px 5px', color: activeBook.profileId ? PURPLE : '#6b7280', background: activeBook.profileId ? LIGHT_PURPLE : '#f9fafb' }
                      },
                        e('option', { value: '' }, '— None —'),
                        profiles.map(function (p) { return e('option', { key: p.id, value: p.id }, p.name || 'Student'); })
                      )
                    )
                  ),
                  e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                    e('button', { onClick: function () { printBook(activeBook); }, disabled: activeBook.boardIds.length === 0, 'aria-label': 'Reset progress', style: S.btn('#dbeafe', '#1e40af', activeBook.boardIds.length === 0) }, '\uD83D\uDDB6 Print All (' + activeBook.boardIds.length + ')'),
                    e('button', { onClick: function () { deleteBook(activeBook.id); }, 'aria-label': 'Delete activity set', style: S.btn('#fee2e2', '#dc2626', false) }, '\uD83D\uDDD1\uFE0F Delete Set')
                  )
                ),
                // Board list within this set
                e('div', { style: { flexShrink: 0 } },
                  e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'Boards in this set \u2014 drag to reorder, click + to add'),
                  activeBook.boardIds.length === 0
                    ? e('div', { style: { color: '#6b7280', fontSize: '12px', padding: '12px 0' } }, 'No boards added yet. Pick boards from your saved library below.')
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
                                  w.image ? e('img', { src: w.image, alt: w.label, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '2px' } }) : e('span', { style: { fontSize: '8px', color: '#6b7280' } }, w.label)
                                );
                              })
                            ),
                            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#1f2937', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, board.title || 'Untitled'),
                            e('div', { style: { display: 'flex', gap: '4px' } },
                              e('button', { onClick: function () { loadBoard(board); setTab('board'); }, 'aria-label': 'Open', style: Object.assign({}, S.btn(LIGHT_PURPLE, PURPLE, false), { flex: 1, fontSize: '10px', padding: '4px' }) }, 'Open'),
                              e('button', { onClick: function () { toggleBoardInBook(activeBook.id, boardId); }, 'aria-label': 'u00d7', style: Object.assign({}, S.btn('#fee2e2', '#dc2626', false), { padding: '4px 8px', fontSize: '10px' }) }, '\u00d7')
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
                          'aria-label': 'Add board: ' + (b.title || 'Untitled') + ' to activity set',
                          style: { padding: '5px 10px', border: '1px dashed #d1d5db', borderRadius: '20px', background: '#f9fafb', fontSize: '11px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' },
                          onMouseOver: function (ev) { ev.currentTarget.style.borderColor = PURPLE; ev.currentTarget.style.color = PURPLE; ev.currentTarget.style.background = LIGHT_PURPLE; },
                          onMouseOut: function (ev) { ev.currentTarget.style.borderColor = '#d1d5db'; ev.currentTarget.style.color = '#374151'; ev.currentTarget.style.background = '#f9fafb'; }
                        }, '+ ', b.title || 'Untitled');
                      })
                  )
                )
              )
            : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexDirection: 'column', gap: '10px' } },
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
    // Session debrief overlay — shows for 5 seconds after exiting AAC mode
    if (sessionDebrief && !useBoardId) {
      var db = sessionDebrief;
      return e('div', { style: S.overlay, onClick: function () { setSessionDebrief(null); } },
        e('div', { className: 'ss-garden-levelup', onClick: function (ev) { ev.stopPropagation(); }, style: { background: '#fff', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '32px', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' } },
          e('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🌱'),
          e('h2', { style: { fontSize: '20px', fontWeight: 800, color: '#1f2937', margin: '0 0 4px' } }, 'Session Complete!'),
          e('p', { style: { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' } }, db.boardTitle),
          e('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' } },
            e('div', { style: { background: '#f0fdf4', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' } },
              e('div', { style: { fontSize: '28px', fontWeight: 800, color: '#059669' } }, db.totalTaps),
              e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'taps')),
            e('div', { style: { background: '#eff6ff', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' } },
              e('div', { style: { fontSize: '28px', fontWeight: 800, color: '#2563eb' } }, db.uniqueCount),
              e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'unique words')),
            db.newCount > 0 && e('div', { style: { background: '#fef9c3', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' } },
              e('div', { style: { fontSize: '28px', fontWeight: 800, color: '#b45309' } }, db.newCount),
              e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'new!')),
            db.utteranceCount > 0 && e('div', { style: { background: '#faf5ff', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' } },
              e('div', { style: { fontSize: '28px', fontWeight: 800, color: '#7c3aed' } }, (db.mlu || 0).toFixed(1)),
              e('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'MLU'))),
          db.mostUsed.length > 0 && e('div', { style: { marginBottom: '12px' } },
            e('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' } }, 'Most used:'),
            e('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center' } },
              db.mostUsed.map(function (w) { return e('span', { key: w, style: { padding: '3px 12px', background: '#ede9fe', borderRadius: '20px', fontSize: '13px', fontWeight: 700, color: '#7c3aed' } }, w); }))),
          db.wishCount > 0 && e('div', { style: { marginBottom: '10px', padding: '8px 14px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #c4b5fd' } },
            e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#7c3aed', marginBottom: '2px' } }, '💫 ' + db.wishCount + ' wish seed' + (db.wishCount !== 1 ? 's' : '') + ' planted'),
            e('div', { style: { fontSize: '11px', color: '#6b7280' } }, db.wishLabels.join(', ') + ' — you noticed what they were reaching for')),
          e('p', { style: { fontSize: '12px', color: '#059669', fontWeight: 600, fontStyle: 'italic', margin: 0 } }, db.wishCount > 0 ? 'The reaching is how the growing starts. 💫' : 'Every word waters the garden. 🌱'),
          e('p', { style: { fontSize: '10px', color: '#9ca3af', marginTop: '12px' } }, 'Tap anywhere to close')));
    }
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
            entries: commLog.map(function (e) { return e.label === '__UTTERANCE__' ? { label: '__UTTERANCE__', length: e.length, ts: e.ts } : { label: e.label, ts: e.ts }; })
          };
          setUsageLog(function (prev) {
            var profLog = prev[pid] || { sessions: [] };
            var updated = Object.assign({}, prev, {
              [pid]: { sessions: profLog.sessions.concat([session]) }
            });
            store(STORAGE_USAGE, updated);
            return updated;
          });
          // Compute session debrief
          var wordSet = {}; var wordList = [];
          var utterances = [];
          commLog.forEach(function (en) {
            if (en.label === '__UTTERANCE__') {
              utterances.push(en.length);
            } else {
              var k = en.label.trim().toLowerCase();
              if (!wordSet[k]) { wordSet[k] = 0; wordList.push(en.label); }
              wordSet[k]++;
            }
          });
          var uniqueCount = Object.keys(wordSet).length;
          var totalTaps = commLog.filter(function (en) { return en.label !== '__UTTERANCE__'; }).length;
          var mostUsed = Object.keys(wordSet).sort(function (a, b) { return wordSet[b] - wordSet[a]; }).slice(0, 3);
          // MLU — Mean Length of Utterance
          var mlu = utterances.length > 0 ? (utterances.reduce(function (a, b) { return a + b; }, 0) / utterances.length) : 0;
          // Check for new words (not in familiarity before this session)
          var newWords = Object.keys(wordSet).filter(function (k) {
            var entry = familiarity[k];
            return !entry || (entry.taps || 0) <= wordSet[k];
          });
          // Count wish seeds planted during this session (within last 2 minutes)
          var recentWishes = wishSeeds.filter(function (w) { return w.ts && (Date.now() - new Date(w.ts).getTime()) < 120000; });
          setSessionDebrief({
            totalTaps: totalTaps, uniqueCount: uniqueCount,
            mostUsed: mostUsed, newCount: Math.min(newWords.length, uniqueCount),
            mlu: mlu, utteranceCount: utterances.length,
            wishCount: recentWishes.length,
            wishLabels: recentWishes.map(function (w) { return w.label; }),
            boardTitle: useBoard ? (useBoard.title || 'Board') : 'Board'
          });
          // Auto-dismiss after 5 seconds
          setTimeout(function () {
            setSessionDebrief(null);
            setUseBoardId(null); setStrip([]); setShowCommLog(false); setPredictions([]);
          }, 5000);
        } else {
          setUseBoardId(null); setStrip([]); setShowCommLog(false); setPredictions([]);
        }
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
        // Record utterance for MLU computation
        setCommLog(function (log) { return log.concat([{ label: '__UTTERANCE__', length: words.length, phrase: phrase, ts: new Date().toISOString() }]); });
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
        recordFamiliarity(cell.label, 'aac-tap');
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
          // "Model These" hint — shows weekly focus words on this board
          (function () {
            var boardLabels = {};
            useCells.forEach(function (c) { boardLabels[c.label.trim().toLowerCase()] = true; });
            var focusOnBoard = computeWordBank().filter(function (w) {
              return boardLabels[w.key] && (w.growth === 'sprout' || w.growth === 'growing') && w.isCore;
            }).slice(0, 3);
            if (focusOnBoard.length === 0) {
              focusOnBoard = computeWordBank().filter(function (w) {
                return boardLabels[w.key] && (w.growth === 'sprout' || w.growth === 'growing');
              }).slice(0, 3);
            }
            if (focusOnBoard.length === 0) return null;
            return e('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: '#1a1a2e', borderRadius: '7px', border: '1px solid #312e81' } },
              e('span', { style: { color: '#a78bfa', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' } }, '🌱 Model:'),
              focusOnBoard.map(function (w) {
                return e('span', { key: w.key, style: { color: '#c4b5fd', fontSize: '11px', fontWeight: 700 } }, w.displayLabel);
              }));
          })(),
          // 💫 Wish Seed — capture the moment a student reaches for a word that doesn't exist
          boardWishOpen
            ? e('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                e('input', { type: 'text', value: boardWishInput, autoFocus: true,
                  onChange: function (ev) { setBoardWishInput(ev.target.value); },
                  onKeyDown: function (ev) {
                    if (ev.key === 'Enter' && boardWishInput.trim()) {
                      var label = boardWishInput.trim();
                      var newWish = { label: label, category: 'other', note: 'Reached for during AAC session on ' + (useBoard ? (useBoard.title || 'board') : 'board'), ts: new Date().toISOString(), profileId: activeProfileId || 'default' };
                      setWishSeeds(function (prev) { var u = prev.concat([newWish]); store(STORAGE_WISHES, u); return u; });
                      setBoardWishInput(''); setBoardWishOpen(false);
                      addToast && addToast('💫 "' + label + '" — wish seed planted!', 'success');
                    }
                    if (ev.key === 'Escape') { setBoardWishOpen(false); setBoardWishInput(''); }
                  },
                  placeholder: 'What word were they reaching for?',
                  'aria-label': 'Wish seed word',
                  style: { width: '180px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #7c3aed', background: '#1e1b4b', color: '#e0e7ff', fontSize: '12px', fontFamily: 'inherit' } }),
                e('button', { onClick: function () { setBoardWishOpen(false); setBoardWishInput(''); }, style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' } }, '×'))
            : e('button', {
                onClick: function () { setBoardWishOpen(true); },
                'aria-label': 'Plant a wish seed — record a word the student wanted',
                title: 'The student is reaching for a word that isn\'t here. Capture it.',
                style: { background: '#1e1b4b', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
              }, '💫'),
          e('button', {
            onClick: function () { setShowCommLog(function (v) { return !v; }); },
            'aria-label': 'Toggle communication log', style: { background: showCommLog ? '#7c3aed' : '#334155', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
          }, '📋 Log (' + commLog.filter(function (c) { return c.label !== '__UTTERANCE__'; }).length + ')'),
          e('button', { onClick: exitUse, 'aria-label': 'Exit AAC mode', style: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' } }, '✕ Exit')
        ),
        // ── Page tabs (multi-page boards) ──
        usePages && e('div', { style: { background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '6px 16px', display: 'flex', gap: '6px', flexShrink: 0, overflowX: 'auto' } },
          usePages.map(function (pg, pi) {
            var active = pi === safeUsePageIdx;
            return e('button', {
              key: pg.id,
              onClick: function () { setUsePageIdx(pi); setPredictions([]); },
              'aria-label': (pg.title || ('Page ' + (pi + 1))) + ' tab',
              style: { padding: '5px 14px', border: 'none', borderRadius: '7px', background: active ? '#4f46e5' : '#1e293b', color: active ? '#fff' : '#94a3b8', fontWeight: active ? 700 : 400, fontSize: '12px', cursor: active ? 'default' : 'pointer', flexShrink: 0 }
            }, pg.title || ('Page ' + (pi + 1)));
          })
        ),
        // ── Sentence strip ──
        e('div', { 'aria-live': 'polite', 'aria-label': 'Sentence strip - ' + (strip.length === 0 ? 'empty' : strip.map(function (w) { return w.label; }).join(' ')), style: { background: '#1a1a2e', borderBottom: '2px solid #312e81', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, minHeight: '58px', flexWrap: 'wrap' } },
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
              'aria-label': 'Speak constructed sentence',
              style: { background: stripSpeaking ? '#6b7280' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
            }, stripSpeaking ? '\u2026' : '\uD83D\uDD0A Speak'),
            strip.length > 0 && e('button', {
              onClick: function () { setStrip(function (s) { return s.slice(0, -1); }); },
              'aria-label': 'Delete last word from sentence strip',
              style: { background: '#374151', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
            }, '\u2190 Del'),
            strip.length > 0 && e('button', {
              onClick: function () { setStrip([]); },
              'aria-label': 'Clear sentence strip', style: { background: '#374151', color: '#cbd5e1', border: 'none', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }
            }, '\uD83D\uDDD1')
          )
        ),
        // ── Word prediction chips ──
        (predictions.length > 0 || predLoading) && e('div', { 'aria-live': 'polite', 'aria-label': 'Word predictions', style: { background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
          e('span', { style: { color: '#64748b', fontSize: '11px', fontWeight: 600, flexShrink: 0 } }, predLoading ? '🤖 Predicting…' : '💡 Next:'),
          predictions.map(function (pred, pi) {
            var matchCell = useCells.find(function (c) { return c.label.toLowerCase() === pred.toLowerCase(); });
            return e('button', {
              key: pi,
              onClick: function () { if (matchCell) tapCell(matchCell); else tapCell({ label: pred, image: null }); },
              'aria-label': 'Predicted word: ' + pred,
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
          e('div', { role: 'grid', 'aria-label': 'Communication board symbols', style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(' + useCols + ', 1fr)', gap: '14px', padding: '18px', overflowY: 'auto', alignContent: 'start' } },
            useCells.length === 0
              ? e('p', { style: { color: '#475569', gridColumn: '1/-1', textAlign: 'center', paddingTop: '40px' } }, 'No generated symbols yet — go to Board Builder and generate images first.')
              : useCells.map(function (cell, idx) {
                  // Garden-aware cell: border color reflects vocabulary growth level
                  var cellKey = cell.label.trim().toLowerCase();
                  var cellFam = familiarity[cellKey];
                  var cellGrowthColor = '#334155'; // default: dark neutral
                  if (cellFam) {
                    var cScore = ((cellFam.taps || 0) + (cellFam.questCorrect || 0) * 2 + (cellFam.exposures || 0) * 0.3) / 25;
                    if (cScore >= 0.75) cellGrowthColor = '#facc15'; // mastered — gold
                    else if (cScore >= 0.45) cellGrowthColor = '#a78bfa'; // blooming — purple
                    else if (cScore >= 0.15) cellGrowthColor = '#34d399'; // growing — green
                    else cellGrowthColor = '#4ade80'; // sprout — light green
                  }
                  return e('div', {
                    key: cell.id || idx,
                    role: 'gridcell',
                    tabIndex: idx === 0 ? 0 : -1,
                    'aria-label': (cell.description ? cell.label + ': ' + cell.description : cell.label),
                    onClick: function () { tapCell(cell); },
                    onKeyDown: function (ev) {
                      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tapCell(cell); return; }
                      var grid = ev.currentTarget.parentElement;
                      var cells = Array.from(grid.querySelectorAll('[role=gridcell]'));
                      var ci = cells.indexOf(ev.currentTarget);
                      if (ci === -1) return;
                      var ni = ci;
                      switch (ev.key) {
                        case 'ArrowRight': ni = Math.min(cells.length - 1, ci + 1); break;
                        case 'ArrowLeft': ni = Math.max(0, ci - 1); break;
                        case 'ArrowDown': ni = Math.min(cells.length - 1, ci + useCols); break;
                        case 'ArrowUp': ni = Math.max(0, ci - useCols); break;
                        case 'Home': ni = Math.floor(ci / useCols) * useCols; break;
                        case 'End': ni = Math.min(cells.length - 1, (Math.floor(ci / useCols) + 1) * useCols - 1); break;
                        default: return;
                      }
                      ev.preventDefault();
                      if (ni !== ci) { ev.currentTarget.setAttribute('tabindex', '-1'); cells[ni].setAttribute('tabindex', '0'); cells[ni].focus(); }
                    },
                    style: { border: '3px solid ' + cellGrowthColor, borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#1e293b', cursor: 'pointer', transition: 'transform 0.1s, background 0.1s', userSelect: 'none', boxShadow: cellFam && cellGrowthColor === '#facc15' ? '0 0 12px rgba(250,204,21,0.3)' : 'none' },
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
                commLog.length > 0 && e('button', { onClick: exportLog, 'aria-label': 'Export communication log', style: { background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' } }, '\uD83D\uDCBE CSV'),
                commLog.length > 0 && e('button', { onClick: function () { setCommLog([]); }, 'aria-label': 'Clear communication log', style: { background: '#1e293b', color: '#ef4444', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' } }, '\uD83D\uDDD1 Clear')
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
      var exitScan = function () { setScanBoardId(null); setScanIndex(0); setScanPaused(false); setScanManual(false); };
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
      var advanceScan = function () { setScanIndex(function (prev) { return (prev + 1) % (scanCells.length || 1); }); };
      var handleScanKeyDown = function (ev) {
        if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); activateCell(); }
        if (ev.code === 'Escape') exitScan();
        // Two-switch mode: Tab or ArrowRight to advance
        if (scanManual && (ev.code === 'Tab' || ev.code === 'ArrowRight' || ev.code === 'ArrowDown')) { ev.preventDefault(); advanceScan(); }
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
          e('button', {
            onClick: function () { setScanManual(function (m) { return !m; }); }, 'aria-label': scanManual ? 'Switch to automatic scanning' : 'Switch to manual scanning',
            style: { background: scanManual ? '#7c3aed' : '#334155', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }
          }, scanManual ? '2-Switch' : '1-Switch'),
          e('span', { style: { color: '#94a3b8', fontSize: '12px', marginRight: 'auto' } }, scanManual ? 'Tab to advance, Space to select' : 'Space or tap to speak highlighted cell'),
          scanManual && e('button', { onClick: advanceScan, 'aria-label': 'Advance to next cell', style: { background: '#1e40af', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' } }, '→ Next'),
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
            onClick: function () { setScanPaused(function (p) { return !p; }); }, 'aria-label': scanPaused ? 'Resume scanning' : 'Pause scanning',
            style: { background: scanPaused ? '#22c55e' : '#f59e0b', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
          }, scanPaused ? '▶ Resume' : '⏸ Pause'),
          e('button', {
            onClick: exitScan,
            'aria-label': 'Reset progress', style: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }
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
            tab === 'quest' && renderQuestTab(),
            tab === 'search' && renderSearchTab(),
            tab === 'garden' && renderGardenTab()
          )
        )
      )
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SymbolStudio = SymbolStudio;
  // GardenBridge — exposes vocabulary data for cross-module integration (e.g., Word Sounds)
  // Reads from localStorage so it works even when Symbol Studio modal is closed
  window.AlloModules.GardenBridge = {
    getVocabulary: function () {
      try {
        var gallery = JSON.parse(localStorage.getItem('alloSymbolGallery') || '[]');
        var boards = JSON.parse(localStorage.getItem('alloSymbolBoards') || '[]');
        var fam = JSON.parse(localStorage.getItem('alloSymbolFamiliarity') || '{}');
        var words = {};
        gallery.forEach(function (s) { var k = s.label.trim().toLowerCase(); if (k) words[k] = { label: s.label.trim(), category: s.category || 'other', image: s.image || null }; });
        boards.forEach(function (b) { (b.words || []).forEach(function (w) { var k = w.label.trim().toLowerCase(); if (k && !words[k]) words[k] = { label: w.label.trim(), category: w.category || 'other', image: w.image || null }; }); });
        return Object.keys(words).map(function (k) {
          var w = words[k]; var f = fam[k] || {};
          var score = ((f.taps || 0) + (f.questCorrect || 0) * 2 + (f.exposures || 0) * 0.3) / 25;
          return { label: w.label, category: w.category, image: w.image, familiarityScore: Math.min(1, score), isMastered: score >= 0.75 };
        });
      } catch (e) { return []; }
    },
    getPhonicsWordList: function (opts) {
      var vocab = window.AlloModules.GardenBridge.getVocabulary();
      var maxLen = (opts && opts.maxLength) || 6;
      var count = (opts && opts.count) || 10;
      var preferMastered = (opts && opts.preferMastered) !== false;
      // Filter to phonics-friendly words: short, single-word, alphabetic
      var candidates = vocab.filter(function (w) { return w.label.length <= maxLen && /^[a-zA-Z]+$/.test(w.label); });
      // Sort: mastered first (student knows meaning), then by familiarity
      candidates.sort(function (a, b) {
        if (preferMastered) { var am = a.isMastered ? 1 : 0; var bm = b.isMastered ? 1 : 0; if (am !== bm) return bm - am; }
        return b.familiarityScore - a.familiarityScore;
      });
      return candidates.slice(0, count).map(function (w) { return w.label; });
    }
  };
  console.log("[CDN] Visual Supports Studio (SymbolStudio v2) loaded");
})();
