// Standalone Present & Export on AlloFlow Packets (packets-present-export.html).
// Mounts AlloModules.WordPractice inline using local offline banks:
//   - packets_vocab_bank_en.js (meanings and example sentences)
//   - word_sounds_phonemes_en.js + word_sounds_core.js (sound segmentation)
//   - audio_bank/phonemes.json + word_audio_shards/ via packets_vocab_media.js (recorded speech)
//   - word_sounds_symbols_en.js (1,000+ Mulberry and OpenMoji pictures)
//   - vendor/pptxgenjs-3.12.0.bundle.js (loaded on demand for PowerPoint export)
(function (root) {
  'use strict';

  var doc = root.document;
  var $ = function (id) { return doc.getElementById(id); };
  var statusEl = $('pe-status');
  var clearStatusEl = $('pe-clear-status');
  var host = $('present-export-host');
  var myWordsBtn = $('pe-load-my-words');
  var vocabWordsBtn = $('pe-load-vocab-words');
  var wsWordsBtn = $('pe-load-ws-words');
  var flashcardsBtn = $('pe-export-flashcards');
  var frayerBtn = $('pe-export-frayer');
  var sortingCardsBtn = $('pe-export-sorting-cards');
  var worksheetBtn = $('pe-export-worksheet');
  var bingoBtn = $('pe-export-bingo');
  var loopCardsBtn = $('pe-export-loop-cards');
  var wordWallBtn = $('pe-export-word-wall');
  var openSrBtn = $('pe-open-symbol-runner');
  var fillPicsBtn = $('pe-fill-pictures');

  function say(text) {
    if (statusEl) statusEl.textContent = text || '';
  }

  // Built-in starter sets so meaning, example sentences, and sound boxes are ready immediately.
  var STARTERS = {
    'short-vowels': {
      title: 'Short vowels with pictures',
      words: [
        { word: 'cat', definition: 'a small furry animal with whiskers that purrs', example: 'The cat slept on the warm rug.', phonemes: ['k', 'a', 't'] },
        { word: 'dog', definition: 'a friendly four-legged pet that barks', example: 'Our dog ran to catch the red ball.', phonemes: ['d', 'o', 'g'] },
        { word: 'sun', definition: 'the bright star in the sky that gives light and warmth', example: 'The sun shines bright at noon.', phonemes: ['s', 'u', 'n'] },
        { word: 'bed', definition: 'a piece of furniture for sleeping on', example: 'He put the blanket on the bed.', phonemes: ['b', 'e', 'd'] },
        { word: 'fish', definition: 'an animal with fins and scales that lives in water', example: 'A gold fish swam across the pond.', phonemes: ['f', 'i', 'sh'] },
        { word: 'frog', definition: 'a small jumping animal that lives near water', example: 'The green frog hopped onto a leaf.', phonemes: ['f', 'r', 'o', 'g'] },
        { word: 'ship', definition: 'a large boat that sails across deep water', example: 'The ship sailed out of the harbor.', phonemes: ['sh', 'i', 'p'] },
        { word: 'cup', definition: 'a small round container for drinking', example: 'Fill the cup with cold water.', phonemes: ['k', 'u', 'p'] },
      ],
    },
    'blends-digraphs': {
      title: 'Blends and digraphs',
      words: [
        { word: 'train', definition: 'a line of rail cars pulled along a track', example: 'The train stopped at the station.', phonemes: ['t', 'r', 'ay', 'n'] },
        { word: 'cloud', definition: 'a white or gray mass of water drops high in the sky', example: 'A soft cloud floated past the hill.', phonemes: ['k', 'l', 'ow', 'd'] },
        { word: 'plant', definition: 'a living thing that grows in soil and makes leaves', example: 'Water the plant by the sunny window.', phonemes: ['p', 'l', 'a', 'n', 't'] },
        { word: 'brush', definition: 'a tool with bristles used for painting or cleaning', example: 'Dip the brush in blue paint.', phonemes: ['b', 'r', 'u', 'sh'] },
        { word: 'shell', definition: 'the hard outer cover of a sea animal or egg', example: 'She found a pink shell on the sand.', phonemes: ['sh', 'e', 'l'] },
        { word: 'whale', definition: 'a huge ocean mammal that breathes air through a blowhole', example: 'The gray whale splashed near the boat.', phonemes: ['w', 'ay', 'l'] },
        { word: 'clock', definition: 'a tool that shows what time it is', example: 'Look at the clock before recess starts.', phonemes: ['k', 'l', 'o', 'k'] },
        { word: 'star', definition: 'a bright point of light far out in space', example: 'The brightest star came out at dusk.', phonemes: ['s', 't', 'ar'] },
      ],
    },
    'science-math': {
      title: 'Science and math vocabulary',
      words: [
        { word: 'habitat', definition: 'the natural home where a plant or animal lives', example: 'A pond is a good habitat for turtles.' },
        { word: 'evaporate', definition: 'to change from liquid water into invisible water vapor', example: 'Puddles evaporate in the warm sun.' },
        { word: 'magnet', definition: 'an object that pulls iron and steel toward itself', example: 'The magnet picked up ten paper clips.' },
        { word: 'fraction', definition: 'a number showing equal parts of one whole', example: 'One half is a simple fraction.' },
        { word: 'perimeter', definition: 'the total distance all the way around a flat shape', example: 'Add every side length to find the perimeter.' },
        { word: 'symmetry', definition: 'an exact match between two halves across a line', example: 'A butterfly wing shows symmetry.' },
      ],
    },
    academic: {
      title: 'Academic study words',
      words: [
        { word: 'observe', definition: 'to watch and notice details carefully', example: 'Use a hand lens to observe the crystal.' },
        { word: 'predict', definition: 'to tell what you think will happen next using clues', example: 'Predict which seed will sprout first.' },
        { word: 'compare', definition: 'to check how two things are alike and how they differ', example: 'Compare the two graphs side by side.' },
        { word: 'pattern', definition: 'things arranged following a steady rule that repeats', example: 'Skip counting makes a number pattern.' },
        { word: 'evidence', definition: 'facts or clues that help prove an answer is true', example: 'Point to evidence from the passage.' },
        { word: 'solution', definition: 'the answer to a problem, or a liquid mixture', example: 'Explain how you checked your solution.' },
      ],
    },
    'earth-space': {
      title: 'Earth and space',
      words: [
        { word: 'volcano', definition: 'an opening in Earth crust where magma, ash, and gases erupt', example: 'Hot lava flowed down the side of the volcano.' },
        { word: 'glacier', definition: 'a huge slow-moving river of compacted ice and snow on land', example: 'The glacier carved a wide U-shaped valley over thousands of years.' },
        { word: 'orbit', definition: 'the curved path an object follows around a star or planet in space', example: 'Earth completes one orbit around the sun every year.' },
        { word: 'eclipse', definition: 'an event in which one body in space moves into the shadow of another', example: 'During a solar eclipse, the moon briefly blocks the sun.' },
        { word: 'fossil', definition: 'the preserved remains or imprint of an ancient plant or animal in rock', example: 'The museum displayed a fern fossil pressed inside dark shale.' },
        { word: 'atmosphere', definition: 'the envelope of air and gases surrounding a planet', example: 'Earth atmosphere protects living things from harsh rays.' },
        { word: 'erosion', definition: 'the wearing away and carrying of soil and rock by wind, water, or ice', example: 'Planting grass helps slow soil erosion on steep hillsides.' },
        { word: 'weathering', definition: 'the breaking down of rocks into smaller pieces at Earth surface', example: 'Freezing water inside cracks causes rock weathering in winter.' },
      ],
    },
    'civics-geography': {
      title: 'Civics and geography',
      words: [
        { word: 'democracy', definition: 'a system of government in which citizens choose leaders and vote on laws', example: 'Voting in local elections is a key part of democracy.' },
        { word: 'constitution', definition: 'a written plan that sets the basic rules and powers of a government', example: 'The Constitution explains the three branches of national government.' },
        { word: 'citizen', definition: 'a legal member of a town, state, or country with shared rights and duties', example: 'Every citizen can stay informed about community issues.' },
        { word: 'peninsula', definition: 'a piece of land surrounded by water on three sides', example: 'Florida is a well-known peninsula on the Atlantic coast.' },
        { word: 'equator', definition: 'an imaginary line around the middle of Earth halfway between the poles', example: 'Places near the equator stay warm throughout the year.' },
        { word: 'hemisphere', definition: 'one half of Earth north, south, east, or west of a dividing line', example: 'North America lies in the Northern Hemisphere.' },
        { word: 'continent', definition: 'one of the seven very large landmasses on Earth', example: 'Asia is the largest continent in land area and population.' },
        { word: 'climate', definition: 'the usual pattern of weather in a place over many years', example: 'A desert climate receives very little rainfall each year.' },
      ],
    },
    'literary-craft': {
      title: 'Story and poetry craft',
      words: [
        { word: 'metaphor', definition: 'a figure of speech that calls one thing another to highlight a shared trait', example: 'Saying time is a thief uses a vivid metaphor.' },
        { word: 'simile', definition: 'a comparison of two unlike things using the words like or as', example: 'Her laugh sparkled like bells is a bright simile.' },
        { word: 'personification', definition: 'giving human feelings, traits, or actions to a nonliving object or animal', example: 'Saying the wind whispered secrets uses personification.' },
        { word: 'hyperbole', definition: 'an intentional big exaggeration used for emphasis or humor', example: 'My backpack weighs a ton today is a playful hyperbole.' },
        { word: 'alliteration', definition: 'repeating the same beginning consonant sound in nearby words', example: 'Busy bees buzzed brilliantly uses cheerful alliteration.' },
        { word: 'foreshadowing', definition: 'a subtle clue in a story hinting at what will happen later', example: 'Dark storm clouds at the start acted as foreshadowing.' },
        { word: 'stanza', definition: 'a grouped set of lines forming one section inside a poem', example: 'Read the second stanza aloud to hear the rhythm.' },
        { word: 'theme', definition: 'the central message or big life lesson a reader learns from a story', example: 'Courage and friendship formed the main theme of the novel.' },
      ],
    },
  };

  var dictionary = typeof root.createWordSoundsPhonemeData === 'function' ? root.createWordSoundsPhonemeData() : null;
  var wsCore = typeof root.createWordSoundsCore === 'function' ? root.createWordSoundsCore({ phonemes: dictionary }) : null;
  var vocabBank = root.AlloVocabBank || null;
  var symbols = root.AlloModules && root.AlloModules.WordSoundsSymbols ? root.AlloModules.WordSoundsSymbols : null;
  var loader = root.AlloWordSoundsTakeHome || null;
  var media = root.AlloVocabMedia || null;
  var myWords = root.AlloPacketMyWords || null;
  var wp = root.AlloModules && root.AlloModules.WordPractice ? root.AlloModules.WordPractice : null;

  var phonemeBank = {};
  var symbolPngCache = Object.create(null);
  var controller = null;
  var lastPack = null;
  var lastPackItemsByWord = Object.create(null);
  var pptxPromise = null;
  var symbolsLoadPromise = null;

  function setControllerPack(packConfig) {
    lastPack = packConfig || null;
    lastPackItemsByWord = Object.create(null);
    var items = packConfig && Array.isArray(packConfig.words) ? packConfig.words : [];
    items.forEach(function (it) {
      if (it && it.word) lastPackItemsByWord[String(it.word).toLowerCase()] = it;
    });
    if (controller && typeof controller.setPack === 'function') {
      controller.setPack(packConfig);
    }
  }

  function loadJson(url) {
    if (typeof root.fetch !== 'function') return Promise.reject(new Error('fetch unavailable'));
    return root.fetch(url).then(function (res) {
      if (!res.ok) throw new Error(url + ' ' + res.status);
      return res.json();
    });
  }

  function ensurePhonemeClips() {
    return loadJson('audio_bank/phonemes.json').then(function (data) {
      if (!data || typeof data !== 'object') return;
      Object.keys(data).forEach(function (k) {
        if (typeof data[k] === 'string' && /^data:audio\//i.test(data[k])) {
          phonemeBank[k] = data[k];
        }
      });
    }).catch(function () { return null; });
  }

  function ensureVocabBankLoaded() {
    if (!vocabBank || typeof vocabBank.load !== 'function') return Promise.resolve(null);
    return vocabBank.load().catch(function () { return null; });
  }

  function ensureSymbolsLoaded() {
    if (!symbols) return Promise.resolve(null);
    if (symbols.ready()) return Promise.resolve(symbols);
    if (!symbolsLoadPromise) {
      if (media && typeof media.pictures === 'function') {
        symbolsLoadPromise = media.pictures(symbols).catch(function () {
          symbolsLoadPromise = null;
          return null;
        });
      } else {
        symbolsLoadPromise = Promise.all((symbols.shards || []).map(function (shard) {
          return loadJson(shard.url).then(function (data) { symbols.add(data); });
        })).then(function () { return symbols; }, function () {
          symbolsLoadPromise = null;
          return null;
        });
      }
    }
    return symbolsLoadPromise;
  }

  // Bridge local word-audio shards into WordPractice ("Prepare audio") when online on same host.
  if (typeof root.getWordShardAudio !== 'function' && media && typeof media.clips === 'function' && loader) {
    root.getWordShardAudio = function (word) {
      var clean = String(word == null ? '' : word).trim().toLowerCase();
      if (!clean) return Promise.resolve('');
      return media.clips([clean], loader).then(function (out) {
        return out && out[clean] ? out[clean] : '';
      }).catch(function () { return ''; });
    };
  }

  function ensurePptx() {
    if (typeof root.PptxGenJS === 'function') return Promise.resolve(root.PptxGenJS);
    if (pptxPromise) return pptxPromise;
    pptxPromise = new Promise(function (resolve, reject) {
      if (!doc || !doc.head) { reject(new Error('Document unavailable')); return; }
      var script = doc.createElement('script');
      script.src = 'vendor/pptxgenjs-3.12.0.bundle.js';
      script.async = true;
      script.onload = function () {
        if (typeof root.PptxGenJS === 'function') resolve(root.PptxGenJS);
        else { pptxPromise = null; reject(new Error('Could not start PowerPoint export.')); }
      };
      script.onerror = function () {
        script.remove();
        pptxPromise = null;
        reject(new Error('Could not load vendor/pptxgenjs-3.12.0.bundle.js.'));
      };
      doc.head.appendChild(script);
    });
    return pptxPromise;
  }

  function creditForSet(setName) {
    if (setName === 'diagram') return { set: 'AlloFlow Curriculum Diagram', license: 'Built-in curriculum diagram' };
    if (symbols && symbols.credits && symbols.credits[setName]) return symbols.credits[setName];
    return setName === 'openmoji'
      ? { set: 'OpenMoji', license: 'CC BY-SA 4.0' }
      : { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' };
  }

  function resolveEntry(word) {
    var raw = String(word == null ? '' : word).trim();
    if (!raw) return null;
    var key = raw.toLowerCase();
    var out = {};
    if (vocabBank && vocabBank.ready && vocabBank.ready()) {
      var senses = typeof vocabBank.senses === 'function' ? vocabBank.senses(raw) : [];
      if ((!senses || !senses.length) && typeof vocabBank.head === 'function') {
        var hw = vocabBank.head(raw);
        if (hw) senses = vocabBank.senses(hw);
      }
      if (senses && senses.length) {
        out.definition = senses[0].def || '';
        out.example = senses[0].example || '';
      }
    }
    if (wsCore && typeof wsCore.dictionarySounds === 'function') {
      var dict = wsCore.dictionarySounds(key);
      if (dict && Array.isArray(dict.sounds) && dict.sounds.length) {
        var analysis = typeof wsCore.soundAnalysis === 'function' ? wsCore.soundAnalysis(key, dict.sounds) : null;
        if (analysis && Array.isArray(analysis.chunks) && analysis.chunks.length) {
          out.phonemes = analysis.chunks.map(function (c, i) {
            return { label: c.text || dict.sounds[i] || '', soundKey: c.soundKey || dict.sounds[i] || '' };
          });
        } else {
          out.phonemes = dict.sounds.map(function (s) { return { label: s, soundKey: s }; });
        }
      }
    }
    if (symbolPngCache[key]) {
      out.image = symbolPngCache[key].src;
      out.imageAlt = symbolPngCache[key].alt;
      out.imageAttribution = symbolPngCache[key].credit;
    }
    return out;
  }

  function searchSymbols(query) {
    var matcher = root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher);
    if (matcher && typeof matcher.searchSymbols === 'function') {
      return ensureSymbolsLoaded().catch(function () { return null; }).then(function () {
        return matcher.searchSymbols(query, {
          symbols: symbols,
          creditForSet: creditForSet,
          preferDiagrams: true,
          allowOnlineGlobalSymbols: false,
          limit: 24,
        });
      });
    }
    if (!symbols) return Promise.resolve([]);
    return ensureSymbolsLoaded().then(function () {
      if (!symbols || typeof symbols.words !== 'function') return [];
      var q = String(query || '').trim().toLowerCase();
      var hits = [];
      var words = symbols.words();
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var entry = symbols.get(w);
        if (!entry || !entry.svg) continue;
        var label = String(entry.label || w).toLowerCase();
        if (q && w.toLowerCase().indexOf(q) < 0 && label.indexOf(q) < 0) continue;
        hits.push({
          word: w,
          label: entry.label || w,
          svg: entry.svg,
          set: entry.set,
          credit: creditForSet(entry.set),
        });
        if (hits.length >= 24) break;
      }
      return hits;
    });
  }

  function enrichItems(title, rawWords) {
    return (rawWords || []).map(function (item) {
      var record = typeof item === 'string' ? { word: item } : Object.assign({}, item);
      var enriched = resolveEntry(record.word);
      if (enriched) {
        if (!record.definition && enriched.definition) record.definition = enriched.definition;
        if (!record.example && enriched.example) record.example = enriched.example;
        if ((!record.phonemes || !record.phonemes.length) && enriched.phonemes) record.phonemes = enriched.phonemes;
        var hasPic = !!(record.image || (record.picture && record.picture.src) || (typeof record.picture === 'string' && record.picture));
        if (!hasPic && enriched.image) {
          record.image = enriched.image;
          record.imageAlt = enriched.imageAlt;
          record.imageAttribution = enriched.imageAttribution;
        }
      }
      return record;
    });
  }

  function applyStarter(id) {
    var starter = STARTERS[id];
    if (!starter || !controller) return;
    var words = enrichItems(starter.title, starter.words);
    setControllerPack({
      title: starter.title,
      language: 'en',
      words: words,
      options: { mode: 'vocabulary', includePictures: true },
    });
    say('Loaded "' + starter.title + '" (' + words.length + ' words).');
    matchBuiltInPictures({ quiet: true });
  }

  function currentHostTitle() {
    if (!host) return 'Word Fluency Pop-Up';
    var input = host.querySelector('.awp-grid .awp-fields input:not([type="file"])');
    return (input && input.value.trim()) || 'Word Fluency Pop-Up';
  }

  function currentHostWords() {
    if (!host) return [];
    var area = host.querySelector('.awp-grid .awp-fields textarea');
    if (!area || !area.value) return [];
    return area.value.split(/[\r\n,]+/).map(function (w) { return w.trim(); }).filter(Boolean);
  }

  function mergeMyWordsEntries(wordsList) {
    if (!myWords || typeof myWords.getMany !== 'function' || !wordsList.length) return Promise.resolve({});
    return myWords.getMany(wordsList).catch(function () { return {}; });
  }

  function matchBuiltInPictures(opts) {
    var quiet = !!(opts && opts.quiet);
    var matcher = root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher);
    if ((!symbols && !(matcher && typeof matcher.matchWord === 'function')) || !wp || typeof wp.rasterizeImage !== 'function' || !controller) {
      if (!quiet) say('Built-in picture matching is unavailable here.');
      return Promise.resolve();
    }
    var list = currentHostWords();
    if (!list.length) {
      if (!quiet) say('Type at least one word below before matching pictures.');
      return Promise.resolve();
    }
    if (!quiet) say('Loading built-in pictures...');
    return Promise.all([
      ensureSymbolsLoaded().catch(function () { return null; }),
      ensureVocabBankLoaded(),
      mergeMyWordsEntries(list),
    ]).then(function (results) {
      var savedByWord = results[2] || {};
      var matched = 0;
      return Promise.all(list.map(function (word) {
        var key = word.toLowerCase();
        var saved = savedByWord[word] || savedByWord[key];
        if (saved && saved.picture && saved.picture.dataUri) {
          symbolPngCache[key] = {
            src: saved.picture.dataUri,
            alt: word,
            credit: saved.picture.credit || 'Saved in My words',
          };
          matched++;
          return null;
        }
        var fresh = resolveEntry(word);
        var existing = lastPackItemsByWord[key] || fresh;
        var defForMatch = (existing && existing.definition) || (fresh && fresh.definition) || '';
        var match = matcher && typeof matcher.matchWord === 'function'
          ? matcher.matchWord(
              { word: word, definition: defForMatch },
              { symbols: symbols, creditForSet: creditForSet, preferDiagrams: true }
            )
          : null;
        var entry = match && match.svg
          ? match
          : (symbols && typeof symbols.get === 'function'
              ? (symbols.get(key) || (vocabBank && vocabBank.head ? symbols.get(vocabBank.head(key)) : null))
              : null);
        if (!entry || !entry.svg) return null;
        return wp.rasterizeImage(entry.svg, doc).then(function (png) {
          if (!png) return;
          symbolPngCache[key] = {
            src: png,
            alt: (match && match.alt) || entry.label || word,
            credit: (match && match.credit) || creditForSet(entry.set),
          };
          matched++;
        }).catch(function () { return null; });
      })).then(function () {
        var existingPack = typeof controller.getPack === 'function' ? controller.getPack() : lastPack;
        var byWord = {};
        var existingList = existingPack && Array.isArray(existingPack.items)
          ? existingPack.items
          : (existingPack && Array.isArray(existingPack.words) ? existingPack.words : []);
        existingList.forEach(function (it) {
          if (it && it.word) byWord[String(it.word).toLowerCase()] = it;
        });
        var words = list.map(function (word) {
          var prev = byWord[word.toLowerCase()] || lastPackItemsByWord[word.toLowerCase()];
          var saved = savedByWord[word] || savedByWord[word.toLowerCase()];
          var rec = prev ? Object.assign({}, prev, { word: word }) : { word: word };
          if (saved && saved.clip && saved.clip.dataUri && !rec.wordAudio) rec.wordAudio = saved.clip.dataUri;
          if (saved && saved.sounds && Array.isArray(saved.sounds.sounds) && (!rec.phonemes || !rec.phonemes.length)) rec.phonemes = saved.sounds.sounds;
          if (saved && saved.picture && saved.picture.dataUri && !rec.image && !rec.picture) {
            rec.image = saved.picture.dataUri;
            rec.imageAttribution = saved.picture.credit || 'Saved in My words';
          }
          return rec;
        });
        var enrichedWords = enrichItems(currentHostTitle(), words);
        setControllerPack({
          title: currentHostTitle(),
          language: 'en',
          words: enrichedWords,
          options: { mode: 'vocabulary', includePictures: true },
        });
        if (!quiet) {
          say(matched ? ('Matched ' + matched + ' of ' + list.length + ' words to built-in pictures.') : 'No built-in symbol matched those words. Use Import images below to add your own.');
        }
      });
    });
  }

  function readVocabMakerSaved() {
    var storage = null;
    try { storage = root.localStorage; } catch (_) { storage = null; }
    if (!storage || typeof storage.getItem !== 'function') return null;
    var saved = null;
    var edits = null;
    try {
      var raw = storage.getItem('alloflow-packets-vocab/1');
      if (raw) saved = JSON.parse(raw);
    } catch (_) { saved = null; }
    if (!saved || typeof saved !== 'object') return null;
    try {
      var rawEdits = storage.getItem('alloflow-packets-vocab-edits/1');
      if (rawEdits) edits = JSON.parse(rawEdits);
    } catch (_) { edits = null; }

    var rawWords = Array.isArray(saved.words)
      ? saved.words.map(function (item) {
          return item && typeof item === 'object' ? String(item.word || '').trim() : String(item == null ? '' : item).trim();
        })
      : String(saved.words == null ? '' : saved.words).split(/[\r\n,;]+/).map(function (w) { return w.trim(); });

    var wordEdits = edits && edits.words && typeof edits.words === 'object' ? edits.words : {};
    var senseEdits = edits && edits.senses && typeof edits.senses === 'object' ? edits.senses : {};
    var seen = {};
    var items = [];
    rawWords.forEach(function (word) {
      if (!word) return;
      var key = word.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      var wEdit = wordEdits[key] || wordEdits[word] || null;
      var senses = vocabBank && typeof vocabBank.ready === 'function' && vocabBank.ready() && typeof vocabBank.senses === 'function'
        ? (vocabBank.senses(word) || [])
        : [];
      if ((!senses || !senses.length) && vocabBank && typeof vocabBank.ready === 'function' && vocabBank.ready() && typeof vocabBank.head === 'function' && typeof vocabBank.senses === 'function') {
        var hwSaved = vocabBank.head(word);
        if (hwSaved) senses = vocabBank.senses(hwSaved) || [];
      }
      var chosen = null;
      if (senses.length) {
        if (wEdit && wEdit.sense) {
          for (var i = 0; i < senses.length; i++) {
            if (senses[i] && senses[i].id === wEdit.sense) { chosen = senses[i]; break; }
          }
        }
        if (!chosen) chosen = senses[0];
      }
      var sId = (chosen && chosen.id) || (wEdit && wEdit.sense) || '';
      var sEdit = sId && senseEdits[sId] ? senseEdits[sId] : null;
      var def = (wEdit && wEdit.def) || (sEdit && sEdit.def) || (chosen && chosen.def) || '';
      var example = (wEdit && wEdit.example) || (sEdit && sEdit.example) || (chosen && chosen.example) || '';
      var rec = { word: word };
      if (def) rec.definition = String(def);
      if (example) rec.example = String(example);
      var customUri = wEdit && wEdit.customPicture ? (typeof wEdit.customPicture === 'string' ? wEdit.customPicture : wEdit.customPicture.dataUri) : '';
      if (typeof customUri === 'string' && /^data:image\/(png|jpeg|svg\+xml);base64,/i.test(customUri)) {
        rec.image = customUri;
        rec.imageAlt = word;
        rec.imageAttribution = 'Added in Vocabulary maker';
      }
      items.push(rec);
    });
    if (!items.length) return null;
    var titleText = saved.title && String(saved.title).trim() ? String(saved.title).trim() : 'Vocabulary packet words';
    return { title: titleText, words: items };
  }

  function applyVocabMakerWords(opts) {
    var quiet = !!(opts && opts.quiet);
    return ensureVocabBankLoaded().then(function () {
      var data = readVocabMakerSaved();
      if (!data || !data.words || !data.words.length) {
        if (!quiet) say('No saved Vocabulary maker words found in this browser yet.');
        return false;
      }
      var enriched = enrichItems(data.title, data.words);
      setControllerPack({
        title: data.title,
        language: 'en',
        words: enriched,
        options: { mode: 'vocabulary', includePictures: true },
      });
      say('Loaded ' + enriched.length + ' words from Vocabulary maker.');
      return matchBuiltInPictures({ quiet: true }).then(function () { return true; });
    });
  }

  function readWordSoundsMakerSaved() {
    var storage = null;
    try { storage = root.localStorage; } catch (_) { storage = null; }
    if (!storage || typeof storage.getItem !== 'function') return null;
    var saved = null;
    try {
      var raw = storage.getItem('alloflow-packets-maker/1');
      if (raw) saved = JSON.parse(raw);
    } catch (_) { saved = null; }
    if (!saved || typeof saved !== 'object') return null;
    var rawWords = Array.isArray(saved.words) && saved.words.length
      ? saved.words
      : (saved.mode === 'own'
          ? String(saved.own || '').split(/[\s,;]+/)
          : (Array.isArray(saved.chosen) ? saved.chosen : []));
    var seen = {};
    var items = [];
    (rawWords || []).forEach(function (w) {
      var word = String(w == null ? '' : w).trim().toLowerCase();
      if (!word || seen[word]) return;
      seen[word] = true;
      items.push({ word: word });
    });
    if (!items.length) return null;
    // The title the teacher gave the file (the maker saves it with the words); until 2026-11-16 it was dropped here.
    var makerTitle = typeof saved.title === 'string' ? saved.title.trim().slice(0, 80) : '';
    return { title: makerTitle || 'Word Sounds packet words', words: items };
  }

  function applyWordSoundsMakerWords(opts) {
    var quiet = !!(opts && opts.quiet);
    return ensureVocabBankLoaded().then(function () {
      var data = readWordSoundsMakerSaved();
      if (!data || !data.words || !data.words.length) {
        if (!quiet) say('No saved Word Sounds maker words found in this browser yet.');
        return false;
      }
      return mergeMyWordsEntries(data.words.map(function (w) { return w.word; })).then(function (savedByWord) {
        var list = data.words.map(function (item) {
          var e = (savedByWord && (savedByWord[item.word] || savedByWord[item.word.toLowerCase()])) || null;
          var rec = { word: item.word };
          if (e && e.sounds && Array.isArray(e.sounds.sounds)) rec.phonemes = e.sounds.sounds;
          if (e && e.clip && e.clip.dataUri) rec.wordAudio = e.clip.dataUri;
          if (e && e.picture && e.picture.dataUri) {
            rec.image = e.picture.dataUri;
            rec.imageAlt = item.word;
            rec.imageAttribution = e.picture.credit || 'Saved in My words';
          }
          return rec;
        });
        var enriched = enrichItems(data.title, list);
        setControllerPack({
          title: data.title,
          language: 'en',
          words: enriched,
          options: { mode: 'vocabulary', includePictures: true },
        });
        say('Loaded ' + enriched.length + ' words from Word Sounds maker.');
        return matchBuiltInPictures({ quiet: true }).then(function () { return true; });
      });
    });
  }

  function activePack(packArg) {
    var live = controller && typeof controller.getPack === 'function' ? controller.getPack() : null;
    if (!packArg) return live || lastPack || { title: 'Word Cards', words: [] };
    return packArg;
  }

  function packItemsOf(pack) {
    var list = (pack && (Array.isArray(pack.items) ? pack.items : pack.words)) || [];
    return enrichItems((pack && pack.title) || 'Word Cards', list);
  }

  function buildFlashcardsHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'Word Flashcards');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildFlashcardsHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function buildFrayerHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'Frayer Study Sheets');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildFrayerHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function buildSortingCardsHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'Word Sorting Cards');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildSortingCardsHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function buildWorksheetHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'Vocabulary Study Worksheet');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildWorksheetHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function buildBingoHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'Vocabulary Classroom Bingo');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildBingoHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function buildLoopGameHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'I Have, Who Has Loop Cards');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildLoopGameHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function buildWordWallHtml(packArg) {
    var pack = activePack(packArg);
    var title = String(pack.title || 'Classroom Word Wall Cards');
    var items = packItemsOf(pack);
    // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
    return root.AlloWordPracticeMedia.buildWordWallHtml(
      { title: title, language: pack.language || 'en', items: items, words: items, options: pack.options || {} },
      pack.options || {}
    );
  }

  function openInSymbolRunner(packArg) {
    var items = packItemsOf(activePack(packArg));
    var seen = {};
    var shortWords = [];
    items.forEach(function (it) {
      var w = String((it && it.word) || '').trim();
      var k = w.toLowerCase();
      if (!/^[A-Za-z0-9]{1,8}$/.test(w) || seen[k] || shortWords.length >= 30) return;
      seen[k] = true;
      shortWords.push(w);
    });
    if (shortWords.length < 2) {
      say('Need at least 2 short words (1 to 8 letters or digits, no spaces) to open in Symbol Runner.');
      return false;
    }
    var a = doc.createElement('a');
    a.href = 'packets-symbol-runner.html#symbols=' + encodeURIComponent(shortWords.join(','));
    a.hidden = true;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    return true;
  }

  function downloadHtmlFile(html, filename) {
    if (typeof root.Blob !== 'function' || !root.URL || typeof root.URL.createObjectURL !== 'function') return;
    var blob = new root.Blob([html], { type: 'text/html;charset=utf-8' });
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(function () { try { root.URL.revokeObjectURL(url); } catch (_) {} }, 1000);
  }

  function slugTitle(textVal) {
    return String(textVal || 'word-cards').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'word-cards';
  }

  function init() {
    if (!host || !wp || typeof wp.mount !== 'function') {
      say('Could not start Present and Export.');
      return;
    }
    var initial = STARTERS['short-vowels'];
    var initialWords = initial.words;
    var initialTitle = initial.title;

    if (root.AlloPacketsHandoff && typeof root.AlloPacketsHandoff.take === 'function') {
      var handed = root.AlloPacketsHandoff.take('present-export') || root.AlloPacketsHandoff.take('vocab');
      if (handed && Array.isArray(handed.words) && handed.words.length) {
        initialWords = handed.words;
        initialTitle = handed.title || 'My word set';
      }
    }

    var startWords = enrichItems(initialTitle, initialWords);
    // The annotation tools are the app's own suite, bundled once in word_practice_annotation_assets.js. The app has
    // the suite already; this page starts it from that bundle (run(), no eval: the page's policy allows only its own
    // scripts), so Annotate is on the presenter here as it is in the app and in the saved offline file.
    var annoAssets = root.AlloWordPracticeAnnotationAssets;
    if (!(root.AlloModules && root.AlloModules.AnnotationSuite) && annoAssets && typeof annoAssets.run === 'function') {
      try { annoAssets.run(); } catch (annoError) { /* the presenter works without Annotate */ }
    }
    controller = wp.mount(host, {
      title: initialTitle,
      language: 'en',
      words: startWords,
      options: { mode: 'vocabulary', includePictures: true },
      phonemeBank: phonemeBank,
      resolveEntry: resolveEntry,
      searchSymbols: searchSymbols,
      ensurePptx: ensurePptx,
      onToast: function (msg) { say(msg); },
    });
    lastPack = {
      title: initialTitle,
      language: 'en',
      words: startWords,
      options: { mode: 'vocabulary', includePictures: true },
    };
    startWords.forEach(function (it) {
      if (it && it.word) lastPackItemsByWord[String(it.word).toLowerCase()] = it;
    });

    var buttons = doc.querySelectorAll('[data-starter]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', (function (btn) {
        return function () { applyStarter(btn.getAttribute('data-starter')); };
      })(buttons[i]));
    }

    if (fillPicsBtn) {
      fillPicsBtn.addEventListener('click', function () {
        matchBuiltInPictures();
      });
    }

    if (myWords && typeof myWords.available === 'function' && myWordsBtn) {
      myWords.available().then(function (ok) {
        if (!ok) return [];
        return myWords.list();
      }).then(function (rows) {
        if (!rows || !rows.length) return;
        myWordsBtn.hidden = false;
        myWordsBtn.addEventListener('click', function () {
          var words = rows.map(function (r) { return r.word; });
          myWords.getMany(words).then(function (entries) {
            var list = words.map(function (w) {
              var e = entries[w] || {};
              return {
                word: w,
                phonemes: e.sounds && Array.isArray(e.sounds.sounds) ? e.sounds.sounds : undefined,
                wordAudio: e.clip && e.clip.dataUri ? e.clip.dataUri : undefined,
                image: e.picture && e.picture.dataUri ? e.picture.dataUri : undefined,
                imageAttribution: e.picture && e.picture.credit ? e.picture.credit : undefined,
              };
            });
            setControllerPack({
              title: 'My saved words',
              language: 'en',
              words: enrichItems('My saved words', list),
              options: { mode: 'vocabulary', includePictures: true },
            });
            say('Loaded ' + list.length + ' words from My words.');
          });
        });
      }).catch(function () { return null; });
    }

    if (vocabWordsBtn) {
      var savedVocab = readVocabMakerSaved();
      if (savedVocab && savedVocab.words && savedVocab.words.length) {
        vocabWordsBtn.hidden = false;
      }
      vocabWordsBtn.addEventListener('click', function () {
        applyVocabMakerWords({ quiet: false });
      });
    }

    if (wsWordsBtn) {
      var savedWs = readWordSoundsMakerSaved();
      if (savedWs && savedWs.words && savedWs.words.length) {
        wsWordsBtn.hidden = false;
      }
      wsWordsBtn.addEventListener('click', function () {
        applyWordSoundsMakerWords({ quiet: false });
      });
    }

    if (flashcardsBtn) {
      flashcardsBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-flashcards.html';
        downloadHtmlFile(buildFlashcardsHtml(pack), fname);
        say('Saved 2-sided printable flashcards (' + fname + ').');
      });
    }

    if (frayerBtn) {
      frayerBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-frayer.html';
        downloadHtmlFile(buildFrayerHtml(pack), fname);
        say('Saved Frayer study sheets (' + fname + ').');
      });
    }

    if (sortingCardsBtn) {
      sortingCardsBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-sorting-cards.html';
        downloadHtmlFile(buildSortingCardsHtml(pack), fname);
        say('Saved cut-out sorting cards (' + fname + ').');
      });
    }

    if (worksheetBtn) {
      worksheetBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-worksheet.html';
        downloadHtmlFile(buildWorksheetHtml(pack), fname);
        say('Saved cloze and matching worksheet (' + fname + ').');
      });
    }

    if (bingoBtn) {
      bingoBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-bingo.html';
        downloadHtmlFile(buildBingoHtml(pack), fname);
        say('Saved classroom Bingo boards (' + fname + ').');
      });
    }

    if (loopCardsBtn) {
      loopCardsBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-loop-cards.html';
        downloadHtmlFile(buildLoopGameHtml(pack), fname);
        say('Saved I Have, Who Has cards (' + fname + ').');
      });
    }

    if (wordWallBtn) {
      wordWallBtn.addEventListener('click', function () {
        var pack = activePack();
        var fname = slugTitle(pack.title) + '-word-wall.html';
        downloadHtmlFile(buildWordWallHtml(pack), fname);
        say('Saved classroom Word Wall cards (' + fname + ').');
      });
    }

    if (openSrBtn) {
      openSrBtn.addEventListener('click', function () {
        openInSymbolRunner();
      });
    }

    var clearBtn = $('pe-clear-local');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        try {
          root.localStorage.removeItem('alloflow-word-practice-setup-v1');
          if (clearStatusEl) clearStatusEl.textContent = 'Cleared saved choices on this browser.';
        } catch (_) {
          if (clearStatusEl) clearStatusEl.textContent = 'Browser storage could not be cleared here.';
        }
      });
    }

    if (myWords && typeof myWords.onChange === 'function') {
      myWords.onChange(function () {
        if (myWordsBtn && typeof myWords.list === 'function') {
          myWords.list().then(function (rows) {
            if (rows && rows.length) myWordsBtn.hidden = false;
          }).catch(function () {});
        }
        matchBuiltInPictures({ quiet: true });
      });
    }

    var rawHash = (root.location && root.location.hash) || '';
    var fromVocabHash = rawHash === '#from-vocab';
    var fromWsHash = rawHash === '#from-word-sounds';
    var wordsMatch = /^#words=(.+)$/i.exec(rawHash);
    var hashWords = [];
    if (wordsMatch) {
      try {
        var decoded = decodeURIComponent(wordsMatch[1]);
        var seenHash = {};
        decoded.split(/[\s,;]+/).forEach(function (w) {
          var clean = String(w || '').trim();
          var key = clean.toLowerCase();
          if (!clean || seenHash[key] || hashWords.length >= 60) return;
          seenHash[key] = true;
          hashWords.push(clean);
        });
      } catch (_) {
        hashWords = [];
      }
      try {
        if (root.history && typeof root.history.replaceState === 'function' && root.location) {
          root.history.replaceState(null, '', root.location.pathname + root.location.search);
        }
      } catch (_) {}
    }
    ensureVocabBankLoaded().then(function () {
      var savedNow = readVocabMakerSaved();
      if (vocabWordsBtn && savedNow && savedNow.words && savedNow.words.length) {
        vocabWordsBtn.hidden = false;
      }
      var savedWsNow = readWordSoundsMakerSaved();
      if (wsWordsBtn && savedWsNow && savedWsNow.words && savedWsNow.words.length) {
        wsWordsBtn.hidden = false;
      }
      if (hashWords.length) {
        var enrichedHash = enrichItems('Practice missed words', hashWords);
        setControllerPack({
          title: 'Practice missed words',
          language: 'en',
          words: enrichedHash,
          options: { mode: 'vocabulary', includePictures: true },
        });
        say('Loaded ' + enrichedHash.length + ' words to practice.');
        return matchBuiltInPictures({ quiet: true });
      }
      if (fromVocabHash && savedNow && savedNow.words && savedNow.words.length) {
        return applyVocabMakerWords({ quiet: false });
      }
      if (fromWsHash && savedWsNow && savedWsNow.words && savedWsNow.words.length) {
        return applyWordSoundsMakerWords({ quiet: false });
      }
      return matchBuiltInPictures({ quiet: true });
    });
    ensurePhonemeClips();
  }

  init();

  root.AlloPacketsPresentExport = {
    applyStarter: applyStarter,
    matchBuiltInPictures: matchBuiltInPictures,
    loadVocabMakerWords: applyVocabMakerWords,
    loadWordSoundsMakerWords: applyWordSoundsMakerWords,
    buildFlashcardsHtml: buildFlashcardsHtml,
    buildFrayerHtml: buildFrayerHtml,
    buildSortingCardsHtml: buildSortingCardsHtml,
    buildWorksheetHtml: buildWorksheetHtml,
    buildBingoHtml: buildBingoHtml,
    buildLoopGameHtml: buildLoopGameHtml,
    buildWordWallHtml: buildWordWallHtml,
    openInSymbolRunner: openInSymbolRunner,
    resolveEntry: resolveEntry,
    searchSymbols: searchSymbols,
    getPack: function () { return lastPack; },
    getController: function () { return controller; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
