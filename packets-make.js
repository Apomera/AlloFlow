// The maker page (packets-make.html): three steps, then one practice file.
// Everything happens in this tab. The only requests are for files on this site, and every one is a plain
// GET that carries no word and no choice: the scripts the page names; at step 3 the sound files listed in
// SOUND_FILES, the same ones whatever is chosen; and, for a word whose recording is in the word store, the
// store's index and the small sound file that holds the word. So the server can see WHICH of those small files
// were asked for (each holds a few dozen words), never which words. With "Include pictures" checked the page
// also gets the picture files, the same ones whatever words are chosen.
// No AI runs here, and there is no account and no cookie. What it keeps on the device is listed under "About this page".
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
    { name: 'kokoroWords', url: 'word_audio_kokoro_bank.json', bytes: 6273683 },
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
  var MAX_WORDS = 40;        // the file holds at most 40 questions in one activity
  var MAX_TYPED = 60;
  var SEEDS = { A: 1, B: 2, C: 3 };

  // The usual set in each strand, and what a first visit starts with.
  var USUAL = { syllables_rhyme: ['rhyming'], hearing_sounds: ['isolation', 'blending', 'segmentation'], letters_sounds: ['mapping'], spelling: ['missing_letter', 'spelling_bee'] };
  var FIRST_VISIT = USUAL.hearing_sounds;
  // Which activities the builder can make but this page holds back is worked out when the page opens, from
  // the word list's recording flags (see heldBackBy). The rule: the builder makes a trial build of the first
  // TRIAL_WORDS words this page lists when nothing is changed (three-sound words, version A), knowing only which
  // words have a recording the page can load. An activity is held back when fewer than half of those words get a
  // question in it and a missing recording is among the reasons. Measured on 2026-11-11: Word Families gets a
  // question for about 15 words in 100, because most word endings (-ug, -ip) have no recording.
  var TRIAL_WORDS = 16;
  var HELD_BACK_REASON = 'not enough recorded sounds yet';
  var CARD_NOTES = { letter_tracing: 'Practice only. It is not scored.' };
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
  // Shape by sounds, then words of that shape (checked against the word list by the test).
  var SHAPES = [['CVC', 'cat, ship'], ['CCVC', 'frog, stop'], ['CVCC', 'lamp, fast'], ['CCVCC', 'stamp'], ['CV', 'go, she'], ['VC', 'at, in']];
  var STAGE_HINT = 'A stage keeps to the letter patterns taught by then.';
  // The kindergarten rows of the default (US, Common Core) stage table: neither has sh, ch or th (see #stage-k-note).
  var K_STAGES = ['K early', 'K late'];
  var TYPED_ONLY_SAID = 'Not offered by the picker. Used because you typed it.';
  var LENGTH_NAMES = { short: 'Short', regular: 'Regular', long: 'Long' };

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
  var strands = [], order = [], heldBack = [], recordedOnly = [], stageRows = [];
  var state = null;
  var picked = null, pickTimer = 0, pickRun = 0;
  var ownRows = [], ownTimer = 0;
  var step = 1;

  function defaults() {
    return { activities: FIRST_VISIT.slice(), mode: 'pick', sound: '', position: 'any', shape: 'CVC', stage: '', removed: [], own: '', version: 'A',
      length: core && core.LESSON_LENGTHS[core.LESSON_LENGTH_DEFAULT] ? core.LESSON_LENGTH_DEFAULT : 'regular', title: '', titleEdited: false };
  }

  // ---------------------------------------------------------------------------
  // What this page keeps: the last choices, in this browser only
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, activities: state.activities, mode: state.mode, sound: state.sound, position: state.position,
        shape: state.shape, stage: state.stage, own: state.own, version: state.version, length: state.length }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved || saved.v !== 1) return fresh;
    if (Array.isArray(saved.activities)) fresh.activities = order.filter(function (id) { return saved.activities.indexOf(id) >= 0; });
    if (saved.mode === 'own' || saved.mode === 'pick') fresh.mode = saved.mode;
    if (typeof saved.sound === 'string' && Array.prototype.some.call($('f-sound').options, function (option) { return option.value === saved.sound; })) fresh.sound = saved.sound;
    if (['any', 'first', 'middle', 'last'].indexOf(saved.position) >= 0) fresh.position = saved.position;
    if (saved.shape === '' || SHAPES.some(function (row) { return row[0] === saved.shape; })) fresh.shape = saved.shape;
    if (stageRow(saved.stage)) fresh.stage = saved.stage;
    if (typeof saved.own === 'string') fresh.own = saved.own.slice(0, 4000);
    if (SEEDS[saved.version]) fresh.version = saved.version;
    if (LENGTH_NAMES[saved.length] && core.LESSON_LENGTHS[saved.length]) fresh.length = saved.length;
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
      var group = el('div', 'strand');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', 'strand-' + strand.key);
      var head = el('div', 'strand-head');
      var title = el('h3', '', strand.name);
      title.id = 'strand-' + strand.key;
      head.appendChild(title);
      var usual = (USUAL[strand.key] || []).filter(function (id) { return strand.ids.indexOf(id) >= 0; });
      if (usual.length && usual.length < strand.ids.length) {
        var button = el('button', 'btn btn-text btn-small', 'Choose the usual set');
        button.type = 'button';
        button.setAttribute('aria-label', 'Choose the usual set for ' + strand.name + ': ' + usual.map(core.activityEnglishName).join(', '));
        button.addEventListener('click', function () {
          state.activities = order.filter(function (id) { return strand.ids.indexOf(id) >= 0 ? usual.indexOf(id) >= 0 : state.activities.indexOf(id) >= 0; });
          activitiesChanged();
        });
        head.appendChild(button);
      }
      group.appendChild(head);
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
    // What is not offered, and the plain reason for each kind.
    var held = heldBack.map(core.activityEnglishName);
    var missing = core.activityIds().filter(function (id) { return order.indexOf(id) < 0 && heldBack.indexOf(id) < 0; }).map(core.activityEnglishName);
    var parts = [];
    if (held.length) parts.push(listed(held) + ' (' + HELD_BACK_REASON + ').');
    if (missing.length) parts.push(listed(missing) + ' (' + (missing.length === 1 ? 'it' : 'they') + ' cannot be made from a word list alone yet).');
    setText('not-offered', parts.length ? 'Not in this version: ' + parts.join(' ') : '');
  }
  function syncActivities() {
    Array.prototype.forEach.call($('strands').querySelectorAll('input[type="checkbox"]'), function (box) {
      box.checked = state.activities.indexOf(box.value) >= 0;
      box.parentNode.classList.toggle('is-on', box.checked);
    });
    var n = state.activities.length;
    setText('activity-count', n ? count(n, 'activity', 'activities') + ' chosen.' : 'No activity is chosen yet.');
    if (n) setText('step-1-problem', '');
  }
  function activitiesChanged() {
    syncActivities();
    remember();
  }

  // ---------------------------------------------------------------------------
  // Step 2: which words
  // ---------------------------------------------------------------------------
  function seed() { return SEEDS[state.version] || 1; }
  function soundName(label) { return SOUND_NAMES[label] || label; }
  // How many words a file of this length uses: the app's lengths (10, 20, 30 questions) shared between the activities.
  function wordsFor(length) {
    var row = core.LESSON_LENGTHS[length] || core.LESSON_LENGTHS.regular;
    return Math.max(1, Math.min(MAX_WORDS, Math.ceil(row.items / Math.max(1, state.activities.length))));
  }
  function criteria(change) {
    var now = { sound: state.sound, position: state.position, shape: state.shape, stage: state.stage };
    Object.keys(change || {}).forEach(function (key) { now[key] = change[key]; });
    var asked = { count: wordsFor('long'), exclude: recordedOnly.concat(state.removed) };
    if (now.sound) { asked.targetSound = now.sound; asked.position = now.position; }
    if (now.shape) asked.shape = now.shape;
    if (now.stage) asked.stage = now.stage;
    return asked;
  }
  function pick(change) { return builder.pickWords(criteria(change), { wordlist: wordlist, core: core, dictionary: dictionary, seed: seed() }); }

  // The sounds that at least one word on offer has. The picker itself says which words are on offer.
  function soundsOnOffer() {
    var have = {};
    builder.pickWords({ count: 100000, exclude: recordedOnly }, { wordlist: wordlist, core: core, dictionary: dictionary, seed: 1 }).words.forEach(function (word) {
      var taught = dictionary.lookup(word)[0];
      if (taught) Array.prototype.forEach.call(taught, function (label) { have[label] = true; });
    });
    return have;
  }
  // The stage rows come from the builder (its table names the document behind each row).
  function stageRow(id) {
    for (var i = 0; i < stageRows.length; i++) if (stageRows[i].id === id) return stageRows[i];
    return null;
  }
  function stageName(id) { var row = stageRow(id); return String(row ? row.label : id).split(':')[0].trim(); }
  function stageDetail(id) { var row = stageRow(id); return row ? String(row.label).split(':').slice(1).join(':').trim() : ''; }
  // One short line for a stage, made from the builder's own row: a few of its example words and its limits.
  function stageLine(id) {
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
  function drawPickControls() {
    var sound = $('f-sound'), have = soundsOnOffer();
    SOUND_GROUPS.forEach(function (group) {
      var box = doc.createElement('optgroup');
      box.label = group[0];
      group[1].forEach(function (row) {
        if (!have[row[0]]) return;
        var option = el('option', '', soundName(row[0]) + ', as in ' + row[1]);
        option.value = row[0];
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
    groups.forEach(function (group) {
      var box = group.name ? doc.createElement('optgroup') : stage;
      if (group.name) box.label = group.name;
      group.rows.forEach(function (row) {
        var option = el('option', '', stageName(row.id));
        option.value = row.id;
        box.appendChild(option);
      });
      if (box !== stage) stage.appendChild(box);
    });
  }
  function syncPickControls() {
    $('f-sound').value = state.sound;
    $('f-position').value = state.position;
    $('f-position').disabled = !state.sound;
    $('f-shape').value = state.shape;
    $('f-stage').value = state.stage;
    setText('stage-hint', stageLine(state.stage));
    // One more line for the two kindergarten rows of the Common Core table, and for no other stage. Its words are in the page.
    var kindergarten = K_STAGES.indexOf(state.stage) >= 0;
    show('stage-k-note', kindergarten);
    $('f-stage').setAttribute('aria-describedby', kindergarten ? 'stage-hint stage-k-note' : 'stage-hint');
    setText('stage-why-text', stageWhy(state.stage));
    show('stage-why', !!stageWhy(state.stage));
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
      chips.textContent = '';
      setText('pick-line', 'The words could not be looked up.');
      setText('pick-sub', 'Change one choice above, or type your own words.');
      setText('pick-out', '');
      show('pick-removed', false);
      return;
    }
    var fit = picked.pool, listed = picked.words.length, wanted = wordsFor('long');
    setText('pick-line', fit === 0 ? 'No words fit these choices.' : fit < wanted ? 'Only ' + count(fit, 'word fits', 'words fit') + '.' : count(fit, 'word fits', 'words fit') + '.');
    var acts = count(state.activities.length || 1, 'activity', 'activities');
    setText('pick-sub', fit === 0 ? 'Loosen one choice to get words.' : fit < wanted ? 'A Long file with your ' + acts + ' uses up to ' + count(wanted, 'word') + '. You can go on with these, or get more by loosening one choice.'
      : fit > listed ? 'The list has ' + listed + ' of them: enough for a Long file with your ' + acts + '. Remove a word and another takes its place.'
        : 'All of them are in the list.');
    chips.textContent = '';
    picked.words.forEach(function (word) {
      var item = el('li', 'chip');
      item.appendChild(el('span', '', word));
      var remove = el('button', '', String.fromCharCode(215));
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove ' + word);
      remove.addEventListener('click', function () {
        var at = picked.words.indexOf(word);
        state.removed.push(word);
        remember();
        drawPick();
        var buttons = $('pick-chips').querySelectorAll('button');
        var next = buttons[Math.min(at, buttons.length - 1)];
        if (next) next.focus(); else $('pick-restore').focus();
      });
      item.appendChild(remove);
      chips.appendChild(item);
    });
    show('pick-removed', state.removed.length > 0);
    setText('pick-removed-text', 'You removed: ' + state.removed.join(', ') + '.');
    setText('pick-restore', state.removed.length === 1 ? 'Put it back' : 'Put them back');
    // What also matched and why it is not offered: counted, never dropped silently.
    var reasons = picked.reasons, also = [];
    var silent = reasons.noRecording + Math.max(0, reasons.excluded - state.removed.length);
    if (reasons.notFamiliarEnough) also.push(count(reasons.notFamiliarEnough, 'less common word'));
    if (silent) also.push(silent + ' with no recording yet');
    if (reasons.britishSpellingOrWord) also.push(count(reasons.britishSpellingOrWord, 'British spelling or word', 'British spellings or words'));
    if (reasons.usedOnlyWhenTyped) also.push(count(reasons.usedOnlyWhenTyped, 'word') + ' used only when you type ' + (reasons.usedOnlyWhenTyped === 1 ? 'it' : 'them'));
    if (reasons.blocked + reasons.soundsLikeABlockedWord) also.push((reasons.blocked + reasons.soundsLikeABlockedWord) + ' on the list of words this tool does not use');
    setText('pick-out', also.length ? 'Also matched, but not offered: ' + also.join(', ') + '.' : '');
    if (fit > 0 && state.mode === 'pick') setText('step-2-problem', '');
    if (step === 2) soundsNote();
    if (fit < wanted) suggestLoosening(run, fit);
  }
  // When few words fit: try each choice set to "any", one at a time, and offer the ones that give more.
  function suggestLoosening(run, fit) {
    var tries = [];
    if (state.stage) tries.push({ change: { stage: '' }, label: 'Any stage' });
    if (state.shape) tries.push({ change: { shape: '' }, label: 'Any shape' });
    if (state.sound && state.position !== 'any') tries.push({ change: { position: 'any' }, label: 'The sound anywhere in the word' });
    if (state.sound) tries.push({ change: { sound: '', position: 'any' }, label: 'Any sound' });
    var host = $('pick-loosen');
    var next = function () {
      if (run !== pickRun) return;
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

  // Each typed word, checked the way the builder will check it, with the reason in plain words.
  function checkWord(word) {
    if (wordlist.isBlocked(word)) return { word: word, ok: false, says: 'Left out. It is on the list of words this tool does not use. That list is a first pass and can be too cautious.' };
    if (!/^[a-z]+$/.test(word) || word.length < 2 || word.length > 10 || !/[aeiouy]/.test(word)) return { word: word, ok: false, says: 'Not used. A practice word is 2 to 10 letters, letters only, with a vowel.' };
    var entry = core.dictionarySounds(word);
    if (!entry) return { word: word, ok: false, says: 'Not in the sound dictionary. Check the spelling.' };
    if (!canLoad(word)) return { word: word, ok: false, says: 'No recording yet. It cannot be used in this version.' };
    // A borderline word (the [soft] part of the word list's blocklist): the picker leaves it out, a teacher may type it.
    if (wordlist.get(word).soft) return { word: word, ok: true, says: TYPED_ONLY_SAID };
    return { word: word, ok: true, says: 'Ready. ' + count(entry.sounds.length, 'sound') + ': ' + entry.sounds.map(soundName).join(', ') + '.' };
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
    list.textContent = '';
    ownRows.forEach(function (row) {
      var item = el('li', row.ok ? 'is-ok' : 'is-out');
      item.appendChild(el('span', 'w', row.word));
      item.appendChild(el('span', 's', row.says));
      list.appendChild(item);
    });
    var ready = ownRows.filter(function (row) { return row.ok; }).length;
    setText('own-line', !words.length ? 'Type or paste your words above.'
      : ready + ' of ' + count(ownRows.length, 'word') + ' can be used.' + (extra ? ' Only the first ' + MAX_TYPED + ' words are checked.' : ''));
    if (ready && state.mode === 'own') setText('step-2-problem', '');
    if (step === 2) soundsNote();
  }
  function chosenWords() {
    if (state.mode === 'own') return ownRows.filter(function (row) { return row.ok; }).map(function (row) { return row.word; });
    return picked ? picked.words.slice() : [];
  }
  function syncMode() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.checked = radio.value === state.mode;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
    show('panel-pick', state.mode === 'pick');
    show('panel-own', state.mode === 'own');
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

  // Pictures: Mulberry Symbols (CC BY-SA 4.0), kept on this site. word_sounds_symbols_en.js, loaded with the
  // page, says which words have one. The drawings are in the files it names: the same files whatever words are
  // chosen, fetched only when a file is made with the box checked. A file made without them is the same file as before.
  var symbols = null, picturesOff = false, picturesNote = '', picturesLoading = null;
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
  function drawPictures(inFile) {
    var box = $('f-pictures');
    if (!box) return;
    var words = chosenWords().slice(0, wordsFor(state.length));
    var have = symbols ? words.filter(function (word) { return symbols.has(word); }).length : 0;
    box.disabled = !have;
    box.checked = have > 0 && !picturesOff;
    box.parentNode.classList.toggle('is-on', box.checked);
    var n = inFile ? inFile.withPicture : have, of = inFile ? inFile.withPicture + inFile.withoutPicture : words.length;
    setText('pictures-line', picturesNote || (symbols ? 'Pictures for ' + n + ' of ' + count(of, 'word') + '. Symbols: Mulberry.' : 'Pictures are not available right now.'));
  }
  // Whether the file being made gets pictures: the box is checked and the drawings are here.
  function picturesFor(run) {
    var box = $('f-pictures');
    if (!symbols || !box || !box.checked) return Promise.resolve(false);
    if (!symbols.ready() && run === buildRun) making('Getting the pictures, about ' + megabytes(symbols.bytes) + ' MB.', null);
    return loadPictures().then(function (ready) { return !!ready; }, function () { return false; }).then(function (ready) {
      if (!ready) {
        picturesOff = true;
        picturesNote = 'The pictures could not be downloaded, so this file has none. Check the box to try again.';
        drawPictures();
      }
      if (run === buildRun) making('Putting the file together.', null);
      return ready;
    });
  }

  function autoTitle() {
    var what = 'mixed words';
    if (state.mode === 'own') what = 'my words';
    else if (state.sound) what = soundName(state.sound).replace(/ \(.*\)$/, '') + ' words';
    else if (state.shape) what = state.shape + ' words';
    else if (state.stage) what = stageName(state.stage);
    return 'Word Sounds: ' + what + ', version ' + state.version;
  }
  function titleNow() { return (state.titleEdited ? String(state.title || '').trim() : '') || autoTitle(); }
  function fileName(title) {
    var stem = String(title).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return (stem || 'practice') + '.html';
  }
  function drawLengths() {
    var all = chosenWords().length, acts = Math.max(1, state.activities.length), before = -1, beforeName = '';
    Object.keys(LENGTH_NAMES).forEach(function (length) {
      var words = Math.min(all, wordsFor(length)), questions = words * acts;
      var text = count(words, 'word') + ', about ' + count(questions, 'question') + ', about ' + count(Math.ceil(questions / 2), 'minute') + '.';
      if (words === before) text += ' The same as ' + beforeName + ': you have ' + count(all, 'word') + '.';
      var node = doc.querySelector('[data-length="' + length + '"]');
      if (node) node.textContent = text;
      before = words;
      beforeName = LENGTH_NAMES[length];
    });
    syncRadios('length', state.length);
    if (!state.titleEdited) $('f-title').value = autoTitle();
  }

  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    show('summary', false);
    show('try', false);
    show('save', false);
    show('after-save', false);
    show('build-problem', false);
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
  function make() {
    clearTimeout(buildTimer);
    clearBuilt();
    var run = buildRun;
    var words = chosenWords().slice(0, wordsFor(state.length));
    var activities = order.filter(function (id) { return state.activities.indexOf(id) >= 0; });
    var title = titleNow();
    if (!words.length || !activities.length) return problem('There is nothing to make yet. Choose at least one activity and one word.', 'change');
    var said = false;
    making(sounds ? 'Putting the file together.' : soundsSaved ? 'Reading the sounds saved on this device.' : 'Getting the sounds.', null);
    getSounds(function (bytes) {
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
        // The clips of this file's own words go in beside the word bank, in the shape the builder already reads.
        var withWords = {};
        Object.keys(banks).forEach(function (name) { withWords[name] = banks[name]; });
        withWords.kokoroWords = {};
        Object.keys(clips).forEach(function (word) { withWords.kokoroWords[word] = clips[word]; });
        Object.keys(banks.kokoroWords).forEach(function (word) { withWords.kokoroWords[word] = banks.kokoroWords[word]; });
        return picturesFor(run).then(function (pictures) {
          if (run !== buildRun) return null;
          return builder.buildPacket({ words: words, activities: activities, seed: seed(), title: title, core: core, dictionary: dictionary, banks: withWords, loader: loader,
            wordlist: wordlist, toWav: toWav, picked: state.mode === 'pick' ? picked : null, pictures: pictures, symbols: pictures ? symbols : null });
        });
      });
    }).then(function (result) {
      if (!result || run !== buildRun) return;
      drawResult(result, words);
    }).catch(function (error) {
      if (run !== buildRun) return;
      var text = String((error && error.message) || error || '');
      if (!sounds) problem('The sounds could not be downloaded. Check the connection, then try again. Your choices are still here.', 'retry');
      else if (error && error.wordSounds) problem(WORD_SOUNDS_FAILED, 'retry');
      else problem('The file could not be put together (' + (text || 'no reason was given') + '). Your choices are still here.', 'retry');
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
    return lines;
  }
  function drawList(id, lines) {
    var host = $(id);
    host.textContent = '';
    var list = el('ul');
    lines.forEach(function (line) { list.appendChild(el('li', '', line)); });
    host.appendChild(list);
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
    built = { html: result.html, name: fileName(manifest.title), bytes: blob.size };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    var total = manifest.items.total;
    setText('summary-facts', count(total, 'question') + '. About ' + count(Math.ceil(total / 2), 'minute') + '. ' + fileSize(built.bytes) + '.');
    setText('sum-words', count(manifest.words.used.length, 'word') + ': ' + manifest.words.used.join(', ') + '.');
    drawList('sum-activities', manifest.activities.asked.map(function (id) {
      var n = manifest.items.byActivity[id] || 0;
      return core.activityLabel(id) + ': ' + (n ? count(n, 'question') : 'none (see Left out)') + '.';
    }));
    drawList('sum-out', out.length ? out : ['Nothing. Every word is in every activity you chose.']);
    // With pictures, the line under the box now counts the words that show one in this file.
    if (manifest.pictures && manifest.pictures.symbols) drawPictures(manifest.pictures.counts);
    show('summary', true);
    if (fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl); show('try', true); }
    show('save', true);
    setText('making-said', 'The file is ready: ' + count(total, 'question') + ', ' + fileSize(built.bytes) + '.');
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
        setText('step-2-problem', state.mode === 'own' ? 'None of your words can be used yet. The note beside each word says why.' : 'No words fit yet. Loosen one choice above, or type your own words.');
      }
    }
    if (target !== 3) { clearTimeout(buildTimer); clearBuilt(); show('making', false); }
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
    doc.title = (name ? name + ': ' : '') + 'Make a practice file, step ' + step + ' of 3';
    if (step === 1) syncActivities();
    if (step === 2) { drawWords(); soundsNote(); }
    if (step === 3) { drawLengths(); makeSoon(0); }
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
    $('f-sound').addEventListener('change', function () { state.sound = this.value; if (!state.sound) state.position = 'any'; pickChanged(false); });
    $('f-position').addEventListener('change', function () { state.position = this.value; pickChanged(false); });
    $('f-shape').addEventListener('change', function () { state.shape = this.value; pickChanged(false); });
    $('f-stage').addEventListener('change', function () { state.stage = this.value; pickChanged(false); });
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
      radio.addEventListener('change', function () { if (!radio.checked) return; state.length = radio.value; remember(); syncRadios('length', state.length); makeSoon(0); });
    });
    $('f-title').addEventListener('input', function () {
      state.title = this.value;
      state.titleEdited = !!this.value.trim();
      makeSoon(700);
    });
    $('f-title').addEventListener('blur', function () { if (!state.titleEdited) this.value = autoTitle(); });
    $('f-pictures').addEventListener('change', function () { picturesOff = !this.checked; picturesNote = ''; makeSoon(0); });
    $('save').addEventListener('click', saveFile);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      state = defaults();
      picked = null;
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
    if (symbols && symbols.credit) lines.push('The pictures: ' + symbols.credit.set + ' by ' + symbols.credit.author + '. License: ' + symbols.credit.license + '. ' + symbols.credit.url);
    lines.forEach(function (line) { host.insertBefore(el('li', '', line), host.lastElementChild); });
  }

  function start() {
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

  function openPage(buildable, held) {
    heldBack = held;
    var offered = buildable.filter(function (id) { return held.indexOf(id) < 0; });
    strands = core.SKILL_STRANDS.map(function (row) {
      return { key: row.key, name: core.strandLabel(row.key), ids: core.activityIds().filter(function (id) { return offered.indexOf(id) >= 0 && core.activityStrand(id) === row.key; }) };
    }).filter(function (strand) { return strand.ids.length > 0; });
    order = [].concat.apply([], strands.map(function (strand) { return strand.ids; }));
    drawPickControls();
    state = recall();
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_csv) setText('csv-label', loader.DEFAULT_LABELS.save_csv);
    drawStrands();
    listFiles();
    listSources();
    wire();
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
