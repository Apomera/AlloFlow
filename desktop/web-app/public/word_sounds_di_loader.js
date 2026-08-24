/*
 * word_sounds_di_loader.js — Direct Instruction lesson-script generator for Word Sounds.
 *
 * WHAT THIS IS
 *   A pure, deterministic analysis of a Word Sounds word pack plus the teacher's
 *   lesson plan, turned into a printable Direct Instruction script. No AI, no
 *   network, no React. It runs on a keyless device and produces the same script
 *   for the same pack every time, which is the property a teacher needs when the
 *   script is the thing they are holding in front of a child.
 *
 * WHY PURE
 *   Two reasons, both learned the hard way in this repo:
 *     1. A second derivation of one fact is a bug class. The player already owns
 *        "what sounds are in this word"; this module reads that same pack data
 *        rather than re-deriving phonemes from spelling.
 *     2. An on-screen prompt renderer will eventually want the same analysis.
 *        Keeping the analysis free of the player's state machine means that
 *        second renderer is a renderer, not a rewrite.
 *
 * ENGLISH ONLY, ON PURPOSE
 *   A DI script is scripted teacher speech. Machine-translating it would put
 *   words in a teacher's mouth in a language this repo cannot vouch for, and the
 *   correction procedure is exactly where a mistranslation does damage. Callers
 *   must gate on `supportsLanguage(lang)`; it returns false for anything but
 *   English so the UI can say so plainly instead of shipping a bad script.
 *
 * API
 *   window.AlloWordSoundsDI = {
 *     VERSION,
 *     supportsLanguage(lang) -> bool
 *     analyzeWordSet(words, opts) -> analysis
 *     buildLessonScript(analysis, plan, opts) -> script
 *     scriptToText(script) -> string
 *     ACTIVITY_SKILLS
 *   }
 */
