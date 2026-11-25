// AlloFlow Offline AAC & Home-Carryover Communication Board builder.
// One plain script for browser (window.AlloPacketAac) and Node (module.exports).
// Deterministic, offline-first, zero external URLs, zero DOM markup from strings,
// verifyPacket-clean (connect-src 'none', localService-only speechSynthesis declared in manifest).
(function (root) {
  'use strict';

  var GRID_LAYOUTS = [
    { id: '2x2', label: '2 x 2 (Large targets, 2 columns)', cols: 2 },
    { id: '3x3', label: '3 x 3 (9-grid, 3 columns)', cols: 3 },
    { id: '4x4', label: '4 x 4 (Core 16, 4 columns)', cols: 4 },
    { id: '5x4', label: '5 x 4 (20-grid, 5 columns)', cols: 5 },
    { id: '6x5', label: '6 x 5 (30-grid, 6 columns)', cols: 6 },
  ];

  var CATEGORIES = [
    { id: 'pronoun', label: 'Pronoun / People', keyColor: 'Yellow' },
    { id: 'verb', label: 'Verb / Action', keyColor: 'Green' },
    { id: 'noun', label: 'Noun / Thing', keyColor: 'Orange' },
    { id: 'descriptor', label: 'Describing / Feeling', keyColor: 'Blue' },
    { id: 'social', label: 'Social / Polite', keyColor: 'Pink' },
    { id: 'question', label: 'Question / Place / Other', keyColor: 'Purple' },
  ];

  var CAT_SET = Object.create(null);
  CATEGORIES.forEach(function (c) { CAT_SET[c.id] = true; });

  var GRID_MAP = Object.create(null);
  GRID_LAYOUTS.forEach(function (g) { GRID_MAP[g.id] = g.cols; });

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return v == null ? '' : String(v); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function cleanCat(v) {
    var s = str(v).trim().toLowerCase();
    if (s === 'people' || s === 'person' || s === 'pronouns') return 'pronoun';
    if (s === 'action' || s === 'verbs') return 'verb';
    if (s === 'thing' || s === 'things' || s === 'nouns') return 'noun';
    if (s === 'feeling' || s === 'feelings' || s === 'adjective' || s === 'adjectives' || s === 'describing') return 'descriptor';
    if (s === 'greeting' || s === 'polite' || s === 'interjection') return 'social';
    if (s === 'place' || s === 'other' || s === 'questions' || s === 'wh') return 'question';
    return CAT_SET[s] ? s : 'noun';
  }
  function cleanGrid(v) {
    var s = str(v).trim().toLowerCase();
    return GRID_MAP[s] ? s : '4x4';
  }
  function gridCols(layout) {
    return GRID_MAP[cleanGrid(layout)] || 4;
  }
  function slug(v) {
    var s = str(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
    return s || 'board';
  }
  function fnv1a(text) {
    var h = 2166136261, s = str(text);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
  }
  function safeJson(v) {
    return JSON.stringify(v)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  // ---------------------------------------------------------------------------
  // 5 Curated Offline AAC Starter Boards (Fitzgerald-key semantic roles)
  // ---------------------------------------------------------------------------
  var STARTERS = [
    {
      id: 'core_16_first_words',
      name: 'Core 16 First Words',
      audience: 'Early Communicators & Home',
      gridLayout: '4x4',
      summary: 'High-frequency Fitzgerald-key 4x4 Core board plus an 8-button Needs fringe tab.',
      title: 'Core 16 Communication Board',
      lang: 'en',
      folders: [
        {
          id: 'core',
          name: 'Core Words',
          kind: 'core',
          tiles: [
            { id: 'c1', label: 'I', speak: 'I', category: 'pronoun', symbol: '\uD83D\uDC64' },
            { id: 'c2', label: 'you', speak: 'you', category: 'pronoun', symbol: '\uD83D\uDC49' },
            { id: 'c3', label: 'more', speak: 'more', category: 'descriptor', symbol: '\u2795' },
            { id: 'c4', label: 'help', speak: 'help', category: 'verb', symbol: '\uD83E\uDD1D' },
            { id: 'c5', label: 'want', speak: 'want', category: 'verb', symbol: '\uD83E\uDEF4' },
            { id: 'c6', label: 'go', speak: 'go', category: 'verb', symbol: '\u27A1\uFE0F' },
            { id: 'c7', label: 'stop', speak: 'stop', category: 'verb', symbol: '\uD83D\uDED1' },
            { id: 'c8', label: 'like', speak: 'like', category: 'verb', symbol: '\u2764\uFE0F' },
            { id: 'c9', label: 'look', speak: 'look', category: 'verb', symbol: '\uD83D\uDC40' },
            { id: 'c10', label: 'eat', speak: 'eat', category: 'verb', symbol: '\uD83C\uDF4E' },
            { id: 'c11', label: 'drink', speak: 'drink', category: 'verb', symbol: '\uD83E\uDD64' },
            { id: 'c12', label: 'what', speak: 'what', category: 'question', symbol: '\u2753' },
            { id: 'c13', label: 'all done', speak: 'all done', category: 'descriptor', symbol: '\u2705' },
            { id: 'c14', label: 'yes', speak: 'yes', category: 'social', symbol: '\uD83D\uDC4D' },
            { id: 'c15', label: 'no', speak: 'no', category: 'social', symbol: '\uD83D\uDC4E' },
            { id: 'c16', label: 'please', speak: 'please', category: 'social', symbol: '\uD83D\uDE4F' },
          ],
        },
        {
          id: 'needs',
          name: 'Quick Needs',
          kind: 'fringe',
          tiles: [
            { id: 'n1', label: 'water', speak: 'water', category: 'noun', symbol: '\uD83D\uDCA7' },
            { id: 'n2', label: 'snack', speak: 'snack', category: 'noun', symbol: '\uD83E\uDD68' },
            { id: 'n3', label: 'bathroom', speak: 'bathroom', category: 'noun', symbol: '\uD83D\uDEBB' },
            { id: 'n4', label: 'break', speak: 'break', category: 'noun', symbol: '\u23F8\uFE0F' },
            { id: 'n5', label: 'play', speak: 'play', category: 'verb', symbol: '\uD83E\uDDE9' },
            { id: 'n6', label: 'book', speak: 'book', category: 'noun', symbol: '\uD83D\uDCD6' },
            { id: 'n7', label: 'music', speak: 'music', category: 'noun', symbol: '\uD83C\uDFB5' },
            { id: 'n8', label: 'wait', speak: 'wait', category: 'verb', symbol: '\u23F3' },
          ],
        },
      ],
    },
    {
      id: 'classroom_participation',
      name: 'Classroom Participation',
      audience: 'K-12 Classroom & Inclusion',
      gridLayout: '4x4',
      summary: 'Core starters plus Classroom Participation and Sensory Breaks tabs for group lessons and partner work.',
      title: 'Classroom Communication Board',
      lang: 'en',
      folders: [
        {
          id: 'core',
          name: 'Core Words',
          kind: 'core',
          tiles: [
            { id: 'cl1', label: 'I', speak: 'I', category: 'pronoun', symbol: '\uD83D\uDC64' },
            { id: 'cl2', label: 'need', speak: 'need', category: 'verb', symbol: '\uD83D\uDCE2' },
            { id: 'cl3', label: 'want', speak: 'want', category: 'verb', symbol: '\uD83E\uDEF4' },
            { id: 'cl4', label: 'understand', speak: 'understand', category: 'verb', symbol: '\uD83D\uDCA1' },
            { id: 'cl5', label: 'have', speak: 'have', category: 'verb', symbol: '\u270B' },
            { id: 'cl6', label: 'question', speak: 'a question', category: 'question', symbol: '\u2753' },
            { id: 'cl7', label: 'help', speak: 'help', category: 'verb', symbol: '\uD83E\uDD1D' },
            { id: 'cl8', label: 'more', speak: 'more', category: 'descriptor', symbol: '\u2795' },
            { id: 'cl9', label: 'ready', speak: 'ready', category: 'descriptor', symbol: '\u2705' },
            { id: 'cl10', label: 'yes', speak: 'yes', category: 'social', symbol: '\uD83D\uDC4D' },
            { id: 'cl11', label: 'no', speak: 'no', category: 'social', symbol: '\uD83D\uDC4E' },
            { id: 'cl12', label: 'thank you', speak: 'thank you', category: 'social', symbol: '\uD83D\uDE4F' },
          ],
        },
        {
          id: 'classroom',
          name: 'Classroom',
          kind: 'fringe',
          tiles: [
            { id: 'cr1', label: 'my turn', speak: 'my turn', category: 'social', symbol: '\uD83D\uDE4B' },
            { id: 'cr2', label: 'I know', speak: 'I know the answer', category: 'verb', symbol: '\uD83C\uDF1F' },
            { id: 'cr3', label: 'repeat please', speak: 'please repeat that', category: 'social', symbol: '\uD83D\uDD01' },
            { id: 'cr4', label: 'slow down', speak: 'please slow down', category: 'verb', symbol: '\uD83D\uDC22' },
            { id: 'cr5', label: 'read aloud', speak: 'read aloud', category: 'verb', symbol: '\uD83D\uDD0A' },
            { id: 'cr6', label: 'partner', speak: 'partner', category: 'noun', symbol: '\uD83D\uDC65' },
            { id: 'cr7', label: 'pencil', speak: 'pencil', category: 'noun', symbol: '\u270F\uFE0F' },
            { id: 'cr8', label: 'paper', speak: 'paper', category: 'noun', symbol: '\uD83D\uDCC4' },
            { id: 'cr9', label: 'book', speak: 'book', category: 'noun', symbol: '\uD83D\uDCD6' },
            { id: 'cr10', label: 'computer', speak: 'computer', category: 'noun', symbol: '\uD83D\uDCBB' },
            { id: 'cr11', label: 'bathroom', speak: 'I need the bathroom', category: 'noun', symbol: '\uD83D\uDEBB' },
            { id: 'cr12', label: 'finished', speak: 'I am finished', category: 'descriptor', symbol: '\uD83C\uDFC1' },
          ],
        },
        {
          id: 'breaks',
          name: 'Breaks & Support',
          kind: 'fringe',
          tiles: [
            { id: 'cb1', label: 'need a break', speak: 'I need a break', category: 'verb', symbol: '\u23F8\uFE0F' },
            { id: 'cb2', label: 'too loud', speak: 'it is too loud', category: 'descriptor', symbol: '\uD83D\uDD07' },
            { id: 'cb3', label: 'confused', speak: 'I am confused', category: 'descriptor', symbol: '\uD83E\uDD14' },
            { id: 'cb4', label: 'proud', speak: 'I feel proud', category: 'descriptor', symbol: '\uD83D\uDE0A' },
            { id: 'cb5', label: 'quiet space', speak: 'quiet space', category: 'noun', symbol: '\uD83C\uDF3F' },
            { id: 'cb6', label: 'water', speak: 'water', category: 'noun', symbol: '\uD83D\uDCA7' },
            { id: 'cb7', label: 'wait', speak: 'wait a moment', category: 'verb', symbol: '\u23F3' },
            { id: 'cb8', label: 'all done', speak: 'all done', category: 'descriptor', symbol: '\u2705' },
          ],
        },
      ],
    },
    {
      id: 'home_daily_needs',
      name: 'Home & Daily Needs',
      audience: 'Family Home Carryover',
      gridLayout: '4x4',
      summary: 'Everyday routines at home: Core words, Home & Body Needs, and Food & Drink.',
      title: 'Home & Daily Needs Board',
      lang: 'en',
      folders: [
        {
          id: 'core',
          name: 'Core Words',
          kind: 'core',
          tiles: [
            { id: 'h1', label: 'I', speak: 'I', category: 'pronoun', symbol: '\uD83D\uDC64' },
            { id: 'h2', label: 'want', speak: 'want', category: 'verb', symbol: '\uD83E\uDEF4' },
            { id: 'h3', label: 'need', speak: 'need', category: 'verb', symbol: '\uD83D\uDCE2' },
            { id: 'h4', label: 'help', speak: 'help', category: 'verb', symbol: '\uD83E\uDD1D' },
            { id: 'h5', label: 'more', speak: 'more', category: 'descriptor', symbol: '\u2795' },
            { id: 'h6', label: 'all done', speak: 'all done', category: 'descriptor', symbol: '\u2705' },
            { id: 'h7', label: 'go', speak: 'go', category: 'verb', symbol: '\u27A1\uFE0F' },
            { id: 'h8', label: 'stop', speak: 'stop', category: 'verb', symbol: '\uD83D\uDED1' },
            { id: 'h9', label: 'yes', speak: 'yes', category: 'social', symbol: '\uD83D\uDC4D' },
            { id: 'h10', label: 'no', speak: 'no', category: 'social', symbol: '\uD83D\uDC4E' },
            { id: 'h11', label: 'please', speak: 'please', category: 'social', symbol: '\uD83D\uDE4F' },
            { id: 'h12', label: 'thank you', speak: 'thank you', category: 'social', symbol: '\uD83D\uDC9B' },
          ],
        },
        {
          id: 'home',
          name: 'Home & Needs',
          kind: 'fringe',
          tiles: [
            { id: 'hn1', label: 'bathroom', speak: 'bathroom', category: 'noun', symbol: '\uD83D\uDEBB' },
            { id: 'hn2', label: 'hungry', speak: 'hungry', category: 'descriptor', symbol: '\uD83C\uDF7D\uFE0F' },
            { id: 'hn3', label: 'thirsty', speak: 'thirsty', category: 'descriptor', symbol: '\uD83E\uDD64' },
            { id: 'hn4', label: 'tired', speak: 'tired', category: 'descriptor', symbol: '\uD83D\uDE34' },
            { id: 'hn5', label: 'hurt', speak: 'something hurts', category: 'descriptor', symbol: '\uD83E\uDE79' },
            { id: 'hn6', label: 'cold', speak: 'cold', category: 'descriptor', symbol: '\u2744\uFE0F' },
            { id: 'hn7', label: 'hot', speak: 'hot', category: 'descriptor', symbol: '\u2600\uFE0F' },
            { id: 'hn8', label: 'bed', speak: 'bed', category: 'noun', symbol: '\uD83D\uDECF\uFE0F' },
            { id: 'hn9', label: 'outside', speak: 'outside', category: 'question', symbol: '\uD83C\uDF33' },
            { id: 'hn10', label: 'play', speak: 'play', category: 'verb', symbol: '\uD83E\uDDE9' },
            { id: 'hn11', label: 'music', speak: 'music', category: 'noun', symbol: '\uD83C\uDFB5' },
            { id: 'hn12', label: 'hug', speak: 'a hug', category: 'noun', symbol: '\uD83E\uDEC2' },
          ],
        },
        {
          id: 'food',
          name: 'Food & Drink',
          kind: 'fringe',
          tiles: [
            { id: 'fd1', label: 'water', speak: 'water', category: 'noun', symbol: '\uD83D\uDCA7' },
            { id: 'fd2', label: 'milk', speak: 'milk', category: 'noun', symbol: '\uD83E\uDD5B' },
            { id: 'fd3', label: 'juice', speak: 'juice', category: 'noun', symbol: '\uD83E\uDDC3' },
            { id: 'fd4', label: 'snack', speak: 'snack', category: 'noun', symbol: '\uD83E\uDD68' },
            { id: 'fd5', label: 'fruit', speak: 'fruit', category: 'noun', symbol: '\uD83C\uDF4E' },
            { id: 'fd6', label: 'bread', speak: 'bread', category: 'noun', symbol: '\uD83C\uDF5E' },
            { id: 'fd7', label: 'eat', speak: 'eat', category: 'verb', symbol: '\uD83C\uDF74' },
            { id: 'fd8', label: 'different', speak: 'something different', category: 'descriptor', symbol: '\uD83D\uDD04' },
          ],
        },
      ],
    },
    {
      id: 'feelings_sensory_breaks',
      name: 'Feelings & Sensory Breaks',
      audience: 'Self-Regulation & Large 3x3 Grid',
      gridLayout: '3x3',
      summary: 'Large 3x3 targets for naming feelings, requesting sensory tools, and building calm I-statements.',
      title: 'Feelings & Sensory Board',
      lang: 'en',
      folders: [
        {
          id: 'feelings',
          name: 'Feelings',
          kind: 'fringe',
          tiles: [
            { id: 'fl1', label: 'happy', speak: 'happy', category: 'descriptor', symbol: '\uD83D\uDE0A' },
            { id: 'fl2', label: 'calm', speak: 'calm', category: 'descriptor', symbol: '\uD83D\uDE0C' },
            { id: 'fl3', label: 'tired', speak: 'tired', category: 'descriptor', symbol: '\uD83D\uDE34' },
            { id: 'fl4', label: 'frustrated', speak: 'frustrated', category: 'descriptor', symbol: '\uD83D\uDE23' },
            { id: 'fl5', label: 'worried', speak: 'worried', category: 'descriptor', symbol: '\uD83D\uDE1F' },
            { id: 'fl6', label: 'sad', speak: 'sad', category: 'descriptor', symbol: '\uD83D\uDE22' },
            { id: 'fl7', label: 'overwhelmed', speak: 'overwhelmed', category: 'descriptor', symbol: '\uD83C\uDF0A' },
            { id: 'fl8', label: 'excited', speak: 'excited', category: 'descriptor', symbol: '\u2728' },
            { id: 'fl9', label: 'ready', speak: 'ready', category: 'descriptor', symbol: '\u2705' },
          ],
        },
        {
          id: 'sensory',
          name: 'Sensory & Breaks',
          kind: 'fringe',
          tiles: [
            { id: 'sn1', label: 'need a break', speak: 'I need a break', category: 'verb', symbol: '\u23F8\uFE0F' },
            { id: 'sn2', label: 'too loud', speak: 'it is too loud', category: 'descriptor', symbol: '\uD83D\uDD07' },
            { id: 'sn3', label: 'too bright', speak: 'it is too bright', category: 'descriptor', symbol: '\uD83D\uDD06' },
            { id: 'sn4', label: 'headphones', speak: 'headphones', category: 'noun', symbol: '\uD83C\uDFA7' },
            { id: 'sn5', label: 'deep breath', speak: 'take a deep breath', category: 'verb', symbol: '\uD83C\uDF2C\uFE0F' },
            { id: 'sn6', label: 'quiet space', speak: 'quiet space', category: 'noun', symbol: '\uD83C\uDF3F' },
            { id: 'sn7', label: 'walk', speak: 'take a walk', category: 'verb', symbol: '\uD83D\uDEB6' },
            { id: 'sn8', label: 'water', speak: 'drink of water', category: 'noun', symbol: '\uD83D\uDCA7' },
            { id: 'sn9', label: 'back to work', speak: 'ready to come back', category: 'verb', symbol: '\uD83D\uDD04' },
          ],
        },
        {
          id: 'core',
          name: 'Core Starters',
          kind: 'core',
          tiles: [
            { id: 'fc1', label: 'I', speak: 'I', category: 'pronoun', symbol: '\uD83D\uDC64' },
            { id: 'fc2', label: 'feel', speak: 'feel', category: 'verb', symbol: '\uD83D\uDC99' },
            { id: 'fc3', label: 'need', speak: 'need', category: 'verb', symbol: '\uD83D\uDCE2' },
            { id: 'fc4', label: 'want', speak: 'want', category: 'verb', symbol: '\uD83E\uDEF4' },
            { id: 'fc5', label: 'help', speak: 'help', category: 'verb', symbol: '\uD83E\uDD1D' },
            { id: 'fc6', label: 'stop', speak: 'stop', category: 'verb', symbol: '\uD83D\uDED1' },
            { id: 'fc7', label: 'wait', speak: 'wait', category: 'verb', symbol: '\u23F3' },
            { id: 'fc8', label: 'please', speak: 'please', category: 'social', symbol: '\uD83D\uDE4F' },
            { id: 'fc9', label: 'thank you', speak: 'thank you', category: 'social', symbol: '\uD83D\uDC9B' },
          ],
        },
      ],
    },
    {
      id: 'bilingual_core_en_es',
      name: 'Bilingual Core (EN / ES)',
      audience: 'Bilingual Home-School Carryover',
      gridLayout: '4x4',
      summary: 'Parallel English and Spanish core tabs with identical motor-plan positions and Spanish family directions.',
      title: 'Bilingual Core Board (EN / ES)',
      lang: 'en',
      defaultHomeLanguages: ['es'],
      folders: [
        {
          id: 'core_en',
          name: 'English Core',
          kind: 'core',
          lang: 'en',
          tiles: [
            { id: 'be1', label: 'I', speak: 'I', category: 'pronoun', symbol: '\uD83D\uDC64', lang: 'en' },
            { id: 'be2', label: 'want', speak: 'want', category: 'verb', symbol: '\uD83E\uDEF4', lang: 'en' },
            { id: 'be3', label: 'more', speak: 'more', category: 'descriptor', symbol: '\u2795', lang: 'en' },
            { id: 'be4', label: 'help', speak: 'help', category: 'verb', symbol: '\uD83E\uDD1D', lang: 'en' },
            { id: 'be5', label: 'go', speak: 'go', category: 'verb', symbol: '\u27A1\uFE0F', lang: 'en' },
            { id: 'be6', label: 'stop', speak: 'stop', category: 'verb', symbol: '\uD83D\uDED1', lang: 'en' },
            { id: 'be7', label: 'eat', speak: 'eat', category: 'verb', symbol: '\uD83C\uDF4E', lang: 'en' },
            { id: 'be8', label: 'drink', speak: 'drink', category: 'verb', symbol: '\uD83E\uDD64', lang: 'en' },
            { id: 'be9', label: 'bathroom', speak: 'bathroom', category: 'noun', symbol: '\uD83D\uDEBB', lang: 'en' },
            { id: 'be10', label: 'break', speak: 'break', category: 'noun', symbol: '\u23F8\uFE0F', lang: 'en' },
            { id: 'be11', label: 'yes', speak: 'yes', category: 'social', symbol: '\uD83D\uDC4D', lang: 'en' },
            { id: 'be12', label: 'please', speak: 'please', category: 'social', symbol: '\uD83D\uDE4F', lang: 'en' },
          ],
        },
        {
          id: 'core_es',
          name: 'Espa\u00f1ol Core',
          kind: 'core',
          lang: 'es',
          tiles: [
            { id: 'bs1', label: 'yo', speak: 'yo', category: 'pronoun', symbol: '\uD83D\uDC64', lang: 'es' },
            { id: 'bs2', label: 'quiero', speak: 'quiero', category: 'verb', symbol: '\uD83E\uDEF4', lang: 'es' },
            { id: 'bs3', label: 'm\u00e1s', speak: 'm\u00e1s', category: 'descriptor', symbol: '\u2795', lang: 'es' },
            { id: 'bs4', label: 'ayuda', speak: 'ayuda', category: 'verb', symbol: '\uD83E\uDD1D', lang: 'es' },
            { id: 'bs5', label: 'ir', speak: 'ir', category: 'verb', symbol: '\u27A1\uFE0F', lang: 'es' },
            { id: 'bs6', label: 'parar', speak: 'parar', category: 'verb', symbol: '\uD83D\uDED1', lang: 'es' },
            { id: 'bs7', label: 'comer', speak: 'comer', category: 'verb', symbol: '\uD83C\uDF4E', lang: 'es' },
            { id: 'bs8', label: 'beber', speak: 'beber', category: 'verb', symbol: '\uD83E\uDD64', lang: 'es' },
            { id: 'bs9', label: 'ba\u00f1o', speak: 'ba\u00f1o', category: 'noun', symbol: '\uD83D\uDEBB', lang: 'es' },
            { id: 'bs10', label: 'descanso', speak: 'descanso', category: 'noun', symbol: '\u23F8\uFE0F', lang: 'es' },
            { id: 'bs11', label: 's\u00ed', speak: 's\u00ed', category: 'social', symbol: '\uD83D\uDC4D', lang: 'es' },
            { id: 'bs12', label: 'por favor', speak: 'por favor', category: 'social', symbol: '\uD83D\uDE4F', lang: 'es' },
          ],
        },
      ],
    },
  ];

  function cloneFolder(f, fi) {
    var folderId = slug(f && f.id ? f.id : (f && f.name) || ('tab-' + (fi + 1)));
    var tiles = (Array.isArray(f && f.tiles) ? f.tiles : []).slice(0, 48).map(function (t, ti) {
      var label = str(t && t.label).trim().slice(0, 40);
      if (!label) return null;
      var speak = str(t && t.speak).trim().slice(0, 120) || label;
      var out = {
        id: str(t && t.id).trim().slice(0, 40) || (folderId + '-' + (ti + 1)),
        label: label,
        speak: speak,
        category: cleanCat(t && t.category),
        symbol: str(t && t.symbol).trim().slice(0, 12),
        lang: str(t && t.lang || (f && f.lang) || '').trim().slice(0, 12),
      };
      if (t && typeof t.imageId === 'string' && t.imageId.trim()) out.imageId = t.imageId.trim().slice(0, 60);
      if (t && typeof t.audioId === 'string' && t.audioId.trim()) out.audioId = t.audioId.trim().slice(0, 60);
      return out;
    }).filter(Boolean);
    return {
      id: folderId,
      name: str(f && f.name).trim().slice(0, 40) || ('Board ' + (fi + 1)),
      kind: f && f.kind === 'core' ? 'core' : 'fringe',
      lang: str(f && f.lang).trim().slice(0, 12),
      tiles: tiles,
    };
  }

  function normalizeFolders(rawFolders) {
    var src = Array.isArray(rawFolders) ? rawFolders : [];
    var seen = Object.create(null);
    var out = src.slice(0, 8).map(function (f, fi) {
      var cl = cloneFolder(f, fi);
      var base = cl.id, n = 2;
      while (seen[cl.id]) cl.id = base + '-' + (n++);
      seen[cl.id] = true;
      return cl;
    }).filter(function (f) { return f.tiles.length > 0; });
    return out;
  }

  function starters() {
    return STARTERS.map(function (s) {
      return {
        id: s.id,
        name: s.name,
        audience: s.audience,
        gridLayout: s.gridLayout,
        summary: s.summary,
        title: s.title,
        lang: s.lang || 'en',
        defaultHomeLanguages: Array.isArray(s.defaultHomeLanguages) ? s.defaultHomeLanguages.slice() : [],
        folders: normalizeFolders(s.folders),
      };
    });
  }

  function starterById(id) {
    var want = str(id).trim();
    for (var i = 0; i < STARTERS.length; i++) {
      if (STARTERS[i].id === want) return starters()[i];
    }
    return starters()[0];
  }

  function validateMediaDataUri(uri, kind) {
    var s = str(uri).trim();
    if (!s) return '';
    if (kind === 'image') {
      if (!/^data:image\/(?:png|jpeg|jpg|webp|gif)(?:;[a-z0-9._+-]+(?:=[^;,\s]+)?)*;base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return '';
      if (s.length > 600000) return '';
      return s;
    }
    if (kind === 'audio') {
      if (!/^data:audio\/(?:mpeg|mp3|wav|x-wav|ogg|webm|mp4|aac|m4a)(?:;[a-z0-9._+-]+(?:=[^;,\s]+)?)*;base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return '';
      if (s.length > 1500000) return '';
      return s;
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Self-Contained Student Adapter: aac_board (ZERO outer closures!)
  // ---------------------------------------------------------------------------
  function renderAacBoard(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var root = ctx.root;
    var win = typeof window !== 'undefined' ? window : null;
    var doc = root && root.ownerDocument ? root.ownerDocument : (typeof document !== 'undefined' ? document : null);
    var syn = win && win.speechSynthesis ? win.speechSynthesis : null;

    var folders = Array.isArray(item.folders) && item.folders.length ? item.folders : [{ id: 'core', name: 'Core Words', kind: 'core', tiles: [] }];
    var cols = Math.max(2, Math.min(6, Number(item.cols) || 4));
    var boardLang = String(item.lang || 'en').toLowerCase();

    var activeFolderIdx = 0;
    var strip = [];
    var speakOnTap = item.speakOnTap !== false;
    var muted = false;
    var voiceRate = Number(item.defaultRate) > 0 ? Number(item.defaultRate) : 1;
    var coreTaps = 0;
    var fringeTaps = 0;
    var messagesSpoken = 0;
    var recentMessages = [];
    var speakGen = 0;
    var disposed = false;

    // --- Local-only speechSynthesis engine (strictly localService === true) ---
    var getLocalVoices = function () {
      if (!syn || typeof syn.getVoices !== 'function') return [];
      var list = [];
      try { list = syn.getVoices() || []; } catch (_) { list = []; }
      return list.filter(function (v) { return v && v.localService === true; });
    };
    var pickLocalVoice = function (langCode) {
      var locals = getLocalVoices();
      if (!locals.length) return null;
      var want = String(langCode || boardLang || 'en').toLowerCase().split('-')[0];
      for (var i = 0; i < locals.length; i++) {
        var vl = String(locals[i].lang || '').toLowerCase().replace('_', '-');
        if (vl === want || vl.indexOf(want + '-') === 0) return locals[i];
      }
      var baseWant = boardLang.split('-')[0] || 'en';
      for (var j = 0; j < locals.length; j++) {
        var bl = String(locals[j].lang || '').toLowerCase().replace('_', '-');
        if (bl === baseWant || bl.indexOf(baseWant + '-') === 0) return locals[j];
      }
      return locals[0] || null;
    };
    var stopSpeech = function () {
      speakGen++;
      try { if (syn && typeof syn.cancel === 'function') syn.cancel(); } catch (_) {}
      try { if (typeof ctx.stop === 'function') ctx.stop(); } catch (_) {}
    };
    var effectiveRate = function () {
      var toolSpeed = typeof ctx.speedRate === 'function' ? Number(ctx.speedRate()) || 1 : 1;
      return Math.max(0.5, Math.min(2, Math.round(voiceRate * toolSpeed * 100) / 100));
    };
    var speakText = function (text, langCode) {
      var phrase = String(text || '').trim();
      if (!phrase || muted) return false;
      var voice = pickLocalVoice(langCode);
      if (!syn || !voice || !win || typeof win.SpeechSynthesisUtterance !== 'function') {
        updateVoiceBanner();
        return false;
      }
      stopSpeech();
      speakGen++;
      var u = new win.SpeechSynthesisUtterance(phrase);
      u.voice = voice;
      u.lang = voice.lang || langCode || boardLang || 'en';
      u.rate = effectiveRate();
      try {
        syn.speak(u);
        return true;
      } catch (_) {
        return false;
      }
    };

    var hasAnyEmbeddedAudio = folders.some(function (f) {
      return Array.isArray(f.tiles) && f.tiles.some(function (t) { return !!t.audioId; });
    });

    // --- UI Containers ---
    var voiceBanner = el('p', { class: 'aac-banner', role: 'status', 'aria-live': 'polite', 'data-aac-voice-banner': '' });
    var updateVoiceBanner = function () {
      if (muted) {
        voiceBanner.hidden = false;
        voiceBanner.className = 'aac-banner is-warn';
        voiceBanner.textContent = L.aac_muted_banner || 'Speech is muted. Tap Unmute speech to hear words aloud.';
        return;
      }
      var hasLocal = !!pickLocalVoice(boardLang);
      if (!hasLocal && !hasAnyEmbeddedAudio) {
        voiceBanner.hidden = false;
        voiceBanner.className = 'aac-banner is-warn';
        voiceBanner.textContent = L.aac_no_voice_banner || 'No built-in device voice is available in this browser. Buttons still build visible sentences on screen.';
      } else if (!hasLocal && hasAnyEmbeddedAudio) {
        voiceBanner.hidden = false;
        voiceBanner.className = 'aac-banner is-info';
        voiceBanner.textContent = L.aac_clips_only_banner || 'Recorded teacher clips will play on this device. No extra device speech voice was detected.';
      } else {
        voiceBanner.hidden = true;
        voiceBanner.className = 'aac-banner';
        voiceBanner.textContent = '';
      }
    };

    var onVoicesChanged = function () { if (!disposed) updateVoiceBanner(); };
    if (syn && typeof syn.addEventListener === 'function') {
      try { syn.addEventListener('voiceschanged', onVoicesChanged); } catch (_) {}
    }

    // --- Sentence Strip ---
    var stripWrap = el('section', { class: 'aac-strip-wrap', 'aria-label': L.aac_strip_label || 'Message sentence strip' });
    var stripBox = el('div', { class: 'aac-strip', 'data-aac-strip': '', role: 'region', 'aria-label': L.aac_strip_words || 'Selected words', 'aria-live': 'polite' });
    var stripActions = el('div', { class: 'aac-strip-actions' });

    var speakSentence = function () {
      if (!strip.length) {
        ctx.announce(L.aac_empty_strip || 'Add words to the message strip first.');
        return;
      }
      var sentence = strip.map(function (tok) { return tok.speak || tok.label; }).join(' ');
      messagesSpoken++;
      if (ctx.support) ctx.support('aac_sentence_spoken');
      recentMessages.unshift(sentence);
      if (recentMessages.length > 5) recentMessages.pop();
      paintStats();

      var allClips = !muted && strip.every(function (tok) { return !!tok.audioId; });
      var someClips = !muted ? strip.map(function (tok) { return tok.audioId; }).filter(Boolean) : [];
      var firstLang = strip[0] && strip[0].lang ? strip[0].lang : boardLang;
      if (allClips && typeof ctx.playAll === 'function') {
        if (ctx.support) ctx.support('aac_audio_clip');
        try { ctx.playAll(someClips); } catch (_) {}
      } else if (!speakText(sentence, firstLang) && someClips.length && typeof ctx.playAll === 'function') {
        if (ctx.support) ctx.support('aac_audio_clip');
        try { ctx.playAll(someClips); } catch (_) {}
      }
      ctx.announce((L.aac_spoken_prefix || 'Message: ') + sentence);
    };

    var speakBtn = el('button', {
      type: 'button',
      class: 'primary aac-action-btn',
      'data-aac-speak': '',
      on: { click: speakSentence },
      text: L.aac_speak_sentence || 'Speak sentence',
    });
    var backBtn = el('button', {
      type: 'button',
      class: 'aac-action-btn',
      'data-aac-backspace': '',
      on: {
        click: function () {
          if (!strip.length) return;
          var removed = strip.pop();
          paintStrip();
          ctx.announce((L.aac_removed_prefix || 'Removed ') + (removed ? removed.label : 'word') + '.');
        },
      },
      text: L.aac_backspace || 'Backspace',
    });
    var clearBtn = el('button', {
      type: 'button',
      class: 'aac-action-btn',
      'data-aac-clear': '',
      on: {
        click: function () {
          if (!strip.length) return;
          strip = [];
          stopSpeech();
          paintStrip();
          ctx.announce(L.aac_cleared || 'Message cleared.');
        },
      },
      text: L.aac_clear || 'Clear',
    });

    stripActions.appendChild(speakBtn);
    stripActions.appendChild(backBtn);
    stripActions.appendChild(clearBtn);
    stripWrap.appendChild(stripBox);
    stripWrap.appendChild(stripActions);

    var paintStrip = function () {
      stripBox.textContent = '';
      if (!strip.length) {
        stripBox.appendChild(el('span', { class: 'aac-strip-empty', text: L.aac_strip_empty || 'Tap words below to build a message.' }));
      } else {
        strip.forEach(function (tok, ti) {
          var chip = el('button', {
            type: 'button',
            class: 'aac-chip aac-cat-' + (tok.category || 'noun'),
            'data-aac-chip': String(ti),
            'aria-label': (L.aac_chip_speak || 'Speak word: ') + tok.label,
            on: {
              click: function () {
                if (tok.audioId && !muted && typeof ctx.play === 'function') {
                  if (ctx.support) ctx.support('aac_audio_clip');
                  ctx.play(tok.audioId);
                } else {
                  speakText(tok.speak || tok.label, tok.lang || boardLang);
                }
              },
            },
          });
          if (tok.symbol) chip.appendChild(el('span', { class: 'aac-chip-sym', 'aria-hidden': 'true', text: tok.symbol }));
          chip.appendChild(el('span', { text: tok.label }));
          stripBox.appendChild(chip);
        });
      }
      speakBtn.disabled = strip.length === 0;
      backBtn.disabled = strip.length === 0;
      clearBtn.disabled = strip.length === 0;
    };

    // --- Voice & Accessibility Controls Bar ---
    var ctrlBar = el('div', { class: 'aac-ctrl-bar', role: 'region', 'aria-label': L.aac_controls_label || 'Voice and switch scanning controls' });

    var tapSpeakBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      'data-aac-speak-tap': '',
      'aria-pressed': speakOnTap ? 'true' : 'false',
      on: {
        click: function () {
          speakOnTap = !speakOnTap;
          tapSpeakBtn.setAttribute('aria-pressed', speakOnTap ? 'true' : 'false');
          tapSpeakBtn.textContent = speakOnTap ? (L.aac_tap_speak_on || 'Speak on tap: On') : (L.aac_tap_speak_off || 'Speak on tap: Off');
        },
      },
      text: speakOnTap ? (L.aac_tap_speak_on || 'Speak on tap: On') : (L.aac_tap_speak_off || 'Speak on tap: Off'),
    });

    var muteBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      'data-aac-mute': '',
      'aria-pressed': 'false',
      on: {
        click: function () {
          muted = !muted;
          if (muted) stopSpeech();
          muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
          muteBtn.textContent = muted ? (L.aac_unmute || 'Unmute speech') : (L.aac_mute || 'Mute speech');
          updateVoiceBanner();
        },
      },
      text: L.aac_mute || 'Mute speech',
    });

    var rateId = 'aac-rate-' + String(item.id || 'b').replace(/[^a-z0-9_-]+/gi, '_');
    var rateSel = el('select', {
      id: rateId,
      class: 'aac-select',
      'data-aac-rate': '',
      on: {
        change: function () {
          voiceRate = Number(rateSel.value) || 1;
          ctx.announce('Voice speed set to ' + voiceRate + 'x.');
        },
      },
    }, [
      el('option', { value: '0.7', text: '0.7x (Slower)' }),
      el('option', { value: '0.85', text: '0.85x (Gentle)' }),
      el('option', { value: '1', text: '1.0x (Normal)' }),
      el('option', { value: '1.15', text: '1.15x (Faster)' }),
    ]);
    rateSel.value = String(voiceRate);

    // --- Row-Column Switch Scanning Engine (Auto-Scan & Two-Switch Step-Scan) ---
    var scan = {
      active: false,
      paused: false,
      mode: item.defaultScanMode === 'two_switch' ? 'two_switch' : 'auto',
      intervalMs: Math.max(600, Math.min(5000, Number(item.defaultScanMs) || 1500)),
      phase: 'row',
      rowIdx: 0,
      colIdx: 0,
      colPasses: 0,
      timer: 0,
    };

    var clearScanTimer = function () {
      if (scan.timer && win && win.clearInterval) {
        win.clearInterval(scan.timer);
      }
      scan.timer = 0;
    };

    var gridButtons = [];
    var currentRowCount = function () {
      return Math.max(1, Math.ceil(gridButtons.length / cols));
    };
    var rowIndices = function (r) {
      var out = [];
      var start = r * cols;
      for (var c = 0; c < cols && start + c < gridButtons.length; c++) out.push(start + c);
      return out;
    };

    var paintScan = function () {
      gridButtons.forEach(function (b) {
        b.classList.remove('is-scan-row', 'is-scan-cell');
        b.removeAttribute('data-scan-current');
      });
      if (!scan.active || !gridButtons.length) return;
      var indices = rowIndices(scan.rowIdx);
      if (!indices.length) { scan.rowIdx = 0; indices = rowIndices(0); }
      indices.forEach(function (idx) { gridButtons[idx].classList.add('is-scan-row'); });
      if (scan.phase === 'cell') {
        var ci = Math.min(scan.colIdx, indices.length - 1);
        var btn = gridButtons[indices[ci]];
        if (btn) {
          btn.classList.add('is-scan-cell');
          btn.setAttribute('data-scan-current', 'cell');
        }
      } else if (indices.length) {
        gridButtons[indices[0]].setAttribute('data-scan-current', 'row');
      }
    };

    var announceScanState = function () {
      if (!scan.active || !gridButtons.length) return;
      var folder = folders[activeFolderIdx] || folders[0];
      var tiles = folder.tiles || [];
      var indices = rowIndices(scan.rowIdx);
      if (scan.phase === 'row') {
        var names = indices.map(function (i) { return tiles[i] ? tiles[i].label : ''; }).filter(Boolean).join(', ');
        ctx.announce('Row ' + (scan.rowIdx + 1) + ': ' + names);
      } else {
        var ci = Math.min(scan.colIdx, indices.length - 1);
        var t = tiles[indices[ci]];
        if (t) ctx.announce('Button: ' + t.label);
      }
    };

    var scanAdvance = function () {
      if (!scan.active || scan.paused || !gridButtons.length) return;
      var rCount = currentRowCount();
      if (scan.phase === 'row') {
        scan.rowIdx = (scan.rowIdx + 1) % rCount;
      } else {
        var indices = rowIndices(scan.rowIdx);
        scan.colIdx++;
        if (scan.colIdx >= indices.length) {
          scan.colIdx = 0;
          scan.colPasses++;
          if (scan.mode === 'auto' && scan.colPasses >= 2) {
            scan.phase = 'row';
            scan.colPasses = 0;
            scan.rowIdx = (scan.rowIdx + 1) % rCount;
          }
        }
      }
      paintScan();
      announceScanState();
    };

    var scheduleAutoScan = function () {
      clearScanTimer();
      if (scan.active && !scan.paused && scan.mode === 'auto' && win && win.setInterval) {
        scan.timer = win.setInterval(scanAdvance, scan.intervalMs);
      }
    };

    var activateTile = function (tile, folderKind) {
      if (!tile) return;
      if (folderKind === 'core') {
        coreTaps++;
        if (ctx.support) ctx.support('aac_core_tap');
      } else {
        fringeTaps++;
        if (ctx.support) ctx.support('aac_fringe_tap');
      }
      strip.push({
        id: tile.id,
        label: tile.label,
        speak: tile.speak || tile.label,
        category: tile.category || 'noun',
        symbol: tile.symbol || '',
        lang: tile.lang || boardLang,
        audioId: tile.audioId || '',
      });
      paintStrip();
      paintStats();
      if (speakOnTap && !muted) {
        if (tile.audioId && typeof ctx.play === 'function') {
          if (ctx.support) ctx.support('aac_audio_clip');
          try { ctx.play(tile.audioId); } catch (_) {}
        } else {
          speakText(tile.speak || tile.label, tile.lang || boardLang);
        }
      }
      ctx.announce('Added ' + tile.label + ' to message.');
    };

    var scanSelect = function () {
      if (!scan.active || !gridButtons.length) return;
      if (scan.paused) {
        scan.paused = false;
        syncScanControls();
        scheduleAutoScan();
      }
      if (scan.phase === 'row') {
        scan.phase = 'cell';
        scan.colIdx = 0;
        scan.colPasses = 0;
        paintScan();
        announceScanState();
        scheduleAutoScan();
      } else {
        var indices = rowIndices(scan.rowIdx);
        var ci = Math.min(scan.colIdx, indices.length - 1);
        var idx = indices[ci];
        var folder = folders[activeFolderIdx] || folders[0];
        var tile = folder.tiles && folder.tiles[idx];
        if (tile) activateTile(tile, folder.kind);
        scan.phase = 'row';
        scan.colIdx = 0;
        scan.colPasses = 0;
        paintScan();
        scheduleAutoScan();
      }
    };

    var scanToggleBtn = null;
    var scanPauseBtn = null;
    var scanSelectBtn = null;
    var scanNextBtn = null;
    var scanModeSel = null;
    var scanIntervalSel = null;
    var scanStatusLine = el('p', { class: 'aac-scan-status', hidden: true, 'data-aac-scan-status': '' });

    var onScanKey = function (ev) {
      if (!scan.active) return;
      if (ev.key === 'Escape' || ev.key === 'Esc') {
        ev.preventDefault();
        ev.stopPropagation();
        stopScan(true);
        return;
      }
      var tgt = ev.target;
      var isGridTile = !!(tgt && tgt.closest && tgt.closest('[data-aac-tile]'));
      var isScanSelect = !!(tgt && (tgt === scanSelectBtn || (tgt.closest && tgt.closest('[data-aac-scan-select]'))));
      var isOtherCtrl = !!(tgt && !isGridTile && !isScanSelect
        && ((tgt.closest && tgt.closest('button,a,summary,select,input,textarea,[role="tab"]'))
          || /^(?:BUTTON|A|SUMMARY|SELECT|INPUT|TEXTAREA)$/.test(tgt.tagName || '')));
      if (isOtherCtrl) return;
      if (ev.key === ' ' || ev.key === 'Spacebar' || ev.key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        scanSelect();
      } else if (scan.mode === 'two_switch' && (ev.key === 'ArrowRight' || ev.key === 'ArrowDown')) {
        ev.preventDefault();
        ev.stopPropagation();
        scanAdvance();
      }
    };

    var syncScanControls = function () {
      if (scanToggleBtn) {
        scanToggleBtn.setAttribute('aria-pressed', scan.active ? 'true' : 'false');
        scanToggleBtn.textContent = scan.active ? (L.aac_scan_stop || 'Stop switch scan') : (L.aac_scan_start || 'Start switch scan');
      }
      if (scanPauseBtn) {
        scanPauseBtn.hidden = !scan.active || scan.mode !== 'auto';
        scanPauseBtn.setAttribute('aria-pressed', scan.paused ? 'true' : 'false');
        scanPauseBtn.textContent = scan.paused ? (L.aac_scan_resume || 'Resume scan') : (L.aac_scan_pause || 'Pause scan');
      }
      if (scanSelectBtn) scanSelectBtn.hidden = !scan.active;
      if (scanNextBtn) scanNextBtn.hidden = !scan.active || scan.mode !== 'two_switch';
      if (scanStatusLine) {
        scanStatusLine.hidden = !scan.active;
        scanStatusLine.textContent = scan.mode === 'auto'
          ? (scan.paused ? 'Auto-scan paused. Press Resume scan or Select (Space/Enter).' : 'Row-column auto-scan active: press Space or Enter to select highlighted row, then button. Esc stops.')
          : 'Two-switch step-scan active: press Next (ArrowRight/Down) to move, and Select (Space/Enter) to choose. Esc stops.';
      }
    };

    var startScan = function () {
      if (scan.active) return;
      scan.active = true;
      scan.paused = false;
      scan.phase = 'row';
      scan.rowIdx = 0;
      scan.colIdx = 0;
      scan.colPasses = 0;
      if (ctx.support) ctx.support('aac_scan_used');
      if (doc) doc.addEventListener('keydown', onScanKey, true);
      syncScanControls();
      paintScan();
      announceScanState();
      scheduleAutoScan();
      if (scanSelectBtn && typeof scanSelectBtn.focus === 'function') scanSelectBtn.focus();
    };

    var stopScan = function (restoreFocus) {
      if (!scan.active) return;
      scan.active = false;
      scan.paused = false;
      clearScanTimer();
      if (doc) doc.removeEventListener('keydown', onScanKey, true);
      syncScanControls();
      paintScan();
      ctx.announce('Switch scanning stopped.');
      if (restoreFocus && scanToggleBtn && typeof scanToggleBtn.focus === 'function') scanToggleBtn.focus();
    };

    scanToggleBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      'data-aac-scan-toggle': '',
      'aria-pressed': 'false',
      on: { click: function () { if (scan.active) stopScan(false); else startScan(); } },
      text: L.aac_scan_start || 'Start switch scan',
    });

    var scanModeId = 'aac-scan-mode-' + String(item.id || 'b').replace(/[^a-z0-9_-]+/gi, '_');
    scanModeSel = el('select', {
      id: scanModeId,
      class: 'aac-select',
      'data-aac-scan-mode': '',
      on: {
        change: function () {
          scan.mode = scanModeSel.value === 'two_switch' ? 'two_switch' : 'auto';
          if (scan.active) {
            scan.paused = false;
            scan.phase = 'row';
            scan.colIdx = 0;
            syncScanControls();
            paintScan();
            scheduleAutoScan();
          }
        },
      },
    }, [
      el('option', { value: 'auto', text: 'Auto-scan (1 switch)' }),
      el('option', { value: 'two_switch', text: 'Step-scan (2 switches)' }),
    ]);
    scanModeSel.value = scan.mode;

    var scanIntId = 'aac-scan-int-' + String(item.id || 'b').replace(/[^a-z0-9_-]+/gi, '_');
    scanIntervalSel = el('select', {
      id: scanIntId,
      class: 'aac-select',
      'data-aac-scan-interval': '',
      on: {
        change: function () {
          scan.intervalMs = Math.max(600, Math.min(5000, Number(scanIntervalSel.value) || 1500));
          if (scan.active) scheduleAutoScan();
        },
      },
    }, [
      el('option', { value: '1000', text: '1.0 s' }),
      el('option', { value: '1500', text: '1.5 s' }),
      el('option', { value: '2000', text: '2.0 s' }),
      el('option', { value: '3000', text: '3.0 s' }),
    ]);
    scanIntervalSel.value = String(scan.intervalMs);

    scanPauseBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      hidden: true,
      'data-aac-scan-pause': '',
      'aria-pressed': 'false',
      on: {
        click: function () {
          if (!scan.active) return;
          scan.paused = !scan.paused;
          syncScanControls();
          if (scan.paused) clearScanTimer(); else scheduleAutoScan();
        },
      },
      text: L.aac_scan_pause || 'Pause scan',
    });

    scanSelectBtn = el('button', {
      type: 'button',
      class: 'primary aac-ctrl-btn',
      hidden: true,
      'data-aac-scan-select': '',
      on: { click: scanSelect },
      text: L.aac_scan_select || 'Select (Switch 1)',
    });

    scanNextBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      hidden: true,
      'data-aac-scan-next': '',
      on: { click: scanAdvance },
      text: L.aac_scan_next || 'Next (Switch 2)',
    });

    ctrlBar.appendChild(tapSpeakBtn);
    ctrlBar.appendChild(muteBtn);
    ctrlBar.appendChild(el('span', { class: 'aac-ctrl-grp' }, [
      el('label', { for: rateId, class: 'aac-ctrl-lbl', text: 'Voice speed' }),
      rateSel,
    ]));
    ctrlBar.appendChild(scanToggleBtn);
    ctrlBar.appendChild(el('span', { class: 'aac-ctrl-grp' }, [
      el('label', { for: scanModeId, class: 'aac-ctrl-lbl', text: 'Scan' }),
      scanModeSel,
    ]));
    ctrlBar.appendChild(el('span', { class: 'aac-ctrl-grp' }, [
      el('label', { for: scanIntId, class: 'aac-ctrl-lbl', text: 'Pace' }),
      scanIntervalSel,
    ]));
    ctrlBar.appendChild(scanSelectBtn);
    ctrlBar.appendChild(scanNextBtn);
    ctrlBar.appendChild(scanPauseBtn);

    // --- Core / Fringe Folder Tabs ---
    var tabList = el('div', { class: 'aac-tabs', role: 'tablist', 'aria-label': L.aac_folders_label || 'Word folders', 'data-aac-tabs': '' });
    var tabBtns = [];
    var panelId = 'aac-panel-' + String(item.id || 'b').replace(/[^a-z0-9_-]+/gi, '_');
    var gridWrap = el('div', {
      id: panelId,
      class: 'aac-grid aac-cols-' + cols,
      role: 'group',
      'data-aac-grid': '',
    });

    var syncTabs = function () {
      var multi = folders.length >= 2;
      tabList.hidden = !multi;
      tabBtns.forEach(function (tb, fi) {
        var selected = fi === activeFolderIdx;
        var f = folders[fi];
        tb.className = 'aac-tab' + (selected ? ' is-active' : '') + (f && f.kind === 'core' ? ' is-core' : ' is-fringe');
        tb.setAttribute('aria-selected', selected ? 'true' : 'false');
        tb.setAttribute('tabindex', selected ? '0' : '-1');
      });
      if (multi && tabBtns[activeFolderIdx]) {
        gridWrap.setAttribute('role', 'tabpanel');
        gridWrap.setAttribute('aria-labelledby', tabBtns[activeFolderIdx].id);
        gridWrap.removeAttribute('aria-label');
      } else {
        gridWrap.setAttribute('role', 'group');
        gridWrap.removeAttribute('aria-labelledby');
        gridWrap.setAttribute('aria-label', ((folders[activeFolderIdx] && folders[activeFolderIdx].name) || 'Board') + ' communication buttons');
      }
    };

    var switchFolder = function (idx, moveFocus) {
      activeFolderIdx = Math.max(0, Math.min(folders.length - 1, idx));
      if (ctx.support) ctx.support('aac_tab_switch');
      scan.phase = 'row';
      scan.rowIdx = 0;
      scan.colIdx = 0;
      scan.colPasses = 0;
      syncTabs();
      paintGrid();
      if (scan.active) {
        paintScan();
        scheduleAutoScan();
      }
      if (moveFocus && tabBtns[activeFolderIdx] && typeof tabBtns[activeFolderIdx].focus === 'function') {
        tabBtns[activeFolderIdx].focus();
      }
      ctx.announce('Showing ' + folders[activeFolderIdx].name + ' folder.');
    };

    var paintTabs = function () {
      tabList.textContent = '';
      tabBtns = [];
      folders.forEach(function (f, fi) {
        var tb = el('button', {
          type: 'button',
          role: 'tab',
          id: panelId + '-tab-' + fi,
          class: 'aac-tab',
          'aria-selected': 'false',
          'aria-controls': panelId,
          tabindex: '-1',
          'data-aac-tab': f.id,
          on: {
            click: function () { switchFolder(fi, false); },
            keydown: function (ev) {
              if (ev.key === 'ArrowRight') { ev.preventDefault(); switchFolder((fi + 1) % folders.length, true); }
              else if (ev.key === 'ArrowLeft') { ev.preventDefault(); switchFolder((fi - 1 + folders.length) % folders.length, true); }
              else if (ev.key === 'Home') { ev.preventDefault(); switchFolder(0, true); }
              else if (ev.key === 'End') { ev.preventDefault(); switchFolder(folders.length - 1, true); }
            },
          },
          text: f.name,
        });
        tabBtns.push(tb);
        tabList.appendChild(tb);
      });
      syncTabs();
    };

    var paintGrid = function () {
      var folder = folders[activeFolderIdx] || folders[0];
      var tiles = Array.isArray(folder.tiles) ? folder.tiles : [];
      gridWrap.textContent = '';
      if (folders.length < 2) gridWrap.setAttribute('aria-label', folder.name + ' communication buttons');
      gridButtons = [];

      tiles.forEach(function (tile, idx) {
        var r = Math.floor(idx / cols);
        var c = idx % cols;
        var cat = tile.category || 'noun';
        var btn = el('button', {
          type: 'button',
          class: 'aac-tile aac-cat-' + cat,
          'data-aac-tile': tile.id,
          'data-aac-cat': cat,
          'data-aac-pos': r + '-' + c,
          on: {
            click: function () { activateTile(tile, folder.kind); },
            keydown: function (ev) {
              var nextIdx = -1;
              if (ev.key === 'ArrowRight') nextIdx = Math.min(tiles.length - 1, idx + 1);
              else if (ev.key === 'ArrowLeft') nextIdx = Math.max(0, idx - 1);
              else if (ev.key === 'ArrowDown') nextIdx = idx + cols < tiles.length ? idx + cols : idx;
              else if (ev.key === 'ArrowUp') nextIdx = idx - cols >= 0 ? idx - cols : idx;
              else if (ev.key === 'Home') nextIdx = 0;
              else if (ev.key === 'End') nextIdx = tiles.length - 1;
              else return;
              ev.preventDefault();
              if (gridButtons[nextIdx] && typeof gridButtons[nextIdx].focus === 'function') gridButtons[nextIdx].focus();
            },
          },
        });

        var imgUri = tile.imageId && typeof ctx.image === 'function' ? ctx.image(tile.imageId) : null;
        if (imgUri && String(imgUri).indexOf('data:image/') === 0) {
          btn.appendChild(el('img', { class: 'aac-tile-img', src: imgUri, alt: '', 'aria-hidden': 'true' }));
        } else if (tile.symbol) {
          btn.appendChild(el('span', { class: 'aac-tile-sym', 'aria-hidden': 'true', text: tile.symbol }));
        }
        btn.appendChild(el('span', { class: 'aac-tile-lbl', text: tile.label }));
        btn.appendChild(el('span', { class: 'aac-tile-role', 'aria-hidden': 'true', text: cat }));
        gridButtons.push(btn);
        gridWrap.appendChild(btn);
      });
    };

    // --- Optional Carryover Session Footer (Non-Scored) ---
    var sessionFooter = el('div', { class: 'aac-session-footer', 'data-aac-session-bar': '' });
    var statsLine = el('p', { class: 'aac-stats', 'data-aac-stats': '' });
    var paintStats = function () {
      statsLine.textContent = 'Session: ' + messagesSpoken + (messagesSpoken === 1 ? ' message' : ' messages') + ' spoken | '
        + coreTaps + ' core | ' + fringeTaps + ' fringe';
    };

    var printBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      'data-aac-print': '',
      on: { click: function () { try { if (win && typeof win.print === 'function') win.print(); } catch (_) {} } },
      text: L.aac_print_board || 'Print paper backup',
    });

    var doneBtn = el('button', {
      type: 'button',
      class: 'aac-ctrl-btn',
      'data-aac-finish': '',
      on: {
        click: function () {
          stopScan(false);
          stopSpeech();
          var summary = 'Communication session complete (not scored): ' + messagesSpoken + ' messages spoken, ' + coreTaps + ' core taps, ' + fringeTaps + ' fringe taps.';
          if (typeof ctx.practice === 'function') {
            ctx.practice('communicated', summary, { advance: true });
          }
        },
      },
      text: L.aac_finish_log || 'Finish & save carryover log (optional)',
    });

    sessionFooter.appendChild(statsLine);
    sessionFooter.appendChild(el('div', { class: 'aac-footer-actions' }, [printBtn, doneBtn]));

    root.appendChild(voiceBanner);
    root.appendChild(stripWrap);
    root.appendChild(ctrlBar);
    root.appendChild(scanStatusLine);
    root.appendChild(tabList);
    root.appendChild(gridWrap);
    root.appendChild(sessionFooter);

    paintStrip();
    paintTabs();
    paintGrid();
    paintStats();
    updateVoiceBanner();

    var cleanup = function () {
      disposed = true;
      stopScan(false);
      stopSpeech();
      if (syn && typeof syn.removeEventListener === 'function') {
        try { syn.removeEventListener('voiceschanged', onVoicesChanged); } catch (_) {}
      }
    };

    return {
      stop: cleanup,
      reveal: cleanup,
    };
  }

  // ---------------------------------------------------------------------------
  // Student Packet CSS (Fitzgerald-Key, Switch Scan, High Contrast, Forced Colors, Print)
  // ---------------------------------------------------------------------------
  var EXTRA_CSS = [
    '.aac-banner{margin:0 0 12px;padding:10px 14px;border-radius:10px;font-size:.95rem;border:2px solid var(--line);background:var(--bg)}',
    '.aac-banner.is-warn{border-color:var(--warn);background:var(--warn-bg);color:var(--ink)}',
    '.aac-banner.is-info{border-color:var(--accent);background:var(--bg);color:var(--ink)}',
    '.aac-strip-wrap{border:2px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px;background:var(--card)}',
    '.aac-strip{min-height:56px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 10px;border:2px dashed var(--line);border-radius:10px;margin-bottom:10px;background:var(--bg)}',
    '.aac-strip-empty{color:var(--muted);font-size:.95rem}',
    '.aac-strip-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.aac-action-btn{min-height:44px;padding:8px 16px;font-weight:700}',
    '.aac-chip{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 12px;border-radius:10px;border:2px solid var(--line);font-weight:700;font-size:1rem;cursor:pointer}',
    '.aac-chip-sym{font-size:1.15rem;line-height:1}',
    '.aac-ctrl-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}',
    '.aac-ctrl-grp{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
    '.aac-ctrl-btn{min-height:44px;padding:6px 8px;font-size:.85rem}',
    '.aac-ctrl-btn[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '.aac-ctrl-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.aac-ctrl-lbl{font-size:.82rem;font-weight:700;color:var(--muted)}',
    '.aac-select{min-height:44px;padding:4px 8px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink);font:inherit;font-size:.86rem}',
    '.aac-scan-status{margin:0 0 10px;padding:8px 12px;border-radius:10px;border:2px solid var(--accent);background:var(--bg);font-weight:600;font-size:.9rem}',
    '.aac-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}',
    '.aac-tab{min-height:44px;padding:8px 16px;border-radius:10px;border:2px solid var(--line);font-weight:700;background:var(--bg);color:var(--ink);cursor:pointer}',
    '.aac-tab.is-active{border-color:var(--accent);background:var(--accent);color:var(--accent-ink)}',
    '.aac-grid{display:grid;gap:10px;margin-bottom:14px}',
    '.aac-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.aac-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '.aac-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}',
    '.aac-cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}',
    '.aac-cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}',
    '@media (max-width:600px){.aac-cols-5,.aac-cols-6{grid-template-columns:repeat(3,minmax(0,1fr))}.aac-cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.aac-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:76px;padding:10px 6px;border-radius:14px;border:3px solid #444;border-top-width:7px;cursor:pointer;text-align:center;color:#111;background:#fff;font-weight:700;line-height:1.2}',
    '.aac-tile:focus-visible{outline:4px solid var(--focus);outline-offset:2px}',
    '.aac-tile-sym{font-size:1.75rem;line-height:1.1}',
    '.aac-tile-img{width:46px;height:46px;object-fit:contain;border-radius:6px}',
    '.aac-tile-lbl{font-size:1.05rem;word-break:break-word}',
    '.aac-tile-role{font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;opacity:.8}',
    '.aac-cat-pronoun{background:#fff8c7;border-color:#9e6c00;color:#3d2800}',
    '.aac-cat-verb{background:#e3f7e8;border-color:#1c743a;color:#0b3b1c}',
    '.aac-cat-noun{background:#ffecd9;border-color:#b85000;color:#4f2100}',
    '.aac-cat-descriptor{background:#e2f0ff;border-color:#1a5a9e;color:#0b2c52}',
    '.aac-cat-social{background:#ffe6f0;border-color:#a82460;color:#4f0f2d}',
    '.aac-cat-question{background:#f1e6ff;border-color:#663a99;color:#2f174d}',
    '.aac-tile.is-scan-row{box-shadow:0 0 0 4px #1d5fa7;border-style:solid}',
    '.aac-tile.is-scan-cell{outline:5px solid #b83200;outline-offset:2px;box-shadow:0 0 0 6px #ffd400}',
    '.aac-session-footer{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding-top:12px;border-top:1px solid var(--line)}',
    '.aac-stats{margin:0;color:var(--muted);font-size:.9rem}',
    '.aac-footer-actions{display:flex;flex-wrap:wrap;gap:8px}',
    '[data-lt-colors="1"] .aac-tile,[data-lt-colors="3"] .aac-tile{background:#111;color:#fff}',
    '[data-lt-colors="1"] .aac-cat-pronoun,[data-lt-colors="3"] .aac-cat-pronoun{border-color:#ffd84d}',
    '[data-lt-colors="1"] .aac-cat-verb,[data-lt-colors="3"] .aac-cat-verb{border-color:#5ae38a}',
    '[data-lt-colors="1"] .aac-cat-noun,[data-lt-colors="3"] .aac-cat-noun{border-color:#ff9e4a}',
    '[data-lt-colors="1"] .aac-cat-descriptor,[data-lt-colors="3"] .aac-cat-descriptor{border-color:#78b7ff}',
    '[data-lt-colors="1"] .aac-cat-social,[data-lt-colors="3"] .aac-cat-social{border-color:#ff85bc}',
    '[data-lt-colors="1"] .aac-cat-question,[data-lt-colors="3"] .aac-cat-question{border-color:#c79bff}',
    '[data-lt-colors="1"] .aac-chip,[data-lt-colors="3"] .aac-chip{background:#111;color:#fff}',
    '@media (prefers-color-scheme:dark){:root:not([data-lt-colors]) .aac-tile,:root:not([data-lt-colors]) .aac-chip{background:#141824;color:#eef1f8}:root:not([data-lt-colors]) .aac-cat-pronoun{border-color:#ffd84d}:root:not([data-lt-colors]) .aac-cat-verb{border-color:#5ae38a}:root:not([data-lt-colors]) .aac-cat-noun{border-color:#ff9e4a}:root:not([data-lt-colors]) .aac-cat-descriptor{border-color:#78b7ff}:root:not([data-lt-colors]) .aac-cat-social{border-color:#ff85bc}:root:not([data-lt-colors]) .aac-cat-question{border-color:#c79bff}}',
    '@media (forced-colors: active){.aac-tile,.aac-chip,.aac-tab,.aac-ctrl-btn{forced-color-adjust:none;border:2px solid ButtonText;background:ButtonFace;color:ButtonText}.aac-tab.is-active{background:Highlight;color:HighlightText;border:2px solid Highlight}.aac-tile.is-scan-row{border:4px solid Highlight}.aac-tile.is-scan-cell{background:Highlight;color:HighlightText;outline:4px solid Highlight;outline-offset:2px}}',
    '@media (prefers-reduced-motion: reduce){.aac-tile,.aac-tab,.aac-chip{transition:none}}',
    '@media print{.lt-bar,#lt-panel,.aac-strip-wrap,.aac-tabs,.aac-ctrl-bar,.aac-scan-status,.aac-session-footer,.aac-strip-actions,.aac-banner,.progress{display:none!important}.card{border:0;box-shadow:none;padding:0;margin:0}.aac-grid{gap:6px}.aac-tile{min-height:76px;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
  ].join('\n');

  var ADAPTERS = {
    aac_board: {
      title: 'AAC Communication Board',
      render: renderAacBoard,
      labels: {
        aac_board_title: 'AAC Communication Board',
      },
    },
  };

  function withManifest(html, extra) {
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(openTag);
    if (at < 0) return html;
    var from = at + openTag.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try {
      manifest = JSON.parse(html.slice(from, to), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
    } catch (_) {
      return html;
    }
    if (!isObj(manifest)) return html;
    Object.keys(extra || {}).forEach(function (k) {
      if (extra[k] === undefined) delete manifest[k];
      else manifest[k] = extra[k];
    });
    return html.slice(0, from) + safeJson(manifest) + html.slice(to);
  }

  function codeName(html) {
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = str(html).indexOf(openTag);
    if (at < 0) return '';
    var from = at + openTag.length;
    var to = str(html).indexOf('</script>', from);
    if (to < 0) return '';
    try {
      var m = JSON.parse(html.slice(from, to), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
      return isObj(m) && typeof m.learner === 'string' ? m.learner.trim().slice(0, 60) : '';
    } catch (_) {
      return '';
    }
  }

  function withCodeName(html, learner) {
    var clean = str(learner).trim().slice(0, 60);
    return withManifest(html, { learner: clean || undefined });
  }

  // ---------------------------------------------------------------------------
  // Build Offline AAC Communication Board Packet
  // ---------------------------------------------------------------------------
  function buildAacPacket(options) {
    var o = options || {};
    var loader = o.loader || (root && root.AlloWordSoundsTakeHome);
    if (!loader || typeof loader.buildHtml !== 'function') {
      throw new Error('buildAacPacket needs loader (AlloWordSoundsTakeHome)');
    }
    var title = str(o.title).trim().slice(0, 120) || 'AAC Communication Board';
    var gridLayout = cleanGrid(o.gridLayout);
    var cols = gridCols(gridLayout);
    var lang = str(o.lang).trim().toLowerCase().slice(0, 12) || 'en';
    var folders = normalizeFolders(o.folders);
    if (!folders.length) {
      throw new Error('Add at least one folder with at least one communication button.');
    }

    var images = Object.create(null);
    var rawImages = isObj(o.images) ? o.images : {};
    Object.keys(rawImages).forEach(function (k) {
      var clean = validateMediaDataUri(rawImages[k], 'image');
      if (clean) images[k] = clean;
    });

    var audio = Object.create(null);
    var rawAudio = isObj(o.audio) ? o.audio : {};
    Object.keys(rawAudio).forEach(function (k) {
      var clean = validateMediaDataUri(rawAudio[k], 'audio');
      if (clean) audio[k] = clean;
    });

    // Only keep tile media IDs that exist, and prune unreferenced images/audio so packets stay lean
    var usedImages = Object.create(null);
    var usedAudio = Object.create(null);
    var totalTiles = 0;
    folders.forEach(function (f) {
      f.tiles.forEach(function (t) {
        totalTiles++;
        if (t.imageId && own(images, t.imageId)) usedImages[t.imageId] = images[t.imageId];
        else delete t.imageId;
        if (t.audioId && own(audio, t.audioId)) usedAudio[t.audioId] = audio[t.audioId];
        else delete t.audioId;
      });
    });
    images = usedImages;
    audio = usedAudio;

    var speakOnTap = o.speakOnTap !== false;
    var defaultScanMode = o.defaultScanMode === 'two_switch' ? 'two_switch' : 'auto';
    var defaultScanMs = Math.max(600, Math.min(5000, Number(o.defaultScanMs) || 1500));
    var defaultRate = Number(o.defaultRate) > 0 ? Math.max(0.5, Math.min(1.5, Number(o.defaultRate))) : 1;

    var boardItem = {
      id: 'aac-board-1',
      word: title,
      lang: lang,
      gridLayout: gridLayout,
      cols: cols,
      speakOnTap: speakOnTap,
      defaultScanMode: defaultScanMode,
      defaultScanMs: defaultScanMs,
      defaultRate: defaultRate,
      folders: folders,
    };

    var contentSig = fnv1a(JSON.stringify({ title: title, gridLayout: gridLayout, lang: lang, folders: folders }));
    var lessonId = 'aac-' + slug(title) + '-' + contentSig.slice(0, 6);
    var revision = 'aac-v1-' + contentSig;

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: revision,
      title: title,
      mode: 'practice',
      language: lang,
      deviceVoice: true,
      activityTitles: { aac_board: title },
      images: Object.keys(images).length ? images : undefined,
      audio: Object.keys(audio).length ? audio : undefined,
      blocks: [
        {
          activity: 'aac_board',
          items: [boardItem],
        },
      ],
    };

    var labels = {
      lang: lang,
      title: title,
      intro: 'Tap any word button to build a message and hear it spoken on this device. Works completely offline with no score and no timer.',
      learner_label: 'Name or initials (optional)',
      start: 'Open communication board',
      continue: 'Return to communication board',
      name_prompt: 'Add a name or initials if you plan to save a carryover log, or open the board right away.',
      name_prompt_add: 'Add name',
      name_prompt_skip: 'Open board now',
      item_of: '{activity}',
      finish: 'Save carryover log',
      done_title: 'Communication session summary',
      done_practice: 'Communication session completed (not scored).',
      done_last_step: 'Optional: save a simple carryover log for your teacher or SLP, or return to the board.',
      save_work: 'Save carryover log (CSV)',
      grown_ups_file: 'Save carryover log makes a simple spreadsheet file (CSV) with core/fringe tap counts. Give that file to the teacher or SLP only if requested.',
      practice_again: 'Return to communication board',
      about_what: 'This is an offline AAC communication board in one file. It works with no internet connection.',
    };

    var homeLanguages = Array.isArray(o.homeLanguages) && o.homeLanguages.length ? o.homeLanguages.slice() : undefined;
    var bilingualGlossary = isObj(o.bilingualGlossary) && Object.keys(o.bilingualGlossary).length ? o.bilingualGlossary : undefined;

    var buildOpts = {
      extraAdapters: ADAPTERS,
      extraCss: EXTRA_CSS,
      labels: labels,
      stationMode: !!o.stationMode,
      qrPublicKey: str(o.qrPublicKey).trim() || undefined,
      qrCrypto: o.qrCrypto,
      stationBilingual: o.stationBilingual,
      attributions: Array.isArray(o.attributions) ? o.attributions : ['Fitzgerald Key color coding (educational convention)'],
    };
    if (homeLanguages) buildOpts.homeLanguages = homeLanguages;
    if (bilingualGlossary) buildOpts.bilingualGlossary = bilingualGlossary;

    var html = loader.buildHtml(lesson, buildOpts);

    var recipe = {
      kind: 'alloflow-aac-board',
      version: 1,
      starterId: str(o.starterId).trim() || '',
      gridLayout: gridLayout,
      lang: lang,
      speakOnTap: speakOnTap,
      defaultScanMode: defaultScanMode,
      defaultScanMs: defaultScanMs,
      defaultRate: defaultRate,
      folderCount: folders.length,
      tileCount: totalTiles,
      homeLanguages: homeLanguages || [],
    };

    var manifestExtra = {
      what: 'An offline AAC communication board in one file. It runs in a browser with no internet connection.',
      speech: {
        engine: 'speechSynthesis',
        when: 'only when the learner taps a communication button or presses Speak sentence',
        voices: 'a voice that runs on this device (localService); none that needs the internet',
        sends: 'nothing',
      },
      aac: recipe,
      builder: {
        name: 'AlloFlow Offline AAC Board Builder',
        ai: 'none',
        words: totalTiles,
        items: 1,
      },
    };
    if (str(o.learner).trim()) manifestExtra.learner = str(o.learner).trim().slice(0, 60);

    html = withManifest(html, manifestExtra);

    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    var manifest = null;
    try { manifest = block ? JSON.parse(block[1]) : null; } catch (_) { manifest = null; }
    var sha = typeof loader.sha256 === 'function' ? loader.sha256(html).hex : '';

    return {
      html: html,
      manifest: manifest,
      sha256: sha,
      lesson: lesson,
      stats: { folders: folders.length, tiles: totalTiles, images: Object.keys(images).length, audioClips: Object.keys(audio).length },
    };
  }

  // ---------------------------------------------------------------------------
  // Reopen an existing Offline AAC Board .html file
  // ---------------------------------------------------------------------------
  function readAacPacket(html, verifyCore) {
    var vc = verifyCore || (root && root.AlloPacketVerify);
    if (!vc || typeof vc.readParts !== 'function') {
      return { ok: false, error: 'Packet reader is unavailable.' };
    }
    var parts = vc.readParts(html);
    if (!parts || !parts.ok || !isObj(parts.lesson)) {
      return { ok: false, error: 'This file is not an AlloFlow communication board packet.' };
    }
    var lesson = parts.lesson;
    var manifest = isObj(parts.manifest) ? parts.manifest : {};
    var aacMeta = isObj(manifest.aac) ? manifest.aac : null;
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
    var aacBlock = blocks.filter(function (b) { return b && b.activity === 'aac_board'; })[0];
    if (!aacBlock || !Array.isArray(aacBlock.items) || !aacBlock.items.length) {
      return { ok: false, error: 'This packet is not an AAC Communication Board file.' };
    }
    var item = aacBlock.items[0];
    var folders = normalizeFolders(item.folders);
    var homeLangs = (lesson.bilingual && Array.isArray(lesson.bilingual.codes) && lesson.bilingual.codes.length)
      ? lesson.bilingual.codes.slice()
      : (aacMeta && Array.isArray(aacMeta.homeLanguages) ? aacMeta.homeLanguages.slice() : []);
    return {
      ok: true,
      title: str(lesson.title || manifest.title || 'AAC Communication Board'),
      starterId: aacMeta ? str(aacMeta.starterId) : '',
      gridLayout: cleanGrid(item.gridLayout || (aacMeta && aacMeta.gridLayout) || '4x4'),
      lang: str(item.lang || lesson.language || 'en'),
      speakOnTap: item.speakOnTap !== false,
      defaultScanMode: item.defaultScanMode === 'two_switch' ? 'two_switch' : 'auto',
      defaultScanMs: Number(item.defaultScanMs) || 1500,
      defaultRate: Number(item.defaultRate) || 1,
      folders: folders,
      images: isObj(lesson.images) ? Object.assign({}, lesson.images) : {},
      audio: isObj(lesson.audio) ? Object.assign({}, lesson.audio) : {},
      homeLanguages: homeLangs,
      bilingualGlossary: lesson.bilingual && isObj(lesson.bilingual.glossary) ? Object.assign({}, lesson.bilingual.glossary) : {},
      stationMode: !!lesson.stationMode,
      qrPublicKey: lesson.qr && typeof lesson.qr.k === 'string' ? lesson.qr.k : '',
      learner: typeof manifest.learner === 'string' ? manifest.learner : '',
    };
  }

  // ---------------------------------------------------------------------------
  // Pipe-delimited custom tile editor helpers (label | category | speak | symbol | lang)
  // ---------------------------------------------------------------------------
  function formatTilesText(tiles) {
    return (Array.isArray(tiles) ? tiles : []).map(function (t) {
      var parts = [str(t.label).trim(), cleanCat(t.category)];
      var sp = str(t.speak).trim();
      var sym = str(t.symbol).trim();
      var lg = str(t.lang).trim();
      if (sp && sp !== str(t.label).trim()) parts.push(sp);
      else if (sym || lg) parts.push(str(t.label).trim());
      if (sym) parts.push(sym);
      else if (lg) parts.push('');
      if (lg) parts.push(lg);
      return parts.join(' | ');
    }).join('\n');
  }

  function parseTilesText(text, folderId, existingTiles) {
    var prevByLabel = Object.create(null);
    (Array.isArray(existingTiles) ? existingTiles : []).forEach(function (t) {
      if (t && t.label) prevByLabel[str(t.label).trim().toLowerCase()] = t;
    });
    return str(text).split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean).slice(0, 48).map(function (line, i) {
      var p = line.split('|').map(function (s) { return s.trim(); });
      var label = str(p[0]).slice(0, 40);
      if (!label) return null;
      var prev = prevByLabel[label.toLowerCase()] || null;
      var out = {
        id: (prev && prev.id) || (slug(folderId || 'tab') + '-' + (i + 1)),
        label: label,
        category: cleanCat(p[1] || (prev && prev.category) || 'noun'),
        speak: str(p[2] || label).slice(0, 120),
        symbol: p.length >= 4 ? str(p[3]).slice(0, 12) : (prev && prev.symbol ? prev.symbol : ''),
        lang: p.length >= 5 ? str(p[4]).slice(0, 12) : (prev && prev.lang ? prev.lang : ''),
      };
      if (prev && prev.imageId) out.imageId = prev.imageId;
      if (prev && prev.audioId) out.audioId = prev.audioId;
      return out;
    }).filter(Boolean);
  }

  var api = {
    GRID_LAYOUTS: GRID_LAYOUTS,
    CATEGORIES: CATEGORIES,
    EXTRA_CSS: EXTRA_CSS,
    ADAPTERS: ADAPTERS,
    starters: starters,
    starterById: starterById,
    normalizeFolders: normalizeFolders,
    validateMediaDataUri: validateMediaDataUri,
    formatTilesText: formatTilesText,
    parseTilesText: parseTilesText,
    buildAacPacket: buildAacPacket,
    readAacPacket: readAacPacket,
    codeName: codeName,
    withCodeName: withCodeName,
  };

  if (root) root.AlloPacketAac = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
