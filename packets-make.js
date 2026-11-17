// The maker page (packets-make.html): three steps, then one practice file.
// Everything happens in this tab. The only requests are for files on this site, and every one is a plain
// GET that carries no word and no choice: the scripts the page names; at step 3 the sound files listed in
// SOUND_FILES, the same ones whatever is chosen; and, for a word whose recording is in the word store, the
// store's index and the small sound file that holds the word. So the server can see WHICH of those small files
// were asked for (each holds a few dozen words), never which words. With "Include pictures" checked the page
// also gets the picture files, the same ones whatever words are chosen.
// No AI runs here, and there is no account and no cookie. What it keeps on the device is listed under "About this page".
// "Edit this word" (packets-words.js) lets a teacher give a word its sounds, a recording and a picture. That is kept
// by packets_my_words.js in this browser's storage for this site; this page reads it back (getMany) just before it
// makes a file and hands it to the builder as opts.own. None of it is sent anywhere. The microphone is asked for
// only when the teacher presses Record. The page links to packets-pictures.html, the one page that can search
// picture services; it never fetches anything from them itself.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-maker/1';
  var SOUND_CACHE = 'alloflow-packets-sounds-v1';
  var TRY_PAGE = 'packets-try.html';
  // Sizes in bytes as the files are on the site. tests/packets_site_pages.test.js compares them with the
  // files, so the "about N MB" lines stay true. The 11 MB recorded word bank (audio_bank/words.json) is
  // not used in this version: it adds 15 words that the machine-made word bank does not have.
  var SOUND_FILES = [
    { name: 'phonemes', url: 'audio_bank/phonemes.json', bytes: 592941 },
    { name: 'isolation', url: 'audio_bank/isolation.json', bytes: 605166 },
    { name: 'instructions', url: 'audio_bank/instructions.json', bytes: 3014825 },
    { name: 'kokoroWords', url: 'word_audio_kokoro_bank.json', bytes: 10188478 },
    { name: 'gapFill', url: 'audio_bank_kokoro.json', bytes: 99975 },
  ];
  var SOUND_BYTES = SOUND_FILES.reduce(function (sum, file) { return sum + file.bytes; }, 0);
  // The word store: recordings made after the word bank above, cut into many files, with one index that says
  // which file holds which word. The page gets the index, then only the files its practice words need. It
  // follows the index and never works a file name out for itself. The word list (row.shards) says which words
  // are in the store, and how large its largest file is, so a size can be stated before anything is fetched.
  var WORD_STORE_INDEX = 'word_audio_shards/index.json';
  var WORD_STORE_FORMAT = 'alloflow-word-audio-index/1';
  var WORD_FILE_NAME = /^[a-z0-9_][a-z0-9_-]*\.json$/;
  var WORD_SOUNDS_FAILED = 'The sounds for some of your words could not be downloaded. Check the connection, then try again. Your choices are still here.';
  // The most words a file can have: the loader makes at most 40 questions in one activity (MAX_ITEMS in
  // word_sounds_take_home_loader.js), one for each word, and the builder takes at most 40 words when it is
  // given no length. Custom and the words chosen by hand stop here, and the page says so where they do.
  var MAX_WORDS = 40;
  var MAX_TYPED = 60;
  var CUSTOM_WORDS = 10;     // what Custom starts at
  var LIST_PAGE = 100;       // rows of "Choose the words yourself" drawn at a time (a pool can hold 6,000 words)
  var SEEDS = { A: 1, B: 2, C: 3 };
  var VERSIONS = ['A', 'B', 'C'];
  // "Make one for each student": at most this many files in one .zip. Each file is a few megabytes, and the whole
  // .zip is held in the tab's memory while it is made, which a phone or tablet may not have room for.
  var MAX_STUDENTS = 40;
  // The page of a picture license, named beside it in the sources list (the same table as packets-print-cards.js).
  var LICENSE_DEEDS = { 'CC BY-SA 4.0': 'creativecommons.org/licenses/by-sa/4.0' };

  // The usual set in each strand, and what a first visit starts with.
  var USUAL = { syllables_rhyme: ['rhyming'], hearing_sounds: ['isolation', 'blending', 'segmentation'], letters_sounds: ['mapping'], spelling: ['missing_letter', 'spelling_bee'] };
  var FIRST_VISIT = USUAL.hearing_sounds;
  // 2026-11-16 (owner): a first visit starts at a grade level, not at "Any grade level", so the first words are ones a
  // beginning reader can read (can, get, bed) and not the most common words of all (what, right, could). It is the first
  // row of the default table: three-sound words, one letter for each sound, short vowels. Choices kept from an earlier
  // visit still win (see recall), "Any grade level" among them.
  var FIRST_STAGE = 'K early';
  // Which activities the builder can make but this page holds back is worked out when the page opens, from
  // the word list's recording flags (see heldBackBy). The rule: the builder makes a trial build of the first
  // TRIAL_WORDS words this page lists when nothing is changed (three-sound words, version A), knowing only which
  // words have a recording the page can load. An activity is held back when fewer than half of those words get a
  // question in it and a missing recording is among the reasons. Measured on 2026-11-11: Word Families gets a
  // question for about 15 words in 100, because most word endings (-ug, -ip) have no recording.
  var TRIAL_WORDS = 16;
  var HELD_BACK_REASON = 'not enough recorded sounds yet';
  var CARD_NOTES = { letter_tracing: 'Practice only. It is not scored.' };
  // Letter Trace: which letters a file traces (word_sounds_packet_builder.js, tracingCases).
  var TRACE_CASES = ['both', 'capital', 'lowercase'];
  // Choices: how many answers a board shows (word_sounds_packet_builder.js, opts.choices), and the activities it changes.
  var CHOICE_LEVELS = ['easy', 'medium', 'all'];
  var CHOICE_ACTIVITIES = ['isolation', 'blending', 'rhyming', 'counting'];
  // The words for each, on the top line of a "More options" box.
  var CHOICE_NAMES = { easy: 'Easy', medium: 'Medium', all: 'All' };
  var TRACE_NAMES = { both: 'capital, then lowercase', capital: 'capital only', lowercase: 'lowercase only' };
  // Sound label, then a word that has the sound (checked against the sound dictionary by the test).
  var SOUND_GROUPS = [
    ['Short vowels', [['a', 'cat'], ['e', 'bed'], ['i', 'pig'], ['o', 'dog'], ['u', 'sun']]],
    ['Long vowels', [['ay', 'day'], ['ee', 'see'], ['ie', 'pie'], ['oa', 'boat'], ['oo', 'moon']]],
    ['Other vowels', [['oo_short', 'book'], ['ow', 'cow'], ['oy', 'boy'], ['aw', 'saw'], ['schwa', 'sofa']]],
    ['Vowels with r', [['ar', 'car'], ['or', 'fork'], ['er', 'her'], ['ir', 'bird'], ['ur', 'burn'], ['air', 'chair'], ['ear', 'hear']]],
    ['Consonants', [['b', 'bat'], ['d', 'dig'], ['f', 'fish'], ['g', 'go'], ['h', 'hat'], ['j', 'jam'], ['k', 'kite'], ['l', 'leg'], ['m', 'map'],
      ['n', 'net'], ['p', 'pen'], ['r', 'red'], ['s', 'sun'], ['t', 'top'], ['v', 'van'], ['w', 'web'], ['y', 'yes'], ['z', 'zip']]],
    ['Two letters, one sound', [['sh', 'ship'], ['ch', 'chin'], ['th', 'thin'], ['dh', 'this'], ['ng', 'ring'], ['zh', 'vision']]],
  ];
  var SOUND_NAMES = { oo_short: 'short oo', dh: 'th (voiced)', schwa: 'schwa (uh)' };
  var POSITION_NAMES = { first: 'first sound', middle: 'in the middle', last: 'last sound' };
  // Shape by sounds, then words of that shape (checked against the word list by the test).
  var SHAPES = [['CVC', 'cat, ship'], ['CCVC', 'frog, stop'], ['CVCC', 'lamp, fast'], ['CCVCC', 'stamp'], ['CV', 'go, she'], ['VC', 'at, in']];
  var STAGE_HINT = 'A grade level keeps to the letter patterns taught by then.';
  // The kindergarten rows of the default (US, Common Core) stage table: neither has sh, ch or th (see #stage-k-note).
  var K_STAGES = ['K early', 'K late'];
  // The stages of a curriculum other than the default one (England's) wait behind "Other curricula" (#stage-other),
  // unless the page's language or the browser's says that region, or a stage of theirs is the one chosen.
  var STAGE_REGIONS = { 'england-nc': 'GB' };
  var TYPED_ONLY_SAID = 'Not offered by the picker. Used because you typed it.';
  // What a typed word needs before it can be used, and what it uses of the teacher's (see checkWord).
  var NEEDS_SOUNDS_SAID = 'Not in the sound dictionary. Set its sounds to use it, or check the spelling.';
  var NEEDS_CLIP_SAID = 'No recording yet. Record it yourself, or choose another word.';
  var EDIT_LABEL = 'Edit this word';
  var PICTURES_PAGE = 'packets-pictures.html';
  var LENGTH_NAMES = { short: 'Short', regular: 'Regular', long: 'Long', custom: 'Custom' };
  var PRESETS = ['short', 'regular', 'long'];
  // The line under "Include pictures" when no word of the file has one. The box stays usable: checked, it makes the plain file.
  var NO_PICTURES_SAID = 'None of these words has a picture yet. Add one with Edit this word in step 2, or choose words with pictures.';
  var NO_INDEX_SAID = 'The list of pictures did not load, so only pictures you added can be used. Load the page again to get the list.';
  var LARGE_FILE_BYTES = 10e6;
  var LARGE_FILE_SAID = 'This file is over 10 MB. Some email and school platforms block large files, and older phones open them slowly. Choose a shorter length, fewer words or uncheck Include pictures to make it smaller.';

  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  var setText = function (id, text) { var node = $(id); if (node) node.textContent = text; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var megabytes = function (bytes) { return (bytes / 1e6).toFixed(1); };
  var fileSize = function (bytes) { return bytes >= 1e6 ? megabytes(bytes) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; };
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };

  var core, dictionary, wordlist, loader, builder;
  var strands = [], order = [], heldBack = [], recordedOnly = [], stageRows = [], otherStageGroups = [], otherStagesOn = false;
  var state = null;
  var picked = null, pickTimer = 0, pickRun = 0;
  var ownRows = [], ownTimer = 0;
  var step = 1;

  function defaults() {
    return { activities: FIRST_VISIT.slice(), mode: 'pick', sound: '', position: 'any', shape: '', stage: stageRow(FIRST_STAGE) ? FIRST_STAGE : '', removed: [], own: '', version: 'A',
      length: core && core.LESSON_LENGTHS[core.LESSON_LENGTH_DEFAULT] ? core.LESSON_LENGTH_DEFAULT : 'regular', title: '', titleEdited: false,
      // order: the page picks the most common words that fit ('common'), or any words that fit ('random', "Pick different
      // words"). shuffle: which random set, one more each press. Neither changes the build seed (the version's 1, 2 or 3).
      order: 'common', shuffle: 0,
      // count: Custom's number of words. hand: the teacher chose the words in the list; chosen: those words, in the order checked.
      count: CUSTOM_WORDS, hand: false, chosen: [],
      // spread: mix the picked words by their number of sounds (for Sound Counting). label: the teacher's label for the first
      // group of words. groups: up to MAX_GROUPS more groups, each { label, stage, sound, shape, count }. 2026-11-16.
      spread: false, label: GROUP_LABELS[0], groups: [],
      // learner: a student's code name for the file (step 3). It is not kept: the next file is often for someone else.
      learner: '',
      // tracing: Letter Trace traces the capital, then the lowercase ('both'), or one of them.
      tracing: 'both',
      // choices: fewer answers to choose from ('easy'), 'medium' (the default) or 'all', as Word Sounds does by level.
      choices: 'medium',
      directionsOnce: false, repeatMissed: false };
  }
  function wordCount(value) { var n = Number(value); return n >= 1 && n <= MAX_WORDS && Math.floor(n) === n ? n : 0; }
  function shuffleCount(value) { var n = Number(value); return n >= 1 && n < 1e6 && Math.floor(n) === n ? n : 1; }

  // ---------------------------------------------------------------------------
  // What this page keeps: the last choices, in this browser only
  // ---------------------------------------------------------------------------
  function wordsForHandoff() {
    try { return typeof fileWords === 'function' ? fileWords() : []; } catch (_) { return []; }
  }
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, activities: state.activities, mode: state.mode, sound: state.sound, position: state.position,
        shape: state.shape, stage: state.stage, own: state.own, version: state.version, length: state.length, count: state.count, hand: state.hand, chosen: state.chosen, choices: state.choices, tracing: state.tracing, directionsOnce: !!state.directionsOnce, repeatMissed: !!state.repeatMissed,
        order: state.order === 'random' ? 'random' : 'common', shuffle: state.order === 'random' ? state.shuffle : 0, title: titleForHandoff(), words: wordsForHandoff(),
        spread: !!state.spread, label: state.label, groups: state.groups.map(function (g) { return { label: g.label, stage: g.stage, sound: g.sound, shape: g.shape, count: g.count }; }) }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  // The file's title, for "Present or export slides" (packets-present-export.js reads it with the words).
  function titleForHandoff() {
    try { return String(titleNow()).slice(0, 80); } catch (_) { return ''; }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved || saved.v !== 1) return fresh;
    if (Array.isArray(saved.activities)) fresh.activities = order.filter(function (id) { return saved.activities.indexOf(id) >= 0; });
    if (saved.mode === 'own' || saved.mode === 'pick') fresh.mode = saved.mode;
    if (typeof saved.sound === 'string' && Array.prototype.some.call($('f-sound').options, function (option) { return option.value === saved.sound; })) fresh.sound = saved.sound;
    if (['any', 'first', 'middle', 'last'].indexOf(saved.position) >= 0) fresh.position = saved.position;
    // Choices kept from an earlier visit win over what a first visit starts with: "Any grade level" stays "Any grade level",
    // and a browser that kept its choices before 2026-11-16 keeps the pattern it started with then (CVC).
    fresh.shape = saved.shape === '' || SHAPES.some(function (row) { return row[0] === saved.shape; }) ? saved.shape : 'CVC';
    fresh.stage = stageRow(saved.stage) || levelRow(saved.stage) ? saved.stage : '';
    if (saved.order === 'random') { fresh.order = 'random'; fresh.shuffle = shuffleCount(saved.shuffle); }
    if (typeof saved.own === 'string') fresh.own = saved.own.slice(0, 4000);
    if (SEEDS[saved.version]) fresh.version = saved.version;
    if (saved.length === 'custom' || (LENGTH_NAMES[saved.length] && core.LESSON_LENGTHS[saved.length])) fresh.length = saved.length;
    if (wordCount(saved.count)) fresh.count = wordCount(saved.count);
    if (saved.hand === true) fresh.hand = true;
    if (saved.spread === true) fresh.spread = true;
    if (GROUP_LABELS.indexOf(saved.label) >= 0) fresh.label = saved.label;
    if (Array.isArray(saved.groups)) fresh.groups = saved.groups.slice(0, MAX_GROUPS).filter(function (g) { return g && typeof g === 'object'; }).map(cleanGroup);
    if (TRACE_CASES.indexOf(saved.tracing) >= 0) fresh.tracing = saved.tracing;
    if (CHOICE_LEVELS.indexOf(saved.choices) >= 0) fresh.choices = saved.choices;
    if (saved.directionsOnce === true) fresh.directionsOnce = true;
    if (saved.repeatMissed === true) fresh.repeatMissed = true;
    if (Array.isArray(saved.chosen)) fresh.chosen = saved.chosen.filter(function (word, i, all) { return typeof word === 'string' && /^[a-z]+$/.test(word) && word.length >= 2 && word.length <= maxLetters() && all.indexOf(word) === i; }).slice(0, MAX_WORDS);
    return fresh;
  }

  // ---------------------------------------------------------------------------
  // Step 1: what to practice
  // ---------------------------------------------------------------------------
  function listed(names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); }
  function drawStrands() {
    var host = $('strands');
    host.textContent = '';
    strands.forEach(function (strand) {
      // One box for each group of activities (2026-11-16). It opens by itself when one of its activities is chosen
      // (openStrands); its top line says how many are.
      var group = el('details', 'strand');
      group.setAttribute('aria-labelledby', 'strand-' + strand.key);
      group.setAttribute('data-strand', strand.key);
      var head = el('summary', 'strand-head');
      var title = el('h3', '', strand.name);
      title.id = 'strand-' + strand.key;
      head.appendChild(title);
      head.appendChild(el('span', 'strand-count'));
      group.appendChild(head);
      var usual = (USUAL[strand.key] || []).filter(function (id) { return strand.ids.indexOf(id) >= 0; });
      if (usual.length && usual.length < strand.ids.length) {
        var button = el('button', 'btn btn-text btn-small strand-usual', 'Choose the usual set');
        button.type = 'button';
        button.setAttribute('aria-label', 'Choose the usual set for ' + strand.name + ': ' + usual.map(core.activityEnglishName).join(', '));
        button.addEventListener('click', function () {
          state.activities = order.filter(function (id) { return strand.ids.indexOf(id) >= 0 ? usual.indexOf(id) >= 0 : state.activities.indexOf(id) >= 0; });
          activitiesChanged();
        });
        group.appendChild(button);
      }
      var list = el('div', 'choices');
      strand.ids.forEach(function (id) {
        var label = el('label', 'choice');
        var box = el('input');
        box.type = 'checkbox';
        box.value = id;
        box.addEventListener('change', function () {
          state.activities = order.filter(function (other) { return other === id ? box.checked : state.activities.indexOf(other) >= 0; });
          activitiesChanged();
        });
        label.appendChild(box);
        label.appendChild(el('span', 'choice-name', core.activityLabel(id)));
        label.appendChild(el('span', 'choice-line', core.activitySkillLabel(id) + '.'));
        if (CARD_NOTES[id]) label.appendChild(el('span', 'choice-note', CARD_NOTES[id]));
        list.appendChild(label);
      });
      group.appendChild(list);
      host.appendChild(group);
    });
    // What is not offered, and the plain reason for each kind, folded behind one line.
    var held = heldBack.map(core.activityEnglishName);
    var missing = core.activityIds().filter(function (id) { return order.indexOf(id) < 0 && heldBack.indexOf(id) < 0; }).map(core.activityEnglishName);
    var parts = [], notCount = held.length + missing.length;
    if (held.length) parts.push(listed(held) + ' (' + HELD_BACK_REASON + ').');
    if (missing.length) parts.push(listed(missing) + ' (' + (missing.length === 1 ? 'it' : 'they') + ' cannot be made from a word list alone yet).');
    setText('not-offered-summary', count(notCount, 'more activity is', 'more activities are') + ' not in this version');
    setText('not-offered-text', parts.length ? 'Not in this version: ' + parts.join(' ') : '');
    show('not-offered', parts.length > 0);
  }
  function syncActivities() {
    Array.prototype.forEach.call($('strands').querySelectorAll('input[type="checkbox"]'), function (box) {
      box.checked = state.activities.indexOf(box.value) >= 0;
      box.parentNode.classList.toggle('is-on', box.checked);
    });
    var tracing = state.activities.indexOf('letter_tracing') >= 0;
    show('trace-cases-field', tracing);
    if ($('f-trace-cases')) $('f-trace-cases').value = state.tracing;
    var leveled = state.activities.some(function (id) { return CHOICE_ACTIVITIES.indexOf(id) >= 0; });
    show('choice-level-field', leveled);
    if ($('f-choices')) $('f-choices').value = state.choices;
    // Each group's top line: how many of its activities are chosen.
    Array.prototype.forEach.call($('strands').querySelectorAll('details.strand'), function (group) {
      var on = group.querySelectorAll('input[type="checkbox"]:checked').length, node = group.querySelector('.strand-count');
      if (node) node.textContent = on ? on + ' chosen' : 'none chosen';
    });
    // "More options" of step 1: shown when one of its two choices applies; its top line says what they are now.
    var now = [];
    if (leveled) now.push('Choices: ' + CHOICE_NAMES[state.choices]);
    if (tracing) now.push('Letter Trace: ' + TRACE_NAMES[state.tracing]);
    show('more-1', now.length > 0);
    setText('more-1-now', now.join(', '));
    openMore('more-1', (leveled && state.choices !== 'medium') || (tracing && state.tracing !== 'both'));
    var n = state.activities.length;
    setText('activity-count', n ? count(n, 'activity', 'activities') + ' chosen.' : 'No activity is chosen yet.');
    if (n) setText('step-1-problem', '');
    drawQuick();
  }
  function activitiesChanged() {
    syncActivities();
    remember();
  }
  // A "More options" box opens by itself when something inside it is set. It is never closed for the teacher.
  function openMore(id, set) { var box = $(id); if (box && set && !box.open) box.open = true; }
  function closeMores() { ['more-1', 'more-2', 'more-3'].forEach(function (id) { if ($(id)) $(id).open = false; }); }
  // The groups of step 1: open when one of their activities is chosen. With none chosen anywhere, all are open.
  function openStrands() {
    var any = state.activities.length > 0;
    Array.prototype.forEach.call($('strands').querySelectorAll('details.strand'), function (group) {
      group.open = !any || group.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    });
  }
  // The line under "Make it with the usual settings": what the file would be made with, as chosen now.
  function drawQuick() {
    if (!$('quick-line')) return;
    var acts = order.filter(function (id) { return state.activities.indexOf(id) >= 0; }).map(core.activityLabel);
    var words = state.mode === 'own' ? 'Your own words' : state.hand ? 'The words you chose' : (state.stage ? stageName(state.stage) : 'Any grade level') + ', ' + count(wordsFor(state.length), 'word');
    setText('quick-line', acts.length ? 'Skips to step 3 and makes the file with what is chosen now: ' + listed(acts) + '. ' + words + '. You can still change anything.'
      : 'Choose at least one activity first.');
  }

  // ---------------------------------------------------------------------------
  // Step 2: which words
  // ---------------------------------------------------------------------------
  function seed() { return SEEDS[state.version] || 1; }
  function soundName(label) { return SOUND_NAMES[label] || label; }
  // How many words a file of this length uses: the app's lengths (10, 20, 30 questions) shared between the activities.
  // Custom: the number the teacher typed, as words (1 to MAX_WORDS).
  function wordsFor(length) {
    if (length === 'custom') return wordCount(state.count) || CUSTOM_WORDS;
    var row = core.LESSON_LENGTHS[length] || core.LESSON_LENGTHS.regular;
    return Math.max(1, Math.min(MAX_WORDS, Math.ceil(row.items / Math.max(1, state.activities.length))));
  }
  // How many words the picker lists: enough for a Long file, or for Custom when that is more.
  function pickTarget() { return Math.max(wordsFor('long'), state.length === 'custom' ? wordsFor('custom') : 0); }
  function criteria(change) {
    var now = { sound: state.sound, position: state.position, shape: state.shape, stage: state.stage };
    Object.keys(change || {}).forEach(function (key) { now[key] = change[key]; });
    // The words the teacher removed are NOT handed to the picker (see pick): a few more words are asked for instead.
    var asked = { count: pickTarget() + state.removed.length, exclude: recordedOnly.slice() };
    if (now.sound) { asked.targetSound = now.sound; asked.position = now.position; }
    if (now.shape) asked.shape = now.shape;
    if (levelRow(now.stage)) asked.level = levelRow(now.stage).level;
    else if (now.stage) asked.stage = now.stage;
    // "Pick different words": any words that fit, not the most common first.
    if (state.order === 'random') asked.mix = 'any';
    // Mixed by number of sounds, when asked for and no one pattern is chosen (a pattern fixes the number of sounds).
    if (state.spread && !now.shape) asked.spread = 'sounds';
    return asked;
  }
  // The seed of the pick: the version's, and with "Pick different words" which random set it is. The seed the file is
  // BUILT with stays the version's (1, 2 or 3; see packetOptions), so "Open a file I made", the versions in turn for each
  // student and the wrong answers work as they did.
  function pickSeed() { return state.order === 'random' ? 'r' + shuffleCount(state.shuffle) + '|' + seed() : seed(); }
  // Removing a word removes only that word: the picker's answer is the same as before the removal, and the removed
  // words are taken out of it here, so every other word keeps its place and the next one in line fills the gap.
  // (Until 2026-11-16 the removed words were left out inside the picker, whose seeded mix then changed other words.)
  function pickFirst(change) {
    var result = builder.pickWords(criteria(change), { wordlist: wordlist, core: core, dictionary: dictionary, seed: pickSeed() });
    if (!state.removed.length) return result;
    var gone = 0;
    var words = result.words.filter(function (word) { var out = state.removed.indexOf(word) >= 0; if (out) gone += 1; return !out; }).slice(0, pickTarget());
    return { words: words, pool: Math.max(0, result.pool - state.removed.length), reasons: result.reasons, criteria: result.criteria, removed: gone };
  }

  // ---------------------------------------------------------------------------
  // More groups of words (2026-11-16): new words and review words in one file
  // ---------------------------------------------------------------------------
  // The first group is the choices of step 2. Each further group has its own grade level, sound and pattern, and a
  // number of words. The file's length does not change: a group's words take places from the first group, which
  // keeps at least one. The words are spread through the list, so a student meets them mixed. The label is for the
  // teacher (the chips, the summary of step 3): it is not written anywhere a student sees.
  function cleanGroup(g) {
    var n = Math.floor(Number(g.count));
    return { label: GROUP_LABELS.indexOf(g.label) >= 0 ? g.label : GROUP_LABELS[1], stage: stageRow(g.stage) || levelRow(g.stage) ? g.stage : '',
      sound: typeof g.sound === 'string' && Array.prototype.some.call($('f-sound').options, function (option) { return option.value === g.sound; }) ? g.sound : '', shape: SHAPES.some(function (row) { return row[0] === g.shape; }) ? g.shape : '',
      count: n >= 1 && n <= MAX_GROUP_WORDS ? n : 3 };
  }
  function groupsOn() { return state.mode === 'pick' && !state.hand && state.groups.length > 0; }
  function pickGroup(group, taken, index) {
    var asked = { count: MAX_GROUP_WORDS + state.removed.length + taken.length, exclude: recordedOnly.concat(taken) };
    if (group.sound) { asked.targetSound = group.sound; asked.position = 'any'; }
    if (group.shape) asked.shape = group.shape;
    if (levelRow(group.stage)) asked.level = levelRow(group.stage).level; else if (group.stage) asked.stage = group.stage;
    if (state.order === 'random') asked.mix = 'any';
    if (state.spread && !group.shape) asked.spread = 'sounds';
    var result = builder.pickWords(asked, { wordlist: wordlist, core: core, dictionary: dictionary, seed: pickSeed() + '|group' + (index + 1) });
    return { pool: result.pool, words: result.words.filter(function (word) { return state.removed.indexOf(word) < 0; }) };
  }
  // Several lists as one, each spread evenly through it (6 and 4: the fourth, sixth ... places go to the second list).
  function spreadThrough(lists) {
    var all = [];
    lists.forEach(function (list, li) { list.forEach(function (word, i) { all.push({ word: word, at: (i + 0.5) / list.length, list: li }); }); });
    all.sort(function (a, b) { return a.at - b.at || a.list - b.list; });
    return all.map(function (entry) { return entry.word; });
  }
  function pick(change) {
    var main = pickFirst(change);
    if (change || !groupsOn()) return main;
    var total = wordsFor(state.length), room = total - 1, taken = [], labels = {}, parts = [];
    state.groups.forEach(function (group, index) {
      var got = pickGroup(group, taken, index), use = got.words.slice(0, Math.max(0, Math.min(group.count, room)));
      room -= use.length;
      use.forEach(function (word) { labels[word] = group.label; });
      taken = taken.concat(use);
      parts.push({ label: group.label, words: use, pool: got.pool, asked: group.count });
    });
    var rest = main.words.filter(function (word) { return taken.indexOf(word) < 0; });
    var first = rest.slice(0, Math.max(1, total - taken.length));
    first.forEach(function (word) { labels[word] = state.label; });
    var file = spreadThrough([first].concat(parts.map(function (part) { return part.words; })));
    return { words: file.concat(rest.slice(first.length)), pool: main.pool, reasons: main.reasons, criteria: main.criteria, removed: main.removed,
      labels: labels, parts: [{ label: state.label, words: first, pool: main.pool, asked: first.length }].concat(parts), madeFor: total, firstCount: first.length };
  }
  // The pick is made for one length. When the length has changed since (step 3), it is made again before it is read.
  function currentPick() {
    if (picked && picked.madeFor != null && picked.madeFor !== wordsFor(state.length)) { try { picked = pick(); } catch (_) { /* the last pick stays */ } }
    return picked;
  }

  // The sounds that at least one word on offer has. The picker itself says which words are on offer.
  function soundsOnOffer() {
    var have = {};
    builder.pickWords({ count: 100000, exclude: recordedOnly }, { wordlist: wordlist, core: core, dictionary: dictionary, seed: 1 }).words.forEach(function (word) {
      var taught = dictionary.lookup(word)[0];
      if (taught) Array.prototype.forEach.call(taught, function (label) { have[label] = true; });
    });
    return have;
  }
  // The sounds the words of ONE grade level have, or null for any grade level (then every sound on offer has words).
  // Kept for each grade level until the words left out change (a recording added or removed in My words).
  var soundsAtStage = {};
  function soundsFor(stage) {
    if (!stage) return null;
    var key = stage + '|' + recordedOnly.length;
    if (!soundsAtStage[key]) {
      var have = {};
      var ask = { count: 100000, exclude: recordedOnly };
      if (levelRow(stage)) ask.level = levelRow(stage).level; else ask.stage = stage;
      builder.pickWords(ask, { wordlist: wordlist, core: core, dictionary: dictionary, seed: 1 }).words.forEach(function (word) {
        var taught = dictionary.lookup(word)[0];
        if (taught) Array.prototype.forEach.call(taught, function (label) { have[label] = true; });
      });
      soundsAtStage[key] = have;
    }
    return soundsAtStage[key];
  }
  // The stage rows come from the builder (its table names the document behind each row).
  function stageRow(id) {
    for (var i = 0; i < stageRows.length; i++) if (stageRows[i].id === id) return stageRows[i];
    return null;
  }
  // The wider levels (the builder's WIDER_LEVELS): two more choices in the Grade level list that are not grade levels.
  // Kept in state.stage as 'wider:challenging' or 'wider:advanced'.
  // The longest practice word: the builder's number (15 since 2026-11-16; a grade level's own words stay at 10 letters).
  // Asked for when needed: the builder is set after this script's first lines have run.
  function maxLetters() { return (builder && builder.MAX_LETTERS) || 10; }
  var LEVELS = [
    { id: 'wider:challenging', level: 'challenging', name: 'More challenging words', line: 'Past the grade levels: words found in at least 10 of the 400 children\'s books, but not among the most familiar. Chosen by how widely a word is used, not from a curriculum. Any letter pattern, up to 15 letters.' },
    { id: 'wider:advanced', level: 'advanced', name: 'Advanced words', line: 'Rarer words: in fewer than 10 of the 400 children\'s books, or in none. For older students, enrichment and spelling practice. Chosen by how widely a word is used, not from a curriculum. Any letter pattern, up to 15 letters.' },
  ];
  var widerGroup = null;
  function levelRow(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null; }
  function stageName(id) { var wide = levelRow(id); if (wide) return wide.name; var row = stageRow(id); return String(row ? row.label : id).split(':')[0].trim(); }
  function stageDetail(id) { var row = stageRow(id); return row ? String(row.label).split(':').slice(1).join(':').trim() : ''; }
  // One short line for a stage, made from the builder's own row: a few of its example words and its limits.
  function stageLine(id) {
    if (levelRow(id)) return levelRow(id).line;
    var row = stageRow(id);
    if (!row) return STAGE_HINT;
    var examples = [], parts = [], limits = [];
    (stageDetail(id).match(/\(([^)]*)\)/g) || []).forEach(function (group) {
      group.slice(1, -1).split(',').slice(0, 2).forEach(function (word) {
        var plain = word.trim();
        if (/^[a-z]+$/.test(plain) && examples.length < 5) examples.push(plain);
      });
    });
    if (row.maxSounds > 0) limits.push('up to ' + count(row.maxSounds, 'sound'));
    if (row.maxSyllables > 0) limits.push(row.maxSyllables === 1 ? 'one syllable' : 'up to ' + row.maxSyllables + ' syllables');
    if (examples.length) parts.push('New here: ' + examples.join(', ') + '.');
    parts.push(limits.length ? limits.join(', ').replace(/^u/, 'U').replace(/^o/, 'O') + '.' : 'Words of any length.');
    if (row.verified === false) parts.push('Not yet checked against a source.');
    return parts.join(' ');
  }
  // The longer note, behind "Why": what the builder's stage table says the stage adds, and its source.
  function stageWhy(id) {
    var row = stageRow(id), detail = stageDetail(id);
    if (!row) return '';
    return (detail ? detail.charAt(0).toUpperCase() + detail.slice(1) + '. ' : '') + (row.note || '');
  }
  var GROUP_LABELS = ['New', 'Review', 'Challenge', 'Extra'], MAX_GROUPS = 2, MAX_GROUP_WORDS = 20;
  // A word's number of sounds: the teacher's own, when they set them, else the dictionary's.
  function soundsIn(word) {
    var mine = typeof ownSoundsOf === 'function' ? ownSoundsOf(word) : null;
    if (mine && mine.length) return mine.length;
    var row = wordlist.get(word);
    return row ? row.sounds : 0;
  }
  // What the words do not suit (2026-11-16). Sound Counting needs words with different numbers of sounds: with the
  // most common words first, ten words were all 2 or 3 sounds long, and with a pattern chosen all the same.
  function drawMixNotes() {
    var host = $('mix-notes');
    if (!host) return;
    host.textContent = '';
    if (state.mode !== 'pick') { show('mix-notes', false); return; }
    var words = chipWords();
    var counting = state.activities.indexOf('counting') >= 0 && words.length >= 3;
    var numbers = [];
    words.forEach(function (word) { var n = soundsIn(word); if (n && numbers.indexOf(n) < 0) numbers.push(n); });
    numbers.sort(function (a, b) { return a - b; });
    var picking = state.mode === 'pick' && !state.hand, name = core.activityLabel('counting');
    // What the grade level has to offer with any pattern: the button is there only when it would change something.
    var offer = picking ? poolSoundNumbers() : [], mixedNow = picking && state.spread && !state.shape;
    if (counting && numbers.length && numbers.length <= 2) {
      var note = el('p', 'note mix-note');
      note.setAttribute('data-mix', 'counting');
      note.appendChild(el('span', '', numbers.length === 1
        ? name + ': every word here has ' + count(numbers[0], 'sound') + ', so the answer is always ' + numbers[0] + '.'
        : name + ': these words have only ' + numbers[0] + ' or ' + numbers[1] + ' sounds, so there are only two answers.'));
      if (picking && !mixedNow && offer.length > numbers.length) {
        var fix = el('button', 'btn btn-small', state.shape ? 'Mix in words with other numbers of sounds (any pattern)' : 'Mix in words with other numbers of sounds');
        fix.type = 'button';
        fix.id = 'mix-fix';
        fix.addEventListener('click', function () { state.spread = true; state.shape = ''; pickChanged(false); mixFocus = 'mix-undo'; });
        note.appendChild(document.createTextNode(' '));
        note.appendChild(fix);
      } else if (picking) note.appendChild(el('span', 'mix-why', ' The words that fit these choices all have ' + (offer.length > 1 ? offer.slice(0, -1).join(', ') + ' or ' + offer[offer.length - 1] : (offer[0] || numbers[0])) + ' sounds. A later grade level, or no sound to practice, gives a wider mix.'));
      else note.appendChild(el('span', 'mix-why', ' Add a few words with a different number of sounds.'));
      host.appendChild(note);
    }
    if (picking && state.spread && !state.shape) {
      var on = el('p', 'result-sub mix-on');
      on.setAttribute('data-mix', 'spread');
      on.appendChild(el('span', '', numbers.length > 1 ? 'The words are mixed by their number of sounds (' + numbers[0] + ' to ' + numbers[numbers.length - 1] + ').' : 'The words are mixed by their number of sounds.'));
      var undo = el('button', 'btn btn-text btn-small', 'Stop mixing by number of sounds');
      undo.type = 'button';
      undo.id = 'mix-undo';
      undo.addEventListener('click', function () { state.spread = false; pickChanged(false); mixFocus = 'mix-fix'; });
      on.appendChild(document.createTextNode(' '));
      on.appendChild(undo);
      host.appendChild(on);
    }
    show('mix-notes', host.children.length > 0);
    if (mixFocus) { var to = $(mixFocus) || $('pick-line'); mixFocus = ''; if (to && typeof to.focus === 'function') to.focus(); }
  }
  var mixFocus = '', groupFocus = '', mixPoolKey = null, mixPoolNumbers = [];
  // The numbers of sounds (2 to 6) among ALL the words that fit the first group's choices with any pattern.
  function poolSoundNumbers() {
    var asked = criteria({ shape: '' });
    delete asked.spread; delete asked.mix;
    asked.count = 100000;
    asked.exclude = recordedOnly.slice();
    var key = JSON.stringify([asked.targetSound || '', asked.position || '', asked.stage || '', asked.level || '', recordedOnly.length]);
    if (key !== mixPoolKey) {
      var seen = {};
      try { builder.pickWords(asked, { wordlist: wordlist, core: core, dictionary: dictionary, seed: 1 }).words.forEach(function (word) { var n = soundsIn(word); if (n >= 2 && n <= 6) seen[n] = true; }); } catch (_) { /* no words: no numbers */ }
      mixPoolKey = key;
      mixPoolNumbers = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    }
    return mixPoolNumbers;
  }
  // The further groups: one small set of fields each, made from the lists of step 2 so the choices are the same.
  function drawGroups() {
    var host = $('groups'), box = $('groups-box');
    if (!host || !box) return;
    show('groups-box', state.mode === 'pick' && !state.hand);
    host.textContent = '';
    var on = groupsOn();
    // The teacher's labels in one line, with the first group's label to choose.
    var line = $('pick-labels');
    if (line) {
      line.textContent = '';
      show('pick-labels', on);
      if (on && picked && picked.parts) {
        line.appendChild(el('span', '', 'Labels only you see: ' + picked.parts.map(function (part) { return part.label + ' ' + part.words.length; }).join(', ') + '. Students see the words mixed, with no label.'));
      }
    }
    if (on) host.appendChild(groupFields(-1));
    state.groups.forEach(function (group, index) { host.appendChild(groupFields(index)); });
    var add = $('group-add');
    if (add) { add.disabled = state.groups.length >= MAX_GROUPS; add.textContent = state.groups.length ? 'Add a third group of words' : 'Add another group of words'; }
    if (groupFocus) { var to = $(groupFocus) || add; groupFocus = ''; if (to && typeof to.focus === 'function') to.focus(); }
  }
  function groupFields(index) {
    var first = index < 0, group = first ? null : state.groups[index], id = first ? 'g0' : 'g' + (index + 1);
    var part = picked && picked.parts ? picked.parts[index + 1] : null;
    var box = el('fieldset', 'group');
    box.setAttribute('data-group-index', String(index + 1));
    box.appendChild(el('legend', '', first ? 'First group: the choices above' : (index === 0 ? 'Second group' : 'Third group')));
    var fields = el('div', 'group-fields');
    var field = function (labelText, control) { var wrap = el('div', 'field'); var label = el('label', '', labelText); label.setAttribute('for', control.id); wrap.appendChild(label); wrap.appendChild(control); fields.appendChild(wrap); };
    var select = function (name, source, value, onChange) {
      var node = document.createElement('select');
      node.id = id + '-' + name;
      if (typeof source === 'string') { node.innerHTML = $(source).innerHTML; Array.prototype.forEach.call(node.options, function (o) { o.disabled = false; o.textContent = o.getAttribute('data-name') || o.textContent; }); }
      else source.forEach(function (text) { var o = el('option', '', text); o.value = text; node.appendChild(o); });
      node.value = value;
      node.addEventListener('change', function () { onChange(node.value); groupFocus = node.id; pickChanged(true); });
      return node;
    };
    field('Label (only you see it)', select('label', GROUP_LABELS, first ? state.label : group.label, function (v) { if (first) state.label = v; else group.label = v; }));
    if (!first) {
      field('Grade level', select('stage', 'f-stage', group.stage, function (v) { group.stage = v; }));
      field('A sound to practice', select('sound', 'f-sound', group.sound, function (v) { group.sound = v; }));
      field('Pattern', select('shape', 'f-shape', group.shape, function (v) { group.shape = v; }));
      var number = document.createElement('input');
      // A text box with the number keypad: it takes the page's field style (a number box was 33 px tall).
      number.type = 'text'; number.id = id + '-count'; number.inputMode = 'numeric'; number.maxLength = 2; number.autocomplete = 'off'; number.setAttribute('pattern', '[0-9]*');
      number.value = String(group.count);
      number.addEventListener('change', function () { var n = Math.floor(Number(number.value)); group.count = n >= 1 ? Math.min(MAX_GROUP_WORDS, n) : 1; groupFocus = number.id; pickChanged(true); });
      field('How many words', number);
    }
    box.appendChild(fields);
    if (!first) {
      var got = part ? part.words.length : 0;
      var says = !part ? '' : part.pool === 0 ? 'No words fit these choices.'
        : got < group.count ? (part.pool < group.count ? 'Only ' + count(part.pool, 'word fits', 'words fit') + '.' : 'The file has room for ' + count(got, 'word') + ' from this group. A longer file (step 3) has room for more.')
          : count(got, 'word') + ' in the file: ' + part.words.join(', ') + '.';
      var said = el('p', 'result-sub group-said', says);
      said.id = id + '-said';
      box.appendChild(said);
      var remove = el('button', 'btn btn-text btn-small', 'Remove this group');
      remove.type = 'button';
      remove.id = id + '-remove';
      remove.addEventListener('click', function () { state.groups.splice(index, 1); groupFocus = 'group-add'; pickChanged(true); });
      box.appendChild(remove);
    }
    return box;
  }
  function addGroup() {
    if (state.groups.length >= MAX_GROUPS) return;
    // A new group starts as review: the grade level before the one chosen, when there is one.
    var ids = stageRows.filter(function (row) { return !otherStage(row); }).map(function (row) { return row.id; }), at = ids.indexOf(state.stage);
    var used = [state.label].concat(state.groups.map(function (g) { return g.label; }));
    var label = GROUP_LABELS.filter(function (name) { return used.indexOf(name) < 0; })[0] || GROUP_LABELS[1];
    // About a third of the file's words, 3 at most: in a 5-word file, 3 would leave the first group 2.
    state.groups.push({ label: label, stage: at > 0 ? ids[at - 1] : state.stage, sound: '', shape: '', count: Math.max(1, Math.min(3, Math.round(wordsFor(state.length) / 3))) });
    groupFocus = 'g' + state.groups.length + '-label';
    pickChanged(true);
  }
  function drawPickControls() {
    var sound = $('f-sound'), have = soundsOnOffer();
    SOUND_GROUPS.forEach(function (group) {
      var box = doc.createElement('optgroup');
      box.label = group[0];
      group[1].forEach(function (row) {
        if (!have[row[0]]) return;
        var option = el('option', '', soundName(row[0]) + ', as in ' + row[1]);
        option.value = row[0];
        option.setAttribute('data-name', option.textContent);
        box.appendChild(option);
      });
      if (box.firstChild) sound.appendChild(box);
    });
    var shape = $('f-shape');
    SHAPES.forEach(function (row) {
      var option = el('option', '', row[0] + ', like ' + row[1]);
      option.value = row[0];
      shape.appendChild(option);
    });
    var stage = $('f-stage');
    var groups = [];
    stageRows.forEach(function (row) {
      var name = String(row.frameworkLabel || '');
      var group = groups.filter(function (g) { return g.name === name; })[0];
      if (!group) { group = { name: name, rows: [] }; groups.push(group); }
      group.rows.push(row);
    });
    otherStageGroups = [];
    var otherNames = [], otherStages = [];
    groups.forEach(function (group) {
      var box = group.name ? doc.createElement('optgroup') : stage;
      if (group.name) box.label = group.name;
      group.rows.forEach(function (row) {
        var option = el('option', '', stageName(row.id));
        option.value = row.id;
        box.appendChild(option);
      });
      if (box === stage) return;
      // Fewer choices on screen: another curriculum's stages are added to the list only when asked for.
      if (group.rows.every(otherStage)) {
        otherStageGroups.push(box);
        otherNames.push(group.name);
        group.rows.forEach(function (row) { otherStages.push(stageName(row.id).replace(/\s*\([^)]*\)$/, '')); });
      } else stage.appendChild(box);
    });
    // After the grade levels, in a group of their own that says what they are.
    var widerBox = doc.createElement('optgroup');
    widerBox.label = 'Past the grade levels (by how rare a word is)';
    widerBox.setAttribute('data-wider', '');
    widerGroup = widerBox;
    LEVELS.forEach(function (row) { var option = el('option', '', row.name); option.value = row.id; widerBox.appendChild(option); });
    stage.appendChild(widerBox);
    show('stage-other', otherStageGroups.length > 0);
    if (otherNames.length) setText('stage-other-line', 'Show ' + listed(otherNames) + ' in the Grade level list: ' + listed(otherStages));
    otherStagesOn = otherStageGroups.length > 0 && regionAsks();
  }
  function otherStage(row) { return !!row && row.isDefault === false; }
  // The page's language, or the browser's first language, names a region whose curriculum is not the default one.
  function regionAsks() {
    var codes = [doc.documentElement.getAttribute('lang') || ''];
    try { codes.push(String((window.navigator && window.navigator.language) || '')); } catch (_) {}
    var regions = codes.map(function (code) { return code.trim().split('-').slice(1).join('-').toUpperCase(); }).filter(Boolean);
    return stageRows.some(function (row) { return otherStage(row) && regions.indexOf(STAGE_REGIONS[row.framework]) >= 0; });
  }
  function syncPickControls() {
    // A sound the chosen grade level has no word for stays in the list, says why and cannot be chosen (2026-11-16:
    // at Kindergarten, first part, half the sounds gave "No words fit these choices"). A sound already chosen stays
    // chosen, with the reason beside it.
    var haveSounds = soundsFor(state.stage);
    Array.prototype.forEach.call($('f-sound').options, function (option) {
      if (!option.value) return;
      var none = !!haveSounds && !haveSounds[option.value];
      option.disabled = none && option.value !== state.sound;
      option.textContent = option.getAttribute('data-name') + (none ? ' (no words at this grade level)' : '');
    });
    $('f-sound').value = state.sound;
    $('f-position').value = state.position;
    $('f-position').disabled = !state.sound;
    $('f-shape').value = state.shape;
    var stage = $('f-stage'), others = otherStagesOn || otherStage(stageRow(state.stage));
    otherStageGroups.forEach(function (group) {
      if (others && group.parentNode !== stage) stage.appendChild(group);
      if (!others && group.parentNode === stage) stage.removeChild(group);
    });
    // The wider levels stay last, after another curriculum's grade levels when those are shown.
    if (widerGroup) stage.appendChild(widerGroup);
    if ($('f-stage-other')) $('f-stage-other').checked = others;
    stage.value = state.stage;
    setText('stage-hint', stageLine(state.stage));
    // One more line for the two kindergarten rows of the Common Core table, and for no other stage. Its words are in the page.
    var kindergarten = K_STAGES.indexOf(state.stage) >= 0;
    show('stage-k-note', kindergarten);
    // Spelling with "Any stage": one short line that suggests a stage.
    var spelling = !state.stage && state.activities.some(function (id) { return core.activityStrand(id) === 'spelling'; });
    show('stage-spell-note', spelling);
    stage.setAttribute('aria-describedby', ['stage-hint'].concat(kindergarten ? ['stage-k-note'] : [], spelling ? ['stage-spell-note'] : []).join(' '));
    setText('stage-why-text', stageWhy(state.stage));
    show('stage-why', !!stageWhy(state.stage));
    drawMore2();
  }
  // "More options" of step 2: a sound, a pattern and other curricula while the page picks the words, and the version
  // always. Its top line says what they are now; it opens by itself when one of them is set.
  function drawMore2() {
    var picking = state.mode === 'pick';
    show('more-2-pick', picking);
    var now = [];
    if (picking) {
      now.push(state.sound ? soundName(state.sound) + ' sound' + (state.position === 'any' ? '' : ', ' + POSITION_NAMES[state.position]) : 'any sound');
      now.push(state.shape ? state.shape + ' pattern' : 'any pattern');
    }
    now.push('version ' + state.version);
    setText('more-2-now', now.join(', '));
    openMore('more-2', state.version !== 'A' || (picking && (!!state.sound || !!state.shape || otherStage(stageRow(state.stage)))));
  }
  function pickChanged(keepRemoved) {
    if (!keepRemoved) state.removed = [];
    syncPickControls();
    remember();
    clearTimeout(pickTimer);
    pickTimer = setTimeout(drawPick, 20);
  }
  function drawPick() {
    clearTimeout(pickTimer);
    var run = ++pickRun;
    var chips = $('pick-chips'), loosen = $('pick-loosen');
    loosen.textContent = '';
    try { picked = pick(); } catch (error) {
      picked = null;
      closePick(false);
      chips.textContent = '';
      setText('pick-line', 'The words could not be looked up.');
      setText('pick-sub', 'Change one choice above, or type your own words.');
      setText('pick-out', '');
      show('pick-out-box', false);
      show('pick-removed', false);
      return;
    }
    // need: the words this file uses. The picker still lists more (pickTarget), so removing one brings in the next.
    // With more groups, the first group needs only the places the others leave it.
    var fit = picked.pool, need = picked.parts ? picked.firstCount : wordsFor(state.length);
    setText('pick-line', fit === 0 ? 'No words fit these choices.' : fit < need ? 'Only ' + count(fit, 'word fits', 'words fit') + '.' : count(fit, 'word fits', 'words fit') + '.');
    setText('pick-sub', fit === 0 ? 'Loosen one choice to get words.'
      : fit < need ? 'Your file uses up to ' + count(need, 'word') + '. You can go on with these, or get more by loosening one choice.'
        : fit > need ? 'The file uses ' + count(need, 'word') + ', shown here. Remove a word and another takes its place.'
          : 'All of them are in the file.');
    drawChips();
    // What also matched and why it is not offered: counted, never dropped silently.
    var reasons = picked.reasons, also = [];
    var silent = reasons.noRecording + reasons.excluded;
    if (reasons.notFamiliarEnough) also.push(count(reasons.notFamiliarEnough, 'less common word'));
    if (silent) also.push(silent + ' with no recording yet');
    if (reasons.britishSpellingOrWord) also.push(count(reasons.britishSpellingOrWord, 'British spelling or word', 'British spellings or words'));
    if (reasons.usedOnlyWhenTyped) also.push(count(reasons.usedOnlyWhenTyped, 'word') + ' used only when you type ' + (reasons.usedOnlyWhenTyped === 1 ? 'it' : 'them'));
    if (reasons.blocked + reasons.soundsLikeABlockedWord) also.push((reasons.blocked + reasons.soundsLikeABlockedWord) + ' on the list of words this tool does not use');
    // The counts wait, closed, behind "Why not more words?".
    setText('pick-out', also.length ? 'Also matched, but not offered: ' + also.join(', ') + '.' : '');
    show('pick-out-box', also.length > 0);
    if (state.mode === 'pick' && (state.hand ? handWords().length > 0 : fit > 0)) setText('step-2-problem', '');
    if (step === 2) soundsNote();
    drawWordList();
    drawGroups();
    drawMixNotes();
    remember();
    if (fit < need && !state.hand) suggestLoosening(run, fit);
  }
  // The row of chips: the picker's list, or, once the teacher chose words in the list, those words in the file's order.
  // 2026-11-16: the picker's chips are exactly the words that go in the file (they used to show the whole list a Long
  // file would use, so ten chips stood above a seven-word file). The rest of the list is one press away in the stepper.
  function chipWords() { return state.hand ? handWords() : currentPick() ? picked.words.slice(0, wordsFor(state.length)) : []; }
  // "How many words" is ONE field, moved by the page: beside the picked words in step 2, under Length in step 3. It shows
  // the number the file uses now, whatever the length; typing in it or pressing - or + makes the length Custom.
  function placeCount() {
    var field = $('count-field'), home = $(step === 3 ? 'count-home-3' : 'count-home-2');
    if (!field || !home) return;
    if (field.parentNode !== home) home.appendChild(field);
    show('count-field', !(state.mode === 'pick' && state.hand));
    var box = $('f-count'), n = wordsFor(state.length);
    if (box && doc.activeElement !== box) box.value = String(n);
    if ($('count-less')) $('count-less').disabled = n <= 1;
    if ($('count-more')) $('count-more').disabled = n >= MAX_WORDS;
  }
  // The bar beside the picked words: the stepper and "Pick different words", while the page picks the words.
  function syncPickBar() {
    show('pick-bar', state.mode === 'pick' && !state.hand);
    show('pick-common', state.order === 'random');
    placeCount();
  }
  function stepCount(delta) {
    var n = Math.max(1, Math.min(MAX_WORDS, wordsFor(state.length) + delta));
    $('f-count').value = String(n);
    countTyped($('f-count'));
    setText('count-said', count(n, 'word') + ' in the file.');
  }
  // "Pick different words": any words that fit the choices, a new set each press. The file is still built with the
  // version's seed (see pickSeed), so reopening it and its wrong answers work as before.
  function pickDifferent() {
    state.shuffle = state.order === 'random' ? shuffleCount(state.shuffle) + 1 : 1;
    state.order = 'random';
    state.removed = [];
    remember();
    drawPick();
    var words = chipWords();
    setText('pick-said', words.length ? 'Different words: ' + words.slice(0, 8).join(', ') + (words.length > 8 ? ' and ' + (words.length - 8) + ' more' : '') + '.' : 'No words fit these choices.');
  }
  function pickCommon() {
    state.order = 'common';
    state.shuffle = 0;
    state.removed = [];
    remember();
    drawPick();
    setText('pick-said', 'The most common words that fit.');
    if ($('pick-shuffle')) $('pick-shuffle').focus();
  }
  function drawChips() {
    syncPending();
    var chips = $('pick-chips'), words = chipWords();
    if (state.hand) {
      setText('pick-sub', words.length ? 'You chose ' + count(words.length, 'word') + ' yourself. The file uses all of them, in this order.'
        : 'No words are chosen yet. Open Choose the words yourself to check some, or press Pick for me again there.');
    }
    chips.setAttribute('aria-label', state.hand ? 'Your words, in the order of the file' : 'Words in the file');
    syncPickBar();
    chips.textContent = '';
    words.forEach(function (word) {
      var item = el('li', 'chip');
      item.appendChild(el('span', '', word));
      // More than one group: each word says which group it is from (for the teacher: a file never shows it).
      if (!state.hand && picked && picked.labels && picked.labels[word]) {
        var tag = el('span', 'chip-tag', picked.labels[word]);
        tag.setAttribute('data-group', picked.labels[word]);
        item.appendChild(tag);
      }
      // "Edit this word": one panel under the list, for one word at a time. Without the panel script, no button.
      if (wordPanel) {
        var edit = el('button', 'chip-edit', String.fromCharCode(0x270E));
        edit.type = 'button';
        edit.title = EDIT_LABEL;
        edit.setAttribute('aria-label', EDIT_LABEL + ': ' + word);
        edit.setAttribute('aria-controls', 'pick-edit');
        edit.setAttribute('aria-expanded', pickOpen && pickOpen.word === word ? 'true' : 'false');
        edit.addEventListener('click', function () { togglePick(word); });
        item.appendChild(edit);
        if (pickOpen && pickOpen.word === word) item.classList.add('is-editing');
      }
      var remove = el('button', 'chip-remove', String.fromCharCode(215));
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove ' + word);
      remove.addEventListener('click', function () {
        var at = words.indexOf(word);
        // A word the teacher chose leaves their list (nothing takes its place); a picked word is replaced by the next one.
        if (state.hand) { state.chosen = state.chosen.filter(function (other) { return other !== word; }); listNote = ''; } else state.removed.push(word);
        remember();
        drawPick();
        var buttons = $('pick-chips').querySelectorAll('button.chip-remove');
        var next = buttons[Math.min(at, buttons.length - 1)];
        if (next) next.focus(); else if (state.hand) $('pick-line').focus(); else $('pick-restore').focus();
      });
      item.appendChild(remove);
      chips.appendChild(item);
    });
    // The open panel stays while its word is listed.
    if (pickOpen && words.indexOf(pickOpen.word) < 0) closePick(false);
    if (myWords && words.some(needsEntry)) readMineSoon();
    show('pick-removed', !state.hand && state.removed.length > 0);
    setText('pick-removed-text', 'You removed: ' + state.removed.join(', ') + '.');
    setText('pick-restore', state.removed.length === 1 ? 'Put it back' : 'Put them back');
    setText('pick-list-line', state.hand ? 'Choose the words yourself: ' + count(words.length, 'word') + ' chosen' : 'Choose the words yourself');
  }
  // When few words fit: try each choice set to "any", one at a time, and offer the ones that give more.
  function suggestLoosening(run, fit) {
    var tries = [];
    if (state.stage) tries.push({ change: { stage: '' }, label: 'Any grade level' });
    if (state.shape) tries.push({ change: { shape: '' }, label: 'Any pattern' });
    if (state.sound && state.position !== 'any') tries.push({ change: { position: 'any' }, label: 'The sound anywhere in the word' });
    if (state.sound) tries.push({ change: { sound: '', position: 'any' }, label: 'Any sound' });
    var host = $('pick-loosen');
    var next = function () {
      if (run !== pickRun || state.hand) return;
      var option = tries.shift();
      if (!option) {
        if (!host.firstChild) setText('pick-sub', fit === 0 ? 'No single change gives any words. Change two of the choices above.' : 'No single change gives more words. You can go on with these.');
        return;
      }
      var pool = 0;
      try { pool = pick(option.change).pool; } catch (_) { pool = 0; }
      if (pool > fit) {
        var button = el('button', 'btn btn-small', option.label + ': ' + count(pool, 'word fits', 'words fit'));
        button.type = 'button';
        button.addEventListener('click', function () {
          Object.keys(option.change).forEach(function (key) { state[key] = option.change[key]; });
          pickChanged(false);
          $('pick-line').focus();
        });
        host.appendChild(button);
      }
      setTimeout(next, 0);
    };
    setTimeout(next, 0);
  }

  // Where a word's recording is, by the word list: in the word bank this page loads whole (row.kokoro), or in
  // the word store, fetched a small file at a time (row.shards). A word with neither cannot be used here.
  function inWordStore(word) { var row = wordlist.get(word); return !!row && row.shards && !row.kokoro; }
  function canLoad(word) { var row = wordlist.get(word); return !!row && (row.kokoro || row.shards); }

  // What the teacher added to a word on this device, as last read from packets_my_words.js (see readMine).
  // A part the store does not have comes from a file opened with "Open a file I made" (fromFile), until the teacher
  // keeps it in My words or opens Edit this word for that word. The store's own part always comes first.
  function mineOf(word) {
    var stored = Object.prototype.hasOwnProperty.call(mine, word) ? mine[word] : null;
    var file = Object.prototype.hasOwnProperty.call(fromFile, word) ? fromFile[word] : null;
    if (!file) return stored;
    var out = { word: word };
    if (stored) Object.keys(stored).forEach(function (key) { out[key] = stored[key]; });
    OWN_PARTS.forEach(function (part) { if (!out[part] && file[part]) out[part] = file[part]; });
    return out;
  }
  // The teacher's sounds for a word, when every one is a sound of the dictionary (the builder checks the same).
  function ownSoundsOf(word) {
    var entry = mineOf(word), list = entry && entry.sounds && entry.sounds.sounds;
    var labels = dictionary.labels || [];
    return Array.isArray(list) && list.length && list.every(function (label) { return labels.indexOf(label) >= 0; }) ? list : null;
  }
  // Each typed word, checked the way the builder will check it, with the reason in plain words.
  // edit: the word may be given its sounds, a recording or a picture ("Edit this word").
  function checkWord(word) {
    if (wordlist.isBlocked(word)) return { word: word, ok: false, says: 'Left out. It is on the list of words this tool does not use. That list is a first pass and can be too cautious.' };
    if (!/^[a-z]+$/.test(word) || word.length < 2 || word.length > maxLetters() || !/[aeiouy]/.test(word)) return { word: word, ok: false, says: 'Not used. A practice word is 2 to ' + maxLetters() + ' letters, letters only, with a vowel.' };
    var entry = core.dictionarySounds(word), mineSounds = ownSoundsOf(word), mineClip = !!(mineOf(word) && mineOf(word).clip);
    var sounds = mineSounds || (entry ? entry.sounds : null);
    if (!sounds) return { word: word, ok: false, edit: true, says: NEEDS_SOUNDS_SAID };
    if (!canLoad(word) && !mineClip) return { word: word, ok: false, edit: true, says: NEEDS_CLIP_SAID };
    // A borderline word (the [soft] part of the word list's blocklist): the picker leaves it out, a teacher may type it.
    var row = wordlist.get(word);
    if (row && row.soft) return { word: word, ok: true, edit: true, says: TYPED_ONLY_SAID };
    var uses = mineSounds && mineClip ? 'Uses your sounds and your recording. ' : mineClip ? 'Uses your recording. ' : mineSounds ? 'Uses your sounds. ' : '';
    return { word: word, ok: true, edit: true, says: 'Ready. ' + uses + count(sounds.length, 'sound') + ': ' + sounds.map(soundName).join(', ') + '.' };
  }
  function typedWords() {
    var seen = {}, out = [];
    String(state.own || '').toLowerCase().split(/[\s,;]+/).forEach(function (word) {
      if (!word || seen[word]) return;
      seen[word] = true;
      out.push(word);
    });
    return out;
  }
  function drawOwn() {
    clearTimeout(ownTimer);
    var words = typedWords(), list = $('own-list');
    var extra = Math.max(0, words.length - MAX_TYPED);
    ownRows = words.slice(0, MAX_TYPED).map(checkWord);
    // An open panel is moved into the new list, and keeps the focus it had.
    var focused = doc.activeElement, keepFocus = focused && Object.keys(ownOpen).some(function (word) { return ownOpen[word].root.contains(focused); }) ? focused : null;
    list.textContent = '';
    ownRows.forEach(function (row) {
      var item = el('li', row.ok ? 'is-ok' : 'is-out');
      item.appendChild(el('span', 'w', row.word));
      item.appendChild(el('span', 's', row.says));
      if (row.edit && wordPanel) {
        var open = !!ownOpen[row.word];
        var cell = el('span', 'e');
        var toggle = el('button', 'btn btn-text btn-small', EDIT_LABEL);
        toggle.type = 'button';
        toggle.setAttribute('aria-label', EDIT_LABEL + ': ' + row.word);
        toggle.setAttribute('aria-controls', 'edit-own-' + row.word);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.addEventListener('click', function () { toggleOwn(row.word); });
        cell.appendChild(toggle);
        item.appendChild(cell);
        var spot = el('div', 'word-edit');
        spot.id = 'edit-own-' + row.word;
        spot.hidden = !open;
        if (open) spot.appendChild(ownOpen[row.word].root);
        item.appendChild(spot);
      }
      list.appendChild(item);
    });
    Object.keys(ownOpen).forEach(function (word) { if (!ownRows.some(function (row) { return row.word === word && row.edit; })) { ownOpen[word].destroy(); delete ownOpen[word]; } });
    if (keepFocus && doc.body.contains(keepFocus)) keepFocus.focus();
    if (myWords && ownRows.some(function (row) { return needsEntry(row.word); })) readMineSoon();
    var ready = ownRows.filter(function (row) { return row.ok; }).length;
    setText('own-line', !words.length ? 'Type or paste your words above.'
      : ready + ' of ' + count(ownRows.length, 'word') + ' can be used.' + (extra ? ' Only the first ' + MAX_TYPED + ' words are checked.' : ''));
    if (ready && state.mode === 'own') setText('step-2-problem', '');
    if (step === 2) soundsNote();
    remember();
  }
  function chosenWords() {
    if (state.mode === 'own') return ownRows.filter(function (row) { return row.ok; }).map(function (row) { return row.word; });
    if (state.hand) return handWords();
    return currentPick() ? picked.words.slice() : [];
  }
  // The words of the file: the teacher's own list whole, or the first words of the list for the length chosen.
  function fileWords() {
    var words = chosenWords();
    return state.mode === 'pick' && state.hand ? words : words.slice(0, wordsFor(state.length));
  }

  // ---------------------------------------------------------------------------
  // Step 2: "Choose the words yourself", the list behind one closed box
  // ---------------------------------------------------------------------------
  // The list: the words typed (each says so), then every word the picker would offer for the choices above, A to Z,
  // with nothing taken out to make room. Checking a word adds it to the end of state.chosen: the file's order is
  // the order of checking (the chips show it). Until the teacher changes a box, the boxes show the picker's words
  // for the length chosen. Only LIST_PAGE rows are drawn at a time.
  var listPool = [], listKey = null, listLimit = LIST_PAGE, listNote = '', listTimer = 0, listPanel = null, addPending = {}, myPictured = {}, myNoPicture = {};
  var previewOmit = {}, previewSeeds = {}, previewNoPicture = {}, previewOwnPic = {}, previewSession = null, inPreviewAction = false;
  var REROLL_ACTS = ['isolation', 'segmentation', 'blending', 'decoding', 'rhyming', 'missing_letter', 'word_families', 'sound_sort'];
  function resetPreview(stopSession) {
    previewOmit = {};
    previewSeeds = {};
    if (stopSession && previewSession) { try { previewSession.stop(); } catch (_) {} previewSession = null; }
  }
  function typedNow() { return typedWords().slice(0, MAX_TYPED); }
  // A word can go in the file: it passes the typed-word checks, and a borderline word only when the teacher typed it.
  function usable(word) {
    var row = checkWord(word);
    if (!row.ok) return false;
    var listed = wordlist.get(word);
    return !(listed && listed.soft) || typedNow().indexOf(word) >= 0;
  }
  function handWords() { return state.chosen.filter(usable).slice(0, MAX_WORDS); }
  // The words with a box checked: the teacher's, or until then the picker's words for the length chosen.
  function listChecked() { return state.hand ? state.chosen.slice() : (currentPick() ? picked.words.slice(0, wordsFor(state.length)) : []); }
  function startHand() {
    if (state.hand) return;
    state.hand = true;
    state.chosen = listChecked();
  }
  function hasPicture(word) { return !noPicture(word) && (ownPicture(word) || !!myPictured[word] || (!!symbols && symbols.has(word))); }
  // Every word the picker would offer now, A to Z (the picker's rules, not its count). Worked out again only when a choice changes.
  function poolWords() {
    var asked = criteria();
    var key = JSON.stringify([asked.targetSound || '', asked.position || '', asked.shape || '', asked.stage || '', asked.level || '']);
    if (key !== listKey) {
      listKey = key;
      asked.count = 100000;
      asked.exclude = recordedOnly.slice();
      try { listPool = builder.pickWords(asked, { wordlist: wordlist, core: core, dictionary: dictionary, seed: 1 }).words.slice().sort(); } catch (_) { listPool = []; }
    }
    return listPool;
  }
  function listEntries() {
    var seen = {}, out = [];
    typedNow().forEach(function (word) { seen[word] = true; out.push({ word: word, typed: true }); });
    var pool = poolWords(), inPool = {};
    pool.forEach(function (word) { inPool[word] = true; });
    // A word chosen under other choices stays listed, so that it can be unchecked here too.
    state.chosen.forEach(function (word) { if (!seen[word] && !inPool[word]) { seen[word] = true; out.push({ word: word, earlier: true }); } });
    pool.forEach(function (word) { if (!seen[word]) { seen[word] = true; out.push({ word: word }); } });
    return out;
  }
  function findText() { return String(($('f-find') && $('f-find').value) || '').toLowerCase().replace(/[^a-z]/g, ''); }
  function shownEntries() {
    var find = findText(), onlyPictures = !!($('f-only-pictures') && $('f-only-pictures').checked);
    return listEntries().filter(function (entry) { return (!find || entry.word.indexOf(find) >= 0) && (!onlyPictures || hasPicture(entry.word)); });
  }
  function soundsFact(word) {
    var sounds = ownSoundsOf(word), entry = sounds ? null : core.dictionarySounds(word);
    sounds = sounds || (entry ? entry.sounds : null);
    return sounds ? count(sounds.length, 'sound') + ': ' + sounds.map(soundName).join(', ') + '.' : '';
  }
  function pictureFact(word) { return noPicture(word) ? ' Picture off.' : ownPicture(word) || myPictured[word] ? ' Your picture.' : symbols && symbols.has(word) ? ' Has a picture.' : ''; }
  function listRow(entry, checked, index) {
    var word = entry.word, info = entry.typed || entry.earlier ? checkWord(word) : null;
    var ok = usable(word), on = checked.indexOf(word) >= 0;
    var item = el('li', 'wl' + (entry.typed ? ' is-typed' : '') + (ok ? '' : ' is-out'));
    var label = el('label', 'wl-pick');
    var box = el('input');
    box.type = 'checkbox';
    box.value = word;
    box.checked = on;
    // A word that cannot be used is never offered; one already checked can still be unchecked.
    box.disabled = !ok && !on;
    var facts = el('span', 'wl-facts', (entry.typed ? 'You typed it. ' + info.says : entry.earlier ? 'Chosen with other choices above. ' + (ok ? soundsFact(word) : info.says) : soundsFact(word)) + pictureFact(word));
    facts.id = 'wl-f-' + index;
    box.setAttribute('aria-describedby', facts.id);
    label.appendChild(box);
    label.appendChild(el('span', 'wl-word', word));
    item.appendChild(label);
    item.appendChild(facts);
    if (info && info.edit && !info.ok && wordPanel) {
      var open = !!listPanel && listPanel.word === word;
      var toggle = el('button', 'btn btn-text btn-small wl-edit', EDIT_LABEL);
      toggle.type = 'button';
      toggle.setAttribute('data-word', word);
      toggle.setAttribute('aria-label', EDIT_LABEL + ': ' + word);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.addEventListener('click', function () { toggleListPanel(word); });
      item.appendChild(toggle);
      if (open) {
        var spot = el('div', 'word-edit');
        spot.appendChild(listPanel.panel.root);
        item.appendChild(spot);
        toggle.setAttribute('aria-controls', spot.id = 'edit-list-' + index);
      }
    }
    return item;
  }
  // A word added in the list that could not be used yet is checked as soon as it can be (its sounds or recording set).
  function syncPending() {
    var typed = typedNow();
    Object.keys(addPending).forEach(function (word) {
      if (typed.indexOf(word) < 0 || !state.hand) { delete addPending[word]; return; }
      if (!usable(word)) return;
      delete addPending[word];
      if (state.chosen.indexOf(word) < 0 && state.chosen.length < MAX_WORDS) state.chosen.push(word);
    });
  }
  function drawListSaid() {
    var words = state.hand ? handWords() : listChecked(), n = words.length, text;
    if (!state.hand) text = 'Chosen for you: the ' + count(n, 'word') + ' a ' + LENGTH_NAMES[state.length] + ' file uses. Check or uncheck a word to choose the words yourself.';
    else if (!n) text = 'No words are chosen. Check words in the list, or press Pick for me again.';
    else text = 'You chose ' + count(n, 'word') + '. The file uses all of them, in the order you checked them.';
    var unusable = state.hand ? state.chosen.filter(function (word) { return !usable(word); }) : [];
    if (unusable.length) text += ' Not usable yet: ' + unusable.join(', ') + '. The note beside each says why.';
    setText('list-said', (listNote ? listNote + ' ' : '') + text);
  }
  var listTop = [];
  function topFirst(entries) {
    if (!listTop.length) return entries;
    var rank = {};
    listTop.forEach(function (word, i) { rank[word] = i + 1; });
    var top = entries.filter(function (entry) { return rank[entry.word]; }).sort(function (a, b) { return rank[a.word] - rank[b.word]; });
    return top.concat(entries.filter(function (entry) { return !rank[entry.word]; }));
  }
  function drawWordList() {
    var box = $('pick-list');
    if (!box || !state || !box.open || state.mode !== 'pick') return;
    syncPending();
    var checked = listChecked();
    // The words of the file come first (2026-11-16: none of the seven chosen words was in the first 100 rows of an
    // A to Z list). The top set is fixed while the teacher checks boxes, so a row never jumps away under the pointer;
    // it is read again when the page picks, and when the box is opened.
    if (!state.hand) listTop = checked.slice();
    var list = $('word-list'), shown = topFirst(shownEntries());
    // The focus is put back on the same word's control after the redraw.
    var focused = doc.activeElement, inPanel = listPanel && focused && listPanel.panel.root.contains(focused);
    var focusWord = !inPanel && focused && list.contains(focused) ? (focused.value || focused.getAttribute('data-word')) : null, focusEdit = !!(focused && focused.classList && focused.classList.contains('wl-edit'));
    list.textContent = '';
    var rows = doc.createDocumentFragment();
    shown.slice(0, listLimit).forEach(function (entry, index) { rows.appendChild(listRow(entry, checked, index)); });
    list.appendChild(rows);
    if (inPanel && doc.body.contains(focused)) focused.focus();
    else if (focusWord) {
      var again = Array.prototype.filter.call(list.querySelectorAll(focusEdit ? 'button.wl-edit' : 'input'), function (node) { return (node.value || node.getAttribute('data-word')) === focusWord; })[0];
      if (again) again.focus();
    }
    var all = listEntries().length;
    list.setAttribute('aria-label', shown.length === all ? 'Words to choose from: ' + count(all, 'word') : 'Words to choose from: ' + shown.length + ' of ' + all + ' shown');
    show('list-more-row', shown.length > listLimit);
    setText('list-more-said', shown.length > listLimit ? 'Showing ' + listLimit + ' of ' + shown.length + '.' : '');
    if (!shown.length) list.appendChild(el('li', 'wl-none', all ? 'No word in the list matches. Clear the search, or the picture box.' : 'No words fit the choices above. Add your own words, or loosen one choice.'));
    drawListSaid();
  }
  function listChanged(note) {
    listNote = note || '';
    remember();
    drawPick();
  }
  function listToggle(box) {
    var word = box.value;
    startHand();
    if (box.checked && state.chosen.indexOf(word) < 0) {
      if (state.chosen.length >= MAX_WORDS) {
        box.checked = false;
        listNote = 'A file has at most ' + MAX_WORDS + ' words. Uncheck one to add another.';
        drawListSaid();
        return;
      }
      state.chosen.push(word);
    }
    if (!box.checked) state.chosen = state.chosen.filter(function (other) { return other !== word; });
    listNote = '';
    remember();
    // The chips and the lines follow; the list itself is not drawn again, so the focus stays on the box.
    drawChips();
    drawListSaid();
    if (handWords().length) setText('step-2-problem', '');
    if (step === 2) soundsNote();
  }
  // "Add your own words": they join the typed words (the same ones as "Type my own words") and are checked when they can be used.
  function addTyped() {
    var field = $('f-add'), words = [];
    String(field.value || '').toLowerCase().split(/[\s,;]+/).forEach(function (word) { if (word && words.indexOf(word) < 0) words.push(word); });
    if (!words.length) { listNote = 'Type a word first.'; drawListSaid(); field.focus(); return; }
    var typed = typedWords(), fresh = words.filter(function (word) { return typed.indexOf(word) < 0; });
    if (fresh.length) state.own = (String(state.own || '').replace(/\s+$/, '') + (String(state.own || '').trim() ? ' ' : '') + fresh.join(' ')).slice(0, 4000);
    if ($('f-own').value !== state.own) $('f-own').value = state.own;
    startHand();
    var added = [], waiting = [], refused = [], full = [];
    words.forEach(function (word) {
      if (state.chosen.indexOf(word) >= 0) return;
      // A word that needs its sounds or a recording waits, and is checked once it has them. A blocked word never is.
      if (!usable(word)) { if (checkWord(word).edit) { addPending[word] = true; waiting.push(word); } else refused.push(word); return; }
      if (state.chosen.length >= MAX_WORDS) { full.push(word); return; }
      state.chosen.push(word);
      added.push(word);
    });
    field.value = '';
    var said = [];
    if (added.length) said.push('Added and checked: ' + added.join(', ') + '.');
    if (waiting.length) said.push('Not usable yet: ' + waiting.join(', ') + '. ' + (waiting.length === 1 ? 'It joins' : 'They join') + ' your list once ' + (waiting.length === 1 ? 'it has' : 'they have') + ' what the note beside ' + (waiting.length === 1 ? 'it' : 'each') + ' asks for.');
    if (refused.length) said.push('Not used: ' + refused.join(', ') + '. The note beside each says why.');
    if (full.length) said.push('Not checked, because a file has at most ' + MAX_WORDS + ' words: ' + full.join(', ') + '.');
    if (!said.length) said.push('Already in your list: ' + words.join(', ') + '.');
    drawOwn();
    listChanged(said.join(' '));
  }
  function toggleListPanel(word) {
    if (listPanel && listPanel.word === word) return closeListPanel(true);
    closeListPanel(false);
    adoptFromFile(word);
    listPanel = { word: word, panel: wordPanel.open(doc.createElement('div'), word, { onClose: function () { closeListPanel(true); } }) };
    listPanel.panel.update(mineOf(word));
    drawWordList();
    listPanel.panel.focus();
  }
  function closeListPanel(focus) {
    if (!listPanel) return;
    var word = listPanel.word;
    listPanel.panel.destroy();
    listPanel = null;
    drawWordList();
    if (!focus) return;
    var button = Array.prototype.filter.call($('word-list').querySelectorAll('button.wl-edit'), function (node) { return node.getAttribute('data-word') === word; })[0];
    if (button) button.focus();
  }
  function wireWordList() {
    $('pick-list').addEventListener('toggle', function () { listLimit = LIST_PAGE; if (this.open && state.hand) listTop = handWords(); drawWordList(); });
    $('word-list').addEventListener('change', function (event) { if (event.target && event.target.type === 'checkbox') listToggle(event.target); });
    $('f-find').addEventListener('input', function () { clearTimeout(listTimer); listTimer = setTimeout(function () { listLimit = LIST_PAGE; drawWordList(); }, 150); });
    $('f-only-pictures').addEventListener('change', function () { if (this.checked && picturesChoice === 'off') picturesChoice = ''; listLimit = LIST_PAGE; drawWordList(); });
    $('add-words').addEventListener('click', addTyped);
    $('f-add').addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); addTyped(); } });
    $('list-all').addEventListener('click', function () {
      startHand();
      var add = shownEntries().map(function (entry) { return entry.word; }).filter(function (word) { return state.chosen.indexOf(word) < 0 && usable(word); });
      var taken = add.slice(0, Math.max(0, MAX_WORDS - state.chosen.length));
      state.chosen = state.chosen.concat(taken);
      var left = add.length - taken.length;
      listChanged(!add.length ? 'Every word in the list that can be used is already chosen.'
        : ((taken.length ? 'Added ' + count(taken.length, 'word') + ', in the order of the list.' : '') + (left ? ' A file has at most ' + MAX_WORDS + ' words, so ' + count(left, 'other word') + (left === 1 ? ' was' : ' were') + ' not added.' : '')).trim());
    });
    $('list-clear').addEventListener('click', function () { startHand(); state.chosen = []; addPending = {}; listChanged('Every box is unchecked.'); });
    $('list-again').addEventListener('click', function () { state.hand = false; state.chosen = []; addPending = {}; listChanged('The page picks the words again.'); });
    $('list-more').addEventListener('click', function () {
      var from = listLimit;
      listLimit += LIST_PAGE;
      drawWordList();
      var next = $('word-list').querySelectorAll('input[type="checkbox"]')[from];
      if (next) next.focus();
    });
  }
  function syncMode() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.checked = radio.value === state.mode;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
    show('panel-pick', state.mode === 'pick');
    show('panel-own', state.mode === 'own');
    show('pick-top', state.mode === 'pick');
  }
  function syncRadios(name, value) {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="' + name + '"]'), function (radio) {
      radio.checked = radio.value === value;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
  }
  function drawWords() {
    syncMode();
    syncRadios('version', state.version);
    syncPickControls();
    if ($('f-own').value !== state.own) $('f-own').value = state.own;
    drawOwn();
    drawPick();
    drawMyWords();
  }

  // ---------------------------------------------------------------------------
  // My words: what the teacher added to a word, kept by packets_my_words.js in this browser for this site
  // ---------------------------------------------------------------------------
  // myRows: the store's small rows (list), for the summary. mine: the whole entries of the words on the
  // lists now, for the messages and the panels. Both are read again whenever the store says it changed.
  var myWords = null, wordPanel = null, myRows = [], mine = {}, mineTried = {}, mineRun = 0, mineTimer = 0, clearing = false, cleared = '';
  var ownOpen = {}, pickOpen = null;
  // fromFile: { word: { sounds, clip, picture } } read back from a file opened with "Open a file I made" (see packets_reopen.js).
  var fromFile = {}, OWN_PARTS = ['sounds', 'clip', 'picture'];
  function hasRow(word) { return myRows.some(function (row) { return row.word === word; }); }
  // A listed word the store has something for, and that has not been read yet.
  function needsEntry(word) { return hasRow(word) && !mineOf(word) && !mineTried[word]; }
  function listedWords() {
    var out = typedWords().slice(0, MAX_TYPED);
    (picked ? picked.words : []).concat(state ? state.chosen : []).forEach(function (word) { if (out.indexOf(word) < 0) out.push(word); });
    return out;
  }
  function readMineSoon() { clearTimeout(mineTimer); mineTimer = setTimeout(readMine, 0); }
  function readMine() {
    clearTimeout(mineTimer);
    if (!myWords) return Promise.resolve();
    var run = ++mineRun;
    return myWords.list().then(function (rows) {
      if (run !== mineRun) return null;
      myRows = Array.isArray(rows) ? rows : [];
      myPictured = {};
      myNoPicture = {};
      myRows.forEach(function (row) {
        if (!row) return;
        if (row.noPicture) myNoPicture[row.word] = true;
        else if (row.picture) myPictured[row.word] = true;
      });
      var words = listedWords().filter(hasRow);
      mineTried = {};
      words.forEach(function (word) { mineTried[word] = true; });
      return myWords.getMany(words).then(function (found) {
        if (run !== mineRun) return;
        mine = found && typeof found === 'object' ? found : {};
        mineChanged();
      });
    }).then(null, function () {});
  }
  function mineChanged() {
    drawMyWords();
    if (!state) return;
    if (state.mode === 'own') drawOwn();
    // A word the teacher chose or typed may be usable now (or no longer): the chips and the list follow.
    else if (state.hand || ($('pick-list') && $('pick-list').open)) drawPick();
    Object.keys(ownOpen).forEach(function (word) { ownOpen[word].update(mineOf(word)); });
    if (pickOpen) pickOpen.update(mineOf(pickOpen.word));
    if (listPanel) listPanel.panel.update(mineOf(listPanel.word));
    if (step === 3) drawPictures();
  }
  function wordMade(row) {
    var parts = [];
    if (row.sounds) parts.push('sounds');
    if (row.clip) parts.push('recording');
    if (row.noPicture) parts.push('no picture');
    else if (row.picture) parts.push(row.own ? 'your picture' : 'picture');
    return parts.join(', ');
  }
  // The quiet summary in step 2: shown only when the store holds something.
  function drawMyWords() {
    var box = $('my-words');
    if (!box) return;
    var rows = myRows, list = $('my-words-list');
    box.hidden = !myWords || (!rows.length && !cleared);
    var bytes = rows.reduce(function (sum, row) { return sum + (Number(row.bytes) || 0); }, 0);
    setText('my-words-line', 'My words on this device: ' + (rows.length ? count(rows.length, 'word') + ', ' + fileSize(bytes) : 'none') + '.');
    list.textContent = '';
    rows.forEach(function (row) {
      var item = el('li');
      item.appendChild(el('span', 'mw-word', row.word));
      item.appendChild(el('span', 'mw-what', wordMade(row) + ', ' + fileSize(Number(row.bytes) || 1) + '.'));
      var remove = el('button', 'btn btn-text btn-small', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove ' + row.word + ' from my words');
      remove.addEventListener('click', function () {
        var at = rows.indexOf(row);
        myWords.remove(row.word).then(function () {
          setText('my-words-said', 'Removed ' + row.word + '.');
          return readMine();
        }).then(function () {
          var buttons = $('my-words-list').querySelectorAll('button');
          var next = buttons[Math.min(at, buttons.length - 1)];
          if (next) next.focus(); else $('my-words-line').focus();
        });
      });
      item.appendChild(remove);
      list.appendChild(item);
    });
    var clear = $('my-words-clear');
    clear.hidden = !rows.length;
    if (!rows.length) clearing = false;
    clear.textContent = clearing ? 'Yes, remove all ' + count(rows.length, 'word') : 'Remove all my words';
    show('my-words-keep', clearing && rows.length > 0);
    if (cleared) setText('my-words-said', cleared);
  }
  function wireMyWords() {
    $('my-words-clear').addEventListener('click', function () {
      if (!clearing) { clearing = true; cleared = ''; setText('my-words-said', ''); drawMyWords(); return; }
      clearing = false;
      myWords.clear().then(function (n) {
        cleared = 'Removed ' + count(n, 'word') + '.';
        return readMine();
      }).then(function () { drawMyWords(); $('my-words-line').focus(); });
    });
    $('my-words-keep').addEventListener('click', function () { clearing = false; drawMyWords(); $('my-words-clear').focus(); });
    // Save My words as a file, and put a saved one back (2026-11-17).
    $('my-words-export').addEventListener('click', function () {
      myWords.exportAll().then(function (data) {
        if (!data.words.length) { setText('my-words-said', 'There are no words to save yet.'); return; }
        var url = '';
        try { url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); } catch (_) { url = ''; }
        if (!url) { setText('my-words-said', 'This browser cannot save files from a page.'); return; }
        var link = document.createElement('a');
        link.href = url; link.download = 'my-words__' + new Date().toISOString().slice(0, 10) + '.json'; link.hidden = true;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 10000);
        setText('my-words-said', 'Saved ' + count(data.words.length, 'word') + ' as a file.');
      }, function () { setText('my-words-said', 'My words could not be read.'); });
    });
    $('my-words-import').addEventListener('click', function () { $('my-words-file').click(); });
    $('my-words-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > 60 * 1024 * 1024) { setText('my-words-said', 'This file is too large to be a My words file.'); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var data = null;
        try { data = JSON.parse(String(reader.result || '')); } catch (_) { data = null; }
        myWords.importAll(data).then(function (done) {
          setText('my-words-said', 'Put back: ' + count(done.kept.length, 'word') + '.' + (done.refused.length ? ' Left out (they did not pass the checks): ' + done.refused.slice(0, 6).join(', ') + '.' : ''));
          drawMyWords();
        }, function (error) { setText('my-words-said', (error && error.message) || 'This file could not be read.'); });
      };
      reader.onerror = function () { setText('my-words-said', 'This browser could not read the file.'); };
      reader.readAsText(file);
    });
  }

  // The panels. A typed word's opens in its row; a picked word's opens under the list, one at a time.
  // Edit this word changes what the store keeps: a word's parts from an opened file are kept there first, so the
  // panel shows and changes one entry. (A browser that keeps nothing leaves them where they are.)
  function adoptFromFile(word) {
    if (!myWords || !Object.prototype.hasOwnProperty.call(fromFile, word)) return;
    keepFromFile([word]).then(function () { drawReopenKeep(); });
  }
  function toggleOwn(word) {
    if (ownOpen[word]) return closeOwn(word, true);
    adoptFromFile(word);
    ownOpen[word] = wordPanel.open(doc.createElement('div'), word, { onClose: function () { closeOwn(word, true); } });
    ownOpen[word].update(mineOf(word));
    drawOwn();
    ownOpen[word].focus();
  }
  function closeOwn(word, focus) {
    if (!ownOpen[word]) return;
    ownOpen[word].destroy();
    delete ownOpen[word];
    drawOwn();
    if (focus) { var toggle = $('own-list').querySelector('button[aria-controls="edit-own-' + word + '"]'); if (toggle) toggle.focus(); }
  }
  function togglePick(word) {
    var same = pickOpen && pickOpen.word === word;
    closePick(false);
    if (same) { focusChip(word); return; }
    adoptFromFile(word);
    var spot = $('pick-edit');
    pickOpen = wordPanel.open(spot, word, { onClose: function () { closePick(true); } });
    pickOpen.update(mineOf(word));
    spot.hidden = false;
    markChips();
    pickOpen.focus();
  }
  function closePick(focus) {
    if (!pickOpen) return;
    var word = pickOpen.word;
    pickOpen.destroy();
    pickOpen = null;
    show('pick-edit', false);
    markChips();
    if (focus) focusChip(word);
  }
  function markChips() {
    Array.prototype.forEach.call($('pick-chips').querySelectorAll('button.chip-edit'), function (button) {
      var on = !!pickOpen && button.getAttribute('aria-label') === EDIT_LABEL + ': ' + pickOpen.word;
      button.setAttribute('aria-expanded', on ? 'true' : 'false');
      button.parentNode.classList.toggle('is-editing', on);
    });
  }
  function focusChip(word) {
    var button = $('pick-chips').querySelector('button.chip-edit[aria-label="' + EDIT_LABEL + ': ' + word + '"]');
    if (button) button.focus();
  }
  // For the panel's Play: the word's recording from the sound files this page already uses (the word bank,
  // or the word store's small file that holds it). The first time, that is the same download as step 3.
  function bankNote(word) { return canLoad(word) ? 'bank' : ''; }
  function bankClip(word, saying) {
    if (!canLoad(word)) return Promise.resolve(null);
    if (!sounds && !soundsSaved && typeof saying === 'function') saying(String(Math.round(SOUND_BYTES / 1e6)));
    return getSounds(function () {}).then(function (banks) {
      var clip = banks.kokoroWords && banks.kokoroWords[word];
      if (typeof clip === 'string' && clip) return clip;
      return getWordSounds([word], function () {}).then(function (clips) { return clips[word] || null; });
    });
  }
  // What the builder is handed for these words: the store's entries, read now, in the store's own shape.
  // The builder checks every part again (word_sounds_packet_builder.js, readOwn).
  // A part the store does not have may come from a file opened with "Open a file I made" (fromFile).
  function ownFor(words) {
    var stored = myWords ? myWords.getMany(words).then(function (found) { return found && typeof found === 'object' ? found : {}; }, function () { return {}; }) : Promise.resolve({});
    return stored.then(function (found) {
      var own = {};
      words.forEach(function (word) {
        var entry = Object.prototype.hasOwnProperty.call(found, word) ? found[word] : null;
        var file = Object.prototype.hasOwnProperty.call(fromFile, word) ? fromFile[word] : null;
        var off = !!previewNoPicture[word];
        if (!entry && !file && !off) return;
        var part = function (name) { return (entry && entry[name]) || (file && file[name]) || null; };
        own[word] = { sounds: part('sounds'), clip: part('clip'), picture: off ? { none: true } : part('picture') };
      });
      return Object.keys(own).length ? own : null;
    });
  }

  // ---------------------------------------------------------------------------
  // Step 3: make the file
  // ---------------------------------------------------------------------------
  var sounds = null, soundsLoading = null, soundProgress = null, soundsSaved = false;
  var wavs = typeof Map === 'function' ? new Map() : null, wavCount = 0;
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '';

  function openCache() {
    try {
      if (!window.caches || typeof window.caches.open !== 'function') return Promise.resolve(null);
      return window.caches.open(SOUND_CACHE).then(function (cache) { return cache; }, function () { return null; });
    } catch (_) { return Promise.resolve(null); }
  }
  function parseSounds(text) {
    var data = JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text);
    if (!data || typeof data !== 'object') throw new Error('not a sound file');
    return data;
  }
  function readBody(response, onBytes) {
    if (!response.body || typeof response.body.getReader !== 'function' || typeof Blob !== 'function' || typeof Blob.prototype.text !== 'function') return response.text();
    var reader = response.body.getReader(), chunks = [], got = 0;
    var more = function () {
      return reader.read().then(function (part) {
        if (part.done) return new Blob(chunks).text();
        chunks.push(part.value);
        got += part.value.length;
        onBytes(got);
        return more();
      });
    };
    return more();
  }
  // One sound file: from the saved copy when the site still has the same one, else from the site.
  function readSoundFile(cache, file, onBytes) {
    var download = function (response) {
      var fetched = response ? Promise.resolve(response) : window.fetch(file.url);
      return fetched.then(function (reply) {
        if (!reply.ok) throw new Error(file.url + ' answered ' + reply.status);
        return readBody(reply, onBytes).then(function (text) {
          var data = parseSounds(text);
          if (cache) {
            var headers = { 'Content-Type': 'application/json' };
            var tag = reply.headers && reply.headers.get('etag'), dated = reply.headers && reply.headers.get('last-modified');
            if (tag) headers.ETag = tag;
            if (dated) headers['Last-Modified'] = dated;
            try { cache.put(file.url, new Response(text, { headers: headers })).catch(function () {}); } catch (_) { /* no room: it is downloaded again next time */ }
          }
          return { data: data, saved: false };
        });
      });
    };
    var saved = cache ? cache.match(file.url).catch(function () { return undefined; }) : Promise.resolve(undefined);
    return saved.then(function (hit) {
      if (!hit) return download(null);
      var use = function () { return hit.clone().text().then(function (text) { return { data: parseSounds(text), saved: true }; }).catch(function () { return download(null); }); };
      var tag = hit.headers.get('etag'), dated = hit.headers.get('last-modified');
      if (!tag && !dated) return use();
      // Ask the site whether the file changed. No answer (no internet) means the saved copy is used.
      return window.fetch(file.url, { headers: tag ? { 'If-None-Match': tag } : { 'If-Modified-Since': dated } }).then(function (reply) {
        return reply.status === 200 ? download(reply) : use();
      }, use);
    });
  }
  function loadSounds() {
    var done = 0, out = {}, fromSite = 0;
    return openCache().then(function (cache) {
      return SOUND_FILES.reduce(function (chain, file) {
        return chain.then(function () {
          return readSoundFile(cache, file, function (got) { if (soundProgress) soundProgress(Math.min(SOUND_BYTES, done + Math.min(got, file.bytes))); });
        }).then(function (got) {
          done += file.bytes;
          if (!got.saved) fromSite += file.bytes;
          out[file.name] = got.data;
        });
      }, Promise.resolve());
    }).then(function () {
      soundsSaved = true;
      return { phonemes: out.phonemes, isolation: out.isolation, instructions: out.instructions, kokoroWords: out.kokoroWords.words || out.kokoroWords, gapFill: out.gapFill, fromSite: fromSite };
    });
  }
  function getSounds(onProgress) {
    soundProgress = onProgress;
    if (sounds) return Promise.resolve(sounds);
    if (!soundsLoading) soundsLoading = loadSounds().then(function (got) { sounds = got; soundsLoading = null; return got; }, function (error) { soundsLoading = null; throw error; });
    return soundsLoading;
  }
  // The word store. One index (word -> shard, shard -> file and size), then only the files that hold the practice
  // words. Each file goes through readSoundFile, so it is saved, checked and read again exactly as the sound
  // files above are. A file that does not arrive stops the build with WORD_SOUNDS_FAILED: never a silent word.
  var wordStore = null, wordFiles = {}, wordClips = {};
  function wordSoundsError(error) {
    var failed = new Error('word sounds: ' + String((error && error.message) || error));
    failed.wordSounds = true;
    return failed;
  }
  function readWordStore(cache) {
    if (wordStore) return Promise.resolve(wordStore);
    return readSoundFile(cache, { url: WORD_STORE_INDEX, bytes: 1 }, function () {}).then(function (got) {
      var index = got.data;
      if (index.format !== WORD_STORE_FORMAT || !index.words || typeof index.words !== 'object' || !index.shards || typeof index.shards !== 'object') throw new Error(WORD_STORE_INDEX + ' is not a word store index');
      wordStore = index;
      return index;
    });
  }
  // The files of the store that hold these words and are not here yet, as the index names them.
  function wordFilesFor(index, words) {
    var folder = WORD_STORE_INDEX.replace(/[^/]*$/, ''), byUrl = {}, list = [];
    words.forEach(function (word) {
      var key = Object.prototype.hasOwnProperty.call(index.words, word) ? index.words[word] : null;
      var shard = typeof key === 'string' && Object.prototype.hasOwnProperty.call(index.shards, key) ? index.shards[key] : null;
      // A word the index does not hold, or a name that is not a plain file name: the word stays without a clip, and the builder lists it.
      if (!shard || typeof shard.file !== 'string' || !WORD_FILE_NAME.test(shard.file)) return;
      var url = folder + shard.file;
      if (!byUrl[url]) { byUrl[url] = { url: url, bytes: shard.bytes > 0 ? shard.bytes : 1, words: [] }; list.push(byUrl[url]); }
      byUrl[url].words.push(word);
    });
    return list;
  }
  // Resolves to { word: clip } for those of these words whose recording is in the word store.
  function getWordSounds(words, onProgress) {
    var need = words.filter(function (word) { return inWordStore(word) && !wordClips[word]; });
    var mine = function () {
      var out = {};
      words.forEach(function (word) { if (wordClips[word]) out[word] = wordClips[word]; });
      return out;
    };
    if (!need.length) return Promise.resolve(mine());
    return openCache().then(function (cache) {
      return readWordStore(cache).then(function (index) {
        var files = wordFilesFor(index, need);
        var missing = files.filter(function (file) { return !wordFiles[file.url]; });
        var total = missing.reduce(function (sum, file) { return sum + file.bytes; }, 0), done = 0;
        return missing.reduce(function (chain, file) {
          return chain.then(function () {
            onProgress(done, total);
            return readSoundFile(cache, file, function (got) { onProgress(Math.min(total, done + Math.min(got, file.bytes)), total); });
          }).then(function (got) { done += file.bytes; wordFiles[file.url] = got.data; });
        }, Promise.resolve()).then(function () {
          files.forEach(function (file) {
            file.words.forEach(function (word) { var clip = wordFiles[file.url][word]; if (typeof clip === 'string' && clip) wordClips[word] = clip; });
          });
          return mine();
        });
      });
    }).then(null, function (error) { throw wordSoundsError(error); });
  }
  // The most the word store can add for the words now chosen: one file for each word that needs it, at the size
  // of the store's largest file, and never more than the whole store. 0 = nothing; -1 = some, of a size not known.
  function wordSoundsBound() {
    var n = chosenWords().filter(function (word) { return inWordStore(word) && !wordClips[word]; }).length;
    var audio = wordlist.meta && wordlist.meta.wordAudio;
    if (!n) return 0;
    if (!audio || !(audio.largestFileBytes > 0)) return -1;
    return Math.min(n * audio.largestFileBytes, audio.bytes > 0 ? audio.bytes : Infinity);
  }
  // "0.3", "1.7", "12": rounded up, so that "up to about" stays true.
  function megabytesUp(bytes) { return bytes >= 10e6 ? String(Math.ceil(bytes / 1e6)) : (Math.ceil(bytes / 1e5) / 10).toFixed(1); }
  function soundsNote() {
    var more = wordSoundsBound();
    var extra = more > 0 ? 'up to about ' + megabytesUp(more) + ' MB' : '';
    if (soundsSaved) {
      setText('sounds-note', !more ? 'The sounds are already on this device.'
        : 'Most of the sounds are already on this device. ' + (extra ? 'These words need ' + extra + ' more.' : 'The next step gets the sounds for these words.'));
    } else {
      setText('sounds-note', 'The next step gets the sounds: about ' + Math.round(SOUND_BYTES / 1e6) + ' MB' +
        (!more ? ', one time.' : ' one time, plus ' + (extra ? extra + ' for these words.' : 'the sounds for these words.')));
    }
  }
  function checkSavedSounds() {
    openCache().then(function (cache) {
      if (!cache) return [];
      return Promise.all(SOUND_FILES.map(function (file) { return cache.match(file.url).catch(function () { return undefined; }); }));
    }).then(function (hits) {
      soundsSaved = !!sounds || (hits.length === SOUND_FILES.length && hits.every(Boolean));
      soundsNote();
    }, function () {});
  }

  // A recording as WAV, which every browser plays (iPad and older Safari do not play WebM). This is the
  // app's own converter, loader.portableAudio. It decodes with an offline context, so no sound device is opened.
  function DecodeContext() {
    var Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    return new Offline(1, 1, 22050);
  }
  function toWav(uri) {
    if (wavs && wavs.has(uri)) return wavs.get(uri);
    var lesson = { audio: { clip: uri } };
    var made = loader.portableAudio(lesson, { AudioContext: DecodeContext }).then(function (report) {
      if (!report || report.converted !== 1) throw new Error('This browser could not convert a recording');
      wavCount++;
      if (step === 3 && !$('making').hidden) setText('making-line', 'Putting the file together: ' + count(wavCount, 'recording') + ' ready.');
      return lesson.audio.clip;
    });
    if (wavs) {
      wavs.set(uri, made);
      made.catch(function () { wavs.delete(uri); });
    }
    return made;
  }

  // A recording as MP3 (2026-11-17): the app's own encoder (lame.min.js) through packets_audio_kit.js, both from this site.
  // They start loading when the page opens (audioKit() from start) and a build uses them only once they have arrived: a
  // build never waits on them. One channel, 48 kbps: a file's recordings are about 6 to 10 times smaller than as WAV. Until
  // the encoder is here, or if it cannot be had, the builder keeps the WAV.
  var MP3_KBPS = 48, mp3Ready = null, mp3Kit = null;
  function audioKit() {
    if (mp3Ready) return mp3Ready;
    mp3Ready = new Promise(function (resolve) {
      if (window.AlloPacketAudioKit) { resolve(window.AlloPacketAudioKit); return; }
      var script = document.createElement('script');
      script.src = 'packets_audio_kit.js';
      script.onload = function () { resolve(window.AlloPacketAudioKit || null); };
      script.onerror = function () { resolve(null); };
      document.head.appendChild(script);
    }).then(function (kit) { return kit ? kit.getMp3().then(function (ok) { mp3Kit = ok ? kit : null; return mp3Kit; }) : null; });
    return mp3Ready;
  }
  // Each recording is made smaller once per visit: making the file again (a word removed, another version) reuses it.
  var mp3s = typeof Map === 'function' ? new Map() : null;
  function toMp3(uri) {
    if (mp3s && mp3s.has(uri)) return mp3s.get(uri);
    if (!mp3Kit) { audioKit(); return Promise.resolve(null); }
    var made = Promise.resolve(mp3Kit.wavUriToMp3Uri(uri, MP3_KBPS));
    if (mp3s) mp3s.set(uri, made);
    return made;
  }

  // Pictures: Mulberry Symbols (CC BY-SA 4.0), kept on this site. word_sounds_symbols_en.js, loaded with the
  // page, says which words have one. The drawings are in the files it names: the same files whatever words are
  // chosen, fetched only when a file is made with the box checked. A file made without them is the same file as before.
  // picturesChoice: '' until the teacher clicks the box (then it is on exactly when a word has a picture), 'on' or 'off' after.
  var symbols = null, picturesChoice = '', picturesNote = '', picturesLoading = null;
  function loadPictures() {
    if (symbols.ready()) return Promise.resolve(true);
    if (!picturesLoading) {
      picturesLoading = Promise.all(symbols.shards.map(function (shard) {
        return window.fetch(shard.url).then(function (reply) {
          if (!reply.ok) throw new Error(shard.url + ' answered ' + reply.status);
          return reply.text();
        }).then(function (text) { symbols.add(JSON.parse(text)); });
      })).then(function () { picturesLoading = null; return symbols.ready(); }, function (error) { picturesLoading = null; throw error; });
    }
    return picturesLoading;
  }
  // The box and its one line: how many of this file's words have a picture. inFile is what a finished file reports.
  // A picture the teacher added to a word (My words) is used in place of its symbol.
  function noPicture(word) { var entry = mineOf(word); return !!(entry && entry.picture && entry.picture.none) || !!myNoPicture[word] || !!previewNoPicture[word]; }
  function ownPicture(word) { var entry = mineOf(word); return !!(entry && entry.picture && !entry.picture.none) && !previewNoPicture[word]; }
  // The box is never switched off: with no picture among the words it can still be checked (the file is then the
  // plain one), and the line beside it says why there are none and what to do.
  function drawPictures(inFile) {
    var box = $('f-pictures');
    if (!box) return;
    var words = fileWords();
    var theirs = words.filter(ownPicture).length;
    var have = words.filter(function (word) { return !noPicture(word) && (ownPicture(word) || (!!symbols && symbols.has(word))); }).length;
    var onlyPictures = !!($('f-only-pictures') && $('f-only-pictures').checked);
    box.disabled = false;
    // On when the teacher checked it, or before any click when the teacher filtered for words with pictures or most chosen words have one.
    box.checked = picturesChoice === 'on' || (picturesChoice === '' && ((onlyPictures && have > 0) || (words.length > 0 && have * 2 > words.length)));
    box.parentNode.classList.toggle('is-on', box.checked);
    var n = inFile ? inFile.withPicture : have, of = inFile ? inFile.withPicture + inFile.withoutPicture : words.length;
    var added = inFile ? inFile.teacher || 0 : theirs;
    // Which symbol sets these words draw on (Mulberry first, OpenMoji only where Mulberry has none).
    var setNames = { mulberry: 'Mulberry', openmoji: 'OpenMoji' }, sets = [];
    words.forEach(function (word) {
      if (!symbols || noPicture(word) || ownPicture(word) || !symbols.has(word)) return;
      var set = typeof symbols.set === 'function' ? symbols.set(word) || 'mulberry' : 'mulberry';
      if (sets.indexOf(set) < 0) sets.push(set);
    });
    sets.sort();
    var setsSaid = (sets.length ? sets : ['mulberry']).map(function (set) { return setNames[set] || set; }).join(' and ');
    setText('pictures-line', picturesNote || (picturesLoading && box.checked && symbols ? 'Getting the pictures, about ' + megabytes(symbols.bytes) + ' MB.'
      : !n && words.length ? (symbols ? NO_PICTURES_SAID : NO_INDEX_SAID)
        : added ? 'Pictures for ' + n + ' of ' + count(of, 'word') + ': ' + added + ' you added' + (n > added ? ', ' + count(n - added, 'symbol') + ' from ' + setsSaid + '.' : '.')
          : symbols ? 'Pictures for ' + n + ' of ' + count(of, 'word') + '. Symbols: ' + setsSaid + '.' : NO_INDEX_SAID));
  }
  // Whether the file being made gets pictures: the box is checked and the drawings are here. The drawings
  // are fetched only when a word of the file shows a symbol (not when every picture is the teacher's).
  function picturesFor(run, words) {
    var box = $('f-pictures');
    if (!box || !box.checked) return Promise.resolve(false);
    if (!symbols || !words.some(function (word) { return !noPicture(word) && !ownPicture(word) && symbols.has(word); })) return Promise.resolve(words.some(ownPicture));
    if (!symbols.ready() && run === buildRun) making('Getting the pictures, about ' + megabytes(symbols.bytes) + ' MB.', null);
    var loading = loadPictures().then(function (ready) { return !!ready; }, function () { return false; });
    drawPictures();
    return loading.then(function (ready) {
      if (!ready) {
        picturesChoice = 'off';
        picturesNote = 'The pictures could not be downloaded, so this file has none. Check the box to try again.';
      }
      drawPictures();
      if (run === buildRun) making('Putting the file together.', null);
      return ready;
    });
  }

  function autoTitle() {
    var what = 'mixed words';
    if (state.mode === 'own') what = 'my words';
    else if (state.hand) what = 'chosen words';
    else if (state.sound) what = soundName(state.sound).replace(/ \(.*\)$/, '') + ' words';
    else if (state.shape) what = state.shape + ' words';
    else if (state.stage) what = stageName(state.stage);
    return 'Word Sounds: ' + what + ', version ' + state.version;
  }
  // A title that ends with the version (", version B", as the page's own titles do) follows the version chosen.
  var TITLE_VERSION = /, version [ABC]$/;
  function titleNow() {
    var typed = state.titleEdited ? String(state.title || '').trim() : '';
    return typed ? typed.replace(TITLE_VERSION, ', version ' + state.version) : autoTitle();
  }
  // The file's name: its title, then the student's code name when it has one (Practice__BlueHeron7.html).
  function fileName(title, learner, ending) {
    var stem = String(title).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    var code = String(learner || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return (stem || 'practice') + (code ? '__' + code : '') + (ending || '.html');
  }
  function codeNameNow() { return typeof builder.codeName === 'function' ? builder.codeName(state.learner) : ''; }
  // The estimates are the builder's own rule: one question for each word in each activity (at most 40 in one
  // activity), and the app's half a minute a question. A word that cannot be used in an activity makes it a little less.
  function estimate(words, acts) {
    var questions = words * acts;
    return count(words, 'word') + ', about ' + count(questions, 'question') + ', about ' + count(Math.ceil(questions / 2), 'minute') + '.';
  }
  function drawLengths() {
    var all = chosenWords().length, acts = Math.max(1, state.activities.length), before = -1, beforeName = '';
    // Words chosen by hand: the file has all of them, and the lengths wait until the page picks again.
    var hand = state.mode === 'pick' && state.hand;
    show('length-hand', hand);
    show('length-radios', !hand);
    placeCount();
    var questions = all * acts;
    setText('length-hand', hand ? 'You chose ' + count(all, 'word') + ' yourself, so the file has all of them: about ' + count(questions, 'question') + ', about ' + count(Math.ceil(questions / 2), 'minute')
      + '. To set a length instead, go back to step 2 and press Pick for me again.' : '');
    PRESETS.forEach(function (length) {
      var words = Math.min(all, wordsFor(length));
      var text = estimate(words, acts);
      if (words === before) text += ' The same as ' + beforeName + ': you have ' + count(all, 'word') + '.';
      var node = doc.querySelector('[data-length="' + length + '"]');
      if (node) node.textContent = text;
      before = words;
      beforeName = LENGTH_NAMES[length];
    });
    var custom = doc.querySelector('[data-length="custom"]'), want = wordsFor('custom');
    if (custom) custom.textContent = state.length !== 'custom' ? 'Choose the number of words, up to ' + MAX_WORDS + '.'
      : estimate(Math.min(all, want), acts) + (all < want ? ' You have ' + count(all, 'word') + '.' : '');
    syncRadios('length', state.length);
    drawMore3(hand, Math.min(all, wordsFor(state.length)));
    if (!state.titleEdited) $('f-title').value = autoTitle();
    else if (doc.activeElement !== $('f-title') && $('f-title').value !== titleNow()) $('f-title').value = state.title = titleNow();
    syncCodeName();
    var dirBox = $('f-directions-once');
    if (dirBox) { dirBox.checked = !!state.directionsOnce; dirBox.parentNode.classList.toggle('is-on', dirBox.checked); }
    var againBox = $('f-repeat-missed');
    if (againBox) { againBox.checked = !!state.repeatMissed; againBox.parentNode.classList.toggle('is-on', againBox.checked); }
  }
  // "More options" of step 3: the length, pictures, directions once and a code name. Its top line says what they are
  // now; it opens by itself when one of them is not the usual.
  function drawMore3(hand, words) {
    if (!$('more-3-now')) return;
    var now = [hand ? 'your ' + count(words, 'word') : LENGTH_NAMES[state.length] + ': ' + count(words, 'word')];
    now.push($('f-pictures') && $('f-pictures').checked ? 'pictures' : 'no pictures');
    if (state.directionsOnce) now.push('directions once');
    if (state.repeatMissed) now.push('missed questions once more');
    if (state.learner) now.push('a code name');
    setText('more-3-now', now.join(', '));
    openMore('more-3', (!hand && state.length !== 'regular') || !!state.directionsOnce || !!state.repeatMissed || !!state.learner);
  }
  // Step 3's code name: the field shows what was typed; the line under it, what the file will carry when that differs.
  function syncCodeName() {
    var field = $('f-code-name');
    if (!field) return;
    if (doc.activeElement !== field && field.value !== state.learner) field.value = state.learner;
    if (state.learner && !$('code-box').open) $('code-box').open = true;
    var clean = codeNameNow();
    setText('code-name-said', state.learner.trim() && clean !== state.learner.trim() ? (clean ? 'The file uses: ' + clean + '. A code name keeps to letters, numbers, spaces and . _ -' : 'A code name needs a letter or a number.') : '');
  }
  // Custom's number: a whole number from 1 to MAX_WORDS. Above it, the file uses MAX_WORDS and the line says so.
  function countTyped(field) {
    var raw = String(field.value || '').trim(), n = Number(raw);
    if (!/^\d+$/.test(raw) || n < 1) { setText('count-said', 'Type a whole number from 1 to ' + MAX_WORDS + '.'); return; }
    setText('count-said', n > MAX_WORDS ? MAX_WORDS + ' is the most, so the file uses ' + MAX_WORDS + ' words.' : '');
    state.count = Math.min(MAX_WORDS, n);
    // The box shows the number the file uses: it does not go on showing 99 beside '40 is the most'.
    if (n > MAX_WORDS) field.value = String(MAX_WORDS);
    state.length = 'custom';
    remember();
    lengthChanged(500);
  }
  // A new length may need more words from the picker (Custom above Long): it lists them first.
  function lengthChanged(delay) {
    if (state.mode === 'pick' && !state.hand) drawPick();
    drawLengths();
    makeSoon(delay);
  }

  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    show('summary', false);
    show('summary-more', false);
    show('size-warn', false);
    show('try', false);
    show('save', false);
    show('after-save', false);
    show('build-problem', false);
    // The files for each student follow the same choices: a change means making them again.
    batchChanged();
  }
  function making(text, done) {
    show('making', true);
    setText('making-line', text);
    var bar = $('making-bar');
    bar.hidden = done == null;
    if (done != null) bar.value = Math.max(0, Math.min(100, Math.round(done * 100)));
  }
  function makeSoon(delay) {
    clearTimeout(buildTimer);
    clearBuilt();
    drawPictures();
    making('Putting the file together.', null);
    buildTimer = setTimeout(make, delay);
  }
  function problem(text, fixes) {
    show('making', false);
    setText('build-problem-text', text);
    show('retry', fixes === 'retry');
    show('fix-words', fixes === 'change');
    show('fix-activities', fixes === 'change');
    show('build-problem', true);
    setText('making-said', text);
  }
  // The clips of a file's own words go in beside the word bank, in the shape the builder already reads.
  function banksWith(banks, clips) {
    var withWords = {};
    Object.keys(banks).forEach(function (name) { withWords[name] = banks[name]; });
    withWords.kokoroWords = {};
    Object.keys(clips).forEach(function (word) { withWords.kokoroWords[word] = clips[word]; });
    Object.keys(banks.kokoroWords).forEach(function (word) { withWords.kokoroWords[word] = banks.kokoroWords[word]; });
    return withWords;
  }
  // What the builder is handed: the same for one file (make) and for one file per student (makeBatch).
  // plan: { words, activities, seed, title, picked }.
  function packetOptions(plan, withWords, pictures, own, learner) {
    var options = { words: plan.words, activities: plan.activities, seed: plan.seed, title: plan.title, core: core, dictionary: dictionary, banks: withWords, loader: loader,
      wordlist: wordlist, toWav: toWav, toMp3: toMp3, picked: plan.picked, pictures: pictures, symbols: pictures && symbols && symbols.ready() ? symbols : null };
    if (own) options.own = own;
    if (learner) options.learnerLabel = learner;
    if (state.tracing !== 'both' && plan.activities.indexOf('letter_tracing') >= 0) options.tracingCases = state.tracing;
    options.choices = CHOICE_LEVELS.indexOf(state.choices) >= 0 ? state.choices : 'medium';
    if (state.directionsOnce) options.directionsOnce = true;
    if (state.repeatMissed) options.repeatMissed = true;
    if (!plan.clean) {
      if (Object.keys(previewOmit).length) options.omitItems = previewOmit;
      if (Object.keys(previewSeeds).length) options.itemSeeds = previewSeeds;
    }
    return options;
  }
  // The file a single make would give for another version (A, B or C): the version picks other words (unless the
  // teacher chose them) and a title that ends with the version follows it.
  function planFor(version) {
    var keep = { version: state.version, picked: picked };
    state.version = version;
    try {
      if (version !== keep.version && state.mode === 'pick' && !state.hand) picked = pick();
      return { version: version, words: fileWords(), activities: order.filter(function (id) { return state.activities.indexOf(id) >= 0; }), seed: seed(), title: titleNow(),
        picked: state.mode === 'pick' && !state.hand ? picked : null };
    } finally { state.version = keep.version; picked = keep.picked; }
  }
  function make() {
    clearTimeout(buildTimer);
    clearBuilt();
    var run = buildRun;
    var words = fileWords();
    var activities = order.filter(function (id) { return state.activities.indexOf(id) >= 0; });
    var title = titleNow();
    if (!words.length || !activities.length) {
      problem('There is nothing to make yet. Choose at least one activity and one word.', 'change');
      return Promise.resolve({ html: null, said: 'There is nothing to make yet.' });
    }
    var said = false;
    making(sounds ? 'Putting the file together.' : soundsSaved ? 'Reading the sounds saved on this device.' : 'Getting the sounds.', null);
    return getSounds(function (bytes) {
      if (run !== buildRun || sounds) return;
      making('Getting the sounds: ' + megabytes(bytes) + ' of ' + megabytes(SOUND_BYTES) + ' MB. This happens one time.', bytes / SOUND_BYTES);
      if (!said) { said = true; setText('making-said', 'Getting the sounds, about ' + Math.round(SOUND_BYTES / 1e6) + ' MB. This happens one time.'); }
    }).then(function (banks) {
      if (run !== buildRun) return null;
      soundsNote();
      var saidWords = false;
      return getWordSounds(words, function (bytes, total) {
        if (run !== buildRun) return;
        making('Getting the sounds for your words: ' + fileSize(total) + '.', total ? bytes / total : 0);
        if (!saidWords) { saidWords = true; setText('making-said', 'Getting the sounds for your words, ' + fileSize(total) + '.'); }
      }).then(function (clips) {
        if (run !== buildRun) return null;
        wavCount = 0;
        making('Putting the file together.', null);
        var withWords = banksWith(banks, clips);
        return picturesFor(run, words).then(function (pictures) {
          if (run !== buildRun) return null;
          // What the teacher added to these words, read from the store now (not from what the page showed).
          return ownFor(words).then(function (own) {
            if (run !== buildRun) return null;
            return builder.buildPacket(packetOptions({ words: words, activities: activities, seed: seed(), title: title, picked: state.mode === 'pick' && !state.hand ? picked : null },
              withWords, pictures, own, codeNameNow()));
          });
        });
      });
    }).then(function (result) {
      if (!result || run !== buildRun) return { html: null, said: 'Could not update the file.' };
      drawResult(result, words);
      return result.html && built ? { html: built.html, url: fileUrl } : { html: null, said: 'No question could be made.' };
    }).catch(function (error) {
      if (run !== buildRun) return { html: null, said: 'Cancelled.' };
      var text = String((error && error.message) || error || '');
      if (!sounds) problem('The sounds could not be downloaded. Check the connection, then try again. Your choices are still here.', 'retry');
      else if (error && error.wordSounds) problem(WORD_SOUNDS_FAILED, 'retry');
      else problem('The file could not be put together (' + (text || 'no reason was given') + '). Your choices are still here.', 'retry');
      return { html: null, said: text || 'Could not put the file together.' };
    });
  }
  function plainReason(reason) {
    var text = String(reason || '');
    if (/answer choice is on the blocklist/.test(text)) return 'an answer choice is on the list of words this tool does not use';
    if (/answer choice is a word the picker does not offer/.test(text)) return 'an answer choice is a word the picker does not offer';
    if (/answer choice/.test(text)) return 'an answer choice has no recording yet';
    if (/could not be converted to WAV|WebM and no converter/.test(text)) return 'this browser could not prepare a recording';
    if (text === 'no recording for this word') return 'no recording yet';
    if (text === 'no recording for the word ending') return 'the word ending has no recording yet';
    if (text === 'this word is on the blocklist') return 'on the list of words this tool does not use';
    return text.split('; ')[0];
  }
  // What was left out and why: the builder's exceptions, grouped, in plain words.
  function leftOut(result, words) {
    var lines = [], chosen = chosenWords(), spare = chosen.slice(words.length);
    if (spare.length) lines.push(count(spare.length, 'word') + ' not needed for a ' + LENGTH_NAMES[state.length] + ' file: ' + spare.join(', ') + '.' + (state.length === 'long' ? '' : ' A longer file uses more.'));
    // Words the teacher checked that cannot be used (yet): named, never dropped silently.
    var unusable = state.mode === 'pick' && state.hand ? state.chosen.filter(function (word) { return !usable(word); }) : [];
    if (unusable.length) lines.push('Chosen, but not used: ' + unusable.join(', ') + '. The note beside each word in step 2 says why.');
    var whole = [], groups = [], byKey = {};
    result.exceptions.forEach(function (e) {
      if (e.word && !e.activity && /no activity could be built/.test(e.reason)) { whole.push(e.word); return; }
      var reason = plainReason(e.reason), key = (e.activity || '') + '|' + reason;
      if (!byKey[key]) { byKey[key] = { activity: e.activity, reason: reason, words: [] }; groups.push(byKey[key]); }
      if (e.word && byKey[key].words.indexOf(e.word) < 0) byKey[key].words.push(e.word);
    });
    groups.forEach(function (group) {
      var name = group.activity ? core.activityLabel(group.activity) : '';
      lines.push((name ? name + ': ' : '') + (group.words.length ? group.words.join(', ') + ' (' + group.reason + ').' : group.reason + '.'));
    });
    if (whole.length) lines.push('Not in the file at all: ' + whole.join(', ') + '.');
    // What the builder would not take of the teacher's own, and why.
    var refused = result.manifest && result.manifest.own && Array.isArray(result.manifest.own.refused) ? result.manifest.own.refused : [];
    refused.forEach(function (r) {
      var what = r.part === 'sounds' ? 'Your sounds for ' + r.word + ' were' : r.part === 'clip' ? 'Your recording of ' + r.word + ' was' : 'Your picture for ' + r.word + ' was';
      lines.push(what + ' not used: ' + r.reason + '.');
    });
    return lines;
  }
  function drawList(id, lines) {
    var host = $(id);
    host.textContent = '';
    var list = el('ul');
    lines.forEach(function (line) { list.appendChild(el('li', '', line)); });
    host.appendChild(list);
  }
  function describePreview(lesson) {
    var out = [], blocks = lesson && Array.isArray(lesson.blocks) ? lesson.blocks : [];
    var picOn = !!($('f-pictures') && $('f-pictures').checked);
    blocks.forEach(function (block) {
      var act = String(block.activity || '');
      (Array.isArray(block.items) ? block.items : []).forEach(function (item) {
        var word = String(item.word || item.target || '');
        out.push({
          itemId: String(item.id || ''),
          activity: act,
          word: word,
          sample: false,
          label: core.activityLabel(act) + (word ? ' — ' + word : ''),
          canSwap: REROLL_ACTS.indexOf(act) >= 0,
          canTogglePicture: !!(picOn && word && (ownPicture(word) || !!myPictured[word] || noPicture(word) || (!!symbols && symbols.has(word)))),
          noPicture: !!(word && noPicture(word)),
        });
      });
    });
    return out;
  }
  function onPreviewAction(req) {
    var act = req && req.action, item = req && req.item;
    if (!item || !item.word) return { said: 'Nothing to change on this question.' };
    var word = String(item.word), key = String(item.activity || '') + '|' + word.toLowerCase();
    var rollback = null, saidAction = '', prep = Promise.resolve();
    if (act === 'remove') {
      if (!previewOmit[key]) { previewOmit[key] = true; rollback = function () { delete previewOmit[key]; }; }
      saidAction = 'Removed from this file.';
    } else if (act === 'swap') {
      var prevSeed = previewSeeds[key];
      previewSeeds[key] = (Number(prevSeed) || 0) + 1;
      rollback = function () { if (prevSeed === undefined) delete previewSeeds[key]; else previewSeeds[key] = prevSeed; };
      saidAction = 'Changed wrong answers.';
    } else if (act === 'picture') {
      var off = !noPicture(word), entry = mineOf(word);
      if (off && entry && entry.picture && !entry.picture.none) previewOwnPic[word] = entry.picture;
      var nextPic = off ? 'none' : (previewOwnPic[word] || null);
      saidAction = off ? 'Picture left out.' : 'Picture included.';
      if (myWords && typeof myWords.put === 'function') {
        prep = myWords.put(word, { picture: nextPic }).then(function () {
          if (off) {
            mine[word] = Object.assign({}, mine[word] || {}, { picture: { none: true } });
            myNoPicture[word] = true;
            delete myPictured[word];
          } else {
            delete myNoPicture[word];
            if (mine[word]) {
              if (nextPic) { mine[word].picture = nextPic; myPictured[word] = true; }
              else delete mine[word].picture;
            }
          }
        }, function () {
          if (off) previewNoPicture[word] = true; else delete previewNoPicture[word];
        });
      } else {
        if (off) previewNoPicture[word] = true; else delete previewNoPicture[word];
      }
    } else {
      return { said: 'Nothing changed.' };
    }
    inPreviewAction = true;
    return prep.then(function () { return make(); }).then(function (res) {
      inPreviewAction = false;
      if (!res || !res.html) {
        if (rollback) rollback();
        return make().then(function () { return { said: (res && res.said) || 'Could not update the file with that change.' }; });
      }
      return { html: res.html, url: res.url, said: saidAction };
    }, function (err) {
      inPreviewAction = false;
      if (rollback) rollback();
      return { said: String((err && err.message) || 'Could not update the file.') };
    });
  }
  function drawResult(result, words) {
    show('making', false);
    var manifest = result.manifest, out = leftOut(result, words);
    if (!result.html) {
      if (result.exceptions.some(function (e) { return /converted to WAV|no converter/.test(e.reason); })) {
        problem('This browser could not prepare the recordings, so no file was made. Open this page in a current version of Chrome, Edge, Firefox or Safari. Your choices are kept.', 'retry');
      } else problem('No question could be made from these words and activities. ' + out.join(' ') + ' Change the words or the activities.', 'change');
      return;
    }
    var blob = new Blob([result.html], { type: 'text/html' });
    built = { html: result.html, name: fileName(manifest.title, manifest.learnerLabel), bytes: blob.size };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    var total = manifest.items.total;
    setText('summary-facts', count(total, 'question') + '. About ' + count(Math.ceil(total / 2), 'minute') + '. ' + fileSize(built.bytes) + '.');
    setText('size-warn', built.bytes >= LARGE_FILE_BYTES ? LARGE_FILE_SAID : '');
    show('size-warn', built.bytes >= LARGE_FILE_BYTES);
    // With more than one group the words are listed under the teacher's labels (not in the file's order).
    var usedNow = manifest.words.used, byLabel = groupsOn() && picked && picked.parts ? picked.parts.map(function (part) {
      var here = part.words.filter(function (word) { return usedNow.indexOf(word) >= 0; });
      return here.length ? part.label + ': ' + here.join(', ') : '';
    }).filter(Boolean) : [];
    setText('sum-words', count(usedNow.length, 'word') + ': ' + (byLabel.length > 1 ? byLabel.join('. ') : usedNow.join(', ')) + '.');
    drawList('sum-activities', manifest.activities.asked.map(function (id) {
      var n = manifest.items.byActivity[id] || 0;
      return core.activityLabel(id) + ': ' + (n ? count(n, 'question') : 'none (see Left out)') + '.';
    }));
    drawList('sum-out', out.length ? out : ['Nothing. Every word is in every activity you chose.']);
    // With pictures, the line under the box now counts the words that show one in this file.
    if (manifest.pictures && (manifest.pictures.symbols || manifest.pictures.counts.teacher)) drawPictures(manifest.pictures.counts);
    show('summary', true);
    show('summary-more', true);
    if (fileUrl) {
      $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl);
      show('try', true);
      var handoff = window.AlloPacketHandoff;
      if (!inPreviewAction && handoff && typeof handoff.hostPreview === 'function') {
        if (previewSession) previewSession.update({ url: fileUrl, html: built.html });
        else previewSession = handoff.hostPreview({ url: fileUrl, html: built.html, describe: describePreview, onAction: onPreviewAction });
      }
    }
    show('save', true);
    setText('making-said', 'The file is ready: ' + count(total, 'question') + ', ' + fileSize(built.bytes) + '.');
    drawBatch();
  }
  function saveFile() {
    if (!built) return;
    var link = doc.createElement('a');
    var url = fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.', 'retry');
    link.href = url;
    link.download = built.name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    show('after-save', true);
    $('after-save').focus();
  }
  function saveBlob(url, name) {
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  }

  // ---------------------------------------------------------------------------
  // Step 3: "Make one for each student". One file for each code name, in one .zip file (packets_zip.js). The
  // builder makes each version once; each student's file is that file with the code name put in its manifest
  // (builder.withCodeName), which is exactly what a single make with that code name gives.
  // ---------------------------------------------------------------------------
  var batchRun = 0, batchBusy = false, batchFile = null;
  // The code names typed, one on each line: cleaned the way a file carries them, each used once, at most MAX_STUDENTS.
  function batchList() {
    var field = $('f-batch-names'), seen = {}, out = { names: [], twice: [], unusable: [], over: 0 };
    String((field && field.value) || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var name = typeof builder.codeName === 'function' ? builder.codeName(line) : '';
      if (!name) { out.unusable.push(line.trim().slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }
  function batchRotates() { return !!($('f-batch-rotate') && $('f-batch-rotate').checked); }
  function batchVersions(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(batchRotates() ? VERSIONS[i % VERSIONS.length] : state.version);
    return out;
  }
  // The line under the box: how many files, and how large they are in all, before anything is made.
  function drawBatch() {
    if (!$('batch') || batchBusy || !state) return;
    var list = batchList(), n = list.names.length, parts = [];
    if (!n) parts.push('Type or paste the code names, one on each line.');
    else {
      parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all (' + fileSize(built.bytes) + ' each).' : '. The size shows here once the file above is ready.'));
      parts.push(batchRotates() ? 'Versions A, B and C in turn.' : 'All version ' + state.version + '.');
    }
    if (list.over) parts.push('Not used: ' + count(list.over, 'more code name') + '. At most ' + MAX_STUDENTS + ' go in one .zip file, because a larger one is slow to make and to open, most of all on a phone or tablet. Make a second .zip file for the rest.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    if (batchFile) parts = ['Ready: ' + count(batchFile.count, 'file') + ' in one .zip file, ' + fileSize(batchFile.bytes) + '.' + batchFile.note];
    setText('batch-said', parts.join(' '));
  }
  function dropBatchFile() {
    if (batchFile && batchFile.url) { try { URL.revokeObjectURL(batchFile.url); } catch (_) {} }
    batchFile = null;
    show('batch-save', false);
  }
  function batchDone() {
    batchBusy = false;
    show('batch-making', false);
    show('batch-stop', false);
    $('batch-make').disabled = false;
  }
  // A choice changed: files made for the old choices are put away, and a run that is still going stops.
  function batchChanged() {
    if (!$('batch') || (!batchBusy && !batchFile)) return;
    var going = batchBusy;
    batchRun++;
    dropBatchFile();
    batchDone();
    setText('batch-problem', going ? 'Stopped, because a choice changed. Press Make the files again.' : 'A choice changed, so the .zip file was put away. Press Make the files again.');
    drawBatch();
  }
  function makeBatch() {
    var list = batchList(), zipKit = window.AlloPacketZip;
    setText('batch-problem', '');
    if (!list.names.length) { setText('batch-problem', 'Type at least one code name first.'); $('f-batch-names').focus(); return; }
    if (!zipKit || typeof zipKit.create !== 'function' || typeof builder.withCodeName !== 'function' || typeof TextEncoder !== 'function') {
      setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.');
      return;
    }
    var names = list.names, versions = batchVersions(names.length);
    var needed = VERSIONS.filter(function (version) { return versions.indexOf(version) >= 0; });
    var plans = {};
    try { needed.forEach(function (version) { plans[version] = planFor(version); }); } catch (_) { setText('batch-problem', 'The words could not be looked up. Change one choice in step 2, then try again.'); return; }
    if (!state.activities.length || needed.some(function (version) { return !plans[version].words.length; })) {
      setText('batch-problem', 'There is nothing to make yet. Choose at least one activity and one word.');
      return;
    }
    dropBatchFile();
    var run = ++batchRun;
    batchBusy = true;
    $('batch-make').disabled = true;
    show('batch-stop', true);
    show('batch-making', true);
    var steps = needed.length + 1;
    var line = function (text, done) { setText('batch-line', text); $('batch-bar').value = Math.max(0, Math.min(100, Math.round(done * 100))); };
    line(sounds ? 'Getting ready.' : 'Getting the sounds.', 0);
    setText('batch-said', 'Making ' + count(names.length, 'file') + '.');
    var bases = {};
    getSounds(function () {}).then(function (banks) {
      return needed.reduce(function (chain, version, i) {
        return chain.then(function () {
          if (run !== batchRun) return null;
          var plan = plans[version];
          line(needed.length > 1 ? 'Making version ' + version + ' (' + (i + 1) + ' of ' + needed.length + ').' : 'Making the file.', i / steps);
          return getWordSounds(plan.words, function () {}).then(function (clips) {
            return picturesFor(-1, plan.words).then(function (pictures) {
              return ownFor(plan.words).then(function (own) {
                if (run !== batchRun) return null;
                return builder.buildPacket(packetOptions(plan, banksWith(banks, clips), pictures, own, ''));
              });
            });
          }).then(function (result) {
            if (!result || run !== batchRun) return;
            if (!result.html) throw new Error(needed.length > 1 ? 'version ' + version + ' has no question' : 'no question could be made');
            bases[version] = result;
          });
        });
      }, Promise.resolve());
    }).then(function () {
      if (run !== batchRun) return null;
      var zip = zipKit.create(), encoder = new TextEncoder(), used = {}, i = 0;
      return new Promise(function (resolve, reject) {
        var next = function () {
          if (run !== batchRun) { resolve(null); return; }
          try {
            if (i >= names.length) { resolve(zip); return; }
            var name = names[i], plan = plans[versions[i]];
            var file = fileName(plan.title, name), again = 2;
            while (used[file.toLowerCase()]) file = fileName(plan.title, name + '-' + again++);
            used[file.toLowerCase()] = true;
            zip.add(file, encoder.encode(builder.withCodeName(bases[versions[i]].html, name)));
            i++;
            line('Putting in the code names: ' + i + ' of ' + names.length + '.', (needed.length + i / names.length) / steps);
            setTimeout(next, 0);
          } catch (error) { reject(error); }
        };
        next();
      });
    }).then(function (zip) {
      if (!zip || run !== batchRun) return;
      var parts = zip.finish();
      // A version that left words out says so: its own file, made above, lists which and why.
      var short = needed.filter(function (version) { return bases[version].manifest.words.used.length < plans[version].words.length; });
      // The .zip's name: the title, without its version when the files have several.
      var zipTitle = needed.length > 1 ? titleNow().replace(TITLE_VERSION, '') : plans[needed[0]].title;
      batchFile = { parts: parts, name: fileName(zipTitle, '', '__' + names.length + '-students.zip'), bytes: zip.bytes, count: names.length, url: '',
        note: short.length ? ' Some words are left out of version ' + listed(short) + '. Make one file of that version above to see which, and why.' : '' };
      batchDone();
      show('batch-save', true);
      drawBatch();
      $('batch-save').focus();
    }).catch(function (error) {
      if (run !== batchRun) return;
      batchDone();
      var text = String((error && error.message) || error || '');
      setText('batch-said', '');
      setText('batch-problem', !sounds ? 'The sounds could not be downloaded. Check the connection, then try again. Your choices are still here.'
        : error && error.wordSounds ? WORD_SOUNDS_FAILED : 'The files could not be put together (' + (text || 'no reason was given') + '). Your choices are still here.');
    });
  }
  function saveBatch() {
    if (!batchFile) return;
    if (!batchFile.url) { try { batchFile.url = URL.createObjectURL(new Blob(batchFile.parts, { type: 'application/zip' })); } catch (_) { batchFile.url = ''; } }
    if (!batchFile.url) { setText('batch-problem', 'This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.'); return; }
    saveBlob(batchFile.url, batchFile.name);
    setText('batch-said', 'Saved ' + batchFile.name + '. Open it to see the files. Each file\'s name ends with the student\'s code name. Send each student their own file.');
  }
  function wireBatch() {
    if (!$('batch')) return;
    var changed = function () { if (batchBusy) return; if (batchFile) { dropBatchFile(); setText('batch-problem', ''); } drawBatch(); };
    $('f-batch-names').addEventListener('input', changed);
    $('f-batch-rotate').addEventListener('change', function () { this.parentNode.classList.toggle('is-on', this.checked); changed(); });
    $('batch').addEventListener('toggle', drawBatch);
    $('batch-make').addEventListener('click', makeBatch);
    $('batch-stop').addEventListener('click', function () {
      batchRun++;
      batchDone();
      setText('batch-problem', 'Stopped. No .zip file was made.');
      drawBatch();
      $('batch-make').focus();
    });
    $('batch-save').addEventListener('click', saveBatch);
  }

  // ---------------------------------------------------------------------------
  // "Open a file I made": the page fills itself in from a practice file made earlier (packets_reopen.js reads it,
  // with packets_verify_core.js). The file is read in this tab only. Nothing in it is run.
  // ---------------------------------------------------------------------------
  var reopenKit = null;
  function reopenEnv() {
    return { verify: window.AlloPacketVerify, creditLine: builder.creditLine, codeName: builder.codeName, activities: order, wordSounds: core.activityIds(),
      labels: dictionary.labels || builder.SOUND_LABELS || [], seeds: SEEDS };
  }
  function readBytes(file) {
    if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(reader.error); };
        reader.readAsArrayBuffer(file);
      } catch (error) { reject(error); }
    });
  }
  function reopenFile(file) {
    if (!file || !reopenKit) return Promise.resolve();
    setText('reopen-status', 'Reading the file.');
    return readBytes(file).then(function (bytes) {
      applyReopen(reopenKit.read(bytes, reopenEnv()), String(file.name || 'the file').slice(0, 120));
    }).catch(function () { showReopen('This browser could not read the file.', [], null); });
  }
  function drawReopenKeep() { show('reopen-keep', !!myWords && Object.keys(fromFile).length > 0); }
  function showReopen(line, items, page) {
    setText('reopen-line', line);
    var host = $('reopen-list');
    host.textContent = '';
    items.forEach(function (text) { host.appendChild(el('li', '', text)); });
    host.hidden = !items.length;
    var link = $('reopen-page');
    if (page) { link.setAttribute('href', page.href); link.textContent = 'Open ' + page.name; }
    link.hidden = !page;
    setText('reopen-said', '');
    drawReopenKeep();
    show('reopen-note', true);
    setText('reopen-status', line);
    $('reopen-note').focus();
  }
  // Open panels close and the list's own controls start over (as with Forget my choices).
  function closePanels() {
    closePick(false);
    Object.keys(ownOpen).forEach(function (word) { ownOpen[word].destroy(); delete ownOpen[word]; });
    closeListPanel(false);
    $('pick-list').open = false;
    $('f-find').value = '';
    $('f-only-pictures').checked = false;
    $('f-add').value = '';
    listNote = '';
    addPending = {};
    setText('count-said', '');
  }
  function applyReopen(result, name) {
    if (!result.ok) { showReopen(result.why, [], result.page); return; }
    clearTimeout(buildTimer);
    resetPreview(true);
    previewNoPicture = {};
    previewOwnPic = {};
    clearBuilt();
    closePanels();
    var fresh = defaults();
    fresh.activities = result.activities.slice();
    // The words go in "Type my own words", in the order of the file.
    fresh.mode = 'own';
    fresh.own = result.words.join(' ');
    fresh.version = SEEDS[result.version] ? result.version : 'A';
    fresh.learner = result.learner || '';
    if (TRACE_CASES.indexOf(result.tracing) >= 0) fresh.tracing = result.tracing;
    if (CHOICE_LEVELS.indexOf(result.choices) >= 0) fresh.choices = result.choices;
    if (result.directionsOnce === true) fresh.directionsOnce = true;
    if (result.repeatMissed === true) fresh.repeatMissed = true;
    state = fresh;
    picked = null;
    fromFile = result.own && typeof result.own === 'object' ? result.own : {};
    var n = result.words.length;
    var preset = ['regular', 'short', 'long'].filter(function (length) { return core.LESSON_LENGTHS[length] && wordsFor(length) === n; })[0];
    state.length = preset || 'custom';
    if (!preset) state.count = Math.max(1, Math.min(MAX_WORDS, n || CUSTOM_WORDS));
    if (result.title && result.title !== autoTitle()) { state.title = result.title; state.titleEdited = true; }
    picturesChoice = result.pictures ? 'on' : 'off';
    picturesNote = '';
    remember();
    var items = [];
    items.push(result.activities.length ? count(result.activities.length, 'activity', 'activities') + ': ' + listed(result.activities.map(core.activityLabel)) + '.' : 'No activity of the file is offered here. Choose one in step 1.');
    items.push(n ? count(n, 'word') + ': ' + result.words.join(', ') + '. They are in step 2, under Type my own words, in the order of the file.' : 'No word could be read from the file. Choose the words in step 2.');
    items.push('Version ' + state.version + '. Length: ' + (preset ? LENGTH_NAMES[preset] : 'Custom, ' + count(state.count, 'word')) + '. Pictures: ' + (result.pictures ? 'on' : 'off') + '.');
    if (state.directionsOnce) items.push('Spoken directions: first question only.');
    if (state.repeatMissed) items.push('The missed questions once more at the end, as practice.');
    if (state.titleEdited) items.push('Title: ' + state.title + (/[.!?]$/.test(state.title) ? '' : '.'));
    if (state.learner) items.push('Student\'s code name: ' + state.learner + '. It is in step 3. Clear it there to make a file anyone can use.');
    var theirs = Object.keys(fromFile);
    if (theirs.length) items.push('Your own sounds, recordings or pictures for ' + listed(theirs) + ' came with the file and go into the new file. '
      + (myWords ? 'To use them in other files too, press Keep them in My words on this device.' : 'This browser cannot keep them after you close the page.'));
    result.notes.forEach(function (note) { items.push(note); });
    drawOwn();
    if (myWords) readMine();
    goTo(1, true);
    showReopen('Filled in from ' + name + '. Change what you want, then make the new file in step 3.', items, null);
  }
  // Keep a word's parts from the file in My words: only the parts the store does not have already.
  function keepFromFile(words) {
    var kept = [], failed = [];
    if (!myWords) return Promise.resolve({ kept: kept, failed: failed });
    return words.reduce(function (chain, word) {
      return chain.then(function () {
        var file = Object.prototype.hasOwnProperty.call(fromFile, word) ? fromFile[word] : null;
        if (!file) return null;
        return myWords.get(word).then(function (stored) {
          var patch = {};
          OWN_PARTS.forEach(function (part) { if (file[part] && !(stored && stored[part])) patch[part] = file[part]; });
          if (!Object.keys(patch).length) { delete fromFile[word]; return null; }
          return myWords.put(word, patch).then(function () { delete fromFile[word]; kept.push(word); });
        }).then(null, function (error) { failed.push(word + ' (' + String((error && error.message) || 'it could not be kept').replace(/\.$/, '') + ')'); });
      });
    }, Promise.resolve()).then(function () { return readMine(); }).then(function () { return { kept: kept, failed: failed }; });
  }
  function wireReopen() {
    reopenKit = window.AlloPacketReopen;
    var verify = window.AlloPacketVerify;
    if (!reopenKit || typeof reopenKit.read !== 'function' || !verify || typeof verify.readParts !== 'function') { reopenKit = null; return; }
    show('reopen', true);
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      reopenFile(file).then(function () { $('reopen-file').value = ''; });
    });
    // A file dropped on the page (not on a picture box of Edit this word) is opened the same way.
    var main = $('main'), zone = $('reopen');
    var isFiles = function (event) { var types = event.dataTransfer && event.dataTransfer.types; return !!types && Array.prototype.indexOf.call(types, 'Files') >= 0; };
    var ours = function (event) { return isFiles(event) && !(event.target && typeof event.target.closest === 'function' && event.target.closest('.word-edit, input[type="file"]')); };
    main.addEventListener('dragover', function (event) {
      if (!ours(event)) return;
      event.preventDefault();
      try { event.dataTransfer.dropEffect = 'copy'; } catch (_) {}
      zone.classList.add('is-dropping');
    });
    main.addEventListener('dragleave', function (event) { if (!event.relatedTarget || !main.contains(event.relatedTarget)) zone.classList.remove('is-dropping'); });
    main.addEventListener('drop', function (event) {
      zone.classList.remove('is-dropping');
      if (!ours(event)) return;
      event.preventDefault();
      reopenFile(event.dataTransfer.files && event.dataTransfer.files[0]);
    });
    $('reopen-close').addEventListener('click', function () { show('reopen-note', false); $('reopen-choose').focus(); });
    $('reopen-keep').addEventListener('click', function () {
      setText('reopen-said', 'Keeping them.');
      keepFromFile(Object.keys(fromFile)).then(function (done) {
        var said = [];
        if (done.kept.length) said.push('Kept in My words on this device: ' + listed(done.kept) + '.');
        if (done.failed.length) said.push('Not kept: ' + done.failed.join(', ') + '. They still go into the new file.');
        if (!said.length) said.push('My words already had them.');
        setText('reopen-said', said.join(' '));
        drawReopenKeep();
        if ($('reopen-keep').hidden) $('reopen-close').focus();
      });
    });
    // A file handed over by "Change this file" on Open a practice file (packets-open.html, packets_handoff.js):
    // taken once and deleted, then opened as if chosen here.
    var handoff = window.AlloPacketHandoff;
    if (handoff && typeof handoff.take === 'function' && window.location.hash === handoff.HASH) {
      try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
      handoff.take().then(function (file) {
        if (file) reopenFile({ name: file.name, arrayBuffer: function () { return Promise.resolve(file.bytes); } });
        else showReopen('The file is not here any more. Choose it with Open a file I made.', [], null);
      }, function () { showReopen('This browser could not hand the file over. Choose it with Open a file I made.', [], null); });
    }
  }

  // ---------------------------------------------------------------------------
  // Moving between the steps
  // ---------------------------------------------------------------------------
  function goTo(wanted, quiet) {
    var target = wanted;
    if (target >= 2 && !state.activities.length) {
      target = 1;
      setText('step-1-problem', 'Choose at least one activity to go on.');
    }
    if (target === 3) {
      if (state.mode === 'own') drawOwn(); else drawPick();
      if (!chosenWords().length) {
        target = 2;
        setText('step-2-problem', state.mode === 'own' ? 'None of your words can be used yet. The note beside each word says why.'
          : state.hand ? 'None of the words you chose can be used yet. Check words in Choose the words yourself, or press Pick for me again there.'
            : 'No words fit yet. Loosen one choice above, or type your own words.');
      }
    }
    if (target !== 3) { clearTimeout(buildTimer); resetPreview(true); clearBuilt(); show('making', false); }
    // Sent back to the step already on screen: the reason is announced and the focus stays where it is.
    var stayed = target !== wanted && target === step;
    step = target;
    [1, 2, 3].forEach(function (n) { show('step-' + n, n === step); });
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      var n = Number(tab.getAttribute('data-go'));
      if (n === step) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
      tab.classList.toggle('is-done', n < step);
    });
    var name = productName();
    doc.title = (name ? name + ': ' : '') + 'Make Word Sounds practice, step ' + step + ' of 3';
    if (step === 1) { syncActivities(); openStrands(); }
    if (step === 2) { drawWords(); soundsNote(); }
    if (step === 3) { drawLengths(); makeSoon(0); drawBatch(); }
    if (!quiet && !stayed) {
      var heading = $('step-' + step + '-title');
      if (heading) { heading.focus(); if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' }); }
    }
  }

  function wire() {
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      tab.addEventListener('click', function () { goTo(Number(tab.getAttribute('data-go'))); });
    });
    $('next-1').addEventListener('click', function () { goTo(2); });
    $('back-2').addEventListener('click', function () { goTo(1); });
    $('next-2').addEventListener('click', function () { goTo(3); });
    $('back-3').addEventListener('click', function () { goTo(2); });
    $('fix-words').addEventListener('click', function () { goTo(2); });
    $('fix-activities').addEventListener('click', function () { goTo(1); });
    $('retry').addEventListener('click', function () { makeSoon(0); });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.mode = radio.value; remember(); drawWords(); });
    });
    if ($('f-trace-cases')) $('f-trace-cases').addEventListener('change', function () { state.tracing = TRACE_CASES.indexOf(this.value) >= 0 ? this.value : 'both'; remember(); });
    if ($('f-choices')) $('f-choices').addEventListener('change', function () { state.choices = CHOICE_LEVELS.indexOf(this.value) >= 0 ? this.value : 'medium'; remember(); });
    $('f-sound').addEventListener('change', function () { state.sound = this.value; if (!state.sound) state.position = 'any'; pickChanged(false); });
    $('f-position').addEventListener('change', function () { state.position = this.value; pickChanged(false); });
    $('f-shape').addEventListener('change', function () { state.shape = this.value; pickChanged(false); });
    $('f-stage').addEventListener('change', function () { state.stage = this.value; pickChanged(false); });
    if ($('group-add')) $('group-add').addEventListener('click', addGroup);
    // "Other curricula": add or take away their stages. Taking them away while one is chosen goes back to "Any stage".
    $('f-stage-other').addEventListener('change', function () {
      otherStagesOn = this.checked;
      if (!otherStagesOn && otherStage(stageRow(state.stage))) { state.stage = ''; pickChanged(false); } else syncPickControls();
    });
    $('pick-restore').addEventListener('click', function () { state.removed = []; remember(); drawPick(); $('pick-line').focus(); });
    $('f-own').addEventListener('input', function () {
      state.own = this.value.slice(0, 4000);
      remember();
      clearTimeout(ownTimer);
      ownTimer = setTimeout(drawOwn, 250);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="version"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.version = radio.value; syncRadios('version', state.version); pickChanged(true); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="length"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.length = radio.value; remember(); syncRadios('length', state.length); lengthChanged(0); });
    });
    $('f-count').addEventListener('input', function () { countTyped(this); });
    $('f-count').addEventListener('blur', function () { if (wordCount(Number(this.value)) !== wordsFor(state.length)) { this.value = String(wordsFor(state.length)); } });
    if ($('count-less')) $('count-less').addEventListener('click', function () { stepCount(-1); });
    if ($('count-more')) $('count-more').addEventListener('click', function () { stepCount(1); });
    if ($('pick-shuffle')) $('pick-shuffle').addEventListener('click', pickDifferent);
    if ($('pick-common')) $('pick-common').addEventListener('click', pickCommon);
    // "Make it with the usual settings": straight to step 3 with what is chosen now. goTo sends the teacher back with
    // the reason when there is no activity or no word yet.
    if ($('quick-make')) $('quick-make').addEventListener('click', function () { goTo(3); });
    wireWordList();
    $('f-title').addEventListener('input', function () {
      state.title = this.value;
      state.titleEdited = !!this.value.trim();
      makeSoon(700);
    });
    $('f-title').addEventListener('blur', function () { if (!state.titleEdited) this.value = autoTitle(); });
    $('f-code-name').addEventListener('input', function () {
      state.learner = this.value.slice(0, 40);
      syncCodeName();
      makeSoon(700);
    });
    wireBatch();
    $('f-pictures').addEventListener('change', function () { picturesChoice = this.checked ? 'on' : 'off'; picturesNote = ''; makeSoon(0); drawLengths(); });
    if ($('f-repeat-missed')) $('f-repeat-missed').addEventListener('change', function () { state.repeatMissed = this.checked; this.parentNode.classList.toggle('is-on', this.checked); remember(); makeSoon(0); drawLengths(); });
    if ($('f-directions-once')) $('f-directions-once').addEventListener('change', function () { state.directionsOnce = this.checked; this.parentNode.classList.toggle('is-on', this.checked); remember(); makeSoon(0); drawLengths(); });
    $('save').addEventListener('click', saveFile);
    if ($('open-present-export')) $('open-present-export').addEventListener('click', remember);
    // Print word cards (packets-print-cards.js): this file's words, title and picture choice, read when pressed.
    // The drawings come through loadPictures, so they are fetched once for both.
    var cards = window.AlloPacketPrintCards;
    if (cards && typeof cards.wire === 'function') cards.wire($('print-cards'), function () {
      return { words: fileWords(), title: titleNow(), pictures: !!$('f-pictures').checked, symbols: symbols, loadPictures: symbols ? loadPictures : null, own: ownFor };
    });
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      resetPreview(true);
      previewNoPicture = {};
      previewOwnPic = {};
      // My words are not choices: they stay (they have their own Remove buttons in step 2). Their open panels close.
      closePick(false);
      Object.keys(ownOpen).forEach(function (word) { ownOpen[word].destroy(); delete ownOpen[word]; });
      closeListPanel(false);
      state = defaults();
      picked = null;
      // The list's own controls start over too.
      $('pick-list').open = false;
      $('f-find').value = '';
      $('f-only-pictures').checked = false;
      $('f-add').value = '';
      listNote = '';
      addPending = {};
      setText('count-said', '');
      setText('pick-said', '');
      closeMores();
      // What came from an opened file, and the code names for each student, go too.
      fromFile = {};
      show('reopen-note', false);
      if ($('f-batch-names')) $('f-batch-names').value = '';
      goTo(1, true);
      setText('forget-said', 'Done. The page is back to how it started.');
    });
    $('forget-sounds').addEventListener('click', function () {
      var done = function () {
        sounds = null; soundsLoading = null; soundsSaved = false;
        wordStore = null; wordFiles = {}; wordClips = {};
        if (wavs) wavs.clear();
        soundsNote();
        setText('forget-said', 'Done. The sounds are downloaded again the next time a file is made.');
      };
      try { window.caches.delete(SOUND_CACHE).then(done, done); } catch (_) { done(); }
    });
    $('pick-line').setAttribute('tabindex', '-1');
  }

  function listFiles() {
    var files = ['packets-make.html'];
    Array.prototype.forEach.call(doc.querySelectorAll('link[href]'), function (link) { files.push(link.getAttribute('href')); });
    Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (script) { files.push(script.getAttribute('src')); });
    var pictures = symbols ? ' When a file is made with pictures: ' + symbols.shards.map(function (shard) { return shard.url; }).join(', ') + '.' : '';
    // Named only when the word list says a word's recording is in the word store: otherwise the page never asks for it.
    var store = wordlist.rows().some(function (row) { return row.shards && !row.kokoro; }) ? ' When a word needs it: ' + WORD_STORE_INDEX + ' and the small sound files it names.' : '';
    var text = files.join(', ') + '. At step 3: ' + SOUND_FILES.map(function (file) { return file.url; }).join(', ') + '.' + store + pictures + ' For Try it: ' + TRY_PAGE + ' and packets-try.js.';
    Array.prototype.forEach.call(doc.querySelectorAll('[data-show-files]'), function (node) { node.textContent = text; });
  }

  // Credits for the data, read from the data files themselves so the page cannot fall out of step with them.
  function listSources() {
    var host = $('sources');
    if (!host) return;
    var lines = [], source = dictionary.source || {}, books = wordlist.meta && wordlist.meta.childBooks;
    if (source.name) lines.push('How each word sounds: ' + source.name + (source.license ? ' (' + source.license + ')' : '') + ', turned into sound labels by AlloFlow.');
    if (books && books.name) lines.push('How common a word is in children\'s books: ' + books.name + '. ' + (books.citation ? books.citation + ' ' : '') + (books.license ? 'License: ' + books.license + '.' : ''));
    var credits = symbols ? (symbols.credits ? Object.keys(symbols.credits).sort().map(function (key) { return symbols.credits[key]; }) : symbols.credit ? [symbols.credit] : []) : [];
    credits.forEach(function (credit, i) {
      // The license's own page, as packets-print-cards.js names it (setCredit), written without its scheme.
      var deed = LICENSE_DEEDS[credit.license];
      lines.push((i ? 'More pictures: ' : 'The pictures: ') + credit.set + ' by ' + credit.author + '. License: ' + credit.license + (deed ? ' (' + deed + ')' : '') + '. ' + credit.url);
    });
    lines.forEach(function (line) { host.insertBefore(el('li', '', line), host.lastElementChild); });
  }

  function start() {
    audioKit(); // the MP3 encoder starts loading now, so it is here by step 3 (a build never waits on it)
    var modules = window.AlloModules || {};
    dictionary = modules.WordSoundsPhonemes;
    wordlist = modules.WordSoundsWordlist;
    loader = window.AlloWordSoundsTakeHome;
    builder = window.AlloPacketBuilder;
    var missing = [];
    if (!dictionary || typeof dictionary.lookup !== 'function') missing.push('word_sounds_phonemes_en.js');
    if (typeof window.createWordSoundsCore !== 'function') missing.push('word_sounds_core.js');
    if (!wordlist || typeof wordlist.rows !== 'function') missing.push('word_sounds_wordlist_en.js');
    if (!loader || typeof loader.buildHtml !== 'function' || typeof loader.portableAudio !== 'function') missing.push('word_sounds_take_home_loader.js');
    if (!builder || typeof builder.buildPacket !== 'function' || typeof builder.pickWords !== 'function') missing.push('word_sounds_packet_builder.js');
    if (missing.length) {
      show('loading', false);
      setText('load-problem-text', 'Missing: ' + missing.join(', ') + '. Check the connection, then load the page again. Nothing has been lost.');
      show('load-problem', true);
      return;
    }
    core = window.createWordSoundsCore({ phonemes: dictionary });
    // The pictures are an extra: the page works without them, and says so under the box.
    var pictureIndex = modules.WordSoundsSymbols;
    symbols = pictureIndex && typeof pictureIndex.has === 'function' && typeof pictureIndex.add === 'function' && Array.isArray(pictureIndex.shards) ? pictureIndex : null;
    var buildable = builder.SUPPORTED_ACTIVITIES.filter(function (id) { return loader.ADAPTERS[id] && core.ACTIVITY_SKILLS[id]; });
    // The 15 words whose only recording is in the bank this page does not load.
    recordedOnly = wordlist.rows().filter(function (row) { return row.hasClip && !row.kokoro && !row.shards; }).map(function (row) { return row.word; });
    try { stageRows = typeof builder.stageList === 'function' ? builder.stageList() : []; } catch (_) { stageRows = []; }
    if (!stageRows.length) stageRows = (builder.STAGES || []).map(function (id) { return { id: id, label: id, frameworkLabel: '', note: builder.STAGE_NOTE || '' }; });
    // The page opens when the trial build has said which activities to hold back (well under a second).
    heldBackBy(buildable).then(function (held) {
      try { openPage(buildable, held); } catch (error) { stopped(error); }
    });
  }

  // Which of these activities to hold back: see TRIAL_WORDS for the rule. The trial knows what this page can
  // load: a practice word from the word bank or the word store, an answer choice from the word bank only (the
  // builder takes its choices from the clips it is handed, and the page hands it the bank and the practice words).
  // No trial (no word with a recording, or a builder that cannot run one) holds nothing back: step 3 then says,
  // word by word, what was left out.
  function heldBackBy(buildable) {
    var trial = [];
    try { trial = builder.pickWords({ count: TRIAL_WORDS, shape: 'CVC', exclude: recordedOnly }, { wordlist: wordlist, core: core, dictionary: dictionary, seed: SEEDS.A }).words; } catch (_) { trial = []; }
    if (!trial.length || typeof builder.trialBuild !== 'function') return Promise.resolve([]);
    var voiced = function (word) { var row = wordlist.get(word); return !!row && (row.kokoro || (row.shards && trial.indexOf(word) >= 0)); };
    return Promise.resolve().then(function () {
      return builder.trialBuild({ words: trial, activities: buildable, seed: SEEDS.A, core: core, loader: loader, wordlist: wordlist, voiced: voiced });
    }).then(function (result) {
      return buildable.filter(function (id) {
        var got = result.byActivity[id];
        return !!got && got.questions * 2 < result.words && got.noRecording > 0;
      });
    }, function () { return []; });
  }

  function applyRehearseHash() {
    var hash = String(window.location && window.location.hash ? window.location.hash : '');
    var match = /^#rehearse=(.+)$/i.exec(hash);
    if (!match) return false;
    var parsed = '';
    try { parsed = decodeURIComponent(match[1]); } catch (_) { parsed = match[1]; }
    var unique = [];
    parsed.split(/[\s,;]+/).forEach(function (raw) {
      var word = String(raw || '').trim();
      if (!word) return;
      var low = word.toLowerCase();
      if (unique.every(function (x) { return x.toLowerCase() !== low; }) && unique.length < 40) unique.push(word);
    });
    if (unique.length) {
      state.mode = 'own';
      state.own = unique.join(', ').slice(0, 4000);
      if ($('f-own')) $('f-own').value = state.own;
      syncMode();
      drawOwn();
      remember();
    }
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    return unique.length > 0;
  }

  function openPage(buildable, held) {
    heldBack = held;
    var offered = buildable.filter(function (id) { return held.indexOf(id) < 0; });
    strands = core.SKILL_STRANDS.map(function (row) {
      return { key: row.key, name: core.strandLabel(row.key), ids: core.activityIds().filter(function (id) { return offered.indexOf(id) >= 0 && core.activityStrand(id) === row.key; }) };
    }).filter(function (strand) { return strand.ids.length > 0; });
    order = [].concat.apply([], strands.map(function (strand) { return strand.ids; }));
    // My words and "Edit this word" are extras: without their two scripts the page works as it did.
    var store = window.AlloPacketMyWords, panels = window.AlloPacketWordPanel;
    myWords = store && typeof store.getMany === 'function' && typeof store.list === 'function' && typeof store.put === 'function' ? store : null;
    wordPanel = myWords && panels && typeof panels.create === 'function' ? panels.create({ store: myWords, core: core, wordlist: wordlist, symbols: symbols,
      soundGroups: SOUND_GROUPS, soundName: soundName, bankClip: bankClip, bankNote: bankNote, playable: toWav, picturesPage: PICTURES_PAGE }) : null;
    drawPickControls();
    state = recall();
    applyRehearseHash();
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_csv) setText('csv-label', loader.DEFAULT_LABELS.save_csv);
    drawStrands();
    listFiles();
    listSources();
    wire();
    wireReopen();
    if (myWords) {
      wireMyWords();
      // Another tab (Find a picture) or this one changed the store: read it again.
      if (typeof myWords.onChange === 'function') myWords.onChange(function () { readMine(); });
      readMine();
    }
    show('loading', false);
    goTo(1, true);
    checkSavedSounds();
  }

  function stopped(error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + String((error && error.message) || error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
  try { start(); } catch (error) { stopped(error); }
})();