(function () {
  'use strict';
  if (typeof window !== 'undefined' && window.AlloWordSoundsDI) return;

  var VERSION = '1.0.0';

  // ──────────────────────────────────────────────────────────────────────
  // Phoneme inventory
  //
  // The pack's English phoneme tokens follow the notation the generation
  // prompt pins: macron long vowels, plain short vowels, r-controlled vowels
  // and consonant digraphs as single tokens. These letters are built from
  // code points rather than typed, because hand-typing non-Latin-1 characters
  // into this repo has silently produced combining-mark variants before and
  // every pack gate is blind to it.
  //   U+0101 a-macron, U+0113 e-macron, U+012B i-macron, U+014D o-macron,
  //   U+016B u-macron, U+0259 schwa.
  // ──────────────────────────────────────────────────────────────────────
  var LONG_VOWELS = [0x101, 0x113, 0x12B, 0x14D, 0x16B].map(function (c) {
    return String.fromCharCode(c);
  });
  var SCHWA = String.fromCharCode(0x259);

  var SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];
  var R_CONTROLLED = ['ar', 'er', 'ir', 'or', 'ur'];
  // Vowel-team spellings. A Gemini-generated pack normalizes these to macrons,
  // but the spelling-based estimator fallback emits them raw, so both forms
  // have to classify as vowels or an estimated pack reports nonsense shapes.
  var VOWEL_TEAMS = [
    'oo', 'aw', 'au', 'oi', 'oy', 'ou', 'ow', 'ew', 'ue', 'oa',
    'ea', 'ee', 'ai', 'ay', 'ie', 'oe', 'ei', 'ey', 'igh'
  ];
  var CONSONANT_DIGRAPHS = [
    'sh', 'ch', 'th', 'wh', 'ng', 'ck', 'ph', 'gh',
    'qu', 'wr', 'kn', 'gn', 'mb', 'tch', 'dge'
  ];

  function norm(token) {
    var s = token == null ? '' : String(token);
    if (s.normalize) s = s.normalize('NFC');
    return s.trim().toLowerCase();
  }

  // A pack phoneme entry is either a bare token or { ipa, grapheme }.
  function phonemeToken(entry) {
    if (entry && typeof entry === 'object') return norm(entry.ipa || entry.sound || '');
    return norm(entry);
  }
  function phonemeGrapheme(entry) {
    if (entry && typeof entry === 'object') return norm(entry.grapheme || entry.g || '');
    return '';
  }

  /**
   * classifyPhoneme(token) -> { token, kind: 'vowel'|'consonant', sub, label }
   * `sub` is the teaching category, which is what the script talks about.
   */
  function classifyPhoneme(token) {
    var t = norm(token);
    if (!t) return { token: '', kind: 'consonant', sub: 'unknown', label: 'unknown' };
    if (LONG_VOWELS.indexOf(t) >= 0) return { token: t, kind: 'vowel', sub: 'long', label: 'long vowel' };
    if (SHORT_VOWELS.indexOf(t) >= 0) return { token: t, kind: 'vowel', sub: 'short', label: 'short vowel' };
    if (R_CONTROLLED.indexOf(t) >= 0) return { token: t, kind: 'vowel', sub: 'r_controlled', label: 'r-controlled vowel' };
    if (VOWEL_TEAMS.indexOf(t) >= 0) return { token: t, kind: 'vowel', sub: 'team', label: 'vowel team' };
    if (t === SCHWA) return { token: t, kind: 'vowel', sub: 'schwa', label: 'schwa' };
    if (CONSONANT_DIGRAPHS.indexOf(t) >= 0) return { token: t, kind: 'consonant', sub: 'digraph', label: 'consonant digraph' };
    if (/^[a-z]$/.test(t)) return { token: t, kind: 'consonant', sub: 'single', label: 'single consonant' };
    return { token: t, kind: 'consonant', sub: 'other', label: 'consonant' };
  }

  function isVowel(token) { return classifyPhoneme(token).kind === 'vowel'; }

  // ──────────────────────────────────────────────────────────────────────
  // Grapheme alignment
  //
  // Prefer, in order: the pack's own graphemes (a real alignment someone or
  // something already committed to), AlloPhonics' digraph-aware aligner when
  // the loader happens to be present, then a local copy of the same greedy
  // algorithm so this module still works standalone in a test.
  // ──────────────────────────────────────────────────────────────────────
  var _TRIGRAPHS = ['igh', 'tch', 'dge'];
  var _DIGRAPHS = [
    'sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb',
    'ai', 'ay', 'ea', 'ee', 'oa', 'ow', 'oo', 'ou', 'oi', 'oy',
    'ar', 'er', 'ir', 'or', 'ur', 'aw', 'au', 'ew'
  ];
  function localAlignGraphemes(word, count) {
    var w = String(word || '').toLowerCase().replace(/[^\p{L}\p{M}']/gu, '');
    if (!w || !count || count < 1) return null;
    var greedy = [];
    for (var i = 0; i < w.length;) {
      if (i <= w.length - 3 && _TRIGRAPHS.indexOf(w.slice(i, i + 3)) >= 0) { greedy.push(w.slice(i, i + 3)); i += 3; }
      else if (i <= w.length - 2 && _DIGRAPHS.indexOf(w.slice(i, i + 2)) >= 0) { greedy.push(w.slice(i, i + 2)); i += 2; }
      else { greedy.push(w[i]); i += 1; }
    }
    if (greedy.length === count) return greedy;
    if (greedy.length > count) {
      var merged = greedy.slice();
      while (merged.length > count) { var last = merged.pop(); merged[merged.length - 1] += last; }
      return merged.length === count ? merged : null;
    }
    var chunks = greedy.slice();
    while (chunks.length < count) {
      var idx = -1, len = 1;
      for (var j = 0; j < chunks.length; j++) { if (chunks[j].length > len) { len = chunks[j].length; idx = j; } }
      if (idx < 0) break;
      var c = chunks[idx];
      chunks.splice(idx, 1, c.slice(0, 1), c.slice(1));
    }
    return chunks.length === count ? chunks : null;
  }
  function alignGraphemes(word, count) {
    try {
      if (typeof window !== 'undefined' && window.AlloPhonics
        && typeof window.AlloPhonics.alignGraphemes === 'function') {
        var viaPhonics = window.AlloPhonics.alignGraphemes(word, count);
        if (viaPhonics && viaPhonics.length === count) return viaPhonics;
      }
    } catch (_) { /* fall through to the local copy */ }
    return localAlignGraphemes(word, count);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Per-word analysis
  // ──────────────────────────────────────────────────────────────────────

  function wordText(item) {
    if (!item) return '';
    return String(item.targetWord || item.word || item.term || item.displayWord || '').trim();
  }

  /**
   * Syllable type for a single-syllable word. Multisyllabic words are reported
   * as such rather than guessed at: a wrong syllable-type label in a printed
   * script is worse than an honest "multisyllabic (2)".
   */
  function syllableTypeFor(word, tokens, graphemes) {
    var spelled = String(word || '').toLowerCase().replace(/[^a-z']/g, '');
    var vowelIdx = -1;
    for (var i = 0; i < tokens.length; i++) { if (isVowel(tokens[i])) { vowelIdx = i; break; } }
    if (vowelIdx < 0) return 'no vowel sound';
    var v = classifyPhoneme(tokens[vowelIdx]);
    if (v.sub === 'r_controlled') return 'r-controlled';
    if (/[a-z]*[aeiou][^aeiouy]e$/.test(spelled) && v.sub === 'long') return 'silent-e';
    var vGrapheme = (graphemes && graphemes[vowelIdx]) || '';
    if ((v.sub === 'long' || v.sub === 'team') && vGrapheme.length >= 2) return 'vowel team';
    if (v.sub === 'long' && vowelIdx === tokens.length - 1) return 'open';
    if (v.sub === 'short' && vowelIdx < tokens.length - 1) return 'closed';
    if (v.sub === 'long') return 'long vowel';
    return 'other';
  }

  function consonantRun(tokens, fromStart) {
    var run = [];
    var order = fromStart ? tokens : tokens.slice().reverse();
    for (var i = 0; i < order.length; i++) {
      var c = classifyPhoneme(order[i]);
      if (c.kind !== 'consonant') break;
      // A digraph is one sound, not a blend. Only single consonants stack into
      // a blend, which is the distinction the model/lead wording depends on.
      if (c.sub !== 'single') { run.push(order[i]); break; }
      run.push(order[i]);
    }
    if (!fromStart) run.reverse();
    return run;
  }

  function analyzeWord(item) {
    var word = wordText(item);
    var rawPhonemes = Array.isArray(item && item.phonemes) ? item.phonemes : [];
    var tokens = rawPhonemes.map(phonemeToken).filter(function (t) { return t !== ''; });

    var graphemes = null;
    var packGraphemes = Array.isArray(item && item.graphemes) ? item.graphemes.map(norm) : [];
    var inlineGraphemes = rawPhonemes.map(phonemeGrapheme);
    if (packGraphemes.length === tokens.length && packGraphemes.every(Boolean)) {
      graphemes = packGraphemes;
    } else if (inlineGraphemes.length === tokens.length && inlineGraphemes.every(Boolean)) {
      graphemes = inlineGraphemes;
    } else {
      graphemes = alignGraphemes(word, tokens.length);
    }
    var graphemesAligned = !!(graphemes && graphemes.length === tokens.length);
    if (!graphemesAligned) graphemes = null;

    var classes = tokens.map(classifyPhoneme);
    var shape = classes.map(function (c) { return c.kind === 'vowel' ? 'V' : 'C'; }).join('');
    var syllables = Array.isArray(item && item.syllables) ? item.syllables.filter(Boolean) : [];
    var syllableCount = syllables.length || 1;

    var initialBlend = consonantRun(tokens, true);
    var finalBlend = consonantRun(tokens, false);

    return {
      word: word,
      phonemes: tokens,
      phonemeCount: tokens.length,
      graphemes: graphemes,
      graphemesAligned: graphemesAligned,
      classes: classes,
      shape: shape,
      syllables: syllables,
      syllableCount: syllableCount,
      syllableType: syllableCount > 1
        ? ('multisyllabic (' + syllableCount + ')')
        : syllableTypeFor(word, tokens, graphemes),
      initialBlend: initialBlend.length >= 2 && initialBlend.every(function (t) {
        return classifyPhoneme(t).sub === 'single';
      }) ? initialBlend : [],
      finalBlend: finalBlend.length >= 2 && finalBlend.every(function (t) {
        return classifyPhoneme(t).sub === 'single';
      }) ? finalBlend : [],
      firstSound: tokens[0] || '',
      lastSound: tokens.length ? tokens[tokens.length - 1] : '',
      sentence: (item && typeof item.sentence === 'string') ? item.sentence.trim() : '',
      rhymeWord: (item && item.rhymeWord) ? String(item.rhymeWord).trim() : '',
      familyEnding: (item && item.familyEnding) ? String(item.familyEnding).trim() : '',
      definition: (item && item.definition) ? String(item.definition).trim() : '',
      manipulationTask: (item && item.manipulationTask) || null,
      phonemeSource: (item && item._phonemeSource) || 'unknown',
      estimated: !!(item && item._fallbackUsed)
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Set-level analysis
  // ──────────────────────────────────────────────────────────────────────

  function tally(map, key, word) {
    if (!map[key]) map[key] = { key: key, words: [] };
    if (map[key].words.indexOf(word) < 0) map[key].words.push(word);
  }
  function rank(map) {
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        if (b.words.length !== a.words.length) return b.words.length - a.words.length;
        return a.key < b.key ? -1 : 1;
      });
  }

  function supportsLanguage(lang) {
    var l = String(lang == null ? 'en' : lang).toLowerCase();
    return l === '' || l.indexOf('en') === 0;
  }

  /**
   * analyzeWordSet(words, opts) — the whole deterministic picture of a pack.
   *
   * "Focus" is defined by recurrence inside this set, not by any curriculum
   * scope-and-sequence this repo does not have. A correspondence a teacher put
   * into a third of the words is the thing they are teaching; one that appears
   * once is incidental. That inference is stated in the printed script so a
   * teacher can overrule it rather than being quietly told what their objective is.
   */
  function analyzeWordSet(words, opts) {
    opts = opts || {};
    var list = (Array.isArray(words) ? words : []).map(analyzeWord)
      .filter(function (w) { return w.word && w.phonemeCount > 0; });

    var gpcMap = {}, phonemeMap = {}, shapeMap = {}, syllTypeMap = {};
    var blendMap = {}, positionMap = {};
    var unaligned = [];

    list.forEach(function (w) {
      tally(shapeMap, w.shape, w.word);
      tally(syllTypeMap, w.syllableType, w.word);
      if (!w.graphemesAligned) unaligned.push(w.word);
      w.phonemes.forEach(function (p, i) {
        tally(phonemeMap, p, w.word);
        var pos = i === 0 ? 'initial' : (i === w.phonemeCount - 1 ? 'final' : 'medial');
        tally(positionMap, p + '@' + pos, w.word);
        if (w.graphemes) tally(gpcMap, w.graphemes[i] + '→' + p, w.word);
      });
      if (w.initialBlend.length) tally(blendMap, w.initialBlend.join('') + ' (initial)', w.word);
      if (w.finalBlend.length) tally(blendMap, w.finalBlend.join('') + ' (final)', w.word);
    });

    var n = list.length;
    // Two words is the floor for "recurring"; a third of the set is the floor
    // for "focus". Both are deliberately low, because a Word Sounds pack is
    // usually built around one pattern and is often only six to ten words.
    var focusFloor = Math.max(2, Math.ceil(n * 0.34));
    // A phonics lesson's pattern is a vowel or a multi-letter grapheme, never a
    // lone common consonant. Without this test, /t/ spelled t recurring in three
    // of six words outranks the r-controlled vowel the pack was built around,
    // and the printed objective names the wrong thing to teach.
    function focusEligible(grapheme, phoneme) {
      var c = classifyPhoneme(phoneme);
      if (c.kind === 'vowel') return true;
      if (String(grapheme || '').length > 1) return true;
      return c.sub === 'digraph';
    }
    var gpcs = rank(gpcMap).map(function (g) {
      var parts = g.key.split('→');
      var eligible = focusEligible(parts[0], parts[1]);
      return {
        grapheme: parts[0],
        phoneme: parts[1],
        wordCount: g.words.length,
        words: g.words,
        tier: (eligible && g.words.length >= focusFloor)
          ? 'focus'
          : (g.words.length >= 2 ? 'recurring' : 'incidental'),
        focusEligible: eligible,
        category: classifyPhoneme(parts[1]).label
      };
    });

    var shapes = rank(shapeMap);
    var syllableTypes = rank(syllTypeMap);
    var counts = {};
    list.forEach(function (w) { counts[w.phonemeCount] = (counts[w.phonemeCount] || 0) + 1; });

    return {
      version: VERSION,
      language: opts.language || 'en',
      grade: opts.grade || '',
      wordCount: n,
      words: list,
      gpcs: gpcs,
      focusGpcs: gpcs.filter(function (g) { return g.tier === 'focus'; }),
      focusFloor: focusFloor,
      phonemes: rank(phonemeMap).map(function (p) {
        return {
          phoneme: p.key, wordCount: p.words.length, words: p.words,
          category: classifyPhoneme(p.key).label,
          positions: ['initial', 'medial', 'final'].filter(function (pos) {
            return !!positionMap[p.key + '@' + pos];
          })
        };
      }),
      blends: rank(blendMap).map(function (b) {
        return { blend: b.key, wordCount: b.words.length, words: b.words };
      }),
      shapes: shapes.map(function (s) { return { shape: s.key, wordCount: s.words.length, words: s.words }; }),
      dominantShape: shapes.length ? shapes[0].key : '',
      syllableTypes: syllableTypes.map(function (s) {
        return { type: s.key, wordCount: s.words.length, words: s.words };
      }),
      dominantSyllableType: syllableTypes.length ? syllableTypes[0].type : '',
      phonemeCountDistribution: counts,
      // Data-quality flags the printed script surfaces, because a script built
      // on spelling-estimated sounds should say so on the page rather than read
      // as authoritative.
      estimatedWords: list.filter(function (w) { return w.estimated; }).map(function (w) { return w.word; }),
      unalignedWords: unaligned
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Activity → skill map
  //
  // `strand` drives which model/lead wording the script opens with. `teaches`
  // is what goes on the page next to the activity name so the teacher can see
  // the instructional purpose rather than the app's label.
  // ──────────────────────────────────────────────────────────────────────
  var ACTIVITY_SKILLS = {
    isolation: {
      label: 'Sound Isolation', strand: 'phonemic_awareness',
      teaches: 'Identify the first, last, or middle sound in a spoken word.',
      prompt: 'What is the first sound in ___?',
      model: 'My turn. The first sound in ___ is /_/.',
      watchFor: 'A child who says the letter name instead of the sound.'
    },
    blending: {
      label: 'Blending', strand: 'phonemic_awareness',
      teaches: 'Push separate sounds together into a whole word.',
      prompt: 'Listen to the sounds. What word?',
      model: 'My turn. /_/ /_/ /_/. The word is ___.',
      watchFor: 'A child who repeats the sounds back without joining them.'
    },
    segmentation: {
      label: 'Segmentation', strand: 'phonemic_awareness',
      teaches: 'Break a whole word into its separate sounds.',
      prompt: 'Say the sounds in ___.',
      model: 'My turn. ___. /_/ /_/ /_/.',
      watchFor: 'A child who breaks by syllable or by letter instead of by sound.'
    },
    counting: {
      label: 'Sound Counting', strand: 'phonemic_awareness',
      teaches: 'Count the sounds in a spoken word.',
      prompt: 'How many sounds do you hear in ___?',
      model: 'My turn. ___. /_/ /_/ /_/. Three sounds.',
      watchFor: 'A child who counts letters. Digraphs are where this shows up.'
    },
    manipulation: {
      label: 'Sound Swap', strand: 'phonemic_awareness',
      teaches: 'Delete or substitute one sound and say the new word.',
      prompt: 'Say ___. Now say it again without /_/.',
      model: 'My turn. ___ without /_/ is ___.',
      watchFor: 'A child who changes more than the one sound you named.'
    },
    rhyming: {
      label: 'Rhyming', strand: 'phonemic_awareness',
      teaches: 'Hear that two words end the same way.',
      prompt: 'Which word rhymes with ___?',
      model: 'My turn. ___ and ___ rhyme. They both end with ___.',
      watchFor: 'A child matching the beginning sound instead of the ending.'
    },
    sound_sort: {
      label: 'Sound Sort', strand: 'phonemic_awareness',
      teaches: 'Group words by a shared sound.',
      prompt: 'Does ___ have the /_/ sound?',
      model: 'My turn. ___ has /_/. It goes here.',
      watchFor: 'Sorting by spelling rather than by sound.'
    },
    syllable_counting: {
      label: 'Syllable Counting', strand: 'phonemic_awareness',
      teaches: 'Count the beats in a spoken word.',
      prompt: 'How many parts do you hear in ___?',
      model: 'My turn. ___. Clap it with me.',
      watchFor: 'Counting sounds instead of beats.'
    },
    syllable_blending: {
      label: 'Syllable Blending', strand: 'phonemic_awareness',
      teaches: 'Join spoken syllables into a word.',
      prompt: 'Put the parts together. What word?',
      model: 'My turn. ___ plus ___ is ___.',
      watchFor: 'Losing the second syllable when the word is long.'
    },
    mapping: {
      label: 'Sound Mapping', strand: 'phonics',
      teaches: 'Match each sound to the letters that spell it.',
      prompt: 'Put one letter box under each sound.',
      model: 'My turn. /_/ goes in this box. These letters spell it.',
      watchFor: 'One box per letter instead of one box per sound.'
    },
    orthography: {
      label: 'Spelling Choice', strand: 'phonics',
      teaches: 'Choose the correct spelling of a heard word.',
      prompt: 'Which one spells ___?',
      model: 'My turn. ___ is spelled ___. I hear /_/ so I write ___.',
      watchFor: 'Choosing a plausible but incorrect vowel spelling.'
    },
    word_families: {
      label: 'Word Families', strand: 'phonics',
      teaches: 'Read a set of words that share a rime.',
      prompt: 'Change the first sound. What word now?',
      model: 'My turn. ___ ends with ___. Change /_/ to /_/ and it says ___.',
      watchFor: 'Reading the rime letter by letter each time.'
    },
    missing_letter: {
      label: 'Missing Letter', strand: 'phonics',
      teaches: 'Retrieve the grapheme for a heard sound.',
      prompt: 'Which letter makes the /_/ sound here?',
      model: 'My turn. I hear /_/. That is spelled ___.',
      watchFor: 'Guessing from word shape rather than from the sound.'
    },
    letter_tracing: {
      label: 'Letter Tracing', strand: 'phonics',
      teaches: 'Form the letter while saying its sound.',
      prompt: 'Trace it and say the sound.',
      model: 'My turn. I say /_/ every time I trace it.',
      watchFor: 'Tracing silently. The sound has to ride along with the motion.'
    },
    word_scramble: {
      label: 'Word Scramble', strand: 'phonics',
      teaches: 'Sequence graphemes into the correct order.',
      prompt: 'Put the letters in order to spell ___.',
      model: 'My turn. ___. The first sound is /_/ so ___ goes first.',
      watchFor: 'Rearranging by look instead of by sound order.'
    },
    spelling_bee: {
      label: 'Spelling', strand: 'encoding',
      teaches: 'Write a word from dictation.',
      prompt: 'Spell ___.',
      model: 'My turn. ___. I say the sounds, then I write each one.',
      watchFor: 'Writing before segmenting. Say the sounds first, every time.'
    },
    decoding: {
      label: 'Decoding', strand: 'fluency',
      teaches: 'Read a written word by sounding it out.',
      prompt: 'Sound it out. What word?',
      model: 'My turn. /_/ /_/ /_/. ___.',
      watchFor: 'Guessing from the first letter and the picture.'
    },
    read_sentence: {
      label: 'Read the Sentence', strand: 'fluency',
      teaches: 'Read the target word inside connected text.',
      prompt: 'Read the sentence. Which word finishes it?',
      model: 'My turn. I read the whole sentence, then I try each word.',
      watchFor: 'Choosing a word that looks right but does not make sense.'
    },
    read_passage: {
      label: 'Read the Story', strand: 'fluency',
      teaches: 'Read several connected sentences accurately.',
      prompt: 'Read it to me.',
      model: 'My turn. I read it once smoothly so you know how it should sound.',
      watchFor: 'Accuracy first. Speed comes after the words are secure.'
    },
    sentence_match: {
      label: 'Sentence Match', strand: 'fluency',
      teaches: 'Show understanding of what was read.',
      prompt: 'Which picture shows the sentence?',
      model: 'My turn. The sentence says ___, so I look for ___.',
      watchFor: 'Matching one word rather than the whole sentence.'
    }
  };

  var STRAND_ORDER = ['phonemic_awareness', 'phonics', 'encoding', 'fluency'];
  var STRAND_LABEL = {
    phonemic_awareness: 'Phonemic awareness',
    phonics: 'Phonics',
    encoding: 'Encoding',
    fluency: 'Fluency and connected text'
  };
  var STRAND_OBJECTIVE_VERB = {
    phonemic_awareness: 'hear and work with the separate sounds in spoken words',
    phonics: 'match sounds to the letters that spell them',
    encoding: 'write words from the sounds they hear',
    fluency: 'read the words accurately in connected text'
  };

  function activityInfo(id) {
    return ACTIVITY_SKILLS[id] || {
      label: String(id || '').replace(/_/g, ' '),
      strand: 'phonics',
      teaches: '',
      prompt: '',
      model: '',
      watchFor: ''
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Script assembly
  // ──────────────────────────────────────────────────────────────────────

  function slash(p) { return '/' + p + '/'; }
  function soundsOf(w) { return w.phonemes.map(slash).join(' '); }
  function cap(s) {
    var t = String(s || '');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }
  var NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function numberWord(n) {
    return (n >= 0 && n < NUMBER_WORDS.length) ? NUMBER_WORDS[n] : String(n);
  }
  function middleSound(w) {
    if (!w.phonemeCount) return '';
    return w.phonemes[Math.floor((w.phonemeCount - 1) / 2)];
  }
  function rimeOf(w) {
    if (w.familyEnding) return w.familyEnding;
    if (w.graphemes && w.graphemes.length > 1) {
      for (var i = 0; i < w.phonemes.length; i++) {
        if (isVowel(w.phonemes[i])) return w.graphemes.slice(i).join('');
      }
      return w.graphemes.slice(1).join('');
    }
    var spelled = String(w.word || '').toLowerCase();
    var m = spelled.match(/[aeiouy].*$/);
    return m ? m[0] : spelled;
  }
  function mappingLine(w) {
    if (!w.graphemes) return cap(w.word) + '. ' + soundsOf(w) + '.';
    return w.phonemes.map(function (p, i) {
      return slash(p) + ' is spelled ' + w.graphemes[i];
    }).join('. ') + '.';
  }

  /**
   * activitySay(id, word) -> { model, prompt }
   *
   * The point of a DI script is that the teacher reads a real sentence, not a
   * template with blanks in it. Every line below is built from this word's own
   * pack data, so the page a teacher holds says "Corn. /k/ /or/ /n/. Three
   * sounds." rather than "___. /_/ /_/ /_/. Three sounds." When there is no
   * word to draw on, the generic wording in ACTIVITY_SKILLS is the fallback.
   */
  function activitySayRaw(id, w) {
    var info = activityInfo(id);
    if (!w || !w.word) {
      return { model: info.model || '', prompt: info.prompt || '' };
    }
    var W = String(w.word || '');
    var sounds = soundsOf(w);
    var first = slash(w.firstSound);
    var g0 = (w.graphemes && w.graphemes[0]) || String(w.word).charAt(0);
    var syl = (w.syllables && w.syllables.length > 1) ? w.syllables : null;

    switch (id) {
      case 'isolation':
        return {
          model: 'My turn. ' + W + '. The first sound is ' + first + '.',
          prompt: 'Your turn. What is the first sound in ' + W + '?'
        };
      case 'blending':
        return {
          model: 'My turn. ' + sounds + '. The word is ' + W + '.',
          prompt: 'Your turn. ' + sounds + '. What word?'
        };
      case 'segmentation':
        return {
          model: 'My turn. ' + W + '. ' + sounds + '.',
          prompt: 'Your turn. Say the sounds in ' + W + '.'
        };
      case 'counting':
        return {
          model: 'My turn. ' + W + '. ' + sounds + '. ' + numberWord(w.phonemeCount) + ' sounds.',
          prompt: 'Your turn. How many sounds do you hear in ' + W + '?'
        };
      case 'manipulation': {
        var task = w.manipulationTask;
        if (task && task.answer) {
          return {
            model: 'My turn. ' + (task.instruction || ('Say ' + W + '.'))
              + ' The answer is ' + task.answer + '.',
            prompt: 'Your turn. ' + (task.instruction || ('Say ' + W + ' without ' + first + '.'))
          };
        }
        return {
          model: 'My turn. ' + W + ' without ' + first + '. Listen to what is left.',
          prompt: 'Your turn. Say ' + W + '. Now say it again without ' + first + '.'
        };
      }
      case 'rhyming':
        return {
          model: 'My turn. ' + W + ' and ' + (w.rhymeWord || '') + ' rhyme. They both end with '
            + rimeOf(w) + '.',
          prompt: 'Your turn. Which word rhymes with ' + W + '?'
        };
      case 'sound_sort':
        return {
          model: 'My turn. ' + W + ' has ' + first + ' at the beginning. It goes here.',
          prompt: 'Your turn. Does ' + W + ' have ' + first + '?'
        };
      case 'syllable_counting':
        return {
          model: 'My turn. ' + W + '. ' + (syl ? syl.join(' - ') : W) + '. '
            + numberWord(w.syllableCount) + ' part' + (w.syllableCount === 1 ? '' : 's') + '.',
          prompt: 'Your turn. Clap it with me. How many parts in ' + W + '?'
        };
      case 'syllable_blending':
        return {
          model: 'My turn. ' + (syl ? syl.join(' - ') : W) + '. ' + W + '.',
          prompt: 'Your turn. Put the parts together. What word?'
        };
      case 'mapping':
        return {
          model: 'My turn. ' + W + '. ' + mappingLine(w) + ' One box for each sound.',
          prompt: 'Your turn. Put one letter box under each sound in ' + W + '.'
        };
      case 'orthography':
        return {
          model: 'My turn. ' + W + '. I hear ' + sounds + ', so I write ' + w.word + '.',
          prompt: 'Your turn. Which one spells ' + W + '?'
        };
      case 'word_families':
        return {
          model: 'My turn. ' + W + ' ends with ' + rimeOf(w) + '. Change ' + first
            + ' and it says ' + (w.rhymeWord || '') + '.',
          prompt: 'Your turn. Change the first sound in ' + W + '. What word now?'
        };
      case 'missing_letter':
        return {
          model: 'My turn. In ' + W + ' I hear ' + first + ' first. That sound is spelled ' + g0 + '.',
          prompt: 'Your turn. Which letter makes the ' + first + ' sound in ' + W + '?'
        };
      case 'letter_tracing':
        return {
          model: 'My turn. I say ' + first + ' every time I trace ' + g0 + '.',
          prompt: 'Your turn. Trace ' + g0 + ' and say ' + first + '.'
        };
      case 'word_scramble':
        return {
          model: 'My turn. ' + W + '. The first sound is ' + first + ', so ' + g0 + ' goes first.',
          prompt: 'Your turn. Put the letters in order to spell ' + W + '.'
        };
      case 'spelling_bee':
        return {
          model: 'My turn. ' + W + '. ' + sounds + '. Now I write one sound at a time.',
          prompt: 'Your turn. Say the sounds, then spell ' + W + '.'
        };
      case 'decoding':
        return {
          model: 'My turn. ' + sounds + '. ' + W + '.',
          prompt: 'Your turn. Sound it out. What word?'
        };
      case 'read_sentence':
        return {
          model: w.sentence
            ? 'My turn. I read the whole sentence first. "' + w.sentence + '"'
            : 'My turn. I read the whole sentence first, then I try each word.',
          prompt: 'Your turn. Read the sentence. Which word finishes it?'
        };
      case 'read_passage':
        return {
          model: 'My turn. I read it once smoothly so you know how it should sound.',
          prompt: 'Your turn. Read it to me. Accuracy first, speed later.'
        };
      case 'sentence_match':
        return {
          model: w.sentence
            ? 'My turn. The sentence says "' + w.sentence + '", so I look for the one showing ' + w.word + '.'
            : 'My turn. I read the whole sentence, then I look for the one that matches all of it.',
          prompt: 'Your turn. Which one shows the sentence?'
        };
      default:
        return {
          model: info.model ? 'My turn. ' + W + '.' : '',
          prompt: info.prompt || ('Your turn. ' + W + '.')
        };
    }
  }

  // Capitalize the first letter of the line and of each sentence after it.
  // Only a letter is touched, so "/or/ is spelled or." keeps its slashes.
  function sentenceCase(line) {
    var s = String(line || '').trim();
    if (!s) return '';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return s.replace(/([.!?]\s+)([a-z])/g, function (_m, punct, ch) {
      return punct + ch.toUpperCase();
    });
  }

  /**
   * Some activities need a particular field to say anything sensible: rhyming
   * needs a rhyme word, Sound Swap needs a manipulation task, Read the Sentence
   * needs a sentence. Scripting from whichever word happened to sort first
   * printed "Storm and  rhyme. They both end with orm." on the teacher's page.
   * Pick the first assigned word that can actually carry the line.
   */
  var SCRIPT_WORD_REQUIREMENT = {
    rhyming: function (w) { return !!w.rhymeWord; },
    word_families: function (w) { return !!(w.rhymeWord && (w.familyEnding || w.graphemes)); },
    manipulation: function (w) { return !!(w.manipulationTask && w.manipulationTask.answer); },
    read_sentence: function (w) { return !!w.sentence; },
    sentence_match: function (w) { return !!w.sentence; },
    syllable_counting: function (w) { return w.syllableCount > 1; },
    syllable_blending: function (w) { return w.syllableCount > 1; },
    mapping: function (w) { return !!w.graphemes; },
    missing_letter: function (w) { return !!w.graphemes; },
    word_scramble: function (w) { return !!w.graphemes; },
    letter_tracing: function (w) { return !!w.graphemes; }
  };
  function pickScriptWord(id, assigned, fallbackPool) {
    var need = SCRIPT_WORD_REQUIREMENT[id];
    var list = (assigned && assigned.length) ? assigned : [];
    if (!need) return list[0] || (fallbackPool || [])[0] || null;
    var hit = list.filter(need)[0];
    if (hit) return hit;
    // Nothing in this activity's own words works. A word from elsewhere in the
    // set still models the skill correctly, which beats a sentence with a hole
    // in it. If nothing in the whole set qualifies, fall back to the generic
    // wording by returning null.
    return (fallbackPool || []).filter(need)[0] || null;
  }

  function activitySay(id, w) {
    var raw = activitySayRaw(id, w);
    return { model: sentenceCase(raw.model), prompt: sentenceCase(raw.prompt) };
  }

  function describeFocus(analysis) {
    var focus = analysis.focusGpcs.slice(0, 3);
    if (focus.length) {
      return focus.map(function (g) {
        return 'the ' + slash(g.phoneme) + ' sound spelled ' + g.grapheme;
      }).join(', ');
    }
    var top = analysis.gpcs.filter(function (g) { return g.focusEligible; }).slice(0, 2);
    if (top.length) {
      return top.map(function (g) {
        return 'the ' + slash(g.phoneme) + ' sound spelled ' + g.grapheme;
      }).join(' and ');
    }
    return 'the sounds in this word set';
  }

  /**
   * Round-robin word allocation. Each activity gets its planned count drawn in
   * order and wrapping, so a plan asking for more items than there are words
   * repeats them evenly instead of exhausting the list on the first activity.
   */
  function allocate(words, activities) {
    var out = {};
    var cursor = 0;
    activities.forEach(function (a) {
      var take = [];
      var wanted = Math.max(0, Number(a.count) || 0);
      for (var i = 0; i < wanted && words.length; i++) {
        take.push(words[cursor % words.length]);
        cursor++;
      }
      out[a.id] = take;
    });
    return out;
  }

  function correctionSection(mastery) {
    return {
      id: 'correction',
      title: 'Correction procedure',
      minutes: 0,
      intent: 'Use this the moment an error happens, not at the end.',
      steps: [
        { step: 'Model', teacherSays: 'Listen. This one is ___.', note: 'Give the answer immediately. Do not let the child keep guessing.' },
        { step: 'Lead', teacherSays: 'Say it with me. ___.', note: 'Say it together until it is smooth. Two or three times is normal.' },
        { step: 'Test', teacherSays: 'Your turn. ___?', note: 'The child answers alone. If it is still wrong, model again.' },
        { step: 'Delayed test', teacherSays: 'Come back to it after two or three other items.', note: 'An item is only fixed when it is right after a gap.' }
      ],
      notes: [
        'Do not say "no" or "wrong". Give the answer, practise it together, then hand it back.',
        'Keep the pace brisk. Long pauses after an error are what turn a small miss into a large one.',
        'Mastery for this lesson is ' + mastery + ' consecutive correct on an item before moving on.'
      ]
    };
  }

  /**
   * buildLessonScript(analysis, plan, opts) -> script
   *
   * `plan` is the lesson-plan config the setup screen already produces:
   *   { activities: [{id, count}], order: [...], masteryThreshold, estimatedMinutes }
   * When it is absent (Quick Practice), the script still builds. It just covers
   * the whole word set with the default activity emphasis rather than a plan.
   */
  function buildLessonScript(analysis, plan, opts) {
    opts = opts || {};
    var mastery = Math.max(1, Number(plan && plan.masteryThreshold) || 3);
    var activities = (plan && Array.isArray(plan.activities) && plan.activities.length)
      ? plan.activities.filter(function (a) { return a && a.id; })
      : [];
    var planned = activities.length > 0;

    var words = analysis.words;
    var allocation = allocate(words, activities);

    // Strand emphasis decides the model/lead wording. With no plan, a word set
    // is treated as phonemic-awareness first, which is the Word Sounds default.
    var strandCounts = {};
    activities.forEach(function (a) {
      var s = activityInfo(a.id).strand;
      strandCounts[s] = (strandCounts[s] || 0) + (Number(a.count) || 1);
    });
    var primaryStrand = STRAND_ORDER.filter(function (s) { return strandCounts[s]; })[0] || 'phonemic_awareness';

    var focusText = describeFocus(analysis);

    // Model and lead on words that actually carry the pattern. Taking the first
    // two words in list order would happily open the lesson on the one word that
    // is nothing like the rest of the set.
    var focusPhonemes = analysis.focusGpcs.map(function (g) { return g.phoneme; });
    var teachingOrder = words.slice().sort(function (a, b) {
      var score = function (w) {
        return w.phonemes.filter(function (p) { return focusPhonemes.indexOf(p) >= 0; }).length;
      };
      var d = score(b) - score(a);
      if (d) return d;
      // Shorter words first among equals: fewer sounds is the easier model.
      return a.phonemeCount - b.phonemeCount;
    });
    var modelWords = teachingOrder.slice(0, 2);
    var leadWords = teachingOrder.slice(2, 5).length ? teachingOrder.slice(2, 5) : teachingOrder.slice(0, 3);

    var objective = 'Given ' + analysis.wordCount + ' words built on ' + focusText
      + ', students will ' + STRAND_OBJECTIVE_VERB[primaryStrand]
      + ', with ' + mastery + ' consecutive correct responses per item.';

    var sections = [];

    // 1. Sound warm-up
    // Focus sounds lead the warm-up. Pure frequency ordering buries the sound
    // the lesson is about under whichever consonant happens to recur most.
    var warmupPhonemes = analysis.phonemes.slice().sort(function (a, b) {
      var aF = focusPhonemes.indexOf(a.phoneme) >= 0 ? 1 : 0;
      var bF = focusPhonemes.indexOf(b.phoneme) >= 0 ? 1 : 0;
      if (aF !== bF) return bF - aF;
      return b.wordCount - a.wordCount;
    }).slice(0, 6);
    sections.push({
      id: 'warmup',
      title: 'Sound warm-up',
      minutes: 2,
      intent: 'Get the sounds in this lesson fluent before any word is read.',
      teacherDoes: [
        'Show or say each sound below. Keep it fast. Aim for about one sound per second.',
        'Any sound the group is slow on is the one to model again before you start.'
      ],
      teacherSays: [
        'We are warming up our sounds. When I point, you say the sound.',
        'My turn first. ' + (warmupPhonemes[0] ? slash(warmupPhonemes[0].phoneme) : slash('_')) + '.',
        'Your turn.'
      ],
      items: warmupPhonemes.map(function (p) {
        return {
          primary: slash(p.phoneme),
          secondary: p.category + ', in ' + p.wordCount + ' word' + (p.wordCount === 1 ? '' : 's')
            + ' (' + p.positions.join(', ') + ')'
        };
      })
    });

    // 2. Model
    sections.push({
      id: 'model',
      title: 'Model. "My turn"',
      minutes: 3,
      intent: 'The child watches. They do not respond yet.',
      teacherDoes: [
        'Do every step yourself, out loud, at normal speed.',
        'Two examples are enough. A third is usually one too many.'
      ],
      teacherSays: modelWords.length ? modelWords.reduce(function (acc, w) {
        if (primaryStrand === 'phonemic_awareness') {
          acc.push('Watch me. I am going to say the sounds in this word, then say the word.');
          acc.push(soundsOf(w) + '. ' + cap(w.word) + '.');
        } else if (primaryStrand === 'encoding') {
          acc.push('Watch me. I say the word, then the sounds, then I write each sound.');
          acc.push(cap(w.word) + '. ' + soundsOf(w) + '.');
        } else {
          acc.push('Watch me read this word. I say each sound, then I put them together.');
          acc.push(soundsOf(w) + '. ' + cap(w.word) + '.');
        }
        return acc;
      }, []) : ['Watch me.'],
      items: modelWords.map(function (w) {
        return { primary: w.word, secondary: soundsOf(w) + '  ·  ' + w.shape + '  ·  ' + w.syllableType };
      })
    });

    // 3. Lead
    sections.push({
      id: 'lead',
      title: 'Lead. "Together"',
      minutes: 4,
      intent: 'You and the child do it at the same time. Your voice fades as theirs holds.',
      teacherDoes: [
        'Say it with them. Drop your volume on the second and third repetition.',
        'Stay on this step until the group is together. Moving on early is what produces the errors you then have to correct.'
      ],
      teacherSays: ['Say it with me. Ready.'].concat(leadWords.map(function (w) {
        return soundsOf(w) + '. ' + cap(w.word) + '.';
      })).concat(['Again, a little faster.']),
      items: leadWords.map(function (w) {
        return { primary: w.word, secondary: soundsOf(w) + '  ·  ' + w.shape };
      })
    });

    // 4. Test blocks, one per planned activity, in the teacher's order
    var testSections = activities.map(function (a, idx) {
      var info = activityInfo(a.id);
      var assigned = allocation[a.id] || [];
      return {
        id: 'test_' + a.id,
        title: 'Your turn ' + (idx + 1) + '. ' + info.label,
        minutes: Math.max(1, Math.ceil((Number(a.count) || 0) * 0.5)),
        strand: STRAND_LABEL[info.strand],
        intent: info.teaches,
        teacherDoes: [
          'The child works in the app. You watch and score, you do not prompt unless there is an error.',
          info.watchFor ? 'Watch for: ' + info.watchFor : ''
        ].filter(Boolean),
        // Scripted from the first word this activity actually gets, so the
        // teacher reads a sentence rather than filling in blanks at the table.
        teacherSays: (function () {
          var say = activitySay(a.id, pickScriptWord(a.id, assigned, words));
          return [say.model, say.prompt].filter(Boolean);
        })(),
        items: assigned.map(function (w) {
          return {
            primary: w.word,
            secondary: soundsOf(w) + '  ·  ' + w.phonemeCount + ' sounds'
              + (a.id === 'read_sentence' && w.sentence ? '  ·  "' + w.sentence + '"' : '')
              + (a.id === 'rhyming' && w.rhymeWord ? '  ·  rhymes with ' + w.rhymeWord : '')
              + (a.id === 'word_families' && w.familyEnding ? '  ·  ' + w.familyEnding : '')
          };
        }),
        mastery: mastery
      };
    });
    sections = sections.concat(testSections);

    // 5. Correction procedure
    sections.push(correctionSection(mastery));

    // 6. Close
    sections.push({
      id: 'close',
      title: 'Check and close',
      minutes: 2,
      intent: 'Decide what happens tomorrow before the child leaves the table.',
      teacherDoes: [
        'Re-test two items the child missed earlier. Those are the ones that tell you whether the lesson held.',
        'Any correspondence still wrong after correction goes into the next warm-up.',
        'A child at ' + mastery + ' consecutive correct across the set is ready for the next pattern. Below that, reteach this one.'
      ],
      teacherSays: [
        'Let me hear these two again.',
        'Tell me one word you can read now that you could not read before.'
      ],
      items: []
    });

    var totalMinutes = sections.reduce(function (sum, s) { return sum + (s.minutes || 0); }, 0);

    return {
      version: VERSION,
      generatedFrom: {
        wordCount: analysis.wordCount,
        planned: planned,
        activityCount: activities.length,
        grade: analysis.grade,
        language: analysis.language
      },
      title: 'Direct Instruction lesson script',
      subtitle: (analysis.grade ? analysis.grade + '  ·  ' : '')
        + analysis.wordCount + ' words  ·  '
        + (planned ? activities.length + ' activities' : 'Quick Practice'),
      objective: objective,
      focusText: focusText,
      primaryStrand: STRAND_LABEL[primaryStrand],
      mastery: mastery,
      estimatedMinutes: totalMinutes,
      materials: [
        'The word list in this script, on the table or on the board.',
        'The device running Word Sounds, with this pack loaded.',
        planned ? 'The lesson plan you built, in this order.' : 'Quick Practice mode.',
        'Somewhere to mark which items were missed. The correction procedure depends on you remembering them.'
      ],
      sections: sections,
      wordList: analysis.words.map(function (w) {
        return {
          word: w.word,
          sounds: soundsOf(w),
          count: w.phonemeCount,
          shape: w.shape,
          syllableType: w.syllableType,
          graphemes: w.graphemes ? w.graphemes.join(' | ') : '',
          estimated: w.estimated
        };
      }),
      // Everything the teacher should know about how trustworthy this is.
      caveats: [].concat(
        analysis.estimatedWords.length
          ? ['Sounds for ' + analysis.estimatedWords.join(', ') + ' were estimated from spelling, not looked up. Check them before you read them aloud.']
          : [],
        analysis.unalignedWords.length
          ? ['Letters could not be matched to sounds for ' + analysis.unalignedWords.join(', ') + '. The sound-mapping steps for those words need your own alignment.']
          : [],
        analysis.focusGpcs.length
          ? []
          : ['No single pattern repeats across this word set, so the objective below is written broadly. A tighter word list produces a tighter lesson.'],
        ['This script is generated from the word list. It is a starting point for your planning, not a curriculum, and it has not been reviewed by anyone but you.']
      )
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Plain-text rendering, for copy-to-clipboard and for tests.
  // ──────────────────────────────────────────────────────────────────────
  function scriptToText(script) {
    if (!script) return '';
    var out = [];
    out.push(script.title);
    out.push(script.subtitle);
    out.push('');
    out.push('OBJECTIVE');
    out.push(script.objective);
    out.push('');
    out.push('About ' + script.estimatedMinutes + ' minutes. Mastery: ' + script.mastery + ' consecutive correct.');
    out.push('');
    out.push('MATERIALS');
    script.materials.forEach(function (m) { out.push('  - ' + m); });
    out.push('');
    script.sections.forEach(function (s) {
      out.push('----------------------------------------');
      out.push(s.title.toUpperCase() + (s.minutes ? '  (' + s.minutes + ' min)' : ''));
      if (s.intent) out.push(s.intent);
      if (s.strand) out.push('Strand: ' + s.strand);
      out.push('');
      (s.teacherSays || []).forEach(function (line) { out.push('  SAY: ' + line); });
      (s.teacherDoes || []).forEach(function (line) { out.push('  DO:  ' + line); });
      (s.steps || []).forEach(function (st) {
        out.push('  ' + st.step + ': "' + st.teacherSays + '"');
        out.push('        ' + st.note);
      });
      if (s.items && s.items.length) {
        out.push('');
        s.items.forEach(function (it) {
          out.push('    ' + it.primary + (it.secondary ? '   ' + it.secondary : ''));
        });
      }
      (s.notes || []).forEach(function (line) { out.push('  * ' + line); });
      out.push('');
    });
    out.push('----------------------------------------');
    out.push('WORD LIST');
    script.wordList.forEach(function (w) {
      out.push('  ' + w.word + '   ' + w.sounds + '   ' + w.count + ' sounds   ' + w.shape + '   ' + w.syllableType
        + (w.estimated ? '   [estimated]' : ''));
    });
    out.push('');
    out.push('BEFORE YOU TEACH THIS');
    script.caveats.forEach(function (c) { out.push('  - ' + c); });
    return out.join('\n');
  }

  var api = {
    VERSION: VERSION,
    supportsLanguage: supportsLanguage,
    analyzeWordSet: analyzeWordSet,
    buildLessonScript: buildLessonScript,
    scriptToText: scriptToText,
    ACTIVITY_SKILLS: ACTIVITY_SKILLS,
    // Exposed for tests and for a future on-screen prompt renderer.
    _analyzeWord: analyzeWord,
    _classifyPhoneme: classifyPhoneme,
    _alignGraphemes: alignGraphemes
  };

  if (typeof window !== 'undefined') window.AlloWordSoundsDI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
